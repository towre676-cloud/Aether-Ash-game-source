import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {LivingWorld,N,HALF,iAt,riverX} from './world.mjs';
import {createReconciledRuntime} from './reconciled-runtime.mjs';
import {installTexturedTerrain} from './render-ground.mjs';
import {createLivingLandscape} from '../lib/grass/living-landscape.mjs';

const root=document.getElementById('viewport');
const hud=document.getElementById('hud');
const note=document.getElementById('notice');
let world;
try{const saved=localStorage.getItem('aa-living-world-v1');world=saved?LivingWorld.restore(JSON.parse(saved)):new LivingWorld(71);}catch{world=new LivingWorld(71);}
let selected={x:-16,z:-10}, mode='scenery',summaryCache=null;
const storageKey={ground:'aa-living-world-ground-v1',vegetation:'aa-living-world-grass-v2'};
function readSaved(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
let runtime=createReconciledRuntime(world,{groundSave:readSaved(storageKey.ground)});
let landscape=null;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xadd2d6);scene.fog=new THREE.FogExp2(0xa9cacc,.006);
const camera=new THREE.OrthographicCamera(-47,47,35,-35,.1,350);
camera.position.set(58,65,72);camera.lookAt(0,0,0);
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(e){root.innerHTML='<p class="error">WebGL2 is unavailable on this device. The numerical world remains testable separately.</p>';throw e;}
const maxRatio=window.matchMedia('(pointer:coarse)').matches?1.4:1.8;
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,maxRatio));renderer.setSize(root.clientWidth,root.clientHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
root.appendChild(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.08;orbit.maxPolarAngle=Math.PI*.48;orbit.minPolarAngle=.22;orbit.minZoom=.65;orbit.maxZoom=3.4;orbit.target.set(0,0,0);orbit.update();
const ambient=new THREE.HemisphereLight(0xcce6ff,0x40513b,2.0);scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffe2b0,3.25);sun.position.set(-30,70,28);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-60;sun.shadow.camera.right=60;sun.shadow.camera.top=60;sun.shadow.camera.bottom=-60;sun.shadow.bias=-.0005;scene.add(sun);
const fill=new THREE.DirectionalLight(0x94cbea,.85);fill.position.set(45,23,-10);scene.add(fill);
const worldGroup=new THREE.Group();scene.add(worldGroup);
const matte=(color,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness,metalness:0});
const darkWood=matte(0x4e3026),timber=matte(0x876647),stoneMat=matte(0x7d8e8a),stoneBright=matte(0xbcc4ae),tile=matte(0x527b6c),tileEdge=matte(0x334e48),copper=matte(0x9d6040,.65);
const grassMat=matte(0xd5db79),trunkMat=matte(0x674d37),leafMat=matte(0xffffff),rockMat=matte(0xffffff),fireflyMat=new THREE.MeshBasicMaterial({color:0xa5ffe9,transparent:true,opacity:.64});
const temp=new THREE.Object3D(); const tempColor=new THREE.Color();
function rnd(a,b,c=0){let n=(Math.imul(a|0,1664525)+Math.imul(b|0,1013904223)+Math.imul(c|0,48271))|0;n=Math.imul(n^(n>>>13),2246822519);return ((n^(n>>>16))>>>0)/4294967296;}
function height(x,z){return world.h[iAt(x,z)];}
function obj(geometry,material,x,y,z,parent=worldGroup){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.receiveShadow=true;mesh.castShadow=true;parent.add(mesh);return mesh;}
function block(w,h,d,mat,x,y,z,parent=worldGroup){return obj(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);}
function cylinder(r0,r1,h,mat,x,y,z,parent=worldGroup){return obj(new THREE.CylinderGeometry(r0,r1,h,9),mat,x,y,z,parent);}
function beamBetween(x1,y1,z1,x2,y2,z2,thickness,mat,parent=worldGroup){const a=new THREE.Vector3(x1,y1,z1),b=new THREE.Vector3(x2,y2,z2);const d=b.clone().sub(a);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(thickness,thickness,d.length(),8),mat);mesh.position.copy(a.add(b).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());mesh.castShadow=true;parent.add(mesh);return mesh;}
// A real terrain mesh. Vertex colors are controlled by the same state used by combat and exploration.
const positions=new Float32Array(N*N*3),colors=new Float32Array(N*N*3),indices=[];
for(let z=0;z<N;z++)for(let x=0;x<N;x++){const i=z*N+x;positions[i*3]=x-HALF;positions[i*3+1]=world.h[i];positions[i*3+2]=z-HALF;
if(x<N-1&&z<N-1){const a=i,b=i+1,c=i+N,d=c+1;indices.push(a,c,b,b,c,d);}}
const terra=new THREE.BufferGeometry();terra.setIndex(indices);terra.setAttribute('position',new THREE.BufferAttribute(positions,3));terra.setAttribute('color',new THREE.BufferAttribute(colors,3));terra.computeVertexNormals();
const terrain=new THREE.Mesh(terra,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));terrain.receiveShadow=true;worldGroup.add(terrain);
const vegetationQuality=window.matchMedia('(pointer:coarse)').matches?'low':'medium';
let groundTexture=installTexturedTerrain(THREE,terrain,world,runtime.ground,{quality:vegetationQuality});
function buildLivingLandscape(){
  landscape?.dispose();
  try{
    landscape=createLivingLandscape(THREE,worldGroup,{seed:world.seed,quality:vegetationQuality,
      origin:selected,initialDay:world.day,initialSave:readSaved(storageKey.vegetation),
      terrainHeight:height,
      biomeAt:(x,z)=>runtime.ground.metadataAt(x,z).biome,
      trailAt:(x,z)=>runtime.ground.metadataAt(x,z).trail,
      shadeAt:(x,z)=>runtime.ground.metadataAt(x,z).shade,
      obstacleAt:(x,z)=>{const m=runtime.ground.metadataAt(x,z);return Math.abs(x)>32||Math.abs(z)>32||m.built||['road','riverbed','bridge','temple','house'].includes(m.type);},
      moistureAt:(x,z)=>world.m[iAt(x,z)],
      worldGrowthAt:(x,z)=>({vigor:world.b[iAt(x,z)],scorch:world.fire[iAt(x,z)],wet:world.m[iAt(x,z)]}),
      maxPlants:vegetationQuality==='low'?6500:14000,
      fogColor:'#a9cacc',fogNear:28,fogFar:110,wind:.36,
    });
    landscape.setAtmosphere({rain:world.sky==='rain'?.7:0});
  }catch(e){landscape=null;console.warn('Falling back to legacy vegetation:',e);}
}
const palettes={stone:new THREE.Color(0x84918a),dry:new THREE.Color(0xbeb08b),forest:new THREE.Color(0x426a54),wet:new THREE.Color(0x568b78),aether:new THREE.Color(0x627b90),ash:new THREE.Color(0x353f38)};
function terrainColor(i){
 const m=world.m[i],b=world.b[i],ash=world.ash[i],a=world.a[i],s=world.stone[i];
 let c=palettes.dry.clone().lerp(palettes.wet,Math.min(1,m*.9)).lerp(palettes.forest,Math.min(.8,b*.6));
 if(world.w[i]>.15)c.lerp(new THREE.Color(0x347a89),Math.min(.55,world.w[i]));
 c.lerp(palettes.stone,Math.max(0,s-.47)*.46);c.lerp(palettes.ash,ash*.9);
 if(mode==='water')c=new THREE.Color(0x222d37).lerp(new THREE.Color(0x43beed),Math.min(1,m*.6+world.w[i]));
 if(mode==='growth')c=new THREE.Color(0x583a34).lerp(new THREE.Color(0x9ce777),b);
 if(mode==='aether')c=new THREE.Color(0x162034).lerp(new THREE.Color(0xcca2ff),a).lerp(new THREE.Color(0x70f7e1),world.res[i]*.85);
 if(mode==='hazard')c=new THREE.Color(0x254e44).lerp(new THREE.Color(0xff624c),Math.min(1,ash+world.fire[i]));
 return c;
}
function paintTerrain(){for(let i=0;i<N*N;i++){const c=terrainColor(i);colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}terra.attributes.color.needsUpdate=true;}
// Preallocated instances: substantial ecology without one draw call per plant.
const TREE_MAX=580,GRASS_MAX=2600,ROCK_MAX=270,FLOWER_MAX=420;
const treeTrunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.095,.19,1,6),trunkMat,TREE_MAX);
const treeCrown=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),leafMat,TREE_MAX);
const treeCrownTop=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),leafMat,TREE_MAX);
const grasses=new THREE.InstancedMesh(new THREE.ConeGeometry(.11,1,3),grassMat,GRASS_MAX);
const flowers=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.08,0),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.8}),FLOWER_MAX);
const rocks=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),rockMat,ROCK_MAX);
const fireflies=new THREE.InstancedMesh(new THREE.SphereGeometry(.13,6,5),fireflyMat,135);
for(const v of [treeTrunks,treeCrown,treeCrownTop,grasses,flowers,rocks,fireflies]){v.instanceMatrix.setUsage(THREE.DynamicDrawUsage);v.frustumCulled=false;worldGroup.add(v);}
const treeSamples=Array.from({length:TREE_MAX},(_,i)=>({x:(rnd(i,11)*62)-31,z:(rnd(i,12)*62)-31,prob:rnd(i,31),rot:rnd(i,41)*Math.PI*2,size:.75+rnd(i,47)*1.3,type:rnd(i,16)}));
const grassSamples=Array.from({length:GRASS_MAX},(_,i)=>({x:rnd(i,52)*63-31.5,z:rnd(i,62)*63-31.5,prob:rnd(i,89),size:.4+rnd(i,13)*1.0}));
const rockSamples=Array.from({length:ROCK_MAX},(_,i)=>({x:rnd(i,81)*62-31,z:rnd(i,92)*62-31,prob:rnd(i,103),size:.25+rnd(i,104)*.45}));
const flowerSamples=Array.from({length:FLOWER_MAX},(_,i)=>({x:rnd(i,141)*62-31,z:rnd(i,142)*62-31,prob:rnd(i,143)}));
buildLivingLandscape();
grasses.visible=!landscape;flowers.visible=!landscape;
function setInstance(mesh,j,x,y,z,sx,sy,sz,rot=0,color){temp.position.set(x,y,z);temp.rotation.set(0,rot,0);temp.scale.set(sx,sy,sz);temp.updateMatrix();mesh.setMatrixAt(j,temp.matrix);if(color)mesh.setColorAt(j,color);}
function flush(mesh,count){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
function pathDistance(x,z){return Math.min(Math.abs(z-5)*.6+Math.abs(x-riverX(5))*.1,Math.hypot(x-18,z-14)*.42);}
function rebuildEcology(){
 let t=0,g=0,r=0,f=0,gl=0;
 for(const q of treeSamples){const i=iAt(q.x,q.z),bio=world.b[i],d=Math.abs(q.x-riverX(q.z)),chapel=Math.hypot(q.x+16,q.z+10),orchard=Math.hypot(q.x-16,q.z-14);
  const density=bio*(q.x<-6&&q.z>5?1.9:1.12);if(q.prob>density||d<3.7||chapel<5||orchard<4.3||pathDistance(q.x,q.z)<.45||['house','temple','road','riverbed','bridge'].includes(runtime.ground.metadataAt(q.x,q.z).type))continue;
  const y=height(q.x,q.z),size=q.size*(.64+bio*.95)*(1-world.ash[i]*.5),stem=1.35*size,crown=1.3*size;
  setInstance(treeTrunks,t,q.x,y+stem*.50,q.z,.8*size,stem, .8*size,q.rot);
  const green=tempColor.setHex(q.type>.76?0x779461:(world.m[i]>.45?0x456c51:0x749364));green.lerp(new THREE.Color(0x916e55),world.ash[i]);
  setInstance(treeCrown,t,q.x,y+stem+size*.65,q.z,crown*.88,crown*.82,crown*.88,q.rot,green);
  setInstance(treeCrownTop,t,q.x+size*.25,y+stem+size*1.3,q.z-size*.13,crown*.58,crown*.6,crown*.58,q.rot,green.clone().multiplyScalar(1.13));t++;
 }
 if(!landscape)for(const q of grassSamples){const i=iAt(q.x,q.z),b=world.b[i],d=Math.abs(q.x-riverX(q.z));if(q.prob>b*.96||d<2.8||world.fire[i]>.1||['house','temple','road','riverbed','bridge'].includes(runtime.ground.metadataAt(q.x,q.z).type))continue;
  const y=height(q.x,q.z),size=q.size*(.55+b*.8);setInstance(grasses,g,q.x,y+size*.25,q.z,size*.36,size*.65,size*.36,q.prob*9,new THREE.Color(0x829657).lerp(new THREE.Color(0xcbdc83),world.m[i]));g++;}
 for(const q of rockSamples){const i=iAt(q.x,q.z),st=world.stone[i];if(q.prob>st*.7)continue;const y=height(q.x,q.z);setInstance(rocks,r,q.x,y+.15*q.size,q.z,q.size*1.2,q.size*.7,q.size,rnd(r,4)*6,new THREE.Color(0x6c8176).lerp(new THREE.Color(0xb5b8a0),.4+st*.4));r++;}
 if(!landscape)for(const q of flowerSamples){const i=iAt(q.x,q.z);if(q.prob>world.b[i]*.7||world.ash[i]>.4||['house','temple','road','riverbed','bridge'].includes(runtime.ground.metadataAt(q.x,q.z).type))continue;const y=height(q.x,q.z);setInstance(flowers,f,q.x,y+.12,q.z,1,1,1,0,new THREE.Color(q.prob>.35?0xd9adf1:0xfde1a4));f++;}
 const echo=world.summary().resonance;
 const glowCount=Math.min(135,Math.round(echo*850));
 for(let i=0;i<glowCount;i++){const x=-16+(rnd(i,201)-.5)*20,z=-10+(rnd(i,202)-.5)*20;const j=iAt(x,z);const amt=world.res[j];if(amt<.04)continue;
   setInstance(fireflies,gl,x,height(x,z)+1.1+rnd(i,203)*3,z,.5+amt,.5+amt,.5+amt);gl++;}
 for(const [mesh,n] of [[treeTrunks,t],[treeCrown,t],[treeCrownTop,t],[grasses,g],[rocks,r],[flowers,f],[fireflies,gl]])flush(mesh,n);
 document.getElementById('ecology-count').textContent=`${t} living trees · ${g} grass clusters · ${r} rocks`;
}
const riverGeo=new THREE.BufferGeometry(),riverPos=[],riverIndex=[];
for(let k=0;k<=128;k++){const z=-32+k*.5;const x=riverX(z),width=2.45+.23*Math.sin(z*.2);for(const off of [-width,width])riverPos.push(x+off,-.31,z);
 if(k<128){const i=k*2;riverIndex.push(i,i+2,i+1,i+1,i+2,i+3);}}
riverGeo.setAttribute('position',new THREE.Float32BufferAttribute(riverPos,3));riverGeo.setIndex(riverIndex);riverGeo.computeVertexNormals();
const waterMaterial=new THREE.MeshPhysicalMaterial({color:0x3f9ea8,metalness:.18,roughness:.16,transparent:true,opacity:.83,side:THREE.DoubleSide,depthWrite:false,clearcoat:1,clearcoatRoughness:.12});
const river=new THREE.Mesh(riverGeo,waterMaterial);river.receiveShadow=true;worldGroup.add(river);
const puddles=new THREE.InstancedMesh(new THREE.CircleGeometry(.72,12),new THREE.MeshStandardMaterial({color:0x5daeb6,transparent:true,opacity:.62,roughness:.22,side:THREE.DoubleSide,depthWrite:false}),430);
worldGroup.add(puddles);puddles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
const puddleSamples=Array.from({length:430},(_,i)=>({x:rnd(i,171)*60-30,z:rnd(i,172)*60-30}));
function rebuildWater(){let n=0;for(const q of puddleSamples){const w=world.w[iAt(q.x,q.z)];if(w<.11||Math.abs(q.x-riverX(q.z))<3.1)continue;temp.position.set(q.x,height(q.x,q.z)+.08,q.z);temp.rotation.set(-Math.PI/2,0,0);temp.scale.set(.8+w*1.0,.8+w*1.0,1);temp.updateMatrix();puddles.setMatrixAt(n++,temp.matrix);}flush(puddles,n);}
// Authored architecture uses local topography. The chapel, gate, bridge and orchard are gameplay landmarks.
function makeChapel(){const grp=new THREE.Group();worldGroup.add(grp);const x=-16,z=-10,y=height(x,z);
  const floor=cylinder(4.1,4.1,.4,stoneMat,x,y+.14,z);floor.castShadow=false;
  for(let j=0;j<10;j++){const a=j*Math.PI/5,r=3.35;const px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r,py=height(px,pz);
  const broken=j===1||j===6,high=broken?1.15:2.5;cylinder(.34,.41,high,stoneBright,px,py+high*.5,pz);
  if(!broken){obj(new THREE.CylinderGeometry(.58,.44,.28,8),copper,px,py+high+.05,pz);} }
  for(let j=0;j<4;j++){const a=j*Math.PI/2+.4;beamBetween(x+Math.cos(a)*2.6,y+2.8,z+Math.sin(a)*2.6,x+Math.cos(a+Math.PI/5)*2.6,y+2.8,z+Math.sin(a+Math.PI/5)*2.6,.12,stoneMat);}
  cylinder(.75,1.0,1.3,stoneMat,x,y+.9,z);cylinder(.42,.42,.65,copper,x,y+1.6,z);
  obj(new THREE.TorusGeometry(1.3,.09,6,48),new THREE.MeshStandardMaterial({color:0xb9e3d5,emissive:0x227a81,emissiveIntensity:.9}),x,y+2.1,z).rotation.x=Math.PI/2;
 }
makeChapel();
function cottage(x,z,scale=1){const y=height(x,z);const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);worldGroup.add(g);
 const foundation=block(5.7,.4,5,stoneMat,0,.15,0,g);foundation.castShadow=false;
 block(5,3.2,4.5,timber,0,1.88,0,g);
 for(const dir of [-1,1]){const roof=block(3.9,.38,5.3,tileEdge,dir*1.26,4.1,0,g);roof.rotation.z=dir*-.58;}
 block(.95,1.9,.1,darkWood,-.7,1.1,2.28,g);
 for(const xx of [1.1,-1.7]){block(.9,1.1,.11,stoneBright,xx,2.18,2.30,g);block(.10,1.1,.14,darkWood,xx,2.18,2.39,g);}
 block(.7,1.6,.7,stoneMat,1.55,4.6,-.9,g);
 for(const px of [-2.5,2.5])for(const pz of [-2.0,2.0])cylinder(.12,.15,.8,darkWood,px,.45,pz,g);
 return g;}
