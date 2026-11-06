import {inPast,originObjective} from './origins.js?v=5.38';
import {objectiveFor} from './presentation.js?v=5.41';
import {bellArcObjective} from './bell-witness-arc.js?v=5.16.0';
import {campaignObjective} from './campaign-content.js?v=5.18.0';
import {wayglassObjective} from './wayglass-model.js?v=5.11.0';
import {networkObjective} from './answering-network.js?v=5.18.0';
import {selectedLeadText} from './campaign-purpose.js?v=5.18.0';
/** One resolver for the task button, its walking guide and reproducible QA. */
export function resolveGuidedObjective(world){
 if(!world?.state||!world.scene)return null;
 const goal=inPast(world)?originObjective(world):world.scene.biome?objectiveFor(world):bellArcObjective(world)||networkObjective(world)||campaignObjective(world)||wayglassObjective(world)||objectiveFor(world);
 return goal?{...goal,label:selectedLeadText(world.state,goal.label)}:null;
}
