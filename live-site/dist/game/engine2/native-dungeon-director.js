/** A read-only account of the dungeons that actually exist.
 * World and its native controllers own every answer, flag and consequence.
 * This module connects their saved state to existing floor conduits only. */
import {dungeonArchitectureSpec,dungeonArchitecturePlan} from './adventure-dungeon-architecture.js?v=5.37.0';
import {originStagingPlan} from './adventure-origin-staging.js?v=5.41';
import {campaignActuatorSpec} from './campaign-actuators.js';
import {investigationView} from './exploration-investigations.js';
import {PHYSICAL_LORE} from './physical-lore-content.js';

export const NATIVE_DUNGEON_BEATS=Object.freeze(['approach','threshold','read','manipulate','encounter','aftermath','release']);
export const NATIVE_MECHANISM_FORMS=Object.freeze(['floodgate','resonance-lock','counterweight','heat-channel','root-lattice','wind-vane','memory-lens','pressure-bridge']);
const CACHE=new WeakMap(),TYPES=new Set(['puzzle','switch','note','project','lore-device','riddle','network','frontier-landmark','embodied-action']);
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const xy=o=>Array.isArray(o?.xy)&&o.xy.length===2&&o.xy.every(Number.isFinite);
const key=o=>[o.type,...(o.xy||[]),o.id??'',o.bit??'',o.sequence_address??'',o.note??'',o.physicalId??'',o.networkId??'',o.exploreId??'',o.investigationRole??'',o.originStep??'',o.originId?o.embodiedAction??'':''].join(':');
const copy=o=>JSON.parse(JSON.stringify(o));
const bit=(world,pair)=>Array.isArray(pair)&&!!((world.state.flags?.[pair[0]]||0)&(1<<pair[1]));
const flagAddress=(world,o)=>o.flag_address??world.data?.campaign?.missions?.[Math.max(0,(world.scene.chapter||world.state.chapter||1)-1)]?.flag_address;
const ownBit=(world,o,n=o.bit)=>Number.isInteger(n)&&bit(world,[flagAddress(world,o),n]);
const walk=(scene,p)=>scene.floor[p[1]]?.[p[0]]==='.'&&!(scene.affordanceBlocked||[]).some(q=>q[0]===p[0]&&q[1]===p[1]);
const same=(a,b)=>a?.[0]===b?.[0]&&a?.[1]===b?.[1];
function checkedBranch(scene,start,end){
 if(!walk(scene,start)||!walk(scene,end))return[];const queue=[start],seen=new Set([start.join(',')]),previous=new Map();
 for(let i=0;i<queue.length&&i<scene.width*scene.height;i++){
  const p=queue[i],k=p.join(',');if(same(p,end)){const out=[];let at=k;while(at){out.push(at.split(',').map(Number));at=previous.get(at);}return out.reverse();}
  for(const[dx,dz]of[[0,-1],[-1,0],[1,0],[0,1]]){const q=[p[0]+dx,p[1]+dz],next=q.join(',');if(!seen.has(next)&&walk(scene,q)){seen.add(next);previous.set(next,k);queue.push(q);}}
 }return[];
}

