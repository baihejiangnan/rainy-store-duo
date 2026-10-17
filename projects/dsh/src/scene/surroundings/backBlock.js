/* Back-of-house concrete slice + the service alley under it.
   The block is cut by the base back edge and the base left edge; the facade faces the
   back alley (+z). Everything stays low-contrast concrete with 1-2 warm windows. */
import * as THREE from 'three';
import { L } from '../../core/layout.js';
import { box, cyl, circle, group, plane, instanced, cylinderBetween } from '../../core/geom.js';
import {
  addOutline, glowSprite, acUnit, pipeRun, crateStacks, gasCylinders, weeds, decal, wallLamp,
  tvAntenna, cable, OUTLINE_COLOR,
} from './parts.js';

export function buildBackBuilding(ctx, parent, A) {
  const { mats } = ctx;
  const B = L.backBuilding;
  const g = group('back-building', parent);
  const yBase = 0.12;
  const wallTop = 4.3;
  const cx = (B.x0 + B.x1) / 2;
  const cz = (B.z0 + B.z1) / 2;
  const fz = B.z1; // -5.0

  const concreteMat = mats.toon('#5b5b65');
  const darkTrim = mats.toon('#3f3f47');
  const frameMat = mats.toon('#5d5e66');
  const sillMat = mats.toon('#6b6b73');
  const metalMat = mats.toon('#5c606a');
  const roofMat = mats.toon('#45454d');

  const warmGlassMat = new THREE.MeshBasicMaterial({
    map: A.windowWarm, toneMapped: false, color: new THREE.Color(0.44, 0.35, 0.27),
  });
  const darkGlassMat = new THREE.MeshBasicMaterial({ map: A.darkWin, toneMapped: true });

  /* ---------------- main mass ---------------- */
  const body = box(B.x1 - B.x0, wallTop - yBase, B.z1 - B.z0, concreteMat, {
    x: cx, y: (yBase + wallTop) / 2, z: cz, parent: g,
  });
  addOutline(ctx, body, 0.026, OUTLINE_COLOR);

  // roof slab + parapet + coping
  box(B.x1 - B.x0, 0.1, B.z1 - B.z0, roofMat, { x: cx, y: 4.35, z: cz, parent: g });
  box(B.x1 - B.x0, 0.11, 0.09, darkTrim, { x: cx, y: 4.455, z: fz - 0.045, parent: g });
  box(B.x1 - B.x0 + 0.03, 0.04, 0.13, sillMat, { x: cx, y: 4.53, z: fz - 0.045, parent: g, cast: false });
  box(0.09, 0.11, B.z1 - B.z0, darkTrim, { x: B.x1 - 0.045, y: 4.455, z: cz, parent: g });
  box(0.13, 0.04, B.z1 - B.z0 + 0.03, sillMat, { x: B.x1 - 0.045, y: 4.53, z: cz, parent: g, cast: false });

  // slice faces (back edge of the model + left edge)
  const cutMatB = new THREE.MeshBasicMaterial({
    map: A.cutB, toneMapped: true, color: new THREE.Color(0.64, 0.63, 0.7), fog: true,
  });
  plane(B.x1 - B.x0, 4.28, cutMatB, {
    x: cx, y: 2.26, z: B.z0 - 0.006, ry: Math.PI, parent: g, cast: false, receive: false,
  });
  plane(B.z1 - B.z0, 4.28, cutMatB, {
    x: B.x0 - 0.006, y: 2.26, z: cz, ry: -Math.PI / 2, parent: g, cast: false, receive: false,
  });

  /* ---------------- facade: precast panel seams ---------------- */
  const seamMat = mats.toon('#4a4a53');
  const unitGeo = new THREE.BoxGeometry(1, 1, 1);
  const seamT = [];
  for (const sx of [-5.62, -4.62, -3.62, -2.62, -1.62, -0.62, 0.38, 1.14]) {
    seamT.push({ x: sx, y: 2.2, z: fz + 0.006, sx: 0.013, sy: 4.18, sz: 0.012 });
  }
  for (const sy of [0.16, 2.5]) {
    seamT.push({ x: cx, y: sy, z: fz + 0.006, sx: 7.1, sy: 0.015, sz: 0.012 });
  }
  instanced(unitGeo, seamMat, seamT, { parent: g, cast: false, receive: false });

  /* ---------------- 2F windows ---------------- */
  const windowXs = [-4.0, -2.1, 0.6];
  windowXs.forEach((wx, i) => {
    const warm = i === 1;
    box(0.78, 1.12, 0.05, darkTrim, { x: wx, y: 3.32, z: fz + 0.004, parent: g, cast: false });
    plane(0.66, 1.0, warm ? warmGlassMat : darkGlassMat, {
      x: wx, y: 3.32, z: fz + 0.032, parent: g, cast: false, receive: false,
    });
    box(0.03, 1.0, 0.035, frameMat, { x: wx, y: 3.32, z: fz + 0.04, parent: g, cast: false });
    box(0.82, 0.05, 0.1, sillMat, { x: wx, y: 2.78, z: fz + 0.03, parent: g, cast: false });
  });
  // faint warm spill from the lit window
  glowSprite(g, { x: -2.1, y: 3.32, z: fz + 0.16, size: 0.9, color: '#ffc98f', opacity: 0.16 });

  // window guards (fire-escape feel) on the lower half of the 2F windows
  const guardBarT = [];
  const guardRailT = [];
  for (const wx of windowXs) {
    for (const dx of [-0.22, 0, 0.22]) guardBarT.push({ x: wx + dx, y: 3.0, z: fz + 0.12, sx: 0.016, sy: 0.36, sz: 0.016 });
    for (const gy of [2.86, 3.14]) guardRailT.push({ x: wx, y: gy, z: fz + 0.12, sx: 0.7, sy: 0.016, sz: 0.012 });
  }
  instanced(unitGeo, mats.toon('#565963'), guardBarT, { parent: g, cast: false, receive: false });
  instanced(unitGeo, mats.toon('#565963'), guardRailT, { parent: g, cast: false, receive: false });

  /* ---------------- ground floor ---------------- */
  // closed roller shutter (small workshop)
  box(0.8, 2.1, 0.035, mats.toon('#c0bdb4', { map: A.shutter }), {
    x: -4.7, y: 1.19, z: fz + 0.02, parent: g, cast: false,
  });
  box(0.88, 0.15, 0.13, darkTrim, { x: -4.7, y: 2.34, z: fz + 0.055, parent: g, cast: false });
  for (const gx of [-5.13, -4.27]) {
    box(0.045, 2.2, 0.055, frameMat, { x: gx, y: 1.19, z: fz + 0.03, parent: g, cast: false });
  }
  box(0.8, 0.05, 0.05, frameMat, { x: -4.7, y: 0.17, z: fz + 0.04, parent: g, cast: false });

  // steel service door
  const serviceDoor = box(0.8, 2.05, 0.055, mats.toon('#5a5d64'), { x: -3.45, y: 1.145, z: fz + 0.03, parent: g });
  addOutline(ctx, serviceDoor, 0.012, '#26262c');
  plane(0.36, 0.3, darkGlassMat, { x: -3.45, y: 1.8, z: fz + 0.062, parent: g, cast: false, receive: false });
  box(0.07, 0.22, 0.04, metalMat, { x: -3.12, y: 1.08, z: fz + 0.075, parent: g, cast: false });
  box(0.96, 0.07, 0.28, mats.toon('#4f5058'), { x: -3.45, y: 0.16, z: fz + 0.15, parent: g, cast: false });
  // small bulkhead lamp above the door (emissive only)
  box(0.13, 0.08, 0.09, darkTrim, { x: -3.45, y: 2.44, z: fz + 0.07, parent: g, cast: false });
  box(0.1, 0.02, 0.07, new THREE.MeshBasicMaterial({ color: '#ffd8a2', toneMapped: false }), {
    x: -3.45, y: 2.4, z: fz + 0.075, parent: g, cast: false, receive: false,
  });
  glowSprite(g, { x: -3.45, y: 2.38, z: fz + 0.2, size: 0.45, color: '#ffcf98', opacity: 0.28 });

  // meter bank
  box(0.66, 0.56, 0.04, mats.toon('#4b4c54'), { x: -2.55, y: 1.64, z: fz + 0.02, parent: g, cast: false });
  const meterGeo = new THREE.BoxGeometry(0.16, 0.22, 0.09);
  const meterT = [
    { x: -2.73, y: 1.54, z: fz + 0.09 }, { x: -2.37, y: 1.54, z: fz + 0.09 },
    { x: -2.73, y: 1.76, z: fz + 0.09 }, { x: -2.37, y: 1.76, z: fz + 0.09 },
  ];
  instanced(meterGeo, mats.toon('#8f938f'), meterT, { parent: g, cast: false, receive: false });
  plane(0.14, 0.2, new THREE.MeshBasicMaterial({ map: A.meter, toneMapped: true }), {
    x: -2.73, y: 1.54, z: fz + 0.14, parent: g, cast: false, receive: false,
  });

  // old painted door
  const greenDoor = box(0.8, 2.05, 0.055, mats.toon('#4e5a52'), { x: -1.5, y: 1.145, z: fz + 0.03, parent: g });
  addOutline(ctx, greenDoor, 0.012, '#242620');
  plane(0.4, 0.26, darkGlassMat, { x: -1.5, y: 1.82, z: fz + 0.062, parent: g, cast: false, receive: false });
  box(0.06, 0.18, 0.04, metalMat, { x: -1.18, y: 1.05, z: fz + 0.075, parent: g, cast: false });
  box(0.96, 0.07, 0.26, mats.toon('#4f5058'), { x: -1.5, y: 0.16, z: fz + 0.14, parent: g, cast: false });
  box(0.13, 0.08, 0.09, darkTrim, { x: -1.5, y: 2.44, z: fz + 0.07, parent: g, cast: false });
  box(0.1, 0.02, 0.07, new THREE.MeshBasicMaterial({ color: '#ffd8a2', toneMapped: false }), {
    x: -1.5, y: 2.4, z: fz + 0.075, parent: g, cast: false, receive: false,
  });
  glowSprite(g, { x: -1.5, y: 2.38, z: fz + 0.2, size: 0.45, color: '#ffcf98', opacity: 0.24 });

  // barred 1F window
  box(0.8, 0.92, 0.05, darkTrim, { x: -0.5, y: 1.9, z: fz + 0.004, parent: g, cast: false });
  plane(0.7, 0.8, darkGlassMat, { x: -0.5, y: 1.9, z: fz + 0.032, parent: g, cast: false, receive: false });
  const barT = [];
  for (let i = 0; i < 5; i++) barT.push({ x: -0.8 + i * 0.15, y: 1.9, z: fz + 0.09, sx: 0.018, sy: 0.88, sz: 0.018 });
  for (const gy of [1.5, 2.3]) barT.push({ x: -0.5, y: gy, z: fz + 0.09, sx: 0.72, sy: 0.018, sz: 0.014 });
  instanced(unitGeo, mats.toon('#5b5e67'), barT, { parent: g, cast: false, receive: false });

  // ground-standing AC condenser
  acUnit(ctx, g, {
    x: -0.02, y: 0.45, z: fz + 0.26, w: 0.62, h: 0.42, d: 0.28, grille: A.acGrille,
    stand: true, floorY: 0.12, drip: true, outline: true,
  });

  // facade conduit + downpipes
  cyl(0.02, 0.02, 6.1, 6, mats.toon('#555962'), { x: -1.85, y: 2.44, z: fz + 0.045, rz: Math.PI / 2, parent: g, cast: false });
  cyl(0.02, 0.02, 1.0, 6, mats.toon('#555962'), { x: -2.55, y: 1.99, z: fz + 0.045, parent: g, cast: false });
  pipeRun(ctx, g, { x: 1.24, z: fz + 0.05, y0: 0.14, y1: 4.25, r: 0.032, color: '#555962', clamps: 3 });
  pipeRun(ctx, g, { x: -4.28, z: fz + 0.05, y0: 0.14, y1: 4.2, r: 0.026, color: '#555962', clamps: 2 });

  // vent louvres on the 2F wall
  const ventT = [];
  for (let i = 0; i < 4; i++) ventT.push({ x: 0.06, y: 2.86 + i * 0.05, z: fz + 0.03, sx: 0.4, sy: 0.022, sz: 0.02 });
  instanced(unitGeo, mats.toon('#545760'), ventT, { parent: g, cast: false, receive: false });

  // posted notices + building plaque
  const noticeSpots = [
    { x: -3.95, y: 1.5, ry: -0.03, tex: A.notices[0] },
    { x: -2.05, y: 1.9, ry: 0.04, tex: A.notices[2] },
    { x: -1.05, y: 1.56, ry: -0.02, tex: A.notices[1] },
  ];
  for (const n of noticeSpots) {
    plane(0.18, 0.25, new THREE.MeshBasicMaterial({ map: n.tex, toneMapped: true }), {
      x: n.x, y: n.y, z: fz + 0.035, ry: n.ry, parent: g, cast: false, receive: false,
    });
  }
  plane(0.5, 0.12, new THREE.MeshBasicMaterial({ map: A.backPlaque, toneMapped: true }), {
    x: 0.92, y: 2.16, z: fz + 0.03, parent: g, cast: false, receive: false,
  });
  plane(0.3, 0.075, new THREE.MeshBasicMaterial({ map: A.servicePlaque, toneMapped: true }), {
    x: -3.98, y: 2.24, z: fz + 0.03, parent: g, cast: false, receive: false,
  });

  // fire-escape ladder (2F -> roof)
  for (const lx of [0.96, 1.24]) {
    box(0.03, 2.0, 0.03, mats.toon('#585b64'), { x: lx, y: 3.3, z: fz + 0.1, parent: g, cast: false });
  }
  const rungT = [];
  for (let i = 0; i < 7; i++) rungT.push({ x: 1.1, y: 2.42 + i * 0.3, z: fz + 0.1, sx: 0.3, sy: 0.024, sz: 0.024 });
  instanced(unitGeo, mats.toon('#585b64'), rungT, { parent: g, cast: false, receive: false });
  for (const sy of [2.4, 4.2]) {
    box(0.05, 0.04, 0.16, mats.toon('#4c4f57'), { x: 1.1, y: sy, z: fz + 0.04, parent: g, cast: false });
  }

  /* ---------------- right end wall (faces the side street) ---------------- */
  const rx = B.x1 + 0.002;
  pipeRun(ctx, g, { x: B.x1 + 0.05, z: -5.62, y0: 0.14, y1: 4.2, r: 0.03, color: '#555962', clamps: 2 });
  decal(g, { x: rx, y: 1.1, z: -5.35, w: 0.5, h: 1.4, ry: Math.PI / 2, map: A.grime, opacity: 0.5 });
  box(0.04, 0.5, 0.6, darkTrim, { x: B.x1 + 0.005, y: 2.9, z: -5.5, parent: g, cast: false });
  plane(0.5, 0.42, darkGlassMat, { x: B.x1 + 0.035, y: 2.9, z: -5.5, ry: Math.PI / 2, parent: g, cast: false, receive: false });
  box(0.04, 0.34, 0.24, mats.toon('#6b6b73'), { x: B.x1 + 0.02, y: 1.45, z: -5.15, parent: g, cast: false });

  /* ---------------- roof clutter ---------------- */
  tvAntenna(ctx, g, { x: -1.6, y: 4.4, z: -5.35, ry: 0.12 });
  // water tank
  cyl(0.3, 0.3, 0.55, 10, mats.toon('#6f727a'), { x: -4.35, y: 4.68, z: -5.35, parent: g });
  cyl(0.22, 0.26, 0.09, 10, mats.toon('#5f626a'), { x: -4.35, y: 5.0, z: -5.35, parent: g, cast: false });
  // vents
  cyl(0.05, 0.05, 0.5, 7, metalMat, { x: -3.25, y: 4.65, z: -5.45, parent: g });
  cyl(0.09, 0.09, 0.05, 7, metalMat, { x: -3.25, y: 4.9, z: -5.45, parent: g, cast: false });
  cyl(0.04, 0.04, 0.42, 7, metalMat, { x: 0.35, y: 4.61, z: -5.5, parent: g });
  // satellite dish
  cyl(0.2, 0.2, 0.02, 12, mats.toon('#8d9199'), { x: 0.72, y: 4.85, z: -5.42, rx: 1.15, parent: g, cast: false });
  cyl(0.012, 0.012, 0.3, 4, metalMat, { x: 0.72, y: 4.56, z: -5.42, rz: 0.3, parent: g, cast: false });
  // roof tar seams + moss
  const tarT = [];
  for (let i = 0; i < 4; i++) tarT.push({ x: -5.0 + i * 1.8, y: 4.404, z: -5.4 + (i % 2) * 0.1, sx: 1.5, sy: 0.008, sz: 0.05, ry: 0.05 });
  instanced(unitGeo, mats.toon('#37373e'), tarT, { parent: g, cast: false, receive: false });
  decal(g, { x: -2.2, y: 4.405, z: -5.3, w: 1.4, h: 0.5, map: A.moss, opacity: 0.5, ground: true });
  decal(g, { x: 0.1, y: 4.406, z: -5.55, w: 1.0, h: 0.35, map: A.grime, opacity: 0.45, ground: true });

  return g;
}

