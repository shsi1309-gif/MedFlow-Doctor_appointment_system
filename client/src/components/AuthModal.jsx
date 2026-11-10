import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Shield,
  Stethoscope,
  UserCheck,
  ArrowLeft,
  ChevronRight,
  AlertCircle
} from "lucide-react";

export default function AuthModal({ initialMode = "login", onClose }) {
  // mode: "login-select" | "login-form" | "register"
  const [view, setView] = useState(
    initialMode === "register" ? "register" : "login-select"
  );
  const [selectedRole, setSelectedRole] = useState(null); // 'doctor' | 'admin' | 'patient'
  const [specialties, setSpecialties] = useState([]);

  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Login credentials
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register credentials
  const [regRole, setRegRole] = useState("patient");
  const [regData, setRegData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    nic: "",
    dob: "",
    address: "",
    specialtyId: 1
  });

  useEffect(() => {
    api.getSpecialties()
      .then(data => setSpecialties(data))
      .catch(() => {});
  }, []);

  const handleSelectLoginRole = (role) => {
    setSelectedRole(role);
    setErrorMessage("");
    setLoginEmail("");
    setLoginPassword("");
    setView("login-form");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      await login(loginEmail, loginPassword, selectedRole);
      onClose();
    } catch (err) {
      setErrorMessage(
        err.message || "Login failed: Account does not exist or credentials are incorrect."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      await register({
        ...regData,
        role: regRole
      });
      onClose();
    } catch (err) {
      setErrorMessage(
        err.message || "Registration failed. Please verify your details."
      );
    } finally {
      setLoading(false);
    }
  };

  const getRoleTitle = (role) => {
    if (role === "admin") return "Administrator";
    if (role === "doctor") return "Doctor";
    return "Patient";
  };

  const getRoleIcon = (role, size = 20) => {
    if (role === "admin") return <Shield size={size} />;
    if (role === "doctor") return <Stethoscope size={size} />;
    return <UserCheck size={size} />;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {view === "login-form" && (
              <button
                type="button"
                className="btn-icon"
                title="Back to portal options"
                onClick={() => {
                  setView("login-select");
                  setErrorMessage("");
                }}
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>
              {view === "login-select"
                ? "Select Login Portal"
                : view === "login-form"
                ? `Login as ${getRoleTitle(selectedRole)}`
                : "Create an Account"}
            </h3>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {errorMessage && (
            <div className="auth-error-banner" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={18} flexShrink={0} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* VIEW 1: ROLE SELECTION FOR LOGIN */}
          {view === "login-select" && (
            <div className="role-selection-wrapper">
              <p className="sub-text" style={{ marginBottom: "20px" }}>
                Welcome to Medflow. Choose your account type to proceed to your login dashboard:
              </p>

              <div className="role-options-list">
                {/* Option 1: Login as Doctor */}
                <div
                  className="role-option-card doctor-role-card"
                  onClick={() => handleSelectLoginRole("doctor")}
                >
                  <div className="role-card-left">
                    <div className="role-card-avatar doctor-avatar-bg">
                      <Stethoscope size={24} color="#0d9488" />
                    </div>
                    <div className="role-card-text">
                      <h4>Login as Doctor</h4>
                      <p>View patient queue, manage clinic sessions, and appointments</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="role-card-arrow" />
                </div>

                {/* Option 2: Login as Administrator */}
                <div
                  className="role-option-card admin-role-card"
                  onClick={() => handleSelectLoginRole("admin")}
                >
                  <div className="role-card-left">
                    <div className="role-card-avatar admin-avatar-bg">
                      <Shield size={24} color="#0284c7" />
                    </div>
                    <div className="role-card-text">
                      <h4>Login as Administrator</h4>
                      <p>Hospital records, doctor registry, scheduling & system controls</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="role-card-arrow" />
                </div>

                {/* Option 3: Login as Patient */}
                <div
                  className="role-option-card patient-role-card"
                  onClick={() => handleSelectLoginRole("patient")}
                >
                  <div className="role-card-left">
                    <div className="role-card-avatar patient-avatar-bg">
                      <UserCheck size={24} color="#6366f1" />
                    </div>
                    <div className="role-card-text">
                      <h4>Login as Patient</h4>
                      <p>Find specialist doctors, book consultation slots & get tokens</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="role-card-arrow" />
                </div>
              </div>

              <div className="auth-footer-prompt">
                <span>Don't have an account yet?</span>{" "}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setView("register");
                    setErrorMessage("");
                  }}
                >
                  Create an account / Sign Up
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: ROLE-SPECIFIC LOGIN FORM */}
          {view === "login-form" && (
            <div>
              <div className="role-login-banner">
                <div className={`role-badge-tag role-badge-${selectedRole}`}>
                  {getRoleIcon(selectedRole, 16)}
                  <span>{getRoleTitle(selectedRole).toUpperCase()} PORTAL</span>
                </div>
                <p className="sub-text">
                  Enter your credentials below to access your {getRoleTitle(selectedRole)} dashboard.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit}>
                <div className="form-group">
                  <label className="form-label">Username / Email *</label>
                  <div className="input-with-icon">
                    <Mail size={16} className="input-icon" />
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Enter ${getRoleTitle(selectedRole).toLowerCase()} email or username`}
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <div className="input-with-icon">
                    <Lock size={16} className="input-icon" />
                    <input
                      type="password"
                      className="form-control"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: "10px", padding: "12px" }}
                  disabled={loading}
                >
                  {loading ? "Verifying Credentials..." : `Sign In as ${getRoleTitle(selectedRole)}`}
                </button>
              </form>

              {/* Bottom option to Create an Account */}
              <div className="auth-footer-prompt">
                <span>Don't have an account?</span>{" "}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setRegRole(selectedRole || "patient");
                    setView("register");
                    setErrorMessage("");
                  }}
                >
                  Create an account
                </button>
              </div>
            </div>
          )}

          {/* VIEW 3: SIGN UP / CREATE ACCOUNT */}
          {view === "register" && (
            <div>
              <div className="form-group">
                <label className="form-label">Register As</label>
                <div className="role-signup-selector">
                  <button
                    type="button"
                    className={`role-choice-pill ${regRole === "patient" ? "active" : ""}`}
                    onClick={() => setRegRole("patient")}
                  >
                    <UserCheck size={14} /> Patient
                  </button>
                  <button
                    type="button"
                    className={`role-choice-pill ${regRole === "doctor" ? "active" : ""}`}
                    onClick={() => setRegRole("doctor")}
                  >
                    <Stethoscope size={14} /> Doctor
                  </button>
                  <button
                    type="button"
                    className={`role-choice-pill ${regRole === "admin" ? "active" : ""}`}
                    onClick={() => setRegRole("admin")}
                  >
                    <Shield size={14} /> Administrator
                  </button>
                </div>
              </div>

              <form onSubmit={handleRegisterSubmit}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <div className="input-with-icon">
                    <User size={16} className="input-icon" />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. John Doe"
                      value={regData.name}
                      onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid-2-col">
                  <div className="form-group">
                    <label className="form-label">Email / Username *</label>
                    <div className="input-with-icon">
                      <Mail size={16} className="input-icon" />
                      <input
                        type="email"
                        className="form-control"
                        placeholder="user@example.com"
                        value={regData.email}
                        onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <div className="input-with-icon">
                      <Lock size={16} className="input-icon" />
                      <input
                        type="password"
                        className="form-control"
                        placeholder="••••••••"
                        value={regData.password}
                        onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* If Doctor: Specialty selection */}
                {regRole === "doctor" && (
                  <div className="form-group">
                    <label className="form-label">Clinical Specialty *</label>
                    <select
                      className="form-control"
                      value={regData.specialtyId}
                      onChange={(e) =>
                        setRegData({ ...regData, specialtyId: Number(e.target.value) })
                      }
                      required
                    >
                      {specialties.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.sname}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid-2-col">
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <div className="input-with-icon">
                      <Phone size={16} className="input-icon" />
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="0771234567"
                        value={regData.phone}
                        onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">NIC</label>
                    <div className="input-with-icon">
                      <CreditCard size={16} className="input-icon" />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="123456789V"
                        value={regData.nic}
                        onChange={(e) => setRegData({ ...regData, nic: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {regRole === "patient" && (
                  <div className="grid-2-col">
                    <div className="form-group">
                      <label className="form-label">Date of Birth</label>
                      <div className="input-with-icon">
                        <Calendar size={16} className="input-icon" />
                        <input
                          type="date"
                          className="form-control"
                          value={regData.dob}
                          onChange={(e) => setRegData({ ...regData, dob: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Address</label>
                      <div className="input-with-icon">
                        <MapPin size={16} className="input-icon" />
                        <input
                          type="text"
                          className="form-control"
                          placeholder="City, Country"
                          value={regData.address}
                          onChange={(e) => setRegData({ ...regData, address: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: "12px", padding: "12px" }}
                  disabled={loading}
                >
                  {loading
                    ? "Creating Account..."
                    : `Sign Up as ${getRoleTitle(regRole)}`}
                </button>
              </form>

              {/* Bottom option to Sign In */}
              <div className="auth-footer-prompt">
                <span>Already have an account?</span>{" "}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setView("login-select");
                    setErrorMessage("");
                  }}
                >
                  Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
