from pathlib import Path
p=Path('/mnt/data/aa-living-world/src/adventure.mjs');s=p.read_text()
s=s.replace("import {LivingWorld,gameEvent,N,HALF,iAt} from './world.mjs';","import {LivingWorld,gameEvent,N,HALF,iAt} from './world.mjs';\nimport {SurfaceLayer} from './surfaces.mjs';")
s=s.replace("this.worlds={};this.ledger=[];", "this.worlds={};this.surfaces={};this.surfaceSaves={};this.ledger=[];")
s=s.replace("get region(){return REGION_BY_ID[this.activeRegion];}", """get region(){return REGION_BY_ID[this.activeRegion];}
 get surface(){return this.getSurface(this.activeRegion);}
 getSurface(id){this.ensure(id);if(!this.surfaces[id]){
   const surface=new SurfaceLayer({region:REGION_BY_ID[id],world:this.worlds[id],seed:fnv(this.seed,REGION_BY_ID[id].seed,this.epoch),age:this.age,save:this.surfaceSaves[id]||null});
   this.surfaces[id]=surface;delete this.surfaceSaves[id];
  }return this.surfaces[id];
 }
 surfaceAt(x,z){return this.surface.sample(x,z);}
 /** This is only called on a gameplay-accepted step, never from the render loop. */
 stepAt(x,z,opts={}){const env=this.world.evaluate(x,z);if(!env.traversalPassable)return {ok:false,reason:'The route is physically blocked'};
  const step=this.surface.step(x,z,opts);this.characters[0].position={x,z};recordEvent(this,'FOOTFALL_CONFIRMED',{x,z,material:step.surface.material,noise:step.noise});
  return {ok:true,...step};
 }
 repairSurface(x,z,material='clay'){if((this.inventory[material]||0)<1)return {ok:false,reason:'Repair requires one '+material};
  if(!['clay','basalt','timber','copper'].includes(material))return {ok:false,reason:'Not a repair material'};
  const check=this.surface.sample(x,z);if(check.fracture<.02)return {ok:false,reason:'This ground is already intact'};
  const r=this.surface.ground.repair(x,z,{strength:.36,materialResource:material});
  this.inventory[material]--;recordEvent(this,'SURFACE_REPAIRED',{x,z,material,integrity:r.integrity});return {ok:true,...r};
 }
 """)
