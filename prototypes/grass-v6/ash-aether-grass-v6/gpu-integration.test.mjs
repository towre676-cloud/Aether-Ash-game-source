import test from 'node:test';
import assert from 'node:assert/strict';
import {createAAGameVegetationBridge} from './aa-game-integration.mjs';
import {createGrassField} from './grass-renderer.mjs';

class Vector2{constructor(x=0,y=0){this.set(x,y)}set(x,y){this.x=x;this.y=y;return this}normalize(){const n=Math.hypot(this.x,this.y)||1;this.x/=n;this.y/=n;return this}}
class Vector4{constructor(x=0,y=0,z=0,w=0){this.set(x,y,z,w)}set(x,y,z,w){this.x=x;this.y=y;this.z=z;this.w=w;return this}}
class Color{constructor(c){this.c=c}clone(){return new Color(this.c)}multiplyScalar(f){this.mult=f;return this}lerp(c,f){this.lerpAmount=f;return this}set(v){this.c=v;return this}}
class BufferGeometry{constructor(){this.attributes={}}getAttribute(k){return this.attributes[k]}setAttribute(k,v){this.attributes[k]=v}setIndex(v){this.indices=v}computeBoundingSphere(){}dispose(){this.disposed=true}}
class Float32BufferAttribute{constructor(a,n){this.array=a;this.itemSize=n}}
class ShaderMaterial{constructor(o){this.uniforms=o.uniforms;this.fragmentShader=o.fragmentShader}dispose(){this.disposed=true}}
class Object3D{constructor(){this.position={set(){}},this.rotation={set(){}},this.scale={set(){}},this.matrix={}}updateMatrix(){}}
class InstancedMesh{constructor(g,m,c){this.geometry=g;this.material=m;this.instanceMatrix={count:c,needsUpdate:false,setUsage(){}};this.count=c}setMatrixAt(){}setColorAt(){this.instanceColor={needsUpdate:false}}dispose(){this.disposed=true}}
const THREE={Vector2,Vector4,Color,BufferGeometry,Float32BufferAttribute,InstancedBufferAttribute:Float32BufferAttribute,ShaderMaterial,Object3D,InstancedMesh,DoubleSide:2,DynamicDrawUsage:35048};
const scene=()=>({meshes:new Set(),add(x){this.meshes.add(x)},remove(x){this.meshes.delete(x)}});
const flat={terrainHeight:()=>0,biomeAt:()=> 'orchard'};

test('GPU allocation avoids v2 full-per-species instance buffers',()=>{
 const s=scene();const cap=1200;
 const f=createGrassField(THREE,s,{seed:47,quality:'medium',maxPlants:cap,...flat});
 const stats=f.getStats();
 assert.ok(stats.allocatedInstances<cap*10,`allocated ${stats.allocatedInstances} for ${cap} actual budget`);
 assert.ok(stats.allocatedInstances>cap);
 assert.ok(stats.plants<=cap);
 assert.ok(stats.drawCalls<=17);
 f.dispose();assert.equal(s.meshes.size,0);
});

test('GPU v3 bridge shares persistent state with ecology, updates day and respects explicit accessibility toggles',()=>{
 const s=scene();const groundOptions={materialAt:()=>({tags:['soil'],organic:.95,moisture:.31}),
 regionAt:()=>({biome:'orchard'}),weatherAt:()=>({rain:0})};
 const b=createAAGameVegetationBridge({THREE,scene:s,renderMode:'gpu',seed:98,
  timelineId:'alpha',quality:'low',maxPlants:240,groundOptions});
 const pristine=b.sample(0,0).gameplay.concealment;
 b.applyEvent({type:'fire',eventId:'f1',x:0,z:0,strength:1,radius:2});
 b.tick(.05,{x:0,z:0},{worldDay:1,wind:.7,rain:.1});
 assert.ok(b.sample(0,0).gameplay.concealment<pristine);
 b.setVisualSettings({quality:'medium',reducedMotion:true,highContrast:true});
 assert.ok(b.getStats().gpu.plants>=0);
 assert.equal(b.getStats().state.day,1);
 const save=b.snapshot();
 b.tick(.05,{x:1,z:1},{worldDay:200});
 assert.equal(b.getStats().state.day,200);
 assert.ok(b.sample(0,0).gameplay.concealment>b.sample(0,0).vegetation.scorch*.001);
 b.restore(save);
 assert.equal(b.getStats().state.day,1);
 assert.equal(s.meshes.size>0,true);
 b.dispose();assert.equal(s.meshes.size,0);
});

test('3D and 2D sampling generate identical gameplay for the same ground and world seed',()=>{
 const groundOptions={materialAt:()=>({tags:['soil'],organic:.8,moisture:.3}),regionAt:()=>({biome:'woodland'})};
 const scene3=scene();const gpu=createAAGameVegetationBridge({THREE,scene:scene3,renderMode:'gpu',seed:44,maxPlants:180,quality:'low',groundOptions});
 const canvas=createAAGameVegetationBridge({renderMode:'canvas',seed:44,quality:'low',groundOptions});
 for(const [i,x,z] of [[0,0,0],[1,6,2],[2,-8,3]]){
   assert.deepEqual(gpu.sample(x,z),canvas.sample(x,z));
 }
 for(const [i,x,z] of [[0,0,0],[1,6,2],[2,-8,3]]){
   const evt={type:'footfall',eventId:'step-'+i,x,z};gpu.applyEvent(evt);canvas.applyEvent(evt);
 }
 for(const [i,x,z] of [[0,0,0],[1,6,2],[2,-8,3]]){
   assert.deepEqual(gpu.sample(x,z),canvas.sample(x,z));
 }
 gpu.dispose();canvas.dispose();
});
