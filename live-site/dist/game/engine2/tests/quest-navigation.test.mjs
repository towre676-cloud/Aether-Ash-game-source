import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {World} from '../world.js';import {campaignObjective} from '../campaign-content.js';import {createQuestGuide,clearInteractionApproach,interactionPath} from '../quest-navigation.js';
const data=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url)));
function setup(){let dialog;const w=new World(data,{onDialog:d=>dialog=d});w.state.chapter=2;w.state.story.weapon=true;w.state.story.firstCore=true;w.state.bosses=[1];w.state.recruited=[0,1,2];w.state.story.parcel=true;w.setBit(8323526,1);w.state.mode='field';return {w,close(){const d=dialog;dialog=null;d?.after?.();if(w.state.mode==='dialog')w.state.mode='field';},get dialog(){return dialog;}};}
function walkingWorld(width=50){return {scene:{floor:['.'.repeat(width)],width,height:1},state:{scene:1,x:.5,y:.5,mode:'field',flags:{}},move(dx,dy){this.state.x+=dx;this.state.y+=dy;},interact(){}};}
function frames(g,n=100,options){for(let i=0;i<n;i++)g.update(.05,options);}

test('chapter-two guidance finds Brass through the actual region destination instead of the hub',()=>{const {w}=setup();for(const [id,to]of [[2,'town'],[5,'workshop'],[12,'town'],[228,'hub'],[214,'bridge']]){w.state.scene=id;const q=campaignObjective(w);assert.equal(q.object?.to,to,String(id));assert.match(q.label,/Brass/);}w.state.scene=228;assert.equal(campaignObjective(w).object.to_region,2);assert.equal(campaignObjective(w).object.to_room,'bridge');});
test('one selected guide walks from home through real passages to Brass and remains selected for the next task',()=>{const h=setup(),w=h.w;w.state.scene=2;[w.state.x,w.state.y]=w.scene.arrive.map(v=>v+.5);const scenes=new Set([2]),guide=createQuestGuide(w,{resolve:()=>campaignObjective(w)});assert.ok(guide.start());let clue=false;for(let i=0;i<15000&&!w.bit(8323528,6);i++){guide.update(.05);scenes.add(w.state.scene);if(h.dialog){if(w.scene.location===135&&h.dialog.pages.join(' ').includes('zero, nine, one'))clue=true;h.close();}if(clue)break;}assert.equal(guide.running,true);assert.equal(w.state.scene,135);assert.ok(w.bit(w.mission.flag_address,6));assert.ok(clue);for(const id of [2,5,228,135])assert.ok(scenes.has(id),String(id));const brass=w.objects().find(o=>o.type==='npc'&&o.sets_bit===6);assert.ok(clearInteractionApproach(w.scene,[w.state.x,w.state.y],brass));guide.cancel();});
test('the Commons keeper remains a real dialog transit that does not require selecting the guide again',()=>{const h=setup(),w=h.w;w.state.scene=226;[w.state.x,w.state.y]=w.scene.arrive.map(v=>v+.5);const guide=createQuestGuide(w,{resolve:()=>campaignObjective(w)});guide.start();let spoke=false;for(let i=0;i<8000;i++){guide.update(.05);if(h.dialog){if(w.state.scene===226)spoke=true;const choice=h.dialog.choices?.find(c=>c.label==='Visit the festival square');h.close();choice?.action();}if(w.state.scene===135&&w.bit(w.mission.flag_address,6))break;}assert.ok(spoke);assert.equal(w.state.scene,135);assert.ok(w.bit(w.mission.flag_address,6));assert.equal(guide.running,true);});

test('explicit cancellation releases the guide and never interacts at a distance',()=>{const w=walkingWorld(),hits=[];w.interact=o=>hits.push(o);const g=createQuestGuide(w,{resolve:()=>({object:{type:'npc',xy:[20,0]}})});g.start();g.update(.1);g.cancel();const x=w.state.x;frames(g,200);assert.equal(g.running,false);assert.equal(w.state.x,x);assert.deepEqual(hits,[]);});

test('unreachable objectives remain selected and automatically resume when the collision context opens',()=>{
 const w=walkingWorld(5);w.scene={width:5,height:3,floor:['.....','#####','.....']};let hits=0;w.interact=()=>hits++;
 const g=createQuestGuide(w,{resolve:()=>({label:'Reach the far room',object:{type:'npc',id:'far',xy:[4,2]}})});assert.ok(g.start());frames(g,250);assert.equal(g.running,true);assert.equal(g.status.state,'blocked');assert.equal(hits,0);
 w.scene.floor[1]='.####';frames(g,200);assert.equal(hits,1);assert.equal(g.running,true);assert.ok(clearInteractionApproach(w.scene,[w.state.x,w.state.y],{xy:[4,2]}));
});

