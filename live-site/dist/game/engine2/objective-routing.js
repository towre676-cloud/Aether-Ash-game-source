/** Scene routing shared by objective resolvers. It follows the same destinations
 * and explicit locks as World.travelPortal, without moving or changing state. */
export function portalDestination(world,from,portal){
 if(portal.to_region){const m=world.data.campaign.missions[portal.to_region-1],key=portal.to_room??(portal.to==='hub'?undefined:portal.to);return key?world.data.scenes.find(r=>r.chapter===portal.to_region&&r.key===key)||m?.rooms.find(r=>r.key===key):world.scenes.get(m?.rooms[0]?.location)||m?.rooms[0];}
 if(portal.to==='hub')return world.scenes.get(226);
 return world.data.scenes.find(r=>r.chapter===from.chapter&&r.key===portal.to)||world.data.scenes.find(r=>r.key===portal.to);
}
export function openObjectivePortal(world,portal){
 return (!world.available||world.available(portal))&&(portal.requires_flags||[]).every(p=>world.bit(...p))&&(!portal.to_region||portal.to_region<=world.state.chapter||world.state.complete);
}
export function firstObjectivePassage(world,targetLocation,{knownScenes=null}={}){
 if(world.state.scene===targetLocation)return null;
 const queue=[{scene:world.scene,first:null}],seen=new Set([world.state.scene]);
 for(let i=0;i<queue.length;i++){
  const {scene,first}=queue[i];
  const exits=[...(scene.objects||[]).filter(o=>o.type==='portal'),...(scene.doors||[])];
  for(const transport of (scene.objects||[]).filter(o=>o.type==='transport'))for(const target of transport.destinations||[]){const next=target==='hub'?world.scenes.get(226):world.data.scenes.find(r=>r.key===target);if(next)exits.push({...transport,questTransit:true,questDestination:next.location});}
  for(const portal of exits){
   if(!portal.xy||!openObjectivePortal(world,portal))continue;
   const next=portal.type==='transport'?world.scenes.get(portal.questDestination):portalDestination(world,scene,portal);if(!next||knownScenes&&!knownScenes.has(next.location)||seen.has(next.location)||(next.access_requires||[]).some(p=>!world.bit(...p)))continue;
   const step=first||portal;if(next.location===targetLocation)return step.type==='transport'?step:{...step,type:'portal'};
   seen.add(next.location);queue.push({scene:next,first:step});
  }
 }
 return null;
}
export function routeObjective(world,{label,scene,object},{allowGuide=false}={}){
 const location=typeof scene==='number'?scene:scene?.location;
 if(location===world.state.scene){const xy=object?.xy||object?.enemies?.[0]?.[1];return {label,object:xy?{...object,xy:[...xy]}:null};}
 const passage=firstObjectivePassage(world,location);if(passage)return {label,object:passage};
 if(allowGuide){const guide=world.objects().find(o=>o.type==='guide'&&o.xy);if(guide)return {label,object:{...guide,questTransit:true}};}
 return {label,object:null};
}
