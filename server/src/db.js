import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  initialSpecialties,
  initialUsers,
  initialSchedules,
  initialAppointments
} from "./seeds.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ----------------------------------------------------
// Mongoose Schemas (Used when MongoDB is connected)
// ----------------------------------------------------
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "doctor", "patient"], required: true },
  name: { type: String, required: true },
  phone: String,
  nic: String,
  dob: String,
  address: String,
  specialtyId: Number,
  specialtyName: String,
  createdAt: { type: Date, default: Date.now }
});

const specialtySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  sname: { type: String, required: true }
});

const scheduleSchema = new mongoose.Schema({
  docId: { type: String, required: true },
  docName: String,
  specialtyName: String,
  title: { type: String, required: true },
  sessionDate: { type: String, required: true },
  sessionTime: { type: String, required: true },
  maxAppointments: { type: Number, default: 20 },
  bookedCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const appointmentSchema = new mongoose.Schema({
  scheduleId: { type: String, required: true },
  scheduleTitle: String,
  docId: { type: String, required: true },
  docName: String,
  patientId: { type: String, required: true },
  patientName: String,
  patientEmail: String,
  patientPhone: String,
  appointmentNumber: { type: Number, required: true },
  appointmentDate: String,
  sessionDate: String,
  sessionTime: String,
  status: { type: String, enum: ["confirmed", "cancelled", "completed"], default: "confirmed" },
  createdAt: { type: Date, default: Date.now }
});

export let UserModel;
export let SpecialtyModel;
export let ScheduleModel;
export let AppointmentModel;

// ----------------------------------------------------
// Memory / File-based Store Fallback Implementation
// ----------------------------------------------------
class LocalStore {
  constructor() {
    this.data = {
      users: [...initialUsers],
      specialties: [...initialSpecialties],
      schedules: [...initialSchedules],
      appointments: [...initialAppointments]
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, "utf-8");
        this.data = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (err) {
      console.warn("Could not load local store, reinitializing defaults:", err.message);
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to save local store:", err.message);
    }
  }
}

const localStore = new LocalStore();

// Wrapper with unified async query methods
export const db = {
  isMongo: false,

  users: {
    find: async (filter = {}) => {
      if (db.isMongo) {
        const docs = await UserModel.find(filter).lean();
        return docs.map(d => ({ ...d, id: d._id.toString() }));
      }
      return localStore.data.users.filter(u => {
        for (const [k, v] of Object.entries(filter)) {
          if (u[k] !== v) return false;
        }
        return true;
      });
    },
    findById: async (id) => {
      if (db.isMongo) {
        const doc = await UserModel.findById(id).lean();
        return doc ? { ...doc, id: doc._id.toString() } : null;
      }
      return localStore.data.users.find(u => u.id === id || u._id === id) || null;
    },
    findOne: async (filter = {}) => {
      if (db.isMongo) {
        const doc = await UserModel.findOne(filter).lean();
        return doc ? { ...doc, id: doc._id.toString() } : null;
      }
      return localStore.data.users.find(u => {
        for (const [k, v] of Object.entries(filter)) {
          if (typeof v === "string") {
            if (u[k]?.toLowerCase() !== v.toLowerCase()) return false;
          } else if (u[k] !== v) {
            return false;
          }
        }
        return true;
      }) || null;
    },
    create: async (data) => {
      if (db.isMongo) {
        const created = await UserModel.create(data);
        const obj = created.toObject();
        return { ...obj, id: obj._id.toString() };
      }
      const newItem = {
        id: "user-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
        createdAt: new Date().toISOString(),
        ...data
      };
      localStore.data.users.push(newItem);
      localStore.save();
      return newItem;
    },
    findByIdAndUpdate: async (id, updates) => {
      if (db.isMongo) {
        const updated = await UserModel.findByIdAndUpdate(id, updates, { new: true }).lean();
        return updated ? { ...updated, id: updated._id.toString() } : null;
      }
      const idx = localStore.data.users.findIndex(u => u.id === id || u._id === id);
      if (idx === -1) return null;
      localStore.data.users[idx] = { ...localStore.data.users[idx], ...updates };
      localStore.save();
      return localStore.data.users[idx];
    },
    findByIdAndDelete: async (id) => {
      if (db.isMongo) {
        const deleted = await UserModel.findByIdAndDelete(id).lean();
        return deleted ? { ...deleted, id: deleted._id.toString() } : null;
      }
      const idx = localStore.data.users.findIndex(u => u.id === id || u._id === id);
      if (idx === -1) return null;
      const [removed] = localStore.data.users.splice(idx, 1);
      localStore.save();
      return removed;
    }
  },

  specialties: {
    find: async () => {
      if (db.isMongo) {
        const docs = await SpecialtyModel.find().sort({ sname: 1 }).lean();
        return docs.map(d => ({ ...d, id: d.id || d._id.toString() }));
      }
      return [...localStore.data.specialties].sort((a, b) => a.sname.localeCompare(b.sname));
    },
    findById: async (id) => {
      if (db.isMongo) {
        const doc = await SpecialtyModel.findOne({ id: Number(id) }).lean();
        return doc || null;
      }
      return localStore.data.specialties.find(s => s.id === Number(id)) || null;
    }
  },

  schedules: {
    find: async (filter = {}) => {
      if (db.isMongo) {
        const docs = await ScheduleModel.find(filter).sort({ sessionDate: 1, sessionTime: 1 }).lean();
        return docs.map(d => ({ ...d, id: d._id.toString() }));
      }
      let results = localStore.data.schedules.filter(s => {
        for (const [k, v] of Object.entries(filter)) {
          if (s[k] !== v) return false;
        }
        return true;
      });
      return results.sort((a, b) => (a.sessionDate + a.sessionTime).localeCompare(b.sessionDate + b.sessionTime));
    },
    findById: async (id) => {
      if (db.isMongo) {
        const doc = await ScheduleModel.findById(id).lean();
        return doc ? { ...doc, id: doc._id.toString() } : null;
      }
      return localStore.data.schedules.find(s => s.id === id || s._id === id) || null;
    },
    create: async (data) => {
      if (db.isMongo) {
        const created = await ScheduleModel.create(data);
        const obj = created.toObject();
        return { ...obj, id: obj._id.toString() };
      }
      const newItem = {
        id: "sched-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
        bookedCount: 0,
        createdAt: new Date().toISOString(),
        ...data
      };
      localStore.data.schedules.push(newItem);
      localStore.save();
      return newItem;
    },
    findByIdAndUpdate: async (id, updates) => {
      if (db.isMongo) {
        const updated = await ScheduleModel.findByIdAndUpdate(id, updates, { new: true }).lean();
        return updated ? { ...updated, id: updated._id.toString() } : null;
      }
      const idx = localStore.data.schedules.findIndex(s => s.id === id || s._id === id);
      if (idx === -1) return null;
      localStore.data.schedules[idx] = { ...localStore.data.schedules[idx], ...updates };
      localStore.save();
      return localStore.data.schedules[idx];
    },
    findByIdAndDelete: async (id) => {
      if (db.isMongo) {
        const deleted = await ScheduleModel.findByIdAndDelete(id).lean();
        return deleted ? { ...deleted, id: deleted._id.toString() } : null;
      }
      const idx = localStore.data.schedules.findIndex(s => s.id === id || s._id === id);
      if (idx === -1) return null;
      const [removed] = localStore.data.schedules.splice(idx, 1);
      localStore.save();
      return removed;
    }
  },

  appointments: {
    find: async (filter = {}) => {
      if (db.isMongo) {
        const docs = await AppointmentModel.find(filter).sort({ appointmentDate: -1, appointmentNumber: 1 }).lean();
        return docs.map(d => ({ ...d, id: d._id.toString() }));
      }
      let results = localStore.data.appointments.filter(a => {
        for (const [k, v] of Object.entries(filter)) {
          if (a[k] !== v) return false;
        }
        return true;
      });
      return results.sort((a, b) => (b.sessionDate || "").localeCompare(a.sessionDate || ""));
    },
    findById: async (id) => {
      if (db.isMongo) {
        const doc = await AppointmentModel.findById(id).lean();
        return doc ? { ...doc, id: doc._id.toString() } : null;
      }
      return localStore.data.appointments.find(a => a.id === id || a._id === id) || null;
    },
    create: async (data) => {
      if (db.isMongo) {
        const created = await AppointmentModel.create(data);
        const obj = created.toObject();
        return { ...obj, id: obj._id.toString() };
      }
      const newItem = {
        id: "appo-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
        status: "confirmed",
        createdAt: new Date().toISOString(),
        ...data
      };
      localStore.data.appointments.push(newItem);
      localStore.save();
      return newItem;
    },
    findByIdAndUpdate: async (id, updates) => {
      if (db.isMongo) {
        const updated = await AppointmentModel.findByIdAndUpdate(id, updates, { new: true }).lean();
        return updated ? { ...updated, id: updated._id.toString() } : null;
      }
      const idx = localStore.data.appointments.findIndex(a => a.id === id || a._id === id);
      if (idx === -1) return null;
      localStore.data.appointments[idx] = { ...localStore.data.appointments[idx], ...updates };
      localStore.save();
      return localStore.data.appointments[idx];
    },
    findByIdAndDelete: async (id) => {
      if (db.isMongo) {
        const deleted = await AppointmentModel.findByIdAndDelete(id).lean();
        return deleted ? { ...deleted, id: deleted._id.toString() } : null;
      }
      const idx = localStore.data.appointments.findIndex(a => a.id === id || a._id === id);
      if (idx === -1) return null;
      const [removed] = localStore.data.appointments.splice(idx, 1);
      localStore.save();
      return removed;
    }
  }
};

// ----------------------------------------------------
// Database Initialization
// ----------------------------------------------------
export async function initDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri && !process.env.TRY_LOCAL_MONGO) {
    console.log("ℹ️  Running in Embedded Local JSON Database mode with persistent storage.");
    console.log("   To use MongoDB, set MONGODB_URI in server/.env (e.g. mongodb://localhost:27017/medflow or Atlas URI)");
    return;
  }

  const targetUri = uri || "mongodb://localhost:27017/medflow";
  try {
    console.log(`Connecting to MongoDB at: ${targetUri}...`);
    await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 2500
    });

    UserModel = mongoose.model("User", userSchema);
    SpecialtyModel = mongoose.model("Specialty", specialtySchema);
    ScheduleModel = mongoose.model("Schedule", scheduleSchema);
    AppointmentModel = mongoose.model("Appointment", appointmentSchema);

    db.isMongo = true;
    console.log("✅ Successfully connected to MongoDB!");

    // Seed if collection is empty
    const specialtyCount = await SpecialtyModel.countDocuments();
    if (specialtyCount === 0) {
      console.log("🌱 Seeding MongoDB initial data...");
      await SpecialtyModel.insertMany(initialSpecialties);
      await UserModel.insertMany(initialUsers);
      await ScheduleModel.insertMany(initialSchedules);
      await AppointmentModel.insertMany(initialAppointments);
      console.log("🌱 Seed complete!");
    }
  } catch (err) {
    console.warn("⚠️  MongoDB connection failed (" + err.message + ")");
    console.log("⚡ Seamlessly falling back to embedded persistent storage mode (server/data/store.json).");
    db.isMongo = false;
  }
}
