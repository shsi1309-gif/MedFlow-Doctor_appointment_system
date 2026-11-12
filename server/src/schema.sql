-- =============================================================================
-- Medflow Doctor Appointment System — Normalized Relational PostgreSQL Schema
-- Separate Dedicated Tables: admins, doctors (with specialty column), patients, schedules, appointments
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Separate Dedicated Table: Admins
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
-- 2. Separate Dedicated Table: Doctors (with embedded specialty column)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctors (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(64) DEFAULT '',
    nic VARCHAR(64) DEFAULT '',
    specialty VARCHAR(255) NOT NULL DEFAULT 'General Practice',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure specialty column exists if doctors table was created previously
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS specialty VARCHAR(255) DEFAULT 'General Practice';

-- Drop legacy specialty_id and specialty_name columns from doctors
ALTER TABLE doctors DROP COLUMN IF EXISTS specialty_id CASCADE;
ALTER TABLE doctors DROP COLUMN IF EXISTS specialty_name CASCADE;

-- Drop legacy specialty_id foreign key constraint and specialties table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'doctors_specialty_id_fkey'
  ) THEN
    ALTER TABLE doctors DROP CONSTRAINT doctors_specialty_id_fkey;
  END IF;
END $$;

DROP TABLE IF EXISTS specialties CASCADE;

CREATE INDEX IF NOT EXISTS idx_doctors_email ON doctors (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors (specialty);

-- -----------------------------------------------------------------------------
-- 3. Separate Dedicated Table: Patients
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
-- 4. Schedules (Clinical Sessions) — References doctors(id)
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
-- 5. Appointments (Normalized 6-Column Core Table)
-- References schedules(id) and patients(id); doctor info resolved via schedules.doc_id
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  -- If appointments table has legacy denormalized columns, drop and recreate cleanly
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'doc_name'
  ) THEN
    DROP TABLE appointments CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(64) PRIMARY KEY,
    schedule_id VARCHAR(64) NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_number INT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Concurrency Guard: Enforce strict uniqueness of consultation token per session
    CONSTRAINT uq_schedule_appointment_token UNIQUE (schedule_id, appointment_number)
);

CREATE INDEX IF NOT EXISTS idx_appointments_schedule ON appointments (schedule_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments (patient_id);

-- -----------------------------------------------------------------------------
-- 6. Unified Auth View: Combines admins, doctors, and patients
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS users CASCADE;

CREATE OR REPLACE VIEW users AS
  SELECT id, email, password, 'admin' AS role, name, phone, '' AS nic, '' AS dob, '' AS address, '' AS specialty_name, '' AS specialty, created_at FROM admins
  UNION ALL
  SELECT id, email, password, 'doctor' AS role, name, phone, nic, '' AS dob, '' AS address, specialty AS specialty_name, specialty, created_at FROM doctors
  UNION ALL
  SELECT id, email, password, 'patient' AS role, name, phone, nic, dob, address, '' AS specialty_name, '' AS specialty, created_at FROM patients;
