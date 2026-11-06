import {drawStairwell} from './subterranean-art.js?v=4.0.0';
import {paintedPattern} from './architectural-materials.js';
import {architectureWindowId,architectureAccentSpec,drawArchitectureAccent} from './environment-architecture-v17.js?v=5.18.0';
import {drawArchitecturePiece,facadeBayPlacement,roofCraftPlacement,gableCraftPlacement,wallCraftPlacement} from './environment-architecture-v19.js?v=5.18.1';
/** Cached cutaway buildings. Roof cells are the interior's floor cells, uniformly scaled and rotated. */
const T=48,COLORS={home:['#a07048','#66513e','#567a76'],inn:['#936a4c','#6d4b37','#6a687b'],clinic:['#b7b8a0','#6e8172','#6e9a92'],guild:['#8c8d90','#55586d','#696c8b'],carpenter:['#b18a59','#765a3c','#9a7852'],instrumentworks:['#b69d77','#755b43','#53777a'],archive:['#a09b88','#5e675d','#687d76'],chapel:['#b3a4a2','#746573','#6e7290'],cistern:['#97aba4','#536d72','#668893'],workshop:['#aa9672','#635b4b','#6f7777']};
export function bakeBuilding(plan,assets={},options={}){const p=plan.projection,unit=T*p.scale,b=p.bounds,pad=80,wall=64,roofLift=0,minX=b.minX*unit,minY=b.minY*unit,maxX=(b.maxX+1)*unit,maxY=(b.maxY+1)*unit,s=document.createElement('canvas');s.width=Math.ceil(maxX-minX+pad*2);s.height=Math.ceil(maxY-minY+pad*2+wall+roofLift);s.worldX=minX-pad-unit/2;s.worldY=minY-pad-wall-roofLift-unit/2;const c=s.getContext('2d');c.translate(-s.worldX,-s.worldY);const family=p.material,palette=COLORS[family]||COLORS.workshop,cells=new Set(p.cells.map(v=>v.join(','))),has=(x,y)=>cells.has(x+','+y);
 // Subterranean entrances expose an honest stair enclosure, not a false house over a tunnel.
 if(p.kind==='underground'){drawStairwell(c);s.roof=false;return s;}
 const atlas=assets.buildings,patches={home:[116,105,60,90],inn:[1280,125,65,90],clinic:[70,618,65,85],guild:[845,125,65,85],carpenter:[455,645,65,85],instrumentworks:[522,125,65,85]},patch=patches[family]||patches.guild;let shingles=paintedPattern(c,assets.architectureMaterials,/clinic|guild|archive|instrument|cistern/.test(family)?5:4,150);if(!shingles&&atlas){const tile=document.createElement('canvas');tile.width=32;tile.height=44;const tc=tile.getContext('2d');tc.drawImage(atlas,...patch,0,0,tile.width,tile.height);shingles=c.createPattern(tile,'repeat');}
 const rowCells=[...p.cells].sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
 // The shadow and masonry share the same outline; concave wings remain concave.
 c.save();c.beginPath();for(const [x,y]of rowCells)c.rect(x*unit+9,y*unit+9,unit+2,unit+2);c.fillStyle='#0b151b55';c.shadowColor='#09121b66';c.shadowBlur=options.compatibility?0:14;c.shadowOffsetX=5;c.shadowOffsetY=8;c.fill();c.restore();
 for(const [x,y]of rowCells){c.fillStyle=palette[0];c.fillRect(x*unit,y*unit-wall,unit+.6,unit+wall);}
 for(const [x,y]of rowCells){const px=x*unit,py=y*unit;if(!has(x,y+1)){const g=c.createLinearGradient(0,py-wall,0,py+unit);g.addColorStop(0,palette[0]);g.addColorStop(1,palette[1]);c.fillStyle=paintedPattern(c,assets.architectureMaterials,2,220)||g;c.fillRect(px,py+unit-wall,unit+.5,wall);const weather=c.createLinearGradient(0,py+unit-wall,0,py+unit);weather.addColorStop(0,'#5a493136');weather.addColorStop(.65,'#493d2908');weather.addColorStop(1,'#2b302b55');c.fillStyle=weather;c.fillRect(px,py+unit-wall,unit+.5,wall);c.fillStyle='#33403977';c.fillRect(px,py+unit-10,unit+.5,10);c.fillStyle='#d2c1a34d';c.fillRect(px,py+unit-11,unit+.5,2);c.strokeStyle='#2a252c55';c.lineWidth=1;}if(!has(x+1,y)){c.fillStyle=palette[1];c.fillRect(px+unit-3,py-wall,4,unit+wall);}}
 // A roof is painted as individual shaped tile strips, without stretching a facade image.
 for(const [x,y]of rowCells){const px=x*unit,py=y*unit-wall-roofLift;const g=c.createLinearGradient(minX,0,maxX,0);g.addColorStop(0,palette[2]);g.addColorStop(.47,palette[2]);g.addColorStop(.5,'#b5b39a');g.addColorStop(.54,palette[1]);g.addColorStop(1,palette[1]);c.fillStyle=shingles||g;c.fillRect(px,py,unit+.7,unit+.7);if(shingles){c.fillStyle='#5365602c';c.fillRect(px,py,unit+.7,unit+.7);}if(shingles){const shade=c.createLinearGradient(minX,0,maxX,0);shade.addColorStop(0,'#fff4d00a');shade.addColorStop(.5,'#fff4d022');shade.addColorStop(.52,'#111b2b33');shade.addColorStop(1,'#111b2b66');c.fillStyle=shade;c.fillRect(px,py,unit+.7,unit+.7);}// Fine global roof courses retain a consistent material scale across concave wings.
 c.save();c.beginPath();c.rect(px,py,unit+.7,unit+.7);c.clip();c.lineWidth=.65;const course=9;for(let yy=Math.floor(py/course)*course;yy<py+unit+course;yy+=course){c.strokeStyle='#182a3033';c.beginPath();c.moveTo(px,yy);c.lineTo(px+unit,yy);c.stroke();c.strokeStyle='#d8d6b71c';c.beginPath();c.moveTo(px,yy+1);c.lineTo(px+unit,yy+1);c.stroke();const offset=(Math.floor(yy/course)%2)*10;for(let xx=Math.floor((px-offset)/20)*20+offset;xx<px+unit;xx+=20){c.strokeStyle='#1c2c3028';c.beginPath();c.moveTo(xx,yy);c.lineTo(xx+2,yy+course);c.stroke();}}c.restore();c.strokeStyle='#d6cfab33';c.lineWidth=.7;c.beginPath();if(!shingles){for(let j=0;j<3;j++){const ty=py+j*unit/3;c.moveTo(px,ty);c.lineTo(px+unit,ty);}}c.stroke();for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]])if(!has(x+dx,y+dy)){c.strokeStyle=dy<0?'#d7c39b':'#2a3636';c.lineWidth=3;c.beginPath();if(dx){c.moveTo(px+(dx>0?unit:0),py);c.lineTo(px+(dx>0?unit:0),py+unit);}else{c.moveTo(px,py+(dy>0?unit:0));c.lineTo(px+unit,py+(dy>0?unit:0));}c.stroke();}}
 paintFacadeCraft(c,plan,assets,palette);
 // The entry follows the same transformed wall normal as the interior doorway.
 const frontY=unit-wall;for(const face of buildingDetailPlan(plan).frontages.filter(f=>f.cellY===0)){c.fillStyle='#202c3066';c.fillRect(face.x,frontY,face.w,9);c.fillStyle=paintedPattern(c,assets.architectureMaterials,3,180)||palette[1];c.fillRect(face.x,frontY-6,face.w,7);}
 const [dx,dy]=p.vector;c.save();c.translate(0,unit*.5);c.fillStyle='#263033';c.strokeStyle='#c6ad7a';c.lineWidth=3;if(dx){c.fillRect(-9,-26,18,34);c.strokeRect(-11,-28,22,38);}else{c.fillRect(-16,-58,32,64);c.strokeRect(-18,-60,36,68);}c.fillStyle='#d7bf85';c.fillRect(9,-25,3,4);if(atlas){c.save();c.beginPath();c.roundRect(-19,-57,38,62,[17,17,1,1]);c.clip();c.drawImage(atlas,153,335,95,122,-22,-61,44,69);c.restore();}c.restore();
 const roofCraft=roofCraftPlacement(plan),paintedRoof=roofCraft&&drawArchitecturePiece(c,assets,roofCraft.spec,roofCraft.x,roofCraft.y);
 if(!paintedRoof&&/home|inn|carpenter/.test(family)){const cx=(b.minX+(b.maxX-b.minX)*.7)*unit,cy=(b.minY+(b.maxY-b.minY)*.35)*unit-wall-roofLift,spec=architectureAccentSpec(family==='carpenter'?'copper-stovepipe':'brick-chimney',{width:22,height:34});if(!drawArchitectureAccent(c,assets.environmentArchitecture,spec,cx+7,cy+6)){c.fillStyle='#75645a';c.fillRect(cx,cy-23,14,29);c.fillStyle='#b5a28c';c.fillRect(cx-3,cy-26,20,7);c.fillStyle='#2c3134';c.fillRect(cx+2,cy-24,10,3);}}
 return s;}

