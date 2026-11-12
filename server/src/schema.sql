-- =============================================================================
-- Medflow Doctor Appointment System — Production PostgreSQL Relational Schema
-- =============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Specialties Catalog (56 Standard Clinical Specialties)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS specialties (
    id INT PRIMARY KEY,
    sname VARCHAR(255) NOT NULL UNIQUE
);

-- -----------------------------------------------------------------------------
-- 2. Users (Admin, Doctor, Patient)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('admin', 'doctor', 'patient')),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(64) DEFAULT '',
    nic VARCHAR(64) DEFAULT '',
    dob VARCHAR(64) DEFAULT '',
    address TEXT DEFAULT '',
    specialty_id INT REFERENCES specialties(id) ON DELETE SET NULL,
    specialty_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- -----------------------------------------------------------------------------
-- 3. Doctor Consultation Schedules (Clinical Sessions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedules (
    id VARCHAR(64) PRIMARY KEY,
    doc_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
-- 4. Appointments & Sequential Tokens
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(64) PRIMARY KEY,
    schedule_id VARCHAR(64) NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    schedule_title VARCHAR(255),
    doc_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doc_name VARCHAR(255),
    patient_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_name VARCHAR(255),
    patient_email VARCHAR(255),
    patient_phone VARCHAR(64),
    appointment_number INT NOT NULL,
    appointment_date VARCHAR(32) NOT NULL,
    session_date VARCHAR(32) NOT NULL,
    session_time VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Concurrency Guard: Enforce strict uniqueness of consultation token per session
    CONSTRAINT uq_schedule_appointment_token UNIQUE (schedule_id, appointment_number)
);

CREATE INDEX IF NOT EXISTS idx_appointments_schedule ON appointments (schedule_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doc ON appointments (doc_id);

