import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const canvas=document.querySelector('#world');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x152536);
const camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.1,120);
camera.position.set(14,11.5,17.5);
const controls=new OrbitControls(camera,canvas);
controls.target.set(0,1.45,0);controls.enableDamping=true;controls.dampingFactor=.065;
controls.minDistance=9;controls.maxDistance=80;controls.maxPolarAngle=Math.PI*.475;controls.minPolarAngle=.19;
controls.panSpeed=.65;controls.zoomSpeed=.7;controls.rotateSpeed=.65;
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.18,.45,1.05);composer.addPass(bloom);composer.addPass(new OutputPass());
const world=new THREE.Group();scene.add(world);
let seed=29;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
// A four-step lighting ramp keeps the architectural surfaces deliberately cel shaded.
const ramp2=new THREE.DataTexture(new Uint8Array([72,72,72,255,150,150,150,255,215,215,215,255,255,255,255,255]),4,1,THREE.RGBAFormat);
ramp2.minFilter=ramp2.magFilter=THREE.NearestFilter;ramp2.needsUpdate=true;
const mats=new Map();
function mat(c){if(!mats.has(c))mats.set(c,new THREE.MeshToonMaterial({color:c,gradientMap:ramp2}));return mats.get(c);}
const ink=new THREE.LineBasicMaterial({color:0x172634,transparent:true,opacity:.68});
const metal=new THREE.MeshStandardMaterial({color:0x576675,metalness:.55,roughness:.4});
const glass=new THREE.MeshPhysicalMaterial({color:0xa4e7de,transparent:true,opacity:.095,roughness:.12,metalness:.15,depthWrite:false,side:THREE.DoubleSide});
function glow(c,intensity=1){return new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:intensity,roughness:.45});}
const warm=glow(0xffdda0,1.5),mint=glow(0x9af0cd,1.1),white=glow(0xfff3d2,1.25),pink=glow(0xff778e,1.1);
function mesh(geo,m,x,y,z,parent=world,outline=false){let o=new THREE.Mesh(geo,typeof m==='number'||typeof m==='string'?mat(m):m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);if(outline){const e=new THREE.LineSegments(new THREE.EdgesGeometry(geo,30),ink);o.add(e);}return o;}
function box(w,h,d,x,y,z,m,parent=world,outline=true){return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent,outline);}
function cyl(r,h,x,y,z,m,parent=world,r2=r,n=12){return mesh(new THREE.CylinderGeometry(r,r2,h,n),m,x,y,z,parent);}
function sphere(r,x,y,z,m,parent=world){return mesh(new THREE.SphereGeometry(r,12,8),m,x,y,z,parent);}
function tube(points,r,m,parent=world){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,7,false),m,0,0,0,parent);}
function rod(a,b,r,m,parent=world){let av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),o=cyl(r,av.distanceTo(bv),0,0,0,m,parent);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize());return o;}
function tex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
function panel(w,h,x,y,z,texture,parent=world,ry=0,emissive=.0){let m=new THREE.MeshStandardMaterial({map:texture,roughness:.65,side:THREE.DoubleSide,emissive:0xffffff,emissiveMap:texture,emissiveIntensity:emissive});let p=mesh(new THREE.PlaneGeometry(w,h),m,x,y,z,parent);p.rotation.y=ry;return p;}
function label(text,sub,bg='#f3e8c8',fg='#244e50',w=1024,h=256){return tex(w,h,(c,W,H)=>{c.fillStyle=bg;c.fillRect(0,0,W,H);c.textAlign='center';c.fillStyle=fg;c.font=`700 ${H*.48}px "Yu Gothic",sans-serif`;c.fillText(text,W/2,H*.57);if(sub){c.font=`500 ${H*.16}px "Yu Gothic",sans-serif`;c.fillText(sub,W/2,H*.85);}});}
const posterA=tex(384,512,(c,w,h)=>{c.fillStyle='#edb187';c.fillRect(0,0,w,h);c.fillStyle='#fff0c8';c.beginPath();c.arc(190,255,130,0,Math.PI*2);c.fill();c.fillStyle='#8a473a';c.font='bold 58px sans-serif';c.textAlign='center';c.fillText('おいしい',192,75);c.fillText('秋のごほうび',192,460);c.fillStyle='#7a3729';c.fillRect(105,210,170,80);c.fillStyle='#e7b56c';c.fillRect(100,195,180,35);c.fillStyle='#f7dc97';c.font='bold 30px sans-serif';c.fillText('HOT COFFEE',192,340);});
const posterB=label('新発売','おにぎり  ¥128','#d8dfbc','#4e6659',512,384);
const floorTex=tex(512,512,(c,w,h)=>{c.fillStyle='#ddd4b5';c.fillRect(0,0,w,h);c.strokeStyle='#b4b2a0';c.lineWidth=2;for(let i=0;i<=4;i++){c.beginPath();c.moveTo(i*128,0);c.lineTo(i*128,h);c.stroke();c.beginPath();c.moveTo(0,i*128);c.lineTo(w,i*128);c.stroke();}});floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(3,2);
const asphalt=tex(512,512,(c,w,h)=>{c.fillStyle='#344858';c.fillRect(0,0,w,h);for(let i=0;i<25000;i++){let v=rnd()*80+30;c.fillStyle=`rgba(${v},${v+12},${v+24},.15)`;c.fillRect(rnd()*w,rnd()*h,1.5,1.5);}});asphalt.wrapS=asphalt.wrapT=THREE.RepeatWrapping;asphalt.repeat.set(3,3);
scene.add(new THREE.HemisphereLight(0x90b6d4,0x3c3b59,1.25));
const moon=new THREE.DirectionalLight(0xa3c8ff,1.5);moon.position.set(-6,12,3);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:1,far:35});moon.shadow.bias=-.0005;moon.shadow.normalBias=.03;scene.add(moon);
const fill=new THREE.DirectionalLight(0xb1addb,.6);fill.position.set(5,6,-8);scene.add(fill);
function light(c,i,d,x,y,z){let l=new THREE.PointLight(c,i,d,2);l.position.set(x,y,z);scene.add(l);return l;}

