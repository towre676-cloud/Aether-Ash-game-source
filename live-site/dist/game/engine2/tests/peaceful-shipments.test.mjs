import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,makeEnemy} from '../battle.js';
import {defaultHero} from '../mako.js';
import {settleCreatureMemory} from '../creature-ecology.js';
import {economyState,acceptShipment,deliverShipment,securePeacefulShipment,validateEconomy} from '../economy.js';
import {actualWildDrops} from '../wild-combat.js';
import {cityAnswerContext} from '../city-answer.js';

function journey(){
 const s={chapter:2,mode:'field',gold:200,xp:40,items:{tonic:3,ether:2},heroes:[defaultHero(0,8)]};economyState(s).goods.fiber=4;assert.ok(acceptShipment(s,2));return s;
}
function encounter(s,serial=1,region=2){
 const h=s.heroes[0];h.x=2.5;h.y=3.5;
 const e=Object.assign(makeEnemy('predator',2),{name:'Moon moth',family:'moonmoth',species:'moonmoth-region-0',x:3.5,y:3.5});
 const walkable=Array.from({length:7},(_,y)=>Array.from({length:10},(_,x)=>[x,y])).flat();
 const b=new Battle({heroes:[h],enemies:[e],chapter:region,inventory:s.items,context:{version:1,wild:true,chapter:region,location:200+region,key:'field',encounterSerial:serial,walkable,creatureMemory:s.creatureMemory}});s.mode='battle';return {b,h,e};
}
function peaceful(s,serial=1,region=2){const f=encounter(s,serial,region);f.h.atb=1;assert.ok(f.b.command(f.h.id,'ecology',f.e.id,{action:'soothe'}));f.b.advance(.1);assert.equal(f.b.ended,'win');assert.ok(f.e.hp>0&&f.e.withdrawn);return f;}

test('real peaceful passage protects carried local cargo without minting bodies, goods, money or XP',()=>{
 const s=journey(),before=JSON.stringify({goods:s.economy.goods,items:s.items,gold:s.gold,xp:s.xp}),{b,e}=peaceful(s);
 const settled=settleCreatureMemory(s,b,'win');assert.equal(settled.withdrawn,1);assert.equal(s.economy.shipments[0].protected,1);
 assert.equal(JSON.stringify({goods:s.economy.goods,items:s.items,gold:s.gold,xp:s.xp}),before);assert.deepEqual(actualWildDrops({defeatedSpecies:b.enemies.filter(a=>a.hp<=0).map(a=>a.species)}),[]);
 assert.equal(s.creatureMemory.individuals[0].lastOutcome,'peaceful');assert.ok(e.hp>0);assert.ok(b.events.some(event=>event.type==='city-answer'&&event.action==='peaceful-passage'));
 assert.ok(validateEconomy(s));
});

test('each passage counts once across saves; two different resolved roads can complete the existing delivery',()=>{
 const s=journey(),first=peaceful(s);settleCreatureMemory(s,first.b,'win');assert.equal(settleCreatureMemory(s,first.b,'win').recorded,false);assert.equal(s.economy.shipments[0].protected,1);
 const saved=JSON.parse(JSON.stringify(s));assert.equal(securePeacefulShipment(saved,first.b,'win'),null);assert.equal(saved.economy.shipments[0].protected,1);
 const second=peaceful(saved,2);settleCreatureMemory(saved,second.b,'win');assert.equal(saved.economy.shipments[0].protected,2);assert.equal(securePeacefulShipment(saved,second.b,'win'),null);
 saved.mode='field';const id=saved.economy.shipments[0].id;assert.ok(deliverShipment(saved,1,id));assert.equal(deliverShipment(saved,1,id),false);assert.ok(cityAnswerContext(saved).contributions.some(c=>c.id==='commons'&&c.sources.includes('delivery:'+id)));
});

test('an unfinished objective, a defeat, a different district and borrowed histories cannot claim safe cargo passage',()=>{
 for(const kind of ['unfinished','loss','distant','trial','past']){
  const s=journey();let f;
  if(kind==='unfinished'){f=encounter(s);f.b.finish('win');}
  else{f=peaceful(s,1,kind==='distant'?6:2);if(kind==='loss')f.b.ended='loss';}
  if(kind==='trial')s.fieldOrigins={active:{}};if(kind==='past')s.chronicle={phase:'past'};
  settleCreatureMemory(s,f.b,kind==='loss'?'loss':'win');assert.equal(s.economy.shipments[0].protected,0,kind);assert.ok(!s.economy.claims.some(id=>id.startsWith('peaceful:')),kind);
 }
});

test('a creature harmed by the crew or a death prevents this peaceful delivery claim',()=>{
 for(const dead of [false,true]){
  const s=journey(),f=peaceful(s);const r=f.b.ecology.creatures[0];r.injuredByHero=true;r.harmCount=1;if(dead)f.e.hp=0;
  settleCreatureMemory(s,f.b,'win');assert.equal(s.economy.shipments[0].protected,0);assert.equal(securePeacefulShipment(s,f.b,'win'),null);
 }
});

test('a remembered peaceful creature and a route name alone cannot retroactively protect a new shipment',()=>{
 const s=journey(),f=peaceful(s);const cargo=s.economy.shipments;s.economy.shipments=[];settleCreatureMemory(s,f.b,'win');s.economy.shipments=cargo;
 assert.equal(settleCreatureMemory(s,f.b,'win').recorded,false);assert.equal(securePeacefulShipment(s,f.b,'win'),null);assert.equal(s.economy.shipments[0].protected,0);
 const unrelated=encounter(s,2);unrelated.b.finish('win');settleCreatureMemory(s,unrelated.b,'win');assert.equal(s.economy.shipments[0].protected,0);
});
