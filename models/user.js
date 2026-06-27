import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: { type: String, required: true, unique: true },

  password: { type: String, required: true },

  // 📞 Optional now (not only for delivery)
  phone: {
    type: String,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  // 👤 Only 2 roles now
  role: {
    type: String,
    enum: ["customer", "admin", "delivery"],
    default: "customer",
  },

  // ✅ Always approved (no delivery flow)
  status: {
    type: String,
    default: "approved",
  },

  lastLogin: {
    type: Date
  },

  loginCount: {
    type: Number,
    default: 0
  },

  otp: {
    type: String,
  },

  otpExpire: {
    type: Date,
  },

}, { timestamps: true });


// 🔒 Hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 🔑 Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;