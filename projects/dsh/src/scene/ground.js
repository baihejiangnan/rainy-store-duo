import * as THREE from 'three';
import { C } from '../core/palette.js';
import { L } from '../core/layout.js';
import {
  asphaltTexture, canvas2d, concreteTexture, drawText, pavingTexture, rng, tex,
  wetMaskTexture, roadTextTexture, martVerticalTexture,
} from '../core/textures.js';
import { WetGround } from '../core/wetGround.js';
import { box, circle, group, plane, rounded } from '../core/geom.js';
import { FONT as FONT_ } from '../core/palette.js';
import { FONT } from '../core/palette.js';

function paintTexture({ w = 256, h = 256, seed = 3 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  const rand = rng(seed);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  // roughness / worn away spots
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.12 + rand() * 0.55})`;
    ctx.beginPath();
    ctx.ellipse(rand() * w, rand() * h, 1 + rand() * 9, 1 + rand() * 4, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // fine aggregate
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = `rgba(70,70,70,${0.03 + rand() * 0.07})`;
    ctx.fillRect(rand() * w, rand() * h, 1, 1);
  }
  return tex(c);
}

function tactileTexture({ w = 128, h = 512, seed = 12 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  const rand = rng(seed);
  ctx.fillStyle = '#c9a94f';
  ctx.fillRect(0, 0, w, h);
  // guide bars
  for (let y = 6; y < h; y += 26) {
    ctx.fillStyle = 'rgba(255,224,120,0.55)';
    ctx.fillRect(w * 0.18, y, w * 0.64, 9);
    ctx.fillStyle = 'rgba(110,85,30,0.35)';
    ctx.fillRect(w * 0.18, y + 11, w * 0.64, 3);
  }
  const grain = rng(seed + 1);
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(60,50,20,${0.03 + grain() * 0.08})`;
    ctx.fillRect(grain() * w, grain() * h, 1.2, 1.2);
  }
  return tex(c, { wrap: THREE.RepeatWrapping, repeat: [1, 8] });
}

