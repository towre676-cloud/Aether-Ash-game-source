import test from 'node:test';
import assert from 'node:assert/strict';
import {createGrassField,normalizedView,visibleFromView,terrainSlope} from './grass-renderer.mjs';
import {createAAGameVegetationBridge} from './aa-game-integration.mjs';

class V2{constructor(x=0,y=0){this.set(x,y)}set(x,y){this.x=x;this.y=y;return this}normalize(){const d=Math.hypot(this.x,this.y)||1;this.x/=d;this.y/=d;return this}}
class V4{constructor(x=0,y=0,z=0,w=0){this.set(x,y,z,w)}set(x,y,z,w){this.x=x;this.y=y;this.z=z;this.w=w;return this}}
class Color{constructor(c){this.value=c}clone(){return new Color(this.value)}multiplyScalar(){return this}lerp(){return this}set(c){this.value=c;return this}}
class Geometry{constructor(){this.attributes={}}setAttribute(k,a){this.attributes[k]=a}getAttribute(k){return this.attributes[k]}setIndex(){}computeBoundingSphere(){}dispose(){this.disposed=true}}
class Attribute{constructor(array,itemSize){this.array=array;this.itemSize=itemSize}}
class Material{constructor(options){Object.assign(this,options)}dispose(){this.disposed=true}}
class Object3D{constructor(){this.position={set(){}},this.rotation={set(){}},this.scale={set(){}},this.matrix={}}updateMatrix(){}}
class Mesh{constructor(geometry,material,count){this.geometry=geometry;this.material=material;this.instanceMatrix={count,setUsage(){}};this.count=0}setMatrixAt(){}setColorAt(){this.instanceColor={}}}
const THREE={Vector2:V2,Vector4:V4,Color,BufferGeometry:Geometry,Float32BufferAttribute:Attribute,InstancedBufferAttribute:Attribute,ShaderMaterial:Material,Object3D,InstancedMesh:Mesh,DoubleSide:2,DynamicDrawUsage:35048};
const makeScene=()=>({nodes:new Set(),add(m){this.nodes.add(m)},remove(m){this.nodes.delete(m)}});
const groundOptions={regionAt:()=>({biome:'orchard'}),materialAt:()=>({tags:['loam'],organic:.92,moisture:.38}),normalAt:()=>({x:-.3,y:1,z:.1})};

test('v6 view mask is conservative, spatial, and explicitly opt-in',()=>{
 assert.equal(visibleFromView(null,-400,-400),true);
 assert.throws(()=>normalizedView({x:0,z:0,forwardX:0,forwardZ:0}),/nonzero/);
 const v=normalizedView({x:0,z:0,forwardX:1,forwardZ:0,nearRadius:9,halfAngleDegrees:65});
 assert.equal(visibleFromView(v,-3,0),true);
 assert.equal(visibleFromView(v,-40,0),false);
 assert.equal(visibleFromView(v,40,0),true);
 assert.equal(visibleFromView(v,40,40),true);
 assert.equal(visibleFromView(v,0,40),false);
});

test('v6 terrain slope uses host normals, clamps steep slopes and fails safely',()=>{
 assert.deepEqual(terrainSlope(null),[0,0]);
 assert.deepEqual(terrainSlope({x:-.3,y:1,z:.1}),[.3,-.1]);
 assert.deepEqual(terrainSlope({x:1,y:.01,z:0}),[0,0]);
 assert.deepEqual(terrainSlope({x:Number.NaN,y:1,z:0}),[0,0]);
});

test('v6 camera selects fewer visible instances without changing deterministic world or gameplay',()=>{
 const aScene=makeScene(),bScene=makeScene();
 const a=createGrassField(THREE,aScene,{quality:'low',maxPlants:4000,seed:12,biome:'orchard'});
 const b=createGrassField(THREE,bScene,{quality:'low',maxPlants:4000,seed:12,biome:'orchard',cameraView:{x:0,z:0,forwardX:1,forwardZ:0,nearRadius:10,halfAngleDegrees:65}});
 const aStats=a.getStats(),bStats=b.getStats();
 assert.ok(aStats.plants>bStats.plants,`omni ${aStats.plants} camera ${bStats.plants}`);
 assert.ok(bStats.viewRejected>0);
 assert.equal(b.getGameplay(2,5).concealment,a.getGameplay(2,5).concealment);
 b.setCameraView({x:0,z:0,forwardX:-1,forwardZ:0,nearRadius:10,halfAngleDegrees:65});
 assert.equal(b.getStats().cameraRebuildPending,true);
 b.update(.1,{x:0,z:0});
 assert.ok(b.getStats().buildCount>=2);
 assert.ok(b.getStats().buildMs>=0);
 a.dispose();b.dispose();assert.equal(aScene.nodes.size,0);assert.equal(bScene.nodes.size,0);
});

