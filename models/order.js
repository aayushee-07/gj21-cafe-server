import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    items: [
      {
        menuItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Menu",
          required: true
        },
        quantity: { type: Number, default: 1 },
      },
    ],

    // 💰 Pricing
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 30 }, // you can keep or remove later
    totalPrice: { type: Number, required: true },

    // 📍 Address
    deliveryAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true }, // ✅ ONLY THIS
      house: { type: String, required: true },
      street: { type: String, required: true },
      area: { type: String, required: true },
      city: { type: String, required: true },
      deliveryDistance: { type: Number, required: true },
      pincode: { type: String, required: true },
      landmark: { type: String },
    },
    // 💳 Payment
    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE"],
      default: "COD",
    },

    estimatedDeliveryTime: {
      type: Date,
    },

    specialInstructions: { type: String },

    // ✅ CLEAN STATUS FLOW (NO DELIVERY ROLE)
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "assigned",
        "cancelled"
      ],
      default: "pending",
    },
    assignedDeliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    deliveryStatus: {
      type: String,
      enum: [
        "unassigned",
        "assigned",
        "pickup",
        "intransit",
        "delivered",
        "cancelled"
      ],
      default: "unassigned",
    },
    phone: String,

    paymentStatus: {
      type: String,
      default: "unpaid"
    },

    orderDate: {
      type: Date,
      default: Date.now
    },

    couponCode: {
      type: String,
    },

    discount: {
      type: Number,
      default: 0,
    },

    finalTotal: {
      type: Number,
    },

    cancelledBy: {
      type: String,
      enum: ["admin", "user"],
    },

    cancelReason: {
      type: String,
    },

    cancelledAt: {
      type: Date,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
    },

    review: {
      type: String,
    },

    ratedAt: {
      type: Date,
    }
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;