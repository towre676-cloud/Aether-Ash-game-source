import {identityFor,nextEnemyAction} from './enemy-identity.mjs';
import {bossState} from './boss-phases.mjs';
import {pick} from './util.mjs';
const OBJECTIVES=['defeat','interrupt','survive','extract','protect','route','disarm'];
export function buildEncounter({id='enc',region='ash',actors=[],difficulty=1,history=[]}={}){
 const prepared=actors.map((a,i)=>({...a,identity:a.identity||identityFor(a.archetype,`${id}:${i}`)}));
 let objective=pick(id+region+history.length,OBJECTIVES);
 if(history.slice(-2).some(x=>x.objective===objective)) objective=OBJECTIVES[(OBJECTIVES.indexOf(objective)+2)%OBJECTIVES.length];
 const pressure=Math.max(1,Math.round(difficulty+prepared.length/2));
 return {id,region,actors:prepared,objective,pressure,openingTell:prepared[0]?.identity?.tell||'shifts its stance',rewardBias:objective==='extract'?'materials':objective==='protect'?'world':'gear'};
}
export function resolveIntent(enemy,world){return nextEnemyAction(enemy,world)}
export function guardianBeat({guardianId,hpRatio,seenPhases=[]}){return bossState(guardianId,hpRatio,seenPhases)}
