// ─────────────────────────────────────────────────────────────────────────────
// fx.js — rain, splashes, ripples, eave drips, water running down the glass,
// wet-asphalt reflections and a breath of ground mist.  Everything animates.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { Y, LAYOUT, M, canvasTexture, plane, group as makeGroup, glow, rng } from './core.js';

const S = LAYOUT.store;
const HALF = 5.92;
const _rnd = rng(1337);

function rand(a = 0, b = 1) {
  return a + (b - a) * _rnd();
}

function insideStore(x, z, pad = 0) {
  // footprint: rect + chamfer corner
  if (x < S.x0 - pad || x > S.x1 + pad) return false;
  if (z < S.z0 - pad || z > S.z1 + pad) return false;
  // chamfer line from (x1, -0.30) to (1.2, 1.0): 0.681x + 0.733z <= 1.0-ish
  const ux = 0.681, uz = 0.733;
  const c = ux * S.x1 + uz * -0.30;
  if (ux * x + uz * z > c + pad) return false;
  return true;
}

function insideBuilding(x, z) {
  if (z < -4.35 && x < 2.65) return true;             // back building
  if (x < -4.85 && z > -4.45) return true;            // left building
  return false;
}

/** ground height for a splash / ripple at (x,z) */
function groundYAt(x, z) {
  // sidewalk plateaus
  const onSouthWalk = z >= 1.0 && z <= 2.6 && x >= -6 && x <= 4.0;
  const onEastWalk = x >= 2.6 && x <= 4.0 && z >= -6 && z <= 2.6;
  if (onSouthWalk || onEastWalk) return Y.sidewalk + 0.006;
  return 0.007;
}

function openSpot() {
  for (let i = 0; i < 24; i++) {
    const x = rand(-HALF, HALF);
    const z = rand(-HALF, HALF);
    if (insideStore(x, z, 0.15)) continue;
    if (insideBuilding(x, z)) continue;
    if (x > 2.55 && x < 2.66) continue;
    return [x, z];
  }
  return [0, 4.2];
}

// ── textures ────────────────────────────────────────────────────────────────
function streakTexture() {
  return canvasTexture(24, 160, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(205,232,255,0)');
    g.addColorStop(0.18, 'rgba(215,238,255,0.65)');
    g.addColorStop(0.8, 'rgba(245,251,255,0.95)');
    g.addColorStop(1, 'rgba(210,235,255,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = w * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * 0.66, h * 0.01);
    ctx.lineTo(w * 0.34, h * 0.99);
    ctx.stroke();
  });
}

function ringTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    ctx.strokeStyle = 'rgba(220,240,255,0.95)';
    ctx.lineWidth = w * 0.028;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(190,225,255,0.35)';
    ctx.lineWidth = w * 0.02;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.26, 0, Math.PI * 2);
    ctx.stroke();
    const g = ctx.createRadialGradient(cx, cy, w * 0.1, cx, cy, w * 0.48);
    g.addColorStop(0, 'rgba(180,215,255,0.10)');
    g.addColorStop(1, 'rgba(180,215,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

function dropletTexture() {
  return canvasTexture(256, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    // hanging droplets + running trails
    for (let i = 0; i < 46; i++) {
      const x = rand(0, w);
      const y = rand(0, h);
      const r = rand(1.2, 3.6);
      const a = rand(0.25, 0.8);
      ctx.fillStyle = `rgba(225,242,255,${a})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.8, r * 1.35, 0, 0, Math.PI * 2);
      ctx.fill();
      if (_rnd() > 0.55) {
        const len = rand(10, 70);
        const g = ctx.createLinearGradient(0, y, 0, y + len);
        g.addColorStop(0, `rgba(230,245,255,${a * 0.9})`);
        g.addColorStop(1, 'rgba(230,245,255,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = r * 0.9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + rand(-2, 2), y + len);
        ctx.stroke();
      }
    }
  }, { wrap: true });
}

function reflectionTexture() {
  return canvasTexture(256, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    // vertical light smears on wet asphalt
    for (let i = 0; i < 120; i++) {
      const x = rand(0, w);
      const y = rand(0, h);
      const len = rand(20, 190);
      const wd = rand(1.5, 9);
      const hue = _rnd();
      const col = hue < 0.5 ? '200,255,235' : hue < 0.78 ? '255,224,170' : '180,215,255';
      const a = rand(0.05, 0.28) * (1 - y / h) * 1.4;
      const g = ctx.createLinearGradient(0, y, 0, y + len);
      g.addColorStop(0, `rgba(${col},0)`);
      g.addColorStop(0.3, `rgba(${col},${a})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, wd, len);
    }
  }, { wrap: true, repeat: [1, 1] });
}

