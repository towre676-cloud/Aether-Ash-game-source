import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../world.js';
import {source} from './opening-flow.mjs';
import {Geometry} from '../cistern-renderer.js';
import {appendSceneGroundArt541,sceneGroundArtPlan541} from '../scene-ground-art-541.js';

const key=(x,z)=>x+','+z;
function validate(mesh,scene){
 const blocked=new Set((scene.affordanceBlocked||[]).map(p=>key(...p))),data=mesh.v;
 assert.ok(data.every(Number.isFinite));
 for(let i=0;i<data.length;i+=36){
  const a=data.slice(i,i+3),b=data.slice(i+12,i+15),c=data.slice(i+24,i+27),cross=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]);assert.ok(cross< -1e-9,'actual triangle winding faces the visible floor');
  for(const weights of[[1/3,1/3,1/3],[.8,.1,.1],[.1,.8,.1],[.1,.1,.8]]){
   const x=a[0]*weights[0]+b[0]*weights[1]+c[0]*weights[2],z=a[2]*weights[0]+b[2]*weights[1]+c[2]*weights[2],xx=Math.floor(x),zz=Math.floor(z);
   assert.equal(scene.floor[zz]?.[xx],'.','actual wear triangles stay clipped to native floor');assert.equal(blocked.has(key(xx,zz)),false,'an affordance blocker never gains a painted passage');
  }
  for(let j=i;j<i+36;j+=12){assert.ok(data[j+1]>=.018&&data[j+1]<=.024,'wear stays below native ground-state effects and actor feet');assert.equal(data[j+9],6,'ground wear never samples the geological rock tile');assert.equal(data[j+10],0,'path pigment is lit by the scene and has no emission');assert.ok(data[j+11]>0&&data[j+11]<=.17,'soft paint never becomes an opaque rectangular patch');}
 }
}

test('all95 native exteriors receive coherent wear while every interior and origin keeps its own floor authoring',()=>{
 const w=new World(source);let active=0,protectedScenes=0,nonempty=0,max=0;
 for(const scene of w.scenes.values()){
  const before=JSON.stringify(scene),mesh=new Geometry(),plan=appendSceneGroundArt541(mesh,{world:{scene}});
  if(!plan.active){assert.equal(mesh.v.length,0);protectedScenes++;continue;}
  active++;if(mesh.v.length)nonempty++;assert.equal(mesh.v.length/36,plan.triangles);assert.ok(plan.triangles<=5000);max=Math.max(max,plan.triangles);validate(mesh,scene);
  assert.equal(JSON.stringify(scene),before,'native floor, terrain states, objects and quest data are unchanged');
 }
 assert.equal(active,95);assert.equal(nonempty,95);assert.equal(protectedScenes,72);assert.ok(max>1000&&max<=5000);
});

test('the failed field and river views use native contiguous routes without habitat checkerboards or border geometry',()=>{
 const w=new World(source);
 for(const id of[145,49]){
  const scene=w.scenes.get(id),a=new Geometry(),b=new Geometry(),plan=appendSceneGroundArt541(a,{world:{scene}});appendSceneGroundArt541(b,{world:{scene}});
  assert.deepEqual(a.v,b.v,'the same native scene paints the exact same wear');assert.ok(plan.chains.length&&plan.drawnChains===plan.chains.length,'the entire native route network fits its brush budget');
  assert.ok(plan.layers.every(l=>l.kind==='wear-ribbon'||l.kind==='threshold-wear'),'no habitat colour bands, paver pads or route-edge strokes are emitted');
  assert.ok(plan.chains.some(c=>c.points.length<c.cells.length),'long runs remain connected curves rather than one enclosed square per cell');
  assert.ok(plan.layers.some(l=>l.polygons.some(p=>Math.max(...p.map(v=>v[0]))-Math.min(...p.map(v=>v[0]))>.75)),'actual connected broad surfaces are emitted');
  validate(a,scene);
 }
});

test('floor replacement and in-place affordance blockers invalidate only visual wear and never open a crossing',()=>{
 const scene={location:99991,key:'field',chapter:1,width:7,height:7,floor:['#######','#.....#','#.....#','#.....#','#.....#','#.....#','#######'],objects:[{type:'portal',xy:[1,1]},{type:'camp',xy:[5,5]}],affordanceBlocked:[]},world={scene};
 const first=sceneGroundArtPlan541(world);assert.ok(first.active&&first.routeCells.length);
 const p=first.routeCells.find(p=>p[0]!==1&&p[1]!==5)||first.routeCells[1];scene.affordanceBlocked.push([...p]);const blocked=sceneGroundArtPlan541(world);assert.notEqual(first,blocked);assert.equal(blocked.routeCells.some(q=>q[0]===p[0]&&q[1]===p[1]),false);
 const mesh=new Geometry();appendSceneGroundArt541(mesh,{world});validate(mesh,scene);
 const old=blocked;scene.floor[3]='#..#..#';const next=sceneGroundArtPlan541(world);assert.notEqual(next,old,'an in-place floor row change invalidates the paint plan');const changed=new Geometry();appendSceneGroundArt541(changed,{world});validate(changed,scene);
 assert.equal(scene.floor[3],'#..#..#');assert.deepEqual(scene.affordanceBlocked,[p]);
});

test('hidden destinations do not receive threshold wear and material helpers do not sample simulation state',()=>{
 const scene={location:99992,key:'field',chapter:1,width:5,height:5,floor:['#####','#...#','#...#','#...#','#####'],objects:[{type:'portal',xy:[1,1]},{type:'camp',xy:[3,3],hidden:true},{type:'shop',xy:[2,2],revealed:false}],affordanceBlocked:[]};let samples=0;
 const world={scene,reconciledGround:{sample(){samples++;throw Error('visual painting cannot sample or mutate ground simulation');}},livingAtlas:{sample(){samples++;throw Error('visual painting cannot alter ecology');}}},plan=sceneGroundArtPlan541(world);
 assert.equal(plan.thresholds.length,1);assert.deepEqual(plan.thresholds[0].at,[1.5,1.5]);assert.equal(samples,0);
 const mesh=new Geometry();appendSceneGroundArt541(mesh,{world});validate(mesh,scene);assert.equal(samples,0);
});
