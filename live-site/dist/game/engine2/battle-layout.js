/** The camera reserves measured UI bands rather than guessing a fixed console height. */
export function battleViewport(height,hudHeight,dockHeight){const top=Math.max(48,hudHeight),bottom=Math.max(72,dockHeight+12),end=Math.max(top,height-bottom);return {top,bottom,centerY:(top+end)/2,visibleHeight:end-top};}
/** Use the existing Cancel action, which also clears the game's picker state. */
export function cancelBattlePicker(spells){
 const cancel=[...spells.querySelectorAll('button')].reverse().find(b=>b.textContent.trim()==='Cancel');
 if(!cancel||cancel.disabled)return false;
 cancel.click();return true;
}
/** Cards have a bounded page, so commands, targets and costs never scroll away. */
export function battlePickerPage(total,page=0,size=4){
 total=Math.max(0,Math.trunc(total)||0);size=Math.max(1,Math.trunc(size)||4);
 const pages=Math.max(1,Math.ceil(total/size)),current=Math.max(0,Math.min(pages-1,Math.trunc(page)||0));
 return {page:current,pages,start:current*size,end:Math.min(total,(current+1)*size),total,size};
}
export function battlePickerSize(width,height,{touch=false}={}){return height<560||touch&&width<600?2:width>=1100&&height>=850?6:4;}
export function battleConsoleSide(width,height){return width>=760&&height<560;}
/** Instrument controls travel with their action; a short screen shows one such
 * action at a time rather than clipping its native selectors below a list. */
