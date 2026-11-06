import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry} from '../cistern-renderer.js';
import {installTownLife} from '../townlife.js';
import {installRegionalLife,regionalWorkMenu,harvestRegion} from '../regional-life.js';
import {installTrailLife} from '../reconciled-travel.js';
import {REGIONS} from '../regional-content.js';
import {VILLAGE_FRAMES} from '../village-life-art.js';
import {appendAdventureLivingStatic,appendAdventureLivingDynamic,adventureLivingSprites,livingContentFamily} from '../adventure-living-content.js';
const data=JSON.parse(readFileSync(new URL('../world.json',import.meta.url)));
function setup(){let dialog;const w=new World(data,{onDialog:value=>dialog=value});installTrailLife(w);installTownLife(w);installRegionalLife(w);return {w,get dialog(){return dialog;}};}
function enter(w,id){const scene=w.scenes.get(id);w.state.scene=id;w.state.chapter=scene.chapter||1;w.state.mode='field';[w.state.x,w.state.y]=(scene.arrive||[1,1]).map(n=>n+.5);return scene;}
function model(w,o,time=1){const m=new Geometry(),g=new Geometry();appendAdventureLivingDynamic(m,g,{world:w,objects:[o],time,range:1000});return [...m.data(),...g.data()];}

test('all167 native scenes retain finite living models, exact object positions and unchanged saves',()=>{
 const {w}=setup();let scenes=0,objects=0,animals=0,max=0,nativeWorks=0;
 for(const scene of w.scenes.values()){
  enter(w,scene.location);const list=w.objects(),before=w.save(),native=JSON.stringify(list),mesh=new Geometry(),glow=new Geometry();
  appendAdventureLivingStatic(mesh,{world:w,objects:list});appendAdventureLivingDynamic(mesh,glow,{world:w,objects:list,time:1,range:1000});
  const sprites=adventureLivingSprites({world:w,objects:list,time:1,assets:{village:{width:1254,height:1254},bestiary:{width:1024,height:768}},range:1000});
  assert.ok([...mesh.data(),...glow.data()].every(Number.isFinite),String(scene.location));assert.ok(sprites.every(s=>[s.x,s.y,s.z,s.width,s.height,s.anchorX,s.anchorY].every(Number.isFinite)));
  assert.equal(w.save(),before);assert.equal(JSON.stringify(list),native,'render must not move animals or advance native paths');scenes++;objects+=list.filter(o=>livingContentFamily(w,o)).length;nativeWorks+=list.filter(o=>o.regional&&o.lifeKind==='project').length;animals+=sprites.length;max=Math.max(max,mesh.v.length/36+glow.v.length/36);
 }
 assert.equal(scenes,167);assert.equal(nativeWorks,24,'the recovered compact chapter13work retains every regional project');assert.ok(objects>200);assert.ok(animals>80);assert.ok(max<20000,'living content stays bounded');
});

test('pets reuse authored atlas crops, facing and live path animation at actual positions',()=>{
 const {w}=setup();enter(w,5);const image={width:1254,height:1254};
 for(const lifeKind of ['dog','cat','cow']){
  const o={type:'life',life:true,lifeKind,xy:[7.25,4.75],path:[[9,5]],facing:-1},before=JSON.stringify(o),[s]=adventureLivingSprites({world:w,objects:[o],time:.4,assets:{village:image},range:1000});
  assert.equal(s.image,image);assert.deepEqual(s.source,(()=>{const v=VILLAGE_FRAMES[lifeKind][lifeKind==='cow'?2:1];return {x:v[0],y:v[1],w:v[2],h:v[3]};})());assert.equal(s.x,7.75);assert.equal(s.z,5.25);assert.equal(s.flip,true);assert.equal(JSON.stringify(o),before);
 }
});

test('every authored regional craft changes through native preparation and completion at a fixed animation time',()=>{
 const h=setup(),{w}=h;let changes=0;
 for(const profile of REGIONS){
  enter(w,profile.scene);w.state.chapter=profile.chapter;const o={type:'life',life:true,regional:true,lifeKind:'project',profile,xy:[w.state.x-.5,w.state.y-.5]},before=model(w,o);
  regionalWorkMenu(w,profile);h.dialog.choices.find(c=>c.label===profile.work.prepare).action();w.state.mode='field';const prepared=model(w,o);
  regionalWorkMenu(w,profile);h.dialog.choices.find(c=>c.label===profile.work.finish).action();w.state.mode='field';const finished=model(w,o);
  assert.notDeepEqual(before,prepared,profile.craft+' preparation');assert.notDeepEqual(prepared,finished,profile.craft+' completion');assert.ok(w.state.regionalLife.projects.includes(profile.chapter));changes++;
 }
 assert.equal(changes,24);
});