/** Detail placement follows contiguous exposed wall runs of the true room outline. */
export function buildingDetailPlan(plan){
 const p=plan.projection,unit=T*p.scale,cells=new Set(p.cells.map(v=>v.join(','))),has=(x,y)=>cells.has(x+','+y),rows=new Map(),frontages=[];
 for(const [x,y]of p.cells)if(!has(x,y+1)){if(!rows.has(y))rows.set(y,[]);rows.get(y).push(x);}
 for(const [y,xs]of [...rows].sort((a,b)=>a[0]-b[0])){
  xs.sort((a,b)=>a-b);let left=xs[0],right=left;
  const add=()=>{const x=left*unit,w=(right-left+1)*unit,ground=(y+1)*unit,windows=[],posts=[],bayCount=Math.min(5,Math.max(0,Math.floor(w/42))),windowW=Math.max(15,Math.min(25,unit*1.3));
   for(let i=1;i<=bayCount;i++){const px=x+w*i/(bayCount+1);if(Math.abs(px)<31&&Math.abs(ground-unit)<22)continue;if(px-windowW/2>x+7&&px+windowW/2<x+w-7)windows.push({x:px,y:ground-23,w:windowW,h:29});}
   const postCount=Math.max(1,Math.round(w/54));for(let i=0;i<=postCount;i++){const px=x+w*i/postCount;if(Math.abs(px)<23&&Math.abs(ground-unit)<22)continue;posts.push(px);}
   frontages.push({x,y:ground-64,w,h:64,ground,cellY:y,cellLeft:left,cellRight:right,windows,posts,gable:/home|inn|carpenter|instrumentworks/.test(p.material)&&w>67?{x:x+w/2,y:ground-64,rise:Math.min(32,w*.17)}:null});};
  for(const x of xs.slice(1)){if(x===right+1)right=x;else{add();left=right=x;}}add();
 }
 return {unit,frontages,material:p.material,door:{x:0,y:unit*.5,width:44,height:65}};
}

