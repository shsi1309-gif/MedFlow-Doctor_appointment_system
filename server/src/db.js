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

// ----------------------------------------------------
// PostgreSQL Helpers & Column Mappings
// ----------------------------------------------------
let pgPool = null;

function mapUser(row) {
  if (!row) return null;
  const spec = row.specialty || row.specialty_name || "";
  return {
    id: row.id,
    _id: row.id,
    email: row.email,
    password: row.password,
    role: row.role,
    name: row.name,
    phone: row.phone || "",
    nic: row.nic || "",
    dob: row.dob || "",
    address: row.address || "",
    specialty: spec,
    specialtyName: spec,
    specialtyId: row.specialty_id ? Number(row.specialty_id) : undefined,
    createdAt: row.created_at
  };
}

function mapSchedule(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    docId: row.doc_id,
    docName: row.doc_name,
    specialtyName: row.specialty_name,
    title: row.title,
    sessionDate: row.session_date,
    sessionTime: row.session_time,
    maxAppointments: Number(row.max_appointments),
    bookedCount: Number(row.booked_count || 0),
    createdAt: row.created_at
  };
}

function mapAppointment(row) {
  if (!row) return null;
  const appDate = row.appointment_date || (row.created_at ? new Date(row.created_at).toISOString().split("T")[0] : "");
  return {
    id: row.id,
    _id: row.id,
    scheduleId: row.schedule_id,
    scheduleTitle: row.schedule_title || "",
    docId: row.doc_id,
    docName: row.doc_name || "",
    specialtyName: row.specialty_name || "",
    patientId: row.patient_id,
    patientName: row.patient_name || "",
    patientEmail: row.patient_email || "",
    patientPhone: row.patient_phone || "",
    appointmentNumber: Number(row.appointment_number),
    appointmentDate: appDate,
    sessionDate: row.session_date || "",
    sessionTime: row.session_time || "",
    status: row.status,
    createdAt: row.created_at
  };
}

const JOINED_APPOINTMENT_SQL = `
  SELECT 
    a.id,
    a.schedule_id,
    a.patient_id,
    a.appointment_number,
    a.status,
    a.created_at,
    -- Joined from schedules:
    s.title AS schedule_title,
    s.session_date,
    s.session_time,
    s.doc_id,
    -- Joined from doctors:
    d.name AS doc_name,
    d.specialty AS specialty_name,
    -- Joined from patients:
    p.name AS patient_name,
    p.email AS patient_email,
    p.phone AS patient_phone
  FROM appointments a
  JOIN schedules s ON a.schedule_id = s.id
  JOIN doctors d ON s.doc_id = d.id
  JOIN patients p ON a.patient_id = p.id
`;

