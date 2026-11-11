import test from 'node:test';
import assert from 'node:assert/strict';
import {flow,source} from './opening-flow.mjs';
import {ORIGINS,originById} from '../origin-content.js';
import {legacyFrom,originLocation,validateOriginSave} from '../origins.js';
import {clearInteractionApproach} from '../quest-navigation.js';
import {findPath} from '../navigation.js';
import {validateSave} from '../save-validation.js';
import {resolveGuidedObjective} from '../guided-objective.js';
import {installEmbodiedOrigins,embodiedOriginObjects,replacesEmbodiedOriginObject,validateEmbodiedOrigins,migrateEmbodiedOrigins} from '../embodied-origins.js';

function setup(id='veyr-storm'){
 const h=flow(),w=h.w,events=[],notices=[];let saves=0;w.callbacks.onNotice=text=>notices.push(text);
 const controller=installEmbodiedOrigins(w,{onFeedback:e=>events.push(e),onSave:()=>saves++});
 const objects=w.objects.bind(w);w.objects=()=>[...objects().filter(o=>!replacesEmbodiedOriginObject(w,o)),...controller.objects()];
 w.newGame({originId:id,legacy:legacyFrom({})});
 return {...h,w,controller,events,notices,get saves(){return saves;},get dialog(){return h.dialog;}};
}
function walk(w,obj){
 assert.ok(obj,'a physical target is present');
 const route=findPath(w.scene,[w.state.x,w.state.y],obj.xy,1);
 for(const p of route)w.move(p[0]-w.state.x,p[1]-w.state.y);
 assert.ok(Math.hypot(w.state.x-obj.xy[0]-.5,w.state.y-obj.xy[1]-.5)<=2.3,'target reachable through the actual map');
}
function action(h,key,{manual=false}={}){
 const obj=h.controller.objects().find(o=>o.embodiedAction===key);walk(h.w,obj);
 if(manual){assert.equal(h.controller.beginAction(obj,{manual:true}),true);h.controller.setProgress(1,{point:obj.to});assert.equal(h.controller.completeAction(),true);}
 else {h.w.interact(obj);for(let i=0;i<20&&h.controller.active;i++)h.controller.advance(.1);assert.equal(h.controller.active,false);}
 assert.equal(h.w.state.mode,'field');return obj;
}
function travel(h,part){const target=h.w.objects().find(o=>o.originTravel===(part===1?1:-1));walk(h.w,target);h.w.interact(target);assert.equal(h.w.scene.originPart,part);}
function repaired(h,repair=0){action(h,'witness');if(h.w.state.chronicle.originId==='veyr-storm')action(h,'ground');action(h,'repair-'+repair);assert.equal(h.w.state.chronicle.step,2);}

test('Veyr begins in the world with a receiver action and no blocking opening paragraphs',()=>{
 const h=setup();assert.equal(h.dialog,null);assert.equal(h.w.state.mode,'field');assert.equal(h.w.state.chronicle.step,0);
 const o=h.controller.objects()[0];assert.equal(o.manipulation,'receiver');assert.equal(o.role,'embodiedAction');assert.deepEqual(h.w.state.party,[6]);
 assert.ok(h.w.state.story.journal.some(e=>e.id==='origin-start'),'full opening remains in the optional journal');
 action(h,'witness');assert.equal(h.dialog,null);assert.equal(h.w.state.chronicle.step,1);assert.equal(h.controller.snapshot().devices.receiver,true);
 assert.ok(h.events.some(e=>e.type==='signal'&&e.text.length<100));
 assert.deepEqual(h.notices,[],'the physical receiver replaces the native kit/instruction toast');
 h.w.notice('A separate field event remains audible.');assert.deepEqual(h.notices,['A separate field event remains audible.'],'unrelated notices are restored after the scoped action');
});

