// ─────────────────────────────────────────────────────────────────────────────
// interior.js — the inside of the konbini.
//
// Everything here lives inside the store shell built by store.js:
//   x ∈ [-3.06, 2.46]  z ∈ [-3.06, 0.86]  floor y = 0.16  ceiling y = 2.56
// The south-east corner of the room is chamfered (the automatic-door entrance);
// the 0.9 m just inside that chamfer is kept clear as the entry aisle.
//
// The brief: through the rain-streaked glass this must read as a WARM, BRIGHT,
// over-stocked Japanese convenience store — the visual counterpoint to the cold
// wet street. So: glowing drink coolers, a full gondola run of snacks, magazines
// pressed against the window, a lit hot-snack / oden counter at the back, and a
// handful of warm point lights.
//
// Everything repeated (bottles, snack packs, price rails, ceiling panels…) is an
// InstancedMesh with per-instance colour, so the whole module stays cheap.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import {
  Y, M, FONT, box, plane, cylinder, sphere, group, label, glow,
  canvasTexture, drawText, roundRect, rng, groundSmear, addOutline,
} from './core.js';

const FL = Y.storeFloor;      // 0.16 — floor top
const CEIL = Y.storeCeil;     // 2.56
const IX0 = -3.06, IX1 = 2.46, IZ0 = -3.06, IZ1 = 0.86;
const HALF_PI = Math.PI / 2;
const TAU = Math.PI * 2;

// chamfer: outer wall line through (1.9, 0.35), outward normal (0.681, 0.733)
// signed distance: < 0 inside the store. Keep clear of the door (d > -0.9).
const chamferD = (x, z) => 0.681 * (x - 1.9) + 0.733 * (z - 0.35);

// ── shared geometry (never build one geometry per product) ──────────────────
const GEO = {
  unitBox: new THREE.BoxGeometry(1, 1, 1),
  unitPlane: new THREE.PlaneGeometry(1, 1),
  unitCyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  unitCyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
  unitTri: new THREE.CylinderGeometry(1, 1, 1, 3),
  unitSphere: new THREE.SphereGeometry(1, 8, 6),
};

// ── materials ───────────────────────────────────────────────────────────────
const MAT = {
  white: M.toon(0xeee7d4),
  white2: M.toon(0xded5bf),
  shelf: M.toon(0xe8dfc9),
  gray: M.toon(0xc9c2b2),
  gray2: M.toon(0xada694),
  dark: M.toon(0x2e343d),
  darker: M.toon(0x171a20),
  metal: M.toon(0x9aa2a8),
  metalDark: M.toon(0x626b74),
  steel: M.toon(0xc4cbd0),
  wood: M.toon(0x8a6a4c),
  cardboard: M.toon(0xc79a5c),
  counterTop: M.toon(0xf0e8d6),
  counterBody: M.toon(0xdfd4bc),
  red: M.toon(0xd8412f),
  green: M.toon(0x2f7a5e),
  black: M.toon(0x101216),
  paper: M.toon(0xf6efdd),
  mat: M.toon(0x23262d),
  glass: M.glass(0xcfeaff),
  // base material for instanced products (per-instance colour)
  product: M.toon(0xffffff),
  can: M.toon(0xffffff),
  box: M.toon(0xffffff),
  book: M.toon(0xffffff),
  film: M.toon(0xffffff),
};

const EMIT = {
  warm: M.emit(0xffe6bd, { intensity: 1.18 }),
  warmSoft: M.emit(0xfff1d6, { intensity: 0.9 }),
  cool: M.emit(0xe4f6ff, { intensity: 1.05 }),
  coolSoft: M.emit(0xd6ecfa, { intensity: 0.9 }),
  panel: M.emit(0xfff0d2, { intensity: 0.82 }),
  green: M.emit(0x8dffca, { intensity: 1.15 }),
  blue: M.emit(0xbfe4ff, { intensity: 0.95 }),
  broth: M.emit(0xffc46a, { intensity: 0.95 }),
  red: M.emit(0xff5a4a, { intensity: 1.0 }),
  amber: M.emit(0xffcf92, { intensity: 1.0 }),
  white: M.emit(0xf6fbff, { intensity: 1.0 }),
};

// ── instanced mesh helper ───────────────────────────────────────────────────
// items: [{ p:[x,y,z], s:[sx,sy,sz], r?:[rx,ry,rz], c?: hex }]
function inst(parent, geo, material, items, opts = {}) {
  if (!items || !items.length) return null;
  const mesh = new THREE.InstancedMesh(geo, material, items.length);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  let colored = false;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    dummy.position.set(it.p[0], it.p[1], it.p[2]);
    if (it.r) dummy.rotation.set(it.r[0] || 0, it.r[1] || 0, it.r[2] || 0);
    else dummy.rotation.set(0, 0, 0);
    const s = it.s || [1, 1, 1];
    dummy.scale.set(s[0], s[1], s[2]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (it.c !== undefined) {
      col.set(it.c);
      mesh.setColorAt(i, col);
      colored = true;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (colored && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = !!opts.cast;
  mesh.receiveShadow = opts.receive !== false;
  parent.add(mesh);
  return mesh;
}

// printed (unlit-ish, lit by room) plane with a canvas texture
function printPlane(parent, w, h, pos, tex, opts = {}) {
  const mat = M.toon(0xffffff, {
    map: tex,
    transparent: !!opts.transparent,
    side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });
  return plane(parent, [w, h], pos, mat, {
    ry: opts.ry, rx: opts.rx, rz: opts.rz, receive: opts.receive !== false,
  });
}

// glowing printed plane (feeds bloom a little)
function litPlane(parent, w, h, pos, tex, opts = {}) {
  const mat = M.emit(0xffffff, {
    map: tex,
    intensity: opts.i === undefined ? 1.0 : opts.i,
    side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });
  return plane(parent, [w, h], pos, mat, {
    ry: opts.ry, rx: opts.rx, rz: opts.rz, receive: false, renderOrder: opts.renderOrder || 0,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// canvas textures
// ════════════════════════════════════════════════════════════════════════════

// one row of magazine covers pressed against the window (bright, coloured)
function texMagCovers(seed) {
  const rand = rng(seed);
  return canvasTexture(1024, 192, (ctx, W, H) => {
    ctx.fillStyle = '#c9c0ae';
    ctx.fillRect(0, 0, W, H);
    const n = 8, cw = W / n;
    const colors = ['#ff5f8e', '#ffc93c', '#5ab4ff', '#7ad98a', '#ff8a3c', '#b48cff', '#ff4646', '#3fd6c8', '#f4f0e4'];
    const titles = ['anan', '週刊文春', 'smart', 'MORE', 'POPEYE', '小説新潮', '少年J', 'CUT', 'Hanako'];
    for (let i = 0; i < n; i++) {
      const x = i * cw + 3;
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
      ctx.fillRect(x, 4, cw - 6, H - 8);
      // photo block
      ctx.fillStyle = 'rgba(255,255,255,0.52)';
      ctx.fillRect(x + 5, 10, cw - 16, H * 0.4);
      // masthead
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(x + 4, H * 0.5, cw - 14, H * 0.15);
      drawText(ctx, titles[Math.floor(rand() * titles.length)], x + (cw - 6) / 2, H * 0.575, { size: 21, color: '#ffffff' });
      // cover lines
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 7, H * 0.71, cw - 20, 3);
      drawText(ctx, '特集', x + (cw - 6) / 2, H * 0.83, { size: 16, color: '#ffffff' });
      // small price tag
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 5, H - 23, 34, 16);
      drawText(ctx, '780', x + 22, H - 15, { size: 12, color: '#222' });
    }
  }, { anisotropy: 8 });
}

// cooler canopy lightbox: つめた〜い / ドリンク
function texCoolerSign() {
  return canvasTexture(1024, 96, (ctx, W, H) => {
    ctx.fillStyle = '#0f6fa8';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < W; i += 42) {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(i, 0, 20, H);
    }
    drawText(ctx, 'つめた〜い', W * 0.2, H * 0.55, { size: 56, color: '#eaf8ff' });
    drawText(ctx, 'ドリンク', W * 0.5, H * 0.55, { size: 54, color: '#bde8ff' });
    drawText(ctx, 'COLD DRINK', W * 0.82, H * 0.55, { size: 38, color: '#ffffff', font: FONT.en, letterSpacing: 2 });
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(0, H - 8, W, 4);
  });
}

// cigarette cabinet: lit shelves of packs
function texCigarettes() {
  const rand = rng(17);
  return canvasTexture(1024, 512, (ctx, W, H) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#fff6dc');
    g.addColorStop(1, '#efe0bd');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c8202a';
    ctx.fillRect(0, 0, W, 56);
    drawText(ctx, 'たばこ  TASPO', W * 0.5, 30, { size: 40, color: '#ffffff' });
    const cols = 10, rows = 5, cw = W / cols, chh = (H - 70) / rows;
    const packs = ['#f5f2ea', '#d8382f', '#233c6e', '#e8c33a', '#2c2a2c', '#c9c2b0', '#7a2f48', '#3f6e52', '#8c5a2b'];
    for (let ry = 0; ry < rows; ry++) {
      for (let cx = 0; cx < cols; cx++) {
        const x = cx * cw + 5, y = 70 + ry * chh + 5;
        ctx.fillStyle = packs[Math.floor(rand() * packs.length)];
        ctx.fillRect(x, y, cw - 10, chh - 17);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(x, y, cw - 10, 7);
        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        ctx.fillRect(x + 4, y + chh - 32, cw - 18, 7);
        drawText(ctx, String([480, 520, 560, 600][Math.floor(rand() * 4)]), x + (cw - 10) / 2, y + chh - 13, { size: 13, color: '#b81018' });
      }
      ctx.fillStyle = 'rgba(120,100,70,0.35)';
      ctx.fillRect(0, 66 + ry * chh, W, 3);
    }
  });
}

// POS screen
function texPosScreen() {
  return canvasTexture(320, 208, (ctx, W, H) => {
    ctx.fillStyle = '#0d2338';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#173a56';
    ctx.fillRect(0, 0, W, 34);
    drawText(ctx, 'POS  レジ', 12, 18, { size: 18, color: '#9fd8ff', align: 'left' });
    ctx.fillStyle = '#f4f7fa';
    ctx.fillRect(10, 44, W - 20, 62);
    drawText(ctx, '合計', 24, 62, { size: 18, color: '#445', align: 'left' });
    drawText(ctx, '¥1,280', W - 26, 78, { size: 40, color: '#111', align: 'right' });
    const labels = ['お弁当', '飲料', 'お菓子', 'おでん', 'たばこ', '袋'];
    for (let i = 0; i < 6; i++) {
      const bx = 10 + (i % 3) * 100, by = 118 + Math.floor(i / 3) * 40;
      ctx.fillStyle = i === 3 ? '#e8542f' : '#2b6f9e';
      roundRect(ctx, bx, by, 92, 34, 5);
      ctx.fill();
      drawText(ctx, labels[i], bx + 46, by + 18, { size: 17, color: '#fff' });
    }
  });
}

// dark grille under the cooler
function texGrille() {
  return canvasTexture(512, 64, (ctx, W, H) => {
    ctx.fillStyle = '#262b31';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = 'rgba(140,150,160,0.55)';
      ctx.fillRect(6, 8 + i * 8, W - 12, 3);
    }
    drawText(ctx, '冷蔵', W - 46, H - 12, { size: 18, color: '#9fb0bd' });
  });
}

// white price rail with red bargain tags
function texPriceRail() {
  return canvasTexture(512, 56, (ctx, W, H) => {
    ctx.fillStyle = '#fbf7ee';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e8e1d2';
    ctx.fillRect(0, H - 8, W, 8);
    const prices = ['98', '128', '158', '108', '148', '120'];
    const n = 6, cw = W / n;
    for (let i = 0; i < n; i++) {
      const x = i * cw;
      if (i % 3 === 0) {
        ctx.fillStyle = '#e23b2e';
        roundRect(ctx, x + 8, 8, 40, 26, 4);
        ctx.fill();
        drawText(ctx, '特価', x + 28, 21, { size: 16, color: '#fff' });
      }
      drawText(ctx, `¥${prices[i]}`, x + cw * 0.55, 34, { size: 24, color: '#1d1d1d' });
      ctx.fillStyle = '#cfc6b4';
      ctx.fillRect(x, 0, 2, H);
    }
  }, { wrap: true, repeat: [4, 1] });
}

// yellow hand-written POP card
function texPop() {
  return canvasTexture(128, 160, (ctx, W, H) => {
    ctx.fillStyle = '#ffe14d';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#d8b400';
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, W - 6, H - 6);
    drawText(ctx, '新', W * 0.5, 38, { size: 34, color: '#d41f1f' });
    drawText(ctx, '発', W * 0.5, 80, { size: 34, color: '#d41f1f' });
    drawText(ctx, '売', W * 0.5, 122, { size: 34, color: '#d41f1f' });
  });
}