const WINDOW_PATCHES={home:[195,263,46,63],inn:[1230,268,44,60],clinic:[104,654,45,62],guild:[866,329,45,67],instrumentworks:[575,203,52,66],carpenter:[195,263,46,63],archive:[866,329,45,67],chapel:[866,329,45,67]};
function paintFacadeCraft(c,plan,assets,palette){
 const detail=buildingDetailPlan(plan),family=detail.material,timber=/home|inn|carpenter|instrument|workshop/.test(family),stone=/guild|chapel|clinic|archive|cistern/.test(family),atlas=assets.buildings,windowPatch=WINDOW_PATCHES[family]||WINDOW_PATCHES.guild,image=assets.environmentArchitecture;let ivyPlaced=false,wallCraftPlaced=false;
 for(const f of detail.frontages){
  const {x,y,w,ground}=f;
  // Slightly varied lime wash and a raised masonry foot give a wall a body.
  c.save();const wash=c.createLinearGradient(x,y,x+w,ground);wash.addColorStop(0,stone?'#d1d1ba28':'#e8d5ac22');wash.addColorStop(.52,'#f2deaf08');wash.addColorStop(1,'#343c4330');c.fillStyle=wash;c.fillRect(x,y,w,64);
  c.fillStyle='#302e2b6b';c.fillRect(x,ground-13,w,13);c.fillStyle=stone?'#83928e':'#898473';c.fillRect(x+1,ground-12,w-2,9);c.strokeStyle='#333d4277';c.lineWidth=.8;for(let sx=x-20;sx<x+w;sx+=26){const xx=Math.max(x+1,sx),ww=Math.min(x+w-1,sx+25)-xx;if(ww>0){c.strokeRect(xx,ground-12,ww,9);c.fillStyle='#d4cfad3b';c.fillRect(xx+2,ground-11,Math.max(0,ww-4),1);}}
  // Eaves have an underside, fascia and highlight, rather than a single dark line.
  c.fillStyle='#14232a65';c.fillRect(x-3,y-2,w+6,9);c.fillStyle=palette[1];c.fillRect(x-5,y-7,w+10,6);c.fillStyle='#d7bf8e7a';c.fillRect(x-5,y-7,w+10,1.2);
  if(timber){
   for(const px of f.posts){c.fillStyle='#2f302c99';c.fillRect(px-3,y+3,6,50);c.fillStyle='#9b7e5488';c.fillRect(px-2,y+4,1.2,48);}
   c.strokeStyle='#514737aa';c.lineWidth=3.5;for(let i=0;i<f.posts.length-1;i++){const a=f.posts[i],b=f.posts[i+1];if(b-a<30)continue;c.beginPath();c.moveTo(a+4,y+9);c.lineTo(Math.min(a+20,b-5),y+25);c.moveTo(b-4,y+9);c.lineTo(Math.max(b-20,a+5),y+25);c.stroke();}
   c.fillStyle='#69563acc';c.fillRect(x,y+42,w,4);c.fillStyle='#c4a36b44';c.fillRect(x,y+42,w,1);
  }else if(stone){
   c.lineWidth=.6;c.strokeStyle='#4d5c5b2d';for(let yy=y+8;yy<ground-12;yy+=15){c.beginPath();c.moveTo(x+2,yy);c.lineTo(x+w-2,yy);c.stroke();const shift=(Math.floor(yy/15)%2)*17;for(let xx=x+shift;xx<x+w;xx+=34){c.beginPath();c.moveTo(xx,yy);c.lineTo(xx,yy+14);c.stroke();}}
  }
  for(const win of f.windows){
   const wx=win.x,wy=win.y,ww=win.w,hh=win.h;
   const bay=facadeBayPlacement(detail,f,win);
   if(bay&&drawArchitecturePiece(c,assets,bay.spec,bay.x,bay.y))continue;
   // The same authored window bay receives its complete painted frame and sill.
   // Roof, frontage, door and collision coordinates remain the original plan.
   if(drawArchitectureAccent(c,image,architectureAccentSpec(architectureWindowId(family),{width:ww+6,height:hh+7}),wx,wy+5))continue;
   c.fillStyle='#14222c99';c.fillRect(wx-ww/2-2,wy-hh+1,ww+4,hh+3);c.fillStyle='#5b5545';c.fillRect(wx-ww/2-1,wy-hh,ww+2,hh);
   if(atlas){c.drawImage(atlas,...windowPatch,wx-ww/2,wy-hh+1,ww,hh-1);}else{c.fillStyle='#cfab63';c.fillRect(wx-ww/2+2,wy-hh+3,ww-4,hh-5);c.fillStyle='#efcf8f';c.fillRect(wx-ww/2+4,wy-hh+5,ww*.32,hh-9);}
   c.strokeStyle='#cdb58caa';c.lineWidth=1.1;c.strokeRect(wx-ww/2,wy-hh,ww,hh);c.fillStyle=palette[1];c.fillRect(wx-1,wy-hh+1,2,hh-2);c.fillRect(wx-ww/2,wy-hh*.48,ww,1.5);
   c.fillStyle='#2b343b77';c.fillRect(wx-ww/2-5,wy+2,ww+10,4);c.fillStyle='#b3a282';c.fillRect(wx-ww/2-4,wy,ww+8,3);
   if(/home|inn|clinic/.test(family)){
    c.fillStyle='#564b33';c.fillRect(wx-ww/2-2,wy+4,ww+4,5);for(let i=0;i<5;i++){const px=wx-ww*.4+i*ww*.2;c.fillStyle=i%2?'#59774a':'#78894d';c.beginPath();c.ellipse(px,wy+3,3.6,2.4,i%2?.6:-.4,0,Math.PI*2);c.fill();if(i%2===0){c.fillStyle=family==='clinic'?'#d6d6b0':'#ca8e82';c.beginPath();c.arc(px+1,wy+1.5,1.7,0,Math.PI*2);c.fill();}}
   }
  }
  if(f.gable){const g=f.gable;c.fillStyle=stone?'#b0ada0':palette[0];c.beginPath();c.moveTo(x+2,y-4);c.lineTo(g.x,g.y-g.rise);c.lineTo(x+w-2,y-4);c.closePath();c.fill();
   c.strokeStyle='#342f2d';c.lineWidth=5;c.beginPath();c.moveTo(x-3,y-3);c.lineTo(g.x,g.y-g.rise-2);c.lineTo(x+w+3,y-3);c.stroke();c.strokeStyle='#ba9c6a';c.lineWidth=2;c.stroke();c.fillStyle='#66543d';c.fillRect(g.x-2,g.y-g.rise+4,4,g.rise-7);c.strokeStyle='#62513d';c.lineWidth=2;c.beginPath();c.moveTo(g.x-19,y-6);c.lineTo(g.x,y-g.rise+8);c.lineTo(g.x+19,y-6);c.stroke();
   const truss=gableCraftPlacement(detail,f),paintedTruss=truss&&drawArchitecturePiece(c,assets,truss.spec,truss.x,truss.y);
   if(!paintedTruss&&!drawArchitectureAccent(c,image,architectureAccentSpec('carved-gable-vent',{width:12,height:12}),g.x,y-5)){c.fillStyle='#3e4846';c.beginPath();c.ellipse(g.x,y-11,5,4,0,0,Math.PI*2);c.fill();c.strokeStyle='#c4ab7c';c.lineWidth=1;c.stroke();}
  }
  if(!wallCraftPlaced){const fitting=wallCraftPlacement(detail,f);if(fitting&&drawArchitecturePiece(c,assets,fitting.spec,fitting.x,fitting.y)){wallCraftPlaced=true;if(fitting.spec.id==='ivy-courtyard-pilaster')ivyPlaced=true;}}
  // One existing wallpost can carry ivy; clip it to that same exposed wall run
  // and keep its leaves away from the real doorway and existing window bays.
  if(!ivyPlaced&&/^(home|inn|carpenter)$/.test(family)){
   const post=f.posts.find(px=>(Math.abs(px)>31||Math.abs(ground-detail.unit)>22)&&!f.windows.some(win=>Math.abs(px-win.x)<win.w/2+14));
   if(post!==undefined){c.save();c.beginPath();c.rect(x,y+7,w,45);c.clip();const anchor=Math.max(x+10,Math.min(x+w-10,post+(post<x+w/2?7:-7)));ivyPlaced=drawArchitectureAccent(c,image,architectureAccentSpec('ivy-corner',{width:20,height:45}),anchor,ground-13,.9);c.restore();}
  }
  c.restore();
 }
 // A single small door light locates the entrance without hiding its real projection.
 if(detail.frontages.some(f=>f.cellY===0))for(const side of[-1,1]){const x=side*25,y=detail.unit*.5-27;c.save();const glow=c.createRadialGradient(x,y,1,x,y,15);glow.addColorStop(0,'#ffc57830');glow.addColorStop(1,'#ffc57800');c.fillStyle=glow;c.fillRect(x-15,y-15,30,30);if(!drawArchitectureAccent(c,image,architectureAccentSpec('wrought-lantern',{width:10,height:18}),x,y+7)){c.fillStyle='#3e3d31';c.fillRect(x-4,y-8,8,14);c.fillStyle='#edbb6d';c.fillRect(x-2,y-6,4,9);c.fillStyle='#524938';c.fillRect(x-5,y-9,10,3);c.fillRect(x-4,y+5,8,2);}c.restore();}
}
/** Reuse the established building bounds for the traveller and companions.
 * Followers affect only foreground opacity, never the real entrance label. */
