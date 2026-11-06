import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD_AFFORDANCE_PROFILES,worldAffordanceObjects,worldAffordanceActions,worldAffordanceSummary,applyWorldAffordance,isWalkableOverride,applyAffordanceScene,affordanceEncounterContext,applyAffordancePreparation,modifyPreparedIntent,settleAffordanceEncounter,affordanceKnowledgeLegacy,validWorldAffordances} from '../world-affordances.js';

const clone=v=>JSON.parse(JSON.stringify(v));
function fixture(profile='ground-loop',location=7){
 const p=WORLD_AFFORDANCE_PROFILES.find(p=>p.id===profile),width=22,height=20,floor=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>!x||!y||x===width-1||y===height-1?'#':'.').join(''));
 const scene={location,width,height,floor,arrive:[2,2],key:'workshop',encounterHabitat:p.habitat,chapter:1,objects:[{type:'portal',xy:[2,1],to:'elsewhere'},{type:'npc',xy:[5,4],label:'Keeper'},{type:'puzzle',xy:[8,8],bit:2}]};
 return {scene,state:{scene:location,chapter:1,mode:'field',x:2.5,y:2.5,party:[0],items:{tonic:0,ether:0},gold:0,flags:{}},walkable(x,y){return this.scene.floor[Math.floor(y)]?.[Math.floor(x)]==='.';}};
}
function stand(w,o){w.state.x=o.xy[0]+.5;w.state.y=o.xy[1]+1.5;}
function use(w,o,row){stand(w,o);return applyWorldAffordance(w,o,row);}
function object(w,kind){return worldAffordanceObjects(w).find(o=>o.affordanceKind===kind);}
function takeAll(w){for(const o of worldAffordanceObjects(w).filter(o=>o.affordanceKind==='salvage'))assert.equal(use(w,o,{action:'take'}).ok,true);}
function connected(w,blocked){const start=w.scene.arrive,q=[start],seen=new Set([start.join(',')]);for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const p=[q[i][0]+dx,q[i][1]+dy],key=p.join(',');if(seen.has(key)||blocked&&key===blocked.join(',')||!w.walkable(p[0]+.5,p[1]+.5))continue;seen.add(key);q.push(p);}return seen;}

test('twelve authored site families use real reachable floor without disconnecting original story markers',()=>{
 assert.equal(WORLD_AFFORDANCE_PROFILES.length,12);
 for(const [i,p]of WORLD_AFFORDANCE_PROFILES.entries()){
  const w=fixture(p.id,100+i),before=clone(w.scene.floor),objects=worldAffordanceObjects(w),site=objects.find(o=>o.affordanceKind==='site');
  assert.equal(objects.length,4,p.id);assert.equal(site.profileId,p.id);
  assert.equal(new Set(objects.map(o=>o.xy.join(','))).size,4);
  const all=connected(w),around=connected(w,site.xy);assert.equal(around.size,all.size-1,p.id);
  for(const o of objects){assert.ok(all.has(o.xy.join(',')));assert.ok(w.scene.objects.every(v=>Math.hypot(o.xy[0]-v.xy[0],o.xy[1]-v.xy[1])>=1.5));}
  for(const marker of w.scene.objects)assert.ok(around.has(marker.xy.join(',')));
  assert.deepEqual(w.scene.floor,before,'No new wall may replace authored scenery');
  assert.ok(validWorldAffordances(w.state.worldAffordances));
 }
});

test('all seven selectable origin journeys receive an appropriate tool and route model',()=>{
 const origins=['sable-reed','iona-lowbank','rook-regulator','brass-rail','riven-tide','mira-archive','veyr-storm'];
 for(const [i,id]of origins.entries()){
  const w=fixture('ground-loop',50000+i*2);w.scene.originId=id;
  const objects=worldAffordanceObjects(w);assert.equal(objects.filter(o=>o.affordanceKind==='salvage').length,2,id);assert.ok(objects.some(o=>o.affordanceKind==='site'),id);
 }
});

