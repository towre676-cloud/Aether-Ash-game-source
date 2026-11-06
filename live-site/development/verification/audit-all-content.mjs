#!/usr/bin/env node
/** Authored and runtime content inventory. Counts are availability snapshots,
 * not a claim that every quest branch has been played or visually approved. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {World} from '../../dist/game/engine2/world.js';
import {installTownLife} from '../../dist/game/engine2/townlife.js';
import {installRegionalLife} from '../../dist/game/engine2/regional-life.js';
import {installTrailLife} from '../../dist/game/engine2/reconciled-travel.js';
import {SIDE_CAMPAIGNS} from '../../dist/game/engine2/frontiers.js';
import {PHYSICAL_LORE} from '../../dist/game/engine2/physical-lore-content.js';
import {NETWORK_WORKS} from '../../dist/game/engine2/answering-network.js';
import {COMBAT_RELICS} from '../../dist/game/engine2/combat-relics.js';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const raw=JSON.parse(readFileSync(resolve(ROOT,'dist/game/engine2/world.json'),'utf8'));
const world=new World(raw);world.newGame({quiet:true});
installTrailLife(world);installTownLife(world);installRegionalLife(world);
const authoredTypes={},runtimeTypes={},lifeKinds={},categories={},scenes=[];
const add=(into,key,n=1)=>into[key]=(into[key]||0)+n;
for(const[id,scene]of world.scenes){
 const category=scene.originId?'past-life':scene.fieldOrigin!==undefined?'field-origin':scene.biome?'frontier':/^secret_/.test(scene.key)?'exploration-interior':'campaign';
 add(categories,category);const authored={},runtime={},life={};
 for(const o of scene.objects||[]){add(authored,o.type);add(authoredTypes,o.type);}
 // Chapter24 supplies an upper-bound present-day catalogue of native runtime
 // services; it does not set mission flags or pretend to solve any objective.
 world.state.scene=id;world.state.chapter=24;world.state.x=scene.arrive[0]+.5;world.state.y=scene.arrive[1]+.5;world.state.mode='field';
 for(const o of world.objects()){
  add(runtime,o.type);add(runtimeTypes,o.type);if(o.lifeKind){add(life,o.lifeKind);add(lifeKinds,o.lifeKind);}
 }
 scenes.push({id,key:scene.key,title:scene.title||null,chapter:scene.chapter||null,category,style:scene.biome?.style||scene.interior||null,authored,runtime_at_arrival:runtime,life_kinds:life});
}
const commissionCases=[];
for(const c of SIDE_CAMPAIGNS){
 const id=2000+c.regionIndex*5+c.area,scene=world.scenes.get(id);
 if(!scene)throw Error('Missing commission scene '+id);
 world.state.scene=id;world.state.chapter=24;world.state.x=scene.arrive[0]+.5;world.state.y=scene.arrive[1]+.5;
 world.state.frontiers={version:1,active:c.id,stages:{},claimed:[],visited:[]};
 const stages=[];
 for(const stage of[0,1,2,3,4]){world.state.frontiers.stages[c.id]=stage;const objects=world.objects();stages.push({stage,landmarks:objects.filter(o=>o.type==='frontier-landmark').map(o=>o.frontierStep),patrols:objects.filter(o=>o.frontierId===c.id).length});}
 if(stages[0].landmarks.join()!=='0'||stages[1].landmarks.join()!=='1'||stages[2].patrols!==1||stages[3].patrols!==0)throw Error('Commission stage visibility differs: '+c.id);
 commissionCases.push({id:c.id,scene:id,stages});
}
const report={schema:'ash-aether.all-content-inventory/1',release:'5.31',checked_at_utc:new Date().toISOString(),source_scene_count:raw.scenes.length,prepared_scene_count:world.scenes.size,categories,authored_types:authoredTypes,runtime_types_at_arrival:runtimeTypes,life_kinds:lifeKinds,systems:{campaign_chapters:raw.campaign.missions.length,exploration_dungeons:scenes.filter(s=>s.category==='exploration-interior').length,frontier_regions:12,frontier_areas:scenes.filter(s=>s.category==='frontier').length,frontier_commissions:SIDE_CAMPAIGNS.length,commission_state_cases:commissionCases.length*5,past_life_origins:7,past_life_scenes:scenes.filter(s=>s.category==='past-life').length,field_origins:scenes.filter(s=>s.category==='field-origin').length,physical_lore_chains:PHYSICAL_LORE.length,answering_network_works:NETWORK_WORKS.length,rare_combat_relics:COMBAT_RELICS.length,separate_3d_dungeons:['Remembering Cistern']},visibility_contracts:{hidden_secrets:'72 authored hidden rewards use native discovery/proximity/lock state; display must only consume World.objects() and never reveal all scene.objects secrets.',frontier:'Only survey at stage0, apparatus at stage1 and worksite patrol at stage2 are interactive; repaired apparatus may remain scenery.',physical_lore:'Sources vanish after taking; installed devices persist; reward appears only after native completion; carried/dropped state remains authoritative.',runtime:'Life, network, affordance, trail-stable, trail-refuge, relic and encore-note objects are generated at runtime and cannot be audited from scene.objects alone.'},baseline_5_30_gaps:['24 investigation riddle controls omitted from physical controller eligibility.','Dynamic network, combat-relic, trail-stable and nonresident life objects lacked 3D representation.','Living Atlas and Ground Forge sample state was not rendered in Adventure3D.','Four investigation state machines needed their own visible partial-state consequences.'],limits:['Runtime catalogue uses chapter24 at authored arrival with native mission flags unset; it is not a walkthrough of all availability states.','Scene and object counts do not establish art quality or legibility. Browser review is recorded separately.','The base campaign renderer covers all prepared scenes; the separate Remembering Cistern has its own renderer/model.'],scenes,commission_cases:commissionCases};
const path=resolve(ROOT,process.argv.find(v=>v.startsWith('--report='))?.slice(9)||'docs/verification/all-content-inventory-5.31.json');mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({prepared_scenes:world.scenes.size,categories,runtime_types:Object.keys(runtimeTypes).length,frontier_commission_cases:commissionCases.length*5,report:path}));
