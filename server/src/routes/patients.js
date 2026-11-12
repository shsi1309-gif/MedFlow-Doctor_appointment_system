import express from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// GET /api/patients (Admin and Doctor can view patients list)
router.get("/", authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    let patients = await db.users.find({ role: "patient" });

    // If caller is doctor, we can optionally filter by patients who have booked with this doctor or all patients
    if (q) {
      const term = q.toLowerCase();
      patients = patients.filter(
        p =>
          p.name?.toLowerCase().includes(term) ||
          p.email?.toLowerCase().includes(term) ||
          p.phone?.toLowerCase().includes(term)
      );
    }

    const safe = patients.map(({ password, ...p }) => p);
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch patients" });
  }
});

// GET /api/patients/:id
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    // Allow self, doctor, or admin
    if (req.user.role === "patient" && req.user.id !== id && req.user._id !== id) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const patient = await db.users.findById(id);
    if (!patient || patient.role !== "patient") {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Also get patient appointments
    const appointments = await db.appointments.find({ patientId: id });
    const { password, ...safePatient } = patient;
    res.json({ ...safePatient, appointments });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch patient details" });
  }
});

// PUT /api/patients/:id
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== "admin" && req.user.id !== id && req.user._id !== id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updates = { ...req.body };
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    } else {
      delete updates.password;
    }

    delete updates.role;
    delete updates.id;
    delete updates._id;

    const updated = await db.users.findByIdAndUpdate(id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const { password: _, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: "Failed to update patient profile" });
  }
});

// DELETE /api/patients/:id
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== "admin" && req.user.id !== id && req.user._id !== id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const deleted = await db.users.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.json({ message: "Patient account deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete patient" });
  }
});

export default router;
