import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {installLivingAtlas,livingAtlasBattleEvent,livingAtlasResidentGate,validateLivingAtlas,drawLivingAtlas,mountLivingAtlasReadout} from '../living-atlas.js';
import {installReconciledGround} from '../reconciled-ground.js';
import {atlasLayout} from '../living-atlas-layout.js';
import {createFieldPatrols,fieldPatrolPosition} from '../field-patrols.js';
import {World} from '../world.js';
import {convergeOrigin,legacyFrom} from '../origins.js';
import {installTrailLife} from '../reconciled-travel.js';
import {createReconciledAcoustics} from '../reconciled-acoustics.js';
import {installTownLife} from '../townlife.js';
import {installRegionalLife} from '../regional-life.js';
import {installRivals} from '../npc-challenges.js';
import {installFieldFeedback} from '../field-feedback.js';

const makeScene=(location=1,key='forest',extra={})=>({location,key,chapter:1,theme:0,width:20,height:20,arrive:[6,6],floor:Array.from({length:20},(_,y)=>Array.from({length:20},(_,x)=>!x||!y||x===19||y===19?'#':'.').join('')),objects:[],doors:[],...extra});
const fresh=()=>({scene:1,x:6.5,y:6.5,mode:'field',party:[0],recruited:[0],heroes:[{id:0,hp:100,maxHp:100,mp:20,maxMp:20}],items:{tonic:3},flags:{old:true},environment:{preserved:{value:7}}});
function fixture({ground=true}={}){
 const scenes=new Map([[1,makeScene()],[2,makeScene(2,'home',{interior:'quarters'})]]);
 const w={scenes,state:fresh(),get scene(){return this.scenes.get(this.state.scene);},get activeHeroes(){return this.state.party.map(id=>this.state.heroes[id]);},objects(){return this.scene.objects;},walkable(x,y){return this.scene.floor[Math.floor(y)]?.[Math.floor(x)]==='.';},move(dx,dy){if(!['field','battle'].includes(this.state.mode))return;if(this.walkable(this.state.x+dx,this.state.y))this.state.x+=dx;if(this.walkable(this.state.x,this.state.y+dy))this.state.y+=dy;},save(){return JSON.stringify(this.state);},restore(value){this.state=structuredClone(typeof value==='string'?JSON.parse(value):value);},loadScene(id){this.state.scene=id;this.state.x=6.5;this.state.y=6.5;},newGame(options={}){this.state=fresh();if(options.chronicle)this.state.chronicle=structuredClone(options.chronicle);},rest(){for(const h of this.state.heroes){h.hp=h.maxHp;h.mp=h.maxMp;}}};
 if(ground)installReconciledGround(w);installLivingAtlas(w);return w;
}
function green(w){const layout=w.livingAtlas.runtime().layout;for(let y=3;y<16;y++)for(let x=3;x<16;x++)if(layout.materialAt(x+.5,y+.5).vegetationSuitability>.35)return {x:x+.5,y:y+.5};throw Error('Fixture needs a natural cell');}
const numericFields=['w','m','f','b','ash','fire','a','res','stone','waveRe','waveIm'];
const fields=w=>Object.fromEntries(numericFields.map(k=>[k,Array.from(w.livingAtlas.runtime().kernel.field[k])]));

test('real floor, doors, roads, projected buildings and indoor rooms remain authoritative',()=>{
 const w=fixture(),before=JSON.stringify(w.scene.floor),layout=w.livingAtlas.runtime().layout;
 assert.equal(layout.blocked(.5,.5),true);assert.equal(layout.materialAt(.5,.5).vegetationAllowed,false);
 const town=makeScene(3,'town',{doors:[{xy:[2,1]}],exteriorBuildings:[{projection:{outside:[8,8],scale:1,cells:[[0,0],[1,0]]}}]});w.scenes.set(3,town);w.loadScene(3);const t=atlasLayout(w);
 assert.equal(t.blocked(8.5,8.5),true);assert.equal(t.materialAt(2.5,1.5).vegetationAllowed,false);
 w.loadScene(2);const indoor=w.livingAtlas.runtime();for(let y=1;y<19;y++)for(let x=1;x<19;x++)assert.equal(indoor.layout.materialAt(x+.5,y+.5).vegetationAllowed,false);
 w.loadScene(1);assert.equal(JSON.stringify(w.scene.floor),before);const pass=w.walkable(6.5,6.5);for(let i=0;i<5;i++)w.rest();assert.equal(w.walkable(6.5,6.5),pass);assert.deepEqual(w.livingAtlas.runtime().kernel.field.supplies,{timber:0,stone:0,ore:0});
});

