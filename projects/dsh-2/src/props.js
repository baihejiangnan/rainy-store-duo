// ═════════════════════════════════════════════════════════════════════════════
//  props.js — 街具 (street furniture of the rainy-night konbini corner)
//
//  vending machines ×2 · mamachari ×2 · umbrella stand · 3-bin recycling box ·
//  street lamp · utility pole + overhead wires · traffic signal (animated) ·
//  corner guardrail · notice board · direction signs · AC units · clutter.
//
//  Everything stands on the pavement (Y.sidewalk = 0.12) or the road (0.0).
//  No lights, no standard/physical materials — core.js vocabulary only.
//  Repeated parts (frame tubes, spokes, posts, insulators) go through
//  InstancedMesh so the module stays well inside the draw-call budget.
// ═════════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import {
  PAL, Y, M, mesh, box, boxOn, plane, cylinder, sphere, torus, group,
  label, glow, groundSmear, addOutline, addOutlineInstanced, canvasTexture,
  drawText, drawVerticalText, roundRect, rng, FONT,
} from './core.js';

const SIDE = Y.sidewalk;            // 0.12 — pavement surface
const OUT = 0.016;                  // outline width for the big props
const TAU = Math.PI * 2;

// ── unit geometries shared by every InstancedMesh ───────────────────────────
const UG = {
  cyl: new THREE.CylinderGeometry(1, 1, 1, 6, 1),
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 10, 8),
};

const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _m4 = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

/** One InstancedMesh out of a list of { p, q|r, s, c } transforms. */
function instanced(parent, geo, mat, list, opts = {}) {
  if (!list.length) return null;
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  let tinted = false;
  for (let i = 0; i < list.length; i++) {
    const x = list[i];
    _p.set(x.p[0], x.p[1], x.p[2]);
    if (x.q) _q.copy(x.q);
    else { _e.set(x.r ? x.r[0] : 0, x.r ? x.r[1] : 0, x.r ? x.r[2] : 0); _q.setFromEuler(_e); }
    if (typeof x.s === 'number') _s.setScalar(x.s);
    else if (x.s) _s.set(x.s[0], x.s[1], x.s[2]);
    else _s.set(1, 1, 1);
    _m4.compose(_p, _q, _s);
    im.setMatrixAt(i, _m4);
    if (x.c !== undefined) { im.setColorAt(i, _c.set(x.c)); tinted = true; }
  }
  im.count = list.length;
  im.instanceMatrix.needsUpdate = true;
  if (tinted && im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = !!opts.cast;
  im.receiveShadow = opts.receive !== false;
  if (opts.name) im.name = opts.name;
  parent.add(im);
  if (opts.outline) addOutlineInstanced(im, opts.outline === true ? OUT : opts.outline);
  return im;
}

/** Transform for a unit cylinder stretched between two points. */
function bar(a, b, r, c) {
  _v0.set(a[0], a[1], a[2]);
  _v1.set(b[0], b[1], b[2]).sub(_v0);
  const len = _v1.length() || 1e-4;
  const q = new THREE.Quaternion().setFromUnitVectors(UP, _v1.clone().normalize());
  return {
    p: [_v0.x + _v1.x * 0.5, _v0.y + _v1.y * 0.5, _v0.z + _v1.z * 0.5],
    q, s: [r, len, r], c,
  };
}

/** Batch of thin round bars (frame tubes, posts, spokes …) — one draw call. */
function bars(parent, list, mat, opts) {
  return instanced(parent, UG.cyl, mat, list, opts);
}

/** A sagging overhead wire between two world points. */
function wire(parent, a, b, sag, mat, r = 0.014, seg = 20) {
  const pts = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    pts.push(new THREE.Vector3(
      a[0] + (b[0] - a[0]) * u,
      a[1] + (b[1] - a[1]) * u - sag * Math.sin(Math.PI * u),
      a[2] + (b[2] - a[2]) * u,
    ));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const m = mesh(parent, new THREE.TubeGeometry(curve, seg, r, 4, false), mat, [0, 0, 0], {
    receive: false, name: 'overheadWire',
  });
  return m;
}

// ═════════════════════════════════════════════════════════════════════════════
//  canvas artwork
// ═════════════════════════════════════════════════════════════════════════════

/** lighten (+) / darken (−) a 0xRRGGBB colour into a css string */
function shade(hex, amt) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

/** Shelves of chilled cans / bottles behind the vending-machine glass. */
function drinkWindow(t) {
  return (ctx, cw, ch) => {
    ctx.fillStyle = '#070a0f';
    ctx.fillRect(0, 0, cw, ch);
    const back = ctx.createLinearGradient(0, 0, 0, ch);
    back.addColorStop(0, t.backTop);
    back.addColorStop(0.45, 'rgba(140,190,235,0.09)');
    back.addColorStop(1, 'rgba(3,5,9,0)');
    ctx.fillStyle = back;
    ctx.fillRect(0, 0, cw, ch);

    // vertical promo strip on the left (つめた〜い / あったか〜い)
    const tagW = Math.round(cw * 0.105);
    const tg = ctx.createLinearGradient(0, 0, tagW, 0);
    tg.addColorStop(0, t.tag0);
    tg.addColorStop(1, t.tag1);
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, tagW, ch);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(tagW - Math.max(1, cw * 0.004), 0, Math.max(1, cw * 0.004), ch);
    drawVerticalText(ctx, t.vertical, tagW * 0.5, ch * 0.5, tagW * 0.5, {
      color: t.tagInk, font: FONT.jp, gap: tagW * 0.74, weight: 'bold',
    });

    const rnd = rng(t.seed);
    const rows = 3;
    const cols = 6;
    const x0 = tagW + cw * 0.022;
    const padR = cw * 0.018;
    const rowH = (ch * 0.84) / rows;
    const colW = (cw - x0 - padR) / cols;

    for (let r = 0; r < rows; r++) {
      const baseY = ch * 0.055 + rowH * (r + 1);
      for (let c = 0; c < cols; c++) {
        const cx = x0 + colW * (c + 0.5) + (rnd() - 0.5) * colW * 0.06;
        const col = t.colors[Math.floor(rnd() * t.colors.length) % t.colors.length];
        if (rnd() < 0.6) {
          // ── can ──
          const w = colW * 0.5;
          const h = rowH * 0.58;
          const x = cx - w / 2;
          const y = baseY - rowH * 0.16 - h;
          const lg = ctx.createLinearGradient(x, 0, x + w, 0);
          lg.addColorStop(0, shade(col, -0.34));
          lg.addColorStop(0.26, shade(col, 0));
          lg.addColorStop(0.54, shade(col, 0.3));
          lg.addColorStop(1, shade(col, -0.38));
          ctx.fillStyle = lg;
          roundRect(ctx, x, y, w, h, w * 0.18);
          ctx.fill();
          ctx.fillStyle = 'rgba(246,249,252,0.9)';
          ctx.fillRect(x, y + h * 0.36, w, h * 0.22);
          ctx.fillStyle = shade(col, -0.18);
          ctx.fillRect(x + w * 0.16, y + h * 0.44, w * 0.68, h * 0.06);
          ctx.fillStyle = 'rgba(208,222,236,0.95)';
          ctx.beginPath();
          ctx.ellipse(cx, y + w * 0.085, w * 0.5, w * 0.13, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.fillRect(x + w * 0.1, y + h * 0.1, w * 0.07, h * 0.7);
        } else {
          // ── PET bottle ──
          const w = colW * 0.33;
          const h = rowH * 0.66;
          const x = cx - w / 2;
          const y = baseY - rowH * 0.16 - h;
          const lg = ctx.createLinearGradient(x, 0, x + w, 0);
          lg.addColorStop(0, shade(col, -0.3));
          lg.addColorStop(0.42, shade(col, 0.26));
          lg.addColorStop(1, shade(col, -0.36));
          ctx.fillStyle = lg;
          roundRect(ctx, x, y + h * 0.24, w, h * 0.76, w * 0.26);
          ctx.fill();
          ctx.fillStyle = shade(col, -0.12);
          ctx.fillRect(cx - w * 0.19, y + h * 0.08, w * 0.38, h * 0.2);
          ctx.fillStyle = t.cap;
          ctx.fillRect(cx - w * 0.26, y, w * 0.52, h * 0.075);
          ctx.fillStyle = 'rgba(250,250,246,0.88)';
          ctx.fillRect(x, y + h * 0.47, w, h * 0.19);
          ctx.fillStyle = shade(col, -0.22);
          ctx.fillRect(x + w * 0.14, y + h * 0.53, w * 0.72, h * 0.05);
          ctx.fillStyle = 'rgba(255,255,255,0.42)';
          ctx.fillRect(x + w * 0.14, y + h * 0.28, w * 0.07, h * 0.6);
        }
        // price chip under each column item
        ctx.fillStyle = 'rgba(6,8,12,0.6)';
        ctx.fillRect(cx - colW * 0.14, baseY - rowH * 0.045, colW * 0.28, rowH * 0.12);
        drawText(ctx, t.prices[Math.floor(rnd() * t.prices.length)],
          cx, baseY + rowH * 0.017, {
            size: rowH * 0.105, color: t.priceInk, font: FONT.en, weight: '700',
          });
      }
      // glass shelf plate
      ctx.fillStyle = 'rgba(126,146,168,0.3)';
      ctx.fillRect(x0 - cw * 0.012, baseY + rowH * 0.005, cw - x0 - padR + cw * 0.012, Math.max(2, ch * 0.009));
    }

    // selection button row under the window
    const by = ch * 0.925;
    const bh = ch * 0.045;
    for (let i = 0; i < cols + 2; i++) {
      const bx = x0 + ((cw - x0 - padR) / (cols + 2)) * (i + 0.5);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(120,215,255,0.85)' : 'rgba(58,74,92,0.9)';
      roundRect(ctx, bx - colW * 0.11, by, colW * 0.22, bh, bh * 0.3);
      ctx.fill();
    }
  };
}

/** Top light box: brand band that lights the machine's front. */
function lightbox(t) {
  return (ctx, cw, ch) => {
    const g = ctx.createLinearGradient(0, 0, cw, 0);
    g.addColorStop(0, t.lb0);
    g.addColorStop(0.52, t.lb1);
    g.addColorStop(1, t.lb2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);
    const v = ctx.createLinearGradient(0, 0, 0, ch);
    v.addColorStop(0, 'rgba(255,255,255,0.38)');
    v.addColorStop(0.45, 'rgba(255,255,255,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.24)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, cw, ch);
    drawText(ctx, t.brand, cw * 0.3, ch * 0.56, {
      size: ch * 0.5, color: '#ffffff', font: FONT.en, weight: '800', letterSpacing: ch * 0.06,
    });
    drawText(ctx, t.tagline, cw * 0.72, ch * 0.54, {
      size: ch * 0.34, color: t.ink, font: FONT.jp, letterSpacing: ch * 0.02,
    });
    ctx.fillStyle = t.ink;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, ch * 0.9, cw, ch * 0.05);
    ctx.globalAlpha = 1;
  };
}

/** Coin / bill unit with a small LCD. */
function coinPanel(t) {
  return (ctx, cw, ch) => {
    ctx.fillStyle = '#1b2027';
    ctx.fillRect(0, 0, cw, ch);
    ctx.strokeStyle = 'rgba(150,168,186,0.55)';
    ctx.lineWidth = Math.max(1, cw * 0.02);
    ctx.strokeRect(cw * 0.06, ch * 0.04, cw * 0.88, ch * 0.92);
    // lcd
    ctx.fillStyle = '#06251c';
    roundRect(ctx, cw * 0.14, ch * 0.1, cw * 0.72, ch * 0.2, cw * 0.04);
    ctx.fill();
    drawText(ctx, '000', cw * 0.5, ch * 0.2, {
      size: ch * 0.15, color: '#5df0b8', font: FONT.en, weight: '700',
    });
    // bill slot
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(cw * 0.2, ch * 0.38, cw * 0.6, ch * 0.055);
    ctx.fillStyle = t.accent;
    ctx.fillRect(cw * 0.2, ch * 0.375, cw * 0.6, ch * 0.012);
    // coin slot
    ctx.fillStyle = '#0a0c10';
    roundRect(ctx, cw * 0.42, ch * 0.52, cw * 0.16, ch * 0.1, cw * 0.03);
    ctx.fill();
    ctx.fillStyle = t.accent;
    ctx.fillRect(cw * 0.46, ch * 0.55, cw * 0.08, ch * 0.02);
    // return lever
    ctx.fillStyle = '#2b333d';
    roundRect(ctx, cw * 0.2, ch * 0.68, cw * 0.24, ch * 0.1, cw * 0.03);
    ctx.fill();
    drawText(ctx, 'おつり', cw * 0.62, ch * 0.74, {
      size: ch * 0.075, color: '#9fb2c4', font: FONT.jp,
    });
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(cw * 0.44, ch * 0.85, cw * 0.36, ch * 0.1);
  };
}

/** Dark flap of the take-out hatch. */
function dispenseFlap() {
  return (ctx, cw, ch) => {
    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#161b22';
    roundRect(ctx, cw * 0.05, ch * 0.14, cw * 0.9, ch * 0.72, ch * 0.08);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,140,160,0.28)';
    ctx.fillRect(cw * 0.05, ch * 0.14, cw * 0.9, ch * 0.05);
    drawText(ctx, '取出口', cw * 0.5, ch * 0.58, {
      size: ch * 0.18, color: 'rgba(150,170,190,0.55)', font: FONT.jp,
    });
  };
}

