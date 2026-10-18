// ─────────────────────────────────────────────────────────────────────────────
// street.js — the ground system of the rainy-night konbini diorama.
//
//   · wet asphalt (south + east road, L junction)
//   · raised sidewalks with a rounded street corner, curb + gutter + grates
//   · crosswalks, edge lines, centre dashes, stop lines, parking bays
//   · tactile paving (点字ブロック) to both crossings
//   · static puddles, manholes, alley floor, entry apron
//
// Everything lives inside the 12 × 12 base; y = 0 is the asphalt surface.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import {
  Y, LAYOUT, PAL, M, canvasTexture, mesh, box, plane, label, addOutline,
  rng, drawText, FONT,
} from './core.js';

// ── plan constants, all derived from LAYOUT ─────────────────────────────────
const HB = LAYOUT.baseHalf;            // 6.0
const SW = LAYOUT.sidewalk;
const RD = LAYOUT.road;
const AL = LAYOUT.alley;
const ST = LAYOUT.store;

const EDGE_Z = SW.southZ1;             // 2.60 — curb line along the south road
const EDGE_X = RD.eastX0;              // 4.00 — curb line along the east road
const CORNER_R = 0.6;                  // rounded street-corner radius
const CX = EDGE_X - CORNER_R;          // 3.40 — corner arc centre
const CZ = EDGE_Z - CORNER_R;          // 2.00
const CURB_W = 0.16;
const CURB_H = 0.135;
const CURB_LIP = 0.015;                // curb overhangs the pavement a touch
const GUTTER_W = 0.20;
const TILE = 0.30;                     // tactile tile pitch
const PAINT_Y = 0.005;                 // road paint sits above the asphalt
const WALK_PAINT_Y = Y.sidewalk + 0.003;

// tactile path lines
const TACT_Z = 1.80;                   // run along the south walk
const TACT_X = 3.35;                   // run along the east walk

// ═════════════════════════════════════════════════════════════════════════════
// 0 · plan-geometry helpers
// ═════════════════════════════════════════════════════════════════════════════

/** Shape stored in plan coords [x, z]. shape.y = -z, so rotateX(-90°) lands it. */
function planShape(pts) {
  const s = new THREE.Shape();
  pts.forEach(([x, z], i) => { i ? s.lineTo(x, -z) : s.moveTo(x, -z); });
  s.closePath();
  return s;
}

/** Extrude a closed plan polygon upward from y to y + depth (no bevel).
 *  ExtrudeGeometry cap UVs are raw plan metres → textures tile in world space. */
function planExtrude(parent, pts, depth, mat, y = 0, opts = {}) {
  const geo = new THREE.ExtrudeGeometry(planShape(pts), {
    depth, bevelEnabled: false, steps: 1, curveSegments: 1,
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.receiveShadow = true;
  m.castShadow = !!opts.cast;
  if (opts.name) m.name = opts.name;
  parent.add(m);
  return m;
}

/** Flat plan polygon lying on the ground. */
function planFlat(parent, pts, mat, y, opts = {}) {
  const geo = new THREE.ShapeGeometry(planShape(pts));
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.receiveShadow = opts.receive !== false;
  m.renderOrder = opts.renderOrder || 0;
  if (opts.name) m.name = opts.name;
  parent.add(m);
  return m;
}

function arcPts(cx, cz, r, a0, a1, seg = 12) {
  const out = [];
  for (let i = 0; i <= seg; i++) {
    const a = a0 + (a1 - a0) * (i / seg);
    out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
  }
  return out;
}

/** Points along the road-facing pavement edge, offset d metres outward
 *  (positive = into the road). Runs south end → east end. */
function edgeCurve(d, seg = 14) {
  return [
    [-HB, EDGE_Z + d],
    [CX, EDGE_Z + d],
    ...arcPts(CX, CZ, CORNER_R + d, Math.PI / 2, 0, seg).slice(1),
    [EDGE_X + d, -HB],
  ];
}

/** Closed L-band between two offsets of the road edge (curb, gutter). */
function edgeBand(dOut, dIn) {
  return [...edgeCurve(dOut), ...edgeCurve(dIn).reverse()];
}

/** Sample a polyline every `spacing` metres; returns {x, z, rot} where rot
 *  aligns a quad's local +z with the local tangent. */
function samplePath(pts, spacing, startOffset = 0) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(l);
    total += l;
  }
  const out = [];
  for (let d = startOffset; d < total; d += spacing) {
    let rem = d, k = 0;
    while (k < seg.length && rem > seg[k]) { rem -= seg[k]; k++; }
    if (k >= seg.length) break;
    const [x0, z0] = pts[k], [x1, z1] = pts[k + 1];
    const t = rem / seg[k];
    out.push({
      x: x0 + (x1 - x0) * t,
      z: z0 + (z1 - z0) * t,
      rot: Math.atan2(x1 - x0, z1 - z0),
    });
  }
  return out;
}

