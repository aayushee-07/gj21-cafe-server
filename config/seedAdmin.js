import User from "../models/user.js";
import bcrypt from "bcryptjs";

export const createDefaultAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();

    if (!adminEmail || !process.env.ADMIN_PASSWORD) {
      console.log("❌ Admin credentials missing in .env");
      return;
    }

    // 🔍 Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log("⚡ Admin already exists");
      return;
    }

    // ✅ Create admin (NO manual hashing here)
    const admin = new User({
      name: process.env.ADMIN_NAME || "Admin",
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD, // 🔥 plain password
      role: "admin",
    });

    await admin.save();

    console.log("✅ Default Admin Created");
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD}`);

  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
  }
};
