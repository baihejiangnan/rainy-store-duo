import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { C } from './core/palette.js';
import { L } from './core/layout.js';
import { makeGradientMap, makeMaterials } from './core/materials.js';
import { setOutlineFn, group } from './core/geom.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as geom from './core/geom.js';
import * as textures from './core/textures.js';
import { setupPost } from './core/post.js';

import { buildEnvironment } from './scene/environment.js';
import { buildGround } from './scene/ground.js';
import { buildStoreExterior } from './scene/storeExterior.js';
import { buildInterior } from './scene/interior.js';
import { buildProps } from './scene/props.js';
import { buildSurroundings } from './scene/surroundings.js';
import { buildAtmosphere } from './scene/atmosphere.js';

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
const snapMode = params.get('snap') === '1';
const renderer = new THREE.WebGLRenderer({
  antialias: false,
  alpha: false,
  powerPreference: 'high-performance',
  stencil: false,
  preserveDrawingBuffer: snapMode,
});
renderer.setClearColor(new THREE.Color(C.skyTop), 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
const usePost = params.get('post') !== '0';
renderer.toneMappingExposure = parseFloat(params.get('exp') || '0.98');
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);
renderer.domElement.id = 'scene-canvas';

const dpr = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(dpr);
renderer.setSize(window.innerWidth, window.innerHeight, false);

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.skyTop);
const camera = new THREE.PerspectiveCamera(L.camera.fov, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(L.camera.start.x, L.camera.start.y, L.camera.start.z);

camera.layers.enable(1);
camera.layers.enable(2);
camera.layers.enable(3);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(L.camera.target.x, L.camera.target.y, L.camera.target.z);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.8;
controls.enablePan = false;
controls.minDistance = L.camera.minDistance;
controls.maxDistance = L.camera.maxDistance;
controls.minPolarAngle = L.camera.minPolar;
controls.maxPolarAngle = L.camera.maxPolar;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.18;
controls.update();

const gradientMap = makeGradientMap([0.33, 0.55, 0.77, 1.0]);
const mats = makeMaterials(gradientMap);
setOutlineFn(mats.addOutline);

const root = group('diorama');
scene.add(root);

const updates = [];
const refs = {};

const ctx = {
  THREE,
  scene,
  root,
  camera,
  controls,
  renderer,
  L,
  C,
  mats,
  refs,
  geom,
  textures,
  outline: (mesh, thickness = 0.014, color) => mats.addOutline(mesh, thickness, color),
  onUpdate: (fn) => updates.push(fn),
  extraUpdate: (fn) => updates.push(fn),
  rng: (() => {
    const fallback = textures.rng(90210);
    return (seed) => (seed === undefined ? fallback() : textures.rng(seed));
  })(),
  groundHeight: () => L.walkY,
};

const builders = [
  ['environment', buildEnvironment],
  ['ground', buildGround],
  ['store-exterior', buildStoreExterior],
  ['interior', buildInterior],
  ['props', buildProps],
  ['surroundings', buildSurroundings],
  ['atmosphere', buildAtmosphere],
];
for (const [name, fn] of builders) {
  try {
    fn(ctx);
  } catch (err) {
    console.error(`[scene] ${name} failed:`, err);
  }
}

const warmTint = new THREE.Color('#ffd0a0');
const interiorGroup = root.getObjectByName('store-interior');
if (interiorGroup) {
  interiorGroup.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    const mat = o.material;
    if (mat && mat.isMeshToonMaterial && !mat.map && mat.color && !mat.transparent) mat.color.lerp(warmTint, 0.2);
  });
}
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
const atmo = root.getObjectByName('atmosphere');
if (atmo) atmo.traverse((o) => { o.layers.set(2); });
// small details only need to appear in the main camera; the planar reflection
// is blurry enough that excluding them saves hundreds of draws per update.
root.traverse((o) => {
  if (!o.isMesh || o.isInstancedMesh || o.userData.isOutline) return;
  if (!o.geometry) return;
  if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
  const r = o.geometry.boundingSphere ? o.geometry.boundingSphere.radius : 1;
  if (r < 0.38) o.layers.set(3);
});
renderer.info.autoReset = true;

/* Merge static meshes that share a material. The model has >1.2k small objects;
   batching same-material static pieces cuts draw calls substantially without
   changing the look. Animated groups and custom/transparent materials are left
   untouched. */
