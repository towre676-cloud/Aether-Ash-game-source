import test from 'node:test';
import assert from 'node:assert/strict';
import {characterPose,spriteFacingFlip,strideOffsets} from '../character-motion.js';
import {measureActorAnchors,atlasRegistration,registeredFit} from '../motion-realism.js';
test('walk and sprint use the coherent locomotion atlas in both directions',()=>{
 let p={x:0,y:0};p=characterPose(p,.04,0,1/60);assert.equal(p.gait,'walk');assert.ok(p.frame<=3);
 p=characterPose(p,.11,0,1/60);assert.equal(p.gait,'run');assert.ok(p.frame<=3);
 p=characterPose(p,.11,-.07,1/60);assert.equal(p.back,true);assert.ok(p.frame>=4&&p.frame<=7);
 p=characterPose(p,.11,-.07);assert.equal(p.moving,false);assert.equal(p.frame,5);
});
test('walk and sprint cadence follow distance at 30, 60, 120 and 144 fps',()=>{
 for(const speed of [2.65,4.2]){
  const poses=[30,60,120,144].map(fps=>{let p={x:0,y:0};for(let i=1;i<=fps;i++)p=characterPose(p,i*speed/fps,0,1/fps);return p;});
  for(const p of poses){assert.equal(p.gait,speed===2.65?'walk':'run');assert.ok(Math.abs(p.phase-poses[0].phase)<1e-10);assert.ok(Math.abs(p.lift-poses[0].lift)<1e-10);}
 }
});
test('stopping and teleports preserve orientation without a spurious stride',()=>{
 const p={x:1,y:1,facing:-1,back:true,phase:2.5};
 const q=characterPose(p,1,1);assert.equal(q.facing,-1);assert.equal(q.phase,2.5);
 assert.equal(characterPose(p,20,20).moving,false);
});
test('stride advance exposes this update before phase wrap and is zero without resolved travel',()=>{
 const old={x:0,y:0,phase:3.8,gait:'run'};
 const moving=characterPose(old,.1,0,1/60,{gait:'run'});
 assert.ok(Math.abs(moving.strideAdvance-.25)<1e-12);
 assert.ok(Math.abs(moving.phase-.05)<1e-12);
 for(const pose of [
  characterPose(moving,.1,0,1/60),
  characterPose(moving,.1,0,1/60,{intent:{x:-1,y:1},gait:'run'}),
  characterPose(moving,100,100,1/60),
 ]){
  assert.equal(pose.strideAdvance,0);assert.equal(pose.phase,moving.phase);
  assert.equal(pose.moving,false);
 }
});
test('body pivots ignore a long low sword extending beside the torso',()=>{
 const width=50,height=60,pixels=new Uint8ClampedArray(width*height*4);
 const dot=(x,y)=>pixels[(y*width+x)*4+3]=255;
 for(let y=5;y<50;y++)for(let x=20;x<35;x++)dot(x,y);
 for(let y=30;y<59;y++)dot(2,y);
 const [b]=measureActorAnchors(pixels,width,height,[{x:0,y:0,w:50,h:60}]);
 assert.equal(b.anchorY,50);assert.ok(b.anchorX>25&&b.anchorX<30);assert.equal(b.bodyHeight,45);
 const [r]=atlasRegistration([b],1,1),fit=registeredFit(b,r,60,100);
 assert.ok(Math.abs(fit.top+b.anchorY*60/45)<1e-10);assert.ok(Math.abs(fit.left+b.anchorX*60/45)<1e-10);
});
test('a running foot outside the torso band still defines the floor',()=>{
 const width=100,height=90,pixels=new Uint8ClampedArray(width*height*4),dot=(x,y)=>pixels[(y*width+x)*4+3]=255;
 for(let y=5;y<65;y++)for(let x=35;x<58;x++)dot(x,y);
 for(let y=60;y<85;y++)for(let x=75;x<92;x++)dot(x,y);
 for(let y=65;y<90;y++)dot(2,y);
 const [b]=measureActorAnchors(pixels,width,height,[{x:0,y:0,w:100,h:90}]);
 assert.equal(b.anchorY,85);assert.ok(b.anchorX>=35&&b.anchorX<=58);
});

