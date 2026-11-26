import * as THREE from "three";

export interface CinemaCameraGimbalRig {
  root: THREE.Group;
  handleBase: THREE.Group;
  panAssembly: THREE.Group;
  rollAssembly: THREE.Group;
  tiltAssembly: THREE.Group;
  mountingPlate: THREE.Group;
  cameraBody: THREE.Group;
  lensAssembly: THREE.Group;
  monitorGroup: THREE.Group;
  tallyLights: THREE.Mesh[];
  updateHud?: (time: number) => void;
}

// ---------------------------------------------------------------------------
// Side Monitor Canvas HUD Texture Generator (Left Operator Screen)
// ---------------------------------------------------------------------------
function createSideMonitorTexture(): {
  texture: THREE.CanvasTexture;
  update: (time: number) => void;
} {
  const width = 384;
  const height = 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const update = (time: number) => {
    // Clear background (cinematic deep dark UI)
    ctx.fillStyle = "#0a0812";
    ctx.fillRect(0, 0, width, height);

    // Subtle viewport frame
    ctx.strokeStyle = "rgba(147, 51, 234, 0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Top Header: REC dot and Timecode
    const recBlink = Math.sin(time * 4) > 0;
    if (recBlink) {
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(30, 30, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("REC", 46, 36);

    // Running Timecode
    const totalSec = Math.floor(time * 24);
    const frames = totalSec % 24;
    const s = Math.floor(time) % 60;
    const m = Math.floor(time / 60) % 60;
    const h = 1;
    const tcStr = `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(s).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
    ctx.fillText(tcStr, 105, 36);

    // Format info
    ctx.fillStyle = "#c084fc";
    ctx.font = "14px monospace";
    ctx.fillText("4K DCI • 24FPS", 230, 36);

    // Center Crosshairs & 2.39:1 guidelines
    const cx = width / 2;
    const cy = height / 2;
    ctx.strokeStyle = "rgba(168, 85, 247, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy);
    ctx.lineTo(cx + 16, cy);
    ctx.moveTo(cx, cy - 16);
    ctx.lineTo(cx, cy + 16);
    ctx.stroke();

    // 2.39:1 aspect ratio lines
    ctx.strokeStyle = "rgba(236, 72, 153, 0.5)";
    ctx.strokeRect(24, 48, width - 48, height - 96);

    // Bottom parameters: ISO, Shutter, T-Stop, Kelvin
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("ISO 800", 25, height - 25);
    ctx.fillText("180.0°", 95, height - 25);
    ctx.fillText("T1.5", 160, height - 25);
    ctx.fillText("5600K", 210, height - 25);
    ctx.fillStyle = "#a855f7";
    ctx.fillText("SG-RAW", 285, height - 25);

    // Audio VU meters on right
    const barX = width - 28;
    const barY = 60;
    const barW = 5;
    const barH = 100;
    const audioL = 0.55 + 0.35 * Math.sin(time * 8.2) * Math.cos(time * 4.1);
    const audioR = 0.50 + 0.40 * Math.sin(time * 7.5) * Math.sin(time * 3.3);

    const drawMeter = (x: number, level: number) => {
      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(x, barY, barW, barH);
      const fillH = Math.max(0, Math.min(1, Math.abs(level))) * barH;
      const greenH = Math.min(fillH, barH * 0.7);
      ctx.fillStyle = "#10b981";
      ctx.fillRect(x, barY + barH - greenH, barW, greenH);
      if (fillH > barH * 0.7) {
        const yellowH = Math.min(fillH - barH * 0.7, barH * 0.2);
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(x, barY + barH - barH * 0.7 - yellowH, barW, yellowH);
      }
      if (fillH > barH * 0.9) {
        const redH = fillH - barH * 0.9;
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(x, barY + barH - barW, barW, redH);
      }
    };
    drawMeter(barX, audioL);
    drawMeter(barX + 8, audioR);

    texture.needsUpdate = true;
  };

  return { texture, update };
}

// ---------------------------------------------------------------------------
// Gimbal Handle OLED Texture
// ---------------------------------------------------------------------------
function createOledTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#050308";
  ctx.fillRect(0, 0, 256, 64);

  // Border glow
  ctx.strokeStyle = "#9333ea";
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 252, 60);

  ctx.fillStyle = "#c084fc";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("SG RONIN-CINE", 14, 24);

  ctx.fillStyle = "#10b981";
  ctx.font = "bold 12px monospace";
  ctx.fillText("● STAB ACTIVE", 14, 46);

  ctx.fillStyle = "#ffffff";
  ctx.font = "12px sans-serif";
  ctx.fillText("94%", 210, 24);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

// ---------------------------------------------------------------------------
// Main Cinema Camera & 3-Axis Gimbal Rig Builder
// Inspired by Blackmagic URSA Mini Pro & RED Cinema Cameras
// ---------------------------------------------------------------------------
export function buildCinemaCameraGimbal(): CinemaCameraGimbalRig {
  const root = new THREE.Group();
  root.name = "CinemaCameraGimbal_Root";

  // -------------------------------------------------------------------------
  // Materials Library
  // -------------------------------------------------------------------------
  const matStealthBlack = new THREE.MeshStandardMaterial({
    color: 0x18181f,
    roughness: 0.40,
    metalness: 0.35,
  });

  const matAnodizedBlack = new THREE.MeshStandardMaterial({
    color: 0x22222a,
    roughness: 0.30,
    metalness: 0.85,
  });

  const matCarbonFiber = new THREE.MeshStandardMaterial({
    color: 0x18181e,
    roughness: 0.38,
    metalness: 0.28,
  });

  const matPurpleAnodized = new THREE.MeshStandardMaterial({
    color: 0x9333ea,
    roughness: 0.24,
    metalness: 0.85,
    emissive: 0x1e0338,
    emissiveIntensity: 0.12,
  });

  const matMagentaAnodized = new THREE.MeshStandardMaterial({
    color: 0xec4899,
    roughness: 0.26,
    metalness: 0.80,
    emissive: 0x3b071e,
    emissiveIntensity: 0.10,
  });

  const matChromeSilver = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    roughness: 0.22,
    metalness: 0.92,
  });

  const matBrassGold = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.28,
    metalness: 0.85,
  });

  const matRubberGrip = new THREE.MeshStandardMaterial({
    color: 0x0c0c0f,
    roughness: 0.88,
    metalness: 0.05,
  });

  // Deep multi-coated optical cinema lens glass
  const matLensGlass = new THREE.MeshPhysicalMaterial({
    color: 0x06030c,
    roughness: 0.05,
    metalness: 0.08,
    transmission: 0.90,
    ior: 1.54,
    thickness: 0.85,
    clearcoat: 0.90,
    clearcoatRoughness: 0.07,
    attenuationColor: new THREE.Color(0xa855f7),
    attenuationDistance: 0.70,
  });

  // Iridescent AR anti-reflective coating glare (subtle, non-overpowering optical sheen)
  const matLensCoatingGlow = new THREE.MeshBasicMaterial({
    color: 0x9333ea,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const matTallyRed = new THREE.MeshStandardMaterial({
    color: 0xff0044,
    emissive: 0xff0044,
    emissiveIntensity: 1.2,
    roughness: 0.25,
  });

  const matStatusGreen = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 1.0,
    roughness: 0.25,
  });

  const tallyLights: THREE.Mesh[] = [];

  // =========================================================================
  // 1. GIMBAL HANDLE / BASE (Unchanged — Solid & Grounded)
  // =========================================================================
  const handleBase = new THREE.Group();
  handleBase.name = "GimbalHandleBase";
  handleBase.rotation.y = 0.280; // Baseline orientation facing slightly towards viewer's right (~16°)
  root.add(handleBase);

  // A. Folded Mini-Tripod Base Feet (3 feet in sleek closed monopod config)
  const footGeom = new THREE.CylinderGeometry(0.012, 0.007, 0.22, 16);
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const foot = new THREE.Mesh(footGeom, matAnodizedBlack);
    foot.position.set(Math.cos(angle) * 0.025, 0.48, Math.sin(angle) * 0.025);
    foot.rotation.z = 0.04;
    foot.rotation.y = angle;
    handleBase.add(foot);
  }
  const baseCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.048, 0.035, 24),
    matPurpleAnodized
  );
  baseCollar.position.set(0, 0.58, 0);
  handleBase.add(baseCollar);

  // B. Main Battery Grip Shaft
  const gripShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.040, 0.042, 0.34, 32),
    matCarbonFiber
  );
  gripShaft.position.set(0, 0.76, 0);
  handleBase.add(gripShaft);

  // Rubberized tactile ribbed grip sleeve
  const rubberSleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.044, 0.044, 0.24, 32),
    matRubberGrip
  );
  rubberSleeve.position.set(0, 0.76, 0);
  handleBase.add(rubberSleeve);

  // Grip rib rings
  for (let r = -0.10; r <= 0.10; r += 0.025) {
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.0025, 12, 32),
      matAnodizedBlack
    );
    rib.rotation.x = Math.PI / 2;
    rib.position.set(0, 0.76 + r, 0);
    handleBase.add(rib);
  }

  // C. Dual-Handle Expansion Crossbar (Heavy Cinema Gimbal Rig)
  const crossbar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.52, 24),
    matCarbonFiber
  );
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, 0.88, 0);
  handleBase.add(crossbar);

  // Central crossbar clamp
  const crossbarClamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.045, 0.06),
    matPurpleAnodized
  );
  crossbarClamp.position.set(0, 0.88, 0);
  handleBase.add(crossbarClamp);

  // Left & Right Ergonomic Hand Grips
  [-0.26, 0.26].forEach((xSide) => {
    const handleClamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.038, 0.038, 0.045),
      matPurpleAnodized
    );
    handleClamp.position.set(xSide, 0.88, 0);
    handleBase.add(handleClamp);

    // Vertical grip handle
    const gripHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.18, 24),
      matRubberGrip
    );
    gripHandle.position.set(xSide, 0.88 + 0.09, 0.02);
    gripHandle.rotation.x = 0.15;
    handleBase.add(gripHandle);

    // Grip top caps
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.021, 0.021, 0.015, 24),
      matAnodizedBlack
    );
    cap.position.set(xSide, 0.88 + 0.18, 0.035);
    cap.rotation.x = 0.15;
    handleBase.add(cap);
  });

  // D. Gimbal Control Module & Console (at y = 0.98)
  const consoleBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.075, 0.09, 0.08),
    matAnodizedBlack
  );
  consoleBox.position.set(0, 0.98, 0);
  handleBase.add(consoleBox);

  // OLED Mini Status Screen on Handle
  const oledTex = createOledTexture();
  const oledScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.055, 0.022),
    new THREE.MeshBasicMaterial({ map: oledTex })
  );
  oledScreen.position.set(0, 0.995, 0.041);
  handleBase.add(oledScreen);

  // Miniature Aluminum Joystick
  const joystickBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.010, 0.012, 0.008, 16),
    matPurpleAnodized
  );
  joystickBase.rotation.x = Math.PI / 2;
  joystickBase.position.set(-0.018, 0.96, 0.041);
  handleBase.add(joystickBase);

  const joystickStick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.003, 0.003, 0.014, 12),
    matChromeSilver
  );
  joystickStick.rotation.x = Math.PI / 2;
  joystickStick.position.set(-0.018, 0.96, 0.048);
  handleBase.add(joystickStick);

  // Buttons: Mode & REC
  const btnRec = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.006, 16),
    matTallyRed
  );
  btnRec.rotation.x = Math.PI / 2;
  btnRec.position.set(0.018, 0.96, 0.041);
  handleBase.add(btnRec);

  // Status Battery LEDs (3 dots)
  for (let b = -1; b <= 1; b++) {
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.005, 0.003, 0.002),
      matStatusGreen
    );
    led.position.set(b * 0.012, 0.94, 0.041);
    handleBase.add(led);
  }

  // =========================================================================
  // 2. PAN ASSEMBLY (Rotates around Y-axis / Yaw)
  // =========================================================================
  const panAssembly = new THREE.Group();
  panAssembly.name = "PanAssembly";
  panAssembly.position.set(0, 1.05, 0);
  panAssembly.rotation.y = 0.305; // Baseline orientation facing slightly towards viewer's right (~17.5°)
  root.add(panAssembly);

  // Brushless Pan Motor Housing
  const panMotor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.054, 0.052, 32),
    matAnodizedBlack
  );
  panAssembly.add(panMotor);

  const panAccentRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.012, 32),
    matPurpleAnodized
  );
  panAssembly.add(panAccentRing);

  // Heavy-duty CNC Curved Vertical Pan Arm
  const panArm = new THREE.Group();
  const armLower = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.14, 0.038),
    matAnodizedBlack
  );
  armLower.position.set(0, 0.08, -0.06);
  armLower.rotation.x = -0.45;
  panArm.add(armLower);

  const armUpper = new THREE.Mesh(
    new THREE.BoxGeometry(0.048, 0.12, 0.042),
    matAnodizedBlack
  );
  armUpper.position.set(0, 0.17, -0.16);
  armUpper.rotation.x = -0.25;
  panArm.add(armUpper);

  const cutout = new THREE.Mesh(
    new THREE.BoxGeometry(0.024, 0.07, 0.05),
    matCarbonFiber
  );
  cutout.position.set(0, 0.12, -0.11);
  panArm.add(cutout);

  panAssembly.add(panArm);

  // =========================================================================
  // 3. ROLL ASSEMBLY (Rotates around Z-axis / Roll)
  // =========================================================================
  const rollAssembly = new THREE.Group();
  rollAssembly.name = "RollAssembly";
  rollAssembly.position.set(0, 0.20, -0.22);
  panAssembly.add(rollAssembly);

  const rollMotor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.048, 0.065, 32),
    matAnodizedBlack
  );
  rollMotor.rotation.x = Math.PI / 2;
  rollAssembly.add(rollMotor);

  const rollAccentRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.050, 0.050, 0.012, 32),
    matPurpleAnodized
  );
  rollAccentRing.rotation.x = Math.PI / 2;
  rollAssembly.add(rollAccentRing);

  // Horizontal U-Cradle Yoke
  const rearYoke = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 0.042, 0.042),
    matAnodizedBlack
  );
  rearYoke.position.set(0, 0, 0.01);
  rollAssembly.add(rearYoke);

  [-0.26, 0.26].forEach((sideX) => {
    const sideArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.038, 0.042, 0.22),
      matAnodizedBlack
    );
    sideArm.position.set(sideX, 0, 0.11);
    rollAssembly.add(sideArm);

    const corner = new THREE.Mesh(
      new THREE.BoxGeometry(0.044, 0.046, 0.044),
      matPurpleAnodized
    );
    corner.position.set(sideX, 0, 0.01);
    rollAssembly.add(corner);
  });

  // =========================================================================
  // 4. TILT ASSEMBLY (Rotates around X-axis / Pitch)
  // =========================================================================
  const tiltAssembly = new THREE.Group();
  tiltAssembly.name = "TiltAssembly";
  tiltAssembly.position.set(0, 0, 0.22);
  rollAssembly.add(tiltAssembly);

  // Dual Brushless Tilt Motors
  [-0.26, 0.26].forEach((sideX) => {
    const tiltMotor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.044, 0.044, 0.038, 32),
      matAnodizedBlack
    );
    tiltMotor.rotation.z = Math.PI / 2;
    tiltMotor.position.set(sideX, 0, 0);
    tiltAssembly.add(tiltMotor);

    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.020, 24),
      matPurpleAnodized
    );
    knob.rotation.z = Math.PI / 2;
    knob.position.set(sideX + (sideX > 0 ? 0.022 : -0.022), 0, 0);
    tiltAssembly.add(knob);
  });

  // Lower Cradle Support Frame
  [-0.23, 0.23].forEach((sideX) => {
    const dropArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.026, 0.14, 0.032),
      matAnodizedBlack
    );
    dropArm.position.set(sideX, -0.07, 0);
    tiltAssembly.add(dropArm);
  });

  const cradleBridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.028, 0.14),
    matAnodizedBlack
  );
  cradleBridge.position.set(0, -0.13, 0);
  tiltAssembly.add(cradleBridge);

  // =========================================================================
  // 5. CAMERA MOUNTING BASEPLATE & 15MM RODS
  // =========================================================================
  const mountingPlate = new THREE.Group();
  mountingPlate.name = "CameraMountingPlate";
  mountingPlate.position.set(0, -0.11, 0);
  tiltAssembly.add(mountingPlate);

  const dovetailClamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.024, 0.24),
    matAnodizedBlack
  );
  mountingPlate.add(dovetailClamp);

  const lockLever = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.016, 0.055),
    matMagentaAnodized
  );
  lockLever.position.set(0.098, 0, 0.04);
  mountingPlate.add(lockLever);

  // Dual 15mm Carbon Fiber Support Rods extending forward under lens
  [-0.05, 0.05].forEach((rx) => {
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0075, 0.0075, 0.40, 20),
      matCarbonFiber
    );
    rod.rotation.x = Math.PI / 2;
    rod.position.set(rx, -0.025, 0.10);
    mountingPlate.add(rod);
  });

  // =========================================================================
  // 6. REALISTIC PROFESSIONAL CINEMA CAMERA (Blackmagic URSA & RED Inspired)
  // Sculpted cinema brain body, beveled chamfers, PL mount, tactile controls
  // =========================================================================
  const cameraBody = new THREE.Group();
  cameraBody.name = "CinemaCameraBody";
  cameraBody.position.set(0, 0.01, 0);
  mountingPlate.add(cameraBody);

  // Main Cinema Camera Brain (Sculpted matte black magnesium chassis)
  const chassisMain = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.165, 0.18),
    matStealthBlack
  );
  chassisMain.position.set(0, 0.095, -0.025);
  cameraBody.add(chassisMain);

  // Top-left and Top-right 45-degree chamfered shoulder bevels
  [-0.075, 0.075].forEach((bx) => {
    const shoulder = new THREE.Mesh(
      new THREE.BoxGeometry(0.026, 0.026, 0.178),
      matAnodizedBlack
    );
    shoulder.position.set(bx, 0.172, -0.025);
    shoulder.rotation.z = Math.PI / 4;
    cameraBody.add(shoulder);
  });

  // Bottom-left and Bottom-right chamfers
  [-0.075, 0.075].forEach((bx) => {
    const bShoulder = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.022, 0.178),
      matAnodizedBlack
    );
    bShoulder.position.set(bx, 0.018, -0.025);
    bShoulder.rotation.z = Math.PI / 4;
    cameraBody.add(bShoulder);
  });

  // Front-left and Front-right vertical corner bevels
  [-0.076, 0.076].forEach((vx) => {
    const vBevel = new THREE.Mesh(
      new THREE.BoxGeometry(0.020, 0.150, 0.020),
      matAnodizedBlack
    );
    vBevel.position.set(vx, 0.095, 0.058);
    vBevel.rotation.y = Math.PI / 4;
    cameraBody.add(vBevel);
  });

  // Front Faceplate Collar & Sensor Cavity
  const frontPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.145, 0.145, 0.012),
    matAnodizedBlack
  );
  frontPlate.position.set(0, 0.095, 0.066);
  cameraBody.add(frontPlate);

  // Recessed circular optical sensor port with magenta/green OLPF glass reflection
  const sensorRecess = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 0.008, 36),
    matCarbonFiber
  );
  sensorRecess.rotation.x = Math.PI / 2;
  sensorRecess.position.set(0, 0.095, 0.071);
  cameraBody.add(sensorRecess);

  const olpfFilter = new THREE.Mesh(
    new THREE.PlaneGeometry(0.040, 0.028),
    new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x059669,
      emissiveIntensity: 0.4,
    })
  );
  olpfFilter.position.set(0, 0.095, 0.074);
  cameraBody.add(olpfFilter);

  // Heavy Stainless Steel PL Lens Mount Ring on camera front
  const plMountChassis = new THREE.Mesh(
    new THREE.CylinderGeometry(0.074, 0.076, 0.016, 36),
    matChromeSilver
  );
  plMountChassis.rotation.x = Math.PI / 2;
  plMountChassis.position.set(0, 0.095, 0.078);
  cameraBody.add(plMountChassis);

  // PL Positive-Lock knurled ring with 4 locking wings
  const plLockKnurl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.071, 0.071, 0.014, 36),
    matAnodizedBlack
  );
  plLockKnurl.rotation.x = Math.PI / 2;
  plLockKnurl.position.set(0, 0.095, 0.084);
  cameraBody.add(plLockKnurl);

  for (let wing = 0; wing < 4; wing++) {
    const wAngle = (wing * Math.PI) / 2;
    const wingTab = new THREE.Mesh(
      new THREE.BoxGeometry(0.014, 0.007, 0.012),
      matChromeSilver
    );
    wingTab.position.set(
      Math.cos(wAngle) * 0.073,
      0.095 + Math.sin(wAngle) * 0.073,
      0.084
    );
    wingTab.rotation.z = wAngle;
    cameraBody.add(wingTab);
  }

  // PL Lens Release Lever with purple safety catch
  const plReleaseLever = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.022, 0.010),
    matPurpleAnodized
  );
  plReleaseLever.position.set(-0.068, 0.145, 0.078);
  cameraBody.add(plReleaseLever);

  // Front Mini XLR / Timecode Lemo Ports with knurled silver caps
  [-0.055, 0.055].forEach((px) => {
    const lemoPort = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0055, 0.0055, 0.008, 16),
      matChromeSilver
    );
    lemoPort.rotation.x = Math.PI / 2;
    lemoPort.position.set(px, 0.035, 0.073);
    cameraBody.add(lemoPort);
  });

  // Top Aluminum Cheese Plate with grid of 1/4"-20 & 3/8"-16 threaded mounting holes
  const cheesePlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.012, 0.16),
    matAnodizedBlack
  );
  cheesePlate.position.set(0, 0.183, -0.025);
  cameraBody.add(cheesePlate);

  // Precision mounting hole insets
  for (let zHole = -0.05; zHole <= 0.05; zHole += 0.035) {
    for (let xHole = -0.04; xHole <= 0.04; xHole += 0.04) {
      const hole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.004, 0.004, 12),
        matChromeSilver
      );
      hole.position.set(xHole, 0.190, -0.025 + zHole);
      cameraBody.add(hole);
    }
  }

  // Low-Profile NATO Top Carrying Handle with rubber grip
  const handleSupportF = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.050, 0.022),
    matAnodizedBlack
  );
  handleSupportF.position.set(0, 0.212, 0.02);
  cameraBody.add(handleSupportF);

  const handleSupportR = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.050, 0.022),
    matAnodizedBlack
  );
  handleSupportR.position.set(0, 0.212, -0.07);
  cameraBody.add(handleSupportR);

  const topHandleBar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 0.18, 20),
    matRubberGrip
  );
  topHandleBar.rotation.x = Math.PI / 2;
  topHandleBar.position.set(0, 0.238, -0.025);
  cameraBody.add(topHandleBar);

  const coldShoe = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.008, 0.020),
    matPurpleAnodized
  );
  coldShoe.position.set(0, 0.250, 0.03);
  cameraBody.add(coldShoe);

  // Right Side Cooling Louvers & Media Bay
  const rightVentHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.006, 0.11, 0.12),
    matCarbonFiber
  );
  rightVentHousing.position.set(0.083, 0.095, -0.025);
  cameraBody.add(rightVentHousing);

  for (let l = -0.035; l <= 0.035; l += 0.015) {
    const louver = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.0035, 0.095),
      matChromeSilver
    );
    louver.position.set(0.084, 0.095 + l, -0.025);
    cameraBody.add(louver);
  }

  // Dual 12G-SDI BNC connectors on right side
  [-0.045, -0.015].forEach((zP) => {
    const bnc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.012, 16),
      matChromeSilver
    );
    bnc.rotation.z = Math.PI / 2;
    bnc.position.set(0.088, 0.050, zP);
    cameraBody.add(bnc);
  });

  // Rear V-Mount Cine Battery Pack
  const vMountPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.014),
    matAnodizedBlack
  );
  vMountPlate.position.set(0, 0.095, -0.122);
  cameraBody.add(vMountPlate);

  const vMountBattery = new THREE.Mesh(
    new THREE.BoxGeometry(0.115, 0.115, 0.055),
    matStealthBlack
  );
  vMountBattery.position.set(0, 0.095, -0.156);
  cameraBody.add(vMountBattery);

  // 5-Segment glowing battery gauge on rear
  for (let s = -2; s <= 2; s++) {
    const bLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, 0.003, 0.002),
      matStatusGreen
    );
    bLed.position.set(0.058, 0.095 + s * 0.007, -0.156);
    cameraBody.add(bLed);
  }

  // Front Tally Recording Light (Ruby jewel LED directly above lens mount)
  const frontTally = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.007, 0.006, 16),
    matTallyRed
  );
  frontTally.rotation.x = Math.PI / 2;
  frontTally.position.set(0, 0.168, 0.072);
  cameraBody.add(frontTally);
  tallyLights.push(frontTally);

  const topTally = new THREE.Mesh(
    new THREE.BoxGeometry(0.010, 0.004, 0.010),
    matTallyRed
  );
  topTally.position.set(0, 0.190, 0.05);
  cameraBody.add(topTally);
  tallyLights.push(topTally);

  // =========================================================================
  // 7. MASSIVE CIRCULAR CINEMA PRIME LENS (The Dominant Front-Facing Feature)
  // Inspired by Cooke / ARRI Master Primes:
  // - Substantial diameter and deep forward protrusion (+Z axis)
  // - Stepped cylindrical metal barrel
  // - Concentric 0.8 MOD focus and aperture gear rings with chrome teeth
  // - Large convex multi-coated optical front glass dome with violet iridescence
  // - 9-blade visible internal golden brass aperture iris
  // =========================================================================
  const lensAssembly = new THREE.Group();
  lensAssembly.name = "CinemaPrimeLens";
  // Positioned directly on the front optical axis:
  lensAssembly.position.set(0, 0.095, 0.088);
  cameraBody.add(lensAssembly);

  // 1. Heavy PL Mount Stainless Steel Flange
  const plLensFlange = new THREE.Mesh(
    new THREE.CylinderGeometry(0.074, 0.074, 0.024, 40),
    matChromeSilver
  );
  plLensFlange.rotation.x = Math.PI / 2;
  plLensFlange.position.set(0, 0, 0.012);
  lensAssembly.add(plLensFlange);

  // 2. Rear Lens Barrel Segment
  const barrelRear = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.072, 0.032, 40),
    matStealthBlack
  );
  barrelRear.rotation.x = Math.PI / 2;
  barrelRear.position.set(0, 0, 0.040);
  lensAssembly.add(barrelRear);

  // 3. Aperture (Iris) Gear Ring (0.8 MOD Cine Gear)
  const irisRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.078, 0.078, 0.024, 40),
    matAnodizedBlack
  );
  irisRing.rotation.x = Math.PI / 2;
  irisRing.position.set(0, 0, 0.068);
  lensAssembly.add(irisRing);

  // Precision chrome teeth for aperture gear
  for (let t = 0; t < 32; t++) {
    const tAngle = (t * Math.PI * 2) / 32;
    const tooth = new THREE.Mesh(
      new THREE.BoxGeometry(0.002, 0.0035, 0.022),
      matChromeSilver
    );
    tooth.position.set(Math.cos(tAngle) * 0.078, Math.sin(tAngle) * 0.078, 0.068);
    tooth.rotation.z = tAngle;
    lensAssembly.add(tooth);
  }

  // Purple T-stop index mark collar
  const irisIndexCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.074, 0.074, 0.008, 40),
    matPurpleAnodized
  );
  irisIndexCollar.rotation.x = Math.PI / 2;
  irisIndexCollar.position.set(0, 0, 0.084);
  lensAssembly.add(irisIndexCollar);

  // 4. Middle Barrel Segment with Engraved Cinema Branding
  const barrelMid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.034, 40),
    matStealthBlack
  );
  barrelMid.rotation.x = Math.PI / 2;
  barrelMid.position.set(0, 0, 0.105);
  lensAssembly.add(barrelMid);

  // Subtle knurled rubber grip ring on mid barrel
  const midGrip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.076, 0.076, 0.016, 40),
    matRubberGrip
  );
  midGrip.rotation.x = Math.PI / 2;
  midGrip.position.set(0, 0, 0.105);
  lensAssembly.add(midGrip);

  // 5. Massive Focus Gear Ring (Wide 0.8 MOD Gear, Diameter 0.176!)
  const focusRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.088, 0.088, 0.042, 44),
    matAnodizedBlack
  );
  focusRing.rotation.x = Math.PI / 2;
  focusRing.position.set(0, 0, 0.143);
  lensAssembly.add(focusRing);

  // 44 individual satin chrome gear teeth
  for (let f = 0; f < 44; f++) {
    const fAngle = (f * Math.PI * 2) / 44;
    const fTooth = new THREE.Mesh(
      new THREE.BoxGeometry(0.0025, 0.0042, 0.040),
      matChromeSilver
    );
    fTooth.position.set(Math.cos(fAngle) * 0.088, Math.sin(fAngle) * 0.088, 0.143);
    fTooth.rotation.z = fAngle;
    lensAssembly.add(fTooth);
  }

  // Dual Distance Scale Ring (Engraved distance markings)
  const distanceRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.084, 0.084, 0.016, 40),
    matStealthBlack
  );
  distanceRing.rotation.x = Math.PI / 2;
  distanceRing.position.set(0, 0, 0.172);
  lensAssembly.add(distanceRing);

  // Purple anodized accent spacer ring
  const focusAccentRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.090, 0.090, 0.007, 40),
    matPurpleAnodized
  );
  focusAccentRing.rotation.x = Math.PI / 2;
  focusAccentRing.position.set(0, 0, 0.184);
  lensAssembly.add(focusAccentRing);

  // 6. Sweeping Conical Front Bell Flare (Widening to 114mm cine standard)
  const barrelCone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.106, 0.086, 0.055, 44),
    matStealthBlack
  );
  barrelCone.rotation.x = Math.PI / 2;
  barrelCone.position.set(0, 0, 0.215);
  lensAssembly.add(barrelCone);

  // 7. Prominent Cylindrical Front Lens Hood / Outer Bevel (Diameter > 0.21)
  const frontHood = new THREE.Mesh(
    new THREE.CylinderGeometry(0.108, 0.108, 0.046, 44),
    matAnodizedBlack
  );
  frontHood.rotation.x = Math.PI / 2;
  frontHood.position.set(0, 0, 0.265);
  lensAssembly.add(frontHood);

  // Outer front bezel rim in vibrant purple anodized aluminum
  const frontBezelRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.108, 0.004, 20, 44),
    matPurpleAnodized
  );
  frontBezelRim.position.set(0, 0, 0.288);
  lensAssembly.add(frontBezelRim);

  // Inner front lip in magenta anodized aluminum
  const frontBezelInner = new THREE.Mesh(
    new THREE.TorusGeometry(0.103, 0.0025, 16, 44),
    matMagentaAnodized
  );
  frontBezelInner.position.set(0, 0, 0.288);
  lensAssembly.add(frontBezelInner);

  // Concentric internal anti-reflective baffle rings inside the front hood
  for (let b = 1; b <= 3; b++) {
    const baffle = new THREE.Mesh(
      new THREE.TorusGeometry(0.104 - b * 0.004, 0.002, 14, 44),
      matStealthBlack
    );
    baffle.position.set(0, 0, 0.258 + b * 0.008);
    lensAssembly.add(baffle);
  }

  // 8. Internal 9-Blade Brass Aperture Diaphragm (visible through front glass)
  const irisGroup = new THREE.Group();
  irisGroup.position.set(0, 0, 0.15);
  lensAssembly.add(irisGroup);

  const irisRingInterior = new THREE.Mesh(
    new THREE.RingGeometry(0.026, 0.068, 32),
    matStealthBlack
  );
  irisGroup.add(irisRingInterior);

  // 9 Golden Brass Aperture Blades creating a nonagon iris
  for (let bl = 0; bl < 9; bl++) {
    const blAngle = (bl * Math.PI * 2) / 9;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.020, 0.038, 0.001),
      matBrassGold
    );
    blade.position.set(
      Math.cos(blAngle) * 0.032,
      Math.sin(blAngle) * 0.032,
      0.001
    );
    blade.rotation.z = blAngle + 0.38;
    irisGroup.add(blade);
  }

  // 9. Massive Convex Optical Glass Element (Dominant front curved glass dome)
  const frontGlassElement = new THREE.Mesh(
    new THREE.SphereGeometry(0.098, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2.6),
    matLensGlass
  );
  frontGlassElement.position.set(0, 0, 0.240);
  lensAssembly.add(frontGlassElement);

  // Multi-coated purple/magenta antireflective glare coating ring
  const coatingGlare = new THREE.Mesh(
    new THREE.RingGeometry(0.032, 0.096, 44),
    matLensCoatingGlow
  );
  coatingGlare.position.set(0, 0, 0.285);
  lensAssembly.add(coatingGlare);

  // 10. Wireless Follow-Focus Motor Clamped to 15mm Rod
  const ffMotor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.040, 24),
    matAnodizedBlack
  );
  ffMotor.position.set(-0.05, 0.045, 0.143);
  lensAssembly.add(ffMotor);

  const ffGear = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.014, 28),
    matPurpleAnodized
  );
  ffGear.position.set(-0.068, 0.082, 0.143);
  lensAssembly.add(ffGear);

  // =========================================================================
  // 8. LEFT OPERATOR UI DISPLAY & CONTROLS (Authentic Cinema Side Display)
  // Flush-integrated along the left side of the camera chassis.
  // Shows live camera status (REC, timecode, VU meters, audio, format)
  // NEVER sticks forward or competes with the primary front circular lens!
  // =========================================================================
  const monitorGroup = new THREE.Group();
  monitorGroup.name = "SideOperatorDisplay";
  // Flush mounted along the left flank of the camera body
  monitorGroup.position.set(-0.081, 0.095, -0.025);
  monitorGroup.rotation.y = -Math.PI / 2; // Flat against the left side
  cameraBody.add(monitorGroup);

  // Recessed Display Bezel
  const monBezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.125, 0.085, 0.004),
    matAnodizedBlack
  );
  monBezel.position.set(0, 0, 0.002);
  monitorGroup.add(monBezel);

  // Live Canvas HUD Screen
  const { texture: hudTexture, update: updateHud } = createSideMonitorTexture();
  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.116, 0.076),
    new THREE.MeshBasicMaterial({
      map: hudTexture,
      toneMapped: false,
    })
  );
  screenMesh.position.set(0, 0, 0.005);
  monitorGroup.add(screenMesh);

  // Side tactile buttons around the display (Blackmagic URSA style)
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0045, 0.0045, 0.004, 16),
        c === 0 && r === 0 ? matTallyRed : matRubberGrip
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(-0.045 + c * 0.045, -0.052 + r * 0.104, 0.004);
      monitorGroup.add(btn);
    }
  }

  // Dual Rotary Scroll Wheels on side in anodized purple
  [-0.035, 0.035].forEach((xK) => {
    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.006, 20),
      matPurpleAnodized
    );
    dial.position.set(xK, -0.052, 0.005);
    monitorGroup.add(dial);
  });

  return {
    root,
    handleBase,
    panAssembly,
    rollAssembly,
    tiltAssembly,
    mountingPlate,
    cameraBody,
    lensAssembly,
    monitorGroup,
    tallyLights,
    updateHud,
  };
}

// ---------------------------------------------------------------------------
// Real-time Animation Loop with Front 3/4 Perspective & Damped Cursor Tracking
// ---------------------------------------------------------------------------
export function animateCinemaCameraGimbal(
  rig: CinemaCameraGimbalRig,
  time: number,
  mouse: { x: number; y: number }
) {
  // Update Live Side Monitor Canvas HUD
  if (rig.updateHud) {
    rig.updateHud(time);
  }

  // Tally Lights Soft Realistic Pulse
  const tallyPulse = 0.95 + Math.sin(time * 3.5) * 0.35;
  rig.tallyLights.forEach((light) => {
    const mat = light.material as THREE.MeshStandardMaterial;
    if (mat && mat.emissiveIntensity !== undefined) {
      mat.emissiveIntensity = tallyPulse;
    }
  });

  // Subtle Idle Floating & Breathing micro-drift
  const idleY = Math.sin(time * 0.8) * 0.008;
  const idlePan = Math.sin(time * 0.5) * 0.005;
  const idleTilt = Math.cos(time * 0.7) * 0.004;
  const idleRoll = Math.sin(time * 0.9) * 0.002;

  rig.root.position.y = idleY;

  // -------------------------------------------------------------------------
  // Default Right-Facing Three-Quarter Perspective Alignment (~17.5° / 0.305 rad)
  // Complete camera-gimbal assembly faces slightly towards the viewer's right,
  // creating a premium 3D product showcase view.
  // -------------------------------------------------------------------------
  const DEFAULT_YAW = 0.305; // ~17.5 degrees towards viewer's right
  const DEFAULT_PITCH = -0.04;
  const DEFAULT_BASE_YAW = 0.280; // ~16.0 degrees towards viewer's right

  // Cursor Tracking:
  // - Cursor left/right smoothly yaws around the front 3/4 resting angle (±12 deg)
  // - Cursor up/down tilts smoothly (±8 deg)
  // - Gyro stabilization counter-roll (±2.5 deg)
  // - Base handle turns together with subtle inertia (±1.5 deg micro-inertia)
  const targetPan = DEFAULT_YAW + mouse.x * 0.22 + idlePan;
  const targetTilt = DEFAULT_PITCH - mouse.y * 0.14 + idleTilt;
  const targetRoll = -mouse.x * 0.042 + idleRoll;

  const targetBasePan = DEFAULT_BASE_YAW + mouse.x * 0.026;
  const targetBaseTilt = -mouse.y * 0.015;

  // Smooth Spring / Lerp Damping
  const lerp = (start: number, end: number, factor: number) =>
    start + (end - start) * factor;

  // 1. Pan Assembly rotates on Y-axis (Yaw)
  rig.panAssembly.rotation.y = lerp(
    rig.panAssembly.rotation.y,
    targetPan,
    0.06
  );

  // 2. Tilt Assembly rotates on X-axis (Pitch)
  rig.tiltAssembly.rotation.x = lerp(
    rig.tiltAssembly.rotation.x,
    targetTilt,
    0.06
  );

  // 3. Roll Assembly rotates on Z-axis (Stabilization Counter-Roll)
  rig.rollAssembly.rotation.z = lerp(
    rig.rollAssembly.rotation.z,
    targetRoll,
    0.05
  );

  // 4. Handle Base remains grounded and stable with subtle inertia
  rig.handleBase.rotation.y = lerp(
    rig.handleBase.rotation.y,
    targetBasePan,
    0.03
  );
  rig.handleBase.rotation.x = lerp(
    rig.handleBase.rotation.x,
    targetBaseTilt,
    0.03
  );
}