test('stalls retry a bounded number of times per context without spamming or turning the guide off',()=>{
 const w=walkingWorld(),notices=[];let moving=false,moves=0,hits=0;w.move=function(dx,dy){moves++;if(moving){this.state.x+=dx;this.state.y+=dy;}};w.interact=()=>hits++;
 const g=createQuestGuide(w,{resolve:()=>({object:{type:'npc',xy:[10,0]}}),onNotice:s=>notices.push(s)});g.start();frames(g,400);
 assert.equal(g.running,true);assert.equal(g.status.state,'blocked');assert.ok(moves<70);assert.equal(notices.length,1);assert.equal(hits,0);
 moving=true;w.state.flags.clearance=true;frames(g,100);assert.equal(hits,1);
});

test('a closed passage is attempted once and waits for a causal change instead of reopening its dialogue',()=>{
 const w=walkingWorld(5),hits=[];let g;const portal={type:'portal',id:'gate',xy:[0,0]},person={type:'npc',id:'other-side',xy:[3,0]};
 w.interact=o=>{hits.push(o.id);if(o===portal){if(w.state.flags.open){w.state.scene=2;g.sceneChanged();}else w.state.mode='dialog';}};
 g=createQuestGuide(w,{resolve:()=>({object:w.state.scene===1?portal:person})});g.start();g.update(.05);assert.deepEqual(hits,['gate']);w.state.mode='field';frames(g,300);
 assert.deepEqual(hits,['gate']);assert.equal(g.running,true);assert.equal(g.status.reason,'passage');w.state.flags.open=true;frames(g,120);assert.deepEqual(hits,['gate','gate','other-side']);
});

test('actual approach selection routes around intervening walls before interacting',()=>{
 const w=walkingWorld(5);w.scene={width:5,height:3,floor:['.....','.###.','.....']};const target={type:'npc',xy:[2,2]},hits=[];w.move=function(dx,dy){const x=this.state.x+dx,y=this.state.y+dy;assert.equal(this.scene.floor[Math.floor(y)]?.[Math.floor(x)],'.');this.state.x=x;this.state.y=y;};w.interact=()=>hits.push([w.state.x,w.state.y]);
 const route=interactionPath(w.scene,[w.state.x,w.state.y],target);assert.ok(route?.length);assert.ok(clearInteractionApproach(w.scene,route.at(-1),target));
 const g=createQuestGuide(w,{resolve:()=>({object:target})});g.start();frames(g,150);assert.equal(hits.length,1);assert.ok(hits[0][1]>1);
});

test('a furnishing’s own blocked tile stays usable but a new physical barrier cannot be reached through',()=>{
 assert.ok(clearInteractionApproach({floor:['.#.']},[.5,.5],{xy:[1,0]}));assert.deepEqual(interactionPath({floor:['.#.']},[.5,.5],{xy:[1,0]}),[]);
 const scene={floor:['...'],affordanceBlocked:[[1,0]]};assert.equal(clearInteractionApproach(scene,[.5,.5],{xy:[2,0]}),false);assert.equal(interactionPath(scene,[.5,.5],{xy:[2,0]}),null);
});

test('moving residents can replan more than eight times and are reached when they settle',()=>{
 const w=walkingWorld(100),resident={type:'npc',id:'runner',xy:[60,0]},hits=[];w.interact=o=>hits.push(o.xy[0]);
 const g=createQuestGuide(w,{resolve:()=>({object:resident})});g.start();for(let n=0;n<14;n++){resident.xy=[n%2?60:90,0];frames(g,6);}assert.equal(g.running,true);assert.deepEqual(hits,[]);
 resident.xy=[25,0];frames(g,300);assert.deepEqual(hits,[25]);assert.equal(g.running,true);
});

test('changed objectives and disappearing objectives replan without stale interactions or manual reactivation',()=>{
 const w=walkingWorld(),hits=[];w.interact=o=>hits.push(o.id);let goal={label:'First errand',object:{type:'npc',id:'first',xy:[40,0]}};
 const g=createQuestGuide(w,{resolve:()=>goal});g.start();frames(g,3);goal=null;const x=w.state.x;frames(g,10);assert.deepEqual(hits,[]);assert.equal(g.running,true);assert.equal(g.status.reason,'objective');assert.ok(w.state.x-x<1);
 goal={label:'New errand',object:{type:'npc',id:'second',xy:[4,0]}};frames(g,100);assert.deepEqual(hits,['second']);assert.equal(g.running,true);
});