// counter front: beige panels + レジ sign
function texCounterFront() {
  return canvasTexture(1180, 260, (ctx, W, H) => {
    ctx.fillStyle = '#eee5d1';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) {
      const x = 16 + i * 192;
      ctx.fillStyle = '#e6dcc6';
      roundRect(ctx, x, 30, 172, H - 60, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,140,120,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#b9b0a0';
      ctx.fillRect(x + 66, H - 88, 40, 8);
    }
    // small red レジ plate
    ctx.fillStyle = '#c8202a';
    roundRect(ctx, W * 0.5 - 70, 8, 140, 34, 5);
    ctx.fill();
    drawText(ctx, 'レジカウンター', W * 0.5, 26, { size: 20, color: '#fff' });
  });
}

// notice / shift board on the staff wall
function texNotice() {
  const rand = rng(3);
  return canvasTexture(512, 384, (ctx, W, H) => {
    ctx.fillStyle = '#f0e8d6';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#8c8470';
    ctx.fillRect(0, 0, W, 30);
    drawText(ctx, 'スタッフ連絡ボード', W * 0.5, 16, { size: 18, color: '#fff' });
    const papers = [
      { x: 20, y: 44, w: 210, h: 150, bg: '#ffffff' },
      { x: 246, y: 44, w: 244, h: 108, bg: '#fff9dd' },
      { x: 20, y: 206, w: 150, h: 150, bg: '#eef5ff' },
      { x: 186, y: 166, w: 196, h: 96, bg: '#ffffff' },
      { x: 186, y: 276, w: 196, h: 88, bg: '#ffe9e2' },
    ];
    for (const p of papers) {
      ctx.fillStyle = p.bg;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = 'rgba(120,110,95,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      // text lines
      for (let l = 0; l < Math.floor((p.h - 30) / 16); l++) {
        ctx.fillStyle = 'rgba(60,60,60,0.55)';
        ctx.fillRect(p.x + 8, p.y + 10 + l * 16, (p.w - 24) * (0.4 + rand() * 0.55), 3);
      }
      // pin
      ctx.fillStyle = '#d8423a';
      ctx.beginPath();
      ctx.arc(p.x + p.w * 0.5, p.y + 6, 3.4, 0, TAU);
      ctx.fill();
    }
    drawText(ctx, 'シフト 10/18〜10/24', 30, 196, { size: 15, color: '#333', align: 'left' });
  });
}

// ATM front panel
function texAtm() {
  return canvasTexture(256, 256, (ctx, W, H) => {
    ctx.fillStyle = '#e9e4da';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#14496e';
    ctx.fillRect(10, 10, W - 20, H - 20);
    ctx.fillStyle = '#9fd8ff';
    ctx.fillRect(22, 26, W - 44, 96);
    drawText(ctx, 'お引出し', 34, 48, { size: 17, color: '#123', align: 'left' });
    drawText(ctx, '¥20,000', W - 34, 86, { size: 26, color: '#123', align: 'right' });
    ctx.fillStyle = '#d8d8d0';
    ctx.fillRect(24, 140, 120, 90);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = '#8e969c';
        ctx.fillRect(30 + c * 38, 146 + r * 21, 32, 15);
      }
    }
    ctx.fillStyle = '#2e343d';
    ctx.fillRect(160, 140, 74, 40);
    drawText(ctx, '入', 197, 160, { size: 18, color: '#cfe6f5' });
    drawText(ctx, 'ATM', W * 0.5, H - 26, { size: 24, color: '#fff' });
  });
}

// coffee machine fascia
function texCoffee() {
  return canvasTexture(256, 256, (ctx, W, H) => {
    ctx.fillStyle = '#2b2f35';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#12151a';
    ctx.fillRect(10, 10, W - 20, 74);
    ctx.fillStyle = '#ffd9a0';
    drawText(ctx, 'COFFEE', W * 0.5, 34, { size: 26, color: '#ffd9a0' });
    drawText(ctx, 'ホット / アイス', W * 0.5, 62, { size: 16, color: '#ffeccd' });
    const btns = ['R', 'L', 'M', 'S'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i === 0 ? '#c8442f' : '#4a535c';
      roundRect(ctx, 18 + i * 58, 104, 46, 34, 6);
      ctx.fill();
      drawText(ctx, btns[i], 41 + i * 58, 121, { size: 20, color: '#fff' });
    }
    ctx.fillStyle = '#15181d';
    ctx.fillRect(70, 168, W - 140, 52);
    ctx.fillStyle = '#aab3ba';
    ctx.fillRect(118, 168, 20, 22);
  });
}

// hot snack case price plate
function texHotCase() {
  return canvasTexture(512, 96, (ctx, W, H) => {
    ctx.fillStyle = '#d7263d';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(0, 0, W, 12);
    drawText(ctx, 'からあげ', W * 0.28, H * 0.56, { size: 44, color: '#ffe9a8' });
    drawText(ctx, '100円', W * 0.72, H * 0.56, { size: 44, color: '#ffffff' });
  });
}

// oden pot plate
function texOden() {
  return canvasTexture(512, 96, (ctx, W, H) => {
    ctx.fillStyle = '#8b2f1f';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e8b04a';
    ctx.fillRect(0, H - 10, W, 6);
    drawText(ctx, 'おでん', W * 0.3, H * 0.54, { size: 46, color: '#ffe9c0' });
    drawText(ctx, '1個 150円', W * 0.74, H * 0.54, { size: 34, color: '#fff' });
  });
}

// emergency exit sign (green pictogram)
function texExit() {
  return canvasTexture(256, 128, (ctx, W, H) => {
    ctx.fillStyle = '#0d4d33';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#6bffb8';
    // running figure
    ctx.beginPath();
    ctx.arc(52, 30, 11, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#6bffb8';
    ctx.beginPath();
    ctx.moveTo(50, 44);
    ctx.lineTo(62, 76);
    ctx.lineTo(46, 104);
    ctx.moveTo(58, 62);
    ctx.lineTo(84, 50);
    ctx.moveTo(58, 62);
    ctx.lineTo(86, 78);
    ctx.stroke();
    // door
    ctx.lineWidth = 7;
    ctx.strokeRect(160, 16, 46, 96);
    ctx.beginPath();
    ctx.moveTo(196, 30);
    ctx.lineTo(196, 100);
    ctx.stroke();
    ctx.fillStyle = '#6bffb8';
    ctx.beginPath();
    ctx.moveTo(196, 30);
    ctx.lineTo(226, 20);
    ctx.lineTo(226, 108);
    ctx.lineTo(196, 100);
    ctx.fill();
    drawText(ctx, '非常口', W * 0.36, 118, { size: 17, color: '#6bffb8' });
  });
}

// staff door plate
function texStaffSign() {
  return canvasTexture(320, 160, (ctx, W, H) => {
    ctx.fillStyle = '#efe9dc';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#3a3f45';
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, W - 10, H - 10);
    drawText(ctx, 'STAFF ONLY', W * 0.5, 46, { size: 30, color: '#1f242a', font: FONT.en });
    drawText(ctx, '関係者以外', W * 0.5, 92, { size: 24, color: '#1f242a' });
    drawText(ctx, '立入禁止', W * 0.5, 124, { size: 24, color: '#1f242a' });
  });
}

