/* Back-wall glowing drinks fridge: sliding glass doors, rows of cans and
 * bottles, lit header lightbox. Built against the Lead's back-wall lining.
 */
import * as THREE from 'three';

export function buildDrinksWall(I, S) {
  const { F, Z0, toon, box, plane, sign, inst, outline, rand, p } = I;

  const x0 = -2.56;
  const x1 = 1.07;
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const zBack = Z0 + 0.02; // -3.41
  const depth = 0.58;
  const zFront = zBack + depth; // -2.83
  const zc = zBack + depth / 2;
  const hBody = 1.9;
  const yTop = F + hBody; // 2.04

  const grp = I.group('drinks-fridge');
  const shell = toon('#eef3f2');
  const shellEdge = toon('#dbe4e3');
  const steel = toon('#c3ccd2');

  /* ---- carcass ---- */
  const panelL = box(0.07, hBody, depth, shell, { x: x0 + 0.035, y: F + hBody / 2, z: zc, parent: grp });
  const panelR = box(0.07, hBody, depth, shell, { x: x1 - 0.035, y: F + hBody / 2, z: zc, parent: grp });
  outline(panelL, 0.012, '#2a3138');
  outline(panelR, 0.012, '#2a3138');
  box(w, 0.08, depth, shell, { x: cx, y: yTop - 0.04, z: zc, parent: grp });
  box(w, 0.16, depth + 0.01, shellEdge, { x: cx, y: F + 0.08, z: zc, parent: grp }); // toe kick
  // thin side trims so the cavity reads as a cabinet
  box(0.025, hBody - 0.2, 0.03, steel, { x: x0 + 0.075, y: F + hBody / 2, z: zFront - 0.015, parent: grp });
  box(0.025, hBody - 0.2, 0.03, steel, { x: x1 - 0.075, y: F + hBody / 2, z: zFront - 0.015, parent: grp });

  /* ---- lit interior ---- */
  box(w - 0.02, hBody - 0.14, 0.05, toon('#cfe0e4'), { x: cx, y: F + hBody / 2 - 0.02, z: zBack + 0.03, parent: grp });
  sign(S.fridgeBack, w - 0.16, hBody - 0.18, {
    x: cx, y: F + hBody / 2 - 0.02, z: zBack + 0.062, mul: 0.98, fog: true,
  });
  // pale side walls of the cavity
  const sideGlow = I.glow(p.fridgeLight, 0.82);
  box(0.02, hBody - 0.16, depth - 0.14, sideGlow, { x: x0 + 0.085, y: F + hBody / 2, z: zc, cast: false, parent: grp });
  box(0.02, hBody - 0.16, depth - 0.14, sideGlow, { x: x1 - 0.085, y: F + hBody / 2, z: zc, cast: false, parent: grp });

  /* ---- shelves + product rows ---- */
  const shelfYs = [F + 0.34, F + 0.66, F + 0.98, F + 1.3, F + 1.62];
  const plateMat = toon('#dfe8ea');
  const trim = [];
  shelfYs.forEach((y) => {
    trim.push({ x: cx, y, z: zBack + 0.3, sx: w - 0.16, sy: 0.024, sz: 0.46 });
    trim.push({ x: cx, y: y - 0.012, z: zBack + 0.53, sx: w - 0.16, sy: 0.03, sz: 0.018 });
  });
  inst(I.unitBox, plateMat, trim, { cast: false, receive: true });

  const CAN = ['#d8564c', '#4e9fd0', '#f2c14e', '#5fb37c', '#f4eee2', '#e88a45', '#8a6fb5', '#48b8bf'];
  const BOT = ['#4eb4d8', '#f285a8', '#a8d06a', '#f5cd6b', '#f4eee2', '#7d6ab5', '#e0574c'];
  const canT = [];
  const capT = [];
  const botT = [];
  const cols = 38;
  const colStep = (w - 0.26) / (cols - 1);
  const rowZ = [zBack + 0.17, zBack + 0.42];

  const placeCans = (y, zRow, colors, from = 0, to = cols) => {
    for (let i = from; i < to; i++) {
      const x = x0 + 0.13 + i * colStep;
      canT.push({ x, y: y + 0.012 + 0.0675, z: zRow, sx: 0.063, sy: 0.135, sz: 0.063, color: colors[i % colors.length] });
    }
  };
  const placeBottles = (y, zRow, colors) => {
    for (let i = 0; i < cols; i++) {
      const x = x0 + 0.13 + i * colStep;
      const c = colors[i % colors.length];
      botT.push({ x, y: y + 0.012 + 0.11, z: zRow, sx: 0.068, sy: 0.22, sz: 0.068, color: c });
      capT.push({ x, y: y + 0.012 + 0.225, z: zRow, sx: 0.034, sy: 0.022, sz: 0.034 });
    }
  };

  // shelf mixes: (front row is what you see first)
  placeCans(shelfYs[0], rowZ[0], CAN);
  placeBottles(shelfYs[0], rowZ[1], BOT);
  placeCans(shelfYs[1], rowZ[0], CAN);
  placeBottles(shelfYs[1], rowZ[1], BOT);
  placeBottles(shelfYs[2], rowZ[0], BOT);
  placeBottles(shelfYs[2], rowZ[1], BOT);
  placeCans(shelfYs[3], rowZ[0], CAN);
  placeCans(shelfYs[3], rowZ[1], CAN);
  placeCans(shelfYs[4], rowZ[0], CAN);
  placeCans(shelfYs[4], rowZ[1], CAN);

  // group by colour -> one instanced mesh per colour (cheap + safe)
  const byColor = (arr) => {
    const map = new Map();
    arr.forEach((t) => {
      if (!map.has(t.color)) map.set(t.color, []);
      map.get(t.color).push(t);
    });
    return map;
  };
  byColor(canT).forEach((list, color) => {
    inst(I.unitCyl, toon(color), list, { cast: false, receive: true });
  });
  byColor(botT).forEach((list, color) => {
    inst(I.unitCyl, toon(color), list, { cast: false, receive: true });
  });
  inst(I.unitCyl, toon('#f2ead6'), capT, { cast: false, receive: true });

  /* ---- sliding glass doors ---- */
  const doorH = 1.8;
  const doorY = F + 0.16 + doorH / 2; // 0.14+0.16+0.9
  const doorW = (w - 0.08) / 4;
  const frameMat = toon('#9aa4ab');
  const frameT = [];
  for (let i = 0; i < 4; i++) {
    const xa = x0 + 0.04 + doorW * i;
    // outer vertical stiles of every door, interior mullion in the middle
    frameT.push({ x: xa + 0.017, y: doorY, z: zFront - 0.03, sx: 0.034, sy: doorH, sz: 0.05 });
    frameT.push({ x: xa + doorW - 0.017, y: doorY, z: zFront - 0.03, sx: 0.034, sy: doorH, sz: 0.05 });
    frameT.push({ x: xa + doorW / 2, y: doorY + doorH / 2 - 0.03, z: zFront - 0.03, sx: doorW - 0.05, sy: 0.05, sz: 0.05 });
    frameT.push({ x: xa + doorW / 2, y: doorY - doorH / 2 + 0.035, z: zFront - 0.03, sx: doorW - 0.05, sy: 0.07, sz: 0.05 });
    // vertical pull handle
    const hx = xa + (i % 2 === 0 ? doorW - 0.11 : 0.11);
    frameT.push({ x: hx, y: doorY - 0.05, z: zFront - 0.005, sx: 0.026, sy: 0.62, sz: 0.06 });
  }
  inst(I.unitBox, frameMat, frameT, { cast: false, receive: true });

  const glass = I.glassMat({ color: '#d6f0fb', opacity: 0.08 });
  for (let i = 0; i < 4; i++) {
    const xa = x0 + 0.04 + doorW * i;
    const pane = plane(doorW - 0.07, doorH - 0.12, glass, {
      x: xa + doorW / 2, y: doorY, z: zFront - 0.055, cast: false, receive: false, parent: grp,
    });
    pane.renderOrder = 4;
  }
  // subtle inner glow spill on the floor in front of the fridge
  const spill = I.glow('#bfe9ff', 0.5, { transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
  const spillPlane = I.plane(w - 0.2, 0.62, spill, {
    x: cx, y: F + 0.012, z: zFront + 0.38, ground: true, cast: false, receive: false, parent: grp,
  });
  spillPlane.renderOrder = 1;

  /* ---- header lightbox ---- */
  const lbox = box(w + 0.08, 0.34, 0.2, toon('#e8eef0'), { x: cx, y: yTop + 0.2, z: zFront - 0.09, parent: grp });
  outline(lbox, 0.014, '#26303a');
  sign(S.fridgeHeader, w, 0.29, { x: cx, y: yTop + 0.2, z: zFront + 0.015, mul: 1.28, parent: grp });
  // warm down-light strip under the box
  box(w, 0.028, 0.03, I.glow(p.warm, 1.5), { x: cx, y: yTop + 0.028, z: zFront - 0.03, cast: false, receive: false, parent: grp });
  // small cooler brand plate on the left panel
  sign(S.coolerPlate, 0.2, 0.1, { x: x0 - 0.008, y: F + 1.52, z: zFront - 0.1, ry: -Math.PI / 2, parent: grp });

  return grp;
}