cottage(17,14,1.1);cottage(22,1,.85);cottage(-23,18,.78);
function gate(x,z){const y=height(x,z);for(const dx of [-2.2,2.2])cylinder(.38,.52,3.2,stoneMat,x+dx,y+1.6,z);block(5.6,.36,.5,stoneBright,x,y+3.2,z);
const blades=new THREE.Group();blades.name='gate-blades';blades.position.set(x,y+1.6,z);worldGroup.add(blades);for(let j=0;j<6;j++)block(.19,2.9,.15,copper,(j-2.5)*.66,0,0,blades);return blades;}
const gateBlades=gate(riverX(14),14);
const bridgeGroup=new THREE.Group();worldGroup.add(bridgeGroup);
function createBridge(){const z=5,x=riverX(z),y=Math.max(height(x-4,z),height(x+4,z),.05)+.62;
 const brokenMat=matte(0x685640);
 for(let j=0;j<13;j++) {const missing=![1,3,5,8,10].includes(j);if(world.bridgeRepaired||!missing){const m=block(.62,.18,2.8,world.bridgeRepaired?timber:brokenMat,x-4.1+j*.7,y,z,bridgeGroup);m.rotation.y=.02*Math.sin(j);}}
 for(const side of [-1,1])for(const at of [-4.1,0,4.1])cylinder(.15,.18,1.3,timber,x+at,y+.7,z+side*1.4,bridgeGroup);
 for(const side of [-1,1])beamBetween(x-4.1,y+1.2,z+side*1.4,x+4.1,y+1.2,z+side*1.4,.10,timber,bridgeGroup);
}
function replaceBridge(){while(bridgeGroup.children.length){const old=bridgeGroup.children[0];bridgeGroup.remove(old);old.geometry?.dispose();}createBridge();}
createBridge();
// Cross-world track. It is a traversal affordance, not random ground decoration.
const trackMat=new THREE.MeshStandardMaterial({color:0xb9a487,roughness:1,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false});
function track(points,width=.8){const arr=[],inds=[];for(let p=0;p<points.length;p++){const [x,z]=points[p];const prev=points[Math.max(0,p-1)],next=points[Math.min(points.length-1,p+1)];const dx=next[0]-prev[0],dz=next[1]-prev[1],len=Math.hypot(dx,dz)||1;
for(const sign of [-1,1]){const px=x+sign*(-dz/len)*width,pz=z+sign*(dx/len)*width;arr.push(px,height(px,pz)+.075,pz);}if(p<points.length-1){const j=p*2;inds.push(j,j+2,j+1,j+1,j+2,j+3);}}
const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));geo.setIndex(inds);geo.computeVertexNormals();worldGroup.add(new THREE.Mesh(geo,trackMat));}
track(Array.from({length:25},(_,i)=>{const t=i/24;return [17+(riverX(5)-17)*t,14+(5-14)*t];}),.67);
track(Array.from({length:25},(_,i)=>{const t=i/24;return [-16+(riverX(5)+16)*t,-10+(5+10)*t];}),.62);
// Selection ring is a visible probe into actual field values.
const picker=obj(new THREE.TorusGeometry(.66,.075,8,36),new THREE.MeshBasicMaterial({color:0xffe4a0,transparent:true,opacity:.95}),selected.x,height(selected.x,selected.z)+.25,selected.z);picker.rotation.x=Math.PI/2;
function movePicker(){picker.position.set(selected.x,height(selected.x,selected.z)+.26,selected.z);}
const rainCount=650;const rainGeometry=new THREE.BufferGeometry(),rainArray=new Float32Array(rainCount*3);for(let j=0;j<rainCount;j++){rainArray[j*3]=rnd(j,221)*64-32;rainArray[j*3+1]=rnd(j,222)*21+2;rainArray[j*3+2]=rnd(j,223)*64-32;}
rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainArray,3));const rainDrops=new THREE.Points(rainGeometry,new THREE.PointsMaterial({color:0xc5e6ef,size:.17,transparent:true,opacity:.5,depthWrite:false}));scene.add(rainDrops);
const pulseMaterial=new THREE.MeshBasicMaterial({color:0x77ffed,transparent:true,opacity:0,depthWrite:false});
const pulse=obj(new THREE.TorusGeometry(1,.055,6,72),pulseMaterial,-16,0,-10);pulse.rotation.x=Math.PI/2;let pulseAge=-1;
function showPulse(){pulse.position.set(selected.x,height(selected.x,selected.z)+.28,selected.z);pulseAge=0;}
function refresh(rebuild=true){if(rebuild){paintTerrain();rebuildEcology();rebuildWater();replaceBridge();gateBlades.position.y=height(riverX(14),14)+1.6+(world.sluiceOpen?2.6:0);rainDrops.visible=world.sky==='rain';summaryCache=world.summary();}
 movePicker();const s=summaryCache,p=world.sample(selected.x,selected.z),g=runtime.evaluate(selected.x,selected.z),floor=runtime.material(selected.x,selected.z);
 document.getElementById('day').textContent=`Day ${s.day} · ${s.sky}`;
 document.getElementById('region').textContent=world.region(selected.x,selected.z);
 document.getElementById('summary').innerHTML=`<b>${(100*s.canopy).toFixed(1)}%</b> canopy · <b>${(100*s.orchardMoisture).toFixed(0)}%</b> orchard moisture · <b>${s.water}</b> water volume`;
 hud.innerHTML=`<div class="hudhead">Survey point <small>${selected.x.toFixed(1)}, ${selected.z.toFixed(1)}</small></div><div class="metrics">
 <span>Moisture <b>${Math.round(p.moisture*100)}%</b></span><span>Growth <b>${Math.round(p.biomass*100)}%</b></span>
 <span>Aether <b>${Math.round(p.aether*100)}%</b></span><span>Resonance <b>${Math.round(p.resonance*100)}%</b></span>
 <span>Defensive cover <b>${Math.round(g.cover*100)}%</b></span><span>Fire shield <b>${Math.round(g.shielding.fire*100)}%</b></span>
 <span>Encounters <b>${Math.round(g.encounterChance*100)}%</b></span><span>Harvest <b>${Math.round(g.harvest*100)}%</b></span>
 </div><div class="world-effect">Likely inhabitant: <strong>${g.creature}</strong><br>${g.traversalPassable?'Path accessible':'Path requires repair or a safer crossing'}<br>Memory echo strength: ${g.historyEcho.toFixed(2)}<br>Ground: <strong>${floor?.label??'Unmapped'}</strong> · ${floor?.type??'unknown'}<br>
 Walking cost <b>${g.walkCost.toFixed(2)}</b> · grip <b>${Math.round((floor?.traction??0)*100)}%</b> · noise <b>${Math.round((floor?.noise??0)*100)}%</b><br>
 Floor history: ${floor?.reward??'No evidence'} · impact fracture ${Math.round((floor?.fracture??0)*100)}% · charged ${Math.round((floor?.charge??0)*100)}%</div>`;
 document.getElementById('timber').textContent=s.supplies.timber;document.getElementById('stone').textContent=s.supplies.stone;
 document.getElementById('sluice').textContent=s.sluiceOpen?'Close sluice':'Open sluice';document.getElementById('rain').textContent=s.sky==='rain'?'Clear skies':'Begin rainfall';
 if(rebuild)saveReconciledState();
}
function saveReconciledState(){try{
  localStorage.setItem('aa-living-world-v1',JSON.stringify(world.snapshot()));
  localStorage.setItem(storageKey.ground,JSON.stringify(runtime.ground.save()));
  if(landscape)localStorage.setItem(storageKey.vegetation,JSON.stringify(landscape.serialize()));
 }catch(e){console.warn('Partial save of world/environment:',e);}}
