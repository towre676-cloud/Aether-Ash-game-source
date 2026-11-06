import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,makeEnemy} from '../battle.js';
import {defaultHero,compileTechnique} from '../mako.js';
import {prepareEncounterTempo,roleOpeningPending,reportTacticalEvade,validEncounterTempo} from '../encounter-tempo.js';

const cells=Array.from({length:10},(_,y)=>Array.from({length:12},(_,x)=>[x,y])).flat();
const clone=value=>structuredClone(value);
const advance=(b,seconds)=>{for(let n=0;n<Math.round(seconds/.05);n++)b.advance(.05);};
function fixture({role='mender',marker=true,boss=false,context={},field=false}={}){
 const hero=Object.assign(defaultHero(0),{x:3.5,y:3.5}),enemy=Object.assign(makeEnemy(boss?'boss':role,1),{x:5,y:3.5,boss}),events=[];
 const b=new Battle({heroes:[hero],enemies:[enemy],rng:()=>.5,context:{version:1,tags:[],walkable:cells,engagement:{version:1},...(marker?{encounterTempo:{version:1}}:{}),...(field?{fieldProps:[{id:'loose',type:'bell',x:5,y:4.5}]}:{}),...context},onEvent:e=>events.push(e)});
 return {b,hero,enemy,events};
}
const results=events=>events.filter(e=>e.type==='tactical-result');
function firstIntent(b,e){for(let n=0;n<120&&!e.intent;n++)b.advance(.05);return e.intent;}

test('the first warning is role-specific and precedes optional tool collection',()=>{
 for(const [role,kind,earliest,latest]of [['mender','strike',.5,.65],['predator','strike',.65,.8],['guard','guard',.8,.95],['scout','alarm',1,1.15]]){
  const {b,enemy}=fixture({role,field:true}),before={hp:enemy.hp,maxHp:enemy.maxHp,power:enemy.power,armor:enemy.armor,speed:enemy.speed};
  const i=firstIntent(b,enemy);assert.equal(i.kind,kind,role);assert.ok(b.time>=earliest&&b.time<=latest,role+' '+b.time);
  assert.equal(enemy.encounterOpening,false);assert.deepEqual({hp:enemy.hp,maxHp:enemy.maxHp,power:enemy.power,armor:enemy.armor,speed:enemy.speed},before);
  if(kind==='strike')assert.ok(i.total>=1.65);if(role==='mender')assert.equal(i.label,'Porcelain pulse');
  enemy.intent=null;enemy.atb=1;b.planEnemy(enemy);assert.equal(enemy.intent.kind,'field-take','the next turn can still claim a tool');
 }
});

test('a mender repairs a wounded ally, and never spends its opening healing full HP',()=>{
 const full=fixture();assert.equal(firstIntent(full.b,full.enemy).kind,'strike');
 const {b,enemy}=fixture(),ally=Object.assign(makeEnemy('predator',1,1),{x:5,y:4.5,hp:20});b.enemies.push(ally);
 b.planEnemy(enemy);assert.equal(enemy.intent.kind,'repair');assert.equal(enemy.intent.target,ally.id);assert.equal(enemy.encounterOpening,false);
});

test('role openings approach through real floor even when a loose tool is nearby',()=>{
 const {b,hero,enemy}=fixture({field:true});hero.x=9.5;enemy.x=1.5;b.field.props[0].x=1.5;
 const start=enemy.x;advance(b,.5);assert.ok(enemy.x>start);assert.equal(enemy.intent,undefined);
 firstIntent(b,enemy);assert.equal(enemy.intent.kind,'strike');assert.ok(Math.hypot(enemy.x-hero.x,enemy.y-hero.y)<=1.91);
});

