import * as THREE from 'three';
import { C, FONT } from './palette.js';
import { L } from './layout.js';

/* ------------------------------------------------------------------ */
/* low level helpers                                                   */
/* ------------------------------------------------------------------ */

export function rng(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  return { c, ctx };
}

export function tex(c, opts = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = opts.anisotropy ?? 8;
  const wrap = opts.wrap ?? THREE.ClampToEdgeWrapping;
  t.wrapS = wrap;
  t.wrapT = wrap;
  if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
  t.needsUpdate = true;
  return t;
}

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function fillRR(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  rr(ctx, x, y, w, h, r);
  ctx.fill();
}

function speckle(ctx, w, h, count, colors, rand, size = 1.6, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(rand() * colors.length) | 0];
    const s = size * (0.4 + rand());
    ctx.fillRect(rand() * w, rand() * h, s, s);
  }
  ctx.restore();
}

function fitText(ctx, text, maxW, startSize, family, weight = '900', min = 10) {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxW) return size;
    size -= 2;
  } while (size > min);
  return min;
}

export function drawText(ctx, text, x, y, opts = {}) {
  const {
    family = FONT.jp,
    weight = '900',
    size = 48,
    color = '#fff',
    align = 'center',
    baseline = 'middle',
    maxWidth = null,
    stroke = null,
    strokeWidth = 2,
    letterSpacing = null,
    shadow = null,
  } = opts;
  let s = size;
  if (maxWidth) s = fitText(ctx, text, maxWidth, size, family, weight, 8);
  ctx.save();
  ctx.font = `${weight} ${s}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillStyle = color;
  if (letterSpacing != null && 'letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`;
  if (shadow) {
    ctx.shadowColor = shadow;
    ctx.shadowBlur = s * 0.28;
  }
  if (stroke) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
  }
  ctx.fillText(text, x, y);
  ctx.restore();
  return s;
}

export function verticalText(ctx, text, x, y, opts = {}) {
  const {
    family = FONT.jpDisplay,
    weight = '900',
    size = 64,
    color = '#fff',
    lineGap = 1.08,
    stroke = null,
    strokeWidth = 2,
  } = opts;
  ctx.save();
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = [...text];
  const step = size * lineGap;
  const startY = y - ((chars.length - 1) * step) / 2;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const cy = startY + i * step;
    if (ch === 'ー' || ch === '〜') {
      // rotate long vowel mark vertically
      ctx.save();
      ctx.translate(x, cy);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = color;
      if (stroke) {
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = stroke;
        ctx.strokeText(ch, 0, 0);
      }
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    } else {
      if (stroke) {
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = stroke;
        ctx.strokeText(ch, x, cy);
      }
      ctx.fillStyle = color;
      ctx.fillText(ch, x, cy);
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* surface textures                                                    */
/* ------------------------------------------------------------------ */

export function asphaltTexture({ size = 512, seed = 11, repeat = [5, 5] } = {}) {
  const { c, ctx } = canvas2d(size, size);
  const rand = rng(seed);
  ctx.fillStyle = '#2a3145';
  ctx.fillRect(0, 0, size, size);
  // broad patches
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(40,50,72,0.16)' : 'rgba(14,18,28,0.18)';
    ctx.beginPath();
    ctx.ellipse(rand() * size, rand() * size, 20 + rand() * 90, 14 + rand() * 60, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  speckle(ctx, size, size, 5200, ['rgba(120,132,160,0.20)', 'rgba(20,24,36,0.4)', 'rgba(72,84,110,0.22)'], rand, 1.5);
  // faint tar seams
  ctx.strokeStyle = 'rgba(12,15,24,0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    let x = rand() * size;
    let y = rand() * size;
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (rand() - 0.5) * 90;
      y += 25 + rand() * 55;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return tex(c, { repeat, wrap: THREE.RepeatWrapping });
}

export function concreteTexture({ size = 512, seed = 22, color = '#6e7079', repeat = [3, 3], joints = 4 } = {}) {
  const { c, ctx } = canvas2d(size, size);
  const rand = rng(seed);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  speckle(ctx, size, size, 5000, ['rgba(255,255,255,0.06)', 'rgba(0,0,0,0.10)', 'rgba(30,40,55,0.08)'], rand, 1.4);
  ctx.strokeStyle = 'rgba(20,22,30,0.35)';
  ctx.lineWidth = 2;
  const step = size / joints;
  for (let i = 0; i <= joints; i++) {
    ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
  }
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = 'rgba(20,24,32,0.12)';
    ctx.beginPath();
    ctx.ellipse(rand() * size, rand() * size, 6 + rand() * 26, 3 + rand() * 12, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return tex(c, { repeat, wrap: THREE.RepeatWrapping });
}

export function pavingTexture({ size = 512, seed = 33, repeat = [6, 3] } = {}) {
  const { c, ctx } = canvas2d(size, size);
  const rand = rng(seed);
  ctx.fillStyle = C.sidewalk;
  ctx.fillRect(0, 0, size, size);
  const cols = 4;
  const rows = 8;
  const cw = size / cols;
  const ch = size / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const off = y % 2 ? cw * 0.5 : 0;
      const v = 0.92 + rand() * 0.16;
      ctx.fillStyle = `rgba(${Math.round(80 * v)},${Math.round(81 * v)},${Math.round(93 * v)},1)`;
      ctx.fillRect(x * cw + off + 1.5, y * ch + 1.5, cw - 3, ch - 3);
      // top-left highlight for a tiny bevel
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x * cw + off + 2, y * ch + 2, cw - 4, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x * cw + off + 2, y * ch + ch - 4, cw - 4, 2);
    }
  }
  speckle(ctx, size, size, 2400, ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.12)'], rand, 1.2);
  // damp patches
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = 'rgba(22,28,44,0.16)';
    ctx.beginPath();
    ctx.ellipse(rand() * size, rand() * size, 8 + rand() * 50, 4 + rand() * 22, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return tex(c, { repeat, wrap: THREE.RepeatWrapping });
}

export function storeFloorTexture({ size = 512, seed = 44 } = {}) {
  const { c, ctx } = canvas2d(size, size);
  const rand = rng(seed);
  ctx.fillStyle = '#e6dcc8';
  ctx.fillRect(0, 0, size, size);
  const n = 8;
  const cell = size / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const v = 0.96 + rand() * 0.06;
      ctx.fillStyle = `rgba(${Math.round(226 * v)},${Math.round(216 * v)},${Math.round(196 * v)},1)`;
      ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      ctx.strokeStyle = 'rgba(150,138,116,0.28)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
    }
  }
  speckle(ctx, size, size, 1200, ['rgba(120,110,90,0.10)', 'rgba(255,255,255,0.1)'], rand, 1.2);
  return tex(c, { repeat: [5, 4], wrap: THREE.RepeatWrapping });
}