test('only accepted movement flattens plants and it cannot alter host displacement',()=>{
 const w=fixture(),p=green(w);Object.assign(w.state,p);w.move(.4,0);assert.equal(w.state.x,p.x+.4);assert.equal(w.state.y,p.y);
 const saved=JSON.parse(w.save());assert.ok(saved.livingAtlasV1.maps.s1.vegetation.vegetation.entries.some(e=>e[3]>0));assert.ok(Math.abs(saved.livingAtlasV1.travel-.4)<1e-12);
 const before=w.save();w.move(50,0);assert.equal(w.save(),before);w.state.mode='dialog';const day=w.state.livingAtlasV1.day;w.move(.4,0);assert.equal(w.state.livingAtlasV1.day,day);
});

test('accepted fire/water/earth/aether alter numerical fields, duplicate and healing events do not',()=>{
 const w=fixture(),target=green(w),before=w.livingAtlas.sample(target.x,target.y),event={type:'cast',tech:{core:'flame'},targets:[target]};
 livingAtlasBattleEvent(w,event);const burned=w.livingAtlas.sample(target.x,target.y);assert.ok(burned.fields.fire>before.fields.fire);assert.ok(burned.fields.biomass<before.fields.biomass);assert.ok(burned.vegetation.scorch>before.vegetation.scorch);
 const once=fields(w);livingAtlasBattleEvent(w,event);assert.deepEqual(fields(w),once);
 livingAtlasBattleEvent(w,{type:'cast',tech:{core:'tide',healing:true},targets:[target]});assert.deepEqual(fields(w),once);
 livingAtlasBattleEvent(w,{type:'enemy-cast',intent:{core:'tide'},targets:[target]});assert.ok(w.livingAtlas.sample(target.x,target.y).fields.moisture>burned.fields.moisture);assert.ok(w.livingAtlas.sample(target.x,target.y).fields.fire<burned.fields.fire);
 const stone=w.livingAtlas.sample(target.x,target.y).fields.stone;livingAtlasBattleEvent(w,{type:'cast',tech:{core:'earth'},targets:[target]});assert.ok(w.livingAtlas.sample(target.x,target.y).fields.stone>stone);
 livingAtlasBattleEvent(w,{type:'cast',tech:{core:'shade'},targets:[target]});assert.ok(w.livingAtlas.sample(target.x,target.y).fields.resonance>0);
 assert.deepEqual(w.state.items,{tonic:3});assert.equal(w.scene.objects.length,0);
});

test('Hydrophone phases really interfere, cost exactly 2 MP and never grant resources',()=>{
 const w=fixture(),api=w.livingAtlas,mp=w.activeHeroes[0].mp,resources=structuredClone(w.state.items),start=api.status().resonance;
 assert.equal(api.listen({phase:0}).ok,true);const raised=api.status().resonance;assert.ok(raised>start+.1);assert.equal(w.activeHeroes[0].mp,mp-2);
 assert.equal(api.listen({phase:.5}).ok,true);assert.ok(api.status().resonance<raised*.01);assert.equal(w.activeHeroes[0].mp,mp-4);assert.deepEqual(w.state.items,resources);
 w.activeHeroes[0].mp=1;const before=w.save();assert.equal(api.listen().ok,false);assert.equal(w.save(),before);
 w.activeHeroes[0].mp=10;w.state.mode='battle';const state=w.save();assert.equal(api.listen().ok,false);assert.equal(w.save(),state);
});

test('exact sparse numerical saves survive dynamic ground, map streaming and restoration',()=>{
 const w=fixture(),p=green(w);Object.assign(w.state,p);w.livingAtlas.listen();const event={type:'cast',tech:{core:'flame',shape:'burst'},targets:[p]};w.reconciledGround.battleEvent(event);livingAtlasBattleEvent(w,event);for(let n=0;n<4;n++)w.rest();const exact=fields(w);
 const snapshot=w.save();assert.ok(snapshot.length<400000);assert.equal(validateLivingAtlas(JSON.parse(snapshot),w.scenes),true);
 w.loadScene(2);w.livingAtlas.runtime();w.loadScene(1);assert.deepEqual(fields(w),exact);
 const r=fixture();r.restore(snapshot);assert.deepEqual(fields(r),exact);assert.deepEqual(r.state.environment.preserved,{value:7});assert.deepEqual(r.state.items,{tonic:3});assert.ok(r.reconciledGround.surface(p.x,p.y).temperature>0);
});

