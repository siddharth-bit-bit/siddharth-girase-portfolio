import { useState, useEffect } from "react";
import {
  FaTimes,
  FaFileDownload,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaWhatsapp,
  FaFilm,
  FaCheckCircle,
  FaInfoCircle,
} from "react-icons/fa";
import "./styles/ProfileModal.css";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const [hasRealResume, setHasRealResume] = useState<boolean>(false);

  useEffect(() => {
    // Check if real resume.pdf exists in public/ folder
    fetch("/resume.pdf", { method: "HEAD" })
      .then((res) => {
        if (res.ok && res.headers.get("content-type")?.includes("pdf")) {
          setHasRealResume(true);
        } else {
          setHasRealResume(false);
        }
      })
      .catch(() => setHasRealResume(false));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="profile-modal-close" onClick={onClose} aria-label="Close Profile">
          <FaTimes />
        </button>

        <div className="profile-badge-top">CREATIVE PORTFOLIO PROFILE</div>

        <div className="profile-header">
          <div className="profile-avatar-circle">SG</div>
          <div>
            <h2>SIDDHARTH GIRASE</h2>
            <p className="profile-role">CREATIVE VIDEO EDITOR & VISUAL STORYTELLER</p>
            <div className="profile-location">
              <FaMapMarkerAlt /> Navsari, Gujarat, India
            </div>
          </div>
        </div>

        <div className="profile-tagline-box">
          <p>"Turning Moments Into Cinematic Stories."</p>
        </div>

        <div className="profile-sections-grid">
          <div className="profile-card">
            <h4>
              <FaFilm /> Core Specializations
            </h4>
            <ul>
              <li>
                <FaCheckCircle className="bullet-icon" /> Cinematic Video Editing & Rhythm Pacing
              </li>
              <li>
                <FaCheckCircle className="bullet-icon" /> High-Retention Instagram Reels & YouTube Shorts
              </li>
              <li>
                <FaCheckCircle className="bullet-icon" /> Long-Form YouTube Content & Retention Edits
              </li>
              <li>
                <FaCheckCircle className="bullet-icon" /> Professional Color Grading & LUT Color Science
              </li>
              <li>
                <FaCheckCircle className="bullet-icon" /> Dynamic Sound Design, SFX & Audio Mastering
              </li>
            </ul>
          </div>

          <div className="profile-card">
            <h4>Creative Tools & Software</h4>
            <div className="tool-tags-cloud">
              <span className="tool-pill">Adobe Premiere Pro</span>
              <span className="tool-pill">Adobe After Effects</span>
              <span className="tool-pill">DaVinci Resolve</span>
              <span className="tool-pill">Adobe Photoshop</span>
              <span className="tool-pill">Adobe Audition</span>
              <span className="tool-pill">CapCut Desktop</span>
              <span className="tool-pill">Final Cut Pro</span>
            </div>
          </div>
        </div>

        <div className="profile-actions-area">
          {hasRealResume ? (
            <a
              href="/resume.pdf"
              download="Siddharth_Girase_Video_Editor_Resume.pdf"
              className="profile-btn-primary"
            >
              <FaFileDownload /> Download Official Resume (PDF)
            </a>
          ) : (
            <div className="resume-placeholder-notice">
              <FaInfoCircle className="notice-icon" />
              <div>
                <strong>Resume Document Status:</strong>
                <p>
                  To enable direct PDF download, place your <code>resume.pdf</code> into the{" "}
                  <code>public/</code> folder. You can reach out directly via Phone or WhatsApp anytime!
                </p>
              </div>
            </div>
          )}

          <div className="profile-quick-contact">
            <a href="tel:+917041293231" className="quick-btn phone">
              <FaPhoneAlt /> Call +91 7041293231
            </a>
            <a
              href="https://wa.me/917041293231?text=Hi%20Siddharth%2C%20I%20viewed%20your%20profile%20and%20would%20like%20to%20collaborate%20on%20a%20video%20project!"
              target="_blank"
              rel="noreferrer"
              className="quick-btn whatsapp"
            >
              <FaWhatsapp /> Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
