// ─────────────────────────────────────────────────────────────────────────────
// buildings.js — 后方楼 / 左侧楼 / 屋顶设备 / 小巷氛围
//
//   · 后方楼 (x -6..2.6, z -6..-4.4, h 3.95): 屋面 + 女儿墙 + 水塔 / 楼梯间 /
//     天线 / 卫星锅 / 屋顶空调 / 晾衣杆 / 屋顶广告牌；南立面只露 3.1 以上一条，
//     所以重点在上部窗带与屋顶剪影；东立面整面可见（卷帘门 + 灯箱 + 外机）。
//   · 左侧楼 (x -6..-4.9, z -4.4..1.0, h 3.55): 南端山墙面（画面左边缘）+ 巷内
//     东墙（管道 / 电表 / 壁挂空调 / 防盗灯 / 海报）。
//   · 小巷 x -4.9..-3.2: 后墙铁门 + 昏黄小灯 + 居酒屋竖招牌 + 地面杂物。
//
//   地面：人行道 y=0.12；小巷地面由 street.js 做成 y=0.10（杂物按 0.10 落位）。
//   主体块从 y=0 起（被地面盖住的部分无所谓），可见细节全部 ≥ 0.12。
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import {
  Y, FONT, M, OUTLINE, LAYOUT,
  mesh, box, plane, cylinder, sphere, group as newGroup,
  glow, groundSmear, canvasTexture, addOutline, rng,
  drawText, drawVerticalText, roundRect,
} from './core.js';

const Y0 = Y.sidewalk;                  // 0.12 人行道面
const FB = Y0;                          // 立面贴图起始高度 = 人行道面
const BB = LAYOUT.backBuilding;
const LB = LAYOUT.leftBuilding;
const BB_TOP = Y0 + BB.h;               // 4.07
const LB_TOP = Y0 + LB.h;               // 3.67
const PAR = 0.25;                       // 女儿墙高
const BB_PAR = BB_TOP + PAR;            // 4.32
const LB_PAR = LB_TOP + PAR;            // 3.92
const BB_ROOF = BB_TOP + 0.06;           // 屋面
const LB_ROOF = LB_TOP + 0.06;
const ALLEY_FLOOR = 0.10;               // street.js 的巷子地面
const JP = FONT.jp;

// ═════════════════════════════════════════════════════════════════════════════
// 0 · 纹理绘制工具（纯函数，canvas 坐标系以 left→right / top→bottom 为准）
// ═════════════════════════════════════════════════════════════════════════════

function mapper(x0, x1, yB, yT, W, H) {
  const w = x1 - x0, h = yT - yB;
  return {
    x0, x1, yB, yT, w, h, W, H,
    u: (x) => ((x - x0) / w) * W,
    v: (y) => ((yT - y) / h) * H,
    mx: (m) => (m / w) * W,
    my: (m) => (m / h) * H,
  };
}