test('ordinary aging does not multiply dense fields across a long campaign save',()=>{
 const w=fixture();for(let i=0;i<4;i++)w.rest();const exact=fields(w);
 for(let id=3;id<=26;id++){w.scenes.set(id,makeScene(id));w.loadScene(id);w.livingAtlas.runtime();}
 const saved=JSON.parse(w.save());for(const m of Object.values(saved.livingAtlasV1.maps))assert.deepEqual(m.kernel.fields,{});assert.ok(JSON.stringify(saved.livingAtlasV1).length<12000);
 w.restore(saved);w.loadScene(1);assert.deepEqual(fields(w),exact);w.livingAtlas.listen();const resonant=JSON.parse(w.save()).livingAtlasV1.maps.s1.kernel;assert.ok(Object.values(resonant.fields).some(s=>s.startsWith('f32:')));assert.ok(JSON.stringify(resonant).length<100000);const waves=fields(w);w.restore(w.save());assert.deepEqual(fields(w),waves);
});

test('malformed new snapshots are rejected before any existing state is mutated',()=>{
 const w=fixture();w.livingAtlas.listen();livingAtlasBattleEvent(w,{type:'cast',tech:{core:'flame'},target:green(w)});const before=w.save();
 for(const corrupt of [s=>s.livingAtlasV1.maps.s1.kernel.fields.fire='!!',s=>s.livingAtlasV1.maps.s1.kernel.seed++,s=>s.livingAtlasV1.maps.s1.vegetation.recentEventIds.push(...s.livingAtlasV1.maps.s1.vegetation.recentEventIds),s=>s.livingAtlasV1.maps.s1.ecology.alert=9]){const bad=JSON.parse(before);corrupt(bad);assert.throws(()=>w.restore(bad));assert.equal(w.save(),before);}
});

test('old saves work, effects at map edges save, and same-lineage transitions retain history',()=>{
 const w=fixture();w.restore(fresh());assert.equal(w.state.livingAtlasV1,undefined);w.livingAtlas.runtime();livingAtlasBattleEvent(w,{type:'cast',tech:{core:'flame',shape:'burst'},target:{x:1.1,y:1.1}});assert.equal(validateLivingAtlas(JSON.parse(w.save()),w.scenes),true);
 w.newGame({chronicle:{cycle:2,originId:'test'}});w.state.timeline={id:'lineage-2-test'};w.livingAtlas.listen();const before=structuredClone(JSON.parse(w.save()).livingAtlasV1);w.newGame({chronicle:{cycle:2,originId:'test'}});assert.deepEqual(w.state.livingAtlasV1,before);
 w.newGame();assert.equal(w.state.livingAtlasV1,undefined);assert.equal(w.livingAtlas.status().resonance,0);
});

test('actual defeated and peaceful species update local pressure exactly once with no loot writes',()=>{
 const w=fixture(),battle={context:{encounterSerial:4},enemies:[{species:'glassback',hp:0},{species:'echo-moth',hp:20,withdrawn:true},{species:'guardian',hp:0,boss:true}]};w.currentBattle={object:{type:'wild',serial:4}};
 const inventory=structuredClone(w.state.items);livingAtlasBattleEvent(w,{type:'end',result:'win'},battle);let s=w.livingAtlas.status();assert.equal(s.defeated,1);assert.equal(s.peaceful,1);assert.ok(s.abundance<1);
 livingAtlasBattleEvent(w,{type:'end',result:'win'},battle);assert.equal(w.livingAtlas.status().defeated,1);assert.deepEqual(w.state.items,inventory);assert.ok(w.livingAtlas.encounterPace()>=.65&&w.livingAtlas.encounterPace()<=1.3);
 w.rest();assert.ok(w.livingAtlas.status().abundance>s.abundance);const after=w.save();w.restore(after);assert.equal(w.livingAtlas.status().defeated,1);
});

