import {environmentFor} from './environment.js?v=5.18.0';
import {isInteriorScene} from './scene-identity.js';
import {terrainHash} from './terrain-materials.js';

const T=48,TAU=Math.PI*2;
const PALETTES={
 meadow:{bank:'#334335',edge:'#a4a776',shade:'#172c2d',light:'#e6d3a4',water:'#3f7f85',deep:'#173e50',mist:'#b3cfb7'},
 marsh:{bank:'#455846',edge:'#9fa67c',shade:'#173b36',light:'#d9e4bd',water:'#3f6f63',deep:'#183d3a',mist:'#bad7ce'},
 coast:{bank:'#7c8172',edge:'#d3d4ab',shade:'#244a59',light:'#f2e4b4',water:'#4ca0a6',deep:'#1b4c68',mist:'#c8e6da'},
 stone:{bank:'#525e66',edge:'#bac1b1',shade:'#29364b',light:'#eee4bd',water:'#5593a5',deep:'#223d58',mist:'#c3d7d9'},
 frost:{bank:'#78949d',edge:'#dae8db',shade:'#35556a',light:'#e9f5de',water:'#6babb9',deep:'#2a5873',mist:'#d5eae8'},
 forge:{bank:'#52473e',edge:'#b4a17e',shade:'#2c323c',light:'#edc593',water:'#667c83',deep:'#2a3f4e',mist:'#d9b395'},
 glass:{bank:'#5c5872',edge:'#b7bec8',shade:'#303951',light:'#cde8dc',water:'#649fac',deep:'#293d60',mist:'#b3cde0'},
 desert:{bank:'#82704f',edge:'#d9c493',shade:'#55473f',light:'#f4deab',water:'#659e9b',deep:'#285167',mist:'#dfcda4'}
};

/** A quiet value structure belongs to the region, rather than a uniform teal void. */
export function environmentMood(scene){
 const style=environmentFor(scene).style||'',indoor=isInteriorScene(scene);
 const family=/salt|coral/.test(style)?'coast':/river|mangrove/.test(style)?'marsh':/ice|aurora/.test(style)?'frost':/foundry|lava|caldera/.test(style)?'forge':/crystal|spore/.test(style)?'glass':/sand|cactus/.test(style)?'desert':/highland|ruins|storm|marble/.test(style)?'stone':'meadow';
 return {family,indoor,wet:!indoor&&/riverbank|salt|coral|mangrove/.test(style),...PALETTES[family]};
}

const plans=new WeakMap();
/** Cached spans and low-frequency features. They are visual only: no floor cell changes. */
export function buildEnvironmentDepth(scene){
 if(plans.has(scene))return plans.get(scene);
 const mood=environmentMood(scene),spans=[],patches=[],reflections=[],open=(x,y)=>scene.floor?.[y]?.[x]==='.';
 for(let y=0;y<scene.height;y++){
  let left=-1;
  for(let x=0;x<=scene.width;x++){
   if(x<scene.width&&!open(x,y)){if(left<0)left=x;}
   else if(left>=0){spans.push({x:left*T,y:y*T,w:(x-left)*T,h:T});left=-1;}
  }
 }
 if(!mood.indoor){
  // Broad landforms form a second plane beyond the traversable path.
  for(let y=1;y<scene.height;y+=5)for(let x=1;x<scene.width;x+=5){
   const px=x+.3+terrainHash(x,y,82)*2,py=y+.3+terrainHash(x,y,83)*2;
   if(open(Math.floor(px),Math.floor(py)))continue;
   patches.push({x:px*T,y:py*T,rx:80+terrainHash(x,y,84)*140,ry:44+terrainHash(x,y,85)*80,angle:(terrainHash(x,y,86)-.5)*.7,seed:x*137+y*29});
  }
  if(mood.wet)for(let y=1;y<scene.height;y+=2)for(let x=1;x<scene.width;x+=3){
   if(open(x,y)||open(x+1,y)||open(x,y-1))continue;
   const seed=x*733+y*173;
   if(terrainHash(x,y,87)<.48)continue;
   reflections.push({x:(x+terrainHash(x,y,88))*T,y:(y+terrainHash(x,y,89))*T,w:22+terrainHash(x,y,90)*52,seed});
  }
 }
 patches.sort((a,b)=>terrainHash(a.seed,1,94)-terrainHash(b.seed,1,94));reflections.sort((a,b)=>terrainHash(a.seed,2,95)-terrainHash(b.seed,2,95));
 const plan={mood,spans,patches:patches.slice(0,180),reflections:reflections.slice(0,240),width:scene.width*T,height:scene.height*T};
 plans.set(scene,plan);return plan;
}

function clipBlocked(c,plan,view=null){c.beginPath();for(const b of plan.spans){if(view&&(b.y+b.h<view.y0*T||b.y>view.y1*T||b.x+b.w<view.x0*T||b.x>view.x1*T))continue;c.rect(b.x,b.y,b.w+.15,b.h+.15);}c.clip();}
function ellipse(c,x,y,rx,ry,color,angle=0){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,TAU);c.fill();}

