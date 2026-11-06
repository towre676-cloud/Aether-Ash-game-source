/** Original wall details fitted to existing household back walls. No floor or door geometry. */
const T=48,WALL_HEIGHT=88,IMAGE_WIDTH=1774,IMAGE_HEIGHT=887,MAX_DETAILS=16;
export const INTERIOR_ART_FILES=Object.freeze({
 environmentHomeWalls:'home-walls-v19.webp',
 environmentWorkshopWalls:'workshop-walls-v19.webp',
 environmentCivicWalls:'civic-walls-v19.webp'
});
const rows=[
 ['home-limewash-repair','Mended limewash bay','home','panel',[45,128,458,263]],
 ['home-timber-brace','Pegged timber brace','home','panel',[560,128,458,264]],
 ['home-corner-left','Left plaster and timber return','home','corner-left',[1130,98,157,326]],
 ['home-corner-right','Right plaster and timber return','home','corner-right',[1480,98,161,326]],
 ['home-linen-recess','Closed-back linen recess','home','niche',[89,530,267,259]],
 ['home-kitchen-tiles','Worn leaf-pattern tiles','home','panel',[446,531,360,263]],
 ['home-smoke-repair','Smoke-worn plaster repair','home','panel',[865,511,383,274]],
 ['home-carved-cornice','Carved cornice repair','home','cornice',[1287,591,444,113]],
 ['workshop-brick-repair','Clay and brick repair bay','workshop','panel',[32,123,541,295]],
 ['workshop-timber-brace','Strapped workshop joinery','workshop','panel',[604,87,508,334]],
 ['workshop-corner-left','Left workshop return','workshop','corner-left',[1173,57,198,388]],
 ['workshop-corner-right','Right workshop return','workshop','corner-right',[1455,57,262,409]],
 ['workshop-tool-recess','Closed-back tool recess','workshop','niche',[49,517,371,285]],
 ['workshop-copper-conduit','Copper conduit repair','workshop','conduit',[489,516,179,281]],
 ['workshop-acoustic-lath','Mended acoustic lath','workshop','panel',[725,520,408,275]],
 ['workshop-cornice','Scarf-jointed cornice','workshop','cornice',[1166,610,571,135]],
 ['civic-limewash-repair','Pale limewash and stone bay','civic','panel',[63,151,558,270]],
 ['civic-sage-wainscot','Sage ceramic wainscot','civic','panel',[658,185,473,236]],
 ['civic-corner-left','Left limestone return','civic','corner-left',[1172,103,224,324]],
 ['civic-corner-right','Right limestone return','civic','corner-right',[1463,103,222,324]],
 ['civic-herb-recess','Closed-back clinic recess','civic','niche',[86,508,317,259]],
 ['civic-archive-recess','Closed-back archive recess','civic','niche',[484,509,340,256]],
 ['civic-stone-vent','Inset stone ventilation grille','civic','vent',[889,556,299,205]],
 ['civic-cornice','Pale stone cornice repair','civic','cornice',[1222,625,505,133]]
];
const assetByFamily={home:'environmentHomeWalls',workshop:'environmentWorkshopWalls',civic:'environmentCivicWalls'};
export const INTERIOR_WALL_PIECES=Object.freeze(rows.map(([id,label,family,role,crop])=>Object.freeze({id,label,family,role,asset:assetByFamily[family],crop:Object.freeze(crop)})));
const byId=new Map(INTERIOR_WALL_PIECES.map(piece=>[piece.id,piece]));
const homeKinds=new Set(['home','inn','quarters','kitchen','mess','nursery']);
const workshopKinds=new Set(['workshop','instrumentworks','carpenter','tailor','pottery','printshop','optics','store','cargo']);
const civicKinds=new Set(['clinic','archive','guild','assembly','waiting','listening','music','cistern','garden','washroom']);
const ready=image=>!!image&&image.complete!==false&&image.width===IMAGE_WIDTH&&image.height===IMAGE_HEIGHT;

export function interiorWallFamily(kind){
 if(homeKinds.has(kind))return 'home';
 if(workshopKinds.has(kind))return 'workshop';
 if(civicKinds.has(kind))return 'civic';
 return null; // Chapel and unknown room programs retain their specialist walls.
}

