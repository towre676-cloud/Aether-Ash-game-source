/** Ash & Aether: persistent multi-region gameplay model.
 * All art, encounters, traversal, economy, music, quests and NG+ query the same state.
 * UI/Three.js does not participate in authoritative mechanics.
 */
import {LivingWorld,gameEvent,N,HALF,iAt} from './world.mjs';
import {SurfaceLayer} from './surfaces.mjs';
import {WildlifeNetwork} from './wildlife-v7.mjs';
import {residentRoster,residentDistance,residentInReach} from './residents-v8.mjs';
import {REGIONS,REGION_BY_ID,SPECIES,SPECIES_BY_ID,MATERIALS,RECIPES,RECIPE_BY_ID,QUESTS,QUEST_BY_ID,verifyContent,MORPHS} from './content.mjs';
const C=x=>Math.min(1,Math.max(0,x));
const fixed=x=>+x.toFixed(4);
const fnv=(...s)=>{let h=2166136261;for(const c of s.join('|')){h=Math.imul(h^c.charCodeAt(0),16777619);}return h>>>0;};
function pseudo(seed){let s=(seed>>>0)||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
const copy=o=>JSON.parse(JSON.stringify(o));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function baselineEconomy(id){const region=REGION_BY_ID[id];const stock={timber:2,root:0,silt:0,glass:0,basalt:0,copper:0,clay:0,ore:0,salt:0,ash:0,moss:0,crystal:0};stock[region.resource]+=6;stock.timber+=2;stock.clay+=2;return {stock,wealth:18,hunger:.15,condition:.9,productivity:1,prices:{},exports:0,imports:0};}
const recordEvent=(self,type,details)=>{self.eventNumber++;self.ledger.push({...copy(details),id:self.eventNumber,age:self.age,region:self.activeRegion,type});if(self.ledger.length>3000)self.ledger.splice(0,500);};
/** Biome initialization affects measurable simulation fields rather than just visual colors. */
export function shapeBiome(world,region,imprint={}) {
 if(!REGION_BY_ID[region.id])throw Error('Unrecognized region');
 const rainFactor=region.rain,flora=region.flora;world.climate={rain:rainFactor,heat:region.heat};
 for(let i=0;i<N*N;i++){
  const p=world.sample(i%N-HALF,Math.floor(i/N)-HALF);
  const wetBias=(rainFactor-.7)*.18;
  world.m[i]=C(world.m[i]+wetBias);
  world.f[i]=C(world.f[i]*(.7+flora*.35));
  world.b[i]=C(world.b[i]*(.3+flora*.66)*(region.biome==='burnt'?.7:1));
  world.stone[i]=C(world.stone[i]*(.52+region.stone*.58));
  world.a[i]=C(world.a[i]*(.5+region.aether*.6)+(imprint.harmonic||0)*.08);
  if(region.biome==='coast'||region.biome==='wetland')world.w[i]=Math.max(world.w[i],Math.max(0,(-.12-p.height)*.25));
  if(region.biome==='burnt'||region.biome==='volcanic')world.ash[i]=C((region.biome==='volcanic'?.24:.34)*(1-p.moisture));
  if(region.biome==='clay')world.f[i]=C(world.f[i]+.1);
  if(imprint.groves)world.b[i]=C(world.b[i]+.09*imprint.groves);
  if(imprint.scars)world.ash[i]=C(world.ash[i]+.06*imprint.scars);
 }
 return world;
}
export class AtlasWorld {
 constructor(seed=2301){
  if(verifyContent().length)throw Error(verifyContent().join('; '));
  this.seed=seed|0;this.age=0;this.epoch=0;this.activeRegion='hearthland';this.eventNumber=0;
  this.worlds={};this.surfaces={};this.surfaceSaves={};this.ledger=[];this.completed=[];this.imprint={groves:0,scars:0,harmonic:0,bridges:0};
  this.wildlife=new WildlifeNetwork(this.seed,this.imprint);this.fieldGuide=[];this.residentTick=0;this.retiredResidents={};
  this.inventory={timber:4,clay:2,silt:1};this.equipment=[];this.reputation=0;this.characters=[{id:'iona',name:'Iona',hp:24,maxHp:24,level:1,position:{x:-16,z:-10},region:'hearthland',traits:['water','echo']}];
  this.economies=Object.fromEntries(REGIONS.map(r=>[r.id,baselineEconomy(r.id)]));
  this.npcShifts={};this.tradeRoutes=[];this.encounterIndex=0;this.flags={};this.activeEncounter=null;this.crowns=20;this.acousticState={flags:[]};this.acousticSurveyV2={epoch:0,survey:{discovered:[],samples:[]}};
  this.ensure('hearthland');
 }
 ensure(id){const region=REGION_BY_ID[id];if(!region)throw Error('Unknown region '+id);
  if(!this.worlds[id]){const seed=fnv(this.seed,region.seed,this.epoch);const w=shapeBiome(new LivingWorld(seed),region,this.imprint);if(this.imprint.bridges>0&&id==='hearthland')w.bridgeRepaired=true;
   // Lazy-initialized regions age with the world, preventing time resets on first visit.
   let left=this.age;while(left>0){const span=Math.min(left,90);w.dispatch({type:'advance',days:span});left-=span;}
   w.events=[];this.worlds[id]=w;}
  return this.worlds[id];
 }
 get world(){return this.ensure(this.activeRegion);}
 get region(){return REGION_BY_ID[this.activeRegion];}
 get surface(){return this.getSurface(this.activeRegion);}
 getSurface(id){this.ensure(id);if(!this.surfaces[id]){
   const surface=new SurfaceLayer({region:REGION_BY_ID[id],world:this.worlds[id],seed:fnv(this.seed,REGION_BY_ID[id].seed,this.epoch),age:this.age,save:this.surfaceSaves[id]||null,imprint:this.imprint.surface?.[id]||null});
   if(this.surfaceSaves[id]){const elapsed=surface.vegetation.getStats().day; if(elapsed>this.age)throw Error('Surface save from future world age'); let remaining=this.age-elapsed;while(remaining>0){const dt=Math.min(remaining,90);surface.advanceDays(dt);remaining-=dt;}}
   this.surfaces[id]=surface;delete this.surfaceSaves[id];
  }return this.surfaces[id];
 }
 surfaceAt(x,z){return this.surface.sample(x,z);}
 /** This is only called on a gameplay-accepted step, never from the render loop. */
 stepAt(x,z,opts={}){if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>32||Math.abs(z)>32)return {ok:false,reason:'Step outside world'};const prev=this.characters[0].position;if(Math.hypot(x-prev.x,z-prev.z)>1.5)return {ok:false,reason:'Footfall is not adjacent to the current party location'};const env=this.world.evaluate(x,z);if(!env.traversalPassable)return {ok:false,reason:'The route is physically blocked'};
  const step=this.surface.step(x,z,opts);this.characters[0].position={x,z};this.residentTick++;
  this.wildlife.disturb(this.activeRegion,x,z,{kind:'footfall',strength:Math.min(1,Math.max(.05,(step.noise??.3)*.65)),radius:5});recordEvent(this,'FOOTFALL_CONFIRMED',{x,z,material:step.surface.material,noise:step.noise});
  return {ok:true,...step};
 }
 repairSurface(x,z,material='clay'){if((this.inventory[material]||0)<1)return {ok:false,reason:'Repair requires one '+material};
  if(!['clay','basalt','timber','copper'].includes(material))return {ok:false,reason:'Not a repair material'};
  const check=this.surface.sample(x,z);if(check.fracture<.02)return {ok:false,reason:'This ground is already intact'};
  const r=this.surface.ground.repair(x,z,{strength:.36,materialResource:material});
  this.inventory[material]--;recordEvent(this,'SURFACE_REPAIRED',{x,z,material,integrity:r.integrity});return {ok:true,...r};
 }
 
 listRegions(){return REGIONS.map(r=>({...r,unlocked:this.canEnter(r.id),visited:!!this.worlds[r.id]}));}
 canEnter(id){return !!REGION_BY_ID[id]&&(id===this.activeRegion||this.region.neighbors.includes(id));}
 travel(id){if(!this.canEnter(id))return {ok:false,reason:'No connected passage from '+this.region.name};
  if(id===this.activeRegion)return {ok:true,region:this.region.name};
  this.activeRegion=id;this.activeEncounter=null;this.ensure(id);this.residentTick+=3;this.passDays(1);this.characters[0].region=id;this.characters[0].position={x:-16,z:-10};recordEvent(this,'TRAVEL',{destination:id});return {ok:true,region:this.region.name,age:this.age};
 }
 passDays(days){if(!Number.isInteger(days)||days<1||days>90)throw Error('Days must be 1..90');
  // Offscreen regions advance in the same deterministic fixed-step economy model.
  for(const w of Object.values(this.worlds))w.dispatch({type:'advance',days});
  this.age+=days;this.residentTick+=days*3;
  for(const surface of Object.values(this.surfaces))surface.advanceDays(days);
  for(const r of REGIONS)this.updateEconomy(r.id,days);
  this.wildlife.advance(days,this.worlds);
  recordEvent(this,'DAYS_PASSED',{days});return {ok:true,days,age:this.age};
 }
 updateEconomy(id,days){const r=REGION_BY_ID[id],e=this.economies[id],w=this.worlds[id];
  const canopy=w?w.summary().canopy:C(.4*r.flora),ash=w?w.summary().ash:(r.biome==='burnt'?.28:0);
  const fertility=C(r.rain*.7+canopy*.3-ash*.6);
  const output=Math.floor(days*(.25+fertility*.8)*e.productivity);
  e.stock[r.resource]=Math.min(120,e.stock[r.resource]+output);
  // Food demand changes living conditions; shortage lowers productivity.
  const foodSupply=clamp(canopy*r.flora+fertility*.42,.05,1.7);
  e.hunger=C(e.hunger+days*(.023-foodSupply*.027));
  e.condition=C(e.condition+days*(.006-.018*e.hunger-ash*.012));
  e.productivity=clamp(.58+e.condition*.47-e.hunger*.48,.2,1.6);
  e.wealth=Math.max(0,e.wealth+Math.floor(output*.18-days*e.hunger*.15));
 }
 price(id,material){if(!MATERIALS[material]||!REGION_BY_ID[id])throw Error('Unknown market input');const e=this.economies[id],r=REGION_BY_ID[id];const scarcity=1.6/(1+e.stock[material]/4);
  const geography=r.resource===material?.68:1.25;
  const risk=1+e.hunger*.65+(1-e.condition)*.25;
  return Math.max(1,Math.round(MATERIALS[material].value*scarcity*geography*risk));
 }
 trade(from,to,material,qty){if(!Number.isInteger(qty)||qty<1||qty>20||!MATERIALS[material])throw Error('Invalid trade');
  if(!REGION_BY_ID[from]?.neighbors.includes(to))return {ok:false,reason:'No trade road'};
  const a=this.economies[from],b=this.economies[to];if(a.stock[material]<qty)return {ok:false,reason:'Insufficient market supply'};
  const freight=2*qty,price=this.price(from,material)*qty+freight;
  if(b.wealth<price)return {ok:false,reason:'Destination cannot afford shipment'};
  a.stock[material]-=qty;b.stock[material]+=qty;a.wealth+=price-freight;b.wealth-=price;
  a.exports+=qty;b.imports+=qty;this.tradeRoutes.push({from,to,material,qty,price,age:this.age});recordEvent(this,'TRADE',{from,to,material,qty,price});return {ok:true,price};
 }
 /** Read actual animal pressure and ground traces. A note is knowledge, not free loot. */
 trackSpecies(speciesId,x,z){
  const species=SPECIES_BY_ID[speciesId];
  if(!species||species.region!==this.activeRegion)return {ok:false,reason:'Species not native to the active region'};
  if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>32||Math.abs(z)>32)return {ok:false,reason:'Survey point outside region'};
  const wildlife=this.wildlife.sample(speciesId,x,z);
  if(wildlife.count<1)return {ok:false,reason:'No resident signs remain here'};
  const at=this.surface.sample(x,z),loc=this.world.sample(x,z),hab=this.habitats(x,z).find(s=>s.id===speciesId);
  const confidence=fixed(C(.10+hab.abundance*.38+at.tracePersistence*.13+loc.moisture*.14+at.traffic*.15-(loc.fire*.2)));
  if(confidence<.13)return {ok:false,reason:'Not enough physical evidence to identify tracks'};
  const id=`${this.epoch}:${speciesId}`;
  const previous=this.fieldGuide.find(n=>n.id===id);
  if(previous?.age===this.age)return {ok:false,reason:'Already surveyed this species today',confidence:previous.confidence};
  const note={id,species:speciesId,region:this.activeRegion,x:fixed(x),z:fixed(z),age:this.age,epoch:this.epoch,confidence,material:at.material,population:wildlife.count,disturbance:wildlife.disturbance};
  if(previous)Object.assign(previous,note,{confidence:Math.max(previous.confidence,confidence)});
  else this.fieldGuide.push(note);
  if(this.fieldGuide.length>800)this.fieldGuide.splice(0,this.fieldGuide.length-800);
  recordEvent(this,'WILDLIFE_TRACKED',{species:speciesId,x,z,confidence,material:at.material});
  return {ok:true,name:species.name,confidence,material:at.material,population:wildlife.count,behavior:species.behavior,notes:this.fieldGuide.length};
 }
 inspect(x,z){const sample=this.world.sample(x,z),environment=this.world.evaluate(x,z),region=this.region;
  const ecology=this.habitats(x,z);const economy=this.economies[region.id],surface=this.surface.sample(x,z);
  return {region:region.id,age:this.age,epoch:this.epoch,...sample,environment,habitats:ecology.slice(0,4),resource:region.resource,price:this.price(region.id,region.resource),market:copy(economy),surface,narrative:this.memoryAt(x,z),npcs:this.npcsAt(x,z)};
 }
 adaptationAt(species,x,z){const s=this.world.sample(x,z);
  const scores={tidebound:s.moisture*.7+s.water*.65,cinderworn:s.ash+s.fire*.5,stonegrown:s.stone,phasebound:s.resonance*.8+s.aether*.57};
  const [id,value]=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];
  return value>.64?{id,...MORPHS[id],score:fixed(value)}:null;
 }
 habitats(x,z){const s=this.world.sample(x,z),g=this.world.evaluate(x,z);const species=SPECIES.filter(v=>v.region===this.activeRegion);
  return species.map(v=>{
   const h=v.habitat,fit=1-(Math.abs(s.moisture-h.moisture)+Math.abs(s.biomass-h.biomass)+Math.abs(s.aether-h.aether)+Math.abs(s.stone-h.stone))/4;
   const behavior=v.behavior==='resonate'?s.resonance:v.behavior==='scavenge'?s.ash:v.behavior==='tunnel'?s.stone:v.behavior==='migrate'?s.moisture:v.behavior==='ambush'?s.biomass:g.cover;
   const wildlife=this.wildlife.sample(v.id,x,z);
   const abundance=C(.1+fit*.54+behavior*.3-(s.fire*.2))*wildlife.visible;
   const morph=this.adaptationAt(v,x,z);return {...v,displayName:morph?`${morph.name} ${v.name}`:v.name,morph:morph?.id||'native',abundance:fixed(abundance),population:wildlife.count,alert:wildlife.alert,disturbance:wildlife.disturbance,defense:fixed((v.armor+(morph?.armor||0))*(.5+.5*g.cover))};
  }).sort((a,b)=>b.abundance-a.abundance);
 }
 encounter(x,z,step=0){const g=this.world.evaluate(x,z),hab=this.habitats(x,z);
  const rand=pseudo(fnv(this.seed,this.epoch,this.activeRegion,this.age,Math.round(x),Math.round(z),step,this.encounterIndex));
  const roll=rand();const ground=this.surface.sample(x,z);const population=hab.reduce((v,h)=>v+h.abundance,0)/Math.max(.1,hab.length);
  const chance=C(g.encounterChance*(1+.14*this.region.heat)*(1+.24*ground.noise-.20*ground.concealment+.12*ground.traffic)*Math.min(1.4,population*1.9));
  if(roll>=chance||hab.every(h=>h.population<1))return {triggered:false,roll:fixed(roll),chance:fixed(chance),region:this.activeRegion};
  const sum=hab.reduce((a,b)=>a+b.abundance,0),pick=rand()*sum;let s=0,chosen=hab.at(-1);
  for(const species of hab){s+=species.abundance;if(s>=pick){chosen=species;break;}}
  return {triggered:true,roll:fixed(roll),chance:fixed(chance),creature:chosen.id,name:chosen.displayName,level:chosen.level,behavior:chosen.behavior,morph:chosen.morph,shielding:g.shielding};
 }
 /** Enter a real encounter through a deterministic roll; only an engaged creature can be fought. */
 beginEncounter(x,z){if(this.activeEncounter)return {ok:false,reason:'Finish the current encounter first'};
  const event=this.encounter(x,z,this.encounterIndex++);
  if(event.triggered){const creature=SPECIES_BY_ID[event.creature];const maxHp=fixed(1.8+creature.level*.6+creature.armor*.9);this.activeEncounter={species:event.creature,x,z,age:this.age,hp:maxHp,maxHp,round:0};recordEvent(this,'ENCOUNTER_STARTED',{species:event.creature,x,z});}
  return {ok:true,...event};
 }
 /** Spatially authoritative actors, shared with the renderer and UI. */
 residents(){return residentRoster({world:this.world,region:this.region,wildlife:this.wildlife,tick:this.residentTick,retired:this.retiredResidents});}
 resident(id){return this.residents().find(a=>a.id===id)||null;}
 inspectResident(id){const r=this.resident(id),player=this.characters[0].position;
  if(!r)return {ok:false,reason:'Creature no longer present in this habitat'};
  const distance=residentDistance(r,player);if(distance>7)return {ok:false,reason:'Move closer to observe this creature'};
  const result=this.trackSpecies(r.species,r.x,r.z);
  if(!result.ok)return result;
  recordEvent(this,'RESIDENT_STUDIED',{residentId:id,species:r.species,distance:fixed(distance)});
  return {...result,residentId:id,distance:fixed(distance)};
 }
 /** No menu-triggered remote combat. A visible resident must be alive, present and reachable. */
 engageResident(id){const r=this.resident(id),player=this.characters[0].position;
  if(!r)return {ok:false,reason:'That creature is not physically present'};
  if(this.activeEncounter)return {ok:false,reason:'Finish the existing encounter first'};
  if(!residentInReach(r,player))return {ok:false,reason:`Move closer to ${r.name} (${residentDistance(r,player).toFixed(1)} m away)`};
  const result=this.engageVisible(r.species,r.x,r.z);
  if(result.ok){this.activeEncounter.residentId=id;recordEvent(this,'RESIDENT_ENGAGED',{residentId:id,species:r.species,x:r.x,z:r.z});}
  return {...result,residentId:id,distance:fixed(residentDistance(r,player))};
 }
 /** Bounded guided approach uses lawful, noisy, persistent steps. No animation-driven teleport. */
 approachResident(id,maxSteps=6){if(!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>12)throw Error('Invalid approach step limit');
  if(this.activeEncounter)return {ok:false,reason:'Finish the encounter before approaching'};
  const steps=[];let last=null;
  for(let j=0;j<maxSteps;j++){
   const r=this.resident(id);if(!r)return {ok:false,reason:'Creature left this habitat',steps};
   const p=this.characters[0].position;
   if(residentInReach(r,p)){return {ok:true,near:true,steps,residentId:id,distance:fixed(residentDistance(r,p))};}
   const path=this.pathfind(p,{x:Math.round(r.x),z:Math.round(r.z)});
   if(!path.ok||path.steps.length<2)return {ok:false,reason:'Creature cannot be reached on foot',steps};
   last=path.steps[1];const result=this.stepAt(last.x,last.z,{actor:'iona',weight:1,speed:1});
   if(!result.ok)return {ok:false,reason:result.reason,steps};
   steps.push({x:last.x,z:last.z,material:result.surface.material,noise:result.noise});
  }
  const r=this.resident(id),p=this.characters[0].position;
  return {ok:true,near:!!r&&residentInReach(r,p),steps,residentId:id,distance:r?fixed(residentDistance(r,p)):null};
 }
 /** An actor visible on the map can be challenged directly; legacy scripted encounters only. */
 engageVisible(speciesId,x,z){const s=SPECIES_BY_ID[speciesId];if(!s||s.region!==this.activeRegion)return {ok:false,reason:'That creature is not here'};
  if(this.activeEncounter)return {ok:false,reason:'Another encounter is active'};
  if(this.wildlife.cohort(speciesId).count<1)return {ok:false,reason:'This creature population has retreated from the region'};
  const maxHp=fixed(1.8+s.level*.6+s.armor*.9);this.activeEncounter={species:speciesId,x,z,age:this.age,hp:maxHp,maxHp,round:0};recordEvent(this,'ENCOUNTER_STARTED',{species:speciesId,x,z,visible:true});return {ok:true,name:s.name};
 }
 abandonEncounter(){if(!this.activeEncounter)return {ok:false,reason:'No current encounter'};
  const species=this.activeEncounter.species;this.activeEncounter=null;recordEvent(this,'RETREAT',{species});return {ok:true,reason:'Retreated from encounter'};
 }
 fight(x,z,speciesId,element,power=2){const species=SPECIES_BY_ID[speciesId];if(!species||species.region!==this.activeRegion)return {ok:false,reason:'Creature not present in region'};
  if(!this.activeEncounter||this.activeEncounter.species!==speciesId)return {ok:false,reason:'Encounter this creature in the world before battling'};
  if(this.activeEncounter.residentId){const p=this.characters[0].position;if(Math.hypot(x-p.x,z-p.z)>3.5||!residentInReach(this.activeEncounter,p,3.6))return {ok:false,reason:'The engaged resident is beyond actual party reach'};}else if(Math.hypot(x-this.activeEncounter.x,z-this.activeEncounter.z)>3.5)return {ok:false,reason:'The engaged creature is no longer within attack range'};
  if(this.characters[0].hp<=0)return {ok:false,reason:'Party incapacitated — recover in a settlement'};
  const targetX=this.activeEncounter.residentId?this.activeEncounter.x:x,targetZ=this.activeEncounter.residentId?this.activeEncounter.z:z;
  const attack=this.world.resolveAttack(targetX,targetZ,element,power);const environment=this.world.evaluate(targetX,targetZ),loc=this.world.sample(targetX,targetZ),mat=MATERIALS[species.drop],morph=this.adaptationAt(species,targetX,targetZ);
  const advantage=element===species.element?-.2:element==='water'&&species.element==='fire'?.28:element==='fire'&&species.element==='water'?-.27:0;
  // The target's physical composition mediates elemental response. Products create nonlinear effects.
  const wet=loc.moisture+loc.water*.5;
  const matrix=element==='fire'?(1-mat.water*.42)*(1+.25*wet*mat.heat):element==='aether'?(1+.28*mat.conduct*loc.resonance):element==='earth'?(1-.3*mat.hardness):1+.22*mat.water*loc.fire;
  const gear=this.equipment.reduce((a,item)=>{for(const [k,v] of Object.entries(item.effect)){a[k]=(a[k]||0)+v;}return a;},{});
  const elementalBonus=element==='aether'?(gear.aether||0):element==='fire'?(gear.fire||0):0;
  const adaptationDefense=morph?.resistances[element]||0;
  const surfaceBefore=this.surface.sample(targetX,targetZ);const defendingSurface=this.activeEncounter.residentId?this.surface.sample(x,z):surfaceBefore,defendingEnvironment=this.activeEncounter.residentId?this.world.evaluate(x,z):environment;
  const final=fixed(Math.max(.1,attack.damage*(1-(species.armor+(morph?.armor||0))*.27)*matrix*(1+advantage)*(1-adaptationDefense)*(1+.12*this.reputation/20)*(1+elementalBonus*.42)*(1-.14*surfaceBefore.groundShield)*(element==='aether'?(1+.09*surfaceBefore.resonance):1)));
  this.world.dispatch({type:'cast',x:targetX,z:targetZ,element,power});
  const surfaceImpact=this.surface.impact(targetX,targetZ,element,Math.min(1,power/5));
  this.wildlife.disturb(this.activeRegion,targetX,targetZ,{kind:'combat',strength:Math.min(2,.3+power*.22),radius:12});
  const engagement=this.activeEncounter;engagement.hp=fixed(Math.max(0,engagement.hp-final));engagement.round++;const victorious=engagement.hp<=0;
  const knowledge=this.fieldGuide.filter(n=>n.species===species.id).reduce((v,n)=>Math.max(v,n.confidence),0);
  const defense=C(defendingEnvironment.cover*.35+defendingSurface.groundShield*.24+(gear.cover||0)+((gear[species.element]||0)*.5)+knowledge*.07);
  const incoming=victorious?0:fixed(Math.max(.25,(species.level*.35+species.aggression*2.1)*(1-defense)));
  this.characters[0].hp=fixed(Math.max(0,this.characters[0].hp-incoming));
  if(victorious){if(engagement.residentId)this.retiredResidents[engagement.residentId]=this.residentTick;this.wildlife.defeat(species.id,targetX,targetZ);this.inventory[species.drop]=(this.inventory[species.drop]||0)+species.loot.amount;if(morph)this.inventory[morph.material]=(this.inventory[morph.material]||0)+1;this.reputation++;}
  if(victorious||this.characters[0].hp<=0)this.activeEncounter=null;
  if(victorious&&species.id==='basalt_rift.sentry')this.flags.guardianDefeated=true;
  recordEvent(this,'BATTLE',{species:species.id,x,z,element,power,damage:final,incoming,remainingHp:engagement.hp,victorious,round:engagement.round});
  return {ok:true,species:morph?`${morph.name} ${species.name}`:species.name,morph:morph?.id||'native',damage:final,incoming,hp:this.characters[0].hp,remainingHp:engagement.hp,maxHp:engagement.maxHp,round:engagement.round,victorious,loot:victorious?{...species.loot,adaptedMaterial:morph?.material||null}:null,reaction:attack.reaction,environment:environment.cover,elementalResistance:fixed(matrix),defense:fixed(defense),ground:surfaceBefore.material,groundEffects:surfaceImpact.effects};
 }
 buy(material,qty=1){if(!MATERIALS[material]||!Number.isInteger(qty)||qty<1||qty>30)throw Error('Invalid market purchase');
  const e=this.economies[this.activeRegion],cost=this.price(this.activeRegion,material)*qty;
  if(e.stock[material]<qty)return {ok:false,reason:'Market supply exhausted'};
  if(cost>this.crowns)return {ok:false,reason:`Need ${cost} crowns; have ${this.crowns}`};
  this.crowns-=cost;e.stock[material]-=qty;e.wealth+=cost;this.inventory[material]=(this.inventory[material]||0)+qty;
  recordEvent(this,'PLAYER_PURCHASE',{material,qty,cost});return {ok:true,cost,crowns:this.crowns};
 }
 sell(material,qty=1){if(!MATERIALS[material]||!Number.isInteger(qty)||qty<1||qty>30)throw Error('Invalid sale');
  const e=this.economies[this.activeRegion];if((this.inventory[material]||0)<qty)return {ok:false,reason:'Insufficient possessions'};
  const payment=Math.max(1,Math.floor(this.price(this.activeRegion,material)*.65))*qty;
  if(e.wealth<payment)return {ok:false,reason:'Merchant lacks crowns'};
  this.crowns+=payment;e.wealth-=payment;e.stock[material]+=qty;this.inventory[material]-=qty;
  recordEvent(this,'PLAYER_SALE',{material,qty,payment});return {ok:true,payment,crowns:this.crowns};
 }
 rest(){const e=this.economies[this.activeRegion];if(e.hunger>.85)return {ok:false,reason:'The town is starving; bring supplies before resting'};
  this.passDays(1);const c=this.characters[0];const heal=4+Math.round(e.condition*7);c.hp=Math.min(c.maxHp,c.hp+heal);
  recordEvent(this,'REST',{heal,hp:c.hp});return {ok:true,heal,hp:c.hp};
 }
 craft(recipeId){const recipe=RECIPE_BY_ID[recipeId];if(!recipe)return {ok:false,reason:'Unknown recipe'};
  for(const [mat,count] of Object.entries(recipe.materials))if((this.inventory[mat]||0)<count)return {ok:false,reason:`Need ${count} ${mat}`};
  for(const [mat,count] of Object.entries(recipe.materials))this.inventory[mat]-=count;
  const item={id:`${recipe.id}.${this.epoch}.${this.eventNumber+1}`,recipe:recipe.id,origin:this.activeRegion,age:this.age,materials:copy(recipe.materials),effect:copy(recipe.effect)};
  this.equipment.push(item);recordEvent(this,'CRAFT',{item});return {ok:true,item};
 }
 resolveQuest(id,x=-16,z=-10){const q=QUEST_BY_ID[id];if(!q||q.region!==this.activeRegion)return {ok:false,reason:'Quest belongs to another region'};
  if(this.completed.includes(id))return {ok:false,reason:'Already completed'};
  if(q.requires.some(n=>!this.completed.includes(n)))return {ok:false,reason:'Earlier story choices are still unresolved'};
  let event=null;
  if(q.action==='open_sluice')event={type:'sluice',open:true};
  if(q.action==='repair_bridge'&&!this.world.bridgeRepaired)event={type:'bridge'};
  if(q.action==='sound_hydrophone')event={type:'hydrophone',x,z,phase:0,intensity:1};
  if(q.action==='cast_earth')event={type:'cast',x,z,element:'earth',power:3};
  if(q.action==='harvest')event={type:'harvest',x,z};
  if(q.action==='defeat_boss'&&!this.flags.guardianDefeated)return {ok:false,reason:'Defeat the Crownless Watcher in an actual encounter first'};
  if(event){const done=this.world.dispatch(event);if(!done.ok)return done;this.applyAcceptedSurfaceEvent({kind:q.action==='cast_earth'?'ELEMENTAL_SKILL_CAST':q.action==='harvest'?'RESOURCE_HARVESTED':q.action==='sound_hydrophone'?'HYDROPHONE_PLAYED':'QUEST_ACTION',...event});}
  if(q.action==='repair_bridge')this.imprint.bridges++;
  this.completed.push(q.id);this.reputation+=q.reward.reputation;
  this.flags[id]=true;recordEvent(this,'QUEST_COMPLETED',{quest:id,consequence:q.consequence});return {ok:true,quest:q.name,consequence:q.consequence,reputation:this.reputation};
 }
 memoryAt(x,z){const s=this.world.sample(x,z),g=this.world.evaluate(x,z),r=this.region;
  const bonus=this.equipment.reduce((x,gear)=>x+(gear.effect.echo||0),0);const clarity=C(s.resonance*.63+g.historyEcho*.35+bonus*.22);
  const fragments=['Only static remains.','A faint voice survives in the material.','The old song has become audible.','The place sings with remembered decisions.'];
  const layer=Math.min(3,Math.floor(clarity*4));
  const reveal=this.completed.some(q=>QUEST_BY_ID[q]?.region===r.id);
  return {clarity:fixed(clarity),layer,text:fragments[layer],secret:reveal||layer>=2?r.story:'The signal is too weak to resolve this region’s history.'};
 }
 npcsAt(x,z){const r=this.region,e=this.economies[r.id],daytime=(this.age%2===0),rain=this.world.sky==='rain';
  const urgent=e.hunger>.48,work=daytime&&!rain,nearby=Math.hypot(x-16,z-14)<19,singerNearby=Math.hypot(x+14,z+10)<12;
  return [
   {id:`${r.id}.elder`,name:`${r.people} Elder`,role:'historian',activity:urgent?'organizing food distribution':work?'hearing visitors':'sheltering by the hearth',nearby,dialogue:urgent?'Our fields are failing. We need safer harvests.':this.memoryAt(x,z).secret},
   {id:`${r.id}.merchant`,name:`${r.people} Merchant`,role:'trader',activity:work?'trading local '+r.resource:'closing the market',nearby,dialogue:`${r.resource} costs ${this.price(r.id,r.resource)} crowns today. The stores stand at ${e.stock[r.resource]}.`},
   {id:`${r.id}.warden`,name:`${r.people} Warden`,role:'builder',activity:work?'repairing paths and flood defenses':'guarding the settlement',nearby,dialogue:e.condition<.5?'Our buildings are suffering. The land is changing faster than we can rebuild.':'The river and its bridge decide who can reach us.'},
   {id:`${r.id}.singer`,name:`${r.people} Singer`,role:'hydrophone keeper',activity:work?'recording environmental harmonics':'listening for lost voices',nearby:singerNearby,dialogue:`The local resonance is ${(100*this.world.sample(x,z).resonance).toFixed(0)} percent. Tune the Hydrophone to retrieve its history.`}
  ];
 }
 talk(npcId,x=-16,z=-10){const citizen=this.npcsAt(x,z).find(n=>n.id===npcId);if(!citizen)return {ok:false,reason:'Citizen is not available'};if(!citizen.nearby)return {ok:false,reason:'This resident is elsewhere. Visit the settlement or chapel first.'};
  recordEvent(this,'NPC_CONVERSATION',{npc:npcId,x,z});return {ok:true,name:citizen.name,role:citizen.role,dialogue:citizen.dialogue,activity:citizen.activity};
 }
 /** Grid-based A* for a bounded navigation query, using the same field as combat and visualization. */
 pathfind(start,end,maxSearch=6500){const k=(x,z)=>`${x},${z}`,convert=p=>({x:clamp(Math.round(p.x),-HALF,HALF),z:clamp(Math.round(p.z),-HALF,HALF)});
  const a=convert(start),b=convert(end),startKey=k(a.x,a.z),goal=k(b.x,b.z);
  const open=new Map([[startKey,{...a,g:0,f:Math.hypot(b.x-a.x,b.z-a.z)}]]),parents=new Map(),best=new Map([[startKey,0]]);let searched=0;
  while(open.size&&searched++<maxSearch){let top=null,key=null;for(const [candidate,v] of open)if(!top||v.f<top.f||(v.f===top.f&&candidate<key)){top=v;key=candidate;}
   open.delete(key);if(key===goal){const route=[{x:top.x,z:top.z}];let cur=key;while(parents.has(cur)){cur=parents.get(cur);const [x,z]=cur.split(',').map(Number);route.push({x,z});}return {ok:true,cost:fixed(top.g),steps:route.reverse(),visited:searched};}
   for(const [dx,dz] of [[0,1],[1,0],[0,-1],[-1,0]]){
    const x=top.x+dx,z=top.z+dz;if(Math.abs(x)>HALF||Math.abs(z)>HALF)continue;
    const env=this.world.evaluate(x,z);if(!env.traversalPassable)continue;
    const key2=k(x,z),g=top.g+env.walkCost+Math.max(0,this.surface.sample(x,z).movementCost-1)*.23;if(g>= (best.get(key2)??Infinity))continue;
    best.set(key2,g);parents.set(key2,key);open.set(key2,{x,z,g,f:g+Math.abs(b.x-x)+Math.abs(b.z-z)});
   }
  }
  return {ok:false,reason:'No legal route found within search budget',visited:searched};
 }
 applyAcceptedSurfaceEvent(event){const {x,z}=event;if(!Number.isFinite(x)||!Number.isFinite(z))return null;
  if(event.kind==='ELEMENTAL_SKILL_CAST'){this.wildlife.disturb(this.activeRegion,x,z,{kind:'spell',strength:Math.min(1,.25+(event.power||1)*.14),radius:9});return this.surface.impact(x,z,event.element,Math.min(1,(event.power||1)/5));}
  if(event.kind==='ENVIRONMENT_IGNITED'){this.wildlife.disturb(this.activeRegion,x,z,{kind:'fire',strength:1.2,radius:12});return this.surface.impact(x,z,'fire',1);}
  if(event.kind==='RESOURCE_HARVESTED')return this.surface.harvestConfirmed(x,z);
  if(event.kind==='HYDROPHONE_PLAYED')return this.surface.impact(x,z,'aether',Math.min(1,event.intensity??1));
  return null;
 }
 dispatch(event){if(!event||typeof event.kind!=='string')throw Error('Game event kind required');
  if(event.kind==='FOOTFALL_CONFIRMED')return this.stepAt(event.x,event.z,{actor:event.actor??'player',weight:event.weight??1,speed:event.speed??1,stealth:event.stealth??0});
  if(event.kind==='SURFACE_REPAIR_CONFIRMED')return this.repairSurface(event.x,event.z,event.material??'clay');
  if(event.kind==='DAYS_PASSED')return this.passDays(event.days);
  if(event.kind==='REGION_TRAVEL')return this.travel(event.region);
  if(event.kind==='QUEST_RESOLVED')return this.resolveQuest(event.quest,event.x,event.z);
  if(event.kind==='MONSTER_DEFEATED')return this.fight(event.x,event.z,event.creature,event.element,event.power);
  if(event.kind==='ITEM_CRAFTED')return this.craft(event.recipe);
  if(event.kind==='PLAYER_PURCHASE')return this.buy(event.material,event.qty);
  if(event.kind==='PLAYER_SALE')return this.sell(event.material,event.qty);
  if(event.kind==='PARTY_RESTED')return this.rest();
  if(event.kind==='NPC_CONVERSATION')return this.talk(event.npc,event.x,event.z);
  if(event.kind==='WILDLIFE_TRACKED')return this.trackSpecies(event.species,event.x,event.z);
  const before=this.world.events.length, result=gameEvent(this.world,event);
  if(result.ok&&this.world.events.length>before){this.applyAcceptedSurfaceEvent(event);recordEvent(this,event.kind,{...event});
   if(event.kind==='RESOURCE_HARVESTED')this.inventory[this.region.resource]=(this.inventory[this.region.resource]||0)+1;
   if(event.kind==='BRIDGE_REPAIRED')this.imprint.bridges++;
  }
  return result;
 }
 /** Actions shape the next world: closures reset, historical imprints survive. */
 newGamePlus(){const totalAsh=Object.values(this.worlds).reduce((s,w)=>s+w.summary().ash,0),n=Object.keys(this.worlds).length;
  const grooves=Object.values(this.worlds).reduce((s,w)=>s+w.summary().canopy,0)/n;
  const soundQuests=new Set(['roots_singing','underwater_road','furnace_names','moon_mirror','machine_of_days']);
  const sounds=this.ledger.filter(e=>e.type==='HYDROPHONE_PLAYED'||(e.type==='QUEST_COMPLETED'&&soundQuests.has(e.quest))).length;
  const imprint={groves:C(grooves),scars:C(totalAsh/n),harmonic:C(sounds/10),bridges:this.imprint.bridges};
  const surfaceHistory=Object.values(this.surfaces).map(layer=>{
   const f=layer.ground.fields,avg=(a)=>a.reduce((x,v)=>x+v,0)/a.length;
   const entries=layer.vegetation.serialize().entries;
   const signature={phase:fixed(avg(f.phase)),wear:fixed(avg(f.traffic)*8),scars:fixed(entries.length?entries.reduce((x,c)=>x+c[4],0)/entries.length:0)};
   return {region:layer.region.id,vegetation:layer.vegetation.getStats(),traces:layer.ground.events.length,signature};
  });
  imprint.surface=Object.fromEntries(surfaceHistory.map(x=>[x.region,x.signature]));
  const history={epoch:this.epoch,age:this.age,completed:[...this.completed],imprint,events:this.ledger.length,surfaceHistory};
  if(!this.history)this.history=[];this.history.push(history);
  this.epoch++;this.acousticSurveyV2={epoch:this.epoch,survey:{discovered:[],samples:[]}};this.age=0;this.worlds={};this.surfaces={};this.surfaceSaves={};this.activeRegion='hearthland';this.activeEncounter=null;this.completed=[];this.flags={};this.imprint=imprint;
  this.economies=Object.fromEntries(REGIONS.map(r=>[r.id,baselineEconomy(r.id)]));
  this.wildlife=new WildlifeNetwork(this.seed+this.epoch,this.imprint);this.residentTick=0;this.retiredResidents={};
  this.fieldGuide=this.fieldGuide.filter(n=>n.confidence>.20).map(n=>({...n,confidence:fixed(n.confidence*.60)}));
  this.inventory={timber:4,clay:2,silt:1};this.equipment=[];this.crowns=20;this.characters[0].hp=this.characters[0].maxHp;this.characters[0].region='hearthland';this.characters[0].position={x:-16,z:-10};
  this.ensure('hearthland');recordEvent(this,'NEW_GAME_PLUS',{parent:history.epoch,imprint});return {ok:true,epoch:this.epoch,imprint,history};
 }
 summary(){const s=this.world.summary(),region=this.region,e=this.economies[region.id];return {...s,region:region.id,regionName:region.name,age:this.age,epoch:this.epoch,imprint:this.imprint,quests:this.completed.length,possibleQuests:QUESTS.filter(q=>q.region===region.id&&!this.completed.includes(q.id)),reputation:this.reputation,crowns:this.crowns,activeEncounter:copy(this.activeEncounter),inventory:copy(this.inventory),economy:{wealth:e.wealth,hunger:fixed(e.hunger),condition:fixed(e.condition)},nearby:SPECIES.filter(v=>v.region===region.id).length,wildlife:this.wildlife.summary(region.id),fieldGuide:copy(this.fieldGuide.slice(-12)),characters:copy(this.characters)};}
 snapshot(){return {version:3,residentTickV8:this.residentTick,retiredResidentsV8:copy(this.retiredResidents),wildlifeV7:this.wildlife.snapshot(),fieldGuideV7:copy(this.fieldGuide),seed:this.seed,age:this.age,epoch:this.epoch,activeRegion:this.activeRegion,eventNumber:this.eventNumber,worlds:Object.fromEntries(Object.entries(this.worlds).map(([id,w])=>[id,w.snapshot()])),surfaceStates:{...copy(this.surfaceSaves),...Object.fromEntries(Object.entries(this.surfaces).map(([id,layer])=>[id,layer.snapshot()]))},ledger:copy(this.ledger),completed:[...this.completed],imprint:copy(this.imprint),inventory:copy(this.inventory),equipment:copy(this.equipment),reputation:this.reputation,characters:copy(this.characters),economies:copy(this.economies),tradeRoutes:copy(this.tradeRoutes),encounterIndex:this.encounterIndex,activeEncounter:copy(this.activeEncounter),crowns:this.crowns,flags:copy(this.flags),acousticState:copy(this.acousticState),acousticSurveyV2:copy(this.acousticSurveyV2),history:copy(this.history||[])};}
 static restore(data){if(data?.version!==3||!REGION_BY_ID[data.activeRegion]||!Number.isInteger(data.age)||data.age<0||data.age>100000)throw Error('Incompatible atlas save');const a=new AtlasWorld(data.seed);
  a.wildlife=data.wildlifeV7?WildlifeNetwork.restore(data.wildlifeV7):new WildlifeNetwork(a.seed+Number(data.epoch||0),data.imprint||{});
  a.fieldGuide=copy(data.fieldGuideV7??[]);
  a.residentTick=data.residentTickV8??0;a.retiredResidents=copy(data.retiredResidentsV8??{});
  if(!Number.isSafeInteger(a.residentTick)||a.residentTick<0||a.residentTick>50000000||!a.retiredResidents||Array.isArray(a.retiredResidents)||typeof a.retiredResidents!=='object'||Object.keys(a.retiredResidents).length>5000||Object.entries(a.retiredResidents).some(([id,t])=>!/^[-a-z0-9_:.]+$/i.test(id)||!Number.isSafeInteger(t)||t<0||t>a.residentTick))throw Error('Invalid v8 resident state');
  if(!Array.isArray(a.fieldGuide)||a.fieldGuide.length>800||a.fieldGuide.some(n=>!n||!SPECIES_BY_ID[n.species]||n.region!==SPECIES_BY_ID[n.species].region||!Number.isFinite(n.confidence)||n.confidence<0||n.confidence>1||!Number.isFinite(n.x)||!Number.isFinite(n.z)||Math.abs(n.x)>32||Math.abs(n.z)>32||!Number.isInteger(n.age)||n.age<0||!Number.isInteger(n.epoch)||n.epoch<0||n.epoch>data.epoch||typeof n.material!=='string'))throw Error('Invalid field guide save');
  a.surfaceSaves=copy(data.surfaceStates||{});for(const id of Object.keys(a.surfaceSaves))if(!REGION_BY_ID[id])throw Error('Unknown saved surface region');
  for(const [id,raw] of Object.entries(data.worlds||{})){if(!REGION_BY_ID[id])throw Error('Save has unknown region');a.worlds[id]=LivingWorld.restore(raw);}
  for(const key of ['age','epoch','activeRegion','eventNumber','reputation','encounterIndex','crowns'])a[key]=data[key];
  for(const key of ['ledger','completed','imprint','inventory','equipment','characters','economies','tradeRoutes','activeEncounter','flags','history'])a[key]=copy(data[key]);
  a.acousticSurveyV2=copy(data.acousticSurveyV2??{epoch:a.epoch,survey:{discovered:[],samples:[]}});
  if(!a.acousticSurveyV2||!Number.isInteger(a.acousticSurveyV2.epoch)||a.acousticSurveyV2.epoch<0||a.acousticSurveyV2.epoch>a.epoch||
    !a.acousticSurveyV2.survey||!Array.isArray(a.acousticSurveyV2.survey.discovered)||!Array.isArray(a.acousticSurveyV2.survey.samples)||
    a.acousticSurveyV2.survey.discovered.length>5000||a.acousticSurveyV2.survey.samples.length>5000||
    a.acousticSurveyV2.survey.discovered.some(x=>typeof x!=='string'||x.length>160))throw Error('Invalid acoustic survey extension');
  a.acousticState=copy(data.acousticState??{flags:[]});if(!a.acousticState||!Array.isArray(a.acousticState.flags)||a.acousticState.flags.some(x=>typeof x!=='string'||x.length>160))throw Error('Invalid acoustic save');
  if(!a.worlds[a.activeRegion])throw Error('Save missing active region');
  if(a.activeEncounter?.residentId){const rId=a.activeEncounter.residentId;if(typeof rId!=='string'||rId.length>160||!rId.startsWith(a.activeRegion+':')||!Object.values(SPECIES_BY_ID).some(s=>rId.startsWith(`${a.activeRegion}:${s.id}:`))||![a.activeEncounter.x,a.activeEncounter.z].every(Number.isFinite))throw Error('Invalid v8 encounter reference');}
  // v6 and older saves may lack a census. Their world age remains authoritative.
  if(!data.wildlifeV7)a.wildlife.day=a.age;
  if(a.completed.some(id=>!QUEST_BY_ID[id]))throw Error('Unknown quest in save');
  for(const [mat,q] of Object.entries(a.inventory))if(!MATERIALS[mat]||!Number.isFinite(q)||q<0)throw Error('Invalid inventory');
  return a;
 }
}
