/** Cutaway rooms sit in their own shadowed building surround. The native
 * floor, partitions and furniture remain the sole owners of the room plan. */
import {isInteriorScene} from './scene-identity.js';

export function interiorSurroundPlan(world){
 const s=world?.scene;if(!s||!isInteriorScene(s))return null;
 const floor=s.household?.floorBase||s.floor,points=[];
 for(let z=0;z<s.height;z++)for(let x=0;x<s.width;x++)if(floor[z]?.[x]==='.'||s.floor[z]?.[x]==='.')points.push([x,z]);
 if(!points.length)return null;
 return{x0:Math.min(...points.map(p=>p[0])),x1:Math.max(...points.map(p=>p[0]))+1,z0:Math.min(...points.map(p=>p[1])),z1:Math.max(...points.map(p=>p[1]))+1,cells:points.length,
  warm:/home|inn|quarters|carpenter|guild|attic|assembly/.test([s.key,s.interior,s.household?.kind].join(' '))};
}
export function appendInteriorSurround(mesh,{world}={}){
 const p=interiorSurroundPlan(world);if(!p)return null;
 const color=p.warm?[.14,.15,.14]:[.105,.15,.17],edge=p.warm?[.20,.205,.17]:[.16,.205,.215],pad=18;
 // Large quiet planes belong to the building, rather than a forest of the
 // same repeated tree around every bedroom, crypt and underground workshop.
 const quad=(x0,z0,x1,z1,y,c)=>mesh.quad([x0,y,z0],[x0,y,z1],[x1,y,z1],[x1,y,z0],c,6,0,1,[0,1,0]);
 quad(p.x0-pad,p.z0-pad,p.x1+pad,p.z1+pad,-.115,color);
 quad(p.x0-.85,p.z0-.85,p.x1+.85,p.z1+.85,-.095,edge);
 // Continuous footings and a narrow reveal ground all disconnected native
 // wings too. They do not cover, connect or remove any legal floor cells.
 const c=p.warm?[.25,.24,.205]:[.20,.255,.265];
 for(const side of[-1,1]){
  const z=side<0?p.z0-.38:p.z1+.38,x=side<0?p.x0-.38:p.x1+.38;
  quad(p.x0-.4,z-.09,p.x1+.4,z+.09,-.065,c);
  quad(x-.09,p.z0-.4,x+.09,p.z1+.4,-.065,c);
 }
 return p;
}
