import {originById} from './origin-content.js?v=5.18.0';

const KINDS=['supply','escort','regulator','signal'];
const FIRST=['supply','escort','regulator','supply','signal','signal','signal'];
const TITLES={escort:'Bring the patient to shelter',regulator:'Stabilize the pressure regulator',supply:'Secure the scattered field stores',signal:'Silence the hostile relay'};
const REPAIR_TOOLS=['bell','bell','hook','hook','plank','hook','coil'];
const ASSETS={escort:['patient','Injured traveller'],regulator:['regulator','Pressure regulator'],supply:['stores','Field medicine stores'],signal:['relay','Signal relay']};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=value=>{let n=2166136261;for(const c of String(value))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const center=cell=>({x:cell[0]+.5,y:cell[1]+.5});
const key=cell=>cell.join(',');

/** A bounded connected floor patch. It carries enough topology for battle AI
 * without embedding entire world scenes into every encounter save. */
function localPatch(scene,x,y){
 let start=[Math.floor(x),Math.floor(y)];
 if(scene.floor[start[1]]?.[start[0]]!=='.'){
  let best=null;for(let cy=0;cy<scene.height;cy++)for(let cx=0;cx<scene.width;cx++)if(scene.floor[cy]?.[cx]==='.'){
   const d=Math.hypot(cx+.5-x,cy+.5-y);if(!best||d<best.d)best={cell:[cx,cy],d};
  }
  if(!best)return {cells:[],parents:new Map(),start:null};start=best.cell;
 }
 const q=[start],seen=new Set([key(start)]),parents=new Map();
 for(let i=0;i<q.length&&q.length<180;i++){
  const [cx,cy]=q[i];
  for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){
   const next=[cx+dx,cy+dy],k=key(next);
   if(seen.has(k)||scene.floor[next[1]]?.[next[0]]!=='.'||(scene.affordanceBlocked||[]).some(p=>p[0]===next[0]&&p[1]===next[1])||Math.hypot(next[0]-start[0],next[1]-start[1])>9)continue;
   seen.add(k);parents.set(k,[cx,cy]);q.push(next);if(q.length>=180)break;
  }
 }
 return {cells:q,parents,start};
}
function pathBetween(cells,from,to){
 const permitted=new Set(cells.map(key)),start=[Math.floor(from.x),Math.floor(from.y)],goal=[Math.floor(to.x),Math.floor(to.y)],q=[start],seen=new Set([key(start)]),parents=new Map();
 for(let i=0;i<q.length;i++){
  const p=q[i];if(key(p)===key(goal))break;
  for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){const n=[p[0]+dx,p[1]+dy],k=key(n);if(!permitted.has(k)||seen.has(k))continue;seen.add(k);parents.set(k,p);q.push(n);}
 }
 if(!seen.has(key(goal)))return [];
 const out=[goal];while(key(out[0])!==key(start)){const p=parents.get(key(out[0]));if(!p)return[];out.unshift(p);}
 return out.map(center);
}
function timelineState(world,kind){
 const s=world.state,scene=world.scene,c=s.chronicle,origin=scene.originId?originById(scene.originId):null,region=origin?.chapter||scene.chapter||s.chapter||1;
 const record=(c?.records||[]).filter(r=>originById(r.originId)?.chapter===region).at(-1);
 const current=c?.phase==='past'&&scene.originId===c.originId?c.choices:null;
 const repair=[0,1].includes(current?.repair)?current.repair:record?.repair;
 const destiny=[0,1].includes(current?.destiny)?current.destiny:record?.destiny;
 const completed=new Set(s.physicalLore?.completed||[]),works=s.economy?.districts?.[region]?.works||[];
 const shelter=works.includes('commons')||completed.has('shelter-reed')&&(region===1||kind==='escort');
 const workshop=works.includes('workshop')||completed.has('grounding-spool')&&(region===6||kind==='signal');
 const ventilated=completed.has('vent-vane')&&(region===22||kind==='regulator');
 const resonant=completed.has('bell-fork')&&(region===16||kind==='signal');
 const aids=s.objectiveHistory?.aids?.[String(scene.location)]||{};
 const sourceOrigin=origin||originById(record?.originId);
 return {region,repair,destiny,shelter,workshop,ventilated,resonant,aids,sourceOrigin,effect:record?.effect||null,seed:hash(JSON.stringify([s.timeline?.id,s.timeline?.era,s.encore?.seed||0,c?.cycle||0,scene.originId||'',repair,destiny,record?.effect||'',shelter,workshop,ventilated,resonant,aids]))};
}
function chooseAsset(patch,start,seed,destiny){
 const near=patch.cells.map(center).filter(p=>dist(p,start)>=1&&dist(p,start)<=2.5);
 if(!near.length)return {...start};
 // A civic destination changes the actual approach tile, not only its label.
 const preferred=near.filter(p=>destiny===0?p.y>=start.y:destiny===1?p.x>=start.x:true),pool=preferred.length?preferred:near;
 return pool[seed%pool.length];
}
function chooseRoute(patch,asset,seed,repair,destiny){
 const routes=patch.cells.map(center).map(p=>pathBetween(patch.cells,asset,p)).filter(path=>path.length>=5&&path.length<=9);
 if(!routes.length){const fallback=patch.cells.map(center).map(p=>pathBetween(patch.cells,asset,p)).sort((a,b)=>b.length-a.length);return (fallback[0]||[asset]).slice(0,9);}
 const bearing=repair===0?1:destiny===0?2:destiny===1?3:0;
 const scored=routes.map(path=>{const end=path.at(-1),a=Math.atan2(end.y-asset.y,end.x-asset.x),wanted=[0,-Math.PI/2,Math.PI/2,Math.PI][bearing];return {path,score:Math.cos(a-wanted)*3+path.length*.2};}).sort((a,b)=>b.score-a.score);
 const top=scored.slice(0,Math.min(4,scored.length));return top[(seed>>>8)%top.length].path;
}
function coverageNodes(patch,asset,seed){
 const nearby=patch.cells.map(center).filter(p=>dist(p,asset)>=1.25&&dist(p,asset)<=3.25),out=[];
 const directions=[[1,0,'East'],[0,1,'South'],[-1,0,'West'],[0,-1,'North']];
 for(const [dx,dy,label]of directions){
  const candidates=nearby.filter(p=>!out.some(v=>v.x===p.x&&v.y===p.y)).map(p=>({p,score:((p.x-asset.x)*dx+(p.y-asset.y)*dy)/dist(p,asset)-Math.abs(dist(p,asset)-2)*.08})).sort((a,b)=>b.score-a.score);
  if(candidates[0])out.push({id:'coverage-'+out.length,label:label+' return node',...candidates[0].p});
 }
 if(out.length<2)for(const cell of patch.cells){const p=center(cell);if(!out.some(v=>v.x===p.x&&v.y===p.y)&&dist(p,asset)>.5)out.push({id:'coverage-'+out.length,label:'Alternate return node',...p});if(out.length>=2)break;}
 // Rotate labels/order while retaining real geometry; this affects the first
 // available projection and pattern, not just a cosmetic seed string.
 if(out.length){const rotate=seed%out.length;return out.slice(rotate).concat(out.slice(0,rotate));}return out;
}

