import {ORIGINS} from './origin-content.js?v=5.18.0';
import {originPayoff} from './origin-payoffs.js?v=5.18.0';

/** Communities contribute particular help, never a score or a completion gate.
 * World descriptions are pure. Battle uses live only in context.cityAnswer,
 * so a saved warning, guarded hit or first respite cannot be claimed twice. */
const CREW=['Sable','Iona','Rook','Brass','Riven','Mira','Veyr'];
const ORDER=['return','care','witness','commons'];
const EFFECTS=Object.freeze({
 return:{kind:'delay',label:'A return kept open',detail:'The Choir’s first warning lasts 1.2 seconds longer. Several working returns share this one pause.'},
 care:{kind:'protection',label:'A place to recover',detail:'The first direct Choir hit on each crew member is halved. Each traveller receives this protection once.'},
 witness:{kind:'opening',label:'Different voices heard',detail:'The first completed two-voice answer leaves the Choir exposed for five seconds instead of three. Another crew member must still answer differently.'},
 commons:{kind:'recovery',label:'A shared breathing space',detail:'The first Guard restores six additional MP and eases eight strain for every living crew member. This shared respite happens once.'}
});
const NETWORK=Object.freeze({
 'chapel-return':{id:'return',label:'The chapel’s tested return'},
 'heat-independent':{id:'return',label:'Heat supplied without the collector'},
 'water-return':{id:'return',label:'The return verified from both banks'},
 'relays-distinct':{id:'witness',label:'The mountain’s distinct replies'},
 'assembly-return':{id:'commons',label:'The communities’ public return board'}
});
const ORIGIN_KINDS=Object.freeze({
 'family-remedies':'care','lowbank-clinic':'care','public-bench':'care','rail-relief':'care','shared-water':'care','listening-watch':'care',
 'family-copies':'witness','witness-desk':'witness',
 'workshop-conductors':'return','lowbank-relief':'return','contract-drawer':'return','rail-crossing':'return','ferry-record':'return','reply-windows':'return'
});
const array=v=>Array.isArray(v)?v:[];
const heroId=v=>Number.isInteger(v)&&v>=0&&v<CREW.length;
const leadId=s=>[s?.journey?.hero,ORIGINS.find(o=>o.id===s?.chronicle?.originId)?.hero,s?.chronicle?.hero,s?.party?.[0],0].find(heroId);
const alive=a=>a&&a.hp>0&&!a.withdrawn;
const unique=a=>new Set(a).size===a.length;

function sourceSpec(source){
 if(typeof source!=='string')return null;
 if(source.startsWith('network:'))return NETWORK[source.slice(8)]||null;
 if(source==='bell:shelter-open')return {id:'care',label:'The chapel’s open dry shelter'};
 if(source==='bell:witness-route')return {id:'witness',label:'The witness’s open archive stair'};
 if(source.startsWith('origin:')){const effect=source.slice(7),p=originPayoff({effect});return p&&ORIGIN_KINDS[effect]?{id:ORIGIN_KINDS[effect],label:p.name}:null;}
 const civic=/^civic:([1-9]|1\d|2[0-4]):(water|workshop|commons)$/.exec(source);
 if(civic)return {id:civic[2]==='workshop'?'commons':'care',label:({water:'The clean-water cooperative',workshop:'The open repair workshop',commons:'The neighbourhood commons'})[civic[2]]+' in district '+civic[1]};
 const delivery=/^delivery:([1-9]|1\d|2[0-4]):([1-9]|1\d|2[0-4])>([1-9]|1\d|2[0-4])$/.exec(source);
 if(delivery&&+delivery[3]===(+delivery[2]===1?2:+delivery[2]-1)&&+delivery[1]>=Math.max(+delivery[2],+delivery[3]))return {id:'commons',label:'The completed delivery from district '+delivery[2]+' to '+delivery[3]};
 return null;
}

/** At most four effects, with up to three credited real sources per effect. */
export function cityAnswerContext(state={}){
 state=state&&typeof state==='object'?state:{};
 const groups=new Map(ORDER.map(id=>[id,[]]));
 const add=source=>{const spec=sourceSpec(source),list=groups.get(spec?.id);if(list&&list.length<3&&!list.includes(source))list.push(source);};
 if(state?.chronicle?.phase!=='past'&&!state?.fieldOrigins?.active){
  if(state.answeringNetwork?.version===1)for(const id of Object.keys(NETWORK))if(array(state.answeringNetwork.works).includes(id))add('network:'+id);
  const bell=state.bellWitness,works=bell?.works;
  if(array(state.bosses).includes(4)&&works&&['inletClosed','drainClear','returnFreed','tested'].every(id=>works[id]===true)){
   if(bell.aftercare==='shelter-open'&&bell.preparation==='shelter')add('bell:shelter-open');
   if(bell.aftercare==='witness-route'&&bell.preparation==='lure')add('bell:witness-route');
  }
  const chronicle=state.chronicle;
  if(chronicle?.phase==='present')for(const record of array(chronicle.records)){
   const origin=ORIGINS.find(o=>o.id===record?.originId);
   if(origin&&origin.effects[record.destiny]===record.effect&&array(chronicle.services).includes(record.effect)&&(state.chapter>=origin.chapter||state.complete))add('origin:'+record.effect);
  }
  for(const region of Object.keys(state.economy?.districts||{}).sort((a,b)=>Number(a)-Number(b)))for(const work of array(state.economy.districts[region]?.works))add('civic:'+region+':'+work);
  for(const id of array(state.economy?.delivered))add('delivery:'+id);
 }
 return {version:1,lead:leadId(state),contributions:ORDER.filter(id=>groups.get(id).length).map(id=>({id,sources:groups.get(id)}))};
}

