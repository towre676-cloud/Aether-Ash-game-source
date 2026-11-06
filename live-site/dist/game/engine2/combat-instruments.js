/** Portable listening, clay patterns and directional coverage share battle's
 * ordinary action budget. All state is plain JSON and all effects are bounded. */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const clone=v=>JSON.parse(JSON.stringify(v));
const aimed=i=>i&&['strike','objective-sabotage','objective-steal','ecology-grudge'].includes(i.kind)&&['single','line','burst'].includes(i.shape);
const alive=a=>a&&a.hp>0&&!a.withdrawn;
const family=e=>String(e.family||e.species||e.role||e.name||'creature').slice(0,100);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const emit=(b,action,actor,target,label,extra={})=>b.event?.({type:'instrument',action,actor,target,label,...extra});
const hash=s=>{let n=2166136261;for(const c of String(s))n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0).toString(36);};
const isNumber=n=>typeof n==='number'&&Number.isFinite(n);
const point=p=>p&&isNumber(p.x)&&isNumber(p.y)&&Math.abs(p.x)<100000&&Math.abs(p.y)<100000;
const signature=(e,i)=>({family:family(e),kind:i.kind,shape:i.shape});
function samePattern(p,e,i){return p.family===family(e)&&p.kind===i.kind&&p.shape===i.shape;}
function samplePattern(e,i){
 const s=signature(e,i),id='clay-'+hash([s.family,s.kind,s.shape].join(':'));
 return {id,name:String(e.name||'Creature').slice(0,80)+' · '+(i.shape==='line'?'cutting line':i.shape==='burst'?'burst rhythm':'aimed beat'),...s,
  windup:clamp(Number(i.instrumentOriginalTotal)||Number(i.total)||1.5,.2,20),power:clamp(Number(i.power)||0,0,10000),sourceLabel:String(i.label||'Observed charge').slice(0,160)};
}
function validPattern(p){return p&&typeof p.id==='string'&&p.id.length<=100&&typeof p.name==='string'&&p.name.length<=180&&typeof p.family==='string'&&p.family.length<=100&&['strike','objective-sabotage','objective-steal','ecology-grudge'].includes(p.kind)&&['single','line','burst'].includes(p.shape)&&isNumber(p.windup)&&p.windup>=.2&&p.windup<=20&&isNumber(p.power)&&p.power>=0&&p.power<=10000&&typeof p.sourceLabel==='string'&&p.sourceLabel.length<=160;}
function knownPatterns(value){
 const source=Array.isArray(value)?value:Array.isArray(value?.patterns)?value.patterns:[];
 const records=[];for(const p of source)if(validPattern(p)&&!records.some(v=>v.id===p.id)){records.push(clone(p));if(records.length===8)break;}return records;
}
export function normalizeCombatMemory(value){return {version:1,patterns:knownPatterns(value)};}
export function validCombatMemory(value){return value==null||value.version===1&&Array.isArray(value.patterns)&&value.patterns.length<=8&&value.patterns.every(validPattern)&&new Set(value.patterns.map(p=>p.id)).size===value.patterns.length;}
function putPattern(state,p){state.patterns=[p,...state.patterns.filter(v=>v.id!==p.id)].slice(0,8);}

export function createCombatInstruments(context={},heroes=[],enemies=[]){
 const spec=context.objective,enabled=!!spec&&!context.friendly&&!context.tutorial;
 const safeNodes=(spec?.safeNodes||[]).filter(point).slice(0,8).map((p,i)=>({id:String(p.id||'angle-'+i).slice(0,100),label:String(p.label||'Angle '+(i+1)).slice(0,100),x:p.x,y:p.y}));
 const asset=point(spec?.asset)?{x:spec.asset.x,y:spec.asset.y}:point(heroes[0])?{x:heroes[0].x,y:heroes[0].y}:{x:0,y:0};
 return {version:1,enabled,patterns:knownPatterns(context.clayMemory),sample:null,analysis:null,listenUses:2,replayUses:2,coverageUses:2,
  decoy:null,coverage:[],safeNodes,asset,sequence:0};
}

