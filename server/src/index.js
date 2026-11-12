import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { initDatabase, db } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

import authRoutes from "./routes/auth.js";
import specialtyRoutes from "./routes/specialties.js";
import doctorRoutes from "./routes/doctors.js";
import patientRoutes from "./routes/patients.js";
import scheduleRoutes from "./routes/schedules.js";
import appointmentRoutes from "./routes/appointments.js";
import statsRoutes from "./routes/stats.js";


const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json());

// Request logger for clarity
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    system: "Medflow Doctor Appointment System API (PERN/MERN)",
    dbEngine: db.isPostgres
      ? "PostgreSQL / Supabase (Active)"
      : db.isMongo
      ? "MongoDB (Active)"
      : "Embedded Persistent Store (Active)",
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/specialties", specialtyRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/stats", statsRoutes);

// 404 handler for unknown API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start Server
async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 Medflow MERN Backend Server running on port ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(
      `🗄️  Database: ${
        db.isPostgres
          ? "PostgreSQL / Supabase (Active)"
          : db.isMongo
          ? "MongoDB"
          : "Embedded Local Database (Auto-fallback)"
      }`
    );
    console.log(`===============================================`);
  });
}

start();
