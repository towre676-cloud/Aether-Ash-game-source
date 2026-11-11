/** Acoustic World v4 in the actual campaign. Authoritative host events select
 * sounds; this layer never runs a second encounter, quest or damage simulation.
 */
import {AcousticWorld} from './reconciled-content/acoustics/src/acoustic-world.js?v=5.21.0';
import {AdaptiveScore,scoreSceneForBiome} from './reconciled-content/acoustics/src/adaptive-score.js?v=5.21.0';
import {CueArbiter,resolveCue} from './reconciled-content/acoustics/src/acoustic-orchestrator.js?v=5.21.0';
import {resolveV4Cue,V4_BOSSES} from './reconciled-content/acoustics/src/acoustic-events-v4.js?v=5.21.0';
import {environmentFor} from './environment.js?v=5.18.0';
import {isInterior,objectLabel} from './presentation.js?v=5.41';

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
const position=o=>({x:o?.x??o?.xy?.[0]??0,z:o?.y??o?.xy?.[1]??0});
const textOf=o=>[o?.label,o?.name,o?.title,o?.text,o?.visual,o?.type,o?.role,o?.work,o?.activity].join(' ').toLowerCase();
const read=(storage,key,fallback)=>{try{const v=storage?.getItem(key);return v===null||v===undefined?fallback:v;}catch{return fallback;}};
export function acousticBiomeFor(scene){
 const p=[scene?.key,scene?.interior,scene?.household?.kind,environmentFor(scene||{}).style].join(' ').toLowerCase();
 if(/rift|final|null|singular/.test(p))return 'final_rift';
 if(/archive|vault/.test(p))return 'submerged_archive';
 if(/crystal|aqueduct|aether/.test(p))return 'crystal_aqueduct';
 if(/chapel|cathedral|sanctuary/.test(p))return 'moss_cathedral';
 if(/frost|snow|aurora|frozen/.test(p))return 'frozen_tundra';
 if(/cavern|crypt|tunnel|drain/.test(p))return 'limestone_cavern';
 if(/foundry|forge|kiln|workshop|instrumentworks/.test(p))return 'clay_forge';
 if(/storm|rooftop|summit/.test(p))return 'storm_rooftops';
 if(/home|inn|quarters|nursery|kitchen/.test(p)||isInterior(scene||{}))return 'wooden_inn';
 if(/market|town|commons|guild|plaza/.test(p))return 'rain_market';
 if(/salt|sand|shore|coral/.test(p))return 'salt_shore';
 if(/river|marsh|mangrove|lowbank|water/.test(p))return 'reed_marsh';
 if(/ember|lava|highland/.test(p))return 'ember_highland';
 if(/ruin|stone/.test(p))return 'sunlit_ruins';
 if(/ash|cinder/.test(p))return 'ash_grove';
 return 'night_grassland';
}
export function acousticSurfaceFor(g,scene){
 if(!g)return isInterior(scene||{})?'wood_planks':'short_grass';
 if(/grate|brass|copper|enamel/.test(g.id))return 'metal_grating';
 if(/floorboards|charwood/.test(g.id))return 'wood_planks';
 if(/dock/.test(g.id))return 'wood_hollow';
 if(/mud|silt/.test(g.id))return 'wet_clay';
 if(/sand|salt/.test(g.id))return 'sand';
 if(/snow|frost|aurora|frozen/.test(environmentFor(scene||{}).style))return 'snow';
 if(g.grassAllowed)return g.wetness>.35?'wet_moss':'short_grass';
 if(/glass|marble|mosaic|terracotta/.test(g.id))return 'polished_stone';
 if(/cinder|soot|clinker/.test(g.id))return 'ash';
 if(/gravel|pebbles|shards/.test(g.id))return 'gravel';
 if(/water-deep|water-canal/.test(g.id))return 'shallow_water';
 if(/red|earth/.test(g.id))return g.wetness>.3?'wet_clay':'dry_clay';
 return 'limestone';
}
export function acousticDeviceFor(o){
 const t=textOf(o);
 if(/hydrophone|water bowl|listening bowl/.test(t))return 'hydrophone';
 if(/sluice|floodgate|regulator|valve/.test(t))return 'sluice';
 if(/mako|conduit|reactor/.test(t))return 'mako_conduit';
 if(/resonan.*door|resonan.*gate|echo.*door/.test(t))return 'resonance_door';
 if(/drum|kiln|potter/.test(t))return 'clay_drum';
 if(/chime|bell|wind/.test(t))return 'wind_chime';
 if(/well|cistern|spring/.test(t))return 'echo_well';
 if(/clock|tide.*dial|flood.*dial/.test(t))return 'flood_clock';
 return null;
}
export function acousticRoleFor(o){
 const t=textOf(o);
 for(const [re,role] of [[/smith|forge|metalworker|hammer/,'smith'],[/boatwright|boat.*repair|shipwright/,'boatwright'],[/healer|clinic|doctor|medic/,'healer'],[/herder|stable|mossback|keeper.*beast/,'herder'],[/cartographer|mapmaker|surveyor/,'cartographer'],[/archivist|archive|librarian|records/,'archivist'],[/ferryman|ferry|boatman/,'ferryman'],[/gardener|orchard|planter|herbalist/,'gardener']])if(re.test(t))return role;
 return null;
}
const zoneFor=biome=>({reed_marsh:'marsh',salt_shore:'marsh',clay_forge:'forge',ember_highland:'forge',ash_grove:'grove',night_grassland:'grove',wooden_inn:'market',rain_market:'market',submerged_archive:'archive',crystal_aqueduct:'archive',limestone_cavern:'cavern',frozen_tundra:'cavern',sunlit_ruins:'cavern',moss_cathedral:'cathedral',storm_rooftops:'rift',final_rift:'rift'})[biome]||'grove';
const soundElement=core=>({flame:'ember',volt:'resonance',tide:'mist',frost:'mist',gale:'gale',earth:'silt',shade:'resonance',gravity:'resonance',ward:'resonance'})[core]||'silt';
const cueFor=(type,e)=>resolveV4Cue(type,e)||resolveCue(type,e);

