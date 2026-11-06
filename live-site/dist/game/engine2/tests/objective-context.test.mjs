import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../world.js';
import {source} from './opening-flow.mjs';
import {ORIGINS} from '../origin-content.js?v=5.6.0';
import {originLocation} from '../origins.js?v=5.6.0';
import {objectiveEncounterContext,settleObjectiveHistory,validObjectiveHistory} from '../objective-context.js';

const clone=value=>JSON.parse(JSON.stringify(value));
const expected=['supply','escort','regulator','supply','signal','signal','signal'];
const descriptor=(serial=1,kind)=>({type:'wild',serial,seed:serial*719,tier:1,...(kind?{objectiveKind:kind}:{})});
function place(w,o,part=0){w.newGame({originId:o.id});w.state.scene=originLocation(o.id,part);[w.state.x,w.state.y]=w.scene.arrive.map(v=>v+.5);w.state.mode='field';return w;}
function reachable(spec){
 const cells=new Set(spec.walkable.map(p=>p.join(','))),first=spec.walkable[0],q=[first],seen=new Set([first.join(',')]);
 for(let i=0;i<q.length;i++)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const p=[q[i][0]+dx,q[i][1]+dy],key=p.join(',');if(cells.has(key)&&!seen.has(key)){seen.add(key);q.push(p);}}
 return seen;
}

test('every protagonist receives an early purpose on all fourteen origin backdrops with reachable bounded geometry',()=>{
 const w=new World(source);
 for(const o of ORIGINS)for(const part of [0,1]){
  place(w,o,part);const before=JSON.stringify(w.scene),ctx=objectiveEncounterContext(w,descriptor(),{tags:['wet']}),spec=ctx.objective;
  assert.ok(spec,o.id);assert.equal(spec.kind,expected[o.hero]);assert.ok(spec.walkable.length>=3&&spec.walkable.length<=180);
  assert.ok(spec.safeNodes.length>=2);assert.equal(new Set(spec.safeNodes.map(p=>p.x+','+p.y)).size,spec.safeNodes.length);
  const seen=reachable(spec);assert.equal(seen.size,spec.walkable.length);
  for(const p of [spec.asset,...spec.route,...spec.safeNodes]){assert.equal(w.scene.floor[Math.floor(p.y)]?.[Math.floor(p.x)],'.',o.id);assert.ok(seen.has(Math.floor(p.x)+','+Math.floor(p.y)),o.id);}
  for(let i=1;i<spec.route.length;i++)assert.equal(Math.abs(spec.route[i].x-spec.route[i-1].x)+Math.abs(spec.route[i].y-spec.route[i-1].y),1,o.id);
  if(spec.kind==='escort')assert.ok(spec.route.length>=5&&spec.route.length<=9);
  assert.equal(JSON.stringify(w.scene),before,'Encounter geometry must not mutate rooms, NPCs, story markers or collisions');
  assert.ok(JSON.stringify(spec).length<9000);
 }
});

test('objective rotation preserves ordinary fights and is deterministic for a chosen journey',()=>{
 const w=place(new World(source),ORIGINS[2]);
 const first=objectiveEncounterContext(w,descriptor(1),{tags:['conductive']});
 assert.deepEqual(objectiveEncounterContext(w,descriptor(1),{tags:['conductive']}),first);
 assert.equal(objectiveEncounterContext(w,descriptor(4),{}).objective,undefined);
 const kinds=new Set(Array.from({length:15},(_,i)=>objectiveEncounterContext(w,descriptor(i+1),{}).objective?.kind).filter(Boolean));
 assert.deepEqual(kinds,new Set(['supply','escort','regulator','signal']));
 for(const type of ['boss','patrol','practice','rival','origin'])assert.equal(objectiveEncounterContext(w,{type},{}).objective,undefined);
 assert.equal(objectiveEncounterContext(w,descriptor(4,'escort'),{}).objective.kind,'escort');
});

test('repair and destiny decisions alter mechanisms, routes, timing, integrity and finite tool availability',()=>{
 const w=place(new World(source),ORIGINS[1]);
 const base={tags:['wet'],fieldProps:[{type:'jar',x:w.state.x,y:w.state.y,source:'bank'}]},before=clone(base);
 w.state.chronicle.choices={repair:0,destiny:0};const publicCtx=objectiveEncounterContext(w,descriptor(1,'escort'),base);
 w.state.chronicle.choices={repair:1,destiny:1};const privateCtx=objectiveEncounterContext(w,descriptor(1,'escort'),base);
 assert.equal(publicCtx.objective.required,2);assert.equal(privateCtx.objective.required,3);
 assert.ok(privateCtx.objective.deadline>publicCtx.objective.deadline);
 assert.ok(publicCtx.objective.asset.maxHp>privateCtx.objective.asset.maxHp);
 assert.notDeepEqual(publicCtx.objective.route,privateCtx.objective.route);
 assert.equal(privateCtx.fieldProps.length,base.fieldProps.length+1);assert.ok(privateCtx.fieldProps.some(p=>p.source.includes('Reversible')));
 assert.deepEqual(base,before,'The shared field source must remain unchanged');
 assert.ok(publicCtx.objective.provenance.some(t=>t.includes(ORIGINS[1].repair[0])));
});