function currentTarget(b,target){return alive(target)&&aimed(target.intent)?target:(b.enemies||[]).find(e=>alive(e)&&aimed(e.intent));}
function readiness(b,h){
 if(!b.instruments?.enabled)return 'Listening tools are available during objective encounters.';
 if(!alive(h)||!(b.heroes||[]).includes(h))return 'Choose a living crew member.';
 if(b.ended)return 'This encounter is finished.';
 if(h.atb<1)return 'Wait until this crew member is ready.';
 return '';
}
function checkAction(b,h,target,request={}){
 const common=readiness(b,h);if(common)return common;const s=b.instruments;
 if(request.action==='listen'){
  if(s.listenUses<=0)return 'The hydrophone has used its two listening windows.';
  const o=b.objective,calibrates=['regulator','signal'].includes(o?.kind)&&!(o.calibration?.charges>0),e=currentTarget(b,target),hears=e&&!e.intent.instrumentHeard;
  if(!hears&&!calibrates)return o?.calibration?.charges>0?'The mechanism is already calibrated. Use that reading before listening again.':'Wait for a new readable charge or an uncalibrated pressure source.';
  return '';
 }
 if(request.action==='record'){
  const e=currentTarget(b,target);if(!e)return 'Wait for a creature to begin an aimed charge.';
  const p=samplePattern(e,e.intent);if(s.patterns.some(v=>v.id===p.id))return 'This rhythm is already retained in clay.';
  return '';
 }
 if(request.action==='replay'){
  if(s.replayUses<=0)return 'Both clay playback charges have been used.';
  if(s.decoy?.charges>0&&s.decoy.expiresAt>(b.time||0))return 'A clay decoy is already sounding.';
  if(!s.patterns.some(p=>p.id===request.patternId))return 'Record a charge before replaying its pattern.';
  if(!s.safeNodes.some(n=>n.id===request.nodeId))return 'Choose a marked safe angle.';
  return '';
 }
 if(request.action==='coverage'){
  if(s.coverageUses<=0)return 'Both directional coverage stakes have been deployed.';
  const n=s.safeNodes.find(n=>n.id===request.nodeId);if(!n)return 'Choose a marked safe angle.';
  if(distance(h,n)>3.2)return 'Move within three tiles of the marked angle.';
  if(distance(s.asset,n)<.35)return 'The angle needs space away from the protected site.';
  if(s.coverage.some(c=>c.nodeId===n.id&&c.charges>0))return 'This angle already has an active guard line.';
  return '';
 }
 return 'Choose a listening, memory or coverage action.';
}

export function instrumentActions(b,h,target){
 const s=b?.instruments;if(!s?.enabled)return [];const rows=[];
 const add=(request,label,detail)=>{const reason=checkAction(b,h,target,request);rows.push({...request,label,detail,hint:detail,enabled:!reason,reason});};
 add({action:'listen'},'Listen · hydrophone','Read pressure and threat clocks; give an unread charge one extra breath. Calibrate a regulator’s next release or a relay’s next shutdown; two windows per encounter.');
 add({action:'record'},'Record charge · clay memory','Retain the selected creature’s current aimed rhythm. The frozen pattern can travel into later encounters.');
 for(const p of s.patterns)for(const n of s.safeNodes)add({action:'replay',patternId:p.id,nodeId:n.id},'Replay '+p.name+' · '+n.label,'Sound this retained rhythm at the marked angle. The next matching aimed attack is drawn toward it once.');
 for(const n of s.safeNodes)add({action:'coverage',nodeId:n.id},'Guard angle · '+n.label,'Place a finite directional line. One aimed attack crossing it is intercepted; a burst or close contact bypasses it.');
 return rows;
}

