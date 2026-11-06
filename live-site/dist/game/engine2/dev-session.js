import {World} from './world.js?v=5.41';
import {validateSave} from './save-validation.js?v=5.41';
import {CREW,CORES,SUPPORTS,defaultHero,compileTechnique} from './mako.js?v=5.16.0';
import {findPath} from './navigation.js';
import {interactionPath} from './quest-navigation.js?v=5.21.0';
import {networkObjective} from './answering-network.js?v=5.18.0';
import {BOSS_GEAR,equipBossGear,equippedBossGear} from './boss-gear.js?v=5.16.0';
const copy=value=>JSON.parse(JSON.stringify(value));
const validHero=id=>Number.isInteger(id)&&id>=0&&id<CREW.length;
const levelFor=chapter=>Math.min(45,chapter+3);
export function recommendedDevParty(lead=0){if(!validHero(lead))throw Error('Choose a traveller from 0 to 6.');return [...new Set([lead,1,2,0,4])].slice(0,3);}
export function devChapterCatalog(data){return data.campaign.missions.map(m=>({chapter:m.id,name:m.title,bossName:m.enemy_name,level:levelFor(m.id)}));}
const cache=new WeakMap();
/** Offline fixture construction, not playthrough evidence: authored interactions and reward paths run normally. */
function templates(data,branch){
 let branches=cache.get(data);if(!branches){branches=new Map();cache.set(data,branches);}if(branches.has(branch))return branches.get(branch);
 let dialog=null;const w=new World(data,{onDialog:d=>dialog=d});
 function drain(){for(let n=0;dialog&&n<100;n++){const d=dialog;dialog=null;if(d.choices)d.choices[0].action();else d.after?.();}if(dialog)throw Error('Developer fixture dialogue did not settle.');}
 function choose(index){if(!dialog?.choices)throw Error('Developer fixture expected a story choice.');const d=dialog;dialog=null;d.choices[index].action();drain();}
 function use(o,index=0){w.interact(o);if(dialog?.choices)choose(index);else drain();}
 drain();use(w.objects().find(o=>o.type==='npc'));use(w.objects().find(o=>o.type==='portal'));
 use(w.objects().find(o=>o.type==='puzzle'&&o.bit===0),branch);use(w.objects().find(o=>o.type==='puzzle'&&o.bit===1),branch);
 use(w.objects().find(o=>o.type==='portal'&&o.to==='workshop'));use(w.objects().find(o=>o.type==='cache'&&o.bit===1));use(w.objects().find(o=>o.type==='puzzle'&&o.bit===3));
 use(w.objects().find(o=>o.type==='portal'&&o.to==='security'));use(w.objects().find(o=>o.storyEvent==='iona'));
 function visit(entry){for(const flag of entry.scene.access_requires||[])ensureFlag(...flag);w.loadScene(entry.scene.location,entry.scene.arrive);drain();}
 const entries=()=>w.mission.rooms.flatMap(scene=>scene.objects.map(object=>({scene,object})));
 function effectsSet(actions,address,bit){return (actions||[]).some(a=>a.set?.[0]===address&&a.set?.[1]===bit||effectsSet(a.yes,address,bit)||effectsSet(a.no,address,bit));}
 const resolving=new Set();
 function ensureFlag(address,bit){
  if(w.bit(address,bit))return;const key=address+':'+bit;if(resolving.has(key))throw Error('Cyclic developer prerequisite '+key);resolving.add(key);
  const candidates=entries().filter(({object:o})=>(o.flag_address??w.mission.flag_address)===address&&(o.sets_bit===bit||o.completes_bit===bit||o.bit===bit&&['puzzle','switch','patrol','aid','project','cache'].includes(o.type))||effectsSet(o.effects,address,bit)||(o.choice_effects||[]).some(e=>effectsSet(e,address,bit)));
  candidates.sort((a,b)=>(a.object.type==='patrol'?1:0)-(b.object.type==='patrol'?1:0));
  let resolved=false;for(const entry of candidates){complete(entry);if(w.bit(address,bit)){resolved=true;break;}}
  resolving.delete(key);if(!resolved)throw Error('No authored producer for developer prerequisite '+key+' in chapter '+w.state.chapter);
 }
 function complete(entry){
  const o=entry.object;for(const flag of [...(entry.scene.access_requires||[]),...(o.requires_flags||[]),...(o.appears_when?[o.appears_when]:[])])ensureFlag(...flag);if(o.requires!==undefined)ensureFlag(o.flag_address??w.mission.flag_address,o.requires);
  visit(entry);
  if(o.type==='note'){
   const address=o.flag_address??w.mission.flag_address;
   if(w.bit(address,o.completes_bit))return;
   for(const note of o.pattern){const next=entries().find(e=>e.object.type==='note'&&e.object.sequence_address===o.sequence_address&&e.object.note===note);if(!next)throw Error('Missing developer phrase note');for(const flag of next.object.requires_flags||[])ensureFlag(...flag);visit(next);use(next.object);}
  }else if(o.type==='puzzle'){
   for(let n=0;n<8&&!w.done(o);n++){visit(entry);const step=o.stage_flag&&w.bit(...o.stage_flag)?1:0;use(o,o.choice_effects?branch:(o.steps?.[step]?.answer??0));}
  }else if(o.type==='patrol'){
   w.interact(o);if(!w.currentBattle)throw Error('Developer patrol gate is still closed');w.winBattle();drain();
  }else if(o.type==='project'){w.state.gold=Math.max(w.state.gold,300);w.state.items.ether=Math.max(w.state.items.ether,1);use(o,branch);}
  else if(o.type==='aid'){w.state.items.ether=Math.max(w.state.items.ether,1);use(o);}
  else use(o);
 }
 const result={stages:new Map(),scenes:w.scenes};
 for(let chapter=1;chapter<=24;chapter++){
  const m=w.data.campaign.missions[chapter-1];w.state.chapter=chapter;
  w.destination(chapter);drain();
  result.stages.set(chapter+':arrival',copy(w.state));
  const bossEntry=m.rooms.flatMap(scene=>scene.objects.filter(o=>o.type==='boss').map(object=>({scene,object})))[0];if(!bossEntry)throw Error('Missing developer guardian '+chapter);
  const clue=m.rooms.flatMap(scene=>scene.objects.map(object=>({scene,object}))).find(({object:o})=>o.type==='npc'&&o.sets_bit===6&&(o.flag_address??m.flag_address)===m.flag_address);if(clue)ensureFlag(m.flag_address,6);
  const boss=bossEntry.object;if(boss.requires!==undefined)ensureFlag(m.flag_address,boss.requires);for(const flag of boss.requires_flags||[])ensureFlag(...flag);
  visit(bossEntry);
  // Fixtures perform the same short physical works as the player. Native
  // chapter prerequisites above still produce their own flags and choices;
  // no completed answering-network marks or imaginary inventory are injected.
  for(let n=0;n<12;n++){
   const goal=networkObjective(w);if(!goal)break;
   const scene=w.scenes.get(goal.targetScene);if(!scene||!goal.targetObject)throw Error('Missing developer answering worksite');
   w.loadScene(scene.location,scene.arrive);drain();
   const route=interactionPath(w.scene,[w.state.x,w.state.y],goal.targetObject);if(route===null)throw Error('Unreachable developer answering worksite');
   for(const [x,y]of route)w.move(x-w.state.x,y-w.state.y);
   use(goal.targetObject);
   if(n===11&&networkObjective(w))throw Error('Developer answering work did not settle');
  }
  visit(bossEntry);if(!w.available(boss))throw Error('Developer guardian is not available');
  const path=findPath(w.scene,[w.state.x,w.state.y],boss.xy,1),approach=path[Math.max(0,path.length-5)];if(approach){w.state.x=approach[0];w.state.y=approach[1];}
  w.state.mode='field';result.stages.set(chapter+':boss',copy(w.state));
  // Use the same reward path as a real victory; no combat result is claimed by this fixture builder.
  w.interact(boss);if(!w.currentBattle)throw Error('Developer guardian prerequisites are incomplete');w.winBattle();drain();
 }
 branches.set(branch,result);return result;
}
export function createDevSession(data,{chapter=1,stage='arrival',lead=0,party=recommendedDevParty(lead),branch=0}={}){
 if(!Number.isInteger(chapter)||chapter<1||chapter>24||!['arrival','boss'].includes(stage)||!validHero(lead)||![0,1].includes(branch))throw Error('Choose a chapter, stage, traveller and story branch.');
 if(!Array.isArray(party)||party.length!==3||new Set(party).size!==3||!party.every(validHero)||!party.includes(lead))throw Error('Choose three different travellers including the lead.');
 party=[lead,...party.filter(id=>id!==lead)];
 const source=templates(data,branch),s=copy(source.stages.get(chapter+':'+stage)),level=levelFor(chapter),slots=chapter===1?1:chapter<=6?2:3;
 s.party=[...party];s.recruited=[...new Set([...s.recruited,...party])];s.xp=65*(level-1)**2;s.gold=300+chapter*75;s.mode='field';s.complete=false;s.story.slots=slots;
 s.cores=[...new Set([...s.cores,'earth','mend',...party.map(id=>CREW[id].affinity)])].filter(id=>CORES.some(c=>c.id===id));s.supports=[...new Set(['focus',...s.supports])].filter(id=>SUPPORTS.some(v=>v.id===id));
 const ap=Math.min(120,chapter*8);s.heroes=s.heroes.map((old,id)=>{
  const h={...defaultHero(id,level),learned:(old.learned||0)|128,signature:!!old.signature,unlockedSlots:slots,gearHP:old.gearHP||0,gearPower:old.gearPower||0};
  h.maxHp+=h.gearHP;h.power+=h.gearPower;h.hp=h.maxHp;h.mp=h.maxMp;h.ap=Object.fromEntries(s.cores.map(core=>[core,ap]));
  for(const [gate,a,b]of [[1,2,3],[9,4,5],[17,6,7]])if(chapter>=gate)h.learned|=1<<(8-(branch?b:a));
  const primary=party[2]===id&&!party.includes(1)?'mend':s.cores.includes(CREW[id].affinity)?CREW[id].affinity:'earth';
  h.loadout=[{core:primary,support:'focus'}];if(slots>=2)h.loadout.push({core:'earth',support:s.supports.includes('break')?'break':'focus'});if(slots>=3)h.loadout.push({core:'mend',support:s.supports.includes('burst')?'burst':'focus'});
  return h;
 });
 s.items={tonic:6+Math.floor(chapter/4),ether:5+Math.floor(chapter/6),revive:2,...(chapter>=3?{tideFlask:2,shatterCharge:2,clearSalt:2,clockOil:2}:{})};
 // Practice builds may equip only equipment actually recovered before this guardian.
 for(const id of party)for(const slot of ['weapon','mantle','focus']){const gear=[...BOSS_GEAR].reverse().find(g=>g.chapter<chapter&&g.slot===slot&&!s.heroes.some(h=>Object.values(h.guardianGear||{}).some(v=>v.id===g.id)));if(gear)equipBossGear(s,id,gear.id);}
 for(const h of s.heroes){h.hp=h.maxHp;h.mp=h.maxMp;}
 const save=validateSave(data,{schema:'ash-aether.enhanced-save/1',world:s});
 const catalog=devChapterCatalog(data)[chapter-1],scene=source.scenes.get(save.world.scene);
 const summary={...catalog,stage,branch,lead,objective:stage==='boss'?'Challenge '+catalog.bossName:(data.campaign.missions[chapter-1].objective||data.campaign.missions[chapter-1].briefing),scene:{location:scene.location,key:scene.key,title:scene.title||catalog.name},practiceOnly:true,party:party.map(id=>{const h=save.world.heroes[id];return {id,name:h.name,level:h.level,hp:h.hp,mp:h.mp,slots:h.unlockedSlots,loadout:h.loadout.map(slot=>{const t=compileTechnique(slot.core,slot.support,{character:id,ap:h.ap[slot.core]});return {...slot,name:t.name,cost:t.cost,rank:t.rank};}),equipment:equippedBossGear(save.world,h).map(g=>({id:g.id,name:g.name,slot:g.slot}))};}),inventory:copy(save.world.items),previousGuardians:[...save.world.bosses]};
 return {save,summary};
}
