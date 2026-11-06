import {interruptCharge} from './guardian-rules.js?v=5.18.0';
/** One finite pool is contested by both sides. Tools are local battle state, not
 * duplicated inventory rewards, and basic attacks never require a tool. */
export const FIELD_TOOLS=Object.freeze({
 plank:{name:'Loose brace',color:'#c7a47b',glyph:'▰',uses:2,hint:'Brace into cover to stop one attack crossing it, or shove with an ordinary strike.'},
 hook:{name:'Salvage hook',color:'#c5cdd0',glyph:'⌁',uses:2,hint:'An ordinary strike interrupts an exposed charging foe. Disarming drops the same hook for either side.'},
 bell:{name:'Signal bell',color:'#e2c477',glyph:'♧',uses:2,hint:'Ring within reach to cancel an alarm or delay another charge. Striking with it drains readiness.'},
 jar:{name:'Water vessel',color:'#80cdd3',glyph:'◒',uses:1,hint:'The next ordinary strike spills its water, extinguishing burn and preparing wet reactions.'},
 coil:{name:'Grounding coil',color:'#b9c4ce',glyph:'⌘',uses:2,hint:'The next ordinary strikes drain readiness and cancel a charging alarm without an elemental spell.'},
 reed:{name:'Binding reeds',color:'#aec88d',glyph:'≋',uses:2,hint:'An ordinary strike binds the target briefly and slows its next action.'}
});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const alive=a=>a&&a.hp>0&&!a.withdrawn;
const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
const actors=b=>[...(b.heroes||[]),...(b.enemies||[])];
const propList=b=>b.field?.enabled?b.field.props||[]:[];
const emit=(b,action,actor,prop,target,label)=>b.event?.({type:'field',action,actor,prop,target,label:label||FIELD_TOOLS[prop?.type]?.name||action});
const status=a=>a.status??={};
const team=(b,a)=>a?.team==='heroes'||(b.heroes||[]).includes(a)?'heroes':'enemies';
function clearGear(actor){actor.fieldGear=null;}
function equip(prop,actor){prop.ownerId=actor.id;prop.condition='carried';actor.fieldGear=prop.id;actor.fieldClaims=(actor.fieldClaims||0)+1;}

export function fieldGear(b,actor){
 if(!actor)return null;
 return propList(b).find(p=>p.id===actor.fieldGear&&p.ownerId===actor.id&&p.condition==='carried'&&p.uses>0)||null;
}
export function fieldLabel(b,actor){const p=fieldGear(b,actor);return p?`${p.name} · ${p.uses} use${p.uses===1?'':'s'}`:'';}

function fallbackTypes(context){
 const tags=context.tags||[],types=['hook','plank'];
 if(tags.includes('wet'))types.push('jar');
 if(tags.includes('conductive')||tags.includes('grounded'))types.push('coil');
 if(tags.includes('resonant'))types.push('bell');
 if(tags.includes('living'))types.push('reed');
 if(types.length===2)types.push('bell');
 return types.slice(0,5);
}
export function createBattlefield(context={},heroes=[],enemies=[]){
 for(const a of [...heroes,...enemies]){clearGear(a);a.fieldClaims=0;}
 const enabled=!context.friendly&&!context.tutorial&&(context.wild===true||Array.isArray(context.fieldProps)&&context.fieldProps.length>0);
 const field={version:1,enabled,props:[],cover:[]};if(!enabled)return field;
 const center=heroes.find(alive)||enemies.find(alive)||{x:0,y:0};
 const supplied=Array.isArray(context.fieldProps)?context.fieldProps.filter(p=>p&&Object.hasOwn(FIELD_TOOLS,p.type)).slice(0,6):[];
 const source=supplied.length?supplied:fallbackTypes(context).map((type,i)=>({type,x:center.x+1.2+(i%2)*.75,y:center.y+(Math.floor(i/2)-.5)*.8,source:'local loose material'}));
 field.props=source.map((p,i)=>{
  const def=FIELD_TOOLS[p.type],x=Number.isFinite(p.x)?p.x:Number.isFinite(p.xy?.[0])?p.xy[0]:center.x+1,y=Number.isFinite(p.y)?p.y:Number.isFinite(p.xy?.[1])?p.xy[1]:center.y;
  return {id:'field-'+i+'-'+p.type,type:p.type,name:String(p.name||def.name).slice(0,100),x,y,uses:def.uses,maxUses:def.uses,ownerId:null,source:String(p.source||'nearby loose material').slice(0,160),condition:'loose'};
 });
 // Opening fights demonstrate one tool. Further formations equip at most half
 // their non-boss members, always taking those objects out of the shared pool.
 if(context.wild){const candidates=enemies.filter(a=>alive(a)&&!a.boss&&a.rivalAvatar===undefined),budget=Math.ceil(candidates.length/2),seed=hash([context.key,context.encounterSerial,context.listeningSeed].join(':'));
  for(let i=0;i<budget;i++){const actor=candidates[i],loose=field.props.filter(p=>p.ownerId===null&&distance(p,actor)<=6);if(loose.length)equip(loose[(seed+i)%loose.length],actor);}
 }
 return field;
}

