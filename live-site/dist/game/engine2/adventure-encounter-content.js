/** Existing encounter goals and listening tools made visible in the real scene.
 * Pure presentation: no clocks, action costs, collision or rewards are advanced.
 */
const TAU=Math.PI*2,finite=(n,f=0)=>Number.isFinite(n)?n:f,clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,finite(n,a)));
const COLORS={metal:[.18,.27,.29],edge:[.49,.60,.58],brass:[.61,.47,.27],dark:[.035,.07,.08],wood:[.35,.25,.16],paper:[.76,.72,.57],cloth:[.29,.48,.42],teal:[.38,.81,.70],warm:[.98,.71,.34],red:[.91,.35,.23],violet:[.66,.53,.82]};
const KINDS=new Set(['escort','regulator','supply','signal']);
const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const inScene=(world,p)=>validPoint(p)&&world?.scene?.floor?.[Math.floor(p.y)]?.[Math.floor(p.x)]==='.'&&!(world.scene.affordanceBlocked||[]).some(v=>v[0]===Math.floor(p.x)&&v[1]===Math.floor(p.y));
const near=(world,p,range=28)=>Math.hypot(p.x-finite(world.state?.x),p.y-finite(world.state?.y))<=range;

/** The roaming preview and the live Battle share their exact target. The
 * preview remains inert: constructing a native objective here would start an
 * unrelated state machine and could turn a display into a gameplay mutation. */
export function adventureEncounterView(world,battle){
 const objective=battle?.objective||(!battle?world?.roamingPack?.objective:null);
 if(!objective||!KINDS.has(objective.kind)||!inScene(world,objective.asset))return null;
 const asset=objective.asset,route=(objective.route||[]).filter(p=>inScene(world,p)).slice(0,80),routeIndex=clamp(finite(objective.routeIndex,1),0,route.length);
 const required=Math.max(1,finite(objective.required??objective.requiredActions,3)),progress=clamp(objective.progress,0,required),hp=clamp(asset.hp,0,Math.max(1,finite(asset.maxHp,asset.hp||1))),maxHp=Math.max(1,finite(asset.maxHp,asset.hp||1));
 const complete=!!objective.complete,failed=!!objective.failed||hp<=0,deadline=Math.max(1,finite(objective.deadline??objective.duration??objective.alarmDelay,90)),remaining=clamp(1-finite(objective.elapsed)/deadline);
 const value=complete?1:objective.kind==='escort'?clamp((routeIndex-1)/Math.max(1,route.length-1)):progress/required;
 return {objective,asset,kind:objective.kind,preview:!battle,route,routeIndex,required,progress,hp,maxHp,integrity:hp/maxHp,complete,failed,remaining,value,pressure:clamp(finite(objective.pressure,36)/100),stable:clamp(finite(objective.stable)/Math.max(1,finite(objective.stableTime,8))),thefts:clamp(objective.thefts,0,6),maxThefts:Math.max(1,finite(objective.maxThefts,3))};
}

/** The patient uses the existing illustrated NPC atlas, never a new mannequin.
 * The host adds these through its ordinary actorSprite path for depth/scale. */
export function adventureEncounterActors(world,battle){
 const view=adventureEncounterView(world,battle);if(!view||view.kind!=='escort'||!near(world,view.asset))return [];
 return [{id:view.asset.id||'objective-patient',x:view.asset.x,y:view.asset.y,person:{npcKind:'npcs',row:14},objective:true,integrity:view.integrity,failed:view.failed}];
}

