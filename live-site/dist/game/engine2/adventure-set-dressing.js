/** Grounded scenery for the whole ordinary adventure. Presentation only:
 * every raised footprint is checked against the authored closed mask and all
 * thresholds, while room details stay within existing furniture footprints.
 * No scenery creates collision, awards an item or reveals a hidden object.
 */
import {isInteriorScene} from './scene-identity.js?v=4.0.0';
import {environmentFor} from './environment.js?v=5.18.0';

const TAU=Math.PI*2,CACHE=new WeakMap();
const HOME_KEYS=new Set(['home','inn','guild','clinic','carpenter']);
const tint=(c,n)=>c.map(v=>Math.max(0,Math.min(1,v*n)));
const hash=(x,z,s=0)=>{let n=Math.imul(Math.floor(x)+419,374761393)^Math.imul(Math.floor(z)+701,668265263)^s;n=Math.imul(n^n>>>13,1274126177);return((n^n>>>16)>>>0)/4294967296;};
const COL={wood:[.32,.22,.145],bark:[.22,.26,.18],leaf:[.24,.37,.22],lightLeaf:[.43,.51,.27],stone:[.34,.40,.38],pale:[.61,.65,.56],metal:[.18,.28,.29],brass:[.53,.40,.22],cloth:[.35,.48,.45],cream:[.74,.72,.58],water:[.13,.33,.35],ember:[.87,.37,.15],ice:[.51,.71,.75],purple:[.47,.38,.59],earth:[.29,.28,.21]};

export function adventureSetFamily(world){
 const s=world?.scene||{},interior=isInteriorScene(s),style=environmentFor(s)?.style||'village';
 if(/^secret_/.test(s.key||''))return null;
 if(interior&&!s.originId&&!HOME_KEYS.has(s.key))return null;
 if(interior){const kind=s.household?.kind||s.interior||s.key;return /archive/.test(kind)?'archive':/workshop|instrumentworks/.test(kind)?'workshop':/clinic/.test(kind)?'clinic':/inn|quarters/.test(kind)?'lodging':/guild/.test(kind)?'guild':/carpenter/.test(kind)?'carpenter':'home';}
 if(/brass-rail/.test(s.originId||''))return'railway';
 if(/sand/.test(style))return'dunes';if(/salt/.test(style))return'salt';if(/cactus/.test(style))return'cactus';if(/lava/.test(style))return'caldera';if(/coral/.test(style))return'coral';if(/mangrove/.test(style))return'mangrove';if(/crystal/.test(style))return'crystal';if(/ice/.test(style))return'glacier';if(/aurora/.test(style))return'aurora';if(/spore/.test(style))return'spore';if(/storm/.test(style))return'storm';if(/marble/.test(style))return'marble';if(/river|water/.test(style))return'waterfront';if(/woodland/.test(style))return'woodland';if(/foundry/.test(style))return'foundry';if(/highland/.test(style))return'highland';if(/ruin/.test(style))return'ruins';return'village';
}

/** Public layout evidence is also used by the renderer. Large scenery is
 * limited to closed footprints on the far/side of the walkable boundary.
 * The near edge remains low so a tree canopy cannot cover the traveller.
 */
