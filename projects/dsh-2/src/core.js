// ─────────────────────────────────────────────────────────────────────────────
// core.js — shared stage vocabulary for the rainy-night konbini diorama.
// Every scene module imports from this file. Do not fork these helpers.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

THREE.ColorManagement.enabled = true;

export { THREE };

// ── Vertical levels (metres) ────────────────────────────────────────────────
// y = 0 is the top of the diorama base (= road asphalt). Everything sits on it.
export const Y = {
  road: 0.0,
  sidewalk: 0.12,
  storeFloor: 0.16,
  storeCeil: 2.56,
  glassBottom: 0.62,
  glassTop: 2.42,
  fasciaBottom: 2.58,
  fasciaTop: 3.22,
  roof: 3.28,
};

// ── Plan layout (x = east, z = south) ───────────────────────────────────────
// Base is a 12 x 12 square: x,z in [-6, 6].
// Store occupies the back-left, streets run off the front (+z) and right (+x)
// edges, a narrow alley runs up the left side.
export const LAYOUT = {
  baseHalf: 6,
  baseThick: 0.8,

  store: {
    x0: -3.2,
    x1: 2.6,
    z0: -3.2,
    z1: 1.0,
    wall: 0.14,
    // chamfered entrance corner (south-east): from (x1, -0.30) to (1.20, z1)
    // facade centre = (1.90, 0.35), length 1.910 m, outward normal (0.681, 0.733)
    // -> a plane's default +z face points out at rotation.y = 0.748 rad (42.9 deg)
    chamferA: [2.6, -0.30],
    chamferB: [1.2, 1.0],
    chamferCenter: [1.9, 0.35],
    chamferRotY: 0.748,
    chamferLen: 1.91,
    // usable interior (inside faces of the walls)
    inner: { x0: -3.06, x1: 2.46, z0: -3.06, z1: 0.86 },
  },

  sidewalk: {
    southZ0: 1.0, southZ1: 2.6,
    eastX0: 2.6, eastX1: 4.0,
  },

  road: {
    southZ0: 2.6, southZ1: 6.0,
    eastX0: 4.0, eastX1: 6.0,
  },

  alley: { x0: -4.9, x1: -3.2, z0: -4.4, z1: 1.0 },

  // buildings that close the diorama on the back / left edges
  backBuilding: { x0: -6.0, x1: 2.6, z0: -6.0, z1: -4.4, h: 3.95 },
  leftBuilding: { x0: -6.0, x1: -4.9, z0: -4.4, z1: 1.0, h: 3.55 },

  // crosswalks: south road crossing aligned with east sidewalk,
  // east road crossing aligned with south sidewalk
  crossSouth: { x0: 2.72, x1: 3.92, z0: 2.66, z1: 5.96 },
  crossEast: { x0: 4.04, x1: 5.96, z0: 1.14, z1: 2.42 },

  parking: { x0: -3.0, x1: 1.8, z0: 2.92, z1: 4.25 },

  // puddles: [x, z, radiusX, radiusZ, rotationY]
  puddles: [
    [0.35, 1.85, 1.25, 0.62, 0.25],
    [-1.55, 1.55, 0.72, 0.36, -0.5],
    [3.05, 2.08, 0.62, 0.38, 0.9],
    [4.85, 4.55, 1.18, 0.78, -0.35],
    [2.35, 4.9, 0.82, 0.5, 0.2],
    [-2.6, 3.65, 1.05, 0.55, 0.5],
    [-3.75, -1.15, 0.52, 0.74, 0.15],
    [-4.3, 0.35, 0.45, 0.6, -0.2],
    [5.55, 1.78, 0.55, 0.4, 0.5],
  ],
};

