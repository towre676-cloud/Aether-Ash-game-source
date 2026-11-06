import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry} from '../cistern-renderer.js';
import {buildingReservations} from '../environmental-grounding.js';
import {adventureBuildingPlan,appendAdventureStreetArchitecture,adventureSceneStyle,adventureSurfacePalette,prepareAdventureMaterials} from '../adventure-3d-geometry.js';
import {environmentSurfaceSpec} from '../environment-materials-v17.js';

const source=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
function world(){const w=new World(source);w.newGame({quiet:true});return w;}

test('street architecture retains real parcel proportions and exact native entrances instead of relocated miniature bodies',()=>{
 const w=world();let buildings=0;
 for(const[id,s]of w.scenes){w.state.scene=id;const plans=adventureBuildingPlan(w),reservations=buildingReservations(s);
  for(const b of plans){
   const native=s.exteriorBuildings.find(p=>p.id===b.id),r=reservations.find(p=>p.id===b.id);assert.ok(native&&r);
   assert.deepEqual(b.entrance,{x:native.exit.xy[0]+.5,z:native.exit.xy[1]+.5});
   assert.deepEqual(b.bounds,{x0:r.ground.x,x1:r.ground.x+r.ground.w,z0:r.ground.y,z1:r.ground.y+r.ground.h});
   assert.equal(b.height>=2.75,true);if(b.kind!=='underground')assert.ok(Math.max(b.bounds.x1-b.bounds.x0,b.bounds.z1-b.bounds.z0)>=2);
   for(const r of b.bodyRects)for(let z=Math.floor(r.z);z<Math.ceil(r.z+r.d);z++)for(let x=Math.floor(r.x);x<Math.ceil(r.x+r.w);x++)assert.notEqual(s.floor[z]?.[x],'.',`solid facade claims a route: ${id},${x},${z}`);
   for(const[x,z]of b.floorCells)assert.equal(s.floor[z]?.[x],'.','porch uses native floor');buildings++;
  }
 }
 assert.ok(buildings>=40);
});

test('the unfinished house is a human-scale connected work bay at its original attic entrance',()=>{
 const w=world();w.state.scene=73;const[b]=adventureBuildingPlan(w);assert.deepEqual(b.entrance,{x:37.5,z:46.5});assert.ok(b.bounds.x1-b.bounds.x0>5);assert.ok(b.bounds.z1-b.bounds.z0>4);assert.ok(b.floorCells.length>=12);assert.ok(b.supports.length>=2);
 const boxes=[],tubes=[],m={box:(...args)=>boxes.push(args),tube:(...args)=>tubes.push(args),quad(){},tri(){}};appendAdventureStreetArchitecture(m,{world:w});
 const doorway=boxes.filter(p=>Math.abs(p[0]-37.5)<.8&&Math.abs(p[2]-46.5)<.1&&p[4]>2);assert.equal(doorway.length,2,'two full-height entrance jambs');assert.ok(doorway.every(p=>Math.abs(p[0]-37.5)>=.65),'the central travel lane remains open');
 assert.ok(tubes.some(p=>Math.hypot(p[0][0]-p[1][0],p[0][2]-p[1][2])>2),'connected roof frame spans a work bay, not scattered posts');
});

test('a logical origin finale does not duplicate the same physical home',()=>{
 const w=world();w.state.scene=50001;const homes=adventureBuildingPlan(w).filter(p=>p.roomLocation===50000);assert.equal(homes.length,1);assert.deepEqual(homes[0].entrance,{x:30.5,z:37.5});assert.ok(w.scene.objects.some(o=>o.xy?.[0]===18&&o.xy?.[1]===36&&o.originStep===4),'the original finale portal remains untouched');
});

test('all emitted street models are finite and preserve saves, collision, doors and authored people',()=>{
 const w=world();let max=0;
 for(const[id,s]of w.scenes){w.state.scene=id;w.objects();const saved=w.save(),floor=JSON.stringify(s.floor),native=JSON.stringify(s.objects),doors=JSON.stringify(s.doors),mesh=new Geometry();appendAdventureStreetArchitecture(mesh,{world:w});const data=mesh.data();assert.equal(data.length%36,0);assert.ok(data.every(Number.isFinite),s.key);assert.equal(w.save(),saved);assert.equal(JSON.stringify(s.floor),floor);assert.equal(JSON.stringify(s.objects),native);assert.equal(JSON.stringify(s.doors),doors);max=Math.max(max,data.length/36);}
 assert.ok(max<6000,'architecture remains within static budget');
});

test('room walls use the masonry/plaster material while closed ground remains genuinely dark',()=>{
 const w=world();for(const id of[50000,703]){w.state.scene=id;const p=adventureSurfacePalette(w);assert.equal(p.wallMaterial,0);assert.equal(p.closedMaterial,6);assert.ok(p.wall[0]>.35);}
});

test('outdoor atlases preserve painted biome grain beneath a bounded native colour finish and matching substrate',()=>{
 const old=globalThis.document,calls=[],fills=[],stack=[];
 const ctx={globalAlpha:1,fillStyle:'',drawImage(...a){calls.push(a);},fillRect(...a){fills.push({at:a,color:this.fillStyle,alpha:this.globalAlpha});},save(){stack.push([this.globalAlpha,this.fillStyle]);},restore(){[this.globalAlpha,this.fillStyle]=stack.pop();}};
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
 try{
  const w=world(),surface={name:'surface',width:1774,height:887},arch={name:'arch',width:1536,height:1024},finishes=[];
  for(const id of[5,50013,2000]){
   w.state.scene=id;calls.length=0;fills.length=0;const saved=w.save(),style=adventureSceneStyle(w),palette=adventureSurfacePalette(w);
   assert.equal(style.indoor,false);prepareAdventureMaterials(w,{environmentSurfaces:surface,architectureMaterials:arch});
   const floorCrop=calls.find(a=>a[0]===surface&&a[5]===0&&a[6]===0);
   assert.ok(floorCrop,'original biome painting supplies the visible floor');
   assert.deepEqual(floorCrop.slice(1,5),(environmentSurfaceSpec(style.style)||environmentSurfaceSpec('grass')).crop);
   const floorWash=fills.find(p=>p.at[0]===0&&p.at[1]===0&&p.alpha>0&&p.alpha<1);
   assert.ok(floorWash,'native broad biome colour still contributes to the finish');
   assert.ok(floorWash.alpha>=.15&&floorWash.alpha<=.4,'the finish leaves at least60% of the painted grain visible');
   const nativeColour='#'+palette.floor.map(v=>Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0')).join('');
   assert.equal(floorWash.color,nativeColour,'finish remains tied to this scene palette');finishes.push({storm:style.storm,alpha:floorWash.alpha,color:floorWash.color});
   const substrate=calls.find(a=>a[0]===surface&&a[5]===512&&a[6]===512);assert.ok(substrate);
   assert.deepEqual(substrate.slice(1,5),(environmentSurfaceSpec(style.forest?'soil':style.style)||environmentSurfaceSpec('stone')).crop,'closed ground uses the matching substrate, never default marble');
   assert.equal(ctx.globalAlpha,1);assert.equal(stack.length,0);assert.equal(w.save(),saved,'surface preparation cannot change the journey');
  }
  assert.ok(new Set(finishes.map(f=>f.color)).size>=2,'the finish does not collapse different places into one tint');
  assert.ok(finishes.find(f=>f.storm).alpha<finishes.find(f=>!f.storm).alpha,'storm slate keeps extra grain instead of the previous opaque blue wash');
 }finally{globalThis.document=old;}
});
