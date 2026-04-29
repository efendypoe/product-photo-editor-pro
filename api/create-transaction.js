export default async function handler(req, res) {
  try {
    const order_id = 'ORDER-' + Date.now();

    const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(process.env.MIDTRANS_SERVER_KEY + ':').toString('base64')
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: order_id,
          gross_amount: 69000
        },
        credit_card: {
          secure: true
        },
        customer_details: {
          first_name: "User",
          email: "user@email.com"
        }
      })
    });

    const data = await response.json();

    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