function onEcologyEvent(event){
 if(!landscape)return;
 const x=event.x,z=event.z;
 if(event.type==='plant')landscape.water(x,z,{radius:1.5,amount:.4});
 if(event.type==='harvest')landscape.harvest(x,z,{radius:1.3,effort:.9});
 if(event.type==='ignite')landscape.ignite(x,z,{radius:2,strength:1});
 if(event.type==='cast'&&event.element==='fire')landscape.ignite(x,z,{radius:1.8,strength:.7});
 if(event.type==='cast'&&event.element==='water')landscape.water(x,z,{radius:1.8,amount:.7});
 if(event.type==='advance')landscape.advanceDays(event.days);
 landscape.setAtmosphere({rain:world.sky==='rain'?.7:0});
}
function onFloorChanged({rebuildMaps=false}={}){
 if(rebuildMaps){groundTexture.refreshLookup();groundTexture.redraw();}
 saveReconciledState();refresh(false);
}
function announce(message){note.textContent=message;note.classList.add('visible');}
function apply(event,success){try{const r=runtime.dispatch(event);if(!r.ok)return announce(r.reason);
 onEcologyEvent(event);groundTexture.refreshLookup();groundTexture.redraw();refresh();
 announce(success+(r.attack?` Material ${r.attack.groundMaterial}; damage ${r.attack.damage.toFixed(2)} (x${r.attack.groundMultiplier}).`:''));
 if(event.type==='hydrophone')showPulse();}catch(e){announce(e.message);}}