export function instrumentCommand(b,h,target,request={}){
 if(checkAction(b,h,target,request))return false;const s=b.instruments,e=currentTarget(b,target);
 if(request.action==='listen'){
  const o=b.objective||{},spec=b.context?.objective||{};
  s.analysis={pressure:clamp(Number(o.pressure)||0,0,1000),remaining:Math.max(0,(Number(o.deadline)||Number(spec.deadline)||0)-(Number(o.elapsed)||0)),
   threats:(b.enemies||[]).filter(a=>alive(a)&&a.intent).slice(0,8).map(a=>({enemyId:a.id,label:String(a.intent.label||'Charge').slice(0,160),left:Math.max(0,Number(a.intent.left)||0),total:Math.max(.1,Number(a.intent.total)||.1),target:a.intent.target??null,x:Number(a.intent.x)||0,y:Number(a.intent.y)||0}))};
  if(e&&!e.intent.instrumentHeard){e.intent.instrumentOriginalTotal=e.intent.total;e.intent.left+=1.2;e.intent.total+=1.2;e.intent.instrumentHeard=true;s.sample=samplePattern(e,e.intent);}
  if(['regulator','signal'].includes(o.kind))o.calibration={kind:o.kind==='regulator'?'pressure':'relay',charges:1};
  s.listenUses--;h.atb=0;emit(b,'listen',h,e,o.kind==='regulator'?'Hydrophone calibrates the next pressure release':o.kind==='signal'?'Hydrophone finds a safe reply window':'Hydrophone finds the next beat · threats read');return true;
 }
 if(request.action==='record'){
  const p=samplePattern(e,e.intent);putPattern(s,p);s.sample=clone(p);h.atb=0;emit(b,'record',h,e,'Clay retains '+p.name,{pattern:p});return true;
 }
 if(request.action==='replay'){
  const p=s.patterns.find(p=>p.id===request.patternId),n=s.safeNodes.find(n=>n.id===request.nodeId);
  s.decoy={id:'clay-decoy-'+(++s.sequence),x:n.x,y:n.y,patternId:p.id,signature:{family:p.family,kind:p.kind,shape:p.shape},expiresAt:(b.time||0)+14,charges:1};
  s.replayUses--;h.atb=0;
  // A playback can catch an already announced attack as well as a future one.
  for(const enemy of b.enemies||[])if(alive(enemy)&&enemy.intent){const rewritten=instrumentIntent(b,enemy,enemy.intent);if(rewritten!==enemy.intent){enemy.intent=rewritten;break;}}
  emit(b,'replay',h,null,'Clay playback sounds at '+n.label,{decoy:s.decoy});return true;
 }
 if(request.action==='coverage'){
  const n=s.safeNodes.find(n=>n.id===request.nodeId),dx=n.x-s.asset.x,dy=n.y-s.asset.y,len=Math.hypot(dx,dy),tx=-dy/len*1.25,ty=dx/len*1.25;
  const line={id:'guard-line-'+(++s.sequence),nodeId:n.id,x:n.x,y:n.y,x1:n.x-tx,y1:n.y-ty,x2:n.x+tx,y2:n.y+ty,charges:1,ownerId:h.id};
  s.coverage.push(line);s.coverageUses--;h.atb=0;emit(b,'coverage',h,null,'Coverage line guards '+n.label,{line});return true;
 }
 return false;
}

/** The remembered shape is not an extra damaging spell. It changes a matching
 * creature's announced destination, and is then consumed exactly once. */
export function instrumentIntent(b,e,intent){
 const s=b.instruments,d=s?.decoy;if(!s?.enabled||!d||d.charges<=0||d.expiresAt<=(b.time||0)||!aimed(intent)||e.boss||intent.instrumentDecoy||!samePattern(d.signature,e,intent))return intent;
 d.charges=0;d.expiresAt=Math.min(d.expiresAt,(b.time||0)+4);
 const next={...intent,target:d.id,x:d.x,y:d.y,instrumentDecoy:true,label:'Drawn to clay echo · '+intent.label};
 emit(b,'deceive',e,null,'The remembered rhythm draws the attack aside',{decoy:d});return next;
}

export function advanceInstruments(b,dt=0){
 const s=b.instruments;if(!s?.enabled)return;if(s.decoy&&s.decoy.expiresAt<=(b.time||0))s.decoy=null;
 if(point(b.objective?.asset)){s.asset.x=b.objective.asset.x;s.asset.y=b.objective.asset.y;}
 if(s.analysis&&b.objective){const o=b.objective;s.analysis.pressure=clamp(Number(o.pressure)||0,0,1000);s.analysis.remaining=Math.max(0,(Number(o.deadline)||0)-(Number(o.elapsed)||0));s.analysis.threats=(b.enemies||[]).filter(a=>alive(a)&&a.intent).slice(0,8).map(a=>({enemyId:a.id,label:String(a.intent.label||'Charge').slice(0,160),left:Math.max(0,Number(a.intent.left)||0),total:Math.max(.1,Number(a.intent.total)||.1),target:a.intent.target??null,x:Number(a.intent.x)||0,y:Number(a.intent.y)||0}));}
}
function segmentsCross(a,b,c,d){
 const abx=b.x-a.x,aby=b.y-a.y,cdx=d.x-c.x,cdy=d.y-c.y,den=abx*cdy-aby*cdx;
 if(Math.abs(den)<1e-8)return false;
 const qx=c.x-a.x,qy=c.y-a.y,t=(qx*cdy-qy*cdx)/den,u=(qx*aby-qy*abx)/den;
 return t>.05&&t<.98&&u>=0&&u<=1;
}
export function interceptInstrumentHit(b,attacker,intent,target){
 const s=b.instruments;if(!s?.enabled||!alive(target)||!alive(attacker)||!['line','single'].includes(intent?.shape)||!(b.enemies||[]).includes(attacker)||!((b.heroes||[]).includes(target)||target.team==='heroes')||distance(attacker,target)<1.7)return false;
 const line=s.coverage.find(c=>c.charges>0&&segmentsCross(attacker,target,{x:c.x1,y:c.y1},{x:c.x2,y:c.y2}));if(!line)return false;
 line.charges=0;attacker.status??={};attacker.status.exposed=Math.max(attacker.status.exposed||0,2);attacker.atb=Math.min(attacker.atb||0,.25);
 emit(b,'coverage-block',target,attacker,'Guarded angle intercepts the attack · counter opening',{line});return true;
}

