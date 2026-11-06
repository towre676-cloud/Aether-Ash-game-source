import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {LivingWorld,N,HALF,iAt,riverX,roadProximity} from './world.mjs';
import {AtlasWorld} from './adventure.mjs';
import {REGIONS,REGION_BY_ID,SPECIES,RECIPES,QUESTS} from './content.mjs';
import {decorateRegion} from './details.mjs';
import {createFauna,createCitizens} from './actors.mjs';
import {WorldAudio} from './sound.mjs';
import {AtlasAcousticBridge,perceiveAt} from './perception.mjs';
import {AtlasSurveyV6} from './acoustic-survey-v6.mjs';
import {createGrassField as createGrassFieldV5} from './grass-v5/grass-renderer.mjs';
import {createGrassField as createGrassFieldV4} from './grass-v4/grass-renderer.mjs';
import {createFoliageQualityGovernor} from './grass-v4/foliage-quality-governor.mjs';
import {terrainEcotone,visualSeason,substrateFor} from './world-ecotones-v6.mjs';
import {materialAt,biomeAt,vegetationObstacle} from './surfaces.mjs';
import {generateGroundMaps} from './ground/ground-synthesis.mjs';
import {makeCanvasImage} from './ground/ground-runtime.mjs';
import {loadSave,writeSave,importSave,eraseSave} from './storage.mjs';

const root=document.getElementById('viewport');
const hud=document.getElementById('hud');
const note=document.getElementById('notice');
let atlas;
try{const data=await loadSave();atlas=data?AtlasWorld.restore(data):new AtlasWorld(2301);}
catch(e){atlas=new AtlasWorld(2301);console.warn('Save could not be restored:',e);}
let world=atlas.world;let surveyV6=new AtlasSurveyV6(atlas);
const audio=new WorldAudio();
const acoustic=new AtlasAcousticBridge({onCaption:({text})=>{if(text)announce(text);}});
acoustic.engine.init().catch(error=>console.warn('Recorded soundpack not yet available:',error));
let autosaveJob=Promise.resolve();
function save(){autosaveJob=autosaveJob.catch(()=>{}).then(()=>writeSave(atlas.snapshot())).catch(e=>announce('Save could not be written: '+e.message));return autosaveJob;}
let selected={x:-16,z:-10}, mode='scenery',summaryCache=null;let selectedResidentId=null,lastHudEvent=-1,lastHudAtlas=null;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xadd2d6);scene.fog=new THREE.FogExp2(0xa9cacc,.006);
const camera=new THREE.OrthographicCamera(-47,47,35,-35,.1,350);
camera.position.set(58,65,72);camera.lookAt(0,0,0);
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(e){root.innerHTML='<p class="error">WebGL2 is unavailable on this device. The numerical world remains testable separately.</p>';throw e;}
let qualityMode=window.matchMedia('(pointer:coarse)').matches?'battery':'balanced';
let foliageTier=qualityMode==='battery'?'low':'medium';
const foliageGovernor=createFoliageQualityGovernor({quality:foliageTier,minimum:'low',maximum:'high',targetFrameMs:qualityMode==='battery'?33.3:22.2,enabled:qualityMode!=='battery'});
const maxRatio=window.matchMedia('(pointer:coarse)').matches?1.4:1.8;
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,qualityMode==='battery'?1:maxRatio));renderer.setSize(root.clientWidth,root.clientHeight);
renderer.shadowMap.enabled=qualityMode==='balanced';renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
root.appendChild(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.08;orbit.maxPolarAngle=Math.PI*.48;orbit.minPolarAngle=.22;orbit.minZoom=.65;orbit.maxZoom=3.4;orbit.target.set(0,0,0);orbit.update();
const ambient=new THREE.HemisphereLight(0xcce6ff,0x40513b,2.0);scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffe2b0,3.25);sun.position.set(-30,70,28);sun.castShadow=true;sun.shadow.mapSize.set(qualityMode==='battery'?1024:2048,qualityMode==='battery'?1024:2048);sun.shadow.camera.left=-60;sun.shadow.camera.right=60;sun.shadow.camera.top=60;sun.shadow.camera.bottom=-60;sun.shadow.bias=-.0005;scene.add(sun);
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
const positions=new Float32Array(N*N*3),colors=new Float32Array(N*N*3),uvs=new Float32Array(N*N*2),indices=[];
for(let z=0;z<N;z++)for(let x=0;x<N;x++){const i=z*N+x;positions[i*3]=x-HALF;positions[i*3+1]=world.h[i];positions[i*3+2]=z-HALF;uvs[i*2]=x/(N-1);uvs[i*2+1]=1-z/(N-1);
if(x<N-1&&z<N-1){const a=i,b=i+1,c=i+N,d=c+1;indices.push(a,c,b,b,c,d);}}
const terra=new THREE.BufferGeometry();terra.setIndex(indices);terra.setAttribute('position',new THREE.BufferAttribute(positions,3));terra.setAttribute('color',new THREE.BufferAttribute(colors,3));terra.setAttribute('uv',new THREE.BufferAttribute(uvs,2));terra.computeVertexNormals();
const terrain=new THREE.Mesh(terra,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));terrain.receiveShadow=true;worldGroup.add(terrain);
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
function paintTerrain(){for(let i=0;i<N*N;i++){const c=terrainColor(i);colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}terra.attributes.color.needsUpdate=true;
  terrain.material.vertexColors=mode!=='scenery';terrain.material.needsUpdate=true;
 }
