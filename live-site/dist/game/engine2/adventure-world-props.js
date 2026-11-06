/** Native campaign objects made tangible. This presentation layer never commits
 * a choice, edits collision, migrates state, or awards inventory. Native World
 * interactions remain authoritative; its actual flags drive every moving part.
 */
import {SIDE_CAMPAIGNS} from './frontiers.js?v=5.41';
import {campaignActuatorSpec} from './campaign-actuators.js?v=5.31.0';
import {isInteriorScene} from './scene-identity.js?v=4.0.0';

const TAU=Math.PI*2,clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
const lerp=(a,b,t)=>a+(b-a)*t;
const TYPES=new Set(['origin-exit','puzzle','switch','note','project','aid','camp','shop','mentor','guide','transport','listen','clue','riddle','frontier-board','frontier-landmark','lore-device','boss','trail-refuge']);
const COLORS={stone:[.31,.36,.36],edge:[.48,.53,.49],metal:[.19,.29,.32],brass:[.54,.40,.22],wood:[.30,.20,.13],dark:[.065,.105,.12],paper:[.64,.64,.49],teal:[.25,.71,.64],warm:[.94,.63,.28],water:[.09,.36,.39],cloth:[.25,.40,.39],red:[.55,.23,.17],green:[.23,.45,.26]};
const FAMILIES=['relay','relay','crank','valve','bell','archive','winch','garden','reactor','clinic','signal','valve','archive','lamp','lens','gate','relay','lens','heater','windlock','archive','pottery','vent','assembly','phrase'];
const VISUALS=new WeakMap(),PLANS=new WeakMap();
const center=o=>({x:o.xy[0]+.5,z:o.xy[1]+.5});
const identity=o=>o.id||o.story_id||o.exploreId||o.networkId||[o.type,o.xy?.join(','),o.bit,o.sequence_address,o.frontierStep].join(':');
const textFor=o=>[o.label,o.title,o.prompt,o.text,o.success,o.story_id].filter(Boolean).join(' ').toLowerCase();
const isInterior=isInteriorScene;
const FRONTIER_BY_SCENE=new Map();for(const c of SIDE_CAMPAIGNS){const key=2000+c.regionIndex*5+c.area,list=FRONTIER_BY_SCENE.get(key)||[];list.push(c);FRONTIER_BY_SCENE.set(key,list);}
function flag(world,pair){return Array.isArray(pair)&&pair.length>1?!!world.bit?.(pair[0],pair[1]):false;}
function completed(world,o){
 if(o.type==='boss')return !!world.state.bosses?.includes(world.scene.chapter);
 if(o.type==='trail-refuge')return !!o.ready;
 if(o.type==='note')return Number.isInteger(o.completes_bit)&&!!world.bit?.(o.flag_address??world.flagFor?.(o),o.completes_bit);
 if(o.type==='frontier-landmark')return frontierStage(world)>o.frontierStep;
 if(o.type==='camp'||o.type==='shop'||o.type==='listen'||o.type==='mentor'||o.type==='guide'||o.type==='transport'||o.type==='frontier-board')return false;
 try{return !!world.done?.(o);}catch{return false;}
}
function frontierStage(world){
 const f=world.state.frontiers;if(!f)return-1;
 const matching=FRONTIER_BY_SCENE.get(world.scene.location)||[];
 if(!matching.length)return-1;
 const active=matching.find(c=>c.id===f.active);
 if(active)return Number(f.stages?.[active.id])||0;
 return matching.reduce((n,c)=>Math.max(n,Number(f.stages?.[c.id])||0),-1);
}
export function adventurePropFamily(world,o){
 if(!o||!TYPES.has(o.type)||!Array.isArray(o.xy)||o.hidden||o.physicalId||o.originId)return null;
 if(o.actuatorFamily)return o.actuatorFamily;
 if(['puzzle','switch','note','project','lore-device'].includes(o.type))return campaignActuatorSpec(world,o).actuatorFamily;
 if(o.type==='boss')return'guardian';
 if(o.type==='trail-refuge')return'refuge';
 const text=textFor(o),chapter=world.scene.chapter||world.state.chapter||1;
 if(o.type==='frontier-landmark'){
  if(o.frontierStep===0)return'survey';
  const style=world.scene.biome?.style||'';
  return /salt|coral|mangrove|sand/.test(style)?'valve':/lava/.test(style)?'vent':/crystal|aurora/.test(style)?'lens':/ice/.test(style)?'winch':/spore|cactus/.test(style)?'garden':/storm/.test(style)?'windlock':'gate';
 }
 if(o.type==='note')return /stone/.test(o.played||'')?'phrase':'bell';
 if(o.type==='puzzle'||o.type==='riddle'||o.type==='switch'){
  if(/clay reader|clay plate|recording groove|rubbing|register|tablets|index/.test(text))return'archive';
  if(/valve|sluice|inlet|outlet|pump|water gauge|drain grate/.test(text))return'valve';
  if(/lens|facet|prism|glass chamber/.test(text))return'lens';
  if(/lantern|lamp|house circuit/.test(text))return'lamp';
  if(/vane|wind lock/.test(text))return'windlock';
  if(/bell|sounding stone/.test(text))return /stone/.test(text)?'phrase':'bell';
  if(/bench|clamp|reversible sleeve/.test(text)&&o.type==='riddle')return'workbench';
  return FAMILIES[clamp(chapter,1,24)]||'relay';
 }
 if(o.type==='project')return chapter===18?'heater':chapter===23?'assembly':'workbench';
 return {'origin-exit':'waypost','frontier-board':'board',aid:'clinic',camp:'camp',shop:'market',mentor:'workbench',guide:'waypost',transport:'waypost',listen:'instrument',clue:'archive'}[o.type]||null;
}
function propObjects(world,provided){
 const visible=Array.isArray(provided)?provided:world.objects(),out=visible.filter(o=>adventurePropFamily(world,o)),seen=new Set(out.map(identity));
 for(const o of world.scene.objects||[]){if(o.type==='boss'&&!o.originId&&world.state.bosses?.includes(world.scene.chapter)&&!seen.has(identity(o))){out.push(o);seen.add(identity(o));}}
 // A restored apparatus remains part of the landscape after its interaction
 // marker advances to the next commission stage. Hidden treasures do not.
 if(world.scene.biome&&frontierStage(world)>0)for(const o of world.scene.objects||[]){if(o.type!=='frontier-landmark'||frontierStage(world)<=o.frontierStep||seen.has(identity(o)))continue;out.push(o);seen.add(identity(o));}
 return out;
}
function planFor(world,o){
 const scene=world.scene;let cache=PLANS.get(scene);if(!cache){cache=new Map();PLANS.set(scene,cache);}const key=identity(o),previous=cache.get(key);if(previous&&(previous.inset||scene.floor[Math.floor(previous.z)]?.[Math.floor(previous.x)]!=='.'))return previous;
 const at=center(o),inside=isInterior(scene),large=['puzzle','riddle','project','frontier-landmark','listen','shop','frontier-board','mentor'].includes(o.type);
 const blockedFootprint=(x,z,r=.39)=>{
  for(let y=Math.floor(z-r);y<=Math.floor(z+r);y++)for(let xx=Math.floor(x-r);xx<=Math.floor(x+r);xx++)if(scene.floor[y]?.[xx]==='.')return false;
  return !(scene.objects||[]).some(v=>v!==o&&v.footprint&&x>=v.footprint.x-.3&&x<=v.footprint.x+v.footprint.w+.3&&z>=v.footprint.y-.3&&z<=v.footprint.y+v.footprint.h+.3);
 };
 const options=[];
 if(large)for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
  if(!dx&&!dz)continue;const x=at.x+dx,z=at.z+dz,d=Math.hypot(dx,dz);
  if(d>2.25||x<1||z<1||x>=scene.width-1||z>=scene.height-1||!blockedFootprint(x,z))continue;
  // An interior wall fixture belongs on the near wall surface, not behind a
  // room's masonry. Only closed spaces surrounded by floor accept a full body.
  const around=[[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>scene.floor[Math.floor(z)+b]?.[Math.floor(x)+a]==='.').length;
  if(inside&&around<2)continue;
  options.push({x,z,d});
 }
 options.sort((a,b)=>a.d-b.d||a.z-b.z||a.x-b.x);
 const found=options[0],plan={...at,x:found?.x??at.x,z:found?.z??at.z,atX:at.x,atZ:at.z,inset:!found,scale:found?1:.68,y:found?0:-.025,inside};
 cache.set(key,plan);return plan;
}
function translated(m,p){
 const s=p.scale,x=p.x,z=p.z,y=p.y,sy=p.inset?.36:1;
 return {
 box:(a,b,c,w,h,d,col,mat=1,em=0,rot=0)=>m.box(x+a*s,y+b*s*sy,z+c*s,w*s,h*s*sy,d*s,col,mat,em,rot),
 cylinder:(a,b,c,r,h,col,mat=1,n=10,rt=r,em=0)=>m.cylinder(x+a*s,y+b*s*sy,z+c*s,r*s,h*s*sy,col,mat,n,rt*s,em),
 sphere:(a,b,c,r,col,mat=1,em=0,n=8,rows=5,shape)=>m.sphere(x+a*s,y+b*s*sy,z+c*s,r*s,col,mat,em,n,rows,[(shape?.[0]??1),(shape?.[1]??1)*sy,(shape?.[2]??1)]),
 tube:(a,b,r0,r1,col,mat=1,n=7,em=0)=>m.tube([x+a[0]*s,y+a[1]*s*sy,z+a[2]*s],[x+b[0]*s,y+b[1]*s*sy,z+b[2]*s],r0*s,r1*s,col,mat,n,em),
 ring:(a,b,c,inner,outer,col,mat=1,em=0,alpha=1,n=20,progress=1)=>m.ring(x+a*s,y+b*s*sy,z+c*s,inner*s,outer*s,col,mat,em,alpha,n,progress),
 quad:(a,b,c,d,col,mat=1,em=0,alpha=1,normal)=>m.quad(...[a,b,c,d].map(v=>[x+v[0]*s,y+v[1]*s*sy,z+v[2]*s]),col,mat,em,alpha,normal)
 };
}
function foundation(g,c,shape='round'){
 if(shape==='round'){g.cylinder(0,.12,0,.46,.24,c.stone,0,12);g.cylinder(0,.265,0,.40,.05,c.brass,1,12);}
 else{g.box(0,.14,0,1.10,.28,.78,c.stone,0);g.box(0,.31,0,1.15,.06,.83,c.wood,2);}
}
function frame(g,c,height=1.3,width=1.02){
 for(const side of[-1,1]){g.box(side*width/2,height/2+.25,0,.095,height,.095,c.metal,1);g.box(side*width/2,.30,0,.25,.12,.30,c.stone,0);}
 g.box(0,height+.22,0,width+.15,.10,.12,c.brass,1);
}
function wheel(g,c,x,y,z,r,angle,vertical=true){
 // A thin torus lies in X/Y so its motion can be read from the regular camera.
 const n=12;for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;g.tube([x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(b)*r,y+Math.sin(b)*r,z],.027,.027,c.brass,1,5);}
 for(let i=0;i<3;i++){const a=angle+i*TAU/3;g.tube([x,y,z],[x+Math.cos(a)*r,y+Math.sin(a)*r,z],.022,.022,c.brass,1,5);}
 g.sphere(x,y,z,.055,c.edge,1,0,7,4);
}
function prism(g,c,height=.50){
 const p=[[0,height,0],[-.20,.15,-.14],[.20,.15,-.14],[.20,.15,.14],[-.20,.15,.14]];
 for(let i=1;i<=4;i++)g.quad(p[0],p[i],p[i%4+1],p[0],i%2?c.teal:c.paper,6,.08);
}
function book(g,c,x,y,z,rotation=0,open=false){
 g.box(x,y,z,.28,.045,.36,c.wood,2,0,rotation);g.box(x,y+.026,z,.24,.018,.33,c.paper,6,0,rotation);
 if(open)for(const side of[-1,1])g.box(x+side*.12,y+.055,z,.23,.012,.32,c.paper,6,0,side*.14);
}
function crates(g,c,x,y,z){
 g.box(x,y+.18,z,.49,.36,.39,c.wood,2);for(const side of[-1,1])g.box(x+side*.18,y+.18,z,.035,.38,.42,c.brass,1);
}
function palette(world){const style=world.scene.biome?.style||'',c={...COLORS};if(/salt|coral|ice|aurora/.test(style))c.stone=[.44,.53,.53];if(/lava|caldera/.test(style)){c.stone=[.22,.20,.19];c.warm=[1,.35,.13];}if(/archive|vault/.test(world.scene.key))c.cloth=[.28,.23,.37];return c;}
function staticBody(g,c,family,o,p){
 if(family==='guardian'){g.cylinder(0,.10,0,.63,.20,c.stone,0,12);g.ring(0,.215,0,.47,.54,c.brass,1,0,1,24);for(let i=0;i<4;i++){const a=i*TAU/4;g.box(Math.cos(a)*.53,.27,Math.sin(a)*.53,.14,.19,.14,c.stone,0);}return;}
 if(family==='refuge'){foundation(g,c,'square');for(const side of[-1,1])g.box(side*.48,.82,0,.055,1.05,.055,c.wood,2);crates(g,c,-.25,.35,.12);g.box(.25,.43,.13,.39,.12,.42,c.cloth,6);return;}
 if(['camp','market','board','waypost','instrument','clinic'].includes(family)){
  if(family==='camp'){
   if(p.inside){g.box(0,.38,0,.92,.12,.50,c.cloth,6);g.cylinder(-.35,.46,0,.13,.48,c.paper,6,10,.13,0);}
   else{g.cylinder(0,.36,0,.42,.10,c.stone,0,10);for(let i=0;i<6;i++){const a=i*TAU/6;g.sphere(Math.cos(a)*.31,.43,Math.sin(a)*.31,.10,c.stone,0,0,6,4,[1,.7,1]);}g.box(0,.43,0,.51,.09,.12,c.wood,2,0,.4);g.box(0,.48,0,.48,.09,.12,c.wood,2,0,-.5);}
   return;
  }
  if(family==='market'){
   foundation(g,c,'square');g.box(0,.63,0,1.1,.09,.60,c.wood,2);crates(g,c,-.31,.35,0);for(let i=0;i<3;i++){g.sphere(-.29+i*.27,.76,.06,.10,i%2?c.green:c.red,5,0,7,4);g.cylinder(-.31+i*.29,.76,-.15,.055,.18,c.water,1,7);}
   if(!p.inset){for(const side of[-1,1])g.box(side*.55,1.02,-.17,.05,1.5,.05,c.wood,2);g.box(0,1.8,-.02,1.3,.07,.82,c.cloth,6,0,-.04);}return;
  }
  if(family==='board'||family==='waypost'){
   foundation(g,c);const h=family==='board'?1.24:1.46;
   g.box(0,.86,0,.09,1.15,.09,c.wood,2);g.box(0,h,0,family==='board'?.90:.85,family==='board'?.60:.17,.07,c.wood,2);
   if(family==='board'){for(const side of[-1,1])g.box(side*.23,h,.047,.30,.39,.018,c.paper,6);g.box(0,h+.35,0,1.05,.09,.24,c.brass,1);}
   else{g.box(.12,h-.27,0,.70,.15,.07,c.brass,1);g.sphere(.48,h,0,.06,c.teal,4,.15,6,4);}return;
  }
  if(family==='clinic'){
   foundation(g,c,'square');g.box(0,.70,0,.97,.12,.58,c.paper,6);g.box(-.34,.80,0,.22,.11,.40,c.cloth,6);crates(g,c,.35,.35,-.34);
   g.box(.35,.78,-.30,.09,.22,.015,c.red,6);g.box(.35,.78,-.30,.22,.08,.016,c.red,6);return;
  }
  foundation(g,c,'square');g.box(0,.70,0,.85,.10,.60,c.wood,2);for(let i=0;i<7;i++)g.tube([-.30+i*.10,.77,-.20],[ -.30+i*.10,.81,.20],.025,.025,c.brass,1,6);g.cylinder(.42,.83,0,.11,.22,c.brass,1,8);return;
 }
 foundation(g,c,['archive','workbench','pottery','assembly','clinic','heater'].includes(family)?'square':'round');
 if(family==='relay'||family==='reactor'){
  const n=family==='reactor'?3:2;for(let i=0;i<n;i++){const x=(i-(n-1)/2)*.28;g.cylinder(x,.70,0,.075,.75,c.metal,1,8);for(let k=0;k<4;k++)g.cylinder(x,.43+k*.15,0,.12,.045,c.brass,1,9);g.sphere(x,1.12,0,.10,c.paper,6,0,8,5);}
  g.box(0,.44,.29,.70,.22,.10,c.metal,1);for(let i=0;i<3;i++)g.cylinder(-.23+i*.23,.58,.29,.04,.035,c.edge,1,7);return;
 }
 if(family==='valve'||family==='vent'){
  g.cylinder(0,.63,0,.20,.65,c.metal,1,10);g.tube([-.48,.45,0],[.48,.45,0],.12,.12,c.metal,1,9);for(const side of[-1,1])g.cylinder(side*.40,.45,0,.17,.075,c.brass,1,9);
  g.box(0,1.02,-.09,.36,.26,.08,c.dark,1);g.box(0,1.05,-.035,.25,.17,.014,c.paper,6);if(family==='vent')frame(g,c,1.18,.94);return;
 }
 if(family==='bell'||family==='phrase'){
  if(family==='bell'){frame(g,c,1.3,1.04);g.tube([0,1.58,0],[0,1.37,0],.025,.025,c.brass,1,6);}
  else{for(const side of[-1,1])g.box(side*.26,.51,0,.16,.45,.24,c.stone,0);g.box(0,.76,0,.71,.12,.38,c.edge,0);}
  return;
 }
 if(family==='archive'||family==='workbench'||family==='assembly'){
  g.box(0,.71,0,1.08,.09,.67,c.wood,2);for(const side of[-1,1])g.box(side*.40,.50,0,.07,.35,.49,c.wood,2);
  if(family==='archive'){for(let j=0;j<3;j++)book(g,c,-.30,.81+j*.065,-.10,j*.1);g.box(.31,.89,-.16,.27,.22,.34,c.stone,6);}
  else if(family==='workbench'){g.box(-.28,.81,.05,.27,.055,.42,c.paper,6);g.tube([.10,.82,-.12],[.39,.85,.11],.025,.025,c.metal,1,6);g.box(.29,.86,.03,.20,.09,.12,c.metal,1);}
  else{g.box(0,1.13,-.28,.91,.54,.06,c.wood,2);for(let i=0;i<3;i++)g.box(-.27+i*.27,1.15,-.24,.21,.32,.016,c.paper,6);}
  return;
 }
 if(family==='lens'){
  frame(g,c,1.08,.84);g.cylinder(0,.72,0,.09,.75,c.metal,1,8);g.cylinder(0,.46,0,.31,.09,c.brass,1,10);return;
 }
 if(family==='garden'){
  g.box(0,.47,0,.78,.37,.63,c.wood,2);g.box(0,.66,0,.67,.025,.52,c.dark,7);for(const side of[-1,1])g.box(side*.34,.47,0,.06,.38,.66,c.brass,1);return;
 }
 if(family==='winch'||family==='crank'){
  frame(g,c,.83,.92);g.tube([-.46,.90,0],[.46,.90,0],.12,.12,c.metal,1,10);for(const side of[-1,1])g.tube([side*.26,.90,-.1],[side*.26,.90,.10],.25,.25,c.brass,1,10);return;
 }
 if(family==='gate'||family==='windlock'){
  frame(g,c,1.23,1.0);g.box(0,.40,0,.86,.09,.16,c.metal,1);return;
 }
 if(family==='lamp'){
  g.cylinder(0,.80,0,.06,1.10,c.metal,1,8);g.box(0,1.26,0,.41,.13,.41,c.brass,1);g.box(0,1.58,0,.43,.09,.43,c.brass,1);
  for(const dx of[-.16,.16])for(const dz of[-.16,.16])g.tube([dx,1.30,dz],[dx,1.55,dz],.022,.022,c.metal,1,5);return;
 }
 if(family==='heater'){
  g.cylinder(0,.62,0,.33,.62,c.metal,1,12);g.cylinder(0,.94,0,.39,.07,c.brass,1,12);g.tube([-.33,.55,0],[-.47,.55,0],.06,.06,c.brass,1,7);g.tube([.33,.55,0],[.47,.55,0],.06,.06,c.brass,1,7);return;
 }
 if(family==='pottery'){
  g.cylinder(0,.54,0,.12,.43,c.metal,1,9);g.cylinder(0,.77,0,.40,.075,c.wood,2,12);g.box(.38,.41,.19,.17,.07,.29,c.wood,2);return;
 }
 if(family==='signal'){
  g.cylinder(0,1.08,0,.065,1.66,c.metal,1,8);g.box(0,1.72,0,.40,.17,.18,c.brass,1);return;
 }
 if(family==='survey'){
  g.cylinder(0,.80,0,.04,1.10,c.brass,1,7);for(let i=0;i<3;i++){const a=i*TAU/3;g.tube([0,.75,0],[Math.cos(a)*.33,.30,Math.sin(a)*.33],.025,.025,c.metal,1,5);}g.box(0,1.32,0,.45,.14,.30,c.metal,1);return;
 }
}
function semanticState(world,o,time,feedback){
 const done=completed(world,o),stage=flag(world,o.stage_flag),seq=o.type==='note'?Number(world.state.flags?.['sequence:'+o.sequence_address])||0:0;
 const pending=feedback?.pending,match=pending?.object&&(identity(pending.object)===identity(o)||pending.object.type===o.type&&pending.object.xy?.[0]===o.xy[0]&&pending.object.xy?.[1]===o.xy[1]);
 let value=done?1:stage?.5:0;if(match)value=Math.max(value,clamp(pending.progress));
 const key=world.scene.location+':'+identity(o);let map=VISUALS.get(world);if(!map){map=new Map();VISUALS.set(world,map);}let v=map.get(key);
 if(!v||time<v.time){v={from:value,target:value,time};map.set(key,v);}else if(v.target!==value){const p=clamp((time-v.time)/.55),at=lerp(v.from,v.target,p*p*(3-2*p));v={from:at,target:value,time};map.set(key,v);if(map.size>512)map.delete(map.keys().next().value);}
 const p=clamp((time-v.time)/.55),eased=match?value:lerp(v.from,v.target,p*p*(3-2*p));
 let pulse=0;for(const e of feedback?.effects||[]){const obj=e.object;if(!obj||identity(obj)!==identity(o))continue;const age=e.t??e.age??0,life=Math.max(.01,e.life??e.duration??.8);pulse=Math.max(pulse,1-clamp(age/life));}
 return{done,stage,seq,value:eased,pending:!!match,progress:match?clamp(pending.progress):0,pulse};
}
function movingBody(g,gl,c,family,o,s,time,detail){
 const amount=s.value,lit=s.done?c.teal:s.pending?c.warm:c.edge;
 if(family==='guardian'){for(let i=0;i<4;i++){const a=i*TAU/4;g.sphere(Math.cos(a)*.53,.38,Math.sin(a)*.53,.035,s.done?c.teal:c.warm,4,.18,5,3);}return;}
 if(family==='refuge'){const h=s.done?1.48:.52,col=s.done?c.cloth:c.wood;g.quad([-.58,h-.25,-.32],[-.58,h-.25,.32],[0,h,.32],[0,h,-.32],col,6);g.quad([.58,h-.25,.32],[.58,h-.25,-.32],[0,h,-.32],[0,h,.32],col,6);for(let i=0;i<3;i++)g.sphere(-.22+i*.22,.35,.34,.04,i<(o.wins||0)?c.teal:c.dark,i<(o.wins||0)?4:1,.16,5,3);return;}
 if(family==='relay'||family==='reactor'){
  const spin=s.done?time*.35:s.pending?amount*4:0;g.tube([-.25,.58,.29],[.25,.58+amount*.26,.29],.03,.03,c.brass,1,6);g.sphere(.25,.58+amount*.26,.29,.065,lit,4,s.done?.35:0,7,4);
  if(family==='reactor'&&s.done)for(let i=0;i<3;i++){const a=spin+i*TAU/3;g.sphere(Math.cos(a)*.32,.87,Math.sin(a)*.32,.035,c.teal,4,.5,5,3);}return;
 }
 if(family==='valve'){
  const angle=amount*Math.PI*1.5;wheel(g,c,0,.77,.25,.28,angle);g.tube([-.08,1.04,-.025],[Math.sin(angle)*.09,1.04+Math.cos(angle)*.07,-.025],.012,.012,c.red,1,4);
  if(s.done){for(let i=0;i<(detail?4:2);i++){const q=(time*.7+i*.23)%1;gl.sphere(.48+q*.40,.40-q*.14,0,.022,c.water,3,.15,5,3);}}return;
 }
 if(family==='vent'){
  const angle=s.done?time*2.2:amount*TAU;for(let i=0;i<4;i++){const a=angle+i*TAU/4;g.tube([0,.93,.065],[Math.cos(a)*.34,.93+Math.sin(a)*.34,.065],.055,.027,c.brass,1,5);}g.sphere(0,.93,.065,.075,lit,1,s.done?.12:0,7,4);return;
 }
 if(family==='bell'){
  const vibration=s.pulse*Math.sin(time*23)*.16+s.pending*Math.sin(amount*Math.PI)*.14,x=Math.sin(vibration)*.12;
  g.cylinder(x,1.16,0,.24,.40,c.brass,1,detail?12:8,.13);g.cylinder(x,.95,0,.28,.05,c.brass,1,detail?12:8);g.tube([x,1.17,0],[x+Math.sin(vibration)*.12,.90,0],.022,.022,c.metal,1,5);
  if(o.type==='note'){const n=Math.min(8,o.pattern?.length||5),filled=s.done?n:Math.min(n,s.seq);for(let i=0;i<n;i++)g.sphere((i-(n-1)/2)*.11,.32,.29,.032,i<filled?c.teal:c.dark,i<filled?4:1,i<filled?.28:0,5,3);}
  if(s.pulse>0)gl.ring(0,.31,0,.46+(1-s.pulse)*.5,.49+(1-s.pulse)*.5,c.warm,9,1,s.pulse*.35,20);return;
 }
 if(family==='phrase'){
  const col=[c.teal,c.warm,[.57,.40,.71]][(o.note||0)%3];g.sphere(0,.72+Math.sin(time*5)*s.pulse*.025,0,.19,col,6,s.done?.12:s.pulse*.2,detail?10:7,5,[1.2,.55,.8]);
  const filled=s.done?1:Math.min(1,s.seq/Math.max(1,o.pattern?.length||5));if(filled)gl.ring(0,.29,0,.38,.41,col,9,1,.22,18,filled);return;
 }
 if(family==='archive'){
  const angle=amount*Math.PI*.55;g.cylinder(.21,.84,0,.16,.12,c.brass,1,detail?12:8);g.tube([.21,.90,0],[.21+Math.cos(angle)*.21,.90,Math.sin(angle)*.21],.02,.02,c.edge,1,5);book(g,c,-.25,.86,.13,0,s.done||s.pending);
  for(let i=0;i<3;i++)g.box(-.40+i*.12,.77,.24,.08,.012,.04,s.done?c.teal:c.brass,1,s.done?.15:0);return;
 }
 if(family==='workbench'||family==='assembly'){
  g.box(.28,.85,.03,.07,.09,.34,c.brass,1,0,amount*.65);if(s.done){for(let i=0;i<3;i++)g.box(-.31+i*.16,.79,.10,.10,.018,.15,c.paper,6);}return;
 }
 if(family==='lens'){
  const a=amount*Math.PI/2;for(const side of[-1,1])g.tube([side*.25,.86,0],[side*.25,1.26,0],.025,.025,c.brass,1,6);prism(translatedPrism(g,a),{...c,teal:s.done?c.teal:c.paper},.5);g.sphere(0,.74,0,.065,lit,4,s.done?.3:.02,7,4);return;
 }
 if(family==='garden'){
  const growth=.12+amount*.65;g.tube([0,.67,0],[0,.67+growth,0],.035,.018,c.green,2,6);for(const side of[-1,1])g.sphere(side*.12,.71+growth*.55,0,.17,c.green,5,0,7,4,[1.2,.35,.7]);if(s.done)g.sphere(0,.73+growth,0,.08,c.warm,5,.05,7,5);return;
 }
 if(family==='winch'||family==='crank'){
  const angle=amount*TAU;for(let i=0;i<5;i++){const a=i*TAU/5+angle;g.tube([-.20,.90,0],[.20,.90,0],.025,.025,c.brass,1,5);g.tube([-.20,.90+Math.cos(a)*.15,Math.sin(a)*.15],[.20,.90+Math.cos(a)*.15,Math.sin(a)*.15],.025,.025,c.wood,2,5);}wheel(g,c,.52,.90,0,.24,angle);return;
 }
 if(family==='gate'||family==='windlock'){
  const n=family==='windlock'?3:4;for(let i=0;i<n;i++){const x=-.34+i*.68/(n-1),h=family==='windlock'?.53:.86;g.box(x,.57+h/2+amount*.56,Math.sin(amount*Math.PI/2)*.25,.035,h,.045,c.brass,1);}
  for(let i=0;i<(family==='windlock'?3:1);i++)g.sphere((i-(family==='windlock'?1:0))*.27,.42,.12,.055,lit,4,s.done?.22:0,6,4);return;
 }
 if(family==='lamp'){
  g.box(0,1.43,0,.26,.24,.26,s.done?c.warm:c.dark,s.done?4:6,s.done?.55:0);g.tube([0,.73,.10],[Math.sin(amount*1.3)*.19,.73+Math.cos(amount*1.3)*.19,.10],.025,.025,c.brass,1,6);return;
 }
 if(family==='heater'){
  const a=amount*Math.PI;g.box(0,.66,.33,.20,.20,.045,s.done?c.warm:c.dark,s.done?4:1,s.done?.32:0);g.tube([-.20,.99,0],[-.20+Math.cos(a)*.20,.99,Math.sin(a)*.20],.025,.025,c.brass,1,6);if(s.done)for(let i=0;i<2;i++){const q=(time*.3+i*.5)%1;gl.sphere((i-.5)*.15,1.06+q*.45,0,.026,c.paper,9,.06,5,3);}return;
 }
 if(family==='pottery'){
  const a=amount*TAU+(s.done?time*.6:0);g.sphere(0,.95,0,.19,c.stone,6,0,detail?10:7,5,[1,1.3,1]);g.cylinder(0,1.17,0,.09,.06,c.stone,6,8,.12);g.tube([Math.cos(a)*.30,.81,Math.sin(a)*.30],[-Math.cos(a)*.30,.81,-Math.sin(a)*.30],.015,.015,c.brass,1,5);return;
 }
 if(family==='signal'){
  g.box(Math.sin(amount*1.2)*.27,1.60+Math.cos(amount*1.2)*.20,0,.60,.12,.08,s.done?c.teal:c.red,1);g.sphere(0,1.72,.13,.075,s.done?c.teal:c.warm,4,.18,7,4);return;
 }
 if(family==='survey'){
  const a=amount*Math.PI;g.tube([Math.cos(a)*.28,1.34,Math.sin(a)*.28],[-Math.cos(a)*.28,1.34,-Math.sin(a)*.28],.07,.07,c.brass,1,8);g.sphere(0,1.40,0,.055,lit,4,s.done?.2:0,6,4);return;
 }
 if(family==='camp'&&!s.inside){const flicker=.055+Math.sin(time*5)*.012;gl.sphere(0,.50+flicker,0,.075,c.warm,4,.6,7,4,[.65,1.5,.65]);return;}
 if(family==='instrument'){
  const pulse=s.pulse||s.pending?Math.sin(time*10)*.015:0;for(let i=0;i<7;i++)g.tube([-.30+i*.10,.79+pulse,-.20],[-.30+i*.10,.81-pulse,.20],.008,.008,c.paper,1,4);return;
 }
 if(family==='clinic'&&s.done){g.box(.35,.78,-.30,.09,.22,.019,c.teal,4,.15);g.box(.35,.78,-.30,.22,.08,.020,c.teal,4,.15);return;}
}
// Rotate the visual prism around its physical yoke without moving the mount.
function translatedPrism(g,angle){
 const ca=Math.cos(angle),sa=Math.sin(angle),p=v=>[v[0]*ca+v[2]*sa,v[1]+.80,-v[0]*sa+v[2]*ca];
 return{quad:(a,b,c,d,...args)=>g.quad(p(a),p(b),p(c),p(d),...args)};
}