function ready(b,h){return b.field?.enabled&&alive(h)&&(b.heroes||[]).includes(h)&&h.atb>=1&&!b.ended;}
function heldProp(b,h,request){const p=fieldGear(b,h);return p&&(!request.propId||p.id===request.propId)?p:null;}
function checkAction(b,h,target,request={}){
 if(!b.field?.enabled)return 'There are no loose tools in this encounter.';
 if(!alive(h)||(b.heroes||[]).includes(h)===false)return 'Choose a living crew member.';
 if(b.ended)return 'This encounter is finished.';
 if(h.atb<1)return 'Wait until this crew member is ready.';
 if(request.action==='take'){
  const p=propList(b).find(p=>p.id===request.propId);
  if(!p||p.condition!=='loose'||p.ownerId!==null||p.uses<=0)return 'That tool is already claimed or spent.';
  if(fieldGear(b,h))return 'Use or drop the carried tool first.';
  if(distance(h,p)>3)return 'Move within three tiles to take it.';
  return '';
 }
 if(request.action==='disarm'){
  if(!alive(target)||!(b.enemies||[]).includes(target)||!fieldGear(b,target))return 'The selected creature is not carrying a tool.';
  if(distance(h,target)>3.2)return 'Move closer to reach the carried tool.';
  return '';
 }
 const p=heldProp(b,h,request);if(!p)return 'This crew member is not carrying that tool.';
 if(request.action==='drop')return '';
 if(request.action==='cover')return p.type==='plank'?'':'A loose brace is needed for cover.';
 if(request.action==='ring'){
  if(p.type!=='bell')return 'A signal bell is needed.';
  if(!alive(target)||!(b.enemies||[]).includes(target)||distance(h,target)>3.2)return 'Choose a creature within three tiles.';
  if(!target.intent)return 'Wait for a charge or alarm to disrupt.';
  return '';
 }
 return 'Choose a supported field action.';
}
export function fieldActions(b,h,target){
 if(!b?.field?.enabled)return [];
 const rows=[];
 const add=(action,propId,label,detail)=>{const reason=checkAction(b,h,target,{action,propId});rows.push({action,propId,label,detail,hint:detail,enabled:!reason,reason});};
 const targetProp=fieldGear(b,target),held=fieldGear(b,h);
 if(targetProp)add('disarm',targetProp.id,'Disarm '+target.name,'Cancel its charge and drop '+targetProp.name+' at its feet. Costs one ready action.');
 if(held){
  if(held.type==='plank')add('cover',held.id,'Brace into cover','Place one-use cover in front of this crew member. Position it between an attacker and an ally.');
  if(held.type==='bell')add('ring',held.id,'Ring signal bell','Cancel an alarm; other charged attacks are delayed. The bell has finite uses.');
  add('drop',held.id,'Drop '+held.name,'Leave the same tool here for another actor. Costs one ready action.');
 }
 for(const p of propList(b).filter(p=>p.ownerId===null&&p.condition==='loose'&&p.uses>0))add('take',p.id,'Take '+p.name,FIELD_TOOLS[p.type].hint+' Source: '+p.source+'.');
 return rows;
}
export const fieldOptions=fieldActions;

