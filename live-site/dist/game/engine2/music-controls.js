/** Music preferences and presentation. Journey state changes only when a player
 * explicitly advances one of the existing listening-station collections. */
const MODES={continuous:'Music on',spacious:'Occasional music',ambient:'Ambience only'};
export const DEFAULT_MUSIC_VOLUME=.52;
export const MUSIC_PREFERENCES_VERSION_KEY='ash-music-preferences-version';
export const MUSIC_PREFERENCES_VERSION='5.32';
const preference=(storage,key)=>{try{return storage?.getItem(key)??null;}catch{return null;}};
const savePreference=(storage,key,value)=>{try{storage?.setItem(key,String(value));}catch{}};

/** Restore the score once for the music-first update. Later explicit choices
 * survive reloads; journey data and unrelated sound settings are untouched. */
export function prepareMusicPreferences(storage){
 if(preference(storage,MUSIC_PREFERENCES_VERSION_KEY)!==MUSIC_PREFERENCES_VERSION){
  const raw=preference(storage,'ash-music-volume'),value=raw===null||raw.trim()===''?NaN:Number(raw);
  if(!Number.isFinite(value)||value<=0)savePreference(storage,'ash-music-volume',DEFAULT_MUSIC_VOLUME);
  savePreference(storage,'ash-music-pacing','continuous');
  savePreference(storage,MUSIC_PREFERENCES_VERSION_KEY,MUSIC_PREFERENCES_VERSION);
 }
 return readMusicPreferences(storage);
}

export function readMusicPreferences(storage){
 const raw=preference(storage,'ash-music-volume'),value=raw===null||raw.trim()===''?NaN:Number(raw);
 return {volume:Number.isFinite(value)?Math.max(0,Math.min(1,value)):DEFAULT_MUSIC_VOLUME,instrumentEnabled:preference(storage,'ash-instrument')==='on'};
}

export function musicIsActive(view={}){
 return !!view.started&&!['paused','hidden','recovery','cinema','journey','observatory','traveller','film'].some(key=>view[key]);
}

export function selectListeningPerformance(slot,{catalog,state}={}){
 if(!['performance:next','reference:next'].includes(slot))return {slot};
 const reference=slot==='reference:next',tracks=catalog?.tracks||[];
 const list=reference?tracks.filter(track=>track.role==='instrument-reference'):tracks.filter((track,index)=>tracks.findIndex(other=>other.audio===track.audio)===index);
 if(!list.length||!state)return null;
 const key=reference?'referenceIndex':'performanceIndex';
 state[key]=((Number.isInteger(state[key])?state[key]:-1)+1)%list.length;
 return {slot:'performance:'+list[state[key]].id,title:list[state[key]].title};
}

export function createScoreCueGate({now=()=>performance.now()/1000}={}){
 const lastById=new Map();let last=-Infinity;
 return id=>{const time=now();if(time-last<.75||time-(lastById.get(id)??-Infinity)<3)return false;last=time;lastById.set(id,time);return true;};
}

export function musicPresentation(state={}, {volume=1}={}){
 const mode=MODES[state.mode]?state.mode:'continuous',reported=state.phase||'idle',phase=reported==='playing'&&state.transportPlaying===false?'blocked':reported,title=state.title||'',place=state.programLabel||'the world';
 let hud,detail;
 if(mode==='ambient'||phase==='quiet'){
  hud='♪ Play music';detail='Music is off. Tap ♪ Play music to restore the score.';
 }else if(volume<=0){
  hud='♪ Play music';detail='Music volume is muted. Tap ♪ Play music to restore it.';
 }else if(phase==='playing'){
  hud='♪ '+title;detail='Now playing: '+title+' · '+place;
 }else if(phase==='loading'){
  hud='♪ Preparing music';detail=title?'Preparing '+title+' · '+place:'Preparing a piece for '+place+'.';
 }else if(phase==='resting'){
  hud='♪ Play next piece';detail='Music is between pieces. Tap ♪ to continue now.';
 }else if(phase==='blocked'){
  hud='♪ Tap for music';detail='Tap ♪ to enable music on this device.';
 }else if(phase==='paused'){
  hud=title?'♪ '+title+' · paused':'♪ Music paused';detail=title?'Paused: '+title+' · '+place:'Music continues when the journey resumes.';
 }else if(phase==='unavailable'){
  hud='♪ Retry music';detail='This piece could not start. Tap ♪ to try another recording.';
 }else{
  hud='♪ Listening to '+place;detail='Music follows the place and the journey.';
 }
 const enable=mode==='ambient'||volume<=0||['blocked','unavailable','quiet'].includes(phase);
 return {mode,phase,title,place,hud,detail,enable,nextDisabled:mode==='ambient'||phase==='idle',nextLabel:phase==='paused'?'Next piece on resume':'Next piece',actionLabel:enable?'Play music':'Next music piece'};
}

