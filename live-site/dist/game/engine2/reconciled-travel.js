import {createActivityPlacer} from './activity-sites.js?v=5.38';
import {isInteriorScene} from './scene-identity.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const clone=v=>JSON.parse(JSON.stringify(v));
const key=p=>p.join(',');
const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
export function trailState(state){
 state.trailLife??={version:1,bonded:false,mounted:false,care:0,records:{},rewards:[],relay:null};
 return state.trailLife;
}
export function validateTrailLife(state){
 const t=state?.trailLife;if(t===undefined)return true;
 if(!t||t.version!==1||typeof t.bonded!=='boolean'||typeof t.mounted!=='boolean'||t.mounted&&!t.bonded||!Number.isInteger(t.care)||t.care<0||t.care>100||!Array.isArray(t.rewards)||t.rewards.length>512||new Set(t.rewards).size!==t.rewards.length||t.rewards.some(x=>typeof x!=='string'||x.length>100)||!t.records||typeof t.records!=='object'||Array.isArray(t.records)||Object.keys(t.records).length>512)throw Error('The saved trail and relay record is invalid.');
 for(const r of Object.values(t.records))if(!r||!Number.isFinite(r.best)||r.best<=0||r.best>3600||!Number.isInteger(r.finishes)||r.finishes<1||r.finishes>100000||!['bronze','silver','gold'].includes(r.medal))throw Error('The saved Bellrun record is invalid.');
 const r=t.relay;if(r!==null&&(!r||!Number.isInteger(r.scene)||!Array.isArray(r.gates)||r.gates.length!==4||r.gates.some(p=>!point(p)||p.some(n=>n<0||n>1024))||!Number.isInteger(r.index)||r.index<0||r.index>3||!Number.isFinite(r.elapsed)||r.elapsed<0||r.elapsed>3600||!Number.isFinite(r.par)||r.par<=0||r.par>3600||!Number.isFinite(r.length)||r.length<=0||r.length>10000||typeof r.key!=='string'||r.key.length>100))throw Error('The saved Bellrun course is invalid.');
 return true;
}
function walkable(w,x,y){return w.scene.floor?.[y]?.[x]==='.'&&w.walkable(x+.5,y+.5);}
function flood(w,from){
 const start=from.map(Math.floor),queue=[start],seen=new Map([[key(start),0]]);
 if(!walkable(w,...start))return {queue:[],seen};
 for(let i=0;i<queue.length;i++){const p=queue[i],d=seen.get(key(p));for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const q=[p[0]+dx,p[1]+dy],k=key(q);if(!seen.has(k)&&walkable(w,...q)){seen.set(k,d+1);queue.push(q);}}}
 return {queue,seen};
}
function courseKey(w){return [w.state.scene,w.state.chronicle?.cycle||0,w.state.encore?.seed||0].join(':');}
export function buildBellrunCourse(w){
 if(isInteriorScene(w.scene))throw Error('Bellrun needs an outdoor trail. Follow a road or visit the stable.');
 const start=[Math.floor(w.state.x),Math.floor(w.state.y)],{queue}=flood(w,start);
 const obstacles=[...(w.scene.objects||[]),...(w.scene.doors||[])].filter(o=>o.xy&&o.type!=='life').map(o=>o.xy);
 const cells=queue.filter(p=>obstacles.every(o=>Math.hypot(o[0]-p[0],o[1]-p[1])>1.35));
 if(cells.length<24)throw Error('This small clearing needs more space for a safe Bellrun course. Try a larger outdoor trail.');
 const cx=cells.reduce((a,p)=>a+p[0],0)/cells.length,cy=cells.reduce((a,p)=>a+p[1],0)/cells.length;
 const used=[],gates=[];
 for(const angle of [-Math.PI*.75,-Math.PI*.25,Math.PI*.25]){
  const ranked=cells.filter(p=>!used.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<4)).map(p=>({p,score:Math.cos(angle)*(p[0]-cx)+Math.sin(angle)*(p[1]-cy)-.1*Math.hypot(p[0]-cx,p[1]-cy)})).sort((a,b)=>b.score-a.score);
  if(!ranked.length)throw Error('The trail is too narrow for a four-bell circuit.');
  used.push(ranked[0].p);gates.push(ranked[0].p.map(n=>n+.5));
 }
 gates.push(start.map(n=>n+.5));let length=0,from=start;
 for(const gate of gates){const next=gate.map(Math.floor),d=flood(w,from).seen.get(key(next));if(!Number.isFinite(d))throw Error('A relay gate cannot be reached.');length+=d;from=next;}
 if(length<12)throw Error('This trail is too short for a relay.');
 return {scene:w.state.scene,gates,index:0,elapsed:0,length,par:Math.max(12,length/4.2*1.5+6),key:courseKey(w)};
}
export function startBellrun(w){
 if(w.state.mode!=='field')throw Error('Finish the current encounter before beginning a relay.');
 const t=trailState(w.state);if(t.relay)throw Error('Finish or leave the current relay first.');
 t.mounted=false;t.relay=buildBellrunCourse(w);w.fieldPatrols?.calm(30);return t.relay;
}
export function stepBellrun(w,dt){
 const t=trailState(w.state),r=t.relay;if(!r||w.state.mode!=='field'||!Number.isFinite(dt)||dt<=0)return null;
 if(r.scene!==w.state.scene){t.relay=null;return {type:'cancelled',text:'Relay left. Your earlier records are kept.'};}
 r.elapsed=Math.min(3600,r.elapsed+clamp(dt,0,.1));
 const gate=r.gates[r.index];if(Math.hypot(w.state.x-gate[0],w.state.y-gate[1])>.88)return null;
 const index=r.index++;
 if(r.index<4)return {type:'gate',index,text:'Bell '+(index+1)+' answered · follow the next gold ring'};
 const elapsed=Math.max(.1,r.elapsed),medal=elapsed<=r.par?'gold':elapsed<=r.par*1.4?'silver':'bronze',old=t.records[r.key],first=!t.rewards.includes(r.key);
 t.records[r.key]={best:old?Math.min(old.best,elapsed):elapsed,finishes:(old?.finishes||0)+1,medal:old&&['gold','silver','bronze'].indexOf(old.medal)<['gold','silver','bronze'].indexOf(medal)?old.medal:medal};
 if(first){t.rewards.push(r.key);w.state.gold+=35+Math.min(24,w.state.chapter||1)*3;t.bonded=true;t.care=Math.min(100,t.care+25);}
 t.relay=null;return {type:'finish',elapsed,medal,first,text:`${medal.toUpperCase()} · ${elapsed.toFixed(1)} seconds. ${first?'Relay pay earned. Mossback trusts your stride; riding is unlocked.':'Your best time is kept. This circuit’s first-clear reward was already claimed.'}`};
}
export function toggleMossback(w){
 const t=trailState(w.state);if(t.mounted){t.mounted=false;return false;}
 if(!t.bonded)throw Error('Finish a Bellrun circuit or help the stable with fodder to befriend Mossback.');
 if(w.state.mode!=='field'||isInteriorScene(w.scene)||t.relay)throw Error('Ride between encounters on an open outdoor trail.');
 t.mounted=true;return true;
}
export function careForMossback(w){
 const t=trailState(w.state);if(w.state.gold<20)throw Error('Fodder costs 20 credits. A first Bellrun finish also earns Mossback’s trust.');
 if(t.bonded&&t.care>=100)throw Error('Mossback is well cared for.');
 w.state.gold-=20;t.bonded=true;t.care=Math.min(100,t.care+25);return true;
}
export function installTrailLife(w,{onPanel=()=>{},onEvent=()=>{}}={}){
 if(w.trailLife)return w.trailLife;
 const original={objects:w.objects.bind(w),interact:w.interact.bind(w),restore:w.restore.bind(w),loadScene:w.loadScene.bind(w)};
 let cachedScene=null,service=null;
 function stable(){
  if(isInteriorScene(w.scene)||w.scene.originId||w.state.chronicle?.phase==='past'){cachedScene=null;service=null;return null;}
  if(cachedScene===w.scene)return service;cachedScene=w.scene;service=null;
  const base=original.objects(),cells=flood(w,[w.state.x,w.state.y]).queue;
  const site=createActivityPlacer(w.scene,cells,base).pick('stable');
  if(site)service={type:'trail-stable',trailService:true,id:'stable:'+w.scene.location,xy:site,label:'Mossback stable · Bellrun',name:'Mossback'};
  return service;
 }
 w.objects=()=>{const list=original.objects(),o=stable();return o?[...list,o]:list;};
 w.interact=o=>{if(o?.trailService){if(w.state.mode==='field'&&o===stable())onPanel();return;}return original.interact(o);};
 w.restore=value=>{const s=typeof value==='string'?JSON.parse(value):value;validateTrailLife(s);const out=original.restore(value);trailState(w.state);cachedScene=null;return out;};
 w.loadScene=(...args)=>{const out=original.loadScene(...args),t=trailState(w.state);if(isInteriorScene(w.scene))t.mounted=false;if(t.relay&&t.relay.scene!==w.state.scene){t.relay=null;onEvent({type:'cancelled',text:'Relay left. Earlier records are kept.'});}return out;};
 const api={get racing(){return !!w.state.trailLife?.relay;},get mounted(){return !!w.state.trailLife?.mounted&&w.state.mode==='field'&&!isInteriorScene(w.scene);},get speedMultiplier(){return api.mounted?1.45:1;},get service(){return stable();},update(dt){const event=stepBellrun(w,dt);if(event)onEvent(event);},dismount(){if(w.state.trailLife)w.state.trailLife.mounted=false;},cancel(){const t=trailState(w.state);t.relay=null;},start(){const result=startBellrun(w);onEvent({type:'start',text:'Four bells. Follow each gold ring in order; hold Run on the open stretches.'});return result;}};
 trailState(w.state);w.trailLife=api;return api;
}
export function drawTrailObject(renderer,world,o){
 if(!o?.trailService)return false;const c=renderer.ctx,T=48,x=(o.xy[0]+.5)*T,y=(o.xy[1]+.5)*T;
 c.save();c.strokeStyle='#ad8252';c.lineWidth=5;c.beginPath();c.moveTo(x-48,y-5);c.lineTo(x-48,y-59);c.lineTo(x+45,y-59);c.lineTo(x+45,y-3);c.stroke();
 c.fillStyle='#284c42';c.beginPath();c.moveTo(x-59,y-60);c.quadraticCurveTo(x,y-88,x+57,y-60);c.lineTo(x+43,y-49);c.lineTo(x-44,y-49);c.closePath();c.fill();
 c.fillStyle='#d8bc75';c.beginPath();c.arc(x+36,y-35,7,0,Math.PI*2);c.fill();
 renderer.shadow(o.xy[0]+.5,o.xy[1]+.5,.6);renderer.atlas('bestiary',0,0,x,y+3,85,68);c.restore();return true;
}
export function drawMossbackRider(renderer,world,hero,pose,x,y){
 if(!world.trailLife?.mounted||hero.id!==world.state.party[0])return false;
 const c=renderer.ctx,T=48,bob=pose.moving?Math.sin(renderer.time*7)*2:Math.sin(renderer.time*1.6)*.7;
 c.save();renderer.atlas('bestiary',0,0,x*T,y*T+bob,T*2.25,T*1.72,pose.facing<0);
 c.strokeStyle='#b4b787';c.lineWidth=2;c.beginPath();c.moveTo(x*T-15,y*T-44+bob);c.quadraticCurveTo(x*T+10,y*T-58+bob,x*T+38*(pose.facing<0?-1:1),y*T-29+bob);c.stroke();
 renderer.atlas(hero.id===0&&!world.state.story?.armor?'starter':'crew',pose.back?5:0,hero.id===0&&!world.state.story?.armor?0:hero.id,x*T,y*T-41+bob,T*.9,T*1.2,pose.facing<0);c.restore();return true;
}
export function drawBellrun(renderer,world){
 const r=world.state.trailLife?.relay;if(!r||r.scene!==world.state.scene)return;
 const c=renderer.ctx,T=48;
 for(let i=0;i<r.gates.length;i++){const p=r.gates[i],active=i===r.index,done=i<r.index;c.save();c.translate(p[0]*T,p[1]*T);c.globalAlpha=done?.25:active?1:.35;c.strokeStyle=done?'#9de3be':active?'#ffe4a1':'#7aaebe';c.lineWidth=active?4:2;c.beginPath();c.ellipse(0,0,38,19,0,0,Math.PI*2);c.stroke();if(active){c.fillStyle='#ffe6a515';c.fill();c.beginPath();c.moveTo(-32,0);c.lineTo(-32,-47);c.arc(0,-47,32,Math.PI,0);c.lineTo(32,0);c.stroke();c.fillStyle='#ffe7ac';c.font='bold 17px system-ui';c.textAlign='center';c.fillText(String(i+1),0,-40);}c.restore();}
 const p=r.gates[r.index],dx=p[0]-world.state.x,dy=p[1]-world.state.y,d=Math.hypot(dx,dy);
 if(d>2){const x=(world.state.x+dx/d*1.5)*T,y=(world.state.y+dy/d*1.5)*T;c.save();c.translate(x,y);c.rotate(Math.atan2(dy,dx));c.fillStyle='#f9dc97';c.beginPath();c.moveTo(13,0);c.lineTo(-8,-7);c.lineTo(-4,0);c.lineTo(-8,7);c.closePath();c.fill();c.restore();}
}
export function mountTrailMenu({world,onClose=()=>{},onSave=()=>{},onStart=()=>{},onNotice=()=>{}}){
 const modal=document.createElement('dialog');modal.className='trail-menu';modal.setAttribute('aria-label','Mossback and Bellrun');
 let closed=false;const close=()=>{if(closed)return;closed=true;modal.close();modal.remove();onClose();};
 const button=(text,action)=>{const b=document.createElement('button');b.textContent=text;b.onclick=()=>{try{action();onSave();if(!closed)paint();}catch(e){status.textContent=e.message;}};return b;};
 let status;
 function paint(){const t=trailState(world.state),records=Object.values(t.records);modal.replaceChildren();const head=document.createElement('header'),small=document.createElement('small'),title=document.createElement('h2');small.textContent='THE ROADS REMEMBER YOUR STRIDE';title.textContent='Mossback & Bellrun';head.append(small,title,button('Return to the trail',close));modal.append(head);const info=document.createElement('p');info.textContent='The relay keeps the city’s warning bells alive. Run through four gates in order. Your first finish on each circuit earns credits and Mossback’s trust. Repeat runs improve your time without duplicating rewards.';modal.append(info);const summary=document.createElement('p');summary.className='trail-summary';summary.textContent=`${t.bonded?'Mossback bonded':'A new companion awaits'} · ${world.state.gold} credits · ${records.length} circuits completed`;modal.append(summary);status=document.createElement('p');status.setAttribute('role','status');const actions=document.createElement('div');actions.className='trail-actions';
 actions.append(button(t.relay?'Leave this relay':'Begin a Bellrun circuit',()=>{if(t.relay){world.trailLife.cancel();onNotice('Relay stopped. Your previous records are kept.');}else{world.trailLife.start();onStart();close();}}));
 actions.append(button(t.mounted?'Dismount Mossback':'Ride Mossback',()=>{const mounted=toggleMossback(world);onNotice(mounted?'Mossback carries you. Run to canter; buildings and encounters dismount safely.':'Back on your own feet.');close();}));
 actions.append(button('Share reeds & fodder · 20 credits',()=>{careForMossback(world);onNotice('Mossback leans into your hand. Riding is unlocked.');}));
 modal.append(actions,status);if(records.length){const list=document.createElement('ul');for(const [id,r]of Object.entries(t.records).slice(-8)){const li=document.createElement('li');li.textContent=`${world.scenes.get(Number(id.split(':')[0]))?.name||'Trail '+id.split(':')[0]} · ${r.medal} · best ${r.best.toFixed(1)}s · ${r.finishes} finishes`;list.append(li);}modal.append(list);}const hint=document.createElement('small');hint.textContent='Arrows / joystick move · hold Run for pace. Timers pause with menus, dialogue and combat. Riding never crosses walls or locked passages.';modal.append(hint);}
 modal.addEventListener('cancel',e=>{e.preventDefault();close();});for(const k of ['keydown','keyup'])modal.addEventListener(k,e=>e.stopPropagation());paint();document.body.append(modal);modal.showModal();return {close};
}
