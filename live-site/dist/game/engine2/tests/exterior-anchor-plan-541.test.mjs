import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../world.js';
import {source} from './opening-flow.mjs';
import {installReconciledGround} from '../reconciled-ground.js';
import {installLivingAtlas} from '../living-atlas.js';
import {installTrailLife} from '../reconciled-travel.js';
import {installTownLife} from '../townlife.js';
import {installRegionalLife} from '../regional-life.js';
import {installEmbodiedOrigins,replacesEmbodiedOriginObject} from '../embodied-origins.js';
import {installCampaignActuators} from '../campaign-actuators.js';
import {createWorldControls} from '../world-controls.js';
import {adventureLandscapePlan} from '../adventure-landscape.js';
import {buildingReservations,intersectsGroundRect} from '../environmental-grounding.js';
import {isExteriorArtScene} from '../exterior-art-selection-541.js';
import {exteriorAnchorSites} from '../exterior-anchor-plan-541.js';

const key=(x,z)=>x+','+z;
function setup(){
 const world=new World(source);installReconciledGround(world);installLivingAtlas(world);installTrailLife(world);installTownLife(world);installRegionalLife(world);
 const origins=installEmbodiedOrigins(world),campaign=installCampaignActuators(world);world.worldControls=createWorldControls(world,origins,campaign);
 const native=world.objects.bind(world);world.objects=()=>[...native().filter(o=>!replacesEmbodiedOriginObject(world,o)),...world.embodiedOrigins.objects()];return world;
}
function enter(world,id){
 world.newGame({quiet:true});world.state.scene=id;world.state.chapter=world.scene.chapter||1;world.state.mode='field';const s=world.scene,a=s.authoredOpening?.arrival,b=s.arrive;
 if(a?.length===2&&world.walkable(...a))[world.state.x,world.state.y]=a;else[world.state.x,world.state.y]=[b[0]+.5,b[1]+.5];
 world.objects();world.livingAtlas.runtime();world.embodiedOrigins.snapshot();return world.objects();
}
function terrainCells(landscape){const map=new Map();for(const r of landscape.terraces)for(let z=r.z;z<r.z+r.h;z++)for(let x=r.x;x<r.x+r.w;x++)map.set(key(x,z),{y:r.height,water:r.water});return map;}
function validate(sites,scene,objects,landscape){
 assert.ok(sites.length>0&&sites.length<=12);const blocked=new Set((scene.affordanceBlocked||[]).map(p=>key(...p))),terrain=terrainCells(landscape),rects=buildingReservations(scene).flatMap(b=>b.groundRects);
 rects.push(...objects.filter(o=>o.footprint).map(o=>o.footprint));
 for(let i=0;i<sites.length;i++){
  const p=sites[i];assert.ok([p.x,p.z,p.y,p.index,p.radius].every(Number.isFinite));assert.equal(p.index,i);assert.equal(p.radius,p.slim?.34:1.36);
  assert.ok(Math.hypot(p.x-p.anchor[0],p.z-p.anchor[1])>=2.7-1e-8&&Math.hypot(p.x-p.anchor[0],p.z-p.anchor[1])<=7+1e-8,'real native activity anchors every site at a useful nearby distance');
  const r={x:p.x-p.radius,y:p.z-p.radius,w:p.radius*2,h:p.radius*2};assert.equal(rects.some(q=>intersectsGroundRect(r,q,.18)),false,'a model never occupies a native building or furnishing parcel');
  const heights=[];
  for(let z=Math.floor(p.z-p.radius);z<=Math.floor(p.z+p.radius);z++)for(let x=Math.floor(p.x-p.radius);x<=Math.floor(p.x+p.radius);x++){
   const dx=Math.max(x-p.x,0,p.x-x-1),dz=Math.max(z-p.z,0,p.z-z-1);if(dx*dx+dz*dz>=p.radius*p.radius-1e-9)continue;
   assert.ok(scene.floor[z]?.[x]!=='.'||blocked.has(key(x,z)),'every root is closed in the actual runtime walk mask');const t=terrain.get(key(x,z));assert.ok(t,'every root is supported by a real terrace');heights.push(t.y);
   if(t.water)assert.ok(['riverbank','mangrove','coral','salt'].includes(p.family),'only a water-family structure enters a real water terrace');
  }
  assert.ok(Math.max(...heights)-Math.min(...heights)<=(p.slim?.025:.75));assert.equal(p.y,Math.min(...heights),'the model embeds in its lowest actual footing instead of hovering above the slope');assert.equal(p.supportMin,Math.min(...heights));assert.equal(p.supportMax,Math.max(...heights));
  for(const o of objects.filter(o=>!o.hidden&&o.revealed!==false&&Array.isArray(o.xy)&&o.type!=='furnishing'))assert.ok(Math.hypot(p.x-o.xy[0]-.5,p.z-o.xy[1]-.5)>=1.6+p.radius-1e-8,'native actor/control clearance survives all runtime installers');
  for(const q of sites.slice(0,i))assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>=3.6-1e-8,'purposeful clusters retain visual separation');
  const dx=p.x-p.anchor[0],dz=p.z-p.anchor[1],forward=(dx*.35+dz*.78)/Math.hypot(.35,.78),side=(dx*.78-dz*.35)/Math.hypot(.35,.78);
  assert.ok(forward<=1||Math.abs(side)>=2.6,'a tall landmark does not stand directly between camera and native activity');
 }
}