/** Aspect-preserving fit; registration is the bottom center of the painted piece. */
export function interiorWallPieceSpec(id,{width=160,height=76}={}){
 const piece=byId.get(id);if(!piece||![width,height].every(n=>Number.isFinite(n)&&n>0))return null;
 const scale=Math.min(width/piece.crop[2],height/piece.crop[3]),w=piece.crop[2]*scale,h=piece.crop[3]*scale;
 return {id,piece,crop:piece.crop,width:w,height:h,draw:{x:-w/2,y:-h,w,h}};
}

/** No canvas allocation, clipping path, filter or pixel readback; failed optional art is harmless. */
export function drawInteriorWallPiece(c,image,spec,x,y,alpha=1){
 if(!c||!ready(image)||!spec?.piece||![x,y,alpha,spec.draw.x,spec.draw.y,spec.draw.w,spec.draw.h].every(Number.isFinite))return false;
 c.save();try{c.globalAlpha*=Math.max(0,Math.min(1,alpha));const d=spec.draw;c.drawImage(image,...spec.crop,x+d.x,y+d.y,d.w,d.h);return true;}catch{return false;}finally{c.restore();}
}

const plans=new WeakMap(),EMPTY=Object.freeze([]);
function seedOf(value){let n=2166136261;for(let i=0;i<value.length;i++){n^=value.charCodeAt(i);n=Math.imul(n,16777619);}return n>>>0;}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

function reservedAreas(scene){
 const h=scene.household,reserved=[];
 for(const o of h.furnishings||[]){
  const b=o.footprint;if(!b)continue;
  if(o.furniture===18){reserved.push({x:b.x*T-9,y:(b.y+b.h)*T-WALL_HEIGHT-5,w:b.w*T+18,h:WALL_HEIGHT+10});continue;}
  // Hearths and specialist fixtures retain their own wall silhouette and working area.
  if(o.furniture===4||o.specialType||['hydrophone','pumping','treatment'].includes(o.visual)){
   const height=Math.max(92,b.h*T+24);reserved.push({x:b.x*T-10,y:(b.y+b.h)*T-height,w:b.w*T+20,h:height+8});
  }
 }
 for(const d of [...(scene.doors||[]),...(scene.objects||[]).filter(o=>o.type==='portal'||o.buildingEntrance)]){
  if(!d.xy)continue;reserved.push({x:(d.xy[0]-.72)*T,y:(d.xy[1]-2)*T,w:1.44*T,h:3*T});
 }
 for(const d of h.architectureProgram?.doorways||[]){
  if(!d.cells?.length)continue;const a=d.cells[0],b=d.cells[d.cells.length-1];
  reserved.push(d.axis==='h'?{x:a[0]*T-8,y:a[1]*T-WALL_HEIGHT-5,w:(b[0]-a[0]+1)*T+16,h:WALL_HEIGHT+T+10}:{x:a[0]*T-8,y:a[1]*T-WALL_HEIGHT-5,w:T+16,h:(b[1]-a[1]+1)*T+WALL_HEIGHT+10});
 }
 return reserved;
}

function candidates(family,kind){
 return INTERIOR_WALL_PIECES.filter(p=>p.family===family&&!p.role.startsWith('corner')&&p.role!=='cornice'&&
  (p.id!=='civic-herb-recess'||['clinic','waiting','washroom'].includes(kind))&&
  (p.id!=='civic-archive-recess'||['archive','guild','assembly','listening','music'].includes(kind))&&
  (p.id!=='home-kitchen-tiles'||['home','inn','kitchen','mess','nursery'].includes(kind)));
}

