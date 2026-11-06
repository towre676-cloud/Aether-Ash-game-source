/** Two-position survey of accepted historical events. This suggests *no* loot, doors or quest flags. */
import {ResonanceSurvey,emitFootstep,materialShield} from './acoustic/src/acoustic-simulation.js';
import {authoredSignalSources,acousticSurfaceFor} from './perception.mjs';
import {scoreGains,scoreSceneForBiome} from './acoustic/src/adaptive-score.js';
import {regionAmbience} from './perception.mjs';
const inside=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<=32&&Math.abs(p.z)<=32;
export function authoredSurveySources(atlas){return authoredSignalSources(atlas).map(s=>({id:s.id,position:s.position,audioSignal:'hydrophone',range:s.range,medium:'water'}));}
export class AtlasSurveyV6{
 constructor(atlas){this.atlas=atlas;this.survey=new ResonanceSurvey();this.restore();}
 restore(){const raw=this.atlas.acousticSurveyV2??{};
  // Never trust old epoch discoveries or scans after a new timeline starts.
  if(raw.epoch!==this.atlas.epoch){this.survey=new ResonanceSurvey();return;}
  if(raw.survey)this.survey.restore(raw.survey);
 }
 save(){this.atlas.acousticSurveyV2={epoch:this.atlas.epoch,survey:this.survey.serialize()};}
 scan(position){if(!inside(position))return {ok:false,reason:'out_of_bounds'};
  const sources=authoredSurveySources(this.atlas);
  const heard=this.survey.scan({player:position,objects:sources,minStrength:.08});this.save();
  return {ok:true,heard,sourceCount:sources.length,needsSecondVantage:true};
 }
 resolve(sourceId){if(typeof sourceId!=='string'||sourceId.length>160)return {resolved:false,reason:'invalid_source'};
  const r=this.survey.resolve(sourceId,authoredSurveySources(this.atlas));this.save();
  return {...r,authoritativeAward:false};
 }
 footfall(position,{surface,speed=1,mode='walk',weather='clear',walls=[],enemies=[]}={}){
  if(!inside(position))return {ok:false,reason:'out_of_bounds'};
  return {ok:true,sound:emitFootstep({position,surface,speed,mode,weather,walls,enemies}),authoritativeEnemyUpdates:false};
 }
 soundscape(){const s=this.atlas.summary();return {scene:scoreSceneForBiome(regionAmbience(this.atlas.region)),gains:scoreGains({danger:s.activeEncounter?.hp>0?.9:0,travel:0,discovery:Math.min(1,(this.atlas.acousticSurveyV2?.survey?.discovered?.length||0)/3),story:Math.min(1,s.quests/10)})};}
}
export {emitFootstep,materialShield,scoreGains,acousticSurfaceFor};