export function adventureSetDressingPlan(world){
 const s=world?.scene;if(!s?.floor)return{family:null,interior:false,sites:[],banks:[],furniture:[],wallDetails:[]};
 const family=adventureSetFamily(world),interior=isInteriorScene(s),floor=s.household?.floorBase||s.floor;
 const signature=[family,s.floor.join(''),floor.join(''),JSON.stringify(s.household?.partitions||[])].join('|'),cached=CACHE.get(s);if(cached?.signature===signature)return cached.plan;
 const width=s.width||s.floor[0]?.length||0,height=s.height||s.floor.length,open=(x,z)=>floor[z]?.[x]==='.'||s.floor[z]?.[x]==='.';
 const objects=s.objects||[],doors=[...(s.doors||[]),...objects.filter(o=>o.type==='portal'||o.buildingEntrance)].filter(o=>o.xy),reserved=objects.filter(o=>o.xy&&o.type!=='furnishing');
 const closed=(x,z,r)=>{if(x-r<0||z-r<0||x+r>width||z+r>height)return false;for(let zz=Math.floor(z-r);zz<=Math.floor(z+r);zz++)for(let xx=Math.floor(x-r);xx<=Math.floor(x+r);xx++)if(open(xx,zz))return false;return !objects.some(o=>o.footprint&&x+r>o.footprint.x&&x-r<o.footprint.x+o.footprint.w&&z+r>o.footprint.y&&z-r<o.footprint.y+o.footprint.h);};
 const clear=(x,z,r)=>!doors.some(o=>Math.hypot(x-o.xy[0]-.5,z-o.xy[1]-.5)<r+1.7)&&!reserved.some(o=>Math.hypot(x-o.xy[0]-.5,z-o.xy[1]-.5)<r+1.05);
 const sites=[],banks=[],wallDetails=[],furniture=[];
 if(family&&!interior){
  const choices=[],focus=s.authoredOpening?.landmark?.focus||s.authoredOpening?.arrival||s.arrive||[width/2,height/2];
  for(let z=0;z<height;z++)for(let x=0;x<width;x++){
   if(open(x,z))continue;const near=[];for(const [dx,dz]of[[0,1],[1,0],[-1,0],[0,-1]])if(open(x+dx,z+dz))near.push([dx,dz]);
   if(!near.length)continue;
   const px=x+.5,pz=z+.5,n=hash(x,z,s.location||0),far=near.some(([dx,dz])=>dz===1||dx===1);
   if(['salt','coral','mangrove','waterfront'].includes(family)&&clear(px,pz,.18)&&banks.length<56)banks.push({x:px,z:pz,dx:near[0][0],dz:near[0][1],n});
   // A broad footprint is checked for the complete canopy, cactus or crystal.
   const r=['woodland','village','mangrove','spore'].includes(family)?1.08:.72;
   const sx=px-near[0][0]*.75,sz=pz-near[0][1]*.75;
   const approach=Math.hypot(px-focus[0],pz-focus[1])*.012;
   if(far&&closed(sx,sz,r)&&clear(sx,sz,r))choices.push({x:sx,z:sz,r,n,score:n+approach,kind:family});
   else if(far&&closed(px,pz,.38)&&clear(px,pz,.38))choices.push({x:px,z:pz,r:.38,n,score:n+.45+approach,kind:'small-'+family});
  }
  choices.sort((a,b)=>a.score-b.score);
  // Mangrove roots add four complete tubes to each broad tree. The new
  // frontier banks can support more full trees than the old thin islands;
  // keep this legacy scenery entry point within its existing triangle budget.
  const siteLimit=family==='mangrove'?8:12;
  for(const at of choices){if(sites.length>=siteLimit)break;if(sites.some(p=>Math.hypot(p.x-at.x,p.z-at.z)<p.r+at.r+1.5))continue;sites.push(at);}
 }
 if(family&&interior){
  for(const o of objects){const f=o.footprint;if(o.type!=='furnishing'||!f||o.hidden)continue;const x=f.x+f.w/2,z=f.y+f.h/2;if(!Number.isFinite(x+z+f.w+f.h))continue;furniture.push({x,z,w:f.w*.86,d:f.h*.86,id:o.furniture,seed:hash(x,z,s.location||0)});}
  // Shallow mounted panels are on the back face of an actual closed wall.
  const candidates=[];
  for(let z=1;z<height-1;z++)for(let x=1;x<width-1;x++)if(open(x,z)&&!open(x,z-1)&&clear(x+.5,z-.18,.18))candidates.push({x:x+.5,z:z-.18,n:hash(x,z,s.location||0)});
  candidates.sort((a,b)=>a.n-b.n);for(const p of candidates){if(wallDetails.length>=5)break;if(wallDetails.some(v=>Math.hypot(v.x-p.x,v.z-p.z)<3.0))continue;wallDetails.push(p);}
 }
 const plan={family,interior,sites,banks,furniture,wallDetails};CACHE.set(s,{signature,plan});return plan;
}