test('scouting still delays the first warning and extends its full readable tell',()=>{
 const plain=fixture(),prepared=fixture({context:{recon:{version:1,plan:'quiet',alarmSuppressed:true,enemyDelay:.8,points:[]}}});
 firstIntent(plain.b,plain.enemy);firstIntent(prepared.b,prepared.enemy);
 assert.ok(prepared.b.time>plain.b.time);assert.ok(Math.abs(prepared.enemy.intent.total-plain.enemy.intent.total-.8)<1e-8);
 const quiet=fixture({role:'scout',context:{recon:{version:1,plan:'quiet',alarmSuppressed:true,enemyDelay:.8,points:[]}}});assert.equal(firstIntent(quiet.b,quiet.enemy).kind,'strike');
});

test('guardian, objective, wild, friendly and tutorial openings keep their original readiness',()=>{
 for(const variant of [{boss:true},{context:{wild:true}},{context:{friendly:true}},{context:{tutorial:true}},{context:{objective:{kind:'signal',walkable:cells,asset:{x:7.5,y:3.5}}}}]){
  const {b,enemy}=fixture(variant);assert.equal(enemy.atb,.05);assert.equal(enemy.encounterOpening,undefined);assert.equal(roleOpeningPending(b,enemy),false);
 }
 const ecology=fixture();delete ecology.enemy.encounterOpening;ecology.enemy.atb=.05;ecology.b.ecology={enabled:true};assert.equal(prepareEncounterTempo(ecology.b),false);assert.equal(ecology.enemy.atb,.05);
});

test('saving before or during the first warning preserves the exact remaining timing',()=>{
 for(const seconds of [.35,.85]){
  const {b,enemy}=fixture();advance(b,seconds);const saved=b.snapshot(),restored=new Battle({heroes:clone(b.heroes),enemies:[]});restored.restore(clone(saved));
  assert.deepEqual(restored.snapshot(),saved);prepareEncounterTempo(restored);assert.equal(restored.enemies[0].atb,enemy.atb,'preparation cannot seed an actor twice');
  advance(b,.3);advance(restored,.3);assert.deepEqual(restored.snapshot(),b.snapshot());
 }
});

test('an unmarked old encounter retains the old tool-first action and receives no new response events',()=>{
 const {b,enemy,hero,events}=fixture({marker:false,field:true});assert.equal(enemy.atb,.05);assert.equal(enemy.encounterOpening,undefined);
 const i=firstIntent(b,enemy);assert.equal(i.kind,'field-take');assert.ok(b.time>3.5);
 hero.status.guard=4;b.damage(enemy,hero,30,{physical:true});assert.deepEqual(results(events),[]);
 const saved=b.snapshot(),restored=new Battle({heroes:clone(b.heroes),enemies:[]});restored.restore(saved);assert.equal(restored.context.encounterTempo,undefined);
});

test('Guard feedback requires actual hostile damage reduction, not just selecting Guard',()=>{
 const {b,hero,enemy,events}=fixture();hero.atb=1;assert.equal(b.command(hero.id,'guard',hero.id),true);assert.deepEqual(results(events),[]);
 const hp=hero.hp;b.damage(enemy,hero,30,{physical:true});const r=results(events);assert.equal(r.length,1);assert.equal(r[0].kind,'guard');assert.equal(r[0].actor,hero);assert.equal(r[0].source,enemy);assert.equal(r[0].amount,18);assert.equal(hp-hero.hp,12);
 b.damage(null,hero,5,{dot:true});b.damage(enemy,hero,5,{secondary:true});b.damage(hero,enemy,5,{physical:true});assert.equal(results(events).length,1);
});

