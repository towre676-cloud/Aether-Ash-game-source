/** Ground Forge attached to the canonical campaign. Coordinates are host tiles.
 * This module owns surface response only; collision, story, HP and inventory stay
 * with World/Battle. Dense simulation grids are kept only for the active scene.
 */
import {createProductionGroundAdapter} from './reconciled-content/ground/production-ground-adapter.mjs?v=5.22.0';
import {MATERIALS,getGroundMaterial} from './reconciled-content/ground/ground-materials.mjs?v=5.22.0';
import {livingArmoryFieldTraits} from './living-armory/campaign.js?v=5.33.0';
import {environmentFor} from './environment.js?v=5.22.0';
import {isInterior} from './presentation.js?v=5.41';
import {streetPlan} from './wayfinding.js?v=5.22.0';
import {buildingReservations,pointInGroundRect} from './environmental-grounding.js?v=5.22.0';

const TILE=48,SEED=61029,FIELDS=['wet','heat','charge','phase','fracture','traffic'];
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
const indexById=new Map(MATERIALS.map((m,i)=>[m.id,i]));
const plans=new WeakMap();
const hash=(a,b,c=0)=>{let n=Math.imul(a+317,374761393)^Math.imul(b+911,668265263)^Math.imul(c+1,1274126177);return (n^(n>>>13))>>>0;};
const realmIds=realm=>MATERIALS.filter(m=>m.realm===realm).map(m=>m.id);
const realms={Ash:realmIds('Ash'),Water:realmIds('Water'),Clay:realmIds('Clay'),Aether:realmIds('Aether')};
export const groundElement=core=>({flame:'fire',ember:'fire',fire:'fire',tide:'water',water:'water',volt:'lightning',lightning:'lightning',frost:'frost',shade:'aether',aether:'aether',gravity:'aether',echo:'aether'})[core]||'kinetic';

function groundPlan(scene){
 if(plans.has(scene))return plans.get(scene);
 const indoor=isInterior(scene),env=environmentFor(scene),text=[scene.key,scene.interior,scene.household?.kind,env.style,scene.title,scene.originId].join(' ').toLowerCase();
 let realm=/foundry|forge|kiln|lava|ember|cinder|volcan/.test(text)?'Ash':/river|tide|water|coral|salt|marsh|mangrove|cistern|flood/.test(text)?'Water':/aether|crystal|star|sky|rift|aurora|storm|summit|lens|reactor/.test(text)?'Aether':'Clay';
 const roads=indoor?new Set():streetPlan(scene),excluded=new Set(),rugs=new Set(),architecture=new Map(),partitions=new Set((scene.household?.partitions||[]).map(p=>p.x+','+p.y));
 for(const o of [...(scene.objects||[]),...(scene.household?.furnishings||[])]){
  const b=o.footprint;if(b)for(let y=Math.floor(b.y);y<Math.ceil(b.y+b.h);y++)for(let x=Math.floor(b.x);x<Math.ceil(b.x+b.w);x++){
   excluded.add(x+','+y);if(o.furniture===16)rugs.add(x+','+y);
  }
 }
 for(const door of scene.doors||[])if(door.xy)for(let y=door.xy[1]-1;y<=door.xy[1]+1;y++)for(let x=door.xy[0]-1;x<=door.xy[0]+1;x++)excluded.add(x+','+y);
 for(const building of buildingReservations(scene))for(const rect of building.groundRects)for(let y=Math.floor(rect.y);y<Math.ceil(rect.y+rect.h);y++)for(let x=Math.floor(rect.x);x<Math.ceil(rect.x+rect.w);x++){const key=x+','+y;if(!architecture.has(key))architecture.set(key,[]);architecture.get(key).push(rect);}
 let floor='clay-floorboards';
 if(/chapel|music|listening/.test(text))floor='clay-mosaic';
 else if(/clinic|washroom|kitchen/.test(text))floor='clay-terracotta';
 else if(/archive|vault|temple/.test(text))floor='aether-marble';
 else if(/cistern|drain|canal/.test(text))floor='water-seep';
 else if(/catwalk|security|reactor|console/.test(text))floor='aether-enamel';
 else if(/forge|kiln/.test(text))floor='ash-kiln';
 else if(/cavern|crypt|tunnel/.test(text))floor='water-limestone';
 const result={indoor,env,text,realm,roads,excluded,rugs,architecture,partitions,floor};plans.set(scene,result);return result;
}

