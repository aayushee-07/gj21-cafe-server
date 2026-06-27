import express from "express";
import Order from "../models/order.js";
import Menu from "../models/menu.js";
import User from "../models/user.js";
import { sendEmail } from "../utils/sendEmail.js";
import { protect } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";

function generatePassword(length = 10) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

  let password = "";

  for (let i = 0; i < length; i++) {
    password += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  return password;
}

const router = express.Router();

/* =========================================
   🔐 ADMIN CHECK
========================================= */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

/* =========================================
   📦 MULTER CONFIG (IMAGE UPLOAD)
========================================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category =
      req.body.category?.trim().toLowerCase() || "others";

    const uploadPath = `uploads/menu/${category}`;

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

/* =========================================
   🧾 GET ALL ORDERS (WITH PAGINATION)
========================================= */
router.get("/orders", protect, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // ✅ Build filter from query params
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;

    const totalOrders = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .populate("items.menuItem")
      .populate("user", "name email")
      .populate("assignedDeliveryBoy", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      orders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      totalOrders,
    });

  } catch (err) {
    console.error("Order fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================================
   🔄 UPDATE ORDER STATUS
========================================= */
router.put("/orders/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = [
      "pending",
      "confirmed",
      "preparing",
      "assigned",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;
    await order.save();

    res.json({ message: "Status updated", order });

  } catch (err) {
    console.error("Status update error:", err);
    res.status(500).json({ error: err.message });
  }
});
/* =========================================
   🍔 GET MENU (PAGINATION + SEARCH + CATEGORY)
========================================= */
router.get("/menu", protect, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const search = req.query.search || "";
    const category = req.query.category || "all";

    const query = {};

    // Category filter
    if (category !== "all") {
      query.category = { $regex: `^${category}$`, $options: "i" };
    }

    // Search filter
    if (search && search.trim() !== "") {
      query.name = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    const totalItems = await Menu.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const menu = await Menu.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      menu,
      totalPages,
      totalItems,
      currentPage: page,
    });

  } catch (err) {
    console.error("Menu fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================================
   ➕ ADD MENU ITEM
========================================= */
router.post(
  "/menu",
  protect,
  adminOnly,
  upload.single("image"),
  async (req, res) => {
    try {
      let { name, price, category, description } = req.body;

      category = category.trim().toLowerCase();

      if (!name || !price || !category) {
        return res.status(400).json({
          message: "Name, price and category are required",
        });
      }

      const newItem = new Menu({
        name,
        price,
        category,
        description,
        isAvailable: true,
        image: req.file
          ? `/uploads/menu/${category}/${req.file.filename}`
          : "",
      });

      await newItem.save();

      res.status(201).json(newItem);

    } catch (err) {
      console.error("Menu add error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =========================================
   ✏ UPDATE MENU ITEM
========================================= */
router.put(
  "/menu/:id",
  protect,
  adminOnly,
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, price, description, category, isAvailable } = req.body;

      const item = await Menu.findById(req.params.id);

      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      item.name = name ?? item.name;
      item.price = price ?? item.price;
      item.description = description ?? item.description;

      if (category) {
        item.category = category.trim().toLowerCase();
      }

      item.isAvailable = isAvailable ?? item.isAvailable;

      if (req.file) {
        item.image = `/uploads/menu/${item.category}/${req.file.filename}`;
      }

      await item.save();

      res.json({ message: "Menu updated", item });

    } catch (err) {
      console.error("Menu update error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =========================================
   ❌ CANCEL ORDER
========================================= */
router.put("/orders/:id/cancel", protect, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: "Cancel reason required" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = "cancelled";
    order.cancelReason = reason;
    order.cancelledAt = new Date();

    await order.save();

    res.json({ message: "Order cancelled", order });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================
   🗑 DELETE MENU ITEM
========================================= */
router.delete("/menu/:id", protect, adminOnly, async (req, res) => {
  try {
    await Menu.findByIdAndDelete(req.params.id);
    res.json({ message: "Menu item deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================
   🔁 TOGGLE STOCK
========================================= */
router.put("/menu/:id/toggle", protect, adminOnly, async (req, res) => {
  try {
    const item = await Menu.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    item.isAvailable = !item.isAvailable;
    await item.save();

    res.json(item);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================
   📈 ANALYTICS
========================================= */
router.get("/analytics", protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate, range } = req.query;

    let start;
    let end = new Date();

    if (range === "7") {
      start = new Date();
      start.setDate(start.getDate() - 7);
    }
    else if (range === "30") {
      start = new Date();
      start.setDate(start.getDate() - 30);
    }
    else if (range === "90") {
      start = new Date();
      start.setDate(start.getDate() - 90);
    }
    else if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    }
    else {
      start = new Date();
      start.setDate(start.getDate() - 7);
    }

    const analytics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          orders: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", "delivered"] },
                "$totalPrice",
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(analytics);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
// GET ADMIN STATS
router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pending = await Order.countDocuments({ status: "pending" });
    const preparing = await Order.countDocuments({ status: "preparing" });
    const delivered = await Order.countDocuments({ status: "delivered" });

    const deliveredOrders = await Order.find({ status: "delivered" });

    const revenue = deliveredOrders.reduce(
      (sum, order) => sum + order.totalPrice,
      0
    );

    // ⭐ FIXED RATING
    const ratedOrders = await Order.find({
      rating: { $exists: true, $ne: null }
    });

    const avgRating =
      ratedOrders.length > 0
        ? ratedOrders.reduce((acc, o) => acc + Number(o.rating || 0), 0) /
        ratedOrders.length
        : 0;

    res.json({
      totalOrders,
      pending,
      preparing,
      delivered,
      revenue,
      avgRating: avgRating.toFixed(1),
      totalReviews: ratedOrders.length
    });

  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================================
   👥 GET ALL USERS
========================================= */
router.get("/users", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password")
      .sort({ _id: -1 });

    res.json(users);
  } catch (err) {
    console.error("Users fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================================
   🚚 CREATE DELIVERY BOY
========================================= */
router.post("/delivery-boy", protect, adminOnly, async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Check existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    // Generate random password
    const randomPassword = generatePassword();

    // Create delivery user
    const deliveryBoy = await User.create({
      name,
      email,
      phone,
      password: randomPassword,
      role: "delivery",
    });

    // Send credentials email
    try {
      await sendEmail(
        email,
        "Welcome to GJ 21 Cafe Delivery Team",
        `
      <h2>Welcome ${name}</h2>

      <p>Your delivery account has been created successfully.</p>

      <p><strong>Email:</strong> ${email}</p>

      <p><strong>Password:</strong> ${randomPassword}</p>

      <p>Please use these credentials to login to the Delivery Dashboard.</p>

      <hr/>

      <p>GJ 21 Cafe Team</p>
    `
      );

      console.log(`✅ Credentials email sent to ${email}`);
    } catch (emailErr) {
      console.error(
        "❌ Failed to send credentials email:",
        emailErr.message
      );
    }

    res.status(201).json({
      success: true,
      message: "Delivery boy created successfully",
      email,
      password: randomPassword,
      user: {
        id: deliveryBoy._id,
        name: deliveryBoy.name,
        role: deliveryBoy.role
      }
    });

  } catch (err) {
    console.error("Create delivery boy error:", err);
    res.status(500).json({
      error: err.message
    });
  }
});

router.get("/delivery-boy", protect, adminOnly, async (req, res) => {
  try {
    const deliveryBoys = await User.find({
      role: "delivery",
    })
      .select("-password")
      .sort({ createdAt: -1 });

    const result = await Promise.all(
      deliveryBoys.map(async (boy) => {

        const assigned = await Order.countDocuments({
          assignedDeliveryBoy: boy._id,
        });

        const inTransit = await Order.countDocuments({
          assignedDeliveryBoy: boy._id,
          deliveryStatus: "intransit",
        });

        const delivered = await Order.countDocuments({
          assignedDeliveryBoy: boy._id,
          deliveryStatus: "delivered",
        });

        const cancelled = await Order.countDocuments({
          assignedDeliveryBoy: boy._id,
          deliveryStatus: "cancelled",
        });

        return {
          ...boy.toObject(),
          assigned,
          inTransit,
          delivered,
          cancelled,
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message,
    });
  }
});

// Assign Delivery Boy to Order
router.put("/orders/:id/assign", protect, adminOnly, async (req, res) => {
  try {
    const { deliveryBoyId } = req.body;

    if (!deliveryBoyId) {
      return res.status(400).json({
        success: false,
        message: "Delivery Boy ID is required",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify user is actually a delivery boy
    // Verify user is actually a delivery boy
    const deliveryBoy = await User.findById(deliveryBoyId);

    if (!deliveryBoy || deliveryBoy.role !== "delivery") {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery boy",
      });
    }

    if (!deliveryBoy.isActive) {
      return res.status(400).json({
        success: false,
        message: "Delivery boy is inactive",
      });
    }

    order.assignedDeliveryBoy = deliveryBoyId;
    order.status = "assigned";
    order.deliveryStatus = "assigned";

    await order.save();

    // Send email to delivery boy
    try {
      await sendEmail(
        deliveryBoy.email,
        "New Delivery Assigned - GJ 21 Cafe",
        `
      <h2>🚚 New Delivery Assigned</h2>

      <p>Hello ${deliveryBoy.name},</p>

      <p>You have been assigned a new order.</p>

      <hr/>

      <p><strong>Order ID:</strong> ${order._id}</p>

      <p><strong>Customer:</strong>
      ${order.deliveryAddress?.fullName || "N/A"}</p>

      <p><strong>Phone:</strong>
      ${order.deliveryAddress?.phone || "N/A"}</p>

      <p><strong>Address:</strong></p>

      <p>
      ${order.deliveryAddress?.house || ""},
      ${order.deliveryAddress?.street || ""},
      ${order.deliveryAddress?.area || ""},
      ${order.deliveryAddress?.city || ""}
      </p>

      <hr/>

      <p>Please login to the Delivery Dashboard and start delivery.</p>

      <p>GJ 21 Cafe</p>
    `
      );

      console.log(
        `✅ Assignment email sent to ${deliveryBoy.email}`
      );
    } catch (emailErr) {
      console.error(
        "❌ Email sending failed:",
        emailErr.message
      );
    }

    res.json({
      success: true,
      message: "Delivery boy assigned successfully",
      order,
    });
  } catch (err) {
    console.error("Assign Delivery Boy Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get(
  "/orders/unassigned",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const orders = await Order.find({
        assignedDeliveryBoy: null,
      })
        .populate("user", "name email")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        orders,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

router.get("/delivery-stats", protect, adminOnly, async (req, res) => {
  try {
    const totalDeliveryBoys = await User.countDocuments({
      role: "delivery",
    });

    const assignedOrders = await Order.countDocuments({
      deliveryStatus: "assigned",
    });

    const inTransitOrders = await Order.countDocuments({
      deliveryStatus: "intransit",
    });

    const deliveredOrders = await Order.countDocuments({
      deliveryStatus: "delivered",
    });

    const cancelledOrders = await Order.countDocuments({
      deliveryStatus: "cancelled",
    });

    res.json({
      totalDeliveryBoys,
      assignedOrders,
      inTransitOrders,
      deliveredOrders,
      cancelledOrders,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch(
  "/delivery-boy/:id/toggle-active",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const deliveryBoy = await User.findById(req.params.id);

      if (!deliveryBoy) {
        return res.status(404).json({
          message: "Delivery boy not found",
        });
      }

      deliveryBoy.isActive = !deliveryBoy.isActive;

      await deliveryBoy.save();

      res.json({
        success: true,
        isActive: deliveryBoy.isActive,
      });
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  }
);

router.put(
  "/delivery-boy/:id",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const { name, email, phone } = req.body;

      const deliveryBoy = await User.findById(req.params.id);

      if (!deliveryBoy) {
        return res.status(404).json({
          message: "Delivery boy not found",
        });
      }

      deliveryBoy.name = name || deliveryBoy.name;
      deliveryBoy.email = email || deliveryBoy.email;
      deliveryBoy.phone = phone || deliveryBoy.phone;

      await deliveryBoy.save();

      res.json({
        success: true,
        deliveryBoy,
      });
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  }
);
router.delete(
  "/delivery-boy/:id",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const deliveryBoy = await User.findById(req.params.id);

      if (!deliveryBoy) {
        return res.status(404).json({
          message: "Delivery boy not found",
        });
      }

      await User.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Delivery boy deleted",
      });
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  }
);
// GET /api/admin/delivery-orders/recent
router.get(
  "/delivery-orders/recent",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const orders = await Order.find({
        assignedDeliveryBoy: { $ne: null },
      })
        .populate(
          "assignedDeliveryBoy",
          "name email phone"
        )
        .populate(
          "user",
          "name email"
        )
        .populate(
          "items.menuItem",
          "name"
        )
        .sort({ updatedAt: -1 });

      res.status(200).json({
        success: true,
        count: orders.length,
        orders,
      });

    } catch (error) {
      console.error(
        "Recent Delivery Orders Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Failed to fetch recent assigned orders",
      });
    }
  }
);
export default router;