// One continuous square plinth; all streets and buildings are contained by it.
box(13,.42,13,0,-.04,0,0x243849);box(12.92,.055,12.92,0,.195,0,0x5b7180);
box(13,.07,13,0,.25,0,new THREE.MeshStandardMaterial({map:asphalt,roughness:.32,metalness:.25}));
for(let z of [-6.51,6.51])box(12.85,.025,.018,0,.06,z,0x6d8b94);
const roadMirror=new Reflector(new THREE.PlaneGeometry(12.98,12.98),{color:0x303e51,textureWidth:1024,textureHeight:1024,clipBias:.005,multisample:0});
roadMirror.rotation.x=-Math.PI/2;roadMirror.position.y=.291;
roadMirror.material.fragmentShader=roadMirror.material.fragmentShader.replace('vec4 base = texture2DProj( tDiffuse, vUv );',`vec4 uv = vUv; uv.x += (sin(vUv.y*420.0)+sin(vUv.y*136.0))*0.0015; vec4 base = texture2DProj(tDiffuse,uv)*0.5; uv.x+=0.006; base+=texture2DProj(tDiffuse,uv)*0.25; uv.x-=0.012; base+=texture2DProj(tDiffuse,uv)*0.25;`).replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );','gl_FragColor = vec4(mix(vec3(0.033,0.057,0.077), blendOverlay(base.rgb,color),0.34),1.0);');world.add(roadMirror);
// Raised tiled pavement wraps around the shop and turns into a narrow alley.
box(9.15,.20,7.45,-1.52,.38,-2.55,0x718385);
for(let ix=0;ix<18;ix++)for(let iz=0;iz<15;iz++){box(.493,.014,.485,-5.77+ix*.5,.49,-6.03+iz*.5,(ix+iz)%3?0x788a8a:0x829492,world,false);}
for(let x=-5.95;x<3.05;x+=.5)box(.47,.18,.16,x,.405,1.25,0xa3aba3);
for(let z=-5.9;z<1.4;z+=.5)box(.16,.18,.47,3.07,.405,z,0xa3aba3);
// Gutter slots and a rainwater drain.
for(let x=-5.9;x<3.25;x+=.18)box(.055,.012,.22,x,.306,1.51,0x132b3b,world,false);
for(let z=-5.9;z<1.4;z+=.18)box(.22,.012,.055,3.32,.306,z,0x172e3e,world,false);
box(.65,.035,.48,2.85,.32,1.65,0x71818a);for(let i=0;i<7;i++)box(.045,.01,.38,2.58+i*.085,.343,1.65,0x203744,world,false);
// Reflective crossing and lane markings.
const roadpaint=new THREE.MeshStandardMaterial({color:0xcbd8c8,roughness:.25,metalness:.15});
for(let i=0;i<7;i++)box(1.68,.012,.29,3.7,.308,2.0+i*.55,roadpaint,world,false);
for(let x=-5.6;x<1.5;x+=1.6)box(.85,.012,.085,x,.308,4.35,0xb4c6bd,world,false);
box(.08,.012,2.15,-4.65,.308,2.72,0xc8ccab,world,false);box(1.65,.012,.08,-5.45,.308,3.77,0xc8ccab,world,false);
box(1.65,.012,.08,-5.45,.308,1.68,0xc8ccab,world,false);
const park=panel(.75,.75,-5.4,.315,2.7,label('P','','#455968','#e0d8b6',256,256));park.rotation.x=-Math.PI/2;
// Shop shell. The two long glazed elevations expose a complete interior.
const shop=new THREE.Group();shop.position.set(-1.55,0,-1.95);world.add(shop);
box(7.0,.16,4.75,0,.57,0,0xb6bba9,shop);
let floor=box(6.8,.025,4.58,0,.665,0,new THREE.MeshStandardMaterial({map:floorTex,roughness:.68}),shop,false);
box(7,3.05,.16,0,2.08,-2.34,0xb5b8a3,shop);
box(.16,3.05,4.7,-3.42,2.08,0,0x95a8a2,shop);
// Brick courses on the opaque side and rear wall.
for(let y=.85;y<3.4;y+=.25)for(let z=-2.1;z<2.3;z+=.5)box(.012,.018,.46,-3.509,y,z,0x657e7e,shop,false);
box(7,.48,.15,0,.87,2.32,0x537b79,shop);
box(.15,.48,4.7,3.43,.87,0,0x537b79,shop);
for(let x of [-3.4,-1.42,.45,3.43])box(.085,2.37,.11,x,2.19,2.35,0xc8d0c0,shop);
box(7,.08,.12,0,1.28,2.36,0xcbd6c4,shop);box(7,.11,.14,0,3.37,2.36,0xcbd6c4,shop);
for(let x of [-2.42,-.48]){box(1.84,2.03,.018,x,2.28,2.35,glass,shop,false);}
// Front automatic doors travel apart within their own local frames.
const doorL=new THREE.Group(),doorR=new THREE.Group();shop.add(doorL,doorR);
function door(g,x){g.position.set(x,0,2.38);box(1.3,2.52,.018,0,1.95,0,glass,g,false);for(let k of [-.65,.65])box(.045,2.55,.045,k,1.95,0,0xd5ddc9,g);for(let y of [.68,3.22])box(1.34,.045,.055,0,y,0,0xd5ddc9,g);box(1.3,.10,.026,0,1.82,.025,0x4caa9c,g,false);box(.025,.34,.05,x<2? .52:-.52,1.73,.05,0xe4e9da,g);}
door(doorL,1.14);door(doorR,2.50);
box(2.8,.085,.25,1.82,3.3,2.36,0x344e58,shop);
panel(.7,.16,1.82,3.27,2.51,label('自動ドア','','#264f51','#eff4df',512,100),shop,0,.35);
for(let z of [-2.25,-.75,.77,2.32])box(.09,2.16,.075,3.45,2.27,z,0xcbd6c4,shop);
for(let z of [-1.5,0,1.5]){const p=box(.018,2.08,1.43,3.44,2.28,z,glass,shop,false);}
box(.12,.09,4.7,3.45,3.36,0,0xcbd6c4,shop);
// Store fascia, familiar striped canopy, and glowing bilingual shop lettering.
box(7.65,.62,5.25,0,3.69,.10,0xd5d9c1,shop);
box(7.78,.09,5.32,0,4.04,.10,0x3b6264,shop);
box(7.7,.13,.08,0,3.83,2.76,0x74c3aa,shop);box(7.7,.07,.085,0,3.49,2.76,0xdd8d62,shop);
box(.08,.13,5.24,3.89,3.83,.1,0x74c3aa,shop);box(.08,.07,5.24,3.89,3.49,.1,0xdd8d62,shop);
const sign=panel(5.1,.48,-.45,3.69,2.813,label('雨待ち  AME MART','あなたの街の、あたたかい灯り。24 HOURS'),shop,0,1.05);
panel(2.85,.44,3.94,3.69,.1,label('AME MART','OPEN 24 HOURS'),shop,Math.PI/2,.9);
panel(.69,.37,3.12,3.69,2.814,label('24','OPEN','#4f8c80','#fff2be',256,160),shop,0,1);
box(7.72,.065,.85,0,3.33,2.55,0x638d89,shop);
box(7.65,.04,.20,0,3.29,2.88,warm,shop,false);
// Roof is a miniature in its own right: seams, parapet, ventilation and compressors.
box(7.23,.07,4.94,0,4.08,.02,0x54767b,shop);
for(let x of [-3.54,3.54])box(.12,.17,4.98,x,4.16,.02,0x82958e,shop);
for(let z of [-2.4,2.45])box(7.2,.17,.12,0,4.16,z,0x82958e,shop);
for(let x=-3;x<3.3;x+=.65)box(.018,.016,4.67,x,4.13,0,0x45696e,shop,false);
for(let x of [-1.9,.2]){box(1.55,.49,1.04,x,4.40,-.65,0xb0bdb2,shop);box(1.3,.04,.82,x,4.67,-.65,0x718681,shop);for(let j=0;j<2;j++){cyl(.28,.035,x-.36+j*.72,4.71,-.65,0x253e48,shop);for(let k=0;k<4;k++){let blade=box(.48,.02,.07,x-.36+j*.72,4.74,-.65,0x8d9c93,shop,false);blade.rotation.y=k*Math.PI/4;}}for(let j=0;j<7;j++)box(1.23,.022,.015,x,4.24+j*.045,-.115,0x627c7b,shop,false);}
cyl(.21,.72,2.20,4.48,-1.36,0x8b9e98,shop);cyl(.36,.10,2.20,4.87,-1.36,0xb5c3b2,shop);
tube([[-2.1,4.23,-1.3],[-2.1,4.23,-1.8],[2.4,4.23,-1.8],[2.4,4.23,-2.25]],.045,0x344e58,shop);
// Ceiling luminaires are thin bars, preserving a clear view inside.
for(let x of [-2.3,.1,2.1])box(.9,.04,.18,x,3.24,0,white,shop,false);
light(0xffdd9b,9,8,-2.9,2.7,-1.8);light(0xffe1a5,8,7,.6,2.6,-1.1);light(0xffd7a5,4,5,-1,2,1.4);
// Cold drink wall, filled with individual bottles, labels and shelf strips.
const palette=[0xc58563,0xabc289,0x779f9f,0xe8bf7a,0xb56c70,0xd4d0a4,0x6e91ad];
function bottle(x,y,z,color,parent=shop){cyl(.042,.18,x,y,z,color,parent,.044,7);cyl(.025,.045,x,y+.11,z,0xe8dfba,parent);box(.061,.056,.062,x,y-.005,z+.018,0xe7e0c9,parent,false);}
for(let bay=0;bay<4;bay++){let x=-2.57+bay*1.03;box(.99,2.25,.53,x,1.84,-1.92,0x3e646b,shop);box(.88,2.08,.018,x,1.87,-1.638,glow(0x91c4bb,.2),shop,false);box(.91,.055,.05,x,2.87,-1.62,white,shop,false);for(let row=0;row<4;row++){let y=1.0+row*.46;box(.9,.035,.42,x,y-.13,-1.84,0xc5d1bf,shop,false);for(let j=0;j<7;j++)bottle(x-.37+j*.122,y,-1.68,palette[(j+row+bay)%7]);}box(.022,.70,.04,x+.35,1.9,-1.57,0xd1d7c5,shop);panel(.8,.16,x,3.0,-1.62,label(bay%2?'冷たい飲みもの':'DRINKS','','#315f65','#e8e7c5',512,100),shop,0,.25);}
box(.81,2.25,.10,2.82,1.86,-2.20,0x7c9690,shop);panel(.48,.15,2.82,2.82,-2.13,label('STAFF','','#435b59','#d9ddc9',256,80),shop);sphere(.035,3.1,1.8,-2.1,0xd0c4a0,shop);
function shelf(x,z,len=1.8){box(len,.10,.65,x,.76,z,0x707c70,shop);box(len,1.61,.05,x,1.58,z-.28,0xb3baa1,shop);for(let row=0;row<4;row++){let y=.88+row*.40;box(len,.055,.68,x,y,z,0xe0d4aa,shop);box(len,.06,.035,x,y+.01,z+.36,0xdda46e,shop,false);for(let i=0;i<9;i++){let px=x-len*.43+i*len*.105;let h=.17+rnd()*.1;box(.135,h,.18,px,y+.04+h/2,z+.16,palette[(i+row)%7],shop,false);box(.09,.075,.008,px,y+.10,z+.256,0xf0e0b7,shop,false);if(i%2===0)box(.13,h*.9,.17,px,y+.04+h*.45,z-.09,palette[(i+row+3)%7],shop,false);}for(let j=0;j<5;j++)box(.14,.028,.008,x-len*.38+j*.33,y+.015,z+.382,0xf6edcf,shop,false);}}
shelf(-1.8,-.15,1.85);shelf(.65,-.15,1.85);
panel(1.30,.22,-1.8,2.51,-.12,label('お菓子・スナック','','#f1d6a0','#75604a',512,128),shop,0,.2);
panel(1.30,.22,.65,2.51,-.12,label('毎日のおいしさ','','#a7c5ad','#3e665d',512,128),shop,0,.2);
// Low bento / onigiri island, visibly stocked through the front window.
box(1.65,.77,.64,-2.45,1.07,1.30,0xb9b9a0,shop);box(1.68,.08,.69,-2.45,1.49,1.30,0xe6dcc2,shop);
for(let row=0;row<2;row++)for(let j=0;j<6;j++){let x=-3.1+j*.26,z=1.12+row*.29;box(.21,.055,.23,x,1.57,z,0x344b4b,shop,false);box(.17,.018,.17,x,1.61,z,0xeee0b3,shop,false);sphere(.045,x+.035,1.64,z,0xd89870,shop);}
panel(1.5,.22,-2.45,1.37,1.635,label('お弁当 ・ おにぎり','','#f6d6aa','#795342',768,120),shop,0,.15);
// Checkout, coffee machine, heated food case, oden and freezer.
box(1.78,.90,.69,.26,1.12,1.55,0x9cbaa7,shop);box(1.9,.10,.81,.26,1.62,1.55,0xe6d7ae,shop);
panel(1.5,.31,.26,1.13,1.904,label('いらっしゃいませ','WELCOME TO AME MART','#769f8c','#f3e6b9',768,192),shop,0,.1);
box(.37,.30,.16,.02,1.89,1.52,0x2f4952,shop);panel(.30,.18,.02,1.91,1.61,label('¥  128','','#7fbcaa','#e2f2d8',256,128),shop,0,.3);box(.4,.06,.27,.02,1.71,1.73,0x4f6867,shop);
box(.37,.62,.35,-.42,1.97,1.45,0x3c5156,shop);box(.31,.10,.39,-.42,1.72,1.48,0x95aaa0,shop);panel(.22,.17,-.42,2.06,1.632,label('COFFEE','','#dbc9a4','#4e6662',256,128),shop);cyl(.045,.095,-.42,1.82,1.63,0xeee3c4,shop);
box(.5,.10,.46,.78,1.72,1.47,0x86998c,shop);for(let j=0;j<4;j++){sphere(.055,.65+(j%2)*.2,1.80,1.34+Math.floor(j/2)*.19,0xe9c585,shop);}box(.53,.28,.015,.78,1.91,1.73,glass,shop,false);
box(.73,.65,.55,2.58,1.02,1.42,0xbecdb6,shop);box(.69,.04,.51,2.58,1.37,1.42,glass,shop,false);panel(.53,.20,2.58,1.08,1.705,label('ICE CREAM','','#e8b6a2','#84595b',512,140),shop);
// Magazine rack and wall promotions.
for(let row=0;row<3;row++){box(.86,.05,.24,2.82,1.05+row*.27,.23,0x8d9c8d,shop);for(let j=0;j<4;j++){const p=box(.17,.25,.025,2.50+j*.20,1.2+row*.27,.26,palette[(j+row*2)%7],shop,false);p.rotation.x=-.20;box(.11,.035,.008,2.50+j*.20,1.27+row*.27,.29,0xe9dec5,shop,false);}}
panel(.60,.82,-2.85,2.49,2.37,posterA,shop,0,.20);panel(.58,.59,-.93,2.67,2.375,posterB,shop,0,.15);
panel(.63,.74,3.465,2.18,.1,posterA,shop,Math.PI/2,.12);
box(1.8,.018,.69,.5,.696,.64,0xb7bca2,shop,false);panel(.38,.28,.5,.711,.64,label('→','','#b7bca2','#6e8f7f',256,160),shop).rotation.x=-Math.PI/2;
// The doormat and tactile paving lead to the door.
box(2.07,.028,.75,.27,.518,1.04,0x355756);for(let x=-.61;x<1.3;x+=.095)box(.025,.012,.66,x,.54,1.04,0x638781,world,false);
for(let z=1.55;z<5.9;z+=.36){box(.38,.015,.32,1.93,.311,z,0xd2bd70,world,false);for(let j=0;j<3;j++)box(.035,.012,.27,1.82+j*.11,.325,z,0xbba560,world,false);}