/** Instanced flat quads lying on the ground. items: {x,y,z,rot,sx,sz,color} */
let _quadGeo = null;
function flatQuads(parent, mat, items, opts = {}) {
  if (!_quadGeo) {
    _quadGeo = new THREE.PlaneGeometry(1, 1);
    _quadGeo.rotateX(-Math.PI / 2);
  }
  const im = new THREE.InstancedMesh(_quadGeo, mat, items.length);
  const d = new THREE.Object3D();
  const c = new THREE.Color();
  let tinted = false;
  items.forEach((it, i) => {
    d.position.set(it.x, it.y, it.z);
    d.rotation.set(0, it.rot || 0, 0);
    d.scale.set(it.sx, 1, it.sz);
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
    if (it.color !== undefined) { im.setColorAt(i, c.set(it.color)); tinted = true; }
  });
  im.instanceMatrix.needsUpdate = true;
  if (tinted && im.instanceColor) im.instanceColor.needsUpdate = true;
  im.receiveShadow = opts.receive !== false;
  im.castShadow = false;
  im.renderOrder = opts.renderOrder || 0;
  if (opts.name) im.name = opts.name;
  parent.add(im);
  return im;
}

/** All flat quads merged into ONE geometry, with world-space UVs — used for the
 *  road paint so a worn-paint texture tiles in metres across every mark.
 *  items: {x,y,z,rot,sx,sz}. opts: {uvScale, jitter, seed, renderOrder}. */
