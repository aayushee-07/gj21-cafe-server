// routes/contact.js
import express from "express";
import { Contact, ContactSettings } from "../models/contact.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { sendEmail } from "../utils/sendEmail.js";

const router = express.Router();


// ════════════════════════════════════════════
// 📩 MESSAGES
// ════════════════════════════════════════════

// ✅ POST — user sends message
router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields required" });
    }

   const newMessage = await Contact.create({
  name: name.trim(),
  email: email.trim().toLowerCase(),
  message: message.trim(),
});

// 📧 Send message to Admin Email
await sendEmail(
  process.env.EMAIL_USER,
  `📩 New Contact Message from ${name}`,
  `
    <h2>New Contact Form Submission</h2>

    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>

    <p><strong>Message:</strong></p>
    <p>${message}</p>
  `,
  email // replyTo customer email
);

res.status(201).json({
  message: "Message sent successfully",
  data: newMessage,
});

  } catch (err) {
    console.error("CREATE MESSAGE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ✅ GET — admin fetch all messages
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    console.error("GET MESSAGES ERROR:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});


// ✅ DELETE — admin delete message
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const deleted = await Contact.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.json({ message: "Message deleted successfully" });

  } catch (err) {
    console.error("DELETE MESSAGE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ════════════════════════════════════════════
// ⚙️ CONTACT SETTINGS
// ════════════════════════════════════════════


// ✅ PUBLIC — frontend contact page
router.get("/settings", async (req, res) => {
  try {
    let settings = await ContactSettings.findOne();

    if (!settings) {
      settings = await ContactSettings.create({});
    }

    res.json(settings);

  } catch (err) {
    console.error("GET SETTINGS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ✅ ADMIN — get settings
router.get("/admin/settings", protect, adminOnly, async (req, res) => {
  try {
    let settings = await ContactSettings.findOne();

    if (!settings) {
      settings = await ContactSettings.create({});
    }

    res.json(settings);

  } catch (err) {
    console.error("ADMIN GET SETTINGS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ✅ ADMIN — update settings
router.put("/admin/settings", protect, adminOnly, async (req, res) => {
  try {
    let settings = await ContactSettings.findOne();

    if (!settings) {
      settings = new ContactSettings();
    }

    Object.assign(settings, req.body);

    await settings.save();

    res.json({
      message: "Settings updated successfully",
      data: settings,
    });

  } catch (err) {
    console.error("UPDATE SETTINGS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;