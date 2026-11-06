import {clearPositionLine} from './combat-position.js?v=5.16.0';

/** Structural parts are independent of the creature's borrowed material shell.
 * Breaking one changes a capability; it never rolls an extra species loot drop.
 * One salvageable part per body yields one finite object in the shared pool. */
const part=(id,name,effect,detail,tool=null)=>Object.freeze({id,name,label:name,effect,detail,tool});
const plate=()=>part('plate','Load-bearing plate','guard','Break its rigid plate to remove most armor and stop rebuilding its guard.','plank');
const claw=()=>part('claw','Digging claw','mobility','Damage the digging claw to slow movement and prevent a physical escape.','hook');
const wing=()=>part('wing','Steering pinion','mobility','A torn steering pinion limits movement and prevents a physical escape.','reed');
const bell=()=>part('bell-sac','Resonant bell sac','silence','Silence the bell sac to prevent reinforcement calls.');
const horn=()=>part('horn','Charge horn','charge','Break the horn to narrow line charges into weaker single-target attacks.');
const gland=()=>part('ink-gland','Ink reservoir','ink','Drain the ink reservoir to stop exposing strikes and counter erasure.');
const furnace=()=>part('furnace','Heat chamber','heat','Vent the chamber to stop burning attacks, pressure surges and shell forging.');
const root=()=>part('root-crown','Root crown','chorus','Sever the linked roots to stop formation-wide haste.');
const siphon=()=>part('siphon','Current siphon','siphon','Rupture the siphon to stop focus drain and wet strikes.');
const veil=()=>part('veil','Shedding veil','molt','Damage the veil to prevent the creature shedding conditions for a fresh shield.');
const crest=()=>part('crest','Conductive crest','tempo','Ground the crest to stop shocking strikes and self-haste.');
const throat=()=>part('throat','Repair throat','heal','Interrupt the repair throat to prevent restorative hymns.');
const tail=()=>part('tail','Counterweight tail','charge','A damaged counterweight turns sweeping charges into weaker single strikes.');

