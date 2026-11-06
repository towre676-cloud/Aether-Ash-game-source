/** The Remembering Cistern: renderer-independent, serializable gameplay.
 * Coordinates use x east and z south; north is negative z. Every walkable
 * surface is at y=0, and the same public geometry is consumed by the renderer.
 * Enemy attacks lock their warning circle before striking. Call advance only
 * while the dungeon is active; all action functions return presentation events.
 */
export const CISTERN = Object.freeze({
 id:'remembering-cistern', title:'The Remembering Cistern',
 entry:{x:0,z:12}, exit:{x:0,z:14}, playerRadius:.28,
 rooms:[
  {id:'gallery',label:'Descent gallery',x0:-3,x1:3,z0:3,z1:16},
  {id:'cistern',label:'The remembering water',x0:-11,x1:11,z0:-14,z1:4},
  {id:'sanctum',label:'The drowned bell',x0:-8,x1:8,z0:-30,z1:-14}
 ],
 water:{x0:-6,x1:6,z0:-10,z1:0}, bridgeHalfWidth:1.6,
 resonators:[{id:'west',label:'West resonator',x:-8,z:-5},{id:'east',label:'East resonator',x:8,z:-5}],
 gate:{x:0,z:-14,width:4}, boss:{x:0,z:-24},
 pillars:[...[-2.3,2.3].flatMap(x=>[6,10].map(z=>({x,z,radius:.42}))),
  ...[-9,9].flatMap(x=>[2,-12].map(z=>({x,z,radius:.48}))),
  ...[-6,6].flatMap(x=>[-17,-27].map(z=>({x,z,radius:.55})))],
 enemies:[
  {id:'gallery-mite',name:'Sluice mite',type:'mite',x:0,z:4.8,maxHp:72,boss:false},
  {id:'west-mite',name:'Brassback scavenger',type:'mite',x:-8,z:-.9,maxHp:86,boss:false},
  {id:'east-mite',name:'Cistern prowler',type:'mite',x:8,z:-10.7,maxHp:86,boss:false},
  {id:'drowned-bell',name:'The Drowned Bell',type:'guardian',x:0,z:-24,maxHp:420,boss:true}
 ]
});
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const liveParty=party=>(Array.isArray(party)?party:[]).filter(h=>h&&finite(h.hp)>0);
const event=(type,text,rest={})=>({type,text,...rest});
const gateOpen=s=>s.resonators?.[0]===true&&s.resonators?.[1]===true;
const rect=(x,z,r)=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1;

function floorPoint(x,z,s){
 if(!CISTERN.rooms.some(r=>rect(x,z,r)))return false;
 // The sanctum is separated from the cistern by a real wall and one gate.
 if(Math.abs(z+14)<.23&&(!gateOpen(s)||Math.abs(x)>2))return false;
 const w=CISTERN.water;
 if(x>w.x0&&x<w.x1&&z>w.z0&&z<w.z1&&Math.abs(x)>1.6&&Math.abs(z+5)>1.6)return false;
 return !CISTERN.pillars.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius);
}
/** Includes the player's footprint, water edge, pillar and locked-gate collision. */
export function cisternWalkable(x,z,state={resonators:[false,false]}){
 if(!Number.isFinite(x)||!Number.isFinite(z))return false;
 const r=CISTERN.playerRadius;
 return [[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.707,r*.707],[-r*.707,r*.707],[r*.707,-r*.707],[-r*.707,-r*.707]].every(([dx,dz])=>floorPoint(x+dx,z+dz,state));
}