/** Stable cached wall-only geometry. No positions, room cells or journey data are changed. */
export function interiorWallPlan(scene){
 if(!scene?.household)return EMPTY;if(plans.has(scene))return plans.get(scene);
 const h=scene.household,family=interiorWallFamily(h.kind);if(!family){plans.set(scene,EMPTY);return EMPTY;}
 const base=h.floorBase,box=h.box,occupied=new Set();
 for(const b of scene.blocks||[])for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)occupied.add(x+','+y);
 const walk=(x,y)=>base[y]?.[x]==='.'||occupied.has(x+','+y),walls=[];
 for(let y=box.top;y<=box.bottom;y++){let start=null;for(let x=box.left;x<=box.right+1;x++){
  const north=walk(x,y)&&!walk(x,y-1);if(north&&start===null)start=x;
  if(!north&&start!==null){walls.push({x:start*T,y:y*T-WALL_HEIGHT,w:(x-start)*T,h:WALL_HEIGHT});start=null;}
 }}
 const reserved=reservedAreas(scene),pool=candidates(family,h.kind),result=[];
 function place(piece,left,right,wall){
  if(result.length>=MAX_DETAILS||right-left<24)return;
  const role=piece.role,height=role==='cornice'?22:role==='vent'?52:role==='niche'?64:70;
  const spec=interiorWallPieceSpec(piece.id,{width:Math.min(role.startsWith('corner')?50:164,right-left),height});
  if(!spec||spec.height<20)return;
  const x=(left+right)/2,y=role==='cornice'?wall.y+10+spec.height:wall.y+wall.h-11;
  const bounds={x:x+spec.draw.x,y:y+spec.draw.y,w:spec.width,h:spec.height};
  if(bounds.x<wall.x+5||bounds.x+bounds.w>wall.x+wall.w-5||bounds.y<wall.y+7||bounds.y+bounds.h>wall.y+wall.h-9||reserved.some(r=>overlap(bounds,r)))return;
  result.push(Object.freeze({id:piece.id,asset:piece.asset,family,spec,x,y,bounds:Object.freeze(bounds),wall:Object.freeze({...wall})}));
 }
 for(const wall of walls){
  if(result.length>=MAX_DETAILS)break;
  // Single-cell steps in irregular room outlines remain quiet cutaway edges.
  if(wall.w<96)continue;
  let gaps=[[wall.x+7,wall.x+wall.w-7]];
  for(const r of reserved){if(r.y>=wall.y+wall.h||r.y+r.h<=wall.y)continue;const next=[];for(const [a,b]of gaps){if(r.x>=b||r.x+r.w<=a)next.push([a,b]);else{if(r.x>a)next.push([a,Math.min(r.x,b)]);if(r.x+r.w<b)next.push([Math.max(a,r.x+r.w),b]);}}gaps=next;}
  for(let i=0;i<gaps.length;i++){
   let [left,right]=gaps[i];const seed=seedOf(String(scene.key||scene.location)+':'+wall.x+':'+wall.y+':'+i);
   if(right-left<24)continue;
   const leftEnd=left===wall.x+7,rightEnd=right===wall.x+wall.w-7;
   if(right-left<64){if(leftEnd||rightEnd)place(byId.get(family+'-corner-'+(leftEnd?'left':'right')),left,right,wall);continue;}
   if(leftEnd&&right-left>196){place(byId.get(family+'-corner-left'),left,left+43,wall);left+=49;}
   if(rightEnd&&right-left>196){place(byId.get(family+'-corner-right'),right-43,right,wall);right-=49;}
   const slots=Math.min(3,Math.max(1,Math.floor((right-left)/156))),slot=(right-left)/slots;
   for(let n=0;n<slots;n++){
    const hasMain=result.some(p=>!p.spec.piece.role.startsWith('corner')&&p.spec.piece.role!=='cornice');
    const cornice=hasMain&&(seed+n)%7===0?INTERIOR_WALL_PIECES.find(p=>p.family===family&&p.role==='cornice'):null;
    const purposeful=!hasMain&&['kitchen','mess'].includes(h.kind)?byId.get('home-kitchen-tiles'):!hasMain&&h.kind==='instrumentworks'?byId.get('workshop-acoustic-lath'):null;
    place(purposeful||cornice||pool[(seed+n*3)%pool.length],left+n*slot+3,left+(n+1)*slot-3,wall);
   }
  }
 }
 const frozen=Object.freeze(result);plans.set(scene,frozen);return frozen;
}

/** Shared Standard/Compatibility draw, with cached placement and optional view culling. */
export function paintInteriorWallDetails(c,scene,images=null,view=null){
 if(!c||!images)return 0;let count=0;
 for(const p of interiorWallPlan(scene)){
  if(view&&(p.bounds.x+p.bounds.w<view.x0*T||p.bounds.x>(view.x1+1)*T||p.bounds.y+p.bounds.h<view.y0*T-WALL_HEIGHT||p.bounds.y>(view.y1+1)*T))continue;
  if(drawInteriorWallPiece(c,images[p.asset],p.spec,p.x,p.y))count++;
 }
 return count;
}
