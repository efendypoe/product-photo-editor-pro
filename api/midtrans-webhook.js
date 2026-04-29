export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "Webhook alive" });
  }

  try {
    const body = req.body || {};
    const orderId = body.order_id;
    const status = body.transaction_status;

    if (!orderId) {
      return res.status(200).json({ ok: true, message: "No order id" });
    }

    const orderResp = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/payment_orders?order_id=eq.${orderId}&select=*`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    const orders = await orderResp.json();
    const order = orders?.[0];

    if (!order) {
      return res.status(200).json({ ok: true, message: "Order not found", orderId });
    }

    await fetch(`${process.env.SUPABASE_URL}/rest/v1/payment_orders?order_id=eq.${orderId}`, {
      method: "PATCH",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({ status })
    });

    if (["settlement", "capture"].includes(status)) {
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

    return res.status(200).json({ ok: true, orderId, status });
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message });
  }
}
