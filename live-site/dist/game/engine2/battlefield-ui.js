import {FIELD_TOOLS,fieldOptions,fieldLabel} from './battlefield.js?v=5.18.0';
import {legacyAllowsTool} from './hero-legacy.js?v=5.5.0';

const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};

/** Uses the existing battle picker, including its persistent Back button. */
export function mountBattlefieldUI({getBattle,getActor,getTarget,onCommand,getExtraActions=()=>[],getExtraSummary=()=>null,onExtraCommand=onCommand,onPreview=()=>{},onNotice=()=>{},onRefresh=()=>{},onOpen=()=>{},onClose=()=>{}}){
 const commands=document.querySelector('#commands .command-grid'),menu=document.querySelector('#spell-menu');
 const button=node('button','Field','field-command');button.type='button';button.id='cmd-field';button.setAttribute('aria-controls','spell-menu');button.setAttribute('aria-expanded','false');button.hidden=true;button.disabled=true;commands.append(button);
 let opened=false,signature='',lastBattle=null,marker=null,category='';
 const groupNames={field:'Tools',ecology:'Creature',anatomy:'Body parts',position:'Position',legacy:'Legacy'};
 const ownsMenu=()=>opened&&menu.dataset.picker==='field'&&(!marker||menu.contains(marker));
 function close(){if(!opened)return;const own=ownsMenu();opened=false;signature='';marker=null;onPreview(null);button.setAttribute('aria-expanded','false');if(own){delete menu.dataset.picker;menu.hidden=true;menu.replaceChildren();}onClose();onRefresh();}
 function paint(){
  if(!ownsMenu())return;const battle=getBattle(),hero=getActor(),selected=getTarget(),target=typeof selected==='object'?selected:battle?.enemies?.find(e=>e.id===selected);
  if(!battle||battle.ended){close();return;}
  const fieldActions=hero&&battle.field?.enabled?fieldOptions(battle,hero,target).map(a=>({...a,system:'field',...(!legacyAllowsTool(battle,hero)&&a.action==='take'?{enabled:false,reason:'The kiln-grown arm is holding a crossing.'}:{})})):[],extra=hero?getExtraActions(battle,hero,target)||[]:[],actions=[...fieldActions,...extra],gear=hero?fieldLabel(battle,hero):'',enemyGear=target?fieldLabel(battle,target):'',extraSummary=getExtraSummary(battle,hero,target);
  const groups=[...new Set(actions.map(a=>a.system||'field'))];if(!groups.includes(category))category=groups.includes('ecology')?'ecology':groups[0]||'field';
  const next=JSON.stringify([hero?.id,gear,target?.id,enemyGear,hero?.atb>=1,actions,extraSummary,category]);if(next===signature)return;signature=next;
  const focused=document.activeElement?.dataset?.fieldKey,scroll=menu.scrollTop;menu.replaceChildren();
  const summary=node('p',hero?(hero.name+' · '+(gear||'hands free')+(enemyGear?' | '+target.name+' carries '+enemyGear:'')):'Choose a ready crew member.','field-picker-summary');marker=summary;menu.append(summary,node('p','Each successful choice uses one ready action. Close Tactics to move into reach.','field-picker-cost'));
  if(extraSummary){const title=typeof extraSummary==='string'?extraSummary:extraSummary.title,lines=typeof extraSummary==='object'?extraSummary.lines||[]:[];if(title)menu.append(node('p',title,'tactics-target-title'));for(const line of lines.filter(Boolean).slice(0,4))menu.append(node('p',line,'tactics-target-detail'));}
  if(groups.length>1){const tabs=node('div',undefined,'tactics-category');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Tactics category');const symbols={field:'⚒',ecology:'◌',anatomy:'◇',position:'↔',legacy:'✧'};for(const group of groups){const rows=actions.filter(a=>(a.system||'field')===group),tab=node('button');tab.type='button';tab.dataset.fieldKey='category:'+group;tab.setAttribute('aria-pressed',String(group===category));tab.setAttribute('aria-label',(groupNames[group]||group)+', '+rows.filter(a=>a.enabled).length+' ready actions');const icon=node('span',symbols[group]||'◇');icon.setAttribute('aria-hidden','true');tab.append(icon,document.createTextNode(groupNames[group]||group));tab.onclick=()=>{category=group;signature='';onPreview(null);paint();};tabs.append(tab);}menu.append(tabs);}
  if(!hero||hero.atb<1)menu.append(node('p','Wait for a crew member to be ready.','field-picker-wait'));
  if(!actions.length)menu.append(node('p','No tactics are available here. Move closer to a marked object or creature.','field-picker-empty'));
  for(const action of actions.filter(a=>groups.length<2||(a.system||'field')===category)){
   const row=node('button',undefined,'field-action');row.type='button';row.dataset.fieldKey=[action.system,action.action,action.propId||action.partId||action.nodeId||''].join(':');row.disabled=!action.enabled;
   const prop=battle.field?.props?.find(p=>p.id===action.propId);let icon;if(action.system==='field'){icon=document.createElement('canvas');icon.width=48;icon.height=48;icon.className='field-action-icon';icon.setAttribute('aria-hidden','true');drawToolIcon(icon.getContext('2d'),prop||{type:action.action==='disarm'?'hook':'plank'},48);}else{icon=node('span',({ecology:'◌',anatomy:'◇',position:'↔',legacy:'✧'})[action.system]||'◇','tactics-action-symbol');icon.setAttribute('aria-hidden','true');}
   const copy=node('span',undefined,'field-action-copy'),title=node('strong',action.label),hint=action.detail||action.hint,detail=node('small',action.enabled?hint:action.reason||hint);copy.append(title,detail);row.append(icon,copy);row.title=hint||action.reason||action.label;
   row.onfocus=()=>onPreview(action);row.onpointerenter=()=>onPreview(action);row.onpointerleave=()=>onPreview(null);
   row.onclick=()=>{const request={...action};delete request.enabled;delete request.reason;delete request.hint;delete request.detail;delete request.label;delete request.preview;const result=action.system==='field'?onCommand(request):onExtraCommand(request);if(result===false){onNotice('That opportunity has changed. Check range, supplies and readiness.');signature='';paint();return;}close();};menu.append(row);
  }
  const cancel=node('button','Cancel','field-picker-cancel');cancel.type='button';cancel.onclick=()=>{close();button.focus({preventScroll:true});};menu.append(cancel);menu.scrollTop=scroll;
  if(focused)for(const row of menu.querySelectorAll('[data-field-key]'))if(row.dataset.fieldKey===focused&&!row.disabled){row.focus({preventScroll:true});break;}
 }
 button.onclick=()=>{const b=getBattle();if(!b)return;if(ownsMenu())return close();opened=true;lastBattle=b;signature='';marker=null;menu.dataset.picker='field';menu.hidden=false;button.setAttribute('aria-expanded','true');onOpen();paint();onRefresh();};
 return {button,close,update(){const b=getBattle(),h=getActor(),t=getTarget(),extra=b&&h?getExtraActions(b,h,t)||[]:[],active=!!b&&(!!b.field?.enabled||!!extra.length);button.textContent=extra.length?'Tactics':'Field';button.setAttribute('aria-label',extra.length?'Tactics: tools, creatures, body parts, positioning and legacy':'Field tools');button.hidden=!active;button.disabled=!b||!!b.ended;if(opened&&(b!==lastBattle||menu.hidden||!ownsMenu())){opened=false;signature='';marker=null;onPreview(null);button.setAttribute('aria-expanded','false');if(menu.dataset.picker==='field')delete menu.dataset.picker;}if(ownsMenu())paint();}};
}

function toolShape(c,type,color,uses=2){
 c.lineJoin='round';c.lineCap='round';c.lineWidth=2;c.strokeStyle='#182526';c.fillStyle=color;
 if(type==='plank'){
  c.save();c.rotate(-.28);c.beginPath();c.roundRect(-11,-17,22,33,3);c.fill();c.stroke();c.strokeStyle='#ead4a66e';c.lineWidth=1;c.beginPath();c.moveTo(-5,-13);c.lineTo(-5,12);c.moveTo(5,-14);c.lineTo(5,12);c.stroke();c.fillStyle='#677d79';for(const y of [-10,9])for(const x of [-7,7]){c.beginPath();c.arc(x,y,1.3,0,7);c.fill();}c.restore();
 }else if(type==='hook'){
  c.strokeStyle='#533b2a';c.lineWidth=6;c.beginPath();c.moveTo(-8,17);c.lineTo(7,-13);c.stroke();c.strokeStyle=color;c.lineWidth=4;c.beginPath();c.moveTo(-8,15);c.lineTo(7,-13);c.bezierCurveTo(16,-26,25,-9,12,-6);c.stroke();c.strokeStyle='#e9e1b7';c.lineWidth=1;c.beginPath();c.moveTo(-7,12);c.lineTo(8,-14);c.stroke();
 }else if(type==='bell'){
  c.beginPath();c.moveTo(-13,8);c.quadraticCurveTo(-9,3,-9,-5);c.bezierCurveTo(-9,-19,9,-19,9,-5);c.quadraticCurveTo(9,3,13,8);c.closePath();c.fill();c.stroke();c.fillStyle='#f1d899';c.fillRect(-13,7,26,4);c.fillStyle='#715b35';c.beginPath();c.arc(0,12,3,0,7);c.fill();c.strokeStyle='#ebdda8';c.beginPath();c.moveTo(-5,-9);c.quadraticCurveTo(-8,-3,-6,2);c.stroke();
 }else if(type==='jar'){
  c.beginPath();c.moveTo(-7,-15);c.lineTo(7,-15);c.lineTo(6,-6);c.bezierCurveTo(20,6,14,18,0,18);c.bezierCurveTo(-14,18,-20,6,-6,-6);c.closePath();c.fill();c.stroke();c.fillStyle='#4c8e9a';c.beginPath();c.ellipse(0,5,9,5,0,0,7);c.fill();c.strokeStyle='#e8d5a0';c.lineWidth=3;c.beginPath();c.moveTo(-7,-14);c.lineTo(7,-14);c.stroke();
 }else if(type==='coil'){
  c.strokeStyle='#644837';c.lineWidth=6;c.beginPath();c.moveTo(-13,15);c.lineTo(11,-16);c.stroke();c.strokeStyle=color;c.lineWidth=3;for(let i=0;i<5;i++){c.beginPath();c.ellipse(-8+i*4,9-i*5,7,3,-.9,0,7);c.stroke();}c.strokeStyle='#cdd7bd';c.lineWidth=2;c.beginPath();c.moveTo(11,-16);c.lineTo(15,-21);c.stroke();
 }else{
  c.strokeStyle='#776343';c.lineWidth=2;for(let x=-10;x<=10;x+=5){c.beginPath();c.moveTo(x,17);c.quadraticCurveTo(x-3,-5,x+4,-17);c.stroke();}c.strokeStyle=color;c.lineWidth=2.5;for(let y=-11;y<=11;y+=5){c.beginPath();c.moveTo(-12,y);c.quadraticCurveTo(0,y+4,13,y);c.stroke();}c.strokeStyle='#ead5a1';c.beginPath();c.moveTo(-12,0);c.lineTo(12,2);c.stroke();
 }
 if(uses===1){c.strokeStyle='#e9d1a3';c.lineWidth=1;c.beginPath();c.moveTo(-3,-7);c.lineTo(1,-1);c.lineTo(-2,4);c.stroke();}
}

export function drawToolIcon(c,prop,size=48){const def=FIELD_TOOLS[prop.type]||{},color=def.color||'#c4b391';c.save();c.clearRect(0,0,size,size);c.translate(size/2,size/2);c.scale(size/48,size/48);toolShape(c,prop.type,color,prop.uses);c.restore();}

/** The same material silhouette appears in the world, in hand and in the picker. */
export function drawFieldTool(c,type,x,y,{scale=.8,uses=2}={}){c.save();c.translate(x,y);c.scale(scale,scale);toolShape(c,type,FIELD_TOOLS[type]?.color||'#c4b391',uses);c.restore();}

/** Floor props are actual finite battle resources; carried props render on actors. */
export function drawBattlefield(renderer,battle,T=48){
 if(!battle?.field?.enabled)return;const c=renderer.ctx,time=renderer.time||0;
 for(const prop of battle.field.props){if(prop.ownerId!==null||prop.condition==='spent'||prop.condition==='cover'||prop.uses<=0)continue;const def=FIELD_TOOLS[prop.type]||{};c.save();c.translate(prop.x*T,prop.y*T);c.fillStyle='#09141955';c.beginPath();c.ellipse(0,4,16,5,0,0,7);c.fill();c.strokeStyle=(def.color||'#dbc597')+'88';c.lineWidth=1;c.setLineDash([2,4]);c.beginPath();c.ellipse(0,4,20,8,0,0,7);c.stroke();c.setLineDash([]);c.scale(.68,.68);c.translate(0,-10);toolShape(c,prop.type,def.color||'#c7b58c',prop.uses);c.restore();}
 for(const cover of battle.field.cover||[]){if(cover.integrity<=0)continue;c.save();c.translate(cover.x*T,cover.y*T);c.fillStyle='#08181766';c.beginPath();c.ellipse(0,5,27,9,0,0,7);c.fill();c.strokeStyle=cover.ownerTeam==='heroes'?'#9bc9b4':'#d8a987';c.lineWidth=1.5;c.setLineDash([4,5]);c.beginPath();c.ellipse(0,4,(cover.radius||.85)*T,(cover.radius||.85)*T*.35,0,0,7);c.stroke();c.setLineDash([]);c.rotate(-.3);c.fillStyle='#806747';c.strokeStyle='#302c27';c.lineWidth=2;c.beginPath();c.roundRect(-24,-19,48,23,3);c.fill();c.stroke();c.strokeStyle='#c5aa73';c.lineWidth=1;c.beginPath();c.moveTo(-19,-11);c.lineTo(19,-11);c.moveTo(-19,-3);c.lineTo(19,-3);c.stroke();c.restore();}
}

export function drawCarriedTool(c,actor,prop,T=48,time=0){
 if(!prop||prop.uses<=0||prop.condition==='spent')return;const def=FIELD_TOOLS[prop.type]||{};c.save();c.translate(actor.x*T+18*T/48,actor.y*T-26*T/48);c.rotate(actor.pose>0?-.65:-.22);c.scale(T/48*.68,T/48*.68);toolShape(c,prop.type,def.color||'#c7b58c',prop.uses);c.restore();
}

export function fieldEventVisual(renderer,event){
 if(event?.type!=='field'||!event.actor)return false;
 const labels={take:'TOOL TAKEN',scavenge:'ARMED',disarm:'DISARMED',cover:'COVER SET',ring:'SIGNAL BROKEN','cover-block':'BLOCKED','hook-interrupt':'HOOK BREAK',spent:'TOOL SPENT'};
 const label=labels[event.action];if(!label)return true;
 const actor=event.action==='disarm'||event.action==='hook-interrupt'?event.target||event.actor:event.actor;
 renderer.effects.push({kind:'number',x:actor.x,y:actor.y-1,value:label,color:event.action==='cover-block'?'#a9d5bd':'#dec79b',t:0,life:1.1});return true;
}
