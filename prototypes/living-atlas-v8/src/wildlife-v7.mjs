/** Deterministic, persistent regional wildlife. No graphics or browser dependencies.
 * The explicit 54-cohort census is gameplay authority; 3D actors are projections.
 * Counts are abstract local abundance units, not biological population estimates.
 */
import {REGIONS,REGION_BY_ID,SPECIES,SPECIES_BY_ID} from './content.mjs';
const C=x=>Math.max(0,Math.min(1,x));
const R=x=>Math.round(x*1e5)/1e5;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
const behaviorWeight={defend:1.0,ambush:.75,resonate:.7,migrate:1.4,tunnel:.85,scavenge:.95};
function baseCount(species,region,seed){const jitter=(hash(`${seed}|${species.id}`)%1000)/1000;
 return R(5.5+region.flora*2.2+(behaviorWeight[species.behavior]||1)*2+jitter*2.5);
}
function conditions(region,world){
 if(!world)return {canopy:C(region.flora*.45),wet:C(region.rain*.55),ash:region.biome==='burnt'?.3:0,fire:0};
 // Four stable field samples; never depend on the renderer, the current camera, or FPS.
 const cells=[[-21,-18],[19,-15],[-18,19],[18,18],[0,0]].map(([x,z])=>world.sample(x,z));
 const mean=k=>cells.reduce((v,s)=>v+s[k],0)/cells.length;
 return {canopy:C(mean('biomass')),wet:C(mean('moisture')),ash:C(mean('ash')),fire:C(mean('fire'))};
}
function suitability(species,weather){const h=species.habitat;
 const canopy=C(1-Math.abs(weather.canopy-h.biomass));
 const water=C(1-Math.abs(weather.wet-h.moisture));
 return C((canopy*.56+water*.44)*(1-.60*weather.fire-.30*weather.ash));
}
export class WildlifeNetwork {
 constructor(seed=1,imprint={}){
  this.seed=seed|0;this.day=0;this.cohorts={};this.disturbances={};
  for(const s of SPECIES){const region=REGION_BY_ID[s.region];const n=baseCount(s,region,seed)*(1-.25*C(imprint.scars||0));
   this.cohorts[s.id]={count:R(n),initial:R(n),alert:0,defeated:0,habitat:1};
  }
 }
 cohort(id){if(!SPECIES_BY_ID[id])throw Error('Unknown wildlife species');return this.cohorts[id];}
 sample(speciesId,x=0,z=0){const species=SPECIES_BY_ID[speciesId],c=this.cohort(speciesId);
  const nearby=(this.disturbances[species.region]||[]).reduce((v,d)=>{const radius=d.radius??8,range=Math.hypot(d.x-x,d.z-z);
   return v+d.strength*Math.max(0,1-range/radius);},0);
  const disturbance=C(nearby),skittish=species.behavior==='migrate'||species.behavior==='scavenge';
  const density=C(c.count/Math.max(1,c.initial));
  const visibility=C(density*(skittish?1-.68*disturbance:1-.28*disturbance));
  const aggression=C(species.aggression+.30*c.alert+(skittish?-.15:.16)*disturbance);
  return {count:R(c.count),density:R(density),visible:R(visibility),alert:R(c.alert),disturbance:R(disturbance),aggression:R(aggression),habitat:R(c.habitat)};
 }
 /** Authoritative accepted player steps and spells can frighten nearby cohorts. */
 disturb(region,x,z,{strength=.35,radius=8,kind='footfall'}={}){
  if(!REGION_BY_ID[region]||![x,z,strength,radius].every(Number.isFinite)||Math.abs(x)>32||Math.abs(z)>32||strength<0||strength>2||radius<=0||radius>40)throw Error('Invalid wildlife disturbance');
  const events=this.disturbances[region]??=[];events.push({x:R(x),z:R(z),strength:R(strength),radius:R(radius),kind,day:this.day});
  if(events.length>48)events.splice(0,events.length-48);
  for(const s of SPECIES.filter(s=>s.region===region)){const gain=(s.behavior==='ambush'?.75:s.behavior==='migrate'?.52:.32)*strength;const c=this.cohort(s.id);c.alert=R(C(c.alert+gain));}
 }
 /** A defeated creature physically reduces its local cohort. Only call after victory. */
 defeat(speciesId,x,z){const s=SPECIES_BY_ID[speciesId],c=this.cohort(speciesId);
  if(c.count<1)return {ok:false,reason:'This wildlife population is depleted'};
  c.count=R(Math.max(0,c.count-1));c.defeated++;
  this.disturb(s.region,x,z,{kind:'battle',strength:.75,radius:12});
  return {ok:true,remaining:c.count};
 }
 advance(days,worlds={}){
  if(!Number.isInteger(days)||days<1||days>90)throw Error('Wildlife advance must be 1..90 days');
  for(let step=0;step<days;step++){
   this.day++;
   for(const region of REGIONS){const weather=conditions(region,worlds[region.id]);const grazers=SPECIES.filter(s=>s.region===region.id&&s.kind==='grazer');
    const grazerMean=grazers.reduce((v,s)=>v+this.cohort(s.id).count/Math.max(this.cohort(s.id).initial,1),0)/Math.max(grazers.length,1);
    for(const s of SPECIES.filter(s=>s.region===region.id)){
     const c=this.cohort(s.id),fit=suitability(s,weather);
     const fireLoss=.035*weather.fire+.018*weather.ash;
     const preyBoost=(s.behavior==='ambush'?(.86+.14*grazerMean):1);
     const capacity=Math.max(0,c.initial*(.25+.95*fit)*preyBoost);
     const recovery=.055*(s.behavior==='migrate'?1.16:1);
     // Small recolonization for a depleted cohort, bounded by carrying capacity.
     const arrivals=c.count<.6?Math.min(.08,capacity*.007):0;
     c.count=R(clamp(c.count+recovery*c.count*(1-c.count/Math.max(capacity,.05))-fireLoss*c.count+arrivals,0,30));
     c.alert=R(Math.max(0,c.alert*.85-.012));c.habitat=R(fit);
    }
   }
   for(const [id,events] of Object.entries(this.disturbances)){
    this.disturbances[id]=events.filter(d=>this.day-d.day<16).map(d=>({...d,strength:R(d.strength*.84)}));
   }
  }
  return this.day;
 }
 summary(region){if(!REGION_BY_ID[region])throw Error('Unknown wildlife region');
  return SPECIES.filter(s=>s.region===region).map(s=>({species:s.id,kind:s.kind,...this.sample(s.id)}));
 }
 snapshot(){return {version:1,seed:this.seed,day:this.day,cohorts:structuredClone(this.cohorts),disturbances:structuredClone(this.disturbances)};}
 static restore(input){if(!input||input.version!==1||!Number.isInteger(input.day)||input.day<0||input.day>100000||!Number.isInteger(input.seed))throw Error('Invalid wildlife save');
  const w=new WildlifeNetwork(input.seed);w.day=input.day;
  if(Object.keys(input.cohorts??{}).length!==SPECIES.length||Object.keys(input.disturbances??{}).some(k=>!REGION_BY_ID[k]))throw Error('Invalid wildlife cohorts');
  for(const s of SPECIES){const c=input.cohorts[s.id];if(!c||!['count','initial','alert','defeated','habitat'].every(k=>Number.isFinite(c[k]))||c.count<0||c.count>30||c.initial<=0||c.initial>30||c.alert<0||c.alert>1||c.defeated<0||!Number.isInteger(c.defeated)||c.habitat<0||c.habitat>1)throw Error('Invalid wildlife cohort '+s.id);
   w.cohorts[s.id]={...c};}
  for(const [region,events] of Object.entries(input.disturbances??{})){
   if(!Array.isArray(events)||events.length>48)throw Error('Invalid wildlife disturbance count');
   for(const e of events){if(![e.x,e.z,e.strength,e.radius,e.day].every(Number.isFinite)||Math.abs(e.x)>32||Math.abs(e.z)>32||e.strength<0||e.strength>2||e.radius<=0||e.radius>40||!Number.isInteger(e.day)||e.day<0||e.day>w.day)throw Error('Invalid wildlife disturbance');}
   w.disturbances[region]=structuredClone(events);
  }
  return w;
 }
}
