/** Settlement craft and regional silhouettes, built on real parcels and banks.
 * This replaces selected landscape placeholders; it never invents coordinates,
 * people, inventory, an interaction or a new walkable surface. */
import {adventureLandscapePlan} from './adventure-landscape.js?v=5.42';
import {adventureBuildingPlan} from './adventure-3d-geometry.js?v=5.42';
import {sceneArtSpec} from './scene-art-materials-541.js?v=5.41';
import {isExteriorArtScene,exteriorHeroFeatures} from './exterior-art-selection-541.js?v=5.41';
import {exteriorAnchorSites} from './exterior-anchor-plan-541.js?v=5.42';
import {appendExteriorAnchorModel,appendExteriorAnchorDynamics} from './exterior-anchor-models-541.js?v=5.41';

const TAU=Math.PI*2,CACHE=new WeakMap();
const tint=(c,n)=>c.map(v=>Math.max(0,Math.min(1,v*n)));
const mix=(a,b,n)=>a.map((v,i)=>v*(1-n)+b[i]*n);
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const WARM=rgb('#e7bd76'),CERAMIC=rgb('#c9c7aa'),COPPER=rgb('#a97a49');
const kinds={village:'canopy',woodland:'canopy',mangrove:'roots',spore:'collector',sand:'aqueduct',cactus:'cactus',coral:'coral',salt:'tideglass',riverbank:'waterwheel',highland:'windharp',storm:'windharp',foundry:'conduit',lava:'basalt',caldera:'basalt',crystal:'mineral',ice:'ice-rib',aurora:'aurora-rib',ruins:'ruin',marble:'marble'};
const range=(n,fn)=>{for(let i=0;i<n;i++)fn(i);};

export function exteriorArtPlan(world,{objects,exteriorSites}={}){
 const scene=world?.scene;if(!isExteriorArtScene(scene))return{active:false,heroes:[],buildings:[],waterSites:[],family:null};
 const landscape=adventureLandscapePlan(world),buildings=adventureBuildingPlan(world),old=CACHE.get(scene);
 if(old?.landscape===landscape&&old.buildingSource===buildings&&(!exteriorSites||old.sites===exteriorSites))return old.plan;
 const spec=sceneArtSpec(world),family=landscape.family,market=/market|hub/.test(scene.key||'');
 const heroes=exteriorHeroFeatures(scene,landscape.features).map(f=>({...f,kind:market?'pavilion':kinds[family]||'canopy'}));
 const waterSites=[];
 // Brine and river banks deliberately have no old tree placeholders. A pair
 // of shore stations belongs to the actual shoreline next to native anchors.
 if(!heroes.length&&landscape.water){
  const anchors=(scene.objects||[]).filter(o=>!o.hidden&&Array.isArray(o.xy)&&['puzzle','switch','frontier-landmark','portal','camp','project'].includes(o.type));
  const candidates=[];
  for(const s of landscape.shore.filter(p=>!p.near))for(const[dx,dz]of[[0,-2],[-2,0],[2,0],[0,2],[0,-3],[-3,0],[3,0],[0,3]]){
   const x=s.x+dx,z=s.z+dz;if(!landscape.closedPatch(x,z,1.36))continue;
   const distance=anchors.length?Math.min(...anchors.map(o=>Math.hypot(x-o.xy[0]-.5,z-o.xy[1]-.5))):Math.hypot(x-(landscape.bounds.x0+landscape.bounds.x1)/2,z-landscape.bounds.z0);
   candidates.push({x,z,y:.018,index:waterSites.length,kind:kinds[family]||'waterwheel',distance,shore:true});
  }
  candidates.sort((a,b)=>a.distance-b.distance||a.z-b.z||a.x-b.x);
  for(const p of candidates)if(waterSites.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>7)){waterSites.push({...p,index:waterSites.length});if(waterSites.length===2)break;}
 }
 const anchorSites=exteriorSites||exteriorAnchorSites(world,{objects,landscapePlan:landscape});
 const clear=p=>anchorSites.every(site=>Math.hypot(site.x-p.x,site.z-p.z)>=3.1);
 const plan={active:true,family,spec,heroes:heroes.filter(clear),waterSites:waterSites.filter(clear),anchorSites,landscape,buildings:buildings.filter(b=>b.kind!=='underground').map(b=>({...b,bodyRects:b.bodyRects.filter(r=>r.w>.45&&r.d>.45)}))};
 CACHE.set(scene,{landscape,buildingSource:buildings,sites:exteriorSites,plan});return plan;
}

