import { useEffect, useRef } from "react";
import "./styles/Cursor.css";
import gsap from "gsap";

const Cursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check touch devices
    const isTouch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches;

    if (isTouch) {
      if (cursorRef.current) cursorRef.current.style.display = "none";
      if (dotRef.current) dotRef.current.style.display = "none";
      return;
    }

    const cursor = cursorRef.current;
    const dot = dotRef.current;
    if (!cursor || !dot) return;

    const mousePos = { x: -100, y: -100 };
    const cursorPos = { x: -100, y: -100 };

    const onMouseMove = (e: MouseEvent) => {
      mousePos.x = e.clientX;
      mousePos.y = e.clientY;

      gsap.to(dot, {
        x: mousePos.x,
        y: mousePos.y,
        duration: 0.05,
      });
    };

    window.addEventListener("mousemove", onMouseMove);

    let animationFrameId: number;

    const renderLoop = () => {
      const delay = 6;
      cursorPos.x += (mousePos.x - cursorPos.x) / delay;
      cursorPos.y += (mousePos.y - cursorPos.y) / delay;

      gsap.to(cursor, {
        x: cursorPos.x,
        y: cursorPos.y,
        duration: 0.1,
      });

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    // Hover detection on interactive items
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(
        "button, a, input, select, textarea, [data-cursor], .video-project-card, .service-card, .tool-item-card"
      );

      if (target) {
        cursor.classList.add("cursor-hover");
      }
    };

    const handleMouseOut = () => {
      cursor.classList.remove("cursor-hover");
    };

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <div className="cursor-dot" ref={dotRef} />
      <div className="cursor-main" ref={cursorRef} />
    </>
  );
};

export default Cursor;
