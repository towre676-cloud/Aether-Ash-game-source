import test from 'node:test';
import assert from 'node:assert/strict';
import {source} from './opening-flow.mjs';
import {World} from '../world.js';
import {Battle,makeEnemy} from '../battle.js?v=5.6.0';
import {defaultHero,compileTechnique} from '../mako.js';
import {ORIGINS} from '../origin-content.js?v=5.6.0';
import {convergeOrigin,legacyFrom} from '../origins.js?v=5.6.0';
import {combatContext} from '../combat-reactions.js';
import {battlefieldContext} from '../battlefield-context.js';
import {objectiveEncounterContext,settleObjectiveHistory} from '../objective-context.js';
import {buildWildEnemies,wildPositions} from '../wild-combat.js';
import {mergeCombatMemory} from '../combat-instruments.js';
import {validateSave,savedEncounter} from '../save-validation.js?v=5.6.0';
import {applySupply} from '../repertoire.js?v=5.6.0';

const clone=v=>JSON.parse(JSON.stringify(v));
function descriptor(w,kind){return {type:'wild',randomEncounter:true,habitat:'wetland',tier:1,count:1,serial:1,seed:997,xy:[Math.floor(w.state.x),Math.floor(w.state.y)],...(kind?{objectiveKind:kind}:{})};}
function opening(w,origin,kind){
 w.newGame({originId:origin.id});w.state.mode='field';const object=descriptor(w,kind),enemies=buildWildEnemies(w,object),spots=wildPositions(w.scene,w.state.x,w.state.y,enemies.length);
 for(const [i,e]of enemies.entries()){e.x=spots[i][0]+.5;e.y=spots[i][1]+.5;}
 for(const h of w.activeHeroes){h.x=w.state.x;h.y=w.state.y;}
 const context={...objectiveEncounterContext(w,object,battlefieldContext(w,object,combatContext(w))),reinforcementLimit:0,encounterSerial:1,clayMemory:w.state.clayMemory};
 const battle=new Battle({heroes:w.activeHeroes,enemies,chapter:1,context});return {object,battle};
}
function fixture(kind='signal',extra={}){
 const h=defaultHero(1),e=makeEnemy('predator',1);Object.assign(h,{x:2.5,y:3.5});Object.assign(e,{x:15.5,y:3.5,power:3,speed:.15,family:'test-scavenger'});
 const context={reinforcementLimit:0,objective:{id:'integration-'+kind,kind,asset:{id:'protected',name:'Protected worksite',x:3.5,y:3.5,hp:300,maxHp:300},floor:Array.from({length:10},()=>'.'.repeat(18)),route:[{x:3.5,y:3.5},{x:7.5,y:3.5}],safeNodes:[{id:'east',label:'East',x:4.5,y:3.5},{id:'north',label:'North',x:3.5,y:1.5}],required:3,deadline:90,speed:.4,stableTime:3,...extra}};
 const b=new Battle({heroes:[h],enemies:[e],chapter:1,context});return {b,h,e,a:b.objective.asset};
}
function ready(b,h){for(let i=0;i<1000&&h.atb<1&&!b.ended;i++)b.advance(.1);assert.equal(b.ended,null);assert.ok(h.atb>=1);}
function paid(b,h,system,action,target,more={}){ready(b,h);assert.ok(b.command(h.id,system,target?.id,{action,...more}),system+':'+action);assert.equal(h.atb,0);}
function aimed(b,e){return {kind:'objective-sabotage',objectiveId:b.objective.id,target:b.objective.asset.id,targetKind:'objective',shape:'line',x:b.objective.asset.x,y:b.objective.asset.y,fromX:e.x,fromY:e.y,left:2.2,total:2.2,power:18,label:'Striking the protected worksite'};}
function endSummary(b){return {id:b.objective.id,kind:b.objective.kind,result:'win',nonlethal:b.livingEnemies.length>0,integrity:b.objective.asset.hp};}

test('all seven actual opening wild encounters create live objectives and early instrument actions',()=>{
 const w=new World(source);for(const origin of ORIGINS){const {battle:b}=opening(w,origin);assert.ok(b.objective,origin.id);assert.equal(b.instruments.enabled,true);assert.ok(b.objective.walkable.length<=256);assert.ok(b.instruments.safeNodes.length>=2);for(let i=0;i<80&&!b.ended;i++)b.advance(.1);assert.ok(Number.isFinite(b.objective.asset.hp));assert.equal(b.objective.asset.atb,undefined);assert.ok(b.enemies[0].hp>0);assert.ok(b.events.some(e=>e.type==='intent'),origin.id);}
});

