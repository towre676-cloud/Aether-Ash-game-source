import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombatInstruments,instrumentActions,instrumentCommand,instrumentIntent,advanceInstruments,interceptInstrumentHit,instrumentSummary,mergeCombatMemory,validInstruments,normalizeCombatMemory,validCombatMemory} from '../combat-instruments.js';
import {Battle,makeEnemy} from '../battle.js?v=5.6.0';
import {defaultHero} from '../mako.js';

const clone=v=>JSON.parse(JSON.stringify(v));
function setup(){
 const h={id:1,name:'Iona',hp:180,x:0,y:0,atb:1,status:{}},e={id:'e0',name:'Reedcurrent Moth',family:'moonmoth',role:'mender',hp:90,x:5,y:0,atb:1,status:{}};
 const context={objective:{kind:'regulator',asset:{id:'asset',x:0,y:0,hp:100,maxHp:100,team:'heroes',status:{}},safeNodes:[{id:'east',label:'East approach',x:2,y:0},{id:'north',label:'North approach',x:0,y:-2}],deadline:45}};
 const b={heroes:[h],enemies:[e],context,time:2,ended:null,objective:{...clone(context.objective),pressure:27,elapsed:5,deadline:45},events:[],event(event){this.events.push(event);}};
 b.instruments=createCombatInstruments(context,b.heroes,b.enemies);return {b,h,e};
}
function charge(e,kind='strike',shape='line'){e.intent={kind,shape,label:'Reed sweep',target:kind.startsWith('objective')?'asset':1,x:0,y:0,fromX:e.x,fromY:e.y,left:2,total:2,power:20,targetKind:kind.startsWith('objective')?'objective':undefined};return e.intent;}

