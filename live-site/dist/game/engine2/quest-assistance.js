/** Destination help and solution help are separate, explicit player choices. */
export const ASSISTANCE_MODES=['destination','full'];
export function assistanceMode(state){return state?.questAssistance?.mode==='full'?'full':'destination';}
function assistanceState(state){return state.questAssistance??={version:1,mode:'destination',hints:[]};}
export function setAssistanceMode(state,mode){
 if(!ASSISTANCE_MODES.includes(mode))return false;
 assistanceState(state).mode=mode;return true;
}
export function validateQuestAssistance(state){
 const a=state.questAssistance;if(a===undefined)return;
 if(!a||a.version!==1||!ASSISTANCE_MODES.includes(a.mode)||!Array.isArray(a.hints)||a.hints.length>64||a.hints.some(h=>!h||typeof h.key!=='string'||h.key.length>160||!Number.isInteger(h.stage)||h.stage<0||h.stage>3)||new Set(a.hints.map(h=>h.key)).size!==a.hints.length)throw Error('Invalid journey assistance');
}
export const noteName=o=>o?.played?.match(/\b(low|middle|high)\b/i)?.[1]?.toLowerCase()||['low','middle','high'][o?.note]||'answering';
/** All instruments are offered in pitch order, never in answer order. The
 * guide must walk to the selected instrument before sounding it. */
export function musicDestinations(world,object){
 return world.data.scenes.filter(r=>r.chapter<=world.state.chapter&&!r.originId&&!r.biome).flatMap(scene=>scene.objects.filter(o=>o.type==='note'&&o.sequence_address===object.sequence_address).map(o=>({scene:scene.location,object:o,label:'Sound the '+noteName(o)+' '+(o.played?.includes('stone')?'stone':'bell'),playNote:true}))).sort((a,b)=>['low','middle','high'].indexOf(noteName(a.object))-['low','middle','high'].indexOf(noteName(b.object))||a.scene-b.scene);
}
/** Local discoveries have a walking button even when the player never uses
 * direct movement. Hidden objects are included only after World reveals them. */
export function guidanceDestinations(world){
 if(!world?.state||!world.scene)return [];
 return world.objects().filter(o=>o.xy&&!['patrol','boss','wild','furnishing'].includes(o.type)&&(o.bellArc||o.exploreId||o.legacyId||o.physicalId||o.networkId||['npc','note','puzzle','switch','affordance','life','camp','shop'].includes(o.type))).map(o=>({scene:world.state.scene,object:o,label:o.label||o.name||(o.type==='note'?'Listen at the '+noteName(o)+' bell':o.type==='npc'?'Speak to '+(o.text?.match(/^([A-Z][A-Z ]+):/)?.[1]?.toLowerCase()||'the person here'):o.type==='camp'?'Visit the camp':o.type==='shop'?'Visit the merchant':'Inspect the mechanism')})).slice(0,48);
}
function fallbackHints(world,goal){
 const o=goal?.object,s=world.state;
 if(o?.type==='note'){
  const at=s.flags?.['sequence:'+o.sequence_address]||0,n=o.pattern?.[at],next=noteName(musicDestinations(world,o).find(d=>d.object.note===n)?.object);
  return ['The bells answer a remembered phrase. Someone in this district has heard it before.','Listen to the witness, then compare the different bells. You can try a note without spending supplies.','The next sound in the remembered phrase is '+next+'. Choose that bell, or turn on Full assistance to follow the whole sequence.'];
 }
 if(o?.type==='puzzle'&&o.steps?.length&&!o.choice_id){
  const at=o.stage_flag&&world.bit(...o.stage_flag)?1:0,step=o.steps[at];
  return ['Look for wear, movement or a nearby account connected to this mechanism.','Try one change at a time. The mechanism will tell you what happened; an unsuccessful attempt does not decide the story.',step?.options?.[step.answer]?'A practical next action is: '+step.options[step.answer]+'.':'Return to the person who described this work.'];
 }
 return ['Your destination is '+(goal?.label||'the current story objective')+'. You can follow a route there without choosing an answer.','Speak to people and examine the working objects beside the route. Their accounts explain what is at stake.','Use a destination button to walk to a particular clue. Full assistance is also available; story decisions remain yours.'];
}
/** Read-only until advance is requested. Hint text never writes a story flag,
 * chooses a civic answer, spends an item or bypasses an interaction. */
export function questHint(world,{advance=false,goal=null}={}){
 if(!world?.state)return {stage:0,title:'A little help',text:'Begin a journey to follow a clue.',canAdvance:false};
 const o=goal?.object,key=[world.state.chapter,o?.originId||'',o?.networkId??o?.bellArc??o?.exploreId??o?.sequence_address??o?.originStep??o?.bit??o?.type??'journey',o?.networkStage??(o?.type==='note'?(world.state.flags?.['sequence:'+o.sequence_address]||0):''),goal?.hintKey||''].join(':').slice(0,160);
 const hints=o?.guidanceHints||goal?.hints||fallbackHints(world,goal);let entry=world.state.questAssistance?.hints?.find(h=>h.key===key),stage=entry?.stage||0;
 if(advance){const a=assistanceState(world.state);if(!entry){entry={key,stage:0};a.hints.push(entry);if(a.hints.length>64)a.hints.shift();}entry.stage=Math.min(3,entry.stage+1);stage=entry.stage;}
 return {stage,title:stage===3?'A practical next step':stage===2?'A closer hint':'A clue, when you want one',text:stage?hints[Math.min(hints.length-1,stage-1)]:'Follow a destination to explore it. Ask for a hint when you want more detail.',canAdvance:stage<3,mode:assistanceMode(world.state)};
}