/** Side louvre grille. */
function grilleSlats(col) {
  return (ctx, cw, ch) => {
    ctx.fillStyle = '#141a21';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = col;
    const n = 9;
    for (let i = 0; i < n; i++) {
      ctx.fillRect(cw * 0.08, ch * (0.08 + (i * 0.86) / n), cw * 0.84, ch * 0.045);
    }
  };
}

/** One compartment of the 分別ゴミ箱. */
function binPanel(t) {
  return (ctx, cw, ch) => {
    ctx.fillStyle = '#ded9cc';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = t.accent;
    ctx.fillRect(0, 0, cw, ch * 0.15);
    ctx.fillStyle = 'rgba(20,24,30,0.12)';
    ctx.fillRect(0, ch * 0.15, cw, ch * 0.02);
    // category kanji (vertical, like the real ones)
    drawVerticalText(ctx, t.jp, cw * 0.5, ch * 0.4, ch * 0.17, {
      color: '#1b1f26', font: FONT.jp, gap: ch * 0.19, weight: 'bold',
    });
    drawText(ctx, t.sub, cw * 0.5, ch * 0.62, {
      size: ch * 0.075, color: '#3a424c', font: FONT.jp,
    });
    // throw-in opening
    ctx.fillStyle = '#06080b';
    if (t.kind === 'can') {
      ctx.beginPath();
      ctx.ellipse(cw * 0.5, ch * 0.79, cw * 0.24, ch * 0.09, 0, 0, TAU);
      ctx.fill();
    } else if (t.kind === 'bottle') {
      roundRect(ctx, cw * 0.26, ch * 0.72, cw * 0.48, ch * 0.14, ch * 0.04);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(cw * 0.5, ch * 0.79, cw * 0.2, ch * 0.075, 0, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(1, cw * 0.012);
    if (t.kind === 'can') {
      ctx.beginPath();
      ctx.ellipse(cw * 0.5, ch * 0.79, cw * 0.24, ch * 0.09, 0, 0, TAU);
      ctx.stroke();
    } else if (t.kind === 'bottle') {
      ctx.strokeRect(cw * 0.26, ch * 0.72, cw * 0.48, ch * 0.14);
    } else {
      ctx.beginPath();
      ctx.ellipse(cw * 0.5, ch * 0.79, cw * 0.2, ch * 0.075, 0, 0, TAU);
      ctx.stroke();
    }
  };
}

/** Header strip above the bin openings. */
function binHeader() {
  return (ctx, cw, ch) => {
    ctx.clearRect(0, 0, cw, ch);
    drawText(ctx, 'ごみは分別にご協力ください', cw * 0.5, ch * 0.52, {
      size: ch * 0.6, color: 'rgba(240,238,228,0.92)', font: FONT.jp, letterSpacing: ch * 0.04,
    });
  };
}

/** Faded local notices behind the glass of the notice board. */
function noticeBoard() {
  return (ctx, cw, ch) => {
    ctx.clearRect(0, 0, cw, ch);
    const r = rng(4242);
    const sheets = [
      { x: 0.030, y: 0.030, w: 0.300, h: 0.410, bg: '#ded7c1', ink: '#4a4438', rot: -0.030, title: '防犯パトロール', sub: '実施中  夜間は戸締りを' },
      { x: 0.352, y: 0.048, w: 0.250, h: 0.330, bg: '#e6dcc4', ink: '#7a2f24', rot: 0.022, title: '資源ごみ', sub: '収集日  火・金' },
      { x: 0.628, y: 0.026, w: 0.330, h: 0.470, bg: '#d9d3bd', ink: '#2f4258', rot: -0.014, title: '駅前通り', sub: '商店会  秋まつり' },
      { x: 0.045, y: 0.478, w: 0.380, h: 0.360, bg: '#cfc7b1', ink: '#43392c', rot: 0.018, title: '自転車放置', sub: '禁止  撤去します' },
      { x: 0.455, y: 0.415, w: 0.280, h: 0.300, bg: '#c9c3ae', ink: '#5b5548', rot: -0.040, title: '求人募集', sub: '深夜スタッフ' },
      { x: 0.758, y: 0.545, w: 0.215, h: 0.240, bg: '#d4cdb6', ink: '#4d4438', rot: 0.030, title: '回覧板', sub: '班長まで' },
    ];
    for (const s of sheets) {
      ctx.save();
      ctx.translate(s.x * cw + (s.w * cw) / 2, s.y * ch + (s.h * ch) / 2);
      ctx.rotate(s.rot);
      const w = s.w * cw;
      const h = s.h * ch;
      ctx.fillStyle = s.bg;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = 'rgba(120,112,96,0.25)';
      ctx.fillRect(-w / 2, -h / 2, w, h * 0.06);
      // faded print: title + rule lines
      drawText(ctx, s.title, 0, -h * 0.26, {
        size: Math.max(9, h * 0.115), color: s.ink, font: FONT.jp, letterSpacing: h * 0.006,
      });
      ctx.fillStyle = s.ink;
      ctx.globalAlpha = 0.42;
      const lines = 4;
      for (let i = 0; i < lines; i++) {
        ctx.fillRect(-w * 0.4, -h * 0.1 + i * h * 0.115, w * (0.8 - r() * 0.24), h * 0.022);
      }
      ctx.globalAlpha = 1;
      drawText(ctx, s.sub, 0, h * 0.3, {
        size: Math.max(8, h * 0.085), color: s.ink, font: FONT.jp,
      });
      // tape
      ctx.fillStyle = 'rgba(214,206,178,0.55)';
      ctx.fillRect(-w * 0.14, -h / 2 - h * 0.02, w * 0.28, h * 0.05);
      ctx.restore();
    }
  };
}

/** Blue direction plate (駅前通り / コンビニ横丁). */
function directionSign(jp, sub, dir) {
  return (ctx, cw, ch) => {
    ctx.fillStyle = '#103c8f';
    ctx.fillRect(0, 0, cw, ch);
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, 'rgba(255,255,255,0.16)');
    g.addColorStop(1, 'rgba(0,0,0,0.16)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);
    ctx.strokeStyle = '#e9f1ff';
    ctx.lineWidth = Math.max(2, ch * 0.05);
    const inset = ctx.lineWidth * 0.9;
    ctx.strokeRect(inset, inset, cw - inset * 2, ch - inset * 2);
    drawText(ctx, jp, cw * 0.46, ch * 0.46, {
      size: ch * 0.44, color: '#f4f8ff', font: FONT.jp, weight: '700', letterSpacing: ch * 0.03,
    });
    drawText(ctx, sub, cw * 0.46, ch * 0.8, {
      size: ch * 0.18, color: '#cfe0ff', font: FONT.en, letterSpacing: ch * 0.02,
    });
    // arrow
    ctx.save();
    ctx.translate(dir > 0 ? cw * 0.89 : cw * 0.08, ch * 0.47);
    ctx.scale(dir > 0 ? 1 : -1, 1);
    ctx.fillStyle = '#f4f8ff';
    ctx.beginPath();
    ctx.moveTo(ch * 0.24, 0);
    ctx.lineTo(-ch * 0.12, -ch * 0.24);
    ctx.lineTo(-ch * 0.12, -ch * 0.06);
    ctx.lineTo(-ch * 0.3, -ch * 0.06);
    ctx.lineTo(-ch * 0.3, ch * 0.06);
    ctx.lineTo(-ch * 0.12, ch * 0.06);
    ctx.lineTo(-ch * 0.12, ch * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
}

/** 止まれ lettering inside the red triangle. */
function stopText() {
  return (ctx, cw, ch) => {
    ctx.clearRect(0, 0, cw, ch);
    drawText(ctx, '止まれ', cw * 0.5, ch * 0.62, {
      size: ch * 0.34, color: '#ffffff', font: FONT.jp, weight: '700', letterSpacing: ch * 0.02,
    });
  };
}

/** Pedestrian signal picture (walking / standing figure). */
function pedFigure(onColor, walking) {
  return (ctx, cw, ch) => {
    ctx.clearRect(0, 0, cw, ch);
    const cx = cw * 0.5;
    const col = onColor;
    // head
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cx, ch * 0.26, ch * 0.1, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(2, ch * 0.075);
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (walking) {
      ctx.moveTo(cx, ch * 0.38);
      ctx.lineTo(cx - cw * 0.02, ch * 0.62);
      ctx.moveTo(cx, ch * 0.42);
      ctx.lineTo(cx - cw * 0.17, ch * 0.56);   // arm back
      ctx.moveTo(cx - cw * 0.02, ch * 0.62);
      ctx.lineTo(cx + cw * 0.16, ch * 0.8);    // front leg
      ctx.moveTo(cx - cw * 0.02, ch * 0.62);
      ctx.lineTo(cx - cw * 0.16, ch * 0.84);   // back leg
    } else {
      ctx.moveTo(cx, ch * 0.38);
      ctx.lineTo(cx, ch * 0.62);
      ctx.moveTo(cx, ch * 0.44);
      ctx.lineTo(cx - cw * 0.12, ch * 0.56);   // arm down
      ctx.moveTo(cx, ch * 0.44);
      ctx.lineTo(cx + cw * 0.12, ch * 0.56);
      ctx.moveTo(cx, ch * 0.62);
      ctx.lineTo(cx - cw * 0.1, ch * 0.9);
      ctx.moveTo(cx, ch * 0.62);
      ctx.lineTo(cx + cw * 0.1, ch * 0.9);
    }
    ctx.stroke();
  };
}

/** AC outdoor-unit fan grille. */
function fanGrille() {
  return (ctx, cw, ch) => {
    ctx.fillStyle = '#8d9095';
    ctx.fillRect(0, 0, cw, ch);
    const cx = cw * 0.5;
    const cy = ch * 0.5;
    const R = Math.min(cw, ch) * 0.44;
    ctx.fillStyle = '#2c3138';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#9aa0a6';
    ctx.lineWidth = Math.max(1, R * 0.05);
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (R * i) / 4.4, 0, TAU);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * R * 0.12, cy + Math.sin(a) * R * 0.12);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.stroke();
    }
    ctx.fillStyle = '#6d7378';
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.16, 0, TAU);
    ctx.fill();
  };
}

