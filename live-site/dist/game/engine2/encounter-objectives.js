/** Physical objectives share the battlefield with the crew. Their state and
 * routes are plain data so protecting a patient or disabling a relay can be
 * resumed with exactly the same threats, rather than restarting a timer. */
const KINDS=new Set(['escort','regulator','supply','signal']);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const number=(value,fallback,a,b)=>Number.isFinite(value)?clamp(value,a,b):fallback;
const point=value=>value&&Number.isFinite(value.x)&&Number.isFinite(value.y)?{x:value.x,y:value.y}:Array.isArray(value)&&value.length>=2&&value.slice(0,2).every(Number.isFinite)?{x:value[0],y:value[1]}:null;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const living=b=>(b.heroes||[]).filter(h=>h.hp>0);
const emit=(b,action,label,extra={})=>b.event?.({type:'objective',action,label,actor:b.objective?.asset,...extra});
const caches=new WeakMap();
function cellsFor(o){let cached=caches.get(o);if(!cached){cached=new Set(o.walkable.map(([x,y])=>Math.floor(x)+','+Math.floor(y)));caches.set(o,cached);}return cached;}
const open=(o,x,y)=>cellsFor(o).has(Math.floor(x)+','+Math.floor(y));

function clearLine(o,from,to){const steps=Math.max(1,Math.ceil(distance(from,to)*5));for(let i=1;i<=steps;i++){const t=i/steps;if(!open(o,from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t))return false;}return true;}

/** A small four-neighbour route prevents objective movement through partitions. */
function pathTo(o,from,to,radius=0){
 const start=[Math.floor(from.x),Math.floor(from.y)],q=[start],seen=new Set([start.join(',')]),prior=new Map();let end=null;
 for(let i=0;i<q.length&&i<300;i++){
  const [x,y]=q[i];if(Math.hypot(x+.5-to.x,y+.5-to.y)<=radius&&clearLine(o,{x:x+.5,y:y+.5},to)||x===Math.floor(to.x)&&y===Math.floor(to.y)){end=[x,y];break;}
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const p=[x+dx,y+dy],key=p.join(',');if(open(o,p[0],p[1])&&!seen.has(key)){seen.add(key);prior.set(key,[x,y]);q.push(p);}}
 }
 if(!end)return [];const result=[];
 while(end.join(',')!==start.join(',')){result.unshift({x:end[0]+.5,y:end[1]+.5});end=prior.get(end.join(','));}
 return result;
}

export function createObjective(context={},heroes=[],enemies=[]){
 const spec=context.objective;if(!spec||!KINDS.has(spec.kind)||context.friendly||context.tutorial)return null;
 let walkable=Array.isArray(spec.walkable)?spec.walkable:Array.isArray(spec.walkCells)?spec.walkCells.map(p=>[p.x,p.y]):[];
 if(!walkable.length&&Array.isArray(spec.floor))spec.floor.forEach((row,y)=>{for(let x=0;x<row.length;x++)if(row[x]==='.')walkable.push([x,y]);});
 walkable=[...new Map(walkable.filter(p=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite)).map(([x,y])=>[[Math.floor(x),Math.floor(y)].join(','),[Math.floor(x),Math.floor(y)]])).values()].slice(0,256);
 if(!walkable.length)return null;
 const initial=point(spec.asset)||point(heroes[0])||{x:walkable[0][0]+.5,y:walkable[0][1]+.5};
 const o={version:1,id:String(spec.id||'objective-'+spec.kind).slice(0,120),kind:spec.kind,label:String(spec.label||({escort:'Escort the patient',regulator:'Stabilize the regulator',supply:'Secure the supplies',signal:'Silence the signal'})[spec.kind]).slice(0,180),walkable,
  asset:{id:String(spec.asset?.id||'protected-'+spec.kind).slice(0,120),name:String(spec.asset?.name||({escort:'Patient',regulator:'Pressure regulator',supply:'Supply cache',signal:'Signal relay'})[spec.kind]).slice(0,100),x:initial.x,y:initial.y,hp:number(spec.asset?.hp,120,1,5000),maxHp:number(spec.asset?.maxHp,spec.asset?.hp||120,1,5000),status:{},team:'heroes',objective:true,objectiveActor:true,armor:0,maxArmor:0},
  route:[],routeIndex:1,safeNodes:(spec.safeNodes||[]).map(point).filter(Boolean).slice(0,12),elapsed:0,deadline:number(spec.deadline??spec.duration??spec.alarmDelay,spec.kind==='signal'?42:90,10,300),
  required:Math.round(number(spec.required??spec.requiredActions,3,1,6)),progress:0,pressure:number(spec.pressure,36,0,95),stable:0,stableTime:number(spec.stableTime,6,1,20),speed:number(spec.speed,.35,.1,1),
  calibration:null,replyWindow:false,thefts:0,maxThefts:Math.round(number(spec.maxThefts,3,1,6)),escorting:false,detouring:false,routeBlocked:false,complete:false,failed:false,resultReason:'',provenance:(spec.provenance||[]).filter(p=>typeof p==='string').slice(0,12),pattern:(spec.pattern||[]).slice(0,12)};
 if(!open(o,o.asset.x,o.asset.y)){const p=walkable.map(([x,y])=>({x:x+.5,y:y+.5})).sort((a,b)=>distance(a,initial)-distance(b,initial))[0];o.asset.x=p.x;o.asset.y=p.y;}
 o.asset.hp=Math.min(o.asset.hp,o.asset.maxHp);o.route=[{x:o.asset.x,y:o.asset.y}];
 for(const raw of spec.route||[]){const p=point(raw);if(!p||!open(o,p.x,p.y))continue;const from=o.route.at(-1);if(distance(from,p)<.05)continue;const section=pathTo(o,from,p);o.route.push(...section);if(o.route.length>80){o.route=o.route.slice(0,80);break;}}
 if(o.kind==='escort'&&o.route.length<2){const p=o.safeNodes.find(p=>distance(p,o.asset)>1&&open(o,p.x,p.y));if(p)o.route.push(...pathTo(o,o.asset,p));if(o.route.length<2)return null;}
 return o;
}

