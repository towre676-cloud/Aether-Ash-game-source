import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../world.js';
import {buildingReservations,buildingGroundContains,pointInGroundRect} from '../environmental-grounding.js';
import {drawStairwell} from '../subterranean-art.js';
import {atlasLayout} from '../living-atlas-layout.js';
import {authoredGroundMaterial} from '../reconciled-ground.js';

const scene=(extra={})=>({location:91,key:'forest',theme:0,chapter:1,width:24,height:24,arrive:[2,2],floor:Array.from({length:24},(_,y)=>Array.from({length:24},(_,x)=>x&&y&&x<23&&y<23?'.':'#').join('')),objects:[],doors:[],...extra});

test('projected building reservations retain concave ground and extend to the actual wall silhouette',()=>{
 const s=scene({exteriorBuildings:[{id:'courtyard',projection:{kind:'building',outside:[10,10],scale:1,cells:[[0,0],[1,0],[0,-1],[2,-1]]}}]}),r=buildingReservations(s);
 assert.equal(r.length,1);assert.equal(buildingGroundContains(r,10.75,9.75),true);assert.equal(buildingGroundContains(r,11.75,9.75),false);assert.equal(buildingGroundContains(r,12.75,9.75),true);
 assert.ok(r[0].visual.y<r[0].ground.y-1);assert.ok(pointInGroundRect(r[0].approach,10.5,11.5));assert.equal(buildingReservations(s),r);
});

test('an underground entrance reserves only the rendered stairs, never the hidden room floor',()=>{
 const projection={kind:'underground',outside:[15,15],scale:.4,cells:Array.from({length:400},(_,i)=>[i%20-10,-Math.floor(i/20)]),bounds:{minX:-10,maxX:9,minY:-19,maxY:0}},s=scene({exteriorBuildings:[{id:'stairs',projection}]}),r=buildingReservations(s),at=r[0];
 assert.equal(at.groundRects.length,1);assert.ok(at.ground.w<1.5&&at.ground.h<1.1);assert.ok(at.visual.w<2&&at.visual.h<2);assert.equal(buildingGroundContains(r,12.5,10.5),false);
 const points=[],gradient={addColorStop(){}},c=new Proxy({createRadialGradient:()=>gradient,createLinearGradient:()=>gradient,moveTo:(x,y)=>points.push([x,y]),lineTo:(x,y)=>points.push([x,y]),fillRect:(x,y,w,h)=>points.push([x,y],[x+w,y+h])},{get:(o,k)=>o[k]||(()=>{})});drawStairwell(c);
 for(const [x,y]of points){const p={x:at.door.x+x/48,y:at.door.y+y/48};assert.ok(p.x>=at.visual.x-1e-8&&p.x<=at.visual.x+at.visual.w+1e-8&&p.y>=at.visual.y-1e-8&&p.y<=at.visual.y+at.visual.h+1e-8,'every drawn stair component is reserved');}
 const world={scene:s,state:{chronicle:{cycle:0}}},layout=atlasLayout(world);assert.equal(layout.blocked(15.5,15.5),true);assert.equal(layout.blocked(12.5,10.5),false);assert.equal(authoredGroundMaterial(s,12.5,10.5).built,false);
});

test('vegetation keeps urban courts and entrances open, with smooth deliberate verge patches',()=>{
 const s=scene({key:'town'}),layout=atlasLayout({scene:s,state:{}});
 assert.equal(layout.blocked(2.5,2.5),true);assert.equal(layout.plantingAt(12.5,12.5),0);
 let planted=0,maxJump=0;for(let y=1.5;y<22;y+=.5)for(let x=1.5;x<22;x+=.5){const a=layout.plantingAt(x,y),b=layout.plantingAt(x+.05,y+.05);if(a>.25)planted++;if(Math.floor(x)===Math.floor(x+.05)&&Math.floor(y)===Math.floor(y+.05))maxJump=Math.max(maxJump,Math.abs(a-b));}
 assert.ok(planted>0);assert.ok(maxJump<.05);const again=atlasLayout({scene:s,state:{}});assert.equal(again.plantingAt(2.5,12.5),layout.plantingAt(2.5,12.5));
});

test('real campaign reservations are finite and do not change any scene navigation or story object',()=>{
 const w=new World(JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url)))),before=JSON.stringify(w.data.scenes.map(s=>({floor:s.floor,doors:s.doors,objects:s.objects})));
 let buildings=0,stairs=0;for(const s of w.scenes.values())for(const r of buildingReservations(s)){buildings++;if(r.kind==='underground')stairs++;for(const b of [r.ground,r.visual,r.approach,...r.groundRects])assert.ok([b.x,b.y,b.w,b.h].every(Number.isFinite)&&b.w>0&&b.h>0);}
 assert.ok(buildings>30&&stairs>0);assert.equal(JSON.stringify(w.data.scenes.map(s=>({floor:s.floor,doors:s.doors,objects:s.objects}))),before);
});
