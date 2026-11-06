/** Ash & Aether environment art renderer for Three.js r150+.
 * Visually substantial, but intentionally not a gameplay/physics authority.
 * The renderer never replaces terrain, changes collisions, moves actors or awards loot.
 * It accepts authored scene plans and conservatively excludes canonical routes.
 */
import {ENVIRONMENT_PALETTES,planEnvironment,biomeFamily} from './environment-plan.mjs';
import {dressHouse,dressTower,dressDungeon} from './environment-detail-kit.mjs';
import {plantNativeField,attachSubtleWind} from './environment-vegetation.mjs';
import {MATERIAL_BY_ID} from './ground-materials.mjs';
import {generateGroundMaps} from './ground-synthesis.mjs';
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const hash=(a,b,s=71)=>{let n=Math.imul((a|0)^s,2654435761)^Math.imul(b|0,2246822519);n=Math.imul(n^(n>>>16),2246822519);return ((n^(n>>>13))>>>0)/4294967296;};
const rand=(seed,i)=>hash(seed,i,203);
const lerp=(a,b,t)=>a+(b-a)*t;
const rgba=(color)=>[(color>>16)&255,(color>>8)&255,color&255];

function makeTexture(THREE,palette,kind,{resolution=256,seed=15}={}){
 if(typeof document==='undefined'||!document.createElement)return null;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=resolution;
 const ctx=canvas.getContext('2d',{willReadFrequently:false});if(!ctx)return null;
 const c=rgba(palette[kind==='shingle'?'roof':kind==='timber'?'wood':(kind==='flagstone'||kind==='masonry')?'stone':kind==='soil'?'ground':'plaster']);
 ctx.fillStyle=`rgb(${c.join(',')})`;ctx.fillRect(0,0,resolution,resolution);
 const n=(x,y,i)=>hash(x,y,seed+i);
 if(kind==='masonry'||kind==='flagstone'||kind==='shingle'){
  const h=kind==='shingle'?19:kind==='masonry'?31:38,w=kind==='shingle'?46:kind==='masonry'?67:83;
  for(let row=0;row<=resolution/h;row++)for(let col=-1;col<=resolution/w+1;col++){
   const ox=(row%2)*w*.53+col*w,oy=row*h,shade=(n(col,row,2)-.5)*39;
   const cc=c.map(v=>clamp(Math.round(v+shade),0,255));
   ctx.fillStyle=`rgb(${cc.join(',')})`;ctx.fillRect(ox+1,oy+1,w-2,h-2);
   ctx.strokeStyle=kind==='shingle'?'rgba(25,18,19,.49)':'rgba(27,28,23,.4)';ctx.lineWidth=kind==='shingle'?1.6:2;
   ctx.strokeRect(ox+.6,oy+.7,w-1.5,h-1.6);
   if(kind==='shingle'){
    ctx.beginPath();ctx.moveTo(ox+w*.52,oy+h*.82);ctx.lineTo(ox+w*.53,oy+h);ctx.strokeStyle='rgba(239,216,182,.23)';ctx.stroke();
   }else if(n(col,row,4)>.66){ctx.beginPath();ctx.moveTo(ox+w*.14,oy+h*.36);ctx.lineTo(ox+w*.45,oy+h*.43);ctx.lineTo(ox+w*.62,oy+h*.77);ctx.lineWidth=.8;ctx.strokeStyle='rgba(31,31,25,.26)';ctx.stroke();}
   ctx.fillStyle='rgba(255,239,210,.1)';ctx.fillRect(ox+3,oy+3,w-7,1.3);
  }
 }else if(kind==='timber'){
  for(let i=0;i<24;i++){const x=i*12+rand(seed,i)*4;ctx.fillStyle=`rgba(${i%2?17:236},${i%2?15:213},${i%2?13:173},${.08+rand(seed,i+70)*.15})`;ctx.fillRect(x,0,1.4+rand(seed,i+50)*2,resolution);}
  for(let i=0;i<52;i++){const x=rand(i,seed)*resolution,y=rand(i+90,seed)*resolution;ctx.beginPath();ctx.ellipse(x,y,2+rand(i,1)*5,7+rand(i,2)*14,.03,0,TAU);ctx.strokeStyle='rgba(14,10,7,.15)';ctx.stroke();}
 }else if(kind==='soil'){
  // Ground breakup at multiple physical scales: mineral streaks, humus, embedded pebbles.
  for(let i=0;i<330;i++){const x=rand(i,seed)*resolution,y=rand(i+971,seed)*resolution;
   const r=2+rand(i+23,seed)*24;ctx.beginPath();ctx.ellipse(x,y,r,r*(.20+rand(i,991)*.6),rand(i,173)*TAU,0,TAU);
   ctx.fillStyle=i%3===0?'rgba(35,34,26,.10)':i%5===0?'rgba(199,188,157,.17)':'rgba(88,106,66,.11)';ctx.fill();
  }
  for(let i=0;i<220;i++){const x=rand(i+11,seed)*resolution,y=rand(i+12,seed)*resolution;
   ctx.beginPath();ctx.arc(x,y,.7+rand(i,19)*2.4,0,TAU);
   ctx.fillStyle=i%2?'rgba(204,193,157,.19)':'rgba(42,41,35,.24)';ctx.fill();
  }
 }else if(kind==='plaster'){
  for(let i=0;i<70;i++){const x=rand(i,seed)*resolution,y=rand(i+71,seed)*resolution,r=3+rand(i+83,seed)*19;
   ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=rand(i+52,seed)>.6?'rgba(242,217,162,.055)':'rgba(50,39,31,.045)';ctx.fill();}
  for(let i=0;i<11;i++){let x=rand(seed,i)*resolution,y=rand(i,seed+1)*resolution;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<4;j++){x+=(-.5+rand(i,j))*16;y+=8+rand(j,i)*10;ctx.lineTo(x,y);}ctx.strokeStyle='rgba(46,38,28,.16)';ctx.lineWidth=.8;ctx.stroke();}
 }
 for(let i=0;i<Math.round(resolution*resolution*.055);i++){
  const x=(rand(seed+i,17)*resolution)|0,y=(rand(seed+i,19)*resolution)|0,r=rand(i,seed)*1.3;
  ctx.fillStyle=rand(i,seed+17)>.5?'rgba(248,247,223,.08)':'rgba(20,21,17,.12)';ctx.fillRect(x,y,r+.4,r+.4);
 }
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=4;tex.needsUpdate=true;return tex;
}
function deformedRock(T,seed=1,r=1){const g=new T.IcosahedronGeometry(r,2),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),noise=.91+hash((x*100)|0,(z*110)|0,seed)*.17; p.setXYZ(i,x*noise,y*(.85+hash(i,seed)*.3),z*noise);}
 g.computeVertexNormals();return g;}
