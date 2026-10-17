import * as THREE from 'three';
import { L } from '../core/layout.js';
import { C } from '../core/palette.js';
import { glowSpriteTexture } from '../core/textures.js';

/*
 * ────────────────────────────────────────────────────────────────────────────
 *  ATMOSPHERE  ·  rain-night motion layer (owner: teammate "atmosphere")
 * ────────────────────────────────────────────────────────────────────────────
 *  Everything here is registered through ctx.onUpdate(t, dt) and is
 *  frame-rate independent. No UI, no geometry overrides of other modules.
 *
 *  refs READ (defensive — every one is optional):
 *    refs.doors          {left,right,closedLeft,closedRight,openAmount}
 *    refs.signs          [{mat, base, flicker, name}]
 *    refs.interiorLights PointLight[]
 *    refs.fridgeGlow     PointLight (optional)
 *    refs.glassPanes     [{type:'front',x0,x1,z,y0,y1} | {type:'side',z0,z1,x,y0,y1}]
 *    refs.traffic        {vehicleRed,vehicleGreen,vehicleAmber,pedestrianRed,
 *                         pedestrianGreen,glowMats[],lights[],animatedByProps?}
 *    refs.farSignal      {redMat,amberMat,greenMat,glowMat,sprite,setState?}
 *                         (provided by the surroundings module)
 *    refs.wetGround      (not touched — it already ripples)
 *
 *  refs WRITTEN:
 *    refs.atmosphere     debug/QA handles + TUNE object (see bottom)
 *
 *  Draw calls added: rain 1, ground rings 1, awning drips 1 + drip rings 1,
 *  glass overlays 6 (front fixed 1, side fixed 3, sliding doors 2),
 *  door glow sprite 1, wet-street glints 1 (merged), mist 3 sprites,
 *  falling leaves 1  →  ~16 total.
 *  Rain / rings / drips are 100% shader-animated (static instance buffers).
 * ────────────────────────────────────────────────────────────────────────────
 */

const TUNE = {
  rainNear: 500, // crisp near streaks
  rainFar: 400, // fine far layer (total 2700)
  rainTop: 7.4,
  rainSlant: 0.2,
  rainCool: '#a9c9ec',
  rainWarm: '#ffd7a2',
  rippleCount: 108,
  dripMaxRadius: 0.15,
  glintStrength: 1.25,
  glassColor: '#a9c8ff',
};

/* -------------------------------------------------------------------------- */
/* small helpers                                                              */
/* -------------------------------------------------------------------------- */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const frac = (v) => v - Math.floor(v);
const smooth = (v) => v * v * (3 - 2 * v);
const hash1 = (n) => frac(Math.sin(n * 12.9898) * 43758.5453);
const hash2 = (a, b) => frac(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);

function safe(label, fn) {
  try {
    return fn();
  } catch (e) {
    console.warn(`[atmosphere] ${label} failed:`, e);
    return null;
  }
}

function makeQuadGeometry(attrs) {
  const geo = new THREE.PlaneGeometry(1, 1);
  for (const a of attrs) {
    geo.setAttribute(a.name, new THREE.InstancedBufferAttribute(a.data, a.size));
  }
  return geo;
}

function makeQuadMesh(geo, mat, count, name, renderOrder) {
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.name = name;
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  if (renderOrder !== undefined) mesh.renderOrder = renderOrder;
  return mesh;
}

/* Shared additively-blended shader material factory. Custom shaders are kept
 * GLSL-1 simple on purpose (SwiftShader-safe): no derivatives, no texture
 * lookups, no dynamic loops, only sin/hash arithmetic. */
function additiveShader(params) {
  const mat = new THREE.ShaderMaterial({
    uniforms: params.uniforms,
    vertexShader: params.vertexShader,
    fragmentShader: params.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    fog: false,
    toneMapped: true,
  });
  return mat;
}

/* ========================================================================== */
/* 1 · RAIN                                                                   */
/* ========================================================================== */

