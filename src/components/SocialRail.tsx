import {
  FaInstagram,
  FaLinkedinIn,
  FaWhatsapp,
} from "react-icons/fa6";
import "./styles/SocialIcons.css";
import { TbNotes } from "react-icons/tb";
import { useEffect, useState } from "react";
import HoverLinks from "./HoverLinks";
import { socialLinks } from "../data/socialLinks";

export interface SocialRailProps {
  onOpenProfile?: () => void;
}

export const SocialRail = ({ onOpenProfile }: SocialRailProps) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);

  // ---------------------------------------------------------------------------
  // Scroll-Based Section Visibility Controller
  // Displays the vertical social icons ONLY in Hero / Landing and About sections.
  // Smoothly fades out when entering Showreel, Services, Work, Tools, Contact.
  // Smoothly fades back in when scrolling upward back into About or Hero.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const evaluateVisibility = () => {
      const hero =
        document.getElementById("landingDiv") ||
        document.querySelector(".landing-section");
      const about =
        document.getElementById("about") ||
        document.querySelector(".about-section");

      if (!hero && !about) return;

      const vh = window.innerHeight;
      const heroRect = hero ? hero.getBoundingClientRect() : null;
      const aboutRect = about ? about.getBoundingClientRect() : null;

      // 1. Hero / Landing Section is active if it hasn't completely scrolled off top
      const isHeroActive = heroRect
        ? heroRect.bottom > 20 && heroRect.top < vh
        : false;

      // 2. About Section is active while visible in the viewport
      // Once the visitor scrolls past the bottom of About into Showreel, aboutRect.bottom drops below 80px
      const isAboutActive = aboutRect
        ? aboutRect.bottom > 80 && aboutRect.top < vh - 20
        : false;

      const shouldShow = isHeroActive || isAboutActive;
      setIsVisible(shouldShow);
    };

    // Run initial evaluation
    evaluateVisibility();

    // IntersectionObserver for hardware-accelerated viewport change detection
    const observer = new IntersectionObserver(
      () => {
        evaluateVisibility();
      },
      {
        root: null,
        rootMargin: "0px 0px -40px 0px",
        threshold: [0, 0.05, 0.1, 0.25, 0.5],
      }
    );

    const heroTarget =
      document.getElementById("landingDiv") ||
      document.querySelector(".landing-section");
    const aboutTarget =
      document.getElementById("about") ||
      document.querySelector(".about-section");

    if (heroTarget) observer.observe(heroTarget);
    if (aboutTarget) observer.observe(aboutTarget);

    // Passive scroll and resize listeners for instantaneous RAF frame-sync updates
    let rafId: number | null = null;
    const handleScrollOrResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        evaluateVisibility();
        rafId = null;
      });
    };

    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Magnetic Cursor-Hover Physics (Desktop only)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Only bind magnetic mouse listener on pointer devices that support hover
    if (window.innerWidth <= 1024) return;

    const social = document.getElementById("social") as HTMLElement;
    if (!social) return;

    const cleanups: (() => void)[] = [];

    social.querySelectorAll("span").forEach((item) => {
      const elem = item as HTMLElement;
      const link = elem.querySelector("a") as HTMLElement;
      if (!link) return;

      let rect = elem.getBoundingClientRect();
      let mouseX = rect.width / 2;
      let mouseY = rect.height / 2;
      let currentX = mouseX;
      let currentY = mouseY;
      let animId: number;

      const updatePosition = () => {
        currentX += (mouseX - currentX) * 0.15;
        currentY += (mouseY - currentY) * 0.15;

        link.style.setProperty("--siLeft", `${currentX}px`);
        link.style.setProperty("--siTop", `${currentY}px`);

        animId = requestAnimationFrame(updatePosition);
      };

      const onMouseMove = (e: MouseEvent) => {
        rect = elem.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
          mouseX = x;
          mouseY = y;
        } else {
          mouseX = rect.width / 2;
          mouseY = rect.height / 2;
        }
      };

      document.addEventListener("mousemove", onMouseMove);
      animId = requestAnimationFrame(updatePosition);

      cleanups.push(() => {
        document.removeEventListener("mousemove", onMouseMove);
        cancelAnimationFrame(animId);
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  const renderIcon = (id: string) => {
    switch (id) {
      case "whatsapp":
        return <FaWhatsapp />;
      case "instagram":
        return <FaInstagram />;
      case "linkedin":
        return <FaLinkedinIn />;
      default:
        return null;
    }
  };

  // Only the 3 active icons: WhatsApp, Instagram, LinkedIn
  const activeLinks = socialLinks.filter((item) => item.enabled);

  return (
    <div className="icons-section">
      <div
        className={`social-icons ${isVisible ? "social-visible" : "social-hidden"}`}
        data-cursor="icons"
        id="social"
        aria-hidden={!isVisible}
      >
        {activeLinks.map((item) => (
          <span key={item.id}>
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              title={item.label}
              aria-label={item.label}
              data-cursor="pointer"
              tabIndex={isVisible ? 0 : -1}
            >
              {renderIcon(item.id)}
            </a>
          </span>
        ))}
      </div>

      {/* Profile & Creative Resume Quick-Action */}
      <button
        className="resume-button"
        onClick={onOpenProfile}
        data-cursor="pointer"
        title="View Siddharth's Creative Profile & Resume"
        aria-label="View Siddharth's Creative Profile & Resume"
      >
        <HoverLinks text="PROFILE" />
        <span>
          <TbNotes />
        </span>
      </button>
    </div>
  );
};

export default SocialRail;