function optimizeStaticMeshes() {
  const buckets = new Map();
  const skipGroupName = /door-panel|traffic-signal|atmosphere/i;
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.geometry) return;
    if (o.userData.isOutline || o.userData.noMerge) return;
    if (o.children.length) return;
    if (Array.isArray(o.material) || !o.material) return;
    if (o.material.transparent || o.material.isShaderMaterial) return;
    if (!(o.material.isMeshToonMaterial || o.material.isMeshBasicMaterial)) return;
    if (o.geometry.attributes.color) return;
    if (o.layers.mask === 2) return;
    if (o.matrixWorld.determinant() < 0) return;
    let p = o;
    while (p && p !== root) {
      if (skipGroupName.test(p.name || '')) return;
      p = p.parent;
    }
    const key = [o.material.uuid, o.castShadow ? 1 : 0, o.receiveShadow ? 1 : 0, o.layers.mask, o.renderOrder].join('|');
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(o);
  });
  let mergedCount = 0;
  const mergedRoot = group('merged-static', root);
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const geos = [];
    for (const mesh of list) {
      mesh.updateWorldMatrix(true, false);
      const g = mesh.geometry.clone();
      g.applyMatrix4(mesh.matrixWorld);
      if (g.index) {
        const ni = g.toNonIndexed();
        g.dispose();
        geos.push(ni);
      } else {
        geos.push(g);
      }
    }
    for (const g of geos) {
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) {
        g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      }
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
      }
    }
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const first = list[0];
    const mesh = new THREE.Mesh(merged, first.material);
    mesh.castShadow = first.castShadow;
    mesh.receiveShadow = first.receiveShadow;
    mesh.renderOrder = first.renderOrder;
    mesh.layers.mask = first.layers.mask;
    mesh.frustumCulled = true;
    mesh.name = 'merged-static';
    mergedRoot.add(mesh);
    for (const old of list) old.parent.remove(old);
    mergedCount += list.length;
  }
  console.log('[perf] merged static meshes:', mergedCount, '->', mergedRoot.children.length, 'draws');
}
optimizeStaticMeshes();
renderer.info.autoReset = true;
const post = setupPost(renderer, scene, camera, window.innerWidth, window.innerHeight, dpr);
post.bloom.strength = 0.22;
post.bloom.threshold = 1.02;
post.bloom.radius = 0.4;
window.__setExposure = (v) => { renderer.toneMappingExposure = v; };
if (Array.isArray(refs.interiorLights)) {
  refs.interiorLights.forEach((l) => { l.intensity *= 1.55; l.color.set('#ffb066'); });
  const warmFill = new THREE.PointLight(new THREE.Color('#ffb066'), 9.5, 4.2, 2.0);
  warmFill.position.set(-0.45, 2.28, -0.9);
  root.add(warmFill);
}
window.__togglePost = (on) => { window.__USE_POST = on; };
window.__post = post;
const clock = new THREE.Clock();
let elapsed = 0;
let frames = 0;

// pause the lazy turntable while the viewer is interacting
let idleTimer = null;
controls.addEventListener('start', () => {
  controls.autoRotate = false;
  if (idleTimer) clearTimeout(idleTimer);
});
controls.addEventListener('end', () => {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    controls.autoRotate = true;
  }, 9000);
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(ratio);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  post.setSize(w, h, ratio);
}
window.addEventListener('resize', () => {
  clearTimeout(window.__resizeTimer);
  window.__resizeTimer = setTimeout(resize, 80);
});

const VIEWS = {
  hero: { pos: [11.5, 11.8, 21.0], target: [0.0, 0.8, -0.5] },
  front: { pos: [0.8, 4.4, 16.2], target: [-0.4, 1.5, -0.2] },
  corner: { pos: [7.4, 2.35, 8.0], target: [0.0, 1.55, -0.2] },
  close: { pos: [7.0, 4.0, 7.4], target: [-0.3, 1.5, 0.1] },
  interior: { pos: [4.2, 2.0, 3.2], target: [-0.4, 1.4, -1.4] },
  side: { pos: [15.0, 5.6, 1.2], target: [-0.2, 1.4, -0.6] },
  back: { pos: [-10.5, 7.8, -13.0], target: [-0.2, 1.35, -1.2] },
  top: { pos: [0.1, 19.5, 7.5], target: [0, 0, 0.1] },
  signs: { pos: [6.0, 5.2, 6.6], target: [0.2, 2.9, 0.6] },
};
window.__capture = (name = 'hero') => {
  const v = VIEWS[name] || VIEWS.hero;
  controls.autoRotate = false;
  camera.position.set(v.pos[0], v.pos[1], v.pos[2]);
  controls.target.set(v.target[0], v.target[1], v.target[2]);
  controls.update();
  return name;
};
window.__views = Object.keys(VIEWS);
window.__snapshot = (view) => {
  if (view && view !== 'current') window.__capture(view);
  if (usePost && window.__USE_POST !== false) post.render(elapsed);
  else renderer.render(scene, camera);
  return renderer.domElement.toDataURL('image/png');
};
window.__scene = scene;
window.__camera = camera;
window.__renderer = renderer;
window.__controls = controls;
window.__THREE = THREE;
window.__refs = refs;
renderer.info.autoReset = false;
window.__sceneInfo = () => {
  let meshes = 0, triangles = 0, instanced = 0;
  scene.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    if (o.isInstancedMesh) instanced++;
    const g = o.geometry;
    if (!g) return;
    if (g.index) triangles += (g.index.count / 3) * (o.isInstancedMesh ? o.count : 1);
    else if (g.attributes.position) triangles += (g.attributes.position.count / 3) * (o.isInstancedMesh ? o.count : 1);
  });
  return { meshes, triangles: Math.round(triangles), instanced };
};
window.__stats = () => ({
  calls: renderer.info.render.calls,
  triangles: renderer.info.render.triangles,
  points: renderer.info.render.points,
  lines: renderer.info.render.lines,
  geometries: renderer.info.memory.geometries,
  textures: renderer.info.memory.textures,
});

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  for (let i = 0; i < updates.length; i++) updates[i](elapsed, dt);
  controls.update();
  if (usePost && window.__USE_POST !== false) post.render(elapsed);
  else renderer.render(scene, camera);
  frames++;
  if (frames === 4) {
    window.__READY__ = true;
    document.body.classList.add('ready');
  }
  if (frames % 20 === 0) window.__FPS_SAMPLE__ = elapsed;
}

animate();
