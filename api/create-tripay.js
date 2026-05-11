import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const { plan, customer_name, customer_email } = req.body;

    let amount = 0;
    let planName = "";

    if (plan === "monthly") {
      amount = 69000;
      planName = "PRO Monthly";
    } else if (plan === "yearly") {
      amount = 599000;
      planName = "PRO Yearly";
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid plan",
      });
    }

    const merchantCode = process.env.TRIPAY_MERCHANT_CODE;
    const apiKey = process.env.TRIPAY_API_KEY;
    const privateKey = process.env.TRIPAY_PRIVATE_KEY;

    const merchantRef = "TRX-" + Date.now();

    const signature = crypto
      .createHmac("sha256", privateKey)
      .update(merchantCode + merchantRef + amount)
      .digest("hex");

    const response = await fetch(
      "https://tripay.co.id/api/transaction/create",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "QRIS",
          merchant_ref: merchantRef,
          amount: amount,
          customer_name: customer_name,
          customer_email: customer_email,
          order_items: [
            {
              sku: plan,
              name: planName,
              price: amount,
              quantity: 1,
            },
          ],
          return_url: "https://editorproductpro.com/app.html",
          expired_time: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
          signature: signature,
        }),
      }
    );

    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