export const ANATOMY_PROFILES=Object.freeze({
 mountain:Object.freeze({name:'The Giant’s two resonators',parts:Object.freeze([
  part('first-resonator','Crosswise resonator','guardian-first','After Break opens it, disable the horizontal cross arm, the first marked circle and one half of the ring.'),
  part('second-resonator','Upright resonator','guardian-second','After Break opens it, disable the vertical cross arm, the second marked circle and the other half of the ring.')
 ])}),
 shell:Object.freeze({name:'Armored grazer',parts:Object.freeze([plate(),horn(),root()])}),
 jelly:Object.freeze({name:'Resonant drifter',parts:Object.freeze([part('mantle','Suspended mantle','mobility','Tear the mantle to limit drifting and prevent a physical escape.','reed'),bell(),siphon()])}),
 furnace:Object.freeze({name:'Kiln scavenger',parts:Object.freeze([claw(),furnace(),plateNoSalvage()])}),
 wing:Object.freeze({name:'Veiled flier',parts:Object.freeze([wing(),veil(),bell()])}),
 hunter:Object.freeze({name:'Pursuit hunter',parts:Object.freeze([claw(),horn(),gland()])}),
 wader:Object.freeze({name:'Wetland wader',parts:Object.freeze([wing(),siphon(),gland()])}),
 swimmer:Object.freeze({name:'Current swimmer',parts:Object.freeze([part('fin','Steering fin','mobility','Damage its fin to limit movement and prevent a physical escape.','reed'),siphon(),tail()])}),
 stone:Object.freeze({name:'Stone crawler',parts:Object.freeze([plate(),tail(),furnace()])}),
 antler:Object.freeze({name:'Crowned charger',parts:Object.freeze([part('antler','Forked antler','charge','Break the forked antler to narrow charges into weaker single strikes.','hook'),root(),throat()])}),
 clock:Object.freeze({name:'Mechanical burrower',parts:Object.freeze([claw(),crest(),bell()])}),
 manta:Object.freeze({name:'Storm glider',parts:Object.freeze([wing(),crest(),siphon()])}),
 roots:Object.freeze({name:'Rootbound guardian',parts:Object.freeze([plate(),root(),throat()])}),
 vessel:Object.freeze({name:'Living vessel',parts:Object.freeze([part('handle','Curved handle','guard','Break the handle to remove most armor and stop rebuilding its guard.','plank'),furnace(),bell()])}),
 serpent:Object.freeze({name:'Reed constrictor',parts:Object.freeze([part('spine','Binding spine','charge','Loosen the binding spine to narrow sweeping strikes.','reed'),siphon(),gland()])}),
 burrow:Object.freeze({name:'Tunnel forager',parts:Object.freeze([claw(),gland(),throat()])}),
 flower:Object.freeze({name:'Choral bloom',parts:Object.freeze([part('stem','Load-bearing stem','guard','Break the stem to remove most armor and stop rebuilding its guard.','plank'),root(),bell()])})
});
function plateNoSalvage(){return part('carapace','Structural carapace','guard','Crack the structural carapace to remove most armor and stop rebuilding its guard.');}
const PROFILE_NAMES=Object.keys(ANATOMY_PROFILES).filter(id=>id!=='mountain');
const FRONTIER=['hunter','hunter','shell','shell','stone','wing','swimmer','shell','serpent','hunter','wing','hunter','wing','antler','antler','hunter','shell','burrow','wing','clock','jelly','manta','stone','roots'];
const FAMILY={mossback:'shell',belljelly:'jelly',boilercrab:'furnace',moonmoth:'wing',bramblewolf:'hunter',inkcrane:'wader',riverotter:'swimmer',basaltnewt:'stone',waxstag:'antler',copperhog:'clock',stormmanta:'manta',rootgolem:'roots',teapot:'vessel',reedserpent:'serpent',clockmole:'burrow',paperheron:'wader',orchardboar:'shell',smokelynx:'hunter',brassfly:'clock',frostgill:'swimmer',kilnknight:'furnace',bellorchid:'flower',glassram:'antler',deepnautilus:'jelly'};
const hash=text=>{let n=2166136261;for(const c of String(text))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const alive=a=>a&&a.hp>0&&!a.withdrawn&&!a.ecology?.withdrawn;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const emit=(b,action,actor,target,part,label,extra={})=>b.event?.({type:'anatomy',action,actor,target,part,label,...extra});
function profileFor(e){const family=e.family||String(e.species||'').replace(/-(elder|region-\d|reedcurrent|cinderhide|rimeveil|stormcrest|inkshroud|bloomward)$/,'');if(FAMILY[family])return FAMILY[family];if(/^frontier-\d+$/.test(family))return FRONTIER[Number(family.slice(9))%FRONTIER.length];return PROFILE_NAMES[hash(family||e.name||e.id)%PROFILE_NAMES.length];}
const actorState=(b,e)=>b?.anatomy?.enabled?b.anatomy.actors.find(a=>a.actorId===e?.id):null;

export function createAnatomy(context={},enemies=[]){
 const milestone=context.guardianChapter===16&&enemies.some(e=>e.boss),enabled=!context.friendly&&!context.tutorial&&(context.wild===true||context.anatomy===true||milestone),state={version:1,enabled,actors:[]};if(!enabled)return state;
 for(const e of enemies.filter(e=>(!e.boss||milestone)&&e.rivalAvatar===undefined).slice(0,12)){
  const profile=e.boss?'mountain':profileFor(e),spec=ANATOMY_PROFILES[profile],integrity=Math.max(18,Math.min(100,Math.ceil((e.maxHp||e.hp||64)*.38)));
  state.actors.push({actorId:e.id,profile,parts:spec.parts.map((p,i)=>({...p,integrity:integrity+(i===0?4:0),maxIntegrity:integrity+(i===0?4:0),broken:false,salvaged:false}))});
 }
 return state;
}
export function anatomySummary(b,e){
 const s=actorState(b,e);if(!s)return null;
 return {profile:s.profile,name:ANATOMY_PROFILES[s.profile].name,parts:s.parts.map(p=>({...p})),text:s.parts.map(p=>p.name+' '+(p.broken?'disabled':Math.ceil(p.integrity)+'/'+p.maxIntegrity)).join(' · ')};
}
export function anatomyMobility(b,e){const state=actorState(b,e),broken=state?.parts.some(p=>p.broken&&p.effect==='mobility');return {moveScale:broken?.4:1,canEscape:!broken};}
export function anatomyHasEffect(b,e,effect){return !!actorState(b,e)?.parts.some(p=>p.broken&&p.effect===effect);}

function salvagePart(b,e,p,actor){
 if(p.salvaged||!p.tool||!b.field?.enabled)return null;
 const id='anatomy-'+e.id+'-'+p.id,existing=b.field.props.find(x=>x.id===id);
 if(existing){p.salvaged=true;return existing;}
 // A finite body cannot manufacture repeated parts. A full shared-pool budget
 // leaves the salvage on this broken part for a later explicit recovery.
 if(b.field.props.length>=18)return null;
 const uses=p.tool==='jar'?1:2,prop={id,type:p.tool,name:'Recovered '+p.name.toLowerCase(),x:e.x,y:e.y,uses,maxUses:uses,ownerId:null,source:'Detached from '+e.name+' · '+p.name,condition:'loose',anatomySource:{actorId:e.id,partId:p.id}};
 b.field.props.push(prop);p.salvaged=true;emit(b,'salvage',actor,e,p,p.name+' becomes a shared '+p.tool,{prop});return prop;
}

/** Called only for a deliberate anatomical impact, not DOT or secondary arcs.
 * Successful breaks immediately change an already charged intent as well as
 * every future plan. State carries each detached object's unique provenance. */
export function damageAnatomyPart(b,e,partId,amount,{actor=null}={}){
 const state=actorState(b,e),p=state?.parts.find(p=>p.id===partId);if(!p||p.broken||!Number.isFinite(amount)||amount<=0)return null;
 const loss=Math.min(p.integrity,Math.max(1,Math.round(amount)));p.integrity-=loss;emit(b,'hit-part',actor,e,p,p.name+' integrity −'+loss,{amount:loss});
 if(p.integrity<=0){
  p.integrity=0;p.broken=true;e.status??={};e.status.exposed=Math.max(e.status.exposed||0,4);e.atb=Math.max(0,(e.atb||0)-.2);
  if(p.effect==='guard'){e.armor=Math.round(Math.max(0,e.armor||0)*.25);e.maxArmor=Math.round(Math.max(0,e.maxArmor||0)*.3);}
  if(p.effect==='mobility'){e.mobilityImpaired=true;e.escapeBlocked=true;}
  const disabled={chorus:'chorus',heat:'forge',siphon:'siphon',molt:'molt',tempo:'tempo',ink:'erase'}[p.effect];if(disabled&&e.trait===disabled){p.disabledTrait=disabled;e.trait=null;}
  if(p.effect==='heat'&&e.trait==='pressure'){p.disabledTrait='pressure';e.trait=null;}
  if(e.intent)e.intent=modifyAnatomyIntent(b,e,e.intent);
  emit(b,'break-part',actor,e,p,p.name+' disabled · '+p.detail);
  salvagePart(b,e,p,actor);
 }
 return {part:p,loss,broken:p.broken};
}

function reasonFor(b,h,e,request){
 if(!b?.anatomy?.enabled)return 'This encounter has no exposed functional anatomy.';
 if(!alive(h)||!(b.heroes||[]).includes(h))return 'Choose a living crew member.';
 if(b.ended)return 'The encounter is finished.';
 if(h.atb<1)return 'Wait until this crew member is ready.';
 if(!alive(e)||!(b.enemies||[]).includes(e))return 'Choose a living hostile creature.';
 const p=actorState(b,e)?.parts.find(p=>p.id===request.partId);if(!p)return 'That creature has no such exposed part.';
 if(request.action==='recover-part'){if(!p.broken||!p.tool||p.salvaged)return 'That part cannot be recovered again.';if(!b.field?.enabled||b.field.props.length>=18)return 'Make room in the shared material pool first.';}
 else if(request.action!=='target-part')return 'Choose an exposed part to target.';
 else if(p.broken)return 'That capability has already been disabled.';
 else if(p.effect.startsWith('guardian-')&&!e.status?.resonatorOpening)return 'Break the Giant’s charged movement to open its resonators for six seconds.';
 if(distance(h,e)>3.5)return 'Move within three tiles to target a functional part.';
 if(!clearPositionLine(b,h,e))return 'A wall blocks access to that part.';
 return '';
}
export function anatomyActions(b,h,e){
 const s=actorState(b,e);if(!s)return [];
 return s.parts.map(p=>{
  const action=p.broken&&p.tool&&!p.salvaged?'recover-part':'target-part',request={action,partId:p.id},reason=reasonFor(b,h,e,request);
  return {...request,label:(action==='recover-part'?'Recover ':p.broken?'Disabled: ':'Target ')+p.name,detail:p.detail+' '+(p.broken?'Disabled.':Math.ceil(p.integrity)+'/'+p.maxIntegrity+' integrity.')+' Costs one ready action.',enabled:!reason,reason};
 });
}
export function anatomyCommand(b,h,e,request={}){
 if(reasonFor(b,h,e,request))return false;
 const p=actorState(b,e).parts.find(p=>p.id===request.partId);
 if(request.action==='recover-part'){if(!salvagePart(b,e,p,h))return false;h.atb=0;return true;}
 if(typeof b.damage!=='function')return false;
 // Targeting a part is a precise, weaker ordinary hit. It still interacts with
 // armor, shields and carried tools through the battle's damage resolver.
 const amount=Math.max(6,Math.round((h.power||12)*.8));h.atb=0;h.pose=.5;h.poseFrame=3;
 const before=e.hp,impact=b.damage(h,e,amount,{physical:true,anatomy:true}),applied=Number.isFinite(impact?.damage)?impact.damage:Math.max(0,before-e.hp);
 if(applied>0)damageAnatomyPart(b,e,p.id,Math.max(1,Math.round(applied*1.35)),{actor:h});
 return true;
}

export function modifyAnatomyIntent(b,e,intent){
 if(!intent||!actorState(b,e))return intent;
 let next={...intent,anatomyApplied:[...(intent.anatomyApplied||[])]};
 const broken=actorState(b,e).parts.filter(p=>p.broken&&!next.anatomyApplied.includes(p.id));
 for(const p of broken){
  let changed=false;
  if(p.effect==='silence'&&next.kind==='alarm'||p.effect==='chorus'&&next.kind==='chorus'||p.effect==='guard'&&next.kind==='guard'||p.effect==='molt'&&next.kind==='molt'||p.effect==='heat'&&next.kind==='repair'||p.effect==='heal'&&next.kind==='repair'){
   const recipient=(b.heroes||[]).find(h=>h.hp>0&&h.id===next.target)||(b.heroes||[]).find(h=>h.hp>0);
   next={...next,kind:'strike',shape:'single',power:Math.max(2,(e.power||12)*.9),target:recipient?.id,label:'Disabled '+p.name.toLowerCase()+' · body-check',core:undefined,status:undefined,fieldPhysical:true};changed=true;
   const target=(b.heroes||[]).find(h=>h.id===next.target&&h.hp>0);if(target){next.x=target.x;next.y=target.y;}
  }
  if(p.effect==='charge'&&next.kind==='strike'&&next.shape==='line'){next.shape='single';next.power=Math.max(1,(next.power||e.power||12)*.72);next.label='Broken charge · '+next.label;changed=true;}
  const condition={heat:'burn',ink:'exposed',siphon:'wet',tempo:'shock'}[p.effect];
  if(condition&&next.status===condition){next.status=undefined;next.core=undefined;next.fieldPhysical=true;next.power=Math.max(1,(next.power||e.power||12)*.85);next.label='Disabled '+p.name.toLowerCase()+' · '+next.label;changed=true;}
  if(p.effect==='mobility'){next.movementScale=.4;next.escapeBlocked=true;changed=true;}
  if(p.effect==='guardian-first'||p.effect==='guardian-second'){
   next.disabledChannels=[...new Set([...(next.disabledChannels||[]),p.effect==='guardian-first'?0:1])];
   if(next.disabledChannels.length===2)next.power=Math.max(1,next.power*.55);
   next.label='Silenced '+p.name.toLowerCase()+' · '+next.label;changed=true;
  }
  if(changed)next.anatomyApplied.push(p.id);
 }
 return next;
}

export function validAnatomy(state,enemies=[],field=null){
 if(state==null)return !field?.props?.some(p=>p.anatomySource!=null);
 if(state.version!==1||typeof state.enabled!=='boolean'||!Array.isArray(state.actors)||state.actors.length>12||!state.enabled&&state.actors.length)return false;
 const ids=new Set(),enemyIds=new Set(enemies.map(e=>e.id));
 for(const a of state.actors){
  if(!a||ids.has(a.actorId)||!enemyIds.has(a.actorId)||!Object.hasOwn(ANATOMY_PROFILES,a.profile)||!Array.isArray(a.parts)||a.parts.length!==ANATOMY_PROFILES[a.profile].parts.length)return false;ids.add(a.actorId);
  const specs=ANATOMY_PROFILES[a.profile].parts,partIds=new Set();
  for(const p of a.parts){const spec=specs.find(s=>s.id===p?.id);if(!spec||partIds.has(p.id)||p.name!==spec.name||p.effect!==spec.effect||p.tool!==spec.tool||![p.integrity,p.maxIntegrity].every(Number.isFinite)||p.maxIntegrity<18||p.maxIntegrity>104||p.integrity<0||p.integrity>p.maxIntegrity||typeof p.broken!=='boolean'||p.broken!==(p.integrity===0)||typeof p.salvaged!=='boolean'||p.salvaged&&(!p.broken||!p.tool)||p.disabledTrait!=null&&!['chorus','forge','siphon','molt','tempo','erase','pressure'].includes(p.disabledTrait))return false;partIds.add(p.id);}
 }
 if(field){
  const sources=new Set();
  for(const prop of field.props||[]){
   if(prop.anatomySource==null)continue;
   const source=prop.anatomySource,a=state.actors.find(a=>a.actorId===source.actorId),p=a?.parts.find(p=>p.id===source.partId),key=String(source.actorId)+':'+source.partId;
   if(!p||!p.broken||!p.salvaged||!p.tool||prop.type!==p.tool||prop.id!=='anatomy-'+a.actorId+'-'+p.id||sources.has(key))return false;sources.add(key);
  }
  for(const a of state.actors)for(const p of a.parts)if(p.salvaged&&!sources.has(String(a.actorId)+':'+p.id))return false;
 }
 return true;
}
