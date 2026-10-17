/* Canvas textures used only by the surroundings module (old block / back alley).
   Everything is drawn from code: no external assets. */
import * as THREE from 'three';
import { canvas2d, drawText, verticalText, tex, rng } from '../../core/textures.js';
import { FONT } from '../../core/palette.js';

/* Faded painted sign board of the old shop next door. */
export function oldShopSignTexture({ w = 512, h = 112 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  const rand = rng(91);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#948b79');
  g.addColorStop(0.55, '#847b69');
  g.addColorStop(1, '#6c6455');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(42,37,32,0.65)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  drawText(ctx, '酒 ・ たばこ', w * 0.5, h * 0.4, {
    family: FONT.jpDisplay, size: 52, color: '#332a24', maxWidth: w * 0.82,
  });
  drawText(ctx, 'ひかり屋', w * 0.5, h * 0.76, {
    family: FONT.jpDisplay, size: 32, color: '#453a2f', maxWidth: w * 0.7, letterSpacing: 6,
  });
  // paint wear and rain streaks
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(214,204,184,0.35)' : 'rgba(26,22,20,0.3)';
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 4, 1 + rand() * 3);
  }
  for (let i = 0; i < 16; i++) {
    const x = rand() * w;
    const lg = ctx.createLinearGradient(0, 0, 0, h);
    lg.addColorStop(0, 'rgba(46,38,32,0.35)');
    lg.addColorStop(1, 'rgba(46,38,32,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(x, 0, 1 + rand() * 3, h * (0.4 + rand() * 0.6));
  }
  return tex(c);
}