function buildRain(ctx, parent, timeU) {
  const S = L.store;
  const rng = ctx.rng;
  const near = TUNE.rainNear;
  const far = TUNE.rainFar;
  const count = near + far;

  const inside = (x, z, x0, x1, z0, z1) => x > x0 && x < x1 && z > z0 && z < z1;

  // Rain volume bottom: never let streaks spawn inside a roofed volume.
  const rainFloorY = (x, z) => {
    let y = 0;
    if (inside(x, z, S.x0, S.x1, S.z0, S.z1)) y = S.roofH + 0.35;
    else if (inside(x, z, L.leftNeighbour.x0, L.leftNeighbour.x1, L.leftNeighbour.z0, L.leftNeighbour.z1)) {
      y = L.leftNeighbour.h + 0.35;
    } else if (inside(x, z, L.backBuilding.x0, L.backBuilding.x1, L.backBuilding.z0, L.backBuilding.z1)) {
      y = L.backBuilding.h + 0.35;
    }
    // the two awnings shelter their little strips from rain
    if (x > S.x0 - 0.1 && x < S.x1 + 0.06 && z > S.z1 + 0.01 && z < S.z1 + 1.08) y = Math.max(y, 2.64);
    if (x > S.x1 && x < S.x1 + 0.99 && z > -1.21 && z < 0.96) y = Math.max(y, 2.64);
    return Math.min(y, TUNE.rainTop - 0.6);
  };

  const base = new Float32Array(count * 4); // x, z, phase, speed
  const shape = new Float32Array(count * 4); // length, width, brightness, layer
  const span = new Float32Array(count * 2); // yMin, yMax

  for (let i = 0; i < count; i++) {
    const isNear = i < near;
    const x = (rng() * 2 - 1) * 5.9;
    const z = (rng() * 2 - 1) * 5.9;
    const yMin = rainFloorY(x, z);
    base[i * 4 + 0] = x;
    base[i * 4 + 1] = z;
    base[i * 4 + 2] = rng();
    base[i * 4 + 3] = isNear ? 7.0 + rng() * 3.2 : 5.8 + rng() * 2.6;
    shape[i * 4 + 0] = isNear ? 0.28 + rng() * 0.27 : 0.15 + rng() * 0.13; // length m
    shape[i * 4 + 1] = isNear ? 0.013 + rng() * 0.009 : 0.007 + rng() * 0.005; // width m
    shape[i * 4 + 2] = isNear ? 0.85 + rng() * 0.5 : 0.28 + rng() * 0.22; // brightness
    shape[i * 4 + 3] = isNear ? 0 : 1;
    span[i * 2 + 0] = yMin;
    span[i * 2 + 1] = TUNE.rainTop;
  }

  const geo = makeQuadGeometry([
    { name: 'aBase', data: base, size: 4 },
    { name: 'aShape', data: shape, size: 4 },
    { name: 'aSpan', data: span, size: 2 },
  ]);

  const mat = additiveShader({
    uniforms: {
      uTime: timeU,
      uSlant: { value: TUNE.rainSlant },
      uCool: { value: new THREE.Color(TUNE.rainCool) },
      uWarm: { value: new THREE.Color(TUNE.rainWarm) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uSlant;
      attribute vec4 aBase;
      attribute vec4 aShape;
      attribute vec2 aSpan;

      varying vec2 vUv;
      varying float vBright;
      varying float vFade;
      varying float vWarm;

      void main() {
        float spanH = max(0.5, aSpan.y - aSpan.x);
        float fall = mod(aBase.z * spanH - uTime * aBase.w, spanH);
        float y = aSpan.x + fall;
        vec3 basePos = vec3(aBase.x, y, aBase.y);

        // camera-oriented billboard, long axis = screen-up slanted with wind
        vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        float gust = sin(uTime * 0.181) * 0.6 + sin(uTime * 0.77 + 1.3) * 0.3;
        float slant = uSlant + gust * 0.045;
        vec3 axisLong = normalize(camUp + camRight * slant);
        vec3 axisSide = normalize(camRight - camUp * slant);

        vec3 worldPos = (modelMatrix * vec4(basePos, 1.0)).xyz
          + axisSide * (position.x * aShape.y)
          + axisLong * (position.y * aShape.x);

        vec4 mvPosition = viewMatrix * vec4(worldPos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        vUv = uv;
        vBright = aShape.z;

        float dist = length(cameraPosition - worldPos);
        float fadeNear = smoothstep(0.4, 2.0, dist);
        float fadeFar = 1.0 - smoothstep(30.0, 46.0, dist);
        float fadeTop = smoothstep(0.0, 0.9, aSpan.y - y);
        float fadeBottom = smoothstep(-0.02, 0.28, y - aSpan.x);
        vFade = fadeNear * fadeFar * fadeTop * fadeBottom;

        // warm pickup near the shop entrance and the street lamp.
        // NB: smoothstep needs edge0 < edge1 in GLSL — never write reversed
        // edges here, they are technically undefined even if most drivers cope.
        float dEntrance = length(worldPos.xz - vec2(0.5, 1.9));
        float dLamp = length(worldPos.xz - vec2(-3.0, 2.6));
        float warmA = (1.0 - smoothstep(0.3, 4.6, dEntrance))
          * (1.0 - smoothstep(0.0, 4.2, worldPos.y));
        float warmB = (1.0 - smoothstep(0.2, 3.4, dLamp))
          * (1.0 - smoothstep(1.0, 3.2, abs(worldPos.y - 4.4)));
        vWarm = clamp(warmA + warmB, 0.0, 0.72);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uCool;
      uniform vec3 uWarm;
      varying vec2 vUv;
      varying float vBright;
      varying float vFade;
      varying float vWarm;

      void main() {
        float dx = abs(vUv.x - 0.5) * 2.0;
        float edge = 1.0 - dx;
        edge = edge * edge * (3.0 - 2.0 * edge);
        // bright leading tip at the bottom (vUv.y == 0), fading tail above
        float tail = mix(0.18, 1.0, 1.0 - vUv.y);
        float a = edge * tail * vFade * vBright;
        if (a < 0.004) discard;
        vec3 col = mix(uCool, uWarm, vWarm);
        gl_FragColor = vec4(col * a, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const mesh = makeQuadMesh(geo, mat, count, 'rain-streaks', 22);
  parent.add(mesh);
  return { mesh, material: mat, count };
}

/* ========================================================================== */
/* 2 · GROUND SPLASH RINGS                                                    */
/* ========================================================================== */

function buildRipples(ctx, parent, timeU) {
  const rng = ctx.rng;
  const n = TUNE.rippleCount;
  const aPos = new Float32Array(n * 4); // x, z, phase, rate
  const aRip = new Float32Array(n * 4); // maxRadius, brightness, y, unused

  const pts = [];
  const add = (x, z) => pts.push([x, z]);
  // puddle splash rings (a bit stronger on real puddles)
  for (const p of L.puddles) {
    for (let k = 0; k < 2; k++) {
      const a = rng() * Math.PI * 2;
      const rad = Math.sqrt(rng()) * 0.85;
      add(p.x + Math.cos(a) * p.rx * rad, p.z + Math.sin(a) * p.rz * rad);
    }
  }
  // main street
  for (let i = 0; i < 44 && pts.length < n; i++) add(-5.55 + rng() * 11.1, 2.45 + rng() * 3.2);
  // side street
  for (let i = 0; i < 22 && pts.length < n; i++) add(2.45 + rng() * 3.15, -5.55 + rng() * 7.7);
  // wet sidewalks / alley spots
  const spots = [
    [1.68, 1.62], [-4.27, -2.2], [-0.6, -4.4], [1.9, -4.2], [-2.7, -4.6],
    [0.45, 1.95], [-1.4, 1.85], [-2.6, 1.6], [0.2, 2.1], [-3.4, 2.05],
  ];
  for (const s of spots) {
    if (pts.length >= n) break;
    add(s[0] + (rng() - 0.5) * 0.5, s[1] + (rng() - 0.5) * 0.35);
  }
  while (pts.length < n) add(-5.5 + rng() * 11, 2.5 + rng() * 3.1);

  for (let i = 0; i < n; i++) {
    const x = pts[i][0];
    const z = pts[i][1];
    const y = ctx.groundHeight(x, z) + 0.013;
    aPos[i * 4 + 0] = x;
    aPos[i * 4 + 1] = z;
    aPos[i * 4 + 2] = rng();
    aPos[i * 4 + 3] = 0.55 + rng() * 0.7; // cycles / second
    aRip[i * 4 + 0] = 0.09 + rng() * 0.13; // radius m
    aRip[i * 4 + 1] = 0.28 + rng() * 0.3; // brightness
    aRip[i * 4 + 2] = y;
    aRip[i * 4 + 3] = 0;
  }

  const geo = makeQuadGeometry([
    { name: 'aPos', data: aPos, size: 4 },
    { name: 'aRip', data: aRip, size: 4 },
  ]);

  const mat = additiveShader({
    uniforms: {
      uTime: timeU,
      uColor: { value: new THREE.Color('#bfd8ff') },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      attribute vec4 aPos;
      attribute vec4 aRip;
      varying vec2 vUv;
      varying float vCycle;
      varying float vAlpha;

      void main() {
        float cyc = fract(aPos.z + uTime * aPos.w);
        float r = max(0.02, aRip.x);
        vec3 center = vec3(aPos.x, aRip.z, aPos.y);
        // NOTE: local -y maps to +z so the (FrontSide) quad's normal points +Y.
        vec3 worldPos = center + vec3(position.x * r, 0.0, -position.y * r);
        vec4 mvPosition = viewMatrix * vec4(worldPos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        vUv = uv;
        vCycle = cyc;
        float fade = 1.0 - cyc;
        float dCam = length(cameraPosition - worldPos);
        float distFade = 1.0 - smoothstep(24.0, 40.0, dCam);
        vAlpha = aRip.y * fade * fade * distFade;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vCycle;
      varying float vAlpha;

      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float ring = 1.0 - smoothstep(0.0, 0.24, abs(d - vCycle * 0.92));
        ring *= 1.0 - smoothstep(0.9, 1.0, d);
        float glint = (1.0 - smoothstep(0.0, 0.30, d)) * (1.0 - smoothstep(0.0, 0.32, vCycle));
        float a = (ring * 0.55 + glint * 0.85) * vAlpha;
        if (a < 0.003) discard;
        gl_FragColor = vec4(uColor * a, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const mesh = makeQuadMesh(geo, mat, n, 'rain-ground-rings', 18);
  parent.add(mesh);
  return { mesh, material: mat, count: n };
}

/* ========================================================================== */
/* 3 · AWNING / ROOF DRIPS                                                    */
/* ========================================================================== */

function buildDrips(ctx, parent, timeU) {
  const rng = ctx.rng;
  const S = L.store;
  const emitters = [];
  const push = (x, y, z) => {
    const gy = ctx.groundHeight(x, z) + 0.013;
    if (y - gy < 0.35) return;
    emitters.push({ x, y, z, gy });
  };

  // front awning fascia
  for (let i = 0; i < 12; i++) push(-3.72 + i * 0.43, 2.42, 2.02);
  // side awning fascia
  for (let i = 0; i < 6; i++) push(2.22, 2.42, -1.05 + i * 0.38);
  // roof side edge (over the side walk)
  for (let i = 0; i < 7; i++) push(1.46, 3.92, -3.55 + i * 0.76);
  // roof back edge (over the back alley)
  for (let i = 0; i < 6; i++) push(-3.7 + i * 0.98, 3.92, -3.68);

  const n = emitters.length;
  const aStart = new Float32Array(n * 4); // x, startY, z, phase
  const aDrop = new Float32Array(n * 4); // speed, distance, brightness, burstPhase

  for (let i = 0; i < n; i++) {
    const e = emitters[i];
    aStart[i * 4 + 0] = e.x;
    aStart[i * 4 + 1] = e.y;
    aStart[i * 4 + 2] = e.z;
    aStart[i * 4 + 3] = rng();
    aDrop[i * 4 + 0] = 2.2 + rng() * 1.3; // m/s
    aDrop[i * 4 + 1] = e.y - e.gy;
    aDrop[i * 4 + 2] = 0.55 + rng() * 0.45;
    aDrop[i * 4 + 3] = rng();
  }

  const geo = makeQuadGeometry([
    { name: 'aStart', data: aStart, size: 4 },
    { name: 'aDrop', data: aDrop, size: 4 },
  ]);

  const dripMat = additiveShader({
    uniforms: {
      uTime: timeU,
      uColor: { value: new THREE.Color('#ffeed2') },
      uWidth: { value: 0.012 },
      uLength: { value: 0.085 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uWidth;
      uniform float uLength;
      attribute vec4 aStart;
      attribute vec4 aDrop;
      varying vec2 vUv;
      varying float vAlpha;

      void main() {
        float dist = max(0.3, aDrop.y);
        float rate = aDrop.x / dist;
        float cyc = fract(aStart.w - uTime * rate);
        vec3 basePos = vec3(aStart.x, aStart.y - cyc * dist, aStart.z);

        vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 worldPos = (modelMatrix * vec4(basePos, 1.0)).xyz
          + normalize(camRight) * (position.x * uWidth)
          + normalize(camUp) * (position.y * uLength);

        vec4 mvPosition = viewMatrix * vec4(worldPos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        vUv = uv;

        float burst = smoothstep(0.30, 0.78, sin(uTime * 0.37 + aDrop.w * 6.2831) * 0.5 + 0.5);
        float bright = aDrop.z * (0.40 + 0.90 * burst);
        float fadeIn = smoothstep(0.0, 0.022, cyc);
        float fadeOut = 1.0 - smoothstep(0.95, 1.0, cyc);
        float dCam = length(cameraPosition - worldPos);
        vAlpha = bright * fadeIn * fadeOut * (1.0 - smoothstep(26.0, 46.0, dCam));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vAlpha;

      void main() {
        float dx = abs(vUv.x - 0.5) * 2.0;
        float edge = 1.0 - dx;
        edge = edge * edge;
        float tail = mix(0.22, 1.0, 1.0 - vUv.y);
        float a = edge * tail * vAlpha;
        if (a < 0.004) discard;
        gl_FragColor = vec4(uColor * a, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const dripMesh = makeQuadMesh(geo, dripMat, n, 'awning-drips', 20);
  parent.add(dripMesh);

  const ringGeo = makeQuadGeometry([
    { name: 'aStart', data: aStart, size: 4 },
    { name: 'aDrop', data: aDrop, size: 4 },
  ]);
  const ringMat = additiveShader({
    uniforms: {
      uTime: timeU,
      uColor: { value: new THREE.Color('#ffe6bd') },
      uMaxR: { value: TUNE.dripMaxRadius },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uMaxR;
      attribute vec4 aStart;
      attribute vec4 aDrop;
      varying vec2 vUv;
      varying float vCycle;
      varying float vAlpha;

      void main() {
        float dist = max(0.3, aDrop.y);
        float rate = aDrop.x / dist;
        float cyc = fract(aStart.w - uTime * rate);
        vec3 center = vec3(aStart.x, aStart.y - dist, aStart.z);
        // local -y -> +z keeps the face normal at +Y (visible from above)
        vec3 worldPos = center + vec3(position.x * uMaxR, 0.0, -position.y * uMaxR);
        vec4 mvPosition = viewMatrix * vec4(worldPos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        vUv = uv;
        vCycle = cyc;
        float burst = smoothstep(0.30, 0.78, sin(uTime * 0.37 + aDrop.w * 6.2831) * 0.5 + 0.5);
        float win = 1.0 - smoothstep(0.26, 0.36, cyc);
        float age = clamp(cyc / 0.30, 0.0, 1.0);
        float dCam = length(cameraPosition - worldPos);
        vAlpha = aDrop.z * (0.35 + 0.65 * burst) * win * (1.0 - age) * (1.0 - age)
          * (1.0 - smoothstep(24.0, 42.0, dCam));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vCycle;
      varying float vAlpha;

      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float age = clamp(vCycle / 0.30, 0.0, 1.0);
        float ring = 1.0 - smoothstep(0.0, 0.26, abs(d - age * 0.84));
        ring *= 1.0 - smoothstep(0.9, 1.0, d);
        float a = ring * vAlpha;
        if (a < 0.003) discard;
        gl_FragColor = vec4(uColor * a, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const ringMesh = makeQuadMesh(ringGeo, ringMat, n, 'drip-rings', 18);
  parent.add(ringMesh);

  return { dripMesh, ringMesh, emitters: n };
}

/* ========================================================================== */
/* 4 · RAIN ON GLASS                                                          */
/* ========================================================================== */

function makeGlassRainMaterial(widthM, heightM, seed, timeU) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: timeU,
      uSize: { value: new THREE.Vector2(Math.max(0.2, widthM), Math.max(0.2, heightM)) },
      uSeed: { value: seed },
      uColor: { value: new THREE.Color(TUNE.glassColor) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uSize;
      uniform float uSeed;
      uniform vec3 uColor;
      varying vec2 vUv;

      float h11(float p) {
        p = fract(p * 0.1031);
        p *= p + 33.33;
        p *= p + p;
        return fract(p);
      }
      float h21(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      void main() {
        vec2 uv = vUv;
        vec2 p = vec2(uv.x * uSize.x, uv.y * uSize.y);
        float t = uTime + uSeed * 13.0;
        float glow = 0.0;

        // three densities of thin falling runnels, with a slow wobble
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          float cols = 8.0 + fi * 7.0;
          float colX = p.x * cols + uSeed * 4.7 + fi * 3.1;
          float ci = floor(colX);
          float fx = fract(colX) - 0.5;
          float h = h11(ci * 1.31 + fi * 19.7 + uSeed * 9.0);
          float hs = h11(ci * 2.17 + fi * 7.3 + uSeed * 3.0);
          float speed = 0.14 + h * 0.30;
          float headY = fract(hs * 2.0 - t * speed + fi * 0.41);
          float len = 0.05 + hs * 0.13;
          float wob = sin(uv.y * 21.0 + t * 1.7 + ci * 0.9) * 0.055;
          float dd = abs(fx + wob);
          float thin = 1.0 - smoothstep(0.02, 0.17, dd);
          float tr = (uv.y - headY) / len;
          float trail = smoothstep(0.0, 0.05, tr) * (1.0 - smoothstep(0.55, 1.0, tr));
          glow += thin * trail * (0.13 - fi * 0.028) * (0.55 + h * 0.9);
        }

        // two layers of clinging beads that creep down
        for (int i = 0; i < 2; i++) {
          float fi = float(i);
          vec2 cell = vec2(0.11 - fi * 0.035, 0.14 - fi * 0.045);
          vec2 q = p / cell;
          vec2 cid = floor(q);
          vec2 cf = fract(q);
          float hb = h21(cid + vec2(uSeed * 3.1, fi * 9.0));
          float exists = step(0.62, hb);
          float slide = fract(hb * 5.3 + t * (0.008 + hb * 0.016));
          vec2 dc = vec2(0.22 + h21(cid + 2.7) * 0.56, 0.25 + slide * 0.5);
          vec2 delta = (cf - dc) * cell;
          float d = length(delta);
          float body = 1.0 - smoothstep(0.003, 0.008 + fi * 0.004, d);
          float rim = smoothstep(0.004, 0.008, d) * (1.0 - smoothstep(0.008, 0.014 + fi * 0.004, d));
          glow += (body * 0.16 + rim * 0.26) * exists * (1.0 - fi * 0.4);
        }

        // faint condensation hugging the bottom edge (edge0 < edge1: GLSL)
        glow += (1.0 - smoothstep(0.0, 0.30, uv.y)) * 0.015;

        float a = clamp(glow, 0.0, 0.85);
        if (a < 0.004) discard;
        gl_FragColor = vec4(uColor * a, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    fog: false,
    toneMapped: true,
  });
}

function buildGlassRain(ctx, parent, timeU) {
  const refs = ctx.refs;
  const panes = Array.isArray(refs.glassPanes) ? refs.glassPanes : [];
  const overlays = [];
  let seed = 2.3;

  const addRect = (w, h, x, y, z, ry) => {
    const mat = makeGlassRainMaterial(w, h, seed, timeU);
    seed += 3.7;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(0.05, w), Math.max(0.05, h)), mat);
    mesh.position.set(x, y, z);
    if (ry) mesh.rotation.y = ry;
    mesh.renderOrder = 10;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    parent.add(mesh);
    overlays.push(mesh);
    return mesh;
  };

  for (const p of panes) {
    if (!p) continue;
    if (p.type === 'front') {
      const w = (p.x1 - p.x0) - 0.03;
      const h = p.y1 - p.y0;
      if (w < 0.1 || h < 0.1) continue;
      addRect(w, h, (p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, p.z + 0.02, 0);
    } else if (p.type === 'side') {
      const w = (p.z1 - p.z0) - 0.05;
      const h = p.y1 - p.y0;
      if (w < 0.1 || h < 0.1) continue;
      addRect(w, h, p.x + 0.02, (p.y0 + p.y1) / 2, (p.z0 + p.z1) / 2, Math.PI / 2);
    }
  }

  // The sliding door panes are children of refs.doors.left/right so they slide.
  const doors = refs.doors;
  if (doors && doors.left && doors.right) {
    const S = L.store;
    const panelW = (S.door.x1 - S.door.x0) / 2 - 0.015;
    const paneW = panelW - 0.08;
    const paneH = (S.glassTop - S.glassBottom) - 0.13;
    const addDoorOverlay = (doorGroup) => {
      const mat = makeGlassRainMaterial(paneW, paneH, seed, timeU);
      seed += 3.7;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(paneW, paneH), mat);
      // pane is at local z 0.01, sticker at 0.02, handle at 0.04:
      // sit between sticker and handle so nothing is coplanar
      mesh.position.set(0, -0.01, 0.026);
      mesh.renderOrder = 10;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      doorGroup.add(mesh);
      overlays.push(mesh);
    };
    addDoorOverlay(doors.left);
    addDoorOverlay(doors.right);
  }

  return overlays;
}

/* ========================================================================== */
/* 5 · AUTOMATIC SLIDING DOORS                                                */
/* ========================================================================== */

function buildDoors(ctx, parent, timeU) {
  const doors = ctx.refs.doors;
  if (!doors || !doors.left || !doors.right) return null;
  const rng = ctx.rng;

  const closedLeft = Number.isFinite(doors.closedLeft) ? doors.closedLeft : doors.left.position.x;
  const closedRight = Number.isFinite(doors.closedRight) ? doors.closedRight : doors.right.position.x;
  // storeExterior publishes openAmount = 0.5 as the max travel of EACH panel;
  // keep it as the metric while the shared handle tracks the current opening.
  const slideMax = Number.isFinite(doors.openAmount) && doors.openAmount > 0.001 ? Math.abs(doors.openAmount) : 0.5;
  doors.left.position.x = closedLeft;
  doors.right.position.x = closedRight;
  doors.openAmount = 0;

  // NOTE: environment.js already owns the entrance spill PointLight; adding a
  // second light here would only cost another forward light slot, so the door
  // breathing is sold with a cheap additive ground sprite instead.
  const glowTex = glowSpriteTexture({ size: 256, inner: 'rgba(255,226,182,0.9)', mid: 'rgba(255,186,112,0.20)' });
  const spillGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex,
    color: '#ffcf98',
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    opacity: 0,
    fog: true,
  }));
  spillGlow.position.set(0.5, 0.42, 1.9);
  spillGlow.scale.set(2.4, 1.25, 1);
  spillGlow.renderOrder = 6;
  parent.add(spillGlow);

  const OPEN_T = 0.95;
  const CLOSE_T = 1.15;

  let state = 'wait';
  let timer = 5.5 + rng() * 4.5; // first open early so the motion is noticed
  let openRaw = 0;
  let lastGlow = -1;

  ctx.onUpdate((t, dt) => {
    if (state === 'wait') {
      timer -= dt;
      if (timer <= 0) state = 'opening';
    } else if (state === 'opening') {
      openRaw = Math.min(1, openRaw + dt / OPEN_T);
      if (openRaw >= 1) {
        state = 'hold';
        timer = 3.0 + rng() * 1.0;
      }
    } else if (state === 'hold') {
      timer -= dt;
      if (timer <= 0) state = 'closing';
    } else if (state === 'closing') {
      openRaw = Math.max(0, openRaw - dt / CLOSE_T);
      if (openRaw <= 0) {
        state = 'wait';
        // wait + hold/open/close durations => opens roughly every 14-24 s
        timer = 9 + rng() * 8;
      }
    }

    const e = smooth(openRaw);
    doors.openAmount = e * slideMax; // current opening in metres (0…0.5)
    doors.left.position.x = closedLeft - e * slideMax;
    doors.right.position.x = closedRight + e * slideMax;

    // warm ground pool that grows with the opening, eased to avoid popping
    const glowTarget = 0.02 + e * 0.22;
    const glowNow = lastGlow < 0 ? glowTarget : lastGlow + (glowTarget - lastGlow) * Math.min(1, dt * 6);
    lastGlow = glowNow;
    spillGlow.material.opacity = glowNow;
  });

  return { spillGlow };
}

/* ========================================================================== */
/* 6 · SIGN FLICKER + INTERIOR LIGHT MICRO-FLICKER                            */
/* ========================================================================== */

function buildSignFlicker(ctx) {
  const rng = ctx.rng;
  const signs = Array.isArray(ctx.refs.signs) ? ctx.refs.signs : [];
  const list = [];
  signs.forEach((s, i) => {
    if (!s || !s.mat || !s.mat.color) return;
    const base = s.mat.color.clone();
    if (s.base && s.base.isColor) base.multiply(s.base);
    const name = String(s.name || '');
    const isNeighbour = /neighbour|neighbor/i.test(name);
    // surroundings asked for low-amplitude flicker only on its dim lightbox
    const flicker = clamp(Number(s.flicker) || 0.08, 0.02, 0.3) * (isNeighbour ? 0.5 : 1);
    list.push({
      mat: s.mat,
      base,
      flicker,
      phase: i * 2.17 + rng() * 0.8,
      // only the konbini's own blade sign gets the deeper stutter; the dim
      // neighbour sign stays at its (low) amplitude
      blade: /blade|vertical/i.test(name) && !isNeighbour,
      tmp: new THREE.Color(),
    });
  });

  const lights = [];
  const addLight = (l, extra) => {
    if (!l || !Number.isFinite(l.intensity)) return;
    lights.push({ light: l, base: l.intensity, phase: rng() * 6.283, extra: extra || 0 });
  };
  (Array.isArray(ctx.refs.interiorLights) ? ctx.refs.interiorLights : []).forEach((l) => addLight(l, 0));
  if (ctx.refs.fridgeGlow) addLight(ctx.refs.fridgeGlow, 0.5);

  if (!list.length && !lights.length) return null;

  ctx.onUpdate((t) => {
    /* signage: low-amplitude hum plus rare short dips, never strobing */
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const ph = s.phase;
      const hum = 1 + Math.sin(t * 13.7 + ph) * 0.008 + Math.sin(t * 23.1 + ph * 1.7) * 0.004;

      const rate = 1.7;
      const bucket = Math.floor(t * rate + ph * 5.0);
      const local = t * rate + ph * 5.0 - bucket;
      let dip = 0;
      const r = hash2(bucket, ph * 7.0);
      if (r > 0.90) {
        const w = Math.min(1, local / 0.42);
        dip = Math.sin(w * Math.PI) * ((r - 0.90) / 0.10);
      }
      // the vertical blade sign gets the occasional deeper stutter
      if (s.blade) {
        const r2 = hash2(Math.floor(t * 0.33 + ph), ph * 3.0 + 11.0);
        if (r2 > 0.88) {
          const w2 = Math.min(1, frac(t * 0.33 + ph) / 0.55);
          dip = Math.max(dip, Math.sin(w2 * Math.PI) * ((r2 - 0.88) / 0.12) * 1.25);
        }
      }

      const m = clamp(hum - s.flicker * dip * (s.blade ? 1.5 : 1.0), 0.5, 1.06);
      s.mat.color.copy(s.base).multiplyScalar(m);
    }

    /* interior lights: barely-there breathing, occasional tiny dip */
    for (let i = 0; i < lights.length; i++) {
      const L2 = lights[i];
      const ph = L2.phase;
      const hum = 1 + Math.sin(t * 7.1 + ph) * 0.012 + Math.sin(t * 17.3 + ph * 2.1) * 0.006;
      let dip = 0;
      const r = hash2(Math.floor(t * 0.9 + ph * 3.0), ph * 9.0 + 2.0);
      if (r > 0.93) {
        const local = frac(t * 0.9 + ph * 3.0);
        dip = Math.sin(Math.min(1, local / 0.6) * Math.PI) * ((r - 0.93) / 0.07) * 0.055;
      }
      L2.light.intensity = L2.base * hum * (1 - dip);
    }
  });

  return { signs: list.length, lights: lights.length };
}

/* ========================================================================== */
/* 7 · TRAFFIC LIGHT CYCLE + DISTANT FAR SIGNAL                               */
/* ========================================================================== */

function makeMatHandle(mat, glow) {
  const base = mat.color ? mat.color.clone() : new THREE.Color(1, 1, 1);
  const handle = {
    kind: 'mat',
    obj: mat,
    base,
    baseOpacity: Number.isFinite(mat.opacity) ? mat.opacity : 1,
    hasEmissive: !!(mat.emissive && mat.emissive.isColor),
    baseEmissive: mat.emissive && mat.emissive.isColor ? mat.emissive.clone() : null,
    onColor: mat.userData && mat.userData.onColor != null ? new THREE.Color(mat.userData.onColor) : null,
    offColor: mat.userData && mat.userData.offColor != null ? new THREE.Color(mat.userData.offColor) : null,
    glow: !!glow,
  };
  return handle;
}

function makeLightHandle(light) {
  return {
    kind: 'light',
    obj: light,
    base: Number.isFinite(light.intensity) ? light.intensity : 1,
    baseColor: light.color ? light.color.clone() : null,
    glow: false,
  };
}

function collectHandles(value, out) {
  if (!value) return out;
  if (Array.isArray(value)) {
    for (const v of value) collectHandles(v, out);
    return out;
  }
  if (value.isMaterial) {
    out.push(makeMatHandle(value, false));
    return out;
  }
  if (value.isLight) {
    out.push(makeLightHandle(value));
    return out;
  }
  if (value.isSprite) {
    if (value.material) out.push(makeMatHandle(value.material, true));
    return out;
  }
  if (value.isObject3D) {
    value.traverse((o) => {
      if (o.isLight) out.push(makeLightHandle(o));
      else if (o.isMesh || o.isSprite) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) if (m && m.isMaterial) out.push(makeMatHandle(m, false));
      }
    });
    return out;
  }
  // wrapper objects such as props' glowMats: [{role, mat, sprite}]
  if (typeof value === 'object') {
    if (value.mat) collectHandles(value.mat, out);
    if (value.sprite) collectHandles(value.sprite, out);
    if (value.material) collectHandles(value.material, out);
  }
  return out;
}

function classifyColor(color) {
  if (!color) return 'green';
  const r = color.r;
  const g = color.g;
  const b = color.b;
  if (r > g * 1.22 && r > b * 1.15) return g > r * 0.5 ? 'amber' : 'red';
  return 'green';
}

function applyHandle(h, on, opts) {
  const glow = opts && opts.glow;
  const mulOn = opts && opts.mulOn ? opts.mulOn : 1.3;
  const offMul = 0.12;
  if (h.kind === 'mat') {
    const m = h.obj;
    if (m.color) {
      if (h.onColor || h.offColor) {
        if (on && h.onColor) m.color.copy(h.onColor);
        else if (!on && h.offColor) m.color.copy(h.offColor);
        else m.color.copy(h.base).multiplyScalar(on ? mulOn : offMul);
      } else {
        m.color.copy(h.base).multiplyScalar(on ? mulOn : offMul);
      }
    }
    if (h.hasEmissive && m.emissive) {
      if (h.baseEmissive) m.emissive.copy(h.baseEmissive);
      else m.emissive.setRGB(0, 0, 0);
      if (on) m.emissive.addScaledVector(h.base, 0.5);
      else m.emissive.multiplyScalar(0.12);
      if (Number.isFinite(m.emissiveIntensity)) m.emissiveIntensity = on ? 1 : 0.4;
    }
    if (glow && m.transparent && h.baseOpacity > 0.001) {
      m.opacity = h.baseOpacity * (on ? 0.95 : 0.08);
    }
  } else if (h.kind === 'light') {
    h.obj.intensity = h.base * (on ? 1 : 0.05);
  }
}

function applyGroup(list, on, opts) {
  if (!list) return;
  for (let i = 0; i < list.length; i++) applyHandle(list[i], on, opts);
}

function buildTraffic(ctx) {
  const refs = ctx.refs;
  const traffic = refs.traffic || null;
  const far = refs.farSignal || null;
  if (!traffic && !far) return null;
  const rng = ctx.rng;

  const animatedHere = !!traffic && !traffic.animatedByProps && traffic.animated !== true;
  if (!animatedHere && !far) return null;

  /* Props (task-2) exposes small helper functions on refs.traffic; prefer them
   * because they also own halo/sprite bookkeeping. Call them with the traffic
   * object as `this` so any internal state stays consistent. Raw handles are
   * the fallback (and are what the far signal uses). */
  const callHelper = (name, arg) => {
    if (!traffic || typeof traffic[name] !== 'function') return false;
    try {
      traffic[name](arg);
      return true;
    } catch (e) {
      return false;
    }
  };
  const hasHelpers = !!(traffic && (typeof traffic.setVehicle === 'function' || typeof traffic.setPedestrian === 'function'));
  const useHelpers = hasHelpers;

  const T = {
    vRed: [],
    vGreen: [],
    vAmber: [],
    pRed: [],
    pGreen: [],
    redLamps: [],
    greenLamps: [],
    amberLamps: [],
  };

  if (animatedHere) {
    T.vRed = collectHandles(traffic.vehicleRed, []);
    T.vGreen = collectHandles(traffic.vehicleGreen, []);
    T.vAmber = collectHandles(traffic.vehicleAmber, []);
    T.pRed = collectHandles(traffic.pedestrianRed, []);
    T.pGreen = collectHandles(traffic.pedestrianGreen, []);

    // additive halos: props provides [{role, mat, sprite}] wrapper objects
    const specs = Array.isArray(traffic.glowMats) ? traffic.glowMats : traffic.glowMats ? [traffic.glowMats] : [];
    for (const spec of specs) {
      const role = String((spec && spec.role) || '');
      const handles = [];
      collectHandles(spec, handles);
      const roleCls = /red/i.test(role) ? 'red' : /amber|yellow/i.test(role) ? 'amber' : /green/i.test(role) ? 'green' : null;
      for (const h of handles) {
        h.glow = h.kind !== 'light';
        if (h.kind === 'mat') h.baseOpacity = Math.max(h.baseOpacity, 0.55);
        const cls = roleCls || classifyColor(h.kind === 'light' ? h.baseColor : h.base);
        if (cls === 'red') T.redLamps.push(h);
        else if (cls === 'amber') T.amberLamps.push(h);
        else T.greenLamps.push(h);
      }
    }
  }

  // far signal handles (surroundings) — faint, distant, never bright
  let farApi = null;
  if (far) {
    const mk = (m) => (m && m.isMaterial && m.color ? makeMatHandle(m, true) : null);
    farApi = {
      red: mk(far.redMat),
      green: mk(far.greenMat),
      amber: mk(far.amberMat),
      glow: mk(far.glowMat),
      glowBaseOpacity: far.glowMat && Number.isFinite(far.glowMat.opacity) ? far.glowMat.opacity : 0,
      onColors: far.onColors || null,
      offColors: far.offColors || null,
      setState: typeof far.setState === 'function' ? far.setState : null,
      state: 'red',
    };
  }

  const applyFar = (state) => {
    if (!farApi) return;
    farApi.state = state;
    // Prefer surroundings' own helper: it already knows the exact on/off lens
    // colours, the halo tint and the sprite scale. Only fall back to manual
    // material mutation if the helper is missing.
    if (farApi.setState) {
      try {
        farApi.setState.call(far, state);
        return;
      } catch (e) {
        /* fall through to manual */
      }
    }
    const lens = (h, key) => {
      if (!h) return;
      const on = farApi.onColors && farApi.onColors[key];
      const off = farApi.offColors && farApi.offColors[key];
      if (on && off) h.obj.color.set(state === key ? on : off);
      else h.obj.color.copy(h.base).multiplyScalar(state === key ? 1.15 : 0.10);
    };
    lens(farApi.red, 'red');
    lens(farApi.amber, 'amber');
    lens(farApi.green, 'green');
    if (farApi.glow) {
      const c = (farApi.onColors && farApi.onColors[state]) || null;
      if (c) farApi.glow.obj.color.set(c);
      else farApi.glow.obj.color.copy(farApi.glow.base);
    }
  };

  let vState = 'green'; // props boots with vehicle green / pedestrian red
  let timer = 12 + rng() * 6;
  let lastPedMode = null;
  let lastBlink = null;
  let glowPhase = rng() * 6.283;

  const applyVehicleRaw = () => {
    applyGroup(T.vRed, vState === 'red', { mulOn: 1.35 });
    applyGroup(T.vGreen, vState === 'green', { mulOn: 1.35 });
    applyGroup(T.vAmber, vState === 'amber', { mulOn: 1.4 });
    applyGroup(T.redLamps, vState === 'red', { glow: true, mulOn: 1.35 });
    applyGroup(T.greenLamps, vState === 'green', { glow: true, mulOn: 1.35 });
    applyGroup(T.amberLamps, vState === 'amber', { glow: true, mulOn: 1.4 });
  };

  const setVehicleState = () => {
    if (useHelpers && callHelper('setVehicle', vState)) return;
    if (animatedHere) applyVehicleRaw();
  };

  const setPedestrianMode = (mode) => {
    if (useHelpers && callHelper('setPedestrian', mode)) return;
    applyGroup(T.pGreen, mode === 'green', { mulOn: 1.3 });
    applyGroup(T.pRed, mode === 'red', { mulOn: 1.3 });
  };

  const setPedestrianBlink = (visible) => {
    if (useHelpers && callHelper('setPedestrianBlink', visible)) return;
    applyGroup(T.pGreen, visible, { mulOn: 1.35 });
    applyGroup(T.pRed, !visible, { mulOn: 1.35 });
  };

  const stepState = () => {
    if (vState === 'green') {
      vState = 'amber';
      timer = 2.1;
    } else if (vState === 'amber') {
      vState = 'red';
      timer = 12 + rng() * 6;
    } else {
      vState = 'green';
      timer = 12 + rng() * 6;
    }
    if (animatedHere) setVehicleState();
    if (farApi) applyFar(vState === 'red' ? 'green' : 'red');
  };

  // sync with props' initial state (vehicle green, pedestrian red)
  if (animatedHere) {
    setVehicleState();
    lastPedMode = 'red';
    setPedestrianBlink(true);
    setPedestrianMode('red');
    lastBlink = null;
  }
  if (farApi) applyFar('red');

  ctx.onUpdate((t, dt) => {
    timer -= dt;
    if (timer <= 0) stepState();

    if (animatedHere) {
      // pedestrian: green while the vehicle is red, blinking during the last 4s
      const pedMode = vState === 'red' ? 'green' : 'red';
      if (pedMode !== lastPedMode) {
        lastPedMode = pedMode;
        // make sure a mid-blink "hidden" state doesn't leak into the next phase
        setPedestrianBlink(true);
        setPedestrianMode(pedMode);
        lastBlink = null;
      }
      if (vState === 'red' && timer < 4) {
        const visible = Math.floor(t * 2.4) % 2 === 0;
        if (visible !== lastBlink) {
          lastBlink = visible;
          setPedestrianBlink(visible);
        }
      } else if (lastBlink !== null) {
        lastBlink = null;
        setPedestrianBlink(true);
      }
    }

    if (farApi && farApi.glow) {
      const s = farApi.state === 'red' ? 0.95 : 0.8;
      const shimmer = 0.9 + 0.1 * Math.sin(t * 2.3 + glowPhase);
      const target = farApi.glowBaseOpacity * s * shimmer;
      const cur = farApi.glow.obj.opacity;
      farApi.glow.obj.opacity = cur + (target - cur) * Math.min(1, dt * 3);
    }
  });

  return { animatedHere, useHelpers, hasFar: !!far };
}

/* ========================================================================== */
/* 8 · WET-STREET LIGHT SMEARS (merged additive quads)                        */
/* ========================================================================== */

function buildGlints(ctx, parent, timeU) {
  const tex = glowSpriteTexture({ size: 256, inner: 'rgba(255,255,255,0.9)', mid: 'rgba(220,220,255,0.22)' });
  const gY = (x, z) => ctx.groundHeight(x, z) + 0.035;

  const glints = [
    // store entrance warm spill
    { x: 0.5, z: 2.55, w: 2.6, d: 3.9, color: '#ffbf7a', strength: 0.22, phase: 0.0 },
    // storefront glass reflection on the walk
    { x: -2.2, z: 2.62, w: 4.0, d: 2.7, color: '#ffd9a0', strength: 0.13, phase: 1.7 },
    // vertical blade sign
    { x: 1.95, z: 1.95, w: 0.95, d: 2.5, color: '#ffd9a0', strength: 0.16, phase: 3.1 },
    // side sign smear
    { x: 2.1, z: 0.0, w: 1.5, d: 2.7, color: '#ffd9a0', strength: 0.12, phase: 4.4 },
    // vending machines (cool fronts)
    { x: 2.12, z: -1.32, w: 1.25, d: 2.0, color: '#bfe6ff', strength: 0.17, phase: 2.2 },
    { x: 2.12, z: -2.2, w: 1.25, d: 2.0, color: '#bfe6ff', strength: 0.14, phase: 5.3 },
    // street lamp
    { x: -2.9, z: 2.9, w: 1.9, d: 3.2, color: '#ffcf98', strength: 0.15, phase: 0.8 },
    // cool moon sheen on the crossing
    { x: 4.15, z: 3.45, w: 2.4, d: 3.4, color: '#9fc4ff', strength: 0.09, phase: 2.9 },
    // faint shop light smeared onto the main street
    { x: 0.3, z: 3.6, w: 4.2, d: 2.4, color: '#d7e6ff', strength: 0.07, phase: 4.9 },
    // alley lamp puddle
    { x: -4.27, z: -1.0, w: 0.75, d: 2.6, color: '#ffcf98', strength: 0.07, phase: 1.2 },
  ];

  const positions = [];
  const uvs = [];
  const colors = [];
  const phases = [];
  const indices = [];
  const c = new THREE.Color();
  // tessellate each smear so it hugs the ground slab under it (curb steps are
  // 12 cm; a single flat quad would sink below the sidewalk or float over the
  // road). Still one draw call, ~360 verts total.
  const GX = 3;
  const GZ = 3;

  for (let i = 0; i < glints.length; i++) {
    const gl = glints[i];
    const hw = gl.w / 2;
    const hd = gl.d / 2;
    c.set(gl.color).multiplyScalar(gl.strength * TUNE.glintStrength);
    for (let gz = 0; gz < GZ; gz++) {
      for (let gx = 0; gx < GX; gx++) {
        const x0 = -hw + (gx / GX) * gl.w;
        const x1 = -hw + ((gx + 1) / GX) * gl.w;
        const z0 = -hd + (gz / GZ) * gl.d;
        const z1 = -hd + ((gz + 1) / GZ) * gl.d;
        const y = gY(gl.x + (x0 + x1) / 2, gl.z + (z0 + z1) / 2);
        const base = positions.length / 3;
        // (-,-) (+,-) (+,+) (-,+) ordered so the +Y normal faces up
        positions.push(
          gl.x + x0, y, gl.z + z0,
          gl.x + x1, y, gl.z + z0,
          gl.x + x1, y, gl.z + z1,
          gl.x + x0, y, gl.z + z1,
        );
        uvs.push(
          x0 / gl.w + 0.5, z0 / gl.d + 0.5,
          x1 / gl.w + 0.5, z0 / gl.d + 0.5,
          x1 / gl.w + 0.5, z1 / gl.d + 0.5,
          x0 / gl.w + 0.5, z1 / gl.d + 0.5,
        );
        for (let k = 0; k < 4; k++) {
          colors.push(c.r, c.g, c.b);
          phases.push(gl.phase);
        }
        // same winding as the original quad: +Y facing so the planar
        // reflection never paints the underside
        indices.push(base, base + 3, base + 2, base, base + 2, base + 1);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
  geo.setIndex(indices);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: timeU,
      uMap: { value: tex },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aPhase;
      varying vec2 vUv;
      varying vec3 vColor;
      varying float vPhase;
      void main() {
        vUv = uv;
        vColor = aColor;
        vPhase = aPhase;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vColor;
      varying float vPhase;
      void main() {
        float mask = texture2D(uMap, vUv).a;
        float shimmer = 0.80 + 0.20 * sin(uTime * (0.8 + fract(vPhase) * 0.9) + vPhase * 6.2831);
        float a = mask * shimmer;
        if (a < 0.003) discard;
        gl_FragColor = vec4(vColor * a, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    // ShaderMaterial + fog:true would require ShaderChunk fog uniforms; keep it off.
    fog: false,
    toneMapped: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'wet-street-glints';
  mesh.renderOrder = 4;
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return { mesh, material: mat, count: glints.length };
}

/* ========================================================================== */
/* 9 · LOW MIST + FALLING LEAVES (subtle)                                     */
/* ========================================================================== */

function buildMist(ctx, parent) {
  const tex = glowSpriteTexture({ size: 256, inner: 'rgba(160,190,255,0.10)', mid: 'rgba(110,135,200,0.04)' });
  const specs = [
    { x: 1.2, y: 1.15, z: 3.7, sx: 8.2, sy: 2.7, op: 0.075, phase: 0.3, ax: 1.1 },
    { x: -2.6, y: 0.85, z: 3.9, sx: 9.4, sy: 2.2, op: 0.06, phase: 2.4, ax: 1.4 },
    { x: 4.5, y: 1.0, z: 1.1, sx: 5.6, sy: 2.1, op: 0.05, phase: 4.1, ax: 0.8 },
  ];
  const sprites = [];
  for (const s of specs) {
    const m = new THREE.SpriteMaterial({
      map: tex,
      color: C.mist,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      opacity: s.op,
      fog: true,
    });
    const sp = new THREE.Sprite(m);
    sp.position.set(s.x, s.y, s.z);
    sp.scale.set(s.sx, s.sy, 1);
    sp.renderOrder = 5;
    sp.name = 'drifting-mist';
    parent.add(sp);
    sprites.push({ sprite: sp, mat: m, spec: s });
  }

  ctx.onUpdate((t) => {
    for (let i = 0; i < sprites.length; i++) {
      const it = sprites[i];
      const s = it.spec;
      it.sprite.position.x = s.x + Math.sin(t * 0.045 + s.phase) * s.ax;
      it.sprite.position.z = s.z + Math.sin(t * 0.031 + s.phase * 1.7) * 0.7;
      it.mat.opacity = s.op * (0.82 + 0.18 * Math.sin(t * 0.23 + s.phase * 2.1));
    }
  });
  return sprites;
}

function buildLeaves(ctx, parent) {
  const rng = ctx.rng;
  const count = 8;
  const geo = new THREE.PlaneGeometry(0.075, 0.045);
  const mat = ctx.mats.toon('#6f7c4e', { side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.name = 'falling-leaves';
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = 3;
  parent.add(mesh);

  const leaves = [];
  const rand = (a, b) => a + rng() * (b - a);
  const reset = (i, initial) => {
    const r = rng();
    let x;
    let z;
    if (r < 0.42) {
      x = rand(-5.4, 5.4);
      z = rand(2.6, 5.4);
    } else if (r < 0.7) {
      x = rand(2.6, 5.4);
      z = rand(-5.3, 2.6);
    } else if (r < 0.84) {
      x = rand(-4.55, -4.05);
      z = rand(-4.7, 0.8);
    } else {
      x = rand(-5.3, 1.1);
      z = rand(-4.9, -3.75);
    }
    leaves[i] = {
      x,
      z,
      y: initial ? rand(0.7, 4.2) : rand(4.6, 6.4),
      vy: rand(0.28, 0.5),
      sway: rand(0.6, 1.4),
      phase: rand(0, Math.PI * 2),
      spin: rand(0.8, 2.2),
      size: rand(0.7, 1.15),
    };
  };
  for (let i = 0; i < count; i++) reset(i, true);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3(1, 1, 1);

  ctx.onUpdate((t, dt) => {
    for (let i = 0; i < count; i++) {
      const l = leaves[i];
      l.y -= l.vy * dt;
      l.x += Math.sin(t * 1.1 + l.phase) * l.sway * 0.16 * dt;
      l.z += Math.cos(t * 0.8 + l.phase * 1.3) * l.sway * 0.1 * dt;
      const gy = ctx.groundHeight(l.x, l.z) + 0.02;
      if (l.y <= gy) reset(i, false);
      e.set(
        Math.sin(t * 1.6 * l.spin + l.phase) * 0.9,
        l.phase + t * 0.5 * l.spin,
        Math.cos(t * 1.2 * l.spin + l.phase) * 0.9
      );
      q.setFromEuler(e);
      pos.set(l.x, l.y, l.z);
      scl.setScalar(l.size);
      m4.compose(pos, q, scl);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return { mesh, count };
}

/* Belt-and-braces: a ShaderMaterial with fog === true but without merged fog
 * uniforms throws inside three's refreshFogUniforms on the very first frame
 * (kills the whole render). Every material we author already sets fog:false,
 * but this keeps a future tweak from ever blacking out the scene. */
function sanitizeFog(root) {
  if (!root || !root.traverse) return 0;
  let fixed = 0;
  root.traverse((o) => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : null;
    if (!mats) return;
    for (let i = 0; i < mats.length; i++) {
      const m = mats[i];
      if (m && m.isShaderMaterial && m.fog === true && !(m.uniforms && m.uniforms.fogColor)) {
        m.fog = false;
        m.needsUpdate = true;
        fixed++;
      }
    }
  });
  return fixed;
}

/* ========================================================================== */
/* MAIN                                                                       */
/* ========================================================================== */

export function buildAtmosphere(ctx) {
  const parent = new THREE.Group();
  parent.name = 'atmosphere';
  ctx.root.add(parent);

  const timeU = { value: 0 };
  ctx.onUpdate((t) => {
    timeU.value = t;
  });

  const out = {
    group: parent,
    tuning: TUNE,
    rain: null,
    ripples: null,
    drips: null,
    glassOverlays: [],
    doors: null,
    signs: null,
    traffic: null,
    glints: null,
    mist: null,
    leaves: null,
  };

  safe('rain', () => { out.rain = buildRain(ctx, parent, timeU); });
  safe('ground ripples', () => { out.ripples = buildRipples(ctx, parent, timeU); });
  safe('awning drips', () => { out.drips = buildDrips(ctx, parent, timeU); });
  safe('glass rain', () => { out.glassOverlays = buildGlassRain(ctx, parent, timeU) || []; });
  safe('doors', () => { out.doors = buildDoors(ctx, parent, timeU); });
  safe('sign flicker', () => { out.signs = buildSignFlicker(ctx); });
  safe('traffic', () => { out.traffic = buildTraffic(ctx); });
  safe('street glints', () => { out.glints = buildGlints(ctx, parent, timeU); });
  safe('mist', () => { out.mist = buildMist(ctx, parent); });
  safe('leaves', () => { out.leaves = buildLeaves(ctx, parent); });

  // handy during the Lead's visual QA (window.__refs.atmosphere)
  safe('fog guard', () => {
    sanitizeFog(parent);
    const d = ctx.refs.doors;
    if (d) {
      sanitizeFog(d.left);
      sanitizeFog(d.right);
    }
  });

  ctx.refs.atmosphere = out;
  return parent;
}
