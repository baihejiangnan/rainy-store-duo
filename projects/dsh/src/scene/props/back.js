import * as THREE from 'three';
import { L } from '../../core/layout.js';
import { box, circle, cyl, cylinderBetween, group, plane, sphere, tube } from '../../core/geom.js';

/* Bulletin board on the alley wall, AC condensers on the side wall / side walk,
 * beverage crates, and the little alley cat. */
export function buildBack(ctx, P) {
  const { mats, textures } = P.ctx;
  const baseY = L.walkY;

  /* ================================================================== */
  /* bulletin board at the narrow alley mouth (L.bulletin)               */
  /* ================================================================== */
  const b = L.bulletin;
  const bb = group('bulletin-board', P.g);
  bb.position.set(b.x, b.y, b.z);
  bb.rotation.y = b.ry; // local +z faces +x
  const wood = mats.toon('#7c5c39');
  const woodDark = mats.toon('#5c4326');
  box(0.8, 0.6, 0.05, woodDark, { x: 0, y: 0, z: 0.03, parent: bb });
  // frame
  box(0.8, 0.05, 0.07, wood, { x: 0, y: 0.29, z: 0.055, parent: bb, cast: false });
  box(0.8, 0.05, 0.07, wood, { x: 0, y: -0.29, z: 0.055, parent: bb, cast: false });
  box(0.05, 0.58, 0.07, wood, { x: -0.375, y: 0, z: 0.055, parent: bb, cast: false });
  box(0.05, 0.58, 0.07, wood, { x: 0.375, y: 0, z: 0.055, parent: bb, cast: false });
  // pinned paper face
  const boardMat = new THREE.MeshBasicMaterial({
    map: textures.noticeBoardTexture(),
    toneMapped: false,
    color: new THREE.Color(0.78, 0.78, 0.76),
  });
  const face = plane(0.7, 0.52, boardMat, {
    x: 0, y: 0, z: 0.062, parent: bb, cast: false, receive: false,
  });
  face.renderOrder = 4;
  // little rain hood
  const hood = box(0.9, 0.05, 0.2, wood, { x: 0, y: 0.34, z: 0.1, parent: bb });
  hood.rotation.x = 0.2;
  // mounting cleats to the wall
  for (const yy of [-0.18, 0.18]) {
    box(0.06, 0.05, 0.04, woodDark, { x: 0, y: yy, z: -0.01, parent: bb, cast: false });
  }

  /* ================================================================== */
  /* AC condenser mounted on the store side wall (above the bins)        */
  /* ================================================================== */
  const acG = group('ac-wall', P.g);
  acG.position.set(L.store.sideX, 2.32, -3.12);
  const acBodyMat = mats.toon('#c6c4ba');
  const ac = box(0.34, 0.56, 0.74, acBodyMat, { x: 0.17, y: 0, z: 0, parent: acG });
  ctx.outline(ac, 0.014, '#191b21');
  // fan grille on +x face
  const grilleTex = (() => {
    const { c, ctx: cx } = textures.canvas2d(128, 128);
    cx.clearRect(0, 0, 128, 128);
    cx.strokeStyle = 'rgba(52,56,64,0.9)';
    cx.lineWidth = 4;
    for (let r = 12; r < 64; r += 10) {
      cx.beginPath();
      cx.arc(64, 64, r, 0, Math.PI * 2);
      cx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      cx.save();
      cx.translate(64, 64);
      cx.rotate((i / 8) * Math.PI * 2);
      cx.fillStyle = 'rgba(52,56,64,0.75)';
      cx.fillRect(0, -3, 58, 6);
      cx.restore();
    }
    cx.fillStyle = 'rgba(60,64,72,0.9)';
    cx.beginPath();
    cx.arc(64, 64, 10, 0, Math.PI * 2);
    cx.fill();
    return textures.tex(c);
  })();
  const grilleMat = new THREE.MeshBasicMaterial({
    map: grilleTex, transparent: true, toneMapped: false, color: '#8f9298', side: THREE.DoubleSide,
  });
  circle(0.23, 20, grilleMat, {
    x: 0.342, y: 0.02, z: 0, ry: Math.PI / 2, parent: acG, cast: false, receive: false,
  }).renderOrder = 4;
  // louvres / seam lines
  for (let i = 0; i < 4; i++) {
    box(0.02, 0.012, 0.6, mats.toon('#a6a49b'), {
      x: 0.34, y: -0.2 + i * 0.11, z: 0, parent: acG, cast: false,
    });
  }
  // wall brackets + drip hose
  for (const dz of [-0.26, 0.26]) {
    box(0.3, 0.05, 0.06, mats.toon('#6b6d72'), {
      x: 0.15, y: -0.31, z: dz, parent: acG, cast: false,
    });
  }
  const hoseA = new THREE.Vector3(0.05, -0.3, 0.26);
  const hoseB = new THREE.Vector3(0.05, -2.15, 0.3);
  cylinderBetween(hoseA, hoseB, 0.012, mats.toon('#8a8d90'), {
    parent: acG, seg: 5, cast: false,
  });

  /* ================================================================== */
  /* ground AC unit + beverage crates on the side walk near the back     */
  /* ================================================================== */
  const ac2 = group('ac-ground', P.g);
  ac2.position.set(1.62, baseY, -5.12);
  box(0.56, 0.05, 0.92, mats.toon('#54575e'), { x: 0, y: 0.025, z: 0, parent: ac2, cast: false });
  const body2 = box(0.4, 0.66, 0.84, acBodyMat, { x: 0, y: 0.38, z: 0, parent: ac2 });
  ctx.outline(body2, 0.014, '#191b21');
  box(0.42, 0.05, 0.86, mats.toon('#a9a79d'), { x: 0, y: 0.71, z: 0, parent: ac2, cast: false });
  // fan on +x face
  const fanMat = new THREE.MeshBasicMaterial({ color: '#43474f', toneMapped: false });
  circle(0.24, 18, fanMat, {
    x: 0.203, y: 0.4, z: 0, ry: Math.PI / 2, parent: ac2, cast: false, receive: false,
  });
  circle(0.19, 16, grilleMat, {
    x: 0.207, y: 0.4, z: 0, ry: Math.PI / 2, parent: ac2, cast: false, receive: false,
  }).renderOrder = 4;
  for (let i = 0; i < 4; i++) {
    box(0.02, 0.012, 0.72, mats.toon('#8d8f8f'), {
      x: 0.203, y: 0.16 + i * 0.11, z: 0, parent: ac2, cast: false,
    });
  }
  // stub drain pipe
  cyl(0.014, 0.014, 0.42, 5, mats.toon('#83868a'), {
    x: -0.16, y: 0.17, z: 0.28, rx: 0.5, parent: ac2, cast: false,
  });
  P.shadow(1.62, -5.12, 0.34, 0.5);

  // stacked crates (outside the alley volumes, on the side walk)
  const crateDefs = [
    { x: 1.62, y: 0, z: -3.92, color: '#a8483f', ry: 0.12 },
    { x: 1.60, y: 0.29, z: -3.93, color: '#3e6ea8', ry: -0.1 },
    { x: 1.68, y: 0, z: -4.36, color: '#c2a53f', ry: -0.22 },
  ];
  for (const cd of crateDefs) {
    const cg = group('crate', P.g);
    cg.position.set(cd.x, baseY + cd.y, cd.z);
    cg.rotation.y = cd.ry;
    box(0.42, 0.28, 0.32, mats.toon(cd.color), { x: 0, y: 0.14, z: 0, parent: cg });
    // slat grooves + top rim
    for (let i = 0; i < 2; i++) {
      box(0.43, 0.03, 0.33, mats.toon('#2b2d33'), {
        x: 0, y: 0.06 + i * 0.11, z: 0, parent: cg, cast: false,
      });
    }
    box(0.44, 0.035, 0.34, mats.toon('#e0ddd2'), {
      x: 0, y: 0.285, z: 0, parent: cg, cast: false,
    });
    // bottle neck tops
    for (let i = 0; i < 3; i++) {
      cyl(0.022, 0.022, 0.06, 5, mats.toon('#4d6b52'), {
        x: -0.13 + i * 0.13, y: 0.33, z: 0.02 + (i % 2) * 0.05, parent: cg, cast: false,
      });
    }
    P.shadow(cd.x, cd.z, 0.28, 0.22);
  }

  /* ================================================================== */
  /* small alley cat (one only)                                          */
  /* ================================================================== */
  const catG = group('alley-cat', P.g);
  catG.position.set(0.62, 0.12, -3.76);
  catG.rotation.y = Math.PI + 0.5; // looks back toward the alley
  const catMat = mats.toon('#d5d0c3');
  const catDark = mats.toon('#b4afa4');
  const catBody = sphere(1, catMat, { x: 0, y: 0.17, z: 0, parent: catG, wSeg: 10, hSeg: 8 });
  catBody.scale.set(0.115, 0.17, 0.13);
  const catHead = sphere(0.088, catMat, { x: 0, y: 0.34, z: 0.075, parent: catG, wSeg: 10, hSeg: 8 });
  catHead.scale.set(1, 0.94, 0.98);
  // ears
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 4), catMat);
    ear.position.set(sx * 0.05, 0.42, 0.07);
    ear.rotation.z = sx * -0.24;
    catG.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.045, 4), mats.toon('#c9a49c'));
    inner.position.set(sx * 0.05, 0.415, 0.092);
    inner.rotation.z = sx * -0.24;
    catG.add(inner);
  }
  // tail curled around the side
  tube([
    new THREE.Vector3(0, 0.1, -0.12),
    new THREE.Vector3(0.14, 0.045, -0.06),
    new THREE.Vector3(0.2, 0.06, 0.08),
    new THREE.Vector3(0.15, 0.15, 0.19),
  ], 0.018, catMat, { parent: catG, tubularSegments: 14, radialSegments: 4, cast: true, receive: false });
  // front legs + paws
  for (const sx of [-1, 1]) {
    cyl(0.024, 0.026, 0.13, 5, catMat, {
      x: sx * 0.052, y: 0.065, z: 0.085, parent: catG, cast: false,
    });
    sphere(0.027, catDark, { x: sx * 0.052, y: 0.02, z: 0.09, parent: catG, wSeg: 6, hSeg: 5 });
  }
  // eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#d7ecab', toneMapped: false });
  for (const sx of [-1, 1]) {
    sphere(0.013, eyeMat, { x: sx * 0.033, y: 0.352, z: 0.148, parent: catG, wSeg: 6, hSeg: 5 });
  }
  // whisker hint / nose
  sphere(0.012, mats.toon('#c39a92'), { x: 0, y: 0.323, z: 0.158, parent: catG, wSeg: 5, hSeg: 4 });
  P.shadow(0.62, -3.76, 0.15, 0.15);
}
