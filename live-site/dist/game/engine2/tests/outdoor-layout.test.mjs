import test from 'node:test';
import assert from 'node:assert/strict';
import {flow} from './opening-flow.mjs';
import {outdoorLayout,projectedPropBounds,projectedTreeBounds,plannedCanopy,projectedGroundBounds} from '../outdoor-layout.js?v=5.22.0';
import {buildSceneCraft,sceneMechanismSpec} from '../scene-craft.js';
import {scenicTreeSites,scenicTreeGeometry} from '../scenic-trees.js';
import {regionalGroundSites} from '../environment-detail-pass.js';
import {regionalSiteSpec,REGIONAL_WORK_PALETTES,REGIONAL_ART_POOLS,regionalArtStyle} from '../environment-art-v17.js';
import {buildingReservations,intersectsGroundRect} from '../environmental-grounding.js?v=5.22.0';
import {streetPlan} from '../wayfinding.js?v=5.22.0';

const {w}=flow(),image={width:1774,height:887,complete:true};
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} ≈ ${b}`);

test('all outdoor layers consume one stable plan without changing the canonical world',()=>{
 const before=JSON.stringify(w.data);
 for(const scene of w.data.scenes){
  const p=outdoorLayout(scene);if(!p.reservations)continue;
  assert.equal(outdoorLayout(scene),p);
  assert.equal(buildSceneCraft(scene).sites,p.sites,scene.key+' props');
  assert.equal(scenicTreeSites(scene),p.trees,scene.key+' trees');
  assert.equal(regionalGroundSites(scene),p.groundSites,scene.key+' ground');
  assert.ok(p.sites.length<=p.limits.props&&p.trees.length<=p.limits.trees&&p.groundSites.length<=p.limits.ground);
 }
 assert.equal(JSON.stringify(w.data),before);
});

test('the real painted prop and canopy rectangles respect buildings, roads and interaction courts',()=>{
 for(const scene of w.data.scenes){
  const plan=outdoorLayout(scene);if(!plan.reservations)continue;
  const props=plan.sites.map(p=>({site:p,bounds:projectedPropBounds(p,scene)})),trees=plan.trees.map(p=>({site:p,bounds:projectedTreeBounds(p,plan.style)})),ground=plan.groundSites.map(p=>({site:p,bounds:projectedGroundBounds(p,scene)}));
  for(const {site,bounds}of [...props,...trees,...ground]){
   assert.ok([site.x,site.y,bounds.x,bounds.y,bounds.w,bounds.h].every(Number.isFinite));
   assert.ok(!buildingReservations(scene).some(b=>intersectsGroundRect(bounds,b.visual,.1)),scene.key+' '+site.groupId+' building');
   assert.ok(!plan.reservations.courts.some(b=>intersectsGroundRect(bounds,b)),scene.key+' court');
   assert.ok(!plan.reservations.pathRects.some(b=>intersectsGroundRect(bounds,b)),scene.key+' route');
  }
  for(const {site,bounds}of props){const spec=regionalSiteSpec(site,scene);assert.ok(spec);close(bounds.w,spec.width*site.scale/48);close(bounds.h,spec.height*site.scale/48);}
  for(const {site,bounds}of trees){const actual=scenicTreeGeometry(site.seed,plan.style,{environmentCanopies:image,environmentCanopyVariations:image}).opaque;close(bounds.x,site.x+actual.left/48);close(bounds.y,site.y+actual.top/48);close(bounds.w,(actual.right-actual.left)/48);}
 }
});

test('different groups cannot overlap; deliberate grove understory stays below crowns and off trunks',()=>{
 for(const scene of w.data.scenes){
  const plan=outdoorLayout(scene);if(!plan.reservations)continue;
  const objects=[...plan.sites.map(p=>({...p,tree:false})),...plan.trees.map(p=>({...p,tree:true})),...plan.landmarks];
  for(let i=0;i<objects.length;i++)for(const b of objects.slice(i+1)){
   const a=objects[i];if(!intersectsGroundRect(a.bounds,b.bounds))continue;
   assert.equal(a.groupId,b.groupId,scene.key+' unrelated silhouettes');
   if(a.tree&&b.tree){assert.ok(overlap(a.bounds,b.bounds)<=Math.min(a.bounds.w*a.bounds.h,b.bounds.w*b.bounds.h)*.240001);continue;}
   assert.notEqual(!!a.tree,!!b.tree,'two opaque prop silhouettes may not overlap');
   const tree=a.tree?a:b,plant=a.tree?b:a;
   assert.equal(plant.role,'bank');assert.ok(plant.y>=tree.y-.05&&plant.bounds.y>=tree.y-1.35&&Math.abs(plant.x-tree.x)>=.75);
  }
 }
});

test('authored banks have precedence and all members remain on their connected bank',()=>{
 const scene=w.scenes.get(5),plan=outdoorLayout(scene),authored=scene.authoredOpening.clusters;
 assert.equal(plan.authored,true);
 for(const group of plan.groups.filter(g=>g.role==='bank')){
  assert.ok(authored.some(p=>p.x===group.anchor.x&&p.y===group.anchor.y));
  const members=[...plan.sites,...plan.trees].filter(p=>p.groupId===group.id);
  for(const p of members){assert.equal(p.componentId,group.componentId);assert.notEqual(scene.floor[Math.floor(p.y)]?.[Math.floor(p.x)],'.');}
  assert.ok(members.some(p=>p.authored),'an authored anchor starts the group');
 }
 assert.ok(plan.sites.length<30&&plan.trees.length<=16);
 for(const id of [2000,2020,2050]){const p=outdoorLayout(w.scenes.get(id));assert.equal(p.groups.filter(g=>g.role==='bank').length,3);assert.ok(p.sites.length<=9);}
});

test('work props belong only to small explicit workplaces and ordinary banks contain natural repeats',()=>{
 let workGroups=0;
 for(const id of [5,50005,50008,19,2000,2020,2050]){
  const scene=w.scenes.get(id),plan=outdoorLayout(scene),bank=REGIONAL_ART_POOLS[regionalArtStyle(scene)]||REGIONAL_ART_POOLS.village;
  for(const group of plan.groups){const members=plan.sites.filter(p=>p.groupId===group.id);if(group.role==='work'){
    workGroups++;assert.ok(members.length<=2);assert.ok(group.workKind);
    for(const p of members){assert.ok(REGIONAL_WORK_PALETTES[group.workKind].includes(regionalSiteSpec(p,scene).id));assert.ok(Math.hypot(p.x-group.anchor.x,p.y-group.anchor.y)<=5.2);assert.ok(p.anchorId);}
   }else for(const p of members)assert.ok(bank.includes(regionalSiteSpec(p,scene).id));
  }
 }
 assert.ok(workGroups>=3);
 const town=outdoorLayout(w.scenes.get(5));assert.ok(town.groups.some(g=>g.workKind==='carpentry'));assert.ok(town.groups.some(g=>g.workKind==='household'));
 for(const origin of ['rook-regulator','riven-tide','brass-rail'])assert.equal(sceneMechanismSpec({key:'origin_'+origin,originId:origin},{type:'puzzle',originStep:2,label:'Find a way past the creature'}),null);
});

test('groves repeat one canopy family, with at most one matching age variant',()=>{
 const age={'orchard-apple':'elder-orchard','hazel-coppice':'open-coppice','river-alder':'leaning-alder','mangrove-cypress':'stilt-mangrove','snow-spruce':'broken-spruce','storm-juniper':'low-juniper'};
 let groves=0;
 for(const scene of w.data.scenes){const plan=outdoorLayout(scene);for(const group of plan.groups.filter(g=>g.treeCount>1)){
   groves++;const specimens=plan.trees.filter(p=>p.groupId===group.id).map(p=>plannedCanopy(p.seed,plan.style));
   assert.ok(specimens.every(p=>p?.id===group.canopyFamily||p?.id===age[group.canopyFamily]));
   assert.ok(specimens.filter(p=>p.id!==group.canopyFamily).length<=1);
  }}
 assert.ok(groves>10);
});

test('urban layout reserves the street network actually painted, without an extra trail network',()=>{
 for(const id of [5,17]){const scene=w.scenes.get(id),p=outdoorLayout(scene);if(!p.reservations)continue;const expected=streetPlan(scene);for(const xy of scene.authoredOpening?.approach||[])if(scene.floor[Math.floor(xy[1])]?.[Math.floor(xy[0])]==='.')expected.add(Math.floor(xy[0])+','+Math.floor(xy[1]));assert.deepEqual(p.reservations.paths,expected);}
});
