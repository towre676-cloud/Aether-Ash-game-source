/* Ash & Aether: Clay and Water — Acoustic World v1.0
 * Self-contained WebAudio director. No game engine dependency.
 * Audio is OPTIONAL; all discovery returns structured data for visual/subtitle parity.
 */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const dist=(a,b)=>Math.hypot((a?.x||0)-(b?.x||0),(a?.z||0)-(b?.z||0));
const hash=(s)=>{let x=2166136261;for(const c of String(s))x=Math.imul(x^c.charCodeAt(0),16777619);return x>>>0;};
export const ACOUSTIC_SURFACES=['short_grass','tall_grass','wet_clay','dry_clay','gravel','limestone','polished_stone','wood_planks','wood_hollow','sand','snow','ash','shallow_water','wet_moss','metal_grating'];
export const BIOME_IDS=['reed_marsh','ash_grove','salt_shore','night_grassland','ember_highland','rain_market','wooden_inn','clay_forge','limestone_cavern','sunlit_ruins','crystal_aqueduct','submerged_archive','moss_cathedral','storm_rooftops','frozen_tundra','final_rift'];
export const ACOUSTIC_SIGNALS={
 water:{audio:'clue_water',description:'A hidden watercourse murmurs behind the masonry.',flag:'found_subterranean_watercourse',reward:'water_path',value:2},
 ash:{audio:'clue_ash',description:'Ash responds to a heat source below the floor.',flag:'found_ember_vein',reward:'ember_cache',value:2},
 clay:{audio:'clue_clay',description:'A clay seam resonates with a hollow chamber.',flag:'found_clay_chamber',reward:'shortcut',value:2},
 shelter:{audio:'clue_shelter',description:'You hear the breathing of a nearby safe shelter.',flag:'found_refuge',reward:'refuge',value:2},
 false_wall:{audio:'clue_false_wall',description:'A second echo exposes a false wall.',flag:'found_false_wall',reward:'secret_passage',value:4},
 beast_near:{audio:'clue_beast_near',description:'A hunting creature is approaching.',flag:'heard_hunter',reward:'ambush_warning',value:1},
 future_echo:{audio:'clue_future_echo',description:'A possible future answers the present.',flag:'heard_future_echo',reward:'future_memory',value:5},
 past_echo:{audio:'clue_past_echo',description:'A memory from another timeline echoes here.',flag:'heard_past_echo',reward:'past_memory',value:5},
 kakeya_line:{audio:'clue_kakeya_line',description:'An impossible crossing of directions leaves one audible path.',flag:'heard_line_pattern',reward:'directional_puzzle_hint',value:5},
 hydrophone:{audio:'clue_hydrophone',description:'The hydrophone has caught a distant answer.',flag:'heard_hydrophone_answer',reward:'hydrophone_map',value:4},
 mako:{audio:'clue_mako',description:'Mako energy oscillates behind the stone.',flag:'found_mako_source',reward:'mako_cache',value:3},
 secret_exit:{audio:'clue_secret_exit',description:'Air whistles through an alternate exit.',flag:'found_secret_exit',reward:'exit',value:3}
};
export function hearingModel({distance=0,range=12,occlusion=0,wind=0,water=0,materialAbsorption=0}={}){
  const propagation=1/(1+(distance/Math.max(1,range)*1.7)**2);
  return clamp(propagation*(1-.76*clamp(occlusion))*(1-.28*clamp(materialAbsorption))*(1-.16*clamp(wind))+(.10*clamp(water)));
}
export function noiseConsequences({surface='short_grass',weight='soft',weather='clear',creatureHearing=0.5,cover=0,range=11,distance=8}={}){
  const surfaceNoise={short_grass:.27,tall_grass:.35,wet_clay:.48,dry_clay:.45,gravel:.90,limestone:.75,polished_stone:.82,wood_planks:.68,wood_hollow:.95,sand:.25,snow:.24,ash:.33,shallow_water:.99,wet_moss:.20,metal_grating:1};
  const intensity=(surfaceNoise[surface]||.45)*(weight==='heavy'?1.5:.7)*(weather==='storm'?.68:1)*(1-.57*clamp(cover));
  const transmitted=intensity*hearingModel({distance,range,occlusion:cover});
  const alertDelta=clamp(transmitted*clamp(creatureHearing)*.64,0,.95);
  return {noise:Math.round(intensity*100)/100,alertDelta:Math.round(alertDelta*1000)/1000,canDrawAttention:alertDelta>.14};
}

