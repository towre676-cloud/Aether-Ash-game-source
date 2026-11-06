import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDungeonSequence,applyDungeonAction} from '../src/dungeon-director.mjs';

test('dungeon rooms expose visible before/during/after states and gameplay verbs',()=>{
 const d=buildDungeonSequence({id:'underwell',rooms:7,region:'water'});
 assert.equal(d.rooms.length,7);
 assert.ok(d.rooms.every(r=>r.verb&&r.visibleState.before&&r.visibleState.during&&r.visibleState.after));
 const r=d.rooms[0];
 assert.equal(applyDungeonAction(r,r.verb).success,true);
 assert.equal(applyDungeonAction(r,'wrong').success,false);
});
