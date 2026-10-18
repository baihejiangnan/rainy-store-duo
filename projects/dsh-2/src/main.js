// ─────────────────────────────────────────────────────────────────────────────
// main.js — stage, lighting, post, assembly and the animation loop.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { PAL, FONT, M, canvasTexture, roundRect, drawText, group, box, plane, label } from './core.js';
import { buildStreet } from './street.js';
import { buildBuildings } from './buildings.js';
import { buildStore } from './store.js';
import { buildInterior } from './interior.js';
import { buildProps } from './props.js';
import { buildFX } from './fx.js';

const params = new URLSearchParams(location.search);
const W = () => window.innerWidth;
const H = () => window.innerHeight;

// ── Renderer ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: false });
renderer.setSize(W(), H());
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(PAL.fog, 0.0115);

const camera = new THREE.PerspectiveCamera(35, W() / H(), 0.1, 180);
const camParam = (params.get('cam') || '').split(',').map(Number);
const tgtParam = (params.get('target') || params.get('tgt') || '').split(',').map(Number);
camera.position.set(
  camParam.length === 3 && camParam.every((n) => Number.isFinite(n)) ? camParam[0] : 12.4,
  camParam.length === 3 ? camParam[1] : 6.15,
  camParam.length === 3 ? camParam[2] : 14.75
);
const target = new THREE.Vector3(
  tgtParam.length === 3 && tgtParam.every((n) => Number.isFinite(n)) ? tgtParam[0] : 0,
  tgtParam.length === 3 ? tgtParam[1] : 1.15,
  tgtParam.length === 3 ? tgtParam[2] : 0
);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(target);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 6.5;
controls.maxDistance = 34;
controls.minPolarAngle = 0.14;
controls.maxPolarAngle = 1.5;
controls.rotateSpeed = 0.65;
controls.zoomSpeed = 0.8;
controls.update();