export function mountMusicControls({parent,indicator,onMode=()=>{},onNext=()=>{},onEnableMusic=()=>{onMode('continuous');onNext();},getVolume=()=>1,document:doc=parent?.ownerDocument||globalThis.document}={}){
 if(!parent||!doc)return null;
 if(!doc.getElementById('music-controls-style')){
  const style=doc.createElement('style');style.id='music-controls-style';
  style.textContent='#music-settings{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 12px;width:100%;align-items:center;padding:12px;border:1px solid #b8a57944;border-radius:8px;background:#15252c77}#music-settings>strong,#music-now-playing,#music-pacing-help{grid-column:1/-1}#music-now-playing{margin:0;color:#e1d7bd;font:12px/1.5 system-ui;overflow-wrap:anywhere}#music-pacing-help{margin:0;color:#aebebc;font:11px/1.45 system-ui}#music-settings .music-pacing-label{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0;font:12px system-ui}#music-pacing{max-width:180px;padding:7px;background:#182d32;color:#eee5ce;border:1px solid #b8a57955;border-radius:5px}#music-next,#music-enable{min-height:36px;padding:7px 12px;font:12px system-ui}#music-enable{grid-column:1/-1;background:#34503e;color:#f0dfb3}#score-indicator[role=button]{pointer-events:auto;cursor:pointer;touch-action:manipulation;display:inline-flex;align-items:center;min-height:32px}#score-indicator[role=button]:focus-visible{outline:2px solid #e4ce93;outline-offset:3px}#score-indicator{max-width:220px}#score-indicator[data-music-phase="resting"],#score-indicator[data-music-phase="quiet"]{color:#aabbb1}@media(max-width:600px){#score-indicator[role=button]{display:inline-flex!important;max-width:36px;min-width:36px;min-height:36px;justify-content:center;font-size:0;padding:4px}#score-indicator[role=button]::before{content:"♪";font:17px system-ui}#score-indicator[data-music-recovery=true]{max-width:115px;min-width:85px;font:10px system-ui;gap:3px}#score-indicator[data-music-recovery=true]::before{content:none}}@media(max-width:480px){#music-settings{grid-template-columns:1fr}#music-next{justify-self:start}#music-pacing{max-width:180px}}';
  doc.head.append(style);
 }
 const box=doc.createElement('section');box.id='music-settings';box.className='music-settings setting';box.setAttribute('aria-label','Music');
 const heading=doc.createElement('strong');heading.textContent='Music';
 const now=doc.createElement('p');now.id='music-now-playing';now.setAttribute('role','status');now.setAttribute('aria-live','polite');now.setAttribute('aria-atomic','true');
 const label=doc.createElement('label');label.className='music-pacing-label';label.append(doc.createTextNode('Music pacing'));
 const select=doc.createElement('select');select.id='music-pacing';select.setAttribute('aria-label','Music pacing');select.setAttribute('aria-describedby','music-pacing-help');
 for(const [value,text]of Object.entries(MODES)){const option=doc.createElement('option');option.value=value;option.textContent=text;select.append(option);}label.append(select);
 const next=doc.createElement('button');next.type='button';next.id='music-next';next.textContent='Next piece';
 const enable=doc.createElement('button');enable.type='button';enable.id='music-enable';enable.textContent='Play music';enable.onclick=()=>onEnableMusic();
 const help=doc.createElement('p');help.id='music-pacing-help';help.textContent='Music on keeps the score playing. Occasional music adds quiet intervals. You can always tap ♪ to restore music.';
 box.append(heading,now,label,next,enable,help);parent.append(box);
 let lastView=null;
 if(indicator){indicator.setAttribute('aria-live','off');indicator.setAttribute('role','button');indicator.tabIndex=0;indicator.onclick=()=>lastView?.enable?onEnableMusic():onNext();indicator.onkeydown=event=>{if(['Enter',' ','Spacebar'].includes(event.key)){event.preventDefault?.();event.stopPropagation?.();indicator.onclick();}};}
 select.onchange=()=>onMode(select.value);next.onclick=()=>onNext();
 function update(state={}){
  const view=musicPresentation(state,{volume:getVolume()});lastView=view;select.value=view.mode;enable.hidden=!view.enable;
  if(now.textContent!==view.detail)now.textContent=view.detail;
  if(next.textContent!==view.nextLabel)next.textContent=view.nextLabel;
  if(next.disabled!==view.nextDisabled)next.disabled=view.nextDisabled;
  box.dataset.musicPhase=view.phase;box.dataset.musicMode=view.mode;box.dataset.musicTrack=state.trackId||'';
  if(indicator){if(indicator.textContent!==view.hud)indicator.textContent=view.hud;indicator.title=view.detail+' '+(view.enable?'Play music.':'Tap for the next piece.');indicator.setAttribute('aria-label',view.actionLabel);indicator.dataset.musicPhase=view.phase;indicator.dataset.musicMode=view.mode;indicator.dataset.musicTrack=state.trackId||'';indicator.dataset.musicRecovery=String(view.enable);}
  return view;
 }
 update();return {element:box,select,next,enable,now,update};
}
