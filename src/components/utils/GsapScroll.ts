import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function setCharTimeline(
  character: THREE.Object3D<THREE.Object3DEventMap> | null,
  camera: THREE.PerspectiveCamera
) {
  if (!character) return;

  // Clean up any existing character timelines to prevent duplication on resize / re-init
  ScrollTrigger.getById("charMasterTimeline")?.kill();
  ScrollTrigger.getById("charMobileTimeline")?.kill();

  const isDesktop = window.innerWidth > 1024;

  if (isDesktop) {
    // =======================================================================
    // DESKTOP: SINGLE CONTINUOUS 3D CAMERA MASTER SCROLL TIMELINE
    //
    // Matches the reference video choreography:
    // Phase 1 (0.0 -> 1.0): Hero -> About
    //   - Camera starts in center of Hero (x: 0%, scale: 1, forward facing)
    //   - Smoothly travels toward the left visual area of About (x: -25%)
    //   - Scale adjusts gradually from 1 to 0.90
    //   - Rotates to a front three-quarter angle (0.22 rad) showcasing the circular lens
    //   - Hero headings smoothly fade out
    //
    // Phase 2 (1.0 -> 2.2): Pinned in About Section
    //   - Camera remains PINNED / STICKY on the left while About content scrolls on the right
    //   - Stays at x: -25%, scale: 0.90, opacity: 1
    //   - Camera does NOT cover About text, cards or editing timeline
    //   - Cursor-following interaction continues smoothly in Three.js
    //
    // Phase 3 (2.2 -> 3.0): About -> Showreel Exit
    //   - Smoothly floats upward (y: -140px) and fades out completely (opacity: 0)
    //   - Clears the viewport before Showreel ("MY CREATIVE UNIVERSE") enters
    //
    // Phase 4: Scroll Up
    //   - Reverses naturally with GSAP scrub, returning from About to Hero center
    // =======================================================================

    const masterTl = gsap.timeline({
      id: "charMasterTimeline",
      scrollTrigger: {
        trigger: ".landing-section",
        start: "top top",
        endTrigger: ".about-section",
        end: "bottom 25%",
        scrub: 1.2,
        invalidateOnRefresh: true,
      },
    });

    masterTl
      // ---------------------------------------------------------------------
      // PHASE 1: HERO TO ABOUT TRAVEL (Time: 0.0 -> 1.0)
      // ---------------------------------------------------------------------
      .fromTo(
        ".character-model",
        { x: "0%", y: "0%", scale: 1, opacity: 1 },
        { x: "-25%", y: "0%", scale: 0.90, opacity: 1, duration: 1.0, ease: "power1.inOut" },
        0
      )
      .to(
        camera.position,
        { z: 2.65, y: 1.22, duration: 1.0, ease: "power1.inOut" },
        0
      )
      .fromTo(
        character.rotation,
        { y: 0 },
        { y: 0.08, duration: 1.0, ease: "power1.inOut" },
        0
      )
      .to(
        ".landing-container",
        { opacity: 0, y: "25%", duration: 0.6, ease: "power1.in" },
        0
      )

      // ---------------------------------------------------------------------
      // PHASE 2: PINNED / HELD IN ABOUT (Time: 1.0 -> 2.2)
      // Holds the camera firmly on the left while user reads About section!
      // ---------------------------------------------------------------------
      .to(
        ".character-model",
        { x: "-25%", y: "0%", scale: 0.90, opacity: 1, duration: 1.2, ease: "none" },
        1.0
      )
      .to(
        camera.position,
        { z: 2.65, y: 1.22, duration: 1.2, ease: "none" },
        1.0
      )
      .to(
        character.rotation,
        { y: 0.08, duration: 1.2, ease: "none" },
        1.0
      )

      // ---------------------------------------------------------------------
      // PHASE 3: ABOUT TO SHOWREEL EXIT (Time: 2.2 -> 3.0)
      // Smoothly glides up and fades out before Showreel section arrives
      // ---------------------------------------------------------------------
      .to(
        ".character-model",
        {
          y: "-140px",
          opacity: 0,
          scale: 0.82,
          duration: 0.8,
          ease: "power2.inOut",
        },
        2.2
      )
      .to(
        character.rotation,
        {
          y: 0.25,
          duration: 0.8,
          ease: "power1.inOut",
        },
        2.2
      );
  } else {
    // =======================================================================
    // MOBILE / TABLET CONTINUOUS SCROLL TIMELINE (width <= 1024px)
    // =======================================================================
    const mobileTl = gsap.timeline({
      id: "charMobileTimeline",
      scrollTrigger: {
        trigger: ".landing-section",
        start: "top top",
        endTrigger: ".about-section",
        end: "bottom 20%",
        scrub: 1.2,
        invalidateOnRefresh: true,
      },
    });

    mobileTl
      // Phase 1: Hero to About Top Showcase
      .fromTo(
        ".character-model",
        { x: "0%", y: "0%", scale: 1, opacity: 1 },
        { x: "0%", y: "-6%", scale: 0.72, opacity: 1, duration: 1.0, ease: "power1.inOut" },
        0
      )
      .to(camera.position, { z: 3.5, y: 1.18, duration: 1.0, ease: "power1.inOut" }, 0)
      .to(".landing-container", { opacity: 0, y: "20%", duration: 0.5 }, 0)

      // Phase 2: Hold in About Top
      .to(
        ".character-model",
        { x: "0%", y: "-6%", scale: 0.72, opacity: 1, duration: 1.0, ease: "none" },
        1.0
      )

      // Phase 3: Exit to Showreel
      .to(
        ".character-model",
        {
          y: "-60px",
          opacity: 0,
          scale: 0.60,
          duration: 0.8,
          ease: "power2.inOut",
        },
        2.0
      );
  }
}

export function setAllTimeline() {
  const careerTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: ".career-section",
      start: "top 60%",
      end: "bottom center",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });

  careerTimeline
    .fromTo(
      ".career-timeline",
      { maxHeight: "10%" },
      { maxHeight: "100%", duration: 0.5 },
      0
    )
    .fromTo(
      ".career-timeline",
      { opacity: 0 },
      { opacity: 1, duration: 0.1 },
      0
    )
    .fromTo(
      ".career-info-box",
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, stagger: 0.15, duration: 0.5 },
      0
    )
    .fromTo(
      ".career-dot",
      { animationIterationCount: "infinite" },
      {
        animationIterationCount: "1",
        delay: 0.3,
        duration: 0.1,
      },
      0
    );
}
