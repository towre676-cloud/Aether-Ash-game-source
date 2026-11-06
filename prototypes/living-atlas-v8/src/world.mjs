/** Ash & Aether living-world numerical kernel. No rendering dependency. */
export const N = 65;
export const HALF = (N - 1) / 2;
const C = v => Math.min(1, Math.max(0, v));
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const mix = (a,b,t) => a+(b-a)*t;
function hash(a,b,seed=1) {let h=(Math.imul(a|0,374761393)^Math.imul(b|0,668265263)^Math.imul(seed|0,1442695041))|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
function noise(x,z,seed){const ix=Math.floor(x),iz=Math.floor(z),u=x-ix,v=z-iz;const t=u*u*(3-2*u),w=v*v*(3-2*v);return mix(mix(hash(ix,iz,seed),hash(ix+1,iz,seed),t),mix(hash(ix,iz+1,seed),hash(ix+1,iz+1,seed),t),w)*2-1;}
function radial(x,z,cx,cz,r){return Math.max(0,1-Math.hypot(x-cx,z-cz)/r);}
export function riverX(z){return -2.0+4.0*Math.sin(z*.082)+1.5*Math.sin(z*.19+0.8);}
function segmentDistance(x,z,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-(ax+t*dx),z-(az+t*dz));}
/** Paths have physical placement and lower movement cost, not decorative markings. */
export function roadProximity(x,z){const cx=riverX(5);return Math.min(segmentDistance(x,z,-16,-10,cx,5),segmentDistance(x,z,17,14,cx,5),segmentDistance(x,z,-23,18,-16,-10));}
export function terrainHeight(x,z,seed=71){
  const broad=1.5*noise(x*.047,z*.047,seed)+.58*noise(x*.14,z*.14,seed+20)+.16*noise(x*.43,z*.43,seed+1);
  const riverDist=Math.abs(x-riverX(z));
  const riverCut=3.0*Math.exp(-riverDist*riverDist/21);
  const shelf=0.6*Math.sin(x*.08+z*.04);
  return .62+broad+shelf+Math.max(0,riverDist-7)*.035-riverCut;
}
const index=(x,z)=>z*N+x;
export const iAt=(x,z)=>index(clamp(Math.round(x+HALF),0,N-1),clamp(Math.round(z+HALF),0,N-1));
export function positionOf(i){return {x:i%N-HALF,z:Math.floor(i/N)-HALF};}
function makeField(){return new Float32Array(N*N);}
function ringThreshold(x,z){return Math.hypot(x+16,z+10)<5;}
export class LivingWorld {
 constructor(seed=71){
   this.seed=seed|0;this.climate={rain:1,heat:.5};this.day=0;this.sky='clear';this.sluiceOpen=false;this.bridgeRepaired=false;
   this.supplies={timber:3,stone:3,ore:1};this.events=[];this.visited=new Set();
   this.h=makeField();this.w=makeField();this.m=makeField();this.f=makeField();this.b=makeField();this.ash=makeField();this.fire=makeField();this.a=makeField();this.res=makeField();this.stone=makeField();this.waveRe=makeField();this.waveIm=makeField();
   for(let i=0;i<N*N;i++){
    const {x,z}=positionOf(i),h=terrainHeight(x,z,this.seed),riverDist=Math.abs(x-riverX(z));
    this.h[i]=h;
    this.w[i]=Math.max(0,-.33-h)*.65;
    this.m[i]=C(.22+.42*Math.exp(-riverDist*riverDist/85)+.07*noise(x*.13,z*.13,this.seed+13));
    this.f[i]=C(.48+.2*noise(x*.075,z*.075,this.seed+19)+.1*this.m[i]);
    this.b[i]=C(.27+.62*this.m[i]*this.f[i]+.13*hash(x,z,this.seed));
    this.stone[i]=C(.22+.50*Math.abs(noise(x*.10,z*.10,this.seed+8))+.25*(h>1.8));
    this.a[i]=C(.12+.56*radial(x,z,-16,-10,15)+.2*noise(x*.12,z*.12,this.seed+45));
    if(ringThreshold(x,z)){this.b[i]*=.18;this.stone[i]=.9;this.a[i]=Math.max(this.a[i],.6);}
    if(Math.abs(x-16)<5&&Math.abs(z-14)<6) this.b[i]=.35;
   }
 }
 sample(x,z){const i=iAt(x,z);return {x,z,height:+this.h[i].toFixed(2),water:+this.w[i].toFixed(3),moisture:+this.m[i].toFixed(3),fertility:+this.f[i].toFixed(3),biomass:+this.b[i].toFixed(3),stone:+this.stone[i].toFixed(3),aether:+this.a[i].toFixed(3),resonance:+this.res[i].toFixed(3),ash:+this.ash[i].toFixed(3),fire:+this.fire[i].toFixed(3)};}
 /** Every gameplay output, including visible scenery, samples these same fields. */
 evaluate(x,z){
   const s=this.sample(x,z);const wet=C(s.moisture+.8*s.water);
   const rootCover=C(s.biomass*(1-s.fire)*.78),rockCover=C(s.stone*.65),cover=C(rootCover+rockCover);
   const shielding={fire:+C(.14+wet*.65-.45*s.ash).toFixed(3),water:+C(.2+rockCover*.4+rootCover*.3).toFixed(3),earth:+C(.1+s.stone*.75).toFixed(3),aether:+C(.12+s.resonance*.73-s.aether*.21).toFixed(3)};
   const encounterChance=+clamp(.015+.09*s.biomass+.07*s.aether+.06*s.ash-.055*s.resonance,.005,.38).toFixed(3);
   const harvest=+Math.max(0,s.biomass*s.fertility*(.45+.55*s.moisture)*(1-s.ash)).toFixed(3);
   const road=roadProximity(x,z);const walkCost=+((1+.85*wet+.9*s.fire+.5*Math.max(0,s.height-2))*(road<.9?.72:road<1.7?.92:1)).toFixed(3);
   const historyEcho=+(s.aether*.7+s.resonance*.6).toFixed(3);
   // A true continuous 14m crossing: the game's passability interval matches its 3D bridge span.
   const atBridge=Math.abs(z-5)<1.5&&Math.abs(x-riverX(5))<7.1;
   const traversalPassable=atBridge ? this.bridgeRepaired : s.water<.75;
   const creature=s.ash>.35?'Cinder-forager':wet>.58?'Silt shepherd':s.aether>.48?'Echo moth':'Glassback wanderer';
   return {cover:+cover.toFixed(3),shielding,encounterChance,harvest,walkCost,historyEcho,traversalPassable,creature};
 }
 region(x,z){if(Math.hypot(x+16,z+10)<7)return 'Chapel of Rain';if(x>10&&z>8)return 'Glass Orchard';if(Math.abs(x-riverX(z))<5)return 'Water Memory';if(x<-10&&z>10)return 'Mosswake Forest';return 'Hearthland';}
 /** Preview an elemental interaction. Its damage and material reactions share the exact field state. */
 resolveAttack(x,z,element,power=1){
   this.assertPoint({x,z});
   if(!['fire','water','earth','aether'].includes(element))throw Error('Unknown element');
   if(!Number.isFinite(power)||power<0||power>5)throw Error('Power outside 0..5');
   const s=this.sample(x,z),g=this.evaluate(x,z);
   const coupling={
     fire: (.75*s.biomass*(1-s.moisture)-.45*s.water-.35*s.resonance),
     water:(.6*s.fire+.42*s.ash+.24*s.moisture-.24*s.stone),
     earth:(.58*s.stone+.3*s.moisture-.35*s.water),
     aether:(.65*s.aether+.5*s.resonance-.25*s.stone)
   }[element];
   const multiplier=Math.max(.1,(1-.72*g.shielding[element])*(1+coupling));
   return {element,power,shield:g.shielding[element],coupling:+coupling.toFixed(3),multiplier:+multiplier.toFixed(3),damage:+(power*multiplier).toFixed(3),reaction:(element==='fire'&&s.moisture>.48)?'Steam and embers':element==='earth'&&s.moisture>.5?'Clay setting':element==='aether'&&s.resonance>.24?'Memory harmonic':element==='water'&&s.fire>.1?'Quenching':'Material response'};
 }
 /** Discrete actions change the persistent world; no purely illustrative actions. */
 dispatch(event){
   if(!event||typeof event.type!=='string')throw Error('event.type required');
   const {type}=event; let result={ok:true,type};
   if(type==='sluice')this.sluiceOpen=Boolean(event.open);
   else if(type==='rain')this.sky=event.mode==='rain'?'rain':'clear';
   else if(type==='plant'){
    const {x,z}=this.assertPoint(event); const i=iAt(x,z);
    if(this.supplies.timber<1)return {ok:false,reason:'Needs one timber cutting'};
    this.supplies.timber--;this.b[i]=C(this.b[i]+.36);this.f[i]=C(this.f[i]+.08);
   } else if(type==='ignite'){
    const {x,z}=this.assertPoint(event);const i=iAt(x,z);this.fire[i]=Math.max(this.fire[i],.9);this.b[i]*=.77;
   } else if(type==='hydrophone'){
    const {x,z}=this.assertPoint(event);const rawPhase=Number(event.phase??0),rawIntensity=Number(event.intensity??.85);
    if(!Number.isFinite(rawPhase)||!Number.isFinite(rawIntensity))throw Error('Invalid Hydrophone tuning');
    const phase=clamp(rawPhase,0,1),intensity=clamp(rawIntensity,0,1);
    for(let i=0;i<N*N;i++){
      const p=positionOf(i),r=Math.hypot(p.x-x,p.z-z);
      // Complex wave amplitude: water carries the signal, rock scatters it; phases truly interfere.
      const speed=Math.max(.35,1+.55*this.w[i]+.3*this.m[i]-.15*this.stone[i]);
      const theta=Math.PI*2*phase+.68*r/speed;
      const k=intensity*Math.exp(-r/19)/(1+.045*r)*(.67+.43*this.m[i])*(1-.25*this.stone[i]);
      const oldRes=this.res[i];
      this.waveRe[i]=clamp(this.waveRe[i]+k*Math.cos(theta),-3,3);
      this.waveIm[i]=clamp(this.waveIm[i]+k*Math.sin(theta),-3,3);
      this.res[i]=C(.92*Math.hypot(this.waveRe[i],this.waveIm[i]));
      this.a[i]=C(this.a[i]-.17*(this.res[i]-oldRes));
    }
   } else if(type==='harvest'){
    const {x,z}=this.assertPoint(event);const i=iAt(x,z);const amount=this.evaluate(x,z).harvest;
    if(amount<.08)return {ok:false,reason:'Insufficient mature growth'};
    this.b[i]=Math.max(0,this.b[i]-.30);this.supplies.timber++;result.amount=amount;
   } else if(type==='bridge'){
    if(this.bridgeRepaired)return {ok:false,reason:'Bridge already repaired'};
    if(this.supplies.timber<2||this.supplies.stone<2)return {ok:false,reason:'Need 2 timber and 2 stone'};
    this.supplies.timber-=2;this.supplies.stone-=2;this.bridgeRepaired=true;
   } else if(type==='cast'){
     const {x,z}=this.assertPoint(event),element=event.element,power=event.power??1;
     const attack=this.resolveAttack(x,z,element,power),i=iAt(x,z),p=Number(power);
     if(element==='fire'){this.fire[i]=C(this.fire[i]+p*.24*(1-this.m[i]));this.b[i]=C(this.b[i]-p*.085);this.ash[i]=C(this.ash[i]+p*.045);}
     if(element==='water'){this.m[i]=C(this.m[i]+p*.12);this.w[i]=C(this.w[i]+p*.035);this.fire[i]=C(this.fire[i]-p*.4);}
     if(element==='earth'){this.stone[i]=C(this.stone[i]+p*.07*(1-this.w[i]));this.f[i]=C(this.f[i]+p*.035*this.m[i]);}
     if(element==='aether'){this.waveRe[i]=clamp(this.waveRe[i]+p*.12,-3,3);this.res[i]=C(.92*Math.hypot(this.waveRe[i],this.waveIm[i]));this.a[i]=C(this.a[i]-p*.055*this.res[i]);}
     result.attack=attack;
   } else if(type==='advance'){
    const days=Math.floor(Number(event.days));if(!Number.isFinite(days)||days<1||days>90)throw Error('Advance must be 1 to 90 days');
    for(let k=0;k<days;k++)this.step();
   } else throw Error(`Unknown world event ${type}`);
   this.events.push({...event,day:this.day});return result;
 }
 assertPoint({x,z}){if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>HALF||Math.abs(z)>HALF)throw Error('Position outside world');return {x,z};}
 step(){
   this.day++;
   const nm=makeField(),nb=makeField(),nw=makeField(),na=makeField(),nf=makeField();
   const rain=(this.sky==='rain'?.062:.019)*this.climate.rain,wind=Math.sin(this.day*.3);
   for(let i=0;i<N*N;i++){
     const {x,z}=positionOf(i),d=Math.abs(x-riverX(z)),orchard=radial(x,z,16,14,13);
     const nearRiver=Math.exp(-d*d/65);
     let wetInput=rain+nearRiver*.026+(this.sluiceOpen?.10*orchard:0);
     const wetNeighbors=[]; const xi=i%N,zi=Math.floor(i/N);
     if(xi>0)wetNeighbors.push(i-1);if(xi<N-1)wetNeighbors.push(i+1);if(zi>0)wetNeighbors.push(i-N);if(zi<N-1)wetNeighbors.push(i+N);
     let avg=0,neighborFire=0;for(const j of wetNeighbors){avg+=this.m[j];neighborFire+=this.fire[j];}avg/=wetNeighbors.length;
     const evaporation=(.025+.03*this.fire[i])*(.5+.5*wind*wind)*(.72+.56*this.climate.heat);
     nm[i]=C(this.m[i]+wetInput-evaporation+.085*(avg-this.m[i])-.02*this.b[i]);
     // Floodplain is supported by an open sluice, remains low after closing, and drains toward the river.
     const baseWater=Math.max(0,-.33-this.h[i])*.65;
     nw[i]=Math.max(baseWater, Math.max(0,this.w[i]*.80+(this.sluiceOpen?.085*orchard:0)-.01));
     const fire=this.fire[i];let ignition=(neighborFire/(wetNeighbors.length))*.16*(1-nm[i])*(.7+.3*wind*wind)*(.7+.6*this.climate.heat);
     nf[i]=clamp(fire*.30+ignition,0,1);
     const scorch=fire*.36;
     nb[i]=C(this.b[i]+.032*this.f[i]*nm[i]*this.b[i]*(1-this.b[i])-.015*this.b[i]-scorch+.012*this.res[i]);
     na[i]=C(this.a[i]+.005*nearRiver-.018*this.res[i]+.002*hash(this.day,i,this.seed));
     this.ash[i]=C(this.ash[i]*.979+fire*.26);
   }
   this.m=nm;this.w=nw;this.b=nb;this.a=na;this.fire=nf;
   for(let i=0;i<N*N;i++){this.waveRe[i]*=.974;this.waveIm[i]*=.974;this.res[i]=C(.92*Math.hypot(this.waveRe[i],this.waveIm[i]));this.f[i]=C(this.f[i]-.002*this.ash[i]+.0015*this.b[i]);}
 }
 summary(){
  let canopy=0,river=0,res=0,ash=0,enc=0,orchard=0,orchardN=0;
  for(let i=0;i<N*N;i++){const p=positionOf(i);canopy+=this.b[i];river+=this.w[i];res+=this.res[i];ash+=this.ash[i];enc+=this.evaluate(p.x,p.z).encounterChance;
  if(p.x>10&&p.z>8){orchard+=this.m[i];orchardN++;}}
  return {day:this.day,sky:this.sky,sluiceOpen:this.sluiceOpen,bridgeRepaired:this.bridgeRepaired,canopy:+(canopy/(N*N)).toFixed(3),water:+river.toFixed(1),resonance:+(res/(N*N)).toFixed(3),ash:+(ash/(N*N)).toFixed(3),encounters:+(enc/(N*N)).toFixed(3),orchardMoisture:+(orchard/orchardN).toFixed(3),supplies:{...this.supplies}};
 }
 snapshot(){return {version:2,climate:{...this.climate},seed:this.seed,day:this.day,sky:this.sky,sluiceOpen:this.sluiceOpen,bridgeRepaired:this.bridgeRepaired,supplies:{...this.supplies},events:this.events.map(e=>({...e})),fields:Object.fromEntries(['h','w','m','f','b','ash','fire','a','res','stone','waveRe','waveIm'].map(k=>[k,Array.from(this[k])]))};}
 static restore(data){if(![1,2].includes(data.version)||!Array.isArray(data.fields?.h)||data.fields.h.length!==N*N)throw Error('Incompatible world save');const w=new LivingWorld(data.seed);
  for(const k of ['h','w','m','f','b','ash','fire','a','res','stone','waveRe','waveIm']){if(data.version===1&&['waveRe','waveIm'].includes(k))continue;if(data.fields[k]?.length!==N*N||!data.fields[k].every(v=>Number.isFinite(v)&&v>=(['h','waveRe','waveIm'].includes(k)?-20:0)&&v<100))throw Error('Invalid world field '+k);w[k]=Float32Array.from(data.fields[k]);}
  if(data.climate){if(!Number.isFinite(data.climate.rain)||data.climate.rain<0||data.climate.rain>5||!Number.isFinite(data.climate.heat)||data.climate.heat<0||data.climate.heat>5)throw Error('Invalid climate');w.climate={...data.climate};}
  w.day=data.day;w.sky=data.sky;w.sluiceOpen=Boolean(data.sluiceOpen);w.bridgeRepaired=Boolean(data.bridgeRepaired);w.supplies={...data.supplies};w.events=data.events.map(e=>({...e}));return w;
 }
}
/** Convert explicit A&A gameplay actions to physically meaningful world interventions. */
export function gameEvent(world,event){
 const pos={x:event.x,z:event.z};
 switch(event.kind){
  case 'WORLD_WEATHER_CHANGED':return world.dispatch({type:'rain',mode:event.weather});
  case 'QUEST_SLUICE_OPENED':return world.dispatch({type:'sluice',open:true});
  case 'QUEST_SLUICE_CLOSED':return world.dispatch({type:'sluice',open:false});
  case 'HYDROPHONE_PLAYED':return world.dispatch({type:'hydrophone',...pos,phase:event.phase??0,intensity:event.intensity??.85});
  case 'ENVIRONMENT_IGNITED':return world.dispatch({type:'ignite',...pos});
  case 'SEED_PLANTED':return world.dispatch({type:'plant',...pos});
  case 'RESOURCE_HARVESTED':return world.dispatch({type:'harvest',...pos});
  case 'BRIDGE_REPAIRED':return world.dispatch({type:'bridge'});
  case 'ELEMENTAL_SKILL_CAST':return world.dispatch({type:'cast',...pos,element:event.element,power:event.power});
  case 'DAYS_PASSED':return world.dispatch({type:'advance',days:event.days});
  default:return {ok:false,reason:'No living-world mapping for '+event.kind};
 }
}
