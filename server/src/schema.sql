-- =============================================================================
-- Medflow Doctor Appointment System — Normalized Relational PostgreSQL Schema
-- Separate Dedicated Tables: specialties, admins, doctors (with specialty_id FK),
-- patients, schedules, appointments (6 columns)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Specialties Catalog Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS specialties (
    id INT PRIMARY KEY,
    sname VARCHAR(255) NOT NULL UNIQUE
);

-- -----------------------------------------------------------------------------
-- 2. Separate Dedicated Table: Admins
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(64) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins (LOWER(email));

-- -----------------------------------------------------------------------------
-- 3. Separate Dedicated Table: Doctors (references specialties(id) via specialty_id)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctors (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(64) DEFAULT '',
    nic VARCHAR(64) DEFAULT '',
    specialty_id INT REFERENCES specialties(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migration helpers if table already exists
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS specialty_id INT REFERENCES specialties(id) ON DELETE SET NULL;
ALTER TABLE doctors DROP COLUMN IF EXISTS specialty CASCADE;
ALTER TABLE doctors DROP COLUMN IF EXISTS specialty_name CASCADE;

CREATE INDEX IF NOT EXISTS idx_doctors_email ON doctors (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_doctors_specialty_id ON doctors (specialty_id);

-- -----------------------------------------------------------------------------
-- 4. Separate Dedicated Table: Patients
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(64) DEFAULT '',
    nic VARCHAR(64) DEFAULT '',
    dob VARCHAR(64) DEFAULT '',
    address TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_email ON patients (LOWER(email));

-- -----------------------------------------------------------------------------
-- 5. Schedules (Clinical Sessions) — References doctors(id)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedules (
    id VARCHAR(64) PRIMARY KEY,
    doc_id VARCHAR(64) NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    doc_name VARCHAR(255),
    specialty_name VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    session_date VARCHAR(32) NOT NULL,
    session_time VARCHAR(32) NOT NULL,
    max_appointments INT NOT NULL DEFAULT 20,
    booked_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_schedule_capacity CHECK (booked_count >= 0 AND booked_count <= max_appointments)
);

CREATE INDEX IF NOT EXISTS idx_schedules_doc ON schedules (doc_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules (session_date);

-- -----------------------------------------------------------------------------
-- 6. Appointments (Normalized 6-Column Core Table)
-- References schedules(id) and patients(id)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(64) PRIMARY KEY,
    schedule_id VARCHAR(64) NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_number INT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_schedule_appointment_token UNIQUE (schedule_id, appointment_number)
);

CREATE INDEX IF NOT EXISTS idx_appointments_schedule ON appointments (schedule_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments (patient_id);

-- -----------------------------------------------------------------------------
-- 7. Unified Auth View: Combines admins, doctors, and patients
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS users CASCADE;

CREATE OR REPLACE VIEW users AS
  SELECT id, email, password, 'admin' AS role, name, phone, '' AS nic, '' AS dob, '' AS address, NULL::INT AS specialty_id, '' AS specialty_name, '' AS specialty, created_at FROM admins
  UNION ALL
  SELECT d.id, d.email, d.password, 'doctor' AS role, d.name, d.phone, d.nic, '' AS dob, '' AS address, d.specialty_id, COALESCE(s.sname, '') AS specialty_name, COALESCE(s.sname, '') AS specialty, d.created_at 
  FROM doctors d 
  LEFT JOIN specialties s ON d.specialty_id = s.id
  UNION ALL
  SELECT id, email, password, 'patient' AS role, name, phone, nic, dob, address, NULL::INT AS specialty_id, '' AS specialty_name, '' AS specialty, created_at FROM patients;