export function ceilingTexture({ size = 256, seed = 55 } = {}) {
  const { c, ctx } = canvas2d(size, size);
  const rand = rng(seed);
  ctx.fillStyle = '#f7f0df';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(160,150,130,0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo((i * size) / 4, 0); ctx.lineTo((i * size) / 4, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, (i * size) / 4); ctx.lineTo(size, (i * size) / 4); ctx.stroke();
  }
  speckle(ctx, size, size, 500, ['rgba(180,170,150,0.08)'], rand, 1.2);
  return tex(c, { repeat: [4, 4], wrap: THREE.RepeatWrapping });
}

export function brickTexture({ size = 512, seed = 66, repeat = [3, 4] } = {}) {
  const { c, ctx } = canvas2d(size, size);
  const rand = rng(seed);
  ctx.fillStyle = '#39302f';
  ctx.fillRect(0, 0, size, size);
  const bh = 24;
  const bw = 64;
  for (let row = 0; row < size / bh; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let col = -1; col < size / bw + 1; col++) {
      const v = 0.8 + rand() * 0.35;
      ctx.fillStyle = `rgb(${Math.round(94 * v)},${Math.round(65 * v)},${Math.round(61 * v)})`;
      ctx.fillRect(col * bw + off + 2, row * bh + 2, bw - 3, bh - 3);
    }
  }
  speckle(ctx, size, size, 2000, ['rgba(0,0,0,0.16)', 'rgba(255,220,200,0.05)'], rand, 1.6);
  return tex(c, { repeat, wrap: THREE.RepeatWrapping });
}

export function shutterTexture({ w = 512, h = 512, seed = 77 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  const rand = rng(seed);
  ctx.fillStyle = C.shutter;
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 12) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, y, w, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, y + 8, w, 3);
  }
  speckle(ctx, w, h, 900, ['rgba(0,0,0,0.18)', 'rgba(210,190,160,0.04)'], rand, 2);
  // rust streaks
  for (let i = 0; i < 12; i++) {
    const x = rand() * w;
    ctx.fillStyle = 'rgba(110,74,50,0.18)';
    ctx.fillRect(x, rand() * h * 0.4, 1 + rand() * 3, 40 + rand() * 160);
  }
  return tex(c);
}

