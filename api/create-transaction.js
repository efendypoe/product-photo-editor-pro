export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ error: "Method not allowed" });
  }

  try {
    const { plan } = req.body;

    const plans = {
      monthly: { name: "Pro Monthly", amount: 69000 },
      yearly: { name: "Pro Yearly", amount: 599000 }
    };

    if (!plans[plan]) {
      return res.status(200).json({ error: "Invalid plan" });
    }

    const order_id = "ORD-" + Date.now();

    // 🔥 SIMPAN KE SUPABASE DULU
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/payment_orders`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        order_id,
        plan,
        status: "pending",
        created_at: new Date().toISOString()
      })
    });

    // 🔥 BUAT TRANSAKSI MIDTRANS
    const midtransRes = await fetch("https://app.sandbox.midtrans.com/snap/v1/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " +
          Buffer.from(process.env.MIDTRANS_SERVER_KEY + ":").toString("base64")
      },
      body: JSON.stringify({
        transaction_details: {
          order_id,
          gross_amount: plans[plan].amount
        },
        item_details: [
          {
            id: plan,
            price: plans[plan].amount,
            quantity: 1,
            name: plans[plan].name
          }
        ]
      })
    });

    const data = await midtransRes.json();

    return res.status(200).json({
      token: data.token,
      order_id
    });

  } catch (err) {
    return res.status(200).json({ error: err.message });
  }
}
