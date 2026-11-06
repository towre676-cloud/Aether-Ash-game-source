import test from 'node:test';
import assert from 'node:assert/strict';
import {flow} from './opening-flow.mjs';
import {SIDE_CAMPAIGNS} from '../frontiers.js';
import {NETWORK_WORKS} from '../answering-network.js';
import {PHYSICAL_LORE} from '../physical-lore-content.js';
import {physicalBindings} from '../physical-lore.js';
import {lifeState} from '../townlife.js';
import {installTownLife} from '../townlife.js';
import {REGIONS as LIFE_REGIONS} from '../regional-content.js';
import {installRegionalLife} from '../regional-life.js';
import {interactionPath} from '../quest-navigation.js';
import {installCampaignActuators,campaignActuatorSpec} from '../campaign-actuators.js';

function setup(scene=49,{controlled=true}={}){
 const h=flow(),w=h.w;w.state.scene=scene;w.state.chapter=w.scene.chapter||1;w.state.x=w.scene.arrive[0]+.5;w.state.y=w.scene.arrive[1]+.5;w.state.mode='field';w.objects();
 let context=null,saves=0;const events=[];
 const controller=controlled?installCampaignActuators(w,{onFeedback:e=>events.push(e),onSave:()=>saves++}):null;
 if(controller){const report=w.callbacks.onDialog;w.callbacks.onDialog=value=>{context=controller.presenting;report(value);};}
 return {...h,w,controller,events,get dialog(){return h.dialog;},get context(){return context;},get saves(){return saves;}};
}
function native(h,predicate=o=>o.type==='puzzle'){const o=h.w.objects().find(predicate);assert.ok(o,'native control exists');for(const pair of o.requires_flags||[])h.w.setBit(...pair);if(o.requires!==undefined)h.w.setBit(h.w.flagFor(o),o.requires);return o;}
function reach(h,o){const path=interactionPath(h.w.scene,[h.w.state.x,h.w.state.y],o);assert.notEqual(path,null,'the real control has an unobstructed approach');for(const point of path)h.w.move(point[0]-h.w.state.x,point[1]-h.w.state.y);}
function operate(h,o,{manual=false}={}){reach(h,o);if(h.controller){assert.equal(h.controller.beginAction(o,{manual}),true);if(manual){h.controller.setProgress(1);assert.equal(h.controller.completeAction(),true);}else for(let i=0;i<30&&h.controller.active;i++)h.controller.advance(.1);assert.equal(h.controller.active,false);}else h.w.interact(o);}
function choose(h,index){if(!h.controller)return h.choose(index);const value=h.dialog,token=h.context;assert.ok(value?.choices,'native choice remains explicit');h.w.state.mode='field';assert.equal(h.controller.performChoice(token,value.choices[index].action),true);h.finish();}

test('the actuator inventory is read only and classifies authored controls with native coordinates',()=>{
 const h=setup(),before=h.w.save(),list=h.controller.objects();assert.ok(list.length);assert.equal(h.w.save(),before);for(const o of list){assert.equal(o.role,'worldActuator');assert.deepEqual(o.xy,h.w.objects().find(n=>n.type===o.type&&n.xy[0]===o.xy[0]&&n.xy[1]===o.xy[1]).xy);assert.ok(o.actuatorId);assert.equal(o.actuatorFamily,'valve');assert.equal(o.controlLabel,'Turn the valve');}
 assert.equal(campaignActuatorSpec(h.w,list[0]).duration,1.15);
});

test('a real two-stage valve preserves native questions, answers, flags and outcomes after manipulation',()=>{
 const physical=setup(),baseline=setup(49,{controlled:false}),a=native(physical),b=native(baseline);reach(physical,a);reach(baseline,b);
 const before=physical.w.save();assert.equal(physical.controller.beginAction(a,{manual:true}),true);physical.controller.setProgress(.61);assert.equal(physical.w.save(),before,'preview cannot alter flags or inventory');assert.equal(physical.controller.completeAction(),false);
 physical.controller.setProgress(1);assert.equal(physical.controller.completeAction(),true);baseline.w.interact(b);assert.deepEqual(physical.dialog.choices.map(c=>c.label),baseline.dialog.choices.map(c=>c.label));assert.ok(physical.context);choose(physical,0);choose(baseline,0);assert.deepEqual(physical.w.state.flags,baseline.w.state.flags);
 operate(physical,a);operate(baseline,b);assert.deepEqual(physical.dialog.choices.map(c=>c.label),baseline.dialog.choices.map(c=>c.label));choose(physical,1);choose(baseline,1);assert.equal(physical.w.done(a),true);assert.equal(physical.w.save(),baseline.w.save());assert.equal(physical.controller.presenting,null);
});