test('four actual Battle objectives can complete nonlethally using earned readiness and advancing clocks',()=>{
 for(const kind of ['escort','regulator','supply','signal']){const {b,h,e}=fixture(kind);if(kind==='escort'){
  paid(b,h,'objective','guide',b.objective.asset);for(let i=0;i<700&&!b.ended;i++){h.x=b.objective.asset.x;h.y=b.objective.asset.y;b.advance(.1);}
 }else{const verb={regulator:'stabilize',supply:'secure',signal:'disable'}[kind];for(let i=0;i<3;i++)paid(b,h,'objective',verb,b.objective.asset);for(let i=0;i<100&&!b.ended;i++)b.advance(.1);}
 assert.equal(b.ended,'win',kind);assert.ok(e.hp>0,kind);assert.ok(b.time>=6,kind+' bypassed readiness');assert.equal(b.objective.complete,true);}
});

test('objective-directed enemy plans damage the protected actor and clay replay redirects a real charge',()=>{
 const {b,h,e,a}=fixture('signal');e.x=5.5;e.y=a.y;ready(b,h);b.planEnemy(e);assert.equal(e.intent.target,a.id);assert.equal(e.intent.kind,'objective-sabotage');const before=a.hp;b.executeIntent(e,e.intent);assert.ok(a.hp<before);
 e.intent=aimed(b,e);paid(b,h,'instrument','record',e);const frozen=clone(b.instruments.patterns[0]);e.intent.power=99;assert.equal(b.instruments.patterns[0].power,frozen.power);
 ready(b,h);e.intent=aimed(b,e);paid(b,h,'instrument','replay',e,{patternId:frozen.id,nodeId:'north'});assert.equal(e.intent.instrumentDecoy,true);const hp=a.hp;b.executeIntent(e,e.intent);assert.equal(a.hp,hp);assert.equal(b.instruments.decoy.charges,0);
});

test('directional instrument lines and finite field braces intercept aimed attacks on the protected actor',()=>{
 const {b,h,e,a}=fixture('signal');e.x=5.5;e.y=a.y;paid(b,h,'instrument','coverage',e,{nodeId:'east'});const hp=a.hp;b.executeIntent(e,aimed(b,e));assert.equal(a.hp,hp);assert.equal(b.instruments.coverage[0].charges,0);b.executeIntent(e,aimed(b,e));assert.ok(a.hp<hp);
 const q=fixture('signal');q.h.x=q.a.x;q.h.y=q.a.y;q.e.x=5.5;q.e.y=q.a.y;
 const prop={id:'test-brace',type:'plank',name:'Loose brace',x:q.h.x,y:q.h.y,uses:2,maxUses:2,ownerId:q.h.id,condition:'carried',source:'fixture'};q.b.field={version:1,enabled:true,props:[prop],cover:[]};q.h.fieldGear=prop.id;
 paid(q.b,q.h,'field','cover',q.e,{propId:prop.id});const before=q.a.hp;q.b.executeIntent(q.e,aimed(q.b,q.e));assert.equal(q.a.hp,before);assert.equal(q.b.field.cover[0].integrity,0);q.b.executeIntent(q.e,aimed(q.b,q.e));assert.ok(q.a.hp<before);
});

test('Mend, Ward and a Tonic can protect a patient through the same battle actor interfaces',()=>{
 const {b,h,a}=fixture('escort');a.hp=50;ready(b,h);assert.ok(b.command(h.id,'tech',a.id,compileTechnique('mend','focus',{character:h.id})));assert.ok(a.hp>50);ready(b,h);assert.ok(b.command(h.id,'tech',a.id,compileTechnique('ward','focus',{character:h.id})));assert.ok(a.status.shield>0);a.hp=20;ready(b,h);const inventory={tonic:1};assert.ok(applySupply(b,inventory,'tonic',h,b.enemies[0]));assert.ok(a.hp>20);assert.equal(inventory.tonic,0);
});


