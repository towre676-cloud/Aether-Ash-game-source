import test from 'node:test';
import assert from 'node:assert/strict';
import {atlasRegistration,registeredFit,followAmount,shareActorRegistrations} from '../motion-realism.js';
import {ACTOR_SHEETS} from '../actor-atlas.js';
import {originalAtlas} from '../atlas-fallback.js';
test('pose changes retain a single body scale even with extended arms',()=>{
 const poses=[{w:40,h:100},{w:70,h:96},{w:44,h:102},{w:48,h:100}];
 const [r]=atlasRegistration(poses,4,1);
 const fits=poses.map(p=>registeredFit(p,r,60,50));
 for(let i=0;i<fits.length;i++)assert.equal(fits[i].height/poses[i].h,.6);
 assert.equal(fits[1].width,42);
});
test('camera decay is independent of rendering frame rate',()=>{
 const results=[30,60,120].map(fps=>{let x=0;for(let i=0;i<fps;i++)x+=(100-x)*followAmount(1/fps,8);return x;});
 for(const x of results)assert.ok(Math.abs(x-results[0])<1e-10);
 assert.equal(followAmount(0,8),0);
});
test('standing, sprinting and starter rows share a stable actor scale',()=>{
 const r={crew:[{height:150,width:180}],run:[{height:160,width:170}],starter:[{height:165,width:140},{height:155,width:150}]};
 shareActorRegistrations(r);
 assert.deepEqual(r.crew[0],{height:150,width:180});assert.deepEqual(r.run[0],{height:160,width:192});
 assert.equal(r.starter[0].height,165);assert.equal(r.starter[1].height,155);
 assert.ok(Math.abs(r.starter[0].width/r.starter[0].height-r.starter[1].width/r.starter[1].height)<1e-12);
 const standing=registeredFit({w:100,h:150},r.crew[0],80,70),running=registeredFit({w:100*160/150,h:160},r.run[0],80,70);
 for(const key of ['width','height','left','top'])assert.ok(Math.abs(standing[key]-running[key])<1e-10,key+' changes at the walk/run transition');
});
test('all delivered crew and civilian rows keep the same median body height across idle and locomotion',()=>{
 const atlases={},r={},reference=[0,1,2,5,6,7];
 for(const kind of ['crew','run','starter']){const sheet=ACTOR_SHEETS[kind];atlases[kind]=originalAtlas({width:sheet.width,height:sheet.height},kind,8,sheet.rows.length);r[kind]=atlasRegistration(atlases[kind].bounds,8,sheet.rows.length,kind==='crew'?reference:null);}
 assert.ok(r.run[0].height/r.crew[0].height>1.08,'the actual Sable source art must exercise the old visible growth');
 const sourceHeights=Object.fromEntries(Object.entries(r).map(([kind,rows])=>[kind,rows.map(row=>row.height)]));
 shareActorRegistrations(r);
 const medianHeight=(kind,row,height,width)=>{
  const source=atlases[kind].bounds.slice(row*8,row*8+8).filter((_,col)=>kind!=='crew'||reference.includes(col));
  const values=source.map(b=>{const fit=registeredFit(b,r[kind][row],height,width);return b.bodyHeight*fit.width/b.w;}).sort((a,b)=>a-b);
  return values[Math.floor(values.length/2)];
 };
 // Wide and width-constrained views must agree; a cape cannot change the body unit.
 for(const [height,width]of [[60,74],[80,40]]){
  for(let row=0;row<7;row++)assert.ok(Math.abs(medianHeight('crew',row,height,width)-medianHeight('run',row,height,width))<1e-10,'crew '+row+' changes size');
  assert.ok(Math.abs(medianHeight('starter',0,height,width)-medianHeight('starter',1,height,width))<1e-10,'civilian Sable changes size');
 }
 for(const [kind,rows]of Object.entries(r))assert.deepEqual(rows.map(row=>row.height),sourceHeights[kind],'source pixel units were overwritten');
});
test('a wide attack weapon does not shrink the locomotion reference',()=>{
 const poses=Array.from({length:8},()=>({w:90,h:150}));poses[3]={w:200,h:150};poses[4]={w:170,h:150};
 const [r]=atlasRegistration(poses,8,1,[0,1,2,5,6,7]);assert.deepEqual(r,{height:150,width:90});
 const fit=registeredFit(poses[0],r,75,60);assert.equal(fit.height,75);
});
