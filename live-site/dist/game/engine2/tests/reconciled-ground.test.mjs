import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {authoredGroundMaterial,installReconciledGround,validGroundSave,groundElement,drawReconciledGround} from '../reconciled-ground.js';
import {getGroundMaterial} from '../reconciled-content/ground/ground-materials.mjs';
import {World} from '../world.js';
import {convergeOrigin,legacyFrom} from '../origins.js';
import {ORIGINS} from '../origin-content.js';

const makeScene=(location=1,key='field',extra={})=>({location,key,chapter:1,theme:0,width:12,height:12,arrive:[2,2],floor:Array.from({length:12},(_,y)=>Array.from({length:12},(_,x)=>!x||!y||x===11||y===11?'#':'.').join('')),objects:[],doors:[],...extra});
function fixture(){
 const maps=new Map([[1,makeScene()],[2,makeScene(2,'home',{interior:'quarters'})]]);
 const w={maps,state:{scene:1,x:2.5,y:2.5,party:[0],mode:'field',items:{tonic:3},flags:{one:1},environment:{fromOtherSession:{alive:true}}},get scene(){return maps.get(this.state.scene);},walkable(x,y){return this.scene.floor[Math.floor(y)]?.[Math.floor(x)]==='.';},move(dx,dy){if(!['field','battle'].includes(this.state.mode))return;if(this.walkable(this.state.x+dx,this.state.y))this.state.x+=dx;if(this.walkable(this.state.x,this.state.y+dy))this.state.y+=dy;},save(){return JSON.stringify(this.state);},restore(value){this.state=structuredClone(typeof value==='string'?JSON.parse(value):value);},loadScene(id){this.state.scene=id;this.state.x=2.5;this.state.y=2.5;},newGame(){this.state={scene:1,x:2.5,y:2.5,party:[0],mode:'field',items:{tonic:0},flags:{}};}};
 return w;
}

