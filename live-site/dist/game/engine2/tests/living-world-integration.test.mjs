import test from 'node:test';
import assert from 'node:assert/strict';
import {source} from './opening-flow.mjs';
import {World} from '../world.js';
import {Battle,makeEnemy} from '../battle.js?v=5.6.0';
import {defaultHero} from '../mako.js';
import {ORIGINS} from '../origin-content.js?v=5.6.0';
import {convergeOrigin,legacyFrom,originLocation} from '../origins.js?v=5.6.0';
import {combatContext} from '../combat-reactions.js';
import {battlefieldContext} from '../battlefield-context.js';
import {objectiveEncounterContext} from '../objective-context.js';
import {buildWildEnemies,wildPositions,actualWildDrops} from '../wild-combat.js';
import {validBattlefield} from '../battlefield.js';
import {validateSave} from '../save-validation.js?v=5.6.0';
import {findPath} from '../navigation.js';
import {livingEncounterContext,settleLivingEncounter,applyLivingWorldAction} from '../living-world.js';
import {ecologyActions,settleCreatureMemory} from '../creature-ecology.js';
import {anatomySummary} from '../functional-anatomy.js';
import {previewDisplacement} from '../combat-position.js';
import {worldAffordanceObjects,worldAffordanceActions,applyWorldAffordance,WORLD_AFFORDANCE_PROFILES} from '../world-affordances.js';
import {recordLegacyDeed,equipLegacy,legacySummary} from '../hero-legacy.js';
import {isObservatoryScene} from '../observatory-layout.js';
import {installEmbodiedOrigins} from '../embodied-origins.js';

const clone=v=>JSON.parse(JSON.stringify(v));
const floor=(width=12,height=9)=>Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>[x,y])).flat();
function fixture({family='belljelly',motive='territorial',tethered=false,walkable=floor(),context={},two=true}={}){
 const h={...defaultHero(0),x:2.5,y:4.5,hp:600,maxHp:600},e=makeEnemy('scout',1),other=makeEnemy('predator',1,1);
 Object.assign(e,{x:4.5,y:4.5,hp:1000,maxHp:1000,power:1,speed:.05,family,species:family+'-region-0',ecologyMotive:motive,ecologyTethered:tethered});
 Object.assign(other,{x:9.5,y:4.5,hp:1000,maxHp:1000,power:1,speed:.01,family:'mossback',species:'mossback-region-0',ecologyMotive:'territorial'});
 const b=new Battle({heroes:[h],enemies:two?[e,other]:[e],chapter:1,inventory:{tonic:3,mossWrap:1},context:{wild:true,location:'integration-workshop',region:'integration',encounterSerial:1,reinforcementLimit:0,walkable,fieldProps:[{type:'hook',x:3.5,y:4.5,source:'Integration workbench'}],...context}});
 return {b,h,e,other};
}
function ready(b,h){for(let i=0;i<500&&h.atb<1&&!b.ended;i++)b.advance(.1);assert.equal(b.ended,null);assert.ok(h.atb>=1);}
function paid(b,h,kind,target,request){ready(b,h);assert.equal(b.command(h.id,kind,target.id,request),true,kind+':'+request.action);assert.equal(h.atb,0,'A successful action spends readiness');}
function opening(w,origin){
 w.newGame({originId:origin.id,legacy:{journey:{hero:origin.hero,seed:47}}});w.state.mode='field';
 const object={type:'wild',randomEncounter:true,habitat:'wetland',tier:1,count:1,serial:1,seed:997,xy:[Math.floor(w.state.x),Math.floor(w.state.y)]},enemies=buildWildEnemies(w,object),spots=wildPositions(w.scene,w.state.x,w.state.y,enemies.length);
 enemies.forEach((e,i)=>{e.x=spots[i][0]+.5;e.y=spots[i][1]+.5;});for(const h of w.activeHeroes){h.x=w.state.x;h.y=w.state.y;}
 const context=livingEncounterContext(w,object,objectiveEncounterContext(w,object,battlefieldContext(w,object,combatContext(w))));
 return {object,context,b:new Battle({heroes:w.activeHeroes,enemies,chapter:1,inventory:w.state.items,context})};
}
function approach(w,o){
 const cells=[[o.xy[0]+1,o.xy[1]],[o.xy[0]-1,o.xy[1]],[o.xy[0],o.xy[1]+1],[o.xy[0],o.xy[1]-1]];
 const p=cells.find(([x,y])=>w.walkable(x+.5,y+.5));assert.ok(p,'A contextual object has an accessible adjacent floor tile');[w.state.x,w.state.y]=p.map(n=>n+.5);w.state.mode='field';
}
function worldAction(w,o,request){approach(w,o);const result=applyLivingWorldAction(w,o,request);assert.equal(result.ok,true,o.affordanceId+':'+request.action+' '+result.notice);return result;}

