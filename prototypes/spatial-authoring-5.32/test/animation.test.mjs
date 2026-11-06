import test from 'node:test';import assert from 'node:assert/strict';import {motionState,strideProfile} from '../src/animation.mjs';
test('turn in place distinct from idle',()=>assert.equal(motionState({speed:0,turnRate:.7}).state,'turn_in_place'));
test('run cadence exceeds walk cadence',()=>assert.ok(strideProfile(1).cadence>strideProfile(.2).cadence));
