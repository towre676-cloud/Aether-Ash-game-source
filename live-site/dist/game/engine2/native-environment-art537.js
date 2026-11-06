/** A&A 5.37 — native structural art adapter.
 * Source direction: the other-session environment-detail-kit.mjs dressHouse /
 * dressDungeon surface courses, load-bearing joinery, gutters and localized
 * industrial vents. Those THREE constructors and their assumed house sizes are
 * deliberately replaced with the current engine's real parcels and roof banks.
 * This module owns visual faces only. No collision, route, actor, weather,
 * inventory, mechanism outcome, save state or animation loop is created here.
 */
export const NATIVE_ENV537_ART_PROVENANCE=Object.freeze({
  release:'5.37',source:'Ash_Aether_5_37_Production_Integration_Modules.zip',
  adaptedFrom:'environment-detail-kit.mjs: dressHouse and dressDungeon',
  ownership:'native parcel / staging / landscape plans; static visual faces only'
});

const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const PALETTE=Object.freeze({stone:rgb('#a7a08a'),joint:rgb('#33423f'),
  wood:rgb('#574331'),edge:rgb('#ae996b'),metal:rgb('#526b69'),
  grille:rgb('#142e33'),louvre:rgb('#76938b'),wet:rgb('#36595a'),
  cliff:rgb('#71847d'),ash:rgb('#907c68')});
const tint=(c,n)=>c.map(v=>Math.max(0,Math.min(1,v*n)));
const finite=v=>Number.isFinite(v);
const validRect=r=>r&&[r.x,r.z,r.w,r.d].every(finite)&&r.w>.12&&r.d>.12;
const key=(x,z)=>x+','+z;
const copyRect=r=>({x:r.x,z:r.z,w:r.w,d:r.d});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function closedRect(scene,r){
  const floor=scene.household?.floorBase||scene.floor||[];
  if(!validRect(r))return false;
  if(r.x<0||r.z<0||r.x+r.w>(scene.width||floor[0]?.length||0)||r.z+r.d>(scene.height||floor.length))return false;
  const partitions=new Set((scene.household?.partitions||[]).map(p=>key(p.x,p.y)));
  for(let z=Math.floor(r.z+.0001);z<=Math.floor(r.z+r.d-.0001);z++)
    for(let x=Math.floor(r.x+.0001);x<=Math.floor(r.x+r.w-.0001);x++)
      if(floor[z]?.[x]==='.'&&!partitions.has(key(x,z)))return false;
  return true;
}
function group(id,kind,footprint){return{id,kind,footprint:footprint&&copyRect(footprint),quads:[]};}
function q(g,points,color,material=6){g.quads.push({points,color,material});}
function top(g,x,z,w,d,y,color,material=6){
  q(g,[[x,y,z],[x,y,z+d],[x+w,y,z+d],[x+w,y,z]],color,material);
}
// A quad follows a real x- or z-facing facade. Its offset remains INSIDE the
// native closed CELL (the existing body is inset .08m within it); it cannot
// claim even a narrow strip of the walking lane. The4mm face offset is required
// so these attached finishes sit outside, rather than behind, the base facade.
function facade(g,r,side,u,v,w,h,color,material=6){
  const inset=-.004;
  if(side==='north'||side==='south'){
    const z=side==='north'?r.z+inset:r.z+r.d-inset,x=r.x+u;
    const a=[[x,v,z],[x+w,v,z],[x+w,v+h,z],[x,v+h,z]];
    q(g,side==='south'?a:a.slice().reverse(),color,material);
  }else{
    const x=side==='west'?r.x+inset:r.x+r.w-inset,z=r.z+u;
    const a=[[x,v,z],[x,v+h,z],[x,v+h,z+w],[x,v,z+w]];
    q(g,side==='east'?a:a.slice().reverse(),color,material);
  }
}
function attachedMasonry(plan,scene,building,rect,index){
  if(!closedRect(scene,rect))return;
  const g=group(`facade:${building.id}:${index}`,'attached-facade',rect),h=building.height||2.75;
  const industrial=!!building.industrial,stone=industrial?PALETTE.louvre:PALETTE.stone;
  for(const side of['north','south','west','east']){
    const length=side==='north'||side==='south'?rect.w:rect.d;
    if(length<.45)continue;
    // Readable corner quoins and one broad bonded course, not particle noise.
    const width=Math.min(.22,length*.19);
    for(let row=0;row<5;row++)for(const end of[0,1]){
      const u=end?length-width-.014:.014,y=.28+row*(h-.48)/5;
      facade(g,rect,side,u,y,width,.12,tint(stone,row%2?.87:1.04));
    }
    facade(g,rect,side,.018,.53,Math.max(.03,length-.036),.055,PALETTE.joint);
    // Slits belong to furnace / instrument / depot structures. A raised light
    // header and dark inset make the actual utility surface legible at distance.
    if(industrial&&length>=.85){
      const w=Math.min(length-.35,1.5),u=(length-w)/2;
      facade(g,rect,side,u,.98,w,.40,PALETTE.grille);
      facade(g,rect,side,u,1.40,w,.047,PALETTE.edge);
      for(let i=0;i<4;i++)facade(g,rect,side,u+.035,1.025+i*.085,w-.07,.025,PALETTE.metal);
    }
  }
  if(g.quads.length)plan.groups.push(g);
}
function roofCourses(plan,scene,building,r,index){
  if(!closedRect(scene,r)||Math.min(r.w,r.d)<.5)return;
  const g=group(`roof:${building.id}:${index}`,'roof-slope-courses',r),wide=r.w>=r.d;
  const h=(building.height||2.75)+.08,rise=Math.min(.70,Math.max(.30,Math.min(r.w,r.d)*.32));
  const span=wide?r.d:r.w,long=wide?r.w:r.d,count=clamp(Math.floor(span/.23),2,8);
  for(let i=1;i<count;i++){
    const u=i/count,t=u*span,y=h+rise*(1-Math.abs(u*2-1))+.013,s=.018;
    if(wide)top(g,r.x+.018,r.z+t-s/2,long-.036,s,y,PALETTE.wood,2);
    else top(g,r.x+t-s/2,r.z+.018,s,long-.036,y,PALETTE.wood,2);
  }
  // Ridge collars and end caps retain the original native roof profile.
  const collars=Math.min(6,Math.max(1,Math.floor(long/.85)));
  for(let i=0;i<collars;i++){
    const t=(i+.5)*long/collars,s=.06,y=h+rise+.015;
    if(wide)top(g,r.x+t-s/2,r.z+span/2-.065,s,.13,y,PALETTE.edge);
    else top(g,r.x+span/2-.065,r.z+t-s/2,.13,s,y,PALETTE.edge);
  }
  plan.groups.push(g);
}
/** A louvred receiver/service bank is attached to the ACTUAL pre-existing
 * maintenance cover. Recesses are broad enough to read in the ordinary camera;
 * sloping blades and copper stringers break the old unarticulated grey slab. */
