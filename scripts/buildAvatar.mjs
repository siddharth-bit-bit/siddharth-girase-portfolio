import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import * as fs from 'fs';
import * as path from 'path';

// Polyfill FileReader for Node.js
if (typeof global.FileReader === 'undefined') {
  global.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onload) this.onload({ target: this });
      });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = 'data:application/octet-stream;base64,' + Buffer.from(buf).toString('base64');
        if (this.onload) this.onload({ target: this });
      });
    }
  };
}

// Helper to create smoothed BufferGeometry with normals and UVs
function createSmoothGeometry(geom) {
  geom.computeVertexNormals();
  return geom;
}

// Materials
const matJacket = new THREE.MeshStandardMaterial({
  name: 'Mat_TechwearJacket',
  color: 0x14111a,
  roughness: 0.45,
  metalness: 0.25,
});

const matInner = new THREE.MeshStandardMaterial({
  name: 'Mat_TechwearInner',
  color: 0x0c0a10,
  roughness: 0.7,
  metalness: 0.1,
});

const matPants = new THREE.MeshStandardMaterial({
  name: 'Mat_TacticalPants',
  color: 0x110f17,
  roughness: 0.5,
  metalness: 0.2,
});

const matSkin = new THREE.MeshStandardMaterial({
  name: 'Mat_StylizedSkin',
  color: 0xdeb896,
  roughness: 0.55,
  metalness: 0.05,
});

const matHair = new THREE.MeshStandardMaterial({
  name: 'Mat_SleekHair',
  color: 0x191522,
  roughness: 0.35,
  metalness: 0.3,
});

const matNeonPurple = new THREE.MeshStandardMaterial({
  name: 'Mat_NeonPurple',
  color: 0xc084fc,
  emissive: 0xa855f7,
  emissiveIntensity: 2.8,
  roughness: 0.2,
});

const matNeonMagenta = new THREE.MeshStandardMaterial({
  name: 'Mat_NeonMagenta',
  color: 0xf472b6,
  emissive: 0xec4899,
  emissiveIntensity: 2.8,
  roughness: 0.2,
});

const matHardware = new THREE.MeshStandardMaterial({
  name: 'Mat_Hardware',
  color: 0x4a4458,
  roughness: 0.25,
  metalness: 0.85,
});

const matBoots = new THREE.MeshStandardMaterial({
  name: 'Mat_CyberBoots',
  color: 0x0d0b12,
  roughness: 0.35,
  metalness: 0.4,
});

const matEyeCornea = new THREE.MeshStandardMaterial({
  name: 'Mat_EyeCornea',
  color: 0xffffff,
  roughness: 0.05,
  metalness: 0.1,
});

const matEyeIris = new THREE.MeshStandardMaterial({
  name: 'Mat_EyeIris',
  color: 0x3b1d70,
  roughness: 0.2,
  metalness: 0.2,
});