/** 底色渐变 + 面砖分格 + 雨痕 + 底部污渍/苔 + 修补块 + 裂纹。 */
function paintBase(ctx, W, H, o) {
  const m = mapper(o.x0, o.x1, o.yB, o.yT, W, H);
  const R = rng(o.seed || 9);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, o.top);
  g.addColorStop(0.52, o.mid || o.top);
  g.addColorStop(1, o.bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 面砖分格（水平）
  if (o.band) {
    ctx.strokeStyle = 'rgba(9,12,16,0.34)';
    ctx.lineWidth = Math.max(1, m.my(0.012));
    for (let y = o.yB + o.band; y < o.yT - 0.03; y += o.band) {
      const py = m.v(y);
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
    }
  }
  // 竖向砖缝
  if (o.joint) {
    ctx.strokeStyle = 'rgba(9,12,16,0.20)';
    ctx.lineWidth = Math.max(1, m.mx(0.009));
    for (let x = o.x0 + (o.jointOff || 0.2); x < o.x1; x += o.joint) {
      const px = m.u(x);
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
    }
  }
  // 雨痕（上深下浅）
  const ns = o.streaks ?? 26;
  for (let i = 0; i < ns; i++) {
    const x = R() * W;
    const w0 = (0.012 + R() * 0.055) * m.mx(1);
    const y0 = R() * H * 0.72;
    const h0 = H * (0.08 + R() * 0.42);
    const gg = ctx.createLinearGradient(0, y0, 0, y0 + h0);
    gg.addColorStop(0, `rgba(7,9,13,${0.045 + R() * 0.075})`);
    gg.addColorStop(1, 'rgba(7,9,13,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(x, y0, w0, h0);
  }
  // 底部潮气
  const gb = ctx.createLinearGradient(0, H * 0.58, 0, H);
  gb.addColorStop(0, 'rgba(4,6,8,0)');
  gb.addColorStop(1, 'rgba(4,7,9,0.5)');
  ctx.fillStyle = gb;
  ctx.fillRect(0, H * 0.58, W, H * 0.42);
  // 苔 / 水渍
  for (let i = 0; i < 15; i++) {
    ctx.fillStyle = `rgba(28,44,32,${0.035 + R() * 0.085})`;
    ctx.beginPath();
    ctx.ellipse(R() * W, H - R() * H * 0.2, (0.05 + R() * 0.22) * m.mx(1), (0.02 + R() * 0.055) * m.my(1), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 修补的色块
  for (let i = 0; i < (o.patches ?? 4); i++) {
    ctx.fillStyle = `rgba(${(68 + R() * 46) | 0},${(70 + R() * 46) | 0},${(78 + R() * 46) | 0},0.045)`;
    ctx.fillRect(R() * W, R() * H, (0.2 + R() * 0.8) * m.mx(1), (0.15 + R() * 0.5) * m.my(1));
  }
  // 裂纹
  ctx.strokeStyle = 'rgba(6,8,11,0.24)';
  ctx.lineWidth = Math.max(1, m.mx(0.006));
  for (let i = 0; i < (o.cracks ?? 5); i++) {
    let x = R() * W, y = R() * H;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (R() - 0.5) * W * 0.07;
      y += R() * H * 0.06;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // 夜空/天光反射（顶部提亮，避免整面掉进死黑）
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  sky.addColorStop(0, 'rgba(150,175,218,0.13)');
  sky.addColorStop(0.55, 'rgba(150,175,218,0.03)');
  sky.addColorStop(1, 'rgba(150,175,218,0)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.55);
  return m;
}

/** 直接画在墙上的窗（远景 / 背面立面用，省掉几何）。 */
function paintWindow2D(ctx, m, x, y, w, h, o = {}) {
  const px = m.u(x - w / 2), py = m.v(y + h / 2);
  const W2 = m.mx(w), H2 = m.my(h);
  ctx.fillStyle = 'rgba(4,6,9,0.5)';
  ctx.fillRect(px - m.mx(0.018), py - m.my(0.018), W2 + m.mx(0.036), H2 + m.my(0.036));
  ctx.fillStyle = o.frame || 'rgba(146,150,156,0.5)';
  ctx.fillRect(px, py, W2, H2);
  if (o.lit) {
    const g = ctx.createLinearGradient(px, py, px, py + H2);
    g.addColorStop(0, o.lit === 'cold' ? 'rgba(150,190,225,0.9)' : 'rgba(255,232,186,0.95)');
    g.addColorStop(1, o.lit === 'cold' ? 'rgba(70,100,135,0.8)' : 'rgba(205,160,100,0.75)');
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = o.bg || '#10161e';
  }
  ctx.fillRect(px + W2 * 0.08, py + H2 * 0.08, W2 * 0.84, H2 * 0.84);
  if (o.blind) {
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = 'rgba(200,212,225,0.34)';
      ctx.fillRect(px + W2 * 0.1, py + H2 * (0.12 + i * 0.085), W2 * 0.8, Math.max(1, H2 * 0.038));
    }
  }
  // 竖挺 / 横挺
  ctx.fillStyle = 'rgba(22,26,31,0.85)';
  ctx.fillRect(px + W2 * 0.475, py + H2 * 0.08, Math.max(1, W2 * 0.05), H2 * 0.84);
  ctx.fillRect(px + W2 * 0.08, py + H2 * 0.44, W2 * 0.84, Math.max(1, H2 * 0.045));
  // 窗台 + 下方水痕
  ctx.fillStyle = 'rgba(170,174,180,0.3)';
  ctx.fillRect(px - m.mx(0.03), py + H2, W2 + m.mx(0.06), Math.max(1, m.my(0.03)));
  const g2 = ctx.createLinearGradient(0, py + H2, 0, py + H2 + m.my(0.4));
  g2.addColorStop(0, 'rgba(6,8,11,0.3)');
  g2.addColorStop(1, 'rgba(6,8,11,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(px - m.mx(0.05), py + H2, W2 + m.mx(0.1), m.my(0.4));
}

/** 底部瓷砖墙裙。 */
function paintTiles(ctx, m, yTop, o = {}) {
  const py0 = m.v(yTop), py1 = m.v(o.yB ?? m.yB);
  ctx.fillStyle = o.col || 'rgba(34,38,43,0.94)';
  ctx.fillRect(0, py0, m.W, py1 - py0);
  ctx.strokeStyle = 'rgba(10,13,17,0.5)';
  ctx.lineWidth = Math.max(1, m.mx(0.007));
  const step = o.step || 0.21;
  for (let y = (o.yB ?? m.yB) + step; y < yTop; y += step) {
    const py = m.v(y);
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(m.W, py); ctx.stroke();
  }
  const vstep = o.vstep || 0.44;
  for (let x = m.x0 + (o.off || 0.3); x < m.x1; x += vstep) {
    const px = m.u(x);
    ctx.beginPath(); ctx.moveTo(px, py0); ctx.lineTo(px, py1); ctx.stroke();
  }
  // 顶部压边
  ctx.fillStyle = 'rgba(10,13,17,0.45)';
  ctx.fillRect(0, m.v(yTop + 0.04), m.W, Math.max(1, m.my(0.04)));
  // 潮气
  const g = ctx.createLinearGradient(0, py0, 0, py1);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(3,6,8,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, py0, m.W, py1 - py0);
}

/** 一张贴在墙上的小海报 / 贴纸（画布像素空间）。 */
function paintPoster(ctx, m, x, y, w, h, o = {}) {
  ctx.save();
  const px = m.u(x), py = m.v(y + h);
  ctx.translate(px, py);
  ctx.rotate(o.rot || 0);
  const W2 = m.mx(w), H2 = m.my(h);
  ctx.fillStyle = o.bg || '#cfc4a8';
  ctx.fillRect(0, 0, W2, H2);
  ctx.fillStyle = 'rgba(20,18,16,0.22)';
  ctx.fillRect(0, 0, W2, Math.max(1, H2 * 0.06));
  ctx.fillStyle = o.ink || 'rgba(36,30,26,0.78)';
  const lines = o.lines || 4;
  for (let i = 0; i < lines; i++) {
    ctx.fillRect(W2 * 0.12, H2 * (0.2 + i * 0.16), W2 * (0.48 + (i % 2) * 0.26), Math.max(1, H2 * 0.055));
  }
  if (o.seal) {
    ctx.fillStyle = o.seal;
    ctx.fillRect(W2 * 0.64, H2 * 0.6, W2 * 0.22, W2 * 0.22);
  }
  // 卷边 / 破角
  ctx.fillStyle = 'rgba(8,10,12,0.35)';
  ctx.beginPath();
  ctx.moveTo(W2, H2);
  ctx.lineTo(W2 - W2 * 0.2, H2);
  ctx.lineTo(W2, H2 - H2 * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── 各方立面 ────────────────────────────────────────────────────────────────

/** 后方楼南立面（world x -3.2..2.6）——只有 3.1 以上一条会露出来。 */
function drawBBsouth(ctx, W, H) {
  const m = paintBase(ctx, W, H, {
    x0: -3.2, x1: 2.6, yB: FB, yT: BB_TOP,
    top: '#3e4550', mid: '#343b46', bot: '#242a33',
    band: 0.5, joint: 0.95, streaks: 30, patches: 6, seed: 31,
  });
  // 檐口 / 窗下分格带
  ctx.fillStyle = 'rgba(15,19,24,0.55)';
  ctx.fillRect(0, m.v(3.36), W, Math.max(2, m.my(0.09)));
  ctx.fillStyle = 'rgba(15,19,24,0.32)';
  ctx.fillRect(0, m.v(3.9), W, Math.max(1, m.my(0.05)));
  // 上部旧招牌白漆残影
  ctx.fillStyle = 'rgba(196,198,184,0.075)';
  ctx.fillRect(m.u(-2.95), m.v(3.8), m.mx(1.9), m.my(0.3));
  ctx.fillStyle = 'rgba(196,198,184,0.05)';
  ctx.fillRect(m.u(0.4), m.v(3.82), m.mx(1.2), m.my(0.22));
  // 窗间壁的竖向脏痕
  for (let i = 0; i < 10; i++) {
    const x = -2.9 + i * 0.55;
    ctx.fillStyle = 'rgba(8,10,14,0.12)';
    ctx.fillRect(m.u(x), m.v(3.2), m.mx(0.05), m.my(0.25));
  }
  // ── 一层店铺痕迹（被便利店挡住，仍然画上） ──
  const sy0 = m.v(2.02), sy1 = m.v(FB);
  ctx.fillStyle = '#272b30';
  ctx.fillRect(m.u(-1.5), sy0, m.mx(2.6), sy1 - sy0);
  ctx.strokeStyle = 'rgba(9,11,15,0.55)';
  ctx.lineWidth = Math.max(1, m.my(0.012));
  for (let y = FB + 0.08; y < 2.0; y += 0.1) {
    const py = m.v(y);
    ctx.beginPath(); ctx.moveTo(m.u(-1.5), py); ctx.lineTo(m.u(1.1), py); ctx.stroke();
  }
  // 卷帘门上的旧贴纸
  ctx.fillStyle = 'rgba(190,80,60,0.5)';
  ctx.fillRect(m.u(-0.3), m.v(1.5), m.mx(0.35), m.my(0.22));
  ctx.fillStyle = 'rgba(200,200,180,0.35)';
  ctx.fillRect(m.u(0.5), m.v(1.6), m.mx(0.4), m.my(0.16));
  // 自动门洞（黑洞 + 一点冷光）
  const dx = m.u(1.3);
  ctx.fillStyle = '#080d10';
  ctx.fillRect(dx, m.v(2.12), m.mx(0.95), m.v(FB) - m.v(2.12));
  ctx.fillStyle = 'rgba(110,190,180,0.10)';
  ctx.fillRect(dx + m.mx(0.08), m.v(2.0), m.mx(0.8), m.my(0.4));
  // 门洞上沿的灯箱残影
  ctx.fillStyle = 'rgba(240,225,190,0.10)';
  ctx.fillRect(m.u(1.28), m.v(2.42), m.mx(1.0), m.my(0.2));
}

/** 后方楼南立面的巷口段 + 左右隐藏段（world x -6..-3.2）。 */
function drawBBalley(ctx, W, H) {
  const m = paintBase(ctx, W, H, {
    x0: -4.9, x1: -3.2, yB: FB, yT: BB_TOP,
    top: '#3b424c', mid: '#31373f', bot: '#222831',
    band: 0.48, joint: 0.9, streaks: 26, patches: 5, seed: 47,
  });
  paintTiles(ctx, m, 1.12, { yB: FB, col: 'rgba(35,39,43,0.95)', step: 0.2, vstep: 0.42 });
  // 铁门周围的脏污
  const g = ctx.createLinearGradient(m.u(-4.75), 0, m.u(-3.4), 0);
  g.addColorStop(0, 'rgba(6,9,11,0)');
  g.addColorStop(0.5, 'rgba(6,9,11,0.4)');
  g.addColorStop(1, 'rgba(6,9,11,0)');
  ctx.fillStyle = g;
  ctx.fillRect(m.u(-4.75), m.v(2.4), m.mx(1.35), m.v(FB) - m.v(2.4));
  // 门上方的雨檐阴影
  ctx.fillStyle = 'rgba(5,8,10,0.4)';
  ctx.fillRect(m.u(-4.8), m.v(2.5), m.mx(1.2), m.my(0.12));
  // 旧手写招牌（褪色）
  ctx.save();
  ctx.globalAlpha = 0.30;
  drawText(ctx, '田中商店', m.u(-4.55), m.v(3.02), { size: Math.max(10, m.mx(0.34)), color: '#e6ddc4', font: JP });
  drawText(ctx, '酒・たばこ', m.u(-4.55), m.v(2.74), { size: Math.max(7, m.mx(0.17)), color: '#d8cfb8', font: JP });
  ctx.restore();
  // 海报 / 贴纸（左侧墙根）
  paintPoster(ctx, m, -4.86, 1.28, 0.34, 0.46, { bg: '#d3c9ad', rot: -0.03, seal: 'rgba(170,40,30,0.75)' });
  paintPoster(ctx, m, -4.83, 1.82, 0.26, 0.34, { bg: '#c8bfa4', rot: 0.05 });
  paintPoster(ctx, m, -4.86, 2.06, 0.22, 0.3, { bg: '#dcd2b8', rot: -0.06, seal: 'rgba(150,40,30,0.7)' });
  // 地面水滴溅起的暗痕
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = `rgba(4,7,9,${0.1 + i * 0.02})`;
    ctx.beginPath();
    ctx.ellipse(m.u(-4.85 + i * 0.2), m.v(0.18 + i * 0.03), m.mx(0.1), m.my(0.06), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 后方楼东立面（local x: 0 = z -4.4 南端, 1.6 = z -6 北端）。 */
function drawBBeast(ctx, W, H) {
  const m = paintBase(ctx, W, H, {
    x0: 0, x1: 1.6, yB: FB, yT: BB_TOP,
    top: '#3f4651', mid: '#343b46', bot: '#252b34',
    band: 0.52, joint: 0.85, streaks: 18, patches: 4, seed: 61,
  });
  paintTiles(ctx, m, 1.06, { yB: FB, col: 'rgba(36,40,44,0.95)', step: 0.2, vstep: 0.4 });
  // 卷帘门（local x 0.3..1.3 → z -4.7..-5.7）
  const sx = m.u(0.32), sw = m.mx(0.96);
  const sy0 = m.v(1.86), sy1 = m.v(FB);
  ctx.fillStyle = '#2f3338';
  ctx.fillRect(sx, sy0, sw, sy1 - sy0);
  ctx.strokeStyle = 'rgba(10,12,16,0.6)';
  ctx.lineWidth = Math.max(1, m.my(0.01));
  for (let y = FB + 0.06; y < 1.84; y += 0.085) {
    const py = m.v(y);
    ctx.beginPath(); ctx.moveTo(sx, py); ctx.lineTo(sx + sw, py); ctx.stroke();
  }
  // 卷帘门上的旧贴纸 + 锈
  ctx.fillStyle = 'rgba(176,86,52,0.45)';
  ctx.fillRect(sx + sw * 0.1, m.v(1.3), sw * 0.24, m.my(0.2));
  ctx.fillStyle = 'rgba(206,200,176,0.4)';
  ctx.fillRect(sx + sw * 0.55, m.v(1.45), sw * 0.3, m.my(0.16));
  ctx.fillStyle = 'rgba(150,70,44,0.3)';
  ctx.fillRect(sx + sw * 0.6, m.v(0.7), sw * 0.35, m.my(0.5));
  // 二层小招牌残影
  ctx.fillStyle = 'rgba(230,222,196,0.10)';
  ctx.fillRect(m.u(0.18), m.v(2.72), m.mx(1.1), m.my(0.24));
  // 墙角管线阴影
  ctx.fillStyle = 'rgba(8,10,14,0.3)';
  ctx.fillRect(m.u(1.44), 0, Math.max(2, m.mx(0.05)), H);
  ctx.fillRect(0, 0, Math.max(2, m.mx(0.05)), H);
}

/** 左楼南端山墙面（world x -6..-4.9，面向相机左边缘）。 */
function drawLBsouth(ctx, W, H) {
  const m = paintBase(ctx, W, H, {
    x0: -6, x1: -4.9, yB: FB, yT: LB_TOP,
    top: '#413d36', mid: '#332f2a', bot: '#221f1c',
    band: 0.44, joint: 0.55, streaks: 16, patches: 4, seed: 83,
  });
  paintTiles(ctx, m, 0.98, { yB: FB, col: 'rgba(34,34,32,0.95)', step: 0.19, vstep: 0.3 });
  // 一层旧木拉门（在公告栏下沿以下，< 1.0）
  ctx.fillStyle = '#332c25';
  ctx.fillRect(m.u(-5.9), m.v(0.96), m.mx(0.82), m.v(FB) - m.v(0.96));
  ctx.strokeStyle = 'rgba(12,10,8,0.6)';
  ctx.lineWidth = Math.max(1, m.mx(0.012));
  for (let i = 1; i < 4; i++) {
    const px = m.u(-5.9 + (0.82 / 4) * i);
    ctx.beginPath(); ctx.moveTo(px, m.v(0.96)); ctx.lineTo(px, m.v(FB)); ctx.stroke();
  }
  // 公告栏区域 (y 1.0~1.9) 只留最淡的底纹，保持平整
  ctx.fillStyle = 'rgba(255,255,255,0.012)';
  ctx.fillRect(0, m.v(1.9), W, m.v(1.0) - m.v(1.9));
  // 上部楼层线
  ctx.fillStyle = 'rgba(14,16,18,0.4)';
  ctx.fillRect(0, m.v(3.2), W, Math.max(1, m.my(0.05)));
  ctx.fillRect(0, m.v(3.56), W, Math.max(1, m.my(0.05)));
  // 檐下阴影
  const g = ctx.createLinearGradient(0, m.v(3.6), 0, m.v(3.1));
  g.addColorStop(0, 'rgba(4,6,8,0.5)');
  g.addColorStop(1, 'rgba(4,6,8,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, m.v(3.6), W, m.v(3.1) - m.v(3.6));
  // 旧招牌残字（左侧）
  ctx.save();
  ctx.globalAlpha = 0.2;
  drawText(ctx, '小料理', m.u(-5.72), m.v(2.95), { size: Math.max(9, m.mx(0.2)), color: '#e8dfc8', font: JP });
  ctx.restore();
  // 落水管水痕
  ctx.fillStyle = 'rgba(6,9,11,0.28)';
  ctx.fillRect(m.u(-5.0), 0, Math.max(2, m.mx(0.06)), H);
}

/** 左楼巷内东墙（local x: 0 = z 1.0 巷口, 5.4 = z -4.4 巷底）。 */
function drawLBeast(ctx, W, H) {
  const m = paintBase(ctx, W, H, {
    x0: 0, x1: 5.4, yB: FB, yT: LB_TOP,
    top: '#443f37', mid: '#363229', bot: '#232019',
    band: 0.46, joint: 0.9, streaks: 30, patches: 5, seed: 97,
  });
  paintTiles(ctx, m, 1.08, { yB: FB, col: 'rgba(33,35,34,0.95)', step: 0.19, vstep: 0.42 });
  // 巷口附近的海报（相机默认能看到这一段）
  paintPoster(ctx, m, 0.55, 1.42, 0.3, 0.42, { bg: '#d6cbae', rot: 0.03, seal: 'rgba(160,44,32,0.8)' });
  paintPoster(ctx, m, 0.92, 1.55, 0.24, 0.32, { bg: '#c9c0a4', rot: -0.04 });
  paintPoster(ctx, m, 0.62, 1.98, 0.26, 0.3, { bg: '#ded3b6', rot: 0.02, seal: 'rgba(140,40,30,0.7)' });
  // 中段旧油漆字
  ctx.save();
  ctx.globalAlpha = 0.26;
  drawText(ctx, '酒処 やまだ', m.u(2.4), m.v(2.5), { size: Math.max(10, m.mx(0.28)), color: '#efe6cc', font: JP, letterSpacing: m.mx(0.02) });
  ctx.globalAlpha = 0.16;
  drawText(ctx, 'たばこ', m.u(4.05), m.v(1.86), { size: Math.max(8, m.mx(0.2)), color: '#e6dcc2', font: JP });
  ctx.restore();
  // 里段（巷底）更脏
  const g = ctx.createLinearGradient(m.u(3.2), 0, m.u(5.4), 0);
  g.addColorStop(0, 'rgba(5,7,9,0)');
  g.addColorStop(1, 'rgba(5,7,9,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(m.u(3.2), 0, m.u(5.4) - m.u(3.2), H);
  // 水平管道下方的脏 // 竖向线管
  ctx.fillStyle = 'rgba(6,8,11,0.22)';
  ctx.fillRect(m.u(1.0), 0, Math.max(1, m.mx(0.05)), H);
  ctx.fillRect(m.u(3.5), 0, Math.max(1, m.mx(0.05)), H);
  // 壁挂空调下方的墙污
  ctx.fillStyle = 'rgba(5,7,9,0.3)';
  ctx.fillRect(m.u(2.5), m.v(0.85), m.mx(0.7), m.v(0.3) - m.v(0.85));
}

/** 后方楼北立面（world x -6..2.6，面向 z=-6；此面贴底座边界，只能画不能挂东西）。 */
function drawBBnorth(ctx, W, H) {
  const m = paintBase(ctx, W, H, {
    x0: -6, x1: 2.6, yB: FB, yT: BB_TOP,
    top: '#3d4450', mid: '#333a45', bot: '#242a33',
    band: 0.5, joint: 0.95, streaks: 34, patches: 5, seed: 131,
  });
  paintTiles(ctx, m, 1.1, { yB: FB, col: 'rgba(35,39,43,0.95)', step: 0.2, vstep: 0.44 });
  // 二层窗带
  for (let i = 0; i < 6; i++) {
    paintWindow2D(ctx, m, -4.9 + i * 1.3, 2.86, 0.7, 0.58, {
      lit: i === 2 ? 'cold' : undefined, blind: i === 4, frame: 'rgba(150,154,160,0.45)',
    });
  }
  // 一层：卷帘门 + 后门
  const sy0 = m.v(1.92), sy1 = m.v(FB);
  ctx.fillStyle = '#2b2f34';
  ctx.fillRect(m.u(-2.6), sy0, m.mx(2.2), sy1 - sy0);
  ctx.strokeStyle = 'rgba(8,10,14,0.6)';
  ctx.lineWidth = Math.max(1, m.my(0.012));
  for (let y = FB + 0.06; y < 1.9; y += 0.09) {
    const py = m.v(y);
    ctx.beginPath(); ctx.moveTo(m.u(-2.6), py); ctx.lineTo(m.u(-0.4), py); ctx.stroke();
  }
  ctx.fillStyle = '#191d21';
  ctx.fillRect(m.u(1.2), m.v(2.0), m.mx(0.9), m.v(FB) - m.v(2.0));
  ctx.fillStyle = 'rgba(220,200,150,0.28)';
  ctx.fillRect(m.u(1.28), m.v(1.98), m.mx(0.74), m.my(0.06));
  // 褪色招牌残字
  ctx.save();
  ctx.globalAlpha = 0.18;
  drawText(ctx, '山田商店', m.u(-1.2), m.v(2.42), { size: Math.max(9, m.mx(0.3)), color: '#efe6cc', font: JP });
  ctx.restore();
  // 立管阴影
  ctx.fillStyle = 'rgba(8,10,14,0.3)';
  ctx.fillRect(m.u(-5.9), 0, Math.max(2, m.mx(0.06)), H);
  ctx.fillRect(m.u(2.38), 0, Math.max(2, m.mx(0.05)), H);
}

/** 后方楼西立面（world z -6..-4.4，面向 x=-6；同样贴边界）。 */
function drawBBwest(ctx, W, H) {
  const m = paintBase(ctx, W, H, {
    x0: 0, x1: 1.6, yB: FB, yT: BB_TOP,
    top: '#3e4550', mid: '#343b46', bot: '#252b34',
    band: 0.5, joint: 0.8, streaks: 20, patches: 4, seed: 157,
  });
  paintTiles(ctx, m, 1.1, { yB: FB, col: 'rgba(35,39,43,0.95)', step: 0.2, vstep: 0.4 });
  paintWindow2D(ctx, m, 0.5, 2.86, 0.52, 0.56, { frame: 'rgba(150,154,160,0.45)' });
  paintWindow2D(ctx, m, 1.12, 2.86, 0.52, 0.56, { blind: true, frame: 'rgba(150,154,160,0.45)' });
  // 立管 + 墙角脏
  ctx.fillStyle = 'rgba(8,10,14,0.34)';
  ctx.fillRect(m.u(1.44), 0, Math.max(2, m.mx(0.05)), H);
  ctx.fillStyle = 'rgba(10,12,16,0.3)';
  ctx.fillRect(m.u(0.86), m.v(2.3), Math.max(1, m.mx(0.04)), m.my(1.6));
}

/** 左楼西立面（world z -4.4..1.0，面向 x=-6；贴边界，只画）。 */
function drawLBwest(ctx, W, H) {
  const m = paintBase(ctx, W, H, {
    x0: 0, x1: 5.4, yB: FB, yT: LB_TOP,
    top: '#5b564d', mid: '#4a463f', bot: '#302f2c',
    band: 0.44, joint: 0.85, streaks: 30, patches: 5, seed: 173,
  });
  paintTiles(ctx, m, 1.0, { yB: FB, col: 'rgba(32,33,31,0.95)', step: 0.19, vstep: 0.4 });
  // 二层窗带
  const xs = [0.55, 1.65, 2.75, 3.85, 4.55];
  xs.forEach((x, i) => paintWindow2D(ctx, m, x, 2.42, 0.64, 0.56, {
    lit: i === 3 ? 'warm' : undefined, blind: i === 1,
    frame: 'rgba(150,148,140,0.5)',
  }));
  // 一层：木拉门 + 卷帘 + 小灯箱残影
  ctx.fillStyle = '#332c25';
  ctx.fillRect(m.u(0.3), m.v(0.98), m.mx(1.2), m.v(FB) - m.v(0.98));
  ctx.strokeStyle = 'rgba(12,10,8,0.55)';
  ctx.lineWidth = Math.max(1, m.mx(0.012));
  for (let i = 1; i < 5; i++) {
    const px = m.u(0.3 + (1.2 / 5) * i);
    ctx.beginPath(); ctx.moveTo(px, m.v(0.98)); ctx.lineTo(px, m.v(FB)); ctx.stroke();
  }
  ctx.fillStyle = '#2b2f33';
  ctx.fillRect(m.u(1.9), m.v(1.02), m.mx(2.4), m.v(FB) - m.v(1.02));
  for (let y = FB + 0.06; y < 1.0; y += 0.085) {
    const py = m.v(y);
    ctx.strokeStyle = 'rgba(9,11,15,0.6)';
    ctx.beginPath(); ctx.moveTo(m.u(1.9), py); ctx.lineTo(m.u(4.3), py); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(240,225,190,0.09)';
  ctx.fillRect(m.u(0.42), m.v(1.72), m.mx(0.8), m.my(0.22));
  // 招牌残字
  ctx.save();
  ctx.globalAlpha = 0.2;
  drawText(ctx, '小料理 まつ', m.u(2.6), m.v(1.62), { size: Math.max(9, m.mx(0.26)), color: '#efe6cc', font: JP });
  ctx.restore();
  // 顶部檐口 + 立管
  ctx.fillStyle = 'rgba(14,16,18,0.4)';
  ctx.fillRect(0, m.v(3.18), W, Math.max(1, m.my(0.05)));
  ctx.fillStyle = 'rgba(8,10,14,0.3)';
  ctx.fillRect(m.u(5.24), 0, Math.max(2, m.mx(0.06)), H);
}

// ═════════════════════════════════════════════════════════════════════════════
// 1 · build
// ═════════════════════════════════════════════════════════════════════════════
export function buildBuildings() {
  const group = new THREE.Group();
  group.name = 'buildings';

  // ── 1.1 材质（toon 系；夜景里靠一点冷色 emissive 托底，避免全黑剪影） ──
  const MAT = {
    wallBack: M.wet(0x2e3542, 0x0a0e15, 0.5),
    wallLeft: M.wet(0x2f2e27, 0x080909, 0.4),
    roof: M.wet(0x2e333a, 0x121822, 0.6),
    parapet: M.wet(0x6a7280, 0x2b3646, 0.55),
    concrete: M.wet(0x5d6571, 0x232e3c, 0.45),
    metal: M.wet(0x6d7582, 0x27323f, 0.5),
    darkMetal: M.wet(0x2e343c, 0x161f2a, 0.5),
    steel: M.wet(0x848d9b, 0x2d3947, 0.55),
    ac: M.wet(0x757d89, 0x232e3b, 0.5),
    frame: M.wet(0x3a4149, 0x161c24, 0.5),
    crateY: M.toon(0xb08a33),
    crateR: M.toon(0x9a3d2c),
    card: M.toon(0x6f5f47),
    basket: M.toon(0x33606f),
    tape: M.flat(0xb9ad92),
  };

  // ── 1.2 实例化收集器 ─────────────────────────────────────────────────────
  const inst = {
    frame: [], sill: [], mullV: [], mullH: [],
    paneWarm: [], paneBlind: [], paneDark: [],
    barMetal: [], barDark: [],
    cylMetal: [], cylDark: [],
  };
  const _e = new THREE.Euler();
  const _q = new THREE.Quaternion();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3();
  function mtx(pos, scl, rot) {
    _e.set((rot && rot[0]) || 0, (rot && rot[1]) || 0, (rot && rot[2]) || 0);
    _q.setFromEuler(_e);
    _p.set(pos[0], pos[1], pos[2]);
    _s.set(scl[0], scl[1], scl[2]);
    return new THREE.Matrix4().compose(_p, _q, _s);
  }
  /** 细金属杆件（栏杆、支架、天线横杆…），world 尺寸。 */
  function bar(pos, scl, rot, dark) {
    (dark ? inst.barDark : inst.barMetal).push({ m: mtx(pos, scl, rot) });
  }
  /** 圆管（unit cylinder 沿 y），r / len。 */
  function pipe(pos, r, len, rot, dark) {
    (dark ? inst.cylDark : inst.cylMetal).push({ m: mtx(pos, [r, len, r], rot) });
  }

  // ── 1.3 窗 ───────────────────────────────────────────────────────────────
  const FACE = {
    s: { n: [0, 0, 1], ry: 0 },
    n: { n: [0, 0, -1], ry: Math.PI },
    e: { n: [1, 0, 0], ry: Math.PI / 2 },
    w: { n: [-1, 0, 0], ry: -Math.PI / 2 },
  };
  const PANE_COL = {
    warm: [1.45, 1.16, 0.74],
    warmDim: [0.95, 0.76, 0.5],
    blind: [0.5, 0.58, 0.68],
    dark: [0.62, 0.72, 0.9],
  };
  function paneList(kind) {
    return kind === 'warm' || kind === 'warmDim' ? inst.paneWarm : kind === 'blind' ? inst.paneBlind : inst.paneDark;
  }
  function colOf(kind) {
    const c = PANE_COL[kind] || PANE_COL.dark;
    return new THREE.Color(c[0], c[1], c[2]);
  }
  /** o: {x,y,z,w,h,face,pane,color,mull,sill} */
  function addWindow(o) {
    const f = FACE[o.face];
    const [nx, , nz] = f.n;
    const x = o.x, y = o.y, z = o.z, w = o.w, h = o.h;
    const at = (off, dy = 0) => [x + nx * off, y + dy, z + nz * off];
    inst.frame.push({ m: mtx(at(0.035), [w + 0.13, h + 0.13, 1], [0, f.ry, 0]) });
    if (o.pane !== false) {
      paneList(o.pane).push({ m: mtx(at(0.078), [w, h, 1], [0, f.ry, 0]), c: o.color || colOf(o.pane) });
    }
    if (o.mull !== false) {
      inst.mullV.push({ m: mtx(at(0.088), [w, h, 1], [0, f.ry, 0]) });
      inst.mullH.push({ m: mtx(at(0.088), [w, h, 1], [0, f.ry, 0]) });
    }
    if (o.sill !== false) {
      inst.sill.push({ m: mtx([x + nx * 0.06, y - h / 2 - 0.05, z + nz * 0.06], [w + 0.26, 0.05, 0.14], [0, f.ry, 0]) });
    }
  }
  /** 遮阳雨棚（挑出 0.42）。 */
  function awning(x, y, z, w, face, deg = -0.16) {
    const f = FACE[face];
    const [nx, , nz] = f.n;
    const ry = f.ry;
    const g = newGroup(group, [x + nx * 0.24, y, z + nz * 0.24]);
    g.rotation.y = ry;
    box(g, [w, 0.045, 0.42], [0, 0, 0], MAT.darkMetal, { rx: deg });
    bar([x + nx * 0.06, y - 0.05, z + nz * 0.06], [0.025, 0.24, 0.025], [0, 0, 0], true);
    // 斜撑（用世界坐标近似放两根）
    const sgn = face === 's' || face === 'e' ? 1 : -1;
    if (face === 's') {
      bar([x - w * 0.38, y - 0.02, z + 0.2], [0.022, 0.022, 0.34], [0.62, 0, 0], true);
      bar([x + w * 0.38, y - 0.02, z + 0.2], [0.022, 0.022, 0.34], [0.62, 0, 0], true);
    } else if (face === 'e') {
      bar([x + 0.2, y - 0.02, z - w * 0.38], [0.34, 0.022, 0.022], [0, 0, 0.62], true);
      bar([x + 0.2, y - 0.02, z + w * 0.38], [0.34, 0.022, 0.022], [0, 0, 0.62], true);
    }
    return g;
  }
  /** 窗下小护栏。 */
  function railInFront(x, y, z, w, face, h = 0.32, out = 0.26) {
    const f = FACE[face];
    const [nx, , nz] = f.n;
    const ry = f.ry;
    const g = newGroup(group, [x + nx * out, y, z + nz * out]);
    g.rotation.y = ry;
    const n = Math.max(3, Math.round(w / 0.16) + 1);
    for (let i = 0; i < n; i++) {
      bar([x + nx * out + Math.cos(ry) * (i / (n - 1) - 0.5) * w, y + h / 2, z + nz * out - Math.sin(ry) * (i / (n - 1) - 0.5) * w],
        [0.02, h, 0.02], [0, 0, 0], false);
    }
    bar([x + nx * out, y + h, z + nz * out], face === 's' || face === 'n' ? [w + 0.06, 0.028, 0.028] : [0.028, 0.028, w + 0.06], [0, 0, 0], false);
    bar([x + nx * out, y + h * 0.52, z + nz * out], face === 's' || face === 'n' ? [w, 0.02, 0.02] : [0.02, 0.02, w], [0, 0, 0], false);
    return g;
  }

  // ── 1.4 小面板 / 招牌纹理 ────────────────────────────────────────────────
  function panelTex(w, h, draw, px = 320) {
    const W = Math.max(16, Math.min(1024, Math.round(w * px)));
    const H = Math.max(16, Math.min(1024, Math.round(h * px)));
    return canvasTexture(W, H, (ctx) => draw(ctx, W, H), { anisotropy: 8 });
  }
  function signMat(tex, glowScalar = 1) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, alphaTest: 0.02, fog: false,
      side: THREE.FrontSide, depthWrite: true,
    });
    mat.color.setScalar(glowScalar);
    return mat;
  }
  function opaqueMat(tex, bright = 1) {
    const mat = new THREE.MeshBasicMaterial({ map: tex, fog: true });
    mat.color.setScalar(bright);
    return mat;
  }

  // 外机面板（格栅 + 风扇），所有外机共享一个材质
  const matACFace = opaqueMat(panelTex(0.62, 0.46, (ctx, W, H) => {
    ctx.fillStyle = '#6e747b'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = 'rgba(28,32,38,0.75)';
      ctx.fillRect(W * 0.05, H * (0.1 + i * 0.115), W * 0.55, H * 0.05);
    }
    ctx.strokeStyle = 'rgba(24,28,34,0.85)';
    ctx.lineWidth = Math.max(2, W * 0.02);
    ctx.beginPath(); ctx.arc(W * 0.76, H * 0.5, H * 0.33, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W * 0.76, H * 0.5, H * 0.18, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1;
      ctx.beginPath();
      ctx.moveTo(W * 0.76, H * 0.5);
      ctx.lineTo(W * 0.76 + Math.cos(a) * H * 0.3, H * 0.5 + Math.sin(a) * H * 0.3);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(150,155,160,0.5)';
    ctx.fillRect(0, H * 0.94, W, H * 0.06);
  }), 1);

  // 外挂机（壁挂）
  function wallAC(x, y, z, face) {
    const f = FACE[face];
    const [nx, , nz] = f.n;
    const w = 0.7, h = 0.5, d = 0.34;
    const g = newGroup(group, [x + nx * d / 2, y, z + nz * d / 2]);
    g.rotation.y = f.ry;
    box(g, [w, h, d], [0, h / 2, 0], MAT.ac, { cast: false });
    mesh(g, new THREE.PlaneGeometry(w * 0.84, h * 0.78), matACFace, [0, h * 0.5, d / 2 + 0.004]);
    // 支架
    if (face === 's') {
      bar([x - 0.22, y - 0.04, z + 0.17], [0.03, 0.03, d], null, true);
      bar([x + 0.22, y - 0.04, z + 0.17], [0.03, 0.03, d], null, true);
      pipe([x + 0.3, y + 0.12, z + 0.06], 0.028, 0.5, [0.5, 0, 0], false);
    } else if (face === 'e') {
      bar([x + 0.17, y - 0.04, z - 0.22], [d, 0.03, 0.03], null, true);
      bar([x + 0.17, y - 0.04, z + 0.22], [d, 0.03, 0.03], null, true);
      pipe([x + 0.06, y + 0.12, z + 0.3], 0.028, 0.5, [0, 0, 0.5], false);
    }
    return g;
  }

  // ── 1.5 主体块 ───────────────────────────────────────────────────────────
  const bbW = BB.x1 - BB.x0, bbD = BB.z1 - BB.z0;
  const bbCX = (BB.x0 + BB.x1) / 2, bbCZ = (BB.z0 + BB.z1) / 2;
  const lbW = LB.x1 - LB.x0, lbD = LB.z1 - LB.z0;
  const lbCX = (LB.x0 + LB.x1) / 2, lbCZ = (LB.z0 + LB.z1) / 2;

  // 后方楼体块（从 y=0 起，避免地面接缝）
  // 西/北面正好压在 12×12 底座边界上 → 体块内缩 0.03，把贴图平面留在底座内
  box(group, [bbW - 0.03, BB_TOP, bbD - 0.03], [bbCX + 0.015, BB_TOP / 2, bbCZ + 0.015], MAT.wallBack, { cast: true, outline: OUTLINE });
  box(group, [bbW - 0.18, 0.05, bbD - 0.18], [bbCX, BB_TOP + 0.025, bbCZ], MAT.roof, {});
  // 女儿墙
  box(group, [bbW, PAR, 0.12], [bbCX, BB_TOP + PAR / 2, BB.z1 - 0.06], MAT.parapet, { cast: true });
  box(group, [bbW, PAR, 0.12], [bbCX, BB_TOP + PAR / 2, BB.z0 + 0.06], MAT.parapet, { cast: true });
  box(group, [0.12, PAR, bbD], [BB.x1 - 0.06, BB_TOP + PAR / 2, bbCZ], MAT.parapet, { cast: true });
  box(group, [0.12, PAR, bbD], [BB.x0 + 0.06, BB_TOP + PAR / 2, bbCZ], MAT.parapet, { cast: true });

  // 左楼体块
  box(group, [lbW - 0.03, LB_TOP, lbD], [lbCX + 0.015, LB_TOP / 2, lbCZ], MAT.wallLeft, { cast: true, outline: OUTLINE });
  box(group, [lbW - 0.16, 0.05, lbD - 0.16], [lbCX, LB_TOP + 0.025, lbCZ], MAT.roof, {});
  box(group, [lbW, PAR, 0.12], [lbCX, LB_TOP + PAR / 2, LB.z1 - 0.06], MAT.parapet, { cast: true });
  box(group, [0.12, PAR, lbD], [LB.x1 - 0.06, LB_TOP + PAR / 2, lbCZ], MAT.parapet, { cast: true });
  box(group, [0.12, PAR, lbD], [LB.x0 + 0.06, LB_TOP + PAR / 2, lbCZ], MAT.parapet, { cast: true });
  box(group, [lbW, PAR, 0.12], [lbCX, LB_TOP + PAR / 2, LB.z0 + 0.06], MAT.parapet, {});

  // 左楼南端山墙顶上的小看板凸起（剪影节奏）
  box(group, [0.56, 0.24, 0.16], [lbCX, LB_TOP + PAR + 0.12 - 0.01, LB.z1 - 0.08], MAT.parapet, { cast: true });

  // ── 1.6 立面贴图（8 张） ─────────────────────────────────────────────────
  function wallPlane(w, h, draw, pos, ry, px) {
    const W = Math.min(1600, Math.max(16, Math.round(w * (px || 200))));
    const H = Math.min(1600, Math.max(16, Math.round(h * (px || 200))));
    const tex = canvasTexture(W, H, (ctx, cw, ch) => draw(ctx, cw, ch), { anisotropy: 8 });
    const mat = new THREE.MeshBasicMaterial({ map: tex, fog: true, side: THREE.FrontSide });
    const m = mesh(group, new THREE.PlaneGeometry(w, h), mat, pos, { ry: ry || 0 });
    m.receiveShadow = false;
    return m;
  }
  // 南立面（便利店屋顶上方那一条 x -3.2..2.6）
  wallPlane(5.8, BB_TOP - FB, drawBBsouth, [-0.3, (BB_TOP + FB) / 2, BB.z1 + 0.004], 0, 225);
  // 南立面巷口段（x -4.9..-3.2，被左楼和便利店夹住）
  wallPlane(1.7, BB_TOP - FB, drawBBalley, [-4.05, (BB_TOP + FB) / 2, BB.z1 + 0.004], 0, 420);
  // 东立面
  wallPlane(bbD, BB_TOP - FB, drawBBeast, [BB.x1 + 0.004, (BB_TOP + FB) / 2, bbCZ], Math.PI / 2, 380);
  // 左楼南端
  wallPlane(lbW, LB_TOP - FB, drawLBsouth, [lbCX, (LB_TOP + FB) / 2, LB.z1 + 0.004], 0, 400);
  // 左楼巷内东墙
  wallPlane(lbD, LB_TOP - FB, drawLBeast, [LB.x1 + 0.004, (LB_TOP + FB) / 2, lbCZ], Math.PI / 2, 200);
  // 北 / 西立面（贴底座边界 → 只能贴图，不许外挂任何构件）
  wallPlane(bbW, BB_TOP - FB, drawBBnorth, [bbCX, (BB_TOP + FB) / 2, BB.z0 + 0.001], Math.PI, 175);
  wallPlane(bbD, BB_TOP - FB, drawBBwest, [BB.x0 + 0.001, (BB_TOP + FB) / 2, bbCZ], -Math.PI / 2, 330);
  wallPlane(lbD, LB_TOP - FB, drawLBwest, [LB.x0 + 0.001, (LB_TOP + FB) / 2, lbCZ], -Math.PI / 2, 165);

  // ── 1.7 窗（实例化：框 / 台 / 竖挺 / 横挺 / 玻璃） ───────────────────────
  // 后方楼南立面可见窗带
  addWindow({ x: -2.45, y: 3.66, z: BB.z1, w: 0.74, h: 0.5, face: 's', pane: 'warm' });
  addWindow({ x: -1.35, y: 3.66, z: BB.z1, w: 0.74, h: 0.5, face: 's', pane: 'dark' });
  addWindow({ x: -0.25, y: 3.66, z: BB.z1, w: 0.74, h: 0.5, face: 's', pane: 'blind' });
  addWindow({ x: 0.9, y: 3.66, z: BB.z1, w: 0.74, h: 0.5, face: 's', pane: 'warmDim' });
  addWindow({ x: 1.9, y: 3.66, z: BB.z1, w: 0.74, h: 0.5, face: 's', pane: false });
  awning(-2.45, 4.03, BB.z1, 0.92, 's');
  awning(0.9, 4.03, BB.z1, 0.92, 's');
  railInFront(-0.25, 3.44, BB.z1, 0.82, 's', 0.34, 0.26);
  // 后方楼东立面
  addWindow({ x: BB.x1, y: 3.06, z: -5.5, w: 0.5, h: 0.52, face: 'e', pane: 'cold' });
  addWindow({ x: BB.x1, y: 3.44, z: -4.86, w: 0.46, h: 0.42, face: 'e', pane: 'dark' });
  addWindow({ x: BB.x1, y: 2.26, z: -5.42, w: 0.5, h: 0.44, face: 'e', pane: 'warm' });
  addWindow({ x: BB.x1, y: 1.5, z: -5.62, w: 0.34, h: 0.38, face: 'e', pane: 'dark' });
  // 后方楼巷口后墙小窗
  addWindow({ x: -4.58, y: 3.18, z: BB.z1, w: 0.44, h: 0.38, face: 's', pane: 'dark' });
  // 左楼南端
  addWindow({ x: -5.62, y: 2.56, z: LB.z1, w: 0.7, h: 0.62, face: 's', pane: 'warmDim' });
  railInFront(-5.62, 2.22, LB.z1, 0.76, 's', 0.3, 0.24);
  addWindow({ x: -5.6, y: 0.56, z: LB.z1, w: 0.5, h: 0.4, face: 's', pane: 'dark' });
  // 左楼巷内东墙
  addWindow({ x: LB.x1, y: 2.4, z: -3.38, w: 0.56, h: 0.5, face: 'e', pane: 'dark' });
  addWindow({ x: LB.x1, y: 3.02, z: -1.95, w: 0.48, h: 0.42, face: 'e', pane: 'dark' });
  // 背面（用户会转过去）
  addWindow({ x: -3.9, y: 3.02, z: BB.z0, w: 0.6, h: 0.54, face: 'n', pane: 'warmDim' });
  addWindow({ x: 0.95, y: 2.9, z: BB.z0, w: 0.56, h: 0.5, face: 'n', pane: 'dark' });
  addWindow({ x: LB.x0, y: 2.5, z: -2.7, w: 0.54, h: 0.52, face: 'w', pane: 'dark' });
  addWindow({ x: LB.x0, y: 2.9, z: 0.1, w: 0.44, h: 0.42, face: 'w', pane: 'dark' });

  // 电视窗（缓慢明暗变化）——单独一个面，材质可动画
  const tvTex = panelTex(0.74, 0.5, (ctx, W, H) => {
    ctx.fillStyle = '#0a0d14'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * 0.46, H * 0.46, 2, W * 0.46, H * 0.46, W * 0.62);
    g.addColorStop(0, 'rgba(190,228,255,1)');
    g.addColorStop(0.35, 'rgba(120,175,235,0.8)');
    g.addColorStop(1, 'rgba(30,50,90,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 窗帘边
    ctx.fillStyle = 'rgba(10,12,16,0.85)';
    ctx.fillRect(0, 0, W * 0.16, H);
    ctx.fillRect(W * 0.86, 0, W * 0.14, H);
    // 人影
    ctx.fillStyle = 'rgba(8,10,16,0.55)';
    ctx.beginPath();
    ctx.ellipse(W * 0.52, H * 0.72, W * 0.11, H * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }, 260);
  const tvMat = opaqueMat(tvTex, 1.2);
  const tvPane = mesh(group, new THREE.PlaneGeometry(0.74, 0.5), tvMat, [1.9, 3.66, BB.z1 + 0.078], {});
  // 窗框 / 窗台仍走实例
  inst.frame.push({ m: mtx([1.9, 3.66, BB.z1 + 0.035], [0.87, 0.63, 1], [0, 0, 0]) });
  inst.sill.push({ m: mtx([1.9, 3.66 - 0.25 - 0.05, BB.z1 + 0.06], [1.0, 0.05, 0.14], [0, 0, 0]) });
  inst.mullV.push({ m: mtx([1.9, 3.66, BB.z1 + 0.088], [0.74, 0.5, 1], [0, 0, 0]) });
  inst.mullH.push({ m: mtx([1.9, 3.66, BB.z1 + 0.088], [0.74, 0.5, 1], [0, 0, 0]) });
  tvPane.renderOrder = 1;

  // ── 1.8 主立面零星构件 ───────────────────────────────────────────────────
  // 后方楼南立面：落水管（右上角，避开窗户）
  pipe([2.45, (BB_TOP + Y0) / 2, BB.z1 + 0.07], 0.05, BB_TOP - Y0, null, false);
  pipe([2.41, Y0 + 0.12, BB.z1 + 0.12], 0.05, 0.18, [0, 0, Math.PI / 2.4], false);
  for (let i = 0; i < 4; i++) bar([2.45, Y0 + 0.4 + i * 0.95, BB.z1 + 0.035], [0.1, 0.03, 0.03], null, true);
  // 立面电缆（横跨店招上方，垂坠）
  function cable(pts, r = 0.012) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    const m = mesh(group, new THREE.TubeGeometry(curve, 26, r, 4, false), MAT.darkMetal, [0, 0, 0], {});
    return m;
  }
  cable([[-5.2, 3.92, -4.34], [-3.6, 3.78, -4.33], [-1.7, 3.94, -4.34], [0.4, 3.76, -4.33], [2.4, 3.9, -4.34]]);
  cable([[-5.2, 3.72, -4.35], [-3.4, 3.58, -4.34], [-1.5, 3.74, -4.35], [0.6, 3.55, -4.34], [2.4, 3.7, -4.35]], 0.01);
  // 南立面小通风口 / 表箱
  box(group, [0.3, 0.24, 0.1], [-3.0, 3.9, BB.z1 + 0.05], MAT.concrete, {});

  // 后方楼东立面（默认机位右侧很显眼）：外挂机 + 电表箱 + 落水管 + 防盗灯 + 管线
  wallAC(BB.x1, 2.32, -4.72, 'e');
  // 落水管（弯头 + 抱箍）
  pipe([BB.x1 + 0.07, (BB_TOP + Y0) / 2, -4.5], 0.05, BB_TOP - Y0, null, false);
  for (let i = 0; i < 4; i++) bar([BB.x1 + 0.035, Y0 + 0.5 + i * 0.95, -4.5], [0.03, 0.03, 0.1], null, true);
  pipe([BB.x1 + 0.11, Y0 + 0.13, -4.56], 0.05, 0.22, [0, 0, Math.PI / 2.6], false);
  // 电表箱 + 分表 + 竖管
  box(group, [0.1, 0.36, 0.3], [BB.x1 + 0.05, 1.52, -4.92], MAT.concrete, {});
  box(group, [0.02, 0.28, 0.22], [BB.x1 + 0.105, 1.52, -4.92], MAT.darkMetal, {});
  pipe([BB.x1 + 0.06, 2.2, -5.06], 0.028, 1.4, null, false);
  pipe([BB.x1 + 0.06, 2.9, -4.99], 0.028, 0.22, [0.6, 0, 0], false);
  // 屋顶排水口
  pipe([BB.x1 + 0.1, 3.92, -5.9], 0.045, 0.3, [0, 0, Math.PI / 2], false);
  // 防盗灯（灯头 + 灯杆）+ 墙上的旧海报板
  box(group, [0.14, 0.16, 0.14], [BB.x1 + 0.1, 3.32, -4.6], MAT.darkMetal, {});
  box(group, [0.02, 0.22, 0.3], [BB.x1 + 0.02, 1.98, -5.9], MAT.tape, {});
  const secGlow = glow(group, 0xffc27a, 0.9, [BB.x1 + 0.16, 3.28, -4.58], { opacity: 0.4 });
  // 一道薄檐口（把东立面切成上下两段，读起来有层次）
  box(group, [0.06, 0.08, bbD], [BB.x1 + 0.02, 2.34, bbCZ], MAT.concrete, {});

  // 左楼南端：山墙装饰 + 落水管 + 壁挂机 + 防盗灯
  // 落水管移到东墙角，避开 props 公告栏 (x -5.95..-4.95, y 1.0..1.9，必须留平)
  pipe([-4.928, (LB_TOP + Y0) / 2, LB.z1 + 0.045], 0.024, LB_TOP - Y0, null, false);
  for (let i = 0; i < 3; i++) bar([-4.928, Y0 + 0.6 + i * 1.1, LB.z1 + 0.02], [0.05, 0.024, 0.024], null, true);
  wallAC(-5.35, 3.12, LB.z1, 's');
  // 山墙顶部的瓦檐（三角斜面用两根斜杆表示）
  bar([-5.42, LB_TOP + PAR + 0.16, LB.z1 - 0.02], [0.78, 0.06, 0.16], null, true);
  bar([-5.86, LB_TOP + PAR + 0.34, LB.z1 - 0.02], [0.09, 0.34, 0.18], [0, 0, 0.28], false);
  bar([-5.04, LB_TOP + PAR + 0.34, LB.z1 - 0.02], [0.09, 0.34, 0.18], [0, 0, -0.28], false);

  // ── 1.9 后方楼屋顶 ───────────────────────────────────────────────────────
  const roofB = newGroup(group, [0, 0, 0], 'bb-roof');
  // 水塔
  const tankPos = [-5.0, BB_ROOF, -5.15];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    bar([tankPos[0] + sx * 0.24, BB_ROOF + 0.2, tankPos[2] + sz * 0.24], [0.05, 0.4, 0.05], null, false);
  }
  cylinder(roofB, 0.34, 0.34, 0.72, [tankPos[0], BB_ROOF + 0.76, tankPos[2]], MAT.steel, { seg: 18, cast: true });
  cylinder(roofB, 0.36, 0.36, 0.05, [tankPos[0], BB_ROOF + 1.14, tankPos[2]], MAT.metal, { seg: 18 });
  pipe([tankPos[0], BB_ROOF + 0.64, tankPos[2]], 0.352, 0.05, null, true);
  pipe([tankPos[0], BB_ROOF + 0.98, tankPos[2]], 0.352, 0.05, null, true);
  pipe([tankPos[0] + 0.18, BB_ROOF + 0.34, tankPos[2] + 0.1], 0.03, 0.6, null, true);

  // 楼梯间小屋 + 上屋顶的门
  const ph = [-3.35, BB_ROOF, -5.28];
  box(roofB, [1.2, 0.95, 0.95], [ph[0], BB_ROOF + 0.475, ph[2]], MAT.concrete, { cast: true });
  box(roofB, [1.3, 0.06, 1.05], [ph[0], BB_ROOF + 0.98, ph[2]], MAT.parapet, {});
  // 门（朝南）
  box(roofB, [0.58, 0.8, 0.045], [ph[0], BB_ROOF + 0.42, ph[2] + 0.5], MAT.darkMetal, {});
  box(roofB, [0.66, 0.87, 0.02], [ph[0], BB_ROOF + 0.47, ph[2] + 0.475], MAT.metal, {});
  bar([ph[0] + 0.2, BB_ROOF + 0.42, ph[2] + 0.53], [0.02, 0.1, 0.02], null, true);
  // 门口雨檐 + 台阶
  box(roofB, [0.8, 0.05, 0.24], [ph[0], BB_ROOF + 0.9, ph[2] + 0.58], MAT.darkMetal, {});
  box(roofB, [0.7, 0.08, 0.22], [ph[0], BB_ROOF + 0.04, ph[2] + 0.56], MAT.concrete, {});
  // 小屋上的通风帽
  pipe([ph[0] + 0.35, BB_ROOF + 1.12, ph[2] - 0.2], 0.07, 0.22, null, false);
  pipe([ph[0] + 0.35, BB_ROOF + 1.24, ph[2] - 0.2], 0.16, 0.04, null, true);

  // 屋面通风管 / 弯管
  pipe([-2.25, BB_ROOF + 0.22, -5.6], 0.08, 0.44, null, false);
  pipe([-2.25, BB_ROOF + 0.46, -5.6], 0.13, 0.04, null, true);
  pipe([-2.05, BB_ROOF + 0.18, -5.36], 0.07, 0.36, null, false);
  pipe([-2.05, BB_ROOF + 0.38, -5.36], 0.11, 0.04, null, true);
  // 蘑菇通风口
  pipe([0.9, BB_ROOF + 0.16, -4.86], 0.09, 0.32, null, false);
  pipe([0.9, BB_ROOF + 0.34, -4.86], 0.17, 0.05, null, false);

  // 屋顶空调外机（朝南）
  function roofAC(x, z, ry, s = 1) {
    const g = newGroup(roofB, [x, BB_ROOF, z]);
    g.rotation.y = ry || 0;
    box(g, [0.66 * s, 0.44 * s, 0.34 * s], [0, 0.22 * s, 0], MAT.ac, { cast: true });
    mesh(g, new THREE.PlaneGeometry(0.56 * s, 0.36 * s), matACFace, [0, 0.22 * s, 0.17 * s + 0.003]);
  }
  roofAC(-1.15, -5.5, 0, 1);
  roofAC(1.85, -5.45, 0, 0.92);

  // 晾衣杆
  const cw = [-2.6, -4.72];
  bar([cw[0], BB_ROOF + 0.55, cw[1]], [0.045, 1.05, 0.045], null, true);
  bar([cw[0] + 1.3, BB_ROOF + 0.55, cw[1]], [0.045, 1.05, 0.045], null, true);
  bar([cw[0] + 0.65, BB_ROOF + 1.05, cw[1]], [1.36, 0.028, 0.028], null, true);
  bar([cw[0] + 0.65, BB_ROOF + 0.9, cw[1]], [1.3, 0.02, 0.02], null, true);

  // 卫星锅
  const dish = newGroup(roofB, [2.0, BB_ROOF, -4.78]);
  pipe([2.0, BB_ROOF + 0.22, -4.78], 0.028, 0.44, null, true);
  const dishMesh = cylinder(dish, 0.21, 0.21, 0.035, [0, 0.55, 0], MAT.ac, { seg: 20, rx: 1.05, cast: true });
  bar([2.0, BB_ROOF + 0.56, -4.56], [0.02, 0.02, 0.14], [0.4, 0, 0], true);

  // 电视天线
  pipe([2.28, BB_ROOF + 0.72, -5.55], 0.022, 1.44, null, true);
  for (let i = 0; i < 4; i++) {
    const len = 0.78 - i * 0.12;
    bar([2.28, BB_ROOF + 1.06 + i * 0.14, -5.55], [len, 0.018, 0.018], null, true);
  }
  for (let i = 0; i < 3; i++) {
    bar([2.28, BB_ROOF + 1.1 + i * 0.16, -5.55], [0.02, 0.02, 0.3], null, true);
  }
  // 天线顶的航空障碍灯（update 里闪）
  const warnMat = M.emit(0xff3a26, { intensity: 1.9 });
  sphere(roofB, 0.04, [2.28, BB_ROOF + 1.46, -5.55], warnMat, { seg: 8, segY: 6 });
  const warnGlow = glow(roofB, 0xff4a30, 0.55, [2.28, BB_ROOF + 1.46, -5.55], { opacity: 0.3 });

  // 女儿墙上的铁护栏（给屋顶一条节奏线）
  for (let i = 0; i < 11; i++) {
    bar([BB.x0 + 0.5 + i * 0.78, BB_TOP + PAR + 0.2, BB.z1 - 0.055], [0.022, 0.4, 0.022], null, false);
  }
  bar([bbCX, BB_TOP + PAR + 0.4, BB.z1 - 0.055], [bbW - 0.12, 0.026, 0.026], null, false);
  bar([bbCX, BB_TOP + PAR + 0.25, BB.z1 - 0.055], [bbW - 0.2, 0.019, 0.019], null, false);

  // 晾衣杆上挂着的衣物（打破屋顶一片黑）
  const cloth = [[-2.45, 0.36, 0.5, MAT.tape], [-2.02, 0.3, 0.42, MAT.card], [-1.62, 0.38, 0.46, MAT.tape]];
  cloth.forEach((c, i) => {
    const g = newGroup(roofB, [c[0], BB_ROOF + 1.03, -4.72], 'cloth');
    g.rotation.y = 0.05 * (i - 1);
    box(g, [c[1], c[2], 0.018], [0, -c[2] / 2 - 0.02, 0], c[3], {});
  });
  // 电线槽
  pipe([0.4, BB_ROOF + 0.06, -4.62], 0.035, 3.6, [0, 0, Math.PI / 2], true);

  // 屋顶广告牌（カラオケ）——可动画
  const bbBoard = newGroup(roofB, [0.55, BB_ROOF, -5.02]);
  bar([-0.45, 0.5, 0], [0.06, 1.0, 0.06], null, true);
  bar([0.45, 0.5, 0], [0.06, 1.0, 0.06], null, true);
  bar([0, 0.28, 0.0], [0.9, 0.035, 0.035], null, true);
  box(bbBoard, [1.92, 0.56, 0.08], [0, 1.32, 0], MAT.darkMetal, { cast: true });
  const karaTex = panelTex(1.86, 0.5, (ctx, W, H) => {
    ctx.fillStyle = '#160d18'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,79,154,0.8)';
    ctx.lineWidth = Math.max(2, H * 0.05);
    roundRect(ctx, W * 0.03, H * 0.08, W * 0.94, H * 0.84, H * 0.1);
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = '#ff4f9a';
    ctx.shadowBlur = H * 0.32;
    drawText(ctx, 'カラオケ', W * 0.42, H * 0.55, { size: H * 0.46, color: '#ffd0e6', font: JP });
    ctx.restore();
    ctx.save();
    ctx.shadowColor = '#54e6ff';
    ctx.shadowBlur = H * 0.28;
    drawText(ctx, 'KARAOKE', W * 0.845, H * 0.56, { size: H * 0.24, color: '#c9f6ff', font: FONT.en, letterSpacing: H * 0.03 });
    ctx.restore();
  }, 300);
  const karaMat = signMat(karaTex, 1.15);
  mesh(bbBoard, new THREE.PlaneGeometry(1.86, 0.5), karaMat, [0, 1.32, 0.043]);
  const karaGlow = glow(roofB, 0xff5f9a, 1.7, [0.55, BB_ROOF + 1.32, -4.9], { opacity: 0.22 });

  // ── 1.10 左楼屋顶 ────────────────────────────────────────────────────────
  const roofL = newGroup(group, [0, 0, 0], 'lb-roof');
  // 屋顶空调外机（朝巷子）
  const lAC = newGroup(roofL, [-5.42, LB_ROOF, -0.9]);
  lAC.rotation.y = Math.PI / 2;
  box(lAC, [0.62, 0.44, 0.32], [0, 0.22, 0], MAT.ac, { cast: true });
  mesh(lAC, new THREE.PlaneGeometry(0.52, 0.34), matACFace, [0, 0.22, 0.163]);
  // 通风口
  pipe([-5.42, LB_ROOF + 0.16, -2.4], 0.08, 0.32, null, false);
  pipe([-5.42, LB_ROOF + 0.34, -2.4], 0.15, 0.05, null, false);
  pipe([-5.6, LB_ROOF + 0.14, 0.28], 0.07, 0.28, null, false);
  pipe([-5.6, LB_ROOF + 0.3, 0.28], 0.13, 0.04, null, false);
  // 晾晒杆（沿 z 方向）
  bar([-5.45, LB_ROOF + 0.52, -1.6], [0.045, 1.0, 0.045], null, true);
  bar([-5.45, LB_ROOF + 0.52, 0.45], [0.045, 1.0, 0.045], null, true);
  bar([-5.45, LB_ROOF + 1.0, -0.575], [0.028, 0.028, 2.1], null, true);
  bar([-5.45, LB_ROOF + 0.86, -0.575], [0.02, 0.02, 2.0], null, true);
  // 晾着的被单 / 衬衫（左楼屋顶剪影）
  [[-0.15, 0.52, 0], [-0.95, 0.44, 1]].forEach((c) => {
    const g = newGroup(roofL, [-5.45, LB_ROOF + 0.96, c[0]], 'lb-cloth');
    g.rotation.y = 0.06;
    box(g, [0.02, c[1], 0.36], [0, -c[1] / 2 - 0.02, 0], c[2] ? MAT.tape : MAT.card, {});
  });
  // 屋顶东侧护栏（女儿墙上的铁栏）
  for (let i = 0; i < 7; i++) {
    bar([-5.02, LB_PAR + 0.19, -4.05 + i * 0.8], [0.025, 0.38, 0.025], null, false);
  }
  bar([-5.02, LB_PAR + 0.38, -1.7], [0.03, 0.03, 4.8], null, false);
  bar([-5.02, LB_PAR + 0.24, -1.7], [0.022, 0.022, 4.8], null, false);

  // ── 1.11 小巷后墙（后方楼南立面巷口段） ─────────────────────────────────
  // 铁门
  box(group, [0.98, 2.12, 0.06], [-4.15, Y0 + 1.0, -4.39], MAT.darkMetal, {});
  const doorTex = panelTex(0.86, 2.0, (ctx, W, H) => {
    ctx.fillStyle = '#2b3a34'; ctx.fillRect(0, 0, W, H);
    // 铁皮分块
    ctx.strokeStyle = 'rgba(12,16,14,0.7)';
    ctx.lineWidth = Math.max(2, W * 0.025);
    ctx.strokeRect(W * 0.06, H * 0.03, W * 0.88, H * 0.42);
    ctx.strokeRect(W * 0.06, H * 0.5, W * 0.88, H * 0.46);
    // 锈
    const r = rng(404);
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = `rgba(${120 + r() * 60 | 0},${60 + r() * 30 | 0},${30 + r() * 20 | 0},${0.1 + r() * 0.28})`;
      ctx.fillRect(r() * W, r() * H, W * (0.03 + r() * 0.2), H * (0.01 + r() * 0.12));
    }
    // 上部小铁网窗
    ctx.fillStyle = '#0d1412';
    ctx.fillRect(W * 0.26, H * 0.14, W * 0.48, H * 0.16);
    ctx.strokeStyle = 'rgba(80,90,86,0.7)';
    ctx.lineWidth = Math.max(1, W * 0.012);
    for (let i = 1; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(W * (0.26 + i * 0.096), H * 0.14); ctx.lineTo(W * (0.26 + i * 0.096), H * 0.3); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(W * 0.26, H * 0.22); ctx.lineTo(W * 0.74, H * 0.22); ctx.stroke();
    // 把手 + 门牌
    ctx.fillStyle = '#9aa19c';
    ctx.fillRect(W * 0.12, H * 0.56, W * 0.1, H * 0.02);
    ctx.fillStyle = '#e6e0d2';
    ctx.fillRect(W * 0.6, H * 0.33, W * 0.26, H * 0.05);
    ctx.fillStyle = '#3a3630';
    drawText(ctx, '関係者以外', W * 0.73, H * 0.355, { size: H * 0.026, color: '#3a3630', font: JP });
    // 底部水渍
    const g = ctx.createLinearGradient(0, H * 0.7, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.7, W, H * 0.3);
  }, 360);
  const doorMat = opaqueMat(doorTex, 1);
  mesh(group, new THREE.PlaneGeometry(0.86, 2.0), doorMat, [-4.15, Y0 + 1.0, -4.352]);

  // 门口昏黄小灯：支架 + 灯罩 + 灯泡 + 光斑
  bar([-4.15, 2.5, -4.14], [0.04, 0.04, 0.24], null, true);
  cylinder(group, 0.02, 0.14, 0.1, [-4.15, 2.44, -4.06], MAT.darkMetal, { seg: 12 });
  const bulb = sphere(group, 0.055, [-4.15, 2.37, -4.06], M.emit(0xffb45e, { intensity: 2.6 }), { seg: 12, segY: 8 });
  const lampGlow = glow(group, 0xffb45e, 1.8, [-4.15, 2.33, -3.94], { opacity: 0.5 });
  const lampGlow2 = glow(group, 0xffb45e, 3.0, [-4.1, 1.9, -3.7], { opacity: 0.16 });
  groundSmear(group, 0xffb45e, 1.6, 2.6, [-4.1, ALLEY_FLOOR + 0.004, -3.5], { opacity: 0.3 });

  // 后墙管线 + 电表
  pipe([-3.28, (BB_TOP + Y0) / 2, -4.33], 0.045, BB_TOP - Y0, null, false);
  pipe([-4.8, (Y0 + 1.5) / 2 + 0.1, -4.34], 0.04, 1.3, null, false);
  pipe([-4.86, 3.4, -4.31], 0.04, 1.6, [0, 0, Math.PI / 2], false);
  pipe([-4.86, 3.4, -4.31], 0.04, 0.55, [0, 0, 0], false);
  box(group, [0.26, 0.32, 0.12], [-4.72, 1.62, -4.33], MAT.concrete, {});
  box(group, [0.2, 0.22, 0.05], [-4.72, 1.34, -4.32], MAT.darkMetal, {});
  // 后墙外挂空调
  wallAC(-3.62, 1.2, BB.z1, 's');
  // 后墙小海报 / 贴纸（一层高一点，避免全被门挡住）
  box(group, [0.34, 0.1, 0.03], [-4.84, 2.2, -4.35], MAT.concrete, {});

  // 居酒屋竖招牌（巷底，垂直于后墙）
  {
    const sz = newGroup(group, [-3.52, 2.86, -4.2], 'sign-izakaya');
    box(sz, [0.08, 1.2, 0.42], [0, 0, 0], MAT.darkMetal, { cast: true });
    const tex = panelTex(0.42, 1.2, (ctx, W, H) => {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,138,61,0.55)';
      ctx.lineWidth = Math.max(2, W * 0.04);
      roundRect(ctx, W * 0.1, H * 0.03, W * 0.8, H * 0.94, W * 0.12);
      ctx.stroke();
      ctx.save();
      ctx.shadowColor = '#ff8a3d';
      ctx.shadowBlur = W * 0.3;
      drawVerticalText(ctx, '居酒屋', W * 0.5, H * 0.55, W * 0.26, { color: '#ffd9a0', gap: H * 0.19 });
      ctx.restore();
      ctx.fillStyle = 'rgba(255,130,60,0.9)';
      ctx.beginPath(); ctx.arc(W * 0.5, H * 0.08, W * 0.15, 0, Math.PI * 2); ctx.fill();
    }, 320);
    const mat = signMat(tex, 1.25);
    mesh(sz, new THREE.PlaneGeometry(0.42, 1.2), mat, [0.044, 0, 0], { ry: Math.PI / 2 });
    mesh(sz, new THREE.PlaneGeometry(0.42, 1.2), mat, [-0.044, 0, 0], { ry: -Math.PI / 2 });
    glow(group, 0xffa45e, 1.0, [-3.52, 2.86, -4.0], { opacity: 0.3 });
  }

  // ── 1.12 左楼巷内东墙细节 ────────────────────────────────────────────────
  // 落水管（巷口附近，默认相机可见）
  pipe([LB.x1 + 0.07, (LB_TOP + Y0) / 2, 0.35], 0.05, LB_TOP - Y0, null, false);
  pipe([LB.x1 + 0.07, Y0 + 0.1, 0.19], 0.05, 0.26, [0, 0, Math.PI / 2.6], false);
  for (let i = 0; i < 4; i++) bar([LB.x1 + 0.035, Y0 + 0.45 + i * 0.95, 0.35], [0.1, 0.03, 0.03], null, true);
  // 电表箱 ×2
  box(group, [0.11, 0.32, 0.24], [LB.x1 + 0.06, 1.62, -0.15], MAT.concrete, {});
  box(group, [0.1, 0.26, 0.2], [LB.x1 + 0.05, 1.24, -0.42], MAT.darkMetal, {});
  pipe([LB.x1 + 0.05, 1.05, -0.15], 0.022, 1.8, null, true);
  // 防盗灯（巷口可见）
  box(group, [0.1, 0.12, 0.12], [LB.x1 + 0.07, 2.52, -0.66], MAT.darkMetal, {});
  const secGlow2 = glow(group, 0xffc27a, 0.7, [LB.x1 + 0.12, 2.48, -0.66], { opacity: 0.35 });
  // 壁挂空调（巷中段）
  wallAC(LB.x1, 0.86, -2.3, 'e');
  // 水平管道 + 立管
  pipe([LB.x1 + 0.06, 2.95, -1.75], 0.042, 4.9, [Math.PI / 2, 0, 0], false);
  pipe([LB.x1 + 0.06, 2.95, 0.66], 0.042, 0.36, null, false);
  pipe([LB.x1 + 0.06, 2.95, -4.16], 0.042, 0.36, null, false);
  pipe([LB.x1 + 0.06, 1.5, -1.02], 0.032, 2.9, null, false);
  pipe([LB.x1 + 0.06, 1.8, -3.62], 0.03, 3.5, null, false);
  // 垂坠电缆
  cable([[-4.86, 3.3, 0.85], [-4.86, 3.05, 0.1], [-4.86, 2.94, -0.7], [-4.86, 3.02, -1.5], [-4.86, 3.25, -2.3]], 0.014);
  cable([[-4.86, 3.34, 0.9], [-4.86, 3.12, 0.2], [-4.86, 3.02, -0.5], [-4.86, 3.1, -1.2]], 0.011);
  // 巷内海报贴纸（立体的，离墙 1cm）
  const posterTex1 = panelTex(0.3, 0.42, (ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#d8cdb0'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#b03a2a';
    ctx.fillRect(W * 0.08, H * 0.08, W * 0.84, H * 0.2);
    drawText(ctx, '飲み放題', W * 0.5, H * 0.18, { size: H * 0.13, color: '#f4ecd8', font: JP });
    ctx.fillStyle = '#3a342c';
    for (let i = 0; i < 5; i++) ctx.fillRect(W * 0.1, H * (0.38 + i * 0.11), W * (0.5 + (i % 2) * 0.24), H * 0.04);
    ctx.fillStyle = 'rgba(180,40,30,0.8)';
    ctx.fillRect(W * 0.62, H * 0.62, W * 0.26, W * 0.26);
    ctx.fillStyle = 'rgba(10,12,14,0.28)';
    ctx.beginPath(); ctx.moveTo(W, H); ctx.lineTo(W * 0.82, H); ctx.lineTo(W, H * 0.86); ctx.closePath(); ctx.fill();
  }, 320);
  const posterMat1 = opaqueMat(posterTex1, 1);
  mesh(group, new THREE.PlaneGeometry(0.3, 0.42), posterMat1, [LB.x1 + 0.025, 1.63, 0.32], { ry: Math.PI / 2 });
  mesh(group, new THREE.PlaneGeometry(0.26, 0.36), posterMat1, [LB.x1 + 0.03, 1.78, -2.62], { ry: Math.PI / 2 });
  // 巷底更暗的一张
  mesh(group, new THREE.PlaneGeometry(0.24, 0.34), posterMat1, [LB.x1 + 0.025, 1.52, -3.75], { ry: Math.PI / 2 });
  // 带铁栏的小窗
  addWindow({ x: LB.x1, y: 2.4, z: -3.38, w: 0.56, h: 0.5, face: 'e', pane: 'dark' });
  for (let i = 0; i < 3; i++) bar([LB.x1 + 0.12, 2.4, -3.57 + i * 0.19], [0.04, 0.56, 0.025], null, true);
  bar([LB.x1 + 0.12, 2.4, -3.38], [0.04, 0.024, 0.56], null, true);

  // ── 1.13 左楼南端细节（スナック招牌 / 雨棚 / 灯） ───────────────────────
  awning(-5.62, 3.06, LB.z1, 0.86, 's', -0.14);
  bar([-5.62, 2.98, LB.z1 + 0.06], [0.8, 0.05, 0.1], null, true);
  // スナック 竖招牌（垂直于山墙）
  {
    const sz = newGroup(group, [-5.68, 2.62, 1.2], 'sign-snack');
    box(sz, [0.08, 1.28, 0.4], [0, 0, 0], MAT.darkMetal, { cast: true });
    const tex = panelTex(0.4, 1.28, (ctx, W, H) => {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,95,142,0.9)';
      ctx.lineWidth = Math.max(2, W * 0.045);
      roundRect(ctx, W * 0.07, H * 0.02, W * 0.86, H * 0.96, W * 0.1);
      ctx.stroke();
      drawText(ctx, 'BAR', W * 0.5, H * 0.07, { size: W * 0.17, color: 'rgba(255,190,215,0.95)', font: FONT.en, letterSpacing: W * 0.02 });
      ctx.save();
      ctx.shadowColor = '#ff5f8e';
      ctx.shadowBlur = W * 0.24;
      drawVerticalText(ctx, 'スナック', W * 0.5, H * 0.55, W * 0.29, { color: '#ffe2ee', gap: H * 0.155 });
      ctx.restore();
      drawText(ctx, 'SNACK', W * 0.5, H * 0.952, { size: W * 0.1, color: 'rgba(255,150,190,0.8)', font: FONT.en, letterSpacing: W * 0.012 });
    }, 340);
    const mat = signMat(tex, 1.3);
    mesh(sz, new THREE.PlaneGeometry(0.4, 1.28), mat, [0.044, 0, 0], { ry: Math.PI / 2 });
    mesh(sz, new THREE.PlaneGeometry(0.4, 1.28), mat, [-0.044, 0, 0], { ry: -Math.PI / 2 });
    bar([-5.68, 3.2, 1.06], [0.22, 0.035, 0.035], null, true);
    bar([-5.68, 2.06, 1.06], [0.22, 0.035, 0.035], null, true);
    glow(group, 0xff5f8e, 1.2, [-5.68, 2.62, 1.44], { opacity: 0.26 });
  }

  // ── 1.14 后方楼南立面：酒処 竖招牌（从便利店屋顶上露出上半段） ───────────
  {
    const sz = newGroup(group, [-3.02, 3.32, -4.24], 'sign-sake');
    box(sz, [0.08, 1.46, 0.32], [0, 0, 0], MAT.darkMetal, { cast: true });
    const tex = panelTex(0.32, 1.46, (ctx, W, H) => {
      ctx.fillStyle = '#171017'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,180,94,0.85)';
      ctx.lineWidth = Math.max(2, W * 0.05);
      roundRect(ctx, W * 0.06, H * 0.02, W * 0.88, H * 0.96, W * 0.08);
      ctx.stroke();
      ctx.save();
      ctx.shadowColor = '#ffb45e';
      ctx.shadowBlur = W * 0.26;
      drawText(ctx, '酒', W * 0.5, H * 0.16, { size: W * 0.42, color: '#ffe2bd', font: JP });
      drawText(ctx, '処', W * 0.5, H * 0.36, { size: W * 0.42, color: '#ffe2bd', font: JP });
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.55;
      drawText(ctx, 'SAKE', W * 0.5, H * 0.56, { size: W * 0.16, color: '#ffc98c', font: FONT.en, letterSpacing: W * 0.02 });
      ctx.restore();
    }, 340);
    const mat = signMat(tex, 1.15);
    mesh(sz, new THREE.PlaneGeometry(0.32, 1.46), mat, [0.044, 0, 0], { ry: Math.PI / 2 });
    mesh(sz, new THREE.PlaneGeometry(0.32, 1.46), mat, [-0.044, 0, 0], { ry: -Math.PI / 2 });
    glow(group, 0xffb45e, 1.1, [-3.02, 3.7, -4.02], { opacity: 0.24 });
  }

  // ── 1.15 后方楼东立面灯箱（クリーニング） ────────────────────────────────
  {
    const lb = newGroup(group, [BB.x1 + 0.09, 2.08, -4.95], 'sign-cleaning');
    lb.rotation.y = Math.PI / 2;
    box(lb, [0.94, 0.3, 0.12], [0, 0, 0], MAT.darkMetal, { cast: true });
    const tex = panelTex(0.88, 0.26, (ctx, W, H) => {
      ctx.fillStyle = '#e9e2cd'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#1d3352';
      ctx.fillRect(0, 0, W, H * 0.06);
      ctx.fillRect(0, H * 0.94, W, H * 0.06);
      drawText(ctx, 'クリーニング', W * 0.5, H * 0.42, { size: H * 0.34, color: '#1d3352', font: JP, letterSpacing: W * 0.01 });
      drawText(ctx, '営業中', W * 0.5, H * 0.76, { size: H * 0.2, color: '#a03626', font: JP });
    }, 340);
    mesh(lb, new THREE.PlaneGeometry(0.88, 0.26), signMat(tex, 1.35), [0, 0, 0.065]);
    glow(lb, 0xfff0d0, 1.0, [0, 0, 0.3], { opacity: 0.3 });
  }

  // ── 1.16 巷子地面杂物（落在 0.10 的巷子地面上） ─────────────────────────
  const SHARED = { 0xc9a33a: MAT.crateY, 0xb8872e: MAT.crateY, 0xb04a30: MAT.crateR, 0x6b5a42: MAT.card, 0x5c4d39: MAT.card, 0x746149: MAT.card, 0x2f5f72: MAT.basket, 0x3d6b4a: MAT.basket, 0x6a5a3a: MAT.card, 0x4a5058: MAT.metal };
  function crateMesh(x, y, z, sx, sy, sz, color, ry) {
    const g = newGroup(group, [x, y, z]);
    g.rotation.y = ry || 0;
    const mat = SHARED[color] || MAT.card;
    box(g, [sx, sy, sz], [0, sy / 2, 0], mat, { cast: false });
    return g;
  }
  // 啤酒箱（黄 / 红）
  const crates = [
    [-4.62, -2.52, 0.42, 0.28, 0.32, 0xc9a33a, 0.1],
    [-4.62, -2.52, 0.42, 0.28, 0.32, 0xb8872e, 0.1],
    [-4.62, -2.52, 0.42, 0.28, 0.32, 0xc9a33a, 0.1],
    [-4.55, -2.86, 0.42, 0.28, 0.32, 0xb04a30, -0.08],
    [-4.55, -2.86, 0.42, 0.28, 0.32, 0xb04a30, -0.08],
  ];
  crates.forEach((c, i) => {
    const stack = i % 3;
    crateMesh(c[0], ALLEY_FLOOR + stack * 0.285, c[1], c[2], c[3], c[4], c[5], c[6]);
  });
  // 纸箱堆
  const boxMats = [0x6b5a42, 0x5c4d39, 0x746149];
  [[-3.5, -2.15, 0.46, 0.4, 0.42], [-3.52, -2.15, 0.4, 0.34, 0.36], [-4.42, -3.5, 0.5, 0.44, 0.46]]
    .forEach((b, i) => {
      const g = crateMesh(b[0], ALLEY_FLOOR + (i === 1 ? 0.4 : 0), b[1], b[2], b[3], b[4], boxMats[i % 3], i * 0.22);
      mesh(g, new THREE.PlaneGeometry(b[2] * 0.16, b[4] * 0.98), MAT.tape, [0, b[3] * 0.55, b[4] / 2 + 0.002]);
    });
  // 塑料筐
  crateMesh(-3.5, ALLEY_FLOOR, -3.02, 0.42, 0.22, 0.32, 0x2f5f72, 0.35);
  crateMesh(-3.5, ALLEY_FLOOR + 0.22, -3.02, 0.42, 0.22, 0.32, 0x3d6b4a, 0.1);
  // 扫帚（靠左墙）
  bar([-4.78, 0.86, -0.98], [0.028, 1.5, 0.028], [0, 0, -0.12], true);
  box(group, [0.2, 0.06, 0.16], [-4.84, ALLEY_FLOOR + 0.03, -1.03], MAT.card, {});
  // 水桶
  cylinder(group, 0.13, 0.15, 0.3, [-3.4, ALLEY_FLOOR + 0.15, -0.62], MAT.metal, { seg: 14 });

  // ── 1.17 实例化网格落地 ─────────────────────────────────────────────────
  function instMesh(list, geo, mat, opts = {}) {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    let colored = false;
    for (let i = 0; i < list.length; i++) {
      im.setMatrixAt(i, list[i].m);
      if (list[i].c) { im.setColorAt(i, list[i].c); colored = true; }
    }
    im.instanceMatrix.needsUpdate = true;
    if (colored && im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = !!opts.cast;
    im.receiveShadow = opts.receive !== false;
    im.frustumCulled = true;
    group.add(im);
    return im;
  }
  const geoBox = new THREE.BoxGeometry(1, 1, 0.07);
  const geoSill = new THREE.BoxGeometry(1, 1, 1);
  const geoMullV = new THREE.BoxGeometry(0.032, 1, 0.024);
  const geoMullH = new THREE.BoxGeometry(1, 0.032, 0.024);
  const geoPane = new THREE.PlaneGeometry(1, 1);
  const geoBar = new THREE.BoxGeometry(1, 1, 1);
  const geoCyl = new THREE.CylinderGeometry(1, 1, 1, 10);

  instMesh(inst.frame, geoBox, MAT.frame);
  instMesh(inst.sill, geoSill, MAT.concrete);
  instMesh(inst.mullV, geoMullV, MAT.frame);
  instMesh(inst.mullH, geoMullH, MAT.frame);

  const paneTex = (kind) => canvasTexture(160, 160, (ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);
    if (kind === 'warm') {
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, '#6d6558'); g.addColorStop(0.18, '#c9bda6');
      g.addColorStop(0.5, '#fff6e4'); g.addColorStop(0.82, '#c9bda6'); g.addColorStop(1, '#6d6558');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(80,68,56,0.18)'; ctx.fillRect(W * (0.05 + i * 0.16), 0, W * 0.035, H); }
      ctx.fillStyle = 'rgba(38,30,24,0.5)'; ctx.fillRect(0, H * 0.74, W, H * 0.26);
      ctx.fillStyle = 'rgba(255,255,240,0.55)';
      ctx.fillRect(W * 0.12, H * 0.1, W * 0.2, H * 0.5);
    } else if (kind === 'blind') {
      ctx.fillStyle = '#b9c4d0'; ctx.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 9) {
        ctx.fillStyle = 'rgba(38,48,60,0.55)';
        ctx.fillRect(0, y, W, 3);
        ctx.fillStyle = 'rgba(240,248,255,0.35)';
        ctx.fillRect(0, y + 3, W, 2);
      }
      ctx.fillStyle = 'rgba(220,235,250,0.22)';
      ctx.fillRect(0, H * 0.35, W, H * 0.16);
    } else {
      ctx.fillStyle = '#1b2531'; ctx.fillRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, 'rgba(130,175,215,0)');
      g.addColorStop(0.42, 'rgba(130,175,215,0.35)');
      g.addColorStop(0.56, 'rgba(130,175,215,0.05)');
      g.addColorStop(1, 'rgba(130,175,215,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(10,14,20,0.5)';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, W - 4, H - 4);
    }
  }, { anisotropy: 4 });

  const paneMatWarm = new THREE.MeshBasicMaterial({ map: paneTex('warm'), fog: false });
  const paneMatBlind = new THREE.MeshBasicMaterial({ map: paneTex('blind'), fog: false });
  const paneMatDark = new THREE.MeshBasicMaterial({ map: paneTex('dark'), fog: false });
  instMesh(inst.paneWarm, geoPane, paneMatWarm);
  instMesh(inst.paneBlind, geoPane, paneMatBlind);
  instMesh(inst.paneDark, geoPane, paneMatDark);

  instMesh(inst.barMetal, geoBar, MAT.metal);
  instMesh(inst.barDark, geoBar, MAT.darkMetal);
  instMesh(inst.cylMetal, geoCyl, MAT.metal);
  instMesh(inst.cylDark, geoCyl, MAT.darkMetal);

  // ── 1.18 动画 ────────────────────────────────────────────────────────────
  const fract = (v) => v - Math.floor(v);
  const hash = (n) => fract(Math.sin(n * 127.1) * 43758.5453);
  const state = { t: 0 };

  function update(t) {
    state.t = t;
    // 屋顶广告牌：偶发闪烁 + 呼吸
    const step = Math.floor(t * 6.5);
    const h = hash(step + 3.7);
    const dip = h > 0.9 ? 0.35 + 0.4 * hash(step + 11.3) : 1;
    const breathe = 0.92 + 0.08 * Math.sin(t * 2.2);
    karaMat.color.setScalar(1.15 * dip * breathe);
    karaGlow.material.opacity = 0.22 * dip * (0.9 + 0.1 * Math.sin(t * 2.2));
    // 远处电视窗：缓慢明暗 + 细碎抖动
    const slow = 0.5 + 0.5 * Math.sin(t * 0.33 + Math.sin(t * 0.11) * 2.1);
    const fast = 0.94 + 0.06 * Math.sin(t * 11.3) + 0.02 * Math.sin(t * 27.7);
    tvMat.color.setScalar((0.42 + 0.85 * slow) * fast);
    // 巷底小灯：轻微呼吸
    const lampPulse = 0.88 + 0.12 * Math.sin(t * 1.7 + 0.6);
    lampGlow.material.opacity = 0.5 * lampPulse;
    lampGlow2.material.opacity = 0.16 * lampPulse;
    bulb.material.color.setRGB(1.0 * (1 + 1.6 * lampPulse), 0.705 * (1 + 1.6 * lampPulse), 0.37 * (1 + 1.6 * lampPulse));
    // 天线障碍灯：慢速闪烁
    const blink = fract(t * 0.55) < 0.13 ? 1 : 0.1;
    warnMat.color.setRGB(1.9 * blink, 0.43 * blink, 0.28 * blink);
    warnGlow.material.opacity = 0.3 * blink;
    // 防盗灯微闪
    secGlow.material.opacity = 0.4 + 0.05 * Math.sin(t * 9.1);
    secGlow2.material.opacity = 0.35 + 0.04 * Math.sin(t * 7.7 + 1.2);
  }

  // ── 1.19 统计（截图 harness 会打印 console） ─────────────────────────────
  let meshes = 0, mats = new Set(), tris = 0;
  group.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const m = o.material;
    if (Array.isArray(m)) m.forEach((x) => mats.add(x.uuid));
    else if (m) mats.add(m.uuid);
    const g2 = o.geometry;
    if (g2 && g2.index) tris += g2.index.count / 3;
    else if (g2 && g2.attributes.position) tris += g2.attributes.position.count / 3;
  });
  console.log(`[buildings] meshes=${meshes} materials=${mats.size} tris=${Math.round(tris)}`);

  return { group, update };
}
