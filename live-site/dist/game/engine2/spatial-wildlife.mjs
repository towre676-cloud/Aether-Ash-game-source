/**
 * Light-weight, collision-respecting fauna motion for the outer habitat of
 * expanded maps. Not enemies, not combat targets, not permanent saves.
 * Sixteen? No: at most five localized actors per active scene, and never when
 * outside the player's camera neighbourhood. No source sprite is replaced.
 */
import {spatialEcologyRecord} from './spatial-ecology.mjs?v=1';
const THEMES={
 sand:{kind:'crawler',body:[.60,.43,.23],light:[.87,.66,.30]},
 salt:{kind:'bird',body:[.68,.75,.69],light:[.92,.94,.77]},
 cactus:{kind:'crawler',body:[.54,.65,.37],light:[.89,.70,.37]},
 lava:{kind:'crawler',body:[.55,.34,.25],light:[1,.54,.20]},
 coral:{kind:'swimmer',body:[.34,.69,.74],light:[.76,.86,.68]},
 mangrove:{kind:'crawler',body:[.34,.53,.35],light:[.79,.72,.38]},
 crystal:{kind:'moth',body:[.58,.50,.77],light:[.86,.76,1]},
 ice:{kind:'runner',body:[.72,.79,.83],light:[.96,.98,1]},
 aurora:{kind:'runner',body:[.58,.71,.68],light:[.77,1,.89]},
 spore:{kind:'moth',body:[.62,.64,.48],light:[.93,.76,.62]},
 storm:{kind:'bird',body:[.51,.58,.68],light:[.95,.84,.44]},
 marble:{kind:'bird',body:[.71,.68,.60],light:[1,.90,.66]},
 village:{kind:'moth',body:[.69,.60,.44],light:[.94,.80,.55]},
 dungeon:{kind:'moth',body:[.51,.63,.63],light:[.70,.91,.81]}
};
const offsets=[[-2,-1],[1,-2],[2,1],[-1,2],[0,0],[3,2],[-3,1]];
const TILE=48;
export function spatialWildlifeProfile(scene){
 const style=scene?.biome?.style|| (scene?.spatialExpansion?.archetype==='dungeon'?'dungeon':'village');
 return THEMES[style]||THEMES.village;
}
/** Pure positions; this remains deterministic for all clients and frame rates. */
export function spatialWildlifeActors(world,time=0,{range=21}={}){
 const scene=world?.scene,meta=scene?.spatialExpansion,p=world?.state,at=meta?.landmarks?.[6]?.xy;
 if(!p||p.mode!=='field'||meta?.version!==1||!Array.isArray(at)||!Number.isFinite(time))return [];
 const x=at[0]+.5,z=at[1]+.5;
 if(Math.hypot(x-p.x,z-p.y)>range)return[];
 const species=spatialWildlifeProfile(scene),settled=spatialEcologyRecord(world)?.choice==='protect',out=[];
 for(let i=0;i<5;i++){
  const [dx,dz]=offsets[i],bx=x+dx,bz=z+dz;
  if(scene.floor[Math.floor(bz)]?.[Math.floor(bx)]!=='.')continue;
  const phase=time*(settled?.54:.83)+i*2.13+scene.location*.071,
   radius=species.kind==='bird'||species.kind==='moth'?.57:.31;
  let xx=bx+Math.cos(phase)*radius,zz=bz+Math.sin(phase*.81)*radius;
  if(scene.floor[Math.floor(zz)]?.[Math.floor(xx)]!=='.'){xx=bx;zz=bz;}
  const elevated=['bird','moth'].includes(species.kind),swimming=species.kind==='swimmer',
   y=elevated?.66+.16*Math.sin(time*2.8+i):swimming?.18+.04*Math.sin(time*1.3+i):.17+.045*Math.abs(Math.sin(time*3+i)),
   heading=phase+.4,wing=Math.sin(time*(settled?6:8)+i*1.4);
  out.push({x:xx,z:zz,y,heading,wing,kind:species.kind,body:species.body,light:species.light,ordinal:i});
 }
 return out;
}
/** These are tiny wildlife silhouettes, not collision obstacles or hostile AI. */
export function appendSpatialWildlifeMotion(mesh,glow,{world,time=0}={}){
 if(!mesh||!world?.scene?.spatialExpansion)return 0;
 const actors=spatialWildlifeActors(world,time);
 for(const a of actors){
  const {x,z,y,body,light,kind,heading,wing}=a,forward=[Math.cos(heading),Math.sin(heading)],
    right=[-forward[1],forward[0]],side=(sign,d)=>[x+right[0]*sign*d,z+right[1]*sign*d];
  const size=kind==='runner'?.21:kind==='bird'?.17:.13;
  mesh.sphere(x,y,z,size,body,0,0,7,5);
  const face=[x+forward[0]*size*.87,z+forward[1]*size*.87];
  mesh.sphere(face[0],y+size*.3,face[1],size*.44,light,0,0,5,4);
  if(kind==='moth'||kind==='bird'){
   const span=kind==='bird'?.52:.38,flap=.10+.19*wing;
   for(const sign of [-1,1]){
    const tip=side(sign,span);
    mesh.tube([x+right[0]*sign*.07,y+.02,z+right[1]*sign*.07],[tip[0],y+flap,tip[1]],.055,.015,light,4,5,.14);
   }
   mesh.tube([x-forward[0]*.12,y-.02,z-forward[1]*.12],[x-forward[0]*.30,y-.03,z-forward[1]*.30],.035,.014,body,0,5);
  }else if(kind==='swimmer'){
   const tail=[x-forward[0]*.34,z-forward[1]*.34];
   mesh.tube([x,y,z],[tail[0],y+.06*Math.sin(time*5+a.ordinal),tail[1]],.07,.014,body,0,6);
  }else{
   for(const sign of[-1,1])for(const d of[-.07,.10]){
    const pt=side(sign,.15);
    mesh.tube([x+forward[0]*d,y-.04,z+forward[1]*d],[pt[0]+forward[0]*(d+.06),.033,pt[1]+forward[1]*(d+.06)],.018,.009,light,0,5);
   }
  }
 }
 return actors.length;
}
/** Tiny 2D fallback silhouettes for software/compatibility rendering. Caller
 * is already in world-pixel space, before actor objects are overpainted. */
export function drawSpatialWildlife2D(ctx,world,time=0){
 if(!ctx)return 0;
 const actors=spatialWildlifeActors(world,time);
 ctx.save();
 for(const a of actors){
  const x=a.x*TILE,y=(a.z-.2-a.y*.42)*TILE;
  ctx.save();ctx.translate(x,y);ctx.rotate(a.heading);
  ctx.fillStyle='#20332dbb';ctx.beginPath();ctx.ellipse(0,12,9,3,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#d7cda7';ctx.beginPath();ctx.ellipse(0,0,a.kind==='runner'?11:8,5,0,0,Math.PI*2);ctx.fill();
  if(['bird','moth'].includes(a.kind)){
   ctx.fillStyle='#94b6acb8';
   for(const sign of[-1,1]){ctx.beginPath();ctx.ellipse(0,sign*(7+Math.abs(a.wing)*6),8,3,sign*.3,0,Math.PI*2);ctx.fill();}
  }else{
   ctx.strokeStyle='#ab9875';ctx.lineWidth=1.6;for(const side of[-1,1])for(const offset of[-4,4]){ctx.beginPath();ctx.moveTo(offset,side*2);ctx.lineTo(offset+5,side*9);ctx.stroke();}
  }
  ctx.restore();
 }
 ctx.restore();return actors.length;
}
