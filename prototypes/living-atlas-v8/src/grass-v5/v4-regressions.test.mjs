import test from 'node:test';
import assert from 'node:assert/strict';
import {createEcology,BIOMES} from './grass-ecology.mjs';
import {createGroundForgeVegetationBridge} from './ground-forge-compat.mjs';
import {createGrassField} from './grass-renderer.mjs';
import {createAAGameVegetationBridge,AA_VEGETATION_BRIDGE_VERSION} from './aa-game-integration.mjs';

class Vec2{constructor(x=0,y=0){this.set(x,y)}set(x,y){this.x=x;this.y=y;return this}normalize(){return this}}
class Vec4{constructor(){}set(){return this}}
class Color{constructor(c){this.c=c}clone(){return new Color(this.c)}multiplyScalar(){return this}lerp(){return this}set(){return this}}
class Geo{constructor(){this.attributes={}}getAttribute(n){return this.attributes[n]}setAttribute(n,a){this.attributes[n]=a}setIndex(){}computeBoundingSphere(){}dispose(){}}
class Attr{constructor(a,n){this.array=a;this.n=n}}
class Mat{constructor(o){this.uniforms=o.uniforms}dispose(){}}
class Obj{constructor(){this.position={set(){}},this.rotation={set(){}},this.scale={set(){}},this.matrix={}}updateMatrix(){}}
class Mesh{constructor(g,m,c){this.geometry=g;this.instanceMatrix={count:c,setUsage(){}};this.count=0}setMatrixAt(){}setColorAt(){this.instanceColor={}}dispose(){}}
const THREE={Vector2:Vec2,Vector4:Vec4,Color,BufferGeometry:Geo,Float32BufferAttribute:Attr,InstancedBufferAttribute:Attr,ShaderMaterial:Mat,Object3D:Obj,InstancedMesh:Mesh,DynamicDrawUsage:35048,DoubleSide:2};
const scene=()=>({objects:new Set(),add(x){this.objects.add(x)},remove(x){this.objects.delete(x)}});
const bridge=()=>createAAGameVegetationBridge({renderMode:'none',seed:12,groundOptions:{materialAt:()=>({tags:['soil'],organic:1,moisture:.2}),regionAt:()=>({biome:'orchard'})}});

test('weighted selection uses adjusted weights, not stale unadjusted fractions',()=>{
 const e=createEcology({biome:'marsh',moistureAt:()=>1});
 const s=e.sample(3,6),species=BIOMES.marsh.species;
 const weighted=species.map(([n,w])=>[n,w*(['reed','sedge','rush'].includes(n)?1.55:1)]);
 const total=weighted.reduce((a,b)=>a+b[1],0);let acc=0;
 for(let i=0;i<weighted.length;i++){
   const [name,w]=weighted[i];
   const r=(acc+w*.5)/total;
   assert.equal(e.chooseSpecies(3,6,s,r),name,`probability interval of ${name}`);
   acc+=w;
 }
});

test('ecotone blends are continuous and still deterministic and renderer-independent',()=>{
 const e=createEcology({biomeAt:()=> 'orchard',biomeMixAt:(x)=>({orchard:1-x,marsh:x}),
   moistureAt:()=>.6,seed:52});
 const a=e.sample(0,3),m=e.sample(.5,3),b=e.sample(1,3);
 assert.equal(a.biomeMix.marsh,undefined);assert.equal(m.biomeMix.marsh,.5);assert.equal(b.biomeMix.orchard,undefined);
 assert.ok(m.density>0);assert.ok(m.density<1.5);
 const probe=e.chooseSpecies(.5,3,m,.9);
 assert.ok(BIOMES.orchard.species.some(x=>x[0]===probe)||BIOMES.marsh.species.some(x=>x[0]===probe));
 assert.deepEqual(m,e.sample(.5,3));
});

test('ground bridge passes through genuine region blend facts, never inventing biome IDs',()=>{
 const g=createGroundForgeVegetationBridge({regionAt:()=>({biome:'woodland',biomeMix:{woodland:.8,moor:.2}})});
 const e=createEcology({...g.ecologyOptions});
 assert.equal(e.sample(2,3).biomeMix.woodland,.8);
 assert.equal(e.sample(2,3).biomeMix.moor,.2);
});

test('densely capped renderer samples around player in all four quadrants',()=>{
 const s=scene();const field=createGrassField(THREE,s,{biome:'orchard',quality:'high',maxPlants:220,seed:71});
 const st=field.getStats();
 assert.ok(st.plants>100,JSON.stringify(st));
 assert.equal(st.quadrants.length,4);
 assert.ok(st.quadrants.every(n=>n>15),JSON.stringify(st.quadrants));
 assert.equal(st.quadrants.reduce((a,b)=>a+b,0),st.plants);
 const expected=field.build(0,0).quadrants;
 assert.deepEqual(expected,st.quadrants);
 field.dispose();assert.equal(s.objects.size,0);
});

test('distant sparse regions never consume close-grass budget preferentially',()=>{
 const s=scene();const f=createGrassField(THREE,s,{quality:'medium',maxPlants:75,seed:11,biome:'meadow'});
 const q=f.getStats().quadrants;
 assert.ok(q.every(n=>n>5),JSON.stringify(q));f.dispose();
});

