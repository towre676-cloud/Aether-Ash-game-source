import {SCHOOLS,schoolMatches,withDoctrines,BUILD_CAPACITY} from './constellation-model.js';
import {CORES,SUPPORTS,compileTechnique} from './mako.js?v=5.16.0';
/** Player operations decode to actual direction assignments; the counting audit stays exact. */
export const PUZZLE_TYPES={
 earth:{name:'Anchor alignment',rule:'Hold one route steady. Choose its matching symbol.',meaning:'A stable route mirrors Anchorheart’s power to interrupt a charged attack.'},
 mend:{name:'Mending a bridge',rule:'The left light is already fixed. Choose the missing light that joins it to the target.',meaning:'Two partial paths become one complete route, like Mercyglass restoring what is missing.'},
 gale:{name:'Call and echo',rule:'Answer the call first, then repeat its answering symbol. Both steps are shown; there is no timer.',meaning:'A completed call leaves room for a second pulse, like Stormseed’s delayed repeat.'}
};
export function puzzleStep(n,route,phase=0){const D=2**n-1,core=n===2?'earth':n===3?'mend':'gale',type=PUZZLE_TYPES[core];if(core==='mend'){const fixed=route===1?2:1;return{...type,core,fixed,answer:route^fixed,target:route,phase:0,total:1};}if(core==='gale')return{...type,core,fixed:0,answer:phase?route:route%D+1,target:route,phase:phase?1:0,total:2};return{...type,core,fixed:0,answer:route,target:route,phase:0,total:1};}
export function puzzleChoices(step,n){const D=2**n-1;return [...new Set([step.answer,step.answer%D+1,(step.answer+1)%D+1])].sort((a,b)=>((a*7+step.target)%D)-((b*7+step.target)%D));}
export function decodePuzzleAnswer(step,choice){return step.core==='mend'?step.fixed^choice:step.core==='gale'&&step.phase===0?null:choice;}
export function patternCatalogue(s,supportId='focus',heroId=s.party?.[0]??0){const support=SUPPORTS.find(x=>x.id===supportId)||SUPPORTS[0],h=s.heroes?.[heroId];return CORES.map(core=>({id:core.id,name:core.name,known:(s.cores||[]).includes(core.id),color:core.color,role:core.healing?'Restoration':core.status||'Power',technique:withDoctrines(h||{},compileTechnique(core.id,support.id,{character:heroId,ap:h?.ap?.[core.id]||0})),schools:SCHOOLS.filter(x=>schoolMatches(x,{core:core.id,support:support.id})),capacity:BUILD_CAPACITY,support}));}