test('all95 actual runtime exteriors have grounded nearby composition and every frontier arrival gets three priority sites',()=>{
 const world=setup();let scenes=0,frontiers=0,threeArrivals=0,slim=0,full=0;
 for(const[id,scene]of world.scenes){
  if(!isExteriorArtScene(scene))continue;const objects=enter(world,id),floor=JSON.stringify([scene.floor,scene.affordanceBlocked]),before=world.save(),landscape=adventureLandscapePlan(world),sites=exteriorAnchorSites(world,{objects,landscapePlan:landscape});
  validate(sites,scene,objects,landscape);scenes++;const entry=sites.filter(p=>p.arrival);assert.ok(entry.length<=3,id+' keeps the bounded arrival composition');if(id===226)assert.equal(entry.length,0,'the native hub is an entirely open courtyard: no rear/side closed root is available within seven metres, and foreground foliage is deliberately rejected');else assert.ok(entry.length>=1,id+' has a legal rooted arrival landmark');if(entry.length===3)threeArrivals++;
  if(scene.biome){if(!Number.isInteger(scene.fieldOrigin))frontiers++;assert.equal(entry.length,3,'each frontier and field trial arrival gains a composed near field');}
  slim+=sites.filter(p=>p.slim).length;full+=sites.filter(p=>!p.slim).length;
  assert.equal(world.save(),before,'site selection does not mutate native save state');assert.equal(JSON.stringify([scene.floor,scene.affordanceBlocked]),floor);assert.equal(exteriorAnchorSites(world,{objects,landscapePlan:landscape}),sites,'unchanged native descriptors retain the exact static plan');
 }
 assert.equal(scenes,95);assert.equal(frontiers,60);assert.ok(threeArrivals>=90,'priority placement covers the arrival whenever native parcels and clearance permit it');assert.ok(slim>0&&full>100,'narrow ledges retain slim forms while supported banks receive full grounded masses');
});

test('the two visually failed places now compose three sites close to their real arrival instead of only distant old features',()=>{
 const world=setup();for(const id of[145,49]){const objects=enter(world,id),p=exteriorAnchorSites(world,{objects}),entry=p.filter(s=>s.arrival);assert.equal(entry.length,3);assert.ok(p.length>=6);assert.ok(entry.every(s=>s.anchorId==='arrival:'+id));validate(p,world.scene,objects,adventureLandscapePlan(world));const snapshot=JSON.stringify(p);assert.equal(JSON.stringify(exteriorAnchorSites(world,{objects})),snapshot);}
});

test('interior and origin authoring stay protected, while a changed runtime floor or blocker rebuilds only the site plan',()=>{
 const world=setup();for(const[id,scene]of world.scenes)if(!isExteriorArtScene(scene)){world.state.scene=id;assert.deepEqual(exteriorAnchorSites(world),[]);}
 const objects=enter(world,145),s=world.scene,first=exteriorAnchorSites(world,{objects}),chosen=first.find(p=>p.x>=0&&p.z>=0&&p.x<s.width&&p.z<s.height),x=Math.floor(chosen.x),z=Math.floor(chosen.z),old=s.floor;
 s.floor=[...old];s.floor[z]=s.floor[z].slice(0,x)+'.'+s.floor[z].slice(x+1);const next=exteriorAnchorSites(world,{objects});assert.notEqual(next,first);assert.equal(next.some(p=>p.x===chosen.x&&p.z===chosen.z),false,'an opened native root cell can no longer carry scenery');
 const p=next[0],xx=Math.floor(p.x),zz=Math.floor(p.z);s.affordanceBlocked=[...(s.affordanceBlocked||[]),[xx,zz]];const blocked=exteriorAnchorSites(world,{objects});assert.notEqual(blocked,next,'runtime blocker changes invalidate the cached selection');
});