/** Wild encounters receive concrete goals early, with ordinary fights between
 * them. Authored guardians and story milestones keep their existing contracts. */
export function objectiveEncounterContext(world,object,baseContext={}){
 const context={...baseContext};if(object?.type!=='wild')return context;
 const s=world.state,serial=Math.max(1,Math.floor(object.serial||1)),hero=clamp(s.party?.[0]||0,0,6);
 const requested=KINDS.includes(object.objectiveKind)?object.objectiveKind:null;
 if(!requested&&serial>1&&serial%4===0)return context;
 const kind=requested||(serial===1?FIRST[hero]:KINDS[(serial+hero)%KINDS.length]);
 const lineage=timelineState(world,kind),seed=hash([lineage.seed,world.scene.location,serial,object.seed||0,kind].join(':'));
 const patch=localPatch(world.scene,s.x,s.y);if(patch.cells.length<3)return context;
 const start=center(patch.start),assetPoint=chooseAsset(patch,start,seed,lineage.destiny);let route=chooseRoute(patch,assetPoint,seed,lineage.repair,lineage.destiny);const safeNodes=coverageNodes(patch,assetPoint,seed);
 let required=3,deadline=kind==='escort'?65:kind==='regulator'?58:kind==='supply'?52:48,maxHp=96+Math.min(24,object.tier||s.chapter||1)*8;
 const provenance=[];
 if(lineage.repair===0){required=2;provenance.push((lineage.sourceOrigin?.repair?.[0]||'A manual bypass survives')+' · two mechanism actions instead of three');}
 if(lineage.repair===1){deadline+=8;provenance.push((lineage.sourceOrigin?.repair?.[1]||'A reversible fitting survives')+' · eight extra seconds and a spare instrument tool');}
 if(lineage.destiny===0){maxHp+=24;provenance.push((lineage.sourceOrigin?.choices?.[0]||'Public shelter inheritance')+' · reinforced protection and a shelter-side approach');}
 if(lineage.destiny===1){deadline+=6;provenance.push((lineage.sourceOrigin?.choices?.[1]||'Shared workshop inheritance')+' · an alternate approach and six extra seconds');}
 if(lineage.shelter){maxHp+=20;provenance.push('The local shelter is restored · twenty extra integrity');}
 if(lineage.workshop){required=Math.max(2,required-1);provenance.push('Grounded workshop circuit · fewer adjustments needed');}
 if(lineage.ventilated){deadline+=8;provenance.push('The restored vent eases pressure · eight extra seconds');}
 if(lineage.resonant){deadline+=6;provenance.push('The repaired bell keeps a reply window · six extra seconds');}
 if(lineage.aids.escort){maxHp+=12;if(kind==='escort'&&route.length>5)route=route.slice(0,5);provenance.push('A cleared local shelter route · shorter escort and twelve extra integrity');}
 if(lineage.aids.regulator){required=Math.max(2,required-1);provenance.push('This regulator has a fitted bypass · fewer mechanism adjustments');}
 if(lineage.aids.signal){deadline+=6;provenance.push('The local relay now leaves a reply window · six extra seconds');}
 if(lineage.aids.supply)provenance.push('Secured local stores leave one spare brace');
 const assetName=kind==='escort'&&hero===1?'Lowbank patient':ASSETS[kind][1];
 const spec={version:1,id:'objective-'+world.scene.location+'-'+serial+'-'+kind+'-'+seed.toString(36),kind,label:TITLES[kind],seed,
  asset:{id:'objective-asset',name:assetName,x:assetPoint.x,y:assetPoint.y,hp:maxHp,maxHp,status:{},team:'heroes'},
  route:kind==='escort'?route:[assetPoint],walkable:patch.cells.map(p=>p.slice()),safeNodes,required,deadline,speed:.34,stableTime:8,
  pattern:Array.from({length:4},(_,i)=>(seed>>>(i*5))%4),provenance,region:lineage.region,
  lineage:{repair:lineage.repair??null,destiny:lineage.destiny??null,effect:lineage.effect},
  mechanism:kind==='regulator'?'pressure-valve':kind==='signal'?'return-channel':kind==='supply'?'field-store-latches':'patient-escort'};
 context.objective=spec;
 const props=(baseContext.fieldProps||[]).map(p=>({...p}));
 if((lineage.repair===1||lineage.workshop||lineage.resonant)&&props.length<6){
  const node=safeNodes[0]||assetPoint,type=lineage.workshop?'coil':lineage.resonant?'bell':REPAIR_TOOLS[lineage.sourceOrigin?.hero??0];
  props.push({id:'inheritance-'+type,type,x:node.x,y:node.y,source:lineage.workshop?'Grounded workshop inheritance':lineage.resonant?'Repaired reply bell':'Reversible fitting from this timeline'});
 }
 if(lineage.aids.supply&&props.length<6){const node=safeNodes.at(-1)||assetPoint;props.push({id:'secured-store-brace',type:'plank',x:node.x,y:node.y,source:'Previously secured local stores'});}
 if(props.length)context.fieldProps=props;
 return context;
}

