import {MUSIC_MIX,musicGain} from './music-mix.js?v=5.23.0';
import {isInteriorScene} from './scene-identity.js?v=5.23.0';
import {environmentFor} from './environment.js?v=5.23.0';

/** Recording selection only. The director owns history, timing, rests and
 * interruptions; this module never changes a save or starts an audio source.
 * These are existing recordings with their original titles, not new works. */
const unique=values=>[...new Set(values.filter(Boolean))];
const finite=(value,fallback)=>Number.isFinite(value)?value:fallback;

export function createMusicLibrary({catalog,rpgManifest,baseUrl=new URL('../../',import.meta.url)}={}){
 const base=new URL('.',baseUrl),library=new Map();
 function add(track,rpg=false){
  if(!track||typeof track.id!=='string'||typeof track.audio!=='string')return;
  const path=rpg?'game/music/rpg/'+track.audio:track.audio;
  const mix=MUSIC_MIX[path],start=Math.max(0,finite(track.start_s,0));
  const available=finite(mix?.duration,Infinity),declared=finite(track.end_s,rpg?finite(track.loopEnd,track.duration_s):start+finite(track.duration_s,0));
  const end=Math.min(available,declared),duration=Math.max(0,end-start);
  if(!Number.isFinite(end)||duration<=0)return;
  const id=rpg?'rpg:'+track.id:track.id,audio=new URL(path,base).href;
  library.set(id,Object.freeze({...track,id,title:track.title||track.id,audio,
   start_s:start,end_s:end,duration,duration_s:duration,loop:false,rpg,
   gain:musicGain(mix?.lufs),integratedLufs:mix?.lufs??null,family:track.theme_family||track.motif_family||id,
   recordingKey:mix?.sha256||track.audio_sha256||track.sha256||audio,
   sourcePath:path}));
 }
 for(const track of catalog?.tracks||[])add(track);
 for(const track of rpgManifest?.tracks||[])add(track,true);
 return library;
}

// Leading entries favor the longer district performances. Short authored cues
// add local color once between rests; none is an endless field loop.
const POOLS={
 home:{label:'Home and refuge',ids:['dyletsky_home','rest_by_the_gate','hometown_before_dawn','letters_never_sent','small_courtyard','rpg:home'],night:['dyletsky_chapel','night_flower'],late:['orchard_after_fire']},
 town:{label:'Settlement streets',ids:['dyletsky_home','unexpected_friend','millennial_morning','small_courtyard','undercity_lanterns','rpg:town'],night:['night_flower','hometown_before_dawn'],late:['planet_beneath_us']},
 workshop:{label:'Workshops and machinery',ids:['dyletsky_workshop','pressure_valves','station_under_ash','reactor_lattice','hidden_assembly','rpg:workshop'],night:['dyletsky_workshop','silent_orbit'],late:['horizon_engine']},
 archive:{label:'Archives and quiet study',ids:['dyletsky_archive','letters_never_sent','glass_memory','pendant_of_embers','names_in_snow','rpg:archive'],night:['dyletsky_archive','night_flower'],late:['hometown_before_dawn']},
 chapel:{label:'Chapels and listening rooms',ids:['dyletsky_chapel','chapel_of_rain','night_flower','reunion_of_waters','rest_by_the_gate','rpg:chapel'],night:['dyletsky_chapel','names_in_snow'],late:['letters_never_sent']},
 water:{label:'Rivers and shorelines',ids:['dyletsky_tide','river_road','reunion_of_waters','ruined_sea','halls_beneath_water','rpg:water_cavern'],night:['dyletsky_tide','silent_orbit'],late:['planet_beneath_us']},
 grove:{label:'Gardens and woodland',ids:['dyletsky_home','river_road','orchard_after_fire','planet_beneath_us','rest_by_the_gate','rpg:garden'],night:['night_flower','dyletsky_chapel'],late:['reunion_of_waters']},
 highland:{label:'High paths and open sky',ids:['dyletsky_sky','silent_orbit','river_road','horizon_engine','planet_beneath_us','names_in_snow'],night:['silent_orbit','dyletsky_sky'],late:['reunion_of_waters']},
 frost:{label:'Snow and winter shelter',ids:['dyletsky_chapel','names_in_snow','dyletsky_sky','rest_by_the_gate','hometown_before_dawn','silent_orbit'],night:['names_in_snow','dyletsky_chapel'],late:['orchard_after_fire']},
 cavern:{label:'Caverns and underground passages',ids:['dyletsky_tide','halls_beneath_water','beneath_the_well','pendant_of_embers','glass_memory','rpg:dungeon'],night:['dyletsky_archive','beneath_the_well'],late:['silent_orbit']},
 ruins:{label:'Ruins and remembered places',ids:['dyletsky_archive','ruined_sea','glass_memory','names_in_snow','pendant_of_embers','orchard_after_fire'],night:['silent_orbit','dyletsky_archive'],late:['planet_beneath_us']},
 rail:{label:'Railways and platforms',ids:['dyletsky_workshop','station_under_ash','reactor_lattice','undercity_lanterns','pressure_valves','horizon_engine'],night:['silent_orbit','dyletsky_workshop'],late:['signal_before_dawn']},
 desert:{label:'Dry country and distant paths',ids:['dyletsky_sky','ruined_sea','planet_beneath_us','river_road','silent_orbit','rest_by_the_gate'],night:['names_in_snow','silent_orbit'],late:['horizon_engine']},
 field:{label:'Open-country exploration',ids:['dyletsky_sky','river_road','dyletsky_home','planet_beneath_us','epoch_of_clay','rest_by_the_gate'],night:['night_flower','silent_orbit'],late:['reunion_of_waters']}
};

