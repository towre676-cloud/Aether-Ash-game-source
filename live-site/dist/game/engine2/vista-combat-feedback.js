import {describeCombatEffect} from './reconciled-content/vista/vista-core.mjs?v=5.25.0';

/** Canvas adaptation of the recovered Vista presentation core. The host owns
 * combat, coordinates and the frame clock. These short-lived records never
 * retain actors, mutate a world, infer a hit from an input, or create a timer.
 */
const LIMITS={impacts:12,results:6,history:192,samplesPerFrame:4};
const DENSITY={low:2,medium:3,high:5,ultra:6};
const RESULTS={
 'armor-break':{label:'Armor broken',color:'#f3cf92',life:1.05},
 guard:{label:'Guard held',color:'#b8e6e9',life:.95},
 evade:{label:'Evaded',color:'#c8e3be',life:.95}
};
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=1e6&&Math.abs(p.y)<=1e6;
const unit=n=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
const idOf=e=>{
 const id=e.eventId??e.id;
 return typeof id==='string'&&id.length>0&&id.length<=192?'s:'+id:
  typeof id==='number'&&Number.isFinite(id)?'n:'+id:null;
};
const rgb=tint=>'rgb('+tint.map(n=>Math.round(unit(n)*255)).join(',')+')';
function sampleSurface(world,x,y){
 // Only the active host's read API is consulted. Copy bounded scalar values;
 // no surface object, world reference or physics formula enters the effect.
 try{
  const s=world?.reconciledGround?.surface?.(x,y);
  return {wetness:unit(s?.wetness),conductivity:unit(s?.conduction??s?.conductivity),cover:unit(s?.cover)};
 }catch{return {wetness:0,conductivity:0,cover:0};}
}
function eventRecord(e){
 if(!e||typeof e!=='object')return null;
 if(e.type==='damage'){
  if(e.physical!==true||e.dot||!Number.isFinite(e.amount)||e.amount<=0||!point(e.actor)||!point(e.source))return null;
  return {kind:'impact',actor:e.actor,source:e.source,life:.28};
 }
 if(e.type!=='tactical-result'||!Object.hasOwn(RESULTS,e.kind))return null;
 const actor=e.kind==='armor-break'?(e.target??e.actor):e.actor;
 if(!point(actor)||Number.isFinite(actor.hp)&&actor.hp<=0)return null;
 if(e.kind==='guard'&&(!Number.isFinite(e.amount)||e.amount<=0))return null;
 if(e.kind==='armor-break'&&Number.isFinite(actor.armor)&&actor.armor>0)return null;
 return {kind:e.kind,actor,source:e.source,...RESULTS[e.kind]};
}
function resultIcon(c,kind,x,y,color){
 c.strokeStyle=color;c.lineWidth=1.4;c.lineCap='round';c.lineJoin='round';c.beginPath();
 if(kind==='guard'){
  c.moveTo(x,y-5);c.lineTo(x+4,y-3);c.lineTo(x+3,y+2);c.lineTo(x,y+5);c.lineTo(x-3,y+2);c.lineTo(x-4,y-3);c.closePath();
 }else if(kind==='evade'){
  for(const k of [-3,3]){c.moveTo(x+k-2,y-4);c.lineTo(x+k+1,y);c.lineTo(x+k-2,y+4);}
 }else{
  c.moveTo(x-1,y-5);c.lineTo(x-5,y-3);c.lineTo(x-3,y+3);c.lineTo(x-1,y+5);
  c.moveTo(x+2,y-5);c.lineTo(x+5,y-3);c.lineTo(x+4,y+3);c.lineTo(x+2,y+5);
 }
 c.stroke();
}