/** Traffic cone skin (white bands wrap around the cone). */
function coneSkin() {
  return canvasTexture(128, 128, (ctx, W, H) => {
    ctx.fillStyle = '#c94f18';
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.14)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.1)');
    g.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e2e0d6';
    ctx.fillRect(0, H * 0.30, W, H * 0.13);
    ctx.fillRect(0, H * 0.62, W, H * 0.11);
    ctx.fillStyle = 'rgba(24,20,16,0.35)';
    ctx.fillRect(0, 0, W, H * 0.06);
  });
}

/** Beer-crate side print. */
function cratePrint() {
  return (ctx, cw, ch) => {
    ctx.fillStyle = '#1f4f7c';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    // moulded ribs
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(0, ch * (0.18 + i * 0.2), cw, ch * 0.05);
    }
    ctx.fillStyle = '#e8e4d6';
    roundRect(ctx, cw * 0.24, ch * 0.2, cw * 0.52, ch * 0.24, cw * 0.03);
    ctx.fill();
    drawText(ctx, 'ビール', cw * 0.5, ch * 0.32, {
      size: ch * 0.15, color: '#1f4f7c', font: FONT.jp, weight: 'bold',
    });
    drawText(ctx, '20本', cw * 0.5, ch * 0.66, {
      size: ch * 0.1, color: '#dfe6ee', font: FONT.jp,
    });
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  shared material palette
// ═════════════════════════════════════════════════════════════════════════════
function makeMaterials() {
  return {
    dark: M.toon(0x1a1e24, { emissive: 0x05070a, emissiveIntensity: 0.5 }),
    steel: M.toon(0x6c7681, { emissive: 0x0d1116, emissiveIntensity: 0.7 }),
    steelDark: M.toon(0x3d454e, { emissive: 0x080a0d, emissiveIntensity: 0.6 }),
    chrome: M.toon(0xa9b0b8, { emissive: 0x1b2026, emissiveIntensity: 0.9 }),
    white: M.toon(0xc6cacd, { emissive: 0x2c333a, emissiveIntensity: 0.7 }),
    rubber: M.toon(0x16181b, { emissive: 0x040506 }),
    concrete: M.toon(0x8b8d88, { emissive: 0x141617, emissiveIntensity: 0.6 }),
    concreteDark: M.toon(0x6c6e6a, { emissive: 0x101112, emissiveIntensity: 0.6 }),
    wood: M.toon(0x4d3c2b, { emissive: 0x0a0705, emissiveIntensity: 0.5 }),
    yellow: M.toon(0xd9a52e, { emissive: 0x3d2806, emissiveIntensity: 0.8 }),
    orange: M.toon(0xc9541c, { emissive: 0x34120a, emissiveIntensity: 0.7 }),
    blueCrate: M.toon(0x2a5f8e, { emissive: 0x0a1a28, emissiveIntensity: 0.7 }),
    card: M.toon(0xa8966e, { emissive: 0x241d10, emissiveIntensity: 0.6 }),
    glassDark: M.emit(0x1d2630, { intensity: 0.9, transparent: true, opacity: 0.62 }),
    wire: M.toon(0x14171b, { emissive: 0x040507 }),
    lampLens: M.emit(0xffffff, { intensity: 1.25 }),
    lensRing: M.toon(0x24282e, { emissive: 0x090b0e }),
    red: M.toon(0xb8382f, { emissive: 0x2c0a07, emissiveIntensity: 0.7 }),
    dirt: M.toon(0x5b5d58, { emissive: 0x0d0e0f }),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  01 · vending machines
// ═════════════════════════════════════════════════════════════════════════════
const VM_THEME = {
  cool: {
    body: 0x9db6c9, bodyEm: 0x22394b,
    lb0: '#0d6fa8', lb1: '#33b8e0', lb2: '#0a4d79', ink: 'rgba(255,255,255,0.8)',
    brand: 'DRINK', tagline: 'つめた〜い',
    vertical: 'つめた〜い',
    backTop: 'rgba(86,176,220,0.52)',
    tag0: '#0f8ec0', tag1: '#0a5c84', tagInk: '#eaf9ff',
    colors: [0xe0402f, 0xf2f4f7, 0x2f6fd0, 0xf7b21a, 0x39a86a, 0x8a5ad0],
    prices: ['100', '120', '130', '150'], priceInk: '#9ff2ff', cap: '#dfe9f2',
    accent: '#57d6ff', glow: 0x4fd2ff, smear: 0x3fa6d8, seed: 7,
  },
  warm: {
    body: 0xb2697a, bodyEm: 0x3b1620,
    lb0: '#a4243f', lb1: '#e8637e', lb2: '#7c1129', ink: 'rgba(255,255,255,0.82)',
    brand: 'HOT', tagline: 'あったか〜い',
    vertical: 'あったか〜い',
    backTop: 'rgba(226,120,150,0.5)',
    tag0: '#c22a4c', tag1: '#8d1230', tagInk: '#fff1f5',
    colors: [0xe8dcc0, 0xd4483a, 0xf2c14e, 0x7a4b2a, 0xefe7d8, 0x3f8f6a],
    prices: ['120', '130', '150', '160'], priceInk: '#ffd9a0', cap: '#e6d9c2',
    accent: '#ff9ab4', glow: 0xff7a98, smear: 0xd95a72, seed: 19,
  },
};

function buildVending(parent, P, o) {
  const th = VM_THEME[o.theme];
  const g = group(parent, [o.x, SIDE, o.z], 'vendingMachine');
  g.rotation.y = o.ry;
  const w = o.w;
  const h = 1.83;
  const d = 0.72;
  const hw = w / 2;
  const hd = d / 2;

  // plinth (踢脚) + carcass
  box(g, [w - 0.03, 0.10, d - 0.03], [0, 0.05, 0], P.steelDark);
  const bodyMat = M.toon(th.body, { emissive: th.bodyEm, emissiveIntensity: 0.55 });
  const body = box(g, [w, h - 0.10, d], [0, 0.10 + (h - 0.10) / 2, 0], bodyMat, { cast: true });
  addOutline(body, OUT);
  // top cap
  box(g, [w + 0.02, 0.03, d + 0.02], [0, h - 0.015, 0], P.steelDark);

  // ── glowing panels on the front (+z) ──
  const face = hd + 0.004;
  const lbMat = M.emit(0xffffff, { map: canvasTexture(512, 128, lightbox(th)), intensity: 1.15 });
  plane(g, [w - 0.04, 0.30], [0, 1.575, face], lbMat);

  const winMat = M.emit(0xffffff, { map: canvasTexture(384, 512, drinkWindow(th)), intensity: 1.0 });
  plane(g, [w - 0.40, 0.92], [-0.16, 0.86, face], winMat);
  // glass reflection over the window
  plane(g, [w - 0.40, 0.92], [-0.16, 0.86, face + 0.002],
    M.emit(0xa8d8f0, { intensity: 0.10, transparent: true, opacity: 0.16, depthWrite: false }));

  const coinMat = M.emit(0xffffff, { map: canvasTexture(128, 192, coinPanel(th)), intensity: 0.75 });
  plane(g, [0.27, 0.40], [hw - 0.175, 1.15, face], coinMat);

  const flapMat = M.emit(0xffffff, { map: canvasTexture(192, 96, dispenseFlap()), intensity: 0.5 });
  plane(g, [0.60, 0.23], [-0.08, 0.245, face], flapMat);

  // side louvres
  const grilleTex = canvasTexture(96, 160, grilleSlats('rgba(120,136,152,0.55)'));
  const grilleMat = M.emit(0xffffff, { map: grilleTex, intensity: 0.55 });
  const gl = plane(g, [d * 0.66, 0.92], [-hw - 0.004, 0.98, 0], grilleMat);
  gl.rotation.y = -Math.PI / 2;
  const gr = plane(g, [d * 0.66, 0.92], [hw + 0.004, 0.98, 0], grilleMat);
  gr.rotation.y = Math.PI / 2;

  // neon bloom + light spill on the wet pavement
  const halo = glow(g, th.glow, 1.55, [0, 1.10, hd + 0.30], { opacity: 0.30, aspect: 1.15 });
  glow(g, 0xffffff, 0.55, [-0.16, 0.86, hd + 0.12], { opacity: 0.22 });
  groundSmear(g, th.smear, 1.75, 1.5, [0, 0.013, hd + 0.42], { opacity: 0.34, renderOrder: 2 });
  groundSmear(g, 0xffe0b0, 0.9, 0.7, [0, 0.014, hd + 0.16], { opacity: 0.2, renderOrder: 2 });

  g.userData.flicker = { mats: [lbMat, winMat], halo, base: [1.15, 1.0], seed: th.seed };
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  02 · mamachari (city bike)
// ═════════════════════════════════════════════════════════════════════════════
function buildBicycle(parent, P, o) {
  const g = group(parent, [o.x, SIDE, o.z], 'mamachari');
  g.rotation.y = o.ry;
  const lean = group(g, [0, 0, 0], 'lean');
  lean.rotation.z = o.lean || 0;

  const AX = 0.335;              // axle height (wheel radius incl. tyre)
  const rearZ = -0.55;
  const frontZ = 0.52;
  const bb = [0, 0.29, -0.02];
  const headTop = [0, 1.00, 0.29];
  const headBot = [0, 0.74, 0.35];
  const seatTop = [0, 0.98, -0.29];

  const rubber = [];
  const chrome = [];
  const frame = [];
  const P0 = (x, y, z) => [x, y, z];

  // ── wheels: tyre torus, rim torus, spokes ──
  const tyreGeo = new THREE.TorusGeometry(0.31, 0.025, 5, 20);
  const rimGeo = new THREE.TorusGeometry(0.285, 0.008, 4, 20);
  const spokeList = [];
  for (const z of [rearZ, frontZ]) {
    const tire = mesh(lean, tyreGeo, P.rubber, [0, AX, z], { name: 'tyre' });
    tire.rotation.y = Math.PI / 2;
    const rim = mesh(lean, rimGeo, P.chrome, [0, AX, z], { name: 'rim' });
    rim.rotation.y = Math.PI / 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      spokeList.push(bar(
        [0, AX + Math.sin(a) * 0.035, z + Math.cos(a) * 0.035],
        [0, AX + Math.sin(a) * 0.282, z + Math.cos(a) * 0.282],
        0.0035,
      ));
    }
  }
  bars(lean, spokeList, P.chrome, { receive: false });

  // ── frame tubes ──
  frame.push(bar(headBot, bb, 0.019));                       // down tube
  frame.push(bar([0, 0.93, 0.27], [0, 0.92, -0.23], 0.017)); // top tube
  frame.push(bar(seatTop, bb, 0.017));                       // seat tube
  frame.push(bar(headTop, headBot, 0.020));                  // head tube
  frame.push(bar([0.055, 0.90, 0.26], [0.06, AX, frontZ], 0.013)); // fork R
  frame.push(bar([-0.055, 0.90, 0.26], [-0.06, AX, frontZ], 0.013)); // fork L
  for (const s of [1, -1]) {
    frame.push(bar([0.03 * s, 0.29, -0.02], [0.045 * s, AX, rearZ], 0.011));  // chain stay
    frame.push(bar([0.03 * s, 0.95, -0.27], [0.045 * s, AX, rearZ], 0.010));  // seat stay
    frame.push(bar([0.06 * s, AX, frontZ], [0.11 * s, 0, -0.05], 0.009));     // double stand
  }
  frame.push(bar([0, 0.98, -0.29], [0, 1.00, -0.34], 0.014)); // seat post
  bars(lean, frame, P.steel, { outline: 0.008 });             // bike silhouette outline

  // ── chrome: handlebar, grips, cranks, basket, fenders ──
  chrome.push(bar([-0.27, 1.02, 0.28], [0.27, 1.02, 0.28], 0.013));
  chrome.push(bar([0, 1.02, 0.28], headTop, 0.016));
  chrome.push(bar([-0.27, 1.02, 0.28], [-0.245, 1.00, 0.145], 0.013));
  chrome.push(bar([0.27, 1.02, 0.28], [0.245, 1.00, 0.145], 0.013));
  chrome.push(bar([-0.26, 1.02, 0.28], [-0.30, 1.02, 0.30], 0.017));   // grips
  chrome.push(bar([0.26, 1.02, 0.28], [0.30, 1.02, 0.30], 0.017));
  chrome.push(bar([0.05, 0.29, -0.02], [0.05, 0.19, 0.12], 0.009));    // crank R
  chrome.push(bar([-0.05, 0.29, -0.02], [-0.05, 0.39, -0.16], 0.009)); // crank L
  // front basket: rails + verticals
  const bz0 = 0.60, bz1 = 0.90, by0 = 0.80, by1 = 1.00, bx = 0.185;
  for (const y of [by0, (by0 + by1) / 2, by1]) {
    chrome.push(bar([-bx, y, bz0], [-bx, y, bz1], 0.006));
    chrome.push(bar([bx, y, bz0], [bx, y, bz1], 0.006));
    chrome.push(bar([-bx, y, bz0], [bx, y, bz0], 0.006));
    chrome.push(bar([-bx, y, bz1], [bx, y, bz1], 0.006));
  }
  for (let i = 0; i < 4; i++) {
    const x = -bx + (i / 3) * bx * 2;
    chrome.push(bar([x, by0, bz0], [x, by1, bz0], 0.005));
    chrome.push(bar([x, by0, bz1], [x, by1, bz1], 0.005));
  }
  chrome.push(bar([0, by0, bz1], [0, 0.92, 0.42], 0.008)); // basket stay
  const chromeIM = bars(lean, chrome, P.chrome, { receive: false });
  addOutlineInstanced(chromeIM, 0.006);

  // ── saddle + chainring + lamp ──
  const saddle = box(lean, [0.13, 0.055, 0.26], [0, 1.03, -0.31], P.dark);
  addOutline(saddle, 0.007);
  const ring = cylinder(lean, 0.105, 0.105, 0.012, [0.055, 0.29, -0.02], P.steelDark, { seg: 14 });
  ring.rotation.z = Math.PI / 2;

  // dynamo lamp on the fork
  box(lean, [0.07, 0.055, 0.05], [0, 0.72, 0.56], P.steelDark);
  const lensMat = M.emit(0xfff0c4, { intensity: 1.1 });
  const lamp = plane(lean, [0.055, 0.04], [0, 0.72, 0.587], lensMat);
  glow(lean, 0xffe6a8, 0.30, [0, 0.72, 0.62], { opacity: 0.26 });
  // mudguards
  const fenderGeo = new THREE.TorusGeometry(0.345, 0.017, 4, 18, Math.PI * 1.02);
  fenderGeo.rotateZ(-0.01 * Math.PI);
  for (const z of [rearZ, frontZ]) {
    const f = mesh(lean, fenderGeo, P.steel, [0, AX, z], { name: 'mudguard' });
    f.rotation.y = Math.PI / 2;
    addOutline(f, 0.006);
  }
  lean.userData.lamp = lensMat;
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  03 · umbrella stand (傘立て)
// ═════════════════════════════════════════════════════════════════════════════
function buildUmbrellaStand(parent, P, o) {
  const g = group(parent, [o.x, SIDE, o.z], 'umbrellaStand');
  g.rotation.y = o.ry;
  const w = 0.42;
  const hh = 0.55;
  const hw = w / 2;

  // tray base
  box(g, [w, 0.05, w], [0, 0.025, 0], P.steelDark);
  // corner posts
  const posts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) posts.push(bar([sx * hw, 0.02, sz * hw], [sx * hw, hh, sz * hw], 0.011));
  // two horizontal bands
  for (const y of [0.20, 0.46]) {
    posts.push(bar([-hw, y, -hw], [hw, y, -hw], 0.008));
    posts.push(bar([-hw, y, hw], [hw, y, hw], 0.008));
    posts.push(bar([-hw, y, -hw], [-hw, y, hw], 0.008));
    posts.push(bar([hw, y, -hw], [hw, y, hw], 0.008));
  }
  // inner lattice grid (格栅)
  for (let i = 0; i < 3; i++) {
    const t = -hw + 0.07 + i * 0.12;
    posts.push(bar([t, 0.14, -hw], [t, 0.14, hw], 0.006));
    posts.push(bar([-hw, 0.14, t], [hw, 0.14, t], 0.006));
    posts.push(bar([t, hh, -hw], [t, hh, hw], 0.006));
    posts.push(bar([-hw, hh, t], [hw, hh, t], 0.006));
  }
  bars(g, posts, P.chrome, { outline: 0.007 });

  // closed umbrellas leaning in the stand
  const sm = [
    { x: -0.10, z: -0.09, tilt: 0.13, dir: 0.6, c: 0x8d2b34, l: 0.90 },
    { x: 0.09, z: -0.11, tilt: -0.10, dir: 2.3, c: 0xd6cdb4, l: 0.96 },
    { x: 0.11, z: 0.07, tilt: 0.16, dir: -0.9, c: 0x2a3f6e, l: 0.88 },
    { x: -0.08, z: 0.10, tilt: -0.14, dir: 3.4, c: 0x2f5540, l: 0.93 },
  ];
  const shaft = [];
  const canopy = [];
  for (const u of sm) {
    const base = [u.x, 0.05, u.z];
    const tip = [u.x + Math.sin(u.dir) * 0.11, 0.05 + u.l, u.z + Math.cos(u.dir) * 0.11];
    shaft.push(bar(base, tip, 0.008));
    // tapered canopy along the shaft
    const ax = tip[0] - base[0];
    const ay = tip[1] - base[1];
    const az = tip[2] - base[2];
    const len = Math.hypot(ax, ay, az);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(ax, ay, az).normalize());
    canopy.push({
      p: [base[0] + ax * 0.42, base[1] + ay * 0.42, base[2] + az * 0.42],
      q, s: [1, len * 0.74, 1], c: u.c,
    });
    // handle hook
    shaft.push(bar(tip, [tip[0] + Math.sin(u.dir + 1.4) * 0.07, tip[1] + 0.045, tip[2] + Math.cos(u.dir + 1.4) * 0.07], 0.008));
  }
  bars(g, shaft, P.chrome, { receive: false });
  // near-white base material so the per-instance umbrella colours stay saturated
  instanced(g, new THREE.CylinderGeometry(0.034, 0.075, 1, 7, 1), P.white, canopy, { outline: 0.006 });
  // wet floor + a faint sheen
  groundSmear(g, 0x8fb6cc, 0.55, 0.55, [0, 0.012, 0], { opacity: 0.14, renderOrder: 2 });
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  04 · 分別ゴミ箱 (3-bin recycling box)
// ═════════════════════════════════════════════════════════════════════════════
function buildTrashBins(parent, P, o) {
  const g = group(parent, [o.x, SIDE, o.z], 'recycleBins');
  g.rotation.y = o.ry;
  const w = 0.50;    // x
  const d = 0.95;    // z
  const hh = 0.95;
  const hw = w / 2;
  const hd = d / 2;

  const body = box(g, [w, hh - 0.06, d], [0, 0.06 + (hh - 0.06) / 2, 0], P.steel, { cast: true });
  addOutline(body, OUT);
  // lid
  box(g, [w + 0.03, 0.06, d + 0.03], [0, hh - 0.01, 0], P.steelDark);
  // dark front frame so the three openings read from the door side
  box(g, [0.02, hh - 0.20, d - 0.04], [-hw - 0.008, 0.06 + (hh - 0.06) / 2, 0], P.steelDark);
  // feet
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
    box(g, [0.06, 0.07, 0.06], [sx * (hw - 0.06), 0.035, sz * (hd - 0.06)], P.dark);
  }
  // three compartments on the front (-x face)
  const bins = [
    { jp: '缶', sub: 'CAN', kind: 'can', accent: '#3f7fc4' },
    { jp: 'ビン', sub: 'BOTTLE', kind: 'glass', accent: '#3f9a6a' },
    { jp: 'ペット', sub: 'PET', kind: 'bottle', accent: '#c48a2e' },
  ];
  const px = -hw - 0.004;
  bins.forEach((b, i) => {
    const zc = -hd + d * (i + 0.5) / 3;
    const m = label(g, d / 3 - 0.012, hh - 0.22, binPanel(b), [px, 0.06 + (hh - 0.06) / 2 - 0.02, zc], {
      ry: -Math.PI / 2, brightness: 1.0, px: 620,
    });
    // painted opening inside the panel; add a dark socket for depth
    box(g, [0.03, 0.10, d / 3 - 0.14], [px + 0.015, 0.30, zc], P.dark);
    return m;
  });
  // header strip
  label(g, 0.72, 0.075, binHeader(), [px - 0.02, hh + 0.045, 0], {
    ry: -Math.PI / 2, brightness: 1.0, px: 700,
  });
  // side panel details (リサイクル)
  label(g, d * 0.7, 0.14, (ctx, cw, ch) => {
    drawText(ctx, 'リサイクル  BOX', cw * 0.5, ch * 0.55, {
      size: ch * 0.66, color: 'rgba(228,226,214,0.9)', font: FONT.jp, letterSpacing: ch * 0.04,
    });
  }, [hw + 0.004, 0.66, 0], { ry: Math.PI / 2, brightness: 1.0, px: 420 });
  // colour-coded strip on the street-facing side so it reads as a 分別 box
  instanced(g, UG.box, P.white, [
    { p: [hw + 0.006, 0.79, -hd + d / 6], s: [0.014, 0.10, d / 3 - 0.09], c: 0x3f7fc4 },
    { p: [hw + 0.006, 0.79, 0], s: [0.014, 0.10, d / 3 - 0.09], c: 0x3f9a6a },
    { p: [hw + 0.006, 0.79, hd - d / 6], s: [0.014, 0.10, d / 3 - 0.09], c: 0xc48a2e },
  ], { receive: false });
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  05 · street lamp (街灯) — arm reaches in −x
// ═════════════════════════════════════════════════════════════════════════════
function buildStreetLamp(parent, P, o, extra) {
  const g = group(parent, [o.x, 0.135, o.z], 'streetLamp');   // stands on the kerb band
  const H = 4.50;
  // base
  cylinder(g, 0.155, 0.185, 0.20, [0, 0.10, 0], P.concreteDark, { seg: 12 });
  box(g, [0.30, 0.03, 0.30], [0, 0.005, 0], P.dark);
  // pole
  const pole = cylinder(g, 0.062, 0.092, H, [0, H / 2 + 0.20, 0], P.steel, { seg: 10 });
  addOutline(pole, OUT);
  cylinder(g, 0.075, 0.075, 0.10, [0, 0.30, 0], P.steelDark, { seg: 10 });

  // gently curved arm towards −x
  const armPts = [
    new THREE.Vector3(0, H + 0.10, 0),
    new THREE.Vector3(-0.30, H + 0.20, 0),
    new THREE.Vector3(-0.75, H + 0.20, 0),
    new THREE.Vector3(-1.06, H + 0.10, 0),
  ];
  const armCurve = new THREE.CatmullRomCurve3(armPts);
  mesh(g, new THREE.TubeGeometry(armCurve, 14, 0.045, 6, false), P.steel, [0, 0, 0], { name: 'lampArm' });
  // head shell
  const headX = -1.12;
  const headY = H + 0.02;
  const shell = box(g, [0.34, 0.11, 0.36], [headX, headY, 0], P.steelDark);
  addOutline(shell, 0.010);
  box(g, [0.28, 0.05, 0.30], [headX, headY - 0.075, 0], P.steel);
  // glowing lens facing down
  const lensMat = M.emit(0xffe0ac, { intensity: 1.25 });
  const lens = plane(g, [0.24, 0.26], [headX, headY - 0.104, 0], lensMat);
  lens.rotation.x = Math.PI / 2;
  const halo = glow(g, 0xffcf8c, 1.05, [headX, headY - 0.22, 0], { opacity: 0.30 });
  groundSmear(g, 0xffb264, 2.5, 2.5, [headX, 0.012, 0], { opacity: 0.28, renderOrder: 2 });
  groundSmear(g, 0xffc98a, 1.15, 1.15, [headX, 0.013, 0], { opacity: 0.34, renderOrder: 2 });
  // small cable hook + signs mounted on the pole
  cylinder(g, 0.018, 0.018, 0.34, [0.10, 3.02, 0], P.steelDark, { seg: 6 }).rotation.z = Math.PI / 2;

  extra.head = { x: o.x + headX, y: 4.50, z: o.z };
  extra.lampMats = { lens: lensMat, halo };
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  06 · utility pole + overhead wires (the silhouette of the corner)
// ═════════════════════════════════════════════════════════════════════════════
function buildUtilityPole(parent, P, o) {
  const g = group(parent, [o.x, SIDE, o.z], 'utilityPole');
  const H = 5.60;

  cylinder(g, 0.135, 0.20, 0.28, [0, 0.14, 0], P.concreteDark, { seg: 12 });
  const pole = cylinder(g, 0.105, 0.175, H, [0, H / 2, 0], P.concrete, { seg: 12 });
  addOutline(pole, OUT * 0.9);

  // two steel cross-arms (one across z, one across x, higher)
  const armGeo = new THREE.BoxGeometry(1, 1, 1);
  instanced(g, armGeo, P.steelDark, [
    { p: [0.02, 4.62, 0], s: [0.07, 0.075, 1.55] },
    { p: [0.02, 5.10, 0], s: [1.45, 0.075, 0.07] },
    { p: [0.16, 4.30, 0.24], s: [0.04, 1.05, 0.40] },  // transformer bracket
    { p: [0.16, 4.30, -0.24], s: [0.04, 1.05, 0.40] },
  ], { outline: 0.01 });

  // transformers (3 drums clamped to the pole)
  instanced(g, new THREE.CylinderGeometry(1, 1, 1, 12), P.steel, [
    { p: [0.27, 4.02, 0.30], s: [0.155, 0.50, 0.155] },
    { p: [0.27, 3.98, -0.30], s: [0.155, 0.50, 0.155] },
    { p: [0.16, 4.05, 0.02], s: [0.145, 0.46, 0.145] },
  ], { name: 'transformer' });

  // insulators on both arms
  const ins = [];
  for (let i = 0; i < 4; i++) {
    const z = -0.62 + i * 0.41;
    ins.push({ p: [0.02, 4.72, z], s: [0.045, 0.13, 0.045] });
    ins.push({ p: [0.02, 4.66, z], s: [0.07, 0.03, 0.07] });
  }
  for (let i = 0; i < 3; i++) {
    const x = -0.52 + i * 0.52;
    ins.push({ p: [x, 5.20, 0.02], s: [0.045, 0.13, 0.045] });
    ins.push({ p: [x, 5.14, 0.02], s: [0.07, 0.03, 0.07] });
  }
  instanced(g, new THREE.CylinderGeometry(1, 0.7, 1, 8), P.white, ins, { receive: false });

  // step bolts up the pole
  const steps = [];
  for (let i = 0; i < 7; i++) {
    const y = 2.55 + i * 0.30;
    const s = i % 2 === 0 ? 1 : -1;
    steps.push(bar([0, y, 0], [0.16 * s, y, 0.02], 0.010));
  }
  // drop leads running down the pole
  steps.push(bar([0.17, 4.30, 0.30], [0.12, 1.30, 0.16], 0.014));
  steps.push(bar([0.14, 4.20, -0.32], [0.10, 1.30, -0.14], 0.012));
  bars(g, steps, P.steelDark, { receive: false });

  return g;
}

function buildWires(parent, P, o) {
  const px = o.x;
  const pz = o.z;
  const top = SIDE + 5.55;
  const w = (a, b, sag, r = 0.014) => wire(parent, a, b, sag, P.wire, r);
  // ── west along the south street ──
  w([px + 0.02, top - 0.10, pz - 0.62], [-5.80, 4.62, 2.10], 0.62);
  w([px + 0.02, top - 0.10, pz - 0.21], [-5.80, 4.74, 2.14], 0.70);
  w([px + 0.02, top - 0.10, pz + 0.20], [-5.80, 4.86, 2.18], 0.78);
  // ── north along the east street ──
  w([px - 0.52, top - 0.42, pz + 0.02], [3.66, 4.60, -5.50], 0.66);
  w([px, top - 0.42, pz + 0.02], [3.74, 4.72, -5.50], 0.72);
  w([px + 0.52, top - 0.42, pz + 0.02], [3.82, 4.84, -5.50], 0.78);
  // ── service drops to the buildings behind ──
  w([px + 0.02, top - 0.62, pz - 0.60], [2.20, 3.95, -4.40], 0.30, 0.012);
  w([px + 0.02, top - 0.72, pz + 0.58], [2.55, 3.92, -4.42], 0.34, 0.012);
  // ── slack loop dangling from the pole ──
  w([px + 0.18, 4.30, 0.12], [px + 0.20, 3.05, 0.10], 0.10, 0.011);
}

// ═════════════════════════════════════════════════════════════════════════════
//  07 · traffic signal (the only moving thing far away)
// ═════════════════════════════════════════════════════════════════════════════
const SIGNAL_COLORS = [
  { on: 0x3ff0b4, off: 0x0a2a22 },   // 青 (Japanese "green" reads teal)
  { on: 0xffc23c, off: 0x2e2208 },   // 黄
  { on: 0xff4a45, off: 0x33100e },   // 赤
];

function buildTrafficSignal(parent, P, o, anim) {
  const g = group(parent, [o.x, SIDE, o.z], 'trafficSignal');

  // pole + arm
  cylinder(g, 0.09, 0.115, 0.22, [0, 0.11, 0], P.concreteDark, { seg: 10 });
  const pole = cylinder(g, 0.058, 0.082, 3.90, [0, 1.95, 0], P.steel, { seg: 10 });
  addOutline(pole, OUT * 0.9);
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 3.62, 0),
    new THREE.Vector3(0.55, 3.74, 0),
    new THREE.Vector3(1.10, 3.74, 0),
    new THREE.Vector3(1.52, 3.64, 0),
  ]);
  mesh(g, new THREE.TubeGeometry(armCurve, 12, 0.038, 6, false), P.steel, [0, 0, 0], { name: 'signalArm' });

  // ── vehicle head (horizontal 3-lamp, faces +z) ──
  const hx = 1.42;
  const hy = 3.30;
  const head = box(g, [1.02, 0.34, 0.24], [hx, hy, 0], P.steelDark, { cast: true });
  addOutline(head, OUT);
  box(g, [1.06, 0.05, 0.30], [hx, hy + 0.185, 0.01], P.steel);       // top cap
  box(g, [0.06, 0.34, 0.06], [hx - 0.46, hy + 0.28, 0], P.steelDark); // hanger
  // hanger stays back to the arm
  bars(g, [bar([hx, hy + 0.19, 0], [hx, 3.74, 0], 0.022)], P.steelDark, { receive: false });

  // lenses + hoods (instanced, recoloured in update)
  const lensGeo = new THREE.CylinderGeometry(0.135, 0.135, 0.05, 18);
  lensGeo.rotateX(Math.PI / 2);
  const lensTex = canvasTexture(96, 96, (ctx, W, H) => {
    const gr = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.42, 'rgba(255,255,255,0.96)');
    gr.addColorStop(0.62, 'rgba(190,190,190,0.9)');
    gr.addColorStop(0.70, 'rgba(22,22,22,0.95)');
    gr.addColorStop(1, 'rgba(10,10,10,1)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
  });
  const lensMat = M.emit(0xffffff, { map: lensTex, intensity: 1 });
  const lensPos = [-0.34, 0, 0.34].map((dx) => [hx + dx, hy, 0.135]);
  const lensIM = instanced(g, lensGeo, lensMat, lensPos.map((p, i) => ({
    p, s: 1, c: SIGNAL_COLORS[i].off,
  })), { receive: false, name: 'signalLenses' });

  // hoods over each lens
  instanced(g, new THREE.BoxGeometry(1, 1, 1), P.steelDark, lensPos.map((p) => ({
    p: [p[0], p[1] + 0.185, p[2] - 0.055],
    r: [-0.30, 0, 0],
    s: [0.30, 0.028, 0.19],
  })));

  // bloom halos following each lens
  const lensGlows = lensPos.map((p) => glow(g, SIGNAL_COLORS[lensPos.indexOf(p)].on, 0.62,
    [p[0], p[1], p[2] + 0.10], { opacity: 0.05 }));

  // ── pedestrian signal on the pole ──
  const pedY = 2.52;
  box(g, [0.30, 0.66, 0.17], [0, pedY, 0.06], P.steelDark);
  box(g, [0.34, 0.04, 0.22], [0, pedY + 0.35, 0.06], P.steel);
  const redPlate = label(g, 0.23, 0.23, pedFigure('#ffffff', false), [0, pedY + 0.155, 0.152],
    { brightness: 1, px: 520 });
  const greenPlate = label(g, 0.24, 0.24, pedFigure('#ffffff', true), [0, pedY - 0.115, 0.152],
    { brightness: 1, px: 520 });
  const pedGlow = glow(g, 0xff6a5a, 0.50, [0, pedY + 0.13, 0.24], { opacity: 0.10 });

  anim.signal = { lensIM, lensGlows, redPlate, greenPlate, pedGlow };
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  08 · corner guardrail (ガードレール) — sits on the kerb band
// ═════════════════════════════════════════════════════════════════════════════
function buildGuardrail(parent, P) {
  const g = group(parent, [0, 0, 0], 'guardrail');
  const KY = 0.135;                       // kerb top
  const R = 0.52;                         // rail radius around the corner
  const cx = 3.40;
  const cz = 2.00;

  const pts = [[2.76, 2.52], [3.10, 2.52], [3.40, 2.52]];
  for (let i = 1; i <= 5; i++) {
    const a = (Math.PI / 2) * (1 - i / 6);
    pts.push([cx + Math.cos(a) * R, cz + Math.sin(a) * R]);
  }
  pts.push([3.92, 1.86], [3.92, 1.62]);

  for (const yy of [0.72, 0.40]) {
    const curve = new THREE.CatmullRomCurve3(
      pts.map((p) => new THREE.Vector3(p[0], KY + yy, p[1])));
    const rail = mesh(g, new THREE.TubeGeometry(curve, 46, 0.028, 6, false), P.white, [0, 0, 0],
      { name: 'guardrailTube', cast: true });
    addOutline(rail, OUT * 0.7);
  }

  // posts (one of them a little bent)
  const posts = [
    { x: 2.78, z: 2.52, r: [0.05, 0, 0.035] },
    { x: 3.40, z: 2.52, r: [0, 0, 0] },
    { x: 3.78, z: 2.37, r: [0, 0, 0] },
    { x: 3.92, z: 2.00, r: [0.03, 0, -0.02] },
    { x: 3.92, z: 1.62, r: [0, 0, 0] },
  ];
  const postList = posts.map((p) => ({
    p: [p.x, KY + 0.375, p.z], r: p.r, s: [0.038, 0.75, 0.038],
  }));
  const pIM = instanced(g, UG.cyl, P.white, postList, { cast: true, outline: OUT * 0.7 });
  instanced(g, UG.box, P.concrete, posts.map((p) => ({
    p: [p.x, KY + 0.04, p.z], s: [0.17, 0.09, 0.17],
  })), { cast: true });
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  09 · notice board on the left building's south face
// ═════════════════════════════════════════════════════════════════════════════
function buildNoticeBoard(parent, P, o) {
  const g = group(parent, [o.x, 0, o.z], 'noticeBoard');
  const w = 1.00;
  const hh = 0.90;
  const cy = 1.45;

  box(g, [w, hh, 0.055], [0, cy, 0.028], P.steelDark, { cast: true });
  addOutline(g.children[0], OUT * 0.8);
  // inner recess + glass
  box(g, [w - 0.10, hh - 0.10, 0.02], [0, cy, 0.055], P.dark);
  label(g, w - 0.11, hh - 0.11, noticeBoard(), [0, cy, 0.068], { brightness: 1.0, px: 900 });
  plane(g, [w - 0.10, hh - 0.10], [0, cy, 0.079],
    M.emit(0x9fc8e0, { intensity: 0.10, transparent: true, opacity: 0.13, depthWrite: false }));
  // frame lip
  box(g, [w + 0.05, 0.035, 0.07], [0, cy + hh / 2 + 0.018, 0.038], P.steel);
  box(g, [w + 0.05, 0.035, 0.07], [0, cy - hh / 2 - 0.018, 0.038], P.steel);
  // small spot light on top
  const spotY = cy + hh / 2 + 0.14;
  box(g, [0.16, 0.06, 0.10], [0, spotY, 0.10], P.steelDark);
  const spot = plane(g, [0.13, 0.05], [0, spotY - 0.035, 0.16], M.emit(0xffe3b0, { intensity: 1.1 }));
  spot.rotation.x = Math.PI / 2 - 0.55;
  glow(g, 0xffd79a, 0.55, [0, spotY - 0.10, 0.24], { opacity: 0.22 });
  groundSmear(g, 0xffd9a0, 1.0, 0.7, [0, 0.012, 0.30], { opacity: 0.10, renderOrder: 2 });
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  10 · signage (direction plates + 止まれ)
// ═════════════════════════════════════════════════════════════════════════════
function buildDirectionSigns(parent, P, poleX, poleZ) {
  const g = group(parent, [poleX, 0, poleZ], 'directionSigns');
  // plate 1 → faces the south street
  const p1 = label(g, 0.86, 0.23, directionSign('駅前通り', 'EKIMAE-DORI', 1),
    [0, 3.02, 0.135], { brightness: 1.05, px: 900 });
  box(g, [0.88, 0.25, 0.03], [0, 3.02, 0.105], P.steelDark);
  p1.renderOrder = 2;
  // plate 2 → faces the east street
  const g2 = group(g, [0.115, 2.74, 0], 'signEast');
  g2.rotation.y = Math.PI / 2;
  const p2 = label(g2, 0.76, 0.22, directionSign('コンビニ横丁', 'KONBINI-YOKOCHO', -1),
    [0, 0, 0.075], { brightness: 1.05, px: 900 });
  box(g2, [0.78, 0.24, 0.03], [0, 0, 0.048], P.steelDark);
  // small brackets back to the pole
  bars(g, [
    bar([0, 2.88, 0.07], [0, 3.02, 0.07], 0.016),
    bar([0, 2.62, 0.07], [0, 2.74, 0.07], 0.016),
  ], P.steelDark, { receive: false });
  return g;
}

function buildStopSign(parent, P, o) {
  const g = group(parent, [o.x, SIDE, o.z], 'stopSign');
  g.rotation.y = Math.PI / 2;         // face the eastbound traffic (+x)
  const H = 2.45;
  cylinder(g, 0.030, 0.040, H, [0, H / 2, 0], P.steel, { seg: 8 });
  cylinder(g, 0.06, 0.075, 0.10, [0, 0.05, 0], P.concreteDark, { seg: 8 });

  const tri = (size) => {
    const s = new THREE.Shape();
    const h = size * 0.866;
    s.moveTo(-size / 2, h / 3);
    s.lineTo(size / 2, h / 3);
    s.lineTo(0, -h * 2 / 3);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  };
  // Japanese 止まれ: plain red inverted triangle, white lettering, thin white rim
  const stopRed = M.toon(0xc8402e, { emissive: 0x5c1610, emissiveIntensity: 1.0 });
  const backing = mesh(g, tri(0.60), stopRed, [0, 2.02, 0.02], { name: 'stopSignBack' });
  addOutline(backing, 0.006);
  const rim = mesh(g, tri(0.55), M.toon(0xece9e0, { emissive: 0x3a3833, emissiveIntensity: 0.8 }),
    [0, 2.02, 0.028], { name: 'stopSignRim' });
  const face = mesh(g, tri(0.50), stopRed, [0, 2.02, 0.034], { name: 'stopSignFace' });
  label(g, 0.42, 0.40, stopText(), [0, 1.985, 0.040], { brightness: 1.0, px: 700 });
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  11 · air-conditioner outdoor units
// ═════════════════════════════════════════════════════════════════════════════
function buildAcUnit(parent, P, o) {
  const g = group(parent, [o.x, o.y || SIDE, o.z], 'acUnit');
  g.rotation.y = o.ry;
  const w = 0.80;     // along z (local x)
  const hh = 0.60;
  const d = 0.32;
  // bracket / stand
  if (o.wall) {
    bars(g, [
      bar([-w / 2 + 0.06, -0.02, -0.02], [-w / 2 + 0.06, -0.16, -0.30], 0.022),
      bar([w / 2 - 0.06, -0.02, -0.02], [w / 2 - 0.06, -0.16, -0.30], 0.022),
      bar([-w / 2 + 0.06, -0.16, -0.30], [w / 2 - 0.06, -0.16, -0.30], 0.022),
    ], P.steelDark, { receive: false });
  } else {
    bars(g, [
      bar([-w / 2 + 0.05, -0.02, 0.10], [-w / 2 + 0.05, -0.15, 0.10], 0.020),
      bar([w / 2 - 0.05, -0.02, 0.10], [w / 2 - 0.05, -0.15, 0.10], 0.020),
      bar([-w / 2 + 0.05, -0.02, -0.10], [-w / 2 + 0.05, -0.15, -0.10], 0.020),
      bar([w / 2 - 0.05, -0.02, -0.10], [w / 2 - 0.05, -0.15, -0.10], 0.020),
      bar([-w / 2 + 0.05, -0.15, 0.14], [w / 2 - 0.05, -0.15, 0.14], 0.020),
    ], P.steelDark, { receive: false });
  }
  const body = box(g, [w, hh, d], [0, hh / 2, 0], P.white, { cast: true });
  addOutline(body, OUT * 0.8);
  // fan face (front +z local)
  label(g, w * 0.92, hh * 0.86, fanGrille(), [0, hh * 0.5, d / 2 + 0.004], { brightness: 0.85, px: 700 });
  box(g, [w * 0.96, 0.03, d * 1.02], [0, hh + 0.015, 0], P.steel);
  // copper pipes running off the back
  bars(g, [
    bar([w * 0.36, hh * 0.72, -d / 2], [w * 0.36, hh * 0.95, -0.26], 0.016),
    bar([w * 0.42, hh * 0.55, -d / 2], [w * 0.42, hh * 0.20, -0.24], 0.012),
  ], M.toon(0x8a6540, { emissive: 0x241408, emissiveIntensity: 0.6 }), { receive: false });
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  12 · small life clutter
// ═════════════════════════════════════════════════════════════════════════════
function buildClutter(parent, P) {
  const g = group(parent, [0, 0, 0], 'clutter');

  // ── traffic cones ×2 (one knocked over) ──
  const coneSkinMat = M.toon(0xd0561b, {
    emissive: 0x2a0d05, emissiveIntensity: 0.6,
    map: canvasTexture(64, 128, (ctx, W, H) => {
      ctx.fillStyle = '#c9501a';
      ctx.fillRect(0, 0, W, H);
      const lg = ctx.createLinearGradient(0, 0, W, 0);
      lg.addColorStop(0, 'rgba(0,0,0,0.42)');
      lg.addColorStop(0.4, 'rgba(255,255,255,0.16)');
      lg.addColorStop(1, 'rgba(0,0,0,0.46)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ded9cc';
      ctx.fillRect(0, H * 0.34, W, H * 0.12);
      ctx.fillRect(0, H * 0.62, W, H * 0.10);
    }),
  });
  const coneGeo = new THREE.CylinderGeometry(0.028, 0.155, 0.55, 10, 1, true);
  const c1 = mesh(g, coneGeo, coneSkinMat, [-3.62, SIDE + 0.275, 2.28], { name: 'cone' });
  // one cone knocked over: lies on its lateral surface, tip pointing down-street
  // (rotating π/2+atan((rBase−rTop)/len) makes base rim + tip both touch the ground)
  const c2 = group(g, [-2.94, SIDE + 0.089, 2.00], 'coneFallen');
  c2.rotation.set(0, 0.55, 1.798);
  mesh(c2, coneGeo, coneSkinMat, [0, 0, 0], { name: 'cone' });
  // a few thin ribs keep the knocked-over cone readable from a distance
  instanced(g, UG.box, P.dark, [
    { p: [-3.62, SIDE + 0.022, 2.28], s: [0.36, 0.045, 0.36] },
  ], { receive: true });

  // ── stacked beer crates + a cardboard box at the alley mouth ──
  const crates = group(g, [-3.55, SIDE, 1.30], 'crates');
  crates.rotation.y = 0.16;
  const crateTex = canvasTexture(192, 144, cratePrint());
  const crateMat = M.toon(0x2c638f, { emissive: 0x0a1a28, emissiveIntensity: 0.7, map: crateTex });
  const cr = box(crates, [0.42, 0.30, 0.30], [0, 0.15, 0], crateMat, { cast: true });
  addOutline(cr, OUT * 0.7);
  const cr2 = box(crates, [0.42, 0.30, 0.30], [0.03, 0.45, -0.02], crateMat, { cast: true });
  cr2.rotation.y = 0.10;
  addOutline(cr2, OUT * 0.7);
  box(crates, [0.36, 0.26, 0.32], [-0.02, 0.73, 0.01], P.card, { cast: true }).rotation.y = -0.14;
  box(crates, [0.20, 0.14, 0.18], [0.05, 0.93, 0.02], P.card).rotation.y = 0.3;

  // ── mop leaning on the store's west wall inside the alley ──
  const mop = group(g, [-3.34, 0.10, 0.62], 'mop');
  mop.rotation.z = 0.14;
  mop.rotation.x = -0.06;
  cylinder(mop, 0.014, 0.014, 1.24, [0, 0.62, 0], P.wood, { seg: 6 });
  box(mop, [0.05, 0.09, 0.24], [0, 1.22, 0], P.dark);
  box(mop, [0.20, 0.22, 0.06], [0, 0.12, 0.03], M.toon(0x7d8175, {
    emissive: 0x141614, emissiveIntensity: 0.6,
  }));
  // bucket
  cylinder(g, 0.13, 0.10, 0.26, [-3.10, 0.10 + 0.13, 0.98], P.steel, { seg: 10 });

  // ── 禁煙 A-boards beside the entrance mat ──
  for (const s of [{ x: 1.33, z: 1.05, ry: 0.75 }, { x: 2.26, z: 1.74, ry: 0.75 }]) {
    const sg = group(g, [s.x, SIDE, s.z], 'noSmokingSign');
    sg.rotation.y = s.ry;
    const a = box(sg, [0.24, 0.02, 0.20], [0, 0.02, 0], P.dark);
    const p1 = box(sg, [0.24, 0.28, 0.012], [0, 0.16, 0.055], P.dark);
    p1.rotation.x = 0.18;
    const p2 = box(sg, [0.24, 0.28, 0.012], [0, 0.16, -0.055], P.dark);
    p2.rotation.x = -0.18;
    label(sg, 0.22, 0.26, (ctx, cw, ch) => {
      ctx.clearRect(0, 0, cw, ch);
      ctx.strokeStyle = '#e8594a';
      ctx.lineWidth = Math.max(2, ch * 0.05);
      ctx.beginPath();
      ctx.arc(cw * 0.5, ch * 0.36, ch * 0.20, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cw * 0.34, ch * 0.52);
      ctx.lineTo(cw * 0.66, ch * 0.20);
      ctx.stroke();
      drawText(ctx, '禁煙', cw * 0.5, ch * 0.78, {
        size: ch * 0.22, color: '#f2efe6', font: FONT.jp, weight: 'bold',
      });
    }, [0, 0.17, 0.066], { brightness: 1.0, px: 520, rx: 0.18 });
    a.receiveShadow = true;
  }
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  buildProps() — the whole street-furniture set
// ═════════════════════════════════════════════════════════════════════════════
export function buildProps() {
  const g = new THREE.Group();
  g.name = 'props';
  const P = makeMaterials();
  const anim = { signal: null };
  const flickers = [];
  const lampExtra = {};

  // ── 01 vending machines (cool-blue on the south pavement, warm-pink in the
  //        recess between the store and the east building) ──
  flickers.push(buildVending(g, P, {
    x: -4.42, z: 1.58, ry: 0, w: 0.98, theme: 'cool',
  }).userData.flicker);
  flickers.push(buildVending(g, P, {
    x: 3.10, z: -3.80, ry: Math.PI / 2, w: 0.92, theme: 'warm',
  }).userData.flicker);

  // ── 02 mamachari parked in front of the glass ──
  buildBicycle(g, P, { x: -0.55, z: 1.90, ry: 2.67, lean: 0 });
  buildBicycle(g, P, { x: 0.78, z: 1.90, ry: 2.72, lean: 0.055 });

  // ── 03 umbrella stand by the chamfered entrance ──
  buildUmbrellaStand(g, P, { x: 2.94, z: 1.30, ry: 0.75 });

  // ── 04 recycling bins facing the door ──
  buildTrashBins(g, P, { x: 3.08, z: 0.40, ry: -1.45 });

  // ── 05 street lamp, arm over the corner ──
  buildStreetLamp(g, P, { x: 3.88, z: 1.35 }, lampExtra);

  // ── 06 utility pole + the web of overhead wires ──
  buildUtilityPole(g, P, { x: 3.45, z: 1.85 });
  buildWires(g, P, { x: 3.45, z: 1.85 });

  // ── 07 traffic signal ──
  buildTrafficSignal(g, P, { x: 2.95, z: 2.32 }, anim);

  // ── 08 corner guardrail ──
  buildGuardrail(g, P);

  // ── 09 notice board on the left building's south face ──
  buildNoticeBoard(g, P, { x: -5.45, z: 1.0 });

  // ── 10 signage ──
  buildDirectionSigns(g, P, 3.88, 1.35);
  buildStopSign(g, P, { x: 3.52, z: 2.34 });

  // ── 11 air-conditioner outdoor units ──
  buildAcUnit(g, P, { x: -4.74, y: 1.15, z: -1.60, ry: Math.PI / 2, wall: true });  // alley, wall hung
  buildAcUnit(g, P, { x: 3.58, y: SIDE + 0.15, z: -4.12, ry: 0, wall: false });     // east recess

  // ── 12 clutter ──
  buildClutter(g, P);

  // ═══════════════════════════════════════════════════════════════════════════
  //  animation: signal cycle · vending-machine tube flicker · lamp buzz
  // ═══════════════════════════════════════════════════════════════════════════
  const sig = anim.signal;
  const CYCLE = 11.0;                        // 緑 4.6s → 黄 1.5s → 赤 4.9s
  const sigColors = [0x3ff0b4, 0xffc23c, 0xff4a45];
  const tmpC = new THREE.Color();

  g.userData.update = (t) => {
    // ── signal: green → yellow → red, soft cross-fades ──
    if (sig && sig.lensIM) {
      const ph = ((t % CYCLE) + CYCLE) % CYCLE;
      const bandB = (s, e) => Math.min(1,
        Math.max(0, (ph - s) / 0.34),
        Math.max(0, (e - ph) / 0.34));
      const v = [bandB(0.0, 4.6), bandB(4.6, 6.1), bandB(6.1, CYCLE)];
      for (let i = 0; i < 3; i++) {
        tmpC.setHex(sigColors[i]).multiplyScalar(0.055 + 0.945 * v[i]);
        sig.lensIM.setColorAt(i, tmpC);
        if (sig.lensGlows[i]) sig.lensGlows[i].material.opacity = 0.015 + 0.30 * v[i];
      }
      if (sig.lensIM.instanceColor) sig.lensIM.instanceColor.needsUpdate = true;
      // pedestrian head: red while cars run, green while the road is stopped
      const redOn = Math.max(v[0], v[1]);
      const grnOn = v[2];
      if (sig.redPlate) sig.redPlate.material.color.setRGB(0.09 + 0.95 * redOn, 0.03 + 0.08 * redOn, 0.02 + 0.06 * redOn);
      if (sig.greenPlate) sig.greenPlate.material.color.setRGB(0.02 + 0.10 * grnOn, 0.07 + 0.92 * grnOn, 0.06 + 0.58 * grnOn);
      if (sig.pedGlow) {
        sig.pedGlow.material.color.setHex(redOn > grnOn ? 0xff6a5a : 0x5cf0b8);
        sig.pedGlow.material.opacity = 0.03 + 0.15 * Math.max(redOn, grnOn);
      }
    }

    // ── vending machines: fluorescent tubes with a slow breathing flicker ──
    for (let i = 0; i < flickers.length; i++) {
      const f = flickers[i];
      if (!f) continue;
      const breathe = 0.955 + 0.045 * Math.sin(t * 5.3 + f.seed);
      const dip = Math.sin(t * 1.13 + f.seed * 3.7) > 0.9975 ? 0.42 : 1;
      f.mats[0].color.setScalar(f.base[0] * breathe * dip);
      f.mats[1].color.setScalar(f.base[1] * (0.985 + 0.015 * Math.sin(t * 7.1 + f.seed)));
      if (f.halo) f.halo.material.opacity = 0.30 * (0.9 + 0.1 * Math.sin(t * 4.1 + f.seed)) * dip;
    }

    // ── street lamp: the occasional tired buzz ──
    if (lampExtra.lampMats) {
      const L = lampExtra.lampMats;
      const buzz = Math.sin(t * 0.63) > 0.9965 ? 0.5 : 1;
      L.lens.color.setScalar(1.25 * (0.95 + 0.05 * Math.sin(t * 2.1)) * buzz);
      if (L.halo) L.halo.material.opacity = 0.34 * (0.92 + 0.08 * Math.sin(t * 2.1)) * buzz;
    }
  };

  return g;
}