/* Dim vertical sign of the tiny snack bar upstairs: スナック 夢 */
export function snackSignTexture({ w = 192, h = 768 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  ctx.fillStyle = '#1a232d';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#0c1117';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, w - 10, h - 10);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, 'rgba(122,206,192,0.22)');
  g.addColorStop(0.5, 'rgba(122,206,192,0.05)');
  g.addColorStop(1, 'rgba(122,206,192,0.16)');
  ctx.fillStyle = g;
  ctx.fillRect(9, 9, w - 18, h - 18);
  drawText(ctx, 'スナック', w / 2, h * 0.11, {
    family: FONT.jp, size: 30, color: '#a9d6cc', letterSpacing: 2, maxWidth: w * 0.86,
  });
  drawText(ctx, '夢', w / 2, h * 0.38, {
    family: FONT.jpDisplay, size: 112, color: '#d9fff5', shadow: '#4fd6c4', maxWidth: w * 0.8,
  });
  verticalText(ctx, '営業中', w / 2, h * 0.72, { size: 42, color: '#f0c48c', lineGap: 1.12 });
  drawText(ctx, '2F', w / 2, h * 0.93, { family: FONT.latin, size: 34, color: '#84ada7' });
  return tex(c);
}

/* Indigo noren hanging across the narrow alley. */
export function norenTexture({ w = 512, h = 256 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  ctx.fillStyle = '#22304a';
  ctx.fillRect(0, 0, w, h);
  // woven fabric
  for (let x = 0; x < w; x += 4) {
    ctx.fillStyle = x % 8 ? 'rgba(58,78,112,0.55)' : 'rgba(24,34,56,0.5)';
    ctx.fillRect(x, 0, 2, h);
  }
  // top hem
  ctx.fillStyle = '#141f33';
  ctx.fillRect(0, 0, w, h * 0.16);
  // panel slits
  const n = 3;
  const pw = w / n;
  for (let i = 1; i < n; i++) {
    ctx.fillStyle = 'rgba(6,9,15,0.6)';
    ctx.fillRect(i * pw - 2, h * 0.34, 4, h * 0.66);
  }
  // crest + name
  ctx.strokeStyle = 'rgba(226,236,246,0.8)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.34, 25, 0, Math.PI * 2);
  ctx.stroke();
  drawText(ctx, '酒', w * 0.5, h * 0.34, { family: FONT.jpDisplay, size: 30, color: '#eaf1f8' });
  drawText(ctx, 'た ぬ き', w * 0.5, h * 0.6, {
    family: FONT.jpDisplay, size: 48, color: '#e6edf6', letterSpacing: 4, maxWidth: w * 0.86,
  });
  drawText(ctx, '営 業 中', w * 0.5, h * 0.83, { family: FONT.jp, size: 22, color: '#bccbdd', letterSpacing: 3 });
  return tex(c);
}

/* Grime / moss decals. Transparent map, used on thin planes. */
export function grimeTexture({ w = 160, h = 320, seed = 7, mossy = false, strength = 1 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  const rand = rng(seed);
  ctx.clearRect(0, 0, w, h);
  const col = mossy ? '86,112,74' : '26,30,34';
  for (let i = 0; i < 30; i++) {
    const x = rand() * w;
    const sw = 2 + rand() * 12;
    const len = h * (0.2 + rand() * 0.8);
    const g = ctx.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0, `rgba(${col},${0.25 * strength})`);
    g.addColorStop(0.4, `rgba(${col},${0.18 * strength})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, sw, len);
  }
  for (let i = 0; i < 46; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 2 + rand() * 18;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${(0.16 + rand() * 0.3) * strength})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return tex(c);
}

/* Ribbed corrugated sheet for the back-alley overhang. */
export function corrugatedTexture({ w = 128, h = 64, seed = 13 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  const rand = rng(seed);
  for (let x = 0; x < w; x += 8) {
    const g = ctx.createLinearGradient(x, 0, x + 8, 0);
    g.addColorStop(0, '#333840');
    g.addColorStop(0.42, '#666d78');
    g.addColorStop(0.58, '#7d848f');
    g.addColorStop(1, '#2e333b');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 8, h);
  }
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(96,70,52,${0.05 + rand() * 0.1})`;
    ctx.fillRect(rand() * w, rand() * h, 2 + rand() * 8, 1 + rand() * 2);
  }
  ctx.fillStyle = 'rgba(16,18,22,0.5)';
  ctx.fillRect(0, 0, w, 3);
  return tex(c, { repeat: [4, 1], wrap: THREE.RepeatWrapping });
}

/* Front grille + fan of an outdoor AC unit. */
export function acGrilleTexture({ w = 128, h = 96 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  ctx.fillStyle = '#a3a196';
  ctx.fillRect(0, 0, w, h);
  // fan housing
  ctx.fillStyle = '#6c6b64';
  ctx.beginPath();
  ctx.arc(w * 0.31, h * 0.52, w * 0.27, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c8c6ba';
  ctx.lineWidth = 3;
  ctx.stroke();
  // blades
  ctx.fillStyle = '#8d8b83';
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.translate(w * 0.31, h * 0.52);
    ctx.rotate((i * Math.PI) / 2 + 0.4);
    ctx.beginPath();
    ctx.ellipse(w * 0.1, 0, w * 0.11, w * 0.045, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // louvers
  ctx.fillStyle = '#6a6963';
  for (let i = 0; i < 7; i++) ctx.fillRect(w * 0.65, h * 0.12 + i * h * 0.12, w * 0.3, 3);
  ctx.strokeStyle = 'rgba(38,38,36,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  return tex(c);
}

/* Face of a Japanese electricity meter. */
export function meterTexture({ size = 128 } = {}) {
  const { c, ctx } = canvas2d(size, size);
  ctx.fillStyle = '#373b41';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#d6d1c0';
  ctx.beginPath();
  ctx.arc(size / 2, size * 0.44, size * 0.33, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8b8778';
  ctx.lineWidth = 3;
  ctx.stroke();
  drawText(ctx, '0 4 2 8', size / 2, size * 0.44, {
    family: FONT.latin, size: 19, color: '#2b2b27', maxWidth: size * 0.56,
  });
  ctx.fillStyle = '#20242a';
  ctx.fillRect(size * 0.2, size * 0.72, size * 0.6, size * 0.1);
  drawText(ctx, '電力量計', size / 2, size * 0.85, {
    family: FONT.jp, size: 15, color: '#c9ced6', maxWidth: size * 0.9,
  });
  return tex(c);
}

/* Small posted paper notices (alley walls / doors). */
export function noticePaperTexture({ w = 96, h = 136, seed = 1, kind = 'clean' } = {}) {
  const { c, ctx } = canvas2d(w, h);
  const rand = rng(seed);
  ctx.fillStyle = '#e7e1d0';
  ctx.fillRect(0, 0, w, h);
  const band = kind === 'clean' ? '#3f6d8c' : kind === 'park' ? '#a8514a' : '#5b7a55';
  const titles = { clean: '清掃当番', park: '駐車禁止', collect: '回収のお知らせ' };
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, w, h * 0.2);
  drawText(ctx, titles[kind] ?? 'お知らせ', w / 2, h * 0.105, {
    family: FONT.jp, size: 15, color: '#f4efe2', maxWidth: w * 0.92,
  });
  ctx.fillStyle = 'rgba(62,58,52,0.66)';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(w * 0.12, h * (0.3 + i * 0.095), w * (0.4 + rand() * 0.4), 3);
  }
  ctx.fillStyle = '#9a6f5c';
  ctx.fillRect(w * 0.62, h * 0.85, w * 0.24, h * 0.09);
  for (let i = 0; i < 130; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand() * 0.08})`;
    ctx.fillRect(rand() * w, rand() * h, 2, 2);
  }
  return tex(c);
}

/* Flat "slice" face used where the buildings are cut by the base edge. */
export function cutFaceTexture({ slabs = [0.44, 0.92], base = '#55555f', seed = 17 } = {}) {
  const { c, ctx } = canvas2d(48, 256);
  const rand = rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 48, 256);
  for (let i = 0; i < 320; i++) {
    const light = rand() > 0.5;
    ctx.fillStyle = light ? `rgba(156,154,168,${0.03 + rand() * 0.05})` : `rgba(28,28,34,${0.03 + rand() * 0.06})`;
    ctx.fillRect(rand() * 48, rand() * 256, 1 + rand() * 2, 1 + rand() * 3);
  }
  for (const r of slabs) {
    // slab edge highlight, then the dark room/ceiling side
    ctx.fillStyle = '#83818d';
    ctx.fillRect(0, Math.max(0, r * 256 - 2), 48, 3);
    ctx.fillStyle = 'rgba(22,22,28,0.55)';
    ctx.fillRect(0, Math.max(0, r * 256 + 1), 48, 7);
  }
  return tex(c);
}

/* Unlit window pane, cool or faintly warm. */
export function darkWindowTexture({ w = 64, h = 96, warm = false } = {}) {
  const { c, ctx } = canvas2d(w, h);
  const g = ctx.createLinearGradient(0, 0, w, h);
  if (warm) {
    g.addColorStop(0, '#382d24');
    g.addColorStop(0.5, '#574536');
    g.addColorStop(1, '#2a241f');
  } else {
    g.addColorStop(0, '#1a2432');
    g.addColorStop(0.5, '#2b3849');
    g.addColorStop(1, '#161d28');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(160,190,225,0.16)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(w * 0.22, 0);
  ctx.lineTo(w * 0.72, h);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(16,18,24,0.9)';
  ctx.lineWidth = 5;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();
  return tex(c);
}

/* Slatted beer crate face, tinted by the material colour. */
export function crateTexture({ size = 64 } = {}) {
  const { c, ctx } = canvas2d(size, size);
  ctx.fillStyle = '#f4e9cf';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#c8b78d';
  ctx.fillRect(0, 0, size, 6);
  ctx.fillRect(0, size - 6, size, 6);
  ctx.fillRect(0, 0, 6, size);
  ctx.fillRect(size - 6, 0, 6, size);
  const rows = 4;
  const rh = (size - 20) / rows;
  for (let r = 0; r < rows; r++) {
    const y = 10 + r * rh;
    ctx.fillStyle = '#d9cba2';
    ctx.fillRect(7, y, size - 14, rh - 4);
    ctx.fillStyle = '#655a42';
    for (let i = 0; i < 4; i++) ctx.fillRect(11 + i * ((size - 24) / 4), y + 3, (size - 30) / 4, 3);
  }
  return tex(c);
}

/* Old dark timber for the alley door. */
export function oldWoodTexture({ w = 128, h = 256, seed = 21 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  const rand = rng(seed);
  ctx.fillStyle = '#584535';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 36; i++) {
    const x = rand() * w;
    ctx.strokeStyle = `rgba(${24 + ((rand() * 40) | 0)},${16 + ((rand() * 26) | 0)},12,0.4)`;
    ctx.lineWidth = 1 + rand() * 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + (rand() - 0.5) * 9, h * 0.33, x + (rand() - 0.5) * 9, h * 0.66, x + (rand() - 0.5) * 12, h);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(18,12,8,0.62)';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.beginPath();
  ctx.moveTo(w / 2, 6);
  ctx.lineTo(w / 2, h - 6);
  ctx.stroke();
  ctx.fillStyle = 'rgba(20,14,10,0.35)';
  for (let i = 0; i < 40; i++) ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1 + rand() * 6);
  return tex(c);
}

/* Paper chochin lantern with 酒 lettering. */
export function lanternTexture({ w = 128, h = 128 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  ctx.fillStyle = '#f3dcac';
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 10) {
    ctx.fillStyle = 'rgba(126,96,64,0.18)';
    ctx.fillRect(0, y, w, 2);
  }
  ctx.fillStyle = '#b44a3f';
  ctx.fillRect(0, 0, w, 10);
  ctx.fillRect(0, h - 10, w, 10);
  drawText(ctx, '酒', w * 0.25, h * 0.5, { family: FONT.jpDisplay, size: 56, color: '#7c2b26', maxWidth: w * 0.4 });
  drawText(ctx, '酒', w * 0.75, h * 0.5, { family: FONT.jpDisplay, size: 56, color: '#7c2b26', maxWidth: w * 0.4 });
  return tex(c);
}

/* Rows of dark Japanese roof tiles for the little hisashi eave. */
export function tileRoofTexture({ w = 256, h = 128, seed = 9 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  const rand = rng(seed);
  ctx.fillStyle = '#3f4450';
  ctx.fillRect(0, 0, w, h);
  const rowH = 32;
  for (let r = 0; r < Math.ceil(h / rowH); r++) {
    const y = r * rowH;
    for (let x = -32; x < w + 32; x += 32) {
      const off = (r % 2) * 16;
      const g = ctx.createLinearGradient(0, y, 0, y + rowH);
      g.addColorStop(0, '#606672');
      g.addColorStop(0.5, '#4b515c');
      g.addColorStop(1, '#2e323b');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x + off, y + rowH);
      ctx.quadraticCurveTo(x + off + 16, y - 7, x + off + 32, y + rowH);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(18,20,26,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(16,18,24,0.5)';
    ctx.fillRect(0, y + rowH - 3, w, 3);
  }
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = rand() > 0.55 ? `rgba(96,116,92,${rand() * 0.1})` : `rgba(210,206,194,${rand() * 0.05})`;
    ctx.fillRect(rand() * w, rand() * h, 2 + rand() * 7, 1 + rand() * 2);
  }
  return tex(c, { repeat: [1, 1], wrap: THREE.RepeatWrapping });
}

/* Small metal building / utility plaque. */export function plaqueTexture({ w = 256, h = 64, title = '', sub = '', bg = '#2b3038', fg = '#cfd6de', border = '#6b7482' } = {}) {
  const { c, ctx } = canvas2d(w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = border;
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  drawText(ctx, title, w / 2, h * 0.4, { family: FONT.jp, size: 26, color: fg, maxWidth: w * 0.9 });
  if (sub) {
    drawText(ctx, sub, w / 2, h * 0.76, { family: FONT.latin, size: 13, color: '#8b939e', maxWidth: w * 0.9, letterSpacing: 1 });
  }
  return tex(c);
}

/* Faded apartment nameplate on the back building. */
export function backPlaqueTexture({ w = 320, h = 72 } = {}) {
  return plaqueTexture({
    w, h,
    title: 'ひかり荘',
    sub: 'HIKARI-SO  2-8',
    bg: '#3a3c44',
    fg: '#c9c3ae',
    border: '#6f6a5c',
  });
}
