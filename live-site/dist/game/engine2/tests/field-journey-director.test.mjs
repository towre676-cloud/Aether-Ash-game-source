import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldApproach,fieldInteractionTargets,createFieldJourneyDirector} from '../field-journey-director.js';

function fixture(){
 const scenes=new Map([[1,{location:1,key:'road',floor:Array(20).fill('.'.repeat(20)),objects:[]}],[50001,{location:50001,key:'origin_sable-reed_1',originId:'sable-reed',floor:Array(20).fill('.'.repeat(20)),objects:[]}],[14,{location:14,key:'campaign-bridge',floor:Array(20).fill('.'.repeat(20)),objects:[]}]]);
 const world={state:{scene:1,mode:'field',x:3.5,y:3.5},get scene(){return scenes.get(this.state.scene);},objects(){return this.scene.objects;}};
 const director=createFieldJourneyDirector();return {world,director,scenes};
}
const patrol=(positions=[[5,3],[9,8]])=>({type:'patrol',flag_address:100,bit:2,enemies:positions.map((xy,i)=>[i,xy])});
const observe=(director,world,options={})=>director.observe(world,.05,{guideActive:true,distance:.5,...options});
function invitation(director,world,options={}){let event=null;for(let i=0;i<8&&!event;i++)event=observe(director,world,options);return event;}

test('patrols without xy use the nearest currently rendered body as their interaction approach',()=>{
 const {world}=fixture(),object=patrol(),before=JSON.stringify(object);world.scene.objects.push(object);
 assert.deepEqual(fieldApproach(world,object).xy,[5,3]);
 world.fieldPatrols={position(w,o,index){assert.equal(w,world);assert.equal(o,object);return index?{x:4.25,y:3.75}:{x:11.5,y:12.5};}};
 const approach=fieldApproach(world,object);assert.deepEqual(approach.xy,[3.75,3.25]);assert.notEqual(approach,object);assert.equal(JSON.stringify(object),before);
 const [target]=fieldInteractionTargets(world);assert.equal(target.object,object,'the actual object is retained for rewards/flags');assert.deepEqual(target.approach.xy,approach.xy);
});

test('visible wild packs use their nearest mobile body and preserve the exact descriptor',()=>{
 const {world}=fixture(),wild={type:'wild',serial:7,seed:93,count:2,enemies:[['wild',[9,9]],['wild',[5,3]]]};
 world.roamingPack={object:wild,scene:1};world.fieldPatrols={position(w,o,index){return index?{x:4.5,y:3.5}:{x:9.5,y:9.5};}};
 assert.deepEqual(fieldApproach(world,wild).xy,[4,3]);const target=fieldInteractionTargets(world)[0];assert.equal(target.object,wild);assert.deepEqual(target.approach.xy,[4,3]);
 world.roamingPack.scene=14;assert.equal(fieldInteractionTargets(world).length,0,'a stale pack from another scene is excluded');
});

test('non-creature targets keep canonical objects while missing positions are excluded',()=>{
 const {world}=fixture(),cache={type:'cache',xy:[7,3]},emptyPatrol={type:'patrol',enemies:[]};world.scene.objects=[cache,emptyPatrol,{type:'clue'}];
 assert.equal(fieldApproach(world,cache),cache);assert.equal(fieldApproach(world,emptyPatrol),null);assert.deepEqual(fieldInteractionTargets(world),[{object:cache,approach:cache}]);
});

test('nearby threats invite takeover only after the guide has covered real distance',()=>{
 const {world,director}=fixture(),object=patrol();world.scene.objects=[object];
 for(let i=0;i<100;i++)assert.equal(observe(director,world,{distance:0}),null,'idle guide cannot trigger');
 for(const distance of [NaN,Infinity,-1,1.25,5])assert.equal(observe(director,world,{distance}),null,'invalid jumps cannot trigger');
 assert.equal(observe(director,world),null);assert.equal(observe(director,world),null);
 const event=observe(director,world);assert.ok(event);assert.equal(event.pack,object);assert.match(event.text,/guide will wait/);assert.match(event.rewardHint,/mastery/);
 assert.equal(world.state.mode,'field');assert.deepEqual(world.state,{scene:1,mode:'field',x:3.5,y:3.5},'an invitation cannot start a battle or move the player');
});