test('all seven opening journeys pass real floor geometry, ecology and functional anatomy into Battle',()=>{
 const w=new World(source);
 for(const origin of ORIGINS){const {b,context}=opening(w,origin);assert.equal(b.ecology.enabled,true,origin.id);assert.equal(b.anatomy.enabled,true,origin.id);assert.ok(context.walkable.length>0);assert.ok(context.walkable.length<=w.scene.width*w.scene.height);for(const [x,y]of context.walkable)assert.notEqual(w.scene.floor[y]?.[x],'#');assert.equal(b.anatomy.actors.length,b.enemies.length);assert.equal(b.ecology.creatures.length,b.enemies.length);assert.ok(b.anatomy.actors.every(a=>a.parts.length>=2&&a.parts.length<=3));}
});

test('paid rescue releases a living creature and repeated commands cannot spend supplies or farm memory',()=>{
 const {b,h,e}=fixture({motive:'frightened',tethered:true});
 const row=ecologyActions(b,h,e,b.inventory).find(a=>a.action==='rescue');assert.ok(row);ready(b,h);const before=clone(b.inventory);
 assert.ok(b.command(h.id,'ecology',e.id,{action:'rescue'}));assert.equal(h.atb,0);assert.equal(e.withdrawn,true);assert.ok(e.hp>0);assert.equal(b.livingEnemies.includes(e),false);assert.ok(Object.keys(before).some(id=>(b.inventory[id]||0)<before[id]));
 h.atb=1;const items=clone(b.inventory);assert.equal(b.command(h.id,'ecology',e.id,{action:'rescue'}),false);assert.equal(h.atb,1);assert.deepEqual(b.inventory,items);
 const state={};settleCreatureMemory(state,b,'win');const saved=clone(state.creatureMemory);settleCreatureMemory(state,b,'win');assert.deepEqual(state.creatureMemory,saved);assert.ok(state.creatureMemory.individuals.length>0);
});

test('breaking a bell sac changes a real charged alarm into a nonreinforcing body attack',()=>{
 const {b,h,e}=fixture();const entry=b.anatomy.actors.find(a=>a.actorId===e.id),part=entry.parts.find(p=>p.effect==='silence');assert.ok(part,'Bell creature has a functional sound organ');
 ready(b,h);e.intent={kind:'alarm',shape:'single',target:h.id,x:h.x,y:h.y,fromX:e.x,fromY:e.y,left:999,total:999,power:12,label:'Calling the nest'};
 for(let n=0;n<12&&!part.broken;n++)paid(b,h,'anatomy',e,{action:'target-part',partId:part.id});
 assert.equal(part.broken,true);assert.ok(e.hp>0);assert.equal(e.intent.kind,'strike','The already charged alarm loses its sound-producing organ');const count=b.enemies.length;b.executeIntent(e,e.intent);assert.equal(b.enemies.length,count);assert.equal(b.reinforcements,0);e.intent=null;e.atb=1;b.planEnemy(e);assert.notEqual(e.intent.kind,'alarm');assert.ok(anatomySummary(b,e));
});

test('a broken plate becomes one real finite shared tool and stays unique through a battle save',()=>{
 const {b,h,e}=fixture({family:'mossback'}),entry=b.anatomy.actors.find(a=>a.actorId===e.id),part=entry.parts.find(p=>p.tool==='plank'||p.effect==='guard');assert.ok(part);
 for(let n=0;n<12&&!part.broken;n++)paid(b,h,'anatomy',e,{action:'target-part',partId:part.id});
 assert.equal(part.broken,true);const drops=b.field.props.filter(p=>p.id===`anatomy-${e.id}-${part.id}`);assert.equal(drops.length,1);assert.equal(drops[0].ownerId,null);assert.ok(drops[0].uses>0);assert.ok(validBattlefield(b.field,[...b.heroes,...b.enemies]));
 h.atb=1;assert.equal(b.command(h.id,'anatomy',e.id,{action:'target-part',partId:part.id}),false);assert.equal(b.field.props.filter(p=>p.id===drops[0].id).length,1);
 const saved=b.snapshot(),copy=new Battle({heroes:[defaultHero(0)],enemies:[]});copy.restore(clone(saved));assert.deepEqual(copy.anatomy,b.anatomy);assert.deepEqual(copy.field,b.field);
});

