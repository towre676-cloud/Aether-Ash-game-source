/** Living campaign content uses the existing native records and save ledgers.
 * Animals keep their original painted art; working objects have real moving
 * parts. Presentation never advances work, harvests, paths or the day clock. */
import {VILLAGE_FRAMES,villagePose} from './village-life-art.js?v=4.0.0';
import {regionalCraftKind} from './regional-art.js?v=5.22.0';
const TAU=Math.PI*2,clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const C={wood:[.34,.25,.16],edge:[.63,.53,.34],metal:[.24,.35,.36],dark:[.07,.12,.12],green:[.34,.48,.24],leaf:[.48,.61,.31],soil:[.22,.26,.17],cloth:[.46,.59,.55],paper:[.72,.72,.57],water:[.16,.46,.49],brass:[.67,.52,.27],warm:[.94,.69,.32],white:[.76,.78,.66],red:[.56,.25,.19]};
const PET_HEIGHT={cat:.57,dog:.77,cow:1.38};
const COW_CROPS=new WeakMap();
function petCrop(image,kind,pose,frame){
 const [x,y,w,h]=frame,source={x,y,w,h};if(kind!=='cow'||pose<2||typeof document==='undefined')return{image,source};
 let cache=COW_CROPS.get(image);if(!cache){cache=new Map();COW_CROPS.set(image,cache);}if(cache.has(pose))return cache.get(pose);
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx)return{image,source};
 ctx.beginPath();const points=pose===2?[[0,0],[w,0],[w,165],[w-40,165],[w-40,h],[0,h]]:[[0,50],[60,0],[w,0],[w,h],[0,h]];points.forEach(([a,b],i)=>i?ctx.lineTo(a,b):ctx.moveTo(a,b));ctx.closePath();ctx.clip();ctx.drawImage(image,x,y,w,h,0,0,w,h);const value={image:canvas,source:{x:0,y:0,w,h}};cache.set(pose,value);return value;
}
const point=o=>({x:o.xy[0]+.5,z:o.xy[1]+.5});
export function livingContentFamily(world,o){
 if(!o||o.hidden||!Array.isArray(o.xy)||!o.xy.every(Number.isFinite))return null;
 if(o.type==='trail-stable'||o.trailService)return'stable';
 if(!o.life||o.lifeKind==='resident')return null;
 if(PET_HEIGHT[o.lifeKind])return o.lifeKind;
 if(o.lifeKind==='project'&&o.profile)return'craft:'+regionalCraftKind(o.profile);
 if(['herb','grass'].includes(o.lifeKind))return'plant';
 if(o.lifeKind==='fauna'&&o.profile?.fauna)return'fauna:'+o.profile.fauna;
 return null;
}
function candidates(world,objects){return(Array.isArray(objects)?objects:world.objects()).filter(o=>livingContentFamily(world,o));}
function close(world,o,range){const p=point(o);return Math.hypot(p.x-world.state.x,p.z-world.state.y)<=range;}
function placement(world,o){
 const p=point(o),scene=world.scene,near=[];
 // The recovered Unfinished Row work uses its exact small clear floor sites.
 // Keep its patching frame within the native .64m reservation at every stage.
 if(o.regionalCompact)return{...p,anchor:p,inset:true,sy:.50,scale:.46};
 const blocked=(x,z)=>{for(let zz=Math.floor(z-.46);zz<=Math.floor(z+.46);zz++)for(let xx=Math.floor(x-.54);xx<=Math.floor(x+.54);xx++)if(scene.floor[zz]?.[xx]==='.'||!scene.floor[zz]?.[xx])return false;return!(scene.objects||[]).some(v=>v!==o&&v.footprint&&x>=v.footprint.x-.6&&x<=v.footprint.x+v.footprint.w+.6&&z>=v.footprint.y-.5&&z<=v.footprint.y+v.footprint.h+.5);};
 for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){const x=p.x+dx,z=p.z+dz,d=Math.hypot(dx,dz);if(d<=2.1&&blocked(x,z))near.push({x,z,d});}
 near.sort((a,b)=>a.d-b.d||a.z-b.z||a.x-b.x);const q=near[0];return{x:q?.x??p.x,z:q?.z??p.z,anchor:p,inset:!q,sy:q?1:.28,scale:q?1:.74};
}
function local(mesh,p){const s=p.scale,sy=p.sy;
 return {box:(x,y,z,w,h,d,c,mat=1,em=0,r=0)=>mesh.box(p.x+x*s,y*s*sy,p.z+z*s,w*s,h*s*sy,d*s,c,mat,em,r),
 cylinder:(x,y,z,r,h,c,mat=1,n=8,rt=r,em=0)=>mesh.cylinder(p.x+x*s,y*s*sy,p.z+z*s,r*s,h*s*sy,c,mat,n,rt*s,em),
 sphere:(x,y,z,r,c,mat=1,em=0,n=7,rows=4,shape=[1,1,1])=>mesh.sphere(p.x+x*s,y*s*sy,p.z+z*s,r*s,c,mat,em,n,rows,[shape[0],shape[1]*sy,shape[2]]),
 tube:(a,b,r0,r1,c,mat=1,n=6,em=0)=>mesh.tube([p.x+a[0]*s,a[1]*s*sy,p.z+a[2]*s],[p.x+b[0]*s,b[1]*s*sy,p.z+b[2]*s],r0*s,r1*s,c,mat,n,em),
 quad:(a,b,c,d,col,mat=1,em=0)=>mesh.quad(...[a,b,c,d].map(v=>[p.x+v[0]*s,v[1]*s*sy,p.z+v[2]*s]),col,mat,em),
 ring:(x,y,z,ri,ro,c,mat=1,em=0,alpha=1,n=12)=>mesh.ring(p.x+x*s,y*s*sy,p.z+z*s,ri*s,ro*s,c,mat,em,alpha,n)};
}
function bench(g,width=1.10){g.box(0,.58,0,width,.10,.66,C.wood,2);for(const x of[-width*.37,width*.37])for(const z of[-.22,.22])g.box(x,.30,z,.075,.55,.075,C.wood,2);g.box(0,.22,0,width*.85,.055,.08,C.edge,2);}
function rack(g,h=1.25,w=1.08){for(const x of[-w/2,w/2])g.box(x,h/2,0,.07,h,.09,C.wood,2);g.box(0,h,0,w+.12,.065,.09,C.edge,2);}
function plant(g,o,world,time){
 const chapter=o.profile?.chapter||o.grass||1,day=world.state.townLife?.day??1;
 const cut=o.lifeKind==='grass'?world.state.townLife?.care?.['grass:'+world.state.scene+':'+o.grass]===day:world.state.regionalLife?.harvests?.[chapter]===day;
 const name=o.profile?.plant||'',grass=/grass|flax|rye|fennel/.test(name)||o.lifeKind==='grass',flower=/flower|violet|lavender|chamomile|clover|marigold/.test(name),fern=/fern|mint|moss|cress/.test(name);
 g.cylinder(0,.025,0,.37,.035,C.soil,7,10);
 for(let i=0;i<7;i++){const a=i*2.399+chapter*.7,r=.10+(i%3)*.08,x=Math.sin(a)*r,z=Math.cos(a)*r,h=(cut?.14:grass?.49:.34)+(i%3)*.035,sway=Math.sin(time*1.1+i)*.025;
  g.tube([x,.025,z],[x+sway,h,z],.012,.004,i%2?C.green:C.leaf,5,4);
  if(!cut)for(let j=0;j<(fern?3:2);j++){const y=h*(.35+j*.23);g.sphere(x-.045,y,z,.075,C.green,5,0,5,3,[1,.22,.55]);g.sphere(x+.045,y+.04,z,.075,C.leaf,5,0,5,3,[1,.22,.55]);}
  if(!cut&&flower){for(let j=0;j<4;j++)g.sphere(x+sway+Math.cos(j*TAU/4)*.027,h,z+Math.sin(j*TAU/4)*.027,.026,chapter%2?[.63,.58,.74]:C.paper,5,0,5,3,[1,.5,1]);g.sphere(x+sway,h+.008,z,.016,C.brass,5,0,5,3);}
  if(!cut&&grass)for(let j=0;j<3;j++)g.sphere(x+sway+(j%2?.016:-.016),h-j*.036,z,.022,C.edge,5,0,4,3,[.6,1,.6]);
 }
}
function workState(world,o,feedback){const c=o.profile.chapter,r=world.state.regionalLife||{},phase=r.projects?.includes(c)?2:r.work?.[c]||0,p=feedback?.pending,match=p?.object?.lifeKind==='project'&&p.object.profile?.chapter===c;return{phase,amount:phase/2,pending:match?clamp(p.progress):0};}
function craft(g,k,s,time){
 const phase=s.phase,q=s.amount,move=s.pending*.12;
 if(['cloth','paper','laundry','boots','patch'].includes(k)){
  rack(g,1.20,1.12);
  for(let i=0;i<3;i++){const x=(i-1)*(phase===2?.33:.17),h=phase===1&&i===1?.42:.78,cloth=k==='paper'?C.paper:k==='boots'?C.wood:C.cloth;
   if(k==='boots'){g.box(x,h+.10,0,.15,.29,.16,cloth,6);g.box(x+.045,h-.07,.04,.23,.10,.22,cloth,6);}
   else{g.box(x,h,Math.sin(time+i)*.01,.26,k==='patch'?.40:.45,.024,cloth,6);g.box(x,1.20,.01,.04,.06,.05,C.edge,2);if(k==='patch')g.box(x,h,.018,.16,.17,.012,phase===2?C.edge:C.dark,6);}
  }return;
 }
 if(k==='vent'||k==='baffle'||k==='sieve'||k==='gutter'){
  if(k==='gutter'){rack(g,.73,1.15);g.box(0,.73+move,0,1.22,.065,.30,C.metal,1,0,phase===2?-.025:0);g.box(0,.77+move,0,1.12,.014,.20,C.dark,6);g.cylinder(phase===1?.92:.68,.26,0,.19,.30,C.metal,1,10);g.cylinder(phase===1?.92:.68,.42,0,.15,.018,phase===2?C.water:C.dark,3,10);return;}
  if(k==='vent'){g.box(0,.45,0,.88,.85,.42,C.metal,1);g.box(0,.47,.23,.73,.64,.025,C.dark,6);for(let i=0;i<5;i++)g.box(0,.23+i*.12,.26,.69,.045,.07,C.edge,1,0,phase===2?-.13:0);g.box(phase===1?.51:0,phase===1?.17:.92,0,.98,.06,.49,C.metal,1);return;}
  bench(g);g.box(0,(phase===1?1.05:.78)+move,0,.76,.25,.44,C.metal,1,0,k==='baffle'?(phase===2?-.27:.17):0);if(k==='sieve'&&phase!==2)g.box(0,phase===1?1.20:.93,0,.49,.035,.27,C.soil,7);for(let i=0;i<5;i++)g.box(-.30+i*.15,.92,0,.014,.018,.36,C.edge,1);if(k==='sieve')for(let i=0;i<4;i++)g.box(0,.922,-.15+i*.10,.67,.018,.012,C.edge,1);return;
 }
 if(k==='trolley'){
  g.box(0,.32,0,1.06,.08,.65,C.wood,2);for(const x of[-.42,.42]){g.tube([x,.12,-.25],[x,.12,.25],.14,.14,C.dark,1,10);g.box(x,.63,-.25,.055,.65,.06,C.metal,1);}g.box(0,.96,-.25,.9,.055,.06,C.metal,1);
  if(phase!==1)g.box(phase===2?0:-.08,.58,0,.66,.43,.49,C.edge,2,0,phase===2?0:.12);return;
 }
 if(k==='stool'||k==='chairs'){
  const n=k==='chairs'?3:1;for(let i=0;i<n;i++){const x=(i-(n-1)/2)*.45,z=k==='chairs'?(phase===2?(i===1?-.30:.12):0):0;for(const a of[-.13,.13])for(const b of[-.12,.12])g.box(x+a,.22,z+b,.035,.43,.035,C.wood,2);g.box(x,.45,z,.36,.07,.34,C.edge,2,0,phase===0?.055:0);if(k==='chairs'){for(const a of[-.14,.14])g.box(x+a,.64,z-.14,.035,.34,.04,C.wood,2);g.box(x,.79,z-.14,.32,.06,.04,C.edge,2);}else if(phase===2)g.box(x+.13,.035,z+.12,.10,.04,.11,C.brass,1);}return;
 }
 if(k==='seed'||k==='bank'){
  g.box(0,.16,0,1.10,.29,.61,C.wood,2);g.box(0,.32,0,.99,.025,.50,C.soil,7);for(let i=0;i<6;i++){const x=-.39+i*.15;g.tube([x,.33,0],[x,.51+i%2*.06,0],.012,.008,C.green,5,4);g.sphere(x,.47,0,.06,C.leaf,5,0,5,3,[1,.3,1]);}
  if(k==='seed'){rack(g,phase===0?.68:1.02,1.11);g.box(0,phase===0?.70:1.04,phase===2?-.10:0,1.23,.045,phase===2?.49:.73,C.cloth,6);}else g.box(0,phase===2?.09:phase===1?.47:.29,.33,1.0,.08,.065,C.edge,2);return;
 }
 bench(g,k==='table'?1.6:1.10);
 if(['rope','splice','mooring'].includes(k)){
  for(let i=0;i<4;i++)g.ring(-.18,.66+i*.027,0,.13-i*.016,.17-i*.016,C.edge,2,0,1,16);for(let i=0;i<3;i++)g.tube([-.05,.68,0],[.38,.72+(phase===0?i*.09:phase===1?-.10+i*.06:0),-.13+i*.10],.018,.018,i%2?C.wood:C.edge,2,5);
  if(k==='mooring')for(let i=0;i<10;i++){const a=i*TAU/10,b=(i+1)*TAU/10;g.tube([.35+Math.cos(a)*.17,.79+Math.sin(a)*.17,0],[.35+Math.cos(b)*.17,.79+Math.sin(b)*.17,0],.025,.025,C.metal,1,5);}return;
 }
 if(k==='tea'||k==='reed'){g.box(0,.665,0,.86,.035,.46,C.edge,2);for(let i=0;i<10;i++){const x=-.35+(i%5)*.17,z=-.14+Math.floor(i/5)*.24,y=.70+(phase===2?0:phase===1?(i%2)*.025:(i%4)*.035);if(k==='tea')g.sphere(x,y,z,.065,C.green,5,0,5,3,[1,.16,.5]);else {g.tube([x-.07,y,z],[x+.07,y,z],.012,.009,C.edge,2,5);if(phase===0)g.tube([x+.07,y,z],[x+.12,y-.035,z],.01,.005,C.edge,2,5);if(phase===2)g.box(x,y-.02,z,.18,.035,.06,C.cloth,6);}}return;}
 if(k==='lens'){g.box(0,.72,0,.70,.14,.47,phase===2?C.cloth:C.dark,6);if(phase!==1)g.sphere(0,.84,0,.23,[.40,.66,.68],6,.03,10,5,[1,.23,1]);return;}
 if(k==='cradle'){for(const x of[-.22,.22])g.box(x,.75,0,.11,.24,.43,C.edge,2);if(phase!==1){g.sphere(0,.87,0,.21,C.wood,6,0,9,5,[1,1.1,1]);g.cylinder(0,1.08,0,.13,.06,C.edge,6,10);g.cylinder(0,1.12,0,.09,.015,C.dark,6,10);}return;}
 if(k==='press'){for(const x of[-.36,.36])g.cylinder(x,.92,0,.025,.62,C.metal,1,7);g.box(0,.70,0,.79,.08,.49,C.paper,6);g.box(0,phase===1?1.08:.81,0,.88,.085,.55,C.wood,2,0,phase===0?.045:0);g.box(0,1.20,0,.91,.06,.14,C.edge,2);return;}
 if(k==='clay'){g.box(phase===1?.17:0,.68,0,.93,.04,.49,C.edge,2);for(let i=0;i<3;i++){const x=phase===2?-.32+i*.32:(phase===1?.02:-.15)+i*.12;g.cylinder(x,.77,0,.10,.16,C.wood,6,9,.13);g.cylinder(x,.86,0,.09,.015,C.dark,6,9);}return;}
 if(k==='table'){for(let i=0;i<3;i++){g.cylinder(-.5+i*.5,.70,0,.14,.05,phase===1?C.wood:C.paper,6,10);if(phase!==1)g.sphere(-.5+i*.5,.75,0,.075,C.warm,5,0,7,4,[1,.35,1]);}if(phase===2)g.box(0,.27,0,.09,.52,.52,C.edge,2);}
}
function fauna(m,gl,world,o,time){
 const k=o.profile.fauna,p=point(o),night=(world.state.townLife?.minutes??480)>=1080||(world.state.townLife?.minutes??480)<360,g=local(m,{...p,scale:o.regionalCompact?.60:1,sy:o.regionalCompact?.70:1});
 if(k==='firefly'){for(let i=0;i<5;i++){const x=Math.sin(time*.55+i*2.2)*.32,z=Math.cos(time*.37+i)*.28,y=.28+Math.cos(time*.7+i)*.18,col=night?C.warm:C.green;g.sphere(x,y,z,.018,col,night?4:5,night?.45:0,5,3,[.8,1.1,.8]);if(night)gl.sphere(p.x+x,y,p.z+z,.035,col,4,.45,5,3);}return;}
 if(k==='moth'){const flap=.25+Math.abs(Math.sin(time*6))*.75,y=night?.55+Math.sin(time*1.2)*.07:.36;for(const side of[-1,1]){g.sphere(side*.08*flap,y,0,.105,C.paper,6,0,7,4,[flap,.15,1]);g.sphere(side*.10*flap,y+.015,0,.032,C.water,6,0,5,3,[flap,.12,1]);}g.sphere(0,y,0,.045,C.dark,6,0,6,4,[.25,.4,1.5]);return;}
 if(k==='goat'){for(const x of[-.20,.20])for(const z of[-.10,.10])g.tube([x,.07,z],[x,.32,z],.025,.035,C.dark,6,5);g.sphere(-.03,.43,0,.28,C.white,6,0,9,5,[1.35,.72,.67]);g.sphere(.29,.64,0,.13,C.white,6,0,8,5,[.8,1.1,.8]);g.sphere(.38,.59,0,.09,C.edge,6,0,7,4,[1,.7,.8]);for(const z of[-.075,.075]){g.tube([.27,.73,z],[.22,.86,z],.022,.009,C.edge,1,5);g.sphere(.345,.68,z,.012,C.dark,6,0,5,3);}g.tube([-.35,.46,0],[-.42,.55,0],.03,.015,C.white,6,5);return;}
 const scale=k==='sparrow'?.55:k==='duck'?.88:.76,gg=local(m,{...p,scale,sy:1}),col=k==='duck'?C.white:k==='hen'?C.edge:[.48,.46,.35];
 gg.sphere(0,.27,0,.22,col,6,0,9,5,[1.25,.78,.83]);gg.sphere(-.04,.29,.14,.14,k==='duck'?C.cloth:C.wood,6,0,8,4,[1.1,.55,.22]);gg.sphere(.20,.46,0,.10,k==='duck'?C.green:col,6,0,7,4);gg.tube([.27,.44,0],[.38,.43,0],.038,.004,C.brass,6,5);gg.sphere(.245,.49,.07,.014,C.dark,6,0,5,3);for(const z of[-.08,.08]){gg.tube([0,.17,z],[.02,.025,z],.012,.01,C.brass,6,4);gg.tube([.02,.025,z],[.13,.02,z],.01,.004,C.brass,6,4);}gg.tube([-.19,.27,0],[-.34,.37,0],.07,.015,C.wood,6,5);if(k==='hen')gg.sphere(.19,.56,0,.055,C.red,6,0,5,3,[1,.6,.4]);
}
function remote(mesh,p,phase){if(p.inset)return;const a=p.anchor;mesh.box(a.x,.035,a.z,.38,.045,.32,C.wood,2);mesh.box(a.x,.065,a.z,.22,.025,.18,phase===2?C.cloth:C.edge,6);mesh.tube([a.x,.018,a.z],[p.x,.018,p.z],.009,.009,C.metal,1,4);}
export function appendAdventureLivingStatic(mesh,{world,objects}={}){
 if(!world?.scene)return mesh;
 for(const o of candidates(world,objects)){
  const family=livingContentFamily(world,o);if(!family.startsWith('craft:')&&family!=='stable')continue;
  const p=placement(world,o),g=local(mesh,p);if(family==='stable'){
   g.box(0,.08,0,1.22,.14,.58,C.wood,2);g.box(0,.17,0,1.10,.03,.46,C.green,5);if(!p.inset){rack(g,1.6,1.32);g.quad([-.83,1.47,-.43],[.83,1.47,-.43],[.70,1.68,.40],[-.70,1.68,.40],C.cloth,6);}remote(mesh,p,0);
  }
 }
 return mesh;
}
export function appendAdventureLivingDynamic(mesh,glow,{world,objects,time=0,feedback,range=20}={}){
 if(!world?.scene)return mesh;
 for(const o of candidates(world,objects)){
  if(!close(world,o,range))continue;const family=livingContentFamily(world,o),at=point(o);
  if(family==='plant')plant(local(mesh,{...at,scale:o.regionalCompact?.68:.88,sy:1}),o,world,time);
  else if(family.startsWith('fauna:'))fauna(mesh,glow,world,o,time);
  else if(family.startsWith('craft:')){const p=placement(world,o),s=workState(world,o,feedback);craft(local(mesh,p),family.slice(6),s,time);remote(mesh,p,s.phase);}
 }
 const r=world.state.trailLife?.relay;if(r?.scene===world.state.scene)for(let i=0;i<r.gates.length;i++){
  const [x,z]=r.gates[i];if(Math.hypot(x-world.state.x,z-world.state.y)>range)continue;
  const done=i<r.index,active=i===r.index,c=done?C.cloth:active?C.warm:C.metal;
  // Low actual floor hardware marks the running targets without a new blocker.
  for(const dx of[-.45,.45]){mesh.cylinder(x+dx,.065,z,.07,.12,C.metal,1,7);mesh.sphere(x+dx,.15,z,.055,c,done||active?4:1,active?.2:0,6,4);}
  mesh.box(x,.025,z,.83,.018,.10,c,6);if(active)for(let j=0;j<3;j++)mesh.box(x-.18+j*.18,.046,z,.11,.018,.19,C.warm,6);
 }
 return mesh;
}
/** Direct descriptors use the renderer's ordinary GPU/software sprite path. */
export function adventureLivingSprites({world,objects,time=0,assets={},bounds={},range=24}={}){
 if(!world?.scene)return[];const list=[];
 for(const o of candidates(world,objects)){
  const kind=o.lifeKind;if(!PET_HEIGHT[kind]||!assets.village?.width||!close(world,o,range))continue;
  const pose=villagePose(o,time),[x,y,w,h]=VILLAGE_FRAMES[kind][pose],base=VILLAGE_FRAMES[kind][0],scale=PET_HEIGHT[kind]/base[3],p=point(o);
  list.push({...petCrop(assets.village,kind,pose,[x,y,w,h]),x:p.x,y:.025,z:p.z,width:w*scale,height:h*scale,anchorX:.5,anchorY:1,flip:o.facing===-1,alpha:1,lifeKind:kind});
 }
 const image=assets.bestiary;if(image?.width){const src=bounds.bestiary?.[0]||{x:0,y:0,w:image.width/4,h:image.height/3};
  const add=(x,z,height,flip=false)=>{const scale=height/(src.bodyHeight||src.h);list.push({image,source:src,x,y:.025,z,width:src.w*scale,height:src.h*scale,anchorX:(src.anchorX??src.w/2)/src.w,anchorY:(src.anchorY??src.h)/src.h,flip,alpha:1,lifeKind:'mossback'});};
  for(const o of candidates(world,objects))if(livingContentFamily(world,o)==='stable'&&close(world,o,range)&&!world.trailLife?.mounted){const p=point(o);add(p.x,p.z,1.25);}
  if(world.trailLife?.mounted)add(world.state.x,world.state.y,1.55,(world.state.facing??1)<0);
 }
 return list;
}
