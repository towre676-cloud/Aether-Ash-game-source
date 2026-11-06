/**
 * Art direction for the opening lives and the first present-day chapter.
 * This pass adds render-only composition. Floors, doors, quests and save IDs
 * belong to the story model and are deliberately never rewritten here.
 */
import {ORIGINS} from './origin-content.js?v=5.18.0';
import {findPath} from './navigation.js?v=5.5.0';
import {isInteriorScene} from './scene-identity.js?v=4.0.0';
import {observatoryOpeningPlan} from './observatory-layout.js?v=5.38';

export const OPENING_COMPOSITION_VERSION=1;
const center=xy=>[xy[0]+.5,xy[1]+.5];
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const seedAt=(x,y,seed)=>{
 let n=Math.imul(x+317,374761393)^Math.imul(y+911,668265263)^seed;
 n=Math.imul(n^(n>>>13),1274126177);return(n^(n>>>16))>>>0;
};
const PALETTES={
 hearth:{shadow:'#182328',mid:'#52604e',leaf:'#6b8160',edge:'#c2ac79',accent:'#e5b15f',stone:'#8a918a',light:'#ffe2aa',water:'#73adb1'},
 water:{shadow:'#172d38',mid:'#41646c',leaf:'#6f9b87',edge:'#aec6ac',accent:'#a3dfdb',stone:'#8baba7',light:'#e8f1cc',water:'#71bac4'},
 forge:{shadow:'#292c31',mid:'#6b5c50',leaf:'#738476',edge:'#baaa8a',accent:'#eea66d',stone:'#92958e',light:'#ffdfac',water:'#7fa8ad'},
 rail:{shadow:'#202e36',mid:'#586765',leaf:'#879273',edge:'#c1b38e',accent:'#e3be77',stone:'#a0aaa5',light:'#f6e3ae',water:'#76acb4'},
 archive:{shadow:'#252b3d',mid:'#606879',leaf:'#798b86',edge:'#b9baa9',accent:'#d0b97c',stone:'#9caaa9',light:'#f7e7ba',water:'#8fbfc6'},
 storm:{shadow:'#202d40',mid:'#5b7280',leaf:'#8d9d91',edge:'#c9c9af',accent:'#a6d8e3',stone:'#a2b5b9',light:'#e9eee0',water:'#7ec2d4'}
};
const LIVES={
 'sable-reed':{palette:'hearth',kind:'reed-relay',materialKind:'garden',label:'The reed relay',clusterKinds:['garden','stone','roots']},
 'iona-lowbank':{palette:'water',kind:'flood-gauge',materialKind:'water',label:'The doorstep waterline',clusterKinds:['reeds','water','stone']},
 'rook-regulator':{palette:'forge',kind:'test-furnace',materialKind:'forge',label:'The winter furnace',clusterKinds:['forge','stone','glass']},
 'brass-rail':{palette:'rail',kind:'rail-signal',materialKind:'stone',label:'The public crossing',clusterKinds:['stone','forge','roots']},
 'riven-tide':{palette:'water',kind:'tide-sluice',materialKind:'water',label:'The third tide mark',clusterKinds:['reeds','water','stone']},
 'mira-archive':{palette:'archive',kind:'archive-lamp',materialKind:'stone',label:'The witness lamp',clusterKinds:['glass','stone','garden']},
 'veyr-storm':{palette:'storm',kind:'listening-mast',materialKind:'stone',label:'The listening mast',clusterKinds:['stone','glass','roots']}
};
const PRESENT={
 home:{palette:'hearth',kind:'reed-relay',materialKind:'garden',label:'The family reed shelf',clusterKinds:['garden','stone']},
 town:{palette:'hearth',kind:'reed-relay',materialKind:'garden',label:'The festival of mended things',clusterKinds:['garden','stone','roots']},
 workshop:{palette:'forge',kind:'test-furnace',materialKind:'forge',label:'Rook’s working furnace',clusterKinds:['forge','stone','glass']},
 security:{palette:'forge',kind:'rail-signal',materialKind:'forge',label:'The carriage regulator',clusterKinds:['forge','stone']},
 console:{palette:'forge',kind:'rail-signal',materialKind:'stone',label:'The voice relay',clusterKinds:['glass','forge','stone']},
 instrumentworks:{palette:'hearth',kind:'reed-relay',materialKind:'garden',label:'The listening kiln',clusterKinds:['glass','stone']},
 inn:{palette:'hearth',kind:'reed-relay',materialKind:'garden',label:'The travellers’ hearth',clusterKinds:['garden','stone']},
 clinic:{palette:'water',kind:'flood-gauge',materialKind:'water',label:'The remedy shelf',clusterKinds:['garden','glass']},
 carpenter:{palette:'hearth',kind:'reed-relay',materialKind:'garden',label:'The public workbench',clusterKinds:['stone','garden']},
 guild:{palette:'archive',kind:'archive-lamp',materialKind:'stone',label:'The common ledger',clusterKinds:['stone','glass']},
 market:{palette:'hearth',kind:'reed-relay',materialKind:'garden',label:'The common exchange',clusterKinds:['garden','stone']}
};
function specFor(scene){
 if(scene.originId&&LIVES[scene.originId])return LIVES[scene.originId];
 if(Number.isInteger(scene.fieldOrigin))return LIVES[ORIGINS.find(o=>o.hero===scene.fieldOrigin)?.id];
 return scene.chapter===1?PRESENT[scene.key]:null;
}
function markers(scene){
 const objects=(scene.objects||[]).filter(o=>Array.isArray(o.xy)&&o.type!=='furnishing');
 if(scene.originId){
  const ordered=objects.slice().sort((a,b)=>(a.originStep??9)-(b.originStep??9));
  // A diversion and a battle are parallel ways through the same clearing.
  return ordered.filter(o=>!(o.type==='puzzle'&&o.originStep===2));
 }
 if(scene.key==='home')return [objects.find(o=>o.type==='npc'),objects.find(o=>o.type==='portal')].filter(Boolean);
 if(scene.key==='workshop')return [objects.find(o=>o.type==='cache'&&o.bit===1),objects.find(o=>o.type==='puzzle'&&o.bit===3),objects.find(o=>o.type==='portal'&&o.to==='security')].filter(Boolean);
 if(scene.key==='town')return [objects.find(o=>o.type==='puzzle'&&o.bit===0),objects.find(o=>o.type==='puzzle'&&o.bit===1),objects.find(o=>o.type==='portal'&&o.to==='workshop')].filter(Boolean);
 if(scene.key==='security')return [objects.find(o=>o.storyEvent==='iona'),objects.find(o=>o.type==='puzzle'),objects.find(o=>o.type==='boss')].filter(Boolean);
 return objects.filter(o=>['puzzle','boss','patrol','listen','shop','camp','portal'].includes(o.type)).slice(0,5);
}
function arrivalFor(scene){
 const p=scene.arrive;
 if(p&&scene.floor[p[1]]?.[p[0]]==='.')return center(p);
 for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++)if(scene.floor[y]?.[x]==='.')return center([x,y]);
 return null;
}
function approachFor(scene,arrival,ordered){
 const path=[arrival],reached=[];let at=arrival;
 for(const object of ordered){
  const leg=findPath(scene,at,object.xy,1);
  const near=distance(at,center(object.xy))<2;
  if(!leg.length&&!near)continue;
  for(const p of leg)if(distance(path.at(-1),p)>.01)path.push(p);
  if(leg.length)at=leg.at(-1);
  reached.push({type:object.type,xy:center(object.xy),label:object.label||object.travel_label||null,originStep:object.originStep??null});
 }
 return {path,reached};
}
function boundarySites(scene){
 const floor=(x,y)=>scene.floor[y]?.[x]==='.';
 const sites=[];
 for(let y=1;y<scene.height-1;y++)for(let x=1;x<scene.width-1;x++){
  if(floor(x,y)||![[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>floor(x+dx,y+dy)))continue;
  sites.push([x+.5,y+.5]);
 }
 return sites;
}
function tooNearStructure(scene,p){
 // Furnished walls already carry authored furniture; never stack new props on it.
 const furniture=[...(scene.objects||[]),...(scene.household?.furnishings||[])];
 if(furniture.some(o=>{const b=o.footprint;return b&&p[0]>=b.x-.75&&p[0]<=b.x+b.w+.75&&p[1]>=b.y-.75&&p[1]<=b.y+b.h+.75;}))return true;
 return (scene.exteriorBuildings||[]).some(b=>{
  const r=b.bounds||b.footprint;
  return r&&Number.isFinite(r.x)&&p[0]>=r.x-1&&p[0]<=r.x+r.w+1&&p[1]>=r.y-1&&p[1]<=r.y+r.h+1;
 });
}
/** Pure, reproducible plan; all xy values are world tile centers. */
export function composeOpening(scene){
 const observatory=observatoryOpeningPlan(scene,{version:OPENING_COMPOSITION_VERSION});if(observatory)return observatory;
 const spec=specFor(scene),arrival=arrivalFor(scene);if(!spec||!arrival)return null;
 const ordered=markers(scene),{path,reached}=approachFor(scene,arrival,ordered),quietRadius=2.6;
 const protectedPoints=[arrival,...(scene.objects||[]).filter(o=>o.xy&&o.type!=='furnishing').map(o=>center(o.xy)),...(scene.doors||[]).map(o=>center(o.xy))];
 const indoor=isInteriorScene(scene),seed=Number(scene.location)||0;
 const candidates=boundarySites(scene).filter(p=>protectedPoints.every(q=>distance(p,q)>=quietRadius)&&!tooNearStructure(scene,p));
 const closeToRoute=p=>Math.min(...path.map(q=>distance(p,q)));
 const usable=candidates.filter(p=>closeToRoute(p)<=6.5).sort((a,b)=>closeToRoute(a)-closeToRoute(b)||seedAt(...a,seed)-seedAt(...b,seed));
 const clusters=[];
 for(const p of usable){
  if(clusters.some(q=>distance(p,[q.x,q.y])<2.8))continue;
  const n=seedAt(Math.floor(p[0]),Math.floor(p[1]),seed);
  const kinds=indoor?spec.clusterKinds.filter(k=>!['roots','reeds','water'].includes(k)):spec.clusterKinds;
  clusters.push({kind:kinds[n%kinds.length]||'stone',x:p[0],y:p[1],seed:n,scale:.82+(n%30)/100});
  if(clusters.length>=(indoor?8:16))break;
 }
 const anchor=ordered.find(o=>o.type==='puzzle')||ordered.find(o=>['boss','patrol','listen'].includes(o.type))||ordered[0];
 const focus=anchor?center(anchor.xy):arrival;
 const landmarkSite=usable.filter(p=>distance(p,focus)<7.5).sort((a,b)=>distance(a,focus)-distance(b,focus))[0];
 const landmark=landmarkSite?{kind:spec.kind,materialKind:spec.materialKind,label:spec.label,xy:landmarkSite,focus,radius:indoor?1.15:1.8}:null;
 // Reserve the landmark's space instead of laying another prop over it.
 const kept=landmark?clusters.filter(c=>distance([c.x,c.y],landmark.xy)>2.2):clusters;
 return {version:OPENING_COMPOSITION_VERSION,id:'opening:'+scene.location,role:scene.originId?'remembered-life':Number.isInteger(scene.fieldOrigin)?'first-encounter':'present-opening',indoor,quietRadius,palette:{...PALETTES[spec.palette]},arrival,landmark,approach:path,stops:reached,clusters:kept};
}
/** Call after origins, buildings and field origins have been expanded. */
export function expandAuthoredOpenings(data){
 for(const scene of data.scenes){const plan=composeOpening(scene);if(plan)scene.authoredOpening=plan;}
 return data;
}
