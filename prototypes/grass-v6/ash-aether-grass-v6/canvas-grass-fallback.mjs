/** Ash & Aether — richly varied Canvas2D vegetation compositor.
 * Host owns camera, geometry, collision, weather, ecology and timing. This
 * module draws only; it does not assign loot, mutate saves or run encounters.
 * All ornamental randomness is hashed from world coordinates and world seed.
 */
import {createEcology,SPECIES,hash2,clamp} from './grass-ecology.mjs';
import {sampleFoliageAppearance} from './grass-appearance.mjs';
const TAU=Math.PI*2;
function tint(hex,season,scorch,wet,light=1){
  const target=season==='autumn'?'#b8a06d':season==='winter'?'#b2beb3':season==='spring'?'#8eaf65':null;
  const factor=season==='autumn'?.28:season==='winter'?.43:season==='spring'?.12:0;
  const src=hex.slice(1).match(/../g).map(c=>parseInt(c,16));
  function blend(dst,k){for(let i=0;i<3;i++)src[i]=src[i]*(1-k)+parseInt(dst.slice(1+2*i,3+2*i),16)*k;}
  if(target)blend(target,factor);
  if(scorch)blend('#4d3f2e',clamp(scorch*.86));
  const rain=.10*clamp(wet);
  for(let i=0;i<3;i++)src[i]*=(1-rain)*light;
  return '#'+src.map(n=>Math.round(clamp(n,0,255)).toString(16).padStart(2,'0')).join('');
}
const PRESETS={
  low:{cell:.78,cap:2100,blades:4,ornament:0},
  medium:{cell:.53,cap:4300,blades:7,ornament:1},
  high:{cell:.39,cap:8200,blades:10,ornament:2},
};
function leaf(ctx,x,y,dx,h,w){
  ctx.beginPath();ctx.moveTo(x-w*.5,y);
  ctx.quadraticCurveTo(x+dx*.35-w*.35,y-h*.52,x+dx,y-h);
  ctx.quadraticCurveTo(x+dx*.63+w*.47,y-h*.62,x+w*.5,y);
  ctx.closePath();ctx.fill();
}
function ellipse(ctx,x,y,rx,ry,rot=0){
  ctx.beginPath();ctx.ellipse(x,y,Math.max(.35,rx),Math.max(.35,ry),rot,0,TAU);ctx.fill();
}
/** Optional scaleAt(x,z,y) enables camera-distance-aware foreshortening. */
export function createCanvasGrassFallback(options={}){
  const seed=options.seed??316;
  const config=PRESETS[options.quality]??PRESETS.medium;
  const ecology=options.ecology??createEcology(options);
  const project=options.worldToScreen??((x,z,y)=>({x,y:z-y}));
  const scaleAt=options.scaleAt??(()=>1);
  const alpha=options.alpha??.97;
  let time=0;
  function draw(ctx,{bounds,dt=0,wind=.3,player=null,pixelScale=24}={}){
    if(!bounds||!['minX','maxX','minZ','maxZ'].every(k=>Number.isFinite(bounds[k])))throw Error('finite world bounds required');
    if(bounds.maxX<=bounds.minX||bounds.maxZ<=bounds.minZ)throw Error('positive world bounds required');
    time+=Math.max(0,Math.min(.1,dt));
    const cell=config.cell;
    const nx=Math.ceil((bounds.maxX-bounds.minX)/cell),nz=Math.ceil((bounds.maxZ-bounds.minZ)/cell);
    const stride=Math.max(1,Math.ceil(Math.sqrt(nx*nz/(config.cap*1.75))));
    const x0=Math.floor(bounds.minX/cell),x1=Math.ceil(bounds.maxX/cell);
    const z0=Math.floor(bounds.minZ/cell),z1=Math.ceil(bounds.maxZ/cell);
    let drawn=0,skipped=0;const ordered=[];
    for(let j=z0;j<=z1;j+=stride)for(let i=x0;i<=x1;i+=stride){
      const x=(i+.07+.84*hash2(i,j,seed+40))*cell,z=(j+.07+.84*hash2(i,j,seed+45))*cell;
      if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)continue;
      const e=ecology.sample(x,z);
      if(e.blocked||hash2(i,j,seed+51)>clamp(e.density,0,1)){skipped++;continue;}
      const species=ecology.chooseSpecies(x,z,e,hash2(i,j,seed+54)),s=SPECIES[species];
      const point=project(x,z,e.y),perspective=scaleAt(x,z,e.y);
      if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||!Number.isFinite(perspective)||perspective<=0)continue;
      const a=sampleFoliageAppearance(i,j,seed,e);
      ordered.push({i,j,x,z,e,point,perspective,s,species,a});
    }
    // Correct overpaint in isometric and 3/4 cameras: far plants first.
    ordered.sort((a,b)=>a.point.y-b.point.y);
    ctx.save();ctx.globalAlpha=alpha;
    const colorsUsed=new Map();
    for(const t of ordered){
      if(drawn>=config.cap)break;
      const {i,j,x,z,e,point,perspective,s,species,a}=t;
      const height=Math.max(.7,pixelScale*s.height*e.heightFactor*a.height*perspective);
      const spread=Math.max(.8,Math.min(32,pixelScale*s.width*(4.2+2.0*a.fan)*a.width*perspective));
      const shadowRadius=spread*(.8+.3*a.patch);
      if(config.ornament>0&&ctx.ellipse){
        ctx.fillStyle='rgba(14,29,18,.11)';ellipse(ctx,point.x+height*.1,point.y+.25,shadowRadius,shadowRadius*.31);
      }
      const p=player?Math.hypot(player.x-x,player.z-z):Infinity;
      const push=p<1.7?(1-p/1.7)*1.3:0;
      const slow=Math.sin(time*.69+x*.19+z*.21);
      const eddy=Math.sin(time*1.53+x*.59-z*.34+a.phase);
      const flutter=Math.sin(time*3.0+a.phase*2.1);
      const bend=(slow*.50+eddy*.37+flutter*.13)*wind*height*.21+push*height*.22;
      const count=Math.max(2,Math.round(config.blades*(.73+.42*a.fan)));
      const palette=s.palette;
      for(let blade=0;blade<count;blade++){
        const r=hash2(i,j,seed+71+blade*2),r2=hash2(i,j,seed+72+blade*2);
        const h=height*(.46+.69*r);
        const spreadSign=((blade&1)?1:-1);
        const startX=point.x+(r2-.5)*spread*1.23;
        const drift=bend+(r-.45)*spread*(.64+.66*a.fan)+a.lean*h*.19+spreadSign*(blade%3)*.24*spread;
        const width=Math.max(.35,spread*(.12+.105*r)*(species==='bentgrass'||species==='rush'?.55:1));
        const leafColor=palette[Math.floor(hash2(i,j,seed+100+blade)*palette.length)];
        let color=tint(leafColor,e.season,e.scorch,e.wet,.83+.27*r);
        if(!colorsUsed.has(color))colorsUsed.set(color,color);
        ctx.fillStyle=color;
        leaf(ctx,startX,point.y,drift,h,width);
        if(options.highContrast&&typeof ctx.stroke==='function'){
          ctx.strokeStyle='rgba(10,28,21,.5)';ctx.lineWidth=Math.max(.45,width*.13);ctx.stroke();
        }
        if(config.ornament>0){
          const xx=startX+drift*.74, yy=point.y-h*.74;
          // Distinct botanical silhouettes rather than uniform ribbon-plus-dot impostors.
          if(species==='clover' && blade%2===0){
            for(let l=0;l<3;l++){const angle=l*TAU/3+.3;
              ellipse(ctx,xx+Math.cos(angle)*width*1.6,yy+Math.sin(angle)*width*.9,width*1.3,width*.83,angle);}
          }else if(species==='fern' && blade%2===0){
            for(let l=0;l<3;l++){
              const y2=point.y-h*(.35+l*.15),x2=startX+drift*(.35+l*.15);
              ellipse(ctx,x2-width*1.15,y2,width*1.3,width*.52,-.4);
              ellipse(ctx,x2+width*1.15,y2,width*1.3,width*.52,.4);
            }
          }else if(['heather','lavender'].includes(species)&&blade%3===0){
            const bloom=species==='lavender'?'#bea5c7':'#b5a1b6';
            ctx.fillStyle=tint(bloom,e.season,e.scorch,e.wet);
            for(let k=0;k<3;k++)ellipse(ctx,xx+(k-1)*width*.5,yy-k*width*.85,width*.58,width*.76);
          }else if(species==='nettle' && blade%2===0){
            ellipse(ctx,xx-width,yy,width*1.1,width*.58,-.45);
          }else if(['reed','rush','sedge'].includes(species)&&blade%3===0){
            if(species==='reed'){ctx.fillStyle=tint('#786e49',e.season,e.scorch,e.wet);ellipse(ctx,startX+drift,point.y-h,width*.65,h*.11,.12);}
          }else if(['rye','wheat','straw'].includes(species)&&blade%3===0){
            ctx.fillStyle=tint(species==='wheat'?'#dbc17e':'#baaa76',e.season,e.scorch,e.wet);
            for(let k=0;k<3;k++)ellipse(ctx,xx+(k-1)*width*.4,yy-k*h*.035,width*.32,width*.63,.32);
          }
        }
      }
      if(config.ornament>0&&a.inflorescence&&['meadow','clover','bentgrass','heather','lavender','bluegrass'].includes(species)){
        const centerX=point.x+bend+spread*.17*(a.bladeJitter-.5),cy=point.y-height*.87;
        const hue=species==='lavender'?'#bda5c7':species==='heather'?'#c29dbb':species==='clover'?'#f7edd3':'#e7d9a5';
        ctx.fillStyle=tint(hue,e.season,e.scorch,e.wet);
        const petals=config.ornament===2?5:3;
        for(let k=0;k<petals;k++){
          const angle=k*TAU/petals;ellipse(ctx,centerX+Math.cos(angle)*height*.065,cy+Math.sin(angle)*height*.052,Math.max(.5,height*.033),Math.max(.5,height*.025),angle);
        }
        ctx.fillStyle='#b99d57';ellipse(ctx,centerX,cy,Math.max(.5,height*.027),Math.max(.5,height*.027));
      }
      drawn++;
    }
    ctx.restore();
    return {plants:drawn,candidates:ordered.length,skipped,quality:options.quality??'medium',paletteColors:colorsUsed.size};
  }
  return {draw,ecology};
}
