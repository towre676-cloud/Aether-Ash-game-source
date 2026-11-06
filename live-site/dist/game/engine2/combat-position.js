/** Deliberate displacement uses the same known floor as the encounter. The
 * preview and the committed action share one solver, including collision and
 * diagonal corner checks. Missing topology never means an imaginary arena. */
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const alive=a=>a&&a.hp>0&&!a.withdrawn&&!a.ecology?.withdrawn;
const emit=(b,action,actor,target,extra={})=>b.event?.({type:'position',action,actor,target,...extra});
const cellKey=(x,y)=>Math.floor(x)+','+Math.floor(y);

export function topologyCells(b){
 const raw=b?.context?.walkable||b?.objective?.walkable||b?.context?.objective?.walkable||b?.context?.topology?.walkable;
 if(!Array.isArray(raw))return [];
 return [...new Map(raw.filter(p=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite)).map(p=>{const q=[Math.floor(p[0]),Math.floor(p[1])];return [q.join(','),q];})).values()].slice(0,512);
}
export function positionActors(b){return [...(b?.heroes||[]),...(b?.enemies||[]),...(b?.objective?.asset?[b.objective.asset]:[])].filter(alive);}
export function positionWalkable(b,p){return finitePoint(p)&&new Set(topologyCells(b).map(p=>p.join(','))).has(cellKey(p.x,p.y));}

function stepLegal(cells,from,to){
 if(!cells.has(cellKey(to.x,to.y)))return false;
 const fx=Math.floor(from.x),fy=Math.floor(from.y),tx=Math.floor(to.x),ty=Math.floor(to.y);
 // A diagonal cannot squeeze between two blocked corner cells.
 if(fx!==tx&&fy!==ty&&(!cells.has(tx+','+fy)||!cells.has(fx+','+ty)))return false;
 return true;
}
export function clearPositionLine(b,from,to){
 if(!finitePoint(from)||!finitePoint(to))return false;
 const cells=new Set(topologyCells(b).map(p=>p.join(',')));if(!cells.size||!cells.has(cellKey(from.x,from.y)))return false;
 const steps=Math.max(1,Math.ceil(distance(from,to)*12));let prior=from;
 for(let i=1;i<=steps;i++){const p={x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps};if(!stepLegal(cells,prior,p))return false;prior=p;}
 return true;
}

export function previewDisplacement(b,source,target,options={}){return previewRoute(b,source,target,options,3);}
function previewRoute(b,source,target,{mode='push',distance:requested=1.5}={},limit=3){
 const from={x:target?.x,y:target?.y},result={enabled:false,from,to:{...from},path:[],moved:0,blocked:null,collisionId:null,mode,distance:0,reason:''};
 if(!['push','pull'].includes(mode)||!finitePoint(source)||!finitePoint(target)||source===target){result.blocked='zero';result.reason='Choose a creature to reposition.';return result;}
 const cells=new Set(topologyCells(b).map(p=>p.join(',')));
 if(!cells.size||!cells.has(cellKey(target.x,target.y))||!cells.has(cellKey(source.x,source.y))){result.blocked='unknown';result.reason='The floor here has no verified displacement route.';return result;}
 let dx=target.x-source.x,dy=target.y-source.y,len=Math.hypot(dx,dy);
 if(len<.05){result.blocked='zero';result.reason='There is no clear direction between these actors.';return result;}
 if(mode==='pull'){dx=-dx;dy=-dy;}
 const budget=Math.max(0,Math.min(limit,Number(requested)||0)),steps=Math.max(1,Math.ceil(budget/.075)),unit={x:dx/len,y:dy/len};
 result.distance=budget;
 const others=positionActors(b).filter(a=>a!==target&&a.id!==target.id);
 let prior=from;
 for(let i=1;i<=steps;i++){
  const n=budget*i/steps,p={x:from.x+unit.x*n,y:from.y+unit.y*n};
  if(!stepLegal(cells,prior,p)){result.blocked='wall';break;}
  // Existing slight overlaps can separate, but never be pushed further inside
  // another actor. Pulling stops in front of the caster instead of merging.
  const hit=others.find(a=>distance(a,p)<.66&&distance(a,p)<distance(a,from)-.015);
  if(hit){result.blocked='actor';result.collisionId=hit.id;break;}
  result.path.push(p);prior=p;
 }
 result.to={...prior};result.moved=distance(from,prior);result.enabled=result.moved>=.15;
 result.reason=result.enabled?(result.blocked==='actor'?'Collision with '+(others.find(a=>a.id===result.collisionId)?.name||'another actor')+'.':result.blocked==='wall'?'Movement stops at the wall.':'A clear floor route.'):(result.blocked==='actor'?'There is no room before the other actor.':result.blocked==='wall'?'The wall leaves no room to move.':'No legal movement is available.');
 return result;
}