function trunk(m,x,z,h,r=.13){m.cylinder(x,h/2,z,r,h,COL.bark,2,7,r*.64);for(let i=0;i<3;i++){const a=i*TAU/3;m.tube([x,.18,z],[x+Math.cos(a)*r*2.3,.025,z+Math.sin(a)*r*2.3],.055,.025,COL.bark,2,5);}}
function foliage(m,p,family){
 const{x,z,n}=p,r=p.r,h=1.5+n*.9;
 if(p.kind.startsWith('small-')){
  if(family==='spore'){m.cylinder(x,.42,z,.065,.82,COL.cream,6,7,.045);m.sphere(x,.84,z,.34,COL.purple,5,0,9,4,[1,.27,1]);m.cylinder(x,.82,z,.29,.016,COL.cream,6,9);m.cylinder(x,.06,z,.36,.04,tint(COL.leaf,.55),6,9);return;}
  if(['crystal','aurora','glacier'].includes(family)){const c=family==='aurora'?COL.purple:COL.ice;m.cylinder(x,.40,z,.20,.76,c,6,5,.13);m.cylinder(x,.88,z,.13,.20,tint(c,1.12),6,5,0);return;}
  if(family==='marble'){m.box(x,.12,z,.67,.24,.67,COL.pale,6);m.cylinder(x,.62,z,.20,.82,COL.pale,0,7,.18);m.box(x,1.03,z,.48,.12,.48,COL.pale,6);return;}
  if(family==='coral'){for(const side of[-1,1]){m.tube([x,.08,z],[x+side*.23,.55,z],.06,.025,[.66,.44,.32],6,6);m.tube([x+side*.14,.37,z],[x+side*.10,.73,z+.12],.025,.009,COL.cream,6,5);}return;}
  if(family==='caldera'){m.cylinder(x,.24,z,.30,.48,tint(COL.stone,.55),7,6,.25);m.cylinder(x,.49,z,.20,.025,[.16,.18,.17],6,6);return;}
  if(family==='dunes'||family==='salt'){const c=family==='salt'?COL.cream:[.57,.44,.29];m.box(x,.11,z,.72,.22,.65,c,7);m.box(x-.06,.26,z-.03,.51,.12,.48,tint(c,1.07),6);return;}
  m.sphere(x,.19,z,r,tint(COL.stone,.82+n*.25),7,0,7,4,[1,.62,1]);if(['village','woodland','mangrove'].includes(family))for(let i=0;i<3;i++){const a=i*2.1;m.tube([x,.10,z],[x+Math.cos(a)*.23,.55+n*.25,z+Math.sin(a)*.23],.045,.012,COL.leaf,5,5);}return;
 }
 if(['woodland','village','mangrove'].includes(family)){
  trunk(m,x,z,h*.9,.12);
  for(let i=0;i<3;i++){const a=i*2.1;m.tube([x,h*.60,z],[x+Math.cos(a)*r*.42,h*.93,z+Math.sin(a)*r*.42],.07,.025,COL.bark,2,5);m.sphere(x+Math.cos(a)*r*.23,h+i*.20,z+Math.sin(a)*r*.23,r*.70,tint(family==='mangrove'?COL.cloth:COL.leaf,.80+i*.10),5,0,7,4,[1,.78,1]);}
  if(family==='mangrove')for(let i=0;i<4;i++){const a=i*TAU/4;m.tube([x,h*.50,z],[x+Math.cos(a)*r*.85,.04,z+Math.sin(a)*r*.85],.065,.03,COL.bark,2,6);}return;
 }
 if(family==='cactus'){
  const c=[.34,.46,.32];m.cylinder(x,h*.51,z,.16,h,c,5,8,.11);for(const side of[-1,1]){m.tube([x,h*.40,z],[x+side*.44,h*.50,z],.095,.09,c,5,7);m.cylinder(x+side*.44,h*.65,z,.09,h*.31,c,5,7,.07);}for(const side of[-1,1])m.sphere(x+side*.44,h*.82,z,.075,COL.cream,6,0,6,4);return;
 }
 if(family==='spore'){
  for(let i=0;i<3;i++){const a=i*2.1,px=x+Math.cos(a)*r*.30,pz=z+Math.sin(a)*r*.30,hh=h*(.60+i*.15),rr=r*(.40+i*.10);m.cylinder(px,hh*.5,pz,.07,hh,COL.cream,6,7,.045);m.sphere(px,hh,pz,rr,tint(COL.purple,.72+i*.10),5,0,9,4,[1,.30,1]);m.cylinder(px,hh-.015,pz,rr*.86,.018,COL.cream,6,9);}return;
 }
 if(family==='coral'){
  for(let i=0;i<4;i++){const a=i*TAU/4,h0=.55+n*.55;const end=[x+Math.cos(a)*r*.54,h0,z+Math.sin(a)*r*.54];m.tube([x,.07,z],end,.085,.035,i%2?[.64,.43,.32]:[.38,.58,.53],6,6);for(const side of[-1,1])m.tube([end[0]*.6+x*.4,h0*.7,end[2]*.6+z*.4],[end[0]+side*.16,h0+.27,end[2]],.03,.012,COL.cream,6,5);}return;
 }
 if(['crystal','glacier','aurora'].includes(family)){
  for(let i=0;i<3;i++){const a=i*TAU/3,px=x+Math.cos(a)*r*.36,pz=z+Math.sin(a)*r*.36,hh=h*(.65+i*.22),rr=r*(.22+i*.05),c=family==='glacier'?COL.ice:family==='aurora'?COL.purple:COL.cloth;m.cylinder(px,hh*.42,pz,rr,hh*.84,c,6,5,rr*.72);m.cylinder(px,hh*.92,pz,rr*.72,hh*.16,tint(c,1.14),6,5,0);}
  return;
 }
 if(family==='dunes'||family==='salt'){
  for(let i=0;i<3;i++){const off=(i-1)*.24,col=family==='salt'?COL.cream:[.57,.44,.29];m.box(x+off,.14+i*.075,z+off*.35,r*1.4-i*.22,.28+i*.08,r*1.3-i*.22,tint(col,.74+i*.10),family==='salt'?6:7,0,(n-.5)*.4);}if(family==='dunes')for(let i=0;i<3;i++)m.tube([x-.2+i*.15,.21,z],[x-.27+i*.15,.65,z+.08],.018,.003,COL.lightLeaf,5,4);return;
 }
 if(family==='caldera'||family==='foundry'){
  for(let i=0;i<4;i++){const a=i*TAU/4,px=x+Math.cos(a)*r*.35,pz=z+Math.sin(a)*r*.35,hh=.6+n*.7+(i%2)*.3;m.cylinder(px,hh*.5,pz,r*.28,hh,tint(COL.stone,.55+i*.05),7,6,r*.25);m.cylinder(px,hh+.01,pz,r*.22,.025,[.17,.19,.18],6,6);}if(family==='foundry'){m.box(x,.78,z,.28,.09,.65,COL.brass,1);m.tube([x,.11,z],[x,.82,z],.055,.055,COL.metal,1,6);}return;
 }
 if(['marble','ruins','highland','storm','railway','waterfront'].includes(family)){
  const col=family==='marble'?COL.pale:COL.stone,hh=family==='marble'?h*1.1:h*.65;
  m.box(x,.12,z,r*1.45,.24,r*1.45,tint(col,.72),6);m.cylinder(x,hh*.5+.18,z,r*.32,hh,col,0,8,r*.28);m.box(x,hh+.20,z,r*.98,.16,r*.98,tint(col,1.08),6);
  if(['storm','railway'].includes(family)){m.tube([x,hh+.26,z],[x,hh+.85,z],.045,.035,COL.metal,1,6);m.box(x,hh+.73,z,.64,.10,.13,COL.brass,1);}return;
 }
}