test('the mast must be grounded before either repair, and cable dragging previews without committing',()=>{
 const h=setup();action(h,'witness');
 assert.equal(h.controller.objects().some(o=>o.embodiedAction.startsWith('repair-')),false);
 const cable=h.controller.objects()[0];assert.equal(cable.manipulation,'cable');assert.ok(cable.from&&cable.to);assert.ok(Math.hypot(cable.from.x-cable.to.x,cable.from.y-cable.to.y)>.4);
 walk(h.w,cable);assert.equal(h.controller.beginAction(cable,{manual:true}),true);h.controller.setProgress(.5,{point:{x:cable.from.x+.5,y:cable.from.y}});
 assert.equal(h.controller.snapshot().pending.progress,.5);assert.equal(h.controller.snapshot().devices.grounded,false);assert.equal(h.controller.completeAction(),false);
 assert.deepEqual(h.controller.snapshot().pending.dragPoint,{x:cable.from.x+.5,y:cable.from.y});
 h.controller.cancelAction();assert.equal(h.w.state.chronicle.step,1);assert.equal(h.controller.snapshot().devices.grounded,false);
 action(h,'ground',{manual:true});assert.equal(h.controller.snapshot().devices.grounded,true);assert.equal(h.w.state.chronicle.step,1);
 assert.equal(h.controller.objects().length,2);assert.ok(h.controller.objects().every(o=>o.requiresChoice));
});

test('partial cable work saves and restores without inventing a native repair or consuming supplies',()=>{
 const h=setup();action(h,'witness');action(h,'ground');const before=structuredClone(h.w.state.items),saved=h.w.save();
 const snapshot=JSON.parse(saved);validateEmbodiedOrigins(snapshot);validateOriginSave(snapshot);assert.equal(snapshot.chronicle.choices.repair,undefined);
 h.w.restore(saved);assert.equal(h.controller.snapshot().devices.grounded,true);assert.equal(h.w.state.chronicle.step,1);assert.deepEqual(h.w.state.items,before);
 action(h,'repair-1');assert.equal(h.w.state.chronicle.choices.repair,1);assert.equal(h.controller.snapshot().devices.coilSeparated,true);assert.equal(h.controller.snapshot().devices.vaneRaised,false);assert.equal(h.w.state.items.ether,before.ether+1);
});

test('releasing a held control, leaving reach, pausing or changing scenes cannot commit an unfinished action',()=>{
 for(const reason of ['release','reach','pause','scene']){
  const h=setup();action(h,'witness');const o=h.controller.objects()[0];walk(h.w,o);h.controller.beginAction(o,{hold:true});h.controller.advance(.1);
  if(reason==='release')h.controller.advance(.1,{held:false});
  if(reason==='reach'){h.w.state.x=0;h.w.state.y=0;h.controller.advance(.1);}
  if(reason==='pause')h.controller.advance(.1,{active:false});
  if(reason==='scene')travel(h,1);
  assert.equal(h.controller.active,false,reason);assert.equal(h.controller.snapshot().devices.grounded,false,reason);assert.equal(h.w.state.chronicle.step,1);
 }
});

test('a stale repair control cannot choose a branch before grounding or after the stage changes',()=>{
 const h=setup();action(h,'witness');const fake={role:'embodiedAction',originId:'veyr-storm',embodiedAction:'repair-0',id:'embodied:veyr-storm:repair-0'};
 assert.equal(h.controller.beginAction(fake),false);assert.equal(h.w.state.chronicle.choices.repair,undefined);
 action(h,'ground');const old=h.controller.objects().find(o=>o.choiceIndex===1);action(h,'repair-0');assert.equal(h.controller.beginAction(old),false);assert.equal(h.w.state.chronicle.choices.repair,0);
});

test('the peaceful grounded spare vane clears the native encounter and leaves final choices explicit',()=>{
 const h=setup();repaired(h);travel(h,1);const originalPatrol=h.w.objects().find(o=>o.originStep===2&&o.type==='patrol');assert.ok(originalPatrol);
 action(h,'divert',{manual:true});assert.equal(h.w.state.chronicle.choices.approach,'diversion');assert.equal(h.w.state.chronicle.step,3);assert.equal(h.w.currentBattle,null);assert.equal(h.controller.snapshot().devices.diverted,true);
 assert.equal(h.controller.objects().length,2);assert.deepEqual(h.controller.objects().map(o=>o.choiceIndex),[0,1]);assert.ok(h.controller.objects().every(o=>o.requiresChoice));
 const native=h.w.scene.objects.find(o=>o.originStep===3);h.w.interact(native);assert.equal(h.w.state.chronicle.step,3);assert.equal(h.w.state.chronicle.choices.destiny,undefined,'retained generic objective cannot silently choose the first destiny');assert.equal(h.dialog,null);
 action(h,'destiny-1');assert.equal(h.w.state.chronicle.choices.destiny,1);assert.equal(h.controller.snapshot().devices.choice,1);
});

