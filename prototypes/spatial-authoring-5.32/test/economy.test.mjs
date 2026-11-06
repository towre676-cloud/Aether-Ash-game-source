import test from 'node:test';import assert from 'node:assert/strict';import {canFund,fund,ACTIVITIES} from '../src/economy.mjs';
test('funding creates tradeoff project',()=>{assert.ok(canFund({credits:500,scrap:20},'river_landing'));const x=fund({credits:500,scrap:20},'river_landing');assert.equal(x.wallet.credits,220);assert.equal(x.project.benefit,'new_route');});
test('side activities have distinct loops',()=>assert.equal(new Set(Object.values(ACTIVITIES).map(x=>x.loop)).size,Object.keys(ACTIVITIES).length));
