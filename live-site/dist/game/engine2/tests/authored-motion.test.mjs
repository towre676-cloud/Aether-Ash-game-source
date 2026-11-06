import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AuthoredMotion} from '../authored-motion.js';
import {characterPose} from '../character-motion.js';
import {AUTHORED_ART_FILES,AUTHORED_MOTION_ATLASES,AUTHORED_PROPS,drawAuthoredMotion,drawAuthoredProp} from '../authored-art.js';

const hero=()=>({id:0,hp:100,x:0,y:0,status:{}});
const guardian=()=>({id:'e0',boss:true,hp:100,x:0,y:0,status:{}});
const moth=()=>({id:'moth',species:'moonmoth',hp:100,x:0,y:0,status:{}});
const options=(time,extra={})=>({hero:true,time,pose:{phase:0,facing:1,moving:false},...extra});
const recordingContext=()=>({calls:[],save(){},restore(){},translate(...args){this.calls.push(['translate',...args]);},scale(...args){this.calls.push(['scale',...args]);},drawImage(...args){this.calls.push(['draw',...args]);}});
const images=Object.fromEntries(Object.values(AUTHORED_MOTION_ATLASES).map(a=>[a.asset,{width:a.width,height:a.height}]));

test('unavailable art and unsupported identities keep the established renderer',()=>{
 const motion=new AuthoredMotion(),h=hero();
 assert.equal(motion.select({...h,id:1},options(0)),null);
 assert.equal(motion.select(h,options(0,{starter:true})),null);
 assert.equal(motion.select(h,options(0,{pose:{back:true}})),null);
 assert.equal(motion.select(guardian(),{chapter:5}),null);
 assert.equal(motion.select({...moth(),species:'eldermoonmoth'}),null);
 const c=recordingContext();
 assert.equal(drawAuthoredMotion(c,{},motion.select(h,options(0)),0,0,100),false);
 assert.equal(c.calls.length,0);
 assert.equal(drawAuthoredProp(c,null,'arch',0,0,200,200),false);
});

test('Sable locomotion remains tied to resolved travel at different frame rates',()=>{
 for(const fps of [30,60,120,144]){
  const motion=new AuthoredMotion(),h=hero();let pose={x:0,y:0},frames=new Set();
  for(let i=1;i<=fps;i++){
   h.x=i*2.65/fps;pose=characterPose(pose,h.x,0,1/fps);
   const selected=motion.select(h,options(i/fps,{pose}));frames.add(selected.frame);
   assert.equal(selected.frame,[2,3,4,5][Math.floor(pose.phase)]);
  }
  assert.equal(frames.size,4);
  const phase=pose.phase;pose=characterPose(pose,h.x,0,1/fps,{intent:{x:1,y:0}});
  motion.select(h,options(1+1/fps,{pose}));assert.equal(pose.phase,phase);
 }
});

test('a single turn and brake settle without resetting the distance phase',()=>{
 const motion=new AuthoredMotion(),h=hero();
 motion.select(h,options(0,{pose:{moving:true,phase:2.7,facing:1}}));
 assert.equal(motion.select(h,options(.1,{pose:{moving:true,phase:2.8,facing:-1}})).state,'turn');
 assert.equal(motion.select(h,options(.15,{pose:{moving:true,phase:2.9,facing:-1}})).state,'turn');
 assert.equal(motion.select(h,options(.2,{pose:{moving:true,phase:3.1,facing:-1}})).frame,5);
 assert.equal(motion.select(h,options(.3,{pose:{moving:false,phase:3.1,facing:-1}})).state,'brake');
 assert.equal(motion.select(h,options(.42,{pose:{moving:false,phase:3.1,facing:-1}})).state,'idle');
});

test('a physical action plays anticipation, strike, follow-through and recovery once',()=>{
 const motion=new AuthoredMotion(),h=hero(),target=guardian();
 motion.event({type:'damage',source:h,actor:target,physical:true},1);
 motion.event({type:'damage',source:h,actor:{...target,id:'e1'},physical:true},1.02);
 const actual=[1.03,1.1,1.2,1.28,1.4,1.6].map(t=>motion.select(h,options(t)).frame);
 assert.deepEqual(actual,[8,9,10,11,12,1]);
});

test('impact interrupts the visual pose briefly; burn ticks do not make bodies flinch repeatedly',()=>{
 const motion=new AuthoredMotion(),h=hero();
 motion.event({type:'damage',actor:guardian(),source:h,physical:true},1);
 motion.event({type:'damage',actor:h},1.1);
 assert.equal(motion.select(h,options(1.11)).frame,13);
 assert.equal(motion.select(h,options(1.3)).frame,11);
 motion.event({type:'damage',actor:h,dot:true},1.31);
 assert.equal(motion.select(h,options(1.4)).frame,12);
});

test('spell casting falls back without misrepresenting a spell as a sword attack',()=>{
 const motion=new AuthoredMotion(),h=hero();motion.event({type:'cast',actor:h},2);
 assert.equal(motion.select(h,options(2.2)),null);
 motion.event({type:'cast',actor:h,fieldTick:true},2.6);
 assert.equal(motion.select(h,options(2.8)).state,'idle');
});

test('guardian telegraph, release and recovery survive multi-target damage events',()=>{
 const motion=new AuthoredMotion(),g=guardian(),opts=t=>({chapter:4,battle:true,time:t});
 g.intent={left:1};assert.equal(motion.select(g,opts(1)).frame,6);
 g.intent=null;motion.event({type:'enemy-cast',actor:g},2);
 motion.event({type:'damage',actor:hero(),source:g,physical:true},2);
 assert.equal(motion.select(g,opts(2.03)).frame,7);
 assert.equal(motion.select(g,opts(2.16)).frame,8);
 assert.equal(motion.select(g,opts(2.4)).frame,9);
 g.status.stagger=1;assert.equal(motion.select(g,opts(2.8)).state,'recover');
});

