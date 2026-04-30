import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;
    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    // 🔐 VERIFY SIGNATURE
    const signature = crypto
      .createHash("sha512")
      .update(body.order_id + body.status_code + body.gross_amount + serverKey)
      .digest("hex");

    if (signature !== body.signature_key) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const orderId = body.order_id;
    const transactionStatus = body.transaction_status;

    // 🔍 GET ORDER
    const orderRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/payment_orders?order_id=eq.${orderId}`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    const orders = await orderRes.json();
    const order = orders[0];

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // 🔥 UPDATE STATUS ORDER
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/payment_orders?order_id=eq.${orderId}`, {
      method: "PATCH",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: transactionStatus
      })
    });

    // 🎯 JIKA PEMBAYARAN BERHASIL
    if (transactionStatus === "settlement" || transactionStatus === "capture") {
      const expired =
        order.plan === "yearly"
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // 🔥 UPSERT SUBSCRIPTION
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions`, {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          user_id: order.user_id,
          plan: order.plan,
          status: "active",
          expired_at: expired.toISOString()
        })
      });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
