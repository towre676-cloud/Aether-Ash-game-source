import {drawAuthoredFurniture} from './authored-scenery.js?v=5.38';
import {drawRegionalFurniture} from './environment-detail-pass.js?v=5.22.0';
import {paintInteriorWallDetails} from './environment-interiors-v19.js?v=5.18.1';
import {paintMaterialGrain,paintExemplarFloor,paintChapelWall} from './scene-composition.js?v=5.16.0';
import {paintFurnitureContact} from './contact-shadow.js?v=5.1.0';
import {surfacePattern,paintRoomAtmosphere,paintDirectRoomSurface,paintRoomFloorAccents} from './room-surfaces.js?v=5.10.0';
import {drawOccupiedFixture,paintOccupiedFloor} from './room-realism-art.js?v=5.1.0';
import {artifactGlyph} from './physical-lore-art.js';
import {paintedPattern} from './architectural-materials.js';
import {drawDesignedFurniture} from './furniture-art.js?v=5.1.0';
const T=48;
const PALETTE={home:['#7b5039','#946849','#5a382c'],inn:['#6e4939','#875d45','#523b32'],clinic:['#6b7973','#84948a','#3d514d'],guild:['#55516b','#746d84','#3c354b'],carpenter:['#91643d','#ac7d51','#62482e'],workshop:['#5b5141','#796852','#3b3630'],instrumentworks:['#6d513e','#96704e','#443b32'],archive:['#4c5a54','#68756a','#303f3c'],quarters:['#7a5b48','#9a7960','#514339'],chapel:['#665a70','#82768c','#41384f'],cistern:['#49626b','#67828a','#2c424c'],garden:['#626d4d','#83916b','#3d513d']};
function prop(c,art,id,x,y,w,h,alpha=1){const b=art.bounds[id];if(!b)return;c.save();c.globalAlpha=alpha;const scale=Math.min(w/b.w,h/b.h),dw=b.w*scale,dh=b.h*scale;c.drawImage(art.image,b.x,b.y,b.w,b.h,x-dw/2,y-dh,dw,dh);c.restore();}
export function bakeHousehold(scene,art){
 const p=scene.household,box=p.box,T=48,wallHeight=88,surface=document.createElement('canvas');surface.worldX=(box.left-2)*T;surface.worldY=(box.top-3)*T;surface.width=(box.right-box.left+5)*T;surface.height=(box.bottom-box.top+6)*T;const c=surface.getContext('2d'),colors=PALETTE[p.kind]||PALETTE.workshop,base=p.floorBase,occupied=new Set();for(const b of scene.blocks||[])for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)occupied.add(x+','+y);const walk=(x,y)=>base[y]?.[x]==='.'||occupied.has(x+','+y),stone=['clinic','cistern','chapel'].includes(p.kind),floor=surfacePattern(c,p.kind),plaster=paintedPattern(c,art.materials,2,260),timber=paintedPattern(c,art.materials,3,190);c.translate(-surface.worldX,-surface.worldY);
 const floorPath=()=>{c.beginPath();for(let y=box.top;y<=box.bottom;y++)for(let x=box.left;x<=box.right;x++)if(walk(x,y))c.rect(x*T,y*T,T+.5,T+.5);};
 // A continuous surface replaces 48px board stamps. Everything below is clipped to the room.
 c.save();floorPath();c.clip();c.fillStyle=floor||colors[0];c.fillRect(box.left*T,box.top*T,(box.right-box.left+1)*T,(box.bottom-box.top+1)*T);c.fillStyle=stone?'#38544b18':'#33241b30';c.fillRect(box.left*T,box.top*T,(box.right-box.left+1)*T,(box.bottom-box.top+1)*T);
 // Existing painted material contributes fine grain at a restrained contrast;
 // the board-sized drawing still supplies the readable scale and joins.
 const grain=paintedPattern(c,art.materials,stone?1:0,stone?260:192);
 if(grain){c.save();c.globalAlpha=stone?.29:.23;c.fillStyle=grain;c.translate(box.left*T,box.top*T);const rw=(box.right-box.left+1)*T,rh=(box.bottom-box.top+1)*T;if(stone)c.fillRect(0,0,rw,rh);else{c.rotate(Math.PI/2);c.fillRect(0,-rw,rh,rw);}c.restore();}
 paintRoomAtmosphere(c,scene,walk,box);
 paintOccupiedFloor(c,scene);
 paintRoomFloorAccents(c,scene);paintExemplarFloor(c,scene);
 // Local wear connects furnishings to the floor rather than floating above an empty grid.
 for(const o of p.furnishings.filter(o=>![16,18].includes(o.furniture))){const b=o.footprint,x=(b.x+b.w/2)*T,y=(b.y+b.h)*T,g=c.createRadialGradient(x,y,5,x,y,Math.max(b.w,b.h)*T);g.addColorStop(0,'#735c3520');g.addColorStop(1,'#735c3500');c.fillStyle=g;c.fillRect(x-120,y-120,240,240);}
 for(const o of p.furnishings)if(o.furniture===16){const b=o.footprint;prop(c,art,16,(b.x+b.w/2)*T,(b.y+b.h)*T,b.w*T,b.h*T,.88);}
 const light=c.createRadialGradient((box.left+box.right)*T/2,(box.top+box.bottom)*T/2,20,(box.left+box.right)*T/2,(box.top+box.bottom)*T/2,Math.max(box.right-box.left,box.bottom-box.top)*T*.65);light.addColorStop(0,'#ffffff00');light.addColorStop(1,'#12212830');c.fillStyle=light;c.fillRect(box.left*T,box.top*T,(box.right-box.left+1)*T,(box.bottom-box.top+1)*T);c.restore();
 paintHouseholdWalls(c,scene,walk,colors,p.kind==='chapel'?paintedPattern(c,art.materials,1,256):plaster,timber,art);
 return surface;}

