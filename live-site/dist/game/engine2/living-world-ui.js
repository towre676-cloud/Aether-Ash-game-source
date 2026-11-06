import {ecologyActions,ecologySummary} from './creature-ecology.js?v=5.18.0';
import {anatomyActions,anatomySummary} from './functional-anatomy.js?v=5.16.0';
import {positionActions} from './combat-position.js?v=5.16.0';
import {legacyActions} from './hero-legacy.js?v=5.5.0';
import {worldAffordanceObjects,worldAffordanceActions,worldAffordanceSummary,WORLD_TOOL_NAMES} from './world-affordances.js?v=5.38';
import {drawFieldTool,drawToolIcon} from './battlefield-ui.js?v=5.18.0';
import {drawAffordanceArt,affordanceArtSpec} from './affordance-art.js?v=5.38';

const element=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const distance=(w,o)=>Math.hypot(w.state.x-o.xy[0]-.5,w.state.y-o.xy[1]-.5);
let currentPreview=null,currentTactic=null;

export function livingBattleActions(b,h,target,inventory={}){
 if(!b||!h)return[];const t=typeof target==='object'?target:b.enemies.find(e=>e.id===target);
 return [...ecologyActions(b,h,t,inventory).map(a=>({...a,system:'ecology'})),...anatomyActions(b,h,t).map(a=>({...a,system:'anatomy'})),...positionActions(b,h,t).map(a=>({...a,system:'position'})),...legacyActions(b,h,t).map(a=>({...a,system:'legacy',...(finite(a.preview)?{preview:{enabled:a.enabled,from:{x:h.x,y:h.y},to:a.preview,path:[a.preview]}}:{})}))];
}

export function livingBattleSummary(b,h,target){
 const t=typeof target==='object'?target:b?.enemies?.find(e=>e.id===target);if(!b||!t)return null;
 const ecology=ecologySummary(b,t),anatomy=anatomySummary(b,t),lines=[];
 if(ecology){lines.push([ecology.label,ecology.status].filter(Boolean).join(' · '));if(ecology.needs?.food)lines.push('Appetite: '+ecology.needs.food+(ecology.needs.tools?.length?' · useful materials: '+ecology.needs.tools.join(', '):''));if(ecology.trust||ecology.grudge)lines.push('Trust '+ecology.trust+' · grudge '+ecology.grudge);}
 if(anatomy?.parts?.length){const broken=anatomy.parts.filter(p=>p.broken);lines.push(broken.length?'Changed anatomy: '+broken.map(p=>p.name||p.label).join(', '):'Target a functional part to change this creature’s actions.');}
 return {title:t.name,lines};
}

/** Costs remain visible while the authored explanation stays in Details. */
export function worldActionCaption(row){
 if(!row.enabled)return row.reason||'Unavailable';
 if(row.action==='assemble')return (String(row.detail||'').match(/^Consumes ([^.]+)/)?.[0]||'Uses the shown materials')+' · '+(row.detail?.includes('floor patch')?'repairs floor':'opens shortcut');
 if(row.action==='use-tool')return 'Uses 1 '+(WORLD_TOOL_NAMES[row.tool]||row.tool)+' · restores route';
 if(row.action==='pack')return 'Moves 1 → next encounter';
 if(row.action==='prepare')return row.plan==='flank'?'Uses 1 Salvage hook · side entry':row.plan==='lure'?'Uses 1 bell + 1 reeds · +8 seconds':'No materials · quiet entry';
 if(row.action==='take')return '1 spare → field kit';
 return row.action==='beat'?'No materials':row.action==='listen'?'Hear the return':row.action==='scout'?'Hear nearby activity':'';
}

/** A shallow tray fits between the measured HUD and the touch control zone. */
export function worldActionTrayLayout({width,height,hudBottom=0,controlTop=height}){
 const top=Math.max(8,Math.min(height-58,hudBottom+8)),bottom=Math.max(top+50,Math.min(height-8,controlTop-8)),available=Math.max(50,bottom-top);
 return {width:Math.max(100,Math.min(640,width-20)),bottom:Math.max(8,height-bottom),maxHeight:Math.min(236,available)};
}

