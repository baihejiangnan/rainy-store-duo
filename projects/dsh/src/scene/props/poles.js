import * as THREE from 'three';
import { L } from '../../core/layout.js';
import {
  box, circle, cyl, cylinderBetween, group, plane, sphere, tube, sagWire,
} from '../../core/geom.js';

/* Utility poles, transformer, insulators, step bolts, street-lamp fixture, wires. */
export function buildPoles(ctx, P) {
  const { mats } = P;
  const baseY = L.walkY;

  // crossarms run perpendicular to the line between the two poles
  const dir = new THREE.Vector3(
    L.utilityPole2.x - L.utilityPole.x,
    0,
    L.utilityPole2.z - L.utilityPole.z
  ).normalize();
  const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  const armRy = Math.atan2(-perp.z, perp.x);

  const concrete = mats.toon('#555962');
  const concreteDark = mats.toon('#3c3f48');
  const steel = mats.toon('#6a6f79');
  const steelDark = mats.toon('#3b3e47');
  const insulatorMat = mats.toon('#c6cac6');
  const wireMat = mats.toon('#1e2029', { fog: true });
  const wireMat2 = mats.toon('#282a34', { fog: true });
  const lampMetal = mats.toon('#7a7f88');

  // shared instanced geometry lists (filled while building both poles)
  const insulatorBodies = [];
  const insulatorCaps = [];
  const stepBolts = [];

  const armDefs = [
    { dy: -0.52, len: 2.02, offs: [-0.84, -0.3, 0.3, 0.84] },
    { dy: -1.05, len: 1.62, offs: [-0.56, 0.56] },
  ];

  /* ------------------------------------------------------------------ */
  /* one pole                                                            */
  /* ------------------------------------------------------------------ */
  function mkPole(cfg) {
    const { x, z, h, r, tag, armScale = 1 } = cfg;
    const g = group(`utility-pole-${tag}`, P.g);
    const topY = baseY + h;
    const add = (m, th = 0.016, col = '#12141b') => {
      if (th) ctx.outline(m, th, col);
      return m;
    };

    // shaft (slight taper) + footing collar
    const shaft = cyl(r * 0.88, r * 1.3, h, 12, concrete, {
      x, y: baseY + h / 2, z, parent: g,
    });
    add(shaft, 0.02);
    cyl(r * 1.62, r * 1.78, 0.24, 12, concreteDark, { x, y: baseY + 0.12, z, parent: g });
    cyl(r * 1.42, r * 1.42, 0.05, 12, concreteDark, { x, y: baseY + 0.26, z, parent: g, cast: false });

    // cable bands
    for (const y of [baseY + 2.35, baseY + 3.55, baseY + 4.75]) {
      cyl(r * 1.36, r * 1.36, 0.055, 12, steelDark, { x, y, z, parent: g, cast: false });
    }

    // crossarms + insulators
    const armPoints = [];
    for (const arm of armDefs) {
      const y = topY + arm.dy;
      const len = arm.len * armScale;
      const beam = box(len, 0.085, 0.1, steelDark, { x, y, z, ry: armRy, parent: g });
      add(beam, 0.012, '#0f1118');
      // steel angle brace under the beam
      box(0.16, 0.26, 0.06, steelDark, { x, y: y - 0.14, z, ry: armRy, parent: g, cast: false });
      const pts = [];
      for (const off of arm.offs) {
        const o = off * armScale;
        const ix = x + perp.x * o;
        const iz = z + perp.z * o;
        insulatorBodies.push({ x: ix, y: y + 0.11, z: iz });
        insulatorCaps.push({ x: ix, y: y + 0.185, z: iz });
        pts.push(new THREE.Vector3(ix, y + 0.245, iz));
      }
      armPoints.push(pts);
    }

    // step bolts up the shaft (alternating ways)
    for (let i = 0; i < 10; i++) {
      const y = baseY + 1.25 + i * 0.43;
      const side = i % 2 === 0 ? 1 : -1;
      if (i % 4 < 2) {
        stepBolts.push({ x: x + side * (r + 0.085), y, z, rz: Math.PI / 2 });
      } else {
        stepBolts.push({ x, y, z: z + side * (r + 0.085), rx: Math.PI / 2 });
      }
    }

    // small junction box + conduit on the street side of the pole
    box(0.2, 0.3, 0.14, mats.toon('#4c4f58'), {
      x: x + perp.x * 0.16, y: baseY + 3.05, z: z + perp.z * 0.16, ry: armRy, parent: g,
    });
    const conduitA = new THREE.Vector3(x + perp.x * 0.12, baseY + 2.9, z + perp.z * 0.12);
    const conduitB = new THREE.Vector3(x + perp.x * 0.1, baseY + 0.55, z + perp.z * 0.1);
    cylinderBetween(conduitA, conduitB, 0.022, steel, { parent: g, cast: false, seg: 6 });

    // pole number / inspection tag
    const tagMat = P.label(96, 128, (cx, w, hh) => {
      cx.fillStyle = '#e9e7de';
      cx.fillRect(0, 0, w, hh);
      cx.strokeStyle = '#2f6fa8';
      cx.lineWidth = 8;
      cx.strokeRect(5, 5, w - 10, hh - 10);
      cx.fillStyle = '#28455e';
      cx.font = '900 40px "Yu Gothic", sans-serif';
      cx.textAlign = 'center';
      cx.fillText('ひ', w / 2, 50);
      cx.font = '900 30px monospace';
      cx.fillText(tag === 'A' ? '02' : '07', w / 2, 92);
    });
    plane(0.15, 0.2, tagMat, {
      x, y: baseY + 2.02, z: z + r * 1.02, parent: g, cast: false, receive: false,
    }).renderOrder = 5;

    return { g, x, z, topY, armPoints };
  }

  const A = L.utilityPole;
  const B = L.utilityPole2;
  const poleA = mkPole({ ...A, r: A.r, tag: 'A' });
  // pole B sits only 0.38 m from the base edge, so its arms are shortened a
  // little to keep the tips over the plinth instead of overhanging the cut.
  const poleB = mkPole({ ...B, r: B.r, tag: 'B', armScale: 0.66 });

  // batched insulators / step bolts
  P.inst(
    new THREE.CylinderGeometry(0.042, 0.052, 0.12, 8),
    insulatorMat,
    insulatorBodies,
    { cast: true, receive: false }
  );
  P.inst(
    new THREE.CylinderGeometry(0.083, 0.083, 0.028, 10),
    insulatorMat,
    insulatorCaps,
    { cast: false, receive: false }
  );
  P.inst(
    new THREE.CylinderGeometry(0.011, 0.011, 0.18, 5),
    steelDark,
    stepBolts,
    { cast: false, receive: false }
  );

  /* ------------------------------------------------------------------ */
  /* transformer drum on pole A                                          */
  /* ------------------------------------------------------------------ */
  const tY = baseY + 4.82;
  const tOff = 0.46;
  const tX = A.x + perp.x * tOff;
  const tZ = A.z + perp.z * tOff;
  // mounting bracket
  cylinderBetween(
    new THREE.Vector3(A.x + perp.x * A.r * 1.2, tY + 0.34, A.z + perp.z * A.r * 1.2),
    new THREE.Vector3(tX, tY + 0.34, tZ),
    0.03, steelDark, { parent: poleA.g, seg: 6 }
  );
  cylinderBetween(
    new THREE.Vector3(A.x + perp.x * A.r * 1.2, tY + 0.34, A.z + perp.z * A.r * 1.2),
    new THREE.Vector3(tX, tY - 0.34, tZ),
    0.024, steelDark, { parent: poleA.g, seg: 6 }
  );
  // drum
  cyl(0.23, 0.23, 0.6, 14, mats.toon('#646a70'), { x: tX, y: tY, z: tZ, parent: poleA.g });
  cyl(0.245, 0.245, 0.055, 14, steelDark, { x: tX, y: tY + 0.31, z: tZ, parent: poleA.g, cast: false });
  cyl(0.245, 0.245, 0.055, 14, steelDark, { x: tX, y: tY - 0.31, z: tZ, parent: poleA.g, cast: false });
  // cooling fins
  for (let i = 0; i < 4; i++) {
    cyl(0.245, 0.245, 0.012, 14, mats.toon('#54595f'), {
      x: tX, y: tY - 0.18 + i * 0.12, z: tZ, parent: poleA.g, cast: false,
    });
  }
  // high-voltage bushings on top
  for (const off of [-0.1, 0.1]) {
    cyl(0.028, 0.036, 0.13, 6, insulatorMat, {
      x: tX + perp.x * off, y: tY + 0.4, z: tZ + perp.z * off, parent: poleA.g, cast: false,
    });
    cyl(0.05, 0.05, 0.02, 8, insulatorMat, {
      x: tX + perp.x * off, y: tY + 0.47, z: tZ + perp.z * off, parent: poleA.g, cast: false,
    });
  }

  // danger plate on pole A (faces the street / viewer)
  const dangerMat = P.label(128, 160, (cx, w, h) => {
    cx.fillStyle = '#f2ecd8';
    cx.fillRect(0, 0, w, h);
    cx.fillStyle = '#c8433c';
    cx.fillRect(0, 0, w, 26);
    cx.fillStyle = '#f2ecd8';
    cx.font = '900 17px "Yu Gothic", sans-serif';
    cx.textAlign = 'center';
    cx.fillText('高圧危険', w / 2, 19);
    cx.fillStyle = '#33303a';
    cx.font = '900 58px "Yu Gothic", sans-serif';
    cx.fillText('高圧', w / 2, 82);
    cx.fillStyle = '#c8433c';
    cx.font = '900 26px "Yu Gothic", sans-serif';
    cx.fillText('触るな', w / 2, 126);
    cx.strokeStyle = '#c8433c';
    cx.lineWidth = 5;
    cx.strokeRect(3, 3, w - 6, h - 6);
  });
  const dp = plane(0.17, 0.21, dangerMat, {
    x: A.x, y: baseY + 3.55, z: A.z + A.r * 1.05, parent: poleA.g, cast: false, receive: false,
  });
  dp.renderOrder = 5;
  box(0.19, 0.23, 0.02, mats.toon('#3e4048'), {
    x: A.x, y: baseY + 3.55, z: A.z + A.r * 1.0, parent: poleA.g, cast: false,
  });

  /* ------------------------------------------------------------------ */
  /* street-lamp arm + head fixture (the SpotLight lives in environment) */
  /* ------------------------------------------------------------------ */
  const Lp = L.streetLamp;
  const lampG = group('street-lamp', poleA.g);
  const armPts = [
    new THREE.Vector3(A.x + 0.02, baseY + 4.6, A.z),
    new THREE.Vector3(-4.68, baseY + 4.79, A.z + 0.02),
    new THREE.Vector3(-4.16, baseY + 4.88, A.z + 0.13),
    new THREE.Vector3(-3.66, baseY + 4.88, A.z + 0.26),
    new THREE.Vector3(Lp.armToX + 0.03, Lp.y - 0.02, Lp.armToZ),
  ];
  tube(armPts, 0.036, lampMetal, {
    parent: lampG, tubularSegments: 26, radialSegments: 6, cast: true, receive: false,
  });
  // diagonal stay
  const stay = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 1, 5),
    lampMetal
  );
  const sa = new THREE.Vector3(A.x, baseY + 4.15, A.z);
  const sb = new THREE.Vector3(-4.2, baseY + 4.83, A.z + 0.13);
  stay.position.copy(sa).add(sb).multiplyScalar(0.5);
  stay.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sb.clone().sub(sa).normalize());
  stay.castShadow = true;
  lampG.add(stay);

  // cobra-head fixture
  const headX = Lp.armToX;
  const headY = Lp.y;
  const headZ = Lp.armToZ;
  const headShell = sphere(1, mats.toon('#767b84'), {
    x: headX, y: headY + 0.01, z: headZ, parent: lampG, wSeg: 12, hSeg: 8,
  });
  headShell.scale.set(0.25, 0.105, 0.17);
  // flat underside plate + warm lens
  box(0.36, 0.03, 0.2, mats.toon('#4d515a'), {
    x: headX, y: headY - 0.055, z: headZ, parent: lampG, cast: false,
  });
  const lensMat = new THREE.MeshBasicMaterial({ color: '#ffe6b8', toneMapped: false });
  const lens = circle(0.078, 14, lensMat, {
    x: headX + 0.03, y: headY - 0.072, z: headZ, rx: Math.PI / 2, parent: lampG, cast: false,
  });
  lens.renderOrder = 3;
  // small hood lip
  box(0.4, 0.016, 0.23, mats.toon('#5e626b'), {
    x: headX, y: headY - 0.09, z: headZ, parent: lampG, cast: false,
  });
  // soft halo + fake light shaft
  P.glow('#ffd9a8', 1.7, 0.5, headX + 0.04, headY - 0.02, headZ, { kind: 'warm' });
  const coneGeo = new THREE.CylinderGeometry(0.06, 0.9, 4.55, 12, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color: '#ffcf98',
    transparent: true,
    opacity: 0.035,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    fog: false,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.set(headX + 0.04, headY - 2.3, headZ);
  cone.renderOrder = 3;
  lampG.add(cone);
  // bracket clamps at pole
  cyl(0.055, 0.055, 0.12, 8, steelDark, { x: A.x, y: baseY + 4.62, z: A.z, ry: armRy, parent: lampG, cast: false });

  /* ------------------------------------------------------------------ */
  /* overhead wires                                                      */
  /* ------------------------------------------------------------------ */
  const wire = (a, b, sag, radius, mat, segments = 14) =>
    sagWire(a, b, sag, radius, mat, { segments, cast: false, receive: false, parent: P.g });

  const pa = poleA.armPoints;
  const pb = poleB.armPoints;
  // 4 + 2 wires between the poles
  for (let i = 0; i < pa[0].length; i++) {
    wire(pa[0][i], pb[0][i], 0.55 + Math.abs(i - 1.5) * 0.035, 0.014, wireMat, 16);
  }
  for (let i = 0; i < pa[1].length; i++) {
    wire(pa[1][i], pb[1][i], 0.72, 0.012, wireMat, 16);
  }
  // thicker telecom bundle, slung a bit lower
  for (const off of [-0.44, 0.44]) {
    wire(
      new THREE.Vector3(A.x + perp.x * off, baseY + 5.05, A.z + perp.z * off),
      new THREE.Vector3(B.x + perp.x * off, baseY + 4.8, B.z + perp.z * off),
      0.5, 0.022, wireMat2, 18
    );
  }
  // off the base edge (clean diorama cut)
  wire(pa[0][0], new THREE.Vector3(-5.79, baseY + 6.02, A.z - 0.16), 0.16, 0.014, wireMat, 10);
  wire(pa[0][3], new THREE.Vector3(-5.79, baseY + 5.86, A.z + 0.2), 0.2, 0.013, wireMat, 10);
  wire(pb[0][0], new THREE.Vector3(B.x + 0.02, baseY + 5.9, -5.79), 0.14, 0.014, wireMat, 10);
  // service drop from pole B to the back building slice
  wire(pb[1][1], new THREE.Vector3(B.x, baseY + 4.42, -5.02), 0.09, 0.013, wireMat2, 8);
  // cable clamps on pole A
  for (const y of [baseY + 4.98, baseY + 4.86]) {
    cyl(0.03, 0.03, 0.1, 6, steelDark, {
      x: A.x + perp.x * 0.5, y, z: A.z + perp.z * 0.5, ry: armRy, parent: poleA.g, cast: false,
    });
  }

  // contact shadows
  P.shadow(A.x, A.z, 0.34, 0.34);
  P.shadow(B.x, B.z, 0.3, 0.3);
}
