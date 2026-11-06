import test from 'node:test';
import assert from 'node:assert/strict';
import {topologyCells,positionWalkable,clearPositionLine,previewDisplacement,displaceActor,crewSpread,positionActions,positionCommand,positionCollateralTargets} from '../combat-position.js';
function fixture(){
 const heroes=[{id:0,name:'Iona',hp:200,power:24,x:1.5,y:1.5,atb:1,status:{}}],enemies=[{id:'e0',name:'Charger',hp:200,x:3.5,y:1.5,atb:1,status:{}}],walkable=[];
 for(let y=0;y<8;y++)for(let x=0;x<8;x++)walkable.push([x,y]);
 return {heroes,enemies,context:{walkable},time:1,events:[],event(e){this.events.push(e);},damage(c,t,n){t.hp-=n;return {damage:n};}};
}
test('all compass angles use signed two-dimensional displacement with matching previews',()=>{
 for(let n=0;n<16;n++){const b=fixture(),h=b.heroes[0],e=b.enemies[0],a=n*Math.PI/8;h.x=3.5-Math.cos(a);h.y=3.5-Math.sin(a);e.x=e.y=3.5;const preview=previewDisplacement(b,h,e,{mode:'push',distance:1.5}),result=displaceActor(b,h,e,{mode:'push',distance:1.5});assert.ok(result.success);assert.ok(Math.abs(e.x-(3.5+Math.cos(a)*1.5))<.001);assert.ok(Math.abs(e.y-(3.5+Math.sin(a)*1.5))<.001);assert.deepEqual(result.to,preview.to);}
});
test('pulling approaches the caster but stops before actor overlap',()=>{
 const b=fixture(),h=b.heroes[0],e=b.enemies[0],p=previewDisplacement(b,h,e,{mode:'pull',distance:3});assert.equal(p.blocked,'actor');assert.equal(p.collisionId,h.id);assert.ok(p.to.x>h.x+.6);assert.equal(p.to.y,e.y);assert.ok(p.enabled);
});
test('known walls and diagonal corners stop movement without crossing a partition',()=>{
 const b=fixture(),h=b.heroes[0],e=b.enemies[0];b.context.walkable=[[1,1],[2,1],[3,1],[4,1]];const p=displaceActor(b,h,e,{mode:'push',distance:3});assert.equal(p.blocked,'wall');assert.ok(e.x<5);assert.ok(positionWalkable(b,e));
 const d=fixture();d.context.walkable=[[1,1],[2,2]];d.heroes[0].x=d.heroes[0].y=1.5;d.enemies[0].x=d.enemies[0].y=1.8;assert.equal(clearPositionLine(d,{x:1.5,y:1.5},{x:2.5,y:2.5}),false);assert.equal(previewDisplacement(d,d.heroes[0],d.enemies[0],{distance:2}).blocked,'wall');
});
test('no topology cannot invent legal floor, spend readiness or move a creature',()=>{
 const b=fixture(),h=b.heroes[0],e=b.enemies[0];delete b.context.walkable;const before={x:e.x,y:e.y};assert.deepEqual(topologyCells(b),[]);assert.equal(positionCommand(b,h,e,{action:'push'}),false);assert.equal(h.atb,1);assert.equal(previewDisplacement(b,h,e).blocked,'unknown');assert.equal(displaceActor(b,h,e).success,false);assert.deepEqual({x:e.x,y:e.y},before);assert.ok(positionActions(b,h,e).every(a=>!a.enabled&&a.reason));
});
test('objective topology is used safely and duplicate floor coordinates are normalized',()=>{
 const b=fixture();delete b.context.walkable;b.objective={walkable:[[1,1],[2,1],[3,1],[4,1],[4.1,1.2]]};assert.equal(topologyCells(b).length,4);assert.equal(clearPositionLine(b,b.heroes[0],b.enemies[0]),true);assert.equal(positionCommand(b,b.heroes[0],b.enemies[0],{action:'push'}),true);assert.equal(b.heroes[0].atb,0);
});
test('collisions damage both real actors once and interrupt no unrelated tools',()=>{
 const b=fixture(),h=b.heroes[0],e=b.enemies[0],other={id:'e1',name:'Guard',hp:120,x:4.5,y:1.5,status:{}};b.enemies.push(other);const preview=previewDisplacement(b,h,e);assert.equal(preview.blocked,'actor');assert.equal(preview.collisionId,other.id);assert.ok(preview.enabled);assert.equal(positionCommand(b,h,e,{action:'push'}),true);assert.equal(e.hp,195);assert.equal(other.hp,117);assert.equal(b.events.filter(x=>x.action==='collision').length,1);assert.ok(e.status.exposed);assert.equal(h.atb,0);
});
test('blocked, distant, unready, withdrawn and boss commands leave readiness intact',()=>{
 for(const change of [b=>b.enemies[0].boss=true,b=>b.enemies[0].withdrawn=true,b=>b.enemies[0].x=7.5,b=>{b.context.walkable=[[1,1],[3,1]];}]){const b=fixture();change(b);assert.equal(positionCommand(b,b.heroes[0],b.enemies[0],{action:'push'}),false);assert.equal(b.heroes[0].atb,1);}
 const b=fixture();b.heroes[0].atb=.5;assert.equal(positionCommand(b,b.heroes[0],b.enemies[0],{action:'pull'}),false);assert.equal(b.heroes[0].atb,.5);
});
test('displaced charged actors keep the aim and telegraph their changed origin',()=>{
 const b=fixture(),e=b.enemies[0];e.intent={kind:'strike',shape:'line',x:1.5,y:1.5,fromX:e.x,fromY:e.y};const oldAim={x:e.intent.x,y:e.intent.y};assert.ok(displaceActor(b,b.heroes[0],e).success);assert.equal(e.intent.fromX,e.x);assert.equal(e.intent.fromY,e.y);assert.equal(e.intent.positionShifted,true);assert.deepEqual({x:e.intent.x,y:e.intent.y},oldAim);assert.equal(e.positionedUntil,9);
});
test('friendly fire requires an actual redirected or repositioned line, clear floor and crossing',()=>{
 const b=fixture(),e=b.enemies[0],other={id:'e1',name:'Second creature',hp:100,x:2.5,y:1.5,status:{}};b.enemies.push(other);const i={kind:'strike',shape:'line',x:1.5,y:1.5,fromX:e.x,fromY:e.y};assert.deepEqual(positionCollateralTargets(b,e,i),[]);assert.deepEqual(positionCollateralTargets(b,e,{...i,instrumentDecoy:true}),[other]);assert.deepEqual(positionCollateralTargets(b,e,{...i,instrumentDecoy:true,shape:'burst'}),[]);other.y=3.5;assert.deepEqual(positionCollateralTargets(b,e,{...i,instrumentDecoy:true}),[]);other.y=1.5;b.context.walkable=[[1,1],[3,1]];assert.deepEqual(positionCollateralTargets(b,e,{...i,instrumentDecoy:true}),[]);
});

