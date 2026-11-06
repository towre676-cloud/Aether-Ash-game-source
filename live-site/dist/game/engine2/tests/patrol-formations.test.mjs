import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../world.js';
import {source} from './opening-flow.mjs';
import {Battle,encounterEnemies,makeEnemy} from '../battle.js';
import {SPECIES,decorateEnemy,decorateEnemySpecies} from '../repertoire.js';
import {defaultHero,compileTechnique} from '../mako.js';
import {fieldPatrolPosition} from '../field-patrols.js';
import {approachForCommand,commandReach} from '../combat-engagement.js';
import {combatRoute} from '../combat-order.js';
import {PATROL_FORMATIONS,patrolFormationProfile,patrolFormationEnemies,revealedPatrolFormation} from '../patrol-formations.js';

const world=new World(source),clone=value=>structuredClone(value);
const actual=p=>{const scene=world.scenes.get(p.location),object=scene.objects.find(o=>o.type==='patrol'&&o.bit===p.bit);assert.ok(object,p.id);return {scene,object};};
const withoutMetadata=enemy=>{const e=clone(enemy);delete e.patrolFormation;return e;};
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const v of Object.values(value))freeze(v);}return value;}

test('the eight actual patrols keep their actor count, tier, health, power, speed and identity slots',()=>{
 assert.equal(PATROL_FORMATIONS.length,8);
 for(const p of PATROL_FORMATIONS){
  const {scene,object}=actual(p),before=encounterEnemies(p.chapter,false,object.enemies.length),after=patrolFormationEnemies(scene,object);
  assert.equal(after.length,before.length,p.id);assert.equal(revealedPatrolFormation(scene,object,after),p);
  for(let i=0;i<after.length;i++){
   for(const key of ['id','hp','maxHp','power','speed','boss'])assert.equal(after[i][key],before[i][key],p.id+' '+key);
   assert.equal(after[i].armor,after[i].role==='guard'?55+p.chapter*4:0);
   if(after[i].species)assert.ok(SPECIES.find(s=>s.id===after[i].species).chapter<=p.chapter,'no later identity is introduced early');
  }
 }
});

test('Security, the console, bridge and river retain their exact prior combat identities and mechanics',()=>{
 for(const id of ['security-watch','console-watch','bridge-watch','river-pair']){
  const p=PATROL_FORMATIONS.find(p=>p.id===id),{scene,object}=actual(p);
  assert.deepEqual(patrolFormationEnemies(scene,object).map(withoutMetadata),encounterEnemies(p.chapter,false,object.enemies.length),id);
 }
});

test('neighboring places now present different existing tactical relationships',()=>{
 const rosters=Object.fromEntries(PATROL_FORMATIONS.map(p=>{const {scene,object}=actual(p);return [p.id,patrolFormationEnemies(scene,object).map(e=>e.role).join('+')];}));
 assert.equal(rosters['workshop-aisle'],'guard+predator');assert.equal(rosters['refuge-stores'],'guard+mender');assert.equal(rosters['passage-watch'],'scout+predator');assert.equal(rosters['bypass-pair'],'guard+predator');
 assert.notEqual(rosters['security-watch'],rosters['workshop-aisle']);assert.notEqual(rosters['bridge-watch'],rosters['refuge-stores']);assert.equal(new Set(['passage-watch','river-pair','bypass-pair'].map(id=>rosters[id])).size,3);
});

test('explicit selection preserves the selected species move, status, trait and drop metadata at the current tier',()=>{
 const s=SPECIES.find(s=>s.id==='clockmole'),base=makeEnemy(s.role,3),e=decorateEnemySpecies(base,3,s.id);
 for(const [key,expected] of Object.entries({name:s.name,species:s.id,atlas:s.atlas,sprite:s.sprite,role:s.role,trait:s.trait,element:s.element,drop:s.drop,move:s.move,moveShape:s.shape,moveStatus:s.status,habitat:s.habitat}))assert.equal(e[key],expected,key);
 assert.equal(e.hp,84);assert.equal(e.power,21.3);assert.equal(e.armor,67);
 assert.equal(decorateEnemySpecies(base,3,'unknown'),null);assert.equal(decorateEnemySpecies(base,3,'paperheron'),null);assert.equal(decorateEnemySpecies({...base,boss:true},3,'clockmole'),null);
 for(let chapter=2;chapter<=24;chapter++)for(let i=0;i<4;i++){const old=encounterEnemies(chapter,false,4)[i];assert.deepEqual(decorateEnemy(makeEnemy(['guard','scout','mender','predator'][(chapter+i)%4],chapter,i),chapter,i),old);}
});