// A side-mounted machine keeps its real control on the interaction tile. The
// low remote panel is a few centimetres high and adds no movement blocker.
function remoteControl(mesh,glow,p,c,family,state){
 const g=translated(mesh,{x:p.atX,z:p.atZ,y:0,scale:1,inset:false}),amount=state.value,lit=state.done?c.teal:state.pending?c.warm:c.brass;
 if(['valve','vent','winch','crank','lens','reactor','pottery','survey','archive'].includes(family)){
  const angle=amount*Math.PI*1.5;g.ring(0,.115,0,.112,.145,c.brass,1,0,1,14);
  for(let i=0;i<3;i++){const a=angle+i*TAU/3;g.tube([0,.12,0],[Math.cos(a)*.12,.12,Math.sin(a)*.12],.012,.012,c.brass,1,5);}
  g.sphere(0,.12,0,.035,lit,1,state.done?.14:0,6,4);
 }else if(['board','market','waypost','clinic','refuge','camp','workbench','assembly','instrument'].includes(family)){
  g.box(-.035,.09,0,.27,.018,.25,c.paper,6);for(let i=0;i<3;i++)g.box(-.035,.101,-.06+i*.055,.18,.006,.009,c.brass,1);g.sphere(.17,.105,.08,.035,lit,1,state.done?.14:0,6,4);
 }else if(family==='bell'||family==='phrase'){
  g.cylinder(0,.11,0,.11,.04,lit,1,10);g.sphere(0,.145-Math.sin(amount*Math.PI)*.025,0,.052,lit,1,state.pulse*.2,7,4);
 }else{
  const angle=amount*1.25-.63,end=[Math.sin(angle)*.14,.11+Math.cos(angle)*.12,.015];g.tube([0,.085,.015],end,.018,.018,c.brass,1,6);g.sphere(...end,.044,lit,1,state.done?.14:0,7,4);
 }
 if(state.pending||state.pulse>0)glow.ring(p.atX,.075,p.atZ,.235,.258,c.warm,9,1,state.pending?.32:state.pulse*.3,16,state.pending?Math.max(.04,state.progress):1);
}