/** Finite pickups are one explicit field action. Work keeps its native choices. */
export function mountLivingWorldUI({getWorld,getBattle=()=>null,getActive=()=>true,onWorldCommand,onBattleCommand,onOpen=()=>{},onClose=()=>{},onRefresh=()=>{},onNotice=()=>{},onPreview=()=>{}}){
 const root=document.querySelector('#game'),menu=document.querySelector('#spell-menu');
 const dock=element('div',undefined,'world-use-dock');
 const button=element('button',undefined,'world-use');button.id='world-use';button.type='button';button.hidden=true;button.setAttribute('aria-controls','spell-menu');button.setAttribute('aria-expanded','false');
 const symbol=element('span','◇','world-use-symbol'),copy=element('span'),verb=element('strong','Use surroundings'),label=element('small');symbol.setAttribute('aria-hidden','true');copy.append(verb,label);button.append(symbol,copy);
 const kitButton=element('button','Field kit','world-kit-trigger');kitButton.type='button';kitButton.hidden=true;kitButton.setAttribute('aria-label','Open field kit and preparation');dock.append(button,kitButton);root.append(dock);
 const panel=element('section',undefined,'world-action-panel');panel.id='world-action-panel';panel.hidden=true;panel.setAttribute('aria-label','Use the surroundings');
 const bar=element('div',undefined,'world-action-bar'),heading=element('strong','The surroundings'),back=element('button','Done');back.type='button';bar.append(heading,back);panel.append(bar);root.append(panel);
 let opened=false,objectId=null,sceneId=null,nearest=null,kitNearest=null,nearestState=null,nearestWorld=null,nearestScene=null,signature='',originalParent=null,originalSibling=null,openedState=null,openedWorld=null,kitOnly=false,detailsOpen=false;
 const owns=()=>opened&&menu.dataset.picker==='world-affordance'&&menu.parentElement===panel;
 const currentObject=()=>{const w=getWorld();return w&&w===openedWorld&&w.state===openedState&&w.state.scene===sceneId?worldAffordanceObjects(w).find(o=>o.affordanceId===objectId):null;};
 const preview=action=>{currentTactic=action||null;currentPreview=action?.preview||null;onPreview(action);};
 function positionTray(){
  if(!opened)return;const box=root.getBoundingClientRect?.(),hud=document.querySelector('#hud')?.getBoundingClientRect?.();if(!box?.width||!box?.height)return;
  const controls=root.classList.contains('touch-on')?['#joystick','.touch-view-reset','[data-button="a"]','[data-button="b"]','[data-button="x"]','[data-button="y"]'].map(s=>root.querySelector(s)).filter(e=>e&&!e.hidden).map(e=>e.getBoundingClientRect?.()).filter(r=>r?.width&&r.height):[];
  const view=globalThis.visualViewport,visibleBottom=view?Math.min(box.bottom,view.offsetTop+view.height):box.bottom,controlTop=controls.length?Math.min(...controls.map(r=>r.top)):visibleBottom;
  const layout=worldActionTrayLayout({width:Math.min(box.width,view?.width||box.width),height:box.height,hudBottom:hud?Math.max(0,hud.bottom-box.top):0,controlTop:Math.min(controlTop,visibleBottom)-box.top});
  panel.style.width=layout.width+'px';panel.style.bottom=layout.bottom+'px';panel.style.maxHeight=layout.maxHeight+'px';
 }
 function close({focus=false}={}){
  if(!opened)return;const own=owns();opened=false;signature='';objectId=null;openedState=null;openedWorld=null;preview(null);button.setAttribute('aria-expanded','false');panel.hidden=true;root.classList.remove('world-actions-open');
  if(own){menu.hidden=true;menu.replaceChildren();delete menu.dataset.picker;if(originalParent?.isConnected)originalParent.insertBefore(menu,originalSibling?.parentElement===originalParent?originalSibling:null);}
  originalParent=null;originalSibling=null;onClose();onRefresh();if(focus&&!button.hidden)button.focus({preventScroll:true});
 }
 function run(object,row){
  const world=getWorld();if(!world||!getActive()||getBattle()||world.state.mode!=='field')return false;
  const current=worldAffordanceObjects(world).find(o=>o.affordanceId===object?.affordanceId);if(!current)return false;
  const ready=worldAffordanceActions(world,current).find(r=>[r.action,r.tool,r.recipe,r.beat,r.plan].join(':')===[row.action,row.tool,row.recipe,row.beat,row.plan].join(':'));
  if(!ready?.enabled){onNotice(ready?.reason||'Move within reach of the current work.');return false;}
  if(typeof onWorldCommand!=='function')return false;const result=onWorldCommand(world,current,{...ready});if(result===false||result?.ok===false){onNotice(result?.notice||'That opportunity has changed.');return false;}
  if(result?.notice)onNotice(result.notice);signature='';onRefresh();return true;
 }
 function paint(){
  if(!owns())return;const w=getWorld(),o=currentObject();if(!w||!o||distance(w,o)>2.5||getBattle()){close();return;}
  positionTray();const summary=worldAffordanceSummary(w,o)||{label:o.label,text:o.text},allRows=worldAffordanceActions(w,o)||[],rows=kitOnly?allRows.filter(r=>r.action==='pack'):allRows;
  const next=JSON.stringify([o.affordanceId,summary,rows,kitOnly]);if(next===signature)return;signature=next;
  const focused=document.activeElement?.dataset?.worldKey,scroll=menu.scrollTop;menu.replaceChildren();heading.textContent=kitOnly?'Field kit':summary.label||o.label;
  const status=element('div',undefined,'world-action-state');if(!kitOnly&&summary.status)status.append(element('span',summary.status,'world-action-status'));
  if(summary.pattern?.length){const rhythm=element('span',undefined,'world-rhythm');rhythm.setAttribute('aria-label','Observed rhythm');for(const beat of summary.pattern){const mark=element('span',['·','—','○'][beat]??String(beat),'rhythm-mark');mark.setAttribute('aria-label',['low','middle','high'][beat]||String(beat));rhythm.append(mark);}status.append(rhythm);}menu.append(status);
  const actions=element('div',undefined,'world-action-grid');actions.setAttribute('aria-label','Available actions');
  for(const row of rows){const action=element('button',undefined,'world-action');action.type='button';action.disabled=!row.enabled;action.dataset.worldKey=[row.action,row.tool||'',row.recipe||'',row.beat??'',row.plan||''].join(':');
   const icon=element('span',({listen:'◉',scout:'◉',prepare:'⌁',beat:['·','—','○'][row.beat],assemble:'⟐',take:'↗',pack:'▱'})[row.action]||'◇','world-action-symbol');icon.setAttribute('aria-hidden','true');
   const text=element('span',undefined,'world-action-copy');text.append(element('strong',row.label),element('small',worldActionCaption(row)));action.append(icon,text);action.title=row.detail||row.hint||row.label;
   const state=openedState,world=openedWorld;action.onclick=()=>{if(getWorld()!==world||getWorld()?.state!==state||!currentObject())return close();if(run(currentObject(),row)&&['repair','prepare','pack'].includes(row.action))close();else{signature='';paint();}};actions.append(action);
  }
  if(!rows.length)actions.append(element('p',kitOnly?'The field kit is empty.':'This work holds.','world-action-status'));menu.append(actions);
  const details=element('details',undefined,'world-action-details');details.open=detailsOpen;details.ontoggle=()=>{detailsOpen=details.open;};details.append(element('summary',kitOnly?'Kit contents':'Details & field kit'));
  if(!kitOnly)details.append(element('p',summary.text||o.text||'Use nearby materials to change this place.','world-action-description'));
  if(summary.evidence?.length){const evidence=element('div',undefined,'world-evidence');for(const line of summary.evidence.slice(0,4))evidence.append(element('p',typeof line==='string'?line:line.label||line.text||''));details.append(evidence);}
  const held=(summary.kit||[]).filter(p=>p.count>0);details.append(element('p',held.length?held.map(p=>(p.name||p.type)+' ×'+p.count).join(' · '):'Field kit empty.','world-kit'));
  for(const row of rows)if(row.detail)details.append(element('p',row.label+' · '+row.detail,'world-action-description'));menu.append(details);menu.scrollTop=scroll;
  if(focused)for(const el of menu.querySelectorAll('[data-world-key]'))if(el.dataset.worldKey===focused&&!el.disabled){el.focus({preventScroll:true});break;}
 }
 function open(o=nearest,{details=false}={}){
  const w=getWorld();if(!w||!o||!getActive()||getBattle()||w.state.mode!=='field')return false;
  const current=worldAffordanceObjects(w).find(p=>p.affordanceId===o.affordanceId);if(!current||distance(w,current)>2.5)return false;
  if(current.affordanceKind==='salvage'&&!details){const take=worldAffordanceActions(w,current).find(r=>r.action==='take');if(!take)return false;const ok=run(current,take);if(ok){button.hidden=true;update();}return ok;}
  if(opened)close();originalParent=menu.parentElement;originalSibling=menu.nextSibling;opened=true;objectId=current.affordanceId;sceneId=w.state.scene;openedState=w.state;openedWorld=w;kitOnly=details;detailsOpen=false;signature='';panel.append(menu);panel.hidden=false;menu.hidden=false;menu.dataset.picker='world-affordance';button.setAttribute('aria-expanded','true');root.classList.add('world-actions-open');onOpen();paint();menu.querySelector('button:not(:disabled),select')?.focus({preventScroll:true});onRefresh();return true;
 }
 function update(){
  const w=getWorld(),active=!!w&&getActive()&&!getBattle()&&w.state.mode==='field';if(opened&&(!active||menu.hidden||!owns()||!currentObject()))close();
  const nearby=active?worldAffordanceObjects(w).map(o=>({o,d:distance(w,o)})).filter(p=>p.d<=2.25).sort((a,b)=>a.d-b.d):[];
  nearest=nearby.find(p=>p.o.affordanceKind!=='salvage'||!p.o.solved)?.o||null;kitNearest=nearby[0]?.o||null;nearestWorld=w;nearestState=w?.state;nearestScene=w?.state.scene;
  button.hidden=!active||!nearest||opened;kitButton.hidden=!active||!kitNearest||opened;label.textContent=nearest?.label||'';
  const take=nearest?.affordanceKind==='salvage'?worldAffordanceActions(w,nearest).find(r=>r.action==='take'):null;verb.textContent=take?.label|| (nearest?.affordanceKind==='scout'?'Listen and prepare':'Use surroundings');
  if(owns())paint();
 }
 button.onclick=()=>{const w=getWorld();if(w!==nearestWorld||w?.state!==nearestState||w?.state.scene!==nearestScene)return;owns()?close({focus:true}):open();};kitButton.onclick=()=>{const w=getWorld();if(w!==nearestWorld||w?.state!==nearestState||w?.state.scene!==nearestScene)return;open(kitNearest,{details:true});};back.onclick=()=>close({focus:true});
 for(const type of ['keydown','keyup'])panel.addEventListener(type,e=>{e.stopPropagation();if(e.code==='Escape'){e.preventDefault();close({focus:true});}});
 return {button,panel,kitButton,open,close,preview,battleActions:livingBattleActions,battleSummary:livingBattleSummary,get active(){return owns();},update};
}