test('every protagonist can use portable instruments during an opening objective, without a late unlock',()=>{
 for(let id=0;id<7;id++){const {b,h,e}=setup();h.id=id;charge(e);const rows=instrumentActions(b,h,e);assert.ok(rows.find(r=>r.action==='listen').enabled);assert.ok(rows.find(r=>r.action==='record').enabled);assert.ok(rows.find(r=>r.action==='coverage').enabled);assert.ok(validInstruments(b.instruments));}
 for(const context of [{},{objective:{},friendly:true},{objective:{},tutorial:true}])assert.equal(createCombatInstruments(context).enabled,false);
});
test('listening reads real pressure and threat clocks and buys only one bounded breath per charge',()=>{
 const {b,h,e}=setup();charge(e);assert.equal(instrumentCommand(b,h,e,{action:'listen'}),true);assert.equal(h.atb,0);assert.equal(b.instruments.analysis.pressure,27);assert.equal(b.instruments.analysis.remaining,40);assert.equal(b.instruments.analysis.threats[0].enemyId,e.id);assert.equal(e.intent.left,3.2);assert.equal(b.instruments.listenUses,1);assert.ok(b.instruments.sample);assert.ok(instrumentSummary(b).includes('pressure 27'));
 h.atb=1;const before=JSON.stringify(e.intent);assert.equal(instrumentCommand(b,h,e,{action:'listen'}),false);assert.equal(h.atb,1);assert.equal(JSON.stringify(e.intent),before);assert.equal(b.instruments.sample.windup,2);b.objective.pressure=40;b.objective.elapsed=10;advanceInstruments(b,.1);assert.equal(b.instruments.analysis.pressure,40);assert.equal(b.instruments.analysis.remaining,35);charge(e);assert.ok(instrumentCommand(b,h,e,{action:'listen'}));h.atb=1;charge(e);assert.equal(instrumentCommand(b,h,e,{action:'listen'}),false);assert.equal(h.atb,1);
});
test('clay records an immutable attack pattern and retains it across encounters',()=>{
 const {b,h,e}=setup();charge(e);assert.equal(instrumentCommand(b,h,e,{action:'record'}),true);const p=clone(b.instruments.patterns[0]);e.intent.power=999;e.intent.shape='burst';e.name='Changed name';assert.deepEqual(b.instruments.patterns[0],p);const state={};assert.ok(mergeCombatMemory(state,b.instruments));const next=createCombatInstruments({...b.context,clayMemory:state.clayMemory},[h],[e]);assert.deepEqual(next.patterns,[p]);assert.ok(validInstruments(next));
 h.atb=1;e.intent.shape='line';assert.equal(instrumentCommand(b,h,e,{action:'record'}),false);assert.equal(h.atb,1);
});
test('a replay redirects exactly one matching active or future objective attack to a decoy',()=>{
 const {b,h,e}=setup();charge(e,'objective-sabotage');instrumentCommand(b,h,e,{action:'record'});const p=b.instruments.patterns[0];h.atb=1;
 assert.ok(instrumentCommand(b,h,e,{action:'replay',patternId:p.id,nodeId:'north'}));assert.equal(e.intent.instrumentDecoy,true);assert.equal(e.intent.x,0);assert.equal(e.intent.y,-2);assert.notEqual(e.intent.target,'asset');assert.equal(b.instruments.decoy.charges,0);assert.equal(e.intent.targetKind,'objective');
 const another={...e,id:'e1'},next=charge(another,'objective-sabotage');assert.equal(instrumentIntent(b,another,next),next);
 b.time+=5;advanceInstruments(b,.1);assert.equal(b.instruments.decoy,null);
});
test('unmatched families, support actions and bosses cannot consume a clay decoy',()=>{
 const {b,h,e}=setup();charge(e);instrumentCommand(b,h,e,{action:'record'});e.intent=null;h.atb=1;instrumentCommand(b,h,e,{action:'replay',patternId:b.instruments.patterns[0].id,nodeId:'north'});
 for(const [actor,intent] of [[{...e,family:'another'},charge({...e})],[e,{kind:'repair',shape:'single'}],[{...e,boss:true},charge({...e})]])assert.equal(instrumentIntent(b,actor,intent),intent);
 assert.equal(b.instruments.decoy.charges,1);const next=charge(e);assert.notEqual(instrumentIntent(b,e,next),next);assert.equal(b.instruments.decoy.charges,0);
});
test('directional coverage depends on crossing geometry, not a global shield',()=>{
 const {b,h,e}=setup();const asset=b.objective.asset;asset.objective=true;asset.hp=100;
 assert.ok(instrumentCommand(b,h,e,{action:'coverage',nodeId:'east'}));assert.equal(h.atb,0);assert.equal(b.instruments.coverageUses,1);const intent={kind:'strike',shape:'line'};
 assert.equal(interceptInstrumentHit(b,{...e,x:0,y:5},intent,asset),false);assert.equal(b.instruments.coverage[0].charges,1);
 assert.equal(interceptInstrumentHit(b,e,{...intent,shape:'burst'},asset),false);assert.equal(interceptInstrumentHit(b,{...e,x:1,y:0},intent,asset),false);
 assert.ok(interceptInstrumentHit(b,e,intent,asset));assert.equal(b.instruments.coverage[0].charges,0);assert.ok(e.status.exposed);assert.equal(interceptInstrumentHit(b,e,intent,asset),false);
 h.atb=1;assert.ok(instrumentCommand(b,h,e,{action:'coverage',nodeId:'north'}));h.atb=1;assert.equal(instrumentCommand(b,h,e,{action:'coverage',nodeId:'east'}),false);assert.equal(h.atb,1);
});
test('range and malformed actions do not spend readiness, memory or coverage capacity',()=>{
 const {b,h,e}=setup(),before=clone(b.instruments);h.x=20;assert.equal(instrumentCommand(b,h,e,{action:'coverage',nodeId:'east'}),false);assert.deepEqual(b.instruments,before);assert.equal(h.atb,1);assert.equal(instrumentCommand(b,h,e,{action:'record'}),false);assert.equal(instrumentCommand(b,h,e,{action:'replay',patternId:'missing',nodeId:'east'}),false);assert.equal(instrumentCommand(b,h,e,{action:'invent'}),false);assert.equal(h.atb,1);
});
test('listening without a charge calibrates a real mechanism instead of spending a turn on text alone',()=>{
 for(const kind of ['regulator','signal']){const {b,h,e}=setup();b.objective.kind=kind;assert.ok(instrumentCommand(b,h,e,{action:'listen'}));assert.deepEqual(b.objective.calibration,{kind:kind==='regulator'?'pressure':'relay',charges:1});h.atb=1;assert.equal(instrumentCommand(b,h,e,{action:'listen'}),false);assert.equal(h.atb,1);assert.equal(b.instruments.listenUses,1);}
 for(const kind of ['escort','supply']){const {b,h,e}=setup();b.objective.kind=kind;assert.equal(instrumentCommand(b,h,e,{action:'listen'}),false);assert.equal(h.atb,1);charge(e);assert.ok(instrumentCommand(b,h,e,{action:'listen'}));assert.equal(b.objective.calibration,undefined);}
});
test('snapshots retain finite instruments and reject orphan patterns or invalid lines',()=>{
 const {b,h,e}=setup();charge(e);instrumentCommand(b,h,e,{action:'record'});e.intent=null;h.atb=1;instrumentCommand(b,h,e,{action:'replay',patternId:b.instruments.patterns[0].id,nodeId:'north'});h.atb=1;instrumentCommand(b,h,e,{action:'coverage',nodeId:'east'});const copy=clone(b.instruments);assert.ok(validInstruments(copy));assert.deepEqual(copy,b.instruments);
 assert.ok(validInstruments(undefined));for(const mutate of [s=>s.decoy.patternId='orphan',s=>s.coverage[0].x2=1000,s=>s.coverageUses=9,s=>s.patterns.push(clone(s.patterns[0])),s=>s.safeNodes.push(clone(s.safeNodes[0]))]){const bad=clone(copy);mutate(bad);assert.equal(validInstruments(bad),false);}
});
test('persistent clay memory has a strict bounded schema and a non-mutating migration helper',()=>{
 const {b,h,e}=setup();charge(e);instrumentCommand(b,h,e,{action:'record'});const state={};mergeCombatMemory(state,b.instruments);assert.ok(validCombatMemory(state.clayMemory));assert.ok(validCombatMemory(undefined));assert.equal(validCombatMemory({version:1,patterns:[{}]}),false);assert.equal(validCombatMemory({version:2,patterns:[]}),false);const old=clone(state.clayMemory),normalized=normalizeCombatMemory([...old.patterns,{},...old.patterns]);assert.deepEqual(normalized,old);assert.deepEqual(state.clayMemory,old);const excessive={version:1,patterns:Array.from({length:9},(_,i)=>({...old.patterns[0],id:'p'+i}))};assert.equal(validCombatMemory(excessive),false);assert.equal(normalizeCombatMemory(excessive).patterns.length,8);
});
function actualBattle(kind='regulator'){
 const hero=defaultHero(1);hero.x=.5;hero.y=.5;const enemy=makeEnemy('predator',1);enemy.x=2.5;enemy.y=.5;
 const objective={id:'test-mechanism',kind,asset:{id:'asset',name:'Working regulator',x:.5,y:.5,hp:120,maxHp:120},walkable:Array.from({length:5},(_,y)=>Array.from({length:6},(_,x)=>[x,y])).flat(),safeNodes:[{id:'east',label:'East approach',x:1.5,y:.5},{id:'south',label:'South approach',x:.5,y:2.5}],required:3,deadline:60,pressure:70};
 return new Battle({heroes:[hero],enemies:[enemy],chapter:1,context:{objective,reinforcementLimit:0}});
}
test('the real Battle intent event redirects a retained sabotage pattern and prevents actual asset damage',()=>{
 const baseline=actualBattle(),normal=baseline.enemies[0];baseline.planEnemy(normal);assert.equal(normal.intent.kind,'objective-sabotage');const originalHP=baseline.objective.asset.hp;baseline.executeIntent(normal,normal.intent);assert.ok(baseline.objective.asset.hp<originalHP);
 const b=actualBattle(),h=b.heroes[0],e=b.enemies[0];b.planEnemy(e);h.atb=1;assert.ok(b.command(h.id,'instrument',e.id,{action:'record'}));const pattern=b.instruments.patterns[0];e.intent=null;h.atb=1;assert.ok(b.command(h.id,'instrument',e.id,{action:'replay',patternId:pattern.id,nodeId:'south'}));assert.equal(b.instruments.decoy.charges,1);
 // The ordinary intervening turn remains real combat; the later matching
 // objective charge is rewritten by Battle.event's actual integration hook.
 b.planEnemy(e);assert.equal(e.intent.kind,'strike');assert.equal(b.instruments.decoy.charges,1);b.executeIntent(e,e.intent);e.intent=null;b.planEnemy(e);assert.equal(e.intent.kind,'objective-sabotage');assert.ok(e.intent.instrumentDecoy);assert.notEqual(e.intent.target,b.objective.asset.id);const hp=b.objective.asset.hp,pressure=b.objective.pressure;b.executeIntent(e,e.intent);assert.equal(b.objective.asset.hp,hp);assert.equal(b.objective.pressure,pressure);assert.equal(b.instruments.decoy.charges,0);
 const snapshot=b.snapshot(),restored=actualBattle();restored.restore(snapshot);assert.deepEqual(restored.instruments,snapshot.instruments);assert.equal(restored.objective.asset.hp,hp);
});
test('hydrophone calibration changes real regulator and relay commands through Battle.command',()=>{
 const b=actualBattle(),h=b.heroes[0],e=b.enemies[0];h.atb=1;assert.ok(b.command(h.id,'instrument',e.id,{action:'listen'}));assert.deepEqual(b.objective.calibration,{kind:'pressure',charges:1});h.atb=1;assert.ok(b.command(h.id,'objective',b.objective.asset.id,{action:'stabilize'}));assert.equal(b.objective.pressure,25);assert.equal(b.objective.calibration,null);
 const relay=actualBattle('signal'),r=relay.heroes[0],foe=relay.enemies[0];r.atb=1;assert.ok(relay.command(r.id,'instrument',foe.id,{action:'listen'}));r.atb=1;assert.ok(relay.command(r.id,'objective',relay.objective.asset.id,{action:'disable'}));assert.equal(relay.objective.replyWindow,true);assert.equal(relay.objective.progress,1);relay.planEnemy(foe);relay.executeIntent(foe,foe.intent);assert.equal(relay.objective.progress,1);assert.equal(relay.objective.replyWindow,false);assert.ok(relay.objective.asset.hp<relay.objective.asset.maxHp);
});
