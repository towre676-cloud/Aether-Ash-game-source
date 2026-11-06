/** Ash & Aether — production-safe resident bridge.
 * Does not own health, loot, NPCs, world locations, quests, saves or battle math.
 * The live game's authoritative actor registry MUST supply actual identities.
 * Host integration is deliberately explicit and fail-closed.
 */
const reachable=(a,b,r)=>Number.isFinite(a?.x)&&Number.isFinite(a?.z)&&Number.isFinite(b?.x)&&Number.isFinite(b?.z)&&Math.hypot(a.x-b.x,a.z-b.z)<=r+1e-9;
export function createResidentBridge({getActor,getParty,canReach,guideTo,beginBattle,observeResident}={}){
 for(const [key,fn] of Object.entries({getActor,getParty,canReach,guideTo,beginBattle,observeResident}))if(typeof fn!=='function')throw new TypeError('Missing authoritative host callback: '+key);
 function resolve(id){if(typeof id!=='string'||!id||id.length>160)return {ok:false,reason:'Invalid resident ID'};
  const actor=getActor(id),party=getParty();
  if(!actor||!actor.alive||!actor.visible||actor.id!==id||!Number.isFinite(actor.x)||!Number.isFinite(actor.z)||!party||!Number.isFinite(party.x)||!Number.isFinite(party.z)||actor.region!==party.region)return {ok:false,reason:'Resident is not present on the current map'};
  return {ok:true,actor,party};
 }
 function guard(resolved,maxDistance){if(!resolved.ok)return resolved;
  if(!reachable(resolved.actor,resolved.party,maxDistance))return {ok:false,reason:'Move closer to this resident'};
  if(!canReach(resolved.party,resolved.actor))return {ok:false,reason:'Resident obstructed by terrain or a closed passage'};
  return resolved;
 }
 return Object.freeze({
  inspect(id){const r=resolve(id);if(!r.ok)return r;return {ok:true,id,name:r.actor.name,distance:+Math.hypot(r.actor.x-r.party.x,r.actor.z-r.party.z).toFixed(2)};},
  approach(id){const r=resolve(id);if(!r.ok)return r;return guideTo({actorId:id,region:r.actor.region,target:{x:r.actor.x,z:r.actor.z},stopDistance:3.1});},
  engage(id,eventId){if(typeof eventId!=='string'||!eventId||eventId.length>160)return {ok:false,reason:'Canonical unique event ID required'};
   const r=guard(resolve(id),3.1);if(!r.ok)return r;
   return beginBattle({eventId,actorId:id,region:r.actor.region,target:{x:r.actor.x,z:r.actor.z}});
  },
  study(id,eventId){if(typeof eventId!=='string'||!eventId||eventId.length>160)return {ok:false,reason:'Canonical unique event ID required'};
   const r=guard(resolve(id),7);if(!r.ok)return r;
   return observeResident({eventId,actorId:id,region:r.actor.region,target:{x:r.actor.x,z:r.actor.z}});
  }
 });
}