/** Never restores a pending attack: a reload grants a short safe reorientation. */
export function createCisternState(raw={},party=[]){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
 const resonators=[raw.resonators?.[0]===true,raw.resonators?.[1]===true];
 const s={schema:'ash-aether.cistern/1',player:{x:finite(raw.player?.x,0),z:finite(raw.player?.z,12),facing:finite(raw.player?.facing,Math.PI),moving:false},
  time:Math.max(0,finite(raw.time)),resonators,bossDefeated:raw.bossDefeated===true,rewardClaimed:raw.rewardClaimed===true,
  visits:Math.max(1,Math.floor(finite(raw.visits,1))),defeats:Math.max(0,Math.floor(finite(raw.defeats))),
  cooldown:0,attackFlash:0,impactFlash:0,guard:false,invulnerable:1.7,effects:[],status:'exploring',enemies:[]};
 s.enemies=CISTERN.enemies.map(def=>{
  const old=Array.isArray(raw.enemies)?raw.enemies.find(e=>e&&e.id===def.id):null;
  const hp=def.boss&&s.bossDefeated?0:clamp(finite(old?.hp,def.maxHp),0,def.maxHp);
  const position={x:finite(old?.x,def.x),z:finite(old?.z,def.z)};
  // A hostile cannot persist behind a closed gate or on a water surface.
  if(!cisternWalkable(position.x,position.z,s)||(def.boss?position.z>-14.6:position.z<-13.4)){position.x=def.x;position.z=def.z;}
  return {...def,...position,hp,phase:hp<=def.maxHp*.35?3:hp<=def.maxHp*.7?2:1,cooldown:1.8,stagger:0,telegraph:null,route:[],routeTimer:0};
 });
 if(!cisternWalkable(s.player.x,s.player.z,s)){s.player.x=0;s.player.z=12;}
 if(!s.bossDefeated&&s.player.z<-14&&!gateOpen(s)){s.player.x=0;s.player.z=12;}
 if(s.rewardClaimed&&!s.bossDefeated)s.rewardClaimed=false;
 s.status=s.bossDefeated?'cleared':'exploring';
 return s;
}

/** BFS on the same collision geometry. Return an empty route if unreachable.
 * Nodes are world-space {x,z}; the requested target may be a resonator or actor.
 */
