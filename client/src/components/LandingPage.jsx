import React from "react";
import {
  Calendar,
  Clock,
  Award,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Stethoscope
} from "lucide-react";

export default function LandingPage({ onOpenAuth }) {
  const specialtiesSample = [
    "Cardiology",
    "Dermatology",
    "Neurology",
    "Paediatrics",
    "Orthopaedics",
    "General Practice",
    "Ophthalmology",
    "Psychiatry",
    "Endocrinology",
    "Urology",
    "Gastroenterology"
  ];

  return (
    <div className="landing-wrapper">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-badge">
            <Sparkles size={15} color="#0284c7" />
            <span>Official Doctor Channeling & Healthcare System</span>
          </div>

          <h1 className="hero-title">
            Avoid Hassles & Delays.<br />
            <span className="hero-gradient-text">Find & Book Your Doctor Online.</span>
          </h1>

          <p className="hero-subtitle">
            How is health today? Sounds like not good! Don't worry. Find your doctor online,
            book consultation sessions with Medflow, and get your digital numbered appointment token instantly.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-primary hero-btn-main"
              onClick={() => onOpenAuth("login")}
            >
              <Calendar size={18} />
              <span>Make Appointment</span>
              <ChevronRight size={18} />
            </button>

            <button
              type="button"
              className="btn btn-secondary hero-btn-sub"
              onClick={() => onOpenAuth("register")}
            >
              Create Account
            </button>
          </div>
        </div>
      </section>

      {/* Feature Value Props */}
      <section className="features-section">
        <div className="features-container">
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">
                <Clock size={24} color="#0284c7" />
              </div>
              <h3>Zero Waiting Room Chaos</h3>
              <p>Real-time numbered token generation gives you an exact place in line.</p>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                <Award size={24} color="#0d9488" />
              </div>
              <h3>56 Medical Specialties</h3>
              <p>Consult with certified specialist practitioners across every major clinical field.</p>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                <CheckCircle2 size={24} color="#10b981" />
              </div>
              <h3>Digital Appointment Passes</h3>
              <p>Instant printable confirmation slips with doctor, clinic, and scheduling details.</p>
            </div>
          </div>

          {/* Specialties Showcase */}
          <div className="specialties-preview">
            <h4>Certified Clinical Specialties:</h4>
            <div className="specialties-pills">
              {specialtiesSample.map((spec, i) => (
                <span key={i} className="spec-pill">
                  {spec}
                </span>
              ))}
              <span className="spec-pill spec-more">+45 More</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>Medflow Doctor Appointment System • Full-Stack MERN Architecture</p>
      </footer>
    </div>
  );
}
