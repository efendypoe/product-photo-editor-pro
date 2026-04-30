export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const auth = req.headers.authorization || "";
    const token = auth.replace("Bearer ", "");
    const { plan = "monthly" } = req.body || {};

    const plans = {
      monthly: { name: "Pro Monthly", amount: 69000 },
      yearly: { name: "Pro Yearly", amount: 599000 }
    };

    const userResp = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${token}`
      }
    });

    const user = await userResp.json();
    const orderId = `EPP-${plan}-${Date.now()}`;

    const insertRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/payment_orders`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        order_id: orderId,
        user_id: user.id,
        plan,
        amount: plans[plan].amount,
        status: "pending"
      })
    });

    const insertText = await insertRes.text();

    if (!insertRes.ok) {
      return res.status(500).json({
        error: `SUPABASE INSERT FAILED: ${insertText}`
      });
    }

    return res.status(200).json({
      error: `DEBUG OK: Order tersimpan ${orderId}`
    });

  } catch (err) {
    return res.status(500).json({
      error: `SERVER ERROR: ${err.message}`
    });
  }
}
