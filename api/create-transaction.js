export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const auth = req.headers.authorization || "";
    const token = auth.replace("Bearer ", "");
    const { plan = "monthly" } = req.body || {};

    if (!token) return res.status(401).json({ error: "Not logged in" });

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

    if (!user?.id) {
      return res.status(401).json({ error: "Invalid user", user });
    }

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
        error: "SUPABASE INSERT FAILED",
        status: insertRes.status,
        detail: insertText
      });
    }

    return res.status(200).json({
      debug: true,
      message: "ORDER SAVED TO SUPABASE",
      order_id: orderId,
      supabase_result: insertText
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
