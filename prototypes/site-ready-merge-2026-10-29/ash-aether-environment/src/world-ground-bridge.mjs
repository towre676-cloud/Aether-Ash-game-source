/** A&A reconciled, non-invasive adapter: world ecology + Ground Forge material physics.
 * No renderer required. Do not patch the canonical LivingWorld resolver.
 */
import {GroundDynamics} from '../lib/ground/ground-dynamics.mjs';
import {getGroundMaterial} from '../lib/ground/ground-materials.mjs';
import {riverX,N,HALF} from './world.mjs';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const cottages=Object.freeze([[17,14,1.1],[22,1,.85],[-23,18,.78]]);
const chapel={x:-16,z:-10,r:4.25};
const distSeg=(x,z,ax,az,bx,bz)=>{const dx=bx-ax,dz=bz-az,t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz));return Math.hypot(x-(ax+t*dx),z-(az+t*dz));};
/** Bilinear field evaluation means stone, wetness, ash and aether boundaries
 * follow the world and do not inherit visible 1-m stair steps from the solver grid.
 * Actual battle/loot remain governed by the canonical (discrete) world state.
 */
export function continuousField(world,x,z){
 const ix=clamp(x+HALF,0,N-1),iz=clamp(z+HALF,0,N-1);
 const ax=Math.floor(ix),az=Math.floor(iz),bx=Math.min(N-1,ax+1),bz=Math.min(N-1,az+1);
 const tx=ix-ax,tz=iz-az;
 const f=k=>{const a=world[k][az*N+ax],b=world[k][az*N+bx],c=world[k][bz*N+ax],d=world[k][bz*N+bx];return (a*(1-tx)+b*tx)*(1-tz)+(c*(1-tx)+d*tx)*tz;};
 return {stone:f('stone'),moisture:f('m'),ash:f('ash'),fire:f('fire'),aether:f('a'),fertility:f('f')};
}
export function identifyGround(world,x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z))throw new TypeError('Ground coordinates must be finite');
 const data=continuousField(world,x,z),dRiver=Math.abs(x-riverX(z));
 const chapelDist=Math.hypot(x-chapel.x,z-chapel.z);
 if(chapelDist<chapel.r)return {id:'aether-celestial',type:'temple',built:true,trail:1,biome:'ruins',shade:.28};
 for(const [cx,cz,s] of cottages){if(Math.abs(x-cx)<=2.85*s && Math.abs(z-cz)<=2.5*s)return {id:'clay-floorboards',type:'house',built:true,trail:1,biome:'orchard',shade:1};}
 const crossing=Math.abs(z-5)<1.45 && Math.abs(x-riverX(5))<4.1;
 if(crossing && world.bridgeRepaired)return {id:'water-dock',type:'bridge',built:true,trail:1,biome:'riverbank',shade:.05};
 if(dRiver<2.55)return {id:data.stone>.64?'water-pebbles':'water-silt',type:'riverbed',built:true,trail:1,biome:'riverbank',shade:0};
 if(crossing && !world.bridgeRepaired)return {id:'water-silt',type:'broken-crossing',built:false,trail:.65,biome:'riverbank',shade:0};
 const roadOne=distSeg(x,z,17,14,riverX(5),5),roadTwo=distSeg(x,z,-16,-10,riverX(5),5);
 const road=Math.min(roadOne,roadTwo);
 if(road<.98)return {id:road<.50?'clay-road':'clay-gravel',type:'road',built:false,trail:clamp(1-road/1.15),biome:'meadow',shade:0};
 if(dRiver<4.65)return {id:data.moisture>.61?'water-mud':'water-pebbles',type:'bank',built:false,trail:0,biome:'riverbank',shade:0};
 if(data.ash>.28||data.fire>.32)return {id:data.ash>.52?'ash-clinker':'ash-cinder',type:'scorch',built:false,trail:0,biome:'ashlands',shade:0};
 if(x>10&&z>8)return {id:data.aether>.57?'aether-shale':data.moisture>.42?'clay-red':'clay-loam',type:'orchard',built:false,trail:0,biome:'orchard',shade:.12};
 if(x< -10&&z>10)return {id:data.stone>.74?'clay-fieldstone':'clay-loam',type:'forest',built:false,trail:0,biome:'woodland',shade:.58};
 if(data.stone>.76)return {id:data.aether>.48?'aether-shale':'clay-fieldstone',type:'outcrop',built:false,trail:0,biome:'highlands',shade:.12};
 if(data.aether>.51)return {id:data.stone>.58?'aether-cloudstone':'aether-dust',type:'aether',built:false,trail:0,biome:'aether',shade:.25};
 if(data.moisture>.62)return {id:'water-mud',type:'floodplain',built:false,trail:0,biome:'marsh',shade:.1};
 return {id:data.fertility>.55?'clay-loam':'clay-earth',type:'hearthland',built:false,trail:0,biome:'meadow',shade:0};
}
export class GroundWorldBridge{
 constructor(world,{seed=61029,onEvent=()=>{}}={}){
  this.world=world;this.events=[];this.onEvent=onEvent;this.seed=seed;
  this.grid=new GroundDynamics({columns:65,rows:65,cellSize:1,originX:-32.5,originZ:-32.5,seed,
   materialAt:(x,z)=>identifyGround(world,x,z).id,onEvent:e=>{this.events.push(e);if(this.events.length>200)this.events.shift();this.onEvent(e);}});
 }
 materialAt(x,z){return identifyGround(this.world,x,z).id;}
 metadataAt(x,z){return identifyGround(this.world,x,z);}
 syncMaterials(){for(let i=0;i<this.grid.materials.length;i++)this.grid.materials[i]=getGroundMaterial(identifyGround(this.world,...this.grid.world(i)).id).id;}
 surface(x,z){const m=this.metadataAt(x,z),grid=this.grid.surface(x,z);if(!grid)return null;return {...grid,type:m.type,built:m.built,trail:m.trail,biome:m.biome};}
 gameplayAt(x,z){const base=this.world.evaluate(x,z),floor=this.surface(x,z);if(!floor)return {...base,ground:null};
  // World simulation already accounts for rain and rock. Only incremental surface effects.
  const floorCost=1+.20*(1-floor.traction)+.19*floor.fracture;
  const coverDelta=.16*(floor.groundShield-.25);
  const cover=clamp(base.cover+coverDelta);
  return {...base,walkCost:+(base.walkCost*floorCost).toFixed(3),cover:+cover.toFixed(3),
   encounterChance:+clamp(base.encounterChance+.018*floor.noise*floor.traffic,.005,.38).toFixed(3),
   floorNoise:floor.noise,footprints:floor.tracePersistence,ground:floor};
 }
 previewAttack(x,z,element,power=1){const base=this.world.resolveAttack(x,z,element,power),ground=this.surface(x,z);
  if(!ground)return base;
  const a={fire:.11*ground.temperature-.13*ground.wetness,water:.10*ground.temperature+.06*ground.wetness,
   earth:.10*ground.groundShield-.12*ground.fracture,aether:.14*ground.phase+.10*ground.resonance}[element]??0;
  const multiplier=clamp(1+a,.65,1.4);
  return {...base,baseDamage:base.damage,groundMultiplier:+multiplier.toFixed(3),damage:+(base.damage*multiplier).toFixed(3),groundMaterial:ground.id};
 }
 footstep(x,z,opts={}){return this.grid.step(x,z,opts);}
 impact(x,z,element='kinetic',strength=.6){return this.grid.impact(x,z,{element,strength});}
 repair(x,z,resource){return this.grid.repair(x,z,{materialResource:resource});}
 dispatch(event){const modified=event.type==='cast'?this.previewAttack(event.x,event.z,event.element,event.power??1):null;
  const result=this.world.dispatch(event);if(!result.ok)return result;
  if(event.type==='cast') {
   const hit=this.impact(event.x,event.z,event.element,clamp((event.power??1)/5));result.attack=modified;result.groundEffect=hit;}
  if(event.type==='ignite')this.impact(event.x,event.z,'fire',.8);
  if(event.type==='hydrophone')this.impact(event.x,event.z,'aether',.7);
  if(event.type==='advance')this.grid.tick(Math.min(event.days??1,40),{rain:this.world.sky==='rain'?.7:0});
  if(event.type==='bridge'||event.type==='cast'||event.type==='advance'||event.type==='rain'||event.type==='ignite')this.syncMaterials();
  return result;
 }
 save(){return {version:1,seed:this.seed,grid:this.grid.save()};}
 restore(data){if(!data||data.version!==1||data.seed!==this.seed)throw new RangeError('Incompatible ground save');this.grid.load(data.grid);}
}
export const createGroundWorldBridge=(world,opts)=>new GroundWorldBridge(world,opts);