// ── Palette ─────────────────────────────────────────────────────────────────
export const PAL = {
  night: 0x05080f,
  night2: 0x0b1322,
  horizon: 0x18243a,
  fog: 0x0a101c,

  asphalt: 0x252a33,
  asphaltLight: 0x323844,
  paint: 0xdfe3e2,
  sidewalk: 0x70767f,
  sidewalkDark: 0x585e67,
  curb: 0x8d939c,
  gutter: 0x1b1f26,
  drain: 0x14171d,

  darkMetal: 0x272c34,
  metal: 0x6d747c,
  metalLight: 0x9aa1a8,
  white: 0xe9e4d8,
  warmWhite: 0xfff3da,
  warm: 0xffcf92,
  amber: 0xffb45e,

  storeWall: 0xd8d4cb,
  storeWallShade: 0x9fa3a6,
  storeInterior: 0xf3ead6,
  green: 0x1c6b5b,
  greenLight: 0x63e0c0,
  teal: 0x0e4f4a,
  cyan: 0x54e6ff,
  blue: 0x2f6fb0,
  pink: 0xff5f8e,
  magenta: 0xff4f9a,
  red: 0xff3b3b,
  trafficGreen: 0x3dffa8,
  trafficYellow: 0xffc23d,
  glass: 0x9fd8ff,

  brick: 0x6b4f4a,
  brickDark: 0x4a3634,
  wood: 0x5a4636,
  woodLight: 0x8a6a4c,
  plant: 0x2f6b45,
  plantLight: 0x4c9463,
  base: 0x151820,
  baseEdge: 0x1f242e,
  brass: 0xb08a52,
  paper: 0xf2ead9,
  black: 0x0c0e13,
};

// ── Toon ramp ───────────────────────────────────────────────────────────────
const ramp = new Uint8Array([46, 112, 178, 236, 255]);
export const GRADIENT_MAP = new THREE.DataTexture(ramp, ramp.length, 1, THREE.RedFormat);
GRADIENT_MAP.minFilter = THREE.NearestFilter;
GRADIENT_MAP.magFilter = THREE.NearestFilter;
GRADIENT_MAP.generateMipmaps = false;
GRADIENT_MAP.needsUpdate = true;

// ── Material factories ──────────────────────────────────────────────────────
export const M = {
  /** Flat cel-shaded material. opts: {emissive, emissiveIntensity, map, transparent, opacity, side, vertexColors} */
  toon(color, opts = {}) {
    return new THREE.MeshToonMaterial({ color, gradientMap: GRADIENT_MAP, ...opts });
  },
  /** Unlit glow / lightbox material. intensity may exceed 1 (feeds bloom). */
  emit(color, opts = {}) {
    const c = new THREE.Color(color);
    if (opts.intensity !== undefined) c.multiplyScalar(opts.intensity);
    const mat = new THREE.MeshBasicMaterial({
      color: c,
      map: opts.map || null,
      transparent: !!opts.transparent,
      opacity: opts.opacity !== undefined ? opts.opacity : 1,
      side: opts.side !== undefined ? opts.side : THREE.FrontSide,
      blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : true,
      fog: false,
      alphaTest: opts.alphaTest || 0,
    });
    return mat;
  },
  /** Storefront glass: mostly see-through, a little tint and specular. */
  glass(tint = PAL.glass) {
    return new THREE.MeshPhongMaterial({
      color: tint,
      transparent: true,
      opacity: 0.1,
      shininess: 160,
      specular: 0xd8f0ff,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });
  },
  /** Wet painted metal (toon, slightly emissive to survive the night grade) */
  wet(color, emissive = 0x000000, intensity = 0) {
    return new THREE.MeshToonMaterial({
      color,
      gradientMap: GRADIENT_MAP,
      emissive,
      emissiveIntensity: intensity,
    });
  },
  /** Simple unlit flat colour, for decals and tiny details. */
  flat(color, opts = {}) {
    return new THREE.MeshBasicMaterial({ color, transparent: !!opts.transparent, opacity: opts.opacity ?? 1, side: opts.side ?? THREE.FrontSide, depthWrite: opts.depthWrite ?? true, fog: opts.fog ?? true });
  },
};

// ── Canvas helpers ──────────────────────────────────────────────────────────
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  return c;
}

