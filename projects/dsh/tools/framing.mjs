const cases = [
  {p:[13.0,10.9,17.2], t:[-0.4,0.7,-0.4], fov:30},
  {p:[15.5,13.0,20.5], t:[-0.4,0.7,-0.4], fov:30},
  {p:[14.5,12.2,19.5], t:[-0.4,0.7,-0.4], fov:32},
  {p:[16.0,13.5,21.5], t:[-0.4,0.7,-0.4], fov:30},
  {p:[15.0,13.5,20.0], t:[-0.4,1.0,-0.4], fov:30},
  {p:[14.0,14.0,19.0], t:[-0.2,0.8,-0.2], fov:32},
];
function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function norm(a){const l=Math.hypot(...a);return a.map(x=>x/l);}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
const aspect=1.6;
for (const c of cases) {
  const fwd = norm(sub(c.t,c.p));
  const right = norm(cross(fwd,[0,1,0]));
  const up = cross(right,fwd);
  const tanV = Math.tan(c.fov*Math.PI/360);
  let worst=0, out=[];
  for (const x of [-6,6]) for (const z of [-6,6]) for (const y of [0,4]) {
    const v = sub([x,y,z],c.p);
    const zc = dot(v,fwd);
    const nx = dot(v,right)/(zc*tanV*aspect);
    const ny = dot(v,up)/(zc*tanV);
    worst=Math.max(worst,Math.abs(nx),Math.abs(ny));
    out.push([x,y,z,nx.toFixed(2),ny.toFixed(2)]);
  }
  console.log(JSON.stringify(c), 'worst', worst.toFixed(2));
  console.log(out.map(o=>o.join(",")).join(" | "));
}
