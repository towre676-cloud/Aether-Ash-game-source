import {routeObjective} from './objective-routing.js?v=5.11.0';
import {placePhysical,physicalBindings} from './physical-lore.js?v=5.16.0';
import {grantResonance} from './resonance-link.js';
export const BELL_SCENES={chapel:292,crypt:125,vestry:704};
const ACTIVE=s=>s.story&&s.chapter>=4&&s.chronicle?.phase!=='past';
const emptyWorks=()=>({inletClosed:false,drainClear:false,returnFreed:false,tested:false});
export function bellArcState(s){
 const a=s.bellWitness??={version:1,evidence:[],preparation:null,heardHesper:false,metWitness:false,completed:false,tracking:false};
 // A prepared 5.11–5.15 save retains that exact preparation. New physical work
 // earns the additional return-wave consequence; migration never invents it.
 a.works??=emptyWorks();a.testStep??=0;a.aftercare??=null;return a;
}
const repaired=a=>Object.values(a.works||{}).length===4&&['inletClosed','drainClear','returnFreed','tested'].every(k=>a.works[k]===true);
const placed=new WeakMap();
function sites(w){
 let out=placed.get(w.data);if(out)return out;out=[];
 for(const [sceneId,id,label]of [[292,'soot','Soot caught in the bell return'],[125,'plate','Filed return-channel plate'],[125,'diverter','Bell return diverter'],[292,'landing','Witness landing'],[292,'inlet','Rain-feed shutter'],[125,'sump','Silted return drain']]){
  const scene=w.scenes.get(sceneId);if(!scene)continue;
  const xy=placePhysical(scene,[...out.filter(o=>o.bellScene===sceneId),...physicalBindings(w).filter(o=>o.physicalLocation===sceneId)]);
  if(xy)out.push({type:'switch',xy,label,bellArc:id,bellScene:sceneId});
 }placed.set(w.data,out);return out;
}
const bellHints=[
 'The ash follows an answering sound down through the stone. Compare the marks above and below before changing the return.',
 'Hear both accounts, isolate the rain feed, then clear the lower drain. A working tongue can be recovered from the vestry or restored at the answering bell.',
 'Fit the returning tongue, send one low pulse, then listen for its reply. Choose shelter to catch the first return wave, or lure to prolong the Herald’s opening.'
];
export function bellArcObjects(w){
 if(!ACTIVE(w.state))return [];const a=bellArcState(w.state),out=sites(w).filter(o=>o.bellScene===w.state.scene&&o.bellArc!=='landing').map(o=>({...o,guidanceHints:bellHints}));
 if(w.state.scene===292&&w.bit(8323556,1)){
  const witness=w.scenes.get(125)?.objects.find(o=>o.type==='npc'&&o.sprite===23),site=sites(w).find(o=>o.bellArc==='landing');
  if(site&&witness)out.push({...witness,type:'npc',xy:[...site.xy],bellArc:'witness',bellScene:292,label:a.aftercare==='witness-route'?'Witness beside the open archive stair':'Witness at the chapel stair',text:witness.after});
 }
 return out;
}
export function bellArcVisible(w,o){return !(ACTIVE(w.state)&&w.state.scene===125&&o.type==='npc'&&o.sprite===23&&w.bit(8323556,1));}
export function observeBellArc(w,o){
 if(!ACTIVE(w.state)||w.scene.chapter!==4||!o.xy||Math.hypot(w.state.x-o.xy[0]-.5,w.state.y-o.xy[1]-.5)>2.05)return;
 const a=bellArcState(w.state);if(w.state.scene===292&&o.type==='npc'&&o.sprite===18)a.heardHesper=true;if(w.state.scene===125&&o.type==='npc'&&o.sprite===23)a.metWitness=true;
}
const note=(w,id,title,text)=>{if(!w.state.story.journal.some(j=>j.id===id))w.state.story.journal.push({id,title,text,chapter:4});};
function report(w,a,o,text){w.callbacks.onExploration?.({type:'bell-work',scene:w.state.scene,site:o.bellArc,works:{...a.works},preparation:a.preparation,aftercare:a.aftercare,xy:[...o.xy]});w.text(text);}
function prepare(w,a,o,mode){
 a.preparation=mode;a.tracking=false;
 const shelter=mode==='shelter',extra=repaired(a)?shelter?' The repaired return can also catch the first answering wave for each traveller.':' The repaired return also delays the Herald’s first answer and keeps it exposed through that return.':'';
 note(w,'bell-plan','A silence kept',shelter?'You turned the return toward the crypt shelter. Its first dampening pulse will protect the crew.':'You turned the return toward the tower. The lure makes the Herald gather itself before its first charge.');
 report(w,a,o,(shelter?'The relief vane turns toward the crypt. The crew will begin the Ash Herald fight with 24 protection each.':'The relief vane points toward the tower. The Herald’s first charge will take 1.4 seconds longer.')+extra);
}
function aftermath(w,a,o){
 if(!repaired(a)||!a.preparation){report(w,a,o,'The ash has gone. The return still needs physical attention before it can serve the people below.');return;}
 const shelter=a.preparation==='shelter';
 w.choose(shelter?'The cleared drain has left a dry room beneath the stair. Hesper asks who should keep its door open.':'The quiet return carries ordinary words up to the landing. The witness can finally be heard without raising their voice.',[
  [shelter?'Open the dry shelter for the neighbourhood':'Let the witness open the archive stair',()=>{
   const first=!a.aftercare;a.aftercare=shelter?'shelter-open':'witness-route';
   if(first){note(w,'bell-aftercare','The room after the rain',shelter?'The lower return is a neighbourhood shelter. Its dry service stair and resting place remain available.':'The witness keeps the upper archive stair open. Their account is carried by a person who can decide when to speak.');w.state.items[shelter?'tonic':'ether']=(w.state.items[shelter?'tonic':'ether']||0)+1;}
   report(w,a,o,shelter?'The shelter door stays open. The crew may rest here and use the dry service stair. A Tonic was set aside when the room first opened.':'The witness marks a direct stair to the archive entrance. One Ether was set aside for that first journey; the route remains open.');
  }],
  ...(a.aftercare==='shelter-open'?[['Rest in the dry shelter',()=>{w.rest();report(w,a,o,'Dry blankets and a quiet room restore the crew. The door remains open for the next people down the stair.');}],['Take the dry service stair',()=>{const landing=sites(w).find(v=>v.bellArc==='landing');w.loadScene(292,landing?.xy||w.scenes.get(292).arrive);}]]:[]),
  ...(a.aftercare==='witness-route'&&w.state.chapter>=5?[['Walk the witness’s archive stair',()=>w.loadScene(212,w.scenes.get(212).arrive)]]:[]),
  ['Leave the room to its neighbours',()=>{}]
 ]);
}
export function interactBellArc(w,o){
 if(!o.bellArc)return false;
 if(!ACTIVE(w.state)||o.bellScene!==w.state.scene||w.state.mode!=='field'||!o.xy||Math.hypot(w.state.x-o.xy[0]-.5,w.state.y-o.xy[1]-.5)>2.05)return true;
 const a=bellArcState(w.state),works=a.works,change=(key,text)=>{works[key]=true;a.tracking=!a.preparation&&!w.state.bosses.includes(4);note(w,'bell-work:'+key,o.label,text);report(w,a,o,text);};
 if(o.bellArc==='witness'){
  a.metWitness=true;
  if(a.aftercare==='witness-route')w.choose(o.text,[['Walk together to the archive entrance',()=>{if(w.state.chapter>=5)w.loadScene(212,w.scenes.get(212).arrive);}],['Hear the account here',()=>w.text(o.text)],['Stay by the chapel',()=>{}]]);
  else w.text(o.text);return true;
 }
 if(o.bellArc==='soot'||o.bellArc==='plate'){
  if(!a.evidence.includes(o.bellArc))a.evidence.push(o.bellArc);a.tracking=!a.preparation&&!w.state.bosses.includes(4);
  const text=o.bellArc==='soot'?'Soot has collected inside the return opening, not the speaking horn. Ash follows the answering vibration toward the people below. Fresh rain presses against the stain from the feed above.':'A second arrow survives beneath the filed brass: RETURN. The bell circuit once left a way for outside sound to enter. A newer clamp holds it shut; silt has collected below the closed vane.';
  note(w,'bell-evidence:'+o.bellArc,o.label,text);report(w,a,o,text);return true;
 }
 if(o.bellArc==='inlet'){
  if(works.inletClosed)return report(w,a,o,'The rain-feed shutter is seated. Water falls outside the return; the old line no longer fills.'),true;
  w.choose('Rain runs through a feed that should never have entered the bell return.',[
   ['Close the feed shutter',()=>change('inletClosed','The shutter seats. Fresh rain runs outside the return instead of pressing into the crypt. Water already in the line still needs a way out.')],
   ['Listen to the wet return',()=>report(w,a,o,'Each drop is followed by a second, muffled knock below the floor. The line is full.')],['Leave the shutter',()=>{}]
  ]);return true;
 }
 if(o.bellArc==='sump'){
  if(works.drainClear)return report(w,a,o,'The lower drain runs clear. Dry stone now shows beside the witness’s old hiding place.'),true;
  w.choose('Wet silt presses against the lower grate.',[
   ['Lift the grate and clear the silt',()=>{if(!works.inletClosed)return report(w,a,o,'New water keeps pressing the grate down. The feed shutter in the chapel must be closed first.');change('drainClear','You lift the lightened grate. Water leaves through the lower channel, exposing a dry ledge and taking the loose ash with it.');}],
   ['Trace the water upward',()=>report(w,a,o,'The water arrives from the chapel feed. The filed plate shows where the sound should return after it drains.')],['Leave the drain',()=>{}]
  ]);return true;
 }
 if(o.bellArc!=='diverter')return false;
 if(w.state.bosses.includes(4)&&repaired(a)){settleBellArc(w);aftermath(w,a,o);return true;}
 if(a.evidence.length<2||!a.heardHesper||!a.metWitness){a.tracking=true;report(w,a,o,'The diverter links the crypt to the tower. Compare the soot and the filed plate, then hear Hesper and the witness before changing the route of their sound.');return true;}
 if(!works.inletClosed||!works.drainClear){
  // Earlier prepared saves keep their battle benefit while this optional new
  // work is unfinished; reopening the menu never clears a chosen preparation.
  a.tracking=true;report(w,a,o,'The return is still wet. Close the feed above and clear the lower drain before fitting anything into this joint.'+(a.preparation?' Your earlier '+a.preparation+' preparation remains in place.':''));return true;
 }
 if(!works.returnFreed){
  const tongue=w.state.exploration?.found?.includes('district:4:keepsake'),answering=w.state.physicalLore?.completed?.includes('wrapped-clapper');
  if(!tongue&&!answering){a.tracking=true;report(w,a,o,'The dry return needs a tongue that can answer freely. The vestry cradle holds one; the old wrapped clapper can also restore the answering bell.');return true;}
  w.choose('The dry joint has room for an answering tongue.',[[tongue?'Fit the recovered rainbell tongue':'Connect the restored answering bell',()=>change('returnFreed','The tongue hangs clear of the filed clamp. A sound can now travel back through the joint instead of driving ash into the shelter.')],['Leave the joint open for now',()=>{}]]);return true;
 }
 if(!works.tested){
  w.choose('The free tongue needs a call and an answer. Repeated calls would hide a returning sound.',[
   ['Send one low test pulse',()=>{a.testStep=1;report(w,a,o,'One low pulse enters the dry line. The tongue moves toward the chapel; leave room for its return.');}],
   ['Listen for the returning pulse',()=>{if(a.testStep!==1)return report(w,a,o,'Only rain can be heard. Send a single pulse before listening for its return.');a.testStep=0;change('tested','The pulse returns once, clear and separate. The joint carries a reply without filling the crypt with ash.');}],
   ['Leave the test quiet',()=>{}]
  ]);return true;
 }
 if(w.state.bosses.includes(4)){aftermath(w,a,o);return true;}
 w.choose('The working return can protect the shelter below or carry the lure toward the tower. Hesper’s morning phrase is still needed.',[
  ['Shield the crypt’s shelter',()=>prepare(w,a,o,'shelter')],
  ['Carry the lure toward the tower',()=>prepare(w,a,o,'lure')],
  ['Leave the circuit for now',()=>{a.tracking=false;}]
 ]);return true;
}
export function settleBellArc(w){
 if(!ACTIVE(w.state))return;const a=bellArcState(w.state);if(!w.state.bosses.includes(4)||a.completed)return;
 a.completed=true;a.tracking=false;if(a.preparation){grantResonance(w.state,{sourceId:'story:bell-witness-return',label:'Hesper’s return channel restored',points:1,core:'ward'});note(w,'bell-aftermath','A voice above the stair','The witness has left the crypt. The return carries ordinary sound again. Hesper’s account is ready for the road to Mira. One growth point was earned for investigating and preparing the circuit.');}
}
export function bellBattleContext(w){
 if(!ACTIVE(w.state)||w.scene.chapter!==4)return {};const a=bellArcState(w.state);
 return {bellPreparation:a.preparation||null,...(a.preparation&&repaired(a)?{bellCircuit:{version:1,mode:a.preparation,repaired:true}}:{})};
}
export function bellArcObjective(w){
 if(!ACTIVE(w.state))return null;const a=bellArcState(w.state);
 if(w.scene.chapter===4&&w.state.bosses.includes(4)&&a.preparation&&repaired(a)&&!a.aftercare){const object=sites(w).find(o=>o.bellArc==='diverter');return {...routeObjective(w,{label:'Return to the repaired circuit and choose what remains for the neighbourhood',scene:125,object}),hints:['The ash has gone, but the people still need this room.','Return to the diverter beneath the chapel. The preparation you chose has made a different kind of place possible.','Open the dry shelter after a shelter preparation, or let the witness open the archive stair after a lure.'],hintKey:'bell-aftercare'};}
 if(w.state.chapter!==4||!a.tracking||w.state.bosses.includes(4))return null;
 let scene=125,object,label;const find=id=>sites(w).find(o=>o.bellArc===id);
 const missing=['soot','plate'].find(id=>!a.evidence.includes(id));
 if(missing){object=find(missing);scene=object?.bellScene;label=object?.label;}
 else if(!a.heardHesper){scene=292;object=w.scenes.get(scene).objects.find(o=>o.type==='npc'&&o.sprite===18);label='Hear Hesper’s morning phrase';}
 else if(!a.metWitness){scene=w.bit(8323556,1)?292:125;const witness=w.scenes.get(125).objects.find(o=>o.type==='npc'&&o.sprite===23);object=scene===292?{...witness,...find('landing'),type:'npc',bellArc:'witness',bellScene:292,text:witness.after}:witness;label='Hear the witness by the stair';}
 else if(!a.works.inletClosed){object=find('inlet');scene=292;label='Inspect the rain-feed shutter';}
 else if(!a.works.drainClear){object=find('sump');label='Clear the lower return drain';}
 else if(!a.works.returnFreed&&!w.state.exploration?.found?.includes('district:4:keepsake')&&!w.state.physicalLore?.completed?.includes('wrapped-clapper')){
  scene=704;const room=w.scenes.get(scene),solved=w.state.exploration?.solved?.includes('district:4:latch');
  object=room?.objects.find(o=>o.exploreId===(solved?'district:4:keepsake':'district:4:latch'));label=solved?'Recover the freed rainbell tongue':'Test the vestry’s answering bells';
 }else{object=find('diverter');label=a.works.tested?'Choose a purpose for the restored return':'Fit and test the bell return';}
 const goal=routeObjective(w,{label:'Optional · '+label,scene,object});return {...goal,hints:bellHints,hintKey:label};
}
export function drawBellArc(c,w,T,time){
 if(!ACTIVE(w.state)||![292,125].includes(w.state.scene))return;const a=bellArcState(w.state),cleared=w.bit(8323556,1),resolved=w.state.bosses.includes(4);c.save();
 for(const o of bellArcObjects(w).filter(o=>o.type==='switch')){
  const x=(o.xy[0]+.5)*T,y=(o.xy[1]+.5)*T,worked=o.bellArc==='inlet'?a.works.inletClosed:o.bellArc==='sump'?a.works.drainClear:o.bellArc==='diverter'?a.works.returnFreed:a.evidence.includes(o.bellArc);
  c.fillStyle='#535e59';c.strokeStyle=worked?'#adcfb6':'#ac9972';c.lineWidth=2;c.beginPath();c.ellipse(x,y-8,18,11,0,0,7);c.fill();c.stroke();c.beginPath();c.moveTo(x-10,y-12);c.lineTo(x+10,y-12);c.stroke();
  if(o.bellArc==='diverter'){c.strokeStyle='#d4b47c';c.beginPath();c.moveTo(x,y-8);c.lineTo(x+(a.preparation==='shelter'?-13:13),y-27);c.stroke();}
  if(o.bellArc==='sump'&&!a.works.drainClear){c.fillStyle='#56808755';c.beginPath();c.ellipse(x,y+2,23,8,0,0,7);c.fill();}
  if(!resolved){c.fillStyle='#a09c9440';for(let i=0;i<7;i++){const drift=cleared?Math.sin(time*.8+i)*12:Math.sin(time*.4+i)*3;c.beginPath();c.arc(x+drift,y-24-i*5,2+i*.3,0,7);c.fill();}}
  else{c.strokeStyle='#c5debf66';c.beginPath();c.arc(x,y-12,12+Math.sin(time*2)*2,0,7);c.stroke();}
 }c.restore();
}
export function validateBellArc(s){
 const a=s.bellWitness;if(a===undefined)return;
 if(!a||a.version!==1||!Array.isArray(a.evidence)||a.evidence.some(x=>!['soot','plate'].includes(x))||new Set(a.evidence).size!==a.evidence.length||![null,'lure','shelter'].includes(a.preparation))throw Error('Invalid bell witness investigation');
 for(const key of ['heardHesper','metWitness','completed','tracking'])if(a[key]!==undefined&&typeof a[key]!=='boolean')throw Error('Invalid bell witness investigation');
 if(a.works!==undefined&&(!a.works||typeof a.works!=='object'||Array.isArray(a.works)||Object.keys(a.works).length!==4||Object.keys(emptyWorks()).some(k=>typeof a.works[k]!=='boolean')))throw Error('Invalid bell return work');
 if(a.testStep!==undefined&&![0,1].includes(a.testStep)||a.aftercare!==undefined&&![null,'shelter-open','witness-route'].includes(a.aftercare))throw Error('Invalid bell return work');
 if(a.works&&(a.works.drainClear&&!a.works.inletClosed||a.works.returnFreed&&!a.works.drainClear||a.works.tested&&!a.works.returnFreed)||a.aftercare&&(!a.completed||!a.works?.tested))throw Error('Invalid bell return sequence');
}
export function bellSpeakerFocus(w,speaker){
 if(!w||!ACTIVE(w.state)||w.scene.chapter!==4)return null;let o;if(speaker==='Hesper'&&w.state.scene===292)o=w.scene.objects.find(o=>o.type==='npc'&&o.sprite===18);else if(speaker==='Witness')o=w.objects().find(o=>o.bellArc==='witness'||o.type==='npc'&&o.sprite===23);return o?.xy?{x:o.xy[0]+.5,y:o.xy[1]+.5}:null;
}