test('real note controls preserve ordered phrase progression and incorrect-note resets',()=>{
 const physical=setup(112),baseline=setup(112,{controlled:false});const notes=h=>h.w.objects().filter(o=>o.type==='note'&&Array.isArray(o.pattern));assert.equal(notes(physical).length,2);
 for(const note of [0,1,0,2,0]){for(const h of[physical,baseline]){h.w.state.scene=note===2?406:112;h.w.state.x=h.w.scene.arrive[0]+.5;h.w.state.y=h.w.scene.arrive[1]+.5;h.w.state.mode='field';}const a=native(physical,o=>o.type==='note'&&o.note===note),b=native(baseline,o=>o.type==='note'&&o.note===note);operate(physical,a);operate(baseline,b);physical.finish();baseline.finish();assert.deepEqual(physical.w.state.flags,baseline.w.state.flags);}
 const o=notes(physical)[0];assert.equal(physical.w.bit(physical.w.flagFor(o),o.completes_bit),true);assert.equal(physical.w.save(),baseline.w.save());
});

test('public projects consume resources only after an explicit native funding choice and cannot be charged twice',()=>{
 const physical=setup(61),baseline=setup(61,{controlled:false});for(const h of[physical,baseline]){h.w.state.gold=500;h.w.state.items.ether=2;}
 const a=native(physical,o=>o.type==='project'),b=native(baseline,o=>o.type==='project');reach(physical,a);assert.equal(physical.controller.beginAction(a,{manual:true}),true);physical.controller.setProgress(.7);assert.equal(physical.w.state.gold,500);assert.equal(physical.w.state.items.ether,2);assert.equal(physical.dialog?.choices,undefined);
 physical.controller.setProgress(1);physical.controller.completeAction();operate(baseline,b);assert.equal(physical.w.state.gold,500,'opening the workbench does not choose how to fund it');assert.deepEqual(physical.dialog.choices.map(c=>c.label),baseline.dialog.choices.map(c=>c.label));
 const token=physical.context,oldAction=physical.dialog.choices[0].action;choose(physical,0);choose(baseline,0);assert.equal(physical.w.state.gold,200);assert.equal(physical.w.state.items.ether,2);assert.equal(physical.w.save(),baseline.w.save());assert.equal(physical.controller.performChoice(token,oldAction),false);assert.equal(physical.w.state.gold,200);
 operate(physical,a);physical.finish();assert.equal(physical.w.state.gold,200,'completed projects inspect without paying again');
});

test('pause, released holds, changed flags, scene changes and restored state cancel unfinished mechanisms',()=>{
 for(const interrupt of ['pause','release','flags','scene','restore']){const h=setup(),o=native(h);reach(h,o);const before=h.w.save();assert.equal(h.controller.beginAction(o,{manual:true,hold:true}),true);h.controller.setProgress(.8);assert.equal(JSON.parse(h.w.save()).campaignActuators,undefined,'preview is not persisted');
  if(interrupt==='flags')h.w.state.flags.unrelated=1;
  if(interrupt==='scene')h.w.state.scene=47;
  if(interrupt==='restore')h.w.restore(before);
  h.controller.advance(.1,{active:interrupt!=='pause',held:interrupt!=='release'});assert.equal(h.controller.active,false,interrupt);assert.equal(h.controller.completeAction(),false,interrupt);assert.equal(h.w.done(o),false,interrupt);
 }
});

