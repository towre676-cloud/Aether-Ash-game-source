import {routeObjective} from './objective-routing.js?v=5.16.0';
import {placePhysical,physicalBindings} from './physical-lore.js?v=5.16.0';
import {bellArcObjects} from './bell-witness-arc.js?v=5.16.0';

/** Five small, physical proofs that the city can receive an answer. Prelude
 * marks describe actual work, not a completion score. Only the five public
 * work IDs below are contributions to the final confrontation.
 */
export const NETWORK_WORKS=Object.freeze([
 {id:'chapel-return',chapter:4,label:'The chapel can receive an answer',scene:292,scenes:[292,125],motif:[0,1,2],requires:[8323556,6],focus:[4,13]},
 {id:'heat-independent',chapter:8,label:'District heat survives without the collector',scene:294,scenes:[294,295],motif:[0,1,0],requires:[8323560,1],focus:[25,30]},
 {id:'water-return',chapter:11,label:'Both banks can check the return',scene:160,scenes:[160,68],motif:[1,2,0],requires:[8323506,1],focus:[23,19]},
 {id:'relays-distinct',chapter:16,label:'The mountain keeps different replies',scene:394,scenes:[394,142],motif:[0,2,1],requires:[8323511,1],focus:[51,44]},
 {id:'assembly-return',chapter:23,label:'The assembly receives its neighbours',scene:319,scenes:[319,393],motif:[2,1,0],requires:[8323518,1],focus:[57,60]}
].map(w=>Object.freeze({...w,scenes:Object.freeze(w.scenes),motif:Object.freeze(w.motif),requires:Object.freeze(w.requires),focus:Object.freeze(w.focus)})));
const workById=new Map(NETWORK_WORKS.map(w=>[w.id,w]));
export const NETWORK_WORK_IDS=Object.freeze(['chapel-inspected','chapel-return','root-installed','heat-diverted','heat-independent','water-opened','water-return','relays-opened','relays-distinct','assembly-posted','assembly-return']);
export const NETWORK_HEARD_IDS=Object.freeze(['chapel-answer','heat-answer','heat-established','water-west','water-east','relay-low','relay-high','relay-middle','assembly-reply']);
const workIds=new Set(NETWORK_WORK_IDS),heardIds=new Set(NETWORK_HEARD_IDS);
const empty=()=>({version:1,works:[],heard:[]});
const has=(a,id)=>a.works.includes(id),heard=(a,id)=>a.heard.includes(id);
const add=(list,id)=>{if(!list.includes(id))list.push(id);};
const oldHeat=s=>Array.isArray(s?.bosses)&&s.bosses.includes(8);
function establishedHeat(){return {version:1,works:['root-installed','heat-diverted','heat-independent'],heard:['heat-established']};}

/** Old chapter-eight victories already established seed heat in their authored
 * scene. Recognize that fact once, without spending an item or inventing a test,
 * a chapel discovery, another region's work, or a returning voice.
 */
export function migrateAnsweringNetwork(state){
 if(state.answeringNetwork===undefined)state.answeringNetwork=oldHeat(state)?establishedHeat():empty();
 return state.answeringNetwork;
}
const snapshot=s=>s?.answeringNetwork||(oldHeat(s)?establishedHeat():empty());
export function networkEvidence(state){
 const a=snapshot(state),works=NETWORK_WORKS.filter(w=>a.works.includes(w.id)).map(w=>w.id);
 return {works,heard:[...a.heard],chapelReturn:works.includes('chapel-return'),heatIndependent:works.includes('heat-independent'),waterReturn:works.includes('water-return'),distinctRelays:works.includes('relays-distinct'),assemblyReturn:works.includes('assembly-return')};
}