export function appendAdventureStaticProps(mesh,{world,objects}={}){
 if(!world?.scene||!mesh)return{props:0,families:{}};const c=palette(world),families={},list=propObjects(world,objects);
 for(const o of list){const family=adventurePropFamily(world,o),p=planFor(world,o),g=translated(mesh,p);staticBody(g,c,family,o,p);families[family]=(families[family]||0)+1;
  if(!p.inset&&Math.hypot(p.x-p.atX,p.z-p.atZ)>.4){mesh.tube([p.atX,.035,p.atZ],[p.x,.035,p.z],.012,.012,c.brass,1,5);mesh.box(p.atX,.04,p.atZ,.48,.06,.38,c.metal,1);for(const side of[-1,1])mesh.box(p.atX+side*.215,.078,p.atZ,.025,.018,.34,c.brass,1);mesh.ring(p.atX,.079,p.atZ,.24,.265,c.brass,1,0,1,16);}
 }
 return{props:list.length,families};
}
export function appendAdventureWorldProps(mesh,glow,{world,time=0,feedback=null,objects,range=18}={}){
 if(!world?.scene||!mesh||!glow)return{props:0,families:{}};
 const c=palette(world),families={};let count=0;
 for(const o of propObjects(world,objects)){
  const p=planFor(world,o),distance=Math.hypot(p.x-world.state.x,p.z-world.state.y);if(distance>range)continue;
  const family=adventurePropFamily(world,o),s=semanticState(world,o,time,feedback);s.inside=p.inside;
  movingBody(translated(mesh,p),translated(glow,p),c,family,o,s,time,distance<8);if(!p.inset&&Math.hypot(p.x-p.atX,p.z-p.atZ)>.4)remoteControl(mesh,glow,p,c,family,s);families[family]=(families[family]||0)+1;count++;
  if(o.type==='frontier-board'){const f=world.state.frontiers,stages=world.scene.biome?frontierStage(world):f?.active?(Number(f.stages?.[f.active])||0):-1,g=translated(mesh,p);for(let i=0;i<4;i++)g.sphere(-.27+i*.18,1.06,.075,.035,i<stages?c.teal:c.dark,i<stages?4:1,i<stages?.22:0,5,3);}
  if(o.type==='project'&&s.done){const bits=world.state.project||0,branch=(bits>>o.project_bit)&3;const g=translated(mesh,p);for(let i=0;i<2;i++)g.box(-.24+i*.48,.80,.16,.19,.035,.24,branch&(1<<i)?c.teal:c.paper,6,branch&(1<<i)?.08:0);}
 }
 return{props:count,families};
}
