import express from "express";
import mongoose from "mongoose";
import Order from "../models/order.js";
import Menu from "../models/menu.js";
import Cart from "../models/cart.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

/* =========================================
   ✅ CREATE ORDER (CUSTOMER)
========================================= */
router.post("/", protect, async (req, res) => {
  try {
    // 🔒 Only customer can order
   
    if (req.user.role !== "customer") {
      return res.status(403).json({
        error: "Only customers can place orders",
      });
    }

   const {
  items,
  deliveryAddress,
  paymentMethod,
  specialInstructions,
  couponCode,
} = req.body;

   /* if (paymentMethod === "ONLINE") {
      if (
        !razorpay_payment_id ||
        !razorpay_order_id ||
        !razorpay_signature
      ) {
        return res.status(400).json({
          error: "Payment not completed",
        });
      }
    } */
   
    // ❌ Validation
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    if (!deliveryAddress) {
      return res.status(400).json({ error: "Address required" });
    }

    // 🔥 SAFE DISTANCE FIX
    const deliveryDistance = Number(deliveryAddress?.deliveryDistance || 0);

    if (!deliveryDistance || deliveryDistance > 10) {
      return res.status(400).json({
        error: "Delivery only within 10 KM",
      });
    }

    // 🔍 Fetch menu items
    const menuIds = items.map(
      (item) => new mongoose.Types.ObjectId(item.menuItem)
    );

    const menuItems = await Menu.find({ _id: { $in: menuIds } });

    let subtotal = 0;
    const formattedItems = [];

    for (const item of items) {
      const menu = menuItems.find(
        (m) => m._id.toString() === item.menuItem.toString()
      );

      if (!menu) {
        return res.status(400).json({
          error: "Invalid menu item",
        });
      }

      const qty = item.quantity || 1;

      subtotal += menu.price * qty;

      formattedItems.push({
        menuItem: menu._id,
        quantity: qty,
      });
    }

    // 🚚 Delivery fee logic
    const deliveryFee = deliveryDistance <= 5 ? 20 : 40;

    const totalPrice = subtotal + deliveryFee;

    const finalTotal = totalPrice; // (no coupon for now - safe)

    // 🧾 CREATE ORDER
    const order = new Order({
      user: req.user.id,
      items: formattedItems,
      subtotal,
      deliveryFee,
      totalPrice,
      finalTotal,
      deliveryAddress,
      paymentMethod: paymentMethod || "COD",
      specialInstructions,
      status: "pending",
    });

    const savedOrder = await order.save();

    // 🧹 CLEAR CART
    await Cart.findOneAndUpdate(
      { user: req.user.id },
      { items: [] }
    );

    // ✅ IMPORTANT (FRONTEND FIXED)
    res.status(201).json(savedOrder);

  } catch (err) {
    console.error("ORDER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


/* =========================================
   ✅ GET MY ORDERS
========================================= */
router.get("/", protect, async (req, res) => {
  try {

    // 🔥 ADMIN → GET ALL ORDERS
    if (req.user.role === "admin") {
      const orders = await Order.find()
        .populate("items.menuItem")
        .populate("user", "name email phone")
        .populate("assignedDeliveryBoy", "name email phone")
        .sort({ createdAt: -1 });

      return res.json(orders);
    }

    // 👤 CUSTOMER → GET OWN ORDERS
    const orders = await Order.find({ user: req.user.id })
      .populate("items.menuItem")
      .populate("user", "name email phone")
      .populate("assignedDeliveryBoy", "name email phone")
      .sort({ createdAt: -1 });

    res.json(orders);

  } catch (err) {
    console.error("GET ORDERS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================================
   ✅ GET SINGLE ORDER
========================================= */
router.get("/:id", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.menuItem")
      .populate("user", "name email phone")
      .populate("assignedDeliveryBoy", "name email phone");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (
      order.user._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Not authorized" });
    }

    res.json(order);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* =========================================
   ❌ CANCEL ORDER
========================================= */
router.put("/:id/cancel", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        error: "Order cannot be cancelled now",
      });
    }

    order.status = "cancelled";

    await order.save();

    res.json(order);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================
// 💳 MARK ORDER AS PAID (STRIPE)
// ============================
router.put("/mark-paid/:id", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.paymentStatus = "paid";
    order.status = "pending"; // optional

    await order.save();

    res.json({ message: "Payment successful", order });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================
   ⭐ RATE ORDER
========================================= */
router.put("/:id/rate", protect, async (req, res) => {
  try {
    const { rating, review } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    // Customer can rate only their own order
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        error: "Not authorized",
      });
    }

    order.rating = rating;
    order.review = review || "";

    await order.save();

    res.json({
      success: true,
      message: "Rating submitted successfully",
      order,
    });

  } catch (err) {
    console.error("Rating Error:", err);
    res.status(500).json({
      error: err.message,
    });
  }
});

export default router;