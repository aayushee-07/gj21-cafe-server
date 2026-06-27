import mongoose from "mongoose";

// Message schema
const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

// Settings schema
const contactSettingsSchema = new mongoose.Schema(
  {
    address: { type: String, default: "" },
    phone1: { type: String, default: "" },
    phone2: { type: String, default: "" },
    email: { type: String, default: "" },
    hoursOpen: { type: String, default: "14:00" },
    hoursClose: { type: String, default: "02:00" },
    instagram: { type: String, default: "" },
    mondayToSunday: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ✅ IMPORTANT FIX
export const Contact =
  mongoose.models.Contact || mongoose.model("Contact", contactSchema);

export const ContactSettings =
  mongoose.models.ContactSettings ||
  mongoose.model("ContactSettings", contactSettingsSchema);