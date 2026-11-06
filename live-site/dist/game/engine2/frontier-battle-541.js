/** Rebase legacy frontier collision records without translating the encounter.
 * The native anchors/court never moved. Only positions made illegal by the new
 * landform are fitted, and combat counters/resources keep their saved values.
 * The host must validate its complete original enhanced save before calling. */
import {isAuthoredFrontier541,legacyFrontierFloor541,FRONTIER_LAYOUT_VERSION_541} from './frontier-authoring-541.js?v=5.41';
import {validCreatureEcology} from './creature-ecology.js';
import {validObjective} from './encounter-objectives.js';
import {validInstruments} from './combat-instruments.js';
import {validBattlefield} from './battlefield.js';
const copy=v=>JSON.parse(JSON.stringify(v));
const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
const point=p=>record(p)&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const key=p=>Math.floor(p.x)+','+Math.floor(p.y);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const PAIRS=[['x','y'],['fromX','fromY'],['endX','endY'],['toX','toY'],['targetX','targetY'],['x1','y1'],['x2','y2']];
function cellsFor(scene){const cells=[],blocked=new Set((scene.affordanceBlocked||[]).map(p=>p.join(',')));for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++)if(scene.floor[y]?.[x]==='.'&&!blocked.has(x+','+y))cells.push([x,y]);return cells;}
function actorShape(a){return point(a)&&['string','number'].includes(typeof a.id)&&['hp','maxHp','power','speed','atb'].every(k=>Number.isFinite(a[k]))&&a.hp>=0&&a.maxHp>0&&a.hp<=a.maxHp&&record(a.status)&&Object.values(a.status).every(Number.isFinite)&&(!('mp'in a)||Number.isFinite(a.mp)&&a.mp>=0&&Number.isFinite(a.maxMp)&&a.mp<=a.maxMp);}
function validateShape(b){
 if(!record(b)||!Array.isArray(b.heroes)||!b.heroes.length||!Array.isArray(b.enemies)||!b.enemies.length||![...b.heroes,...b.enemies].every(actorShape)||new Set([...b.heroes,...b.enemies].map(a=>a.id)).size!==b.heroes.length+b.enemies.length||!Array.isArray(b.fields)||!Array.isArray(b.delayed)||!Number.isFinite(b.time)||b.time<0)throw Error('The saved frontier encounter has invalid combat state.');
 if(!validCreatureEcology(b.ecology,b.enemies)||!validObjective(b.objective)||!validInstruments(b.instruments)||!validBattlefield(b.field,[...b.heroes,...b.enemies]))throw Error('The saved frontier encounter has invalid tactics or resources.');
}
function mask(raw,name,scene,walk,{exact=false,objects=false,empty=false,max=scene.width*scene.height}={}){
 if(raw===undefined)return;
 if(!Array.isArray(raw)||!empty&&!raw.length||raw.length>max)throw Error('The saved frontier '+name+' floor is invalid.');
 const seen=new Set();for(const p of raw){const xy=objects?[p?.x,p?.y]:p;if(!Array.isArray(xy)||xy.length!==2||!xy.every(Number.isInteger)||xy[0]<0||xy[1]<0||xy[0]>=scene.width||xy[1]>=scene.height)throw Error('The saved frontier '+name+' floor is invalid.');const k=xy.join(',');if(seen.has(k)||!walk.has(k))throw Error('The saved frontier '+name+' floor does not match its native map.');seen.add(k);}
 if(exact&&seen.size!==walk.size)throw Error('The saved frontier '+name+' floor does not match its native map.');
}
function checkMasks(b,scene,walk,{legacy=false}={}){
 mask(b.context?.engagement?.walkCells,'engagement',scene,walk,{exact:!legacy});mask(b.engagementFloor,'engagement',scene,walk,{exact:!legacy});
 mask(b.context?.walkable,'local',scene,walk,{empty:true});mask(b.context?.spatial?.walkable,'spatial',scene,walk,{empty:true});mask(b.context?.position?.walkable,'position',scene,walk,{empty:true});
 if(b.ecology?.enabled)mask(b.ecology.walkable,'ecology',scene,walk,{max:256});
 if(b.objective)mask(b.objective.walkable,'objective',scene,walk,{max:256});
 if(b.context?.objective?.walkable!==undefined)mask(b.context.objective.walkable,'objective context',scene,walk,{max:256});
 if(b.context?.objective?.walkCells!==undefined)mask(b.context.objective.walkCells,'objective context',scene,walk,{objects:true,max:256});
}
/** A version stamp never authorizes foreign masks or actors inside a wall.
 * Engagement captures are exact; bounded ecology/objective masks are subsets. */
