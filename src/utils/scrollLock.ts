import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap-trial/ScrollSmoother";
import { smoother } from "../components/Navbar";

let lockCount = 0;
let savedScrollPosition = 0;

/**
 * Safely retrieves the active ScrollSmoother instance if available.
 */
function getActiveSmoother(): ScrollSmoother | null {
  if (typeof smoother !== "undefined" && smoother && typeof smoother.paused === "function") {
    return smoother;
  }
  try {
    const active = ScrollSmoother.get();
    if (active && typeof active.paused === "function") {
      return active;
    }
  } catch {
    // ScrollSmoother not loaded or unavailable
  }
  return null;
}

/**
 * Locks background scrolling when a modal or overlay opens.
 * Uses reference counting so nested or repeated calls do not corrupt state.
 */
export function lockScroll(): void {
  lockCount++;

  // Only perform the lock on the first request
  if (lockCount === 1) {
    const sm = getActiveSmoother();

    // 1. Capture current scroll position accurately
    let currentY = window.scrollY || document.documentElement.scrollTop || 0;
    if (sm && typeof sm.scrollTop === "function") {
      try {
        const smootherY = sm.scrollTop();
        if (typeof smootherY === "number" && !isNaN(smootherY)) {
          currentY = smootherY;
        }
      } catch {
        // Fallback to window.scrollY
      }
    }
    savedScrollPosition = currentY;

    // 2. Mark body with locking class for CSS overrides
    document.body.classList.add("modal-scroll-locked");
    document.body.classList.add("video-modal-open");

    // 3. Pause ScrollSmoother if active so wheel/touch don't move background
    if (sm) {
      try {
        sm.paused(true);
      } catch (err) {
        console.warn("Failed to pause smoother:", err);
      }
    }

    // 4. Prevent background scrolling on mobile / standard scroll
    document.body.style.overflow = "hidden";
    document.body.style.overflowY = "hidden";
    document.documentElement.style.overflow = "hidden";
  }
}

/**
 * Unlocks background scrolling when a modal or overlay closes.
 * Fully restores body/html overflow, unpauses ScrollSmoother, restores scroll position,
 * and refreshes ScrollTrigger so mouse wheel and touch scrolling work immediately.
 */
export function unlockScroll(force: boolean = false): void {
  if (force) {
    lockCount = 0;
  } else {
    lockCount = Math.max(0, lockCount - 1);
  }

  // Only perform unlock when all locks have been released
  if (lockCount === 0) {
    const sm = getActiveSmoother();

    // 1. Remove scroll-lock and modal isolation classes
    document.body.classList.remove("modal-scroll-locked");
    document.body.classList.remove("video-modal-open");

    // 2. Clear inline lock styles and restore normal scrolling explicitly
    document.body.style.overflow = "";
    document.body.style.overflowY = "auto";
    document.body.style.overflowX = "hidden";
    document.body.style.touchAction = "";
    document.body.style.pointerEvents = "";

    document.documentElement.style.overflow = "";
    document.documentElement.style.overflowY = "";
    document.documentElement.style.overflowX = "";
    document.documentElement.style.touchAction = "";
    document.documentElement.style.pointerEvents = "";

    // 3. Unpause ScrollSmoother if active
    if (sm) {
      try {
        sm.paused(false);
      } catch (err) {
        console.warn("Failed to unpause smoother:", err);
      }
    }

    // 4. Restore exact scroll position
    if (sm && typeof sm.scrollTop === "function") {
      try {
        sm.scrollTop(savedScrollPosition);
      } catch {
        window.scrollTo(0, savedScrollPosition);
      }
    } else {
      window.scrollTo(0, savedScrollPosition);
    }

    // 5. Refresh ScrollTrigger calculations
    try {
      ScrollTrigger.refresh();
      ScrollTrigger.update();
    } catch {
      // ignore
    }

    // 6. Secondary assurance frame to guarantee smoothness on next animation tick
    requestAnimationFrame(() => {
      document.body.style.overflowY = "auto";
      document.body.style.overflowX = "hidden";
      if (sm) {
        try {
          sm.paused(false);
          if (typeof sm.scrollTop === "function" && Math.abs(sm.scrollTop() - savedScrollPosition) > 100) {
            sm.scrollTop(savedScrollPosition);
          }
        } catch {
          // ignore
        }
      }
    });
  }
}