export function displaceActor(b,source,target,options={}){
 const preview=previewDisplacement(b,source,target,options);if(!preview.enabled)return {...preview,success:false};
 target.x=preview.to.x;target.y=preview.to.y;
 // A moved attacker keeps its committed aim: the next tell originates from
 // its actual new location. Relocating it can therefore invalidate an attack.
 if(target.intent){target.intent.fromX=target.x;target.intent.fromY=target.y;target.intent.positionShifted=true;}
 target.positionedUntil=(b.time||0)+8;
 emit(b,preview.mode,source,target,{...preview,label:target.name+' '+(preview.mode==='pull'?'pulled closer':'pushed back')});
 if(preview.collisionId!=null&&options.collateral!==false){
  const other=positionActors(b).find(a=>a.id===preview.collisionId),power=Math.max(2,Math.min(12,Math.round((source.power||12)*.22)));
  if(other){
   // Both participants are real actors. Damage goes through the normal shield,
   // reaction and defeat path; it cannot recursively displace or wear tools.
   b.damage?.(source,target,power,{physical:true,secondary:true});
   b.damage?.(source,other,Math.max(1,Math.round(power*.65)),{physical:true,secondary:true});
   if(target.hp>0){target.status??={};target.status.exposed=Math.max(target.status.exposed||0,2);}
   emit(b,'collision',source,target,{other,from:preview.from,to:preview.to,path:preview.path,label:target.name+' collides with '+other.name});
  }
 }
 return {...preview,success:true};
}

function commandReason(b,hero,target,action){
 if(!hero||!alive(hero)||!(b?.heroes||[]).includes(hero))return 'Choose a living crew member.';
 if(b.ended)return 'The encounter is finished.';
 if(hero.atb<1)return 'Wait until this crew member is ready.';
 if(!alive(target)||!(b.enemies||[]).includes(target))return 'Choose a living hostile creature.';
 if(target.boss)return 'This anchored guardian cannot be displaced.';
 if(!['push','pull'].includes(action))return 'Choose push or pull.';
 if(distance(hero,target)>3.2)return 'Move within three tiles to reposition it.';
 if(!clearPositionLine(b,hero,target))return 'A wall blocks the approach.';
 return '';
}
/** A paid formation action lets a selected companion separate without relying
 * on the overworld's group movement. Every candidate follows verified floor. */
