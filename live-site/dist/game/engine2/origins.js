import {armoryLegacy,restoreArmoryLegacy,syncLivingArmoryStats} from './living-armory/campaign.js?v=5.33.0';
import {normalizeHeroLegacies,syncHeroLegacies} from './hero-legacy.js?v=5.5.0';
import {affordanceKnowledgeLegacy} from './world-affordances.js?v=5.38';
import {normalizeCombatMemory} from './combat-instruments.js?v=5.5.0';
import {applyJourneyKit} from './journey-roster.js?v=5.18.0';
import {listeningLegacy} from './new-game-plus.js?v=5.6.0';
import {economyLegacy,economyState,STAMPS} from './economy.js?v=5.18.0';
import {BOSS_GEAR} from './boss-gear.js?v=5.16.0';
import {installBuildingGeometry} from './building-geometry.js';
import {ORIGINS,originById,ORIGIN_SCHEMA} from './origin-content.js?v=5.18.0';
import {applyObservatoryLayout} from './observatory-layout.js?v=5.38';
import {journeyConvergence,journeyPurpose} from './campaign-purpose.js?v=5.18.0';
import {defaultHero} from './mako.js?v=5.16.0';
import {isInteriorScene} from './scene-identity.js?v=4.0.0';
import {placePhysical,physicalBindings} from './physical-lore.js?v=5.16.0';
import {originPayoff,originRouteReady,activateOriginSupport,validateOriginPayoffs} from './origin-payoffs.js?v=5.18.0';
export {originLegacyContext,originPayoffView} from './origin-payoffs.js?v=5.18.0';
const clone=v=>JSON.parse(JSON.stringify(v));
export const inPast=w=>w.state?.chronicle?.phase==='past';
export const originLocation=(id,part=0)=>originById(id).location+part;
/** Flood fill makes every marker part of the arrival component, including furnished rooms.
 * A separate first-marker bound keeps introductions close without compressing
 * the later repair, creature and departure staging into the doorway. */
