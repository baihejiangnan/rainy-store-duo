import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export function applyTransform(mesh, o = {}) {
  if (o.x !== undefined || o.y !== undefined || o.z !== undefined) mesh.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
  if (o.ry) mesh.rotation.y = o.ry;
  if (o.rx) mesh.rotation.x = o.rx;
  if (o.rz) mesh.rotation.z = o.rz;
  if (o.s) mesh.scale.setScalar(o.s);
  if (o.sx !== undefined || o.sy !== undefined || o.sz !== undefined) mesh.scale.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
  mesh.castShadow = o.cast ?? true;
  mesh.receiveShadow = o.receive ?? true;
  if (o.name) mesh.name = o.name;
  return mesh;
}

export function add(parent, obj) {
  parent.add(obj);
  return obj;
}

export function box(w, h, d, mat, o = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  applyTransform(m, o);
  if (o.edge) {
    const e = new THREE.LineSegments(
      new THREE.EdgesGeometry(m.geometry, o.edgeThreshold ?? 18),
      new THREE.LineBasicMaterial({ color: o.edgeColor ?? 0x171522, transparent: true, opacity: o.edgeOpacity ?? 0.55, fog: true })
    );
    e.renderOrder = 2;
    m.add(e);
  }
  if (o.outline && _outlineFn) _outlineFn(m, o.outlineThickness ?? 0.018, o.outlineColor);
  if (o.parent) o.parent.add(m);
  return m;
}

let _outlineFn = null;
export function setOutlineFn(fn) {
  _outlineFn = fn;
}

export function rounded(w, h, d, r, mat, o = {}) {
  const geo = new RoundedBoxGeometry(w, h, d, o.seg ?? 2, Math.min(r, Math.min(w, h, d) / 2 - 0.0001));
  const m = new THREE.Mesh(geo, mat);
  applyTransform(m, o);
  if (o.parent) o.parent.add(m);
  return m;
}

export function cyl(rTop, rBot, h, seg, mat, o = {}) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, seg, o.hSeg ?? 1, o.open ?? false);
  const m = new THREE.Mesh(geo, mat);
  applyTransform(m, o);
  if (o.parent) o.parent.add(m);
  return m;
}

export function sphere(r, mat, o = {}) {
  const geo = new THREE.SphereGeometry(r, o.wSeg ?? 16, o.hSeg ?? 12, 0, Math.PI * 2, 0, o.theta ?? Math.PI);
  const m = new THREE.Mesh(geo, mat);
  applyTransform(m, o);
  if (o.parent) o.parent.add(m);
  return m;
}

export function plane(w, h, mat, o = {}) {
  const geo = new THREE.PlaneGeometry(w, h, o.segW ?? 1, o.segH ?? 1);
  const m = new THREE.Mesh(geo, mat);
  applyTransform(m, o);
  if (o.ground) {
    m.rotation.x = -Math.PI / 2;
    if (o.ry) m.rotation.z = o.ry;
  }
  if (o.parent) o.parent.add(m);
  return m;
}

export function circle(r, seg, mat, o = {}) {
  const geo = new THREE.CircleGeometry(r, seg);
  const m = new THREE.Mesh(geo, mat);
  applyTransform(m, o);
  if (o.ground) m.rotation.x = -Math.PI / 2;
  if (o.parent) o.parent.add(m);
  return m;
}

export function textPlane(texture, w, h, o = {}) {
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: o.side ?? THREE.DoubleSide,
    toneMapped: false,
    depthWrite: o.depthWrite ?? false,
    opacity: o.opacity ?? 1,
    blending: o.blending ?? THREE.NormalBlending,
    fog: o.fog ?? true,
    alphaTest: o.alphaTest ?? 0,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  applyTransform(m, { ...o, cast: false, receive: false });
  if (o.parent) o.parent.add(m);
  return m;
}

export function group(name, parent) {
  const g = new THREE.Group();
  g.name = name;
  if (parent) parent.add(g);
  return g;
}

export function cylinderBetween(a, b, radius, mat, o = {}) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, o.seg ?? 8, 1);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.receive ?? true;
  if (o.parent) o.parent.add(m);
  return m;
}

export function tube(points, radius, mat, o = {}) {
  const curve = new THREE.CatmullRomCurve3(points, o.closed ?? false, o.curveType ?? 'catmullrom', o.tension ?? 0.5);
  const geo = new THREE.TubeGeometry(curve, o.tubularSegments ?? 48, radius, o.radialSegments ?? 5, o.closed ?? false);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.receive ?? false;
  if (o.parent) o.parent.add(m);
  return m;
}

export function sagWire(a, b, sag, radius, mat, o = {}) {
  const pts = [];
  const n = o.segments ?? 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    pts.push(p);
  }
  return tube(pts, radius, mat, { ...o, tubularSegments: n * 3, radialSegments: 4 });
}

export function line(points, mat, o = {}) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const l = new THREE.Line(geo, mat);
  if (o.parent) o.parent.add(l);
  return l;
}

export function setShadows(root, cast = true, receive = true) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
}

export function instanced(geo, mat, transforms, o = {}) {
  const im = new THREE.InstancedMesh(geo, mat, transforms.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  transforms.forEach((t, i) => {
    e.set(t.rx ?? 0, t.ry ?? 0, t.rz ?? 0);
    q.setFromEuler(e);
    s.set(t.sx ?? t.s ?? 1, t.sy ?? t.s ?? 1, t.sz ?? t.s ?? 1);
    m.compose(new THREE.Vector3(t.x ?? 0, t.y ?? 0, t.z ?? 0), q, s);
    im.setMatrixAt(i, m);
  });
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = o.cast ?? true;
  im.receiveShadow = o.receive ?? true;
  if (o.parent) o.parent.add(im);
  return im;
}

export function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose?.();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m.dispose?.());
    }
  });
}
