import express from "express";
import fs from "fs";
import Menu from "../models/menu.js";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const menu = await Menu.find(); // ✅ show everything
    res.json(menu);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET menu items grouped by category (public)
router.get("/grouped", async (req, res) => {
  try {
    const items = await Menu.find();

    const grouped = items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

    res.status(200).json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST new menu item (admin only)
router.post("/", protect, upload.single("image"), async (req, res) => {
  try {
    console.log("👤 Authenticated user:", req.user);

    const newItemData = { ...req.body };

    if (req.file) {
      newItemData.image = `/uploads/menu/${req.body.category}/${req.file.filename}`;
    }

    const newItem = new Menu(newItemData);
    await newItem.save();

    res.json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ PUT /:id → update menu item (admin only)
router.put("/:id", protect, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const oldItem = await Menu.findById(id);
    if (!oldItem) return res.status(404).json({ message: "Menu item not found" });

    let updatedData = { ...req.body };

    if (req.file) {
      if (oldItem.image && fs.existsSync("." + oldItem.image)) {
        fs.unlinkSync("." + oldItem.image);
      }
      updatedData.image = `/uploads/menu/${req.body.category}/${req.file.filename}`;
    }

    const updatedItem = await Menu.findByIdAndUpdate(id, updatedData, { new: true });

    res.json({ message: "Menu item updated", item: updatedItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /:id → delete menu item (admin only)
router.delete("/:id", protect, async (req, res) => {
  try {
    const deletedItem = await Menu.findByIdAndDelete(req.params.id);
    if (!deletedItem) return res.status(404).json({ message: "Menu item not found" });
    res.json({ message: "Menu item deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
