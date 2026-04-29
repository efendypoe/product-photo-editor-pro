export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { plan = "monthly" } = req.body || {};
    if (!token) return res.status(401).json({ error: "Not logged in" });

    const plans = {
      monthly: { name: "Pro Monthly", amount: 69000, days: 30 },
      yearly: { name: "Pro Yearly", amount: 599000, days: 365 }
    };

    if (!plans[plan]) return res.status(400).json({ error: "Invalid plan" });

    const userResp = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${token}`
      }
    });

    const user = await userResp.json();
    if (!user?.id || !user?.email) return res.status(401).json({ error: "Invalid user" });

    const orderId = `EPP-${plan}-${Date.now()}`;

    await fetch(`${process.env.SUPABASE_URL}/rest/v1/payment_orders`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        order_id: orderId,
        user_id: user.id,
        plan,
        amount: plans[plan].amount,
        status: "pending"
      })
    });

    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: plans[plan].amount
      },
      customer_details: {
        email: user.email
      },
      item_details: [{
        id: plan,
        price: plans[plan].amount,
        quantity: 1,
        name: plans[plan].name
      }],
      callbacks: {
        finish: "https://editorproductpro.com/app.html"
      }
    };

    const mt = await fetch("https://app.sandbox.midtrans.com/snap/v1/transactions", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(process.env.MIDTRANS_SERVER_KEY + ":").toString("base64"),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await mt.json();
    if (!mt.ok) return res.status(500).json(data);

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