function spend(b,actor,p,amount=1){
 p.uses=Math.max(0,p.uses-amount);
 if(!p.uses){p.ownerId=null;p.condition='spent';clearGear(actor);emit(b,'spent',actor,p,null,p.name+' is spent');}
}
export function releaseFieldGear(b,actor){
 const p=fieldGear(b,actor);if(!p){if(actor)clearGear(actor);return null;}
 p.x=actor.x;p.y=actor.y;p.ownerId=null;p.condition='loose';clearGear(actor);emit(b,'drop',actor,p,null,p.name+' drops to the ground');return p;
}
export function fieldCommand(b,h,target,request={}){
 if(checkAction(b,h,target,request))return false;
 if(request.action==='take'){const p=propList(b).find(p=>p.id===request.propId);equip(p,h);h.atb=0;emit(b,'take',h,p,null,h.name+' takes '+p.name);return true;}
 if(request.action==='disarm'){
  const p=releaseFieldGear(b,target);if(!p)return false;
  const interrupted=!!target.intent;target.intent=null;target.atb=Math.min(target.atb||0,.2);status(target).stagger=Math.max(status(target).stagger||0,interrupted?1.5:.6);status(target).exposed=Math.max(status(target).exposed||0,3);h.atb=0;emit(b,'disarm',h,p,target,target.name+' disarmed · '+p.name+' is loose');return true;
 }
 const p=heldProp(b,h,request);
 if(request.action==='drop'){releaseFieldGear(b,h);h.atb=0;return true;}
 if(request.action==='cover'){
  const dx=alive(target)?target.x-h.x:1,dy=alive(target)?target.y-h.y:0,len=Math.hypot(dx,dy)||1;
  const cover={id:'cover-'+p.id,propId:p.id,x:h.x+dx/len*.9,y:h.y+dy/len*.9,radius:.85,integrity:1,ownerId:h.id,ownerTeam:team(b,h)};
  p.x=cover.x;p.y=cover.y;p.ownerId=null;p.condition='cover';p.uses=0;clearGear(h);b.field.cover.push(cover);h.atb=0;emit(b,'cover',h,p,target,'Loose brace becomes cover · one crossing attack blocked');return true;
 }
 if(request.action==='ring'){
  const alarm=target.intent.kind==='alarm';
  if(alarm){target.intent=null;target.atb=0;status(target).stagger=Math.max(status(target).stagger||0,1.2);}
  else{target.intent.left+=1;target.intent.total+=1;}
  h.atb=0;spend(b,h,p);emit(b,'ring',h,p,target,alarm?'Signal bell cancels the alarm':'Signal bell delays the charge');return true;
 }
 return false;
}

/** The claim resolves when the tell finishes. Two creatures may contest the
 * same loose tool, but only the first successful claim receives it. */
