/* Surroundings: the old block left of the shop, the concrete slice behind it with the
   service alley, and the far base-edge vignette (distant signal, guardrail ends, hedge).

   Template: `export function buildSurroundings(ctx)` -> adds one group named
   "surroundings" under ctx.root.

   Shared refs contract (read by Atmosphere / Lead):
   - ctx.refs.farSignal = {
       group,                       // THREE.Group - distant signal at L.farSignal
       head,                        // vehicle signal head (rotated group)
       pole,                        // pole mesh
       redMat, amberMat, greenMat,  // THREE.MeshBasicMaterial lens materials (colors mutable)
       glowMat,                     // THREE.SpriteMaterial of the halo (color/opacity mutable)
       sprite,                      // THREE.Sprite using glowMat
       setState('red'|'green'|'amber'), // helper: sets lens + halo colors, returns state
       state: 'red',
       onColors: { red, amber, green }, offColors: { red, amber, green },
     }
     Default state is red; the light is small/distant. Atmosphere should only touch
     material colors / glowMat.opacity and sprite scale - no lights are added there.
   - ctx.refs.signs gets one extra dim entry:
       { mat, base: THREE.Color, flicker: 0.22, name: 'neighbour-blade' }
     (the little vertical スナック lightbox on the old neighbour; low flicker only).
   - ctx.refs.surroundings = { neighbour, backBuilding, backAlley, sideAlley, baseEdge }
     - handy for the Lead's QA / debugging.
   - Own warm point lights added here (4, all with limited distance):
       neighbour security lamp, side-alley wall lamp, side-alley paper lantern,
       back-alley wall lamp on the back building facade.
*/
import {
  glowSpriteTexture, shutterTexture, windowGlowTexture,
} from '../core/textures.js';
import { group } from '../core/geom.js';
import * as ST from './surroundings/signTextures.js';
import { buildLeftNeighbour } from './surroundings/neighbour.js';
import { buildBackBuilding, buildBackAlley } from './surroundings/backBlock.js';
import { buildSideAlley } from './surroundings/sideAlley.js';
import { buildBaseEdge } from './surroundings/edge.js';

function makeAssets() {
  return {
    /* surfaces */
    shutter: shutterTexture({ w: 512, h: 512, seed: 77 }),
    corrugated: ST.corrugatedTexture(),
    acGrille: ST.acGrilleTexture(),
    meter: ST.meterTexture(),
    crate: ST.crateTexture(),
    wood: ST.oldWoodTexture(),
    roofTiles: ST.tileRoofTexture(),
    /* signs / papers */
    oldSign: ST.oldShopSignTexture(),
    snackSign: ST.snackSignTexture(),
    noren: ST.norenTexture(),
    lantern: ST.lanternTexture(),
    notices: [
      ST.noticePaperTexture({ seed: 1, kind: 'clean' }),
      ST.noticePaperTexture({ seed: 2, kind: 'park' }),
      ST.noticePaperTexture({ seed: 3, kind: 'collect' }),
    ],
    backPlaque: ST.backPlaqueTexture(),
    servicePlaque: ST.plaqueTexture({
      title: '業務用', sub: 'SERVICE', bg: '#3a3a40', fg: '#cfc9b6', border: '#6a665a',
    }),
    /* windows */
    windowWarm: windowGlowTexture({ warm: true, seed: 4 }),
    windowCool: windowGlowTexture({ warm: false, seed: 5 }),
    darkWin: ST.darkWindowTexture(),
    /* decals / grime */
    grime: ST.grimeTexture({ seed: 7 }),
    moss: ST.grimeTexture({ seed: 23, mossy: true, strength: 1.2 }),
    cutA: ST.cutFaceTexture({ slabs: [0.03, 0.43], base: '#52525e' }),
    cutB: ST.cutFaceTexture({ slabs: [0.02, 0.444], base: '#54545f' }),
    /* glows */
    poolGlow: glowSpriteTexture({ size: 128, inner: 'rgba(255,214,158,0.5)', mid: 'rgba(255,180,100,0.18)' }),
    signalGlow: glowSpriteTexture({ size: 128, inner: 'rgba(255,120,100,0.95)', mid: 'rgba(255,70,60,0.3)' }),
  };
}

export function buildSurroundings(ctx) {
  const g = group('surroundings', ctx.root);
  const A = makeAssets();
  const parts = {};

  // Each section is isolated so one failure can never take the whole block down.
  const run = (key, fn) => {
    try {
      parts[key] = fn(ctx, g, A);
    } catch (err) {
      console.error(`[surroundings] ${key} failed:`, err);
      parts[key] = null;
    }
  };

  run('neighbour', buildLeftNeighbour);
  run('backBuilding', buildBackBuilding);
  run('backAlley', buildBackAlley);
  run('sideAlley', buildSideAlley);
  run('baseEdge', buildBaseEdge);

  ctx.refs.surroundings = parts;
  return g;
}
