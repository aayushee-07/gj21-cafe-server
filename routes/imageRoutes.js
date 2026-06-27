import express from "express";
import Image from "../models/model.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// ✅ Upload Single Image (with category)
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const category = req.body.category || "others";

    const newImage = new Image({
      name: req.body.name,
      category: category,
      image: `/uploads/menu/${req.body.category}/${req.file.filename}`, 
    });

    await newImage.save();
    res.json({ success: true, image: newImage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Upload Multiple Images (with category)
router.post("/uploads", upload.array("image", 10), async (req, res) => {
  try {
    const category = req.body.category || "others";

    const images = req.files.map(file => ({
      name: req.body.name || file.originalname,
      category: category,
      image: `/uploads/menu/${category}/${file.filename}`,
    }));

    const savedImages = await Image.insertMany(images);

    res.json({ success: true, images: savedImages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get All Images
router.get("/", async (req, res) => {
  try {
    const images = await Image.find();
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
