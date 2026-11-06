import {displaceActor} from './combat-position.js?v=5.16.0';
import {interruptCharge} from './guardian-rules.js?v=5.18.0';
import {bellBattleContext} from './bell-witness-arc.js?v=5.16.0';
import {originLegacyContext} from './origins.js?v=5.38';
import {approachReflection} from './battle-approaches.js';
import {gearEra,gearTimeline} from './boss-gear.js?v=5.16.0';
/** Combat facts and bounded reactions. Renderers consume these exact events. */
import {equippedRelics} from './combat-relics.js?v=5.16.0';
export const REACTION_RULES=[
 ['conduct','Conduct','Volt + wet','Consumes water; 1.6× hit and shock. Stormcoil adds one nearby arc.'],
 ['freeze','Flash freeze','Frost + wet','Consumes water; slows readiness and creates one brittle opening.'],
 ['brittle','Brittle break','Physical/Earth + brittle','Consumes brittle; breaks armor and boosts that impact.'],
 ['steam','Steam veil','Flame + wet / Tide + burn','Consumes the setup, softens the hit, and extinguishes the burn. Riverglass shields allies.'],
 ['vitrify','Vitrify','Flame + shield','Softens heat and leaves a glazed defense, vulnerable to shattering.'],
 ['shatter','Glaze shatter','Physical/Earth + glazed','Consumes glaze, strips shield and armor, and strengthens that hit.'],
 ['ground','Ground fault','Earth + shock','Consumes shock to break armor and interrupt a charge.'],
 ['wildfire','Crosswind','Gale + burn','Moves some burning to one nearby enemy; no recursive spread.'],
 ['witness','Witness rupture','Shade + exposed','Consumes exposed; strengthened strike. Witness Opal adds one nearby echo.'],
 ['gravity','Gravity fold','Gravity + wet/exposed','Pulls nearby opponents toward the marked target.'],
 ['renewal','Living renewal','Mend + burn/living terrain','Cleanses burn. Graftroot converts otherwise wasted healing into a bounded shield.'],
 ['bellrest','Bellrest answer','Echo + guard + Bellrest Prism','Trades guard for a stronger single delayed repeat.'],
 ['concord','Concord bastion','Link + shielded partner + Dawnspindle','Trades partner shield for a shared guard and reduced strain.']
].map(([id,name,trigger,effect])=>({id,name,trigger,effect}));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),has=(h,id)=>equippedRelics(h).includes(id);
export function combatContext(world){const s=world.scene,key=s.key||'',chapter=s.chapter||world.state.chapter,tags=[];const biome=typeof s.biome==='object'?((s.biome.name||'')+' '+(s.biome.style||'')):(s.biome||'');const label=(key+' '+(s.interior||'')+' '+biome).toLowerCase();
 if(/river|flood|lowbank|cistern|storm|anchorage|water|marsh|coral|shoal|mangrove|brine|salt/.test(label))tags.push('wet');if(/reactor|furnace|kiln|foundry|caldera|lava/.test(label))tags.push('heat');if(/catwalk|sky|rail|security|workshop|depot|storm|crystal/.test(label))tags.push('conductive');if(/forest|grove|garden|orchard|spore|mangrove/.test(label))tags.push('living');if(/chapel|crypt|vault|gallery|chamber|crystal|marble/.test(label))tags.push('resonant');
 if(/dune|cactus|sand/.test(label))tags.push('arid');if(/glacier|ice|aurora|tundra/.test(label))tags.push('cold');if(/storm|aurora|tundra|peak/.test(label))tags.push('windy');
 const restored=world.state.physicalLore?.completed||[];if(restored.includes('vent-vane')&&chapter===22)tags.push('ventilated');if(restored.includes('shelter-reed')&&chapter===1)tags.push('shelter');if(restored.includes('bell-fork')&&chapter===16)tags.push('resonant');if(restored.includes('grounding-spool')&&chapter===6)tags.push('grounded');if(restored.includes('star-lens')&&chapter===17)tags.push('clarity');if((world.state.regionalLife?.projects||[]).includes(chapter))tags.push('prepared');
 const civic=world.state.economy?.districts?.[s.chapter||1]?.works||[];if(civic.includes('commons'))tags.push('prepared','shelter');if(civic.includes('workshop'))tags.push('grounded');return {...bellBattleContext(world),...originLegacyContext(world),version:1,timeline:{id:gearTimeline(world.state),era:gearEra(world.state)},location:s.location,key,chapter,tags:[...new Set(tags)],restorations:[...(world.state.physicalLore?.completed||[])],source:'current scene and biome'};
}
export function supplyCore(item){if(item?.id==='stormCapsule')return 'volt';if(item?.id==='smokePod')return 'shade';return ({burn:'flame',slow:'frost',slowAll:'frost',wet:'tide',tideAll:'tide',shock:'volt',exposed:'shade',markAll:'shade',leech:'shade',mpSiphon:'shade',shatter:'earth',interruptAll:'earth',blastAll:'gale'})[item?.effect]||null;}
function nearby(b,target,caster,max=1,radius=3){const allies=b.heroes.includes(target)||target.team==='heroes'?[...b.heroes,...(b.objective?.asset?[b.objective.asset]:[])]:b.enemies;return allies.filter(a=>a!==target&&a!==caster&&a.hp>0&&!a.withdrawn&&Math.hypot(a.x-target.x,a.y-target.y)<=radius).sort((a,z)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(z.x-target.x,z.y-target.y)).slice(0,max);}
function cooldown(b,key){b.reactionCooldowns??={};if((b.reactionCooldowns[key]??-10)+.6>b.time)return false;b.reactionCooldowns[key]=b.time;return true;}
export function reactionEvent(b,id,caster,target,extra={}){const rule=REACTION_RULES.find(r=>r.id===id);b.event({type:'reaction',reaction:id,label:rule?.name||id,actor:target,source:caster,core:extra.core,...extra});}
export function resolveCombatHit(b,caster,target,amount,opts={}){const result={amount,secondary:[],suppressStatus:null},s=target.status||{},core=opts.tech?.core||opts.core||supplyCore(b.pendingSupply?.item);if(opts.dot||opts.secondary||target.hp<=0)return result;const reflected=approachReflection(b,caster,target,amount);if(reflected)result.secondary.push({...reflected,caster:target});const physical=opts.physical||core==='earth',tags=b.context?.tags||[];let mult=core==='volt'&&tags.includes('grounded')?.85:1;
 const event=(id,extra={})=>reactionEvent(b,id,caster,target,{core,...extra});
 if(core==='volt'&&s.wet){delete s.wet;s.shock=1.5;mult*=1.6;event('conduct');if(has(caster,'stormcoil')&&cooldown(b,caster.id+':arc'))for(const other of nearby(b,target,caster))result.secondary.push({target:other,amount:amount*.28,core:'volt',reaction:'conduct'});}
 else if(core==='volt'&&has(caster,'stormcoil')&&(tags.includes('conductive')||tags.includes('wet'))&&cooldown(b,caster.id+':arc')){for(const other of nearby(b,target,caster))result.secondary.push({target:other,amount:amount*.2,core:'volt',reaction:'conduct'});if(result.secondary.length)event('conduct',{terrain:true});}
 if(core==='frost'&&s.wet){delete s.wet;s.brittle=tags.includes('cold')?10:8;target.atb*=.5;mult*=1.1;event('freeze');}
 if(physical&&s.brittle){delete s.brittle;target.armor=Math.max(0,(target.armor||0)-(has(caster,'frostline')?40:20));mult*=has(caster,'frostline')?1.55:1.35;event('brittle');}
 if((core==='flame'&&s.wet)||(core==='tide'&&s.burn)){delete s.wet;delete s.burn;mult*=.8;result.suppressStatus='burn';b.pendingSupply?.steamTargets?.add(target.id);event('steam');if(has(caster,'riverglass')&&cooldown(b,caster.id+':steam'))for(const ally of (b.heroes.includes(caster)?b.heroes:b.enemies).filter(a=>a.hp>0&&!a.withdrawn&&Math.hypot(a.x-caster.x,a.y-caster.y)<=3))ally.status.shield=Math.min(300,(ally.status.shield||0)+25);}
 if(core==='flame'&&(s.shield||0)>0){s.glazed=6;mult*=has(target,'kilnglaze')?.55:.75;event('vitrify');}
 if(physical&&s.glazed){delete s.glazed;s.shield=Math.max(0,(s.shield||0)-50);target.armor=Math.max(0,(target.armor||0)-25);mult*=has(caster,'kilnglaze')?1.55:1.35;event('shatter');}
 if(core==='earth'&&s.shock){delete s.shock;target.armor=Math.max(0,(target.armor||0)-30);if(target.intent)interruptCharge(b,target,caster,{core:'earth',stagger:1.2});mult*=1.2;event('ground');}
 if(core==='gale'&&s.burn&&cooldown(b,target.id+':crosswind')){const [other]=nearby(b,target,caster,1,tags.includes('windy')?4:3);if(other){other.status.burn=Math.max(other.status.burn||0,4);s.burn=Math.max(0,s.burn-2);event('wildfire',{other});}}
 if(core==='shade'&&s.exposed){delete s.exposed;mult*=1.25;event('witness');if(has(caster,'witnessopal')&&cooldown(b,caster.id+':opal'))for(const other of nearby(b,target,caster))result.secondary.push({target:other,amount:amount*.22,core:'shade',reaction:'witness'});}
 if(core==='gravity'&&(s.wet||s.exposed)){const others=nearby(b,target,caster,3).filter(other=>displaceActor(b,target,other,{mode:'pull',distance:Math.min(1.5,Math.hypot(target.x-other.x,target.y-other.y)*.4)}).success);if(others.length){delete s.exposed;event('gravity',{others});}}
 result.amount=Math.round(amount*clamp(mult,.5,2.2));return result;
}
export function resolveCombatHealing(b,caster,target,amount,tech){if(tech.core==='ward')return;const burned=!!target.status.burn;if(burned)delete target.status.burn;const surplus=Math.max(0,target.hp+amount-target.maxHp),growth=(b.context?.tags||[]).includes('living');if(has(caster,'graftroot')&&surplus>0)target.status.shield=Math.min(300,(target.status.shield||0)+Math.min(80,Math.round(surplus*.5)));if(burned||growth||has(caster,'graftroot')&&surplus>0){if(growth)target.hp=Math.min(target.maxHp,target.hp+Math.min(20,amount*.1));reactionEvent(b,'renewal',caster,target,{core:'mend'});}}
export function prepareCombatCast(b,caster,tech,partners){let echoScale=.65;if(tech.echo&&caster.status.guard&&has(caster,'bellrest')){delete caster.status.guard;echoScale=.85;reactionEvent(b,'bellrest',caster,caster,{core:tech.core});}if(tech.link&&has(caster,'dawnspindle')&&partners.some(p=>(p.status.shield||0)>=20)){for(const ally of [caster,...partners]){if(ally!==caster)ally.status.shield=Math.max(0,(ally.status.shield||0)-20);ally.status.guard=4;ally.strain=Math.max(0,(ally.strain||0)-8);}reactionEvent(b,'concord',caster,caster,{core:tech.core});}return {echoScale,echoDelay:(b.context?.tags||[]).includes('resonant')?1.4:1.8};}
export function supplyVisual(item){const e=item.effect;if(/revive/.test(e))return 'revive';if(/cleanse|Cleanse/.test(e))return 'cleanse';if(/shield|guard|insulate|cool/i.test(e))return 'ward';if(/haste|delay|rally|strain/.test(e))return 'tempo';if(/heal|mp|strain/.test(e)&&!supplyCore(item))return 'renewal';if(/dispel|interrupt|shatter|mark/.test(e))return 'break';return supplyCore(item)||'impact';}
