/** Port the required PR #13 repair-layout optimization without replacing modern source. */
const algorithm = `/** Exact O(V+E) articulation detection for optional repair sites.
 * Iterative lowlinks avoid recursion overflow on expanded 100x100 maps. */
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

`;
const before = ` const needScout=!!encounterHabitat(scene),connected=new Map();
 const optional=p=>{
  const k=key(p);if(connected.has(k))return connected.get(k);
  const degree=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>floor(scene,p[0]+dx,p[1]+dy)).length;
  // Closing this one optional tile must leave every other original floor cell
  // in the arrival component reachable. No story route is a repair dependency.
  const safe=degree>=3&&flood(scene,start,p).seen.size===patch.seen.size-1;connected.set(k,safe);return safe;
 };
`;
const after = ` const needScout=!!encounterHabitat(scene),critical=articulationCells(scene,patch);
 const optional=p=>{
  const degree=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>floor(scene,p[0]+dx,p[1]+dy)).length;
  // A non-articulation tile cannot sever any existing story or repair route.
  return degree>=3&&!critical.has(key(p));
 };
`;
function once(s,a,b,label){if(s.split(a).length!==2)throw Error('Fail closed: changed '+label+' anchor');return s.replace(a,b);}
export function patchLiveAffordances(source){
 if(source.includes('export function articulationCells('))throw Error('Fail closed: affordance optimization already present; reconcile it separately');
 let out=once(source,'function layout(world){',algorithm+'function layout(world){','repair layout');
 out=once(out,before,after,'repair connectivity');
 // A 5,000-cell truncation is invalid once expanded components exceed that size.
 out=once(out,'i<q.length&&q.length<5000','i<q.length','complete floor component');
 return out;
}