export function validateAnsweringNetwork(state){
 const a=state.answeringNetwork;if(a===undefined)return true;
 if(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).some(k=>!['version','works','heard'].includes(k))||a.version!==1||!Array.isArray(a.works)||!Array.isArray(a.heard)||a.works.length>workIds.size||a.heard.length>heardIds.size||new Set(a.works).size!==a.works.length||new Set(a.heard).size!==a.heard.length||a.works.some(id=>!workIds.has(id))||a.heard.some(id=>!heardIds.has(id)))throw Error('Invalid answering network');
 const need=(mark,prior)=>!has(a,mark)||prior.every(id=>has(a,id));
 if(!need('chapel-return',['chapel-inspected'])||!need('heat-diverted',['root-installed'])||!need('heat-independent',['root-installed','heat-diverted'])||!need('water-return',['water-opened'])||!need('relays-distinct',['relays-opened'])||!need('assembly-return',['assembly-posted']))throw Error('Invalid answering work sequence');
 if(has(a,'chapel-return')!==heard(a,'chapel-answer')||has(a,'heat-independent')!==Boolean(heard(a,'heat-answer')||heard(a,'heat-established'))||heard(a,'heat-established')&&!oldHeat(state)||heard(a,'heat-established')&&heard(a,'heat-answer')||has(a,'water-return')!==Boolean(heard(a,'water-west')&&heard(a,'water-east'))||(heard(a,'water-west')||heard(a,'water-east'))&&!has(a,'water-opened')||has(a,'relays-distinct')!==Boolean(['relay-low','relay-high','relay-middle'].every(id=>heard(a,id)))||['relay-low','relay-high','relay-middle'].some(id=>heard(a,id))&&!has(a,'relays-distinct')||has(a,'assembly-return')!==heard(a,'assembly-reply'))throw Error('Invalid answering network evidence');
 return true;
}

