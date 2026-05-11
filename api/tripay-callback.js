import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const privateKey = process.env.TRIPAY_PRIVATE_KEY;

    const callbackSignature = req.headers["x-callback-signature"];
    const rawBody = JSON.stringify(req.body);

    const signature = crypto
      .createHmac("sha256", privateKey)
      .update(rawBody)
      .digest("hex");

    if (callbackSignature !== signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }

    const event = req.headers["x-callback-event"];
    const data = req.body;

    if (event !== "payment_status") {
      return res.status(200).json({
        success: true,
        message: "Event ignored",
      });
    }

    if (data.status !== "PAID") {
      return res.status(200).json({
        success: true,
        message: "Payment not paid yet",
      });
    }

    /*
      Catatan:
      File ini sudah siap menerima callback Tripay.
      Tapi untuk auto aktifkan PRO, kita masih perlu update create-tripay.js
      supaya menyimpan user_id, email, plan, dan merchant_ref ke Supabase.
    */

    return res.status(200).json({
      success: true,
      message: "Tripay callback received",
    });
  } catch (error) {
    console.error("Tripay callback error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
