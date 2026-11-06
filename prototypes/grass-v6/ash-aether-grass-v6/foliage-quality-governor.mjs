/** Optional device-adaptive vegetation detail. It never changes ecology samples,
 * persistence, hitboxes, encounters, harvesting or terrain materials.
 * Feed actual host frame deltas (seconds), not simulation-fixed timesteps.
 */
export const FOLIAGE_TIERS=Object.freeze(['low','medium','high','ultra']);
export function createFoliageQualityGovernor({quality='medium',minimum='low',maximum=quality,
  targetFrameMs=33.3,enabled=false}={}){
  for(const t of [quality,minimum,maximum])if(!FOLIAGE_TIERS.includes(t))throw Error('unknown foliage detail tier');
  if(!Number.isFinite(targetFrameMs)||targetFrameMs<8||targetFrameMs>150)throw Error('invalid target frame budget');
  const lo=FOLIAGE_TIERS.indexOf(minimum),hi=FOLIAGE_TIERS.indexOf(maximum);
  if(lo>hi)throw Error('minimum foliage detail exceeds maximum');
  let index=Math.min(hi,Math.max(lo,FOLIAGE_TIERS.indexOf(quality)));
  let badTime=0,goodTime=0,cooldown=0,average=targetFrameMs;
  function observe(dt){
    if(!enabled||!Number.isFinite(dt)||dt<=0||dt>.5)return null;
    const ms=dt*1000;
    // A sampled delta cannot by itself imply that the GPU caused the hitch.
    // The governor only lowers this subsystem's visual allocations.
    average=average*.90+ms*.10;
    cooldown=Math.max(0,cooldown-dt);
    if(average>targetFrameMs*1.16){badTime+=dt;goodTime=0;}
    else if(average<targetFrameMs*.68){goodTime+=dt;badTime=0;}
    else {badTime=0;goodTime=0;}
    if(cooldown>0)return null;
    if(badTime>=3 && index>lo){index--;badTime=goodTime=0;cooldown=7;return FOLIAGE_TIERS[index];}
    if(goodTime>=14 && index<hi){index++;badTime=goodTime=0;cooldown=12;return FOLIAGE_TIERS[index];}
    return null;
  }
  function setEnabled(v){enabled=!!v;badTime=goodTime=0;}
  function setQuality(t){const i=FOLIAGE_TIERS.indexOf(t);if(i<lo||i>hi)throw Error('foliage tier outside allowed range');index=i;badTime=goodTime=0;cooldown=2;}
  function getStats(){return {enabled,quality:FOLIAGE_TIERS[index],targetFrameMs,averageFrameMs:+average.toFixed(2),cooldownSeconds:+cooldown.toFixed(2)};}
  return {observe,setEnabled,setQuality,getStats};
}
