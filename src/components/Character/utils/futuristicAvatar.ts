import * as THREE from "three";

// Helper to compute smooth normals and UVs
function createSmoothGeom(geom: THREE.BufferGeometry): THREE.BufferGeometry {
  geom.computeVertexNormals();
  return geom;
}

export interface FuturisticAvatarRig {
  root: THREE.Group;
  head: THREE.Group;
  neck: THREE.Group;
  chest: THREE.Group;
  spine: THREE.Group;
  hips: THREE.Group;
  armL: THREE.Group;
  forearmL: THREE.Group;
  armR: THREE.Group;
  forearmR: THREE.Group;
  eyelidL: THREE.Mesh;
  eyelidR: THREE.Mesh;
  neonPurpleMaterials: THREE.MeshStandardMaterial[];
  neonMagentaMaterials: THREE.MeshStandardMaterial[];
  allMaterials: THREE.Material[];
}

export function buildFuturisticAvatar(): FuturisticAvatarRig {
  const root = new THREE.Group();
  root.name = "FuturisticAvatar";

  const neonPurpleMaterials: THREE.MeshStandardMaterial[] = [];
  const neonMagentaMaterials: THREE.MeshStandardMaterial[] = [];
  const allMaterials: THREE.Material[] = [];

  // PBR Materials
  const matJacket = new THREE.MeshStandardMaterial({
    name: "Mat_TechwearJacket",
    color: 0x14121a,
    roughness: 0.42,
    metalness: 0.28,
  });
  allMaterials.push(matJacket);

  const matInner = new THREE.MeshStandardMaterial({
    name: "Mat_TechwearInner",
    color: 0x0a090e,
    roughness: 0.65,
    metalness: 0.1,
  });
  allMaterials.push(matInner);

  const matPants = new THREE.MeshStandardMaterial({
    name: "Mat_TacticalPants",
    color: 0x110f17,
    roughness: 0.48,
    metalness: 0.22,
  });
  allMaterials.push(matPants);

  const matSkin = new THREE.MeshStandardMaterial({
    name: "Mat_StylizedSkin",
    color: 0xdeb896,
    roughness: 0.52,
    metalness: 0.04,
  });
  allMaterials.push(matSkin);

  const matHair = new THREE.MeshStandardMaterial({
    name: "Mat_SleekHair",
    color: 0x1a1622,
    roughness: 0.35,
    metalness: 0.25,
  });
  allMaterials.push(matHair);

  const matNeonPurple = new THREE.MeshStandardMaterial({
    name: "Mat_NeonPurple",
    color: 0xc084fc,
    emissive: new THREE.Color(0xa855f7),
    emissiveIntensity: 2.8,
    roughness: 0.15,
  });
  neonPurpleMaterials.push(matNeonPurple);
  allMaterials.push(matNeonPurple);

  const matNeonMagenta = new THREE.MeshStandardMaterial({
    name: "Mat_NeonMagenta",
    color: 0xf472b6,
    emissive: new THREE.Color(0xec4899),
    emissiveIntensity: 2.8,
    roughness: 0.15,
  });
  neonMagentaMaterials.push(matNeonMagenta);
  allMaterials.push(matNeonMagenta);

  const matHardware = new THREE.MeshStandardMaterial({
    name: "Mat_Hardware",
    color: 0x4a4456,
    roughness: 0.22,
    metalness: 0.88,
  });
  allMaterials.push(matHardware);

  const matBoots = new THREE.MeshStandardMaterial({
    name: "Mat_CyberBoots",
    color: 0x0d0b12,
    roughness: 0.35,
    metalness: 0.35,
  });
  allMaterials.push(matBoots);

  const matEyeCornea = new THREE.MeshStandardMaterial({
    name: "Mat_EyeCornea",
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0.1,
  });
  allMaterials.push(matEyeCornea);

  const matEyeIris = new THREE.MeshStandardMaterial({
    name: "Mat_EyeIris",
    color: 0x431e78,
    roughness: 0.15,
    metalness: 0.2,
  });
  allMaterials.push(matEyeIris);

  // 1. Pelvis / Hips (Origin at y = 0.95m for realistic 1.82m human height)
  const hips = new THREE.Group();
  hips.name = "hips";
  hips.position.set(0, 0.95, 0);
  root.add(hips);

  const pelvisMesh = new THREE.Mesh(
    createSmoothGeom(new THREE.CylinderGeometry(0.18, 0.16, 0.2, 16)),
    matPants
  );
  hips.add(pelvisMesh);

  // Tactical Belt & Buckle
  const beltMesh = new THREE.Mesh(
    createSmoothGeom(new THREE.CylinderGeometry(0.185, 0.185, 0.05, 16)),
    matHardware
  );
  beltMesh.position.y = 0.08;
  hips.add(beltMesh);

  const buckle = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.08, 0.06, 0.03)),
    matHardware
  );
  buckle.position.set(0, 0.08, 0.19);
  hips.add(buckle);

  // 2. Spine & Chest
  const spine = new THREE.Group();
  spine.name = "spine";
  spine.position.set(0, 0.15, 0);
  hips.add(spine);

  const chest = new THREE.Group();
  chest.name = "chest";
  chest.position.set(0, 0.22, 0);
  spine.add(chest);

  // Tailored Futuristic Techwear Jacket Torso
  const torsoGeom = createSmoothGeom(new THREE.CylinderGeometry(0.25, 0.18, 0.44, 18));
  const torsoMesh = new THREE.Mesh(torsoGeom, matJacket);
  torsoMesh.position.set(0, 0.08, 0);
  torsoMesh.scale.set(1, 1, 0.82); // athletic male chest profile
  chest.add(torsoMesh);

  // Dark obsidian compression inner shirt
  const innerShirt = new THREE.Mesh(
    createSmoothGeom(new THREE.PlaneGeometry(0.13, 0.24)),
    matInner
  );
  innerShirt.position.set(0, 0.16, 0.155);
  chest.add(innerShirt);

  // High standing protective techwear collar
  const collarGeom = createSmoothGeom(
    new THREE.CylinderGeometry(0.145, 0.165, 0.14, 16, 1, true, -Math.PI * 0.75, Math.PI * 1.5)
  );
  const collarMesh = new THREE.Mesh(collarGeom, matJacket);
  collarMesh.position.set(0, 0.33, -0.01);
  chest.add(collarMesh);

  // Glowing Purple Neon Piping along Collar Rim
  const collarPiping = new THREE.Mesh(
    createSmoothGeom(new THREE.TorusGeometry(0.145, 0.008, 8, 24, Math.PI * 1.5)),
    matNeonPurple
  );
  collarPiping.position.set(0, 0.39, -0.01);
  collarPiping.rotation.x = Math.PI / 2;
  collarPiping.rotation.z = Math.PI * 0.25;
  chest.add(collarPiping);

  // Asymmetric Chest Harness Strap & Glowing Light Strip
  const harnessStrap = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.045, 0.45, 0.015)),
    matHardware
  );
  harnessStrap.position.set(-0.08, 0.08, 0.15);
  harnessStrap.rotation.z = 0.32;
  chest.add(harnessStrap);

  const chestLightStrip = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.012, 0.19, 0.01)),
    matNeonMagenta
  );
  chestLightStrip.position.set(0.06, 0.12, 0.152);
  chest.add(chestLightStrip);

  // Broad Shoulder Pauldrons / Armor Pads
  const leftPauldron = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.12, 0.06, 0.16)),
    matJacket
  );
  leftPauldron.position.set(-0.26, 0.26, 0);
  leftPauldron.rotation.z = 0.2;
  chest.add(leftPauldron);

  const rightPauldron = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.12, 0.06, 0.16)),
    matJacket
  );
  rightPauldron.position.set(0.26, 0.26, 0);
  rightPauldron.rotation.z = -0.2;
  chest.add(rightPauldron);

  // Pauldron Glowing Accent Strips
  const pauldronLineL = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.122, 0.008, 0.02)),
    matNeonPurple
  );
  pauldronLineL.position.set(-0.26, 0.28, 0.07);
  pauldronLineL.rotation.z = 0.2;
  chest.add(pauldronLineL);

  const pauldronLineR = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.122, 0.008, 0.02)),
    matNeonPurple
  );
  pauldronLineR.position.set(0.26, 0.28, 0.07);
  pauldronLineR.rotation.z = -0.2;
  chest.add(pauldronLineR);

  // 3. Neck & Head
  const neck = new THREE.Group();
  neck.name = "neck";
  neck.position.set(0, 0.34, 0);
  chest.add(neck);

  const neckMesh = new THREE.Mesh(
    createSmoothGeom(new THREE.CylinderGeometry(0.075, 0.09, 0.14, 16)),
    matSkin
  );
  neckMesh.position.set(0, 0.06, 0);
  neck.add(neckMesh);

  const head = new THREE.Group();
  head.name = "head";
  head.position.set(0, 0.15, 0);
  neck.add(head);

  // Sculpted Stylized Handsome Human Face
  const craniumGeom = createSmoothGeom(new THREE.SphereGeometry(0.13, 24, 20));
  const craniumMesh = new THREE.Mesh(craniumGeom, matSkin);
  craniumMesh.scale.set(0.9, 1.05, 1.0);
  head.add(craniumMesh);

  // Defined Jawline & Chin
  const jawGeom = createSmoothGeom(new THREE.ConeGeometry(0.11, 0.14, 5));
  const jawMesh = new THREE.Mesh(jawGeom, matSkin);
  jawMesh.position.set(0, -0.06, 0.035);
  jawMesh.rotation.x = -Math.PI;
  jawMesh.rotation.y = Math.PI / 5;
  jawMesh.scale.set(0.95, 1, 0.7);
  head.add(jawMesh);

  // Defined Straight Nose Bridge
  const nose = new THREE.Mesh(
    createSmoothGeom(new THREE.ConeGeometry(0.022, 0.06, 4)),
    matSkin
  );
  nose.position.set(0, -0.01, 0.135);
  nose.rotation.x = Math.PI * 0.55;
  head.add(nose);

  // Sculpted Lips
  const lips = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.045, 0.014, 0.015)),
    new THREE.MeshStandardMaterial({ color: 0xc8967b, roughness: 0.6 })
  );
  lips.position.set(0, -0.06, 0.118);
  head.add(lips);

  // Left Eye & Animated Eyelid
  const eyeL = new THREE.Group();
  eyeL.name = "eye_L";
  eyeL.position.set(-0.045, 0.015, 0.105);
  head.add(eyeL);

  const eyeScleraL = new THREE.Mesh(
    createSmoothGeom(new THREE.SphereGeometry(0.018, 12, 10)),
    matEyeCornea
  );
  eyeL.add(eyeScleraL);

  const eyeIrisL = new THREE.Mesh(
    createSmoothGeom(new THREE.CircleGeometry(0.009, 12)),
    matEyeIris
  );
  eyeIrisL.position.set(0, 0, 0.017);
  eyeL.add(eyeIrisL);

  const eyelidL = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.032, 0.02, 0.01)),
    matSkin
  );
  eyelidL.position.set(-0.045, 0.026, 0.116);
  head.add(eyelidL);

  // Right Eye & Animated Eyelid
  const eyeR = new THREE.Group();
  eyeR.name = "eye_R";
  eyeR.position.set(0.045, 0.015, 0.105);
  head.add(eyeR);

  const eyeScleraR = new THREE.Mesh(
    createSmoothGeom(new THREE.SphereGeometry(0.018, 12, 10)),
    matEyeCornea
  );
  eyeR.add(eyeScleraR);

  const eyeIrisR = new THREE.Mesh(
    createSmoothGeom(new THREE.CircleGeometry(0.009, 12)),
    matEyeIris
  );
  eyeIrisR.position.set(0, 0, 0.017);
  eyeR.add(eyeIrisR);

  const eyelidR = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.032, 0.02, 0.01)),
    matSkin
  );
  eyelidR.position.set(0.045, 0.026, 0.116);
  head.add(eyelidR);

  // Eyebrows
  const browL = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.036, 0.007, 0.01)),
    matHair
  );
  browL.position.set(-0.045, 0.038, 0.118);
  browL.rotation.z = 0.1;
  head.add(browL);

  const browR = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.036, 0.007, 0.01)),
    matHair
  );
  browR.position.set(0.045, 0.038, 0.118);
  browR.rotation.z = -0.1;
  head.add(browR);

  // Sleek Modern Hairstyle (Textured Side-Parted Undercut with Cyber Fade)
  const hairBase = new THREE.Mesh(
    createSmoothGeom(new THREE.SphereGeometry(0.138, 20, 16)),
    matHair
  );
  hairBase.position.set(0, 0.04, -0.015);
  hairBase.scale.set(0.92, 0.95, 1.05);
  head.add(hairBase);

  const hairTop = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.18, 0.08, 0.22)),
    matHair
  );
  hairTop.position.set(-0.02, 0.14, -0.01);
  hairTop.rotation.z = -0.15;
  hairTop.rotation.y = 0.1;
  head.add(hairTop);

  const hairSweep = new THREE.Mesh(
    createSmoothGeom(new THREE.ConeGeometry(0.06, 0.14, 5)),
    matHair
  );
  hairSweep.position.set(0.06, 0.12, 0.06);
  hairSweep.rotation.set(-0.4, 0.3, -1.2);
  head.add(hairSweep);

  // Cybernetic Ear Communicator with Glowing LED Ring (Right Ear)
  const earComms = new THREE.Group();
  earComms.name = "earpiece";
  earComms.position.set(0.12, 0, 0);
  head.add(earComms);

  const commsBase = new THREE.Mesh(
    createSmoothGeom(new THREE.CylinderGeometry(0.025, 0.025, 0.015, 12)),
    matHardware
  );
  commsBase.rotation.z = Math.PI / 2;
  earComms.add(commsBase);

  const commsRing = new THREE.Mesh(
    createSmoothGeom(new THREE.TorusGeometry(0.022, 0.004, 8, 16)),
    matNeonMagenta
  );
  commsRing.rotation.y = Math.PI / 2;
  earComms.add(commsRing);

  // 4. Arms & Techwear Sleeves
  // Left Arm
  const armL = new THREE.Group();
  armL.name = "shoulder_L";
  armL.position.set(-0.25, 0.24, 0);
  chest.add(armL);

  const upperArmMeshL = new THREE.Mesh(
    createSmoothGeom(new THREE.CylinderGeometry(0.07, 0.06, 0.28, 12)),
    matJacket
  );
  upperArmMeshL.position.set(0, -0.14, 0);
  armL.add(upperArmMeshL);

  const forearmL = new THREE.Group();
  forearmL.name = "forearm_L";
  forearmL.position.set(0, -0.28, 0);
  armL.add(forearmL);

  const forearmMeshL = new THREE.Mesh(
    createSmoothGeom(new THREE.CylinderGeometry(0.06, 0.05, 0.26, 12)),
    matJacket
  );
  forearmMeshL.position.set(0, -0.13, 0);
  forearmL.add(forearmMeshL);

  // Glowing Forearm Status Bar
  const armLightL = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.01, 0.14, 0.015)),
    matNeonPurple
  );
  armLightL.position.set(-0.055, -0.12, 0);
  forearmL.add(armLightL);

  const handL = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.06, 0.1, 0.04)),
    matHardware
  );
  handL.name = "hand_L";
  handL.position.set(0, -0.3, 0);
  forearmL.add(handL);

  // Right Arm
  const armR = new THREE.Group();
  armR.name = "shoulder_R";
  armR.position.set(0.25, 0.24, 0);
  chest.add(armR);

  const upperArmMeshR = new THREE.Mesh(
    createSmoothGeom(new THREE.CylinderGeometry(0.07, 0.06, 0.28, 12)),
    matJacket
  );
  upperArmMeshR.position.set(0, -0.14, 0);
  armR.add(upperArmMeshR);

  const forearmR = new THREE.Group();
  forearmR.name = "forearm_R";
  forearmR.position.set(0, -0.28, 0);
  armR.add(forearmR);

  const forearmMeshR = new THREE.Mesh(
    createSmoothGeom(new THREE.CylinderGeometry(0.06, 0.05, 0.26, 12)),
    matJacket
  );
  forearmMeshR.position.set(0, -0.13, 0);
  forearmR.add(forearmMeshR);

  // Glowing Forearm Status Bar
  const armLightR = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.01, 0.14, 0.015)),
    matNeonPurple
  );
  armLightR.position.set(0.055, -0.12, 0);
  forearmR.add(armLightR);

  const handR = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.06, 0.1, 0.04)),
    matHardware
  );
  handR.name = "hand_R";
  handR.position.set(0, -0.3, 0);
  forearmR.add(handR);

  // 5. Legs & Cyber High-Top Boots
  const legL = new THREE.Group();
  legL.name = "thigh_L";
  legL.position.set(-0.11, -0.08, 0);
  hips.add(legL);

  const thighMeshL = new THREE.Mesh(
    createSmoothGeom(new THREE.CylinderGeometry(0.09, 0.075, 0.42, 14)),
    matPants
  );
  thighMeshL.position.set(0, -0.2, 0);
  legL.add(thighMeshL);

  const kneePadL = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.09, 0.09, 0.04)),
    matHardware
  );
  kneePadL.position.set(0, -0.4, 0.065);
  legL.add(kneePadL);

  const calfL = new THREE.Group();
  calfL.name = "calf_L";
  calfL.position.set(0, -0.42, 0);
  legL.add(calfL);

  const calfMeshL = new THREE.Mesh(
    createSmoothGeom(new THREE.CylinderGeometry(0.075, 0.065, 0.38, 14)),
    matPants
  );
  calfMeshL.position.set(0, -0.18, 0);
  calfL.add(calfMeshL);

  const bootL = new THREE.Group();
  bootL.name = "foot_L";
  bootL.position.set(0, -0.36, 0.04);
  calfL.add(bootL);

  const bootUpperL = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.1, 0.12, 0.22)),
    matBoots
  );
  bootL.add(bootUpperL);

  const bootSoleL = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.106, 0.025, 0.23)),
    matNeonPurple
  );
  bootSoleL.position.set(0, -0.06, 0.01);
  bootL.add(bootSoleL);

  // Right Leg
  const legR = new THREE.Group();
  legR.name = "thigh_R";
  legR.position.set(0.11, -0.08, 0);
  hips.add(legR);

  const thighMeshR = new THREE.Mesh(
    createSmoothGeom(new THREE.CylinderGeometry(0.09, 0.075, 0.42, 14)),
    matPants
  );
  thighMeshR.position.set(0, -0.2, 0);
  legR.add(thighMeshR);

  const kneePadR = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.09, 0.09, 0.04)),
    matHardware
  );
  kneePadR.position.set(0, -0.4, 0.065);
  legR.add(kneePadR);

  const calfR = new THREE.Group();
  calfR.name = "calf_R";
  calfR.position.set(0, -0.42, 0);
  legR.add(calfR);

  const calfMeshR = new THREE.Mesh(
    createSmoothGeom(new THREE.CylinderGeometry(0.075, 0.065, 0.38, 14)),
    matPants
  );
  calfMeshR.position.set(0, -0.18, 0);
  calfR.add(calfMeshR);

  const bootR = new THREE.Group();
  bootR.name = "foot_R";
  bootR.position.set(0, -0.36, 0.04);
  calfR.add(bootR);

  const bootUpperR = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.1, 0.12, 0.22)),
    matBoots
  );
  bootR.add(bootUpperR);

  const bootSoleR = new THREE.Mesh(
    createSmoothGeom(new THREE.BoxGeometry(0.106, 0.025, 0.23)),
    matNeonPurple
  );
  bootSoleR.position.set(0, -0.06, 0.01);
  bootR.add(bootSoleR);

  // Initial Natural Creative Stance
  armL.rotation.set(0.18, 0, 0.12);
  forearmL.rotation.set(0.35, 0, -0.18);
  armR.rotation.set(-0.12, 0, -0.12);
  forearmR.rotation.set(0.38, 0, 0.2);
  legL.rotation.set(-0.03, 0, -0.05);
  legR.rotation.set(0.03, 0, 0.05);

  return {
    root,
    head,
    neck,
    chest,
    spine,
    hips,
    armL,
    forearmL,
    armR,
    forearmR,
    eyelidL,
    eyelidR,
    neonPurpleMaterials,
    neonMagentaMaterials,
    allMaterials,
  };
}

