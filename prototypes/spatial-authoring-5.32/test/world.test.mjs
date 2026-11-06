import test from 'node:test';import assert from 'node:assert/strict';import {npcSchedule,worldConsequence,migration} from '../src/living-world.mjs';
test('schedule changes across day',()=>assert.notEqual(npcSchedule('iona',10),npcSchedule('iona',23)));
test('repair changes traffic and pressure',()=>{const s=worldConsequence({traffic:0,monsterPressure:2},{kind:'repair',id:'bridge'});assert.equal(s.traffic,1);assert.equal(s.monsterPressure,1);});
test('migration deterministic',()=>assert.deepEqual(migration('orchard',2,'rain'),migration('orchard',2,'rain')));
