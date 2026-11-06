import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createFieldPatrols,fieldPatrolPosition} from '../field-patrols.js';
import {World} from '../world.js';

function fixture({floor,objects,player=[24.5,24.5]}={}){
 const patrol={type:'patrol',bit:1,enemies:[[0,[10,10]],[1,[10,12]]],roam:[[0,0],[1,0],[1,1],[0,1]]};
 const scene={location:8,width:30,height:30,floor:floor||Array(30).fill('.'.repeat(30)),objects:objects||[patrol],doors:[]};
 const w={scene,state:{scene:8,mode:'field',x:player[0],y:player[1]},objects(){return this.scene.objects;},walkable(x,y){return this.scene.floor[Math.floor(y)]?.[Math.floor(x)]==='.';}};
 w.fieldPatrols=createFieldPatrols();return {w,patrol,api:w.fieldPatrols};
}
function ticks(w,n,dt=.05){const events=[];for(let i=0;i<n;i++){const e=w.fieldPatrols.update(w,dt);if(e.cue||e.engage)events.push(e);}return events;}

test('authored roam moves each field body while leaving encounters and saves unchanged',()=>{
 const {w,patrol,api}=fixture(),before=JSON.stringify(patrol),save=JSON.stringify(w.state);
 api.update(w,.05);const first=api.position(w,patrol);ticks(w,55);
 const after=api.position(w,patrol);assert.ok(Math.hypot(after.x-first.x,after.y-first.y)>.35);assert.equal(after.phase,'patrol');
 assert.ok(Math.hypot(api.position(w,patrol,1).x-10.5,api.position(w,patrol,1).y-12.5)>.3);
 assert.equal(JSON.stringify(patrol),before);assert.equal(JSON.stringify(w.state),save);
});

test('a noticed creature telegraphs before contact and returns its canonical encounter',()=>{
 const {w,patrol,api}=fixture({player:[10.6,10.5]});let warningAt=-1,contactAt=-1,count=0;
 for(let i=0;i<80;i++){const e=api.update(w,.05);if(e.cue){warningAt=i;count++;assert.equal(e.engage,null);assert.equal(api.position(w,patrol).phase,'alert');}if(e.engage){contactAt=i;assert.equal(e.engage,patrol);break;}}
 assert.equal(count,1);assert.ok(warningAt>=27,'entrance grace permits taking control');assert.ok(contactAt-warningAt>=17,'at least .85s of visible warning before battle');
 assert.equal(api.position(w,patrol).phase,'return');assert.equal(ticks(w,70).some(e=>e.engage),false,'contact cannot immediately repeat');
});

test('walking away defeats pursuit and a creature returns inside its bounded territory',()=>{
 const {w,patrol,api}=fixture({player:[13,10.5]});ticks(w,48);assert.equal(api.position(w,patrol).phase,'pursue');
 w.state.x=16;for(let i=0;i<90;i++){api.update(w,.05);const p=api.position(w,patrol);assert.ok(Math.hypot(p.x-p.homeX,p.y-p.homeY)<=4.5+.001);}
 w.state.x=25;ticks(w,140);const p=api.position(w,patrol);assert.equal(p.phase,'patrol');assert.ok(Math.hypot(p.x-p.homeX,p.y-p.homeY)<3);
});

test('walls prevent detection through rooms and every frame stays on open floor',()=>{
 const floor=Array(30).fill('.'.repeat(30)).map(r=>r.slice(0,11)+'#'+r.slice(12));
 const {w,patrol,api}=fixture({floor,player:[12.5,10.5]});let prior=fieldPatrolPosition(w,patrol);
 for(let i=0;i<300;i++){const e=api.update(w,.05),p=api.position(w,patrol);assert.equal(e.engage,null);assert.equal(e.cue,null);assert.ok(w.walkable(p.x,p.y));assert.ok(p.x<11);assert.ok(Math.hypot(p.x-prior.x,p.y-prior.y)<.08);prior=p;}
});

test('doors and conversation areas let the player stop without being attacked',()=>{
 for(const kind of ['npc','camp','shop','portal','trail-refuge']){
  const {w,patrol,api}=fixture({player:[12.5,10.5]});w.scene.objects.push({type:kind,xy:[12,10],ready:true});
  const events=ticks(w,200);assert.equal(events.some(e=>e.cue||e.engage),false,kind);const p=api.position(w,patrol);assert.ok(Math.hypot(p.x-12.5,p.y-10.5)>=1.15);
 }
 const {w}=fixture({player:[10.5,10.5]});w.scene.doors.push({xy:[10,10]});assert.deepEqual(ticks(w,120),[]);
});