function mergedQuads(parent, mat, items, opts = {}) {
  const k = opts.uvScale === undefined ? 0.5 : opts.uvScale;
  const jit = opts.jitter || 0;
  const r = rng(opts.seed === undefined ? 5150 : opts.seed);
  const pos = [], nor = [], uv = [], idx = [];
  let v = 0;
  for (const it of items) {
    const sx = it.sx * (1 + (r() - 0.5) * jit);
    const sz = it.sz * (1 + (r() - 0.5) * jit);
    const ox = (r() - 0.5) * jit * 0.7, oz = (r() - 0.5) * jit * 0.7;
    const c = Math.cos(it.rot || 0), s = Math.sin(it.rot || 0);
    for (const [u, w] of [[-1, -1], [-1, 1], [1, 1], [1, -1]]) {
      const lx = (u * sx) * 0.5, lz = (w * sz) * 0.5;
      const x = it.x + lx * c + lz * s + ox;
      const z = it.z - lx * s + lz * c + oz;
      pos.push(x, it.y, z);
      nor.push(0, 1, 0);
      uv.push(x * k, z * k);
    }
    idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
    v += 4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = opts.receive !== false;
  m.castShadow = false;
  m.renderOrder = opts.renderOrder || 0;
  if (opts.name) m.name = opts.name;
  parent.add(m);
  return m;
}

// ═════════════════════════════════════════════════════════════════════════════
// 1 · canvas textures
// ═════════════════════════════════════════════════════════════════════════════

/** Worn road paint: white body, grime speckle, chipped alpha (tiles in metres). */
function paintWearTexture() {
  return canvasTexture(512, 512, (ctx, W, H) => {
    const r = rng(4242);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    // grime + aggregate showing through the paint film
    for (let i = 0; i < 1400; i++) {
      const v = 150 + Math.floor(r() * 60);
      ctx.fillStyle = `rgba(${v},${v + 3},${v + 7},${0.04 + r() * 0.1})`;
      const s = 1 + r() * 2.0;
      ctx.fillRect(r() * W, r() * H, s, s);
    }
    // old patchy repairs (very faint only — big smudges read as mould)
    for (let i = 0; i < 16; i++) {
      const x = r() * W, y = r() * H, rad = 8 + r() * 26;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(168,176,184,${0.02 + r() * 0.05})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // chipped / worn-through spots: small, hard-edged, so the asphalt shows
    // through as chips instead of soft dirty smears
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 165; i++) {
      const x = r() * W, y = r() * H, rad = 1.2 + r() * 3.1;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(0,0,0,${0.2 + r() * 0.4})`);
      g.addColorStop(0.72, `rgba(0,0,0,${0.12 + r() * 0.3})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // fine scratching across the paint
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.06 + r() * 0.16})`;
      ctx.lineWidth = 1 + r() * 1.2;
      ctx.beginPath();
      const x = r() * W, y = r() * H;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 44, y + (r() - 0.5) * 12);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, { wrap: true, anisotropy: 8 });
}

/** Wet asphalt: damp blotches, long water streaks, aggregate grain, cracks. */
function asphaltTexture() {
  return canvasTexture(1024, 1024, (ctx, W, H) => {
    const r = rng(91113);
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, W, H);

    // broad damp patches (the wet look reads mostly from these)
    for (let i = 0; i < 110; i++) {
      const x = r() * W, y = r() * H, rad = 30 + r() * 220;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const wet = r() < 0.76;
      const a = wet ? 0.07 + r() * 0.26 : 0.05 + r() * 0.11;
      g.addColorStop(0, wet ? `rgba(6,10,17,${a})` : `rgba(255,255,255,${a * 0.7})`);
      g.addColorStop(0.6, wet ? `rgba(6,10,17,${a * 0.55})` : `rgba(255,255,255,${a * 0.35})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // damp mottling at a finer scale (keeps the surface from reading flat)
    for (let i = 0; i < 260; i++) {
      const x = r() * W, y = r() * H, rad = 8 + r() * 44;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const dark = r() < 0.62;
      g.addColorStop(0, dark ? `rgba(5,9,15,${0.10 + r() * 0.22})` : `rgba(210,222,240,${0.05 + r() * 0.12})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // standing-water streaks (soft dark bands)
    for (let i = 0; i < 14; i++) {
      ctx.save();
      ctx.translate(r() * W, r() * H);
      ctx.rotate((r() - 0.5) * 0.5);
      const g = ctx.createLinearGradient(0, -100, 0, 100);
      g.addColorStop(0, 'rgba(7,11,17,0)');
      g.addColorStop(0.5, `rgba(7,11,17,${0.07 + r() * 0.13})`);
      g.addColorStop(1, 'rgba(7,11,17,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-W * 0.5, -100, W, 200);
      ctx.restore();
    }
    // patched repairs
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(34,39,47,${0.12 + r() * 0.18})`;
      ctx.fillRect(r() * W, r() * H, 110 + r() * 240, 80 + r() * 190);
    }
    // aggregate grain
    for (let i = 0; i < 9000; i++) {
      const v = 70 + Math.floor(r() * 175);
      ctx.fillStyle = `rgba(${v},${v},${v + 8},${0.10 + r() * 0.42})`;
      const s = r() < 0.9 ? 1 : 2;
      ctx.fillRect(r() * W, r() * H, s, s);
    }
    // cracks / tar seams
    for (let i = 0; i < 11; i++) {
      ctx.strokeStyle = 'rgba(5,8,13,0.5)';
      ctx.lineWidth = 1 + r() * 2;
      ctx.beginPath();
      let x = r() * W, y = r() * H;
      ctx.moveTo(x, y);
      for (let k = 0; k < 7; k++) {
        x += (r() - 0.5) * 110;
        y += (r() - 0.5) * 130;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, { wrap: true, repeat: [3, 3], anisotropy: 8 });
}

/** Additive sky-sheen overlay for the wet asphalt. */
function sheenTexture() {
  return canvasTexture(512, 512, (ctx, W, H) => {
    const r = rng(31337);
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y = r() * H, rad = 30 + r() * 130;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(140,175,225,${0.03 + r() * 0.06})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // long vertical streaks of reflected sky
    for (let i = 0; i < 30; i++) {
      const x = r() * W, y = r() * H, w = 3 + r() * 13, h = 60 + r() * 240;
      const g = ctx.createLinearGradient(x, y - h, x, y + h);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, `rgba(150,188,240,${0.06 + r() * 0.13})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - w / 2, y - h, w, h * 2);
    }
  }, { wrap: true, repeat: [2, 2] });
}

/** Concrete pavement, 2 × 2 slabs of 0.60 m inside a 1.20 m tile. */
function sidewalkTexture() {
  return canvasTexture(512, 512, (ctx, W, H) => {
    const r = rng(4411);
    const n = 2, cell = W / n;
    ctx.fillStyle = '#dedede';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = 198 + Math.floor(r() * 46);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(i * cell + 2, j * cell + 2, cell - 4, cell - 4);
      }
    }
    // fine aggregate
    for (let i = 0; i < 2600; i++) {
      const v = 130 + Math.floor(r() * 125);
      ctx.fillStyle = `rgba(${v},${v},${v},${0.10 + r() * 0.35})`;
      ctx.fillRect(r() * W, r() * H, r() < 0.8 ? 1 : 2, 1);
    }
    // damp stains
    for (let i = 0; i < 16; i++) {
      const x = r() * W, y = r() * H, rad = 20 + r() * 90;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(56,60,68,${0.05 + r() * 0.13})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // slab joints (drawn on the tile edges so they wrap into a clean grid)
    ctx.fillStyle = 'rgba(58,62,70,0.60)';
    for (let i = 0; i <= n; i++) {
      ctx.fillRect(i * cell - 1, 0, 2, H);
      ctx.fillRect(0, i * cell - 1, W, 2);
    }
    // a couple of hairline cracks
    ctx.strokeStyle = 'rgba(48,52,60,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      let x = r() * W, y = r() * H;
      ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (r() - 0.5) * 70; y += (r() - 0.5) * 70;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, { wrap: true, repeat: [1 / 1.2, 1 / 1.2], anisotropy: 8 });
}

/** Alley: damp gravel concrete, darker and dirtier than the pavement. */
function alleyTexture() {
  return canvasTexture(512, 512, (ctx, W, H) => {
    const r = rng(5150);
    ctx.fillStyle = '#cfcfcf';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5200; i++) {
      const v = 90 + Math.floor(r() * 165);
      ctx.fillStyle = `rgba(${v},${v},${v - 4},${0.16 + r() * 0.5})`;
      const s = r() < 0.82 ? 1 : 2 + (r() < 0.25 ? 1 : 0);
      ctx.fillRect(r() * W, r() * H, s, s);
    }
    // broad damp / oil patches
    for (let i = 0; i < 22; i++) {
      const x = r() * W, y = r() * H, rad = 25 + r() * 130;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(28,32,38,${0.08 + r() * 0.2})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // expansion joints
    ctx.fillStyle = 'rgba(64,68,74,0.45)';
    for (let i = 1; i < 3; i++) {
      ctx.fillRect(0, (i * H) / 3, W, 2);
    }
  }, { wrap: true, repeat: [1 / 1.5, 1 / 1.5] });
}

/** Metal gutter grate, slots running along the tile's +v. */
function grateTexture() {
  return canvasTexture(128, 256, (ctx, W, H) => {
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, 0, W, H);
    // side rails
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, 0, 12, H);
    ctx.fillRect(W - 12, 0, 12, H);
    ctx.fillStyle = '#5c5c5c';
    ctx.fillRect(10, 0, 3, H);
    ctx.fillRect(W - 13, 0, 3, H);
    // slots
    const n = 7;
    for (let i = 0; i < n; i++) {
      const y = 10 + (i * (H - 20)) / n;
      const h = (H - 20) / n - 9;
      ctx.fillStyle = '#101010';
      ctx.fillRect(16, y, W - 32, h);
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(16, y + h - 3, W - 32, 3);
    }
    // transverse bands
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(0, H * 0.5 - 5, W, 10);
    ctx.fillStyle = '#6a6a6a';
    ctx.fillRect(0, H * 0.5 + 5, W, 3);
  });
}

/** 点字ブロック: bar tile (directional) / dot tile (warning). */
function tactileTexture(kind) {
  return canvasTexture(128, 128, (ctx, W, H) => {
    ctx.fillStyle = '#b7b7b7';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#efefef';
    if (kind === 'bar') {
      for (let i = 0; i < 4; i++) {
        const x = 12 + i * 28;
        ctx.fillRect(x, 8, 16, H - 16);
        ctx.fillStyle = '#8d8d8d';
        ctx.fillRect(x + 16, 8, 3, H - 16);
        ctx.fillStyle = '#efefef';
      }
    } else {
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          const x = 13 + i * 25, y = 13 + j * 25;
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#8d8d8d';
          ctx.beginPath();
          ctx.arc(x + 1, y + 2, 8.5, 0.1, Math.PI);
          ctx.fill();
          ctx.fillStyle = '#efefef';
        }
      }
    }
    // wet speckle
    const r = rng(kind === 'bar' ? 12 : 34);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(40,44,50,${0.04 + r() * 0.12})`;
      ctx.fillRect(r() * W, r() * H, 2, 2);
    }
  }, { wrap: true, anisotropy: 4 });
}

/** Irregular puddle mask (alpha). core = thin sky-reflection streaks only —
 *  the water body itself must stay DARK, so the core layer never lifts the
 *  whole quad (that read as grey "mud" patches). */
function puddleTexture(seed, core = false) {
  return canvasTexture(256, 256, (ctx, W, H) => {
    const r = rng(seed);
    const ph1 = r() * 6.28, ph2 = r() * 6.28;
    const path = (scale) => {
      ctx.beginPath();
      for (let i = 0; i <= 54; i++) {
        const a = (i / 54) * Math.PI * 2;
        const rad = W * 0.47 * scale *
          (1 + 0.10 * Math.sin(a * 3 + ph1) + 0.06 * Math.sin(a * 7 + ph2));
        const x = W / 2 + Math.cos(a) * rad * 1.0;
        const y = H / 2 + Math.sin(a) * rad * 0.86;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
    };
    if (core) {
      // faint body + a few THIN horizontal sky streaks
      path(0.9);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fill();
      ctx.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < 6; i++) {
        const y = H * (0.24 + r() * 0.52);
        const h = 1.2 + r() * 2.4;
        const x0 = W * (0.12 + r() * 0.3);
        const w = W * (0.26 + r() * 0.44);
        const a = 0.3 + r() * 0.4;
        const lg = ctx.createLinearGradient(x0, 0, x0 + w, 0);
        lg.addColorStop(0, 'rgba(255,255,255,0)');
        lg.addColorStop(0.35, `rgba(255,255,255,${a})`);
        lg.addColorStop(0.68, `rgba(255,255,255,${a})`);
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(x0, y, w, h);
      }
      ctx.globalCompositeOperation = 'source-over';
      return;
    }
    // crisp water body (hard-ish rim so it does not read as a soft smear)
    path(1);
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // gentle unevenness inside — shallow, thin
    ctx.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 8; i++) {
      const x = W * (0.18 + r() * 0.64), y = H * (0.18 + r() * 0.64), rad = 8 + r() * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(255,255,255,${0.08 + r() * 0.2})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // a couple of notches on the rim so the outline is not a clean oval
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 4; i++) {
      const a = r() * 6.28, rad = W * 0.47 * (0.86 + r() * 0.12);
      const x = W / 2 + Math.cos(a) * rad, y = H / 2 + Math.sin(a) * rad * 0.86;
      const rr = 6 + r() * 16;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, 'rgba(0,0,0,0.9)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  });
}

/** Cast-iron manhole cover (kept light enough to read at night). */
function manholeTexture() {
  return canvasTexture(256, 256, (ctx, W, H) => {
    const c = W / 2;
    ctx.clearRect(0, 0, W, H);
    const body = ctx.createRadialGradient(c * 0.72, c * 0.66, 6, c, c, c);
    body.addColorStop(0, '#87919c');
    body.addColorStop(0.55, '#6d7782');
    body.addColorStop(1, '#4d555f');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(c, c, c - 2, 0, Math.PI * 2);
    ctx.fill();
    // bright rim
    ctx.strokeStyle = '#aab3bc';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(c, c, c - 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#8a939d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(c, c, c - 20, 0, Math.PI * 2);
    ctx.stroke();
    // concentric pattern
    ctx.strokeStyle = '#7c8791';
    ctx.lineWidth = 3;
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(c, c, 18 + i * 13, 0, Math.PI * 2);
      ctx.stroke();
    }
    // radial ribs
    ctx.strokeStyle = '#78838d';
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * 26, c + Math.sin(a) * 26);
      ctx.lineTo(c + Math.cos(a) * (c - 26), c + Math.sin(a) * (c - 26));
      ctx.stroke();
    }
    // centre diamond
    ctx.fillStyle = '#9aa4ae';
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-16, -16, 32, 32);
    ctx.restore();
    ctx.fillStyle = '#6b7681';
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-10, -10, 20, 20);
    ctx.restore();
    // small cast lettering
    drawText(ctx, 'おすい', c, c - c * 0.52, { size: 20, color: '#b4bdc6', font: FONT.jp });
    drawText(ctx, '下水', c, c + c * 0.58, { size: 22, color: '#b4bdc6', font: FONT.jp });
    // cool wet highlight sweeping the upper-left
    ctx.globalCompositeOperation = 'source-atop';
    const hl = ctx.createLinearGradient(0, 0, W * 0.9, H);
    hl.addColorStop(0, 'rgba(196,222,255,0.34)');
    hl.addColorStop(0.42, 'rgba(150,180,220,0.06)');
    hl.addColorStop(1, 'rgba(30,40,54,0.22)');
    ctx.fillStyle = hl;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  });
}

/** Soft irregular dark blob used for stains / damp water lines. */
function stainTexture() {
  return canvasTexture(128, 128, (ctx, W, H) => {
    const r = rng(7777);
    const ph = r() * 6.28;
    const g = ctx.createRadialGradient(W / 2, H / 2, 3, W / 2, H / 2, W * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const rad = W * 0.45 * (1 + 0.12 * Math.sin(a * 3 + ph) + 0.07 * Math.sin(a * 6 - ph));
      const x = W / 2 + Math.cos(a) * rad;
      const y = H / 2 + Math.sin(a) * rad;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  });
}

/** Leaf / grit litter for the alley. */
function debrisTexture() {
  return canvasTexture(128, 128, (ctx, W, H) => {
    const r = rng(2468);
    ctx.clearRect(0, 0, W, H);
    // a few leaves
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.translate(20 + r() * (W - 40), 20 + r() * (H - 40));
      ctx.rotate(r() * 6.28);
      ctx.fillStyle = `rgba(255,255,255,${0.6 + r() * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 9 + r() * 7, 5 + r() * 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // grit
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.5})`;
      ctx.beginPath();
      ctx.arc(r() * W, r() * H, 1 + r() * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · build
// ═════════════════════════════════════════════════════════════════════════════
export function buildStreet() {
  const g = new THREE.Group();
  g.name = 'street';

  // ── 2.1 asphalt + wet sheen ───────────────────────────────────────────────
  const matAsphalt = M.toon(PAL.asphalt, {
    map: asphaltTexture(),
    emissive: 0x0d131c,
    emissiveIntensity: 0.95,
  });
  plane(g, [HB * 2, HB * 2], [0, 0.002, 0], matAsphalt, {
    rx: -Math.PI / 2, name: 'asphalt', receive: true,
  });

  // additive sky reflection over the wet road (flat puddle-gloss, no fx needed)
  const sheenTex = sheenTexture();
  const matSheen = M.emit(0x8aa4c4, {
    map: sheenTex, transparent: true, opacity: 0.34, additive: true, depthWrite: false,
  });
  const sheen = plane(g, [HB * 2, HB * 2], [0, 0.0035, 0], matSheen, {
    rx: -Math.PI / 2, receive: false, name: 'wetSheen',
  });
  sheen.renderOrder = 2;

  // ── 2.2 sidewalk slab (L-shape, rounded corner, real 0.12 riser) ──────────
  const walkPlan = (() => {
    const pts = [
      [-HB, SW.southZ0],
      [ST.chamferB[0], SW.southZ0],      // store facade corner
      [ST.chamferA[0], ST.chamferA[1]],  // out along the chamfer line
      [ST.chamferA[0], -HB],             // up the store's east wall
      [EDGE_X, -HB],                     // east edge of the east walk
    ];
    // rounded corner (4.00, 2.00) → (3.40, 2.60)
    pts.push(...arcPts(CX, CZ, CORNER_R, 0, Math.PI / 2, 14));
    pts.push([-HB, EDGE_Z]);
    return pts;
  })();

  const walkTex = sidewalkTexture();
  const matWalk = M.toon(PAL.sidewalk, {
    map: walkTex, emissive: 0x0e1723, emissiveIntensity: 0.9,
  });
  const walkMesh = planExtrude(g, walkPlan, Y.sidewalk, matWalk, 0, { name: 'sidewalk' });
  addOutline(walkMesh, 0.016);

  // ── 2.3 curb band (slightly proud of the pavement, crisp lit edge) ────────
  const matCurb = M.toon(PAL.curb, {
    map: walkTex, emissive: 0x10161f, emissiveIntensity: 0.8,
  });
  const curbMesh = planExtrude(
    g, edgeBand(CURB_LIP, -(CURB_W - CURB_LIP)), CURB_H, matCurb, 0, { name: 'curb' },
  );
  addOutline(curbMesh, 0.016);

  // ── 2.4 gutter channel + metal grates ────────────────────────────────────
  // wet concrete channel, sitting just under the curb face
  const gutterPlan = edgeBand(CURB_LIP + 0.012 + GUTTER_W, CURB_LIP + 0.012);
  planFlat(g, gutterPlan, M.wet(0x1d232b, 0x0b1016, 1.0), 0.0035, {
    name: 'gutter', receive: true,
  });

  // grate segments: a short grate every 2.4 m along the gutter centre line
  const grateItems = [];
  samplePath(edgeCurve(CURB_LIP + 0.012 + GUTTER_W * 0.5), 2.4, 1.15).forEach((p) => {
    grateItems.push({ x: p.x, z: p.z, y: 0.0075, rot: p.rot, sx: 0.185, sz: 0.72 });
  });
  // a couple of sidewalk catch basins (雨水桝) along the curb
  grateItems.push({ x: 2.30, z: 2.50, y: Y.sidewalk + 0.002, rot: Math.PI / 2, sx: 0.34, sz: 0.5 });
  grateItems.push({ x: -3.90, z: 2.50, y: Y.sidewalk + 0.002, rot: Math.PI / 2, sx: 0.34, sz: 0.5 });
  // alley drain grates get appended later (same instanced mesh)

  // ── 2.5 road paint: crosswalks, lines, bays ──────────────────────────────
  const paint = [];
  const addPaint = (x, z, sx, sz, rot = 0, y = PAINT_Y) => paint.push({ x, z, sx, sz, rot, y });

  // zebra — stripes are long across the walking direction, 0.45 / 0.45 rhythm
  const zebraRun = (fixed, from, to, across, alongX) => {
    const len = to - from;
    const period = 0.9;
    const n = Math.max(1, Math.floor((len + 0.45) / period));
    const used = n * 0.45 + (n - 1) * 0.45;
    let cursor = from + (len - used) / 2;
    for (let i = 0; i < n; i++) {
      if (alongX) addPaint(cursor + 0.225, fixed, 0.45, across);
      else addPaint(fixed, cursor + 0.225, across, 0.45);
      cursor += period;
    }
  };
  // south road crossing (walk along z)
  zebraRun(LAYOUT.crossSouth.x0 + (LAYOUT.crossSouth.x1 - LAYOUT.crossSouth.x0) / 2,
    LAYOUT.crossSouth.z0, LAYOUT.crossSouth.z1,
    LAYOUT.crossSouth.x1 - LAYOUT.crossSouth.x0, false);
  // east road crossing (walk along x)
  zebraRun(LAYOUT.crossEast.z0 + (LAYOUT.crossEast.z1 - LAYOUT.crossEast.z0) / 2,
    LAYOUT.crossEast.x0, LAYOUT.crossEast.x1,
    LAYOUT.crossEast.z1 - LAYOUT.crossEast.z0, true);

  // lane edge lines (0.12), broken where the crossings are
  addPaint(-1.64, 2.86, 8.72, 0.12);                    // south road, north edge
  addPaint(4.26, -2.475, 0.12, 7.05);                   // east road, west edge
  // centre dashes
  for (let x = -5.8; x < 2.3; x += 2.4) addPaint(x + 0.6, 4.35, 1.2, 0.12);
  for (let z = -5.8; z < 1.0; z += 2.4) addPaint(5.0, z + 0.6, 0.12, 1.2);
  // stop lines before the two crossings
  addPaint(2.495, 5.15, 0.45, 1.6);
  addPaint(5.08, 2.695, 1.64, 0.45);

  // parking bays (U-shaped, open toward the curb)
  const pk = LAYOUT.parking;
  const bays = 3;
  const bw = (pk.x1 - pk.x0) / bays;
  for (let i = 0; i <= bays; i++) {
    addPaint(pk.x0 + i * bw, (pk.z0 + pk.z1) / 2, 0.10, pk.z1 - pk.z0);
  }
  addPaint((pk.x0 + pk.x1) / 2, pk.z1 - 0.05, pk.x1 - pk.x0, 0.10);

  // bicycle-parking frame along the east walk wall (clear of the tactile run at x=3.35)
  const bf = { x0: 2.68, x1: 3.12, z0: -4.55, z1: -2.65 };
  addPaint((bf.x0 + bf.x1) / 2, bf.z0, bf.x1 - bf.x0, 0.08, 0, WALK_PAINT_Y);
  addPaint((bf.x0 + bf.x1) / 2, bf.z1, bf.x1 - bf.x0, 0.08, 0, WALK_PAINT_Y);
  addPaint(bf.x0, (bf.z0 + bf.z1) / 2, 0.08, bf.z1 - bf.z0, 0, WALK_PAINT_Y);
  addPaint(bf.x1, (bf.z0 + bf.z1) / 2, 0.08, bf.z1 - bf.z0, 0, WALK_PAINT_Y);
  for (let z = bf.z0 + 0.63; z < bf.z1 - 0.1; z += 0.63) {
    addPaint((bf.x0 + bf.x1) / 2, z, bf.x1 - bf.x0, 0.06, 0, WALK_PAINT_Y);
  }

  // bicycle-parking frame on the south walk — kept clear of the tactile run

  // worn paint: one merged geometry with metre-scale UVs, chipped alpha so the
  // asphalt shows through and the film reads as old instead of white plastic
  const matPaint = M.toon(0xccd2d6, {
    map: paintWearTexture(), transparent: true, opacity: 0.86,
    emissive: 0x14181d, emissiveIntensity: 0.9,
  });
  matPaint.depthWrite = false;
  mergedQuads(g, matPaint, paint, {
    uvScale: 0.4, jitter: 0.05, renderOrder: 3, name: 'roadPaint',
  });

  // ── 2.6 road lettering ───────────────────────────────────────────────────
  // faint 止まれ on the south road, readable from the default camera side
  label(g, 1.55, 0.56, (ctx, W, H) => {
    drawText(ctx, '止まれ', W / 2, H / 2, {
      size: Math.round(H * 0.72), color: 'rgba(196,203,205,0.55)', font: FONT.jp, letterSpacing: 6,
    });
  }, [0.55, PAINT_Y + 0.001, 5.15], { rx: -Math.PI / 2, opacity: 0.65, renderOrder: 6 });

  // parking bay numbers
  label(g, pk.x1 - pk.x0, pk.z1 - pk.z0, (ctx, W, H) => {
    for (let i = 0; i < bays; i++) {
      const u = ((i + 0.5) / bays) * W;
      drawText(ctx, String(i + 1), u, H * 0.76, {
        size: Math.round(H * 0.3), color: 'rgba(206,212,211,0.75)', font: FONT.en,
      });
    }
  }, [(pk.x0 + pk.x1) / 2, PAINT_Y + 0.001, (pk.z0 + pk.z1) / 2], {
    rx: -Math.PI / 2, opacity: 0.85, renderOrder: 6,
  });

  // ── 2.7 puddles (static water only; fx handles ripples + reflections) ────
  const puddleTopAt = (x, z) => {
    if (x > AL.x0 && x < AL.x1 && z > AL.z0 && z < AL.z1) return 0.10;   // alley
    if (x > RD.eastX0 || z > RD.southZ0) return Y.road;                  // road
    return Y.sidewalk;                                                   // pavement
  };
  const puddleDark = [];
  const puddleCore = [];
  LAYOUT.puddles.forEach(([x, z, rx, rz, rot]) => {
    const base = puddleTopAt(x, z);
    puddleDark.push({ x, z, y: base + 0.006, rot, sx: rx * 2, sz: rz * 2 });
    puddleCore.push({ x: x + rx * 0.03, z: z - rz * 0.03, y: base + 0.0085, rot: rot + 0.12, sx: rx * 2.0, sz: rz * 1.92 });
  });
  const dark = flatQuads(g, M.emit(0x0a121d, {
    map: puddleTexture(7), transparent: true, opacity: 0.9, depthWrite: false,
  }), puddleDark, { receive: false, name: 'puddleWater' });
  dark.renderOrder = 4;
  const core = flatQuads(g, M.emit(0x33506f, {
    map: puddleTexture(19, true), transparent: true, opacity: 0.62, additive: true, depthWrite: false,
  }), puddleCore, { receive: false, name: 'puddleSheen' });
  core.renderOrder = 5;

  // ── 2.8 manhole covers ───────────────────────────────────────────────────
  const matManhole = M.toon(0xffffff, {
    map: manholeTexture(), emissive: 0x161e28, emissiveIntensity: 1.0,
  });
  matManhole.alphaTest = 0.5;
  flatQuads(g, matManhole, [
    { x: 0.90, z: 5.20, y: 0.004, rot: 0.4, sx: 0.62, sz: 0.62 },
    { x: 5.28, z: 0.60, y: 0.004, rot: -0.7, sx: 0.62, sz: 0.62 },
    { x: 4.55, z: 3.90, y: 0.004, rot: 1.9, sx: 0.58, sz: 0.58 },
  ], { name: 'manholes' });

  // ── 2.9 tactile paving ───────────────────────────────────────────────────
  const bars = [];
  const dots = [];
  const tY = Y.sidewalk + 0.001;
  // south-walk run (bars run along x → rotate the tile 90°)
  for (let x = -5.55; x <= TACT_X + 1e-4; x += TILE) {
    bars.push({ x, z: TACT_Z, y: tY, rot: Math.PI / 2, sx: TILE, sz: TILE, color: 0xffffff });
  }
  // east-walk run (bars along z)
  for (let z = TACT_Z - TILE; z >= -5.55 - 1e-4; z -= TILE) {
    bars.push({ x: TACT_X, z, y: tY, rot: 0, sx: TILE, sz: TILE, color: 0xffffff });
  }
  // spur toward the south crossing
  bars.push({ x: TACT_X, z: TACT_Z + TILE, y: tY, rot: 0, sx: TILE, sz: TILE, color: 0xffffff });
  dots.push({ x: TACT_X, z: TACT_Z + TILE * 2, y: tY, rot: 0, sx: TILE, sz: TILE, color: 0xffffff });
  // spur toward the east crossing
  bars.push({ x: TACT_X + TILE, z: TACT_Z, y: tY, rot: Math.PI / 2, sx: TILE, sz: TILE, color: 0xffffff });
  dots.push({ x: TACT_X + TILE * 2, z: TACT_Z, y: tY, rot: 0, sx: TILE, sz: TILE, color: 0xffffff });
  // grime variation (near-white so the material colour carries the yellow)
  const tr = rng(9090);
  for (const it of bars) it.color = new THREE.Color().setHSL(0.11, 0.10, 0.90 - tr() * 0.14).getHex();

  const matTact = (tex) => M.toon(0xd9b449, {
    map: tex, emissive: 0x241d0a, emissiveIntensity: 1.0,
  });
  flatQuads(g, matTact(tactileTexture('bar')), bars, { name: 'tactileBars' });
  flatQuads(g, matTact(tactileTexture('dot')), dots, { name: 'tactileDots' });

  // ── 2.10 alley floor + drain ─────────────────────────────────────────────
  const alleyPlan = [
    [AL.x0, AL.z0], [AL.x1, AL.z0], [AL.x1, AL.z1], [AL.x0, AL.z1],
  ];
  const matAlley = M.toon(0x474d55, {
    map: alleyTexture(), emissive: 0x080c12, emissiveIntensity: 0.9,
  });
  const alleyMesh = planExtrude(g, alleyPlan, 0.10, matAlley, 0, { name: 'alleyFloor' });
  addOutline(alleyMesh, 0.014);

  // shallow drain channel down the store side + its grates
  const chX = AL.x1 - 0.16;
  const ch = plane(g, [0.16, AL.z1 - AL.z0 - 0.3], [chX, 0.1008, (AL.z0 + AL.z1) / 2], M.wet(0x171b21, 0x080b10, 1.0), {
    rx: -Math.PI / 2, name: 'alleyDrain',
  });
  ch.renderOrder = 1;
  grateItems.push({ x: chX, z: -3.15, y: 0.1022, rot: 0, sx: 0.15, sz: 0.58 });
  grateItems.push({ x: chX, z: -1.05, y: 0.1022, rot: 0, sx: 0.15, sz: 0.58 });
  grateItems.push({ x: chX, z: 0.70, y: 0.1022, rot: 0, sx: 0.15, sz: 0.44 });

  // alley litter + grit
  const litter = [];
  const lr = rng(3131);
  for (let i = 0; i < 16; i++) {
    const x = AL.x0 + 0.14 + lr() * (AL.x1 - AL.x0 - 0.28);
    const z = AL.z0 + 0.2 + lr() * (AL.z1 - AL.z0 - 0.4);
    const s = 0.10 + lr() * 0.20;
    const warm = lr() < 0.5;
    litter.push({
      x, z, y: 0.1007, rot: lr() * 6.28, sx: s, sz: s * (0.7 + lr() * 0.6),
      color: warm ? 0x6b5a34 : 0x3a4048,
    });
  }
  flatQuads(g, M.emit(0xffffff, {
    map: debrisTexture(), transparent: true, opacity: 0.85, depthWrite: false,
  }), litter, { receive: false, name: 'alleyLitter' });

  // ── 2.11 damp stains / water lines ───────────────────────────────────────
  const stains = [];
  const sr = rng(6161);
  // damp line along both alley walls
  stains.push({ x: AL.x0 + 0.05, z: (AL.z0 + AL.z1) / 2, y: 0.1006, rot: 0, sx: 0.14, sz: AL.z1 - AL.z0 - 0.2, color: 0x0a1018 });
  stains.push({ x: AL.x1 - 0.05, z: (AL.z0 + AL.z1) / 2, y: 0.1006, rot: 0, sx: 0.14, sz: AL.z1 - AL.z0 - 0.2, color: 0x0a1018 });
  // damp water line where the pavement meets the store front
  for (let x = -3.0; x < 2.4; x += 0.55) {
    stains.push({ x, z: SW.southZ0 + 0.05, y: Y.sidewalk + 0.0006, rot: 0, sx: 0.42, sz: 0.10, color: 0x0a1018 });
  }
  // a few damp patches on the pavement
  for (let i = 0; i < 7; i++) {
    stains.push({
      x: -5.4 + sr() * 8.6, z: 1.2 + sr() * 1.2,
      y: Y.sidewalk + 0.0007, rot: sr() * 3,
      sx: 0.5 + sr() * 1.1, sz: 0.35 + sr() * 0.8, color: 0x0b1119,
    });
  }
  // chips along the curb lip
  for (let i = 0; i < 4; i++) {
    const x = -5.0 + sr() * 7.4;
    stains.push({ x, z: EDGE_Z - 0.05, y: Y.sidewalk + 0.0008, rot: 0, sx: 0.22, sz: 0.07, color: 0x14181e });
  }
  const stain = flatQuads(g, M.emit(0xffffff, {
    map: stainTexture(), transparent: true, opacity: 0.5, depthWrite: false,
  }), stains, { receive: false, name: 'dampStains' });
  stain.renderOrder = 1;

  // ── 2.12 service pad behind the store ────────────────────────────────────
  planExtrude(g, [
    [ST.x0, LAYOUT.backBuilding.z1], [ST.x1, LAYOUT.backBuilding.z1],
    [ST.x1, ST.z0], [ST.x0, ST.z0],
  ], 0.04, matAlley, 0, { name: 'servicePad' });

  // ── 2.13 entrance apron (0.12 pavement → 0.16 shop floor) ────────────────
  const apron = new THREE.Group();
  apron.position.set(ST.chamferCenter[0], Y.sidewalk, ST.chamferCenter[1]);
  apron.rotation.y = ST.chamferRotY;
  g.add(apron);
  const matApron = M.toon(PAL.curb, {
    map: walkTex, emissive: 0x0c1219, emissiveIntensity: 0.7,
  });
  // main slab: top flush with the shop floor
  box(apron, [1.5, 0.04, 0.52], [0, 0.02, 0.26], matApron, { cast: false });
  // shallow step down to the pavement
  box(apron, [1.5, 0.02, 0.18], [0, 0.01, 0.61], matApron, { cast: false });

  // ── 2.14 grates: single instanced mesh for gutter, basins and alley ──────
  flatQuads(g, M.toon(0xffffff, {
    map: grateTexture(), emissive: 0x0b0f14, emissiveIntensity: 1.0,
  }), grateItems, { name: 'grates' });

  return g;
}