test('v4 harvest reward receipts remain durable past the short generic event journal',()=>{
 const b=bridge();const harvested=b.applyEvent({type:'harvest',eventId:'unique-harvest',x:2,z:2});
 assert.ok(harvested.changed>0);
 for(let i=0;i<790;i++)b.applyEvent({type:'footfall',eventId:'travel-'+i,x:3,z:3,radius:.1,mass:.03});
 assert.ok(!b.snapshot().recentEventIds.includes('unique-harvest'));
 assert.ok(b.snapshot().rewardEventIds.includes('unique-harvest'));
 const save=b.snapshot();b.dispose();
 const reload=createAAGameVegetationBridge({renderMode:'none',seed:12,initialSave:save,
   groundOptions:{materialAt:()=>({tags:['soil'],organic:1}),regionAt:()=>({biome:'orchard'})}});
 const duplicate=reload.applyEvent({type:'harvest',eventId:'unique-harvest',x:2,z:2});
 assert.equal(duplicate.duplicate,true);assert.equal(duplicate.quantity,0);
 assert.equal(reload.getStats().permanentRewardReceipts,1);reload.dispose();
});

test('v4 save validation is atomic, v3 and bare v2 remain importable',()=>{
 const b=bridge();b.applyEvent({type:'harvest',eventId:'harvest-1',x:3,z:4});
 const save=b.snapshot();assert.equal(save.bridgeVersion,AA_VEGETATION_BRIDGE_VERSION);
 for(const bad of [[...save.rewardEventIds,'harvest-1'],[...save.rewardEventIds,2]]){
   assert.throws(()=>b.restore({...save,rewardEventIds:bad}),/persistent reward receipts/);
   assert.deepEqual(b.snapshot(),save);
 }
 const old={...save,bridgeVersion:3};delete old.rewardEventIds;
 assert.equal(b.restore(old),true);assert.equal(b.snapshot().rewardEventIds.length,0);
 assert.equal(b.restore(save.vegetation),true);
 b.dispose();
});

test('permanent receipt data is isolated by NG+ timeline',()=>{
 const b=bridge();b.applyEvent({type:'harvest',eventId:'same',x:1,z:4});
 b.switchTimeline({timelineId:'ng+',seed:13});
 assert.equal(b.getStats().permanentRewardReceipts,0);
 b.applyEvent({type:'harvest',eventId:'same',x:1,z:4});
 assert.equal(b.getStats().permanentRewardReceipts,1);
 b.switchTimeline({timelineId:'main',seed:12});
 assert.equal(b.applyEvent({type:'harvest',eventId:'same',x:1,z:4}).duplicate,true);
 b.dispose();
});

test('host terrain change invalidates source sample without altering ecology save or rewards',()=>{
 let season='summer',weather=0;
 const b=createAAGameVegetationBridge({renderMode:'none',seed:44,groundOptions:{
   materialAt:()=>({tags:['soil'],organic:1}),regionAt:()=>({biome:'orchard'}),
   seasonAt:()=>season,weatherAt:()=>({rain:weather})}});
 const original=b.sample(3,4);const save=b.snapshot();
 season='winter';weather=1;b.notifyTerrainChanged();const after=b.sample(3,4);
 assert.equal(after.vegetation.season,'winter');assert.ok(after.vegetation.density<original.vegetation.density);
 assert.ok(after.vegetation.moisture>original.vegetation.moisture);
 assert.deepEqual(b.snapshot(),save);b.dispose();
});

test('Canvas winter palette visibly differs from summer and persists under higher contrast',async()=>{
 const {createCanvasGrassFallback}=await import('./canvas-grass-fallback.mjs');
 function strokes(season){let color='',colors=new Set();const fn=()=>{};
   const ctx={save:fn,restore:fn,beginPath:fn,moveTo:fn,quadraticCurveTo:fn,closePath:fn,
     ellipse:fn,stroke:fn,fill:()=>colors.add(color),set fillStyle(v){color=v},get fillStyle(){return color}};
   const f=createCanvasGrassFallback({seed:23,season,biome:'orchard',quality:'low',highContrast:true});
   const stats=f.draw(ctx,{bounds:{minX:-6,maxX:6,minZ:-6,maxZ:6},pixelScale:24});
   assert.ok(stats.plants>10);return [...colors];
 }
 const summer=strokes('summer'),winter=strokes('winter');
 assert.notDeepEqual(summer,winter);
});

test('adaptive vegetation detail steps down conservatively and can recover without gameplay changes',async()=>{
 const {createFoliageQualityGovernor}=await import('./foliage-quality-governor.mjs');
 const g=createFoliageQualityGovernor({quality:'high',minimum:'low',maximum:'high',enabled:true,targetFrameMs:33.3});
 let downgraded=false;
 for(let i=0;i<280;i++){if(g.observe(.050)==='medium')downgraded=true;}
 assert.ok(downgraded,'sustained poor host frames should downgrade foliage');
 assert.equal(g.getStats().quality,'low');
 let upgraded=false;
 for(let i=0;i<3800;i++){if(g.observe(.010)==='high')upgraded=true;}
 assert.ok(upgraded,'sustained excellent frame times should restore foliage');
 assert.equal(g.getStats().quality,'high');
 const b=bridge();const a=b.sample(4,5);b.setVisualSettings({autoQuality:true});
 for(let i=0;i<100;i++)b.tick(.05,{x:4,z:5});
 assert.deepEqual(b.sample(4,5),a);b.dispose();
});