function shadow(c,x,y,w=22){c.fillStyle='#0817195c';c.beginPath();c.ellipse(x,y+4,w,6,0,0,7);c.fill();}

/** Material silhouettes and construction marks communicate their actual uses. */
export function drawWorldAffordance(renderer,o,T=48,{near=false}={}){
 const c=renderer.ctx,x=(o.xy[0]+.5)*T,y=(o.xy[1]+.5)*T,time=renderer.time||0;
 const painted=drawAffordanceArt(renderer,o,T),repairPatch=['site','mechanism'].includes(o.affordanceKind)&&(o.art==='burrow'||o.art==='floorboard'||o.profileId==='burrow-trail'),floorboard=o.art==='floorboard';
 c.save();if(!painted){c.translate(x,y);const scale=T/48*(o.compactArt?.72:1);c.scale(scale,scale);if(!repairPatch)shadow(c,0,0,o.affordanceKind==='salvage'?14:o.affordanceKind==='scout'?12:o.art==='brace'?28:23);c.lineCap='round';c.lineJoin='round';c.lineWidth=2;c.strokeStyle='#263733';
 if(o.affordanceKind==='salvage'){
  if(o.solved)c.globalAlpha=.35;
  // Loose repair stock is clay, dull metal, wood and twine. Inventory icons
  // keep their high-contrast colours; the physical spare belongs to the floor.
  const tool=o.toolType||o.art;c.save();c.translate(0,-8);c.scale(.62,.62);c.strokeStyle='#4c4b3b';c.lineWidth=1.7;
  if(tool==='jar'){
   c.fillStyle='#917354';c.beginPath();c.moveTo(-7,-14);c.lineTo(7,-14);c.lineTo(6,-5);c.bezierCurveTo(17,4,14,16,0,17);c.bezierCurveTo(-14,16,-17,4,-6,-5);c.closePath();c.fill();c.stroke();
   c.strokeStyle='#b19a72';c.lineWidth=2;c.beginPath();c.ellipse(0,-13,7,2,0,0,7);c.stroke();c.fillStyle='#46564b';c.beginPath();c.ellipse(0,-13,4.5,1.2,0,0,7);c.fill();c.strokeStyle='#786145';c.lineWidth=2;c.beginPath();c.moveTo(8,-2);c.bezierCurveTo(20,-4,20,10,12,10);c.stroke();
  }else if(tool==='plank'){
   c.rotate(-.28);c.fillStyle='#978260';c.beginPath();c.roundRect(-11,-17,22,33,2);c.fill();c.stroke();c.strokeStyle='#c2ab7b66';c.lineWidth=1;for(const sx of [-5,4]){c.beginPath();c.moveTo(sx,-13);c.lineTo(sx,12);c.stroke();}
  }else if(tool==='hook'){
   c.strokeStyle='#716149';c.lineWidth=5;c.beginPath();c.moveTo(-8,16);c.lineTo(7,-13);c.stroke();c.strokeStyle='#8d9689';c.lineWidth=3;c.beginPath();c.moveTo(-8,15);c.lineTo(7,-13);c.bezierCurveTo(16,-25,24,-9,12,-6);c.stroke();
  }else if(tool==='bell'){
   c.fillStyle='#9d895f';c.beginPath();c.moveTo(-12,8);c.quadraticCurveTo(-8,2,-8,-5);c.bezierCurveTo(-8,-18,8,-18,8,-5);c.quadraticCurveTo(8,2,12,8);c.closePath();c.fill();c.stroke();c.fillStyle='#b2a07b';c.fillRect(-12,7,24,3);c.fillStyle='#66583e';c.beginPath();c.arc(0,12,2.5,0,7);c.fill();
  }else if(tool==='coil'){
   c.strokeStyle='#655b46';c.lineWidth=5;c.beginPath();c.moveTo(-13,15);c.lineTo(11,-16);c.stroke();c.strokeStyle='#9a8867';c.lineWidth=2.5;for(let i=0;i<5;i++){c.beginPath();c.ellipse(-8+i*4,9-i*5,7,3,-.9,0,7);c.stroke();}c.strokeStyle='#899082';c.lineWidth=2;c.beginPath();c.moveTo(11,-16);c.lineTo(15,-20);c.stroke();
  }else{
   c.strokeStyle='#7f8861';c.lineWidth=2;for(let sx=-10;sx<=10;sx+=5){c.beginPath();c.moveTo(sx,17);c.quadraticCurveTo(sx-3,-5,sx+4,-17);c.stroke();}c.strokeStyle='#a18a5f';c.lineWidth=2;for(const sy of [-4,3]){c.beginPath();c.moveTo(-11,sy);c.lineTo(12,sy+2);c.stroke();}
  }
  c.restore();
 }else if(repairPatch){
  // A shallow disturbed verge and loose crossing boards, not water machinery.
  c.fillStyle=floorboard?'#51453699':'#514a3b88';c.beginPath();c.moveTo(-27,0);c.quadraticCurveTo(-17,-11,-5,-8);c.quadraticCurveTo(8,-13,25,-3);c.lineTo(28,5);c.quadraticCurveTo(7,13,-17,8);c.closePath();c.fill();
  c.fillStyle=o.solved?'#665b45':'#292e26';c.beginPath();c.ellipse(0,-1,12,5,-.08,0,7);c.fill();
  for(let i=0;i<3;i++){c.save();c.translate((i-1)*13,o.solved?0:(i%2?-4:2));c.rotate(o.solved?-.08:(i-1)*.24);c.fillStyle=i%2?'#8a7856':'#9c8861';c.strokeStyle='#514a37';c.lineWidth=1;c.beginPath();c.roundRect(-7,-8,13,15,1);c.fill();c.stroke();c.strokeStyle='#c0aa745c';c.beginPath();c.moveTo(-3,-6);c.lineTo(-3,5);c.stroke();c.restore();}
  if(floorboard){c.fillStyle='#746b54';for(const [sx,sy]of [[-18,-5],[18,5],[-6,5],[7,-5]]){c.beginPath();c.arc(sx,sy,.9,0,7);c.fill();}}
  else{c.fillStyle='#7b7d68';for(const [sx,sy]of [[-23,3],[22,5],[-19,-6]]){c.beginPath();c.ellipse(sx,sy,3.5,2,.2,0,7);c.fill();}
   c.strokeStyle='#68744d';c.lineWidth=1;for(let i=0;i<3;i++){c.beginPath();c.moveTo(23+i*2,2);c.lineTo(21+i*3,-7-i);c.stroke();}}
 }else if(o.affordanceKind==='scout'||['hydrophone','lookout','listen'].includes(o.art)){
  // A compact floor-contact probe, copper stem, and a short coiled lead.
  c.fillStyle='#4e645e';c.strokeStyle='#2d3d36';c.lineWidth=1.4;c.beginPath();c.ellipse(-3,-3,10,4,0,0,7);c.fill();c.stroke();
  c.fillStyle='#857452';c.beginPath();c.roundRect(-6,-22,6,20,2);c.fill();c.stroke();
  c.strokeStyle='#b5a17a';c.lineWidth=2.5;c.beginPath();c.arc(-3,-23,5.5,Math.PI*.15,Math.PI*1.85);c.stroke();
  c.strokeStyle='#565a43';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-11);c.bezierCurveTo(15,-14,18,2,9,4);c.bezierCurveTo(3,7,2,1,7,0);c.stroke();
  c.fillStyle=o.solved?'#9caa8e':'#b3a481';c.beginPath();c.ellipse(-3,-4,4,1.5,0,0,7);c.fill();
  if(near){c.strokeStyle='#8caaa35c';c.lineWidth=.8;for(let i=0;i<2;i++){c.beginPath();c.arc(-3,-23,7+i*3,-2.5,-.7);c.stroke();}}
 }else if(o.art==='sluice'){
  c.fillStyle='#586662';for(const [sx,sy,sw,sh]of[[-28,-31,12,32],[16,-31,12,32],[-25,-36,50,9]]){c.beginPath();c.roundRect(sx,sy,sw,sh,3);c.fill();c.stroke();}c.strokeStyle='#9a8157';c.lineWidth=3;for(let i=-12;i<=12;i+=8){c.beginPath();c.moveTo(i,-29);c.lineTo(i,o.solved?-19:-2);c.stroke();}c.strokeStyle=o.solved?'#85b6b1':'#507d82';c.lineWidth=2;for(let i=0;i<3;i++){c.beginPath();c.moveTo(-14,2+i*4);c.quadraticCurveTo(0,-3+i*4+Math.sin(time+i)*2,14,2+i*4);c.stroke();}c.strokeStyle='#c9ae78';c.beginPath();c.arc(22,-28,7,0,7);c.moveTo(15,-28);c.lineTo(29,-28);c.moveTo(22,-35);c.lineTo(22,-21);c.stroke();
 }else if(o.art==='brace'){
  c.fillStyle='#646c64';for(const [sx,sy,r]of[[-20,-2,9],[-4,-4,11],[15,-1,8]]){c.beginPath();c.ellipse(sx,sy,r,r*.6,-.3,0,7);c.fill();c.stroke();}c.strokeStyle=o.solved?'#c2aa78':'#8e7856';c.lineWidth=7;c.beginPath();c.moveTo(-23,0);c.lineTo(o.solved?-8:5,-37);c.moveTo(23,0);c.lineTo(8,-37);c.moveTo(-13,-34);c.lineTo(14,-34);c.stroke();c.strokeStyle='#e1c89388';c.lineWidth=1;c.beginPath();c.moveTo(-22,-2);c.lineTo(o.solved?-8:5,-37);c.stroke();if(o.solved){c.strokeStyle='#839d82';c.lineWidth=2;c.beginPath();c.moveTo(-12,-20);c.lineTo(12,-20);c.moveTo(-12,-16);c.lineTo(12,-16);c.stroke();}
 }else if(o.art==='relay'){
  c.fillStyle='#455a57';c.beginPath();c.roundRect(-7,-51,14,52,4);c.fill();c.stroke();c.strokeStyle='#bd9b6b';c.lineWidth=3;c.beginPath();c.moveTo(-22,-42);c.lineTo(22,-42);c.moveTo(0,-58);c.lineTo(0,-42);c.stroke();c.fillStyle=o.solved?'#8da99a':'#c9a176';c.beginPath();c.arc(0,-56,5,0,7);c.fill();c.strokeStyle=o.solved?'#688c8155':'#b5c7a680';c.lineWidth=1;for(let i=0;i<2;i++){c.beginPath();c.arc(0,-52,11+i*6,-2.7,-.45);c.stroke();}c.strokeStyle='#927651';c.lineWidth=2;c.beginPath();c.moveTo(-6,-33);c.bezierCurveTo(16,-29,-16,-17,5,-7);c.stroke();if(o.solved){c.strokeStyle='#d2b67d';c.beginPath();c.moveTo(-6,-23);c.lineTo(6,-15);c.moveTo(6,-23);c.lineTo(-6,-15);c.stroke();}
 }else if(o.art==='resonancegate'){
  c.strokeStyle='#394d49';c.lineWidth=13;c.beginPath();c.ellipse(0,-25,23,31,0,Math.PI,Math.PI*2);c.moveTo(-23,-25);c.lineTo(-23,0);c.moveTo(23,-25);c.lineTo(23,0);c.stroke();c.strokeStyle='#9fae96';c.lineWidth=2;c.beginPath();c.ellipse(0,-25,23,31,0,Math.PI,Math.PI*2);c.stroke();for(let i=0;i<3;i++){const sx=(i-1)*15;c.fillStyle=i<(o.progress||0)?'#c7ba81':'#6b8277';c.beginPath();c.roundRect(sx-5,-14,10,11,2);c.fill();c.strokeStyle='#c8c5a477';c.lineWidth=1;c.beginPath();i===0?(c.moveTo(sx,-10),c.lineTo(sx,-7)):i===1?(c.moveTo(sx-3,-9),c.lineTo(sx+3,-9)):c.arc(sx,-9,2.5,0,7);c.stroke();}if(!o.solved){c.strokeStyle='#708f8a99';c.setLineDash([2,5]);c.lineWidth=1;c.beginPath();c.moveTo(0,-48);c.lineTo(0,-19);c.stroke();c.setLineDash([]);}
 }else{
  c.fillStyle='#485f5d';c.strokeStyle='#253936';c.beginPath();c.ellipse(0,-8,22,7,0,0,7);c.fill();c.stroke();c.strokeStyle='#bea779';c.lineWidth=3;c.beginPath();c.moveTo(-13,-10);c.lineTo(-12,-36);c.quadraticCurveTo(4,-45,15,-31);c.lineTo(13,-10);c.stroke();c.strokeStyle='#b7c5a1';c.lineWidth=1;for(let i=0;i<4;i++){c.beginPath();c.moveTo(-8+i*5,-33+i);c.lineTo(-8+i*5,-12);c.stroke();}c.strokeStyle='#9bb8ad77';for(let i=0;i<2;i++){c.beginPath();c.ellipse(0,0,27+i*7,9+i*3,0,0,7);c.stroke();}
 }
 }else c.translate(x,y);
 if(near&&!o.solved){c.strokeStyle='#d5c18b';c.lineWidth=1;c.beginPath();c.moveTo(-6,12);c.lineTo(0,8);c.lineTo(6,12);c.stroke();}c.restore();
 if(near)renderer.label(o.label+(o.solved?(o.affordanceKind==='scout'?' · surveyed':o.affordanceKind==='salvage'?' · collected':' · restored'):''),x,y-(affordanceArtSpec(renderer.currentScene,o)?.height+12||(o.affordanceKind==='salvage'?40:o.affordanceKind==='scout'?46:['burrow','floorboard'].includes(o.art)?35:72)),true);
}

