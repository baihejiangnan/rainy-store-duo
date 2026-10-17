import * as THREE from 'three';
import { L } from '../../core/layout.js';
import { box, circle, cyl, cylinderBetween, group, plane, rounded } from '../../core/geom.js';

/* Side-walk street furniture: umbrella stand, recycle bins, signs, convex mirror,
 * pipe guardrails, parking wheel stops, wet leaves, plants, broom. */
export function buildStreet(ctx, P) {
  const { mats, textures } = P.ctx;
  const baseY = L.walkY;

  /* ================================================================== */
  /* umbrella stand + closed umbrellas near the door                     */
  /* ================================================================== */
  const us = L.umbrellaStand;
  const ug = group('umbrella-stand', P.g);
  ug.position.set(us.x, baseY, us.z);
  cyl(0.2, 0.21, 0.035, 12, mats.toon('#3a3d46'), { x: 0, y: 0.018, z: 0, parent: ug, cast: false });
  cyl(0.165, 0.14, 0.42, 12, mats.toon('#4c4f58'), { x: 0, y: 0.23, z: 0, parent: ug });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.014, 5, 14), mats.toon('#8f939c'));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.44;
  ug.add(rim);
  // dark water inside
  circle(0.145, 12, new THREE.MeshBasicMaterial({
    color: '#1b2a3a', transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false,
  }), { x: 0, y: 0.35, z: 0, rx: -Math.PI / 2, parent: ug, cast: false });
  // little label
  const standLabel = P.label(96, 64, (cx, w, h) => {
    cx.fillStyle = '#eae7db';
    cx.fillRect(0, 0, w, h);
    cx.fillStyle = '#3b4a5a';
    cx.font = '900 30px "Yu Gothic", sans-serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('傘', w / 2, h / 2 + 2);
  });
  plane(0.1, 0.07, standLabel, {
    x: 0, y: 0.3, z: 0.171, parent: ug, cast: false, receive: false,
  }).renderOrder = 5;

  // four closed umbrellas leaning in the stand
  const umbrellaColors = ['#2f3d63', '#8f3b45', '#3d5b4c', '#a9c3d6'];
  const handleMat = mats.toon('#4a3a2c');
  const umbrellaDefs = [
    { ox: -0.06, oz: -0.06, rz: 0.1, rx: -0.06 },
    { ox: 0.07, oz: -0.02, rz: -0.09, rx: -0.04 },
    { ox: -0.01, oz: 0.08, rz: 0.05, rx: 0.09 },
    { ox: 0.06, oz: 0.06, rz: -0.12, rx: 0.05 },
  ];
  const canopyGeo = new THREE.CylinderGeometry(0.026, 0.075, 0.56, 6);
  const shaftGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.94, 5);
  const tipGeo = new THREE.ConeGeometry(0.016, 0.07, 5);
  const handleGeo = (() => {
    const pts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.01, 0.09, 0),
      new THREE.Vector3(0.07, 0.13, 0),
      new THREE.Vector3(0.13, 0.09, 0),
      new THREE.Vector3(0.145, 0.01, 0),
    ];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.014, 5, false);
  })();
  umbrellaDefs.forEach((u, i) => {
    const color = umbrellaColors[i];
    const transparent = i === 3;
    const canopyMat = transparent
      ? mats.toon('#a9c3d6', { transparent: true, opacity: 0.55 })
      : mats.toon(color);
    const eg = group(`umbrella-${i}`, ug);
    eg.position.set(u.ox, 0.1, u.oz);
    eg.rotation.set(u.rx, i * 0.5, u.rz);
    // shaft
    const shaft = new THREE.Mesh(shaftGeo, mats.toon('#555960'));
    shaft.position.y = 0.5;
    eg.add(shaft);
    // folded canopy
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.y = 0.68;
    canopy.castShadow = true;
    eg.add(canopy);
    // rib ridge
    const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.008, 4, 8), canopyMat);
    ridge.rotation.x = Math.PI / 2;
    ridge.position.y = 0.87;
    eg.add(ridge);
    // ferrule tip (apex pointing down, as it rests in the stand)
    const tip = new THREE.Mesh(tipGeo, mats.toon('#8f939c'));
    tip.position.y = 0.19;
    tip.rotation.x = Math.PI;
    eg.add(tip);
    // J handle at the top
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0.0, 0.96, 0);
    eg.add(handle);
  });
  P.shadow(us.x, us.z, 0.26, 0.28);

  /* ================================================================== */
  /* three labelled recycle bins by the side wall                        */
  /* ================================================================== */
  const binDefs = [
    { jp: 'もえるゴミ', en: 'BURN', accent: '#d98a3f', body: '#c4c1b7' },
    { jp: 'ペットボトル', en: 'PET', accent: '#4c7f5f', body: '#b9bdb4' },
    { jp: 'かん・びん', en: 'CANS', accent: '#3f6c92', body: '#b6b9b8' },
  ];
  const binZs = [-2.93, -3.21, -3.49];
  binDefs.forEach((def, i) => {
    const cx = 1.57;
    const cz = binZs[i];
    const bg = group(`bin-${i}`, P.g);
    bg.position.set(cx, baseY, cz);
    // body
    const body = rounded(0.42, 0.8, 0.25, 0.028, mats.toon(def.body), {
      x: 0, y: 0.4, z: 0, parent: bg,
    });
    ctx.outline(body, 0.012, '#15171d');
    // coloured lid + neck band
    box(0.43, 0.05, 0.26, mats.toon(def.accent), {
      x: 0, y: 0.83, z: 0, parent: bg, cast: false,
    });
    rounded(0.44, 0.1, 0.27, 0.03, mats.toon(def.accent), {
      x: 0, y: 0.89, z: 0, parent: bg,
    });
    box(0.2, 0.02, 0.15, mats.toon('#191c22'), {
      x: 0.02, y: 0.945, z: 0, parent: bg, cast: false,
    });
    // opening on the front face
    box(0.03, 0.1, 0.16, mats.toon('#14161c'), {
      x: 0.211, y: 0.68, z: 0, parent: bg, cast: false,
    });
    // label
    const labelMat = P.label(192, 256, (c2, w, h) => {
      c2.fillStyle = '#efece2';
      c2.fillRect(0, 0, w, h);
      c2.fillStyle = def.accent;
      c2.fillRect(0, 0, w, 62);
      c2.fillStyle = '#f7f4ea';
      c2.font = '900 30px "Segoe UI", Arial, sans-serif';
      c2.textAlign = 'center';
      c2.textBaseline = 'middle';
      c2.fillText(def.en, w / 2, 33);
      c2.fillStyle = '#33302f';
      const chars = [...def.jp];
      if (chars.length > 4) {
        c2.font = '900 34px "Yu Gothic", "Meiryo", sans-serif';
        const half = Math.ceil(chars.length / 2);
        c2.fillText(chars.slice(0, half).join(''), w / 2, 112);
        c2.fillText(chars.slice(half).join(''), w / 2, 158);
      } else {
        c2.font = '900 44px "Yu Gothic", "Meiryo", sans-serif';
        c2.fillText(def.jp, w / 2, 132);
      }
      c2.fillStyle = def.accent;
      c2.fillRect(20, 200, w - 40, 10);
      c2.fillStyle = '#6a6660';
      c2.font = '700 20px "Yu Gothic", sans-serif';
      c2.fillText('リサイクル', w / 2, 230);
    });
    plane(0.2, 0.28, labelMat, {
      x: 0.213, y: 0.42, z: 0, ry: Math.PI / 2, parent: bg, cast: false, receive: false,
    }).renderOrder = 4;
    // feet
    for (const dz of [-0.09, 0.09]) {
      box(0.06, 0.05, 0.05, mats.toon('#2c2f36'), {
        x: 0.12, y: 0.025, z: dz, parent: bg, cast: false,
      });
    }
    P.shadow(cx, cz, 0.3, 0.2);
  });
  // rubbish bag waiting next to the bins
  const bagG = group('rubbish-bag', P.g);
  bagG.position.set(2.08, baseY, -3.86);
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), mats.toon('#d7d4c9', {
    transparent: true, opacity: 0.92,
  }));
  bag.scale.set(1, 1.1, 0.9);
  bag.position.y = 0.21;
  bag.castShadow = true;
  bagG.add(bag);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 5), mats.toon('#c4c1b6'));
  knot.position.y = 0.42;
  bagG.add(knot);
  P.shadow(2.08, -3.86, 0.2, 0.18);

  /* ================================================================== */
  /* signs: stop, parking, convex mirror, no-bicycle notice              */
  /* ================================================================== */
  // A) 止まれ stop sign on the corner
  const stopG = group('stop-sign', P.g);
  stopG.position.set(2.18, baseY, 1.55);
  stopG.rotation.y = 0.16;
  cyl(0.026, 0.032, 1.95, 8, mats.toon('#a9adb3'), { x: 0, y: 0.975, z: 0, parent: stopG });
  box(0.42, 0.42, 0.02, mats.toon('#7c8088'), { x: 0, y: 1.78, z: -0.012, parent: stopG, cast: false });
  const stopMat = new THREE.MeshBasicMaterial({ map: textures.stopSignTexture(), toneMapped: false });
  const stopFace = plane(0.44, 0.44, stopMat, {
    x: 0, y: 1.78, z: 0.002, parent: stopG, cast: false, receive: false,
  });
  stopFace.renderOrder = 4;
  box(0.1, 0.06, 0.06, mats.toon('#5b5f66'), { x: 0, y: 1.55, z: -0.02, parent: stopG, cast: false });
  P.shadow(2.18, 1.55, 0.2, 0.12);

  // B) P parking sign at the bay entrance
  const pG = group('parking-sign', P.g);
  pG.position.set(2.2, baseY, -0.72);
  pG.rotation.y = -0.12;
  cyl(0.026, 0.032, 2.28, 8, mats.toon('#a9adb3'), { x: 0, y: 1.14, z: 0, parent: pG });
  box(0.38, 0.38, 0.02, mats.toon('#767a82'), { x: 0, y: 2.05, z: -0.012, parent: pG, cast: false });
  const pMat = new THREE.MeshBasicMaterial({ map: textures.parkingSignTexture(), toneMapped: false });
  plane(0.4, 0.4, pMat, {
    x: 0, y: 2.05, z: 0.002, parent: pG, cast: false, receive: false,
  }).renderOrder = 4;
  P.shadow(2.2, -0.72, 0.18, 0.12);

  // C) convex mirror at the alley mouth
  const mirrorG = group('convex-mirror', P.g);
  mirrorG.position.set(-4.55, baseY, 1.14);
  cyl(0.028, 0.034, 2.45, 8, mats.toon('#b7b2a4'), { x: 0, y: 1.225, z: 0, parent: mirrorG });
  cylinderBetween(
    new THREE.Vector3(0, 2.35, 0),
    new THREE.Vector3(0.06, 2.4, 0.1),
    0.02, mats.toon('#6e727a'), { parent: mirrorG, seg: 5, cast: false }
  );
  const mHead = group('mirror-head', mirrorG);
  mHead.position.set(0.08, 2.42, 0.12);
  mHead.rotation.y = 0.62;
  // mirror face texture (dull convex reflection)
  const mirrorTex = (() => {
    const { c, ctx: cx } = textures.canvas2d(128, 128);
    const g = cx.createRadialGradient(52, 50, 4, 64, 64, 64);
    g.addColorStop(0, '#e8f2fa');
    g.addColorStop(0.35, '#a9c3d8');
    g.addColorStop(0.7, '#63758c');
    g.addColorStop(1, '#3a4658');
    cx.fillStyle = g;
    cx.fillRect(0, 0, 128, 128);
    cx.strokeStyle = 'rgba(255,255,255,0.5)';
    cx.lineWidth = 5;
    cx.beginPath();
    cx.arc(44, 44, 30, -1.2, 0.4);
    cx.stroke();
    return textures.tex(c);
  })();
  const mirrorFace = new THREE.Mesh(new THREE.CircleGeometry(0.26, 22), new THREE.MeshBasicMaterial({
    map: mirrorTex, toneMapped: false,
  }));
  mirrorFace.position.z = 0.035;
  mHead.add(mirrorFace);
  const mirrorRim = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.032, 6, 20), mats.toon('#e0964d'));
  mirrorRim.position.z = 0.02;
  mHead.add(mirrorRim);
  const mirrorBack = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.055, 20), mats.toon('#4b4e56'));
  mirrorBack.rotation.x = Math.PI / 2;
  mirrorBack.position.z = -0.005;
  mHead.add(mirrorBack);
  P.shadow(-4.55, 1.14, 0.16, 0.14);

  // D) small "no bicycle parking" plate near the parked bicycle
  const nbG = group('no-bike-sign', P.g);
  nbG.position.set(-1.34, baseY, 2.16);
  nbG.rotation.y = -0.08;
  cyl(0.02, 0.024, 1.12, 6, mats.toon('#8d9199'), { x: 0, y: 0.56, z: 0, parent: nbG });
  box(0.31, 0.23, 0.015, mats.toon('#7d8189'), { x: 0, y: 1.02, z: -0.01, parent: nbG, cast: false });
  const nbMat = P.label(256, 192, (cx, w, h) => {
    cx.fillStyle = '#f4f1e6';
    cx.fillRect(0, 0, w, h);
    cx.strokeStyle = '#c7403b';
    cx.lineWidth = 10;
    cx.strokeRect(6, 6, w - 12, h - 12);
    cx.fillStyle = '#c7403b';
    cx.font = '900 46px "Yu Gothic", "Meiryo", sans-serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('自転車', w / 2, 54);
    cx.fillStyle = '#33302f';
    cx.font = '900 34px "Yu Gothic", "Meiryo", sans-serif';
    cx.fillText('ここに止めないで', w / 2, 108);
    cx.fillStyle = '#c7403b';
    cx.font = '700 22px "Yu Gothic", sans-serif';
    cx.fillText('ひかり町 2丁目', w / 2, 160);
  });
  plane(0.3, 0.225, nbMat, {
    x: 0, y: 1.02, z: 0.002, parent: nbG, cast: false, receive: false,
  }).renderOrder = 4;
  P.shadow(-1.34, 2.16, 0.14, 0.1);

  // E) small notice on the store side wall between the machines
  const wallNotice = P.label(192, 128, (cx, w, h) => {
    cx.fillStyle = '#f2eee2';
    cx.fillRect(0, 0, w, h);
    cx.fillStyle = '#3f6c92';
    cx.fillRect(0, 0, w, 30);
    cx.fillStyle = '#f2eee2';
    cx.font = '700 18px "Yu Gothic", sans-serif';
    cx.textAlign = 'center';
    cx.fillText('お願い', w / 2, 22);
    cx.fillStyle = '#33302f';
    cx.font = '900 26px "Yu Gothic", "Meiryo", sans-serif';
    cx.fillText('ゴミは', w / 2, 68);
    cx.fillText('持ち帰ろう', w / 2, 100);
  });
  plane(0.2, 0.135, wallNotice, {
    x: 1.331, y: 2.12, z: -1.72, ry: Math.PI / 2, parent: P.g, cast: false, receive: false,
  }).renderOrder = 5;

  /* ================================================================== */
  /* white pipe guardrails along the near curbs                          */
  /* ================================================================== */
  const railY = baseY + 0.86;
  const railY2 = baseY + 0.56;
  const postItems = [];
  const railItems = [];
  const segs = [
    { axis: 'x', z: 2.24, a: -5.5, b: -4.55 },
    { axis: 'x', z: 2.24, a: 1.52, b: 2.22 },
    { axis: 'z', x: 2.24, a: -5.45, b: -3.55 },
    { axis: 'z', x: 2.24, a: -0.55, b: 0.82 },
  ];
  for (const s of segs) {
    const len = s.b - s.a;
    const n = Math.max(2, Math.round(len / 1.02) + 1);
    for (let i = 0; i < n; i++) {
      const t = s.a + (len * i) / (n - 1);
      postItems.push(s.axis === 'x'
        ? { x: t, y: baseY + 0.39, z: s.z }
        : { x: s.x, y: baseY + 0.39, z: t });
    }
    const mid = (s.a + s.b) / 2;
    if (s.axis === 'x') {
      railItems.push({ x: mid, y: railY, z: s.z, rz: -Math.PI / 2, sy: len });
      railItems.push({ x: mid, y: railY2, z: s.z, rz: -Math.PI / 2, sy: len });
    } else {
      railItems.push({ x: s.x, y: railY, z: mid, rx: Math.PI / 2, sy: len });
      railItems.push({ x: s.x, y: railY2, z: mid, rx: Math.PI / 2, sy: len });
    }
  }
  const railMat = mats.toon('#d4d0c3');
  P.inst(new THREE.CylinderGeometry(0.034, 0.034, 0.78, 6), railMat, postItems, {
    cast: true, receive: false,
  });
  P.inst(new THREE.CylinderGeometry(0.027, 0.027, 1, 6), railMat, railItems, {
    cast: false, receive: false,
  });

  /* ================================================================== */
  /* parking wheel stops                                                 */
  /* ================================================================== */
  const stopY = L.roadY;
  for (const sx of [2.72, 3.28]) {
    const wg = group('wheel-stop', P.g);
    wg.position.set(sx, stopY, -3.0);
    box(0.34, 0.1, 0.17, mats.toon('#6e7076'), { x: 0, y: 0.05, z: 0, parent: wg });
    const stripe = new THREE.MeshBasicMaterial({ color: '#d9c66a', toneMapped: false });
    box(0.32, 0.018, 0.15, stripe, { x: 0, y: 0.105, z: 0, parent: wg, cast: false });
    box(0.04, 0.06, 0.04, mats.toon('#ffb14e'), { x: 0.12, y: 0.04, z: 0.09, parent: wg, cast: false });
    box(0.04, 0.06, 0.04, mats.toon('#ffb14e'), { x: -0.12, y: 0.04, z: 0.09, parent: wg, cast: false });
  }

  /* ================================================================== */
  /* potted plants + weeds                                               */
  /* ================================================================== */
  const potMat = mats.toon('#8a5f4c');
  const potDark = mats.toon('#6a4838');
  const leafA = mats.toon('#2f4b3f');
  const leafB = mats.toon('#3e6658');
  const leafC = mats.toon('#274039');
  const mkPlant = (x, z, scale = 1, tall = false) => {
    const pg = group('potted-plant', P.g);
    pg.position.set(x, ctx.groundHeight(x, z), z);
    pg.scale.setScalar(scale);
    cyl(0.13, 0.1, 0.22, 8, potMat, { x: 0, y: 0.11, z: 0, parent: pg });
    cyl(0.14, 0.13, 0.035, 8, potDark, { x: 0, y: 0.22, z: 0, parent: pg, cast: false });
    cyl(0.115, 0.115, 0.02, 8, mats.toon('#2b241f'), { x: 0, y: 0.225, z: 0, parent: pg, cast: false });
    const blobs = tall
      ? [[0, 0.52, 0, 0.2], [0.09, 0.62, 0.04, 0.15], [-0.08, 0.6, -0.05, 0.16], [0.02, 0.74, 0.02, 0.13]]
      : [[0, 0.36, 0, 0.17], [0.1, 0.32, 0.05, 0.12], [-0.09, 0.34, -0.04, 0.13]];
    blobs.forEach((bl, i) => {
      const b = new THREE.Mesh(
        new THREE.IcosahedronGeometry(bl[3], 0),
        i % 3 === 0 ? leafA : i % 3 === 1 ? leafB : leafC
      );
      b.position.set(bl[0], bl[1], bl[2]);
      b.rotation.set(i * 0.7, i * 1.3, 0.2);
      b.castShadow = true;
      b.receiveShadow = false;
      pg.add(b);
    });
    if (tall) {
      cyl(0.02, 0.025, 0.4, 5, mats.toon('#5a4632'), { x: 0, y: 0.42, z: 0, parent: pg, cast: false });
    }
    P.shadow(x, z, 0.17 * scale, 0.17 * scale);
  };
  mkPlant(-4.5, 1.4, 1.05, true);
  mkPlant(-4.22, 1.2, 0.85, false);
  mkPlant(-4.4, 1.9, 1.0, true);

  // weed tufts near the base border
  const weedMat = mats.toon('#3a5a4a');
  const weedGeo = new THREE.ConeGeometry(0.035, 0.22, 4);
  const weedItems = [];
  const weedSpots = [[-5.52, 1.14], [-5.36, 1.06], [2.18, -5.35], [-5.46, 1.36]];
  weedSpots.forEach(([wx, wz], k) => {
    for (let i = 0; i < 4; i++) {
      weedItems.push({
        x: wx + (i - 1.5) * 0.05, y: 0.14 + 0.1, z: wz + (Math.sin(i + k) * 0.05),
        rz: (i - 1.5) * 0.22, rx: Math.sin(i * 2 + k) * 0.2,
      });
    }
  });
  P.inst(weedGeo, weedMat, weedItems, { cast: false, receive: false });

  /* ================================================================== */
  /* broom leaning by the bins                                           */
  /* ================================================================== */
  const broomG = group('broom', P.g);
  broomG.position.set(1.12, 0.12, -3.74);
  cylinderBetween(
    new THREE.Vector3(0, 0.02, 0),
    new THREE.Vector3(0.0, 1.3, 0.12),
    0.014, mats.toon('#6b5a3e'), { parent: broomG, seg: 5, cast: false }
  );
  box(0.11, 0.17, 0.05, mats.toon('#8a7452'), {
    x: 0.0, y: 0.09, z: 0.0, parent: broomG, cast: false,
  });
  for (let i = 0; i < 5; i++) {
    box(0.012, 0.16, 0.012, mats.toon('#a68d5f'), {
      x: (i - 2) * 0.022, y: 0.03, z: 0.0, parent: broomG, cast: false,
    });
  }
  P.shadow(1.12, -3.74, 0.12, 0.12);

  /* ================================================================== */
  /* wet leaves scattered along gutters and puddles                      */
  /* ================================================================== */
  const leafTex = (() => {
    const { c, ctx: cx } = textures.canvas2d(128, 96);
    cx.clearRect(0, 0, 128, 96);
    const leaves = [
      [30, 34, 16, 9, 0.4, '#41584a'],
      [66, 46, 19, 10, -0.3, '#564a34'],
      [96, 66, 14, 8, 1.1, '#3a4d3f'],
    ];
    for (const [x, y, rx, ry, rot, col] of leaves) {
      cx.save();
      cx.translate(x, y);
      cx.rotate(rot);
      cx.fillStyle = col;
      cx.beginPath();
      cx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      cx.fill();
      cx.strokeStyle = 'rgba(20,26,22,0.55)';
      cx.lineWidth = 1.6;
      cx.beginPath();
      cx.moveTo(-rx * 0.9, 0);
      cx.lineTo(rx * 0.9, 0);
      cx.stroke();
      cx.restore();
    }
    return textures.tex(c);
  })();
  const leafMat = new THREE.MeshBasicMaterial({
    map: leafTex,
    transparent: true,
    alphaTest: 0.45,
    depthWrite: true,
    toneMapped: false,
    color: '#b9b9b0',
    side: THREE.DoubleSide,
  });
  const leafGeo = new THREE.PlaneGeometry(0.12, 0.09);
  leafGeo.rotateX(-Math.PI / 2);
  const rand = ctx.rng(707);
  const leafSpots = [];
  // front gutter
  for (let i = 0; i < 14; i++) {
    leafSpots.push({ x: -5.2 + rand() * 7.2, z: 2.46 + rand() * 0.16 });
  }
  // side gutter
  for (let i = 0; i < 10; i++) {
    leafSpots.push({ x: 2.46 + rand() * 0.16, z: -5.0 + rand() * 5.4 });
  }
  // walked onto the sidewalks near the puddles
  for (const p of L.puddles.slice(0, 4)) {
    if (Math.abs(p.x) > 2.4) continue;
    leafSpots.push({ x: p.x + (rand() - 0.5) * 0.7, z: p.z + (rand() - 0.5) * 0.5 });
  }
  leafSpots.push({ x: -2.6, z: 1.7 }, { x: 0.35, z: 2.05 }, { x: -1.2, z: 1.3 });
  const leafItems = leafSpots.map((s) => {
    const y = ctx.groundHeight(s.x, s.z) + 0.008;
    return { x: s.x, y, z: s.z, ry: rand() * Math.PI * 2, s: 0.7 + rand() * 0.8 };
  });
  P.inst(leafGeo, leafMat, leafItems, { cast: false, receive: false });

  /* ================================================================== */
  /* a couple of painted bike-parking marks on the front walk            */
  /* ================================================================== */
  const markMat = new THREE.MeshBasicMaterial({
    color: '#c9c5b4', transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false,
  });
  for (let i = 0; i < 2; i++) {
    plane(0.06, 0.5, markMat, {
      x: -2.6 + i * 0.14, y: baseY + 0.006, z: 1.75, ground: true, cast: false, receive: false,
    }).renderOrder = 2;
  }
}