export function originAnchors(scene,maxSteps=Infinity,firstSteps=maxSteps){
 const open=(x,y)=>scene.floor[y]?.[x]==='.'&&!scene.objects.some(o=>o.footprint&&x>=o.footprint.x&&x<o.footprint.x+o.footprint.w&&y>=o.footprint.y&&y<o.footprint.y+o.footprint.h);
 let start=scene.arrive;if(!start||!open(...start)){start=null;for(let y=1;y<scene.height-1&&!start;y++)for(let x=1;x<scene.width-1;x++)if(open(x,y)){start=[x,y];break;}}
 if(!start)throw Error('Origin backdrop has no walkable arrival');
 const q=[start],seen=new Set([start.join(',')]),steps=new Map([[start.join(','),0]]);for(let i=0;i<q.length;i++){const depth=steps.get(q[i].join(','));if(depth>=maxSteps)continue;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const p=[q[i][0]+dx,q[i][1]+dy],k=p.join(',');if(open(...p)&&!seen.has(k)){seen.add(k);steps.set(k,depth+1);q.push(p);}}}
 const picked=[start.slice()];for(let n=1;n<6;n++){const options=q.filter(p=>(n!==1||steps.get(p.join(','))<=firstSteps)&&picked.every(a=>Math.hypot(p[0]-a[0],p[1]-a[1])>2.3));const next=options.reduce((best,p)=>{const d=Math.min(...picked.map(a=>Math.hypot(p[0]-a[0],p[1]-a[1])));return !best||d>best.d?{p,d}:best;},null);picked.push((next?.p||q[Math.floor(q.length*n/6)]).slice());}return picked;
}
export function expandOrigins(data){
 if(data.originsVersion)return data;data.originsVersion=1;
 ORIGINS.forEach(o=>[0,1].forEach(part=>{
  const sourceKey=o.id==='mira-archive'?['west','east'][part]:o.places[part];
  const source=data.scenes.find(r=>r.chapter===o.chapter&&r.key===sourceKey)||data.scenes.find(r=>r.key===sourceKey)||data.scenes.find(r=>r.chapter===o.chapter&&!r.household)||data.scenes.find(r=>r.key==='town');
  const scene=clone(source),anchors=originAnchors(source,12,part===0?8:12),threshold=source.household?([...source.doors,...source.objects.filter(v=>v.type==='portal')].find(v=>v.wallSide)||source.doors[0]):null;const exitXY=threshold?.xy||anchors[3];scene.location=originLocation(o.id,part);scene.key='origin_'+o.id+'_'+part;scene.title=o.region+' · '+o.era;scene.originId=o.id;scene.originPart=part;scene.originIndoor=isInteriorScene(source);scene.originSource=source.location;scene.chapter=1;scene.arrive=anchors[0];scene.doors=[];
  // This small home has authored story stations. Keep the speaker clamp at
  // its wall and Mara at the clear kitchen approach, away from the threshold.
  if(o.id==='sable-reed'&&part===0&&source.location===2&&source.household?.composition?.compactHome){anchors[0]=[21,8];anchors[1]=[24,9];anchors[2]=[27,9];scene.arrive=[...anchors[0]];}
  // Period chapters inherit architecture, never present-day NPCs, quests, doors or schedules.
  scene.objects=source.objects.filter(v=>v.type==='furnishing').map(v=>({...v,householdId:undefined,text:'Tools and household objects from '+o.era.toLowerCase()+'.'}));
  scene.householdPhysicalSites=[];for(const fixture of [...scene.objects,...(scene.household?.furnishings||[])]){delete fixture.makerMark;delete fixture.semioticDetail;}

  for(const key of ['biome','entry_text','entry_pages','entry_flag_address','entry_bit','access_requires','access_locked'])delete scene[key];
  const marker=(step,type,label,xy)=>({type,xy,originId:o.id,originStep:step,label,text:step===0?o.witness:step===3?o.dilemma:undefined,flag_address:0xa10000+o.hero,bit:step});
  if(part===0){scene.objects.push(marker(0,'npc',o.guidance[0],anchors[1]),marker(1,'puzzle',o.guidance[1],anchors[2]),{...clone(threshold||{}),type:'portal',xy:exitXY,to:'origin_'+o.id+'_1',originId:o.id,originTravel:1,label:o.passage,travel_label:o.passage});}
  else scene.objects.push({...marker(2,'patrol',o.guidance[2],anchors[1]),enemies:[[0,anchors[1]]],originScale:.65,originSpecies:['mossback-region-0','mossback-region-1','boilercrab-region-0','clockmole-region-0','reedserpent-region-0','moonmoth-region-0','brassfly-region-2'][o.hero],originName:['Wireback Scavenger','Siltback','Ember Crawler','Railback','Brine Grazer','Paper Moth','Storm Kite'][o.hero],text:o.threat},marker(2,'puzzle','Find a way past the '+o.creature,anchors[2]),marker(3,'npc',o.guidance[3],anchors[3]),{...clone(threshold||{}),...marker(4,'portal','Carry this history forward',threshold?.xy||anchors[4]),to:'origin_'+o.id+'_0'},{...clone(threshold||{}),type:'portal',xy:threshold?.xy||anchors[5],to:'origin_'+o.id+'_0',originId:o.id,originTravel:-1,label:o.returnPath,travel_label:o.returnPath});
  for(const obj of scene.objects.filter(v=>v.originId)){delete obj.requires_flags;delete obj.appears_when;delete obj.disabled_by;delete obj.buildingEntrance;delete obj.to_region;delete obj.arrive;}applyObservatoryLayout(scene);data.scenes.push(scene);if(scene.architecture?.campaign)data.buildingRegistry.push({id:'building:'+scene.location,roomLocation:scene.location,key:scene.key,chapter:1,style:scene.architecture.style,footprint:scene.architecture.outline,entrances:scene.objects.filter(v=>v.type==='portal').map(v=>({xy:v.xy,side:v.wallSide,to:v.to})),exteriorLinks:[]});
 }));return installBuildingGeometry(data);
}
export function legacyFrom(state){
 const c=state?.chronicle,unlocked=new Set([0,...(state?.recruited||[]),...(c?.unlocked||[])]);if(state?.complete)for(let i=0;i<7;i++)unlocked.add(i);
 return {armory:armoryLegacy(state),heroLegacies:normalizeHeroLegacies(state?.heroLegacies),worldAffordances:affordanceKnowledgeLegacy(state),clayMemory:normalizeCombatMemory(state?.clayMemory),encore:listeningLegacy(state),trade:economyLegacy(state),schema:ORIGIN_SCHEMA,cycle:(c?.cycle||0)+(state?.complete?1:0),unlocked:[...unlocked].filter(n=>Number.isInteger(n)&&n>=0&&n<7),patterns:[...new Set([...(state?.bossGear?.patterns||[]),...(c?.patterns||[])])].filter(id=>BOSS_GEAR.some(g=>g.id===id)),records:clone(c?.records||[]).slice(-256)};
}
export function availableOrigins(legacy){return ORIGINS.slice();}
export function validateOriginSave(s){const c=s.chronicle;if(!c)return;if(c.schema!==ORIGIN_SCHEMA||!['past','present'].includes(c.phase)||!originById(c.originId)||!Number.isInteger(c.step)||c.step<0||c.step>5||!Array.isArray(c.records)||c.records.length>256||!Array.isArray(c.unlocked)||c.unlocked.some(n=>!Number.isInteger(n)||n<0||n>6))throw Error('Invalid origin history');for(const r of c.records)if(!originById(r.originId)||![0,1].includes(r.destiny)||![0,1].includes(r.repair)||!['battle','diversion'].includes(r.approach))throw Error('Invalid historical decision');if(c.phase==='past'&&![originLocation(c.originId),originLocation(c.originId,1)].includes(s.scene))throw Error('The origin save is outside its era');if(c.phase==='past'&&s.party[0]!==originById(c.originId).hero)throw Error('The origin character does not match the save');validateOriginPayoffs(s);}
function readyOriginKit(s,o){const h=s.heroes[o.hero];if(!h.loadout?.length){h.loadout=[{core:o.core,support:'focus'}];h.mp=h.maxMp;}h.unlockedSlots=Math.max(1,h.unlockedSlots||0);h.learned|=128;if(!s.cores.includes(o.core))s.cores.push(o.core);if(!s.supports.includes('focus'))s.supports.push('focus');s.story.slots=Math.max(1,s.story.slots);s.story.mako=true;}
export function ensureOriginCombatReady(w){if(inPast(w))readyOriginKit(w.state,originById(w.state.chronicle.originId));}
export function initializeOrigin(w,id,legacy){const o=originById(id);if(!o||!availableOrigins(legacy).includes(o))throw Error('Choose a known traveller');
 const s=w.state;restoreArmoryLegacy(s,legacy?.armory);if(legacy?.heroLegacies)s.heroLegacies=normalizeHeroLegacies(legacy.heroLegacies);if(legacy?.worldAffordances)s.worldAffordances=clone(legacy.worldAffordances);syncHeroLegacies(s);if(legacy?.clayMemory)s.clayMemory=normalizeCombatMemory(legacy.clayMemory);if(legacy?.encore)s.encore=clone(legacy.encore);if(legacy?.trade){const e=economyState(s);e.stamps=(legacy.trade.stamps||[]).filter(id=>STAMPS.some(x=>x.id===id));e.heritageWorks=legacy.trade.works||0;}s.chronicle={schema:ORIGIN_SCHEMA,phase:'past',originId:id,hero:o.hero,step:0,choices:{},cycle:legacy?.cycle||0,unlocked:clone(legacy?.unlocked||[0]),records:clone(legacy?.records||[]),patterns:clone(legacy?.patterns||[]),claimed:[]};s.timeline={id:'lineage-'+s.chronicle.cycle+'-'+id,era:'origin',dayOffset:o.days};s.bossGear={version:1,patterns:clone(legacy?.patterns||[]),owned:[],claims:[]};s.party=[o.hero];s.recruited=[o.hero];s.items={tonic:2,ether:1,revive:0};
 Object.assign(s.heroes[o.hero],defaultHero(o.hero),{loadout:[],unlockedSlots:0});readyOriginKit(s,o);
 if(legacy?.journey)applyJourneyKit(s,legacy.journey,o.hero);
 s.story.journal.push({id:'origin-start',chapter:1,title:o.title,text:o.era+' · '+o.opening});
 w.loadScene(originLocation(id));w.text([o.title.toUpperCase()+'\n'+o.era+' · '+o.region,o.opening]);
}
export function originVisible(w,o){if(inPast(w)){if(o.originId!==w.state.chronicle.originId)return o.type==='furnishing';if(o.originTravel)return o.originTravel!==-1||w.state.chronicle.step!==4;return o.originStep===w.state.chronicle.step;}return !o.originId;}
export function originObjective(w){
 if(!inPast(w))return null;const c=w.state.chronicle,o=originById(c.originId),objects=w.objects();
 const here=c.step<2?0:1,wrongPart=w.scene.originPart!==here;
 if(wrongPart){const direction=here===0?-1:1;return{label:o.title+' · '+(direction===1?o.passage:o.returnPath),object:objects.find(v=>v.originTravel===direction)};}
 const labels=[o.guidance[0],o.guidance[1],o.guidance[2]+' · fight or find another way',o.guidance[3],'Carry this history into the festival'];
 const object=objects.find(v=>v.originStep===c.step&&v.type!=='patrol')||objects.find(v=>v.originTravel);
 if(c.originId==='sable-reed'&&c.step===2)return {label:'Face the Wireback or ring the side speaker',object};
 return{label:object?.role==='embodiedAction'?(object.requiresChoice?'Choose a physical control':object.label):o.title+' · '+labels[Math.min(c.step,4)],object};
}
const advance=(w,step,title,text)=>{const c=w.state.chronicle;c.step=step;w.state.story.journal.push({id:'origin:'+c.originId+':'+step,title,text,chapter:1});};
export function originInteraction(w,obj){
 if(obj.legacyId){claimLegacy(w,obj);return true;}if(!inPast(w)||!obj.originId)return false;const c=w.state.chronicle,o=originById(c.originId);
 if(obj.originTravel){w.loadScene(originLocation(o.id,obj.originTravel===-1?0:1));return true;}
 if(obj.originStep!==c.step)return true;
 if(c.step===0){readyOriginKit(w.state,o);advance(w,1,'A practical beginning',o.witness);w.text(o.witness);w.notice(o.core.toUpperCase()+' / Focus is ready · '+o.guidance[1]);return true;}
 if(c.step===1){w.choose(o.clue,o.repair.map((label,i)=>[label,()=>{c.choices.repair=i;if(i===1)w.state.items.ether++;advance(w,2,'The first repair',o.repairText[i]);w.text(o.repairText[i]+(i===0?'\nYour repair weakens the creature’s borrowed shielding.':'\nThe saved materials provide one extra Ether.')+'\n'+o.passage+'.');}]));return true;}
 if(c.step===2&&obj.type==='patrol')return false;
 if(c.step===2){w.choose(o.threat+'\nThere may be a way to move it without a fight.',[[o.peace,()=>{c.choices.approach='diversion';advance(w,3,'Room for another life',o.peace);w.rest();w.text('The '+o.creature+' follows the changed current, sound or shelter. '+o.guidance[3]+'.');}],['Face the creature',()=>{const enemy=w.objects().find(v=>v.originStep===2&&v.type==='patrol');if(enemy)w.interact(enemy);}],['Think it over',()=>{}]]);return true;}
 if(c.step===3){w.choose(o.dilemma,o.choices.map((label,i)=>[label,()=>{c.choices.destiny=i;advance(w,4,'What survives',o.consequences[i]);w.text(o.consequences[i]+'\nThe marked departure carries this decision into the present.');}]));return true;}
 if(c.step===4){w.choose(o.ending,[['Enter the festival as '+w.state.heroes[o.hero].name,()=>convergeOrigin(w)],['Stay here a little longer',()=>{}]]);return true;}return false;
}
export function originVictory(w,obj){if(!obj.originId||!inPast(w))return false;const c=w.state.chronicle;if(c.step!==2)return true;c.choices.approach='battle';w.state.xp+=25;w.state.gold+=20;w.rest();advance(w,3,'The worksite holds','The creature is driven from the worksite. Its borrowed armour showed what the settlement had thrown away.');w.text('The '+originById(c.originId).creature+' withdraws. '+originById(c.originId).guidance[3]+'.');return true;}
export function convergeOrigin(w){const c=clone(w.state.chronicle),o=originById(c.originId);if(c.step!==4||![0,1].includes(c.choices.destiny))throw Error('Finish the origin before entering the present');
 const record={originId:o.id,hero:o.hero,days:o.days,repair:c.choices.repair,destiny:c.choices.destiny,approach:c.choices.approach,effect:o.effects[c.choices.destiny],cycle:c.cycle};
 const records=[...c.records.filter(r=>r.originId!==o.id),record];
 // A fresh present-day simulation: no future flags, levels, quest completion or inventory leak backward.
 const chosenJourney=clone(w.state.journey||null),continuity=chosenJourney?{hero:clone(w.state.heroes[o.hero]),items:clone(w.state.items),xp:w.state.xp,gold:w.state.gold,cores:clone(w.state.cores),supports:clone(w.state.supports),clayMemory:normalizeCombatMemory(w.state.clayMemory),objectiveHistory:clone(w.state.objectiveHistory||null),heroLegacies:normalizeHeroLegacies(w.state.heroLegacies),worldAffordances:clone(w.state.worldAffordances||null),creatureMemory:clone(w.state.creatureMemory||null)}:null;
 const carriedArmory=clone(w.state.livingArmory||null),carriedTrailLife=clone(w.state.trailLife||null),carriedLegacies=normalizeHeroLegacies(w.state.heroLegacies),carriedKnowledge=clone(w.state.worldAffordances||null),carriedCreatureMemory=clone(w.state.creatureMemory||null),carriedAssistance=clone(w.state.questAssistance||null);const history={...c,encore:clone(w.state.encore||null),phase:'present',step:5,records,claimed:[]};w.newGame({chronicle:history,quiet:true});
 const s=w.state;if(carriedArmory)s.livingArmory=carriedArmory;if(carriedTrailLife)s.trailLife=carriedTrailLife;s.heroLegacies=carriedLegacies;if(carriedKnowledge)s.worldAffordances=carriedKnowledge;if(carriedCreatureMemory)s.creatureMemory=carriedCreatureMemory;if(carriedAssistance)s.questAssistance=carriedAssistance;syncHeroLegacies(s);s.timeline={id:'lineage-'+c.cycle+'-'+o.id,era:'present',dayOffset:0};s.bossGear={version:1,patterns:clone(c.patterns||[]),owned:[],claims:[]};s.party=o.hero===0?[0]:[o.hero,0];s.recruited=[...s.party];if(o.hero!==0){Object.assign(s.heroes[o.hero],defaultHero(o.hero),{loadout:[{core:o.core,support:'focus'}],unlockedSlots:1});s.cores=[o.core];s.supports=['focus'];s.story.slots=1;s.story.mako=true;}
 if(continuity){s.heroLegacies=continuity.heroLegacies;if(continuity.worldAffordances)s.worldAffordances=continuity.worldAffordances;if(continuity.creatureMemory)s.creatureMemory=continuity.creatureMemory;syncHeroLegacies(s);s.clayMemory=continuity.clayMemory;if(continuity.objectiveHistory)s.objectiveHistory=continuity.objectiveHistory;s.journey=chosenJourney;s.heroes[o.hero]=continuity.hero;s.items=continuity.items;s.xp=continuity.xp;s.gold=continuity.gold;s.cores=[...new Set([...s.cores,...continuity.cores])];s.supports=[...new Set([...s.supports,...continuity.supports])];s.story.slots=Math.max(1,continuity.hero.unlockedSlots||1);s.story.mako=continuity.hero.loadout.length>0;}
 s.story.journal.push({id:'origin:'+o.id,title:o.title+' · '+o.era,text:o.ending+'\n'+o.consequences[record.destiny],chapter:1});
 const arrival=journeyConvergence(s),purpose=journeyPurpose(s);s.story.journal.push({id:'arrival:'+o.id,title:s.heroes[o.hero].name+' · a reason to reach the festival',text:arrival.join('\n\n')+'\n'+purpose.promise,chapter:1});
 syncLivingArmoryStats(s);w.callbacks.onScene(w.scene);w.text([...arrival,'The past is recorded in your story journal. Look for its marked inheritance when you reach '+o.region+'.']);
}
export function legacyObjects(w){
 if(inPast(w)||!w.state.chronicle)return[];const out=[];
 for(const r of w.state.chronicle.records){
  const o=originById(r.originId),scene=w.scene;if(!o||w.state.chapter<o.chapter&&!w.state.complete||scene.chapter!==o.chapter||scene.originId)continue;
  const eligible=w.data.scenes.filter(s=>!s.originId&&!s.biome&&s.chapter===o.chapter),outdoor=eligible.filter(s=>!s.household),candidates=outdoor.length?outdoor:eligible;
  // The archive is wholly indoors. Its inheritance must not disappear merely
  // because those rooms now have furniture. Shared histories get separate sites.
  const target=candidates.find(s=>o.places.includes(s.key))||candidates[0];if(target?.location!==scene.location)continue;
  const xy=placePhysical(scene,[...out,...physicalBindings(w).filter(v=>v.physicalLocation===scene.location)]);if(!xy)continue;const payoff=originPayoff(r);
  out.push({type:'npc',xy,label:payoff?.name||o.consequences[r.destiny].split(';')[0],legacyId:r.originId,legacyEffect:r.effect,legacyService:!!w.state.chronicle.services?.includes(r.effect),legacyRoute:originRouteReady(w.state,r),text:o.present,record:r});
 }return out;
}
function claimLegacy(w,obj){
 const c=w.state.chronicle,r=obj.record,o=originById(obj.legacyId),key=r.originId+':'+r.effect,p=originPayoff(r),shelter=/clinic|relief|desk|watch|water/.test(r.effect);
 const actions=[[shelter?'Rest at the shelter':c.claimed.includes(key)?'The supplies have already been collected':'Collect the supplies left for travellers',()=>{if(shelter){w.rest();return w.text('The inherited shelter is still doing its work. HP, MP and strain restored.');}if(c.claimed.includes(key))return w.text('The next traveller will need the rest.');c.claimed.push(key);w.state.items[o.item]=(w.state.items[o.item]||0)+2;w.text('Received 2 '+(o.item==='tonic'?'Tonics':'Ethers')+' from the service you helped establish.');}]];
 if(p){actions.push([p.action,()=>{if(!activateOriginSupport(w.state,r))return;const benefit=p.mode==='care'?'The crew begins local hostile encounters with 12 protection.':'The first local hostile charge has a 0.6-second longer warning.';const route=originRouteReady(w.state,r)?p.route+' is open.':'Their local passage will open after this region’s crisis is settled.';w.callbacks.onExploration?.({type:'origin-service',scene:w.state.scene,effect:r.effect,mode:p.mode});w.text(p.text+'\n'+benefit+' This replaces any earlier inherited preparation.\n'+route);}]);if(originRouteReady(w.state,r)&&w.scenes.has(p.to))actions.push([p.route,()=>w.loadScene(p.to,w.scenes.get(p.to).arrive)]);}
 actions.push(['Leave it for another traveller',()=>{}]);w.choose(o.present+'\n'+o.consequences[r.destiny]+(p?'\n'+p.text:''),actions);
}
