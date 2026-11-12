import express from "express";
import { db } from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// GET /api/appointments
router.get("/", authenticate, async (req, res) => {
  try {
    const { role, id } = req.user;
    let appointments = [];

    if (role === "admin") {
      appointments = await db.appointments.find();
    } else if (role === "doctor") {
      appointments = await db.appointments.find({ docId: id });
    } else {
      appointments = await db.appointments.find({ patientId: id });
    }

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// POST /api/appointments (Book appointment)
router.post("/", authenticate, async (req, res) => {
  try {
    const { scheduleId } = req.body;
    if (!scheduleId) {
      return res.status(400).json({ error: "Schedule ID is required" });
    }

    // Use PostgreSQL Atomic Transaction with Row Locking (FOR UPDATE) if active
    if (db.isPostgres && typeof db.appointments.bookAtomic === "function") {
      try {
        const appointment = await db.appointments.bookAtomic(scheduleId, req.user);
        return res.status(201).json(appointment);
      } catch (atomicErr) {
        return res.status(400).json({ error: atomicErr.message || "Failed to book appointment" });
      }
    }

    const schedule = await db.schedules.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: "Selected session does not exist" });
    }

    const patientId = req.user.id || req.user._id;

    // Check if patient already booked this session
    const existing = await db.appointments.find({
      scheduleId,
      patientId,
      status: "confirmed"
    });

    if (existing.length > 0) {
      return res.status(400).json({
        error: "You have already booked an appointment for this session (Appointment #" + existing[0].appointmentNumber + ")"
      });
    }

    // Check if session is full
    const currentBooked = schedule.bookedCount || 0;
    if (currentBooked >= (schedule.maxAppointments || 20)) {
      return res.status(400).json({ error: "This session is fully booked" });
    }

    const apponum = currentBooked + 1;

    // Create appointment
    const appointment = await db.appointments.create({
      scheduleId,
      scheduleTitle: schedule.title,
      docId: schedule.docId,
      docName: schedule.docName,
      patientId,
      patientName: req.user.name,
      patientEmail: req.user.email,
      patientPhone: req.user.phone || "",
      appointmentNumber: apponum,
      appointmentDate: new Date().toISOString().split("T")[0],
      sessionDate: schedule.sessionDate,
      sessionTime: schedule.sessionTime,
      status: "confirmed"
    });

    // Update schedule bookedCount
    await db.schedules.findByIdAndUpdate(scheduleId, {
      bookedCount: apponum
    });

    res.status(201).json(appointment);
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ error: "Failed to book appointment" });
  }
});

// DELETE /api/appointments/:id (Cancel appointment)
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await db.appointments.findById(id);
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // Authorization: patient owner, doctor for that session, or admin
    const userId = req.user.id || req.user._id;
    if (
      req.user.role !== "admin" &&
      appointment.patientId !== userId &&
      appointment.docId !== userId
    ) {
      return res.status(403).json({ error: "Unauthorized to cancel this appointment" });
    }

    await db.appointments.findByIdAndDelete(id);

    // Update schedule booked count
    const schedule = await db.schedules.findById(appointment.scheduleId);
    if (schedule && schedule.bookedCount > 0) {
      await db.schedules.findByIdAndUpdate(appointment.scheduleId, {
        bookedCount: schedule.bookedCount - 1
      });
    }

    res.json({ message: "Appointment cancelled successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel appointment" });
  }
});

export default router;
