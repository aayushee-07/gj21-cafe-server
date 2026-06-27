import express from "express";
import Favourite from "../models/favourite.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// ✅ Get user's favourites
router.get("/", protect, async (req, res) => {
  try {
    const favourite = await Favourite.findOne({ user: req.user._id }).populate("items.menuItem");
    res.json(favourite ? favourite.items : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Add to favourites
router.post("/", protect, async (req, res) => {
  try {
    const { menuItemId } = req.body;

    if (!menuItemId) {
      return res.status(400).json({ error: "menuItemId required" });
    }

    let favourite = await Favourite.findOne({ user: req.user._id });

    if (!favourite) {
      favourite = new Favourite({ user: req.user._id, items: [] });
    }

    const exists = favourite.items.some(
      item => item.menuItem.toString() === menuItemId
    );

    if (!exists) {
      favourite.items.push({ menuItem: menuItemId });
      await favourite.save();
    }

    res.json({ message: "Item added to favourites", favourite });

  } catch (err) {
    console.error("FAV ERROR:", err); // 🔥 add this for debug
    res.status(500).json({ error: err.message });
  }
});
// ✅ Remove from favourites
router.delete("/:menuItemId", protect, async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const favourite = await Favourite.findOne({ user: req.user._id });

    if (!favourite) return res.status(404).json({ message: "No favourites found" });

    favourite.items = favourite.items.filter(
      item => item.menuItem.toString() !== menuItemId
    );
    await favourite.save();

    res.json({ message: "Item removed", favourite });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
