#!/usr/bin/env node
/** Actual-data full-content integration check. Rasterization and illustrated
 * texture decoding are replaced; World, runtime systems and renderer meshes are
 * genuine. This does not claim visual approval or a complete game walkthrough. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {World} from '../../dist/game/engine2/world.js';
import {Adventure3DRenderer} from '../../dist/game/engine2/adventure-3d-renderer.js';
import {adventureGroundCompositionPlan} from '../../dist/game/engine2/adventure-ground-composition.js';
import {Geometry} from '../../dist/game/engine2/cistern-renderer.js';
import {dungeonArchitectureSpec} from '../../dist/game/engine2/adventure-dungeon-architecture.js';
import {adventureSetFamily} from '../../dist/game/engine2/adventure-set-dressing.js';
import {adventurePropFamily} from '../../dist/game/engine2/adventure-world-props.js';
import {adventureContentFamily,appendAdventureContentDynamic} from '../../dist/game/engine2/adventure-content-models.js';
import {livingContentFamily,appendAdventureLivingDynamic} from '../../dist/game/engine2/adventure-living-content.js';
import {appendAdventureSurfaceStates,adventureSurfaceSamples} from '../../dist/game/engine2/adventure-surface-states.js';
import {installReconciledGround} from '../../dist/game/engine2/reconciled-ground.js';
import {installLivingAtlas} from '../../dist/game/engine2/living-atlas.js';
import {installTrailLife} from '../../dist/game/engine2/reconciled-travel.js';
import {installTownLife} from '../../dist/game/engine2/townlife.js';
import {installRegionalLife} from '../../dist/game/engine2/regional-life.js';
import {installRivals} from '../../dist/game/engine2/npc-challenges.js';
import {installEmbodiedOrigins,replacesEmbodiedOriginObject} from '../../dist/game/engine2/embodied-origins.js';
import {PHYSICAL_LORE} from '../../dist/game/engine2/physical-lore-content.js';
import {physicalBindings,interactPhysical,tickPhysical} from '../../dist/game/engine2/physical-lore.js';
import {NETWORK_WORKS,networkObjects,networkInteraction} from '../../dist/game/engine2/answering-network.js';
import {recordExpeditionVictory} from '../../dist/game/engine2/field-expeditions.js';
import {ORIGINS} from '../../dist/game/engine2/origin-content.js';
import {personFor} from '../../dist/game/engine2/presentation.js';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),REPORT=resolve(ROOT,process.argv.find(v=>v.startsWith('--report='))?.slice(9)||'docs/verification/all-3d-coverage-5.33.json');
const source=JSON.parse(readFileSync(resolve(ROOT,'dist/game/engine2/world.json'),'utf8')),noop=()=>{};
const report={schema:'ash-aether.all-3d-coverage/1',release:'5.33',checked_at_utc:new Date().toISOString(),method:'Real World with native ground, Atlas, trail, household/regional life and rival installs; real integrated Adventure3DRenderer including native spatial composition, ground routes and dungeon legibility, with a minimal software raster callback. Save state is warmed through native reads before taking exact before/after snapshots. Geometry is inspected rather than rasterized.',scenes:[],object_routes:{},uncovered:[],past_life_cases:[],physical_lore_cases:[],network_cases:[],expedition_cases:[],ground_cases:[],limits:['All-scene availability snapshot uses chapter24, original flags unset, arrival positions and all runtime services installed. Supplemental state cases use the actual public native action functions.','This verifies representation coverage, finite combined meshes and save immutability; it does not measure art quality, phone GPU performance, browser bounds or every authored dialogue branch.','Illustrated sprite decoding/rasterization is omitted. The actual sprite ownership paths are checked by native classification and by separate focused tests.'],passed:false};
const names=['../../index.html','../adaptive-soundtrack.js','../index.html','../soundtrack.js','activity-sites.js','adventure-3d-geometry.js','adventure-3d-renderer.js','adventure-content-models.js','adventure-dungeon-architecture.js','adventure-encounter-content.js','adventure-ground-composition.js','adventure-guidance-ui.js','adventure-landscape.js','adventure-living-content.js','adventure-origin-staging.js','adventure-presentation.js','adventure-set-dressing.js','adventure-surface-states.js','adventure-world-props.js','affordance-art.js','authored-scenery.js','battle-flow.js','battle.js','cinema-content.js','cinema-director.js','combat-advice.js','combat-reactions.js','combat-relics-ui.js','crew-setup-ui.js','dev-portal.js','dev-session.js','economy-ui.js','embodied-origins.js','encounter-preview.js','expansion-cinema-content.js','expansion-cinema.js','exploration.js','field-feedback.js','field-journey-director.js','field-journey-model.js','field-journey-ui.js','field-origins.js','field-patrols.js','field-reward-gear.js','follower-motion.js','frontiers.js','guided-objective.js','household-render.js','journey-memory.js','living-armory/campaign-ui.js','living-armory/campaign.js','living-armory/frame.html','living-armory/src/armory.css','living-armory/src/armory.mjs','living-armory/src/art.mjs','living-armory/src/host-bridge.mjs','living-armory/src/ui.mjs','living-armory/src/weapon-showcase.mjs','living-atlas-layout.js','living-atlas.js','living-world-ui.js','main.js','monster-catalog.js','monster-field-guide.js','music-controls.js','music-director.js','native-dungeon-director.js','native-spatial-authoring.js','npc-challenges.js','npc-routines.js','origins-ui.js','origins.js','patrol-formations.js','presentation.js','qa/battle-flow.html','qa/campaign-play.mjs','qa/combat-reactions/index.html','qa/composition.html','qa/composition.js','qa/economy/index.html','qa/guided-campaign.mjs','qa/guided-scenarios.mjs','qa/media.html','qa/motion.html','qa/motion.js','qa/phone.html','qa/physical-lore/index.html','reconciled-acoustics.js','reconciled-ground.js','reconciled-preview.js','reconciled-travel.js','regional-life.js','renderer.js','repertoire.js','save-validation.js','scene-camera.js','scene-craft.js','townlife.js','wild-combat.js','world-controls.js','world.js'];
report.source_hashes=Object.fromEntries(names.map(name=>[name,createHash('sha256').update(readFileSync(resolve(ROOT,'dist/game/engine2/'+name))).digest('hex')]));
function createWorld(){const w=new World(source);w.newGame({quiet:true});w.state.chapter=24;w.state.story.parcel=true;w.state.story.firstCore=true;w.state.mode='field';installReconciledGround(w);installLivingAtlas(w);installTrailLife(w);installTownLife(w);installRegionalLife(w);installRivals(w);return w;}
function renderer(){const canvas={width:1280,height:720,clientWidth:1280,clientHeight:720,dataset:{},getBoundingClientRect:()=>({width:1280,height:720,left:0,top:0}),getContext:k=>k==='2d'?{}:null,addEventListener:noop,removeEventListener:noop};const r=new Adventure3DRenderer(canvas,{quality:'high',art:{assets:{}}});r.software.render=()=>({backend:'software-fixture',drawCalls:0,triangles:0});return r;}
function place(w,id,xy=null){w.state.scene=id;const p=xy||w.scene.arrive;w.state.x=p[0]+.5;w.state.y=p[1]+.5;w.state.mode='field';w.objects();w.reconciledGround.ensure();w.livingAtlas.runtime();return w;}
function route(w,o){
 const a=adventureContentFamily(w,o);if(a)return 'content-model:'+a;
 const l=livingContentFamily(w,o);if(l)return 'living-model:'+l;
 const p=adventurePropFamily(w,o);if(p)return 'campaign-prop:'+p;
 if(o.type==='embodied-action'||o.embodiedAction)return'embodied-mechanism';
 if(o.type==='furnishing'&&o.footprint)return'authored-furniture';
 if(o.type==='portal'&&o.xy)return'portal-threshold';
 if(o.type==='cache'&&o.xy)return'cache-body-and-lid';
 if(o.type==='affordance'&&o.xy)return'native-field-tool-or-apparatus';
 if(['patrol','boss','wild'].includes(o.type)&&(o.xy||o.enemies?.some(e=>e[1])))return'illustrated-creature-actor';
 if(personFor(o)&&(['npc','guide','mentor','shop','transport','aid'].includes(o.type)||o.lifeKind==='resident'||o.rivalId))return'illustrated-person-actor';
 return null;
}
function finiteMeshes(r){const counts={};for(const[name,mesh]of Object.entries(r.meshes)){assert.equal(mesh.data.length%12,0,name+' vertex stride');assert.equal(mesh.count,mesh.data.length/12);assert.ok(mesh.data.every(Number.isFinite),name+' finite');counts[name]=mesh.count;}return counts;}
function integratedPlans(r,w){
 const spatial=r.compositionPlan,dungeon=r.nativeDungeonFrame,ground=adventureGroundCompositionPlan(w,{objects:w.objects()});
 assert.equal(spatial?.scene,w.state.scene,'actual renderer builds native composition for current scene');
 assert.equal(dungeon?.scene,w.state.scene,'actual renderer invokes native dungeon legibility for current scene');
 const blocked=new Set((w.scene.affordanceBlocked||[]).map(p=>p.join(','))),walk=p=>w.scene.floor[p[1]]?.[p[0]]==='.'&&!blocked.has(p.join(','));
 const check=points=>{for(let i=0;i<points.length;i++){assert.ok(walk(points[i]),'integrated route stays on native floor');if(i)assert.equal(Math.abs(points[i][0]-points[i-1][0])+Math.abs(points[i][1]-points[i-1][1]),1,'integrated route is cardinal');}};
 for(const route of spatial.routes)check(route.cells);for(const route of dungeon.routes)check(route.points);
 for(const point of [...ground.paths,...ground.courts,...ground.habitat])assert.ok(walk(point),'integrated ground composition stays on native floor');
 for(const mechanism of dungeon.mechanisms)for(const field of ['committed','preview','value'])assert.ok(Number.isFinite(mechanism.progress[field])&&mechanism.progress[field]>=0&&mechanism.progress[field]<=1,'native mechanism progress finite and bounded');
 return {native_spatial_routes:spatial.routes.length,native_social_clusters:spatial.clusters.length,native_dungeon_scope:dungeon.scope,native_mechanisms:dungeon.mechanisms.length,native_dungeon_routes:dungeon.routes.length,ground_active:ground.active,ground_path_cells:ground.paths.length};
}
function actualDraw(r,w,{collect=false,label=null}={}){
 // Native lazy ledgers and local simulation caches initialize once. Nothing in
 // the following exact read-only check is allowed to tick or add save fields.
 w.objects();w.reconciledGround.ensure();w.livingAtlas.runtime();adventureSurfaceSamples(w,r.adventureTime);w.save();r.forceRender=true;r.drawWorld(w,null,0);
 const before=w.save(),floor=JSON.stringify([w.scene.floor,w.scene.affordanceBlocked,w.scene.household]),stateBefore=JSON.stringify(w.state);
 r.forceRender=true;r.drawWorld(w,null,0);const counts=finiteMeshes(r);r.integratedVerification=integratedPlans(r,w);
 assert.equal(JSON.stringify(w.state),stateBefore,'render does not add or change state: '+(label||w.state.scene));assert.equal(w.save(),before,'exact save unchanged: '+(label||w.state.scene));assert.equal(JSON.stringify([w.scene.floor,w.scene.affordanceBlocked,w.scene.household]),floor,'collision/furniture unchanged');
 if(collect)for(const o of w.objects()){const family=route(w,o);if(!family)report.uncovered.push({scene:w.state.scene,type:o.type,id:o.id||o.exploreId||o.networkId||null,label:o.label||null,xy:o.xy||null});else report.object_routes[family]=(report.object_routes[family]||0)+1;}
 return counts;
}
function modelSignature(w,fn,objects=w.objects(),time=7){const m=new Geometry(),g=new Geometry(),before=w.save();fn(m,g,{world:w,objects,time,range:Infinity});assert.equal(w.save(),before,'model render retains exact save');assert.ok(m.v.every(Number.isFinite)&&g.v.every(Number.isFinite));return createHash('sha256').update(JSON.stringify([m.v,g.v])).digest('hex');}

try{
 const w=createWorld(),r=renderer();
 for(const[id,s]of w.scenes){
  place(w,id);const dungeon=dungeonArchitectureSpec(w),set=adventureSetFamily(w);assert.ok(dungeon||set,'scene architecture coverage '+id+':'+s.key);
  const meshes=actualDraw(r,w,{collect:true});report.scenes.push({scene:id,key:s.key,chapter:s.chapter||null,dungeon:dungeon?.family||null,set,meshes,integrated:r.integratedVerification,save_unchanged:true});
 }
 assert.equal(report.scenes.length,167);assert.deepEqual(report.uncovered,[],'Every exposed interactive object has an actual 3D body or actor ownership path');
 const projects=new Set(),plants=new Set();for(const[id]of w.scenes){place(w,id);for(const o of w.objects()){if(o.regional&&o.lifeKind==='project')projects.add(o.profile.chapter);if(o.regional&&o.lifeKind==='herb')plants.add(o.profile.chapter);}}
 assert.equal(projects.size,24);assert.equal(plants.size,24);report.regional_coverage={native_community_projects:projects.size,native_plant_beds:plants.size,chapter13_restored:projects.has(13)&&plants.has(13)};
 // Exercise real native portable artifact actions. Five different receiver
 // modes preserve their partial state and appearance across the entire chain.
 for(const e of PHYSICAL_LORE){
  const sourceSite=physicalBindings(w).find(o=>o.physicalId===e.id&&o.physicalRole==='source'),target=physicalBindings(w).find(o=>o.physicalId===e.id&&o.physicalRole==='device');
  place(w,sourceSite.physicalLocation,sourceSite.xy);interactPhysical(w,sourceSite);assert.equal(w.state.physicalLore.held,e.id);
  place(w,target.physicalLocation,target.xy);const before=modelSignature(w,appendAdventureContentDynamic);interactPhysical(w,target);const fitted=modelSignature(w,appendAdventureContentDynamic);assert.notEqual(fitted,before,e.id+' fitted receiver is visible');
  if(e.mode==='grow'||e.mode==='listen')for(let i=0;i<18;i++)tickPhysical(w,.1);else if(e.mode!=='fit')interactPhysical(w,target);
  const after=modelSignature(w,appendAdventureContentDynamic);assert.ok(w.state.physicalLore.installed.includes(e.id));actualDraw(r,w);report.physical_lore_cases.push({id:e.id,mode:e.mode,fitted_mesh_changed:true,partial_action_mesh_changed:after!==fitted,save_unchanged_on_render:true});
 }
 // Each native answering-network action is invoked with its fresh stage and
 // actual local position; original prerequisite bits remain the authority.
 w.state.bosses.push(7);
 for(const def of NETWORK_WORKS){
  place(w,def.scene);w.setBit(...def.requires);let steps=0;
  for(let guard=0;guard<8;guard++){
   const object=networkObjects(w).find(o=>o.networkStage!=='complete');if(!object)break;
   place(w,def.scene,object.xy);const before=modelSignature(w,appendAdventureContentDynamic);networkInteraction(w,object);const after=modelSignature(w,appendAdventureContentDynamic);assert.notEqual(after,before,'native network action changes geometry: '+object.networkId+':'+object.networkStage);steps++;
  }
  assert.ok(steps>=2);assert.ok(w.state.answeringNetwork.works.includes(def.id));actualDraw(r,w);report.network_cases.push({work:def.id,steps,completed_native_work:true,save_unchanged_on_render:true});
 }
 // Three actual native encounter records repair the same already bound refuge.
 place(w,5);const refuge=w.objects().find(o=>o.type==='trail-refuge');assert.ok(refuge);modelSignature(w,appendAdventureLivingDynamic);
 const propBefore=new Geometry(),propGlow=new Geometry();const {appendAdventureWorldProps}=await import('../../dist/game/engine2/adventure-world-props.js');appendAdventureWorldProps(propBefore,propGlow,{world:w,time:7,range:Infinity});
 for(let serial=1;serial<=3;serial++)assert.ok(recordExpeditionVictory(w,{scene:w.state.scene,object:{type:'wild',serial,salvageCore:'earth'}}));
 const repaired=w.objects().find(o=>o.type==='trail-refuge');assert.ok(repaired.ready);const propAfter=new Geometry(),afterGlow=new Geometry();appendAdventureWorldProps(propAfter,afterGlow,{world:w,time:7,range:Infinity});assert.notDeepEqual(propAfter.v,propBefore.v);actualDraw(r,w);report.expedition_cases.push({scene:5,refuge_region:refuge.expeditionRegion,native_wins:3,repaired_model_changed:true,save_unchanged_on_render:true});
 // Accepted native environment impacts alter the same surface geometry read by3D.
 place(w,5);let clock=20;
 for(const[core,key]of[['tide','wet'],['flame','heat'],['earth','fracture'],['volt','charge'],['aether','phase']]){
  const before=modelSignature(w,appendAdventureSurfaceStates,undefined,clock++);assert.ok(w.reconciledGround.impact(w.state.x,w.state.y,core,1));const after=modelSignature(w,appendAdventureSurfaceStates,undefined,clock++);assert.notEqual(after,before,'native '+core+' impact has a visible surface consequence');const sample=adventureSurfaceSamples(w,clock++).find(s=>s.x===Math.floor(w.state.x)&&s.z===Math.floor(w.state.y));assert.ok(sample?.[key]>0);actualDraw(r,w);report.ground_cases.push({core,field:key,actual_native_impact:true,visible_mesh_changed:true,save_unchanged_on_render:true});
 }
 r.destroy();
 for(const origin of ORIGINS){
  const ow=createWorld(),owner=installEmbodiedOrigins(ow),original=ow.objects.bind(ow);ow.objects=()=>[...original().filter(o=>!replacesEmbodiedOriginObject(ow,o)),...owner.objects()];ow.newGame({originId:origin.id});const or=renderer();
  for(const part of[0,1]){const scene=[...ow.scenes.values()].find(s=>s.originId===origin.id&&s.originPart===part);assert.ok(scene);ow.state.chronicle.step=part?2:0;place(ow,scene.location);owner.snapshot();const counts=actualDraw(or,ow,{collect:true});report.past_life_cases.push({origin:origin.id,part,scene:scene.location,meshes:counts,save_unchanged:true});}
  or.destroy();
 }
 assert.deepEqual(report.uncovered,[]);report.source_unchanged_during_check=names.every(name=>createHash('sha256').update(readFileSync(resolve(ROOT,'dist/game/engine2/'+name))).digest('hex')===report.source_hashes[name]);assert.ok(report.source_unchanged_during_check,'Production source changed during the integration check');report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
mkdirSync(dirname(REPORT),{recursive:true});writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,scenes:report.scenes.length,object_representation_paths:Object.keys(report.object_routes).length,uncovered:report.uncovered.length,origins:report.past_life_cases.length,lore:report.physical_lore_cases.length,network:report.network_cases.length,ground:report.ground_cases.length,error:report.error?.message||null,report:REPORT}));
