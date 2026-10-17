/* Distant base-edge vignette: far traffic signal (handles exposed to Atmosphere),
   roadside utility cabinet, white pipe guardrail ends, a low mossy wall + hedge and
   weeds at the cut edge of the right / front of the diorama. Everything is small and
   far from the store, purely to give the sliced base edge depth. */
import * as THREE from 'three';
import { L } from '../../core/layout.js';
import { box, cyl, circle, group, plane, sphere, instanced, cylinderBetween } from '../../core/geom.js';
import { addOutline, glowSprite, weeds } from './parts.js';

export function buildBaseEdge(ctx, parent, A) {
  const { mats, refs } = ctx;
  const g = group('base-edge', parent);

  /* ================================================================ */
  /* 1. distant traffic signal at L.farSignal                          */
  /* ================================================================ */
  const F = L.farSignal; // {x:5.7, z:5.35, y:2.7}
  const sg = group('far-signal', g);

  const concrete = mats.toon('#5a5c64');
  const darkMetal = mats.toon('#3c3f47');
  const poleMat = mats.toon('#4c4f59');

  // small traffic island pad (kept inside the base inner edge)
  box(0.58, 0.09, 0.58, concrete, { x: 5.5, y: 0.055, z: 5.28, parent: sg, cast: false });
  box(0.6, 0.03, 0.6, mats.toon('#6a6c75'), { x: 5.5, y: 0.11, z: 5.28, parent: sg, cast: false });
  // pole
  const pole = cyl(0.045, 0.05, 2.95, 8, poleMat, { x: F.x, y: 1.575, z: F.z, parent: sg });
  cyl(0.09, 0.09, 0.09, 8, darkMetal, { x: F.x, y: 0.155, z: F.z, parent: sg, cast: false });
  cyl(0.028, 0.028, 0.09, 6, darkMetal, { x: F.x, y: 3.09, z: F.z, parent: sg, cast: false });

  // signal head, lenses facing the intersection (approx -x/-z)
  const headRy = -Math.PI * 0.75;
  const head = new THREE.Group();
  head.position.set(F.x, F.y, F.z);
  head.rotation.y = headRy;
  sg.add(head);
  const housingMat = mats.toon('#24262e');
  box(0.56, 0.17, 0.16, housingMat, { parent: head });
  box(0.6, 0.035, 0.2, mats.toon('#1b1d23'), { x: 0, y: 0.095, z: 0.01, parent: head, cast: false });
  box(0.56, 0.025, 0.17, mats.toon('#1b1d23'), { x: 0, y: -0.09, z: 0, parent: head, cast: false });
  // bracket connecting the head to the pole
  box(0.09, 0.09, 0.12, darkMetal, { x: 0, y: -0.11, z: -0.05, parent: head, cast: false });

  const redMat = new THREE.MeshBasicMaterial({ color: '#ff5146', toneMapped: false });
  const amberMat = new THREE.MeshBasicMaterial({ color: '#3a2c18', toneMapped: false });
  const greenMat = new THREE.MeshBasicMaterial({ color: '#14301f', toneMapped: false });
  const lensDefs = [
    { x: -0.17, mat: greenMat },
    { x: 0, mat: amberMat },
    { x: 0.17, mat: redMat },
  ];
  for (const d of lensDefs) {
    circle(0.052, 14, d.mat, { x: d.x, y: 0, z: 0.086, parent: head, cast: false, receive: false });
    box(0.125, 0.016, 0.085, mats.toon('#1b1d23'), { x: d.x, y: 0.072, z: 0.098, parent: head, cast: false });
  }

  // halo sprite, animated by Atmosphere through refs.farSignal
  const glowMap = A.signalGlow;
  const glowMat = new THREE.SpriteMaterial({
    map: glowMap,
    color: '#ff5146',
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    opacity: 0.5,
    fog: true,
  });
  const n = new THREE.Vector3(Math.sin(headRy), 0, Math.cos(headRy));
  const sprite = new THREE.Sprite(glowMat);
  sprite.position.set(F.x, F.y, F.z).addScaledVector(n, 0.17);
  sprite.scale.set(0.95, 0.95, 1);
  sg.add(sprite);

  const signalOn = { red: '#ff5146', amber: '#ffc45c', green: '#54f0c8' };
  const signalOff = { red: '#3a1512', amber: '#3a2c14', green: '#12301e' };
  const lensMats = { red: redMat, amber: amberMat, green: greenMat };
  function setState(state) {
    for (const k of ['red', 'amber', 'green']) {
      lensMats[k].color.set(k === state ? signalOn[k] : signalOff[k]);
    }
    glowMat.color.set(signalOn[state] ?? signalOn.red);
    sprite.scale.setScalar(state === 'green' ? 0.85 : 0.95);
    return state;
  }
  setState('red');

  // expose for the atmosphere module (documented in surroundings.js header)
  refs.farSignal = {
    group: sg,
    head,
    pole,
    redMat,
    amberMat,
    greenMat,
    glowMat,
    sprite,
    setState,
    state: 'red',
    onColors: signalOn,
    offColors: signalOff,
  };

  /* ================================================================ */
  /* 2. roadside utility cabinet                                       */
  /* ================================================================ */
  const ug = group('utility-cabinet', g);
  box(0.72, 0.08, 0.54, concrete, { x: 5.33, y: 0.06, z: 4.58, parent: ug, cast: false });
  const cab = box(0.5, 0.85, 0.3, mats.toon('#5d635d'), { x: 5.33, y: 0.53, z: 4.58, parent: ug });
  addOutline(ctx, cab, 0.012, '#191a20');
  box(0.52, 0.04, 0.32, mats.toon('#4a4f4b'), { x: 5.33, y: 0.965, z: 4.58, parent: ug, cast: false });
  box(0.012, 0.76, 0.02, mats.toon('#3c403d'), { x: 5.33, y: 0.53, z: 4.733, parent: ug, cast: false });
  const louver = [];
  for (let i = 0; i < 4; i++) louver.push({ x: 5.2, y: 0.72 + i * 0.05, z: 4.733, sx: 0.18, sy: 0.018, sz: 0.02 });
  instanced(new THREE.BoxGeometry(1, 1, 1), mats.toon('#3c403d'), louver, { parent: ug, cast: false, receive: false });
  plane(0.13, 0.17, new THREE.MeshBasicMaterial({ map: A.notices[1], toneMapped: true }), {
    x: 5.43, y: 0.72, z: 4.734, parent: ug, cast: false, receive: false,
  });
  cylinderBetween(new THREE.Vector3(5.22, 0.12, 4.5), new THREE.Vector3(5.16, 0.02, 4.44), 0.022, darkMetal, { parent: ug, cast: false });
  cylinderBetween(new THREE.Vector3(5.42, 0.12, 4.5), new THREE.Vector3(5.48, 0.02, 4.44), 0.018, darkMetal, { parent: ug, cast: false });

  /* ================================================================ */
  /* 3. white pipe guardrail ends at the cut edge                      */
  /* ================================================================ */
  const railMat = mats.toon('#c7c2b2');
  const railMetal = mats.toon('#8f8b80');
  const postGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.74, 6);
  const postT = [
    { x: 3.55, y: 0.39, z: 5.68 }, { x: 4.05, y: 0.39, z: 5.68 }, { x: 4.55, y: 0.39, z: 5.68 },
    { x: 5.68, y: 0.39, z: 2.75 }, { x: 5.68, y: 0.39, z: 3.35 }, { x: 5.68, y: 0.39, z: 3.95 },
  ];
  instanced(postGeo, railMat, postT, { parent: g, cast: false, receive: false });
  // run A (parallel to the main street, past the zebra crossing)
  cyl(0.028, 0.028, 1.1, 6, railMat, { x: 4.05, y: 0.72, z: 5.68, rz: Math.PI / 2, parent: g, cast: false });
  cyl(0.024, 0.024, 1.1, 6, railMat, { x: 4.05, y: 0.44, z: 5.68, rz: Math.PI / 2, parent: g, cast: false });
  // run B (parallel to the side street, near the right cut edge)
  cyl(0.028, 0.028, 1.25, 6, railMat, { x: 5.68, y: 0.72, z: 3.35, rx: Math.PI / 2, parent: g, cast: false });
  cyl(0.024, 0.024, 1.25, 6, railMat, { x: 5.68, y: 0.44, z: 3.35, rx: Math.PI / 2, parent: g, cast: false });
  // end caps + reflectors
  const capGeo = new THREE.SphereGeometry(0.042, 8, 6);
  instanced(capGeo, railMat, [
    { x: 3.48, y: 0.72, z: 5.68 }, { x: 4.62, y: 0.72, z: 5.68 },
    { x: 5.68, y: 0.72, z: 2.67 }, { x: 5.68, y: 0.72, z: 3.98 },
  ], { parent: g, cast: false, receive: false });
  const reflMat = new THREE.MeshBasicMaterial({ color: '#e8ecf2', toneMapped: false });
  box(0.02, 0.07, 0.055, reflMat, { x: 4.62, y: 0.61, z: 5.68, parent: g, cast: false, receive: false });
  box(0.055, 0.07, 0.02, reflMat, { x: 5.68, y: 0.61, z: 2.67, parent: g, cast: false, receive: false });

  /* ================================================================ */
  /* 4. low mossy wall + hedge + weeds at the front / right cut edge   */
  /* ================================================================ */
  const wallMat = mats.toon('#55575f');
  const wallTop = mats.toon('#6b6d75');
  const hedgeMat = mats.toon('#2c4033');
  const hedgeHi = mats.toon('#3a5340');

  // front edge planter wall (starts past the guardrail end)
  box(0.85, 0.2, 0.14, wallMat, { x: 5.27, y: 0.12, z: 5.72, parent: g, cast: false });
  box(0.87, 0.035, 0.16, wallTop, { x: 5.27, y: 0.235, z: 5.72, parent: g, cast: false });
  box(0.52, 0.26, 0.17, hedgeMat, { x: 5.16, y: 0.39, z: 5.7, parent: g, cast: false });
  box(0.28, 0.22, 0.16, hedgeHi, { x: 5.52, y: 0.37, z: 5.7, parent: g, cast: false });
  box(0.24, 0.18, 0.15, hedgeMat, { x: 4.9, y: 0.35, z: 5.69, parent: g, cast: false });
  // right edge low wall
  box(0.14, 0.18, 0.85, wallMat, { x: 5.72, y: 0.11, z: 4.58, parent: g, cast: false });
  box(0.16, 0.03, 0.87, wallTop, { x: 5.72, y: 0.215, z: 4.58, parent: g, cast: false });
  box(0.15, 0.22, 0.4, hedgeMat, { x: 5.7, y: 0.34, z: 4.42, parent: g, cast: false });

  // weeds pushing through the kerb / island cracks
  const rand = ctx.rng(77);
  const weedT = [];
  for (let i = 0; i < 16; i++) {
    weedT.push({ x: 4.8 + rand() * 1.0, y: 0.02, z: 5.62 + rand() * 0.14, ry: rand() * 3, sx: 0.6 + rand() * 0.7 });
  }
  for (let i = 0; i < 10; i++) {
    weedT.push({ x: 5.6 + rand() * 0.16, y: 0.02, z: 2.5 + rand() * 1.9, ry: rand() * 3, sx: 0.6 + rand() * 0.6 });
  }
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2;
    const rr = 0.42 + rand() * 0.22;
    weedT.push({
      x: Math.min(5.78, F.x - 0.2 + Math.cos(a) * rr),
      y: 0.02,
      z: Math.min(5.78, F.z - 0.07 + Math.sin(a) * rr),
      ry: rand() * 3,
      sx: 0.5 + rand() * 0.5,
    });
  }
  weeds(ctx, g, weedT, 0.02);

  // scattered wet leaves near the cabinet (cheap flat scraps)
  const leafMat = mats.toon('#2d4b44', { side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    plane(0.09, 0.06, leafMat, {
      x: 4.95 + rand() * 0.7, y: 0.028, z: 4.3 + rand() * 0.5, ry: rand() * 3, ground: true,
      parent: g, cast: false, receive: false,
    });
  }

  return g;
}