test('each finite source can be carried only once and range failures leave resources unchanged',()=>{
 const w=fixture(),o=object(w,'salvage'),before=clone(w.state);
 w.state.x=20;w.state.y=18;assert.equal(applyWorldAffordance(w,o,{action:'take'}).ok,false);assert.equal(w.state.worldAffordances.kit[o.toolType],0);
 assert.equal(use(w,o,{action:'take'}).ok,true);assert.equal(w.state.worldAffordances.kit[o.toolType],1);
 assert.equal(use(w,o,{action:'take'}).ok,false);assert.equal(w.state.worldAffordances.kit[o.toolType],1);
 assert.deepEqual(w.state.flags,before.flags);assert.equal(w.state.gold,before.gold);
 w.state.mode='battle';assert.equal(applyWorldAffordance(w,o,{action:'take'}).ok,false);
});

test('two-part assemblies consume real tools, open a physical shortcut and award salvage exactly once',()=>{
 for(const p of WORLD_AFFORDANCE_PROFILES){
  const w=fixture(p.id),site=object(w,'site');takeAll(w);w.state.x=2.5;w.state.y=2.5;
  assert.equal(isWalkableOverride(w,site.xy[0]+.5,site.xy[1]+.5),false);
  assert.deepEqual(applyAffordanceScene(w),[site.xy]);
  const out=use(w,site,{action:'assemble'});assert.equal(out.ok,true,p.id);assert.equal(out.deed.kind,'repair');
  for(const t of p.primary)assert.equal(w.state.worldAffordances.kit[t],0);
  assert.equal(isWalkableOverride(w,site.xy[0]+.5,site.xy[1]+.5),null);assert.deepEqual(w.scene.affordanceBlocked,[]);
  assert.equal(w.state.gold,8);assert.equal(w.state.items[out.reward.item],1);
  assert.equal(use(w,site,{action:'assemble'}).ok,false);assert.equal(w.state.gold,8);
  assert.ok(validWorldAffordances(w.state.worldAffordances));
 }
});

test('a single fitting tool is a complete alternative to assembly, with no disguised recipe requirement',()=>{
 const w=fixture('echo-gallery'),site=object(w,'site'),p=WORLD_AFFORDANCE_PROFILES.find(p=>p.id===site.profileId);
 w.state.worldAffordances.kit[p.alternate]=1;
 assert.equal(use(w,site,{action:'use-tool',tool:'coil'}).ok,false);
 assert.equal(use(w,site,{action:'use-tool',tool:p.alternate}).ok,true);
 assert.equal(w.state.worldAffordances.kit[p.alternate],0);assert.equal(worldAffordanceSummary(w,site).solved,true);
});

test('knowledge gates accept the actual rhythm immediately without prerequisite flags or inventory',()=>{
 for(const p of WORLD_AFFORDANCE_PROFILES){
  const w=fixture(p.id),site=object(w,'site');
  const before=clone(w.state.flags);assert.equal(w.state.worldAffordances.knowledge.length,0);
  for(const beat of p.pattern){const row=worldAffordanceActions(w,site).find(r=>r.action==='beat'&&r.beat===beat);stand(w,site);assert.equal(applyWorldAffordance(w,site,row).ok,true);}
  assert.equal(worldAffordanceSummary(w,site).solved,true,p.id);assert.deepEqual(w.state.flags,before);
  assert.ok(Object.values(w.state.worldAffordances.kit).every(n=>n===0));
  assert.ok(w.state.worldAffordances.knowledge.includes(p.id));
 }
});

