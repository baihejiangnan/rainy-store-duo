import * as THREE from 'three';
import { C } from '../core/palette.js';
import { L } from '../core/layout.js';
import { group } from '../core/geom.js';
import { glowSpriteTexture } from '../core/textures.js';

import { buildPoles } from './props/poles.js';
import { buildVending } from './props/vending.js';
import { buildBicycle } from './props/bicycle.js';
import { buildSignal } from './props/signal.js';
import { buildStreet } from './props/street.js';
import { buildBack } from './props/back.js';

/*
 * Exterior street furniture for the rainy konbini corner.
 *
 * Shared refs written here (in addition to the contract in TEAM_CONTEXT.md):
 *   refs.traffic  : cycle-ready signal handles. Props does NOT animate it.
 *                   { animatedByProps:false, mode:'cycle-ready',
 *                     vehicleRed, vehicleGreen, vehicleAmber,          // MeshBasic lens materials
 *                     pedestrianRed, pedestrianGreen,                  // shared ped lens materials
 *                     vehicleLight, pedestrianLight,                   // PointLights
 *                     lights:[...], glowMats:[{role,mat,sprite}...],
 *                     setVehicle('red'|'green'|'amber'),
 *                     setPedestrian('red'|'green'),
 *                     setPedestrianBlink(visible) }
 *   refs.propsRoot : the 'street-props' group
 *   refs.vending   : { lights:[PointLight], glows:[Sprite] } machine accent light
 *
 * Everything is anchored to ctx.L; nothing is added taller than y=6.7 near the
 * storefront facade, so the front glass and main sign stay readable from the hero cam.
 */

export function buildProps(ctx) {
  const { root, mats, L: lay } = ctx;
  const g = group('street-props', root);

  const P = {
    ctx,
    THREE,
    mats,
    C,
    L: lay,
    g,
    shadows: [],
    glowTextures: new Map(),
    /* push a soft contact-shadow decal (world coords, metres) */
    shadow(x, z, rx, rz, ry = 0, yOverride = null) {
      const gy = yOverride != null ? yOverride : ctx.groundHeight ? ctx.groundHeight(x, z) : lay.walkY;
      P.shadows.push({ x, y: gy + 0.007, z, sx: rx * 2, sz: rz * 2, ry });
    },
    /* instanced mesh from plain transform records: {x,y,z,rx,ry,rz,quat,sx,sy,sz} */
    inst(geo, mat, items, opts = {}) {
      if (!items.length) return null;
      const im = new THREE.InstancedMesh(geo, mat, items.length);
      const m = new THREE.Matrix4();
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const eu = new THREE.Euler();
      const sc = new THREE.Vector3();
      items.forEach((it, i) => {
        p.set(it.x ?? 0, it.y ?? 0, it.z ?? 0);
        if (it.quat) q.copy(it.quat);
        else {
          eu.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0);
          q.setFromEuler(eu);
        }
        sc.set(it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.s ?? 1);
        m.compose(p, q, sc);
        im.setMatrixAt(i, m);
      });
      im.instanceMatrix.needsUpdate = true;
      im.castShadow = opts.cast ?? false;
      im.receiveShadow = opts.receive ?? false;
      (opts.parent || g).add(im);
      return im;
    },
    /* shared radial glow sprite texture */
    getGlowTex(kind = 'warm') {
      let tex = P.glowTextures.get(kind);
      if (!tex) {
        tex = glowSpriteTexture({
          size: 128,
          inner: 'rgba(255,255,255,1)',
          mid: 'rgba(255,255,255,0.34)',
        });
        P.glowTextures.set(kind, tex);
      }
      return tex;
    },
    /* additive glow sprite */
    glow(color, size, opacity, x, y, z, opts = {}) {
      const tex = P.getGlowTex(opts.kind);
      const mat = new THREE.SpriteMaterial({
        map: tex,
        color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity,
        toneMapped: false,
        fog: opts.fog ?? true,
      });
      const sp = new THREE.Sprite(mat);
      sp.position.set(x, y, z);
      sp.scale.set(size, size, 1);
      sp.renderOrder = opts.renderOrder ?? 4;
      g.add(sp);
      return sp;
    },
    /* basic unlit material from a canvas draw callback */
    label(w, h, draw, opts = {}) {
      const { c, ctx: cx } = ctx.textures.canvas2d(w, h);
      draw(cx, w, h);
      const map = ctx.textures.tex(c);
      const mat = new THREE.MeshBasicMaterial({
        map,
        transparent: opts.transparent ?? false,
        side: opts.side ?? THREE.FrontSide,
        toneMapped: opts.toneMapped ?? false,
        depthWrite: opts.depthWrite ?? true,
        color: opts.color ?? '#ffffff',
        alphaTest: opts.alphaTest ?? 0,
      });
      return mat;
    },
  };

  buildPoles(ctx, P);
  buildVending(ctx, P);
  buildBicycle(ctx, P);
  buildSignal(ctx, P);
  buildStreet(ctx, P);
  buildBack(ctx, P);
  buildContactShadows(ctx, P);

  ctx.refs.propsRoot = g;
  return g;
}

/* soft round contact shadow for every grounded prop */
function buildContactShadows(ctx, P) {
  if (!P.shadows.length) return;
  const tex = glowSpriteTexture({
    size: 128,
    inner: 'rgba(255,255,255,0.92)',
    mid: 'rgba(255,255,255,0.34)',
  });
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    color: '#0b0d15',
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    toneMapped: false,
    fog: true,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  });
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);
  const im = P.inst(geo, mat, P.shadows, { cast: false, receive: false, parent: P.g });
  if (im) im.renderOrder = 2;
}