/** Create a CanvasTexture from a draw callback. draw(ctx, W, H) */
export function canvasTexture(w, h, draw, opts = {}) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  draw(ctx, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = opts.anisotropy || 8;
  if (opts.wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
  t.needsUpdate = true;
  return t;
}

const JP_FONT = '"Yu Gothic UI","Yu Gothic","Hiragino Kaku Gothic ProN","Hiragino Sans","Meiryo","Noto Sans JP",sans-serif';
const EN_FONT = '"Segoe UI","Helvetica Neue",Arial,sans-serif';

export const FONT = { jp: JP_FONT, en: EN_FONT };

/** rounded rect path */
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawText(ctx, text, x, y, o = {}) {
  const size = o.size || 40;
  const weight = o.weight || 'bold';
  const font = o.font || JP_FONT;
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = o.color || '#111';
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.baseline || 'middle';
  if (o.letterSpacing) {
    // manual tracking (canvas letterSpacing support is spotty)
    const chars = [...text];
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + o.letterSpacing * (chars.length - 1);
    let cx = o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2;
    for (let i = 0; i < chars.length; i++) {
      ctx.textAlign = 'left';
      ctx.fillText(chars[i], cx, y);
      cx += widths[i] + o.letterSpacing;
    }
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}

export function drawVerticalText(ctx, text, x, y, size, o = {}) {
  const gap = o.gap || size * 1.06;
  const chars = [...text];
  const total = gap * chars.length;
  let cy = y - total / 2 + gap / 2;
  for (const ch of chars) {
    drawText(ctx, ch, x, cy, { ...o, size });
    cy += gap;
  }
}

export function drawStar(ctx, x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.44;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── Geometry / mesh helpers ─────────────────────────────────────────────────
export const OUTLINE = 0.014;

const outlineVS = /* glsl */ `
  uniform float uThickness;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    // slightly grow the line with distance so silhouettes stay readable
    float grow = 0.72 + 0.05 * max(-mv.z, 0.0);
    mv.xyz += n * uThickness * grow;
    gl_Position = projectionMatrix * mv;
  }
`;
const outlineFS = /* glsl */ `
  void main() {
    gl_FragColor = vec4(0.016, 0.020, 0.030, 1.0);
  }
`;
const outlineVSInst = outlineVS
  .replace('modelViewMatrix * vec4(position, 1.0)', 'modelViewMatrix * instanceMatrix * vec4(position, 1.0)')
  .replace('normalMatrix * normal', 'normalMatrix * mat3(instanceMatrix) * normal');

function outlineMaterial(thickness, instanced) {
  return new THREE.ShaderMaterial({
    uniforms: { uThickness: { value: thickness } },
    vertexShader: instanced ? outlineVSInst : outlineVS,
    fragmentShader: outlineFS,
    side: THREE.BackSide,
    depthWrite: true,
  });
}

/**
 * Attach an inverted-hull outline to a mesh (as a child, so it inherits xform).
 * Thickness is roughly in world metres; 0.014 is the house default.
 */
export function addOutline(mesh, thickness = OUTLINE) {
  const o = new THREE.Mesh(mesh.geometry, outlineMaterial(thickness, false));
  o.castShadow = false;
  o.receiveShadow = false;
  o.renderOrder = -1;
  mesh.add(o);
  return o;
}

export function addOutlineInstanced(mesh, thickness = OUTLINE) {
  const o = new THREE.InstancedMesh(mesh.geometry, outlineMaterial(thickness, true), mesh.count);
  o.instanceMatrix = mesh.instanceMatrix;
  o.castShadow = false;
  o.receiveShadow = false;
  mesh.parent && mesh.parent.add(o);
  return o;
}

/** Create a mesh, position it, optionally outline it, and add to parent. */
export function mesh(parent, geo, mat, pos = [0, 0, 0], opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(pos[0] || 0, pos[1] || 0, pos[2] || 0);
  if (opts.rot) m.rotation.set(opts.rot[0] || 0, opts.rot[1] || 0, opts.rot[2] || 0);
  else { m.rotation.x = opts.rx || 0; m.rotation.y = opts.ry || 0; m.rotation.z = opts.rz || 0; }
  if (opts.scale) typeof opts.scale === 'number' ? m.scale.setScalar(opts.scale) : m.scale.set(...opts.scale);
  m.castShadow = !!opts.cast;
  m.receiveShadow = opts.receive !== false;
  m.renderOrder = opts.renderOrder || 0;
  if (opts.name) m.name = opts.name;
  parent.add(m);
  if (opts.outline) addOutline(m, opts.outline === true ? OUTLINE : opts.outline);
  return m;
}

/** Box helper. pos = CENTER. opts.outline=false by default; pass true / thickness. */
export function box(parent, size, pos, mat, opts = {}) {
  return mesh(parent, new THREE.BoxGeometry(size[0], size[1], size[2]), mat, pos, opts);
}

/** Box helper with pos = BOTTOM CENTRE (y is the sitting surface). */
export function boxOn(parent, size, pos, mat, opts = {}) {
  return mesh(parent, new THREE.BoxGeometry(size[0], size[1], size[2]), mat, [pos[0], pos[1] + size[1] * 0.5, pos[2]], opts);
}

export function plane(parent, size, pos, mat, opts = {}) {
  return mesh(parent, new THREE.PlaneGeometry(size[0], size[1]), mat, pos, opts);
}

export function cylinder(parent, rt, rb, h, pos, mat, opts = {}) {
  return mesh(parent, new THREE.CylinderGeometry(rt, rb, h, opts.seg || 16, 1, !!opts.open), mat, pos, opts);
}

export function sphere(parent, r, pos, mat, opts = {}) {
  return mesh(parent, new THREE.SphereGeometry(r, opts.seg || 16, opts.segY || 12), mat, pos, opts);
}

export function torus(parent, r, tube, pos, mat, opts = {}) {
  return mesh(parent, new THREE.TorusGeometry(r, tube, opts.seg || 8, opts.seg2 || 24), mat, pos, opts);
}

export function group(parent, pos = [0, 0, 0], name) {
  const g = new THREE.Group();
  g.position.set(pos[0] || 0, pos[1] || 0, pos[2] || 0);
  if (name) g.name = name;
  parent.add(g);
  return g;
}

/** Text / poster plane drawn onto a canvas. Layout: pos = centre, default faces +z. */
export function label(parent, w, h, draw, pos, opts = {}) {
  const px = opts.px || 220;
  const W = Math.min(1600, Math.max(16, Math.round(w * px)));
  const Hh = Math.min(1600, Math.max(16, Math.round(h * px)));
  const tex = canvasTexture(W, Hh, (ctx, cw, ch) => {
    if (opts.bg) { ctx.fillStyle = opts.bg; ctx.fillRect(0, 0, cw, ch); }
    draw(ctx, cw, ch, w, h);
  }, { anisotropy: 8 });
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: opts.opacity ?? 1,
    color: new THREE.Color(opts.brightness ?? 1, opts.brightness ?? 1, opts.brightness ?? 1),
    side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    depthWrite: !!opts.depthWrite,
    fog: false,
    alphaTest: 0.01,
  });
  const m = mesh(parent, new THREE.PlaneGeometry(w, h), mat, pos, {
    ry: opts.ry, rx: opts.rx, rz: opts.rz,
    receive: opts.receive,
    outline: false,
    renderOrder: opts.renderOrder || 0,
  });
  if (opts.glow) {
    // faint bloom assist behind the panel
    glow(parent, opts.glow, w * 1.5, pos, { ry: opts.ry, opacity: 0.35 });
  }
  return m;
}

// ── Glow sprites ────────────────────────────────────────────────────────────
let _glowTex = null;
export function glowTexture() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(255,255,255,0.65)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.16)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  _glowTex = new THREE.CanvasTexture(c);
  _glowTex.colorSpace = THREE.SRGBColorSpace;
  return _glowTex;
}