test('push and pull use both axes, respect closed floor and charge only for a legal action',()=>{
 const {b,h,e}=fixture({walkable:[[2,4],[3,4],[4,4],[5,4]]});e.x=4.5;e.y=4.5;
 const preview=previewDisplacement(b,h,e,{mode:'push',distance:1.5});assert.ok(preview);paid(b,h,'position',e,{action:'push'});assert.ok(e.x>4.5);assert.ok(e.x<6);assert.equal(e.y,4.5);
 h.atb=1;h.x=3.5;e.x=5.95;const old=[e.x,e.y];assert.equal(previewDisplacement(b,h,e,{mode:'push',distance:1.5}).enabled,false);assert.equal(b.command(h.id,'position',e.id,{action:'push'}),false);assert.equal(h.atb,1);assert.deepEqual([e.x,e.y],old);
 const vertical=fixture({walkable:floor()});vertical.h.x=4.5;vertical.h.y=2.5;vertical.e.x=4.5;vertical.e.y=4.5;paid(vertical.b,vertical.h,'position',vertical.e,{action:'pull'});assert.equal(vertical.e.x,4.5);assert.ok(vertical.e.y<4.5);
});

test('real redirected line attacks can strike another enemy and do not award a hero-only fake hit',()=>{
 const {b,h,e,other}=fixture();e.x=8.5;e.y=4.5;other.x=4.5;other.y=4.5;paid(b,h,'position',other,{action:'push'});const hp=other.hp;
 const intent={kind:'strike',shape:'line',target:h.id,x:h.x,y:h.y,fromX:e.x,fromY:e.y,left:1,total:1,power:12,label:'Committed charge'};b.executeIntent(e,intent);
 assert.ok(other.hp<hp,'A rival on the real attack line takes collateral damage');assert.ok(b.events.some(event=>event.type==='damage'&&event.actor===other&&event.source===e));
});

test('withdrawn living creatures yield neither species loot nor defeat counts when an intact objective wins',()=>{
 const w=new World(source),{b,object}=opening(w,ORIGINS[0]);for(const e of b.enemies){e.withdrawn=true;e.intent=null;const r=b.ecology.creatures.find(r=>r.actorId===e.id);r.withdrawn=true;r.withdrawReason='The creature leaves the route clear.';}b.advance(.1);assert.equal(b.ended,'win');object.defeatedSpecies=[];assert.deepEqual(actualWildDrops(object),[]);
 w.state.mode='battle';w.currentBattle={scene:w.scene.location,object,mission:{...w.mission,id:1}};settleLivingEncounter(w,b,'win');const before=clone(w.state.monsterJournal?.victories||{});w.winBattle();assert.deepEqual(w.state.monsterJournal.victories,before);assert.deepEqual(object.defeatedSpecies,[]);
});

test('an earned ceramic arm creates a real one-use crossing and occupies the carried-tool hand',()=>{
 const w=new World(source);w.newGame({originId:ORIGINS[0].id});w.state.mode='field';
 assert.equal(recordLegacyDeed(w.state,{id:'saved-pressure-worksite',heroId:0,kind:'objective',goal:'regulator',success:true,label:'Saved the pressure worksite'}).added,true);
 const ether=w.state.items.ether;assert.equal(equipLegacy(w.state,0,'ceramic-arm'),true);assert.equal(w.state.items.ether,ether,'The first earned attunement is free');
 const {b,h,e}=fixture({context:{heroLegacies:w.state.heroLegacies}}),prop=b.field.props[0];if(prop.ownerId!==null)paid(b,h,'field',e,{action:'disarm',propId:prop.id});
 const mp=h.mp;paid(b,h,'legacy',e,{action:'anchor'});assert.equal(h.mp,mp-5);assert.equal(b.legacy.anchors.length,1);
 h.atb=1;assert.equal(b.command(h.id,'field',e.id,{action:'take',propId:prop.id}),false,'The anchoring hand cannot also take a tool');assert.equal(h.atb,1);
 e.x=6.5;e.y=h.y;const hp=h.hp,intent={kind:'strike',shape:'single',target:h.id,x:h.x,y:h.y,fromX:e.x,fromY:e.y,power:18};b.executeIntent(e,intent);assert.equal(h.hp,hp);assert.equal(b.legacy.anchors[0].charges,0);b.executeIntent(e,intent);assert.ok(h.hp<hp,'A spent crossing does not stop a second attack');
});

