import test from 'node:test';
import assert from 'node:assert/strict';
import {cityAnswerContext,cityAnswerView,cityAnswerEpilogue,validCityAnswerContext} from '../city-answer.js';
import {ORIGINS} from '../origin-content.js';
import {activateOriginSupport} from '../origin-payoffs.js';
import {economyState,buildCivic,acceptShipment,encounterSalvage,deliverShipment} from '../economy.js';

const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);for(const v of Object.values(value))freeze(v);}return value;};
const workState=works=>({chapter:24,party:[0,1,2],answeringNetwork:{version:1,works,heard:[]}});
const ids=s=>cityAnswerContext(s).contributions.map(c=>c.id);

test('missing, legacy and preparatory history cannot invent community help or mutate the journey',()=>{
 const legacy={chapter:24,bosses:Array.from({length:24},(_,i)=>i+1),party:[2,0,1],economy:{heritageWorks:72,stamps:['common-thread'],districts:{}},encore:{history:[{restorations:['anything']}]},answeringNetwork:{version:1,works:['chapel-inspected','root-installed','heat-diverted','water-opened','relays-opened','assembly-posted'],heard:['heat-established']}};
 const before=JSON.stringify(legacy);freeze(legacy);
 for(const s of [undefined,null,{},legacy]){assert.deepEqual(ids(s),[]);assert.ok(validCityAnswerContext(cityAnswerContext(s)));assert.match(cityAnswerView(s).summary,/no community work is required/);}
 cityAnswerEpilogue(legacy);assert.equal(JSON.stringify(legacy),before);
});

test('completed return works share one pause while distinct relays and the public board earn different help',()=>{
 const s=workState(['chapel-return','heat-independent','water-return','relays-distinct','assembly-return','invented-work']);
 const c=cityAnswerContext(s);assert.deepEqual(c.contributions.map(v=>v.id),['return','witness','commons']);assert.equal(c.contributions[0].sources.length,3);
 const view=cityAnswerView(s);assert.deepEqual(view.contributions.map(v=>v.kind),['delay','opening','recovery']);assert.equal(view.contributions[0].sourceLabels.length,3);assert.match(view.contributions[1].detail,/another crew member/i);
 assert.deepEqual(cityAnswerContext({...s,chronicle:{phase:'past'}}).contributions,[]);assert.deepEqual(cityAnswerContext({...s,fieldOrigins:{active:{}}}).contributions,[]);
});

test('only opened Chapel aftercare qualifies; a prepared legacy fight alone creates no shelter or witness',()=>{
 const s={chapter:24,bosses:[4],bellWitness:{preparation:'shelter'}};assert.deepEqual(ids(s),[]);
 s.bellWitness.works={inletClosed:true,drainClear:true,returnFreed:true,tested:true};assert.deepEqual(ids(s),[]);
 s.bellWitness.aftercare='shelter-open';assert.deepEqual(ids(s),['care']);
 s.bellWitness.aftercare='witness-route';assert.deepEqual(ids(s),[]);
 s.bellWitness.preparation='lure';assert.deepEqual(ids(s),['witness']);
 s.bosses=[];assert.deepEqual(ids(s),[]);
});

test('actual civic purchases and a completed shipment contribute; cargo accepted or inherited seals do not',()=>{
 const s={chapter:24,mode:'field',gold:10000,items:{}};Object.assign(economyState(s).goods,{glass:12,metal:12,fiber:12});
 assert.ok(acceptShipment(s,2));assert.deepEqual(ids(s),[]);const shipment=s.economy.shipments[0];
 encounterSalvage(s,{key:'first-road',type:'patrol'});encounterSalvage(s,{key:'second-road',type:'patrol'});assert.ok(deliverShipment(s,1,shipment.id));assert.deepEqual(ids(s),['commons']);
 assert.ok(buildCivic(s,1,'water'));assert.ok(buildCivic(s,1,'workshop'));assert.ok(buildCivic(s,2,'commons'));
 assert.deepEqual(ids(s),['care','commons']);const c=cityAnswerContext(s);assert.ok(c.contributions.find(v=>v.id==='commons').sources.some(id=>id.startsWith('delivery:')));
 const unchanged=JSON.stringify(s);freeze(s);cityAnswerView(s);cityAnswerEpilogue(s);assert.equal(JSON.stringify(s),unchanged);
});

test('an origin choice must become an explicitly activated matching service before it answers',()=>{
 for(const origin of ORIGINS){
  const record={originId:origin.id,destiny:0,effect:origin.effects[0]},s={chapter:24,chronicle:{phase:'present',originId:origin.id,records:[record]}};
  assert.deepEqual(ids(s),[]);assert.ok(activateOriginSupport(s,record));assert.equal(ids(s).length,1);assert.ok(cityAnswerContext(s).contributions[0].sources.includes('origin:'+record.effect));
  record.destiny=1;assert.deepEqual(ids(s),[],'mismatched historical evidence is not a service');
 }
});

test('all seven selected leads and legacy origin identities are respected without consuming a private recording choice',()=>{
 const names=['Sable','Iona','Rook','Brass','Riven','Mira','Veyr'];
 for(let hero=0;hero<7;hero++){
  const s={...workState(['water-return']),journey:{hero},party:[(hero+1)%7],story:{finalChoice:1},chronicle:{originId:ORIGINS.find(o=>o.hero===(hero+2)%7).id}};
  const first=cityAnswerEpilogue(freeze(s));assert.ok(first[0].startsWith(names[hero]));assert.match(first.at(-1),/private recording/);
  assert.deepEqual(cityAnswerEpilogue({...s,story:{finalChoice:2}}),first,'city help cannot choose the family recording outcome');
  const origin=ORIGINS.find(o=>o.hero===hero),legacy={chronicle:{originId:origin.id,hero:(hero+1)%7},party:[(hero+2)%7]};assert.equal(cityAnswerContext(legacy).lead,hero);assert.ok(cityAnswerEpilogue(legacy)[0].startsWith(names[hero]));
 }
 assert.equal(cityAnswerContext({journey:{hero:99},chronicle:{hero:4},party:[0]}).lead,4);
});

test('serialized contributions reject invented sources, duplicate uses and protection assigned to an absent hero',()=>{
 const c=cityAnswerContext(workState(['water-return','relays-distinct','assembly-return']));assert.ok(validCityAnswerContext(JSON.parse(JSON.stringify(c))));
 for(const change of [v=>v.contributions[0].sources.push('network:water-opened'),v=>v.contributions.push(v.contributions[0]),v=>v.used=['return','return'],v=>v.used=['care'],v=>v.careUsed=[0],v=>v.lead=7]){const v=JSON.parse(JSON.stringify(c));change(v);assert.equal(validCityAnswerContext(v),false);}
 const care=cityAnswerContext({economy:{districts:{1:{works:['water']}}}});care.careUsed=[2];assert.equal(validCityAnswerContext(care,[{id:0},{id:1}]),false);
});
