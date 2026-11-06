import test from 'node:test';
import assert from 'node:assert/strict';
import {createEcology,hash2,valueNoise,fractal,SPECIES,BIOMES} from './grass-ecology.mjs';
import {createGrassField} from './grass-renderer.mjs';
const flat={seed:100,terrainHeight:()=>0};

test('world-space noise is deterministic, bounded and non-tiling in sampled regions',()=>{
  assert.equal(hash2(10,-5,100),hash2(10,-5,100));
  assert.notEqual(hash2(10,-5,100),hash2(10+64,-5,100));
  for(let x=-20;x<=20;x+=2){let q=valueNoise(x/3,x/5,100),v=fractal(x,x,100);assert.ok(q>=0&&q<=1);assert.ok(v>=0&&v<=1);}
});
test('all 15 habitats have real, defined botanical diversity',()=>{
  for(const [biome,details] of Object.entries(BIOMES)){
    assert.ok(details.species.length>=3,biome);
    for(const [plant] of details.species)assert.ok(SPECIES[plant]);
  }
});
test('soil, world sample, and species are stable across reloads',()=>{
  const a=createEcology({...flat,biome:'meadow'}),b=createEcology({...flat,biome:'meadow'});
  for(let i=0;i<300;i++){
    const x=i*.71-70,z=i*.29-19;
    assert.deepEqual(a.sample(x,z),b.sample(x,z));
    assert.equal(a.chooseSpecies(x,z),b.chooseSpecies(x,z));
  }
});
test('paths physically thin grass and provide less cover, obstacles are bare',()=>{
  const bare=createEcology({...flat,trailAt:()=>1});
  const full=createEcology({...flat,trailAt:()=>0});
  const x=18,z=-13;
  assert.ok(bare.sample(x,z).density<full.sample(x,z).density*.08);
  assert.ok(bare.sample(x,z).cover<full.sample(x,z).cover);
  const blocked=createEcology({...flat,obstacleAt:()=>true});
  assert.equal(blocked.sample(x,z).density,0);
  assert.equal(blocked.gameplay(x,z).concealment,0);
  assert.equal(blocked.gameplay(x,z).traversable,false);
});
test('marsh stores wet fire-risk suppression and different forage',()=>{
  const marsh=createEcology({...flat,biome:'marsh'}).gameplay(0,0);
  const ash=createEcology({...flat,biome:'ashlands'}).gameplay(0,0);
  assert.ok(marsh.fireSpreadPotential<ash.fireSpreadPotential);
  assert.equal(marsh.forage,'reed-fibre');
  assert.equal(ash.forage,'cinder-seed');
});
test('vegetation patches vary broadly and are not one repeating texture',()=>{
  const e=createEcology(flat);let values=new Set();
  for(let ix=0;ix<18;ix++)for(let iz=0;iz<18;iz++){
    values.add(Math.round(e.sample(ix*3,iz*3).density*100));
  }
  assert.ok(values.size>40,`Expected nontrivial density variation, found ${values.size}`);
});
test('winter growth is less than summer growth at the same location',()=>{
  const winter=createEcology({...flat,season:'winter'}).sample(3,4);
  const summer=createEcology({...flat,season:'summer'}).sample(3,4);
  assert.ok(winter.density<summer.density*.4);
});