function serviceBank(plan,scene,b,index){
  const r={x:b.x+.085,z:b.z+.085,w:b.width-.17,d:b.depth-.17};
  if(!closedRect(scene,r)||Math.min(r.w,r.d)<.46)return;
  const alongX=r.w>=r.d,long=alongX?r.w:r.d,breadth=alongX?r.d:r.w;
  const modules=Math.min(8,Math.max(1,Math.floor(long/1.65))),unit=long/modules;
  for(let j=0;j<modules;j++){
    const inset=.10,w=Math.max(.15,unit-.20),d=Math.min(1.30,breadth-.20),u=j*unit+.10,v=(breadth-d)/2;
    const box=alongX?{x:r.x+u,z:r.z+v,w,d}:{x:r.x+v,z:r.z+u,w:d,d:w};
    const g=group(`bank:${index}:${j}`,'receiver-bank-louvres',box),y=.365;
    top(g,box.x,box.z,box.w,box.d,y,PALETTE.grille);
    // End stringers are mesh faces, so they never create new collision bodies.
    if(alongX){
      top(g,box.x-.026,box.z-.025,.045,box.d+.05,y+.035,PALETTE.edge);
      top(g,box.x+box.w-.019,box.z-.025,.045,box.d+.05,y+.035,PALETTE.edge);
    }else{
      top(g,box.x-.025,box.z-.026,box.w+.05,.045,y+.035,PALETTE.edge);
      top(g,box.x-.025,box.z+box.d-.019,box.w+.05,.045,y+.035,PALETTE.edge);
    }
    const blades=clamp(Math.round((alongX?box.w:box.d)/.18),3,10);
    for(let i=0;i<blades;i++){
      const t=(i+.20)/blades,s=(alongX?box.w:box.d)/blades*.48;
      if(alongX){const x=box.x+t*box.w;q(g,[[x,y+.015,box.z+.028],[x,y+.015,box.z+box.d-.028],[x+s,y+.09,box.z+box.d-.028],[x+s,y+.09,box.z+.028]],tint(PALETTE.louvre,i%2?.86:1.03));}
      else{const z=box.z+t*box.d;q(g,[[box.x+.028,y+.015,z],[box.x+box.w-.028,y+.015,z],[box.x+box.w-.028,y+.09,z+s],[box.x+.028,y+.09,z+s]],tint(PALETTE.louvre,i%2?.86:1.03));}
    }
    // Broad service access line, at the same existing cover height.
    if(alongX)top(g,box.x,box.z+box.d/2-.018,box.w,.036,y+.095,PALETTE.metal);
    else top(g,box.x+box.w/2-.018,box.z,.036,box.d,y+.095,PALETTE.metal);
    plan.groups.push(g);
  }
}
function landscapeCourses(plan,wall,index,family){
  const height=wall.top-wall.low,length=wall.end-wall.start;
  if(!(height>.30&&length>.75)||![height,length,wall.fixed,wall.start,wall.end].every(finite))return;
  const g=group(`terrain:${index}`,'existing-cliff-strata',null),wet=/riverbank|mangrove|coral|salt|storm/.test(family),col=wet?PALETTE.wet:/lava|foundry/.test(family)?PALETTE.ash:PALETTE.cliff;
  const face=(u,y,w,h,color)=>{
    const f=wall.fixed+(wall.axis==='x'?wall.dz:wall.dx)*.003;
    let points=wall.axis==='x'?[[u,y,f],[u+w,y,f],[u+w,y+h,f],[u,y+h,f]]:[[f,y,u],[f,y+h,u],[f,y+h,u+w],[f,y,u+w]];
    if(wall.axis==='x'?wall.dz<0:wall.dx<0)points=points.reverse();
    q(g,points,color);
  };
  const rows=clamp(Math.floor(height/.26),1,4),pieces=clamp(Math.ceil(length/2.4),1,7);
  for(let row=0;row<rows;row++){
    const y=wall.low+(row+.40)*height/rows;
    for(let i=0;i<pieces;i++){
      const start=wall.start+i*length/pieces+.055,end=wall.start+(i+1)*length/pieces-.055;
      const shift=(i+row)%2?.025:0;
      face(start,y+shift,Math.max(.04,end-start),Math.min(.062,height/rows*.22),tint(col,row%2?.87:1.07));
    }
    // Vertical seams stagger between each bonded course instead of making a
    // blank perimeter wall or a grid cut through the playable surface.
    if(wall.masonry)for(let i=1;i<pieces;i++){
      const u=wall.start+(i-(row%2)*.35)*length/pieces;
      if(u>wall.start+.04&&u<wall.end-.04)face(u,y+.035,.025,Math.min(.17,height/rows*.45),PALETTE.joint);
    }
  }
  plan.groups.push(g);
}