function grateTexture({ w = 256, h = 128 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  const rand = rng(71);
  ctx.fillStyle = '#151a24';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 11; i++) {
    const x = 8 + i * (w - 16) / 10;
    ctx.fillStyle = '#454a56';
    ctx.fillRect(x, 6, 5, h - 12);
    ctx.fillStyle = '#626876';
    ctx.fillRect(x, 6, 1.5, h - 12);
  }
  ctx.strokeStyle = '#5a606d';
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(120,130,150,${rand() * 0.12})`;
    ctx.fillRect(rand() * w, rand() * h, 2, 2);
  }
  return tex(c);
}

function manholeTexture({ size = 256 } = {}) {
  const { c, ctx } = canvas2d(size, size);
  const rand = rng(41);
  ctx.fillStyle = '#1a1e28';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#4b505c';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 3;
  for (let r = 0.18; r < 0.44; r += 0.08) {
    ctx.beginPath(); ctx.arc(size / 2, size / 2, size * r, 0, Math.PI * 2); ctx.stroke();
  }
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    ctx.strokeStyle = 'rgba(70,76,90,0.65)';
    ctx.beginPath(); ctx.moveTo(size / 2 + Math.cos(a) * size * 0.12, size / 2 + Math.sin(a) * size * 0.12);
    ctx.lineTo(size / 2 + Math.cos(a) * size * 0.44, size / 2 + Math.sin(a) * size * 0.44); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(140,150,170,0.16)';
  for (let i = 0; i < 200; i++) ctx.fillRect(rand() * size, rand() * size, 1.5, 1.5);
  return tex(c);
}

function plaqueTexture({ w = 512, h = 128 } = {}) {
  const { c, ctx } = canvas2d(w, h);
  ctx.fillStyle = '#1d1a20';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#b9955f';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  drawText(ctx, 'HIKARI-MACHI 2', w / 2, h * 0.4, { family: FONT.latin, size: 40, color: '#c9a86a', letterSpacing: 4 });
  drawText(ctx, '雨夜の街角  /  1:100', w / 2, h * 0.7, { family: FONT.jp, weight: '500', size: 25, color: '#9a8055' });
  return tex(c);
}

function puddleShape(rx, rz, seed, n = 16) {
  const rand = rng(seed);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wob = 0.72 + rand() * 0.5;
    pts.push(new THREE.Vector2(Math.cos(a) * rx * wob, Math.sin(a) * rz * wob));
  }
  const shape = new THREE.Shape(pts);
  return new THREE.ShapeGeometry(shape);
}

export function buildGround(ctx) {
  const { root, mats } = ctx;
  const g = group('ground', root);

  /* ------------------------------------------------------------------ */
  /* plinth                                                              */
  /* ------------------------------------------------------------------ */
  const baseMat = mats.toon(C.baseSide);
  const slab = rounded(L.base.size, L.base.thickness, L.base.size, 0.1, baseMat, {
    x: 0, y: -L.base.thickness / 2, z: 0, cast: true, receive: true, seg: 3, parent: g,
  });
  slab.name = 'base-plinth';
  ctx.outline(slab, 0.02, '#0a0b12');

  // dark stone plate under everything
  const plateMat = mats.toon(C.baseTop);
  const plate = box(L.base.size - 0.06, 0.03, L.base.size - 0.06, plateMat, { x: 0, y: 0.005, z: 0, cast: false, receive: true, parent: g });
  plate.name = 'base-plate';

  // raised stone border frame
  const borderMat = mats.toon(C.baseEdge);
  const bw = 0.2;
  const bh = 0.035;
  const mkBorder = (w, d, x, z) => box(w, bh, d, borderMat, { x, y: bh / 2 + 0.012, z, cast: false, receive: true, parent: g });
  mkBorder(11.98, bw, 0, -5.9);
  mkBorder(11.98, bw, 0, 5.9);
  mkBorder(bw, 11.58, -5.9, 0);
  mkBorder(bw, 11.58, 5.9, 0);
  // brass inlay at the inner edge of the frame
  const brassMat = mats.toon(C.brassDark);
  const inlay = (w, d, x, z) => box(w, 0.006, d, brassMat, { x, y: 0.036, z, cast: false, receive: false, parent: g });
  inlay(11.9, 0.012, 0, -5.795);
  inlay(11.9, 0.012, 0, 5.795);
  inlay(0.012, 11.58, -5.795, 0);
  inlay(0.012, 11.58, 5.795, 0);

  // side brass pinstripe + front plaque
  const pinMat = mats.toon(C.brass);
  box(11.94, 0.006, 0.012, pinMat, { x: 0, y: -0.17, z: 5.992, cast: false, receive: false, parent: g });
  box(11.94, 0.006, 0.012, pinMat, { x: 0, y: -0.17, z: -5.992, cast: false, receive: false, parent: g });
  box(0.012, 0.006, 11.94, pinMat, { x: 5.992, y: -0.17, z: 0, cast: false, receive: false, parent: g });
  box(0.012, 0.006, 11.94, pinMat, { x: -5.992, y: -0.17, z: 0, cast: false, receive: false, parent: g });
  const plaque = plane(1.45, 0.36, new THREE.MeshBasicMaterial({
    map: plaqueTexture(), toneMapped: false, transparent: false, fog: false,
  }), { x: 0, y: -0.31, z: 6.004, cast: false, receive: false, parent: g });
  plaque.name = 'base-plaque';

  /* ------------------------------------------------------------------ */
  /* wet asphalt                                                         */
  /* ------------------------------------------------------------------ */
  const asphaltMap = asphaltTexture({ repeat: [1, 1], size: 512 });
  const wetMap = wetMaskTexture({ size: 1024 });
  const wetGeo = new THREE.PlaneGeometry(L.base.size, L.base.size, 1, 1);
  const wet = new WetGround(wetGeo, {
    textureWidth: 512,
    textureHeight: 512,
    baseMap: asphaltMap,
    wetMap,
    baseScale: 0.52,
    reflectStrength: 1.12,
    rippleStrength: 0.0034,
    updateInterval: 5,
    reflectTint: '#b6cfff',
    asphaltTint: '#c6d1e6',
  });
  wet.rotation.x = -Math.PI / 2;
  wet.position.y = 0.03;
  wet.receiveShadow = true;
  wet.name = 'wet-street';
  g.add(wet);
  ctx.refs.wetGround = wet;
  ctx.onUpdate((t) => wet.setTime(t));

  /* reflective puddles on the raised sidewalk / alley, reusing the road reflection */
  const puddleMask = (w0, h0, blobs) => {
    const { c, ctx: cx } = canvas2d(w0, h0);
    cx.clearRect(0, 0, w0, h0);
    for (const b of blobs) {
      const g0 = cx.createRadialGradient(b.x * w0, b.y * h0, 1, b.x * w0, b.y * h0, b.r * w0);
      g0.addColorStop(0, 'rgba(255,255,255,0.95)');
      g0.addColorStop(0.62, 'rgba(255,255,255,0.8)');
      g0.addColorStop(1, 'rgba(255,255,255,0)');
      cx.save();
      cx.translate(b.x * w0, b.y * h0);
      cx.scale(1, b.ry ?? 1);
      cx.rotate(b.rot ?? 0);
      cx.fillStyle = g0;
      cx.beginPath();
      cx.arc(0, 0, b.r * w0, 0, Math.PI * 2);
      cx.fill();
      cx.restore();
    }
    return tex(c, { srgb: false });
  };
  const makePuddleOverlay = (pw, ph, maskTex, x, z, ry = 0, yy = 0.157) => {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          tDiffuse: { value: null },
          textureMatrixWorld: { value: wet.textureMatrixWorld },
          uMask: { value: maskTex },
          uTime: { value: 0 },
          uTint: { value: new THREE.Color('#cfe2ff') },
        },
      ]),
      vertexShader: /* glsl */ `
        uniform mat4 textureMatrixWorld;
        varying vec4 vUv;
        varying vec2 vUvMask;
        varying float vFres;
        #include <common>
        #include <fog_pars_vertex>
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vUv = textureMatrixWorld * wp;
          vUvMask = uv;
          vec3 V = normalize(cameraPosition - wp.xyz);
          vFres = pow(1.0 - clamp(V.y, 0.0, 1.0), 2.0);
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform sampler2D uMask;
        uniform float uTime;
        uniform vec3 uTint;
        varying vec4 vUv;
        varying vec2 vUvMask;
        varying float vFres;
        #include <common>
        #include <fog_pars_fragment>
        void main() {
          float mask = texture2D(uMask, vUvMask).r;
          if (mask < 0.02) discard;
          float wob = sin(vUv.x * 31.0 + uTime * 2.1) + sin(vUv.y * 27.0 - uTime * 1.6);
          vec4 uv = vUv;
          uv.xy += vec2(cos(wob), sin(wob)) * 0.0016 * uv.w;
          vec3 refl = texture2DProj(tDiffuse, uv).rgb * uTint;
          vec3 col = mix(vec3(0.012, 0.02, 0.035), refl * 1.35, 0.82);
          float alpha = mask * clamp(0.5 + vFres * 0.5, 0.0, 1.0) * 0.85;
          gl_FragColor = vec4(col, alpha);
          #include <fog_fragment>
        }
      `,
    });
    mat.uniforms.tDiffuse.value = wet.getRenderTarget().texture;
    mat.uniforms.textureMatrixWorld.value = wet.textureMatrixWorld;
    const mesh = plane(pw, ph, mat, { x, y: yy, z, ground: true, cast: false, receive: false, parent: g });
    if (ry) mesh.rotation.z = ry;
    mesh.renderOrder = 4;
    mesh.name = 'sidewalk-reflection';
    ctx.onUpdate((t) => { mat.uniforms.uTime.value = t; });
    return mesh;
  };
  const frontMask = puddleMask(512, 256, [
    { x: 0.18, y: 0.24, r: 0.09, ry: 0.7, rot: 0.2 },
    { x: 0.34, y: 0.3, r: 0.06, ry: 0.6, rot: -0.3 },
    { x: 0.61, y: 0.22, r: 0.075, ry: 0.7, rot: 0.1 },
    { x: 0.82, y: 0.78, r: 0.08, ry: 0.55, rot: 0.4 },
    { x: 0.5, y: 0.82, r: 0.055, ry: 0.6, rot: -0.2 },
  ]);
  makePuddleOverlay(5.15, 1.2, frontMask, -1.35, 1.66, 0, 0.158);
  const sideMask = puddleMask(256, 512, [
    { x: 0.28, y: 0.3, r: 0.12, ry: 0.24, rot: 0.1 },
    { x: 0.25, y: 0.68, r: 0.1, ry: 0.25, rot: -0.2 },
  ]);
  makePuddleOverlay(0.8, 1.95, sideMask, 1.54, -0.2, Math.PI / 2, 0.158);
  const alleyMask = puddleMask(128, 512, [
    { x: 0.5, y: 0.3, r: 0.6, ry: 0.18, rot: 0.1 },
    { x: 0.5, y: 0.72, r: 0.45, ry: 0.25, rot: -0.1 },
  ]);
  makePuddleOverlay(0.62, 3.0, alleyMask, -4.27, -1.2, 0, 0.128);

  /* tame the asphalt patchiness */
  if (wet.material.uniforms.uBaseScale) wet.material.uniforms.uBaseScale.value = 0.9;

  /* ------------------------------------------------------------------ */
  /* sidewalk slabs                                                      */
  /* ------------------------------------------------------------------ */
  const walkSideMat = mats.toon(C.curbDark);
  const mkWalk = (x0, x1, z0, z1, rep) => {
    const w = x1 - x0;
    const d = z1 - z0;
    const pv = pavingTexture({ repeat: rep, size: 512 });
    const topMat = mats.toon('#ffffff', { map: pv });
    const geo = new THREE.BoxGeometry(w, 0.12, d);
    const mesh = new THREE.Mesh(geo, [walkSideMat, walkSideMat, topMat, walkSideMat, walkSideMat, walkSideMat]);
    mesh.position.set((x0 + x1) / 2, L.walkY - 0.06, (z0 + z1) / 2);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.name = 'sidewalk';
    g.add(mesh);
    return mesh;
  };
  mkWalk(-5.8, 2.3, 1.0, 2.3, [6.4, 1.25]);
  mkWalk(1.3, 2.3, -5.8, 1.0, [1.2, 6.6]);

  // alley + back-of-house concrete
  const alleyTex = concreteTexture({ repeat: [1.4, 3.2], color: '#5d5f68', size: 512, joints: 3 });
  const alleyMat = mats.toon('#ffffff', { map: alleyTex });
  const mkFloor = (x0, x1, z0, z1, mat, topY = 0.12) => {
    const mesh = box(x1 - x0, 0.1, z1 - z0, mat, {
      x: (x0 + x1) / 2, y: topY - 0.05, z: (z0 + z1) / 2, cast: false, receive: true, parent: g,
    });
    mesh.name = 'alley-floor';
    return mesh;
  };
  mkFloor(L.alley.x0, L.alley.x1, L.store.z0, 1.0, alleyMat);
  mkFloor(-5.8, L.store.x1, -5.0, L.store.z0, alleyMat);
  // small poured apron behind the shop
  const apron = box(5.0, 0.1, 0.55, alleyMat, { x: 0.5, y: 0.07, z: -4.72, cast: false, receive: true, parent: g });

  /* ------------------------------------------------------------------ */
  /* curbs + gutters                                                     */
  /* ------------------------------------------------------------------ */
  const curbTex = concreteTexture({ repeat: [8, 1], color: '#777983', size: 256, joints: 4 });
  const curbMat = mats.toon('#ffffff', { map: curbTex });
  box(8.1, 0.135, 0.13, curbMat, { x: -1.75, y: 0.0675, z: 2.365, cast: false, receive: true, parent: g });
  box(0.13, 0.135, 8.1, curbMat, { x: 2.365, y: 0.0675, z: -1.75, cast: false, receive: true, parent: g });
  // curb corner
  box(0.13, 0.135, 0.13, curbMat, { x: 2.365, y: 0.0675, z: 2.365, cast: false, receive: true, parent: g });
  // top highlight strip
  const curbTop = mats.toon('#878992');
  box(8.1, 0.018, 0.11, curbTop, { x: -1.75, y: 0.142, z: 2.36, cast: false, receive: true, parent: g });
  box(0.11, 0.018, 8.1, curbTop, { x: 2.36, y: 0.142, z: -1.75, cast: false, receive: true, parent: g });

  // gutter channel
  const gutterMat = mats.toon(C.gutter);
  box(8.2, 0.012, 0.24, gutterMat, { x: -1.7, y: 0.029, z: 2.53, cast: false, receive: true, parent: g });
  box(0.24, 0.012, 8.2, gutterMat, { x: 2.53, y: 0.029, z: -1.7, cast: false, receive: true, parent: g });

  // tactile paving strips
  const tactile = tactileTexture();
  const tactileMat = mats.toon('#ffffff', { map: tactile });
  box(6.2, 0.012, 0.3, tactileMat, { x: -2.35, y: 0.148, z: 1.75, cast: false, receive: true, parent: g });
  const tactile2 = tactileTexture({ seed: 19 });
  const tactileMat2 = mats.toon('#ffffff', { map: tactile2 });
  box(0.3, 0.012, 6.0, tactileMat2, { x: 1.86, y: 0.148, z: -2.1, cast: false, receive: true, parent: g });

  /* ------------------------------------------------------------------ */
  /* road markings                                                       */
  /* ------------------------------------------------------------------ */
  const paintTex = paintTexture();
  const paintMat = mats.toon('#9d9b91', { map: paintTex, dithering: true });
  const paintBar = (x, z, w, d, ry = 0, opacity = 1) => {
    const m = box(w, 0.008, d, paintMat, { x, y: 0.038, z, ry, cast: false, receive: true, parent: g });
    return m;
  };

  // zebra crossing across the main street
  const cwM = L.crosswalkMain;
  const stripeZ = (cwM.z1 - cwM.z0) / cwM.stripes;
  for (let i = 0; i < cwM.stripes; i++) {
    const z = cwM.z0 + stripeZ * (i + 0.5);
    paintBar((cwM.x0 + cwM.x1) / 2, z, cwM.x1 - cwM.x0, stripeZ * 0.55);
  }
  // zebra crossing across the side street (foreground)
  const cwS = L.crosswalkSide;
  const stripeX = (cwS.x1 - cwS.x0) / cwS.stripes;
  for (let i = 0; i < cwS.stripes; i++) {
    const x = cwS.x0 + stripeX * (i + 0.5);
    paintBar(x, (cwS.z0 + cwS.z1) / 2, stripeX * 0.55, cwS.z1 - cwS.z0);
  }

  // stop line + road text on the side street approach (foreground)
  paintBar(4.1, 1.3, 3.3, 0.12);
  const stopTex = roadTextTexture({ text: '止まれ' });
  const stopMat = new THREE.MeshBasicMaterial({
    map: stopTex,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const stopMark = plane(1.1, 1.7, stopMat, { x: 4.72, y: 0.044, z: 0.62, ground: true, cast: false, receive: false, parent: g });
  stopMark.name = 'road-text-stop';
  // white edge lines
  paintBar(-1.9, 2.68, 7.0, 0.1);
  paintBar(2.68, -1.7, 0.1, 7.5);
  // parking bay
  paintBar(2.52, -2.15, 0.08, 1.95);
  paintBar(3.54, -2.15, 0.08, 1.95);
  paintBar(3.03, -3.1, 1.0, 0.08);
  // bicycle parking marks on the raised side walk
  box(0.05, 0.008, 0.55, paintMat, { x: 1.72, y: 0.148, z: -2.75, cast: false, receive: true, parent: g });
  box(0.05, 0.008, 0.55, paintMat, { x: 1.72, y: 0.148, z: -3.35, cast: false, receive: true, parent: g });

  /* ------------------------------------------------------------------ */
  /* drains + manholes                                                   */
  /* ------------------------------------------------------------------ */
  const grateMat = mats.toon('#ffffff', { map: grateTexture() });
  const mkGrate = (x, z, w, d) => {
    box(w, 0.014, d, mats.toon(C.grate), { x, y: 0.038, z, cast: false, receive: true, parent: g });
    const t = box(w, 0.006, d, grateMat, { x, y: 0.046, z, cast: false, receive: true, parent: g });
    return t;
  };
  mkGrate(2.54, 1.72, 0.22, 0.42);
  mkGrate(2.54, 4.8, 0.22, 0.42);
  mkGrate(0.6, 2.54, 0.42, 0.22);
  mkGrate(-3.0, 2.54, 0.42, 0.22);
  mkGrate(-4.27, -0.4, 0.18, 0.4);
  mkGrate(0.2, -4.95, 0.4, 0.18);

  const manholeTex = manholeTexture();
  const manholeMat = mats.toon('#ffffff', { map: manholeTex });
  for (const m of L.manholes) {
    const c = circle(m.r, 24, manholeMat, { x: m.x, y: 0.042, z: m.z, ground: true, cast: false, receive: true, parent: g });
    c.name = 'manhole';
    const ringGeo = new THREE.TorusGeometry(m.r, 0.018, 6, 28);
    const ring = new THREE.Mesh(ringGeo, mats.toon(C.metalLight));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(m.x, 0.044, m.z);
    ring.castShadow = false;
    ring.receiveShadow = true;
    g.add(ring);
  }

  /* ------------------------------------------------------------------ */
  /* puddles on the raised sidewalks / alley (road puddles are wetGround) */
  /* ------------------------------------------------------------------ */
  const puddleMat = new THREE.MeshBasicMaterial({
    color: '#172339',
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    toneMapped: false,
    fog: true,
  });
  const sidewalkPuddles = [
    { x: 1.68, z: 1.62, rx: 0.34, rz: 0.2, seed: 7 },
    { x: -4.27, z: -2.2, rx: 0.2, rz: 1.0, seed: 8 },
    { x: -0.6, z: -4.4, rx: 0.8, rz: 0.2, seed: 9 },
    { x: 1.9, z: -4.2, rx: 0.3, rz: 0.18, seed: 10 },
    { x: -2.7, z: -4.6, rx: 0.4, rz: 0.16, seed: 11 },
  ];
  for (const p of sidewalkPuddles) {
    const geo = puddleShape(p.rx, p.rz, p.seed);
    const mesh = new THREE.Mesh(geo, puddleMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(p.x, 0.126, p.z);
    mesh.receiveShadow = false;
    mesh.name = 'sidewalk-puddle';
    g.add(mesh);
  }

  /* ------------------------------------------------------------------ */
  /* storefront steps / entrance apron                                   */
  /* ------------------------------------------------------------------ */
  const stepMat = mats.toon('#9b9aa0');
  box(1.48, 0.04, 0.22, stepMat, { x: 0.5, y: 0.16, z: 0.94, cast: false, receive: true, parent: g });
  box(1.48, 0.02, 0.18, mats.toon('#b6b5ba'), { x: 0.5, y: 0.185, z: 0.9, cast: false, receive: true, parent: g });

  // raised road reflector studs along the crosswalk edge
  const studMat = new THREE.MeshBasicMaterial({ color: '#d8dde6', toneMapped: false });
  for (let i = 0; i < 6; i++) {
    const s = box(0.08, 0.012, 0.08, studMat, { x: 3.36, y: 0.045, z: 2.6 + i * 0.6, cast: false, receive: false, parent: g });
    s.rotation.y = 0.2;
  }

  // hanging cable from the store wall to the base border? (kept for props)

  // expose a helper for other modules to get the ground height
  ctx.groundHeight = (x, z) => {
    if (x > 1.3 && x < 2.3 && z > -5.8 && z < 1.0) return L.walkY;
    if (z > 1.0 && z < 2.3) return L.walkY;
    if (x > L.sideRoad.x0 && x < L.sideRoad.x1) return L.roadY;
    if (z > L.mainRoad.z0 && z < L.mainRoad.z1) return L.roadY;
    return 0.12;
  };

  return g;
}