// ----------------------------------------------------
// Unified Database Interface
// ----------------------------------------------------
export const db = {
  isPostgres: false,
  isMongo: false,

  // Dedicated Admins Table
  admins: {
    find: async () => {
      if (db.isPostgres) {
        const res = await pgPool.query("SELECT id, email, password, name, phone, 'admin' AS role, created_at FROM admins ORDER BY created_at DESC");
        return res.rows.map(mapUser);
      }
      return localStore.data.users.filter(u => u.role === "admin");
    },
    findById: async (id) => {
      if (db.isPostgres) {
        const res = await pgPool.query("SELECT id, email, password, name, phone, 'admin' AS role, created_at FROM admins WHERE id = $1", [id]);
        return res.rows[0] ? mapUser(res.rows[0]) : null;
      }
      return localStore.data.users.find(u => u.role === "admin" && (u.id === id || u._id === id)) || null;
    }
  },

  // Dedicated Doctors Table (specialty stored directly as a column)
  doctors: {
    find: async (filter = {}) => {
      if (db.isPostgres) {
        let query = "SELECT id, email, password, name, phone, nic, specialty, 'doctor' AS role, created_at FROM doctors";
        const conditions = [];
        const values = [];
        let idx = 1;
        if (filter.specialty) {
          conditions.push(`LOWER(specialty) = LOWER($${idx++})`);
          values.push(filter.specialty);
        }
        if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
        query += " ORDER BY created_at DESC";
        const res = await pgPool.query(query, values);
        return res.rows.map(mapUser);
      }
      return localStore.data.users.filter(u => u.role === "doctor");
    },
    findById: async (id) => {
      if (db.isPostgres) {
        const res = await pgPool.query("SELECT id, email, password, name, phone, nic, specialty, 'doctor' AS role, created_at FROM doctors WHERE id = $1", [id]);
        return res.rows[0] ? mapUser(res.rows[0]) : null;
      }
      return localStore.data.users.find(u => u.role === "doctor" && (u.id === id || u._id === id)) || null;
    }
  },

  // Dedicated Patients Table
  patients: {
    find: async () => {
      if (db.isPostgres) {
        const res = await pgPool.query("SELECT id, email, password, name, phone, nic, dob, address, 'patient' AS role, created_at FROM patients ORDER BY created_at DESC");
        return res.rows.map(mapUser);
      }
      return localStore.data.users.filter(u => u.role === "patient");
    },
    findById: async (id) => {
      if (db.isPostgres) {
        const res = await pgPool.query("SELECT id, email, password, name, phone, nic, dob, address, 'patient' AS role, created_at FROM patients WHERE id = $1", [id]);
        return res.rows[0] ? mapUser(res.rows[0]) : null;
      }
      return localStore.data.users.find(u => u.role === "patient" && (u.id === id || u._id === id)) || null;
    }
  },

  // Unified Users Gateway (uses users VIEW for fast single-query auth)
  users: {
    find: async (filter = {}) => {
      if (db.isPostgres) {
        const conditions = [];
        const values = [];
        let idx = 1;

        if (filter.role) {
          conditions.push(`role = $${idx++}`);
          values.push(filter.role);
        }
        if (filter.email) {
          conditions.push(`LOWER(email) = LOWER($${idx++})`);
          values.push(filter.email);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const res = await pgPool.query(`SELECT * FROM users ${whereClause} ORDER BY created_at DESC`, values);
        return res.rows.map(mapUser);
      }

      return localStore.data.users.filter(u => {
        for (const [k, v] of Object.entries(filter)) {
          if (u[k] !== v) return false;
        }
        return true;
      });
    },

    findById: async (id) => {
      if (db.isPostgres) {
        const res = await pgPool.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
        return res.rows[0] ? mapUser(res.rows[0]) : null;
      }
      return localStore.data.users.find(u => u.id === id || u._id === id) || null;
    },

    findOne: async (filter = {}) => {
      if (db.isPostgres) {
        const conditions = [];
        const values = [];
        let idx = 1;

        if (filter.email) {
          conditions.push(`LOWER(email) = LOWER($${idx++})`);
          values.push(filter.email);
        }
        if (filter.role) {
          conditions.push(`role = $${idx++}`);
          values.push(filter.role);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const res = await pgPool.query(`SELECT * FROM users ${whereClause} LIMIT 1`, values);
        return res.rows[0] ? mapUser(res.rows[0]) : null;
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
      const id = data.id || "user-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
      const role = data.role || "patient";

      if (db.isPostgres) {
        if (role === "admin") {
          const res = await pgPool.query(
            "INSERT INTO admins (id, email, password, name, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, password, name, phone, 'admin' AS role, created_at",
            [id, data.email.toLowerCase(), data.password, data.name, data.phone || ""]
          );
          return mapUser(res.rows[0]);
        } else if (role === "doctor") {
          const spec = data.specialty || data.specialtyName || "General Practice";
          const res = await pgPool.query(
            "INSERT INTO doctors (id, email, password, name, phone, nic, specialty) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, password, name, phone, nic, specialty, 'doctor' AS role, created_at",
            [
              id,
              data.email.toLowerCase(),
              data.password,
              data.name,
              data.phone || "",
              data.nic || "",
              spec
            ]
          );
          return mapUser(res.rows[0]);
        } else {
          // Patient
          const res = await pgPool.query(
            "INSERT INTO patients (id, email, password, name, phone, nic, dob, address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email, password, name, phone, nic, dob, address, 'patient' AS role, created_at",
            [
              id,
              data.email.toLowerCase(),
              data.password,
              data.name,
              data.phone || "",
              data.nic || "",
              data.dob || "",
              data.address || ""
            ]
          );
          return mapUser(res.rows[0]);
        }
      }

      const newItem = {
        id,
        createdAt: new Date().toISOString(),
        ...data
      };
      localStore.data.users.push(newItem);
      localStore.save();
      return newItem;
    },

    findByIdAndUpdate: async (id, updates) => {
      if (db.isPostgres) {
        const existing = await db.users.findById(id);
        if (!existing) return null;

        const role = existing.role;
        const targetTable = role === "admin" ? "admins" : role === "doctor" ? "doctors" : "patients";

        const fields = [];
        const values = [];
        let idx = 1;

        if (updates.name !== undefined) {
          fields.push(`name = $${idx++}`);
          values.push(updates.name);
        }
        if (updates.password !== undefined) {
          fields.push(`password = $${idx++}`);
          values.push(updates.password);
        }
        if (updates.phone !== undefined) {
          fields.push(`phone = $${idx++}`);
          values.push(updates.phone);
        }
        if (role === "doctor") {
          if (updates.nic !== undefined) {
            fields.push(`nic = $${idx++}`);
            values.push(updates.nic);
          }
          if (updates.specialty !== undefined || updates.specialtyName !== undefined) {
            fields.push(`specialty = $${idx++}`);
            values.push(updates.specialty || updates.specialtyName);
          }
        }
        if (role === "patient") {
          if (updates.nic !== undefined) {
            fields.push(`nic = $${idx++}`);
            values.push(updates.nic);
          }
          if (updates.dob !== undefined) {
            fields.push(`dob = $${idx++}`);
            values.push(updates.dob);
          }
          if (updates.address !== undefined) {
            fields.push(`address = $${idx++}`);
            values.push(updates.address);
          }
        }

        if (fields.length === 0) return existing;

        values.push(id);
        const query = `UPDATE ${targetTable} SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`;
        await pgPool.query(query, values);
        return await db.users.findById(id);
      }

      const idx = localStore.data.users.findIndex(u => u.id === id || u._id === id);
      if (idx === -1) return null;
      localStore.data.users[idx] = { ...localStore.data.users[idx], ...updates };
      localStore.save();
      return localStore.data.users[idx];
    },

    findByIdAndDelete: async (id) => {
      if (db.isPostgres) {
        const existing = await db.users.findById(id);
        if (!existing) return null;

        const role = existing.role;
        const targetTable = role === "admin" ? "admins" : role === "doctor" ? "doctors" : "patients";
        await pgPool.query(`DELETE FROM ${targetTable} WHERE id = $1`, [id]);
        return existing;
      }
      const idx = localStore.data.users.findIndex(u => u.id === id || u._id === id);
      if (idx === -1) return null;
      const [removed] = localStore.data.users.splice(idx, 1);
      localStore.save();
      return removed;
    }
  },

  // Specialties Catalog (Served from in-memory standard catalog with zero SQL table overhead)
  specialties: {
    find: async () => {
      return [...initialSpecialties].sort((a, b) => a.sname.localeCompare(b.sname));
    },
    findById: async (id) => {
      return initialSpecialties.find(s => s.id === Number(id)) || null;
    }
  },

  schedules: {
    find: async (filter = {}) => {
      if (db.isPostgres) {
        const conditions = [];
        const values = [];
        let idx = 1;

        if (filter.docId) {
          conditions.push(`doc_id = $${idx++}`);
          values.push(filter.docId);
        }
        if (filter.sessionDate) {
          conditions.push(`session_date = $${idx++}`);
          values.push(filter.sessionDate);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const res = await pgPool.query(
          `SELECT * FROM schedules ${whereClause} ORDER BY session_date ASC, session_time ASC`,
          values
        );
        return res.rows.map(mapSchedule);
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
      if (db.isPostgres) {
        const res = await pgPool.query("SELECT * FROM schedules WHERE id = $1 LIMIT 1", [id]);
        return res.rows[0] ? mapSchedule(res.rows[0]) : null;
      }
      return localStore.data.schedules.find(s => s.id === id || s._id === id) || null;
    },

    create: async (data) => {
      const id = data.id || "sched-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
      if (db.isPostgres) {
        const query = `
          INSERT INTO schedules (id, doc_id, doc_name, specialty_name, title, session_date, session_time, max_appointments, booked_count)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
          RETURNING *
        `;
        const values = [
          id,
          data.docId,
          data.docName || "",
          data.specialtyName || data.specialty || "",
          data.title,
          data.sessionDate,
          data.sessionTime,
          data.maxAppointments || 20
        ];
        const res = await pgPool.query(query, values);
        return mapSchedule(res.rows[0]);
      }

      const newItem = {
        id,
        bookedCount: 0,
        createdAt: new Date().toISOString(),
        ...data
      };
      localStore.data.schedules.push(newItem);
      localStore.save();
      return newItem;
    },

    findByIdAndUpdate: async (id, updates) => {
      if (db.isPostgres) {
        const fields = [];
        const values = [];
        let idx = 1;

        if (updates.bookedCount !== undefined) {
          fields.push(`booked_count = $${idx++}`);
          values.push(updates.bookedCount);
        }
        if (updates.title !== undefined) {
          fields.push(`title = $${idx++}`);
          values.push(updates.title);
        }
        if (updates.sessionDate !== undefined) {
          fields.push(`session_date = $${idx++}`);
          values.push(updates.sessionDate);
        }
        if (updates.sessionTime !== undefined) {
          fields.push(`session_time = $${idx++}`);
          values.push(updates.sessionTime);
        }
        if (updates.maxAppointments !== undefined) {
          fields.push(`max_appointments = $${idx++}`);
          values.push(updates.maxAppointments);
        }

        if (fields.length === 0) return await db.schedules.findById(id);

        values.push(id);
        const query = `UPDATE schedules SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`;
        const res = await pgPool.query(query, values);
        return res.rows[0] ? mapSchedule(res.rows[0]) : null;
      }

      const idx = localStore.data.schedules.findIndex(s => s.id === id || s._id === id);
      if (idx === -1) return null;
      localStore.data.schedules[idx] = { ...localStore.data.schedules[idx], ...updates };
      localStore.save();
      return localStore.data.schedules[idx];
    },

    findByIdAndDelete: async (id) => {
      if (db.isPostgres) {
        const res = await pgPool.query("DELETE FROM schedules WHERE id = $1 RETURNING *", [id]);
        return res.rows[0] ? mapSchedule(res.rows[0]) : null;
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
      if (db.isPostgres) {
        let query = JOINED_APPOINTMENT_SQL;
        const conditions = [];
        const values = [];
        let idx = 1;

        if (filter.docId) {
          conditions.push(`s.doc_id = $${idx++}`);
          values.push(filter.docId);
        }
        if (filter.patientId) {
          conditions.push(`a.patient_id = $${idx++}`);
          values.push(filter.patientId);
        }
        if (filter.scheduleId) {
          conditions.push(`a.schedule_id = $${idx++}`);
          values.push(filter.scheduleId);
        }
        if (filter.status) {
          conditions.push(`a.status = $${idx++}`);
          values.push(filter.status);
        }

        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(" AND ")}`;
        }
        query += ` ORDER BY s.session_date DESC, a.appointment_number ASC`;

        const res = await pgPool.query(query, values);
        return res.rows.map(mapAppointment);
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
      if (db.isPostgres) {
        const query = `${JOINED_APPOINTMENT_SQL} WHERE a.id = $1 LIMIT 1`;
        const res = await pgPool.query(query, [id]);
        return res.rows[0] ? mapAppointment(res.rows[0]) : null;
      }
      return localStore.data.appointments.find(a => a.id === id || a._id === id) || null;
    },

    create: async (data) => {
      const id = data.id || "appo-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
      if (db.isPostgres) {
        const query = `
          INSERT INTO appointments (id, schedule_id, patient_id, appointment_number, status)
          VALUES ($1, $2, $3, $4, $5)
        `;
        const values = [
          id,
          data.scheduleId,
          data.patientId,
          data.appointmentNumber,
          data.status || "confirmed"
        ];
        await pgPool.query(query, values);
        return await db.appointments.findById(id);
      }

      const newItem = {
        id,
        status: "confirmed",
        createdAt: new Date().toISOString(),
        ...data
      };
      localStore.data.appointments.push(newItem);
      localStore.save();
      return newItem;
    },

    findByIdAndUpdate: async (id, updates) => {
      if (db.isPostgres) {
        const fields = [];
        const values = [];
        let idx = 1;

        if (updates.status !== undefined) {
          fields.push(`status = $${idx++}`);
          values.push(updates.status);
        }

        if (fields.length === 0) return await db.appointments.findById(id);

        values.push(id);
        const query = `UPDATE appointments SET ${fields.join(", ")} WHERE id = $${idx}`;
        await pgPool.query(query, values);
        return await db.appointments.findById(id);
      }

      const idx = localStore.data.appointments.findIndex(a => a.id === id || a._id === id);
      if (idx === -1) return null;
      localStore.data.appointments[idx] = { ...localStore.data.appointments[idx], ...updates };
      localStore.save();
      return localStore.data.appointments[idx];
    },

    findByIdAndDelete: async (id) => {
      if (db.isPostgres) {
        const existing = await db.appointments.findById(id);
        await pgPool.query("DELETE FROM appointments WHERE id = $1", [id]);
        return existing;
      }
      const idx = localStore.data.appointments.findIndex(a => a.id === id || a._id === id);
      if (idx === -1) return null;
      const [removed] = localStore.data.appointments.splice(idx, 1);
      localStore.save();
      return removed;
    },

    // True Atomic Booking Transaction with PostgreSQL Row Locking (FOR UPDATE)
    bookAtomic: async (scheduleId, user) => {
      const client = await pgPool.connect();
      try {
        await client.query("BEGIN");

        const schedRes = await client.query(
          "SELECT * FROM schedules WHERE id = $1 FOR UPDATE",
          [scheduleId]
        );

        if (schedRes.rows.length === 0) {
          throw new Error("Selected session does not exist");
        }

        const schedule = mapSchedule(schedRes.rows[0]);
        const patientId = user.id || user._id;

        const existingRes = await client.query(
          "SELECT id, appointment_number FROM appointments WHERE schedule_id = $1 AND patient_id = $2 AND status = 'confirmed' LIMIT 1",
          [scheduleId, patientId]
        );

        if (existingRes.rows.length > 0) {
          throw new Error(
            `You have already booked an appointment for this session (Appointment #${existingRes.rows[0].appointment_number})`
          );
        }

        if (schedule.bookedCount >= schedule.maxAppointments) {
          throw new Error("This session is fully booked");
        }

        const apponum = schedule.bookedCount + 1;

        await client.query(
          "UPDATE schedules SET booked_count = $1 WHERE id = $2",
          [apponum, scheduleId]
        );

        const appoId = "appo-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);

        await client.query(
          `INSERT INTO appointments (id, schedule_id, patient_id, appointment_number, status)
           VALUES ($1, $2, $3, $4, 'confirmed')`,
          [appoId, scheduleId, patientId, apponum]
        );

        await client.query("COMMIT");
        return await db.appointments.findById(appoId);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }
  }
};

// ----------------------------------------------------
// Database Initialization
// ----------------------------------------------------
export async function initDatabase() {
  const connectionString = process.env.DATABASE_URL;
  const pghost = process.env.PGHOST;

  if (!connectionString && !pghost) {
    console.log("ℹ️  Running in Embedded Local JSON Database mode (server/data/store.json).");
    console.log("   To connect PostgreSQL/Supabase, set DATABASE_URL in server/.env");
    return;
  }

  try {
    let pgModule;
    try {
      pgModule = await import("pg");
    } catch (e) {
      console.warn("⚠️  'pg' package is not installed yet in server/node_modules.");
      console.log("   👉 Please run: cd server && npm install");
      console.log("⚡ Gracefully falling back to embedded persistent storage mode (server/data/store.json).");
      return;
    }

    const { Pool } = pgModule.default;

    const poolConfig = connectionString
      ? {
          connectionString,
          ssl: { rejectUnauthorized: false }
        }
      : {
          host: process.env.PGHOST,
          port: Number(process.env.PGPORT) || 5432,
          database: process.env.PGDATABASE || "postgres",
          user: process.env.PGUSER || "postgres",
          password: process.env.PGPASSWORD,
          ssl: { rejectUnauthorized: false }
        };

    console.log(`📡 Connecting to PostgreSQL database...`);
    pgPool = new Pool(poolConfig);

    const ping = await pgPool.query("SELECT NOW()");
    console.log("✅ Successfully connected to PostgreSQL / Supabase! Server time:", ping.rows[0].now);

    // Apply schema tables (admins, doctors, patients, schedules, appointments)
    const schemaFile = path.join(__dirname, "schema.sql");
    if (fs.existsSync(schemaFile)) {
      const schemaSql = fs.readFileSync(schemaFile, "utf-8");
      await pgPool.query(schemaSql);
      console.log("📋 Verified PostgreSQL separate relational tables (admins, doctors [with specialty column], patients, schedules, appointments).");
    }

    db.isPostgres = true;

    // Seed initial data if empty
    const adminCount = await pgPool.query("SELECT COUNT(*) FROM admins");
    const docCount = await pgPool.query("SELECT COUNT(*) FROM doctors");
    const patCount = await pgPool.query("SELECT COUNT(*) FROM patients");

    if (Number(adminCount.rows[0].count) === 0 && Number(docCount.rows[0].count) === 0 && Number(patCount.rows[0].count) === 0) {
      console.log("🌱 Seeding initial PostgreSQL data into dedicated tables...");

      for (const u of initialUsers) {
        await db.users.create(u);
      }
      for (const sc of initialSchedules) {
        await db.schedules.create(sc);
      }
      for (const a of initialAppointments) {
        await db.appointments.create(a);
      }

      console.log("🌱 Seeding complete! All separate tables populated.");
    }
  } catch (err) {
    console.warn("⚠️  PostgreSQL connection failed (" + err.message + ")");
    console.log("⚡ Seamlessly falling back to embedded persistent storage mode (server/data/store.json).");
    db.isPostgres = false;
  }
}