test('controls cannot be operated through solid terrain or outside reach',()=>{
 const h=setup(),o=native(h),start=[h.w.state.x,h.w.state.y];h.w.state.x=1.5;h.w.state.y=1.5;assert.equal(h.controller.beginAction(o),false);[h.w.state.x,h.w.state.y]=start;reach(h,o);const original=h.w.scene.floor,tx=o.xy[0],ty=o.xy[1];
 h.w.state.x=tx+2.5;h.w.state.y=ty+.5;
 const rows=original.map(r=>Array.isArray(r)?r.slice():r.split(''));rows[ty][tx+1]='#';h.w.scene.floor=rows.map(r=>r.join(''));assert.equal(h.controller.beginAction(o),false,'an intervening blocked cell cannot be reached through');h.w.scene.floor=original;
});

test('choice tokens reject moved-away, stale-state and changed-flag actions; context is restored after errors',()=>{
 for(const changed of ['range','state','flags']){const h=setup(61),o=native(h,o=>o.type==='project');h.w.state.gold=500;operate(h,o);const token=h.context,action=h.dialog.choices[0].action;h.w.state.mode='field';if(changed==='range'){h.w.state.x=1.5;h.w.state.y=1.5;}if(changed==='state')h.w.restore(h.w.save());if(changed==='flags')h.w.state.flags.someOtherMechanism=1;assert.equal(h.controller.performChoice(token,action),false,changed);assert.equal(h.w.state.gold,500);}
 const h=setup(61),o=native(h,o=>o.type==='project');operate(h,o);const token=h.context;h.w.state.mode='field';assert.throws(()=>h.controller.performChoice(token,()=>{throw Error('broken action');}),/broken action/);assert.equal(h.controller.presenting,null);assert.equal(h.controller.performChoice(token,()=>{}),false,'a failed invoked action is still one-shot');
});

test('origins, NPCs, caches and unrelated systems retain their native interaction and installation is idempotent',()=>{
 const h=setup(),original=h.w.interact;assert.equal(installCampaignActuators(h.w),h.controller);for(const type of ['npc','cache','shop','portal','boss','aid'])assert.equal(h.controller.isControl({type,xy:[h.w.state.x-.5,h.w.state.y-.5]}),false);
 h.w.newGame({originId:'veyr-storm'});h.finish();assert.deepEqual(h.controller.objects(),[]);assert.equal(h.controller.isControl(h.w.objects().find(o=>o.originStep===1)),false);h.controller.destroy();assert.notEqual(h.w.interact,original);assert.equal(h.w.campaignActuators,undefined);assert.equal(h.controller.beginAction({type:'puzzle',xy:[1,1]}),false);
});


test('all 20 ordinary investigation latches preserve their native explicit solution and hidden rewards',()=>{
 const physical=setup(701),baseline=setup(701,{controlled:false});
 for(let chapter=1;chapter<=24;chapter++){
  if([3,4,5,7].includes(chapter))continue;
  for(const h of [physical,baseline]){h.w.state.scene=700+chapter;h.w.state.chapter=24;h.w.state.x=h.w.scene.arrive[0]+.5;h.w.state.y=h.w.scene.arrive[1]+.5;h.w.state.mode='field';}
  const a=native(physical,o=>o.type==='riddle'),b=native(baseline,o=>o.type==='riddle');reach(physical,a);reach(baseline,b);
  const before=physical.w.save();assert.equal(physical.controller.beginAction(a,{manual:true}),true);physical.controller.setProgress(.6);assert.equal(physical.w.save(),before,'latch preview cannot reveal its reward');physical.controller.cancelAction();
  operate(physical,a);operate(baseline,b);assert.deepEqual(physical.dialog.choices.map(c=>c.label),baseline.dialog.choices.map(c=>c.label));
  const wrong=(a.answer+1)%a.options.length;choose(physical,wrong);choose(baseline,wrong);assert.equal(physical.w.done(a),false,'wrong adjustment retains locked compartment');
  operate(physical,a);operate(baseline,b);choose(physical,a.answer);choose(baseline,b.answer);assert.equal(physical.w.done(a),true);assert.equal(physical.w.save(),baseline.w.save(),'same native saved result in chapter '+chapter);
 }
});

