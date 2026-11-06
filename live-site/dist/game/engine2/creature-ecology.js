/** Readable creature motives, finite interactions and bounded regional memory.
 * Relationships change actual plans; settlement grants no invented loot. */
import {fieldGear,releaseFieldGear} from './battlefield.js?v=5.18.0';
import {securePeacefulShipment} from './economy.js?v=5.18.0';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=s=>{let n=2166136261;for(const c of String(s))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=p=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<10000&&Math.abs(p.y)<10000;
const live=a=>!!a&&a.hp>0&&!a.withdrawn;
const MOTIVES=['hungry','nesting','territorial','scavenging','frightened'],TOOLS=['plank','hook','bell','jar','coil','reed'];
const text=(s,n=120)=>typeof s==='string'&&s.length>0&&s.length<=n;
const integer=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
const emit=(b,action,actor,target,label)=>b.event?.({type:'ecology',action,actor,target,label,color:'#b6d4a4'});

export const CREATURE_ECOLOGY_PROFILES=Object.freeze([
 ['moss-grazer','Moss grazer','mossback|orchardboar|spore|mushroom','hungry','living growth','tonic',['reed','jar'],[],['thorn-hunter','ash-stalker'],['root-warden','candle-herd'],'Browses living growth and retreats when nourished; herd members shelter one another.'],
 ['bell-drifter','Bell drifter','belljelly|bellorchid|jelly|lantern','territorial','resonance','ether',['bell','coil'],[],['storm-glider'],['gill-healer'],'Defends a resonant pocket, but a quiet, repeated rhythm can settle it.'],
 ['kiln-scavenger','Kiln scavenger','boilercrab|teapot|scarab|crab','scavenging','warm mineral scrap','tonic',['coil','hook','plank'],[],['ash-stalker'],['rail-burrower'],'Collects discarded tools and carries them toward a warm den; disarm it before it escapes.'],
 ['silk-forager','Silk forager','moonmoth|butterfly|moth','frightened','dew','tonic',['reed','jar'],[],['thorn-hunter','folio-nester','ash-stalker'],['candle-herd','bell-drifter'],'Seeks shelter from hunters and machinery. Gentle treatment can turn flight into trust.'],
 ['thorn-hunter','Thorn hunter','bramblewolf|wolf|raptor|serpent','hungry','small creatures','tonic',['hook','reed'],['silk-forager','moss-grazer','river-collector'],['root-warden'],['thorn-hunter'],'Watches smaller creatures as prey. Feed or distract it, or exploit the rivalry at a risk to its prey.'],
 ['folio-nester','Folio nester','inkcrane|paperheron|heron|crane|folio','nesting','water insects','tonic',['reed','plank'],['silk-forager'],['ash-stalker'],['river-collector'],'Guards a fragile nest and gathers dry scraps. A brace or reed shelter can settle its alarm.'],
 ['river-collector','River collector','riverotter|otter|snail|armadillo','scavenging','river herbs','tonic',['jar','bell','reed'],[],['thorn-hunter','storm-glider'],['folio-nester','gill-healer'],'Carries bright vessels and bells home, but remembers a rescue and recognizes familiar crews.'],
 ['heat-basker','Heat basker','basaltnewt|newt|salamander|kilnknight','territorial','warmth','tonic',['plank','coil'],[],['storm-glider'],['kiln-scavenger'],'Defends warm stone and gives ground reluctantly; its territory is readable from ash tracks.'],
 ['candle-herd','Candle herd','waxstag|stag|deer|wax','nesting','living growth','tonic',['reed','plank'],[],['thorn-hunter','ash-stalker'],['moss-grazer','silk-forager'],'Places itself between danger and its herd. Protecting one animal can earn the group’s patience.'],
 ['rail-burrower','Rail burrower','copperhog|clockmole|mole|quill|hog','scavenging','mineral grit','tonic',['coil','hook','plank'],[],['root-warden'],['kiln-scavenger'],'Salvages metal and returns along service trenches. Loose equipment is worth more to it than a fight.'],
 ['storm-glider','Storm glider','stormmanta|brassfly|manta|griffin|kite|dragonfly','territorial','storm charge','ether',['coil','bell'],['bell-drifter','river-collector'],['root-warden'],['storm-glider'],'Defends charged perches and hunts rivals. Grounded noises can pull it off its preferred line.'],
 ['root-warden','Root warden','rootgolem|golem|root|gargoyle','nesting','water and minerals','tonic',['plank','reed'],[],['heat-basker'],['moss-grazer','candle-herd'],'Shelters smaller grazers and defends a rooted home; a safe structure matters more than pursuit.'],
 ['ash-stalker','Ash stalker','smokelynx|lynx|cat|panther','hungry','small creatures','tonic',['hook','bell'],['silk-forager','folio-nester','kiln-scavenger'],['storm-glider'],['ash-stalker'],'Hunts in gaps between machinery sounds. An isolated rival can distract it from the crew.'],
 ['gill-healer','Gill healer','frostgill|deepnautilus|axolotl|nautilus|fish','frightened','clean water','tonic',['jar','reed'],[],['thorn-hunter','storm-glider'],['river-collector','bell-drifter'],'Avoids noise and polluted flow, shelters near friendly water creatures, and remembers treatment.'],
 ['glass-climber','Glass climber','glassram|ram|goat|ibex|glass','territorial','mineral salts','tonic',['plank','hook'],[],['storm-glider'],['glass-climber'],'Defends a narrow approach. A lure changes its line; breaking its charge is safer than contesting the perch.'],
 ['ruin-tender','Ruin tender','sphinx|marble|tender|sentinel','nesting','mineral salts','ether',['bell','plank','coil'],[],['rail-burrower'],['root-warden'],'Maintains an old shelter and turns on scavengers that dismantle it. A repair can earn passage.']
].map(([id,name,match,motive,diet,food,tools,prey,threats,friends,detail])=>Object.freeze({id,name,match,motive,diet,food,tools:Object.freeze(tools),prey:Object.freeze(prey),threats:Object.freeze(threats),friends:Object.freeze(friends),detail})));
const profiles=new Map(CREATURE_ECOLOGY_PROFILES.map(p=>[p.id,p]));
export function creatureEcologyProfile(actor={}){
 const family=String(actor.family||actor.species||actor.name||'wild').replace(/-elder$|-region-\d+$/g,'');
 return CREATURE_ECOLOGY_PROFILES.find(p=>new RegExp(p.match,'i').test(family))||CREATURE_ECOLOGY_PROFILES[hash(family)%CREATURE_ECOLOGY_PROFILES.length];
}
const record=(b,e)=>b?.ecology?.creatures?.find(r=>r.actorId===e?.id)||null;
const profileFor=r=>profiles.get(r?.profileId);
function contextCells(context,heroes,enemies){
 let cells=context.walkable||context.spatial?.walkable||context.position?.walkable||context.objective?.walkable||[];
 const floor=context.floor||context.objective?.floor;
 if(!cells.length&&Array.isArray(floor)){cells=[];floor.forEach((row,y)=>{for(let x=0;x<row.length;x++)if(row[x]==='.')cells.push([x,y]);});}
 cells=[...new Map(cells.filter(p=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite)).map(p=>{const xy=p.slice(0,2).map(Math.floor);return [xy.join(','),xy];})).values()].slice(0,256);
 // Old standalone fixtures have no floor. They get a bounded explicit arena.
 if(!cells.length){const a=heroes[0]||enemies[0]||{x:0,y:0},cx=Math.floor(a.x),cy=Math.floor(a.y);for(let y=cy-5;y<=cy+5;y++)for(let x=cx-5;x<=cx+5;x++)cells.push([x,y]);}
 return cells;
}
const geometryCache=new WeakMap();
function cellsFor(o){let cells=geometryCache.get(o);if(!cells){cells=new Set((o?.walkable||[]).map(p=>p.join(',')));if(o)geometryCache.set(o,cells);}return cells;}
const open=(b,p)=>point(p)&&!!b.ecology&&cellsFor(b.ecology).has([Math.floor(p.x),Math.floor(p.y)].join(','));
function clearLine(b,a,z){
 if(!point(a)||!point(z)||!open(b,a))return false;
 const n=Math.max(1,Math.ceil(distance(a,z)*12));let prior=a;
 for(let i=1;i<=n;i++){
  const p={x:a.x+(z.x-a.x)*i/n,y:a.y+(z.y-a.y)*i/n},fx=Math.floor(prior.x),fy=Math.floor(prior.y),tx=Math.floor(p.x),ty=Math.floor(p.y);
  if(!open(b,p)||fx!==tx&&fy!==ty&&(!open(b,{x:tx,y:fy})||!open(b,{x:fx,y:ty})))return false;prior=p;
 }return true;
}
function pathTo(b,a,z){
 const cells=cellsFor(b.ecology),start=[Math.floor(a.x),Math.floor(a.y)],goal=[Math.floor(z.x),Math.floor(z.y)],q=[start],seen=new Set([start.join(',')]),prior=new Map();
 if(!cells.has(start.join(','))||!cells.has(goal.join(',')))return [];
 for(let i=0;i<q.length&&i<256;i++){const p=q[i];if(p.join(',')===goal.join(','))break;for(const [dx,dy]of[[1,0],[0,1],[-1,0],[0,-1]]){const next=[p[0]+dx,p[1]+dy],key=next.join(',');if(!seen.has(key)&&cells.has(key)){seen.add(key);prior.set(key,p);q.push(next);}}}
 if(!seen.has(goal.join(',')))return [];const out=[];let p=goal;while(p.join(',')!==start.join(',')){out.unshift({x:p[0]+.5,y:p[1]+.5});p=prior.get(p.join(','));}return out;
}
function step(b,e,to){const next=pathTo(b,e,to)[0];if(!next)return distance(e,to)<.8;const d=distance(e,next),budget=e.mobilityImpaired?.4:1,p=d>budget?{x:e.x+(next.x-e.x)*budget/d,y:e.y+(next.y-e.y)*budget/d}:next;if(!clearLine(b,e,p))return false;e.x=p.x;e.y=p.y;return true;}
function nearest(cells,a){return cells.map(([x,y])=>({x:x+.5,y:y+.5})).sort((x,y)=>distance(a,x)-distance(a,y))[0]||{x:a.x,y:a.y};}
function chooseDen(cells,e,heroes,seed){
 const allowed=new Set(cells.map(p=>p.join(','))),start=[Math.floor(e.x),Math.floor(e.y)],queue=[start],seen=new Set([start.join(',')]);
 for(let i=0;i<queue.length&&i<256;i++)for(const [dx,dy]of[[1,0],[0,1],[-1,0],[0,-1]]){const p=[queue[i][0]+dx,queue[i][1]+dy],key=p.join(',');if(allowed.has(key)&&!seen.has(key)){seen.add(key);queue.push(p);}}
 const choices=cells.filter(p=>seen.has(p.join(','))).map(([x,y])=>({x:x+.5,y:y+.5})).filter(p=>distance(p,e)<=6&&distance(p,e)>=1.4);
 const crew=heroes.length?heroes:[e];choices.sort((a,z)=>Math.min(...crew.map(h=>distance(z,h)))-Math.min(...crew.map(h=>distance(a,h))));
 const band=choices.slice(0,5);return band[seed%band.length]||nearest(cells,e);
}
export function normalizeCreatureMemory(memory){
 return validCreatureMemory(memory)&&memory?JSON.parse(JSON.stringify(memory)):{version:1,sequence:0,individuals:[],encounters:[]};
}
export function createCreatureEcology(context={},heroes=[],enemies=[]){
 const enabled=context.wild===true&&!context.friendly&&!context.tutorial,region=String(context.region??context.location??context.key??'wild').slice(0,100)||'wild';
 const encounterId=String(context.ecologyEncounterId||[region,context.encounterSerial??context.serial??0,context.listeningSeed??'',context.key??''].join(':')).slice(0,180);
 const o={version:1,enabled,region,encounterId,walkable:enabled?contextCells(context,heroes,enemies):[],creatures:[],settled:false};if(!enabled)return o;
 const memory=normalizeCreatureMemory(context.creatureMemory),seen=new Set(),familyCounts=new Map();
 for(const [index,e]of enemies.entries()){
  if(o.creatures.length>=12)break;if(e.boss||e.rivalAvatar!==undefined||!e.species)continue;
  const p=creatureEcologyProfile(e),family=String(e.family||e.species).slice(0,100),occurrence=familyCounts.get(family)||0,identity=(hash([region,family,context.key||''].join(':'))%3+occurrence)%12,key=[region,family,identity].join(':').slice(0,220);familyCounts.set(family,occurrence+1);
  if(seen.has(key))continue;seen.add(key);
  // A dead occupant's regional slot may be filled again, but its replacement
  // does not inherit personal affection or a grudge from a deceased animal.
  const remembered=memory.individuals.find(r=>r.key===key),prior=remembered?.lastOutcome==='defeated'?null:remembered,seed=hash([key,encounterId].join(':')),den=prior?.den&&o.walkable.some(([x,y])=>x===Math.floor(prior.den.x)&&y===Math.floor(prior.den.y))?{...prior.den}:chooseDen(o.walkable,e,heroes.filter(h=>h.hp>0),seed),grudge=Math.max(0,(prior?.grudge||0)-(prior&&prior.lastEncounter!==encounterId?1:0));
  o.creatures.push({actorId:e.id,key,family,profileId:p.id,motive:MOTIVES.includes(e.ecologyMotive)?e.ecologyMotive:p.motive,trust:prior?.trust||0,grudge,hunger:p.motive==='hungry'?2:1,den,turns:0,fed:false,calmed:false,nestSafe:false,tethered:e.ecologyTethered===true||!prior&&seed%17===0,escaped:false,withdrawn:false,withdrawReason:'',stolenTool:null,stolenPropId:null,injuredByHero:false,harmCount:0,rescued:false,protections:0,rivalHits:0,lure:null,aggressorId:null,metBefore:!!prior});
  e.ecologyId=key;e.withdrawn=false;
 }
 return o;
}
/** Reinforcements receive a new identity without resetting existing trust,
 * lure state, timers, or a creature that has already left peacefully. */
