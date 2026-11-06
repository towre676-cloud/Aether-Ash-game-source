import test from 'node:test';import assert from 'node:assert/strict';import {stairwellSteps} from '../subterranean-art.js';
test('subterranean treads recede toward the darker far passage and meet each other',()=>{
 const steps=stairwellSteps();assert.equal(steps.length,7);assert.equal(steps[0].nearY,18);assert.equal(steps.at(-1).farY,-22);
 for(let i=0;i<steps.length;i++){const a=steps[i];assert.ok(a.nearWidth>a.farWidth);assert.ok(a.nearY>a.farY);if(i){const b=steps[i-1];assert.equal(a.nearWidth,b.farWidth);assert.equal(a.nearY,b.farY);assert.ok(a.shade<b.shade);}}
});