export function buildingFadeAlpha(plan,state,followers=[]){
 const p=plan?.projection,xy=p?.outside,box=p?.bounds;if(!xy||!box)return 1;
 let near=false;for(const actor of [state,...followers]){if(!Number.isFinite(actor?.x)||!Number.isFinite(actor?.y))continue;const rx=actor.x-(xy[0]+.5),ry=actor.y-(xy[1]+.5);
  if(rx>=box.minX*p.scale-.5&&rx<=(box.maxX+1)*p.scale+.5&&ry>=box.minY*p.scale-1.2&&ry<=(box.maxY+1)*p.scale+.5)return .32;
  if(Math.hypot(rx,ry)<2)near=true;
 }
 return near?.66:1;
}
export function paintBuilding(renderer,plan,state){const c=renderer.ctx,p=plan.projection,art=plan.art,xy=p.outside,x=(xy[0]+.5)*T,y=(xy[1]+.5)*T,near=Math.hypot(state.x-(xy[0]+.5),state.y-(xy[1]+.5))<2;
 c.save();c.globalAlpha=buildingFadeAlpha(plan,state,renderer.followers||[]);c.drawImage(art,x+art.worldX,y+art.worldY);c.restore();if(near){c.strokeStyle='#e5cf9e';c.lineWidth=2;c.beginPath();c.ellipse(x,y+10,19,6,0,0,7);c.stroke();renderer.label(plan.exit.travel_label||p.style,x,y-60,true);}}

