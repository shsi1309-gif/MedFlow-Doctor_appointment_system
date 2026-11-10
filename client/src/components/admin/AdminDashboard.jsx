import React, { useState, useEffect } from "react";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import {
  Users,
  Stethoscope,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit,
  Search,
  CheckCircle,
  FileText,
  AlertCircle,
  Shield,
  Activity,
  Layers
} from "lucide-react";

export default function AdminDashboard() {
  const { showToast } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [docSearch, setDocSearch] = useState("");
  const [docSpecialtyFilter, setDocSpecialtyFilter] = useState("");
  const [schedFilterDoc, setSchedFilterDoc] = useState("");
  const [patientSearch, setPatientSearch] = useState("");

  // Modals
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [viewingPatient, setViewingPatient] = useState(null);

  // New Doctor Form State
  const [newDoctor, setNewDoctor] = useState({
    name: "",
    email: "",
    password: "",
    nic: "",
    phone: "",
    specialtyId: 1
  });

  // New Session Form State
  const [newSession, setNewSession] = useState({
    docId: "",
    title: "",
    sessionDate: "",
    sessionTime: "09:00",
    maxAppointments: 20
  });

  // Load All Data
  const loadData = async () => {
    try {
      const [sData, dData, specData, schedData, apptData, patData] = await Promise.all([
        api.getStats(),
        api.getDoctors(),
        api.getSpecialties(),
        api.getSchedules(),
        api.getAppointments(),
        api.getPatients()
      ]);
      setStats(sData);
      setDoctors(dData);
      setSpecialties(specData);
      setSchedules(schedData);
      setAppointments(apptData);
      setPatients(patData);
      if (dData.length > 0 && !newSession.docId) {
        setNewSession(prev => ({ ...prev, docId: dData[0].id }));
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers for Doctor
  const handleAddDoctor = async (e) => {
    e.preventDefault();
    try {
      await api.createDoctor(newDoctor);
      showToast("Doctor added successfully!");
      setShowAddDoctorModal(false);
      setNewDoctor({
        name: "",
        email: "",
        password: "",
        nic: "",
        phone: "",
        specialtyId: 1
      });
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleUpdateDoctor = async (e) => {
    e.preventDefault();
    try {
      await api.updateDoctor(editingDoctor.id, editingDoctor);
      showToast("Doctor updated successfully!");
      setEditingDoctor(null);
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteDoctor = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await api.deleteDoctor(id);
      showToast("Doctor deleted");
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Handlers for Session
  const handleAddSession = async (e) => {
    e.preventDefault();
    try {
      await api.createSchedule(newSession);
      showToast("Clinical session scheduled!");
      setShowAddSessionModal(false);
      setNewSession({
        docId: doctors[0]?.id || "",
        title: "",
        sessionDate: "",
        sessionTime: "09:00",
        maxAppointments: 20
      });
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm("Cancel and delete this consultation session?")) return;
    try {
      await api.deleteSchedule(id);
      showToast("Session deleted");
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Handlers for Appointment
  const handleCancelAppointment = async (id) => {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await api.cancelAppointment(id);
      showToast("Appointment cancelled");
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Filtered lists
  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch =
      doc.name?.toLowerCase().includes(docSearch.toLowerCase()) ||
      doc.email?.toLowerCase().includes(docSearch.toLowerCase());
    const matchesSpec = docSpecialtyFilter
      ? String(doc.specialtyId) === String(docSpecialtyFilter)
      : true;
    return matchesSearch && matchesSpec;
  });

  const filteredSchedules = schedules.filter(s => {
    if (schedFilterDoc && s.docId !== schedFilterDoc) return false;
    return true;
  });

  const filteredPatients = patients.filter(p => {
    return (
      p.name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.email?.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.nic?.toLowerCase().includes(patientSearch.toLowerCase())
    );
  });

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-role-indicator">
            <Shield size={16} color="#0284c7" />
            <span>Administrator Control</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          <button
            type="button"
            className={`nav-tab-link ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <Activity size={18} />
            <span>Dashboard Overview</span>
          </button>

          <button
            type="button"
            className={`nav-tab-link ${activeTab === "doctors" ? "active" : ""}`}
            onClick={() => setActiveTab("doctors")}
          >
            <Stethoscope size={18} />
            <span>Doctors</span>
            <span className="tab-count">{doctors.length}</span>
          </button>

          <button
            type="button"
            className={`nav-tab-link ${activeTab === "schedules" ? "active" : ""}`}
            onClick={() => setActiveTab("schedules")}
          >
            <Calendar size={18} />
            <span>Schedules & Sessions</span>
            <span className="tab-count">{schedules.length}</span>
          </button>

          <button
            type="button"
            className={`nav-tab-link ${activeTab === "appointments" ? "active" : ""}`}
            onClick={() => setActiveTab("appointments")}
          >
            <Clock size={18} />
            <span>Appointments</span>
            <span className="tab-count">{appointments.length}</span>
          </button>

          <button
            type="button"
            className={`nav-tab-link ${activeTab === "patients" ? "active" : ""}`}
            onClick={() => setActiveTab("patients")}
          >
            <Users size={18} />
            <span>Patients Directory</span>
            <span className="tab-count">{patients.length}</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "dashboard" && (
          <div className="tab-pane">
            <div className="dashboard-header-bar">
              <div>
                <h2>Hospital System Overview</h2>
                <p className="sub-text">Live statistics and quick operations for Medflow</p>
              </div>

              <div className="header-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowAddDoctorModal(true)}
                >
                  <Plus size={16} /> Add Doctor
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddSessionModal(true)}
                >
                  <Plus size={16} /> Schedule Session
                </button>
              </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="stats-grid">
              <div className="stat-card" onClick={() => setActiveTab("doctors")}>
                <div className="stat-icon-wrapper stat-blue">
                  <Stethoscope size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Total Doctors</span>
                  <span className="stat-number">{stats?.totalDoctors ?? doctors.length}</span>
                  <span className="stat-link">Manage doctors →</span>
                </div>
              </div>

              <div className="stat-card" onClick={() => setActiveTab("patients")}>
                <div className="stat-icon-wrapper stat-teal">
                  <Users size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Total Patients</span>
                  <span className="stat-number">{stats?.totalPatients ?? patients.length}</span>
                  <span className="stat-link">View patient records →</span>
                </div>
              </div>

              <div className="stat-card" onClick={() => setActiveTab("appointments")}>
                <div className="stat-icon-wrapper stat-indigo">
                  <Clock size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Booked Appointments</span>
                  <span className="stat-number">{stats?.totalAppointments ?? appointments.length}</span>
                  <span className="stat-link">View all bookings →</span>
                </div>
              </div>

              <div className="stat-card" onClick={() => setActiveTab("schedules")}>
                <div className="stat-icon-wrapper stat-emerald">
                  <Calendar size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Today's Sessions</span>
                  <span className="stat-number">{stats?.todaySessions ?? 0}</span>
                  <span className="stat-link">Inspect schedules →</span>
                </div>
              </div>
            </div>

            {/* Recent Appointments Preview */}
            <div className="section-card">
              <div className="section-card-header">
                <h3>Recent Appointments</h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveTab("appointments")}
                >
                  View All ({appointments.length})
                </button>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Session Date & Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-cell">
                          No appointments booked yet.
                        </td>
                      </tr>
                    ) : (
                      appointments.slice(0, 5).map((appt) => (
                        <tr key={appt.id || appt._id}>
                          <td>
                            <span className="badge badge-primary">
                              #{appt.appointmentNumber}
                            </span>
                          </td>
                          <td>
                            <strong>{appt.patientName}</strong>
                            <div className="cell-sub">{appt.patientPhone || appt.patientEmail}</div>
                          </td>
                          <td>{appt.docName}</td>
                          <td>
                            {appt.sessionDate} at {appt.sessionTime}
                          </td>
                          <td>
                            <span className="badge badge-success">
                              {appt.status || "Confirmed"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DOCTORS */}
        {activeTab === "doctors" && (
          <div className="tab-pane">
            <div className="dashboard-header-bar">
              <div>
                <h2>Doctor Management</h2>
                <p className="sub-text">Add, edit, or configure specialist doctors</p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAddDoctorModal(true)}
              >
                <Plus size={16} /> Add New Doctor
              </button>
            </div>

            {/* Search & Specialty Filter */}
            <div className="filter-bar">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search doctor by name or email..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="form-control"
                />
              </div>

              <select
                className="form-control filter-select"
                value={docSpecialtyFilter}
                onChange={(e) => setDocSpecialtyFilter(e.target.value)}
              >
                <option value="">All Specialties (56)</option>
                {specialties.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sname}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctors Table */}
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doctor Name</th>
                    <th>Email</th>
                    <th>Specialties</th>
                    <th>Phone / NIC</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-cell">
                        No doctors match the selected search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDoctors.map((doc) => (
                      <tr key={doc.id || doc._id}>
                        <td>
                          <strong>{doc.name}</strong>
                        </td>
                        <td>{doc.email}</td>
                        <td>
                          <span className="badge badge-primary">
                            {doc.specialtyName || "General Practice"}
                          </span>
                        </td>
                        <td>
                          <div>{doc.phone || "—"}</div>
                          <div className="cell-sub">{doc.nic || "—"}</div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn-icon"
                            title="Edit Doctor"
                            onClick={() => setEditingDoctor(doc)}
                            style={{ marginRight: "8px" }}
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            title="Delete Doctor"
                            onClick={() => handleDeleteDoctor(doc.id || doc._id, doc.name)}
                          >
                            <Trash2 size={15} color="#ef4444" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SCHEDULES */}
        {activeTab === "schedules" && (
          <div className="tab-pane">
            <div className="dashboard-header-bar">
              <div>
                <h2>Clinical Schedule & Sessions</h2>
                <p className="sub-text">Create and manage upcoming doctor consultation sessions</p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAddSessionModal(true)}
              >
                <Plus size={16} /> Add Session
              </button>
            </div>

            {/* Filter by Doctor */}
            <div className="filter-bar">
              <select
                className="form-control"
                style={{ maxWidth: "300px" }}
                value={schedFilterDoc}
                onChange={(e) => setSchedFilterDoc(e.target.value)}
              >
                <option value="">All Doctors</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialtyName})
                  </option>
                ))}
              </select>
            </div>

            {/* Schedules Table */}
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Session Title</th>
                    <th>Doctor</th>
                    <th>Scheduled Date</th>
                    <th>Time</th>
                    <th>Max Bookings</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-cell">
                        No scheduled sessions found.
                      </td>
                    </tr>
                  ) : (
                    filteredSchedules.map((sched) => (
                      <tr key={sched.id || sched._id}>
                        <td>
                          <strong>{sched.title}</strong>
                        </td>
                        <td>
                          {sched.docName}
                          <div className="cell-sub">{sched.specialtyName}</div>
                        </td>
                        <td>{sched.sessionDate}</td>
                        <td>{sched.sessionTime}</td>
                        <td>
                          <span className="badge badge-primary">
                            {sched.bookedCount || 0} / {sched.maxAppointments || 20} booked
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn-icon"
                            title="Delete Session"
                            onClick={() => handleDeleteSession(sched.id || sched._id)}
                          >
                            <Trash2 size={15} color="#ef4444" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: APPOINTMENTS */}
        {activeTab === "appointments" && (
          <div className="tab-pane">
            <div className="dashboard-header-bar">
              <div>
                <h2>All Booked Appointments</h2>
                <p className="sub-text">Monitor patient bookings and reservation tokens</p>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Token #</th>
                    <th>Patient Name</th>
                    <th>Doctor</th>
                    <th>Session Title</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-cell">
                        No appointments currently scheduled.
                      </td>
                    </tr>
                  ) : (
                    appointments.map((appt) => (
                      <tr key={appt.id || appt._id}>
                        <td>
                          <span className="badge badge-primary">#{appt.appointmentNumber}</span>
                        </td>
                        <td>
                          <strong>{appt.patientName}</strong>
                          <div className="cell-sub">{appt.patientPhone || appt.patientEmail}</div>
                        </td>
                        <td>{appt.docName}</td>
                        <td>{appt.scheduleTitle || "Consultation"}</td>
                        <td>
                          {appt.sessionDate} at {appt.sessionTime}
                        </td>
                        <td>
                          <span className="badge badge-success">
                            {appt.status || "Confirmed"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleCancelAppointment(appt.id || appt._id)}
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: PATIENTS */}
        {activeTab === "patients" && (
          <div className="tab-pane">
            <div className="dashboard-header-bar">
              <div>
                <h2>Patients Directory</h2>
                <p className="sub-text">All registered patient accounts and records</p>
              </div>
            </div>

            <div className="filter-bar">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search patient by name, email, or NIC..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>NIC</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Date of Birth</th>
                    <th style={{ textAlign: "right" }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-cell">
                        No patients found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((pat) => (
                      <tr key={pat.id || pat._id}>
                        <td>
                          <strong>{pat.name}</strong>
                          <div className="cell-sub">{pat.address || "Sri Lanka"}</div>
                        </td>
                        <td>{pat.nic || "—"}</td>
                        <td>{pat.phone || "—"}</td>
                        <td>{pat.email}</td>
                        <td>{pat.dob || "—"}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setViewingPatient(pat)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: ADD DOCTOR */}
        {showAddDoctorModal && (
          <div className="modal-overlay" onClick={() => setShowAddDoctorModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add New Doctor</h3>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setShowAddDoctorModal(false)}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleAddDoctor}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Doctor Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Dr. Emily Watson"
                      value={newDoctor.name}
                      onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid-2-col">
                    <div className="form-group">
                      <label className="form-label">Email Address *</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="doctor@example.com"
                        value={newDoctor.email}
                        onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Temporary Password *</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="••••••••"
                        value={newDoctor.password}
                        onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid-2-col">
                    <div className="form-group">
                      <label className="form-label">Specialty *</label>
                      <select
                        className="form-control"
                        value={newDoctor.specialtyId}
                        onChange={(e) =>
                          setNewDoctor({ ...newDoctor, specialtyId: Number(e.target.value) })
                        }
                      >
                        {specialties.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.sname}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="0110000000"
                        value={newDoctor.phone}
                        onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">NIC (National Identity Card)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="000000000V"
                      value={newDoctor.nic}
                      onChange={(e) => setNewDoctor({ ...newDoctor, nic: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddDoctorModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Doctor Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EDIT DOCTOR */}
        {editingDoctor && (
          <div className="modal-overlay" onClick={() => setEditingDoctor(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Edit Doctor: {editingDoctor.name}</h3>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setEditingDoctor(null)}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleUpdateDoctor}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingDoctor.name}
                      onChange={(e) =>
                        setEditingDoctor({ ...editingDoctor, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Specialty</label>
                    <select
                      className="form-control"
                      value={editingDoctor.specialtyId || ""}
                      onChange={(e) =>
                        setEditingDoctor({
                          ...editingDoctor,
                          specialtyId: Number(e.target.value)
                        })
                      }
                    >
                      {specialties.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.sname}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid-2-col">
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={editingDoctor.phone || ""}
                        onChange={(e) =>
                          setEditingDoctor({ ...editingDoctor, phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">NIC</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingDoctor.nic || ""}
                        onChange={(e) =>
                          setEditingDoctor({ ...editingDoctor, nic: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditingDoctor(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD SESSION */}
        {showAddSessionModal && (
          <div className="modal-overlay" onClick={() => setShowAddSessionModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Schedule New Consultation Session</h3>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setShowAddSessionModal(false)}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleAddSession}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Doctor *</label>
                    <select
                      className="form-control"
                      value={newSession.docId}
                      onChange={(e) =>
                        setNewSession({ ...newSession, docId: e.target.value })
                      }
                      required
                    >
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.specialtyName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Session Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Evening Cardiology Clinic"
                      value={newSession.title}
                      onChange={(e) =>
                        setNewSession({ ...newSession, title: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="grid-2-col">
                    <div className="form-group">
                      <label className="form-label">Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={newSession.sessionDate}
                        onChange={(e) =>
                          setNewSession({ ...newSession, sessionDate: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Time *</label>
                      <input
                        type="time"
                        className="form-control"
                        value={newSession.sessionTime}
                        onChange={(e) =>
                          setNewSession({ ...newSession, sessionTime: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Max Appointments (NOP)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className="form-control"
                      value={newSession.maxAppointments}
                      onChange={(e) =>
                        setNewSession({
                          ...newSession,
                          maxAppointments: Number(e.target.value)
                        })
                      }
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddSessionModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Session
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: VIEW PATIENT DETAILS */}
        {viewingPatient && (
          <div className="modal-overlay" onClick={() => setViewingPatient(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Patient Details: {viewingPatient.name}</h3>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setViewingPatient(null)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="slip-details-grid">
                  <div className="slip-detail-row">
                    <span className="slip-detail-label">Email:</span>
                    <span className="slip-detail-value">{viewingPatient.email}</span>
                  </div>
                  <div className="slip-detail-row">
                    <span className="slip-detail-label">Phone:</span>
                    <span className="slip-detail-value">{viewingPatient.phone || "—"}</span>
                  </div>
                  <div className="slip-detail-row">
                    <span className="slip-detail-label">NIC:</span>
                    <span className="slip-detail-value">{viewingPatient.nic || "—"}</span>
                  </div>
                  <div className="slip-detail-row">
                    <span className="slip-detail-label">Date of Birth:</span>
                    <span className="slip-detail-value">{viewingPatient.dob || "—"}</span>
                  </div>
                  <div className="slip-detail-row">
                    <span className="slip-detail-label">Address:</span>
                    <span className="slip-detail-value">{viewingPatient.address || "Sri Lanka"}</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setViewingPatient(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