test('enhanced saves preserve objective progress, material tools, geometry and instruments while rejecting malformed state',()=>{
 const w=new World(source),{battle:b,object}=opening(w,ORIGINS[2],'regulator');w.state.mode='battle';const h=b.heroes[0];h.x=b.objective.asset.x;h.y=b.objective.asset.y;paid(b,h,'instrument','listen',b.enemies[0]);
 const value={schema:'ash-aether.enhanced-save/1',world:JSON.parse(w.save()),battle:b.snapshot(),origin:{scene:w.scene.location,type:'wild',practice:clone(object)}};
 const beforeImport=JSON.stringify(value),checked=validateSave(source,value);assert.notEqual(checked,value);assert.deepEqual(checked,value);assert.equal(JSON.stringify(value),beforeImport);const copy=new World(source);copy.restore(value.world);assert.ok(savedEncounter(copy,value));const restored=new Battle({heroes:copy.activeHeroes,enemies:[],chapter:1});restored.restore(clone(value.battle));assert.deepEqual(restored.objective,b.objective);assert.deepEqual(restored.instruments,b.instruments);assert.deepEqual(restored.field,b.field);
 const bad=clone(value);bad.battle.instruments.safeNodes[0].x=Infinity;assert.throws(()=>validateSave(source,bad),/objective or instruments/);const badGoal=clone(value);badGoal.battle.objective.route[0].x=-999;assert.throws(()=>validateSave(source,badGoal),/objective or instruments/);
});

test('nonlethal settlement rewards the objective without inventing creature defeats or their loot',()=>{
 const w=new World(source),{battle:b,object}=opening(w,ORIGINS[0],'supply'),before={xp:w.state.xp,gold:w.state.gold,items:clone(w.state.items),flags:clone(w.state.flags),bosses:clone(w.state.bosses),chapter:w.state.chapter};
 object.defeatedSpecies=[];object.objectiveOutcome=endSummary(b);w.state.mode='battle';w.currentBattle={scene:w.scene.location,object,mission:{...w.mission,id:1}};w.winBattle();
 assert.equal(w.state.xp,before.xp+44);assert.equal(w.state.gold,before.gold+27);assert.equal(w.state.items.ether,(before.items.ether||0)+1);for(const [id,count]of Object.entries(w.state.items))if(id!=='ether')assert.equal(count,before.items[id],id+' generated creature loot');assert.deepEqual(w.state.monsterJournal.victories,{});assert.deepEqual(w.state.flags,before.flags);assert.deepEqual(w.state.bosses,before.bosses);assert.equal(w.state.chapter,before.chapter);
 assert.equal(w.state.objectiveHistory.records[0].nonlethal,true);assert.equal(settleObjectiveHistory(w.state,object,object.objectiveOutcome),null);const later=objectiveEncounterContext(w,{...object,serial:2,objectiveKind:'supply'},{});assert.ok(later.fieldProps.some(p=>p.type==='plank'&&p.source==='Previously secured local stores'));
});

test('objective loss records no reward or campaign advancement',()=>{
 const w=new World(source),{battle:b,object}=opening(w,ORIGINS[4],'signal'),before={xp:w.state.xp,gold:w.state.gold,flags:clone(w.state.flags),bosses:clone(w.state.bosses),chapter:w.state.chapter};object.defeatedSpecies=[];object.objectiveOutcome={...endSummary(b),result:'loss',nonlethal:false};w.state.mode='battle';w.currentBattle={scene:w.scene.location,object,mission:{...w.mission,id:1}};w.loseBattle();assert.equal(w.state.xp,before.xp);assert.equal(w.state.gold,before.gold);assert.deepEqual(w.state.flags,before.flags);assert.deepEqual(w.state.bosses,before.bosses);assert.equal(w.state.chapter,before.chapter);assert.equal(w.state.objectiveHistory.records[0].result,'loss');
});

test('retained clay rhythms survive origin convergence and a new telling without importing future objectives',()=>{
 const w=new World(source);w.newGame({originId:ORIGINS[1].id,legacy:{journey:{hero:1,seed:31}}});w.state.mode='field';const q=fixture('signal');q.e.x=5.5;q.e.y=q.a.y;ready(q.b,q.h);q.e.intent=aimed(q.b,q.e);assert.ok(q.b.command(q.h.id,'instrument',q.e.id,{action:'record'}));assert.ok(mergeCombatMemory(w.state,q.b.instruments));
 const memory=clone(w.state.clayMemory);w.state.chronicle.step=4;w.state.chronicle.choices={repair:0,destiny:0,approach:'battle'};convergeOrigin(w);assert.equal(w.state.chronicle.phase,'present');assert.deepEqual(w.state.clayMemory,memory);
 const legacy=legacyFrom(w.state);w.newGame({originId:ORIGINS[6].id,legacy});assert.deepEqual(w.state.clayMemory,memory);assert.equal(w.state.objectiveHistory,undefined);assert.equal(w.state.chronicle.phase,'past');
});
