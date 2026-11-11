import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,makeEnemy,encounterEnemies} from '../battle.js';
import {defaultHero,compileTechnique} from '../mako.js';
import {commandReach,approachForCommand,advanceEnemyEngagement,engagementIntent,reinforcementPosition} from '../combat-engagement.js';
import {patternGeometry} from '../boss-patterns.js';
import {World} from '../world.js';
import {source} from './opening-flow.mjs';
import {findPath} from '../navigation.js';
import {combatContext} from '../combat-reactions.js';
import {battlefieldContext} from '../battlefield-context.js';
import {livingEncounterContext} from '../living-world.js';

const rectangle=(w=16,h=8)=>Array.from({length:w*h},(_,n)=>[n%w,Math.floor(n/w)]);
function setup({cells=rectangle(),marker=true,chapter=1,boss=false}={}){
 const hero=Object.assign(defaultHero(0),{x:1.5,y:1.5}),enemy=Object.assign(makeEnemy(boss?'boss':'predator',chapter,0,boss),{x:7.5,y:1.5});
 const context={version:1,tags:[],walkable:cells,...(marker?{engagement:{version:1,walkCells:cells}}:{})};
 const battle=new Battle({heroes:[hero],enemies:[enemy],chapter,context,rng:()=>.5});hero.atb=1;
 return {battle,hero,enemy};
}
const resources=h=>JSON.stringify([h.hp,h.mp,h.atb,h.ap,h.strain,h.personalState,h.counter]);
const advance=(b,seconds)=>{for(let t=0;t<seconds-1e-8;t+=.05)b.advance(.05);};

test('out-of-reach attacks and spells reject before consuming any readiness or resources',()=>{
 const {battle,hero,enemy}=setup();let before=resources(hero),hp=enemy.hp;
 assert.deepEqual(commandReach(battle,hero,enemy,'attack'),{enabled:true,reach:2.6,inRange:false,clear:true,reason:'Move within 2.6 tiles to strike.'});
 assert.equal(battle.command(hero.id,'attack',enemy.id),false);assert.equal(resources(hero),before);assert.equal(enemy.hp,hp);
 enemy.x=12.5;const spell=compileTechnique('flame');before=resources(hero);assert.equal(battle.command(hero.id,'tech',enemy.id,spell),false);assert.equal(resources(hero),before);assert.equal(enemy.hp,hp);
 enemy.x=9.4;assert.equal(commandReach(battle,hero,enemy,'tech',spell).inRange,true);assert.equal(battle.command(hero.id,'tech',enemy.id,spell),true);assert.ok(enemy.hp<hp);
});

test('walls and diagonal corners block strikes and Mako, and the approach goes around them',()=>{
 const cells=rectangle(10,7).filter(([x,y])=>x!==3||y>=4),{battle,hero,enemy}=setup({cells});enemy.x=5.5;
 const quote=commandReach(battle,hero,enemy,'tech',compileTechnique('flame'));assert.equal(quote.inRange,true);assert.equal(quote.clear,false);
 const before=resources(hero);assert.equal(battle.command(hero.id,'tech',enemy.id,compileTechnique('flame')),false);assert.equal(resources(hero),before);
 const goal=approachForCommand(battle,hero,enemy,'attack');assert.ok(goal);assert.ok(goal.x>3);assert.ok(cells.some(([x,y])=>x===Math.floor(goal.x)&&y===Math.floor(goal.y)));
 Object.assign(hero,goal);const reached=commandReach(battle,hero,enemy,'attack');assert.equal(reached.inRange,true);assert.equal(reached.clear,true);
 const corner=setup({cells:[[0,0],[1,1]]});Object.assign(corner.hero,{x:.5,y:.5});Object.assign(corner.enemy,{x:1.5,y:1.5});assert.equal(commandReach(corner.battle,corner.hero,corner.enemy,'attack').clear,false);assert.equal(approachForCommand(corner.battle,corner.hero,corner.enemy,'attack'),null);
});