test('dialogue, battle and every UI pause suspend walking and resume the current goal automatically',()=>{
 for(const reason of ['dialog','battle','menu','cinema','roster','observatory']){
  const w=walkingWorld(),hits=[];w.interact=o=>hits.push(o.id);const goal={object:{type:'npc',id:'finish',xy:[8,0]}},g=createQuestGuide(w,{resolve:()=>goal});g.start();frames(g,3);g.interrupt(reason);const x=w.state.x;
  frames(g,60,{paused:reason});assert.equal(w.state.x,x,reason);assert.equal(g.running,true);assert.equal(g.status.state,'paused');frames(g,150);assert.deepEqual(hits,['finish'],reason);
 }
});

test('world mode interruptions work without frontend hooks and choices are never selected by the guide',()=>{
 const w=walkingWorld(10);let chosen=0,hits=0;w.interact=()=>{hits++;w.state.mode='dialog';w.choice=()=>{chosen++;w.state.flags.answer=1;w.state.mode='field';};};
 const g=createQuestGuide(w,{resolve:()=>w.state.flags.answer?{label:'Done'}:{object:{type:'puzzle',xy:[4,0]}}});g.start();frames(g,100);assert.equal(hits,1);assert.equal(chosen,0);assert.equal(w.state.mode,'dialog');assert.equal(g.running,true);
 w.choice();frames(g,20);assert.equal(chosen,1);assert.equal(g.status.reason,'objective');
});

test('same-object two-stage puzzles reopen only after the player changes a stage flag',()=>{
 const w=walkingWorld(5),puzzle={type:'puzzle',id:'two-stage',xy:[0,0]};let prompts=0;w.interact=()=>{prompts++;w.state.mode='dialog';};const g=createQuestGuide(w,{resolve:()=>({object:puzzle})});g.start();frames(g,2);assert.equal(prompts,1);
 w.state.flags.stage=1;w.state.mode='field';frames(g,8);assert.equal(prompts,2);w.state.mode='field';frames(g,100);assert.equal(prompts,2);assert.equal(g.running,true);
});

test('the selected encounter starts from a safe approach, but the guide never chooses combat actions',()=>{
 for(const object of [{type:'boss',xy:[8,0]},{type:'patrol',xy:[8,0]},{type:'npc',rivalId:'friend',xy:[8,0]}]){
  const w=walkingWorld(10);let started=0;w.interact=()=>{started++;w.state.mode='battle';};w.command=()=>assert.fail('battle actions belong to the player');
  const g=createQuestGuide(w,{resolve:()=>w.state.flags.won?{label:'Encounter complete'}:{object}});g.start();frames(g,150);
  assert.equal(started,1);assert.equal(g.running,true);assert.equal(g.status.reason,'battle');assert.ok(clearInteractionApproach(w.scene,[w.state.x,w.state.y],object));
  w.state.flags.won=true;w.state.mode='field';frames(g,10);assert.equal(g.running,true);assert.equal(g.status.reason,'objective');assert.equal(started,1);
 }
});

test('scene changes retain the selected guide, while replacing the save without a transition cancels stale work',()=>{
 const w=walkingWorld(),hits=[];w.interact=o=>hits.push(o.id);const g=createQuestGuide(w,{resolve:()=>({object:{type:'npc',id:'here',xy:[8,0]}})});g.start();frames(g,3);w.state.scene=2;g.sceneChanged();frames(g,150);assert.deepEqual(hits,['here']);assert.equal(g.running,true);
 w.state={...w.state};frames(g,2);assert.equal(g.running,false);
});

test('an explicit origin-to-present transition keeps the same selected traveller guide',()=>{
 const w=walkingWorld();w.state.journey={hero:4,seed:7};const g=createQuestGuide(w,{resolve:()=>({label:'Next life step'})});g.start();w.state={...w.state,scene:2,journey:{hero:4,seed:7}};g.sceneChanged();frames(g,2);assert.equal(g.running,true);g.cancel();
});

test('a cycle of open passages stays selected without repeatedly walking the loop',()=>{
 const w=walkingWorld(3),hits=[],portal={type:'portal',id:'loop',to:'other',xy:[0,0]};const g=createQuestGuide(w,{resolve:()=>({object:portal})});w.interact=()=>{hits.push(w.state.scene);w.state.scene=w.state.scene===1?2:1;g.sceneChanged();};g.start();frames(g,300);assert.deepEqual(hits,[1,2]);assert.equal(g.running,true);assert.equal(g.status.reason,'passage');
});


