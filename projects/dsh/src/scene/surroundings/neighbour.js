/* Left neighbour: a tired two-storey old shop / tiny snack bar, cut by the base edge.
   Faces the main street (+z) and the narrow alley (+x). Kept deliberately dim so the
   convenience store stays the focal point. */
import * as THREE from 'three';
import { L } from '../../core/layout.js';
import { box, cyl, group, plane, sphere, instanced, cylinderBetween } from '../../core/geom.js';
import {
  addOutline, glowSprite, acUnit, pipeRun, crateStacks, chochin, decal, wallLamp, OUTLINE_COLOR,
} from './parts.js';

export function buildLeftNeighbour(ctx, parent, A) {
  const { mats } = ctx;
  const N = L.leftNeighbour;
  const g = group('left-neighbour', parent);

  const yBase = 0.12;
  const bodyTop = 4.78;
  const x0 = N.x0;
  const x1 = N.x1;
  const z0 = N.z0;
  const z1 = N.z1;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const topY = N.h; // 5.15

  const wallMat = mats.toon('#66636b');
  const wallDark = mats.toon('#54525a');
  const trimMat = mats.toon('#3d3f48');
  const metalMat = mats.toon('#5c606a');
  const darkMetal = mats.toon('#34373f');
  const frameMat = mats.toon('#484b54');
  const tileMat = mats.toon('#6f6a61');
  const capMat = mats.toon('#6b6a72');

  /* ---------------- main mass ---------------- */
  const body = box(x1 - x0, bodyTop - yBase, z1 - z0, wallMat, {
    x: cx, y: (yBase + bodyTop) / 2, z: cz, parent: g,
  });
  addOutline(ctx, body, 0.024, OUTLINE_COLOR);

  // roof slab + parapets (the cut edge at x0 has no parapet: it is a clean slice)
  box(x1 - x0, 0.14, z1 - z0, mats.toon('#4a4a52'), { x: cx, y: 4.85, z: cz, parent: g });
  box(x1 - x0, 0.17, 0.08, wallDark, { x: cx, y: 5.005, z: z1 - 0.04, parent: g });
  box(0.08, 0.17, z1 - z0, wallDark, { x: x1 - 0.04, y: 5.005, z: cz, parent: g });
  box(x1 - x0 + 0.03, 0.05, 0.13, capMat, { x: cx, y: 5.115, z: z1 - 0.04, parent: g, cast: false });
  box(0.13, 0.05, z1 - z0 + 0.03, capMat, { x: x1 - 0.04, y: 5.115, z: cz, parent: g, cast: false });

  // exposed slice face on the base left edge
  plane(z1 - z0, 4.8, new THREE.MeshBasicMaterial({
    map: A.cutA, toneMapped: true, color: new THREE.Color(0.66, 0.65, 0.72), fog: true,
  }), { x: x0 - 0.006, y: 2.52, z: cz, ry: -Math.PI / 2, parent: g, cast: false, receive: false });

  /* ---------------- front facade (z = z1) ---------------- */
  const fz = z1 + 0.002;
  // footing / plinth ledge
  box(x1 - x0, 0.13, 0.06, mats.toon('#4b4952'), { x: cx, y: 0.185, z: z1 + 0.015, parent: g, cast: false });
  // tiled piers either side of the shutter
  box(0.08, 2.2, 0.02, tileMat, { x: -5.76, y: 1.3, z: fz, parent: g, cast: false });
  box(0.18, 2.2, 0.02, tileMat, { x: -4.72, y: 1.3, z: fz, parent: g, cast: false });

  // closed rolling shutter
  const shW = 0.9;
  const shX = -5.27;
  const shBot = 0.24;
  const shTop = 2.26;
  box(shW, shTop - shBot, 0.035, mats.toon('#c8c5bb', { map: A.shutter }), {
    x: shX, y: (shBot + shTop) / 2, z: z1 + 0.02, parent: g, cast: false,
  });
  box(shW + 0.08, 0.16, 0.14, darkMetal, { x: shX, y: 2.34, z: z1 + 0.06, parent: g, cast: false });
  box(0.05, shTop - shBot + 0.12, 0.06, frameMat, { x: shX - shW / 2 - 0.045, y: (shBot + shTop) / 2, z: z1 + 0.03, parent: g, cast: false });
  box(0.05, shTop - shBot + 0.12, 0.06, frameMat, { x: shX + shW / 2 + 0.045, y: (shBot + shTop) / 2, z: z1 + 0.03, parent: g, cast: false });
  box(shW, 0.05, 0.055, frameMat, { x: shX, y: shBot + 0.02, z: z1 + 0.045, parent: g, cast: false });
  box(0.12, 0.05, 0.03, mats.toon('#8e9098'), { x: shX, y: 0.45, z: z1 + 0.05, parent: g, cast: false });
  // a small "closed today" paper stuck on the shutter
  decal(g, { x: -5.02, y: 1.34, z: z1 + 0.045, w: 0.16, h: 0.22, map: A.notices[0], opacity: 0.9 });

  // faded painted sign above the shop front
  box(0.96, 0.46, 0.06, trimMat, { x: shX, y: 2.64, z: z1 + 0.05, parent: g, cast: false });
  plane(0.92, 0.4, new THREE.MeshBasicMaterial({
    map: A.oldSign, toneMapped: true, color: new THREE.Color(0.78, 0.75, 0.68), fog: true,
  }), { x: shX, y: 2.64, z: z1 + 0.083, parent: g, cast: false, receive: false });

  // 2F balcony
  box(0.97, 0.1, 0.34, mats.toon('#4f4c55'), { x: -5.265, y: 3.05, z: 1.17, parent: g });
  for (const bx of [-5.66, -4.85]) {
    box(0.05, 0.05, 0.3, darkMetal, { x: bx, y: 2.985, z: 1.12, parent: g, cast: false });
  }
  box(0.97, 0.035, 0.035, metalMat, { x: -5.265, y: 3.86, z: 1.325, parent: g, cast: false });
  box(0.97, 0.025, 0.03, metalMat, { x: -5.265, y: 3.14, z: 1.33, parent: g, cast: false });
  for (const ex of [-5.73, -4.8]) {
    box(0.03, 0.74, 0.03, metalMat, { x: ex, y: 3.5, z: 1.32, parent: g, cast: false });
  }
  const barGeo = new THREE.BoxGeometry(0.014, 0.7, 0.014);
  const barT = [];
  for (let i = 0; i < 9; i++) barT.push({ x: -5.69 + i * 0.105, y: 3.5, z: 1.325 });
  instanced(barGeo, metalMat, barT, { parent: g, cast: false, receive: false });

  // laundry pole + tired washing
  cyl(0.014, 0.014, 0.86, 6, metalMat, { x: -5.265, y: 3.72, z: 1.19, rz: Math.PI / 2, parent: g, cast: false });
  plane(0.26, 0.34, mats.toon('#8b93a6', { side: THREE.DoubleSide }), { x: -5.45, y: 3.53, z: 1.2, parent: g, cast: false });
  plane(0.2, 0.26, mats.toon('#a29c8b', { side: THREE.DoubleSide }), { x: -5.06, y: 3.57, z: 1.18, parent: g, cast: false });

  // potted plant on the balcony
  box(0.22, 0.16, 0.16, mats.toon('#6a4f43'), { x: -4.92, y: 3.18, z: 1.19, parent: g, cast: false });
  sphere(0.11, mats.toon('#33483f'), { x: -4.96, y: 3.33, z: 1.17, parent: g, cast: false, wSeg: 8, hSeg: 6 });
  sphere(0.08, mats.toon('#3d574a'), { x: -4.87, y: 3.31, z: 1.24, parent: g, cast: false, wSeg: 8, hSeg: 6 });

  // AC condenser standing on the balcony (under the eave)
  acUnit(ctx, g, {
    x: -5.58, y: 3.34, z: 1.17, w: 0.4, h: 0.36, d: 0.24, grille: A.acGrille, stand: true, floorY: 3.1,
  });
  // its drain hose: along the balcony underside, then down the facade corner
  cylinderBetween(new THREE.Vector3(-5.44, 3.1, 1.16), new THREE.Vector3(-4.76, 3.06, 1.06), 0.011, mats.toon('#5b5f66'), { parent: g, cast: false });
  pipeRun(ctx, g, { x: -4.76, z: 1.02, y0: 0.14, y1: 3.06, r: 0.018, color: '#575b63', clamps: 3 });

  // 2F window with a dim warm light and curtains
  box(0.6, 0.82, 0.05, frameMat, { x: -5.0, y: 3.62, z: z1 + 0.004, parent: g, cast: false });
  plane(0.5, 0.72, new THREE.MeshBasicMaterial({
    map: A.windowWarm, toneMapped: false, color: new THREE.Color(0.56, 0.45, 0.35),
  }), { x: -5.0, y: 3.62, z: z1 + 0.03, parent: g, cast: false, receive: false });
  box(0.03, 0.72, 0.03, frameMat, { x: -5.0, y: 3.62, z: z1 + 0.04, parent: g, cast: false });
  box(0.64, 0.04, 0.11, mats.toon('#57545c'), { x: -5.0, y: 3.2, z: z1 + 0.03, parent: g, cast: false });

  // tiled hisashi eave over the balcony (reads from most orbit angles)
  const eave = box(1.14, 0.05, 0.44, mats.toon('#c9ccd4', { map: A.roofTiles }), {
    x: -5.22, y: 4.09, z: 1.2, parent: g,
  });
  eave.rotation.x = 0.17;
  box(1.14, 0.075, 0.035, mats.toon('#4a3f36'), { x: -5.22, y: 4.005, z: 1.42, parent: g, cast: false });
  for (const bx of [-5.66, -4.82]) {
    box(0.04, 0.04, 0.34, darkMetal, { x: bx, y: 4.03, z: 1.18, parent: g, cast: false });
  }

  // projecting vertical snack sign, dim mint lightbox
  const signMatFace = new THREE.MeshBasicMaterial({
    map: A.snackSign, toneMapped: false, color: new THREE.Color(0.62, 0.68, 0.65),
  });
  const blade = box(0.06, 0.95, 0.34, darkMetal, { x: -4.68, y: 3.42, z: 1.17, parent: g, cast: false });
  addOutline(ctx, blade, 0.01, '#0d1117');
  plane(0.3, 0.88, signMatFace, { x: -4.711, y: 3.42, z: 1.17, ry: -Math.PI / 2, parent: g, cast: false, receive: false });
  plane(0.3, 0.88, signMatFace, { x: -4.649, y: 3.42, z: 1.17, ry: Math.PI / 2, parent: g, cast: false, receive: false });
  for (const sy of [3.8, 3.06]) {
    cyl(0.016, 0.016, 0.34, 6, metalMat, { x: -4.68, y: sy, z: 1.17, rx: Math.PI / 2, parent: g, cast: false });
  }
  glowSprite(g, { x: -4.68, y: 3.42, z: 1.4, size: 0.9, color: '#7fe6d4', opacity: 0.2, kind: 'mint' });

  // small round exhaust vent on the blank upper wall
  box(0.26, 0.26, 0.05, frameMat, { x: -5.32, y: 4.4, z: z1 + 0.008, parent: g, cast: false });
  cyl(0.11, 0.11, 0.018, 10, mats.toon('#7c8088'), { x: -5.32, y: 4.4, z: z1 + 0.04, rx: Math.PI / 2, parent: g, cast: false });
  if (Array.isArray(ctx.refs.signs)) {
    ctx.refs.signs.push({ mat: signMatFace, base: signMatFace.color.clone(), flicker: 0.22, name: 'neighbour-blade' });
  }

  // security light under the balcony + pool of light on the front walk
  box(0.16, 0.09, 0.16, darkMetal, { x: -5.5, y: 2.93, z: 1.16, parent: g, cast: false });
  box(0.12, 0.02, 0.12, new THREE.MeshBasicMaterial({ color: '#ffdca6', toneMapped: false }), {
    x: -5.5, y: 2.88, z: 1.16, parent: g, cast: false, receive: false,
  });
  const secLight = new THREE.PointLight(new THREE.Color('#ffc98f'), 1.5, 2.7, 2.0);
  secLight.position.set(-5.5, 2.72, 1.32);
  g.add(secLight);
  glowSprite(g, { x: -5.5, y: 2.85, z: 1.3, size: 0.62, color: '#ffc98f', opacity: 0.4 });
  const poolMat = new THREE.MeshBasicMaterial({
    map: A.poolGlow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    opacity: 0.4, toneMapped: false, fog: true,
  });
  plane(1.45, 0.95, poolMat, { x: -5.48, y: 0.152, z: 1.62, ground: true, cast: false, receive: false, parent: g }).renderOrder = 2;

  // grime + moss at the base of the shop front (right pier, clear of the shutter)
  decal(g, { x: -4.72, y: 0.92, z: z1 + 0.013, w: 0.16, h: 1.5, map: A.grime, opacity: 0.55 });
  decal(g, { x: -4.72, y: 0.3, z: z1 + 0.014, w: 0.2, h: 0.34, map: A.moss, opacity: 0.7 });

  /* ---------------- alley-side wall (x = x1) ---------------- */
  const ax = x1 + 0.002;
  // small frosty lit bathroom window, cool and dim
  box(0.05, 0.54, 0.42, frameMat, { x: x1 + 0.005, y: 3.62, z: -0.6, parent: g, cast: false });
  plane(0.34, 0.46, new THREE.MeshBasicMaterial({
    map: A.windowCool, toneMapped: false, color: new THREE.Color(0.3, 0.38, 0.46),
  }), { x: x1 + 0.034, y: 3.62, z: -0.6, ry: Math.PI / 2, parent: g, cast: false, receive: false });
  // downpipe + thin conduit
  pipeRun(ctx, g, { x: x1 + 0.045, z: 0.88, y0: 0.14, y1: 4.8, r: 0.032, color: '#5a5e66', clamps: 3 });
  pipeRun(ctx, g, { x: x1 + 0.03, z: -3.4, y0: 0.14, y1: 4.2, r: 0.02, color: '#4e525a', clamps: 2 });
  // damp streaks and moss
  decal(g, { x: ax, y: 0.95, z: 0.32, w: 0.42, h: 1.5, ry: Math.PI / 2, map: A.grime, opacity: 0.5 });
  decal(g, { x: ax, y: 0.9, z: -1.5, w: 0.5, h: 1.7, ry: Math.PI / 2, map: A.grime, opacity: 0.45 });
  decal(g, { x: ax, y: 0.3, z: -3.1, w: 0.6, h: 0.5, ry: Math.PI / 2, map: A.moss, opacity: 0.7 });

  /* ---------------- roof clutter ---------------- */
  cyl(0.06, 0.07, 0.38, 8, metalMat, { x: -4.95, y: 4.99, z: -1.2, parent: g });
  cyl(0.1, 0.1, 0.05, 8, metalMat, { x: -4.95, y: 5.2, z: -1.2, parent: g, cast: false });
  cyl(0.24, 0.24, 0.4, 10, mats.toon('#74777e'), { x: -5.4, y: 5.05, z: -2.7, parent: g });
  cyl(0.19, 0.22, 0.08, 10, mats.toon('#62656c'), { x: -5.4, y: 5.27, z: -2.7, parent: g, cast: false });
  decal(g, { x: -5.16, y: 4.928, z: 0.1, w: 1.0, h: 0.75, map: A.moss, opacity: 0.6, ground: true });
  decal(g, { x: -5.2, y: 4.929, z: -3.4, w: 0.85, h: 0.6, map: A.grime, opacity: 0.5, ground: true });

  /* ---------------- alley entrance clutter (z > 0, our side) ---------------- */
  crateStacks(ctx, g, [
    {
      color: '#c8a445',
      map: A.crate,
      items: [
        { x: -4.44, y: 0.255, z: 0.04, ry: 0.05 },
        { x: -4.44, y: 0.525, z: 0.04, ry: -0.04 },
        { x: -4.44, y: 0.255, z: 0.4, ry: 0.1 },
      ],
    },
  ]);

  return g;
}
