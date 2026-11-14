/** Targeted current-source repair; preserves modern placement and save rules. */
export function articulationCells(scene,patch){
 const cells=patch?.cells||[],index=new Map(cells.map((p,i)=>[p[0]+','+p[1],i])),n=cells.length;
 const disc=new Int32Array(n),low=new Int32Array(n),parent=new Int32Array(n).fill(-1),children=new Int32Array(n),cut=new Set();
 const directions=[[1,0],[-1,0],[0,1],[0,-1]];let clock=0;
 for(let root=0;root<n;root++){
  if(disc[root])continue;
  disc[root]=low[root]=++clock;
  const stack=[{v:root,next:0}];
  while(stack.length){
   const frame=stack[stack.length-1],v=frame.v;
   if(frame.next<4){
    const [dx,dy]=directions[frame.next++],u=index.get((cells[v][0]+dx)+','+(cells[v][1]+dy));
    if(u===undefined)continue;
    if(!disc[u]){parent[u]=v;children[v]++;disc[u]=low[u]=++clock;stack.push({v:u,next:0});}
    else if(u!==parent[v])low[v]=Math.min(low[v],disc[u]);
   }else{
    stack.pop();const p=parent[v];
    if(p>=0){low[p]=Math.min(low[p],low[v]);if(parent[p]>=0&&low[v]>=disc[p])cut.add(p);}
    else if(children[v]>1)cut.add(v);
   }
  }
 }
 return new Set([...cut].map(i=>cells[i][0]+','+cells[i][1]));
}

const oldOptional=" const needScout=!!encounterHabitat(scene),connected=new Map();\n const optional=p=>{\n  const k=key(p);if(connected.has(k))return connected.get(k);\n  const degree=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>floor(scene,p[0]+dx,p[1]+dy)).length;\n  // Closing this one optional tile must leave every other original floor cell\n  // in the arrival component reachable. No story route is a repair dependency.\n  const safe=degree>=3&&flood(scene,start,p).seen.size===patch.seen.size-1;connected.set(k,safe);return safe;\n };";
const newOptional=" const needScout=!!encounterHabitat(scene),critical=articulationCells(scene,patch);\n const optional=p=>{\n  const degree=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>floor(scene,p[0]+dx,p[1]+dy)).length;\n  // A non-articulation tile cannot sever the complete arrival component.\n  return degree>=3&&!critical.has(key(p));\n };";
function once(source,from,to){
 if(source.split(from).length!==2)throw Error('Fail closed: modern repair connectivity anchor changed');
 return source.replace(from,to);
}
export function patchCurrentAffordances(source){
 for(const token of ['worldAffordanceObjects','worldAffordanceSummary','isWalkableOverride','applyAffordanceScene'])
  if(!source.includes(token))throw Error('Missing current repair system '+token);
 if(source.includes('function articulationCells'))throw Error('Repair connectivity already patched');
 let s=once(source,'for(let i=0;i<q.length&&q.length<5000;i++)','for(let i=0;i<q.length;i++)');
 s=once(s,'function layout(world){',articulationCells.toString()+'\n\nfunction layout(world){');
 return once(s,oldOptional,newOptional);
}
