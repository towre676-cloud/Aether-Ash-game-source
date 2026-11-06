import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpatialAuthoringLayer} from '../src/spatial-3d-integration.mjs';

test('adapter delegates authored layout, consequences and music without owning host systems',()=>{
 const log=[];
 const layer=createSpatialAuthoringLayer({
  world:{applyAuthoredLayout:x=>log.push(['layout',x.id]),registerDungeonSequence:x=>log.push(['dungeon',x.id]),applyVisibleConsequence:x=>log.push(['effect',x.roomId])},
  audio:{setAdaptivePlan:x=>log.push(['music',x.length])}
 });
 layer.composeScene({id:'s',kind:'interior'});
 const d=layer.composeDungeon({id:'d',rooms:3});
 layer.act(d.rooms[0],d.rooms[0].verb);
 layer.music({segments:[{track:'x',start:0,duration:5}]});
 assert.deepEqual(log.map(x=>x[0]),['layout','dungeon','effect','music']);
});
