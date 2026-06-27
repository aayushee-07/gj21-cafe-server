import express from "express";
import Order from "../models/order.js";
import { protect } from "../middleware/auth.js";
import { sendEmail } from "../utils/sendEmail.js";

const router = express.Router();

/*
  GET /api/delivery/orders
  Get only orders assigned to logged-in delivery boy
*/
router.get("/orders", protect, async (req, res) => {
  try {
    const orders = await Order.find({
      assignedDeliveryBoy: req.user.id,
    })
      .populate("user", "name email")
      .populate("items.menuItem", "name price image")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Delivery Orders Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch assigned orders",
    });
  }
});

// PUT /api/delivery/orders/:id/status
router.put("/orders/:id/status", protect, async (req, res) => {
  try {
    const { deliveryStatus, cancelReason } = req.body;

    const allowedStatuses = [
      "assigned",
      "pickup",
      "intransit",
      "delivered",
      "cancelled",
    ];

    if (!allowedStatuses.includes(deliveryStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery status",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Only assigned delivery boy can update status
    if (
      !order.assignedDeliveryBoy ||
      order.assignedDeliveryBoy.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this order",
      });
    }

    // Optional: when delivered update main order status too
    order.deliveryStatus = deliveryStatus;

    if (deliveryStatus === "cancelled") {
      if (!cancelReason?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Cancellation reason is required",
        });
      }

      order.cancelReason = cancelReason;
      order.cancelledBy = "delivery";
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Delivery status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update Delivery Status Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update delivery status",
    });
  }
});

// GET /api/delivery/history
router.get("/history", protect, async (req, res) => {
  try {
    const orders = await Order.find({
      assignedDeliveryBoy: req.user.id,
      deliveryStatus: {
        $in: ["delivered", "intransit", "cancelled", "pickup"]
      }
    })
      .populate("user", "name email")
      .populate("items.menuItem", "name price image")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch history"
    });
  }
});

router.get("/test-email", async (req, res) => {
  try {
    await sendEmail(
      "aayush@gmail.com",
      "GJ 21 Cafe Test",
      "<h1>Email Working Successfully ✅</h1>"
    );

    res.json({ message: "Email Sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;