test('authored indoor floors, doors, roads and walls forbid grass without changing the floor mask',()=>{
 const indoor=makeScene(2,'home',{interior:'quarters'}),before=[...indoor.floor];
 for(let y=0;y<12;y++)for(let x=0;x<12;x++){const g=authoredGroundMaterial(indoor,x+.5,y+.5);assert.equal(g.grassAllowed,false);assert.ok(getGroundMaterial(g.id));assert.equal(g.walkable,before[y][x]==='.');}
 assert.deepEqual(indoor.floor,before);
 const road=makeScene(3,'town',{doors:[{xy:[2,1]}],objects:[{type:'npc',xy:[8,8]}]});
 assert.equal(authoredGroundMaterial(road,2.5,1.5).grassAllowed,false);
 assert.equal(authoredGroundMaterial(road,.5,.5).walkable,false);
 const facade=makeScene(4,'field',{exteriorBuildings:[{projection:{outside:[7,7],scale:1,cells:[[0,0]]}}]});
 for(const [x,y] of [[7.5,7.5],[8.25,7.5],[7.5,8.25],[8.25,8.25]]){const g=authoredGroundMaterial(facade,x,y);assert.equal(g.grassAllowed,false);assert.equal(g.built,true);}
});
test('physical impacts change real terrain and bounded final damage once without assigning HP',()=>{
 const w=fixture(),g=installReconciledGround(w),t={x:4.5,y:4.5,hp:100};
 const base=g.applyDamage(100,t,{core:'volt'});
 g.impact(t.x,t.y,'tide',1);g.impact(t.x,t.y,'volt',1);
 const s=g.surface(t.x,t.y),after=g.applyDamage(100,t,{core:'volt'});
 assert.ok(s.wetness>.4);assert.ok(s.charge>.2);assert.ok(after>base);assert.ok(after<=122);assert.equal(t.hp,100);
 assert.equal(g.applyDamage(100,t,{dot:true,core:'volt'}),100);
 assert.equal(g.applyDamage(100,t,{secondary:true,core:'volt'}),100);
});
test('accepted cast events create terrain consequences once and rejected/healing casts do not',()=>{
 const w=fixture(),g=installReconciledGround(w),target={x:5.5,y:5.5},event={type:'cast',tech:{core:'flame',power:2},targets:[target]};
 g.battleEvent(event);const heat=g.surface(target.x,target.y).temperature;assert.ok(heat>0);
 g.battleEvent(event);assert.equal(g.surface(target.x,target.y).temperature,heat);
 g.battleEvent({type:'cast',tech:{core:'tide',healing:true},targets:[target]});assert.equal(g.surface(target.x,target.y).wetness,0);
 assert.equal(g.impact(.5,.5,'tide',1),null);
});
test('canonical movement displacement and route wall semantics remain exact',()=>{
 const w=fixture(),g=installReconciledGround(w),events=[];g.subscribe(e=>events.push(e));
 w.move(.25,.125);assert.equal(w.state.x,2.75);assert.equal(w.state.y,2.625);
 w.move(.75,0);assert.equal(w.state.x,3.5);assert.equal(events.filter(e=>e.type==='campaign-footstep').length,1);
 const n=events.length;w.state.mode='dialog';w.move(1,0);assert.equal(w.state.x,3.5);assert.equal(events.length,n);
});
test('worn rooted boots improve actual organic traction without boosting routes or stone',()=>{
 const w=fixture(),g=installReconciledGround(w),cells=[];
 for(let y=1;y<11;y++)for(let x=1;x<11;x++)cells.push({x:x+.5,y:y+.5,s:g.surface(x+.5,y+.5)});
 const soil=cells.find(p=>p.s.organic>=.2&&p.s.traction<1),stone=cells.find(p=>p.s.organic<.2&&p.s.rooted<.15);
 assert.ok(soil&&stone,'real host scene contains both organic and mineral surfaces');
 const bareSoil=g.movementScale(soil.x,soil.y),bareStone=g.movementScale(stone.x,stone.y);
 w.state.livingArmory={gearByHero:{0:{feet:{effect:'living-stride'}}}};
 const before=JSON.stringify(w.state),worn=g.movementScale(soil.x,soil.y);
 assert.ok(worn>bareSoil);assert.ok(worn>=.9&&worn<=1);assert.equal(g.movementScale(stone.x,stone.y),bareStone);assert.equal(JSON.stringify(w.state),before,'sampling grip is read-only');
 w.move(.25,.125);assert.equal(w.state.x,2.75);assert.equal(w.state.y,2.625);
 delete w.state.livingArmory.gearByHero[0].feet;assert.equal(g.movementScale(soil.x,soil.y),bareSoil);
});
test('sparse exact saves survive scene streaming and preserve unrelated state',()=>{
 const w=fixture(),g=installReconciledGround(w);g.impact(5.5,5.5,'tide',.7);const original=g.surface(5.5,5.5).wetness;
 w.loadScene(2);assert.equal(g.registeredMaps.length,1);g.impact(4.5,4.5,'flame',.5);
 w.loadScene(1);assert.equal(g.surface(5.5,5.5).wetness,original);
 const saved=JSON.parse(w.save());assert.equal(saved.items.tonic,3);assert.deepEqual(saved.environment.fromOtherSession,{alive:true});assert.equal(Object.keys(saved.environment.groundV1.maps).length,2);assert.ok(JSON.stringify(saved.environment.groundV1).length<5000);
 const restored=fixture(),r=installReconciledGround(restored);restored.restore(saved);assert.equal(r.surface(5.5,5.5).wetness,original);
 assert.equal(r.registeredMaps.length,1);
});
test('old saves initialize clean ground and new journeys never inherit unearned scars',()=>{
 const w=fixture(),g=installReconciledGround(w);g.impact(4.5,4.5,'flame',1);w.newGame();assert.equal(g.surface(4.5,4.5).temperature,0);
 w.restore({scene:1,x:2.5,y:2.5,party:[0],mode:'field',gold:99});assert.equal(w.state.gold,99);assert.equal(g.surface(4.5,4.5).temperature,0);
});
test('real origin convergence preserves ground history only within the same lineage',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url))),w=new World(data),g=installReconciledGround(w);
 w.newGame({originId:ORIGINS[0].id});const originScene=String(w.state.scene),x=w.state.x,y=w.state.y;
 assert.ok(g.impact(x,y,'tide',.8));assert.ok(g.impact(x,y,'flame',.5));
 w.state.chronicle.step=4;w.state.chronicle.choices={repair:0,destiny:0,approach:'battle'};
 const past=w.save(),prior=structuredClone(w.state.environment.groundV1),lineage=w.state.timeline.id;
 g.impact(x,y,'volt',.7);const index=Math.floor(y)*w.scene.width+Math.floor(x);prior.sequence++;prior.maps[originScene].cells.find(row=>row[0]===index)[3]=g.surface(x,y).charge;
 convergeOrigin(w);assert.equal(w.state.chronicle.phase,'present');assert.equal(w.state.timeline.id,lineage);assert.deepEqual(w.state.environment.groundV1,prior);
 const present=w.save();w.restore(present);assert.deepEqual(w.state.environment.groundV1.maps[originScene],prior.maps[originScene]);assert.equal(w.state.environment.groundV1.sequence,prior.sequence);
 const legacy=legacyFrom(w.state);w.newGame({originId:ORIGINS[0].id,legacy});assert.equal(w.state.environment.groundV1.sequence,0);assert.equal(g.surface(x,y).wetness,0);assert.equal(g.surface(x,y).temperature,0);
 w.restore(past);w.newGame({quiet:true});assert.equal(w.state.environment.groundV1.sequence,0);assert.equal(w.state.environment.groundV1.maps[originScene],undefined);
 for(const change of [{cycle:prior.sequence+1},{originId:ORIGINS[1].id}]){w.restore(past);w.newGame({quiet:true,chronicle:{...w.state.chronicle,phase:'present',...change}});assert.equal(w.state.environment.groundV1.sequence,0);assert.equal(w.state.environment.groundV1.maps[originScene],undefined);}
 w.restore(past);w.state.timeline.id='unrelated-lineage';w.newGame({quiet:true,chronicle:{...w.state.chronicle,phase:'present'}});assert.equal(w.state.environment.groundV1.sequence,0);assert.equal(w.state.environment.groundV1.maps[originScene],undefined);
});
test('malformed new ground snapshots are rejected before World state changes',()=>{
 const w=fixture();installReconciledGround(w);const before=w.save(),bad=JSON.parse(before);bad.environment.groundV1.maps['1']={width:12,height:12,elapsed:0,cells:[[999,0,0,0,0,0,0]]};
 assert.equal(validGroundSave(bad.environment.groundV1),false);assert.throws(()=>w.restore(bad),/Ground Forge/);assert.equal(w.save(),before);
});
test('unknown future ground extensions round trip without being overwritten',()=>{
 const w=fixture(),g=installReconciledGround(w);w.restore({scene:1,x:2.5,y:2.5,party:[0],mode:'field',environment:{groundV1:{version:9,fromFuture:'preserve'}}});
 assert.equal(g.surface(2.5,2.5),null);assert.deepEqual(JSON.parse(w.save()).environment.groundV1,{version:9,fromFuture:'preserve'});
});
test('all host core elements map to supported Ground Forge impacts',()=>{for(const c of ['flame','tide','volt','frost','shade','gravity','earth','ward','gale'])assert.ok(['fire','water','lightning','frost','aether','kinetic'].includes(groundElement(c)));});
test('ground draw is clipped by real cells and restores canvas state without loading GPU code',()=>{
 const w=fixture();installReconciledGround(w);let stack=0,paint=0;
 const c={save(){stack++;},restore(){stack--;},beginPath(){},rect(){},clip(){},ellipse(){paint++;},fill(){},stroke(){},moveTo(){},lineTo(){},drawImage(){}};
 w.reconciledGround.impact(4.5,4.5,'flame',1);assert.doesNotThrow(()=>drawReconciledGround(c,w,{x0:0,y0:0,x1:12,y1:12}));assert.equal(stack,0);assert.ok(paint>0);
 const facade=fixture();facade.maps.set(1,makeScene(1,'field',{exteriorBuildings:[{projection:{outside:[4,4],scale:1,cells:[[0,0]]}}]}));installReconciledGround(facade);facade.reconciledGround.impact(4.5,4.5,'flame',1);paint=0;drawReconciledGround(c,facade,{x0:4,y0:4,x1:5,y1:5});assert.equal(paint,0,'projected facade cells never receive a terrain wash');assert.equal(stack,0);
});
test('authored floors keep one base surface while physical changes still paint in both graphics modes',()=>{
 const w=fixture();installReconciledGround(w);let images=0,marks=0,depth=0;const c={save(){depth++;},restore(){depth--;},beginPath(){},rect(){},clip(){},ellipse(){marks++;},fill(){},stroke(){},moveTo(){},lineTo(){},drawImage(){images++;}};
 for(const compatibility of [false,true])for(const scene of [1,2]){w.loadScene(scene);images=marks=0;drawReconciledGround(c,w,{compatibility});assert.equal(images,0);assert.equal(marks,0);w.reconciledGround.impact(4.5,4.5,'flame',.9);drawReconciledGround(c,w,{compatibility});assert.ok(marks>0);assert.equal(images,0);w.newGame();}
 assert.equal(depth,0);
});
