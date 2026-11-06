/** Optional, local development observations. No network requests or journey saves. */
export function createPlaytestRecorder({clock=()=>performance.now(),wallClock=()=>new Date().toISOString(),limit=2000}={}){
 let session=null,started=0,dropped=0;
 const clean=value=>typeof value==='string'?value.slice(0,160):typeof value==='number'&&Number.isFinite(value)||typeof value==='boolean'||value===null?value:undefined;
 const api={
  start({chapter,stage,focus=null,party=[]}={}){started=clock();dropped=0;session={schema:'ash-aether.playtest/1',release:'5.27.0',startedAt:wallClock(),fixture:{chapter,stage,focus:clean(focus),party:party.filter(Number.isInteger).slice(0,3)},events:[]};api.record('start');return api.report();},
  record(type,details={}){if(!session)return false;const event={at:Math.max(0,Math.round((clock()-started)/100)/10),type:String(type).slice(0,48)};for(const [key,value]of Object.entries(details).slice(0,12)){const v=clean(value);if(v!==undefined&&!['at','type'].includes(key))event[key]=v;}if(session.events.length>=limit){session.events.shift();dropped++;}session.events.push(event);return true;},
  report(){if(!session)return null;const events=session.events.map(e=>({...e})),counts={};for(const event of events)counts[event.type]=(counts[event.type]||0)+1;return {...session,fixture:{...session.fixture,party:[...session.fixture.party]},elapsedSeconds:Math.max(0,Math.round((clock()-started)/1000)),droppedEvents:dropped,counts,events};},
  get active(){return !!session;},clear(){session=null;dropped=0;}
 };return api;
}

export function mountPlaytestTools({parent,recorder,onExport}){
 const tools=document.createElement('details');tools.className='playtest-tools-panel';const summary=document.createElement('summary');summary.textContent='Playtest notes';tools.append(summary);
 const row=document.createElement('div');row.className='playtest-tools';const status=document.createElement('span');status.setAttribute('role','status');
 for(const [label,type]of [['I’m lost','confusion'],['That felt good','delight'],['Something broke','problem']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{recorder.record('marker',{kind:type});status.textContent='Marked '+type+' at '+recorder.report()?.elapsedSeconds+'s.';};row.append(b);}
 const exportButton=document.createElement('button');exportButton.type='button';exportButton.textContent='Export observations';exportButton.onclick=()=>{const report=recorder.report();if(report)onExport(report);};row.append(exportButton,status);tools.append(row);parent.append(tools);
 return {started(){status.textContent='Recording this temporary session locally.';},destroy(){tools.remove();}};
}