test('Spread finds a safe sideways route when the direct route away from a named partner is walled off',()=>{
 const b=fixture(),h=b.heroes[0],partner={id:1,name:'Sable',hp:200,x:6.3,y:3.5,atb:1,status:{}};h.x=h.y=3.5;b.heroes.push(partner);b.context.walkable=b.context.walkable.filter(([x])=>x>=3);b.enemies[0].intent={conduitCrew:[h.id,partner.id]};
 const p=crewSpread(b,h);assert.equal(p.enabled,true);assert.ok(p.preview.to.x>=3);assert.ok(Math.abs(p.preview.to.y-h.y)>2.5);assert.ok(p.preview.moved<=4.000001);assert.ok(clearPositionLine(b,h,p.preview.to));
 const otherBefore={x:partner.x,y:partner.y,hp:partner.hp},hp=h.hp;assert.equal(positionCommand(b,h,null,{action:'separate'}),true);assert.deepEqual({x:h.x,y:h.y},p.preview.to);assert.equal(h.atb,0);assert.equal(h.hp,hp);assert.deepEqual({x:partner.x,y:partner.y,hp:partner.hp},otherBefore);assert.ok(Math.hypot(h.x-partner.x,h.y-partner.y)>=4);assert.ok(b.events.some(e=>e.action==='separate'));
});

test('cramped or unknown floor explains the conduit alternative without spending or moving',()=>{
 for(const walkable of [[[1,1],[2,1],[3,1]],[]]){
  const b=fixture(),h=b.heroes[0],partner={id:1,name:'Sable',hp:200,x:2.5,y:1.5,atb:1,status:{}};b.heroes.push(partner);b.context.walkable=walkable;b.enemies[0].intent={conduitCrew:[h.id,partner.id]};
  const p=positionActions(b,h,b.enemies[0]).find(a=>a.action==='separate');assert.equal(p.enabled,false);assert.match(p.reason,/Break/);assert.match(p.reason,/Guard/);assert.equal(positionCommand(b,h,null,{action:'separate'}),false);assert.equal(h.atb,1);assert.deepEqual([h.x,h.y],[1.5,1.5]);
 }
 assert.equal(crewSpread(fixture(),undefined).enabled,false);assert.equal(crewSpread(null,null).enabled,false);
});
