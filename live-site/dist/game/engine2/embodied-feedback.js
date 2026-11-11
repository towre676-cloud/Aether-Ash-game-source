/** Small physical cues and procedural foley for actions performed in the world.
 * This module never advances story state. The installed embodied model owns it.
 */
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const center=object=>({x:finite(object?.xy?.[0])+.5,y:finite(object?.xy?.[1])+.5});
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const kindFor=object=>String(object?.manipulation||object?.kind||object?.embodiedAction||'switch');
const labels={receiver:'Listen',cable:'Ground cable',ground:'Ground cable',lever:'Raise vane',vane:'Raise vane',coil:'Separate coil',lure:'Divert kite',switch:'Set channel',departure:'Leave mast',gauge:'Set gauge',lamp:'Turn lamp',roller:'Roll rubbing',panel:'Release plate',work:'Work'};
const icons={receiver:'◉',cable:'⌁',ground:'⌁',lever:'↥',vane:'↥',coil:'∿',lure:'◇',switch:'⏻',departure:'↗'};
const completed={receiver:'Signal heard',cable:'Grounded',ground:'Grounded',lever:'Vane raised',vane:'Vane raised',coil:'Coils separated',lure:'Kite diverted',switch:'Channel set',choice:'Choice set',departure:'Road open'};
const modelFor=world=>world?.worldControls||world?.embodiedOrigins||world?.embodiedOrigin||null;
const shortActionLabel=(object,kind)=>object?.controlLabel?String(object.controlLabel).slice(0,42):object?.originId&&object.originId!=='veyr-storm'?String(object.label||labels[kind]||'Use').slice(0,42):object?.requiresChoice&&object.choiceGroup==='destiny'?object.originId==='veyr-storm'?(object.choiceIndex===0?'Shared listening watch':'Independent reply windows'):String(object.label||labels[kind]||'Use').slice(0,42):labels[kind]||String(object?.label||'Use').split(/\s+/).slice(0,3).join(' ');

