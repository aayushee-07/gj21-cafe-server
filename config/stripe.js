import dotenv from "dotenv";
dotenv.config();

import Stripe from "stripe";

console.log("Stripe key:", process.env.STRIPE_SECRET_KEY);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default stripe;