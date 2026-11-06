import test from 'node:test';
import assert from 'node:assert/strict';
import {createVegetationState} from './grass-state.mjs';
const make=()=>createVegetationState({seed:120,cellSize:.7});
test('unchanged vegetation is pristine and world-state disturbances are spatially bounded',()=>{
  const s=make();assert.equal(s.sample(0,0).vigor,1);const n=s.trample(0,0,{radius:1.5,mass:1});
  assert.ok(n>0);assert.ok(s.sample(0,0).vigor<1);assert.equal(s.sample(20,20).vigor,1);
  assert.equal(s.sample(0,0).scorch,0);
});
test('wet landscapes prevent most ignition and fire leaves coherent, persistent damage',()=>{
  const wet=make(),dry=make();
  dry.ignite(0,0,{radius:2,moistureAt:()=>0});wet.ignite(0,0,{radius:2,moistureAt:()=>.99});
  assert.ok(dry.sample(0,0).scorch>wet.sample(0,0).scorch);
  assert.ok(dry.sample(0,0).health<wet.sample(0,0).health);
  dry.advanceDays(30);assert.ok(dry.sample(0,0).vigor>0);assert.ok(dry.sample(0,0).vigor<1);
});
test('harvest outcome and growth state are authoritative, persistent, and reloadable',()=>{
  const s=make(),result=s.harvest(2,3,{biome:'marsh',radius:2});
  assert.equal(result.kind,'reed-fibre');assert.ok(result.changed>0);
  const before=s.sample(2,3),encoded=s.serialize(),s2=make();s2.restore(JSON.parse(JSON.stringify(encoded)));
  assert.ok(Math.abs(s2.sample(2,3).vigor-before.vigor)<.00002);assert.deepEqual(s2.serialize(),encoded);
  s2.advanceDays(90);assert.ok(s2.sample(2,3).vigor>before.vigor);
});
test('save file validation is strict and rollback time is rejected',()=>{
  const s=make();assert.throws(()=>s.restore({version:4}));assert.throws(()=>s.advanceDays(-1));
  assert.throws(()=>s.restore({version:2,seed:120,cellSize:.7,day:0,entries:[[0,0,NaN,0,0,0,0]]}));
  s.setDay(8);assert.throws(()=>s.setDay(3));
});
test('same events give byte-identical saves; new seed must not load old world',()=>{
  const a=make(),b=make();for(const s of [a,b]){s.trample(-1,5);s.ignite(7,-2,{radius:1.8});s.water(7,-2);s.advanceDays(1.25);}
  assert.equal(JSON.stringify(a.serialize()),JSON.stringify(b.serialize()));
  assert.throws(()=>createVegetationState({seed:121,cellSize:.7}).restore(a.serialize()));
});
test('growth damage has ecologically visible consequences and eventual recovery',async()=>{
  const {createEcology}=await import('./grass-ecology.mjs');
  const s=make(),e=createEcology({seed:120,biome:'meadow',growthAt:s.sample});
  const base=e.sample(0,0);s.ignite(0,0,{radius:2,moistureAt:()=>0});
  const burned=e.sample(0,0);assert.ok(burned.density<base.density);assert.ok(burned.cover<base.cover);
  assert.ok(burned.flammability<base.flammability);
  s.advanceDays(60);assert.ok(e.sample(0,0).density>burned.density);
});