function clippedLine(mesh,world,from,to,{height=.062,radius=.018,color=COLORS.brass,material=1,emission=0,dashed=false}={}){
 if(!validPoint(from)||!validPoint(to))return;
 const distance=Math.hypot(to.x-from.x,to.y-from.y);if(!(distance>.001)||distance>80)return;
 const n=Math.max(1,Math.ceil(distance/.24));
 for(let i=0;i<n;i++){
  if(dashed&&i%3===2)continue;const t=i/n,u=(i+1)/n,a={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t},b={x:from.x+(to.x-from.x)*u,y:from.y+(to.y-from.y)*u},mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  if(!inScene(world,a)||!inScene(world,b)||!inScene(world,mid)||!near(world,mid))continue;
  mesh.tube([a.x,height,a.y],[b.x,height,b.y],radius,radius,color,material,5,emission);
 }
}
function progressStuds(mesh,x,z,count,filled,col){
 for(let i=0;i<count;i++){const at=x+(i-(count-1)/2)*.13,done=i<filled;mesh.box(at,.083,z,.095,.028,.08,done?col:COLORS.dark,done?4:1,done?.18:0);}
}
function integrityBar(mesh,view,x,z,height){
 const col=view.failed?COLORS.red:view.integrity<.4?COLORS.warm:COLORS.teal;
 mesh.box(x,height,z,.69,.052,.045,COLORS.dark,6);if(view.integrity>0)mesh.box(x-.315+.315*view.integrity,height+.005,z+.026,.63*view.integrity,.027,.012,col,4,.22);
}
function supply(mesh,view){
 const {x,y:z}=view.asset,n=Math.min(6,Math.max(1,Math.round(view.required))),removed=Math.min(n,Math.round(view.thefts)),visible=n-removed;
 mesh.box(x,.043,z,.86,.065,.68,COLORS.wood,2);
 for(let i=0;i<visible;i++){
  const col=i%3,row=Math.floor(i/3),sx=x+(col-1)*.235,sz=z+(row-.5)*.24,secured=i<view.progress;
  mesh.box(sx,.145,sz,.20,.14,.20,i%2?COLORS.paper:COLORS.cloth,6);
  mesh.box(sx,.221,sz,.205,.023,.035,secured?COLORS.teal:COLORS.brass,secured?4:1,secured?.12:0);
  if(secured)for(const side of[-1,1])mesh.box(sx+side*.087,.15,sz,.018,.15,.205,COLORS.brass,1);
 }
 progressStuds(mesh,x,z+.43,n,view.progress,COLORS.teal);integrityBar(mesh,view,x,z-.24,.42);
 // A theft removes an actual bundle and leaves its loosened binding behind.
 for(let i=0;i<removed;i++)mesh.box(x+(i-(removed-1)/2)*.18,.09,z-.42,.13,.022,.036,COLORS.red,6,0,.35);
}
function regulator(mesh,glow,view,time){
 const {x,y:z}=view.asset,angle=-Math.PI*.8+view.pressure*Math.PI*1.6,finished=view.complete;
 mesh.cylinder(x,.11,z,.34,.20,COLORS.metal,1,12);mesh.cylinder(x,.225,z,.36,.045,COLORS.brass,1,12);
 // An inset wheel stays below knees on the real walkable interaction tile.
 for(let i=0;i<12;i++){const a=i*TAU/12,b=(i+1)*TAU/12;mesh.tube([x+Math.cos(a)*.26,.27,z+Math.sin(a)*.26],[x+Math.cos(b)*.26,.27,z+Math.sin(b)*.26],.021,.021,COLORS.brass,1,5);}
 for(let i=0;i<3;i++){const a=view.value*Math.PI*1.4+i*TAU/3;mesh.tube([x,.27,z],[x+Math.cos(a)*.26,.27,z+Math.sin(a)*.26],.018,.018,COLORS.edge,1,5);}
 mesh.box(x,.37,z-.28,.42,.31,.065,COLORS.metal,1);mesh.box(x,.39,z-.24,.33,.21,.018,COLORS.paper,6);
 mesh.tube([x,.39,z-.225],[x+Math.sin(angle)*.135,.39+Math.cos(angle)*.09,z-.225],.011,.011,view.pressure>.75?COLORS.red:COLORS.dark,1,4);
 const vent=view.progress>0&&view.pressure<.30;if(vent)for(let i=0;i<3;i++){const q=(time*.55+i/3)%1;glow.sphere(x+.34+q*.17,.20+q*.20,z,.018,COLORS.teal,4,.25,5,3);}
 progressStuds(mesh,x,z+.42,Math.min(6,view.required),view.progress,COLORS.teal);
 if(view.stable>0)glow.ring(x,.045,z,.48,.52,COLORS.teal,9,1,.35,24,view.stable);
 integrityBar(mesh,view,x,z-.26,.65);if(finished)mesh.box(x,.235,z,.18,.025,.14,COLORS.teal,4,.28);
}
function signal(mesh,glow,view,time){
 const {x,y:z}=view.asset,n=Math.min(6,view.required),closed=view.failed;
 mesh.box(x,.09,z,.68,.15,.51,COLORS.metal,1);mesh.box(x,.179,z,.60,.028,.44,COLORS.brass,1);
 for(let i=0;i<n;i++){
  const sx=x+(i-(n-1)/2)*.17,disconnected=i<view.progress;
  for(let k=0;k<3;k++)mesh.ring(sx,.22+k*.04,z-.04,.043,.065,COLORS.brass,1,0,1,9);
  const amount=disconnected?.16:0;mesh.tube([sx,.19,z+.03],[sx+amount,.20,z+.20],.018,.018,disconnected?COLORS.edge:COLORS.teal,1,5,disconnected?0:.08);
  mesh.sphere(sx+amount,.20,z+.20,.027,disconnected?COLORS.dark:COLORS.warm,disconnected?1:4,disconnected?0:.25,6,3);
 }
 // The real remaining call window drives its ring; completed shutdown is dark.
 if(!view.complete&&!closed){const pulse=.16+.10*Math.sin(time*4);glow.ring(x,.055,z,.56,.59,COLORS.warm,9,1,pulse,30,view.remaining);}
 if(view.objective.replyWindow)glow.ring(x,.060,z,.41,.45,COLORS.teal,9,1,.35,24);
 progressStuds(mesh,x,z+.40,n,view.progress,COLORS.teal);integrityBar(mesh,view,x,z-.22,.48);
}
function route(mesh,glow,world,view){
 if(view.kind!=='escort'||!view.route.length)return;
 let last={x:view.asset.x,y:view.asset.y};
 for(const node of view.route.slice(Math.max(0,view.routeIndex))){clippedLine(mesh,world,last,node,{color:view.objective.routeBlocked?COLORS.red:COLORS.brass,dashed:true,radius:.013});last=node;}
 const end=view.route.at(-1);if(inScene(world,end)&&near(world,end)){mesh.ring(end.x,.037,end.y,.39,.43,COLORS.brass,1,0,1,24);glow.ring(end.x,.042,end.y,.44,.49,view.complete?COLORS.teal:COLORS.paper,9,1,.22,24);}
}
function instruments(mesh,glow,world,battle,time){
 const state=battle?.instruments;if(!state?.enabled)return;
 for(const node of(state.safeNodes||[]).slice(0,8))if(inScene(world,node)&&near(world,node)){mesh.ring(node.x,.038,node.y,.13,.17,COLORS.brass,1,0,1,12);glow.disc(node.x,.043,node.y,.055,.055,COLORS.violet,9,.28,10);}
 for(const line of(state.coverage||[]).slice(0,8)){
  if(!(line.charges>0)||![line.x1,line.y1,line.x2,line.y2].every(Number.isFinite))continue;
  const from={x:line.x1,y:line.y1},to={x:line.x2,y:line.y2};clippedLine(mesh,world,from,to,{color:COLORS.violet,height:.14,radius:.025});clippedLine(glow,world,from,to,{color:COLORS.paper,height:.16,radius:.008,material:4,emission:.5});
  for(const p of[from,to])if(inScene(world,p)&&near(world,p)){mesh.cylinder(p.x,.13,p.y,.04,.25,COLORS.brass,1,7);mesh.sphere(p.x,.27,p.y,.047,COLORS.violet,4,.28,6,4);}
 }
 const decoy=state.decoy;
 if(decoy?.charges>0&&(decoy.expiresAt===undefined||decoy.expiresAt>finite(battle.time))&&inScene(world,decoy)&&near(world,decoy)){
  const {x,y:z}=decoy;mesh.cylinder(x,.14,z,.14,.26,COLORS.cloth,6,10,.11);mesh.cylinder(x,.28,z,.11,.025,COLORS.brass,1,10);mesh.box(x,.30,z,.16,.025,.07,COLORS.paper,6);
  for(let i=0;i<2;i++){const q=(time*.5+i*.5)%1;glow.ring(x,.06,z,.18+q*.42,.20+q*.42,COLORS.teal,9,1,(1-q)*.22,20);}
 }
}

