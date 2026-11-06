import test from 'node:test';import assert from 'node:assert/strict';
import {createEnvironmentRenderer} from '../src/environment-renderer.mjs';
import {authorScene} from '../src/scene-composer.mjs';
import {buildDungeonSequence,applyDungeonAction} from '../src/dungeon-director.mjs';
import {MockTHREE as THREE,countNames} from './three-mock.mjs';
const base={id:'testtown',kind:'settlement',bounds:{minX:-32,maxX:32,minZ:-32,maxZ:32},anchors:[
 {id:'inn',x:9,z:8},{id:'well',x:-6,z:4},{id:'forge',x:-11,z:-11},
 {id:'tower',x:15,z:-12},{id:'south-gate',x:0,z:22},{id:'sanctuary',x:-9,z:19}]};
const world=()=>new THREE.Group();

test('actual Three-style geometry builds a detailed town with open arched door shapes, true roofs, and instanced plants',()=>{
 const scene=world();const r=createEnvironmentRenderer({THREE,scene,quality:'high',batchStatic:false});
 const {plan}=r.draw(authorScene(base),{region:'clay',surfaceMode:'replace-flat'});
 const names=countNames(r.root);
 assert.ok(names.includes('recessed-front-with-real-door-and-window-openings'));
 assert.ok(names.includes('real-tiled-roof-slope'));
 assert.ok(names.includes('terrain-skin-following-actual-collision-height'));
 assert.ok(names.includes('instanced-native-ground-ecology'));
 assert.ok(names.includes('through-arch-not-solid-wall')===false);
 assert.ok(names.includes('door-step'));
 const walls=[];r.root.traverse(x=>{if(x.name==='recessed-front-with-real-door-and-window-openings')walls.push(x);});
 assert.ok(walls.length>=1);
 // Extruded front wall is built from a shape containing real cuts, not just a painted door.
 // The real Three.js geometry stores the extruded shape in its construction params.
 // This mock checks the renderer emitted semantic open-wall geometry.
 assert.ok(r.stats().meshes>35,r.stats().meshes);
 assert.ok(r.stats().grassInstances>400,r.stats().grassInstances);
 const oldMeshes=r.stats().meshes;
 r.draw(authorScene({...base,id:'newtown'}),{region:'water'});
 assert.ok(r.stats().meshes>35);
 assert.equal(scene.children.length,1,'cleared old geometry before redraw; never duplicate worlds');
 r.dispose();assert.equal(scene.children.length,0);
});

test('mobile keeps architectural landmarks but reduces vegetation budget',()=>{
 const authored=authorScene(base);const s1=world(),s2=world();
 const hi=createEnvironmentRenderer({THREE,scene:s1,quality:'high',batchStatic:false}),lo=createEnvironmentRenderer({THREE,scene:s2,quality:'low',batchStatic:false});
 hi.draw(authored);lo.draw(authored);
 assert.ok(hi.stats().grassInstances>lo.stats().grassInstances,`${hi.stats().grassInstances} ${lo.stats().grassInstances}`);
 assert.equal(hi.plan.placements.length,lo.plan.placements.length);
 hi.dispose();lo.dispose();
});

test('all four realms build and dispose with numeric stats',()=>{
 for(const region of ['ash','water','clay','aether']){
  const scene=world(),r=createEnvironmentRenderer({THREE,scene,quality:'low',batchStatic:false});
  r.draw(authorScene({...base,id:`town-${region}`}),{region});
  assert.equal(r.plan.region,region);
  assert.ok(Number.isFinite(r.stats().triangles));
  r.tick(.016,3);r.clear();assert.equal(r.stats().meshes,0);r.dispose();
 }
});

test('dungeon is an actual vaulted chamber, not a panel; mechanism answers gameplay',()=>{
 const scene=world(),r=createEnvironmentRenderer({THREE,scene,batchStatic:false});
 const dungeon=buildDungeonSequence({id:'undercity',rooms:5,region:'water'});
 r.drawDungeon(dungeon,{region:'water',activeOnly:true,activeIndex:2});
 const names=countNames(r.root);
 for(const name of ['through-arch-not-solid-wall','arched-vault-rib','continuous-carved-dungeon-floor','engaged-gothic-column'])assert.ok(names.includes(name),name);
 assert.ok(r.stats().meshes>50);
 const result=applyDungeonAction(dungeon.rooms[2],dungeon.rooms[2].verb);
 assert.equal(r.showDungeonConsequence(result),true);
 assert.equal(r.showDungeonConsequence({...result,success:false}),false);
 r.dispose();
});

test('renderer does not own collision and host routes remain clear',()=>{
 const scene=world(),hits=[];
 const r=createEnvironmentRenderer({THREE,scene,obstacleAt:(x,z)=>{hits.push([x,z]);return false;},pathAt:()=>0,quality:'high',batchStatic:false});
 r.draw(authorScene(base));
 let n=0;r.root.traverse(o=>{if(o.userData?.collidable===false)n++;});
 assert.ok(n>=1);assert.equal(r.root.name,'aa-environment-5.37');
 assert.ok(hits.length>0);
 r.dispose();
});


test('static batching substantially reduces draw calls while keeping gameplay response objects separate',()=>{
 const sceneA=world(),sceneB=world();
 const baseline=createEnvironmentRenderer({THREE,scene:sceneA,batchStatic:false,quality:'high'});
 const batched=createEnvironmentRenderer({THREE,scene:sceneB,batchStatic:true,quality:'high'});
 const layout=authorScene(base);baseline.draw(layout);batched.draw(layout);
 const stats0=baseline.stats(),stats1=batched.stats();
 assert.ok(stats1.batching.batches>=3,JSON.stringify(stats1));
 assert.ok(stats1.batching.removedDrawCalls>150,JSON.stringify(stats1));
 assert.ok(stats1.drawCalls<stats0.drawCalls*.5,`${stats1.drawCalls}/${stats0.drawCalls}`);
 assert.ok(countNames(batched.root).includes('instanced-native-ground-ecology'));
 baseline.dispose();batched.dispose();
});

test('dungeon batching keeps the interactive response visible and reactive',()=>{
 const scene=world(),renderer=createEnvironmentRenderer({THREE,scene,batchStatic:true});
 const d=buildDungeonSequence({id:'mechanism-qa',rooms:3});
 renderer.drawDungeon(d,{activeOnly:true,activeIndex:1});
 const names=countNames(renderer.root);
 assert.ok(names.some(n=>n.startsWith('visible-')&&n.endsWith('-response')));
 assert.ok(renderer.stats().batching.removedDrawCalls>60);
 assert.equal(renderer.showDungeonConsequence(applyDungeonAction(d.rooms[1],d.rooms[1].verb)),true);
 renderer.dispose();
});

test('solved dungeon state restores from host save without replaying a gameplay action',()=>{
 const d=buildDungeonSequence({id:'replay',rooms:3});const scene=world(),r=createEnvironmentRenderer({THREE,scene,batchStatic:true});
 r.drawDungeon(d,{activeOnly:true,activeIndex:1,solvedRoomIds:[d.rooms[1].id]});
 let saved=0;r.root.traverse(o=>{if(o.userData?.roomId===d.rooms[1].id&&o.userData.solved)saved++;});
 assert.ok(saved>=1);
 // Repeating an already applied response must be idempotent.
 assert.equal(r.showDungeonConsequence(applyDungeonAction(d.rooms[1],d.rooms[1].verb)),false);
 r.dispose();
});
