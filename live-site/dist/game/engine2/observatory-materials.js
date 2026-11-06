/** Painted surface atlas for the Listening Headland. It is drawn once, locally,
 * and uses the existing four material swatches in both native renderers. */
const TILE=512;
const DEFAULT_SEED=0x540a17;
const palettes=Object.freeze({
 floor:['#a5aa9a','#b7b59f','#adb2a5','#c7bea5','#bbbba9','#a9aa9e'],
 wall:['#c4bda6','#d0c7ac','#b9b9a6','#d4cbb2','#b6b5a3','#c9c6b0'],
 copper:['#b87c46','#c68c50','#aa7044','#c79357'],
 cliff:['#294a59','#355966','#2d5361','#426772','#36575f','#264650']
});
function random(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
const point=(x,y)=>[x,y];
function slabs(heights,widths,rnd,colors){
 const blocks=[];let y=0;
 for(let row=0;row<heights.length;row++){
  const h=heights[row],shift=row%2?73:0;let x=-shift;
  while(x<TILE){const col=blocks.length%widths.length,w=widths[col],bevel=2+rnd()*3;
   blocks.push({x,y,w,h,color:colors[Math.floor(rnd()*colors.length)],bevel,
    pit:[x+w*(.2+rnd()*.6),y+h*(.2+rnd()*.6)],
    scar:[[x+w*.18,y+h*.67],[x+w*.34,y+h*.61],[x+w*.48,y+h*.65]],
    chip:row%2?[[x+w*.67,y],[x+w*.70,y+6],[x+w*.77,y+2]]:[[x+w,y+h*.29],[x+w-6,y+h*.34],[x+w-2,y+h*.44]]});
   x+=w;
  }y+=h;
 }
 return blocks;
}
function clipHalfPlane(poly,nx,ny,limit){
 if(!poly.length)return poly;const out=[];let a=poly.at(-1),da=a[0]*nx+a[1]*ny-limit;
 for(const b of poly){const db=b[0]*nx+b[1]*ny-limit;if((da<=0)!==(db<=0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}if(db<=0)out.push(b);a=b;da=db;}return out;
}
function clipTile(poly){for(const [nx,ny,d]of[[1,0,TILE],[-1,0,0],[0,1,TILE],[0,-1,0]])poly=clipHalfPlane(poly,nx,ny,d);return poly;}
function area(poly){let a=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p[0]*q[1]-q[0]*p[1];}return Math.abs(a)/2;}
// Periodic Voronoi pieces give hand-fitted flags and natural fracture planes.
// Their shared, irregular edges have no through-going rectangular brick course.
function fittedPlanes(columns,rows,rnd,colors){
 const sites=[];for(let row=0;row<rows;row++)for(let col=0;col<columns;col++)sites.push({x:(col+.20+rnd()*.60)*TILE/columns,y:(row+.20+rnd()*.60)*TILE/rows,color:colors[Math.floor(rnd()*colors.length)]});
 const pieces=[];
 for(let id=0;id<sites.length;id++){
  const a=sites[id];let cell=[[-TILE,-TILE],[TILE*2,-TILE],[TILE*2,TILE*2],[-TILE,TILE*2]];
  for(let j=0;j<sites.length;j++)for(const ox of[-TILE,0,TILE])for(const oy of[-TILE,0,TILE]){
   if(id===j&&ox===0&&oy===0)continue;const x=sites[j].x+ox,y=sites[j].y+oy,nx=x-a.x,ny=y-a.y;
   cell=clipHalfPlane(cell,nx,ny,(x*x+y*y-a.x*a.x-a.y*a.y)/2);
  }
  for(const ox of[-TILE,0,TILE])for(const oy of[-TILE,0,TILE]){
   const poly=clipTile(cell.map(([x,y])=>[x+ox,y+oy]));if(poly.length<3||area(poly)<3)continue;
   const x=Math.min(...poly.map(v=>v[0])),y=Math.min(...poly.map(v=>v[1])),w=Math.max(...poly.map(v=>v[0]))-x,h=Math.max(...poly.map(v=>v[1]))-y;
   pieces.push({id,x,y,w,h,polygon:poly,color:a.color,bevel:1.2+rnd()*.7,wear:rnd(),scar:rnd()<.22?[[x+w*.15,y+h*.54],[x+w*.35,y+h*.48],[x+w*.48,y+h*.59]]:[]});
  }
 }return pieces;
}
/** The same deterministic construction data drives the canvas and headless QA. */
export function observatoryMaterialRecipe({seed=DEFAULT_SEED}={}){
 const rnd=random(seed),floor=fittedPlanes(4,4,rnd,palettes.floor),wall=slabs([80,86,88,82,84,92],[132,212,168],rnd,palettes.wall),copper=[],cliff=fittedPlanes(3,2,rnd,palettes.cliff);
 for(let row=0;row<2;row++)for(let col=0;col<4;col++){
  const x=col*128,y=row*256;
  copper.push({x,y,w:128,h:256,color:palettes.copper[(row+col)%4],oxidation:9+rnd()*18,
   tide:Array.from({length:13},(_,i)=>point(x+128-(8+rnd()*26),y+i*256/12)),
   scratches:Array.from({length:10},()=>[x+12+rnd()*102,y+16+rnd()*224,5+rnd()*22])});
 }
 const strata=Array.from({length:7},(_,i)=>{const phase=-130+i*111+rnd()*45,amplitude=12+rnd()*22;return Array.from({length:15},(_,j)=>{const x=-40+j*44;return[x,phase+x*.26+Math.sin(j*.53+i)*amplitude+Math.sin(j*1.7+i)*4];});});
 const runnels=Array.from({length:7},(_,i)=>{const x=rnd()*TILE,y=-25+rnd()*340,length=95+rnd()*250;return{width:4+rnd()*9,points:Array.from({length:8},(_,j)=>[x+Math.sin(j*.76+i)*9+Math.sin(j*.21)*4,y+j*length/7])};});
 return {schema:'ash-aether.observatory-materials/1',tileSize:TILE,seed:seed>>>0,
  quadrants:[{id:'floor',x:0,y:0,blocks:floor,jointWidth:1.0},{id:'wall',x:TILE,y:0,blocks:wall,jointWidth:1.1},
   {id:'copper',x:0,y:TILE,panels:copper},{id:'cliff',x:TILE,y:TILE,rocks:cliff,strata,runnels}]};
}
function polygon(ctx,points){ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.closePath();}
function line(ctx,points,color,width=1){ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function stone(ctx,q,rnd){
 const flags=q.id==='floor';ctx.fillStyle=flags?'#919686':'#9b9c8b';ctx.fillRect(0,0,TILE,TILE);
 for(const b of q.blocks){
  const gap=q.jointWidth,x=b.x+gap,y=b.y+gap,w=b.w-gap*2,h=b.h-gap*2,v=b.bevel;
  let shape;
  if(b.polygon){
   const cx=b.polygon.reduce((n,p)=>n+p[0],0)/b.polygon.length,cy=b.polygon.reduce((n,p)=>n+p[1],0)/b.polygon.length;
   shape=b.polygon.map(([x,y])=>{const dx=x-cx,dy=y-cy,n=Math.hypot(dx,dy)||1;return[x-dx/n*gap,y-dy/n*gap];});
  }else shape=[[x+v,y],[x+w-v,y],[x+w,y+v],[x+w,y+h-v],[x+w-v,y+h],[x+v,y+h],[x,y+h-v],[x,y+v]];
  polygon(ctx,shape);ctx.fillStyle=b.color;ctx.fill();ctx.save();ctx.clip();
  const wash=ctx.createLinearGradient(x,y,x+w*.7,y+h);wash.addColorStop(0,'rgba(240,233,210,.14)');wash.addColorStop(.46,'rgba(151,166,151,.03)');wash.addColorStop(1,'rgba(50,88,85,.17)');ctx.fillStyle=wash;ctx.fillRect(b.x,b.y,b.w,b.h);
  // Broad mineral washes and worn polished centres carry the paint at phone
  // scale. Shallow brush bands replace the previous uniform field of speckles.
  for(let i=0;i<(flags?5:4);i++){
   const xx=b.x+b.w*(.12+rnd()*.76),yy=b.y+b.h*(.12+rnd()*.76),r=18+rnd()*Math.max(20,Math.min(b.w,b.h)*.65);
   const cloud=ctx.createRadialGradient(xx,yy,0,xx,yy,r);cloud.addColorStop(0,i%3?'rgba(53,102,101,.11)':'rgba(240,224,186,.19)');cloud.addColorStop(.48,i%3?'rgba(97,133,120,.055)':'rgba(237,224,194,.08)');cloud.addColorStop(1,'rgba(190,190,164,0)');ctx.fillStyle=cloud;ctx.fillRect(xx-r,yy-r,r*2,r*2);
  }
  for(let i=0;i<3;i++){const yy=y+6+rnd()*Math.max(1,h-12),xx=x+rnd()*w*.3;line(ctx,[[xx,yy],[xx+w*.25,yy-3],[xx+w*(.54+rnd()*.27),yy+2]],'rgba(230,230,204,.09)',2+rnd()*3);}
  if(b.scar?.length)line(ctx,b.scar,'rgba(55,86,79,.16)',.7);
  ctx.restore();
  // Interrupt the joint with rubbed edges and small green seam pockets. No
  // dark stroke encloses every flag, so the paving reads as worn stone mass.
  for(let i=0;i<shape.length;i++){
   const a=shape[i],b=shape[(i+1)%shape.length],t=.15+rnd()*.17,u=.68+rnd()*.2,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],r=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];
   if(rnd()<.65)line(ctx,[p,r],i%2?'rgba(66,92,81,.15)':'rgba(236,230,203,.25)',flags?.8:1.0);
   if(flags&&rnd()<.22){line(ctx,[p,r],'rgba(62,100,76,.20)',2.5);line(ctx,[p,[(p[0]+r[0])/2,(p[1]+r[1])/2]],'rgba(125,142,94,.25)',1.4);}
  }
 }
}
function copper(ctx,q,rnd){
 ctx.fillStyle='#604e3d';ctx.fillRect(0,0,TILE,TILE);
 for(const p of q.panels){
  const x=p.x+2,y=p.y+2,w=p.w-4,h=p.h-4,grad=ctx.createLinearGradient(x,y,x+w,y+h*.2);
  grad.addColorStop(0,'#7b5a3f');grad.addColorStop(.12,p.color);grad.addColorStop(.40,'#d0a06a');grad.addColorStop(.72,p.color);grad.addColorStop(1,'#97643e');ctx.fillStyle=grad;ctx.fillRect(x,y,w,h);
  // Oxidation collects along folded seams and the lower apron of each sheet.
  polygon(ctx,[[p.x+128,p.y],...p.tide,[p.x+128,p.y+256]]);ctx.fillStyle='rgba(64,118,101,.68)';ctx.fill();
  for(let i=0;i<3;i++){const xx=x+w*(.62+rnd()*.35),yy=y+15+rnd()*(h-30),r=18+rnd()*40,g=ctx.createRadialGradient(xx,yy,0,xx,yy,r);g.addColorStop(0,'rgba(42,116,101,.21)');g.addColorStop(1,'rgba(65,114,94,0)');ctx.fillStyle=g;ctx.fillRect(xx-r,yy-r,r*2,r*2);}
  const edge=ctx.createLinearGradient(x,y+h-45,x,y+h);edge.addColorStop(0,'rgba(53,106,97,0)');edge.addColorStop(.7,'rgba(62,119,105,.26)');edge.addColorStop(1,'rgba(51,108,101,.55)');ctx.fillStyle=edge;ctx.fillRect(x,y+h-45,w,45);
  line(ctx,[[x,y+h],[x,y],[x+w,y]],'rgba(245,192,116,.64)',1.5);
  line(ctx,[[x+w,y],[x+w,y+h],[x,y+h]],'rgba(36,61,56,.65)',2);
  for(const xx of[x+9,x+w-9])for(const yy of[y+12,y+h-12]){ctx.beginPath();ctx.arc(xx,yy,2.2,0,Math.PI*2);ctx.fillStyle='#5d5946';ctx.fill();ctx.beginPath();ctx.arc(xx-.6,yy-.6,.8,0,Math.PI*2);ctx.fillStyle='#e2b97b';ctx.fill();}
  for(let i=0;i<85;i++){const xx=x+4+rnd()*(w-8),yy=y+4+rnd()*(h-8);ctx.fillStyle=i%4?'rgba(73,80,61,.08)':'rgba(243,202,136,.12)';ctx.fillRect(xx,yy,.7+rnd()*1.8,.6+rnd());}
  for(const [xx,yy,length]of p.scratches)line(ctx,[[xx,yy],[xx+length,yy-1.3]],'rgba(245,205,147,.15)',.8);
  for(let i=0;i<5;i++){const xx=x+6+rnd()*(w-12),yy=y+10+rnd()*(h-20);ctx.fillStyle='rgba(38,99,91,.12)';ctx.fillRect(xx,yy,3+rnd()*8,1+rnd()*2);}
 }
}
function cliff(ctx,q,rnd){
 ctx.fillStyle='#2c4a58';ctx.fillRect(0,0,TILE,TILE);
 for(const rock of q.rocks){
  polygon(ctx,rock.polygon);ctx.fillStyle=rock.color;ctx.fill();ctx.save();ctx.clip();
  const x=rock.x,y=rock.y,w=rock.w,h=rock.h,g=ctx.createLinearGradient(x,y,x+w,y+h);
  g.addColorStop(0,'rgba(149,177,169,.16)');g.addColorStop(.46,'rgba(58,101,113,.03)');g.addColorStop(1,'rgba(12,40,54,.30)');ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
  for(let i=0;i<4;i++){const xx=x+rnd()*w,yy=y+rnd()*h,r=24+rnd()*65,c=ctx.createRadialGradient(xx,yy,0,xx,yy,r);c.addColorStop(0,i%2?'rgba(93,134,127,.13)':'rgba(15,46,62,.17)');c.addColorStop(1,'rgba(44,78,88,0)');ctx.fillStyle=c;ctx.fillRect(xx-r,yy-r,r*2,r*2);}
  ctx.restore();
  // Only scattered fracture edges are inked; there is no joint running
  // around every plane and no rectangular course or masonry mortar.
  const points=rock.polygon;for(let i=0;i<points.length;i++)if((i+rock.id)%3===0){const a=points[i],b=points[(i+1)%points.length];line(ctx,[a,b],'rgba(11,35,49,.28)',1.1);line(ctx,[[a[0]+1,a[1]],[b[0]+1,b[1]]],'rgba(137,166,156,.12)',.7);}
 }
 // Oblique mineral bedding crosses independent fracture planes. Its broad,
 // softened pigment is geological striation rather than horizontal brickwork.
 for(let i=0;i<q.strata.length;i++){
  const points=q.strata[i];line(ctx,points,i%2?'rgba(12,39,54,.20)':'rgba(107,143,136,.15)',5+i%3*2);
  line(ctx,points.map(([x,y])=>[x,y-2.6]),'rgba(139,163,146,.16)',1.0);
  if(i%2===0)line(ctx,points.map(([x,y])=>[x,y+6]),'rgba(21,56,67,.17)',2.0);
 }
 for(const runnel of q.runnels){
  line(ctx,runnel.points,'rgba(9,38,53,.045)',runnel.width*1.9);
  line(ctx,runnel.points,'rgba(9,38,53,.065)',runnel.width);
  line(ctx,runnel.points,'rgba(9,38,53,.045)',runnel.width*.4);
 }
}
const customCaches=new WeakMap();let defaultAtlas=null;
function nativeCanvas(width,height){let canvas;if(typeof document!=='undefined')canvas=document.createElement('canvas');else if(typeof OffscreenCanvas==='function')canvas=new OffscreenCanvas(width,height);else return null;canvas.width=width;canvas.height=height;return canvas;}
/** Canvas uses exactly 4MiB RGBA storage, and is reused across scene changes.
 * A caller-provided factory makes this directly renderable in offline tools. */