test('menus, dialogue, battle and invalid time cannot advance field bodies or alert clocks',()=>{
 const {w,patrol,api}=fixture();ticks(w,18);const p=api.position(w,patrol);
 for(const mode of ['dialog','battle','paused']){w.state.mode=mode;ticks(w,100);assert.deepEqual(api.position(w,patrol),p);}
 w.state.mode='field';for(const dt of [0,-1,NaN,Infinity])api.update(w,dt);assert.deepEqual(api.position(w,patrol),p);
 api.update(w,.1,{blocked:true});assert.deepEqual(api.position(w,patrol),p);
 api.update(w,30);assert.ok(Math.hypot(api.position(w,patrol).x-p.x,api.position(w,patrol).y-p.y)<=.063,'a suspended frame cannot teleport a creature');
});

test('clearing a patrol removes runtime motion; a new scene or loaded save starts at authored positions',()=>{
 const {w,patrol,api}=fixture();ticks(w,45);assert.notEqual(api.position(w,patrol).x,10.5);
 w.scene.objects=[];api.update(w,.05);assert.equal(api.position(w,patrol).x,10.5);
 w.scene={...w.scene,location:9,objects:[patrol]};w.state.scene=9;api.update(w,.001);assert.ok(Math.abs(api.position(w,patrol).x-10.5)<.01);
 ticks(w,45);w.state={...w.state};api.update(w,.001);assert.ok(Math.abs(api.position(w,patrol).x-10.5)<.01);
});

test('scripted origin guardians pace close to their story landmark',()=>{
 const {w,patrol,api}=fixture();patrol.originId='sable-reed';ticks(w,500);
 for(let i=0;i<patrol.enemies.length;i++){const p=api.position(w,patrol,i);assert.ok(Math.hypot(p.x-p.homeX,p.y-p.homeY)<=1.65);}
});

test('commission patrols reconstructed on each object read keep their motion and warning state',()=>{
 const {w,patrol,api}=fixture();patrol.frontierId='live-commission';w.objects=()=>[JSON.parse(JSON.stringify(patrol))];ticks(w,55);
 const p=api.position(w,w.objects()[0]);assert.ok(Math.hypot(p.x-10.5,p.y-10.5)>.35);w.state.x=p.x;w.state.y=p.y;
 const events=ticks(w,22);assert.equal(events.filter(e=>e.cue).length,1);assert.equal(events.filter(e=>e.engage).length,1);assert.equal(events.find(e=>e.engage).engage.frontierId,'live-commission');
});

test('runtime wild packs visibly patrol and telegraph before returning their wild descriptor',()=>{
 const {w,api}=fixture();w.scene.objects=[];const wild={type:'wild',serial:9,seed:123,count:1,enemies:[['wild',[10,10]]]};w.roamingPack={object:wild,enemies:[{name:'Preview creature'}]};
 ticks(w,55);const p=fieldPatrolPosition(w,wild);assert.ok(Math.hypot(p.x-10.5,p.y-10.5)>.35);assert.equal(p.phase,'patrol');
 w.state.x=p.x;w.state.y=p.y;const events=ticks(w,22);assert.equal(events.filter(e=>e.cue).length,1);assert.equal(events.find(e=>e.engage)?.engage,wild);
 w.roamingPack=null;api.update(w,.05);assert.equal(fieldPatrolPosition(w,wild).x,10.5,'removed packs do not leave a live controller entry');
});

test('manual battle and retreat hooks can calm all nearby patrols before field control returns',()=>{
 const {w,patrol,api}=fixture({player:[10.6,10.5]});ticks(w,31);assert.equal(api.position(w,patrol).phase,'alert');
 api.calm(4);assert.equal(api.position(w,patrol).phase,'return');assert.equal(ticks(w,70).some(e=>e.cue||e.engage),false);
});

test('actual campaign field patrols remain canonical and can be sampled in every authored room',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url))),w=new World(data),api=createFieldPatrols();w.fieldPatrols=api;let tested=0;
 for(const scene of w.data.scenes.filter(s=>s.objects.some(o=>o.type==='patrol'))){w.state.scene=scene.location;w.state.mode='field';w.state.x=scene.arrive?.[0]+.5||1.5;w.state.y=scene.arrive?.[1]+.5||1.5;const before=JSON.stringify(scene.objects);api.update(w,.05);for(const o of w.objects().filter(o=>o.type==='patrol'))for(let i=0;i<o.enemies.length;i++){const p=fieldPatrolPosition(w,o,i);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));tested++;}assert.equal(JSON.stringify(scene.objects),before);}
 assert.ok(tested>70);
});