test('an intercepting guard is the same physical target for the quote, approach and paid strike',()=>{
 const {battle,hero,enemy}=setup();enemy.x=3.5;const guard=Object.assign(makeEnemy('guard',1,1),{x:5.2,y:1.5});battle.enemies.push(guard);
 assert.equal(commandReach(battle,hero,enemy,'attack').inRange,false);
 const goal=approachForCommand(battle,hero,enemy,'attack');assert.ok(goal);Object.assign(hero,goal);
 const hp=enemy.hp,guardHP=guard.hp;assert.equal(battle.command(hero.id,'attack',enemy.id),true);assert.equal(enemy.hp,hp);assert.ok(guard.hp<guardHP);
});

test('healing, guard, counters and partner-paid Links retain their established targeting rules',()=>{
 const {battle,hero,enemy}=setup();enemy.x=13.5;
 const ally=Object.assign(defaultHero(1),{x:13.5,y:3.5,hp:40,atb:1,status:{}});battle.heroes.push(ally);
 const heal=compileTechnique('mend');assert.equal(commandReach(battle,hero,ally,'tech',heal).enabled,false);assert.equal(battle.command(hero.id,'tech',ally.id,heal),true);assert.ok(ally.hp>40);
 hero.atb=1;assert.equal(battle.command(hero.id,'guard',hero.id),true);
 hero.atb=1;assert.equal(battle.command(hero.id,'tech',enemy.id,compileTechnique('earth','counter')),true);assert.ok(hero.counter);
 hero.atb=1;assert.equal(commandReach(battle,hero,enemy,'tech',compileTechnique('earth','link')).enabled,false);assert.equal(battle.command(hero.id,'tech',enemy.id,compileTechnique('earth','link')),true);assert.equal(ally.atb,0);
});

test('ordinary enemies close on real floor, then lock both their body and warning until release',()=>{
 const {battle,hero,enemy}=setup();Object.assign(hero,{x:11.5,y:1.5,atb:0});Object.assign(enemy,{x:1.5,y:1.5});
 let closing=false;for(let n=0;n<160&&!enemy.intent;n++){battle.advance(.05);closing ||= !!enemy.engagement?.closing;assert.ok(battle.context.walkable.some(([x,y])=>x===Math.floor(enemy.x)&&y===Math.floor(enemy.y)));}
 assert.ok(closing);assert.ok(enemy.x>5);assert.ok(enemy.intent);assert.equal(enemy.intent.engagementStrike,true);assert.equal(enemy.intent.radius,1.05);
 const locked=JSON.stringify([enemy.x,enemy.y,enemy.intent.x,enemy.intent.y,enemy.intent.fromX,enemy.intent.fromY]);hero.y=5.5;advance(battle,.4);
 assert.equal(JSON.stringify([enemy.x,enemy.y,enemy.intent.x,enemy.intent.y,enemy.intent.fromX,enemy.intent.fromY]),locked);
});

test('the new small pounce has the same painted and hit-tested radius and cannot hit a distant target',()=>{
 const {battle,hero,enemy}=setup();Object.assign(enemy,{x:2.5,y:2.5});Object.assign(hero,{x:12.5,y:2.5});
 battle.planEnemy(enemy);const intent=enemy.intent;assert.equal(intent.shape,'burst');assert.equal(intent.radius,1.05);assert.ok(Math.hypot(intent.x-enemy.x,intent.y-enemy.y)<=2.4+.00001);
 assert.deepEqual(patternGeometry(intent),[{kind:'circle',x:intent.x,y:intent.y,radius:1.05}]);
 assert.equal(battle.intentHits(enemy,intent,hero),false);
 assert.equal(battle.intentHits(enemy,intent,{...hero,x:intent.x,y:intent.y+.99}),true);
 assert.equal(battle.intentHits(enemy,intent,{...hero,x:intent.x,y:intent.y+1.06}),false);
 const hp=hero.hp;battle.executeIntent(enemy,intent);assert.equal(hero.hp,hp);
});