test('all 240 frontier commissions retain survey stages, explicit repair rules, and no preview grants',()=>{
 const physical=setup(2000),baseline=setup(2000,{controlled:false});
 for(const c of SIDE_CAMPAIGNS){
  for(const h of [physical,baseline]){h.w.state.scene=2000+c.regionIndex*5+c.area;h.w.state.chapter=24;h.w.state.frontiers.active=c.id;h.w.state.frontiers.stages[c.id]=0;h.w.state.x=4.5;h.w.state.y=23.5;h.w.state.mode='field';}
  const a=native(physical,o=>o.type==='frontier-landmark'&&o.frontierStep===0),b=native(baseline,o=>o.type==='frontier-landmark'&&o.frontierStep===0);
  operate(physical,a);operate(baseline,b);physical.finish();baseline.finish();assert.equal(physical.w.state.frontiers.stages[c.id],1);
  const x=native(physical,o=>o.type==='frontier-landmark'&&o.frontierStep===1),y=native(baseline,o=>o.type==='frontier-landmark'&&o.frontierStep===1);
  reach(physical,x);const before=physical.w.save();assert.equal(physical.controller.beginAction(x,{manual:true}),true);physical.controller.setProgress(.75);assert.equal(physical.w.save(),before);physical.controller.cancelAction();
  operate(physical,x);operate(baseline,y);assert.deepEqual(physical.dialog.choices.map(c=>c.label),baseline.dialog.choices.map(c=>c.label));choose(physical,(c.answer+1)%3);choose(baseline,(c.answer+1)%3);assert.equal(physical.w.state.frontiers.stages[c.id],1);
  operate(physical,x);operate(baseline,y);choose(physical,c.answer);choose(baseline,c.answer);assert.equal(physical.w.state.frontiers.stages[c.id],2);assert.equal(physical.w.save(),baseline.w.save(),c.id);
 }
});

test('all nine answering-network sites preserve exact native work stages and reject old-stage descriptors',()=>{
 const physical=setup(292),baseline=setup(292,{controlled:false});
 for(const def of NETWORK_WORKS){
  for(const h of [physical,baseline]){h.w.state.scene=def.scene;h.w.state.chapter=24;h.w.state.bosses=Array.from({length:def.chapter-1},(_,i)=>i+1);h.w.setBit(...def.requires);h.w.state.x=h.w.scene.arrive[0]+.5;h.w.state.y=h.w.scene.arrive[1]+.5;h.w.state.mode='field';}
  for(let n=0;n<12;n++){
   const a=physical.w.objects().find(o=>o.type==='network'&&o.networkStage!=='complete');if(!a)break;const b=baseline.w.objects().find(o=>o.networkId===a.networkId);
   reach(physical,a);const descriptor=physical.controller.objects().find(o=>o.networkId===a.networkId),before=physical.w.save();assert.equal(physical.controller.beginAction(descriptor,{manual:true}),true);physical.controller.setProgress(.7);assert.equal(physical.w.save(),before);physical.controller.setProgress(1);assert.equal(physical.controller.completeAction(),true);operate(baseline,b);physical.finish();baseline.finish();assert.equal(physical.w.save(),baseline.w.save(),a.networkId+':'+a.networkStage);assert.equal(physical.controller.beginAction(descriptor),false,'old stage cannot advance its replacement');
  }
  assert.ok(physical.w.state.answeringNetwork.works.includes(def.id),def.id+' complete');
 }
});

