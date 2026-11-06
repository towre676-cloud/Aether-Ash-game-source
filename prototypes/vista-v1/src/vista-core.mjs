/**
 * Ash & Aether: Vista & Combat Presentation core.
 * All functions are deterministic / pure with respect to the authoritative game state.
 * Rendering quality never changes hit tests, shielding, item drops or encounter rolls.
 * MIT licensed original implementation, no Eternal Sword Pact assets.
 */
export const VISTA_VERSION = '1.0.0';
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
export {clamp};
export function smoothstep(a,b,x){ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); }
export function lerp(a,b,t){return a+(b-a)*t;}
export function damp(current,target,lambda,dt){ return lerp(current,target,1-Math.exp(-Math.max(0,lambda)*clamp(dt,0,0.12))); }
export function hashSeed(x,z,seed=1){
  let n=(Math.imul(Math.floor(x*71+seed),374761393)+Math.imul(Math.floor(z*79-seed),668265263))|0;
  n=Math.imul(n^(n>>>13),1274126177);n^=n>>>16;
  return (n>>>0)/4294967295;
}
export const QUALITY = Object.freeze({
  low:    {pixelRatio:1, shadowMap:512, shadowCascades:1, lights:1, maxDecorations:90,  particleBudget:34,  reflections:false,  bloom:false},
  medium: {pixelRatio:1.2, shadowMap:1024,shadowCascades:1, lights:2,maxDecorations:240, particleBudget:92, reflections:false,bloom:false},
  high:   {pixelRatio:1.5, shadowMap:2048,shadowCascades:2, lights:3,maxDecorations:540,particleBudget:200,reflections:true, bloom:true},
  ultra:  {pixelRatio:2, shadowMap:2048,shadowCascades:3, lights:4,maxDecorations:900,particleBudget:420,reflections:true, bloom:true}
});
const LEVELS=Object.keys(QUALITY);
export class QualityGovernor {
 constructor({initial='high',min='low',max='ultra',targetMs=33.3,reducedMotion=false}={}){
   if(!LEVELS.includes(initial)||!LEVELS.includes(min)||!LEVELS.includes(max)||LEVELS.indexOf(min)>LEVELS.indexOf(max)) throw new Error('Invalid quality tier');
   this.min=min;this.max=max;this.tier=initial;this.targetMs=targetMs;this.reducedMotion=reducedMotion;
   this.avgMs=targetMs;this.slowSeconds=0;this.fastSeconds=0;this.cooldown=0;
 }
 record(frameMs,dt){
   if(!Number.isFinite(frameMs)||frameMs<0||!Number.isFinite(dt)||dt<=0)return this.tier;
   dt=clamp(dt,0,0.12);this.cooldown=Math.max(0,this.cooldown-dt);
   this.avgMs=lerp(this.avgMs,frameMs,1-Math.exp(-dt/1.2));
   this.slowSeconds=this.avgMs>this.targetMs*1.18?this.slowSeconds+dt:0;
   this.fastSeconds=this.avgMs<this.targetMs*.69?this.fastSeconds+dt:0;
   const i=LEVELS.indexOf(this.tier),lo=LEVELS.indexOf(this.min),hi=LEVELS.indexOf(this.max);
   if(this.cooldown===0 && this.slowSeconds>2.5 && i>lo){this.tier=LEVELS[i-1];this.cooldown=6;this.slowSeconds=0;this.fastSeconds=0;}
   else if(this.cooldown===0 && this.fastSeconds>12 && i<hi){this.tier=LEVELS[i+1];this.cooldown=10;this.slowSeconds=0;this.fastSeconds=0;}
   return this.tier;
 }
 settings(){return {...QUALITY[this.tier], particleBudget:this.reducedMotion?0:QUALITY[this.tier].particleBudget};}
}

/** Declarative art guide. Locations are *intentional compositions* not random scatter.
 * The host must supply actual masks and coordinates; a missing classifier means skip.
 * A weighted design returns composition constraints, never replaces biome logic.
 */
