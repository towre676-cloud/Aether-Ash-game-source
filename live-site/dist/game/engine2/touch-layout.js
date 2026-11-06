/** Thumb controls are anchored to the visible screen, independently of the world lens. */
export const TOUCH_LAYOUT_KEY='ash-aether-touch-layout-v1';
const finite=(n,f=0)=>Number.isFinite(Number(n))?Number(n):f;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
/** CSS coordinates in the control host, including native browser zoom/panning. */
export function visibleTouchViewport(rect={},viewport=null,fallback={}){
 const rw=Math.max(1,finite(rect.width,finite(fallback.width,1))),rh=Math.max(1,finite(rect.height,finite(fallback.height,1))),left=finite(rect.left),top=finite(rect.top);
 const vx=viewport?finite(viewport.offsetLeft):0,vy=viewport?finite(viewport.offsetTop):0,vw=Math.max(1,finite(viewport?.width,finite(fallback.width,rw))),vh=Math.max(1,finite(viewport?.height,finite(fallback.height,rh)));
 const x=clamp(Math.max(left,vx)-left,0,rw-1),y=clamp(Math.max(top,vy)-top,0,rh-1),right=clamp(Math.min(left+rw,vx+vw)-left,x+1,rw),bottom=clamp(Math.min(top+rh,vy+vh)-top,y+1,rh);
 return{x,y,width:Math.max(1,right-x),height:Math.max(1,bottom-y)};
}
export function touchControlLayout(width,height,{preset='spaced',safe={}}={}){
 width=Math.max(1,finite(width,320));height=Math.max(1,finite(height,568));
 const large=preset==='large',wide=width>height&&height<=540,left=clamp(finite(safe.left),0,width*.28),right=clamp(finite(safe.right),0,width*.28),bottom=clamp(finite(safe.bottom),0,height*.20),topSafe=clamp(finite(safe.top),0,height*.20),availableWidth=width-left-right,availableHeight=height-topSafe-bottom;
 // Only exceptionally small visual viewports shrink CSS targets. Native page
 // magnification makes these targets physically larger by the same factor.
 const scale=Math.min(1,availableWidth/232,availableHeight/(wide?235:275)),edge=12*scale,size=(large?58:52)*scale,confirm=(large?70:64)*scale,gap=22*scale,faceWidth=size+gap+confirm,baseX=width-right-edge-faceWidth,baseY=height-bottom-13*scale;
 const buttons={b:{x:baseX,y:baseY-size,w:size,h:size},a:{x:baseX+size+gap,y:baseY-confirm,w:confirm,h:confirm},x:{x:baseX+5*scale,y:baseY-confirm-gap-size,w:size,h:size}};
 buttons.y={x:Math.max(left+edge,baseX-(wide?84:74)*scale),y:buttons.x.y+(wide?5:-78)*scale,w:size,h:size};
 const wantedStick=(wide?(large?104:96):(large?120:112))*scale,stickSize=Math.max(1,Math.min(wantedStick,baseX-left-edge-18*scale,availableHeight*.40)),joystick={x:left+edge,y:height-bottom-17*scale-stickSize,w:stickSize,h:stickSize};
 for(const b of [...Object.values(buttons),joystick]){b.w=Math.min(b.w,availableWidth);b.h=Math.min(b.h,availableHeight);b.x=clamp(b.x,left,width-right-b.w);b.y=clamp(b.y,topSafe,height-bottom-b.h);}
 const top=Math.min(joystick.y,...Object.values(buttons).map(b=>b.y));
 const reset={x:joystick.x,y:Math.max(topSafe+4,joystick.y-40*scale),w:Math.min(88*scale,availableWidth),h:32*scale};
 return{buttons,joystick,reset,reserve:Math.ceil(height-top+8*scale),wide,preset,scale};
}
export function targetGap(a,b){const x=Math.max(0,a.x-b.x-b.w,b.x-a.x-a.w),y=Math.max(0,a.y-b.y-b.h,b.y-a.y-a.h);return Math.hypot(x,y);}
export function mountTouchLayout(root,{storage=localStorage,settings=null,onChange=()=>{},onRecover=()=>{}}={}){
 let preset;try{preset=storage.getItem(TOUCH_LAYOUT_KEY);}catch{}if(!['spaced','large'].includes(preset))preset='spaced';
 const doc=root.ownerDocument,win=doc.defaultView,game=root.closest('#game'),probe=doc.createElement('i');probe.style.cssText='position:absolute;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';root.append(probe);let current,refreshing=false;
 const fieldReset=doc.createElement('button');fieldReset.type='button';fieldReset.className='touch-view-reset';fieldReset.textContent='↺ Reset view';fieldReset.setAttribute('aria-label','Reset view and controls');fieldReset.title='Recenter the camera and restore reachable controls';root.append(fieldReset);
 function refresh(){
  if(refreshing)return;refreshing=true;
  try{
   const p=win.getComputedStyle(probe),safe={left:parseFloat(p.paddingLeft)||0,right:parseFloat(p.paddingRight)||0,bottom:parseFloat(p.paddingBottom)||0,top:parseFloat(p.paddingTop)||0},measured=root.getBoundingClientRect(),host=measured.width>0&&measured.height>0?measured:(game?.getBoundingClientRect?.()||{left:0,top:0,width:win.innerWidth,height:win.innerHeight}),view=visibleTouchViewport(host,win.visualViewport,{width:win.innerWidth,height:win.innerHeight}),local=touchControlLayout(view.width,view.height,{preset,safe});
   const offset=b=>({...b,x:b.x+view.x,y:b.y+view.y});current={...local,buttons:Object.fromEntries(Object.entries(local.buttons).map(([key,b])=>[key,offset(b)])),joystick:offset(local.joystick),reset:offset(local.reset),viewport:view,reserve:Math.ceil(Math.max(0,host.height-view.y-view.height)+local.reserve)};
   const place=(element,b)=>{if(element)Object.assign(element.style,{left:b.x+'px',top:b.y+'px',right:'auto',bottom:'auto',width:b.w+'px',height:b.h+'px',minWidth:b.w+'px',minHeight:b.h+'px'});};
   for(const[key,b]of Object.entries(current.buttons))place(root.querySelector('[data-button="'+key+'"]'),b);place(root.querySelector('#joystick'),current.joystick);place(fieldReset,current.reset);
   game?.style.setProperty('--touch-reserve',current.reserve+'px');game?.style.setProperty('--touch-left-clearance',(current.joystick.x+current.joystick.w+14)+'px');root.dataset.touchLayout=preset;root.dataset.touchViewport=JSON.stringify(view);onChange(current);
  }finally{refreshing=false;}
 }
 function recover(event){event?.preventDefault?.();event?.stopPropagation?.();refresh();onRecover(current);}
 const isolateKeyboard=e=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation();};for(const type of ['keydown','keyup'])fieldReset.addEventListener(type,isolateKeyboard);fieldReset.addEventListener('click',recover);fieldReset.addEventListener('pointerdown',e=>e.stopPropagation());
 let label,select,recovery;if(settings){label=doc.createElement('label');label.className='setting touch-layout-setting';label.textContent='Touch button size & spacing';select=doc.createElement('select');select.setAttribute('aria-label','Touch button size and spacing');for(const[value,text]of [['spaced','Spaced controls'],['large','Larger controls']]){const o=doc.createElement('option');o.value=value;o.textContent=text;select.append(o);}select.value=preset;select.onchange=()=>setPreset(select.value);label.append(select);recovery=doc.createElement('button');recovery.type='button';recovery.className='touch-layout-recover';recovery.textContent='Reset view & controls';recovery.onclick=recover;for(const type of ['keydown','keyup'])recovery.addEventListener(type,isolateKeyboard);settings.append(label,recovery);}
 function setPreset(next){if(!['spaced','large'].includes(next))return;preset=next;try{storage.setItem(TOUCH_LAYOUT_KEY,preset);}catch{}if(select)select.value=preset;refresh();}
 const viewport=win.visualViewport,observer=win.ResizeObserver?new win.ResizeObserver(refresh):null;observer?.observe(root);win.addEventListener('resize',refresh);win.addEventListener('orientationchange',refresh);viewport?.addEventListener('resize',refresh);viewport?.addEventListener('scroll',refresh);refresh();
 return{refresh,recover,setPreset,get layout(){return current;},destroy(){win.removeEventListener('resize',refresh);win.removeEventListener('orientationchange',refresh);viewport?.removeEventListener('resize',refresh);viewport?.removeEventListener('scroll',refresh);observer?.disconnect();fieldReset.remove();probe.remove();label?.remove();recovery?.remove();}};
}