const geometryCache=new WeakMap();
/** Geometry only; no offscreen surface, filter or pixel readback is needed. */
export function householdSurfaceGeometry(scene){
 if(geometryCache.has(scene))return geometryCache.get(scene);
 const h=scene.household,base=h.floorBase,occupied=new Set();for(const b of scene.blocks||[])for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)occupied.add(x+','+y);
 const walk=(x,y)=>base[y]?.[x]==='.'||occupied.has(x+','+y),spans=[];
 for(let y=h.box.top;y<=h.box.bottom;y++){let left=null;for(let x=h.box.left;x<=h.box.right+1;x++){if(walk(x,y)&&left===null)left=x;if(!walk(x,y)&&left!==null){spans.push({x:left*T,y:y*T,w:(x-left)*T,h:T});left=null;}}}
 const result={walk,spans,box:h.box};geometryCache.set(scene,result);return result;
}

export function paintCompatibilityHousehold(c,scene,view=null,materials=null,wallArt=null){
 if(!scene?.household)return false;const h=scene.household,{walk,spans,box}=householdSurfaceGeometry(scene),colors=PALETTE[h.kind]||PALETTE.workshop;
 c.save();c.beginPath();for(const r of spans)c.rect(r.x,r.y,r.w+.25,r.h+.25);c.clip();
 paintDirectRoomSurface(c,h.kind,box,view);paintMaterialGrain(c,scene,materials,{view});paintRoomAtmosphere(c,scene,walk,box);paintOccupiedFloor(c,scene);paintRoomFloorAccents(c,scene);paintExemplarFloor(c,scene);
 c.restore();paintHouseholdWalls(c,scene,walk,colors,null,null,wallArt,view);return true;
}
function paintHouseholdWalls(c,scene,walk,colors,plaster,timber,wallArt=null,view=null){
 const p=scene.household,box=p.box,wallHeight=88;
 // Back walls are continuous plaster bays with timber joinery, cornices and skirting.
 for(let y=box.top;y<=box.bottom;y++){let start=null;for(let x=box.left;x<=box.right+1;x++){const north=walk(x,y)&&!walk(x,y-1);if(north&&start===null)start=x;if(!north&&start!==null){const px=start*T,py=y*T,w=(x-start)*T;if(p.kind==='chapel'){paintChapelWall(c,{x:px,y:py,w,stone:plaster});start=null;continue;}c.fillStyle='#080f184d';c.fillRect(px-8,py-wallHeight-6,w+16,wallHeight+14);c.fillStyle=plaster||'#c2b293';c.fillRect(px,py-wallHeight,w,wallHeight);const g=c.createLinearGradient(0,py-wallHeight,0,py);g.addColorStop(0,'#64544333');g.addColorStop(.65,'#756b4b05');g.addColorStop(1,'#453e323d');c.fillStyle=g;c.fillRect(px,py-wallHeight,w,wallHeight);c.fillStyle=timber||colors[2];c.fillRect(px-5,py-wallHeight-7,w+10,12);c.fillRect(px-5,py-9,w+10,12);c.fillRect(px-5,py-wallHeight,11,wallHeight+5);c.fillRect(px+w-6,py-wallHeight,11,wallHeight+5);c.strokeStyle='#e3d1a269';c.lineWidth=1;c.beginPath();c.moveTo(px,py-wallHeight+8);c.lineTo(px+w,py-wallHeight+8);c.moveTo(px,py-6);c.lineTo(px+w,py-6);c.stroke();start=null;}}}
 paintInteriorWallDetails(c,scene,wallArt,view);
 for(let y=box.top;y<=box.bottom;y++)for(let x=box.left;x<=box.right;x++)if(walk(x,y)){for(const dx of[-1,1])if(!walk(x+dx,y)){c.fillStyle=timber||colors[2];c.fillRect((x+(dx>0?1:0))*T-5,y*T,10,T+1);c.fillStyle='#d6c49a44';c.fillRect((x+(dx>0?1:0))*T-1,y*T,2,T);}if(!walk(x,y+1)){c.fillStyle=timber||colors[2];c.fillRect(x*T,(y+1)*T-5,T,9);}}
 // Join partition cells into architectural wall spans, so bays are not ladders of squares.
 const parts=new Set((p.partitions||[]).map(b=>b.x+','+b.y)),rectangles=[];for(const key of [...parts]){if(!parts.has(key))continue;const [x,y]=key.split(',').map(Number);let w=1,h=1;while(parts.has((x+w)+','+y))w++;while(Array.from({length:w},(_,i)=>parts.has((x+i)+','+(y+h))).every(Boolean))h++;for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)parts.delete(xx+','+yy);rectangles.push({x,y,w,h});}
 for(const b of rectangles){const x=b.x*T,y=b.y*T,w=b.w*T,h=b.h*T;c.fillStyle='#17202640';c.fillRect(x+8,y-24,w,h+36);c.fillStyle=plaster||colors[1];c.fillRect(x,y-34,w,h+34);c.fillStyle=timber||colors[2];c.fillRect(x-2,y-39,w+4,8);c.fillRect(x,y+h-7,w,8);c.fillRect(x-2,y-34,7,h+34);c.fillRect(x+w-5,y-34,7,h+34);c.strokeStyle='#e5d6b066';c.lineWidth=1;c.strokeRect(x+5,y-31,w-10,h+21);}
 // Open thresholds and jambs make internal doorways readable as real openings.
 for(const d of p.architectureProgram?.doorways||[]){const a=d.cells[0],b=d.cells.at(-1);c.save();c.fillStyle=timber||colors[2];c.strokeStyle='#d5c19a77';c.lineWidth=1;if(d.axis==='h'){const x=a[0]*T,y=a[1]*T,w=(b[0]-a[0]+1)*T;c.fillRect(x-5,y-38,8,T+38);c.fillRect(x+w-3,y-38,8,T+38);c.fillRect(x-5,y-43,w+10,8);c.fillStyle='#b7a58644';c.fillRect(x+4,y+T-6,w-8,5);c.strokeRect(x+3,y-35,w-6,T+29);}else{const x=a[0]*T,y=a[1]*T,h=(b[1]-a[1]+1)*T;c.fillRect(x-3,y-25,T+6,7);c.fillRect(x-3,y+h-7,T+6,7);c.fillStyle='#b7a58633';c.fillRect(x+T*.4,y+2,T*.2,h-8);}c.restore();}

}
function makerStamp(c,o,x,y){if(!o.makerMark)return;c.save();c.translate(x,y-18);c.scale(1,.65);c.globalAlpha=.65;artifactGlyph(c,o.makerMark.glyph,.18,'#c4ad83',0);c.restore();}
export function drawHouseholdFurniture(renderer,o,state,near){if(o.furniture===16)return;
 // A named, footprint-authored activity group owns its picture. A regional
 // table, bed or counter must not replace the complete fitted station.
 if(o.visual&&renderer.assets.roomLife?.width>0&&renderer.assets.roomLife.complete!==false&&drawOccupiedFixture(renderer,o,state,near)){makerStamp(renderer.ctx,o,(o.footprint.x+o.footprint.w/2)*T,(o.footprint.y+o.footprint.h)*T);return;}
 if(drawAuthoredFurniture(renderer,o,state,near))return;
 if(drawRegionalFurniture(renderer,o,state,near)){makerStamp(renderer.ctx,o,(o.footprint.x+o.footprint.w/2)*T,(o.footprint.y+o.footprint.h)*T);return;}
 if(o.specialType){drawDesignedFurniture(renderer.ctx,{...o.footprint,type:o.specialType});makerStamp(renderer.ctx,o,(o.footprint.x+o.footprint.w/2)*T,(o.footprint.y+o.footprint.h)*T);if(near)renderer.label(o.label,(o.footprint.x+o.footprint.w/2)*T,o.footprint.y*T-28,true);return;}const c=renderer.ctx,b=o.footprint,x=(b.x+b.w/2)*T,y=(b.y+b.h)*T,id=o.furniture,art={image:renderer.assets.props,bounds:renderer.bounds.props};if(!art.image)return;c.save();if(id!==18)paintFurnitureContact(c,b,{opacity:.15});const maxH=[0,11].includes(id)?Math.min(b.h*T+8,T*1.95):id===18?T*1.65:[1,2,3,4,9,10,19,22,23].includes(id)?T*1.8:T*1.5;prop(c,art,id,x,y,(b.w+.05)*T,maxH);makerStamp(c,o,x,y);if(state.household?.openFurniture?.includes(o.householdId)){c.fillStyle='#ffe7ad88';c.fillRect(x-b.w*T*.3,y-12,b.w*T*.6,4);}if(near){c.strokeStyle='#f0dca780';c.lineWidth=1.5;c.beginPath();c.ellipse(x,y+2,Math.max(18,b.w*T*.42),8,0,0,7);c.stroke();renderer.label(o.label+(state.household?.examined?.includes(o.householdId)?' · ✓':''),x,y-maxH-8,true);}c.restore();}