export function registerCreatureEcology(b,e){
 if(!b?.ecology?.enabled||!e||e.boss||e.rivalAvatar!==undefined||!e.species||record(b,e)||b.ecology.creatures.length>=12)return null;
 const actors=(b.enemies||[]).map(a=>({...a}));if(!actors.some(a=>a.id===e.id))actors.push({...e});
 const fresh=createCreatureEcology({...b.context,walkable:b.ecology.walkable},b.heroes||[],actors),r=fresh.creatures.find(r=>r.actorId===e.id);
 if(!r||b.ecology.creatures.some(a=>a.key===r.key))return null;b.ecology.creatures.push(r);e.ecologyId=r.key;e.withdrawn=false;return r;
}
const active=(b,e)=>!!b?.ecology?.enabled&&!b.ended&&live(e)&&!!record(b,e);
function withdraw(b,e,r,reason,{escape=false}={}){
 if(!live(e)||r.withdrawn||escape&&e.escapeBlocked)return false;const held=fieldGear(b,e);
 if(escape&&held){r.stolenTool=held.type;r.stolenPropId=held.id;held.uses=0;held.ownerId=null;held.condition='spent';e.fieldGear=null;}else releaseFieldGear(b,e);
 r.withdrawn=true;r.escaped=escape;r.withdrawReason=reason;e.withdrawn=true;e.intent=null;e.atb=0;emit(b,'withdraw',e,null,reason);return true;
}
const intent=(e,kind,label,extra={})=>({kind,shape:'single',target:e.id,x:e.x,y:e.y,fromX:e.x,fromY:e.y,left:1.5,total:1.5,power:0,label,...extra});
function rivalFor(b,e,r){
 const p=profileFor(r);return (b.enemies||[]).filter(x=>x!==e&&live(x)).map(x=>({actor:x,record:record(b,x)})).filter(x=>x.record&&distance(e,x.actor)<=5&&clearLine(b,e,x.actor)).sort((a,z)=>distance(e,a.actor)-distance(e,z.actor)).find(x=>p.prey.includes(x.record.profileId)||p.threats.includes(x.record.profileId));
}
/** Motives alternate with objective/ordinary turns instead of erasing attacks. */
export function ecologyEnemyIntent(b,e){
 if(!active(b,e))return null;const r=record(b,e),p=profileFor(r);r.turns++;
 if(r.tethered)return intent(e,'ecology-struggle','Caught in salvage · struggling to get free');
 if(r.lure?.charges>0)return intent(e,'ecology-follow','Following the sounding clay lure',{x:r.lure.x,y:r.lure.y,nodeId:r.lure.id});
 if(r.trust>=2&&!r.injuredByHero)return intent(e,'ecology-peace','Recognizes the crew · lowering its guard');
 if((r.motive==='frightened'||e.hp<e.maxHp*.26)&&r.grudge<3&&!e.escapeBlocked||r.fed&&r.hunger===0||r.nestSafe){
  if(!e.escapeBlocked&&(r.turns%2===1||r.fed||r.nestSafe))return intent(e,'ecology-retreat',r.fed?'Nourished · returning to shelter':r.nestSafe?'Shelter holds · leaving the route clear':'Frightened · seeking its den',{x:r.den.x,y:r.den.y});
 }
 if(r.turns%3!==1)return null;
 if(r.grudge>=3){const target=(b.heroes||[]).find(h=>h.id===r.aggressorId&&live(h))||(b.heroes||[]).find(live);if(target)return intent(e,'ecology-grudge','Recognizes an attacker · vengeful charge',{target:target.id,x:target.x,y:target.y,power:Math.round(e.power*1.5),left:1.8,total:1.8});}
 const rival=rivalFor(b,e,r);if(rival)return intent(e,'ecology-rival',p.prey.includes(rival.record.profileId)?'Hunting '+rival.actor.name:'Driving a rival from its territory',{target:rival.actor.id,x:rival.actor.x,y:rival.actor.y,power:Math.max(3,Math.round(e.power*.8)),left:1.8,total:1.8});
 if(r.motive==='scavenging'){
  if(fieldGear(b,e)&&!e.escapeBlocked)return intent(e,'ecology-retreat','Carrying '+fieldGear(b,e).name+' toward its den',{x:r.den.x,y:r.den.y});
  const prop=(b.field?.props||[]).filter(a=>!fieldGear(b,e)&&a.ownerId===null&&a.condition==='loose'&&a.uses>0&&p.tools.includes(a.type)&&distance(e,a)<=5&&(distance(e,a)<.8||pathTo(b,e,a).length)).sort((a,z)=>distance(e,a)-distance(e,z))[0];
  if(prop)return intent(e,'ecology-salvage','Salvaging '+prop.name,{propId:prop.id,x:prop.x,y:prop.y});
 }
 const friend=(b.enemies||[]).filter(a=>a!==e&&live(a)&&a.hp<a.maxHp*.6&&distance(e,a)<=3&&p.friends.includes(record(b,a)?.profileId)&&clearLine(b,e,a)).sort((a,z)=>a.hp/a.maxHp-z.hp/z.maxHp)[0];
 if(friend&&r.protections<2)return intent(e,'ecology-protect','Sheltering '+friend.name,{target:friend.id,x:friend.x,y:friend.y});
 if(r.motive==='nesting'&&!r.nestSafe)return intent(e,'ecology-nest','Guarding its shelter · watching the approach',{x:r.den.x,y:r.den.y});
 return null;
}
export function executeEcologyIntent(b,e,i,{intercept=()=>false}={}){
 if(!String(i?.kind||'').startsWith('ecology-'))return false;if(!active(b,e))return true;const r=record(b,e);e.status??={};
 if(i.kind==='ecology-struggle'){e.status.guard=Math.max(e.status.guard||0,2);emit(b,'struggle',e,null,'The creature cannot free itself from the salvage.');return true;}
 if(i.kind==='ecology-peace'){withdraw(b,e,r,'The familiar creature lets the crew pass.');return true;}
 if(i.kind==='ecology-follow'){
  if(!r.lure||r.lure.id!==i.nodeId||r.lure.charges<=0)return true;
  if(distance(e,r.lure)<=.85){r.lure=null;e.status.stagger=Math.max(e.status.stagger||0,1.5);emit(b,'lured',e,null,'The creature investigates the echo, leaving a brief opening.');}
  else if(step(b,e,r.lure))emit(b,'move',e,null,'The creature follows the echo along the floor.');return true;
 }
 if(i.kind==='ecology-retreat'){
  if(e.escapeBlocked){emit(b,'escape-blocked',e,null,'The damaged creature cannot reach its escape route.');return true;}
  if(distance(e,r.den)<=.85)withdraw(b,e,r,fieldGear(b,e)?'The scavenger reaches its den with the tool.':r.fed?'The nourished creature returns to shelter.':'The creature reaches shelter and leaves the encounter.',{escape:true});
  else if(step(b,e,r.den))emit(b,'move',e,null,'The creature moves toward its den.');return true;
 }
 if(i.kind==='ecology-salvage'){
  const prop=(b.field?.props||[]).find(p=>p.id===i.propId);if(!prop||prop.ownerId!==null||prop.condition!=='loose'||prop.uses<=0||fieldGear(b,e))return true;
  if(distance(e,prop)>1.35){if(step(b,e,prop))emit(b,'move',e,null,'The scavenger approaches the loose tool.');return true;}
  if(clearLine(b,e,prop)){prop.ownerId=e.id;prop.condition='carried';e.fieldGear=prop.id;e.fieldClaims=(e.fieldClaims||0)+1;emit(b,'salvage',e,null,e.name+' takes '+prop.name+' toward its den.');}return true;
 }
 if(i.kind==='ecology-rival'){
  const target=(b.enemies||[]).find(x=>x.id===i.target&&live(x));if(!target)return true;
  if(distance(e,target)>2){if(step(b,e,target))emit(b,'move',e,target,'The creature closes on its rival.');return true;}
  if(clearLine(b,e,target)){if(intercept(b,e,i,target)){emit(b,'intercepted',e,target,'The rival strike is intercepted.');return true;}r.rivalHits++;b.damage?.(e,target,i.power,{physical:true,color:e.color||'#bdc98b'});emit(b,'rival',e,target,e.name+' strikes its rival.');}return true;
 }
 if(i.kind==='ecology-grudge'){const target=(b.heroes||[]).find(x=>x.id===i.target&&live(x));if(target&&clearLine(b,e,target)){if(intercept(b,e,i,target)){emit(b,'intercepted',e,target,'The vengeful strike is intercepted.');return true;}b.damage?.(e,target,i.power,{physical:true,color:e.color||'#d6a48a'});}emit(b,'grudge',e,target,'The remembered attacker draws the creature’s anger.');return true;}
 if(i.kind==='ecology-protect'){const target=(b.enemies||[]).find(x=>x.id===i.target&&live(x));if(target&&distance(e,target)<=3&&clearLine(b,e,target)){target.status??={};target.status.shield=Math.min(300,(target.status.shield||0)+16);r.protections++;emit(b,'protect',e,target,'A familiar creature shelters its wounded companion.');}return true;}
 if(i.kind==='ecology-nest'){if(distance(e,r.den)>1.5)step(b,e,r.den);e.status.guard=Math.max(e.status.guard||0,3);emit(b,'nest',e,null,'The creature guards its nest instead of pursuing the crew.');return true;}
 return true;
}
const lureCache=new WeakMap();
function lureNodes(b,h){
 if(!b?.ecology?.enabled||!point(h))return [];const key=[h.id,h.x,h.y].join(':'),cached=lureCache.get(b.ecology);if(cached?.key===key)return cached.nodes;
 const candidates=b.ecology.walkable.map(([x,y])=>({x:x+.5,y:y+.5})).filter(p=>distance(h,p)>=1.3&&distance(h,p)<=4&&clearLine(b,h,p)),out=[];
 for(let q=0;q<4;q++){const dx=[1,0,-1,0][q],dy=[0,1,0,-1][q],best=candidates.filter(p=>dx?(p.x-h.x)*dx>.8:(p.y-h.y)*dy>.8).sort((a,z)=>Math.hypot(a.x-h.x-dx*2.5,a.y-h.y-dy*2.5)-Math.hypot(z.x-h.x-dx*2.5,z.y-h.y-dy*2.5))[0];if(best&&!out.some(p=>p.x===best.x&&p.y===best.y))out.push({...best,id:'lure-'+Math.floor(best.x)+'-'+Math.floor(best.y),label:['east','south','west','north'][q]});}lureCache.set(b.ecology,{key,nodes:out});return out;
}
const itemCost=(inventory,p,action)=>action==='rescue'?(inventory.mossWrap>0?'mossWrap':'tonic'):p.food;
function reason(b,h,target,request,inventory={}){
 if(!b?.ecology?.enabled)return 'There are no wild creature motives in this encounter.';
 if(b.ended)return 'This encounter is finished.';
 if(!(b.heroes||[]).includes(h)||!live(h))return 'Choose a living crew member.';
 if(h.atb<1)return 'Wait for a ready action.';
 if(!active(b,target))return 'Choose an active wild creature.';
 const r=record(b,target),p=profileFor(r);
 if(distance(h,target)>3.2||!clearLine(b,h,target))return 'Move within three clear floor tiles of the creature.';
 if(request.action==='food')return r.fed?'This creature has already been nourished.':r.grudge>=3?'It is too angry to accept supplies.':inventory[itemCost(inventory,p,'food')]>0?'':'Needs one '+(p.food==='ether'?'Ether':'Tonic')+'.';
 if(request.action==='soothe')return r.calmed?'The calming rhythm has already been used.':r.grudge>=3?'Its grudge must fade in a later meeting.':(h.mp||0)<4?'Needs four MP.':'';
 if(request.action==='lure')return r.lure?'A lure is already sounding.':(h.mp||0)<3?'Needs three MP.':lureNodes(b,h).some(n=>n.id===request.nodeId)?'':'Choose a reachable marked lure angle.';
 if(request.action==='rescue')return r.rescued?'This creature has already been treated.':!(r.tethered||['burn','shock','stagger','slow'].some(k=>target.status?.[k])||target.hp<target.maxHp*.5)?'Wait until the creature is trapped, afflicted or seriously wounded.':inventory[itemCost(inventory,p,'rescue')]>0?'':'Needs one Moss wrap or Tonic.';
 if(request.action==='shelter'){const held=fieldGear(b,h);return r.nestSafe?'The shelter is already safe.':r.motive!=='nesting'?'This creature is not defending a nest.':held&&['plank','reed'].includes(held.type)&&held.uses>0?'':'Carry a loose brace or binding reeds.';}
 if(request.action==='release')return r.trust<2?'Earn two trust through nourishment, treatment, shelter or a calming rhythm.':r.injuredByHero?'It will not accept release after being attacked by this crew.':'';
 return 'Choose a supported creature action.';
}
export function ecologyActions(b,h,target,inventory={}){
 if(!b?.ecology?.enabled||!record(b,target))return [];const r=record(b,target),p=profileFor(r),rows=[];
 const add=(action,label,detail,extra={})=>{const why=reason(b,h,target,{action,...extra},inventory);rows.push({action,label,detail,hint:detail,enabled:!why,reason:why,...extra});};
 add('food','Nourish '+target.name,'Offer one '+(p.food==='ether'?'Ether':'Tonic')+' suited to its '+p.diet+' appetite. Hunger falls and trust grows. One ready action.');
 add('soothe','Play a calming rhythm','Spend four MP and one ready action. Settle alarm and earn trust; a frightened creature may leave peacefully.');
 if(r.tethered||r.rescued||target.hp<target.maxHp*.5||['burn','shock','stagger','slow'].some(k=>target.status?.[k]))add('rescue','Free and treat '+target.name,'Spend one Moss wrap, or a Tonic, and one ready action. Clear a snare and harmful conditions; the rescued creature leaves peacefully.');
 if(r.motive==='nesting')add('shelter','Secure its nesting shelter','Spend one carried brace or reed use and one ready action. A stable nest earns trust and leaves the route clear.');
 for(const n of lureNodes(b,h))add('lure','Sound a lure to the '+n.label,'Spend three MP and one ready action. The creature follows a real floor route to that angle, then investigates the echo.',{nodeId:n.id});
 add('release','Let the trusted creature pass','Spend one ready action to conclude its hostility with its life intact. Requires two trust.');return rows;
}
export function ecologyCommand(b,h,target,request={},inventory={}){
 if(reason(b,h,target,request,inventory))return false;const r=record(b,target),p=profileFor(r);h.atb=0;target.status??={};
 if(request.action==='food'){const id=itemCost(inventory,p,'food');inventory[id]--;r.fed=true;r.hunger=0;r.trust=clamp(r.trust+1,0,5);r.grudge=Math.max(0,r.grudge-1);target.intent=null;target.atb=0;emit(b,'food',h,target,'The creature accepts the nourishment and lowers its guard.');}
 else if(request.action==='soothe'){h.mp-=4;r.calmed=true;r.trust=clamp(r.trust+1,0,5);r.grudge=Math.max(0,r.grudge-1);target.intent=null;target.atb=0;target.status.stagger=Math.max(target.status.stagger||0,1.2);emit(b,'soothe',h,target,'The rhythm settles the creature’s alarm.');if(r.motive==='frightened'&&!r.injuredByHero)withdraw(b,target,r,'The soothed creature gives the crew safe passage.');}
 else if(request.action==='lure'){h.mp-=3;const n=lureNodes(b,h).find(n=>n.id===request.nodeId);r.lure={id:n.id,x:n.x,y:n.y,charges:1};target.intent=null;target.atb=0;emit(b,'lure',h,target,'A clay echo sounds from the marked floor angle.');}
 else if(request.action==='rescue'){const id=itemCost(inventory,p,'rescue');inventory[id]--;r.tethered=false;r.rescued=true;r.trust=clamp(r.trust+2,0,5);r.grudge=Math.max(0,r.grudge-1);for(const k of ['burn','shock','stagger','slow','exposed','brittle'])delete target.status[k];target.hp=Math.min(target.maxHp,target.hp+Math.round(target.maxHp*.25));emit(b,'rescue',h,target,'The freed creature remembers the crew’s treatment.');if(!r.injuredByHero)withdraw(b,target,r,'The rescued creature leaves the route clear.');}
 else if(request.action==='shelter'){const held=fieldGear(b,h);held.uses--;if(held.uses<=0){held.uses=0;held.ownerId=null;held.condition='spent';h.fieldGear=null;}r.nestSafe=true;r.trust=clamp(r.trust+2,0,5);target.intent=null;target.atb=0;emit(b,'shelter',h,target,'A brace holds the shelter. The nesting creature relaxes.');withdraw(b,target,r,'The creature settles beside its repaired shelter.');}
 else if(request.action==='release')withdraw(b,target,r,'The trusted creature gives the crew room to pass.');
 return true;
}
export function recordEcologyDamage(b,caster,target,amount){
 if(!(amount>0))return;const r=record(b,target);if(!r||!b.ecology?.enabled)return;
 if((b.heroes||[]).includes(caster)){r.injuredByHero=true;r.harmCount=Math.min(99,r.harmCount+1);r.grudge=clamp(r.grudge+1,0,5);r.trust=Math.max(0,r.trust-1);r.aggressorId=caster.id;}
 if(target.hp>0&&target.hp<target.maxHp*.26&&r.motive!=='nesting')r.motive='frightened';
}
export function ecologySummary(b,e){
 const r=record(b,e);if(!r)return null;const p=profileFor(r),label=({hungry:'Hungry',nesting:'Nesting',territorial:'Territorial',scavenging:'Scavenging',frightened:'Frightened'})[r.motive]+' '+p.name.toLowerCase();
 const status=r.withdrawn?r.withdrawReason:r.tethered?'Snared in salvage · can be freed':r.lure?'Following a sounding lure':r.stolenTool?'Carried '+r.stolenTool+' to its den':r.nestSafe?'Shelter secured':r.fed?'Nourished · seeking shelter':r.grudge>=3?'Remembers an attacker':r.metBefore&&r.trust>=2?'Recognizes this crew':r.motive==='hungry'?'Seeking '+p.diet:r.motive==='scavenging'?'Seeking '+p.tools.join(' / '):r.motive==='nesting'?'Defending a fragile shelter':r.motive==='frightened'?'Seeking a safe den':'Watching its territory';
 return {id:r.actorId,key:r.key,profileId:p.id,profile:p.name,motive:r.motive,label,detail:p.detail,trust:r.trust,grudge:r.grudge,hunger:r.hunger,den:{...r.den},withdrawn:r.withdrawn,tethered:r.tethered,fed:r.fed,nestSafe:r.nestSafe,status,intent:e.intent?.label||'',relationHints:{prey:[...p.prey],threats:[...p.threats],friends:[...p.friends]},needs:{food:p.food,tools:[...p.tools]},stolenTool:r.stolenTool};
}
/** Records relationships and stolen local tools. A real peaceful passage may
 * protect cargo already travelling here; it grants no XP, items or goods. */
