import * as THREE from "three";
import { RGBELoader } from "three-stdlib";
import { gsap } from "gsap";

const setLighting = (scene: THREE.Scene) => {
  // 1. Soft purple ambient lighting (diffuse base subtly lifted to reveal camera chassis & body details)
  const ambientLight = new THREE.AmbientLight(0x2e1065, 0.64);
  scene.add(ambientLight);

  // 2. Studio key directional light (neutral soft white/lavender for crisp metallic bevels & lens definition)
  const directionalLight = new THREE.DirectionalLight(0xf5f3ff, 1.10);
  directionalLight.position.set(-1.2, 3.4, 2.8);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 30;
  directionalLight.shadow.bias = -0.0005;
  scene.add(directionalLight);

  // 3. Subtle magenta rim light (crisp silhouette separation along top & right gimbal arm)
  const rimLight = new THREE.DirectionalLight(0xec4899, 1.48);
  rimLight.position.set(2.4, 2.6, -2.0);
  scene.add(rimLight);

  // 4. Subtle violet rim fill (edge separation along operator panel and battery plate)
  const leftRimLight = new THREE.DirectionalLight(0xa855f7, 1.18);
  leftRimLight.position.set(-2.4, 2.2, -1.8);
  scene.add(leftRimLight);

  // 5. Gentle front optical fill (reveals lens glass depth and iris without harsh flare)
  const frontFill = new THREE.PointLight(0xc084fc, 0.92, 4.8, 2);
  frontFill.position.set(0, 1.35, 1.4);
  scene.add(frontFill);

  // 6. Natural soft contact shadow directly beneath gimbal base (y: 0)
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext("2d")!;
  const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(0, 0, 0, 0.70)");
  grad.addColorStop(0.4, "rgba(18, 10, 30, 0.40)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 128, 128);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowGeo = new THREE.PlaneGeometry(0.85, 0.85);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.80,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, 0.005, 0);
  scene.add(contactShadow);

  // Environment reflections (subtle, balanced metallic sheen on hardware)
  new RGBELoader()
    .setPath("/models/")
    .load("char_enviorment.hdr", function (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
      scene.environmentIntensity = 0.50;
      scene.environmentRotation.set(5.76, 85.85, 1);
    });

  const duration = 2;
  const ease = "power2.inOut";
  function turnOnLights() {
    gsap.to(scene, {
      environmentIntensity: 0.54,
      duration: duration,
      ease: ease,
    });
    gsap.to(directionalLight, {
      intensity: 1.15,
      duration: duration,
      ease: ease,
    });
    gsap.to(rimLight, {
      intensity: 1.52,
      duration: duration,
      ease: ease,
    });
  }

  return { turnOnLights };
};

export default setLighting;