test('present regional inheritance and restored infrastructure change active encounter mechanics',()=>{
 const w=place(new World(source),ORIGINS[5]);w.state.chronicle.phase='present';w.state.scene=213;w.state.chapter=5;[w.state.x,w.state.y]=w.scene.arrive.map(v=>v+.5);
 const plain=objectiveEncounterContext(w,descriptor(2,'signal'),{});
 w.state.chronicle.records=[{originId:ORIGINS[5].id,repair:0,destiny:1,effect:ORIGINS[5].effects[1]}];
 w.state.physicalLore={completed:['bell-fork']};w.state.economy={districts:{5:{works:['workshop']}}};
 const restored=objectiveEncounterContext(w,descriptor(2,'signal'),{});
 assert.ok(restored.objective.required<plain.objective.required);assert.ok(restored.objective.deadline>plain.objective.deadline);
 assert.ok(restored.fieldProps.some(p=>p.type==='coil'));
 assert.equal(restored.objective.lineage.effect,ORIGINS[5].effects[1]);
 assert.ok(restored.objective.provenance.length>=3);
});

test('objective settlement awards one modest bonus and unlocks bounded local physical aids without story mutations',()=>{
 const w=place(new World(source),ORIGINS[1]),object={...descriptor(1),scene:w.state.scene},before={xp:w.state.xp,gold:w.state.gold,items:clone(w.state.items),flags:clone(w.state.flags),chronicle:clone(w.state.chronicle)};
 const normal=objectiveEncounterContext(w,descriptor(2,'escort'),{fieldProps:[{type:'hook',x:w.state.x,y:w.state.y}]}).objective;
 const reward=settleObjectiveHistory(w.state,object,{id:'test-escort-1',kind:'escort',result:'win',nonlethal:true,integrity:83});
 assert.equal(reward.xp,16);assert.equal(reward.gold,16);assert.deepEqual(reward.items,[{id:'tonic',count:1}]);
 assert.equal(settleObjectiveHistory(w.state,object,{id:'test-escort-1',kind:'escort',result:'win'}),null);
 const aided=objectiveEncounterContext(w,descriptor(2,'escort'),{fieldProps:[{type:'hook',x:w.state.x,y:w.state.y}]}).objective;
 assert.equal(aided.asset.maxHp,normal.asset.maxHp+12);assert.ok(aided.route.length<=normal.route.length);
 for(const [i,kind]of ['regulator','supply','signal'].entries())settleObjectiveHistory(w.state,{...object,serial:i+2},{id:'test-'+kind,kind,result:'win',integrity:50});
 const geared=objectiveEncounterContext(w,descriptor(7,'regulator'),{fieldProps:[]});assert.equal(geared.objective.required,2);assert.ok(geared.fieldProps.some(p=>p.type==='plank'));
 assert.deepEqual({xp:w.state.xp,gold:w.state.gold,items:w.state.items,flags:w.state.flags,chronicle:w.state.chronicle},before);
 assert.ok(validObjectiveHistory(w.state.objectiveHistory));
});

test('finishing the purpose with living opponents earns a premium without duplicating supplies',()=>{
 const lethalState={scene:7,chapter:2},nonlethalState={scene:7,chapter:2},object={type:'wild',serial:1,scene:7};
 const lethal=settleObjectiveHistory(lethalState,object,{id:'goal-lethal',kind:'regulator',result:'win',nonlethal:false,integrity:64});
 const nonlethal=settleObjectiveHistory(nonlethalState,object,{id:'goal-nonlethal',kind:'regulator',result:'win',nonlethal:true,integrity:64});
 assert.deepEqual([lethal.xp,lethal.gold],[8,8]);assert.deepEqual([nonlethal.xp,nonlethal.gold],[16,16]);
 assert.deepEqual(nonlethal.items,lethal.items);assert.deepEqual(nonlethal.items,[{id:'coolingPaste',count:1}]);
 assert.equal(nonlethalState.objectiveHistory.aids['7'].regulator,true);assert.equal(lethalState.objectiveHistory.aids['7'].regulator,true);
 assert.equal(settleObjectiveHistory(nonlethalState,object,{id:'goal-nonlethal',kind:'regulator',result:'win',nonlethal:true}),null);
});

test('losses grant no bonus and the persistent objective account rejects malformed records and remains bounded',()=>{
 const state={scene:7,chapter:2},object={type:'wild',serial:1,scene:7};
 const loss=settleObjectiveHistory(state,object,{id:'loss-1',kind:'signal',result:'loss',integrity:0});
 assert.equal(loss.xp,0);assert.equal(loss.gold,0);assert.deepEqual(loss.items,[]);assert.deepEqual(state.objectiveHistory.aids,{});
 for(let i=2;i<150;i++)settleObjectiveHistory(state,{...object,serial:i,scene:i},{id:'win-'+i,kind:'supply',result:'win',integrity:25});
 assert.equal(state.objectiveHistory.records.length,128);assert.equal(Object.keys(state.objectiveHistory.aids).length,128);assert.ok(validObjectiveHistory(state.objectiveHistory));
 const duplicate=clone(state.objectiveHistory);duplicate.records[1].id=duplicate.records[0].id;assert.equal(validObjectiveHistory(duplicate),false);
 const badAid=clone(state.objectiveHistory);badAid.aids['2']={planet:true};assert.equal(validObjectiveHistory(badAid),false);
 assert.equal(validObjectiveHistory({version:1,records:[],aids:[]}),false);
 assert.equal(validObjectiveHistory(undefined),true);
});