export function settleCreatureMemory(state,b,result='retreat'){
 if(!b?.ecology?.enabled)return {recorded:false,creatures:[],withdrawn:0};const m=normalizeCreatureMemory(state.creatureMemory),o=b.ecology;
 if(m.encounters.includes(o.encounterId))return {recorded:false,creatures:[],withdrawn:0};m.sequence++;const summaries=[];
 for(const r of o.creatures){const e=(b.enemies||[]).find(a=>a.id===r.actorId);if(!e)continue;const old=m.individuals.find(a=>a.key===r.key),entry={key:r.key,family:r.family,region:o.region,profileId:r.profileId,trust:r.trust,grudge:r.grudge,meetings:Math.min(999,(old?.meetings||0)+1),rescues:Math.min(999,(old?.rescues||0)+(r.rescued?1:0)),feedings:Math.min(999,(old?.feedings||0)+(r.fed?1:0)),den:{...r.den},stolenTool:r.stolenTool||old?.stolenTool||null,lastOutcome:e.hp<=0?'defeated':r.withdrawn?r.escaped?'escaped':'peaceful':String(result).slice(0,32)||'retreat',knownMotive:r.motive,lastEncounter:o.encounterId,sequence:m.sequence};
  m.individuals=m.individuals.filter(a=>a.key!==r.key);m.individuals.push(entry);summaries.push({key:r.key,name:e.name,trust:r.trust,grudge:r.grudge,outcome:entry.lastOutcome,den:{...r.den},stolenTool:entry.stolenTool});}
 m.individuals=m.individuals.slice(-128);m.encounters.push(o.encounterId);m.encounters=m.encounters.slice(-128);state.creatureMemory=m;o.settled=true;
 securePeacefulShipment(state,b,result);
 return {recorded:true,creatures:summaries,withdrawn:summaries.filter(r=>r.outcome==='escaped'||r.outcome==='peaceful').length};
}
export function validCreatureMemory(m){
 if(m==null)return true;if(m.version!==1||!integer(m.sequence,0,1e9)||!Array.isArray(m.individuals)||m.individuals.length>128||!Array.isArray(m.encounters)||m.encounters.length>128||new Set(m.encounters).size!==m.encounters.length||m.encounters.some(s=>!text(s,180)))return false;
 const keys=new Set();for(const r of m.individuals){if(!r||!text(r.key,220)||keys.has(r.key)||!text(r.family,100)||!text(r.region,100)||!profiles.has(r.profileId)||![r.trust,r.grudge].every(v=>integer(v,0,5))||![r.meetings,r.rescues,r.feedings].every(v=>integer(v,0,999))||!point(r.den)||r.stolenTool!==null&&!TOOLS.includes(r.stolenTool)||!text(r.lastOutcome,32)||!MOTIVES.includes(r.knownMotive)||!text(r.lastEncounter,180)||!integer(r.sequence,0,m.sequence))return false;keys.add(r.key);}return true;
}
export function validCreatureEcology(o,enemies=[]){
 if(o==null)return true;if(o.version!==1||typeof o.enabled!=='boolean'||!text(o.region,100)||!text(o.encounterId,180)||typeof o.settled!=='boolean'||o.cargoPassageSettled!==undefined&&typeof o.cargoPassageSettled!=='boolean'||!Array.isArray(o.walkable)||o.walkable.length>256||!Array.isArray(o.creatures)||o.creatures.length>12)return false;
 const cells=new Set();for(const p of o.walkable){if(!Array.isArray(p)||p.length!==2||!p.every(v=>integer(v,-9999,9999))||cells.has(p.join(',')))return false;cells.add(p.join(','));}
 if(!o.enabled&&(o.walkable.length||o.creatures.length)||o.enabled&&!o.walkable.length)return false;
 const ids=new Set(),keys=new Set();for(const r of o.creatures){
  if(!r)return false;const e=enemies.find(a=>a.id===r.actorId);
  if(!['string','number'].includes(typeof r.actorId)||ids.has(r.actorId)||!text(r.key,220)||keys.has(r.key)||!text(r.family,100)||!profiles.has(r.profileId)||!MOTIVES.includes(r.motive)||![r.trust,r.grudge].every(v=>integer(v,0,5))||!integer(r.hunger,0,2)||!point(r.den)||!cells.has([Math.floor(r.den.x),Math.floor(r.den.y)].join(','))||!integer(r.turns,0,1e7)||!integer(r.harmCount,0,99)||!integer(r.protections,0,2)||!integer(r.rivalHits,0,1e7)||!text(r.withdrawReason||'-',200)||![r.fed,r.calmed,r.nestSafe,r.tethered,r.escaped,r.withdrawn,r.injuredByHero,r.rescued,r.metBefore].every(v=>typeof v==='boolean')||r.stolenTool!==null&&!TOOLS.includes(r.stolenTool)||r.stolenPropId!==null&&!text(r.stolenPropId,160)||r.aggressorId!==null&&!['string','number'].includes(typeof r.aggressorId))return false;
  if(enemies.length&&(!e||e.boss||e.ecologyId!==r.key||!!e.withdrawn!==r.withdrawn)||r.escaped&&!r.withdrawn||r.lure&&(!text(r.lure.id,80)||!point(r.lure)||!cells.has([Math.floor(r.lure.x),Math.floor(r.lure.y)].join(','))||r.lure.charges!==1))return false;ids.add(r.actorId);keys.add(r.key);
 }return true;
}