document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{switch(el.dataset.action){
case 'sluice':apply({type:'sluice',open:!world.sluiceOpen},'The orchard water table and floodplain will respond over time.');break;
case 'bridge':apply({type:'bridge'},'A new river crossing is now passable.');break;
case 'hydrophone':apply({type:'hydrophone',...selected,phase:Number(document.getElementById('phase').value)/100,intensity:1},'The Hydrophone emitted a coherent wave. Tune the phase for constructive or destructive interference.');break;
case 'ignite':apply({type:'ignite',...selected},'Fire damages biomass, cover and future harvests.');break;
case 'plant':apply({type:'plant',...selected},'A young grove takes root. Timber consumed.');break;
case 'harvest':apply({type:'harvest',...selected},'Wood gathered; local growth reduced.');break;
case 'fire-skill':apply({type:'cast',element:'fire',power:2,...selected},'Fire skill resolved against local cover, moisture and Aether. The terrain now bears the impact.');break;
case 'water-skill':apply({type:'cast',element:'water',power:2,...selected},'Water skill altered the terrain moisture and extinguished local flames.');break;
case 'advance':apply({type:'advance',days:7},'Seven days of weather, growth, fire and ecology simulated.');break;
case 'rain':apply({type:'rain',mode:world.sky==='rain'?'clear':'rain'},'Weather changed. Rain alters moisture as days pass.');break;
case 'step':{const e=runtime.step(selected.x,selected.z,{speed:1.1});if(e){landscape?.step(selected.x,selected.z,.7,1);onFloorChanged({rebuildMaps:true});announce(`Footfall: ${e.material} · noise ${e.noise.toFixed(2)} · footprint ${e.track.toFixed(2)}.`);}break;}
case 'lightning':{const e=runtime.impact(selected.x,selected.z,'lightning',1);if(e){onFloorChanged({rebuildMaps:true});announce(`Lightning on ${e.material}: ${e.effects.join(', ')||'energy retained in the floor'}.`);}break;}
case 'aether-skill':{apply({type:'cast',element:'aether',power:2,...selected},'An aether pulse propagated through the material.');break;}
case 'fracture':{const e=runtime.impact(selected.x,selected.z,'kinetic',1);if(e){onFloorChanged({rebuildMaps:true});announce(`Terrain impact: ${e.consequence.newFracture} fracture · ${e.effects.join(', ')||'surface weakened'}.`);}break;}
case 'repair':{if(world.supplies.stone<=0){announce('Need one stone to repair the selected ground.');break;}world.supplies.stone--;
 const e=runtime.ground.repair(selected.x,selected.z,'stone');onFloorChanged({rebuildMaps:true});announce(`Repaired ${e.material} using stone; integrity ${(e.integrity*100).toFixed(0)}%.`);break;}
case 'reset':if(confirm('Reset this demonstration world?')){
 world=new LivingWorld(71);localStorage.removeItem(storageKey.ground);localStorage.removeItem(storageKey.vegetation);
 runtime=createReconciledRuntime(world);groundTexture.dispose();groundTexture=installTexturedTerrain(THREE,terrain,world,runtime.ground,{quality:vegetationQuality});
 buildLivingLandscape();grasses.visible=!landscape;flowers.visible=!landscape;refresh();announce('New seeded timeline created with clean terrain history.');}break;
case 'export':{const blob=new Blob([JSON.stringify({...runtime.save(),vegetation:landscape?.serialize()??null})],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='aa-living-world-save.json';a.click();URL.revokeObjectURL(url);announce('Saved the entire numerical world state and event history.');}break;
}}));
document.querySelectorAll('[data-mode]').forEach(el=>el.addEventListener('click',()=>{mode=el.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x.dataset.mode===mode));paintTerrain();groundTexture.setMode(mode);}));
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let pStart=null;
renderer.domElement.addEventListener('pointerdown',e=>{pStart={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',e=>{if(!pStart||Math.hypot(e.clientX-pStart.x,e.clientY-pStart.y)>9)return;const rect=renderer.domElement.getBoundingClientRect();pointer.x=(e.clientX-rect.left)/rect.width*2-1;pointer.y=-(e.clientY-rect.top)/rect.height*2+1;ray.setFromCamera(pointer,camera);const hits=ray.intersectObject(terrain,false);if(hits.length){selected={x:THREE.MathUtils.clamp(hits[0].point.x,-32,32),z:THREE.MathUtils.clamp(hits[0].point.z,-32,32)};refresh(false);}});
function resize(){const w=root.clientWidth,h=root.clientHeight;const aspect=w/h,view=48;camera.left=-view*aspect;camera.right=view*aspect;camera.top=view;camera.bottom=-view;camera.updateProjectionMatrix();renderer.setSize(w,h);}window.addEventListener('resize',resize);resize();
let lastTime=0;function render(t){const dt=Math.min(.05,(t-lastTime)/1000||.016);lastTime=t;orbit.update();
 const rp=riverGeo.attributes.position;const arr=rp.array;for(let k=0;k<129;k++){const y=-.31+Math.sin(t*.0018+k*.29)*.027;arr[k*6+1]=y;arr[k*6+4]=y;}rp.needsUpdate=true;
 if(rainDrops.visible){const a=rainGeometry.attributes.position.array;for(let i=0;i<rainCount;i++){a[i*3+1]-=dt*(9+rnd(i,9)*9);if(a[i*3+1]<-2)a[i*3+1]=20;}rainGeometry.attributes.position.needsUpdate=true;}
 if(pulseAge>=0){pulseAge+=dt;pulse.scale.setScalar(1+pulseAge*7);pulseMaterial.opacity=Math.max(0,.85-pulseAge*.6);if(pulseAge>1.5)pulseAge=-1;}
 picker.rotation.z+=dt*.26;
 landscape?.update(dt,selected,{worldDay:world.day});
 renderer.render(scene,camera);}
refresh();renderer.setAnimationLoop(render);
window.aaWorld=Object.freeze({
 getSnapshot:()=>world.snapshot(),getIntegratedSnapshot:()=>({...runtime.save(),vegetation:landscape?.serialize()??null}),
 getGameplayAt:(x,z)=>runtime.evaluate(x,z),getGroundAt:(x,z)=>runtime.material(x,z),
 previewAttack:(x,z,element,power)=>runtime.attack(x,z,element,power),
 step:(x,z,opts)=>{const e=runtime.step(x,z,opts);landscape?.step(x,z);onFloorChanged();return e;},
 ingest:(event)=>{const result=runtime.ingest(event);if(result.ok){
  onEcologyEvent(result.groundEvent);groundTexture.refreshLookup();groundTexture.redraw();refresh();
 }return result;},
 version:'reconciled-world-v2'
});
