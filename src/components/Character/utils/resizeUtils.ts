import * as THREE from "three";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setCharTimeline, setAllTimeline } from "../../utils/GsapScroll";

export default function handleResize(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  canvasDiv: React.RefObject<HTMLDivElement>,
  character: THREE.Object3D
) {
  if (!canvasDiv.current) return;
  const canvas3d = canvasDiv.current.getBoundingClientRect();
  const width = canvas3d.width || window.innerWidth;
  const height = canvas3d.height || window.innerHeight;
  const aspect = width / height;
  const isMobile = window.innerWidth <= 1024;

  renderer.setSize(width, height);
  camera.aspect = aspect;

  if (isMobile) {
    camera.position.set(0, 1.18, aspect < 0.6 ? 3.6 : 3.2);
    camera.lookAt(0, 1.16, 0);
    camera.fov = 26;
  } else {
    camera.position.set(0, 1.25, 2.45);
    camera.lookAt(0, 1.22, 0);
    camera.fov = 24;
  }
  camera.updateProjectionMatrix();

  const workTrigger = ScrollTrigger.getById("work");
  ScrollTrigger.getAll().forEach((trigger) => {
    if (trigger !== workTrigger) {
      trigger.kill();
    }
  });
  setCharTimeline(character, camera);
  setAllTimeline();
}
