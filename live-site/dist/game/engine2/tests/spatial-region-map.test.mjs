import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {spatialRegionMapModel} from '../spatial-region-map.mjs';
import {discoverSpatialEcology,spatialEcologySites,spatialEcologyRecord,spatialEcologyStory} from '../spatial-ecology.mjs';
const load=(p)=>readFileSync(new URL(p,import.meta.url),'utf8');
const source=JSON.parse(load('../world.json')),world=new World(source);
function setScene(id){world.state.scene=id;world.state.mode='field';const s=world.scene;world.state.x=s.arrive[0]+.5;world.state.y=s.arrive[1]+.5;return s;}
test('atlas is a real player-position and connected-floor model for each expanded scene',()=>{
 for(const scene of world.data.scenes.filter(s=>s.spatialExpansion)){
  setScene(scene.location);
  const before=world.save(),model=spatialRegionMapModel(world);
  assert.ok(model);assert.equal(model.scene,scene.location);
  assert.equal(model.width,scene.width);assert.equal(model.height,scene.height);
  assert.equal(model.points.length,8);
  assert.deepEqual(model.floor,scene.floor,'cartography derived from real collision floor');
  assert.deepEqual(model.player,{x:world.state.x,y:world.state.y});
  assert.equal(model.total,8);assert.ok(model.stage>=0&&model.stage<=4);
  assert.equal(world.save(),before,'map reading may not mutate progress');
 }
 setScene(2);assert.equal(spatialRegionMapModel(world),null,'intimate home is not falsely represented as enlarged');
});
test('a walked landmark reveals only its own information; unreached landscape remains unknown',()=>{
 const scene=setScene(2000),sites=spatialEcologySites(scene);
 assert.equal(spatialEcologyRecord(world),null);
 const old=spatialRegionMapModel(world);
 assert.equal(old.known,0);
 assert.equal(old.points[7].label,'Uncharted site');
 world.state.x=sites[3].xy[0]+.5;world.state.y=sites[3].xy[1]+.5;
 discoverSpatialEcology(world);
 const next=spatialRegionMapModel(world);
 assert.ok(next.known>=1);
 assert.equal(next.points[7].known,true);
 assert.notEqual(next.points[7].label,'Uncharted site');
 assert.equal(next.points[1].known,false,'far unrelated landmark not automatically disclosed');
 assert.equal(next.points[7].role,'return');
 assert.ok(next.points[7].detail.includes('habitat')||next.points[7].detail.length>10);
});
test('actual HUD exposes Map and modal explicitly says selecting a landmark does not auto-walk',()=>{
 const html=load('../../index.html'),main=load('../main.js'),ui=load('../spatial-region-map.mjs'),css=load('../spatial-region-map.css');
 assert.ok(html.includes('spatial-region-map.css'),'CSS mounted in actual game');
 assert.ok(main.includes('mountSpatialRegionMap')&&main.includes('spatialMapUI?.refresh()'));
 assert.ok(main.includes('if(spatialMapUI?.open)return;'),'map freezes movement simulation while in use');
 assert.ok(main.includes('onOpen:()=>{release();path=[];arrivalAction=null;questGuide?.cancel();'));
 assert.ok(main.includes('spatialMapUI?.close();'),'battle, dialogue and scene handoffs close atlas');
 assert.ok(ui.includes('never moves your party')&&ui.includes("role','dialog'"));
 assert.ok(ui.includes('aria-pressed')&&ui.includes('aria-modal'));
 assert.ok(css.includes('@media(max-width:690px)')&&css.includes('@media(max-height:500px)'));
 assert.ok(!ui.includes('world.move(')&&!ui.includes('questGuide.visit('),'atlas cannot run players through the world');
});
test('biome field notes are grounded in regional geography, not generic headings',()=>{
 for(const [id,style] of [[2000,'sand'],[2005,'salt'],[2010,'cactus'],[2030,'crystal'],[2040,'aurora'],[2059,'marble']]){
  const s=setScene(id),story=spatialEcologyStory(s);
  assert.equal(s.biome.style,style);
  assert.ok(story.clue.length>=35);
  assert.equal(story.choices.length,3);
  assert.ok(new Set(story.choices).size===3);
  assert.ok(story.fauna.length>=70);
 }
});
