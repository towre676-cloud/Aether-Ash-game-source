// Minimal observed v116 anchors; not a runnable game module.
export const affordances=`function flood(scene,start){ for(let i=0;i<q.length&&q.length<5000;i++){} }
function layout(world){
 const needScout=!!encounterHabitat(scene),connected=new Map();
 const optional=p=>{
  const k=key(p);if(connected.has(k))return connected.get(k);
  const degree=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>floor(scene,p[0]+dx,p[1]+dy)).length;
  // Closing this one optional tile must leave every other original floor cell
  // in the arrival component reachable. No story route is a repair dependency.
  const safe=degree>=3&&flood(scene,start,p).seen.size===patch.seen.size-1;connected.set(k,safe);return safe;
 };
}
`;