export function createEmbodiedFeedback({getWorld=()=>null,getRenderer=()=>null,getVolume=()=>1,onSave=()=>{},onNotice=()=>{}}={}){
 let context=null,master=null,wind=null,hum=null,noiseBuffer=null,unlocked=false,destroyed=false,lastCue=null,flash=null,age=0,scene=null,physical=null,audioLevel=0,windLevel=0,humLevel=0,creakAt=-10,choiceSession=null,effectSequence=0;
 const effects=[],voices=new Set();
 const doc=typeof document==='undefined'?null:document;
 let cue=null,cueIcon=null,cueLabel=null,cueLive=null,choices=null;
 if(doc){
  cue=doc.createElement('div');cue.className='embodied-cue';cue.hidden=true;cue.setAttribute('aria-hidden','true');
  cue.innerHTML='<span class="embodied-cue-ring"><b></b></span><span class="embodied-cue-label"></span>';
  cueIcon=cue.querySelector('b');cueLabel=cue.querySelector('.embodied-cue-label');
  cueLive=doc.createElement('span');cueLive.className='embodied-live';cueLive.setAttribute('aria-live','polite');
  choices=doc.createElement('div');choices.className='embodied-choices';choices.hidden=true;choices.setAttribute('role','group');choices.setAttribute('aria-label','World actions');
  const isolate=e=>{e.stopPropagation();if(e.code==='Escape'){e.preventDefault();clearChoices();}};
  choices.addEventListener('keydown',isolate);choices.addEventListener('keyup',isolate);
  (doc.getElementById('game')||doc.body).append(cue,cueLive,choices);
 }
 function clearChoices(){choiceSession=null;if(choices){choices.hidden=true;choices.replaceChildren();}}
 function choose({xy,actions=[],object}={}){
  if(!choices||destroyed)return;
  clearChoices();const world=getWorld(),at=Array.isArray(xy)?{x:xy[0]+.5,y:xy[1]+.5}:object?.xy?center(object):{x:world?.state?.x||0,y:world?.state?.y||0};
  choiceSession={...at,scene:world?.state?.scene,object};if(scene===null)scene=world?.state?.scene;
  const close=doc.createElement('button');close.type='button';close.className='embodied-choice-dismiss';close.textContent='×';close.setAttribute('aria-label','Dismiss world actions');close.onclick=()=>clearChoices();choices.append(close);
  for(const action of actions){
   if(typeof action?.action!=='function')continue;
   const full=String(action.label||'Use'),button=doc.createElement('button'),icon=doc.createElement('span'),label=doc.createElement('span');button.type='button';button.className='embodied-choice';button.setAttribute('aria-label',full);button.title=full;button.disabled=!!action.disabled;
   icon.className='embodied-choice-icon';icon.textContent=/leave|return|back|later|cancel/i.test(full)?'↗':/repair|fit|release|turn|open|ground|separate/i.test(full)?'⌁':/take|recover|buy|collect/i.test(full)?'◇':'◎';icon.setAttribute('aria-hidden','true');label.textContent=full.length>42?full.slice(0,39)+'…':full;button.append(icon,label);
   button.onclick=()=>{clearChoices();unlock();try{action.action();onSave();}catch(error){console.error(error);}};choices.append(button);
  }
  if(choices.children.length<2){clearChoices();return;}
  choices.hidden=false;projectChoices();
 }
 function projectedPosition(x,y,height=1.15){
  const renderer=getRenderer();if(!renderer||!doc)return null;
  let p;try{p=renderer.worldToScreen?.(x,y,height);}catch{return null;}
  if(!p||p.visible===false||!Number.isFinite(p.x)||!Number.isFinite(p.y))return null;
  const surface=renderer.canvas||doc.getElementById('screen'),box=surface?.getBoundingClientRect?.()||{left:0,top:0},host=(cue?.offsetParent||doc.body).getBoundingClientRect?.()||{left:0,top:0};
  return {x:p.x+box.left-host.left,y:p.y+box.top-host.top};
 }
 function projectChoices(){
  if(!choices||!choiceSession)return;
  const world=getWorld(),pref=preferences(),distance=Math.hypot(choiceSession.x-(world?.state?.x||0),choiceSession.y-(world?.state?.y||0));
  if(!pref.active||world?.state?.scene!==choiceSession.scene||distance>3.4){clearChoices();return;}
  const p=projectedPosition(choiceSession.x,choiceSession.y,1.45);if(!p){choices.hidden=true;return;}
  const host=(choices.offsetParent||doc.body),width=host.clientWidth||innerWidth,height=host.clientHeight||innerHeight;
  choices.style.left=clamp(p.x,Math.min(150,width/2),Math.max(width/2,width-150))+'px';choices.style.top=clamp(p.y,90,Math.max(90,height-150))+'px';choices.hidden=false;
 }
 function preferences(){
  let provided;try{provided=getVolume();}catch{provided=0;}
  const config=provided&&typeof provided==='object'?provided:{volume:provided};
  let enabled=true,ambience=.55;
  try{enabled=localStorage.getItem('aa-acoustic-enabled')!=='off';const raw=localStorage.getItem('aa-acoustic-volume');if(raw!==null)ambience=clamp(Number(raw));}catch{}
  return {volume:clamp(finite(config.volume,1))*ambience,active:config.active!==false&&enabled&&!doc?.hidden};
 }
 function makeAudio(){
  if(context||destroyed)return;
  const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
  context=new Audio();master=context.createGain();master.gain.value=0;master.connect(context.destination);
  noiseBuffer=context.createBuffer(1,Math.max(1,Math.floor(context.sampleRate*2)),context.sampleRate);
  const data=noiseBuffer.getChannelData(0);let brown=0;
  for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.03)/1.03;data[i]=brown*3.5;}
  const windSource=context.createBufferSource();windSource.buffer=noiseBuffer;windSource.loop=true;
  const windFilter=context.createBiquadFilter();windFilter.type='bandpass';windFilter.frequency.value=430;windFilter.Q.value=.35;
  const windGain=context.createGain();windGain.gain.value=0;windSource.connect(windFilter);windFilter.connect(windGain);windGain.connect(master);windSource.start();
  wind={source:windSource,filter:windFilter,gain:windGain};
  const humA=context.createOscillator(),humB=context.createOscillator();humA.type='sine';humB.type='triangle';humA.frequency.value=73;humB.frequency.value=146.5;
  const humGain=context.createGain();humGain.gain.value=0;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=520;
  humA.connect(filter);humB.connect(filter);filter.connect(humGain);humGain.connect(master);humA.start();humB.start();hum={a:humA,b:humB,gain:humGain,filter};
 }
 function unlock(){
  if(destroyed)return Promise.resolve(false);
  try{makeAudio();unlocked=!!context;return context?.resume?.().then(()=>true).catch(()=>false)||Promise.resolve(false);}catch{return Promise.resolve(false);}
 }
 function panAt(x,y){
  const world=getWorld(),player={x:world?.state?.x||0,y:world?.state?.y||0};
  return {pan:clamp((finite(x,player.x)-player.x)/8,-.85,.85),gain:1/(1+Math.hypot(finite(x,player.x)-player.x,finite(y,player.y)-player.y)*.12)};
 }
 function voice({frequency=180,endFrequency=frequency,duration=.15,gain=.16,type='sine',noise=false,x,y,filter=1800,delay=0}){
  if(!context||context.state!=='running'||!master)return;
  const pref=preferences();if(!pref.active||pref.volume<=0)return;
  const time=context.currentTime+delay,{pan,gain:distance}=panAt(x,y),node=noise?context.createBufferSource():context.createOscillator();
  if(noise)node.buffer=noiseBuffer;else{node.type=type;node.frequency.setValueAtTime(Math.max(18,frequency),time);node.frequency.exponentialRampToValueAtTime(Math.max(18,endFrequency),time+duration);}
  const band=context.createBiquadFilter();band.type='lowpass';band.frequency.value=filter;
  const envelope=context.createGain();envelope.gain.setValueAtTime(.0001,time);envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,gain*distance),time+.008);envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
  let panner=null;if(context.createStereoPanner){panner=context.createStereoPanner();panner.pan.value=pan;}
  node.connect(band);band.connect(envelope);if(panner){envelope.connect(panner);panner.connect(master);}else envelope.connect(master);
  const parts=[node,band,envelope,panner].filter(Boolean);voices.add(parts);
  node.onended=()=>{for(const part of parts){try{part.disconnect();}catch{}}voices.delete(parts);};node.start(time);node.stop(time+duration+.02);
 }
 function sound(e){
  const key=String(e.sound||e.kind||'').toLowerCase(),kind=String(e.kind||key),where={x:e.x??e.object?.xy?.[0],y:e.y??e.object?.xy?.[1]};
  if(e.type==='progress'){
   if(age-creakAt<.32||!['lever','coil','cable'].includes(kind))return;creakAt=age;
   voice({...where,frequency:kind==='cable'?290:83,endFrequency:kind==='cable'?170:120,duration:.09,gain:.08,type:'triangle',filter:900});return;
  }
  if(e.type==='cancel'){voice({...where,frequency:150,endFrequency:85,duration:.09,gain:.06,type:'triangle'});return;}
  if(kind==='reed-call'){
   voice({...where,frequency:294,endFrequency:291,duration:.22,gain:.12,type:'triangle'});
   if(e.echo)voice({...e.echo,frequency:440,endFrequency:432,duration:.44,gain:.09,type:'triangle'});
   return;
  }
  if(e.type==='complete'&&kind==='lure'&&e.object?.originId==='sable-reed'){
   voice({...where,frequency:440,duration:.38,gain:.10,type:'triangle'});
   voice({...where,frequency:660,duration:.30,gain:.045,type:'triangle',delay:.14});
   return;
  }
  if(e.type==='signal'||key.includes('signal')||kind==='receiver'){
   voice({...where,frequency:620,endFrequency:720,duration:.2,gain:.045});voice({...where,frequency:930,endFrequency:880,duration:.28,gain:.025});return;
  }
  if(kind==='cable'||key.includes('ground')){
   voice({...where,frequency:e.type==='complete'?92:270,endFrequency:e.type==='complete'?42:180,duration:e.type==='complete'?.3:.08,gain:e.type==='complete'?.22:.09,type:'triangle',filter:1400});
   if(e.type==='complete')voice({...where,duration:.08,gain:.12,noise:true,filter:2400});return;
  }
  if(kind==='lever'||key.includes('creak')){
   voice({...where,frequency:e.type==='complete'?160:65,endFrequency:e.type==='complete'?58:105,duration:e.type==='complete'?.25:.35,gain:.12,type:'sawtooth',filter:550});return;
  }
  if(kind==='coil'){
   voice({...where,frequency:e.type==='complete'?390:130,endFrequency:e.type==='complete'?195:145,duration:.2,gain:.075,type:'triangle'});return;
  }
  voice({...where,frequency:e.type==='complete'||e.type==='choice'?380:230,endFrequency:110,duration:.075,gain:.14,type:'square',filter:1700});
 }
 function event(e={}){
  if(destroyed)return;
  const kind=String(e.kind||e.object?.manipulation||'switch'),xy=e.xy||e.object?.xy,world=getWorld(),position={x:finite(e.x,xy?xy[0]+.5:finite(world?.state?.x)),y:finite(e.y,xy?xy[1]+.5:finite(world?.state?.y))};
  if(e.type!=='progress'){
   effects.push({type:e.type,kind,id:e.id||'feedback-'+effectSequence++,object:e.object,x:position.x,y:position.y,t:0,life:e.duration|| (e.type==='complete'?1.3:.65),duration:e.duration||.7,progress:e.progress??0,open:e.open,echo:e.echo,peaceful:e.peaceful,color:e.color||'#a9ddbd'});if(effects.length>20)effects.shift();
  }
  sound({...e,...position,kind});
  if(e.type==='complete'||e.type==='choice'||e.type==='signal'){
   flash={x:position.x,y:position.y,kind,label:e.caption||(e.type==='signal'?'Signal clear':e.object?.actuatorId?({receiver:'Sounded',gauge:'Control aligned',roller:'Record turned',lever:'Mechanism set',work:'Work set',lamp:'Light set',coil:'Circuit set'}[kind]||'Set'):completed[kind]||'Set'),progress:1,remaining:1.8};
   if(cueLive)cueLive.textContent=flash.label;
   try{onSave();}catch{}
  }
  if(e.type==='interaction'&&Array.isArray(e.effects)){
   const reward=e.effects.find(effect=>/\+\s*\d+/.test(String(effect?.text||'')));
   if(reward){const count=String(reward.text).match(/\+\s*\d+/)?.[0]||'',icon=/xp|master|level/i.test(reward.kind||reward.text)?'✧':/credit|gold/i.test(reward.kind||reward.text)?'◈':'◇';flash={...position,kind:'switch',label:count+' '+icon,progress:1,remaining:1.7};if(cueLive)cueLive.textContent=flash.label;}
  }
 }
 function modelSnapshot(){
  const world=getWorld(),model=modelFor(world);try{return model?.snapshot?.()||null;}catch{return null;}
 }
 function chooseCue(world,model,snapshot){
  const pending=snapshot?.pending;
  if(pending){const p=pending.xy?center(pending):{x:finite(pending.x,world.state.x),y:finite(pending.y,world.state.y)},kind=pending.manipulation||pending.kind||'switch';return {...p,kind,label:shortActionLabel(pending.object,kind),progress:clamp(pending.progress),active:true};}
  if(flash&&flash.remaining>0)return {...flash,active:false};
  let objects=[];try{objects=model?.objects?.()||[];}catch{}
  const candidates=objects.map(object=>({object,p:center(object)})).map(row=>({...row,distance:Math.hypot(row.p.x-world.state.x,row.p.y-world.state.y)})).filter(row=>row.distance<2.7).sort((a,b)=>a.distance-b.distance);
  if(!candidates.length)return null;
  const {object,p}=candidates[0],kind=kindFor(object);return {...p,kind,label:shortActionLabel(object,kind),progress:0,active:false};
 }
 function projectCue(next){
  if(!cue)return;const world=getWorld(),renderer=getRenderer();
  if(!next||!renderer||world?.state?.mode!=='field'||doc?.hidden){cue.hidden=true;return;}
  const projected=projectedPosition(next.x,next.y);if(!projected){cue.hidden=true;return;}
  cue.style.left=projected.x+'px';cue.style.top=projected.y+'px';cue.style.setProperty('--embodied-progress',clamp(next.progress)*100+'%');
  cue.classList.toggle('working',!!next.active);cue.classList.toggle('done',next.progress>=.98);cueIcon.textContent=icons[next.kind]||'◎';cueLabel.textContent=next.label;cue.hidden=false;
 }
 function update(dt=0){
  if(destroyed)return;dt=clamp(finite(dt),0,.1);age+=dt;
  for(const e of effects)e.t+=dt;while(effects.length&&effects[0].t>effects[0].life)effects.shift();if(flash)flash.remaining-=dt;
  const world=getWorld(),model=modelFor(world);physical=modelSnapshot();
  const nextScene=world?.state?.scene;if(scene!==nextScene){scene=nextScene;effects.length=0;flash=null;lastCue=null;clearChoices();}
  const pref=preferences(),active=(physical?.phase==='past'&&!!physical?.originId||physical?.phase==='world')&&!!world&&world.state.mode==='field'&&pref.active;
  doc?.getElementById('game')?.classList.toggle('embodied-world',active&&physical?.phase==='past');
  lastCue=active?chooseCue(world,model,physical):null;projectCue(lastCue);projectChoices();
  const isStorm=active&&/veyr|storm|mast/i.test(String(getWorld()?.scene?.originId||getWorld()?.scene?.key||''));audioLevel=pref.active?pref.volume:0;
  windLevel=isStorm?.075:0;humLevel=isStorm?(physical?.devices?.coilSeparated?.008:physical?.devices?.grounded?.025:.055):0;
  if(context&&master){const time=context.currentTime;master.gain.setTargetAtTime(audioLevel,time,.08);wind.gain.gain.setTargetAtTime(pref.active?windLevel:0,time,.25);wind.filter.frequency.setTargetAtTime(physical?.devices?.vaneRaised?680:430,time,.5);hum.gain.gain.setTargetAtTime(pref.active?humLevel:0,time,.12);hum.a.frequency.setTargetAtTime(physical?.devices?.grounded?65:73,time,.25);hum.b.frequency.setTargetAtTime(physical?.devices?.grounded?130:146.5,time,.25);}
 }
 function snapshot(){const merged=new Map();for(const e of [...effects,...(physical?.effects||[])]){const value={...e,t:e.t??e.age??0,life:e.life??e.duration??1.2};merged.set((e.id||'')+':'+e.type,value);}return {...(clone(physical)||{}),active:physical?.phase==='world'||physical?.phase==='past'&&!!physical?.originId,wind:windLevel,hum:humLevel,cue:clone(lastCue),effects:clone([...merged.values()])};}
 const visibility=()=>{if(doc?.hidden){clearChoices();if(master&&context)master.gain.setValueAtTime(0,context.currentTime);context?.suspend?.().catch(()=>{});}else if(unlocked)context?.resume?.().catch(()=>{});};
 doc?.addEventListener('visibilitychange',visibility);
 return {event,update,snapshot,unlock,choose,clearChoices,destroy(){destroyed=true;clearChoices();doc?.removeEventListener('visibilitychange',visibility);cue?.remove();cueLive?.remove();choices?.remove();doc?.getElementById('game')?.classList.remove('embodied-world');try{wind?.source.stop();hum?.a.stop();hum?.b.stop();}catch{}for(const parts of voices)for(const part of parts)try{part.disconnect();}catch{}voices.clear();context?.close?.().catch(()=>{});context=null;effects.length=0;}};
}

