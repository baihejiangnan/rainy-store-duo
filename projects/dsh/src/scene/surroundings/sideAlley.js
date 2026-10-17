/* The narrow slot between the shop and the old neighbour.
   Entrance end (z > 0) keeps the pipes / meter box / AC / wall lamp; the deep end
   (z < -3) hides a back door behind a noren and a paper lantern, deliberately tempting
   you to peek in when the camera orbits to the left. Props keeps z -2.7..-2.0 for its
   old alley vending machine, so we leave that stretch empty. */
import * as THREE from 'three';
import { L } from '../../core/layout.js';
import { box, cyl, group, plane, instanced } from '../../core/geom.js';
import { addOutline, glowSprite, acUnit, pipeRun, wallLamp, chochin, cable, decal } from './parts.js';

export function buildSideAlley(ctx, parent, A) {
  const { mats } = ctx;
  const g = group('side-alley', parent);
  const storeX = L.store.x0; // -3.92, store wall faces -x
  const nX = L.leftNeighbour.x1; // -4.62, neighbour wall faces +x
  const floorY = 0.12;

  const metalMat = mats.toon('#5d616a');
  const darkMetal = mats.toon('#3b3e46');
  const frameMat = mats.toon('#4a4d55');

  /* ---------------- store wall (x = storeX) ---------------- */
  pipeRun(ctx, g, { x: storeX - 0.045, z: 0.78, y0: 0.14, y1: 3.4, r: 0.03, color: '#5d616a', clamps: 3 });
  pipeRun(ctx, g, { x: storeX - 0.03, z: -1.05, y0: 0.14, y1: 2.7, r: 0.022, color: '#4f535b', clamps: 2 });
  // meter box with face
  box(0.14, 0.4, 0.3, mats.toon('#bdb9ac'), { x: storeX - 0.075, y: 1.5, z: 0.12, parent: g, cast: false });
  box(0.15, 0.04, 0.32, darkMetal, { x: storeX - 0.07, y: 1.72, z: 0.12, parent: g, cast: false });
  plane(0.24, 0.3, new THREE.MeshBasicMaterial({ map: A.meter, toneMapped: true }), {
    x: storeX - 0.148, y: 1.5, z: 0.12, ry: -Math.PI / 2, parent: g, cast: false, receive: false,
  });
  box(0.1, 0.18, 0.2, mats.toon('#a9a69a'), { x: storeX - 0.055, y: 0.95, z: 0.12, parent: g, cast: false });
  // conduit up to the roof + down to the ground
  cyl(0.016, 0.016, 1.45, 5, mats.toon('#555962'), { x: storeX - 0.09, y: 2.55, z: 0.12, parent: g, cast: false });

  // wall lamp (our warm key light for the entrance end)
  wallLamp(ctx, g, {
    x: storeX, y: 2.3, z: 0.52, ry: -Math.PI / 2, intensity: 1.15, distance: 2.4,
    size: 0.42, pool: [[storeX - 0.26, floorY + 0.008, 0.52], [0.55, 0.9]], poolOpacity: 0.34,
  });

  // notices taped to the store wall
  plane(0.17, 0.23, new THREE.MeshBasicMaterial({ map: A.notices[0], toneMapped: true }), {
    x: storeX - 0.006, y: 1.72, z: -0.55, ry: -Math.PI / 2, parent: g, cast: false, receive: false,
  });
  plane(0.15, 0.2, new THREE.MeshBasicMaterial({ map: A.notices[2], toneMapped: true }), {
    x: storeX - 0.006, y: 1.62, z: -0.82, ry: -Math.PI / 2, parent: g, cast: false, receive: false,
  });

  // AC condenser on the ground against the store wall (clear of the vending bay)
  acUnit(ctx, g, {
    x: storeX - 0.2, y: 0.45, z: -1.45, ry: -Math.PI / 2, w: 0.62, h: 0.42, d: 0.28,
    grille: A.acGrille, stand: true, floorY, outline: true, drip: true,
  });

  // cable along the store wall + drop to the meter box
  cable(ctx, g, new THREE.Vector3(storeX - 0.03, 2.78, 0.95), new THREE.Vector3(storeX - 0.03, 2.72, -3.35), 0.06, 0.007);
  const brT = [];
  for (const bz of [0.65, -0.9, -3.1]) brT.push({ x: storeX - 0.03, y: 2.77, z: bz, sx: 0.05, sy: 0.06, sz: 0.05 });
  instanced(new THREE.BoxGeometry(1, 1, 1), mats.toon('#484b53'), brT, { parent: g, cast: false, receive: false });

  // roof downpipe at the deep end
  pipeRun(ctx, g, { x: storeX - 0.05, z: -3.42, y0: 0.14, y1: 3.6, r: 0.028, color: '#565a62', clamps: 2 });

  /* ---------------- neighbour wall (x = nX) ---------------- */
  // moss / damp creeping out of the base
  decal(g, { x: nX + 0.002, y: 0.32, z: -1.0, w: 0.7, h: 0.5, ry: Math.PI / 2, map: A.moss, opacity: 0.65 });
  decal(g, { x: nX + 0.002, y: 0.9, z: -3.25, w: 0.5, h: 1.4, ry: Math.PI / 2, map: A.grime, opacity: 0.5 });

  // stepping stones along the walkable line
  const stoneGeo = new THREE.CylinderGeometry(0.15, 0.16, 0.045, 8);
  instanced(stoneGeo, mats.toon('#5a5a62'), [
    { x: -4.24, y: floorY + 0.015, z: -0.42, ry: -0.15 },
    { x: -4.31, y: floorY + 0.015, z: -0.95, ry: 0.4 },
  ], { parent: g, cast: false, receive: true });

  // small standing puddle
  const puddleMat = new THREE.MeshBasicMaterial({
    color: '#1a2740', transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false, fog: true,
  });
  const pud = new THREE.Mesh(new THREE.CircleGeometry(0.26, 12), puddleMat);
  pud.rotation.x = -Math.PI / 2;
  pud.scale.set(1, 0.55, 1);
  pud.position.set(-4.26, floorY + 0.012, -0.62);
  pud.castShadow = false;
  pud.receiveShadow = false;
  g.add(pud);

  /* ---------------- deep end: noren + old door + lantern ---------------- */
  // hanging rod
  cyl(0.014, 0.014, 0.72, 6, metalMat, { x: -4.27, y: 2.48, z: -3.05, rz: Math.PI / 2, parent: g, cast: false });
  for (const bx of [-4.58, -3.96]) {
    box(0.06, 0.06, 0.06, darkMetal, { x: bx, y: 2.48, z: -3.05, parent: g, cast: false });
  }
  const norenMat = mats.toon('#ffffff', { map: A.noren, side: THREE.DoubleSide });
  plane(0.68, 0.44, norenMat, { x: -4.27, y: 2.27, z: -3.05, ry: 0.02, parent: g, cast: false, receive: true });

  // old timber door on the store wall, behind the curtain
  const door = box(0.05, 1.88, 0.6, mats.toon('#b9ab94', { map: A.wood }), {
    x: storeX - 0.025, y: floorY + 0.94, z: -3.3, parent: g,
  });
  addOutline(ctx, door, 0.01, '#1d1712');
  for (const fz of [-3.61, -2.99]) {
    box(0.05, 2.0, 0.055, frameMat, { x: storeX - 0.03, y: floorY + 0.98, z: fz, parent: g, cast: false });
  }
  box(0.05, 0.055, 0.68, frameMat, { x: storeX - 0.03, y: floorY + 2.0, z: -3.3, parent: g, cast: false });
  cyl(0.012, 0.012, 0.1, 6, mats.toon('#8f8a72'), { x: storeX - 0.06, y: 1.05, z: -3.1, parent: g, cast: false });
  box(0.24, 0.06, 0.7, mats.toon('#4d4d55'), { x: storeX - 0.12, y: floorY + 0.03, z: -3.3, parent: g, cast: false });

  // paper lantern under the neighbour eave, warm and low
  const lamp = chochin(ctx, g, { x: -4.36, y: 2.18, z: -2.9, tex: A.lantern, scale: 0.95, glow: true });
  box(0.05, 0.045, 0.34, darkMetal, { x: -4.47, y: 2.48, z: -2.9, parent: g, cast: false });
  cyl(0.008, 0.008, 0.16, 4, darkMetal, { x: -4.36, y: 2.4, z: -2.9, parent: g, cast: false });
  const lanternLight = new THREE.PointLight(new THREE.Color('#ffb877'), 0.8, 1.9, 2.0);
  lanternLight.position.set(-4.3, 2.0, -2.85);
  g.add(lanternLight);

  /* ---------------- weeds in the damp corner ---------------- */
  const rand = ctx.rng(52);
  const weedGeo = new THREE.ConeGeometry(0.03, 0.16, 4, 1);
  weedGeo.translate(0, 0.08, 0);
  const weedT = [];
  for (let i = 0; i < 8; i++) {
    weedT.push({
      x: nX + 0.06 + rand() * 0.1,
      y: floorY,
      z: -3.2 + rand() * 0.5,
      ry: rand() * 3,
      sx: 0.7 + rand() * 0.6,
    });
  }
  for (let i = 0; i < 4; i++) {
    weedT.push({
      x: nX + 0.06 + rand() * 0.1,
      y: floorY,
      z: 0.55 + rand() * 0.4,
      ry: rand() * 3,
      sx: 0.6 + rand() * 0.5,
    });
  }
  instanced(weedGeo, mats.toon('#2f4436'), weedT, { parent: g, cast: false, receive: true });

  // extra faint glow smeared under the lantern
  glowSprite(g, { x: -4.3, y: 1.86, z: -2.9, size: 0.9, color: '#ffb877', opacity: 0.16 });

  return g;
}