test('fresh field snapshots keep the same guardian stride state by actor ID',()=>{
 const motion=new AuthoredMotion();let seen=new Set();
 for(let i=0;i<60;i++)seen.add(motion.select({...guardian(),x:i*.035,fieldMoving:true},{chapter:4,time:i/60}).frame);
 assert.deepEqual([...seen].sort(),[2,3,4,5]);
 assert.equal(motion.actors.size,1);
});

test('Moonveil has real wingbeat, anticipation, release, recoil and defeat frames',()=>{
 const motion=new AuthoredMotion(),m=moth();
 assert.deepEqual([0,.15,.29,.43].map(time=>motion.select(m,{time}).frame),[0,1,2,3]);
 m.intent={left:1};assert.equal(motion.select(m,{time:.5}).frame,4);
 m.intent=null;motion.event({type:'enemy-cast',actor:m},1);
 assert.equal(motion.select(m,{time:1.1}).frame,5);
 assert.equal(motion.select(m,{time:1.3}).frame,6);
 motion.event({type:'damage',actor:m},1.4);assert.equal(motion.select(m,{time:1.41}).frame,7);
 m.hp=0;assert.equal(motion.select(m,{time:1.42}).frame,8);
});

test('reduced motion removes idle beat and transitional sways while retaining articulated strides',()=>{
 const motion=new AuthoredMotion(),h=hero();
 assert.equal(motion.select(h,options(2,{reducedMotion:true})).frame,0);
 assert.equal(motion.select(h,options(2.1,{reducedMotion:true,pose:{moving:true,facing:-1,phase:2}})).frame,4);
 assert.equal(motion.select(moth(),{time:7,reducedMotion:true}).frame,0);
});

test('the motion cache is bounded and scene resets discard old actions',()=>{
 const motion=new AuthoredMotion();
 for(let i=0;i<300;i++)motion.select({...moth(),id:`field-${i}`},{time:i});
 assert.ok(motion.actors.size<=192);motion.reset();assert.equal(motion.actors.size,0);
 assert.doesNotThrow(()=>motion.select(hero(),options(NaN,{pose:{moving:true,phase:NaN}})));
});

test('every lossless delivery matches its versioned atlas dimensions and source pieces stay inside it',()=>{
 for(const a of Object.values(AUTHORED_MOTION_ATLASES)){
  const bytes=readFileSync(new URL('../art/'+AUTHORED_ART_FILES[a.asset],import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.equal(bytes.toString('ascii',12,16),'VP8L');assert.equal(bytes[20],0x2f);const bits=bytes.readUInt32LE(21);assert.equal((bits&0x3fff)+1,a.width);assert.equal(((bits>>>14)&0x3fff)+1,a.height);assert.ok(bits&0x10000000,'RGBA lossless WebP');
  for(const f of a.frames)for(const [x,y,w,h] of [f.source,...(f.parts||[])]){
   assert.ok(w>0&&h>0&&x>=0&&y>=0&&x+w<=a.width&&y+h<=a.height);
  }
 }
});

test('a shared reference scale retains full poses and their registration without body stretching',()=>{
 for(const [atlas,a] of Object.entries(AUTHORED_MOTION_ATLASES))for(let frame=0;frame<a.frames.length;frame++){
  const c=recordingContext();assert.equal(drawAuthoredMotion(c,images,{atlas,frame},30,90,86,{flip:true}),true);
  assert.ok(c.calls.some(v=>v[0]==='scale'&&v[1]===-1&&v[2]===1));
  for(const [,img,sx,sy,sw,sh,dx,dy,dw,dh] of c.calls.filter(v=>v[0]==='draw')){
   assert.ok(Math.abs(dw/sw-86/a.referenceHeight)<1e-10);
   assert.ok(Math.abs(dh/sh-dw/sw)<1e-10);
   assert.ok(Math.abs(dx-(sx-a.frames[frame].anchor[0])*dw/sw)<1e-10);
   assert.ok(Math.abs(dy-(sy-a.frames[frame].anchor[1])*dh/sh)<1e-10);
  }
 }
});

test('prop fits are bottom-centered, preserve shape, and fail safely while loading',()=>{
 for(const id of Object.keys(AUTHORED_PROPS)){
  const c=recordingContext(),image={width:1774,height:887};
  assert.equal(drawAuthoredProp(c,image,id,50,200,120,170),true);
  const [rootX,rootY,rootW,rootH]=AUTHORED_PROPS[id].source,k=Math.min(120/rootW,170/rootH);
  for(const [,img,sx,sy,sw,sh,x,y,w,h] of c.calls){
   assert.ok(w<=120+1e-10&&h<=170+1e-10);assert.ok(Math.abs(w/sw-h/sh)<1e-10);
   assert.ok(Math.abs(x-(50-rootW*k/2+(sx-rootX)*k))<1e-10);
   assert.ok(Math.abs(y-(200-rootH*k+(sy-rootY)*k))<1e-10);
  }
  assert.equal(drawAuthoredProp(c,{...image,complete:false},id,50,200,120,170),false);
 }
 assert.equal(drawAuthoredMotion(recordingContext(),images,{atlas:'sable',frame:0},0,0,NaN),false);
 assert.equal(drawAuthoredMotion(recordingContext(),images,{atlas:'sable',frame:50},0,0,100),false);
});
