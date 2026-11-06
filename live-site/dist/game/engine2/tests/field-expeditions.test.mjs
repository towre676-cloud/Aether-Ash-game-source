import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultHero} from '../mako.js';
import {economyState,encounterSalvage} from '../economy.js';
import {expeditionState,recordExpeditionVictory,validateExpeditions,expeditionObjects,interactExpedition,recoverAtExpedition,refineExpeditionCore} from '../field-expeditions.js';

function fixture(){
 const scene={location:101,chapter:1,key:'forest',width:18,height:14,floor:Array.from({length:14},(_,y)=>y===0||y===13?'##################':'#................#'),doors:[{xy:[1,6]}],objects:[]};
 const heroes=Array.from({length:7},(_,id)=>({...defaultHero(id),loadout:[{core:'flame',support:'focus'}],ap:{flame:0}}));
 const w={scene,mission:{id:1},state:{scene:101,chapter:1,mode:'field',x:4.5,y:6.5,heroes,party:[0,1],recruited:[0,1],items:{},flags:{},gold:0},walkable(x,y){return scene.floor[Math.floor(y)]?.[Math.floor(x)]==='.';},text(t){this.lastText=t;},choose(t,choices){this.lastText=t;this.choices=choices;}};
 return w;
}
const victory=(w,serial,core='tide')=>recordExpeditionVictory(w,{scene:w.state.scene,mission:w.mission,object:{type:'wild',serial,salvageCore:core}});
function approach(w){const o=expeditionObjects(w)[0];assert.ok(o);w.state.x=o.xy[0]+.5;w.state.y=o.xy[1]+.5;return o;}
function unlock(w){for(let serial=1;serial<=3;serial++)victory(w,serial);return approach(w);}

test('three real resolutions turn the same damaged site into a usable refuge',()=>{
 const w=fixture(),first=expeditionObjects(w)[0];assert.equal(first.ready,false);assert.equal(first.wins,0);
 const a=victory(w,1),b=victory(w,2),c=victory(w,3);assert.equal(a.refugeUnlocked,false);assert.equal(b.refugeUnlocked,false);assert.equal(c.refugeUnlocked,true);assert.equal(c.refuge.ready,true);assert.deepEqual(c.refuge.xy,first.xy);assert.equal(c.material,'glass');assert.equal(w.state.economy.goods.glass,3);
 assert.equal(victory(w,3),null);assert.equal(w.state.economy.goods.glass,3);assert.equal(w.state.expeditions.regions[1].wins,3);
 const saved=JSON.parse(JSON.stringify(w.state));w.state=saved;assert.equal(victory(w,1),null);assert.deepEqual(expeditionObjects(w)[0].xy,first.xy);assert.ok(validateExpeditions(saved));
});

test('patrol salvage shares the existing claim and cannot duplicate goods or progress',()=>{
 const w=fixture(),object={type:'patrol',bit:3,salvageCore:'gale'},origin={scene:101,mission:w.mission,object};
 encounterSalvage(w.state,{key:'101:patrol:3:',type:'patrol',core:'gale'});assert.equal(w.state.economy.goods.fiber,1);
 const result=recordExpeditionVictory(w,origin);assert.equal(result.material,'fiber');assert.equal(result.quantity,1);assert.equal(w.state.economy.goods.fiber,1);assert.equal(recordExpeditionVictory(w,origin),null);assert.equal(w.state.expeditions.regions[1].wins,1);
 const direct=fixture();assert.ok(recordExpeditionVictory(direct,origin));assert.equal(direct.state.economy.goods.fiber,1);assert.equal(encounterSalvage(direct.state,{key:'101:patrol:3:',type:'patrol',core:'gale'}),null);
});

test('regional work stays local and a global serial high-water mark rejects old wild claims',()=>{
 const w=fixture();victory(w,1);w.scene.chapter=2;w.scene.location=w.state.scene=201;w.state.chapter=2;victory(w,2,'flame');
 assert.equal(w.state.expeditions.regions[1].wins,1);assert.equal(w.state.expeditions.regions[2].wins,1);assert.equal(w.state.economy.goods.metal,1);
 w.scene.chapter=1;w.scene.location=w.state.scene=101;assert.equal(victory(w,1),null);assert.equal(w.state.expeditions.regions[1].wins,1);
});

test('practice, origins, friendly sparring, borrowed trials and unfinished battles earn no expedition progress',()=>{
 for(const change of [w=>w.state.mode='battle',w=>w.state.fieldOrigins={active:{}},w=>w.state.chronicle={phase:'past'},w=>w.scene.originId='sable-reed',w=>w.scene.fieldOrigin=0]){const w=fixture();change(w);assert.equal(victory(w,1),null);assert.equal(w.state.expeditions,undefined);}
 for(const object of [{type:'practice'},{type:'origin'},{type:'boss'},{type:'patrol',bit:1,originHero:0},{type:'wild',serial:1,rivalId:'spar'}]){const w=fixture();assert.equal(recordExpeditionVictory(w,{scene:101,object}),null);assert.equal(w.state.expeditions,undefined);}
});

