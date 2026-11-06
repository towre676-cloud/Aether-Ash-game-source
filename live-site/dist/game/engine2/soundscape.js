import {isInteriorScene} from './scene-identity.js';
export const AMBIENCE_VOLUME_KEY='ash-ambience-volume';
const clamp=n=>Math.max(0,Math.min(1,n));
/** Sparse place mapping: no birds in buildings and no guessed beds for unmatched regions. */
export function ambienceForScene(scene){
 if(!scene)return null;
 if(scene.originId){
  if(scene.originId==='sable-reed')return scene.originIndoor?null:'town';
  if(scene.originId==='iona-lowbank'||scene.originId==='riven-tide')return 'water';
  if(scene.originId==='rook-regulator')return 'workshop';
  return null;
 }
 if(scene.biome)return ({coral:'water',salt:'water',mangrove:'water',spore:'garden'})[scene.biome.id]||null;
 if(isInteriorScene(scene)){
  const kind=scene.household?.kind||scene.interior;
  if(['workshop','instrumentworks','carpenter','pottery','printshop'].includes(kind))return 'workshop';
  if(['cistern','washroom'].includes(kind))return 'water';
  return null;
 }
 if(['town','market','hub'].includes(scene.key))return 'town';
 if(['river','bypass'].includes(scene.key)||scene.key==='field'&&scene.chapter===11)return 'water';
 if(['forest','grove'].includes(scene.key))return 'garden';
 return null;
}
function readVolume(storage){try{const saved=storage?.getItem(AMBIENCE_VOLUME_KEY);if(saved!==null&&saved!==undefined&&Number.isFinite(Number(saved)))return clamp(Number(saved));}catch{}return .24;}
/** Quiet optional audio: failures never prevent play or get retried by the animation loop. */
export function createSoundscape({createAudio=()=>new Audio(),storage,resolve=id=>new URL('../audio/ambience/'+id+'.mp3',import.meta.url).href,setInterval:repeat=globalThis.setInterval,clearInterval:cancel=globalThis.clearInterval,setTimeout:delay=globalThis.setTimeout,clearTimeout:cancelDelay=globalThis.clearTimeout,timeoutMs=15000}={}){
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{}
 let volume=readVolume(storage),profile=null,active=false,ducked=false,destroyed=false,blocked=false,error=null,failedProfile=null,generation=0,current=-1,pending=false,pendingIndex=-1,timer=null,loadTimer=null;
 const decks=[],targets=[0,0],tokens=[0,0];
 const targetVolume=()=>active&&!destroyed?volume*(ducked?.3:1):0;
 function clearFade(){if(timer!==null){try{cancel(timer);}catch{}timer=null;}}
 function setLevel(audio,value){try{audio.volume=clamp(value);}catch{}}
 function pause(audio){try{audio.pause();}catch{}}
 function clearLoadTimer(){if(loadTimer!==null){try{cancelDelay(loadTimer);}catch{}loadTimer=null;}}
 function stop(){clearLoadTimer();generation++;pending=false;pendingIndex=-1;current=-1;clearFade();for(let i=0;i<decks.length;i++){targets[i]=0;setLevel(decks[i],0);pause(decks[i]);}}
 function tick(){let moving=false;for(let i=0;i<decks.length;i++){const audio=decks[i],from=Number(audio.volume)||0,to=targets[i],delta=to-from;if(Math.abs(delta)>.001){setLevel(audio,Math.abs(delta)<.008?to:from+Math.sign(delta)*Math.max(.008,Math.abs(delta)*.22));moving=true;}else {setLevel(audio,to);if(to===0&&i!==current&&i!==pendingIndex)pause(audio);}}if(!moving)clearFade();}
 function fade(){if(destroyed||timer!==null)return;tick();if(timer===null&&decks.some((a,i)=>Math.abs((Number(a.volume)||0)-targets[i])>.001)&&typeof repeat==='function')timer=repeat(tick,50);}
 function ensureDecks(){if(decks.length)return true;try{for(let i=0;i<2;i++){const audio=createAudio();audio.preload='none';audio.loop=true;audio.playsInline=true;setLevel(audio,0);decks.push(audio);}return true;}catch{error='Ambient sound is unavailable.';failedProfile=profile;stop();return false;}}
 function failed(token,index,cause){if(destroyed||tokens[index]!==token||generation!==token)return;clearLoadTimer();pending=false;blocked=cause?.name==='NotAllowedError';error=blocked?'Tap to enable ambient sound.':'Ambient sound is unavailable.';failedProfile=profile;stop();}
 function start(){
  if(destroyed||!active||!profile||!volume||pending||current>=0||failedProfile===profile)return;
  if(!ensureDecks())return;
  const token=++generation,index=decks[0].paused===false?1:0,audio=decks[index],wanted=profile;tokens[index]=token;pending=true;pendingIndex=index;setLevel(audio,0);
  try{pause(audio);audio.src=resolve(wanted);audio.onerror=()=>failed(token,index);if(typeof delay==='function'){loadTimer=delay(()=>failed(token,index),timeoutMs);loadTimer?.unref?.();}const play=audio.play();Promise.resolve(play).then(()=>{
   if(destroyed||generation!==token||!active||profile!==wanted){if(tokens[index]===token)pause(audio);return;}
   clearLoadTimer();current=index;pending=false;pendingIndex=-1;blocked=false;error=null;failedProfile=null;for(let i=0;i<decks.length;i++)targets[i]=i===index?targetVolume():0;fade();
  },cause=>failed(token,index,cause));}catch(cause){failed(token,index,cause);}
 }
 const api={
  get state(){return {profile,active,ducked,volume,playing:current>=0&&!destroyed,blocked,error,pending};},
  sync({scene,state,active:enabled=false,ducked:soft=false}={}){
   if(destroyed)return api.state;
   const next=ambienceForScene(scene),allowed=!!enabled&&(!state?.mode||['field','dialog'].includes(state.mode)),nextActive=allowed&&!!next;
   const changed=next!==profile,nextDucked=!!soft;
   // The animation loop may ask every frame. Fades have their own timer;
   // stable scenes must not keep touching media volume or pausing silent decks.
   if(!changed&&nextActive===active&&nextDucked===ducked)return api.state;
   ducked=nextDucked;
   if(changed){if(nextActive&&volume>0){clearLoadTimer();generation++;pending=false;pendingIndex=-1;current=-1;for(let i=0;i<decks.length;i++)targets[i]=0;fade();}else stop();profile=next;failedProfile=null;blocked=false;error=null;}
   if(!nextActive||volume===0){active=nextActive;stop();return api.state;}
   active=true;if(current>=0){targets[current]=targetVolume();fade();}else start();return api.state;
  },
  setVolume(value){if(destroyed||!Number.isFinite(Number(value)))return volume;volume=clamp(Number(value));try{storage?.setItem(AMBIENCE_VOLUME_KEY,String(volume));}catch{}if(volume===0)stop();else if(current>=0){targets[current]=targetVolume();fade();}else start();return volume;},
  unlock(){if(destroyed)return api.state;failedProfile=null;blocked=false;error=null;start();return api.state;},
  destroy(){if(destroyed)return;stop();destroyed=true;active=false;for(const audio of decks){audio.onerror=null;try{audio.removeAttribute?.('src');audio.load?.();audio.remove?.();}catch{}}}
 };
 return api;
}
