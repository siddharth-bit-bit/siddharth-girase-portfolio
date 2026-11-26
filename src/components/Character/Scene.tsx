import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import setCharacter from "./utils/character";
import setLighting from "./utils/lighting";
import {
  CinemaCameraGimbalRig,
  animateCinemaCameraGimbal,
} from "./utils/cinemaCameraGimbal";
import { useLoading } from "../../context/LoadingProvider";
import handleResize from "./utils/resizeUtils";
import { handleMouseMove } from "./utils/mouseUtils";
import { setProgress } from "../Loading";

const Scene = () => {
  const canvasDiv = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef(new THREE.Scene());
  const { setLoading } = useLoading();

  const [_character, setChar] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    if (canvasDiv.current) {
      const rect = canvasDiv.current.getBoundingClientRect();
      const container = {
        width: rect.width || window.innerWidth,
        height: rect.height || window.innerHeight,
      };
      const aspect = container.width / container.height;
      const scene = sceneRef.current;
      const isMobile = window.innerWidth <= 1024;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(container.width, container.height);
      // Optimize pixel ratio: cap at 1.5 on mobile to prevent GPU lag / context loss
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
      renderer.setClearColor(0x000000, 0); // 100% transparent canvas
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.00; // Balanced cinematic exposure preventing clipped highlights and maintaining rich dark contrast
      canvasDiv.current.appendChild(renderer.domElement);

      // Heroic camera framing of the cinema camera & 3-axis motorized gimbal
      // Dynamically adjusted for portrait mobile screens vs wide desktop screens
      const camera = new THREE.PerspectiveCamera(
        isMobile ? 26 : 24,
        aspect,
        0.1,
        100
      );
      if (isMobile) {
        camera.position.set(0, 1.18, aspect < 0.6 ? 3.6 : 3.2);
        camera.lookAt(0, 1.16, 0);
      } else {
        camera.position.set(0, 1.25, 2.45);
        camera.lookAt(0, 1.22, 0);
      }
      camera.updateProjectionMatrix();

      let gimbalRig: CinemaCameraGimbalRig | null = null;
      const clock = new THREE.Clock();

      const light = setLighting(scene);
      const progress = setProgress((value) => setLoading(value));
      const { loadCharacter } = setCharacter(renderer, scene, camera);

      loadCharacter().then(({ rig, scene: cameraRigObj }) => {
        gimbalRig = rig;
        setChar(cameraRigObj);

        // Pre-warm WebGL shader pipeline with a single frame upload to eliminate exit freeze
        try {
          renderer.render(scene, camera);
        } catch (_) {}

        progress.loaded().then(() => {
          setTimeout(() => {
            light.turnOnLights();
          }, 300);
        });

        window.addEventListener("resize", () =>
          handleResize(renderer, camera, canvasDiv, cameraRigObj)
        );
      });

      let mouse = { x: 0, y: 0 };

      // Desktop Mouse Tracking
      const onMouseMove = (event: MouseEvent) => {
        if (document.body.classList.contains("video-modal-open")) return;
        handleMouseMove(event, (x, y) => (mouse = { x, y }));
      };

      const onMouseLeave = () => {
        // Return gracefully to default 3/4 position when cursor leaves Hero
        mouse = { x: 0, y: 0 };
      };

      // Responsive Mobile Touch Interaction
      let isTouching = false;

      const onTouchStart = (event: TouchEvent) => {
        if (document.body.classList.contains("video-modal-open")) return;
        if (event.touches.length > 0) {
          isTouching = true;
          const touch = event.touches[0];
          const mx = (touch.clientX / window.innerWidth) * 2 - 1;
          const my = -(touch.clientY / window.innerHeight) * 2 + 1;
          mouse = {
            x: Math.max(-1, Math.min(1, mx * 1.15)),
            y: Math.max(-1, Math.min(1, my * 1.15)),
          };
        }
      };

      const onTouchMove = (event: TouchEvent) => {
        if (document.body.classList.contains("video-modal-open")) return;
        if (!isTouching || event.touches.length === 0) return;
        const touch = event.touches[0];
        const mx = (touch.clientX / window.innerWidth) * 2 - 1;
        const my = -(touch.clientY / window.innerHeight) * 2 + 1;
        mouse = {
          x: Math.max(-1, Math.min(1, mx * 1.15)),
          y: Math.max(-1, Math.min(1, my * 1.15)),
        };
      };

      const onTouchEnd = () => {
        isTouching = false;
        // Smoothly float back to neutral forward 3/4 position
        mouse = { x: 0, y: 0 };
      };

      // Handle WebGL context recovery on mobile devices
      const onContextLost = (e: Event) => {
        e.preventDefault();
        console.warn("WebGL Context Lost on mobile device");
      };
      renderer.domElement.addEventListener("webglcontextlost", onContextLost);

      // Document-wide cursor & touch tracking across Hero, Transition & About
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseleave", onMouseLeave);
      window.addEventListener("blur", onMouseLeave);
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("touchend", onTouchEnd, { passive: true });
      window.addEventListener("touchcancel", onTouchEnd, { passive: true });

      // Performance: Pause rendering when user scrolls deep past the About section
      let isSceneActive = true;
      const onScrollCheck = () => {
        isSceneActive = window.scrollY < window.innerHeight * 2.8;
      };
      window.addEventListener("scroll", onScrollCheck, { passive: true });

      let animFrameId: number;
      let hasPrewarmed = false;

      const animate = () => {
        animFrameId = requestAnimationFrame(animate);
        // Pause rendering, cursor tracking, and GPU load while past About OR while video modal is active
        if (
          !isSceneActive ||
          document.body.classList.contains("video-modal-open")
        ) {
          return;
        }

        // While the loading screen is fully covering the viewport in earlier phases,
        // do not burn GPU fill-rate. As soon as Phase 4 / exit triggers, resume full 60 FPS
        // so the camera is already rotating smoothly before the loader fades out!
        const loaderScreen = document.querySelector(".cine-loader-screen");
        if (
          loaderScreen &&
          !loaderScreen.classList.contains("cine-fade-out") &&
          !loaderScreen.classList.contains("phase-4") &&
          !loaderScreen.classList.contains("cine-complete")
        ) {
          if (!hasPrewarmed && gimbalRig) {
            hasPrewarmed = true;
            try {
              renderer.render(scene, camera);
            } catch (_) {}
          }
          return;
        }

        const elapsedTime = clock.getElapsedTime();

        if (gimbalRig) {
          animateCinemaCameraGimbal(gimbalRig, elapsedTime, mouse);
        }

        renderer.render(scene, camera);
      };
      animate();

      return () => {
        if (animFrameId) {
          cancelAnimationFrame(animFrameId);
        }
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseleave", onMouseLeave);
        window.removeEventListener("blur", onMouseLeave);
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
        window.removeEventListener("touchcancel", onTouchEnd);
        window.removeEventListener("scroll", onScrollCheck);
        renderer.domElement.removeEventListener("webglcontextlost", onContextLost);

        scene.clear();
        renderer.dispose();
        window.removeEventListener("resize", () =>
          handleResize(renderer, camera, canvasDiv, _character!)
        );
        if (
          canvasDiv.current &&
          renderer.domElement.parentNode === canvasDiv.current
        ) {
          canvasDiv.current.removeChild(renderer.domElement);
        }
      };
    }
  }, []);

  return (
    <>
      <div className="character-model">
        <div className="character-rim"></div>
        <div className="character-hover"></div>
        <div ref={canvasDiv}></div>
      </div>
    </>
  );
};

export default Scene;
