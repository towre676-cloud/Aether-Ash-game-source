import test from 'node:test';
import assert from 'node:assert/strict';
import {source} from './opening-flow.mjs';
import {World} from '../world.js';
import {Battle} from '../battle.js?v=5.6.0';
import {ORIGINS} from '../origin-content.js?v=5.6.0';
import {buildWildEnemies,wildPositions,recordWildSighting,validWildEncounter} from '../wild-combat.js';
import {monsterById} from '../monster-catalog.js';
import {validateSave,savedEncounter} from '../save-validation.js?v=5.6.0';

const clone=value=>JSON.parse(JSON.stringify(value));
const descriptor=(w,serial=1,habitat='meadow')=>({type:'wild',randomEncounter:true,habitat,tier:1,count:1,serial,seed:serial*997,xy:[Math.floor(w.state.x),Math.floor(w.state.y)]});
function harness(){
 let battle,w;
 w=new World(source,{onBattle(origin){
  const enemies=buildWildEnemies(w,origin.object),spots=wildPositions(w.scene,w.state.x,w.state.y,enemies.length);
  enemies.forEach((e,i)=>{e.x=spots[i][0]+.5;e.y=spots[i][1]+.5;});
  for(const h of w.activeHeroes){h.x=w.state.x;h.y=w.state.y;}
  recordWildSighting(w.state,enemies);
  battle=new Battle({heroes:w.activeHeroes,enemies,chapter:origin.mission.id,context:{reinforcementLimit:0}});
 }});
 return {w,get battle(){return battle;}};
}
function startOrigin(w,id){w.newGame({originId:id});w.state.mode='field';}
function fightWithBasicCommands(b){
 let actions=0;for(let frame=0;frame<2400&&!b.ended;frame++){
  const h=b.heroes[0],enemy=b.livingEnemies[0];
  if(h.atb>=1&&enemy)b.command(h.id,actions++%3===2?'guard':'attack',enemy.id);
  b.advance(.1);
 }
 assert.equal(b.ended,'win',b.enemies.map(e=>e.name+' · '+e.role).join(', '));
 assert.ok(b.heroes[0].hp>0);assert.equal(b.reinforcements,0);
}

test('all seven actual origin leads can beat solo opening creatures of every role using basic commands',()=>{
 const h=harness(),representatives=new Map();startOrigin(h.w,ORIGINS[0].id);
 for(let serial=1;serial<250&&representatives.size<4;serial++){
  h.w.state.fieldEncounters.recentSpecies=[];const object=descriptor(h.w,serial),enemy=buildWildEnemies(h.w,object)[0];
  if(!representatives.has(enemy.role))representatives.set(enemy.role,serial);
 }
 assert.equal(representatives.size,4);
 for(const origin of ORIGINS)for(const [role,serial] of representatives){
  startOrigin(h.w,origin.id);const object=descriptor(h.w,serial);
  assert.ok(h.w.startWildEncounter(object));assert.equal(h.w.state.party[0],origin.hero);
  assert.equal(h.battle.enemies[0].role,role);fightWithBasicCommands(h.battle);h.w.winBattle();
 }
});

test('wild victories award real XP, credits, equipped mastery and actual species drops without story advancement',()=>{
 const h=harness(),w=h.w;startOrigin(w,ORIGINS[1].id);
 const before={chapter:w.state.chapter,bosses:clone(w.state.bosses),flags:clone(w.state.flags),chronicle:clone(w.state.chronicle),story:clone(w.state.story),xp:w.state.xp,gold:w.state.gold,items:clone(w.state.items),ap:clone(w.activeHeroes[0].ap),inactive:clone(w.state.heroes.filter(v=>!w.state.party.includes(v.id)))};
 const object=descriptor(w,3,'wetland');assert.ok(w.startWildEncounter(object));
 const actualDrop=h.battle.enemies[0].drop;assert.equal(actualDrop,monsterById(object.species[0]).drop);
 fightWithBasicCommands(h.battle);w.winBattle();
 assert.equal(w.state.mode,'field');assert.equal(w.currentBattle,null);assert.equal(w.state.xp,before.xp+28);assert.equal(w.state.gold,before.gold+11);
 assert.equal(w.state.items[actualDrop],(before.items[actualDrop]||0)+1);
 for(const slot of w.activeHeroes[0].loadout)assert.equal(w.activeHeroes[0].ap[slot.core],(before.ap[slot.core]||0)+4);
 assert.equal(w.state.chapter,before.chapter);assert.deepEqual(w.state.bosses,before.bosses);assert.deepEqual(w.state.flags,before.flags);assert.deepEqual(w.state.chronicle,before.chronicle);assert.deepEqual(w.state.story,before.story);
 assert.deepEqual(w.state.heroes.filter(v=>!w.state.party.includes(v.id)),before.inactive);
 assert.equal(w.state.monsterJournal.victories[object.species[0]],1);
 assert.equal(w.state.monsterJournal.sightings[object.species[0]],1);
});

