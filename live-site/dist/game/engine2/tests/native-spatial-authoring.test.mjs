import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {nativeSpatialPlan,nativeSocialClusters} from '../native-spatial-authoring.js';
import {adventureGroundCompositionPlan} from '../adventure-ground-composition.js';
import {installEmbodiedOrigins,replacesEmbodiedOriginObject} from '../embodied-origins.js';
import {ORIGINS} from '../origin-content.js';
import {applyAffordanceScene} from '../world-affordances.js';

const data=JSON.parse(readFileSync(new URL('../world.json',import.meta.url)));
const example=()=>{
 const scene={location:90001,key:'field',width:9,height:7,arrive:[1,1],floor:['#########','#...#...#','#...#...#','#.......#','#...#...#','#...#...#','#########'],affordanceBlocked:[],objects:[{id:'door',type:'portal',xy:[1,1]},{id:'work',type:'puzzle',xy:[7,1]},{id:'keeper',type:'npc',xy:[1,2]}]};
 return {scene,objects:()=>scene.objects};
};
const validRoutes=(plan,scene)=>{
 for(const route of plan.routes){
  const from=plan.anchors.find(a=>a.id===route.from),to=plan.anchors.find(a=>a.id===route.to);
  assert.deepEqual(route.cells[0],from.landing);assert.deepEqual(route.cells.at(-1),to.landing);
  for(let i=0;i<route.cells.length;i++){
   const[x,z]=route.cells[i];assert.equal(scene.floor[z]?.[x],'.','route must use native floor');
   assert.ok(!(scene.affordanceBlocked||[]).some(p=>p[0]===x&&p[1]===z),'route must respect a live blocked cell');
   if(i)assert.equal(Math.abs(x-route.cells[i-1][0])+Math.abs(z-route.cells[i-1][1]),1,'route must have cardinal, contiguous steps');
  }
 }
};

test('a functional connection goes through the real wall opening instead of interpolating through walls',()=>{
 const world=example(),p=nativeSpatialPlan(world,{objects:world.objects()});validRoutes(p,world.scene);
 assert.equal(p.routes.length,1);assert.ok(p.routes[0].cells.some(([x,z])=>x===4&&z===3));
 assert.deepEqual(p.actors[0].xy,[1,2]);assert.equal(p.actors[0].x,1.5);assert.equal(p.actors[0].z,2.5);
 assert.equal(nativeSpatialPlan(world,{objects:world.objects()}),p);
});

test('live blocking and in-place native floor edits invalidate connections without moving any object',()=>{
 const world=example(),objects=JSON.stringify(world.scene.objects),first=nativeSpatialPlan(world,{objects:world.objects()});
 world.scene.affordanceBlocked=[[4,3]];const blocked=nativeSpatialPlan(world,{objects:world.objects()});assert.notEqual(blocked,first);assert.equal(blocked.routes.length,0);
 world.scene.affordanceBlocked=[];world.scene.floor[3]='#...#...#';const closed=nativeSpatialPlan(world,{objects:world.objects()});assert.equal(closed.routes.length,0);
 assert.equal(JSON.stringify(world.scene.objects),objects);
});

test('social connectivity is transitive and independent of source ordering',()=>{
 const actors=[{id:'a',x:0,z:0,component:0},{id:'b',x:4,z:0,component:0},{id:'c',x:8,z:0,component:0},{id:'d',x:4,z:0,component:1}];
 const ids=p=>p.map(group=>group.map(a=>a.id));
 assert.deepEqual(ids(nativeSocialClusters(actors)),[['a','b','c'],['d']]);
 assert.deepEqual(ids(nativeSocialClusters([actors[2],actors[0],actors[3],actors[1]])),[['a','b','c'],['d']]);
});

