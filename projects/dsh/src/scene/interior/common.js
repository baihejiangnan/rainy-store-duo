/* Shared interior-build helpers: materials, canvas textures, small prefabs.
 * Everything here is created once per scene build; canvases are cached by key
 * so repeated sign designs are cheap.
 */
import * as THREE from 'three';
import { L } from '../../core/layout.js';
import { canvas2d, tex } from '../../core/textures.js';
import { box, cyl, group, instanced, plane, rounded, sphere } from '../../core/geom.js';

const S = L.store;

// inner faces of the shell linings (the Lead built the shell)
export const IN = {
  F: S.floorY, // 0.14 floor top
  CEIL: S.ceilY, // 2.62
  X0: -3.70, // left wall inner face
  X1: 1.10, // right wall inner face (solid part)
  Z0: -3.43, // back wall inner face
  Z1: 0.9, // just inside the front glazing
};

export const P = {
  cream: '#f7f0e1',
  creamHi: '#fffaf0',
  creamDark: '#e3d9c4',
  panel: '#efe6d3',
  shelf: '#f2ecdf',
  shelfEdge: '#d6ccb8',
  teal: '#2fa89b',
  tealDark: '#1d7b72',
  tealLight: '#7fd6c8',
  orange: '#ed8b4e',
  orangeDeep: '#d97434',
  warm: '#ffd9a6',
  metal: '#c9ced3',
  steel: '#aeb6bd',
  metalDark: '#5b606d',
  dark: '#2c303c',
  ink: '#26262e',
  fridgeLight: '#e9f7ff',
  fridgeBlue: '#b9e2f4',
  red: '#d8564c',
  mustard: '#efc24f',
};

export function makeInterior(ctx) {
  const { mats, refs } = ctx;
  const g = group('store-interior', ctx.root);
  const rand = ctx.rng(9137);
  const basicCache = new Map();
  const texCache = new Map();

  const I = {
    THREE,
    ctx,
    mats,
    refs,
    g,
    rand,
    F: IN.F,
    CEIL: IN.CEIL,
    X0: IN.X0,
    X1: IN.X1,
    Z0: IN.Z0,
    Z1: IN.Z1,
    p: P,
    group: (name, parent) => group(name, parent || g),
  };

  /* ---------------- geometries reused by instancing ---------------- */
  I.unitBox = new THREE.BoxGeometry(1, 1, 1);
  I.unitPlane = new THREE.PlaneGeometry(1, 1);
  I.unitCyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
  I.unitCyl8 = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  I.unitCyl3 = new THREE.CylinderGeometry(0.5, 0.5, 1, 3);
  I.unitCyl6 = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
  I.unitSphere = new THREE.SphereGeometry(0.5, 8, 6);

  /* ---------------- materials ---------------- */
  I.toon = (color, opts = {}) => mats.toon(color, opts);

  I.glow = (color, mul = 1, opts = {}) => {
    const key = [color, mul, opts.opacity ?? 1, opts.blending ?? '', opts.side ?? 0,
      opts.depthWrite === false ? 0 : 1, opts.map ? opts.map.uuid : '', opts.fog === false ? 0 : 1].join('|');
    if (basicCache.has(key)) return basicCache.get(key);
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(mul),
      map: opts.map || null,
      transparent: !!opts.transparent,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.FrontSide,
      blending: opts.blending ?? THREE.NormalBlending,
      depthWrite: opts.depthWrite !== false,
      toneMapped: false,
      fog: opts.fog !== false,
    });
    basicCache.set(key, m);
    return m;
  };

  I.glassMat = (opts = {}) => {
    return new THREE.MeshBasicMaterial({
      color: opts.color ?? '#cfeaf7',
      transparent: true,
      opacity: opts.opacity ?? 0.09,
      side: opts.side ?? THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
      fog: true,
    });
  };

  /* ---------------- mesh helpers (parent defaults to interior group) --- */
  I.box = (w, h, d, mat, o = {}) => box(w, h, d, mat, { parent: g, ...o });
  I.cyl = (rt, rb, h, seg, mat, o = {}) => cyl(rt, rb, h, seg, mat, { parent: g, ...o });
  I.plane = (w, h, mat, o = {}) => plane(w, h, mat, { parent: g, ...o });
  I.sphere = (r, mat, o = {}) => sphere(r, mat, { parent: g, ...o });
  I.rounded = (w, h, d, r, mat, o = {}) => rounded(w, h, d, r, mat, { parent: g, ...o });
  I.inst = (geo, mat, transforms, o = {}) =>
    instanced(geo, mat, transforms, { parent: g, cast: false, receive: true, ...o });
  I.outline = (mesh, t = 0.014, c = '#241f2a') => ctx.outline(mesh, t, c);

  /* ---------------- canvas texture cache ---------------- */
  I.canvas = (key, w, h, draw) => {
    if (texCache.has(key)) return texCache.get(key);
    const { c, ctx: cx } = canvas2d(w, h);
    draw(cx, w, h);
    const t = tex(c);
    texCache.set(key, t);
    return t;
  };

  // plain textured plane, unlit & bright (signs, screens, labels)
  I.sign = (texture, w, h, o = {}) => {
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      color: new THREE.Color(1, 1, 1).multiplyScalar(o.mul ?? 1),
      transparent: !!o.transparent,
      opacity: o.opacity ?? 1,
      side: o.side ?? THREE.FrontSide,
      depthWrite: o.depthWrite ?? (o.transparent ? false : true),
      toneMapped: false,
      fog: o.fog !== false,
      alphaTest: o.alphaTest ?? 0,
    });
    const m = plane(w, h, mat, {
      x: o.x ?? 0, y: o.y ?? 0, z: o.z ?? 0,
      rx: o.rx, ry: o.ry, rz: o.rz,
      parent: o.parent ?? g, cast: false, receive: false,
    });
    if (o.renderOrder != null) m.renderOrder = o.renderOrder;
    return m;
  };

  I.signMat = (texture, o = {}) => {
    return new THREE.MeshBasicMaterial({
      map: texture,
      color: new THREE.Color(1, 1, 1).multiplyScalar(o.mul ?? 1),
      transparent: !!o.transparent,
      opacity: o.opacity ?? 1,
      side: o.side ?? THREE.FrontSide,
      depthWrite: o.depthWrite ?? (o.transparent ? false : true),
      toneMapped: false,
      fog: o.fog !== false,
    });
  };

  // simple plate of cardboard / paper / carpet etc.
  I.decal = (texture, w, h, o = {}) => {
    const m = I.sign(texture, w, h, o);
    m.renderOrder = o.renderOrder ?? 2;
    return m;
  };

  return I;
}
