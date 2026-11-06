import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../world.js';
import {installReconciledGround} from '../reconciled-ground.js';
import {installLivingAtlas,livingAtlasBattleEvent} from '../living-atlas.js';
import {installTrailLife,startBellrun,stepBellrun} from '../reconciled-travel.js';
import {prepareReconciledPlaytest} from '../reconciled-preview.js';
import {transactLivingArmory,ensureLivingArmory} from '../living-armory/campaign.js';
import {convergeOrigin} from '../origins.js';
import {ORIGINS} from '../origin-content.js';

const data=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url)));
function installed(){const w=new World(data);installReconciledGround(w);installLivingAtlas(w);installTrailLife(w);return w;}
function outside(w){const s=w.data.scenes.find(x=>x.key==='forest');assert.ok(s);w.loadScene(s.location,s.arrive);w.state.mode='field';w.activeHeroes[0].mp=20;return s;}

test('composed campaign save preserves equipment, terrain, resonance and a running relay together',()=>{
 const w=installed();outside(w);prepareReconciledPlaytest(w);
 const inventory=ensureLivingArmory(w.state).snapshot,item=inventory.placements[0]?.item||inventory.overflow[0];assert.ok(item);item.requiredLevel=1;
 assert.ok(transactLivingArmory(w.state,w.state.party[0],'equip',[item.id]).ok);
 assert.ok(w.livingAtlas.listen({phase:0}).ok);
 const event={type:'cast',tech:{core:'flame'},targets:[{x:w.state.x,y:w.state.y}]};w.reconciledGround.battleEvent(event);livingAtlasBattleEvent(w,event);
 const race=startBellrun(w);[w.state.x,w.state.y]=race.gates[0];stepBellrun(w,.05);assert.equal(race.index,1);
 const saved=w.save(),snapshot=JSON.parse(saved),other=installed();other.restore(saved);
 assert.equal(other.state.gold,w.state.gold);assert.deepEqual(other.state.livingArmory,snapshot.livingArmory);assert.deepEqual(other.state.trailLife,snapshot.trailLife);
 assert.deepEqual(JSON.parse(other.save()).environment.groundV1,snapshot.environment.groundV1);assert.deepEqual(JSON.parse(other.save()).livingAtlasV1,snapshot.livingAtlasV1);
 const before=other.save(),bad=JSON.parse(before);bad.livingArmory.snapshot.resources.scrap=-1;
 assert.throws(()=>other.restore(bad));assert.equal(other.save(),before,'failed multi-system import leaves the current journey intact');
});

test('all installed systems migrate an old save without granting a playtest kit or changing progress',()=>{
 const old=new World(data);old.state.gold=137;old.state.items.tonic=6;old.state.story.homeSeen=true;
 const oldSave=JSON.parse(old.save()),w=installed();w.restore(oldSave);w.livingAtlas.status();
 assert.equal(w.state.gold,137);assert.equal(w.state.items.tonic,6);assert.deepEqual(w.state.story,oldSave.story);assert.deepEqual(w.state.flags,oldSave.flags);
 const armory=ensureLivingArmory(w.state).snapshot;assert.equal(armory.placements.length,0);assert.equal(armory.overflow.length,0);assert.equal(w.state.trailLife.bonded,false);assert.equal(w.state.trailLife.rewards.length,0);
 for(const key of ['power','magic','maxHp','maxMp','speed'])assert.equal(w.state.heroes[0][key],oldSave.heroes[0][key]);
});

test('origin convergence keeps the same landscape and companion record while a new telling resets them',()=>{
 const w=installed();w.newGame({originId:ORIGINS[0].id});w.state.mode='field';w.activeHeroes[0].mp=12;
 assert.ok(w.livingAtlas.listen({phase:0}).ok);w.reconciledGround.impact(w.state.x,w.state.y,'flame',1);w.state.trailLife.bonded=true;
 const before=JSON.parse(w.save()),id=w.state.timeline.id;w.state.chronicle.step=4;w.state.chronicle.choices={repair:0,destiny:0,approach:'battle'};
 convergeOrigin(w);assert.equal(w.state.timeline.id,id);assert.deepEqual(w.state.livingAtlasV1.maps,before.livingAtlasV1.maps);assert.equal(w.state.trailLife.bonded,true);
 for(const [scene,surface] of Object.entries(before.environment.groundV1.maps))assert.deepEqual(w.state.environment.groundV1.maps[scene],surface);
 w.newGame({originId:ORIGINS[0].id,legacy:{cycle:1}});assert.equal(w.state.trailLife?.bonded||false,false);assert.equal(w.livingAtlas.status().resonance,0);assert.equal(w.reconciledGround.surface(w.state.x,w.state.y).temperature,0);
});
