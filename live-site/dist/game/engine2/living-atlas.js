/** Reconciled Living Atlas v8 / Living Grass v6, attached to the real campaign.
 * Canvas artwork reads the same vegetation state used by detection and encounter
 * pressure. The campaign remains the sole owner of actors, combat and rewards.
 */
import {createAAGameVegetationBridge} from './addons/living-grass-v6/aa-game-integration.mjs?v=5.21.0';
import {createVegetationState} from './addons/living-grass-v6/grass-state.mjs?v=5.21.0';
import {createResidentBridge} from './addons/atlas-v8/resident-bridge.mjs?v=5.21.0';
import {fieldPatrolPosition} from './field-patrols.js?v=5.33.0';
import {atlasLayout} from './living-atlas-layout.js?v=5.41';
import {createCampaignAtlasKernel,validateAtlasKernel} from './living-atlas-kernel.js?v=5.21.0';
import {freshAtlasEcology,advanceAtlasEcology,disturbAtlasEcology,settleAtlasEcology,atlasEcologyPace,validAtlasEcology} from './living-atlas-ecology.js?v=5.21.0';
export {drawLivingAtlas,mountLivingAtlasReadout} from './living-atlas-art.js?v=5.26.0';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const clone=x=>JSON.parse(JSON.stringify(x));
const hash=s=>{let n=2166136261;for(const c of String(s))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const timeline=s=>s.timeline?.id|| (s.chronicle?.originId?'lineage-'+(s.chronicle.cycle||0)+'-'+s.chronicle.originId:'present');
const seedFor=(id,key)=>hash(id+':'+key);
const keyFor=w=>'s'+w.state.scene;
const MAX_MAPS=384,MAX_CELLS=384;
const active=new WeakMap();
const validText=(v,n=180)=>typeof v==='string'&&v.length>0&&v.length<=n;
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const OBSERVATORY_OLD_SIZES=new Map([[50012,[64,32]],[50013,[16,32]]]);

/** Only derived spatial fields from the former observatory layouts are reset.
 * Ecology and every campaign ledger remain canonical. Validate the old payload
 * first, so a layout change cannot conceal a malformed or forged field. */
function rebaseObservatoryAtlasMaps(state,scenes){
 const maps=state?.livingAtlasV1?.maps;if(!maps||!scenes)return;
 for(const[id,oldSize]of OBSERVATORY_OLD_SIZES){
  const scene=scenes.get(id),local=maps['s'+id];
  if(scene?.originId!=='veyr-storm'||scene.observatory?.schema!==1||!local)continue;
  if(local.observatoryLayoutVersion===1)continue;
  const size=local.kernel?.size,newSize=[scene.width,scene.height];
  const matches=expected=>size?.[0]===expected[0]&&size?.[1]===expected[1];
  if(size&&!matches(oldSize)&&!matches(newSize))continue; // normal validator rejects a foreign size
  if(!size||matches(oldSize)){delete local.kernel;delete local.vegetation;}
  local.observatoryLayoutVersion=1;
 }
}

export function prepareLivingAtlasRestore(value,scenes){
 const incoming=typeof value==='string'?JSON.parse(value):value;
 validateLivingAtlas(incoming);
 const prepared=clone(incoming);rebaseObservatoryAtlasMaps(prepared,scenes);
 validateLivingAtlas(prepared,scenes);return prepared;
}

export function validateLivingAtlas(state,scenes=null){
 const save=state?.livingAtlasV1;if(save===undefined)return true;
 if(!plain(save)||save.version!==1||!validText(save.timelineId,128)||save.timelineId!==timeline(state)||!Number.isSafeInteger(save.sequence)||save.sequence<0||!Number.isFinite(save.day)||save.day<0||save.day>1e6||!Number.isFinite(save.travel)||save.travel<0||save.travel>1e8||save.restDays!==undefined&&(!Number.isFinite(save.restDays)||save.restDays<0||save.restDays>1e6)||!plain(save.maps)||Object.keys(save.maps).length>MAX_MAPS)throw Error('The saved living landscape is invalid.');
 for(const [key,m] of Object.entries(save.maps)){
  if(!/^s\d+$/.test(key)||!plain(m)||!validAtlasEcology(m.ecology)||m.ecology.lastDay>save.day+.000001)throw Error('The saved local ecology is invalid.');
  validateAtlasKernel(m.kernel);
  if(m.kernel){const scene=scenes?.get(Number(key.slice(1)));if(m.kernel.seed!==(seedFor(save.timelineId,key)|0)||m.kernel.day>Math.floor(save.day)||(scene&&(m.kernel.size[0]!==scene.width||m.kernel.size[1]!==scene.height)))throw Error('The saved Atlas field belongs to a different map.');}
  if(m.vegetation){const v=m.vegetation;
   if(!plain(v)||v.bridgeVersion!==4||v.timelineId!==save.timelineId+':'+key||v.seed!==seedFor(save.timelineId,key)||!Array.isArray(v.recentEventIds)||v.recentEventIds.length>96||v.recentEventIds.some(id=>!validText(id,160))||new Set(v.recentEventIds).size!==v.recentEventIds.length||!Array.isArray(v.rewardEventIds)||v.rewardEventIds.length)throw Error('The saved vegetation identity is invalid.');
   const p=v.vegetation;if(!plain(p)||!Array.isArray(p.entries)||p.entries.length>MAX_CELLS||!Number.isFinite(p.day)||p.day>save.day+.000001||p.entries.some(a=>!Array.isArray(a)||a.length!==7||!a.every(Number.isFinite)||a.slice(2).some(n=>n<0||n>1)||a[0]<-16||a[1]<-16||a[0]>10000||a[1]>10000)||new Set(p.entries.map(a=>a[0]+':'+a[1])).size!==p.entries.length)throw Error('The saved vegetation cells are invalid.');
   createVegetationState({seed:v.seed,cellSize:.8,maxCells:MAX_CELLS}).restore(p);
  }
 }
 return true;
}
function ledger(w){
 const s=w.state,id=timeline(s);
 if(!s.livingAtlasV1)s.livingAtlasV1={version:1,timelineId:id,sequence:0,day:0,travel:0,maps:{}};
 if(s.livingAtlasV1.timelineId!==id)throw Error('Landscape belongs to a different journey.');
 return s.livingAtlasV1;
}
function flush(w){
 const rt=active.get(w);if(!rt||rt.owner!==w.state)return;
 const entry=ledger(w).maps[rt.key];if(!entry)return;
 const snap=rt.bridge.snapshot();snap.recentEventIds=snap.recentEventIds.slice(-96);
 if(snap.vegetation.entries.length||entry.vegetation)entry.vegetation=snap;
 const numerical=rt.kernel.snapshot();if(numerical)entry.kernel=numerical;
}
function release(w){const rt=active.get(w);rt?.bridge.dispose();active.delete(w);}
function runtime(w){
 if(!w?.scene||!w?.state)return null;
 const old=active.get(w),key=keyFor(w);
 if(old?.owner===w.state&&old.scene===w.scene&&old.key===key)return old;
 flush(w);release(w);
 const state=ledger(w),layout=atlasLayout(w);
 // One bounded sparse state per visited map, never another global game root.
 if(!state.maps[key]){if(Object.keys(state.maps).length>=MAX_MAPS)return null;state.maps[key]={ecology:freshAtlasEcology()};}
 // A directly restored World may acquire the Atlas after its spatial migration.
 // The same bounded preparation applies before the first new-map field starts.
 if(w.scene.observatory?.schema===1){validateLivingAtlas(w.state);rebaseObservatoryAtlasMaps(w.state,w.scenes);}
 const local=state.maps[key],seed=seedFor(state.timelineId,key),kernel=createCampaignAtlasKernel(w,layout,seed,local.kernel);
 kernel.advance(state.day);layout.setNumerics((x,y)=>kernel.sample(x,y));
 const bridge=createAAGameVegetationBridge({seed,timelineId:state.timelineId+':'+key,renderMode:'canvas',quality:'medium',cellSize:.8,maxCells:MAX_CELLS,initialDay:state.day,initialSave:local.vegetation||null,groundOptions:layout.groundOptions,worldToScreen:(x,z,y)=>({x:x*48,y:(z-y)*48})});
 if(local.vegetation)bridge.tick(0,null,{worldDay:state.day});
 advanceAtlasEcology(local.ecology,state.day);
 const rt={owner:w.state,scene:w.scene,key,seed,layout,bridge,kernel,ecology:local.ecology,revision:0,dirty:[],walked:0,speed:.5,quality:'medium',eventSeen:new WeakSet(),settled:new WeakSet(),drawCache:new Map(),metrics:{plants:0,chunks:0,bakes:0}};
 active.set(w,rt);return rt;
}
function changed(rt,x,y,radius=1){rt.revision++;rt.dirty.push({x,y,radius});if(rt.dirty.length>32){rt.dirty.length=0;rt.drawCache.clear();}}
function footprint(w,travel){
 const rt=runtime(w);if(!rt||travel<=0||travel>1.25)return;
 const l=ledger(w);l.travel=Math.min(1e8,l.travel+travel);l.day=l.travel/2400+(l.restDays||0);
 rt.walked+=travel;rt.speed=clamp(travel/.1,.2,1);
 advanceAtlasEcology(rt.ecology,l.day);rt.kernel.advance(l.day);
 const sample=rt.bridge.sample(w.state.x,w.state.y,{speed:rt.speed});
 disturbAtlasEcology(rt.ecology,{distance:travel,noise:sample.combined.footstepNoise});
 if(rt.walked>=.38){rt.walked%=.38;rt.bridge.tick(0,null,{worldDay:l.day});rt.bridge.applyEvent({type:'footfall',x:w.state.x,z:w.state.y,radius:.48,mass:.8+rt.speed*.35});changed(rt,w.state.x,w.state.y,.7);}
}

export function installLivingAtlas(world){
 if(world.livingAtlas)return world.livingAtlas;
 const api={
  runtime:()=>runtime(world),
  sample(x,y){const rt=runtime(world);return rt?{...rt.bridge.sample(x,y,{speed:rt.speed}),fields:rt.kernel.sample(x,y)}:null;},
  encounterPace(){const rt=runtime(world);return rt?clamp(atlasEcologyPace(rt.ecology,rt.bridge.sample(world.state.x,world.state.y,{speed:rt.speed}))*rt.kernel.sample(world.state.x,world.state.y).activity,.65,1.3):1;},
  detectionMultiplier(){const rt=runtime(world);if(!rt||rt.layout.indoor)return 1;const sample=rt.bridge.sample(world.state.x,world.state.y,{speed:rt.speed});return clamp(1-sample.combined.concealment*.36+rt.ecology.alert*.1,.68,1.1);},
  applyDamage(amount,target,meta={}){if(!Number.isFinite(amount)||amount<=0||meta.dot||meta.secondary||meta.tech?.healing)return amount;const element=({flame:'fire',tide:'water',frost:'water',earth:'earth',shade:'aether',volt:'aether',gale:'aether',gravity:'aether'})[meta.tech?.core||meta.core];if(!element||!Number.isFinite(target?.x)||!Number.isFinite(target?.y)||!world.walkable(target.x,target.y))return amount;const rt=runtime(world);return rt?amount*(1-.08*clamp(rt.kernel.sample(target.x,target.y).shielding[element])):amount;},
  flush:()=>flush(world),
  listen({phase=0,sourceId='field-hydrophone'}={}){if(world.state.mode!=='field')return {ok:false,reason:'Listen between encounters.'};const hero=world.activeHeroes?.find(h=>h.hp>0);if(!hero||hero.mp<2)return {ok:false,reason:'The travelling leader needs 2 MP to sound the Hydrophone.'};if(!Number.isFinite(phase)||phase<0||phase>1||!validText(sourceId,80))return {ok:false,reason:'Invalid listening phrase.'};const rt=runtime(world);if(!rt)return {ok:false,reason:'No local field is available.'};const result=rt.kernel.listen(world.state.x,world.state.y,{phase,intensity:.35});if(result.ok){hero.mp-=2;ledger(world).sequence++;rt.revision++;rt.drawCache.clear();world.reconciledAcoustics?.signal?.('hydrophone',{x:world.state.x,y:world.state.y});world.reconciledAcoustics?.device?.('hydrophone','pulse',{x:world.state.x,y:world.state.y});flush(world);}return {...result,phase,resonance:rt.kernel.sample(world.state.x,world.state.y).resonance};},
  status(){const rt=runtime(world);if(!rt)return null;const sample=rt.bridge.sample(world.state.x,world.state.y,{speed:rt.speed}),numeric=rt.kernel.sample(world.state.x,world.state.y);return {habitat:rt.layout.biome,indoor:rt.layout.indoor,cover:sample.combined.concealment,wet:sample.vegetation.moisture,scorch:sample.vegetation.scorch,abundance:rt.ecology.abundance,alert:rt.ecology.alert,defeated:rt.ecology.defeated,peaceful:rt.ecology.peaceful,material:sample.ground.material.materialId,plants:rt.metrics.plants,day:ledger(world).day,resonance:numeric.resonance,historyEcho:numeric.historyEcho,biomass:numeric.biomass};}
 };
 world.livingAtlas=api;
 if(typeof world.move==='function'){const original=world.move.bind(world);world.move=(...args)=>{const owner=world.state,x=owner.x,y=owner.y;const result=original(...args);if(world.state===owner&&['field','battle'].includes(owner.mode))footprint(world,Math.hypot(owner.x-x,owner.y-y));return result;};}
 if(typeof world.save==='function'){const original=world.save.bind(world);world.save=(...args)=>{flush(world);return original(...args);};}
 if(typeof world.loadScene==='function'){const original=world.loadScene.bind(world);world.loadScene=(...args)=>{flush(world);return original(...args);};}
 if(typeof world.restore==='function'){const original=world.restore.bind(world);world.restore=(value,...args)=>{const prepared=prepareLivingAtlasRestore(value,world.scenes);const result=original(prepared,...args);release(world);return result;};}
 if(typeof world.newGame==='function'){const original=world.newGame.bind(world);world.newGame=(options={},...args)=>{flush(world);const prior=world.state?.livingAtlasV1,preserve=!!options.chronicle&&prior?.timelineId==='lineage-'+(options.chronicle.cycle||0)+'-'+options.chronicle.originId;const result=original(options,...args);if(preserve)world.state.livingAtlasV1=clone(prior);release(world);return result;};}
 if(typeof world.rest==='function'){const original=world.rest.bind(world);world.rest=(...args)=>{const result=original(...args),l=ledger(world);l.restDays=(l.restDays||0)+.25;l.day=l.travel/2400+l.restDays;const rt=runtime(world);if(rt){rt.bridge.tick(0,null,{worldDay:l.day});rt.kernel.advance(l.day);advanceAtlasEcology(rt.ecology,l.day);rt.revision++;rt.drawCache.clear();}return result;};}
 return api;
}

/** Called only from accepted canonical battle events; drawing never mutates this. */
export function livingAtlasBattleEvent(world,event,battle){
 if(!world?.livingAtlas||!event||typeof event!=='object')return;
 const rt=runtime(world);if(!rt||rt.eventSeen.has(event))return;rt.eventSeen.add(event);
 if(event.type==='cast'||event.type==='enemy-cast'){
  if(event.tech?.healing||event.intent?.healing)return;
  const core=event.tech?.core||event.intent?.core,type=core==='flame'?'fire':core==='tide'||core==='frost'?'water':null,element=({flame:'fire',tide:'water',frost:'water',earth:'earth',shade:'aether',volt:'aether',gale:'aether',gravity:'aether'})[core];if(!element)return;
  const targets=event.targets?.length?event.targets:event.target?[event.target]:Number.isFinite(event.intent?.x)?[{x:event.intent.x,y:event.intent.y}]:[];
  for(const t of targets.slice(0,8)){if(!Number.isFinite(t.x)||!Number.isFinite(t.y)||!world.walkable(t.x,t.y))continue;const l=ledger(world),id='cast:'+rt.key+':'+(++l.sequence);rt.kernel.cast(t.x,t.y,element,.7);const result=type?rt.bridge.applyEvent({type,eventId:id,x:t.x,z:t.y,radius:event.tech?.shape==='burst'?1.6:1,strength:.7,amount:.7}):null;changed(rt,t.x,t.y,2);if(result?.changed)disturbAtlasEcology(rt.ecology,{fire:type==='fire'?.7:0,water:type==='water'?.7:0});}
 }
 if((event.type==='instrument'||event.type==='combat-instrument')&&event.action==='listen'&&event.actor){rt.kernel.listen(event.actor.x,event.actor.y,{phase:0,intensity:.3});rt.revision++;rt.drawCache.clear();}
 if(event.type==='end'&&battle&&!rt.settled.has(battle)){
  rt.settled.add(battle);const object=world.currentBattle?.object,identity=[timeline(world.state),rt.key,object?.type||'battle',object?.serial??object?.frontierId??object?.originId??object?.bit??0,battle.context?.encounterSerial??0].join(':');
  settleAtlasEcology(rt.ecology,{id:identity.slice(0,180),enemies:battle.enemies,result:event.result});flush(world);
 }
}

/** Adapt the recovered v8 resident validator to the game's actual moving pack.
 * Successful validation returns permission to continue the caller's existing
 * battle transaction; this function never starts another battle or grants loot.
 */
export function livingAtlasResidentGate(world,object){
 if(!['patrol','wild'].includes(object?.type))return {ok:true};
 const activeObjects=[...(world.objects?.()||[]),...(world.roamingPack?.scene===world.state.scene?[world.roamingPack.object]:[])];
 const key=o=>JSON.stringify([o.type,o.serial??null,o.seed??null,o.flag_address??null,o.bit??null,o.frontierId??null,o.originId??null,o.originHero??null,o.enemies]);
 const canonical=activeObjects.find(o=>key(o)===key(object));if(!canonical)return {ok:false,reason:'This creature pack has already left.'};
 const actors=(canonical.enemies||[]).map((_,i)=>{const p=fieldPatrolPosition(world,canonical,i);return {id:'resident:'+world.state.scene+':'+hash(key(canonical))+':'+i,region:String(world.state.scene),name:'Local creature',alive:true,visible:true,x:p.x,z:p.y};});
 actors.sort((a,b)=>Math.hypot(a.x-world.state.x,a.z-world.state.y)-Math.hypot(b.x-world.state.x,b.z-world.state.y));
 if(!actors.length)return {ok:false,reason:'This pack has no active creatures.'};
 const bridge=createResidentBridge({getActor:id=>actors.find(a=>a.id===id),getParty:()=>({region:String(world.state.scene),x:world.state.x,z:world.state.y}),canReach:(a,b)=>{const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)*6));for(let j=0;j<=n;j++)if(!world.walkable(a.x+(b.x-a.x)*j/n,a.z+(b.z-a.z)*j/n))return false;return true;},guideTo:request=>({ok:false,reason:'Use the campaign guide to approach.',request}),beginBattle:request=>({ok:true,actorId:request.actorId}),observeResident:request=>({ok:true,actorId:request.actorId})});
 return bridge.engage(actors[0].id,'host-check:'+actors[0].id);
}