export function objectiveActors(b){return b?.objective?[b.objective.asset]:[];}
function active(b){return !!b?.objective&&!b.objective.complete&&!b.objective.failed&&!b.ended;}
function stepAsset(o,budget){
 while(budget>0&&o.routeIndex<o.route.length){const p=o.route[o.routeIndex],d=distance(o.asset,p);if(d<.001){o.routeIndex++;continue;}const step=Math.min(d,budget);o.asset.x+=(p.x-o.asset.x)/d*step;o.asset.y+=(p.y-o.asset.y)/d*step;budget-=step;if(step===d)o.routeIndex++;}
}
function detour(o,enemies){
 const start=[Math.floor(o.asset.x),Math.floor(o.asset.y)],end=o.route.at(-1),q=[start],seen=new Set([start.join(',')]),prior=new Map();let found=null;
 for(let i=0;i<q.length&&i<300;i++){const [x,y]=q[i];if(x===Math.floor(end.x)&&y===Math.floor(end.y)){found=[x,y];break;}for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const p=[x+dx,y+dy],key=p.join(','),center={x:p[0]+.5,y:p[1]+.5};if(open(o,p[0],p[1])&&!seen.has(key)&&enemies.every(e=>e.hp<=0||e.withdrawn||distance(e,center)>=1.35)){seen.add(key);prior.set(key,[x,y]);q.push(p);}}}
 if(!found)return false;const rest=[];while(found.join(',')!==start.join(',')){rest.unshift({x:found[0]+.5,y:found[1]+.5});found=prior.get(found.join(','));}if(!rest.length)return false;
 const history=o.route.slice(0,o.routeIndex),current={x:o.asset.x,y:o.asset.y};o.route=[...history,current,...rest];o.routeIndex=history.length+1;if(o.route.length>80){o.route=[current,...rest];o.routeIndex=1;}o.detouring=true;return true;
}
function complete(b,reason){const o=b.objective;if(o.complete||o.failed)return;o.complete=true;o.resultReason=reason;emit(b,'complete',reason);}
function fail(b,reason){const o=b.objective;if(o.complete||o.failed)return;o.failed=true;o.resultReason=reason;emit(b,'failed',reason);}

