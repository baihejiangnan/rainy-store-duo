/* Ceiling-hung advertising panels, wall posters, hanging banner, floor guide
 * arrows and floor stickers. All light-weight: planes + one instanced frame
 * and cable mesh on top of a single instanced guide-arrow mesh.
 */
import * as THREE from 'three';

export function buildDecor(I, S) {
  const { F, toon, box, sign, inst } = I;
  const grp = I.group('decor');

  /* ---------------- ceiling-hung ad panels ---------------- */
  // each panel: bright printed face (+z), cream back, thin frame, two wires
  const panels = [
    { tex: S.adOnigiri, w: 0.54, h: 0.31, x: -2.28, y: 2.3, z: 0.18, ry: 0.05 },
    { tex: S.adCoffee, w: 0.48, h: 0.27, x: -0.48, y: 2.31, z: -0.52, ry: -0.18 },
    { tex: S.adKaraage, w: 0.48, h: 0.27, x: -1.52, y: 2.29, z: -1.9, ry: 0.14 },
    { tex: S.popNew, w: 0.3, h: 0.37, x: -2.96, y: 2.26, z: -0.86, ry: -0.1 },
  ];
  const frameList = [];
  const cableList = [];
  for (const p of panels) {
    // printed face
    sign(p.tex, p.w, p.h, { x: p.x, y: p.y, z: p.z, ry: p.ry, parent: grp, mul: 1.02 });
    // cream back + frame (instanced later)
    const dz = 0.012;
    frameList.push({
      x: p.x - Math.sin(p.ry) * dz, y: p.y, z: p.z - Math.cos(p.ry) * dz,
      sx: p.w + 0.045, sy: p.h + 0.045, sz: 0.014, ry: p.ry,
    });
    // wires to the ceiling
    const top = p.y + p.h / 2 + 0.012;
    const wireLen = I.CEIL - top;
    for (const sideX of [-1, 1]) {
      const off = sideX * (p.w / 2 - 0.03);
      cableList.push({
        x: p.x + Math.cos(p.ry) * off, y: top + wireLen / 2, z: p.z - Math.sin(p.ry) * off,
        sx: 0.007, sy: wireLen, sz: 0.007,
      });
    }
  }
  inst(I.unitBox, toon('#efe6d3'), frameList, { cast: true, receive: false });
  inst(I.unitBox, toon('#8b9098'), cableList, { cast: false, receive: false });

  /* ---------------- hanging banner across the front zone ------------- */
  const banW = 1.5;
  const banY = 2.44;
  sign(S.bannerStrip, banW, 0.165, { x: -1.42, y: banY, z: -0.04, parent: grp, side: THREE.DoubleSide, mul: 1.0 });
  box(banW + 0.04, 0.2, 0.012, toon('#e9e0cd'), { x: -1.42, y: banY, z: -0.055, parent: grp, cast: false });
  // banner support wires at both ends
  inst(I.unitBox, toon('#8b9098'), [
    { x: -1.42 - banW / 2, y: (banY + 0.1 + I.CEIL) / 2, z: -0.04, sx: 0.007, sy: I.CEIL - banY - 0.1, sz: 0.007 },
    { x: -1.42 + banW / 2, y: (banY + 0.1 + I.CEIL) / 2, z: -0.04, sx: 0.007, sy: I.CEIL - banY - 0.1, sz: 0.007 },
  ], { cast: false, receive: false });

  /* ---------------- posters on the left wall (above the shelves) -------- */
  const wallPosters = [
    { tex: S.posters.sale, w: 0.34, h: 0.5, x: -3.683, y: 1.98, z: -0.42 },
    { tex: S.posters.coffee, w: 0.3, h: 0.44, x: -3.683, y: 2.02, z: 0.02 },
    { tex: S.posters.onigiri, w: 0.3, h: 0.44, x: -3.683, y: 1.96, z: -0.88 },
    { tex: S.posters.ice, w: 0.28, h: 0.4, x: -3.683, y: 2.06, z: -1.62 },
  ];
  const posterFrames = [];
  for (const p of wallPosters) {
    sign(p.tex, p.w, p.h, { x: p.x + 0.004, y: p.y, z: p.z, ry: Math.PI / 2, parent: grp, mul: 1.0 });
    posterFrames.push({ x: p.x - 0.004, y: p.y, z: p.z, sx: 0.012, sy: p.h + 0.05, sz: p.w + 0.05 });
  }
  inst(I.unitBox, toon('#f6f1e4'), posterFrames, { cast: false, receive: false });

  /* ---------------- floor guide arrows ---------------- */
  const shape = new THREE.Shape();
  shape.moveTo(-0.055, 0);
  shape.lineTo(-0.055, 0.19);
  shape.lineTo(-0.115, 0.19);
  shape.lineTo(0, 0.33);
  shape.lineTo(0.115, 0.19);
  shape.lineTo(0.055, 0.19);
  shape.lineTo(0.055, 0);
  shape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(shape);
  arrowGeo.rotateX(-Math.PI / 2);
  inst(arrowGeo, I.glow(I.p.teal, 0.95, { fog: true }), [
    { x: -0.55, y: F + 0.011, z: 0.15, ry: 0 },
    { x: -1.72, y: F + 0.011, z: 0.15, ry: 0 },
    { x: 0.33, y: F + 0.011, z: -0.62, ry: 0 },
    { x: -2.62, y: F + 0.011, z: 0.36, ry: -Math.PI / 2 },
  ], { cast: false, receive: false });

  /* ---------------- floor stickers ---------------- */
  sign(S.floorStickerBento, 0.44, 0.22, { x: -1.72, y: F + 0.012, z: 0.62, rx: -Math.PI / 2, parent: grp });
  sign(S.floorStickerRegister, 0.4, 0.2, { x: 0.34, y: F + 0.012, z: -0.14, rx: -Math.PI / 2, parent: grp });

  return grp;
}