test('native daily harvest reduces shoots and restores growth only on the next saved day',()=>{
 const {w}=setup();enter(w,5);const o=w.objects().find(o=>o.lifeKind==='herb');assert.ok(o);const before=model(w,o);assert.equal(harvestRegion(w.state,o.profile.chapter),true);const cut=model(w,o);assert.notDeepEqual(cut,before);assert.equal(harvestRegion(w.state,o.profile.chapter),false);assert.deepEqual(model(w,o),cut);w.state.townLife.day++;assert.deepEqual(model(w,o),before);
});

test('walking tiles receive only low project hardware; six native fauna and Bellrun gates are visible',()=>{
 const {w}=setup();enter(w,5);const rows=w.scene.floor,source=JSON.stringify(rows),profile=REGIONS[0];
 const empty={...w.scene,width:9,height:9,floor:Array(9).fill('.........'),objects:[]};const fake={...w,state:{...w.state,x:4.5,y:4.5},scene:empty,objects:()=>[]};
 for(const p of REGIONS){const o={life:true,type:'life',lifeKind:'project',profile:p,xy:[4,4]},m=new Geometry(),g=new Geometry();appendAdventureLivingDynamic(m,g,{world:fake,objects:[o],time:1});let height=0;const v=m.data();for(let i=1;i<v.length;i+=12)height=Math.max(height,v[i]);assert.ok(height<.35,p.craft+' does not become a new full-height blocker');}
 for(const fauna of ['hen','sparrow','duck','moth','goat','firefly']){const o={type:'life',life:true,lifeKind:'fauna',profile:{...profile,fauna},xy:[4,4]};assert.ok(model(fake,o).length>0);}
 fake.state.trailLife={relay:{scene:fake.state.scene,gates:[[4.5,4.5],[5.5,4.5],[5.5,5.5],[4.5,5.5]],index:0}};const m=new Geometry(),g=new Geometry();appendAdventureLivingDynamic(m,g,{world:fake,objects:[]});assert.ok(m.v.length>0);assert.equal(JSON.stringify(rows),source);
});

test('hidden objects, residents and faraway animals never leak into living render calls',()=>{
 const {w}=setup();enter(w,5);const o={type:'life',life:true,lifeKind:'dog',xy:[w.state.x+100,w.state.y]};assert.deepEqual(adventureLivingSprites({world:w,objects:[o],assets:{village:{width:1254}}}),[]);assert.equal(livingContentFamily(w,{...o,hidden:true}),null);assert.equal(livingContentFamily(w,{...o,lifeKind:'resident'}),null);
});


test('Unfinished Row compact work, plant and moth stay within exact clear native reservations through all work states',()=>{
 const h=setup(),{w}=h;enter(w,359);const scene=w.scene,objects=w.objects(),small=objects.filter(o=>o.regional),before=JSON.stringify([scene.floor,scene.objects,scene.doors]);
 assert.deepEqual(small.map(o=>o.lifeKind),['project','herb','fauna']);const nativePositions=small.map(o=>o.xy.slice());
 const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.z<b.z+b.d&&a.z+a.d>b.z;
 const reservations=small.map(o=>({x:o.xy[0]+.18,z:o.xy[1]+.18,w:.64,d:.64}));
 for(let i=0;i<reservations.length;i++)for(let j=i+1;j<reservations.length;j++)assert.equal(intersects(reservations[i],reservations[j]),false);
 for(const o of small){assert.equal(o.regionalCompact,true);assert.equal(scene.floor[o.xy[1]][o.xy[0]],'.');for(const f of scene.objects.filter(v=>v.footprint)){const b=f.footprint;assert.equal(intersects(reservations[small.indexOf(o)],{x:b.x,z:b.y,w:b.w,d:b.h}),false);}}
 const project=small.find(o=>o.lifeKind==='project');
 for(let phase=0;phase<3;phase++){
  for(const o of small){const m=new Geometry(),g=new Geometry(),save=w.save();appendAdventureLivingDynamic(m,g,{world:w,objects:[o],time:2,range:1000});const v=m.data();assert.ok(v.length);for(let i=0;i<v.length;i+=12){assert.ok(Math.abs(v[i]-o.xy[0]-.5)<=.30+1e-5,o.lifeKind+' width');assert.ok(Math.abs(v[i+2]-o.xy[1]-.5)<=.30+1e-5,o.lifeKind+' depth');assert.ok(v[i+1]<=.35,o.lifeKind+' height');}assert.equal(w.save(),save);}
  if(phase<2){regionalWorkMenu(w,project.profile);h.dialog.choices.find(c=>c.label===(phase===0?project.profile.work.prepare:project.profile.work.finish)).action();w.state.mode='field';}
 }
 assert.deepEqual(small.map(o=>o.xy),nativePositions);assert.equal(JSON.stringify([scene.floor,scene.objects,scene.doors]),before);assert.ok(w.state.regionalLife.projects.includes(13));
});