// Vending machine with every illuminated selection modeled individually.
const vending=new THREE.Group();vending.position.set(-5.57,.5,.15);world.add(vending);
box(.96,1.95,.73,0,1.0,0,0xbd6d66,vending);box(.80,1.33,.025,0,1.23,.379,0xd3d9b9,vending);
box(.72,1.20,.018,-.02,1.25,.4,glow(0xbde2d0,.35),vending,false);
for(let row=0;row<3;row++){for(let j=0;j<5;j++){bottle(-.28+j*.14,.87+row*.34,.46,palette[(j+row)%7],vending);sphere(.019,-.28+j*.14,.73+row*.34,.45,mint,vending);}box(.74,.025,.17,-.01,.71+row*.34,.43,0xe3dfbd,vending,false);}
box(.57,.20,.035,-.09,.36,.386,0x2c4b54,vending);box(.13,.27,.03,.32,.44,.4,0x293f48,vending);sphere(.035,.32,.57,.43,white,vending);
panel(.81,.18,0,1.82,.40,label('あたたかい / つめたい','','#e9d8ac','#756056',768,130),vending,0,.6);
light(0x8de2d2,8,3.5,-5.5,1.55,1.1);
// Umbrella stand, translucent folded umbrellas and recycling bins.
box(.47,.10,.45,1.72,.57,.83,0x879f9b);for(let x of [1.51,1.93])for(let z of [.64,1.02])rod([x,.57,z],[x,1.12,z],.016,0xa3b9af);
for(let y of [.68,1.04]){box(.46,.025,.43,1.72,y,.83,0x577b7b,world,false);}
for(let i=0;i<4;i++){let x=1.57+i*.1,z=.75+(i%2)*.13;rod([x,.67,z],[x,1.45,z],.012,0xd1daca);let o=mesh(new THREE.ConeGeometry(.065,.59,7),i%2?0x9ebdbb:0xc6a1ad,x,1.03,z);o.rotation.z=.08;tube([[x,1.43,z],[x+.04,1.50,z],[x+.10,1.46,z],[x+.10,1.40,z]],.014,0x698a8e);}
for(let i=0;i<2;i++){let x=2.38+i*.49;box(.42,.82,.42,x,.91,.72,0x9caf9f);box(.45,.13,.46,x,1.37,.72,i?0x8da79e:0x6c969a);box(.25,.09,.02,x,1.28,.96,0x2c4b55);panel(.28,.2,x,.98,.94,label(i?'かん':'PET','','#ced7bc','#56716b',256,180));}
// Side alley: condenser, crates, wall bulletin board, drainpipe and service door.
box(.49,1.05,1.08,2.22,1.02,-3.55,0xa2b2ab);const fan=mesh(new THREE.TorusGeometry(.32,.027,8,28),0x506e70,2.485,1.03,-3.55);fan.rotation.y=Math.PI/2;
for(let j=0;j<8;j++)rod([2.49,.74+j*.08,-3.89],[2.49,.74+j*.08,-3.21],.012,0x698384);
tube([[2.24,1.5,-3.8],[2.45,1.8,-3.8],[2.45,2.5,-3.8],[1.97,2.5,-3.8]],.035,0xb7c2ad);
for(let z of [-4.7,-5.35]){box(.64,.44,.49,2.23,.74,z,0x567b71);for(let j=0;j<4;j++)box(.42,.035,.015,2.23,.62+j*.08,z+.25,0x365e5b,world,false);}
box(.08,1.15,1.02,2.09,2.13,-2.03,0x5a756d);panel(.85,1,2.145,2.13,-2.03,posterB,world,Math.PI/2);
rod([-5.01,.6,-4.1],[-5.01,3.3,-4.1],.047,0x6b8987);
// Narrow back wall, warm alley lantern and the suggestion of the next house.
box(1.63,3.3,4.0,5.55,1.94,-4.26,0x586c80);box(1.85,.18,4.20,5.55,3.68,-4.26,0x364e65);
for(let z of [-5.2,-3.6]){box(.035,1.0,.82,4.716,2.35,z,0x203b52);box(.025,.76,.65,4.69,2.35,z,glow(0xf2c788,.55),world,false);box(.035,.06,.8,4.66,2.35,z,0x52687a);box(.035,.95,.04,4.65,2.35,z,0x52687a);}
box(.038,1.79,1.0,4.70,1.41,-2.80,0x314b5b);cyl(.14,.37,4.46,2.6,-2.8,warm);light(0xffbd80,4,3,4.20,2.4,-2.7);
// Low concrete boundary at the back, with tufts of wet greenery.
box(3.55,.7,.18,2.77,.73,-6.13,0x668080);for(let x=1.2;x<4.4;x+=.27)box(.018,.53,.01,x,.75,-6.028,0x405f6b,world,false);
function plant(x,z){cyl(.18,.25,x,.62,z,0x9e8171,world,.14);for(let j=0;j<7;j++){let a=j*.9;rod([x,.71,z],[x+Math.cos(a)*.21,.97+rnd()*.18,z+Math.sin(a)*.2],.025,0x568e82);}}
plant(-5.68,-5.58);plant(4.1,-5.7);plant(4.17,-1.7);
// Bicycle: spoked wheels, double triangle frame, basket, chainring and kickstand.
const bike=new THREE.Group();bike.position.set(-3.38,.55,.63);bike.rotation.y=-.15;world.add(bike);
for(let x of [-.62,.62]){let t=mesh(new THREE.TorusGeometry(.36,.037,8,32),0x273e47,x,.39,0,bike);let rim=mesh(new THREE.TorusGeometry(.315,.012,6,28),0xc2cbb5,x,.39,0,bike);for(let k=0;k<12;k++){let a=k*Math.PI/6;rod([x,.39,0],[x+Math.cos(a)*.3,.39+Math.sin(a)*.3,0],.006,0x9eb8b4,bike);}sphere(.045,x,.39,0,0xb8c9b4,bike);}
const frame=0xb3c6a1;for(let [a,b] of [[[-.62,.39,0],[-.24,.93,0]],[[-.24,.93,0],[.08,.39,0]],[[.08,.39,0],[-.62,.39,0]],[[-.24,.93,0],[.44,.92,0]],[[.44,.92,0],[.08,.39,0]],[[.44,.92,0],[.62,.39,0]]])rod(a,b,.024,frame,bike);
rod([-.24,.86,0],[-.25,1.07,0],.02,0xc4d0be,bike);box(.30,.065,.17,-.27,1.08,0,0x314751,bike);rod([.43,.9,0],[.40,1.18,0],.022,0x9fb8b0,bike);rod([.40,1.18,-.21],[.40,1.18,.21],.019,0xc1cbbb,bike);
box(.32,.25,.32,.60,1.0,0,0x536f72,bike);for(let j=0;j<5;j++)box(.012,.22,.33,.46+j*.07,1.01,0,0x9daf9f,bike,false);
rod([.08,.39,0],[.08,.39,.17],.015,0x9fac9f,bike);box(.17,.025,.10,.08,.39,.2,0x3b5054,bike);rod([-.1,.4,0],[-.19,0,.2],.013,0x839b94,bike);
// Guardrails frame the corner without closing it off.
function rail(x,z,len,rot=0){let g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;world.add(g);for(let k of [-len/2,len/2]){cyl(.045,.78,k,.70,0,0xb6c8ba,g);cyl(.09,.08,k,.33,0,0x657f80,g);}for(let y of [.72,1.0])rod([-len/2,y,0],[len/2,y,0],.035,0xb6c8ba,g);}
rail(-.67,1.75,1.5);rail(-3.53,1.75,1.25);rail(3.7,-.5,1.45,Math.PI/2);
// Utility pole, transformers, crossarms and gently sagging overhead wires.
const poleX=-5.55,poleZ=3.35;
cyl(.10,6.35,poleX,3.49,poleZ,0x778d8a,world,.14);cyl(.19,.42,poleX,.53,poleZ,0x647b7c);
for(let y of [1.20,1.40]){let o=cyl(.144,.13,poleX,y,poleZ,0xddae69);}
box(1.88,.10,.14,poleX,6.15,poleZ,0x5e777c);box(1.55,.09,.14,poleX,5.72,poleZ,0x5e777c);
for(let x of [poleX-.73,poleX,poleX+.73]){cyl(.07,.22,x,6.30,poleZ,0xb1c4b5);cyl(.10,.035,x,6.33,poleZ,0xd1d3bb);cyl(.10,.035,x,6.25,poleZ,0xd1d3bb);}
cyl(.25,.77,poleX+.37,5.18,poleZ,0xb4bfb1);box(.37,.40,.19,poleX,2.72,poleZ+.13,0x49616b);
panel(.28,.71,poleX,3.50,poleZ+.13,label('雨町','二丁目','#d9ddc6','#3b5e63',256,512));
for(let k=0;k<3;k++)tube([[poleX-.73+k*.73,6.43,poleZ],[-1.7+k*.30,5.78,3.7],[2.7+k*.27,5.87,1.0],[5.89,6.25,-4.8+k*.5]],.014,0x1b303f);
cyl(.08,5.9,5.86,3.2,-5.3,0x697f82);box(1.48,.10,.14,5.86,6.13,-5.3,0x698083);
// Curved street lamp casts a warm pool on the wet asphalt.
cyl(.065,4.55,4.87,2.59,1.05,0x4b6774);tube([[4.87,4.83,1.05],[4.87,5.03,1.05],[4.65,5.15,1.05],[4.15,5.15,1.05],[3.92,5.02,1.05]],.057,0x587481);
box(.61,.15,.35,3.94,4.99,1.05,0x7e9694);box(.48,.035,.26,3.94,4.90,1.05,warm,world,false);light(0xffd599,30,7,3.94,4.59,1.05);
// Road signs and a tiny traffic signal at the alley's far end.
cyl(.033,2.72,3.76,1.69,-1.52,0x97aaa4);const stop=mesh(new THREE.CylinderGeometry(.35,.35,.045,3),0xbd7573,3.76,2.94,-1.52);stop.rotation.x=Math.PI/2;stop.rotation.z=Math.PI;
panel(.45,.15,3.76,2.95,-1.485,label('止まれ','','#bd7573','#ffe8c5',256,96));
box(.86,.28,.06,3.76,2.42,-1.52,0x5d8fa0);panel(.75,.18,3.76,2.42,-1.48,label('雨町通り →','','#5d8fa0','#dce6cd',512,128));
cyl(.035,3.92,4.05,2.25,-5.7,0x6d8b8b);box(.66,.25,.26,3.84,4.18,-5.7,0x273f4d);
const traffic=[];for(let i=0;i<3;i++)traffic.push(sphere(.073,3.61+i*.23,4.18,-5.55,glow([0x8fc3a0,0xd1ac68,0xd16c76][i],.12)));