test('all origins retain both repairs, both encounter approaches and both native inheritances',()=>{
 let completed=0;
 for(const o of ORIGINS)for(const repair of [0,1])for(const fight of [false,true])for(const destiny of [0,1]){
  const h=setup(o.id);repaired(h,repair);travel(h,1);
  if(fight){const enemy=h.w.objects().find(o=>o.originStep===2&&o.type==='patrol');walk(h.w,enemy);h.w.interact(enemy);assert.ok(h.w.currentBattle);h.w.winBattle();assert.equal(h.dialog,null);assert.equal(h.w.state.chronicle.step,3);}
  else action(h,'divert');
  action(h,'destiny-'+destiny);assert.equal(h.w.state.chronicle.step,4);action(h,'depart');
  const c=h.w.state.chronicle,record=c.records.find(r=>r.originId===o.id);assert.equal(c.phase,'present');assert.equal(record.repair,repair,o.id);assert.equal(record.destiny,destiny,o.id);assert.equal(record.approach,fight?'battle':'diversion',o.id);assert.equal(record.effect,o.effects[destiny],o.id);
  assert.equal(h.w.state.party[0],o.hero);assert.equal(h.w.state.chapter,1);assert.equal(h.w.state.story.parcel,false);assert.equal(h.w.state.bosses.length,0);assert.equal(h.w.state.mode,'field');assert.equal(h.dialog,null);validateOriginSave(h.w.state);validateEmbodiedOrigins(h.w.state);completed++;
 }
 assert.equal(completed,56);
});

test('old valid origin saves migrate from native choices and malformed physical history is rejected',()=>{
 const h=setup();repaired(h,1);const old=structuredClone(h.w.state);delete old.embodiedOrigins;
 migrateEmbodiedOrigins(old);assert.equal(old.embodiedOrigins.origins['veyr-storm'].grounded,true);assert.equal(old.embodiedOrigins.origins['veyr-storm'].coilSeparated,true);
 assert.equal(validateEmbodiedOrigins({}),true);
 for(const bad of [null,{schema:'wrong',origins:{}},{schema:'ash-aether.embodied-origins/1',origins:{unknown:{}}},{schema:'ash-aether.embodied-origins/1',origins:{'veyr-storm':{grounded:'yes'}}},{schema:'ash-aether.embodied-origins/1',origins:{'veyr-storm':{choice:4}}}])assert.throws(()=>validateEmbodiedOrigins({embodiedOrigins:bad}),/Invalid physical origin/);
});

test('installing twice preserves the same controller and destroying restores native behavior',()=>{
 const h=setup();assert.equal(installEmbodiedOrigins(h.w),h.controller);h.controller.destroy();
 assert.equal(h.w.embodiedOrigins,undefined);assert.equal(h.controller.beginAction({}),false);
 h.w.interact(h.w.scene.objects.find(o=>o.originStep===0));assert.ok(h.dialog,'the original narrative callback is restored');
});

test('enhanced saves validate physical mechanisms before replacing the live world, preserving old absent fields',()=>{
 const h=setup();action(h,'witness');action(h,'ground');
 const saved=JSON.parse(h.w.save()),wrapper={schema:'ash-aether.enhanced-save/1',world:saved};
 const checked=validateSave(source,wrapper);assert.equal(checked.world.embodiedOrigins.origins['veyr-storm'].grounded,true);assert.equal(checked.world.chronicle.step,1);
 for(const bad of [null,{schema:'wrong',origins:{}},{schema:'ash-aether.embodied-origins/1',origins:{'veyr-storm':{grounded:'yes'}}}]){
  const value=structuredClone(saved);value.embodiedOrigins=bad;const live=h.w.state,before=h.w.save();
  assert.throws(()=>validateSave(source,{...wrapper,world:value}),/Invalid physical origin/);
  assert.throws(()=>h.w.restore(value),/Invalid physical origin/);assert.equal(h.w.state,live);assert.equal(h.w.save(),before);
 }
 const old=structuredClone(saved);delete old.embodiedOrigins;const legacy=validateSave(source,{...wrapper,world:old});assert.equal(legacy.world.embodiedOrigins,undefined);h.w.restore(old);assert.equal(h.w.state.embodiedOrigins,undefined);
});