test('every physical lore mode uses its native fitted part and repeated mechanical steps',()=>{
 const physical=setup(5),baseline=setup(5,{controlled:false});
 for(const h of [physical,baseline]){h.w.state.chapter=24;h.w.state.story.firstCore=true;}
 for(const e of PHYSICAL_LORE){
  for(const h of [physical,baseline]){const source=physicalBindings(h.w).find(o=>o.physicalId===e.id&&o.physicalRole==='source');h.w.state.scene=source.physicalLocation;h.w.state.x=source.xy[0]+.5;h.w.state.y=source.xy[1]+.5;h.w.state.mode='field';h.w.interact(source);}
  const a=physicalBindings(physical.w).find(o=>o.physicalId===e.id&&o.physicalRole==='device'),b=physicalBindings(baseline.w).find(o=>o.physicalId===e.id&&o.physicalRole==='device');
  for(const h of [physical,baseline]){h.w.state.scene=a.physicalLocation;h.w.state.x=a.xy[0]+.5;h.w.state.y=a.xy[1]+.5;h.w.state.mode='field';h.w.objects();}
  assert.equal(campaignActuatorSpec(physical.w,a).manipulation,e.mode==='listen'?'receiver':e.mode==='turn'?'gauge':e.mode==='pump'?'lever':'work');
  operate(physical,a);operate(baseline,b);assert.equal(physical.w.save(),baseline.w.save(),'fitting '+e.id);
  for(let n=0;n<(e.mode==='turn'?e.orientation:e.mode==='pump'?3:0);n++){operate(physical,a);operate(baseline,b);assert.equal(physical.w.save(),baseline.w.save(),'native step '+e.id);}
 }
});

test('local plant care and community work use native explicit choices; people and animals remain social',()=>{
 const physical=setup(5,{controlled:false}),baseline=setup(5,{controlled:false});
 for(const h of [physical,baseline]){installTownLife(h.w);installRegionalLife(h.w);h.w.state.chapter=24;}
 // Install after native extensions, matching the real game startup sequence.
 physical.controller=installCampaignActuators(physical.w);let token=null;const report=physical.w.callbacks.onDialog;physical.w.callbacks.onDialog=value=>{token=physical.controller.presenting;report(value);};
 const actChoice=(h,index)=>{if(h===baseline)return h.choose(index);const value=h.dialog;h.w.state.mode='field';assert.equal(h.controller.performChoice(token,value.choices[index].action),true);h.finish();};
 for(const kind of ['grass','herb','project']){
  let scene=null;for(const [id]of physical.w.scenes){physical.w.state.scene=id;if(physical.w.objects().some(o=>o.type==='life'&&o.lifeKind===kind)){scene=id;break;}}assert.notEqual(scene,null);
  for(const h of [physical,baseline]){h.w.state.scene=scene;h.w.state.x=h.w.scene.arrive[0]+.5;h.w.state.y=h.w.scene.arrive[1]+.5;h.w.state.mode='field';h.w.objects();}
  const a=physical.w.objects().find(o=>o.type==='life'&&o.lifeKind===kind),b=baseline.w.objects().find(o=>o.type==='life'&&o.lifeKind===kind);assert.ok(physical.controller.isControl(a));operate(physical,a);operate(baseline,b);assert.deepEqual(physical.dialog.choices.map(c=>c.label),baseline.dialog.choices.map(c=>c.label));
  // Plants retain the explicit harvest choice; work retains its workbench menu.
  actChoice(physical,kind==='project'?1:0);actChoice(baseline,kind==='project'?1:0);assert.deepEqual(physical.dialog?.choices?.map(c=>c.label),baseline.dialog?.choices?.map(c=>c.label));
  for(const o of physical.w.objects().filter(o=>o.type==='npc'||['fauna','dog','cat','cow'].includes(o.lifeKind)))assert.equal(physical.controller.isControl(o),false);
 }
});

test('expanded choice tokens cancel on authoritative ledgers and resources, but ignore continuous clocks',()=>{
 for(const change of [w=>w.state.gold++,w=>w.state.items.ether++,w=>w.state.frontiers.active='commission-1',w=>(w.state.exploration??={version:1,found:[],solved:[],seen:[],relics:[]}).solved.push('district:1:latch'),w=>w.state.answeringNetwork.works.push('chapel-inspected'),w=>w.state.physicalLore.held='shelter-reed']){
  const h=setup(61),o=native(h,o=>o.type==='project');h.w.state.gold=500;operate(h,o);const token=h.context,action=h.dialog.choices[0].action;h.w.state.mode='field';change(h.w);assert.equal(h.controller.performChoice(token,action),false);assert.equal(h.w.state.project,0);
 }
 const h=setup(),o=native(h);lifeState(h.w.state);reach(h,o);assert.equal(h.controller.beginAction(o,{manual:true}),true);h.w.state.townLife.minutes+=.1;h.w.state.physicalLore.clocks['shelter-reed']=1;h.controller.setProgress(1);assert.equal(h.controller.completeAction(),true,'normal simulation time must not interrupt manipulation');
});