export function cisternRoute(state,target){
 if(!state?.player||!target||!Number.isFinite(target.x)||!Number.isFinite(target.z))return [];
 const step=.5,minX=-11,minZ=-30,nx=45,nz=93;
 const at=(x,z)=>({ix:clamp(Math.round((x-minX)/step),0,nx-1),iz:clamp(Math.round((z-minZ)/step),0,nz-1)});
 const key=(ix,iz)=>iz*nx+ix,pos=k=>({x:minX+(k%nx)*step,z:minZ+Math.floor(k/nx)*step});
 if(dist(state.player,target)<.12)return [];
 if(!cisternWalkable(target.x,target.z,state))return [];
 // A continuous position near a bridge edge may round into the water. Choose
 // a visible, safe neighbouring cell rather than routing toward a blocked cell.
 const endpoint=point=>{
  const center=at(point.x,point.z),candidates=[];
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
   const ix=center.ix+dx,iz=center.iz+dz;if(ix<0||ix>=nx||iz<0||iz>=nz)continue;
   const k=key(ix,iz),p=pos(k);if(cisternWalkable(p.x,p.z,state)&&lineClear(point,p,state))candidates.push({ix,iz,k,d:dist(point,p)});
  }
  return candidates.sort((a,b)=>a.d-b.d)[0];
 };
 const start=endpoint(state.player),goal=endpoint(target);if(!start||!goal)return [];
 const startKey=start.k,endKey=goal.k;
 const parent=new Int32Array(nx*nz).fill(-2),q=new Int32Array(nx*nz);let head=0,tail=0,found=-1;
 parent[startKey]=-1;q[tail++]=startKey;
 while(head<tail){const k=q[head++],p=pos(k);if(k===endKey){found=k;break;}
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const ix=k%nx+dx,iz=Math.floor(k/nx)+dz;if(ix<0||ix>=nx||iz<0||iz>=nz)continue;
   const next=key(ix,iz);if(parent[next]!==-2)continue;const n=pos(next);
   if(!cisternWalkable(n.x,n.z,state)||!cisternWalkable((p.x+n.x)/2,(p.z+n.z)/2,state))continue;
   parent[next]=k;q[tail++]=next;
  }
 }
 if(found<0)return [];
 const route=[];for(let k=found;k!==startKey;k=parent[k])route.push(pos(k));route.reverse();
 // First align to the start cell so the continuous route never cuts a corner.
 const sp=pos(startKey);if(dist(state.player,sp)>.03)route.unshift(sp);
 if(!route.length||dist(route.at(-1),target)>.03)route.push({x:target.x,z:target.z});
 return route;
}
function moveActor(actor,dx,dz,state){
 const distance=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(distance/.09));
 for(let i=0;i<steps;i++){
  if(cisternWalkable(actor.x+dx/steps,actor.z,state))actor.x+=dx/steps;
  if(cisternWalkable(actor.x,actor.z+dz/steps,state))actor.z+=dz/steps;
 }
}
function addEffect(s,type,x,z,radius=1){s.effects.push({type,x,z,radius,t:0,life:type==='mako'?.65:.38});if(s.effects.length>16)s.effects.shift();}
function defeat(s,party,events){
 s.defeats++;s.player={x:0,z:12,facing:Math.PI,moving:false};s.invulnerable=4;s.guard=false;s.cooldown=0;s.effects=[];
 for(const h of party||[])if(h){h.hp=Math.max(finite(h.hp),Math.min(finite(h.maxHp,180),Math.max(36,Math.ceil(finite(h.maxHp,180)*.3))));h.strain=Math.max(0,finite(h.strain)-20);}
 for(const e of s.enemies){e.telegraph=null;e.route=[];e.cooldown=2.5;if(e.hp>0){const def=CISTERN.enemies.find(d=>d.id===e.id);e.x=def.x;e.z=def.z;e.hp=e.maxHp;e.phase=1;}}
 events.push(event('defeat','The crew regroups at the entrance. Resonators and defeated creatures remain remembered.'));
}
function strike(s,e,party,events){
 const warning=e.telegraph;e.telegraph=null;e.cooldown=e.boss?2.1:2.5;
 if(!warning)return;
 addEffect(s,'impact',warning.x,warning.z,warning.radius);
 if(s.invulnerable>0||dist(s.player,warning)>warning.radius+CISTERN.playerRadius)return;
 const heroes=liveParty(party);if(!heroes.length)return;
 const h=heroes[0],base=e.boss?e.phase===3?27:23:12,amount=Math.max(1,Math.round(base*(s.guard?.22:1)));
 h.hp=Math.max(0,finite(h.hp)-amount);s.impactFlash=.28;
 events.push(event('hurt',(s.guard?'Guard absorbed most of the blow. ':'')+(h.name||'The lead')+' takes '+amount+' damage.',{heroId:h.id,amount,guarded:s.guard}));
 if(!liveParty(party).length)defeat(s,party,events);
}
function lineClear(a,b,state){const n=Math.ceil(dist(a,b)/.18);for(let i=1;i<=n;i++){const t=i/n;if(!cisternWalkable(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,state))return false;}return true;}

