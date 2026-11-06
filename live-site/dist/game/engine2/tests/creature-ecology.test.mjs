import test from 'node:test';
import assert from 'node:assert/strict';
import {MONSTER_CATALOG} from '../monster-catalog.js';
import {createBattlefield,fieldGear,fieldCommand,validBattlefield} from '../battlefield.js';
import {CREATURE_ECOLOGY_PROFILES,creatureEcologyProfile,createCreatureEcology,registerCreatureEcology,ecologyEnemyIntent,executeEcologyIntent,ecologyActions,ecologyCommand,ecologySummary,recordEcologyDamage,settleCreatureMemory,normalizeCreatureMemory,validCreatureMemory,validCreatureEcology} from '../creature-ecology.js';

const cells=()=>Array.from({length:7},(_,y)=>Array.from({length:10},(_,x)=>[x,y])).flat();
function setup(family='mossback',options={}){
 const h={id:0,name:'Iona',hp:180,maxHp:180,mp:24,maxMp:24,x:2.5,y:3.5,atb:1,status:{}};
 const enemies=(options.families||[family]).map((family,i)=>({id:'e'+i,name:family,species:family+'-region-0',family,x:3.5+i,y:3.5,hp:100,maxHp:100,power:15,atb:1,status:{},ecologyMotive:options.motive}));
 const context={wild:true,location:'test-workshop',key:'workshop',encounterSerial:1,walkable:options.walkable||cells(),creatureMemory:options.memory,fieldProps:options.types?.map((type,i)=>({type,x:3.5+i*.2,y:3.5}))};
 const b={context,heroes:[h],enemies,ended:null,time:0,events:[],event(v){this.events.push(v);},damage(caster,target,n){target.hp=Math.max(0,target.hp-n);recordEcologyDamage(this,caster,target,n);}};
 b.field=createBattlefield({...context,wild:false},b.heroes,enemies);b.ecology=createCreatureEcology(context,b.heroes,enemies);for(const r of b.ecology.creatures)r.tethered=false;
 return {b,h,e:enemies[0],r:b.ecology.creatures[0],inventory:{tonic:3,ether:2,mossWrap:2}};
}
const act=(s,action,extra={})=>{s.h.atb=1;return ecologyCommand(s.b,s.h,s.e,{action,...extra},s.inventory);};
function plans(b,e,count=1){const out=[];for(let i=0;i<count;i++){const intent=ecologyEnemyIntent(b,e);if(intent){out.push(intent);executeEcologyIntent(b,e,intent);}}return out;}

