/** World-space reservations for the architecture actually drawn by building-art.
 * These are presentation bounds only. They never alter collision or door travel.
 */
import {buildingDetailPlan} from './building-art.js?v=5.22.0';

const TILE=48,cache=new WeakMap();
const finite=(...values)=>values.every(Number.isFinite);
const box=(x,y,w,h)=>Object.freeze({x,y,w,h});
const union=rects=>{const x=Math.min(...rects.map(r=>r.x)),y=Math.min(...rects.map(r=>r.y));return box(x,y,Math.max(...rects.map(r=>r.x+r.w))-x,Math.max(...rects.map(r=>r.y+r.h))-y);};
export function pointInGroundRect(rect,x,y,pad=0){return !!rect&&x>=rect.x-pad&&x<rect.x+rect.w+pad&&y>=rect.y-pad&&y<rect.y+rect.h+pad;}
export function intersectsGroundRect(a,b,pad=0){return a.x<b.x+b.w+pad&&a.x+a.w>b.x-pad&&a.y<b.y+b.h+pad&&a.y+a.h>b.y-pad;}

export function buildingReservations(scene){
 if(!scene||typeof scene!=='object')return [];
 if(cache.has(scene))return cache.get(scene);
 const result=[];
 for(const plan of scene.exteriorBuildings||[]){
  const p=plan.projection;if(!Array.isArray(p?.outside)||p.outside.length<2||!finite(...p.outside,p.scale)||p.scale<=0)continue;
  const x=p.outside[0]+.5,y=p.outside[1]+.5,door=Object.freeze({x,y}),approach=box(x-.85,y-.12,1.7,2.1);
  if(p.kind==='underground'){
   // drawStairwell: 70px stone opening, 38px rear rail, 88×80px contact extent.
   // The hidden interior's projected floor is not an outdoor building.
   const ground=box(x-35/TILE,y-28/TILE,70/TILE,50/TILE),visual=box(x-44/TILE,y-38/TILE,88/TILE,80/TILE);
   result.push(Object.freeze({id:plan.id,kind:p.kind,door,approach,ground,visual,groundRects:Object.freeze([ground])}));continue;
  }
  const cells=(p.cells||[]).filter(cell=>Array.isArray(cell)&&finite(cell[0],cell[1]));if(!cells.length)continue;
  const rows=new Map();for(const [cx,cy]of cells){if(!rows.has(cy))rows.set(cy,new Set());rows.get(cy).add(cx);}
  const groundRects=[];for(const [cy,row]of rows){const xs=[...row].sort((a,b)=>a-b);let left=xs[0],right=left;const add=()=>groundRects.push(box(x+left*p.scale,y+cy*p.scale,(right-left+1)*p.scale,p.scale));for(const cx of xs.slice(1)){if(cx===right+1)right=cx;else{add();left=right=cx;}}add();}
  const ground=union(groundRects);
  const silhouettes=groundRects.map(r=>box(r.x-3/TILE,r.y-64/TILE-3/TILE,r.w+6/TILE,r.h+67/TILE));
  // Gables are real silhouette, rather than the offscreen canvas's empty padding.
  if(p.bounds){for(const f of buildingDetailPlan(plan).frontages)if(f.gable)silhouettes.push(box(x+(f.x-5)/TILE,y+(f.y-f.gable.rise-4)/TILE,(f.w+10)/TILE,(f.ground-f.y+f.gable.rise+4)/TILE));}
  silhouettes.push(box(x-30/TILE,y-68/TILE,60/TILE,83/TILE));
  result.push(Object.freeze({id:plan.id,kind:p.kind||'building',door,approach,ground,visual:union(silhouettes),groundRects:Object.freeze(groundRects)}));
 }
 const frozen=Object.freeze(result);cache.set(scene,frozen);return frozen;
}

/** Concave courtyards stay open; stairs reserve only their visible entrance. */
export function buildingGroundContains(reservations,x,y,pad=0){return reservations.some(r=>pointInGroundRect(r.ground,x,y,pad)&&r.groundRects.some(cell=>pointInGroundRect(cell,x,y,pad)));}
