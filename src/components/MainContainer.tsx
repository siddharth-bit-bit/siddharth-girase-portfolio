import { PropsWithChildren, useEffect, useState } from "react";
import About from "./About";
import Career from "./Career";
import Contact from "./Contact";
import Cursor from "./Cursor";
import Landing from "./Landing";
import Navbar from "./Navbar";
import SocialRail from "./SocialRail";
import WhatIDo from "./WhatIDo";
import Work from "./Work";
import Showreel from "./Showreel";
import TechStack from "./TechStack";
import AdminModal from "./AdminModal";
import ProfileModal from "./ProfileModal";
import setSplitText from "./utils/splitText";

const MainContainer = ({ children }: PropsWithChildren) => {
  const [isDesktopView, setIsDesktopView] = useState<boolean>(
    window.innerWidth > 1024
  );
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [workRefreshKey, setWorkRefreshKey] = useState<number>(0);
  const [showreelRefreshKey, setShowreelRefreshKey] = useState<number>(0);

  useEffect(() => {
    const resizeHandler = () => {
      setSplitText();
      setIsDesktopView(window.innerWidth > 1024);
    };
    resizeHandler();
    window.addEventListener("resize", resizeHandler);

    // Keyboard shortcut for Siddharth to open Admin Dashboard: Ctrl + Shift + A
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        setIsAdminOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", resizeHandler);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDesktopView]);

  const handleProjectsUpdated = () => {
    setWorkRefreshKey((prev) => prev + 1);
  };

  const handleShowreelUpdated = () => {
    setShowreelRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="container-main">
      <Cursor />
      <Navbar onOpenAdmin={() => setIsAdminOpen(true)} />
      <SocialRail onOpenProfile={() => setIsProfileOpen(true)} />

      {/* Persistent shared single 3D Cinema Camera Canvas across Hero & About */}
      {children}

      <div id="smooth-wrapper">
        <div id="smooth-content">
          <div className="container-main">
            <Landing />
            <About />
            <Showreel refreshTrigger={showreelRefreshKey} />
            <WhatIDo />
            <Work
              onOpenAdmin={() => setIsAdminOpen(true)}
              refreshTrigger={workRefreshKey}
            />
            <TechStack />
            <Career />
            <Contact />
          </div>
        </div>
      </div>

      {/* Admin Video Manager Dashboard */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onProjectsUpdated={handleProjectsUpdated}
        onShowreelUpdated={handleShowreelUpdated}
      />

      {/* Profile & Resume Viewer Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
};

export default MainContainer;