function crock(m,x,y,z,r=.10,c=COL.cream){m.cylinder(x,y,z,r,r*1.6,c,6,8,r*.75);m.cylinder(x,y+r*.83,z,r*.77,.018,COL.earth,6,8);}
function roomDetails(m,p){
 const family=p.family;
 for(const f of p.furniture){const{x,z,w,d,id,seed:n}=f;
  if([0,11].includes(id)){
   // Folded covers occupy the real mattress, not an extra floor tile.
   m.box(x,.657,z+d*.24,w*.91,.035,d*.23,family==='clinic'?[.63,.72,.66]:[.39+n*.13,.42,.47],6);
   for(const off of[-.28,0,.28])m.box(x+off*w,.679,z+d*.24,.018,.009,d*.20,COL.cream,6);
  }else if([5,7,8].includes(id)){
   if(family==='workshop'||family==='carpenter'){
    for(let i=0;i<3;i++){m.tube([x-w*.25,.88,z+d*(-.22+i*.19)],[x+w*.22,.88,z+d*(-.22+i*.19)],.025,.025,COL.brass,1,5);m.box(x+w*.26,.88,z+d*(-.22+i*.19),.10,.07,.055,COL.metal,1);}m.box(x-w*.21,.92,z-d*.18,.19,.06,.25,COL.wood,2);
   }else if(family==='clinic'){
    for(let i=0;i<3;i++){const px=x-w*.24+i*w*.23;m.cylinder(px,.96,z-d*.14,.055,.20,[.34,.53,.49],6,7,.035);m.cylinder(px,1.07,z-d*.14,.04,.035,COL.brass,1,7);}m.box(x,.88,z+d*.18,w*.65,.035,d*.24,COL.cream,6);
   }else if(family==='archive'||family==='guild'){
    for(let i=0;i<3;i++){m.box(x-w*.22,.90+i*.045,z,.26,.042,.37,i%2?COL.cloth:COL.wood,6,0,i*.06);m.box(x-w*.22,.925+i*.045,z,.23,.01,.33,COL.cream,6,0,i*.06);}m.cylinder(x+w*.25,.93,z-d*.18,.06,.15,COL.metal,1,7);
   }else{
    for(const side of[-1,1]){m.cylinder(x+side*w*.25,.86,z,.15,.025,COL.cream,6,10);crock(m,x+side*w*.25,.94,z-d*.26,.065,COL.cloth);}m.box(x,.865,z+d*.25,w*.46,.018,d*.21,COL.cloth,6);
   }
  }else if([3,4].includes(id)){
   for(let i=0;i<3;i++)m.tube([x-w*.28+i*w*.28,.42,z+d*.49],[x-w*.09+i*w*.28,.48,z+d*.49],.05,.035,COL.wood,2,5);if(id===4)for(let i=0;i<2;i++)crock(m,x-w*.27+i*w*.53,1.15,z+d*.15,.11,COL.stone);
  }else if(id===6){for(const side of[-1,1])m.box(x+side*w*.32,.86,z,.13,.06,.17,side<0?COL.cream:COL.cloth,6);}
  else if(id===17){for(let i=0;i<3;i++){const a=i*TAU/3;m.sphere(x+Math.cos(a)*.18,1.07,z+Math.sin(a)*.18,.035,COL.cream,6,0,5,3);}}
 }
 for(const q of p.wallDetails){
  const{x,z,n}=q;
  if(family==='clinic'){
   m.box(x,1.62,z,.52,.64,.035,COL.cream,6);m.box(x,1.62,z+.023,.065,.37,.025,COL.cloth,6);m.box(x,1.62,z+.024,.32,.065,.025,COL.cloth,6);
  }else if(family==='workshop'||family==='carpenter'){
   m.box(x,1.47,z,.77,.52,.04,COL.wood,2);for(let i=0;i<3;i++){m.tube([x-.25+i*.25,1.31,z+.07],[x-.25+i*.25,1.65,z+.07],.025,.025,COL.metal,1,5);m.box(x-.25+i*.25,1.66,z+.07,.15,.07,.05,COL.brass,1);}
  }else if(family==='archive'||family==='guild'){
   m.box(x,1.48,z,.71,.78,.05,COL.wood,2);m.box(x,1.48,z+.03,.59,.66,.016,COL.cream,6);for(let i=0;i<4;i++)m.box(x-.02,1.69-i*.13,z+.044,.39-(i%2)*.10,.015,.008,COL.metal,1);
  }else{
   m.box(x,1.48,z,.62,.68,.05,COL.wood,2);m.box(x,1.48,z+.03,.51,.57,.012,tint(COL.cloth,.75+n*.30),6);m.box(x,1.29,z+.042,.48,.13,.009,COL.lightLeaf,5);m.sphere(x+.11,1.60,z+.046,.085,COL.cream,6,0,8,4,[1,1,.12]);
  }
 }
}