export function createObservatoryMaterialAtlas({createCanvas}={}){
 if(createCanvas&&customCaches.has(createCanvas))return customCaches.get(createCanvas);
 if(!createCanvas&&defaultAtlas)return defaultAtlas;
 const canvas=(createCanvas||nativeCanvas)(1024,1024);if(!canvas)return null;
 const ctx=canvas.getContext?.('2d');if(!ctx)return null;canvas.width=canvas.height=1024;
 // Midtone fallbacks for subpixel textured triangles use these same painted
 // material families, rather than the unrelated dungeon-atlas averages.
 canvas.observatoryMaterialAverages=Object.freeze([
  Object.freeze([.6934,.6987,.6212]),Object.freeze([.7227,.7196,.6381]),
  Object.freeze([.621,.4871,.3206]),Object.freeze([.2031,.3422,.3884])
 ]);
 const recipe=observatoryMaterialRecipe(),rnd=random(DEFAULT_SEED^0x732d9);
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=true;ctx.lineJoin='round';ctx.lineCap='round';
 for(const q of recipe.quadrants){ctx.save();ctx.translate(q.x,q.y);ctx.beginPath();ctx.rect(0,0,TILE,TILE);ctx.clip();if(q.id==='floor'||q.id==='wall')stone(ctx,q,rnd);else if(q.id==='copper')copper(ctx,q,rnd);else cliff(ctx,q,rnd);ctx.restore();}
 ctx.restore();if(createCanvas)customCaches.set(createCanvas,canvas);else defaultAtlas=canvas;return canvas;
}
export const OBSERVATORY_MATERIALS=Object.freeze({schema:'ash-aether.observatory-materials/1',width:1024,height:1024,tileSize:TILE,quadrants:Object.freeze(['floor','wall','copper','cliff']),rgbaBytes:4*1024*1024});
