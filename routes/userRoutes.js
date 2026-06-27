// routes/userRoutes.js
import express from "express";
import User from "../models/user.js";
import { protect } from "../middleware/auth.js";
import Favourite from "../models/favourite.js";

const router = express.Router();

// ✅ Get Current User Profile
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    res.json(user);
  } catch (err) {
    console.log("error:-")
    res.status(500).json({ error: err.message });
  }
});



// ✅ Get favourites for logged-in user
router.get("/favourites", protect, async (req, res) => {
  try {
    const user = await Favourite.findById({user:req.user.id});
    res.json(user.favourites);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch favourites" });
  }
});

// ✅ Toggle favourite menu item
router.post("/favourites/:menuId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const menuId = req.params.menuId;

    if (!user.favourites.includes(menuId)) {
      user.favourites.push(menuId);
    } else {
      user.favourites = user.favourites.filter((id) => id.toString() !== menuId);
    }

    await user.save();
    const updatedUser = await User.findById(req.user.id).populate("favourites");
    res.json(updatedUser.favourites);
  } catch (err) {
    res.status(500).json({ error: "Failed to update favourites" });
  }
});

export default router;
