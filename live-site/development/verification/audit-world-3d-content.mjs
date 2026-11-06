#!/usr/bin/env node
/** Inventory the actual prepared campaign scenes, independent of presentation.
 * This is authored-object coverage, not a claim that every quest state was played.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {World} from '../../dist/game/engine2/world.js';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const source=JSON.parse(readFileSync(resolve(ROOT,'dist/game/engine2/world.json'),'utf8'));
const world=new World(source);world.newGame({quiet:true});
const types={},scenes=[];
for(const[id,scene]of world.scenes){
 const counts={};for(const object of scene.objects||[]){counts[object.type]=(counts[object.type]||0)+1;types[object.type]??={objects:0,scenes:0};types[object.type].objects++;}
 for(const type of Object.keys(counts))types[type].scenes++;
 scenes.push({id,key:scene.key||null,chapter:scene.chapter||null,biome:scene.biome?.style||null,origin:scene.originId||null,object_types:counts});
}
const report={schema:'ash-aether.world-3d-content-inventory/1',release:'5.30',checked_at_utc:new Date().toISOString(),prepared_scene_count:scenes.length,object_type_counts:types,coverage_priorities:['Native campaign puzzle, note, project and aid mechanisms need saved-state models rather than floor rings.','Camps, listening stations, dispatch boards and frontier survey/apparatus sites need visible physical identities across their existing regions.','Secret objects remain concealed until their authoritative discovery state allows them; presentation expansion must not reveal hidden rewards.'],state_semantics:{notes:"flags['sequence:'+sequence_address] records played sequence progress; completes_bit at flagFor(object) records completion.",puzzles:'stage_flag records intermediate stage; done/bit and storyChoices record committed result.',frontier:'frontiers.active identifies the commission; frontiers.stages[active] runs survey0,repair1,protect2,report3,claimed4. Authored markers are stage-visible, while completed apparatus models may persist as scenery.',blockers:'household.floorBase represents the structural footprint; scene.floor adds real blocked furniture cells; scene.affordanceBlocked adds runtime repaired crossing/gate masks.'},limits:['Inventory counts authored prepared objects. Dynamic lore, network, relic, creature and life systems may add further objects at runtime.','Counts do not establish render quality or visual legibility; browser review and finite-geometry checks provide separate evidence.'],scenes};
const path=resolve(ROOT,'docs/verification/world-3d-content-inventory-5.30.json');mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({scenes:scenes.length,object_types:Object.keys(types).length,report:path}));
