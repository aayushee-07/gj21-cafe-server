import mongoose from "mongoose";

const favouriteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "Menu", required: true },
      addedAt: { type: Date, default: Date.now }
    }
  ]
});

const Favourite = mongoose.model("Favourite", favouriteSchema);
export default Favourite;
