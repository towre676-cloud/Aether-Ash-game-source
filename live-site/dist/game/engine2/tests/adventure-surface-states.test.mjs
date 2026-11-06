import test from 'node:test';
import assert from 'node:assert/strict';
import {Geometry} from '../cistern-renderer.js';
import {installReconciledGround} from '../reconciled-ground.js';
import {adventureSurfaceState,adventureSurfaceSamples,appendAdventureSurfaceStates} from '../adventure-surface-states.js';

function fixture(){
 const scene={location:1,key:'field',chapter:1,width:18,height:18,arrive:[8,8],objects:[],doors:[],floor:Array.from({length:18},(_,y)=>Array.from({length:18},(_,x)=>!x||!y||x===17||y===17?'#':'.').join(''))};
 return {scene,state:{scene:1,x:8.5,y:8.5,party:[0],mode:'field',items:{tonic:3},flags:{}},walkable(x,z){return scene.floor[Math.floor(z)]?.[Math.floor(x)]==='.';},save(){return JSON.stringify(this.state);},move(){},loadScene(){},restore(){},newGame(){}};
}
function draw(w,t){const mesh=new Geometry(),glow=new Geometry();appendAdventureSurfaceStates(mesh,glow,{world:w,time:t});const values=[...mesh.data(),...glow.data()];assert.ok(values.every(Number.isFinite));return values;}

test('accepted native ground impacts leave distinct visible wet, hot, fractured, charged and phase surfaces',()=>{
 for(const [core,key] of [['tide','wet'],['flame','heat'],['earth','fracture'],['volt','charge'],['aether','phase']]){
  const w=fixture(),ground=installReconciledGround(w);ground.ensure();const before=draw(w,0),p=ground.impact(8.5,8.5,core,1);assert.ok(p,core);
  const samples=adventureSurfaceSamples(w,1),at=samples.find(s=>s.x===8&&s.z===8);assert.ok(at?.[key]>0,core+' authoritative field');
  const saved=w.save(),floor=[...w.scene.floor],after=draw(w,1);assert.notDeepEqual(after,before,core+' visible geometry changes');assert.equal(w.save(),saved,'drawing does not commit another impact');assert.deepEqual(w.scene.floor,floor);
 }
});
test('sampling is local, bounded, cached and skips exact blocked tiles',()=>{
 const w=fixture();w.scene.floor[8]=w.scene.floor[8].slice(0,9)+'#'+w.scene.floor[8].slice(10);let calls=0;
 w.ground={sample(){calls++;return{wetness:.8,grassAllowed:false};}};
 const list=adventureSurfaceSamples(w,0);assert.ok(calls<=129);assert.ok(list.every(s=>w.walkable(s.x+.5,s.z+.5)));assert.equal(list.some(s=>s.x===9&&s.z===8),false);assert.equal(adventureSurfaceSamples(w,.4),list);
 const at=calls;adventureSurfaceSamples(w,.6);assert.ok(calls>at);const saved=w.save();draw(w,.7);assert.equal(w.save(),saved);
});
test('native vegetation scorch and flattening reduce the visible living cover',()=>{
 const state=adventureSurfaceState({wetness:.2,grassAllowed:true},{vegetation:{moisture:.7,scorch:.5,flattening:.4},fields:{biomass:.8,resonance:.9}});
 assert.deepEqual(state,{wet:.2,heat:0,charge:0,phase:0,fracture:0,scorch:.5,biomass:.8,flattened:.4,resonance:.9,grass:true});
 const w=fixture();let scorch=0;w.ground={sample:()=>({grassAllowed:true})};w.livingAtlas={sample:()=>({vegetation:{scorch},fields:{biomass:.9}})};
 const growing=draw(w,0);scorch=1;const burnt=draw(w,1);assert.notDeepEqual(burnt,growing);assert.ok(burnt.length<growing.length,'scorched ground replaces upright vegetation');
});
test('vegetation moisture alone never paints a grid of surface puddles',()=>{
 const w=fixture();w.ground={sample:()=>({wetness:.23,grassAllowed:false})};w.livingAtlas={sample:()=>({vegetation:{moisture:.9},fields:{biomass:.8}})};assert.deepEqual(draw(w,0),[]);
});
test('missing simulations and nonfinite optional state do not fabricate terrain changes',()=>{
 const w=fixture();assert.deepEqual(draw(w,0),[]);assert.equal(adventureSurfaceState({temperature:NaN,fracture:Infinity},null).heat,0);assert.equal(adventureSurfaceState({},null).fracture,0);
});
