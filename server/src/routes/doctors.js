import express from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// GET /api/doctors
router.get("/", async (req, res) => {
  try {
    const { q, specialty } = req.query;
    let doctors = await db.users.find({ role: "doctor" });

    if (q) {
      const term = q.toLowerCase();
      doctors = doctors.filter(
        d =>
          d.name?.toLowerCase().includes(term) ||
          d.email?.toLowerCase().includes(term) ||
          d.specialtyName?.toLowerCase().includes(term)
      );
    }

    if (specialty) {
      doctors = doctors.filter(
        d =>
          (d.specialty && d.specialty.toLowerCase() === specialty.toLowerCase()) ||
          (d.specialtyName && d.specialtyName.toLowerCase() === specialty.toLowerCase())
      );
    }

    // Strip passwords
    const safe = doctors.map(({ password, ...doc }) => doc);
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

// GET /api/doctors/:id
router.get("/:id", async (req, res) => {
  try {
    const doc = await db.users.findById(req.params.id);
    if (!doc || doc.role !== "doctor") {
      return res.status(404).json({ error: "Doctor not found" });
    }
    const { password, ...safeDoc } = doc;
    res.json(safeDoc);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch doctor details" });
  }
});

// POST /api/doctors (Admin only)
router.post("/", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { name, email, password, nic, phone, specialtyId } = req.body;
    if (!name || !email || !password || !specialtyId) {
      return res.status(400).json({ error: "Name, email, password, and specialty are required" });
    }

    const existing = await db.users.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    const specialtyObj = await db.specialties.findById(specialtyId);
    const specialtyName = specialtyObj ? specialtyObj.sname : (req.body.specialty || "General Practice");

    const hashedPassword = await bcrypt.hash(password, 10);
    const newDoctor = await db.users.create({
      role: "doctor",
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      nic: nic || "",
      phone: phone || "",
      specialtyId: Number(specialtyId),
      specialtyName
    });

    const { password: _, ...safeDoctor } = newDoctor;
    res.status(201).json(safeDoctor);
  } catch (err) {
    console.error("Error creating doctor:", err);
    res.status(500).json({ error: "Failed to create doctor account" });
  }
});

// PUT /api/doctors/:id
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    // Allow admin or doctor themselves
    if (req.user.role !== "admin" && (req.user.id !== id && req.user._id !== id)) {
      return res.status(403).json({ error: "Unauthorized to update this doctor" });
    }

    const updates = { ...req.body };
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    } else {
      delete updates.password;
    }

    if (updates.specialtyId || updates.specialty) {
      const specialtyObj = updates.specialtyId ? await db.specialties.findById(updates.specialtyId) : null;
      const specName = updates.specialty || (specialtyObj ? specialtyObj.sname : "General Practice");
      updates.specialty = specName;
      updates.specialtyName = specName;
      delete updates.specialtyId;
    }

    delete updates.role; // Prevent changing role
    delete updates.id;
    delete updates._id;

    const updated = await db.users.findByIdAndUpdate(id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    const { password: _, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: "Failed to update doctor profile" });
  }
});

// DELETE /api/doctors/:id (Admin only)
router.delete("/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.users.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Doctor not found" });
    }
    res.json({ message: "Doctor deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete doctor" });
  }
});

export default router;