test('incorrect notes reset the physical sequence and knowledge alone survives a new telling',()=>{
 const w=fixture('index-gate'),site=object(w,'site');
 use(w,site,{action:'beat',beat:1});assert.equal(worldAffordanceSummary(w,site).progress,1);
 use(w,site,{action:'beat',beat:2});assert.equal(worldAffordanceSummary(w,site).progress,0);
 const listen=use(w,site,{action:'listen'});assert.deepEqual(listen.pattern,[1,0,2]);
 takeAll(w);const inherited=affordanceKnowledgeLegacy(w.state);
 assert.deepEqual(inherited.knowledge,['index-gate']);assert.ok(Object.values(inherited.kit).every(n=>n===0));assert.deepEqual(inherited.sources,[]);assert.deepEqual(inherited.sites,{});assert.deepEqual(inherited.plans,{});
 assert.ok(validWorldAffordances(inherited));
 const again=fixture('index-gate',8);again.state.worldAffordances=inherited;const gate=object(again,'site');assert.deepEqual(worldAffordanceSummary(again,gate).pattern,[1,0,2]);
 for(const beat of [1,0,2])use(again,gate,{action:'beat',beat});assert.equal(worldAffordanceSummary(again,gate).solved,true);
});

test('scouting provides partial evidence and one quiet approach changes actual clocks and reinforcement budget',()=>{
 const w=fixture(),scout=object(w,'scout');assert.equal(use(w,scout,{action:'prepare',plan:'quiet'}).ok,false);
 const heard=use(w,scout,{action:'scout'});assert.equal(heard.evidence.length,2);assert.ok(heard.evidence.every(t=>typeof t==='string'));
 const plan=use(w,scout,{action:'prepare',plan:'quiet'});assert.equal(plan.ok,true);assert.equal(plan.deed.kind,'scouting');
 const o={type:'wild',serial:1,seed:51},base={tags:['wet'],reinforcementLimit:2},ctx=affordanceEncounterContext(w,o,base);
 assert.equal(ctx.reinforcementLimit,1);assert.equal(ctx.recon.enemyDelay,.75);assert.deepEqual(base,{tags:['wet'],reinforcementLimit:2});
 const b={context:ctx,heroes:[{x:w.state.x,y:w.state.y}],enemies:[{id:'e0',x:4.5,y:4.5,atb:.05}]};
 assert.equal(applyAffordancePreparation(b),true);const first=modifyPreparedIntent(b,b.enemies[0],{kind:'strike',left:1.2,total:1.2,label:'Pounce'});
 assert.equal(first.left,1.95);assert.equal(modifyPreparedIntent(b,b.enemies[0],{left:1,total:1}).left,1);
 assert.equal(applyAffordancePreparation(b),false);
 assert.equal(use(w,scout,{action:'prepare',plan:'quiet'}).ok,false);
 const later=affordanceEncounterContext(w,{...o,serial:2},base);assert.equal(later.recon,undefined);
 assert.equal(settleAffordanceEncounter(w.state,o,'win').result,'win');assert.equal(settleAffordanceEncounter(w.state,o,'win'),null);
 assert.ok(validWorldAffordances(w.state.worldAffordances));
});

test('side-entry preparations relocate creatures to legal unoccupied floor and reed chimes buy an objective window',()=>{
 for(const kind of ['flank','lure']){
  const w=fixture(),scout=object(w,'scout');w.state.worldAffordances.kit.hook=1;w.state.worldAffordances.kit.bell=1;w.state.worldAffordances.kit.reed=1;
  use(w,scout,{action:'scout'});assert.equal(use(w,scout,{action:'prepare',plan:kind}).ok,true);
  const base={objective:{deadline:40,asset:{x:2.5,y:2.5,hp:100,maxHp:100}},fieldProps:[]},ctx=affordanceEncounterContext(w,{type:'wild',serial:1},base);
  assert.equal(ctx.objective.deadline,kind==='lure'?48:40);assert.equal(base.objective.deadline,40);
  const b={context:ctx,heroes:[{x:w.state.x,y:w.state.y}],objective:ctx.objective,enemies:[{id:'e0',x:2.5,y:2.5},{id:'e1',x:2.5,y:2.5},{id:'boss',boss:true,x:2.5,y:2.5}]};
  applyAffordancePreparation(b);
  for(const e of b.enemies.filter(e=>!e.boss)){assert.ok(w.walkable(e.x,e.y));assert.ok(Math.hypot(e.x-w.state.x,e.y-w.state.y)>=1);assert.ok(Math.hypot(e.x-2.5,e.y-2.5)>=1);}
  assert.notDeepEqual([b.enemies[0].x,b.enemies[0].y],[b.enemies[1].x,b.enemies[1].y]);assert.deepEqual([b.enemies[2].x,b.enemies[2].y],[2.5,2.5]);
 }
});

