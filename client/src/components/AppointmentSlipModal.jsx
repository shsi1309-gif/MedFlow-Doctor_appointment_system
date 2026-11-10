import React from "react";
import { X, Printer, CheckCircle, Calendar, Clock, User, Stethoscope, Hash } from "lucide-react";

export default function AppointmentSlipModal({ appointment, onClose }) {
  if (!appointment) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card print-slip-card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: "500px" }}
      >
        <div className="modal-header no-print">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle color="#10b981" size={20} />
            <h3 style={{ fontSize: "1.1rem" }}>Appointment Slip</h3>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body printable-slip-content">
          <div className="slip-brand">
            <span className="slip-title">Medflow Medical Channeling</span>
            <span className="slip-sub">Official Patient Appointment Pass</span>
          </div>

          <div className="slip-token-box">
            <span className="token-label">APPOINTMENT TOKEN</span>
            <span className="token-number">
              #{String(appointment.appointmentNumber).padStart(2, "0")}
            </span>
            <span className="token-badge">Confirmed Booking</span>
          </div>

          <div className="slip-details-grid">
            <div className="slip-detail-row">
              <span className="slip-detail-label">
                <Stethoscope size={15} /> Doctor
              </span>
              <span className="slip-detail-value">{appointment.docName}</span>
            </div>

            <div className="slip-detail-row">
              <span className="slip-detail-label">
                <Calendar size={15} /> Session Date
              </span>
              <span className="slip-detail-value">{appointment.sessionDate}</span>
            </div>

            <div className="slip-detail-row">
              <span className="slip-detail-label">
                <Clock size={15} /> Session Time
              </span>
              <span className="slip-detail-value">{appointment.sessionTime}</span>
            </div>

            <div className="slip-detail-row">
              <span className="slip-detail-label">
                <User size={15} /> Patient Name
              </span>
              <span className="slip-detail-value">{appointment.patientName}</span>
            </div>

            {appointment.patientPhone && (
              <div className="slip-detail-row">
                <span className="slip-detail-label">Patient Contact</span>
                <span className="slip-detail-value">{appointment.patientPhone}</span>
              </div>
            )}

            <div className="slip-detail-row">
              <span className="slip-detail-label">
                <Hash size={15} /> Reference ID
              </span>
              <span className="slip-detail-value code-font">
                {appointment.id || appointment._id}
              </span>
            </div>
          </div>

          <div className="slip-notice">
            <p>
              ⚠️ Please arrive at least <strong>15 minutes</strong> prior to the scheduled session.
              Present this digital or printed pass at the clinic reception desk.
            </p>
          </div>
        </div>

        <div className="modal-footer no-print">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} /> Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
