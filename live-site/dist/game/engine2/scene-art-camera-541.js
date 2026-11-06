/** Interior composition uses occupied architecture, never the 64-cell export
 * rectangle. Projection and inverse picking remain owned by the renderer. */
import {isInteriorScene} from './scene-identity.js';
import {originArtPlan541} from './origin-art-541.js?v=5.41';
import {dungeonArt541Plan} from './dungeon-art-541.js?v=5.41';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const PLANS=new WeakMap();
function structure(scene){
 const floor=scene.household?.floorBase||scene.floor,partitions=new Set((scene.household?.partitions||[]).map(p=>p.x+','+p.y)),signature=JSON.stringify([floor,scene.household?.partitions]);
 const cached=PLANS.get(scene);if(cached?.signature===signature)return cached;
 const cells=[],set=new Set();for(let z=0;z<scene.height;z++)for(let x=0;x<scene.width;x++)if(floor[z]?.[x]==='.'&&!partitions.has(x+','+z)){cells.push([x,z]);set.add(x+','+z);}
 const result={signature,cells,set,partitions};PLANS.set(scene,result);return result;
}
function component(plan,lead){
 if(!plan.componentFor){
  const groups=new Map();for(const first of plan.cells){const start=first.join(',');if(groups.has(start))continue;const queue=[first];groups.set(start,queue);
   for(let i=0;i<queue.length;i++)for(const[dx,dz]of[[0,-1],[1,0],[0,1],[-1,0]]){const q=[queue[i][0]+dx,queue[i][1]+dz],id=q.join(',');if(plan.set.has(id)&&!groups.has(id)){groups.set(id,queue);queue.push(q);}}
  }plan.componentFor=groups;
 }
 let first=[Math.floor(lead.x),Math.floor(lead.z)];if(!plan.set.has(first.join(',')))first=plan.cells.map(p=>({p,d:Math.hypot(p[0]+.5-lead.x,p[1]+.5-lead.z)})).sort((a,b)=>a.d-b.d)[0]?.p;
 return first?plan.componentFor.get(first.join(','))||[]:[];
}
function nativePoint(o){return Array.isArray(o?.xy)&&o.xy.every(Number.isFinite)?{x:o.xy[0]+.5,z:o.xy[1]+.5}:null;}
function profileHeight(p,b){
 if(b.kind==='desk')return p.spec.family==='archive'?1.94:p.spec.family==='sluice'?2.08:1.30;
 if(b.kind==='diversion')return 1.34;
 if(b.furnishing?.furniture===4&&p.spec.family==='reed')return 2.48;
 return{reed:2.72,waterline:3.00,furnace:3.34,rail:2.70,sluice:2.64,archive:2.66}[p.spec.family]||3.5;
}
/** A stateless frame for the occupied room/wing. Manual lens and active pinch
 * are deliberately left for Adventure3DRenderer.lensProjection to apply. */
