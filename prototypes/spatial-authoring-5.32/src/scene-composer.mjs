import {hash32} from './util.mjs';

const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dist=(a,b)=>Math.hypot((a.x||0)-(b.x||0),(a.z||0)-(b.z||0));

function unit(seed){
  const h=hash32(String(seed))>>>0;
  return h/4294967295;
}
function polar(seed,r0,r1){
  const a=unit(seed+':a')*TAU;
  const r=r0+(r1-r0)*Math.sqrt(unit(seed+':r'));
  return {x:Math.cos(a)*r,z:Math.sin(a)*r};
}
function nearest(point, anchors){
  let best=null, bd=Infinity;
  for(const a of anchors){
    const d=dist(point,a);
    if(d<bd){bd=d;best=a;}
  }
  return {anchor:best,distance:bd};
}

export const DEFAULT_ZONE_RULES=Object.freeze({
  settlement:{clusterRadius:10,minClearance:1.2,maxVoid:18,connectEvery:11},
  interior:{clusterRadius:4.2,minClearance:.65,maxVoid:7.5,connectEvery:4.5},
  dungeon:{clusterRadius:7,minClearance:1,maxVoid:12,connectEvery:7},
  wilderness:{clusterRadius:13,minClearance:1.5,maxVoid:22,connectEvery:14},
});

export function authorScene({id='scene',kind='wilderness',bounds={minX:-30,maxX:30,minZ:-30,maxZ:30},anchors=[],actors=[],props=[]}={}){
  const rules=DEFAULT_ZONE_RULES[kind]||DEFAULT_ZONE_RULES.wilderness;
  const usable=anchors.filter(a=>Number.isFinite(a.x)&&Number.isFinite(a.z));
  if(!usable.length) usable.push({id:'scene-core',kind:'core',x:(bounds.minX+bounds.maxX)/2,z:(bounds.minZ+bounds.maxZ)/2,importance:1});
  const occupied=[];

  const placeNear=(item,index,type)=>{
    const affinity=item.anchorId&&usable.find(a=>a.id===item.anchorId);
    const anchor=affinity||usable[(hash32(`${id}:${type}:${item.id||index}`)>>>0)%usable.length];
    let chosen={x:anchor.x,z:anchor.z};
    for(let attempt=0;attempt<18;attempt++){
      const p=polar(`${id}:${type}:${item.id||index}:${attempt}`,rules.minClearance*1.2,rules.clusterRadius);
      const c={x:clamp(anchor.x+p.x,bounds.minX+.5,bounds.maxX-.5),z:clamp(anchor.z+p.z,bounds.minZ+.5,bounds.maxZ-.5)};
      const ok=occupied.every(o=>dist(c,o)>=rules.minClearance);
      if(ok){chosen=c;break;}
    }
    occupied.push(chosen);
    return {...item,x:chosen.x,z:chosen.z,authoredAnchor:anchor.id};
  };

  const placedActors=actors.map((x,i)=>placeNear(x,i,'actor'));
  const placedProps=props.map((x,i)=>placeNear(x,i,'prop'));

  const connectors=[];
  const sorted=[...usable].sort((a,b)=>(a.importance||0)-(b.importance||0)).reverse();
  for(let i=1;i<sorted.length;i++){
    const a=sorted[i-1], b=sorted[i], d=dist(a,b);
    if(d<=rules.connectEvery*1.35) continue;
    const n=Math.floor(d/rules.connectEvery);
    for(let k=1;k<=n;k++){
      const t=k/(n+1);
      connectors.push({
        id:`link:${a.id}:${b.id}:${k}`,
        kind:kind==='dungeon'?'guide-light':'landmark',
        x:a.x+(b.x-a.x)*t,
        z:a.z+(b.z-a.z)*t,
        connects:[a.id,b.id]
      });
    }
  }

  const samples=[];
  const step=Math.max(3,rules.maxVoid*.55);
  for(let x=bounds.minX+step/2;x<bounds.maxX;x+=step){
    for(let z=bounds.minZ+step/2;z<bounds.maxZ;z+=step){
      const p={x,z};
      const n=nearest(p,[...usable,...connectors,...placedActors,...placedProps]);
      if(n.distance>rules.maxVoid) samples.push({x,z,distance:n.distance});
    }
  }
  const voidFillers=samples.map((p,i)=>({
    id:`voidfill:${i}`,kind:kind==='interior'?'furnishing':kind==='dungeon'?'environmental-clue':'micro-landmark',
    x:p.x,z:p.z,reason:'break-empty-space'
  }));

  return {
    id,kind,bounds,
    anchors:usable,
    actors:placedActors,
    props:placedProps,
    connectors,
    voidFillers,
    stats:{
      anchorCount:usable.length,
      actorCount:placedActors.length,
      propCount:placedProps.length,
      connectorCount:connectors.length,
      voidFillCount:voidFillers.length
    }
  };
}

export function socialClusters(actors,{radius=4.5}={}){
  const remaining=new Set(actors.map((_,i)=>i)), groups=[];
  while(remaining.size){
    const seed=remaining.values().next().value; remaining.delete(seed);
    const group=[actors[seed]];
    for(const i of [...remaining]){
      if(group.some(a=>dist(a,actors[i])<=radius)){group.push(actors[i]);remaining.delete(i);}
    }
    groups.push(group);
  }
  return groups;
}

export function placementHealth(scene){
  const points=[...scene.anchors,...scene.actors,...scene.props,...scene.connectors,...scene.voidFillers];
  let min=Infinity;
  for(let i=0;i<points.length;i++) for(let j=i+1;j<points.length;j++) min=Math.min(min,dist(points[i],points[j]));
  return {
    minSeparation:Number.isFinite(min)?min:null,
    emptySpaceRepairs:scene.voidFillers.length,
    authoredFraction:(scene.actors.length+scene.props.length)?1:0,
    connectiveDensity:scene.connectors.length/Math.max(1,scene.anchors.length-1)
  };
}
