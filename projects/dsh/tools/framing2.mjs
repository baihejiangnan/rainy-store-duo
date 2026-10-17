const cases = [
 {p:[14.8,12.4,19.8], t:[-0.4,0.75,-0.4], fov:30, aspect:1.6, name:'current'},
 {p:[16.4,13.7,22.0], t:[-0.4,0.7,-0.4], fov:30, aspect:1.6, name:'far'},
 {p:[16.0,13.5,21.0], t:[0,0.5,0], fov:30, aspect:1.6, name:'center'},
 {p:[15.8,13.2,21.2], t:[0,0.4,0], fov:31, aspect:1.6, name:'center31'},
 {p:[16.8,14.2,22.8], t:[0,0.5,0], fov:30, aspect:1.6, name:'far2'},
 {p:[15.5,13.0,20.5], t:[0,0.3,0], fov:32, aspect:1.6, name:'wide32'},
];
function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function norm(a){const l=Math.hypot(...a);return a.map(x=>x/l);}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
for(const c of cases){
 const fwd=norm(sub(c.t,c.p)), right=norm(cross(fwd,[0,1,0])), up=cross(right,fwd);
 const tanV=Math.tan(c.fov*Math.PI/360); let worst=0, xs=[], ys=[];
 for(const x of [-6,6]) for(const z of [-6,6]) for(const y of [0,4.0,6.0]){
  const v=sub([x,y,z],c.p), zc=dot(v,fwd), nx=dot(v,right)/(zc*tanV*c.aspect), ny=dot(v,up)/(zc*tanV);
  worst=Math.max(worst,Math.abs(nx),Math.abs(ny)); xs.push(nx); ys.push(ny);
 }
 console.log(c.name, 'worst', worst.toFixed(2), 'xs', Math.min(...xs).toFixed(2), Math.max(...xs).toFixed(2), 'ys', Math.min(...ys).toFixed(2), Math.max(...ys).toFixed(2));
}
