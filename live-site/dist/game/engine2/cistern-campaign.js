/** A dungeon entrance is an ordinary field target. Its renderer has its own
 * coordinates; the campaign keeps its exact scene and return position. */
const entrancePositions=new WeakMap();
export function cisternEntrancePosition(world, objects = []) {
 const scene = world.scene;
 if (scene?.location !== 5) return null;
 if(entrancePositions.has(scene))return [...entrancePositions.get(scene)];
 const candidates = [];
 for (let y=38;y<=46;y++) for (let x=16;x<=30;x++) {
  if (!world.walkable(x+.5,y+.5)) continue;
  if (objects.some(o=>o.xy&&Math.hypot(o.xy[0]-x,o.xy[1]-y)<1.5)) continue;
  if (scene.doors?.some(o=>o.xy&&Math.hypot(o.xy[0]-x,o.xy[1]-y)<2)) continue;
  candidates.push({xy:[x,y],distance:Math.hypot(x-21,y-43)});
 }
 const xy=candidates.sort((a,b)=>a.distance-b.distance)[0]?.xy;
 if(xy)entrancePositions.set(scene,[...xy]);
 return xy || null;
}

export function canVisitCistern(world) {
 return !!world && world.state.mode==='field' && world.state.chronicle?.phase!=='past' && !world.state.fieldOrigins?.active;
}

export function installCisternEntrance(world, onEnter) {
 const originalObjects=world.objects.bind(world), originalInteract=world.interact.bind(world);
 world.objects=function(){
  const objects=originalObjects();
  if (this.state.scene!==5 || this.state.chronicle?.phase==='past' || this.state.fieldOrigins?.active) return objects;
  const xy=cisternEntrancePosition(this,objects);
  return xy ? [...objects,{type:'portal',sprite:127,xy,to:'remembering-cistern-3d',cisternEntrance:true,label:'The Remembering Cistern · 3D dungeon',travel_label:'REMEMBERING CISTERN · 3D',text:'A bronze stair descends beneath Cinderfall. Two silent resonators keep watch over the water.'}] : objects;
 };
 world.interact=function(object,...args){
  if (object?.cisternEntrance) {
   if (!canVisitCistern(this) || this.state.scene!==5) return false;
   return onEnter();
  }
  return originalInteract(object,...args);
 };
 return ()=>{world.objects=originalObjects;world.interact=originalInteract;};
}