test('pursuit routes around solid cells and never moves a recovering guardian',()=>{
 const cells=rectangle(13,8).filter(([x,y])=>x!==5||y>=5),{battle,hero,enemy}=setup({cells,boss:true});Object.assign(hero,{x:10.5,y:1.5});Object.assign(enemy,{x:2.5,y:1.5});
 enemy.status.stagger=2;advance(battle,1);assert.equal(enemy.x,2.5);assert.equal(enemy.y,1.5);enemy.status={};
 const visited=[];for(let n=0;n<260&&!enemy.intent;n++){battle.advance(.05);visited.push([enemy.x,enemy.y]);assert.ok(cells.some(([x,y])=>x===Math.floor(enemy.x)&&y===Math.floor(enemy.y)));}
 assert.ok(visited.some(([,y])=>y>=5));assert.ok(enemy.x>5);assert.ok(enemy.intent);assert.equal(enemy.intent.engagementStrike,undefined);
});

test('objectives, peaceful motives, and accessible loose-tool claims keep their movement priority',()=>{
 for(const priority of ['objective','ecology','tool']){
  const {battle,hero,enemy}=setup();const start=[enemy.x,enemy.y];
  if(priority==='objective')battle.objective={complete:false,failed:false};
  if(priority==='ecology')battle.ecology={enabled:true,creatures:[{actorId:enemy.id,motive:'frightened',grudge:0}]};
  if(priority==='tool')battle.field={enabled:true,props:[{x:enemy.x,y:enemy.y,type:'plank',ownerId:null,condition:'loose',uses:2}]};
  advanceEnemyEngagement(battle,.1);assert.deepEqual([enemy.x,enemy.y],start);assert.equal(enemy.engagement.closing,false,priority);
 }
});

test('full runtime floor replaces the local capture without entering saves or creating an edge trap',()=>{
 const {battle,hero,enemy}=setup({cells:rectangle(4,4)});battle.engagementFloor=rectangle(40,20);
 Object.assign(hero,{x:35.5,y:15.5});Object.assign(enemy,{x:37.5,y:15.5});assert.equal(commandReach(battle,hero,enemy,'attack').clear,true);
 const saved=battle.snapshot();assert.equal('engagementFloor' in saved,false);assert.equal(saved.context.engagement.walkCells.length,16);
 const restored=new Battle({heroes:[structuredClone(hero)],enemies:[]});restored.restore(saved);restored.engagementFloor=battle.engagementFloor;
 assert.equal(commandReach(restored,restored.heroes[0],restored.enemies[0],'attack').clear,true);assert.equal(restored.command(hero.id,'attack',enemy.id),true);
});

test('legacy snapshots without an engagement marker preserve original range and enemy positions',()=>{
 const {battle,hero,enemy}=setup({marker:false});const initial=[enemy.x,enemy.y];
 assert.equal(commandReach(battle,hero,enemy,'attack').enabled,false);assert.equal(battle.command(hero.id,'attack',enemy.id),true);advance(battle,1);assert.deepEqual([enemy.x,enemy.y],initial);
 const intent={kind:'strike',shape:'single',x:hero.x,y:hero.y};assert.equal(engagementIntent(battle,enemy,intent),intent);
 const saved=battle.snapshot(),restored=new Battle({heroes:[structuredClone(hero)],enemies:[]});restored.restore(saved);restored.engagementFloor=rectangle();
 assert.equal(commandReach(restored,restored.heroes[0],restored.enemies[0],'attack').enabled,false);
});

test('reinforcement placement stays on connected floor and preserves unmarked legacy spawns',()=>{
 const {battle,hero,enemy}=setup({cells:[[0,0],[0,1],[0,2],[2,1]]});Object.assign(enemy,{x:.5,y:.5});Object.assign(hero,{x:.5,y:2.5});
 assert.deepEqual(reinforcementPosition(battle,enemy,{x:2.5,y:1.5}),{x:.5,y:1.5},'a nearer disconnected island cannot receive an entrance');
 const legacy=setup({marker:false});const preferred={x:legacy.enemy.x+1,y:legacy.enemy.y+1};legacy.battle.executeIntent(legacy.enemy,{kind:'alarm'});
 assert.deepEqual({x:legacy.battle.enemies.at(-1).x,y:legacy.battle.enemies.at(-1).y},preferred);
});