test('resident gate samples current canonical actors, rejects walls, distance and departed packs',()=>{
 const w=fixture(),o={type:'patrol',bit:1,enemies:[[0,[10,10]]],roam:[[0,0],[1,0]]};w.scene.objects.push(o);w.fieldPatrols=createFieldPatrols();
 for(let i=0;i<20;i++)w.fieldPatrols.update(w,.05);const at=fieldPatrolPosition(w,o);Object.assign(w.state,{x:at.x+.5,y:at.y});assert.equal(livingAtlasResidentGate(w,o).ok,true);
 w.state.x=17;assert.equal(livingAtlasResidentGate(w,o).ok,false);w.state.x=at.x+2;const wall=Math.floor(at.x+1);w.scene.floor=w.scene.floor.map(r=>r.slice(0,wall)+'#'+r.slice(wall+1));assert.equal(livingAtlasResidentGate(w,o).ok,false);
 w.scene.objects=[];assert.equal(livingAtlasResidentGate(w,o).ok,false);assert.equal(livingAtlasResidentGate(w,{type:'boss'}).ok,true);
});

test('numeric shielding is capped, never owns HP, and secondary or DOT damage stays unchanged',()=>{
 const w=fixture(),p={...green(w),hp:100};for(const core of ['flame','tide','earth','shade','volt']){const damage=w.livingAtlas.applyDamage(100,p,{core});assert.ok(damage>=92&&damage<=100);assert.equal(w.livingAtlas.applyDamage(100,p,{core,dot:true}),100);assert.equal(w.livingAtlas.applyDamage(100,p,{core,secondary:true}),100);}assert.equal(p.hp,100);
});

test('rooted-stride boots affect actual patrol noticing without replacing Atlas cover',()=>{
 function notices(boots){const w=fixture({ground:false});delete w.livingAtlas;w.reconciledGround={surface:()=>({organic:.5})};w.state.x=13.9;w.state.y=10.5;w.scene.objects=[{type:'patrol',enemies:[[0,[10,10]]],roam:[[0,0]]}];if(boots)w.state.livingArmory={gearByHero:{0:{boots:{effect:'living-stride'}}}};w.fieldPatrols=createFieldPatrols();let cue=false;for(let i=0;i<50;i++)cue=!!w.fieldPatrols.update(w,.05).cue||cue;return cue;}
 assert.equal(notices(false),true);assert.equal(notices(true),false);
});

test('Canvas chunks and low-quality settings leave simulation untouched and readout obeys hide',()=>{
 const w=fixture(),p=green(w);Object.assign(w.state,p);const before=fields(w),saved=JSON.stringify(w.livingAtlas.runtime().bridge.snapshot());let drawCalls=0;
 const context=()=>new Proxy({globalAlpha:1,drawImage(){drawCalls++;}},{get(t,k){return k in t?t[k]:()=>{};}}),prior=globalThis.document;
 globalThis.document={createElement(type){return type==='canvas'?{width:0,height:0,getContext:()=>context()}:{style:{},remove(){},hidden:false};}};
 try{const renderer={ctx:context(),time:1,treeSites:[],canvas:{dataset:{}},comfort:{steadyLighting:false},compatibility:false};drawLivingAtlas(renderer,w,null,{x0:0,y0:0,x1:19,y1:19},.016);assert.ok(drawCalls>0);assert.equal(renderer.canvas.dataset.livingGrass,'v6');assert.ok(w.livingAtlas.runtime().metrics.bakes<=2);renderer.compatibility=true;drawLivingAtlas(renderer,w,null,{x0:0,y0:0,x1:19,y1:19},.016);assert.deepEqual(fields(w),before);assert.equal(JSON.stringify(w.livingAtlas.runtime().bridge.snapshot()),saved);
 assert.equal(w.livingAtlas.listen().ok,true);const ui=mountLivingAtlasReadout({getWorld:()=>w,parent:{append(){}}});assert.equal(ui.node.hidden,true);ui.update({hidden:false});assert.equal(ui.node.hidden,false);assert.match(ui.node.textContent,/resonance/);ui.update({hidden:true});assert.equal(ui.node.style.display,'none');ui.destroy();}finally{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}
});

