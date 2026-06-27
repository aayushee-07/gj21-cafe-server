import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  imageUrl: { type: String },   // store file path or URL
  createdAt: { type: Date, default: Date.now }
});

const Image = mongoose.model("Image", imageSchema);
export default Image;
