import test from 'node:test';import assert from 'node:assert/strict';import {migrateMomentState,validateMomentState} from '../src/save-migration.mjs';
test('migration is additive and valid',()=>{const old={chapter:9,inventory:['x']};const n=migrateMomentState(old);assert.equal(n.chapter,9);assert.deepEqual(n.inventory,['x']);assert.ok(validateMomentState(n));});
