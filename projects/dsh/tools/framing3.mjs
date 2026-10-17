const cases=[
 {p:[12.0,9.6,16.2],t:[-.9,1.2,-.8],fov:30,name:'C'},
 {p:[13.0,10.6,17.5],t:[-.7,1.0,-.5],fov:30,name:'E'},
 {p:[13.4,10.8,18.0],t:[-.6,1.0,-.5],fov:30,name:'E2'},
 {p:[12.8,10.2,17.2],t:[-.8,1.1,-.6],fov:31,name:'C2'},
];
function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]}function norm(a){const l=Math.hypot(...a);return a.map(x=>x/l)}function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
for(const c of cases){const f=norm(sub(c.t,c.p)),r=norm(cross(f,[0,1,0])),u=cross(r,f),tv=Math.tan(c.fov*Math.PI/360),asp=1.6;let worst=0,mnx=9,mxx=-9,mny=9,mxy=-9;for(const x of[-6,6])for(const z of[-6,6])for(const y of[0,4,6]){const v=sub([x,y,z],c.p),zc=dot(v,f),nx=dot(v,r)/(zc*tv*asp),ny=dot(v,u)/(zc*tv);worst=Math.max(worst,Math.abs(nx),Math.abs(ny));mnx=Math.min(mnx,nx);mxx=Math.max(mxx,nx);mny=Math.min(mny,ny);mxy=Math.max(mxy,ny)}console.log(c.name,worst.toFixed(2),mnx.toFixed(2),mxx.toFixed(2),mny.toFixed(2),mxy.toFixed(2))}