export class VistaCombatFeedback{
 constructor(){this.options={quality:'high',steady:false,compatibility:false};this.reset();}
 get activeCount(){return this.effects.length;}
 reset(){this.effects=[];this.seenObjects=new WeakSet();this.seenIds=new Set();this.idOrder=[];this.serial=0;this.sampleBudget=LIMITS.samplesPerFrame;}
 /** Accept only a confirmed host event; true means it produced/coalesced a cue. */
 event(e,world){
  const record=eventRecord(e);if(!record||this.seenObjects.has(e))return false;
  const id=idOf(e);if(id!==null&&this.seenIds.has(id))return false;
  this.seenObjects.add(e);
  if(id!==null){this.seenIds.add(id);this.idOrder.push(id);if(this.idOrder.length>LIMITS.history)this.seenIds.delete(this.idOrder.shift());}
  const {actor,source,kind}=record,x=actor.x,y=actor.y;
  const dx=point(source)?x-source.x:1,dy=point(source)?y-source.y:0,length=Math.hypot(dx,dy)||1;
  const actorId=typeof actor.id==='number'||typeof actor.id==='string'?actor.id:null;
  let sample={wetness:0,conductivity:0,cover:0};
  if(kind==='impact'&&this.sampleBudget>0){this.sampleBudget--;sample=sampleSurface(world,x,y);}
  const descriptor=describeCombatEffect({eventId:'vista:'+ ++this.serial,type:kind==='guard'?'block':kind==='evade'?'dodge':'hit',
   element:sample.wetness>.35?'water':'earth',x,z:y,intensity:.45},sample);
  const cue={kind,x,y,dx:dx/length,dy:dy/length,actorId,age:0,life:record.life,label:record.label,color:record.color,
   surfaceColor:rgb(descriptor.tint),surfaceScatter:descriptor.surfaceScatter,wet:sample.wetness>.35};
  // Rapid successive results for one actor refresh one compact cue. Ordinary
  // hit sparks have their own budget and cannot evict the essential labels.
  const prior=kind!=='impact'&&this.effects.find(f=>f.kind===kind&&(actorId!==null?f.actorId===actorId:f.actorId===null&&Math.hypot(f.x-x,f.y-y)<.25));
  if(prior){Object.assign(prior,cue);return true;}
  const essential=kind!=='impact',limit=essential?LIMITS.results:LIMITS.impacts;
  const group=this.effects.filter(f=>(f.kind!=='impact')===essential);
  if(group.length>=limit)this.effects.splice(this.effects.indexOf(group[0]),1);
  this.effects.push(cue);return true;
 }
 /** Advance visual age only. Quality changes drawing density, never results. */
 tick(dt,{quality='high',steady=false,compatibility=false}={}){
  this.options={quality:Object.hasOwn(DENSITY,quality)?quality:'high',steady:!!steady,compatibility:!!compatibility};
  const elapsed=Number.isFinite(dt)?Math.max(0,Math.min(2,dt)):0;
  for(const f of this.effects)f.age+=elapsed;
  this.effects=this.effects.filter(f=>f.age<f.life);this.sampleBudget=LIMITS.samplesPerFrame;
 }
 drawGround(c,tile=48){
  if(!c||!Number.isFinite(tile)||tile<=0||this.options.steady||this.options.compatibility)return;
  const density=DENSITY[this.options.quality];
  c.save();c.lineCap='round';c.lineWidth=1;
  for(const f of this.effects){
   if(f.kind!=='impact')continue;
   const p=f.age/f.life,count=Math.min(3,density),spread=5+p*(f.wet?12:8);
   c.strokeStyle=f.wet?f.surfaceColor:'#c9b394';c.globalAlpha=(1-p)*(.22+f.surfaceScatter*.15);
   // A few surface flecks, rather than an area-of-effect ring or new terrain.
   for(let i=0;i<count;i++){
    const side=i-(count-1)/2,x=f.x*tile-f.dy*side*spread+f.dx*spread*.3,y=f.y*tile+f.dx*side*spread*.35+f.dy*spread*.2;
    c.beginPath();c.moveTo(x-1.5,y);c.lineTo(x+1.5,y+(f.wet?0:-2-p*2));c.stroke();
   }
  }
  c.restore();
 }
 drawForeground(c,tile=48){
  if(!c||!Number.isFinite(tile)||tile<=0)return;
  const quiet=this.options.steady||this.options.compatibility,density=DENSITY[this.options.quality];
  c.save();c.lineCap='round';c.lineJoin='round';
  const labels=[];
  for(const f of this.effects){
   const p=f.age/f.life;
   if(f.kind==='impact'){
    if(quiet)continue;
    c.save();c.translate(f.x*tile,f.y*tile-25);c.rotate(Math.atan2(f.dy,f.dx));
    c.strokeStyle='#ffe2b4';c.lineWidth=1.25;c.globalAlpha=(1-p)*.8;
    for(let i=0;i<density;i++){
     const a=(i-(density-1)/2)*.28,r=5+p*(13+i%2*3),end=r+2.5*(1-p);
     c.beginPath();c.moveTo(Math.cos(a)*r,Math.sin(a)*r*.8);c.lineTo(Math.cos(a)*end,Math.sin(a)*end*.8);c.stroke();
    }
    c.restore();continue;
   }
   const x=f.x*tile,near=labels.filter(v=>Math.abs(v.x-x)<105&&Math.abs(v.y-f.y*tile)<34).length;
   // Stable below-foot placement leaves faces, damage numbers and threat arcs
   // clear. Nearby result labels use separate rows without drifting animation.
   const y=f.y*tile+31+near*20;labels.push({x,y:f.y*tile});
   c.font='600 11px system-ui, sans-serif';c.textAlign='left';c.textBaseline='middle';
   const width=Math.ceil(c.measureText(f.label).width)+29,left=x-width/2;
   c.globalAlpha=Math.min(1,(f.life-f.age)/.2);c.fillStyle='#101c29';c.fillRect(left,y-10,width,19);
   c.strokeStyle=f.color;c.lineWidth=.8;c.strokeRect(left+.5,y-9.5,width-1,18);
   resultIcon(c,f.kind,left+10,y-.5,f.color);c.fillStyle='#f5f0df';c.fillText(f.label,left+21,y);
  }
  c.restore();
 }
}