/** Material selection reads the actual host walk mask; it never opens a route. */
export function authoredGroundMaterial(scene,x,y){
 const p=groundPlan(scene),ix=Math.floor(x),iy=Math.floor(y),key=ix+','+iy,walk=scene.floor[iy]?.[ix]==='.';
 if(!walk)return {id:p.realm==='Water'?'water-deep':p.realm==='Ash'?'ash-basalt':'clay-fieldstone',built:true,grassAllowed:false,walkable:false,structuralTag:'wall'};
 if(p.indoor)return {id:p.rugs.has(key)?'clay-rug':p.floor,built:true,grassAllowed:false,walkable:true,structuralTag:'floor'};
 if(p.roads.has(key)||p.excluded.has(key)||p.architecture.get(key)?.some(rect=>pointInGroundRect(rect,x,y)))return {id:p.realm==='Ash'?'ash-soot-cobble':p.realm==='Water'?'water-dock':p.realm==='Aether'?'aether-brass':((Number(scene.location)||0)%2?'clay-herringbone':'clay-road'),built:true,grassAllowed:false,walkable:true,structuralTag:'road'};
 const a=hash(Math.floor(ix/5),Math.floor(iy/5),Number(scene.location)||1),variants=p.realm==='Ash'?['ash-cinder','ash-slag','ash-basalt','ash-clinker','ash-obsidian','ash-charwood']:p.realm==='Water'?['water-silt','water-sand','water-pebbles','water-mud','water-coral','water-slate']:p.realm==='Aether'?['aether-shale','aether-dust','aether-cloudstone','aether-silverash','aether-chalk','aether-phase']:['clay-loam','clay-red','clay-fieldstone','clay-gravel','clay-earth','clay-thresh'];
 let id=variants[a%variants.length];
 // Distinct, coherent patches carry rarer authored material families across chapters.
 if(a%11===0)id=realms[p.realm][(Number(scene.chapter)||1)%12];
 const m=getGroundMaterial(id),organic=/loam|earth|red|mud|silt/.test(id),grassAllowed=organic||(!/lava|snow|frozen|ice|sand|salt|crystal|storm|foundry/.test(p.text)&&m.physics.permeability>.35);
 return {id,built:false,grassAllowed,walkable:true,structuralTag:grassAllowed?'soil':'stone'};
}

function snapshotState(state){
 state.environment??={};
 const existing=state.environment.groundV1;
 if(existing&&existing.version!==1)return null;
 return state.environment.groundV1??={version:1,sequence:0,maps:{}};
}
function validateSaved(s){
 if(s===undefined||s===null||s.version!==1)return;
 if(!Number.isSafeInteger(s.sequence)||s.sequence<0||!s.maps||Array.isArray(s.maps)||typeof s.maps!=='object'||Object.keys(s.maps).length>1000)throw Error('Invalid Ground Forge save.');
 for(const [id,m] of Object.entries(s.maps)){
  if(id.length>128||!Number.isInteger(m.width)||!Number.isInteger(m.height)||m.width<2||m.height<2||m.width*m.height>65536||!Number.isFinite(m.elapsed)||m.elapsed<0||!Array.isArray(m.cells)||m.cells.length>m.width*m.height)throw Error('Invalid Ground Forge map.');
  let last=-1;for(const row of m.cells){if(!Array.isArray(row)||row.length!==7||!Number.isInteger(row[0])||row[0]<=last||row[0]>=m.width*m.height||row.slice(1).some(v=>!Number.isFinite(v)||v<0||v>1))throw Error('Invalid Ground Forge cell.');last=row[0];}
 }
}
export function validGroundSave(value){try{validateSaved(value);return true;}catch{return false;}}
function sameOriginJourney(state,options){
 const before=state?.chronicle,after=options?.chronicle;
 if(before?.phase!=='past'||after?.phase!=='present'||!before.originId||before.originId!==after.originId||(before.cycle||0)!==(after.cycle||0))return false;
 const lineage='lineage-'+(after.cycle||0)+'-'+after.originId;
 return (state.timeline?.id||('lineage-'+(before.cycle||0)+'-'+before.originId))===lineage;
}