/** Advance simulation, capped at 100 ms; movement is swept in small substeps. */
export function advanceCistern(state,dt,input={},party=[]){
 const s=state,events=[];dt=clamp(finite(dt),0,.1);if(!dt)return events;
 s.time+=dt;s.cooldown=Math.max(0,s.cooldown-dt);s.attackFlash=Math.max(0,s.attackFlash-dt);s.impactFlash=Math.max(0,s.impactFlash-dt);s.invulnerable=Math.max(0,s.invulnerable-dt);s.guard=!!input.guard;
 s.effects=s.effects.filter(f=>(f.t+=dt)<f.life);
 const mx=clamp(finite(input.moveX),-1,1),mz=clamp(finite(input.moveZ),-1,1),len=Math.hypot(mx,mz);
 s.player.moving=!!len;
 if(len){const speed=(input.run?4.8:3.25)*(s.guard?.45:1),before={...s.player};moveActor(s.player,mx/Math.max(1,len)*speed*dt,mz/Math.max(1,len)*speed*dt,s);s.player.facing=Math.atan2(mx,mz);s.player.moving=dist(before,s.player)>.0001;}
 const heroes=liveParty(party);if(s.guard)for(const h of heroes)h.mp=Math.min(finite(h.maxMp,38),finite(h.mp)+dt*2.2);if(!heroes.length&&party?.length){defeat(s,party,events);return events;}
 let inCombat=false;
 for(const e of s.enemies){
  if(e.hp<=0)continue;
  e.phase=e.hp<=e.maxHp*.35?3:e.hp<=e.maxHp*.7?2:1;
  e.stagger=Math.max(0,e.stagger-dt);e.cooldown=Math.max(0,e.cooldown-dt);
  const d=dist(e,s.player),awake=e.boss?s.player.z<-15.5&&gateOpen(s):d<6.5;
  if(!awake){e.telegraph=null;continue;}
  inCombat=true;
  if(e.stagger>0)continue;
  if(e.telegraph){e.telegraph.remaining-=dt;if(e.telegraph.remaining<=0)strike(s,e,party,events);continue;}
  if(d<(e.boss?4.7:2.8)&&e.cooldown<=0&&lineClear(e,s.player,s)){
   const duration=e.boss?1.35:1.05,radius=e.boss?e.phase===3?2.8:2.3:1.35;
   e.telegraph={x:s.player.x,z:s.player.z,radius,duration,remaining:duration,kind:e.boss?'pulse':'slam'};
   events.push(event('warning',e.boss?'The Drowned Bell is charging. Leave the red circle or hold Guard.':'The creature winds up. Move out of the red circle.',{targetId:e.id}));
  }else if(d>(e.boss?2.5:1.5)){
   // Cardinal BFS prevents enemies from walking across the water to reach a bridge.
   e.routeTimer-=dt;if(e.routeTimer<=0||!e.route.length){e.route=cisternRoute({...s,player:{x:e.x,z:e.z}},s.player);e.routeTimer=.8;}
   const p=e.route[0];if(p){const dx=p.x-e.x,dz=p.z-e.z,len=Math.hypot(dx,dz),amount=Math.min(len,(e.boss?1.35:1.75)*dt);if(len>.001)moveActor(e,dx/len*amount,dz/len*amount,s);if(len<.12)e.route.shift();}
  }
 }
 s.status=s.bossDefeated?'cleared':inCombat?'combat':'exploring';
 return events;
}

