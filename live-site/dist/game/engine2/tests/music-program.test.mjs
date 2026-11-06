import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {World} from '../world.js';
import {createMusicLibrary,musicProgram} from '../music-program.js';
import {MUSIC_MIX,MUSIC_TARGET_LUFS,musicGain} from '../music-mix.js';

const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url)));
const catalog=read('../../music/catalog.json'),rpgManifest=read('../../music/rpg/manifest.json'),cueMap=read('../../romhack/music_map.json');
const baseUrl=new URL('../../../',import.meta.url),library=createMusicLibrary({catalog,rpgManifest,baseUrl});
const world=new World(read('../world.json'));

test('the library resolves every delivered recording, preserves aliases and uses measured attenuation',()=>{
 assert.equal(library.size,109);
 assert.equal(new Set([...library.values()].map(track=>track.recordingKey)).size,103);
 assert.equal(Object.keys(MUSIC_MIX).length,103);
 const checked=new Set();
 for(const track of library.values()){
  const mix=MUSIC_MIX[track.sourcePath];assert.ok(mix,track.id+' has measured delivery audio');
  assert.ok(track.duration>0&&track.duration<=mix.duration+.000001,track.id+' duration');
  assert.equal(track.end_s-track.start_s,track.duration);assert.equal(track.loop,false);
  assert.equal(track.gain,musicGain(mix.lufs));assert.ok(track.gain>0&&track.gain<=1);
  assert.ok(mix.lufs+20*Math.log10(track.gain)<=MUSIC_TARGET_LUFS+1e-10,track.id+' reaches the attenuation target');
  assert.ok(track.family);assert.equal(track.recordingKey,mix.sha256);
  if(!checked.has(track.audio)){checked.add(track.audio);const bytes=fs.readFileSync(new URL(track.audio));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),track.recordingKey,track.id+' delivered hash');}
 }
 assert.equal(library.get('clay_and_water_complete').recordingKey,library.get('clay_and_water_movement-2').recordingKey);
 assert.ok(library.get('clay_and_water_complete').audio.endsWith('/dist/music/clay_and_water/performance.ogg'));
 assert.ok(library.get('rpg:home').audio.endsWith('/dist/game/music/rpg/home.ogg'));
 assert.equal(library.get('station_under_ash').family,library.get('pressure_valves').family);
 assert.equal(library.get('rpg:home').family,library.get('rpg:sable').family);
 assert.equal(musicGain(-30),1,'quieter audio is never amplified');
});

test('all167 canonical scenes have reachable contextual pools at day/night and early/late chapters without mutating saves',()=>{
 assert.equal(world.scenes.size,167);let total=0;const programKeys=new Set();
 for(const scene of world.scenes.values())for(const minutes of[480,1380])for(const chapter of[1,20]){
  const state={chapter,townLife:{minutes,day:4}},before=JSON.stringify([scene,state]);
  const program=musicProgram({scene,state,slot:scene.song,cueMap});
  assert.equal(program.kind,'field');assert.ok(program.ids.length>=4,scene.location+' pool size');
  const tracks=program.ids.map(id=>{assert.ok(library.has(id),scene.location+' '+id);return library.get(id);});
  assert.ok(new Set(tracks.map(track=>track.recordingKey)).size>=4,scene.location+' distinct recordings');
  assert.ok(new Set(tracks.map(track=>track.family)).size>=3,scene.location+' distinct melodic families');
  for(const track of tracks){assert.ok(!['ending','victory','concert','instrument-reference','action-original','battle','boss','machineboss','pursuit'].includes(track.role),scene.location+' inappropriate field role '+track.id);assert.ok(!/movement-/.test(track.id));}
  assert.ok(program.rest[0]>=18&&program.rest[1]>=program.rest[0]);
  assert.equal(JSON.stringify([scene,state]),before);programKeys.add(program.key);total++;
 }
 assert.equal(total,668);assert.ok(programKeys.size>30);
});

