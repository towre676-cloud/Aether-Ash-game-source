import {economyState,encounterSalvage} from './economy.js?v=5.18.0';
import {encounterHabitat} from './field-encounters.js?v=5.21.0';
import {isInteriorScene} from './scene-identity.js?v=4.0.0';
import {clearInteractionApproach} from './quest-navigation.js?v=5.21.0';

// Expedition work feeds the existing trade satchel and equipped-core mastery.
// A refuge is optional: neither the road nor the story requires these wins.
const record=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v,a=0,b=1e9)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const point=p=>Array.isArray(p)&&p.length===2&&p.every(v=>integer(v,0,10000));
const materialFor=core=>['tide','water','frost','volt','ward','shade','gravity'].includes(core)?'glass':['mend','gale'].includes(core)?'fiber':'metal';
const regionOf=w=>Math.max(1,Math.min(24,Math.floor(w.scene?.chapter||w.mission?.id||w.state.chapter||1)));
const contextAllowed=w=>!!w?.state&&!w.state.fieldOrigins?.active&&w.state.chronicle?.phase!=='past'&&!w.scene?.originId&&w.scene?.fieldOrigin===undefined;
const allowed=w=>contextAllowed(w)&&w.state.mode==='field';
const regional=(s,r)=>expeditionState(s).regions[r]??={wins:0,restedAt:-1,refuge:null};

export function expeditionState(s){
 return s.expeditions??={version:1,regions:{},wildSerial:-1,patrolClaims:[]};
}

/** Reject corrupt imported progress rather than silently resetting its claims. */
export function validateExpeditions(s){
 const e=s?.expeditions;if(e==null)return true;
 if(!record(e)||e.version!==1||!record(e.regions)||Object.keys(e.regions).length>24||!integer(e.wildSerial,-1)||!Array.isArray(e.patrolClaims)||e.patrolClaims.length>256||new Set(e.patrolClaims).size!==e.patrolClaims.length||e.patrolClaims.some(k=>typeof k!=='string'||!k.length||k.length>180))throw Error('Invalid field expedition history');
 for(const [id,r]of Object.entries(e.regions)){
  if(!/^(?:[1-9]|1\d|2[0-4])$/.test(id)||!record(r)||!integer(r.wins)||!integer(r.restedAt,-1,r.wins)||r.refuge!==null&&(!record(r.refuge)||!integer(r.refuge.scene)||!point(r.refuge.xy)))throw Error('Invalid trail refuge history');
 }
 return true;
}

/** Wild serials are globally increasing. The high-water mark prevents old wins
 * from minting materials without keeping an ever-growing list of encounters. */
export function recordExpeditionVictory(w,origin){
 const o=origin?.object;if(!allowed(w)||!o||!['wild','patrol'].includes(o.type)||o.originId||o.originHero!==undefined||o.rivalId)return null;
 const r=regionOf(w),e=expeditionState(w.state),local=regional(w.state,r);if(local.wins>=1e9)return null;
 let key;
 if(o.type==='wild'){
  if(!integer(o.serial)||o.serial<=e.wildSerial)return null;
  e.wildSerial=o.serial;key='wild:'+o.serial;
 }else{
  if(!integer(origin.scene)||!integer(o.bit,0,63))return null;
  key=origin.scene+':patrol:'+o.bit+':'+(o.frontierId||o.rivalId||'');
  if(e.patrolClaims.includes(key)||e.patrolClaims.length>=256)return null;
  e.patrolClaims.push(key);
 }
 const material=materialFor(o.salvageCore||'earth'),economy=economyState(w.state);
 let quantity=1;
 if(o.type==='wild'){const before=economy.goods[material]||0;economy.goods[material]=Math.min(1e9,before+1);quantity=economy.goods[material]-before;}
 else{
  const recovered=encounterSalvage(w.state,{key,region:r,type:'patrol',core:o.salvageCore||'earth'});
  quantity=recovered?.quantity||(economy.claims.includes('encounter:'+key)?1:0);
 }
 local.wins++;
 const refuge=expeditionObjects(w).find(o=>o.expeditionRegion===r)||null;
 return {region:r,wins:local.wins,material,quantity,refugeUnlocked:local.wins===3,refuge,key};
}

