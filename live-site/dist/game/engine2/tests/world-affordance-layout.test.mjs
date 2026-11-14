import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {flow} from './opening-flow.mjs';
import {World} from '../world.js';
import {worldAffordanceObjects,worldAffordanceReservations,worldAffordanceBounds,worldAffordanceActions,worldAffordanceSummary,applyWorldAffordance,WORLD_AFFORDANCE_PROFILES,validWorldAffordances} from '../world-affordances.js?v=5.22.0';
import {outdoorLayout} from '../outdoor-layout.js?v=5.22.0';
import {buildingReservations,intersectsGroundRect} from '../environmental-grounding.js?v=5.22.0';
import {affordanceArtSpec} from '../affordance-art.js';
import {isObservatoryScene} from '../observatory-layout.js';

const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/world-affordance-availability.json',import.meta.url))),{w}=flow();
const clone=v=>JSON.parse(JSON.stringify(v));
function enter(scene){w.state.scene=scene.location;w.state.x=scene.arrive[0]+.5;w.state.y=scene.arrive[1]+.5;w.state.mode='field';delete w.state.worldAffordances;w.state.gold=0;w.state.items={tonic:0,ether:0,revive:0};return worldAffordanceObjects(w);}
function component(scene,blocked=null){
 const cells=[];for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++)if(scene.floor[y][x]==='.')cells.push([x,y]);
 if(!cells.length)return new Set();const start=cells.sort((a,b)=>Math.hypot(a[0]-scene.arrive[0],a[1]-scene.arrive[1])-Math.hypot(b[0]-scene.arrive[0],b[1]-scene.arrive[1]))[0],queue=[start],seen=new Set([start.join(',')]);
 for(let i=0;i<queue.length;i++)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const p=[queue[i][0]+dx,queue[i][1]+dy],k=p.join(',');if(scene.floor[p[1]]?.[p[0]]==='.'&&!seen.has(k)&&k!==blocked?.join(',')){seen.add(k);queue.push(p);}}
 return seen;
}
function approach(object){
 const cells=[];for(let y=object.xy[1]-2;y<=object.xy[1]+2;y++)for(let x=object.xy[0]-2;x<=object.xy[0]+2;x++)if(Math.hypot(x-object.xy[0],y-object.xy[1])<=2.2&&w.walkable(x+.5,y+.5)&&!w.scene.affordanceBlocked?.some(p=>p[0]===x&&p[1]===y))cells.push([x,y]);
 cells.sort((a,b)=>Math.hypot(a[0]-object.xy[0],a[1]-object.xy[1])-Math.hypot(b[0]-object.xy[0],b[1]-object.xy[1]));assert.ok(cells.length,object.affordanceId+' approach');[w.state.x,w.state.y]=cells[0].map(n=>n+.5);
}
function use(object,action){approach(object);const result=applyWorldAffordance(w,object,action);assert.equal(result.ok,true,object.affordanceId+' '+action.action+': '+result.notice);return result;}

test('finite IDs survive on all 165 generated scenes while authored observatories retain existing paid ledgers without random stock',()=>{
 let sites=0,authored=0,generated=0;
 for(const scene of w.data.scenes){const before=JSON.stringify([scene.floor,scene.objects,scene.doors]),objects=enter(scene),ids=new Set(objects.map(o=>o.affordanceId));
  if(isObservatoryScene(scene)){
   authored++;assert.ok([50012,50013].includes(scene.location));assert.deepEqual(objects,[]);assert.deepEqual(worldAffordanceReservations(scene),[]);assert.deepEqual(scene.affordanceBlocked,[]);
   Object.assign(w.state.worldAffordances,{kit:{plank:2,hook:1,bell:0,jar:3,coil:1,reed:0},sources:baseline[scene.location].filter(s=>s.startsWith('salvage-')).map(s=>'aff-'+scene.location+'-'+s),knowledge:['vane-relay'],sites:{['aff-'+scene.location+'-site']:{solved:true,progress:0}},plans:{[scene.location]:{plan:'quiet',packed:'coil',spent:false}}});
   const paid=clone(w.state.worldAffordances);assert.equal(validWorldAffordances(paid),true);assert.deepEqual(worldAffordanceObjects(w),[]);assert.deepEqual(w.state.worldAffordances,paid,'retiring generated placement must preserve acquired tools, knowledge, solved history and paid preparation');
  }else{generated++;for(const suffix of baseline[scene.location])assert.ok(ids.has('aff-'+scene.location+'-'+suffix),scene.key+' '+suffix);}
  if(objects.some(o=>o.affordanceKind==='site'))sites++;
  assert.equal(JSON.stringify([scene.floor,scene.objects,scene.doors]),before);
 }
 // Every baseline affordance ID above remains present. The additional open area
  // makes a previously unavailable but safe optional repair site placeable.
  assert.equal(authored,2);assert.equal(generated,165);assert.equal(sites,165);
});