function mesh(T,g,m,pos,root,name=''){const o=new T.Mesh(g,m);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;o.name=name;root.add(o);return o;}
function box(T,parent,w,h,d,mat,x,y,z,name=''){return mesh(T,new T.BoxGeometry(w,h,d),mat,[x,y,z],parent,name);}
function beam(T,parent,a,b,r,mat,name=''){const A=new T.Vector3(...a),B=new T.Vector3(...b),d=B.clone().sub(A);if(d.length()<1e-6)return null;
 const o=mesh(T,new T.CylinderGeometry(r*.80,r,d.length(),7),mat,[0,0,0],parent,name);o.position.copy(A.clone().add(B).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
function cylinder(T,parent,r1,r2,h,mat,x,y,z,seg=10,name=''){return mesh(T,new T.CylinderGeometry(r1,r2,h,seg),mat,[x,y,z],parent,name);}
function archShape(T,w,h,doorWidth=1.28,doorHeight=2.24,window=true){
 const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h);s.lineTo(-w/2,h);s.closePath();
 const hole=new T.Path(),dx=doorWidth/2,arc=.39;
 hole.moveTo(-dx,-.07);hole.lineTo(-dx,doorHeight-arc);
 for(let j=0;j<=14;j++){const a=Math.PI-j*Math.PI/14;hole.lineTo(Math.cos(a)*dx,doorHeight-arc+Math.sin(a)*arc);}
 hole.lineTo(dx,-.07);hole.closePath();s.holes.push(hole);
 if(window&&w>4)for(const side of [-1,1]){
  const wx=side*w*.32,wy=h*.51,ww=.35,wh=.41,p=new T.Path();
  p.moveTo(wx-ww,wy-wh);p.lineTo(wx+ww,wy-wh);p.lineTo(wx+ww,wy+wh);
  p.quadraticCurveTo(wx,wy+wh+.22,wx-ww,wy+wh);p.closePath();s.holes.push(p);
 }
 return s;
}
function addArchMasonry(T,parent,material,x,y,z,w,h,face=1){
 for(let i=0;i<13;i++){const a=Math.PI-i*Math.PI/12,u=x+Math.cos(a)*w*.54,v=y+h-.36+Math.sin(a)*.44;
  const stone=box(T,parent,.15,.22,.25,material,u,v,z+face*.16,'radial-keystone');stone.rotation.z=-a+Math.PI/2;}
 for(const sign of [-1,1]){
  box(T,parent,.15,h-.42,.28,material,x+sign*w*.57,y+(h-.42)/2,z+face*.13,'door-jamb');
  box(T,parent,.27,.28,.37,material,x+sign*w*.58,y+.14,z+face*.15,'jamb-foot');
 }
}


function furnishInterior(T,parent,M,{width,depth,height,style='dwelling',mobile=false,seed=3}={}){
 // The entry aisle is empty by design. Every other object has a domestic or
 // craft function. No procedural random boxes occupying the room center.
 const passage=1.50;
 for(let i=0;i<8;i++){
  const z=-depth*.5+.25+i*(depth-.5)/8;
  for(let side of [-1,1]){
   const lx=side*(passage*.5+.65);
   box(T,parent,1.26,.032,depth/8-.065,M.wood,lx,.402,z,'fitted-worn-oak-floorboard');
  }
 }
 for(const side of [-1,1]){
  // Shoulder-height joinery gives the room architectural depth rather than
  // a featureless uninterrupted rectangular wall.
  box(T,parent,.14,.12,depth-.9,M.wood,side*(width*.5-.17),height*.42,0,'interior-dado-rail');
  for(let j=0;j<3;j++){
   const z=-depth*.28+j*depth*.25;
   box(T,parent,.20,1.20,.08,M.wood,side*(width*.5-.18),1.0,z,'vertical-interior-wainscot');
  }
 }
 // Hearth at the far wall, not in the traversal lane.
 const hearthX=-width*.28,hearthZ=-depth*.5+.55;
 box(T,parent,1.16,.23,.68,M.stone,hearthX,.51,hearthZ,'indoor-bread-hearth-plinth');
 box(T,parent,1.36,1.28,.22,M.stone,hearthX,1.15,-depth*.5+.15,'carved-mantel');
 const fire=mesh(T,new T.TetrahedronGeometry(.27,1),M.glow,[hearthX,.94,hearthZ],parent,'contained-domestic-hearth');fire.scale.set(.72,1,.6);
 box(T,parent,1.25,.17,.42,M.wood,hearthX,1.83,-depth*.5+.45,'hearth-mantel-shelf');
 // Workbench or resting nook tucked against the side wall.
 const furnitureX=width*.27;
 if(style==='workshop'){
  box(T,parent,.80,.14,1.52,M.wood,furnitureX,1.25,-depth*.23,'sturdy-craft-workbench');
  for(let i=0;i<3;i++){
   cylinder(T,parent,.065,.082,.36,M.metal,furnitureX-.22+i*.2,1.49,-depth*.23,8,'ordered-workshop-tools');
  }
  box(T,parent,.22,1.10,.75,M.wood,furnitureX,1.02,depth*.21,'repaired-tool-shelf');
 }else{
  box(T,parent,1.35,.19,.65,M.wood,furnitureX,.62,-depth*.22,'built-in-window-settle');
  for(const z of [-.46,.46])box(T,parent,.23,.53,.22,M.wood,furnitureX,.34,-depth*.22+z,'settle-support');
  box(T,parent,.96,.13,1.3,M.wood,furnitureX,.73,depth*.2,'domestic-table');
  cylinder(T,parent,.18,.18,.41,M.metal,furnitureX,.99,depth*.2,10,'lamp-bearing-candlestick');
  mesh(T,new T.SphereGeometry(.12,8,6),M.glow,[furnitureX,1.24,depth*.2],parent,'warm-lived-in-candle');
 }
 for(let k=0;k<2;k++){
  const x=sideValue(k,width),z=depth*.10+k*.85;
  cylinder(T,parent,.25,.33,.56,M.wood,x,.62,z,12,'coopered-storage-cask');
  for(const y of [.38,.76])cylinder(T,parent,.269,.269,.065,M.trim,x,y,z,12,'cask-binding-ring');
 }
 if(!mobile){
  // Exposed ceiling framing; architectural, not scene-filler objects.
  for(let i=0;i<3;i++){
   const z=-depth*.36+i*depth*.36;
   beam(T,parent,[-width*.47,height+.12,z],[width*.47,height+.12,z],.095,M.wood,'roof-interior-cross-tie');
  }
 }
}
function sideValue(k,width){return k?width*.34:-width*.32;}
function renderHouse(T,parent,M,{width=5.4,depth=5.3,height=3.4,seed=30,style='dwelling',mobile=false,quality='high',region='clay'}={}){
 const pale=M.plaster,stone=M.stone,wood=M.wood,roof=M.roof,trim=M.trim,glass=M.glass,metal=M.metal,glow=M.glow;
 // Hollow house shell; the only entry is a genuine geometry opening, not painted over solid wall.
 box(T,parent,width+.52,.32,depth+.55,stone,0,.09,0,'hewn-foundation');
 const front=mesh(T,new T.ExtrudeGeometry(archShape(T,width,height,1.3,2.35,true),{steps:1,depth:.2,bevelEnabled:false}),pale,[0,.26,depth*.5-.10],parent,'recessed-front-with-real-door-and-window-openings');
 front.material.side=T.DoubleSide;
 box(T,parent,width,.2,depth,pale,0,height+.25,0,'top-ceiling-frame');
 box(T,parent,width,.2,depth,stone,0,.29,0,'interior-floor-sill');
 for(const s of [-1,1])box(T,parent,.22,height,depth,pale,s*width*.5,.26+height/2,0,'side-masonry');
 box(T,parent,width,height,.21,pale,0,.26+height/2,-depth*.5,'back-masonry');
 // Inset carved wooden door: visually ajar and attached to the real arch hinge.
 const door=box(T,parent,1.04,1.93,.13,wood,-.64,1.22,depth*.5-.29,'hinged-real-threshold');door.rotation.y=-1.16;
 cylinder(T,parent,.051,.051,.075,metal,.21,1.32,depth*.5+.065,8,'hinge-stud').rotation.x=Math.PI/2;
 addArchMasonry(T,parent,trim,0,.22,depth*.5,1.3,2.34);
 for(const s of [-1,1]){
  const wx=s*width*.32,wy=.26+height*.51,wz=depth*.5+.025;
  box(T,parent,.68,.79,.045,glass,wx,wy,wz,'window-glass-with-recess');
  box(T,parent,.076,.91,.16,wood,wx,wy,wz+.10,'window-mullion');
  box(T,parent,.83,.07,.18,wood,wx,wy,wz+.12,'window-crossbar');
  box(T,parent,.96,.17,.31,stone,wx,wy-.47,wz+.08,'carved-window-sill');
  for(const q of [-1,1]){
   const shutter=box(T,parent,.33,.91,.10,wood,wx+q*.59,wy,wz+.11,'louvered-shutter');shutter.rotation.y=q*.28;
   for(let j=-2;j<=2;j++)box(T,parent,.25,.025,.018,trim,wx+q*.59,wy+j*.14,wz+.20,'shutter-slat');
  }
 }
 // Visible framework prevents 2D box silhouettes. Door-side brackets and studded beams read at game-camera scale.
 for(const sx of [-1,1]){
  box(T,parent,.19,height+.32,.26,wood,sx*width*.48,.26+height/2,depth*.5+.17,'structural-oak-post');
  box(T,parent,.16,height*.63,.22,wood,sx*width*.48,.26+height*.62,-depth*.5-.1,'rear-frame-post');
  beam(T,parent,[sx*width*.48,.86,depth*.5+.24],[sx*width*.26,2.25,depth*.5+.24],.082,wood,'diagonal-timber-brace');
 }
 box(T,parent,width+.25,.16,.26,wood,0,.26+height*.68,depth*.5+.16,'oak-wall-stringcourse');
 const rise=width*.43,len=Math.hypot(width/2+.38,rise),angle=Math.atan2(rise,width/2+.38);
 for(const s of [-1,1]){
  const top=box(T,parent,len,.21,depth+.81,roof,s*(width*.25+.13),height+.29+rise/2,0,'real-tiled-roof-slope');top.rotation.z=-s*angle;
  const eave=box(T,parent,.12,.17,depth+.98,wood,s*(width*.53),height+.24,0,'exposed-eave');eave.rotation.z=-s*angle;
  for(const end of [-1,1]){
   const p=box(T,parent,.17,.16,depth+.90,trim,s*width*.29,height+.29+rise*.42,0,'roof-brass-edge');p.rotation.z=-s*angle;
  }
 }
 cylinder(T,parent,.13,.13,depth+.94,trim,0,height+.29+rise,0,6,'roof-ridge');
 // Gable detailing and rainwater equipment are localized at the source building.
 if(!mobile){
  for(let i=0;i<4;i++){
   const z=-depth*.37+i*depth*.25;
   box(T,parent,.12,.18,.12,metal,-width*.54,height+.2,z,'copper-gutter-support');
  }
  const chimney=box(T,parent,.68,1.25,.65,stone,width*.31,height+rise*.65,depth*.05,'aged-chimney');
  box(T,parent,.91,.16,.88,trim,width*.31,height+rise*.65+.71,depth*.05,'chimney-capping');
  for(let i=0;i<3;i++)box(T,parent,.7,.05,.69,wood,width*.31,height+rise*.65-.2+i*.22,depth*.05,'masonry-course-shadow');
 }
 furnishInterior(T,parent,M,{width,depth,height,style,mobile,seed});
 // Foreground character-scale step with a clear centre line; planting never blocks the door.
 for(let i=0;i<3;i++){
  const w=1.7+i*.23,d=.38;
  box(T,parent,w,.15,d,stone,0,.13-i*.045,depth*.5+.25+i*.37,'door-step');
 }
 for(const sx of [-1,1]){
  const lantern=mesh(T,new T.SphereGeometry(.11,9,7),glow,[sx*1.16,2.08,depth*.5+.37],parent,'sconce-fire');
  box(T,parent,.18,.28,.22,metal,sx*1.16,2.07,depth*.5+.36,'sconce-housing');lantern.position.z+=.1;
  const bracket=box(T,parent,.14,.08,.44,metal,sx*1.16,2.27,depth*.5+.20,'sconce-bracket');
 }
 if(style==='workshop'){
  const sign=box(T,parent,1.1,.54,.06,wood,width*.25,2.47,depth*.5+.43,'guildwork-sign');sign.rotation.y=-.16;
  cylinder(T,parent,.32,.32,.12,metal,width*.25,2.47,depth*.5+.48,12,'workshop-device');
 }
 dressHouse(T,parent,M,{width,depth,height,seed,style,quality:mobile?'low':quality,region});
 return {kind:'house',doorClearWidth:1.30,doorClearHeight:2.35,structuralColumns:true};
}
function renderTower(T,parent,M,{height=7,seed=1,quality='high',region='clay'}={}){
 const r=1.55;
 cylinder(T,parent,r*1.18,r*1.23,.45,M.stone,0,.23,0,16,'tower-rock-plinth');
 cylinder(T,parent,r,r*1.12,height,M.plaster,0,.55+height/2,0,16,'stone-tower-body');
 for(let i=0;i<9;i++){
  const a=i*TAU/9;xForTower(T,parent,M,r,height,a,i);
 }
 cylinder(T,parent,r*1.22,r*1.18,.32,M.stone,0,height+.62,0,18,'machicolation-corbel');
 for(let j=0;j<12;j++){
  const a=j*TAU/12;box(T,parent,.50,.49,.43,M.stone,Math.cos(a)*1.72,height+1.06,Math.sin(a)*1.72,'battlement');
 }
 const roof=mesh(T,new T.ConeGeometry(2.0,2.7,16),M.roof,[0,height+2.35,0],parent,'seamed-belfry-roof');
 for(let i=0;i<8;i++){const a=TAU*i/8;beam(T,parent,[0,height+3.63,0],[Math.sin(a)*1.90,height+1.24,Math.cos(a)*1.90],.055,M.trim,'roof-seam');}
 dressTower(T,parent,M,{height,seed,quality,region});
 return roof;
}
function xForTower(T,parent,M,r,h,a,i){
 const x=Math.sin(a)*r,z=Math.cos(a)*r;
 if(i%2===0){const q=box(T,parent,.24,1.08,.15,M.deep,x,h*.57,z,'arrow-slit');q.rotation.y=a;}
 else {const q=box(T,parent,.35,.5,.15,M.glass,x,h*.72,z,'lantern-window');q.rotation.y=a;}
 for(let row=0;row<6;row++){
  const dot=box(T,parent,.37,.035,.10,M.trim,x,h*.14+row*1.0,z,'cut-masonry-stone-bed');dot.rotation.y=a;
 }
}
function renderWell(T,parent,M){
 cylinder(T,parent,1.45,1.6,.26,M.stone,0,.2,0,16,'worn-well-plinth');
 mesh(T,new T.CylinderGeometry(1.16,1.29,1.23,24,1,true),M.stone,[0,.79,0],parent,'real-hollow-masonry-well');
 cylinder(T,parent,.96,.96,.035,M.water,0,.88,0,24,'water-below-well-rim');
 const ring=mesh(T,new T.TorusGeometry(1.12,.17,10,32),M.trim,[0,1.43,0],parent,'worn-licked-well-rim');ring.rotation.x=Math.PI/2;
 for(const s of [-1,1]){cylinder(T,parent,.11,.15,2.5,M.wood,s*1.20,2.4,0,8,'well-roof-post');
  beam(T,parent,[s*1.14,3.74,0],[0,4.3,0],.12,M.wood,'wellspring-roof-arch');}
 const roof=box(T,parent,3.13,.14,1.72,M.roof,0,4.02,0,'small-ceramic-roof');roof.rotation.z=.08;
 cylinder(T,parent,.13,.13,2.5,M.wood,0,2.6,0,9,'wheel-axle').rotation.z=Math.PI/2;
 const wheel=mesh(T,new T.TorusGeometry(.39,.07,8,24),M.wood,[1.52,2.65,0],parent,'interactive-well-wheel');wheel.rotation.y=Math.PI/2;
 for(let i=0;i<4;i++){const a=i*TAU/4;beam(T,parent,[1.52,2.65,0],[1.52,2.65+Math.sin(a)*.35,Math.cos(a)*.35],.03,M.trim,'wheel-spoke');}
 return {kind:'well',source:'water-anchor'};
}
function renderThreshold(T,parent,M,{scale=1}={}){
 for(const sign of [-1,1]){
  const x=sign*1.85*scale;
  cylinder(T,parent,.37,.47,3.6*scale,M.stone,x,1.8*scale,0,10,'open-walkable-gate-pillar');
  cylinder(T,parent,.49,.49,.28,M.trim,x,3.59*scale,0,10,'gate-lintel-caps');
  for(let i=0;i<4;i++){const band=box(T,parent,.64,.09,.55,M.trim,x,.8+i*.75,0,'ash-and-aether-course');band.rotation.y=.04*i;}
 }
 const top=box(T,parent,4.48*scale,.6*scale,.78*scale,M.stone,0,3.84*scale,0,'keystoned-open-gateway');
 for(let i=0;i<7;i++){
  const v=(i-3)*.56;box(T,parent,.49*scale,.24*scale,.8*scale,M.trim,v*scale,4.22*scale,0,'voussoir-crown');
 }
 const symbol=mesh(T,new T.TorusGeometry(.53*scale,.071*scale,8,32),M.metal,[0,3.87*scale,.47*scale],parent,'threshold-crest');
 symbol.rotation.x=.06;
 // No mesh closes the open center: egress remains readable.
 return {kind:'threshold',clearWidth:3.0*scale};
}
function renderSanctuary(T,parent,M,{size=1}={}){
 // Ruined choir: symmetric composition and strongly shaped, readable negative space.
 cylinder(T,parent,3.5*size,3.55*size,.28,M.stone,0,.15,0,24,'radial-sanctuary-plinth');
 for(let i=0;i<7;i++){
  const a=TAU*i/7,rr=2.7*size,x=Math.cos(a)*rr,z=Math.sin(a)*rr,h=(i%3===0?4.5:3.5)*size;
  cylinder(T,parent,.30*size,.41*size,h,M.stone,x,h/2+.26,z,9,'mason-sculpted-choir-column');
  const cap=box(T,parent,.86*size,.18*size,.89*size,M.trim,x,h+.27,z,'chorister-capital');cap.rotation.y=a;
  if(i%2===1)beam(T,parent,[x,h-.6,z],[x*.58,h+1.15*size,z*.58],.18*size,M.stone,'flying-choir-buttress');
 }
 const altar=box(T,parent,1.9*size,.82*size,1.20*size,M.trim,0,.68*size,-.75*size,'story-bearing-altar');
 for(let i=0;i<5;i++){const a=TAU*i/5;const g=mesh(T,new T.OctahedronGeometry(.13*size,1),M.glow,[Math.cos(a)*.66*size,1.13*size,-.75*size+Math.sin(a)*.38*size],parent,'embedded-choral-mote');g.rotation.z=a;}
 return {kind:'sanctuary'};
}
function renderWorkshop(T,parent,M,options){
 renderHouse(T,parent,M,{...options,style:'workshop',width:6,depth:5.8});
 const canopy=box(T,parent,3.05,.14,2.4,M.wood,2,2.48,4.42,'forge-side-canopy');canopy.rotation.z=-.12;
 for(const x of [.8,3.1])cylinder(T,parent,.10,.15,2.25,M.wood,x,1.23,5.42,7,'smelter-outboard-post');
 const anvil=box(T,parent,.84,.3,.50,M.metal,-3.7,.86,2.8,'functional-anvil');anvil.rotation.z=.05;
 cylinder(T,parent,.36,.45,.8,M.wood,-3.7,.35,2.8,9,'anvil-stump');
 for(let i=0;i<5;i++){const g=mesh(T,new T.DodecahedronGeometry(.17+i*.012,0),M.deep,[-3.8+i*.32,.27,3.4],parent,'ordered-fuel-stock');g.rotation.set(i*.2,i*.4,0);}
}
function renderCamp(T,parent,M){
 const fire=cylinder(T,parent,.55,.72,.18,M.stone,0,.17,0,10,'contained-hearth');
 const glow=cylinder(T,parent,.23,.34,.30,M.glow,0,.45,0,8,'contained-hearth-glow');
 for(let i=0;i<8;i++){const a=TAU*i/8;const r=1.02;mesh(T,deformedRock(T,10+i,.17+i%3*.05),M.stone,[Math.cos(a)*r,.15,Math.sin(a)*r],parent,'purposeful-campfire-ring');}
 for(let s of [-1,1]){const bench=box(T,parent,2.0,.25,.5,M.wood,s*2.1,.42,0,'fireside-bench');bench.rotation.y=s*.13;}
 return {kind:'camp',fire,glow};
}

function renderBridge(T,parent,M,{length=7,width=3.6,seed=1}={}){
 // Slender traversable bridge carried by visibly arched masonry abutments.
 // Foundation never overwrites the host collision; middle remains uninterrupted.
 for(let i=0;i<6;i++){
  const z=(i-2.5)*(length/6),a=(z/length)*Math.PI;
  const floorHeight=.25+.35*(1-Math.abs(Math.sin(a)));
  const plank=box(T,parent,width+.25,.16,length/6+.08,M.wood,0,floorHeight,z,'bridge-carved-walk-deck');
  plank.rotation.x=(rand(seed,i)-.5)*.012;
 }
 for(const side of [-1,1]){
  for(let i=0;i<4;i++){
   const z=-length*.43+i*(length*.86/3),x=side*width*.51;
   cylinder(T,parent,.12,.17,1.35,M.wood,x,1.06,z,8,'bridge-rail-post');
   box(T,parent,.42,.16,.48,M.trim,x,1.78,z,'weathered-rail-cap');
  }
  const rail=beam(T,parent,[side*width*.51,1.63,-length*.49],[side*width*.51,1.63,length*.49],.10,M.wood,'continuous-bridge-guard-rail');
  const beamUnder=beam(T,parent,[side*width*.4,.20,-length*.46],[side*width*.4,-.23,0],.13,M.stone,'bridge-buttress-rib');
  beam(T,parent,[side*width*.4,-.23,0],[side*width*.4,.20,length*.46],.13,M.stone,'bridge-buttress-rib');
 }
 for(const z of [-length*.48,length*.48]){
  box(T,parent,width+.5,.43,.68,M.stone,0,.08,z,'bridge-grounded-landing');
 }
}
function renderGrove(T,parent,M,{seed=1,quality='high'}={}){
 // A sheltered narrative clearing, with shade and a deliberate open center.
 const low=quality==='low'||quality==='battery',treeN=low?2:4;
 for(let i=0;i<treeN;i++){
  const a=i*TAU/treeN+rand(seed,i)*.14,r=3.2+(i%2)*.8;
  drawTree(T,parent,M,{x:Math.sin(a)*r,z:Math.cos(a)*r,seed:seed+i*37,scale:.75+rand(seed,i+81)*.35,mobile:low,variant:i%4===0?'cypress':'broadleaf'});
 }
 for(let i=0;i<(low?4:11);i++){
  const a=i*TAU/11,r=1.8+rand(seed,i)*.8;
  const rock=mesh(T,deformedRock(T,i+seed,.17+rand(i,seed)*.21),M.stone,[Math.cos(a)*r,.09,Math.sin(a)*r],parent,'grounded-grove-stones');
  rock.scale.set(1,.4,.9);
 }
 const center=mesh(T,new T.TorusGeometry(.58,.06,8,32),M.trim,[0,.035,0],parent,'subtle-orchard-memory-ring');
 center.rotation.x=Math.PI/2;
}
function renderMemorial(T,parent,M,{seed=1}={}){
 const plinth=cylinder(T,parent,1.18,1.35,.28,M.stone,0,.17,0,12,'landmark-hewn-plinth');
 const stone=mesh(T,deformedRock(T,seed,1.07),M.stone,[0,1.18,0],parent,'landmark-unhewn-stone');
 stone.scale.set(.59,1.1,.37);
 for(let i=0;i<3;i++){
  const angle=TAU*i/3;
  const sigil=mesh(T,new T.TorusGeometry(.19,.026,6,18),M.trim,[Math.sin(angle)*.39,.96+i*.23,Math.cos(angle)*.35],parent,'landmark-carved-sigil');
  sigil.rotation.y=angle;
 }
 return plinth;
}
function renderMechanism(T,parent,M,form='memory-lens'){
 cylinder(T,parent,2,2.05,.22,M.stone,0,.11,0,18,'mechanism-grounded-dais');
 const bearing=cylinder(T,parent,1.13,1.3,.65,M.metal,0,.51,0,16,'machine-bearing');
 for(let i=0;i<8;i++){const a=i*TAU/8;box(T,parent,.21,.2,.34,M.trim,Math.cos(a)*1.25,.93,Math.sin(a)*1.25,'handcast-index-stop').rotation.y=a;}
 const ring=mesh(T,new T.TorusGeometry(1.18,.11,12,40),M.trim,[0,1.60,0],parent,`tactile-${form}-ring`);ring.rotation.x=Math.PI*.23;
 const spindle=cylinder(T,parent,.13,.18,2.5,M.wood,0,1.82,0,9,'real-mechanism-axle');
 const crystal=mesh(T,new T.OctahedronGeometry(.41,1),M.glow,[0,2.3,0],parent,`visible-${form}-response`);
 return {kind:'mechanism',ring,crystal,form};
}
function organicCrownGeometry(T,s){const g=new T.IcosahedronGeometry(1,2),p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const v=[p.getX(i),p.getY(i),p.getZ(i)],v2=.88+hash((v[0]*57)|0,(v[2]*87)|0,s)*.20;
  p.setXYZ(i,v[0]*v2,v[1]*v2*(.8+hash(i,s)*.23),v[2]*v2);
 }g.computeVertexNormals();return g;
}
function drawTree(T,parent,M,{x=0,y=0,z=0,seed=1,scale=1,variant='broadleaf',mobile=false}={}){
 const tree=new T.Group();tree.name=`authored-${variant}-tree`;tree.position.set(x,y,z);parent.add(tree);
 const leanX=(rand(seed,1)-.5)*.62*scale,leanZ=(rand(seed,2)-.5)*.6*scale, trunkH=3.1*scale*(.85+rand(seed,3)*.45);
 beam(T,tree,[0,0,0],[leanX,trunkH,leanZ],.26*scale,M.wood,'crooked-tapered-trunk');
 // Branched anatomical silhouette, not repeated triangular cones.
 const off=variant==='cypress'?.48:1.05;
 for(let i=0;i<3;i++){
  const a=TAU*(i/3+.07*rand(seed,23+i)),len=off*scale*(.8+rand(seed,i+9)*.4);
  const v=[leanX+len*Math.cos(a),trunkH*(.71+rand(seed,i+33)*.18),leanZ+len*Math.sin(a)];
  beam(T,tree,[leanX*.72,trunkH*.63,leanZ*.72],v,.10*scale,M.wood,'visible-natural-fork');
 }
 if(variant==='dead'){
  for(let i=0;i<2;i++){const a=TAU*(i/3+.1);beam(T,tree,[leanX*.85,trunkH*.85,leanZ*.85],[leanX+Math.cos(a)*scale*.7,trunkH*1.07,leanZ+Math.sin(a)*scale*.7],.07*scale,M.wood,'charred-canopy-snag');}
  return tree;
 }
 const palette=[M.leaf,M.leafDark,M.leafBright];const lobes=mobile?3:5;
 for(let i=0;i<lobes;i++){
  const a=TAU*(i/lobes+.09*rand(seed,i+2)),r=(i===0?.15:variant==='cypress'?.22:.76)*scale;
  const px=leanX+Math.cos(a)*r,pz=leanZ+Math.sin(a)*r,py=trunkH+(i%2?-.11:.45)*scale;
  const shape=mesh(T,organicCrownGeometry(T,seed+i),palette[i%3],[px,py,pz],tree,'irregular-leaved-canopy');
  shape.scale.set((variant==='cypress'?.67:1.05)*scale,(variant==='cypress'?1.45:0.79)*scale,(variant==='cypress'?.67:1.05)*scale);
 }
 // A root flare visibly connects trunk to soil.
 for(let i=0;i<3;i++){const a=TAU*i/3+.25;beam(T,tree,[0,.22*scale,0],[Math.cos(a)*.61*scale,-.025*scale,Math.sin(a)*.61*scale],.10*scale,M.wood,'buttress-root');}
 return tree;
}
function drawLandscape(T,parent,M,plan,p,opts){
 const g=new T.Group();g.name=p.id;g.position.set(p.x,opts.heightAt(p.x,p.z),p.z);parent.add(g);
 const n=opts.quality==='low'||opts.quality==='battery'?2:5;
 if(p.role==='trees'){
  for(let i=0;i<n;i++){
   const a=TAU*i/n+rand(p.seed,i),d=p.radius*(.29+rand(p.seed,i+11)*.36),dx=Math.cos(a)*d,dz=Math.sin(a)*d;
   const wx=p.x+dx,wz=p.z+dz;if(plan.hasClearRoute({x:wx,z:wz},.4)||plan.isProtectedSurface?.({x:wx,z:wz},.6)||opts.obstacleAt(wx,wz))continue;
   drawTree(T,g,M,{x:dx,y:opts.heightAt(wx,wz)-g.position.y,z:dz,seed:p.seed+i,scale:(.7+rand(i,p.seed)*.43)*opts.treeScale,variant:(plan.region==='ash'&&i%5===0?'dead':plan.region==='aether'&&i%3===0?'cypress':'broadleaf'),mobile:n===2});
  }
 }else if(p.role==='cinder-rocks'||p.role==='crystal-bush'){
  for(let i=0;i<n+2;i++){
   const a=TAU*i/(n+2),r=p.radius*(.35+rand(i,p.seed)*.58),dx=Math.sin(a)*r,dz=Math.cos(a)*r;
   if(plan.hasClearRoute({x:p.x+dx,z:p.z+dz},.4)||plan.isProtectedSurface?.({x:p.x+dx,z:p.z+dz},.6)||opts.obstacleAt(p.x+dx,p.z+dz))continue;
   const o=mesh(T,deformedRock(T,p.seed+i,.37+rand(p.seed,i+71)*.44),p.role==='crystal-bush'?M.glass:M.stone,[dx,.23,dz],g,'geological-seam');
   o.scale.set(1,.69,1.22);if(p.role==='crystal-bush')o.rotation.z=.35+rand(i,p.seed)*.65;
  }
 }else if(p.role==='reeds'||p.role==='flowers'||p.role==='planter'){
  if(p.role==='planter'){const b=cylinder(T,g,1.08,1.17,.7,M.stone,0,.32,0,14,'horticultural-stone-planter');cylinder(T,g,1,1,.09,M.soil,0,.69,0,14,'watered-topsoil');}
  for(let i=0;i<18*(n/2);i++){
   const a=rand(p.seed,i)*TAU,rr=Math.sqrt(rand(p.seed,i+51))*p.radius*.68;
   const x=Math.cos(a)*rr,z=Math.sin(a)*rr,h=.24+rand(p.seed,i+16)*.65;
   if(plan.hasClearRoute({x:p.x+x,z:p.z+z},.25)||plan.isProtectedSurface?.({x:p.x+x,z:p.z+z},.5)||opts.obstacleAt(p.x+x,p.z+z))continue;
   const twig=beam(T,g,[x,.07,z],[x+.08,h,z+.06],.026,M.wood,'seeded-flowering-stem');
   if(p.role!=='reeds')mesh(T,new T.TetrahedronGeometry(.09,0),i%3===0?M.glow:M.leafBright,[x,h,z],g,'small-native-flower');
  }
 }
 return g;
}
function drawWalkway(T,parent,M,route,{heightAt=()=>0,obstacleAt=()=>false,quality='high'}={}){
 // Polyline derives from authoritative doors and avoids protected building pads.
 // No tangent smoothing that could cut a corner back through a wall.
 const points=route.points?.length>1?route.points:[route.from,route.to];
 const spans=[],total=points.slice(1).reduce((sum,b,i)=>{const a=points[i],length=Math.hypot(b.x-a.x,b.z-a.z);spans.push({a,b,start:sum,end:sum+length});return sum+length;},0);
 if(total<.01)return null;
 const sample=t=>{const d=clamp(t,0,1)*total,seg=spans.find(q=>q.end>=d)||spans[spans.length-1];
  const u=clamp((d-seg.start)/(seg.end-seg.start||1),0,1),dx=seg.b.x-seg.a.x,dz=seg.b.z-seg.a.z,len=Math.hypot(dx,dz)||1;
  return {x:lerp(seg.a.x,seg.b.x,u),z:lerp(seg.a.z,seg.b.z,u),nx:-dz/len,nz:dx/len};};
 const steps=clamp(Math.ceil(total/.68),4,150),vertices=[],uvs=[],indices=[];
 for(let i=0;i<=steps;i++){
  const t=i/steps,p=sample(t),warp=Math.sin(t*Math.PI)*.065*Math.sin(t*9.7+route.id.length*.2);
  for(const side of [-1,1]){
   const xx=p.x+p.nx*(route.width*.5*side+warp),zz=p.z+p.nz*(route.width*.5*side+warp);
   vertices.push(xx,heightAt(xx,zz)+.07,zz);uvs.push((side+1)*.5,t*total/3.2);
  }
  if(i<steps){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
 const o=mesh(T,geo,M.walkway,[0,0,0],parent,'door-to-door-walkable-stone-road');o.castShadow=false;o.userData={visualOnly:true,collidable:false,routeId:route.id};
 // Only at its edges: mossy cobbles and threshold stones reveal the actual
 // route without placing jumbled rocks across the player's line of travel.
 const stride=quality==='low'||quality==='battery'?8:5;
 for(let i=1;i<steps;i+=stride){const t=i/steps,p=sample(t),side=i%2?1:-1,
  x=p.x+p.nx*route.width*.59*side,z=p.z+p.nz*route.width*.59*side;
  if(obstacleAt(x,z))continue;
  const stone=mesh(T,deformedRock(T,i+route.id.length,.15+.06*rand(i,6)),M.stone,[x,heightAt(x,z)+.075,z],parent,'actual-road-edge-cobble');stone.scale.set(1,.29,1.5);
 }
 return o;
}

/** Instanced ground ecology; thousands of actual curved leaf silhouettes in
 * only a few draw calls. No gameplay collider, no vegetation in doors or routes.
 * The host owns biomass and seasons; a supplied biomassAt is sampled directly.
 */

function renderDungeonIdentity(T,g,M,room,{w=10,d=12,low=false}={}){
 // Architectural grammar of each mechanism, not eight label variations of one box.
 // Side chambers stay readable and center line stays open to traverse.
 const f=room.form,reactive=[];
 if(f==='floodgate'){
  for(const side of [-1,1]){
   const x=side*(w*.37);
   box(T,g,.86,.10,d*.74,M.water,x,.09,0,'recessed-sluice-watercourse');
   for(let k=0;k<4;k++)box(T,g,.96,.23,.19,M.metal,x,.30,-d*.32+k*d*.21,'iron-sluice-grille');
   for(let k=0;k<3;k++)cylinder(T,g,.16,.16,.9,M.metal,x,1.65,-d*.22+k*1.45,8,'sluice-drive-rod').rotation.z=Math.PI/2;
  }
  reactive.push(mesh(T,new T.TorusGeometry(.64,.095,8,24),M.glass,[0,2.8,-d*.34],g,'reactive-floodgate-iris'));
 }else if(f==='resonance-lock'){
  for(const side of [-1,1])for(let i=0;i<5;i++){
   const x=side*(w*.5-.65),z=-d*.37+i*1.7;
   cylinder(T,g,.064,.064,1.15+i%3*.23,M.metal,x,2.55,z,10,'wall-resonance-chime');
   mesh(T,new T.TorusGeometry(.28+i*.08,.034,6,26),M.trim,[x,2.3,z],g,'acoustic-wavelet').rotation.y=Math.PI/2;
  }
  reactive.push(mesh(T,new T.TorusGeometry(1.45,.055,12,64),M.glow,[0,.18,0],g,'reactive-choral-floor-ring'));
  reactive[0].rotation.x=Math.PI/2;
 }else if(f==='counterweight'){
  for(const side of [-1,1]){
   const x=side*w*.37;
   const wheel=mesh(T,new T.TorusGeometry(.82,.12,9,26),M.metal,[x,4.65,-1],g,'load-bearing-counterweight-pulley');wheel.rotation.y=Math.PI/2;
   beam(T,g,[x,4.64,-1],[x,1.85,-1],.045,M.trim,'suspension-cord');
   cylinder(T,g,.40,.44,.95,M.stone,x,1.58,-1,12,'stone-hanging-counterweight');
   box(T,g,.85,.16,1.4,M.wood,x,.29,1.7,'counterweight-floor-cradle');
  }
  reactive.push(mesh(T,new T.TorusGeometry(.50,.09,10,28),M.glass,[0,3.8,-d*.31],g,'reactive-counterweight-sensor'));
 }else if(f==='heat-channel'){
  for(const side of [-1,1]){
   const x=side*w*.36;
   cylinder(T,g,.73,.86,1.25,M.stone,x,.70,-d*.22,12,'heat-exchanger-collar');
   const ember=mesh(T,new T.ConeGeometry(.36,.91,9),M.glow,[x,1.38,-d*.22],g,'furnace-vent-fire');ember.rotation.z=side*.06;
   for(let i=0;i<4;i++)box(T,g,.90,.10,.13,M.metal,x,.26,-d*.22+i*.49,'cast-iron-heat-grating');
  }
  reactive.push(mesh(T,new T.OctahedronGeometry(.55,1),M.glow,[0,2.8,-d*.4],g,'reactive-thermal-regulator'));
 }else if(f==='root-lattice'){
  for(const side of [-1,1])for(let i=0;i<(low?5:10);i++){
   const x=side*(w*.5-.12),z=-d*.42+i*(d*.84/(low?5:10)),h=1.0+(i%3)*1.22;
   const endX=side*(w*.5-.72);
   beam(T,g,[x,.10,z],[endX,h,z+.15],.052+.015*(i%3),M.wood,'anchored-living-root');
   mesh(T,new T.IcosahedronGeometry(.13,1),i%3?M.leaf:M.leafBright,[endX,h,z+.18],g,'roots-bloom-on-wall');
  }
  reactive.push(mesh(T,new T.IcosahedronGeometry(.43,2),M.leafBright,[0,2.86,-d*.38],g,'reactive-root-heart'));
 }else if(f==='wind-vane'){
  for(const side of [-1,1]){
   const hubX=side*(w*.39);
   const axle=cylinder(T,g,.11,.11,1.2,M.metal,hubX,3.6,-.4,12,'wind-engine-spindle');axle.rotation.z=Math.PI/2;
   for(let i=0;i<6;i++){
    const a=TAU*i/6;
    const blade=beam(T,g,[hubX,3.6,-.4],[hubX,3.6+Math.sin(a)*.83,-.4+Math.cos(a)*.83],.13,M.wood,'wind-engine-sail-rib');
   }
  }
  reactive.push(mesh(T,new T.OctahedronGeometry(.53,1),M.glass,[0,3.4,-d*.32],g,'reactive-airflow-heart'));
 }else if(f==='memory-lens'){
  for(let i=0;i<6;i++){
   const a=TAU*i/6;
   const r=2.9,z=Math.sin(a)*r,x=Math.cos(a)*r;
   const prism=mesh(T,new T.OctahedronGeometry(.32+i%2*.12,1),i%2?M.glass:M.trim,[x,2.1,z],g,'hanging-memory-prism');
   prism.rotation.y=a;
   beam(T,g,[x,4.25,z],[x,2.5,z],.023,M.metal,'memory-prism-suspension');
  }
  reactive.push(mesh(T,new T.TorusGeometry(1.12,.07,8,40),M.glass,[0,2.36,-d*.31],g,'reactive-memory-refraction'));
 }else { // pressure-bridge
  for(const side of [-1,1]){
   const x=side*w*.33;
   for(let i=0;i<7;i++){
    const z=-d*.37+i*d*.12;
    cylinder(T,g,.29,.39,.45,M.metal,x,.32,z,8,'hydraulic-piston-foot');
    beam(T,g,[x,.50,z],[x,1.4+(i%3)*.12,z],.055,M.trim,'pressure-piston-rod');
   }
   box(T,g,.72,.13,d*.84,M.wood,x,1.45,0,'suspended-pressure-manifold');
  }
  reactive.push(mesh(T,new T.TorusGeometry(.67,.075,8,30),M.glass,[0,2.8,-d*.31],g,'reactive-pressure-indicator'));
 }
 for(const o of reactive)o.userData={roomId:room.id,reactive:true,solved:false};
 return reactive;
}
/** The earlier 48-material Ground Forge is the visual source of truth for ground.
 * Material IDs come from the host's existing surface lookup when available;
 * never guesses or overwrites game movement, geology, saves, or collisions.
 */
const REGION_SOIL={ash:'ash-cinder',water:'water-silt',clay:'clay-loam',aether:'aether-shale'};
const REGION_WALK={ash:'ash-soot-cobble',water:'water-canal',clay:'clay-road',aether:'aether-marble'};
const REGION_PADS={ash:'ash-basalt',water:'water-limestone',clay:'clay-fieldstone',aether:'aether-cloudstone'};
export function groundMaterialFromWorld(surface,plan,x,z){
 const candidate=typeof surface==='string'?surface:surface?.materialId||surface?.material?.id||surface?.id;
 if(candidate&&MATERIAL_BY_ID[candidate])return candidate;
 const region=plan.region in REGION_SOIL?plan.region:'clay';
 if(plan.hasClearRoute?.({x,z},-.10))return REGION_WALK[region];
 if(plan.isProtectedSurface?.({x,z},-.18))return REGION_PADS[region];
 return REGION_SOIL[region];
}
function groundPBRMaps(T,plan,{quality='high',materialAt=null,assets=null}={}){
 if(!T.DataTexture||!T.RGBAFormat||!T.UnsignedByteType)return null;
 const b=plan.bounds,w=b.maxX-b.minX,h=b.maxZ-b.minZ;
 if(!(w>0&&h>0))return null;
 const resolution=quality==='ultra'?256:quality==='high'?192:quality==='medium'?144:96;
 const weatherAt=(x,z)=>{
  const s=materialAt?.(x,z),wet=clamp(Number(s?.moisture??s?.wetness)||0,0,1);
  return {rain:wet,moss:clamp(Number(s?.moss)||0,0,1),heat:clamp(Number(s?.heat)||0,0,1),age:clamp(Number(s?.wear)||.3,0,1)};
 };
 const maps=generateGroundMaps({
  seed:plan.id?.length*61+71,width:resolution,height:resolution,
  originX:(b.maxX+b.minX)/2,originZ:(b.maxZ+b.minZ)/2,metresX:w,metresZ:h,
  materialAt:(x,z)=>groundMaterialFromWorld(materialAt?.(x,z),plan,x,z),weatherAt,
 });
 const create=(pixels,colorspace)=>{
  const data=new Uint8Array(pixels),texture=new T.DataTexture(data,resolution,resolution,T.RGBAFormat,T.UnsignedByteType);
  texture.needsUpdate=true;texture.generateMipmaps=true;
  if(T.LinearMipmapLinearFilter)texture.minFilter=T.LinearMipmapLinearFilter;
  if(T.LinearFilter)texture.magFilter=T.LinearFilter;
  if(T.ClampToEdgeWrapping){texture.wrapS=T.ClampToEdgeWrapping;texture.wrapT=T.ClampToEdgeWrapping;}
  texture.anisotropy=4;
  if(colorspace&&T.SRGBColorSpace)texture.colorSpace=T.SRGBColorSpace;
  assets?.textures?.push(texture);return texture;
 };
 return {map:create(maps.albedo,true),normalMap:create(maps.normal,false),roughnessMap:create(maps.roughness,false),resolution};
}
/** Replacement visual skin only. Geometry samples the SAME heightAt as collision.
 * Use only when the host hides its old flat ground visual, not its floor collider.
 */
function drawTerrainSkin(T,parent,M,plan,{heightAt=()=>0,quality='high',materialAt=null,assets=null}={}){
 if(!T.BufferGeometry||!T.Color)return null;
 const b=plan.bounds,low=quality==='low'||quality==='battery',nx=low?28:56,nz=low?28:56;
 const verts=[],uv=[],colors=[],indices=[];
 const baseColors={ash:[0x65594e,0x786960,0x5a5950],water:[0x547a6c,0x748578,0x577b81],clay:[0x687e58,0x827e60,0x737e62],aether:[0x5c687e,0x6f8b89,0x788296]};
 const C=baseColors[plan.region]||baseColors.clay;
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
  const x=b.minX+(b.maxX-b.minX)*i/nx,z=b.minZ+(b.maxZ-b.minZ)*j/nz;
  verts.push(x,heightAt(x,z)+.015,z);uv.push(i/nx,j/nz);
  // Stable continuous world-space rock/silt/humus colour; no randomly assigned
  // rectangular material patches. Host moisture/heat/wear alter the same surface.
  const warp=(hash(Math.floor(x*.17),Math.floor(z*.14),103)-.5)*3.7;
  const coarse=hash(Math.floor((x+warp)*.32),Math.floor((z-warp)*.29),82),
   medium=hash(Math.floor((x+warp)*1.04),Math.floor((z-warp)*.92),102);
  const n=.65*coarse+.35*medium;
  const q=rgba(C[0]),r=rgba(C[1]),t=rgba(C[2]);
  const blend=clamp((n-.21)*1.45,0,1),other=clamp((medium-.50)*1.45,0,1);
  let rr=(q[0]*(1-blend)+r[0]*blend)*(1-other*.22)+t[0]*other*.22,
      gg=(q[1]*(1-blend)+r[1]*blend)*(1-other*.22)+t[1]*other*.22,
      bb=(q[2]*(1-blend)+r[2]*blend)*(1-other*.22)+t[2]*other*.22;
  const surface=materialAt?.(x,z)||null;
  const moisture=clamp(Number(surface?.moisture??surface?.wetness)||0,0,1);
  const heat=clamp(Number(surface?.heat)||0,0,1),wear=clamp(Number(surface?.wear)||0,0,1);
  const dark=1-.26*moisture-.18*heat-.09*wear;
  rr*=dark;gg*=dark*(1-.10*heat);bb*=dark*(1+.04*moisture);
  const jitter=.96+hash(i,j,92)*.08;
  colors.push(clamp(rr*jitter/255,0,1),clamp(gg*jitter/255,0,1),clamp(bb*jitter/255,0,1));
  if(i<nx&&j<nz){const k=j*(nx+1)+i;indices.push(k,k+nx+1,k+1,k+1,k+nx+1,k+nx+2);}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(verts,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const pbr=groundPBRMaps(T,plan,{quality,materialAt,assets});
 const options={color:0xffffff,vertexColors:!pbr,roughness:1,side:T.DoubleSide,
  map:pbr?.map||M.soil.map||null};
 if(pbr){options.normalMap=pbr.normalMap;options.roughnessMap=pbr.roughnessMap;
  if(T.Vector2)options.normalScale=new T.Vector2(.7,.7);}
 const material=new T.MeshStandardMaterial(options);
 const floor=mesh(T,geometry,material,[0,0,0],parent,'terrain-skin-following-actual-collision-height');floor.castShadow=false;
 floor.userData={visualOnly:true,collidable:false,source:'host-heightAt',groundForge:!!pbr,groundResolution:pbr?.resolution||0};
 return {floor,material};
}

/** Host-safe static mesh batching. Bakes each static mesh's world matrix and
 * concatenates geometry by material, preserving separate moving/interactive
 * pieces and the already instanced grass. No imported addon dependency.
 * Falls back without changes if the host Three implementation lacks facilities.
 */
export function batchEnvironmentGeometry(T,root,{enabled=true,maxMergedVertices=180000}={}){
 const empty={sourceMeshes:0,batches:0,removedDrawCalls:0,sourceVertices:0,retainedDynamic:0,interiorRoofBatches:0};
 if(!enabled||!root?.updateMatrixWorld||!T?.BufferGeometry||!T?.Float32BufferAttribute)return empty;
 root.updateMatrixWorld(true);
 const byMaterial=new Map();let sourceMeshes=0,sourceVertices=0,retainedDynamic=0;
 const dynamic=/visible-.*-response|interactive-|door-step|hinged-real-threshold|sconce-fire|key-light-emitter|furnace-wall-sconce|contained-hearth-glow/;
 const roofNames=/roof|ridge|gable|dormer|eave|chimney|finial/;
 root.traverse(o=>{
  if(!o.isMesh)return;
  if(o.isInstancedMesh||o.material?.transparent||o.userData?.retainMesh||o.userData?.reactive||dynamic.test(o.name||'')){retainedDynamic++;return;}
  if(!o.geometry?.attributes?.position||!o.geometry?.clone||!o.geometry.attributes.position.count)return;
  const mat=o.material;if(!mat||Array.isArray(mat))return;
  let parent=root,anchorId=null;
  if(roofNames.test(o.name||'')){
   for(let cur=o.parent;cur&&cur!==root;cur=cur.parent){
    if(cur.userData?.anchorId){parent=cur;anchorId=cur.userData.anchorId;break;}
   }
  }
  let buckets=byMaterial.get(mat);if(!buckets){buckets=new Map();byMaterial.set(mat,buckets);}
  let bucket=buckets.get(parent);if(!bucket){bucket={parent,anchorId,material:mat,meshes:[]};buckets.set(parent,bucket);}
  bucket.meshes.push(o);sourceMeshes++;sourceVertices+=o.geometry.attributes.position.count;
 });
 if(sourceMeshes<12)return {...empty,sourceMeshes,sourceVertices,retainedDynamic};
 let batches=0,removed=0,interiorRoofBatches=0;
 for(const buckets of byMaterial.values())for(const {parent,anchorId,material,meshes} of buckets.values()){
  const parentInverse=parent.matrixWorld?.clone?parent.matrixWorld.clone().invert():null;
  let chunks=[],vertexTotal=0;
  const flush=()=>{
   if(chunks.length<2){chunks=[];vertexTotal=0;return;}
   const verts=new Float32Array(vertexTotal*3),norms=new Float32Array(vertexTotal*3),uvs=new Float32Array(vertexTotal*2);
   let vpos=0,npos=0,upos=0;
   for(const c of chunks){verts.set(c.position,vpos);norms.set(c.normal,npos);uvs.set(c.uv,upos);
    vpos+=c.position.length;npos+=c.normal.length;upos+=c.uv.length;}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));
   geo.setAttribute('normal',new T.Float32BufferAttribute(norms,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
   geo.computeBoundingBox?.();geo.computeBoundingSphere?.();
   const combined=new T.Mesh(geo,material);
   combined.name=anchorId?'roof-open-interior-batch':'merged-static-environment-batch';
   combined.castShadow=true;combined.receiveShadow=true;
   combined.userData={visualOnly:true,collidable:false,batching:'static-by-material',roofForAnchor:anchorId};
   parent.add(combined);batches++;if(anchorId)interiorRoofBatches++;removed+=chunks.length;
   for(const c of chunks){c.source.parent?.remove(c.source);c.source.geometry.dispose();}
   chunks=[];vertexTotal=0;
  };
  for(const o of meshes){
   let geo=o.geometry.clone();
   const transform=parentInverse?.clone&&o.matrixWorld?.clone?parentInverse.clone().multiply(o.matrixWorld):o.matrixWorld;
   if(transform)geo.applyMatrix4(transform);
   if(geo.index){const expanded=geo.toNonIndexed();if(expanded!==geo)geo.dispose();geo=expanded;}
   const p=geo.getAttribute('position');if(!p?.count){geo.dispose();continue;}
   if(vertexTotal+p.count>maxMergedVertices)flush();
   if(p.count>maxMergedVertices){geo.dispose();continue;}
   let n=geo.getAttribute('normal');if(!n){geo.computeVertexNormals();n=geo.getAttribute('normal');}
   const uv=geo.getAttribute('uv');
   chunks.push({source:o,position:Float32Array.from(p.array),normal:n?Float32Array.from(n.array):new Float32Array(p.count*3),uv:uv?Float32Array.from(uv.array):new Float32Array(p.count*2)});
   vertexTotal+=p.count;geo.dispose();
  }
  flush();
 }
 return {sourceMeshes,batches,removedDrawCalls:removed-batches,sourceVertices,retainedDynamic,interiorRoofBatches};
}

function makeMaterials(T,palette,{quality='high',seed=1}={}){
 const textures=[];const low=quality==='low'||quality==='battery';
 const mat=(col,rough=.85,metal=.0,tag)=>{
  const options={color:col,roughness:rough,metalness:metal};
  if(tag){const map=makeTexture(T,palette,tag,{resolution:low?128:quality==='ultra'?512:256,seed});if(map){textures.push(map);options.map=map;options.color=0xffffff;}}
  return new T.MeshStandardMaterial(options);
 };
 const M={
  stone:mat(palette.stone,.94,0,'flagstone'),plaster:mat(palette.plaster,.93,0,'plaster'),wood:mat(palette.wood,.86,0,'timber'),roof:mat(palette.roof,.85,.01,'shingle'),
  trim:mat(palette.metal,.53,.31),metal:mat(palette.metal,.47,.63),deep:mat(palette.deep,.95),soil:mat(palette.ground,.99,0,'soil'),walkway:mat(palette.ground,.97,0,'masonry'),
  leaf:mat(palette.foliage,.96),leafDark:mat((palette.foliage&0xfefefe)-0x131108,.98),leafBright:mat(palette.leaf,.91),
  water:new T.MeshStandardMaterial({color:palette.water,roughness:.16,metalness:.12,transparent:true,opacity:.84,side:T.DoubleSide,depthWrite:false}),
  glass:new T.MeshStandardMaterial({color:palette.accent,roughness:.25,metalness:.24,emissive:palette.accent,emissiveIntensity:.21,transparent:true,opacity:.94}),
  glow:new T.MeshStandardMaterial({color:palette.accent,roughness:.22,emissive:palette.accent,emissiveIntensity:1.18}),
  grass:new T.MeshStandardMaterial({color:0xffffff,roughness:.92,metalness:0,side:T.DoubleSide})
 };
 M.leaf.side=M.leafDark.side=M.leafBright.side=T.DoubleSide;
 if(quality!=='battery')attachSubtleWind(M.grass,{strength:quality==='low'?.085:.15});
 return {M,textures,materials:Object.values(M)};
}
/** Scene-owned renderer: call build once when changing level and tick every animation frame.
 * Existing world geometry, movement, physics and save ownership remain in the game.
 */
export function createEnvironmentRenderer({THREE,scene,heightAt=()=>0,obstacleAt=()=>false,pathAt=()=>0,quality='high',biomassAt=null,materialAt=null,batchStatic=true,maxLights=3,namespace='aa-environment-5.37',lightingMode='host-owned'}={}){
 if(!THREE||!scene?.add||!scene?.remove)throw new Error('THREE and scene with add/remove are required');
 const root=new THREE.Group();root.name=namespace;scene.add(root);
 let built=null,disposed=false,assets=null,lamps=[],animated=[],lastKind='',surfaceMaterial=null,grassCount=0,plantSpecies={},batchMetrics=null;
 const settings={quality,obstacleAt,heightAt,materialAt,treeScale:1};
 const clear=()=>{
  if(!built&&!root.children.length&&!assets)return;root.traverse(o=>{if(o.geometry?.dispose)o.geometry.dispose();if(o.isInstancedMesh)o.dispose?.();});
  for(const l of lamps)l.dispose?.();lamps=[];
  if(assets){for(const t of assets.textures)t.dispose();for(const m of assets.materials)m.dispose();assets=null;}
  surfaceMaterial?.dispose();surfaceMaterial=null;root.clear();animated=[];built=null;lastKind='';grassCount=0;plantSpecies={};batchMetrics=null;
 };
 const place=(base,p,angle=0)=>{const group=new THREE.Group();group.name=p.id||'authored-cluster';group.position.set(p.x,heightAt(p.x,p.z),p.z);group.rotation.y=angle;root.add(group);return group;};
 const illuminate=(g,plan)=>{
  if(lightingMode==='host-owned')return;
  const selected=plan.lighting.slice(0,maxLights);
  for(const q of selected){const light=new THREE.PointLight(plan.region==='aether'?0x8cfff0:0xffc588,plan.region==='ash'?1.8:1.35,11,2);
   light.position.set(q.x,heightAt(q.x,q.z)+2.6,q.z);root.add(light);lamps.push(light);}
 };
 const draw=(layout,opts={})=>{
  if(disposed)throw Error('Environment renderer already disposed');clear();
  const plan=layout?.placements&&layout?.walkways?layout:planEnvironment(layout,{region:opts.region||'clay',quality:opts.quality||quality,obstacleAt,pathAt,excludeExistingArchitecture:opts.excludeExistingArchitecture||false});
  const palette=ENVIRONMENT_PALETTES[plan.region]||ENVIRONMENT_PALETTES.clay;
  assets=makeMaterials(THREE,palette,{quality:opts.quality||quality,seed:layout?.id?.length||1});const M=assets.M;
  if(opts.surfaceMode==='replace-flat')surfaceMaterial=drawTerrainSkin(THREE,root,M,plan,{heightAt,quality:opts.quality||quality,materialAt:opts.materialAt||materialAt,assets})?.material||null;
  // Route geometry belongs only to the visual layer and follows authoritative ground heights.
  for(const w of plan.walkways)drawWalkway(THREE,root,M,w,{heightAt,obstacleAt,quality:opts.quality||quality});
  for(const p of plan.placements){
   // The host collider can already include an intended building; authored anchors are the authority.
   const g=place(root,p,p.rotation);const role=p.role;g.userData={visualOnly:true,anchorId:p.anchorId,role,entrance:p.entrance};
   if(role==='dwelling')renderHouse(THREE,g,M,{width:4.6+Math.min(1,p.importance||0)*.8,seed:p.id.length,mobile:(opts.quality||quality)==='low',quality:opts.quality||quality,region:plan.region});
   else if(role==='workshop')renderWorkshop(THREE,g,M,{seed:p.id.length,mobile:(opts.quality||quality)==='low',quality:opts.quality||quality,region:plan.region});
   else if(role==='tower')renderTower(THREE,g,M,{height:6.2+Math.min(2,p.importance||0)*1.1,quality:opts.quality||quality,region:plan.region});
   else if(role==='threshold')renderThreshold(THREE,g,M,{scale:p.scale});
   else if(role==='bridge')renderBridge(THREE,g,M,{seed:p.id.length});
   else if(role==='well')renderWell(THREE,g,M);
   else if(role==='sanctuary')renderSanctuary(THREE,g,M,{size:p.scale});
   else if(role==='camp')renderCamp(THREE,g,M);
   else if(role==='grove')renderGrove(THREE,g,M,{seed:p.id.length,quality:opts.quality||quality});
   else if(role==='mechanism')renderMechanism(THREE,g,M,role);
   else renderMemorial(THREE,g,M,{seed:p.id.length});
  }
  for(const p of plan.landscapes)drawLandscape(THREE,root,M,plan,p,{...settings,quality:opts.quality||quality});
  const growth=plantNativeField(THREE,root,M,plan,{...settings,quality:opts.quality||quality,materialAt:opts.materialAt||materialAt,biomassAt:opts.biomassAt||biomassAt,seed:plan.id.length+plan.placements.length*71});
  grassCount=growth.instances;plantSpecies=growth.bySpecies;
  illuminate(root,plan);batchMetrics=batchEnvironmentGeometry(THREE,root,{enabled:opts.batchStatic??batchStatic});built=plan;lastKind=plan.kind;return {plan,stats:()=>renderer.stats()};
 };
 // Dungeon rooms are constructed as readable connected spatial sequences, never as UI cards.
 const drawDungeon=(dungeon,{roomWidth=10,roomDepth=12,originX=0,originZ=0,groundY=0,region='ash',activeOnly=false,activeIndex=0,solvedRoomIds=[]}={})=>{
  if(disposed)throw Error('Environment renderer already disposed');clear();
  const family=biomeFamily(region||dungeon.region);assets=makeMaterials(THREE,ENVIRONMENT_PALETTES[family]||ENVIRONMENT_PALETTES.ash,{quality,seed:dungeon.id?.length||23});const M=assets.M;
  const rooms=activeOnly?[dungeon.rooms[activeIndex]].filter(Boolean):dungeon.rooms;
  for(const room of rooms){
   const x=originX,z=originZ+(activeOnly?0:room.index*roomDepth);
   const g=new THREE.Group();g.position.set(x,groundY,z);g.name=`architected:${room.id}`;g.userData={roomId:room.id,phase:room.phase,form:room.form};root.add(g);
   const w=roomWidth,h=5.8,d=roomDepth;
   box(THREE,g,w,.48,d,M.stone,0,-.2,0,'continuous-carved-dungeon-floor');
   // True mortar seams, different sized stones and worn middle aisle.
   for(let rz=0;rz<Math.ceil(d/1.18);rz++)for(let rx=0;rx<Math.ceil(w/1.32);rx++){
    const px=-w/2+.72+rx*1.33+(rz%2)*.28,pz=-d/2+.61+rz*1.19;
    if(Math.abs(px)>w/2-.2)continue;
    const tile=box(THREE,g,1.23,.05,1.10,rz%5===0?M.trim:M.stone,px,.055,pz,'laid-stone-not-flat-plane');tile.rotation.y=(hash(rx,rz,7)-.5)*.025;
   }
   for(const sign of [-1,1]){
    box(THREE,g,.48,h,d,M.plaster,sign*w/2,h/2,0,'massive-buttressed-side-wall');
    for(let k=0;k<4;k++){
     const zz=-d/2+1.1+k*(d-2.2)/3;
     box(THREE,g,.65,h*.72,.8,M.stone,sign*(w/2-.22),h*.36,zz,'engaged-gothic-column');
     box(THREE,g,.90,.3,1.02,M.trim,sign*(w/2-.22),h*.78,zz,'sculpted-column-capital');
     beam(THREE,g,[sign*(w/2-.35),h*.77,zz],[0,h+1.12,zz],.20,M.stone,'arched-vault-rib');
    }
   }
   // Two portals remain visibly open across adjoining rooms.
   for(const side of [-1,1]){
    const zw=side*d/2,front=mesh(THREE,new THREE.ExtrudeGeometry(archShape(THREE,w,h,2.32,3.25,false),{depth:.42,bevelEnabled:false}),M.plaster,[0,0,zw-.20],g,'through-arch-not-solid-wall');
    addArchMasonry(THREE,g,M.trim,0,0,zw,2.32,3.25,side);
   }
   // Heavy side vault panels support the ceiling; keep top open for third-person camera.
   for(let j=0;j<4;j++){const zz=-d/2+1+j*3.2;
    for(let s of [-1,1])beam(THREE,g,[s*(w/2-.48),h*.86,zz],[s*(w/4),h+1.15,zz],.17,M.trim,'structural-springing-vault');
   }
   const mech=new THREE.Group();mech.name=`mechanism:${room.form}`;mech.position.set(0,.10,0);g.add(mech);
   const response=renderMechanism(THREE,mech,M,room.form);response.crystal.userData={roomId:room.id,condition:room.visibleState.after};
   renderDungeonIdentity(THREE,g,M,room,{w,d,low:quality==='low'||quality==='battery'});
   dressDungeon(THREE,g,M,room,{width:w,depth:d,height:h,quality,region:family});
   const keyLight=mesh(THREE,new THREE.SphereGeometry(.23,10,8),M.glow,[0,3.5,-d/2+1.4],g,'key-light-emitter');animated.push(keyLight);
   for(const side of [-1,1]){
    const light=mesh(THREE,new THREE.IcosahedronGeometry(.2,1),M.glow,[side*(w/2-.65),2.9,-1],g,'furnace-wall-sconce');animated.push(light);
    box(THREE,g,.22,.35,.27,M.metal,side*(w/2-.65),2.85,-1,'iron-sconce-housing');
   }
  }
  batchMetrics=batchEnvironmentGeometry(THREE,root,{enabled:batchStatic});
  for(const id of solvedRoomIds)if(rooms.some(r=>r.id===id)){
    root.traverse(o=>{if(o.userData?.roomId===id&&(o.userData?.reactive||o.name.includes('response'))){o.scale.set(1.42,.82,1.42);o.rotation.y+=.34;o.userData.solved=true;}});
  }
  built={id:dungeon.id,kind:'dungeon',region:family,rooms:rooms.length};lastKind='dungeon';return {rooms:rooms.length};
 };
 const revealInterior=(anchorId,inside)=>{
  if(!built||lastKind==='dungeon')return false;
  let modified=0;root.traverse(o=>{
   if(o.userData?.anchorId!==anchorId)return;
   const roofNames=/roof|ridge|gable|dormer|chimney|eave|finial/;
   o.traverse(q=>{if(q!==o&&roofNames.test(q.name||'')){q.visible=!inside;modified++;}});
  });return modified>0;
 };
 const setDoorState=(anchorId,isOpen)=>{
  if(!built||lastKind==='dungeon')return false;
  let changed=0;root.traverse(o=>{if(o.userData?.anchorId===anchorId){o.traverse(q=>{
   if(q.name==='hinged-real-threshold'){q.rotation.y=isOpen?-1.52:-.16;changed++;}
  });}});return changed>0;
 };
 const environmentMood=({rain=0,night=0}={})=>{
  if(!assets)return false;
  const wet=clamp(Number(rain)||0,0,1),dark=clamp(Number(night)||0,0,1);
  for(const m of [assets.M.stone,assets.M.roof,assets.M.wood,assets.M.plaster]){
   if(!m)continue;
   m.userData??={};
   const base=m.userData.aaDryRoughness??Number(m.roughness??m.params?.roughness??.88);
   m.userData.aaDryRoughness=base;
   m.roughness=lerp(base,Math.max(.24,base*.48),wet);
   m.needsUpdate=true;
  }
  if(assets.M.glow){assets.M.glow.emissiveIntensity=1.18+dark*.84;assets.M.glow.needsUpdate=true;}
  return true;
 };
 const renderer={
  get root(){return root;},get plan(){return built;},
  draw,drawDungeon,clear,revealInterior,setDoorState,environmentMood,
  tick(delta,elapsed){if(disposed)return;const t=Number.isFinite(elapsed)?elapsed:0;
   if(assets?.M.grass?.userData?.aaWindUniform)assets.M.grass.userData.aaWindUniform.value=t;
   for(let i=0;i<animated.length;i++)if(animated[i].scale){const p=1+.036*Math.sin(t*2.4+i*1.13);animated[i].scale.setScalar(p);}
  },
  showDungeonConsequence(result){if(!result?.success||lastKind!=='dungeon')return false;
   let changed=0;root.traverse(o=>{if(o.userData?.roomId===result.roomId&&(o.userData?.reactive||o.name.includes('response'))){
    if(o.userData.solved)return;
    o.scale.set(1.42,.82,1.42);o.rotation.y+=.34;o.userData.solved=true;changed++;}});return changed>0;
  },
  stats(){let triangles=0,meshes=0,drawCalls=0;root.traverse(o=>{if(o.isMesh){meshes++;drawCalls++;const g=o.geometry;triangles+=(g.index?.count??g.attributes?.position?.count??0)/3;}});
   return {kind:lastKind,meshes,drawCalls,grassInstances:grassCount,plantSpecies:{...plantSpecies},triangles:Math.round(triangles),batching:batchMetrics,textures:assets?.textures.length||0,landmarks:built?.placements?.length||0};},
  dispose(){if(disposed)return;clear();scene.remove(root);disposed=true;}
 };
 return renderer;
}
