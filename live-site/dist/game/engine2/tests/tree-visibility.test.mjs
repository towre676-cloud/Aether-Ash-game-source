import test from 'node:test';
import assert from 'node:assert/strict';
import {scenicTreeAlpha,scenicTreeGeometry,scenicTreeSites} from '../scenic-trees.js';
import {flow} from './opening-flow.mjs';
import {environmentFor} from '../environment.js';

test('actual admitted scenery seeds keep the full regional tree repertoire',()=>{
 const seeds=Array.from({length:256},(_,i)=>i*4);
 for(const [style,expected] of [['village',[0,1,3,6]],['riverbank',[2,7]],['highland',[4,5]]]){
  const ids=new Set(seeds.map(seed=>scenicTreeGeometry(seed,style).id));
  assert.deepEqual([...ids].sort((a,b)=>a-b),expected);
 }
 const {w}=flow();const sites=scenicTreeSites(w.scenes.get(5));
 assert.ok(sites.length>5);
 assert.ok(new Set(sites.map(site=>scenicTreeGeometry(site.seed,'village').id)).size>=3);
});

test('Riven’s initial arrival has a clear canopy court in the composed scene',()=>{
 const {w,finish}=flow();w.newGame({originId:'riven-tide'});finish();
 const sites=scenicTreeSites(w.scene),image={width:1774,height:887,complete:true};
 assert.deepEqual([w.state.x,w.state.y],[17.5,60.5]);assert.ok(sites.length>0);
 for(const site of sites)assert.equal(scenicTreeAlpha(site,[w.state],environmentFor(w.scene).style,{environmentCanopies:image,environmentCanopyVariations:image}),1);
});

test('the same tree stays opaque when a traveller is already in front, even beside its roots',()=>{
 const site={x:18.5,y:63,seed:1124692632};
 assert.equal(scenicTreeAlpha(site,[{x:18.5,y:63.1}],'village'),1);
 assert.equal(scenicTreeAlpha(site,[{x:18.5,y:62.95}],'village'),1);
});

test('travellers outside the canopy and trunk do not fade a tree merely for being nearby',()=>{
 const site={x:10,y:10,seed:1124692632};
 assert.equal(scenicTreeAlpha(site,[{x:14,y:8}],'village'),1);
 assert.equal(scenicTreeAlpha(site,[{x:11.4,y:9.95}],'village'),1);
 assert.equal(scenicTreeAlpha(site,[],'village'),1);
});

test('companions and procedural fallback canopies receive the same visibility protection',()=>{
 const site={x:10,y:10,seed:123};
 for(const atlas of [true,false]){
  const b=scenicTreeGeometry(site.seed,'woodland',{atlas}).opaque,actor={x:10,y:10+(b.top+b.bottom)*.5/48+.5};
  assert.equal(scenicTreeAlpha(site,[{x:20,y:20},actor],'woodland',{atlas}),.28);
  assert.equal(scenicTreeAlpha(site,[{x:10,y:10.2}],'woodland',{atlas}),1);
 }
});

test('atlas fade bounds stay inside the exact drawing rectangle for every variant family',()=>{
 for(const style of ['village','highland','riverbank','woodland'])for(let seed=0;seed<40;seed++){
  const {draw:d,opaque:b}=scenicTreeGeometry(seed,style);
  assert.ok(b.left>=d.x&&b.right<=d.x+d.w);assert.ok(b.top>=d.y&&b.bottom<=d.y+d.h);
  assert.ok(b.right>b.left&&b.bottom>b.top);
 }
});
