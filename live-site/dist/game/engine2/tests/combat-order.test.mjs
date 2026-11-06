import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,makeEnemy} from '../battle.js?v=5.24.0';
import {defaultHero,compileTechnique} from '../mako.js?v=5.16.0';
import {createCombatOrders,combatRoute} from '../combat-order.js?v=5.24.0';
import {commandReach} from '../combat-engagement.js?v=5.24.0';
import {techniquePreview} from '../technique-preview.js?v=5.24.0';

function fixture({walls=[],distance=6,legacy=false}={}){
 const floor=Array.from({length:9},(_,y)=>Array.from({length:12},(_,x)=>x&&y&&x<11&&y<8&&!walls.some(p=>p[0]===x&&p[1]===y)?'.':'#').join(''));
 const world={scene:{width:12,height:9,floor},state:{mode:'battle',scene:'test'},walkable(x,y){return this.scene.floor[Math.floor(y)]?.[Math.floor(x)]==='.';}};
 const cells=[];for(let y=0;y<9;y++)for(let x=0;x<12;x++)if(world.walkable(x+.5,y+.5))cells.push([x,y]);
 const hero=defaultHero(0,4),enemy=makeEnemy('predator',4);hero.x=1.5;hero.y=4.5;enemy.x=1.5+distance;enemy.y=4.5;enemy.hp=enemy.maxHp=2000;
 const battle=new Battle({heroes:[hero],enemies:[enemy],context:legacy?{}:{engagement:{version:1,walkCells:cells}}});enemy.status.stagger=100;
 let actions=0;const notices=[],orders=createCombatOrders({onExecute(){actions++;},onNotice:text=>notices.push(text)});
 return {world,battle,hero,enemy,orders,notices,get actions(){return actions;}};
}
function frames(f,count=100){for(let i=0;i<count;i++){f.battle.advance(.05);f.orders.step(f.battle,f.world,.05);}}

