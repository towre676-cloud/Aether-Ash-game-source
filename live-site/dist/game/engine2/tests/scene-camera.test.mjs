import test from 'node:test';import assert from 'node:assert/strict';
import {sceneCamera,cameraFollow,conversationFocus} from '../scene-camera.js';import {viewLayout} from '../presentation.js';
import {bossIntent,patternGeometry} from '../boss-patterns.js';
const scene={household:{box:{left:19,top:6,right:27,bottom:14}}};
const state={x:21.5,y:8.5,mode:'field'};
function inside(p,world,w,h,l){const sx=w/2+(world.x*48-p.x)*p.zoom,sy=l.centerY+(world.y*48-p.y)*p.zoom;assert.ok(sx>=-1e-7&&sx<=w+1e-7,`x ${sx} outside ${w}`);assert.ok(sy>=l.top-1e-7&&sy<=h-l.bottom+1e-7,`y ${sy} outside ${l.top}..${h-l.bottom}`);}
function samplePrimitive(g){
 if(g.kind==='rect')return [{x:g.x,y:g.y},{x:g.x+g.w,y:g.y+g.h}];
 if(g.kind==='lane'){const dx=g.endX-g.x,dy=g.endY-g.y,l=Math.hypot(dx,dy)||1,nx=-dy/l*g.width,ny=dx/l*g.width;return [{x:g.x+nx,y:g.y+ny},{x:g.x-nx,y:g.y-ny},{x:g.endX+nx,y:g.endY+ny},{x:g.endX-nx,y:g.endY-ny}];}
 return Array.from({length:65},(_,i)=>{const angle=g.kind==='sector'?g.heading-g.angle+i/64*g.angle*2:i/64*Math.PI*2;return {x:g.x+Math.cos(angle)*g.radius,y:g.y+Math.sin(angle)*g.radius};});
}
test('small opening homes use a closer readable lens without fitting the entire map grid',()=>{
 const layout=viewLayout(1366,936,{hudHeight:190}),p=sceneCamera(scene,state,layout,1366,936);
 assert.ok(p.zoom>=1.68&&p.zoom<=1.9);assert.equal(p.x,23.5*48);assert.ok(Number.isFinite(p.y));
 const tall={...scene,width:64,height:64};assert.deepEqual(sceneCamera(tall,state,layout,1366,936),p);
});
test('large interiors follow the actor while respecting physical room edges',()=>{
 const room={household:{box:{left:2,top:6,right:37,bottom:36}}},l=viewLayout(1366,936,{hudHeight:170});
 const a=sceneCamera(room,{x:3,y:7},l,1366,936),b=sceneCamera(room,{x:35,y:35},l,1366,936);
 assert.ok(a.x<b.x&&a.y<b.y);assert.equal(a.zoom,b.zoom);assert.ok(a.x>2*48&&b.x<38*48);
});
test('portrait and compact views use their own restrained close lens',()=>{
 for(const [w,h,z]of [[390,780,1.22],[740,360,1.04]]){const p=sceneCamera(scene,state,viewLayout(w,h,{touch:true}),w,h);assert.equal(p.zoom,z);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));}
});
test('exploration is closer and landmark proximity adds a continuous modest composition',()=>{
 const l=viewLayout(1366,936,{hudHeight:170}),field={},a=sceneCamera(field,state,l,1366,936),sites=[{x:23,y:9}],b=sceneCamera(field,state,l,1366,936,{landmarks:sites});
 assert.equal(a.zoom,1.44);assert.ok(b.zoom>a.zoom&&b.zoom<=1.58);assert.ok(b.x>a.x);assert.ok(b.x-a.x<48);
 const edgeA=sceneCamera(field,{x:18.3999,y:9},l,1366,936,{landmarks:sites}),edgeB=sceneCamera(field,{x:18.4001,y:9},l,1366,936,{landmarks:sites});
 assert.ok(Math.abs(edgeA.zoom-edgeB.zoom)<.001);
 assert.deepEqual(sceneCamera(field,state,l,1366,936,{steady:true,landmarks:sites}),a);
});
test('named conversation framing keeps the lead and speaker bodies above the dialog',()=>{
 for(const [w,h]of [[1366,936],[390,780],[740,360]]){
  const l=viewLayout(w,h,{hudHeight:h<500?77:w<600?112:150,dialog:true,touch:w<600}),s={x:10,y:10,mode:'dialog'},focus={x:12,y:10.4},p=sceneCamera({},s,l,w,h,{focus});
  for(const a of [s,focus]){inside(p,{x:a.x-.7,y:a.y-92/48},w,h,l);inside(p,{x:a.x+.7,y:a.y+28/48},w,h,l);}
  if(w>1000)assert.equal(p.zoom,1.86);
  assert.deepEqual(sceneCamera({},s,l,w,h,{focus:{x:99,y:99}}),sceneCamera({},s,l,w,h));
 }
});
test('a tall measured HUD in a short dialog still aims inside the actual remaining band',()=>{
 const w=740,h=360,l=viewLayout(w,h,{hudHeight:150,dialog:true}),s={x:10,y:10,mode:'dialog'},focus={x:12,y:10.4};
 assert.equal(h-l.top-l.bottom,44);assert.equal(l.centerY,172);
 for(const steady of [false,true]){const p=sceneCamera({},s,l,w,h,{focus,steady});for(const a of [s,focus]){inside(p,{x:a.x,y:a.y-92/48},w,h,l);inside(p,{x:a.x,y:a.y+28/48},w,h,l);}}
});
test('speaker matching only frames a nearby actual NPC or travelling companion',()=>{
 const w={state:{x:10,y:10,party:[0,4],heroes:[{id:0,name:'Sable'},{id:4,name:'Riven'},{id:6,name:'Veyr'}]},objects:()=>[{type:'npc',xy:[12,10],text:'MARA: Good morning.'},{type:'npc',xy:[40,40],text:'IONA: Far away.'}]};
 assert.deepEqual(conversationFocus(w,'MARA'),{x:12.5,y:10.5});assert.deepEqual(conversationFocus(w,' sable '),{x:10,y:10});assert.deepEqual(conversationFocus(w,'Riven',[{id:4,x:9,y:10.7}]),{x:9,y:10.7});
 assert.equal(conversationFocus(w,'Veyr'),null);assert.equal(conversationFocus(w,'Iona'),null);assert.equal(conversationFocus(w,'Supplies & progress'),null);assert.equal(conversationFocus(w,''),null);
});
test('battle boolean fallback preserves the old point contract',()=>{
 const l=viewLayout(390,780,{battle:true,battleDockHeight:240,hudHeight:110});
 assert.deepEqual(sceneCamera(scene,{x:21,y:8},l,390,780,{battle:true}),{zoom:l.zoom*.9,x:1008,y:384});
});
test('tight battles move closer while wide battles fit all living bodies and the objective',()=>{
 const l=viewLayout(1366,936,{battle:true,battleDockHeight:240,hudHeight:110}),hero={x:10,y:10,hp:100},enemy={x:12,y:10,hp:100,boss:true},battle={heroes:[hero],enemies:[enemy]};
 const close=sceneCamera({},hero,l,1366,936,{battle});assert.equal(close.zoom,1.48);
 battle.heroes.push({x:3,y:16,hp:100});battle.objective={asset:{x:14,y:5,hp:100}};
 const wide=sceneCamera({},hero,l,1366,936,{battle});assert.ok(wide.zoom<close.zoom);
 for(const a of [...battle.heroes,...battle.enemies,battle.objective.asset]){inside(wide,{x:a.x,y:a.y-(a.boss?148:92)/48},1366,936,l);inside(wide,{x:a.x,y:a.y+28/48},1366,936,l);}
 const dead={x:200,y:200,hp:0};battle.enemies.push(dead);assert.deepEqual(sceneCamera({},hero,l,1366,936,{battle}),wide);
});
test('a crowded battle viewport fits the real small band without inventing extra height',()=>{
 const w=740,h=360,l=viewLayout(w,h,{battle:true,hudHeight:150,battleDockHeight:180}),hero={x:10,y:10,hp:100},enemy={x:12,y:10,hp:100,boss:true};
 assert.equal(l.visibleHeight,18);
 const p=sceneCamera({},hero,l,w,h,{battle:{heroes:[hero],enemies:[enemy]}});
 for(const a of [hero,enemy]){inside(p,{x:a.x,y:a.y-(a.boss?148:92)/48},w,h,l);inside(p,{x:a.x,y:a.y+28/48},w,h,l);}
});
test('every guardian warning and living body fits the measured battle viewport',()=>{
 for(const [w,h,hud,dock]of [[1366,936,170,250],[1366,768,150,210],[390,780,130,250],[740,360,77,112]]){
  const l=viewLayout(w,h,{battle:true,hudHeight:hud,battleDockHeight:dock}),heroes=[{x:10,y:10,hp:100},{x:9.1,y:10.7,hp:100},{x:10.9,y:10.7,hp:100}];
  for(let chapter=1;chapter<=24;chapter++)for(let phase=0;phase<3;phase++)for(let turn=1;turn<=3;turn++){
   const enemy={x:12,y:10,hp:phase===0?100:phase===1?60:20,maxHp:100,power:10,boss:true,phase,turn};enemy.intent=bossIntent(enemy,chapter,heroes[0],{heroes});
   const p=sceneCamera({},heroes[0],l,w,h,{battle:{heroes,enemies:[enemy]}});assert.ok(p.zoom>0&&Number.isFinite(p.zoom));
   for(const g of patternGeometry(enemy.intent))for(const s of samplePrimitive(g))inside(p,s,w,h,l);
   for(const a of [...heroes,enemy]){inside(p,{x:a.x,y:a.y-(a.boss?148:92)/48},w,h,l);inside(p,{x:a.x,y:a.y+28/48},w,h,l);}
  }
 }
});
test('a side console gives a stronger battle view while keeping every warning out of the console',()=>{
 const w=1280,h=768,arenaWidth=864,l={top:146,bottom:72,visibleHeight:550,centerY:421,centerX:432,right:w-arenaWidth,zoom:1.1},heroes=[{x:10,y:10,hp:100},{x:9.1,y:10.7,hp:100},{x:10.9,y:10.7,hp:100}];
 for(let chapter=1;chapter<=24;chapter++)for(let phase=0;phase<3;phase++)for(let turn=1;turn<=3;turn++){
  const enemy={x:12,y:10,hp:phase===0?100:phase===1?60:20,maxHp:100,power:10,boss:true,phase,turn};enemy.intent=bossIntent(enemy,chapter,heroes[0],{heroes});
  const battle={heroes,enemies:[enemy]},p=sceneCamera({},heroes[0],l,arenaWidth,h,{battle}),bottom=viewLayout(w,h,{battle:true,hudHeight:146,battleDockHeight:355}),previous=sceneCamera({},heroes[0],bottom,w,h,{battle});
  assert.ok(p.zoom>previous.zoom*1.45,'the taller side-console arena keeps the fight closer');
  for(const g of patternGeometry(enemy.intent))for(const s of samplePrimitive(g))inside(p,s,arenaWidth,h,l);
  for(const a of [...heroes,enemy]){inside(p,{x:a.x,y:a.y-(a.boss?148:92)/48},arenaWidth,h,l);inside(p,{x:a.x,y:a.y+28/48},arenaWidth,h,l);}
 }
});
test('steady framing avoids boss warning lens changes and camera settling is bounded',()=>{
 const l=viewLayout(1366,936,{battle:true,hudHeight:150,battleDockHeight:200}),hero={x:10,y:10,hp:100},e={x:12,y:10,hp:100,maxHp:100,power:10,boss:true},battle={heroes:[hero],enemies:[e]};
 const before=sceneCamera({},hero,l,1366,936,{battle,steady:true});e.intent=bossIntent(e,1,hero,{heroes:[hero]});assert.deepEqual(sceneCamera({},hero,l,1366,936,{battle,steady:true}),before);
 const a={x:100,y:100,zoom:1},out=cameraFollow(a,{x:200,y:200,zoom:.5},.05),closer=cameraFollow(a,{x:200,y:200,zoom:1.5},.05);
 assert.ok(1-out.zoom>closer.zoom-1);assert.ok(out.zoom>.5&&out.zoom<1);assert.ok(out.x>100&&out.x<200);assert.deepEqual(cameraFollow(a,{x:200,y:200,zoom:.5},-1),a);
});