export function buildFuturisticAvatar() {
  const root = new THREE.Group();
  root.name = 'FuturisticAvatar';

  // 1. Hips / Pelvis (Origin around y = 0.95m)
  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.set(0, 0.95, 0);
  root.add(hips);

  const pelvisMesh = new THREE.Mesh(
    createSmoothGeometry(new THREE.CylinderGeometry(0.18, 0.16, 0.2, 16)),
    matPants
  );
  pelvisMesh.name = 'mesh_pelvis';
  hips.add(pelvisMesh);

  // Tactical Belt & Buckle
  const beltMesh = new THREE.Mesh(
    createSmoothGeometry(new THREE.CylinderGeometry(0.185, 0.185, 0.05, 16)),
    matHardware
  );
  beltMesh.position.y = 0.08;
  hips.add(beltMesh);

  const buckle = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.08, 0.06, 0.03)),
    matHardware
  );
  buckle.position.set(0, 0.08, 0.19);
  hips.add(buckle);

  // 2. Spine & Chest (y = 0.15 relative to hips)
  const spine = new THREE.Group();
  spine.name = 'spine';
  spine.position.set(0, 0.15, 0);
  hips.add(spine);

  const chest = new THREE.Group();
  chest.name = 'chest';
  chest.position.set(0, 0.22, 0);
  spine.add(chest);

  // Torso / Jacket Main Body
  const torsoGeom = createSmoothGeometry(new THREE.CylinderGeometry(0.24, 0.18, 0.42, 18));
  const torsoMesh = new THREE.Mesh(torsoGeom, matJacket);
  torsoMesh.position.set(0, 0.08, 0);
  torsoMesh.scale.set(1, 1, 0.82); // athletic flattened chest profile
  chest.add(torsoMesh);

  // Inner compression shirt V-neck panel
  const innerShirt = new THREE.Mesh(
    createSmoothGeometry(new THREE.PlaneGeometry(0.12, 0.22)),
    matInner
  );
  innerShirt.position.set(0, 0.15, 0.155);
  chest.add(innerShirt);

  // Techwear High Standing Collar
  const collarGeom = createSmoothGeometry(new THREE.CylinderGeometry(0.14, 0.16, 0.14, 16, 1, true, -Math.PI * 0.75, Math.PI * 1.5));
  const collarMesh = new THREE.Mesh(collarGeom, matJacket);
  collarMesh.position.set(0, 0.32, -0.01);
  chest.add(collarMesh);

  // Glowing Purple Neon Piping along Collar Rim
  const collarPiping = new THREE.Mesh(
    createSmoothGeometry(new THREE.TorusGeometry(0.14, 0.008, 8, 24, Math.PI * 1.5)),
    matNeonPurple
  );
  collarPiping.position.set(0, 0.38, -0.01);
  collarPiping.rotation.x = Math.PI / 2;
  collarPiping.rotation.z = Math.PI * 0.25;
  chest.add(collarPiping);

  // Asymmetric Chest Harness & Shoulder Pauldrons
  const harnessStrap = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.045, 0.45, 0.015)),
    matHardware
  );
  harnessStrap.position.set(-0.08, 0.08, 0.15);
  harnessStrap.rotation.z = 0.32;
  chest.add(harnessStrap);

  const chestLightStrip = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.015, 0.18, 0.01)),
    matNeonMagenta
  );
  chestLightStrip.position.set(0.06, 0.12, 0.152);
  chest.add(chestLightStrip);

  // Shoulder Pauldrons
  const leftPauldron = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.12, 0.06, 0.16)),
    matJacket
  );
  leftPauldron.position.set(-0.26, 0.26, 0);
  leftPauldron.rotation.z = 0.2;
  chest.add(leftPauldron);

  const rightPauldron = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.12, 0.06, 0.16)),
    matJacket
  );
  rightPauldron.position.set(0.26, 0.26, 0);
  rightPauldron.rotation.z = -0.2;
  chest.add(rightPauldron);

  // Pauldron Neon Accent Lines
  const pauldronLineL = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.122, 0.008, 0.02)),
    matNeonPurple
  );
  pauldronLineL.position.set(-0.26, 0.28, 0.07);
  pauldronLineL.rotation.z = 0.2;
  chest.add(pauldronLineL);

  const pauldronLineR = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.122, 0.008, 0.02)),
    matNeonPurple
  );
  pauldronLineR.position.set(0.26, 0.28, 0.07);
  pauldronLineR.rotation.z = -0.2;
  chest.add(pauldronLineR);

  // 3. Neck & Head
  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.set(0, 0.34, 0);
  chest.add(neck);

  const neckMesh = new THREE.Mesh(
    createSmoothGeometry(new THREE.CylinderGeometry(0.075, 0.09, 0.14, 16)),
    matSkin
  );
  neckMesh.position.set(0, 0.06, 0);
  neck.add(neckMesh);

  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.15, 0);
  neck.add(head);

  // Stylized Human Cranium & Face
  const craniumGeom = createSmoothGeometry(new THREE.SphereGeometry(0.13, 24, 20));
  const craniumMesh = new THREE.Mesh(craniumGeom, matSkin);
  craniumMesh.scale.set(0.9, 1.05, 1.0);
  head.add(craniumMesh);

  // Chiseled Jawline & Chin
  const jawGeom = createSmoothGeometry(new THREE.ConeGeometry(0.11, 0.14, 5));
  const jawMesh = new THREE.Mesh(jawGeom, matSkin);
  jawMesh.position.set(0, -0.06, 0.035);
  jawMesh.rotation.x = -Math.PI;
  jawMesh.rotation.y = Math.PI / 5;
  jawMesh.scale.set(0.95, 1, 0.7);
  head.add(jawMesh);

  // Nose Bridge
  const nose = new THREE.Mesh(
    createSmoothGeometry(new THREE.ConeGeometry(0.022, 0.06, 4)),
    matSkin
  );
  nose.position.set(0, -0.01, 0.135);
  nose.rotation.x = Math.PI * 0.55;
  head.add(nose);

  // Eyes & Eyebrows
  const eyeL = new THREE.Group();
  eyeL.name = 'eye_L';
  eyeL.position.set(-0.045, 0.015, 0.105);
  head.add(eyeL);

  const eyeScleraL = new THREE.Mesh(
    createSmoothGeometry(new THREE.SphereGeometry(0.018, 12, 10)),
    matEyeCornea
  );
  eyeL.add(eyeScleraL);

  const eyeIrisL = new THREE.Mesh(
    createSmoothGeometry(new THREE.CircleGeometry(0.009, 12)),
    matEyeIris
  );
  eyeIrisL.position.set(0, 0, 0.017);
  eyeL.add(eyeIrisL);

  const eyeR = new THREE.Group();
  eyeR.name = 'eye_R';
  eyeR.position.set(0.045, 0.015, 0.105);
  head.add(eyeR);

  const eyeScleraR = new THREE.Mesh(
    createSmoothGeometry(new THREE.SphereGeometry(0.018, 12, 10)),
    matEyeCornea
  );
  eyeR.add(eyeScleraR);

  const eyeIrisR = new THREE.Mesh(
    createSmoothGeometry(new THREE.CircleGeometry(0.009, 12)),
    matEyeIris
  );
  eyeIrisR.position.set(0, 0, 0.017);
  eyeR.add(eyeIrisR);

  // Sleek Eyebrows
  const browL = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.035, 0.007, 0.01)),
    matHair
  );
  browL.position.set(-0.045, 0.038, 0.118);
  browL.rotation.z = 0.1;
  head.add(browL);

  const browR = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.035, 0.007, 0.01)),
    matHair
  );
  browR.position.set(0.045, 0.038, 0.118);
  browR.rotation.z = -0.1;
  head.add(browR);

  // Modern Hairstyling (Textured Side-Parted Undercut with Cyberpunk Fade)
  const hairBase = new THREE.Mesh(
    createSmoothGeometry(new THREE.SphereGeometry(0.138, 20, 16)),
    matHair
  );
  hairBase.position.set(0, 0.04, -0.015);
  hairBase.scale.set(0.92, 0.95, 1.05);
  head.add(hairBase);

  // Top Volume / Textured Strands
  const hairTop = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.18, 0.08, 0.22)),
    matHair
  );
  hairTop.position.set(-0.02, 0.14, -0.01);
  hairTop.rotation.z = -0.15;
  hairTop.rotation.y = 0.1;
  head.add(hairTop);

  // Side Fade Sweep
  const hairSweep = new THREE.Mesh(
    createSmoothGeometry(new THREE.ConeGeometry(0.06, 0.14, 5)),
    matHair
  );
  hairSweep.position.set(0.06, 0.12, 0.06);
  hairSweep.rotation.set(-0.4, 0.3, -1.2);
  head.add(hairSweep);

  // Cybernetic Ear Communicator & Glowing LED Ring (Right Ear)
  const earComms = new THREE.Group();
  earComms.name = 'earpiece';
  earComms.position.set(0.12, 0, 0);
  head.add(earComms);

  const commsBase = new THREE.Mesh(
    createSmoothGeometry(new THREE.CylinderGeometry(0.025, 0.025, 0.015, 12)),
    matHardware
  );
  commsBase.rotation.z = Math.PI / 2;
  earComms.add(commsBase);

  const commsRing = new THREE.Mesh(
    createSmoothGeometry(new THREE.TorusGeometry(0.022, 0.004, 8, 16)),
    matNeonMagenta
  );
  commsRing.rotation.y = Math.PI / 2;
  earComms.add(commsRing);

  // 4. Arms & Techwear Sleeves
  // Left Arm
  const armL = new THREE.Group();
  armL.name = 'shoulder_L';
  armL.position.set(-0.25, 0.24, 0);
  chest.add(armL);

  const upperArmMeshL = new THREE.Mesh(
    createSmoothGeometry(new THREE.CylinderGeometry(0.07, 0.06, 0.28, 12)),
    matJacket
  );
  upperArmMeshL.position.set(0, -0.14, 0);
  armL.add(upperArmMeshL);

  const forearmL = new THREE.Group();
  forearmL.name = 'forearm_L';
  forearmL.position.set(0, -0.28, 0);
  armL.add(forearmL);

  const forearmMeshL = new THREE.Mesh(
    createSmoothGeometry(new THREE.CylinderGeometry(0.06, 0.05, 0.26, 12)),
    matJacket
  );
  forearmMeshL.position.set(0, -0.13, 0);
  forearmL.add(forearmMeshL);

  // Cybernetic Forearm Status Light Strip
  const armLightL = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.01, 0.14, 0.015)),
    matNeonPurple
  );
  armLightL.position.set(-0.055, -0.12, 0);
  forearmL.add(armLightL);

  // Left Hand (Gloves)
  const handL = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.06, 0.1, 0.04)),
    matHardware
  );
  handL.name = 'hand_L';
  handL.position.set(0, -0.3, 0);
  forearmL.add(handL);

  // Right Arm
  const armR = new THREE.Group();
  armR.name = 'shoulder_R';
  armR.position.set(0.25, 0.24, 0);
  chest.add(armR);

  const upperArmMeshR = new THREE.Mesh(
    createSmoothGeometry(new THREE.CylinderGeometry(0.07, 0.06, 0.28, 12)),
    matJacket
  );
  upperArmMeshR.position.set(0, -0.14, 0);
  armR.add(upperArmMeshR);

  const forearmR = new THREE.Group();
  forearmR.name = 'forearm_R';
  forearmR.position.set(0, -0.28, 0);
  armR.add(forearmR);

  const forearmMeshR = new THREE.Mesh(
    createSmoothGeometry(new THREE.CylinderGeometry(0.06, 0.05, 0.26, 12)),
    matJacket
  );
  forearmMeshR.position.set(0, -0.13, 0);
  forearmR.add(forearmMeshR);

  // Cybernetic Forearm Status Light Strip
  const armLightR = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.01, 0.14, 0.015)),
    matNeonPurple
  );
  armLightR.position.set(0.055, -0.12, 0);
  forearmR.add(armLightR);

  // Right Hand (Gloves)
  const handR = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.06, 0.1, 0.04)),
    matHardware
  );
  handR.name = 'hand_R';
  handR.position.set(0, -0.3, 0);
  forearmR.add(handR);

  // 5. Legs & Cyber Boots
  // Left Leg
  const legL = new THREE.Group();
  legL.name = 'thigh_L';
  legL.position.set(-0.11, -0.08, 0);
  hips.add(legL);

  const thighMeshL = new THREE.Mesh(
    createSmoothGeometry(new THREE.CylinderGeometry(0.09, 0.075, 0.42, 14)),
    matPants
  );
  thighMeshL.position.set(0, -0.2, 0);
  legL.add(thighMeshL);

  // Knee Pad Armor
  const kneePadL = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.09, 0.09, 0.04)),
    matHardware
  );
  kneePadL.position.set(0, -0.4, 0.065);
  legL.add(kneePadL);

  const calfL = new THREE.Group();
  calfL.name = 'calf_L';
  calfL.position.set(0, -0.42, 0);
  legL.add(calfL);

  const calfMeshL = new THREE.Mesh(
    createSmoothGeometry(new THREE.CylinderGeometry(0.075, 0.065, 0.38, 14)),
    matPants
  );
  calfMeshL.position.set(0, -0.18, 0);
  calfL.add(calfMeshL);

  // High-Top Cyber Sneaker Boot
  const bootL = new THREE.Group();
  bootL.name = 'foot_L';
  bootL.position.set(0, -0.36, 0.04);
  calfL.add(bootL);

  const bootUpperL = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.1, 0.12, 0.22)),
    matBoots
  );
  bootL.add(bootUpperL);

  // Glowing Neon Purple Sole Tread
  const bootSoleL = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.106, 0.025, 0.23)),
    matNeonPurple
  );
  bootSoleL.position.set(0, -0.06, 0.01);
  bootL.add(bootSoleL);

  // Right Leg
  const legR = new THREE.Group();
  legR.name = 'thigh_R';
  legR.position.set(0.11, -0.08, 0);
  hips.add(legR);

  const thighMeshR = new THREE.Mesh(
    createSmoothGeometry(new THREE.CylinderGeometry(0.09, 0.075, 0.42, 14)),
    matPants
  );
  thighMeshR.position.set(0, -0.2, 0);
  legR.add(thighMeshR);

  // Knee Pad Armor
  const kneePadR = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.09, 0.09, 0.04)),
    matHardware
  );
  kneePadR.position.set(0, -0.4, 0.065);
  legR.add(kneePadR);

  const calfR = new THREE.Group();
  calfR.name = 'calf_R';
  calfR.position.set(0, -0.42, 0);
  legR.add(calfR);

  const calfMeshR = new THREE.Mesh(
    createSmoothGeometry(new THREE.CylinderGeometry(0.075, 0.065, 0.38, 14)),
    matPants
  );
  calfMeshR.position.set(0, -0.18, 0);
  calfR.add(calfMeshR);

  // High-Top Cyber Sneaker Boot
  const bootR = new THREE.Group();
  bootR.name = 'foot_R';
  bootR.position.set(0, -0.36, 0.04);
  calfR.add(bootR);

  const bootUpperR = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.1, 0.12, 0.22)),
    matBoots
  );
  bootR.add(bootUpperR);

  // Glowing Neon Purple Sole Tread
  const bootSoleR = new THREE.Mesh(
    createSmoothGeometry(new THREE.BoxGeometry(0.106, 0.025, 0.23)),
    matNeonPurple
  );
  bootSoleR.position.set(0, -0.06, 0.01);
  bootR.add(bootSoleR);

  // Set slight dynamic angles for natural confident creative pose
  armL.rotation.set(0.15, 0, 0.12);
  forearmL.rotation.set(0.3, 0, -0.15);
  armR.rotation.set(-0.1, 0, -0.12);
  forearmR.rotation.set(0.35, 0, 0.18);
  legL.rotation.set(-0.04, 0, -0.06);
  legR.rotation.set(0.04, 0, 0.06);

  return root;
}

// Generate and export GLB
const scene = new THREE.Scene();
const avatar = buildFuturisticAvatar();
scene.add(avatar);

const exporter = new GLTFExporter();
try {
  const glb = await exporter.parseAsync(scene, { binary: true });
  const outputPath = path.resolve('public/models/futuristic_avatar.glb');
  fs.writeFileSync(outputPath, Buffer.from(glb));
  console.log(`✅ Futuristic Avatar GLB exported successfully to ${outputPath} (Size: ${fs.statSync(outputPath).size} bytes)`);
} catch (error) {
  console.error('Error exporting GLB:', error);
}