test('all seven origin openings and their second scenes start with varied recordings and melodic families',()=>{
 const origins=[...world.scenes.values()].filter(scene=>scene.originId),pairs=new Set(),firsts=new Set();
 assert.equal(origins.length,14);
 for(const scene of origins){
  const program=musicProgram({scene,state:{chapter:1},slot:scene.song,cueMap}),first=library.get(program.ids[0]),second=library.get(program.ids[1]);
  assert.notEqual(first.recordingKey,second.recordingKey);assert.notEqual(first.family,second.family);
  pairs.add(program.ids.slice(0,2).join(','));if(scene.originPart===0)firsts.add(first.recordingKey);
 }
 assert.equal(pairs.size,14);assert.equal(firsts.size,7);
 assert.equal(musicProgram({scene:world.scenes.get(50000)}).ids[0],'dyletsky_home');
 assert.equal(musicProgram({scene:world.scenes.get(50004)}).ids[0],'dyletsky_workshop');
 assert.equal(musicProgram({scene:world.scenes.get(50010)}).ids[0],'dyletsky_archive');
});

test('authored biome and actual room purpose override misleading generic stage names',()=>{
 const program=id=>musicProgram({scene:world.scenes.get(id),state:{chapter:1},slot:world.scenes.get(id).song});
 for(const id of[2000,2001,2004])assert.equal(program(id).label,'Dry country and distant paths','dunes remain dunes, including Trailhead and Sanctuary');
 for(const id of[2020,2021,2024,2025,2029])assert.equal(program(id).label,'Rivers and shorelines','coral and mangrove retain wetland context');
 assert.equal(program(2030).label,'Caverns and underground passages');
 assert.equal(program(2040).label,'Snow and winter shelter');
 assert.equal(program(212).label,'Archives and quiet study');
 assert.equal(program(404).label,'Chapels and listening rooms');
 assert.equal(program(4).label,'Workshops and machinery');
 const home=world.scenes.get(2),day=musicProgram({scene:home,state:{chapter:1,townLife:{minutes:480}}}),night=musicProgram({scene:home,state:{chapter:1,townLife:{minutes:1380}}}),late=musicProgram({scene:home,state:{chapter:20,townLife:{minutes:480}}});
 assert.notDeepEqual(day.ids,night.ids);assert.notDeepEqual(day.ids,late.ids);assert.ok(night.rest[0]>day.rest[0]);
});

test('explicit listening, authored event cues and silence retain their meanings while battle requests use combat pools',()=>{
 const scene=world.scenes.get(2),context={scene,state:{chapter:1},cueMap};
 for(const id of['dyletsky_home','clay_and_water_complete','game_reference_01','action_battle_0']){
  const program=musicProgram({...context,slot:'performance:'+id});assert.equal(program.kind,'performance');assert.deepEqual(program.ids,[id]);assert.deepEqual(program.rest,[0,0]);
 }
 assert.equal(musicProgram({...context,slot:scene.song}).kind,'field');
 const eventSlot=Number(Object.keys(cueMap).find(slot=>slot!=='0'&&Number(slot)!==scene.song));
 assert.deepEqual(musicProgram({...context,slot:eventSlot}).ids,[cueMap[eventSlot]]);
 assert.equal(musicProgram({...context,slot:eventSlot}).kind,'performance');
 for(const slot of[0,'0','silence'])assert.deepEqual(musicProgram({...context,slot}).ids,[]);
 const battle=musicProgram({...context,battle:{enemies:[{boss:false}]},slot:'performance:action_battle_0'}),boss=musicProgram({...context,battle:{enemies:[{boss:true}]},slot:scene.song});
 assert.equal(battle.kind,'battle');assert.equal(boss.kind,'boss');
 assert.equal(battle.ids.filter(id=>id.startsWith('action_battle_')).length,4);assert.equal(boss.ids.filter(id=>id.startsWith('action_boss_')).length,4);
 for(const program of[battle,boss])assert.ok(program.ids.every(id=>library.has(id)));
 const late=musicProgram({...context,state:{chapter:20},battle:{enemies:[]},slot:'performance:action_battle_0'});
 assert.ok(late.ids.includes('rpg:battle_late'));assert.ok(!late.ids.includes('rpg:battle'));assert.notEqual(late.ids[0],battle.ids[0]);
});