function drawPartMark(c,part,x,y,scale=1){
 c.save();c.translate(x,y);c.scale(scale,scale);c.lineCap='round';c.lineJoin='round';c.strokeStyle=part.broken?'#b08d76':'#c9c4a3';c.fillStyle=part.broken?'#5b5449':'#698078';c.lineWidth=1;
 const kind=part.effect||part.id;
 if(kind==='guard'||kind==='molt'){c.beginPath();c.moveTo(0,-5);c.lineTo(4,-2);c.lineTo(3,4);c.lineTo(-3,4);c.lineTo(-4,-2);c.closePath();c.fill();c.stroke();if(kind==='molt'){c.beginPath();c.moveTo(-2,-2);c.lineTo(0,-4);c.lineTo(2,-2);c.stroke();}}
 else if(kind==='silence'||kind==='heal'){c.beginPath();c.moveTo(-3,1);c.quadraticCurveTo(-4,-5,0,-5);c.quadraticCurveTo(4,-5,3,1);c.lineTo(4,3);c.lineTo(-4,3);c.closePath();c.fill();c.stroke();c.beginPath();c.arc(0,4,1,0,7);c.stroke();}
 else if(kind==='mobility'||kind==='charge'){for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(i*3-1,3);c.quadraticCurveTo(i*3-3,-2,i*3+1,-5);c.lineTo(i*3+1,2);c.stroke();}}
 else if(kind==='chorus'){for(let i=0;i<4;i++){const a=i*Math.PI/2;c.beginPath();c.ellipse(Math.cos(a)*3,Math.sin(a)*3,2,3,a,0,7);c.fill();c.stroke();}c.fillStyle='#c5b987';c.beginPath();c.arc(0,0,1.5,0,7);c.fill();}
 else if(kind==='siphon'||kind==='ink'){c.beginPath();c.moveTo(0,-5);c.bezierCurveTo(1,-2,5,0,4,3);c.quadraticCurveTo(0,7,-4,3);c.bezierCurveTo(-5,0,-1,-2,0,-5);c.fill();c.stroke();}
 else if(kind==='tempo'){c.beginPath();c.arc(0,0,4.5,0,7);c.stroke();c.beginPath();c.moveTo(0,-3);c.lineTo(0,0);c.lineTo(3,1);c.stroke();}
 else if(kind==='heat'){c.beginPath();c.moveTo(0,-5);c.bezierCurveTo(0,-1,5,0,3,4);c.quadraticCurveTo(-1,7,-3,3);c.quadraticCurveTo(-5,1,-2,-2);c.lineTo(0,1);c.closePath();c.fill();c.stroke();}
 else{c.beginPath();c.moveTo(0,-5);c.lineTo(4,0);c.lineTo(0,5);c.lineTo(-4,0);c.closePath();c.fill();c.stroke();}
 if(part.broken){c.strokeStyle='#d8b28c';c.lineWidth=1.2;c.beginPath();c.moveTo(-2,-4);c.lineTo(1,-1);c.lineTo(-1,1);c.lineTo(2,4);c.stroke();}c.restore();
}

