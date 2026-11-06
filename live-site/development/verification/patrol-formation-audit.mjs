import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {earnOpening} from '../../dist/game/engine2/tests/opening-flow.mjs';
import {Battle,encounterEnemies} from '../../dist/game/engine2/battle.js';
import {defaultHero} from '../../dist/game/engine2/mako.js';
import {PATROL_FORMATIONS,patrolFormationEnemies} from '../../dist/game/engine2/patrol-formations.js';
import {fieldPatrolPosition} from '../../dist/game/engine2/field-patrols.js';
import {approachForCommand,commandReach} from '../../dist/game/engine2/combat-engagement.js';
import {combatRoute} from '../../dist/game/engine2/combat-order.js';
import {encounterPreview} from '../../dist/game/engine2/encounter-preview.js';

const identity=e=>({id:e.id,name:e.name,role:e.role,species:e.species||null,atlas:e.atlas||'creatures',sprite:e.sprite,hp:e.hp,maxHp:e.maxHp,power:e.power,speed:e.speed,armor:e.armor,move:e.move||null,shape:e.moveShape||null});
export function auditPatrolFormations(){
 const {w}=earnOpening(),rows=[];
 for(const p of PATROL_FORMATIONS){
  w.state.scene=p.location;w.state.chapter=p.chapter;
  const scene=w.scene,object=scene.objects.find(o=>o.type==='patrol'&&o.bit===p.bit),before=encounterEnemies(p.chapter,false,object.enemies.length),enemies=patrolFormationEnemies(scene,object);
  const prior=before.map(identity),next=enemies.map(identity),preview=encounterPreview(w,object,{enemies});
  enemies.forEach((e,i)=>Object.assign(e,fieldPatrolPosition(w,object,i)));
  const hero=Object.assign(defaultHero(0,p.chapter),{x:scene.arrive[0]+.5,y:scene.arrive[1]+.5}),cells=[];
  for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++)if(w.walkable(x+.5,y+.5))cells.push([x,y]);
  const b=new Battle({heroes:[hero],enemies,chapter:p.chapter,context:{version:1,tags:[],engagement:{version:1,walkCells:cells},encounterTempo:{version:1}}});
  const reachability=enemies.map(e=>{
   const goal=approachForCommand(b,hero,e,'attack'),route=goal&&combatRoute(w,hero,goal),quote=goal&&commandReach(b,{...hero,...goal},e,'attack');
   return {id:e.id,name:e.name,x:e.x,y:e.y,onWalkableFloor:w.walkable(e.x,e.y),connectedApproach:!!route,routePoints:route?.length||0,clearStrikeFromApproach:!!quote?.inRange&&!!quote?.clear};
  });
  rows.push({id:p.id,site:p.site,chapter:p.chapter,scene:p.location,patrolBit:p.bit,before:prior,after:next,
   totals:{beforeHP:prior.reduce((sum,e)=>sum+e.hp,0),afterHP:next.reduce((sum,e)=>sum+e.hp,0),beforeCount:prior.length,afterCount:next.length},reachability,preview,
   existingRewardIdentity:{key:p.location+':patrol:'+p.bit,xp:50+p.chapter*15,credits:object.gold||15+p.chapter*5}});
 }
 return {baselineCommit:'d88e0bec24d39793d57a95bcfe722a04b82e4932',integrationVersion:'5.26.0',
  methodology:'Eight exact ordinary patrol sites from the canonical World are selected by scene, chapter, key, bit and actor count. Before/after rosters use the same encounter tier. Walkability uses World.walkable; reachability uses the shared combat approach and order routes from each real scene entrance. Previews use the earned opening crew and actually selected new roster. This is a generation, reachability and truthful-brief audit; it is not a human playtest or a combat-duration benchmark. Focused tests separately exercise guard interception versus direct Earth, exact old actor restore, excluded encounter kinds and repeated reward settlement.',rows};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=auditPatrolFormations();fs.writeFileSync(new URL('./patrol-formation-audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 for(const row of report.rows)console.log(JSON.stringify({site:row.site,before:row.before.map(e=>e.name).join(' + '),after:row.after.map(e=>e.name).join(' + '),hp:row.totals.afterHP,actors:row.totals.afterCount,reachable:row.reachability.every(e=>e.onWalkableFloor&&e.connectedApproach&&e.clearStrikeFromApproach),xp:row.existingRewardIdentity.xp,credits:row.existingRewardIdentity.credits}));
}
