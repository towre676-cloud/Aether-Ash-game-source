/** Shared, readable circulation in the ordinary 3D world. These are the same
 * native streets and trails used by the original scene planner, expressed as
 * broad surfaces and destination courts instead of an undifferentiated slab.
 * Drawing never opens a route, reserves an actor tile, or exposes a secret. */
import {streetPlan} from './wayfinding.js?v=5.22.0';
import {terrainTrails} from './terrain-materials.js?v=5.22.0';
import {environmentFor} from './environment.js?v=5.18.0';
import {isInteriorScene} from './scene-identity.js?v=4.0.0';
import {nativeSpatialPlan} from './native-spatial-authoring.js?v=5.33.0';

const CACHE=new WeakMap(),key=(x,z)=>x+','+z;
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const tint=(c,n)=>c.map(v=>Math.max(0,Math.min(1,v*n)));
const PALETTES={
 village:['#a49a7c','#697956','#6d7255'],woodland:['#938970','#4e6746','#4e6041'],riverbank:['#9b9a81','#647e6c','#5b7261'],
 foundry:['#9e927c','#6c6c5b','#62675a'],ruins:['#a9a18b','#687360','#596956'],highland:['#a6aaa0','#6e8078','#64776f'],
 sand:['#c7b38a','#ab9673','#9b8b63'],salt:['#ccd0bc','#a4b3a2','#96a696'],cactus:['#c2b18b','#92976d','#7f8e60'],
 lava:['#a58c72','#655850','#584d45'],coral:['#b6bc9f','#7c9a86','#688f7c'],mangrove:['#a5ab8a','#54775e','#49694f'],
 crystal:['#b1b0b9','#7b8295','#6c7589'],ice:['#c5d5cf','#9db4b9','#8da9b0'],aurora:['#b7d0ca','#829eab','#74959f'],
 spore:['#a9ad8c','#617a5c','#526b4c'],storm:['#abb6af','#788b8e','#697f83'],marble:['#c4c2b1','#99a397','#8a9789']
};
function merge(cells,emit){
 const set=new Set(cells.map(p=>key(...p))),used=new Set();
 for(const[x,z]of cells){if(used.has(key(x,z)))continue;let w=1,h=1;while(set.has(key(x+w,z))&&!used.has(key(x+w,z)))w++;
  outer:while(true){for(let a=0;a<w;a++)if(!set.has(key(x+a,z+h))||used.has(key(x+a,z+h)))break outer;h++;}
  for(let b=0;b<h;b++)for(let a=0;a<w;a++)used.add(key(x+a,z+b));emit(x,z,w,h);
 }
}

