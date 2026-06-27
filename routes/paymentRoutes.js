import express from "express";
import stripe from "../config/stripe.js";

const router = express.Router();

router.post("/create-checkout-session", async (req, res) => {
  try {
    const { items, orderId } = req.body;
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: { name: item.name },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity || 1,
    }));
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `http://localhost:5173/payment-success?orderId=${orderId}`,
      cancel_url: `http://localhost:5173/payment-cancel`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/stripe-transactions", async (req, res) => {
  try {
    const charges = await stripe.charges.list({ limit: 50 });
    res.json(charges.data);
  } catch (err) {
    console.error("Stripe transactions error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;