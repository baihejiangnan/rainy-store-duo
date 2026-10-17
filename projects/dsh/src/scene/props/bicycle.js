import * as THREE from 'three';
import { L } from '../../core/layout.js';
import { box, cylinderBetween, group, rounded, sphere } from '../../core/geom.js';

/* Detailed parked bicycle: wheels with spokes, frame, fenders, basket, saddle,
 * handlebar, kickstand, chain/crank, coiled lock, rear reflector. */
export function buildBicycle(ctx, P) {
  const { mats } = P;
  const g = group('bicycle', P.g);
  g.position.set(L.bicycle.x, L.walkY + 0.002, L.bicycle.z);
  g.rotation.y = L.bicycle.ry;
  g.rotation.x = -0.055; // leans softly on the kickstand

  const tireMat = mats.toon('#1c1e25');
  const rimMat = mats.toon('#8d919b');
  const frameMat = mats.toon('#a83a43');
  const fenderMat = mats.toon('#8c333c');
  const darkMetal = mats.toon('#464a54');
  const rubber = mats.toon('#22242b');
  const saddleMat = mats.toon('#26242b');

  const wheelX = [-0.52, 0.52];
  const R = 0.3; // tyre centre radius
  const axleY = 0.33;

  // tyres + rims + hubs (instanced)
  const tyreGeo = new THREE.TorusGeometry(R, 0.027, 6, 26);
  P.inst(tyreGeo, tireMat, wheelX.map((x) => ({ x, y: axleY, z: 0 })), {
    cast: true, receive: false, parent: g,
  });
  const rimGeo = new THREE.TorusGeometry(R - 0.035, 0.012, 4, 22);
  P.inst(rimGeo, rimMat, wheelX.map((x) => ({ x, y: axleY, z: 0 })), {
    cast: false, receive: false, parent: g,
  });
  const hubGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.085, 8);
  P.inst(hubGeo, rimMat, wheelX.map((x) => ({ x, y: axleY, z: 0, rx: Math.PI / 2 })), {
    cast: false, receive: false, parent: g,
  });

  // spokes
  const spokeGeo = new THREE.CylinderGeometry(0.0045, 0.0045, 0.268, 4);
  const spokeItems = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (const wx of wheelX) {
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + 0.12;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const dir = new THREE.Vector3(dx, dy, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
      spokeItems.push({
        x: wx + dx * 0.145, y: axleY + dy * 0.145, z: 0.004, quat: q,
      });
    }
  }
  P.inst(spokeGeo, rimMat, spokeItems, { cast: false, receive: false, parent: g });

  // frame points (local)
  const p = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const rear = p(-0.52, axleY);
  const front = p(0.52, axleY);
  const bb = p(-0.07, 0.285);
  const seatTop = p(-0.26, 0.83);
  const headTop = p(0.36, 0.82);
  const headBot = p(0.43, 0.58);
  const tubeR = 0.022;
  const frameTubes = [
    [rear, bb], [bb, seatTop], [seatTop, headTop], [headTop, headBot],
    [headBot, bb], [rear, seatTop], [headBot, front],
  ];
  for (const [a, b] of frameTubes) {
    cylinderBetween(a, b, tubeR, frameMat, { parent: g, seg: 7, cast: true, receive: false });
  }
  // fork blades (two thin tubes, slightly splayed)
  for (const z of [-0.035, 0.035]) {
    cylinderBetween(p(0.44, 0.56, z), p(0.52, axleY, z), 0.014, frameMat, {
      parent: g, seg: 6, cast: false, receive: false,
    });
  }
  // chainstays are doubled too
  for (const z of [-0.04, 0.04]) {
    cylinderBetween(p(-0.52, axleY, z), p(-0.07, 0.285, z), 0.012, frameMat, {
      parent: g, seg: 6, cast: false, receive: false,
    });
  }

  // fenders
  const fenderGeo = new THREE.TorusGeometry(R + 0.035, 0.03, 5, 14, Math.PI * 0.8);
  P.inst(fenderGeo, fenderMat, wheelX.map((x) => ({ x, y: axleY, z: 0, rz: 0.38 })), {
    cast: true, receive: false, parent: g,
  });

  // chain ring, cog, chain runs, crank + pedals
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.012, 16), darkMetal);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(bb.x, bb.y, 0.045);
  ring.castShadow = true;
  g.add(ring);
  const cog = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.012, 10), darkMetal);
  cog.rotation.x = Math.PI / 2;
  cog.position.set(rear.x, rear.y, 0.045);
  g.add(cog);
  cylinderBetween(p(bb.x, bb.y + 0.095, 0.045), p(rear.x, rear.y + 0.043, 0.045), 0.006, rubber, {
    parent: g, seg: 4, cast: false, receive: false,
  });
  cylinderBetween(p(bb.x, bb.y - 0.095, 0.045), p(rear.x, rear.y - 0.043, 0.045), 0.006, rubber, {
    parent: g, seg: 4, cast: false, receive: false,
  });
  // crank arm + pedal
  cylinderBetween(p(bb.x, bb.y, 0.06), p(bb.x + 0.13, bb.y - 0.14, 0.08), 0.011, darkMetal, {
    parent: g, seg: 5, cast: false, receive: false,
  });
  box(0.1, 0.018, 0.055, rubber, { x: bb.x + 0.135, y: bb.y - 0.15, z: 0.1, parent: g, cast: false });
  cylinderBetween(p(bb.x, bb.y, 0.045), p(bb.x - 0.11, bb.y + 0.16, 0.06), 0.009, darkMetal, {
    parent: g, seg: 5, cast: false, receive: false,
  });

  // front basket (wire frame built from one instanced unit box)
  const basketC = { x: 0.8, y: 0.78, z: 0 };
  const bx = 0.3;
  const bz = 0.32;
  const by = 0.18;
  const barItems = [];
  const bar = (x, y, z, sx, sy, sz) => barItems.push({ x, y, z, sx, sy, sz });
  for (const yy of [basketC.y - by / 2, basketC.y + by / 2]) {
    bar(basketC.x, yy, basketC.z - bz / 2, bx, 0.012, 0.012);
    bar(basketC.x, yy, basketC.z + bz / 2, bx, 0.012, 0.012);
    bar(basketC.x - bx / 2, yy, basketC.z, 0.012, 0.012, bz);
    bar(basketC.x + bx / 2, yy, basketC.z, 0.012, 0.012, bz);
  }
  for (const sx of [-1, 0, 1]) {
    for (const sz of [-1, 1]) {
      bar(basketC.x + (sx * bx) / 2, basketC.y, basketC.z + (sz * bz) / 2, 0.009, by, 0.009);
    }
  }
  for (const sz of [-1, 1]) {
    bar(basketC.x, basketC.y, basketC.z + (sz * bz) / 2, bx, by * 0.7, 0.009);
  }
  P.inst(new THREE.BoxGeometry(1, 1, 1), mats.toon('#575c66'), barItems, {
    cast: true, receive: false, parent: g,
  });
  // basket floor + support struts
  box(bx - 0.02, 0.012, bz - 0.02, mats.toon('#4a4f58'), { x: basketC.x, y: basketC.y - by / 2, z: basketC.z, parent: g });
  cylinderBetween(p(0.52, axleY, 0), p(basketC.x - 0.1, basketC.y - by / 2, 0), 0.01, darkMetal, {
    parent: g, seg: 5, cast: false, receive: false,
  });
  // a soft bag inside
  const bag = sphere(1, mats.toon('#c9c2b4'), { x: basketC.x, y: basketC.y + 0.02, z: basketC.z, parent: g });
  bag.scale.set(0.12, 0.1, 0.12);
  ctx.outline(bag, 0.012, '#2b2720');
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.06, 5), mats.toon('#d6cfc1'));
  knot.position.set(basketC.x, basketC.y + 0.12, basketC.z);
  knot.rotation.z = 0.3;
  g.add(knot);

  // saddle + seat post
  const saddle = rounded(0.22, 0.055, 0.115, 0.025, saddleMat, {
    x: -0.28, y: 0.885, z: 0, parent: g,
  });
  ctx.outline(saddle, 0.012, '#17161b');
  cylinderBetween(seatTop, p(-0.28, 0.875, 0), 0.016, darkMetal, { parent: g, seg: 6 });
  // rear rack hint
  cylinderBetween(p(-0.44, 0.62, 0), p(-0.78, 0.56, 0), 0.012, darkMetal, {
    parent: g, seg: 5, cast: false, receive: false,
  });
  cylinderBetween(p(-0.78, 0.56, 0), p(-0.78, 0.45, 0), 0.01, darkMetal, {
    parent: g, seg: 5, cast: false, receive: false,
  });

  // stem, handlebar, grips, brake levers, bell
  const stemTop = p(0.39, 0.95, 0);
  cylinderBetween(headTop, stemTop, 0.017, darkMetal, { parent: g, seg: 6 });
  cylinderBetween(p(0.39, 0.95, -0.23), p(0.39, 0.95, 0.23), 0.015, darkMetal, {
    parent: g, seg: 6, cast: false, receive: false,
  });
  for (const z of [-0.205, 0.205]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.075, 8), rubber);
    grip.rotation.x = Math.PI / 2;
    grip.position.set(0.39, 0.95, z);
    g.add(grip);
  }
  for (const z of [-0.15, 0.15]) {
    cylinderBetween(p(0.39, 0.95, z), p(0.45, 0.9, z), 0.008, darkMetal, {
      parent: g, seg: 4, cast: false, receive: false,
    });
  }
  const bell = sphere(0.033, rimMat, { x: 0.39, y: 0.977, z: 0.11, parent: g, wSeg: 8, hSeg: 6 });
  bell.scale.set(1, 0.7, 1);

  // kickstand
  cylinderBetween(p(-0.06, 0.3, 0.05), p(-0.16, 0.005, 0.17), 0.012, darkMetal, {
    parent: g, seg: 5, cast: false, receive: false,
  });
  box(0.04, 0.012, 0.05, darkMetal, { x: -0.16, y: 0.008, z: 0.17, parent: g, cast: false });

  // coiled cable lock around the seat tube
  const lockGeo = new THREE.TorusGeometry(0.085, 0.011, 5, 14);
  const lock = new THREE.Mesh(lockGeo, mats.toon('#b0463f'));
  lock.position.set(-0.19, 0.55, 0.03);
  lock.rotation.y = Math.PI / 2;
  lock.rotation.z = 0.4;
  g.add(lock);
  box(0.05, 0.035, 0.07, mats.toon('#2e2b31'), { x: -0.19, y: 0.63, z: 0.03, parent: g, cast: false });

  // rear red reflector
  const reflMat = new THREE.MeshBasicMaterial({ color: '#ff5a4a', toneMapped: false });
  box(0.028, 0.05, 0.018, reflMat, { x: -0.86, y: 0.5, z: 0, parent: g, cast: false, receive: false });

  P.shadow(L.bicycle.x, L.bicycle.z, 0.95, 0.26, L.bicycle.ry);
}