// Origin keys replace generic generated-map keys. Each opening has its own
// first two recordings, and its second scene follows the actual local place.
const ORIGIN_POOLS={
 'sable-reed':{label:'Sable · Cinderfall',places:['home','town'],ids:[['dyletsky_home','rest_by_the_gate','hometown_before_dawn','small_courtyard','letters_never_sent','rpg:sable'],['small_courtyard','river_road','dyletsky_home','unexpected_friend','millennial_morning','planet_beneath_us']]},
 'iona-lowbank':{label:'Iona · Lowbank',places:['home','water'],ids:[['dyletsky_tide','reunion_of_waters','rest_by_the_gate','dyletsky_home','halls_beneath_water','rpg:iona'],['rest_by_the_gate','river_road','dyletsky_tide','reunion_of_waters','ruined_sea','hometown_before_dawn']]},
 'rook-regulator':{label:'Rook · winter workshop',places:['workshop','town'],ids:[['dyletsky_workshop','pressure_valves','station_under_ash','reactor_lattice','hidden_assembly','rpg:rook'],['station_under_ash','undercity_lanterns','dyletsky_workshop','small_courtyard','pressure_valves','hidden_assembly']]},
 'brass-rail':{label:'Brass · rail quarter',places:['rail','rail'],ids:[['station_under_ash','dyletsky_workshop','reactor_lattice','pressure_valves','undercity_lanterns','horizon_engine'],['reactor_lattice','horizon_engine','dyletsky_workshop','station_under_ash','hidden_assembly','pressure_valves']]},
 'riven-tide':{label:'Riven · river settlements',places:['water','water'],ids:[['river_road','ruined_sea','dyletsky_tide','reunion_of_waters','halls_beneath_water','rest_by_the_gate'],['reunion_of_waters','dyletsky_tide','river_road','halls_beneath_water','ruined_sea','planet_beneath_us']]},
 'mira-archive':{label:'Mira · witness archive',places:['archive','archive'],ids:[['dyletsky_archive','letters_never_sent','glass_memory','pendant_of_embers','names_in_snow','rpg:archive'],['glass_memory','dyletsky_archive','letters_never_sent','hometown_before_dawn','pendant_of_embers','names_in_snow']]},
 'veyr-storm':{label:'Veyr · storm observatory',places:['highland','highland'],ids:[['dyletsky_sky','silent_orbit','horizon_engine','river_road','planet_beneath_us','names_in_snow'],['horizon_engine','dyletsky_sky','silent_orbit','planet_beneath_us','river_road','names_in_snow']]}
};