export function glow(parent, color, size, pos, opts = {}) {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture(),
    color,
    transparent: true,
    opacity: opts.opacity ?? 0.55,
    blending: opts.normal ? THREE.NormalBlending : THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const s = new THREE.Sprite(mat);
  s.position.set(pos[0], pos[1], pos[2]);
  s.scale.set(size, opts.aspect ? size * opts.aspect : size, 1);
  s.renderOrder = opts.renderOrder || 3;
  parent.add(s);
  return s;
}

/** Vertical wet-reflection smear, laid flat on the ground (additive). */
let _smearTex = null;
export function smearTexture() {
  if (_smearTex) return _smearTex;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.22)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  // soften horizontally
  const h = ctx.createLinearGradient(0, 0, 64, 0);
  h.addColorStop(0, 'rgba(0,0,0,1)');
  h.addColorStop(0.5, 'rgba(0,0,0,0)');
  h.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = h;
  ctx.fillRect(0, 0, 64, 256);
  _smearTex = new THREE.CanvasTexture(c);
  _smearTex.colorSpace = THREE.SRGBColorSpace;
  return _smearTex;
}

export function groundSmear(parent, color, w, h, pos, opts = {}) {
  const mat = new THREE.MeshBasicMaterial({
    map: smearTexture(),
    color,
    transparent: true,
    opacity: opts.opacity ?? 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
  });
  const m = mesh(parent, new THREE.PlaneGeometry(w, h), mat, [pos[0], pos[1] ?? 0.008, pos[2]], {
    rx: -Math.PI / 2, ry: opts.ry || 0, outline: false, receive: false, renderOrder: opts.renderOrder || 2,
  });
  return m;
}

/** Small helper: build an array of values with seeded randomness (stable each load). */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Add emissive rectangles under / behind things to fake bounce light. */
export function lightBox(parent, color, w, h, pos, opts = {}) {
  return label(parent, w, h, (ctx, cw, ch) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
  }, pos, { brightness: opts.brightness ?? 2.2, ...opts });
}