export function battlePickerCapacity(width,height,{touch=false,hasInstruments=false}={}){return hasInstruments&&height<560?1:battlePickerSize(width,height,{touch});}
/** Derive the empty stick column from the actual live control hit boxes. */
export function battleThumbGutter({dockLeft=0,paddingLeft=6,stick=null,reset=null}={}){const edges=[stick,reset].filter(r=>r&&r.width>0&&r.height>0&&Number.isFinite(r.right)).map(r=>r.right);return edges.length?Math.max(0,Math.ceil(Math.max(...edges)-dockLeft-paddingLeft+8)):0;}
const ICONS={
 'cmd-attack':'M5 19l4-4m-3-3 6 6M9 13 18 4l2 0 0 2-9 9M4 20l2-1-1-1z',
 'cmd-mako':'M12 2 3 12l9 10 9-10zM12 2v20M3 12h18',
 'cmd-personal':'M12 2v5m0 10v5M2 12h5m10 0h5M5 5l3 3m8 8 3 3M5 19l3-3m8-8 3-3M12 8l4 4-4 4-4-4z',
 'cmd-guard':'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6zM8 12l3 3 5-6',
 'cmd-item':'M9 2h6m-5 0v6L5 17c-1 3 1 5 3 5h8c2 0 4-2 3-5l-5-9V2M7 15h10',
 'cmd-retreat':'M14 3H4v18h10M10 12h12m-5-5 5 5-5 5',
 'cmd-field':'m3 21 8-8m3-10a6 6 0 0 0-3 10 6 6 0 0 0 10-3l-4 2-5-5z',
 'cmd-objective':'M5 22V3m0 1c5-4 9 4 14 0v11c-5 4-9-4-14 0',
};
const LABELS={'cmd-attack':'Attack','cmd-mako':'Mako','cmd-personal':'Personal','cmd-guard':'Guard','cmd-item':'Supply','cmd-retreat':'Retreat','cmd-field':'Tactics','cmd-objective':'Goal'};
const PICKER_COMMANDS={mako:'cmd-mako',personal:'cmd-personal',item:'cmd-item',field:'cmd-field',objective:'cmd-objective'};
export function battleCommandIcon(id){const path=ICONS[id];return path?'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="'+path+'" fill="none" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'):null;}
const TITLES={mako:'Mako techniques',personal:'Personal techniques',item:'Supplies',field:'Tactics',objective:'Goal & instruments'};
export function mountBattleLayout({onPageChange=()=>{}}={}){
 const commands=document.querySelector('#commands'),spells=document.querySelector('#spell-menu'),root=document.querySelector('#game'),hud=document.querySelector('#hud'),party=document.querySelector('#party'),partyHome=party?.parentElement,partyAfter=party?.nextElementSibling;
 commands.append(spells);
 const grid=commands.querySelector('.command-grid');if(grid)commands.prepend(grid);
 grid?.setAttribute('aria-label','Battle commands');
 const pickerBar=document.createElement('div'),pickerTitle=document.createElement('span'),pickerBack=document.createElement('button');
 pickerBar.className='battle-picker-bar';pickerTitle.textContent='Choose an action';
 pickerBack.type='button';pickerBack.textContent='Close';pickerBack.setAttribute('aria-label','Close action picker');pickerBack.setAttribute('aria-controls','spell-menu');
 pickerBack.onclick=()=>{if(cancelBattlePicker(spells)){page=0;commands.querySelector('.command-grid button[data-picker-active="true"]')?.focus({preventScroll:true});}};
 pickerBar.append(pickerTitle,pickerBack);commands.insertBefore(pickerBar,spells);
 const pager=document.createElement('nav'),previous=document.createElement('button'),pageLabel=document.createElement('span'),next=document.createElement('button');
 pager.className='battle-picker-pages';pager.setAttribute('aria-label','Action pages');previous.type=next.type='button';previous.textContent='←';next.textContent='→';previous.setAttribute('aria-label','Previous action page');next.setAttribute('aria-label','Next action page');pageLabel.setAttribute('role','status');pageLabel.setAttribute('aria-live','polite');pager.append(previous,pageLabel,next);spells.after(pager);
 const flow=commands.querySelector('#battle-flow'),settings=document.createElement('details'),summary=document.createElement('summary');
 settings.className='battle-settings';summary.textContent='Battle options';settings.append(summary);
 const settingsClose=document.createElement('button');settingsClose.type='button';settingsClose.className='battle-detail-close';settingsClose.textContent='Back to battle';settingsClose.setAttribute('aria-label','Close battle options');settingsClose.onclick=()=>{settings.open=false;measure();};
 for(const selector of ['.battle-topline','.growth-details']){const node=flow.querySelector(selector);if(node)settings.append(node);}const settingsActions=document.createElement('div'),settingsPause=document.createElement('button');settingsActions.className='battle-detail-actions';settingsPause.type='button';settingsPause.className='battle-options-pause';settingsPause.textContent='Pause game';settingsPause.onclick=()=>{settings.open=false;document.querySelector('#menu-button')?.click();};settingsActions.append(settingsClose,settingsPause);settings.append(settingsActions);flow.append(settings);
 const targetList=flow.querySelector('.enemy-list'),targetRail=document.createElement('div'),targetPrevious=document.createElement('button'),targetNext=document.createElement('button');targetRail.className='battle-target-rail';targetPrevious.type=targetNext.type='button';targetPrevious.textContent='‹';targetNext.textContent='›';targetPrevious.setAttribute('aria-label','Previous enemy target');targetNext.setAttribute('aria-label','Next enemy target');if(targetList){flow.insertBefore(targetRail,targetList);targetRail.append(targetPrevious,targetList,targetNext);}
 const targets=()=>[...(targetList?.querySelectorAll('button')||[])];function selectAdjacentTarget(delta){const rows=targets();if(rows.length<2)return;const current=Math.max(0,rows.findIndex(n=>n.getAttribute?.('aria-pressed')==='true'||n.classList.contains('selected')));rows[(current+delta+rows.length)%rows.length].click();}targetPrevious.onclick=()=>selectAdjacentTarget(-1);targetNext.onclick=()=>selectAdjacentTarget(1);
 function paintTargets(){const rows=targets(),chosen=Math.max(0,rows.findIndex(n=>n.getAttribute?.('aria-pressed')==='true'||n.classList.contains('selected')));rows.forEach((row,i)=>row.classList.toggle('battle-target-hidden',i!==chosen));targetPrevious.disabled=targetNext.disabled=rows.length<2;if(targetRail.dataset.single!==String(rows.length<2))targetRail.dataset.single=String(rows.length<2);}
 // Tactical prose is always available, while the target's move and countdown stay visible.
 const advice=flow.querySelector('.combat-advice'),readout=document.createElement('details'),readoutTitle=document.createElement('summary');
 readout.className='battle-tactical-readout';readoutTitle.textContent='Tactical advice';readout.append(readoutTitle);if(advice)readout.append(advice);let guardianCue=null;const adviceClose=document.createElement('button');adviceClose.type='button';adviceClose.className='battle-detail-close';adviceClose.textContent='Back to battle';adviceClose.setAttribute('aria-label','Close tactical advice');adviceClose.onclick=()=>{readout.open=false;measure();};readout.append(adviceClose);flow.append(readout);
 let dockHeight=0,dockWidth=0,page=0,lastSignature='',queued=false,painting=false;
 function commandKind(){return spells.dataset.picker==='field'?'field':spells.dataset.picker==='objective'?'objective':spells.dataset.command||'mako';}
 function pickerCapacity(){if(root.classList.contains('touch-on')&&Number(commands.dataset.actionWidth)>0&&Number(commands.dataset.actionWidth)<210)return 1;return battlePickerCapacity(root.clientWidth,root.clientHeight,{touch:root.classList.contains('touch-on'),hasInstruments:!!spells.querySelector('[data-action-for]')});}
 function actionRows(){return [...spells.children].filter(n=>n.tagName==='BUTTON'&&n.textContent.trim()!=='Cancel');}
 function decorateCommands(){for(const b of grid?.querySelectorAll('button')||[]){const icon=battleCommandIcon(b.id);if(!icon)continue;const value='url("'+icon+'")';if(b.style.getPropertyValue('--command-icon')!==value)b.style.setProperty('--command-icon',value);b.classList.add('battle-command-icon');if(!b.title)b.title=LABELS[b.id];}}
 function foldContext(){
  // Keep authored nodes inside the menu: field/objective ownership markers and callbacks remain valid.
  const prose=[...spells.children].filter(n=>['P','DETAILS'].includes(n.tagName)&&!n.classList.contains('battle-picker-context')&&!n.classList.contains('battle-picker-warning'));
  let context=spells.querySelector('.battle-picker-context');if(!context&&!prose.length)return;if(!context){context=document.createElement('details');context.className='battle-picker-context';const title=document.createElement('summary');title.textContent='Situation & action details';context.append(title);spells.append(context);}
  for(const n of prose)context.append(n);
  if(!context.querySelector('.battle-context-close')){const close=document.createElement('button');close.type='button';close.className='battle-context-close';close.textContent='Back to actions';close.setAttribute('aria-label','Close action details');close.onclick=()=>{context.open=false;measure();};context.append(close);}
 }
 function paint(){
  if(painting)return;painting=true;
  decorateCommands();paintTargets();const cue=commands.querySelector('#guardian-rule-cue');if(cue){guardianCue=cue;if(cue.parentElement!==readout)readout.insertBefore(cue,adviceClose);}
  const open=!commands.hidden&&!spells.hidden&&spells.parentElement===commands,kind=commandKind();
  commands.classList.toggle('battle-picker-open',open);if(commands.dataset.picker!==kind)commands.dataset.picker=kind;
  if(pickerBar.hidden===open)pickerBar.hidden=!open;if(pager.hidden===open)pager.hidden=!open;
  for(const b of grid?.querySelectorAll('button')||[]){const active=open&&PICKER_COMMANDS[kind]===b.id;b.dataset.pickerActive=String(active);if(['cmd-mako','cmd-personal','cmd-item'].includes(b.id)){b.setAttribute('aria-controls','spell-menu');b.setAttribute('aria-expanded',String(active));}}
  const currentTitle=TITLES[kind]||'Choose an action';if(pickerTitle.textContent!==currentTitle)pickerTitle.textContent=currentTitle;
  if(open){
   foldContext();const rows=actionRows(),signature=kind+'|'+rows.map(n=>n.dataset.pageKey||n.dataset.fieldKey||n.dataset.objectiveKey||n.querySelector('strong')?.textContent||n.textContent).join('|');
   if(signature!==lastSignature){page=0;lastSignature=signature;spells.scrollTop=0;}
   const size=pickerCapacity(),range=battlePickerPage(rows.length,page,size);page=range.page;
   rows.forEach((row,i)=>{row.classList.add('battle-picker-option');row.classList.toggle('battle-page-hidden',i<range.start||i>=range.end);});for(const group of spells.querySelectorAll('[data-action-for]')){const row=rows.find(n=>n.dataset.objectiveKey===group.dataset.actionFor);group.classList.toggle('battle-page-hidden',!row||row.classList.contains('battle-page-hidden'));}
   for(const b of spells.querySelectorAll('button'))if(b.textContent.trim()==='Cancel')b.classList.add('battle-picker-dismiss');
   previous.disabled=page===0;next.disabled=page>=range.pages-1;const status=currentTitle+' · '+(rows.length?(range.start+1)+'–'+range.end+' of '+rows.length:'No actions');if(pageLabel.textContent!==status)pageLabel.textContent=status;
   pager.dataset.single=String(range.pages===1);spells.dataset.battlePage=String(page);
  }else{lastSignature='';page=0;}
  const noAdvice=(!advice||advice.hidden)&&(!guardianCue||guardianCue.hidden);if(readout.hidden!==noAdvice)readout.hidden=noAdvice;readoutTitle.classList.toggle('urgent',!!advice?.classList.contains('urgent'));
  painting=false;measure();
 }
 function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;paint();});}
 function measure(){if(party&&partyHome){if(!commands.hidden&&party.parentElement!==commands)commands.prepend(party);else if(commands.hidden&&party.parentElement!==partyHome){if(partyAfter?.parentElement===partyHome)partyHome.insertBefore(party,partyAfter);else partyHome.append(party);}}const conditions=commands.querySelector('#battle-conditions');if(conditions&&conditions.parentElement!==settings)settings.append(conditions);const side=!commands.hidden&&battleConsoleSide(root.clientWidth,root.clientHeight);root.classList.toggle('battle-console-side',side);if(commands.dataset.layout!==(side?'side':'bottom'))commands.dataset.layout=side?'side':'bottom';const bounds=commands.getBoundingClientRect(),padding=Number.parseFloat(globalThis.getComputedStyle?.(commands)?.paddingLeft)||6,reserve=battleThumbGutter({dockLeft:bounds.left||0,paddingLeft:padding,stick:document.querySelector('#joystick')?.getBoundingClientRect(),reset:document.querySelector('.touch-view-reset')?.getBoundingClientRect()}),gutter=reserve+'px',available=Math.max(0,(bounds.width||root.clientWidth)-padding*2-reserve);if(root.style.getPropertyValue('--battle-thumb-reserve')!==gutter)root.style.setProperty('--battle-thumb-reserve',gutter);if(commands.dataset.actionWidth!==String(available))commands.dataset.actionWidth=String(available);if(commands.dataset.thumbNarrow!==String(available<188))commands.dataset.thumbNarrow=String(available<188);dockHeight=commands.hidden||side?0:bounds.height;dockWidth=side?(bounds.width||0)+24:0;root.style.setProperty('--battle-dock-height',dockHeight+'px');root.style.setProperty('--battle-dock-width',dockWidth+'px');root.style.setProperty('--battle-hud-height',hud.getBoundingClientRect().height+'px');}
 function turnPage(delta){if(spells.hidden)return false;const range=battlePickerPage(actionRows().length,page+delta,pickerCapacity());if(range.page===page)return false;page=range.page;paint();spells.scrollTop=0;onPageChange();actionRows().find(n=>!n.classList.contains('battle-page-hidden')&&!n.disabled)?.focus({preventScroll:true});return true;}
 previous.onclick=()=>turnPage(-1);next.onclick=()=>turnPage(1);
 const resize=new ResizeObserver(()=>{schedule();measure();});resize.observe(commands);resize.observe(hud);resize.observe(root);
 const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='childList'||r.attributeName==='hidden'||r.attributeName==='data-picker'||r.attributeName==='data-command'||r.attributeName==='aria-pressed'))schedule();});
 observer.observe(commands,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','data-picker','data-command','aria-pressed']});
 settings.addEventListener('toggle',measure);readout.addEventListener('toggle',measure);paint();
 return {measure,turnPage,reveal(button){const rows=actionRows(),index=rows.indexOf(button);if(index<0)return false;page=Math.floor(index/pickerCapacity());paint();button.focus?.({preventScroll:true});return true;},get dockHeight(){return dockHeight;},get dockWidth(){return dockWidth;},destroy(){resize.disconnect();observer.disconnect();if(party&&partyHome&&party.parentElement!==partyHome){if(partyAfter?.parentElement===partyHome)partyHome.insertBefore(party,partyAfter);else partyHome.append(party);}}};
}