export function cityAnswerView(state={}){
 const context=cityAnswerContext(state),contributions=context.contributions.map(c=>({...c,...EFFECTS[c.id],sourceLabels:c.sources.map(id=>sourceSpec(id).label)}));
 return {title:'The city can answer',summary:contributions.length?'Working places and willing people offer particular help in the final encounter. Each contribution has one purpose; none is required to enter or win.':'The travelling crew can face the Choir together. Help from the city is welcome; no community work is required to enter or win.',contributions};
}

/** This precedes the personal recording choice and grants no consent for it. */
export function cityAnswerEpilogue(state={}){
 const {contributions}=cityAnswerView(state),name=CREW[leadId(state)];
 if(!contributions.length)return [name+' hears the last command stop. The travelling crew made room for one another’s answers. Beyond the chamber, the next phrase belongs to the people who choose to give it.'];
 const lines=contributions.map(c=>c.sourceLabels.join('; ')+'. '+({return:'Their return paths no longer have to carry the collector’s orders.',care:'Their doors remain places where a person can recover.',witness:'Their replies keep their own names and their own pauses.',commons:'Their shared work leaves room for another person to take a turn.'})[c.id]);
 return [name+' hears separate replies beyond the chamber. The city’s answer comes from work that people actually kept:\n'+lines.join('\n'), 'Those replies belong to the people who give them. They do not decide what happens to a family’s private recording.'];
}

export function validCityAnswerContext(value,heroes=null){
 if(value==null)return true;
 if(!value||value.version!==1||!heroId(value.lead)||!Array.isArray(value.contributions)||value.contributions.length>4)return false;
 const ids=value.contributions.map(c=>c?.id);
 if(!unique(ids)||value.contributions.some(c=>!EFFECTS[c?.id]||!Array.isArray(c.sources)||c.sources.length<1||c.sources.length>3||!unique(c.sources)||c.sources.some(source=>sourceSpec(source)?.id!==c.id)))return false;
 if(value.used!==undefined&&(!Array.isArray(value.used)||value.used.length>3||!unique(value.used)||value.used.some(id=>id==='care'||!ids.includes(id))))return false;
 if(value.careUsed!==undefined&&(!Array.isArray(value.careUsed)||value.careUsed.length>7||!unique(value.careUsed)||value.careUsed.some(id=>!heroId(id)||heroes&&!heroes.some(h=>h.id===id))||value.careUsed.length&&!ids.includes('care')))return false;
 return true;
}

function active(b){
 const c=b?.context?.cityAnswer;
 return b?.chapter===24&&!b.context.friendly&&!b.context.tutorial&&b.enemies.some(e=>e.boss)&&validCityAnswerContext(c,b.heroes)&&c?.contributions.length?c:null;
}
function contribution(b,id){return active(b)?.contributions.find(c=>c.id===id)||null;}
function available(b,id){const c=active(b);return c&&!array(c.used).includes(id)?contribution(b,id):null;}
function spend(b,id){const c=active(b);c.used??=[];c.used.push(id);}
function emit(b,id,actor,label,extra={}){const c=contribution(b,id);b.event?.({type:'city-answer',contribution:id,actor,label,sources:[...(c?.sources||[])],...extra});}

export function cityAnswerIntent(b,enemy,intent){
 if(!enemy?.boss||intent?.guardianRule!=='choir-answer'||!available(b,'return')||![intent.left,intent.total].every(Number.isFinite))return;
 intent.left+=1.2;intent.total+=1.2;intent.cityReturn=true;spend(b,'return');
 intent.counterplay+=' The working returns leave 1.2 extra seconds in this first warning.';
 emit(b,'return',enemy,'The city holds a return open · the first warning gains 1.2 seconds');
}

export function cityAnswerIncoming(b,caster,target,amount,{dot=false,secondary=false}={}){
 if(dot||secondary||!Number.isFinite(amount)||amount<=0||!alive(target)||!caster?.boss||!b.enemies.includes(caster)||!b.heroes.includes(target)||!contribution(b,'care'))return amount;
 const c=active(b);c.careUsed??=[];if(c.careUsed.includes(target.id))return amount;c.careUsed.push(target.id);
 emit(b,'care',target,'The open shelters protect '+target.name+' · this Choir hit is halved',{source:caster});return amount*.5;
}

export function cityAnswerOpening(b,enemy,hero){
 if(!enemy?.boss||!available(b,'witness'))return;
 spend(b,'witness');enemy.status.stagger=Math.max(enemy.status.stagger||0,5);enemy.status.exposed=Math.max(enemy.status.exposed||0,5);
 emit(b,'witness',enemy,'Distinct replies hold the opening · five seconds to act',{source:hero});
}

export function cityAnswerGuard(b,hero){
 if(!alive(hero)||!b.heroes.includes(hero)||!available(b,'commons'))return;
 spend(b,'commons');const crew=b.heroes.filter(alive);
 for(const h of crew){h.mp=Math.min(h.maxMp,h.mp+6);h.strain=Math.max(0,(h.strain||0)-8);}
 emit(b,'commons',hero,'The city leaves a breathing space · crew recover 6 MP and ease 8 strain',{targets:crew});
}