test('every repair closes only an optional tile while keeping all other original reachable floor',()=>{
 for(const scene of w.data.scenes){const objects=enter(scene),original=component(scene),site=objects.find(o=>o.affordanceKind==='site');
  for(const o of objects)assert.ok(original.has(o.xy.join(',')),o.affordanceId+' reachable');
  if(!site)continue;const around=component(scene,site.xy);assert.equal(around.size,original.size-1,site.affordanceId);
  for(const k of original)if(k!==site.xy.join(','))assert.ok(around.has(k),site.affordanceId+' cannot sever '+k);
 }
});

test('generated repair, stock and listening silhouettes clear architecture and the shared scenery plan',()=>{
 for(const scene of w.data.scenes){const before=JSON.stringify(scene),planned=worldAffordanceReservations(scene);assert.equal(JSON.stringify(scene),before,'reservations are read-only');const composition=outdoorLayout(scene),fixed=[...buildingReservations(scene).flatMap(b=>[b.visual,b.approach]),...[...composition.sites,...composition.trees,...composition.landmarks].map(o=>o.bounds)];
  for(const p of planned){assert.ok(!fixed.some(b=>intersectsGroundRect(p.bounds,b,.14)),scene.key+' '+p.id);for(const q of planned)if(q!==p)assert.ok(!intersectsGroundRect(p.bounds,q.bounds),p.id+' / '+q.id);}
  const objects=enter(scene);for(const o of objects){const expected=worldAffordanceBounds(scene,o),plannedObject=planned.find(p=>p.id===o.affordanceId);assert.deepEqual(plannedObject.bounds,expected);const art=affordanceArtSpec(scene,o);if(art){assert.ok(art.width/48<=expected.w);assert.ok(art.height/48<=expected.h);}}
 }
});

test('every canonical repair remains actionable and pays the unchanged finite reward once',()=>{
 for(const scene of w.data.scenes){const objects=enter(scene),site=objects.find(o=>o.affordanceKind==='site');if(!site)continue;const profile=WORLD_AFFORDANCE_PROFILES.find(p=>p.id===site.profileId),sources=objects.filter(o=>o.affordanceKind==='salvage');
  for(const o of sources){use(o,{action:'take'});const stock=clone(w.state.worldAffordances);assert.equal(applyWorldAffordance(w,o,{action:'take'}).ok,false);assert.deepEqual(w.state.worldAffordances,stock);}
  let result;if(profile.primary.every(t=>w.state.worldAffordances.kit[t]>0))result=use(site,{action:'assemble'});else for(const beat of profile.pattern)result=use(site,{action:'beat',beat});
  assert.deepEqual(result.reward,{gold:8,item:profile.effect==='grounded'?'ether':'tonic',count:1});assert.equal(w.state.gold,8);assert.equal(w.state.items[result.reward.item],1);assert.equal(w.state.worldAffordances.sites[site.affordanceId].solved,true);assert.deepEqual(w.scene.affordanceBlocked,[]);
  const saved=clone(w.state);assert.equal(applyWorldAffordance(w,site,{action:'assemble'}).ok,false);assert.deepEqual(w.state,saved);assert.ok(validWorldAffordances(saved.worldAffordances));
 }
});

