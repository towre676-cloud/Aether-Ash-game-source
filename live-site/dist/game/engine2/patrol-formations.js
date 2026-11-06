import {encounterEnemies,makeEnemy} from './battle.js?v=5.38';
import {SPECIES,decorateEnemySpecies} from './repertoire.js?v=5.38';

const roles=new Set(['guard','scout','mender','predator']);
const species=new Map(SPECIES.map(s=>[s.id,s]));
const special=['originId','originHero','originSpecies','originScale','originName','frontierId','frontierSpecies','rivalId','objectiveId','objectiveKind','objective'];
const row=(id,location,key,chapter,bit,site,tactic,members)=>Object.freeze({id,location,key,chapter,bit,site,tactic,members:Object.freeze(members)});

/** These eight existing patrols keep their count, tier and reward identity.
 * Security remains the first mender/caller lesson. The other workplaces use
 * existing interception, repair, alarm and marked-strike relationships. */
export const PATROL_FORMATIONS=Object.freeze([
 row('security-watch',230,'security',1,2,'Security','mender-caller',['scout','mender']),
 row('console-watch',229,'console',1,4,'Console room','caller',['scout']),
 row('workshop-aisle',228,'workshop',1,0,'Workshop','guard-striker',['guard','predator']),
 row('bridge-watch',135,'bridge',2,2,'Rail bridge','guard-caller',['belljelly','clockmole']),
 row('refuge-stores',214,'refuge',2,0,'Refuge stores','guard-mender',['clockmole','mender']),
 row('passage-watch',47,'passages',3,2,'Drainage passages','caller-striker',['belljelly','reedserpent']),
 row('river-pair',49,'river',3,4,'River path','mender-striker',['riverotter','reedserpent']),
 row('bypass-pair',48,'bypass',3,0,'Bypass','guard-striker',['clockmole','reedserpent'])
]);
const profiles=new Map(PATROL_FORMATIONS.map(p=>[p.location+':'+p.bit,p]));
const memberRole=id=>roles.has(id)?id:species.get(id)?.role;

export function patrolFormationProfile(scene,object,chapter=scene?.chapter,context={}){
 if(!scene||object?.type!=='patrol'||scene.originId!=null||scene.fieldOrigin!=null||scene.biome
  ||object.friendly||object.tutorial||object.randomEncounter||context.friendly||context.tutorial||context.wild||context.objective||context.ecology?.enabled
  ||special.some(key=>object[key]!=null))return null;
 const p=profiles.get(scene.location+':'+object.bit);
 if(!p||scene.chapter!==p.chapter||chapter!==p.chapter||scene.key!==p.key||!Array.isArray(object.enemies)||object.enemies.length!==p.members.length)return null;
 return p;
}

/** Shared by field silhouettes, the revealed brief and fresh battle creation.
 * No random choice, world mutation, reward bookkeeping or save migration. A
 * null result leaves every unlisted or authored special encounter unchanged. */
export function patrolFormationEnemies(scene,object,chapter=scene?.chapter,context={}){
 const p=patrolFormationProfile(scene,object,chapter,context);if(!p)return null;
 const defaults=encounterEnemies(chapter,false,p.members.length);
 return p.members.map((id,index)=>{
  const role=memberRole(id),original=defaults[index],same=original.role===role&&(roles.has(id)?!original.species:original.species===id);
  const base=same?original:makeEnemy(role,chapter,index),enemy=same||roles.has(id)?base:decorateEnemySpecies(base,chapter,id);
  return {...enemy,patrolFormation:{version:1,id:p.id,index}};
 });
}

/** A brief is permitted only for the exact actors the host has revealed. A
 * placement token, an unknown pack or stale metadata cannot invent a roster. */
export function revealedPatrolFormation(scene,object,enemies,chapter=scene?.chapter){
 const p=patrolFormationProfile(scene,object,chapter);
 if(!p||!Array.isArray(enemies)||enemies.length!==p.members.length)return null;
 return enemies.every((e,index)=>e?.hp>0&&!e.withdrawn&&e.patrolFormation?.version===1&&e.patrolFormation.id===p.id&&e.patrolFormation.index===index
  &&e.role===memberRole(p.members[index])&&(roles.has(p.members[index])?!e.species:e.species===p.members[index]))?p:null;
}
