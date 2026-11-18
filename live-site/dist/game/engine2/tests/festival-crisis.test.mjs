import test from 'node:test';
import assert from 'node:assert/strict';
import {newFestivalCrisis,festivalCrisisState,validateFestivalCrisis,beginFestivalCrisis,festivalCrisisObjects,festivalCrisisInteraction,festivalCrisisObjective,festivalCrisisBlocksWorkshop} from '../festival-crisis.js';
function world({legacy=false,chapter=1,scene=5,past=false,bit=false}={}){
 const s={story:{journal:[],...(legacy?{}:{festivalCrisis:newFestivalCrisis()})},chapter,complete:false,scene,items:{tonic:0},chronicle:past?{phase:'past'}:{phase:'present'}};
 return {state:s,scene:{location:scene},scenes:new Map([[5,{location:5,key:'town'}]]),bit:()=>bit,notice(msg){this.notices.push(msg)},notices:[],text(msg){this.texts.push(msg)},texts:[],choose(msg,options){this.choices=options}};
}
test('crisis is invisible until the native festival bell fails',()=>{
 const w=world();assert.equal(beginFestivalCrisis(w),false);assert.equal(festivalCrisisObjects(w).length,0);assert.equal(festivalCrisisObjective(w),null);
});
test('activates once and places two civilians and a relay in the town',()=>{
 const w=world({bit:true});assert.equal(beginFestivalCrisis(w),true);assert.equal(beginFestivalCrisis(w),false);
 assert.deepEqual(festivalCrisisObjects(w).map(o=>o.festivalCrisis),['nell','baker','relay']);
 assert.match(festivalCrisisObjective(w).label,/Nell/);assert.equal(festivalCrisisBlocksWorkshop(w,{key:'workshop'}),true);
});
test('relay stays dangerous while either civilian remains in the bell field',()=>{
 const w=world({bit:true});beginFestivalCrisis(w);
 festivalCrisisInteraction(w,festivalCrisisObjects(w)[2]);assert.match(w.texts.at(-1),/Get them clear/);
 assert.equal(w.state.story.festivalCrisis.phase,'active');
});
test('rescue, food relief, journal, objective and relay completion are idempotent',()=>{
 const w=world({bit:true});beginFestivalCrisis(w);
 let o=festivalCrisisObjects(w).find(x=>x.festivalCrisis==='nell');festivalCrisisInteraction(w,o);w.choices[0][1]();
 assert.match(festivalCrisisObjective(w).label,/baker/);
 o=festivalCrisisObjects(w).find(x=>x.festivalCrisis==='baker');festivalCrisisInteraction(w,o);w.choices[0][1]();
 assert.equal(w.state.items.tonic,1);assert.match(festivalCrisisObjective(w).label,/return/);
 assert.deepEqual(festivalCrisisObjects(w).map(o=>o.festivalCrisis),['relay']);
 festivalCrisisInteraction(w,festivalCrisisObjects(w)[0]);w.choices[0][1]();
 assert.equal(w.state.story.festivalCrisis.phase,'complete');
 assert.deepEqual(festivalCrisisObjects(w).map(o=>o.festivalCrisis),['relay-restored']);assert.equal(festivalCrisisBlocksWorkshop(w,{key:'workshop'}),false);
 festivalCrisisInteraction(w,festivalCrisisObjects(w)[0]);assert.match(w.texts.at(-1),/return vane stays open/i);
 assert.equal(w.state.items.tonic,1);assert.equal(new Set(w.state.story.journal.map(x=>x.id)).size,w.state.story.journal.length);
 assert.equal(validateFestivalCrisis(w.state),true);
});
test('a legacy save past the bell catastrophe is not forced to replay it',()=>{
 const w=world({legacy:true,bit:true});assert.equal(festivalCrisisState(w).phase,'complete');
 assert.equal(beginFestivalCrisis(w),false);assert.equal(festivalCrisisBlocksWorkshop(w,{key:'workshop'}),false);
 assert.equal(validateFestivalCrisis(w.state),true);
});
test('earlier legacy saves start with no invented actions',()=>{
 const w=world({legacy:true,bit:false});assert.deepEqual(festivalCrisisState(w),newFestivalCrisis());
});
test('past origin is untouched to avoid duplicating its Wireback encounter',()=>{
 const w=world({past:true,bit:true});assert.equal(beginFestivalCrisis(w),false);assert.deepEqual(festivalCrisisObjects(w),[]);
});
test('forged saved completion, duplicate rescues, and malformed state fail validation',()=>{
 const w=world();w.state.story.festivalCrisis={...newFestivalCrisis(),phase:'complete'};
 assert.throws(()=>validateFestivalCrisis(w.state),/rescue/);
 w.state.story.festivalCrisis={...newFestivalCrisis(),safe:['nell','nell']};
 assert.throws(()=>validateFestivalCrisis(w.state),/Invalid/);
});