export function drawCreatureDepth(renderer,battle,actor,T=48){
 if(!battle||actor.boss&&battle.chapter!==16)return;const c=renderer.ctx,summary=ecologySummary(battle,actor),anatomy=anatomySummary(battle,actor),parts=anatomy?.parts||[],selected=battle.target===actor.id;
 if(actor.boss&&parts.length){c.save();for(const [i,p]of parts.entries()){const x=actor.x*T+(i===0?-27:27),y=actor.y*T-67;drawPartMark(c,p,x,y,1.8);if(actor.status?.resonatorOpening>0&&!p.broken){c.strokeStyle='#e7c47b';c.lineWidth=1.5;c.beginPath();c.arc(x,y,12,0,Math.PI*2);c.stroke();}c.fillStyle='#e8dcba';c.font='600 8px system-ui';c.textAlign='center';c.fillText(String(i+1),x,y+19);}c.restore();}
 const colors={hungry:'#cbb787',nesting:'#c3b29c',territorial:'#b5a080',scavenging:'#b1c2a5',frightened:'#aec8c5'};
 c.save();if(summary?.withdrawn)c.globalAlpha=.65;
 if(summary?.tethered){c.strokeStyle='#9d986f';c.lineWidth=1.5;for(let i=-1;i<=1;i++){c.beginPath();c.ellipse(actor.x*T,actor.y*T+3+i*3,20,6,0,0,7);c.stroke();}}
 if(summary?.motive==='nesting'&&!summary.nestSafe){c.fillStyle='#ad9a73';c.strokeStyle='#524f3d';c.lineWidth=1;c.beginPath();c.ellipse(actor.x*T+22,actor.y*T,12,6,-.2,0,7);c.fill();c.stroke();c.fillStyle='#d1c5a6';for(let i=0;i<2;i++){c.beginPath();c.ellipse(actor.x*T+18+i*7,actor.y*T-4,3,4,.2,0,7);c.fill();}}
 if(parts.length){const span=14,start=actor.x*T-(parts.length-1)*span/2;for(let i=0;i<parts.length;i++){const p=parts[i],x=start+i*span,y=actor.y*T+20;drawPartMark(c,p,x,y);if(!p.broken&&p.integrity<p.maxIntegrity){c.fillStyle='#d8c18c';c.fillRect(x-4,y+6,8*clamp(p.integrity/p.maxIntegrity),1.5);}if(selected&&currentTactic?.system==='anatomy'&&currentTactic.partId===p.id){c.strokeStyle='#e1cea0';c.lineWidth=1;c.beginPath();c.ellipse(x,y,7,8,0,0,7);c.stroke();c.setLineDash([2,4]);c.beginPath();c.moveTo(x,y-8);c.lineTo(actor.x*T+(i-1)*16,actor.y*T-26-i*10);c.stroke();c.setLineDash([]);drawPartMark(c,p,actor.x*T+(i-1)*16,actor.y*T-26-i*10,1.8);}}}
 if(selected&&summary){const text=summary.withdrawn?'WITHDRAWN':summary.label||summary.motive;c.font='600 9px system-ui';c.textAlign='center';c.strokeStyle='#10231f';c.lineWidth=3;c.strokeText(text,actor.x*T,actor.y*T+35);c.fillStyle=colors[summary.motive]||'#c8d5bd';c.fillText(text,actor.x*T,actor.y*T+35);if(summary.trust>0){c.fillStyle='#c7d9b5';for(let i=0;i<Math.min(3,summary.trust);i++){c.beginPath();c.arc(actor.x*T+24+i*5,actor.y*T+18,1.5,0,7);c.fill();}}}
 c.restore();
}

