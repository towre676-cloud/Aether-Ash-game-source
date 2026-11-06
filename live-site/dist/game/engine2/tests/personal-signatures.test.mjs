import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,makeEnemy} from '../battle.js';
import {defaultHero,personalTechnique,compileTechnique} from '../mako.js';
import {PERSONAL_SIGNATURES} from '../personal-signatures.js';
import {fieldCommand,validBattlefield} from '../battlefield.js';

const floor=Array.from({length:12},(_,y)=>Array.from({length:12},(_,x)=>[x,y])).flat();
function setup(ids=[0,1,2],field=true){
 const heroes=ids.map((id,i)=>Object.assign(defaultHero(id,12),{x:2.5+i*.5,y:4.5}));
 const enemy=Object.assign(makeEnemy('predator',12),{name:'Foe',x:5.5,y:4.5,hp:20000,maxHp:20000,armor:0,maxArmor:100});
 const b=new Battle({heroes,enemies:[enemy],context:{version:1,tags:[],walkable:floor,...(field?{fieldProps:[{type:'jar',x:2.5,y:4.5}]}:{})}});
 return {b,heroes,enemy};
}
function personal(b,h,target,rank=1){h.atb=1;h.mp=h.maxMp;h.strain=0;assert.equal(b.command(h.id,'tech',target.id,personalTechnique(h,rank,PERSONAL_SIGNATURES[h.id].name)),true);}

test('all seven heroes expose a distinct tactical signature only on their personal recipes',()=>{
 assert.equal(new Set(PERSONAL_SIGNATURES.map(s=>s.id)).size,7);
 for(let id=0;id<7;id++){
  const h=defaultHero(id);for(let rank=1;rank<=8;rank++)assert.equal(personalTechnique(h,rank,'Art').signatureId,PERSONAL_SIGNATURES[id].id);
  assert.equal(compileTechnique(h.loadout[0].core).signatureId,undefined);
 }
});

test('Sable passes a consumable opening to another crew member without rewarding self or secondary hits',()=>{
 const {b,heroes:[sable,iona],enemy:e}=setup();personal(b,sable,e);assert.ok(e.courierOpening);
 const before=sable.atb;b.damage(sable,e,5,{physical:true});assert.equal(sable.atb,before);assert.ok(e.courierOpening);
 iona.atb=0;b.damage(iona,e,5,{secondary:true});assert.equal(iona.atb,0);assert.ok(e.courierOpening);
 b.damage(iona,e,5,{physical:true});assert.equal(iona.atb,.35);assert.equal(e.courierOpening,undefined);
 b.damage(iona,e,5,{physical:true});assert.equal(iona.atb,.35);
 personal(b,sable,e);b.time+=9;b.damage(iona,e,5,{physical:true});assert.equal(iona.atb,.35,'expired openings cannot be claimed');
});

test('Iona treats one harmful condition and shields a patient who was critical before the heal',()=>{
 const {b,heroes:[iona,patient]}=setup([1,0]);patient.hp=patient.maxHp*.2;patient.status.shock=5;patient.status.slow=5;
 personal(b,iona,patient);assert.ok(patient.hp>patient.maxHp*.2);assert.equal(patient.status.shock,undefined);assert.equal(patient.status.slow,5);assert.ok(patient.status.shield>0);
 const shield=patient.status.shield;personal(b,iona,patient);assert.equal(patient.status.slow,undefined);assert.equal(patient.status.shield,shield,'healthy patients do not mint repeated critical shields');
});

test('Rook recovers one usable brace from armor and neither repeated casts nor restored saves duplicate it',()=>{
 const {b,heroes:[rook],enemy:e}=setup([2]);e.armor=100;const before=e.armor;personal(b,rook,e);
 assert.ok(e.armor<before);let props=b.field.props.filter(p=>p.id==='personal-brace-2');assert.equal(props.length,1);assert.equal(props[0].uses,2);assert.ok(validBattlefield(b.field,[...b.heroes,...b.enemies]));
 personal(b,rook,e);assert.equal(b.field.props.filter(p=>p.id==='personal-brace-2').length,1);
 const saved=b.snapshot();b.restore(saved);rook.atb=1;const brace=b.field.props.find(p=>p.id==='personal-brace-2');assert.equal(fieldCommand(b,rook,b.enemies[0],{action:'take',propId:brace.id}),true);
 rook.atb=1;assert.equal(fieldCommand(b,rook,b.enemies[0],{action:'cover'}),true);assert.equal(b.field.cover.length,1);
 personal(b,rook,b.enemies[0]);assert.equal(b.field.props.filter(p=>p.id==='personal-brace-2').length,1);
 const fallback=setup([2],false);fallback.enemy.armor=80;personal(fallback.b,fallback.heroes[0],fallback.enemy);assert.ok(fallback.heroes[0].status.shield>0);
});

