# 雨夜便利店街角 · 微缩场景 TEAM CONTEXT

This is a Three.js scene, built from code only (no Blender, no external assets, no network).
Final deliverable is a self-contained HTML that opens from `file://` and shows a rainy Japanese
konbini street-corner diorama: a complete square base, toon ("three-render-two") cel shading,
thick clean silhouettes, warm interior vs. cold wet night exterior, no UI at all, orbit/zoom by drag.
The scene is viewed as a collectible miniature model, camera orbits freely around it.

## Build / check

- Full build (Lead only): `node build.mjs` → `dist/index.html`, `dist/rainy-night-store.html`, `雨夜便利店.html`
- Compile check (everyone): `node tools/check.mjs` → must print `CHECK OK`
- Do NOT launch Chrome / take screenshots (Lead owns the visual QA loop; only one headless Chrome is available).
- Do NOT edit `src/main.js`, `src/core/*`, `build.mjs`, `package.json` or another teammate's file.
- Only edit your owned file(s). If you need a helper in core, message the Lead.

## Scene context passed to each builder

`export function buildX(ctx)` is called once, after lights/ground/store shell exist. Use:

```
ctx.THREE              THREE namespace
ctx.scene              THREE.Scene
ctx.root               THREE.Group - add all diorama content here (world coordinates)
ctx.camera, ctx.controls
ctx.L                  layout constants (see src/core/layout.js)
ctx.C                  palette colors (see src/core/palette.js)
ctx.mats
  .toon(color, opts)   cached MeshToonMaterial; opts: map, emissive, emissiveIntensity,
                       transparent, opacity, side, vertexColors, depthWrite, fog, toneMapped
  .glow(color, opts)   cached MeshBasicMaterial for signs/lightboxes (toneMapped false by default)
  .glass(opts)         transparent glass material
  .addOutline(mesh, thicknessMeters, color)  inverted-hull outline
ctx.outline(mesh, thickness, color)           same helper
ctx.geom               helpers: box, rounded, cyl, sphere, plane, circle, group, textPlane,
                       cylinderBetween, tube, sagWire, instanced, V3, setShadows
                       box/rounded/... accept {x,y,z,ry,rx,rz,parent,cast,receive,outline,outlineThickness,outlineColor}
ctx.textures           all canvas-texture helpers: asphaltTexture, pavingTexture, concreteTexture,
                       brickTexture, shutterTexture, tileWallTexture, martSignTexture, martVerticalTexture,
                       posterTexture, magazineTexture, streetNameTexture, windowDecalTexture,
                       vendingFrontTexture, parkingSignTexture, stopSignTexture, noticeBoardTexture,
                       roadTextTexture, glowSpriteTexture, windowGlowTexture, skyTexture, noiseTexture,
                       canvas2d, drawText, verticalText, rng, tex
ctx.onUpdate(fn)       register fn(timeSeconds, deltaSeconds) called every frame
ctx.rng(seed)          seeded PRNG (use for scattered details so visuals are stable)
ctx.groundHeight(x,z)  approximate ground Y (0.02 road, 0.14 sidewalk, 0.12 alley)
ctx.refs               shared cross-module registry (see contract below)
```

Add a group for your module (`const g = ctx.geom.group('interior', ctx.root)`), then add everything to it.
Return the group at the end if convenient. Builders are wrapped in try/catch by the Lead, but a
runtime exception still kills your section, so check `node tools/check.mjs` and be conservative.

## Style rules (very important)

- **Three-render-two**: mostly `MeshToonMaterial` (`ctx.mats.toon`). Flat, clean colors, 4-band ramp.
  Avoid MeshStandardMaterial/PBR except tiny hardware if truly needed. No textures with photographic noise.
- **Outlines**: use `ctx.outline` on the big readable masses (buildings, machines, furniture silhouettes).
  Outline color default `#171522`; thickness 0.012–0.03 m. Do NOT outline every product or glass.
- **Wet night**: cool blue/indigo exterior (`#9db8ff` moon, `#7488c8` hemi), warm interior
  (`#ffd9a0`, cream whites, teal/orange store accents). Exterior surfaces should stay a bit dark
  and desaturated; the shop interior must be the brightest warm area.
- **Anime everyday**: tidy, believable Japanese konbini clutter, not a generic sci-fi set.
  Use small readable props, Japanese signage drawn with canvas (`Yu Gothic` fonts via helpers).
- **Detail density but clean**: many small objects are good, but keep geometry low-poly and use
  shared materials/geometries. Prefer simple boxes/cylinders with crisp silhouettes over subdivision.