export function advanceObjective(b,dt){
 if(!active(b))return;const o=b.objective;dt=number(dt,0,0,.25);o.elapsed+=dt;
 if(o.asset.hp<=0){fail(b,o.asset.name+' is lost. Pull back and try another approach.');return;}
 if(o.kind==='escort'){
  const accompanied=living(b).some(h=>distance(h,o.asset)<=3),blockers=(b.enemies||[]).filter(e=>e.hp>0&&!e.withdrawn&&distance(e,o.asset)<1.35),next=o.route[o.routeIndex],escaping=o.detouring&&next&&blockers.every(e=>distance(next,e)>distance(o.asset,e)+.01);o.routeBlocked=blockers.length>0&&!escaping;
  if(o.escorting&&accompanied&&!o.routeBlocked)stepAsset(o,dt*o.speed*(o.asset.status.slow?.5:1));
  if(o.escorting&&o.routeIndex>=o.route.length)complete(b,'The patient reaches the safe route.');
 }else if(o.kind==='regulator'){
  o.pressure=Math.min(100,o.pressure+dt*(o.progress>=o.required?.7:1.8));
  if(o.pressure>=100){fail(b,'The regulator overloads. The crew pulls back.');return;}
  o.stable=o.progress>=o.required&&o.pressure<30?o.stable+dt:0;
  if(o.stable>=o.stableTime)complete(b,'The regulator holds a safe pressure.');
 }else if(o.kind==='supply'){
  if(o.thefts>=o.maxThefts)fail(b,'The scavengers escape with the supplies.');
  else if(o.progress>=o.required)complete(b,'The supplies are secured. The remaining scavengers scatter.');
 }else if(o.kind==='signal'&&o.progress>=o.required)complete(b,'The signal is disabled before help can answer.');
 if(!o.complete&&!o.failed&&o.elapsed>=o.deadline)fail(b,o.kind==='signal'?'The relay completes its call. Reinforcements force a withdrawal.':'The protection window closes. Regroup and try again.');
}

export function objectiveResult(b){
 const o=b?.objective;if(!o)return null;
 if(o.asset.hp<=0||o.failed||o.kind==='regulator'&&o.pressure>=100||o.kind==='supply'&&o.thefts>=o.maxThefts)return 'loss';
 if(o.complete)return 'win';
 if(!(b.enemies||[]).some(e=>e.hp>0&&!e.withdrawn)){complete(b,'The threat is cleared and '+o.asset.name.toLowerCase()+' is safe.');return 'win';}
 return null;
}

/** Creatures alternate objective pressure with their normal combat plans. */
export function objectiveEnemyIntent(b,e){
 if(!active(b)||!e||e.hp<=0||e.boss||e.rivalAvatar!==undefined)return null;
 e.objectiveTurns=(e.objectiveTurns||0)+1;if(e.objectiveTurns%2===0)return null;
 const o=b.objective,asset=o.asset,range=o.kind==='supply'?1.55:2.4,near=distance(e,asset)<=range&&clearLine(o,e,asset);
 if(!near&&!pathTo(o,e,asset,range*.85).length)return null;
 const kind=near?(o.kind==='supply'?'objective-steal':'objective-sabotage'):'objective-advance';
 const label=kind==='objective-advance'?'Closing on '+asset.name:kind==='objective-steal'?'Stealing the supplies':o.kind==='signal'?'Reconnecting the signal':o.kind==='regulator'?'Striking the regulator':'Aiming at the patient';
 return {kind,target:asset.id,targetKind:'objective',objectiveId:o.id,shape:kind==='objective-sabotage'?'line':'single',x:asset.x,y:asset.y,fromX:e.x,fromY:e.y,left:kind==='objective-advance'?1.5:2.2,total:kind==='objective-advance'?1.5:2.2,power:Math.max(6,Math.round((e.power||10)*.85)),label};
}

/** Redirected clay patterns keep their changed aim: they never snap back to the
 * objective at impact. Field or instrument cover can intercept a valid hit. */
export function executeObjectiveIntent(b,e,i,{intercept=()=>false}={}){
 if(!String(i?.kind||'').startsWith('objective-'))return false;
 const o=b.objective;if(!active(b)||!e||e.hp<=0||i.objectiveId!==o.id)return true;
 if(i.kind==='objective-advance'){
  const route=pathTo(o,e,{x:i.x,y:i.y},1.2);if(route.length){e.x=route[0].x;e.y=route[0].y;emit(b,'advance',e.name+' moves toward '+o.asset.name,{source:e});}return true;
 }
 const asset=o.asset,reach=o.kind==='supply'?1.7:2.65;
 if(i.target!==asset.id||distance(asset,{x:i.x,y:i.y})>1.3||distance(e,asset)>reach||!clearLine(o,e,asset)){emit(b,'evaded','The threat misses its objective.',{source:e});return true;}
 if(intercept(b,e,i,asset)){emit(b,'intercepted','The objective is protected from the attack.',{source:e});return true;}
 if(i.kind==='objective-steal'){
  o.thefts++;o.progress=Math.max(0,o.progress-1);emit(b,'theft','Supplies lost · '+o.thefts+' / '+o.maxThefts,{source:e});
 }else{
  if(typeof b.damage==='function')b.damage(e,asset,i.power,{physical:true,color:'#e7b38b'});else asset.hp=Math.max(0,asset.hp-i.power);
  if(o.kind==='regulator'){o.pressure=Math.min(100,o.pressure+14);o.stable=0;}
  if(o.kind==='signal'){if(o.replyWindow){o.replyWindow=false;emit(b,'reply-window','The listening window rejects the reconnect signal.',{source:e});}else o.progress=Math.max(0,o.progress-1);}
  emit(b,'sabotage',asset.name+' is under attack.',{source:e});
 }
 if(asset.hp<=0)fail(b,asset.name+' is lost.');else if(o.kind==='supply'&&o.thefts>=o.maxThefts)fail(b,'The scavengers escape with the supplies.');return true;
}