function controlsFor(world,objects){
 const source=objects??world.scene.objects??[],origin=world.scene.originId;
 if(!origin)return source.filter(o=>xy(o)&&!o.hidden&&!o.originId&&(TYPES.has(o.type)||o.investigationRole));
 // Completed people and workstations still belong to the place. Current
 // physical choice handles replace only their own native narrative marker.
 const descriptors=source.filter(o=>xy(o)&&o.originId===origin&&o.type==='embodied-action'&&o.embodiedAction!=='depart');
 const native=(world.scene.objects||[]).filter(o=>xy(o)&&o.originId===origin&&Number.isInteger(o.originStep)&&o.originStep<4&&!['patrol','portal'].includes(o.type)&&!descriptors.some(d=>d.originStep===o.originStep));
 return [...native,...descriptors];
}
function staticPlan(world,objects){
 const scene=world.scene,controls=controlsFor(world,objects),signature=controls.map(key).sort().join('|');
 const floorSignature=JSON.stringify([scene.floor,scene.household?.floorBase??null]),blockedSignature=JSON.stringify(scene.affordanceBlocked||[]),partitionSignature=JSON.stringify(scene.household?.partitions||[]);
 const prior=CACHE.get(scene);
 if(prior&&prior.floorSignature===floorSignature&&prior.blockedSignature===blockedSignature&&prior.partitionSignature===partitionSignature&&prior.revision===(scene.geometryRevision??scene.floorRevision??scene.revision)&&prior.signature===signature)return prior.plan;
 const architecture=dungeonArchitectureSpec(world),origin=scene.originId?originStagingPlan(world):null;
 // Avoid World.objects/available/done: some native readers migrate old saves.
 const facade=Object.create(world);facade.objects=()=>controls;
 const building=architecture?dungeonArchitecturePlan(facade):null;
 const scope=origin?.spec?'origin':architecture?'dungeon':controls.length?'controls':null,anchors=[],mechanisms=[],routes=[];
 const addAnchor=(id,point,role,extra={})=>{const anchor={id,xy:point.slice(),x:point[0]+.5,z:point[1]+.5,role,...extra};anchors.push(anchor);return anchor;};
 if(scope){const arrival=origin?.arrival? [Math.floor(origin.arrival.x),Math.floor(origin.arrival.z)]:scene.arrive;if(Array.isArray(arrival))addAnchor('arrival',arrival,'approach');}
 for(const o of controls){
  const id='mechanism:'+key(o),anchorId='anchor:'+key(o),spec=o.originId?originSpec(o):campaignActuatorSpec(world,o),form=formFor(world,o,spec);
  addAnchor(anchorId,o.xy,o.investigationRole==='evidence'||['receiver','lamp'].includes(spec.manipulation)?'read':'manipulate',{mechanismId:id});
  mechanisms.push({id,anchorId,object:copy(o),actuatorFamily:spec.actuatorFamily,manipulation:spec.manipulation,form,routeIds:[]});
 }
 if(scope){
  const extras=[...(scene.doors||[]).map(o=>({...o,type:'door'})),...(objects??scene.objects??[])];const seen=new Set();
  for(const o of extras){if(!xy(o)||!['door','portal','boss','patrol'].includes(o.type))continue;const k=key(o);if(seen.has(k))continue;seen.add(k);addAnchor('native:'+k,o.xy,['door','portal'].includes(o.type)?'threshold':'encounter',{object:copy(o)});}
 }
 const addRoute=(id,points,ids)=>{
  if(points.length<2||points.some(p=>!walk(scene,p))||points.some((p,i)=>i&&Math.abs(p[0]-points[i-1][0])+Math.abs(p[1]-points[i-1][1])!==1))return;
  const mechanismIds=[...new Set(ids)];if(!mechanismIds.length)return;
  routes.push({id,points:points.map(p=>p.slice()),mechanismIds});for(const m of mechanisms)if(mechanismIds.includes(m.id))m.routeIds.push(id);
 };
 if(building){
  for(const r of building.routes){const m=mechanisms.find(m=>key(m.object)===key(r.object));if(m)addRoute('service:'+r.id,r.points,[m.id]);}
  for(const s of building.investigations){const m=mechanisms.find(m=>key(m.object)===key(s.object));if(m)addRoute('investigation:'+m.id,s.wire,[m.id]);}
  for(const s of building.latches){const m=mechanisms.find(m=>key(m.object)===key(s.object));if(m)addRoute('latch:'+m.id,[s.floor,...(same(s.floor,s.object.xy)?[]:[s.object.xy])],[m.id]);}
 }
 if(origin)for(let i=0;i<origin.routes.length;i++){
  const r=origin.routes[i],ids=mechanisms.filter(m=>[r.from,r.to].some(n=>n?.object&&n.object.originStep===m.object.originStep)).map(m=>m.id);
  addRoute('origin-service:'+i,r.cells,ids);
 }
 if(origin)for(const m of mechanisms.filter(m=>m.object.type==='embodied-action')){
  const node=origin.nodes.find(n=>n.object.originStep===m.object.originStep&&n.role!=='creature'&&n.role!=='threshold');
  if(node&&!same(m.object.xy,node.object.xy))addRoute('origin-input:'+m.id,checkedBranch(scene,m.object.xy,node.object.xy),[m.id]);
 }
 const plan={scene:scene.location??world.state.scene,scope,anchors,mechanisms,routes,architecture:architecture?.family??origin?.spec?.family??null};
 CACHE.set(scene,{floorSignature,blockedSignature,partitionSignature,revision:scene.geometryRevision??scene.floorRevision??scene.revision,signature,plan});return plan;
}
function originSpec(o){
 const family={'sable-reed':'relay','iona-lowbank':'valve','rook-regulator':'heater','brass-rail':'signal','riven-tide':'valve','mira-archive':'archive','veyr-storm':'windlock'}[o.originId];
 return {actuatorFamily:family,manipulation:o.manipulation||(o.originStep===0?(o.originId==='veyr-storm'?'receiver':'work'):o.originStep===1?'work':o.originStep===2?'lure':'switch')};
}
function formFor(world,o,spec){
 const f=spec.actuatorFamily;
 if(o.investigationRole){const kind=investigationView(world.state,world.scene.chapter)?.kind;return kind==='leak'?'floodgate':kind==='answer'?'resonance-lock':kind==='custody'?'root-lattice':null;}
 if(o.originId==='veyr-storm')return o.embodiedAction==='repair-1'?'resonance-lock':o.originStep===1||o.embodiedAction==='ground'?'wind-vane':o.originStep===0?'resonance-lock':null;
 if(o.originId==='mira-archive')return o.manipulation==='lamp'||o.originStep===0?'memory-lens':null;
 if(['valve'].includes(f))return 'floodgate';
 if(['bell','phrase'].includes(f))return 'resonance-lock';
 if(f==='winch')return 'counterweight';
 if(['heater','reactor'].includes(f))return 'heat-channel';
 if(f==='garden')return 'root-lattice';
 if(['windlock','vent'].includes(f))return 'wind-vane';
 if(['lens','lamp'].includes(f))return 'memory-lens';
 return null;
}
function originProgress(world,o){
 const c=world.state.chronicle||{},r=world.state.embodiedOrigins?.origins?.[o.originId]||{},choices=c.originId===o.originId?c.choices||{}:{};
 const repair=r.repair??choices.repair,choice=r.choice??choices.destiny,step=c.originId===o.originId?c.step??0:0;
 const saved={step,receiver:!!r.receiver,witnessed:!!r.witnessed,grounded:!!r.grounded,repair:repair??null,vaneRaised:!!r.vaneRaised,coilSeparated:!!r.coilSeparated,diverted:!!r.diverted,choice:choice??null,approach:choices.approach??null};
 let committed=0,done=false;const action=o.embodiedAction;
 if(action==='ground'){done=!!r.grounded;committed=done?1:0;}
 else if(o.originStep===0){done=!!(r.witnessed||r.receiver||step>0);committed=done?1:0;}
 else if(o.originStep===1){done=[0,1].includes(repair)||step>1;committed=done?1:r.grounded?.35:0;}
 else if(o.originStep===2){done=!!r.diverted||choices.approach==='diversion'||step>2;committed=done?1:0;}
 else if(o.originStep===3){done=[0,1].includes(choice)||step>3;committed=done?1:0;}
 // A saved alternative is a real outcome, never a second completed choice.
 if(o.requiresChoice&&done){const selected=o.choiceGroup==='repair'?repair:choice;done=selected===o.choiceIndex;committed=done?1:0;}
 return {committed,done,saved};
}
function investigationProgress(world,o){
 const chapter=world.scene.chapter,s=investigationView(world.state,chapter)||{},role=o.investigationRole,done=!!world.state.exploration?.solved?.includes('district:'+chapter+':latch');let value=0;
 if(chapter===3)value=role==='evidence'?+!!s.traced:role==='control'?(+!!s.isolated + +!!s.vented)/2:+!!s.drained;
 if(chapter===4)value=role==='evidence'?+!!s.heard:role==='control'?clamp((s.phrase||0)/4):+done;
 if(chapter===5)value=role==='control'?(s.phase===2?.5:0):clamp((s.observations||0)/3);
 if(chapter===7)value=role==='evidence'?+!!(s.food||s.custody):role==='control'?+!!s.shelter:+!!s.custody;
 return {committed:done?1:value,done,saved:{...s,solved:done}};
}
function networkProgress(world,o){
 const a=world.state.answeringNetwork||{},works=a.works||[],heard=a.heard||[],has=id=>works.includes(id);let value=0;
 const rows={'chapel-diagram':['chapel-inspected','chapel-return'],'root-cradle':['root-installed'],'heat-diverter':['heat-diverted'],'heat-gauge':['heat-independent'],'water-bleed':['water-opened'],'relay-collar':['relays-opened','relays-distinct'],'assembly-board':['assembly-posted','assembly-return']};
 if(rows[o.networkId])value=rows[o.networkId].filter(has).length/rows[o.networkId].length;
 else if(['water-west','water-east'].includes(o.networkId))value=+heard.includes(o.networkId);
 return {committed:value,done:value===1,saved:{works:[...works],heard:[...heard]}};
}
function savedProgress(world,o){
 if(o.originId)return originProgress(world,o);
 if(o.investigationRole)return investigationProgress(world,o);
 if(o.networkId)return networkProgress(world,o);
 if(o.physicalId){
  const p=world.state.physicalLore||{},entry=PHYSICAL_LORE.find(e=>e.id===o.physicalId),done=!!p.completed?.includes(o.physicalId),installed=!!p.installed?.includes(o.physicalId),steps=p.steps?.[o.physicalId]||0,clock=p.clocks?.[o.physicalId]||0;
  const fraction=entry?.mode==='pump'?steps/3:entry?.mode==='grow'?clock/4:entry?.mode==='listen'?clock/1.6:entry?.mode==='turn'?steps/4:0;
  return {committed:done?1:installed?.25+clamp(fraction)*.5:0,done,saved:{installed,completed:done,steps,clock,mode:entry?.mode??null,orientation:entry?.orientation??null}};
 }
 if(o.exploreId){const done=!!world.state.exploration?.solved?.includes(o.exploreId);return {committed:+done,done,saved:{solved:done}};}
 if(o.frontierStep!==undefined){const active=world.state.frontiers?.active,stage=world.state.frontiers?.stages?.[active]||0,done=stage>o.frontierStep;return {committed:+done,done,saved:{active:active??null,stage}};}
 const stage=bit(world,o.stage_flag),sequence=o.type==='note'?world.state.flags?.['sequence:'+o.sequence_address]||0:0,done=(o.type==='note'?ownBit(world,o,o.completes_bit):ownBit(world,o))&&(!o.choice_id||world.state.storyChoices?.[o.choice_id]!=null);
 const choice=o.choice_id?world.state.storyChoices?.[o.choice_id]:undefined;
 return {committed:done?1:stage?.5:o.type==='note'?clamp(sequence/Math.max(1,o.pattern?.length||1)):0,done,saved:{done,stage,sequence,...(choice!==undefined?{choice:copy(choice)}:{})}};
}
function progressFor(world,m,feedback){
 const state=savedProgress(world,m.object),pending=feedback?.pending,matching=xy(pending?.object)&&key(pending.object)===key(m.object),preview=matching?clamp(pending.progress):0;
 return {...state,preview,value:Math.max(state.committed,preview),status:matching&&!state.done?'moving':state.committed>0?'changed':'before'};
}
function unlocked(world,o){return !(o.requires_flags||[]).some(pair=>!bit(world,pair))&&(o.requires===undefined||ownBit(world,o,o.requires));}

