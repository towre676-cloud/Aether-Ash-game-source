import test from 'node:test';
import assert from 'node:assert/strict';
import {flow} from './opening-flow.mjs';
import {ORIGINS} from '../origin-content.js?v=5.6.0';
import {originObjective,originLocation} from '../origins.js?v=5.6.0';
import {findPath} from '../navigation.js';
import {createQuestGuide,clearInteractionApproach} from '../quest-navigation.js';
import {Battle,encounterEnemies} from '../battle.js?v=5.6.0';
import {frontierEnemy} from '../repertoire.js?v=5.6.0';

function follow(h){
 const {w}=h,guide=createQuestGuide(w,{resolve:()=>originObjective(w)});
 assert.ok(guide.start(),'the current objective must have a walking route');
 const initialStep=w.state.chronicle.step,initialPhase=w.state.chronicle.phase;let frames=0;
 while(guide.running&&w.state.chronicle.step===initialStep&&w.state.chronicle.phase===initialPhase&&!h.dialog?.choices&&frames++<3000){guide.update(.05);h.finish();}
 assert.ok(frames<3000,'guidance must reach the destination instead of stalling');
 guide.cancel();
 return frames*.05;
}

test('every first objective names its person and can be reached in under five seconds of walking',()=>{
 for(const o of ORIGINS){
  const h=flow(),w=h.w;w.newGame({originId:o.id});h.finish();
  assert.ok(!/keeper|apparatus/i.test(originObjective(w).label)||o.hero===4);
  const goal=originObjective(w).object;
  assert.ok(findPath(w.scene,[w.state.x,w.state.y],goal.xy,1).length<=9,o.id);
  assert.equal(w.scene.floor[goal.xy[1]]?.[goal.xy[0]],'.',o.id+' introduces its witness on legal floor');
  assert.ok(follow(h)<=5,o.id);
  assert.equal(w.state.chronicle.step,1);
 }
});

test('all seven origins can be followed on foot through repair, encounter choice, destiny and the present',()=>{
 for(const o of ORIGINS){
  const h=flow(),w=h.w;w.newGame({originId:o.id});h.finish();
  follow(h);follow(h);h.choose(0);
  assert.equal(w.state.chronicle.step,2);
  assert.equal(originObjective(w).label,o.title+' · '+o.passage);
  follow(h);h.choose(0);
  assert.equal(w.state.chronicle.step,3);
  follow(h);h.choose(1);
  assert.equal(w.state.chronicle.step,4);
  follow(h);h.choose(0);
  assert.equal(w.state.chronicle.phase,'present',o.id);
  assert.equal(w.state.chronicle.records.at(-1).destiny,1);
 }
});

test('backtracking points to the named passage instead of suggesting a person in the wrong room',()=>{
 for(const o of ORIGINS){
  const h=flow(),w=h.w;w.newGame({originId:o.id});h.finish();
  w.loadScene(originLocation(o.id,1));h.finish();
  const goal=originObjective(w);
  assert.equal(goal.label,o.title+' · '+o.returnPath);
  assert.equal(goal.object.originTravel,-1);
  follow(h);
  assert.equal(w.scene.originPart,0);
  assert.equal(w.state.chronicle.step,1,'following the passage should continue to the real person');
 }
});


// These explicit test inputs represent the player's choices; the guide never
// answers them. The authored encounter is played by the real Battle engine.
function playOriginBattle(w,origin){
 const heroes=w.activeHeroes;heroes.forEach(h=>{h.x=w.state.x;h.y=w.state.y;});
 const object=origin.object,xy=object.xy,enemies=encounterEnemies(1,false,object.enemies.length);
 enemies.forEach((e,i)=>{
  Object.assign(e,frontierEnemy(e,object.originSpecies));e.name=object.originName;
  e.maxHp=e.hp=Math.round(e.maxHp*object.originScale);e.power=Math.round(e.power*.7);
  if(w.state.chronicle.choices.repair===0)e.armor=Math.round(e.armor*.5);
  e.x=xy[0]+.5+i*1.3;e.y=xy[1]+.5;
 });
 const battle=new Battle({heroes,enemies,chapter:1,rng:()=>.5});
 for(let tick=0;tick<6000&&!battle.ended;tick++){
  battle.advance(.1);
  for(const hero of [...battle.ready])battle.command(hero.id,'attack',battle.livingEnemies[0]?.id);
 }
 assert.equal(battle.ended,'win','the selected protagonist must win their actual authored encounter');w.winBattle();
}

test('one latched guide walks all seven current origin layouts through every repair, encounter and destiny branch',()=>{
 let tellings=0,battles=0;
 for(const origin of ORIGINS)for(const repair of [0,1])for(const fight of [false,true])for(const destiny of [0,1]){
  const h=flow(),w=h.w;w.newGame({originId:origin.id});h.finish();let guide,walking=false,moves=0;
  w.callbacks.onScene=()=>guide?.sceneChanged();w.callbacks.onBattle=encounter=>{battles++;playOriginBattle(w,encounter);};
  const move=w.move.bind(w),interact=w.interact.bind(w);
  w.move=(dx,dy)=>{const before=[w.state.x,w.state.y];move(dx,dy);assert.ok(w.walkable(w.state.x,w.state.y),'guided steps stay on the authored walkable floor');assert.ok(Math.hypot(w.state.x-before[0],w.state.y-before[1])<=.21,'walking cannot teleport');moves++;};
  w.interact=object=>{if(walking)assert.ok(clearInteractionApproach(w.scene,[w.state.x,w.state.y],object),'guide uses a clear approach before interacting');return interact(object);};
  guide=createQuestGuide(w,{resolve:()=>originObjective(w)||{label:'The festival is reached'}});assert.ok(guide.start());
  let frames=0,decisions=0;
  while(w.state.chronicle.phase==='past'&&frames++<10000){
   walking=true;guide.update(.05);walking=false;h.finish();
   if(h.dialog?.choices){const step=w.state.chronicle.step;decisions++;h.choose(step===1?repair:step===2?(fight?1:0):step===3?destiny:0);}
   assert.equal(guide.running,true,'a conversation, encounter or scene transition must not switch the guide off');
  }
  assert.ok(frames<10000,origin.id+' stalled on its authored layout');assert.ok(moves>0);
  assert.equal(w.state.chronicle.phase,'present');assert.equal(decisions,4);
  assert.deepEqual(w.state.chronicle.records.at(-1).repair,repair);
  assert.deepEqual(w.state.chronicle.records.at(-1).approach,fight?'battle':'diversion');
  assert.deepEqual(w.state.chronicle.records.at(-1).destiny,destiny);
  guide.update(.05);assert.equal(guide.running,true);guide.cancel();tellings++;
 }
 assert.equal(tellings,56);assert.equal(battles,28);
});
