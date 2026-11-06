import {buildEncounter,resolveIntent} from './encounter-director.mjs';
import {postVictoryChoice} from './progression-reward.mjs';
import {inferDiscoveries} from './discovery.mjs';
import {worldConsequence} from './living-world.mjs';
export function sampleLoop(seed='sample'){
 const encounter=buildEncounter({id:seed,region:'orchard',actors:[{id:'r',archetype:'raptor'},{id:'m',archetype:'mole'}],difficulty:2});
 const intent=resolveIntent(encounter.actors[0],{actors:[{id:'lead',noise:8},{id:'ally',noise:2}]});
 const rewards=postVictoryChoice({encounterId:seed,region:'orchard',gearDrop:{id:'rootglass-ring'},worldUnlock:{id:'river-landing'}});
 const discoveries=inferDiscoveries([{kind:'tracks',target:'hidden-nest'},{kind:'resonance',target:'hidden-nest'}],[]);
 const world=worldConsequence({traffic:0,monsterPressure:2},{kind:'repair',id:'river-landing'});
 return {encounter,intent,rewards,discoveries,world};
}