test('unanchored open terrain and combat lanes are classified without automatic filler or fake quality scores',()=>{
 const world={scene:{location:90002,key:'field',width:20,height:20,arrive:[1,1],floor:Array.from({length:20},()=>'.'.repeat(20)),objects:[{id:'pack',type:'patrol',enemies:[[1,[10,10]]]}]},objects(){return this.scene.objects;}};
 const p=nativeSpatialPlan(world,{objects:world.objects()});assert.equal(p.routes.length,0);assert.equal(p.anchors.length,0);assert.ok(p.openSpaces.length);
 assert.equal(p.openSpaces[0].purpose,'encounter lanes');assert.equal(p.openSpaces[0].automaticFill,false);
 assert.equal('voidFillers' in p,false);assert.equal('authoredFraction' in p.stats,false);
});

test('hidden destinations cannot be revealed by a new route or actor cluster',()=>{
 const world=example();world.scene.objects.push({id:'hidden-cache',type:'puzzle',xy:[6,4],hidden:true},{id:'unrevealed',type:'camp',xy:[5,5],revealed:false});
 const p=nativeSpatialPlan(world,{objects:world.objects()});assert.ok(p.anchors.every(a=>!['hidden-cache','unrevealed'].includes(a.id)));
});

test('planning without a visible snapshot never reads a migrating world or raw secret actors',()=>{
 const world=example();world.objects=()=>{throw Error('implicit native reads are not allowed');};
 const before=JSON.stringify(world.scene),p=nativeSpatialPlan(world);
 assert.equal(p.anchors.length,0);assert.equal(p.actors.length,0);assert.equal(JSON.stringify(world.scene),before);
});

test('all prepared native scenes preserve actor coordinates, collision and saves while exposing real connected plans',()=>{
 const world=new World(data);world.newGame({quiet:true});let routes=0,actors=0;
 for(const[id,scene]of world.scenes){
  world.state.scene=id;world.state.x=scene.arrive[0]+.5;world.state.y=scene.arrive[1]+.5;
  const objects=world.objects();applyAffordanceScene(world);const before=world.save(),floor=JSON.stringify(scene.floor),coordinates=JSON.stringify(objects.map(o=>o.xy));
  const p=nativeSpatialPlan(world,{objects});validRoutes(p,scene);routes+=p.routes.length;actors+=p.actors.length;
  for(const route of p.routes)for(const[x,z]of route.cells)assert.ok(world.walkable(x+.5,z+.5),'native collision permits the route');
  assert.equal(world.save(),before,'planning cannot mutate a saved journey');assert.equal(JSON.stringify(scene.floor),floor);assert.equal(JSON.stringify(objects.map(o=>o.xy)),coordinates);
  for(const actor of p.actors)assert.ok(objects.some(o=>o.xy?.[0]===actor.xy[0]&&o.xy?.[1]===actor.xy[1]));
 }
 assert.ok(routes>100);assert.ok(actors>30);
});

test('all remembered lives consume the actual embodied descriptors without changing their native progression',()=>{
 const world=new World(data);installEmbodiedOrigins(world);const native=world.objects.bind(world);world.objects=()=>[...native().filter(o=>!replacesEmbodiedOriginObject(world,o)),...world.embodiedOrigins.objects()];
 for(const origin of ORIGINS){world.newGame({originId:origin.id,quiet:true});const objects=world.objects(),before=world.save(),p=nativeSpatialPlan(world,{objects});validRoutes(p,world.scene);assert.equal(world.save(),before);assert.ok(p.anchors.some(a=>a.nativeType==='embodied-action'),origin.id+' physical input anchor');}
});

test('the ordinary rural renderer consumes native mask-bound connections as visible shared route surfaces',()=>{
 const world=example(),p=adventureGroundCompositionPlan(world),paths=new Set(p.paths.map(p=>p.join(',')));
 assert.ok(p.active);assert.ok(p.native.routes.length);for(const r of p.native.routes)for(const cell of r.cells)assert.ok(paths.has(cell.join(',')));
});