export function householdRestFixture(scene,o){
 if(o?.type!=='camp'||!Array.isArray(o.xy))return null;
 return (scene?.household?.furnishings||[]).filter(f=>[0,11,4].includes(f.furniture)).map(f=>({fixture:f,distance:Math.hypot(o.xy[0]+.5-(f.footprint.x+f.footprint.w/2),o.xy[1]+.5-(f.footprint.y+f.footprint.h))})).filter(p=>p.distance<=3.2).sort((a,b)=>a.distance-b.distance)[0]?.fixture||null;
}
export function drawRoomService(renderer,o,x,y){
 // A rest interaction beside a real bed or hearth does not need another
 // cabinet in the aisle. Its modest floor cue and existing label remain usable.
 if(householdRestFixture(renderer.currentScene,o)){const c=renderer.ctx;c.save();c.strokeStyle='#b5ad8566';c.lineWidth=1;c.beginPath();c.ellipse(x*T,y*T,12,4,0,0,Math.PI*2);c.stroke();c.restore();return;}
 const id=o.type==='cache'?12:renderer.currentScene.key==='home'?20:/clinic|refuge|shelter/.test(renderer.currentScene.key)?11:4;prop(renderer.ctx,{image:renderer.assets.props,bounds:renderer.bounds.props},id,x*T,y*T,76,90);
}
