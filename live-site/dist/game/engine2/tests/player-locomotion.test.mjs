import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../world.js';
import {movementDelta,movePlayer,advanceRoute,TRAVEL_SPEED} from '../player-locomotion.js';

const close=(a,b,message='')=>assert.ok(Math.abs(a-b)<1e-8,message||`${a} ≠ ${b}`);
function world(floor=['....................']){
 return {state:{x:.5,y:.5,scene:1,mode:'field'},walkable(x,y){return floor[Math.floor(y)]?.[Math.floor(x)]==='.';},move:World.prototype.move};
}

test('manual diagonals, reversals and release preserve immediate movement at the faster speeds',()=>{
 for(const run of [false,true])for(const [dx,dy]of [[1,0],[-1,0],[1,1],[-1,-1],[0,-1]]){
  const p=movementDelta(dx,dy,1/60,{run}),speed=run?8.4:5.3;
  close(Math.hypot(p.x,p.y),speed/60);close(Math.hypot(p.intent.x,p.intent.y),1);
  const reverse=movementDelta(-dx,-dy,1/60,{run});close(reverse.x,-p.x);close(reverse.y,-p.y);
  const stopped=movementDelta(0,0,1/60,{run});assert.equal(stopped.moving,false);assert.deepEqual(stopped.intent,{x:0,y:0});close(stopped.x,0);close(stopped.y,0);
 }
 assert.deepEqual(TRAVEL_SPEED,{walk:5.3,run:8.4,route:5.3});
});

test('manual motion is invariant across normal refresh rates and ignores invalid elapsed time',()=>{
 for(const fps of [30,60,120,240]){
  let x=0,y=0;for(let i=0;i<fps*3;i++){const p=movementDelta(1,-1,1/fps,{run:true});x+=p.x;y+=p.y;}
  close(Math.hypot(x,y),8.4*3);
 }
 for(const dt of [-1,Infinity,NaN]){const p=movementDelta(1,0,dt);assert.equal(p.x,0);assert.equal(p.y,0);}
 assert.equal(movementDelta(NaN,1,.05).moving,false);
});

test('route movement spends the full frame budget through cardinal turns at every refresh rate',()=>{
 for(const fps of [30,60,120,240]){
  const w=world(['..........','..........','..........','..........']),path=[[1.5,.5],[2.5,.5],[2.5,1.5],[2.5,2.5],[3.5,2.5],[4.5,2.5]];
  let distance=0,arrival=0;
  for(let i=1;i<=fps*2&&path.length;i++){const r=advanceRoute(w,path,1/fps,{speed:4});distance+=r.distance;if(r.arrived)arrival=i/fps;}
  close(distance,6);close(arrival,1.5);close(w.state.x,4.5);close(w.state.y,2.5);assert.equal(path.length,0);
 }
});

test('ordinary routes cover 31.8 tiles in 6 seconds at every refresh rate, with an explicit fast route option',()=>{
 for(const speed of [undefined,7])for(const fps of [30,60,120,240]){
  const w=world(['.'.repeat(120)]),path=Array.from({length:100},(_,i)=>[i+1.5,.5]),rate=speed??5.3;
  let total=0,last;for(let i=0;i<fps*6;i++){last=advanceRoute(w,path,1/fps,speed===undefined?{}:{speed});total+=last.distance;}
  close(total,rate*6);close(w.state.x,.5+rate*6);assert.equal(path.length,100-Math.floor(rate*6));
  assert.equal(last.gait,speed===7?'run':'walk');
 }
});

test('small residual distance is travelled before turning, so corner geometry is respected',()=>{
 const w=world(['...','.##','...']);w.state.x=.5;w.state.y=.56;
 const path=[[.5,.5],[1.5,.5]],r=advanceRoute(w,path,.05,{speed:4}),positions=[];
 assert.equal(r.consumed,1);close(w.state.x,.64);close(w.state.y,.5);close(r.distance,.2);
 // The real movement writer cannot cut diagonally through the blocked centre.
 const q=world(['...','.#.','...']);q.state.x=.5;q.state.y=2.5;q.move=function(dx,dy){World.prototype.move.call(this,dx,dy);positions.push([this.state.x,this.state.y]);};
 const route=[[.5,1.5],[.5,.5],[1.5,.5],[2.5,.5]];
 while(route.length)advanceRoute(q,route,.05);
 for(const [x,y]of positions)assert.notEqual(Math.floor(x)+','+Math.floor(y),'1,1');
 close(q.state.x,2.5);close(q.state.y,.5);
});

test('a newly blocked waypoint stops the route without skipping to a reachable point behind it',()=>{
 const w=world(['.#.']),path=[[1.5,.5],[2.5,.5]];
 const r=advanceRoute(w,path,.1,{speed:20});assert.equal(r.blocked,true);assert.equal(r.arrived,false);assert.equal(path.length,2);assert.ok(w.state.x<1);close(r.distance,w.state.x-.5);
 assert.deepEqual(r.intent,{x:1,y:0});
 const sparse=world(['.#..']),distant=[[3.5,.5]],sweep=advanceRoute(sparse,distant,.1,{speed:40});assert.equal(sweep.blocked,true);assert.ok(sparse.state.x<1);assert.equal(distant.length,1);
});

test('a partial axis collision does not skip its vertex or spend the remaining budget elsewhere',()=>{
 const w=world(['..','.##']);w.state.x=.9;w.state.y=.5;const path=[[1.5,1.5],[.5,1.5]];
 const r=advanceRoute(w,path,.1,{speed:10});assert.equal(r.blocked,true);assert.equal(path.length,2);assert.ok(r.distance<1);assert.ok(w.state.y<1);assert.ok(w.walkable(w.state.x,w.state.y));
});

test('dialogue, battle, scene and state replacement interrupt stale routes without consuming them',()=>{
 for(const kind of ['mode','scene','state']){
  const w=world(),path=[[.6,.5],[1.5,.5]];
  w.move=function(dx,dy){World.prototype.move.call(this,dx,dy);if(kind==='mode')this.state.mode='battle';else if(kind==='scene')this.state.scene=2;else this.state={...this.state};};
  const r=advanceRoute(w,path,.1);assert.equal(r.interrupted,true);assert.equal(r.arrived,false);assert.equal(path.length,2);assert.equal(r.consumed,0);
 }
 for(const mode of ['dialog','battle','paused']){const w=world();w.state.mode=mode;const path=[[1.5,.5]],r=advanceRoute(w,path,.1);assert.equal(r.interrupted,true);close(w.state.x,.5);assert.equal(path.length,1);}
});


test('fast manual movement respects narrow walls even with a movement bonus',()=>{
 const w=world(['.#..']);
 const run=movementDelta(1,0,.1,{run:true});
 movePlayer(w,run.x*2,run.y);
 assert.ok(w.state.x<1);
 const open=world();
 movePlayer(open,run.x,run.y);
 close(open.state.x,.5+.84);
});
