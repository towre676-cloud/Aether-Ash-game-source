import test from 'node:test';import assert from 'node:assert/strict';import {transitionPlan} from '../src/transitions.mjs';
test('door and river create physical continuity steps',()=>{const p=transitionPlan('a','b',{door:true,river:true});assert.ok(p.steps.some(x=>x.kind==='door'));assert.ok(p.steps.some(x=>x.kind==='landing'));});