test('refuge placement is in the reachable component and avoids doors and occupied work',()=>{
 const w=fixture();w.scene.floor=w.scene.floor.map(row=>row.slice(0,9)+'#'+row.slice(10));w.scene.objects=[{type:'npc',xy:[5,6]},{type:'puzzle',xy:[6,5]}];w.scene.affordanceBlocked=[[3,2],[3,3]];
 const o=expeditionObjects(w)[0];assert.ok(o);assert.ok(o.xy[0]<9);assert.ok(Math.hypot(o.xy[0]-1,o.xy[1]-6)>=2.5);assert.ok(w.scene.objects.every(p=>Math.hypot(o.xy[0]-p.xy[0],o.xy[1]-p.xy[1])>=2.5));assert.equal(w.scene.floor[o.xy[1]][o.xy[0]],'.');
 const xy=[...o.xy];w.state.x=7.5;w.state.y=10.5;assert.deepEqual(expeditionObjects(w)[0].xy,xy);w.scene.affordanceBlocked.push(xy);assert.deepEqual(expeditionObjects(w),[],'A newly blocked shelter cannot be used through a collision tile');
 const tiny=fixture();tiny.scene.floor=['#####','#...#','#...#','#####'];tiny.state.x=2.5;tiny.state.y=2.5;assert.deepEqual(expeditionObjects(tiny),[]);
});

test('opening town supports its public refuge while later towns, sanctuaries and interiors keep existing services',()=>{
 const opening=fixture();opening.scene.key='town';assert.equal(expeditionObjects(opening)[0].ready,false);
 for(const props of [{key:'town',chapter:2},{key:'sanctuary'},{interior:'cistern',key:'flood'},{key:'forest',randomEncounters:false}]){const w=fixture();Object.assign(w.scene,props);assert.deepEqual(expeditionObjects(w),[]);}
});

test('recovery is modest, affects the travelling crew, and only a new win renews it',()=>{
 const w=fixture();unlock(w);for(const h of w.state.heroes){h.hp=0;h.mp=0;}const reserve=w.state.heroes[2];assert.ok(recoverAtExpedition(w));
 for(const id of w.state.party){const h=w.state.heroes[id];assert.equal(h.hp,Math.ceil(h.maxHp*.25));assert.equal(h.mp,Math.ceil(h.maxMp*.2));}
 assert.equal(reserve.hp,0);assert.equal(reserve.mp,0);assert.equal(recoverAtExpedition(w),false);w.state=JSON.parse(JSON.stringify(w.state));assert.equal(recoverAtExpedition(w),false);victory(w,4);assert.ok(recoverAtExpedition(w));assert.equal(recoverAtExpedition(w),false);
 w.state.x=1.5;w.state.y=1.5;victory(w,5);assert.equal(recoverAtExpedition(w),false,'Recovery requires physically reaching the shelter');
});

test('refinement consumes actual matching material for an equipped core and respects mastery cap',()=>{
 const w=fixture();unlock(w);const h=w.state.heroes[0],goods=economyState(w.state).goods;assert.equal(refineExpeditionCore(w,0,'flame'),false);goods.metal=4;
 assert.equal(refineExpeditionCore(w,0,'flame'),true);assert.equal(h.ap.flame,8);assert.equal(goods.metal,2);assert.equal(refineExpeditionCore(w,2,'flame'),false);assert.equal(refineExpeditionCore(w,0,'tide'),false);assert.equal(goods.metal,2);
 h.ap.flame=117;assert.equal(refineExpeditionCore(w,0,'flame'),true);assert.equal(h.ap.flame,120);assert.equal(goods.metal,0);goods.metal=2;assert.equal(refineExpeditionCore(w,0,'flame'),false);assert.equal(goods.metal,2);
 w.state.x=1.5;w.state.y=1.5;h.ap.flame=0;assert.equal(refineExpeditionCore(w,0,'flame'),false);
});

test('refuge interaction offers optional explicit actions rather than spending on inspection',()=>{
 const w=fixture();let o=approach(w);assert.ok(interactExpedition(w,o));assert.match(w.lastText,/3 more local/);unlock(w);o=approach(w);const before=JSON.stringify(w.state.economy.goods);assert.ok(interactExpedition(w,o));assert.equal(w.choices.length,3);assert.equal(JSON.stringify(w.state.economy.goods),before);assert.equal(interactExpedition(w,{type:'cache'}),false);
});

test('save validation rejects malformed and unbounded claims, placement and recovery history',()=>{
 assert.ok(validateExpeditions({}));const w=fixture();victory(w,1);const valid=JSON.parse(JSON.stringify(w.state));assert.ok(validateExpeditions(valid));
 for(const corrupt of [s=>s.expeditions.version=2,s=>s.expeditions.wildSerial=-2,s=>s.expeditions.regions[25]={wins:0,restedAt:-1,refuge:null},s=>s.expeditions.regions[1].wins=-1,s=>s.expeditions.regions[1].restedAt=2,s=>s.expeditions.regions[1].refuge.xy=[NaN,2],s=>s.expeditions.patrolClaims=['same','same'],s=>s.expeditions.patrolClaims=Array.from({length:257},(_,i)=>String(i))]){const s=structuredClone(valid);corrupt(s);assert.throws(()=>validateExpeditions(s));}
});