// Irregular water patches, a manhole and fine ripples break up the road reflection.
const puddleMat=new THREE.MeshBasicMaterial({color:0x6e9aa7,transparent:true,opacity:.034,depthWrite:false});
for(let i=0;i<26;i++){let x=-6+rnd()*12,z=1.9+rnd()*4.25;if(i>17){x=3.65+rnd()*2.5;z=-5+rnd()*6;}let p=mesh(new THREE.CircleGeometry(.22+rnd()*.55,28),puddleMat,x,.316+rnd()*.002,z);p.rotation.x=-Math.PI/2;p.scale.y=.3+rnd()*.4;}
const manhole=cyl(.38,.018,-1.7,.316,3.26,0x526b75);for(let j=0;j<6;j++)box(.5,.008,.02,-1.7,.33,3.04+j*.085,0x293f50,world,false);
// Soft light halos are world-space surfaces, with no interface overlay.
const halo=tex(128,128,(c,w,h)=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,224,163,.5)');g.addColorStop(.35,'rgba(255,210,140,.14)');g.addColorStop(1,'rgba(255,200,120,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
function groundGlow(x,z,w,d,col){let m=new THREE.MeshBasicMaterial({map:halo,color:col,transparent:true,opacity:.44,depthWrite:false,blending:THREE.AdditiveBlending});let p=mesh(new THREE.PlaneGeometry(w,d),m,x,.338,z);p.rotation.x=-Math.PI/2;}
groundGlow(-1.2,2.4,7.0,4.4,0xffdb9e);groundGlow(3.94,1.5,3.3,3.3,0xf2d09c);groundGlow(-5.5,1.9,1.8,2.5,0x90ddcf);
// Rain is restricted to the collectible's square footprint.
const rainCount=1300,rainData=new Float32Array(rainCount*6),rainSpeeds=[];
for(let i=0;i<rainCount;i++){let x=rnd()*12.7-6.35,y=.6+rnd()*8,z=rnd()*12.7-6.35;rainData.set([x,y,z,x-.037,y+.22+rnd()*.12,z-.012],i*6);rainSpeeds.push(6+rnd()*4);}
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainData,3));
const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xb4d5df,transparent:true,opacity:.16,depthWrite:false}));rain.frustumCulled=false;world.add(rain);
const rippleGeo=new THREE.RingGeometry(.92,1,32);const ripples=[];
for(let i=0;i<62;i++){let x,z;if(i<43){x=-6.1+rnd()*12.2;z=1.7+rnd()*4.5;}else{x=3.5+rnd()*2.7;z=-5.6+rnd()*6.6;}let p=mesh(rippleGeo,new THREE.MeshBasicMaterial({color:0xbad4ce,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide}),x,.349,z);p.rotation.x=-Math.PI/2;p.userData.phase=rnd()*2; ripples.push(p);}
// Water trickles down the front glazing and falls from the lip of the canopy.
const streaks=[];for(let i=0;i<31;i++){let x=-4.7+rnd()*6.7;let p=box(.009,.07+rnd()*.16,.007,x,1.6+rnd()*1.6,.419,new THREE.MeshBasicMaterial({color:0xc1e8dd,transparent:true,opacity:.26}),world,false);p.userData.origin=p.position.y;streaks.push(p);}
const drips=[];for(let i=0;i<18;i++){let x=-5.25+rnd()*7.35;let p=box(.012,.10,.012,x,2+rnd()*1.3,1.025,new THREE.MeshBasicMaterial({color:0xc5e9dc,transparent:true,opacity:.4}),world,false);p.userData.phase=rnd();drips.push(p);}
// A thin puddle on the roof catches the blue rim light.
let rp=mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({color:0x8fc7cb,transparent:true,opacity:.12,depthWrite:false}),-1.3,4.145,-.6,shop);rp.rotation.x=-Math.PI/2;rp.scale.set(1.15,.42,1);

