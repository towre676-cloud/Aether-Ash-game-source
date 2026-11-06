import {PHYSICAL_LORE} from './physical-lore-content.js';
import {CREW} from './mako.js?v=5.16.0';
const normalized=new WeakSet();
const ids=new Set(PHYSICAL_LORE.map(x=>x.id));
const crossings=new Set(['brake-seal','road-wedge','sail-ring','crown-shard']);
export function physicalState(s){
 const p=s.physicalLore??={version:1,taken:[],bag:[],held:null,installed:[],completed:[],claimed:[],dropped:{},steps:{},clocks:{},growthPoints:{}};
 if(normalized.has(p))return p;normalized.add(p);
 for(const k of ['taken','bag','installed','completed','claimed'])p[k]=[...new Set((Array.isArray(p[k])?p[k]:[]).filter(id=>ids.has(id)))];
 for(const k of ['dropped','steps','clocks','growthPoints'])if(!p[k]||typeof p[k]!=='object'||Array.isArray(p[k]))p[k]={};
 p.bag=p.bag.filter(id=>!p.installed.includes(id)&&!p.completed.includes(id));
 if(!p.bag.includes(p.held))p.held=null;
 return p;
}
const bindings=new WeakMap();
function roomFor(world,chapter,key){return world.data.scenes.find(s=>s.chapter===chapter&&s.key===key)||world.data.scenes.find(s=>s.chapter===chapter);}
// Reachable floor beside a wall, away from portals, authored actions and arrivals.
export function placePhysical(scene,used=[],focus=null){
 const start=scene.arrive,q=[start],seen=new Set([start.join(',')]);for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [a,b]of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]])if(scene.floor[b]?.[a]==='.'&&!seen.has(a+','+b)){seen.add(a+','+b);q.push([a,b]);}}
 const occupied=[...scene.objects.filter(o=>o.type!=='furnishing'),...scene.doors,...used].flatMap(o=>o.xy?[o.xy]:(o.enemies||[]).map(e=>e[1]));
 const cells=q.filter(([x,y])=>Math.hypot(x-start[0],y-start[1])>=3&&(!focus||Math.hypot(x-focus[0],y-focus[1])<=6)&&!occupied.some(p=>Math.hypot(p[0]-x,p[1]-y)<2.15));
 cells.sort((a,b)=>{const score=([x,y])=>(focus?-Math.hypot(x-focus[0],y-focus[1])*3:Math.min(10,Math.hypot(x-start[0],y-start[1])))+([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>scene.floor[y+dy]?.[x+dx]==='#')?4:0);return score(b)-score(a)||a[1]-b[1]||a[0]-b[0];});
 return cells[0]||null;
}
export function physicalBindings(world){
 let bound=bindings.get(world.data);if(bound)return bound;if(world.data.householdPhysicalBindings){bound=JSON.parse(JSON.stringify(world.data.householdPhysicalBindings));bindings.set(world.data,bound);return bound;}bound=[];
 for(const entry of PHYSICAL_LORE){const from=roomFor(world,entry.chapter,entry.source),to=roomFor(world,entry.chapter,entry.target);if(!from||!to)continue;
  const used=scene=>bound.filter(o=>o.physicalLocation===scene.location);const source=from.architecture?.physicalSites?.find(o=>o.physicalId===entry.id&&o.physicalRole==='source')?.xy||placePhysical(from,used(from));if(!source)throw Error('No reachable physical lore source in '+from.key);bound.push({type:'lore-item',physicalRole:'source',physicalId:entry.id,physicalLocation:from.location,xy:source,label:'Carry '+entry.name});
  const target=to.architecture?.physicalSites?.find(o=>o.physicalId===entry.id&&o.physicalRole==='device')?.xy||placePhysical(to,used(to));if(!target)throw Error('No reachable physical lore site in '+to.key);bound.push({type:'lore-device',physicalRole:'device',physicalId:entry.id,physicalLocation:to.location,xy:target,label:entry.device});
  const reward=to.architecture?.physicalSites?.find(o=>o.physicalId===entry.id&&o.physicalRole==='reward')?.xy||placePhysical(to,used(to),target);if(!reward)throw Error('No reachable physical lore reward in '+to.key);bound.push({type:'lore-cache',physicalRole:'reward',physicalId:entry.id,physicalLocation:to.location,xy:reward,label:'Recover revealed Mako cache'});
 }
 bindings.set(world.data,bound);return bound;
}
export function physicalObjects(world){
 const p=physicalState(world.state),objects=physicalBindings(world).filter(o=>o.physicalLocation===world.state.scene);
 for(const source of [...objects])if(source.physicalRole==='source'&&p.taken.includes(source.physicalId))objects.push({...source,type:'lore-trace',physicalRole:'trace',label:'Examine the worn maker mark'});
 for(const source of [...objects])if(source.physicalRole==='source'&&crossings.has(source.physicalId)&&p.completed.includes(source.physicalId))objects.push({...source,type:'lore-crossing',physicalRole:'crossing',label:'Take the restored crossing'});
 for(const [id,d]of Object.entries(p.dropped))if(ids.has(id)&&d?.scene===world.state.scene&&Array.isArray(d.xy)&&d.xy.length===2&&d.xy.every(Number.isFinite)&&!p.installed.includes(id)&&!p.bag.includes(id))objects.push({type:'lore-item',physicalRole:'dropped',physicalId:id,physicalLocation:d.scene,xy:d.xy,label:'Carry '+PHYSICAL_LORE.find(e=>e.id===id).name});
 return objects;
}
export function physicalVisible(w,o){if(!o.physicalId)return true;const p=physicalState(w.state),entry=PHYSICAL_LORE.find(e=>e.id===o.physicalId);if(!entry||entry.chapter>w.state.chapter)return false;if(entry.chapter===1&&w.state.story&&!w.state.story.firstCore)return false;
 if(o.physicalRole==='crossing')return p.completed.includes(entry.id);
 if(o.physicalRole==='source')return !p.taken.includes(entry.id)&&!p.installed.includes(entry.id);
 if(o.physicalRole==='dropped')return !!p.dropped[entry.id]&&!p.installed.includes(entry.id);
 if(o.physicalRole==='reward')return p.completed.includes(entry.id)&&!p.claimed.includes(entry.id);
 return true;
}
export function physicalDone(w,o){const p=physicalState(w.state);return o.physicalRole==='device'?p.completed.includes(o.physicalId):o.physicalRole==='reward'?p.claimed.includes(o.physicalId):p.taken.includes(o.physicalId);}
function finish(w,e){const p=physicalState(w.state);if(p.completed.includes(e.id))return;p.completed.push(e.id);w.notice(e.device+' answers. A hidden cache opens nearby.');w.callbacks.onMusic('instrument:discovery');}
export function carryPhysical(w,id){const p=physicalState(w.state);if(!p.bag.includes(id)||p.installed.includes(id)||w.state.mode!=='field')return false;p.held=id;return true;}
export function dropPhysical(w){const p=physicalState(w.state),id=p.held;if(!id||w.state.mode!=='field'||!w.walkable(w.state.x,w.state.y))return false;p.bag=p.bag.filter(x=>x!==id);p.held=null;p.dropped[id]={scene:w.state.scene,xy:[Math.floor(w.state.x),Math.floor(w.state.y)]};return true;}
export function interactPhysical(w,o){if(!o?.physicalId)return false;if(o.physicalLocation!==w.state.scene||!physicalVisible(w,o)||Math.hypot(w.state.x-o.xy[0]-.5,w.state.y-o.xy[1]-.5)>2.05)return true;
 const p=physicalState(w.state),e=PHYSICAL_LORE.find(e=>e.id===o.physicalId),id=e.id;
 if(o.physicalRole==='trace'){w.notice(e.meaning+' The same '+e.glyph+' is cut into the '+e.device.toLowerCase()+'.');return true;}
 if(o.physicalRole==='source'||o.physicalRole==='dropped'){if(!p.bag.includes(id))p.bag.push(id);if(!p.taken.includes(id))p.taken.push(id);delete p.dropped[id];p.held=id;w.notice(e.name+' carried. Take it to the '+e.device.toLowerCase()+'.');return true;}
 if(o.physicalRole==='reward'){
  if(!p.completed.includes(id)||p.claimed.includes(id))return true;p.claimed.push(id);w.state.items.tonic=(w.state.items.tonic||0)+1;
  if(e.chapter>=2){for(const hero of w.state.party){const h=w.state.heroes[hero];p.growthPoints[hero]=(p.growthPoints[hero]||0)+1;h.ap??={};const core=CREW[hero].affinity;h.ap[core]=(h.ap[core]||0)+12;}if(e.chapter>=4&&!w.state.cores.includes(e.core))w.state.cores.push(e.core);w.notice('Cache recovered: 1 growth point and 12 affinity AP per travelling companion, plus a Tonic'+(e.chapter>=4?' · '+e.core+' Mako.':'.'));}
  else w.notice('Shelter cache recovered: a Tonic for the road.');return true;
 }
 if(p.completed.includes(id)){if(crossings.has(id)){const to=physicalBindings(w).find(v=>v.physicalId===id&&v.physicalRole===(o.physicalRole==='crossing'?'device':'source'));w.loadScene(to.physicalLocation,to.xy);return true;}if(id==='shelter-reed'||id==='heat-brick'){w.rest();w.notice('The shared warmth restores the crew.');return true;}w.notice(e.device+' is working for everyone.');return true;}
 if(!p.installed.includes(id)){if(p.held!==id){w.notice(e.meaning+' The worn '+e.glyph+' impression fits '+e.name.toLowerCase()+'. Carry it from the Key items satchel.');return true;}p.bag=p.bag.filter(v=>v!==id);p.held=null;p.installed.push(id);p.steps[id]=0;p.clocks[id]=0;if(e.mode==='fit')finish(w,e);else w.notice(({turn:'Turn the fitted piece toward the gold mark.',pump:'Work the handle to carry the effect through the whole mechanism.',grow:'The living pattern is taking hold. You can keep walking.',listen:'Ring once. Let the light fade before you answer.'})[e.mode]);return true;}
 if(e.mode==='turn'){p.steps[id]=((p.steps[id]||0)+1)%4;if(p.steps[id]===e.orientation)finish(w,e);else w.notice('The contact turns. Follow the gold mark.');}
 if(e.mode==='pump'){p.steps[id]=Math.min(3,(p.steps[id]||0)+1);if(p.steps[id]===3)finish(w,e);else w.notice(e.device+' · '+p.steps[id]+'/3');}
 if(e.mode==='listen'){if((p.clocks[id]||0)>=1.6)finish(w,e);else{p.clocks[id]=0;w.callbacks.onMusic('instrument:discovery');w.notice('The ring starts again. Leave a gap before the answering note.');}}
 return true;
}
export function tickPhysical(w,dt){if(w.state.mode!=='field'||!Number.isFinite(dt)||dt<=0)return;const p=physicalState(w.state);for(const e of PHYSICAL_LORE){if(!p.installed.includes(e.id)||p.completed.includes(e.id))continue;const site=physicalBindings(w).find(o=>o.physicalId===e.id&&o.physicalRole==='device');if(site?.physicalLocation!==w.state.scene)continue;if(e.mode==='grow'||e.mode==='listen'){p.clocks[e.id]=Math.min(8,(p.clocks[e.id]||0)+Math.min(dt,.1));if(e.mode==='grow'&&p.clocks[e.id]>=4)finish(w,e);}}}

/** A carried lantern or walking-star lens exposes nearby hiding places without reading a clue. */
export function physicalLightReveals(w,o){if(!o.hidden||!o.xy)return false;const held=w.state.physicalLore?.held;return ['brake-lantern','star-lens'].includes(held)&&Math.hypot(w.state.x-o.xy[0]-.5,w.state.y-o.xy[1]-.5)<5.8;}