export function buildBackAlley(ctx, parent, A) {
  const { mats } = ctx;
  const g = group('back-alley', parent);
  const wallZ = L.backBuilding.z1; // -5.0
  const storeZ = L.store.z0; // -3.62
  const floorY = 0.12;

  const metalMat = mats.toon('#5c606a');
  const darkMetal = mats.toon('#3b3e46');

  /* ---------------- corrugated overhang ---------------- */
  const sheet = box(5.5, 0.045, 0.72, mats.toon('#a4a9b2', { map: A.corrugated }), {
    x: -1.75, y: 2.56, z: wallZ + 0.35, parent: g,
  });
  sheet.rotation.x = 0.26;
  addOutline(ctx, sheet, 0.016, OUTLINE_COLOR);
  box(5.5, 0.08, 0.035, darkMetal, { x: -1.75, y: 2.45, z: wallZ + 0.69, parent: g, cast: false });
  cyl(0.035, 0.035, 5.44, 7, metalMat, { x: -1.75, y: 2.43, z: wallZ + 0.71, rz: Math.PI / 2, parent: g, cast: false });
  // brackets to the wall
  for (const bx of [-3.6, -0.6, 0.7]) {
    cylinderBetween(
      new THREE.Vector3(bx, 2.66, wallZ + 0.02),
      new THREE.Vector3(bx, 2.46, wallZ + 0.66),
      0.018, metalMat, { parent: g, cast: false },
    );
  }
  // posts at the outer edge
  for (const px of [-3.7, 0.55]) {
    cyl(0.03, 0.03, 2.32, 7, metalMat, { x: px, y: floorY + 1.16, z: wallZ + 0.68, parent: g });
    box(0.15, 0.04, 0.15, darkMetal, { x: px, y: floorY + 0.02, z: wallZ + 0.68, parent: g, cast: false });
  }
  // downpipe from the gutter
  cyl(0.026, 0.026, 2.3, 6, metalMat, { x: 0.95, y: floorY + 1.15, z: wallZ + 0.7, parent: g, cast: false });

  /* ---------------- wall lamp ---------------- */
  wallLamp(ctx, g, {
    x: -2.9, y: 2.2, z: wallZ + 0.045, ry: 0, intensity: 1.45, distance: 3.0,
    size: 0.55, pool: [[-2.9, floorY + 0.008, wallZ + 0.6], [1.9, 1.25]], poolOpacity: 0.5,
  });

  /* ---------------- crates / gas / bins ---------------- */
  crateStacks(ctx, g, [
    {
      color: '#c8a445',
      map: A.crate,
      items: [
        { x: -1.78, y: floorY + 0.135, z: -4.72 },
        { x: -1.78, y: floorY + 0.405, z: -4.72 },
        { x: -1.42, y: floorY + 0.135, z: -4.7, ry: 0.06 },
        { x: -1.06, y: floorY + 0.135, z: -4.76, ry: -0.05 },
      ],
    },
    {
      color: '#a85a4f',
      map: A.crate,
      items: [
        { x: -1.42, y: floorY + 0.405, z: -4.7, ry: 0.06 },
        { x: -1.06, y: floorY + 0.405, z: -4.76, ry: -0.05 },
        { x: -1.06, y: floorY + 0.675, z: -4.76, ry: 0.02 },
      ],
    },
  ]);
  gasCylinders(ctx, g, [
    { x: 0.18, z: -4.72 },
    { x: 0.52, z: -4.74 },
    { x: 0.84, z: -4.7 },
  ], floorY);

  // bins against the store back wall
  const binT = box(0.44, 0.54, 0.44, mats.toon('#555d63'), { x: -2.55, y: floorY + 0.27, z: storeZ - 0.24, parent: g });
  addOutline(ctx, binT, 0.012, '#22242a');
  box(0.48, 0.05, 0.48, mats.toon('#454b52'), { x: -2.55, y: floorY + 0.56, z: storeZ - 0.24, parent: g, cast: false });
  box(0.4, 0.48, 0.4, mats.toon('#3f5c78'), { x: -2.05, y: floorY + 0.24, z: storeZ - 0.23, parent: g });
  box(0.44, 0.045, 0.44, mats.toon('#35506a'), { x: -2.05, y: floorY + 0.5, z: storeZ - 0.23, parent: g, cast: false });
  cyl(0.14, 0.11, 0.26, 8, mats.toon('#6b6f66'), { x: -1.66, y: floorY + 0.13, z: storeZ - 0.26, parent: g, cast: false });

  /* ---------------- drain channel + puddles ---------------- */
  box(1.6, 0.014, 0.16, mats.toon('#262a33'), { x: -0.4, y: floorY + 0.007, z: storeZ - 0.16, parent: g, cast: false });
  const drainT = [];
  for (let i = 0; i < 7; i++) drainT.push({ x: -1.1 + i * 0.22, y: floorY + 0.02, z: storeZ - 0.16, sx: 0.05, sy: 0.02, sz: 0.13 });
  instanced(unitGeo(), mats.toon('#545a63'), drainT, { parent: g, cast: false, receive: false });
  const puddleMat = new THREE.MeshBasicMaterial({
    color: '#1a2740', transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false, fog: true,
  });
  const pud1 = circle(0.5, 14, puddleMat, { x: -3.55, y: floorY + 0.012, z: -4.16, ground: true, cast: false, receive: false, parent: g });
  pud1.scale.set(1, 0.42, 1);
  const pud2 = circle(0.42, 14, puddleMat, { x: 0.55, y: floorY + 0.012, z: -3.96, ground: true, cast: false, receive: false, parent: g });
  pud2.scale.set(1, 0.5, 1);

  /* ---------------- cables + notice board + shelf ---------------- */
  cable(ctx, g, new THREE.Vector3(-4.5, 3.02, wallZ + 0.03), new THREE.Vector3(1.16, 2.98, wallZ + 0.03), 0.13, 0.008);
  cable(ctx, g, new THREE.Vector3(-4.35, 3.36, wallZ + 0.03), new THREE.Vector3(0.9, 3.3, wallZ + 0.03), 0.15, 0.007);
  cyl(0.007, 0.007, 1.35, 4, mats.toon('#3f3d44'), { x: -3.4, y: 2.65, z: wallZ + 0.04, parent: g, cast: false });
  const bracketT = [];
  for (const bx of [-4.2, -2.6, -1.0, 0.8]) bracketT.push({ x: bx, y: 3.02, z: wallZ + 0.04, sx: 0.05, sy: 0.09, sz: 0.05 });
  instanced(unitGeo(), mats.toon('#4a4d55'), bracketT, { parent: g, cast: false, receive: false });

  // small wooden notice board + notices
  box(0.55, 0.7, 0.035, mats.toon('#584632'), { x: -0.68, y: 1.72, z: wallZ + 0.03, parent: g, cast: false });
  plane(0.18, 0.24, new THREE.MeshBasicMaterial({ map: A.notices[1], toneMapped: true }), {
    x: -0.78, y: 1.78, z: wallZ + 0.055, ry: 0.03, parent: g, cast: false, receive: false,
  });
  plane(0.18, 0.24, new THREE.MeshBasicMaterial({ map: A.notices[2], toneMapped: true }), {
    x: -0.56, y: 1.7, z: wallZ + 0.055, ry: -0.04, parent: g, cast: false, receive: false,
  });
  // small metal shelf with spare cardboard boxes
  box(0.8, 0.03, 0.22, mats.toon('#5c5a52'), { x: -0.1, y: 1.52, z: wallZ + 0.15, parent: g, cast: false });
  box(0.8, 0.03, 0.22, mats.toon('#5c5a52'), { x: -0.1, y: 1.98, z: wallZ + 0.15, parent: g, cast: false });
  for (const bx of [-0.44, 0.24]) {
    box(0.03, 0.5, 0.18, darkMetal, { x: bx, y: 1.75, z: wallZ + 0.1, parent: g, cast: false });
  }
  box(0.24, 0.2, 0.24, mats.toon('#8a7454'), { x: -0.3, y: 1.64, z: wallZ + 0.16, parent: g, cast: false });
  box(0.2, 0.16, 0.2, mats.toon('#7d6949'), { x: 0.02, y: 1.62, z: wallZ + 0.16, parent: g, cast: false, ry: 0.2 });
  box(0.22, 0.18, 0.22, mats.toon('#86714f'), { x: -0.22, y: 2.1, z: wallZ + 0.16, parent: g, cast: false });

  /* ---------------- AC units ---------------- */
  acUnit(ctx, g, {
    x: -3.95, y: 0.46, z: -4.78, w: 0.62, h: 0.42, d: 0.28, grille: A.acGrille,
    stand: true, floorY, outline: true, drip: true,
  });
  acUnit(ctx, g, {
    x: 0.98, y: 2.05, z: wallZ + 0.2, w: 0.6, h: 0.4, d: 0.26, grille: A.acGrille,
    bracket: true, drip: false, outline: true,
  });

  /* ---------------- a few weeds in the cracks + clear walkway ---------------- */
  const rand = ctx.rng(31);
  const weedT = [];
  for (let i = 0; i < 12; i++) {
    const wx = -4.4 + rand() * 5.4;
    const wz = wallZ + 0.06 + rand() * 0.22;
    weedT.push({ x: wx, z: wz, ry: rand() * 3, sx: 0.7 + rand() * 0.6 });
  }
  weeds(ctx, g, weedT, floorY);

  return g;
}

let _unitGeo = null;
function unitGeo() {
  if (!_unitGeo) _unitGeo = new THREE.BoxGeometry(1, 1, 1);
  return _unitGeo;
}
