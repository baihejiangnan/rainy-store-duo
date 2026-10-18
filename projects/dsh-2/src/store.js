// ─────────────────────────────────────────────────────────────────────────────
// store.js — the konbini shell: chamfered footprint, storefront glass,
// automatic doors, illuminated fascia signs, canopy, roof + rooftop gear.
// Owner: Lead.  All other modules must not touch the store envelope.
// ─────────────────────────────────────────────────────────────────────────────
import {
  Y, LAYOUT, PAL, M, OUTLINE, addOutline, box, boxOn, plane, cylinder, group,
  label, glow, groundSmear, canvasTexture, drawText, drawVerticalText, drawStar,
  roundRect, FONT, rng, mesh, sphere, torus,
} from './core.js';
import * as THREE from 'three';

const S = LAYOUT.store;
const X0 = S.x0, X1 = S.x1, Z0 = S.z0, Z1 = S.z1;
const CH_C = S.chamferCenter, CH_RY = S.chamferRotY, CH_LEN = S.chamferLen;
const WALL = S.wall;
const FLOOR = Y.storeFloor;      // 0.16
const CEIL = Y.storeCeil;        // 2.56
const GB = Y.glassBottom;        // 0.62
const GT = Y.glassTop;           // 2.42
const FASCIA0 = 2.58, FASCIA1 = 3.28;
const ROOF = 3.28;

// ── brand look ──────────────────────────────────────────────────────────────
const CREAM = '#f5f0e2';
const GREEN = '#128a63';
const DEEP = '#0c3b31';
const ORANGE = '#ef8b2c';

function logoMark(ctx, cx, cy, r, inv) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = inv ? CREAM : GREEN;
  ctx.fill();
  // crescent moon
  ctx.fillStyle = inv ? DEEP : CREAM;
  ctx.beginPath();
  ctx.arc(cx - r * 0.12, cy + r * 0.06, r * 0.56, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = inv ? CREAM : GREEN;
  ctx.beginPath();
  ctx.arc(cx + r * 0.2, cy - r * 0.02, r * 0.54, 0, Math.PI * 2);
  ctx.fill();
  drawStar(ctx, cx + r * 0.42, cy - r * 0.46, r * 0.2, inv ? DEEP : CREAM);
  ctx.restore();
}