test('v6 all foliage shares finite shader attributes, including shadows and slope',()=>{
 const sc=makeScene(),f=createGrassField(THREE,sc,{quality:'medium',maxPlants:650,seed:101,biome:'woodland',terrainNormalAt:groundOptions.normalAt});
 let observed=0,shaded=0;
 for(const mesh of sc.nodes){
  const gradient=mesh.geometry.getAttribute('aSlope');const shade=mesh.geometry.getAttribute('aShade');
  assert.ok(gradient&&shade);
  assert.equal(gradient.array.length,mesh.instanceMatrix.count*2);
  assert.equal(shade.array.length,mesh.instanceMatrix.count);
  for(let i=0;i<mesh.count;i++){
   assert.ok(Math.abs(gradient.array[i*2]-.3)<1e-5);
   assert.ok(Math.abs(gradient.array[i*2+1]+.1)<1e-5);
   assert.ok(shade.array[i]>=0 && shade.array[i]<=1);
   if(shade.array[i]>.1)shaded++;
   observed++;
  }
 }
 assert.ok(observed>100);assert.ok(shaded>0);
 f.dispose();
});

test('v6 host camera and terrain normals remain visual-only when gameplay changes and saves restore',()=>{
 const s=makeScene(),b=createAAGameVegetationBridge({THREE,scene:s,renderMode:'gpu',seed:103,quality:'low',maxPlants:250,groundOptions});
 const before=b.sample(3,4);
 b.tick(.016,{x:1,z:1},{cameraView:{x:-5,z:0,forwardX:1,forwardZ:0}});
 assert.deepEqual(b.sample(3,4),before);
 const save=b.snapshot();
 b.applyEvent({type:'footfall',eventId:'v6-step',x:3,z:4,radius:1.2});
 assert.ok(b.sample(3,4).vegetation.flatten>before.vegetation.flatten);
 b.restore(save);assert.deepEqual(b.sample(3,4),before);
 b.dispose();assert.equal(s.nodes.size,0);
});

test('v6 repeated camera rotations coalesce field rebuilds rather than rebuilding every pointer event',()=>{
 const s=makeScene(),f=createGrassField(THREE,s,{seed:717,quality:'low',maxPlants:900,biome:'meadow',cameraView:{x:0,z:0,forwardX:1,forwardZ:0}});
 const initial=f.getStats().buildCount;
 for(let k=0;k<80;k++){
   const a=1.2+k*.01;
   f.setCameraView({x:0,z:0,forwardX:Math.cos(a),forwardZ:Math.sin(a)});
 }
 assert.equal(f.getStats().buildCount,initial,'camera callbacks should only queue a rebuild');
 f.update(.05,{x:0,z:0});
 assert.equal(f.getStats().buildCount,initial+1);
 const count=f.getStats().buildCount;
 for(let k=0;k<80;k++){
   const a=k*.04;
   f.setCameraView({x:0,z:0,forwardX:Math.cos(a),forwardZ:Math.sin(a)});
   f.update(.016,{x:0,z:0});
 }
 assert.ok(f.getStats().buildCount<=count+6,'cooldown must limit field rebuild storms');
 f.dispose();
});

test('v6 production lab is a live Three.js bridge, supplies terrain normals and degrades with clear offline links',async()=>{
 const fs=await import('node:fs');
 const html=fs.readFileSync(new URL('./three-integration-lab.html',import.meta.url),'utf8');
 assert.match(html,/three@0\.180\.0\/build\/three\.module\.js/);
 assert.match(html,/createAAGameVegetationBridge/);
 assert.match(html,/normalAt/);assert.match(html,/obstacleAt:blockedAt/);
 assert.match(html,/renderer\.info\.render\.calls/);
 assert.match(html,/cinematic-grass-offline\.html/);
 assert.doesNotMatch(html,/new THREE\.PlaneGeometry\(110,110,150,150\)[\s\S]*new THREE\.PlaneGeometry\(110,110,150,150\)/);
});