const BIOME_POOLS={sand:'desert',cactus:'desert',salt:'water',coral:'water',mangrove:'water',riverbank:'water',lava:'workshop',foundry:'workshop',ruins:'ruins',marble:'ruins',crystal:'cavern',ice:'frost',aurora:'frost',storm:'highland',highland:'highland',woodland:'grove',spore:'grove'};
function placeFor(scene){
 const key=String(scene.key||'').toLowerCase(),room=String(scene.household?.kind||scene.interior||'').toLowerCase(),biome=String(scene.biome?.style||scene.biome?.id||'').toLowerCase();
 const text=[key,room,scene.title,biome].join(' ').toLowerCase(),indoor=isInteriorScene(scene);
 // A trailhead is not a railway; a mangrove sanctuary is still a wetland.
 // The authored biome takes precedence over generic stage names.
 if(scene.biome&&BIOME_POOLS[biome])return BIOME_POOLS[biome];
 if(/archive|office|ledger|letter|witness|name_vault|unindexed|indexing|library|study/.test(text)||scene.chapter===5&&['east','west'].includes(key))return 'archive';
 if(/chapel|cathedral|echo_chamber|resonance_gallery|listening_chamber|meditat/.test(text))return 'chapel';
 if(/home|quarters|inn|clinic|refuge|shelter|relief_store|nursery|bedroom|assembly/.test(room+' '+key))return 'home';
 if(/garden|orchard|grove|forest|sanctuary|woodland|spore|moss/.test(text))return 'grove';
 if(/station|platform|depot|\brail\b|railway|cargo/.test(text))return 'rail';
 if(/workshop|instrumentworks|carpenter|pottery|kiln|forge|foundry|vent_house|security|console|reactor|factory|furnace|industrial/.test(text))return 'workshop';
 if(/snow|frost|ice|aurora|tundra/.test(text))return 'frost';
 if(/cistern|drain|sewer|tunnel|crypt|cavern|cave|underground|passages|well/.test(text))return 'cavern';
 if(/river|water|flood|spillway|lowbank|harbor|harbour|shore|tide|anchorage|mangrove|wetland|marsh|salt/.test(text))return 'water';
 if(/storm|summit|highland|lens|observatory|sky|peak|ridge/.test(text))return 'highland';
 if(/ruin|vault|memory|marble|crystal/.test(text)||scene.theme===2)return 'ruins';
 if(/sand|cactus|desert|dune/.test(text))return 'desert';
 if(/town|market|hub|street|plaza|shop|guild/.test(key+' '+room))return 'town';
 if(!indoor&&key==='field')return BIOME_POOLS[environmentFor(scene).style]||'field';
 return indoor?'home':'field';
}

function contextPhase(state){
 const minutes=finite(state?.townLife?.minutes,480),hour=((minutes/60)%24+24)%24;
 return hour<6||hour>=22?'night':'day';
}

export function musicProgram({scene={},state={},battle=null,slot,cueMap={}}={}){
 const chapter=Math.max(1,Math.floor(finite(state.chapter,finite(scene.chapter,1)))),late=chapter>12;
 if(battle){
  const boss=!!(battle.enemies?.some(enemy=>enemy.boss)||battle.boss||battle.object?.type==='boss'||String(slot).includes('action_boss_'));
  const kind=boss?'boss':'battle',offset=Math.floor((chapter-1)/6)%4;
  const actions=Array.from({length:4},(_,i)=>'action_'+kind+'_'+((i+offset)%4));
  const matches=boss?(late?['last_reactor','aerial_colossus','against_the_ages','iron_sentinel']:['against_the_ages','iron_sentinel','aerial_colossus','last_reactor']):(late?['sirens_on_bridge','black_wind','rpg:battle_late']:['black_wind','sirens_on_bridge','rpg:battle']);
  return {key:kind+':'+Math.floor((chapter-1)/6),label:boss?'Guardian encounter':'Battle',kind,ids:unique([...actions,...matches]),rest:boss?[1,3]:[2,5]};
 }
 if(String(slot).startsWith('performance:')){
  const id=String(slot).slice(12);
  return {key:'performance:'+id,label:'Selected performance',kind:'performance',ids:id&&id!=='next'?[id]:[],rest:[0,0]};
 }
 if(slot===0||slot==='0'||slot==='silence')return {key:'field:silence',label:'Ambient surroundings',kind:'field',ids:[],rest:[0,0]};
 if(/^\d+$/.test(String(slot))&&String(slot)!==String(scene.song)){
  const id=cueMap[String(slot)];
  if(id&&id!=='silence')return {key:'performance:'+id,label:'Story cue',kind:'performance',ids:[id],rest:[0,0]};
 }
 const phase=contextPhase(state),origin=ORIGIN_POOLS[scene.originId],part=scene.originPart===1?1:0,place=origin?.places[part]||placeFor(scene),pool=POOLS[place];
 const base=origin?.ids[part]||pool.ids;
 const ids=origin?unique(phase==='night'?[base[0],...pool.night,...base]:base):unique([...(phase==='night'?pool.night:[]),...(late?pool.late:[]),...base]);
 const quiet=['home','archive','chapel','frost'].includes(place),rest=phase==='night'?[35,65]:quiet?[25,50]:[18,38];
 const region=origin?scene.originId+':'+part:scene.biome?.id||scene.biome?.style||'chapter-'+(scene.chapter||chapter);
 return {key:['field',region,place,phase,late&&!origin?'late':'early'].join(':'),label:(origin?.label||pool.label)+(phase==='night'?' · night':''),kind:'field',ids,rest};
}
