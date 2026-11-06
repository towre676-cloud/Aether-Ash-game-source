/** The listening observatory is an authored place, not a recoloured campaign maze.
 * These two compact, connected terraces retain Veyr's existing story object IDs
 * and decisions. Geometry reads the same zones and anchors as native movement.
 */
import {findPath} from './navigation.js?v=5.5.0';

export const OBSERVATORY_LAYOUT_VERSION=1;
export const OBSERVATORY_SCENES=Object.freeze([50012,50013]);
const V='veyr-storm',copy=value=>JSON.parse(JSON.stringify(value));
const rect=(id,x,z,w,d)=>({id,x,z,w,d});
const SPECS=[
 {part:0,width:20,height:24,
  zones:[rect('arrival-bridge',8,19,5,4),rect('gate-court',5,16,11,4),rect('receiver-porch',3,16,5,2),rect('mast-court',7,5,10,13)],
  cuts:[[7,5],[16,5],[16,6],[5,16]],mast:rect('mast-base',8,8,3,3),
  anchors:{arrival:[10,21],operator:[7,17],repair:[13,10],transfer:[10,5]},
  cameraFocus:[10.5,12.5]},
 {part:1,width:18,height:20,
  zones:[rect('arrival-bridge',7,16,5,3),rect('listening-court',4,10,11,6),rect('receiver-court',3,4,13,8),rect('spare-vane-bay',2,8,4,5)],
  cuts:[[3,4],[3,5],[15,4],[4,15],[14,15],[2,10]],mast:rect('mast-base',7,7,3,3),spare:rect('spare-vane-base',2,10,1,1),
  anchors:{arrival:[9,16],creature:[12,12],diversion:[4,11],operator:[13,5],decision:[13,5],departure:[9,15],return:[9,17]},
  cameraFocus:[9.5,9.5]}
];

export function isObservatoryScene(scene){return scene?.originId===V&&OBSERVATORY_SCENES.includes(scene.location)&&scene.observatory?.schema===OBSERVATORY_LAYOUT_VERSION;}
export function observatoryLayoutSpec(part=0){return copy(SPECS[part===1?1:0]);}
function floorFor(spec){
 const rows=Array.from({length:spec.height},()=>Array(spec.width).fill('#'));
 for(const r of spec.zones)for(let z=r.z;z<r.z+r.d;z++)for(let x=r.x;x<r.x+r.w;x++)rows[z][x]='.';
 for(const[x,z]of spec.cuts)rows[z][x]='#';
 const r=spec.mast;for(let z=r.z;z<r.z+r.d;z++)for(let x=r.x;x<r.x+r.w;x++)rows[z][x]='#';
 return rows.map(row=>row.join(''));
}

/** Called once from origin expansion, after the existing Veyr markers exist. */
export function applyObservatoryLayout(scene){
 if(scene?.originId!==V||!OBSERVATORY_SCENES.includes(scene.location))return scene;
 const spec=observatoryLayoutSpec(scene.originPart),anchors=spec.anchors;
 scene.width=spec.width;scene.height=spec.height;scene.floor=floorFor(spec);scene.arrive=[...anchors.arrival];
 scene.originIndoor=false;scene.observatory={schema:OBSERVATORY_LAYOUT_VERSION,...spec};
 // Present-day furnishings, house reservations and rectangular campaign wall
 // plans cannot silently leak back into this fully authored historical place.
 for(const name of ['household','architecture','exteriorBuildings','interior','affordanceBlocked','blocks','householdPhysicalSites','authoredOpening'])delete scene[name];
 scene.doors=[];
 scene.objects=(scene.objects||[]).filter(o=>o.originId===V).map(object=>{
  const o={...object};let role;
  if(spec.part===0)role=o.originStep===0?'operator':o.originStep===1?'repair':'transfer';
  else role=o.originTravel===-1?'return':o.originStep===2?(o.type==='patrol'?'creature':'diversion'):o.originStep===3?'decision':'departure';
  o.xy=[...anchors[role]];o.observatoryRole=role;
  if(o.enemies)o.enemies=o.enemies.map(e=>[e[0],[...o.xy],...e.slice(2)]);
  for(const name of ['footprint','householdId','wallSide','buildingEntrance','exteriorDoor','buildingId','projection','arrive'])delete o[name];
  return o;
 });
 return scene;
}

const center=xy=>xy.map(v=>v+.5);
/** Explicit mast and route composition survives the generic opening expander. */
export function observatoryOpeningPlan(scene,{version=1}={}){
 if(!isObservatoryScene(scene))return null;
 const o=scene.observatory,arrival=center(o.anchors.arrival),approach=[arrival],stops=[];
 const ordered=scene.objects.filter(p=>p.xy&&!(p.originStep===2&&p.type==='puzzle')).sort((a,b)=>(a.originStep??9)-(b.originStep??9));
 let at=arrival;
 for(const object of ordered){
  const path=findPath(scene,at,object.xy,1);for(const point of path)if(Math.hypot(point[0]-approach.at(-1)[0],point[1]-approach.at(-1)[1])>.01)approach.push(point);
  if(path.length)at=path.at(-1);
  if(path.length||Math.hypot(at[0]-object.xy[0]-.5,at[1]-object.xy[1]-.5)<2)stops.push({type:object.type,xy:center(object.xy),label:object.label||object.travel_label||null,originStep:object.originStep??null});
 }
 const mast=o.mast;
 return {version,id:'opening:'+scene.location,role:'remembered-life',indoor:false,quietRadius:2.6,
  palette:{shadow:'#1c343d',mid:'#8a795c',leaf:'#6f8375',edge:'#d8b47c',accent:'#7dc8ba',stone:'#c7b590',light:'#ffe1a0',water:'#3e7884'},
  arrival,landmark:{kind:'listening-mast',materialKind:'stone',label:'The listening mast',xy:[mast.x+mast.w/2,mast.z+mast.d/2],focus:o.cameraFocus.slice(),radius:1.5},approach,stops,clusters:[]};
}

/** Mark a newly loaded compact scene. This never changes an entry coordinate. */
export function stampObservatoryPosition(state,scene){
 if(isObservatoryScene(scene))state.observatoryLayoutVersion=Math.max(OBSERVATORY_LAYOUT_VERSION,Number(state.observatoryLayoutVersion)||0);
 return state;
}

/** Old saves may land on a coincidentally-open cell of a different layout.
 * Move them once to a calm checkpoint for their real story phase, preserving
 * every non-spatial field (including any separately-owned battle payload).
 */
export function migrateObservatoryPosition(state,scene){
 if(!state||!isObservatoryScene(scene))return {migrated:false,from:null,to:null};
 if(Number(state.observatoryLayoutVersion)>=OBSERVATORY_LAYOUT_VERSION)return {migrated:false,from:null,to:null};
 const from=[state.x,state.y],step=state.chronicle?.originId===V?state.chronicle.step:0,part=scene.observatory.part;
 let to=center(scene.arrive);
 if(part===0&&step===1)to=[13.5,12.5];
 else if(part===0&&step>=2)to=[10.5,6.5];
 else if(part===1&&step===3)to=[11.5,6.5];
 else if(part===1&&step>=4)to=[9.5,15.5];
 state.x=to[0];state.y=to[1];stampObservatoryPosition(state,scene);
 return {migrated:true,from,to:to.slice()};
}