function placement(w){
 const scene=w.scene,blocked=new Set((scene.affordanceBlocked||[]).map(p=>p.join(',')));
 const open=(x,y)=>scene.floor?.[y]?.[x]==='.'&&!blocked.has([x,y].join(','))&&(!w.walkable||w.walkable(x+.5,y+.5));
 const start=[Math.floor(w.state.x),Math.floor(w.state.y)];if(!open(...start))return null;
 const queue=[start],seen=new Set([start.join(',')]),candidates=[];
 const protectedObjects=[...(scene.doors||[]),...(scene.objects||[]).filter(o=>!['patrol','boss'].includes(o.type))].filter(o=>point(o.xy));
 const distance=p=>Math.hypot(p[0]+.5-w.state.x,p[1]+.5-w.state.y);
 for(let i=0;i<queue.length&&i<4096;i++){
  const p=queue[i],d=distance(p);
  if(d>=3&&d<=10&&!protectedObjects.some(o=>Math.hypot(o.xy[0]-p[0],o.xy[1]-p[1])<2.5)&&(scene.objects||[]).filter(o=>['patrol','boss'].includes(o.type)).every(o=>Math.hypot((o.xy||o.enemies?.[0]?.[1]||[-100,-100])[0]-p[0],(o.xy||o.enemies?.[0]?.[1]||[-100,-100])[1]-p[1])>2))candidates.push(p);
  for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){const q=[p[0]+dx,p[1]+dy],k=q.join(',');if(open(...q)&&!seen.has(k)){seen.add(k);queue.push(q);}}
 }
 candidates.sort((a,b)=>Math.abs(distance(a)-5)-Math.abs(distance(b)-5)||a[1]-b[1]||a[0]-b[0]);
 return candidates[0]||null;
}

/** First suitable outdoor worksite binds the district's refuge permanently.
 * Cinderfall's opening town is the first district's shared worksite: its other
 * creature habitats are indoors. Later towns keep their established services.
 * Damaged and repaired forms share a tile, so progress changes the place. */
export function expeditionObjects(w){
 if(!contextAllowed(w)||!w.scene||!encounterHabitat(w.scene)||isInteriorScene(w.scene)||['hub','home'].includes(w.scene.key)||w.scene.key==='town'&&w.scene.chapter!==1||!integer(w.scene.chapter,1,24))return [];
 const r=regionOf(w),local=regional(w.state,r);
 if(!local.refuge){if(!allowed(w))return [];const xy=placement(w);if(!xy)return [];local.refuge={scene:w.state.scene,xy};}
 if(local.refuge.scene!==w.state.scene)return [];
 const xy=local.refuge.xy;if(w.scene.floor?.[xy[1]]?.[xy[0]]!=='.'||(w.scene.affordanceBlocked||[]).some(p=>p[0]===xy[0]&&p[1]===xy[1]))return [];
 const ready=local.wins>=3;
 return [{type:'trail-refuge',expeditionRegion:r,xy:[...xy],ready,wins:local.wins,label:ready?'Trail refuge · recover & refine':'Repair trail refuge · '+local.wins+' / 3 encounters',id:'trail-refuge:'+r}];
}

function nearbyRefuge(w){
 if(!allowed(w))return null;
 return expeditionObjects(w).find(o=>o.ready&&clearInteractionApproach(w.scene,[w.state.x,w.state.y],o))||null;
}

/** The next resolved encounter renews one modest recovery, never idle time,
 * reopening a menu, re-entering a room, or loading a save. */
