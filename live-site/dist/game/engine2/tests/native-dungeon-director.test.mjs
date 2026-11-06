import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry} from '../cistern-renderer.js';
import {ORIGINS} from '../origin-content.js';
import {installEmbodiedOrigins} from '../embodied-origins.js';
import {installCampaignActuators} from '../campaign-actuators.js';
import {nativeDungeonPlan,appendNativeDungeonLegibility} from '../native-dungeon-director.js';

const source=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
function setup(scene=47){const w=new World(source);w.newGame({quiet:true});w.state.scene=scene;w.state.chapter=w.scene.chapter||1;w.state.mode='field';w.state.x=w.scene.arrive[0]+.5;w.state.y=w.scene.arrive[1]+.5;w.objects();return w;}
function originSetup(origin,part=0){const w=new World(source),controller=installEmbodiedOrigins(w);w.newGame({originId:origin.id,quiet:true});w.state.scene=origin.location+part;w.state.chronicle.step=part?2:0;w.state.mode='field';w.objects();return {w,controller};}
function plan(w,objects=w.objects(),feedback=null){return nativeDungeonPlan(w,{objects,feedback});}
function geometry(w,objects=w.objects(),feedback=null,time=2){const m=new Geometry(),g=new Geometry(),p=appendNativeDungeonLegibility(m,g,{world:w,objects,feedback,time,range:1000});for(const mesh of[m,g]){assert.equal(mesh.v.length%36,0);assert.ok(mesh.v.every(Number.isFinite));for(let i=0;i<mesh.v.length;i+=12)assert.ok(mesh.v[i+1]>=0&&mesh.v[i+1]<.09,'legibility remains flush with the native floor');}return {plan:p,data:[...m.v,...g.v]};}
const stateOf=p=>p.mechanisms.map(m=>[m.id,m.progress]);
const mechanism=(p,predicate)=>{const m=p.mechanisms.find(m=>predicate(m.object));assert.ok(m,'native mechanism is represented');return m;};

test('a held native valve previews its real progress, and only its own saved stages become committed',()=>{
 const w=setup(),objects=w.objects(),o=objects.find(o=>o.type==='puzzle'&&o.stage_flag);assert.ok(o);const before=w.save(),idle=plan(w,objects),m=mechanism(idle,n=>n===o||n.type===o.type&&n.bit===o.bit),base=geometry(w,objects).data;
 const preview=plan(w,objects,{pending:{object:{...o},progress:.64}}),moving=mechanism(preview,n=>n.type===o.type&&n.bit===o.bit);assert.equal(moving.progress.status,'moving');assert.ok(moving.progress.preview>.6);assert.equal(moving.progress.committed,m.progress.committed);assert.notDeepEqual(geometry(w,objects,{pending:{object:{...o},progress:.64}}).data,base,'a real connected conduit responds before an answer is chosen');assert.equal(w.save(),before);
 w.setBit(...o.stage_flag);const staged=mechanism(plan(w,objects),n=>n.type===o.type&&n.bit===o.bit);assert.ok(staged.progress.committed>m.progress.committed&&staged.progress.committed<1,'the native first stage is partial');assert.equal(staged.progress.status,'changed','a committed first stage is already a visible native change');w.unsetBit(...o.stage_flag);w.setBit(w.flagFor(o),o.bit);const done=mechanism(plan(w,objects),n=>n.type===o.type&&n.bit===o.bit);assert.equal(done.progress.committed,1);assert.equal(done.progress.status,'changed');assert.notDeepEqual(geometry(w,objects).data,base);
});

test('ordered note returns follow the saved phrase and a native incorrect-note reset clears the return',()=>{
 const w=setup(404),objects=w.objects(),o=objects.find(o=>o.type==='note');assert.ok(o);const initial=mechanism(plan(w,objects),n=>n.type==='note'),base=geometry(w,objects).data;
 w.state.flags['sequence:'+o.sequence_address]=2;const partial=mechanism(plan(w,objects),n=>n.type==='note');assert.ok(partial.progress.committed>initial.progress.committed&&partial.progress.committed<1);assert.notDeepEqual(geometry(w,objects).data,base);
 w.state.flags['sequence:'+o.sequence_address]=0;assert.equal(mechanism(plan(w,objects),n=>n.type==='note').progress.committed,initial.progress.committed);assert.deepEqual(geometry(w,objects).data,base);w.setBit(w.flagFor(o),o.completes_bit);assert.equal(mechanism(plan(w,objects),n=>n.type==='note').progress.committed,1);
});

