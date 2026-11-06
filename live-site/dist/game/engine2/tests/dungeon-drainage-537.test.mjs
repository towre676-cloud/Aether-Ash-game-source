import test from 'node:test';
import assert from 'node:assert/strict';
import {earnOpening} from './opening-flow.mjs';
import {Geometry} from '../cistern-renderer.js';
import {appendDungeonArchitecture,appendDungeonDynamics,dungeonDrainageView} from '../adventure-dungeon-architecture.js';

function visit(){
 const h=earnOpening(),w=h.w;w.state.chapter=3;w.loadScene(703);h.finish();
 const p=appendDungeonArchitecture(new Geometry(),{world:w});
 return {h,w,p,use(role,label){const o=w.scene.objects.find(o=>o.investigationRole===role);w.state.x=o.xy[0]+.5;w.state.y=o.xy[1]+.5;h.use(o);const at=h.dialog?.choices?.findIndex(c=>c.label.includes(label));assert.ok(at>=0,label);h.choose(at);}};
}
function draw(w){const mesh=new Geometry(),glow=new Geometry();appendDungeonDynamics(mesh,glow,{world:w,time:3,range:1000});return {mesh:mesh.data(),glow:glow.data()};}
function materialVertices(data,id){const out=[];for(let i=0;i<data.length;i+=12)if(data[i+9]===id)out.push(Array.from(data.slice(i,i+12)));return out;}

test('the real inlet, relief and grate sequence changes flowing water into retained water, a narrow flow, then an exposed drain',()=>{
 const v=visit(),{w,p}=v,flags=JSON.stringify(w.state.flags),items={...w.state.items},floor=JSON.stringify(w.scene.floor);
 const before=draw(w),start=dungeonDrainageView(w,p);assert.equal(start.phase,'flowing');assert.equal(start.segments.length,4);assert.equal(start.width,.38);assert.ok(materialVertices(before.mesh,3).length>0);assert.ok(before.glow.length>0);
 // Native rejected answers do not advance the visual consequence.
 v.use('work','Lift and clear');assert.deepEqual(draw(w),before);assert.equal(dungeonDrainageView(w,p).phase,'flowing');
 v.use('control','Open the relief');assert.deepEqual(draw(w),before);
 v.use('evidence','Trace the seep');v.use('control','Close the supply');
 const isolated=draw(w);assert.equal(dungeonDrainageView(w,p).phase,'isolated');assert.equal(materialVertices(isolated.mesh,3).length,0,'retained water is still, not the flowing-water shader');assert.equal(isolated.glow.length,0,'isolated inlet has no travelling flow marks');assert.notDeepEqual(isolated.mesh,before.mesh);
 v.use('work','Lift and clear');assert.deepEqual(draw(w),isolated,'isolation alone cannot dry the floor');
 v.use('control','Open the relief');const vent=dungeonDrainageView(w,p);assert.equal(vent.phase,'vented');assert.ok(vent.width<start.width);assert.ok(vent.flow<start.flow);assert.ok(materialVertices(draw(w).mesh,3).length>0);
 v.use('work','Lift and clear');const dry=draw(w);assert.equal(dungeonDrainageView(w,p).phase,'drained');assert.equal(dungeonDrainageView(w,p).width,0);assert.equal(materialVertices(dry.mesh,3).length,0);assert.equal(dry.glow.length,0);assert.notDeepEqual(dry.mesh,isolated.mesh);assert.ok(w.state.exploration.solved.includes('district:3:latch'));
 assert.equal(JSON.stringify(w.state.flags),flags);assert.deepEqual(w.state.items,items);assert.equal(JSON.stringify(w.scene.floor),floor);
 const saved=w.save();draw(w);assert.equal(w.save(),saved,'rendering does not commit or award anything');
 w.restore(saved);v.h.finish();appendDungeonArchitecture(new Geometry(),{world:w});assert.equal(dungeonDrainageView(w).phase,'drained','the exact saved outcome restores without another action');
});

test('the shallow channel uses only connected native service cells and disappears where the real floor closes',()=>{
 const {w,p}=visit(),view=dungeonDrainageView(w,p),before=w.save();
 for(const s of view.segments){assert.equal(Math.abs(s.to[0]-s.from[0])+Math.abs(s.to[1]-s.from[1]),1);for(const q of[s.from,s.to])assert.equal(w.scene.floor[q[1]][q[0]],'.');}
 const data=draw(w);for(const vertex of materialVertices(data.mesh,3)){assert.ok(vertex[1]<=.05,'water never creates an upright obstruction');assert.equal(w.scene.floor[Math.floor(vertex[2])][Math.floor(vertex[0])],'.');}
 assert.ok(data.glow.length/36<100,'flow marks stay bounded');assert.equal(w.save(),before);
 const blocked=view.segments[1].to,old=w.scene.floor;w.scene.floor=old.map((row,z)=>z===blocked[1]?row.slice(0,blocked[0])+'#'+row.slice(blocked[0]+1):row);
 try{const changed=dungeonDrainageView(w,p);assert.ok(changed.segments.every(s=>[s.from,s.to].every(q=>q[0]!==blocked[0]||q[1]!==blocked[1])));}
 finally{w.scene.floor=old;}
});

test('an already solved legacy pump room stays dry and other dungeon chapters receive no drainage channel',()=>{
 const {w,p}=visit();w.state.exploration.solved.push('district:3:latch');assert.equal(dungeonDrainageView(w,p).phase,'drained');assert.equal(materialVertices(draw(w).mesh,3).length,0);
 w.state.scene=704;w.state.chapter=4;appendDungeonArchitecture(new Geometry(),{world:w});assert.equal(dungeonDrainageView(w),null);
});
