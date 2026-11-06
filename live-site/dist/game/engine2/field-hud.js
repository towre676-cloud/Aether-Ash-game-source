/** Native field controls share one thumb cluster. The original buttons,
 * listeners, inline recovery coordinates and battle layout remain owners. */
const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rect=(e)=>({x:finite(parseFloat(e?.style.left)),y:finite(parseFloat(e?.style.top)),w:finite(parseFloat(e?.style.width)),h:finite(parseFloat(e?.style.height))});

/** Arrange the existing A / B / X controls within the same visible viewport.
 * Y is Characters, a separate native action available through Pause. */
export function fieldControlLayout(viewport,{confirm={},secondary={},joystick={},reset={}}={}){
 const view={x:finite(viewport?.x),y:finite(viewport?.y),width:Math.max(1,finite(viewport?.width,390)),height:Math.max(1,finite(viewport?.height,844))};
 const edge=12,right=Math.min(view.x+view.width-edge,finite(confirm.x)+finite(confirm.w)||view.x+view.width-edge),bottom=Math.min(view.y+view.height-edge,finite(confirm.y)+finite(confirm.h)||view.y+view.height-edge);
 const aSize=clamp(finite(confirm.w,64),44,70),sSize=clamp(finite(secondary.w,52),44,58),gap=8;
 const a={x:right-aSize,y:bottom-aSize,w:aSize,h:aSize};
 const b={x:a.x-gap-sSize,y:bottom-sSize,w:sSize,h:sSize};
 const x={x:a.x+(aSize-sSize)/2,y:a.y-gap-sSize,w:sSize,h:sSize};
 const clear=(p,q)=>!q?.w||!q?.h||Math.hypot(Math.max(0,p.x-q.x-q.w,q.x-p.x-p.w),Math.max(0,p.y-q.y-q.h,q.y-p.y-p.h))>=gap;
 // Browser magnification can leave a very narrow CSS viewport. Put Run in
 // the upper row if its normal low position would cover native Reset.
 if(!clear(b,reset))b.y=Math.min(x.y,reset.y-gap-b.h);
 for(const p of [a,b,x]){p.x=clamp(p.x,view.x,view.x+view.width-p.w);p.y=clamp(p.y,view.y,view.y+view.height-p.h);}
 const top=Math.min(...[a,b,x,joystick,reset].filter(p=>p&&p.w>0&&p.h>0).map(p=>p.y));
 return{buttons:{a,b,x},reserve:Math.ceil(view.y+view.height-top+8),viewport:view};
}

/** Mount after native touchLayout and journeyHelp have been created. */
export function mountFieldHUD(game,{touch=game?.querySelector?.('#touch')}={}){
 if(!game||!touch)return{refresh(){},get reserve(){return null;},destroy(){}};
 const doc=game.ownerDocument,win=doc.defaultView;
 let current=null,disposed=false;
 const active=()=>game.classList.contains('touch-on')&&!game.classList.contains('battle-on');
 const apply=(name,value)=>game.style.setProperty(name,value);
 function refresh(){
  if(disposed||!active())return;
  let viewport;try{viewport=JSON.parse(touch.dataset.touchViewport);}catch{}
  viewport??={x:0,y:0,width:game.clientWidth||win.innerWidth,height:game.clientHeight||win.innerHeight};
  current=fieldControlLayout(viewport,{confirm:rect(touch.querySelector('[data-button="a"]')),secondary:rect(touch.querySelector('[data-button="x"]')),joystick:rect(touch.querySelector('#joystick')),reset:rect(touch.querySelector('.touch-view-reset'))});
  for(const[key,b]of Object.entries(current.buttons))for(const[k,v]of Object.entries(b))apply('--field-'+key+'-'+k,v+'px');
  apply('--field-control-reserve',current.reserve+'px');
 }
 // Full assistance remains the same native button with the same callback. It
 // belongs inside the invoked guidance page, rather than beside every scene.
 const actions=game.querySelector('.journey-help'),panel=game.querySelector('.journey-help-panel'),full=actions?.querySelector('button+button');
 let restoreFullFocus=false;
 const rememberFullFocus=()=>{restoreFullFocus=doc.activeElement===full;};
 const restoreFull=()=>{if(full&&panel&&full.parentNode!==panel){full.classList.add('field-guidance-assistance');panel.append(full);if(restoreFullFocus){full.focus?.({preventScroll:true});restoreFullFocus=false;}}};
 full?.addEventListener?.('click',rememberFullFocus,true);
 const Observer=win.MutationObserver;
 const helpObserver=Observer&&panel?new Observer(restoreFull):null;
 helpObserver?.observe(panel,{childList:true});restoreFull();
 const observer=Observer?new Observer(refresh):null;
 observer?.observe(game,{attributes:true,attributeFilter:['class']});
 observer?.observe(touch,{attributes:true,attributeFilter:['data-touch-viewport','data-touch-layout']});
 const resize=win.ResizeObserver?new win.ResizeObserver(refresh):null;resize?.observe(game);
 win.addEventListener('resize',refresh);win.visualViewport?.addEventListener('resize',refresh);win.visualViewport?.addEventListener('scroll',refresh);
 game.classList.add('field-hud-ready');refresh();
 return{refresh,get reserve(){return active()?current?.reserve??null:null;},destroy(){disposed=true;observer?.disconnect();resize?.disconnect();helpObserver?.disconnect();full?.removeEventListener?.('click',rememberFullFocus,true);win.removeEventListener('resize',refresh);win.visualViewport?.removeEventListener('resize',refresh);win.visualViewport?.removeEventListener('scroll',refresh);if(full&&actions){full.classList.remove('field-guidance-assistance');actions.append(full);}game.classList.remove('field-hud-ready');for(const key of ['a','b','x'])for(const dim of ['x','y','w','h'])game.style.removeProperty('--field-'+key+'-'+dim);game.style.removeProperty('--field-control-reserve');}};
}