test('front and rear walk cells retain heading for all seven crew members',()=>{
 for(const left of [false,true]){
  for(let row=0;row<7;row++)for(let col=0;col<8;col++){
   assert.equal(spriteFacingFlip('crew',col,left,row),col===1||col===5?!left:left);
   assert.equal(spriteFacingFlip('run',col,left,row),left);
  }
  for(let row=0;row<2;row++)for(let col=0;col<8;col++)assert.equal(spriteFacingFlip('starter',col,left,row),row===0&&col===5?!left:left);
 }
});
test('near vertical travel does not flip heading from tiny horizontal drift',()=>{
 let p={x:0,y:0,facing:1};
 for(let i=0;i<60;i++){p=characterPose(p,p.x+(i%2?-.0001:.0001),p.y+.04);assert.equal(p.facing,1);}
 p=characterPose(p,p.x-.04,p.y);assert.equal(p.facing,-1);
});
test('brief wall tangents keep the rear view but a sustained horizontal turn settles forward',()=>{
 for(const direction of [-1,1]){
  let p={x:0,y:0};p=characterPose(p,direction*.05,-.05);assert.equal(p.back,true);
  for(let i=0;i<3;i++){p=characterPose(p,p.x+direction*.05,p.y+(i%2?.0001:-.0001));assert.equal(p.back,true);}
  for(let i=0;i<4;i++)p=characterPose(p,p.x+direction*.05,p.y);
  assert.equal(p.back,false,'a horizontal turn must not remain rear-facing indefinitely');
  p=characterPose(p,p.x+direction*.05,p.y-.05);assert.equal(p.back,true);
  p=characterPose(p,p.x+direction*.05,p.y+.05);assert.equal(p.back,false);
 }
});
test('every compass direction selects the corresponding front or rear run family',()=>{
 for(const [dx,dy] of [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]){
  let p={x:0,y:0};for(let i=1;i<=16;i++){
   p=characterPose(p,p.x+dx*.07,p.y+dy*.07);assert.equal(p.gait,'run');
   assert.equal(p.back,dy<0);assert.equal(p.frame>=4,dy<0);
   if(dx)assert.equal(p.facing,Math.sign(dx));
  }
 }
});

test('requested heading resolves collision slides and deliberate turns without a stationary stride',()=>{
 let p={x:0,y:0};
 for(let i=0;i<20;i++)p=characterPose(p,p.x+.04,p.y,1/60,{intent:{x:1,y:-1},gait:'run'});
 assert.equal(p.back,true,'the clipped vertical component still describes the intended northward run');
 assert.equal(p.gait,'run');
 p=characterPose(p,p.x+.04,p.y,1/60,{intent:{x:1,y:0},gait:'run'});
 assert.equal(p.back,false,'a deliberate east turn changes the family immediately');
 const phase=p.phase;
 p=characterPose(p,p.x,p.y,1/60,{intent:{x:-1,y:-1},gait:'run'});
 assert.equal(p.moving,false);assert.equal(p.phase,phase);assert.equal(p.facing,-1);assert.equal(p.back,true);
 assert.equal(p.strideX,0);assert.equal(p.strideY,0);
});
test('all moving gaits keep one authored heading through every four-pose cycle',()=>{
 for(const gait of ['walk','run'])for(const north of [false,true]){
  let p={x:0,y:0},seen=new Set();
  for(let i=0;i<80;i++){
   p=characterPose(p,p.x-.03,p.y+(north?-.03:.03),1/60,{gait});seen.add(p.frame);
   assert.equal(p.facing,-1);assert.equal(p.back,north);
   assert.equal(spriteFacingFlip('run',p.frame,true,2),true,'legs never require a per-step mirror');
   assert.ok(p.crewFrame>=0&&p.crewFrame<8,'fallback remains in the legacy sheet');
  }
  assert.deepEqual([...seen].sort(),north?[4,5,6,7]:[0,1,2,3]);
 }
});
test('gait changes preserve leg phase and the speed deadband avoids flickering',()=>{
 let p={x:0,y:0};p=characterPose(p,.07,0,1/60);assert.equal(p.gait,'run');
 const phase=p.phase;
 p=characterPose(p,p.x+.055,p.y,1/60);assert.equal(p.gait,'run');assert.ok(p.phase>phase);
 p=characterPose(p,p.x+.05,p.y,1/60);assert.equal(p.gait,'walk');
 p=characterPose(p,p.x+.057,p.y,1/60);assert.equal(p.gait,'walk');
});
test('weight transfer is small, disappears on foot plants and respects reduced motion',()=>{
 for(const gait of ['walk','run'])for(let phase=0;phase<4;phase+=.05){
  const p={moving:true,gait,phase,speed:4.2,directionX:1/Math.sqrt(2),directionY:1/Math.sqrt(2)},v=strideOffsets(p);
  assert.ok(Math.abs(v.x)<=.55&&Math.abs(v.y)<=1.32);assert.ok(v.lift>=0&&v.lift<=1.15);
  assert.deepEqual(strideOffsets(p,{reducedMotion:true}),{x:0,y:0,lift:0,sway:0});
 }
 for(const phase of [0,2]){const v=strideOffsets({moving:true,gait:'run',phase,speed:4.2,directionX:1,directionY:0});assert.ok(Math.abs(v.y)<1e-10);}
 const p=characterPose({x:0,y:0},.07,.02,1/60,{reducedMotion:true});assert.equal(p.strideX,0);assert.equal(p.strideY,0);assert.equal(p.moving,true);
});

