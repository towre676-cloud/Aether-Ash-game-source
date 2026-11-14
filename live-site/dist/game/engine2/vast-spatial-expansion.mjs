/** Deterministic, additive world districts. Old walkable tiles, story objects, and save coordinates stay authoritative.\n * Applied after authored content so these circuits cannot alter original puzzle placement.\n * No nondeterminism, external state, or per-frame work. */
export function expandVastScenes(data){
 if(!data||!Array.isArray(data.scenes))return data;
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const key=(x,y)=>x+','+y;
 const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
 const hash=(a,b,c)=>{let n=(Math.imul((a|0)+971,73856093)^Math.imul((b|0)+137,19349663)^Math.imul((c|0)+313,83492791))|0;n^=n>>>16;n=Math.imul(n,0x7feb352d);n^=n>>>15;return(n>>>0)/4294967296;};
 const bfs=(grid,start)=>{
  const h=grid.length,w=grid[0]?.length||0;
  const open=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&grid[y][x]==='.';
  let s=start&&open(start[0],start[1])?start:null;
  if(!s){let d=Infinity;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(open(x,y)){let t=Math.abs(x-(start?.[0]||0))+Math.abs(y-(start?.[1]||0));if(t<d){d=t;s=[x,y];}}}
  if(!s)return[];
  const queue=[s],seen=new Set([key(...s)]);
  for(let i=0;i<queue.length;i++)for(const [dx,dy] of dirs){const x=queue[i][0]+dx,y=queue[i][1]+dy,k=key(x,y);if(!seen.has(k)&&open(x,y)){seen.add(k);queue.push([x,y]);}}
  return queue;
 };
 const rewardChapters=new Set(),rewardSceneLocations=new Set();
 for(const s of data.scenes){if(Number.isInteger(s.chapter)&&s.chapter>=2&&s.chapter%2===0&&s.location<700&&!rewardChapters.has(s.chapter)){rewardChapters.add(s.chapter);rewardSceneLocations.add(s.location);}}
 for(const scene of data.scenes){
  if(!Number.isInteger(scene.location)||scene.location>=700||scene.key==='home'||scene.spatialExpansion?.version===1)continue;
  const oldW=scene.width|0,oldH=scene.height|0;
  if(oldW<12||oldH<12||oldW>96||oldH>96||!Array.isArray(scene.floor)||scene.floor.length!==oldH||scene.floor.some(s=>typeof s!=='string'||s.length!==oldW))continue;
  const old=scene.floor.map(row=>row.split('')),before=bfs(old,scene.arrive);
  if(before.length<10)continue;
  const originalReach=new Set(before.map(([x,y])=>key(x,y)));
  const ray=(p,side)=>side==='east'?Array.from({length:oldW-p[0]-1},(_,i)=>old[p[1]][p[0]+i+1]).every(c=>c==='#'):Array.from({length:oldH-p[1]-1},(_,i)=>old[p[1]+i+1][p[0]]).every(c=>c==='#');
  const east=before.filter(p=>ray(p,'east')).sort((a,b)=>b[0]-a[0]||Math.abs(a[1]-oldH/2)-Math.abs(b[1]-oldH/2))[0]||null;
  const south=before.filter(p=>ray(p,'south')).sort((a,b)=>b[1]-a[1]||Math.abs(a[0]-oldW/2)-Math.abs(b[0]-oldW/2))[0]||null;
  if(!east&&!south)continue;
  const wild=!!scene.biome||/field|forest|grove|river|bridge|passages|bypass|refuge|summit|west|east|sanctuary|storm_anchorage|town/.test(scene.key);
  const civic=/town|hub|inn|market|guild|clinic|carpenter|chapel|common_assembly/.test(scene.key);
  const kind=civic?'civic':wild?'wild':'dungeon',growth=kind==='wild'?64:kind==='civic'?48:56;
  const W=clamp(Math.max(88,oldW+growth),88,144),H=clamp(Math.max(88,oldH+growth),88,144);
  const grid=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>y<oldH&&x<oldW?old[y][x]:'#'));
  const eY=clamp(east?.[1]??Math.floor(oldH/2),Math.min(8,oldH-2),Math.max(8,oldH-8));
  const sX=clamp(south?.[0]??Math.floor(oldW/2),Math.min(8,oldW-2),Math.max(8,oldW-8));
  const nodes=[
   [oldW+12,eY],[W-15,eY],[W-15,oldH+13],[oldW+12,oldH+13],
   [sX,oldH+13],[oldW+12,H-15],[sX,H-15],[W-15,H-15]
  ].map(([x,y])=>[clamp(Math.round(x),8,W-9),clamp(Math.round(y),8,H-9)]);
  const openNew=(x,y)=>{
   if(x<2||y<2||x>=W-2||y>=H-2||x<oldW&&y<oldH)return;
   // An exterior moat protects originally sealed rooms and story gates.
   if(y<oldH&&x<oldW+4||x<oldW&&y<oldH+4)return;
   grid[y][x]='.';
  };
  const road=(a,b,width=3,turn=0)=>{
   const segment=(p,q)=>{const dx=Math.sign(q[0]-p[0]),dy=Math.sign(q[1]-p[1]),n=Math.max(Math.abs(q[0]-p[0]),Math.abs(q[1]-p[1]));for(let i=0;i<=n;i++){const x=p[0]+dx*i,y=p[1]+dy*i;for(let j=-width;j<=width;j++)dx?openNew(x,y+j):openNew(x+j,y);}};
   const elbow=turn%2?[a[0],b[1]]:[b[0],a[1]];
   segment(a,elbow);segment(elbow,b);
  };
  for(let i=0;i<nodes.length;i++){
   const [cx,cy]=nodes[i],rx=9+Math.floor(hash(scene.location,i,11)*5)+(i===7?3:0),ry=8+Math.floor(hash(scene.location,i,21)*5)+(i===3?3:0);
   for(let y=cy-ry;y<=cy+ry;y++)for(let x=cx-rx;x<=cx+rx;x++){
    const dx=(x-cx)/rx,dy=(y-cy)/ry,shape=kind==='wild'?dx*dx+dy*dy<.92+hash(scene.location,x,y)*.19:Math.abs(dx)<.98&&Math.abs(dy)<.98&&Math.abs(dx)+Math.abs(dy)<1.75;
    if(shape)openNew(x,y);
   }
   // Readable structural columns; wide corridors are carved after all columns.
   if(kind==='dungeon'&&i%2===1)for(const sx of [-1,1])for(const sy of [-1,1]){const x=cx+sx*6,y=cy+sy*5;if(x>=oldW+5||y>=oldH+5)for(let a=0;a<2;a++)for(let b=0;b<2;b++)if(grid[y+b]?.[x+a]==='.')grid[y+b][x+a]='#';}
  }
  // Two linked circuits with a long diagonal alternative toward the far hall.
  for(const [a,b] of [[0,1],[1,2],[2,3],[3,0],[3,4],[4,6],[6,5],[5,3],[2,7],[7,5],[1,7],[4,5]])road(nodes[a],nodes[b],kind==='wild'?3:kind==='civic'?3:2,a+b+scene.location);
  const entrances=[],alcoves=[];
  function annex(side,p,node){
   if(!p)return;
   const [x,y]=p,steps=side==='east'?oldW-x:oldH-y;
   for(let k=0;k<=steps+6;k++){const tx=side==='east'?x+k:x,ty=side==='south'?y+k:y;if(tx>=0&&ty>=0&&tx<W-2&&ty<H-2)grid[ty][tx]='.';}
   const outer=side==='east'?[oldW+6,y]:[x,oldH+6];
   road(outer,node,kind==='wild'?3:2,1);
   entrances.push({side,from:[x,y],threshold:outer});
   // Long approaches gain side recesses only in safely unused original rock.
   if(steps>=18)for(let t=10;t<steps-5;t+=13){
    const px=side==='east'?x+t:x,py=side==='south'?y+t:y;
    const r=side==='east'?{x0:px-4,x1:px+4,y0:py-7,y1:py-2}:{x0:px+2,x1:px+7,y0:py-4,y1:py+4};
    if(r.x0<2||r.y0<2||r.x1>=oldW-2||r.y1>=oldH-2)continue;
    let clear=true;
    for(let yy=r.y0-2;yy<=r.y1+2&&clear;yy++)for(let xx=r.x0-2;xx<=r.x1+2;xx++)if(old[yy]?.[xx]==='.')clear=false;
    if(!clear)continue;
    for(let yy=r.y0;yy<=r.y1;yy++)for(let xx=r.x0;xx<=r.x1;xx++)grid[yy][xx]='.';
    if(side==='east')for(let yy=r.y1;yy<=py;yy++)grid[yy][px]='.';else for(let xx=px;xx<=r.x0;xx++)grid[py][xx]='.';
    alcoves.push([Math.floor((r.x0+r.x1)/2),Math.floor((r.y0+r.y1)/2)]);
   }
  }
  annex('east',east,nodes[0]);annex('south',south,nodes[4]);
  const finalFloor=grid.map(row=>row.join('')),after=bfs(grid,scene.arrive),afterReach=new Set(after.map(([x,y])=>key(x,y)));
  const bypass=before.some(p=>!afterReach.has(key(...p)))||Array.from({length:oldH},(_,y)=>y).some(y=>Array.from({length:oldW},(_,x)=>x).some(x=>old[y][x]==='.'&&!originalReach.has(key(x,y))&&afterReach.has(key(x,y))));
  const newCells=after.filter(([x,y])=>x>=oldW||y>=oldH).length;
  if(bypass||newCells<450||after.length<before.length+750)continue;
  const mission=data.campaign?.missions?.find(m=>m.id===scene.chapter);
  const place=scene.title||(scene.key==='field'?(mission?.title||'Field')+' frontier':scene.key.replaceAll('_',' '));
  const names=kind==='wild'?['Hidden approach','Westward basin','High lookout','Crossing meadow','Old river terrace','Far ridge','Lower sheltered valley','Remote clearing']:kind==='civic'?['Covered approach','Grand court','Eastern arcade','Meeting square','South colonnade','Garden promenade','Lower commons','Outer square']:['Service threshold','High gallery','Watch chamber','Machine crossroads','Lower antechamber','Drainage works','Foundry passage','Remote hall'];
  const details=kind==='wild'?[
   'Old survey stakes diverge here. The shortest trail is not the only trail, and the ground bears signs of several earlier journeys.',
   'A broad clearing exposes different layers of stone. Smaller tracks circle the shelter rather than passing directly through.',
   'From the rise, several ways through the district become visible; the distant route returns by the lower ground.',
   'Water-worn marks on the rocks show where this terrain carried a stream before the present road existed.'
  ]:kind==='civic'?[
   'Different streets meet at this open court. The worn central paving records years of foot traffic and repairs.',
   'A covered working space opens onto the district; benches face the approach from two directions.',
   'The path between the public steps and the outlying quarter allows the market to breathe rather than compressing everyone into one corridor.',
   'A low terrace opens toward the settlement. Weathered foundations trace a plan larger than the surviving rooms.'
  ]:[
   'Wide platforms flank a sealed service channel. Tool marks on the stone distinguish the working route from the emergency return.',
   'The hall opens around load-bearing piers. A second passage avoids the main machinery and rejoins beyond the crossing.',
   'Several generations of repairs are visible in the wall courses; the newest patch does not cover the oldest inscription.',
   'An overlooked inspection ledge traces the return circuit toward the far chamber instead of ending at the first locked door.'
  ];
  const newObjects=[];
  for(const i of [1,3,5,6]){
   const [x,y]=nodes[i];
   newObjects.push({type:'clue',exploreId:'vast:'+scene.location+':landmark:'+i,xy:[x,y],label:names[i],text:place+' — '+names[i]+'. '+details[(i+scene.location)%details.length]});
  }
  // One hard-to-find cache in alternate chapters, not free powerful gear per room.
  if(rewardSceneLocations.has(scene.location)){
   const [x,y]=nodes[7];
   newObjects.push({type:'secret',exploreId:'vast:'+scene.location+':supply',xy:[x,y],label:'Weather-sealed cache',hidden:true,text:'Behind the far wall of '+place+', a deliberately concealed field satchel remains dry. Its contents were saved for the traveller who found the longer way around.',reward:{gold:8+(scene.chapter||1)*3}});
  }
  if(kind!=='civic'&&scene.chapter>=2){
   const prior=scene.objects?.find(o=>o.type==='patrol'&&Array.isArray(o.enemies)&&o.enemies.length);
   if(prior){
    const [x,y]=nodes[7],enemies=prior.enemies.slice(0,2).map((e,i)=>[e[0],[x-2+i*3,y]]);
    newObjects.push({type:'patrol',flag_address:0x7e0000+scene.location,bit:0,enemies,gold:12+(scene.chapter||1)*2,label:'Far-road watch',text:'An alert group holds the wider route. You can approach and fight or circle back through the connected galleries.',win_text:'The far-road watch yields. The return route remains open.'});
   }
  }
  scene.width=W;scene.height=H;scene.floor=finalFloor;scene.objects=[...(scene.objects||[]),...newObjects];
  scene.spatialExpansion={version:1,archetype:kind,originalWidth:oldW,originalHeight:oldH,walkableBefore:before.length,walkableAfter:after.length,outerReachable:newCells,entrances,alcoves,landmarks:nodes.map((xy,i)=>({name:names[i],xy})),routeLoops:3,originalCoordinatesPreserved:true};
 }
 return data;
}