export function installReconciledGround(world,{onEnvironmentEvent=()=>{}}={}){
 if(world.reconciledGround)return world.reconciledGround;
 let adapter=null,scene=null,stateRef=null,mapId=null,distanceDebt=0,tickDebt=0,motion={sprinting:false,stealth:0},future=false;
 const listeners=new Set(),seenEvents=new WeakSet();
 const notify=e=>{try{onEnvironmentEvent(e);}catch{}for(const fn of listeners)try{fn(e);}catch{}};
 function checkpoint(){
  if(!adapter||future||!stateRef)return;
  const slot=snapshotState(stateRef);if(!slot)return;
  const saved=adapter.save().maps[mapId],cells=[];
  for(let i=0;i<saved.columns*saved.rows;i++){
   const values=FIELDS.map(f=>saved.fields[f][i]);
   if(values.some(v=>v>0.00001))cells.push([i,...values]);
  }
  slot.maps[mapId]={...slot.maps[mapId],width:saved.columns,height:saved.rows,elapsed:saved.elapsed,cells};
 }
 function ensure(){
  if(scene===world.scene&&stateRef===world.state)return !future;
  if(stateRef===world.state)checkpoint();
  stateRef=world.state;scene=world.scene;mapId=String(scene.location);distanceDebt=0;tickDebt=0;
  const slot=snapshotState(stateRef);future=!slot;if(future){adapter=null;return false;}
  validateSaved(slot);
  adapter=createProductionGroundAdapter({seed:SEED,maxMaps:1,maxEventIds:256,onEnvironmentEvent:notify});
  adapter.registerMap(mapId,{columns:scene.width,rows:scene.height,cellSize:1,originX:0,originZ:0,surfaceAt:(x,z)=>authoredGroundMaterial(scene,x,z)});
  const old=slot.maps[mapId];
  if(old&&old.width===scene.width&&old.height===scene.height){
   const snap=adapter.save(),dense=snap.maps[mapId];dense.elapsed=old.elapsed;
   for(const row of old.cells)for(let j=0;j<FIELDS.length;j++)dense.fields[FIELDS[j]][row[0]]=row[j+1];
   adapter.restore(snap);
  }
  notify({type:'ground-scene',mapId,scene});return true;
 }
 const nextId=()=>{const slot=snapshotState(world.state);return 'ground:'+mapId+':'+(++slot.sequence);};
 function surface(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y)||!ensure())return null;
  const q=adapter.surface(mapId,x,y);if(!q)return null;
  const a=authoredGroundMaterial(scene,x,y),m=getGroundMaterial(q.id),organic=/loam|earth|red|mud|silt/.test(q.id)?m.physics.permeability:.06;
  const wetBase=/water-(silt|mud|seep|deep|limestone)/.test(q.id)?.23:0;
  return {...q,...a,physics:m.physics,porous:m.physics.permeability,waterRetention:m.physics.permeability,hardness:1-m.physics.permeability,organic,rooted:q.grassAllowed?organic:0,
   element:m.realm==='Ash'?'ember':m.realm==='Water'?'tide':m.realm==='Aether'?'aether':'stone',shielding:q.groundShield,water:clamp(q.wetness+wetBase),wetness:clamp(q.wetness+wetBase),moisture:clamp(q.wetness+wetBase),resonance:m.physics.resonance,heat:q.temperature};
 }
 function onMovement(before){
  if(!ensure()||before.scene!==world.state.scene)return;
  const dx=world.state.x-before.x,dy=world.state.y-before.y,d=Math.hypot(dx,dy);
  if(d<=0||d>1.5)return;
  distanceDebt+=d;
  while(distanceDebt>=.74){
   distanceDebt-=.74;const fraction=clamp(1-distanceDebt/d),x=before.x+dx*fraction,y=before.y+dy*fraction;
   const event=adapter.footstep({mapId,x,z:y,eventId:nextId(),actor:'hero:'+world.state.party[0],speed:motion.sprinting?1.45:1,stealth:motion.stealth});
   if(event)notify({type:'campaign-footstep',x,y,scene,material:surface(x,y),sprinting:motion.sprinting,stealth:motion.stealth,noise:event.noise});
  }
 }
 const api={
  ensure,surface,sample:surface,checkpoint,
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  setMovement(value={}){motion={sprinting:!!value.sprinting,stealth:clamp(value.stealth)};},
  movementScale(x=world.state.x,y=world.state.y){const p=surface(x,y);if(!p)return 1;const traction=clamp(p.traction+livingArmoryFieldTraits(world.state,p).grip);return clamp(1-(1-traction)*.085-p.fracture*.025,.9,1);},
  update(dt){if(!ensure()||!Number.isFinite(dt)||dt<=0)return;tickDebt+=Math.min(.1,dt);if(tickDebt<.75)return;const elapsed=tickDebt;tickDebt=0;adapter.tick({mapId,elapsed,ambientHeat:0,rain:0,wind:.15});},
  impact(x,y,core,strength=.55){if(!ensure()||!world.walkable(x,y))return null;return adapter.impact({mapId,x,z:y,element:groundElement(core),strength:clamp(strength),eventId:nextId()});},
  applyDamage(amount,target,options={}){
   if(!Number.isFinite(amount)||amount<=0||options.dot||options.secondary)return amount;
   const g=surface(target.x,target.y);if(!g||!g.walkable)return amount;
   const element=groundElement(options.tech?.core||options.core),delta={fire:.11*g.temperature-.13*g.wetness,water:.10*g.temperature+.06*g.wetness,kinetic:.04*g.groundShield-.12*g.fracture,lightning:.12*g.conduction+.10*g.charge,frost:.08*g.wetness-.05*g.temperature,aether:.09*g.phase+.05*g.resonance}[element]||0;
   return amount*clamp(1+delta,.86,1.22);
  },
  battleEvent(e){
   if(!e||typeof e!=='object'||seenEvents.has(e))return;seenEvents.add(e);
   if(e.type==='cast'&&!e.tech?.healing){for(const t of e.targets||[e.target])if(t)api.impact(t.x,t.y,e.tech?.core,Math.min(.75,.24+(e.tech?.power||1)*.13));}
   else if(e.type==='enemy-cast'){for(const t of e.targets||[])api.impact(t.x,t.y,e.intent?.core||'physical',.42);}
   else if(e.type==='damage'&&e.physical&&!e.dot&&e.actor)api.impact(e.actor.x,e.actor.y,'physical',.14);
  },
  get scene(){ensure();return scene;},get registeredMaps(){ensure();return adapter?.registeredMaps||[];},
  stats(){ensure();const slot=snapshotState(world.state);return {version:1,materials:MATERIALS.length,maps:Object.keys(slot?.maps||{}).length,sequence:slot?.sequence||0,current:surface(world.state.x,world.state.y)};}
 };
 world.reconciledGround=world.groundForge=api;
 const move=world.move.bind(world);world.move=(dx,dy)=>{
  const before={scene:world.state.scene,x:world.state.x,y:world.state.y};
  // Route following uses the exact accepted displacement to detect walls.
  // Sample movementScale before the host chooses its requested step instead.
  const result=move(dx,dy);onMovement(before);return result;
 };
 const save=world.save.bind(world);world.save=()=>{ensure();checkpoint();return save();};
 for(const name of ['loadScene','restore','newGame']){
  const original=world[name].bind(world);
  world[name]=(...args)=>{
   let carriedGround=null;
   if(name==='newGame'&&sameOriginJourney(world.state,args[0])){ensure();checkpoint();carriedGround=structuredClone(world.state.environment?.groundV1||null);}
   if(name==='loadScene')checkpoint();
   if(name==='restore'){const incoming=typeof args[0]==='string'?JSON.parse(args[0]):args[0];validateSaved(incoming?.environment?.groundV1);}
   const result=original(...args);
   if(carriedGround){world.state.environment??={};world.state.environment.groundV1=carriedGround;stateRef=null;}
   ensure();return result;
  };
 }
 ensure();return api;
}