// window banner generator
function texBanner(kind) {
  const conf = {
    kara: { bg: '#f7c948', fg: '#c8202a', t1: 'からあげ', t2: '100円', sub: 'ホットスナック', accent: '#ffffff' },
    coffee: { bg: '#f6e6c8', fg: '#6b4326', t1: 'コーヒー', t2: '200円', sub: 'HOT / ICE', accent: '#c8202a' },
    oden: { bg: '#e8a23c', fg: '#77280f', t1: 'おでん', t2: '150円', sub: 'あったかい', accent: '#fff6dc' },
    atm: { bg: '#1c5f8f', fg: '#ffffff', t1: 'ATM', t2: '24時間', sub: 'BANK', accent: '#9fd8ff' },
    tabako: { bg: '#f2ede2', fg: '#c8202a', t1: 'たばこ', t2: 'TASPO', sub: '成人識別', accent: '#26313d' },
    shin: { bg: '#ffffff', fg: '#d7263d', t1: '新発売', t2: '入荷', sub: 'NEW ITEM', accent: '#26313d' },
  }[kind];
  return canvasTexture(512, 256, (ctx, W, H) => {
    ctx.fillStyle = conf.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(0, 0, W, 14);
    ctx.fillRect(0, H - 14, W, 14);
    drawText(ctx, conf.t1, W * 0.5, 66, { size: 62, color: conf.fg });
    drawText(ctx, conf.t2, W * 0.5, 150, { size: 76, color: conf.accent === '#ffffff' ? conf.fg : conf.accent });
    drawText(ctx, conf.sub, W * 0.5, 214, { size: 26, color: conf.fg });
    ctx.fillStyle = conf.accent;
    ctx.fillRect(24, 24, 8, H - 48);
    ctx.fillRect(W - 32, 24, 8, H - 48);
  });
}

// floor arrow sticker  "レジはこちら" — reads from the entrance, arrow points north
function texArrow() {
  return canvasTexture(512, 340, (ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1f7a5a';
    roundRect(ctx, 18, 18, W - 36, 92, 20);
    ctx.fill();
    drawText(ctx, 'レジはこちら', W / 2, 66, { size: 46, color: '#ffffff' });
    // arrow pointing down in canvas = north in the store
    ctx.fillStyle = '#1f7a5a';
    ctx.beginPath();
    ctx.moveTo(232, 128);
    ctx.lineTo(280, 128);
    ctx.lineTo(280, 232);
    ctx.lineTo(340, 232);
    ctx.lineTo(256, 318);
    ctx.lineTo(172, 232);
    ctx.lineTo(232, 232);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 5;
    ctx.stroke();
  });
}