export function composeLandmark({x,z,tag,regionAt,groundAt,obstacleAt,nearPathAt,waterAt}){
 if(!['vista','shrine','settlement','waterfall','forest-edge','boss-arena'].includes(tag)) return null;
 if(!regionAt||!groundAt||!obstacleAt||!nearPathAt||!waterAt) return null;
 const region=regionAt(x,z),ground=groundAt(x,z);
 if(!region?.outdoor||ground?.indoor||obstacleAt(x,z))return null;
 const path=clamp(nearPathAt(x,z),0,1),wet=clamp(waterAt(x,z),0,1);
 if(tag==='shrine'&&path<.3)return null;
 if(tag==='waterfall'&&wet<.6)return null;
 if(tag==='settlement'&&path<.45)return null;
 return {tag,x,z,worldHeight:ground.y,style:region.style||region.biome||'temperate',
   density: tag==='boss-arena'?.12:tag==='forest-edge'?.72:tag==='settlement'?.26:.38,
   sightlineRadius:tag==='vista'?16:tag==='boss-arena'?13:tag==='shrine'?8:4,
   silhouette:({vista:'sky-framed',shrine:'ascending',settlement:'layered-urban',waterfall:'vertical-cascade','forest-edge':'edge-trees','boss-arena':'circular'}[tag]),
   nearbyPath: path, water:wet};
}

/** Predict camera intent from read-only host observations; the existing camera remains authoritative. */
export class CinematicCameraDirector {
 constructor({reducedMotion=false}={}){this.reducedMotion=reducedMotion;this.zoom=1;this.pitch=.38;this.focusX=0;this.focusZ=0;this.shake=0;this.time=0;}
 update(dt,{hero,threat,landmark,aim,manualCamera=false}={}){
   dt=clamp(dt,0,0.12);this.time+=dt;
   if(!hero)return this.snapshot();
   const menace=clamp(threat?.proximity??0,0,1);
   const boss=!!threat?.boss;
   const showVista=!!landmark?.vista&&!boss&&!menace;
   const targetZoom=manualCamera?this.zoom:boss?0.76:menace>0.3?0.86:showVista?1.18:1;
   this.zoom=damp(this.zoom,targetZoom,this.reducedMotion?2.8:3.4,dt);
   this.pitch=damp(this.pitch,boss?.31:showVista?.47:.38,2.2,dt);
   const lead=this.reducedMotion?0:aim?.direction?1.25:.6;
   this.focusX=damp(this.focusX,hero.x+(aim?.direction?.x||0)*lead,4.8,dt);
   this.focusZ=damp(this.focusZ,hero.z+(aim?.direction?.z||0)*lead,4.8,dt);
   this.shake=damp(this.shake,0,12,dt);
   return this.snapshot();
 }
 impact(amount){if(!this.reducedMotion)this.shake=clamp(this.shake+Math.abs(amount),0,.22);}
 snapshot(){return {zoom:this.zoom,pitch:this.pitch,focus:{x:this.focusX,z:this.focusZ},shake:this.shake,version:VISTA_VERSION};}
}

/** Visual-only effect specifications from authoritative events. */
export function describeCombatEffect(event,worldSample={}){
 if(!event||!event.eventId||!event.type)return null;
 const wet=clamp(Number(worldSample.wetness)||0,0,1);
 const conductivity=clamp(Number(worldSample.conductivity)||0,0,1);
 const cover=clamp(Number(worldSample.cover)||0,0,1);
 const family=({cast:'spell',attack:'slash',hit:'impact',block:'shield',dodge:'wake',boss_telegraph:'warning'})[event.type];
 if(!family)return null;
 const el=['water','fire','aether','earth','lightning'].includes(event.element)?event.element:'aether';
 return {eventId:event.eventId,family,element:el,x:Number(event.x)||0,z:Number(event.z)||0,
   intensity:clamp(Number(event.intensity)||.65,.05,1),
   // These quantities are informative visual inputs only; never become damage formulas.
   tint:el==='water'?[.24,.75,1]:el==='fire'?[1,.47,.19]:el==='lightning'?[.61,.78,1]:el==='earth'?[.62,.86,.48]:[.77,.61,1],
   surfaceScatter:clamp((el==='water'?wet:el==='lightning'?conductivity:cover)*.85,0,.85),
   visibleFor:family==='warning'?1.25:.45, damageAppliedByHost:false};
}

/** Exactly-once visual FX queue. No game events, inventory, damage, AI or persistence are modified. */
export class VisualEventQueue{
 constructor(capacity=128){this.capacity=capacity;this.seen=new Set();this.order=[];this.events=[];}
 push(event,sample){const fx=describeCombatEffect(event,sample);if(!fx||this.seen.has(fx.eventId))return false;
  this.seen.add(fx.eventId);this.order.push(fx.eventId);if(this.order.length>this.capacity)this.seen.delete(this.order.shift());
  this.events.push({...fx,age:0});if(this.events.length>64)this.events.shift();return true;
 }
 tick(dt){dt=clamp(dt,0,.12);this.events=this.events.filter(e=>(e.age+=dt)<e.visibleFor);return this.events;}
}