function local(mesh,p){
 return{box:(x,y,z,w,h,d,c,mat=6,em=0,rot=0)=>mesh.box(p.x+x,p.y+y,p.z+z,w,h,d,c,mat,em,rot),
  tube:(a,b,r0,r1,c,mat=6,n=6,em=0)=>mesh.tube([p.x+a[0],p.y+a[1],p.z+a[2]],[p.x+b[0],p.y+b[1],p.z+b[2]],r0,r1,c,mat,n,em),
  sphere:(x,y,z,r,c,mat=6,em=0,n=7,rows=3,shape=[1,1,1])=>mesh.sphere(p.x+x,p.y+y,p.z+z,r,c,mat,em,n,rows,shape),
  cylinder:(x,y,z,r,h,c,mat=6,n=8,rt=r,em=0)=>mesh.cylinder(p.x+x,p.y+y,p.z+z,r,h,c,mat,n,rt,em),
  quad:(a,b,c,d,col,mat=6,em=0,alpha=1,n=null)=>mesh.quad(...[a,b,c,d].map(v=>[p.x+v[0],p.y+v[1],p.z+v[2]]),col,mat,em,alpha,n),
  tri:(a,b,c,col,mat=6,em=0)=>mesh.tri(...[a,b,c].map(v=>[p.x+v[0],p.y+v[1],p.z+v[2]]),col,mat,em)};
}
function rockFoot(g,c,h=.30){
 const rim=[];for(let i=0;i<8;i++){const a=i*TAU/8,r=1.14+(i%3)*.09;rim.push([Math.cos(a)*r,Math.sin(a)*r*.78,h*(.76+(i%3)*.12)]);}
 for(let i=0;i<8;i++){const a=rim[i],b=rim[(i+1)%8];g.quad([a[0],-.08,a[1]],[b[0],-.08,b[1]],[b[0]*.88,b[2],b[1]*.88],[a[0]*.88,a[2],a[1]*.88],tint(c.rock,.74+(i%3)*.07),6.25);g.tri([0,h,0],[a[0]*.88,a[2],a[1]*.88],[b[0]*.88,b[2],b[1]*.88],tint(c.rock,.96+(i%2)*.06),6.25);}
}
function arch(g,c,{radius=1.03,height=1.24,depth=.33,thickness=.29,material=6.25,broken=false}={}){
 for(let i=0;i<12;i++){
  if(broken&&i>8&&i<11)continue;const a=i*Math.PI/12,b=(i+1)*Math.PI/12,R=radius,r=R-thickness,z=depth/2;
  const p=(t,rr,zz)=>[Math.cos(t)*rr,height+Math.sin(t)*rr,zz];
  g.quad(p(a,r,z),p(a,R,z),p(b,R,z),p(b,r,z),tint(c.wall,.88+(i%3)*.045),material);
  g.quad(p(a,R,-z),p(a,r,-z),p(b,r,-z),p(b,R,-z),tint(c.wall,.82),material);
  g.quad(p(a,R,z),p(a,R,-z),p(b,R,-z),p(b,R,z),tint(c.edge,.80),6);
  g.quad(p(a,r,-z),p(a,r,z),p(b,r,z),p(b,r,-z),tint(c.wall,.58),6);
 }
 for(const side of[-1,1]){g.box(side*(radius-thickness/2),height/2,0,thickness,height,depth,c.wall,material);g.box(side*(radius-thickness/2),.12,0,thickness+.17,.24,depth+.22,tint(c.edge,.82),6);}
}
function canopy(g,c,roots=false,index=0){
 const wood=mix(c.dark,c.rock,.38),leaf=c.foliage;
 if(roots)for(let i=0;i<5;i++){const a=i*TAU/5+.22;g.tube([Math.cos(a)*1.13,.02,Math.sin(a)*1.07],[Math.cos(a)*.48,1.10,Math.sin(a)*.45],.12,.10,wood,2,6);g.tube([Math.cos(a)*.48,1.10,Math.sin(a)*.45],[0,1.72,0],.10,.17,wood,2,6);}
 else for(let i=0;i<4;i++){const a=i*TAU/4+.31;g.tube([Math.cos(a)*.81,.04,Math.sin(a)*.81],[0,.69,0],.13,.17,wood,2,6);}
 g.tube([0,.12,0],[-.12,1.62,.07],.29,.23,wood,2,8);g.tube([-.12,1.62,.07],[.13,2.69,-.13],.23,.14,wood,2,7);
 for(let i=0;i<4;i++){const a=i*TAU/4+.4+index*.11,x=Math.cos(a)*.91,z=Math.sin(a)*.83,y=2.75+(i%2)*.47;
  g.tube([.02,2.01,0],[x,y,z],.13,.045,wood,2,6);g.sphere(x,y+.23,z,.93,tint(leaf,.79+i*.055),5,0,8,4,[1,.58,1]);
 }
 // Broad leaf planes join the canopy, rather than a spray of subpixel dots.
 for(let i=0;i<3;i++){const a=i*TAU/3+.2,x=Math.cos(a)*.52,z=Math.sin(a)*.52;g.sphere(x,3.66,z,.79,tint(leaf,1.04),5,0,7,3,[1,.55,1]);}
}
function rainCollector(g,c){
 rockFoot(g,c,.20);g.cylinder(0,.44,0,.81,.20,c.metal,6,10,.91);
 for(let i=0;i<10;i++){const a=i*TAU/10,b=(i+1)*TAU/10;g.quad([Math.cos(a)*.37,.34,Math.sin(a)*.37],[Math.cos(a)*.94,.62,Math.sin(a)*.94],[Math.cos(b)*.94,.62,Math.sin(b)*.94],[Math.cos(b)*.37,.34,Math.sin(b)*.37],tint(c.accent,.78+(i%3)*.07),6);}
 for(const[x,z,h,r]of[[-.49,-.19,2.55,.94],[.50,.18,3.10,.83]]){
  g.tube([x,.50,z],[x-.10,h-.10,z+.05],.12,.085,tint(c.wall,.80),6,8);g.sphere(x-.10,h,z+.05,r,mix(c.foliage,c.accent,.28),5,0,9,4,[1,.32,1]);
  for(let i=0;i<6;i++){const a=i*TAU/6;g.tube([x-.1,h-.08,z+.05],[x-.1+Math.cos(a)*r*.88,h-.17,z+.05+Math.sin(a)*r*.88],.022,.040,CERAMIC,6,4);}
 }
}
function aqueduct(g,c){rockFoot(g,c,.18);arch(g,c,{radius:1.18,height:1.13,thickness:.32,depth:.52});for(const side of[-1,1])for(const y of[.48,.91])g.box(side*1.02,y,.275,.36,.045,.027,tint(c.dark,.94),6);g.box(0,.15,-.50,1.5,.18,.32,tint(c.wall,.78),6.25);}
function cactus(g,c){
 rockFoot(g,c,.19);const green=mix(c.foliage,c.accent,.16);g.cylinder(0,1.45,0,.34,2.7,green,5,10,.25);
 for(const side of[-1,1]){g.tube([0,1.13+side*.16,0],[side*.70,1.25+side*.16,.03],.16,.14,tint(green,.84),5,7);g.cylinder(side*.70,1.80+side*.16,.03,.14,1.10,green,5,8,.11);}
 for(let i=0;i<8;i++){const a=i*TAU/8;g.tube([Math.cos(a)*.341,.28,Math.sin(a)*.341],[Math.cos(a)*.27,2.64,Math.sin(a)*.27],.012,.012,tint(green,1.26),6,4);}
 for(let i=0;i<5;i++){const a=i*TAU/5;g.sphere(Math.cos(a)*.15,2.91,Math.sin(a)*.15,.14,mix(c.accent,WARM,.48),6,0,6,3,[1,.5,1]);}
}
function mineral(g,c,kind){
 rockFoot(g,c,.35);const cool=kind==='mineral'?mix(c.accent,rgb('#bda7dc'),.26):mix(c.accent,CERAMIC,.30);
 for(let i=0;i<3;i++){const x=(i-1)*.58,z=(i%2)*.26-.15,h=i===1?3.24:2.28,r=i===1?.37:.32,lean=(i-1)*.27;
  g.tube([x,.22,z],[x+lean,h*.69,z-.08],r,r*.90,tint(cool,.74+i*.08),6,5);g.tube([x+lean,h*.69,z-.08],[x+lean*1.22,h,z-.10],r*.90,0,tint(cool,1.01),6,5);
  g.tube([x-r*.41,.42,z+r*.76],[x+lean-r*.33,h*.66,z+r*.62],.025,.020,mix(CERAMIC,c.accent,.35),6,4);
 }
 if(kind!=='mineral'){g.tube([-.84,1.18,0],[-.64,2.18,.06],.19,.14,cool,6,5);g.tube([-.64,2.18,.06],[.03,2.69,.06],.14,.08,cool,6,5);g.tube([.03,2.69,.06],[.71,2.23,.05],.08,.15,cool,6,5);}
}
function windHarp(g,c){
 rockFoot(g,c,.44);const metal=c.metal;
 for(const side of[-1,1]){g.tube([side*.75,.26,.17],[side*.64,2.77,.03],.105,.075,metal,1,7);g.box(side*.65,2.02,.03,.16,.09,.18,COPPER,6);}
 g.tube([-.64,2.77,.03],[0,3.19,-.03],.075,.075,COPPER,6,6);g.tube([0,3.19,-.03],[.64,2.77,.03],.075,.075,COPPER,6,6);
 for(let i=0;i<5;i++){const x=(i-2)*.22;g.tube([x,.74,.05],[x,2.80-Math.abs(x)*.27,.05],.022,.022,tint(c.edge,.90),6,4);}
 g.cylinder(0,3.37,-.03,.055,.50,COPPER,6,7,.04);g.box(0,.52,.30,.72,.18,.30,tint(c.rock,.76),6.25);
}
function conduit(g,c,hot=false){
 rockFoot(g,c,.34);const m=mix(c.metal,COPPER,.28),ceramic=hot?mix(CERAMIC,c.wall,.35):CERAMIC;
 for(const side of[-1,1]){g.tube([side*.86,.28,0],[side*.86,1.92,0],.23,.23,m,1,9);g.tube([side*.86,1.92,0],[side*.47,2.60,-.02],.23,.23,m,1,8);g.tube([side*.47,2.60,-.02],[0,2.75,-.02],.23,.22,m,1,8);
  for(const y of[.54,.72,.90])g.cylinder(side*.86,y,0,.29,.10,ceramic,6,10,.29);
 }
 g.box(0,.67,.11,.72,.86,.55,tint(c.dark,.95),6);g.box(0,.79,.398,.54,.47,.025,hot?rgb('#be7442'):c.accent,6,hot?.18:.035);
 for(const x of[-.18,0,.18])g.box(x,.79,.421,.034,.44,.035,c.metal,6);
 if(hot)for(const side of[-1,1])g.quad([side*.21,.08,.38],[side*.21,.08,.73],[side*.40,.08,.81],[side*.40,.08,.35],rgb('#a76038'),6,.14);
}
function ruin(g,c,marble=false){
 rockFoot(g,c,.25);arch(g,{...c,wall:marble?mix(c.wall,CERAMIC,.42):c.wall},{radius:1.09,height:1.16,thickness:.33,depth:.46,broken:true});
 for(const side of[-1,1]){for(const x of[-.085,.085])g.tube([side*.92+x,.30,.237],[side*.92+x,1.39,.237],.025,.025,tint(c.edge,.86),6,4);g.box(side*.92,1.19,0,.48,.12,.59,c.edge,6);}
 const leaf=mix(c.foliage,c.dark,.18);for(let i=0;i<4;i++){const y=.75+i*.36,x=-.92+(i%2)*.10;g.quad([x-.10,y-.10,.26],[x-.17,y+.03,.26],[x+.05,y+.20,.26],[x+.13,y+.06,.26],leaf,6);}
}
function coral(g,c){
 rockFoot(g,c,.19);const pink=mix(c.accent,rgb('#c58c80'),.35);
 for(let i=0;i<5;i++){const a=(i-2)*.47,x=Math.sin(a)*.75,z=(i%2)*.28-.14,h=1.32+(i%3)*.40;
  g.tube([0,.18,0],[x,h*.65,z],.16,.12,tint(pink,.78+i*.045),6,7);g.tube([x,h*.65,z],[x*1.30,h,z-.11],.12,.085,pink,6,6);g.sphere(x*1.30,h,z-.11,.17,tint(pink,1.06),6,0,6,3);
 }
 g.cylinder(-.62,.57,.30,.30,.70,mix(c.foliage,c.accent,.35),6,9,.36);g.cylinder(-.62,.94,.30,.26,.045,c.dark,6,9,.26);
}
function tideStation(g,c,wheel=false){
 for(const side of[-1,1]){g.cylinder(side*.83,.61,0,.15,2.12,c.metal,6,8,.11);g.cylinder(side*.83,1.40,0,.20,.11,CERAMIC,6,10,.19);g.box(side*.83,1.10,.16,.20,.53,.035,c.edge,6);for(const y of[.90,1.07,1.24])g.box(side*.83,y,.184,.16,.025,.018,c.dark,6);}
 g.tube([-.83,1.59,0],[.83,1.59,0],.09,.09,c.metal,6,8);
 if(!wheel){for(let i=0;i<3;i++){const x=(i-1)*.46;g.tube([x,-.26,.16],[x,.75,.16],.11,.075,CERAMIC,6,5);g.tube([x,.75,.16],[x+.13,1.15,.15],.075,0,mix(c.accent,CERAMIC,.45),6,5);}}
 else{g.tube([0,.71,-.44],[0,.71,.43],.11,.11,c.metal,1,8);for(let i=0;i<12;i++){const a=i*TAU/12,b=(i+1)*TAU/12;g.tube([Math.cos(a)*.64,.71+Math.sin(a)*.64,.32],[Math.cos(b)*.64,.71+Math.sin(b)*.64,.32],.055,.055,COPPER,6,5);if(i%2===0)g.tube([0,.71,.32],[Math.cos(a)*.64,.71+Math.sin(a)*.64,.32],.040,.040,c.metal,6,4);}}
}
function pavilion(g,c){
 for(const x of[-1.08,1.08])for(const z of[-.89,.89]){g.cylinder(x,1.32,z,.075,2.64,c.metal,2,7,.06);g.box(x,.14,z,.22,.28,.22,c.rock,6);}
 const cloth=mix(c.accent,c.foliage,.20);
 for(let i=0;i<6;i++){const x0=-1.20+i*.40,x1=x0+.40,h0=2.70+.36*(1-Math.abs((x0+.2)/1.2));g.quad([x0,2.62,-1.0],[x1,2.62,-1.0],[x1,h0,.02],[x0,h0,.02],tint(i%2?cloth:CERAMIC,.90),6);g.quad([x0,h0,.02],[x1,h0,.02],[x1,2.48,1.02],[x0,2.48,1.02],tint(i%2?cloth:CERAMIC,1.02),6);}
 g.box(0,1.05,-.29,1.75,.10,.73,mix(c.wall,c.dark,.32),2);for(const x of[-.66,.66])g.box(x,.57,-.29,.10,.96,.51,c.metal,2);
 for(const x of[-.50,0,.50]){g.cylinder(x,1.28,-.30,.14,.34,CERAMIC,6,8,.17);g.cylinder(x,1.47,-.30,.11,.035,c.dark,6,8,.11);}
}

