import {mutationOffer,applyMutation} from './progression.mjs';
import {identityFor,nextEnemyAction} from './enemy-identity.mjs';
import {bossState} from './boss-phases.mjs';
import {motionState,strideProfile} from './animation.mjs';
import {inferDiscoveries} from './discovery.mjs';
import {npcSchedule,worldConsequence,migration} from './living-world.mjs';
import {fund,ACTIVITIES} from './economy.mjs';
import {selectContext,actionBar} from './context-ui.mjs';
import {transitionPlan} from './transitions.mjs';
import {auditMobile} from './mobile-audit.mjs';
export function createMomentLayer(host){
 const api={
  progression:{offer:mutationOffer,apply:applyMutation},
  enemies:{identityFor,nextAction:nextEnemyAction}, bosses:{state:bossState}, animation:{motionState,strideProfile},
  discovery:{infer:inferDiscoveries}, world:{npcSchedule,consequence:worldConsequence,migration}, economy:{fund,activities:ACTIVITIES},
  ui:{selectContext,actionBar}, transitions:{plan:transitionPlan}, mobile:{audit:auditMobile},
  hooks:{
   afterVictory(evt){const offers=mutationOffer({seed:evt.encounterId,owned:host.save?.mutations||[],region:evt.region,recent:host.save?.recentMutationOffers||[]});return {offers};},
   prepareEnemy(enemy){return {...enemy,identity:identityFor(enemy.archetype,enemy.id)};},
   observe(obs){return inferDiscoveries(obs,host.save?.discoveries||[]);},
   worldEvent(event){return worldConsequence(host.worldState||{},event);}
  }
 };return api;
}