test('physical listening clocks do not cause repeated interactions until their readiness changes',()=>{
 const w=walkingWorld(3);w.state.physicalLore={clocks:{bell:0}};let hits=0;w.interact=()=>hits++;
 const g=createQuestGuide(w,{resolve:()=>({object:{type:'puzzle',xy:[0,0]}})});g.start();frames(g,5);assert.equal(hits,1);
 for(let i=0;i<10;i++){w.state.physicalLore.clocks.bell=i*.1;frames(g,5);}assert.equal(hits,1);
 w.state.physicalLore.clocks.bell=1.7;frames(g,10);assert.equal(hits,2);
});

test('an exploration handoff clears the trail and never walks, resolves or interacts until explicitly resumed',()=>{
 const w=walkingWorld(),hits=[];let resolutions=0;w.interact=o=>hits.push(o.id);
 const g=createQuestGuide(w,{resolve:()=>{resolutions++;return {object:{type:'npc',id:'destination',xy:[10,0]}};}});
 assert.equal(g.hold(),false);assert.equal(g.resume(),false);g.start();frames(g,3);assert.ok(g.path.length);
 assert.equal(g.hold('explore','Watch the creatures, then choose your route'),true);const x=w.state.x,reads=resolutions;
 assert.equal(g.running,true);assert.equal(g.held,true);assert.deepEqual(g.path,[]);assert.equal(g.motion,null);frames(g,200);
 assert.equal(w.state.x,x);assert.equal(resolutions,reads);assert.deepEqual(hits,[]);assert.deepEqual(g.status,{state:'exploring',reason:'explore',label:'Watch the creatures, then choose your route'});
 assert.equal(g.resume(),true);assert.equal(g.held,false);frames(g,150);assert.deepEqual(hits,['destination']);assert.equal(g.resume(),false);
});

test('continue route retains a chosen service after an exploration stop, then returns to story only after arrival',()=>{
 const w=walkingWorld(40),hits=[],service={type:'npc',id:'stable',label:'Mossback stable',xy:[12,0]},story={type:'npc',id:'story',xy:[30,0]};
 w.interact=o=>hits.push(o.id);
 const g=createQuestGuide(w,{resolve:()=>({label:'Story objective',object:story})});
 g.visit({scene:1,label:'Visit the stable',object:service});frames(g,5);g.hold('explore','Watch the creatures');
 assert.equal(g.destination.object.id,'stable');g.resume();frames(g,120);
 assert.deepEqual(hits,['stable']);assert.equal(g.held,true);assert.equal(g.status.reason,'destination');
 g.resume();frames(g,200);assert.deepEqual(hits,['stable','story']);
});

test('a spoils handoff survives every UI interruption, world mode and same-traveller scene transition',()=>{
 const w=walkingWorld(),hits=[];w.state.journey={hero:0,seed:7};w.interact=o=>hits.push(o.id);
 const g=createQuestGuide(w,{resolve:()=>({object:{type:'npc',id:'next',xy:[8,0]}})});g.start();g.hold('spoils','Choose what this victory builds');const x=w.state.x;
 for(const reason of ['menu','dialog','battle','cinema','roster','observatory']){g.interrupt(reason);w.state.mode=reason==='battle'?'battle':reason==='dialog'?'dialog':'field';frames(g,10,{paused:reason});assert.equal(g.held,true);assert.equal(g.status.reason,'spoils');assert.equal(w.state.x,x);}
 w.state={...w.state,mode:'field',scene:2,journey:{hero:0,seed:7}};g.sceneChanged();frames(g,20);assert.equal(g.running,true);assert.equal(g.held,true);assert.equal(g.status.state,'exploring');assert.equal(w.state.x,x);assert.deepEqual(hits,[]);
 g.resume();frames(g,150);assert.deepEqual(hits,['next']);
});

test('resuming a handoff replans the current objective from the player’s explored position',()=>{
 const w=walkingWorld(30),hits=[];let goal={object:{type:'npc',id:'old',xy:[20,0]}};w.interact=o=>hits.push(o.id);
 const g=createQuestGuide(w,{resolve:()=>goal});g.start();frames(g,3);g.hold();w.state.x=15.5;goal={object:{type:'npc',id:'new',xy:[12,0]}};
 frames(g,20);assert.equal(w.state.x,15.5);g.resume();frames(g,100);assert.deepEqual(hits,['new']);assert.ok(w.state.x<15.5);
});

