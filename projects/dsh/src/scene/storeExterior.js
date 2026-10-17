import * as THREE from 'three';
import { C, FONT } from '../core/palette.js';
import { L } from '../core/layout.js';
import { box, circle, cyl, group, plane, rounded, sphere, textPlane } from '../core/geom.js';
import {
  canvas2d, drawText, martSignTexture, martVerticalTexture, posterTexture, rng, storeFloorTexture,
  ceilingTexture, tex, windowDecalTexture, glowSpriteTexture, concreteTexture,
} from '../core/textures.js';

function glassStreak() {
  const { c, ctx } = canvas2d(512, 512);
  const rand = rng(99);
  ctx.clearRect(0, 0, 512, 512);
  // soft diagonal window reflections
  for (let i = 0; i < 7; i++) {
    const x = rand() * 512;
    const g = ctx.createLinearGradient(x, 0, x + 150, 512);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.45, `rgba(210,235,255,${0.03 + rand() * 0.05})`);
    g.addColorStop(0.55, `rgba(240,250,255,${0.05 + rand() * 0.06})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 150 + rand() * 100, 512);
  }
  // tiny droplets
  for (let i = 0; i < 130; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 0.8 + rand() * 2.6;
    ctx.fillStyle = `rgba(225,242,255,${0.16 + rand() * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (1 + rand()), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return tex(c);
}

export function buildStoreExterior(ctx) {
  const { root, mats, refs } = ctx;
  const S = L.store;
  const g = group('store-exterior', root);
  refs.signs = [];
  refs.glassPanes = [];
  refs.interiorLights = [];

  const wallMat = mats.toon('#b3a792');
  const wallInner = mats.toon('#f5ecd9');
  const trimMat = mats.toon(C.storeTrim);
  const teal = mats.toon(C.storeTeal);
  const tealDark = mats.toon(C.storeTealDark);
  const orange = mats.toon(C.storeOrange);
  const darkMetal = mats.toon(C.metalDark);
  const metal = mats.toon(C.metal);
  const black = mats.toon('#191b22');

  const add = (m, o) => {
    if (o?.outline) ctx.outline(m, o.outlineThickness ?? 0.016, o.outlineColor ?? '#1a1822');
    return m;
  };

  /* ------------------------------------------------------------------ */
  /* shell walls                                                         */
  /* ------------------------------------------------------------------ */
  const wallH = S.wallH;
  const back = add(box(S.x1 - S.x0, wallH, 0.12, wallMat, { x: (S.x0 + S.x1) / 2, y: wallH / 2, z: S.z0 + 0.06, parent: g, outline: true }));
  const left = add(box(0.12, wallH, S.z1 - S.z0, wallMat, { x: S.x0 + 0.06, y: wallH / 2, z: (S.z0 + S.z1) / 2, parent: g, outline: true }));
  // right wall is solid behind the side glazing
  add(box(0.12, wallH, -1.12 - S.z0, wallMat, { x: S.x1 - 0.06, y: wallH / 2, z: (S.z0 - 1.12) / 2, parent: g, outline: true }));
  // right / front facade above glazing
  add(box(0.12, 0.99, S.z1 - (-1.12), wallMat, { x: S.x1 - 0.06, y: S.glassTop + 0.495, z: (S.z1 + -1.12) / 2, parent: g, outline: true }));
  add(box(S.x1 - S.x0, 0.99, 0.12, wallMat, { x: (S.x0 + S.x1) / 2, y: S.glassTop + 0.495, z: S.z1 - 0.06, parent: g, outline: true }));

  // corner columns / mullion piers
  const colMat = mats.toon(C.storeTrim);
  add(box(0.15, wallH, 0.15, colMat, { x: S.x0 + 0.075, y: wallH / 2, z: S.z1 - 0.075, parent: g, outline: true }));
  add(box(0.26, wallH, 0.16, colMat, { x: S.x1 - 0.13, y: wallH / 2, z: S.z1 - 0.08, parent: g, outline: true }));
  add(box(0.12, wallH, 0.15, colMat, { x: -0.12, y: wallH / 2, z: S.z1 - 0.075, parent: g, outline: true }));
  add(box(0.16, wallH, 0.18, colMat, { x: S.x1 - 0.08, y: wallH / 2, z: 0.9, parent: g, outline: true }));

  // dark skirting band
  const skirtMat = mats.toon('#3f424b');
  box(S.x1 - S.x0 + 0.03, 0.2, 0.04, skirtMat, { x: (S.x0 + S.x1) / 2, y: 0.1, z: S.z1 + 0.015, cast: false, parent: g });
  box(0.04, 0.2, S.z1 - S.z0, skirtMat, { x: S.x1 + 0.015, y: 0.1, z: (S.z0 + S.z1) / 2, cast: false, parent: g });
  box(S.x1 - S.x0, 0.2, 0.04, skirtMat, { x: (S.x0 + S.x1) / 2, y: 0.1, z: S.z0 - 0.015, cast: false, parent: g });
  box(0.04, 0.2, S.z1 - S.z0, skirtMat, { x: S.x0 - 0.015, y: 0.1, z: (S.z0 + S.z1) / 2, cast: false, parent: g });

  // subtle facade seams + teal/orange trim lines
  const seamMat = mats.toon('#cfc5b0');
  for (let i = 0; i < 4; i++) {
    const x = S.x0 + 1.05 + i * 1.05;
    box(0.018, 0.7, 0.012, seamMat, { x, y: 3.0, z: S.z1 + 0.062, cast: false, parent: g });
  }
  const glassNeonT = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.32, 1.3, 1.2), toneMapped: false });
  const glassNeonO = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.45, 0.62, 0.25), toneMapped: false });
  box(S.x1 - S.x0, 0.035, 0.03, glassNeonT, { x: (S.x0 + S.x1) / 2, y: 2.58, z: S.z1 + 0.02, cast: false, parent: g });
  box(S.x1 - S.x0, 0.02, 0.03, glassNeonO, { x: (S.x0 + S.x1) / 2, y: 2.545, z: S.z1 + 0.02, cast: false, parent: g });
  box(0.03, 0.035, S.z1 - S.z0, teal, { x: S.x1 + 0.02, y: 2.58, z: (S.z0 + S.z1) / 2, cast: false, parent: g });

  /* ------------------------------------------------------------------ */
  /* interior shell surfaces                                             */
  /* ------------------------------------------------------------------ */
  const floorTex = storeFloorTexture();
  const floorMat = mats.toon('#ffffff', { map: floorTex });
  const floor = box(S.x1 - S.x0 - 0.22, 0.1, S.z1 - S.z0 - 0.18, floorMat, {
    x: (S.x0 + S.x1) / 2, y: S.floorY - 0.05, z: (S.z0 + S.z1) / 2, cast: false, receive: true, parent: g,
  });
  floor.name = 'store-floor';
  // floor guide lines and arrows (subtle teal)
  const guide = mats.toon('#3f9f96');
  box(0.06, 0.006, 4.1, guide, { x: -0.55, y: S.floorY + 0.004, z: -1.25, cast: false, parent: g });
  box(2.6, 0.006, 0.06, guide, { x: -1.85, y: S.floorY + 0.004, z: -0.35, cast: false, parent: g });
  box(1.3, 0.006, 0.05, guide, { x: 0.55, y: S.floorY + 0.004, z: 0.42, cast: false, parent: g });
  // welcome arrow near door
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0.16);
  arrowShape.lineTo(0.18, 0);
  arrowShape.lineTo(0.06, 0);
  arrowShape.lineTo(0.06, -0.2);
  arrowShape.lineTo(-0.06, -0.2);
  arrowShape.lineTo(-0.06, 0);
  arrowShape.lineTo(-0.18, 0);
  arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  const arrow = new THREE.Mesh(arrowGeo, mats.toon('#3f9f96'));
  arrow.rotation.x = -Math.PI / 2;
  arrow.rotation.z = Math.PI;
  arrow.position.set(0.55, S.floorY + 0.006, 0.55);
  arrow.castShadow = false;
  arrow.receiveShadow = true;
  g.add(arrow);

  const ceilTex = ceilingTexture();
  const ceilMat = mats.toon('#ffffff', { map: ceilTex });
  box(S.x1 - S.x0 - 0.2, 0.1, S.z1 - S.z0 - 0.16, ceilMat, {
    x: (S.x0 + S.x1) / 2, y: S.ceilY + 0.05, z: (S.z0 + S.z1) / 2, cast: false, receive: true, parent: g,
  });
  // wall linings
  add(box(S.x1 - S.x0 - 0.24, S.ceilY - S.floorY, 0.06, wallInner, { x: (S.x0 + S.x1) / 2, y: (S.ceilY + S.floorY) / 2, z: S.z0 + 0.15, cast: false, parent: g }));
  add(box(0.06, S.ceilY - S.floorY, S.z1 - S.z0 - 0.2, wallInner, { x: S.x0 + 0.18, y: (S.ceilY + S.floorY) / 2, z: (S.z0 + S.z1) / 2, cast: false, parent: g }));
  add(box(0.06, S.ceilY - S.floorY, -1.12 - S.z0, wallInner, { x: S.x1 - 0.18, y: (S.ceilY + S.floorY) / 2, z: (S.z0 - 1.12) / 2, cast: false, parent: g }));
  // interior teal waist band
  const wain = mats.toon(C.interiorWainscot);
  box(S.x1 - S.x0 - 0.3, 0.65, 0.02, wain, { x: (S.x0 + S.x1) / 2, y: 0.56, z: S.z0 + 0.19, cast: false, parent: g });
  box(0.02, 0.65, S.z1 - S.z0 - 0.24, wain, { x: S.x0 + 0.22, y: 0.56, z: (S.z0 + S.z1) / 2, cast: false, parent: g });
  box(0.02, 0.65, -1.12 - S.z0, wain, { x: S.x1 - 0.22, y: 0.56, z: (S.z0 - 1.12) / 2, cast: false, parent: g });

  // ceiling light boxes
  const lightPanelMat = new THREE.MeshBasicMaterial({ color: '#ffbd76', toneMapped: false });
  lightPanelMat.color.multiplyScalar(1.28);
  const panelFrame = mats.toon('#d8d0bf');
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const x = -2.55 + col * 1.65;
      const z = -2.35 + row * 2.15;
      box(1.18, 0.035, 0.34, panelFrame, { x, y: S.ceilY - 0.025, z, cast: false, parent: g });
      box(1.06, 0.02, 0.26, lightPanelMat, { x, y: S.ceilY - 0.045, z, cast: false, receive: false, parent: g });
    }
  }
  // air vents and speakers
  box(0.55, 0.06, 0.55, mats.toon('#d9d5c9'), { x: 0.85, y: S.ceilY - 0.04, z: -1.0, cast: false, parent: g });
  for (const p of [
    { x: -1.4, y: 2.42, z: 0.25, i: 11, c: '#ffd9a4' },
    { x: -1.5, y: 2.42, z: -2.0, i: 13, c: '#ffd9a4' },
    { x: 0.45, y: 2.4, z: -2.8, i: 8, c: '#ffe3b6' },
  ]) {
    const pl = new THREE.PointLight(new THREE.Color(p.c), p.i * 0.24, 3.4, 2.0);
    pl.position.set(p.x, p.y, p.z);
    g.add(pl);
    refs.interiorLights.push(pl);
  }
  // cool glow from the drinks wall for depth
  const fridgeGlow = new THREE.PointLight(new THREE.Color('#cfeaff'), 2.2, 3.2, 2.0);
  fridgeGlow.position.set(-1.0, 1.45, -3.05);
  g.add(fridgeGlow);
  refs.fridgeGlow = fridgeGlow;

  // back room door (interior)
  const doorMat = mats.toon('#8d949b');
  box(0.82, 2.16, 0.06, doorMat, { x: -3.1, y: S.floorY + 1.08, z: S.z0 + 0.2, cast: false, parent: g });
  ctx.outline(g.children[g.children.length - 1], 0.012, '#3a3b42');
  box(0.5, 0.3, 0.02, mats.glass({ opacity: 0.3 }), { x: -3.1, y: 1.72, z: S.z0 + 0.235, cast: false, parent: g });
  const exitMat = new THREE.MeshBasicMaterial({ color: '#8ff0c4', toneMapped: false });
  box(0.28, 0.09, 0.03, exitMat, { x: -3.1, y: 2.42, z: S.z0 + 0.24, cast: false, receive: false, parent: g });

  /* ------------------------------------------------------------------ */
  /* front glazing                                                       */
  /* ------------------------------------------------------------------ */
  const glassSide = THREE.FrontSide;
  const glassMat = mats.glass({ opacity: 0.022, side: glassSide });
  const streakTex = glassStreak();
  const addGlassPane = (w, h, x, y, z, ry = 0) => {
    const pane = plane(w, h, glassMat, { x, y, z, ry, cast: false, receive: false, parent: g });
    pane.renderOrder = 6;
    const streak = plane(w, h, new THREE.MeshBasicMaterial({
      map: streakTex,
      transparent: true,
      opacity: 0.035,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      fog: true,
    }), { x, y, z: z + (ry === 0 ? 0.003 : 0), ry, cast: false, receive: false, parent: g });
    if (ry !== 0) {
      streak.position.x = x + 0.003;
      streak.position.z = z;
    }
    streak.renderOrder = 7;
    return pane;
  };

  // front fixed glazing, 4 bays
  const fx0 = -3.78;
  const fx1 = -0.2;
  addGlassPane(fx1 - fx0, S.glassTop - S.glassBottom, (fx0 + fx1) / 2, (S.glassTop + S.glassBottom) / 2, S.z1 - 0.015);
  refs.glassPanes.push({ type: 'front', x0: fx0, x1: fx1, z: S.z1 - 0.015, y0: S.glassBottom, y1: S.glassTop });
  // mullions
  const mullionMat = mats.toon('#6d7077');
  const bays = 4;
  for (let i = 0; i <= bays; i++) {
    const x = fx0 + ((fx1 - fx0) / bays) * i;
    box(0.05, S.glassTop - S.glassBottom, 0.1, mullionMat, { x, y: (S.glassTop + S.glassBottom) / 2, z: S.z1 - 0.03, parent: g });
  }
  // transom + sill
  box(fx1 - fx0 + 0.1, 0.055, 0.11, mullionMat, { x: (fx0 + fx1) / 2, y: 2.02, z: S.z1 - 0.03, parent: g });
  box(fx1 - fx0 + 0.1, 0.07, 0.12, mullionMat, { x: (fx0 + fx1) / 2, y: S.glassBottom + 0.02, z: S.z1 - 0.03, parent: g });
  box(fx1 - fx0 + 0.1, 0.08, 0.12, mullionMat, { x: (fx0 + fx1) / 2, y: S.glassTop - 0.02, z: S.z1 - 0.03, parent: g });

  // side fixed glazing
  const sz0 = S.sideGlass.z0;
  const sz1 = S.sideGlass.z1;
  const sidePanes = 3;
  for (let i = 0; i < sidePanes; i++) {
    const za = sz0 + ((sz1 - sz0) / sidePanes) * i;
    const zb = sz0 + ((sz1 - sz0) / sidePanes) * (i + 1);
    addGlassPane(zb - za - 0.06, S.glassTop - S.glassBottom, S.x1 - 0.015, (S.glassTop + S.glassBottom) / 2, (za + zb) / 2, Math.PI / 2);
    refs.glassPanes.push({ type: 'side', z0: za, z1: zb, x: S.x1 - 0.015, y0: S.glassBottom, y1: S.glassTop });
  }
  for (let i = 0; i <= sidePanes; i++) {
    const z = sz0 + ((sz1 - sz0) / sidePanes) * i;
    box(0.1, S.glassTop - S.glassBottom, 0.05, mullionMat, { x: S.x1 - 0.03, y: (S.glassTop + S.glassBottom) / 2, z, parent: g });
  }
  box(0.11, 0.055, sz1 - sz0, mullionMat, { x: S.x1 - 0.03, y: 2.02, z: (sz0 + sz1) / 2, parent: g });
  box(0.12, 0.07, sz1 - sz0, mullionMat, { x: S.x1 - 0.03, y: S.glassBottom + 0.02, z: (sz0 + sz1) / 2, parent: g });
  box(0.12, 0.08, sz1 - sz0, mullionMat, { x: S.x1 - 0.03, y: S.glassTop - 0.02, z: (sz0 + sz1) / 2, parent: g });

  // window decal strip
  const decalTex = windowDecalTexture();
  const decal = plane(2.3, 0.36, new THREE.MeshBasicMaterial({
    map: decalTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.9,
  }), { x: -2.1, y: 2.3, z: S.z1 + 0.015, cast: false, receive: false, parent: g });
  decal.renderOrder = 8;

  /* ------------------------------------------------------------------ */
  /* automatic sliding door                                             */
  /* ------------------------------------------------------------------ */
  const doorX0 = S.door.x0;
  const doorX1 = S.door.x1;
  const doorW = (doorX1 - doorX0) / 2;
  const doorH = S.glassTop - S.glassBottom;
  const makeDoorPanel = (side) => {
    const dg = group(`door-panel-${side}`, g);
    const frameMat = mats.toon('#cfcac0');
    const panelW = doorW - 0.015;
    // frame
    box(panelW, 0.06, 0.045, frameMat, { x: 0, y: doorH / 2 - 0.03, z: 0, parent: dg });
    box(panelW, 0.09, 0.045, frameMat, { x: 0, y: -doorH / 2 + 0.045, z: 0, parent: dg });
    box(0.05, doorH, 0.045, frameMat, { x: -panelW / 2 + 0.025, y: 0, z: 0, parent: dg });
    box(0.05, doorH, 0.045, frameMat, { x: panelW / 2 - 0.025, y: 0, z: 0, parent: dg });
    const pane = plane(panelW - 0.08, doorH - 0.13, glassMat, { x: 0, y: -0.01, z: 0.01, cast: false, receive: false, parent: dg });
    pane.renderOrder = 6;
    const streak = plane(panelW - 0.08, doorH - 0.13, new THREE.MeshBasicMaterial({
      map: streakTex, transparent: true, opacity: 0.03, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }), { x: 0, y: -0.01, z: 0.014, cast: false, receive: false, parent: dg });
    streak.renderOrder = 7;
    // vertical pull handle
    box(0.025, 0.55, 0.06, metal, { x: side === 'left' ? panelW / 2 - 0.09 : -panelW / 2 + 0.09, y: 0.02, z: 0.04, parent: dg });
    // subtle safety sticker
    const stickerMat = new THREE.MeshBasicMaterial({ color: '#f7f2dc', transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false });
    plane(0.15, 0.42, stickerMat, { x: 0, y: 0.1, z: 0.02, cast: false, receive: false, parent: dg }).renderOrder = 8;
    return dg;
  };
  const doorLeft = makeDoorPanel('left');
  const doorRight = makeDoorPanel('right');
  const doorY = (S.glassTop + S.glassBottom) / 2;
  doorLeft.position.set(doorX0 + doorW / 2, doorY, S.z1 - 0.01);
  doorRight.position.set(doorX1 - doorW / 2, doorY, S.z1 + 0.02);
  doorRight.position.z = S.z1 + 0.045;
  refs.doors = {
    left: doorLeft,
    right: doorRight,
    closedLeft: doorX0 + doorW / 2,
    closedRight: doorX1 - doorW / 2,
    openAmount: 0.5,
  };
  // door track + sensor
  box(doorX1 - doorX0 + 0.08, 0.06, 0.12, mullionMat, { x: (doorX0 + doorX1) / 2, y: S.glassTop + 0.01, z: S.z1 - 0.01, parent: g });
  box(0.22, 0.08, 0.1, mats.toon('#2f323a'), { x: (doorX0 + doorX1) / 2, y: S.glassTop + 0.12, z: S.z1 - 0.02, parent: g });
  const sensorMat = new THREE.MeshBasicMaterial({ color: '#ff7a6a', toneMapped: false });
  box(0.045, 0.025, 0.02, sensorMat, { x: (doorX0 + doorX1) / 2 + 0.05, y: S.glassTop + 0.12, z: S.z1 + 0.031, parent: g });
  // threshold
  box(doorX1 - doorX0, 0.025, 0.16, mats.toon('#b7b4a9'), { x: (doorX0 + doorX1) / 2, y: S.floorY + 0.01, z: S.z1 - 0.04, parent: g });
  // door decal
  textPlane(new THREE.CanvasTexture((() => {
    const { c, ctx: cx } = canvas2d(512, 128);
    cx.clearRect(0, 0, 512, 128);
    drawText(cx, '自動ドア', 256, 64, { family: FONT.jp, size: 48, color: 'rgba(255,250,235,0.85)' });
    return c;
  })()), 0.7, 0.18, { x: 0.78, y: 1.28, z: S.z1 + 0.05, cast: false, receive: false, parent: g }).renderOrder = 9;

  // warm light spilling from the shop onto the wet sidewalk
  const spillTex = glowSpriteTexture({ size: 256, inner: 'rgba(255,222,168,0.45)', mid: 'rgba(255,190,110,0.12)' });
  const spillMat = new THREE.MeshBasicMaterial({
    map: spillTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    toneMapped: false, opacity: 0.5, fog: true,
  });
  for (const sx of [-3.1, -1.55, 0.62]) {
    const pool = plane(2.5, 1.45, spillMat, { x: sx, y: 0.152, z: 1.72, ground: true, cast: false, receive: false, parent: g });
    pool.rotation.z = 0.12;
  }
  const sideSpill = plane(1.5, 1.7, spillMat, { x: 1.88, y: 0.152, z: 0.15, ground: true, cast: false, receive: false, parent: g });
  sideSpill.rotation.z = 1.2;

  // doormat
  const matTex = (() => {
    const { c, ctx: cx } = canvas2d(512, 256);
    cx.fillStyle = '#3b3138';
    cx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 700; i++) {
      cx.fillStyle = `rgba(120,100,100,${Math.random() * 0.12})`;
      cx.fillRect(Math.random() * 512, Math.random() * 256, 2, 1);
    }
    cx.strokeStyle = '#b08a6a';
    cx.lineWidth = 6;
    cx.strokeRect(14, 14, 484, 228);
    drawText(cx, 'WELCOME', 256, 108, { family: FONT.latin, size: 54, color: '#cdb795', letterSpacing: 6 });
    drawText(cx, 'ひかりマート', 256, 174, { family: FONT.jp, size: 34, color: '#a98a6c' });
    return tex(c);
  })();
  const doormat = plane(1.12, 0.55, mats.toon('#ffffff', { map: matTex }), {
    x: (S.door.x0 + S.door.x1) / 2, y: 0.152, z: 1.34, ground: true, cast: false, receive: true, parent: g,
  });
  doormat.name = 'doormat';

  /* ------------------------------------------------------------------ */
  /* main signage                                                        */
  /* ------------------------------------------------------------------ */
  const signBackMat = mats.toon('#f4eeda');
  const signMatFront = new THREE.MeshBasicMaterial({
    map: martSignTexture({ w: 2048, h: 384 }), toneMapped: false, color: new THREE.Color(1.28, 1.24, 1.15),
  });
  refs.signs.push({ mat: signMatFront, base: new THREE.Color(1, 1, 1), flicker: 0.08, name: 'sign-front' });
  // front lightbox body
  add(box(4.92, 0.84, 0.2, signBackMat, { x: -1.26, y: 3.03, z: S.z1 + 0.06, parent: g, outline: true }));
  const signFace = plane(4.82, 0.74, signMatFront, { x: -1.26, y: 3.03, z: S.z1 + 0.161, cast: false, receive: false, parent: g });
  signFace.name = 'sign-front-face';
  // sign frame
  const signFrame = mats.toon('#8f8b7e');
  box(4.98, 0.05, 0.22, signFrame, { x: -1.26, y: 3.46, z: S.z1 + 0.06, parent: g });
  box(4.98, 0.05, 0.22, signFrame, { x: -1.26, y: 2.6, z: S.z1 + 0.06, parent: g });

  // side sign
  const signMatSide = new THREE.MeshBasicMaterial({
    map: martSignTexture({ w: 1024, h: 256 }), toneMapped: false, color: new THREE.Color(1.22, 1.18, 1.1),
  });
  refs.signs.push({ mat: signMatSide, base: new THREE.Color(1, 1, 1), flicker: 0.06, name: 'sign-side' });
  add(box(0.2, 0.8, 1.98, signBackMat, { x: S.x1 + 0.02, y: 3.03, z: 0.0, parent: g, outline: true }));
  plane(1.9, 0.62, signMatSide, { x: S.x1 + 0.121, y: 3.03, z: 0.0, ry: Math.PI / 2, cast: false, receive: false, parent: g }).name = 'sign-side-face';
  box(0.22, 0.05, 2.04, signFrame, { x: S.x1 + 0.02, y: 3.46, z: 0, parent: g });
  box(0.22, 0.05, 2.04, signFrame, { x: S.x1 + 0.02, y: 2.6, z: 0, parent: g });

  // projecting vertical blade sign at the corner
  const bladeFrame = mats.toon('#f3eddc');
  const vTex = martVerticalTexture({ w: 320, h: 1024 });
  add(box(0.4, 1.5, 0.18, bladeFrame, { x: 1.7, y: 3.62, z: 1.02, parent: g, outline: true }));
  const bladeFrontMat = new THREE.MeshBasicMaterial({ map: vTex, toneMapped: false, side: THREE.FrontSide, color: new THREE.Color(1.55, 1.5, 1.35) });
  const bladeBackMat = new THREE.MeshBasicMaterial({ map: vTex, toneMapped: false, side: THREE.FrontSide, color: new THREE.Color(1.55, 1.5, 1.35) });
  refs.signs.push({ mat: bladeFrontMat, base: new THREE.Color(1, 1, 1), flicker: 0.18, name: 'sign-blade-front' });
  refs.signs.push({ mat: bladeBackMat, base: new THREE.Color(1, 1, 1), flicker: 0.16, name: 'sign-blade-back' });
  plane(0.32, 1.4, bladeFrontMat, { x: 1.7, y: 3.62, z: 1.112, cast: false, receive: false, parent: g }).renderOrder = 5;
  plane(0.32, 1.4, bladeBackMat, { x: 1.7, y: 3.62, z: 0.928, ry: Math.PI, cast: false, receive: false, parent: g }).renderOrder = 5;
  // brackets
  for (const y of [3.0, 4.24]) {
    cyl(0.025, 0.025, 0.46, 8, metal, { x: 1.48, y, z: 1.02, rz: Math.PI / 2, parent: g });
  }
  // small spot for the blade sign
  const bladeLight = new THREE.PointLight(new THREE.Color('#ffe2b0'), 2.2, 2.6, 2);
  bladeLight.position.set(1.72, 3.7, 1.35);
  g.add(bladeLight);

  // storefront sale banners hanging under the awning
  const bannerData = [
    { x: -3.25, tex: posterTexture({ kind: 'onigiri', seed: 21 }), w: 0.5, h: 0.75 },
    { x: -2.55, tex: posterTexture({ kind: 'coffee', seed: 22 }), w: 0.5, h: 0.75 },
  ];
  for (const b of bannerData) {
    const banner = plane(b.w, b.h, new THREE.MeshBasicMaterial({
      map: b.tex, toneMapped: false, side: THREE.DoubleSide,
    }), { x: b.x, y: 2.14, z: 1.62, cast: false, receive: false, parent: g });
    cyl(0.012, 0.012, b.w + 0.08, 6, metal, { x: b.x, y: 2.52, z: 1.62, rz: Math.PI / 2, parent: g });
    cyl(0.012, 0.012, b.w + 0.08, 6, metal, { x: b.x, y: 1.76, z: 1.62, rz: Math.PI / 2, parent: g });
  }

  /* ------------------------------------------------------------------ */
  /* awning                                                              */
  /* ------------------------------------------------------------------ */
  const awn = group('awning', g);
  const awnMat = mats.toon('#e6dcc8');
  const awnRoof = box(5.1, 0.075, 1.02, awnMat, { x: -1.26, y: 2.57, z: 1.52, parent: awn });
  awnRoof.rotation.x = -0.055;
  ctx.outline(awnRoof, 0.02, '#2a2630');
  // fascia stripe
  box(5.14, 0.12, 0.05, teal, { x: -1.26, y: 2.505, z: 2.02, parent: awn });
  box(5.14, 0.03, 0.05, orange, { x: -1.26, y: 2.44, z: 2.025, parent: awn });
  // under-awning light strip
  const ledMat = new THREE.MeshBasicMaterial({ color: '#ffe9bd', toneMapped: false });
  const neonTeal = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 1.55, 1.45), toneMapped: false });
  const neonOrange = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 0.78, 0.32), toneMapped: false });
  box(5.16, 0.018, 0.02, neonTeal, { x: -1.26, y: 2.43, z: 2.032, cast: false, receive: false, parent: awn });
  box(5.16, 0.012, 0.02, neonOrange, { x: -1.26, y: 2.408, z: 2.032, cast: false, receive: false, parent: awn });
  box(4.9, 0.012, 0.02, neonTeal, { x: -1.26, y: 3.45, z: S.z1 + 0.18, cast: false, receive: false, parent: g });
  box(0.012, 1.5, 0.02, neonOrange, { x: 1.7, y: 3.62, z: 1.12, cast: false, receive: false, parent: g });
  box(4.7, 0.02, 0.05, ledMat, { x: -1.26, y: 2.505, z: 1.75, cast: false, receive: false, parent: awn });
  // small round lights
  for (let i = 0; i < 3; i++) {
    const x = -3.2 + i * 1.8;
    cyl(0.055, 0.065, 0.06, 12, mats.toon('#f4efdf'), { x, y: 2.505, z: 1.52, parent: awn });
    cyl(0.035, 0.035, 0.02, 10, ledMat, { x, y: 2.47, z: 1.52, cast: false, parent: awn });
  }
  // support rods
  for (const x of [-3.7, -1.26, 1.05]) {
    const a = new THREE.Vector3(x, 3.28, 1.015);
    const b = new THREE.Vector3(x, 2.53, 1.98);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, a.distanceTo(b), 6), metal);
    bar.position.copy(a).add(b).multiplyScalar(0.5);
    bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    bar.castShadow = true;
    awn.add(bar);
  }

  // side awning (smaller)
  const sideAwn = box(0.92, 0.06, 2.1, awnMat, { x: 1.78, y: 2.57, z: -0.12, parent: g });
  sideAwn.rotation.z = 0.04;
  box(0.05, 0.1, 2.14, teal, { x: 2.23, y: 2.51, z: -0.12, parent: g });
  const ledSide = new THREE.MeshBasicMaterial({ color: '#ffe9bd', toneMapped: false });
  box(0.04, 0.02, 1.95, ledSide, { x: 2.05, y: 2.525, z: -0.12, cast: false, parent: g });

  /* ------------------------------------------------------------------ */
  /* roof + parapet                                                      */
  /* ------------------------------------------------------------------ */
  add(box(5.5, 0.18, 4.88, wallMat, { x: -1.26, y: 3.64, z: -1.27, parent: g, outline: true }));
  const cap = mats.toon('#5d5e67');
  // parapets
  add(box(5.5, 0.22, 0.1, wallMat, { x: -1.26, y: 3.84, z: -3.66, parent: g }));
  add(box(5.5, 0.22, 0.1, wallMat, { x: -1.26, y: 3.84, z: 1.14, parent: g }));
  add(box(0.1, 0.22, 4.88, wallMat, { x: -3.96, y: 3.84, z: -1.27, parent: g }));
  add(box(0.1, 0.22, 4.88, wallMat, { x: 1.44, y: 3.84, z: -1.27, parent: g }));
  box(5.56, 0.04, 0.14, cap, { x: -1.26, y: 3.97, z: -3.66, cast: false, parent: g });
  box(5.56, 0.04, 0.14, cap, { x: -1.26, y: 3.97, z: 1.14, cast: false, parent: g });
  box(0.14, 0.04, 4.94, cap, { x: -3.96, y: 3.97, z: -1.27, cast: false, parent: g });
  box(0.14, 0.04, 4.94, cap, { x: 1.44, y: 3.97, z: -1.27, cast: false, parent: g });

  // rooftop AC condensers + vents
  const acMat = mats.toon('#c9c6bc');
  const mkRoofAC = (x, z, ry = 0) => {
    const ac = group('roof-ac', g);
    box(0.7, 0.45, 0.52, acMat, { x, y: 3.95, z, parent: ac, outline: true });
    box(0.6, 0.05, 0.44, mats.toon('#8e8f92'), { x, y: 4.1, z: z + 0.25, parent: ac });
    // fan circle
    circle(0.16, 16, mats.toon('#6c6f77'), { x: x + 0.36, y: 3.96, z, ry: Math.PI / 2, parent: ac, cast: false });
    for (let i = 0; i < 3; i++) {
      box(0.012, 0.28, 0.012, mats.toon('#54565d'), { x: x + 0.37, y: 3.96, z, rz: (i * Math.PI) / 3, parent: ac, cast: false });
    }
    // feet
    for (const dx of [-0.25, 0.25]) box(0.08, 0.1, 0.1, mats.toon('#5c5e64'), { x: x + dx, y: 3.77, z, parent: ac, cast: false });
    ac.rotation.y = ry;
    return ac;
  };
  mkRoofAC(-0.1, -2.7);
  mkRoofAC(0.9, -1.5, Math.PI / 2);
  // vent stack
  cyl(0.09, 0.09, 0.7, 12, metal, { x: -3.1, y: 4.05, z: -3.0, parent: g });
  cyl(0.15, 0.15, 0.08, 12, metal, { x: -3.1, y: 4.4, z: -3.0, parent: g });
  // rooftop puddle
  const roofPuddle = circle(0.65, 24, new THREE.MeshBasicMaterial({
    color: '#31435f', transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false,
  }), { x: -2.4, y: 3.735, z: -1.3, ground: true, cast: false, parent: g });
  roofPuddle.scale.set(1, 0.6, 1);
  // antenna
  cyl(0.018, 0.018, 1.4, 6, metal, { x: 1.1, y: 4.7, z: -3.3, parent: g });
  for (let i = 0; i < 3; i++) cyl(0.008, 0.008, 0.5 - i * 0.08, 4, metal, { x: 1.1, y: 5.2 + i * 0.12, z: -3.3, rz: Math.PI / 2, parent: g });

  /* ------------------------------------------------------------------ */
  /* facade details: pipes, meters, posters, wall lights                 */
  /* ------------------------------------------------------------------ */
  const pipeMat = mats.toon('#7b7e84');
  // downpipe front-left corner
  cyl(0.045, 0.045, 3.5, 8, pipeMat, { x: -3.8, y: 1.75, z: 1.055, parent: g });
  cyl(0.045, 0.045, 3.4, 8, pipeMat, { x: S.x1 + 0.055, y: 1.7, z: -3.45, parent: g });
  // side wall utility box + conduit
  box(0.4, 0.55, 0.16, mats.toon('#c4c1b6'), { x: S.x1 + 0.08, y: 1.3, z: -3.1, parent: g, outline: true });
  cyl(0.025, 0.025, 2.9, 6, pipeMat, { x: S.x1 + 0.07, y: 1.75, z: -3.38, parent: g });
  // small wall lamp over the side door area
  box(0.14, 0.2, 0.1, mats.toon('#e8e0cc'), { x: S.x1 + 0.1, y: 2.55, z: -2.5, parent: g });
  const serviceLamp = new THREE.PointLight(new THREE.Color('#ffce92'), 1.6, 2.4, 2);
  serviceLamp.position.set(S.x1 + 0.35, 2.45, -2.5);
  g.add(serviceLamp);
  // posters on solid side wall
  const posterMat = new THREE.MeshBasicMaterial({ map: posterTexture({ kind: 'sale', seed: 12 }), toneMapped: false });
  plane(0.5, 0.72, posterMat, { x: S.x1 + 0.13, y: 1.65, z: -2.7, ry: Math.PI / 2, cast: false, receive: false, parent: g });
  const posterMat2 = new THREE.MeshBasicMaterial({ map: posterTexture({ kind: 'ice', seed: 14 }), toneMapped: false });
  plane(0.5, 0.72, posterMat2, { x: S.x1 + 0.13, y: 1.65, z: -3.3, ry: Math.PI / 2, cast: false, receive: false, parent: g });

  // small extra signs on front facade
  const atmTex = (() => {
    const { c, ctx: cx } = canvas2d(256, 128);
    cx.fillStyle = 'rgba(255,248,230,0.95)';
    cx.fillRect(0, 0, 256, 128);
    drawText(cx, 'ATM', 128, 44, { family: FONT.latin, size: 54, color: '#2c7478' });
    drawText(cx, '24時間', 128, 94, { family: FONT.jp, size: 28, color: '#5b5a52' });
    return tex(c);
  })();
  plane(0.42, 0.21, new THREE.MeshBasicMaterial({ map: atmTex, toneMapped: false }), {
    x: -3.35, y: 1.5, z: S.z1 + 0.07, cast: false, receive: false, parent: g,
  });

  // back service door + lamp
  const backDoor = box(0.9, 2.1, 0.06, mats.toon('#7e858c'), { x: 0.5, y: 1.05, z: S.z0 - 0.04, parent: g, outline: true });
  box(0.55, 0.25, 0.02, mats.glass({ opacity: 0.35 }), { x: 0.5, y: 1.65, z: S.z0 - 0.08, cast: false, parent: g });
  const backLampMat = new THREE.MeshBasicMaterial({ color: '#ffd8a0', toneMapped: false });
  box(0.18, 0.08, 0.1, backLampMat, { x: 1.05, y: 2.45, z: S.z0 - 0.12, cast: false, parent: g });
  const backLamp = new THREE.PointLight(new THREE.Color('#ffc98a'), 1.8, 2.6, 2);
  backLamp.position.set(1.05, 2.3, S.z0 - 0.3);
  g.add(backLamp);

  /* ------------------------------------------------------------------ */
  /* small collision-free details                                        */
  /* ------------------------------------------------------------------ */
  // entrance light cube (small illuminated "24H" box beside the door)
  const cubeTex = (() => {
    const { c, ctx: cx } = canvas2d(128, 128);
    cx.fillStyle = '#fff4d6';
    cx.fillRect(0, 0, 128, 128);
    drawText(cx, '24H', 64, 56, { family: FONT.latin, size: 42, color: '#2d6b6e' });
    drawText(cx, 'OPEN', 64, 94, { family: FONT.latinBold, weight: '700', size: 18, color: '#d1773f' });
    return tex(c);
  })();
  box(0.16, 0.16, 0.1, new THREE.MeshBasicMaterial({ color: '#fff4d6', toneMapped: false }), {
    x: 1.14, y: 1.55, z: S.z1 + 0.02, cast: false, receive: false, parent: g,
  });
  plane(0.14, 0.14, new THREE.MeshBasicMaterial({ map: cubeTex, toneMapped: false }), {
    x: 1.14, y: 1.55, z: S.z1 + 0.071, cast: false, receive: false, parent: g,
  });

  // security camera
  box(0.12, 0.08, 0.16, mats.toon('#e5e1d6'), { x: 1.1, y: 2.85, z: S.z1 + 0.12, parent: g });
  cyl(0.04, 0.04, 0.08, 10, mats.toon('#2a2d34'), { x: 1.1, y: 2.85, z: S.z1 + 0.21, rx: Math.PI / 2, parent: g });


  // bold glass posters + a red nobori by the entrance
  const windowPoster = new THREE.MeshBasicMaterial({ map: posterTexture({ kind: 'sale', seed: 71 }), toneMapped: false });
  plane(0.86, 1.28, windowPoster, { x: -3.2, y: 1.18, z: S.z1 + 0.065, cast: false, receive: false, parent: g }).renderOrder = 9;
  const poster2 = new THREE.MeshBasicMaterial({ map: posterTexture({ kind: 'ice', seed: 72 }), toneMapped: false });
  plane(0.62, 0.9, poster2, { x: -0.62, y: 1.52, z: S.z1 + 0.065, cast: false, receive: false, parent: g }).renderOrder = 9;
  const noboriDraw = (cx) => {
    cx.fillStyle = '#f7ecdc'; cx.fillRect(0, 0, 256, 768);
    cx.fillStyle = '#d6423f'; cx.fillRect(14, 14, 228, 740);
    drawText(cx, '24', 128, 170, { family: FONT.latin, size: 110, color: '#fff6e6', maxWidth: 200 });
    drawText(cx, '時間営業', 128, 330, { family: FONT.jpDisplay, size: 82, color: '#fff6e6', maxWidth: 210 });
    drawText(cx, 'ひかりマート', 128, 520, { family: FONT.jp, size: 36, color: '#ffe9c8', maxWidth: 210 });
    drawText(cx, 'HIKARI MART', 128, 600, { family: FONT.latinBold, weight: '700', size: 22, color: '#ffd9b0' });
  };
  const { c: noboriCanvas, ctx: noboriCtx } = canvas2d(256, 768);
  noboriDraw(noboriCtx);
  const nobori = plane(0.42, 1.55, new THREE.MeshBasicMaterial({ map: tex(noboriCanvas), side: THREE.DoubleSide, toneMapped: false }), {
    x: 1.22, y: 1.05, z: 1.78, cast: false, receive: false, parent: g,
  });
  nobori.rotation.y = -0.25;
  cyl(0.012, 0.012, 2.05, 6, metal, { x: 1.22, y: 1.025, z: 1.78, parent: g });
  box(0.5, 0.025, 0.025, metal, { x: 1.22, y: 2.02, z: 1.78, ry: -0.25, parent: g });

  return g;
}