export function planFieldIntent(b,e){
 if(!b.field?.enabled||!alive(e)||e.boss||e.rivalAvatar!==undefined||fieldGear(b,e)||(e.fieldClaims||0)>=2)return null;
 const p=propList(b).filter(p=>p.ownerId===null&&p.condition==='loose'&&p.uses>0&&distance(p,e)<=3).sort((a,z)=>distance(a,e)-distance(z,e))[0];if(!p)return null;
 return {kind:'field-take',shape:'single',propId:p.id,target:e.id,x:p.x,y:p.y,fromX:e.x,fromY:e.y,left:1.8,total:1.8,power:0,label:'Reaching for '+p.name};
}
export function executeFieldIntent(b,e,intent){
 if(intent.kind!=='field-take')return false;
 const p=propList(b).find(p=>p.id===intent.propId);
 if(alive(e)&&!fieldGear(b,e)&&p&&p.ownerId===null&&p.condition==='loose'&&p.uses>0&&distance(p,e)<=3){equip(p,e);emit(b,'take',e,p,null,e.name+' takes '+p.name);}
 else emit(b,'claim-lost',e,p,null,'The loose tool is no longer within reach');
 return true;
}
export function modifyFieldIntent(b,e,intent){
 const p=fieldGear(b,e);if(!p||!intent||intent.kind!=='strike')return intent;
 const next={...intent,fieldPropId:p.id,fieldType:p.type,fieldUses:p.uses,fieldPhysical:p.type!=='jar',label:p.name+' · '+intent.label};
 if(p.type==='hook'){next.shape='line';next.power*=1.08;next.status='exposed';next.core=undefined;next.left+=.35;next.total+=.35;}
 if(p.type==='plank'){next.shape='line';next.fieldPush=true;next.core=undefined;next.status=undefined;next.left+=.35;next.total+=.35;}
 if(p.type==='bell'){next.fieldDelay=.3;next.core=undefined;next.status=undefined;}
 if(p.type==='coil'){next.fieldDelay=.4;next.core=undefined;next.status=undefined;}
 if(p.type==='reed'){next.status='slow';next.core=undefined;}
 if(p.type==='jar'){next.status='wet';next.core='tide';}
 return next;
}

/** Called for an ordinary physical impact before the elemental reaction layer.
 * Spells, damage-over-time and secondary arcs never consume another tool use. */
export function resolveToolHit(b,caster,target,amount,opts={}){
 // Enemy swings are modified once by modifyFieldIntent/applyFieldImpact; they
 // spend one use in finishFieldIntent even when multiple actors are hit.
 if(!(b.heroes||[]).includes(caster)||!alive(caster)||!alive(target)||!opts.physical||opts.dot||opts.secondary||opts.tech)return amount;
 const p=fieldGear(b,caster);if(!p)return amount;
 const s=status(target),hostile=team(b,caster)!==team(b,target);if(!hostile)return amount;
 let out=amount;
 if(p.type==='hook'){
  if(s.exposed&&target.intent){interruptCharge(b,target,caster,{core:'physical',stagger:1.5});out*=1.15;emit(b,'hook-interrupt',caster,p,target,'Hook disrupts the exposed charge');}
  else{s.exposed=Math.max(s.exposed||0,3);out*=1.05;}
 }
 if(p.type==='coil'){
  target.atb=Math.max(0,(target.atb||0)-.35);
  if(target.intent?.kind==='alarm'){target.intent=null;s.stagger=Math.max(s.stagger||0,1);}
 }
 if(p.type==='bell'){target.atb=Math.max(0,(target.atb||0)-.25);if(target.intent){target.intent.left+=.4;target.intent.total+=.4;}}
 if(p.type==='reed'){s.slow=Math.max(s.slow||0,4);target.atb=Math.max(0,(target.atb||0)-.15);}
 if(p.type==='jar'){delete s.burn;s.wet=Math.max(s.wet||0,7);}
 if(p.type==='plank'){target.atb=Math.max(0,(target.atb||0)-.2);if(target.intent){target.intent.left+=.3;target.intent.total+=.3;}out*=1.08;}
 emit(b,'tool-hit',caster,p,target,p.name+' changes the impact');spend(b,caster,p);return Math.round(out);
}

export function applyFieldImpact(b,e,intent,target){
 if(!intent?.fieldPropId||!alive(target))return;
 const p=fieldGear(b,e);if(!p||p.id!==intent.fieldPropId)return;
 if(intent.fieldDelay)target.atb=Math.max(0,(target.atb||0)-intent.fieldDelay);
 if(intent.fieldPush)target.atb=Math.max(0,(target.atb||0)-.2);
 if(p.type==='jar')delete status(target).burn;
 emit(b,'tool-hit',e,p,target,p.name+' changes the impact');
}

/** Consume enemy tool uses once per intent, including missed attacks. Otherwise
 * a missed multi-target swing could grant or spend a different amount of gear. */