export function drawLivingPreview(renderer,battle,T=48){const p=renderer.livingPreview||currentPreview;if(!battle||!p||!finite(p.from)||!finite(p.to))return;const c=renderer.ctx,path=p.path?.filter(finite)||[p.from,p.to];c.save();c.strokeStyle=p.enabled?'#dac994b8':'#c39680b8';c.fillStyle=p.enabled?'#dac994':'#c39680';c.lineWidth=2;c.setLineDash([5,5]);c.beginPath();c.moveTo(p.from.x*T,p.from.y*T);for(const n of path)c.lineTo(n.x*T,n.y*T);c.lineTo(p.to.x*T,p.to.y*T);c.stroke();c.setLineDash([]);c.beginPath();c.ellipse(p.to.x*T,p.to.y*T,18,7,0,0,7);c.stroke();const dx=p.to.x-p.from.x,dy=p.to.y-p.from.y,a=Math.atan2(dy,dx);c.translate(p.to.x*T,p.to.y*T);c.rotate(a);c.beginPath();c.moveTo(2,0);c.lineTo(-8,-5);c.lineTo(-8,5);c.closePath();c.fill();c.restore();}

/** Finite sounds, dens and body-history anchors are placed on their actual floor cells. */
export function drawLivingGround(renderer,battle,T=48){
 if(!battle)return;const c=renderer.ctx,time=renderer.time||0;
 c.save();
 for(const record of battle.ecology?.creatures||[]){
  const actor=battle.enemies.find(e=>e.id===record.actorId);if(!actor||actor.hp<=0||actor.withdrawn)continue;
  if(finite(record.den)&&battle.target===actor.id){c.strokeStyle='#9bab8266';c.lineWidth=1;c.setLineDash([2,5]);c.beginPath();c.ellipse(record.den.x*T,record.den.y*T,20,8,0,0,7);c.stroke();c.setLineDash([]);for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(record.den.x*T+i*7,record.den.y*T);c.quadraticCurveTo(record.den.x*T+i*7-4,record.den.y*T-9,record.den.x*T+i*7+2,record.den.y*T-14);c.stroke();}}
  const lure=record.lure;if(finite(lure)&&lure.charges>0){c.strokeStyle='#a9c6b39c';c.lineWidth=1.5;for(let i=0;i<2;i++){c.beginPath();c.ellipse(lure.x*T,lure.y*T,13+i*7+Math.sin(time*3)*2,5+i*3,0,0,7);c.stroke();}c.fillStyle='#cbbd93';c.beginPath();c.roundRect(lure.x*T-6,lure.y*T-14,12,14,3);c.fill();}
 }
 for(const anchor of battle.legacy?.anchors||[]){if(!finite(anchor)||anchor.charges<=0||anchor.expiresAt<=battle.time)continue;c.save();c.translate(anchor.x*T,anchor.y*T);c.strokeStyle='#c9af7d';c.fillStyle='#9d8160';c.lineWidth=2;c.beginPath();c.ellipse(0,3,20,7,0,0,7);c.stroke();for(const x of [-13,0,13]){c.beginPath();c.roundRect(x-5,-9,10,13,2);c.fill();c.stroke();}c.restore();}
 for(const shadow of battle.legacy?.shadows||[]){if(!finite(shadow)||shadow.charges<=0||shadow.expiresAt<=battle.time)continue;c.save();c.translate(shadow.x*T,shadow.y*T);c.globalAlpha=.28;c.fillStyle='#b7acbf';c.beginPath();c.ellipse(0,3,18,7,0,0,7);c.fill();c.beginPath();c.moveTo(-12,-4);c.quadraticCurveTo(-14,-22,-7,-29);c.quadraticCurveTo(0,-35,7,-29);c.quadraticCurveTo(14,-22,12,-4);c.closePath();c.fill();c.beginPath();c.arc(0,-39,7,0,7);c.fill();c.restore();}
 c.restore();drawLivingPreview(renderer,battle,T);
}

export function livingEventVisual(renderer,event){
 if(!event||!['ecology','anatomy','position','legacy','affordance'].includes(event.type))return false;const target=event.target||event.actor;if(!finite(target))return true;
 const label=event.label||({food:'FED',soothe:'CALMED',lure:'LURED',rescue:'FREED',shelter:'SHELTERED',release:'TRUST EARNED','hit-part':'PART STRUCK','break-part':'PART BROKEN',salvage:'MATERIAL RELEASED',push:'DISPLACED',pull:'PULLED',collision:'COLLISION',anchor:'CLAY ANCHORED',listen:'THREAT HEARD','ash-step':'ASH STEP'})[event.action];if(label)renderer.effects.push({kind:'number',x:target.x,y:target.y-.7,value:label,color:event.color||({ecology:'#bfcea8',anatomy:'#dfc095',position:'#c9d1b2',legacy:'#cfbca4'})[event.type]||'#c5d5ba',t:0,life:1.3});
 if(event.type==='position'&&finite(event.from))renderer.effects.push({kind:'inspect',x:event.from.x,y:event.from.y,color:'#cabc93',t:0,life:.55});return true;
}