/** All placement truth is supplied by native plans. Empty space is never an
 * input to a prop scatterer, and no upstream circular footprint is assumed. */
export function nativeEnvironmentArtPlan537({world,buildingPlans=[],originPlan=null,landscapePlan=null}={}){
  const scene=world?.scene,plan={release:'5.37',groups:[],triangles:0};
  if(!scene?.floor)return plan;
  // Observatory utility covers come first because they occupy the view where
  // the old blank slabs were most prominent. Sorting is deterministic.
  const banks=[...(originPlan?.roof?.banks||[])].sort((a,b)=>b.width*b.depth-a.width*a.depth||a.z-b.z||a.x-b.x);
  banks.forEach((b,i)=>serviceBank(plan,scene,b,i));
  for(const b of [...buildingPlans].sort((a,b)=>String(a.id).localeCompare(String(b.id)))){
    if(b.kind==='underground')continue;
    (b.bodyRects||[]).forEach((r,i)=>{roofCourses(plan,scene,b,r,i);attachedMasonry(plan,scene,b,r,i);});
  }
  // At most forty actual contour faces need detail. Long, tall faces gain the
  // first marks; no CPU work scales with the thousands of empty exterior cells.
  const walls=[...(landscapePlan?.walls||[])].sort((a,b)=>(b.top-b.low)*(b.end-b.start)-(a.top-a.low)*(a.end-a.start)||a.start-b.start||a.fixed-b.fixed).slice(0,40);
  walls.forEach((w,i)=>landscapeCourses(plan,w,i,landscapePlan.family||''));
  plan.triangles=plan.groups.reduce((n,g)=>n+g.quads.length*2,0);
  return plan;
}

/** Append once on the existing static scene rebuild. Both WebGL and the native
 * software painter consume these same faces. Low tiers retain all materials
 * while reducing only the number of secondary ornament groups. */
export function appendNativeEnvironmentArt537(mesh,options={}){
  if(!mesh?.quad)return mesh;
  const plan=nativeEnvironmentArtPlan537(options),low=options.quality==='low'||options.quality==='battery';
  const tier=low?600:options.world?.scene?.originId?1100:1200;
  const budget=Math.max(0,Math.min(tier,Number.isFinite(options.maxTriangles)?options.maxTriangles:tier));
  // Spend the static ornament allowance on the surfaces the traveller is near
  // when the scene rebuilds. Source-order budgeting previously detailed distant
  // observatory banks while leaving the phone's foreground covers blank. This
  // performs one stable sort per rebuild, never per frame or player movement.
  const explicit=options.focus,position=options.world?.state;
  const focus=finite(explicit?.x)&&finite(explicit?.z)?explicit:
    finite(position?.x)&&finite(position?.y)?{x:position.x,z:position.y}:null;
  const distance=g=>{
    const r=g.footprint;if(!focus||!validRect(r))return Infinity;
    const dx=Math.max(r.x-focus.x,0,focus.x-r.x-r.w),dz=Math.max(r.z-focus.z,0,focus.z-r.z-r.d);
    return dx*dx+dz*dz;
  };
  const groups=focus?[...plan.groups].sort((a,b)=>{
    const da=distance(a),db=distance(b);return da===db?String(a.id).localeCompare(String(b.id)):da-db;
  }):plan.groups;
  let used=0;
  for(const g of groups){
    const cost=g.quads.length*2;if(used+cost>budget)continue;
    for(const f of g.quads)mesh.quad(...f.points,f.color,f.material);
    used+=cost;
  }
  return mesh;
}
