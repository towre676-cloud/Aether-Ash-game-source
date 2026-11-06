import test from 'node:test';
import assert from 'node:assert/strict';
import {authorScene,socialClusters,placementHealth} from '../src/scene-composer.mjs';

test('deterministic authored placement clusters content around anchors',()=>{
 const spec={id:'orchard',kind:'settlement',bounds:{minX:-40,maxX:40,minZ:-30,maxZ:30},
 anchors:[{id:'inn',x:-16,z:0,importance:3},{id:'well',x:0,z:4,importance:2},{id:'gate',x:25,z:-2,importance:2}],
 actors:Array.from({length:12},(_,i)=>({id:`npc${i}`})),
 props:Array.from({length:18},(_,i)=>({id:`prop${i}`}))};
 const a=authorScene(spec),b=authorScene(spec);
 assert.deepEqual(a,b);
 assert.equal(a.actors.length,12);
 assert.equal(a.props.length,18);
 assert.ok(a.connectors.length>0);
 assert.ok(a.actors.every(x=>x.authoredAnchor));
});

test('large empty scene receives void repair landmarks',()=>{
 const s=authorScene({id:'void',kind:'wilderness',bounds:{minX:-80,maxX:80,minZ:-80,maxZ:80},anchors:[{id:'camp',x:0,z:0}]});
 assert.ok(s.voidFillers.length>10);
 assert.ok(placementHealth(s).emptySpaceRepairs===s.voidFillers.length);
});

test('social clustering detects nearby groups',()=>{
 const g=socialClusters([{x:0,z:0},{x:1,z:1},{x:20,z:20}],{radius:3});
 assert.equal(g.length,2);
 assert.equal(g[0].length,2);
});
