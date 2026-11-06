import test from 'node:test';import assert from 'node:assert/strict';import {postVictoryChoice} from '../src/progression-reward.mjs';
test('victory can offer gear, verb mutation and world unlock',()=>{const c=postVictoryChoice({encounterId:'e',region:'water',gearDrop:{id:'g'},worldUnlock:{id:'bridge'}});assert.deepEqual(c.map(x=>x.kind),['gear','mutation','world']);});
