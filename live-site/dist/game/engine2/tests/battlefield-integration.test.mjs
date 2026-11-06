import test from 'node:test';
import assert from 'node:assert/strict';
import {source} from './opening-flow.mjs';
import {World} from '../world.js';
import {Battle,makeEnemy} from '../battle.js?v=5.6.0';
import {defaultHero} from '../mako.js';
import {ORIGINS} from '../origin-content.js?v=5.6.0';
import {originLocation} from '../origins.js?v=5.6.0';
import {combatContext} from '../combat-reactions.js';
import {battlefieldContext} from '../battlefield-context.js';
import {fieldGear,validBattlefield} from '../battlefield.js';
import {buildWildEnemies,wildPositions} from '../wild-combat.js';
import {encounterProfile} from '../field-encounters.js';
import {validateSave} from '../save-validation.js?v=5.6.0';

const clone=value=>JSON.parse(JSON.stringify(value));
function originWorld(w,origin,part=0){
 w.newGame({originId:origin.id});w.state.scene=originLocation(origin.id,part);w.state.mode='field';
 [w.state.x,w.state.y]=w.scene.arrive.map(n=>n+.5);
 return w;
}
function wildBattle(w,serial=1){
 const object={type:'wild',randomEncounter:true,habitat:encounterProfile(w.scene,w.state).habitat||'meadow',tier:1,count:1,serial,seed:serial*997,xy:[Math.floor(w.state.x),Math.floor(w.state.y)]};
 const enemies=buildWildEnemies(w,object),spots=wildPositions(w.scene,w.state.x,w.state.y,enemies.length);
 enemies.forEach((e,i)=>{e.x=spots[i][0]+.5;e.y=spots[i][1]+.5;});
 w.activeHeroes.forEach(h=>{h.x=w.state.x;h.y=w.state.y;});
 const context=battlefieldContext(w,object,{...combatContext(w),encounterSerial:serial,encounterKey:'wild',reinforcementLimit:0});
 const battle=new Battle({heroes:w.activeHeroes,enemies,chapter:1,context});
 return {battle,object,context};
}
function basicFight(b){
 let actions=0;
 for(let frame=0;frame<3000&&!b.ended;frame++){
  const h=b.heroes[0],enemy=b.livingEnemies[0];
  if(h.atb>=1&&enemy)b.command(h.id,actions++%3===2?'guard':'attack',enemy.id);
  b.advance(.1);
 }
 assert.equal(b.ended,'win',b.heroes[0].name+' versus '+b.enemies[0].name);
 assert.ok(b.heroes[0].hp>0);assert.equal(b.reinforcements,0);
}
function toolsBattle(types=['hook','plank'],heroCount=1){
 const heroes=Array.from({length:heroCount},(_,id)=>({...defaultHero(id),x:0,y:id*.3}));
 const e=makeEnemy('predator',1);Object.assign(e,{x:2.5,y:0,hp:1000,maxHp:1000});
 const battle=new Battle({heroes,enemies:[e],chapter:1,context:{wild:true,encounterSerial:2,reinforcementLimit:0,fieldProps:types.map((type,i)=>({type,x:1+i*.2,y:0,source:'test workstation tools'}))}});
 return {battle,h:heroes[0],e};
}

test('all fourteen origin backdrops source finite tools on real floor, while canonical bosses retain their optional empty field',()=>{
 const w=new World(source);
 for(const origin of ORIGINS)for(const part of [0,1]){
  originWorld(w,origin,part);
  const before=clone(w.scene.objects),context=battlefieldContext(w,{type:'wild'},combatContext(w));
  assert.equal(context.wild,true);assert.ok(context.fieldProps.length>=2&&context.fieldProps.length<=6,origin.id);
  for(const p of context.fieldProps){assert.equal(w.scene.floor[Math.floor(p.y)]?.[Math.floor(p.x)],'.',origin.id+' '+p.type);assert.ok(p.source);}
  assert.deepEqual(w.scene.objects,before,'Sourcing tools must preserve scenery and story objects');
  const bossContext=battlefieldContext(w,{type:'boss'},combatContext(w));
  const boss=makeEnemy('boss',1,0,true),hero=defaultHero(origin.hero);hero.x=w.state.x;hero.y=w.state.y;boss.x=hero.x+2;boss.y=hero.y;
  const b=new Battle({heroes:[hero],enemies:[boss],chapter:1,context:bossContext});
  assert.equal(b.field.enabled,false);assert.deepEqual(b.field.props,[]);
 }
});

test('every actual origin lead can beat a first wild fight with its real scene, tool pool and nonlinear material shell',()=>{
 const w=new World(source);
 for(const origin of ORIGINS){
  originWorld(w,origin,origin.hero===0?1:0);
  const {battle,context}=wildBattle(w);
  assert.equal(context.wild,true);assert.equal(battle.field.enabled,true);
  assert.ok(battle.enemies[0].shell,origin.id+' should expose local material shielding');
  assert.ok(fieldGear(battle,battle.enemies[0]),origin.id+' should demonstrate one carried tool');
  assert.ok(validBattlefield(battle.field,[...battle.heroes,...battle.enemies]));
  basicFight(battle);
 }
});

