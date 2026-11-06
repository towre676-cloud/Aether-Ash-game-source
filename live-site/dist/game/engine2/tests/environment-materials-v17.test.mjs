import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 ENVIRONMENT_SURFACE_FILE,ENVIRONMENT_SURFACE_SIZE,ENVIRONMENT_SURFACE_CROPS,
 ENVIRONMENT_SURFACE_TILE,ENVIRONMENT_SURFACE_ALPHA,environmentSurfaceSpec,paintEnvironmentSurface
} from '../environment-materials-v17.js';
import {TERRAIN_MATERIALS} from '../terrain-materials.js';

const image={width:1774,height:887};
const identity=[1,0,0,1,0,0];
const point=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
function recorder({matrix=identity,throwAt=Infinity}={}){
 const stack=[],draws=[],path={untouched:true};let saves=0;
 const c={globalAlpha:.61,matrix:[...matrix],path,
  save(){stack.push({globalAlpha:this.globalAlpha,matrix:[...this.matrix]});saves++;},
  restore(){assert.ok(stack.length,'restore needs a matching save');Object.assign(this,stack.pop());},
  translate(x,y){const m=this.matrix;m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;},
  scale(x,y){const m=this.matrix;m[0]*=x;m[1]*=x;m[2]*=y;m[3]*=y;},
  drawImage(source,sx,sy,sw,sh,dx,dy,dw,dh){
   if(draws.length+1===throwAt)throw new Error('simulated unavailable image');
   draws.push({source,sx,sy,sw,sh,dx,dy,dw,dh,matrix:[...this.matrix],alpha:this.globalAlpha});
  },
  beginPath(){throw new Error('the caller current path must be retained');},
  rect(){throw new Error('the painter must not mutate the caller current path');},
  clip(){throw new Error('partial drawing must use source crops, not a new clip path');}
 };
 return {c,draws,stack,get saves(){return saves;},verify(){assert.equal(stack.length,0);assert.deepEqual(c.matrix,matrix);assert.equal(c.globalAlpha,.61);assert.equal(c.path,path);}};
}
function sourcePoint(draw,x,y){
 const [a,b,c,d,e,f]=draw.matrix,det=a*d-b*c,px=x-e,py=y-f;
 const dx=(d*px-c*py)/det,dy=(-b*px+a*py)/det;
 return [draw.sx+(dx-draw.dx)/draw.dw*draw.sw,draw.sy+(dy-draw.dy)/draw.dh*draw.sh];
}
function near(a,b){assert.ok(Math.abs(a-b)<1e-8,`${a} should equal ${b}`);}

test('delivered opaque surface source and every central crop have the declared dimensions',()=>{
 const png=readFileSync(new URL('../../../../development/art/source-v17/'+ENVIRONMENT_SURFACE_FILE.replace(/\.webp$/i,'.png'),import.meta.url));
 assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');
 assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],ENVIRONMENT_SURFACE_SIZE);
 assert.equal(png[25],2,'this source is RGB, without an alpha channel');
 assert.equal(ENVIRONMENT_SURFACE_CROPS.length,8);
 for(const [i,[x,y,w,h]] of ENVIRONMENT_SURFACE_CROPS.entries()){
  assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=image.width&&y+h<=image.height);
  const left=i%4*image.width/4,top=Math.floor(i/4)*image.height/2;
  assert.ok(x>left+10&&x+w<left+image.width/4-10,'neighboring columns stay outside the crop');
  assert.ok(y>top+10&&y+h<top+image.height/2-10,'neighboring rows stay outside the crop');
 }
});

test('all current ground kinds select a surface while water and unavailable images keep their fallback',()=>{
 for(const kind of Object.keys(TERRAIN_MATERIALS))assert.ok(environmentSurfaceSpec(kind),kind);
 for(const [source,kind,size] of [[image,'water',768],[image,'unknown',768],[null,'grass',768],
  [{width:0,height:0},'grass',768],[{...image,complete:false},'grass',768],
  [{...image,naturalWidth:0,naturalHeight:0},'grass',768],[image,'grass',0],[image,'grass',NaN],[image,'grass',4097]]){
  const r=recorder();assert.equal(paintEnvironmentSurface(r.c,source,kind,size),false);assert.equal(r.draws.length,0);assert.equal(r.saves,0);r.verify();
 }
});

test('the game-sized material stays within its bounds and restores transform, opacity and current path',()=>{
 const matrix=[1.25,0,0,.75,31,17],r=recorder({matrix});
 assert.equal(paintEnvironmentSurface(r.c,image,'storm',768),true);
 assert.equal(r.draws.length,4,'a subdued 2×2 repeat replaces the finer quilt');
 for(const d of r.draws){
  near(d.alpha,.61*ENVIRONMENT_SURFACE_ALPHA);
  for(const [x,y] of [[d.dx,d.dy],[d.dx+d.dw,d.dy],[d.dx,d.dy+d.dh],[d.dx+d.dw,d.dy+d.dh]]){
   const [px,py]=point(d.matrix,x,y);assert.ok(px>=31-1e-8&&px<=31+768*1.25+1e-8);assert.ok(py>=17-1e-8&&py<=17+768*.75+1e-8);
  }
 }
 r.verify();
});

test('reflected neighbors and the outer cached repeat meet on the same source pixels',()=>{
 const r=recorder();paintEnvironmentSurface(r.c,image,'grass',768);
 const [tl,tr,bl,br]=r.draws,t=ENVIRONMENT_SURFACE_TILE;
 for(const y of [0,81,t]){
  const left=sourcePoint(tl,t,y),right=sourcePoint(tr,t,y);left.forEach((v,k)=>near(v,right[k]));
  const outerLeft=sourcePoint(tl,0,y),outerRight=sourcePoint(tr,t*2,y);outerLeft.forEach((v,k)=>near(v,outerRight[k]));
 }
 for(const x of [0,113,t]){
  const top=sourcePoint(tl,x,t),bottom=sourcePoint(bl,x,t);top.forEach((v,k)=>near(v,bottom[k]));
  const outerTop=sourcePoint(tr,x+t,0),outerBottom=sourcePoint(br,x+t,t*2);outerTop.forEach((v,k)=>near(v,outerBottom[k]));
 }
 r.verify();
});

test('partial last tiles never draw outside a requested nonmultiple square',()=>{
 const r=recorder(),size=589;assert.equal(paintEnvironmentSurface(r.c,image,'spore',size),true);
 for(const d of r.draws){
  assert.ok(d.sx>=0&&d.sy>=0&&d.sx+d.sw<=image.width&&d.sy+d.sh<=image.height);
  for(const [x,y] of [[0,0],[d.dw,0],[0,d.dh],[d.dw,d.dh]]){
   const [px,py]=point(d.matrix,x,y);assert.ok(px>=-1e-8&&py>=-1e-8&&px<=size+1e-8&&py<=size+1e-8);
  }
 }
 r.verify();
});

test('a drawing failure returns to the fallback with balanced canvas state',()=>{
 const r=recorder({throwAt:2});assert.equal(paintEnvironmentSurface(r.c,image,'lava'),false);r.verify();
});