s=s.replace("this.age+=days;\n  for(const r", "this.age+=days;\n  for(const surface of Object.values(this.surfaces))surface.advanceDays(days);\n  for(const r")
s=s.replace("const ecology=this.habitats(x,z);const economy=this.economies[region.id];", "const ecology=this.habitats(x,z);const economy=this.economies[region.id],surface=this.surface.sample(x,z);")
s=s.replace("market:copy(economy),narrative", "market:copy(economy),surface,narrative")
s=s.replace("const chance=C(g.encounterChance*(1+.14*this.region.heat));", "const ground=this.surface.sample(x,z);const chance=C(g.encounterChance*(1+.14*this.region.heat)*(1+.24*ground.noise-.20*ground.concealment+.12*ground.traffic));")
s=s.replace("const final=fixed(Math.max(.1,attack.damage", "const surfaceBefore=this.surface.sample(x,z);\n  const final=fixed(Math.max(.1,attack.damage")
s=s.replace("(1+elementalBonus*.42)));", "(1+elementalBonus*.42)*(1-.14*surfaceBefore.groundShield)*(element==='aether'?(1+.09*surfaceBefore.resonance):1)));" )
s=s.replace("this.world.dispatch({type:'cast',x,z,element,power});\n  const engagement", "this.world.dispatch({type:'cast',x,z,element,power});\n  const surfaceImpact=this.surface.impact(x,z,element,Math.min(1,power/5));\n  const engagement")
s=s.replace("const defense=C(environment.cover*.35+(gear.cover||0)+((gear[species.element]||0)*.5));", "const defense=C(environment.cover*.35+surfaceBefore.groundShield*.24+(gear.cover||0)+((gear[species.element]||0)*.5));")
s=s.replace("defense:fixed(defense)};", "defense:fixed(defense),ground:surfaceBefore.material,groundEffects:surfaceImpact.effects};")
s=s.replace("if(event){const done=this.world.dispatch(event);if(!done.ok)return done;}", "if(event){const done=this.world.dispatch(event);if(!done.ok)return done;this.applyAcceptedSurfaceEvent({kind:q.action==='cast_earth'?'ELEMENTAL_SKILL_CAST':q.action==='harvest'?'RESOURCE_HARVESTED':q.action==='sound_hydrophone'?'HYDROPHONE_PLAYED':'QUEST_ACTION',...event});}")
s=s.replace("const key2=k(x,z),g=top.g+env.walkCost;", "const key2=k(x,z),g=top.g+env.walkCost+Math.max(0,this.surface.sample(x,z).movementCost-1)*.23;")
s=s.replace("dispatch(event){if(!event||typeof event.kind!=='string')throw Error('Game event kind required');", """applyAcceptedSurfaceEvent(event){const {x,z}=event;if(!Number.isFinite(x)||!Number.isFinite(z))return null;
  if(event.kind==='ELEMENTAL_SKILL_CAST')return this.surface.impact(x,z,event.element,Math.min(1,(event.power||1)/5));
  if(event.kind==='ENVIRONMENT_IGNITED')return this.surface.impact(x,z,'fire',1);
  if(event.kind==='RESOURCE_HARVESTED')return this.surface.harvestConfirmed(x,z);
  if(event.kind==='HYDROPHONE_PLAYED')return this.surface.impact(x,z,'aether',Math.min(1,event.intensity??1));
  return null;
 }
 dispatch(event){if(!event||typeof event.kind!=='string')throw Error('Game event kind required');
  if(event.kind==='FOOTFALL_CONFIRMED')return this.stepAt(event.x,event.z,{actor:event.actor??'player',weight:event.weight??1,speed:event.speed??1,stealth:event.stealth??0});
  if(event.kind==='SURFACE_REPAIR_CONFIRMED')return this.repairSurface(event.x,event.z,event.material??'clay');""")
s=s.replace("if(result.ok&&this.world.events.length>before){recordEvent(this,event.kind,{...event});", "if(result.ok&&this.world.events.length>before){this.applyAcceptedSurfaceEvent(event);recordEvent(this,event.kind,{...event});")
s=s.replace("const history={epoch:this.epoch,age:this.age,completed:[...this.completed],imprint,events:this.ledger.length};", """const surfaceHistory=Object.values(this.surfaces).map(layer=>({region:layer.region.id,vegetation:layer.vegetation.getStats(),traces:layer.ground.events.length}));
  const history={epoch:this.epoch,age:this.age,completed:[...this.completed],imprint,events:this.ledger.length,surfaceHistory};""")
s=s.replace("this.epoch++;this.age=0;this.worlds={};this.activeRegion", "this.epoch++;this.age=0;this.worlds={};this.surfaces={};this.surfaceSaves={};this.activeRegion")
s=s.replace("worlds:Object.fromEntries(Object.entries(this.worlds).map(([id,w])=>[id,w.snapshot()])),ledger", "worlds:Object.fromEntries(Object.entries(this.worlds).map(([id,w])=>[id,w.snapshot()])),surfaceStates:{...copy(this.surfaceSaves),...Object.fromEntries(Object.entries(this.surfaces).map(([id,layer])=>[id,layer.snapshot()]))},ledger")
s=s.replace("for(const [id,raw] of Object.entries(data.worlds||{})){", "a.surfaceSaves=copy(data.surfaceStates||{});for(const id of Object.keys(a.surfaceSaves))if(!REGION_BY_ID[id])throw Error('Unknown saved surface region');\n  for(const [id,raw] of Object.entries(data.worlds||{})){")
p.write_text(s)