test('an armor break is reported once for a surviving target and never for partial armor loss',()=>{
 const {b,hero,enemy,events}=fixture({role:'guard'});enemy.hp=enemy.maxHp=400;hero.atb=1;
 b.command(hero.id,'attack',enemy.id);assert.ok(enemy.armor>0);assert.equal(results(events).length,0);
 hero.atb=1;b.command(hero.id,'tech',enemy.id,compileTechnique('earth','break'));const r=results(events);assert.equal(enemy.armor,0);assert.equal(r.length,1);assert.equal(r[0].kind,'armor-break');assert.equal(r[0].actor,enemy);assert.equal(r[0].source,hero);
 hero.atb=1;b.command(hero.id,'attack',enemy.id);assert.equal(results(events).length,1);
 const killed=fixture({role:'guard'});killed.hero.atb=1;killed.enemy.hp=1;killed.b.command(killed.hero.id,'tech',killed.enemy.id,compileTechnique('earth','break'));assert.equal(killed.enemy.hp,0);assert.equal(results(killed.events).length,0);
});

test('ordinary strikes can produce the same armor-break feedback when they actually strip the last armor',()=>{
 const {b,hero,enemy,events}=fixture({role:'guard'});enemy.armor=1;enemy.hp=enemy.maxHp=400;hero.atb=1;
 b.command(hero.id,'attack',enemy.id);assert.equal(enemy.armor,0);assert.equal(results(events).filter(e=>e.kind==='armor-break').length,1);
});

test('evade feedback is tied to a threatened living hero leaving a locked mark',()=>{
 const {b,hero,enemy,events}=fixture();const i=firstIntent(b,enemy);assert.deepEqual(i.tacticalThreats,[hero.id]);
 const lock=clone(i);hero.y+=3;advance(b,i.left+.05);const r=results(events);assert.equal(r.length,1);assert.equal(r[0].kind,'evade');assert.equal(r[0].actor,hero);assert.equal(r[0].source,enemy);
 const cast=events.find(e=>e.type==='enemy-cast');assert.ok(cast);assert.equal(cast.targets.length,0);assert.deepEqual([cast.intent.x,cast.intent.y,cast.intent.fromX,cast.intent.fromY],[lock.x,lock.y,lock.fromX,lock.fromY]);
});

test('empty-ground misses, dead marked targets and partially hit formations are not reported as evades',()=>{
 const {b,hero,enemy,events}=fixture();b.event({type:'intent',actor:enemy,intent:{kind:'strike',shape:'burst',x:10,y:8,fromX:enemy.x,fromY:enemy.y,radius:1,power:20,left:2,total:2}});
 const empty=enemy.intent;assert.deepEqual(empty.tacticalThreats,[]);b.executeIntent(enemy,empty);assert.equal(results(events).length,0);
 const marked={...empty,tacticalThreats:[hero.id]};assert.equal(reportTacticalEvade(b,enemy,marked,[hero]),false);hero.hp=0;assert.equal(reportTacticalEvade(b,enemy,marked,[]),false);assert.equal(results(events).length,0);
});

test('interrupts still cancel the real charge and cannot generate an evade for an attack that never resolved',()=>{
 const {b,hero,enemy,events}=fixture();firstIntent(b,enemy);assert.equal(b.interrupt(enemy,hero),true);advance(b,2);
 assert.equal(events.filter(e=>e.type==='interrupt').length,1);assert.equal(events.filter(e=>e.type==='enemy-cast').length,0);assert.equal(results(events).length,0);
});

test('new optional save fields reject malformed state while old contexts remain accepted',()=>{
 const {b,enemy}=fixture();assert.equal(validEncounterTempo(b.context,b.enemies,b.heroes),true);assert.equal(validEncounterTempo({},b.enemies,b.heroes),true);
 assert.equal(validEncounterTempo({encounterTempo:{version:2}},b.enemies,b.heroes),false);
 enemy.encounterOpening='again';assert.equal(validEncounterTempo(b.context,b.enemies,b.heroes),false);enemy.encounterOpening=false;
 enemy.intent={left:1,tacticalThreats:['unknown']};assert.equal(validEncounterTempo(b.context,b.enemies,b.heroes),false);
 const saved=b.snapshot(),restored=new Battle({heroes:clone(b.heroes),enemies:[]});assert.throws(()=>restored.restore(saved),/opening is invalid/);
});