let surfaceGrass=null,grassRoot=null,groundKey='',groundTextures=[];
function disposeGroundTextures(){for(const t of groundTextures)t.dispose();groundTextures=[];}
function groundMap(key){const maps=generateGroundMaps({seed:world.seed,width:qualityMode==='battery'?112:192,height:qualityMode==='battery'?112:192,
 originX:0,originZ:0,metresX:64,metresZ:64,
 materialAt:(x,z)=>materialAt(atlas.region,world,Math.max(-32,Math.min(32,x)),Math.max(-32,Math.min(32,z))),
 weather:{rain:world.sky==='rain'?.65:.03,moss:atlas.region.flora*.35,heat:atlas.region.heat*.38,age:Math.min(1,atlas.age/220)},
 weatherAt:(x,z)=>{const p=world.sample(Math.max(-32,Math.min(32,x)),Math.max(-32,Math.min(32,z)));return {rain:p.moisture*.65,heat:p.fire*.8,moss:p.biomass*.4};}});
 const tex=(type)=>{const t=new THREE.CanvasTexture(makeCanvasImage(maps,type));t.colorSpace=type==='albedo'?THREE.SRGBColorSpace:THREE.NoColorSpace;
 t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.needsUpdate=true;groundTextures.push(t);return t;};
 terrain.material.map=tex('albedo');terrain.material.normalMap=tex('normal');terrain.material.roughnessMap=tex('roughness');
 terrain.material.normalScale.set(.22,.22);terrain.material.roughness=.93;terrain.material.needsUpdate=true;groundKey=key;
 }
function rebuildGroundIfNeeded(){const key=`${atlas.region.id}:${world.seed}:${world.sky}:${qualityMode}:${Math.floor(atlas.age/21)}`;
 if(key!==groundKey){disposeGroundTextures();groundMap(key);}}
