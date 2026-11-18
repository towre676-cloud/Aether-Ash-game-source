import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../world.js';
import {flow,source,earnOpening} from './opening-flow.mjs';

test('real Chapter 1: bell failure starts a saved civilian rescue, not a detached menu',()=>{
 const h=flow(),w=h.w;
 h.use(w.objects().find(o=>o.type==='npc'));
 h.use(w.objects().find(o=>o.type==='portal'));
 h.use(w.objects().find(o=>o.type==='puzzle'&&o.bit===0));h.choose();
 h.use(w.objects().find(o=>o.type==='puzzle'&&o.bit===1));h.choose();
 assert.equal(w.state.story.festivalCrisis.phase,'active');
 assert.equal(w.objects().filter(o=>o.festivalCrisis).length,3);
 h.choose(); // Preserve native Rook recruitment.
 const before=w.state.scene;
 h.use(w.objects().find(o=>o.type==='portal'&&o.to==='workshop'));
 assert.equal(w.state.scene,before,'The service hatch must not bypass people at risk.');
 for(const name of ['nell','baker']){
  const who=w.objects().find(o=>o.festivalCrisis===name);
  assert.ok(who,name+' actor exists in the real world');
  h.use(who);h.choose();
 }
 assert.deepEqual(w.state.story.festivalCrisis.safe,['nell','baker']);
 const afterRescue=JSON.parse(w.save());
 const restored=new World(source);
 restored.restore(afterRescue);
 assert.equal(restored.state.story.festivalCrisis.phase,'active');
 assert.equal(restored.objects().filter(o=>o.festivalCrisis).length,1);
 // In the real campaign, return to the repaired instrument and take the road.
 h.use(w.objects().find(o=>o.festivalCrisis==='relay'));h.choose();
 assert.equal(w.state.story.festivalCrisis.phase,'complete');
 assert.equal(w.objects().filter(o=>o.festivalCrisis==='relay-restored').length,1);
 h.use(w.objects().find(o=>o.type==='portal'&&o.to==='workshop'));
 assert.equal(w.state.scene,228,'The same workshop route now opens');
 const finished=new World(source);
 finished.restore(JSON.parse(w.save()));
 assert.equal(finished.state.story.festivalCrisis.phase,'complete');
 finished.loadScene(5);
 assert.equal(finished.objects().filter(o=>o.festivalCrisis==='relay-restored').length,1);
});

test('existing full opening helper earns gear and the first core through the new sequence',()=>{
 const h=earnOpening(),w=h.w;
 assert.equal(w.state.story.festivalCrisis.phase,'complete');
 assert.equal(w.state.story.weapon,true);
 assert.equal(w.state.story.firstCore,true);
 assert.ok(w.state.recruited.includes(1)&&w.state.recruited.includes(2));
});