test('body history survives save, origin convergence and a new telling without carrying future physical supplies',()=>{
 const w=new World(source);opening(w,ORIGINS[1]);
 recordLegacyDeed(w.state,{id:'listened-before-entry',heroId:1,kind:'scouting',success:true,label:'Found a quieter way into the workshop'});assert.equal(equipLegacy(w.state,1,'ash-shadow'),true);const legacy=clone(w.state.heroLegacies);
 const snapshot=w.save(),copy=new World(source);copy.restore(snapshot);assert.deepEqual(copy.state.heroLegacies,legacy);assert.equal(copy.state.heroes[1].legacy.transformation,'ash-shadow');
 w.state.chronicle.step=4;w.state.chronicle.choices={repair:0,destiny:0,approach:'battle'};convergeOrigin(w);assert.deepEqual(w.state.heroLegacies,legacy);assert.equal(legacySummary(w.state,1).equipped,'ash-shadow');
 w.newGame({originId:ORIGINS[6].id,legacy:legacyFrom(w.state)});assert.deepEqual(w.state.heroLegacies,legacy);assert.equal(w.state.chronicle.phase,'past');assert.equal(w.state.party[0],6);assert.equal(w.state.heroes[1].legacy.transformation,'ash-shadow');
});

test('enhanced save preflight rejects malformed anatomy, ecology and body history before replacing active progress',()=>{
 const w=new World(source),{b,object}=opening(w,ORIGINS[2]);w.state.mode='battle';const value={schema:'ash-aether.enhanced-save/1',world:JSON.parse(w.save()),battle:b.snapshot(),origin:{scene:w.scene.location,type:'wild',practice:clone(object)}};const beforeImport=JSON.stringify(value),checked=validateSave(source,value);assert.notEqual(checked,value);assert.deepEqual(checked,value);assert.equal(JSON.stringify(value),beforeImport);
 const anatomy=clone(value);anatomy.battle.anatomy.actors[0].parts[0].integrity=-1;assert.throws(()=>validateSave(source,anatomy),/anatomy|living|creature/i);
 const ecology=clone(value);ecology.battle.ecology.walkable[0][0]=Infinity;assert.throws(()=>validateSave(source,ecology),/ecology|living|creature/i);
 const legacy=clone(value);legacy.world.heroLegacies={version:1,heroes:[],settled:[]};const before=w.save();assert.throws(()=>validateSave(source,legacy),/legacy|histories|history|living/i);assert.equal(w.save(),before);
});

