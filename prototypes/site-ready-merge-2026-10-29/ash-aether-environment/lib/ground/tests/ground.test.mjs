import test from 'node:test';
import assert from 'node:assert/strict';
import {MATERIALS,MATERIAL_BY_ID,MATERIAL_REALMS,getGroundMaterial,analyzeGround} from '../ground-materials.mjs';
import {hash,valueNoise,fractal,generateGroundMaps,createMaterialLocator,sampleWorldMaterial} from '../ground-synthesis.mjs';
import {materialOfRoom} from '../ground-runtime.mjs';
const all=Array.from({length:48},(_,i)=>i);
test('exactly 48 unique surfaces across four story realms',()=>{
 assert.equal(MATERIALS.length,48);assert.equal(new Set(MATERIALS.map(m=>m.id)).size,48);
 for(const realm of MATERIAL_REALMS)assert.equal(MATERIALS.filter(m=>m.realm===realm).length,12);
 for(const m of MATERIALS){assert.equal(m.colors.length,3);assert.ok(m.colors.every(c=>/^[0-9a-f]{6}$/i.test(c)));assert.ok(m.physics.traction>=0&&m.physics.traction<=1);assert.ok(m.reward.length>5);}
 assert.deepEqual(Object.keys(MATERIAL_BY_ID).sort(),MATERIALS.map(m=>m.id).sort());
});
test('deterministic seeded noise and spatial coherence',()=>{
 for(const x of [-14,-.01,0,.1,23.7])for(const z of [6,-11.9]){
  assert.equal(hash(x*100|0,z*100|0,91),hash(x*100|0,z*100|0,91));
  for(const v of [valueNoise(x,z),fractal(x,z)])assert.ok(v>=0&&v<=1);
 }
});
test('each palette gives alpha, normals and roughness with valid ranges',()=>{
 for(const mat of MATERIALS){const im=generateGroundMaps({materialId:mat.id,width:13,height:13,seed:773,metresX:5,metresZ:5});
  assert.equal(im.albedo.length,13*13*4);assert.equal(im.roughness.length,im.albedo.length);assert.equal(im.normal.length,im.albedo.length);
  assert.equal(im.elevation.length,169);
  for(let i=0;i<im.albedo.length;i+=4){assert.equal(im.albedo[i+3],255);assert.equal(im.normal[i+3],255);assert.equal(im.roughness[i+3],255);assert.ok(im.normal[i+2]>=0);}
 }
});
test('same seed yields exact image: different seed yields different image',()=>{
 const f={materialId:'ash-basalt',width:64,height:63,originX:23,originZ:-17};
 const a=generateGroundMaps(f),b=generateGroundMaps(f),c=generateGroundMaps({...f,seed:997});assert.deepEqual(a.albedo,b.albedo);assert.notDeepEqual(a.albedo,c.albedo);
});
test('weather causes visible wetness and alters traction',()=>{
 const s=analyzeGround('water-limestone',{wetness:0}),w=analyzeGround('water-limestone',{wetness:1});
 assert.ok(w.traction<s.traction);assert.ok(w.movementCost>s.movementCost);
 const a=generateGroundMaps({materialId:'water-limestone',width:32,height:32});
 const b=generateGroundMaps({materialId:'water-limestone',width:32,height:32,weather:{rain:1}});
 assert.notDeepEqual(a.albedo,b.albedo);assert.notDeepEqual(a.roughness,b.roughness);
});
test('electrical metal, aether phase and silencing rug physically distinct',()=>{
 assert.ok(analyzeGround('aether-brass').conduction>analyzeGround('clay-rug').conduction+.8);
 assert.ok(analyzeGround('clay-rug').noise<.2);
 assert.ok(analyzeGround('aether-phase').resonance>.9);
});
test('material locators respect polygon, rectangle, disk and priority',()=>{
 const region=createMaterialLocator([{materialId:'water-silt',disc:[0,0,3,2]},{materialId:'ash-grate',bounds:[-1,-1,1,1]},{materialId:'aether-marble',polygon:[[10,10],[15,10],[15,15],[10,15]]}], 'clay-earth');
 assert.equal(region(0,0),'ash-grate');assert.equal(region(2,0),'water-silt');assert.equal(region(11,11),'aether-marble');assert.equal(region(-8,-8),'clay-earth');
});
test('map sampler chooses each world coordinate and room without random interiors',()=>{
 const locator=()=> 'clay-terracotta';const map=generateGroundMaps({materialAt:locator,width:8,height:9});
 assert.equal(map.world.metresX,14);assert.equal(materialOfRoom({tags:['chapel']}),'aether-celestial');
 assert.equal(materialOfRoom({tags:['forge']}),'ash-slag');assert.equal(materialOfRoom({tags:['home']}),'clay-earth');
 assert.equal(materialOfRoom({tags:[]}),'clay-earth');
 for(const x of all.slice(0,8))assert.ok(getGroundMaterial(sampleWorldMaterial(x-30,x-30)));
});
test('bad ground ID or dimensions fail loudly',()=>{
 assert.throws(()=>getGroundMaterial('missing'),RangeError);
 assert.throws(()=>generateGroundMaps({width:0}),RangeError);
 assert.throws(()=>generateGroundMaps({metresZ:-2}),RangeError);
});
import {GroundDynamics} from '../ground-dynamics.mjs';
test('ground-impact causes threshold events with persistent state',()=>{
 const sys=new GroundDynamics({columns:5,rows:5,materialId:'aether-brass'});
 const x=2.5,z=2.5;
 assert.equal(sys.surface(x,z).fracture,0);
 const one=sys.impact(x,z,{element:'lightning',strength:1});assert.ok(one.effects.includes('conductive-chain'));
 const two=sys.impact(x,z,{element:'aether',strength:1});assert.ok(two.effects.includes('phase-path'));
 assert.ok(sys.surface(x,z).charge>.7);
 assert.ok(sys.impact(x,z,{element:'water',strength:1}).effects.includes('arc-puddle'));
 const snap=sys.save();const restored=new GroundDynamics({columns:5,rows:5,materialId:'aether-brass'});
 restored.load(snap);assert.deepEqual(restored.save(),snap);
});
test('wetness and charge diffuse locally, decay, and change movement',()=>{
 const sys=new GroundDynamics({columns:5,rows:5,materialId:'water-seep'});
 sys.impact(2.5,2.5,{element:'water',strength:1});
 const center=sys.surface(2.5,2.5),neighbor0=sys.surface(3.5,2.5);
 sys.tick(1,{rain:0});const neighbor1=sys.surface(3.5,2.5);
 assert.ok(neighbor1.wetness>neighbor0.wetness);
 assert.ok(sys.surface(2.5,2.5).wetness<center.wetness);
 assert.throws(()=>sys.tick(-1),RangeError);
});
test('fracture is repairable only with resources and traces survive saves',()=>{
 const sys=new GroundDynamics({columns:3,rows:3,materialId:'clay-fieldstone'});
 for(let i=0;i<5;i++)sys.impact(1.5,1.5,{element:'kinetic',strength:1});
 const old=sys.surface(1.5,1.5).fracture;assert.ok(old>.7);
 assert.equal(sys.repair(1.5,1.5).type,'ground-repair-failed');
 assert.equal(sys.surface(1.5,1.5).fracture,old);
 assert.equal(sys.repair(1.5,1.5,{materialResource:'salvage:stone',strength:.4}).type,'ground-repair');
 assert.ok(sys.surface(1.5,1.5).fracture<old);
 sys.step(1.5,1.5,{speed:1.6});assert.ok(sys.surface(1.5,1.5).traffic>0);
});
test('grid rejects huge allocations and snaps reject corruption',()=>{
 assert.throws(()=>new GroundDynamics({columns:2000,rows:2000}),RangeError);
 const g=new GroundDynamics({columns:4,rows:4});
 const snapshot=g.save();snapshot.fields.wet[1]=9;
 assert.throws(()=>g.load(snapshot),RangeError);
 assert.equal(g.surface(-1,-1),null);
});
import {createNarrativeWearField} from '../ground-synthesis.mjs';
test('narrative floor wear follows doorway paths and drainage sources',()=>{
 const local=createNarrativeWearField({paths:[{points:[[0,0],[3,1],[7,1]],width:1,wear:.9}],sources:[{x:1,z:6,radius:1.4,wet:1,moss:.8}]});
 assert.ok(local(3,1).age>local(3,7).age);
 assert.ok(local(1,6).rain>local(7,7).rain);
 const withWear=generateGroundMaps({materialId:'clay-fieldstone',width:32,height:32,weatherAt:local});
 const without=generateGroundMaps({materialId:'clay-fieldstone',width:32,height:32});
 assert.notDeepEqual(withWear.albedo,without.albedo);
});
test('two world-adjacent maps share same seamless albedo boundary',()=>{
 const L=generateGroundMaps({materialId:'water-pebbles',width:21,height:17,originX:-5,metresX:10,metresZ:10,seed:123});
 const R=generateGroundMaps({materialId:'water-pebbles',width:21,height:17,originX:5,metresX:10,metresZ:10,seed:123});
 for(let y=0;y<17;y++)for(let c=0;c<4;c++)assert.equal(L.albedo[(y*21+20)*4+c],R.albedo[(y*21)*4+c]);
});