/** lit-panel base: deep green enamel with a soft internal sheen */
function panelBg(ctx, cw, ch) {
  ctx.fillStyle = '#0a4b3e';
  ctx.fillRect(0, 0, cw, ch);
  const g = ctx.createLinearGradient(0, 0, 0, ch);
  g.addColorStop(0, 'rgba(150,235,205,0.30)');
  g.addColorStop(0.45, 'rgba(110,205,175,0.10)');
  g.addColorStop(1, 'rgba(4,32,27,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cw, ch);
  ctx.strokeStyle = 'rgba(245,240,226,0.45)';
  ctx.lineWidth = ch * 0.018;
  ctx.strokeRect(ch * 0.05, ch * 0.06, cw - ch * 0.1, ch - ch * 0.12);
}

/** south / east fascia lightbox: horizontal lock-up */
function drawBand(ctx, cw, ch) {
  panelBg(ctx, cw, ch);
  // cream base stripe along the bottom
  ctx.fillStyle = CREAM;
  ctx.fillRect(ch * 0.05, ch * 0.9, cw - ch * 0.1, ch * 0.034);
  ctx.fillStyle = ORANGE;
  ctx.fillRect(ch * 0.05, ch * 0.937, cw - ch * 0.1, ch * 0.016);
  // logo
  logoMark(ctx, ch * 0.56, ch * 0.46, ch * 0.29, true);
  // wordmark
  drawText(ctx, 'AKARI MART', ch * 1.0, ch * 0.42, {
    size: ch * 0.34, color: CREAM, font: FONT.en, align: 'left', letterSpacing: ch * 0.045, weight: '800',
  });
  drawText(ctx, 'あかりマート ・ 24時間営業', ch * 1.02, ch * 0.715, {
    size: ch * 0.155, color: '#a8e9cd', font: FONT.jp, align: 'left', letterSpacing: ch * 0.03,
  });
  // 24H pill
  const bx = cw - ch * 0.42;
  ctx.fillStyle = CREAM;
  roundRect(ctx, bx - ch * 0.62, ch * 0.19, ch * 0.78, ch * 0.5, ch * 0.11);
  ctx.fill();
  drawText(ctx, '24H', bx - ch * 0.23, ch * 0.43, { size: ch * 0.3, color: DEEP, font: FONT.en, weight: '800' });
  drawText(ctx, 'OPEN', bx - ch * 0.23, ch * 0.735, { size: ch * 0.11, color: '#8a5a1e', font: FONT.en, weight: '700', letterSpacing: ch * 0.02 });
}

/** corner sign above the automatic door: square-ish lock-up */
function drawCorner(ctx, cw, ch) {
  panelBg(ctx, cw, ch);
  logoMark(ctx, ch * 0.6, ch * 0.44, ch * 0.3, true);
  drawText(ctx, 'あかりマート', ch * 1.02, ch * 0.36, {
    size: ch * 0.23, color: CREAM, font: FONT.jp, align: 'left', letterSpacing: ch * 0.03,
  });
  drawText(ctx, 'AKARI MART', ch * 1.04, ch * 0.61, {
    size: ch * 0.15, color: '#a8e9cd', font: FONT.en, align: 'left', letterSpacing: ch * 0.035, weight: '700',
  });
  drawText(ctx, '24 HOURS', cw - ch * 0.22, ch * 0.75, {
    size: ch * 0.13, color: ORANGE, font: FONT.en, align: 'right', weight: '800', letterSpacing: ch * 0.02,
  });
}

/** roof sign: brand + parking, seen against the sky */
function drawRoof(ctx, cw, ch) {
  ctx.fillStyle = DEEP;
  ctx.fillRect(0, 0, cw, ch);
  ctx.strokeStyle = 'rgba(245,240,226,0.18)';
  ctx.lineWidth = ch * 0.02;
  ctx.strokeRect(ch * 0.04, ch * 0.04, cw - ch * 0.08, ch - ch * 0.08);
  logoMark(ctx, ch * 0.52, ch * 0.48, ch * 0.3);
  drawText(ctx, 'あかりマート', ch * 0.95, ch * 0.38, {
    size: ch * 0.3, color: CREAM, font: FONT.jp, align: 'left', letterSpacing: ch * 0.05, weight: '700',
  });
  drawText(ctx, 'AKARI MART  /  24H  /  P', ch * 0.97, ch * 0.72, {
    size: ch * 0.13, color: '#9fe3c8', font: FONT.en, align: 'left', letterSpacing: ch * 0.045, weight: '600',
  });
}

/** vertical blade sign: two narrow faces */
function drawBlade(ctx, cw, ch) {
  panelBg(ctx, cw, ch);
  drawStar(ctx, cw * 0.5, ch * 0.1, cw * 0.19, ORANGE);
  drawVerticalText(ctx, 'あかりマート', cw * 0.5, ch * 0.46, cw * 0.42, {
    color: CREAM, font: FONT.jp, weight: '700',
  });
  drawText(ctx, '24H', cw * 0.5, ch * 0.845, { size: cw * 0.42, color: CREAM, font: FONT.en, weight: '800' });
  drawText(ctx, 'OPEN', cw * 0.5, ch * 0.915, { size: cw * 0.15, color: '#a8e9cd', font: FONT.en, weight: '700' });
}

/** small window sticker (transparent) */
function sticker(ctx, cw, ch, main, sub, color) {
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = 'rgba(245,240,226,0.92)';
  roundRect(ctx, cw * 0.02, ch * 0.02, cw * 0.96, ch * 0.96, ch * 0.14);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = ch * 0.05;
  roundRect(ctx, cw * 0.02, ch * 0.02, cw * 0.96, ch * 0.96, ch * 0.14);
  ctx.stroke();
  drawText(ctx, main, cw * 0.5, ch * (sub ? 0.4 : 0.5), { size: ch * (sub ? 0.3 : 0.36), color, font: FONT.jp, weight: '700' });
  if (sub) drawText(ctx, sub, cw * 0.5, ch * 0.74, { size: ch * 0.17, color: '#3c4a52', font: FONT.jp });
}

// ── helpers ─────────────────────────────────────────────────────────────────
/** Store footprint as an extruded slab. top = top y, thick = slab height. */
function footprintSlab(parent, top, thick, topMat, sideMat, inset = 0) {
  const sh = new THREE.Shape();
  const x0 = X0 + inset, x1 = X1 - inset, z0 = Z0 + inset, z1 = Z1 - inset;
  sh.moveTo(x0, -z0);
  sh.lineTo(x1, -z0);
  sh.lineTo(x1, -(-0.30 - inset * 1.0));
  sh.lineTo(1.20 + inset * 0.4, -z1);
  sh.lineTo(x0, -z1);
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false, curveSegments: 4 });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, [topMat, sideMat]);
  m.position.y = top - thick;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** A facade in local space: +x along the wall, +z points OUT of the store. */
function facadeGlass(parent, len, opts = {}) {
  const kickH = opts.kickH !== undefined ? opts.kickH : 0.5;
  const kickY = opts.kickY !== undefined ? opts.kickY : 0.12;
  const gb = kickY + kickH;
  const frame = M.toon(0x8d959c);
  const kick = M.toon(opts.kickColor || 0x36414b);
  // lower kick / parapet panel
  if (kickH > 0.02) {
    const kickM = box(parent, [len, kickH, 0.14], [0, kickY + kickH * 0.5, 0], kick, { cast: true, outline: 0.012 });
    // thin cap rail
    box(parent, [len + 0.01, 0.035, 0.16], [0, gb, 0], frame, {});
    void kickM;
  }
  // glass
  const glass = plane(parent, [len - 0.02, GT - gb], [0, (GT + gb) * 0.5, -0.022], M.glass(), { receive: false });
  glass.renderOrder = 2;
  if (opts.sheen !== false) {
    const sh = plane(parent, [len - 0.06, GT - gb], [0, (GT + gb) * 0.5, -0.012], sheenMat(len), {
      receive: false, outline: false,
    });
    sh.renderOrder = 3;
  }
  // bottom & top rails
  box(parent, [len, 0.05, 0.115], [0, gb + 0.02, 0], frame, {});
  box(parent, [len, 0.06, 0.13], [0, GT - 0.01, 0], frame, { cast: true });
  // header band above the glass
  box(parent, [len, 0.2, 0.15], [0, GT + 0.1, 0], M.toon(0xcfc9bd), { cast: true });
  // vertical mullions
  const panes = Math.max(2, Math.round(len / 1.1));
  for (let i = 0; i <= panes; i++) {
    const x = -len / 2 + (len * i) / panes;
    const w = i === 0 || i === panes ? 0.13 : 0.055;
    box(parent, [w, GT - gb, 0.135], [x, (GT + gb) * 0.5, 0], frame, { cast: i === 0 || i === panes });
  }
  return { gb, gt: GT };
}

