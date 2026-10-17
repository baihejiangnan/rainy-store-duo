/* Three gondola shelf runs: bento, onigiri, bread, snacks, cup noodles,
 * candy, price rails, POP flags and end-cap posters.
 * Both long sides are stocked (the camera orbits), products are instanced.
 */
export function buildGondolas(I, S) {
  const { F, toon, box, inst, outline, rand } = I;
  const zc = -1.335;
  const z0 = -2.26;
  const z1 = -0.41;
  const len = z1 - z0; // 1.85
  const W = 0.62;
  const halfW = W / 2;
  const runs = [-2.94, -1.72, -0.5];
  const levels = [F + 0.33, F + 0.62, F + 0.9, F + 1.16];

  const grp = I.group('gondolas');
  const bodyMat = toon('#f4eee2');
  const plateMat = toon('#e9e2d2');
  const tealMat = toon('#2fa89b');

  /* ---- plinths (individually, they get an outline) ---- */
  runs.forEach((x) => {
    const plinth = box(W, 0.19, len, bodyMat, { x, y: F + 0.095, z: zc, parent: grp });
    outline(plinth, 0.012, '#3a352f');
    box(W + 0.012, 0.035, len + 0.01, tealMat, { x, y: F + 0.2, z: zc, parent: grp, cast: false });
  });

  /* ---- instanced structure ---- */
  const plates = [];
  const lips = [];
  const spines = [];
  const ends = [];
  const caps = [];
  runs.forEach((x) => {
    for (let l = 1; l < levels.length; l++) {
      plates.push({ x, y: levels[l], z: zc, sx: W, sy: 0.026, sz: len - 0.05 });
    }
    for (let l = 0; l < levels.length; l++) {
      for (const s of [-1, 1]) {
        lips.push({ x: x + s * (halfW - 0.006), y: levels[l] - 0.028, z: zc, sx: 0.012, sy: 0.052, sz: len - 0.06 });
      }
    }
    spines.push({ x, y: F + 0.785, z: zc, sx: 0.05, sy: 0.91, sz: len - 0.06 });
    ends.push({ x, y: F + 0.745, z: z0 + 0.018, sx: W, sy: 1.11, sz: 0.036 });
    ends.push({ x, y: F + 0.745, z: z1 - 0.018, sx: W, sy: 1.11, sz: 0.036 });
    caps.push({ x, y: F + 1.245, z: zc, sx: 0.1, sy: 0.028, sz: len - 0.05 });
  });
  inst(I.unitBox, plateMat, plates, { cast: false, receive: true });
  inst(I.unitBox, toon('#e0d7c4'), lips, { cast: false, receive: true });
  inst(I.unitBox, bodyMat, spines, { cast: false, receive: true });
  inst(I.unitBox, plateMat, ends, { cast: false, receive: true });
  inst(I.unitBox, tealMat, caps, { cast: false, receive: true });

  /* ---- price rails ---- */
  const railT = [];
  runs.forEach((x) => {
    for (let l = 0; l < levels.length; l++) {
      for (const s of [-1, 1]) {
        railT.push({
          x: x + s * (halfW - 0.004), y: levels[l] - 0.03, z: zc,
          sx: len - 0.08, sy: 0.062, ry: s * Math.PI / 2,
        });
      }
    }
  });
  // rotated instances of a unit plane: local x becomes z after yaw
  const railMesh = inst(I.unitPlane, I.signMat(S.priceStrip, { side: I.THREE.FrontSide }), railT, { cast: false, receive: false });
  railMesh.renderOrder = 1;

  /* ---- products ---- */
  const TYPES = {
    noodle: { geo: 'cyl', sx: 0.098, sy: 0.105, sz: 0.098, colors: ['#d8564c', '#f1e9d4', '#efc24f', '#5fb37c', '#e88a45'] },
    snack: { geo: 'box', sx: 0.034, sy: 0.14, sz: 0.1, colors: ['#d8564c', '#3e7fb5', '#efc24f', '#8a6fb5', '#4fae8b', '#e07a45'] },
    candy: { geo: 'box', sx: 0.05, sy: 0.085, sz: 0.062, colors: ['#e05f6f', '#4a8fbe', '#e9c04f', '#6fb37c', '#8a6fb3'], rows: 2 },
    onigiri: { geo: 'onigiri', sx: 0.1, sy: 0.034, sz: 0.1, colors: ['#f6f1e4'] },
    bento: { geo: 'box', sx: 0.155, sy: 0.05, sz: 0.125, colors: ['#c94f45', '#8b5a3c', '#e6b44f', '#3c6f5f', '#5b6f8c'] },
    bread: { geo: 'box', sx: 0.12, sy: 0.1, sz: 0.15, colors: ['#d9a05b', '#f0d9a8', '#c98b52'] },
    sand: { geo: 'box', sx: 0.115, sy: 0.065, sz: 0.135, colors: ['#e9d9b0', '#cbb07a', '#f2e6c8'] },
  };

  const mixes = [
    // left run: snacks & sweets
    [[{ t: 'noodle', n: 8 }], [{ t: 'snack', n: 13 }], [{ t: 'candy', n: 8 }], [{ t: 'snack', n: 12 }]],
    // middle run: fresh food
    [[{ t: 'noodle', n: 10 }], [{ t: 'onigiri', n: 15 }], [{ t: 'bento', n: 8 }], [{ t: 'bread', n: 9 }]],
    // right run: mixed
    [[{ t: 'bento', n: 7 }, { t: 'sand', n: 4 }], [{ t: 'snack', n: 13 }], [{ t: 'noodle', n: 7 }, { t: 'candy', n: 6 }], [{ t: 'bread', n: 8 }]],
  ];

  const buckets = new Map(); // key: geo|color -> [{x,y,z,sx,sy,sz,rx,rz}]
  const nori = [];
  const push = (key, t) => {
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(t);
  };

  const fill = (x, levelY, side, segs) => {
    let z = z0 + 0.12;
    for (const seg of segs) {
      const spec = TYPES[seg.t];
      const rows = spec.rows || 1;
      const gapZ = 0.016;
      for (let i = 0; i < seg.n; i++) {
        if (z + spec.sz > z1 - 0.08) break;
        const color = spec.colors[(i + seg.n + Math.floor(rand() * 3)) % spec.colors.length];
        for (let r = 0; r < rows; r++) {
          const xo = (halfW - 0.024 - spec.sx / 2) - r * (spec.sx + 0.022);
          const xpos = x + side * xo;
          const zpos = z + spec.sz / 2;
          if (spec.geo === 'onigiri') {
            const yOff = spec.sx / 2; // triangle stands up after the rotation
            push(`onigiri|#f6f1e4`, {
              x: xpos, y: levelY + 0.013 + yOff, z: zpos,
              sx: spec.sx, sy: spec.sy, sz: spec.sz, rx: -Math.PI / 2, rz: side * Math.PI / 2,
            });
            nori.push({
              x: xpos + side * (spec.sy / 2 + 0.002), y: levelY + 0.026, z: zpos,
              sx: 0.006, sy: 0.05, sz: 0.072,
            });
          } else {
            push(`${spec.geo}|${color}`, {
              x: xpos, y: levelY + 0.013 + spec.sy / 2, z: zpos,
              sx: spec.sx, sy: spec.sy, sz: spec.sz,
            });
          }
        }
        z += spec.sz + gapZ;
      }
      z += 0.03;
    }
  };

  runs.forEach((x, ri) => {
    for (let l = 0; l < levels.length; l++) {
      for (const side of [-1, 1]) fill(x, levels[l], side, mixes[ri][l]);
    }
  });

  const geoFor = (kind) => (kind === 'cyl' ? I.unitCyl : kind === 'onigiri' ? I.unitCyl3 : I.unitBox);
  buckets.forEach((list, key) => {
    const [kind, color] = key.split('|');
    inst(geoFor(kind), toon(color), list, { cast: false, receive: true });
  });
  inst(I.unitBox, toon('#2f4c3a'), nori, { cast: false, receive: true });

  /* ---- POP flags ---- */
  const popTex = [S.popSale, S.popNew, S.popOshi];
  popTex.forEach((t, ti) => {
    const arr = [];
    runs.forEach((x, ri) => {
      for (let k = 0; k < 2; k++) {
        const side = k === 0 ? 1 : -1;
        const l = 1 + ((ri + ti + k) % 3);
        arr.push({
          x: x + side * (halfW - 0.02), y: levels[l] + 0.075, z: z0 + 0.34 + ri * 0.4 + ti * 0.22,
          sx: 0.075, sy: 0.095, ry: side * Math.PI / 2,
        });
      }
    });
    inst(I.unitPlane, I.signMat(t, { side: I.THREE.FrontSide }), arr, { cast: false, receive: false });
  });

  /* ---- end-cap posters facing the entrance ---- */
  const endPosters = [S.posters.onigiri, S.posters.new, S.posters.ice];
  runs.forEach((x, i) => {
    I.sign(endPosters[i], 0.46, 0.58, { x, y: F + 0.73, z: z1 + 0.004, mul: 0.96, parent: grp });
  });
  // small basket of shopping baskets next to the right run
  const basketMat = toon('#a8d3d8');
  const baskets = [];
  for (let i = 0; i < 6; i++) {
    baskets.push({ x: -0.94, y: F + 0.05 + i * 0.085, z: 0.5, sx: 0.44, sy: 0.09, sz: 0.32, ry: 0.08 });
  }
  inst(I.unitBox, basketMat, baskets, { cast: false, receive: true });
  return grp;
}
