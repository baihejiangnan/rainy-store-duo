import * as THREE from 'three';
import { C } from './palette.js';

/* A 4-step ramp gives the clean "three render two" banding. */
export function makeGradientMap(steps = [0.34, 0.56, 0.78, 1.0]) {
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((s, i) => {
    const v = Math.round(Math.min(1, Math.max(0, s)) * 255);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  });
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

export function makeMaterials(gradientMap) {
  const toonCache = new Map();
  const outlineCache = new Map();
  const glowCache = new Map();

  function toon(color, opts = {}) {
    const key = [
      color,
      opts.emissive ?? '',
      opts.emissiveIntensity ?? '',
      opts.map?.uuid ?? '',
      opts.transparent ? 1 : 0,
      opts.opacity ?? 1,
      opts.side ?? 0,
      opts.vertexColors ? 1 : 0,
      opts.depthWrite === false ? 0 : 1,
      opts.fog === false ? 0 : 1,
      opts.dithering ? 1 : 0,
    ].join('|');
    if (toonCache.has(key)) return toonCache.get(key);
    const m = new THREE.MeshToonMaterial({
      color,
      gradientMap,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      map: opts.map ?? null,
      transparent: !!opts.transparent,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.FrontSide,
      vertexColors: !!opts.vertexColors,
      depthWrite: opts.depthWrite !== false,
      fog: opts.fog !== false,
      dithering: !!opts.dithering,
      alphaTest: opts.alphaTest ?? 0,
    });
    m.userData.baseColor = color;
    if (opts.toneMapped === false) m.toneMapped = false;
    toonCache.set(key, m);
    return m;
  }

  function outlinedToon(color, opts = {}) {
    const m = toon(color, opts);
    m.userData.wantsOutline = opts.outline !== false;
    m.userData.outlineThickness = opts.outlineThickness ?? 0.014;
    m.userData.outlineColor = opts.outlineColor ?? '#171522';
    return m;
  }

  function glow(color, opts = {}) {
    const key = [
      color,
      opts.map?.uuid ?? '',
      opts.transparent ? 1 : 0,
      opts.opacity ?? 1,
      opts.side ?? 0,
      opts.blending ?? 1,
      opts.depthWrite === false ? 0 : 1,
      opts.toneMapped === false ? 0 : 1,
      opts.fog === false ? 0 : 1,
    ].join('|');
    if (glowCache.has(key)) return glowCache.get(key);
    const m = new THREE.MeshBasicMaterial({
      color,
      map: opts.map ?? null,
      transparent: !!opts.transparent,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.FrontSide,
      blending: opts.blending ?? THREE.NormalBlending,
      depthWrite: opts.depthWrite !== false,
      toneMapped: opts.toneMapped ?? false,
      fog: opts.fog !== false,
      alphaTest: opts.alphaTest ?? 0,
    });
    glowCache.set(key, m);
    return m;
  }

  function glass(opts = {}) {
    return new THREE.MeshBasicMaterial({
      color: opts.color ?? C.storeGlass,
      transparent: true,
      opacity: opts.opacity ?? 0.09,
      side: opts.side ?? THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
      fog: true,
      blending: opts.blending ?? THREE.NormalBlending,
    });
  }

  function outlineMaterial(color = '#171522') {
    if (outlineCache.has(color)) return outlineCache.get(color);
    const m = new THREE.MeshBasicMaterial({
      color,
      side: THREE.BackSide,
      fog: true,
      toneMapped: true,
    });
    outlineCache.set(color, m);
    return m;
  }

  /* Inverted-hull outline. Thickness is in world/diorama meters. */
  function addOutline(mesh, thickness = 0.018, color = null) {
    if (!mesh.isMesh || !mesh.geometry) return null;
    if (mesh.userData.__outline) return mesh.userData.__outline;
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
    const r = Math.max(0.02, mesh.geometry.boundingSphere.radius);
    if (r < 0.24 && !mesh.userData.forceOutline) return null;
    const s = 1 + Math.min(thickness / r, 0.12);
    const om = new THREE.Mesh(mesh.geometry, outlineMaterial(color ?? mesh.userData.outlineColor ?? '#171522'));
    om.scale.setScalar(s);
    om.castShadow = false;
    om.receiveShadow = false;
    om.userData.isOutline = true;
    om.renderOrder = -1;
    om.layers.set(1);
    mesh.add(om);
    mesh.userData.__outline = om;
    return om;
  }

  function outlineChild(geo, material, thickness, color) {
    const m = new THREE.Mesh(geo, material);
    const om = new THREE.Mesh(geo, outlineMaterial(color));
    const r = Math.max(0.02, geo.boundingSphere?.radius ?? 0.5);
    om.scale.setScalar(1 + Math.min(thickness / r, 0.12));
    om.castShadow = false;
    om.receiveShadow = false;
    om.renderOrder = -1;
    m.add(om);
    return m;
  }

  return { gradientMap, toon, outlinedToon, glow, glass, outlineMaterial, addOutline, outlineChild, toonCache };
}
