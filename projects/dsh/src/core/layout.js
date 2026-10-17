// Shared world layout. All units are meters. Base top surface = y 0.
// +x = right (side street), +z = toward viewer (main street / store front).
export const L = {
  base: {
    size: 12,
    half: 6,
    top: 0,
    thickness: 0.62,
    corner: 0.2,
    border: 0.2, // visible stone rim
    innerHalf: 5.8,
  },
  roadY: 0.02,
  walkY: 0.14,
  curbH: 0.12,

  // The two streets. Both are cut off by the square base edge.
  mainRoad: { z0: 2.3, z1: 5.8, x0: -5.8, x1: 5.8 },
  sideRoad: { x0: 2.3, x1: 5.8, z0: -5.8, z1: 5.8 },

  // Sidewalk pieces (top y = walkY)
  frontWalk: { z0: 1.0, z1: 2.3, x0: -5.8, x1: 2.3 },
  sideWalk: { x0: 1.3, x1: 2.3, z0: -5.8, z1: 1.0 },
  cornerWalk: { x0: 1.3, x1: 2.3, z0: 1.0, z1: 2.3, r: 0.55 },

  store: {
    // exterior footprint
    x0: -3.92,
    x1: 1.32,
    z0: -3.62,
    z1: 1.0,
    wallH: 3.55,
    roofH: 3.82,
    floorY: 0.14,
    ceilY: 2.62,
    wallT: 0.12,
    // facade insets
    frontZ: 1.0,
    sideX: 1.32,
    glassBottom: 0.16,
    glassTop: 2.56,
    signY0: 2.64,
    signY1: 3.4,
    // front glazing runs (x ranges)
    frontGlass: { x0: -3.78, x1: -0.18 },
    door: { x0: -0.06, x1: 1.06 }, // automatic sliding door opening
    sideGlass: { z0: -1.12, z1: 0.88 }, // side street glazing on x = sideX
    cornerCol: 0.1,
    // interior usable space
    inX0: -3.8,
    inX1: 1.2,
    inZ0: -3.5,
    inZ1: 0.92,
  },

  alley: {
    // narrow gap between store left wall and neighbour; entrance on front walk
    x0: -4.62,
    x1: -3.92,
    z0: -5.0,
    z1: 1.0,
  },

  leftNeighbour: {
    x0: -5.8,
    x1: -4.62,
    z0: -4.9,
    z1: 1.0,
    h: 5.15,
  },

  backBuilding: {
    x0: -5.8,
    x1: 1.32,
    z0: -5.8,
    z1: -5.0,
    h: 4.55,
  },

  backAlley: {
    x0: -5.8,
    x1: 1.32,
    z0: -5.0,
    z1: -3.62,
  },

  // street furniture anchors
  utilityPole: { x: -4.98, z: 2.02, h: 6.5, r: 0.11 },
  utilityPole2: { x: 2.02, z: -5.42, h: 6.1, r: 0.1 },
  streetLamp: { x: -4.72, z: 2.02, armToX: -3.35, armToZ: 2.35, y: 4.95 },
  signalPole: { x: 2.06, z: 2.06, h: 3.5, r: 0.075 },
  signalArmZ: 3.9,
  vending: [
    { x: 1.34, z: -1.32, w: 0.74, d: 0.86, ry: -Math.PI / 2, color: 'blue' },
    { x: 1.34, z: -2.2, w: 0.74, d: 0.86, ry: -Math.PI / 2, color: 'white' },
  ],
  bicycle: { x: -2.05, z: 1.64, ry: 0.07 },
  umbrellaStand: { x: -0.34, z: 1.42 },
  doormat: { x0: -0.06, x1: 1.06, z0: 1.02, z1: 1.66 },
  bins: { x: 1.36, z: -3.25 },
  bulletin: { x: -4.6, z: 0.42, y: 1.55, ry: Math.PI / 2 },
  parking: { x0: 2.42, x1: 3.52, z0: -3.15, z1: -1.15 },
  // bars along x, repeated along z (crossing the main street)
  crosswalkMain: { x0: 2.42, x1: 3.24, z0: 2.42, z1: 5.78, stripes: 8 },
  // bars along z, repeated along x (crossing the side street, in the foreground)
  crosswalkSide: { z0: 1.44, z1: 2.26, x0: 2.42, x1: 5.78, stripes: 8 },
  corner: { x: 2.3, z: 2.3 },
  farSignal: { x: 5.7, z: 5.35, y: 2.7 },
  manholes: [
    { x: 3.2, z: 1.1, r: 0.35 },
    { x: 4.9, z: 0.3, r: 0.28 },
    { x: -0.2, z: 3.15, r: 0.32 },
  ],
  puddles: [
    { x: 4.75, z: 3.05, rx: 0.85, rz: 0.45, rot: 0.35, a: 1.0 },
    { x: 3.15, z: -0.55, rx: 0.8, rz: 0.52, rot: -0.2, a: 0.95 },
    { x: 2.95, z: 4.45, rx: 0.55, rz: 0.34, rot: 0.8, a: 0.85 },
    { x: 5.05, z: 1.15, rx: 0.45, rz: 0.75, rot: 0.1, a: 0.9 },
    { x: 1.68, z: 1.62, rx: 0.28, rz: 0.18, rot: 0.4, a: 0.65 },
    { x: -4.28, z: -2.2, rx: 0.2, rz: 0.9, rot: 0.03, a: 0.8 },
    { x: -0.6, z: -4.3, rx: 0.7, rz: 0.25, rot: 0.2, a: 0.7 },
    { x: 4.0, z: 5.35, rx: 0.9, rz: 0.26, rot: 0.0, a: 0.8 },
  ],
  camera: {
    fov: 30,
    start: { x: 11.5, y: 11.8, z: 21.0 },
    target: { x: 0.0, y: 0.8, z: -0.5 },
    minDistance: 7.0,
    maxDistance: 38,
    minPolar: 0.16,
    maxPolar: 1.38,
  },
};

export const isOnMainRoad = (x, z) => z > L.mainRoad.z0 && x < L.mainRoad.x1;
export const isOnSideRoad = (x, z) => x > L.sideRoad.x0 && z > -5.8;
export const isOnRoad = (x, z) => isOnMainRoad(x, z) || isOnSideRoad(x, z);
