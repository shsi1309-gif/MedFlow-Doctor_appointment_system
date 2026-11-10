import express from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { signToken, authenticate } from "../middleware/auth.js";

const router = express.Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password, expectedRole } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Username/Email and password are required" });
    }

    let user = await db.users.findOne({ email });
    if (!user && typeof email === "string") {
      if (email.endsWith("@medflow.com")) {
        user = await db.users.findOne({ email: email.replace(/@medflow\.com$/i, "@edoc.com") });
      } else if (email.endsWith("@edoc.com")) {
        user = await db.users.findOne({ email: email.replace(/@edoc\.com$/i, "@medflow.com") });
      }
    }
    if (!user) {
      return res.status(401).json({ error: "Login failed: Account does not exist." });
    }

    // Verify role if expectedRole is passed
    if (expectedRole && user.role !== expectedRole) {
      return res.status(401).json({
        error: `Login failed: This account is not registered as a ${expectedRole}. Please use the ${user.role} login option.`
      });
    }

    // Check password (supports both plain seeds and bcrypt hashed passwords)
    let isMatch = false;
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = user.password === password;
    }

    if (!isMatch) {
      return res.status(401).json({ error: "Login failed: Incorrect username/email or password." });
    }

    const token = signToken(user);
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during authentication" });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = "patient",
      phone,
      nic,
      dob,
      address,
      specialtyId
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Full name, email/username, and password are required" });
    }

    const existing = await db.users.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "An account with this email/username already exists" });
    }

    let specialtyName = "";
    if (role === "doctor" && specialtyId) {
      const spec = await db.specialties.findById(specialtyId);
      if (spec) specialtyName = spec.sname;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db.users.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "patient",
      phone: phone || "",
      nic: nic || "",
      dob: dob || "",
      address: address || "",
      specialtyId: specialtyId ? Number(specialtyId) : undefined,
      specialtyName: specialtyName || undefined
    });

    const token = signToken(newUser);
    const { password: _, ...safeUser } = newUser;
    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, (req, res) => {
  const { password: _, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

export default router;
