import {makeEnemy} from './battle.js?v=5.38';
import {monsterPool,decorateWildEnemy,MONSTER_CATALOG} from './monster-catalog.js?v=5.38';

const hash=value=>{let n=2166136261;for(const c of String(value))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
/** Select by habitat and encounter serial; avoid repeating the last formation. */
export function buildWildEnemies(world,object){
 const s=world.state,chapter=Math.max(1,Math.min(24,object.tier||world.scene.chapter||s.chapter));
 const pool=monsterPool(object.habitat,{chapter});
 const recent=new Set(s.fieldEncounters?.recentSpecies||[]),available=pool.filter(v=>!recent.has(v.id));
 const candidates=available.length?available:pool;if(!candidates.length)throw Error('No creatures inhabit '+object.habitat);
 const used=new Set(),enemies=Array.from({length:Math.max(1,Math.min(3,object.count||1))},(_,i)=>{
  const options=candidates.filter(v=>!used.has(v.id)),list=options.length?options:candidates;
  const species=list[hash([object.seed,object.serial,i].join(':'))%list.length];used.add(species.id);
  const early=chapter===1,scale=early?(s.party.length===1?.78:.95):1;
  const e=decorateWildEnemy(makeEnemy(species.role,chapter,i),species.id,{chapter,scale});
  if(early){e.maxHp=Math.max(64,Math.round(e.maxHp*1.25));e.hp=e.maxHp;e.power*=.65;e.armor=Math.min(18,e.armor||0);e.maxArmor=e.armor;e.speed=Math.min(.85,e.speed);}
  return e;
 });
 if(s.fieldEncounters)s.fieldEncounters.recentSpecies=[...(s.fieldEncounters.recentSpecies||[]),...used].slice(-8);
 object.species=enemies.map(e=>e.species);object.drops=[...new Set(enemies.map(e=>e.drop).filter(Boolean))];
 return enemies;
}

/** Spawn inside the reachable floor component, keeping actors out of walls. */
export function wildPositions(scene,x,y,count){
 const start=[Math.floor(x),Math.floor(y)],queue=[start],seen=new Set([start.join(',')]),cells=[];
 for(let i=0;i<queue.length&&i<180;i++){
  const [cx,cy]=queue[i],distance=Math.hypot(cx+.5-x,cy+.5-y);
  if(distance>=1.4&&distance<=4)cells.push([cx,cy]);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const p=[cx+dx,cy+dy],key=p.join(',');if(!seen.has(key)&&Math.hypot(p[0]-start[0],p[1]-start[1])<=5&&scene.floor[p[1]]?.[p[0]]==='.'){seen.add(key);queue.push(p);}}
 }
 cells.sort((a,b)=>Math.abs(Math.hypot(a[0]+.5-x,a[1]+.5-y)-2.6)-Math.abs(Math.hypot(b[0]+.5-x,b[1]+.5-y)-2.6));
 return Array.from({length:count},(_,i)=>cells[i]||[Math.floor(x),Math.floor(y)]);
}

export function recordWildSighting(state,enemies){
 const ledger=state.monsterJournal??={version:1,sightings:{},victories:{}};
 ledger.sightings??={};ledger.victories??={};
 for(const e of enemies)if(MONSTER_CATALOG.some(s=>s.id===e.species))ledger.sightings[e.species]=(ledger.sightings[e.species]||0)+1;
}
export function recordWildVictory(state,object){
 const ledger=state.monsterJournal??={version:1,sightings:{},victories:{}};ledger.victories??={};
 for(const id of Array.isArray(object.defeatedSpecies)?object.defeatedSpecies:object.species||[])ledger.victories[id]=(ledger.victories[id]||0)+1;
}

export function validWildEncounter(value){
 return value?.type==='wild'&&value.randomEncounter===true&&typeof value.habitat==='string'&&Number.isInteger(value.serial)&&value.serial>=0&&Number.isInteger(value.tier)&&value.tier>=1&&value.tier<=24&&Number.isInteger(value.count)&&value.count>=1&&value.count<=3&&Array.isArray(value.xy)&&value.xy.length===2&&value.xy.every(Number.isFinite)&&(!value.species||Array.isArray(value.species)&&value.species.length<=3&&value.species.every(id=>MONSTER_CATALOG.some(s=>s.id===id)));
}

export function actualWildDrops(object){return Array.isArray(object.defeatedSpecies)?[...new Set(object.defeatedSpecies.map(id=>MONSTER_CATALOG.find(s=>s.id===id)?.drop).filter(Boolean))]:(object.drops||[]);}
