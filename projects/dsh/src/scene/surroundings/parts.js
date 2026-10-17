/* Small reusable builders shared by the surroundings sub-modules. */
import * as THREE from 'three';
import { box, cyl, circle, plane, instanced, cylinderBetween } from '../../core/geom.js';
import { glowSpriteTexture } from '../../core/textures.js';

export const OUTLINE_COLOR = '#14131d';

/* cached glow billboards */
let _glowWarm = null;
let _glowCool = null;
let _glowMint = null;
let _glowPool = null;
function glowTexture(kind) {
  if (kind === 'cool') {
    if (!_glowCool) _glowCool = glowSpriteTexture({ size: 128, inner: 'rgba(220,238,255,0.9)', mid: 'rgba(140,180,255,0.26)' });
    return _glowCool;
  }
  if (kind === 'mint') {
    if (!_glowMint) _glowMint = glowSpriteTexture({ size: 128, inner: 'rgba(210,255,244,0.85)', mid: 'rgba(80,225,205,0.24)' });
    return _glowMint;
  }
  if (kind === 'pool') {
    if (!_glowPool) _glowPool = glowSpriteTexture({ size: 128, inner: 'rgba(255,214,158,0.5)', mid: 'rgba(255,180,100,0.18)' });
    return _glowPool;
  }
  if (!_glowWarm) _glowWarm = glowSpriteTexture({ size: 128, inner: 'rgba(255,240,210,0.95)', mid: 'rgba(255,180,110,0.28)' });
  return _glowWarm;
}

export function addOutline(ctx, mesh, t = 0.018, color = OUTLINE_COLOR) {
  if (!mesh) return mesh;
  return ctx.outline(mesh, t, color);
}

/* Additive billboard glow. Returns { sprite, mat }. */
export function glowSprite(parent, { x, y, z, size = 0.55, color = '#ffcf9a', opacity = 0.5, kind = 'warm' }) {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture(kind),
    color,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity,
    toneMapped: false,
    fog: true,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(x, y, z);
  sprite.scale.set(size, size, 1);
  parent.add(sprite);
  return { sprite, mat };
}

/* Bulkhead wall lamp with a small warm point light, halo and floor pool.
   ry = direction the lamp faces (0 = +z, Math.PI/2 = +x, -Math.PI/2 = -x). */
export function wallLamp(ctx, parent, {
  x, y, z, ry = 0, warm = true, withLight = true, intensity = 1.2, distance = 2.7,
  lightColor = '#ffc187', size = 0.5, pool = null, poolSize = [1.7, 1.15], poolOpacity = 0.55,
}) {
  const dir = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  const dark = ctx.mats.toon('#3b3e46');
  const metal = ctx.mats.toon('#565a63');
  // wall plate
  box(0.16, 0.2, 0.04, metal, { x: 0, y: 0, z: 0.005, parent: g, cast: false });
  // arm
  box(0.055, 0.055, 0.15, metal, { x: 0, y: 0.02, z: 0.11, parent: g, cast: false });
  // shade
  box(0.21, 0.06, 0.21, dark, { x: 0, y: 0.1, z: 0.18, parent: g, cast: false });
  // glowing panel (faces down / out)
  const bulb = new THREE.MeshBasicMaterial({ color: warm ? '#ffd9a0' : '#cfe6ff', toneMapped: false });
  box(0.13, 0.02, 0.13, bulb, { x: 0, y: 0.062, z: 0.18, parent: g, cast: false, receive: false });
  // cage bars
  for (let i = 0; i < 3; i++) {
    box(0.012, 0.11, 0.012, dark, { x: -0.062 + i * 0.062, y: -0.02, z: 0.275, parent: g, cast: false });
  }
  const glow = glowSprite(parent, {
    x: x + dir.x * 0.26,
    y: y - 0.02,
    z: z + dir.z * 0.26,
    size,
    color: warm ? '#ffc98f' : '#bcd8ff',
    opacity: warm ? 0.45 : 0.35,
    kind: warm ? 'warm' : 'cool',
  });
  let light = null;
  if (withLight) {
    light = new THREE.PointLight(new THREE.Color(lightColor), intensity, distance, 2.0);
    light.position.set(x + dir.x * 0.32, y - 0.1, z + dir.z * 0.32);
    parent.add(light);
  }
  let poolMesh = null;
  if (pool) {
    // accept either pool:[x,y,z] with poolSize:[w,h], or pool:[[x,y,z],[w,h]]
    let poolPos = pool;
    let poolDim = poolSize;
    if (Array.isArray(pool[0])) {
      poolPos = pool[0];
      poolDim = pool[1] ?? poolSize;
    }
    const pm = new THREE.MeshBasicMaterial({
      map: glowTexture('pool'),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: poolOpacity,
      toneMapped: false,
      fog: true,
    });
    poolMesh = plane(poolDim[0], poolDim[1], pm, {
      x: poolPos[0], y: poolPos[1], z: poolPos[2], ground: true, cast: false, receive: false, parent,
    });
    poolMesh.renderOrder = 2;
  }
  return { group: g, light, glow, pool: poolMesh };
}