function mistTexture() {
  return canvasTexture(256, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.52);
    g.addColorStop(0, 'rgba(196,220,255,0.55)');
    g.addColorStop(0.55, 'rgba(180,208,255,0.22)');
    g.addColorStop(1, 'rgba(180,208,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// ── builder ─────────────────────────────────────────────────────────────────
export function buildFX({ scene, camera, renderer }) {
  void scene; void camera; void renderer;
  const root = new THREE.Group();
  root.name = 'fx';
  const updaters = [];

  // ══ 1. rain ══════════════════════════════════════════════════════════════
  const STREAK = streakTexture();
  function rainLayer(count, size, opacity, height, speedMin, speedMax, xzHalf) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rand(-xzHalf, xzHalf);
      pos[i * 3 + 1] = rand(0, height);
      pos[i * 3 + 2] = rand(-xzHalf, xzHalf);
      spd[i] = rand(speedMin, speedMax);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: STREAK,
      size,
      sizeAttenuation: true,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: new THREE.Color(0xcfe6ff),
      fog: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    root.add(pts);
    updaters.push((t, dt) => {
      const a = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        a[i * 3 + 1] -= spd[i] * dt;
        if (a[i * 3 + 1] < -0.3) {
          a[i * 3 + 1] += height + 0.3;
          a[i * 3] = rand(-xzHalf, xzHalf);
          a[i * 3 + 2] = rand(-xzHalf, xzHalf);
        }
      }
      geo.attributes.position.needsUpdate = true;
    });
    return pts;
  }
  rainLayer(1650, 0.3, 0.46, 6.4, 8.0, 12.0, HALF);
  rainLayer(900, 0.17, 0.26, 6.0, 5.5, 8.5, HALF);
  // denser band right in front of the shop, so the light catches it
  rainLayer(420, 0.42, 0.13, 5.2, 6.0, 9.0, 3.1);

  // ══ 2. splash ripples (open ground) ══════════════════════════════════════
  const RING = ringTexture();
  const ringGeo = new THREE.PlaneGeometry(1, 1);
  const ripples = [];
  function spawnRipple(r, atPuddle) {
    if (atPuddle) {
      const p = LAYOUT.puddles[(Math.random() * LAYOUT.puddles.length) | 0];
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random());
      r.x = p[0] + Math.cos(a) * p[2] * rr * 0.8;
      r.z = p[1] + Math.sin(a) * p[3] * rr * 0.8;
      r.y = groundYAt(p[0], p[1]) + 0.002;
      r.size = 0.6;
    } else {
      const [x, z] = openSpot();
      r.x = x; r.z = z;
      r.y = groundYAt(x, z);
      r.size = 0.3;
    }
    r.life = 0;
    r.dur = atPuddle ? 1.15 + Math.random() * 0.7 : 0.5 + Math.random() * 0.4;
    r.m.position.set(r.x, r.y, r.z);
  }
  function makeRipples(count, atPuddle) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: RING, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide, fog: true,
      });
      const m = new THREE.Mesh(ringGeo, mat);
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 6;
      root.add(m);
      const r = { m, mat, x: 0, z: 0, y: 0.01, life: 0, dur: 1, size: 0.4 };
      spawnRipple(r, atPuddle);
      r.life = Math.random() * r.dur;
      ripples.push(r);
    }
  }
  makeRipples(30, false);
  makeRipples(12, true);
  updaters.push((t, dt) => {
    for (const r of ripples) {
      r.life += dt;
      if (r.life >= r.dur) spawnRipple(r, r.size > 0.6);
      const k = Math.min(1, r.life / r.dur);
      const s = 0.08 + k * r.size * 1.5;
      r.m.scale.set(s, s, 1);
      r.mat.opacity = Math.max(0, (1 - k) * (1 - k) * 0.38);
    }
  });

  // ══ 3. eave drips from the canopy edge ══════════════════════════════════
  const drips = [];
  {
    const N = 26;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const info = [];
    const push = (x, z) => info.push([x, z]);
    // south edge  z = 1.95, x -3.3..1.3
    for (let i = 0; i < 11; i++) push(-3.25 + (i / 10) * 4.5 + rand(-0.05, 0.05), 1.94 + rand(-0.03, 0.03));
    // chamfer edge (offset from the wall line)
    const cx = S.chamferCenter[0] + 0.681 * 0.98, cz = S.chamferCenter[1] + 0.733 * 0.98;
    for (let i = 0; i < 8; i++) {
      const u = -0.85 + (i / 7) * 1.7;
      push(cx + 0.733 * u, cz - 0.681 * u);
    }
    // east edge x = 3.48, z -2.6..-0.3
    for (let i = 0; i < 7; i++) push(3.47 + rand(-0.03, 0.03), -2.55 + (i / 6) * 2.2);
    for (let i = 0; i < N; i++) {
      const [x, z] = info[Math.min(i, info.length - 1)];
      pos[i * 3] = x;
      pos[i * 3 + 1] = rand(0.1, 2.4);
      pos[i * 3 + 2] = z;
      drips.push({ x, z, y: rand(0.1, 2.4), speed: rand(3.2, 4.6), delay: rand(0, 2) });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: STREAK, size: 0.2, sizeAttenuation: true, transparent: true, opacity: 0.75,
      depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(0xdcefff), fog: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    root.add(pts);
    updaters.push((t, dt) => {
      const a = geo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const d = drips[i];
        d.y -= d.speed * dt;
        if (d.y < 0.05) {
          d.y = 2.42 - (i % 5) * 0.12;
          a[i * 3] = d.x + rand(-0.02, 0.02);
          a[i * 3 + 2] = d.z + rand(-0.02, 0.02);
        }
        a[i * 3 + 1] = d.y;
      }
      geo.attributes.position.needsUpdate = true;
    });
  }

  // ══ 4. water running down the storefront glass ══════════════════════════
  function glassWater(parent, width, height, pos, rotY, opacity, speed) {
    const tex = dropletTexture();
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, fog: true,
      color: new THREE.Color(0x9ec8ff),
    });
    mat.map.wrapS = THREE.RepeatWrapping;
    mat.map.wrapT = THREE.RepeatWrapping;
    mat.map.repeat.set(Math.max(1, width / 2.2), Math.max(1, height / 1.9));
    const m = plane(parent, [width, height], pos, mat, { ry: rotY, receive: false });
    m.renderOrder = 7;
    updaters.push((t, dt) => {
      mat.map.offset.y -= dt * speed;
      mat.map.offset.y = ((mat.map.offset.y % 1) + 1) % 1;
    });
  }
  glassWater(root, 4.32, 1.74, [-1.0, 1.53, 1.012], 0, 0.15, 0.035);
  glassWater(root, 4.32, 1.74, [-1.0, 1.53, 1.006], 0, 0.08, 0.014);
  glassWater(root, 2.82, 1.74, [2.612, 1.53, -1.75], Math.PI / 2, 0.14, 0.03);
  glassWater(root, 1.86, 1.74, [0, 1.53, 0.03], 0, 0.14, 0.028);
  {
    const cg = new THREE.Group();
    cg.position.set(S.chamferCenter[0], 0, S.chamferCenter[1]);
    cg.rotation.y = S.chamferRotY;
    root.add(cg);
    glassWater(cg, 1.86, 1.74, [0, 1.53, 0.012], 0, 0.18, 0.028);
  }

  // ══ 5. wet-asphalt reflections of the shop front ════════════════════════
  function reflection(w, h, pos, rotY, opacity, color) {
    const mat = new THREE.MeshBasicMaterial({
      map: reflectionTexture(), transparent: true, opacity, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, color: new THREE.Color(color), fog: true,
    });
    mat.map.wrapS = THREE.RepeatWrapping;
    mat.map.wrapT = THREE.RepeatWrapping;
    mat.map.repeat.set(Math.max(1, w / 4.5), Math.max(1, h / 3.2));
    const m = plane(root, [w, h], pos, mat, { rx: -Math.PI / 2, rz: rotY, receive: false });
    m.renderOrder = 5;
    return m;
  }
  // teal wash of the fascia lightbox across the wet pavement
  reflection(6.3, 1.7, [-0.9, 0.127, 1.85], 0, 0.22, 0xdcefe0);
  reflection(6.3, 2.0, [-0.9, 0.013, 3.55], 0, 0.18, 0xc8e4d4);
  // east facade spill (sidewalk + road)
  reflection(1.4, 2.6, [3.3, 0.127, -1.55], Math.PI / 2, 0.3, 0xc0e8d8);
  reflection(2.0, 2.6, [4.9, 0.013, -1.55], Math.PI / 2, 0.24, 0xa8dcc8);
  // warm pool in front of the door
  reflection(2.3, 1.6, [2.45, 0.127, 1.5], 0, 0.5, 0xffcf93);
  reflection(1.7, 1.4, [2.45, 0.128, 1.3], 0, 0.34, 0xffe3bb);
  // vending-machine colour on the pavement
  reflection(1.8, 1.5, [-4.55, 0.127, 1.95], 0, 0.32, 0xc4e4ff);
  reflection(1.2, 1.6, [3.05, 0.127, -2.6], Math.PI / 2, 0.3, 0xffb2a6);
  // karaoke pink bleeding out of the alley mouth
  reflection(1.4, 2.2, [-4.99, 0.127, 2.2], Math.PI / 2, 0.24, 0xff9ec4);  // ══ 6. ground mist ══════════════════════════════════════════════════════
  const MIST = mistTexture();
  const mists = [];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: MIST, transparent: true, opacity: rand(0.03, 0.06), blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, color: new THREE.Color(0x9fc4ee), fog: true,
    });
    const w = rand(3.5, 6.5), h = rand(1.2, 2.2);
    const m = plane(root, [w, h], [rand(-5, 5), rand(0.5, 1.5), rand(-5.5, 5.5)], mat, { receive: false });
    m.renderOrder = 4;
    root.add(m);
    mists.push({ m, mat, base: mat.opacity, phase: rand(0, 6.28), sp: rand(0.05, 0.16), x0: m.position.x });
  }
  updaters.push((t, dt) => {
    for (const q of mists) {
      q.m.position.x = q.x0 + Math.sin(t * q.sp + q.phase) * 0.8;
      q.mat.opacity = q.base * (0.7 + 0.3 * Math.sin(t * 0.23 + q.phase));
    }
    void dt;
  });

  // ══ 7. roof-vent steam ══════════════════════════════════════════════════
  const steam = [];
  {
    const N = 26;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const data = [];
    for (let i = 0; i < N; i++) {
      data.push({
        x: -3.0 + rand(-0.12, 0.12), z: -2.6 + rand(-0.12, 0.12),
        y: rand(3.9, 5.4), vy: rand(0.22, 0.5), drift: rand(-0.08, 0.08),
        ph: rand(0, 6.28),
      });
      pos[i * 3] = data[i].x; pos[i * 3 + 1] = data[i].y; pos[i * 3 + 2] = data[i].z;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: MIST, size: 0.9, sizeAttenuation: true, transparent: true, opacity: 0.1,
      depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(0xdce8f5), fog: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    root.add(pts);
    updaters.push((t, dt) => {
      const a = geo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const d = data[i];
        d.y += d.vy * dt;
        if (d.y > 5.6) d.y = 3.9;
        a[i * 3] = d.x + Math.sin(t * 0.4 + d.ph) * 0.25 + d.drift * (d.y - 3.9);
        a[i * 3 + 1] = d.y;
        a[i * 3 + 2] = d.z + Math.cos(t * 0.33 + d.ph) * 0.18;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = 0.09 + 0.02 * Math.sin(t * 0.7);
    });
  }

  // ══ 8. traffic-light colour bleed on the wet crossing ═══════════════════
  const bleed = new THREE.MeshBasicMaterial({
    map: (() => {
      return canvasTexture(64, 64, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(255,255,255,0.9)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.25)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
    })(),
    transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, color: new THREE.Color(0x8feec4), fog: true,
  });
  const bleedMesh = plane(root, [2.2, 2.4], [4.35, 0.014, 3.6], bleed, { rx: -Math.PI / 2, receive: false });
  bleedMesh.renderOrder = 5;
  updaters.push((t) => {
    const cyc = (t % 14) / 14;
    if (cyc < 0.62) {
      bleed.color.setHex(0x4fe0a2); bleed.opacity = 0.15;
    } else if (cyc < 0.78) {
      bleed.color.setHex(0xffcf5a); bleed.opacity = 0.14;
    } else {
      bleed.color.setHex(0xff5b5b); bleed.opacity = 0.13;
    }
  });

  // ══ update ══════════════════════════════════════════════════════════════
  function update(t, dt) {
    const d = Math.min(dt, 0.05);
    for (const fn of updaters) fn(t, d);
  }

  return { group: root, update, onResize() {} };
}











