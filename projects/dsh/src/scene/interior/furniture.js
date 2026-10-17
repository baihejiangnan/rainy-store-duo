/* Ice-cream chest freezer, window magazine rack, staff lockers, stock boxes,
 * ATM, notice board, clock, fire extinguisher, mop corner and window display.
 */
import * as THREE from 'three';

export function buildFurniture(I, S) {
  const { F, toon, box, cyl, sign, inst, outline } = I;
  const grp = I.group('furniture');

  /* ================= window magazine rack (faces the street) ================= */
  const mx0 = -3.35;
  const mx1 = -2.45;
  const mcx = (mx0 + mx1) / 2;
  const mz0 = 0.5;
  const mz1 = 0.82;
  const mBody = toon('#f2ecdf');
  const mTop = F + 0.52;
  box(mx1 - mx0, 0.52, mz1 - mz0, mBody, { x: mcx, y: F + 0.26, z: (mz0 + mz1) / 2, parent: grp });
  box(mx1 - mx0 + 0.02, 0.035, mz1 - mz0 + 0.02, toon('#2fa89b'), { x: mcx, y: mTop, z: (mz0 + mz1) / 2, parent: grp, cast: false });
  // side cheeks
  box(0.03, 0.7, mz1 - mz0, mBody, { x: mx0 + 0.015, y: F + 0.87, z: (mz0 + mz1) / 2, parent: grp });
  box(0.03, 0.7, mz1 - mz0, mBody, { x: mx1 - 0.015, y: F + 0.87, z: (mz0 + mz1) / 2, parent: grp });
  // back board
  box(mx1 - mx0, 0.7, 0.03, toon('#e6ddcb'), { x: mcx, y: F + 0.87, z: mz0 + 0.015, parent: grp });

  const coverRows = [F + 0.64, F + 0.86, F + 1.06];
  const ledges = [];
  coverRows.forEach((y) => ledges.push({ x: mcx, y: y - 0.13, z: 0.79, sx: mx1 - mx0, sy: 0.024, sz: 0.1 }));
  inst(I.unitBox, toon('#d9cfb8'), ledges, { cast: false, receive: true });

  // covers: 6 designs, 3 rows x 7 columns
  const coverByTex = [[], [], [], [], [], []];
  let n = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 7; c++) {
      const x = -3.27 + c * 0.122;
      coverByTex[n % 6].push({
        x, y: coverRows[r] - 0.02, z: 0.75 + (r % 2) * 0.01,
        sx: 0.115, sy: 0.175, rx: -0.3,
      });
      n++;
    }
  }
  coverByTex.forEach((list, i) => {
    inst(I.unitPlane, I.signMat(S.magazines[i], { side: THREE.DoubleSide, mul: 1.0 }), list, { cast: false, receive: false });
  });
  // header above the rack
  sign(S.magHeader, 0.5, 0.13, { x: mcx, y: F + 1.24, z: mz1 + 0.005, mul: 1.0, parent: grp });
  box(mx1 - mx0, 0.03, 0.03, toon('#d8d0bd'), { x: mcx, y: F + 1.16, z: mz1 + 0.02, cast: false, parent: grp });

  /* ================= seasonal window display table ================= */
  const tx = -2.05;
  const tTop = F + 0.72;
  box(0.64, 0.06, 0.28, toon('#faf4e6'), { x: tx, y: tTop - 0.03, z: 0.68, parent: grp });
  const legs = [];
  for (const dx of [-0.26, 0.26]) {
    for (const dz of [-0.1, 0.1]) legs.push({ x: tx + dx, y: F + 0.35, z: 0.68 + dz, sx: 0.04, sy: 0.7, sz: 0.04 });
  }
  inst(I.unitBox, toon('#c9c1ae'), legs, { cast: true, receive: true });
  box(0.6, 0.5, 0.26, toon('#ece3d0'), { x: tx, y: F + 0.25, z: 0.68, parent: grp });
  // gift boxes on the table
  const gifts = [];
  const gcol = ['#e05f6f', '#4a8fbe', '#e9c04f', '#6fb37c', '#8a6fb3', '#e88a45'];
  for (let i = 0; i < 8; i++) {
    gifts.push({
      x: tx - 0.24 + (i % 4) * 0.16, y: tTop + 0.055 + Math.floor(i / 4) * 0.11,
      z: 0.62 + (i % 2) * 0.1, sx: 0.12, sy: 0.09, sz: 0.1, ry: (i % 3) * 0.2,
      c: gcol[i % gcol.length],
    });
  }
  gcol.forEach((color) => {
    const list = gifts.filter((g2) => g2.c === color);
    if (list.length) inst(I.unitBox, toon(color), list, { cast: false, receive: true });
  });
  sign(S.newGoods, 0.22, 0.14, { x: tx + 0.19, y: tTop + 0.09, z: 0.83, parent: grp, mul: 0.98 });

  /* ================= staff lockers (left wall) ================= */
  const lcx = -3.52;
  const lz = -2.66;
  const lockBody = box(0.32, 1.88, 0.76, toon('#e9e2d2'), { x: lcx, y: F + 0.94, z: lz, parent: grp });
  outline(lockBody, 0.012, '#3a352f');
  box(0.34, 0.035, 0.78, toon('#2fa89b'), { x: lcx, y: F + 1.895, z: lz, parent: grp, cast: false });
  for (let i = 0; i < 2; i++) {
    const dz = lz - 0.19 + i * 0.38;
    box(0.016, 0.84, 0.34, toon('#f6f1e4'), { x: lcx + 0.168, y: F + 0.94, z: dz, parent: grp });
    box(0.03, 0.1, 0.02, toon('#8b9098'), { x: lcx + 0.18, y: F + 0.92, z: dz + 0.12, parent: grp, cast: false });
    box(0.02, 0.022, 0.022, toon('#5b606d'), { x: lcx + 0.18, y: F + 0.78, z: dz + 0.12, parent: grp, cast: false });
    // vents
    for (let v = 0; v < 3; v++) {
      box(0.008, 0.012, 0.14, toon('#cfc6b4'), { x: lcx + 0.177, y: F + 1.68 - v * 0.03, z: dz, parent: grp, cast: false });
    }
  }
  sign(S.lockerPlate, 0.1, 0.065, { x: lcx + 0.178, y: F + 1.55, z: lz - 0.19, ry: Math.PI / 2, parent: grp });
  // staff only plate next to the back door
  sign(S.staffSign, 0.34, 0.13, { x: -3.1, y: 2.28, z: I.Z0 + 0.07, parent: grp });

  /* ================= stock boxes ================= */
  const boxMat = toon('#c9a678');
  const boxMat2 = toon('#b9976b');
  const boxes = [
    // two spare cases stored on top of the staff lockers
    { x: -3.52, y: F + 2.02, z: -2.86, sx: 0.3, sy: 0.22, sz: 0.3, ry: 0.1 },
    { x: -3.5, y: F + 2.02, z: -2.5, sx: 0.26, sy: 0.2, sz: 0.26, ry: -0.15 },
    // drink case waiting to be shelved, in the back aisle in front of the fridge
    { x: -2.38, y: F + 0.14, z: -2.62, sx: 0.34, sy: 0.28, sz: 0.3, ry: 0.1 },
    { x: -2.37, y: F + 0.42, z: -2.6, sx: 0.3, sy: 0.26, sz: 0.28, ry: -0.05 },
    // back-right corner, tucked behind the ATM
    { x: 0.78, y: F + 0.16, z: -2.62, sx: 0.36, sy: 0.32, sz: 0.34, ry: 0.04 },
    { x: 0.76, y: F + 0.46, z: -2.6, sx: 0.3, sy: 0.26, sz: 0.28, ry: 0.12 },
  ];
  inst(I.unitBox, boxMat, boxes.slice(0, 4), { cast: true, receive: true });
  inst(I.unitBox, boxMat2, boxes.slice(4), { cast: true, receive: true });
  // packing tape on the top of the case waiting to be shelved
  box(0.06, 0.005, 0.28, toon('#e8e2d2'), { x: -2.37, y: F + 0.553, z: -2.6, cast: false, parent: grp });

  /* ================= mop corner + extinguisher ================= */
  cyl(0.1, 0.12, 0.24, 12, toon('#d9c25c'), { x: -3.5, y: F + 0.12, z: -2.02, parent: grp });
  cyl(0.012, 0.012, 1.05, 6, toon('#b7a98c'), { x: -3.56, y: F + 0.62, z: -2.0, rz: 0.16, parent: grp });
  box(0.1, 0.16, 0.08, toon('#e6dcc4'), { x: -3.65, y: F + 0.14, z: -2.0, parent: grp });
  // fire extinguisher
  const ext = cyl(0.075, 0.078, 0.42, 12, toon('#c8402f'), { x: -3.55, y: F + 0.21, z: -1.5, parent: grp });
  outline(ext, 0.008, '#3a2a28');
  box(0.06, 0.06, 0.06, toon('#3a3f47'), { x: -3.55, y: F + 0.45, z: -1.5, parent: grp });
  box(0.02, 0.16, 0.02, toon('#2c303c'), { x: -3.58, y: F + 0.34, z: -1.55, parent: grp, cast: false });
  sign(S.fireExtSign, 0.12, 0.12, { x: -3.683, y: F + 0.95, z: -1.5, ry: Math.PI / 2, parent: grp });

  /* ================= wall notice board + clock ================= */
  sign(S.noticeBoard, 0.5, 0.38, { x: -3.684, y: 1.6, z: -1.02, ry: Math.PI / 2, parent: grp });
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.14, 24), I.signMat(S.clockFace, { mul: 0.9 }));
  clockFace.position.set(-3.683, 2.26, -0.32);
  clockFace.rotation.y = Math.PI / 2;
  clockFace.castShadow = false;
  grp.add(clockFace);
  const clockRim = cyl(0.155, 0.155, 0.03, 20, toon('#4a4f58'), { x: -3.695, y: 2.26, z: -0.32, rz: Math.PI / 2, parent: grp });
  clockRim.castShadow = false;

  /* ================= ATM (facing the entrance, near the side glass) ===== */
  const ax = 0.86;
  const az = -2.08;
  const atmBody = box(0.44, 1.72, 0.4, toon('#3f444d'), { x: ax, y: F + 0.86, z: az, parent: grp });
  outline(atmBody, 0.014, '#22252c');
  box(0.38, 1.44, 0.05, toon('#ece2cc'), { x: ax, y: F + 0.86, z: az + 0.175, parent: grp });
  sign(S.atmScreen, 0.3, 0.22, { x: ax, y: F + 1.3, z: az + 0.204, mul: 1.08, parent: grp });
  sign(S.atmKeypad, 0.22, 0.15, { x: ax, y: F + 1.0, z: az + 0.204, parent: grp });
  box(0.14, 0.03, 0.02, toon('#2c303c'), { x: ax, y: F + 0.88, z: az + 0.205, parent: grp, cast: false });
  box(0.16, 0.06, 0.02, toon('#2c303c'), { x: ax, y: F + 1.56, z: az + 0.205, parent: grp, cast: false });
  // header lightbox
  const atmHead = box(0.46, 0.17, 0.16, toon('#dfe6ea'), { x: ax, y: F + 1.8, z: az + 0.06, parent: grp });
  outline(atmHead, 0.01, '#26303a');
  sign(S.atmHeader, 0.42, 0.15, { x: ax, y: F + 1.8, z: az + 0.145, mul: 1.22, parent: grp });
  // side poster (visible through the side glass)
  sign(S.posters.notice, 0.32, 0.44, { x: ax + 0.221, y: F + 1.1, z: az, ry: Math.PI / 2, parent: grp });
  // small trash bin next to the counter
  cyl(0.1, 0.085, 0.42, 12, toon('#e7e2d4'), { x: 0.36, y: F + 0.21, z: 0.5, parent: grp });
  box(0.22, 0.03, 0.22, toon('#8b9098'), { x: 0.36, y: F + 0.43, z: 0.5, parent: grp, cast: false });

  /* ================= ice-cream chest freezer ================= */
  const fcx = 0.2;
  const fcz = -2.27;
  const fw = 0.6;
  const fd = 0.7;
  const ftop = F + 0.74;
  const fBody = box(fw, 0.7, fd, toon('#edf3f6'), { x: fcx, y: F + 0.36, z: fcz, parent: grp });
  outline(fBody, 0.014, '#28323a');
  // blue top rim
  box(fw + 0.04, 0.07, fd + 0.04, toon('#4eb4d8'), { x: fcx, y: ftop - 0.02, z: fcz, parent: grp, cast: false });
  box(fw - 0.02, 0.02, fd - 0.02, toon('#dff2fb'), { x: fcx, y: ftop + 0.03, z: fcz, parent: grp, cast: false });
  // tub floor + inner lip
  box(fw - 0.12, 0.05, fd - 0.12, toon('#c7e6f4'), { x: fcx, y: F + 0.52, z: fcz, parent: grp, cast: false });
  // frozen packs standing in rows
  const pcol = ['#f285a8', '#f5cd6b', '#5fc38a', '#4eb4d8', '#f19a5b', '#f4eee2'];
  const packs = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      packs.push({
        x: fcx - 0.2 + c * 0.1, y: F + 0.6, z: fcz - 0.24 + r * 0.15,
        sx: 0.085, sy: 0.14, sz: 0.1, rx: 0.12, rz: (c % 2) * 0.12,
        c: pcol[(r + c) % pcol.length],
      });
    }
  }
  pcol.forEach((color) => {
    const list = packs.filter((pk) => pk.c === color);
    if (list.length) inst(I.unitBox, toon(color), list, { cast: false, receive: false });
  });
  // glass lid + frame bars
  const lid = new THREE.Mesh(
    new THREE.PlaneGeometry(fw - 0.02, fd - 0.02),
    I.glassMat({ color: '#c9ecfa', opacity: 0.22 }),
  );
  lid.rotation.x = -Math.PI / 2;
  lid.position.set(fcx, ftop + 0.035, fcz);
  lid.castShadow = false;
  grp.add(lid);
  inst(I.unitBox, toon('#5b606d'), [
    { x: fcx, y: ftop + 0.045, z: fcz, sx: 0.02, sy: 0.02, sz: fd },
    { x: fcx, y: ftop + 0.045, z: fcz - 0.22, sx: fw, sy: 0.02, sz: 0.018 },
    { x: fcx, y: ftop + 0.045, z: fcz + 0.22, sx: fw, sy: 0.02, sz: 0.018 },
  ], { cast: false, receive: false });
  // header card on a post over the front end
  box(0.014, 0.3, 0.014, toon('#8b9098'), { x: fcx + 0.2, y: ftop + 0.14, z: fcz + fd / 2 - 0.02, parent: grp, cast: false });
  sign(S.iceFreezerHeader, 0.48, 0.15, { x: fcx, y: ftop + 0.32, z: fcz + fd / 2 + 0.005, mul: 1.1, parent: grp });
  sign(S.popSale, 0.12, 0.11, { x: fcx + fw / 2 + 0.006, y: ftop + 0.12, z: fcz + 0.16, ry: Math.PI / 2, parent: grp });
  // price strip on the blue rim (front end)
  sign(S.priceStrip, 0.5, 0.05, { x: fcx, y: ftop - 0.14, z: fcz + fd / 2 + 0.006, parent: grp });

  return grp;
}
