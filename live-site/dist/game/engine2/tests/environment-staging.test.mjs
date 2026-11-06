import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../world.js';
import {streetPlan} from '../wayfinding.js';
import {createActivityPlacer} from '../activity-sites.js';
import {buildingReservations,intersectsGroundRect} from '../environmental-grounding.js';
import {installTrailLife} from '../reconciled-travel.js';
import {paintBuildingFallback,prepareBuildingArt} from '../building-art.js';

const world=()=>new World(JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url),'utf8')));
test('street branches share a connected route without paving a square under every person',()=>{
 const scene={width:24,height:20,arrive:[3,12],key:'town',floor:Array.from({length:20},(_,y)=>y===0||y===19?'#'.repeat(24):'#'+'.'.repeat(22)+'#'),doors:[{xy:[20,12],to:'inn'}],objects:[{type:'npc',xy:[11,8]},{type:'npc',xy:[14,8]}]};
 const before=JSON.stringify(scene),road=streetPlan(scene);assert.ok(road.has('11,8')&&road.has('14,8')&&road.has('20,12'));
 assert.equal(road.has('10,7'),false);assert.equal(road.has('12,7'),false);
 const queue=[[3,12]],seen=new Set(['3,12']);for(let i=0;i<queue.length;i++)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const [x,y]=queue[i],p=[x+dx,y+dy],k=p.join(',');if(road.has(k)&&!seen.has(k)){seen.add(k);queue.push(p);}}
 assert.equal(seen.size,road.size);assert.equal(JSON.stringify(scene),before);
});

test('Cinderfall has a readable stable landing beside the inn, outside drawn buildings and door approaches',()=>{
 const w=world();w.state.scene=5;const scene=w.scene;[w.state.x,w.state.y]=scene.arrive.map(n=>n+.5);
 // The world's ordinary object query initializes its existing optional repair
 // collision mask. Compare the installer against that normal scene state.
 w.objects();const before=JSON.stringify(scene),savedPosition=[w.state.x,w.state.y];
 installTrailLife(w);const stable=w.trailLife.service;assert.ok(stable);assert.ok(w.walkable(stable.xy[0]+.5,stable.xy[1]+.5));
 const rect={x:stable.xy[0]+.5-1.25,y:stable.xy[1]+.5-1.85,w:2.5,h:2.03};
 for(const reservation of buildingReservations(scene)){assert.equal(intersectsGroundRect(rect,reservation.visual,.18),false);assert.ok(Math.hypot(stable.xy[0]+.5-reservation.door.x,stable.xy[1]+.5-reservation.door.y)>2);}
 const inn=scene.exteriorBuildings.find(b=>b.exit.to==='inn');assert.ok(Math.hypot(stable.xy[0]-inn.projection.outside[0],stable.xy[1]-inn.projection.outside[1])<9);
 assert.equal(JSON.stringify(scene),before);assert.deepEqual([w.state.x,w.state.y],savedPosition);
});

test('a regional work site follows its craft and remains separate from the harvest garden',()=>{
 const w=world();w.state.scene=5;const scene=w.scene,cells=[];for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++)if(scene.floor[y][x]==='.')cells.push([x,y]);
 const placer=createActivityPlacer(scene,cells),work=placer.pick('work',0,{activity:'oven vent'}),plant=placer.pick('plant',0);assert.ok(work&&plant);
 const inn=scene.exteriorBuildings.find(b=>b.exit.to==='inn');assert.ok(Math.hypot(work[0]-inn.projection.outside[0],work[1]-inn.projection.outside[1])<9);assert.ok(Math.hypot(work[0]-plant[0],work[1]-plant[1])>3);
 const retry=createActivityPlacer(scene,cells);assert.deepEqual(retry.pick('work',0,{activity:'oven vent'}),work);
});

test('a missing offscreen drawing context falls back to the real stairwell, never a whole forge sprite',()=>{
 const w=world(),plan=w.scenes.get(5).exteriorBuildings.find(b=>b.projection.kind==='underground'),oldDocument=globalThis.document;
 try{globalThis.document={createElement:()=>({getContext:()=>null})};assert.equal(prepareBuildingArt(plan,{}, {compatibility:true}),null);}finally{globalThis.document=oldDocument;}
 const calls=[],stack=[];const c=new Proxy({globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},createRadialGradient(){return{addColorStop(){}};},createLinearGradient(){return{addColorStop(){}};},drawImage(){assert.fail('stairs must not use a whole building sprite');}},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push([k,...args])});
 paintBuildingFallback({ctx:c,followers:[],label(){}},plan,{x:-100,y:-100});
 assert.ok(calls.some(([kind])=>kind==='fillRect'));assert.equal(stack.length,0);assert.equal(c.globalAlpha,1);
 const rects=calls.filter(([kind])=>kind==='fillRect');assert.ok(rects.every(([,x,y,w,h])=>w<=88&&h<=80));
});
