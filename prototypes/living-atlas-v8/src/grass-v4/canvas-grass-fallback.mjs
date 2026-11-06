/** Ash & Aether — no-WebGL Canvas2D vegetation compositor.
 * Designed for 2D/2.5D hosts: call after painting ground, before actors/UI.
 * Terrain/occlusion/world-space camera callbacks MUST come from the actual game.
 * Uses the same createEcology samples and save-state growth as the Three.js layer.
 */
import {createEcology, SPECIES, hash2, clamp} from './grass-ecology.mjs';
// Opaque plant colours are tinted by the SAME ecology season as WebGL.
// No external assets or image downloads: fast, deterministic palette mixing.
function tint(hex,season,scorch,wet){
  const target=season==='autumn'?'#b8a06d':season==='winter'?'#b2beb3':
    season==='spring'?'#8eaf65':null;
  const factor=season==='autumn'?.28:season==='winter'?.43:season==='spring'?.12:0;
  const src=hex.slice(1).match(/../g).map(c=>parseInt(c,16));
  function blend(dst,k){for(let i=0;i<3;i++)src[i]=src[i]*(1-k)+parseInt(dst.slice(1+2*i,3+2*i),16)*k;}
  if(target)blend(target,factor);
  if(scorch)blend('#4d3f2e',clamp(scorch*.86));
  const rain=.10*clamp(wet);
  for(let i=0;i<3;i++)src[i]*=1-rain;
  return '#'+src.map(n=>Math.round(clamp(n,0,255)).toString(16).padStart(2,'0')).join('');
}
const PRESETS={low:{cell:.82,cap:1900,blades:3},medium:{cell:.60,cap:3200,blades:5},high:{cell:.43,cap:5200,blades:7}};
export function createCanvasGrassFallback(options={}){
  const seed=options.seed??316;
  const config=PRESETS[options.quality]??PRESETS.medium;
  const ecology=options.ecology??createEcology(options);
  const project=options.worldToScreen??((x,z,y)=>({x,y:z-y}));
  const alpha=options.alpha??.95;
  let time=0;
  function draw(ctx,{bounds,dt=0,wind=.3,player=null,pixelScale=24}={}){
    if(!bounds || !['minX','maxX','minZ','maxZ'].every(k=>Number.isFinite(bounds[k]))) throw Error('finite world bounds required');
    if(bounds.maxX<=bounds.minX||bounds.maxZ<=bounds.minZ)throw Error('positive world bounds required');
    time+=Math.max(0,Math.min(.1,dt));
    const cell=config.cell, nx=Math.ceil((bounds.maxX-bounds.minX)/cell),nz=Math.ceil((bounds.maxZ-bounds.minZ)/cell);
    const stride=Math.max(1,Math.ceil(Math.sqrt(nx*nz/(config.cap*1.9))));
    const x0=Math.floor(bounds.minX/cell),x1=Math.ceil(bounds.maxX/cell);
    const z0=Math.floor(bounds.minZ/cell),z1=Math.ceil(bounds.maxZ/cell);
    let drawn=0,skipped=0;let ordered=[];
    for(let j=z0;j<=z1;j+=stride)for(let i=x0;i<=x1;i+=stride){
      const x=(i+.07+.84*hash2(i,j,seed+40))*cell,z=(j+.07+.84*hash2(i,j,seed+45))*cell;
      if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)continue;
      const e=ecology.sample(x,z);
      if(e.blocked||hash2(i,j,seed+51)>e.density){skipped++;continue;}
      const species=ecology.chooseSpecies(x,z,e,hash2(i,j,seed+54)),s=SPECIES[species];
      const point=project(x,z,e.y);if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))continue;
      ordered.push({i,j,x,z,e,point,s,species});
    }
    ordered.sort((a,b)=>a.point.y-b.point.y);
    ctx.save();ctx.globalAlpha=alpha;
    for(const t of ordered){
      if(drawn>=config.cap)break;
      const {i,j,x,z,e,point,s,species}=t;
      const height=Math.max(1,pixelScale*s.height*e.heightFactor*(.78+.42*hash2(i,j,seed+60)));
      const spread=Math.max(1,Math.min(15,pixelScale*s.width*5));
      const palette=s.palette;
      const playerDistance=player?Math.hypot(player.x-x,player.z-z):Infinity;
      const push=playerDistance<1.7?(1-playerDistance/1.7)*1.3:0;
      const gust=Math.sin(time*1.8+x*.59+z*.34)*wind*.25 + Math.sin(time*.61+z*.12)*wind*.18;
      const bend=(gust+push)*height*.20;
      for(let blade=0;blade<config.blades;blade++){
        const r=hash2(i,j,seed+71+blade*2),r2=hash2(i,j,seed+72+blade*2);
        const h=height*(.53+.65*r),startX=point.x+(r2-.5)*spread*.9;
        const drift=bend+(r-.5)*spread*1.3;
        const w=Math.max(.45,spread*(.12+.11*r));
        const leafColor=palette[Math.floor(hash2(i,j,seed+100+blade)*palette.length)];
        ctx.fillStyle=tint(leafColor,e.season,e.scorch,e.wet);
        ctx.beginPath();ctx.moveTo(startX-w*.5,point.y);
        ctx.quadraticCurveTo(startX+drift*.22,point.y-h*.55,startX+drift,point.y-h);
        ctx.quadraticCurveTo(startX+drift*.64+w*.33,point.y-h*.57,startX+w*.5,point.y);
        ctx.closePath();ctx.fill();
        if(options.highContrast&&typeof ctx.stroke==='function'){
          ctx.strokeStyle='rgba(10,28,21,.56)';ctx.lineWidth=Math.max(.6,w*.16);ctx.stroke();
        }
        if(species==='clover'||species==='fern'||species==='heather'||species==='lavender'){
          const y=point.y-h*.73,xx=startX+drift*.73;
          ctx.beginPath();ctx.ellipse(xx,y,Math.max(1,w*1.5),Math.max(1,w*.9),-.3,0,Math.PI*2);ctx.fill();
        }
        if((species==='reed'||species==='wheat'||species==='rye')&&blade%2===0){
          ctx.beginPath();ctx.ellipse(startX+drift,point.y-h,w*.7,h*.15,.3,0,Math.PI*2);ctx.fill();
        }
      }
      drawn++;
    }
    ctx.restore();
    return {plants:drawn,candidates:ordered.length,skipped,quality:options.quality??'medium'};
  }
  return {draw,ecology};
}