const SITE_DEFS=Object.freeze([
 {id:'chapel-diagram',work:'chapel-return',prop:'diverter'},
 {id:'root-cradle',work:'heat-independent',prop:'reedbank'},
 {id:'heat-diverter',work:'heat-independent',prop:'diverter'},
 {id:'heat-gauge',work:'heat-independent',prop:'bell'},
 {id:'water-bleed',work:'water-return',prop:'diverter'},
 {id:'water-west',work:'water-return',prop:'window'},
 {id:'water-east',work:'water-return',prop:'window'},
 {id:'relay-collar',work:'relays-distinct',prop:'bell'},
 {id:'assembly-board',work:'assembly-return',prop:'claybench'}
]);
const siteById=new Map(SITE_DEFS.map(s=>[s.id,s]));
const bindingCache=new WeakMap();
function bindings(w,def){
 let cache=bindingCache.get(w.data);if(!cache){cache=new Map();bindingCache.set(w.data,cache);}if(cache.has(def.id))return cache.get(def.id);
 const scene=w.scenes.get(def.scene);if(!scene)return [];
 const used=physicalBindings(w).filter(o=>o.physicalLocation===def.scene);
 if(def.chapter===4){
  // Reserve even the witness's future landing, without changing the real flags
  // or investigation. New devices cannot occupy a later actor's destination.
  const shadow=Object.create(w);shadow.state={...w.state,scene:def.scene,chapter:Math.max(4,w.state.chapter||4),flags:{...w.state.flags,8323556:(w.state.flags?.[8323556]||0)|2},bellWitness:undefined};
  used.push(...bellArcObjects(shadow));
 }
 const out=[];for(const site of SITE_DEFS.filter(s=>s.work===def.id)){
  const xy=placePhysical(scene,[...used,...out],def.focus)||placePhysical(scene,[...used,...out]);
  if(!xy)throw Error('No reachable answering worksite: '+site.id);
  out.push({...site,xy:[...xy],scene:def.scene});
 }
 cache.set(def.id,out);return out;
}
function active(w){return !!w?.state&&!!w.scene&&w.state.chronicle?.phase!=='past'&&!w.scene.originId&&!w.scene.biome&&w.scene.fieldOrigin===undefined;}
const nativeReady=(w,def)=>w.bit(...def.requires);
const nativeHint=def=>({4:'Hear Hesper before tracing the chapel return.',8:'Isolate the memory chambers and open the coolant safely before changing the heat supply.',11:'Recover the survey and finish the chosen bank repair before testing its water return.',16:'Complete the surveyor’s different-register phrase before opening the reply collar.',23:'Help Dara begin the archive or river school before connecting its public return board.'})[def.chapter];
const hints=def=>[
 ({4:'The diagram has an older arrow under the filed metal.',8:'Corin’s living root can carry district heat while the collector is isolated.',11:'One reading at a central valve cannot speak for both banks.',16:'The completed phrase has opened the route. A reply still needs its own interval.',23:'The board needs a way for neighbours to answer the assembly, not only receive its instructions.'})[def.chapter],
 ({4:'Inspect the four materials, then release one pulse through the open return.',8:'Seat the root, turn the district diverter, then test the separate heat gauge.',11:'Open the bleed, then read the west and east gauges in either order.',16:'Uncouple the unison collar, then leave an interval for all three registers.',23:'Post the routes already opened, then listen for a reply from the neighbourhood.'})[def.chapter],
 'These works use the materials already present. No supply purchase or earlier-region search is needed.'
];
function stageFor(a,site){
 switch(site.id){
  case 'chapel-diagram':return has(a,'chapel-return')?'complete':has(a,'chapel-inspected')?'chapel-return':'chapel-inspected';
  case 'root-cradle':return has(a,'root-installed')?'complete':'root-installed';
  case 'heat-diverter':return has(a,'heat-diverted')?'complete':'heat-diverted';
  case 'heat-gauge':return has(a,'heat-independent')?'complete':'heat-independent';
  case 'water-bleed':return has(a,'water-opened')?'complete':'water-opened';
  case 'water-west':case 'water-east':return heard(a,site.id)?'complete':site.id;
  case 'relay-collar':return has(a,'relays-distinct')?'complete':has(a,'relays-opened')?'relays-distinct':'relays-opened';
  case 'assembly-board':return has(a,'assembly-return')?'complete':has(a,'assembly-posted')?'assembly-return':'assembly-posted';
 }
}
const labels={
 'chapel-inspected':'Inspect the filed return diagram','chapel-return':'Send one pulse and hear the return',
 'root-installed':'Seat Corin’s root in the heat cradle','heat-diverted':'Divert the district heat through the root','heat-independent':'Isolate the collector feed and read the heat gauge',
 'water-opened':'Open the bank’s return bleed','water-west':'Read the west-bank gauge','water-east':'Read the east-bank gauge',
 'relays-opened':'Uncouple the relay’s unison collar','relays-distinct':'Leave an interval for the three replies',
 'assembly-posted':'Post the community return routes','assembly-return':'Hear the neighbourhood answer'
};
const completeLabels={'chapel-diagram':'Open return diagram','root-cradle':'Corin’s living heat root','heat-diverter':'Independent district diverter','heat-gauge':'Warm district gauge','water-bleed':'Open water return','water-west':'West-bank public reading','water-east':'East-bank public reading','relay-collar':'Three answering registers','assembly-board':'Public return board'};
function objectFor(w,def,site){
 const a=snapshot(w.state),stage=stageFor(a,site);
 return {type:'network',networkId:site.id,networkWork:def.id,networkStage:stage,networkScene:def.scene,networkProp:site.prop,networkMotif:def.motif,xy:[...site.xy],label:stage==='complete'?completeLabels[site.id]:labels[stage],guidanceHints:hints(def)};
}
export function networkObjects(w){
 if(!active(w))return [];migrateAnsweringNetwork(w.state);
 return NETWORK_WORKS.filter(def=>def.scene===w.state.scene&&def.chapter<=w.state.chapter).flatMap(def=>bindings(w,def).map(site=>objectFor(w,def,site)));
}
export function networkDone(w,o){
 const site=siteById.get(o?.networkId);return !!site&&stageFor(snapshot(w.state),site)==='complete';
}
function nextObject(w,def){return bindings(w,def).map(site=>objectFor(w,def,site)).find(o=>o.networkStage!=='complete')||null;}

/** Existing chapter tasks stay first. Once their actual flags are set, the
 * short proof lies on the current route. Optional works never summon a player
 * back to a chapter whose guardian they have already cleared.
 */
export function networkObjective(w){
 if(!active(w))return null;
 const def=NETWORK_WORKS.find(d=>d.chapter===w.scene.chapter);
 if(!def||def.chapter>w.state.chapter||w.state.bosses?.includes(def.chapter)||!nativeReady(w,def)||has(snapshot(w.state),def.id))return null;
 const object=nextObject(w,def);if(!object)return null;
 const label=(def.chapter===8?'':'Optional · ')+object.label,goal=routeObjective(w,{label,scene:def.scene,object});
 return {...goal,networkWork:def.id,targetScene:def.scene,targetObject:object,hints:hints(def),hintKey:'network:'+object.networkId+':'+object.networkStage};
}