// Batch the static miniature by material. Moving doors and rain remain independent.
world.updateMatrixWorld(true);
const moving=new Set([doorL,doorR,sign,roadMirror,...traffic,...streaks,...drips,...ripples]);
const batches=new Map(),edgeGeos=[];let modeledParts=0;
function dynamic(o){for(let p=o;p&&p!==world;p=p.parent)if(moving.has(p))return true;return false;}
const staticMeshes=[],staticEdges=[];
world.traverse(o=>{if(o.isMesh)modeledParts++;if(dynamic(o))return;if(o.isLineSegments&&o.material===ink){edgeGeos.push(o.geometry.clone().applyMatrix4(o.matrixWorld));staticEdges.push(o);}if(o.isMesh&&!o.material.transparent&&!Array.isArray(o.material)){let key=o.material.uuid;let b=batches.get(key);if(!b){b={material:o.material,geos:[]};batches.set(key,b);}b.geos.push(o.geometry.clone().applyMatrix4(o.matrixWorld));staticMeshes.push(o);}});
for(const o of staticEdges)o.removeFromParent();
for(const o of staticMeshes)o.removeFromParent();
for(const b of batches.values()){const g=mergeGeometries(b.geos,false);if(g){const o=new THREE.Mesh(g,b.material);o.castShadow=true;o.receiveShadow=true;world.add(o);}b.geos.forEach(g=>g.dispose());}
if(edgeGeos.length){world.add(new THREE.LineSegments(mergeGeometries(edgeGeos,false),ink));edgeGeos.forEach(g=>g.dispose());}

