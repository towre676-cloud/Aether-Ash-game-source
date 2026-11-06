import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,makeEnemy} from '../battle.js';
import {defaultHero,compileTechnique} from '../mako.js';
import {cityAnswerContext,cityAnswerIncoming} from '../city-answer.js';
const fullState={chapter:24,party:[0,1,2],answeringNetwork:{version:1,works:['water-return','heat-independent','relays-distinct','assembly-return'],heard:[]},economy:{districts:{1:{works:['water']}}}};
function setup(state={},chapter=24,extra={}){
 const heroes=[0,1,2].map(id=>Object.assign(defaultHero(id,20),{x:8.5+id*.5,y:10.5,hp:2000,maxHp:2000}));
 const enemy=Object.assign(makeEnemy('boss',chapter,0,true),{x:10.5,y:10.5,name:'Choir',hp:20000,maxHp:20000});
 const b=new Battle({chapter,heroes,enemies:[enemy],context:{version:1,tags:[],cityAnswer:cityAnswerContext(state),...extra}});return {b,heroes,enemy};
}
const ready=h=>{h.atb=1;h.mp=h.maxMp;h.strain=0;};
const breakWith=(b,e,h)=>{ready(h);assert.equal(b.command(h.id,'tech',e.id,compileTechnique('earth','break',{character:h.id})),true);};
const answer=(b,e,heroes)=>{breakWith(b,e,heroes[0]);ready(heroes[1]);assert.equal(b.command(heroes[1].id,'attack',e.id),true);};

test('the first real Choir warning gains one bounded return pause that survives a pending save',()=>{
 const plain=setup(),help=setup(fullState);plain.b.planEnemy(plain.enemy);help.b.planEnemy(help.enemy);assert.ok(Math.abs(help.enemy.intent.left-plain.enemy.intent.left-1.2)<1e-9);assert.match(help.enemy.intent.counterplay,/1.2 extra seconds/);
 const snapshot=help.b.snapshot(),copy=setup();copy.b.restore(snapshot);copy.enemy=copy.b.enemies[0];assert.equal(copy.enemy.intent.left,help.enemy.intent.left);
 for(const f of [plain,copy]){f.enemy.intent=null;f.b.planEnemy(f.enemy);}assert.equal(copy.enemy.intent.left,plain.enemy.intent.left);assert.equal(help.b.events.filter(e=>e.type==='city-answer'&&e.contribution==='return').length,1);
});

test('community care halves one direct Choir hit per crew member, never DOT, secondary, zero or nonliving targets',()=>{
 const {b,heroes:[h,ally],enemy:e}=setup(fullState);const hp=h.hp;
 assert.equal(cityAnswerIncoming(b,e,h,0),0);assert.equal(cityAnswerIncoming(b,e,h,-4),-4);h.hp=0;assert.equal(cityAnswerIncoming(b,e,h,100),100);h.hp=hp;
 b.damage(e,h,100,{secondary:true});b.damage(e,h,10,{dot:true});assert.equal(b.context.cityAnswer.careUsed,undefined);
 const before=h.hp;b.damage(e,h,100);assert.equal(before-h.hp,50);b.damage(e,h,100);assert.equal(before-h.hp,150);
 const allyHP=ally.hp;b.damage(e,ally,100);assert.equal(allyHP-ally.hp,50);assert.deepEqual(b.context.cityAnswer.careUsed,[h.id,ally.id]);
 const saved=b.snapshot();b.restore(saved);const prior=h.hp;b.damage(b.enemies[0],h,100);assert.equal(prior-h.hp,100,'restoring does not replenish a used shelter');
});

test('a witnessed opening still requires two different living crew voices and is longer only once',()=>{
 const {b,heroes,enemy:e}=setup(fullState);b.planEnemy(e);breakWith(b,e,heroes[0]);const held=e.intent;
 b.damage(heroes[0],e,10,{core:'flame'});b.damage(heroes[1],e,10,{core:'earth'});b.damage(heroes[1],e,10,{core:'flame',dot:true});assert.equal(e.intent,held);assert.ok(!b.context.cityAnswer.used.includes('witness'));
 const saved=b.snapshot();b.restore(saved);const target=b.enemies[0];ready(heroes[1]);b.command(heroes[1].id,'attack',target.id);assert.equal(target.intent,null);assert.equal(target.status.stagger,5);assert.equal(target.status.exposed,5);
 b.planEnemy(target);answer(b,target,heroes);assert.equal(target.status.stagger,3);assert.equal(target.status.exposed,3);
});

test('the first paid Guard creates one shared respite and cannot be retriggered by save restoration',()=>{
 const {b,heroes,enemy:e}=setup(fullState);for(const h of heroes){h.atb=.5;h.mp=0;h.strain=40;}
 assert.equal(b.command(0,'guard'),false);assert.equal(b.context.cityAnswer.used,undefined);
 heroes[0].atb=1;assert.equal(b.command(0,'guard'),true);assert.equal(heroes[0].atb,0);assert.deepEqual(heroes.map(h=>h.mp),[11,6,6]);assert.deepEqual(heroes.map(h=>h.strain),[10,32,32]);
 const saved=b.snapshot();b.restore(saved);heroes[1].atb=1;b.command(1,'guard');assert.deepEqual(heroes.map(h=>h.mp),[11,11,6]);assert.equal(b.events.filter(e=>e.type==='city-answer'&&e.contribution==='commons').length,1);
});

test('missing contributions preserve the ordinary final encounter and other chapters cannot consume city help',()=>{
 const a=setup(),z=setup();delete z.b.context.cityAnswer;a.b.planEnemy(a.enemy);z.b.planEnemy(z.enemy);assert.deepEqual(a.enemy.intent,z.enemy.intent);answer(a.b,a.enemy,a.heroes);assert.equal(a.enemy.status.stagger,3);
 for(const [chapter,extra] of [[4,{}],[8,{}],[16,{}],[24,{friendly:true}],[24,{tutorial:true}]]){const {b,heroes:[h],enemy:e}=setup(fullState,chapter,extra);b.planEnemy(e);ready(h);b.command(h.id,'guard');const hp=h.hp;delete h.status.guard;b.damage(e,h,100);assert.equal(hp-h.hp,100);assert.equal(b.context.cityAnswer.used,undefined);assert.equal(b.context.cityAnswer.careUsed,undefined);assert.equal(b.events.filter(e=>e.type==='city-answer').length,0);}
});

test('invalid city state is rejected before an imported battle can alter its actors; older snapshots restore',()=>{
 const {b,enemy:e}=setup(fullState);b.planEnemy(e);const good=b.snapshot(),bad=JSON.parse(JSON.stringify(good));bad.context.cityAnswer.used=['return','return'];const hp=b.heroes[0].hp;bad.heroes[0].hp=1;
 assert.throws(()=>b.restore(bad),/saved city answer/);assert.equal(b.heroes[0].hp,hp);
 const old=JSON.parse(JSON.stringify(good));delete old.context.cityAnswer;assert.doesNotThrow(()=>b.restore(old));assert.equal(b.chapter,24);
});