export function sceneArtCameraFrame({world,canvas,ui={},lead,p,objects=[],aspect}={}){
 const scene=world?.scene;if(!scene?.floor||scene.originId==='veyr-storm'||!isInteriorScene(scene))return null;
 const rect=canvas?.getBoundingClientRect?.()||{},width=finite(rect.width,canvas?.width),height=finite(rect.height,canvas?.height);if(!(width>0&&height>0))return null;
 const player={x:finite(p?.x,world.state.x),z:finite(p?.z,world.state.y)},focus={x:finite(lead?.x,player.x),z:finite(lead?.z,player.z)},plan=structure(scene),connected=component(plan,focus);if(!connected.length)return null;
 const full={x0:Math.min(...connected.map(q=>q[0])),x1:Math.max(...connected.map(q=>q[0]))+1,z0:Math.min(...connected.map(q=>q[1])),z1:Math.max(...connected.map(q=>q[1]))+1},compact=full.x1-full.x0<=18&&full.z1-full.z0<=18&&connected.length<=250;
 // A playable close camera has hard actor/input requirements. The room is
 // soft context: fitting every exported room edge made the hero miniature.
 const localRadius=4.8,cells=connected.filter(q=>Math.hypot(q[0]+.5-focus.x,q[1]+.5-focus.z)<=localRadius),points=[],architecture=[],add=(x,y,z)=>points.push([x,y,z]),soft=(x,y,z)=>architecture.push([x,y,z]);
 for(const[x,z]of cells)for(const[dx,dz]of[[0,-1],[-1,0]])if(!plan.set.has((x+dx)+','+(z+dz))){
  const partition=plan.partitions.has((x+dx)+','+(z+dz)),h=partition?.93:dz<0?2.98:2.73;
  if(dx){soft(x-.37,h,z);soft(x-.37,h,z+1);}else{soft(x,h,z-.37);soft(x+1,h,z-.37);}
 }
 for(const dx of[-.53,.53])for(const dz of[-.20,.20]){add(player.x+dx,0,player.z+dz);add(player.x+dx,2.05,player.z+dz);}
 const near=q=>Math.hypot(q.x-focus.x,q.z-focus.z)<=localRadius;
 const candidates=objects.map(o=>({object:o,point:nativePoint(o)})).filter(q=>q.point&&Math.hypot(q.point.x-player.x,q.point.z-player.z)<=(q.object.role==='embodiedAction'||q.object.type==='embodied-action'?4.8:4.4)&&
  (q.object.role==='embodiedAction'||['embodied-action','puzzle','switch'].includes(q.object.type))).sort((a,b)=>{
   const priority=o=>o.role==='embodiedAction'||o.type==='embodied-action'?0:o.type==='portal'?2:1;
   return priority(a.object)-priority(b.object)||Math.hypot(a.point.x-player.x,a.point.z-player.z)-Math.hypot(b.point.x-player.x,b.point.z-player.z);
  });
 const selected=candidates[0];if(selected){const q=selected.point,o=selected.object;add(q.x,0,q.z);add(q.x,1.15,q.z);
  if(o.manipulation==='cable')for(const end of[o.from,o.to])if(Number.isFinite(end?.x)&&Number.isFinite(end?.y)){add(end.x,0,end.y);add(end.x,.9,end.y);}
 }
 const origin=originArtPlan541(world);if(origin)for(const b of origin.bodies)if(near(b))soft(b.x,profileHeight(origin,b),b.z);
 const dungeon=dungeonArt541Plan(world);
 for(const support of dungeon.supports||[])if(near(support))soft(support.x,3.01,support.z);
 for(const arch of dungeon.arches||[]){const mid=(arch.x0+arch.x1)/2;if(!near({x:mid,z:arch.z}))continue;const r=(arch.x1-arch.x0)/2,rise=Math.min(1.4,r*.46);soft(mid,2.92+rise+.33,arch.z);}
 if(dungeon.hero&&near(dungeon.hero))soft(dungeon.hero.x,4.22,dungeon.hero.z);
 // This steeper cutaway angle looks past foreground room bulkheads. The lens
 // distance is chosen from the actual lead's projected standing height.
 const at=[focus.x,1.20,focus.z],raw=[.16,1.45,.75],length=Math.hypot(...raw),direction=raw.map(v=>v/length),horizontal=Math.hypot(direction[0],direction[2]),right=[direction[2]/horizontal,0,-direction[0]/horizontal],up=[direction[1]*right[2],direction[2]*right[0]-direction[0]*right[2],-direction[1]*right[0]];
 const wide=width>height*1.3,top=Math.min(height*.30,Math.max(28,finite(ui.hudHeight,16)+14)),bottom=Math.max(top+84,height-(ui.touch&&!wide?Math.min(finite(ui.touchReserve,177),height*.35)+52:26)),left=ui.touch&&wide?Math.min(142,width*.19):Math.min(18,width*.055),rightEdge=width-left;
 const fov=Math.PI/3.4,tangent=Math.tan(fov/2),ratio=finite(aspect,width/height)||width/height;
 const local=q=>{const a=q.map((v,i)=>v-at[i]);return{u:a[0]*right[0]+a[2]*right[2],v:a[0]*up[0]+a[1]*up[1]+a[2]*up[2],depth:a[0]*direction[0]+a[1]*direction[1]+a[2]*direction[2]};},hard=points.map(local),softPoints=architecture.map(local),actor0=local([player.x,0,player.z]),actor1=local([player.x,1.94,player.z]);
 const project=(q,d)=>({x:q.u/(tangent*ratio*(d-q.depth)),y:q.v/(tangent*(d-q.depth))});
 const actorPixels=d=>Math.abs(project(actor1,d).y-project(actor0,d).y)*height/2;
 const bounds=d=>{let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;for(const q of hard){const p=project(q,d);left=Math.min(left,p.x);right=Math.max(right,p.x);bottom=Math.min(bottom,p.y);top=Math.max(top,p.y);}return{left,right,bottom,top};};
 const desired=wide?clamp(height*.14,42,110):clamp(height*.10,68,90);let low=5.5,high=80;
 for(let i=0;i<17;i++){const d=(low+high)/2;if(actorPixels(d)>desired)low=d;else high=d;}
 const closeDistance=high,maxWidth=2*(rightEdge-left)/width,maxHeight=2*(bottom-top)/height;low=Math.max(5.5,...hard.map(q=>q.depth+1.2));high=80;
 for(let i=0;i<17;i++){const d=(low+high)/2,b=bounds(d);if(b.right-b.left>maxWidth||b.top-b.bottom>maxHeight)low=d;else high=d;}
 const distance=Math.max(closeDistance,high),b=bounds(distance),foot=project(actor0,distance),minimumShift=-1+2*left/width-b.left,maximumShift=1-2*left/width-b.right,shiftX=clamp(-foot.x,minimumShift,maximumShift);
 let targetFoot=top+(bottom-top)*(wide?.66:.73);
 const minimumFoot=wide?top+(bottom-top)*.54:Math.min(bottom-36,height*.512),softTop=softPoints.length?Math.min(...softPoints.map(q=>targetFoot-(project(q,distance).y-foot.y)*height/2)):top;
 if(softTop>top+55)targetFoot-=Math.min(softTop-top-55,Math.max(0,targetFoot-minimumFoot));
 // Hard head and input bounds may require a small shift, without moving the
 // feet up into a museum-like patch surrounded by unused backdrop.
 let shiftY=1-2*targetFoot/height-foot.y;
 const minY=-1+2*(height-bottom)/height-b.bottom,maxY=1-2*top/height-b.top;shiftY=clamp(shiftY,minY,maxY);
 return{eye:at.map((v,i)=>v+direction[i]*distance),at,fov,shift:{x:shiftX,y:shiftY},points,architecture,scope:{compact,localRadius,structuralCells:cells.length,totalStructuralCells:connected.length,scene:scene.location,actorPixels:actorPixels(distance),selectedControl:selected?(selected.object.id||selected.object.label||selected.object.type+'@'+selected.object.xy.join(',')):null,worldBounds:{x0:Math.min(...cells.map(q=>q[0])),x1:Math.max(...cells.map(q=>q[0]))+1,z0:Math.min(...cells.map(q=>q[1])),z1:Math.max(...cells.map(q=>q[1]))+1},window:{left,right:rightEdge,top,bottom}}};
}
