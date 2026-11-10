import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import LandingPage from "./components/LandingPage";
import AuthModal from "./components/AuthModal";
import AdminDashboard from "./components/admin/AdminDashboard";
import DoctorDashboard from "./components/doctor/DoctorDashboard";
import PatientDashboard from "./components/patient/PatientDashboard";
import "./App.css";

function MainContent() {
  const { user, loading } = useAuth();
  const [authModal, setAuthModal] = useState(null); // 'login' | 'register' | null

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "14px",
          color: "#0284c7"
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            border: "4px solid #e0f2fe",
            borderTopColor: "#0284c7",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite"
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
          Initializing Medflow System...
        </span>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar onOpenAuth={(mode) => setAuthModal(mode)} />

      {!user ? (
        <LandingPage onOpenAuth={(mode) => setAuthModal(mode)} />
      ) : user.role === "admin" ? (
        <AdminDashboard />
      ) : user.role === "doctor" ? (
        <DoctorDashboard />
      ) : (
        <PatientDashboard />
      )}

      {authModal && (
        <AuthModal
          initialMode={authModal}
          onClose={() => setAuthModal(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
