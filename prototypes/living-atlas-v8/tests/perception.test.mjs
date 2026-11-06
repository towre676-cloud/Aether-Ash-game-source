import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AtlasWorld} from '../src/adventure.mjs';
import {MATERIALS} from '../src/ground/ground-materials.mjs';
import {REGIONS} from '../src/content.mjs';
import {ACOUSTIC_SURFACES,BIOME_IDS,AcousticWorld} from '../src/acoustic/src/acoustic-world.js';
import {acousticSurfaceFor,regionAmbience,perceiveAt,authoredSignalSources,AtlasAcousticBridge} from '../src/perception.mjs';
test('all 48 physical materials have valid, deterministic audio surfaces',()=>{
 for(const m of MATERIALS)for(const wet of [0,.3,.8]){
  assert.ok(ACOUSTIC_SURFACES.includes(acousticSurfaceFor(m.id,wet)));
  assert.equal(acousticSurfaceFor(m.id,wet),acousticSurfaceFor(m.id,wet));
 }
});
test('nine authored regions map onto the actual recorded ambience bank',()=>{
 for(const r of REGIONS)assert.ok(BIOME_IDS.includes(regionAmbience(r)));
});
test('existing lawn, plaza, and water state drive the same game and acoustic calculations',()=>{
 const a=new AtlasWorld(),plaza=perceiveAt(a,17,14),meadow=perceiveAt(a,-28,-27);
 assert.equal(plaza.vegetationAllowed,false);
 assert.equal(meadow.vegetationAllowed,true);
 assert.ok(meadow.effects.concealment>=0&&meadow.effects.concealment<=1);
 assert.notEqual(meadow.material,plaza.material);
});
test('material conductivity and wetness influence the nonlinear perception field',()=>{
 const a=new AtlasWorld();const p=perceiveAt(a,-28,-27);a.surface.impact(-28,-27,'water',.9);
 const q=perceiveAt(a,-28,-27);assert.ok(q.moisture>p.moisture);
 assert.notDeepEqual(q.effects,p.effects);
});
test('accepted movement changes terrain, not by reading the acoustic sensor',()=>{
 const a=new AtlasWorld();const p=perceiveAt(a,-15,-10);const old=JSON.stringify(a.snapshot());
 assert.equal(JSON.stringify(a.snapshot()),old);
 const r=a.dispatch({kind:'FOOTFALL_CONFIRMED',x:-15,z:-10});assert.equal(r.ok,true);
 assert.ok(perceiveAt(a,-15,-10).groundMaterial.wear>=p.groundMaterial.wear);
});
test('no invented sonic secret exists before a real Hydrophone event',()=>{
 const a=new AtlasWorld();assert.deepEqual(authoredSignalSources(a),[]);
 const before=JSON.stringify(a.inventory),c=new AtlasAcousticBridge();
 assert.equal(c.listen(a,{x:0,z:0}).found,false);assert.equal(JSON.stringify(a.inventory),before);
 c.dispose();
});
test('only an accepted Hydrophone placement creates a discoverable audio source',()=>{
 const a=new AtlasWorld(),c=new AtlasAcousticBridge();
 assert.throws(()=>a.dispatch({kind:'HYDROPHONE_PLAYED',x:700,z:100,phase:0,intensity:1}),/outside world/);
 assert.equal(authoredSignalSources(a).length,0);
 const good=a.dispatch({kind:'HYDROPHONE_PLAYED',x:-15,z:-10,phase:0,intensity:1});
 assert.equal(good.ok,true);
 assert.equal(authoredSignalSources(a).length,1);
 const inv=JSON.stringify(a.inventory),one=c.listen(a,{x:-14,z:-10});
 assert.equal(one.found,true);assert.equal(JSON.stringify(a.inventory),inv);
 const twice=c.listen(a,{x:-14,z:-10});assert.equal(twice.found,false);
 c.dispose();
});
test('knowledge survives Atlas saves without changing its version 3 contract',()=>{
 const a=new AtlasWorld(),c=new AtlasAcousticBridge();
 a.dispatch({kind:'HYDROPHONE_PLAYED',x:-15,z:-10,phase:0,intensity:1});
 const clue=c.listen(a,{x:-15,z:-10});assert.equal(clue.found,true);
 const b=AtlasWorld.restore(a.snapshot());assert.deepEqual(b.acousticState,a.acousticState);
 const other=new AtlasAcousticBridge();other.restore(b);
 assert.equal(other.listen(b,{x:-15,z:-10}).found,false);
 c.dispose();other.dispose();
});
test('old v3 saves without audio restore with default knowledge state',()=>{
 const a=new AtlasWorld(),v3=a.snapshot();delete v3.acousticState;
 const b=AtlasWorld.restore(v3);assert.deepEqual(b.acousticState,{flags:[]});
});
test('acoustic assets exist and are local to the package, including each sampled audio kind',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../src/acoustic/manifest.json',import.meta.url),'utf8'));
 assert.equal(manifest.assets.length,244);
 for(const e of manifest.assets){assert.ok(!e.file.includes('..'));
  assert.ok(fs.existsSync(new URL('../src/acoustic/'+e.file,import.meta.url)),e.id);
 }
});
