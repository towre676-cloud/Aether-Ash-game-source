/** Honest local-save feedback. A stored checkpoint is not a saved unresolved choice. */
const clock=value=>Number.isFinite(value)?value:Date.now();
const defaultTime=value=>new Date(value).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
export function createSaveFeedback({now=Date.now,formatTime=defaultTime}={}){
 let savedAt=null,timestamp='',dirty=true,unavailable=false,profileSaved=true,checkpointOnly=false;
 function snapshot(){
  let text,detail,kind;
  if(unavailable){kind='unavailable';text='Save unavailable — export a backup';detail='Your latest progress has not been stored on this device. Export a backup from Pause.';}
  else if(dirty){kind='dirty';text='Unsaved changes';detail=checkpointOnly?'The checkpoint before this interaction is stored. Finish the interaction to save its outcome.':'Your latest changes will be kept after the next successful save.';}
  else {kind='saved';const minutes=savedAt===null?null:Math.max(0,Math.floor((clock(now())-savedAt)/60000));text=minutes===null?'Saved on this device':minutes<1?'Saved just now':minutes<60?'Saved '+minutes+' min ago':'Saved '+Math.floor(minutes/60)+' hr ago';detail='Your latest checkpoint is stored on this device.';}
  if(!profileSaved&&!unavailable){text=dirty?text+' · traveller slot unavailable':'Game saved · traveller slot unavailable';detail+=' The separate traveller slot could not be updated. Export a backup from Pause.';}
  return {kind,text,detail,timestamp,savedAt,dirty,unavailable,profileSaved,checkpointOnly};
 }
 return {
  get state(){return snapshot();},
  changed(){dirty=true;return snapshot();},
  saved(options={}){savedAt=clock(now());timestamp=formatTime(savedAt);unavailable=false;profileSaved=options.profileSaved!==false;checkpointOnly=options.checkpointOnly===true;dirty=checkpointOnly;return snapshot();},
  failed(){unavailable=true;dirty=true;return snapshot();},
  loaded({savedAt:knownTime=null}={}){savedAt=Number.isFinite(knownTime)?knownTime:null;timestamp=savedAt===null?'':formatTime(savedAt);dirty=false;unavailable=false;profileSaved=true;checkpointOnly=false;return snapshot();}
 };
}
/** Mount into an existing quiet status element; no notifications or storage writes. */
export function mountSaveFeedback({element,now=Date.now,formatTime=defaultTime,setInterval:repeat=globalThis.setInterval,clearInterval:cancel=globalThis.clearInterval,intervalMs=15000}={}){
 if(!element||typeof element.setAttribute!=='function')throw Error('Provide a save-status element.');
 const model=createSaveFeedback({now,formatTime});let disposed=false,dirtyShown=true;
 element.setAttribute('role','status');element.setAttribute('aria-live','polite');element.setAttribute('aria-atomic','true');element.classList?.add('save-feedback');
 function refresh(){const state=model.state;if(disposed)return state;dirtyShown=state.dirty;const text=state.text+(state.timestamp?' · '+state.timestamp:'');if(element.textContent!==text)element.textContent=text;const title=state.detail+(state.timestamp?' Last stored at '+state.timestamp+'.':'');if(element.title!==title)element.title=title;if(element.dataset)element.dataset.saveState=state.kind;element.setAttribute('aria-label',state.text+'. '+title);return state;}
 const timer=intervalMs>0&&typeof repeat==='function'?repeat(refresh,intervalMs):null;
 refresh();
 return {get state(){return model.state;},changed(){if(dirtyShown)return model.state;model.changed();return refresh();},saved(options){model.saved(options);return refresh();},failed(){model.failed();return refresh();},loaded(options){model.loaded(options);return refresh();},refresh,destroy(){if(disposed)return;disposed=true;if(timer!==null&&typeof cancel==='function')cancel(timer);}};
}
