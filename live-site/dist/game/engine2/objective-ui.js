import {objectiveSummary,objectiveActions} from './encounter-objectives.js?v=5.5.0';
import {instrumentActions} from './combat-instruments.js?v=5.5.0';

const element=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const warningText=s=>!s?.warning?'':s.assetHP/s.maxHP<.4?'Critical integrity · repair or protect the objective.':s.remaining<12?'The protection window is closing.':s.kind==='regulator'?'Pressure is climbing · stabilize the regulator.':'Supplies are being taken · stop the scavenger.';
const COLORS={escort:'#b7d8b8',regulator:'#e3bb77',supply:'#c6d29b',signal:'#a5cddf'};
const ACTION_HINTS={guide:'Lead the patient and protect the route. Stay within three tiles.',stabilize:'Lower pressure and restore one control stage.',secure:'Secure one bundle before it can be stolen.',disable:'Complete the next signal shutdown stage.',repair:'Restore objective health. Uses one ready action.',listen:'Read pressure and delay an unheard charge. Two listening windows.',record:'Retain the selected creature’s aimed rhythm in clay.',replay:'Sound the chosen rhythm from the selected angle.',coverage:'Intercept one aimed attack crossing this angle.'};

/** One live picker shares the existing command dock and its persistent Back. */
export function mountObjectiveUI({getBattle,getActor,getTarget,onCommand,onOpen=()=>{},onClose=()=>{},onRefresh=()=>{},onNotice=()=>{}}){
 const grid=document.querySelector('#commands .command-grid'),menu=document.querySelector('#spell-menu'),hud=document.querySelector('#hud');
 const button=element('button','Goal','objective-command');button.type='button';button.id='cmd-objective';button.hidden=true;button.disabled=true;button.setAttribute('aria-controls','spell-menu');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Goal and instrument tools');grid.append(button);
 const goal=element('aside',undefined,'encounter-goal');goal.id='encounter-goal';goal.hidden=true;goal.setAttribute('aria-label','Encounter objective');
 const top=element('div',undefined,'encounter-goal-top'),title=element('strong'),integrity=element('span'),bottom=element('div',undefined,'encounter-goal-bottom'),instruction=element('span'),clock=element('span'),progress=element('progress');
 progress.max=1;progress.setAttribute('aria-label','Objective progress');top.append(title,integrity);bottom.append(instruction,clock);goal.append(top,bottom,progress);hud.append(goal);
 let opened=false,lastBattle=null,marker=null,signature='',goalSignature='',replayPattern='',replayNode='',notesOpen=false;
 const owns=()=>opened&&menu.dataset.picker==='objective'&&(!marker||menu.contains(marker));
 const resetTitle=()=>{const bar=document.querySelector('.battle-picker-bar>span');if(bar&&bar.dataset.picker==='objective'){bar.textContent='Choose a technique or supply';delete bar.dataset.picker;}};
 function close(){if(!opened)return;const own=owns();opened=false;signature='';marker=null;button.setAttribute('aria-expanded','false');if(own){delete menu.dataset.picker;menu.hidden=true;menu.replaceChildren();}resetTitle();onClose();onRefresh();}
 function paint(){
  if(!owns())return;const battle=getBattle(),hero=getActor(),target=getTarget(),summary=objectiveSummary(battle);
  if(!battle?.objective||battle.ended){close();return;}
  const rows=[...objectiveActions(battle,hero).map(a=>({...a,system:'objective'})),...instrumentActions(battle,hero,target).map(a=>({...a,system:'instrument'}))];
  const state=battle.objective,learned=battle.instruments?.analysis,patterns=battle.instruments?.patterns||[],provenance=state.provenance||[];
  const summaryKey=[summary.label,summary.text,summary.warning,Math.ceil(summary.remaining||0),Math.ceil(summary.assetHP||0),Math.round(clamp(summary.value)*100)],analysisKey=learned?[Math.round(learned.pressure||0),Math.ceil(learned.remaining||0),(learned.threats||[]).map(t=>[t.enemyId,t.label,Math.ceil(t.left||0),t.target])]:null;const next=JSON.stringify([hero?.id,hero?.atb>=1,summaryKey,rows,analysisKey,patterns.map(p=>p.id),battle.instruments?.decoy?.patternId,provenance,replayPattern,replayNode]);if(next===signature)return;signature=next;
  const focus=document.activeElement?.dataset?.objectiveKey,scroll=menu.scrollTop;menu.replaceChildren();
  // The objective and clock already remain in the HUD. Lead with usable actions;
  // the complete explanation stays available without pushing them below the fold.
  const notes=element('details',undefined,'objective-context');notes.open=notesOpen;
  const notesToggle=element('summary','Objective notes · '+(summary.label||state.label));notesToggle.dataset.objectiveKey='notes';notes.append(notesToggle);notes.ontoggle=()=>{notesOpen=notes.open;};
  marker=element('p',summary.label||state.label,'objective-picker-heading');notes.append(marker,element('p',summary.text||'Keep the marked asset safe and complete the objective.','objective-picker-instruction'));
  notes.append(element('p',(hero?.name||'Choose a crew member')+' · each successful choice uses one ready action. Close Goal to move into reach.','objective-picker-cost'));
  if(summary.warning)menu.append(element('p',warningText(summary),'objective-picker-warning battle-picker-warning'));
  if(learned){const threats=learned.threats||[],pressure=Number.isFinite(learned.pressure)?'Pressure '+Math.round(learned.pressure)+' · ':'';notes.append(element('p','Hydrophone: '+pressure+(threats.length?threats.map(t=>t.label+' in '+Math.max(0,t.left).toFixed(1)+'s').join(' / '):'No charged attack detected.'),'objective-analysis'));}
  if(patterns.length)notes.append(element('p','Clay memory: '+patterns.map(p=>p.name||p.sourceLabel||p.id).join(' · '),'objective-memory'));
  for(const action of rows.filter((a,i,all)=>all.findIndex(v=>v.action===a.action)===i))notes.append(element('p',action.label+' · '+(action.detail||action.hint||''),'objective-tool-note'));
  if(provenance.length){const history=element('section',undefined,'objective-provenance');history.append(element('strong','How your history changed the encounter'));for(const text of provenance)history.append(element('p',typeof text==='string'?text:text.label||text.text||String(text)));notes.append(history);}
  const addAction=action=>{
   const row=element('button',undefined,'objective-action');row.type='button';row.disabled=!action.enabled;row.dataset.objectiveKey=[action.system,action.action,action.nodeId||'',action.patternId||''].join(':');row.dataset.pageKey=[action.system,action.action,action.action==='replay'?'':action.nodeId||''].join(':');
   const symbol=element('span',action.system==='objective'?'◇':({listen:'◉',record:'▱',replay:'↶',coverage:'⌁'})[action.action]||'◈','objective-action-symbol');symbol.setAttribute('aria-hidden','true');
   const copy=element('span',undefined,'objective-action-copy');copy.append(element('strong',action.label),element('small',action.enabled?ACTION_HINTS[action.action]||action.hint||action.detail:action.reason||action.hint||action.detail));row.append(symbol,copy);row.title=action.detail||action.hint||action.label;
   row.onclick=()=>{const request={...action};delete request.enabled;delete request.reason;delete request.hint;delete request.detail;delete request.label;const success=onCommand(request);if(success===false){onNotice('That opportunity has changed. Check the current range and readiness.');signature='';paint();return;}close();};menu.append(row);return row;
  };
  for(const action of rows.filter(a=>a.action!=='replay'&&a.action!=='coverage'))addAction(action);
  const replayRows=rows.filter(a=>a.action==='replay');
  if(replayRows.length){
   const group=element('div',undefined,'objective-replay'),patternLabel=element('label','Clay pattern'),patternSelect=element('select'),nodeLabel=element('label','Marked angle'),nodeSelect=element('select');patternSelect.setAttribute('aria-label','Retained clay pattern');nodeSelect.setAttribute('aria-label','Replay angle');patternSelect.dataset.objectiveKey='pattern-select';nodeSelect.dataset.objectiveKey='node-select';
   const patternIds=[...new Set(replayRows.map(a=>a.patternId))],nodeIds=[...new Set(replayRows.map(a=>a.nodeId))];if(!patternIds.includes(replayPattern))replayPattern=patternIds[0];if(!nodeIds.includes(replayNode))replayNode=nodeIds[0];
   for(const id of patternIds){const option=element('option',patterns.find(p=>p.id===id)?.name||id);option.value=id;patternSelect.append(option);}for(const id of nodeIds){const option=element('option',battle.instruments.safeNodes.find(n=>n.id===id)?.label||id);option.value=id;nodeSelect.append(option);}patternSelect.value=replayPattern;nodeSelect.value=replayNode;patternSelect.onchange=()=>{replayPattern=patternSelect.value;signature='';paint();};nodeSelect.onchange=()=>{replayNode=nodeSelect.value;signature='';paint();};patternLabel.append(patternSelect);nodeLabel.append(nodeSelect);group.append(patternLabel,nodeLabel);menu.append(group);const chosen=replayRows.find(a=>a.patternId===replayPattern&&a.nodeId===replayNode);if(chosen){const row=addAction({...chosen,label:'Replay retained pattern'});group.dataset.actionFor=row.dataset.objectiveKey;}
  }
  for(const action of rows.filter(a=>a.action==='coverage'))addAction(action);
  menu.append(notes);
  const cancel=element('button','Cancel','objective-picker-cancel');cancel.type='button';cancel.dataset.objectiveKey='cancel';cancel.onclick=()=>{close();button.focus({preventScroll:true});};menu.append(cancel);menu.scrollTop=scroll;
  if(focus)for(const row of menu.querySelectorAll('[data-objective-key]'))if(row.dataset.objectiveKey===focus&&!row.disabled){row.focus({preventScroll:true});break;}
 }
 button.onclick=()=>{const battle=getBattle();if(!battle?.objective)return;if(owns())return close();opened=true;lastBattle=battle;signature='';marker=null;menu.dataset.picker='objective';menu.hidden=false;button.setAttribute('aria-expanded','true');const bar=document.querySelector('.battle-picker-bar>span');if(bar){bar.textContent='Goal and instrument tools';bar.dataset.picker='objective';}onOpen();paint();onRefresh();};
 return {button,goal,close,update(){
  const battle=getBattle(),active=!!battle?.objective&&!battle.ended;button.hidden=!active;button.disabled=!active;goal.hidden=!active;
  if(active){const s=objectiveSummary(battle),next=JSON.stringify([s.label,s.text,s.value,s.assetHP,s.maxHP,s.remaining,s.warning]);if(next!==goalSignature){goalSignature=next;title.textContent=s.label||battle.objective.label;integrity.textContent=Math.max(0,Math.ceil(s.assetHP||0))+' / '+Math.ceil(s.maxHP||1);instruction.textContent=warningText(s)||s.text||'';clock.textContent=Number.isFinite(s.remaining)?Math.max(0,Math.ceil(s.remaining))+'s':'';progress.value=clamp(s.value);goal.classList.toggle('warning',!!s.warning);goal.style.setProperty('--objective-color',COLORS[s.kind]||'#b7d8b8');}}
  if(opened&&(battle!==lastBattle||menu.hidden||!owns())){opened=false;signature='';marker=null;button.setAttribute('aria-expanded','false');if(menu.dataset.picker==='objective')delete menu.dataset.picker;resetTitle();}
  if(owns())paint();
 }};
}

