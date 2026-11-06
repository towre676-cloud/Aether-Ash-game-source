import {drawAuthoredProp} from './authored-art.js?v=5.21.0';
import {investigationView} from './exploration.js?v=5.38';
import {originPayoffView} from './origins.js?v=5.38';
const T=48;
const ready=renderer=>!!renderer.assets?.authoredProps?.width;
function prop(renderer,id,x,y,w,h){return drawAuthoredProp(renderer.ctx,renderer.assets.authoredProps,id,x,y,w,h);}
function ring(c,x,y,color,r=20){c.save();c.strokeStyle=color;c.lineWidth=1.5;c.beginPath();c.ellipse(x,y,r,r*.3,0,0,Math.PI*2);c.stroke();c.restore();}

/** The painted replacement occupies the same furniture footprint and approach. */
export function drawAuthoredFurniture(renderer,o,state,near){
 if(!ready(renderer))return false;const scene=renderer.currentScene,b=o.footprint,chapel=scene.household?.kind==='chapel';let id=null,height=100,width=(b.w+.1)*T;
 if(chapel&&(o.visual==='hydrophone'||o.furniture===23)){id='bell';height=156;}
 else if(chapel&&o.furniture===14){id='bench';width=68;height=72;}
 else if(chapel&&o.furniture===18){id='window';width=68;height=112;}
 else if(o.furniture===4&&['home','chapel','quarters','inn'].includes(scene.household?.kind)){id='hearth';height=108;}
 else if(o.furniture===8&&/workshop|carpenter|pottery/.test(scene.key)){id='claybench';height=100;}
 if(!id)return false;const x=(b.x+b.w/2)*T,y=(b.y+b.h)*T;renderer.shadow(x/T,y/T,Math.max(.3,b.w*.3));
 const actors=renderer.followers||[],covered=actors.some(a=>a.y*T<y&&a.y*T>y-height&&Math.abs(a.x*T-x)<width*.45);renderer.ctx.save();renderer.ctx.globalAlpha*=covered?.44:1;prop(renderer,id,x,y,width,height);renderer.ctx.restore();
 if(near){ring(renderer.ctx,x,y,'#d9d5ab88',Math.max(20,width*.4));renderer.label((chapel&&o.furniture===14?'Carved chapel seat':o.label)+(state.household?.examined?.includes(o.householdId)?' · ✓':''),x,y-height-8,true);}return true;
}

/** Devices become working objects; the live state is visible before their menus open. */
export function drawAuthoredWorldObject(renderer,scene,o,x,y,state){
 if(!ready(renderer))return false;const c=renderer.ctx,px=x*T,py=y*T;
 if(o.type==='portal'&&scene.household?.kind==='chapel'){
  c.save();const covered=(renderer.followers||[]).some(a=>a.y<y&&a.y>y-2.6&&Math.abs(a.x-x)<.9);c.globalAlpha*=covered?.4:.95;prop(renderer,'arch',px,py+12,108,134);c.restore();ring(c,px,py+7,'#bfd9c899',18);return true;
 }
 if(o.bellArc&&['inlet','sump','diverter'].includes(o.bellArc)){
  prop(renderer,'diverter',px,py+3,88,91);const a=state.bellWitness||{},works=a.works||{},worked=o.bellArc==='inlet'?works.inletClosed:o.bellArc==='sump'?works.drainClear:works.returnFreed;
  ring(c,px,py+4,worked?'#a5d1ac99':'#aa967c66',24);
  if(worked){c.save();c.fillStyle='#ded19a';c.beginPath();c.arc(px+20,py-43,3,0,7);c.fill();c.restore();}return true;
 }
 if(o.investigationRole){
  const view=investigationView(state,scene.chapter);if(!view)return false;const id=view.kind==='answer'?'bell':view.kind==='leak'?'diverter':view.kind==='custody'?'reedbank':null;if(!id)return false;
  prop(renderer,id,px,py+3,id==='bell'?78:82,id==='bell'?106:82);
  if(view.kind==='answer'&&view.phrase){c.save();for(let i=0;i<4;i++){c.fillStyle=i<view.phrase?'#dfc681':'#293c3e';c.beginPath();c.arc(px-15+i*10,py+12,2.5,0,7);c.fill();}c.restore();}
  if(view.kind==='leak'&&view.drained||view.kind==='custody'&&view.custody)ring(c,px,py+5,'#b5d9ab99',24);return true;
 }
 return false;
}

/** Floor consequences stay beneath actors and never change collision by drawing. */
export function paintAuthoredConsequences(renderer,world,active){
 if(!ready(renderer))return false;const c=renderer.ctx,s=world.state,a=s.bellWitness,scene=world.scene;
 if(a&&[292,125].includes(s.scene)&&s.chapter>=4&&s.chronicle?.phase!=='past'){
  c.save();for(const o of active.filter(o=>o.bellArc&&o.type==='switch')){
   const x=(o.xy[0]+.5)*T,y=(o.xy[1]+.5)*T;
   if(o.bellArc==='soot'){c.strokeStyle=s.bosses.includes(4)?'#5e6b6240':'#30313377';c.lineWidth=3;c.lineCap='round';for(let i=0;i<6;i++){c.beginPath();c.moveTo(x-15+i*5,y+4);c.quadraticCurveTo(x-25+i*6,y-8,x-12+i*5,y-24-i%3*4);c.stroke();}}
   if(o.bellArc==='plate'){c.fillStyle='#87958a';c.strokeStyle='#c2b382';c.lineWidth=1.5;c.beginPath();c.roundRect(x-22,y-12,44,22,3);c.fill();c.stroke();for(let i=0;i<3;i++){c.strokeStyle='#394f4d';c.beginPath();c.moveTo(x-12,y-6+i*6);c.lineTo(x+12,y-6+i*6);c.stroke();}}
   if(o.bellArc==='sump'&&!a.works?.drainClear){const g=c.createRadialGradient(x,y+9,2,x,y+9,53);g.addColorStop(0,'#2f707965');g.addColorStop(1,'#2f707900');c.fillStyle=g;c.fillRect(x-55,y-45,110,110);}
   if(a.works?.tested&&['inlet','diverter'].includes(o.bellArc)){const steady=renderer.comfort?.steadyLighting,phase=steady?.5:(Math.sin(renderer.time*1.5)*.5+.5);ring(c,x,y+4,'#b0d8bc'+Math.round(50+phase*50).toString(16).padStart(2,'0'),28+phase*5);}
   if(a.aftercare==='shelter-open'&&o.bellArc==='sump'){const g=c.createRadialGradient(x,y,8,x,y,100);g.addColorStop(0,'#f4c37b29');g.addColorStop(1,'#f4c37b00');c.fillStyle=g;c.fillRect(x-100,y-100,200,200);}
  }c.restore();
 }
 for(const payoff of originPayoffView(s,scene).filter(p=>p.serviceOpen)){for(const o of active.filter(o=>o.legacyId===payoff.originId&&o.xy)){const x=(o.xy[0]+.5)*T,y=(o.xy[1]+.5)*T;ring(c,x,y+3,payoff.mode==='care'?'#a5d6b977':'#e3bf7c77',28);}}
 return true;
}

/** Existing safe bank sites receive the same carved stone and reed material. */
export function drawAuthoredBoundary(renderer,site,plan){
 if(!ready(renderer)||site.landmark||site.indoor||plan.material!=='water'||!['reeds','stone'].includes(site.kind))return false;
 return prop(renderer,'reedbank',0,3,108,90);
}