/** Settlement returns a modest bonus, doubled for a nonlethal goal finish;
 * the caller awards resources once after
 * receiving it. Local physical aids are boolean so repeated wins never stack. */
export function settleObjectiveHistory(state,object,summary={}){
 if(!state||!object||object.type!=='wild'||!summary?.id||typeof summary.id!=='string'||!KINDS.includes(summary.kind))return null;
 const ledger=state.objectiveHistory??={version:1,records:[],aids:{}};if(!Array.isArray(ledger.records))ledger.records=[];if(!ledger.aids||typeof ledger.aids!=='object'||Array.isArray(ledger.aids))ledger.aids={};
 if(ledger.records.some(r=>r.id===summary.id))return null;
 const result=summary.result==='loss'?'loss':'win',scene=object.scene??state.scene;
 const record={id:summary.id.slice(0,140),kind:summary.kind,scene,serial:Math.max(1,Math.floor(object.serial||1)),result,nonlethal:summary.nonlethal===true,integrity:Number.isFinite(summary.integrity)?Math.max(0,Math.round(summary.integrity)):null,chapter:state.chapter};
 ledger.records.push(record);ledger.records=ledger.records.slice(-128);
 if(result==='loss')return {xp:0,gold:0,items:[],record};
 const local=ledger.aids[String(scene)]??={};local[summary.kind]=true;
 const entries=Object.entries(ledger.aids);if(entries.length>128)ledger.aids=Object.fromEntries(entries.slice(-128));
 const item={escort:'tonic',regulator:'coolingPaste',supply:'ether',signal:'clockOil'}[summary.kind];
 const bonus=summary.nonlethal===true?16:8;
 return {xp:bonus,gold:bonus,items:[{id:item,count:1}],record,aid:summary.kind};
}

export function validObjectiveHistory(value){
 if(value==null)return true;
 if(value.version!==1||!Array.isArray(value.records)||value.records.length>128||!value.aids||typeof value.aids!=='object'||Array.isArray(value.aids)||Object.keys(value.aids).length>128)return false;
 const ids=new Set();for(const r of value.records){if(!r||typeof r.id!=='string'||r.id.length>140||ids.has(r.id)||!KINDS.includes(r.kind)||!['win','loss'].includes(r.result)||!Number.isInteger(r.scene)||!Number.isInteger(r.serial)||r.serial<1||typeof r.nonlethal!=='boolean'||r.integrity!==null&&(!Number.isFinite(r.integrity)||r.integrity<0))return false;ids.add(r.id);}
 for(const [scene,aid]of Object.entries(value.aids))if(!/^\d+$/.test(scene)||!aid||typeof aid!=='object'||Array.isArray(aid)||Object.entries(aid).some(([kind,on])=>!KINDS.includes(kind)||on!==true))return false;
 return true;
}