function groundShadow(c,x,y,width=24){c.fillStyle='#06131966';c.beginPath();c.ellipse(x,y+4,width,7,0,0,Math.PI*2);c.fill();}
function assetFrame(c,kind,time){
 c.lineWidth=2;c.lineJoin='round';c.lineCap='round';
 if(kind==='regulator'){
  c.fillStyle='#3a4c4e';c.strokeStyle='#182c2d';c.beginPath();c.roundRect(-22,-40,44,40,5);c.fill();c.stroke();c.fillStyle='#be9b62';c.fillRect(-26,-12,52,8);c.fillStyle='#2a3d40';c.beginPath();c.arc(0,-35,17,0,Math.PI*2);c.fill();c.strokeStyle='#d6c08d';c.lineWidth=3;c.stroke();c.lineWidth=1.3;for(let i=0;i<8;i++){const a=i*Math.PI/4;c.beginPath();c.moveTo(Math.cos(a)*12,-35+Math.sin(a)*12);c.lineTo(Math.cos(a)*15,-35+Math.sin(a)*15);c.stroke();}c.strokeStyle='#efcc77';c.lineWidth=2;c.beginPath();c.moveTo(0,-35);c.lineTo(Math.cos(time*.5-1)*10,-35+Math.sin(time*.5-1)*10);c.stroke();c.fillStyle='#7ca7a2';c.fillRect(-15,-14,9,8);c.fillStyle='#c59468';c.fillRect(7,-16,6,11);
 }else if(kind==='supply'){
  c.fillStyle='#514131';c.strokeStyle='#2a2e2a';c.beginPath();c.roundRect(-25,-30,50,31,4);c.fill();c.stroke();c.fillStyle='#a48958';c.fillRect(-27,-32,54,7);c.fillStyle='#6f8378';c.fillRect(-17,-27,6,29);c.fillRect(12,-27,6,29);c.fillStyle='#d8c99c';c.beginPath();c.roundRect(-9,-19,18,13,2);c.fill();c.strokeStyle='#527b70';c.lineWidth=3;c.beginPath();c.moveTo(-5,-12);c.lineTo(5,-12);c.moveTo(0,-17);c.lineTo(0,-7);c.stroke();c.fillStyle='#b7c2a3';c.beginPath();c.ellipse(-9,-35,10,6,0,0,Math.PI*2);c.fill();c.fillStyle='#b59460';c.beginPath();c.ellipse(11,-35,10,6,0,0,Math.PI*2);c.fill();
 }else if(kind==='signal'){
  c.fillStyle='#4b4741';c.fillRect(-7,-55,14,55);c.strokeStyle='#252c2b';c.strokeRect(-7,-55,14,55);c.strokeStyle='#bcab78';c.lineWidth=3;c.beginPath();c.moveTo(-24,-48);c.lineTo(24,-48);c.moveTo(0,-63);c.lineTo(0,-44);c.stroke();c.strokeStyle='#739d9e';c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.ellipse(0,-14-i*7,12,4,0,0,Math.PI*2);c.stroke();}c.fillStyle='#cfb778';c.beginPath();c.arc(0,-61,5,0,Math.PI*2);c.fill();c.strokeStyle='#a1d4d077';c.lineWidth=1;c.beginPath();c.arc(0,-61,11+Math.sin(time*1.5)*2,-2.6,-.5);c.stroke();
 }else{
  c.fillStyle='#78968a';c.strokeStyle='#334943';c.beginPath();c.roundRect(-18,-35,36,35,6);c.fill();c.stroke();c.fillStyle='#d2ba9d';c.beginPath();c.arc(0,-45,9,0,Math.PI*2);c.fill();c.fillStyle='#b7cbc0';c.fillRect(-16,-29,32,8);c.fillStyle='#e4dbc3';c.fillRect(4,-30,8,10);
 }
}