export function groundMaterialAt(world,x,y){return world.reconciledGround?.surface(x,y)||authoredGroundMaterial(world.scene,x,y);}

let atlas=null;
function groundAtlas(){if(atlas||typeof Image==='undefined')return atlas;atlas=new Image();atlas.src=new URL('./reconciled-content/ground/ground-forge-atlas.webp',import.meta.url).href;return atlas;}
/** Saved wet/char/charge/scar marks sit on the host's continuous authored floor.
 * The atlas is only an explicit fallback for a host that has no base material.
 */
export function drawReconciledGround(c,world,{x0=0,y0=0,x1=world.scene.width,y1=world.scene.height,time=0,compatibility=false,paintBaseMaterial=false}={}){
 const system=world.reconciledGround;if(!system)return;
 const scene=world.scene,p=groundPlan(scene),image=paintBaseMaterial?groundAtlas():null,ready=image?.complete&&image.naturalWidth>0;
 c.save();
 for(let y=Math.max(0,y0);y<Math.min(scene.height,y1);y++)for(let x=Math.max(0,x0);x<Math.min(scene.width,x1);x++){
  if(scene.floor[y]?.[x]!=='.'||p.rugs.has(x+','+y)||p.architecture.has(x+','+y))continue;
  const g=system.surface(x+.5,y+.5);if(!g)continue;
  const changed=g.wetness>.3||g.temperature>.08||g.fracture>.08||g.phase>.04||g.charge>.04||g.traffic>.05&&g.grassAllowed;
  if(!changed&&!(ready&&!g.grassAllowed))continue;
  // Household partition faces extend 34px over the cell above. Keep all marks,
  // not just texture, below the already painted architecture.
  const h=p.indoor&&p.partitions.has(x+','+(y+1))?14:TILE;
  c.save();c.beginPath();c.rect(x*TILE,y*TILE,TILE,h);c.clip();
  const ix=indexById.get(g.id)||0;
  if(ready&&!g.grassAllowed){
   c.globalAlpha=p.indoor?.24:compatibility?.27:.40;
   const tx=((x%4)+4)%4,ty=((y%4)+4)%4;
   c.drawImage(image,(ix%8)*192+tx*48,Math.floor(ix/8)*192+ty*48,48,h,x*TILE,y*TILE,TILE,h);
  }
  const xx=(x+.5)*TILE,yy=(y+.55)*TILE;
  if(g.wetness>.3){c.globalAlpha=Math.min(.22,g.wetness*.15);c.fillStyle='#82b2c1';c.beginPath();c.ellipse(xx,yy,20,8,0,0,7);c.fill();}
  if(g.temperature>.08){c.globalAlpha=Math.min(.5,g.temperature*.6);c.fillStyle='#241e20';c.beginPath();c.ellipse(xx,yy,19,12,0,0,7);c.fill();}
  if(g.fracture>.08){c.globalAlpha=clamp(g.fracture*.65,0,.65);c.strokeStyle='#171d25';c.lineWidth=1.2;c.beginPath();c.moveTo(xx-15,yy+5);c.lineTo(xx-4,yy-3);c.lineTo(xx+4,yy+2);c.lineTo(xx+17,yy-9);c.moveTo(xx-4,yy-3);c.lineTo(xx-8,yy-14);c.stroke();}
  if(g.phase>.04||g.charge>.04){c.globalAlpha=clamp(Math.max(g.phase,g.charge)*(.28+.10*Math.sin(time*3)),0,.6);c.strokeStyle=g.charge>g.phase?'#e8d59c':'#8acacb';c.lineWidth=1.2;c.beginPath();c.ellipse(xx,yy,16,6,0,0,7);c.stroke();}
  if(g.traffic>.05&&g.grassAllowed){c.globalAlpha=Math.min(.2,g.traffic*.3);c.fillStyle='#4f4130';c.beginPath();c.ellipse(xx,yy,11,4,0,0,7);c.fill();}
  c.restore();
 }
 c.restore();
}