export function crewSpread(b,hero){
 if(!b||b.context?.friendly||b.context?.tutorial)return {enabled:false,reason:'Formation tactics are quiet in this encounter.'};
 if(!alive(hero)||!finitePoint(hero)||!(b.heroes||[]).includes(hero))return {enabled:false,reason:'Choose a living crew member.'};
 let reason=b.ended?'The encounter is finished.':hero.atb<1?'Wait until this crew member is ready.':'';
 const allies=(b.heroes||[]).filter(a=>a!==hero&&alive(a)&&finitePoint(a));
 const conduit=b.enemies?.filter(alive).map(e=>e.intent).find(i=>i?.conduitCrew?.includes(hero.id)&&i.conduitCrew.some(id=>allies.some(a=>a.id===id)));
 const paired=conduit?.conduitCrew?.find(id=>id!==hero.id);
 const partner=allies.find(a=>a.id===paired)||allies.sort((a,z)=>distance(a,hero)-distance(z,hero))[0];
 if(!partner)return {enabled:false,reason:reason||'There is no other living crew member to spread from.'};
 if(paired!==undefined&&distance(hero,partner)>=4)return {enabled:false,reason:reason||'The named crew are already four tiles apart. Hold that separation.'};
 const candidates=[previewRoute(b,partner,hero,{mode:'push',distance:4},4)];
 for(const [dx,dy] of [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]])candidates.push(previewRoute(b,{x:hero.x-dx*.1,y:hero.y-dy*.1},hero,{mode:'push',distance:4},4));
 const preview=candidates.filter(p=>p.enabled).sort((a,z)=>distance(z.to,partner)-distance(a.to,partner))[0];
 if(!preview)reason||=paired!==undefined?'No clear floor is available. Break cuts one conduit; Guard or leave its remaining circle.':'No clear floor is available for spreading. Guard remains available.';
 else if(paired!==undefined&&distance(preview.to,partner)<4)reason||='No safe four-tile route creates the required split. Break cuts one end; Guard or leave the remaining circle.';
 else if(distance(preview.to,partner)<=distance(hero,partner)+.15)reason||='No safe route increases the crew’s separation from here.';
 return {enabled:!reason,reason,partnerId:partner.id,preview};
}
export function positionActions(b,hero,target){
 if(!b||b.context?.friendly||b.context?.tutorial)return [];
 const rows=['push','pull'].map(action=>{
  const preview=previewDisplacement(b,hero,target,{mode:action}),reason=commandReason(b,hero,target,action)||(!preview.enabled?preview.reason:'');
  return {action,label:(action==='push'?'Shove ':'Draw closer: ')+(target?.name||'selected creature'),detail:(action==='push'?'Push away':'Pull toward this crew member')+' along verified floor. Collisions hurt both actors; costs one ready action. '+preview.reason,enabled:!reason,reason,preview};
 });
 const spread=crewSpread(b,hero);rows.push({action:'separate',label:'Spread from the crew',detail:'Move this crew member up to four tiles along safe floor, away from the named conduit partner or nearest ally. Costs one ready action; no collision damage.',enabled:spread.enabled,reason:spread.reason,preview:spread.preview});return rows;
}
export function positionCommand(b,hero,target,request={}){
 if(request.action==='separate'){
  const spread=crewSpread(b,hero);if(!spread.enabled)return false;
  const p=spread.preview;hero.x=p.to.x;hero.y=p.to.y;hero.positionedUntil=(b.time||0)+8;hero.atb=0;hero.pose=.4;
  emit(b,'separate',hero,hero,{from:p.from,to:p.to,path:p.path,label:hero.name+' takes a separate safe position'});return true;
 }
 if(commandReason(b,hero,target,request.action))return false;
 const result=displaceActor(b,hero,target,{mode:request.action,distance:1.5});if(!result.success)return false;
 hero.atb=0;hero.pose=.4;hero.poseFrame=3;return true;
}

/** A redirected attack may cross another enemy. Friendly fire is deliberately
 * limited to aimed line attacks, so ordinary contact and burst moves retain
 * their authored behavior. The caller applies these using the normal hit path. */
export function positionCollateralTargets(b,attacker,intent){
 if(!attacker||intent?.shape!=='line'||intent.kind!=='strike'||b.context?.friendly||b.context?.tutorial)return [];
 const from={x:intent.fromX??attacker.x,y:intent.fromY??attacker.y},end={x:intent.x,y:intent.y};if(!finitePoint(from)||!finitePoint(end))return [];
 const dx=end.x-from.x,dy=end.y-from.y,len=Math.hypot(dx,dy);if(len<.05)return [];
 return (b.enemies||[]).filter(e=>e!==attacker&&alive(e)&&!e.boss&&(intent.instrumentDecoy||intent.positionShifted||e.positionedUntil>(b.time||0))).filter(e=>{
  const along=((e.x-from.x)*dx+(e.y-from.y)*dy)/len,across=Math.abs((e.x-from.x)*dy-(e.y-from.y)*dx)/len;
  return along>.3&&along<=len+3&&across<.6&&clearPositionLine(b,from,e);
 });
}
