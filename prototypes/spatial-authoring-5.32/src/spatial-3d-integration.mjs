import {authorScene,placementHealth} from './scene-composer.mjs';
import {buildDungeonSequence,applyDungeonAction} from './dungeon-director.mjs';
import {buildMusicPlan} from './music-continuity.mjs';

export function createSpatialAuthoringLayer(host){
  if(!host) throw new Error('host required');
  return {
    composeScene(spec){
      const authored=authorScene(spec);
      host.world?.applyAuthoredLayout?.(authored);
      return {authored,health:placementHealth(authored)};
    },
    composeDungeon(spec){
      const dungeon=buildDungeonSequence(spec);
      host.world?.registerDungeonSequence?.(dungeon);
      return dungeon;
    },
    act(room,verb){
      const result=applyDungeonAction(room,verb);
      if(result.success) host.world?.applyVisibleConsequence?.(result);
      return result;
    },
    music(spec){
      const plan=buildMusicPlan(spec);
      host.audio?.setAdaptivePlan?.(plan);
      return plan;
    }
  };
}