test('a command chosen while charging is accepted and executes exactly once when ready',()=>{
 const f=fixture({distance:2}),mp=f.hero.mp;assert.equal(f.orders.request(f.battle,f.world,f.hero,'attack',f.enemy),true);
 f.orders.step(f.battle,f.world,.05);assert.equal(f.orders.pending.phase,'charging');assert.equal(f.actions,0);
 frames(f);assert.equal(f.actions,1);assert.equal(f.orders.pending,null);assert.equal(f.hero.mp,mp);assert.ok(f.enemy.hp<f.enemy.maxHp);
});
test('a remote strike approaches through actual floor before paying or landing',()=>{
 const f=fixture();f.hero.atb=1;const hp=f.enemy.hp,start=f.hero.x;
 f.orders.request(f.battle,f.world,f.hero,'attack',f.enemy);f.orders.step(f.battle,f.world,.05);
 assert.equal(f.enemy.hp,hp);assert.equal(f.hero.atb,1);assert.ok(Math.hypot(f.hero.x-start,f.hero.y-4.5)<=.14);
 for(let i=0;i<100&&!f.actions;i++){f.orders.step(f.battle,f.world,.05);assert.ok(f.world.walkable(f.hero.x,f.hero.y));}
 assert.equal(f.actions,1);assert.ok(commandReach(f.battle,f.hero,f.enemy,'attack').inRange);assert.equal(f.hero.atb,0);
});
test('approach navigates around walls without cutting blocked cells',()=>{
 const f=fixture({walls:[[4,2],[4,3],[4,4],[4,5]]});f.hero.atb=1;
 f.orders.request(f.battle,f.world,f.hero,'attack',f.enemy);
 for(let i=0;i<180&&!f.actions;i++){f.orders.step(f.battle,f.world,.05);assert.ok(f.world.walkable(f.hero.x,f.hero.y));}
 assert.equal(f.actions,1);assert.equal(f.notices.length,0);
});
test('manual cancellation stops movement and cannot release a delayed attack',()=>{
 const f=fixture();f.hero.atb=1;f.orders.request(f.battle,f.world,f.hero,'attack',f.enemy);f.orders.step(f.battle,f.world,.1);f.orders.manual();
 const position=[f.hero.x,f.hero.y];frames(f);assert.deepEqual([f.hero.x,f.hero.y],position);assert.equal(f.actions,0);assert.equal(f.hero.atb,1);
});
test('decision pause freezes a pending approach and its expiry',()=>{
 const f=fixture();f.orders.request(f.battle,f.world,f.hero,'attack',f.enemy);const position=[f.hero.x,f.hero.y];
 for(let i=0;i<300;i++)f.orders.step(f.battle,f.world,.05,{paused:true});
 assert.deepEqual([f.hero.x,f.hero.y],position);assert.equal(f.orders.pending.age,0);frames(f);assert.equal(f.actions,1);
});
test('ground movement spends no readiness, MP or attack and does not move a companion',()=>{
 const f=fixture(),other=defaultHero(1);other.x=2.5;other.y=3.5;f.battle.heroes.push(other);f.hero.atb=.8;
 const mp=f.hero.mp,otherPosition=[other.x,other.y];f.orders.request(f.battle,f.world,f.hero,'move',null,null,{point:{x:3.5,y:5.5}});
 for(let i=0;i<100&&f.orders.pending;i++)f.orders.step(f.battle,f.world,.05);
 assert.equal(f.orders.pending,null);assert.ok(Math.hypot(f.hero.x-3.5,f.hero.y-5.5)<.13);assert.equal(f.hero.atb,.8);assert.equal(f.hero.mp,mp);assert.equal(f.actions,0);assert.deepEqual([other.x,other.y],otherPosition);
});
test('an inaccessible approach cancels visibly without consuming the action',()=>{
 const f=fixture({walls:Array.from({length:7},(_,i)=>[4,i+1])});f.hero.atb=1;f.orders.request(f.battle,f.world,f.hero,'attack',f.enemy);
 for(let i=0;i<30;i++)f.orders.step(f.battle,f.world,.05);
 assert.equal(f.orders.pending,null);assert.equal(f.actions,0);assert.equal(f.hero.atb,1);assert.match(f.notices[0],/No clear approach/);
 assert.equal(combatRoute(f.world,f.hero,{x:8.5,y:4.5}),null);
});
test('a queued technique rechecks payment and never overdraws after circumstances change',()=>{
 const f=fixture({distance:2}),tech=compileTechnique('earth');assert.equal(techniquePreview(f.battle,f.hero,tech,{allowCharging:true}).enabled,true);
 f.orders.request(f.battle,f.world,f.hero,'tech',f.enemy,tech);f.hero.mp=0;f.hero.hp=1;f.hero.strain=100;f.hero.atb=1;
 f.orders.step(f.battle,f.world,.05);assert.equal(f.actions,0);assert.equal(f.hero.mp,0);assert.equal(f.hero.hp,1);assert.equal(f.hero.atb,1);assert.equal(f.orders.pending,null);
});
test('a replaced battle, restored world or defeated target invalidates the delayed command',()=>{
 for(const change of [f=>f.battle={...f.battle},f=>f.world.state={...f.world.state},f=>f.enemy.hp=0]){
  const f=fixture();f.orders.request(f.battle,f.world,f.hero,'attack',f.enemy);change(f);f.orders.step(f.battle,f.world,.05);assert.equal(f.orders.pending,null);assert.equal(f.actions,0);
 }
});
test('Auto attack uses the same approach and respects manual takeover',()=>{
 const f=fixture();f.hero.atb=1;f.orders.automatic(f.battle,f.world,f.enemy.id);assert.equal(f.orders.pending.automatic,true);
 f.orders.manual();f.orders.automatic(f.battle,f.world,f.enemy.id);assert.equal(f.orders.pending,null);
 for(let i=0;i<100&&!f.actions;i++){f.orders.step(f.battle,f.world,.05);f.orders.automatic(f.battle,f.world,f.enemy.id);}
 assert.equal(f.actions,1);assert.ok(f.hero.x>1.5);
});
test('legacy encounters still accept their original geometry-free attacks',()=>{
 const f=fixture({legacy:true});f.hero.atb=1;f.orders.request(f.battle,f.world,f.hero,'attack',f.enemy);f.orders.step(f.battle,f.world,0);
 assert.equal(f.actions,1);assert.equal(f.hero.x,1.5);
});
