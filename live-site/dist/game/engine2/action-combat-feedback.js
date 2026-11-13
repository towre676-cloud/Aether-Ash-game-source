/** Lightweight combat feedback driven by canonical battle events.
 * Visual-only: never changes HP, loot, saves or battle simulation. */
export function createActionCombatFeedback({root=document}={}){
 const layer=root.createElement('div');
 layer.id='action-combat-feedback';
 layer.setAttribute('aria-hidden','true');
 const css=root.createElement('style');
 css.textContent=`
#action-combat-feedback{position:fixed;inset:0;z-index:100;pointer-events:none;overflow:hidden}
.action-combat-float{position:absolute;left:50%;top:32%;font:bold clamp(18px,3vw,32px) system-ui;color:#ffe5a6;text-shadow:0 2px 5px #000,0 0 10px #5c220b;animation:action-float .75s ease-out forwards;white-space:nowrap}
.action-combat-float.heal{color:#a8f4b0}
.action-combat-float.loot{color:#eec77d;top:42%}
.action-combat-float.warning{color:#ff9d8b;top:24%}
@keyframes action-float{from{opacity:0;transform:translate(-50%,12px) scale(.85)}15%{opacity:1}to{opacity:0;transform:translate(-50%,-55px) scale(1.08)}}
@media(prefers-reduced-motion:reduce){.action-combat-float{animation:none;opacity:.9}}
`;
 root.head.append(css);root.body.append(layer);
 let count=0;
 function emit(event){
   if (!event || root.hidden) return;
   const type=event.type;
   let label='',kind='';
   // Renderer.event already paints world-space damage/healing numbers.
   // Only display exceptional announcements here to avoid duplicate overlays.
   if(type==='interrupt'){
     label='INTERRUPT';kind='warning';
   } else if(type==='guardian-reward' && event.label){
     label=String(event.label).slice(0,72);kind='loot';
   } else return;
   if(layer.childElementCount>=8)layer.firstElementChild?.remove();
   const el=root.createElement('span');
   el.className='action-combat-float '+kind;
   el.textContent=label;
   const offset=((count++%5)-2)*11;
   el.style.left=(50+offset)+'%';
   layer.append(el);
   const cleanup=()=>el.remove();
   el.addEventListener('animationend',cleanup,{once:true});
   // Fallback for reduced motion and suspended animations.
   setTimeout(cleanup,1000);
 }
 return {emit,dispose(){layer.remove();css.remove();}};
}
