/* Ash & Aether v2 deterministic spatial sound model. All gameplay effects
 * are plain data and require a host game to apply them authoritatively. */
import {noiseConsequences,hearingModel} from './acoustic-world.js?v=5.21.0';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const cross=(a,b)=>a.x*b.z-a.z*b.x;
const sub=(a,b)=>({x:a.x-b.x,z:a.z-b.z});
export function segmentHitsWall(a,b,w){
  if(!w || !w.from || !w.to)return false;
  const p=a,r=sub(b,a),q=w.from,s=sub(w.to,w.from);
  const d=cross(r,s);if(Math.abs(d)<1e-9)return false;
  const t=cross(sub(q,p),s)/d,u=cross(sub(q,p),r)/d;
  return t>1e-6&&t<1-1e-6&&u>=0&&u<=1;
}
export function occlusionBetween(from,to,walls=[]){
  return clamp(walls.reduce((sum,w)=>sum+(segmentHitsWall(from,to,w)?clamp(w.absorption??.6):0),0));
}
const FLOOR={wet_moss:.24,short_grass:.3,tall_grass:.38,wet_clay:.48,gravel:.92,metal_grating:1,wood_hollow:.94,wood_planks:.65,shallow_water:1.0,limestone:.77,dry_clay:.43,ash:.32,snow:.22,sand:.23,polished_stone:.80};
export function emitFootstep({position,surface='short_grass',speed=1,mode='walk',weather='clear',walls=[],enemies=[]}={}){
  if(!position)throw new Error('Footstep needs a real player position');
  const footfall=clamp((FLOOR[surface]??.5)*(.25+Math.min(2,speed)*.38)*(mode==='sneak'?.31:mode==='sprint'?1.4:1)*(weather==='storm'?.72:1),0,1.8);
  return enemies.map(e=>{
    const d=dist(position,e.position),block=occlusionBetween(position,e.position,walls);
    const intensity=footfall*hearingModel({distance:d,range:e.range??14,occlusion:block,wind:weather==='storm'?.7:0});
    const delta=clamp(intensity*clamp(e.hearing??.7)*.48);
    return {enemyId:e.id,intensity,alertDelta:delta,heard:delta>=(e.threshold??.055),bearing:Math.atan2(position.x-e.position.x,position.z-e.position.z),source:{...position},occlusion:block};
  });
}
// A creature's suspicion is not instant teleporting knowledge; it must investigate a position.
export class HearingAI {
  constructor({id,position,threshold=.055,hearing=.8,range=14,alertness=0}={}){
    this.id=id;this.position={...position};this.threshold=threshold;this.hearing=hearing;this.range=range;
    this.alertness=alertness;this.mode='idle';this.target=null;this.lastEvent=null;
  }
  hear(noise){
    if(noise.enemyId!==this.id||!noise.heard)return this.snapshot();
    this.alertness=clamp(this.alertness+noise.alertDelta);
    this.lastEvent='noise';this.target={...noise.source};
    this.mode=this.alertness>=.75?'alert':this.alertness>=.30?'investigating':'suspicious';
    return this.snapshot();
  }
  tick(seconds){
    const dt=clamp(seconds,0,60);
    this.alertness=clamp(this.alertness-dt*(this.mode==='alert'?.015:.035));
    this.mode=this.alertness>=.75?'alert':this.alertness>=.30?'investigating':this.alertness>.06?'suspicious':'idle';
    if(this.mode==='idle')this.target=null;
    return this.snapshot();
  }
  snapshot(){return {id:this.id,mode:this.mode,alertness:this.alertness,target:this.target};}
}
// A boss/creature's material shield frequency can be inferred from sound
// and used to gate a *real* combat effect. Does not grant damage by itself.
export const MATERIAL_RESONANCE={clay:196,crystal:523.25,bronze:392,stone:146.83,water:293.66,wood:220,ash:329.63};
export function materialShield({material,attackFrequency=0,precision=.15,wetness=0,fractures=0}={}){
  const f=MATERIAL_RESONANCE[material];
  if(!f)return {known:false,defenseMultiplier:1.0,vulnerable:false};
  const octaveRatio=Math.abs(Math.log2(Math.max(1,attackFrequency)/f));
  const nearest=Math.abs(octaveRatio-Math.round(octaveRatio));
  const matched=nearest<=clamp(precision,.01,.45);
  const softened=material==='clay'?clamp(wetness)*.28:0;
  const defenseMultiplier=clamp((matched?.53:1.38)-softened-clamp(fractures)*.35,.25,1.6);
  return {known:true,defenseMultiplier,vulnerable:matched,frequency:f,resonanceError:nearest};
}
// Player learns an acoustic landmark by scanning it from 2 separated positions,
// not by a UI hint fabricating an object. Optional measurement error is bounded.
export function triangulateScans(scans=[]){
  if(scans.length<2)return {solved:false,reason:'need_two_vantage_points'};
  // Multiple scans are allowed. The best separated, nonparallel pair is used;
  // an early poor scan must never permanently poison the investigation.
  let best=null,quality=-Infinity,malformed=false;
  for(let i=0;i<scans.length;i++)for(let j=i+1;j<scans.length;j++){
    const p=scans[i],q=scans[j];
    if(!p.position||!q.position||!Number.isFinite(p.bearing)||!Number.isFinite(q.bearing)){malformed=true;continue;}
    const a={x:Math.sin(p.bearing),z:Math.cos(p.bearing)},b={x:Math.sin(q.bearing),z:Math.cos(q.bearing)};
    const denom=cross(a,b);if(Math.abs(denom)<.04)continue;
    const t=cross(sub(q.position,p.position),b)/denom;
    const u=cross(sub(q.position,p.position),a)/denom;
    if(t<0||u<0)continue;
    const score=Math.abs(denom)*Math.min(1,dist(p.position,q.position)/3);
    if(score>quality){quality=score;best={solved:true,position:{x:p.position.x+t*a.x,z:p.position.z+t*a.z},angleQuality:Math.abs(denom)};}
  }
  return best||{solved:false,reason:malformed?'bad_scans':'parallel_or_backward_bearings'};
}
export class ResonanceSurvey {
  constructor(){this.samples=new Map();this.discovered=new Set();}
  scan({player,objects=[],walls=[],minStrength=.14}={}){
    const heard=[];
    for(const o of objects){
      if(!o.id||!o.position||!o.audioSignal||this.discovered.has(o.id))continue;
      const d=dist(player,o.position);
      const occlusion=occlusionBetween(player,o.position,walls);
      const strength=hearingModel({distance:d,range:o.range??14,occlusion});
      if(strength<minStrength)continue;
      const bearing=Math.atan2(o.position.x-player.x,o.position.z-player.z);
      const s={sourceId:o.id,signal:o.audioSignal,bearing,strength,distance:d,occlusion,at:{...player}};
      heard.push(s);
      if(!this.samples.has(o.id))this.samples.set(o.id,[]);
      const history=this.samples.get(o.id);
      if(!history.some(x=>dist(x.position,player)<2))history.push({position:{...player},bearing});
    }
    return heard.sort((a,b)=>b.strength-a.strength);
  }
  resolve(sourceId,worldObjects=[],radius=1.8){
    const target=worldObjects.find(o=>o.id===sourceId && o.audioSignal && o.position);
    if(!target)return {resolved:false,reason:'not_authored'};
    if(this.discovered.has(sourceId))return {resolved:false,reason:'already_discovered'};
    const solution=triangulateScans(this.samples.get(sourceId)||[]);
    if(!solution.solved)return {resolved:false,...solution};
    const error=dist(solution.position,target.position);
    if(error>radius)return {resolved:false,reason:'insufficient_accuracy',error};
    this.discovered.add(sourceId);
    return {resolved:true,sourceId,signal:target.audioSignal,position:{...target.position},error};
  }
  serialize(){return {discovered:[...this.discovered],samples:[...this.samples]};}
  restore(obj={}){this.discovered=new Set(obj.discovered||[]);this.samples=new Map(obj.samples||[]);}
}