function hero(mesh,p,c){
 const g=local(mesh,p);switch(p.kind){
  case'canopy':canopy(g,c,false,p.index);break;case'roots':canopy(g,c,true,p.index);break;
  case'collector':rainCollector(g,c);break;case'aqueduct':aqueduct(g,c);break;case'cactus':cactus(g,c);break;
  case'mineral':case'ice-rib':case'aurora-rib':mineral(g,c,p.kind);break;case'windharp':windHarp(g,c);break;
  case'conduit':conduit(g,c,false);break;case'basalt':conduit(g,c,true);break;case'ruin':ruin(g,c,false);break;case'marble':ruin(g,c,true);break;
  case'coral':coral(g,c);break;case'waterwheel':tideStation(g,c,true);break;case'tideglass':tideStation(g,c,false);break;case'pavilion':pavilion(g,c);break;
 }
}

function buildingCraft(mesh,b,c,limit){
 let count=0;
 for(const r of b.bodyRects){if(count++>=limit)break;const x=r.x+r.w/2,z=r.z+r.d/2,h=b.height,wide=r.w>=r.d,peak=h+Math.min(.70,Math.max(.30,Math.min(r.w,r.d)*.32));
  const masonry=mix(c.wall,CERAMIC,.18),edge=mix(c.edge,CERAMIC,.16),metal=b.industrial?c.metal:mix(c.metal,COPPER,.28);
  mesh.box(x,.16,z,r.w,.22,r.d,tint(c.rock,.81),6.25);
  for(const dx of[-1,1])for(const dz of[-1,1])mesh.box(x+dx*(r.w/2-.065),h/2+.06,z+dz*(r.d/2-.065),.10,h+.12,.10,edge,6);
  // Barge boards and long standing seams follow the existing roof planes.
  if(wide){
   for(const dz of[-1,1])mesh.box(x,h+.018,z+dz*r.d/2,r.w,.075,.065,edge,6);
   const n=Math.min(8,Math.max(2,Math.floor(r.w/.7)));for(let i=1;i<n;i++){const xx=r.x+r.w*i/n;for(const side of[-1,1])mesh.quad([xx-.022,h+.025,z+side*r.d/2],[xx+.022,h+.025,z+side*r.d/2],[xx+.022,peak+.025,z],[xx-.022,peak+.025,z],metal,6);}
  }else{
   for(const dx of[-1,1])mesh.box(x+dx*r.w/2,h+.018,z,.065,.075,r.d,edge,6);
   const n=Math.min(8,Math.max(2,Math.floor(r.d/.7)));for(let i=1;i<n;i++){const zz=r.z+r.d*i/n;for(const side of[-1,1])mesh.quad([x+side*r.w/2,h+.025,zz-.022],[x,peak+.025,zz-.022],[x,peak+.025,zz+.022],[x+side*r.w/2,h+.025,zz+.022],metal,6);}
  }
  const dx=b.entrance.x-x,dz=b.entrance.z-z,axis=Math.abs(dx)/(r.w||1)>Math.abs(dz)/(r.d||1)?'x':'z',sign=axis==='x'?(dx<0?-1:1):(dz<0?-1:1),span=axis==='x'?r.d:r.w,half=axis==='x'?r.w/2:r.d/2;
  const pos=(u,y,out=.018)=>axis==='x'?[x+sign*(half+out),y,z+u]:[x+u,y,z+sign*(half+out)];
  const panel=(u,y,w,hh,col,out=.018,mat=6,em=0)=>{const a=pos(u-w/2,y-hh/2,out),bb=pos(u+w/2,y-hh/2,out),cc=pos(u+w/2,y+hh/2,out),d=pos(u-w/2,y+hh/2,out);if((axis==='z'&&sign>0)||(axis==='x'&&sign<0))mesh.quad(a,bb,cc,d,col,mat,em);else mesh.quad(bb,a,d,cc,col,mat,em);};
  if(span>1.15){const n=span>2.7?2:1;for(let i=0;i<n;i++){const u=n===1?0:(i-.5)*Math.min(1.45,span*.47),ww=Math.min(.67,span*.55),yy=1.55;
   panel(u,yy,ww+.16,.93,tint(c.dark,.80));panel(u,yy,ww,.76,mix(WARM,c.accent,.25),.025,6,.04);
   panel(u,yy,.045,.80,metal,.031);panel(u,yy,ww,.045,metal,.034);
   for(const d of[-1,1]){panel(u+d*(ww/2+.045),yy,.065,.91,edge,.035);panel(u,yy+d*.43,ww+.12,.065,edge,.035);}
   // The shallow copper box and trained leaves stay on the wall's inset.
   panel(u,1.04,ww+.11,.19,metal,.039);panel(u,1.14,ww+.12,.035,edge,.041);
   for(let j=0;j<3;j++){const uu=u+(j-1)*ww*.25;const a=pos(uu-.12,1.15,.045),bb=pos(uu-.17,1.36,.045),cc=pos(uu+.03,1.51+(j%2)*.10,.045),d=pos(uu+.11,1.31,.045);if((axis==='z'&&sign>0)||(axis==='x'&&sign<0))mesh.quad(a,bb,cc,d,tint(c.foliage,.82+j*.08),6);else mesh.quad(bb,a,d,cc,tint(c.foliage,.82+j*.08),6);}
  }}
  // A substantial amber bulkhead marks the useful facade without UI text.
  if(span>1.0){panel(0,h-.34,.31,.36,metal,.029);panel(0,h-.34,.21,.25,WARM,.041,6,.16);panel(0,h-.34,.028,.26,c.dark,.045);}
 }
 return count;
}

