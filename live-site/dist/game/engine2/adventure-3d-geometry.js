/** Shared 3D world scenery. Story coordinates and collision remain authoritative. */
import {isInteriorScene} from './scene-identity.js?v=4.0.0';
import {environmentFor} from './environment.js?v=5.18.0';
import {environmentSurfaceSpec} from './environment-materials-v17.js?v=5.18.0';
import {buildingReservations,pointInGroundRect} from './environmental-grounding.js?v=5.22.0';
import {appendAdventureLandscape} from './adventure-landscape.js?v=5.42';
import {appendInteriorSurround} from './interior-scene-shell-541.js?v=5.41';
import {originArtOwnsFurnishing541} from './origin-art-541.js?v=5.41';
import {paintNativeGroundFinish} from './native-ground-537.js?v=5.37.0';

const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const tint = (c, s) => c.map(v => Math.min(1, v * s));
const point = o => Array.isArray(o?.xy) ? {x: o.xy[0] + .5, z: o.xy[1] + .5} : null;
const BUILDING_PLANS=new WeakMap();
const colorCss=c=>'#'+c.map(v=>Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0')).join('');

export function adventureSceneStyle(world) {
  const s = world?.scene || {}, indoor = isInteriorScene(s), env = environmentFor(s) || {};
  const style = typeof env === 'string' ? env : env.style || 'village';
  const timber = indoor && /home|inn|quarters|carpenter|guild|instrumentworks|attic|assembly/.test(s.household?.kind || s.interior || s.key || '');
  return {indoor, style, timber, storm: s.originId === 'veyr-storm' || style === 'storm',
    water: /river|water|mangrove|coral|salt/.test(style), forest: /woodland|village|spore|garden/.test(style),
    warm: indoor || /village|foundry|sand/.test(style)};
}

/** The closed mask uses a genuinely dark material, rather than relying on a
 * texture tint whose lighting intentionally keeps painted floor details bright. */
export function adventureSurfacePalette(world) {
  const style=adventureSceneStyle(world);
  const floors={village:'#89906a',woodland:'#687a4d',riverbank:'#849084',highland:'#81909a',ruins:'#96918b',foundry:'#8b7d6d',storm:'#7e929c',salt:'#b4b5a2',coral:'#7eaaa4',mangrove:'#6d8978',sand:'#b4a078',cactus:'#aaa272',ice:'#b1c4c5',aurora:'#a2b7bf',lava:'#80736a',caldera:'#827368',spore:'#8b8b94',crystal:'#a0afba',marble:'#b3b8b0'};
  const key=[world.scene?.key,world.scene?.household?.kind,world.scene?.interior].join(' '),room=/clinic/.test(key)?'#a5b3a6':/archive|vault|chapel/.test(key)?'#aaa39a':/reactor|console|security|catwalk/.test(key)?'#8b9c9f':/cistern|drain|pump/.test(key)?'#8a9d98':/kiln|forge|pottery/.test(key)?'#ac8d70':'#92968a';
  const floor=style.indoor?rgb(style.timber?'#9c805a':room):rgb(floors[style.style]||'#849078');
  const closedColors={riverbank:'#2b4445',highland:'#344651',ruins:'#413b4c',foundry:'#312b2a',salt:'#505852',coral:'#244746',mangrove:'#2b403b',sand:'#574b39',cactus:'#495035',ice:'#384c58',aurora:'#354b54',lava:'#302624',caldera:'#302624',spore:'#303b3a',crystal:'#334554',marble:'#3b4547'};
  const closed=rgb(style.indoor?'#20292c':style.storm?'#26343e':closedColors[style.style]||'#293b2b');
  return {floor,closed,wall:rgb(style.timber?'#8b8068':'#67777b'),wallCap:rgb(style.timber?'#76684b':'#84908b'),floorMaterial:0,closedMaterial:6,wallMaterial:0};
}

/** Bounds describe the actual structural floor, excluding furniture cutouts. */
export function adventureSceneBounds(world) { return {...scenePlan(world).bounds}; }

function mergedRectangles(cells, has, emit) {
  const used=new Set();
  for(const [x,z] of cells){
    if(used.has(x+','+z))continue;
    let w=1,h=1;while(has(x+w,z)&&!used.has((x+w)+','+z))w++;
    outer:while(has(x,z+h)){for(let xx=x;xx<x+w;xx++)if(!has(xx,z+h)||used.has(xx+','+(z+h)))break outer;h++;}
    for(let zz=z;zz<z+h;zz++)for(let xx=x;xx<x+w;xx++)used.add(xx+','+zz);
    emit(x,z,w,h);
  }
}

function closedSurface(m,p,palette) {
  const cells=[];for(let z=p.bounds.z0;z<p.bounds.z1;z++)for(let x=p.bounds.x0;x<p.bounds.x1;x++)if(!p.structural(x,z))cells.push([x,z]);
  const closed=(x,z)=>x>=p.bounds.x0&&x<p.bounds.x1&&z>=p.bounds.z0&&z<p.bounds.z1&&!p.structural(x,z);
  mergedRectangles(cells,closed,(x,z,w,h)=>m.quad([x,.008,z],[x,.008,z+h],[x+w,.008,z+h],[x+w,.008,z],palette.closed,palette.closedMaterial,0,1,[0,1,0]));
}

/** One small material atlas per scene; reuse the game's original painted art. */
export function prepareAdventureMaterials(world, assets = {}) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d'); if (!ctx) return null;
  const style = adventureSceneStyle(world), arch = assets.architectureMaterials, scenic = assets.scenicMaterials;
  const usable = image => image && image.complete !== false && (image.naturalWidth || image.width) > 0;
  function crop(image, source, x, y, fallback) {
    ctx.fillStyle = fallback; ctx.fillRect(x, y, 512, 512);
    if (!usable(image)) return false;
    try { ctx.drawImage(image, ...source, x, y, 512, 512); return true; } catch { return false; }
  }
  function wash(x,y,color,opacity){ctx.save();ctx.globalAlpha=opacity;ctx.fillStyle=color;ctx.fillRect(x,y,512,512);ctx.restore();}
  const surface = environmentSurfaceSpec(style.style) || environmentSurfaceSpec('grass');
  if (style.timber) crop(arch, [8, 8, 496, 496], 0, 0, '#806345');
  else if (style.indoor) crop(arch, [520, 8, 496, 496], 0, 0, '#8e8d7d');
  else if (!crop(assets.environmentSurfaces, surface.crop, 0, 0, style.storm ? '#697b82' : '#647247')) {
    const iw = scenic?.naturalWidth || scenic?.width || 1254, ih = scenic?.naturalHeight || scenic?.height || 1254;
    const stone = style.storm || /highland|ruin|foundry|ice|aurora/.test(style.style);
    const soil = /sand|soil|river|mangrove/.test(style.style);
    crop(scenic, [soil ? iw / 2 : 0, stone ? ih / 2 : 0, iw / 2, ih / 2], 0, 0, '#69745b');
  }
  crop(arch, style.timber ? [1032, 8, 496, 496] : [520, 8, 496, 496], 512, 0, '#a1967c');
  crop(arch, [1032, 520, 496, 496], 0, 512, '#8f7953');
  const slate = environmentSurfaceSpec(style.indoor?'stone':style.forest?'soil':style.style) || environmentSurfaceSpec('stone');
  if (!crop(assets.environmentSurfaces, slate.crop, 512, 512, '#5c6662')) {
    const iw = scenic?.naturalWidth || scenic?.width || 1254, ih = scenic?.naturalHeight || scenic?.height || 1254;
    crop(scenic, [0, ih / 2, iw / 2, ih / 2], 512, 512, '#68706a');
  }
  // The other-session 5.37 material synthesis supplies readable courses and
  // geology while retaining the original painted art underneath. Both native
  // render backends consume this same atlas; no second scene is introduced.
  paintNativeGroundFinish(ctx,world,{style});
  // Original ground art supplies material grain, not a noisy field of gravel.
  // Broad biome colour and masonry forms remain legible behind people/routes.
  const palette=adventureSurfacePalette(world);
  wash(0,0,colorCss(palette.floor),style.indoor?(style.timber?.32:.46):style.storm?.22:.32);
  wash(512,0,style.timber?'#a2977d':'#89938d',.24);
  wash(0,512,'#8e866c',.22);
  wash(512,512,colorCss(tint(palette.closed,1.52)),style.indoor?.36:.38);
  return canvas;
}