export function appendAdventureEncounterContent(mesh,shadow,glow,{world,battle=null,time=0}={}){
 if(!world?.scene||!world.state)return;time=finite(time);
 const view=adventureEncounterView(world,battle);
 if(view&&near(world,view.asset)){
  const {x,y:z}=view.asset,col=view.failed?COLORS.red:view.complete?COLORS.teal:COLORS.brass;
  shadow.disc(x,.034,z,view.kind==='escort'?.31:.45,view.kind==='escort'?.22:.34,[.005,.015,.02],8,.35);
  mesh.ring(x,.039,z,.46,.49,col,1,0,1,28);
  if(view.kind==='supply')supply(mesh,view);else if(view.kind==='regulator')regulator(mesh,glow,view,time);else if(view.kind==='signal')signal(mesh,glow,view,time);else{integrityBar(mesh,view,x,z,1.90);route(mesh,glow,world,view);}
  const danger=view.failed||view.integrity<.4||view.kind==='regulator'&&view.pressure>.75||!view.complete&&view.remaining<.15;
  if(danger)glow.ring(x,.052,z,.54,.59,COLORS.red,9,1,.27+.12*Math.sin(time*5),30);
  if(view.complete)glow.ring(x,.056,z,.54,.59,COLORS.teal,9,1,.28,30);
 }
 instruments(mesh,glow,world,battle,time);
}