/* Outdoor AC condenser. Local +z is the grille face.
   bracket = wall mounted, stand = standing on the floor (needs floorY). */
export function acUnit(ctx, parent, {
  x, y, z, ry = 0, w = 0.6, h = 0.42, d = 0.26, grille, bracket = false, stand = false,
  floorY = 0.12, outline = false, drip = true,
}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  const bodyMat = ctx.mats.toon('#a5a298');
  const body = box(w, h, d, bodyMat, { parent: g, cast: true, receive: true });
  if (outline) addOutline(ctx, body, 0.01);
  // grille face
  const gm = ctx.mats.toon('#ffffff', { map: grille });
  plane(w * 0.94, h * 0.88, gm, { x: 0, y: 0, z: d / 2 + 0.004, parent: g, cast: false, receive: true });
  // thin top lip + feet / bracket
  box(w * 0.98, 0.018, d * 0.6, ctx.mats.toon('#7e7c73'), { x: 0, y: h / 2 + 0.01, z: -d * 0.1, parent: g, cast: false });
  if (stand) {
    const legH = Math.max(0.06, y - h / 2 - floorY);
    for (const lx of [-w * 0.34, w * 0.34]) {
      box(0.045, legH, 0.04, ctx.mats.toon('#4a4d55'), { x: lx, y: -h / 2 - legH / 2, z: 0, parent: g, cast: false });
    }
  }
  if (bracket) {
    for (const lx of [-w * 0.32, w * 0.32]) {
      box(0.035, 0.035, d + 0.14, ctx.mats.toon('#4a4d55'), { x: lx, y: -h / 2 - 0.03, z: d * 0.25, parent: g, cast: false });
    }
  }
  if (drip) {
    cyl(0.012, 0.012, Math.max(0.12, y - h / 2 - floorY), 4, ctx.mats.toon('#5b5f66'), {
      x: w * 0.42, y: -h / 2 - Math.max(0.12, y - h / 2 - floorY) / 2, z: d * 0.3, parent: g, cast: false,
    });
  }
  return { group: g, body };
}

/* Vertical service pipe with a couple of wall clamps. */
export function pipeRun(ctx, parent, {
  x, z, y0 = 0.12, y1 = 4.4, r = 0.03, color = '#6c7079', clamps = 2, ry = 0,
}) {
  const mat = ctx.mats.toon(color);
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  parent.add(g);
  const h = y1 - y0;
  cyl(r, r, h, 7, mat, { x: 0, y: y0 + h / 2, z: 0, parent: g, cast: true, receive: true });
  const clampT = [];
  for (let i = 0; i < clamps; i++) {
    const cy = y0 + (h * (i + 1)) / (clamps + 1);
    clampT.push({ x: 0, y: cy, z: r * 0.4, sx: r * 3, sy: 0.05, sz: r * 4.2 });
  }
  if (clampT.length) {
    instanced(new THREE.BoxGeometry(1, 1, 1), ctx.mats.toon('#4a4d55'), clampT, { parent: g, cast: false, receive: false });
  }
  return g;
}

/* Plastic beer crates, stacked. items: [{x,y,z,ry?}], colors: { color, items } */
export function crateStacks(ctx, parent, groups) {
  const geo = new THREE.BoxGeometry(0.34, 0.27, 0.34);
  for (const grp of groups) {
    if (!grp.items.length) continue;
    const mat = ctx.mats.toon(grp.color, { map: grp.map });
    instanced(geo, mat, grp.items, { parent, cast: true, receive: true });
  }
}