function scenePlan(world) {
  const scene = world.scene, width = scene.width || scene.floor?.[0]?.length || 0, height = scene.height || scene.floor?.length || 0;
  const floor = scene.household?.floorBase || scene.floor || [];
  const open = (x, z) => x >= 0 && z >= 0 && x < width && z < height && floor[z]?.[x] === '.';
  const walk = (x, z) => x >= 0 && z >= 0 && x < width && z < height && scene.floor[z]?.[x] === '.';
  const partitions = new Set((scene.household?.partitions || []).map(p => p.x + ',' + p.y));
  const structural = (x, z) => open(x, z) && !partitions.has(x + ',' + z);
  const closedPatch = (x, z, r = .35) => {
    for (let zz = Math.floor(z - r); zz <= Math.floor(z + r); zz++) for (let xx = Math.floor(x - r); xx <= Math.floor(x + r); xx++) if (open(xx, zz)) return false;
    return true;
  };
  const cells = []; for (let z = 0; z < height; z++) for (let x = 0; x < width; x++) if (open(x, z)) cells.push([x, z]);
  const bounds = cells.length ? {x0:Math.min(...cells.map(p=>p[0])),x1:Math.max(...cells.map(p=>p[0]))+1,z0:Math.min(...cells.map(p=>p[1])),z1:Math.max(...cells.map(p=>p[1]))+1} : {x0:0,x1:width,z0:0,z1:height};
  return {scene,width,height,open,walk,structural,closedPatch,partitions,cells,bounds};
}

function closedSite(plan, anchor, radius = .22, reach = 4) {
  if (!anchor) return null;
  const candidates = [];
  for (let dz = -reach; dz <= reach; dz++) for (let dx = -reach; dx <= reach; dx++) {
    const x = Math.floor(anchor.x) + dx + .5, z = Math.floor(anchor.z) + dz + .5;
    if (plan.closedPatch(x, z, radius)) candidates.push({x,z,d:Math.hypot(x-anchor.x,z-anchor.z)});
  }
  return candidates.sort((a,b)=>a.d-b.d)[0] || null;
}

function windowPose(plan, footprint) {
  const x=footprint.x+footprint.w/2,z=footprint.y+footprint.h/2;
  for(const [dx,dz]of [[0,1],[1,0],[-1,0],[0,-1]])if(plan.open(Math.floor(x+dx),Math.floor(z+dz)))return{x:x+dx*.515,z:z+dz*.515,axis:dx?'x':'z'};
  return{x,z:z+.515,axis:'z'};
}