test('the four authored investigations reflect their actual prerequisites, sequences, routines and custody outcomes',()=>{
 const scenarios=[
  [703,[{traced:true},{traced:true,isolated:true},{traced:true,isolated:true,vented:true},{traced:true,isolated:true,vented:true,drained:true}]],
  [704,[{heard:true},{heard:true,phrase:1},{heard:true,phrase:2},{heard:true,phrase:3},{heard:true,phrase:4}]],
  [705,[{observations:1,phase:1},{observations:2,phase:2},{observations:3,phase:0}]],
  [707,[{food:true},{food:true,shelter:true},{food:false,shelter:true,custody:'sheltered'},{food:false,shelter:true,custody:'released'}]]
 ];
 for(const[id,stages]of scenarios){const w=setup(id),objects=w.objects();let previous=stateOf(plan(w,objects));assert.equal(plan(w,objects).mechanisms.filter(m=>m.object.investigationRole).length,3,'three actual worksite inputs '+id);
  for(const saved of stages){w.state.exploration.investigations??={};w.state.exploration.investigations[w.scene.chapter]=saved;const before=w.save(),next=plan(w,objects);assert.notDeepEqual(stateOf(next),previous,'native saved investigation stage '+id+':'+JSON.stringify(saved));assert.equal(w.save(),before);geometry(w,objects);previous=stateOf(next);}
  w.state.exploration.solved.push('district:'+w.scene.chapter+':latch');assert.ok(plan(w,objects).mechanisms.filter(m=>m.object.investigationRole).every(m=>m.progress.committed===1),'only the actual solved latch completes the worksite');
 }
});

test('fourteen origin scenes retain native stations and read saved physical choices without changing history',()=>{
 let count=0;
 for(const origin of ORIGINS)for(const part of[0,1]){const {w,controller}=originSetup(origin,part),objects=[...w.objects(),...controller.objects()],before=w.save(),p=plan(w,objects);count++;assert.ok(p.mechanisms.length,'native worksite '+origin.id+':'+part);assert.ok(p.routes.length,'real service route '+origin.id+':'+part);
  for(const m of p.mechanisms){const anchor=p.anchors.find(a=>a.id===m.anchorId);assert.ok(anchor);assert.deepEqual(anchor.xy,m.object.xy);assert.deepEqual([anchor.x,anchor.z],[m.object.xy[0]+.5,m.object.xy[1]+.5]);}
  geometry(w,objects);assert.equal(w.save(),before);const record=w.state.embodiedOrigins.origins[origin.id],initial=stateOf(p);if(part){record.diverted=true;}else{record.repair=0;record.grounded=true;record.witnessed=true;record.receiver=true;}assert.notDeepEqual(stateOf(plan(w,objects)),initial,'saved origin work changes the director '+origin.id+':'+part);
  if(part){record.choice=0;const shared=stateOf(plan(w,objects));record.choice=1;assert.notDeepEqual(stateOf(plan(w,objects)),shared,'equal progress preserves the actual civic choice '+origin.id);}else{const first=stateOf(plan(w,objects));record.repair=1;assert.notDeepEqual(stateOf(plan(w,objects)),first,'equal progress preserves the alternate repair '+origin.id);}
 }
 assert.equal(count,14);
});

test('all legibility conduits remain on adjacent native floor cells and respond to actual collision changes',()=>{
 const w=setup(703),objects=w.objects(),before=w.save(),floor=JSON.stringify(w.scene.floor),native=JSON.stringify(w.scene.objects),p=plan(w,objects);assert.ok(p.routes.length);geometry(w,objects);
 for(const route of p.routes)for(let i=0;i<route.points.length;i++){const [x,z]=route.points[i];assert.equal(w.scene.floor[z]?.[x],'.');assert.ok(!(w.scene.affordanceBlocked||[]).some(q=>q[0]===x&&q[1]===z));if(i)assert.equal(Math.abs(x-route.points[i-1][0])+Math.abs(z-route.points[i-1][1]),1,'no signal cuts through walls');}
 assert.equal(w.save(),before);assert.equal(JSON.stringify(w.scene.floor),floor);assert.equal(JSON.stringify(w.scene.objects),native);const long=p.routes.find(r=>r.points.length>3);assert.ok(long);const [x,z]=long.points[1],old=w.scene.floor,rows=old.map(r=>typeof r==='string'?r.split(''):[...r]);rows[z][x]='#';w.scene.floor=rows.map(r=>r.join(''));for(const r of plan(w,objects).routes)assert.ok(!r.points.some(q=>q[0]===x&&q[1]===z),'a changed native wall invalidates the cached conduit');w.scene.floor=old;
});