export function appendAdventureSetDressing(mesh,{world}={}){
 if(!world?.scene)return mesh;const p=adventureSetDressingPlan(world);if(!p.family)return mesh;
 if(p.interior)roomDetails(mesh,p);else{
  for(const at of p.sites)foliage(mesh,at,p.family);
  for(const b of p.banks){
   const water=p.family==='salt'?[.29,.47,.47]:COL.water;mesh.box(b.x,.021,b.z,.87,.016,.87,water,3);const x=b.x+b.dx*.40,z=b.z+b.dz*.40;mesh.box(x,.10,z,b.dx?.14:.90,.17,b.dz?.14:.90,tint(COL.stone,.74),6);
   if(b.n<.18&&p.family!=='salt')for(let i=0;i<3;i++)mesh.tube([b.x-.18+i*.13,.06,b.z],[b.x-.23+i*.14,.47+b.n,b.z+.04],.015,.004,COL.lightLeaf,5,4);
  }
 }
 return mesh;
}

/** A few tangible moving details; the complete bodies remain grounded in the
 * checked static plan. Dynamic work is locally culled and independent of saves.
 */
export function appendAdventureSetDynamics(mesh,glow,{world,time=0}={}){
 if(!world?.scene||!Number.isFinite(time))return;const p=adventureSetDressingPlan(world);if(!p.family||p.interior)return;
 const player=world.state||{};
 for(const at of p.sites){if(Math.hypot(at.x-(player.x||0),at.z-(player.y||0))>20||at.kind.startsWith('small-'))continue;const{x,z,n}=at,h=1.5+n*.9;
  if(['storm','railway'].includes(p.family)){
   const y=h*.65+.95,a=time*(p.family==='storm'?1.3:.18)+n*TAU;for(let i=0;i<3;i++){const angle=a+i*TAU/3;mesh.tube([x,y,z],[x+Math.cos(angle)*.30,y+Math.sin(angle)*.30,z],.04,.020,COL.cream,6,5);}mesh.sphere(x,y,z,.065,COL.brass,1,0,6,4);
  }else if(p.family==='spore'){
   // Light lives in the cap gills; no reward or route marker is revealed.
   for(let i=0;i<3;i++){const a=i*TAU/3,hh=h*(.60+i*.15);glow.sphere(x+Math.cos(a)*at.r*.30,hh-.018,z+Math.sin(a)*at.r*.30,.045,[.37,.62,.57],4,.15+Math.sin(time*.8+n)*.025,5,3);}
  }
 }
}