// Dynamic Real-time Animation Loop
export function animateFuturisticAvatar(
  rig: FuturisticAvatarRig,
  time: number,
  mouse: { x: number; y: number }
) {
  const { head, neck, chest, spine, armL, armR, eyelidL, eyelidR, neonPurpleMaterials, neonMagentaMaterials } = rig;

  // 1. Natural Breathing: Chest & Shoulders expand and contract
  const breath = Math.sin(time * 2.2);
  chest.scale.set(1 + breath * 0.015, 1 + breath * 0.01, 1 + breath * 0.02);
  chest.position.y = 0.22 + breath * 0.004;

  armL.rotation.z = 0.12 + breath * 0.01;
  armR.rotation.z = -0.12 - breath * 0.01;

  // 2. Micro Spine Drift (Natural human weight shifting)
  const spineDrift = Math.cos(time * 1.1) * 0.008;
  spine.rotation.y = spineDrift;
  spine.rotation.z = Math.sin(time * 0.9) * 0.005;

  // 3. Smooth Head & Neck Rotation (Tracking Mouse Cursor Naturally)
  const targetHeadX = -mouse.y * 0.35;
  const targetHeadY = mouse.x * 0.55;

  head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, targetHeadX * 0.7, 0.08);
  head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetHeadY * 0.7, 0.08);
  neck.rotation.x = THREE.MathUtils.lerp(neck.rotation.x, targetHeadX * 0.3, 0.08);
  neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, targetHeadY * 0.3, 0.08);

  // 4. Natural Blinking (Smooth blink every 3.5s to 4.5s)
  const blinkCycle = time % 4.0;
  let blinkProgress = 0;
  if (blinkCycle > 3.85 && blinkCycle < 3.98) {
    blinkProgress = Math.sin(((blinkCycle - 3.85) / 0.13) * Math.PI);
  }
  eyelidL.scale.y = 1 + blinkProgress * 1.8;
  eyelidL.position.y = 0.026 - blinkProgress * 0.01;
  eyelidR.scale.y = 1 + blinkProgress * 1.8;
  eyelidR.position.y = 0.026 - blinkProgress * 0.01;

  // 5. Pulsing Cybernetic Neon Glow
  const pulsePurple = 2.4 + Math.sin(time * 3.0) * 0.6;
  neonPurpleMaterials.forEach((mat) => {
    mat.emissiveIntensity = pulsePurple;
  });

  const pulseMagenta = 2.4 + Math.cos(time * 3.5) * 0.6;
  neonMagentaMaterials.forEach((mat) => {
    mat.emissiveIntensity = pulseMagenta;
  });
}
