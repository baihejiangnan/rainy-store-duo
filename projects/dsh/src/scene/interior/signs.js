/* All in-world canvas signage for the konbini interior.
 * Each texture is drawn once and cached on the shared interior context.
 */
import { FONT } from '../../core/palette.js';
import { drawText, verticalText, magazineTexture, posterTexture } from '../../core/textures.js';

const JP = FONT.jp;
const JPD = FONT.jpDisplay;
const LAT = FONT.latin;
const LATB = FONT.latinBold;

function fillRR(ctx, x, y, w, h, r, color) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function makeSigns(I) {
  const C = I.canvas;
  const S = {};

  /* ---------- back drinks-fridge header lightbox ---------- */
  S.fridgeHeader = C('fridgeHeader', 1024, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#eaf8ff');
    g.addColorStop(0.55, '#cdeeff');
    g.addColorStop(1, '#aaddf4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // little snowflakes
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      const x = 24 + ((i * 137) % (w - 48));
      const y = 14 + ((i * 53) % (h - 28));
      const r = 3 + (i % 4);
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI;
        ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.stroke();
    }
    drawText(ctx, 'つめた〜い ドリンク', w * 0.42, h * 0.44, {
      family: JPD, size: 68, color: '#1c5a72', maxWidth: w * 0.6, letterSpacing: 2,
    });
    drawText(ctx, 'COLD DRINKS', w * 0.42, h * 0.82, {
      family: LAT, size: 26, color: '#3f8aa4', letterSpacing: 8,
    });
    // price badge
    ctx.save();
    ctx.translate(w * 0.86, h * 0.5);
    ctx.fillStyle = '#f05a4a';
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff7e4';
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    drawText(ctx, '¥100', 0, 2, { family: LAT, size: 24, color: '#c8402f' });
    drawText(ctx, 'より', 0, -24, { family: JP, size: 13, color: '#c8402f' });
    ctx.restore();
    ctx.strokeStyle = 'rgba(120,175,196,0.5)';
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, w - 6, h - 6);
  });

  /* ---------- inside of the fridge: lit back panel with rails ---------- */
  S.fridgeBack = C('fridgeBack', 512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f4fdff');
    g.addColorStop(0.45, '#dcf2fc');
    g.addColorStop(1, '#c4e5f4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // vertical cold-air ribs
    for (let x = 0; x < w; x += 42) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(x, 0, 7, h);
      ctx.fillStyle = 'rgba(140,190,215,0.22)';
      ctx.fillRect(x + 7, 0, 2, h);
    }
    // shelf rail shadows
    for (let y = 24; y < h; y += 46) {
      ctx.fillStyle = 'rgba(120,175,200,0.22)';
      ctx.fillRect(0, y, w, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(0, y + 3, w, 2);
    }
    // faint brand stickers
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    fillRR(ctx, w * 0.56, h * 0.1, 96, 26, 6, ctx.fillStyle);
    drawText(ctx, 'COLD', w * 0.56 + 48, h * 0.1 + 13, { family: LAT, size: 17, color: '#4b93ac' });
    fillRR(ctx, w * 0.08, h * 0.62, 90, 24, 6, 'rgba(255,255,255,0.85)');
    drawText(ctx, 'HIKARI', w * 0.08 + 45, h * 0.62 + 12, { family: LATB, size: 15, color: '#5d9bb0' });
  });

  /* ---------- shelf price rail strip ---------- */
  S.priceStrip = C('priceStrip', 1024, 64, (ctx, w, h) => {
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e6dcc6';
    ctx.fillRect(0, h - 8, w, 8);
    const prices = ['98', '128', '148', '108', '168', '138', '198', '118'];
    const cell = w / prices.length;
    for (let i = 0; i < prices.length; i++) {
      const x = i * cell;
      ctx.strokeStyle = 'rgba(150,140,120,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.lineTo(x, h - 6);
      ctx.stroke();
      const accent = i % 3 === 0 ? '#c8402f' : '#33403f';
      drawText(ctx, `¥${prices[i]}`, x + cell * 0.36, 30, { family: LAT, size: 26, color: accent });
      ctx.fillStyle = i % 3 === 0 ? '#f7c948' : '#e9e3d2';
      ctx.fillRect(x + cell * 0.62, 12, cell * 0.3, 22);
      drawText(ctx, '税込', x + cell * 0.77, 24, { family: JP, size: 14, color: '#4a463f' });
    }
  });

  /* ---------- small POP flags on the shelving ---------- */
  const pop = (key, bg, ink, big, small) => C(key, 128, 160, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    fillRR(ctx, 4, 24, w - 8, h - 34, 10, bg);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(w / 2 - 4, 8, 8, 20);
    drawText(ctx, big, w / 2, h * 0.44, { family: JP, size: 40, color: ink, maxWidth: w * 0.86 });
    drawText(ctx, small, w / 2, h * 0.72, { family: JP, size: 22, color: ink, maxWidth: w * 0.8 });
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(9, 29, w - 18, h - 44);
  });
  S.popSale = pop('popSale', '#f2c14e', '#5a3a12', 'SALE', 'おすすめ');
  S.popNew = pop('popNew', '#e0574c', '#fff6e6', 'NEW', '新発売');
  S.popOshi = pop('popOshi', '#2fa89b', '#f4fffb', '人気', 'No.1');

  /* ---------- hanging ceiling ads ---------- */
  S.adOnigiri = C('adOnigiri', 512, 288, (ctx, w, h) => {
    ctx.fillStyle = '#fff6df';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2fa89b';
    ctx.fillRect(0, 0, w, 16);
    ctx.fillStyle = '#ed8b4e';
    ctx.fillRect(0, h - 16, w, 16);
    // onigiri
    ctx.fillStyle = '#f4efe2';
    ctx.beginPath();
    ctx.moveTo(w * 0.24, h * 0.66);
    ctx.lineTo(w * 0.38, h * 0.30);
    ctx.lineTo(w * 0.52, h * 0.66);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2f4c3a';
    ctx.fillRect(w * 0.31, h * 0.54, w * 0.14, h * 0.13);
    drawText(ctx, 'おにぎり', w * 0.7, h * 0.40, { family: JPD, size: 54, color: '#2c6b66', maxWidth: w * 0.48 });
    drawText(ctx, '100円〜', w * 0.7, h * 0.62, { family: JPD, size: 58, color: '#d8564c', maxWidth: w * 0.5 });
    drawText(ctx, '炊きたて 毎日入荷', w * 0.7, h * 0.82, { family: JP, size: 24, color: '#5b5a52', maxWidth: w * 0.46 });
  });
  S.adKaraage = C('adKaraage', 512, 288, (ctx, w, h) => {
    ctx.fillStyle = '#2b2b33';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ed8b4e';
    ctx.fillRect(0, h - 20, w, 20);
    drawText(ctx, '新発売', w * 0.5, h * 0.22, { family: JPD, size: 40, color: '#ffd9a0' });
    drawText(ctx, 'からあげ', w * 0.5, h * 0.5, { family: JPD, size: 74, color: '#fff6df', maxWidth: w * 0.9 });
    drawText(ctx, 'ジューシー 5個入', w * 0.5, h * 0.72, { family: JP, size: 30, color: '#ffc59a' });
    drawText(ctx, '¥240', w * 0.5, h * 0.9, { family: LAT, size: 46, color: '#f2c14e' });
  });
  S.adCoffee = C('adCoffee', 512, 288, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#4a2f2a');
    g.addColorStop(1, '#6d4634');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    drawText(ctx, 'COFFEE', w * 0.5, h * 0.2, { family: LAT, size: 50, color: '#f3e2c4', letterSpacing: 5 });
    // cup
    ctx.fillStyle = '#f6efe2';
    ctx.beginPath();
    ctx.moveTo(w * 0.33, h * 0.36);
    ctx.lineTo(w * 0.67, h * 0.36);
    ctx.lineTo(w * 0.62, h * 0.7);
    ctx.lineTo(w * 0.38, h * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6b412c';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.38, w * 0.16, h * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(w * (0.42 + i * 0.08), h * 0.3);
      ctx.bezierCurveTo(w * (0.38 + i * 0.08), h * 0.22, w * (0.46 + i * 0.08), h * 0.16, w * (0.42 + i * 0.08), h * 0.08);
      ctx.stroke();
    }
    drawText(ctx, 'ホットコーヒー', w * 0.5, h * 0.8, { family: JPD, size: 42, color: '#f3e2c4', maxWidth: w * 0.8 });
    drawText(ctx, 'S ¥100 / M ¥130', w * 0.5, h * 0.92, { family: JP, size: 24, color: '#e9c194' });
  });
  S.adAtm = C('adAtm', 384, 224, (ctx, w, h) => {
    ctx.fillStyle = '#2f5f8c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f4f1e6';
    ctx.fillRect(16, 16, w - 32, h - 32);
    drawText(ctx, 'ATM', w * 0.5, h * 0.36, { family: LAT, size: 62, color: '#2f5f8c' });
    drawText(ctx, '24時間 ご利用いただけます', w * 0.5, h * 0.62, { family: JP, size: 22, color: '#4b4a45', maxWidth: w * 0.84 });
    drawText(ctx, 'ひかり銀行', w * 0.5, h * 0.8, { family: JP, size: 20, color: '#8b9095' });
  });

  /* ---------- counter menu boards ---------- */
  S.menuBoard = C('menuBoard', 512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#fff8e8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2fa89b';
    ctx.fillRect(0, 0, w, 54);
    drawText(ctx, 'ホットスナック・ドリンク', w * 0.5, 28, { family: JPD, size: 30, color: '#fff8e8', maxWidth: w * 0.92 });
    const rows = [
      ['からあげ', '¥240', '#d8564c'],
      ['フランクフルト', '¥180', '#a2653c'],
      ['ホットコーヒー', '¥100', '#6b412c'],
      ['おでん 各種', '¥90', '#2fa89b'],
    ];
    rows.forEach((r, i) => {
      const y = 92 + i * 56;
      ctx.fillStyle = '#f2eadb';
      ctx.fillRect(24, y - 22, w - 48, 46);
      drawText(ctx, r[0], 44, y, { family: JP, size: 30, color: '#3c3a35', align: 'left', maxWidth: w * 0.55 });
      drawText(ctx, r[1], w - 44, y, { family: LAT, size: 32, color: r[2], align: 'right' });
    });
    ctx.strokeStyle = 'rgba(120,110,95,0.4)';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);
  });

  S.cashierSign = C('cashierSign', 384, 192, (ctx, w, h) => {
    ctx.fillStyle = '#fff6df';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2fa89b';
    ctx.fillRect(0, 0, w, 14);
    ctx.fillStyle = '#ed8b4e';
    ctx.fillRect(0, h - 14, w, 14);
    drawText(ctx, 'お会計', w * 0.5, h * 0.42, { family: JPD, size: 72, color: '#2c6b66', maxWidth: w * 0.9 });
    drawText(ctx, 'CASHIER', w * 0.5, h * 0.74, { family: LAT, size: 30, color: '#d1773f', letterSpacing: 6 });
  });

  /* ---------- equipment screens / panels ---------- */
  S.coffeeFront = C('coffeeFront', 256, 320, (ctx, w, h) => {
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f3e7d2';
    ctx.fillRect(14, 12, w - 28, 62);
    drawText(ctx, 'COFFEE', w * 0.5, 34, { family: LAT, size: 30, color: '#5a3d2a', letterSpacing: 4 });
    drawText(ctx, '¥100', w * 0.5, 62, { family: LAT, size: 20, color: '#b5733f' });
    // screen
    ctx.fillStyle = '#123321';
    ctx.fillRect(26, 90, w - 52, 66);
    ctx.fillStyle = '#8fe3a8';
    ctx.font = `700 22px ${JP}`;
    ctx.fillText('S  M  L', 44, 130);
    // buttons
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = ['#f2c14e', '#e0574c', '#7fd6c8'][i];
      ctx.beginPath();
      ctx.arc(58 + i * 70, 206, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.fillStyle = '#20242c';
    ctx.fillRect(26, 244, w - 52, 60);
    ctx.fillStyle = '#8f959f';
    ctx.fillRect(40, 258, w - 80, 6);
    drawText(ctx, 'HOT', w * 0.5, 286, { family: LAT, size: 20, color: '#e9b06f' });
  });
  S.coffeeBackLabel = C('coffeeBackLabel', 192, 96, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,248,232,0.92)';
    fillRR(ctx, 2, 2, w - 4, h - 4, 8, ctx.fillStyle);
    drawText(ctx, 'COFFEE', w * 0.5, h * 0.36, { family: LAT, size: 30, color: '#4a2f2a' });
    drawText(ctx, 'ひきたて', w * 0.5, h * 0.7, { family: JP, size: 20, color: '#8b6b4a' });
  });
  S.registerScreen = C('registerScreen', 256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#0d2b22';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#123f31';
    ctx.fillRect(0, 0, w, 30);
    drawText(ctx, 'POS レジ', 12, 15, { family: JP, size: 17, color: '#9fe6bd', align: 'left' });
    const items = [['おにぎり', '128'], ['コーヒー', '100'], ['からあげ', '240']];
    items.forEach((it, i) => {
      drawText(ctx, it[0], 16, 54 + i * 28, { family: JP, size: 18, color: '#c9f0d6', align: 'left' });
      drawText(ctx, `¥${it[1]}`, w - 16, 54 + i * 28, { family: LAT, size: 18, color: '#c9f0d6', align: 'right' });
    });
    ctx.fillStyle = '#8fe3a8';
    ctx.fillRect(0, h - 46, w, 46);
    drawText(ctx, '合計 ¥468', 16, h - 23, { family: JPD, size: 26, color: '#0d2b22', align: 'left' });
    // scan lines
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  });
  S.customerDisplay = C('customerDisplay', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#10261f';
    ctx.fillRect(0, 0, w, h);
    drawText(ctx, 'いらっしゃいませ', w * 0.5, 30, { family: JP, size: 24, color: '#9fe6bd' });
    drawText(ctx, '合計', w * 0.28, 74, { family: JP, size: 26, color: '#e9f6ee', align: 'right' });
    drawText(ctx, '¥1,280', w * 0.82, 76, { family: LAT, size: 40, color: '#ffe09a', align: 'right' });
    drawText(ctx, 'ありがとうございました', w * 0.5, 110, { family: JP, size: 16, color: '#7fbf9d' });
  });
  S.cardReader = C('cardReader', 160, 128, (ctx, w, h) => {
    ctx.fillStyle = '#1c2a34';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7fe6c0';
    ctx.fillRect(14, 12, w - 28, 52);
    drawText(ctx, '¥1,280', w * 0.5, 40, { family: LAT, size: 26, color: '#0f2b22' });
    ctx.fillStyle = '#e9e2d2';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        fillRR(ctx, 22 + c * 38, 74 + r * 16, 30, 12, 3, ctx.fillStyle);
      }
    }
  });
  S.odenLabel = C('odenLabel', 224, 112, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    fillRR(ctx, 2, 2, w - 4, h - 4, 10, '#fff6e2');
    ctx.fillStyle = '#c8402f';
    ctx.fillRect(6, 6, w - 12, 34);
    drawText(ctx, 'おでん', w * 0.5, 24, { family: JPD, size: 28, color: '#fff6e2' });
    drawText(ctx, '各 ¥90', w * 0.5, 62, { family: JPD, size: 30, color: '#8b4a2f' });
    drawText(ctx, 'だいこん・たまご・こんにゃく', w * 0.5, 92, { family: JP, size: 15, color: '#6b6157', maxWidth: w * 0.9 });
  });
  S.hotLabel = C('hotLabel', 224, 112, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    fillRR(ctx, 2, 2, w - 4, h - 4, 10, '#2b2b33');
    ctx.fillStyle = '#ed8b4e';
    ctx.fillRect(6, 6, w - 12, 34);
    drawText(ctx, 'ホットスナック', w * 0.5, 24, { family: JPD, size: 24, color: '#2b2b33', maxWidth: w * 0.9 });
    drawText(ctx, 'あげたて', w * 0.5, 62, { family: JPD, size: 28, color: '#ffd9a0' });
    drawText(ctx, 'からあげ ¥240', w * 0.5, 92, { family: JP, size: 17, color: '#f2c14e' });
  });

  S.coolerPlate = C('coolerPlate', 192, 96, (ctx, w, h) => {
    ctx.fillStyle = '#f2f9fc';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#8fbfd2';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    drawText(ctx, 'COLD', w * 0.5, h * 0.36, { family: LAT, size: 34, color: '#3f8aa4', letterSpacing: 4 });
    drawText(ctx, 'つめた〜い', w * 0.5, h * 0.72, { family: JP, size: 20, color: '#5d9bb0' });
  });

  /* ---------- ice cream freezer ---------- */
  S.iceCreamSign = C('iceCreamSign', 384, 192, (ctx, w, h) => {
    ctx.fillStyle = '#eaf6fb';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4b93c4';
    ctx.fillRect(0, 0, w, 12);
    drawText(ctx, 'アイスクリーム', w * 0.5, h * 0.36, { family: JPD, size: 40, color: '#2f5a78', maxWidth: w * 0.92 });
    drawText(ctx, 'ICE CREAM', w * 0.5, h * 0.62, { family: LAT, size: 26, color: '#4b93c4', letterSpacing: 5 });
    // cones
    for (let i = 0; i < 3; i++) {
      const x = w * (0.28 + i * 0.22);
      ctx.fillStyle = ['#f7d2d9', '#cbe6d2', '#f5e6a8'][i];
      ctx.beginPath();
      ctx.arc(x, h * 0.82, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d9a05b';
      ctx.beginPath();
      ctx.moveTo(x - 12, h * 0.87);
      ctx.lineTo(x + 12, h * 0.87);
      ctx.lineTo(x, h * 0.99);
      ctx.closePath();
      ctx.fill();
    }
  });

  /* ---------- ATM ---------- */
  S.atmHeader = C('atmHeader', 256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#2f5f8c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f4f8fb';
    ctx.fillRect(8, 8, w - 16, h - 16);
    drawText(ctx, 'ATM', w * 0.5, h * 0.44, { family: LAT, size: 44, color: '#2f5f8c' });
    drawText(ctx, '24時間', w * 0.5, h * 0.8, { family: JP, size: 18, color: '#5a6b7a' });
  });
  S.atmScreen = C('atmScreen', 256, 224, (ctx, w, h) => {
    ctx.fillStyle = '#123a52';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#eaf6ff';
    ctx.fillRect(12, 12, w - 24, 44);
    drawText(ctx, 'お引き出し', w * 0.5, 34, { family: JP, size: 24, color: '#123a52' });
    drawText(ctx, '金額を選んでください', w * 0.5, 80, { family: JP, size: 18, color: '#bfe4f2' });
    const amts = ['¥5,000', '¥10,000', '¥20,000'];
    amts.forEach((a, i) => {
      ctx.fillStyle = '#2f6f92';
      ctx.fillRect(24, 104 + i * 36, w - 48, 30);
      drawText(ctx, a, w * 0.5, 119 + i * 36, { family: LAT, size: 20, color: '#eaf6ff' });
    });
  });
  S.atmKeypad = C('atmKeypad', 192, 128, (ctx, w, h) => {
    ctx.fillStyle = '#4a5560';
    ctx.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = '#d9dee2';
        fillRR(ctx, 18 + c * 56, 12 + r * 28, 46, 22, 4, ctx.fillStyle);
      }
    }
  });

  /* ---------- window / wall decor ---------- */
  S.bannerStrip = C('bannerStrip', 1024, 112, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(70,60,50,0.65)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.quadraticCurveTo(w / 2, 26, w, 10);
    ctx.stroke();
    const label = ['SALE', 'セール', 'NEW', 'ポイント2倍', 'おすすめ', 'SALE', 'セール'];
    const n = label.length;
    for (let i = 0; i < n; i++) {
      const cx = (i + 0.5) * (w / n);
      const col = i % 2 === 0 ? '#2fa89b' : '#ed8b4e';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(cx - w / n / 2 + 6, 18);
      ctx.lineTo(cx + w / n / 2 - 6, 18);
      ctx.lineTo(cx, h - 8);
      ctx.closePath();
      ctx.fill();
      drawText(ctx, label[i], cx, 48, { family: JPD, size: label[i].length > 3 ? 19 : 27, color: '#fff8e8', maxWidth: w / n - 22 });
    }
  });
  S.floorStickerRegister = C('floorStickerRegister', 320, 160, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 0.9;
    fillRR(ctx, 4, 4, w - 8, h - 8, 22, 'rgba(255,247,225,0.92)');
    ctx.restore();
    drawText(ctx, 'レジはこちら', w * 0.5, h * 0.4, { family: JPD, size: 44, color: '#2c6b66', maxWidth: w * 0.9 });
    drawText(ctx, 'CASHIER', w * 0.5, h * 0.72, { family: LAT, size: 26, color: '#d1773f', letterSpacing: 4 });
  });
  S.floorStickerBento = C('floorStickerBento', 320, 160, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 0.88;
    fillRR(ctx, 4, 4, w - 8, h - 8, 22, 'rgba(255,246,222,0.9)');
    ctx.restore();
    drawText(ctx, 'おにぎり・お弁当', w * 0.5, h * 0.38, { family: JPD, size: 34, color: '#8b4a2f', maxWidth: w * 0.9 });
    drawText(ctx, 'FRESH FOOD', w * 0.5, h * 0.7, { family: LAT, size: 24, color: '#c99a5f', letterSpacing: 3 });
  });
  S.clockFace = C('clockFace', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#fbf7ec';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2c303c';
    ctx.lineWidth = 10;
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.strokeStyle = '#43434d';
      ctx.lineWidth = i % 3 === 0 ? 8 : 4;
      ctx.beginPath();
      ctx.moveTo(w / 2 + Math.sin(a) * 96, h / 2 - Math.cos(a) * 96);
      ctx.lineTo(w / 2 + Math.sin(a) * 112, h / 2 - Math.cos(a) * 112);
      ctx.stroke();
    }
    // hands at ~21:40
    ctx.strokeStyle = '#2c303c';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(w / 2 - 46, h / 2 + 30);
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(w / 2 + 62, h / 2 - 24);
    ctx.stroke();
    ctx.fillStyle = '#ed8b4e';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 10, 0, Math.PI * 2);
    ctx.fill();
  });
  S.noticeBoard = C('noticeBoard', 320, 240, (ctx, w, h) => {
    ctx.fillStyle = '#8b6b44';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f1e8d2';
    const papers = [
      [18, 18, 132, 96, '#f6f0df', 'シフト表'],
      [168, 26, 132, 88, '#eaf1f6', '防災訓練'],
      [30, 132, 120, 88, '#f6ecd9', 'お知らせ'],
      [172, 140, 130, 84, '#f4e3e8', '衛生点検'],
    ];
    for (const p of papers) {
      ctx.fillStyle = p[4];
      ctx.fillRect(p[0], p[1], p[2], p[3]);
      ctx.strokeStyle = 'rgba(80,70,55,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(p[0], p[1], p[2], p[3]);
      drawText(ctx, p[5], p[0] + p[2] / 2, p[1] + 22, { family: JP, size: 20, color: '#4a453d', maxWidth: p[2] - 12 });
      ctx.fillStyle = 'rgba(90,80,65,0.35)';
      for (let i = 0; i < 4; i++) ctx.fillRect(p[0] + 12, p[1] + 44 + i * 12, p[2] - 30 - (i % 2) * 20, 4);
      ctx.fillStyle = '#c8402f';
      ctx.beginPath();
      ctx.arc(p[0] + p[2] / 2, p[1] + 6, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  S.staffSign = C('staffSign', 256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#f4efe2';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c8402f';
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    drawText(ctx, 'STAFF ONLY', w * 0.5, h * 0.38, { family: LAT, size: 30, color: '#c8402f' });
    drawText(ctx, '関係者以外 立入禁止', w * 0.5, h * 0.72, { family: JP, size: 16, color: '#4a453d', maxWidth: w * 0.9 });
  });
  S.lockerPlate = C('lockerPlate', 96, 64, (ctx, w, h) => {
    ctx.fillStyle = '#e9e4d5';
    ctx.fillRect(0, 0, w, h);
    drawText(ctx, '01', w * 0.5, h * 0.5, { family: LAT, size: 38, color: '#3a3a42' });
  });
  S.fireExtSign = C('fireExtSign', 160, 160, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#c8402f';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6e2';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 18, 0, Math.PI * 2);
    ctx.fill();
    drawText(ctx, '消火器', w / 2, h * 0.44, { family: JPD, size: 34, color: '#c8402f', maxWidth: w * 0.8 });
    drawText(ctx, 'FIRE', w / 2, h * 0.68, { family: LAT, size: 22, color: '#c8402f' });
  });
  S.newGoods = C('newGoods', 256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#fff6df';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2fa89b';
    ctx.fillRect(0, 0, w, 34);
    drawText(ctx, '新商品', w * 0.5, 17, { family: JPD, size: 24, color: '#fff6df' });
    drawText(ctx, 'いちごフェア', w * 0.5, h * 0.5, { family: JPD, size: 32, color: '#d8564c', maxWidth: w * 0.9 });
    drawText(ctx, '期間限定', w * 0.5, h * 0.72, { family: JP, size: 20, color: '#5b5a52' });
    ctx.fillStyle = '#f2c14e';
    drawText(ctx, '今週入荷', w * 0.5, h * 0.9, { family: JP, size: 18, color: '#8b6a2f' });
  });

  S.magHeader = C('magHeader', 384, 96, (ctx, w, h) => {
    ctx.fillStyle = '#2fa89b';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f6f1e4';
    ctx.fillRect(0, h - 10, w, 10);
    drawText(ctx, '雑誌・コミック', w * 0.5, h * 0.36, { family: JPD, size: 40, color: '#fff6e2', maxWidth: w * 0.92 });
    drawText(ctx, 'MAGAZINE', w * 0.5, h * 0.74, { family: LAT, size: 24, color: '#f7d9a8' });
  });
  S.iceFreezerHeader = C('iceFreezerHeader', 384, 120, (ctx, w, h) => {
    ctx.fillStyle = '#e9f5fb';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4eb4d8';
    ctx.fillRect(0, 0, w, 30);
    drawText(ctx, 'アイスクリーム', w * 0.5, h * 0.32, { family: JPD, size: 34, color: '#1e6b8a', maxWidth: w * 0.92 });
    drawText(ctx, 'ICE CREAM', w * 0.5, h * 0.58, { family: LAT, size: 26, color: '#3e7fb5' });
    drawText(ctx, '-18℃ キンキン', w * 0.5, h * 0.82, { family: JP, size: 20, color: '#5b606d' });
  });

  /* ---------- magazine covers (reuse the core generator) ---------- */
  S.magazines = [];
  for (let i = 0; i < 6; i++) {
    S.magazines.push(magazineTexture({ w: 160, h: 216, seed: 31, idx: i }));
  }
  S.posters = {
    sale: posterTexture({ kind: 'sale', seed: 41 }),
    onigiri: posterTexture({ kind: 'onigiri', seed: 42 }),
    coffee: posterTexture({ kind: 'coffee', seed: 43 }),
    ice: posterTexture({ kind: 'ice', seed: 44 }),
    notice: posterTexture({ kind: 'notice', seed: 45 }),
    new: posterTexture({ kind: 'new', seed: 46 }),
  };

  return S;
}
