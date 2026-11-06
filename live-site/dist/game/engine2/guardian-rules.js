/** Milestone encounters change the answer to a charge, not the damage rules.
 * All pending work lives on the ordinary serializable enemy/intent records. */
import {cityAnswerOpening} from './city-answer.js?v=5.18.0';
const alive=a=>a&&a.hp>0&&!a.withdrawn;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const state=e=>e.guardianRuleState??={};
const emit=(b,e,label,extra={})=>b.event({type:'guardian-rule',actor:e,label,...extra});
export const GUARDIAN_RULES=Object.freeze({
 4:{id:'bell-return',name:'The answering bell',lesson:'The toll is followed by a return ring. Break silences the return; Guard catches it and opens the Herald.'},
 8:{id:'crown-conduits',name:'Divided conduits',lesson:'Use Tactics → Spread on a named crew member. Four tiles of separation grounds both conduits; Break cuts one marked end.'},
 16:{id:'mountain-resonators',name:'Load-bearing voices',lesson:'Break opens the resonators for six seconds. Target their parts nearby to remove a side of later waves.'},
 24:{id:'choir-answer',name:'An unfinished answer',lesson:'Break opens an answer. A different crew member must hit with a different element or an ordinary strike to finish it.'}
});
export const guardianRuleFor=chapter=>GUARDIAN_RULES[chapter]||null;
export function originSupportMode(b){const p=b.context?.originSupport;return p?.version===1&&p.region===b.chapter&&b.chapter!==4&&!b.context.friendly&&!b.context.tutorial&&['care','release'].includes(p.mode)?p.mode:null;}
export function prepareOriginSupport(b){if(originSupportMode(b)==='care')for(const h of b.heroes)h.status.shield=Math.max(h.status.shield||0,12);}
export function delayOriginCharge(b,event){const p=b.context?.originSupport;if(event.type!=='intent'||originSupportMode(b)!=='release'||p.spent||!b.enemies.includes(event.actor)||!['strike','alarm','objective-sabotage','ecology-grudge'].includes(event.intent?.kind))return;event.intent.left+=.6;event.intent.total+=.6;p.spent=true;event.intent.label+=' · the opened route buys a moment';}
/** Supplies, reactions and finite tools share the same interruption contract. */
export function interruptCharge(b,target,caster=null,{core='physical',stagger=2.2}={}){
 if(typeof b.interrupt==='function')return b.interrupt(target,caster,{core,stagger});
 const charged=!!target.intent;target.intent=null;target.atb=0;target.status??={};target.status.stagger=Math.max(target.status.stagger||0,stagger);
 if(charged)b.event?.({type:'interrupt',actor:target});return charged;
}
const circuit=b=>b.context?.bellCircuit?.version===1&&b.context.bellCircuit.repaired===true&&['shelter','lure'].includes(b.context.bellCircuit.mode)?b.context.bellCircuit.mode:null;

export function prepareGuardianIntent(b,e,intent){
 const rule=guardianRuleFor(b.chapter);if(!e.boss||!rule)return intent;
 if(![e.x,e.y,intent.x,intent.y].every(Number.isFinite))return intent;
 if(b.chapter===8&&intent.shape!=='pair')return intent;
 const i={...intent,guardianRule:rule.id,interruptHint:rule.lesson};
 if(b.chapter===4){
  i.returnWave={...intent,shape:'ring',x:e.x,y:e.y,fromX:e.x,fromY:e.y,inner:1.65,radius:4.5,power:intent.power*.7,left:2.2,total:2.2,recovery:2.4,status:undefined,guardianRule:rule.id,bellReturn:true,interruptHint:'Break silences this return. Guard catches it and opens the Herald.',counterplay:'Close into the calm center or Guard to catch the return.',label:'Answering bell · close into the calm center or Guard'};
  i.counterplay='Dodge the toll, then answer its return. Break silences the second wave.';
  i.label+=' · a return ring follows';
 }else if(b.chapter===8){
  const crew=b.heroes.filter(alive),first=crew.find(h=>h.id===i.target)||crew[0],second=crew.filter(h=>h!==first).sort((a,z)=>distance(z,first)-distance(a,first))[0];
  if(first&&second){
   i.conduitCrew=[first.id,second.id];i.shape='pair';i.points=[{x:first.x,y:first.y},{x:second.x,y:second.y}];i.radius=1.7;
   i.counterplay=first.name+' and '+second.name+': use Tactics → Spread to separate by four tiles and ground both conduits. Break cuts one end.';
   i.label='Divided conduits · '+i.counterplay;
  }
 }else if(b.chapter===16){
  i.counterplay=rule.lesson;
  i.label+=' · resonators sustain both sides';
 }else{
  i.counterplay=rule.lesson;i.label+=' · two different voices can interrupt';
 }
 return i;
}