/** Both graphics modes retain the actual building footprint and entrance. These
 * small scene-entry canvases never read pixels or use CSS/canvas filters. */
export function prepareBuildingArt(plan,assets={},options={}){
 try{return bakeBuilding(plan,assets,options);}catch{return null;}
}
/** Direct geometry fallback when an offscreen canvas cannot be created. */
export function paintBuildingFallback(renderer,plan,state){
 const c=renderer.ctx,p=plan.projection,x=(p.outside[0]+.5)*T,y=(p.outside[1]+.5)*T,unit=p.scale*T;
 c.save();c.translate(x,y);c.globalAlpha*=buildingFadeAlpha(plan,state,renderer.followers||[]);
 if(p.kind==='underground')drawStairwell(c);
 else{
  const palette=COLORS[p.material]||COLORS.workshop;
  // Match the same concave roof and frontage; never substitute a whole unrelated house.
  for(const f of buildingDetailPlan(plan).frontages){c.fillStyle=palette[0];c.fillRect(f.x,f.y,f.w,f.h);c.fillStyle=palette[1];c.fillRect(f.x,f.ground-8,f.w,8);for(const win of f.windows){c.fillStyle='#263b3c';c.fillRect(win.x-win.w/2,win.y-win.h,win.w,win.h);c.fillStyle='#ddc391';c.fillRect(win.x-win.w/2+3,win.y-win.h+3,win.w-6,win.h-6);}}
  c.fillStyle=palette[2];for(const [cx,cy]of p.cells)c.fillRect(cx*unit,cy*unit-64,unit+.5,unit+.5);
  c.fillStyle='#192c30';c.fillRect(-17,unit*.5-57,34,61);c.strokeStyle='#b5a280';c.lineWidth=2;c.strokeRect(-18,unit*.5-58,36,63);
 }
 c.restore();
 if(Math.hypot(state.x-x/T,state.y-y/T)<2)renderer.label(plan.exit.travel_label||p.style,x,y-60,true);
}
