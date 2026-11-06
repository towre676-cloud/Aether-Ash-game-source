/** Rebase a validated legacy Veyr encounter onto the authored observatory.
 * The world migration owns its new checkpoint. This isolated copy follows the
 * same translation, then fits actors to distinct native floor cells. Combat
 * resources, identities, timers, turns and outcomes are never regenerated.
 */
import {isObservatoryScene,OBSERVATORY_LAYOUT_VERSION} from './observatory-layout.js?v=5.38';

const copy=v=>JSON.parse(JSON.stringify(v));
const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const pairs=[['x','y'],['fromX','fromY'],['endX','endY'],['toX','toY'],['targetX','targetY'],['x1','y1'],['x2','y2']];
function nativeCells(scene){
 const cells=[],blocked=new Set((scene.affordanceBlocked||[]).map(p=>p.join(',')));
 for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++)if(scene.floor[y]?.[x]==='.'&&!blocked.has(x+','+y))cells.push([x,y]);
 return cells;
}

/** A layout marker is provenance, not permission to resume actors in walls or
 * trust a forged collision mask. Local ecology/objective captures may be a
 * subset of this map; an explicitly captured engagement floor must be exact.
 * Native encounters may omit that capture because the host attaches it.
 */
export function validateObservatoryBattleFloor(snapshot,scene){
 if(!snapshot||!isObservatoryScene(scene))return true;
 const cells=nativeCells(scene),walk=new Set(cells.map(p=>p.join(',')));
 const open=p=>point(p)&&walk.has(Math.floor(p.x)+','+Math.floor(p.y));
 const actors=[...(snapshot.heroes||[]),...(snapshot.enemies||[]),...(snapshot.objective?.asset?[snapshot.objective.asset]:[])];
 if(!cells.length||actors.some(a=>!open(a)))throw Error('The saved observatory battle contains an actor outside its native floor.');
 const captured=(raw,name,{exact=false,objects=false}={})=>{
  if(raw===undefined)return;
  if(!Array.isArray(raw)||!raw.length)throw Error('The saved observatory '+name+' floor is invalid.');
  const keys=new Set();
  for(const p of raw){const xy=objects?[p?.x,p?.y]:p;if(!Array.isArray(xy)||xy.length!==2||!xy.every(Number.isInteger))throw Error('The saved observatory '+name+' floor is invalid.');const key=xy.join(',');if(keys.has(key)||!walk.has(key))throw Error('The saved observatory '+name+' floor does not match the native map.');keys.add(key);}
  if(exact&&keys.size!==walk.size)throw Error('The saved observatory '+name+' floor does not match the native map.');
 };
 captured(snapshot.context?.engagement?.walkCells,'engagement',{exact:true});
 captured(snapshot.engagementFloor,'engagement',{exact:true});
 captured(snapshot.context?.walkable,'local');
 if(snapshot.ecology?.enabled)captured(snapshot.ecology.walkable,'ecology');
 if(snapshot.objective)captured(snapshot.objective.walkable,'objective');
 const spec=snapshot.context?.objective;
 if(spec?.walkable!==undefined)captured(spec.walkable,'objective context');
 else if(spec?.walkCells!==undefined)captured(spec.walkCells,'objective context',{objects:true});
 return true;
}

export function migrateObservatoryBattleSnapshot(snapshot,oldWorld,newWorld,scene){
 if(!snapshot||!isObservatoryScene(scene)||oldWorld?.scene!==scene.location||newWorld?.scene!==scene.location)return snapshot;
 if(Number(oldWorld?.observatoryLayoutVersion)>=OBSERVATORY_LAYOUT_VERSION){validateObservatoryBattleFloor(snapshot,scene);return snapshot;}
 if(![oldWorld?.x,oldWorld?.y,newWorld?.x,newWorld?.y].every(Number.isFinite))return snapshot;
 const dx=newWorld.x-oldWorld.x,dy=newWorld.y-oldWorld.y,b=copy(snapshot),cells=nativeCells(scene);
 if(!cells.length||cells.length>256)throw Error('The observatory encounter has no bounded native floor.');
 const walk=new Set(cells.map(p=>p.join(','))),open=p=>point(p)&&walk.has(Math.floor(p.x)+','+Math.floor(p.y));
 const shift=p=>{if(!p||typeof p!=='object')return;for(const[x,y]of pairs)if(Number.isFinite(p[x])&&Number.isFinite(p[y])){p[x]+=dx;p[y]+=dy;}};
 const nearest=(p,occupied=[])=>cells.map(([x,y])=>({x:x+.5,y:y+.5})).filter(q=>occupied.every(a=>distance(a,q)>=.55)).sort((a,z)=>distance(a,p)-distance(z,p)||a.y-z.y||a.x-z.x)[0];
 const fit=p=>{if(point(p)&&!open(p)){const q=nearest(p);if(q){p.x=q.x;p.y=q.y;}}};
 const move=p=>{shift(p);fit(p);};
 const used=[];
 for(const actor of [...(b.heroes||[]),...(b.enemies||[])]){
  shift(actor);shift(actor.intent);
  if(point(actor)&&(!open(actor)||used.some(p=>distance(p,actor)<.55))){const q=nearest(actor,used);if(q){actor.x=q.x;actor.y=q.y;}}
  if(point(actor))used.push({x:actor.x,y:actor.y});
 }
 for(const f of b.fields||[])move(f);
 for(const p of b.field?.props||[])move(p);
 for(const c of b.field?.cover||[])move(c);
 if(record(b.context)){
  if(Array.isArray(b.context.walkable))b.context.walkable=copy(cells);
  if(b.context.engagement&&Array.isArray(b.context.engagement.walkCells))b.context.engagement.walkCells=copy(cells);
  for(const p of Array.isArray(b.context.fieldProps)?b.context.fieldProps:[]){move(p);if(Array.isArray(p?.xy)&&p.xy.length===2&&p.xy.every(Number.isFinite)){const q={x:p.xy[0]+dx,y:p.xy[1]+dy};fit(q);p.xy=[q.x,q.y];}}
  const o=b.context.objective;if(record(o)){o.walkable=copy(cells);if(Array.isArray(o.walkCells))o.walkCells=cells.map(([x,y])=>({x,y}));move(o.asset);for(const p of Array.isArray(o.route)?o.route:[])move(p);for(const p of Array.isArray(o.safeNodes)?o.safeNodes:[])move(p);}
 }
 if(b.objective){b.objective.walkable=copy(cells);move(b.objective.asset);for(const p of b.objective.route||[])move(p);for(const p of b.objective.safeNodes||[])move(p);}
 if(b.instruments){
  move(b.instruments.asset);move(b.instruments.decoy);for(const p of b.instruments.safeNodes||[])move(p);
  for(const c of b.instruments.coverage||[]){shift(c);if(point(c)&&!open(c)){const q=nearest(c),sx=q.x-c.x,sy=q.y-c.y;for(const[x,y]of [['x','y'],['x1','y1'],['x2','y2']]){c[x]+=sx;c[y]+=sy;}}}
  for(const threat of b.instruments.analysis?.threats||[])shift(threat);
 }
 if(b.ecology?.enabled){b.ecology.walkable=copy(cells);for(const r of b.ecology.creatures||[]){move(r.den);move(r.lure);}}
 validateObservatoryBattleFloor(b,scene);return b;
}