/** Baked once with the terrain, including in compatibility graphics. No filters or readbacks. */
export function paintEnvironmentBanks(c,scene,path){
 const plan=buildEnvironmentDepth(scene),p=plan.mood;if(p.indoor)return;
 const softBank=/^(village|woodland|spore|sand|cactus)$/.test(environmentFor(scene).style);
 c.save();clipBlocked(c,plan);
 const depth=c.createLinearGradient(0,0,plan.width,plan.height);
 depth.addColorStop(0,p.wet?p.water+'50':p.shade+(softBank?'12':'20'));depth.addColorStop(.48,p.wet?p.deep+'34':p.bank+(softBank?'0c':'18'));depth.addColorStop(1,p.wet?p.deep+'b3':p.shade+(softBank?'24':'3a'));
 c.fillStyle=depth;c.fillRect(0,0,plan.width,plan.height);
 if(p.wet){
  // Submerged soil gives the actual shoreline depth. The old bright parallel
  // bands outlined every small pool like a tiled border, overpowering roots.
  for(const [width,color]of [[94,p.water+'24'],[50,p.bank+'2c'],[24,p.edge+'1c'],[8,p.deep+'45']]){c.lineWidth=width;c.strokeStyle=color;c.stroke(path);}
  for(const q of plan.patches){ellipse(c,q.x,q.y,q.rx,q.ry,p.water+'14',q.angle);}
 }else{
  for(const q of plan.patches){
   const g=c.createRadialGradient(q.x-q.rx*.22,q.y-q.ry*.35,4,q.x,q.y,q.rx);
   g.addColorStop(0,p.edge+'25');g.addColorStop(.45,p.bank+'39');g.addColorStop(1,p.shade+'00');
   c.save();c.translate(q.x,q.y);c.scale(1,q.ry/q.rx);c.translate(-q.x,-q.y);c.fillStyle=g;c.fillRect(q.x-q.rx,q.y-q.rx,q.rx*2,q.rx*2);c.restore();
   // A few long erosion lines describe the same hillside, rather than scattered dots.
   for(let k=0;k<3;k++){const y=q.y+(k-1)*q.ry*.38;c.strokeStyle=k===0?p.edge+'12':p.shade+'17';c.lineWidth=2;c.beginPath();c.moveTo(q.x-q.rx*.62,y);c.bezierCurveTo(q.x-q.rx*.2,y-q.ry*.16,q.x+q.rx*.35,y+q.ry*.11,q.x+q.rx*.69,y-q.ry*.05);c.stroke();}
  }
  // Leaf litter and loose sand share a ground plane: a continuous hard rim made
  // their collision contours resemble raised concrete curbs. Stone keeps its ledge.
  const edgeBands=softBank?[[40,p.shade+'1a'],[18,p.bank+'14']]:[[46,p.shade+'2b'],[23,p.bank+'38'],[6,p.edge+'18']];
  for(const [width,color]of edgeBands){c.lineWidth=width;c.strokeStyle=color;c.stroke(path);}
 }
 c.restore();
 // The open floor receives broad grazing light, without decorating the command space.
 c.save();c.clip(path,'evenodd');
 const light=c.createLinearGradient(0,0,plan.width,plan.height);light.addColorStop(0,p.light+'1f');light.addColorStop(.38,p.light+'0b');light.addColorStop(1,p.shade+'18');c.fillStyle=light;c.fillRect(0,0,plan.width,plan.height);c.restore();
}

/** Screen surround for indoor cutaways: warm walls sit in a quiet cool shadow. */
export function paintEnvironmentSurround(c,scene,width,height,centerY){
 if(!environmentMood(scene).indoor)return;
 c.save();const g=c.createRadialGradient(width*.5,centerY,width*.08,width*.5,centerY,Math.max(width,height)*.75);g.addColorStop(0,'#1c252a');g.addColorStop(.55,'#101b23');g.addColorStop(1,'#07121b');c.fillStyle=g;c.fillRect(0,0,width,height);c.restore();
}

/** Restrained movement is confined to water and painted before actors and danger areas. */
export function paintEnvironmentWater(renderer,plan,view){
 if(!plan?.mood.wet)return;
 const c=renderer.ctx,time=renderer.comfort?.steadyLighting?0:renderer.time||0,p=plan.mood;let count=0;
 c.save();clipBlocked(c,plan,view);c.lineCap='round';
 for(const q of plan.reflections){
  if(q.x+q.w<view.x0*T||q.x-q.w>view.x1*T||q.y<view.y0*T||q.y>view.y1*T)continue;
  if(++count>(renderer.compatibility?28:44))break;
  const wave=Math.sin(time*.48+q.seed)*2.5,alpha=.12+(Math.sin(time*.3+q.seed)*.5+.5)*.09;
  c.globalAlpha=alpha;c.strokeStyle=p.light;c.lineWidth=.9;c.beginPath();c.moveTo(q.x-q.w,q.y+wave);c.bezierCurveTo(q.x-q.w*.3,q.y-2+wave,q.x+q.w*.4,q.y+2+wave,q.x+q.w,q.y+wave);c.stroke();
  c.globalAlpha=alpha*.45;c.lineWidth=.6;c.beginPath();c.moveTo(q.x-q.w*.55,q.y+7-wave*.4);c.lineTo(q.x+q.w*.32,q.y+7-wave*.4);c.stroke();
 }
 c.restore();
}
