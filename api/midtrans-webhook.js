import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body;
    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    const signature = crypto
      .createHash("sha512")
      .update(body.order_id + body.status_code + body.gross_amount + serverKey)
      .digest("hex");

    if (signature !== body.signature_key) {
      return res.status(403).json({ error: "Invalid signature" });
    }

    const successStatus = ["settlement", "capture"];
    const orderId = body.order_id;

    const orderResp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/payment_orders?order_id=eq.${orderId}&select=*`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    const orders = await orderResp.json();
    const order = orders?.[0];

    if (!order) return res.status(404).json({ error: "Order not found" });

    await fetch(`${process.env.SUPABASE_URL}/rest/v1/payment_orders?order_id=eq.${orderId}`, {
      method: "PATCH",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        status: body.transaction_status
      })
    });

    if (successStatus.includes(body.transaction_status)) {
      const days = order.plan === "yearly" ? 365 : 30;
      const expiredAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions`, {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify({
          user_id: order.user_id,
          plan: order.plan,
          status: "active",
          expired_at: expiredAt,
          updated_at: new Date().toISOString()
        })
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