test('both feet keep a short planted baseline and walking settles longer than running',()=>{
 const offset=(gait,phase)=>strideOffsets({moving:true,gait,phase,speed:gait==='run'?4.2:2.65,directionX:.6,directionY:.8});
 for(const gait of ['walk','run'])for(const plant of [0,2,4])for(const delta of [-.1,0,.1]){
  assert.deepEqual(offset(gait,plant+delta),{x:0,y:0,lift:0,sway:0},`${gait} remains planted around ${plant}`);
 }
 assert.equal(offset('walk',.18).lift,0);
 assert.ok(offset('run',.18).lift>0,'the faster gait starts transferring weight sooner');
 for(const gait of ['walk','run']){
  const first=offset(gait,1),second=offset(gait,3);
  assert.ok(first.lift>0&&first.sway>0);assert.ok(second.sway<0);
  assert.ok(Math.abs(first.lift-second.lift)<1e-12,'both feet have the same lift');
  assert.ok(Math.abs(first.sway+second.sway)<1e-12,'weight transfers to alternate sides');
  assert.equal(first.lift,gait==='run'?1.15:.38,'the existing peak lift is retained');
 }
});

test('weight leaves and reaches the planted stance without a velocity snap',()=>{
 const epsilon=1e-5;
 for(const [gait,stance,speed] of [['walk',.24,2.65],['run',.12,4.2]]){
  const offset=phase=>strideOffsets({moving:true,gait,phase,speed,directionX:.6,directionY:.8});
  for(const boundary of [stance,2-stance,2+stance,4-stance]){
   const before=offset(boundary-epsilon),at=offset(boundary),after=offset(boundary+epsilon);
   for(const axis of ['x','y','lift','sway']){
    assert.ok(Math.abs(at[axis])<1e-12,`${gait} ${axis} reaches the baseline`);
    assert.ok(Math.abs((at[axis]-before[axis])/epsilon)<.0001,`${gait} ${axis} arrives smoothly`);
    assert.ok(Math.abs((after[axis]-at[axis])/epsilon)<.0001,`${gait} ${axis} leaves smoothly`);
   }
  }
 }
});

test('weight transfer leaves travel, turning and the footfall clock identical in reduced motion',()=>{
 let normal={x:0,y:0},quiet={...normal};
 const withoutTransfer=({strideX,strideY,lift,sway,...pose})=>pose;
 for(const [x,y,intent,gait] of [
  [.04,0,{x:1,y:0},'walk'],[.08,0,{x:1,y:-1},'walk'],
  [.08,0,{x:-1,y:-1},'run'],[.03,-.05,{x:-1,y:-1},'run'],
  [-.02,-.05,{x:-1,y:0},'run'],[-.02,-.05,null,'walk'],
  [20,20,null,'walk'],[20.04,20,{x:1,y:0},'walk']
 ]){
  normal=characterPose(normal,x,y,1/60,{intent,gait});
  quiet=characterPose(quiet,x,y,1/60,{intent,gait,reducedMotion:true});
  assert.deepEqual(withoutTransfer(normal),withoutTransfer(quiet));
  assert.deepEqual([quiet.strideX,quiet.strideY,quiet.lift,quiet.sway],[0,0,0,0]);
  assert.deepEqual([normal.x,normal.y],[x,y]);
 }
});