/** A building belongs to its authored street entrance and projected parcel.
 * Closed cells carry solid masonry; the open part is an intentional cutaway
 * porch/courtyard. No whole house is shrunk and moved to a spare rock tile. */
export function adventureBuildingPlan(world){
  const s=world?.scene;if(!s)return[];
  const signature=JSON.stringify([s.floor,s.affordanceBlocked||[],s.exteriorBuildings?.map(b=>[b.id,b.projection])]);
  const previous=BUILDING_PLANS.get(s);if(previous?.signature===signature)return previous.plans;
  const reservations=buildingReservations(s),plans=[];
  const open=(x,z)=>s.floor[z]?.[x]==='.';
  const approach=new Set((s.authoredOpening?.approach||[]).map(p=>Math.floor(p[0])+','+Math.floor(p[1])));
  for(const building of s.exteriorBuildings||[]){
    const r=reservations.find(r=>r.id===building.id),projection=building.projection||{},entrance=point(building.exit);
    if(!r||!entrance)continue;
    if(s.originId&&building.exit.originStep!==undefined&&building.exit.originTravel===undefined&&(s.exteriorBuildings||[]).some(other=>other!==building&&other.projection?.roomLocation===projection.roomLocation&&other.exit?.originTravel===-1))continue;
    const bounds={x0:r.ground.x,x1:r.ground.x+r.ground.w,z0:r.ground.y,z1:r.ground.y+r.ground.h};
    const originalRects=r.groundRects.map(v=>({x:v.x,z:v.y,w:v.w,d:v.h}));
    const contains=(x,z,pad=0)=>r.groundRects.some(rect=>pointInGroundRect(rect,x,z,pad));
    const bodyCells=[],floorCells=[];
    for(let z=Math.floor(bounds.z0);z<Math.ceil(bounds.z1);z++)for(let x=Math.floor(bounds.x0);x<Math.ceil(bounds.x1);x++){
      if(!contains(x+.5,z+.5,.18))continue;
      if(open(x,z)){floorCells.push([x,z]);continue;}
      if(projection.kind==='underground'||approach.has(x+','+z))continue;
      if((s.objects||[]).some(o=>o.xy&&Math.hypot(o.xy[0]-x,o.xy[1]-z)<.72))continue;
      bodyCells.push([x,z]);
    }
    const closed=new Set(bodyCells.map(p=>p.join(','))),bodyRects=[];
    mergedRectangles(bodyCells,(x,z)=>closed.has(x+','+z),(x,z,w,d)=>bodyRects.push({x:x+.08,z:z+.08,w:w-.16,d:d-.16}));
    const material=projection.material||'home',industrial=/workshop|instrument|depot|reactor|cistern|vent|security/.test(material),civic=/guild|clinic|chapel|archive|vault/.test(material);
    const height=industrial?3.25:civic?3.05:2.75;
    const corners=[[bounds.x0,bounds.z0],[bounds.x1,bounds.z0],[bounds.x0,bounds.z1],[bounds.x1,bounds.z1]],supports=[];
    for(const [x,z]of corners){const cell=bodyCells.map(p=>({x:p[0]+.5,z:p[1]+.5,d:Math.hypot(p[0]+.5-x,p[1]+.5-z)})).sort((a,b)=>a.d-b.d)[0];if(cell&&!supports.some(p=>p.x===cell.x&&p.z===cell.z))supports.push(cell);}
    const front=projection.vector?.every(Number.isFinite)?{x:projection.vector[0],z:projection.vector[1]}:{x:0,z:1};
    plans.push({id:building.id,roomLocation:projection.roomLocation,kind:projection.kind||'building',material,style:projection.style||material,entrance,threshold:{...entrance,front},bounds,groundRects:originalRects,bodyCells,bodyRects,floorCells,supports,height,industrial,civic});
  }
  BUILDING_PLANS.set(s,{signature,plans});return plans;
}

function buildingColors(plan){
  const m=plan.material;
  return {wall:rgb(plan.industrial?'#78918d':/clinic/.test(m)?'#b4bba7':plan.civic?'#a3aa9b':'#b7a183'),
    wood:rgb(/inn/.test(m)?'#76533a':'#6c5039'),stone:rgb('#69786f'),edge:rgb('#b9ac87'),
    roof:rgb(plan.industrial?'#667c77':/clinic/.test(m)?'#6f8e80':plan.civic?'#7b7778':'#a46e4e'),glass:rgb('#dfc992'),metal:rgb('#536866')};
}

function buildingRoof(m,b,h,c){
  const x=b.x+b.w/2,z=b.z+b.d/2,wide=b.w>=b.d,peak=h+Math.min(.70,Math.max(.30,Math.min(b.w,b.d)*.32));
  if(wide){
    m.quad([b.x,h,b.z],[b.x+b.w,h,b.z],[b.x+b.w,peak,z],[b.x,peak,z],c.roof,2);
    m.quad([b.x,peak,z],[b.x+b.w,peak,z],[b.x+b.w,h,b.z+b.d],[b.x,h,b.z+b.d],c.roof,2);
    m.tri([b.x,h,b.z],[b.x,peak,z],[b.x,h,b.z+b.d],c.wall,0);
    m.tri([b.x+b.w,h,b.z+b.d],[b.x+b.w,peak,z],[b.x+b.w,h,b.z],c.wall,0);
    m.box(x,peak+.025,z,b.w+.03,.065,.08,c.wood,2);
  }else{
    m.quad([b.x,h,b.z],[x,peak,b.z],[x,peak,b.z+b.d],[b.x,h,b.z+b.d],c.roof,2);
    m.quad([x,peak,b.z],[b.x+b.w,h,b.z],[b.x+b.w,h,b.z+b.d],[x,peak,b.z+b.d],c.roof,2);
    m.tri([b.x,h,b.z],[b.x+b.w,h,b.z],[x,peak,b.z],c.wall,0);
    m.tri([b.x,h,b.z+b.d],[x,peak,b.z+b.d],[b.x+b.w,h,b.z+b.d],c.wall,0);
    m.box(x,peak+.025,z,.08,.065,b.d+.03,c.wood,2);
  }
}

