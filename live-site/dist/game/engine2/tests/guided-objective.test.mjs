import test from 'node:test';import assert from 'node:assert/strict';
import {earnOpening,flow} from './opening-flow.mjs';
import {resolveGuidedObjective} from '../guided-objective.js';
import {campaignObjective} from '../campaign-content.js';
import {objectiveFor} from '../presentation.js';
import {firstObjectivePassage,portalDestination} from '../objective-routing.js';
import {createQuestGuide} from '../quest-navigation.js';
import {SIDE_CAMPAIGNS} from '../frontiers.js';
import {carryWayglass,installWayglassProps,wayglassObjective} from '../wayglass-model.js';
import {bellArcState,bellArcObjective} from '../bell-witness-arc.js';
import {vendorWaypoint} from '../adventure-guidance.js';

test('the earned first chapter resolves a real prerequisite instead of a null guardian relay',()=>{
 const {w}=earnOpening();assert.ok(w.state.story.firstCore&&w.state.recruited.includes(1));
 const q=campaignObjective(w);assert.ok(q.object?.xy);assert.ok(resolveGuidedObjective(w)?.object?.xy);
});
test('frontier encounter objectives provide a walking coordinate, including patrols stored as enemy positions',()=>{
 const {w}=flow(),c=SIDE_CAMPAIGNS[0];w.state.chapter=24;w.state.scene=2000;w.state.frontiers={version:1,active:c.id,stages:{[c.id]:2},claimed:[],visited:[2000]};
 const q=objectiveFor(w);assert.equal(q.object.type,'patrol');assert.equal(q.object.frontierId,c.id);assert.deepEqual(q.object.xy,[25,20]);
});
test('a commission in another area uses a real connecting passage; another region offers the current dispatch ledger',()=>{
 const {w}=flow();w.state.chapter=24;w.state.scene=2000;
 for(const [index,type,to]of [[4,'portal','frontier_dunes_1'],[20,'frontier-board',undefined]]){const c=SIDE_CAMPAIGNS[index];w.state.frontiers={version:1,active:c.id,stages:{},claimed:[],visited:[2000]};const q=objectiveFor(w);assert.equal(q.object.type,type);assert.equal(q.object.to,to);assert.ok(q.object.xy);}
});
test('Commons transport is a real route edge and walking to a tracked Wayglass seam needs no manual movement',()=>{
 const h=earnOpening(),w=h.w;installWayglassProps(w);carryWayglass(w.state);w.state.kakeya.solved=[2];w.state.kakeya.tracking=2;w.loadScene(226);h.finish();
 const first=firstObjectivePassage(w,228);assert.equal(first.type,'transport');assert.equal(first.questDestination,5);
 let arrived=false;const use=w.interact.bind(w);w.interact=o=>{if(o.wayglassSeam==='anchorheart')arrived=true;else use(o);};
 const guide=createQuestGuide(w,{resolve:()=>wayglassObjective(w)});guide.start();let decisions=0;
 for(let n=0;n<10000&&!arrived;n++){guide.update(.05);h.finish();if(h.dialog?.choices){assert.match(h.dialog.pages.join(' '),/CINDERFALL COMMONS/);h.choose(0);decisions++;}}
 assert.equal(arrived,true);assert.equal(decisions,1);assert.equal(w.state.scene,228);assert.deepEqual(w.state.kakeya.relics,[],'route test must not invent a recovery');guide.cancel();
});
test('tracked witness objectives follow their actual upstairs relocation after the crypt opens',()=>{
 const {w}=earnOpening();w.state.chapter=4;w.state.scene=292;w.state.mode='field';w.setBit(8323556,1);Object.assign(bellArcState(w.state),{tracking:true,evidence:['soot','plate'],heardHesper:true,metWitness:false});
 const q=bellArcObjective(w);assert.equal(q.object.bellArc,'witness');assert.ok(q.object.xy);w.state.scene=125;assert.equal(bellArcObjective(w).object.to,'chapel');
});
test('remembered vendor routing supports explicit transport choices without discovering unseen rooms',()=>{
 const {w}=earnOpening();w.state.scene=226;w.state.guidance={version:1,seenScenes:[226,5,228],shops:[]};
 const q=vendorWaypoint(w,{scene:228,xy:[1,1]});assert.equal(q.kind,'transport');assert.equal(q.object.questDestination,5);
 w.state.guidance.seenScenes=[226,228];assert.equal(vendorWaypoint(w,{scene:228,xy:[1,1]}),null);
});
test('region portal destinations use their explicit room rather than the global hub alias',()=>{
 const {w}=earnOpening();const q=portalDestination(w,w.scene,{to:'hub',to_region:2,to_room:'bridge'});assert.equal(q.location,135);
});

test('the final delivery guides from Commons through an explicit transport answer to Mara',()=>{
 const h=earnOpening(),w=h.w;w.state.complete=true;w.state.chapter=25;w.state.story.returnedHome=false;w.loadScene(226);h.finish();
 const guide=createQuestGuide(w,{resolve:()=>resolveGuidedObjective(w)});guide.start();let choices=0;
 for(let n=0;n<10000&&!w.state.story.returnedHome;n++){guide.update(.05);h.finish();if(h.dialog?.choices){assert.match(h.dialog.pages.join(' '),/CINDERFALL COMMONS/);h.choose(0);choices++;}}
 assert.equal(w.state.story.returnedHome,true);assert.equal(w.state.scene,2);assert.equal(choices,1);guide.cancel();
});