/** Split ground and asset passes when adding the protected actor to y sorting. */
export function drawObjective(renderer,battle,T=48,{groundOnly=false,assetOnly=false}={}){
 const o=battle?.objective;if(!o?.asset)return;const c=renderer.ctx,a=o.asset,color=COLORS[o.kind]||'#b7d8b8',time=renderer.time||0;
 if(!assetOnly){
  if(o.kind==='escort'&&o.route?.length){const route=o.route.slice(Math.max(0,(o.routeIndex||0)-1));c.save();c.strokeStyle=color+'70';c.lineWidth=1.5;c.setLineDash([4,8]);c.beginPath();c.moveTo(a.x*T,a.y*T);for(const p of route)c.lineTo(p.x*T,p.y*T);c.stroke();c.setLineDash([]);const end=o.route.at(-1);c.strokeStyle=color+'bb';c.beginPath();c.ellipse(end.x*T,end.y*T,21,8,0,0,Math.PI*2);c.stroke();c.restore();}
  c.save();c.strokeStyle=color+'a0';c.lineWidth=1.3;c.setLineDash([4,5]);c.beginPath();c.ellipse(a.x*T,a.y*T+4,27,10,0,0,Math.PI*2);c.stroke();c.restore();
 }
 if(groundOnly)return;
 c.save();groundShadow(c,a.x*T,a.y*T,o.kind==='escort'?18:27);
 if(o.kind==='escort'&&renderer.assets?.npcs&&renderer.atlas){renderer.atlas('npcs',2,3,a.x*T,a.y*T,T*1.35,T*1.35);c.fillStyle='#e1dcc5';c.fillRect(a.x*T+9,a.y*T-28,8,6);}
 else{c.translate(a.x*T,a.y*T);assetFrame(c,o.kind,time);}c.restore();
 const hp=clamp(a.hp/(a.maxHp||1)),y=a.y*T-(o.kind==='escort'?T*1.45:67);c.save();c.fillStyle='#071a20';c.fillRect(a.x*T-24,y,48,4);c.fillStyle=hp<.3?'#e8a68a':color;c.fillRect(a.x*T-24,y,48*hp,4);c.fillStyle=color;c.beginPath();c.moveTo(a.x*T,y-12);c.lineTo(a.x*T+4,y-7);c.lineTo(a.x*T,y-2);c.lineTo(a.x*T-4,y-7);c.closePath();c.fill();c.restore();
}