/** Pure encounter permission; the World caller owns notice/routing and battle. */
export function networkPrepareEncounter(w,o){
 const allowed={allowed:true,reason:null,goal:null};
 if(!active(w)||o?.type!=='boss'||w.scene.chapter!==8||w.state.bosses?.includes(8)||networkEvidence(w.state).heatIndependent)return allowed;
 const reason='The district still depends on the collector. Seat Corin’s root, divert the heat, and test the separate gauge before confronting the Crown.';
 return {allowed:false,reason,goal:networkObjective(w)};
}

function clearApproach(w,o){
 const sx=w.state.x,sy=w.state.y,tx=o.xy[0]+.5,ty=o.xy[1]+.5,d=Math.hypot(tx-sx,ty-sy);
 if(!Number.isFinite(d)||d>2.05)return false;
 const steps=Math.max(1,Math.ceil(d*8));for(let i=1;i<steps;i++){
  const x=sx+(tx-sx)*i/steps,y=sy+(ty-sy)*i/steps;
  if(Math.floor(x)===o.xy[0]&&Math.floor(y)===o.xy[1])continue;
  if(w.scene.floor[Math.floor(y)]?.[Math.floor(x)]!=='.')return false;
 }
 return true;
}
function report(w,o,action,message){
 const def=workById.get(o.networkWork),a=snapshot(w.state),completed=has(a,def.id);
 w.notice(message);w.callbacks.onMusic?.('network:reply:'+action);
 w.callbacks.onExploration?.({type:'network-work',scene:w.state.scene,work:def.id,site:o.networkId,stage:action,completed,xy:[...o.xy]});
 if(completed&&Array.isArray(w.state.story?.journal)&&!w.state.story.journal.some(j=>j.id==='network:'+def.id))w.state.story.journal.push({id:'network:'+def.id,title:def.label,text:message,chapter:def.chapter});
}
function lockReason(w,def,a,stage){
 if(!nativeReady(w,def))return nativeHint(def);
 if(stage==='root-installed'&&!w.state.bosses?.includes(7))return 'Corin’s living root comes from the rescued orchard. Finish that rescue before seating it here.';
 if(stage==='heat-diverted'&&!has(a,'root-installed'))return 'Seat Corin’s root in the cradle beside the engineer before opening the district diverter.';
 if(stage==='heat-independent'&&!has(a,'heat-diverted'))return 'The district pipe still runs through the collector. Turn the diverter toward the seated root first.';
 if(['water-west','water-east'].includes(stage)&&!has(a,'water-opened'))return 'The return bleed is closed. Open it before asking either bank’s gauge to answer.';
 return null;
}
export function networkInteraction(w,input){
 if(!input?.networkId&&input?.type!=='network')return false;
 if(!active(w)||w.state.mode!=='field')return true;
 const site=siteById.get(input.networkId),def=site&&workById.get(site.work);
 if(!def||def.scene!==w.state.scene||def.chapter>w.state.chapter)return true;
 const bound=bindings(w,def).find(s=>s.id===site.id),o=bound&&objectFor(w,def,bound);
 if(!o||!Array.isArray(input.xy)||input.xy[0]!==o.xy[0]||input.xy[1]!==o.xy[1]||!clearApproach(w,o)||input.networkStage!==o.networkStage)return true;
 const a=migrateAnsweringNetwork(w.state),stage=o.networkStage;
 if(stage==='complete'){
  const text=site.id==='heat-gauge'?'The collector-side indicator is dark. The district pipe stays warm on the living root.':site.id.startsWith('water-')?'Both public gauges remain readable. Neither bank needs permission to check the flow.':site.id==='relay-collar'?'Low, high and middle remain separate. The returning interval is still open.':site.id==='assembly-board'?'The board leaves room for a neighbour to change an answer. It is a public route, not an order.':'The return stays open. A quiet reply can travel back through the same materials.';
  w.notice(text);return true;
 }
 const reason=lockReason(w,def,a,stage);if(reason){w.notice(reason);return true;}
 let text;
 if(stage==='chapel-inspected'){
  add(a.works,stage);text='The filed plate hides a second arrow: RETURN. A reed starts the pulse; clay keeps its shape; a Mako pattern turns it; moving water carries the reply. A newer clamp removed the way back.';
 }else if(stage==='chapel-return'){
  add(a.works,stage);add(a.heard,'chapel-answer');text='You free the small return and send one reed pulse. The water needle moves after the reed falls silent. A second, quieter note comes back through the clay: the line can receive an answer.';
 }else if(stage==='root-installed'){
  add(a.works,stage);text='Corin’s living root settles into the damp cradle. Its fine branches touch the heat sleeve; the root-side indicator warms. The district pipe still follows the old collector line.';
 }else if(stage==='heat-diverted'){
  add(a.works,stage);text='The diverter turns toward the living root. Amber warmth follows the district pipe while the collector branch remains separate. The gauge beside it can now test the change.';
 }else if(stage==='heat-independent'){
  add(a.works,stage);add(a.heard,'heat-answer');text='You close the collector feed for the isolation test. Its indicator goes dark. The district gauge stays amber and the root keeps circulating warmth. The Crown can be stopped without taking the city’s heat.';
 }else if(stage==='water-opened'){
  add(a.works,stage);text='The return bleed opens beside the repaired bank. Water reaches two separate public gauges. Take a reading at each end; a central valve cannot answer for both settlements.';
 }else if(stage==='water-west'||stage==='water-east'){
  add(a.heard,stage);const side=stage==='water-west'?'west':'east';
  if(heard(a,'water-west')&&heard(a,'water-east')){add(a.works,'water-return');text='Both banks now show the same safe range on their own gauges. The return carries a change back to either keeper; nobody has to trust one official reading.';}
  else text='The '+side+' bank’s needle settles inside the safe range. Its reading remains public. Check the other bank before accepting the return.';
 }else if(stage==='relays-opened'){
  add(a.works,stage);text='The unison collar slides away from the completed resonators. Three contacts remain at different heights. The route is open; now leave a pause for the stones to reply in their own registers.';
 }else if(stage==='relays-distinct'){
  add(a.works,stage);for(const id of ['relay-low','relay-high','relay-middle'])add(a.heard,id);text='Low returns first, high answers later, and middle holds after both. The three needles stay different. The mountain carries their replies without forcing the last one to match.';
 }else if(stage==='assembly-posted'){
  add(a.works,stage);text='The board marks the routes people have actually opened. Unanswered lines stay blank. A second set of contacts faces outward so neighbours can correct the assembly’s message.';
 }else if(stage==='assembly-return'){
  add(a.works,stage);add(a.heard,'assembly-reply');text='A neighbour’s reply moves the outward contact. Dara leaves its correction on the board. The new archive or school can receive a living answer; the assembly no longer has to speak for every home.';
 }
 if(text)report(w,o,has(a,'water-return')&&['water-west','water-east'].includes(stage)?'water-return':stage,text);
 return true;
}

/** Read-only renderer/audio view. Scene callbacks may play one finite reply for
 * each completed local work; this model does not start a repeating audio layer.
 */
export function networkSceneView(w){
 if(!active(w))return {sites:[],works:[],heatOn:false,collectorIndependent:false,waterBalanced:false,relayRegisters:[],assemblyReady:false};
 const a=snapshot(w.state),e=networkEvidence(w.state),local=NETWORK_WORKS.filter(d=>d.scenes.includes(w.state.scene)&&d.chapter<=w.state.chapter);
 const sites=local.filter(d=>d.scene===w.state.scene).flatMap(def=>bindings(w,def).map(site=>{const o=objectFor(w,def,site);return {...o,completed:networkDone(w,o),ready:nativeReady(w,def)&&!lockReason(w,def,a,o.networkStage),motif:def.motif};}));
 return {sites,works:local.filter(d=>has(a,d.id)).map(({id,label,scene,motif})=>({id,label,scene,motif})),heatOn:has(a,'heat-diverted'),collectorIndependent:e.heatIndependent,waterBalanced:e.waterReturn,relayRegisters:e.distinctRelays?[0,2,1]:[],assemblyReady:e.assemblyReturn};
}
