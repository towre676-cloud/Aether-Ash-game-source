import test from 'node:test';import assert from 'node:assert/strict';import {bossState} from '../src/boss-phases.mjs';
test('boss phases change rules',()=>{assert.equal(bossState('bell_warden',.7,[]).rule,'echo_lanes');assert.equal(bossState('bell_warden',.4,[0]).rule,'broken_bells');assert.equal(bossState('bell_warden',.1,[0,1]).rule,'silence_window');});