test('a dynamic nearest body determines which threat prompts the handoff',()=>{
 const {world,director}=fixture(),far=patrol([[15,15]]),near=patrol([[16,16],[17,17]]);near.bit=3;world.scene.objects=[far,near];
 world.fieldPatrols={position(w,o,index){return o===far?{x:14.5,y:14.5}:index?{x:5.5,y:3.5}:{x:12.5,y:12.5};}};
 assert.equal(invitation(director,world).pack,near);
});

test('walls and blocked affordance tiles hide threats until the player has a clear view',()=>{
 for(const obstacle of ['wall','affordance']){
  const {world,director}=fixture(),object=patrol([[6,3]]);world.scene.objects=[object];
  if(obstacle==='wall')world.scene.floor[3]='....#...............';else world.scene.affordanceBlocked=[[4,3]];
  assert.equal(invitation(director,world),null,obstacle+' occludes threat');
  if(obstacle==='wall')world.scene.floor[3]='.'.repeat(20);else world.scene.affordanceBlocked=[];
  assert.equal(invitation(director,world).pack,object,'occluded threats do not consume this scene’s invitation');
 }
});

test('manual exploration, a held guide and non-field modes do not count distance',()=>{
 const {world,director}=fixture();world.scene.objects=[patrol()];
 for(let i=0;i<50;i++){assert.equal(observe(director,world,{guideActive:false}),null);assert.equal(observe(director,world,{held:true}),null);}
 for(const mode of ['battle','dialog','paused']){world.state.mode=mode;for(let i=0;i<10;i++)assert.equal(observe(director,world),null);}
 world.state.mode='field';assert.equal(observe(director,world),null);assert.equal(observe(director,world),null);assert.ok(observe(director,world),'only the three eligible half-tile steps count');
});

test('each dangerous scene invites exploration once, including origin and campaign transitions',()=>{
 const {world,director}=fixture();world.scene.objects=[patrol()];assert.ok(invitation(director,world));
 for(let i=0;i<20;i++)assert.equal(observe(director,world),null,'the same scene cannot repeatedly stop the route');
 for(const scene of [50001,14]){world.state.scene=scene;world.scene.objects=[patrol()];assert.equal(observe(director,world),null,'entering a new scene resets the distance budget');assert.equal(observe(director,world),null);assert.ok(observe(director,world),String(scene));}
 world.state.scene=1;for(let i=0;i<20;i++)assert.equal(observe(director,world),null,'returning to a previously invited scene does not repeat it');
});

test('replacing a journey state and explicit reset allow a fresh invitation without importing old distance',()=>{
 const {world,director}=fixture();world.scene.objects=[patrol()];assert.ok(invitation(director,world));
 world.state={...world.state};assert.equal(observe(director,world),null);assert.equal(observe(director,world),null);assert.ok(observe(director,world),'a loaded or new journey does not retain the old seen set');
 director.reset();assert.equal(observe(director,world),null);assert.equal(observe(director,world),null);assert.ok(observe(director,world));
});

test('unfinished nearby affordances give an exploration invitation and solved work does not',()=>{
 const {world,director}=fixture(),work={type:'affordance',xy:[5,3],label:'Reed relay',solved:true};world.scene.objects=[work];
 assert.equal(invitation(director,world),null);work.solved=false;const event=invitation(director,world);assert.ok(event);assert.equal(event.pack,null);assert.equal(event.object,work,'the canonical work object remains available to the pure handoff preview');assert.match(event.text,/Reed relay/);assert.equal(event.rewardHint,null);
});