test('openings retain finite travel repairs and the authored observatory uses its native grounded mechanism',()=>{
 const w=new World(source);
 for(const origin of ORIGINS){
  w.newGame({originId:origin.id});w.state.mode='field';
  if(isObservatoryScene(w.scene)){
   const events=[],controller=installEmbodiedOrigins(w,{onFeedback:event=>events.push(event)}),floor=clone(w.scene.floor),beforeItems=clone(w.state.items);
   const operate=key=>{const o=controller.objects().find(o=>o.embodiedAction===key);assert.ok(o,key+' native control');assert.ok(findPath(w.scene,[w.state.x,w.state.y],o.xy,1).length,key+' reachable');approach(w,o);assert.equal(controller.beginAction(o,{manual:true}),true);controller.setProgress(1,{point:o.to});assert.equal(controller.completeAction(),true);return o;};
   assert.deepEqual(worldAffordanceObjects(w),[]);assert.deepEqual(w.scene.affordanceBlocked,[]);
   operate('witness');assert.equal(w.state.chronicle.step,1);assert.equal(controller.objects().some(o=>o.embodiedAction.startsWith('repair-')),false,'the native repair requires real grounding');
   operate('ground');assert.equal(controller.snapshot().devices.grounded,true);assert.equal(controller.snapshot().devices.vaneRaised,false);assert.deepEqual(w.state.items,beforeItems,'grounding does not consume unrelated travel stock');
   const repair=operate('repair-0');assert.equal(controller.snapshot().devices.vaneRaised,true);assert.equal(w.state.chronicle.step,2);assert.equal(w.state.chronicle.choices.repair,0);assert.ok(events.some(e=>e.type==='complete'&&e.kind==='vane'&&e.from===0&&e.to===1),'native geometry receives the before/after vane transition');
   const after=clone(w.state);assert.equal(controller.beginAction(repair),false,'completed native repairs cannot pay again');assert.deepEqual(w.state,after);assert.deepEqual(w.scene.floor,floor,'native mast work does not invent a generic blocked floor tile');assert.deepEqual(worldAffordanceObjects(w),[]);controller.destroy();continue;
  }
  let objects=worldAffordanceObjects(w);if(!objects.some(o=>o.affordanceKind==='site')){w.loadScene(originLocation(origin.id,1));w.state.mode='field';objects=worldAffordanceObjects(w);}const site=objects.find(o=>o.affordanceKind==='site'),sources=objects.filter(o=>o.affordanceKind==='salvage');assert.ok(site,origin.id);assert.equal(sources.length,2,origin.id);const shown=new Set(w.objects().filter(o=>o.type==='affordance').map(o=>o.affordanceId));assert.ok(objects.every(o=>shown.has(o.affordanceId)),'Past-era availability exposes the same contextual systems');
  let opened=null;w.callbacks.onAffordance=o=>{opened=o;};approach(w,sources[0]);w.interact(sources[0]);assert.equal(opened.affordanceId,sources[0].affordanceId);assert.equal(w.state.mode,'field','Inspection opens the shared contextual picker without a story dialog');
  for(const o of sources){assert.equal(w.scene.floor[o.xy[1]][o.xy[0]],'.');worldAction(w,o,{action:'take'});const kit=clone(w.state.worldAffordances.kit);assert.equal(applyWorldAffordance(w,o,{action:'take'}).ok,false);assert.deepEqual(w.state.worldAffordances.kit,kit);}
  approach(w,site);assert.equal(w.walkable(site.xy[0]+.5,site.xy[1]+.5),false);assert.deepEqual(findPath(w.scene,[w.state.x,w.state.y],site.xy),[],'Click travel respects the same closed tile');const p=WORLD_AFFORDANCE_PROFILES.find(p=>p.id===site.profileId),gold=w.state.gold,flags=clone(w.state.flags),bosses=clone(w.state.bosses);worldAction(w,site,{action:'assemble'});assert.equal(w.walkable(site.xy[0]+.5,site.xy[1]+.5),true);assert.deepEqual(findPath(w.scene,[w.state.x,w.state.y],site.xy).at(-1),site.xy.map(n=>n+.5));assert.equal(w.state.gold,gold+8);assert.ok(p.primary.every(t=>w.state.worldAffordances.kit[t]===0));assert.deepEqual(w.state.flags,flags);assert.deepEqual(w.state.bosses,bosses);assert.equal(applyWorldAffordance(w,site,{action:'assemble'}).ok,false);assert.equal(w.state.gold,gold+8,'A completed repair cannot pay twice');
 }
});

