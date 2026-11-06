import test from 'node:test';import assert from 'node:assert/strict';import {identityFor,nextEnemyAction} from '../src/enemy-identity.mjs';
test('archetypes get recognizable identities',()=>{assert.equal(identityFor('raptor').behavior,'sound_hunter');assert.equal(identityFor('mole').behavior,'nest_builder');});
test('sound hunter selects noisy actor',()=>{const a=nextEnemyAction({behavior:'sound_hunter'},{actors:[{id:'a',noise:1},{id:'b',noise:8}]});assert.equal(a.target,'b');});
test('gear thief flees after stealing',()=>{const a=nextEnemyAction({behavior:'gear_thief'},{looseGear:['ring']});assert.equal(a.kind,'steal');assert.equal(a.escapeAfter,true);});
