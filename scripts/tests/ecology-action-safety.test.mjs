import test from 'node:test';
import assert from 'node:assert/strict';
import {spatialEcologySites,interactSpatialEcology} from '../../live-site/dist/game/engine2/spatial-ecology.mjs';
import {spatialWildlifeActors} from '../../live-site/dist/game/engine2/spatial-wildlife.mjs';
function fixture(){
 const landmarks=Array.from({length:8},(_,i)=>({name:'Landmark '+i,xy:[10+(i%4)*12,10+Math.floor(i/4)*24]}));
 const scene={location:2000,chapter:2,floor:Array(60).fill('.'.repeat(60)),spatialExpansion:{version:1,landmarks},objects:landmarks.map(p=>({type:'furnishing',xy:p.xy}))};
 const w={scene,state:{scene:2000,mode:'field',x:0,y:0,gold:0,spatialEcology:{version:1,sites:{2000:{stage:3,choice:null,fauna:false,mask:0}}}},notice(){},text(){},choose(t,c){this.choices=c;}};
 const station=spatialEcologySites(scene).find(x=>x.spatialRole==='return');
 w.state.x=station.xy[0]+.5;w.state.y=station.xy[1]+.5;return {w,station};
}
test('ecology stations cannot be masked by earlier same-coordinate flavor objects',()=>{
 const {w}=fixture(),sites=spatialEcologySites(w.scene);
 assert.equal(sites.length,5);
 for(const site of sites){
  assert.ok(w.scene.objects.every(o=>Math.hypot(o.xy[0]-site.xy[0],o.xy[1]-site.xy[1])>=3));
  const nearest=[...w.scene.objects,...sites].sort((a,b)=>Math.hypot(a.xy[0]-site.xy[0],a.xy[1]-site.xy[1])-Math.hypot(b.xy[0]-site.xy[0],b.xy[1]-site.xy[1]))[0];
  assert.equal(nearest.spatialId,site.spatialId);
 }
});
test('a retained salvage callback awards once and cannot change the chosen outcome',()=>{
 const {w,station}=fixture();interactSpatialEcology(w,station);
 const [protect,salvage]=w.choices.map(c=>c[1]);salvage();const gold=w.state.gold;
 assert.ok(gold>0);salvage();protect();assert.equal(w.state.gold,gold);assert.equal(w.state.spatialEcology.sites[2000].choice,'salvage');
});
test('a stale dialogue cannot award into a different scene or restored state',()=>{
 for(const change of [w=>{w.scene={...w.scene,location:2001};},w=>{w.state=structuredClone(w.state);}]){
  const {w,station}=fixture();interactSpatialEcology(w,station);const claim=w.choices[1][1];change(w);claim();assert.equal(w.state.gold,0);
 }
});
test('wildlife is suppressed during battle and remains bounded in the field',()=>{
 const {w}=fixture(),at=w.scene.spatialExpansion.landmarks[6].xy;
 w.state.x=at[0]+.5;w.state.y=at[1]+.5;
 assert.ok(spatialWildlifeActors(w,1).length>0);
 w.state.mode='battle';assert.deepEqual(spatialWildlifeActors(w,1),[]);
});