test('scouting and finite preparation change the real encounter and apply only to the prepared contact',()=>{
 const w=new World(source);w.newGame({originId:ORIGINS[2].id});w.state.mode='field';const objects=worldAffordanceObjects(w),scout=objects.find(o=>o.affordanceKind==='scout');assert.ok(scout);
 for(const o of objects.filter(o=>o.affordanceKind==='salvage'))worldAction(w,o,{action:'take'});
 const heard=worldAction(w,scout,{action:'scout'});assert.equal(heard.evidence.length,2);assert.ok(heard.evidence.every(s=>typeof s==='string'&&s.length>10));assert.equal(heard.enemies,undefined);const hooks=w.state.worldAffordances.kit.hook;worldAction(w,scout,{action:'prepare',plan:'flank'});assert.equal(w.state.worldAffordances.kit.hook,hooks-1);
 const object={type:'wild',randomEncounter:true,habitat:'workshop',tier:1,count:1,serial:11,seed:10967,xy:[Math.floor(w.state.x),Math.floor(w.state.y)]},raw=buildWildEnemies(w,object);raw[0].x=w.state.x;raw[0].y=w.state.y+1;const old=[raw[0].x,raw[0].y];for(const h of w.activeHeroes){h.x=w.state.x;h.y=w.state.y;}
 const context=livingEncounterContext(w,object,objectiveEncounterContext(w,object,battlefieldContext(w,object,combatContext(w))));assert.equal(context.recon.plan,'flank');const b=new Battle({heroes:w.activeHeroes,enemies:raw,chapter:1,inventory:w.state.items,context});assert.notDeepEqual([raw[0].x,raw[0].y],old);assert.ok(context.walkable.some(([x,y])=>x===Math.floor(raw[0].x)&&y===Math.floor(raw[0].y)));assert.equal(raw[0].reconUnused,true);
 const i={kind:'strike',shape:'single',target:b.heroes[0].id,x:b.heroes[0].x,y:b.heroes[0].y,fromX:raw[0].x,fromY:raw[0].y,left:1,total:1,power:10,label:'Aimed strike'};b.event({type:'intent',actor:raw[0],intent:{...i}});assert.equal(raw[0].intent.left,2.1);b.event({type:'intent',actor:raw[0],intent:{...i}});assert.equal(raw[0].intent.left,1,'Only the initial charge receives the preparation delay');
 const next=livingEncounterContext(w,{...object,serial:12},{});assert.equal(next.recon,undefined);assert.equal(w.state.worldAffordances.kit.hook,hooks-1);assert.equal(applyWorldAffordance(w,scout,{action:'prepare',plan:'flank'}).ok,false);
});

test('a known physical rhythm works without clue flags and only its knowledge survives a new telling',()=>{
 const w=new World(source);w.newGame({originId:ORIGINS[1].id});w.state.mode='field';const site=worldAffordanceObjects(w).find(o=>o.affordanceKind==='site'),p=WORLD_AFFORDANCE_PROFILES.find(p=>p.id===site.profileId);assert.ok(site);assert.equal(w.state.worldAffordances.knowledge.includes(p.id),false);assert.ok(worldAffordanceActions(w,site).some(a=>a.action==='beat'));
 for(const beat of p.pattern)worldAction(w,site,{action:'beat',beat});assert.equal(w.state.worldAffordances.sites[site.affordanceId].solved,true);assert.equal(w.state.worldAffordances.knowledge.includes(p.id),true);assert.equal(w.walkable(site.xy[0]+.5,site.xy[1]+.5),true);assert.ok(legacySummary(w.state,1).unlocked.includes('ash-shadow'),'An actual knowledge solution writes the corresponding body history');
 const objects=worldAffordanceObjects(w),spare=objects.find(o=>o.affordanceKind==='salvage');worldAction(w,spare,{action:'take'});assert.ok(Object.values(w.state.worldAffordances.kit).some(n=>n>0));
 const legacy=legacyFrom(w.state);w.newGame({originId:ORIGINS[1].id,legacy});w.state.mode='field';const reopened=worldAffordanceObjects(w).find(o=>o.affordanceKind==='site');assert.ok(w.state.worldAffordances.knowledge.includes(p.id));assert.ok(Object.values(w.state.worldAffordances.kit).every(n=>n===0));assert.notEqual(w.state.worldAffordances.sites[reopened.affordanceId]?.solved,true);assert.equal(w.state.worldAffordances.sources.length,0);for(const beat of p.pattern)worldAction(w,reopened,{action:'beat',beat});assert.equal(w.state.worldAffordances.sites[reopened.affordanceId].solved,true);
});