/** Return true when the milestone handled interruption itself. Armor damage
 * still happens in the caller. Repeated hits cannot repeatedly weaken a wave. */
export function respondToGuardianInterrupt(b,e,caster,{core='physical'}={}){
 const i=e?.intent;if(!e?.boss||!i?.guardianRule)return false;
 if(i.guardianRule==='bell-return'){
  if(i.bellReturn){e.intent=null;e.atb=0;e.status.stagger=2.2;e.status.exposed=2.2;emit(b,e,'The answering bell falls silent · opening', {response:'cancel-return'});}
  else if(i.returnWave){delete i.returnWave;i.returnSilenced=true;i.counterplay='The return is silent. Dodge the remaining toll.';i.label='Damped bell · '+i.label;emit(b,e,'Break silences the return; the first toll still falls',{response:'silence-return'});}
  else emit(b,e,'The return is already silent; move clear of the first toll',{response:'return-already-silent'});
  return true;
 }
 if(i.guardianRule==='crown-conduits'&&i.conduitCrew?.length===2){
  if(i.severedCrew===undefined){
   const first=b.heroes.find(h=>h.id===i.conduitCrew[0]),second=b.heroes.find(h=>h.id===i.conduitCrew[1]);
   const index=caster&&first&&second&&distance(caster,second)<distance(caster,first)?1:0;
   i.severedCrew=i.conduitCrew[index];i.points=i.points.filter((_,n)=>n!==index);i.counterplay='One end is cut. Tactics → Spread separates the named crew; or leave the remaining marked circle.';
   i.label='One conduit severed · '+i.label;emit(b,e,'One conduit is severed; the other marked end remains',{response:'sever-conduit'});
  }else emit(b,e,'One conduit is already cut; separate or dodge the remaining end',{response:'conduit-already-cut'});
  return true;
 }
 if(i.guardianRule==='mountain-resonators'){
  e.status.resonatorOpening=6;
  if(!i.resonatorsOpened){i.resonatorsOpened=true;i.power*=.75;i.label='Resonators exposed · '+i.label;}
  i.counterplay='Resonators open for six seconds: approach and target a part, or dodge the weakened wave.';
  emit(b,e,'Break opens the resonators; target a part to silence its future waves',{response:'open-resonators'});return true;
 }
 if(i.guardianRule==='choir-answer'){
  if(!i.answer){i.answer={actorId:caster?.id??null,core:core||'physical'};i.left+=.8;i.total+=.8;i.counterplay='A different crew member must answer with a different element or an ordinary strike.';i.label='Answer held open · '+i.label;emit(b,e,'First voice holds the answer open · another crew member must finish it',{response:'begin-answer'});}
  return true;
 }
 return false;
}

export function answerGuardianHit(b,caster,target,{core=null,physical=false,dot=false,secondary=false}={}){
 const i=target?.intent,answer=i?.answer;
 if(!answer||!alive(caster)||!b.heroes.includes(caster)||dot||secondary)return;
 const voice=core||'physical';if(caster.id===answer.actorId||voice===answer.core)return;
 target.intent=null;target.atb=0;target.status.stagger=3;target.status.exposed=3;
 emit(b,target,'Two different voices complete the answer · Choir interrupted',{response:'complete-answer',source:caster});
 cityAnswerOpening(b,target,caster);
}

export function guardianTargets(b,e,i,targets){
 if(i.guardianRule!=='crown-conduits'||!i.conduitCrew)return targets;
 const pair=i.conduitCrew.map(id=>b.heroes.find(h=>h.id===id)).filter(alive);
 if(pair.length===2&&distance(pair[0],pair[1])>=4){
  i.conduitGrounded=true;e.armor=Math.max(0,e.armor-Math.max(12,e.maxArmor*.18));
  emit(b,e,'Separated voices ground the conduits · armor opens',{response:'ground-conduits'});return [];
 }
 return targets.filter(h=>h.id!==i.severedCrew);
}