test('Battle commands disarm and reclaim the same finite tool; invalid range spends no action',()=>{
 const {battle:b,h,e}=toolsBattle(['hook']);const p=fieldGear(b,e);assert.ok(p);
 e.intent={kind:'strike',shape:'line',left:.2,total:1,power:20};h.atb=1;h.x=-20;
 assert.equal(b.command(h.id,'field',e.id,{action:'disarm',propId:p.id}),false);assert.equal(h.atb,1);assert.equal(p.ownerId,e.id);
 h.x=0;assert.equal(b.command(h.id,'field',e.id,{action:'disarm',propId:p.id}),true);
 assert.equal(e.intent,null);assert.ok(e.status.exposed);assert.equal(p.ownerId,null);assert.equal(h.atb,0);
 h.atb=1;assert.equal(b.command(h.id,'field',e.id,{action:'take',propId:p.id}),true);
 assert.equal(p.ownerId,h.id);assert.equal(fieldGear(b,e),null);assert.equal(fieldGear(b,h),p);assert.equal(b.field.props.length,1);
 h.atb=1;assert.equal(b.command(h.id,'attack',e.id),true);assert.equal(p.uses,p.maxUses-1);
});

test('snapshot and Battle.restore preserve carried tools, spent uses and finite directional cover',()=>{
 const {battle:b,h,e}=toolsBattle(['hook','plank']);
 const carried=fieldGear(b,e),brace=b.field.props.find(p=>p.type==='plank');
 if(carried===brace){h.atb=1;assert.ok(b.command(h.id,'field',e.id,{action:'disarm'}));}
 h.atb=1;assert.ok(b.command(h.id,'field',e.id,{action:'take',propId:brace.id}));h.atb=1;
 assert.ok(b.command(h.id,'field',e.id,{action:'cover',propId:brace.id}));
 const snapshot=b.snapshot(),copy=new Battle({heroes:[defaultHero(h.id)],enemies:[],chapter:1});copy.restore(snapshot);
 assert.deepEqual(copy.field,b.field);assert.equal(copy.field.cover[0].integrity,1);assert.ok(validBattlefield(copy.field,[...copy.heroes,...copy.enemies]));
 const target=copy.heroes[0],attacker=copy.enemies[0],hp=target.hp;
 const intent={kind:'strike',shape:'single',target:target.id,x:target.x,y:target.y,fromX:attacker.x,fromY:attacker.y,power:20};
 copy.executeIntent(attacker,intent);assert.equal(target.hp,hp);assert.equal(copy.field.cover[0].integrity,0);
 copy.executeIntent(attacker,intent);assert.ok(target.hp<hp,'Spent cover cannot block a second attack');
});

test('enhanced-save preflight rejects orphan battlefield ownership before active state changes',()=>{
 const w=new World(source);originWorld(w,ORIGINS[1]);const {battle:b,object}=wildBattle(w);
 w.state.mode='battle';
 const value={schema:'ash-aether.enhanced-save/1',world:JSON.parse(w.save()),battle:b.snapshot(),origin:{scene:w.scene.location,type:'wild',practice:clone(object)}};
 const beforeImport=JSON.stringify(value),checked=validateSave(source,value);assert.notEqual(checked,value);assert.deepEqual(checked,value);assert.equal(JSON.stringify(value),beforeImport);
 const bad=clone(value),prop=bad.battle.field.props.find(p=>p.ownerId!==null);assert.ok(prop);prop.ownerId='missing-creature';
 const before=w.save();assert.throws(()=>validateSave(source,bad),/battlefield tools/);assert.equal(w.save(),before);
});

test('actual multi-target and missed enemy swings each consume one tool use per planned intent',()=>{
 const {battle:b,h,e}=toolsBattle(['coil'],2),p=fieldGear(b,e);assert.ok(p);h.x=0;h.y=0;b.heroes[1].x=0;b.heroes[1].y=.2;
 e.x=4;e.y=0;e.atb=1;b.planEnemy(e);const first=e.intent;assert.equal(first.fieldPropId,p.id);
 first.shape='line';first.x=0;first.y=0;first.fromX=e.x;first.fromY=e.y;
 const before=b.heroes.map(a=>a.hp);b.executeIntent(e,first);
 assert.equal(p.uses,1);b.heroes.forEach((a,i)=>assert.ok(a.hp<before[i]));
 e.intent=null;e.atb=1;b.planEnemy(e);const miss=e.intent;assert.equal(miss.fieldPropId,p.id);
 miss.shape='line';miss.x=4;miss.y=10;miss.fromX=4;miss.fromY=0;
 const hp=b.heroes.map(a=>a.hp);b.executeIntent(e,miss);
 assert.equal(p.uses,0);assert.equal(fieldGear(b,e),null);assert.deepEqual(b.heroes.map(a=>a.hp),hp);
});

test('guard interception depends on a nearby formation rather than protecting the entire scene',()=>{
 const h=defaultHero(0),target=makeEnemy('predator',1),guard=makeEnemy('guard',1,1);
 Object.assign(h,{x:0,y:0});Object.assign(target,{x:2,y:0,hp:500,maxHp:500});Object.assign(guard,{x:20,y:20,hp:500,maxHp:500});
 const b=new Battle({heroes:[h],enemies:[target,guard],chapter:1});h.atb=1;
 assert.ok(b.command(h.id,'attack',target.id));assert.ok(target.hp<500);assert.equal(guard.hp,500);
 target.hp=500;guard.x=target.x+1;guard.y=target.y;h.atb=1;
 assert.ok(b.command(h.id,'attack',target.id));assert.equal(target.hp,500);assert.ok(guard.hp<500);
});