test('packing transfers one travel tool into one real shared battlefield without replenishment on retreat',()=>{
 const w=new World(source);w.newGame({originId:ORIGINS[2].id});w.state.mode='field';const spare=worldAffordanceObjects(w).find(o=>o.affordanceKind==='salvage');worldAction(w,spare,{action:'take'});assert.equal(w.state.worldAffordances.kit[spare.toolType],1);worldAction(w,spare,{action:'pack',tool:spare.toolType});assert.equal(w.state.worldAffordances.kit[spare.toolType],0);
 const object={type:'wild',randomEncounter:true,habitat:'workshop',tier:1,count:1,serial:7,seed:6979,xy:[Math.floor(w.state.x),Math.floor(w.state.y)]},enemies=buildWildEnemies(w,object),spots=wildPositions(w.scene,w.state.x,w.state.y,enemies.length);enemies.forEach((e,i)=>{e.x=spots[i][0]+.5;e.y=spots[i][1]+.5;});for(const h of w.activeHeroes){h.x=w.state.x;h.y=w.state.y;}
 const base=objectiveEncounterContext(w,object,battlefieldContext(w,object,combatContext(w))),context=livingEncounterContext(w,object,base),b=new Battle({heroes:w.activeHeroes,enemies,chapter:1,inventory:w.state.items,context});assert.equal(context.recon.packed,spare.toolType);assert.equal(b.field.props.filter(p=>p.source==='Finite tool packed from the travel kit').length,1);assert.equal(b.field.props.find(p=>p.source==='Finite tool packed from the travel kit').type,spare.toolType);
 const again=livingEncounterContext(w,object,base);assert.equal(again.fieldProps.filter(p=>p.source==='Finite tool packed from the travel kit').length,1);w.currentBattle={scene:w.scene.location,object,mission:{...w.mission,id:1}};settleLivingEncounter(w,b,'retreat');assert.equal(w.state.worldAffordances.kit[spare.toolType],0);const later=livingEncounterContext(w,{...object,serial:8},base);assert.equal((later.fieldProps||[]).some(p=>p.source==='Finite tool packed from the travel kit'),false);
});

test('an actual paid nourishment credits the acting companion and settles its legacy only once',()=>{
 const w=new World(source);w.newGame({originId:ORIGINS[0].id});w.state.mode='field';w.state.party=[0,1];w.state.recruited=[0,1];for(const [i,h]of w.activeHeroes.entries()){h.x=2.5+i;h.y=4.5;}
 const e=makeEnemy('predator',1);Object.assign(e,{x:4.5,y:4.5,hp:300,maxHp:300,power:1,speed:.01,family:'mossback',species:'mossback-region-0',ecologyMotive:'hungry'});
 const b=new Battle({heroes:w.activeHeroes,enemies:[e],inventory:w.state.items,chapter:1,context:{wild:true,location:'companion-deed',encounterSerial:21,walkable:floor(),reinforcementLimit:0}}),h=b.heroes.find(h=>h.id===1),tonics=w.state.items.tonic;paid(b,h,'ecology',e,{action:'food'});assert.equal(w.state.items.tonic,tonics-1);
 const object={type:'wild',randomEncounter:true,habitat:'meadow',tier:1,count:1,serial:21,seed:20937,xy:[Math.floor(w.state.x),Math.floor(w.state.y)]};w.currentBattle={scene:w.scene.location,object,mission:{...w.mission,id:1}};settleLivingEncounter(w,b,'retreat');assert.ok(legacySummary(w.state,1).unlocked.includes('reed-ear'));assert.equal(legacySummary(w.state,0).deeds,0,'The leader did not perform the companion’s action');const state=clone(w.state.heroLegacies);settleLivingEncounter(w,b,'retreat');assert.deepEqual(w.state.heroLegacies,state);
});


test('an earned ceramic crossing protects a real regulator from a crossing sabotage once',()=>{
 const w=new World(source);w.state.mode='field';recordLegacyDeed(w.state,{id:'protected-regulator',heroId:0,kind:'objective',goal:'regulator',success:true});assert.ok(equipLegacy(w.state,0,'ceramic-arm'));
 const objective={id:'arm-regulator',kind:'regulator',label:'Protect the regulator',walkable:floor(),asset:{id:'regulator',name:'Regulator',x:1.5,y:4.5,hp:100,maxHp:100},required:3,deadline:80,stableTime:8};
 const {b,h,e}=fixture({context:{heroLegacies:w.state.heroLegacies,objective}});paid(b,h,'legacy',e,{action:'anchor'});e.x=4;e.y=4.5;const asset=b.objective.asset,hp=asset.hp,pressure=b.objective.pressure;
 const i={kind:'objective-sabotage',objectiveId:b.objective.id,shape:'line',target:asset.id,x:asset.x,y:asset.y,fromX:e.x,fromY:e.y,power:12};b.executeIntent(e,i);assert.equal(asset.hp,hp);assert.equal(b.objective.pressure,pressure);assert.equal(b.legacy.anchors[0].charges,0);b.executeIntent(e,i);assert.ok(asset.hp<hp);
});