/** No actions, migrations, callbacks or synthetic success state are exposed. */
export function nativeDungeonPlan(world,{objects,feedback=null}={}){
 if(!world?.scene||!world?.state)return {scene:null,scope:null,anchors:[],beats:[],mechanisms:[],forms:[],unsupportedForms:[...NATIVE_MECHANISM_FORMS],currentPhase:null,progress:{complete:0,total:0,value:0},routes:[]};
 const pending=feedback?.pending?.object;
 const source=world.scene.originId&&xy(pending)&&pending.type==='embodied-action'&&!objects?.some(o=>key(o)===key(pending))?[...(objects??world.scene.objects??[]),pending]:objects;
 const fixed=staticPlan(world,source),mechanisms=fixed.mechanisms.map(m=>({...m,progress:progressFor(world,m,feedback)}));
 // A new obstacle can invalidate a shared route even when a caller mutated a
 // floor row in place. Never show a conduit through that newly closed tile.
 const routes=fixed.routes.filter(r=>r.points.every(p=>walk(world.scene,p))),anchors=fixed.anchors.map(a=>({...a,xy:a.xy.slice()}));
 // Choice handles and notes are alternative inputs to one native mechanism,
 // rather than extra tasks that a player must somehow finish twice.
 const groups=new Map();for(const m of mechanisms){const o=m.object,id=o.originId?'origin:'+o.originId+':'+o.originStep:o.type==='note'?'phrase:'+o.sequence_address:m.id;const group=groups.get(id)||{done:false,value:0};group.done||=m.progress.done;group.value=Math.max(group.value,m.progress.committed);groups.set(id,group);}
 const complete=[...groups.values()].filter(g=>g.done).length,total=groups.size,value=total?[...groups.values()].reduce((n,g)=>n+g.value,0)/total:0;
 const ids=role=>anchors.filter(a=>a.role===role).map(a=>a.id),changed=mechanisms.filter(m=>m.progress.committed>0).map(m=>m.anchorId),release=anchors.filter(a=>a.role==='threshold'&&unlocked(world,a.object||{})).map(a=>a.id);
 const beats=NATIVE_DUNGEON_BEATS.map(phase=>({phase,anchorIds:phase==='approach'?ids('approach'):phase==='threshold'?ids('threshold'):phase==='read'?ids('read'):phase==='manipulate'?mechanisms.map(m=>m.anchorId):phase==='encounter'?ids('encounter'):phase==='aftermath'?changed:release})).map(b=>({...b,supported:b.anchorIds.length>0}));
 const near=a=>Math.hypot(a.x-world.state.x,a.z-world.state.y),readPending=mechanisms.some(m=>anchors.find(a=>a.id===m.anchorId)?.role==='read'&&!m.progress.done),nearest=Math.min(...mechanisms.map(m=>near(anchors.find(a=>a.id===m.anchorId))));
 const currentPhase=!fixed.scope?null:feedback?.pending&&mechanisms.some(m=>m.progress.status==='moving')?'manipulate':world.state.mode==='battle'&&ids('encounter').length?'encounter':total&&complete===total?(anchors.some(a=>release.includes(a.id)&&near(a)<2.1)?'release':'aftermath'):nearest>8?'approach':readPending?'read':total?'manipulate':'threshold';
 const forms=[...new Set(mechanisms.map(m=>m.form).filter(Boolean))];
 return {...fixed,anchors,mechanisms,routes,beats,forms,unsupportedForms:NATIVE_MECHANISM_FORMS.filter(f=>!forms.includes(f)),currentPhase,progress:{complete,total,value}};
}
function strip(mesh,a,b,width,color,emission,y=.064,start=0,end=1){
 const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(!length||end<=start)return;
 const ox=-dz/length*width/2,oz=dx/length*width/2,x=a[0]+.5+dx*start,z=a[1]+.5+dz*start,ex=a[0]+.5+dx*end,ez=a[1]+.5+dz*end;
 mesh.quad([x-ox,y,z-oz],[x+ox,y,z+oz],[ex+ox,y,ez+oz],[ex-ox,y,ez-oz],color,6,emission,1,[0,1,0]);
}
/** Flush, restrained signals run through existing native service conduits.
 * They show the hand's preview separately from the saved mechanism's fill. */