test('in-place floor and blocked-cell edits reroute native conduits and restore them when reopened',()=>{
 for(const change of ['floor','blocked']){
  const w=setup(703),objects=w.objects();w.scene.affordanceBlocked??=[];const floorReference=w.scene.floor,blockedReference=w.scene.affordanceBlocked,original=plan(w,objects),route=original.routes.find(r=>r.points.length>3);assert.ok(route);const [x,z]=route.points[1],row=w.scene.floor[z];
  if(change==='floor')w.scene.floor[z]=typeof row==='string'?row.slice(0,x)+'#'+row.slice(x+1):row.map((v,i)=>i===x?'#':v);
  else w.scene.affordanceBlocked.push([x,z]);
  assert.equal(w.scene.floor,floorReference);assert.equal(w.scene.affordanceBlocked,blockedReference,'the topology arrays keep their identity');
  const closed=plan(w,objects);assert.equal(closed.routes.length,original.routes.length,'the actual room has alternate paths, so closing a cell reroutes rather than dropping its conduits');assert.notDeepEqual(closed.routes,original.routes);for(const r of closed.routes)assert.ok(!r.points.some(q=>q[0]===x&&q[1]===z),'all rerouted signals avoid the in-place closure');
  if(change==='floor')w.scene.floor[z]=row;else w.scene.affordanceBlocked.pop();
  const reopened=plan(w,objects);assert.deepEqual(reopened.routes,original.routes,'reopening the same arrays restores every original native route');assert.ok(reopened.routes.some(r=>r.points.some(q=>q[0]===x&&q[1]===z)),'the reopened cell is actually used again');geometry(w,objects);
 }
});

test('planning on an unmigrated state cannot create ledgers, and unsupported people do not become mechanisms',()=>{
 const w=setup(),objects=w.scene.objects;delete w.state.physicalLore;delete w.state.exploration;delete w.state.embodiedOrigins;delete w.state.answeringNetwork;const before=JSON.stringify(w.state);nativeDungeonPlan(w,{objects});geometry(w,objects);assert.equal(JSON.stringify(w.state),before,'read-only projection cannot normalize or initialize native ledgers');
 const ordinary=setup(12),people=ordinary.objects().filter(o=>o.type==='npc'),quiet=nativeDungeonPlan(ordinary,{objects:people});assert.equal(quiet.mechanisms.length,0);assert.equal(quiet.forms.length,0);const output=geometry(ordinary,people);assert.equal(output.data.length,0,'no new glyphs or effect litter for unsupported ordinary actors');assert.ok(!quiet.forms.includes('pressure-bridge'),'the vocabulary cannot invent an unimplemented bridge');
});

test('the seven beats refer to actual local anchors and distinguish approach, held manipulation and saved aftermath',()=>{
 const w=setup(),o=w.objects().find(o=>o.type==='puzzle'),objects=[o],before=w.save(),approach=plan(w,objects);assert.equal(approach.currentPhase,'approach');assert.equal(approach.beats.length,7);const ids=new Set(approach.anchors.map(a=>a.id));for(const beat of approach.beats){assert.equal(beat.supported,beat.anchorIds.length>0);for(const id of beat.anchorIds)assert.ok(ids.has(id),'a beat cannot manufacture another room');}assert.equal(approach.beats.find(b=>b.phase==='encounter').supported,false,'no encounter is invented for a supplied control-only view');assert.ok(approach.forms.includes('floodgate'));assert.ok(approach.unsupportedForms.includes('pressure-bridge'));
 const moving=plan(w,objects,{pending:{object:o,progress:.5}});assert.equal(moving.currentPhase,'manipulate');assert.equal(w.save(),before);w.state.x=o.xy[0]+.5;w.state.y=o.xy[1]+.5;w.setBit(w.flagFor(o),o.bit);const after=plan(w,objects);assert.equal(after.currentPhase,'aftermath');assert.equal(after.progress.complete,1);assert.equal(after.progress.value,1);assert.ok(after.beats.find(b=>b.phase==='aftermath').anchorIds.includes(after.mechanisms[0].anchorId));
 const room=setup(703),door=room.scene.doors[0],doorway=plan(room),anchor=doorway.anchors.find(a=>a.role==='threshold'&&a.object?.type==='door'&&a.xy[0]===door.xy[0]&&a.xy[1]===door.xy[1]);assert.ok(anchor,'the authored doorway without a native type still supports the threshold beat');assert.deepEqual(anchor.xy,door.xy);assert.deepEqual([anchor.x,anchor.z],[door.xy[0]+.5,door.xy[1]+.5]);assert.ok(doorway.beats.find(b=>b.phase==='threshold').anchorIds.includes(anchor.id));room.state.exploration.solved.push('district:3:latch');room.state.x=anchor.x;room.state.y=anchor.z;const exit=plan(room);assert.equal(exit.currentPhase,'release','a completed investigation beside its actual return door reaches the release beat');assert.ok(exit.beats.find(b=>b.phase==='release').anchorIds.includes(anchor.id));
});