/* LPG cylinders standing on the floor. items: [{x,z}] */
export function gasCylinders(ctx, parent, items, floorY = 0.12) {
  const h = 0.6;
  const r = 0.15;
  const g = new THREE.Group();
  g.position.set(0, floorY, 0);
  parent.add(g);
  const bodyMat = ctx.mats.toon('#6c7268');
  const bodyGeo = new THREE.CylinderGeometry(r * 0.94, r, h, 10);
  instanced(bodyGeo, bodyMat, items.map((it) => ({ x: it.x, y: h / 2, z: it.z, ry: it.ry ?? 0 })), {
    parent: g, cast: true, receive: true,
  });
  const capGeo = new THREE.SphereGeometry(r * 0.94, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  instanced(capGeo, bodyMat, items.map((it) => ({ x: it.x, y: h, z: it.z })), { parent: g, cast: false, receive: true });
  const valveGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.1, 6);
  instanced(valveGeo, ctx.mats.toon('#3d4047'), items.map((it) => ({ x: it.x, y: h + 0.09, z: it.z })), {
    parent: g, cast: false, receive: false,
  });
  // safety chain across the cylinders
  const xs = items.map((it) => it.x);
  const x0 = Math.min(...xs) - 0.2;
  const x1 = Math.max(...xs) + 0.2;
  const zc = items[0].z;
  const chain = sagWireLocal(ctx, g, new THREE.Vector3(x0, h * 0.78, zc), new THREE.Vector3(x1, h * 0.78, zc), 0.06, 0.012);
  return { group: g, chain };
}

function sagWireLocal(ctx, parent, a, b, sag, radius) {
  const pts = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 20, radius, 4);
  const mesh = new THREE.Mesh(geo, ctx.mats.toon('#4d4a44'));
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

/* A few clumps of grass/weeds. positions: [{x,z,s?,ry?}] */
export function weeds(ctx, parent, positions, floorY = 0.02) {
  if (!positions.length) return;
  const geo = new THREE.ConeGeometry(0.035, 0.2, 4, 1);
  geo.translate(0, 0.1, 0);
  const dark = positions.filter((_, i) => i % 2 === 0);
  const light = positions.filter((_, i) => i % 2 === 1);
  const t = (p) => ({ x: p.x, y: floorY, z: p.z, ry: p.ry ?? 0, sx: p.sx ?? 1, sy: p.sy ?? 1, sz: p.sx ?? 1 });
  if (dark.length) instanced(geo, ctx.mats.toon('#2a3d31'), dark.map(t), { parent, cast: false, receive: true });
  if (light.length) instanced(geo, ctx.mats.toon('#3a5340'), light.map(t), { parent, cast: false, receive: true });
}

/* TV antenna on a roof. Local origin at roof surface. */
export function tvAntenna(ctx, parent, { x, y, z, ry = 0 }) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  const metal = ctx.mats.toon('#9aa0a8');
  cyl(0.022, 0.026, 1.5, 6, metal, { x: 0, y: 0.75, z: 0, parent: g, cast: true, receive: false });
  cyl(0.012, 0.012, 0.9, 5, metal, { x: 0.1, y: 1.36, z: 0, rz: Math.PI / 2, parent: g, cast: false });
  const elGeo = new THREE.CylinderGeometry(0.006, 0.006, 1, 4);
  const elT = [];
  const lens = [0.98, 0.9, 0.8, 0.7, 0.6, 0.5];
  lens.forEach((len, i) => {
    elT.push({ x: -0.3 + i * 0.11, y: 1.36, z: 0, rx: Math.PI / 2, sy: len });
  });
  instanced(elGeo, metal, elT, { parent: g, cast: false, receive: false });
  // small guy bracket
  box(0.05, 0.05, 0.05, ctx.mats.toon('#4f525a'), { x: 0, y: 0.35, z: 0, parent: g, cast: false });
  return g;
}

/* Rain cable run between two points (world space). */
export function cable(ctx, parent, a, b, sag = 0.1, radius = 0.008, color = '#3f3d44') {
  return sagWireLocal(ctx, parent, a, b, sag, radius);
}

/* Hanging paper lantern (chochin). */
export function chochin(ctx, parent, { x, y, z, tex, scale = 1, glow = true }) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.05, 0.92, 0.72), toneMapped: false });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.105 * scale, 12, 9), mat);
  body.scale.set(1, 1.28, 1);
  g.add(body);
  const capMat = ctx.mats.toon('#2c2a2c');
  cyl(0.045 * scale, 0.045 * scale, 0.025, 8, capMat, { y: 0.132 * scale, parent: g, cast: false });
  cyl(0.045 * scale, 0.045 * scale, 0.025, 8, capMat, { y: -0.132 * scale, parent: g, cast: false });
  let halo = null;
  if (glow) {
    halo = glowSprite(parent, { x, y, z, size: 0.75 * scale, color: '#ffbf7a', opacity: 0.4, kind: 'warm' });
  }
  return { group: g, halo };
}

/* Thin stain / moss decal plane. ground:true lays it flat (roof / floor). */
export function decal(parent, { x, y, z, w, h, ry = 0, map, opacity = 0.6, color = '#ffffff', ground = false }) {
  const mat = new THREE.MeshBasicMaterial({
    map,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: true,
    fog: true,
  });
  const m = plane(w, h, mat, { x, y, z, ry, ground, cast: false, receive: false, parent });
  m.renderOrder = 1;
  return m;
}

export { cylinderBetween };