export function finishFieldIntent(b,e,intent){
 if(!intent?.fieldPropId||intent.fieldSpent)return;intent.fieldSpent=true;
 // A counter can defeat the carrier during its own attack. The dropped tool
 // still pays for that attempted swing instead of regaining a free use.
 const p=propList(b).find(p=>p.id===intent.fieldPropId);
 if(p&&p.uses>0&&(p.ownerId===e.id||p.ownerId===null&&p.condition==='loose'))spend(b,e,p);
}

/** Finite cover blocks one aimed attack only when it really lies between the
 * hostile attacker and the target. Bursts and melee contact bypass it. */
export function interceptFieldHit(b,attacker,intent,target){
 if(!b.field?.enabled||!alive(target)||!attacker||!['line','single'].includes(intent?.shape)||team(b,attacker)===team(b,target))return false;
 const dx=target.x-attacker.x,dy=target.y-attacker.y,len2=dx*dx+dy*dy;if(len2<1.8**2)return false;
 const own=team(b,target),cover=(b.field.cover||[]).find(c=>{
  if(c.integrity<=0||c.ownerTeam!==own)return false;
  const t=((c.x-attacker.x)*dx+(c.y-attacker.y)*dy)/len2;
  return t>.08&&t<.95&&Math.hypot(c.x-(attacker.x+t*dx),c.y-(attacker.y+t*dy))<=c.radius;
 });if(!cover)return false;
 cover.integrity=0;const p=propList(b).find(p=>p.id===cover.propId);if(p)p.condition='spent';
 emit(b,'cover-block',target,p,attacker,'Brace catches the attack · cover breaks');return true;
}

/** Validate optional snapshot state without making old saves require it. */
export function validBattlefield(field,all=[]){
 if(field==null)return all.every(a=>a.fieldGear==null);if(field.version!==1||typeof field.enabled!=='boolean'||!Array.isArray(field.props)||field.props.length>18||!Array.isArray(field.cover)||field.cover.length>6)return false;
 const ids=new Set(),actorIds=new Set(all.map(a=>a.id));
 if(actorIds.size!==all.length||!field.enabled&&(field.props.length||field.cover.length||all.some(a=>a.fieldGear!=null)))return false;
 for(const p of field.props){if(!p||typeof p.id!=='string'||ids.has(p.id)||!Object.hasOwn(FIELD_TOOLS,p.type)||![p.x,p.y,p.uses,p.maxUses].every(Number.isFinite)||!Number.isInteger(p.uses)||p.uses<0||p.uses>FIELD_TOOLS[p.type].uses||p.maxUses!==FIELD_TOOLS[p.type].uses||!['loose','carried','spent','cover'].includes(p.condition)||p.ownerId!==null&&!actorIds.has(p.ownerId))return false;ids.add(p.id);if((p.condition==='carried')!==(p.ownerId!==null)||['carried','loose'].includes(p.condition)&&p.uses<=0||['spent','cover'].includes(p.condition)&&p.uses!==0)return false;}
 if(new Set(field.props.filter(p=>p.ownerId!==null).map(p=>p.ownerId)).size!==field.props.filter(p=>p.ownerId!==null).length)return false;
 for(const p of field.props)if(p.ownerId!==null&&!all.some(a=>a.id===p.ownerId&&a.fieldGear===p.id))return false;
 for(const a of all)if(a.fieldGear!=null&&!field.props.some(p=>p.id===a.fieldGear&&p.ownerId===a.id&&p.condition==='carried'))return false;
 const covered=new Set();for(const c of field.cover){if(!c||typeof c.id!=='string'||covered.has(c.propId)||!ids.has(c.propId)||![c.x,c.y,c.radius,c.integrity].every(Number.isFinite)||c.radius<=0||c.radius>2||![0,1].includes(c.integrity)||!['heroes','enemies'].includes(c.ownerTeam)||!actorIds.has(c.ownerId))return false;covered.add(c.propId);}
 return true;
}
