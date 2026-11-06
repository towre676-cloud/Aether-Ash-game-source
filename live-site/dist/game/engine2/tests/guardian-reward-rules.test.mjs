import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,makeEnemy} from '../battle.js';
import {defaultHero,personalTechnique} from '../mako.js';
import {BOSS_GEAR,claimBossGear,equipBossGear,syncBossGear} from '../boss-gear.js';
import {patternHits} from '../boss-patterns.js';

function setup(chapter,id=0){
 const heroes=[id,id===1?0:1].map((hero,index)=>Object.assign(defaultHero(hero,15),{x:2.5+index*5,y:4.5}));
 const state={chapter:24,heroes,party:heroes.map(h=>h.id),recruited:heroes.map(h=>h.id),bosses:[],mode:'field'};claimBossGear(state,chapter);assert.equal(equipBossGear(state,id,'guardian-'+chapter),true);
 const enemy=Object.assign(makeEnemy('predator',15),{name:'Foe',x:5.5,y:4.5,hp:20000,maxHp:20000,armor:0});
 const b=new Battle({heroes,enemies:[enemy]});return {b,heroes,enemy,state};
}
const ready=h=>{h.atb=1;h.mp=h.maxMp;h.strain=0;};

test('selected guardian rewards expose their learned rules and old gear sync gains identity without stacking stats',()=>{
 for(const chapter of [4,8,16,24])assert.ok(BOSS_GEAR[chapter-1].rule?.detail);
 const {state,heroes:[h]}=setup(4);const stats=[h.maxHp,h.maxMp,h.power,h.magic];h.guardianTraits=h.guardianTraits.map(({core,era})=>({core,era}));syncBossGear(state);
 assert.equal(h.guardianTraits[0].id,'guardian-4');assert.deepEqual([h.maxHp,h.maxMp,h.power,h.magic],stats);
});

test('Rainbell carries the learned Guard answer into ordinary fights once per Guard and never recurses',()=>{
 const {b,heroes:[h],enemy:e}=setup(4);ready(h);b.command(h.id,'guard');const hp=h.hp,enemyHP=e.hp;
 b.damage(e,h,100,{core:'flame'});assert.equal(hp-h.hp,40);assert.equal(enemyHP-e.hp,50);assert.equal(h.status.rainbellListening,undefined);
 const after=e.hp;b.damage(e,h,100,{core:'flame'});assert.equal(e.hp,after);ready(h);b.command(h.id,'guard');b.damage(e,h,100,{secondary:true});assert.ok(h.status.rainbellListening,'secondary hits cannot consume or recurse a return');
});

test('Crownless Lens turns separation into a single ally protection instead of a passive stat increase',()=>{
 const {b,heroes:[h,ally],enemy:e}=setup(8);ready(h);b.command(h.id,'guard');assert.equal(ally.status.conduitShelter,7);
 const hp=ally.hp;b.damage(e,ally,100,{physical:true});assert.equal(hp-ally.hp,50);assert.equal(ally.status.conduitShelter,undefined);
 ally.x=h.x+.5;ready(h);b.command(h.id,'guard');assert.equal(ally.status.conduitShelter,undefined,'nearby allies do not meet the split-conduit rule');
});

test('Mountain Rest removes actual area geometry once per encounter and survives save restore',()=>{
 const {b,heroes:[h],enemy:e}=setup(16);e.intent={kind:'strike',shape:'cross',x:e.x,y:e.y,reach:4.5,width:.8,left:3,total:3,power:40,label:'Cross'};
 assert.equal(patternHits(e.intent,{x:e.x+3,y:e.y}),true);ready(h);b.command(h.id,'tech',e.id,personalTechnique(h,1,'Art'));
 assert.equal(e.intent.shape,'burst');assert.equal(patternHits(e.intent,{x:e.x+3,y:e.y}),false);assert.equal(patternHits(e.intent,{x:e.x+.5,y:e.y}),true);assert.equal(e.intent.power,40);
 const saved=b.snapshot();b.restore(saved);const target=b.enemies[0];target.intent={kind:'strike',shape:'cross',x:target.x,y:target.y,reach:4.5,width:.8,left:3,total:3,power:40,label:'Next cross'};ready(h);b.command(h.id,'tech',target.id,personalTechnique(h,1,'Art'));assert.equal(target.intent.shape,'cross');
});

test('Unfinished Circle restores resources only after a different crew member answers differently',()=>{
 const {b,heroes:[h,ally],enemy:e}=setup(24);ready(h);b.command(h.id,'tech',e.id,personalTechnique(h,1,'Art'));const mp=h.mp;ally.mp=5;
 b.damage(h,e,5,{core:'flame'});assert.equal(h.mp,mp);b.damage(ally,e,5,{core:'gale'});assert.equal(h.mp,mp);
 b.damage(ally,e,5,{physical:true});assert.equal(h.mp,Math.min(h.maxMp,mp+4));assert.equal(ally.mp,9);assert.equal(e.gearAnswer,undefined);
 b.damage(ally,e,5,{physical:true});assert.equal(ally.mp,9);
});