function rebuildLivingGrass(){surfaceGrass?.dispose();surfaceGrass=null;if(grassRoot){worldGroup.remove(grassRoot);grassRoot=null;}
 const options={
  seed:world.seed,origin:{x:selected.x,z:selected.z},quality:foliageTier,maxPlants:qualityMode==='battery'?3500:9500,
  terrainHeight:(x,z)=>height(x,z),biomeAt:(x,z)=>biomeAt(atlas.region,world,x,z),
  obstacleAt:(x,z)=>vegetationObstacle(atlas.region,world,x,z),
  trailAt:(x,z)=>Math.max(0,Math.min(1,(1.65-roadProximity(x,z))/1.2)),
  moistureAt:(x,z)=>world.sample(x,z).moisture,shadeAt:(x,z)=>Math.max(0,world.sample(x,z).biomass-.5),
  growthAt:(x,z)=>atlas.surface.vegetation.sample(x,z),
  biomeMixAt:(x,z)=>terrainEcotone(atlas.region,world,x,z),
  seasonAt:()=>visualSeason(atlas.age,atlas.region.heat),
  substrateAt:(x,z)=>substrateFor(atlas.region,world,x,z),
  fogColor:atlas.region.sky,fogNear:20,fogFar:85,wind:.22};
 for(const [name,factory] of [['Grass v5',createGrassFieldV5],['Grass v4 fallback',createGrassFieldV4]]){
  const staging=new THREE.Group();
  try{surfaceGrass=factory(THREE,staging,options);grassRoot=staging;worldGroup.add(staging);
    surfaceGrass.setAtmosphere({wind:world.sky==='rain'?.65:.27,rain:world.sky==='rain'?1:0,fogColor:atlas.region.sky});
    if(name!=='Grass v5')console.warn('Using Grass v4 fallback after v5 failed');break;
  }catch(e){console.warn(name+' could not initialize:',e);surfaceGrass?.dispose();surfaceGrass=null;
    staging.traverse(child=>{if(child.geometry?.dispose)child.geometry.dispose();if(child.material?.dispose)child.material.dispose();});
    staging.clear();grassRoot=null;}
 }
 grasses.visible=!surfaceGrass;flowers.visible=!surfaceGrass;
}

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
function setInstance(mesh,j,x,y,z,sx,sy,sz,rot=0,color){temp.position.set(x,y,z);temp.rotation.set(0,rot,0);temp.scale.set(sx,sy,sz);temp.updateMatrix();mesh.setMatrixAt(j,temp.matrix);if(color)mesh.setColorAt(j,color);}
function flush(mesh,count){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
function pathDistance(x,z){return Math.min(Math.abs(z-5)*.6+Math.abs(x-riverX(5))*.1,Math.hypot(x-18,z-14)*.42);}
function rebuildEcology(){
 let t=0,g=0,r=0,f=0,gl=0;
 for(const q of (qualityMode==='battery'?treeSamples.slice(0,300):treeSamples)){const i=iAt(q.x,q.z),bio=world.b[i],d=Math.abs(q.x-riverX(q.z)),chapel=Math.hypot(q.x+16,q.z+10),orchard=Math.hypot(q.x-16,q.z-14);
  const density=bio*(q.x<-6&&q.z>5?1.9:1.12);if(q.prob>density||d<3.7||chapel<5||orchard<4.3||pathDistance(q.x,q.z)<.45)continue;
  const y=height(q.x,q.z),size=q.size*(.64+bio*.95)*(1-world.ash[i]*.5),stem=1.35*size,crown=1.3*size;
  setInstance(treeTrunks,t,q.x,y+stem*.50,q.z,.8*size,stem, .8*size,q.rot);
  const green=tempColor.setHex(q.type>.76?0x779461:(world.m[i]>.45?0x456c51:0x749364));green.lerp(new THREE.Color(0x916e55),world.ash[i]);
  setInstance(treeCrown,t,q.x,y+stem+size*.65,q.z,crown*.88,crown*.82,crown*.88,q.rot,green);
  setInstance(treeCrownTop,t,q.x+size*.25,y+stem+size*1.3,q.z-size*.13,crown*.58,crown*.6,crown*.58,q.rot,green.clone().multiplyScalar(1.13));t++;
 }
 for(const q of (qualityMode==='battery'?grassSamples.slice(0,1050):grassSamples)){const i=iAt(q.x,q.z),b=world.b[i],d=Math.abs(q.x-riverX(q.z));if(q.prob>b*.96||d<2.8||world.fire[i]>.1)continue;
  const y=height(q.x,q.z),size=q.size*(.55+b*.8);setInstance(grasses,g,q.x,y+size*.25,q.z,size*.36,size*.65,size*.36,q.prob*9,new THREE.Color(0x829657).lerp(new THREE.Color(0xcbdc83),world.m[i]));g++;}
 for(const q of (qualityMode==='battery'?rockSamples.slice(0,150):rockSamples)){const i=iAt(q.x,q.z),st=world.stone[i];if(q.prob>st*.7)continue;const y=height(q.x,q.z);setInstance(rocks,r,q.x,y+.15*q.size,q.z,q.size*1.2,q.size*.7,q.size,rnd(r,4)*6,new THREE.Color(0x6c8176).lerp(new THREE.Color(0xb5b8a0),.4+st*.4));r++;}
 for(const q of (qualityMode==='battery'?flowerSamples.slice(0,190):flowerSamples)){const i=iAt(q.x,q.z);if(q.prob>world.b[i]*.7||world.ash[i]>.4)continue;const y=height(q.x,q.z);setInstance(flowers,f,q.x,y+.12,q.z,1,1,1,0,new THREE.Color(q.prob>.35?0xd9adf1:0xfde1a4));f++;}
 const echo=world.summary().resonance;
 const glowCount=Math.min(135,Math.round(echo*850));
 for(let i=0;i<glowCount;i++){const x=-16+(rnd(i,201)-.5)*20,z=-10+(rnd(i,202)-.5)*20;const j=iAt(x,z);const amt=world.res[j];if(amt<.04)continue;
   setInstance(fireflies,gl,x,height(x,z)+1.1+rnd(i,203)*3,z,.5+amt,.5+amt,.5+amt);gl++;}
 for(const [mesh,n] of [[treeTrunks,t],[treeCrown,t],[treeCrownTop,t],[grasses,g],[rocks,r],[flowers,f],[fireflies,gl]])flush(mesh,n);
 document.getElementById('ecology-count').textContent=`${t} living trees · ${g} grass clusters · ${r} rocks`;
}
const riverGeo=new THREE.BufferGeometry(),riverPos=[],riverIndex=[];
for(let k=0;k<=128;k++){const z=-32+k*.5;const x=riverX(z),width=5.7+.5*Math.sin(z*.2);for(const off of [-width,width])riverPos.push(x+off,-.31,z);
 if(k<128){const i=k*2;riverIndex.push(i,i+2,i+1,i+1,i+2,i+3);}}
riverGeo.setAttribute('position',new THREE.Float32BufferAttribute(riverPos,3));riverGeo.setIndex(riverIndex);riverGeo.computeVertexNormals();
const waterMaterial=new THREE.MeshPhysicalMaterial({color:0x3f9ea8,metalness:.18,roughness:.16,transparent:true,opacity:.83,side:THREE.DoubleSide,depthWrite:false,clearcoat:1,clearcoatRoughness:.12});
const river=new THREE.Mesh(riverGeo,waterMaterial);river.receiveShadow=true;worldGroup.add(river);
const puddles=new THREE.InstancedMesh(new THREE.CircleGeometry(.72,12),new THREE.MeshStandardMaterial({color:0x5daeb6,transparent:true,opacity:.62,roughness:.22,side:THREE.DoubleSide,depthWrite:false}),430);
worldGroup.add(puddles);puddles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
const puddleSamples=Array.from({length:430},(_,i)=>({x:rnd(i,171)*60-30,z:rnd(i,172)*60-30}));
function rebuildWater(){let n=0;for(const q of puddleSamples){const w=world.w[iAt(q.x,q.z)];if(w<.11||Math.abs(q.x-riverX(q.z))<3.1)continue;temp.position.set(q.x,height(q.x,q.z)+.08,q.z);temp.rotation.set(-Math.PI/2,0,0);temp.scale.set(.8+w*1.0,.8+w*1.0,1);temp.updateMatrix();puddles.setMatrixAt(n++,temp.matrix);}flush(puddles,n);}
// Architecturally coherent landmark meshes depend on biome, history and material state.
const architecturalGroup=new THREE.Group();worldGroup.add(architecturalGroup);
let details=null;
const faunaGroup=new THREE.Group();worldGroup.add(faunaGroup);const citizenGroup=new THREE.Group();worldGroup.add(citizenGroup);
let fauna=null,faunaWorld=null,citizens=null;
function rebuildArchitecture(){if(details)details.dispose();details=decorateRegion(THREE,world,atlas.region,architecturalGroup,atlas);
 if(faunaWorld!==world){fauna?.dispose();citizens?.dispose();fauna=createFauna(THREE,world,atlas.region,faunaGroup,qualityMode==='battery'?'low':'high',atlas.wildlife,()=>atlas.characters[0].position,atlas);citizens=createCitizens(THREE,atlas,citizenGroup);faunaWorld=world;}
}

// Selection ring is a visible probe into actual field values.
const picker=obj(new THREE.TorusGeometry(.66,.075,8,36),new THREE.MeshBasicMaterial({color:0xffe4a0,transparent:true,opacity:.95}),selected.x,height(selected.x,selected.z)+.25,selected.z);picker.rotation.x=Math.PI/2;
function movePicker(){picker.position.set(selected.x,height(selected.x,selected.z)+.26,selected.z);}
const rainCount=650;const rainGeometry=new THREE.BufferGeometry(),rainArray=new Float32Array(rainCount*3);for(let j=0;j<rainCount;j++){rainArray[j*3]=rnd(j,221)*64-32;rainArray[j*3+1]=rnd(j,222)*21+2;rainArray[j*3+2]=rnd(j,223)*64-32;}
rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainArray,3));const rainDrops=new THREE.Points(rainGeometry,new THREE.PointsMaterial({color:0xc5e6ef,size:.17,transparent:true,opacity:.5,depthWrite:false}));scene.add(rainDrops);
const pulseMaterial=new THREE.MeshBasicMaterial({color:0x77ffed,transparent:true,opacity:0,depthWrite:false});
const pulse=obj(new THREE.TorusGeometry(1,.055,6,72),pulseMaterial,-16,0,-10);pulse.rotation.x=Math.PI/2;let pulseAge=-1;
function showPulse(){pulse.position.set(selected.x,height(selected.x,selected.z)+.28,selected.z);pulseAge=0;}
function refresh(rebuild=true){
 if(rebuild){
  paintTerrain();rebuildEcology();rebuildWater();rebuildArchitecture();rebuildGroundIfNeeded();rebuildLivingGrass();rainDrops.visible=world.sky==='rain';
  summaryCache=atlas.summary();lastHudEvent=atlas.eventNumber;lastHudAtlas=atlas;const r=atlas.region;
  scene.background.set(r.sky);scene.fog.color.set(r.sky);scene.fog.density=r.fog;
  waterMaterial.color.set(r.biome==='volcanic'?0x49616b:r.biome==='coast'?0x5c9bbc:0x3f9ea8);
 }
 if(!rebuild&&(lastHudAtlas!==atlas||lastHudEvent!==atlas.eventNumber)){summaryCache=atlas.summary();lastHudEvent=atlas.eventNumber;lastHudAtlas=atlas;}
 movePicker();const s=summaryCache,p=world.sample(selected.x,selected.z),g=world.evaluate(selected.x,selected.z),inspection=atlas.inspect(selected.x,selected.z),ground=inspection.surface;
 audio.update(p,atlas.region);
 document.getElementById('day').textContent=`Epoch ${s.epoch+1} · Day ${s.age} · ${s.sky}`;
 document.getElementById('region').textContent=atlas.region.name;
 const perception=perceiveAt(atlas,selected.x,selected.z);
 document.getElementById('summary').innerHTML=`<b>${(100*s.canopy).toFixed(1)}%</b> canopy · <b>${(100*s.orchardMoisture).toFixed(0)}%</b> orchard moisture · <b>${s.water}</b> water volume`;
 hud.innerHTML=`<div class="hudhead">Survey point <small>${selected.x.toFixed(1)}, ${selected.z.toFixed(1)}</small></div><div class="metrics">
 <span>Moisture <b>${Math.round(p.moisture*100)}%</b></span><span>Growth <b>${Math.round(p.biomass*100)}%</b></span>
 <span>Aether <b>${Math.round(p.aether*100)}%</b></span><span>Resonance <b>${Math.round(p.resonance*100)}%</b></span>
 <span>Cover <b>${Math.round(g.cover*100)}%</b></span><span>Fire shield <b>${Math.round(g.shielding.fire*100)}%</b></span>
 <span>Encounter rate <b>${Math.round(g.encounterChance*100)}%</b></span><span>Harvest <b>${Math.round(g.harvest*100)}%</b></span>
 <span>Surface traction <b>${Math.round(ground.traction*100)}%</b></span><span>Step noise <b>${Math.round(ground.noise*100)}%</b></span><span>Hearing alert <b>${Math.round(perception.hearing.alertDelta*100)}%</b></span><span>Wildlife <b>${inspection.habitats[0].population.toFixed(1)}</b></span><span>Wildlife alarm <b>${Math.round(inspection.habitats[0].alert*100)}%</b></span><span>Ground shield <b>${Math.round(ground.groundShield*100)}%</b></span><span>Plant vigor <b>${Math.round(ground.vegetation.vigor*100)}%</b></span><span>Trade price <b>${inspection.price} crowns</b></span><span>Hunger <b>${(s.economy.hunger*100).toFixed(0)}%</b></span>
 </div><div class="world-effect"><b>Habitat:</b> ${inspection.habitats[0].name} · ${Math.round(100*inspection.habitats[0].abundance)}% suitability · ${inspection.habitats[0].population.toFixed(1)} residents
 <p><b>Material:</b> ${ground.materialName} — ${ground.clue} · tracks ${Math.round(ground.tracePersistence*100)}% · charge ${Math.round(ground.charge*100)}%</p><p><b>Music and memory:</b> ${inspection.narrative.text}</p><p>${inspection.narrative.secret}</p>
 <p><b>Community:</b> ${inspection.npcs[0].name} · ${inspection.npcs[0].activity}</p>
 ${g.traversalPassable?'Navigable location':'Crossing obstructed — repair or reroute'}.</div>`;
 document.getElementById('timber').textContent=s.supplies.timber;
 document.getElementById('stone').textContent=s.supplies.stone;
 document.getElementById('inventory').textContent=Object.entries(s.inventory).filter(([_,n])=>n>0).map(([k,v])=>`${v} ${k}`).join(' · ');
 document.getElementById('sluice').textContent=s.sluiceOpen?'Close sluice':'Open sluice';document.getElementById('rain').textContent=s.sky==='rain'?'Clear skies':'Begin rainfall';
 document.getElementById('region-select').value=s.region;for(const o of document.getElementById('region-select').options){o.disabled=!atlas.canEnter(o.value);}
 document.getElementById('epoch-display').textContent=`Epoch ${s.epoch+1} · ${s.quests}/10 completed · reputation ${s.reputation}`;
 document.getElementById('lore-display').textContent=atlas.region.story;
 const q=document.getElementById('quest-select'),selectedQuest=q.value;
 q.replaceChildren();for(const quest of s.possibleQuests){const opt=document.createElement('option');opt.value=quest.id;opt.textContent=quest.name+(quest.requires.some(n=>!atlas.completed.includes(n))?' (locked)':'');opt.disabled=quest.requires.some(n=>!atlas.completed.includes(n));q.append(opt);}
 if([...q.options].some(o=>o.value===selectedQuest))q.value=selectedQuest;
 const residentSelect=document.getElementById('resident-select');const previousResident=selectedResidentId||residentSelect.value;
 const playerPosition=atlas.characters[0].position;
 const residents=atlas.residents().sort((a,b)=>Math.hypot(a.x-playerPosition.x,a.z-playerPosition.z)-Math.hypot(b.x-playerPosition.x,b.z-playerPosition.z));
 residentSelect.replaceChildren();for(const resident of residents){const option=document.createElement('option');option.value=resident.id;option.textContent=`${resident.name} · ${Math.hypot(resident.x-playerPosition.x,resident.z-playerPosition.z).toFixed(1)} m · ${resident.behavior}`;residentSelect.append(option);}
 if(residents.some(r=>r.id===previousResident))residentSelect.value=previousResident;
 selectedResidentId=residentSelect.value||null;
 document.getElementById('resident-status').textContent=selectedResidentId?`Selected ${residents.find(r=>r.id===selectedResidentId)?.name}. Approach within 3.1 m to engage or 7 m to study. Field coordinates and visible creature share one ID.`:'No visible creature in this region at present.';
 const candidates=inspection.habitats,monster=document.getElementById('monster-select'),before=monster.value;
 monster.replaceChildren();for(const h of candidates){const opt=document.createElement('option');opt.value=h.id;opt.textContent=`${h.name} · Lv ${h.level}`;monster.append(opt);}if([...monster.options].some(o=>o.value===before))monster.value=before;
 const craft=document.getElementById('recipe-select'),beforeCraft=craft.value;
 if(!craft.options.length){for(const rec of RECIPES){const opt=document.createElement('option');opt.value=rec.id;opt.textContent=rec.name;craft.append(opt);}}
 if(beforeCraft)craft.value=beforeCraft;
 const market=document.getElementById('market');market.textContent=`${atlas.region.people} · your wallet ${s.crowns} crowns · town wealth ${s.economy.wealth} · land condition ${Math.round(100*s.economy.condition)}% · ${atlas.region.resource} price ${inspection.price}`;
 const npc=document.getElementById('npc-select'),prevNpc=npc.value;const available=inspection.npcs;npc.replaceChildren();for(const v of available){const o=document.createElement('option');o.value=v.id;o.textContent=v.name+' · '+v.role;npc.append(o);}if([...npc.options].some(o=>o.value===prevNpc))npc.value=prevNpc;
 document.getElementById('ecology-count').textContent=`Wildlife: ${atlas.residents().length} spatially encounterable residents · ${s.wildlife.length} local species cohorts · ${s.wildlife.reduce((n,c)=>n+c.count,0).toFixed(1)} resident units · ${atlas.fieldGuide.length} field observations`;
 document.getElementById('party-status').textContent=s.characters.map(c=>`${c.name}: ${c.hp}/${c.maxHp} HP`).join(' · ');
 document.getElementById('encounter-status').textContent=s.activeEncounter?`Engaged: ${s.activeEncounter.species} · HP ${s.activeEncounter.hp}/${s.activeEncounter.maxHp} · round ${s.activeEncounter.round}`:'No active encounter';
 const tradeSelect=document.getElementById('material-select'),tradePrevious=tradeSelect.value;if(!tradeSelect.options.length){for(const m of Object.keys(atlas.economies[s.region].stock)){const opt=document.createElement('option');opt.value=m;opt.textContent=m;tradeSelect.append(opt);}}tradeSelect.value=tradePrevious||atlas.region.resource;
}
function changeRegion(id){const r=atlas.travel(id);if(!r.ok){announce(r.reason);return;}
 world=atlas.world;
 acoustic.ambience(atlas).catch(error=>console.warn('Ambience unavailable:',error));
 const pos=terra.attributes.position;for(let i=0;i<N*N;i++)pos.array[i*3+1]=world.h[i];pos.needsUpdate=true;terra.computeVertexNormals();
 selected={x:-16,z:-10};refresh();save();announce(`Travelled to ${atlas.region.name}. A day passed everywhere in the atlas.`);
}
function announce(message){note.textContent=message;note.classList.add('visible');}
function apply(event,success){try{
 const map={sluice:event.open?'QUEST_SLUICE_OPENED':'QUEST_SLUICE_CLOSED',bridge:'BRIDGE_REPAIRED',hydrophone:'HYDROPHONE_PLAYED',ignite:'ENVIRONMENT_IGNITED',plant:'SEED_PLANTED',harvest:'RESOURCE_HARVESTED',cast:'ELEMENTAL_SKILL_CAST',rain:'WORLD_WEATHER_CHANGED',advance:'DAYS_PASSED'};
 const kind=map[event.type];const command={...event,kind};if(kind==='WORLD_WEATHER_CHANGED')command.weather=event.mode;
 const r=atlas.dispatch(command);if(!r.ok)return announce(r.reason);world=atlas.world;refresh();save();announce(success+(r.attack?` Damage ${r.attack.damage}`:''));acoustic.acceptedEvent(atlas,event);if(event.type==='hydrophone')showPulse();
 }catch(e){announce(e.message);}}