export function createReconciledAcoustics({getWorld,onCaption=()=>{},onNotice=()=>{},storage=typeof localStorage==='undefined'?null:localStorage,transport=null}={}){
 const audio=transport||new AcousticWorld({manifestUrl:new URL('./reconciled-content/acoustics/manifest.json',import.meta.url).href,assetBase:'../',maxCache:36});
 const score=new AdaptiveScore(audio),arbiter=new CueArbiter({maxVoices:8});
 const preferences={enabled:read(storage,'aa-acoustic-enabled','on')!=='off',volume:clamp(Number(read(storage,'aa-acoustic-volume','.55'))),captions:read(storage,'aa-acoustic-captions','on')!=='off',texture:read(storage,'aa-acoustic-score','off')==='on'};
 const activeHandles=new Set(),tokenHandles=new Map(),attached=new WeakSet(),seenBattleEvents=new WeakSet(),pendingDevices=new Map();
 let active=false,ducked=false,musicEnabled=true,unlocked=false,unlocking=null,worldRef=null,stateRef=null,sceneId=null,biome=null,cycle=null,observationDebt=0,npcClock=0,lastSpot=0,frameTime=0,captionNode=null,captionTimer=null,captionText='',generation=0,lastCue=null,failures=0,lastGain=null,lastMuted=null;
 const write=(key,value)=>{try{storage?.setItem(key,String(value));}catch{}};
 const caption=(text,category='world')=>{
  if(!preferences.captions||!text||category==='environment'&&getWorld()?.scene?.originId==='veyr-storm')return;
  captionText=String(text);onCaption({text:captionText,category});
  if(captionNode){captionNode.textContent=captionText;captionNode.hidden=false;clearTimeout(captionTimer);captionTimer=setTimeout(()=>captionNode.hidden=true,4000);}
 };
 audio.onCaption=({text,category})=>caption(text,category);
 audio.setVolume('master',preferences.volume);audio.setVolume('foley',.48);audio.setVolume('creature',.5);audio.setVolume('clue',.42);audio.setVolume('music',preferences.texture?.095:0);audio.setVolume('ambience',.14);
 const ready=audio.init().catch(()=>{failures++;return null;});
 function stopTransient(){generation++;for(const handle of activeHandles)try{handle.source?.stop();}catch{}activeHandles.clear();tokenHandles.clear();arbiter.clear();}
 async function playCue(cue,{showCaption=true,gain=null}={}){
  if(!cue||!active||!preferences.enabled)return {accepted:false};
  if(showCaption&&cue.caption)caption(cue.caption,cue.bus);
  if(!unlocked)return {accepted:false,captionOnly:true};
  const decision=arbiter.request(cue);if(!decision.accepted)return decision;
  for(const displaced of decision.displaced||[])try{tokenHandles.get(displaced.token)?.source?.stop();}catch{}
  const ownGeneration=generation;
  try{
   const handle=await audio.play(cue.id,{bus:cue.bus||'foley',pos:cue.position||null,gain:gain??(cue.priority>=8?.6:.30),caption:null,loop:false});
   if(!handle){arbiter.release(decision.token);return {accepted:false};}
   if(ownGeneration!==generation||!active||!preferences.enabled){handle.source?.stop();arbiter.release(decision.token);return {accepted:false,stale:true};}
   activeHandles.add(handle);tokenHandles.set(decision.token,handle);lastCue=cue.id;
   handle.source?.addEventListener?.('ended',()=>{activeHandles.delete(handle);tokenHandles.delete(decision.token);arbiter.release(decision.token);},{once:true});
   return {accepted:true,id:cue.id};
  }catch{arbiter.release(decision.token);failures++;return {accepted:false};}
 }
 const fire=(type,event,opts)=>playCue(cueFor(type,event),opts);
 function attach(world){
  if(!world)return;
  world.reconciledAcoustics=api;
  if(worldRef!==world){worldRef=world;sceneId=null;cycle=null;pendingDevices.clear();}
  if(attached.has(world))return;attached.add(world);
  const original=world.interact.bind(world);
  world.interact=(object,...rest)=>{
   const valid=world.state.mode==='field'&&object&&world.available(object),before=valid?world.done(object):false;
   const result=original(object,...rest);
   if(valid){const device=acousticDeviceFor(object),role=acousticRoleFor(object),where=position(object);
    if(device){fire('world:device',{device,action:!before&&world.done(object)?'resolve':'activate',position:where});if(!before)pendingDevices.set(String(world.state.scene)+':'+(object.networkId||object.physicalId||object.exploreId||object.bit||device)+':'+object.xy,{scene:world.state.scene,object,device});}
    if(role&&['npc','shop','furnishing','town-npc'].includes(object.type))fire('npc:work',{role,action:object.type==='shop'?'trade':'work',position:where},{showCaption:false});
    if(['listen','listening','note'].includes(object.type)||object.listeningId)playCue({id:'clue_hydrophone',bus:'clue',priority:6,position:where,cooldownMs:1500},{showCaption:false});
    if(object.type==='cache')playCue({id:'ui_quest_new',bus:'ui',priority:3,cooldownMs:400},{showCaption:false});
   }
   return result;
  };
 }
 function observe(world){
  attach(world);if(!world)return;
  if(stateRef!==world.state){stateRef=world.state;sceneId=null;cycle=null;pendingDevices.clear();stopTransient();}
  const nextBiome=acousticBiomeFor(world.scene),nextScene=world.state.scene;
  if(nextScene!==sceneId){sceneId=nextScene;biome=nextBiome;pendingDevices.clear();npcClock=0;lastSpot=0;if(unlocked&&active){audio.ambience(biome,'clear').catch(()=>failures++);if(preferences.texture&&musicEnabled)score.setScene(scoreSceneForBiome(biome)).catch(()=>failures++);}}
  const nextCycle=world.state.chronicle?.cycle??world.state.chronicle?.run??world.state.encore?.cycle??0;
  if(cycle!==null&&nextCycle!==cycle)fire('timeline:consequence',{zone:zoneFor(biome),state:'reconcile',position:position(world.state)});
  cycle=nextCycle;
  for(const [key,row] of pendingDevices){if(row.scene!==world.state.scene){pendingDevices.delete(key);continue;}if(world.done(row.object)){fire('world:device',{device:row.device,action:'resolve',position:position(row.object)});pendingDevices.delete(key);score.setState({discovery:1});}}
 }
 const api={
  ready,preferences,audio,
  attach,
  async unlock(){
   attach(getWorld?.());if(!preferences.enabled)return false;
   if(unlocking)return unlocking;
   // Construct synchronously inside the trusted pointer/key event. The manifest
   // is already loading, so playback can safely await bytes afterwards.
   if(!transport&&!audio.ctx){const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(AC){
    const context=new AC({latencyHint:'interactive'});audio.ctx=context;audio.master=context.createGain();audio.limiter=context.createDynamicsCompressor();audio.limiter.threshold.value=-11;audio.limiter.knee.value=4;audio.limiter.ratio.value=10;audio.limiter.attack.value=.004;audio.limiter.release.value=.16;audio.master.connect(audio.limiter);audio.limiter.connect(context.destination);
    for(const bus of ['ambience','foley','creature','ui','clue','voice','music']){audio.buses[bus]=context.createGain();audio.buses[bus].gain.value=audio.volume[bus];audio.buses[bus].connect(audio.master);}audio.master.gain.value=active?preferences.volume:0;
   }}
   unlocking=(async()=>{try{await ready;await audio.unlock();unlocked=true;audio.setMuted(!active||!preferences.enabled);observe(getWorld?.());if(active&&biome){await audio.ambience(biome,'clear');if(preferences.texture&&musicEnabled)await score.setScene(scoreSceneForBiome(biome));}return true;}catch{failures++;return false;}finally{unlocking=null;}})();return unlocking;
  },
  sync({active:nextActive=false,ducked:nextDucked=false,musicEnabled:nextMusicEnabled=musicEnabled,volume}={}){
   const previous=active;active=!!nextActive;ducked=!!nextDucked;attach(getWorld?.());
   if(musicEnabled!==!!nextMusicEnabled){musicEnabled=!!nextMusicEnabled;audio.setVolume('music',musicEnabled&&preferences.texture?.095:0);if(!musicEnabled)score.stop();else if(preferences.texture&&active&&unlocked&&biome)score.setScene(scoreSceneForBiome(biome)).catch(()=>failures++);}
   if(Number.isFinite(volume))preferences.volume=clamp(volume);
   const gain=preferences.volume*(ducked?.28:1),muted=!active||!preferences.enabled;
   if(gain!==lastGain){audio.setVolume('master',gain);lastGain=gain;}if(muted!==lastMuted){audio.setMuted(muted);lastMuted=muted;}
   if(previous&&!active)stopTransient();
   if(!previous&&active&&unlocked){audio.ctx?.resume?.().catch?.(()=>{});observe(getWorld?.());if(biome)audio.ambience(biome,'clear').catch(()=>failures++);}
  },
  update(dt,{battle=null,velocity=0}={}){
   if(!Number.isFinite(dt)||dt<=0)return;frameTime+=dt;if(!active)return;
   const world=getWorld?.();if(!world)return;attach(world);audio.setListener(world.state.x,world.state.y);
   observationDebt+=dt;npcClock+=dt;lastSpot+=dt;
   if(observationDebt>=.4){observationDebt=0;observe(world);}
   const threat=battle?Math.max(.45,...battle.enemies.filter(e=>e.hp>0).map(e=>e.intent?.7:.45)):world.state.fieldEncounters?.warned?.45:0;
   score.setState({danger:threat,travel:clamp(velocity/4),bossPhase:battle?.enemies.some(e=>e.boss&&e.hp>0)?1:0,discovery:Math.max(0,(score.state.discovery||0)-dt*.2)});
   if(!battle&&npcClock>10){npcClock=0;const candidate=world.objects().filter(o=>o.xy&&acousticRoleFor(o)&&['npc','town-npc','furnishing'].includes(o.type)).map(o=>({o,d:Math.hypot(o.xy[0]+.5-world.state.x,o.xy[1]+.5-world.state.y)})).filter(v=>v.d<6).sort((a,b)=>a.d-b.d)[0];if(candidate)fire('npc:work',{role:acousticRoleFor(candidate.o),action:'idle',position:position(candidate.o)},{showCaption:false,gain:.18});}
   if(!battle&&lastSpot>18){lastSpot=0;const pack=world.roamingPack||world.objects().find(o=>['patrol','wild'].includes(o.type)&&o.xy&&Math.hypot(o.xy[0]-world.state.x,o.xy[1]-world.state.y)<9);if(pack)playCue({id:'warning_ambush_from_reeds',bus:'creature',priority:4,position:position(pack),cooldownMs:15000},{showCaption:false,gain:.22});}
  },
  battleEvent(e,battle){
   if(!e||typeof e!=='object'||seenBattleEvents.has(e))return;seenBattleEvents.add(e);
   const world=getWorld?.(),actor=e.actor,where=position(actor),chapter=battle?.chapter||world?.state.chapter||1,boss=V4_BOSSES[(chapter-1)%V4_BOSSES.length];
   if(e.type==='intent'&&actor?.boss){const cue=cueFor('boss:telegraph',{boss,phase:'windup',position:where});if(cue)cue.caption=(actor.name||'Guardian')+' prepares '+(e.intent?.label||'a strike')+' · move clear or guard.';playCue(cue);}
   else if((e.type==='boss-opening'||e.type==='interrupt')&&actor?.boss){const cue=cueFor('boss:telegraph',{boss,phase:'vulnerable',position:where});if(cue)cue.caption=(actor.name||'Guardian')+' is exposed · answer now.';playCue(cue);}
   else if(e.type==='boss-phase'&&actor?.boss){const cue=cueFor('boss:telegraph',{boss,phase:'enrage',position:where});if(cue)cue.caption=e.label||((actor.name||'Guardian')+' changes its rhythm.');playCue(cue);}
   else if(e.type==='cast'&&!e.fieldTick)playCue({id:'element_'+soundElement(e.tech?.core),bus:'foley',priority:6,position:position(e.target||actor),cooldownMs:180},{showCaption:false,gain:.38});
   else if(e.type==='enemy-cast')playCue({id:'element_'+soundElement(e.intent?.core),bus:'foley',priority:7,position:where,cooldownMs:180},{showCaption:false,gain:.4});
   else if(e.type==='guard')playCue({id:'parry_bronze',bus:'foley',priority:6,position:where,cooldownMs:250},{showCaption:false,gain:.3});
   else if(e.type==='reaction'&&/shatter|break|fracture/.test([e.reaction,e.shellState,e.label].join(' ')))playCue({id:'environmental_shield_break',bus:'foley',priority:9,position:where,caption:'The environmental shell fractures.',cooldownMs:800});
   else if(e.type==='end'){score.setState({danger:0,bossPhase:0,discovery:e.result==='win'?1:0});playCue({id:e.result==='win'?'ui_quest_new':'ui_cancel',bus:'ui',priority:5,cooldownMs:600},{showCaption:false});}
  },
  signal(signal,where){return playCue({id:'clue_'+signal,bus:'clue',priority:7,position:where?{x:where.x,z:where.z??where.y}:null,cooldownMs:700},{showCaption:false});},
  device(device,action,where){return fire('world:device',{device,action,position:where?{x:where.x,z:where.z??where.y}:null});},
  listen(){
   const world=getWorld?.();if(!world)return null;
   const sources=world.objects().filter(o=>o.xy&&(acousticDeviceFor(o)||['listen','note','puzzle','switch','clue'].includes(o.type))).map(o=>({object:o,d:Math.hypot(o.xy[0]+.5-world.state.x,o.xy[1]+.5-world.state.y)})).filter(v=>v.d<=18).sort((a,b)=>a.d-b.d);
   const found=sources[0];if(!found){caption('Only ordinary sounds here. Try another room or trail.','listening');return null;}
   const o=found.object,dx=o.xy[0]+.5-world.state.x,dy=o.xy[1]+.5-world.state.y,direction=(Math.abs(dy)>.35?(dy<0?'north':'south'):'')+(Math.abs(dx)>.35?(dx<0?'west':'east'):'');
   const result={object:o,distance:found.d,direction:direction||'nearby',label:o.label||o.name||objectLabel(o)||'a mechanism'};
   caption(result.label+' answers '+result.direction+' · '+Math.ceil(found.d)+' steps.','listening');
   playCue({id:'clue_'+(acousticDeviceFor(o)==='hydrophone'?'hydrophone':acousticDeviceFor(o)==='mako_conduit'?'mako':'clay'),bus:'clue',priority:7,position:position(o),cooldownMs:900},{showCaption:false});
   return result;
  },
  mountSettings(parent,{captionParent=typeof document==='undefined'?null:document.querySelector('#game')}={}){
   if(!parent||typeof document==='undefined')return;
   if(!document.getElementById('aa-acoustic-style')){const style=document.createElement('style');style.id='aa-acoustic-style';style.textContent='#aa-acoustic-caption{position:absolute;z-index:21;left:50%;bottom:152px;transform:translateX(-50%);max-width:min(520px,76vw);padding:7px 12px;border:1px solid #c4b08466;border-radius:8px;background:#121e25e8;color:#e7dec8;font:500 12px/1.45 system-ui;pointer-events:none;text-align:center;box-shadow:0 3px 18px #0005}.aa-acoustic-options{border-top:1px solid #b9a57533;margin-top:12px;padding-top:10px}.aa-acoustic-options label{display:flex;align-items:center;gap:10px;margin:8px 0}.aa-acoustic-options p{font-size:12px;color:#b9c9ca}.aa-acoustic-options button{min-height:40px}';document.head.append(style);}
   if(captionParent&&!captionNode){captionNode=document.createElement('div');captionNode.id='aa-acoustic-caption';captionNode.hidden=true;captionNode.setAttribute('role','status');captionNode.setAttribute('aria-live','polite');captionParent.append(captionNode);}
   const box=document.createElement('section');box.className='aa-acoustic-options';box.setAttribute('aria-label','Acoustic world');
   const title=document.createElement('strong');title.textContent='Acoustic world';box.append(title);
   for(const [key,label,storeKey] of [['enabled','Creature and mechanism sounds','aa-acoustic-enabled'],['captions','Visible sound cues','aa-acoustic-captions'],['texture','Quiet adaptive music textures','aa-acoustic-score']]){const row=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=preferences[key];input.onchange=()=>{preferences[key]=input.checked;write(storeKey,input.checked?'on':'off');if(key==='texture'){audio.setVolume('music',input.checked&&musicEnabled?.095:0);if(input.checked&&musicEnabled&&unlocked&&biome)score.setScene(scoreSceneForBiome(biome)).catch(()=>failures++);else score.stop();}if(key==='enabled'){audio.setMuted(!input.checked||!active);if(!input.checked)stopTransient();else api.unlock();}if(key==='captions'&&!input.checked&&captionNode)captionNode.hidden=true;};row.append(input,document.createTextNode(label));box.append(row);}
   const volumeRow=document.createElement('label'),volume=document.createElement('input');volume.type='range';volume.min=0;volume.max=1;volume.step=.01;volume.value=preferences.volume;volume.setAttribute('aria-label','Acoustic world volume');volume.oninput=()=>{preferences.volume=Number(volume.value);write('aa-acoustic-volume',preferences.volume);audio.setVolume('master',preferences.volume*(ducked?.28:1));};volumeRow.append(document.createTextNode('World effects'),volume);box.append(volumeRow);
   const note=document.createElement('p');note.textContent='Guardian rhythms follow their visible warnings. Listening points toward placed mechanisms; sound is optional.';box.append(note);parent.append(box);return box;
  },
  stats(){return {assets:audio.index?.size||0,enabled:preferences.enabled,musicEnabled,unlocked,active,lastCue,failures,scene:sceneId,caption:captionText};},
  dispose(){stopTransient();score.stop();audio.dispose();clearTimeout(captionTimer);captionNode?.remove();}
 };
 attach(getWorld?.());return api;
}