test('Letter Attic and Storm Anchorage reinforcements enter distinct reachable cells and can be struck',()=>{
 const world=new World(source);
 for(const location of [359,149]){
  const scene=world.scenes.get(location),object=scene.objects.find(o=>o.type==='boss');world.state.scene=location;world.state.chapter=scene.chapter;
  const pos=findPath(scene,(scene.arrive||object.xy).map(n=>n+.5),object.xy,1).at(-1);assert.ok(pos);
  world.state.x=pos[0];world.state.y=pos[1];
  const heroes=[0,1,2].map((id,i)=>Object.assign(defaultHero(id,20),{x:pos[0]+(i===1?-.9:i===2?.9:0),y:pos[1]+(i?.7:0)}));
  const enemies=encounterEnemies(scene.chapter,true,object.enemies?.length||2);enemies.forEach((e,i)=>Object.assign(e,{x:object.xy[0]+.5+(i%2)*1.3,y:object.xy[1]+.5+Math.floor(i/2)*1.4}));
  const context={...livingEncounterContext(world,object,battlefieldContext(world,object,combatContext(world))),engagement:{version:1},reinforcementLimit:2};
  const battle=new Battle({heroes,enemies,chapter:scene.chapter,context,rng:()=>.5});battle.engagementFloor=[];
  for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++)if(world.walkable(x+.5,y+.5))battle.engagementFloor.push([x,y]);
  for(const actor of [...heroes,...enemies])if(!world.walkable(actor.x,actor.y)){
   const cell=battle.engagementFloor.reduce((best,p)=>!best||Math.hypot(p[0]+.5-actor.x,p[1]+.5-actor.y)<Math.hypot(best[0]+.5-actor.x,best[1]+.5-actor.y)?p:best,null);Object.assign(actor,{x:cell[0]+.5,y:cell[1]+.5});
  }
  const scout=enemies.find(e=>e.role==='scout');assert.ok(scout);assert.equal(world.walkable(scout.x+1,scout.y+1),false,'reproduces the original invalid entrance');
  for(let n=0;n<2;n++){
   const occupied=new Set([...heroes,...battle.livingEnemies].map(a=>Math.floor(a.x)+','+Math.floor(a.y)));battle.executeIntent(scout,{kind:'alarm'});
   const reinforcement=battle.enemies.at(-1);assert.equal(world.walkable(reinforcement.x,reinforcement.y),true);assert.equal(occupied.has(Math.floor(reinforcement.x)+','+Math.floor(reinforcement.y)),false);
   const approach=approachForCommand(battle,heroes[0],reinforcement,'attack');assert.ok(approach,'the new enemy has a connected approach');Object.assign(heroes[0],approach,{atb:1});
   const hp=reinforcement.hp;assert.equal(battle.command(heroes[0].id,'attack',reinforcement.id),true);assert.ok(reinforcement.hp<hp);
  }
  assert.equal(battle.reinforcements,2);
 }
});


test('the Wireback locks its charge lane and exposes its shell only on a miss',()=>{
 for(const dodge of [true,false]){
  const {battle,hero,enemy}=setup();
  battle.context.openingWireback=true;
  battle.planEnemy(enemy);
  const intent=enemy.intent;
  assert.equal(intent.label,'Wireback charge');
  assert.equal(intent.shape,'line');
  assert.equal(intent.total,1.9);
  const hp=hero.hp;
  if(dodge)hero.y+=2;
  battle.executeIntent(enemy,intent);
  assert.equal(battle.events.some(event=>event.type==='wireback-opening'),dodge);
  assert.equal(!!enemy.status.exposed,dodge);
  if(dodge)assert.equal(hero.hp,hp);
  else assert.ok(hero.hp<hp);
 }
});
