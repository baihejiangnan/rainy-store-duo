/* ============================================================================
 * Store interior: warm, densely stocked Japanese konbini behind the front
 * glass.  The shell (floor, ceiling panels, wall linings, wainscot, glazing,
 * sliding doors, backroom door, the Lead's 3 interior point lights + the cool
 * fridge-area light) already exists in storeExterior.js -- nothing here
 * duplicates it.
 *
 * Sub-modules (all under ./interior/):
 *   common.js    shared ctx wrapper + cached canvas/plaster helpers
 *   signs.js     every canvas sign / poster / price strip used inside
 *   fridge.js    back-wall glowing drinks cooler + lightbox header
 *   gondolas.js  3 double-sided gondola runs, stocked both sides
 *   counter.js   checkout counter: POS, card reader, coffee, oden, hot warmer
 *   furniture.js magazine rack, promo table, lockers, stock boxes, ATM,
 *                mop corner, extinguisher, notice board, clock, chest freezer
 *   decor.js     hanging ceiling ads, banner, wall posters, floor arrows
 *   steam.js     instanced soft steam over oden / coffee / hot warmer
 *
 * refs exposed for other modules:
 *   refs.interiorLights  (shared array)  -> 3 extra warm PointLights appended
 *   refs.interior        -> { group, signs, parts }
 *   refs.interiorSigns   -> the sign/texture bag
 *   refs.interiorSteam   -> steam group (animated via ctx.onUpdate)
 *   refs.interiorFridge  -> fridge group
 *   refs.interiorLightsExtra -> just the 3 lights added here
 *
 * Budget: ~230 added draw calls, ~55k triangles, 3 point lights (dist 2.8-3.2).
 * ==========================================================================*/
import { makeInterior } from './interior/common.js';
import { makeSigns } from './interior/signs.js';
import { buildDrinksWall } from './interior/fridge.js';
import { buildGondolas } from './interior/gondolas.js';
import { buildCounter } from './interior/counter.js';
import { buildFurniture } from './interior/furniture.js';
import { buildDecor } from './interior/decor.js';
import { buildSteam } from './interior/steam.js';

export function buildInterior(ctx) {
  const { refs } = ctx;
  const I = makeInterior(ctx);

  let S = null;
  try {
    S = makeSigns(I);
  } catch (err) {
    console.error('[interior] signs failed:', err);
  }

  // Each block is isolated: a runtime error only costs that block.
  const parts = {};
  const blocks = [
    ['fridge', () => S && buildDrinksWall(I, S)],
    ['gondolas', () => S && buildGondolas(I, S)],
    ['counter', () => S && buildCounter(I, S)],
    ['furniture', () => S && buildFurniture(I, S)],
    ['decor', () => S && buildDecor(I, S)],
    ['steam', () => buildSteam(I)],
  ];
  for (const [name, fn] of blocks) {
    try {
      parts[name] = fn();
    } catch (err) {
      console.error(`[interior] ${name} failed:`, err);
    }
  }

  /* ---------------- extra warm fill lights ---------------- */
  // Distance-limited so they lift the shop interior without spilling outside
  // and washing out the cool night mood.  Pushed onto the shared array that
  // atmosphere/ground already pulse.
  const extra = [];
  const specs = [
    { x: 0.44, y: 2.36, z: -0.5, color: '#ffd4a2', intensity: 3.0, distance: 3.0 },
    { x: -1.7, y: 2.36, z: -1.35, color: '#ffe0b4', intensity: 2.6, distance: 3.2 },
    { x: -0.72, y: 2.34, z: -2.72, color: '#ffe9c8', intensity: 2.2, distance: 2.8 },
  ];
  for (const s of specs) {
    const light = new ctx.THREE.PointLight(s.color, s.intensity, s.distance, 2.0);
    light.position.set(s.x, s.y, s.z);
    light.castShadow = false;
    light.name = 'interior-fill';
    I.g.add(light);
    extra.push(light);
  }
  if (Array.isArray(refs.interiorLights)) refs.interiorLights.push(...extra);
  else refs.interiorLights = extra;

  /* ---------------- shared refs ---------------- */
  refs.interior = { group: I.g, signs: S, parts };
  refs.interiorSigns = S;
  refs.interiorLightsExtra = extra;
  refs.interiorFridge = parts.fridge || null;
  refs.interiorSteam = parts.steam || null;
  refs.interiorCounter = parts.counter || null;

  return I.g;
}