export function adventureGroundCompositionPlan(world,{objects:providedObjects}={}){
 const scene=world?.scene;if(!scene||isInteriorScene(scene)||scene.originId)return {active:false,paths:[],courts:[],habitat:[],style:null};
 const blocked=new Set((scene.affordanceBlocked||[]).map(p=>key(...p))),walk=(x,z)=>scene.floor[z]?.[x]==='.'&&!blocked.has(key(x,z));
 const objects=(providedObjects??scene.objects??[]).filter(o=>o.xy&&!o.hidden),native=nativeSpatialPlan(world,{objects}),signature=JSON.stringify([scene.floor,[...blocked],native.anchors.map(o=>[o.id,o.xy]),objects.filter(o=>['portal','camp','shop','project','aid','mentor'].includes(o.type)).map(o=>[o.type,o.xy])]);
 const previous=CACHE.get(scene);if(previous?.signature===signature)return previous.plan;
 const style=environmentFor(scene)?.style||'village',urban=['town','market','hub'].includes(scene.key),route=new Set();
 const add=(x,z)=>{if(walk(x,z))route.add(key(x,z));};
 // Existing streets keep the exact thresholds and useful shared trunk. Rural
 // desire lines keep their authored destinations and the real walk topology.
 if(urban)for(const k of streetPlan(scene)){const[x,z]=k.split(',').map(Number);add(x,z);}
 else for(const path of terrainTrails(scene))for(const[x,z]of path)add(x,z);
 // Functional destinations share a real walking route. Town streets already
 // own their circulation; rural service walks use the mask-bound native tree.
 if(!urban)for(const connection of native.routes)for(const[x,z]of connection.cells)add(x,z);
 for(const p of scene.authoredOpening?.approach||[])add(Math.floor(p[0]),Math.floor(p[1]));
 const courts=new Set(),destinations=[...(scene.doors||[]),...objects.filter(o=>['portal','camp','shop','project','aid','mentor','frontier-board'].includes(o.type))];
 for(const o of destinations){const[x,z]=o.xy||[];if(!Number.isFinite(x+z))continue;
  // A forecourt belongs to a door/workplace, not to every passing person.
  const radius=urban?1.5:o.type==='camp'?1.7:1.1;
  for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)if(Math.hypot(dx,dz)<=radius&&walk(Math.floor(x)+dx,Math.floor(z)+dz))courts.add(key(Math.floor(x)+dx,Math.floor(z)+dz));
 }
 const paths=[...route].map(k=>k.split(',').map(Number)),courtCells=[...courts].map(k=>k.split(',').map(Number));
 const distance=new Map(),queue=[];for(const k of new Set([...route,...courts])){distance.set(k,0);queue.push(k.split(',').map(Number));}
 for(let i=0;i<queue.length;i++){const[x,z]=queue[i],d=distance.get(key(x,z));if(d>=3)continue;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(walk(nx,nz)&&!distance.has(k)){distance.set(k,d+1);queue.push([nx,nz]);}}}
 const habitat=[];
 for(let z=0;z<scene.height;z++)for(let x=0;x<scene.width;x++){
  if(!walk(x,z)||route.has(key(x,z))||courts.has(key(x,z)))continue;
  if((distance.get(key(x,z))??4)>=2&&!objects.some(o=>o.type!=='furnishing'&&Math.hypot(o.xy[0]-x,o.xy[1]-z)<1.15))habitat.push([x,z]);
 }
 const plan={active:true,style,urban,paths,courts:courtCells,habitat,native,palette:(PALETTES[style]||PALETTES.village).map(rgb)};CACHE.set(scene,{signature,plan});return plan;
}
export function appendAdventureGroundComposition(mesh,{world,objects}={}){
 const p=adventureGroundCompositionPlan(world,{objects});if(!p.active)return p;
 const [road,verge,edge]=p.palette,courts=new Set(p.courts.map(v=>key(...v))),path=new Set(p.paths.map(v=>key(...v)));
 // Habitat has broad, quiet color fields. Its low-frequency bands retain a
 // natural floor rather than repeating a photographic gravel swatch forever.
 for(let band=0;band<3;band++){
  const cells=p.habitat.filter(([x,z])=>Math.floor((Math.sin(x*.17)+Math.cos(z*.15)+2)*1.49)%3===band);
  merge(cells,(x,z,w,h)=>mesh.quad([x,.019,z],[x,.019,z+h],[x+w,.019,z+h],[x+w,.019,z],tint(verge,.96+band*.035),6.2,0,1,[0,1,0]));
 }
 const all=[...new Set([...path,...courts])].map(k=>k.split(',').map(Number));
 merge(all,(x,z,w,h)=>mesh.quad([x,.023,z],[x,.023,z+h],[x+w,.023,z+h],[x+w,.023,z],road,0,0,1,[0,1,0]));
 // Larger pavers make human-scale roads legible. They are flush floor detail,
 // never isolated floating pads or new physical obstacles.
 for(const[x,z]of all){
  const n=(x+z*3)%4,c=courts.has(key(x,z))?tint(road,1.035):tint(road,.98+n*.012);
  const inset=p.urban?.045:.09;
  mesh.quad([x+inset,.026,z+inset],[x+inset,.026,z+1-inset],[x+1-inset,.026,z+1-inset],[x+1-inset,.026,z+inset],c,0,0,1,[0,1,0]);
  if(p.urban&&(x+z)%3===0)mesh.box(x+.5,.028,z+.5,.88,.005,.015,tint(road,.79),6);
  for(const[dx,dz]of[[0,-1],[1,0],[0,1],[-1,0]])if(!path.has(key(x+dx,z+dz))&&!courts.has(key(x+dx,z+dz))&&world.scene.floor[z+dz]?.[x+dx]==='.'){
   const px=x+.5+dx*.46,pz=z+.5+dz*.46;mesh.box(px,.027,pz,dx?.04:.90,.005,dx?.90:.04,tint(edge,1.06),6);
  }
 }
 return p;
}
