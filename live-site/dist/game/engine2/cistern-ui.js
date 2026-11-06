import {CisternRenderer} from './cistern-renderer.js?v=5.42';
import {CISTERN,createCisternState,advanceCistern,actionCistern,cisternObjective,nearbyCisternTarget,cisternRoute,claimCisternRewards} from './cistern-model.js';

const CAMERA_KEY='ash-aether-cistern-camera';
const QUALITY_KEY='ash-aether-cistern-quality';
const DEFAULT_ZOOM=1.35;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clone=value=>JSON.parse(JSON.stringify(value));
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** A scene inside the campaign. The host pauses its field loop while this is open. */
export function mountCistern({parent=document.body,storage=localStorage,getWorld,getArt,onOpen=()=>{},onClose=()=>{},onSave=()=>{},onNotice=()=>{},isPractice=false}={}){
 let root=null,canvas=null,renderer=null,state=null,active=false,paused=false,contextLost=false,frameId=0,lastTime=0,lastHUD=0,lastSave=0,lastWrite=-Infinity,focusBefore=null,oldOverflow='',zoom=DEFAULT_ZOOM,quality='auto',route=[],savePending=false,guardPointer=null,stickPointer=null,movement={x:0,z:0},world=null,partySignature='',announced='',messageTimer=null,resizeObserver=null,score=null,routeBlocked=0;
 const inertSiblings=new Map();let padPrevious=[],padId=null;
 const keys=new Set(),pointers=new Map();
 let pinchDistance=0,pinchZoom=DEFAULT_ZOOM,gesture=false,gestureCooldown=0;
 const read=(key,fallback)=>{try{return storage.getItem(key)||fallback;}catch{return fallback;}};
 const write=(key,value)=>{try{storage.setItem(key,String(value));}catch{}};
 zoom=clamp(Number(read(CAMERA_KEY,String(DEFAULT_ZOOM)))||DEFAULT_ZOOM,.65,1.8);quality=['auto','high','low'].includes(read(QUALITY_KEY,'auto'))?read(QUALITY_KEY,'auto'):'auto';
 const $=selector=>root?.querySelector(selector);
 const heroes=()=>world?.activeHeroes||world?.state?.party?.map(id=>world.state.heroes[id])||[];
 function syncScore(){
  if(!score)return;
  const value=Number(read('ash-music-volume','.42')),volume=Number.isFinite(value)?clamp(value,0,1):.42;
  score.volume=volume*.28;
  if(!active||paused||document.hidden||volume<=0||read('ash-music-pacing','spacious')==='ambient')score.pause();
  else score.play().catch(()=>{});
 }
 const writeState=(force=false)=>{
  if(!state||!world)return;
  world.state.cistern3d=state;
  if(!force&&performance.now()-lastWrite<450){savePending=true;return;}
  lastWrite=performance.now();lastSave=lastWrite;savePending=false;
  try{onSave();}catch(error){showMessage('The dungeon is still open. Saving was unavailable; return to Pause to export your journey.');console.error(error);}
 };
 function showMessage(text,urgent=false){
  if(!root||!text)return;
  const n=$('.cistern-message');n.textContent=text;n.classList.toggle('urgent',urgent);n.hidden=false;
  clearTimeout(messageTimer);messageTimer=setTimeout(()=>{if(n)n.hidden=true;},urgent?6000:4200);
  const live=$('.cistern-live');if(live)live.textContent=text;
 }
 function stopInput(){
  keys.clear();movement={x:0,z:0};guardPointer=null;stickPointer=null;route=[];routeBlocked=0;pointers.clear();pinchDistance=0;gesture=false;
  if(state)state.guard=false;
  $('.cistern-stick-knob')?.style.setProperty('transform','translate(-50%,-50%)');
  $('.cistern-guard')?.classList.remove('held');
 }
 function setZoom(value,persist=true){zoom=clamp(Number(value)||DEFAULT_ZOOM,.65,1.8);renderer?.setZoom(zoom);if(persist)write(CAMERA_KEY,zoom);const n=$('.cistern-zoom-value');if(n)n.textContent=Math.round(zoom*100)+'%';}
 function setPaused(value,reason=''){
  if(!active)return;
  if(!value&&(contextLost||!renderer))value=true;
  paused=!!value;stopInput();const menu=$('.cistern-menu');menu.hidden=!paused;
  const text=$('.cistern-menu-reason');if(text)text.textContent=reason||'Your journey, party and dungeon progress stay together.';
  const resume=$('.cistern-resume');if(resume)resume.disabled=contextLost||!renderer;
  if(paused){writeState(true);resume?.focus();}
  else{lastTime=performance.now();canvas?.focus({preventScroll:true});}
  syncScore();
 }
 function processEvents(events=[]){
  let changed=false;
  for(const event of events){
   if(event.text)showMessage(event.text,event.type==='defeat');
   if(event.type==='exit'){close();return;}
   if(['resonator','gate','victory','enemy-defeated','hurt','defeat','mako','attack','supplies'].includes(event.type))changed=true;
   if(event.type==='resonator'||event.type==='gate'||event.type==='defeat'||event.type==='victory')route=[];
  }
  if(!active)return;
  const rewards=claimCisternRewards(world.state,state)||[];
  for(const event of rewards){if(event.text)showMessage(event.text);changed=true;}
  if(changed)writeState();
 }
 function perform(action){
  if(!active||paused||contextLost||!renderer||!state)return;
  route=[];
  try{processEvents(actionCistern(state,action,heroes(),world.state.items));updateHUD(true);}catch(error){fail(error);}
 }
 function objectivePoint(){
  if(!state)return null;
  if(!state.resonators?.[0])return {...CISTERN.resonators[0],label:'West resonator'};
  if(!state.resonators?.[1])return {...CISTERN.resonators[1],label:'East resonator'};
  if(!state.bossDefeated){const boss=state.enemies?.find(e=>e.boss&&e.hp>0);return {x:boss?.x??0,z:boss?.z??-24,label:'The Drowned Bell'};}
  return {...CISTERN.exit,label:'Return stair'};
 }
 function followObjective(){
  if(paused||!renderer)return;
  const point=objectivePoint();if(!point)return;
  route=cisternRoute(state,point)||[];
  if(!route.length){showMessage('You are close. Use '+(nearbyCisternTarget(state)?.label||'Interact')+' to continue.');return;}
  showMessage('Following the route to '+point.label+'. Move the stick or use an arrow key to take over.');
  canvas.focus({preventScroll:true});
 }
 function fail(error){
  console.error(error);if(!root)return;
  contextLost=true;setPaused(true,'The 3D scene could not draw safely: '+(error?.message||'graphics unavailable')+'. Return to the world to continue your journey.');
  $('.cistern-resume').disabled=true;
  $('.cistern-retry').hidden=false;
 }
 function constructRenderer(){
  try{
   renderer?.destroy();renderer=null;contextLost=false;
   renderer=new CisternRenderer(canvas,{quality,art:getArt?.(),onLost(){contextLost=true;setPaused(true,'The graphics surface paused. Your progress is saved. Wait for recovery, then resume.');},onRestored(){contextLost=false;const resume=$('.cistern-resume');if(resume)resume.disabled=false;const reason=$('.cistern-menu-reason');if(reason)reason.textContent='The graphics surface recovered. Resume when you are ready.';}});
   renderer.setZoom(zoom);renderer.resize();
   $('.cistern-retry').hidden=true;
   return true;
  }catch(error){fail(error);return false;}
 }
 function makeRoot(){
  root=document.createElement('section');root.className='cistern-overlay';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','cistern-heading');
  root.innerHTML=`<canvas class="cistern-canvas" tabindex="0" aria-label="Three dimensional Remembering Cistern. Arrows or WASD move; Space attacks; E interacts."></canvas>
   <div class="cistern-vignette" aria-hidden="true"></div>
   <header class="cistern-top"><div class="cistern-title"><h2 id="cistern-heading">Remembering Cistern</h2><p class="cistern-objective" aria-live="polite"></p></div><button class="cistern-menu-open" aria-label="Pause dungeon and open options">Ⅱ <span>Pause</span></button></header>
   <div class="cistern-party" aria-label="Your travelling party"></div>
   <aside class="cistern-map-panel"><button class="cistern-map-toggle" aria-expanded="false" aria-controls="cistern-map-content">⌖ <span>Map</span></button><div id="cistern-map-content" class="cistern-map-content" hidden><canvas class="cistern-map" width="210" height="236" aria-label="Dungeon map: amber player, teal resonators, red creatures"></canvas><small>AMBER · YOU &nbsp; TEAL · RESONATORS</small></div></aside>
   <div class="cistern-boss" hidden><small>THE DROWNED BELL</small><div><b></b></div><span></span></div>
   <p class="cistern-message" role="status" hidden></p>
   <div class="cistern-context"><button class="cistern-guide"><span>◇</span> Follow objective</button><p class="cistern-nearby"></p></div>
   <div class="cistern-stick" role="application" aria-label="Movement stick. Drag to move, farther to run."><span class="cistern-stick-ring"></span><span class="cistern-stick-knob"></span><small>MOVE</small></div>
   <div class="cistern-actions" aria-label="Dungeon actions"><button class="cistern-break" data-action="mako"><strong>✧</strong><span>Mako break</span><small>6 MP · K / 1</small></button><button class="cistern-attack" data-action="attack"><strong>⚔</strong><span>Strike</span><small>SPACE / J</small></button><button class="cistern-guard"><strong>◇</strong><span>Hold guard</span><small>HOLD G</small></button><button class="cistern-interact" data-action="interact"><strong>◎</strong><span>Interact</span><small>E / X</small></button><button class="cistern-tonic" data-action="tonic"><span>Tonic</span><small>2</small></button></div>
   <div class="cistern-camera"><button class="cistern-zoom-out" aria-label="Zoom out">−</button><button class="cistern-camera-reset" aria-label="Reset dungeon zoom"><span class="cistern-zoom-value">135%</span></button><button class="cistern-zoom-in" aria-label="Zoom in">+</button></div>
   <p class="cistern-key-hint">WASD / arrows · move &nbsp; Shift · run &nbsp; Click ground · walk &nbsp; Wheel / pinch · zoom</p>
   <aside class="cistern-first-visit" aria-label="Your first descent"><button class="cistern-help-close" aria-label="Dismiss dungeon introduction">×</button><strong>Two tones open the way.</strong><p>Follow the stone bridges to both resonators. Red circles warn before a strike; move clear or hold Guard. Mako breaks a charge. Pause always lets you return.</p><small>Move with the stick or WASD · Tap clear floor to walk</small></aside>
   <div class="cistern-menu" hidden><div class="cistern-menu-card"><span class="cistern-eyebrow">THE WATER REMEMBERS</span><h3>Take a breath.</h3><p class="cistern-menu-reason"></p><button class="cistern-resume cistern-primary">Return to the cistern</button><button class="cistern-retry" hidden>Try the 3D renderer again</button><label>Dungeon graphics<select class="cistern-quality"><option value="auto">Automatic</option><option value="high">High detail</option><option value="low">Lighter graphics</option></select></label><p class="cistern-menu-help">Restore both resonators, cross the opened seal, and challenge the Drowned Bell. Strike when close. Mako spends 6 MP and interrupts a charged attack. Hold Guard to reduce damage and recover MP. Tonic uses your shared supply bag. Arrows / WASD move; Shift runs; Space strikes; E interacts; K breaks; G guards; 2 uses a Tonic. Wheel or pinch to zoom. Controller: left stick / D-pad moves, A interacts, X strikes, Y breaks, B / LB guards, RB runs, Start pauses.</p><div class="cistern-menu-buttons"><button class="cistern-save">Save progress</button><button class="cistern-leave">Save &amp; return to the world ↗</button></div><small class="cistern-practice" hidden>Temporary developer playtest · ordinary journey saves are untouched.</small></div></div>
   <span class="cistern-live" aria-live="polite"></span>`;
  parent.append(root);canvas=$('.cistern-canvas');
  for(const sibling of parent.children)if(sibling!==root){inertSiblings.set(sibling,sibling.inert);sibling.inert=true;}
  $('.cistern-first-visit').hidden=read('ash-aether-cistern-help','')==='seen';
  $('.cistern-help-close').onclick=()=>{$('.cistern-first-visit').hidden=true;write('ash-aether-cistern-help','seen');canvas.focus({preventScroll:true});};
  $('.cistern-practice').hidden=!isPractice;
  $('.cistern-quality').value=quality;
  $('.cistern-menu-open').onclick=()=>setPaused(true);
  $('.cistern-resume').onclick=()=>{if(!contextLost&&renderer)setPaused(false);};
  $('.cistern-retry').onclick=()=>{if(constructRenderer())setPaused(false);};
  $('.cistern-leave').onclick=()=>close();
  $('.cistern-save').onclick=()=>{writeState(true);showMessage(isPractice?'Practice progress is kept for this session.':'Dungeon progress saved with your journey.');};
  $('.cistern-quality').onchange=e=>{quality=e.target.value;write(QUALITY_KEY,quality);try{renderer?.setQuality(quality);}catch(error){fail(error);}};
  $('.cistern-zoom-out').onclick=()=>setZoom(zoom-.12);
  $('.cistern-zoom-in').onclick=()=>setZoom(zoom+.12);
  $('.cistern-camera-reset').onclick=()=>setZoom(DEFAULT_ZOOM);
  $('.cistern-guide').onclick=followObjective;
  $('.cistern-map-toggle').onclick=()=>{const b=$('.cistern-map-toggle'),content=$('.cistern-map-content');content.hidden=!content.hidden;b.setAttribute('aria-expanded',String(!content.hidden));if(!content.hidden)drawMap();};
  for(const button of root.querySelectorAll('[data-action]'))button.onclick=()=>perform(button.dataset.action);
  const guard=$('.cistern-guard');
  guard.addEventListener('pointerdown',event=>{if(paused)return;event.preventDefault();guardPointer=event.pointerId;guard.setPointerCapture(event.pointerId);guard.classList.add('held');});
  const endGuard=event=>{if(event.pointerId!==guardPointer)return;guardPointer=null;guard.classList.remove('held');};
  guard.addEventListener('pointerup',endGuard);guard.addEventListener('pointercancel',endGuard);guard.addEventListener('lostpointercapture',endGuard);
  guard.addEventListener('keydown',event=>{if(['Space','Enter'].includes(event.code)){event.preventDefault();keys.add('KeyG');guard.classList.add('held');}});
  guard.addEventListener('keyup',event=>{if(['Space','Enter'].includes(event.code)){event.preventDefault();keys.delete('KeyG');guard.classList.remove('held');}});
  bindCanvas();bindStick();
  resizeObserver=new ResizeObserver(()=>renderer?.resize());resizeObserver.observe(root);
  setZoom(zoom,false);
 }
 function bindStick(){
  const stick=$('.cistern-stick'),knob=$('.cistern-stick-knob');
  const update=event=>{
   if(event.pointerId!==stickPointer)return;
   const box=stick.getBoundingClientRect(),radius=box.width*.32;let x=(event.clientX-box.left-box.width/2)/radius,z=(event.clientY-box.top-box.height/2)/radius;const len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}
   movement={x:Math.abs(x)<.12?0:x,z:Math.abs(z)<.12?0:z};
   knob.style.transform=`translate(calc(-50% + ${x*radius}px),calc(-50% + ${z*radius}px))`;
  };
  stick.addEventListener('pointerdown',event=>{if(paused)return;event.preventDefault();route=[];stickPointer=event.pointerId;stick.setPointerCapture(event.pointerId);update(event);});
  stick.addEventListener('pointermove',update);
  const end=event=>{if(event.pointerId!==stickPointer)return;movement={x:0,z:0};stickPointer=null;knob.style.transform='translate(-50%,-50%)';};
  stick.addEventListener('pointerup',end);stick.addEventListener('pointercancel',end);stick.addEventListener('lostpointercapture',end);
 }
 function pointerDistance(){const p=[...pointers.values()];return p.length>=2?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0;}
 function bindCanvas(){
  canvas.addEventListener('pointerdown',event=>{
   if(paused||contextLost)return;event.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);
   pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,time:performance.now()});
   if(pointers.size>=2){gesture=true;route=[];movement={x:0,z:0};pinchDistance=pointerDistance();pinchZoom=zoom;}
  });
  canvas.addEventListener('pointermove',event=>{
   const p=pointers.get(event.pointerId);if(!p)return;p.x=event.clientX;p.y=event.clientY;
   if(pointers.size>=2&&pinchDistance>0)setZoom(pinchZoom*pointerDistance()/pinchDistance,false);
  });
  const end=(event,cancel=false)=>{
   const p=pointers.get(event.pointerId);if(!p)return;
   const wasGesture=gesture||pointers.size>1;pointers.delete(event.pointerId);
   if(wasGesture){gestureCooldown=performance.now()+260;write(CAMERA_KEY,zoom);if(pointers.size===0){gesture=false;pinchDistance=0;}return;}
   if(cancel||paused||performance.now()<gestureCooldown||performance.now()-p.time>600||Math.hypot(event.clientX-p.startX,event.clientY-p.startY)>12)return;
   const point=renderer?.screenToGround(event.clientX,event.clientY);if(!point)return;
   const nearby=nearbyCisternTarget(state);
   if(nearby&&Math.hypot(point.x-nearby.x,point.z-nearby.z)<1.3){perform('interact');return;}
   route=cisternRoute(state,point)||[];if(!route.length)showMessage('Choose clear stone floor, a bridge, or the marked objective.');
  };
  canvas.addEventListener('pointerup',event=>end(event));canvas.addEventListener('pointercancel',event=>end(event,true));
  canvas.addEventListener('wheel',event=>{if(paused)return;event.preventDefault();setZoom(zoom*Math.exp(-event.deltaY*.001));},{passive:false});
  canvas.addEventListener('contextmenu',event=>event.preventDefault());
 }
 const codes=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','KeyG','KeyJ','Space','KeyE','KeyX','KeyK','Digit1','Digit2','Escape','Equal','Minus']);
 function keyDown(event){
  if(!active)return;
  if(event.ctrlKey||event.metaKey||event.altKey){event.stopImmediatePropagation();return;}
  if(event.code==='Tab'){
   const scope=paused?$('.cistern-menu'):root;
   const elements=[...scope.querySelectorAll('button:not([disabled]):not([hidden]),select,[tabindex="0"]')].filter(e=>e.getClientRects().length);
   const index=elements.indexOf(document.activeElement),next=event.shiftKey?(index<=0?elements.length-1:index-1):(index+1)%elements.length;
   event.preventDefault();event.stopImmediatePropagation();elements[next]?.focus();return;
  }
  if(event.target?.closest('.cistern-guard')&&['Space','Enter'].includes(event.code)){event.preventDefault();event.stopImmediatePropagation();if(!paused){keys.add('KeyG');$('.cistern-guard').classList.add('held');}return;}
  if(event.target?.closest('button')&&['Space','Enter'].includes(event.code)){event.stopImmediatePropagation();return;}
  if(!codes.has(event.code)){event.stopImmediatePropagation();return;}
  // Preserve keyboard operation of visible pause controls, especially the select.
  if(paused&&event.code!=='Escape'&&event.target?.closest('.cistern-menu')){event.stopImmediatePropagation();return;}
  event.preventDefault();event.stopImmediatePropagation();
  if(event.code==='Escape'){if(!event.repeat)setPaused(!paused);return;}
  if(paused)return;
  keys.add(event.code);
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(event.code))route=[];
  if(event.repeat)return;
  if(['Space','KeyJ'].includes(event.code))perform('attack');
  else if(['KeyE','KeyX'].includes(event.code))perform('interact');
  else if(['KeyK','Digit1'].includes(event.code))perform('mako');
  else if(event.code==='Digit2')perform('tonic');
  else if(event.code==='Equal')setZoom(zoom+.12);
  else if(event.code==='Minus')setZoom(zoom-.12);
 }
 function keyUp(event){if(!active)return;if(event.target?.closest('.cistern-guard')&&['Space','Enter'].includes(event.code)){keys.delete('KeyG');event.preventDefault();event.stopImmediatePropagation();$('.cistern-guard').classList.remove('held');return;}if(event.target?.closest('button')&&['Space','Enter'].includes(event.code)){event.stopImmediatePropagation();return;}keys.delete(event.code);if(codes.has(event.code)&&!event.ctrlKey&&!event.metaKey&&!event.altKey)event.preventDefault();event.stopImmediatePropagation();}
 function onBlur(){if(active&&!paused)setPaused(true,'The dungeon paused while you were away. Resume when you are ready.');}
 function onVisibility(){if(document.hidden)onBlur();}
 function pollGamepad(){
  const idle={x:0,z:0,guard:false,run:false};
  let pad;try{pad=[...(navigator.getGamepads?.()||[])].find(p=>p?.connected&&p.mapping==='standard');}catch{return idle;}
  if(!pad){padPrevious=[];padId=null;return idle;}
  const current=pad.buttons.map(button=>!!button.pressed),identity=pad.index+':'+pad.id,isNew=identity!==padId;
  if(isNew){padId=identity;padPrevious=current.slice();}
  const edge=index=>!!current[index]&&!padPrevious[index];
  if(!document.hidden){
   if(edge(9))setPaused(!paused);
   if(!paused&&!contextLost&&renderer){
    if(edge(0))perform('interact');
    if(edge(2))perform('attack');
    if(edge(3))perform('mako');
   }
  }
  padPrevious=current;
  if(paused||document.hidden)return idle;
  const ax=Number(pad.axes[0])||0,az=Number(pad.axes[1])||0,len=Math.hypot(ax,az),scale=len>.18?Math.min(1,(len-.18)/.82)/len:0;
  const x=clamp(ax*scale+(current[15]?1:0)-(current[14]?1:0),-1,1),z=clamp(az*scale+(current[13]?1:0)-(current[12]?1:0),-1,1);
  if(Math.hypot(x,z)>.01)route=[];
  return {x,z,guard:!!current[1]||!!current[4],run:!!current[5]};
 }
 function drawMap(){
  const map=$('.cistern-map');if(!map||!state||$('.cistern-map-content').hidden)return;
  const ctx=map.getContext('2d'),scale=4.25,ox=105,oy=160;const point=(x,z)=>[ox+x*scale,oy+z*scale];
  ctx.clearRect(0,0,map.width,map.height);ctx.fillStyle='#071519';ctx.fillRect(0,0,map.width,map.height);
  ctx.fillStyle='#304044';ctx.strokeStyle='#62716b';ctx.lineWidth=1;
  for(const room of CISTERN.rooms){const [x,y]=point(room.x0,room.z0),w=(room.x1-room.x0)*scale,h=(room.z1-room.z0)*scale;ctx.fillRect(x,y,w,h);ctx.strokeRect(x+.5,y+.5,w,h);}
  const water=CISTERN.water;if(water){const [x,y]=point(water.x0,water.z0);ctx.fillStyle='#0a4b50';ctx.fillRect(x,y,(water.x1-water.x0)*scale,(water.z1-water.z0)*scale);ctx.fillStyle='#53605b';ctx.fillRect(ox-1.6*scale,oy+water.z0*scale,3.2*scale,(water.z1-water.z0)*scale);ctx.fillRect(ox+water.x0*scale,oy-6.6*scale,(water.x1-water.x0)*scale,3.2*scale);}
  ctx.fillStyle=state.resonators?.every(Boolean)?'#61d5bd':'#b47d55';ctx.fillRect(ox-2*scale,oy-14*scale,4*scale,2);
  for(let i=0;i<CISTERN.resonators.length;i++){const target=CISTERN.resonators[i],[x,y]=point(target.x,target.z);ctx.fillStyle=state.resonators?.[i]?'#9af2da':'#447c7d';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();}
  for(const e of state.enemies||[]){if(e.hp<=0)continue;const [x,y]=point(e.x,e.z);ctx.fillStyle=e.boss?'#e7a464':'#ce7567';ctx.beginPath();ctx.arc(x,y,e.boss?4:2.3,0,Math.PI*2);ctx.fill();}
  const p=state.player,[x,y]=point(p.x,p.z);ctx.fillStyle='#f8d898';ctx.beginPath();ctx.arc(x,y,3.8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f8d898';ctx.beginPath();ctx.arc(x,y,6.5,0,Math.PI*2);ctx.stroke();
  const target=objectivePoint();if(target){const [tx,ty]=point(target.x,target.z);ctx.strokeStyle='#bce7ce';ctx.lineWidth=1;ctx.strokeRect(tx-6,ty-6,12,12);}
 }
 function updateHUD(force=false){
  if(!root||!state)return;
  const now=performance.now();if(!force&&now-lastHUD<100)return;lastHUD=now;
  const objective=cisternObjective(state),shortObjective=state.bossDefeated?'Return with the recovered memory.':!state.resonators?.[0]?'Sound the west resonator.':!state.resonators?.[1]?'Sound the east resonator.':'Enter the sanctum. Silence the Drowned Bell.';
  if($('.cistern-objective').textContent!==shortObjective){$('.cistern-objective').textContent=shortObjective;$('.cistern-objective').setAttribute('aria-label',objective);if(objective!==announced){announced=objective;$('.cistern-live').textContent=objective;}}
  const members=heroes(),signature=members.map(h=>h.id).join(',');
  if(signature!==partySignature){partySignature=signature;$('.cistern-party').innerHTML=members.map(h=>`<div class="cistern-hero" data-hero="${h.id}"><span class="cistern-hero-emblem">${escapeHTML((h.name||'?').slice(0,1))}</span><div><strong>${escapeHTML(h.name||'Companion')}</strong><i class="cistern-hp"><b></b></i><small></small></div></div>`).join('');}
  for(const h of members){const card=$(`.cistern-hero[data-hero="${h.id}"]`);if(!card)continue;card.classList.toggle('fallen',h.hp<=0);card.querySelector('.cistern-hp b').style.width=clamp(h.hp/Math.max(1,h.maxHp)*100,0,100)+'%';card.querySelector('small').textContent=Math.ceil(h.hp)+' / '+h.maxHp+' HP · '+Math.floor(h.mp)+' MP';}
  const nearby=nearbyCisternTarget(state);$('.cistern-nearby').textContent=nearby?'◎ '+nearby.label:route.length?'Following stone paths · move to take control':'Restore the song beneath the city';
  const interact=$('.cistern-interact');interact.classList.toggle('available',!!nearby);interact.querySelector('span').textContent=nearby?.type==='exit'?'Return':nearby?.type==='resonator'?'Restore':'Interact';
  const first=members.find(h=>h.hp>0),mako=$('.cistern-break');mako.disabled=!first||first.mp<6;mako.title=first?'Break a charged attack · '+Math.floor(first.mp)+' MP available':'A companion must be standing';
  $('.cistern-tonic small').textContent=(world.state.items?.tonic||0)+' left · 2';$('.cistern-tonic').disabled=!(world.state.items?.tonic>0);
  const boss=state.enemies?.find(e=>e.boss&&e.hp>0),bossUI=$('.cistern-boss');bossUI.hidden=!boss||state.player.z>-13;
  if(boss){bossUI.querySelector('b').style.width=clamp(boss.hp/boss.maxHp*100,0,100)+'%';bossUI.querySelector('span').textContent=boss.telegraph?'MOVE CLEAR · MAKO TO INTERRUPT':boss.phase>1?'The Bell changes its rhythm':'Watch the red warning before each strike';}
  const guarded=guardPointer!==null||keys.has('KeyG')||state.guard;$('.cistern-guard').classList.toggle('held',guarded);
  canvas.dataset.cisternObjective=objective;canvas.dataset.cisternPlayer=state.player.x.toFixed(2)+','+state.player.z.toFixed(2);canvas.dataset.cisternResonators=(state.resonators||[]).map(Number).join(',');canvas.dataset.cisternBoss=state.bossDefeated?'defeated':boss?'standing':'absent';canvas.dataset.cisternPaused=String(paused);
  if(renderer?.stats){canvas.dataset.cisternQuality=renderer.stats.quality||quality;canvas.dataset.cisternDrawCalls=String(renderer.stats.drawCalls||0);}
  drawMap();
 }
 function tick(now){
  if(!active)return;frameId=requestAnimationFrame(tick);const dt=clamp((now-lastTime)/1000,0,.1);lastTime=now;
  try{
   const pad=pollGamepad();if(!active)return;
   if(!paused&&!contextLost&&renderer&&!document.hidden){
    let mx=movement.x+pad.x+(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0),mz=movement.z+pad.z+(keys.has('ArrowDown')||keys.has('KeyS')?1:0)-(keys.has('ArrowUp')||keys.has('KeyW')?1:0);
    if(gesture){mx=0;mz=0;}
    const guarding=guardPointer!==null||keys.has('KeyG')||pad.guard,before={x:state.player.x,z:state.player.z};
    if(route.length&&Math.hypot(mx,mz)<.01&&!gesture){
     while(route.length&&Math.hypot(route[0].x-state.player.x,route[0].z-state.player.z)<.055)route.shift();
     if(route.length){const p=route[0],len=Math.hypot(p.x-state.player.x,p.z-state.player.z),stepSpeed=3.25*(guarding?.45:1),speedScale=Math.min(1,len/Math.max(.001,stepSpeed*dt));mx=(p.x-state.player.x)/Math.max(.001,len)*speedScale;mz=(p.z-state.player.z)/Math.max(.001,len)*speedScale;}
     else showMessage('You have reached the marked place. Use Interact, or Strike if a creature is in reach.');
    }
    processEvents(advanceCistern(state,dt,{moveX:mx,moveZ:mz,run:!route.length&&(pad.run||keys.has('ShiftLeft')||keys.has('ShiftRight')||Math.hypot(movement.x,movement.z)>.85),guard:guarding},heroes()));
    if(!active)return;
    if(route.length&&Math.hypot(mx,mz)>.01){routeBlocked=Math.hypot(before.x-state.player.x,before.z-state.player.z)<.001?routeBlocked+dt:0;if(routeBlocked>1.1){route=[];routeBlocked=0;showMessage('The route paused at an obstruction. Tap clear stone or use the stick to continue.');}}else routeBlocked=0;
    if(now-lastSave>8000||savePending&&now-lastWrite>500)writeState();
   }
   if(renderer&&!contextLost){const drawStarted=performance.now();renderer.render(state,heroes(),paused?0:dt);const drawElapsed=performance.now()-drawStarted;if(drawElapsed>1)canvas.dataset.cisternRenderMs=drawElapsed.toFixed(1);}
   updateHUD();
  }catch(error){fail(error);}
 }
 function open({practice=false}={}){
  if(active)return;world=getWorld?.();if(!world?.state)throw Error('A journey must be ready before entering the cistern.');
  isPractice=!!isPractice||practice;focusBefore=document.activeElement;state=createCisternState(world.state.cistern3d||{},heroes());world.state.cistern3d=state;active=true;paused=false;partySignature='';announced='';route=[];contextLost=false;padPrevious=[];padId=null;
  oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';document.documentElement.classList.add('cistern-open');
  try{onOpen();makeRoot();score=new Audio(new URL('../music/rpg/dungeon.ogg',import.meta.url).href);score.loop=true;score.preload='none';constructRenderer();syncScore();updateHUD(true);writeState(true);lastTime=performance.now();frameId=requestAnimationFrame(tick);if(!paused)canvas.focus({preventScroll:true});}catch(error){if(root)fail(error);else{active=false;document.body.style.overflow=oldOverflow;document.documentElement.classList.remove('cistern-open');onClose();throw error;}}
  return active;
 }
 function close(){
  if(!active)return;writeState(true);active=false;stopInput();cancelAnimationFrame(frameId);clearTimeout(messageTimer);resizeObserver?.disconnect();resizeObserver=null;
  score?.pause();if(score){score.removeAttribute('src');score.load();}score=null;renderer?.destroy();renderer=null;root?.remove();root=null;canvas=null;for(const [sibling,previous]of inertSiblings){sibling.inert=previous;}inertSiblings.clear();document.body.style.overflow=oldOverflow;document.documentElement.classList.remove('cistern-open');
  try{onClose();}finally{if(focusBefore?.isConnected)focusBefore.focus({preventScroll:true});}
 }
 window.addEventListener('keydown',keyDown,true);window.addEventListener('keyup',keyUp,true);window.addEventListener('blur',onBlur);document.addEventListener('visibilitychange',onVisibility);
 const pageHide=()=>{if(active)writeState(true);};window.addEventListener('pagehide',pageHide);
 return {open,close,get active(){return active;},get snapshot(){return state?clone(state):null;},destroy(){close();window.removeEventListener('keydown',keyDown,true);window.removeEventListener('keyup',keyUp,true);window.removeEventListener('blur',onBlur);document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('pagehide',pageHide);}};
}