export function appendNativeDungeonLegibility(mesh,glow,{world,objects,feedback=null,time=0,range=26}={}){
 const plan=nativeDungeonPlan(world,{objects,feedback});if(!plan.scope)return plan;
 const states=new Map(plan.mechanisms.map(m=>[m.id,m.progress])),warm=[.38,.34,.23],saved=[.35,.60,.55],moving=[.68,.71,.45];
 for(const route of plan.routes){
  const sources=route.mechanismIds.map(id=>states.get(id)).filter(Boolean),committed=Math.max(0,...sources.map(s=>s.committed)),preview=Math.max(0,...sources.filter(s=>s.status==='moving').map(s=>s.preview)),length=route.points.length-1;
  for(let i=1;i<route.points.length;i++){
   const a=route.points[i-1],b=route.points[i];if(Math.hypot(a[0]+.5-world.state.x,a[1]+.5-world.state.y)>range)continue;
   strip(mesh,a,b,.028,warm,.015);
   const fill=clamp(committed*length-(i-1));if(fill>0)strip(mesh,a,b,.031,saved,.055,.066,0,fill);
   // The moving tip sits at the actual held progress; time changes its quiet
   // brightness, never its completion, position, or the native save.
   const position=preview*length-(i-1);if(preview>0&&position>-.16&&position<1.16)strip(mesh,a,b,.052,moving,.09+Math.sin((Number.isFinite(time)?time:0)*4)*.015,.068,Math.max(0,position-.14),Math.min(1,position+.14));
  }
 }
 return plan;
}