function resize(){renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
addEventListener('resize',resize);
// Portrait screens keep the entire square and the tall utility pole in view.
function initialFit(){const a=innerWidth/innerHeight;camera.position.set(14,11.5,17.5).sub(controls.target).multiplyScalar(Math.max(1.13,1.45/a)).add(controls.target);controls.update();}
initialFit();
canvas.addEventListener('keydown',e=>{if(e.key==='Home'){camera.position.set(14,11.5,17.5);controls.target.set(0,1.45,0);initialFit();}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key)){e.preventDefault();let v=camera.position.clone().sub(controls.target);if(e.key==='ArrowLeft'||e.key==='ArrowRight')v.applyAxisAngle(new THREE.Vector3(0,1,0),e.key==='ArrowLeft'?.09:-.09);if(e.key==='+'||e.key==='=')v.multiplyScalar(.94);if(e.key==='-')v.multiplyScalar(1.06);if(e.key==='ArrowUp')v.y+=.5;if(e.key==='ArrowDown')v.y-=.5;camera.position.copy(controls.target).add(v);controls.update();}});
const clock=new THREE.Clock();let elapsed=0,frames=0;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);elapsed=clock.elapsedTime;frames++;
  if(frames===20&&clock.elapsedTime/frames>.05){renderer.setPixelRatio(.85);roadMirror.getRenderTarget().setSize(512,512);bloom.enabled=false;resize();}
  for(let i=0;i<rainCount;i++){const j=i*6,dy=dt*rainSpeeds[i];rainData[j+1]-=dy;rainData[j+4]-=dy;rainData[j]-=dt*.27;rainData[j+3]-=dt*.27;let x=rainData[j],z=rainData[j+2];let ground=.34;if(x>-5.45&&x<2.35&&z>-4.50&&z<.95)ground=4.23;if(x>4.62&&z<-2.22)ground=3.82;if(rainData[j+1]<ground){rainData[j+1]=7.8+rnd()*.8;rainData[j+4]=rainData[j+1]+.25;rainData[j]=rnd()*12.6-6.3;rainData[j+3]=rainData[j]-.037;}}
  rainGeo.attributes.position.needsUpdate=true;
  ripples.forEach((p,i)=>{let f=((elapsed+p.userData.phase)%1.8)/1.8;p.scale.setScalar(.025+f*(.20+(i%4)*.07));p.material.opacity=(1-f)*.23;});
  drips.forEach(p=>{p.position.y=3.26-((elapsed*1.1+p.userData.phase)%1)*2.73;});
  streaks.forEach((p,i)=>{p.position.y=1.36+((p.userData.origin-elapsed*(.06+(i%4)*.025))%1.75+1.75)%1.75;});
  let f=elapsed%15,open=f>10&&f<14?Math.sin(Math.min((f-10)*2,Math.PI/2))*Math.min(1,(14-f)*2):0;
  doorL.position.x=1.14-open*.55;doorR.position.x=2.50+open*.55;
  sign.material.emissiveIntensity=.9+.035*Math.sin(elapsed*2.3)+(Math.sin(elapsed*7.3)>.997?-.22:0);
  traffic.forEach((p,i)=>{p.material.emissiveIntensity=(Math.floor(elapsed/8)%3===i)?1.8:.08;});
  controls.update();composer.render();
}
animate();
// Read-only inspection surface used to validate the live scene.
window.__scene={scene,camera,controls,renderer,shop,doorL,doorR,rain,ripples,modeledParts,get elapsed(){return elapsed;},get frames(){return frames;},get objects(){let n=0;world.traverse(o=>{if(o.isMesh)n++;});return n;}};