/** Returns whether this one impact was caught before damage/status application. */
export function catchGuardianReturn(b,e,i,h){
 if(!i.bellReturn)return false;
 const s=state(e);
 if(circuit(b)==='shelter'&&!s.shelterReturnSpent){
  s.shelterCaught??=[];
  if(!s.shelterCaught.includes(h.id)){s.shelterCaught.push(h.id);emit(b,e,'The repaired shelter catches the return for '+h.name,{response:'shelter-catch',source:h});return true;}
 }
 if(!h.status.guard)return false;
 e.armor=Math.max(0,e.armor-Math.max(12,e.maxArmor*.12));s.returnGrounded=true;
 b.damage(h,e,Math.max(6,h.magic*.55),{core:'ward',secondary:true,color:'#d9e3bf'});
 emit(b,e,h.name+' catches the bell return · the Herald is grounded',{response:'guard-return',source:h});return true;
}

export function finishGuardianIntent(b,e,i){
 if(!e.boss)return;
 if(i.guardianRule==='bell-return'){
  const s=state(e);
  if(i.returnWave&&alive(e)){
   const next={...i.returnWave};
   if(circuit(b)==='lure'&&!s.lureReturnSpent){s.lureReturnSpent=true;next.left+=1.4;next.total+=1.4;e.status.exposed=next.left;next.label='Lured return · '+next.label;}
   e.intent=next;delete e.status.stagger;
   b.event({type:'intent',actor:e,intent:next});return;
  }
  if(i.bellReturn){s.shelterReturnSpent=true;if(s.returnGrounded){e.status.stagger=Math.max(e.status.stagger||0,3.2);e.status.exposed=Math.max(e.status.exposed||0,3.2);s.returnGrounded=false;}}
 }
 if(i.conduitGrounded){e.status.stagger=Math.max(e.status.stagger||0,3);e.status.exposed=Math.max(e.status.exposed||0,3);}
}

export function validGuardianState(enemies=[]){
 const id=v=>typeof v==='string'||Number.isInteger(v);
 for(const e of enemies){
  const s=e.guardianRuleState;
  if(s!==undefined&&(!s||typeof s!=='object'||Array.isArray(s)||['shelterReturnSpent','lureReturnSpent','returnGrounded'].some(k=>s[k]!==undefined&&typeof s[k]!=='boolean')||s.shelterCaught!==undefined&&(!Array.isArray(s.shelterCaught)||s.shelterCaught.length>7||s.shelterCaught.some(v=>!id(v)))))return false;
  for(const mark of [e.courierOpening,e.gearAnswer])if(mark!==undefined&&(!mark||!Number.isInteger(mark.owner)||mark.owner<0||mark.owner>6||!Number.isFinite(mark.until)||mark.until<0||mark.until>1e9))return false;
  const i=e.intent;if(!i)continue;
  if(i.guardianRule!==undefined&&!Object.values(GUARDIAN_RULES).some(r=>r.id===i.guardianRule))return false;
  if(i.answer!==undefined&&(!i.answer||!id(i.answer.actorId)&&i.answer.actorId!==null||typeof i.answer.core!=='string'||i.answer.core.length>24))return false;
  if(i.conduitCrew!==undefined&&(!Array.isArray(i.conduitCrew)||i.conduitCrew.length!==2||i.conduitCrew.some(v=>!id(v))))return false;
  if(i.disabledChannels!==undefined&&(!Array.isArray(i.disabledChannels)||i.disabledChannels.length>2||new Set(i.disabledChannels).size!==i.disabledChannels.length||i.disabledChannels.some(v=>v!==0&&v!==1)))return false;
  if(i.returnWave!==undefined&&(!i.returnWave||i.returnWave.bellReturn!==true||i.returnWave.shape!=='ring'||![i.returnWave.x,i.returnWave.y,i.returnWave.left,i.returnWave.total,i.returnWave.power].every(Number.isFinite)||i.returnWave.left<=0||i.returnWave.total<=0||i.returnWave.power<0||i.returnWave.returnWave!==undefined))return false;
 }
 return true;
}