/** Captures a pointer only on a reachable physical control. Ordinary field taps
 * and pinch gestures retain their existing owners everywhere else. */
export function mountEmbodiedControls({canvas,getWorld=()=>null,getRenderer=()=>null,getModel=()=>modelFor(getWorld()),onBeforeAction=()=>true,onChanged=()=>{}}={}){
 if(!canvas)return {destroy(){},cancel(){},get active(){return false;},snapshot(){return null;}};
 let session=null,frame=0,destroyed=false,suppressUntil=0,lastTime=0;const contacts=new Set(),quarantined=new Set();
 const swallow=e=>{e.preventDefault?.();e.stopImmediatePropagation?.();};
 const point=e=>{const renderer=getRenderer();let p;try{p=renderer?.pointerToWorld?.(e.clientX,e.clientY)||renderer?.screenToGround?.(e.clientX,e.clientY)||renderer?.screenToWorld?.(e.clientX,e.clientY);}catch{return null;}return p&&Number.isFinite(p.x)&&Number.isFinite(p.y??p.z)?{x:p.x,y:p.y??p.z}:null;};
 const pending=()=>{try{return getModel()?.snapshot?.()?.pending;}catch{return null;}};
 const changed=type=>{try{onChanged({type,object:session?.object,progress:session?.progress||0});}catch{}};
 function targetAt(e){
  const world=getWorld(),renderer=getRenderer(),model=getModel();if(!world||world.state.mode!=='field'||!renderer||!model)return null;
  const p=point(e),box=canvas.getBoundingClientRect();let objects=[];try{objects=model.objects?.()||[];}catch{return null;}
  return objects.map(object=>{const at=center(object),projected=renderer.worldToScreen?.(at.x,at.y,.75),screenDistance=projected&&projected.visible!==false?Math.hypot(e.clientX-box.left-projected.x,e.clientY-box.top-projected.y):Infinity,worldDistance=p?Math.hypot(p.x-at.x,p.y-at.y):Infinity,distance=Math.hypot(at.x-world.state.x,at.y-world.state.y);return {object,at,screenDistance,worldDistance,distance};}).filter(row=>row.distance<2.8&&(row.screenDistance<(e.pointerType==='touch'?48:34)||row.worldDistance<.68)).sort((a,b)=>a.screenDistance-b.screenDistance)[0]||null;
 }
 function releaseCapture(id){try{if(canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);}catch{}}
 function finish(commit=false,reason='cancelled'){
  const previous=session;if(!previous)return;session=null;cancelAnimationFrame(frame);frame=0;suppressUntil=Date.now()+650;
  const model=getModel();let committed=false;try{if(commit){model?.setProgress?.(1,{point:previous.point});committed=model?.completeAction?.()!==false;}else model?.cancelAction?.(reason);}catch(error){console.error(error);try{model?.cancelAction?.('interrupted');}catch{}}
  releaseCapture(previous.id);changed(committed?'complete':'cancel');
 }
 function cancel(reason='interrupted'){if(session)finish(false,reason);}
 function applyProgress(e){
  const s=session;if(!s)return;
  const p=point(e);if(p)s.point=p;
  if(s.kind==='cable'){
   const from=s.from,to=s.to,length=Math.max(.1,Math.hypot(to.x-from.x,to.y-from.y));
   const progress=p?clamp(((p.x-from.x)*(to.x-from.x)+(p.y-from.y)*(to.y-from.y))/(length*length)):0;
   s.progress=progress;s.atSocket=!!p&&Math.hypot(p.x-to.x,p.y-to.y)<.62;
  }else if(s.kind==='lever'||s.kind==='coil'){
   const lift=clamp((s.startClient.y-e.clientY)/(s.kind==='lever'?76:56)),worldLift=p?clamp(Math.hypot(p.x-s.startWorld.x,p.y-s.startWorld.y)/1.15):0;
   s.progress=Math.max(s.progress,lift,worldLift);
  }
  try{getModel()?.setProgress?.(s.progress,{point:s.point});}catch{cancel('interrupted');return;}
  changed('progress');
 }
 function tick(now){
  if(!session||destroyed)return;const s=session,dt=clamp((now-lastTime)/1000,0,.05);lastTime=now;
  if(!pending()||getWorld()?.state?.mode!=='field'||typeof document!=='undefined'&&document.hidden){cancel('interrupted');return;}
  if(s.kind!=='cable'){
   s.held+=dt;const duration=Math.max(.45,finite(s.object.duration,1.2));s.progress=Math.max(s.progress,clamp(s.held/duration));
   try{getModel()?.setProgress?.(s.progress,{point:s.point});}catch{cancel('interrupted');return;}
   changed('progress');
   if(s.progress>=.999){finish(true);return;}
  }
  frame=requestAnimationFrame(tick);
 }
 function down(e){
  if(destroyed||e.button!=null&&e.button!==0)return;contacts.add(e.pointerId);
  if(session&&e.pointerId!==session.id){quarantined.add(session.id);quarantined.add(e.pointerId);cancel('gesture');swallow(e);return;}
  if(quarantined.size){quarantined.add(e.pointerId);swallow(e);return;}
  if(contacts.size>1)return;
  const target=targetAt(e);if(!target)return;
  if(onBeforeAction(target.object)===false)return;
  const model=getModel(),kind=kindFor(target.object),start=point(e)||target.at,from=target.object.from||target.object.anchor||target.at,to=target.object.to||target.object.socket||{x:from.x+1.8,y:from.y};
  let result;try{result=model?.beginAction?.(target.object,{manual:true,hold:false});}catch{return;}
  if(result===false||!pending())return;
  swallow(e);suppressUntil=Date.now()+650;
  session={id:e.pointerId,object:target.object,kind,from,to,point:start,startWorld:start,startClient:{x:e.clientX,y:e.clientY},progress:0,held:0,atSocket:false};
  try{canvas.setPointerCapture(e.pointerId);}catch{}
  try{model.setProgress?.(0,{point:start});}catch{}
  lastTime=performance.now();frame=requestAnimationFrame(tick);changed('begin');
 }
 function move(e){if(session?.id===e.pointerId){swallow(e);applyProgress(e);}else if(quarantined.has(e.pointerId))swallow(e);}
 function up(e){
  contacts.delete(e.pointerId);
  if(quarantined.has(e.pointerId)){quarantined.delete(e.pointerId);swallow(e);return;}
  if(session?.id!==e.pointerId)return;swallow(e);applyProgress(e);if(!session)return;
  const valid=session.kind==='cable'?session.atSocket&&session.progress>=.98:session.progress>=.98;finish(valid,valid?'complete':'released');
 }
 function pointerCancel(e){contacts.delete(e.pointerId);quarantined.delete(e.pointerId);if(session?.id===e.pointerId){swallow(e);cancel('interrupted');}}
 function lost(e){if(session?.id===e.pointerId)cancel('interrupted');}
 function click(e){if(Date.now()<suppressUntil)swallow(e);}
 function blur(){cancel('interrupted');contacts.clear();quarantined.clear();}
 function outsideUp(e){contacts.delete(e.pointerId);if(quarantined.has(e.pointerId))quarantined.delete(e.pointerId);if(session?.id===e.pointerId)cancel('released');}
 function key(e){if(session&&e.code==='Escape')cancel('interrupted');}
 const options={capture:true,passive:false};
 canvas.addEventListener('pointerdown',down,options);canvas.addEventListener('pointermove',move,options);canvas.addEventListener('pointerup',up,options);canvas.addEventListener('pointercancel',pointerCancel,options);canvas.addEventListener('lostpointercapture',lost,options);canvas.addEventListener('click',click,true);
 globalThis.window?.addEventListener('blur',blur);globalThis.window?.addEventListener('pagehide',blur);globalThis.window?.addEventListener('pointerup',outsideUp);globalThis.window?.addEventListener('pointercancel',outsideUp);globalThis.window?.addEventListener('keydown',key,true);
 return {get active(){return !!session;},snapshot(){return session?{kind:session.kind,progress:session.progress,from:clone(session.from),to:clone(session.to),point:clone(session.point)}:null;},cancel,destroy(){destroyed=true;blur();canvas.removeEventListener('pointerdown',down,options);canvas.removeEventListener('pointermove',move,options);canvas.removeEventListener('pointerup',up,options);canvas.removeEventListener('pointercancel',pointerCancel,options);canvas.removeEventListener('lostpointercapture',lost,options);canvas.removeEventListener('click',click,true);globalThis.window?.removeEventListener('blur',blur);globalThis.window?.removeEventListener('pagehide',blur);globalThis.window?.removeEventListener('pointerup',outsideUp);globalThis.window?.removeEventListener('pointercancel',outsideUp);globalThis.window?.removeEventListener('keydown',key,true);}};
}