const verb=o=>({escort:'guide',regulator:'stabilize',supply:'secure',signal:'disable'})[o.kind];
function actionReason(b,h,action){
 if(!active(b))return 'This objective is already resolved.';
 if(!h||h.hp<=0||!(b.heroes||[]).includes(h))return 'Choose a living crew member.';
 if(h.atb<1)return 'Wait until this crew member is ready.';
 if(distance(h,b.objective.asset)>2.8)return 'Move within reach of '+b.objective.asset.name+'.';
 if(action==='repair')return b.objective.asset.hp>=b.objective.asset.maxHp?'The objective is already intact.':'';
 if(action!==verb(b.objective))return 'Choose the action for this objective.';
 if(b.objective.kind==='supply'&&b.objective.progress>=b.objective.required)return 'The supplies are already secure.';
 return '';
}
export function objectiveActions(b,h){
 const o=b?.objective;if(!o||o.complete||o.failed)return [];
 const labels={escort:o.escorting?'Guide and protect the patient':'Lead the patient',regulator:'Stabilize the regulator',supply:'Secure a supply bundle',signal:['Ground the relay','Disconnect the carrier','Silence the signal'][Math.min(2,o.progress)]};
 const details={escort:'Begin the escape route. Stay within three tiles; nearby foes block progress. Guiding again shields the patient briefly.',regulator:'Lower pressure and restore one control stage. Keep it stable after all stages are set.',supply:'Secure one bundle before a scavenger steals it. Lost bundles must be secured again.',signal:'Complete the next shutdown stage before the relay finishes calling. Sabotage can reconnect a stage.'};
 const rows=[{action:verb(o),label:labels[o.kind],detail:details[o.kind]}];
 if(o.asset.hp<o.asset.maxHp)rows.push({action:'repair',label:o.kind==='escort'?'Treat the patient':'Repair '+o.asset.name,detail:'Restore part of the protected objective’s health. Costs one ready action.'});
 return rows.map(row=>{const reason=actionReason(b,h,row.action);return {...row,hint:row.detail,enabled:!reason,reason,cost:1,targetId:o.asset.id};});
}

export function objectiveCommand(b,h,target,request={}){
 const action=request.action;if(actionReason(b,h,action))return false;const o=b.objective;h.atb=0;
 if(action==='repair'){o.asset.hp=Math.min(o.asset.maxHp,o.asset.hp+Math.max(22,Math.round((h.magic||24)*.85)));emit(b,'repair',o.asset.name+' recovers.');return true;}
 if(action==='guide'){o.escorting=true;o.asset.status.shield=Math.max(o.asset.status.shield||0,18);const blocked=(b.enemies||[]).some(e=>e.hp>0&&!e.withdrawn&&distance(e,o.asset)<1.35),around=blocked&&detour(o,b.enemies||[]);if(!blocked||around)stepAsset(o,.45);o.routeBlocked=blocked&&!around;emit(b,'guide',around?'The patient takes a protected detour.':blocked?'The route is blocked. Clear or displace the creature.':'The patient follows the protected route.');}
 if(action==='stabilize'){const calibrated=o.calibration?.kind==='pressure'&&o.calibration.charges>0;if(calibrated)o.calibration=null;o.progress=Math.min(o.required,o.progress+1);o.pressure=Math.max(0,o.pressure-(calibrated?45:30));emit(b,'stabilize','Pressure lowered · '+o.progress+' / '+o.required+' controls set.');}
 if(action==='secure'){o.progress=Math.min(o.required,o.progress+1);emit(b,'secure','Supply bundle secured · '+o.progress+' / '+o.required);}
 if(action==='disable'){if(o.calibration?.kind==='relay'&&o.calibration.charges>0){o.calibration=null;o.replyWindow=true;}o.progress=Math.min(o.required,o.progress+1);emit(b,'disable','Signal shutdown · '+o.progress+' / '+o.required);}
 if(o.kind==='supply'&&o.progress>=o.required)complete(b,'The supplies are secured. The remaining scavengers scatter.');
 if(o.kind==='signal'&&o.progress>=o.required)complete(b,'The signal is disabled before help can answer.');
 if(o.kind==='escort'&&o.routeIndex>=o.route.length)complete(b,'The patient reaches the safe route.');return true;
}