// shoe-print pair sticker (transparent)
function texFoot() {
  return canvasTexture(128, 128, (ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);
    const shoe = (x, flip) => {
      ctx.save();
      ctx.translate(x, 0);
      if (flip) ctx.scale(-1, 1);
      ctx.fillStyle = '#2a5f8f';
      ctx.beginPath();
      ctx.ellipse(0, 54, 20, 34, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 100, 15, 18, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    };
    shoe(38, false);
    shoe(90, true);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 1. DRINK COOLERS — west wall, three doors, face +x
// ════════════════════════════════════════════════════════════════════════════
function buildDrinkCoolers(g) {
  const XB = -3.04, XF = -2.44;
  const ZA = -2.85, ZB = -0.06;
  const zMid = (ZA + ZB) / 2, zLen = ZB - ZA;
  const W = XF - XB;
  const baseTop = FL + 0.20;       // 0.36
  const canopyY = FL + 2.00 - 0.16; // 2.00 canopy underside
  const topY = FL + 2.00;          // 2.16

  // compressor plinth
  box(g, [W, 0.20, zLen], [(XB + XF) / 2, FL + 0.10, zMid], MAT.dark, { cast: true, outline: 0.016 });
  // canopy / lightbox housing
  box(g, [W, 0.16, zLen], [(XB + XF) / 2, canopyY + 0.08, zMid], MAT.white, { cast: true, outline: 0.016 });
  // back panel
  box(g, [0.05, canopyY - baseTop, zLen], [XB + 0.025, (baseTop + canopyY) / 2, zMid], MAT.metalDark);
  // end panels + mullions
  const frameItems = [];
  const sideX = (XB + XF) / 2, sideY = (baseTop + canopyY) / 2, sideH = canopyY - baseTop;
  for (const z of [ZA + 0.02, ZA + 0.93, ZA + 1.86, ZB - 0.02]) {
    frameItems.push({ p: [sideX, sideY, z], s: [W, sideH, z === ZA + 0.02 || z === ZB - 0.02 ? 0.04 : 0.035] });
  }
  inst(g, GEO.unitBox, MAT.white2, frameItems);

  // shelves
  const shelfItems = [];
  for (let s = 0; s < 4; s++) shelfItems.push({ p: [-2.72, 0.56 + s * 0.40, zMid], s: [0.50, 0.026, zLen - 0.06] });
  inst(g, GEO.unitBox, MAT.shelf, shelfItems);
  // shelf front price rails
  const railItems = [];
  for (let s = 0; s < 4; s++) railItems.push({ p: [-2.46, 0.585 + s * 0.40, zMid], s: [0.014, 0.05, zLen - 0.08] });
  inst(g, GEO.unitBox, MAT.white, railItems);

  // lit back panel (the cold glow you see from the street)
  litPlane(g, zLen - 0.04, canopyY - baseTop - 0.05, [XB + 0.058, (baseTop + canopyY) / 2, zMid],
    canvasTexture(32, 256, (ctx, w, h) => {
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#f4fdff');
      grd.addColorStop(0.45, '#d8f1ff');
      grd.addColorStop(1, '#a9ddf2');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
    }), { ry: HALF_PI, i: 0.80 });

  // bottles & cans on the shelves
  const drinkCols = [0x8ecff5, 0xf2f4ef, 0xffa63d, 0x63c46a, 0x2f7fc4, 0x9ee3d2, 0xd94f3f, 0x7a4a2c, 0xc0e9ff, 0xf7c948, 0xffffff, 0x28323c];
  const rand = rng(11);
  const bottleItems = [];
  const canItems = [];
  for (let s = 0; s < 4; s++) {
    const shelfY = 0.56 + s * 0.40 + 0.013;
    for (let row = 0; row < 3; row++) {
      const x = -2.56 - row * 0.115;
      for (let c = 0; c < 24; c++) {
        const z = ZA + 0.10 + c * 0.114;
        const col = drinkCols[Math.floor(rand() * drinkCols.length)];
        if (rand() < 0.28) {
          canItems.push({ p: [x, shelfY + 0.062, z], s: [0.031, 0.124, 0.031], c: col });
        } else {
          const hgt = 0.155 + rand() * 0.035;
          bottleItems.push({ p: [x, shelfY + hgt / 2, z], s: [0.03, hgt, 0.03], c: col });
        }
      }
    }
  }
  inst(g, GEO.unitCyl, MAT.can, canItems);
  inst(g, GEO.unitCyl, MAT.product, bottleItems);

  // glass doors
  for (let u = 0; u < 3; u++) {
    plane(g, [0.90, 1.56], [-2.436, 0.40 + 0.78, ZA + 0.465 + u * 0.93], MAT.glass, { ry: HALF_PI, receive: false });
  }
  // door frame bars
  const bars = [];
  for (const z of [ZA + 0.02, ZA + 0.93, ZA + 1.86, ZB - 0.02]) bars.push({ p: [-2.44, 1.18, z], s: [0.05, 1.64, 0.04] });
  for (let u = 0; u < 3; u++) {
    for (const y of [0.40, 1.98]) bars.push({ p: [-2.44, y, ZA + 0.465 + u * 0.93], s: [0.05, 0.035, 0.90] });
  }
  inst(g, GEO.unitBox, MAT.metalDark, bars);
  // handles
  inst(g, GEO.unitCyl, MAT.steel, [0, 1, 2].map((u) => ({
    p: [-2.405, 1.14, ZA + 0.62 + u * 0.93], s: [0.012, 0.56, 0.012],
  })));

  // canopy lightbox
  litPlane(g, zLen - 0.06, 0.125, [-2.432, topY - 0.075, zMid], texCoolerSign(), { ry: HALF_PI, i: 0.75 });
  // compressor grille
  litPlane(g, zLen - 0.10, 0.135, [-2.432, FL + 0.10, zMid], texGrille(), { ry: HALF_PI, i: 0.55 });
  // top light strip inside the canopy
  box(g, [0.42, 0.03, zLen - 0.12], [-2.70, canopyY - 0.02, zMid], EMIT.cool);

  // little price tags on the shelf rails
  const tagItems = [];
  const tagCols = [0xffd23f, 0xffffff, 0xff7a3c, 0xe23b2e];
  for (let s = 0; s < 4; s++) {
    for (let c = 0; c < 9; c++) {
      tagItems.push({
        p: [-2.448, 0.605 + s * 0.40, ZA + 0.22 + c * 0.30],
        s: [0.006, 0.045, 0.06],
        c: tagCols[(s + c) % 4],
      });
    }
  }
  inst(g, GEO.unitBox, MAT.film, tagItems);

  // cool spill on the floor in front of the doors
  groundSmear(g, 0x8fd6f2, 0.85, 2.6, [-2.15, FL + 0.012, zMid], { opacity: 0.16 });
  glow(g, 0xbfe8ff, 1.5, [-2.40, 1.25, zMid], { opacity: 0.12 });
}

// ════════════════════════════════════════════════════════════════════════════
// 2. CENTRE GONDOLAS — two snack / daily-goods islands, double sided, 5 tiers
// ════════════════════════════════════════════════════════════════════════════
const ISLANDS = [
  { x0: -1.85, x1: -0.95, z0: -2.34, z1: -0.56 },
  { x0: -0.05, x1: 0.85, z0: -2.34, z1: -0.56 },
];
const SHELF_LEVELS = [0.43, 0.62, 0.81, 1.00, 1.19];

const SNACK_COLS = [
  0xe0453c, 0xf2a03c, 0xf5d94a, 0x62b85a, 0x3f7fc9, 0x7a5fc4,
  0xe86aa8, 0xf2ece0, 0x30394a, 0xc9df3f, 0x9ad4e0, 0xd97a2b,
  0xffffff, 0xffd9a0, 0x5c3a28, 0xb83a52,
];

function buildIslands(g) {
  const rand = rng(29);
  const spines = [];
  const ends = [];
  const boards = [];
  const uprights = [];
  const strips = [];
  const pops = [];
  const prodItems = [];
  const stackItems = [];

  for (const is of ISLANDS) {
    const { x0, x1, z0, z1 } = is;
    const cx = (x0 + x1) / 2, w = x1 - x0, len = z1 - z0, cz = (z0 + z1) / 2;
    // central spine
    spines.push({ p: [cx, FL + 0.22 + 0.56, cz], s: [0.09, 1.13, len] });
    // end boards
    ends.push({ p: [cx, FL + 0.22 + 0.56, z0 + 0.015], s: [w, 1.10, 0.03] });
    ends.push({ p: [cx, FL + 0.22 + 0.56, z1 - 0.015], s: [w, 1.10, 0.03] });
    // posts
    for (const px of [x0 + 0.04, x1 - 0.04]) {
      for (const pz of [z0 + 0.08, z1 - 0.08]) {
        uprights.push({ p: [px, FL + 0.22 + 0.52, pz], s: [0.045, 1.04, 0.045] });
      }
    }
    // shelves + products + rails (both faces: side = -1 west face, +1 east face)
    for (let s = 0; s < 5; s++) {
      const y = SHELF_LEVELS[s];
      for (const side of [-1, 1]) {
        const shelfCx = cx + side * (w / 4);
        const faceX = side > 0 ? x1 : x0;
        boards.push({ p: [shelfCx, y, cz], s: [w / 2 - 0.03, 0.022, len - 0.06] });
        strips.push({
          p: [faceX + side * 0.007, y + 0.018, cz],
          s: [len - 0.10, 0.055, 1],
          r: [0, side > 0 ? HALF_PI : -HALF_PI, 0],
        });
        // products: 3 rows deep, 10-14 columns
        const cols = s === 4 ? 14 : 13;
        for (let row = 0; row < 3; row++) {
          const px = faceX - side * (0.055 + row * 0.105);
          for (let c = 0; c < cols; c++) {
            const pz = z0 + 0.11 + c * ((len - 0.22) / (cols - 1));
            if (rand() < 0.04) continue; // the odd gap keeps it from looking machine-made
            const hgt = 0.075 + rand() * 0.075;
            const wide = 0.052 + rand() * 0.05;
            prodItems.push({
              p: [px, y + 0.011 + hgt / 2, pz],
              s: [0.058 + rand() * 0.03, hgt, wide],
              r: [0, (rand() - 0.5) * 0.28, 0],
              c: SNACK_COLS[Math.floor(rand() * SNACK_COLS.length)],
            });
          }
        }
        // yellow POP cards clipped to some shelves
        if (s === 1 || s === 3) {
          pops.push({
            p: [faceX + side * 0.02, y + 0.11, cz + (rand() - 0.5) * (len - 0.6)],
            s: [0.12, 0.15, 1],
            r: [0, side > 0 ? HALF_PI : -HALF_PI, 0],
          });
        }
      }
    }
    // end-cap promo stacks at the south end (facing the window)
    for (let k = 0; k < 3; k++) {
      for (let hgt = 0; hgt < 3; hgt++) {
        stackItems.push({
          p: [x0 + 0.20 + k * (w - 0.40) / 2, FL + 0.10 + hgt * 0.195, z1 + 0.28],
          s: [0.245, 0.19, 0.27],
          r: [0, (rand() - 0.5) * 0.18, 0],
          c: [0xc79a5c, 0xd8b06a, 0xb8452f, 0x2f6f9e, 0xd8b06a][Math.floor(rand() * 5)],
        });
      }
    }
  }

  // plinths: just two, as normal meshes so they can carry a proper outline
  for (const is of ISLANDS) {
    const cx = (is.x0 + is.x1) / 2, cz = (is.z0 + is.z1) / 2;
    const pl = box(g, [is.x1 - is.x0 - 0.04, 0.22, is.z1 - is.z0 + 0.04], [cx, FL + 0.11, cz], MAT.dark, { cast: true });
    addOutline(pl, 0.016);
  }
  inst(g, GEO.unitBox, MAT.white2, spines, { cast: true });
  inst(g, GEO.unitBox, MAT.white, ends);
  inst(g, GEO.unitBox, MAT.shelf, boards);
  inst(g, GEO.unitBox, MAT.white, uprights);
  inst(g, GEO.unitBox, MAT.product, prodItems);
  const railMat = M.toon(0xffffff, { map: texPriceRail(), transparent: true });
  inst(g, GEO.unitPlane, railMat, strips);
  const popMat = M.toon(0xffffff, { map: texPop(), transparent: true, side: THREE.DoubleSide });
  inst(g, GEO.unitPlane, popMat, pops);
  inst(g, GEO.unitBox, MAT.box, stackItems, { cast: true });

  // "特価" cards on the end stacks (the end-caps are only meshes, geometry already instanced)
  for (const is of ISLANDS) {
    const cx = (is.x0 + is.x1) / 2;
    const pos = [cx, FL + 0.86, is.z1 + 0.30];
    label(g, 0.34, 0.46, (ctx, cw, ch) => {
      ctx.fillStyle = '#c8202a';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(0, 0, cw, ch * 0.16);
      drawText(ctx, '特', cw / 2, ch * 0.34, { size: ch * 0.24, color: '#fff' });
      drawText(ctx, '価', cw / 2, ch * 0.62, { size: ch * 0.24, color: '#fff' });
      drawText(ctx, '¥98', cw / 2, ch * 0.86, { size: ch * 0.15, color: '#ffd23f' });
    }, pos, { px: 300, doubleSide: true, brightness: 1.0 });
    // little stand
    box(g, [0.03, 0.46, 0.02], [cx, FL + 0.53, is.z1 + 0.30], MAT.metalDark);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 3. MAGAZINE RACK + bunko rack along the south window
// ════════════════════════════════════════════════════════════════════════════
function buildMagazineRack(g) {
  const x0 = -2.90, x1 = -0.68, z0 = 0.55, z1 = 0.86;
  const cx = (x0 + x1) / 2, w = x1 - x0;
  const topY = FL + 1.02; // 1.18

  // low cabinet base
  box(g, [w, 0.26, 0.28], [cx, FL + 0.13, (z0 + z1) / 2 + 0.015], MAT.white, { cast: true, outline: 0.016 });
  // back board sits on the STORE side (north) so the covers present to the glass
  box(g, [w, topY - (FL + 0.26), 0.035], [cx, (FL + 0.26 + topY) / 2, z0 + 0.055], MAT.white2);
  // side boards
  for (const sx of [x0 + 0.02, x1 - 0.02]) {
    box(g, [0.035, topY - FL, 0.29], [sx, (FL + topY) / 2, (z0 + z1) / 2], MAT.white2);
  }
  // top rail + strip light behind the covers
  box(g, [w + 0.04, 0.045, 0.31], [cx, topY + 0.02, (z0 + z1) / 2 - 0.01], MAT.gray);
  box(g, [w - 0.06, 0.022, 0.03], [cx, topY - 0.055, z0 + 0.10], EMIT.warmSoft);

  // three tiers of covers, each leaning back toward the board, facing the window (+z)
  const texA = texMagCovers(5);
  const texB = texMagCovers(9);
  const rows = [
    { y: FL + 0.30, h: 0.26, z: 0.755, tex: texA },
    { y: FL + 0.56, h: 0.26, z: 0.735, tex: texB },
    { y: FL + 0.78, h: 0.24, z: 0.715, tex: texA },
  ];
  for (const r of rows) {
    // tier shelf the covers stand on
    box(g, [w - 0.06, 0.02, 0.17], [cx, r.y, r.z + 0.01], MAT.shelf);
    // cover row: unlit print so it reads bright through the night glass
    litPlane(g, w - 0.08, r.h, [cx, r.y + r.h / 2 + 0.005, r.z], r.tex, { i: 0.95, rx: -0.2 });
    // front lip that holds the magazines in
    box(g, [w - 0.06, 0.022, 0.018], [cx, r.y + 0.02, r.z + 0.155], MAT.gray2);
  }

  // ── bunko / comic rack at the east end of the magazine run ──
  const bx0 = -0.62, bx1 = -0.30, bz0 = 0.56, bz1 = 0.84;
  const bcx = (bx0 + bx1) / 2, bTOP = FL + 1.14;
  box(g, [bx1 - bx0, 0.20, bz1 - bz0], [bcx, FL + 0.10, (bz0 + bz1) / 2], MAT.white, { cast: true, outline: 0.014 });
  for (const sx of [bx0 + 0.02, bx1 - 0.02]) {
    box(g, [0.03, bTOP - FL, 0.26], [sx, (FL + bTOP) / 2, (bz0 + bz1) / 2], MAT.white2);
  }
  // back board toward the store, books present their spines to the glass
  box(g, [bx1 - bx0, bTOP - FL, 0.03], [bcx, (FL + bTOP) / 2, bz0 + 0.03], MAT.white2);
  box(g, [bx1 - bx0 + 0.02, 0.035, 0.30], [bcx, bTOP, (bz0 + bz1) / 2], MAT.gray);
  // 3 shelves of books
  const bkCols = [0xe8dcc0, 0xd84a3a, 0x32629c, 0x4a8a5c, 0xe8b84a, 0x8e5a9c, 0xf2ece0, 0x2c3540];
  const rand = rng(41);
  const books = [];
  for (let s = 0; s < 3; s++) {
    const yy = FL + 0.28 + s * 0.28;
    box(g, [bx1 - bx0 - 0.06, 0.018, 0.24], [bcx, yy - 0.01, (bz0 + bz1) / 2 + 0.01], MAT.shelf);
    for (let i = 0; i < 11; i++) {
      books.push({
        p: [bx0 + 0.05 + i * 0.022, yy + 0.075, 0.73],
        s: [0.026, 0.14 + rand() * 0.03, 0.15],
        c: bkCols[Math.floor(rand() * bkCols.length)],
      });
    }
  }
  inst(g, GEO.unitBox, MAT.book, books);
  // little "雑誌・コミック" tag on the top rail front
  label(g, 0.72, 0.10, (ctx, cw, ch) => {
    ctx.fillStyle = '#f7f2e6';
    ctx.fillRect(0, 0, cw, ch);
    drawText(ctx, '雑誌・コミック', cw / 2, ch * 0.55, { size: ch * 0.6, color: '#2d3236' });
  }, [cx, topY + 0.02, 0.852], { px: 500, brightness: 0.95 });
}

// ════════════════════════════════════════════════════════════════════════════
// 4. CHECKOUT COUNTER — register, oden, hot case, coffee, cigarette wall
// ════════════════════════════════════════════════════════════════════════════
function buildPOS(g, x, z) {
  const topY = 0.95;
  // cash drawer / base
  box(g, [0.34, 0.11, 0.30], [x, topY + 0.055, z], MAT.dark);
  // monitor body (faces the customer, +z)
  box(g, [0.34, 0.23, 0.055], [x, topY + 0.26, z + 0.01], MAT.darker, { rx: -0.10 });
  // screen
  litPlane(g, 0.29, 0.18, [x, topY + 0.26, z + 0.045], texPosScreen(), { i: 0.9, rx: -0.10 });
  // stand
  box(g, [0.05, 0.11, 0.05], [x, topY + 0.14, z - 0.02], MAT.metalDark);
  // customer display on a stalk
  box(g, [0.02, 0.14, 0.02], [x + 0.16, topY + 0.14, z + 0.06], MAT.metalDark);
  const cust = box(g, [0.17, 0.10, 0.035], [x + 0.16, topY + 0.24, z + 0.06], MAT.darker, { ry: 0.25 });
  litPlane(g, 0.13, 0.06, [x + 0.155, topY + 0.24, z + 0.078], canvasTexture(128, 64, (ctx, W, H) => {
    ctx.fillStyle = '#0d2338';
    ctx.fillRect(0, 0, W, H);
    drawText(ctx, '¥1,280', W / 2, H / 2, { size: 26, color: '#8ee6a8' });
  }), { i: 1.0, ry: 0.25 });
  // keypad
  box(g, [0.13, 0.025, 0.10], [x - 0.13, topY + 0.06, z + 0.10], MAT.dark);
  // receipt printer
  box(g, [0.14, 0.13, 0.14], [x + 0.22, topY + 0.065, z - 0.04], MAT.white2);
  const paper = box(g, [0.07, 0.10, 0.005], [x + 0.22, topY + 0.17, z - 0.04], MAT.paper, { rx: -0.25 });
  paper.castShadow = false;
  // little green LED
  box(g, [0.012, 0.012, 0.012], [x + 0.27, topY + 0.115, z + 0.025], EMIT.green);
}

function buildCheckout(g) {
  const x0 = -0.62, x1 = 2.30, z0 = -3.00, z1 = -2.56;
  const cx = (x0 + x1) / 2, w = x1 - x0, d = z1 - z0, cz = (z0 + z1) / 2;
  const topY = 0.95;

  // body
  const body = box(g, [w, topY - FL - 0.06, d], [cx, FL + (topY - FL - 0.06) / 2, cz], MAT.counterBody, { cast: true });
  addOutline(body, 0.016);
  // top slab
  box(g, [w + 0.05, 0.06, d + 0.05], [cx, topY - 0.03, cz + 0.01], MAT.counterTop);
  // closing white end panels
  box(g, [0.03, topY - FL, d], [x0 + 0.015, FL + (topY - FL) / 2, cz], MAT.white);
  box(g, [0.03, topY - FL, d], [x1 - 0.015, FL + (topY - FL) / 2, cz], MAT.white);
  // front panel print + kick
  printPlane(g, w - 0.06, 0.62, [cx, FL + 0.47, z1 + 0.006], texCounterFront(), {});
  box(g, [w, 0.12, 0.02], [cx, FL + 0.06, z1 + 0.005], MAT.dark);

  // ── hot snack case (west end of the counter) ──
  {
    const hx = -0.30, hw = 0.52, hd = 0.34, hz = cz - 0.02;
    box(g, [hw, 0.06, hd], [hx, topY + 0.03, hz], MAT.white2);
    box(g, [hw, 0.06, hd], [hx, topY + 0.47, hz], MAT.white);
    box(g, [hw, 0.43, 0.02], [hx, topY + 0.26, hz - hd / 2 + 0.01], MAT.white2);
    for (const sx of [-1, 1]) box(g, [0.02, 0.43, hd], [hx + sx * (hw / 2 - 0.01), topY + 0.26, hz], MAT.white2);
    // lit back + warm interior
    litPlane(g, hw - 0.06, 0.36, [hx, topY + 0.26, hz - hd / 2 + 0.025], canvasTexture(32, 128, (ctx, W, H) => {
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#fff4d8');
      grd.addColorStop(1, '#ffcf92');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
    }), { i: 0.82 });
    // two shelves of fried food
    const food = [];
    const rand = rng(53);
    for (let s = 0; s < 2; s++) {
      const yy = topY + 0.16 + s * 0.15;
      box(g, [hw - 0.06, 0.014, hd - 0.06], [hx, yy - 0.007, hz], MAT.metal);
      for (let i = 0; i < 5; i++) {
        food.push({
          p: [hx - 0.19 + i * 0.095, yy + 0.045, hz + (rand() - 0.5) * 0.09],
          s: [0.045, 0.04, 0.045],
          c: s === 0 ? [0xd99a3f, 0xc9802f, 0xe8b45a][i % 3] : [0xf2e8cf, 0xefe0bd, 0xe8d4a8][i % 3],
        });
      }
    }
    inst(g, GEO.unitSphere, MAT.product, food);
    // front glass
    plane(g, [hw - 0.02, 0.42], [hx, topY + 0.26, hz + hd / 2 - 0.005], MAT.glass, { receive: false });
    // price plate on the glass
    litPlane(g, hw - 0.06, 0.11, [hx, topY + 0.10, hz + hd / 2 + 0.005], texHotCase(), { i: 0.85 });
  }

  // ── oden pot ──
  {
    const ox = 0.30, ow = 0.50, od = 0.28, oz = cz - 0.04, oy = topY;
    const pot = box(g, [ow, 0.24, od], [ox, oy + 0.12, oz], MAT.steel);
    addOutline(pot, 0.012);
    // broth surface
    litPlane(g, ow - 0.05, od - 0.05, [ox, oy + 0.225, oz], canvasTexture(64, 64, (ctx, W, H) => {
      ctx.fillStyle = '#e8a94a';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,220,150,0.5)';
      for (let i = 0; i < 10; i++) ctx.fillRect((i * 23) % W, (i * 37) % H, 8, 8);
    }), { i: 0.95, rx: -HALF_PI });
    // dividers
    for (const dx of [-0.14, 0.0, 0.14]) box(g, [0.012, 0.24, od - 0.03], [ox + dx, oy + 0.12, oz], MAT.metal);
    box(g, [ow - 0.03, 0.24, 0.012], [ox, oy + 0.12, oz], MAT.metal);
    // skewers + pieces
    const rand = rng(61);
    const sticks = [];
    const bits = [];
    for (let i = 0; i < 9; i++) {
      const sx = ox - 0.20 + (i % 5) * 0.085 + (rand() - 0.5) * 0.02;
      const sz = oz - 0.09 + Math.floor(i / 5) * 0.10;
      sticks.push({ p: [sx, oy + 0.34, sz], s: [0.005, 0.24, 0.005], r: [0.12 + rand() * 0.1, 0, 0.1] });
      bits.push({
        p: [sx, oy + 0.245, sz], s: [0.05, 0.03, 0.05],
        c: [0xf0e2c0, 0xd8a24a, 0x9c8b7a, 0xf4ead4][Math.floor(rand() * 4)],
      });
    }
    inst(g, GEO.unitCyl6, MAT.wood, sticks);
    inst(g, GEO.unitBox, MAT.product, bits);
    // price plate on the counter in front
    litPlane(g, ow + 0.02, 0.10, [ox, oy + 0.02, oz + od / 2 + 0.02], texOden(), { i: 0.8 });
    // steam wisps
    for (let i = 0; i < 2; i++) {
      const s = glow(g, 0xf6f0e0, 0.42, [ox + (i - 0.5) * 0.16, oy + 0.42, oz], { opacity: 0.14, normal: true, renderOrder: 4 });
      s.userData.steam = { base: oy + 0.30, phase: i * 1.7, amp: 0.20 };
    }
  }

  // ── little sink ──
  {
    const sx = 0.72;
    box(g, [0.16, 0.02, 0.24], [sx, topY + 0.005, cz], MAT.metalDark);
    box(g, [0.12, 0.015, 0.18], [sx, topY - 0.005, cz], MAT.darker);
    cylinder(g, 0.012, 0.012, 0.16, [sx, topY + 0.10, cz + 0.09], MAT.steel);
    cylinder(g, 0.012, 0.012, 0.12, [sx, topY + 0.17, cz + 0.045], MAT.steel, { rx: HALF_PI });
    box(g, [0.05, 0.10, 0.05], [sx + 0.16, topY + 0.05, cz + 0.06], MAT.white2);
  }

  // ── two POS registers ──
  buildPOS(g, 1.10, cz);
  buildPOS(g, 1.58, cz);

  // ── coffee machine ──
  {
    const mx = 2.02, mw = 0.40, md = 0.32, mz = cz - 0.02;
    const mBody = box(g, [mw, 0.60, md], [mx, topY + 0.30, mz], MAT.dark, { cast: true });
    addOutline(mBody, 0.013);
    // fascia + screen
    printPlane(g, mw - 0.04, 0.30, [mx, topY + 0.42, mz + md / 2 + 0.002], texCoffee(), {});
    // brew spout + drip tray
    box(g, [0.06, 0.06, 0.06], [mx, topY + 0.17, mz + 0.08], MAT.metalDark);
    box(g, [0.30, 0.03, 0.14], [mx, topY + 0.015, mz + 0.10], MAT.metal);
    // warm lamp over the drip tray (the little amber glow of a hot drinks machine)
    box(g, [0.26, 0.012, 0.02], [mx, topY + 0.245, mz + 0.115], EMIT.amber);
    glow(g, 0xffcf92, 0.26, [mx, topY + 0.12, mz + 0.14], { opacity: 0.22 });
    // cup stack
    inst(g, GEO.unitCyl, MAT.white, [0, 1, 2, 3].map((i) => ({
      p: [mx - 0.09 + (i % 2) * 0.06, topY + 0.02 + Math.floor(i / 2) * 0.035, mz + 0.11],
      s: [0.032, 0.032, 0.032],
    })));
    glow(g, 0xffd9a0, 0.5, [mx, topY + 0.35, mz + 0.2], { opacity: 0.14 });
  }

  // ── plastic bag rack on the counter end ──
  {
    const bx = 2.22;
    cylinder(g, 0.012, 0.012, 0.5, [bx, topY + 0.25, cz - 0.10], MAT.steel);
    const bags = [];
    for (let i = 0; i < 3; i++) {
      bags.push({
        p: [bx - 0.004, topY + 0.34 - i * 0.09, cz - 0.10 + (i % 2) * 0.012],
        s: [0.012, 0.24, 0.20],
        r: [0, 0.1 * (i - 1), 0.05 * (i - 1)],
      });
    }
    inst(g, GEO.unitBox, MAT.film, bags);
    box(g, [0.03, 0.03, 0.20], [bx, topY + 0.47, cz - 0.10], MAT.metalDark);
  }

  // ── hot-snack poster on the wall above the hot case ──
  {
    const tex = canvasTexture(256, 330, (ctx, cw, ch) => {
      ctx.fillStyle = '#f7c93c';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#c8202a';
      ctx.fillRect(0, 0, cw, ch * 0.30);
      ctx.fillStyle = '#ffffff';
      drawText(ctx, 'ホットスナック', cw / 2, ch * 0.155, { size: 30, color: '#ffffff' });
      // fried chicken pieces
      for (let i = 0; i < 5; i++) {
        const px = cw * 0.18 + (i % 3) * cw * 0.31, py = ch * 0.44 + Math.floor(i / 3) * ch * 0.13;
        ctx.fillStyle = i % 2 ? '#d99a3f' : '#c07f2c';
        ctx.beginPath();
        ctx.ellipse(px, py, cw * 0.10, ch * 0.055, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#b01c1c';
      drawText(ctx, 'からあげ', cw / 2, ch * 0.72, { size: 40, color: '#b01c1c' });
      drawText(ctx, '100円', cw / 2, ch * 0.88, { size: 52, color: '#111' });
    });
    litPlane(g, 0.62, 0.80, [-0.28, FL + 1.48, -3.045], tex, { i: 0.8 });
  }

  // ── shopping baskets: one by the counter, a stack by the door ──
  {
    const wallItems = [], handleItems = [];
    const stacks = [
      { x: 0.62, z: -2.40, n: 1 },
      { x: 2.18, z: -1.30, n: 3 },
    ];
    for (const b of stacks) {
      for (let k = 0; k < b.n; k++) {
        const y0 = FL + k * 0.125;
        wallItems.push(
          { p: [b.x, y0 + 0.075, b.z - 0.128], s: [0.36, 0.15, 0.014] },
          { p: [b.x, y0 + 0.075, b.z + 0.128], s: [0.36, 0.15, 0.014] },
          { p: [b.x - 0.173, y0 + 0.075, b.z], s: [0.014, 0.15, 0.256] },
          { p: [b.x + 0.173, y0 + 0.075, b.z], s: [0.014, 0.15, 0.256] },
          { p: [b.x, y0 + 0.004, b.z], s: [0.36, 0.008, 0.26] },
        );
        handleItems.push(
          { p: [b.x - 0.09, y0 + 0.155, b.z + 0.112], s: [0.09, 0.014, 0.014] },
          { p: [b.x + 0.09, y0 + 0.155, b.z + 0.112], s: [0.09, 0.014, 0.014] },
        );
      }
    }
    inst(g, GEO.unitBox, MAT.gray, wallItems);
    inst(g, GEO.unitBox, MAT.red, handleItems);
  }

  // warm light pooling on the floor in front of the counter
  groundSmear(g, 0xffcf92, 2.2, 0.9, [0.9, FL + 0.012, -2.34], { opacity: 0.11 });
  groundSmear(g, 0xffd9a8, 1.2, 0.8, [1.5, FL + 0.012, -0.75], { opacity: 0.08 });

  // ── cigarette cabinet on the wall behind the counter ──
  {
    const cw = 2.14, chh = 1.04, cyBottom = FL + 0.92, cxb = 1.16, czb = -3.005;
    const cab = box(g, [cw, chh, 0.11], [cxb, cyBottom + chh / 2, czb], MAT.white, { cast: true });
    addOutline(cab, 0.014);
    litPlane(g, cw - 0.03, chh - 0.05, [cxb, cyBottom + chh / 2, czb + 0.057], texCigarettes(), { i: 0.9 });
    // top strip
    box(g, [cw + 0.02, 0.05, 0.11], [cxb, cyBottom + chh + 0.025, czb], MAT.dark);
    label(g, cw - 0.06, 0.15, (ctx, cw2, ch2) => {
      ctx.fillStyle = '#c8202a';
      ctx.fillRect(0, 0, cw2, ch2);
      drawText(ctx, 'たばこ', cw2 / 2, ch2 * 0.55, { size: ch2 * 0.72, color: '#ffffff' });
    }, [cxb, cyBottom + chh + 0.09, czb + 0.058], { px: 500, brightness: 1.0 });
  }

  // ── hanging register lightbox above the counter ──
  {
    const hx = 1.05, hy = 2.02, hz = -2.55;
    const g2 = new THREE.Group();
    g2.position.set(hx, hy, hz);
    g.add(g2);
    const box2 = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.20, 0.26), MAT.white);
    g2.add(box2);
    // glowing face toward the store (+z / camera side)
    label(g2, 0.72, 0.16, (ctx, cw, ch) => {
      ctx.fillStyle = '#fdf6e4';
      ctx.fillRect(0, 0, cw, ch);
      drawText(ctx, 'お会計 ・ レジ', cw / 2, ch * 0.55, { size: ch * 0.62, color: '#b03024' });
    }, [0, 0, 0.132], { px: 600, brightness: 1.0 });
    // hanger rods
    const rods = new THREE.InstancedMesh(GEO.unitCyl, MAT.metalDark, 2);
    const dm = new THREE.Object3D();
    for (let i = 0; i < 2; i++) {
      dm.position.set((i - 0.5) * 0.56, 0.30, 0);
      dm.scale.set(0.008, 0.48, 0.008);
      dm.updateMatrix();
      rods.setMatrixAt(i, dm.matrix);
    }
    rods.instanceMatrix.needsUpdate = true;
    g2.add(rods);
    glow(g, 0xffe6bd, 0.9, [hx, hy - 0.05, hz + 0.2], { opacity: 0.16 });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 5. BENTO CHEST FREEZER + ONIGIRI SHELF (east side, in front of the counter)
// ════════════════════════════════════════════════════════════════════════════
function buildBentoZone(g) {
  const x0 = 1.15, x1 = 1.95, z0 = -2.32, z1 = -1.55;
  const cx = (x0 + x1) / 2, w = x1 - x0, d = z1 - z0, cz = (z0 + z1) / 2;
  const bodyTop = FL + 0.55;

  // body
  const bentoBody = box(g, [w, 0.55, d], [cx, FL + 0.275, cz], MAT.white, { cast: true });
  addOutline(bentoBody, 0.016);
  // dark kick + rim
  box(g, [w, 0.09, d], [cx, FL + 0.045, cz], MAT.dark);
  box(g, [w + 0.03, 0.06, d + 0.03], [cx, bodyTop + 0.03, cz], MAT.gray);
  // lit interior floor
  litPlane(g, w - 0.14, d - 0.14, [cx, bodyTop - 0.005, cz], canvasTexture(32, 32, (ctx, W, H) => {
    ctx.fillStyle = '#e8f6ff';
    ctx.fillRect(0, 0, W, H);
  }), { i: 0.85, rx: -HALF_PI });
  // inner walls
  box(g, [w - 0.10, 0.04, 0.02], [cx, bodyTop - 0.01, z0 + 0.06], MAT.white2);
  box(g, [w - 0.10, 0.04, 0.02], [cx, bodyTop - 0.01, z1 - 0.06], MAT.white2);
  // bento boxes
  const rand = rng(71);
  const bento = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      bento.push({
        p: [x0 + 0.14 + c * 0.16, bodyTop + 0.03, z0 + 0.13 + r * 0.13],
        s: [0.14, 0.052, 0.11],
        r: [0, (rand() - 0.5) * 0.15, 0],
        c: [0x2c3540, 0xd84a3a, 0x2f6f9e, 0x3f7f4f, 0xc9a35a][Math.floor(rand() * 5)],
      });
    }
  }
  inst(g, GEO.unitBox, MAT.product, bento);
  // onigiri triangles sitting in the front row
  const tri = [], nori = [];
  for (let c = 0; c < 4; c++) {
    const px = x0 + 0.15 + c * 0.19;
    tri.push({ p: [px, bodyTop + 0.05, z1 - 0.16], s: [0.062, 0.024, 0.062], r: [HALF_PI, 0, 0], c: 0xf7f2e0 });
    nori.push({ p: [px, bodyTop + 0.035, z1 - 0.135], s: [0.05, 0.055, 0.008], c: 0x1f2a22 });
  }
  inst(g, GEO.unitTri, MAT.product, tri);
  inst(g, GEO.unitBox, MAT.product, nori);
  // glass lids (two hinged panels, slightly lifted)
  plane(g, [w - 0.08, d / 2 - 0.03], [cx, bodyTop + 0.075, cz - d / 4], MAT.glass, { rx: -HALF_PI + 0.09, receive: false });
  plane(g, [w - 0.08, d / 2 - 0.03], [cx, bodyTop + 0.075, cz + d / 4], MAT.glass, { rx: -HALF_PI + 0.09, receive: false });
  // metal lid frame
  box(g, [0.02, 0.13, 0.02], [x0 + 0.05, bodyTop + 0.075, z0 + 0.04], MAT.steel);
  box(g, [0.02, 0.13, 0.02], [x1 - 0.05, bodyTop + 0.075, z0 + 0.04], MAT.steel);
  // front label
  litPlane(g, w - 0.05, 0.15, [cx, FL + 0.42, z1 + 0.005], canvasTexture(512, 96, (ctx, W, H) => {
    ctx.fillStyle = '#f7f2e6';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c8202a';
    ctx.fillRect(0, 0, W, 8);
    drawText(ctx, 'おにぎり・お弁当', W * 0.5, H * 0.52, { size: 40, color: '#2d3236' });
    ctx.fillStyle = '#1f6b45';
    ctx.fillRect(W - 66, 14, 56, H - 24);
    drawText(ctx, '150', W - 38, H * 0.52, { size: 26, color: '#ffffff' });
  }), { i: 0.85 });

  // ── small onigiri shelf, east of the chest, facing the window (+z) ──
  {
    const sx0 = 1.98, sx1 = 2.40, sz0 = -2.28, sz1 = -1.72;
    const scx = (sx0 + sx1) / 2, sw = sx1 - sx0, sd = sz1 - sz0, scz = (sz0 + sz1) / 2;
    const stop = FL + 1.16;
    box(g, [sw, 0.16, sd], [scx, FL + 0.08, scz], MAT.white, { cast: true, outline: 0.012 });
    box(g, [sw, stop - FL, 0.03], [scx, (FL + stop) / 2, sz0 + 0.015], MAT.white2);
    for (const sx of [sx0 + 0.015, sx1 - 0.015]) box(g, [0.03, stop - FL, sd], [sx, (FL + stop) / 2, scz], MAT.white2);
    box(g, [sw + 0.02, 0.04, sd + 0.02], [scx, stop, scz], MAT.gray);
    // printed side panel facing the east glass (kills the blank slab in east views)
    litPlane(g, 0.50, 0.92, [sx1 + 0.004, FL + 0.60, scz], canvasTexture(256, 470, (ctx, W, H) => {
      ctx.fillStyle = '#f7f2e6';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#1f6b45';
      ctx.fillRect(0, 0, W, H * 0.20);
      drawText(ctx, 'おにぎり', W / 2, H * 0.10, { size: 40, color: '#ffffff' });
      // rice ball
      ctx.fillStyle = '#fdfaf0';
      ctx.beginPath();
      ctx.moveTo(W * 0.5, H * 0.34);
      ctx.lineTo(W * 0.76, H * 0.62);
      ctx.lineTo(W * 0.24, H * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#22312a';
      ctx.fillRect(W * 0.40, H * 0.50, W * 0.20, H * 0.16);
      ctx.fillStyle = '#c8202a';
      drawText(ctx, '100円', W / 2, H * 0.76, { size: 56, color: '#c8202a' });
      ctx.fillStyle = '#1f6b45';
      ctx.fillRect(W * 0.12, H * 0.86, W * 0.76, H * 0.055);
      drawText(ctx, 'おにぎり 全種', W / 2, H * 0.905, { size: 26, color: '#ffffff' });
    }), { i: 0.5, ry: HALF_PI });
    // three shelf boards + lit back
    const rand2 = rng(83);
    const tri2 = [];
    for (let s = 0; s < 3; s++) {
      const yy = FL + 0.24 + s * 0.30;
      box(g, [sw - 0.06, 0.016, sd - 0.08], [scx, yy, scz], MAT.shelf);
      for (let i = 0; i < 3; i++) {
        tri2.push({
          p: [scx - 0.09 + i * 0.09, yy + 0.055, scz + 0.02],
          s: [0.038, 0.018, 0.038],
          r: [HALF_PI, (rand2() - 0.5) * 0.3, 0],
          c: [0xf7f2e0, 0xf0e6c8, 0xf7f2e0][i % 3],
        });
      }
    }
    inst(g, GEO.unitTri, MAT.product, tri2);
    litPlane(g, sw - 0.06, 0.12, [scx, stop, sz1 + 0.003], canvasTexture(256, 64, (ctx, W, H) => {
      ctx.fillStyle = '#1f6b45';
      ctx.fillRect(0, 0, W, H);
      drawText(ctx, 'おにぎり 120円', W / 2, H * 0.55, { size: 30, color: '#fff' });
    }), { i: 0.85 });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 6. PROMO TABLE near the entrance ("新発売" end-cap)
// ════════════════════════════════════════════════════════════════════════════
function buildPromoTable(g) {
  const x0 = -0.32, x1 = 0.30, z0 = 0.02, z1 = 0.54;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
  const topY = FL + 0.62;
  const promoBody = box(g, [w, topY - FL, d], [cx, FL + (topY - FL) / 2, cz], MAT.white2, { cast: true });
  addOutline(promoBody, 0.014);
  box(g, [w + 0.04, 0.05, d + 0.04], [cx, topY - 0.025, cz], MAT.counterTop);
  box(g, [w, 0.10, 0.02], [cx, FL + 0.05, z1 + 0.005], MAT.dark);
  // stacks of cup noodles on the table
  const rand = rng(97);
  const cups = [];
  for (let k = 0; k < 3; k++) {
    for (let hgt = 0; hgt < 2; hgt++) {
      cups.push({
        p: [x0 + 0.10 + k * 0.11, topY + 0.06 + hgt * 0.115, z0 + 0.18],
        s: [0.048, 0.11, 0.048],
        c: [0xe0453c, 0xf2a03c, 0xf5d94a, 0x3f7fc9][Math.floor(rand() * 4)],
      });
    }
  }
  inst(g, GEO.unitCyl, MAT.product, cups);
  // small warm snack warmer on the north end
  const wx = cx + 0.03, wz = z0 + d * 0.65, wy = topY;
  box(g, [0.34, 0.06, 0.26], [wx, wy + 0.03, wz], MAT.white);
  box(g, [0.34, 0.04, 0.26], [wx, wy + 0.27, wz], MAT.white);
  box(g, [0.30, 0.02, 0.22], [wx, wy + 0.20, wz], MAT.metal);
  litPlane(g, 0.28, 0.18, [wx, wy + 0.15, wz - 0.10], canvasTexture(32, 64, (ctx, W, H) => {
    ctx.fillStyle = '#ffdf9e';
    ctx.fillRect(0, 0, W, H);
  }), { i: 0.9 });
  plane(g, [0.32, 0.20], [wx, wy + 0.15, wz + 0.12], MAT.glass, { receive: false });
  box(g, [0.28, 0.018, 0.02], [wx, wy + 0.055, wz + 0.13], MAT.metalDark);
  // "新発売" flag on a stick
  const fh = 1.55;
  cylinder(g, 0.008, 0.008, fh - FL, [x1 - 0.04, FL + (fh - FL) / 2, z0 + 0.06], MAT.metalDark);
  label(g, 0.42, 0.24, (ctx, cw, ch) => {
    ctx.fillStyle = '#d7263d';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(0, 0, cw, ch * 0.12);
    drawText(ctx, '新発売', cw / 2, ch * 0.55, { size: ch * 0.46, color: '#ffffff' });
  }, [x1 - 0.04, fh - 0.12, z0 + 0.06], { px: 400, doubleSide: true, brightness: 1.0 });
}

// ════════════════════════════════════════════════════════════════════════════
// 7. BACK AREA — staff door, notice board, ATM (north-west wall)
// ════════════════════════════════════════════════════════════════════════════
function buildBackArea(g) {
  // metal staff door
  {
    const dx = -2.68, dw = 0.52, dz = -3.035, dh = 1.99;
    const door = box(g, [dw, dh, 0.035], [dx, FL + dh / 2, dz], MAT.metalDark, { cast: true });
    addOutline(door, 0.012);
    // frame
    box(g, [dw + 0.06, 0.04, 0.04], [dx, FL + dh + 0.02, dz], MAT.dark);
    box(g, [0.04, dh, 0.04], [dx - dw / 2 - 0.02, FL + dh / 2, dz], MAT.dark);
    box(g, [0.04, dh, 0.04], [dx + dw / 2 + 0.02, FL + dh / 2, dz], MAT.dark);
    // light leaking under the door
    box(g, [dw - 0.03, 0.012, 0.01], [dx, FL + 0.008, dz + 0.022], EMIT.warmSoft);
    // handle
    cylinder(g, 0.012, 0.012, 0.16, [dx + dw / 2 - 0.09, FL + 0.95, dz + 0.035], MAT.steel);
    box(g, [0.10, 0.02, 0.02], [dx + dw / 2 - 0.14, FL + 0.95, dz + 0.035], MAT.steel);
    // staff sign
    label(g, 0.34, 0.17, (ctx, cw, ch) => {
      ctx.fillStyle = '#efe9dc';
      ctx.fillRect(0, 0, cw, ch);
      drawText(ctx, 'STAFF ONLY', cw / 2, ch * 0.3, { size: ch * 0.22, color: '#1f242a', font: FONT.en });
      drawText(ctx, '関係者以外立入禁止', cw / 2, ch * 0.72, { size: ch * 0.19, color: '#1f242a' });
    }, [dx, FL + 1.45, dz + 0.021], { px: 700, brightness: 0.9 });
    // emergency exit sign above
    litPlane(g, 0.36, 0.18, [dx, FL + 2.06, dz + 0.02], texExit(), { i: 1.15 });
    glow(g, 0x63e0c0, 0.7, [dx, FL + 2.06, dz + 0.12], { opacity: 0.18 });
  }

  // notice board
  {
    const nx = -2.05, ny = 1.62, nz = -3.03;
    box(g, [0.66, 0.82, 0.025], [nx, ny, nz], MAT.wood);
    printPlane(g, 0.60, 0.76, [nx, ny, nz + 0.015], texNotice(), {});
  }

  // ATM
  {
    const ax = -1.42, az = -2.80, aw = 0.44, ad = 0.42, ah = 1.42;
    const atm = box(g, [aw, ah, ad], [ax, FL + ah / 2, az], MAT.white2, { cast: true });
    addOutline(atm, 0.014);
    box(g, [aw + 0.03, 0.05, ad + 0.03], [ax, FL + ah + 0.02, az], MAT.gray);
    // front panel faces the window (+z)
    printPlane(g, aw - 0.05, ah - 0.28, [ax, FL + ah / 2 + 0.06, az + ad / 2 + 0.003], texAtm(), {});
    // glowing ATM sign
    label(g, 0.36, 0.14, (ctx, cw, ch) => {
      ctx.fillStyle = '#1c5f8f';
      ctx.fillRect(0, 0, cw, ch);
      drawText(ctx, 'ATM', cw / 2, ch * 0.55, { size: ch * 0.66, color: '#d6f2ff', font: FONT.en });
    }, [ax, FL + ah + 0.14, az + ad / 2 + 0.003], { px: 500, brightness: 1.0 });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 8. CEILING — light panels, vents, cameras, speakers
// ════════════════════════════════════════════════════════════════════════════
function buildCeiling(g) {
  // 2 x 4 recessed light panels
  const panels = [];
  for (const pz of [-2.20, -0.90]) {
    for (const px of [-2.30, -1.05, 0.35, 1.75]) {
      panels.push({ p: [px, CEIL - 0.035, pz], s: [0.50, 0.05, 1.05] });
    }
  }
  inst(g, GEO.unitBox, EMIT.panel, panels);
  // thin warm light trough along the window side
  box(g, [3.0, 0.03, 0.10], [-1.30, CEIL - 0.06, 0.42], EMIT.warmSoft);

  // ── warm ceiling wash ─────────────────────────────────────────────────────
  // The store shell's ceiling is only lit from above, so from inside it reads
  // near-black. One big soft self-lit plane (just under it) makes the whole
  // room feel lit from the ceiling — cheap (1 draw call) and bloom-safe.
  const ceilTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#fff4e2';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(178,166,146,0.30)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,252,244,0.5)';
    ctx.fillRect(w * 0.5 - 2, 0, 4, h);
  }, { wrap: true, repeat: [7, 4] });
  const washMat = M.emit(0xfff0d8, { map: ceilTex, intensity: 0.46 });
  const wash = plane(g, [5.4, 3.6], [-0.30, CEIL - 0.004, -1.10], washMat, { rx: HALF_PI, receive: false });
  wash.renderOrder = 1;

  // air vents with slats
  const vents = [];
  const slats = [];
  for (const p of [[-1.65, -2.62], [0.35, -1.30], [1.85, -0.15]]) {
    vents.push({ p: [p[0], CEIL - 0.03, p[1]], s: [0.62, 0.05, 0.30] });
    for (let i = 0; i < 4; i++) {
      slats.push({ p: [p[0], CEIL - 0.062, p[1] - 0.10 + i * 0.066], s: [0.54, 0.012, 0.026] });
    }
  }
  inst(g, GEO.unitBox, MAT.gray2, vents);
  inst(g, GEO.unitBox, MAT.dark, slats);

  // ceiling speakers
  inst(g, GEO.unitCyl, MAT.white, [
    { p: [-0.60, CEIL - 0.035, -0.35], s: [0.10, 0.05, 0.10] },
    { p: [0.90, CEIL - 0.035, -2.10], s: [0.10, 0.05, 0.10] },
  ]);

  // surveillance cameras
  const camBody = [], camArm = [], camLens = [];
  for (const p of [[2.10, 0.42, -0.6], [-2.55, -2.90, 0.35]]) {
    camArm.push({ p: [p[0], CEIL - 0.12, p[1]], s: [0.035, 0.16, 0.035] });
    camBody.push({ p: [p[0], CEIL - 0.20, p[1]], s: [0.11, 0.09, 0.11] });
    camLens.push({ p: [p[0], CEIL - 0.25, p[1]], s: [0.05, 0.03, 0.05] });
  }
  inst(g, GEO.unitCyl, MAT.metalDark, camArm);
  inst(g, GEO.unitSphere, MAT.white2, camBody);
  inst(g, GEO.unitCyl, MAT.darker, camLens);
}

// ════════════════════════════════════════════════════════════════════════════
// 9. WINDOW SIGNS / HANGING POP — lightboxes read from the street
// ════════════════════════════════════════════════════════════════════════════
function buildWindowSigns(g) {
  const swayers = [];

  // 1) からあげ 100円 — hanging POP just inside the south glass
  {
    const grp = new THREE.Group();
    grp.position.set(-1.15, 1.78, -0.05);
    g.add(grp);
    label(grp, 0.94, 0.34, (ctx, cw, ch) => {
      ctx.fillStyle = '#f7c948';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#c8202a';
      ctx.fillRect(0, 0, cw, ch * 0.13);
      drawText(ctx, 'からあげ', cw * 0.30, ch * 0.56, { size: ch * 0.42, color: '#b01c1c' });
      drawText(ctx, '100円', cw * 0.74, ch * 0.56, { size: ch * 0.44, color: '#111' });
    }, [0, 0, 0], { px: 500, doubleSide: true, brightness: 1.0 });
    // strings
    const ss = [];
    for (const sx of [-0.36, 0.36]) ss.push({ p: [sx, 0.44, 0], s: [0.006, 0.55, 0.006] });
    inst(grp, GEO.unitCyl, MAT.dark, ss);
    swayers.push(grp);
    glow(g, 0xffcf92, 0.9, [-1.15, 1.70, 0.06], { opacity: 0.14 });
  }

  // 2) コーヒー 200円 — on the inside of the east glass
  {
    const tex = texBanner('coffee');
    litPlane(g, 0.82, 0.56, [2.432, 1.62, -1.48], tex, { ry: HALF_PI, i: 0.7 });
    box(g, [0.02, 0.62, 0.88], [2.445, 1.62, -1.48], MAT.white2);
    glow(g, 0xffe6bd, 0.9, [2.40, 1.60, -1.48], { opacity: 0.13 });
  }

  // 3) おでん 150円 — above the magazine rack on the south window
  {
    const tex = texBanner('oden');
    litPlane(g, 0.86, 0.42, [-2.05, 1.47, 0.838], tex, { i: 0.65 });
    box(g, [0.92, 0.48, 0.016], [-2.05, 1.47, 0.848], MAT.white2);
  }

  // 4) たばこ — east window, near the cigarette wall
  {
    const tex = texBanner('tabako');
    litPlane(g, 0.62, 0.40, [2.432, 1.62, -2.55], tex, { ry: HALF_PI, i: 0.75 });
  }

  // 5) 新発売 — hanging POP over the centre aisle
  {
    const grp = new THREE.Group();
    grp.position.set(-0.42, 1.66, -1.30);
    g.add(grp);
    label(grp, 0.62, 0.26, (ctx, cw, ch) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#d7263d';
      ctx.fillRect(0, 0, cw * 0.24, ch);
      drawText(ctx, '新', cw * 0.12, ch * 0.55, { size: ch * 0.6, color: '#fff' });
      drawText(ctx, '発売中', cw * 0.60, ch * 0.55, { size: ch * 0.44, color: '#c8202a' });
    }, [0, 0, 0], { px: 500, doubleSide: true, brightness: 1.0 });
    const ss = [];
    for (const sx of [-0.22, 0.22]) ss.push({ p: [sx, 0.38, 0], s: [0.006, 0.62, 0.006] });
    inst(grp, GEO.unitCyl, MAT.dark, ss);
    swayers.push(grp);
  }

  // store the sway groups for the animation hook
  g.userData.swayers = swayers;
}

// ════════════════════════════════════════════════════════════════════════════
// 10. FLOOR GUIDES — entrance mat, queue feet, レジ arrow stickers
// ════════════════════════════════════════════════════════════════════════════
function buildFloorGuides(g) {
  // inside entrance mat (rotated to sit in front of the chamfered door)
  const matG = box(g, [0.90, 0.014, 0.60], [1.66, FL + 0.007, 0.09], MAT.mat, { ry: 0.748 });
  matG.castShadow = false;
  // floor sticker: レジはこちら (text reads from the entrance, arrow points north)
  printPlane(g, 0.95, 0.63, [1.00, FL + 0.004, -0.78], texArrow(), { rx: -HALF_PI, rz: Math.PI, transparent: true });
  // queue footprints leading to the counter
  const feet = [];
  const pathPts = [[1.22, -0.55], [1.04, -1.02], [0.94, -1.50], [0.94, -1.98]];
  for (const p of pathPts) {
    for (let k = 0; k < 2; k++) {
      feet.push({ p: [p[0] + (k - 0.5) * 0.13, FL + 0.004, p[1] + k * 0.14], s: [0.30, 0.30, 1], r: [-HALF_PI, 0, 0] });
    }
  }
  const footMat = M.toon(0xffffff, { map: texFoot(), transparent: true, side: THREE.DoubleSide });
  inst(g, GEO.unitPlane, footMat, feet);

  // warm light pools on the floor (fake bounce)
  groundSmear(g, 0xffc98a, 2.4, 1.0, [0.60, FL + 0.012, -2.30], { opacity: 0.12 });
  groundSmear(g, 0xffc98a, 1.4, 1.4, [-1.10, FL + 0.012, -1.20], { opacity: 0.10 });
  groundSmear(g, 0xffc98a, 1.2, 1.2, [1.30, FL + 0.012, -0.35], { opacity: 0.09 });
  groundSmear(g, 0xffc98a, 1.0, 1.6, [-2.30, FL + 0.012, 0.30], { opacity: 0.08 });
}

// ════════════════════════════════════════════════════════════════════════════
// 11. LIGHTS — 4 warm point lights (the only lights in the store)
// ════════════════════════════════════════════════════════════════════════════
function buildLights(g) {
  const warm = 0xffd9a8;
  const specs = [
    { p: [-1.35, 2.04, -0.60], i: 3.2, d: 5.2 },
    { p: [0.85, 2.04, -1.95], i: 3.2, d: 5.2 },
    { p: [2.00, 1.98, 0.10], i: 2.4, d: 4.8 },
    { p: [-1.95, 2.02, 0.35], i: 2.4, d: 4.8 },
  ];
  for (const s of specs) {
    const l = new THREE.PointLight(warm, s.i, s.d, 2);
    l.position.set(s.p[0], s.p[1], s.p[2]);
    l.castShadow = false;
    g.add(l);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 12. ANIMATION — steam, swaying POP, one tired fluorescent tube
// ════════════════════════════════════════════════════════════════════════════
function buildAnimation(g) {
  const steam = [];
  g.traverse((o) => {
    if (o.isSprite && o.userData.steam) steam.push(o);
  });
  const swayers = g.userData.swayers || [];
  let t = 0;
  g.userData.update = (time, dt) => {
    t = time;
    for (const s of steam) {
      const st = s.userData.steam;
      const ph = (time * 0.44 + st.phase) % 1;
      s.position.y = st.base + ph * st.amp;
      s.material.opacity = 0.16 * (1 - ph) * Math.min(1, ph * 6);
      s.scale.setScalar(0.34 + ph * 0.5);
    }
    for (const sw of swayers) {
      sw.rotation.z = Math.sin(time * 0.9 + sw.position.x * 2.3) * 0.022;
      sw.rotation.x = Math.sin(time * 0.7 + sw.position.z * 3.1) * 0.014;
    }
  };
}

// ════════════════════════════════════════════════════════════════════════════
// buildInterior
// ════════════════════════════════════════════════════════════════════════════
export function buildInterior() {
  const g = new THREE.Group();
  g.name = 'interior';

  buildFloorGuides(g);
  buildDrinkCoolers(g);
  buildIslands(g);
  buildMagazineRack(g);
  buildCheckout(g);
  buildBentoZone(g);
  buildPromoTable(g);
  buildBackArea(g);
  buildCeiling(g);
  buildWindowSigns(g);
  buildLights(g);
  buildAnimation(g);

  return g;
}


