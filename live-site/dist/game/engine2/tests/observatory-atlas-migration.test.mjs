import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../world.js';
import {installReconciledGround} from '../reconciled-ground.js';
import {installLivingAtlas,prepareLivingAtlasRestore,validateLivingAtlas} from '../living-atlas.js';

const raw=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url),'utf8'));
function make(){const w=new World(raw);w.newGame({originId:'veyr-storm',quiet:true});w.state.mode='field';installReconciledGround(w);installLivingAtlas(w);return w;}
function oldProfile(){
 const w=make();w.livingAtlas.listen();w.move(.1,0);
 // Preserve an unrelated map's real numerical state in the same lineage.
 w.state.scene=5;w.state.x=24.5;w.state.y=42.5;w.livingAtlas.listen();
 w.state.scene=50012;w.state.x=54.5;w.state.y=28.5;
 const state=JSON.parse(w.save()),local=state.livingAtlasV1.maps.s50012;
 local.kernel.size=[64,32];delete local.observatoryLayoutVersion;
 local.ecology.defeated=3;local.ecology.peaceful=2;
 delete state.observatoryLayoutVersion;
 return {state,scenes:w.scenes};
}

test('legacy observatory fields rebase before Atlas size validation while canonical history and unrelated maps survive',()=>{
 const {state,scenes}=oldProfile(),before=JSON.stringify(state),atlas=structuredClone(state.livingAtlasV1),prepared=prepareLivingAtlasRestore(state,scenes);
 assert.equal(JSON.stringify(state),before,'preparation never mutates an imported profile');
 const local=prepared.livingAtlasV1.maps.s50012;
 assert.equal(local.kernel,undefined);assert.equal(local.vegetation,undefined);assert.equal(local.observatoryLayoutVersion,1);
 assert.deepEqual(local.ecology,atlas.maps.s50012.ecology);
 assert.deepEqual(prepared.livingAtlasV1.maps.s5,atlas.maps.s5);
 for(const key of['timelineId','sequence','day','travel','restDays'])assert.deepEqual(prepared.livingAtlasV1[key],atlas[key]);
 for(const key of['items','gold','xp','heroes','flags','chronicle','embodiedOrigins'])assert.deepEqual(prepared[key],state[key]);
 assert.equal(validateLivingAtlas(prepared,scenes),true);
 const w=make();w.restore(state);assert.equal(w.scene.location,50012);assert.ok(w.walkable(w.state.x,w.state.y));
 assert.equal(w.livingAtlas.status().defeated,3);assert.equal(w.livingAtlas.status().peaceful,2);
 assert.deepEqual(w.state.livingAtlasV1.maps.s5,atlas.maps.s5);
});

test('new-layout fields remain exact across repeat restore, including preparation after a World-only coordinate migration',()=>{
 const {state}=oldProfile(),w=make();
 // validateSave first uses a bare World, which already stamps the position
 // schema. The Atlas cache schema must independently identify old fields.
 const probe=new World(raw);probe.restore(state);assert.equal(probe.state.observatoryLayoutVersion,1);
 w.restore(JSON.parse(probe.save()));assert.ok(w.livingAtlas.listen({phase:.2}).ok);
 const saved=JSON.parse(w.save()),field=structuredClone(saved.livingAtlasV1.maps.s50012.kernel);
 assert.deepEqual(field.size,[20,24]);assert.equal(saved.livingAtlasV1.maps.s50012.observatoryLayoutVersion,1);
 w.restore(saved);const repeated=JSON.parse(w.save());
 assert.deepEqual(repeated.livingAtlasV1.maps.s50012.kernel,field);
 assert.deepEqual(prepareLivingAtlasRestore(repeated,w.scenes),repeated);
});

test('the observatory migration does not hide malformed fields, invalid ecology or unknown map dimensions',()=>{
 const {state}=oldProfile(),w=make(),before=w.save();
 for(const change of[s=>s.livingAtlasV1.maps.s50012.kernel.fields.fire='!!',s=>s.livingAtlasV1.maps.s50012.ecology.alert=9,s=>s.livingAtlasV1.maps.s50012.kernel.size=[63,32]]){
  const invalid=structuredClone(state);change(invalid);assert.throws(()=>w.restore(invalid));assert.equal(w.save(),before);
 }
});
