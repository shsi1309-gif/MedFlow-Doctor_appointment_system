# MedFlow - Modern Doctor Appointment & Healthcare Channeling System (MERN Stack)

A complete modernization of the original PHP/MySQL **eDoc Doctor Appointment System** into a high-performance, full-stack **MERN** application.

---

## 🌟 Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 19 + Vite | Component-driven, responsive UI with Lucide icons |
| **Styling** | Vanilla CSS Design System | Modern palette, glassmorphism, micro-animations, print passes |
| **Backend** | Node.js + Express.js | Modular RESTful API with JWT auth and RBAC |
| **Database** | MongoDB / Mongoose | Dual-mode: Full MongoDB/Mongoose support + embedded persistent JSON engine |

---

## 🚀 Key Features

### 1. 🛡️ Administrator Portal
- **Dashboard Metrics:** Live overview of Total Doctors, Total Patients, Booked Appointments, and Today's Sessions.
- **Doctor Management:** Add, edit, or delete specialist doctors with email, NIC, phone, and medical specialty.
- **Clinical Schedules:** Schedule doctor consultation sessions with customized dates, times, and maximum patient capacities.
- **Appointments Oversight:** Monitor all appointments across all doctors, with instant cancellation options.
- **Patient Directory:** Search and review registered patients and their medical visit histories.

### 2. 🩺 Doctor Practice Suite
- **Doctor Dashboard:** View upcoming consultations, active clinical sessions, and patient counts.
- **Session Scheduling:** Doctors can schedule their own consultation clinics and limit patient intake.
- **Appointment Queue:** Real-time list of queued patients with contact numbers and assigned token numbers.
- **Profile Settings:** Update practice phone numbers, specialties, and account passwords.

### 3. 👥 Patient Portal
- **Doctor Directory:** Search specialists across all 56 medical specialties (Cardiology, Dermatology, Neurology, etc.).
- **Live Session Booking:** Real-time remaining slots indicator with 1-click token reservation.
- **Numbered Consultation Tokens:** Automatic sequential token assignment (Token #1, #2, etc.) to eliminate waiting room chaos.
- **Printable Appointment Passes:** Official digital passes displaying patient info, doctor name, clinic date/time, and print formatting (`window.print()`).
- **Profile & Booking Management:** View active bookings, cancel reservations, and update personal health details.

---

## ⚡ Quick Demo Accounts

You can test any role instantly using the **Quick Switch** bar in the top navigation or log in with these pre-seeded credentials:

| Role | Email | Password |
|---|---|---|
| **Administrator** | `admin@edoc.com` | `123` |
| **Doctor** | `doctor@edoc.com` | `123` |
| **Patient** | `patient@edoc.com` | `123` |
| **Patient 2** | `emhashenudara@gmail.com` | `123` |

---

## 🛠️ Getting Started

### 1. Run with One Command (Root)
```bash
npm run dev
```
This runs both the Express backend and React Vite client concurrently:
- **Frontend App:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:5001](http://localhost:5001)

### 2. Database Modes
The system includes an intelligent dual-mode database layer:
- **Zero-Config Embedded Mode (Default):** Runs immediately without requiring external database services. Persists data to `server/data/store.json`.
- **MongoDB / Atlas Mode:** Open `server/.env` and set:
  ```env
  MONGODB_URI=mongodb://localhost:27017/edoc
  # or MongoDB Atlas URI:
  # MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/edoc
  ```
  The server will automatically connect to MongoDB, setup Mongoose models, and populate initial seeds.

---

## 📁 Directory Structure
```
medflow-mern/
├── package.json          # Root scripts & concurrently config
├── server/
│   ├── src/
│   │   ├── index.js      # Express server & middleware
│   │   ├── db.js         # Mongoose & dual-mode DB adapter
│   │   ├── seeds.js      # 56 specialties & initial user seeds
│   │   ├── middleware/   # JWT authentication & role checking
│   │   └── routes/       # Auth, Doctors, Patients, Schedules, Appointments, Stats
│   ├── data/store.json   # Embedded persistent database storage
│   └── .env              # Server environment variables
└── client/
    ├── src/
    │   ├── api.js        # API client and endpoints
    │   ├── App.jsx       # Main App component & router
    │   ├── App.css       # Layouts, stat cards, dashboards, print CSS
    │   ├── index.css     # Design system, tokens, and utilities
    │   ├── context/      # AuthContext with demo role switcher
    │   └── components/   # Navbar, LandingPage, AuthModal, SlipModal, Dashboards
    └── vite.config.js    # Vite configuration with proxy to port 5001
```
