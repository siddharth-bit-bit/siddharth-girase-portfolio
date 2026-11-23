import { useEffect, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HoverLinks from "./HoverLinks";
import { gsap } from "gsap";
import { ScrollSmoother } from "gsap-trial/ScrollSmoother";
import { FaLock, FaBars, FaTimes, FaWhatsapp, FaPhoneAlt, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { socialLinks } from "../data/socialLinks";
import "./styles/Navbar.css";

gsap.registerPlugin(ScrollSmoother, ScrollTrigger);
export let smoother: ScrollSmoother;

interface NavbarProps {
  onOpenAdmin?: () => void;
}

const Navbar = ({ onOpenAdmin }: NavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 1.7,
      speed: 1.7,
      effects: true,
      autoResize: true,
      ignoreMobileResize: true,
    });

    smoother.scrollTop(0);
    smoother.paused(true);

    const handleScroll = () => {
      if (window.scrollY > 40) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (window.innerWidth > 1024 && smoother) {
      smoother.scrollTo(targetId, true, "top top");
    } else {
      const element = document.querySelector(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <>
      <header className={`header-main ${scrolled ? "header-scrolled" : ""}`}>
        <div className="header-inner">
          {/* Left: Brand Logo */}
          <a href="/#" className="navbar-brand-link" data-cursor="disable">
            <span className="navbar-logo-badge">SG</span>
            <span className="navbar-brand-name">SIDDHARTH GIRASE</span>
          </a>

          {/* Right: Desktop Navigation Links (Properly Spaced, NO phone overlap) */}
          <nav className="navbar-desktop-nav">
            <ul className="navbar-nav-list">
              <li>
                <a
                  href="#about"
                  onClick={(e) => handleNavClick(e, "#about")}
                  data-cursor="pointer"
                >
                  <HoverLinks text="ABOUT" />
                </a>
              </li>
              <li>
                <a
                  href="#showreel"
                  onClick={(e) => handleNavClick(e, "#showreel")}
                  data-cursor="pointer"
                >
                  <HoverLinks text="SHOWREEL" />
                </a>
              </li>
              <li>
                <a
                  href="#services"
                  onClick={(e) => handleNavClick(e, "#services")}
                  data-cursor="pointer"
                >
                  <HoverLinks text="SERVICES" />
                </a>
              </li>
              <li>
                <a
                  href="#work"
                  onClick={(e) => handleNavClick(e, "#work")}
                  data-cursor="pointer"
                >
                  <HoverLinks text="MY WORK" />
                </a>
              </li>
              <li>
                <a
                  href="#tools"
                  onClick={(e) => handleNavClick(e, "#tools")}
                  data-cursor="pointer"
                >
                  <HoverLinks text="TOOLS" />
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  onClick={(e) => handleNavClick(e, "#contact")}
                  data-cursor="pointer"
                >
                  <HoverLinks text="CONTACT" />
                </a>
              </li>
              {onOpenAdmin && (
                <li className="navbar-admin-li">
                  <button
                    className="navbar-admin-btn"
                    onClick={onOpenAdmin}
                    title="SG Portfolio Manager (Admin Access)"
                    data-cursor="pointer"
                    aria-label="Admin Dashboard"
                  >
                    <FaLock />
                  </button>
                </li>
              )}
            </ul>
          </nav>

          {/* Mobile Right Controls: Admin Lock + Hamburger Menu Toggle */}
          <div className="navbar-mobile-controls">
            {onOpenAdmin && (
              <button
                className="navbar-admin-btn mobile-only"
                onClick={onOpenAdmin}
                title="SG Portfolio Manager"
                aria-label="Admin Dashboard"
              >
                <FaLock />
              </button>
            )}
            <button
              className="navbar-hamburger-btn"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      <div
        className={`mobile-drawer-overlay ${mobileMenuOpen ? "open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      >
        <div
          className={`mobile-drawer-panel ${mobileMenuOpen ? "open" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mobile-drawer-top">
            <div className="navbar-brand-link">
              <span className="navbar-logo-badge">SG</span>
              <span className="navbar-brand-name">SIDDHARTH GIRASE</span>
            </div>
            <button
              className="drawer-close-btn"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <FaTimes />
            </button>
          </div>

          <div className="mobile-drawer-role">
            <span>VIDEO EDITOR & STORYTELLER</span>
          </div>

          <ul className="mobile-drawer-links">
            <li>
              <a href="#about" onClick={(e) => handleNavClick(e, "#about")}>
                ABOUT
              </a>
            </li>
            <li>
              <a href="#showreel" onClick={(e) => handleNavClick(e, "#showreel")}>
                SHOWREEL
              </a>
            </li>
            <li>
              <a href="#services" onClick={(e) => handleNavClick(e, "#services")}>
                SERVICES
              </a>
            </li>
            <li>
              <a href="#work" onClick={(e) => handleNavClick(e, "#work")}>
                MY WORK
              </a>
            </li>
            <li>
              <a href="#tools" onClick={(e) => handleNavClick(e, "#tools")}>
                TOOLS
              </a>
            </li>
            <li>
              <a href="#contact" onClick={(e) => handleNavClick(e, "#contact")}>
                CONTACT
              </a>
            </li>
          </ul>

          <div className="mobile-drawer-footer">
            <div className="mobile-contact-pill">
              <FaPhoneAlt /> +91 7041293231
            </div>
            <a
              href="https://wa.me/917041293231"
              target="_blank"
              rel="noopener noreferrer"
              className="mobile-whatsapp-btn"
              aria-label="Chat on WhatsApp"
            >
              <FaWhatsapp /> Chat on WhatsApp
            </a>

            <div className="mobile-drawer-socials">
              {socialLinks
                .filter((item) => item.enabled)
                .map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mobile-drawer-social-icon"
                    title={item.label}
                    aria-label={item.label}
                  >
                    {item.id === "whatsapp" && <FaWhatsapp />}
                    {item.id === "instagram" && <FaInstagram />}
                    {item.id === "linkedin" && <FaLinkedinIn />}
                  </a>
                ))}
            </div>
          </div>
        </div>
      </div>

      <div className="landing-circle1"></div>
      <div className="landing-circle2"></div>
      <div className="nav-fade"></div>
    </>
  );
};

export default Navbar;
