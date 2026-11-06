import {RARITY_COLORS,RARITY_LABELS,STAT_LABELS,RUNES} from './catalog.mjs?v=5.33.0';
import {weaponIllustration} from './art.mjs?v=5.35.0';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const elements={ember:'#efaa77',tide:'#91d1de',verdant:'#adc890',aether:'#b9a8ed',echo:'#e6c78c',stone:'#d4be91'};
const resourceNames={coins:'credits',scrap:'scrap',essence:'essence',starshard:'starshards'};
const actionNames={equip:'Take in hand',temper:'Temper',attune:'Attune',socket:'Bind rune',extract:'Extract'};
// Small engraved tool silhouettes belong to the interface, not to the item ledger.
const toolPaths={equip:'M8 3 12 7 10 16 6 16 4 7Z M3 16H13M8 16V22',temper:'M3 5 8 2 15 9 10 14Z M11 12 21 22 M2 22H12',attune:'M4 21 18 3 22 7 8 23Z M14 7 19 12M3 12V5H10',socket:'M12 2 22 8 20 19 12 24 4 19 2 8Z M12 7 17 12 12 19 7 12Z',extract:'M3 4 8 9 5 14M21 4 16 9 19 14M5 14 12 23 19 14M8 9H16'};
const toolIcon=action=>`<svg class="weapon-tool-icon" viewBox="0 0 26 26" aria-hidden="true" focusable="false"><path d="${toolPaths[action]||toolPaths.temper}"/></svg>`;
const armorySeal=`<svg class="armory-seal" viewBox="0 0 160 160" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor"><path d="M80 8 142 44V116L80 152 18 116V44Z M80 18 132 49V111L80 142 28 111V49Z"/><path d="M80 27V133M34 53 126 107M34 107 126 53" opacity=".35"/><path d="M80 35C51 70 46 90 80 124 114 90 109 70 80 35Z" stroke-width="2"/><path d="M80 60C64 80 65 91 80 106 95 91 96 80 80 60Z"/><path d="M18 44 9 39M142 44 151 39M18 116 9 121M142 116 151 121M80 8V0M80 152V160"/><path d="M40 38 45 47 38 49M120 38 115 47 122 49M40 122 45 113 38 111M120 122 115 113 122 111"/></g></svg>`;
const number=value=>Number(value||0).toLocaleString(undefined,{maximumFractionDigits:1});
const label=stat=>STAT_LABELS[stat]||stat;

export function clampWeaponView({yaw=0,pitch=0,zoom=1}={}){
 const bounded=(value,min,max,fallback)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
 return {yaw:bounded(yaw,-24,24,0),pitch:bounded(pitch,-11,11,0),zoom:bounded(zoom,1,1.2,1)};
}

export function ownedWeapons(state={}){
 const seen=new Set();return [...Object.values(state.gear||{}),...(state.placements||[]).map(p=>p.item),...(state.overflow||[])].filter(item=>{
  if(!item?.id||item.slot!=='mainhand'||seen.has(item.id))return false;seen.add(item.id);return true;
 }).sort((a,b)=>(b.id===state.gear?.mainhand?.id)-(a.id===state.gear?.mainhand?.id)||(b.itemPower||0)-(a.itemPower||0));
}

export function growthDeltas(view,action){
 return Object.entries(action?.changes||{}).filter(([,delta])=>Number.isFinite(delta)&&delta!==0).map(([stat,delta])=>({stat,label:label(stat),before:view.stats?.[stat]||0,after:action.after?.stats?.[stat]??(view.stats?.[stat]||0)+delta,delta}));
}

function costsHTML(view,action){
 const costs=Object.entries(action?.cost||{}).filter(([,value])=>value>0);
 return costs.length?costs.map(([resource,amount])=>`<span class="weapon-cost ${(view.resources?.[resource]||0)<amount?'is-short':''}"><b>${number(amount)} ${esc(resourceNames[resource]||resource)}</b><small>${number(view.resources?.[resource])} available</small></span>`).join(''):'<span class="weapon-cost"><b>No materials required</b></span>';
}