export function nearbyCisternTarget(s){
 const targets=[{...CISTERN.exit,type:'exit',id:'exit',label:'Return to the overworld'},
 ...CISTERN.resonators.map((r,i)=>({...r,type:'resonator',index:i,label:s.resonators[i]?'Resonator sounding':'Sound the '+r.id+' resonator'})),
 {...CISTERN.gate,type:'gate',id:'gate',label:gateOpen(s)?'The remembered gate is open':'Gate · two resonators needed'}];
 return targets.map(t=>({...t,distance:dist(s.player,t)})).filter(t=>t.distance<1.85).sort((a,b)=>a.distance-b.distance)[0]||null;
}
export function cisternObjective(s){
 if(s.bossDefeated)return 'The Drowned Bell is quiet. Return through the entrance with the recovered memory.';
 if(!s.resonators[0])return 'Sound the west resonator across the cistern bridge.';
 if(!s.resonators[1])return 'Sound the east resonator. The two tones will open the northern gate.';
 return 'Enter the northern sanctum. Silence the Drowned Bell; move outside its warning circles.';
}
function hitEnemy(s,e,amount,events,kind){
 e.hp=Math.max(0,e.hp-amount);e.stagger=kind==='mako'?.85:.14;
 if(kind==='mako'&&e.telegraph){e.telegraph=null;e.cooldown=1.6;events.push(event('interrupt','Break interrupted the charge.',{targetId:e.id}));}
 events.push(event(kind,(kind==='mako'?'Resonance Break':'Strike')+' · '+amount+' damage.',{targetId:e.id,amount,x:e.x,z:e.z}));
 if(e.hp<=0){e.telegraph=null;e.route=[];events.push(event('enemy-defeated',e.name+' falls silent.',{targetId:e.id}));if(e.boss){s.bossDefeated=true;s.status='cleared';events.push(event('victory','The Drowned Bell remembers its song. The cistern is safe.'));}}
}
/** Actions: interact, attack, mako, tonic. Supplies is the campaign items object. */
export function actionCistern(s,action,party=[],supplies={}){
 const events=[];
 if(action==='interact'){
  const target=nearbyCisternTarget(s);if(!target)return [event('notice','Move closer to a resonator, the gate, or the entrance stairs.')];
  if(target.type==='exit')return [event('exit','Returning to the overworld.')];
  if(target.type==='gate')return [event('notice',gateOpen(s)?'Both tones are sounding. The northern sanctum is open.':'Two resonators answer this gate. Find them on the west and east banks.')];
  if(s.resonators[target.index])return [event('notice','The '+target.id+' resonator is already sounding.')];
  s.resonators[target.index]=true;addEffect(s,'resonator',target.x,target.z,2.2);
  events.push(event('resonator','The '+target.id+' resonator answers.',{index:target.index}));
  if(gateOpen(s))events.push(event('gate','Two voices meet. The gate to the Drowned Bell opens.'));
  return events;
 }
 const heroes=liveParty(party);if(!heroes.length)return [event('notice','A living companion is needed. Return to the entrance to regroup.')];
 if(action==='tonic'){
  if(finite(supplies.tonic)<=0)return [event('notice','No Tonics in the shared supply bag.')];
  const h=[...heroes].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(h.hp>=h.maxHp)return [event('notice','The travelling crew is already healthy.')];
  supplies.tonic--;const before=h.hp;h.hp=Math.min(h.maxHp,h.hp+Math.max(60,Math.round(h.maxHp*.4)));
  return [event('supplies',(h.name||'Your companion')+' recovers '+Math.round(h.hp-before)+' HP. One Tonic used.',{heroId:h.id})];
 }
 if(!['attack','mako'].includes(action))return events;
 if(s.cooldown>0)return events;
 const reach=action==='mako'?6.8:2.45;
 const enemy=s.enemies.filter(e=>e.hp>0&&(!e.boss||gateOpen(s)&&s.player.z<-14.5)&&dist(s.player,e)<=reach&&lineClear(s.player,e,s)).sort((a,b)=>dist(s.player,a)-dist(s.player,b))[0];
 if(!enemy)return [event('notice',action==='mako'?'Move within resonance range of a creature.':'Move within striking distance of a creature.')];
 const actor=heroes[0];
 if(action==='mako'&&finite(actor.mp)<6)return [event('notice','Resonance Break needs 6 MP. Hold Guard to recover focus.')];
 const power=heroes.reduce((sum,h)=>sum+clamp(finite(h.power,24),1,300),0)/heroes.length;
 const assist=1+(heroes.length-1)*.18;
 const amount=Math.round((action==='mako'?Math.max(38,power*1.65):Math.max(18,power*.95))*assist);
 if(action==='mako')actor.mp=Math.max(0,actor.mp-6);
 s.cooldown=action==='mako'?.8:.5;s.attackFlash=action==='mako'?.45:.28;
 addEffect(s,action,s.player.x,s.player.z,action==='mako'?2.3:1.15);
 hitEnemy(s,enemy,amount,events,action);
 return events;
}

/** One completion reward per campaign. No equipment/stat duplication on revisit. */
export function claimCisternRewards(worldState,s){
 if(!s?.bossDefeated||s.rewardClaimed)return [];
 s.rewardClaimed=true;worldState.items??={};worldState.gold=Math.max(0,finite(worldState.gold))+180;worldState.xp=Math.max(0,finite(worldState.xp))+240;
 worldState.items.tonic=Math.max(0,finite(worldState.items.tonic))+3;worldState.items.ether=Math.max(0,finite(worldState.items.ether))+1;
 worldState.cistern3d=s;
 return [event('reward','Cistern memory recovered · 180 credits · 240 XP · 3 Tonics · 1 Ether.',{gold:180,xp:240,items:{tonic:3,ether:1}})];
}
