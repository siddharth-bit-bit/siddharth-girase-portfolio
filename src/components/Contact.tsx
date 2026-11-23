import { useState } from "react";
import {
  FaPhoneAlt,
  FaWhatsapp,
  FaMapMarkerAlt,
  FaPaperPlane,
  FaCheckCircle,
  FaInstagram,
  FaLinkedinIn,
  FaSpinner,
  FaExclamationCircle,
} from "react-icons/fa";
import { MdCopyright } from "react-icons/md";
import { socialLinks } from "../data/socialLinks";
import "./styles/Contact.css";

const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)", flag: "🇮🇳" },
  { code: "+1", label: "USA / Canada (+1)", flag: "🇺🇸" },
  { code: "+44", label: "UK (+44)", flag: "🇬🇧" },
  { code: "+971", label: "UAE (+971)", flag: "🇦🇪" },
  { code: "+61", label: "Australia (+61)", flag: "🇦🇺" },
  { code: "+65", label: "Singapore (+65)", flag: "🇸🇬" },
  { code: "+49", label: "Germany (+49)", flag: "🇩🇪" },
  { code: "+33", label: "France (+33)", flag: "🇫🇷" },
  { code: "+81", label: "Japan (+81)", flag: "🇯🇵" },
  { code: "+966", label: "Saudi Arabia (+966)", flag: "🇸🇦" },
  { code: "+31", label: "Netherlands (+31)", flag: "🇳🇱" },
  { code: "+41", label: "Switzerland (+41)", flag: "🇨🇭" },
  { code: "+34", label: "Spain (+34)", flag: "🇪🇸" },
  { code: "+39", label: "Italy (+39)", flag: "🇮🇹" },
  { code: "+60", label: "Malaysia (+60)", flag: "🇲🇾" },
  { code: "+62", label: "Indonesia (+62)", flag: "🇮🇩" },
  { code: "+92", label: "Pakistan (+92)", flag: "🇵🇰" },
  { code: "+880", label: "Bangladesh (+880)", flag: "🇧🇩" },
  { code: "+977", label: "Nepal (+977)", flag: "🇳🇵" },
  { code: "+94", label: "Sri Lanka (+94)", flag: "🇱🇰" },
  { code: "+27", label: "South Africa (+27)", flag: "🇿🇦" },
  { code: "+55", label: "Brazil (+55)", flag: "🇧🇷" },
  { code: "+64", label: "New Zealand (+64)", flag: "🇳🇿" },
];

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    countryCode: "+91",
    phone: "",
    projectType: "Reel / Short-Form",
    message: "",
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [k: string]: string }>({});

  const validateForm = () => {
    const errs: { [k: string]: string } = {};

    if (!formData.name.trim()) {
      errs.name = "Please enter your full name.";
    }

    if (!formData.email.trim()) {
      errs.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = "Please enter a valid email address.";
    }

    const cleanDigits = formData.phone.replace(/[^0-9]/g, "");
    if (!formData.phone.trim()) {
      errs.phone = "Please enter your phone/WhatsApp number.";
    } else if (cleanDigits.length < 7 || cleanDigits.length > 15) {
      errs.phone = "Please enter a valid phone number (7-15 digits).";
    }

    if (!formData.message.trim()) {
      errs.message = "Please describe your project details and goals.";
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const formatWhatsAppMessage = () => {
    const fullPhone = `${formData.countryCode} ${formData.phone.trim()}`.trim();
    return (
      `Hi Siddharth! Here are my project inquiry details:\n\n` +
      `*Name:* ${formData.name.trim() || "N/A"}\n` +
      `*Email:* ${formData.email.trim() || "N/A"}\n` +
      `*Phone:* ${fullPhone || "N/A"}\n` +
      `*Project Category:* ${formData.projectType}\n` +
      `*Project Details:* ${formData.message.trim() || "N/A"}`
    );
  };

  const handleWhatsAppDirect = () => {
    const text = formatWhatsAppMessage();
    const url = `https://wa.me/917041293231?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const fullPhone = `${formData.countryCode} ${formData.phone.trim()}`.trim();
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: fullPhone,
          projectType: formData.projectType,
          message: formData.message.trim(),
        }),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        setSubmitted(true);
        setFormData({
          name: "",
          email: "",
          countryCode: "+91",
          phone: "",
          projectType: "Reel / Short-Form",
          message: "",
        });
        setValidationErrors({});
      } else {
        setErrorMsg(
          resData.message ||
            "Unable to deliver email inquiry right now. You can send it directly to Siddharth via WhatsApp below!"
        );
      }
    } catch (err: any) {
      console.warn("API request error:", err);
      setErrorMsg(
        "Direct email dispatch is currently waiting for email service configuration. Please click 'SEND VIA WHATSAPP' to send your inquiry immediately to Siddharth!"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-section section-container" id="contact">
      <div className="contact-container">
        <div className="contact-head-box">
          <span className="contact-tag">START A COLLABORATION</span>
          <h3 className="contact-title">LET'S CREATE SOMETHING AMAZING.</h3>
          <p className="contact-subtitle">
            Have a project in mind? Let's turn your vision into a cinematic story.
          </p>
        </div>

        <div className="contact-main-grid">
          {/* Left Column: Direct Details & Quick Actions */}
          <div className="contact-details-col">
            <div className="contact-info-card">
              <h4>Creator & Location</h4>
              <p className="contact-person-name">Siddharth Girase</p>
              <div className="contact-location-pill">
                <FaMapMarkerAlt className="loc-icon" /> Navsari, Gujarat, India
              </div>
            </div>

            <div className="contact-info-card">
              <h4>Direct Call & Phone</h4>
              <p className="contact-phone-display">+91 7041293231</p>
              <div className="contact-btn-group">
                <a
                  href="tel:+917041293231"
                  className="contact-action-btn call-btn"
                  data-cursor="pointer"
                >
                  <FaPhoneAlt /> Call Now
                </a>
                <a
                  href="https://wa.me/917041293231?text=Hi%20Siddharth%2C%20I%20have%20a%20video%20editing%20project%20I%20would%20love%20to%20discuss!"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-action-btn whatsapp-btn"
                  data-cursor="pointer"
                >
                  <FaWhatsapp /> Chat on WhatsApp
                </a>
              </div>
            </div>

            <div className="contact-info-card">
              <h4>Social Profiles</h4>
              <div className="contact-social-icons-row">
                {socialLinks
                  .filter((item) => item.enabled)
                  .map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-circle-btn"
                      title={item.label}
                      aria-label={item.label}
                      data-cursor="pointer"
                    >
                      {item.id === "whatsapp" && <FaWhatsapp />}
                      {item.id === "instagram" && <FaInstagram />}
                      {item.id === "linkedin" && <FaLinkedinIn />}
                    </a>
                  ))}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Contact Form */}
          <div className="contact-form-col">
            <div className="contact-form-wrapper">
              <h4>Send a Project Inquiry</h4>
              <p className="form-subtext">
                Fill in your details below and I'll get back to you within 24 hours.
              </p>

              {submitted ? (
                <div className="contact-success-state">
                  <FaCheckCircle className="success-icon" />
                  <h4>Thank you!</h4>
                  <p className="success-highlight">
                    Your project inquiry has been sent successfully. I'll get back to you soon.
                  </p>
                  <div className="success-actions">
                    <button
                      type="button"
                      className="form-submit-btn secondary-btn"
                      onClick={() => setSubmitted(false)}
                      data-cursor="pointer"
                    >
                      Send Another Inquiry
                    </button>
                    <button
                      type="button"
                      className="contact-whatsapp-submit-btn"
                      onClick={handleWhatsAppDirect}
                      data-cursor="pointer"
                    >
                      <FaWhatsapp /> Connect on WhatsApp
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="project-inquiry-form" noValidate>
                  {errorMsg && (
                    <div className="form-error-banner">
                      <FaExclamationCircle className="error-icon" />
                      <div className="error-content">
                        <p>{errorMsg}</p>
                        <button
                          type="button"
                          className="error-whatsapp-action"
                          onClick={handleWhatsAppDirect}
                          data-cursor="pointer"
                        >
                          <FaWhatsapp /> Send Details via WhatsApp Directly
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group half">
                      <label htmlFor="inquiry-name">Your Name *</label>
                      <input
                        id="inquiry-name"
                        type="text"
                        placeholder="John Doe"
                        required
                        className={`form-control ${validationErrors.name ? "input-error" : ""}`}
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (validationErrors.name) {
                            setValidationErrors({ ...validationErrors, name: "" });
                          }
                        }}
                      />
                      {validationErrors.name && (
                        <span className="field-error-text">{validationErrors.name}</span>
                      )}
                    </div>

                    <div className="form-group half">
                      <label htmlFor="inquiry-email">Your Email *</label>
                      <input
                        id="inquiry-email"
                        type="email"
                        placeholder="john@example.com"
                        required
                        className={`form-control ${validationErrors.email ? "input-error" : ""}`}
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (validationErrors.email) {
                            setValidationErrors({ ...validationErrors, email: "" });
                          }
                        }}
                      />
                      {validationErrors.email && (
                        <span className="field-error-text">{validationErrors.email}</span>
                      )}
                    </div>
                  </div>

                  {/* Phone / WhatsApp Field with Country Code Selector */}
                  <div className="form-group">
                    <label htmlFor="inquiry-phone">YOUR PHONE / WHATSAPP NUMBER *</label>
                    <div className="phone-input-row">
                      <select
                        aria-label="Country Code"
                        className="country-code-select"
                        value={formData.countryCode}
                        onChange={(e) =>
                          setFormData({ ...formData, countryCode: e.target.value })
                        }
                      >
                        {COUNTRY_CODES.map((item) => (
                          <option key={`${item.code}-${item.label}`} value={item.code}>
                            {item.flag} {item.label}
                          </option>
                        ))}
                      </select>
                      <input
                        id="inquiry-phone"
                        type="tel"
                        placeholder="98765 43210"
                        required
                        className={`form-control phone-input ${validationErrors.phone ? "input-error" : ""}`}
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          if (validationErrors.phone) {
                            setValidationErrors({ ...validationErrors, phone: "" });
                          }
                        }}
                      />
                    </div>
                    {validationErrors.phone && (
                      <span className="field-error-text">{validationErrors.phone}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="inquiry-category">Project Category</label>
                    <select
                      id="inquiry-category"
                      className="form-control"
                      value={formData.projectType}
                      onChange={(e) =>
                        setFormData({ ...formData, projectType: e.target.value })
                      }
                    >
                      <option value="Reel / Short-Form">Instagram Reel / YouTube Short</option>
                      <option value="YouTube Long-Form">YouTube Long-Form Video</option>
                      <option value="Cinematic Commercial">Cinematic Commercial / Promo</option>
                      <option value="Color Grading & Polish">Color Grading & Finishing</option>
                      <option value="Other Project">Other Creative Project</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="inquiry-message">Project Details & Goals *</label>
                    <textarea
                      id="inquiry-message"
                      rows={4}
                      placeholder="Tell me about your video vision, raw footage length, deadline, and reference style..."
                      className={`form-control textarea ${validationErrors.message ? "input-error" : ""}`}
                      value={formData.message}
                      onChange={(e) => {
                        setFormData({ ...formData, message: e.target.value });
                        if (validationErrors.message) {
                          setValidationErrors({ ...validationErrors, message: "" });
                        }
                      }}
                    />
                    {validationErrors.message && (
                      <span className="field-error-text">{validationErrors.message}</span>
                    )}
                  </div>

                  <div className="form-actions-dual">
                    <button
                      type="submit"
                      className="form-submit-btn"
                      disabled={loading}
                      data-cursor="pointer"
                    >
                      {loading ? (
                        <>
                          <FaSpinner className="spinner-icon spin" /> Sending Inquiry...
                        </>
                      ) : (
                        <>
                          <FaPaperPlane /> Send Project Inquiry
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="contact-whatsapp-submit-btn"
                      onClick={handleWhatsAppDirect}
                      disabled={loading}
                      data-cursor="pointer"
                      title="Open chat with Siddharth on WhatsApp with these details prefilled"
                    >
                      <FaWhatsapp className="wa-icon" /> SEND VIA WHATSAPP
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Footer Brand Line */}
        <div className="contact-footer-bar">
          <div className="footer-left">
            <h2>
              SG — <span>SIDDHARTH GIRASE</span>
            </h2>
            <p>"Turning Moments Into Cinematic Stories."</p>
          </div>
          <div className="footer-right">
            <h5>
              <MdCopyright /> 2026 Siddharth Girase. All rights reserved.
            </h5>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
