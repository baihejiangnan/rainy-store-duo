import * as THREE from 'three';
import { L } from '../../core/layout.js';
import { box, circle, cyl, cylinderBetween, group, plane, rounded } from '../../core/geom.js';

/* Corner traffic signal: pole + arm over the main road, vehicle head,
 * two pedestrian heads, street-name plate, push button, controller cabinet.
 * Sets a cycle-ready ctx.refs.traffic (Props does NOT animate it). */
export function buildSignal(ctx, P) {
  const { mats, textures, refs } = P.ctx;
  const S = L.signalPole;
  const baseY = L.walkY;
  const g = group('traffic-signal', P.g);

  const poleMat = mats.toon('#8b9097');
  const headMat = mats.toon('#3c434b');
  const darkMat = mats.toon('#22262d');
  const metalDark = mats.toon('#474c55');
  const whiteMat = mats.toon('#cfcabc');

  /* ---------------- pole + arm ---------------- */
  const pole = cyl(0.072, 0.095, S.h, 12, poleMat, {
    x: S.x, y: baseY + S.h / 2, z: S.z, parent: g,
  });
  ctx.outline(pole, 0.016, '#141720');
  cyl(0.13, 0.155, 0.24, 12, darkMat, { x: S.x, y: baseY + 0.12, z: S.z, parent: g });
  // reflective band
  cyl(0.086, 0.09, 0.13, 12, whiteMat, { x: S.x, y: baseY + 0.52, z: S.z, parent: g, cast: false });

  const armY = baseY + 3.32;
  cylinderBetween(
    new THREE.Vector3(S.x, armY, S.z),
    new THREE.Vector3(S.x, armY, L.signalArmZ),
    0.045, poleMat, { parent: g, seg: 8 }
  );
  ctx.outline(g.children[g.children.length - 1], 0.012, '#151820');
  // gusset stay
  cylinderBetween(
    new THREE.Vector3(S.x, baseY + 2.95, S.z + 0.16),
    new THREE.Vector3(S.x, armY - 0.02, S.z + 0.95),
    0.022, metalDark, { parent: g, seg: 6, cast: false }
  );
  // street-name plate hanging from the arm
  const nameMat = new THREE.MeshBasicMaterial({
    map: textures.streetNameTexture(),
    toneMapped: false,
    side: THREE.DoubleSide,
    color: new THREE.Color(0.82, 0.84, 0.86),
  });
  box(0.04, 0.3, 0.84, mats.toon('#2f343c'), {
    x: S.x + 0.02, y: armY + 0.2, z: 2.78, parent: g, cast: false,
  });
  const namePlate = plane(0.8, 0.24, nameMat, {
    x: S.x + 0.045, y: armY + 0.2, z: 2.78, ry: Math.PI / 2, parent: g, cast: false, receive: false,
  });
  namePlate.renderOrder = 4;
  box(0.05, 0.16, 0.05, metalDark, {
    x: S.x, y: armY + 0.07, z: 2.78, parent: g, cast: false,
  });

  /* ---------------- vehicle signal head ---------------- */
  const headZ = 3.7;
  const headY = baseY + 2.99;
  const headX = S.x;
  const housing = rounded(0.19, 0.31, 0.86, 0.035, headMat, {
    x: headX, y: headY, z: headZ, parent: g,
  });
  ctx.outline(housing, 0.013, '#12151b');
  // hangers to the arm
  for (const z of [headZ - 0.3, headZ + 0.3]) {
    box(0.06, 0.14, 0.07, metalDark, { x: headX, y: armY - 0.08, z, parent: g, cast: false });
  }
  const frontX = headX + 0.1;

  const mkLens = (onHex, offHex) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(offHex), toneMapped: false });
    m.userData.onColor = new THREE.Color(onHex);
    m.userData.offColor = new THREE.Color(offHex);
    return m;
  };
  const vehicleRed = mkLens('#ff5348', '#3a1c1e');
  const vehicleAmber = mkLens('#ffc45c', '#3a301c');
  const vehicleGreen = mkLens('#4ef0c8', '#173a32');

  const lensZ = { green: headZ + 0.27, amber: headZ, red: headZ - 0.27 };
  const hoodGeo = new THREE.CylinderGeometry(0.118, 0.102, 0.11, 10, 1, true);
  for (const [kind, mat] of [['green', vehicleGreen], ['amber', vehicleAmber], ['red', vehicleRed]]) {
    const z = lensZ[kind];
    const lens = circle(0.088, 16, mat, {
      x: frontX + 0.004, y: headY, z, ry: Math.PI / 2, parent: g, cast: false, receive: false,
    });
    lens.renderOrder = 3;
    // hood
    const hood = new THREE.Mesh(hoodGeo, headMat);
    hood.rotation.z = -Math.PI / 2;
    hood.position.set(frontX + 0.045, headY, z);
    hood.castShadow = false;
    g.add(hood);
  }

  const vehicleGlow = {
    red: P.glow('#ff5a4f', 0.62, 0, frontX + 0.09, headY, lensZ.red),
    amber: P.glow('#ffc45c', 0.55, 0, frontX + 0.09, headY, lensZ.amber),
    green: P.glow('#54f0c8', 0.62, 0.5, frontX + 0.09, headY, lensZ.green),
  };
  for (const key of Object.keys(vehicleGlow)) {
    vehicleGlow[key].material.userData.base = key === 'green' ? 0.5 : key === 'amber' ? 0.4 : 0.5;
  }

  const vehicleLight = new THREE.PointLight(new THREE.Color('#54f0c8'), 1.15, 3.6, 2);
  vehicleLight.position.set(frontX + 0.35, headY, headZ);
  g.add(vehicleLight);

  /* ---------------- pedestrian heads (shared lens materials) ---------------- */
  const pedRed = mkLens('#ff5348', '#3a1c1e');
  const pedGreen = mkLens('#4ef0c8', '#173a32');
  const pedRedSprites = [];
  const pedGreenSprites = [];

  // A) facing the shop (-x)
  const pedAx = S.x - 0.2;
  const pedAy = baseY + 2.26;
  const pedAHousing = rounded(0.14, 0.5, 0.26, 0.03, headMat, {
    x: pedAx, y: pedAy, z: S.z, parent: g,
  });
  ctx.outline(pedAHousing, 0.012, '#12151b');
  box(0.12, 0.06, 0.06, metalDark, { x: S.x - 0.1, y: pedAy, z: S.z, parent: g, cast: false });
  const pedAFront = pedAx - 0.072;
  const pedHoodGeo = new THREE.CylinderGeometry(0.1, 0.088, 0.09, 10, 1, true);
  for (const [yy, mat] of [[pedAy + 0.12, pedRed], [pedAy - 0.12, pedGreen]]) {
    const lens = circle(0.072, 14, mat, {
      x: pedAFront - 0.004, y: yy, z: S.z, ry: -Math.PI / 2, parent: g, cast: false, receive: false,
    });
    lens.renderOrder = 3;
    const hood = new THREE.Mesh(pedHoodGeo, headMat);
    hood.rotation.z = Math.PI / 2;
    hood.position.set(pedAFront - 0.04, yy, S.z);
    hood.castShadow = false;
    g.add(hood);
  }
  pedRedSprites.push(P.glow('#ff5a4f', 0.42, 0.4, pedAFront - 0.07, pedAy + 0.12, S.z));
  pedGreenSprites.push(P.glow('#54f0c8', 0.42, 0, pedAFront - 0.07, pedAy - 0.12, S.z));

  // B) facing +z (main-road crosswalk, visible from the hero camera)
  const pedBz = S.z + 0.19;
  const pedBy = baseY + 2.34;
  const pedBHousing = rounded(0.26, 0.5, 0.14, 0.03, headMat, {
    x: S.x, y: pedBy, z: pedBz, parent: g,
  });
  ctx.outline(pedBHousing, 0.012, '#12151b');
  box(0.06, 0.06, 0.12, metalDark, { x: S.x, y: pedBy, z: S.z + 0.09, parent: g, cast: false });
  const pedBFront = pedBz + 0.072;
  for (const [yy, mat] of [[pedBy + 0.12, pedRed], [pedBy - 0.12, pedGreen]]) {
    const lens = circle(0.072, 14, mat, {
      x: S.x, y: yy, z: pedBFront + 0.004, parent: g, cast: false, receive: false,
    });
    lens.renderOrder = 3;
    const hood = new THREE.Mesh(pedHoodGeo, headMat);
    hood.rotation.x = Math.PI / 2;
    hood.position.set(S.x, yy, pedBFront + 0.04);
    hood.castShadow = false;
    g.add(hood);
  }
  pedRedSprites.push(P.glow('#ff5a4f', 0.42, 0.4, S.x, pedBy + 0.12, pedBFront + 0.07));
  pedGreenSprites.push(P.glow('#54f0c8', 0.42, 0, S.x, pedBy - 0.12, pedBFront + 0.07));
  for (const sp of [...pedRedSprites, ...pedGreenSprites]) {
    sp.material.userData.base = 0.42;
  }

  const pedLight = new THREE.PointLight(new THREE.Color('#ff5a4f'), 0.7, 2.2, 2);
  pedLight.position.set(S.x + 0.05, baseY + 2.4, S.z + 0.45);
  g.add(pedLight);

  /* ---------------- push button + controller ---------------- */
  box(0.11, 0.17, 0.13, mats.toon('#d6cdb2'), {
    x: S.x - 0.11, y: baseY + 1.12, z: S.z, parent: g,
  });
  const btnMat = new THREE.MeshBasicMaterial({ color: '#ffd15c', toneMapped: false });
  circle(0.025, 10, btnMat, {
    x: S.x - 0.175, y: baseY + 1.14, z: S.z, ry: -Math.PI / 2, parent: g, cast: false,
  });
  const cabinet = group('signal-cabinet', g);
  cabinet.position.set(1.66, baseY, 1.35);
  cabinet.rotation.y = 0.1;
  const cab = box(0.36, 0.58, 0.3, mats.toon('#7c8188'), { x: 0, y: 0.29, z: 0, parent: cabinet });
  ctx.outline(cab, 0.014, '#1b1e24');
  box(0.3, 0.03, 0.24, mats.toon('#5f646b'), { x: 0, y: 0.6, z: 0, parent: cabinet, cast: false });
  for (let i = 0; i < 3; i++) {
    box(0.24, 0.012, 0.02, darkMat, { x: 0, y: 0.4 - i * 0.06, z: 0.152, parent: cabinet, cast: false });
  }
  const cabLabel = P.label(128, 64, (cx, w, h) => {
    cx.fillStyle = '#e9e5d8';
    cx.fillRect(0, 0, w, h);
    cx.fillStyle = '#3b4d63';
    cx.font = '900 27px "Yu Gothic", sans-serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('信号制御', w / 2, h / 2);
  });
  plane(0.16, 0.08, cabLabel, {
    x: 0, y: 0.46, z: 0.155, parent: cabinet, cast: false, receive: false,
  }).renderOrder = 5;

  /* ---------------- cycle-ready refs ---------------- */
  let pedState = 'red';

  function setVehicle(state) {
    const map = { red: vehicleRed, green: vehicleGreen, amber: vehicleAmber };
    for (const [k, m] of Object.entries(map)) {
      m.color.copy(k === state ? m.userData.onColor : m.userData.offColor);
    }
    vehicleGlow.red.material.opacity = state === 'red' ? vehicleGlow.red.material.userData.base : 0;
    vehicleGlow.amber.material.opacity = state === 'amber' ? vehicleGlow.amber.material.userData.base : 0;
    vehicleGlow.green.material.opacity = state === 'green' ? vehicleGlow.green.material.userData.base : 0;
    vehicleLight.color.set(state === 'red' ? '#ff5a4f' : state === 'green' ? '#54f0c8' : '#ffc45c');
    vehicleLight.intensity = state === 'amber' ? 0.8 : 1.15;
  }

  function setPedestrian(state) {
    pedState = state;
    pedRed.color.copy(state === 'red' ? pedRed.userData.onColor : pedRed.userData.offColor);
    pedGreen.color.copy(state === 'green' ? pedGreen.userData.onColor : pedGreen.userData.offColor);
    for (const sp of pedRedSprites) sp.material.opacity = state === 'red' ? sp.material.userData.base : 0;
    for (const sp of pedGreenSprites) sp.material.opacity = state === 'green' ? sp.material.userData.base : 0;
    pedLight.color.set(state === 'red' ? '#ff5a4f' : '#54f0c8');
    pedLight.intensity = 0.7;
  }

  function setPedestrianBlink(visible) {
    const sprites = pedState === 'red' ? pedRedSprites : pedGreenSprites;
    for (const sp of sprites) sp.material.opacity = visible ? sp.material.userData.base : 0.02;
  }

  setVehicle('green');
  setPedestrian('red');

  refs.traffic = {
    animatedByProps: false,
    mode: 'cycle-ready',
    vehicleRed, vehicleGreen, vehicleAmber,
    pedestrianRed: pedRed,
    pedestrianGreen: pedGreen,
    vehicleLight,
    pedestrianLight: pedLight,
    lights: [vehicleLight, pedLight],
    glowMats: [
      { role: 'vehicle-red', mat: vehicleRed, sprite: vehicleGlow.red },
      { role: 'vehicle-amber', mat: vehicleAmber, sprite: vehicleGlow.amber },
      { role: 'vehicle-green', mat: vehicleGreen, sprite: vehicleGlow.green },
      { role: 'pedestrian-red', mat: pedRed, sprites: pedRedSprites },
      { role: 'pedestrian-green', mat: pedGreen, sprites: pedGreenSprites },
    ],
    setVehicle,
    setPedestrian,
    setPedestrianBlink,
  };

  P.shadow(S.x, S.z, 0.28, 0.28);
  P.shadow(1.66, 1.35, 0.26, 0.22);
}