- **No UI, no text overlays in 3D space except in-world signage/posters** (canvas textures are fine).
- **No external assets** (no image files, no CDN, no font files). Canvas + system fonts only.
- **Performance**: target < 500 added draw calls per module, < 250k triangles total. Use InstancedMesh
  (`ctx.geom.instanced`) for bottles/cans/books/railings/rain if you have many. Reuse geometries.
  Avoid large transparent planes stacked on each other.
- Everything is built to the same scale: 1 unit ≈ 1 meter. A person would be ~1.7 units (no people!).
- No humans. A small cat is allowed (props or surroundings, only one).

## World layout (top view; +x right, +z front/toward default camera)

- Base: 12×12 square, rounded slab, top at y=0. Visible stone border from 5.8 to 6.0.
- Main street: z 2.3…5.8, all x. Side street: x 2.3…5.8, all z. Intersection: x>2.3,z>2.3.
- Front sidewalk: z 1.0…2.3 (top y 0.14). Side sidewalk: x 1.3…2.3.
- Store footprint: x -3.92…1.32, z -3.62…1.0. Front facade z=1.0, side facade x=1.32.
  Interior floor y=0.14, ceiling y=2.62, usable x -3.74…1.14, z -3.44…0.9.
  Front fixed glass x -3.78…-0.2; automatic door x -0.06…1.06; side glass z -1.12…0.88.
  Sign band y 2.64…3.4; awning at y≈2.57 projecting over the front walk; roof ≈3.8.
- Alley (narrow): x -4.62…-3.92, z -3.62…1.0. Back alley: z -5.0…-3.62 behind store.
- Left neighbour: x -5.8…-4.62, z -4.9…1.0, h≈5.15 (cut by base left edge).
- Back building slice: x -5.8…1.32, z -5.8…-5.0, h≈4.55 (cut by base back edge).
- Vending machines: x≈1.34 (against store side wall), z -1.32 and -2.2, facing +x.
- Bicycle at (-2.05, 1.64) on the front walk. Umbrella stand (-0.34,1.42). Doormat x -0.06…1.06,z 1.02…1.66.
- Utility pole (-4.98, 2.02), h 6.5. Lamp head reaches x≈-3.35,z≈2.35,y≈4.95.
  Second pole (2.02,-5.42), h 6.1.
- Signal pole (2.06,2.06). Far signal at (5.7,5.35,y2.7).
- Parking bay on the side road: x 2.42…3.52, z -3.15…-1.15.
- Crosswalks: main-street zebra at x 2.42…3.24, z 2.42…5.78; side-street zebra at
  z 1.44…2.26, x 2.42…5.78. Manholes at (3.2,1.1),(4.9,0.3),(-0.2,3.15).
- The Lead already builds: base, wet asphalt + planar puddle reflection, sidewalks, curbs,
  road paint/crosswalks/manholes/drains, store exterior shell/glass/doors/signs/awning/roof,
  environment lights/sky/fog. Do not duplicate these.

## Shared refs contract (set these from modules)

- `refs.doors`: already set by store shell:
  `{ left: Group, right: Group, closedLeft: number, closedRight: number, openAmount: 0.5 }`
  Atmosphere animates `left.position.x = closedLeft - open*0.5`, `right.position.x = closedRight + open*0.5`.
- `refs.signs`: already filled with `{ mat, base: Color, flicker: 0..1, name }[]`; atmosphere flickers.
- `refs.interiorLights`: array of interior PointLights; interior teammate may add more; atmosphere can pulse subtly.
- `refs.glassPanes`: already filled: `{type:'front', x0,x1,z,y0,y1}` or `{type:'side', z0,z1,x,y0,y1}`.
  Atmosphere attaches rain shader planes slightly outside these panes.
- `refs.traffic`: Props must set something like
  `{ vehicleRed, vehicleGreen, vehicleAmber, pedestrianRed, pedestrianGreen, lights: [...], glowMats: [...] }`
  for Atmosphere to animate. Alternatively animate it inside Props and set `refs.traffic.animatedByProps = true`.
- `refs.farSignal`: atmosphere may add/animate if surroundings/props create it.
- `refs.signsBlade`: optional.
- `refs.atmosphere` / any extra: document in a short comment at the top of your module.

## Module assignments

### 1) Interior (`src/scene/interior.js`) — owner: teammate "interior"
Fill the shop interior so it is bright, warm, real and clearly legible through the large front
and side glass. The Lead has already built the floor, ceiling, interior wall surfaces, ceiling
light panels, 3 warm point lights, and a fridge-area cool light. Replace the temporary baseline
fixtures. Must include:
- back-wall glowing drinks fridge (sliding glass doors, colorful rows of bottles/cans, top lightbox);
- 3 gondola shelf runs (x≈-2.6…0.4) with shelves of bento, onigiri, snacks, cup noodles, bread,
  candy, seasonal goods, price tags; everything tidy and readable from outside;