export function instrumentSummary(b){
 const s=b?.instruments;if(!s?.enabled)return '';
 return [s.analysis?'Hydrophone · pressure '+Math.round(s.analysis.pressure)+' · '+Math.ceil(s.analysis.remaining)+'s read':'Hydrophone · unread pressure',
  'Clay · '+s.patterns.length+' retained rhythms',s.decoy?.charges?'Echo sounding':'', 'Coverage · '+s.coverage.filter(c=>c.charges>0).length+' active lines'].filter(Boolean).join(' · ');
}

export function mergeCombatMemory(state,instruments){
 if(!state||!instruments?.enabled)return false;const prior=knownPatterns(state.clayMemory),records=knownPatterns([...instruments.patterns,...prior]);
 state.clayMemory={version:1,patterns:records};return true;
}

/** Optional state keeps old saves valid. Reject invalid line geometry and
 * orphaned replay patterns before a saved battle can replace the active one. */
export function validInstruments(s){
 if(s==null)return true;
 if(s.version!==1||typeof s.enabled!=='boolean'||!Array.isArray(s.patterns)||s.patterns.length>8||s.patterns.some(p=>!validPattern(p))||new Set(s.patterns.map(p=>p.id)).size!==s.patterns.length||!Array.isArray(s.safeNodes)||s.safeNodes.length>8||s.safeNodes.some(n=>!point(n)||typeof n.id!=='string'||typeof n.label!=='string')||new Set(s.safeNodes.map(n=>n.id)).size!==s.safeNodes.length||!point(s.asset)||!Array.isArray(s.coverage)||s.coverage.length>2||![s.listenUses,s.replayUses,s.coverageUses].every(n=>Number.isInteger(n)&&n>=0&&n<=2)||!Number.isInteger(s.sequence)||s.sequence<0||s.sequence>1000)return false;
 if(s.sample!==null&&!validPattern(s.sample))return false;
 if(s.analysis!==null&&(!s.analysis||!isNumber(s.analysis.pressure)||s.analysis.pressure<0||s.analysis.pressure>1000||!isNumber(s.analysis.remaining)||s.analysis.remaining<0||!Array.isArray(s.analysis.threats)||s.analysis.threats.length>8||s.analysis.threats.some(t=>!t||typeof t.label!=='string'||![t.left,t.total,t.x,t.y].every(isNumber)||t.left<0||t.total<=0)))return false;
 if(s.decoy!==null){const d=s.decoy,p=s.patterns.find(p=>p.id===d?.patternId);if(!point(d)||typeof d.id!=='string'||!p||!d.signature||d.signature.family!==p.family||d.signature.kind!==p.kind||d.signature.shape!==p.shape||!isNumber(d.expiresAt)||!Number.isInteger(d.charges)||d.charges<0||d.charges>1)return false;}
 const lines=new Set();for(const c of s.coverage){if(!c||typeof c.id!=='string'||lines.has(c.id)||!s.safeNodes.some(n=>n.id===c.nodeId)||![c.x,c.y,c.x1,c.y1,c.x2,c.y2].every(isNumber)||!Number.isInteger(c.charges)||c.charges<0||c.charges>1||!['string','number'].includes(typeof c.ownerId)||Math.hypot(c.x2-c.x1,c.y2-c.y1)<.2||Math.hypot(c.x2-c.x1,c.y2-c.y1)>3)return false;lines.add(c.id);}
 return true;
}
