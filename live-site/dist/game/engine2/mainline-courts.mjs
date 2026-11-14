/**
 * Widen actual quest routes, not only distant optional annexes.
 *
 * Open floor remains the authoritative collision source. The old connected
 * component is preserved. An originally inaccessible island stays inaccessible,
 * and no object, door, boss, enemy, furniture or mechanism changes coordinates.
 * Deterministic once during world composition; never invoked per frame.
 */
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
const id=(x,y)=>x+','+y;
const d2=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2;
function traversable(g,x,y){return g[y]?.[x]==='.';}
function flood(g,entry){
 const w=g[0].length,h=g.length,seen=new Set(),previous=new Map(),queue=[];
 const start=traversable(g,...entry)?entry:null;
 if(!start)return{seen,previous,queue};
 queue.push(start);seen.add(id(...start));
 for(let i=0;i<queue.length;i++){
  const [x,y]=queue[i];for(const [dx,dy]of DIRS){
   const nx=x+dx,ny=y+dy,key=id(nx,ny);
   if(nx<0||ny<0||nx>=w||ny>=h||seen.has(key)||!traversable(g,nx,ny))continue;
   seen.add(key);previous.set(key,[x,y]);queue.push([nx,ny]);
  }
 }
 return {seen,previous,queue};
}
function coordinates(scene){
 const points=[scene.arrive,...(scene.doors||[]).map(d=>d.xy)];
 for(const o of scene.objects||[]){
  points.push(o.xy);
  if(o.enemies)for(const pair of o.enemies)points.push(pair?.[1]);
  if(o.footprint)for(const x of [o.footprint.x,o.footprint.x+o.footprint.w])for(const y of [o.footprint.y,o.footprint.y+o.footprint.h])points.push([x,y]);
 }
 for(const obj of scene.household?.furnishings||[])if(obj.footprint)points.push([obj.footprint.x,obj.footprint.y]);
 return points.filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite));
}
function closest(allowed,xy){
 if(!Array.isArray(xy))return null;
 let best=null,dist=5;
 for(const p of allowed){const r=d2(p,xy);if(r<dist){dist=r;best=p;}}
 return best;
}
/** Safe, local 5–7 tile broadening of pre-existing mandatory walking lines. */
export function broadenMainline(data){
 if(!Array.isArray(data?.scenes))return data;
 for(const s of data.scenes){
  if(!Number.isInteger(s.location)||s.location>=700||s.location===2||s.location===303||s.household||s.mainlineCourts?.version===1)continue;
  const w=s.width|0,h=s.height|0;
  if(w<26||h<26||!Array.isArray(s.floor)||s.floor.length!==h||s.floor.some(row=>typeof row!=='string'||row.length!==w))continue;
  const original=s.floor.map(row=>row.split(''));
  const entry=Array.isArray(s.arrive)?s.arrive:null;
  if(!entry||!traversable(original,...entry))continue;
  const before=flood(original,entry);
  if(before.queue.length<25)continue;
  const inaccessible=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(traversable(original,x,y)&&!before.seen.has(id(x,y)))inaccessible.push([x,y]);
  const protectedPoints=coordinates(s);
  const points=[...(s.doors||[]),...(s.objects||[])].filter(o=>o.xy||o.enemies?.[0]?.[1])
   .map(o=>({o,xy:o.xy||o.enemies[0][1]}))
   .map(o=>({...o,point:closest(before.queue,o.xy)}))
   .filter(o=>o.point&&d2(o.xy,o.point)<=4)
   .sort((a,b)=>d2(b.point,entry)-d2(a.point,entry))
   .slice(0,12);
  const grid=original.map(row=>row.slice()),centers=[],selected=new Set();
  const closeTo=(p,list,r)=>list.some(q=>d2(p,q)<r*r);
  const canCarve=(x,y)=>{
   if(x<2||y<2||x>=w-2||y>=h-2)return false;
   if(traversable(original,x,y))return true;
   if(closeTo([x,y],protectedPoints,2.8))return false;
   if(closeTo([x,y],inaccessible,2.4))return false;
   return true;
  };
  for(const item of points){
   const path=[];let p=item.point;
   for(let n=0;n<w*h&&p;n++){path.push(p);if(id(...p)===id(...entry))break;p=before.previous.get(id(...p));}
   if(path.length<14)continue;
   for(let i=8;i<path.length-8;i+=9){
    const center=path[i],k=id(...center);
    if(selected.has(k)||closeTo(center,protectedPoints,4.8)||closeTo(center,inaccessible,4.5)||centers.some(c=>d2(c,center)<64))continue;
    let count=0;
    for(let yy=center[1]-3;yy<=center[1]+3;yy++)for(let xx=center[0]-3;xx<=center[0]+3;xx++){
     if(!canCarve(xx,yy)||((xx-center[0])/3)**2+((yy-center[1])/2.7)**2>1)continue;
     if(grid[yy][xx]==='#'){grid[yy][xx]='.';count++;}
    }
    if(count>=3){centers.push(center.slice());selected.add(k);}
   }
  }
  const after=flood(grid,entry);
  if(before.queue.some(p=>!after.seen.has(id(...p)))||inaccessible.some(p=>after.seen.has(id(...p))))continue;
  const added=after.queue.length-before.queue.length;
  if(added<6)continue;
  s.floor=grid.map(row=>row.join(''));
  s.mainlineCourts={version:1,centers,addedFloor:added,oldReachable:before.queue.length,newReachable:after.queue.length,
   principle:'widen original quest routes without moving story actors or unlocking sealed components'};
 }
 return data;
}
