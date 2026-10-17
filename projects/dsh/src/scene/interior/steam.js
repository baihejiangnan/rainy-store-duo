/* Gentle steam above the oden pot, the coffee spout and the hot-snack warmer.
 * One InstancedMesh of camera-facing soft puffs, animated from ctx.onUpdate.
 */
import * as THREE from 'three';
import { glowSpriteTexture } from '../../core/textures.js';

export function buildSteam(I) {
  const grp = I.group('steam');
  const tex = glowSpriteTexture({ size: 96, inner: '#ffffff', mid: 'rgba(255,255,255,0.55)' });
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: tex,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    fog: true,
  });
  const geo = new THREE.PlaneGeometry(1, 1);

  // emitter: position, puffs, rise, spread
  const emitters = [
    { x: 0.79, y: 1.3, z: 0.08, n: 9, rise: 0.42, spread: 0.07, speed: 0.17, wob: 0.05 }, // oden pot
    { x: 0.68, y: 1.44, z: -0.44, n: 6, rise: 0.3, spread: 0.03, speed: 0.26, wob: 0.02 }, // coffee spout
    { x: 0.79, y: 1.47, z: 0.4, n: 6, rise: 0.26, spread: 0.04, speed: 0.3, wob: 0.025 }, // hot warmer
  ];

  const puffs = [];
  const rand = I.rand;
  emitters.forEach((e, ei) => {
    for (let i = 0; i < e.n; i++) {
      puffs.push({
        ex: e.x + (rand() - 0.5) * e.spread * 2,
        ey: e.y + rand() * 0.03,
        ez: e.z + (rand() - 0.5) * e.spread * 2,
        rise: e.rise * (0.75 + rand() * 0.5),
        speed: e.speed * (0.8 + rand() * 0.45),
        wob: e.wob * (0.6 + rand() * 0.9),
        phase: (i + rand() * 0.4) / e.n + ei * 0.13,
        s0: 0.045 + rand() * 0.02,
        s1: 0.16 + rand() * 0.09,
        freq: 1.1 + rand() * 0.9,
      });
    }
  });

  const mesh = new THREE.InstancedMesh(geo, mat, puffs.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = 3;
  grp.add(mesh);

  const m4 = new THREE.Matrix4();
  const v3 = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s3 = new THREE.Vector3();
  const col = new THREE.Color();
  const cam = I.ctx.camera;

  const update = (t) => {
    if (cam) q.copy(cam.quaternion);
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i];
      let life = (t * p.speed + p.phase) % 1;
      if (life < 0) life += 1;
      const wob = Math.sin(t * p.freq + p.phase * 9.1) * p.wob * (0.25 + life);
      const wob2 = Math.cos(t * p.freq * 0.83 + p.phase * 5.7) * p.wob * (0.25 + life);
      v3.set(p.ex + wob, p.ey + life * p.rise, p.ez + wob2);
      const sc = p.s0 + life * p.s1;
      s3.set(sc, sc, sc);
      m4.compose(v3, q, s3);
      mesh.setMatrixAt(i, m4);
      // fade in quickly, out slowly; additive so brightness == density
      const fade = Math.min(1, life * 6) * Math.pow(1 - life, 1.5);
      col.setScalar(0.16 + fade * 0.72);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  update(0);
  I.ctx.onUpdate(update);
  return grp;
}