test('generation is deterministic on frozen inputs and never reads RNG or initializes ledgers',()=>{
 const p=PATROL_FORMATIONS[2],a=actual(p),scene=freeze(clone(a.scene)),object=freeze(clone(a.object)),before=JSON.stringify([scene,object]),random=Math.random;
 Math.random=()=>{throw Error('formation generation rolled RNG');};
 try{const first=patrolFormationEnemies(scene,object),second=patrolFormationEnemies(scene,object);assert.deepEqual(first,second);first[0].hp=1;assert.notEqual(second[0].hp,1);}finally{Math.random=random;}
 assert.equal(JSON.stringify([scene,object]),before);
});

test('kind, scene, bit, chapter and count must all match the authored patrol exactly',()=>{
 const p=PATROL_FORMATIONS[2],{scene,object}=actual(p);
 for(const other of [{...object,type:'wild'},{...object,type:'boss'},{...object,type:'practice'},{...object,bit:9},{...object,enemies:object.enemies.slice(0,1)}])assert.equal(patrolFormationEnemies(scene,other),null);
 for(const other of [{...scene,location:999},{...scene,key:'security'},{...scene,chapter:2}])assert.equal(patrolFormationEnemies(other,object),null);
 assert.equal(patrolFormationEnemies(scene,object,2),null);assert.equal(patrolFormationEnemies(null,object),null);assert.equal(patrolFormationEnemies(scene,null),null);
});

test('origins, frontiers, rivals, objectives and friendly or tutorial contexts always keep the existing path',()=>{
 const {scene,object}=actual(PATROL_FORMATIONS[2]);
 for(const extra of [{originId:'rook-regulator'},{originHero:0},{originSpecies:'clockmole'},{originScale:.8},{originName:'Story'},{frontierId:'foundry'},{frontierSpecies:['clockmole']},{rivalId:'friend'},{objectiveId:'signal'},{objectiveKind:'signal'},{objective:{}},{friendly:true},{tutorial:true},{randomEncounter:true}])assert.equal(patrolFormationEnemies(scene,{...object,...extra}),null,JSON.stringify(extra));
 for(const extra of [{originId:'rook-regulator'},{fieldOrigin:0},{biome:{id:'cactus'}}])assert.equal(patrolFormationEnemies({...scene,...extra},object),null);
 for(const context of [{friendly:true},{tutorial:true},{wild:true},{objective:{kind:'signal'}}])assert.equal(patrolFormationEnemies(scene,object,1,context),null);
});

test('unrevealed, reordered, stale or mismatched actor lists cannot claim a local formation brief',()=>{
 const {scene,object}=actual(PATROL_FORMATIONS[2]),enemies=patrolFormationEnemies(scene,object);
 assert.equal(revealedPatrolFormation(scene,object,[]),null);assert.equal(revealedPatrolFormation(scene,object,encounterEnemies(1,false,2)),null);
 assert.equal(revealedPatrolFormation(scene,object,[...enemies].reverse()),null);const stale=clone(enemies);stale[1].role='mender';assert.equal(revealedPatrolFormation(scene,object,stale),null);
 const dead=clone(enemies);dead[0].hp=0;assert.equal(revealedPatrolFormation(scene,object,dead),null);assert.equal(revealedPatrolFormation(scene,{...object,type:'wild'},enemies),null);
});

test('every actor at all eight actual sites remains on the same reachable floor and has a clear approach',()=>{
 for(const p of PATROL_FORMATIONS){
  const {scene,object}=actual(p);world.state.scene=p.location;world.state.chapter=p.chapter;
  const enemies=patrolFormationEnemies(scene,object);enemies.forEach((e,i)=>Object.assign(e,fieldPatrolPosition(world,object,i)));
  const hero=Object.assign(defaultHero(0,p.chapter),{x:scene.arrive[0]+.5,y:scene.arrive[1]+.5}),cells=[];
  for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++)if(world.walkable(x+.5,y+.5))cells.push([x,y]);
  const b=new Battle({heroes:[hero],enemies,chapter:p.chapter,context:{version:1,tags:[],engagement:{version:1,walkCells:cells},encounterTempo:{version:1}}});
  for(let i=0;i<enemies.length;i++){
   const e=enemies[i],old=fieldPatrolPosition(world,object,i);assert.deepEqual([e.x,e.y],[old.x,old.y],p.id+' position');assert.ok(world.walkable(e.x,e.y),p.id+' floor');
   const goal=approachForCommand(b,hero,e,'attack');assert.ok(goal,p.id+' '+e.name+' approach');assert.ok(combatRoute(world,hero,goal),p.id+' connected route');
   const quote=commandReach(b,{...hero,...goal},e,'attack');assert.equal(quote.inRange&&quote.clear,true,p.id+' reach');
  }
 }
});

