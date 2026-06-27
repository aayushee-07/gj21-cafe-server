import express from "express";
import Cart from "../models/cart.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

/* ===============================
   GET USER CART
================================ */
router.get("/", protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.menuItem");

    res.json(cart ? cart.items : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   ADD ITEM TO CART
================================ */
router.post("/", protect, async (req, res) => {
  try {
    const { menuItemId } = req.body;

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        items: [],
      });
    }

    const existingItem = cart.items.find((item) =>
      item.menuItem.equals(menuItemId)
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.items.push({
        menuItem: menuItemId,
        quantity: 1,
      });
    }

    await cart.save();

    res.json({
      message: "Item added to cart",
      cart,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   REMOVE ITEM FROM CART
================================ */
router.delete("/:menuItemId", protect, async (req, res) => {
  try {
    const { menuItemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      (item) => !item.menuItem.equals(menuItemId)
    );

    await cart.save();

    res.json({
      message: "Item removed from cart",
      cart,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   CLEAR ENTIRE CART
================================ */
router.delete("/clear", protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.json({ message: "Cart already empty" });
    }

    cart.items = [];
    await cart.save();

    res.json({
      message: "Cart cleared successfully",
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;