function growthHTML(view,action){
 if(!action)return '<p class="weapon-muted">Recover a weapon to begin its growth.</p>';
 const deltas=growthDeltas(view,action),powerChange=(action.after?.itemPower??view.itemPower)-view.itemPower;
 return `<div class="weapon-offer-head"><div><span class="weapon-section-label">AT THE FORGE</span><h3>${esc(action.label)}</h3></div>${powerChange?`<div class="weapon-power-delta"><span>POWER</span><b>${number(view.itemPower)} <i>→</i> ${number(action.after.itemPower)}</b></div>`:''}</div><p class="weapon-offer-detail">${esc(action.detail)}</p>${deltas.length?`<div class="weapon-deltas" aria-label="Exact stat changes">${deltas.map(d=>`<div class="${d.delta<0?'is-loss':'is-gain'}"><span>${esc(d.label)}</span><b>${number(d.before)} <i>→</i> ${number(d.after)}</b><em>${d.delta>0?'+':''}${number(d.delta)}</em></div>`).join('')}</div>`:''}<div class="weapon-costs" aria-label="Material cost">${costsHTML(view,action)}</div><button class="weapon-grow-button" data-weapon-grow ${action.enabled?'':'disabled'}><span>${esc(action.label)}</span><b aria-hidden="true">${action.id==='equip'?'↗':'✦'}</b></button><p class="weapon-growth-note ${action.enabled?'':'is-blocked'}">${esc(action.reasonText||(!action.enabled?action.reason:'')||(action.id==='equip'?'Uses this bearer’s main hand.':action.id==='temper'?'Permanent growth · every base stat increases.':'The exact changes above apply to this weapon.'))}</p>`;
}

/** Mounts inside the real campaign iframe. Only quoted controller actions may
 * change equipment; view angles and selected tabs are local presentation state. */
