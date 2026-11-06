/** Ash & Aether v8 — authoritative resident spatial projection.
 * No DOM, animation clock, random-number generator state, or WebGL dependency.
 * A resident's visible position and encounter hit target are the same point.
 */
import {SPECIES,REGION_BY_ID} from './content.mjs';
import {riverX} from './world.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const fract=x=>x-Math.floor(x);
const safe=(world,p)=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<=30&&Math.abs(p.z)<=30&&world.evaluate(p.x,p.z).traversalPassable&&Math.abs(p.x-riverX(p.z))>3.4;
function walkable(world,origin,dest){for(let j=0;j<=10;j++){const f=j/10,p={x:origin.x+(dest.x-origin.x)*f,z:origin.z+(dest.z-origin.z)*f};if(!safe(world,p))return false;}return true;}
/** Stable positions derived from region seed, turn number, existing ecological cohort and surface physics. */
export function residentRoster({world,region,wildlife,tick=0,retired={},quality='high'}={}){
 if(!REGION_BY_ID[region?.id]||!world||!wildlife||!Number.isSafeInteger(tick)||tick<0)throw Error('Invalid resident roster inputs');
 const species=SPECIES.filter(s=>s.region===region.id);
 const max=quality==='low'?10:24;
 const roster=[];
 for(let i=0;i<max;i++){
  const s=species[i%species.length],spawnNumber=Math.floor(i/species.length);
  let x=-27+fract((i+2)*.61803398875)*54,z=-27+fract((i+3)*.41421356237)*54;
  for(let k=0;k<16;k++){if(safe(world,{x,z}))break;x=-27+fract((i+2+k*7)*.61803398875)*54;z=-27+fract((i+3+k*11)*.41421356237)*54;}
  const anchor={x,z};if(!safe(world,anchor))continue;
  const id=`${region.id}:${s.id}:${spawnNumber}`;
  const recentDefeat=retired[id]!==undefined && tick-retired[id]<18;
  const census=wildlife.sample(s.id,x,z);
  if(recentDefeat||census.count<(spawnNumber+1)*3||census.visible<.09)continue;
  const segment=Math.floor(tick/3);
  const radius=s.behavior==='migrate'?4.2:s.behavior==='ambush'?2.6:2.3;
  const angle=fract(Math.sin((i+1)*91.71+(segment+1)*17.31+region.seed)*43758.5453)*Math.PI*2;
  const factor=.35+.6*fract(Math.sin(segment*39.11+i*7.5)*24677.82);
  const destination={x:clamp(x+Math.cos(angle)*radius*factor,-30,30),z:clamp(z+Math.sin(angle)*radius*factor,-30,30)};
  // A movement segment is rejected if any intermediate crossing would be blocked.
  const legal=walkable(world,anchor,destination);
  const fraction=(tick%3)/3;
  const eased=fraction*fraction*(3-2*fraction);
  const position=legal?{x:x+(destination.x-x)*eased,z:z+(destination.z-z)*eased}:anchor;
  const local=wildlife.sample(s.id,position.x,position.z);
  roster.push({id,index:i,species:s.id,name:s.name,kind:s.kind,behavior:s.behavior,region:region.id,spawnNumber,
   x:+position.x.toFixed(5),z:+position.z.toFixed(5),anchor,alert:local.alert,disturbance:local.disturbance,census:local.count,
   aggression:local.aggression,level:s.level});
 }
 return roster;
}
export function residentDistance(resident,point){return Math.hypot(resident.x-point.x,resident.z-point.z);}
export function residentInReach(resident,point,reach=3.1){return residentDistance(resident,point)<=reach+1e-9;}
