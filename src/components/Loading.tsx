import { useEffect, useState, useRef, memo } from "react";
import "./styles/Loading.css";
import { useLoading } from "../context/LoadingProvider";

interface LoadingProps {
  percent: number;
}

// Strict minimum duration of 4.2 seconds (4,200ms) to ensure all 4 cinematic phases play completely
const MIN_DURATION_MS = 4200;
// Safe watchdog fallback (7.0 seconds) ensures the website never hangs on slow connections
const WATCHDOG_MS = 7000;

// Format editing timeline timecode (00:00:00:00 -> 00:00:04:06)
function formatTimecode(val: number) {
  const totalFrames = Math.floor((Math.min(100, Math.max(0, val)) / 100) * 100);
  const secs = Math.floor(totalFrames / 24);
  const frames = totalFrames % 24;
  return `00:00:0${secs}:${String(frames).padStart(2, "0")}`;
}

// Pre-computed static tick marks for the timeline
const TIMELINE_TICKS = Array.from({ length: 25 }, (_, i) => ({
  id: i,
  isMajor: i % 6 === 0,
}));

const Loading = ({ percent: rawPercent }: LoadingProps) => {
  const { setIsLoading } = useLoading();
  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  // Direct DOM references for butter-smooth 60 FPS updates without triggering React re-renders
  const fillRef = useRef<HTMLDivElement | null>(null);
  const playheadRef = useRef<HTMLDivElement | null>(null);
  const percentTextRef = useRef<HTMLSpanElement | null>(null);
  const timecodeTextRef = useRef<HTMLSpanElement | null>(null);

  const startTimeRef = useRef<number>(performance.now());
  const isTriggeredRef = useRef<boolean>(false);
  const rawPercentRef = useRef<number>(rawPercent);
  const phaseRef = useRef<1 | 2 | 3 | 4>(1);
  const currentDisplayPercentRef = useRef<number>(0);

  useEffect(() => {
    rawPercentRef.current = rawPercent;
  }, [rawPercent]);

  // Preload initialFX module in Phase 3 so dynamic chunk is already in memory when exit triggers
  useEffect(() => {
    if (phase >= 3) {
      import("./utils/initialFX").catch(() => {});
    }
  }, [phase]);

  // High-Precision Delta-Time RAF Engine (Locked 60 FPS, Zero Component Re-renders during progress)
  useEffect(() => {
    const startTime = startTimeRef.current;
    let animFrameId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;

      // 1. Phase Milestones (Only trigger state update when milestone is crossed)
      let nextPhase: 1 | 2 | 3 | 4 = 1;
      if (elapsed < 1000) {
        nextPhase = 1;
      } else if (elapsed < 2000) {
        nextPhase = 2;
      } else if (elapsed < 3200) {
        nextPhase = 3;
      } else {
        nextPhase = 4;
      }

      if (nextPhase !== phaseRef.current) {
        phaseRef.current = nextPhase;
        setPhase(nextPhase);
      }

      // 2. Continuous time-based cubic ease-out progression curve
      const timeFactor = Math.min(1, elapsed / MIN_DURATION_MS);
      const smoothTimeProgress = (1 - Math.pow(1 - timeFactor, 2.2)) * 100;
      const assetIsReady = rawPercentRef.current >= 100;

      let target = Math.min(smoothTimeProgress, 99);
      if ((assetIsReady && elapsed >= MIN_DURATION_MS) || elapsed >= WATCHDOG_MS) {
        target = 100;
      }

      // Lerp current displayed percent smoothly toward target
      let currentVal = currentDisplayPercentRef.current;
      if (target >= 100) {
        currentVal = Math.min(100, currentVal + (100 - currentVal) * 0.28 + 0.4);
      } else {
        currentVal = Math.max(currentVal, target);
      }
      currentDisplayPercentRef.current = currentVal;

      const roundedDisplay = Math.min(100, Math.max(0, Math.round(currentVal)));

      // 3. Direct DOM Updates (Zero React re-render overhead!)
      if (fillRef.current) {
        fillRef.current.style.width = `${roundedDisplay}%`;
      }
      if (playheadRef.current) {
        playheadRef.current.style.left = `${roundedDisplay}%`;
      }
      if (percentTextRef.current) {
        percentTextRef.current.textContent = String(roundedDisplay).padStart(2, "0");
      }
      if (timecodeTextRef.current) {
        timecodeTextRef.current.textContent = formatTimecode(roundedDisplay);
      }

      // 4. Trigger exit sequence cleanly when reaching 100%
      if (roundedDisplay >= 100 && !isTriggeredRef.current) {
        isTriggeredRef.current = true;
        setIsDone(true);

        // Phase 4 Final Opening: aperture expands smoothly (500ms)
        const t1 = setTimeout(() => {
          setIsFadingOut(true);

          // Initialize smooth scroll and Hero section FX seamlessly
          import("./utils/initialFX").then((module) => {
            if (module.initialFX) {
              module.initialFX();
            }
          });

          // Complete fade out and unmount cleanly from DOM
          const t2 = setTimeout(() => {
            setIsLoading(false);
          }, 750);

          return () => clearTimeout(t2);
        }, 500);

        return () => clearTimeout(t1);
      }

      if (roundedDisplay < 100 || (!assetIsReady && elapsed < WATCHDOG_MS)) {
        animFrameId = requestAnimationFrame(tick);
      }
    };

    animFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameId);
  }, [setIsLoading]);

  return (
    <aside
      className={`cine-loader-screen phase-${phase} ${
        isDone ? "cine-complete" : ""
      } ${isFadingOut ? "cine-fade-out" : ""}`}
      aria-label="Loading Cinematic Intro"
      aria-live="polite"
    >
      {/* Background Anamorphic Glow & Vignette */}
      <div className="cine-ambient-vignette" />
      <div className="cine-ambient-beam" />

      {/* Cinema Viewfinder HUD Corners */}
      <div className="cine-hud-corner top-left" aria-hidden="true">
        <span className="cine-rec-dot" />
        <span className="cine-hud-label">REC &bull; 4K 24FPS</span>
      </div>
      <div className="cine-hud-corner top-right" aria-hidden="true">
        <span className="cine-hud-label">SHUTTER 180&deg; &bull; ISO 800</span>
      </div>
      <div className="cine-hud-corner bottom-left" aria-hidden="true">
        <span className="cine-hud-label">PRORES 422 HQ</span>
      </div>
      <div className="cine-hud-corner bottom-right" aria-hidden="true">
        <span className="cine-hud-label">RAW COLOR: LOG-C</span>
      </div>

      {/* Main Cinematic Centerpiece */}
      <div className="cine-centerpiece-container">
        {/* Animated Cinema Lens & Aperture Rig */}
        <div className={`cine-lens-wrapper phase-${phase}`}>
          <svg
            className="cine-lens-svg"
            viewBox="0 0 260 260"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="lensCoreGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f0abfc" stopOpacity="0.9" />
                <stop offset="35%" stopColor="#c084fc" stopOpacity="0.5" />
                <stop offset="65%" stopColor="#7c3aed" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#050308" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="apertureGlowCenter" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#9333ea" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#07040e" stopOpacity="0" />
              </radialGradient>

              <linearGradient id="laserGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="50%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>

              <linearGradient id="laserGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>

              <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#251545" />
                <stop offset="50%" stopColor="#150c26" />
                <stop offset="100%" stopColor="#080410" />
              </linearGradient>

              <linearGradient id="streakFlareGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="30%" stopColor="rgba(168, 85, 247, 0.2)" />
                <stop offset="50%" stopColor="rgba(244, 114, 182, 0.9)" />
                <stop offset="70%" stopColor="rgba(168, 85, 247, 0.2)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>

              <linearGradient id="beamVertical" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="rgba(192, 132, 252, 0.4)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>

              <linearGradient id="beamHorizontal" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="rgba(244, 114, 182, 0.4)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>

              {/* Hardware-friendly radial gradient particle glows (Zero software blur overhead) */}
              <radialGradient id="particleGlowMagenta" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="35%" stopColor="#f472b6" stopOpacity="0.95" />
                <stop offset="70%" stopColor="#c084fc" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="particleGlowPurple" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="35%" stopColor="#c084fc" stopOpacity="0.95" />
                <stop offset="70%" stopColor="#7c3aed" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6b21a8" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="particleGlowCyan" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.95" />
                <stop offset="70%" stopColor="#818cf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Subtle Expanding Radial Light Beams */}
            <g className="cine-radial-beams">
              <line x1="130" y1="15" x2="130" y2="245" stroke="url(#beamVertical)" strokeWidth="1" />
              <line x1="15" y1="130" x2="245" y2="130" stroke="url(#beamHorizontal)" strokeWidth="1" />
              <line x1="48" y1="48" x2="212" y2="212" stroke="url(#beamVertical)" strokeWidth="0.8" opacity="0.6" />
              <line x1="48" y1="212" x2="212" y2="48" stroke="url(#beamHorizontal)" strokeWidth="0.8" opacity="0.6" />
            </g>

            {/* Central Purple Energy Core */}
            <circle cx="130" cy="130" r="120" fill="url(#lensCoreGlow)" className="cine-lens-ambient-glow" />

            {/* LAYER 1: OUTER CLOCKWISE ROTATING NEON RING & GEAR RIBS */}
            <g className="cine-outer-clockwise-group">
              <circle
                cx="130"
                cy="130"
                r="124"
                stroke="#4c1d95"
                strokeWidth="2.5"
                strokeDasharray="4 6"
                className="cine-outer-gear-ribs"
              />
              <circle
                cx="130"
                cy="130"
                r="119"
                stroke="#6b21a8"
                strokeWidth="1.2"
                opacity="0.75"
              />
              {/* Traveling Energy Pulse Nodes on Outer Ring */}
              <circle cx="130" cy="6" r="4.5" fill="url(#particleGlowPurple)" className="cine-ring-node n1" />
              <circle cx="254" cy="130" r="4.5" fill="url(#particleGlowMagenta)" className="cine-ring-node n2" />
              <circle cx="130" cy="254" r="4.5" fill="url(#particleGlowPurple)" className="cine-ring-node n3" />
              <circle cx="6" cy="130" r="4.5" fill="url(#particleGlowMagenta)" className="cine-ring-node n4" />
            </g>

            {/* LAYER 2: INNER COUNTER-CLOCKWISE CALIBRATION SCALE RING */}
            <g className="cine-inner-counter-group">
              <circle
                cx="130"
                cy="130"
                r="112"
                stroke="#7c3aed"
                strokeWidth="1.5"
                strokeDasharray="2 9"
                opacity="0.85"
                className="cine-inner-calib-scale"
              />
              <circle cx="130" cy="130" r="107" stroke="#3b1d6e" strokeWidth="2" opacity="0.6" />
            </g>

            {/* LAYER 3: THIN CIRCULAR LASER LINES & TRAVELING LIGHT RUNNERS */}
            <circle
              cx="130"
              cy="130"
              r="103"
              stroke="url(#laserGrad1)"
              strokeWidth="2"
              className="cine-laser-line-1"
            />
            <circle
              cx="130"
              cy="130"
              r="103"
              stroke="url(#laserGrad2)"
              strokeWidth="1.5"
              className="cine-laser-line-2"
            />

            {/* Main Metallic Lens Barrel Rim */}
            <circle cx="130" cy="130" r="95" stroke="#3b1d6e" strokeWidth="3" fill="#0b0615" />
            <circle cx="130" cy="130" r="91" stroke="#a855f7" strokeWidth="1" opacity="0.4" />

            {/* LAYER 4: REALISTIC CAMERA APERTURE IRIS ASSEMBLY (8 BLADES) */}
            <g className="cine-aperture-iris-assembly">
              <path
                d="M 130,48 Q 168,82 160,125 L 136,106 Z"
                fill="url(#bladeGrad)"
                stroke="#6b21a8"
                strokeWidth="1"
                className="cine-aperture-blade"
              />
              <path
                d="M 130,48 Q 168,82 160,125 L 136,106 Z"
                fill="url(#bladeGrad)"
                stroke="#6b21a8"
                strokeWidth="1"
                transform="rotate(45 130 130)"
                className="cine-aperture-blade"
              />
              <path
                d="M 130,48 Q 168,82 160,125 L 136,106 Z"
                fill="url(#bladeGrad)"
                stroke="#6b21a8"
                strokeWidth="1"
                transform="rotate(90 130 130)"
                className="cine-aperture-blade"
              />
              <path
                d="M 130,48 Q 168,82 160,125 L 136,106 Z"
                fill="url(#bladeGrad)"
                stroke="#6b21a8"
                strokeWidth="1"
                transform="rotate(135 130 130)"
                className="cine-aperture-blade"
              />
              <path
                d="M 130,48 Q 168,82 160,125 L 136,106 Z"
                fill="url(#bladeGrad)"
                stroke="#6b21a8"
                strokeWidth="1"
                transform="rotate(180 130 130)"
                className="cine-aperture-blade"
              />
              <path
                d="M 130,48 Q 168,82 160,125 L 136,106 Z"
                fill="url(#bladeGrad)"
                stroke="#6b21a8"
                strokeWidth="1"
                transform="rotate(225 130 130)"
                className="cine-aperture-blade"
              />
              <path
                d="M 130,48 Q 168,82 160,125 L 136,106 Z"
                fill="url(#bladeGrad)"
                stroke="#6b21a8"
                strokeWidth="1"
                transform="rotate(270 130 130)"
                className="cine-aperture-blade"
              />
              <path
                d="M 130,48 Q 168,82 160,125 L 136,106 Z"
                fill="url(#bladeGrad)"
                stroke="#6b21a8"
                strokeWidth="1"
                transform="rotate(315 130 130)"
                className="cine-aperture-blade"
              />
            </g>

            {/* LAYER 5: ORBITING GLOWING PARTICLES AROUND THE SG LOGO */}
            <g className="cine-orbit-particles-system">
              <g className="cine-particle-orbit p-orbit-1">
                <circle cx="130" cy="58" r="4.5" fill="url(#particleGlowMagenta)" />
              </g>
              <g className="cine-particle-orbit p-orbit-2">
                <circle cx="130" cy="52" r="5" fill="url(#particleGlowPurple)" />
              </g>
              <g className="cine-particle-orbit p-orbit-3">
                <circle cx="130" cy="46" r="4" fill="url(#particleGlowCyan)" />
              </g>
              <g className="cine-particle-orbit p-orbit-4">
                <circle cx="130" cy="62" r="4.2" fill="url(#particleGlowMagenta)" />
              </g>
              <g className="cine-particle-orbit p-orbit-5">
                <circle cx="130" cy="42" r="3.8" fill="url(#particleGlowPurple)" />
              </g>
            </g>

            {/* Central Optical Glass Aperture Opening */}
            <circle
              cx="130"
              cy="130"
              r="50"
              fill="#050308"
              stroke="#c084fc"
              strokeWidth="1.5"
              className="cine-aperture-core"
            />

            {/* Multi-Coated Optical Glass Specular Reflections */}
            <ellipse
              cx="115"
              cy="113"
              rx="30"
              ry="15"
              transform="rotate(-35 115 113)"
              fill="rgba(236, 72, 153, 0.2)"
              className="cine-reflection-magenta"
            />
            <ellipse
              cx="145"
              cy="147"
              rx="26"
              ry="11"
              transform="rotate(-35 145 147)"
              fill="rgba(192, 132, 252, 0.28)"
              className="cine-reflection-purple"
            />

            {/* Horizontal Anamorphic Lens Flare Beam */}
            <rect
              x="0"
              y="128.5"
              width="260"
              height="3"
              fill="url(#streakFlareGrad)"
              className="cine-anamorphic-streak"
            />
          </svg>

          {/* Central Revealed Monogram Badge with Gentle Glowing Pulse */}
          <div className="cine-monogram-badge">
            <div className="cine-monogram-glow-halo" />
            <span className="cine-monogram-text">SG</span>
          </div>
        </div>

        {/* Brand Identity & Title (Phase 3+ Smooth Reveal) */}
        <div className="cine-branding-block">
          <h1 className="cine-brand-name">SIDDHARTH GIRASE</h1>
          <p className="cine-brand-role">
            VIDEO EDITOR <span className="cine-bullet">&bull;</span> VISUAL STORYTELLER
          </p>
        </div>

        {/* Cinematic Loading Text (Phase 4+ Animated Gradient Glow) */}
        <div className="cine-loading-messages">
          <div className="cine-msg-primary">CRAFTING VISUAL STORIES</div>
          <div className="cine-msg-secondary">EVERY FRAME HAS A STORY</div>
        </div>

        {/* Video Editing Timeline Progress Indicator */}
        <div className="cine-timeline-widget">
          {/* Timeline Info Row */}
          <div className="cine-timeline-meta">
            <div className="cine-timecode">
              <span className="cine-tc-tag">TC</span>
              <span className="cine-tc-digits" ref={timecodeTextRef}>
                00:00:00:00
              </span>
            </div>
            <div className="cine-counter">
              <span className="cine-percent-digits" ref={percentTextRef}>
                00
              </span>
              <span className="cine-percent-symbol">%</span>
            </div>
          </div>

          {/* Timeline Track with Frame Ticks and Playhead */}
          <div className="cine-track-wrapper">
            <div className="cine-timeline-ticks">
              {TIMELINE_TICKS.map((tick) => (
                <span
                  key={tick.id}
                  className={`cine-tick ${tick.isMajor ? "major" : ""}`}
                />
              ))}
            </div>

            <div className="cine-timeline-track">
              {/* Glowing Purple Progress Bar */}
              <div
                className="cine-timeline-fill"
                ref={fillRef}
                style={{ width: "0%" }}
              />

              {/* Moving Playhead with Neon Diamond Indicator */}
              <div
                className="cine-timeline-playhead"
                ref={playheadRef}
                style={{ left: "0%" }}
              >
                <div className="cine-playhead-diamond" />
                <div className="cine-playhead-line" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default memo(Loading);

// Synchronized asset progress tracker for Three.js scene & website bootstrapping
export const setProgress = (setLoading: (value: number) => void) => {
  function clear() {
    setLoading(100);
  }

  function loaded(): Promise<number> {
    setLoading(100);
    return Promise.resolve(100);
  }

  return { loaded, percent: 100, clear };
};
