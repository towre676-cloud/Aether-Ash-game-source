import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,makeEnemy} from '../battle.js';
import {installRivals,RIVALS,rivalEnemy} from '../npc-challenges.js';
import {World} from '../world.js';
import {checkpointValue} from '../player-comfort.js';
import {writeJourneyProfile} from '../journey-roster.js';
import {findJourneyResume,preserveUnreadableJourney,journeyArchiveKeys} from '../journey-resume.js';
import {source} from './opening-flow.mjs';

const KEY='ash-aether-enhanced-v2';
function storage(){
 const entries=new Map();
 return {
  get length(){return entries.size;},
  key(i){return [...entries.keys()][i]??null;},
  getItem(key){return entries.get(key)??null;},
  setItem(key,value){entries.set(key,String(value));},
  removeItem(key){entries.delete(key);}
 };
}
const snapshot=w=>({schema:'ash-aether.enhanced-save/1',world:JSON.parse(w.save())});
function journey(credits=0){
 const w=new World(source);
 w.newGame({quiet:true});
 w.state.gold=credits;
 return w;
}
function stored(s,value){s.setItem(KEY,JSON.stringify(value));}
function restore(value){
 const w=new World(source);
 w.restore(value.world);
 return w;
}
test('reload prefers the primary checkpoint and preserves traveller, position and supplies',()=>{
 const s=storage(),w=journey(42);
 w.state.items.tonic=3;
 const before=snapshot(w);
 stored(s,before);
 writeJourneyProfile(s,snapshot(journey(99)));
 const chosen=findJourneyResume(s,KEY,source);
 assert.equal(chosen.source,'primary');
 const {state}=restore(chosen.value);
 for(const key of ['gold','party','items','x','y','scene'])assert.deepEqual(state[key],before.world[key]);
 assert.equal(s.getItem(KEY),JSON.stringify(before));
});
test('a malformed or missing primary recovers a fully validated traveller without changing storage at discovery',()=>{
 const s=storage(),w=journey(44);
 writeJourneyProfile(s,snapshot(w),100);
 const invalid=snapshot(journey(99));
 invalid.world.journey={hero:1};
 invalid.world.scene=-1;
 writeJourneyProfile(s,invalid,200);
 assert.equal(findJourneyResume(s,KEY,source).value.world.gold,44);
 s.setItem(KEY,'{truncated');
 const resume=findJourneyResume(s,KEY,source);
 assert.equal(resume.source,'traveller');
 assert.equal(resume.value.world.gold,44);
 assert.equal(s.getItem(KEY),'{truncated');
 preserveUnreadableJourney(s,KEY,resume);
 stored(s,resume.value);
 assert.equal(s.getItem(journeyArchiveKeys(s,KEY)[0]),'{truncated');
 assert.equal(findJourneyResume(s,KEY,source).source,'primary');
});
test('a numbered archive and legacy previous slot remain reachable if traveller slots are unavailable',()=>{
 const s=storage();
 s.setItem(KEY+'-origin-archive-99',JSON.stringify(snapshot(journey(99))));
 s.setItem(KEY+'-origin-archive-100','bad archive');
 s.setItem(KEY+'-previous',JSON.stringify(snapshot(journey(10))));
 assert.equal(findJourneyResume(s,KEY,source).value.world.gold,99);
 s.removeItem(KEY+'-origin-archive-99');
 assert.equal(findJourneyResume(s,KEY,source).value.world.gold,10);
 s.removeItem(KEY+'-previous');
 assert.equal(findJourneyResume(s,KEY,source),null);
});
test('reopening an encounter restores the live battle snapshot and its spent supplies',()=>{
 const s=storage(),w=journey();
 const h=w.activeHeroes[0];
 Object.assign(h,{x:w.state.x,y:w.state.y});
 const enemy={...makeEnemy('boss',1,0,true),x:h.x+2,y:h.y};
 const b=new Battle({heroes:w.activeHeroes,enemies:[enemy],chapter:1});
 b.advance(.125);
 w.state.mode='battle';
 w.state.items.tonic=1;
 const encounter={...snapshot(w),origin:{scene:w.scene.location,type:'practice',practice:{type:'practice',xy:[enemy.x,enemy.y]}},battle:b.snapshot()};
 stored(s,encounter);
 const resumed=findJourneyResume(s,KEY,source).value,world=restore(resumed);
 const battle=new Battle({heroes:world.activeHeroes,enemies:[],inventory:world.state.items,chapter:1});
 battle.restore(resumed.battle);
 assert.equal(battle.time,b.time);
 assert.equal(battle.enemies[0].hp,enemy.hp);
 assert.equal(battle.inventory.tonic,1);
 const before=battle.time;
 battle.advance(.1);
 assert.ok(battle.time>before);
});
test('interrupted dialogue reloads the last stable checkpoint without applying an unconfirmed choice',()=>{
 const s=storage(),w=journey(12),stable=snapshot(w);
 w.state.gold=120;
 w.state.mode='dialog';
 stored(s,checkpointValue({current:snapshot(w),stable,busy:true}));
 assert.equal(findJourneyResume(s,KEY,source).value.world.gold,12);
 w.state.mode='field';
 stored(s,checkpointValue({current:snapshot(w),stable,busy:false}));
 assert.equal(findJourneyResume(s,KEY,source).value.world.gold,120);
});

test('a rival spawned by the live runtime resolves during validation',()=>{
 const s=storage(),w=journey(),rival=RIVALS[0];
 const room=[...w.scenes.values()].find(scene=>scene.key===rival.place&&scene.chapter===rival.chapter);
 assert.ok(room);
 w.state.chapter=rival.chapter;
 w.state.story.firstCore=true;
 w.loadScene(room.location,room.arrive);
 installRivals(w);
 const marker=w.objects().find(o=>o.rivalId===rival.id);
 assert.ok(marker);
 const hero=w.activeHeroes[0];
 Object.assign(hero,{x:w.state.x,y:w.state.y});
 const enemy={...rivalEnemy(rival),x:marker.xy[0]+.5,y:marker.xy[1]+.5};
 const battle=new Battle({heroes:[hero],enemies:[enemy],chapter:rival.chapter});
 w.state.mode='battle';
 const value={...snapshot(w),origin:{scene:room.location,type:'rival',rivalId:rival.id},battle:battle.snapshot()};
 stored(s,value);
 assert.equal(findJourneyResume(s,KEY,source).value.origin.rivalId,rival.id);
 value.origin.rivalId='missing';
 stored(s,value);
 assert.equal(findJourneyResume(s,KEY,source),null);
});
test('an interrupted write without battle data recovers the intact traveller checkpoint',()=>{
 const s=storage(),w=journey(19);
 writeJourneyProfile(s,snapshot(w));
 w.state.mode='battle';
 stored(s,snapshot(w));
 assert.equal(findJourneyResume(s,KEY,source).source,'traveller');
});