test('guided objectives resolve physical replacements and retain an explicit choice boundary',()=>{
 const h=setup();let goal=resolveGuidedObjective(h.w);assert.equal(goal.object.role,'embodiedAction');assert.equal(goal.object.embodiedAction,'witness');
 action(h,'witness');goal=resolveGuidedObjective(h.w);assert.equal(goal.object.embodiedAction,'ground');
 action(h,'ground');goal=resolveGuidedObjective(h.w);assert.equal(goal.object.choiceGroup,'repair');assert.equal(goal.object.requiresChoice,true);
 action(h,'repair-0');goal=resolveGuidedObjective(h.w);assert.equal(goal.object.originTravel,1);travel(h,1);
 goal=resolveGuidedObjective(h.w);assert.equal(goal.object.embodiedAction,'divert');action(h,'divert');goal=resolveGuidedObjective(h.w);assert.equal(goal.object.choiceGroup,'destiny');assert.equal(goal.object.requiresChoice,true);
});

test('fresh Veyr arrival faces the mast without relocating restores, map returns or the second part',()=>{
 const h=setup();assert.deepEqual([h.w.state.x,h.w.state.y],[10.5,21.5]);assert.equal(h.w.walkable(10.5,21.5),true);
 const receiver=h.controller.objects()[0];assert.deepEqual(receiver.xy,[7,17]);assert.ok(findPath(h.w.scene,[h.w.state.x,h.w.state.y],receiver.xy,1).length>0);
 const canonical=h.w.scene.arrive.slice();assert.deepEqual(canonical,[10,21],'the compact scene owns its explicit south return approach');
 walk(h.w,receiver);const position=[h.w.state.x,h.w.state.y],saved=h.w.save();h.w.restore(saved);assert.deepEqual([h.w.state.x,h.w.state.y],position,'restoring keeps the saved position');
 travel(h,1);assert.deepEqual([h.w.state.x,h.w.state.y],h.w.scene.arrive.map(n=>n+.5),'the second map retains its native spawn');
 travel(h,0);assert.deepEqual([h.w.state.x,h.w.state.y],canonical.map(n=>n+.5),'returning uses the canonical first-map entrance');
 const other=setup('mira-archive');assert.deepEqual([other.w.state.x,other.w.state.y],other.w.scene.arrive.map(n=>n+.5),'another origin retains its arrival');
});


test('Sable sounds the reed from spawn and the relay answers from a second location',()=>{
 const h=setup('sable-reed'),{w}=h;
 const reed=h.controller.objects()[0];
 assert.equal(reed.label,'Sound the tuning reed');
 assert.ok(clearInteractionApproach(w.scene,[w.state.x,w.state.y],reed));
 assert.ok(reed.duration<.5);
 w.interact(reed);
 for(let i=0;i<5;i++)h.controller.advance(.1);
 const call=h.events.find(event=>event.kind==='reed-call');
 assert.equal(w.state.chronicle.step,1);
 assert.equal(call.caption,'The relay answers in your mother’s voice');
 assert.ok(call.echo.delay>0&&Math.hypot(call.echo.x-call.x,call.echo.y-call.y)>1);
 assert.equal(h.dialog,null);
 action(h,'repair-0');
 travel(h,1);
 assert.ok(resolveGuidedObjective(w).label.includes('Face the Wireback'));
 const patrol=w.objects().find(object=>object.type==='patrol'&&object.originId==='sable-reed');
 const speaker=h.controller.objects()[0];
 assert.equal(speaker.label,'Ring the side speaker');
 assert.ok(findPath(w.scene,patrol.xy,speaker.xy,1).length>0);
 action(h,'divert');
 assert.equal(w.state.chronicle.choices.approach,'diversion');
 assert.equal(w.currentBattle,null);
 assert.ok(h.events.some(event=>event.caption==='The Wireback follows the speaker'));
});