- checkout counter with register/POS screen, card reader, staff side;
- coffee machine, hot-snack warmer, oden pot/counter with steam wisps, ice-cream freezer;
- magazine rack with colorful covers; poster panels; small ceiling ads;
- floor guide strips/arrows, a backroom door, lockers/shelving, stacked boxes;
- a visible ATM or ticket machine near the side glass if space allows;
- 2–4 more warm point lights with limited distance so the interior reads golden from outside
  (avoid leaking/overlighting the exterior too much; use distance 2.4–3.2);
- restrained extra steam/smoke.
Aim for the “densely stocked but tidy” konbini look; keep aisles legible and don’t block the
view of the glowing back wall. Performance: use instancing for bottles/cans/candy.

### 2) Exterior props (`src/scene/props.js`) — owner: teammate "props"
Replace the placeholder pole/vending boxes with detailed street furniture:
utility pole + transformer + insulators + wires; street-lamp arm/head fixture (the actual
spotlight already exists in environment); second pole + sagging wires; 2 vending machines on the
side walk + 1 dimmer machine in the alley (glowing front textures, coin slots, recycle bins);
detailed bicycle (spokes, basket, fenders, kickstand, lock); umbrella stand with a few umbrellas;
3 trash/recycle bins; traffic signal pole with vehicle + pedestrian signal, street-name sign;
stop sign / P sign / convex mirror; white Japanese pipe guardrails (segments, not blocking view);
AC outdoor units; bulletin board; parking wheel stops; alley/back crates, gas cylinders, pipes,
broom, plants, wet leaves; contact-shadow decals. A small cat in the alley is welcome.
Keep the front glass and the main sign readable from the hero camera. Use `ctx.refs.traffic`.
Coordinate all anchors with `ctx.L`.

### 3) Surroundings (`src/scene/surroundings.js`) — owner: teammate "surroundings"
Replace the two grey massing blocks with a believable, cut-by-base-edge Japanese block:
- left neighbour: 2-storey old shop/izakaya (shutters, small lit windows, balcony, pipes,
  dim vertical sign, tiled/flat roof, AC, moss/stains), cut cleanly at the left base edge;
- back building slice: concrete facade with dark windows, service doors, meters, pipes,
  fire-escape-ish railings, TV antenna, roofline, dim warm windows, cut at back base edge;
- back alley: corrugated overhang, stacked beer crates, gas cylinders, bins, drain, puddles,
  dim wall lamp, cables, notices;
- narrow side alley entrance between shop and neighbour: store wall pipes/AC/meter, wall lamp,
  crates, puddle, noren/curtain or door detail; make it tempting to peek into when orbiting;
- small far-edge details across the street: distant traffic signal (shared with atmosphere),
  utility box, guardrail ends, weeds/plants, low wall/hedge to give the right base edge depth;
- no blocking of the store facade; keep the composition compact and layered.
Aim for 360° viewing quality (back/left also interesting) and a clean “cut-away diorama” edge.

### 4) Atmosphere / motion (`src/scene/atmosphere.js`) — owner: teammate "atmosphere"
Replace the drizzle placeholder. All animation via `ctx.onUpdate(t, dt)`, deterministic-ish and
frame-rate independent. Implement:
- continuous rain: 2500+ instanced streak quads, camera-facing, slight wind slant, wrapping
  volume over the base, layered near/far, visible against lamps but not obliterating the frame;
- splash/ripple rings on wet ground/puddles (~100 instanced shader rings) + small splash glints;
- awning/roof drips: several emitters along the awning/side awning/roof edges; animated drops and
  impact ripples; occasional bursts;
- rain-on-glass shader overlays on front fixed panes, side panes and both sliding door panels
  (attach door overlays as children of `refs.doors.left/right` so they slide with the doors);
  streaks should run down with wobble, subtle droplets, transparent enough to see the warm interior;
- automatic doors: open/close every 14–24s with eased sliding, 3–4s open, via `refs.doors`;
- sign flicker: subtle stochastic flicker of `refs.signs` (especially the vertical blade sign) and
  occasional micro-flicker of the interior lights; no strobing, keep it cozy;
- traffic signal cycle using `refs.traffic` if present (or skip if Props animates it): vehicle
  red/green every ~12–18s, pedestrian signal changes and blinks; also animate the far distant
  signal with a small glow;
- wet-street light smear glints under the storefront/vending/lamp (cheap additive planes with soft
  gradient, gently shimmering) to sell the wet reflections;
- light mist/haze drifting low near the street, very subtle; optional tiny falling leaves.
- Do not add UI. Do not modify ground/shop geometry. Use `ctx.refs.wetGround` if useful.