export function validateFrontierBattleFloor(snapshot,scene){
 if(!snapshot||!isAuthoredFrontier541(scene))return true;validateShape(snapshot);const cells=cellsFor(scene),walk=new Set(cells.map(p=>p.join(','))),open=p=>point(p)&&walk.has(key(p));
 if(!cells.length||[...snapshot.heroes,...snapshot.enemies,...(snapshot.objective?.asset?[snapshot.objective.asset]:[])].some(a=>!open(a)))throw Error('The saved frontier battle contains an actor outside its native floor.');
 checkMasks(snapshot,scene,walk);return true;
}
function rawPointPairs(p){
 if(!record(p))return;for(const[x,y]of PAIRS)if(x in p||y in p){if(!Number.isFinite(p[x])||!Number.isFinite(p[y]))throw Error('The saved frontier position is invalid.');}
}
/** Signature matches the observatory adapter so the host can chain them. The
 * old/new player delta is deliberately unused: valid encounter actors stay put. */
export function migrateFrontierBattleSnapshot(snapshot,oldWorld,newWorld,scene){
 if(!snapshot||!isAuthoredFrontier541(scene)||oldWorld?.scene!==scene.location||newWorld?.scene!==scene.location)return snapshot;
 validateShape(snapshot);
 if(Number(oldWorld.frontierLayoutVersion)>=FRONTIER_LAYOUT_VERSION_541||Number(snapshot.context?.frontierLayoutVersion)>=FRONTIER_LAYOUT_VERSION_541){validateFrontierBattleFloor(snapshot,scene);return snapshot;}
 const ri=scene.frontierAuthoring541.regionIndex,phase=scene.frontierAuthoring541.phase,old=legacyFrontierFloor541(ri,phase),oldWalk=new Set(cellsFor(old).map(p=>p.join(',')));
 checkMasks(snapshot,old,oldWalk,{legacy:true});
 if([...snapshot.heroes,...snapshot.enemies,...(snapshot.objective?.asset?[snapshot.objective.asset]:[])].some(a=>!oldWalk.has(key(a))))throw Error('The legacy frontier battle contains an actor outside its original floor.');
 const b=copy(snapshot),cells=cellsFor(scene),walk=new Set(cells.map(p=>p.join(','))),open=p=>point(p)&&walk.has(key(p));if(!cells.length)throw Error('The frontier encounter has no native floor.');
 const nearest=(p,occupied=[])=>cells.map(([x,y])=>({x:x+.5,y:y+.5})).filter(q=>occupied.every(a=>distance(a,q)>=.55)).sort((a,z)=>distance(a,p)-distance(z,p)||a.y-z.y||a.x-z.x)[0];
 const fitted=new Map(),fit=p=>{if(!point(p)||open(p))return p;const id=p.x+','+p.y,q=fitted.get(id)||nearest(p);if(!q)throw Error('The frontier position has no legal landing.');fitted.set(id,q);p.x=q.x;p.y=q.y;return p;};
 const actors=[...b.heroes,...b.enemies],used=actors.filter(open).map(a=>({x:a.x,y:a.y}));
 for(const actor of actors){rawPointPairs(actor.intent);const prior={x:actor.x,y:actor.y};if(!open(actor)){const q=nearest(actor,used);if(!q)throw Error('The frontier encounter cannot place distinct actors.');actor.x=q.x;actor.y=q.y;used.push({x:q.x,y:q.y});
   if(actor.intent?.fromX===prior.x&&actor.intent?.fromY===prior.y){actor.intent.fromX=q.x;actor.intent.fromY=q.y;}
  }
 }
 const fitPairs=p=>{if(!record(p))return;rawPointPairs(p);for(const[x,y]of PAIRS)if(Number.isFinite(p[x])&&Number.isFinite(p[y])){const q={x:p[x],y:p[y]};fit(q);p[x]=q.x;p[y]=q.y;}};
 for(const actor of actors)fitPairs(actor.intent);
 for(const p of b.fields)fitPairs(p);
 for(const p of b.field?.props||[]){const owner=p.condition==='carried'?actors.find(a=>a.id===p.ownerId):null;if(!open(p)&&owner){p.x=owner.x;p.y=owner.y;}else fitPairs(p);}
 for(const p of b.field?.cover||[])fitPairs(p);
 const required=[...actors];
 const fitGroup=o=>{
  if(!record(o))return;fitPairs(o.asset);if(point(o.asset))required.push(o.asset);
  for(const p of [...(o.route||[]),...(o.safeNodes||[])]){fitPairs(p);if(point(p))required.push(p);}
 };
 fitGroup(b.objective);fitGroup(b.context?.objective);fitGroup(b.instruments);
 if(b.instruments){
  fitPairs(b.instruments.decoy);if(point(b.instruments.decoy))required.push(b.instruments.decoy);
  for(const c of b.instruments.coverage||[]){rawPointPairs(c);if(!open(c)){const prior={x:c.x,y:c.y};fit(c);const dx=c.x-prior.x,dy=c.y-prior.y;for(const[x,y]of[['x1','y1'],['x2','y2']]){c[x]+=dx;c[y]+=dy;}}required.push(c);}
  for(const p of b.instruments.analysis?.threats||[])fitPairs(p);
 }
 for(const p of b.context?.fieldProps||[]){fitPairs(p);if(Array.isArray(p.xy)){if(p.xy.length!==2||!p.xy.every(Number.isFinite))throw Error('The saved frontier prop position is invalid.');const q={x:p.xy[0],y:p.xy[1]};fit(q);p.xy=[q.x,q.y];}}
 for(const p of b.context?.recon?.points||[])fitPairs(p);fitPairs(b.context?.position);
 if(b.ecology?.enabled)for(const r of b.ecology.creatures||[]){fitPairs(r.den);fitPairs(r.lure);if(point(r.den))required.push(r.den);if(point(r.lure))required.push(r.lure);}
 // Build a connected bounded local topology around the already-fitted records.
 // Required endpoints are connected first; no objective progress is rebuilt.
 const localMask=(raw,extras=[])=>{
  const wanted=[...new Set([...required,...extras].filter(open).map(key))],allowed=new Set(),start=wanted[0]||cells[0].join(','),parents=new Map(),queue=[start],seen=new Set([start]);
  for(let i=0;i<queue.length;i++){const[x,y]=queue[i].split(',').map(Number);for(const[dx,dy]of[[1,0],[0,1],[-1,0],[0,-1]]){const id=(x+dx)+','+(y+dy);if(walk.has(id)&&!seen.has(id)){seen.add(id);parents.set(id,queue[i]);queue.push(id);}}}
  for(const end of wanted){if(!seen.has(end))throw Error('The frontier local floor has disconnected required positions.');let id=end;while(id&&!allowed.has(id)){allowed.add(id);id=parents.get(id);}}
  if(!allowed.size)allowed.add(start);if(allowed.size>256)throw Error('The frontier local floor exceeds its bounded battle budget.');
  const target=Math.min(256,Math.max(allowed.size,Array.isArray(raw)?raw.length:0,1)),seeds=[...allowed];
  for(let i=0;i<seeds.length&&allowed.size<target;i++){const[x,y]=seeds[i].split(',').map(Number);for(const[dx,dy]of[[1,0],[0,1],[-1,0],[0,-1]]){const id=(x+dx)+','+(y+dy);if(walk.has(id)&&!allowed.has(id)){allowed.add(id);seeds.push(id);if(allowed.size===target)break;}}}
  return [...allowed].map(id=>id.split(',').map(Number));
 };
 const rewrite=(o,name,{objects=false}={})=>{if(!o||o[name]===undefined)return;const raw=o[name],pairs=objects?raw.map(p=>[p.x,p.y]):raw,result=localMask(pairs);o[name]=objects?result.map(([x,y])=>({...raw.find(p=>p.x===x&&p.y===y),x,y})):result;};
 if(record(b.context)){
  rewrite(b.context,'walkable');rewrite(b.context.spatial,'walkable');rewrite(b.context.position,'walkable');rewrite(b.context.objective,'walkable');rewrite(b.context.objective,'walkCells',{objects:true});
  if(b.context.engagement?.walkCells!==undefined)b.context.engagement.walkCells=copy(cells);
 }
 if(b.engagementFloor!==undefined)b.engagementFloor=copy(cells);
 if(b.objective)b.objective.walkable=localMask(b.objective.walkable);
 if(b.ecology?.enabled)b.ecology.walkable=localMask(b.ecology.walkable);
 b.context??={};b.context.frontierLayoutVersion=FRONTIER_LAYOUT_VERSION_541;
 validateFrontierBattleFloor(b,scene);return b;
}
