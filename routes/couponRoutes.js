import express from "express";
import Coupon from "../models/coupon.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

/* ===============================
   ADMIN ONLY CHECK
=============================== */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};

/* ===============================
   CREATE COUPON (ADMIN)
=============================== */
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minOrderAmount,
      startDate,
      expiryDate,
    } = req.body;

    if (!code || !discountValue || !minOrderAmount || !startDate || !expiryDate) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }


    const start = new Date(startDate);
    const expiry = new Date(expiryDate);

    if (start > expiry) {
      return res.status(400).json({
        message: "Start date cannot be after expiry date",
      });
    }

    const generateCouponCode = () => {
      return "CPN-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    };


    const coupon = new Coupon({
      code: generateCouponCode(),
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount),
      startDate: start,
      expiryDate: expiry,
      isActive: true,
    });

    await coupon.save();

    res.status(201).json(coupon);

  } catch (err) {
    console.error("CREATE COUPON ERROR:", err);
    res.status(500).json({ message: "Error creating coupon" });
  }
});

/* ===============================
   GET ALL COUPONS (ADMIN)
=============================== */
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: "Error fetching coupons" });
  }
});

/* ===============================
   GET ACTIVE COUPONS (PUBLIC)
=============================== */
router.get("/active", async (req, res) => {
  try {
    const now = new Date();

    const coupons = await Coupon.find({
      isActive: true,
      startDate: { $lte: now },
      expiryDate: { $gte: now },
    });

    res.json(coupons);

  } catch (err) {
    res.status(500).json({ message: "Error fetching active coupons" });
  }
});

/* ===============================
   TOGGLE COUPON ACTIVE / INACTIVE
=============================== */
router.put("/:id/toggle", protect, adminOnly, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        message: "Coupon not found",
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.json(coupon);

  } catch (err) {
    res.status(500).json({ message: "Error toggling coupon" });
  }
});

/* ===============================
   DELETE COUPON (ADMIN)
=============================== */
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        message: "Coupon not found",
      });
    }

    await coupon.deleteOne();

    res.json({ message: "Coupon deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: "Error deleting coupon" });
  }
});

/* ===============================
   VALIDATE COUPON (PUBLIC)
=============================== */
router.post("/validate", async (req, res) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code || !orderAmount) {
      return res.status(400).json({
        message: "Coupon code and order amount required",
      });
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      return res.status(400).json({
        message: "Invalid coupon",
      });
    }

    const now = new Date();

    if (now < coupon.startDate) {
      return res.status(400).json({
        message: "Coupon not started yet",
      });
    }

    if (now > coupon.expiryDate) {
      return res.status(400).json({
        message: "Coupon expired",
      });
    }

    if (Number(orderAmount) < coupon.minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order ₹${coupon.minOrderAmount} required`,
      });
    }

    let discount = 0;

    if (coupon.discountType === "percentage") {
      discount =
        (Number(orderAmount) * coupon.discountValue) / 100;
    } else {
      discount = coupon.discountValue;
    }

    res.json({
      discount,
      message: "Coupon applied successfully",
    });

  } catch (err) {
    res.status(500).json({ message: "Error validating coupon" });
  }
});

export default router;