test('Brass intercepts one nearby ally hit with actual HP transfer, but not distant, repeated or secondary hits',()=>{
 const {b,heroes:[brass,ally],enemy:e}=setup([3,0]);personal(b,brass,e);const hp=brass.hp,allyHP=ally.hp;
 b.damage(e,ally,100,{physical:true});assert.equal(hp-brass.hp,40);assert.equal(allyHP-ally.hp,60);assert.equal(brass.status.signatureCover,undefined);
 const later=brass.hp;b.damage(e,ally,50,{physical:true});assert.equal(brass.hp,later);
 personal(b,brass,e);ally.x=10.5;b.damage(e,ally,50,{physical:true});assert.ok(brass.status.signatureCover);assert.equal(brass.hp,later);
 ally.x=3;b.damage(e,ally,20,{secondary:true});assert.ok(brass.status.signatureCover);
});

test('Riven redistributes actual wet status and protects the dried crew, with a spatial limit',()=>{
 const {b,heroes:[riven,near,far],enemy:e}=setup([4,0,1]);near.status.wet=5;far.status.wet=5;far.x=10.5;
 personal(b,riven,e);assert.equal(near.status.wet,undefined);assert.ok(near.status.shield>0);assert.equal(far.status.wet,5);assert.equal(far.status.shield,undefined);assert.equal(e.status.wet,7);
 const shield=near.status.shield;personal(b,riven,e);assert.equal(near.status.shield,shield,'dry allies cannot be farmed for another water shield');
});

test('Mira transfers a foe’s actual haste and clears nearby slow without repeating the benefit on field ticks',()=>{
 const {b,heroes:[mira,ally],enemy:e}=setup([5,0]);e.status.haste=7;ally.status.slow=5;personal(b,mira,e);
 assert.equal(e.status.haste,undefined);assert.equal(ally.status.slow,undefined);assert.equal(mira.status.haste,4);assert.equal(ally.status.haste,4);
 ally.status.slow=3;e.status.haste=3;b.apply(mira,e,personalTechnique(mira,1,'Wind'),.65);
 assert.equal(ally.status.slow,3);assert.equal(e.status.haste,3,'a repeated payload does not repeat the personal action');
});

test('Veyr remembers one announced element for the next ordinary strike, and reads each charge only once',()=>{
 const {b,heroes:[veyr],enemy:e}=setup([6]);e.intent={kind:'strike',shape:'line',core:'volt',left:2,total:2,power:30,label:'Charge'};
 personal(b,veyr,e);assert.equal(veyr.personalState.borrowedCore,'volt');assert.equal(e.intent.left,2.6);personal(b,veyr,e);assert.equal(e.intent.left,2.6);
 const saved=b.snapshot();b.restore(saved);const target=b.enemies[0];target.status.wet=5;veyr.atb=1;b.command(veyr.id,'attack',target.id);assert.equal(veyr.personalState.borrowedCore,undefined);assert.equal(target.status.wet,undefined);assert.ok(b.events.some(event=>event.reaction==='conduct'));
});

test('failed commands do not spend or activate signatures, and malformed saved signature state is rejected',()=>{
 for(let id=0;id<7;id++){
  const {b,heroes:[h],enemy:e}=setup([id]);const before=JSON.stringify(b.snapshot());
  assert.equal(b.command(h.id,'tech',e.id,personalTechnique(h,1,'Art')),false);assert.equal(JSON.stringify(b.snapshot()),before);
 }
 const {b}=setup([6]),saved=b.snapshot();saved.heroes[0].personalState.borrowedCore='forged';assert.throws(()=>b.restore(saved),/saved creature/);
});