test('the four authored investigations preserve their distinct physical sequences and custody choice',()=>{
 const physical=setup(703),baseline=setup(703,{controlled:false});
 const plans={3:[['evidence','Trace'],['control','Close'],['control','Open'],['work','Lift']],4:[['evidence','Listen'],['control','Pull the small'],['control','Let'],['control','Pull the deep'],['control','Pull the small']],5:[['evidence','Watch'],['evidence','Watch'],['control','Draw']],7:[['evidence','Take'],['control','Raise'],['work','Offer'],[null,'Open the shelter']]};
 for(const chapter of [3,4,5,7]){
  for(const h of [physical,baseline]){h.w.state.scene=700+chapter;h.w.state.chapter=24;h.w.state.x=h.w.scene.arrive[0]+.5;h.w.state.y=h.w.scene.arrive[1]+.5;h.w.state.mode='field';}
  for(const [role,prefix]of plans[chapter]){
   if(role){const a=native(physical,o=>o.investigationRole===role),b=native(baseline,o=>o.investigationRole===role);assert.equal(physical.controller.isControl(a),true);operate(physical,a);operate(baseline,b);}
   assert.deepEqual(physical.dialog.choices.map(c=>c.label),baseline.dialog.choices.map(c=>c.label));const i=physical.dialog.choices.findIndex(c=>c.label.startsWith(prefix));assert.ok(i>=0,prefix);choose(physical,i);choose(baseline,i);
  }
  assert.ok(physical.w.state.exploration.solved.includes('district:'+chapter+':latch'));assert.equal(physical.w.save(),baseline.w.save(),'same investigation outcome '+chapter);
 }
});


test('all 24 regional workbenches keep their two-step repair and daily plant harvest through nested physical choices',()=>{
 const physical=setup(5,{controlled:false}),baseline=setup(5,{controlled:false});let token=null;
 for(const h of [physical,baseline]){installTownLife(h.w);installRegionalLife(h.w);h.w.state.chapter=24;}
 physical.controller=installCampaignActuators(physical.w);const report=physical.w.callbacks.onDialog;physical.w.callbacks.onDialog=value=>{token=physical.controller.presenting;report(value);};
 const select=(h,label)=>{const value=h.dialog,i=value.choices.findIndex(c=>c.label===label||c.label.startsWith(label));assert.ok(i>=0,label);if(h===baseline)return h.choose(i);h.w.state.mode='field';assert.equal(h.controller.performChoice(token,value.choices[i].action),true);h.finish();};
 for(const p of LIFE_REGIONS){
  for(const h of [physical,baseline]){h.w.state.scene=p.scene;h.w.state.x=h.w.scene.arrive[0]+.5;h.w.state.y=h.w.scene.arrive[1]+.5;h.w.state.mode='field';h.w.objects();}
  const projects=h=>h.w.objects().find(o=>o.regional&&o.lifeKind==='project');assert.ok(projects(physical),p.name+' workbench');
  for(const label of [p.work.prepare,p.work.finish]){
   for(const h of [physical,baseline]){operate(h,projects(h));select(h,'Help with the repair');select(h,label);}
   assert.deepEqual(physical.w.state.regionalLife,baseline.w.state.regionalLife,p.name+' native work phase');
  }
  assert.ok(physical.w.state.regionalLife.projects.includes(p.chapter));
  const herbs=h=>h.w.objects().find(o=>o.regional&&o.lifeKind==='herb');
  for(let n=0;n<2;n++){
   for(const h of [physical,baseline]){operate(h,herbs(h));select(h,n===0?'Study and gather':'Gather a modest');}
   assert.deepEqual(physical.w.state.regionalLife,baseline.w.state.regionalLife,p.name+' daily harvest');
  }
  assert.equal(physical.w.state.regionalLife.materials,p.chapter,'repeat daily gather cannot duplicate the cutting');assert.equal(physical.w.save(),baseline.w.save(),p.name+' exact native save');
 }
});
