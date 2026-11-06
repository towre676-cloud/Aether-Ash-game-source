/** One coherent floor finish for the native exterior world. The scene owns
 * every route and obstacle; this module only paints quiet wear on that floor. */
import {isInteriorScene} from './scene-identity.js';
import {adventureGroundCompositionPlan} from './adventure-ground-composition.js';
import {sceneArtSpec} from './scene-art-materials-541.js?v=5.41';

const CACHE=new WeakMap(),TAU=Math.PI*2,MAX_TRIANGLES=5000;
const key=(x,z)=>x+','+z,point=k=>k.split(',').map(Number),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const hash=s=>{let n=2166136261;for(const c of String(s))n=Math.imul(n^c.charCodeAt(0),16777619);return(n>>>0)/4294967296;};
const area=p=>{let n=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];n+=a[0]*b[1]-a[1]*b[0];}return Math.abs(n)/2;};
function clip(poly,axis,bound,greater){
 const out=[];if(!poly.length)return out;let a=poly.at(-1),inside=greater?a[axis]>=bound:a[axis]<=bound;
 for(const b of poly){const next=greater?b[axis]>=bound:b[axis]<=bound;if(next!==inside){const t=(bound-a[axis])/(b[axis]-a[axis]),p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];p[axis]=bound;out.push(p);}if(next)out.push(b);a=b;inside=next;}return out;
}
function clippedFloor(poly,walk){
 if(poly.length<3)return[];
 const out=[],x0=Math.floor(Math.min(...poly.map(p=>p[0]))),x1=Math.floor(Math.max(...poly.map(p=>p[0]))),z0=Math.floor(Math.min(...poly.map(p=>p[1]))),z1=Math.floor(Math.max(...poly.map(p=>p[1])));
 for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)if(walk(x,z)){
  let p=clip(poly,0,x,true);p=clip(p,0,x+1,false);p=clip(p,1,z,true);p=clip(p,1,z+1,false);if(p.length>=3&&area(p)>1e-8)out.push(p);
 }return out;
}
function routeChains(cells){
 const set=new Set(cells.map(p=>key(...p))),adj=new Map(),used=new Set(),chains=[];
 const ordered=[...set].sort((a,b)=>{const A=point(a),B=point(b);return A[1]-B[1]||A[0]-B[0];});
 for(const k of ordered){const[x,z]=point(k);adj.set(k,[[0,-1],[-1,0],[1,0],[0,1]].map(([dx,dz])=>key(x+dx,z+dz)).filter(v=>set.has(v)));}
 const edge=(a,b)=>a<b?a+'|'+b:b+'|'+a;
 const trace=(start,next)=>{
  const row=[point(start)],first=start;let previous=start,current=next;used.add(edge(start,next));
  for(let n=0;n<=set.size;n++){
   row.push(point(current));if(current===first||adj.get(current).length!==2)break;
   const onward=adj.get(current).find(v=>v!==previous);if(!onward||used.has(edge(current,onward)))break;used.add(edge(current,onward));previous=current;current=onward;
  }
  if(row.length>1)chains.push(row);
 };
 for(const k of ordered)if(adj.get(k).length!==2)for(const next of adj.get(k))if(!used.has(edge(k,next)))trace(k,next);
 for(const k of ordered)for(const next of adj.get(k))if(!used.has(edge(k,next)))trace(k,next);
 return chains;
}
function softened(chain){
 const simple=[];
 for(let i=0;i<chain.length;i++){
  const p=chain[i],a=chain[i-1],b=chain[i+1];if(a&&b&&(p[0]-a[0])*(b[1]-p[1])===(p[1]-a[1])*(b[0]-p[0]))continue;simple.push([p[0]+.5,p[1]+.5]);
 }
 if(simple.length<3)return simple;const out=[simple[0]];
 for(let i=1;i<simple.length-1;i++){
  const a=simple[i-1],p=simple[i],b=simple[i+1],la=Math.hypot(p[0]-a[0],p[1]-a[1]),lb=Math.hypot(b[0]-p[0],b[1]-p[1]),r=Math.min(.27,la*.20,lb*.20);
  const before=[p[0]+(a[0]-p[0])*r/la,p[1]+(a[1]-p[1])*r/la],after=[p[0]+(b[0]-p[0])*r/lb,p[1]+(b[1]-p[1])*r/lb];out.push(before);
  for(const t of[.5,1])out.push([(1-t)**2*before[0]+2*(1-t)*t*p[0]+t*t*after[0],(1-t)**2*before[1]+2*(1-t)*t*p[1]+t*t*after[1]]);
 }out.push(simple.at(-1));return out;
}
function ribbon(points,width,walk){
 const polys=[];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dx,dz);if(d<1e-6)continue;
  const ox=-dz/d*width/2,oz=dx/d*width/2;
  polys.push(...clippedFloor([[a[0]+ox,a[1]+oz],[a[0]-ox,a[1]-oz],[b[0]-ox,b[1]-oz],[b[0]+ox,b[1]+oz]],walk));
 }return polys;
}
function roundWear(at,radius,walk,seed){
 const poly=Array.from({length:18},(_,i)=>{const a=i*TAU/18,r=radius*(1+.055*Math.sin(a*3+seed*7)+.035*Math.cos(a*5-seed*4));return[at[0]+Math.cos(a)*r,at[1]+Math.sin(a)*r*.76];});return clippedFloor(poly,walk);
}
// Native flat faces pass through the engine's filmic transfer. Decode the
// pigment here so a soft earth wash does not become a bright white route line.
const pigment=c=>c.map(v=>-Math.log(Math.max(.0001,1-Math.max(0,Math.min(.96,v))**(1/.4545)))/1.12);
function wearColor(spec){
 const p=spec.palette,natural=/meadow|loam/.test(spec.floorKind),hot=/lava|caldera|foundry/.test(spec.style);
 const earth=natural?[.52,.48,.34]:hot?[.58,.50,.40]:/ice/.test(spec.floorKind)?[.70,.79,.80]:p.edge;
 return pigment(mix(p.floor,earth,natural?.48:.28));
}
function triangles(poly){let n=0;for(let i=1;i+1<poly.length;i++)if(Math.abs((poly[i][0]-poly[0][0])*(poly[i+1][1]-poly[0][1])-(poly[i][1]-poly[0][1])*(poly[i+1][0]-poly[0][0]))>1e-9)n++;return n;}
export function sceneGroundArtPlan541(world,{objects:provided}={}){
 const scene=world?.scene;if(!scene?.floor||isInteriorScene(scene)||scene.originId)return{active:false,chains:[],thresholds:[],layers:[],triangles:0,routeCells:[]};
 const objects=(provided??scene.objects??[]).filter(o=>!o.hidden&&o.revealed!==false),signature=JSON.stringify([scene.floor,scene.affordanceBlocked,objects.map(o=>[o.id,o.type,o.xy,o.hidden,o.revealed])]);
 const prior=CACHE.get(scene);if(prior?.signature===signature)return prior.plan;
 const blocked=new Set((scene.affordanceBlocked||[]).map(p=>key(...p))),walk=(x,z)=>scene.floor[z]?.[x]==='.'&&!blocked.has(key(x,z));
 const native=adventureGroundCompositionPlan(world,{objects}),spec=sceneArtSpec(world),routeCells=native.paths.filter(p=>walk(...p)),urban=!!native.urban;
 const chains=routeChains(routeCells).map((cells,i)=>({id:i,cells,points:softened(cells)})).sort((a,b)=>b.cells.length-a.cells.length||a.id-b.id);
 const layers=[],thresholds=[];let used=0,drawnChains=0;
 for(const chain of chains){
  const group=[];
  for(const [width,alpha,y]of[[urban?1.75:1.15,.045,.018],[urban?1.35:.88,.095,.020],[urban?.84:.54,.17,.022]]){
   const polygons=ribbon(chain.points,width,walk);group.push({kind:'wear-ribbon',source:chain.id,width,alpha,y,polygons});
  }
  const count=group.reduce((n,g)=>n+g.polygons.reduce((m,p)=>m+triangles(p),0),0);if(used+count>MAX_TRIANGLES)continue;used+=count;layers.push(...group);drawnChains++;
 }
 const destinationTypes=new Set(['portal','camp','shop','project','aid','mentor','frontier-board']);
 const seen=new Set();
 for(const o of [...(scene.doors||[]),...objects.filter(o=>destinationTypes.has(o.type))]){
  if(!Array.isArray(o.xy)||!o.xy.every(Number.isFinite))continue;const at=[Math.floor(o.xy[0])+.5,Math.floor(o.xy[1])+.5],id=key(...at);if(seen.has(id)||!walk(Math.floor(at[0]),Math.floor(at[1])))continue;seen.add(id);
  const seed=hash(id),polygons=roundWear(at,o.type==='camp'?1.15:urban?1.05:.80,walk,seed),count=polygons.reduce((n,p)=>n+triangles(p),0);if(used+count>MAX_TRIANGLES)continue;
  used+=count;thresholds.push({id,type:o.type||'door',at,polygons});layers.push({kind:'threshold-wear',source:id,alpha:.085,y:.024,polygons});
 }
 const plan={active:true,style:spec.style,family:spec.family,urban,routeCells,chains,thresholds,layers,triangles:used,color:wearColor(spec),drawnChains,maxTriangles:MAX_TRIANGLES};CACHE.set(scene,{signature,plan});return plan;
}
export function appendSceneGroundArt541(mesh,{world,objects}={}){
 const plan=sceneGroundArtPlan541(world,{objects});if(!plan.active||!mesh?.tri)return plan;
 for(const layer of plan.layers)for(const p of layer.polygons)for(let i=1;i+1<p.length;i++){
  const a=p[0];let b=p[i],c=p[i+1];const winding=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(winding)<=1e-9)continue;if(winding>0)[b,c]=[c,b];mesh.tri([a[0],layer.y,a[1]],[b[0],layer.y,b[1]],[c[0],layer.y,c[1]],plan.color,6,0,layer.alpha,[0,1,0]);
 }return plan;
}
