import * as THREE from 'three';
import { L } from '../../core/layout.js';
import { box, group, plane, rounded } from '../../core/geom.js';

/* Glowing vending machines (two on the side walk + one dim old one in the alley). */
export function buildVending(ctx, P) {
  const { mats, textures, refs } = P.ctx;
  refs.vending = { lights: [], glows: [] };
  const outline = (mesh, thickness, color) => ctx.outline(mesh, thickness, color);

  // shared little textures
  const recycleLabel = P.label(128, 48, (cx, w, h) => {
    cx.fillStyle = '#eef2ea';
    cx.fillRect(0, 0, w, h);
    cx.fillStyle = '#2f4c3a';
    cx.font = '900 21px "Yu Gothic", "Meiryo", sans-serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('カン・ビン', w / 2, h / 2 + 1);
    cx.strokeStyle = '#4d6b57';
    cx.lineWidth = 3;
    cx.strokeRect(1.5, 1.5, w - 3, h - 3);
  });
  const ventMat = P.label(128, 128, (cx, w, h) => {
    cx.clearRect(0, 0, w, h);
    cx.fillStyle = '#262a32';
    for (let y = 8; y < h - 6; y += 13) cx.fillRect(8, y, w - 16, 5);
  }, { transparent: true });

  function mkMachine(cfg) {
    const g = group(cfg.name, P.g);
    g.position.set(cfg.backX, cfg.baseY, cfg.z);
    g.rotation.y = cfg.ry || 0;

    const depth = cfg.depth;
    const width = cfg.width;
    const h = cfg.h;
    const frontX = depth + 0.005;

    // body (back plane sits at local x=0, front faces +x)
    const body = rounded(depth, h, width, 0.045, mats.toon(cfg.bodyColor), {
      x: depth / 2, y: h / 2, z: 0, parent: g,
    });
    outline(body, cfg.outline ?? 0.018, '#101219');
    // plinth
    box(depth + 0.04, 0.06, width + 0.04, mats.toon('#2b2e36'), {
      x: depth / 2, y: 0.03, z: 0, parent: g, cast: false,
    });

    // lit front panel
    const frontTex = textures.vendingFrontTexture({ body: cfg.frontBody, warm: cfg.warm });
    const frontMat = new THREE.MeshBasicMaterial({
      map: frontTex,
      toneMapped: false,
      color: new THREE.Color(cfg.brightness, cfg.brightness, cfg.brightness),
    });
    const front = plane(width - 0.04, h - 0.03, frontMat, {
      x: frontX + 0.004, y: h / 2, z: 0, ry: Math.PI / 2, parent: g, cast: false, receive: false,
    });
    front.renderOrder = 3;

    // top cap + thin bright light bar
    box(depth + 0.03, 0.05, width + 0.03, mats.toon('#3f444d'), {
      x: depth / 2, y: h + 0.02, z: 0, parent: g,
    });
    const barMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(cfg.brightness * 1.1, cfg.brightness * 1.08, cfg.brightness),
      toneMapped: false,
    });
    plane(width - 0.1, 0.018, barMat, {
      x: frontX + 0.006, y: h - 0.055, z: 0, ry: Math.PI / 2, parent: g, cast: false, receive: false,
    }).renderOrder = 4;

    // side louvre (visible from the +z orbit side)
    if (depth > 0.55) {
      plane(depth * 0.5, h * 0.26, ventMat, {
        x: depth * 0.42, y: h * 0.62, z: width / 2 + 0.007, parent: g, cast: false, receive: false,
      });
    }

    // coin / bill unit on the viewer's right
    const cz = -width * 0.33;
    box(0.13, 0.3, 0.15, mats.toon('#3b4048'), {
      x: frontX + 0.045, y: h * 0.56, z: cz, parent: g,
    });
    box(0.014, 0.09, 0.02, mats.toon('#121419'), {
      x: frontX + 0.115, y: h * 0.585, z: cz - 0.02, parent: g, cast: false,
    });
    box(0.014, 0.03, 0.05, mats.toon('#121419'), {
      x: frontX + 0.115, y: h * 0.5, z: cz + 0.02, parent: g, cast: false,
    });
    // coin return catch + tiny led
    box(0.05, 0.035, 0.06, mats.toon('#22252c'), {
      x: frontX + 0.06, y: h * 0.44, z: cz, parent: g, cast: false,
    });
    const ledMat = new THREE.MeshBasicMaterial({ color: '#7de8a6', toneMapped: false });
    box(0.012, 0.012, 0.012, ledMat, {
      x: frontX + 0.116, y: h * 0.63, z: cz + 0.035, parent: g, cast: false,
    });

    // recycle opening + label on the left
    const rz = width * 0.27;
    box(0.02, 0.09, 0.15, mats.toon('#14161c'), {
      x: frontX + 0.006, y: 0.22, z: rz, parent: g, cast: false,
    });
    plane(0.18, 0.062, recycleLabel, {
      x: frontX + 0.009, y: 0.32, z: rz, ry: Math.PI / 2, parent: g, cast: false, receive: false,
    }).renderOrder = 5;
    // pickup flap
    box(0.04, 0.085, 0.3, mats.toon('#1a1d24'), {
      x: frontX + 0.012, y: 0.11, z: 0, parent: g, cast: false,
    });

    // warm/cool glow bleed in front of the machine
    const glowColor = cfg.warm ? '#e7c89c' : '#bfe6ff';
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: P.getGlowTex('warm'),
      color: glowColor,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: cfg.glowOpacity,
      toneMapped: false,
      fog: true,
    }));
    sp.position.set(frontX + (cfg.glowOffset ?? 0.42), h * 0.62, 0);
    const gsc = cfg.glowScale ?? 1;
    sp.scale.set(1.55 * gsc, 1.85 * gsc, 1);
    sp.renderOrder = 4;
    g.add(sp);
    refs.vending.glows.push(sp);

    // machine light spilling onto the wet pavement
    const light = new THREE.PointLight(new THREE.Color(glowColor), cfg.lightIntensity, cfg.lightDistance, 2);
    light.position.set(frontX + (cfg.lightOffset ?? 0.62), h * 0.62, 0);
    g.add(light);
    refs.vending.lights.push(light);

    // contact shadow on the walk
    const wx = cfg.backX + Math.cos(cfg.ry || 0) * depth * 0.5;
    const wz = cfg.z - Math.sin(cfg.ry || 0) * depth * 0.5;
    P.shadow(wx, wz, depth * 0.72, width * 0.66);

    return g;
  }

  // the two lit machines on the side walk, backs against the store wall
  for (const v of L.vending) {
    const blue = v.color === 'blue';
    mkMachine({
      name: `vending-${v.color}`,
      backX: v.x,
      z: v.z,
      baseY: L.walkY,
      depth: v.d,
      width: v.w,
      h: 1.85,
      ry: 0,
      bodyColor: blue ? '#3568a8' : '#c9cbc6',
      frontBody: blue ? '#3f7fd0' : '#dfe2dd',
      warm: false,
      brightness: blue ? 1.06 : 1.02,
      glowOpacity: 0.34,
      lightIntensity: blue ? 1.5 : 1.2,
      lightDistance: 2.7,
    });
  }

  // one older, dimmer machine in the narrow alley (backs against the neighbour wall)
  mkMachine({
    name: 'vending-alley-old',
    backX: -4.6,
    z: -2.35,
    baseY: 0.12,
    depth: 0.5,
    width: 0.62,
    h: 1.7,
    ry: 0.035,
    bodyColor: '#b9ad98',
    frontBody: '#d8cbb2',
    warm: true,
    brightness: 0.66,
    glowOpacity: 0.2,
    lightIntensity: 0.55,
    lightDistance: 1.7,
    outline: 0.016,
    // the alley is only ~0.7 m wide: keep the glow/light just off the front panel
    glowOffset: 0.06,
    lightOffset: 0.1,
    glowScale: 0.55,
  });
}