test('real World save and restore retain partial rhythm, finite stock, repaired state and scouting',()=>{
 const world=new World(w.sourceData),scene=world.scenes.get(5);world.state.scene=5;world.state.x=scene.arrive[0]+.5;world.state.y=scene.arrive[1]+.5;world.state.mode='field';
 const objects=worldAffordanceObjects(world),site=objects.find(o=>o.affordanceKind==='site'),source=objects.find(o=>o.affordanceKind==='salvage'),scout=objects.find(o=>o.affordanceKind==='scout'),profile=WORLD_AFFORDANCE_PROFILES.find(p=>p.id===site.profileId);
 const run=(o,r)=>{const p=[[o.xy[0],o.xy[1]+1],[o.xy[0]-1,o.xy[1]],[o.xy[0]+1,o.xy[1]],[o.xy[0],o.xy[1]-1]].find(p=>world.walkable(p[0]+.5,p[1]+.5));assert.ok(p);[world.state.x,world.state.y]=p.map(n=>n+.5);const result=applyWorldAffordance(world,o,r);assert.equal(result.ok,true,result.notice);return result;};
 run(source,{action:'take'});run(site,{action:'beat',beat:profile.pattern[0]});run(scout,{action:'scout'});run(scout,{action:'prepare',plan:'quiet'});
 const before=clone(world.state.worldAffordances),saved=world.save();world.restore(saved);assert.deepEqual(world.state.worldAffordances,before);assert.equal(worldAffordanceObjects(world).find(o=>o.affordanceId===source.affordanceId).solved,true);
 for(const beat of profile.pattern.slice(1))run(site,{action:'beat',beat});const completed=clone(world.state.worldAffordances),gold=world.state.gold,items=clone(world.state.items);world.restore(world.save());assert.deepEqual(world.state.worldAffordances,completed);assert.equal(world.state.gold,gold);assert.deepEqual(world.state.items,items);assert.equal(worldAffordanceObjects(world).find(o=>o.affordanceId===site.affordanceId).solved,true);assert.deepEqual(world.scene.affordanceBlocked,[]);
});

test('the town burrow and listening point use compact honest silhouettes in one work patch',()=>{
 const scene=w.scenes.get(5),objects=enter(scene),site=objects.find(o=>o.affordanceKind==='site'),scout=objects.find(o=>o.affordanceKind==='scout');assert.equal(site.art,'burrow');assert.equal(scout.art,'hydrophone');assert.equal(affordanceArtSpec(scene,site),null);assert.equal(affordanceArtSpec(scene,scout),null);
 for(const o of objects){assert.ok(Math.hypot(o.xy[0]-site.xy[0],o.xy[1]-site.xy[1])<=4.5);assert.ok(!buildingReservations(scene).some(b=>intersectsGroundRect(worldAffordanceBounds(scene,o),b.visual)));}
});


test('home repairs have domestic floorboard presentation while retaining profile recipes, bounds and rewards',()=>{
 const profiles=JSON.stringify(WORLD_AFFORDANCE_PROFILES);
 for(const [id,profileId,label]of [[2,'rootwalk','Loose floorboard'],[50000,'burrow-trail','Underfloor maintenance patch']]){
  const scene=w.scenes.get(id),objects=enter(scene),site=objects.find(o=>o.affordanceKind==='site'),profile=WORLD_AFFORDANCE_PROFILES.find(p=>p.id===profileId);assert.ok(site);assert.equal(site.profileId,profileId);assert.equal(site.art,'floorboard');assert.equal(site.label,label);assert.equal(site.reservationArt,profile.art);
  const summary=worldAffordanceSummary(w,site);assert.equal(summary.label,label);assert.equal(summary.text,site.text);assert.ok(!/causeway|short trail|rootwalk|grove/i.test(summary.label+' '+summary.text+' '+summary.status));
  const recipe=worldAffordanceActions(w,site).find(a=>a.action==='assemble');assert.equal(recipe.recipe,profileId);assert.ok(!/root|causeway|trail/i.test(recipe.label));
  for(const tool of profile.primary)w.state.worldAffordances.kit[tool]=1;const result=use(site,{action:'assemble'});assert.deepEqual(result.reward,{gold:8,item:'tonic',count:1});assert.equal(w.state.gold,8);assert.equal(w.state.items.tonic,1);assert.ok(profile.primary.every(tool=>w.state.worldAffordances.kit[tool]===0));assert.ok(w.state.worldAffordances.knowledge.includes(profileId));assert.ok(result.notice.includes(label));assert.ok(!/causeway|short trail|rootwalk|grove/i.test(result.notice));assert.ok(validWorldAffordances(w.state.worldAffordances));
 }
 assert.equal(JSON.stringify(WORLD_AFFORDANCE_PROFILES),profiles);
});