function frameHull(points){
  const rows=[...new Map(points.map(p=>[p.x.toFixed(3)+','+p.z.toFixed(3),p])).values()].sort((a,b)=>a.x-b.x||a.z-b.z);
  const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x),lower=[],upper=[];
  for(const p of rows){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
  for(const p of rows.slice().reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
  return rows.length>2?lower.slice(0,-1).concat(upper.slice(0,-1)):rows;
}

function buildStreetArchitecture(m,world){
  for(const b of adventureBuildingPlan(world)){
    const a=b.entrance,c=buildingColors(b),front=b.threshold.front,tangent={x:front.z,z:-front.x};
    if(b.kind==='underground'){
      m.box(a.x,.027,a.z,1.18,.025,1.06,c.metal,1);
      for(let i=0;i<5;i++)m.box(a.x-.42+i*.21,.047,a.z,.055,.014,.84,c.edge,1);
      continue;
    }
    // Native walkable cells stay usable: porch boards/paving are only 3cm high.
    // Their parcel, real doorway and full-sized structural bays read together.
    for(const [x,z]of b.floorCells){
      const wood=!b.industrial&&!b.civic;
      m.box(x+.5,.024,z+.5,.96,.012,.96,wood?tint(c.wood,1.26):tint(c.stone,1.21),wood?2:6);
      if(wood)for(const dz of[-.30,0,.30])m.box(x+.5,.032,z+.5+dz,.93,.005,.012,tint(c.wood,.72),2);
    }
    for(const r of b.bodyRects){
      const x=r.x+r.w/2,z=r.z+r.d/2;
      m.box(x,b.height/2,z,r.w,b.height,r.d,c.wall,0);
      m.box(x,.14,z,r.w+.015,.26,r.d+.015,tint(c.stone,.74),6);
      m.box(x,b.height+.035,z,r.w+.04,.07,r.d+.04,c.edge,6);
      buildingRoof(m,r,b.height+.08,c);
      const facade=b.threshold.front.x?{x:r.x+(front.x>0?r.w:0),z,axis:'x'}:{x,z:r.z+(front.z>0?r.d:0),axis:'z'};
      const span=facade.axis==='x'?r.d:r.w,count=Math.max(1,Math.min(4,Math.floor(span/1.4)));
      for(let i=0;i<count;i++){
        const offset=(i-(count-1)/2)*Math.min(1.4,span/count),wx=facade.x+tangent.x*offset,wz=facade.z+tangent.z*offset;
        m.box(wx+front.x*.018,1.63,wz+front.z*.018,facade.axis==='x'?.025:.38,.63,facade.axis==='x'?.38:.025,c.glass,4,.09);
        m.box(wx+front.x*.037,1.63,wz+front.z*.037,facade.axis==='x'?.035:.045,.70,facade.axis==='x'?.045:.035,c.wood,2);
        for(const dy of[-.34,.34])m.box(wx+front.x*.04,1.63+dy,wz+front.z*.04,facade.axis==='x'?.05:.49,.055,facade.axis==='x'?.49:.05,c.wood,2);
      }
    }
    // A continuous open roof frame joins the real load-bearing closed cells
    // to the native entrance jambs. It establishes a full porch/work bay while
    // keeping the courtyard and every traveller visible through the cutaway.
    const frameY=b.height-.08,jambs=[-1,1].map(side=>({x:a.x+tangent.x*side*.73,z:a.z+tangent.z*side*.73})),hull=frameHull([...b.supports,...jambs]);
    for(let i=0;i<hull.length;i++){
      const p=hull[i],q=hull[(i+1)%hull.length],d=Math.hypot(p.x-q.x,p.z-q.z);if(d<.05||d>9)continue;
      m.tube([p.x,frameY,p.z],[q.x,frameY,q.z],.075,.075,c.wood,2,4);
      const dx=(q.x-p.x)/d,dz=(q.z-p.z)/d;
      if(d>1.6)for(const [end,sign]of[[p,1],[q,-1]])m.tube([end.x,frameY-.48,end.z],[end.x+dx*sign*.46,frameY,end.z+dz*sign*.46],.045,.045,c.wood,2,4);
    }
    // Every entry is recognisable at its actual travel tile. The central
    // passage is 1.30m wide, with no door leaf hiding an entering traveller.
    for(const side of[-1,1])m.box(a.x+tangent.x*side*.73,frameY/2,a.z+tangent.z*side*.73,tangent.x?.12:.10,frameY,tangent.z?.12:.10,c.wood,2);
    m.box(a.x,frameY+.035,a.z,tangent.x?1.60:.14,.17,tangent.z?1.60:.14,c.wood,2);
    m.box(a.x+front.x*.12,.043,a.z+front.z*.12,tangent.x?1.24:.64,.025,tangent.z?1.24:.64,c.edge,6);
    // A small lit plate belongs to the entry frame, rather than a lantern
    // scattered on whichever closed cell happened to be nearest.
    const lx=a.x+tangent.x*.75-front.x*.04,lz=a.z+tangent.z*.75-front.z*.04;
    m.box(lx,1.79,lz,.18,.29,.18,c.metal,1);m.box(lx+front.x*.03,1.81,lz+front.z*.03,.13,.19,.13,c.glass,4,.24);
    if(/clinic/.test(b.material)){m.box(a.x,frameY+.20,a.z,.34,.085,.05,c.glass,6);m.box(a.x,frameY+.20,a.z,.085,.34,.05,c.glass,6);}
  }
}

export function appendAdventureStreetArchitecture(mesh,{world}={}){if(mesh&&world?.scene)buildStreetArchitecture(mesh,world);return mesh;}

function fixturePlan(world) {
  const p = scenePlan(world), style = adventureSceneStyle(world), fixtures = [];
  if (style.indoor) {
    for (const o of p.scene.objects || []) if (o.footprint && [3,4,18].includes(o.furniture)) {
      const b = o.footprint,at=o.furniture===18?windowPose(p,b):{x:b.x+b.w/2,z:b.y+b.h/2};
      fixtures.push({...at,y:o.furniture===18?1.8:.72,kind:o.furniture===18?'window':'hearth',c:o.furniture===18?[.36,.58,.66]:[1.0,.43,.13]});
    }
  } else if (style.storm || style.style === 'village') {
    for(const b of adventureBuildingPlan(world).filter(b=>b.kind!=='underground').slice(0,7)){
      const a=b.entrance,f=b.threshold.front,t={x:f.z,z:-f.x};
      fixtures.push({x:a.x+t.x*.75-f.x*.04,z:a.z+t.z*.75-f.z*.04,y:1.81,kind:'entry',c:[1,.62,.27]});
    }
    const anchors = (p.scene.objects || []).filter(o=>o.xy && (o.originStep===0 || o.originStep===1 || o.type==='portal' && !o.originTravel || o.buildingEntrance)).slice(0,7);
    for (const o of anchors) {
      if(o.buildingEntrance||p.scene.originId)continue;
      const a = point(o), at = closedSite(p,a,.20,3);
      if (at && at.d < 3.2 && !fixtures.some(f=>Math.hypot(f.x-at.x,f.z-at.z)<2)) fixtures.push({...at,y:2.1,kind:'lantern',c:style.storm?[.72,.56,.28]:[1,.55,.22]});
    }
  }
  return fixtures;
}

export function adventureLightRig(world) { return fixturePlan(world).map(f=>({p:[f.x,f.y,f.z],c:f.c})); }

export function buildAdventureGeometry(Geometry, C, world, {exteriorSites=[],terrainCraft=true}={}) {
  const m = new Geometry(); if (!world?.scene?.floor) return m;
  const p = scenePlan(world), s = p.scene, style = adventureSceneStyle(world);
  const colors = {stone:rgb(style.storm?'#6e8189':'#959789'),wood:rgb('#74553a'),brass:rgb('#9a8051'),metal:rgb('#45525a'),rock:rgb(style.storm?'#4f636e':'#6d7566'),grass:rgb('#687a4d'),soil:rgb('#8c7655'),teal:rgb('#87d3d5'),warm:rgb('#f6bb72')};
  const palette=adventureSurfacePalette(world),floorColor=palette.floor;
  if(!appendInteriorSurround(m,{world}))appendAdventureLandscape(m,{world,exteriorSites,terrainCraft});closedSurface(m,p,palette);
  const used = new Set();
  // Greedy rectangular floor batches keep large worlds inexpensive. Texture
  // coordinates are world-based, so no material seam appears between batches.
  for (const [x,z] of p.cells) {
    if (!p.structural(x,z)||used.has(x+','+z)) continue;
    let dx=1,dz=1; while(x+dx<p.width&&p.structural(x+dx,z)&&!used.has((x+dx)+','+z))dx++;
    outer:while(z+dz<p.height){for(let xx=x;xx<x+dx;xx++)if(!p.structural(xx,z+dz)||used.has(xx+','+(z+dz)))break outer;dz++;}
    for(let zz=z;zz<z+dz;zz++)for(let xx=x;xx<x+dx;xx++)used.add(xx+','+zz);
    m.quad([x,.012,z],[x,.012,z+dz],[x+dx,.012,z+dz],[x+dx,.012,z],floorColor,0,0,1,[0,1,0]);
  }
  const doors = [...(s.doors||[]),...(s.objects||[]).filter(o=>o.type==='portal')].filter(o=>o.xy);
  const doorway = (x,z,dx,dz) => doors.some(o=>Math.hypot(o.xy[0]+.5-(x+.5+dx*.5),o.xy[1]+.5-(z+.5+dz*.5))<.79);
  const boundary = [];
  for (const [x,z] of p.cells) for (const [dx,dz] of [[0,-1],[-1,0],[0,1],[1,0]]) {
    if (p.structural(x+dx,z+dz) || !p.structural(x,z)) continue;
    boundary.push({x,z,dx,dz});
  }

  if (style.indoor) {
    // Extrude wall runs into blocked cells. Near-camera walls are cut low;
    // door cells are open, and furniture blockers never become tiny walls.
    const runs = new Map();
    for (const e of boundary) {
      if (doorway(e.x,e.z,e.dx,e.dz)) continue;
      const partition=p.partitions.has((e.x+e.dx)+','+(e.z+e.dz));
      const h=partition?.85:e.dz<0?2.85:e.dx<0?2.60:.48;
      const axis=e.dx?'z':'x',fixed=e.dx?e.x+(e.dx>0?1:0)+e.dx*.17:e.z+(e.dz>0?1:0)+e.dz*.17;
      const start=e.dx?e.z:e.x,key=[axis,fixed,h].join(':');if(!runs.has(key))runs.set(key,{axis,fixed,h,spans:[]});runs.get(key).spans.push(start);
    }
    for(const r of runs.values()) {
      r.spans.sort((a,b)=>a-b);for(let i=0;i<r.spans.length;){let start=r.spans[i],end=start+1;i++;while(i<r.spans.length&&r.spans[i]===end){end++;i++;}
        const center=(start+end)/2,len=end-start;
        const wallThickness=r.h>1?.24:.34;
        if(r.axis==='x'){m.box(center,r.h/2,r.fixed,len,r.h,wallThickness,palette.wall,palette.wallMaterial);m.box(center,.15,r.fixed,len+.015,.18,.39,tint(palette.wall,.72),6);m.box(center,r.h+.025,r.fixed,len+.025,.05,.37,palette.wallCap,6);}
        else {m.box(r.fixed,r.h/2,center,wallThickness,r.h,len,palette.wall,palette.wallMaterial);m.box(r.fixed,.15,center,.39,.18,len+.015,tint(palette.wall,.72),6);m.box(r.fixed,r.h+.025,center,.37,.05,len+.025,palette.wallCap,6);}
        if(r.h>1){
          const belt=style.timber?tint(colors.wood,.80):tint(palette.wall,.80),h=style.timber?.53:.10,y=style.timber?.40:.70;
          if(r.axis==='x')m.box(center,y,r.fixed,len,h,.24,belt,style.timber?2:6);
          else m.box(r.fixed,y,center,.24,h,len,belt,style.timber?2:6);
        }
        if(r.h>2)for(let u=start+.4;u<end;u+=2.9){if(r.axis==='x')m.box(u,1.42,r.fixed,.10,2.78,.43,colors.wood,2);else m.box(r.fixed,1.30,u,.43,2.55,.10,colors.wood,2);}
      }
    }
    // Material zero lets the software painter omit this buried upper face.
    m.box((p.bounds.x0+p.bounds.x1)/2,-.75,(p.bounds.z0+p.bounds.z1)/2,p.bounds.x1-p.bounds.x0+.8,1.35,p.bounds.z1-p.bounds.z0+.8,rgb('#282d2e'),0);
  } else {
    // Full parcels, native thresholds and load-bearing native closed cells
    // form coherent cutaway buildings instead of displaced miniature houses.
    buildStreetArchitecture(m,world);
  }

  // Furniture is real geometry confined to the saved blocked footprint.
  for(const o of s.objects||[]) {
    const f=o.footprint;if(o.type!=='furnishing'||!f||f.w<=0||f.h<=0||originArtOwnsFurnishing541(world,o))continue;
    const x=f.x+f.w/2,z=f.y+f.h/2,w=f.w*.86,d=f.h*.86,id=o.furniture;
    const legs=(height=.70)=>{for(const dx of [-.36,.36])for(const dz of [-.34,.34])m.box(x+dx*w,height/2,z+dz*d,.09,height,.09,colors.wood,2);};
    if(id===16){m.box(x,.025,z,w,.018,d,rgb('#78534d'),6);continue;}
    if(id===18){
      const at=windowPose(p,f),side=at.axis==='x';
      m.box(at.x,1.62,at.z,side?.07:w*.80,1.15,side?w*.80:.07,rgb('#aecfd2'),4,.12);
      for(const off of [-.42,0,.42])m.box(at.x+(side?0:off*w),1.62,at.z+(side?off*w:.012),side?.08:.035,1.23,side?.035:.08,colors.metal,1);
      for(const y of [1.04,1.62,2.20])m.box(at.x,y,at.z,side?.09:w*.88,.035,side?w*.88:.09,colors.metal,1);
      continue;
    }
    if([0,11].includes(id)){
      legs(.35);m.box(x,.36,z,w,.15,d,colors.wood,2);m.box(x,.53,z,w*.94,.22,d*.92,rgb(id===11?'#c2d1bd':'#648b96'),6);
      m.box(x,.67,z-d*.30,w*.75,.13,d*.19,rgb('#ddd8bf'),6);m.box(x,.55,z-d*.48,w,.65,.09,colors.wood,2);
    }else if([5,7,8,6].includes(id)){
      legs(.72);m.box(x,.76,z,w,.14,d,colors.wood,2);m.box(x,.70,z,w*.92,.08,d*.96,colors.brass,1);
      if(id===6){m.cylinder(x,.90,z,Math.min(w,d)*.27,.16,colors.stone,0,12,.34);m.cylinder(x,.98,z,.22,.015,C.water,3,12);}
      else if(id===5){for(const dx of [-.25,.25]){m.cylinder(x+dx*w,.87,z,.16,.025,rgb('#d2c8a8'),0,12);m.sphere(x+dx*w,.91,z+.20,.09,rgb('#c39855'),6,0,6,4,[1.3,.5,.7]);}}
      else {m.box(x,.86,z,.4,.035,.28,rgb('#ddd3ad'),6);m.cylinder(x+.26,.92,z-.12,.045,.12,colors.brass,1,7);}
    }else if([3,4].includes(id)){
      m.box(x,.45,z,w,.88,d,colors.stone);m.box(x,.47,z+d*.47,w*.65,.49,.025,rgb('#292b2b'),7);
      m.box(x,.47,z+d*.49,w*.43,.16,.035,colors.warm,4,.6);m.box(x,1.0,z,w*1.06,.19,d*1.05,colors.stone);
      if(id===3){m.cylinder(x,1.15,z,.23,.19,colors.metal,1,10);m.cylinder(x,1.27,z,.19,.05,colors.brass,1,10);}
      else m.box(x,1.7,z-d*.24,w*.59,1.2,d*.44,colors.stone);
    }else if(id===13){m.cylinder(x,.52,z,Math.min(w,d)*.45,1.0,colors.wood,2,12);for(const y of [.16,.80])m.cylinder(x,y,z,Math.min(w,d)*.46,.06,colors.metal,1,12);}
    else if([14,15].includes(id)){legs(.38);m.box(x,.43,z,w,.18,d,colors.wood,2);m.box(x,.56,z,w*.85,.16,d*.83,rgb('#8e766e'),6);m.box(x,.90,z-d*.40,w,.65,.13,colors.wood,2);}
    else if(id===17){m.cylinder(x,.27,z,Math.min(w,d)*.26,.50,rgb('#8e654e'),0,9,.34);m.sphere(x,.78,z,.40,colors.grass,5,0,7,5,[.85,1.2,.85]);}
    else if([1,2,10,19,20].includes(id)) {
      const h=id===20?.78:1.72;
      // Hollow frames: opening the renderer's saved-state cabinet doors
      // genuinely exposes shelves and contents, rather than another solid box.
      m.box(x,h/2,z-d*.46,w,h,.08,colors.wood,2);
      for(const side of [-1,1])m.box(x+side*(w/2-.045),h/2,z,.09,h,d,colors.wood,2);
      for(const y of [.06,h])m.box(x,y,z,w,.10,d,colors.wood,2);
      const shelves=h>1?[.35,.85,1.35]:[.25];
      for(const y of shelves){
        m.box(x,y,z,w*.93,.065,d*.94,colors.wood,2);
        for(let k=0;k<4;k++)m.box(x-w*.33+k*w*.22,y+.17,z-d*.03,w*.14,.25,d*.50,
          id===10?rgb(k%2?'#a7c0b2':'#857c66'):tint(colors.stone,.66+k*.10),6);
      }
    } else {
      const h=.80;m.box(x,h/2,z,w,h,d,colors.wood,2);m.box(x,h+.045,z,w*1.04,.09,d*1.05,colors.wood,2);
      for(const dx of [-.24,.24])m.box(x+dx*w,h*.55,z+d*.515,.045,.19,.045,colors.brass,1);
    }
  }

  // Generic saved-state props have fixed bases only; the renderer owns their
  // moving lids, handles and doors. Open-floor caches are buried supply hatches
  // so interacting never introduces a new invisible movement blocker.
  for(const o of s.objects||[]) {
    if(!o.xy||o.type==='furnishing')continue;
    try{if(world.available&&!world.available(o))continue;}catch{}
    const a=point(o);
    if(o.type==='cache') {
      const b=o.footprint,blocked=b||!p.walk(Math.floor(a.x),Math.floor(a.z));
      const x=b?b.x+b.w/2:a.x,z=b?b.y+b.h/2:a.z,w=b?Math.min(1.0,b.w*.85):.72,d=b?Math.min(.7,b.h*.85):.54;
      if(blocked){
        m.box(x,.22,z,w,.43,d,colors.wood,2);m.box(x,.425,z,w*.82,.018,d*.72,rgb('#252c2d'),7);
        for(const dx of [-.35,.35])m.box(x+dx*w,.22,z,.045,.42,d*1.02,colors.brass,1);
      }else{
        m.box(x,.028,z,w,.022,d,colors.metal,1);m.box(x,.041,z,w*.80,.009,d*.73,rgb('#293438'),7);
        for(const dx of [-.46,.46])m.box(x+dx*w,.047,z,.025,.014,d,colors.brass,1);
      }
    }else if(['puzzle','switch','note','project','embodied-action'].includes(o.type)) {
      m.ring(a.x,.030,a.z,.31,.35,tint(colors.brass,.82),1,0,1,20);
    }
  }

  // Visible doors always share their saved tile. Central overhead spans are
  // omitted; readable thresholds and side cheeks cannot conceal a traveller.
  for(const o of doors) {
    const a=point(o);m.ring(a.x,.035,a.z,.33,.39,colors.brass,1,0,1,24);
    const side=o.wallSide;if(!style.indoor||!side)continue;
    const dx=side==='east'?1:side==='west'?-1:0,dz=side==='south'?1:side==='north'?-1:0;
    const x=a.x+dx*.68,z=a.z+dz*.68;
    for(const t of [-.52,.52])m.box(x+(dz?t:0),.89,z+(dx?t:0),dx?.18:.09,1.78,dx?.09:.18,colors.wood,2);
  }

  // Purpose-built storm observatory anchored to the real conductor station.
  if(style.storm&&s.originId!=='veyr-storm') {
    const step=s.originPart===1?2:1,sceneObjects=s.objects||[];
    let currentObjects=sceneObjects;try{currentObjects=world.objects?.()||sceneObjects;}catch{}
    const station=sceneObjects.find(o=>o.type==='puzzle'&&o.originId===s.originId&&o.originStep===step&&o.xy)
      ||currentObjects.find(o=>o.type==='embodied-action'&&o.xy&&['cable','lever','coil'].includes(o.manipulation))
      ||currentObjects.find(o=>o.type==='puzzle'&&o.xy&&(!world.available||world.available(o)));
    const a=point(station)||{x:(p.bounds.x0+p.bounds.x1)/2,z:(p.bounds.z0+p.bounds.z1)/2};
    const landmark=s.authoredOpening?.landmark?.xy;
    const preferred=landmark?{x:landmark[0],z:landmark[1]}:{x:a.x-2,z:a.z+1};
    const mast=closedSite(p,preferred,.43,5)||closedSite(p,a,.43,5);
    let snapshot;try{snapshot=world.embodiedOrigins?.snapshot?.();}catch{}
    const saved=world.state?.embodiedOrigins?.origins?.['veyr-storm']||{};
    const grounded=!!(snapshot?.devices?.grounded||saved.grounded||world.state?.chronicle?.choices?.repair!==undefined);
    // A foreground receiving array establishes the observatory immediately
    // from the authored arrival, while the repair mast keeps its real anchor.
    const arrival=s.authoredOpening?.arrival||(s.arrive?[s.arrive[0]+.5,s.arrive[1]+.5]:null);
    const lookout=arrival?closedSite(p,{x:arrival[0]-1.8,z:arrival[1]-2.8},.43,3):null;
    if(lookout&&(!mast||Math.hypot(lookout.x-mast.x,lookout.z-mast.z)>2.0)){
      m.cylinder(lookout.x,.16,lookout.z,.43,.32,colors.stone,0,12);
      m.cylinder(lookout.x,2.67,lookout.z,.095,5.05,colors.metal,1,12,.065);
      for(const y of [.52,.84,1.16,1.48])m.cylinder(lookout.x,y,lookout.z,.28,.065,colors.brass,1,14);
      for(const side of [-1,1]){
        m.tube([lookout.x,3.65,lookout.z],[lookout.x+side*.92,3.65,lookout.z],.04,.03,colors.brass,1,8);
        m.cylinder(lookout.x+side*.87,3.92,lookout.z,.12,.58,rgb('#bfd4d5'),0,12,.085);
      }
      m.ring(lookout.x,4.95,lookout.z,.51,.55,colors.brass,1,0,1,32);
      m.tube([lookout.x-.58,4.95,lookout.z],[lookout.x+.58,4.95,lookout.z],.025,.025,colors.brass,1,7);
      m.sphere(lookout.x,5.27,lookout.z,.10,colors.teal,4,.22,10,7);
    }
    if(mast){
      m.cylinder(mast.x,.21,mast.z,.43,.42,colors.stone,0,12);m.cylinder(mast.x,.49,mast.z,.33,.17,colors.brass,1,12);
      const top=[mast.x+(grounded?0:.30),8.2,mast.z];
      m.tube([mast.x,.56,mast.z],top,.19,.09,colors.metal,1,12);
      for(const y of [1.1,2.7,4.3,5.9,7.3])m.cylinder(mast.x,y,mast.z,.24,.10,colors.brass,1,10);
      m.tube([top[0]-.92,7.0,top[2]],[top[0]+.92,7.0,top[2]],.045,.045,colors.brass,1,8);
      for(const side of [-1,1])m.cylinder(top[0]+side*.78,7.25,top[2],.11,.62,rgb('#a6c2ca'),0,10,.08);
      m.sphere(top[0],8.3,top[2],.15,grounded?colors.teal:colors.brass,grounded?4:1,grounded?.30:0,10,6);
      // Ground conductors are flush and leave all movement lanes unchanged.
      const dx=mast.x-a.x,dz=mast.z-a.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.35));
      if(Math.hypot(dx,dz)<=8)for(let i=0;i<n;i++){const t=i/n,u=(i+1)/n;m.tube([a.x+dx*t,.042,a.z+dz*t],[a.x+dx*u,.042,a.z+dz*u],.022,.022,grounded?colors.teal:colors.brass,grounded?4:1,8,grounded?.10:0);}
      // Coil cages and insulators occupy checked closed patches beside mast.
      for(const side of [-1,1]){const at=closedSite(p,{x:mast.x+side*2.3,z:mast.z-1.4},.40,3);if(!at||Math.hypot(at.x-mast.x,at.z-mast.z)<.9)continue;
        m.cylinder(at.x,.19,at.z,.4,.38,colors.stone,0,10);m.cylinder(at.x,1.0,at.z,.13,1.44,colors.metal,1,10);
        for(let j=0;j<7;j++)m.cylinder(at.x,.47+j*.17,at.z,.27,.065,colors.brass,1,12);
        m.sphere(at.x,1.79,at.z,.19,rgb('#b6d5d7'),0,0,9,6);
      }
    }
    m.ring(a.x,.031,a.z,.41,.47,grounded?colors.teal:colors.brass,grounded?4:1,grounded?.12:0,1,28);
  }

  for(const f of fixturePlan(world))if(f.kind==='lantern'){
    m.cylinder(f.x,.91,f.z,.038,1.82,colors.metal,1,7);m.box(f.x,1.98,f.z,.27,.38,.27,colors.brass,1);
    m.box(f.x,2.01,f.z,.20,.25,.20,colors.warm,4,.4);m.cylinder(f.x,2.23,f.z,.23,.09,colors.metal,1,8,.13);
  }
  return m;
}