test('the three new guard pairs create a real choice between intercepted attacks and direct Mako',()=>{
 for(const id of ['workshop-aisle','refuge-stores','bypass-pair']){
  const p=PATROL_FORMATIONS.find(p=>p.id===id),{scene,object}=actual(p);world.state.scene=p.location;world.state.chapter=p.chapter;
  const enemies=patrolFormationEnemies(scene,object);enemies.forEach((e,i)=>Object.assign(e,fieldPatrolPosition(world,object,i)));
  const [guard,partner]=enemies,hero=Object.assign(defaultHero(0,p.chapter),{x:partner.x,y:partner.y+1}),b=new Battle({heroes:[hero],enemies,chapter:p.chapter});
  assert.ok(Math.hypot(guard.x-partner.x,guard.y-partner.y)<=2.5,id);hero.atb=1;const before=enemies.map(e=>e.hp);assert.equal(b.command(hero.id,'attack',partner.id),true);assert.ok(guard.hp<before[0]);assert.equal(partner.hp,before[1]);
  hero.atb=1;const guardHP=guard.hp;assert.equal(b.command(hero.id,'tech',partner.id,compileTechnique('earth','focus')),true);assert.equal(guard.hp,guardHP);assert.ok(partner.hp<before[1]);
 }
});

test('old in-progress actors restore unchanged even at a newly authored formation site',()=>{
 const {scene,object}=actual(PATROL_FORMATIONS[2]),heroes=[Object.assign(defaultHero(0),{x:8.5,y:22.5})],old=encounterEnemies(1,false,2);old.forEach((e,i)=>Object.assign(e,{x:7.5+i*2,y:21.5}));
 const b=new Battle({heroes,enemies:old,context:{version:1,tags:[],encounterTempo:{version:1}}});b.advance(.1);const saved=b.snapshot(),restored=new Battle({heroes:clone(heroes),enemies:[]});restored.restore(clone(saved));
 assert.deepEqual(restored.snapshot(),saved);assert.deepEqual(restored.enemies.map(e=>e.role),['scout','mender']);assert.notDeepEqual(restored.enemies.map(e=>e.role),patrolFormationEnemies(scene,object).map(e=>e.role));
});

test('formation reads preserve the existing one-time item ledger and normal XP/credit settlement',()=>{
 const w=new World(source),seed=clone(w.state);
 for(const p of PATROL_FORMATIONS){
  const scene=w.scenes.get(p.location),object=scene.objects.find(o=>o.type==='patrol'&&o.bit===p.bit),runs=[];
  for(const reveal of [false,true]){
   w.state=clone(seed);Object.assign(w.state,{scene:p.location,chapter:p.chapter,mode:'battle'});const o=clone(object),mission=w.mission;
   if(reveal)for(let n=0;n<8;n++)patrolFormationEnemies(scene,o,p.chapter);
   const before={xp:w.state.xp,gold:w.state.gold};w.currentBattle={scene:p.location,object:o,mission};w.winBattle();const first={xp:w.state.xp-before.xp,gold:w.state.gold-before.gold,items:clone(w.state.items),ledger:clone(w.state.repertoireRewards)};
   w.state.mode='battle';w.currentBattle={scene:p.location,object:o,mission};w.winBattle();assert.deepEqual(w.state.items,first.items,p.id+' repeat items');assert.deepEqual(w.state.repertoireRewards,first.ledger,p.id+' repeat ledger');runs.push(first);
  }
  assert.deepEqual(runs[0],runs[1],p.id+' settlement');assert.equal(runs[1].xp,50+p.chapter*15);assert.equal(runs[1].gold,object.gold||15+p.chapter*5);
 }
});
