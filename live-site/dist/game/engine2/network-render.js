import {drawAuthoredProp} from './authored-art.js?v=5.21.0';
import {networkSceneView,networkEvidence} from './answering-network.js?v=5.18.0';

const ink='#172c31',brass='#d2b980',answer='#9cd5be',water='#7abfdb',warm='#efbb70';
const point=(o,T)=>({x:(o.xy[0]+.5)*T,y:(o.xy[1]+.5)*T});
function plate(c,x,y,w,h){c.fillStyle='#343e3c';c.fillRect(x-w/2,y-h,w,h);c.strokeStyle=brass;c.lineWidth=1.2;c.strokeRect(x-w/2,y-h,w,h);}
function dot(c,x,y,color,r=2){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function gauge(c,x,y,settled,color){
 c.fillStyle=ink;c.strokeStyle=brass;c.lineWidth=1.3;c.beginPath();c.arc(x,y,8,0,Math.PI*2);c.fill();c.stroke();
 c.strokeStyle=color;c.beginPath();c.arc(x,y,6,-Math.PI*.78,-Math.PI*.20);c.stroke();
 const angle=settled?-Math.PI*.45:Math.PI*.78;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(angle)*5,y+Math.sin(angle)*5);c.stroke();
}

/** Existing painted fixtures give the works a place in the world; small meters
 * and contacts show what the player changed. Compatible with direct Canvas
 * graphics: no filters, pixel reads, buffers or newly synthesized artwork.
 */
export function drawNetworkObject(renderer,w,o,T=48){
 if(o?.type!=='network')return false;
 const c=renderer.ctx,view=networkSceneView(w),site=view.sites.find(s=>s.networkId===o.networkId);if(!site)return false;
 const {x,y}=point(site,T),height=T*(site.networkProp==='bell'?1.02:site.networkProp==='claybench'?.78:.72),width=T*1.18;
 c.save();
 if(!drawAuthoredProp(c,renderer.assets?.authoredProps,site.networkProp,x,y,width,height)){
  plate(c,x,y-3,T*.62,T*.42);c.fillStyle='#75664b';c.fillRect(x-T*.35,y-6,T*.70,6);
 }
 const cy=y-height*.62;
 if(site.networkId==='chapel-diagram'){
  plate(c,x,cy+8,31,24);const colors=[brass,'#b79c80','#a8d9cc',water];
  c.strokeStyle=site.networkStage==='chapel-inspected'?'#778982':answer;c.lineWidth=1;
  c.beginPath();c.moveTo(x-11,cy-6);c.lineTo(x+11,cy-6);c.lineTo(x+11,cy+3);c.lineTo(x-11,cy+3);c.stroke();
  for(let i=0;i<4;i++)dot(c,x-10+i*7,cy-6,colors[i],1.8);
  if(site.completed){c.beginPath();c.moveTo(x-6,cy);c.lineTo(x-10,cy+3);c.lineTo(x-6,cy+6);c.stroke();dot(c,x+6,cy+3,answer,2);}
  else{c.strokeStyle='#a2705c';c.lineWidth=3;c.beginPath();c.moveTo(x-1,cy);c.lineTo(x+3,cy+6);c.stroke();}
 }else if(site.networkId==='root-cradle'){
  c.strokeStyle=site.completed?'#b5c793':'#657568';c.lineWidth=2;
  for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(x,y-4);c.quadraticCurveTo(x+i*9,cy+10,x+i*12,cy-4);c.stroke();}
  dot(c,x,cy+3,site.completed?warm:'#7b735d',3);
 }else if(site.networkId==='heat-gauge'||site.networkId.startsWith('water-')&&site.networkId!=='water-bleed'){
  const heat=site.networkId==='heat-gauge';gauge(c,x,cy,heat?view.heatOn:site.completed,heat?warm:water);
  if(heat){dot(c,x-12,cy+13,view.collectorIndependent?'#687677':'#b77c69',2.5);dot(c,x+12,cy+13,view.heatOn?warm:'#69746b',2.5);}
 }else if(site.networkId==='relay-collar'){
  plate(c,x,cy+9,31,25);const heights=view.relayRegisters.length?[6,16,11]:[10,10,10];
  for(let i=0;i<3;i++){c.strokeStyle=view.relayRegisters.length?[water,brass,answer][i]:'#8a9790';c.lineWidth=2;c.beginPath();c.moveTo(x-9+i*9,cy+6);c.lineTo(x-9+i*9,cy+6-heights[i]);c.stroke();dot(c,x-9+i*9,cy+6-heights[i],c.strokeStyle,2);}
 }else if(site.networkId==='assembly-board'){
  plate(c,x,cy+7,34,28);const e=networkEvidence(w.state),lit=[e.chapelReturn,e.heatIndependent,e.waterReturn,e.distinctRelays];
  for(let i=0;i<4;i++){const px=x-12+i*8;c.strokeStyle=lit[i]?answer:'#657773';c.lineWidth=1;c.beginPath();c.moveTo(px,cy-12);c.lineTo(px,cy-3);c.lineTo(x,cy+3);c.stroke();dot(c,px,cy-12,lit[i]?answer:'#657773',2);}
  dot(c,x,cy+3,view.assemblyReady?warm:'#657773',3);
 }else{
  c.strokeStyle=site.completed?answer:brass;c.lineWidth=2.5;c.beginPath();c.moveTo(x,cy+6);c.lineTo(x+(site.completed?10:-10),cy-5);c.stroke();dot(c,x,cy+6,brass,2.5);
 }
 // A small grounded contact marks the work, leaving actor/quest labels to the
 // normal field-label pass. Completed machinery keeps its material color.
 if(site.completed){c.strokeStyle=answer+'99';c.lineWidth=1;c.beginPath();c.ellipse(x,y+1,T*.23,T*.07,0,0,Math.PI*2);c.stroke();}
 c.restore();return true;
}

/** Ground-level local pipe traces. Pulses only move on an opened circuit;
 * reduced motion leaves the same readable material/state change in place.
 */
export function drawNetworkConnections(c,w,T=48,time=0,{steady=false}={}){
 const view=networkSceneView(w),sites=view.sites;if(!sites.length)return;
 const byId=new Map(sites.map(s=>[s.networkId,s])),pairs=[];
 if(byId.has('root-cradle')){
  pairs.push(['root-cradle','heat-diverter',view.heatOn,warm],['heat-diverter','heat-gauge',view.heatOn,warm]);
 }else if(byId.has('water-bleed')){
  const opened=byId.get('water-bleed').completed;pairs.push(['water-west','water-bleed',opened,water],['water-bleed','water-east',opened,water]);
 }
 c.save();
 for(const [from,to,open,color] of pairs){
  const a=point(byId.get(from),T),b=point(byId.get(to),T);
  c.strokeStyle=open?color+'88':'#6e77635c';c.lineWidth=open?2.8:1.5;c.setLineDash(open?[]:[3,5]);
  c.beginPath();c.moveTo(a.x,a.y+2);c.lineTo(b.x,b.y+2);c.stroke();c.setLineDash([]);
  if(open&&!steady){const t=((Number.isFinite(time)?time:0)*.34)%1;dot(c,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t+2,color,2.4);}
 }
 c.restore();
}
