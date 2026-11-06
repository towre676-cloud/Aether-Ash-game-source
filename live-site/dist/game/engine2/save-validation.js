import {validateEmbodiedOrigins} from './embodied-origins.js?v=5.38';
import {validCreatureEcology} from './creature-ecology.js?v=5.18.0';
import {validCityAnswerContext} from './city-answer.js?v=5.18.0';
import {validAnatomy} from './functional-anatomy.js?v=5.16.0';
import {validLegacyBattle} from './hero-legacy.js?v=5.5.0';
import {validObjective} from './encounter-objectives.js?v=5.5.0';
import {validInstruments} from './combat-instruments.js?v=5.5.0';
import {validBattlefield} from './battlefield.js?v=5.18.0';
import {validWildEncounter} from './wild-combat.js?v=5.38';
import {World} from './world.js?v=5.41';
import {Battle} from './battle.js?v=5.38';
import {APPROACHES} from './battle-approaches.js';
import {migrateObservatoryBattleSnapshot,validateObservatoryBattleFloor} from './observatory-battle-migration.js?v=5.38';
import {migrateFrontierBattleSnapshot,validateFrontierBattleFloor} from './frontier-battle-541.js?v=5.41';
export function savedEncounter(world,parsed){const source=parsed.origin;if(!source)return null;const rival=source.rivalId?world.objects().find(o=>o.rivalId===source.rivalId):null;return source.practice?.type==='wild'?(validWildEncounter(source.practice)?source.practice:null):rival?{...rival,type:'rival'}:['practice','origin'].includes(source.practice?.type)?source.practice:world.objects().find(o=>o.type===source.type&&o.bit===source.bit&&o.flag_address===source.flag);}
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const finiteRecord=value=>record(value)&&Object.values(value).every(Number.isFinite);
const crewId=id=>Number.isInteger(id)&&id>=0&&id<7;
const unique=list=>new Set(list).size===list.length;
function validateWorldShape(s,depth=0){
 if(!record(s)||!Array.isArray(s.heroes)||s.heroes.length!==7||!Array.isArray(s.party)||!s.party.length||s.party.length>3||!unique(s.party)||!s.party.every(crewId)||!Array.isArray(s.recruited)||!unique(s.recruited)||!s.recruited.every(crewId)||s.party.some(id=>!s.recruited.includes(id)))throw Error('Invalid enhanced save');
 for(const [id,h]of s.heroes.entries())if(!record(h)||h.id!==id||!['hp','mp','maxHp','maxMp','power','magic','speed','level'].every(k=>Number.isFinite(h[k]))||h.hp<0||h.mp<0||h.maxHp<=0||h.maxMp<0||h.hp>h.maxHp||h.mp>h.maxMp||!record(h.ap)||!Object.values(h.ap).every(n=>Number.isFinite(n)&&n>=0)||!Array.isArray(h.loadout)||h.loadout.some(slot=>!record(slot)||typeof slot.core!=='string'||typeof slot.support!=='string'))throw Error('Invalid crew state');
 if(!finiteRecord(s.items)||Object.values(s.items).some(n=>!Number.isInteger(n)||n<0)||!finiteRecord(s.flags)||!Number.isFinite(s.gold)||s.gold<0||!Number.isFinite(s.xp)||s.xp<0||!Array.isArray(s.cores)||!s.cores.every(x=>typeof x==='string')||!Array.isArray(s.supports)||!s.supports.every(x=>typeof x==='string')||!Array.isArray(s.bosses)||!s.bosses.every(n=>Number.isInteger(n)&&n>=1&&n<=24))throw Error('The saved supplies or campaign are invalid.');
 if(s.story!=null&&(!record(s.story)||!Array.isArray(s.story.journal)||s.story.journal.some(e=>!record(e)||typeof e.id!=='string')||!Array.isArray(s.story.rewarded)||!record(s.story.failures)))throw Error('The saved journal is incomplete.');
 const c=s.chronicle;if(c!=null&&(!record(c)||!record(c.choices)||!Array.isArray(c.claimed)||!c.claimed.every(x=>typeof x==='string')))throw Error('The saved origin decisions are incomplete.');
 validateEmbodiedOrigins(s);
 const trial=s.fieldOrigins;
 if(trial!=null){
  if(!record(trial)||trial.version!==1||!Array.isArray(trial.completed)||!unique(trial.completed)||!trial.completed.every(crewId)||!record(trial.roles)||Object.entries(trial.roles).some(([id,role])=>!crewId(Number(id))||!APPROACHES.some(a=>a.id===role)))throw Error('The saved field trial is invalid.');
  if(trial.active!=null){if(depth||!record(trial.active)||!crewId(trial.active.hero)||s.party.length!==1||s.party[0]!==trial.active.hero||s.scene!==4700+trial.active.hero)throw Error('The saved field trial has lost its return route.');validateWorldShape(trial.active.base,depth+1);}
 }
}
function validActor(a){return record(a)&&(typeof a.id==='string'||crewId(a.id))&&['hp','maxHp','power','speed','atb','x','y'].every(k=>Number.isFinite(a[k]))&&a.hp>=0&&a.maxHp>0&&a.hp<=a.maxHp&&finiteRecord(a.status)&&(!a.intent||record(a.intent)&&Number.isFinite(a.intent.left));}
function validTechnique(t){return record(t)&&Number.isFinite(t.power)&&typeof t.core==='string'&&typeof t.shape==='string';}
function validateBattleShape(b,probe){
 if(!['heroes','enemies','fields','delayed'].every(key=>Array.isArray(b[key]))||!b.heroes.length||!b.enemies.length||!Number.isFinite(b.time)||b.time<0||!Number.isInteger(b.chapter)||b.chapter<1||b.chapter>24||!Number.isInteger(b.reinforcements)||b.reinforcements<0)throw Error('The saved encounter is incomplete.');
 const all=[...b.heroes,...b.enemies];
 if(!all.every(validActor)||!unique(all.map(a=>a.id))||b.enemies.some(e=>typeof e.id!=='string'))throw Error('The saved battle contains an invalid actor.');
 if(b.heroes.length!==probe.state.party.length||b.heroes.some(h=>!probe.state.party.includes(h.id)||!Number.isFinite(h.mp)||!Number.isFinite(h.maxMp)||!Number.isFinite(h.magic)||h.mp<0||h.mp>h.maxMp||!record(h.ap)||!Array.isArray(h.loadout)))throw Error('The saved crew does not match this encounter.');
 const heroIds=new Set(b.heroes.map(h=>h.id));
 if(b.delayed.some(d=>!record(d)||!Number.isFinite(d.at)||!heroIds.has(d.caster)||!Array.isArray(d.targets)||!d.targets.every(id=>typeof id==='string'||crewId(id))||!validTechnique(d.tech)||d.multiplier!==undefined&&!Number.isFinite(d.multiplier))||b.fields.some(f=>!record(f)||!heroIds.has(f.caster)||!['x','y','next','ticks'].every(k=>Number.isFinite(f[k]))||!Number.isInteger(f.ticks)||f.ticks<0||!validTechnique(f.tech)))throw Error('The saved persistent technique is incomplete.');
 if(b.context!=null&&(!record(b.context)||b.context.tags!==undefined&&(!Array.isArray(b.context.tags)||!b.context.tags.every(t=>typeof t==='string')))||b.reactionCooldowns!=null&&!finiteRecord(b.reactionCooldowns)||b.resonanceSignals!=null&&!finiteRecord(b.resonanceSignals))throw Error('The saved encounter context is invalid.');
}
/** Check and migrate an isolated copy before a load is allowed to replace the live world. */
export function validateSave(sourceData,value){
 const parsed=typeof value==='string'?JSON.parse(value):value;
 if(parsed?.schema!=='ash-aether.enhanced-save/1'||!parsed.world)throw Error('Choose an Ash & Aether enhanced save.');
 validateWorldShape(parsed.world);
 const probe=new World(sourceData);probe.restore(parsed.world);let b=parsed.battle;
 const trial=probe.state.fieldOrigins?.active;
 if(trial){const returnJourney=new World(sourceData);returnJourney.restore(trial.base);trial.base=JSON.parse(returnJourney.save());}
 else if(probe.scene.fieldOrigin!==undefined)throw Error('The saved field trial has lost its return route.');
 if(b){
  validateBattleShape(b,probe);
  if(parsed.origin?.scene!==probe.scene.location||!savedEncounter(probe,parsed))throw Error('The saved encounter is not in this campaign.');
  if(!validCreatureEcology(b.ecology,b.enemies)||!validAnatomy(b.anatomy,b.enemies,b.field)||!validLegacyBattle(b.legacy,b.heroes))throw Error('The saved creature tactics or legacy are invalid.');
  if(!validCityAnswerContext(b.context?.cityAnswer,b.heroes))throw Error('The saved city contributions are invalid.');
  if(!validObjective(b.objective)||!validInstruments(b.instruments))throw Error('The saved objective or instruments are invalid.');
  if(!validBattlefield(b.field,[...b.heroes,...b.enemies]))throw Error('The saved battlefield tools are invalid.');
  const rehearsal=new Battle({heroes:JSON.parse(JSON.stringify(probe.activeHeroes)),enemies:[],inventory:{...probe.state.items},chapter:b.chapter});
  rehearsal.restore(JSON.parse(JSON.stringify(b)));
  try{rehearsal.advance(0);}catch{throw Error('The saved encounter cannot resume safely.');}
  // Validate the original encounter before adapting its spatial records. A
  // corrupt import must never become accepted through layout migration.
  const observatory=migrateObservatoryBattleSnapshot(b,parsed.world,probe.state,probe.scene);
  const migrated=migrateFrontierBattleSnapshot(observatory,parsed.world,probe.state,probe.scene);
  if(migrated!==b){
   validateBattleShape(migrated,probe);
   rehearsal.restore(JSON.parse(JSON.stringify(migrated)));
   try{rehearsal.advance(0);}catch{throw Error('The saved encounter cannot resume safely.');}
   b=migrated;
  }
  validateObservatoryBattleFloor(b,probe.scene);
  validateFrontierBattleFloor(b,probe.scene);
 }
 // Keep the wrapper consistent for profile previews; live restore rebuilds the battle.
 if(b)probe.state.mode='battle';
 // Return the migrated and collision-corrected state; never mutate an imported object.
 return {...parsed,...(b?{battle:b}:{}),world:JSON.parse(probe.save())};
}
