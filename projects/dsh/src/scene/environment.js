import * as THREE from 'three';
import { C } from '../core/palette.js';
import { L } from '../core/layout.js';
import { skyTexture, glowSpriteTexture } from '../core/textures.js';
import { circle, group, plane } from '../core/geom.js';

export function buildEnvironment(ctx) {
  const { scene, root, mats, onUpdate } = ctx;

  scene.fog = new THREE.FogExp2(new THREE.Color(C.fog), 0.016);

  // --- sky dome -----------------------------------------------------------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(58, 32, 24),
    new THREE.MeshBasicMaterial({
      map: skyTexture({ w: 1024, h: 1024 }),
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      toneMapped: true,
    })
  );
  sky.name = 'sky';
  sky.renderOrder = -100;
  scene.add(sky);

  // --- lights -------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(new THREE.Color('#7488c8'), new THREE.Color('#241f2c'), 0.42);
  hemi.name = 'hemi';
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(new THREE.Color('#9db8ff'), 0.72);
  moon.position.set(-6.5, 13.5, 9.0);
  moon.target.position.set(-0.2, 0.6, -0.6);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1536, 1536);
  moon.shadow.camera.left = -8.2;
  moon.shadow.camera.right = 8.2;
  moon.shadow.camera.top = 8.2;
  moon.shadow.camera.bottom = -8.2;
  moon.shadow.camera.near = 2;
  moon.shadow.camera.far = 32;
  moon.shadow.bias = -0.00045;
  moon.shadow.normalBias = 0.022;
  moon.shadow.radius = 2;
  scene.add(moon);
  scene.add(moon.target);

  // cool rim from behind to separate silhouettes from the night sky
  const magenta = new THREE.DirectionalLight(new THREE.Color('#ff77a8'), 0.12);
  magenta.position.set(8, 5, -9);
  scene.add(magenta);
  const rim = new THREE.DirectionalLight(new THREE.Color('#5e7cff'), 0.28);
  rim.position.set(8, 7, -10);
  scene.add(rim);

  // warm street lamp (the pole itself lives in props.js)
  const lamp = new THREE.SpotLight(new THREE.Color('#ffcf98'), 68, 16, 1.0, 0.6, 1.8);
  lamp.position.set(L.streetLamp.x, L.streetLamp.y, L.streetLamp.z);
  lamp.target.position.set(L.streetLamp.armToX, 0.1, L.streetLamp.armToZ);
  lamp.castShadow = false;
  scene.add(lamp);
  scene.add(lamp.target);

  // warm spill from the shop entrance, sits just outside the glass
  const spill = new THREE.PointLight(new THREE.Color('#ffc78f'), 11.0, 8.5, 2.0);
  spill.position.set(0.55, 2.25, 1.85);
  scene.add(spill);

  // cool bounce off the wet street
  const bounce = new THREE.PointLight(new THREE.Color('#7d9be0'), 5.0, 9, 2.2);
  bounce.position.set(3.8, 1.1, 3.4);
  scene.add(bounce);

  // vending machine / corner glow fill (props adds the machine itself)
  const cornerFill = new THREE.PointLight(new THREE.Color('#bfe9ff'), 3.0, 5.5, 2.2);
  cornerFill.position.set(1.9, 1.15, -1.7);
  scene.add(cornerFill);

  // --- lamp visuals -------------------------------------------------------
  const glowTex = glowSpriteTexture({ size: 256, inner: 'rgba(255,240,205,1)', mid: 'rgba(255,190,112,0.32)' });
  const lampGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: '#ffd9a8',
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85,
      toneMapped: false,
      fog: false,
    })
  );
  lampGlow.position.set(L.streetLamp.x + 0.22, L.streetLamp.y - 0.05, L.streetLamp.z + 0.08);
  lampGlow.scale.set(2.3, 2.3, 1);
  root.add(lampGlow);

  // fake pool of lamp light on the wet pavement
  const poolTex = glowSpriteTexture({ size: 256, inner: 'rgba(255,214,158,0.5)', mid: 'rgba(255,180,100,0.18)' });
  const pool = plane(5.2, 4.2, new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.65,
    toneMapped: false,
    fog: true,
  }), { x: L.streetLamp.x + 0.9, y: 0.055, z: L.streetLamp.z + 0.55, ground: true });
  pool.rotation.z = 0.2;
  pool.name = 'lamp-pool';
  root.add(pool);

  // soft overcast city glow behind the block (pure background, no geometry on the base)
  const cityGlowTex = glowSpriteTexture({ size: 256, inner: 'rgba(160,180,240,0.5)', mid: 'rgba(90,105,160,0.16)' });
  const cityGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: cityGlowTex, color: '#7f94cd', transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, opacity: 0.22, toneMapped: false, fog: false,
  }));
  cityGlow.position.set(10, 9.5, -14);
  cityGlow.scale.set(24, 14, 1);
  cityGlow.renderOrder = -50;
  scene.add(cityGlow);
  const warmGlowTex = glowSpriteTexture({ size: 256, inner: 'rgba(255,190,130,0.42)', mid: 'rgba(200,110,70,0.12)' });
  const cityWarm = new THREE.Sprite(new THREE.SpriteMaterial({
    map: warmGlowTex, color: '#d99a68', transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, opacity: 0.18, toneMapped: false, fog: false,
  }));
  cityWarm.position.set(-11, 4.8, -10);
  cityWarm.scale.set(14, 8, 1);
  cityWarm.renderOrder = -50;
  scene.add(cityWarm);

  // pale glow over the store facade sign
  const signGlowTex = glowSpriteTexture({ size: 256, inner: 'rgba(255,246,214,0.55)', mid: 'rgba(120,225,210,0.16)' });
  const signGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: signGlowTex,
      color: '#fff1cf',
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.55,
      toneMapped: false,
      fog: true,
    })
  );
  signGlow.position.set(-1.1, 3.2, 1.45);
  signGlow.scale.set(6.2, 2.1, 1);
  root.add(signGlow);

  // gentle lamp flicker so the frame never feels frozen
  const lampBase = lamp.intensity;
  onUpdate((t, dt) => {
    const f = 1 + Math.sin(t * 7.3) * 0.008 + Math.sin(t * 19.7) * 0.004;
    lamp.intensity = lampBase * f;
    spill.intensity = 10.0 * (1 + Math.sin(t * 4.1) * 0.01);
    pool.material.opacity = 0.63 + Math.sin(t * 5.2) * 0.015;
  });

  // soft haze near the ground (billboards, barely there)
  const hazeTex = glowSpriteTexture({ size: 256, inner: 'rgba(150,185,255,0.08)', mid: 'rgba(90,110,180,0.03)' });
  const hazeMat = new THREE.MeshBasicMaterial({
    map: hazeTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.55,
    toneMapped: false,
    fog: false,
  });
  for (let i = 0; i < 5; i++) {
    const h = plane(7 + i * 2.4, 3.4 + i, hazeMat, {
      x: -2 + i * 1.5,
      y: 1.6 + i * 0.2,
      z: 3.6 - i * 1.2,
      ry: i * 0.6,
    });
    h.rotation.x = 0;
    h.renderOrder = 5;
  }

  return { hemi, moon, lamp, spill, signGlow, lampGlow };
}