export function recoverAtExpedition(w){
 const o=nearbyRefuge(w);if(!o)return false;const local=regional(w.state,o.expeditionRegion);if(local.restedAt>=local.wins)return false;
 const crew=(w.state.party||[]).map(id=>w.state.heroes?.[id]).filter(Boolean);let changed=false;
 for(const h of crew){const hp=Math.min(h.maxHp,h.hp+Math.ceil(h.maxHp*.25)),mp=Math.min(h.maxMp,h.mp+Math.ceil(h.maxMp*.2));if(hp>h.hp||mp>h.mp)changed=true;}
 if(!changed)return false;
 for(const h of crew){h.hp=Math.min(h.maxHp,h.hp+Math.ceil(h.maxHp*.25));h.mp=Math.min(h.maxMp,h.mp+Math.ceil(h.maxMp*.2));}
 local.restedAt=local.wins;return true;
}

export function refineExpeditionCore(w,heroId,core){
 if(!nearbyRefuge(w)||!w.state.party?.includes(heroId))return false;
 const h=w.state.heroes?.[heroId];if(!h||!h.loadout?.some(slot=>slot.core===core))return false;
 const current=h.ap?.[core]||0;if(!Number.isFinite(current)||current>=120)return false;
 const material=materialFor(core),goods=economyState(w.state).goods;if((goods[material]||0)<2)return false;
 goods[material]-=2;h.ap??={};h.ap[core]=Math.min(120,current+8);return true;
}

function chooseRefinement(w){
 const heroes=w.state.party.map(id=>w.state.heroes[id]).filter(h=>h.loadout?.some(s=>(h.ap?.[s.core]||0)<120));
 if(!heroes.length)return w.text('Your equipped cores are fully mastered. Change the crew’s loadout to practise another core.');
 w.choose('Choose whose equipped core to refine. Recovered materials are spent only when you confirm a core.',heroes.map(h=>[h.name,()=>{
  const cores=[...new Set(h.loadout.map(s=>s.core))].filter(core=>(h.ap?.[core]||0)<120);
  w.choose(h.name+' · refine an equipped core',cores.map(core=>{const good=materialFor(core),ap=h.ap?.[core]||0;return [core+' · 2 '+good+' → +'+Math.min(8,120-ap)+' mastery AP ('+ap+' / '+(ap<35?35:120)+')',()=>w.text(refineExpeditionCore(w,h.id,core)?core+' deepens through practice. Mastery AP: '+h.ap[core]+'.':'Bring 2 '+good+' and return to the repaired refuge with this core equipped.')];}).concat([['Return',()=>{}]]));
 }]).concat([['Return',()=>{}]]));
}

export function interactExpedition(w,o){
 if(o?.type!=='trail-refuge')return false;
 const actual=expeditionObjects(w).find(v=>v.expeditionRegion===o.expeditionRegion);
 if(!actual||!clearInteractionApproach(w.scene,[w.state.x,w.state.y],actual))return true;
 const local=regional(w.state,o.expeditionRegion);
 if(!actual.ready){w.text('A broken shelter marks this worksite. Resolve '+(3-local.wins)+' more local creature encounter'+(3-local.wins===1?'':'s')+' to make it usable. Fighting, protecting an objective, and letting the creatures withdraw all count. The road stays open while you explore.');return true;}
 w.choose('TRAIL REFUGE\nThe cleared worksite now has a dry bench and a safe place to practise. Local encounters resolved: '+local.wins+'.',[['Recover 25% HP and 20% MP'+(local.restedAt>=local.wins?' · used; resolve another encounter':''),()=>w.text(recoverAtExpedition(w)?'The travelling crew recovers. Another resolved encounter renews this rest.':local.restedAt>=local.wins?'This rest has been used. Resolve another encounter before returning.':'The travelling crew is already rested.')],['Refine an equipped core · spend 2 materials for 8 mastery AP',()=>chooseRefinement(w)],['Keep exploring',()=>{}]]);
 return true;
}