// ── Sky ─────────────────────────────────────────────────────────────────────
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    uTop: { value: new THREE.Color(0x05070e) },
    uMid: { value: new THREE.Color(0x0a1220) },
    uHorizon: { value: new THREE.Color(0x1a2740) },
    uGlow: { value: new THREE.Color(0x2a2440) },
  },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uGlow;
    varying vec3 vDir;
    void main() {
      float h = vDir.y;
      vec3 c = mix(uHorizon, uMid, smoothstep(-0.02, 0.30, h));
      c = mix(c, uTop, smoothstep(0.22, 0.85, h));
      float band = exp(-pow((h - 0.02) * 9.0, 2.0));
      c += uGlow * band * 0.55;
      // extremely subtle rainy haze
      c += vec3(0.004, 0.006, 0.009) * (0.5 + 0.5 * sin(vDir.x * 9.0 + vDir.z * 7.0));
      gl_FragColor = vec4(c, 1.0);
    }
  `,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(75, 32, 20), skyMat);
sky.renderOrder = -10;
scene.add(sky);

// ── Lights ──────────────────────────────────────────────────────────────────
scene.add(new THREE.HemisphereLight(0x34527e, 0x06070c, 0.46));
scene.add(new THREE.AmbientLight(0x18202f, 0.22));

const moon = new THREE.DirectionalLight(0x9fbbe8, 1.28);
moon.position.set(-7.5, 12.5, -5.5);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = -9;
moon.shadow.camera.right = 9;
moon.shadow.camera.top = 9;
moon.shadow.camera.bottom = -9;
moon.shadow.camera.near = 1;
moon.shadow.camera.far = 32;
moon.shadow.bias = -0.0006;
moon.shadow.normalBias = 0.025;
scene.add(moon);
scene.add(moon.target);
moon.target.position.set(0, 0, 0);

// ── Diorama base ────────────────────────────────────────────────────────────
const base = new THREE.Group();
scene.add(base);
const baseMat = M.toon(0x161a22);
// main plinth
box(base, [12, 0.44, 12], [0, -0.22, 0], baseMat, { cast: true });
// top trim (thin darker lip around the scene)
box(base, [12.08, 0.035, 12.08], [0, -0.018, 0], new THREE.MeshToonMaterial({ color: 0x232935 }), {});
// wider foot
box(base, [12.36, 0.09, 12.36], [0, -0.485, 0], new THREE.MeshToonMaterial({ color: 0x10131a }), { cast: true });
box(base, [12.56, 0.05, 12.56], [0, -0.555, 0], new THREE.MeshToonMaterial({ color: 0x0a0c11 }), {});
// brass edge inlay
const brass = new THREE.MeshToonMaterial({ color: 0x8d6c3c, emissive: 0x2a1e0c, emissiveIntensity: 0.35 });
for (const side of [-1, 1]) {
  box(base, [12.02, 0.012, 0.012], [0, -0.36, side * 5.999], brass, {});
  box(base, [0.012, 0.012, 12.02], [side * 5.999, -0.36, 0], brass, {});
}
// little brass feet
for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 14), brass);
  c.position.set(sx * 5.55, -0.59, sz * 5.55);
  base.add(c);
}
// front plaque
const plaqueTex = canvasTexture(1024, 232, (ctx, w, h) => {
  ctx.fillStyle = '#221a10';
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#3a2c19');
  g.addColorStop(0.5, '#241b10');
  g.addColorStop(1, '#171009');
  ctx.fillStyle = g;
  ctx.fillRect(4, 4, w - 8, h - 8);
  ctx.strokeStyle = 'rgba(198,158,92,0.9)';
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  drawText(ctx, '雨夜のコンビニ', w * 0.5, h * 0.44, { size: 78, color: '#d9b878', font: FONT.jp, letterSpacing: 14 });
  drawText(ctx, 'AKARI MART  —  A RAINY NIGHT CORNER', w * 0.5, h * 0.74, { size: 30, color: '#9d8254', font: FONT.en, letterSpacing: 7, weight: '600' });
});
const plaque = plane(base, [2.5, 0.57], [3.35, -0.205, 6.006], new THREE.MeshBasicMaterial({ map: plaqueTex }), { receive: false });
plaque.rotation.y = 0;

// ── Scene assembly ──────────────────────────────────────────────────────────
// Each module is isolated so one broken module cannot take the whole diorama
// down (and so five people can build in parallel).
const world = group(scene, [0, 0, 0], 'world');
const _errs = [];
function safe(name, fn) {
  try {
    return fn();
  } catch (e) {
    _errs.push(name + ': ' + (e && e.message));
    console.error('[scene] module build failed —', name, e);
    return null;
  }
}
const street = safe('street', () => buildStreet());
if (street) world.add(street);
const buildings = safe('buildings', () => buildBuildings());
if (buildings && buildings.group) world.add(buildings.group);
const store = safe('store', () => buildStore());
if (store && store.group) world.add(store.group);
const interior = safe('interior', () => buildInterior());
if (interior) world.add(interior);
const props = safe('props', () => buildProps());
if (props) world.add(props);
const fx = safe('fx', () => buildFX({ scene, camera, renderer }));
if (fx && fx.group) world.add(fx.group);
window.__moduleErrors = _errs;
if (new URLSearchParams(location.search).has('debug')) {
  const stats = {};
  for (const [name, g] of [['street', street], ['buildings', buildings && buildings.group], ['store', store && store.group], ['interior', interior], ['props', props], ['fx', fx && fx.group]]) {
    if (!g) continue;
    let meshes = 0, inst = 0, pts = 0;
    g.traverse((o) => {
      if (o.isInstancedMesh) inst++;
      else if (o.isPoints) pts++;
      else if (o.isMesh && o.material && o.material.visible !== false) meshes++;
    });
    stats[name] = { meshes, inst, pts };
  }
  console.log('[stats]', JSON.stringify(stats));
}

// ── Post processing ─────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.setSize(W(), H());
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(new THREE.Vector2(W(), H()), 0.56, 0.58, 0.80);
composer.addPass(bloom);

const gradePass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: new THREE.Vector2(W(), H()) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    // film-ish shoulder: bright interiors keep their gradients instead of
    // clipping into one flat white blob
    vec3 shoulder(vec3 c){
      const float k = 0.58;
      vec3 over = max(c - k, 0.0);
      return min(c, vec3(k)) + (1.0 - k) * (1.0 - exp(-over / (1.0 - k)));
    }
    void main(){
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      col = shoulder(max(col, 0.0));
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      // gentle S-curve: deepens the wet night, keeps the lit interior creamy
      vec3 sc = col * col * (3.0 - 2.0 * col);
      col = mix(col, sc, 0.18);
      // cool the shadows slightly, keep warm highlights
      col = mix(col * vec3(0.88, 0.96, 1.12), col, smoothstep(0.02, 0.55, l));
      col = mix(col, col * vec3(1.08, 1.01, 0.93), smoothstep(0.55, 1.4, l) * 0.55);
      // vignette
      vec2 d = vUv - 0.5;
      float v = smoothstep(0.86, 0.30, length(d) * 1.15);
      col *= mix(0.66, 1.0, v);
      // whisper of grain so flat gradients don't band
      col += (hash(vUv * uRes) - 0.5) * 0.0042;
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
});
composer.addPass(gradePass);
composer.addPass(new OutputPass());

// ── Resize ──────────────────────────────────────────────────────────────────
function onResize() {
  const w = W(), h = H();
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  composer.setSize(w, h);
  bloom.setSize(w, h);
  gradePass.uniforms.uRes.value.set(w, h);
  fx.onResize && fx.onResize(w, h);
}
window.addEventListener('resize', onResize);
onResize();

// ── Loop ────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
const updatables = [street, buildings && buildings.group, store && store.group, interior, props].filter(Boolean);
let elapsed = 0;
let frames = 0;
let fpsAcc = 0;
window.__ready = false;
window.__diag = {};

renderer.info.autoReset = false;
let _diagFrame = 0;

function animate() {
  requestAnimationFrame(animate);
  renderer.info.reset();
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  if (!params.has('freeze')) {
    controls.update();
  }

  for (const node of updatables) {
    if (node && node.userData && node.userData.update) node.userData.update(elapsed, dt);
  }
  if (store && store.update) store.update(elapsed, dt);
  if (buildings && buildings.update) buildings.update(elapsed, dt);
  if (fx && fx.update) fx.update(elapsed, dt);

  composer.render();
  frames++;
  fpsAcc += dt;
  if (++_diagFrame % 10 === 0) {
    // accumulated over every composer pass this frame
    window.__diag.drawCalls = renderer.info.render.calls;
    window.__diag.triangles = renderer.info.render.triangles;
    window.__diag.programs = renderer.info.programs.length;
    window.__diag.textures = renderer.info.memory.textures;
    window.__diag.geometries = renderer.info.memory.geometries;
    if (!window.__diag.sceneObjects) {
      window.__diag.sceneObjects = (() => { let n = 0; scene.traverse(() => n++); return n; })();
    }
  }
  if (!window.__ready) {
    window.__ready = true;
    window.__diag = {
      renderer: (() => {
        try {
          const gl = renderer.getContext();
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
        } catch (e) { return 'n/a'; }
      })(),
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      programs: renderer.info.programs.length,
    };
    window.__scene = scene;
    window.__camera = camera;
    window.__renderer = renderer;
  }
  if (frames % 90 === 0) {
    window.__diag.fps = Math.round(90 / Math.max(fpsAcc, 0.001));
    fpsAcc = 0;
  }
}
animate();

// expose a tiny debug hook for the screenshot harness
window.__setCam = (px, py, pz, tx, ty, tz) => {
  camera.position.set(px, py, pz);
  controls.target.set(tx, ty, tz);
  controls.update();
};