export class AcousticWorld {
 constructor({manifestUrl='../manifest.json',assetBase='../',onCaption=()=>{},onDiscovery=()=>{},onPerception=()=>{},maxCache=54}={}){
  this.manifestUrl=manifestUrl;this.assetBase=assetBase;this.onCaption=onCaption;this.onDiscovery=onDiscovery;this.onPerception=onPerception;
  this.maxCache=maxCache;this.ctx=null;this.manifest=null;this.index=new Map();this.cache=new Map();this.buses={};this.activeAmbience=null;this.weather='clear';
  this.ambienceSerial=0;this.activeVoiceCount=0;this.listener={x:0,z:0,heading:0};this.muted=false;this.subtitles=true;this.volume={master:.72,ambience:.38,foley:.50,creature:.56,ui:.38,clue:.56,voice:.78,music:.52};this.flags=new Set();this.stepCount=0;this.eventCount=0;this.lastFootstep=0;
 }
 async init(){
  if(this.manifest)return this;
  const resp=await fetch(this.manifestUrl);if(!resp.ok)throw new Error(`Audio manifest ${resp.status}`);
  this.manifest=await resp.json();for(const a of this.manifest.assets)this.index.set(a.id,a);
  return this;
 }
 async unlock(){
  await this.init();
  if(this.ctx){if(this.ctx.state==='suspended')await this.ctx.resume();return this;}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Web Audio unavailable');
  this.ctx=new AC({latencyHint:'interactive'});this.master=this.ctx.createGain();this.master.gain.value=this.muted?0:this.volume.master;
  this.limiter=this.ctx.createDynamicsCompressor();
  this.limiter.threshold.value=-11;this.limiter.knee.value=4;this.limiter.ratio.value=10;this.limiter.attack.value=.004;this.limiter.release.value=.16;
  this.master.connect(this.limiter);this.limiter.connect(this.ctx.destination);
  for(const b of ['ambience','foley','creature','ui','clue','voice','music']){
    const node=this.ctx.createGain();node.gain.value=this.volume[b];node.connect(this.master);this.buses[b]=node;
  }
  return this;
 }
 setVolume(bus,value){if(!(bus in this.volume))return;this.volume[bus]=clamp(value);if(bus==='master'){if(this.master)this.master.gain.setTargetAtTime(this.muted?0:value,this.ctx.currentTime,.02);}else if(this.buses[bus])this.buses[bus].gain.setTargetAtTime(value,this.ctx.currentTime,.025);}
 setMuted(m){this.muted=!!m;if(this.master)this.master.gain.setTargetAtTime(m?0:this.volume.master,this.ctx.currentTime,.025);}
 setListener(x,z,heading=0){this.listener={x,z,heading};}
 async load(id){
  if(!this.ctx)return null;
  if(this.cache.has(id)){const v=this.cache.get(id);this.cache.delete(id);this.cache.set(id,v);return v;}
  const entry=this.index.get(id);if(!entry)return null;
  const url=new URL(entry.file,new URL(this.assetBase,import.meta.url));
  const response=await fetch(url);if(!response.ok)throw new Error(`Audio ${id}: HTTP ${response.status}`);
  const pcm=await this.ctx.decodeAudioData(await response.arrayBuffer());this.cache.set(id,pcm);
  // Never evict currently playing ambient samples, and never unboundedly retain all audio buffers
  while(this.cache.size>this.maxCache){const oldest=this.cache.keys().next().value;if(oldest===this.activeAmbience?.id){const retained=this.cache.get(oldest);this.cache.delete(oldest);this.cache.set(oldest,retained);continue;}this.cache.delete(oldest);}
  return pcm;
 }
 caption(text,category='world'){if(this.subtitles&&text)this.onCaption({text,category,at:Date.now()});}
 async play(id,{bus='foley',gain=1,rate=1,pan=0,pos=null,occlusion=0,delay=0,loop=false,duration=null,caption=null}={}){
  if(caption)this.caption(caption,bus);
  if(!this.ctx)return null;
  const buffer=await this.load(id);if(!buffer)return null;
  const source=this.ctx.createBufferSource();source.buffer=buffer;source.loop=loop;source.playbackRate.value=clamp(rate,.55,1.65);
  const amp=this.ctx.createGain();const now=this.ctx.currentTime;const at=now+Math.max(0,delay);
  let attenuation=1,side=pan;
  if(pos){const d=dist(pos,this.listener);attenuation=hearingModel({distance:d,range:14,occlusion});const rel=Math.atan2(pos.x-this.listener.x,pos.z-this.listener.z)-this.listener.heading;side=Math.sin(rel)*.72;}
  amp.gain.setValueAtTime(0,at);amp.gain.linearRampToValueAtTime(clamp(gain,0,1.5)*attenuation,at+.028);
  let node=amp;if(this.ctx.createStereoPanner){const stereo=this.ctx.createStereoPanner();stereo.pan.value=clamp(side,-1,1);node.connect(stereo);node=stereo;}
  if(occlusion>.01){const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=17000-14500*clamp(occlusion);node.connect(filter);node=filter;}
  source.connect(amp);node.connect(this.buses[bus]||this.buses.foley);
  source.start(at);if(duration)source.stop(at+duration);
  source.onended=()=>{try{source.disconnect();amp.disconnect();node.disconnect();}catch{}};
  return {source,amp,startTime:at,id};
 }
 async ambience(biome='reed_marsh',weather='clear'){
  this.weather=weather;
  if(!BIOME_IDS.includes(biome))biome='reed_marsh';
  if(this.activeAmbience?.id===biome)return;
  const version=++this.ambienceSerial;
  if(!this.ctx)return;
  const prev=this.activeAmbience;
  if(prev){prev.handle.amp.gain.setTargetAtTime(0,this.ctx.currentTime,.5);try{prev.handle.source.stop(this.ctx.currentTime+2.3)}catch{}}
  this.activeAmbience=null;
  const handle=await this.play(biome,{bus:'ambience',gain:weather==='storm'?.88:.70,loop:true});
  if(version!==this.ambienceSerial){try{handle?.source.stop()}catch{};return;}
  if(handle)this.activeAmbience={id:biome,handle};
  this.caption(`Environment: ${biome.replaceAll('_',' ')}.`, 'environment');
 }
 async footstep({surface='short_grass',velocity=1,sprinting=false,sneaking=false,position=null,cover=0,enemyDistance=8,enemyHearing=.5}={}){
  const now=Date.now();if(now-this.lastFootstep<(sprinting?170:260))return null;this.lastFootstep=now;
  this.stepCount++;if(!ACOUSTIC_SURFACES.includes(surface))surface='short_grass';
  const heavy=sprinting||velocity>1.55;
  const pitch=1+((hash(`${surface}:${this.stepCount}`)%21)-10)/110;
  const consequence=noiseConsequences({surface,weight:heavy?'heavy':'soft',weather:this.weather,creatureHearing:enemyHearing,cover,distance:enemyDistance});
  await this.play(`step_${surface}_${heavy?'heavy':'soft'}`,{bus:'foley',gain:sneaking?.35:clamp(.31+.16*velocity),rate:pitch,pos:position});
  this.onPerception({...consequence,kind:'footstep',surface});
  return consequence;
 }
 async creature({species='reed_stalker',intent='idle',position=null,material=null}={}){
  const id=`${species}_${intent}`;
  await this.play(this.index.has(id)?id:'reed_stalker_idle',{bus:'creature',pos:position,gain:intent==='attack'?.96:.64,rate:1,caption:intent==='alert'?`${species.replaceAll('_',' ')} detects something.`:null});
  if(material?.shield){
    // shielding changes acoustics and tactical knowledge, not just visuals
    await this.play('environmental_shield_form',{bus:'foley',gain:.76,pos:position,delay:.08,caption:`${species.replaceAll('_',' ')} draws ${material.shield} from the environment as armor.`});
  }
 }
 async combat({kind,element='clay',position=null,shieldMaterial=null}={}){
  const id=kind==='shield_break'?'environmental_shield_break':kind==='parry'?'parry_bronze':kind==='dodge'?'perfect_dodge':kind==='critical'?'critical_claystrike':`element_${element}`;
  await this.play(this.index.has(id)?id:'element_silt',{bus:'foley',gain:.90,pos:position});
  if(kind==='shield_break')this.caption(`The ${shieldMaterial||'environmental'} armor fractures; the creature is now vulnerable.`,'combat');
 }
 async interaction(action,position=null){if(!this.index.has(action))return null;return this.play(action,{bus:'foley',pos:position,gain:.79});}
 async ui(kind){return this.play('ui_'+kind,{bus:'ui',gain:.34});}
 async memory(kind='past_echo'){return this.play('clue_'+kind,{bus:'clue',gain:.78,caption:'A timeline memory is responding.'});}
 async voice(url,{gain=1,caption=null}={}){
  if(caption)this.caption(caption,'dialogue');if(!this.ctx)return null;
  // Audio samples from Runway or existing A&A voice library can use absolute or relative paths.
  let buffer;try{const response=await fetch(url);if(!response.ok)throw new Error('voice missing');buffer=await this.ctx.decodeAudioData(await response.arrayBuffer());}catch(e){this.caption(`Voice unavailable: ${e.message}`,'system');return null;}
  const src=this.ctx.createBufferSource();src.buffer=buffer;const node=this.ctx.createGain();node.gain.value=clamp(gain);
  src.connect(node);node.connect(this.buses.voice);
  const amb=this.buses.ambience, music=this.buses.music;
  this.activeVoiceCount++;
  amb.gain.setTargetAtTime(this.volume.ambience*.32,this.ctx.currentTime,.13);music.gain.setTargetAtTime(this.volume.music*.30,this.ctx.currentTime,.13);
  src.onended=()=>{this.activeVoiceCount=Math.max(0,this.activeVoiceCount-1);if(this.activeVoiceCount===0){amb.gain.setTargetAtTime(this.volume.ambience,this.ctx.currentTime,.5);music.gain.setTargetAtTime(this.volume.music,this.ctx.currentTime,.5);}};
  src.start();return src;
 }
 listen({player=this.listener,sources=[],focus=.5,knowledge=[]}={}){
  // Listening is a voluntary tactical action. It returns quest/route data even without audio.
  // Data source: game world state, never random unearned loot.
  const candidates=sources.filter(s=>s && ACOUSTIC_SIGNALS[s.kind] && !this.flags.has(s.id||s.kind)).map(s=>{
    const d=dist(player,s.position||{x:0,z:0});const audible=hearingModel({distance:d,range:(s.range||14)*(1+focus),occlusion:s.occlusion||0,wind:this.weather==='storm'?.8:0,water:s.medium==='water'?1:0});
    const knowledgeMultiplier=knowledge.includes(s.kind)?1.15:1;
    return {...s,distance:Math.round(d*10)/10,audibility:Math.round(audible*knowledgeMultiplier*1000)/1000};
  }).filter(s=>s.audibility >= (s.threshold??.22)).sort((a,b)=>b.audibility-a.audibility);
  if(!candidates.length){this.caption('You hear only ordinary echoes. Try another position or quiet the surroundings.','listening');return {found:false,reason:'no_signal',candidates:0};}
  const hit=candidates[0],sig=ACOUSTIC_SIGNALS[hit.kind];const flagId=hit.id||hit.kind;this.flags.add(flagId);
  const bearing=Math.atan2(hit.position.x-player.x,hit.position.z-player.z);
  const out={found:true,sourceId:flagId,signal:hit.kind,description:sig.description,questFlag:sig.flag,reward:sig.reward,signalValue:sig.value,bearing,bearingDegrees:Math.round(bearing*180/Math.PI),audibility:hit.audibility,distance:hit.distance};
  this.play(sig.audio,{bus:'clue',gain:.60,pan:Math.sin(bearing-this.listener.heading)*.72}).catch(()=>{});
  this.caption(`${sig.description} Bearing ${out.bearingDegrees} degrees.`, 'listening');this.onDiscovery(out);
  return out;
 }
 serialize(){return {flags:[...this.flags],volume:{...this.volume},muted:this.muted,subtitles:this.subtitles};}
 restore(snapshot={}){this.flags=new Set(snapshot.flags||[]);this.subtitles=snapshot.subtitles!==false;this.setMuted(!!snapshot.muted);for(const [k,v] of Object.entries(snapshot.volume||{}))this.setVolume(k,v);}
 dispose(){++this.ambienceSerial;try{this.activeAmbience?.handle.source.stop();this.ctx?.close();}catch{}this.ctx=null;this.cache.clear();this.activeAmbience=null;}
}