test('the actual campaign actuator snapshot previews its native control without committing the action',()=>{
 const w=setup(),objects=w.objects(),o=objects.find(o=>o.type==='puzzle'),controller=installCampaignActuators(w);w.state.x=o.xy[0]+.5;w.state.y=o.xy[1]+.5;const before=w.save(),base=geometry(w,objects).data;
 assert.equal(controller.beginAction(o,{manual:true}),true);controller.setProgress(.61);const feedback=controller.snapshot();assert.equal(feedback.pending.object.role,'worldActuator');assert.ok(feedback.pending.object.embodiedAction.startsWith('world:'));const projected=plan(w,objects,feedback),m=mechanism(projected,n=>n.type==='puzzle'&&n.bit===o.bit);assert.equal(m.progress.status,'moving');assert.equal(m.progress.preview,.61);assert.equal(m.progress.committed,0);assert.notDeepEqual(geometry(w,objects,feedback).data,base,'the real controller descriptor lights its native architectural conduit');assert.equal(w.save(),before,'a held actuator snapshot cannot select an answer or advance a native flag');controller.destroy();
});

test('feedback-only origin repair handles receive exact floor branches and a choice group counts once',()=>{
 const origin=ORIGINS.find(o=>o.id==='veyr-storm'),{w,controller}=originSetup(origin),record=w.state.embodiedOrigins.origins[origin.id];w.state.chronicle.step=1;record.grounded=true;const native=w.objects(),handles=controller.objects();assert.equal(handles.length,2);const handle=handles[0],marker=w.scene.objects.find(o=>o.originStep===1&&o.type==='puzzle');assert.notDeepEqual(handle.xy,marker.xy,'the native physical choice has an offset input');w.state.x=handle.xy[0]+.5;w.state.y=handle.xy[1]+.5;const before=w.save(),idle=plan(w,native);
 assert.equal(controller.beginAction(handle,{manual:true}),true);controller.setProgress(.7);const feedback=controller.snapshot(),projected=plan(w,native,feedback),m=mechanism(projected,n=>n.id===handle.id),branch=projected.routes.find(r=>r.id.startsWith('origin-input:')&&r.mechanismIds.includes(m.id));assert.ok(branch,'a pending handle absent from the native object list still reaches its worksite');assert.deepEqual(branch.points[0],handle.xy);assert.deepEqual(branch.points.at(-1),marker.xy);for(let i=0;i<branch.points.length;i++){const [x,z]=branch.points[i];assert.equal(w.scene.floor[z]?.[x],'.');if(i)assert.equal(Math.abs(x-branch.points[i-1][0])+Math.abs(z-branch.points[i-1][1]),1);}assert.equal(m.progress.status,'moving');assert.equal(m.progress.preview,.7);assert.notDeepEqual(geometry(w,native,feedback).data,geometry(w,native).data);assert.equal(w.save(),before);
 controller.cancelAction();const full=plan(w,[...native,...handles]);assert.equal(full.progress.total,idle.progress.total,'two explicit handles describe one native repair decision');record.repair=0;const chosen=plan(w,[...native,...handles]);assert.equal(chosen.mechanisms.filter(m=>m.object.choiceGroup==='repair'&&m.progress.done).length,1,'only the selected repair becomes complete');assert.equal(chosen.progress.complete,chosen.progress.total,'the unselected alternative is not an unfinished second task');assert.equal(chosen.progress.value,1);
});
