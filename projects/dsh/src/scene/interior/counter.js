/* Checkout counter with register/POS, customer display, card reader,
 * hot-snack warmer, oden pot (steam hookups returned) and coffee machine,
 * plus hanging menu boards above it.
 */
import * as THREE from 'three';

export function buildCounter(I, S) {
  const { F, toon, box, cyl, sign, inst, outline, p } = I;
  const grp = I.group('counter');
  const F0 = F;
  const TOP = F0 + 0.95; // counter surface 1.09
  const x0 = 0.52;
  const x1 = 1.06;
  const cx = (x0 + x1) / 2; // 0.79
  const z0 = -1.28;
  const z1 = 0.62;
  const zc = (z0 + z1) / 2; // -0.33
  const len = z1 - z0;

  const bodyMat = toon('#f3ecdd');
  const steel = toon('#c7ced3');
  const dark = toon('#2c303c');

  /* ---- carcass ---- */
  const body = box(x1 - x0, 0.9, len, bodyMat, { x: cx, y: F0 + 0.45, z: zc, parent: grp });
  outline(body, 0.014, '#2c2a2e');
  box(x1 - x0 - 0.08, 0.11, len - 0.06, toon('#3c4049'), { x: cx, y: F0 + 0.055, z: zc, parent: grp });
  const topSlab = I.rounded(x1 - x0 + 0.06, 0.055, len + 0.06, 0.014, toon('#faf4e6'), {
    x: cx, y: TOP - 0.0275, z: zc, parent: grp,
  });
  topSlab.receiveShadow = true;
  // front trim band + posters on the customer side
  box(0.012, 0.07, len - 0.1, toon('#2fa89b'), { x: x0 - 0.006, y: TOP - 0.12, z: zc, cast: false, parent: grp });
  box(0.012, 0.03, len - 0.1, toon('#ed8b4e'), { x: x0 - 0.006, y: TOP - 0.175, z: zc, cast: false, parent: grp });
  sign(S.posters.coffee, 0.36, 0.5, { x: x0 - 0.008, y: F0 + 0.62, z: 0.32, ry: -Math.PI / 2, parent: grp });
  sign(S.posters.new, 0.34, 0.46, { x: x0 - 0.008, y: F0 + 0.6, z: -0.18, ry: -Math.PI / 2, parent: grp });
  // staff side (visible through the side glass): metal panels + posters
  box(0.014, 0.34, len - 0.1, toon('#d6dde1'), { x: x1 + 0.006, y: F0 + 0.76, z: zc, cast: false, parent: grp });
  sign(S.posters.sale, 0.42, 0.58, { x: x1 + 0.012, y: F0 + 0.38, z: -0.5, ry: Math.PI / 2, parent: grp });
  sign(S.hotLabel, 0.38, 0.19, { x: x1 + 0.012, y: F0 + 0.83, z: 0.34, ry: Math.PI / 2, mul: 0.95, parent: grp });
  // end panel facing the entrance
  sign(S.cashierSign, 0.5, 0.26, { x: cx, y: F0 + 0.7, z: z1 + 0.006, parent: grp });
  box(0.5, 0.014, 0.014, toon('#ed8b4e'), { x: cx, y: F0 + 0.56, z: z1 + 0.01, cast: false, parent: grp });

  /* ================= hot snack warmer ================= */
  const hz = 0.4;
  const warmBase = box(0.42, 0.16, 0.34, steel, { x: cx, y: TOP + 0.08, z: hz, parent: grp });
  outline(warmBase, 0.01, '#3a3d44');
  const warmGlass = box(0.42, 0.26, 0.34, I.glassMat({ color: '#ffe7c2', opacity: 0.2 }), {
    x: cx, y: TOP + 0.16 + 0.13, z: hz, cast: false, receive: false, parent: grp,
  });
  warmGlass.renderOrder = 3;
  box(0.44, 0.045, 0.36, toon('#d8dee2'), { x: cx, y: TOP + 0.16 + 0.26 + 0.022, z: hz, parent: grp });
  box(0.38, 0.02, 0.3, toon('#b8c0c6'), { x: cx, y: TOP + 0.16 + 0.02, z: hz, parent: grp, cast: false });
  box(0.38, 0.02, 0.3, toon('#b8c0c6'), { x: cx, y: TOP + 0.16 + 0.15, z: hz, parent: grp, cast: false });
  box(0.36, 0.2, 0.012, I.glow('#ffb45e', 1.35, { transparent: true, opacity: 0.85 }), {
    x: cx, y: TOP + 0.16 + 0.13, z: hz - 0.15, cast: false, receive: false, parent: grp,
  });
  const chicken = [];
  for (let i = 0; i < 9; i++) {
    chicken.push({
      x: cx - 0.14 + (i % 3) * 0.12, y: TOP + 0.185 + Math.floor(i / 3) * 0.085,
      z: hz - 0.06 + (i % 2) * 0.1, sx: 0.062, sy: 0.05, sz: 0.055, ry: i * 0.7,
    });
  }
  inst(I.unitBox, toon('#b9722c'), chicken, { cast: false, receive: true });
  // label clipped to the end of the warmer
  sign(S.hotLabel, 0.16, 0.08, { x: cx, y: TOP + 0.1, z: hz + 0.176, parent: grp });

  /* ================= oden pot ================= */
  const oz = 0.08;
  const pot = box(0.36, 0.17, 0.3, toon('#cdd4d8'), { x: cx, y: TOP + 0.085, z: oz, parent: grp });
  outline(pot, 0.008, '#3a3d44');
  const broth = I.plane(0.3, 0.24, I.glow('#d99a3f', 1.15), {
    x: cx, y: TOP + 0.158, z: oz, ground: true, cast: false, receive: false, parent: grp,
  });
  broth.renderOrder = 2;
  // dividers
  const grid = [];
  for (let i = 1; i <= 2; i++) grid.push({ x: cx - 0.12 + i * 0.12, y: TOP + 0.16, z: oz, sx: 0.008, sy: 0.03, sz: 0.24 });
  grid.push({ x: cx, y: TOP + 0.16, z: oz, sx: 0.3, sy: 0.03, sz: 0.008 });
  inst(I.unitBox, toon('#9aa3a8'), grid, { cast: false, receive: true });
  const odenItems = [
    ['#efe6cf', [[-0.1, -0.05, 0.05, 0.05], [0.02, 0.06, 0.045, 0.045], [0.12, -0.02, 0.05, 0.05]]],
    ['#f7f0dc', [[-0.06, 0.07, 0.055, 0.06], [0.08, 0.07, 0.05, 0.055]]],
    ['#6f5a4a', [[-0.12, 0.06, 0.05, 0.035], [0.0, -0.07, 0.055, 0.03], [0.11, 0.06, 0.045, 0.03]]],
  ];
  odenItems.forEach(([color, list]) => {
    inst(I.unitCyl, toon(color), list.map((it) => ({
      x: cx + it[0], y: TOP + 0.17, z: oz + it[1], sx: it[2], sy: 0.035, sz: it[2],
    })), { cast: false, receive: true });
  });
  // lid leaning on the end + label stand
  const lid = box(0.3, 0.018, 0.24, toon('#bcc4c9'), { x: cx, y: TOP + 0.19, z: oz - 0.19, parent: grp });
  lid.rotation.x = 0.35;
  sign(S.odenLabel, 0.17, 0.085, { x: cx, y: TOP + 0.115, z: oz + 0.158, parent: grp });

  /* ================= coffee machine ================= */
  const cz = -0.44;
  const coffeeBody = box(0.36, 0.46, 0.32, toon('#3a3f4a'), { x: cx, y: TOP + 0.23, z: cz, parent: grp });
  outline(coffeeBody, 0.012, '#22252c');
  sign(S.coffeeFront, 0.29, 0.4, { x: x0 + 0.085, y: TOP + 0.25, z: cz, ry: -Math.PI / 2, parent: grp });
  sign(S.coffeeBackLabel, 0.19, 0.095, { x: x0 + 0.455, y: TOP + 0.36, z: cz, ry: Math.PI / 2, parent: grp });
  // hopper + lid
  box(0.2, 0.13, 0.19, toon('#2b2f38'), { x: cx + 0.04, y: TOP + 0.46 + 0.065, z: cz - 0.03, parent: grp });
  box(0.17, 0.03, 0.16, toon('#e4d9c4'), { x: cx + 0.04, y: TOP + 0.46 + 0.145, z: cz - 0.03, parent: grp });
  // cup shelf + drip tray + cups
  box(0.34, 0.025, 0.1, toon('#c9d0d5'), { x: cx, y: TOP + 0.21, z: cz + 0.19, parent: grp });
  box(0.3, 0.012, 0.07, toon('#5a6068'), { x: cx, y: TOP + 0.232, z: cz + 0.19, parent: grp, cast: false });
  const cups = [];
  for (let i = 0; i < 3; i++) {
    cups.push({ x: cx - 0.09 + i * 0.09, y: TOP + 0.26, z: cz + 0.19, sx: 0.052, sy: 0.07, sz: 0.052 });
  }
  inst(I.unitCyl, toon('#f8f3e6'), cups, { cast: false, receive: true });
  box(0.05, 0.03, 0.05, toon('#20242c'), { x: cx, y: TOP + 0.435, z: cz + 0.13, parent: grp }); // spout
  const coffeeScreenGlow = I.glow('#8fe3a8', 0.9, { transparent: true, opacity: 0.55 });
  I.plane(0.2, 0.1, coffeeScreenGlow, { x: x0 + 0.078, y: TOP + 0.33, z: cz, ry: -Math.PI / 2, cast: false, receive: false, parent: grp });

  /* ================= register / POS ================= */
  const rz = -0.92;
  box(0.32, 0.09, 0.28, toon('#4a4f58'), { x: cx, y: TOP + 0.045, z: rz, parent: grp });
  box(0.3, 0.1, 0.24, toon('#e2ddd0'), { x: cx, y: TOP + 0.14, z: rz, parent: grp });
  box(0.26, 0.022, 0.18, toon('#d3cdbe'), { x: cx, y: TOP + 0.2, z: rz, parent: grp });
  const keys = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      keys.push({ x: cx - 0.1 + c * 0.05, y: TOP + 0.213, z: rz - 0.06 + r * 0.04, sx: 0.035, sy: 0.008, sz: 0.026 });
    }
  }
  inst(I.unitBox, toon('#f4efe2'), keys, { cast: false, receive: false });
  // POS screen on a stand, angled towards the front-left so it reads from outside
  const posGrp = I.group('pos-head', grp);
  posGrp.position.set(cx + 0.03, TOP + 0.2, rz - 0.02);
  posGrp.rotation.y = -Math.PI / 2 + 0.55;
  I.cyl(0.012, 0.016, 0.1, 8, toon('#3c4049'), { x: 0, y: 0.05, z: 0, parent: posGrp });
  const posBezel = I.box(0.28, 0.2, 0.02, toon('#20232a'), { x: 0, y: 0.2, z: 0.012, parent: posGrp });
  posBezel.rotation.x = -0.42;
  const posScreen = I.sign(S.registerScreen, 0.25, 0.165, { x: 0, y: 0.2, z: 0.024, parent: posGrp, mul: 1.1 });
  posScreen.rotation.x = -0.42;
  // customer-facing sub display on a short pole (faces the entrance)
  const cdisp = I.group('cust-display', grp);
  cdisp.position.set(cx - 0.06, TOP + 0.06, rz + 0.14);
  I.cyl(0.011, 0.011, 0.16, 8, toon('#3c4049'), { x: 0, y: 0.08, z: 0, parent: cdisp });
  I.box(0.26, 0.14, 0.022, toon('#1c2027'), { x: 0, y: 0.22, z: 0, parent: cdisp });
  I.sign(S.customerDisplay, 0.235, 0.115, { x: 0, y: 0.22, z: 0.014, parent: cdisp, mul: 1.15 });
  // card reader + receipt printer
  box(0.16, 0.035, 0.13, toon('#d9d4c7'), { x: cx - 0.08, y: TOP + 0.017, z: rz + 0.26, parent: grp });
  I.sign(S.cardReader, 0.12, 0.095, { x: cx - 0.08, y: TOP + 0.075, z: rz + 0.26, rx: -0.95, parent: grp, mul: 1.05 });
  box(0.13, 0.1, 0.13, toon('#e4ded0'), { x: cx + 0.09, y: TOP + 0.06, z: rz + 0.26, parent: grp });
  I.sign(S.customerDisplay, 0.1, 0.05, { x: cx + 0.09, y: TOP + 0.13, z: rz + 0.26, rx: -0.7, parent: grp, mul: 0.8 });
  // paper slip
  I.plane(0.05, 0.09, toon('#fbf7ea'), { x: cx + 0.09, y: TOP + 0.12, z: rz + 0.32, rx: 0.35, cast: false, receive: false, parent: grp });
  // small counter clutter
  cyl(0.035, 0.03, 0.07, 10, toon('#8fb6c9'), { x: cx - 0.17, y: TOP + 0.035, z: rz + 0.34, parent: grp });
  const pens = [];
  for (let i = 0; i < 3; i++) pens.push({ x: cx - 0.17 + (i - 1) * 0.012, y: TOP + 0.1, z: rz + 0.34 + (i - 1) * 0.01, sx: 0.008, sy: 0.14, sz: 0.008, rz: 0.12 * (i - 1) });
  inst(I.unitCyl8, toon('#2d6b8a'), pens, { cast: false, receive: true });
  I.sphere(0.022, toon('#e8c04a'), { x: cx + 0.16, y: TOP + 0.03, z: rz + 0.05, parent: grp }); // service bell

  /* ================= hanging menu boards ================= */
  const boards = [
    { tex: S.menuBoard, w: 0.6, h: 0.38, y: 2.16, z: 0.22 },
    { tex: S.adCoffee, w: 0.54, h: 0.34, y: 2.18, z: -0.6 },
  ];
  const rods = [];
  boards.forEach((b) => {
    I.sign(b.tex, b.w, b.h, { x: cx, y: b.y, z: b.z, ry: Math.PI / 2, side: THREE.DoubleSide, mul: 0.97, parent: grp });
    rods.push({ x: cx, y: b.y + b.h / 2 + 0.135, z: b.z - b.w * 0.3, sx: 0.014, sy: 0.27, sz: 0.014 });
    rods.push({ x: cx, y: b.y + b.h / 2 + 0.135, z: b.z + b.w * 0.3, sx: 0.014, sy: 0.27, sz: 0.014 });
  });
  inst(I.unitBox, toon('#8b9098'), rods, { cast: false, receive: false });

  // warm linear light above the counter, just under the ceiling
  box(0.1, 0.035, 1.5, toon('#dfd8c7'), { x: cx, y: 2.52, z: zc, cast: false, parent: grp });
  box(0.07, 0.014, 1.42, I.glow('#ffd9a6', 1.55), { x: cx, y: 2.5, z: zc, cast: false, receive: false, parent: grp });

  return grp;
}