for(const r of REGIONS){const o=document.createElement('option');o.value=r.id;o.textContent=r.name;document.getElementById('region-select').append(o);}
document.getElementById('region-select').addEventListener('change',e=>changeRegion(e.target.value));
document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',async()=>{switch(el.dataset.action){
case 'sluice':apply({type:'sluice',open:!world.sluiceOpen},'The orchard water table and floodplain will respond over time.');break;
case 'bridge':apply({type:'bridge'},'The river crossing has a durable physical route.');break;
case 'hydrophone':apply({type:'hydrophone',...selected,phase:Number(document.getElementById('phase').value)/100,intensity:1},'The Hydrophone rephased water, rock, memory and Aether defenses.');break;
case 'ignite':apply({type:'ignite',...selected},'Fire damaged biomass, cover and harvest prospects.');break;
case 'plant':apply({type:'plant',...selected},'Growth changed and will spread through the economic simulation.');break;
case 'harvest':apply({type:'harvest',...selected},'Extracted local materials, changing resource growth.');break;
case 'fire-skill':apply({type:'cast',element:'fire',power:2,...selected},'Fire spell altered the underlying cell and nearby future conditions.');break;
case 'water-skill':apply({type:'cast',element:'water',power:2,...selected},'Water spell changed combat defenses and future moisture.');break;
case 'earth-skill':apply({type:'cast',element:'earth',power:2,...selected},'Earth spell hardened material composition.');break;
case 'aether-skill':apply({type:'cast',element:'aether',power:2,...selected},'Aether spell changed coherent local resonance.');break;
case 'advance':apply({type:'advance',days:7},'Seven days of growth, economy, weather and migration simulated.');break;
case 'rain':apply({type:'rain',mode:world.sky==='rain'?'clear':'rain'},'Weather changed; rainfall enters the next ecological time steps.');break;
case 'quality':{qualityMode=qualityMode==='battery'?'balanced':'battery';foliageTier=qualityMode==='battery'?'low':'medium';foliageGovernor.setQuality(foliageTier);foliageGovernor.setEnabled(qualityMode!=='battery');renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,qualityMode==='battery'?1:maxRatio));renderer.shadowMap.enabled=qualityMode==='balanced';sun.shadow.mapSize.set(qualityMode==='battery'?1024:2048,qualityMode==='battery'?1024:2048);sun.shadow.map?.dispose();renderer.setSize(root.clientWidth,root.clientHeight);faunaWorld=null;refresh();document.getElementById('quality').textContent=qualityMode==='battery'?'Visual quality: battery':'Visual quality: balanced';announce(`Visual quality is ${qualityMode}; no game simulation values have changed.`);break;}
case 'sound':{try{if(audio.on){await audio.mute();acoustic.mute();document.querySelector('[data-action="score-v6"]').textContent='Adaptive music: off';announce('World audio muted.');}else{const results=await Promise.allSettled([audio.resume(),acoustic.start(atlas)]);if(results.every(r=>r.status==='rejected'))throw Error(results.map(r=>r.reason?.message).join('; '));audio.update(world.sample(selected.x,selected.z),atlas.region);announce(results[1].status==='fulfilled'?'Hydrophone harmonics and the 132-sound local environmental bank are active.':'Hydrophone synthesizer enabled; optional recorded soundpack unavailable.');}document.getElementById('sound').textContent=audio.on?'Mute world audio':'Enable world audio';}catch(e){announce(e.message);}break;}
case 'score-v6':{try{const r=await acoustic.toggleScore(atlas);if(!r.ok)return announce(r.reason);el.textContent=r.enabled?'Adaptive music: on':'Adaptive music: off';audio.setBedLevel(r.enabled?.04:.13);announce(r.enabled?'Adaptive score now follows danger, discovery, region and story state.':'Adaptive score disabled.');}catch(err){announce('Score could not start: '+err.message);}break;}
case 'scan-v6':{const r=surveyV6.scan(selected);save();announce(r.heard?.length?`${r.heard.length} authored echo(s). Bearing ${Math.round(r.heard[0].bearing*180/Math.PI)}°. Move to another point and scan again to triangulate.`:'No valid authored echo at this position. Accepted Hydrophone events create the sources.');break;}
case 'resolve-v6':{const r=surveyV6.scan(selected);const source=r.heard?.[0]?.sourceId;const result=source?surveyV6.resolve(source):{resolved:false,reason:'no_source'};acoustic.updateScore(atlas);save();announce(result.resolved?`Survey resolved at (${result.position.x.toFixed(1)},${result.position.z.toFixed(1)}). No inventory or quest flags granted.`:`Not resolved: ${result.reason||'two positions are required'}.`);break;}
case 'listen':{const r=acoustic.listen(atlas,{...selected});save();announce(r.found?`${r.description} Bearing ${r.bearingDegrees}°. Only real Hydrophone events create discoverable sources.`:'No known Hydrophone signal here. Play a Hydrophone, explore, then listen again.');break;}
case 'reset':if(confirm('Reset the entire atlas and its history?')){atlas=new AtlasWorld(2301);world=atlas.world;surveyV6=new AtlasSurveyV6(atlas);const a=terra.attributes.position;for(let i=0;i<N*N;i++)a.array[i*3+1]=world.h[i];a.needsUpdate=true;terra.computeVertexNormals();refresh();save();announce('A new world was created.');}break;
case 'export':{const blob=new Blob([JSON.stringify(atlas.snapshot())],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='aa-living-world-atlas-v3.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);announce('Atlas state and world history exported.');}break;
case 'quest':{const id=document.getElementById('quest-select').value;const r=atlas.resolveQuest(id,selected.x,selected.z);if(!r.ok)return announce(r.reason);refresh();save();announce(r.consequence);break;}
case 'encounter':{const r=atlas.beginEncounter(selected.x,selected.z);if(!r.ok)return announce(r.reason);if(r.triggered)document.getElementById('monster-select').value=r.creature;refresh(false);save();announce(r.triggered?`Wild ${r.name} (level ${r.level}) arrived! ${r.behavior} · use Battle to engage.`:`No encounter this step · roll ${r.roll} vs threshold ${r.chance}. Explore again to roll another step.`);break;}
case 'battle':{const id=atlas.activeEncounter?.species||document.getElementById('monster-select').value,element=document.getElementById('element-select').value;const battlePoint=atlas.activeEncounter?.residentId?atlas.characters[0].position:selected;const r=atlas.fight(battlePoint.x,battlePoint.z,id,element,3);if(!r.ok)return announce(r.reason);acoustic.acceptedBattle(atlas,element,battlePoint.x,battlePoint.z);refresh();save();announce(`${r.species}: ${r.damage} dealt, ${r.incoming} received. Monster ${r.remainingHp}/${r.maxHp} HP · party ${r.hp} HP. ${r.victorious?'Victory! '+r.loot.amount+' '+r.loot.material+' gathered.':'The battle continues. Cast again or retreat.'}`);break;}
case 'talk':{const r=atlas.talk(document.getElementById('npc-select').value,selected.x,selected.z);if(!r.ok)return announce(r.reason);save();announce(`${r.name}: ${r.dialogue}`);break;}
case 'track-v7':{const id=document.getElementById('monster-select').value;const r=atlas.trackSpecies(id,selected.x,selected.z);if(!r.ok)return announce(r.reason);refresh(false);save();announce(`Tracked ${r.name} (${Math.round(r.confidence*100)}% evidence): ${r.behavior} · local ${r.material} · resident cohort ${r.population}. Field knowledge now influences your defenses.`);break;}
case 'study-resident':{const id=document.getElementById('resident-select').value;const r=atlas.inspectResident(id);if(!r.ok)return announce(r.reason);refresh(false);save();announce(`Observed ${r.name}: ${Math.round(r.confidence*100)}% confidence. Distance ${r.distance} m; evidence saved.`);break;}
case 'approach-resident':{const id=document.getElementById('resident-select').value;const r=atlas.approachResident(id,6);for(const p of r.steps||[]){surfaceGrass?.step(p.x,p.z,.65);acoustic.acceptedStep(atlas,p.x,p.z,{speed:1,mass:.65});}refresh();save();announce(r.ok?`${r.steps.length} actual steps toward resident. ${r.near?'Creature in engagement range.':'Approach again to close distance.'}`:`Approach stopped: ${r.reason}`);break;}
case 'engage-resident':{const id=document.getElementById('resident-select').value;const r=atlas.engageResident(id);if(!r.ok)return announce(r.reason);selected={x:atlas.characters[0].position.x,z:atlas.characters[0].position.z};refresh(false);save();announce(`Engaged ${r.name} from ${r.distance} m. Fight, retreat, or use environmental skills.`);break;}
case 'retreat':{const r=atlas.abandonEncounter();if(!r.ok)return announce(r.reason);refresh(false);save();announce(r.reason);break;}
case 'walk':{const r=atlas.pathfind(atlas.characters[0].position,selected);if(!r.ok){announce('Route blocked: '+r.reason);break;}
  let moved=0,stopped='';for(const pt of r.steps.slice(1,7)){
   const step=atlas.dispatch({kind:'FOOTFALL_CONFIRMED',x:pt.x,z:pt.z,actor:'iona',speed:1});if(!step.ok){stopped=step.reason;break;}
   moved++;surfaceGrass?.step(pt.x,pt.z,.65);acoustic.acceptedStep(atlas,pt.x,pt.z,{speed:1,mass:.65});
   if(moved%3===0){const encounter=atlas.beginEncounter(pt.x,pt.z);if(encounter.triggered){stopped=`${encounter.name} interrupts the journey!`;break;}}
  }refresh();save();announce(`${moved} lawful steps moved. ${stopped||'Footprints, noise, and plant disturbance persisted.'}`);break;}
case 'repair-floor':{const r=atlas.dispatch({kind:'SURFACE_REPAIR_CONFIRMED',...selected,material:'clay'});if(!r.ok){announce(r.reason);break;}refresh();save();announce('Clay repairs the fractured surface. Material consumed.');break;}
case 'rest':{const r=atlas.rest();if(!r.ok)return announce(r.reason);refresh();save();announce(`Rested one day and recovered ${r.heal} HP.`);break;}
case 'buy':{const r=atlas.buy(document.getElementById('material-select').value,1);if(!r.ok)return announce(r.reason);refresh();save();announce(`Bought one unit for ${r.cost} crowns.`);break;}
case 'sell':{const r=atlas.sell(document.getElementById('material-select').value,1);if(!r.ok)return announce(r.reason);refresh();save();announce(`Sold one unit for ${r.payment} crowns.`);break;}
case 'craft':{const r=atlas.craft(document.getElementById('recipe-select').value);if(!r.ok)return announce(r.reason);refresh();save();announce(`Created ${r.item.recipe}. Its regional material origin is preserved in the save.`);break;}
case 'trade':{const next=atlas.region.neighbors[0],material=atlas.region.resource;const r=atlas.trade(atlas.activeRegion,next,material,1);if(!r.ok)return announce(r.reason);refresh();save();announce(`One ${material} sent to ${REGION_BY_ID[next].name} for ${r.price} crowns.`);break;}
case 'route':{const r=atlas.pathfind(selected,{x:16,z:14});const dst=r.ok?`${r.steps.length} walkable cells; travel cost ${r.cost}`:r.reason;announce(dst);break;}
case 'ngplus':if(confirm('Begin a new historical cycle? The world resets, but its ecological and Hydrophone imprints remain.')){const r=atlas.newGamePlus();surveyV6=new AtlasSurveyV6(atlas);world=atlas.world;const a=terra.attributes.position;for(let i=0;i<N*N;i++)a.array[i*3+1]=world.h[i];a.needsUpdate=true;terra.computeVertexNormals();refresh();save();announce(`Epoch ${r.epoch+1} begins. Inherited grove ${r.imprint.groves}, scars ${r.imprint.scars} and harmonic ${r.imprint.harmonic}.`);}break;
case 'import':document.getElementById('import-file').click();break;
}}));
document.getElementById('import-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const state=await importSave(file,d=>AtlasWorld.restore(d));atlas=AtlasWorld.restore(state);world=atlas.world;surveyV6=new AtlasSurveyV6(atlas);acoustic.restore(atlas);const a=terra.attributes.position;for(let i=0;i<N*N;i++)a.array[i*3+1]=world.h[i];a.needsUpdate=true;terra.computeVertexNormals();refresh();announce('Full atlas save imported and restored.');}catch(err){announce('Import rejected: '+err.message);}finally{e.target.value='';}});
document.querySelectorAll('[data-panel]').forEach(el=>el.addEventListener('click',()=>{const panel=el.dataset.panel;document.querySelectorAll('[data-panel]').forEach(b=>{b.classList.toggle('active',b===el);b.setAttribute('aria-selected',String(b===el));});document.querySelectorAll('[data-panel-content]').forEach(p=>p.hidden=p.dataset.panelContent!==panel);}));
document.querySelectorAll('[data-mode]').forEach(el=>el.addEventListener('click',()=>{mode=el.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x.dataset.mode===mode));paintTerrain();}));
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let pStart=null;
renderer.domElement.addEventListener('pointerdown',e=>{pStart={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',e=>{if(!pStart||Math.hypot(e.clientX-pStart.x,e.clientY-pStart.y)>9)return;const rect=renderer.domElement.getBoundingClientRect();pointer.x=(e.clientX-rect.left)/rect.width*2-1;pointer.y=-(e.clientY-rect.top)/rect.height*2+1;ray.setFromCamera(pointer,camera);const creatureHits=ray.intersectObjects(faunaGroup.children,true);const picked=creatureHits.find(hit=>hit.object.visible&&hit.object.parent?.visible&&hit.object.parent?.parent?.visible);if(picked){let node=picked.object;while(node&&!node.userData?.residentId)node=node.parent;if(node?.userData?.residentId&&atlas.resident(node.userData.residentId)){selectedResidentId=node.userData.residentId;document.querySelector('[data-panel="explore"]').click();refresh(false);announce('Creature selected in the world. Approach, study or engage at its actual location.');return;}}const hits=ray.intersectObject(terrain,false);if(hits.length){selected={x:THREE.MathUtils.clamp(hits[0].point.x,-32,32),z:THREE.MathUtils.clamp(hits[0].point.z,-32,32)};refresh(false);}});
function resize(){const w=root.clientWidth,h=root.clientHeight;const aspect=w/h,view=48;camera.left=-view*aspect;camera.right=view*aspect;camera.top=view;camera.bottom=-view;camera.updateProjectionMatrix();renderer.setSize(w,h);}window.addEventListener('resize',resize);resize();
let lastTime=0,frameSample=0,frameCount=0;function render(t){const dt=Math.min(.05,(t-lastTime)/1000||.016);lastTime=t;orbit.update();
 const rp=riverGeo.attributes.position;const arr=rp.array;for(let k=0;k<129;k++){const y=-.31+Math.sin(t*.0018+k*.29)*.027;arr[k*6+1]=y;arr[k*6+4]=y;}rp.needsUpdate=true;
 if(rainDrops.visible){const a=rainGeometry.attributes.position.array;for(let i=0;i<rainCount;i++){a[i*3+1]-=dt*(9+rnd(i,9)*9);if(a[i*3+1]<-2)a[i*3+1]=20;}rainGeometry.attributes.position.needsUpdate=true;}
 if(pulseAge>=0){pulseAge+=dt;pulse.scale.setScalar(1+pulseAge*7);pulseMaterial.opacity=Math.max(0,.85-pulseAge*.6);if(pulseAge>1.5)pulseAge=-1;}
 picker.rotation.z+=dt*.26;surfaceGrass?.update(dt,selected);fauna?.update(t);citizens?.update(t);
 const nextTier=foliageGovernor.observe(dt);if(nextTier&&nextTier!==foliageTier){foliageTier=nextTier;rebuildLivingGrass();}
 renderer.render(scene,camera);frameCount++;if(t-frameSample>1600){const fps=Math.round(frameCount*1000/(t-frameSample));document.getElementById('perf-counter').textContent=`${fps} FPS · ${qualityMode} · foliage ${foliageTier}`;frameSample=t;frameCount=0;}}
refresh();renderer.setAnimationLoop(render);
window.aaWorld=Object.freeze({getSnapshot:()=>atlas.snapshot(),getGameplayAt:(x,z)=>atlas.inspect(x,z),previewAttack:(x,z,element,power)=>world.resolveAttack(x,z,element,power),ingest:(event)=>{const r=atlas.dispatch(event);if(r.ok){world=atlas.world;refresh();save();}return r;},getRegion:()=>atlas.region.id,travel:changeRegion,pathfind:(a,b)=>atlas.pathfind(a,b),getQuests:()=>atlas.summary().possibleQuests,getEconomy:()=>atlas.economies[atlas.activeRegion],getPerceptionAt:(x,z)=>perceiveAt(atlas,x,z),getAtlas:()=>atlas.listRegions(),getWildlife:()=>atlas.wildlife.summary(atlas.activeRegion),getFieldGuide:()=>structuredClone(atlas.fieldGuide)});