test('random encounters save and restore through preflight with their species, context and earned rewards intact',()=>{
 const h=harness(),w=h.w;startOrigin(w,ORIGINS[5].id);const object=descriptor(w,14,'archive');
 assert.ok(w.startWildEncounter(object));h.battle.advance(.1);
 const value={schema:'ash-aether.enhanced-save/1',world:JSON.parse(w.save()),battle:h.battle.snapshot(),origin:{scene:w.scene.location,type:'wild',practice:clone(object)}};
 const beforeImport=JSON.stringify(value),checked=validateSave(source,value);assert.notEqual(checked,value);assert.deepEqual(checked,value);assert.equal(JSON.stringify(value),beforeImport);
 const copy=new World(source);copy.restore(value.world);const restored=savedEncounter(copy,value);
 assert.deepEqual(restored.species,object.species);assert.deepEqual(restored.drops,object.drops);assert.ok(validWildEncounter(restored));
 const battle=new Battle({heroes:copy.activeHeroes,enemies:[],chapter:value.battle.chapter});battle.restore(value.battle);
 assert.equal(battle.context.reinforcementLimit,0);assert.deepEqual(battle.enemies.map(e=>e.species),object.species);
 copy.state.mode='battle';copy.currentBattle={scene:copy.scene.location,object:restored,mission:{...copy.mission,id:restored.tier}};
 fightWithBasicCommands(battle);copy.winBattle();assert.equal(copy.state.monsterJournal.victories[object.species[0]],1);
 const invalid=clone(value);invalid.origin.practice.species=['missing-monster'];assert.throws(()=>validateSave(source,invalid),/not in this campaign/);
});

test('spawn cells stay on reachable floor for every origin backdrop and furnished indoor danger room',()=>{
 const h=harness(),w=h.w;
 for(const origin of ORIGINS)for(const part of [0,1]){
  startOrigin(w,origin.id);const scene=w.scenes.get(origin.location+part),[x,y]=scene.arrive;
  const points=wildPositions(scene,x+.5,y+.5,3);assert.equal(points.length,3);
  const queue=[[x,y]],seen=new Set([x+','+y]);
  for(let n=0;n<queue.length;n++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const [cx,cy]=queue[n],next=[cx+dx,cy+dy],key=next.join(',');
   if(scene.floor[next[1]]?.[next[0]]==='.'&&!seen.has(key)){seen.add(key);queue.push(next);}
  }
  for(const point of points){assert.equal(scene.floor[point[1]]?.[point[0]],'.',scene.key);assert.ok(seen.has(point.join(',')),scene.key);}
 }
});

test('serial selection yields many distinct opening encounters and keeps formations within tier and count budgets',()=>{
 const h=harness(),w=h.w;startOrigin(w,ORIGINS[0].id);w.state.fieldEncounters={recentSpecies:[]};const seen=new Set();
 for(let serial=1;serial<=100;serial++){
  const object=descriptor(w,serial,serial%2?'meadow':'archive'),enemies=buildWildEnemies(w,object);
  assert.equal(enemies.length,1);assert.deepEqual(object.species,enemies.map(e=>e.species));assert.equal(new Set(object.drops).size,object.drops.length);
  for(const e of enemies){seen.add(e.species);assert.ok(monsterById(e.species).chapter<=1);assert.ok(e.hp>0&&e.power>0&&e.speed>0);}
 }
 assert.ok(seen.size>=20,'Only '+seen.size+' distinct varieties selected');
 assert.ok(buildWildEnemies(w,{...descriptor(w,101),count:99}).length<=3);
});