export function appendExteriorArt(mesh,{world,objects,exteriorSites}={}){
 const plan=exteriorArtPlan(world,{objects,exteriorSites});if(!plan.active)return plan;const start=mesh.v.length,c=plan.spec.palette;
 for(const p of[...plan.heroes,...plan.waterSites])hero(mesh,p,c);
 for(const site of plan.anchorSites)appendExteriorAnchorModel(mesh,site,plan.spec);
 let bodies=0;for(const b of plan.buildings){const left=12-bodies;if(left<=0)break;bodies+=Math.min(left,b.bodyRects.length);buildingCraft(mesh,b,c,left);}
 mesh.exteriorArt541={family:plan.family,landmarkKinds:[...plan.heroes,...plan.waterSites,...plan.anchorSites].map(p=>p.kind),heroSites:plan.heroes.length+plan.waterSites.length+plan.anchorSites.length,arrivalSites:plan.anchorSites.filter(s=>s.arrival).length,craftedBuildings:plan.buildings.filter(b=>b.bodyRects.length).length,craftedBodies:bodies,triangles:(mesh.v.length-start)/36};return plan;
}

export function appendExteriorArtDynamics(mesh,glow,{world,time=0}={}){
 const plan=exteriorArtPlan(world);if(!plan.active||!Number.isFinite(time))return null;const start=mesh.v.length,c=plan.spec.palette;
 for(const site of plan.anchorSites)appendExteriorAnchorDynamics(mesh,site,plan.spec,time);
 for(const p of plan.heroes){const g=local(mesh,p);
  if(p.kind==='windharp'){
   const a=Math.sin(time*.31+p.index)*.24,xx=.58*Math.cos(a),zz=.58*Math.sin(a);g.tri([0,3.52,-.03],[xx,3.52,zz-.03],[xx*.43,3.79,zz*.43-.03],COPPER,6);g.tri([0,3.52,-.03],[xx*.43,3.79,zz*.43-.03],[-xx*.27,3.60,-zz*.27-.03],tint(c.edge,.9),6);
  }else if(p.kind==='pavilion'){
   for(let i=0;i<6;i++){const x=-1.20+i*.4,y=2.48,drop=.23+.045*Math.sin(time*1.45+i*.62+p.index);g.quad([x,y,1.02],[x+.4,y,1.02],[x+.4,y-drop,1.04],[x,y-drop*.89,1.04],i%2?c.accent:CERAMIC,6);}
  }
 }
 return{triangles:(mesh.v.length-start)/36};
}