test('packing transfers one finite kit tool into the contested field and repeats cannot duplicate it',()=>{
 const w=fixture(),salvage=object(w,'salvage');use(w,salvage,{action:'take'});const type=salvage.toolType;
 assert.equal(use(w,salvage,{action:'pack',tool:type}).ok,true);assert.equal(w.state.worldAffordances.kit[type],0);
 assert.equal(use(w,salvage,{action:'pack',tool:type}).ok,false);
 const o={type:'wild',serial:1,seed:7},base={fieldProps:Array.from({length:6},(_,i)=>({id:'old'+i,type:'bell',x:2.5,y:2.5}))};
 const ctx=affordanceEncounterContext(w,o,base),again=affordanceEncounterContext(w,o,base);
 assert.equal(ctx.fieldProps.length,6);assert.equal(ctx.fieldProps[0].type,type);assert.ok(ctx.fieldProps[0].source.includes('travel kit'));assert.deepEqual(ctx,again);
 assert.equal(affordanceEncounterContext(w,{...o,serial:2},base).fieldProps[0].id,'old0');
});

test('restored local infrastructure changes later encounter conditions and preserves story flags',()=>{
 const w=fixture('ground-loop'),site=object(w,'site'),before=clone(w.state.flags);takeAll(w);use(w,site,{action:'assemble'});
 const ctx=affordanceEncounterContext(w,{type:'wild',serial:1},{tags:[],objective:{asset:{hp:90,maxHp:100},provenance:[]}});
 assert.ok(ctx.tags.includes('grounded'));assert.ok(ctx.tags.includes('prepared'));assert.equal(ctx.objective.asset.hp,98);assert.equal(ctx.objective.asset.maxHp,108);assert.ok(ctx.objective.provenance.length);
 assert.deepEqual(w.state.flags,before);
 const freshWorld=fixture();delete freshWorld.state.worldAffordances;
 assert.deepEqual(affordanceEncounterContext(freshWorld,{type:'boss'},{tags:[]}),{tags:[]});assert.equal(freshWorld.state.worldAffordances,undefined);
});

test('persistent kit, route, knowledge and preparation records reject malformed or duplicating saves',()=>{
 const w=fixture(),o=object(w,'salvage');use(w,o,{action:'take'});const v=w.state.worldAffordances;assert.ok(validWorldAffordances(clone(v)));
 for(const mutate of [v=>v.kit.coil=-1,v=>v.kit.reed=31,v=>v.kit.banana=1,v=>v.sources.push(v.sources[0]),v=>v.knowledge.push('unwritten-recipe'),v=>v.sites['aff-7-site']={solved:false,progress:3},v=>v.plans['7']={plan:'teleport'},v=>v.records=[{id:'x',scene:7,plan:'quiet',packed:'banana',result:'win'}]]){const bad=clone(v);mutate(bad);assert.equal(validWorldAffordances(bad),false);}
 assert.equal(validWorldAffordances(undefined),true);
});

test('a legacy player standing on an unrepaired optional tile is never enclosed by its collision',()=>{
 const w=fixture(),site=object(w,'site');w.state.x=site.xy[0]+.5;w.state.y=site.xy[1]+.5;
 assert.equal(isWalkableOverride(w,w.state.x,w.state.y),null);assert.deepEqual(applyAffordanceScene(w),[]);
 w.state.x=2.5;w.state.y=2.5;assert.equal(isWalkableOverride(w,site.xy[0]+.5,site.xy[1]+.5),false);
});