/** Geometry is drawn as finite line segments, so its protected angle is visible. */
export function drawCombatInstruments(renderer,battle,T=48){
 const state=battle?.instruments;if(!state?.enabled)return;const c=renderer.ctx,time=renderer.time||0;
 c.save();
 for(const node of state.safeNodes||[]){c.strokeStyle='#a5b6d34d';c.fillStyle='#a5b6d344';c.lineWidth=1;c.beginPath();c.ellipse(node.x*T,node.y*T+3,10,4,0,0,Math.PI*2);c.stroke();c.beginPath();c.arc(node.x*T,node.y*T,2,0,Math.PI*2);c.fill();}
 for(const line of state.coverage||[]){if(line.charges<=0)continue;c.strokeStyle='#c8b4e3';c.lineWidth=3;c.beginPath();c.moveTo(line.x1*T,line.y1*T);c.lineTo(line.x2*T,line.y2*T);c.stroke();c.strokeStyle='#efe8fb88';c.lineWidth=1;c.beginPath();c.moveTo(line.x1*T,line.y1*T-3);c.lineTo(line.x2*T,line.y2*T-3);c.stroke();for(const p of [{x:line.x1,y:line.y1},{x:line.x2,y:line.y2}]){c.fillStyle='#d8c9ec';c.beginPath();c.arc(p.x*T,p.y*T,3,0,Math.PI*2);c.fill();}}
 const decoy=state.decoy;if(decoy&&decoy.charges>0&&(decoy.expiresAt===undefined||decoy.expiresAt>battle.time)){const pulse=Math.sin(time*4)*.08+.38;c.strokeStyle='#9ad0cb';c.fillStyle='rgba(136,205,196,'+pulse+')';c.lineWidth=1.5;c.beginPath();c.ellipse(decoy.x*T,decoy.y*T,15,6,0,0,Math.PI*2);c.stroke();c.beginPath();c.roundRect(decoy.x*T-9,decoy.y*T-24,18,22,4);c.fill();c.stroke();for(let i=0;i<3;i++){c.beginPath();c.arc(decoy.x*T,decoy.y*T-17,17+i*5,-.9,.9);c.stroke();}}
 if(state.analysis){const center=state.asset||battle.objective?.asset;if(center){c.strokeStyle='#9acac74d';c.lineWidth=1;c.beginPath();c.ellipse(center.x*T,center.y*T,32+Math.sin(time*2)*4,12+Math.sin(time*2),0,0,Math.PI*2);c.stroke();}}
 c.restore();
}

export function objectiveEventVisual(renderer,event){
 if(!event||!['objective','instrument'].includes(event.type))return false;
 const actor=event.target||event.actor||event.asset;if(!actor||!Number.isFinite(actor.x)||!Number.isFinite(actor.y))return true;
 const labels={guide:'PATH CLEARED',stabilize:'PRESSURE HELD',secure:'SUPPLIES SECURED',disable:'SIGNAL CUT',repair:'INTEGRITY RESTORED',listen:'RHYTHM HEARD',record:'PATTERN RECORDED',replay:'ECHO PLACED',coverage:'ANGLE GUARDED',intercept:'ATTACK TURNED','coverage-block':'ANGLE INTERCEPT',deceive:'MISDIRECTED',decoy:'MISDIRECTED',complete:'OBJECTIVE COMPLETE',failed:'OBJECTIVE LOST'};
 const label=labels[event.action]||event.label;if(!label)return true;
 renderer.effects.push({kind:'number',x:actor.x,y:actor.y-1,value:label,color:event.type==='instrument'?'#b8d9df':'#d5d7a4',t:0,life:1.2});return true;
}