test('replacing the save or cancelling releases held work without touching the new traveller',()=>{
 for(const transition of [false,true]){const w=walkingWorld(),g=createQuestGuide(w,{resolve:()=>({object:{type:'npc',xy:[10,0]}})});w.state.journey={hero:0,seed:7};g.start();g.hold();w.state={...w.state,journey:{hero:1,seed:8}};if(transition)g.sceneChanged();else frames(g,1);assert.equal(g.running,false);assert.equal(g.held,false);assert.equal(g.resume(),false);}
 const w=walkingWorld(),g=createQuestGuide(w,{resolve:()=>({object:{type:'npc',xy:[10,0]}})});g.start();g.hold();g.cancel();assert.equal(g.held,false);assert.deepEqual(g.path,[]);assert.equal(g.status.state,'idle');
});

test('the guide approaches at ordinary walking speed instead of running through the scene',()=>{
 const w=walkingWorld(),g=createQuestGuide(w,{resolve:()=>({object:{type:'npc',xy:[40,0]}})});g.start();g.update(.1);assert.ok(w.state.x-.5>0);assert.ok(w.state.x-.5<=.265000001);
});

test('the interaction gate can decline a guide action without recording a completed attempt',()=>{
 const w=walkingWorld(5),patrol={type:'patrol',id:'trail-pack',xy:[0,0]},hits=[],checks=[];let accepted=false;w.interact=o=>hits.push(o.id);
 const g=createQuestGuide(w,{resolve:()=>({object:patrol}),beforeInteract:o=>{checks.push(o);return accepted;}});g.start();g.update(.05);
 assert.deepEqual(hits,[]);assert.equal(checks[0],patrol);assert.equal(g.running,true);accepted=true;g.update(.05);assert.deepEqual(hits,['trail-pack']);frames(g,20);assert.deepEqual(hits,['trail-pack']);
});

test('the interaction gate permits ordinary guide interactions when it returns true',()=>{
 const w=walkingWorld(5),target={type:'npc',id:'keeper',xy:[0,0]},hits=[];let checks=0;w.interact=o=>hits.push(o.id);
 const g=createQuestGuide(w,{resolve:()=>({object:target}),beforeInteract:()=>{checks++;return true;}});g.start();frames(g,20);assert.deepEqual(hits,['keeper']);assert.equal(checks,1);
});

test('a field handoff at interaction range resumes the same encounter only after explicit acceptance',()=>{
 const w=walkingWorld(5),patrol={type:'patrol',id:'trail-pack',xy:[0,0]},hits=[];let accepted=false,checks=0,g;w.interact=o=>{hits.push(o.id);w.state.mode='battle';};
 g=createQuestGuide(w,{resolve:()=>({object:patrol}),beforeInteract:()=>{checks++;if(accepted)return true;g.hold('explore','Read the creature’s warning before approaching');return false;}});
 g.start();frames(g,20);assert.equal(g.held,true);assert.equal(checks,1);assert.deepEqual(hits,[]);assert.deepEqual(g.path,[]);accepted=true;g.resume();g.update(.05);
 assert.equal(g.held,false);assert.deepEqual(hits,['trail-pack']);assert.equal(w.state.mode,'battle');assert.equal(g.status.reason,'battle');
});

test('selected guidance crosses waypoints at one real pace across refresh rates and clears motion during pauses',()=>{
 for(const fps of [30,60,120,240]){
  const w=walkingWorld(120),g=createQuestGuide(w,{resolve:()=>({label:'Walk the long road',object:{type:'npc',id:'distant',xy:[100,0]}})});
  g.start();for(let i=0;i<fps*6;i++)g.update(1/fps);
  assert.ok(Math.abs(w.state.x-16.4)<1e-8,'2.65 tiles per second at '+fps+'Hz');
  assert.equal(g.motion.gait,'walk');assert.equal(g.motion.intent.x,1);assert.equal(g.running,true);
  const x=w.state.x;g.update(1/fps,{paused:'action picker'});assert.equal(g.motion,null);assert.equal(w.state.x,x);assert.equal(g.running,true);
  g.update(1/fps);assert.ok(w.state.x>x);g.cancel();assert.equal(g.motion,null);
 }
});

test('an interaction hook that holds the guide cannot auto-interact even without an explicit false return',()=>{
 const w=walkingWorld(5),target={type:'npc',id:'keeper',xy:[0,0]},hits=[];let heldOnce=false,g;
 w.interact=o=>hits.push(o.id);
 g=createQuestGuide(w,{resolve:()=>({object:target}),beforeInteract:()=>{if(!heldOnce){heldOnce=true;g.hold('explore','Look around before continuing');}}});
 g.start();g.update(.05);assert.equal(g.running,true);assert.equal(g.held,true);assert.equal(g.motion,null);assert.deepEqual(hits,[]);
 g.resume();g.update(.05);assert.equal(g.held,false);assert.deepEqual(hits,['keeper']);
});