test('every catalog variety inherits one coherent authored ecology profile',()=>{
 const profiles=new Set();for(const species of MONSTER_CATALOG){const p=creatureEcologyProfile(species);assert.ok(CREATURE_ECOLOGY_PROFILES.includes(p));assert.ok(p.detail.length>35);assert.ok(p.tools.length);assert.equal(p,creatureEcologyProfile(species));profiles.add(p.id);}
 assert.equal(MONSTER_CATALOG.length,432);assert.ok(profiles.size>=12);assert.equal(CREATURE_ECOLOGY_PROFILES.length,16);
 assert.equal(creatureEcologyProfile({family:'mossback',species:'mossback-inkshroud'}).id,'moss-grazer');
});
test('canonical, friendly and tutorial encounters retain optional inactive ecology',()=>{
 for(const context of [{},{wild:true,friendly:true},{wild:true,tutorial:true}]){const o=createCreatureEcology(context,[],[]);assert.equal(o.enabled,false);assert.ok(validCreatureEcology(o));assert.deepEqual(o.creatures,[]);}
 const s=setup();s.e.boss=true;const o=createCreatureEcology(s.b.context,[s.h],[s.e]);assert.deepEqual(o.creatures,[]);assert.ok(validCreatureEcology(o));
 assert.equal(ecologyEnemyIntent({},s.e),null);assert.deepEqual(ecologyActions({},s.h,s.e),[]);
});
test('nourishment spends one real supply and action, cannot be farmed, and enables a trusted release',()=>{
 const s=setup();assert.ok(act(s,'food'));assert.equal(s.inventory.tonic,2);assert.equal(s.h.atb,0);assert.equal(s.r.hunger,0);assert.equal(s.r.trust,1);assert.equal(s.e.hp,100);
 s.h.atb=1;assert.equal(ecologyCommand(s.b,s.h,s.e,{action:'food'},s.inventory),false);assert.equal(s.inventory.tonic,2);assert.equal(s.h.atb,1);
 assert.ok(act(s,'soothe'));assert.equal(s.h.mp,20);assert.equal(s.r.trust,2);assert.ok(act(s,'release'));assert.equal(s.e.withdrawn,true);assert.equal(s.e.hp,100);assert.equal(s.e.intent,null);assert.ok(validCreatureEcology(s.b.ecology,s.b.enemies));
 assert.equal(ecologyEnemyIntent(s.b,s.e),null);assert.ok(ecologySummary(s.b,s.e).withdrawn);
});
test('frightened soothing resolves a living creature and releases its exact finite tool',()=>{
 const s=setup('moonmoth',{types:['jar']});const p=s.b.field.props[0];p.ownerId=s.e.id;p.condition='carried';s.e.fieldGear=p.id;s.e.intent={kind:'strike',left:1};
 assert.ok(act(s,'soothe'));assert.equal(s.e.withdrawn,true);assert.equal(s.e.hp,100);assert.equal(p.ownerId,null);assert.equal(p.condition,'loose');assert.equal(p.uses,1);assert.equal(s.e.fieldGear,null);assert.ok(validBattlefield(s.b.field,[s.h,s.e]));
});
test('rescue treats a real snare or wound, remembers kindness and creates no loot',()=>{
 const s=setup('boilercrab');s.r.tethered=true;s.e.status={slow:5,burn:4};s.e.hp=45;
 assert.ok(ecologyActions(s.b,s.h,s.e,s.inventory).some(a=>a.action==='rescue'&&a.enabled));assert.ok(act(s,'rescue'));assert.equal(s.inventory.mossWrap,1);assert.equal(s.inventory.tonic,3);assert.equal(s.r.tethered,false);assert.equal(s.r.rescued,true);assert.equal(s.r.trust,2);assert.equal(s.e.hp,70);assert.equal(s.e.status.burn,undefined);assert.equal(s.e.withdrawn,true);
 const state={items:{...s.inventory},gold:9,xp:10};const out=settleCreatureMemory(state,s.b,'win');assert.equal(out.withdrawn,1);assert.equal(state.gold,9);assert.equal(state.xp,10);assert.deepEqual(state.items,s.inventory);assert.equal(state.creatureMemory.individuals[0].rescues,1);
});
test('a nesting shelter consumes a real carried brace use and leaves a peaceful creature',()=>{
 const s=setup('inkcrane',{types:['plank']});const p=s.b.field.props[0];assert.ok(fieldCommand(s.b,s.h,s.e,{action:'take',propId:p.id}));assert.equal(fieldGear(s.b,s.h),p);
 assert.ok(act(s,'shelter'));assert.equal(p.uses,1);assert.equal(s.r.nestSafe,true);assert.equal(s.e.withdrawn,true);assert.equal(s.r.trust,2);assert.ok(validBattlefield(s.b.field,[s.h,s.e]));
 const other=setup('mossback',{types:['plank']});other.b.field.props[0].ownerId=0;other.b.field.props[0].condition='carried';other.h.fieldGear=other.b.field.props[0].id;assert.equal(act(other,'shelter'),false);assert.equal(other.b.field.props[0].uses,2);
});
test('sounding clay lures redirect movement along actual floor and expire on investigation',()=>{
 const floor=['#####','#...#','#.#.#','#...#','#####'],walkable=[];floor.forEach((row,y)=>{for(let x=0;x<row.length;x++)if(row[x]==='.')walkable.push([x,y]);});
 const s=setup('glassram',{walkable});s.h.x=3.5;s.h.y=3.5;s.e.x=1.5;s.e.y=3.5;
 const row=ecologyActions(s.b,s.h,s.e,s.inventory).find(a=>a.action==='lure'&&a.nodeId==='lure-3-1');assert.ok(row?.enabled);assert.ok(act(s,'lure',{nodeId:row.nodeId}));assert.equal(s.h.mp,21);assert.ok(s.r.lure);
 const seen=[];for(let i=0;i<8&&s.r.lure;i++){const [intent]=plans(s.b,s.e);assert.equal(intent.kind,'ecology-follow');seen.push([s.e.x,s.e.y]);assert.equal(floor[Math.floor(s.e.y)][Math.floor(s.e.x)],'.');}
 assert.equal(s.r.lure,null);assert.ok(s.e.status.stagger);assert.ok(seen.some(([x,y])=>x===3.5&&y===3.5));assert.ok(validCreatureEcology(s.b.ecology,s.b.enemies));
});
test('predator rivalry targets another creature and uses a telegraphed paid enemy turn',()=>{
 const s=setup('bramblewolf',{families:['bramblewolf','mossback']});const prey=s.b.enemies[1],before=s.h.hp,intent=ecologyEnemyIntent(s.b,s.e);
 assert.equal(intent.kind,'ecology-rival');assert.equal(intent.target,prey.id);assert.ok(intent.left>=1.5);assert.equal(prey.hp,100);assert.ok(executeEcologyIntent(s.b,s.e,intent));assert.ok(prey.hp<100);assert.equal(s.h.hp,before);assert.equal(s.r.rivalHits,1);assert.equal(ecologyEnemyIntent(s.b,s.e),null);
});
test('rival strikes and player interactions cannot cross a partition',()=>{
 const walkable=[[1,1],[1,2],[3,1],[3,2]],s=setup('bramblewolf',{families:['bramblewolf','mossback'],walkable});s.e.x=1.5;s.e.y=1.5;s.b.enemies[1].x=3.5;s.b.enemies[1].y=1.5;s.h.x=3.5;s.h.y=1.5;
 assert.equal(ecologyEnemyIntent(s.b,s.e),null);const before=s.h.mp;assert.equal(act(s,'soothe'),false);assert.equal(s.h.mp,before);assert.equal(s.h.atb,1);
 const fake={kind:'ecology-rival',target:s.b.enemies[1].id,power:30};assert.ok(executeEcologyIntent(s.b,s.e,fake));assert.equal(s.b.enemies[1].hp,100);
});
test('scavengers contest original tools, reach a real den and remember a theft without duplicating inventory',()=>{
 const s=setup('boilercrab',{types:['coil']});s.r.den={x:5.5,y:3.5};const p=s.b.field.props[0],first=ecologyEnemyIntent(s.b,s.e);assert.equal(first.kind,'ecology-salvage');executeEcologyIntent(s.b,s.e,first);assert.equal(fieldGear(s.b,s.e),p);assert.equal(p.ownerId,s.e.id);
 for(let i=0;i<18&&!s.e.withdrawn;i++)plans(s.b,s.e);assert.equal(s.e.withdrawn,true);assert.equal(s.e.hp,100);assert.equal(s.r.escaped,true);assert.equal(s.r.stolenTool,'coil');assert.equal(p.condition,'spent');assert.equal(p.uses,0);assert.equal(p.ownerId,null);assert.equal(s.e.fieldGear,null);assert.ok(validBattlefield(s.b.field,[s.h,s.e]));
 const state={items:{tonic:1}};settleCreatureMemory(state,s.b,'win');assert.equal(state.creatureMemory.individuals[0].stolenTool,'coil');assert.deepEqual(state.items,{tonic:1});assert.ok(validCreatureMemory(state.creatureMemory));
});
test('damaged mobility restricts floor movement and prevents a physical escape',()=>{
 const s=setup('moonmoth');s.r.den={x:5.5,y:3.5};s.e.mobilityImpaired=true;let i=ecologyEnemyIntent(s.b,s.e);executeEcologyIntent(s.b,s.e,i);assert.ok(s.e.x>3.5&&s.e.x<=3.91);
 s.e.escapeBlocked=true;s.e.x=5.5;s.e.y=3.5;executeEcologyIntent(s.b,s.e,{kind:'ecology-retreat'});assert.equal(s.e.withdrawn,false);assert.equal(s.r.escaped,false);assert.match(s.b.events.at(-1).label,/cannot/);
 assert.ok(act(s,'soothe'));assert.equal(s.e.withdrawn,true);assert.equal(s.r.escaped,false);
});
test('harm produces a persistent grudge and a remembered attacker changes later plans',()=>{
 const s=setup('mossback');for(let i=0;i<3;i++)recordEcologyDamage(s.b,s.h,s.e,3);assert.equal(s.r.grudge,3);assert.equal(s.r.injuredByHero,true);
 const i=ecologyEnemyIntent(s.b,s.e);assert.equal(i.kind,'ecology-grudge');assert.equal(i.target,s.h.id);executeEcologyIntent(s.b,s.e,i);assert.ok(s.h.hp<180);
 assert.equal(act(s,'food'),false);const state={};settleCreatureMemory(state,s.b,'retreat');const later=setup('mossback',{memory:state.creatureMemory});assert.equal(later.r.metBefore,true);assert.equal(later.r.grudge,3);assert.equal(ecologyEnemyIntent(later.b,later.e).kind,'ecology-grudge');
});
test('friend relationships guard a wounded companion with a bounded shield budget',()=>{
 const s=setup('mossback',{families:['mossback','rootgolem']});const friend=s.b.enemies[1];friend.hp=40;const i=ecologyEnemyIntent(s.b,s.e);assert.equal(i.kind,'ecology-protect');executeEcologyIntent(s.b,s.e,i);assert.equal(friend.status.shield,16);assert.equal(s.r.protections,1);assert.equal(s.h.hp,180);
});
test('failed commands preserve MP, readiness, inventory and all creature state',()=>{
 const s=setup();for(const request of [{action:'rescue'},{action:'shelter'},{action:'release'},{action:'lure',nodeId:'not-a-node'},{action:'anything'}]){const before=JSON.stringify([s.b.ecology,s.h,s.inventory]);assert.equal(ecologyCommand(s.b,s.h,s.e,request,s.inventory),false);assert.equal(JSON.stringify([s.b.ecology,s.h,s.inventory]),before);}
 s.h.atb=.5;assert.ok(ecologyActions(s.b,s.h,s.e,s.inventory).every(a=>!a.enabled));s.h.atb=1;s.h.mp=0;assert.equal(act(s,'soothe'),false);assert.equal(s.h.mp,0);
});
test('settlement and memory roundtrip are idempotent, bounded and recognize a rescued individual',()=>{
 const s=setup('mossback');s.r.tethered=true;act(s,'rescue');const state={};assert.equal(settleCreatureMemory(state,s.b,'win').recorded,true);const saved=JSON.stringify(state.creatureMemory);assert.equal(settleCreatureMemory(state,s.b,'win').recorded,false);assert.equal(JSON.stringify(state.creatureMemory),saved);
 const later=setup('mossback',{memory:state.creatureMemory});assert.equal(later.r.metBefore,true);assert.equal(later.r.trust,2);const i=ecologyEnemyIntent(later.b,later.e);assert.equal(i.kind,'ecology-peace');executeEcologyIntent(later.b,later.e,i);assert.equal(later.e.withdrawn,true);
 for(let n=2;n<=135;n++){later.b.ecology.encounterId='test-'+n;settleCreatureMemory(state,later.b,'win');}assert.equal(state.creatureMemory.encounters.length,128);assert.ok(validCreatureMemory(state.creatureMemory));assert.deepEqual(normalizeCreatureMemory(JSON.parse(saved)),JSON.parse(saved));
});
test('snapshots validate identities, floor, relationships and consistent living withdrawal',()=>{
 const s=setup();const copy=JSON.parse(JSON.stringify(s.b.ecology));assert.ok(validCreatureEcology(copy,s.b.enemies));assert.ok(validCreatureEcology(undefined));assert.ok(validCreatureMemory(undefined));
 for(const change of [o=>o.creatures[0].den.x=999,o=>o.creatures[0].trust=6,o=>o.creatures[0].profileId='made-up',o=>o.creatures[0].withdrawn=true,o=>o.creatures.push(o.creatures[0]),o=>o.walkable.push(o.walkable[0]),o=>o.creatures[0].lure={id:'bad',x:100,y:100,charges:1}]){const bad=structuredClone(copy);change(bad);assert.equal(validCreatureEcology(bad,s.b.enemies),false);}
 const state={};settleCreatureMemory(state,s.b);for(const change of [m=>m.individuals[0].grudge=-1,m=>m.individuals[0].den.x=Infinity,m=>m.individuals.push(m.individuals[0]),m=>m.encounters.push(m.encounters[0])]){const bad=structuredClone(state.creatureMemory);change(bad);assert.equal(validCreatureMemory(bad),false);}
});
test('ecology attacks use the same real interception callback as normal attacks',()=>{
 for(const mode of ['grudge','rival']){
  const s=setup('bramblewolf',{families:mode==='rival'?['bramblewolf','mossback']:['bramblewolf']});if(mode==='grudge'){s.r.grudge=3;s.r.aggressorId=s.h.id;}
  const i=ecologyEnemyIntent(s.b,s.e),target=mode==='grudge'?s.h:s.b.enemies[1],before=target.hp;let calls=0;
  assert.ok(executeEcologyIntent(s.b,s.e,i,{intercept(b,e,intent,t){calls++;assert.equal(b,s.b);assert.equal(e,s.e);assert.equal(intent,i);assert.equal(t,target);return true;}}));assert.equal(calls,1);assert.equal(target.hp,before);assert.equal(s.b.events.at(-1).action,'intercepted');assert.equal(s.r.rivalHits,0);
 }
});
test('corner-touching floor cells do not permit diagonal interaction or an attack',()=>{
 const s=setup('bramblewolf',{families:['bramblewolf','mossback'],walkable:[[1,1],[2,2]]});s.h.x=2.5;s.h.y=2.5;s.e.x=1.5;s.e.y=1.5;s.b.enemies[1].x=2.5;s.b.enemies[1].y=2.5;s.r.den={x:1.5,y:1.5};
 assert.equal(act(s,'food'),false);assert.equal(s.inventory.tonic,3);assert.equal(ecologyEnemyIntent(s.b,s.e),null);executeEcologyIntent(s.b,s.e,{kind:'ecology-rival',target:'e1',power:30});assert.equal(s.b.enemies[1].hp,100);
});
test('same-family creatures have separate identities and a dead occupant does not return as a familiar animal',()=>{
 const s=setup('mossback',{families:['mossback','mossback','mossback']});assert.equal(s.b.ecology.creatures.length,3);assert.equal(new Set(s.b.ecology.creatures.map(r=>r.key)).size,3);
 s.r.trust=4;s.r.grudge=2;s.e.hp=0;const state={};settleCreatureMemory(state,s.b,'win');const next=setup('mossback',{memory:state.creatureMemory});assert.equal(next.r.metBefore,false);assert.equal(next.r.trust,0);assert.equal(next.r.grudge,0);
});
test('a grudge softens once between separate meetings while a same-encounter restore preserves it',()=>{
 const s=setup();s.r.grudge=4;const state={};settleCreatureMemory(state,s.b,'retreat');const restored=setup('mossback',{memory:state.creatureMemory});assert.equal(restored.r.grudge,4);
 const context={...s.b.context,encounterSerial:2,creatureMemory:state.creatureMemory},e={...s.e},o=createCreatureEcology(context,[s.h],[e]);assert.equal(o.creatures[0].grudge,3);
});
test('reinforcement registration preserves existing relationships and living withdrawals',()=>{
 const s=setup();act(s,'food');act(s,'soothe');act(s,'release');const saved=structuredClone(s.r),e={id:'e100',species:'mossback-region-1',family:'mossback',hp:90,maxHp:90,power:12,x:5.5,y:3.5,status:{}};s.b.enemies.push(e);
 const next=registerCreatureEcology(s.b,e);assert.ok(next);assert.equal(next.actorId,e.id);assert.notEqual(next.key,s.r.key);assert.deepEqual(s.r,saved);assert.equal(s.e.withdrawn,true);assert.equal(s.b.ecology.creatures.length,2);assert.equal(registerCreatureEcology(s.b,e),null);assert.ok(validCreatureEcology(s.b.ecology,s.b.enemies));
});