let _sheenTex = null;
function sheenTexture() {
  if (_sheenTex) return _sheenTex;
  _sheenTex = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    // two soft diagonal reflections
    for (const [x0, wd, a] of [[w * 0.08, w * 0.2, 0.5], [w * 0.52, w * 0.1, 0.28], [w * 0.78, w * 0.16, 0.34]]) {
      const g = ctx.createLinearGradient(x0, h, x0 + wd, 0);
      g.addColorStop(0, 'rgba(190,225,255,0)');
      g.addColorStop(0.45, `rgba(205,235,255,${a})`);
      g.addColorStop(0.55, `rgba(230,245,255,${a})`);
      g.addColorStop(1, 'rgba(190,225,255,0)');
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(x0, 0);
      ctx.transform(1, 0, -0.55, 1, 0, 0);
      ctx.fillRect(x0 - x0, 0, wd, h);
      ctx.restore();
    }
    // faint top-down wipe
    const v = ctx.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, 'rgba(200,230,255,0.20)');
    v.addColorStop(0.35, 'rgba(200,230,255,0.03)');
    v.addColorStop(1, 'rgba(200,230,255,0.10)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }, { anisotropy: 2 });
  return _sheenTex;
}
function sheenMat(len) {
  return new THREE.MeshBasicMaterial({
    map: sheenTexture(), transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
}

// ── main builder ────────────────────────────────────────────────────────────
export function buildStore() {
  const root = new THREE.Group();
  root.name = 'konbini';

  const matWall = M.toon(0xcfc8ba);
  const matWallDark = M.toon(0x8f8a80);
  const matRoof = M.toon(0x333a43);
  const matRoofEdge = M.toon(0x40474f);
  const matMetal = M.toon(0x9aa1a8);
  const matDarkMetal = M.toon(0x2c333b);
  const matFascia = M.toon(0x103f36);
  const matCeil = M.toon(0xe6dfd0);

  // ══ floor / ceiling / roof slabs ══════════════════════════════════════════
  // interior floor tiles
  const floorTex = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#cfc8b8';
    ctx.fillRect(0, 0, w, h);
    const n = 4;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = 0.86 + ((x * 7 + y * 13) % 5) * 0.035;
        ctx.fillStyle = `rgb(${Math.round(214 * v)},${Math.round(206 * v)},${Math.round(190 * v)})`;
        ctx.fillRect((x * w) / n + 2, (y * h) / n + 2, w / n - 4, h / n - 4);
      }
    }
    ctx.strokeStyle = 'rgba(120,112,98,0.55)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath(); ctx.moveTo((i * w) / n, 0); ctx.lineTo((i * w) / n, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (i * h) / n); ctx.lineTo(w, (i * h) / n); ctx.stroke();
    }
  }, { wrap: true, repeat: [3, 3] });
  const floorMat = new THREE.MeshToonMaterial({ color: 0xffffff, map: floorTex });
  const plinthMat = M.toon(0x3a4048);
  footprintSlab(root, FLOOR, FLOOR, floorMat, plinthMat);
  // interior ceiling
  const ceilTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e8e2d4';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(160,152,136,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, h);
  }, { wrap: true, repeat: [6, 4] });
  const ceilMat = new THREE.MeshToonMaterial({ color: 0xffffff, map: ceilTex });
  footprintSlab(root, CEIL + 0.14, 0.14, ceilMat, matWall, 0.0);
  // roof deck
  footprintSlab(root, ROOF + 0.14, 0.14, matRoof, matRoofEdge);

  // ══ side walls (west / north) ═════════════════════════════════════════════
  const wallTop = ROOF + 0.06;
  const westWall = box(root, [WALL, wallTop - 0.12, Z1 - Z0], [X0 + WALL / 2, (wallTop + 0.12) / 2, (Z0 + Z1) / 2], matWall, {
    cast: true, outline: OUTLINE,
  });
  const northWall = box(root, [X1 - X0 - WALL, wallTop - 0.12, WALL], [X0 + (X1 - X0 - WALL) / 2 + WALL / 2, (wallTop + 0.12) / 2, Z0 + WALL / 2], matWall, {
    cast: true, outline: OUTLINE,
  });
  void westWall; void northWall;
  // a darker plinth line at the bottom of the side walls
  box(root, [WALL + 0.02, 0.16, Z1 - Z0], [X0 + WALL / 2, 0.2, (Z0 + Z1) / 2], matWallDark, {});
  box(root, [X1 - X0, 0.16, WALL + 0.02], [(X0 + X1) / 2, 0.2, Z0 + WALL / 2], matWallDark, {});

  // ══ facades ══════════════════════════════════════════════════════════════
  // south facade (faces +z)
  const southLen = 1.2 - X0; // -3.2 .. 1.2
  const southG = group(root, [(-3.2 + 1.2) / 2, 0, Z1], 'facade-south');
  facadeGlass(southG, southLen, {});

  // east facade (faces +x)
  const eastLen = -0.3 - Z0; // -3.2 .. -0.3
  const eastG = group(root, [X1, 0, (Z0 + -0.3) / 2], 'facade-east');
  eastG.rotation.y = Math.PI / 2;
  facadeGlass(eastG, eastLen, {});

  // chamfered entrance facade
  const chG = group(root, [CH_C[0], 0, CH_C[1]], 'facade-chamfer');
  chG.rotation.y = CH_RY;

  // ══ fascia sign band ═════════════════════════════════════════════════════
  const bandH = FASCIA1 - FASCIA0;        // 0.70
  const bandY = (FASCIA0 + FASCIA1) / 2;  // 2.93
  // south
  box(southG, [southLen + 0.1, bandH, 0.20], [0, bandY, 0.015], matFascia, { cast: true, outline: OUTLINE });
  label(southG, southLen - 0.16, bandH - 0.16, drawBand, [0, bandY, 0.118], {
    px: 400, brightness: 1.34,
  });
  // east
  box(eastG, [eastLen + 0.1, bandH, 0.20], [0, bandY, 0.015], matFascia, { cast: true, outline: OUTLINE });
  // east sign: mirrored layout (draw flipped by using a ry = PI label)
  label(eastG, eastLen - 0.12, bandH - 0.16, drawBand, [0, bandY, 0.118], { px: 400, brightness: 1.34 });
  // chamfer
  box(chG, [CH_LEN + 0.06, bandH, 0.22], [0, bandY, 0.015], matFascia, { cast: true, outline: OUTLINE });
  label(chG, CH_LEN - 0.06, bandH - 0.12, drawCorner, [0, bandY, 0.128], { px: 460, brightness: 1.32 });
  // fascia glow wipes on the ground in front of the shop
  groundSmear(root, 0x9ff0d8, 3.4, 2.2, [-1.0, 0.132, 2.2], { opacity: 0.1 });
  groundSmear(root, 0x7fe6c8, 2.6, 1.8, [3.0, 0.132, 0.5], { opacity: 0.09, ry: Math.PI / 2 });

  // ══ corners / pilasters ══════════════════════════════════════════════════
  const cornerPosts = [];
  for (const [px, pz] of [[-3.2, 1.0], [1.2, 1.0], [X1, -0.3], [X1, Z0]]) {
    cornerPosts.push(box(root, [0.17, 3.14, 0.17], [px, 0.12 + 1.57, pz], M.toon(0xb9b3a6), {
      cast: true, outline: OUTLINE,
    }));
  }
  // squashed pilaster bases
  for (const [px, pz] of [[-3.2, 1.0], [1.2, 1.0], [X1, -0.3]]) {
    box(root, [0.22, 0.5, 0.22], [px, 0.37, pz], M.toon(0x3b444d), {});
  }

  // ══ automatic doors on the chamfer ═══════════════════════════════════════
  const doorFrameMat = M.toon(0x7c848c);
  const halfCh = CH_LEN / 2;            // 0.955
  const fixedW = 0.455;                 // fixed side pane
  const slideW = halfCh - fixedW;       // 0.5 sliding pane
  // low bottom rail across the whole entrance
  box(chG, [CH_LEN, 0.055, 0.16], [0, 0.19, 0], doorFrameMat, { cast: true });
  // floor threshold
  box(chG, [CH_LEN + 0.12, 0.03, 0.30], [0, 0.135, 0.13], matMetal, {});
  // fixed panes at both ends
  for (const sgn of [-1, 1]) {
    const cx = sgn * (halfCh - fixedW / 2);
    plane(chG, [fixedW - 0.05, 2.24], [cx, 1.34, -0.02], M.glass(), { receive: false }).renderOrder = 2;
    box(chG, [fixedW, 0.06, 0.14], [cx, 0.24, 0], doorFrameMat, {});
    box(chG, [fixedW, 0.07, 0.14], [cx, 2.42, 0], doorFrameMat, {});
  }
  // vertical posts
  for (const x of [-halfCh, -fixedW, 0, fixedW, halfCh]) {
    box(chG, [x === 0 ? 0.06 : 0.075, 2.34, 0.155], [x, 1.35, 0], doorFrameMat, { cast: true });
  }
  // header beam above the doors
  box(chG, [CH_LEN, 0.22, 0.17], [0, GT + 0.06, 0], M.toon(0xcfc9bd), { cast: true });
  // sensor box + auto-door sticker
  box(chG, [0.22, 0.09, 0.1], [0, GT - 0.06, 0.02], matDarkMetal, {});
  label(chG, 0.62, 0.16, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(20,30,40,0.55)';
    roundRect(ctx, 0, 0, w, h, h * 0.2); ctx.fill();
    drawText(ctx, '自動ドア', w * 0.5, h * 0.5, { size: h * 0.62, color: '#dfe8ee', font: FONT.jp });
  }, [0, 2.18, 0.075], { px: 300 });

  // sliding panels
  const doors = [];
  for (const sgn of [-1, 1]) {
    const dg = group(chG, [sgn * slideW / 2, 0, 0.005], 'door-' + (sgn < 0 ? 'L' : 'R'));
    // frame: 4 thin rails
    const fm = M.toon(0x8f979e);
    box(dg, [slideW, 0.07, 0.05], [0, 0.235, 0], fm, {});
    box(dg, [slideW, 0.07, 0.05], [0, 2.4, 0], fm, {});
    box(dg, [0.045, 2.24, 0.05], [-slideW / 2 + 0.022, 1.33, 0], fm, {});
    box(dg, [0.045, 2.24, 0.05], [slideW / 2 - 0.022, 1.33, 0], fm, {});
    plane(dg, [slideW - 0.08, 2.2], [0, 1.33, 0], M.glass(), { receive: false }).renderOrder = 2;
    // push bar + handle
    box(dg, [slideW * 0.5, 0.05, 0.06], [0, 1.02, 0.045], M.toon(0xb8c0c6), {});
    // small sticker
    label(dg, 0.24, 0.095, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      drawText(ctx, 'OPEN', w * 0.5, h * 0.5, { size: h * 0.8, color: '#7de3bd', font: FONT.en, weight: '800' });
    }, [0, 1.55, 0.03], { px: 300 });
    // outline for the door frame
    doors.push({ g: dg, base: sgn * slideW / 2, dir: sgn });
  }

  // ══ canopy / eave ════════════════════════════════════════════════════════
  const canopyY = 2.5, canH = 0.13, canFront = 0.18;
  const canopyMat = M.toon(0x2b3138);
  const canopyEdge = M.toon(0xa8a89c);
  // south canopy
  const cS = box(root, [southLen + 0.3, canH, 0.95], [-1.0, canopyY, Z1 + 0.475], canopyMat, { cast: true, outline: OUTLINE });
  void cS;
  box(root, [southLen + 0.3, canFront, 0.07], [-1.0, canopyY - 0.005, Z1 + 0.945], canopyEdge, { cast: true, outline: 0.01 });
  // chamfer canopy
  box(chG, [CH_LEN + 0.42, canH, 0.98], [0, canopyY, 0.49], canopyMat, { cast: true, outline: OUTLINE });
  box(chG, [CH_LEN + 0.42, canFront, 0.07], [0, canopyY - 0.005, 0.975], canopyEdge, { cast: true, outline: 0.01 });
  // east canopy
  const eastCanLen = 2.5;
  const eG2 = group(root, [X1 + 0.475, 0, -1.45], 'canopy-east');
  eG2.rotation.y = Math.PI / 2;
  box(eG2, [eastCanLen, canH, 0.95], [0, canopyY, 0], canopyMat, { cast: true, outline: OUTLINE });
  box(eG2, [eastCanLen, canFront, 0.07], [0, canopyY - 0.005, 0.474], canopyEdge, { cast: true, outline: 0.01 });

  // downlights under the canopy  (warm pools on the wet pavement)
  const downTex = canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,240,210,1)');
    g.addColorStop(0.55, 'rgba(255,226,170,0.65)');
    g.addColorStop(1, 'rgba(255,210,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const downMat = new THREE.MeshBasicMaterial({ map: downTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const downPositions = [
    [-2.55, 1.42], [-1.0, 1.42], [0.55, 1.42],
    [2.28, 0.78], [2.0, 0.24],
    [3.05, -0.75], [3.05, -1.9],
  ];
  const flickerLights = [];
  for (let i = 0; i < downPositions.length; i++) {
    const [px, pz] = downPositions[i];
    const dmat = i === 4 ? downMat.clone() : downMat;
    const disc = plane(root, [0.34, 0.34], [px, canopyY - canH / 2 - 0.006, pz], dmat, { rx: Math.PI / 2, receive: false });
    disc.renderOrder = 4;
    glow(root, 0xffd9a0, 0.5, [px, canopyY - 0.11, pz], { opacity: 0.22 });
    groundSmear(root, 0xffc98a, 1.5, 1.9, [px, 0.126, pz + 0.12], { opacity: 0.3 });
    if (i === 4) flickerLights.push(disc);
  }

  // ══ exterior wall fittings ═══════════════════════════════════════════════
  // downpipes at the outer corners
  const pipeMat = M.toon(0x565e66);
  for (const [px, pz] of [[X0 - 0.02, 0.98], [X1 + 0.02, Z0 - 0.02]]) {
    cylinder(root, 0.055, 0.055, 3.1, [px, 0.12 + 1.55, pz], pipeMat, { seg: 10 });
    box(root, [0.14, 0.16, 0.14], [px, 0.2, pz], matDarkMetal, {});
  }
  // west wall (alley side): service door, vent, wall lamp
  const alleyDoor = box(root, [0.06, 2.0, 0.9], [X0 - 0.03, 1.12, -1.15], M.toon(0x6c737a), { cast: true });
  void alleyDoor;
  box(root, [0.04, 0.1, 0.1], [X0 - 0.08, 1.05, -0.72], matMetal, {});
  // louvered vent
  for (let i = 0; i < 4; i++) box(root, [0.05, 0.03, 0.66], [X0 - 0.05, 1.9 + i * 0.07, -2.0], M.toon(0x3a424a), {});
  box(root, [0.06, 0.32, 0.72], [X0 - 0.04, 2.03, -2.0], M.toon(0x2c343c), {});
  // alley wall lamp
  box(root, [0.12, 0.1, 0.16], [X0 - 0.08, 2.42, -0.3], matDarkMetal, {});
  glow(root, 0xffd2a0, 0.75, [X0 - 0.16, 2.36, -0.3], { opacity: 0.5 });
  // north wall: service door + vents
  box(root, [0.9, 2.0, 0.05], [-2.0, 1.12, Z0 - 0.03], M.toon(0x6c737a), { cast: true });
  box(root, [0.9, 0.09, 0.08], [-2.0, 2.14, Z0 - 0.05], matMetal, {});
  for (let i = 0; i < 3; i++) box(root, [0.9, 0.03, 0.05], [1.0, 2.0 + i * 0.08, Z0 - 0.05], M.toon(0x3a424a), {});
  // small wall spot over the alley mouth
  box(root, [0.1, 0.12, 0.1], [X0 - 0.06, 2.6, 0.75], matDarkMetal, {});

  // ══ glass stickers ═══════════════════════════════════════════════════════
  const stickers = [
    { g: southG, x: -2.35, y: 1.62, w: 0.46, h: 0.3, main: 'ATM', sub: '24時間', color: '#1d6f5a' },
    { g: southG, x: 0.15, y: 0.98, w: 0.44, h: 0.28, main: 'コーヒー', sub: '100円', color: '#8a4a1f' },
    { g: eastG, x: -1.05, y: 1.55, w: 0.42, h: 0.28, main: 'からあげ', sub: '好評発売中', color: '#a03a1e' },
  ];
  for (const s of stickers) {
    label(s.g, s.w, s.h, (ctx, w, h) => sticker(ctx, w, h, s.main, s.sub, s.color), [s.x, s.y, -0.012], {
      px: 400, opacity: 0.92,
    });
  }

  // ══ doormat ═════════════════════════════════════════════════════════════
  const matPos = [CH_C[0] + 0.681 * 0.62, 0.125, CH_C[1] + 0.733 * 0.62];
  const doormatTex = canvasTexture(512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#1d2126';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2d3238';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    drawText(ctx, 'あかりマート', w * 0.5, h * 0.42, { size: h * 0.17, color: '#6d777f', font: FONT.jp, letterSpacing: 4 });
    drawText(ctx, 'WELCOME', w * 0.5, h * 0.66, { size: h * 0.11, color: '#4d565e', font: FONT.en, letterSpacing: 6 });
  });
  const doormat = plane(root, [1.42, 0.86], matPos, new THREE.MeshToonMaterial({ map: doormatTex }), {
    rx: -Math.PI / 2, rz: 0, receive: true,
  });
  doormat.rotation.z = -CH_RY;

  // ══ roof-top gear ═══════════════════════════════════════════════════════
  const roofTop = ROOF + 0.14;
  const acMat = M.toon(0xbdb7a9);
  const acFan = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#9a9488'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.46, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#6b675e'; ctx.lineWidth = 5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w * 0.36, (i * Math.PI) / 2 + 0.3, (i * Math.PI) / 2 + 0.95);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.1, 0, Math.PI * 2); ctx.fillStyle = '#cfc9bc'; ctx.fill();
  });
  const acs = [[-2.45, -2.35, 0], [-1.25, -2.75, Math.PI / 2], [1.35, -2.5, 0]];
  for (const [ax, az, ar] of acs) {
    const ag = group(root, [ax, roofTop, az], 'ac');
    ag.rotation.y = ar;
    box(ag, [0.98, 0.62, 0.46], [0, 0.35, 0], acMat, { cast: true, outline: 0.012 });
    plane(ag, [0.42, 0.42], [0, 0.35, 0.235], new THREE.MeshToonMaterial({ map: acFan }), { receive: false });
    box(ag, [1.02, 0.05, 0.5], [0, 0.68, 0], M.toon(0x8e887c), {});
    for (const fx of [-0.42, 0.42]) box(ag, [0.08, 0.1, 0.06], [fx, 0.05, 0.16], matDarkMetal, {});
  }
  // roof hatch + railing (back edge)
  box(root, [0.8, 0.14, 0.8], [1.9, roofTop + 0.07, -2.9], matDarkMetal, { outline: 0.012 });
  box(root, [0.9, 0.1, 0.9], [1.9, roofTop + 0.16, -2.9], M.toon(0x3c444c), {});
  // vents
  cylinder(root, 0.16, 0.16, 0.45, [-3.0, roofTop + 0.22, -2.6], M.toon(0x6b7379), { seg: 12 });
  cylinder(root, 0.21, 0.21, 0.06, [-3.0, roofTop + 0.46, -2.6], M.toon(0x50575d), { seg: 12 });
  cylinder(root, 0.12, 0.12, 0.6, [-0.1, roofTop + 0.3, -2.95], M.toon(0x6b7379), { seg: 10 });
  // antenna mast + dish
  cylinder(root, 0.03, 0.035, 1.5, [-3.05, roofTop + 0.75, -1.2], matMetal, { seg: 8 });
  for (let i = 0; i < 3; i++) box(root, [0.7 - i * 0.16, 0.02, 0.02], [-3.05, roofTop + 1.2 + i * 0.14, -1.2], matMetal, {});
  const dish = sphere(root, 0.26, [1.9, roofTop + 0.55, -1.5], M.toon(0xcfc9bb), { seg: 12, segY: 8 });
  dish.scale.set(1, 1, 0.32);
  dish.rotation.y = 0.7;
  box(root, [0.05, 0.5, 0.05], [1.9, roofTop + 0.25, -1.5], matMetal, {});
  // cable conduit across the roof
  box(root, [5.0, 0.06, 0.1], [-0.5, roofTop + 0.04, -1.9], M.toon(0x4a525a), {});
  // roof edge parapet on the back + sides (front is the sign band)
  const parapetMat = M.toon(0x3a4149);
  box(root, [X1 - X0, 0.22, 0.1], [(X0 + X1) / 2, ROOF + 0.14 + 0.11, Z0 + 0.05], parapetMat, { cast: true });
  box(root, [0.1, 0.22, Z1 - Z0], [X0 + 0.05, ROOF + 0.14 + 0.11, (Z0 + Z1) / 2], parapetMat, { cast: true });
  box(root, [0.1, 0.22, Z1 - Z0], [X1 - 0.05, ROOF + 0.14 + 0.11, (Z0 + Z1) / 2], parapetMat, { cast: true });
  // lighter capping band so the roof silhouette reads from above
  const capMat = M.toon(0x59626d);
  box(root, [X1 - X0 + 0.02, 0.045, 0.12], [(X0 + X1) / 2, ROOF + 0.14 + 0.23, Z0 + 0.05], capMat, {});
  box(root, [0.12, 0.045, Z1 - Z0 + 0.02], [X0 + 0.05, ROOF + 0.14 + 0.23, (Z0 + Z1) / 2], capMat, {});
  box(root, [0.12, 0.045, Z1 - Z0 + 0.02], [X1 - 0.05, ROOF + 0.14 + 0.23, (Z0 + Z1) / 2], capMat, {});

  // ── front half of the roof: it is fully visible from high orbit angles ──
  // second condenser + vent stack + stacked crates, all behind the sign line
  const acG2 = group(root, [-2.3, roofTop, -1.35], 'ac2');
  acG2.rotation.y = -0.28;
  box(acG2, [0.92, 0.52, 0.44], [0, 0.29, 0], acMat, { cast: true, outline: 0.012 });
  plane(acG2, [0.4, 0.4], [0, 0.29, 0.225], new THREE.MeshToonMaterial({ map: acFan }), { receive: false });
  box(acG2, [0.96, 0.05, 0.48], [0, 0.57, 0], M.toon(0x8e887c), {});
  cylinder(root, 0.13, 0.13, 0.34, [-1.55, roofTop + 0.17, -0.15], M.toon(0x6b7379), { seg: 12 });
  cylinder(root, 0.18, 0.18, 0.05, [-1.55, roofTop + 0.36, -0.15], M.toon(0x50575d), { seg: 12 });
  // crates + a coil of hose, small scale props to fill the dead area
  box(root, [0.42, 0.26, 0.32], [-2.55, roofTop + 0.13, -0.75], M.toon(0x7d6a52), { cast: true, outline: 0.01 });
  box(root, [0.42, 0.26, 0.32], [-2.55, roofTop + 0.39, -0.75], M.toon(0x6f5d48), { cast: true, outline: 0.01 });
  box(root, [0.36, 0.22, 0.28], [-2.08, roofTop + 0.11, -0.62], M.toon(0x8a7a62), { cast: true, outline: 0.01 });
  torus(root, 0.16, 0.035, [-1.05, roofTop + 0.045, -0.85], M.toon(0x2f3a33), { rx: Math.PI / 2, seg: 8, segR: 14 });
  // wet patches: a thin dark film with a faint sky sheen
  for (const [px, pz, rw, rh] of [[-0.6, 0.15, 1.5, 0.85], [1.3, -1.35, 1.1, 0.6], [-2.7, 0.35, 0.8, 0.55]]) {
    plane(root, [rw, rh], [px, roofTop + 0.004, pz], M.emit(0x16243a, { opacity: 0.72, transparent: true }), {
      rx: -Math.PI / 2, receive: false, renderOrder: 3,
    });
  }

  // ══ rooftop sign (brand + P) ═════════════════════════════════════════════
  const signY0 = roofTop + 0.12;
  const roofSignW = 3.3, roofSignH = 0.78;
  const signZ = Z1 - 0.06;
  const rsG = group(root, [-1.0, signY0, signZ], 'roof-sign');
  for (const px of [-roofSignW * 0.4, roofSignW * 0.4]) {
    box(rsG, [0.08, 1.1, 0.08], [px, 0.55, -0.06], matMetal, { cast: true });
    box(rsG, [0.3, 0.05, 0.3], [px, 0.03, -0.06], matDarkMetal, {});
  }
  const rsPanel = box(rsG, [roofSignW, roofSignH, 0.1], [0, 1.02, 0], matFascia, { cast: true, outline: OUTLINE });
  void rsPanel;
  label(rsG, roofSignW - 0.06, roofSignH - 0.06, drawRoof, [0, 1.02, 0.058], { px: 420, brightness: 1.18 });
  label(rsG, roofSignW - 0.06, roofSignH - 0.06, drawRoof, [0, 1.02, -0.058], { px: 420, brightness: 0.7, ry: Math.PI });
  glow(rsG, 0x8fe8c9, 2.4, [-0.6, 1.05, 0.16], { opacity: 0.18 });

  // ══ vertical blade sign on the east facade ══════════════════════════════
  const blade = group(root, [X1 + 0.01, 0, -0.62], 'blade-sign');
  // bracket arm projecting out of the east wall
  box(blade, [0.62, 0.08, 0.08], [0.31, 2.96, 0], matMetal, { cast: true });
  box(blade, [0.05, 1.3, 0.05], [0.3, 3.58, 0], matMetal, {});
  box(blade, [0.05, 0.05, 0.34], [0.3, 4.2, 0], matMetal, {});
  // board: wide faces point +/-z  (so the street camera reads it)
  const bladePanel = box(blade, [0.62, 1.3, 0.1], [0.36, 3.52, 0], matFascia, { cast: true, outline: OUTLINE });
  void bladePanel;
  const bladeLabelA = label(blade, 0.56, 1.24, drawBlade, [0.36, 3.52, 0.056], { px: 460, brightness: 1.42 });
  const bladeLabelB = label(blade, 0.56, 1.24, drawBlade, [0.36, 3.52, -0.056], { px: 460, brightness: 1.1, ry: Math.PI });
  glow(blade, 0xfff0cc, 0.9, [0.36, 3.5, 0], { opacity: 0.3 });

  // ══ door spill light ════════════════════════════════════════════════════
  const doorLight = new THREE.PointLight(0xffcf94, 2.6, 4.6, 2);
  doorLight.position.set(2.15, 2.1, 0.95);
  doorLight.castShadow = false;
  root.add(doorLight);
  // warm light spilling out of the shopfront onto the wet pavement / bikes
  for (const [sx, sy, sz, si, sd] of [
    [-2.55, 1.05, 1.6, 3.1, 5.2],
    [-1.15, 1.05, 1.64, 3.4, 5.4],
    [0.35, 1.05, 1.64, 3.4, 5.4],
    [1.85, 1.05, 1.1, 3.0, 4.8],
    [3.28, 1.05, 0.1, 3.2, 5.0],
    [3.0, 1.05, -1.5, 2.8, 4.6],
    [3.0, 1.05, -2.85, 2.4, 4.2],
  ]) {
    const pl = new THREE.PointLight(0xffc890, si, sd, 2);
    pl.position.set(sx, sy, sz);
    pl.castShadow = false;
    root.add(pl);
  }
  // canopy strip lights: a subtle cool rim on the sign band
  glow(root, 0x8fe8c9, 4.6, [-1.0, 2.95, 1.35], { opacity: 0.1 });

  // ══ animation ═══════════════════════════════════════════════════════════
  const rnd = rng(7);
  const flickerBase = new THREE.Color(1, 1, 1);
  let flickerT = 0;
  const update = (t, dt) => {
    flickerT += dt;
    // automatic doors: closed, then drift open, hold, close again (irregular)
    const cyc = 27 + Math.sin(t * 0.11) * 3;
    const tc = ((t % cyc) + cyc) % cyc;
    let open = 0;
    const t0 = 7.4, t1 = 8.7, t2 = 13.2, t3 = 14.5;
    if (tc > t0 && tc < t1) open = smooth((tc - t0) / (t1 - t0));
    else if (tc >= t1 && tc < t2) open = 1;
    else if (tc >= t2 && tc < t3) open = 1 - smooth((tc - t2) / (t3 - t2));
    const slide = open * 0.47;
    for (const d of doors) d.g.position.x = d.base + d.dir * slide;
    // sign flutter: a rare slow dip on the blade sign
    const fl = Math.sin(t * 0.7) * Math.sin(t * 2.3 + 1.2) * Math.sin(t * 5.1 + 0.4);
    const dip = fl > 0.86 ? 0.45 + 0.55 * (1 - (fl - 0.86) / 0.14) : 1;
    const b = 1.4 * dip;
    bladeLabelA.material.color.setScalar(b);
    bladeLabelB.material.color.setScalar(b);
    // a dying fluorescent tube over the door
    const tube = Math.sin(t * 31.0) * Math.sin(t * 7.3);
    const tf = tube > 0.55 && Math.sin(t * 0.31) > 0.4 ? 0.25 : 1;
    if (flickerLights.length) flickerLights[0].material.opacity = 0.85 * tf;
    void flickerBase; void flickerT; void rnd;
  };

  return { group: root, update };
}

function smooth(x) {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

