test('nearby grass animation is bounded to about eight updates per second and reuses its canvas',()=>{
 const w=fixture(),p=green(w);Object.assign(w.state,p);const before=fields(w);let created=0,clears=0;
 const context=()=>new Proxy({globalAlpha:1,clearRect(){clears++;}},{get(t,k){return k in t?t[k]:()=>{};}}),prior=globalThis.document;
 globalThis.document={createElement(){created++;return {width:0,height:0,getContext:()=>context()};}};
 try{const r={ctx:context(),time:0,treeSites:[],canvas:{dataset:{}},comfort:{},compatibility:false},cx=Math.floor(p.x/6),cy=Math.floor(p.y/6),bounds={x0:cx*6,y0:cy*6,x1:(cx+1)*6,y1:(cy+1)*6};let bakes=0;
  for(let i=0;i<60;i++){r.time=i/60;drawLivingAtlas(r,w,null,bounds,1/60);bakes+=w.livingAtlas.runtime().metrics.bakes;}
  assert.equal(created,1);assert.ok(bakes>=7&&bakes<=9);assert.equal(clears,bakes);assert.deepEqual(fields(w),before);
  const rt=w.livingAtlas.runtime();rt.dirty.push({...p,radius:1});drawLivingAtlas(r,w,null,bounds,0);assert.equal(rt.metrics.bakes,1);assert.equal(created,1);
 }finally{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}
});

test('production World keeps all authored encounters and old progress through composed save wrappers',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url))),w=new World(data),original=JSON.stringify(w.data.scenes.map(s=>s.objects));installReconciledGround(w);installLivingAtlas(w);const field=w.data.scenes.find(s=>s.key==='forest');assert.ok(field);w.state.scene=field.location;w.state.mode='field';[w.state.x,w.state.y]=field.arrive.map(v=>v+.5);w.activeHeroes[0].mp=10;w.livingAtlas.listen();const saved=w.save();w.restore(saved);assert.ok(w.livingAtlas.status().resonance>0);assert.equal(JSON.stringify(w.data.scenes.map(s=>s.objects)),original);assert.ok(w.data.scenes.flatMap(s=>s.objects).filter(o=>o.type==='boss').length>=24);
});

test('all campaign installers compose across real origin convergence and a new telling resets physical fields',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url))),w=new World(data);installReconciledGround(w);installLivingAtlas(w);installTrailLife(w);
 const transport={ctx:null,index:new Map(),init:async()=>{},setVolume(){},setMuted(){},setListener(){},dispose(){}};
 const audio=createReconciledAcoustics({getWorld:()=>w,transport,storage:null});w.fieldPatrols=createFieldPatrols();installTownLife(w);installRegionalLife(w);installRivals(w);installFieldFeedback(w,()=>{});
 try{
  w.newGame({originId:'sable-reed',legacy:legacyFrom({})});w.state.mode='field';const scene=w.state.scene,key='s'+scene,id=w.state.timeline.id;
  assert.equal(w.livingAtlas.listen({phase:0}).ok,true);w.reconciledGround.impact(w.state.x,w.state.y,'flame',.7);const original=JSON.parse(w.save()),savedFields=original.livingAtlasV1.maps[key].kernel;
  w.restore(original);assert.deepEqual(JSON.parse(w.save()).livingAtlasV1.maps[key].kernel,savedFields);
  w.state.chronicle.step=4;w.state.chronicle.choices={repair:0,destiny:0,approach:'diversion'};convergeOrigin(w);
  assert.equal(w.state.timeline.id,id);assert.equal(w.state.chronicle.phase,'present');assert.equal(w.state.livingAtlasV1.timelineId,id);assert.deepEqual(w.state.livingAtlasV1.maps[key].kernel,savedFields);assert.deepEqual(w.state.environment.groundV1.maps[String(scene)],original.environment.groundV1.maps[String(scene)]);
  assert.doesNotThrow(()=>w.restore(w.save()));const prior=legacyFrom(w.state);w.newGame({originId:'iona-lowbank',legacy:prior});w.state.mode='field';assert.notEqual(w.state.timeline.id,id);assert.equal(w.state.livingAtlasV1,undefined);assert.equal(w.livingAtlas.status().resonance,0);assert.equal(w.state.livingAtlasV1.maps[key],undefined);assert.equal(w.state.environment.groundV1.maps[String(scene)],undefined);
 }finally{audio.dispose();}
});