export function mountWeaponShowcase({game,onSelect=()=>{},onNavigate=()=>{},onToast=()=>{},onCycleHero=()=>{}}){
 const container=document.querySelector?.('.three-panels'),navigation=document.querySelector?.('.mobile-nav');
 if(!container)return null;
 const panel=document.createElement('section');panel.className='panel weapon-feature active';panel.dataset.panel='weapon';panel.setAttribute('aria-label','Weapon and growth');container.prepend(panel);
 if(navigation){const tab=document.createElement('button');tab.dataset.mobile='weapon';tab.textContent='Weapon';navigation.prepend(tab);}
 let focusId=null,lastHero=game.selectedHero,lastSelected=null,view=null,activeAction='temper',choices={},angle=clampWeaponView(),drag=null,flashTimer=null;

 function applyAngle(){const art=panel.querySelector('.weapon-display-art');if(art){art.style.setProperty('--weapon-yaw',`${angle.yaw}deg`);art.style.setProperty('--weapon-pitch',`${angle.pitch}deg`);art.style.setProperty('--weapon-zoom',angle.zoom);}}
 function setAngle(next){angle=clampWeaponView({...angle,...next});applyAngle();const zoomButton=panel.querySelector('[data-weapon-view="zoom"]');if(zoomButton)zoomButton.setAttribute('aria-pressed',String(angle.zoom>1));}
 function focusWeapon(id){if(!ownedWeapons(game.state).some(item=>item.id===id))return;focusId=id;choices={};angle=clampWeaponView();activeAction=game.state.gear.mainhand?.id===id?'temper':'equip';onSelect(id);render();}
 function render(){
  const weapons=ownedWeapons(game.state);
  if(!weapons.some(item=>item.id===focusId))focusId=null;
  view=game.weaponGrowthView?.(focusId,choices)||{ready:false,actions:[]};
  if(view.ready&&focusId!==view.itemId){focusId=view.itemId;angle=clampWeaponView();activeAction=view.where==='mainhand'?'temper':'equip';}
  const item=view.item||weapons.find(i=>i.id===view.itemId);
  if(!view.ready||!item){
   panel.innerHTML=`<div class="weapon-empty"><div class="weapon-empty-mark" aria-hidden="true">${armorySeal}</div><div><span class="weapon-section-label">YOUR ARMAMENT</span><h1>No recovered weapon yet</h1><p>Win an encounter or open a field cache. Your recovered weapon will appear here, ready to equip and strengthen.</p><button class="weapon-utility" data-weapon-nav="bag">Open inventory <span aria-hidden="true">↗</span></button></div></div>`;return;
  }
  if(!view.actions.some(a=>a.id===activeAction))activeAction=view.primaryAction?.id||view.actions[0]?.id;
  const action=view.actions.find(a=>a.id===activeAction),equipped=view.where==='mainhand',rarity=RARITY_COLORS[item.rarity]||'#bdc5c8',element=elements[item.element]||'#d4be91';
  const stats=Object.entries(view.stats||{}).filter(([,value])=>value).sort((a,b)=>(b[0]===view.primaryStat)-(a[0]===view.primaryStat)||b[1]-a[1]);
  const sockets=Array.from({length:item.sockets||0},(_,index)=>({index,rune:(view.runeChoices||RUNES).find(r=>r.id===item.runes?.[index]?.id)}));
  const bearer=view.bearer?.name||game.state.character;
  panel.style.setProperty('--weapon-rarity',rarity);panel.style.setProperty('--weapon-element',element);
  panel.innerHTML=`<header class="weapon-topline"><div><span class="weapon-section-label">${esc(bearer)}’S ARMAMENT</span><div class="weapon-title-row"><h1>${esc(item.name)}</h1><span class="weapon-rank">+${view.upgrade}</span></div><p><span class="weapon-rarity">${esc(RARITY_LABELS[item.rarity]||item.rarity)}</span><i>·</i>${esc(item.material||item.element)}<i>·</i><span class="weapon-equipped ${equipped?'is-equipped':''}">${equipped?'In hand':view.where==='stash'?'In vault':view.where==='overflow'?'In recovery':'In satchel'}</span></p></div><button data-weapon-cycle class="weapon-utility weapon-bearer-switch" title="Show next bearer" aria-label="Show next bearer" ${game.heroes?.length>1?'':'disabled'}>↻</button></header>
  <div class="weapon-feature-body"><div class="weapon-gallery"><div class="weapon-stage" tabindex="0" role="group" aria-label="Weapon illustration. Drag sideways or use arrow keys to tilt. Home resets the view."><div class="weapon-display-art">${weaponIllustration(item)}</div><div class="weapon-art-caption"><span>${esc(String(item.element||'').toUpperCase())} <i>·</i> ${esc(String(item.icon||'weapon').toUpperCase())}</span><span><b>${number(view.itemPower)}</b> power <i>·</i> level ${number(view.level)}</span></div></div><div class="weapon-view-controls"><span>Drag to examine</span><div><button data-weapon-view="left" aria-label="Tilt left">↶</button><button data-weapon-view="reset" aria-label="Reset weapon view">Reset</button><button data-weapon-view="right" aria-label="Tilt right">↷</button><button data-weapon-view="zoom" aria-label="Magnify weapon" aria-pressed="${angle.zoom>1}">⌕</button></div></div></div>
  <section class="weapon-growth" aria-label="Forge this weapon"><div class="weapon-action-tabs" aria-label="Weapon growth options">${view.actions.map(a=>`<button data-weapon-action="${esc(a.id)}" class="${a.id===activeAction?'is-active':''}" aria-pressed="${a.id===activeAction}">${toolIcon(a.id)}<span>${esc(actionNames[a.id]||a.id)}</span></button>`).join('')}</div>${activeAction==='attune'?`<label class="weapon-choice">Focused stat<select data-weapon-choice="stat">${(view.attunementChoices||[]).map(option=>`<option value="${esc(option.id)}" ${option.id===view.selectedStat?'selected':''}>${esc(option.label)}</option>`).join('')}</select></label>`:''}${activeAction==='socket'?`<label class="weapon-choice">Rune voice<select data-weapon-choice="runeId">${(view.runeChoices||[]).map(rune=>`<option value="${esc(rune.id)}" ${rune.id===view.selectedRune?'selected':''}>${esc(rune.symbol)} ${esc(rune.name)} · ${esc(label(rune.stat))}</option>`).join('')}</select></label>`:''}<div class="weapon-offer" aria-live="polite">${growthHTML(view,action)}</div>
  <details class="weapon-specification"><summary>Weapon properties <span>+${view.upgrade} / +${view.maxUpgrade}</span></summary><div class="weapon-stats" aria-label="Effective weapon stats">${stats.map(([stat,value])=>`<div ${stat===view.primaryStat?'class="is-primary"':''}><span>${esc(label(stat))}</span><b>+${number(value)}</b></div>`).join('')}</div>${item.effectText?`<p class="weapon-signature">${esc(item.effectText)}</p>`:''}<div class="weapon-socket-row"><div><span class="weapon-section-label">RUNES</span><small>${item.runes?.length||0} / ${item.sockets||0} bound</small></div><div class="weapon-sockets">${sockets.map(({index,rune})=>`<button class="weapon-socket ${rune?'is-bound':''} ${rune&&activeAction==='extract'&&(choices.runeIndex||0)===index?'is-selected':''}" data-weapon-socket="${index}" style="--socket-color:${elements[rune?.element]||'#9a927e'}" title="${esc(rune?`${rune.name} · select to extract`:'Empty socket · select to bind a rune')}" aria-label="${esc(rune?`${rune.name}, socket ${index+1}, select to extract`:`Empty socket ${index+1}, select to bind a rune`)}">${esc(rune?.symbol||'◇')}</button>`).join('')||'<span class="weapon-muted">No sockets</span>'}</div></div><button class="weapon-text-button" data-weapon-details>Inspect all details ↗</button></details></section></div>
  <details class="weapon-rack-drawer"><summary>Choose another weapon <span>${weapons.length} owned</span></summary><div class="weapon-rack" aria-label="Owned weapons">${weapons.map(w=>`<button class="weapon-rack-item ${w.id===item.id?'is-selected':''}" data-weapon-id="${esc(w.id)}" aria-pressed="${w.id===item.id}" style="--rack-rarity:${RARITY_COLORS[w.rarity]||'#bdc5c8'}" title="${esc(w.name)}"><span class="weapon-rack-art">${weaponIllustration(w)}</span><span><b>${esc(w.name)}</b><small>${w.id===game.state.gear.mainhand?.id?'IN HAND':'POWER '+number(w.itemPower)} <i>·</i> +${w.upgrade||0}</small></span></button>`).join('')}</div></details>`;
  applyAngle();
 }

 panel.addEventListener('click',event=>{
  const target=event.target.closest('button');if(!target||target.disabled)return;
  if(target.dataset.weaponId){focusWeapon(target.dataset.weaponId);return;}
  if(target.hasAttribute('data-weapon-grow')){
   const action=view?.actions.find(a=>a.id===activeAction);if(!view?.ready||!action?.enabled||!action.quote)return;
   const result=game.growWeapon(view.itemId,action.id,action.quote);
   const message=result.ok?(action.id==='equip'?'Weapon taken in hand.':action.id==='temper'?`Weapon tempered to +${action.after.upgrade}.`:action.id==='socket'?'Rune bound to this weapon.':action.id==='extract'?'Rune extracted.':`Weapon attuned to ${label(choices.stat||view.selectedStat)}.`):(result.reason==='stale-quote'?'Your equipment changed. Review the refreshed cost and try again.':result.reason==='resources'?'More materials are needed.':`Unable to grow weapon: ${result.reason||'offer changed'}.`);
   render();onToast(message);if(result.ok){panel.classList.remove('weapon-just-grown');void panel.offsetWidth;panel.classList.add('weapon-just-grown');clearTimeout(flashTimer);flashTimer=setTimeout(()=>panel.classList.remove('weapon-just-grown'),900);}panel.querySelector('[data-weapon-grow]')?.focus({preventScroll:true});return;
  }
  if(target.dataset.weaponAction){activeAction=target.dataset.weaponAction;render();panel.querySelector(`[data-weapon-action="${activeAction}"]`)?.focus({preventScroll:true});return;}
  if(target.dataset.weaponView){const mode=target.dataset.weaponView;setAngle(mode==='reset'?{yaw:0,pitch:0,zoom:1}:mode==='zoom'?{zoom:angle.zoom>1?1:1.2}:{yaw:angle.yaw+(mode==='left'?-8:8)});return;}
  if(target.hasAttribute('data-weapon-socket')){choices.runeIndex=Number(target.dataset.weaponSocket);activeAction=view.item.runes?.[choices.runeIndex]?'extract':'socket';render();return;}
  if(target.hasAttribute('data-weapon-equipped')){focusWeapon(game.state.gear.mainhand?.id);return;}
  if(target.hasAttribute('data-weapon-cycle')){onCycleHero();return;}
  if(target.hasAttribute('data-weapon-details')){onSelect(focusId);onNavigate('inspect');return;}
  if(target.dataset.weaponNav){onNavigate(target.dataset.weaponNav);return;}
 });
 panel.addEventListener('change',event=>{const key=event.target.dataset.weaponChoice;if(!key)return;choices[key]=event.target.value;render();panel.querySelector(`[data-weapon-choice="${key}"]`)?.focus({preventScroll:true});});
 panel.addEventListener('keydown',event=>{
  if(!event.target.classList.contains('weapon-stage'))return;
  const movement={ArrowLeft:{yaw:angle.yaw-4},ArrowRight:{yaw:angle.yaw+4},ArrowUp:{pitch:angle.pitch-3},ArrowDown:{pitch:angle.pitch+3},Home:{yaw:0,pitch:0,zoom:1}}[event.key];if(!movement)return;event.preventDefault();setAngle(movement);
 });
 panel.addEventListener('pointerdown',event=>{const stage=event.target.closest('.weapon-stage');if(!stage||event.button!==0)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw:angle.yaw,pitch:angle.pitch};stage.setPointerCapture(event.pointerId);stage.classList.add('is-dragging');});
 panel.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;setAngle({yaw:drag.yaw+(event.clientX-drag.x)*.15,pitch:drag.pitch-(event.clientY-drag.y)*.06});});
 const stopDrag=()=>{drag=null;panel.querySelector('.weapon-stage')?.classList.remove('is-dragging');};panel.addEventListener('pointerup',stopDrag);panel.addEventListener('pointercancel',stopDrag);panel.addEventListener('lostpointercapture',stopDrag);
 return {update(selectedId){
  if(lastHero!==game.selectedHero){lastHero=game.selectedHero;lastSelected=null;focusId=null;choices={};angle=clampWeaponView();}
  if(selectedId!==lastSelected){lastSelected=selectedId;const selected=ownedWeapons(game.state).find(item=>item.id===selectedId);if(selected&&focusId!==selected.id){focusId=selected.id;choices={};angle=clampWeaponView();activeAction=selected.id===game.state.gear.mainhand?.id?'temper':'equip';}}
  render();
 },get focusedId(){return focusId;},get viewAngle(){return {...angle};}};
}