export function tileWallTexture({ size = 256, seed = 88, repeat = [4, 4] } = {}) {
  const { c, ctx } = canvas2d(size, size);
  const rand = rng(seed);
  ctx.fillStyle = '#7b7166';
  ctx.fillRect(0, 0, size, size);
  const cell = 32;
  for (let y = 0; y < size / cell; y++) {
    for (let x = 0; x < size / cell; x++) {
      const v = 0.86 + rand() * 0.18;
      ctx.fillStyle = `rgb(${Math.round(126 * v)},${Math.round(113 * v)},${Math.round(99 * v)})`;
      ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
    }
  }
  return tex(c, { repeat, wrap: THREE.RepeatWrapping });
}

export function wetMaskTexture({ size = 1024 } = {}) {
  const { c, ctx } = canvas2d(size, size);
  const rand = rng(2024);
  const sx = size / L.base.size;
  const toC = (x) => (x + L.base.half) * sx;
  const toZ = (z) => (z + L.base.half) * sx;
  // base wetness on asphalt: puddles only, plus a light film
  ctx.fillStyle = 'rgb(26,26,26)';
  ctx.fillRect(0, 0, size, size);
  // broad damp film on the streets
  ctx.fillStyle = 'rgb(92,92,92)';
  ctx.fillRect(toC(L.mainRoad.x0), toZ(L.mainRoad.z0), (L.mainRoad.x1 - L.mainRoad.x0) * sx, (L.mainRoad.z1 - L.mainRoad.z0) * sx);
  ctx.fillRect(toC(L.sideRoad.x0), toZ(L.sideRoad.z0), (L.sideRoad.x1 - L.sideRoad.x0) * sx, (L.sideRoad.z1 - L.sideRoad.z0) * sx);
  // carved puddles
  for (const p of L.puddles) {
    const n = 14;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const wob = 0.78 + rand() * 0.36;
      const x = p.x + Math.cos(a) * p.rx * wob;
      const z = p.z + Math.sin(a) * p.rz * wob;
      const px = toC(x);
      const py = toZ(z);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(toC(p.x), toZ(p.z), 2, toC(p.x), toZ(p.z), Math.max(p.rx, p.rz) * sx);
    g.addColorStop(0, `rgba(255,255,255,${p.a})`);
    g.addColorStop(0.7, `rgba(230,230,230,${p.a * 0.85})`);
    g.addColorStop(1, 'rgba(120,120,120,0)');
    ctx.fillStyle = g;
    ctx.fill();
  }
  // soft small wet spots
  for (let i = 0; i < 70; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 3 + rand() * 22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(220,220,220,0.5)');
    g.addColorStop(1, 'rgba(200,200,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = tex(c, { srgb: false });
  return t;
}

/* ------------------------------------------------------------------ */
/* signage / posters / decals                                          */
/* ------------------------------------------------------------------ */

export function martSignTexture({ w = 2048, h = 384 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  ctx.fillStyle = '#fff6dd';
  ctx.fillRect(0, 0, w, h);
  // colour bands
  ctx.fillStyle = C.storeTeal;
  ctx.fillRect(0, 0, w, h * 0.09);
  ctx.fillStyle = C.storeOrange;
  ctx.fillRect(0, h * 0.91, w, h * 0.09);
  // soft radial studio light
  const g = ctx.createRadialGradient(w * 0.42, h * 0.45, 20, w * 0.42, h * 0.45, w * 0.7);
  g.addColorStop(0, 'rgba(255,255,255,0.65)');
  g.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // left logo mark: little sun / store awning
  const lx = 118;
  const ly = h * 0.5;
  ctx.save();
  ctx.translate(lx, ly);
  ctx.fillStyle = C.storeTeal;
  ctx.beginPath();
  ctx.arc(0, 0, 78, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff6dd';
  ctx.beginPath();
  ctx.arc(0, 0, 56, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate((i / 8) * Math.PI * 2);
    ctx.fillStyle = C.storeOrange;
    ctx.beginPath();
    ctx.moveTo(0, -72);
    ctx.lineTo(9, -52);
    ctx.lineTo(-9, -52);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = C.storeOrange;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawText(ctx, 'HIKARI MART', w * 0.52, h * 0.38, {
    family: FONT.latin,
    size: 138,
    color: '#1d3b46',
    align: 'left',
    letterSpacing: 4,
    maxWidth: w * 0.46,
  });
  drawText(ctx, 'ひかりマート', w * 0.52, h * 0.68, {
    family: FONT.jpDisplay,
    weight: '700',
    size: 66,
    color: '#33646a',
    align: 'left',
    letterSpacing: 12,
    maxWidth: w * 0.42,
  });
  // 24h badge
  ctx.save();
  ctx.translate(w * 0.895, h * 0.5);
  ctx.fillStyle = C.storeTeal;
  ctx.beginPath();
  ctx.arc(0, 0, 88, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff6dd';
  ctx.beginPath();
  ctx.arc(0, 0, 78, 0, Math.PI * 2);
  ctx.fill();
  drawText(ctx, '24H', 0, -8, { family: FONT.latin, size: 58, color: '#1d3b46' });
  drawText(ctx, 'OPEN', 0, 44, { family: FONT.latinBold, weight: '700', size: 25, color: '#3c757a', letterSpacing: 3 });
  ctx.restore();
  // thin frame
  ctx.strokeStyle = 'rgba(80,80,70,0.28)';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  return tex(c);
}

export function martVerticalTexture({ w = 320, h = 1024 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#fff9e8');
  g.addColorStop(0.5, '#fff2d2');
  g.addColorStop(1, '#ffe9c2');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = C.storeTeal;
  ctx.fillRect(0, 0, w, 0.055 * h);
  ctx.fillRect(0, 0.945 * h, w, 0.055 * h);
  ctx.fillStyle = C.storeOrange;
  ctx.fillRect(0, 0.06 * h, w, 10);
  ctx.fillRect(0, 0.935 * h - 10, w, 10);
  drawText(ctx, 'ひかり', w / 2, h * 0.16, { family: FONT.jpDisplay, size: 100, color: '#1d3b46', letterSpacing: 10 });
  verticalText(ctx, 'マート', w / 2, h * 0.47, { size: 104, color: '#2c6b6a', lineGap: 1.1 });
  ctx.fillStyle = C.storeOrange;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.82, 52, 0, Math.PI * 2);
  ctx.fill();
  drawText(ctx, '24', w / 2, h * 0.815, { family: FONT.latin, size: 56, color: '#fff6dd' });
  drawText(ctx, 'H', w / 2, h * 0.89, { family: FONT.latin, size: 34, color: '#2c6b6a' });
  return tex(c);
}

export function storeStripeTexture({ w = 512, h = 64 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  ctx.fillStyle = '#f6f0df';
  ctx.fillRect(0, 0, w, h);
  const n = 12;
  for (let i = 0; i < n; i += 2) {
    ctx.fillStyle = C.storeTeal;
    ctx.fillRect((i * w) / n, 0, w / n, h * 0.42);
    ctx.fillStyle = C.storeOrange;
    ctx.fillRect(((i + 1) * w) / n, h * 0.58, w / n, h * 0.42);
  }
  return tex(c, { repeat: [2, 1], wrap: THREE.RepeatWrapping });
}

export function posterTexture({
  w = 384,
  h = 576,
  seed = 4,
  kind = 'sale',
} = {}) {
  const { c, ctx } = canvas2d(w, h);
  const rand = rng(seed);
  const schemes = {
    sale: ['#f4e6c8', '#d94f43', '#f5b64d', '#3b3540'],
    onigiri: ['#dff1e4', '#3e8b5d', '#f2c14e', '#26483a'],
    coffee: ['#4a2f2a', '#e9c194', '#f5efe2', '#f7d9a8'],
    new: ['#f4d9e0', '#d95a7c', '#ffe9a8', '#4a2c39'],
    notice: ['#efe9d8', '#3e5d8c', '#e0d3b0', '#33353e'],
    ice: ['#d9ecf5', '#4b93c4', '#f7f2df', '#2f5a78'],
  };
  const [bg, main, accent, ink] = schemes[kind] ?? schemes.sale;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // header band
  ctx.fillStyle = main;
  ctx.fillRect(0, 0, w, h * 0.19);
  ctx.fillStyle = accent;
  ctx.fillRect(0, h * 0.19, w, 10);
  if (kind === 'sale') {
    drawText(ctx, 'SALE', w / 2, h * 0.1, { family: FONT.latin, size: 92, color: '#fff6df', letterSpacing: 4, maxWidth: w * 0.9 });
    drawText(ctx, 'ポイント2倍', w / 2, h * 0.27, { family: FONT.jp, size: 44, color: ink });
    // product blobs
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = [C.onigiriWrap, C.bentoBrown, C.snackYellow][i];
      fillRR(ctx, w * (0.12 + i * 0.28), h * 0.36, w * 0.2, h * 0.17, 16, ctx.fillStyle);
      ctx.strokeStyle = 'rgba(60,50,45,0.45)';
      ctx.lineWidth = 3;
      rr(ctx, w * (0.12 + i * 0.28), h * 0.36, w * 0.2, h * 0.17, 16);
      ctx.stroke();
    }
    drawText(ctx, 'おにぎり', w / 2, h * 0.63, { family: FONT.jp, size: 56, color: main });
    drawText(ctx, '100', w * 0.44, h * 0.78, { family: FONT.latin, size: 130, color: main, align: 'right' });
    drawText(ctx, '円', w * 0.48, h * 0.84, { family: FONT.jp, size: 40, color: ink, align: 'left' });
    drawText(ctx, '税込', w * 0.78, h * 0.84, { family: FONT.jp, weight: '700', size: 26, color: ink });
    drawText(ctx, 'からあげ 新発売', w / 2, h * 0.93, { family: FONT.jp, weight: '700', size: 28, color: accent });
  } else if (kind === 'onigiri') {
    drawText(ctx, '新発売', w / 2, h * 0.1, { family: FONT.jp, size: 64, color: '#f7f3e2' });
    ctx.fillStyle = '#f4f0e3';
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.27);
    ctx.lineTo(w * 0.75, h * 0.62);
    ctx.lineTo(w * 0.25, h * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#314f3b';
    ctx.fillRect(w * 0.42, h * 0.5, w * 0.16, h * 0.14);
    drawText(ctx, '鮭', w / 2, h * 0.47, { family: FONT.jp, size: 38, color: '#b45b4e' });
    drawText(ctx, 'おにぎり', w / 2, h * 0.72, { family: FONT.jp, size: 52, color: ink });
    drawText(ctx, '120円', w / 2, h * 0.82, { family: FONT.jp, size: 50, color: main });
    drawText(ctx, '炊きたて', w / 2, h * 0.92, { family: FONT.jp, weight: '700', size: 28, color: accent });
  } else if (kind === 'coffee') {
    drawText(ctx, 'COFFEE', w / 2, h * 0.09, { family: FONT.latin, size: 64, color: '#f5e2c4', letterSpacing: 4 });
    // cup
    ctx.fillStyle = '#f5efe2';
    ctx.beginPath();
    ctx.moveTo(w * 0.28, h * 0.28);
    ctx.lineTo(w * 0.72, h * 0.28);
    ctx.lineTo(w * 0.66, h * 0.62);
    ctx.lineTo(w * 0.34, h * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6b412c';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.3, w * 0.21, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f5efe2';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(w * 0.75, h * 0.43, 34, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 6;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(w * (0.42 + i * 0.08), h * 0.18);
      ctx.bezierCurveTo(w * (0.38 + i * 0.08), h * 0.13, w * (0.46 + i * 0.08), h * 0.1, w * (0.42 + i * 0.08), h * 0.05);
      ctx.stroke();
    }
    drawText(ctx, 'ホットコーヒー', w / 2, h * 0.72, { family: FONT.jp, size: 46, color: '#f5e2c4' });
    drawText(ctx, '¥100', w / 2, h * 0.82, { family: FONT.latin, size: 82, color: '#f0b96a' });
    drawText(ctx, 'S / M / L', w / 2, h * 0.92, { family: FONT.latinBold, weight: '700', size: 30, color: '#d8b48a', letterSpacing: 2 });
  } else if (kind === 'ice') {
    drawText(ctx, 'ICE', w / 2, h * 0.11, { family: FONT.latin, size: 84, color: main, letterSpacing: 2 });
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = ['#f7d2d9', '#cbe6d2', '#f5e6a8'][i];
      ctx.beginPath();
      ctx.arc(w * (0.27 + i * 0.23), h * 0.42, w * 0.11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,70,80,0.35)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    drawText(ctx, 'アイス', w / 2, h * 0.65, { family: FONT.jp, size: 58, color: ink });
    drawText(ctx, '全品 20% OFF', w / 2, h * 0.76, { family: FONT.jp, size: 38, color: main });
    drawText(ctx, 'ひんやり', w / 2, h * 0.88, { family: FONT.jp, weight: '700', size: 30, color: '#4b93c4' });
  } else {
    drawText(ctx, 'お知らせ', w / 2, h * 0.1, { family: FONT.jp, size: 58, color: '#f4efe1' });
    ctx.fillStyle = ink;
    for (let i = 0; i < 7; i++) {
      const y = h * (0.25 + i * 0.07);
      ctx.globalAlpha = 0.6;
      ctx.fillRect(w * 0.12, y, w * (0.5 + rand() * 0.3), 9);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = main;
    ctx.fillRect(w * 0.12, h * 0.8, w * 0.32, h * 0.1);
    drawText(ctx, '地域情報', w * 0.28, h * 0.85, { family: FONT.jp, size: 24, color: '#f4efe1' });
    drawText(ctx, 'ひかり町', w * 0.5, h * 0.94, { family: FONT.jp, weight: '700', size: 24, color: ink });
  }
  // paper grain
  speckle(ctx, w, h, 900, ['rgba(255,255,255,0.06)', 'rgba(0,0,0,0.05)'], rand, 1.2);
  // border
  ctx.strokeStyle = 'rgba(50,45,40,0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  return tex(c);
}

export function magazineTexture({ w = 192, h = 256, seed = 1, idx = 0 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  const rand = rng(seed + idx * 7);
  const schemes = [
    ['#e05f6f', '#f7e7cf', '#3f2b35'],
    ['#4a8fbe', '#f2f0e5', '#20384c'],
    ['#e9c04f', '#383028', '#fff6dd'],
    ['#6fb37c', '#f5f0df', '#2a4231'],
    ['#8a6fb3', '#f3e9f5', '#392c49'],
    ['#d8835a', '#f8efdf', '#4a2c22'],
  ];
  const [main, bg, ink] = schemes[idx % schemes.length];
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = main;
  ctx.fillRect(0, 0, w, h * 0.3);
  drawText(ctx, ['anime', 'CITY', 'POP', 'NEKO', 'GAME', 'TRAVEL'][idx % 6].toUpperCase(), w / 2, h * 0.14, {
    family: FONT.latin,
    size: 34,
    color: bg,
    maxWidth: w * 0.92,
  });
  // big portrait block
  ctx.fillStyle = ['#f3c9a7', '#dfb38e', '#f0d2bd'][idx % 3];
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.48, w * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.42, w * 0.17, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.fill();
  ctx.fillStyle = 'rgba(30,25,25,0.75)';
  ctx.fillRect(w * 0.22, h * 0.68, w * 0.56, 6);
  drawText(ctx, '特集', w * 0.5, h * 0.78, { family: FONT.jp, size: 26, color: ink });
  ctx.fillStyle = main;
  ctx.fillRect(w * 0.12, h * 0.86, w * 0.76, 20);
  drawText(ctx, 'NEW', w * 0.5, h * 0.9, { family: FONT.latin, size: 20, color: bg });
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  return tex(c);
}

export function streetNameTexture({ w = 512, h = 160 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  ctx.fillStyle = '#2f5f9e';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#e8edf3';
  ctx.lineWidth = 7;
  ctx.strokeRect(7, 7, w - 14, h - 14);
  drawText(ctx, 'ひかり町 2丁目', w / 2, h * 0.4, { family: FONT.jp, size: 48, color: '#f2f6fb', maxWidth: w * 0.86 });
  drawText(ctx, 'HIKARI-CHO 2', w / 2, h * 0.76, { family: FONT.latinBold, weight: '700', size: 25, color: '#cfdceb', letterSpacing: 4 });
  return tex(c);
}

export function windowDecalTexture({ w = 1024, h = 256 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,248,228,0.94)';
  const items = [
    ['ATM', 'ATM'],
    ['コピー', 'COPY'],
    ['宅配便', 'DELIVERY'],
    ['公共料金', 'PAYMENT'],
  ];
  const cell = w / 4;
  for (let i = 0; i < 4; i++) {
    const x = cell * i + cell * 0.5;
    ctx.strokeStyle = C.storeTeal;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, h * 0.34, 44, 0, Math.PI * 2);
    ctx.stroke();
    drawText(ctx, ['¥', '⎙', '□', '◉'][i], x, h * 0.34, { family: FONT.latin, size: 44, color: C.storeTeal });
    drawText(ctx, items[i][0], x, h * 0.66, { family: FONT.jp, size: 38, color: '#3e4a4d', maxWidth: cell * 0.85 });
    drawText(ctx, items[i][1], x, h * 0.84, { family: FONT.latinBold, weight: '700', size: 18, color: '#7e8a8c', letterSpacing: 2 });
  }
  return tex(c);
}

export function priceTagTexture({ w = 128, h = 64, text = '120', color = '#d94f43' } = {}) {
  const { c, ctx } = canvas2d(w, h);
  fillRR(ctx, 0, 0, w, h, 8, '#fff8e6');
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(w * 0.78, h * 0.5, 27, 0, Math.PI * 2);
  ctx.fill();
  drawText(ctx, text, w * 0.42, h * 0.52, { family: FONT.latin, size: 34, color: '#2f2b2b', align: 'center' });
  drawText(ctx, '円', w * 0.78, h * 0.53, { family: FONT.jp, size: 20, color: '#fff8e6' });
  return tex(c);
}

export function vendingFrontTexture({ w = 512, h = 1024, body = '#3f7fd0', warm = false } = {}) {
  const { c, ctx } = canvas2d(w, h);
  const rand = rng(warm ? 8 : 9);
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, w, h);
  // top branding
  ctx.fillStyle = warm ? '#f3e4c8' : '#eef8ff';
  ctx.fillRect(0, 0, w, h * 0.12);
  drawText(ctx, warm ? 'あったか〜い' : 'つめた〜い', w / 2, h * 0.06, { family: FONT.jp, size: 58, color: warm ? '#b5563f' : '#2b6aa3', maxWidth: w * 0.9 });
  // product window
  ctx.fillStyle = 'rgba(20,28,40,0.25)';
  ctx.fillRect(w * 0.05, h * 0.15, w * 0.9, h * 0.54);
  const cols = 5;
  const rows = 5;
  const cw = (w * 0.8) / cols;
  const rh = (h * 0.45) / rows;
  const cans = [
    '#e05a54', '#4f9fd0', '#f1cb5c', '#5bbf7e', '#f4f0e6',
    '#d9794f', '#7d6ab5', '#e6dccb', '#66c2c9', '#df5f88',
  ];
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = w * 0.1 + col * cw + cw * 0.5;
      const y = h * 0.19 + r * rh + rh * 0.5;
      ctx.fillStyle = cans[(r * cols + col) % cans.length];
      fillRR(ctx, x - cw * 0.26, y - rh * 0.34, cw * 0.52, rh * 0.68, 6, ctx.fillStyle);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(x - cw * 0.2, y - rh * 0.3, cw * 0.08, rh * 0.58);
      ctx.fillStyle = 'rgba(20,25,35,0.65)';
      ctx.fillRect(x - cw * 0.12, y + rh * 0.1, cw * 0.24, 3);
    }
  }
  // buttons and coin slot
  for (let r = 0; r < rows; r++) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    fillRR(ctx, w * 0.82, h * 0.2 + r * rh, w * 0.11, rh * 0.36, 4, ctx.fillStyle);
    ctx.fillStyle = r === 2 ? '#ff8a5c' : '#3c596f';
    ctx.fillRect(w * 0.85, h * 0.24 + r * rh, w * 0.05, rh * 0.16);
  }
  // lower panel
  ctx.fillStyle = warm ? '#f0e2c8' : '#eaf6ff';
  ctx.fillRect(w * 0.06, h * 0.73, w * 0.88, h * 0.16);
  drawText(ctx, '¥ 130', w * 0.32, h * 0.81, { family: FONT.latin, size: 50, color: '#283f52' });
  ctx.fillStyle = '#2a3746';
  ctx.fillRect(w * 0.7, h * 0.78, w * 0.16, h * 0.035);
  ctx.fillStyle = '#9aa9b4';
  ctx.fillRect(w * 0.73, h * 0.83, w * 0.1, h * 0.02);
  // pickup slot
  ctx.fillStyle = 'rgba(16,22,32,0.72)';
  fillRR(ctx, w * 0.16, h * 0.9, w * 0.68, h * 0.07, 8, ctx.fillStyle);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 3;
  rr(ctx, w * 0.16, h * 0.9, w * 0.68, h * 0.07, 8);
  ctx.stroke();
  // subtle panel seams
  ctx.strokeStyle = 'rgba(20,30,40,0.25)';
  ctx.lineWidth = 4;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(0, (h * i) / 5);
    ctx.lineTo(w, (h * i) / 5);
    ctx.stroke();
  }
  return tex(c);
}

export function parkingSignTexture({ w = 256, h = 256 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  ctx.fillStyle = '#2f5f9e';
  fillRR(ctx, 6, 6, w - 12, h - 12, 18, ctx.fillStyle);
  ctx.strokeStyle = '#f1f5fa';
  ctx.lineWidth = 8;
  rr(ctx, 14, 14, w - 28, h - 28, 12);
  ctx.stroke();
  drawText(ctx, 'P', w / 2, h * 0.44, { family: FONT.latin, size: 150, color: '#f4f8fc' });
  drawText(ctx, 'ひかり町', w / 2, h * 0.78, { family: FONT.jp, size: 28, color: '#e4edf6' });
  drawText(ctx, '2丁目駐車場', w / 2, h * 0.9, { family: FONT.jp, weight: '700', size: 17, color: '#cddced' });
  return tex(c);
}

export function stopSignTexture({ w = 256, h = 256 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  ctx.fillStyle = '#f4f1e8';
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 8);
  ctx.lineTo(w * 0.94, h * 0.33);
  ctx.lineTo(w * 0.82, h * 0.94);
  ctx.lineTo(w * 0.18, h * 0.94);
  ctx.lineTo(w * 0.06, h * 0.33);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c7403b';
  ctx.lineWidth = 16;
  ctx.stroke();
  drawText(ctx, '止まれ', w / 2, h * 0.55, { family: FONT.jp, size: 48, color: '#c7403b', maxWidth: w * 0.7 });
  return tex(c);
}

export function noticeBoardTexture({ w = 512, h = 384 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  const rand = rng(31);
  ctx.fillStyle = '#6b5233';
  ctx.fillRect(0, 0, w, h);
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#8b6b44');
  bg.addColorStop(1, '#6f5235');
  ctx.fillStyle = bg;
  ctx.fillRect(10, 10, w - 20, h - 20);
  // pinned papers
  const posters = [
    ['#f1e8d2', '#b04b42', '町内会\nお知らせ'],
    ['#e6eef3', '#3e6b95', '防災\n訓練'],
    ['#f4e9c8', '#8b6a2f', '秋祭り'],
    ['#f0e3e8', '#a24a65', '子育て\n相談'],
  ];
  for (let i = 0; i < 4; i++) {
    const x = 28 + (i % 2) * (w * 0.48);
    const y = 26 + Math.floor(i / 2) * (h * 0.46);
    const pw = w * 0.2;
    const ph = h * 0.36;
    ctx.save();
    ctx.translate(x + pw / 2, y + ph / 2);
    ctx.rotate((rand() - 0.5) * 0.08);
    ctx.fillStyle = posters[i][0];
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.fillStyle = posters[i][1];
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph * 0.22);
    const lines = posters[i][2].split('\n');
    lines.forEach((ln, k) => {
      drawText(ctx, ln, 0, -ph * 0.05 + k * 28, { family: FONT.jp, size: 21, color: '#413b34', maxWidth: pw * 0.86 });
    });
    ctx.fillStyle = '#b03c3c';
    ctx.beginPath();
    ctx.arc(0, -ph / 2 + 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  return tex(c);
}

export function roadTextTexture({ text = '止まれ', w = 512, h = 512, color = '#cfcec1' } = {}) {
  const { c, ctx } = canvas2d(w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(1, 2.6);
  drawText(ctx, text, 0, 0, { family: FONT.jp, size: 118, color, maxWidth: w * 0.86, weight: '900' });
  ctx.restore();
  // worn paint
  const rand = rng(9);
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.2 + rand() * 0.5})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 10, 1 + rand() * 5);
  }
  ctx.globalCompositeOperation = 'source-over';
  return tex(c);
}

export function glowSpriteTexture({ size = 256, inner = 'rgba(255,225,170,0.95)', mid = 'rgba(255,180,90,0.25)' } = {}) {
  const { c, ctx } = canvas2d(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.28, mid);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return tex(c, { srgb: true });
}

export function windowGlowTexture({ w = 128, h = 160, warm = true, seed = 1 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  const rand = rng(seed);
  ctx.fillStyle = warm ? '#ffdba3' : '#b8d3e6';
  ctx.fillRect(0, 0, w, h);
  // curtain / silhouette shapes
  ctx.fillStyle = warm ? 'rgba(190,130,80,0.35)' : 'rgba(70,90,120,0.4)';
  ctx.fillRect(0, 0, w, h * 0.18);
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(rand() * w, h * 0.2, 4 + rand() * 20, h * 0.5);
  }
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,180,90,0.1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // window frame
  ctx.strokeStyle = 'rgba(40,36,42,0.85)';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();
  return tex(c);
}

export function skyTexture({ w = 1024, h = 1024 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, C.skyTop);
  g.addColorStop(0.42, C.skyMid);
  g.addColorStop(0.68, '#1c2445');
  g.addColorStop(0.8, '#2c3055');
  g.addColorStop(1, '#141a33');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // soft city glow patches near horizon
  const rand = rng(18);
  for (let i = 0; i < 10; i++) {
    const x = rand() * w;
    const y = h * (0.72 + rand() * 0.18);
    const r = 80 + rand() * 220;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(255,170,120,${0.02 + rand() * 0.04})`);
    rg.addColorStop(1, 'rgba(255,170,120,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // faint clouds
  for (let i = 0; i < 24; i++) {
    const x = rand() * w;
    const y = h * (0.2 + rand() * 0.5);
    const r = 60 + rand() * 220;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(70,80,130,${0.03 + rand() * 0.05})`);
    rg.addColorStop(1, 'rgba(70,80,130,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return tex(c);
}

export function catTexture({ size = 256 } = {}) {
  const { c, ctx } = canvas2d(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,240,210,0.95)');
  g.addColorStop(0.65, 'rgba(255,200,140,0.25)');
  g.addColorStop(1, 'rgba(255,200,140,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return tex(c);
}

export function noiseTexture({ size = 128, seed = 5, repeat = [1, 1] } = {}) {
  const { c, ctx } = canvas2d(size, size);
  const rand = rng(seed);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 110 + rand() * 90;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return tex(c, { srgb: false, repeat, wrap: THREE.RepeatWrapping });
}