class Vector2{constructor(x=0,y=0){this.set(x,y)}set(x,y){this.x=x;this.y=y;return this}normalize(){const n=Math.hypot(this.x,this.y)||1;this.x/=n;this.y/=n;return this}}
class Vector4{constructor(x=0,y=0,z=0,w=0){this.set(x,y,z,w)}set(x,y,z,w){this.x=x;this.y=y;this.z=z;this.w=w;return this}}
class Color{constructor(c){this.c=c}clone(){return new Color(this.c)}multiplyScalar(f){this.mult=f;return this}lerp(other,t){this.lerpAmount=t;return this}set(v){this.c=v;return this}}
class BufferGeometry{constructor(){this.attributes={}}getAttribute(n){return this.attributes[n]}setAttribute(n,a){this.attributes[n]=a}setIndex(a){this.indices=a}computeBoundingSphere(){}dispose(){this.disposed=true}}
class Float32BufferAttribute{constructor(arr,n){this.array=arr;this.itemSize=n}}
class ShaderMaterial{constructor(options){this.uniforms=options.uniforms}dispose(){this.disposed=true}}
class Object3D{constructor(){this.position={set(){}},this.rotation={set(){}},this.scale={set(){}},this.matrix={}}updateMatrix(){}}
class InstancedMesh{constructor(geometry,material,count){this.geometry=geometry;this.material=material;this.instanceMatrix={count,needsUpdate:false,setUsage(){}};this.count=count}setMatrixAt(){}setColorAt(){this.instanceColor={needsUpdate:false}}dispose(){this.disposed=true}}
const THREE={Vector2,Vector4,Color,BufferGeometry,Float32BufferAttribute,InstancedBufferAttribute:Float32BufferAttribute,ShaderMaterial,Object3D,InstancedMesh,DoubleSide:2,DynamicDrawUsage:35048};
test('renderer lifecycle: batch generation, density budget, footsteps, rebuild and disposal',()=>{
  const world=[];const scene={add:x=>world.push(x),remove:x=>{const i=world.indexOf(x);if(i>=0)world.splice(i,1)}};
  const f=createGrassField(THREE,scene,{...flat,quality:'low',maxPlants:650,origin:{x:0,z:0}});
  const initial=f.getStats();
  assert.ok(initial.plants>200&&initial.plants<=650,JSON.stringify(initial));
  assert.ok(initial.drawCalls>0&&initial.drawCalls<=Object.keys(SPECIES).length);assert.equal(world.length,Object.keys(SPECIES).length);
  const firstCounts=[...f.meshes.values()].map(m=>m.count);
  const next=f.build(0,0);
  assert.deepEqual([...f.meshes.values()].map(m=>m.count),firstCounts);
  assert.deepEqual(next.counts,Object.fromEntries([...f.meshes].map(([k,m])=>[k,m.count])));
  f.step(1,2);f.update(.04,{x:5,z:5});
  assert.ok(f.getGameplay(0,0).movementCost>0);
  f.setAtmosphere({wind:.5,rain:.3,windDirection:[1,0]});
  f.dispose();assert.equal(world.length,0);
  assert.throws(()=>f.build(),/disposed/);
});

test('game-facing coordinator persists damage, preserves it through visual quality changes, and separates effects from ticking',async()=>{
  const {createLivingLandscape}=await import('./living-landscape.mjs');
  const scene={add(){},remove(){}};
  const opts={...flat,seed:63,biome:'meadow',quality:'low',maxPlants:250,origin:{x:0,z:0}};
  const system=createLivingLandscape(THREE,scene,opts);
  const intact=system.getGameplay(0,0).concealment;
  system.step(0,0,.9,1);system.ignite(0,0,{radius:2.2,moistureAt:()=>0});
  system.update(.6,{x:0,z:0});
  const damaged=system.getGameplay(0,0).concealment;
  assert.ok(damaged<intact);assert.ok(system.getStats().state.changedCells>0);
  const save=system.serialize();
  system.setQuality('medium');assert.ok(system.getGameplay(0,0).concealment<intact);
  const other=createLivingLandscape(THREE,scene,{...opts,initialSave:save});
  assert.ok(Math.abs(other.getGameplay(0,0).concealment-damaged)<.0001);
  other.advanceDays(120);assert.ok(other.getGameplay(0,0).concealment>damaged);
  other.dispose();system.dispose();
});
test('Canvas2D non-WebGL fallback respects biome/path/building exclusions and renders varied leaf shapes',async()=>{
  const {createCanvasGrassFallback}=await import('./canvas-grass-fallback.mjs');
  const fn=()=>{};
  const ctx={save:fn,restore:fn,beginPath:fn,moveTo:fn,quadraticCurveTo:fn,closePath:fn,fill:fn,ellipse:fn};
  const bare=createCanvasGrassFallback({...flat,quality:'low',obstacleAt:()=>true});
  const full=createCanvasGrassFallback({...flat,quality:'low',biome:'meadow'});
  const bounds={minX:-8,maxX:8,minZ:-5,maxZ:5};
  const p=bare.draw(ctx,{bounds,dt:.04,pixelScale:12});
  const v=full.draw(ctx,{bounds,dt:.04,pixelScale:12});
  assert.equal(p.plants,0);assert.ok(v.plants>40);assert.ok(v.plants<=1900);
  assert.deepEqual(full.draw(ctx,{bounds,dt:0,pixelScale:12}).plants,v.plants);
  assert.throws(()=>full.draw(ctx,{}),/bounds/);
});
