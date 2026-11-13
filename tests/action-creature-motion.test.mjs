import test from 'node:test';
import assert from 'node:assert/strict';
import {creaturePoseFeedback} from '../live-site/dist/game/engine2/action-creature-motion.js';
test('motion helper respects reduced motion and does not mutate actor',()=>{
 const actor={hp:20,pose:1,intent:{},flash:.1};
 const before=structuredClone(actor);
 const animated=creaturePoseFeedback(actor,.2);
 assert.ok(animated.scale>1);
 assert.ok(animated.lift!==0);
 assert.deepEqual(creaturePoseFeedback(actor,.2,{reducedMotion:true}),{lift:0,scale:1,alpha:1});
 assert.deepEqual(actor,before);
});
test('idle creature has neutral scale',()=>{
 assert.equal(creaturePoseFeedback({hp:20,pose:0},1).scale,1);
});