export function objectiveSummary(b){
 const o=b?.objective;if(!o)return null;const remaining=Math.max(0,o.deadline-o.elapsed),progress=o.kind==='escort'?Math.max(0,o.routeIndex-1):o.progress,required=o.kind==='escort'?Math.max(1,o.route.length-1):o.required;
 const text=o.complete?o.resultReason:o.failed?o.resultReason:o.kind==='escort'?(o.escorting?(o.routeBlocked?'Route blocked · guide a detour or displace the creature':'Escort the patient to the marked exit · stay close'):'Lead the patient, then protect the route'):o.kind==='regulator'?'Controls '+o.progress+'/'+o.required+' · pressure '+Math.round(o.pressure)+'% · stable '+Math.floor(o.stable)+'/'+o.stableTime+'s':o.kind==='supply'?'Secured '+o.progress+'/'+o.required+' · stolen '+o.thefts+'/'+o.maxThefts:'Shutdown '+o.progress+'/'+o.required+' · call completes in '+Math.ceil(remaining)+'s';
 return {label:o.label,kind:o.kind,text,progress,value:clamp(progress/required,0,1),remaining,assetHP:o.asset.hp,maxHP:o.asset.maxHp,warning:o.asset.hp/o.asset.maxHp<.4?o.asset.name+' needs protection':remaining<12?'The protection window is closing':o.kind==='regulator'&&o.pressure>75?'Pressure is dangerously high':o.thefts>0?'Scavengers have taken supplies':'',complete:o.complete,failed:o.failed};
}

export function validObjective(o){
 if(o==null)return true;
 if(o.version!==1||!KINDS.has(o.kind)||typeof o.id!=='string'||typeof o.label!=='string'||!o.asset||o.asset.team!=='heroes'||o.asset.objective!==true||o.asset.objectiveActor!==true||typeof o.asset.id!=='string'||![o.asset.x,o.asset.y,o.asset.hp,o.asset.maxHp].every(Number.isFinite)||o.asset.hp<0||o.asset.maxHp<=0||o.asset.hp>o.asset.maxHp||o.asset.maxHp>5000||!o.asset.status||typeof o.asset.status!=='object'||Array.isArray(o.asset.status))return false;
 if(!Array.isArray(o.walkable)||!o.walkable.length||o.walkable.length>256||o.walkable.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isInteger)))return false;
 if(!Array.isArray(o.route)||o.route.length>80||o.route.some(p=>!p||![p.x,p.y].every(Number.isFinite)||!open(o,p.x,p.y))||!open(o,o.asset.x,o.asset.y)||!Number.isInteger(o.routeIndex)||o.routeIndex<0||o.routeIndex>o.route.length)return false;
 if(![o.elapsed,o.deadline,o.required,o.progress,o.pressure,o.stable,o.stableTime,o.speed,o.thefts,o.maxThefts].every(Number.isFinite)||o.elapsed<0||o.elapsed>3600||o.deadline<10||o.deadline>300||o.required<1||o.required>6||!Number.isInteger(o.required)||!Number.isInteger(o.progress)||o.progress<0||o.progress>o.required||o.pressure<0||o.pressure>100||o.stable<0||o.stable>300||o.stableTime<1||o.stableTime>20||o.speed<.1||o.speed>1||!Number.isInteger(o.thefts)||o.thefts<0||o.thefts>6||!Number.isInteger(o.maxThefts)||o.maxThefts<1||o.maxThefts>6)return false;
 if(o.calibration!=null&&(!['pressure','relay'].includes(o.calibration.kind)||o.calibration.charges!==1)||o.replyWindow!==undefined&&typeof o.replyWindow!=='boolean')return false;
 if(['detouring','routeBlocked'].some(key=>o[key]!==undefined&&typeof o[key]!=='boolean'))return false;
 if(!['complete','failed','escorting'].every(key=>typeof o[key]==='boolean')||o.complete&&o.failed||!Array.isArray(o.safeNodes)||o.safeNodes.length>12||o.safeNodes.some(p=>!point(p))||!Array.isArray(o.provenance)||o.provenance.length>12||o.provenance.some(p=>typeof p!=='string')||!Array.isArray(o.pattern)||o.pattern.length>12)return false;
 return true;
}
