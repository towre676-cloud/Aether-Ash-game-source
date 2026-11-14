/** A field-side receipt and invitation. The world keeps running and focus stays
 * with the player; only Continue route asks the selected guide to move again. */
import {itemArt} from './living-armory/src/art.mjs?v=5.33.0';
const text=(value,limit=360)=>typeof value==='string'?value.trim().slice(0,limit):'';
const lines=value=>Array.isArray(value)?value.filter(v=>typeof v==='string'&&v.trim()).slice(0,32).map(v=>text(v,200)):[];
const itemKey=item=>item.kind+':'+item.itemId;
const statNumber=value=>Number(Number(value).toFixed(4));
let mounts=0;
export function mountFieldJourneyUI({onContinue=()=>{},onExplore=()=>{},onSetup=()=>{},onEngage=()=>{},onEquip=()=>{},onArmory=()=>{}}={}){
 const game=document.querySelector('#game');if(!game)throw Error('The field journey card needs the game surface.');
 if(!document.querySelector('link[data-field-journey-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./field-journey.css?v=5.26.0',import.meta.url).href;link.dataset.fieldJourneyStyle='';document.head.append(link);}
 const make=(tag,cls,value)=>{const node=document.createElement(tag);node.className=cls;if(value)node.textContent=value;return node;};
 const card=make('aside','field-journey');card.hidden=true;card.dataset.fieldJourney='';card.setAttribute('role','region');
 const id='field-journey-title-'+(++mounts),eyebrow=make('small','field-journey-eyebrow'),title=make('h2','field-journey-title');title.id=id;card.setAttribute('aria-labelledby',id);
 const copy=make('div','field-journey-copy');copy.setAttribute('role','status');copy.setAttribute('aria-live','polite');copy.setAttribute('aria-atomic','true');
 const summary=make('p','field-journey-summary'),rewardList=make('ul','field-journey-rewards'),progressList=make('ul','field-journey-progress'),change=make('p','field-journey-world');
 rewardList.setAttribute('aria-label','Earned rewards');progressList.setAttribute('aria-label','Progress toward your next choices');copy.append(summary,rewardList);
 const gearPanel=make('section','field-journey-gear');gearPanel.hidden=true;gearPanel.setAttribute('aria-label','Compare recovered equipment');
 const hint=make('p','field-journey-hint'),actions=make('div','field-journey-actions');actions.setAttribute('role','group');actions.setAttribute('aria-label','Choose your pace');
 const handoffDetails=make('details','field-journey-details'),detailTitle=make('summary','','Threat, rewards & preparation'),fullSummary=make('p','field-journey-full-summary'),detailProgress=make('ul','field-journey-progress'),detailHint=make('p','field-journey-hint'),detailActions=make('div','field-journey-actions');
 for(const event of ['keydown','keyup'])detailTitle.addEventListener(event,e=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation();});
 detailProgress.setAttribute('aria-label','Encounter details');handoffDetails.append(detailTitle,fullSummary,detailProgress,detailHint,detailActions);handoffDetails.hidden=true;
 // The route controls stay outside the receipt's scrollport. A long equipment
 // comparison must not send Explore or Continue below the player's thumb.
 const body=make('div','field-journey-body');
 body.append(eyebrow,title,copy,gearPanel,progressList,change,hint,handoffDetails);
 card.append(body,actions);game.append(card);
 let current=null,blocked=false,lastMeasure=-Infinity,selectedItem=null,selectedChoice=null,occupied=null;
 function measure(){
  if(card.hidden)return;const surface=game.getBoundingClientRect(),hud=document.querySelector('#hud'),head=hud?.getBoundingClientRect();
  const top=Math.max(10,head&&head.height?head.bottom-surface.top+10:12),touch=game.classList.contains('touch-on')?parseFloat(getComputedStyle(game).getPropertyValue('--touch-reserve'))||0:0;
  card.style.setProperty('--field-journey-top',top+'px');card.style.setProperty('--field-journey-height',Math.max(82,surface.height-top-touch-14)+'px');lastMeasure=performance.now();
  const box=card.getBoundingClientRect();occupied={x:(box.left||0)-(surface.left||0),y:box.top-surface.top,w:box.width,h:box.height};
 }
 handoffDetails.addEventListener('toggle',()=>{lastMeasure=-Infinity;measure();});
 function hide(){current=null;card.hidden=true;card.dataset.active='false';occupied=null;}
 function button(label,action,callback,{close=true,primary=false,container=actions}={}){
  const b=make('button','field-journey-action'+(primary?' field-journey-primary':''),label);b.type='button';b.dataset.action=action;
  b.addEventListener('click',e=>{e.stopPropagation();const value=current;if(close)hide();callback(value?.pack);});
  // Space/Enter activate this button without also confirming a world object.
  // Arrow keys continue reaching the game's movement listener.
  b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation();});
  b.addEventListener('keyup',e=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation();});container.append(b);
 }
 function list(node,entries){node.replaceChildren(...entries.map(value=>make('li','',value)));node.hidden=!entries.length;}
 function selector(label,entries,selected,onChange){
  const wrap=make('label','field-journey-select-label'),caption=make('span','',label),select=make('select','field-journey-select');
  for(const entry of entries){const option=make('option','',entry.label);option.value=entry.value;select.append(option);}
  select.value=selected;select.setAttribute('aria-label',label);select.addEventListener('change',()=>onChange(select.value));
  // A listbox uses arrows and letter keys itself. Those keys must not move the
  // crew, dismiss the receipt, or confirm a world interaction underneath it.
  for(const event of ['keydown','keyup','click'])select.addEventListener(event,e=>e.stopPropagation());
  wrap.append(caption,select);return wrap;
 }
 function gearButton(label,action,callback){
  const b=make('button','field-journey-action',label);b.type='button';b.dataset.action=action;
  for(const event of ['keydown','keyup'])b.addEventListener(event,e=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation();});
  b.addEventListener('click',e=>{e.stopPropagation();callback(b);});return b;
 }
 function renderGear(){
  gearPanel.replaceChildren();const gear=current?.gear,items=gear?.items||[];gearPanel.hidden=!items.length;if(!items.length)return;
  const recommended=(gear.choices||[]).find(choice=>choice.id===gear.recommendedId);
  let item=items.find(value=>itemKey(value)===selectedItem)||items.find(value=>value.itemId===recommended?.itemId&&value.kind===recommended?.kind)||items[0];
  selectedItem=itemKey(item);
  const heading=make('h3','field-journey-gear-heading',items.length===1?'Recovered equipment':items.length+' pieces of recovered equipment');gearPanel.append(heading);
  if(items.length>1)gearPanel.append(selector('Inspect an item',items.map(value=>({value:itemKey(value),label:value.name})),selectedItem,value=>{selectedItem=value;selectedChoice=null;renderGear();measure();}));
  const head=make('div','field-journey-item-heading'),art=itemArt(item.icon),name=make('div','field-journey-item-name');
  if(art){const image=make('img','field-journey-item-art');image.src=new URL('./living-armory/'+art,import.meta.url).href;image.alt='';image.width=56;image.height=56;head.append(image);}
  name.append(make('strong','',text(item.name,180)),make('small','',text([item.rarityLabel,item.slotLabel].filter(Boolean).join(' · '),120)));head.append(name);gearPanel.append(head);
  if(item.attributes?.length)gearPanel.append(make('p','field-journey-comparison-note',item.attributes.slice(0,3).map(attribute=>attribute.text).join(' · ')));
  gearPanel.append(make('p','field-journey-item-status',text(item.status,160)));
  const candidates=(gear.choices||[]).filter(choice=>choice.kind===item.kind&&choice.itemId===item.itemId);
  let chosen=candidates.find(choice=>choice.id===selectedChoice)||candidates.find(choice=>choice.id===gear.recommendedId)||candidates.find(choice=>choice.ok)||candidates[0];
  selectedChoice=chosen?.id||null;
  if(item.where!=='equipped'&&item.where!=='missing'&&candidates.length){
   gearPanel.append(selector('Compare for',candidates.map(choice=>({value:choice.id,label:choice.heroName+' · '+choice.slotLabel+(choice.ok?'':' · unavailable')})),selectedChoice,value=>{selectedChoice=value;renderGear();measure();}));
  }
  if(chosen&&item.where!=='equipped'&&item.where!=='missing'){
   if(chosen.id===gear.recommendedId)gearPanel.append(make('small','field-journey-recommendation','Suggested for the next encounter'));
   const replacement=chosen.replacesId?'Replaces '+chosen.replacesName:'Fills an empty '+chosen.slotLabel.toLowerCase()+' slot';
   gearPanel.append(make('p','field-journey-comparison-for',text(chosen.heroName+' · '+replacement,220)));
   if(chosen.ok){
    const changes=make('ul','field-journey-stat-changes');changes.setAttribute('aria-label','Actual equipment changes');
    for(const delta of chosen.deltas||[])changes.append(make('li',delta.delta<0?'field-journey-loss':'field-journey-gain',delta.label+' '+statNumber(delta.before)+' → '+statNumber(delta.after)+' ('+(delta.delta>0?'+':'')+statNumber(delta.delta)+')'));
    if(chosen.protectionText)changes.append(make('li',chosen.protectionDelta<0?'field-journey-loss':'field-journey-gain',chosen.protectionText));
    for(const conditional of chosen.conditionalHighlights||[])changes.append(make('li',conditional.delta<0?'field-journey-loss':'field-journey-gain',conditional.text));
    if(changes.children.length)gearPanel.append(changes);
    else gearPanel.append(make('p','field-journey-comparison-note',chosen.effectText?'Its special trait is the change to inspect.':'Its artifact traits are shown above. This comparison has no measured headline-stat or direct-hit change on the current ground.'));
    const traitLosses=(chosen.traitDeltas||[]).filter(trait=>trait.delta<0);if(traitLosses.length)gearPanel.append(make('p','field-journey-loss','Replacement loses: '+traitLosses.map(trait=>trait.text).join(' · ')));
    if(chosen.lostEffect)gearPanel.append(make('p','field-journey-loss','This replaces the worn item’s special trait.'));
    if(chosen.hpLost||chosen.mpLost)gearPanel.append(make('p','field-journey-loss','The lower maximum also removes '+[chosen.hpLost?chosen.hpLost+' current HP':'',chosen.mpLost?chosen.mpLost+' current MP':''].filter(Boolean).join(' and ')+'.'));
   }else gearPanel.append(make('p','field-journey-comparison-note',text(chosen.reason,220)));
  }
  if(item.attributes?.length||item.effectText||chosen?.lostEffectText||chosen?.protectionText||chosen?.conditional?.length){
   const details=make('details','field-journey-traits');details.append(make('summary','','Traits and comparison details'));
   if(item.attributes?.length)details.append(make('p','','Artifact traits: '+item.attributes.map(attribute=>attribute.text).join(' · ')));
   if(item.effectText)details.append(make('p','',text(item.effectText,700)));
   if(chosen?.lostEffect&&chosen.lostEffectText)details.append(make('p','field-journey-loss','Replaced trait: '+text(chosen.lostEffectText,700)));
   if(chosen?.protectionText)details.append(make('p','','Protection compares the Armory’s reduction of a direct Earth hit on the current ground, before other defenses. Terrain and attack type can change it.'));
   for(const conditional of chosen?.conditional||[])details.append(make('p',conditional.delta<0?'field-journey-loss':'',conditional.text+'. '+conditional.detail));
   gearPanel.append(details);
  }
  const gearActions=make('div','field-journey-gear-actions'),feedback=make('p','field-journey-equip-feedback');feedback.setAttribute('role','status');feedback.hidden=true;
  if(chosen?.ok&&item.where!=='equipped'&&item.where!=='missing'){
   const request=chosen,equip=gearButton('Equip on '+chosen.heroName,'equip-reward',async b=>{
    const receipt=current;b.disabled=true;
    try{const result=await onEquip(request);if(current===receipt&&result?.ok===false){feedback.textContent=text(result.message||result.reason,240);feedback.hidden=false;}}
    catch{if(current===receipt){feedback.textContent='The item could not be equipped. Open the Armory to review it.';feedback.hidden=false;}}
    finally{if(current===receipt)b.disabled=false;}
   });equip.classList.add('field-journey-primary');gearActions.append(equip);
  }
  gearActions.append(gearButton('Open Armory','armory',()=>onArmory()));gearPanel.append(gearActions,feedback);
 }
 function show(value){
  const handoff=value.kind==='handoff';current=value;card.dataset.kind=value.kind;card.dataset.pack=String(!!value.pack);card.dataset.active='true';eyebrow.textContent=handoff?'ON THE TRAIL':'WHAT YOUR ENCOUNTER CHANGED';title.textContent=value.title;
  summary.textContent=value.summary;summary.hidden=!value.summary;list(rewardList,value.rewards);list(progressList,value.progress);change.textContent=value.worldChange;change.hidden=!value.worldChange;
  renderGear();
  hint.textContent=game.classList.contains('touch-on')?'Use the stick or tap the ground to explore. Following the story path is optional; Explore keeps movement in your hands.':'Move with the arrows or click the ground to explore. Following the story path is optional; Explore keeps movement in your hands.';
  handoffDetails.hidden=!handoff;handoffDetails.open=false;detailActions.replaceChildren();hint.hidden=handoff;
  if(handoff){
   // The first complete sentence is the invitation; full counterplay and
   // rewards remain one disclosure away, without another modal window.
   const lead=value.summary.match(/^.*?\.(?=\s+[A-Z]|$)/)?.[0]||value.summary;
   summary.textContent=lead;fullSummary.textContent=value.summary;list(detailProgress,value.progress);detailHint.textContent=hint.textContent;progressList.hidden=true;
  }
  actions.replaceChildren();button('Explore here','explore',onExplore,{primary:true});
  if(value.pack)button('Approach pack','engage',onEngage);
  button('Follow story path','continue',onContinue);button('Crew setup','setup',onSetup,{close:false,container:handoff?detailActions:actions});
  if(value.kind==='victory'&&!value.gear?.items?.length)button('Open Armory','armory',onArmory,{close:false});
  card.hidden=blocked;measure();
 }
 const resize=()=>{lastMeasure=-Infinity;measure();};window.addEventListener('resize',resize);
 return {
  showHandoff({title:heading,text:body,pack=null,rewardHint}={}){show({kind:'handoff',title:text(heading,100)||'Take a look around',summary:text(body),pack,rewards:[],progress:lines(rewardHint?[rewardHint]:[]),worldChange:''});},
  showVictory(report={}){show({kind:'victory',title:text(report.title,100)||'Encounter resolved',summary:text(report.summary),pack:null,rewards:lines(report.rewards),progress:lines(report.progress),worldChange:text(report.worldChange),gear:report.gear||null});},
  hide,
  get active(){return current!==null;},
  get bounds(){return current&&!card.hidden?occupied:null;},
  update({blocked:next=false}={}){blocked=!!next;card.hidden=!current||blocked;if(current&&!blocked&&performance.now()-lastMeasure>200)measure();},
  destroy(){hide();window.removeEventListener('resize',resize);card.remove();}
 };
}
