/** Combined Ash & Aether surface authority. Nothing here awards items, rewrites quests,
 * or modifies the live site's save. Host AtlasWorld accepts events first.
 * Source packages: Living Grass v2 and Ground Forge v1, preserved in src/{grass,ground}.
 */
import {createVegetationState} from './grass/grass-state.mjs';
import {createGroundDynamics} from './ground/ground-dynamics.mjs';
import {analyzeGround, getGroundMaterial} from './ground/ground-materials.mjs';
import {riverX} from './world.mjs';
const C=v=>Math.max(0,Math.min(1,v));
const safe=(x,z)=>Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<=32&&Math.abs(z)<=32;
const coords=(x,z)=>[Math.max(-31.999,Math.min(31.999,x)),Math.max(-31.999,Math.min(31.999,z))];
function lineDistance(x,z,x1,z1,x2,z2){const t=C(((x-x1)*(x2-x1)+(z-z1)*(z2-z1))/((x2-x1)**2+(z2-z1)**2));return Math.hypot(x-(x1+(x2-x1)*t),z-(z1+(z2-z1)*t));}
const realm={temperate:'clay-loam',forest:'clay-loam',wetland:'water-mud',orchard:'clay-red',burnt:'ash-clinker',clay:'clay-red',coast:'water-sand',highland:'aether-shale',volcanic:'ash-basalt'};
const roads={temperate:'clay-road',forest:'clay-gravel',wetland:'water-canal',orchard:'clay-road',burnt:'ash-soot-cobble',clay:'clay-herringbone',coast:'water-pebbles',highland:'aether-marble',volcanic:'ash-basalt'};
const plazas={chapel:'clay-fieldstone',forest:'clay-earth',stilt:'water-dock',orchard:'clay-terracotta',forge:'ash-grate',kiln:'ash-kiln',lighthouse:'water-limestone',engine:'aether-brass',citadel:'ash-fire-mosaic'};
const crop={orchard:'farmlands',forest:'woodland',temperate:'meadow',wetland:'bog',burnt:'ashlands',clay:'meadow',coast:'riverbank',highland:'alpine',volcanic:'ashlands'};
export function materialAt(region,world,x,z){
 if(!safe(x,z))throw new RangeError('Surface coordinate must be inside the region');
 const s=world.sample(x,z),path=Math.min(lineDistance(x,z,-16,-10,riverX(5),5),lineDistance(x,z,17,14,riverX(5),5),lineDistance(x,z,-23,18,-16,-10));
 const settlement=(Math.hypot(x-17,z-14)<4.2||Math.hypot(x+16,z+10)<5||Math.hypot(x+23,z-18)<3.5);
 if(settlement)return plazas[region.architecture]||'clay-fieldstone';
 if(path<.98)return roads[region.biome]||'clay-road';
 if(Math.abs(x-riverX(z))<2.6){if(region.biome==='volcanic')return 'ash-obsidian';return s.water>.15?'water-silt':'water-pebbles';}
 if(region.biome==='wetland')return s.moisture>.6?'water-mud':'water-silt';
 if(region.biome==='coast')return s.water>.12?'water-salt':s.stone>.55?'water-slate':'water-sand';
 if(region.biome==='burnt')return s.ash>.24?'ash-charwood':'ash-clinker';
 if(region.biome==='volcanic')return s.ash>.29?'ash-obsidian':'ash-basalt';
 if(region.biome==='highland')return s.aether>.58?'aether-shale':'aether-cloudstone';
 if(region.biome==='forest')return s.biomass>.56?'clay-loam':'clay-fieldstone';
 if(region.biome==='clay')return s.moisture>.55?'clay-red':'clay-earth';
 return realm[region.biome]||'clay-earth';
}
export function biomeAt(region,world,x,z){
 if(!safe(x,z)||vegetationObstacle(region,world,x,z))return 'ruins';
 const s=world.sample(x,z),mat=materialAt(region,world,x,z);
 if(Math.abs(x-riverX(z))<4.1){return s.moisture>.55?'riverbank':'meadow';}
 if(['clay-road','clay-gravel','water-canal','ash-soot-cobble','aether-marble','clay-herringbone','ash-basalt'].includes(mat)&&mat!==realm[region.biome])return 'ruins';
 if(region.biome==='forest')return 'woodland';
 if(region.biome==='wetland')return 'marsh';
 return crop[region.biome]||'meadow';
}
export function vegetationObstacle(region,world,x,z){
 if(!safe(x,z))return true;
 const path=Math.min(lineDistance(x,z,-16,-10,riverX(5),5),lineDistance(x,z,17,14,riverX(5),5),lineDistance(x,z,-23,18,-16,-10));
 if(path<.65||Math.abs(x-riverX(z))<1.5)return true;
 // Match geometry footprints of important structures, not arbitrary rectangular absence.
 if(Math.hypot(x-17,z-14)<3.5||Math.hypot(x+16,z+10)<2.7||Math.hypot(x+23,z-18)<2.1)return true;
 return world.sample(x,z).water>.6;
}
export function roomMaterial(tags){for(const name of tags){const m={home:'clay-floorboards',inn:'clay-rug',forge:'ash-grate',kiln:'ash-kiln',chapel:'aether-celestial',temple:'water-deep',archive:'aether-marble',workshop:'clay-herringbone',cistern:'water-seep',dock:'water-dock',furnace:'ash-fire-mosaic',ruin:'clay-fieldstone',reactor:'aether-enamel'}[name];if(m)return getGroundMaterial(m);}return getGroundMaterial('clay-earth');}
export class SurfaceLayer{
 constructor({region,world,seed=1,age=0,save=null,imprint=null}={}){
  if(!region||!world)throw Error('Surface needs an existing region and LivingWorld');
  this.region=region;this.world=world;this.seed=seed|0;
  this.vegetation=createVegetationState({seed:this.seed,initialDay:age});
  this.ground=createGroundDynamics({columns:32,rows:32,cellSize:2,originX:-32,originZ:-32,seed:this.seed,
   materialAt:(x,z)=>materialAt(this.region,this.world,x,z)});
  if(save)this.restore(save);
  else if(imprint){
    // History is concentrated at a named memorial, not randomly sprinkled over new tiles.
    const phase=C(imprint.phase||0),wear=C(imprint.wear||0),scars=C(imprint.scars||0);
    if(phase>.001)this.ground.impact(-24,-22,{element:'aether',strength:phase});
    if(wear>.001)this.ground.step(-24,-22,{actor:'previous-epoch',weight:Math.min(2,wear*1.7),speed:1});
    if(scars>.001)this.vegetation.ignite(-24,-22,{radius:2,strength:scars,moistureAt:()=>.2});
  }
 }
 sample(x,z){if(!safe(x,z))throw new RangeError('Out of bounds surface sample');const [cx,cz]=coords(x,z),s=this.world.sample(x,z),d=this.ground.surface(cx,cz),veg=this.vegetation.sample(x,z);
  const wet=C(s.moisture*.63+s.water*.44+d.wetness*.4),p=analyzeGround(d.id,{wetness:wet,energy:d.phase,wear:d.traffic});
  const canopy=C(s.biomass*veg.vigor*(1-s.fire)),cover=C(canopy*.42+p.groundShield*.47-d.fracture*.18);
  return {material:p.id,materialName:p.label,realm:p.realm,biome:biomeAt(this.region,this.world,x,z),wetness:wet,temperature:d.temperature,charge:d.charge,phase:d.phase,fracture:d.fracture,traffic:d.traffic,
   noise:p.noise,traction:C(p.traction-d.fracture*.15),movementCost:+(p.movementCost+d.fracture*.35+canopy*.14).toFixed(4),groundShield:+cover.toFixed(4),tracePersistence:p.tracePersistence,conduction:C(p.conduction+d.charge*.23),resonance:p.resonance,heat:p.heat,
   vegetation:veg,concealment:+C(canopy*.60).toFixed(4),forage:C(s.biomass*s.fertility*veg.vigor),clue:p.reward,note:p.note};
 }
 step(x,z,options={}){if(!safe(x,z))throw Error('Step outside world');const ground=this.ground.step(...coords(x,z),options);const n=vegetationObstacle(this.region,this.world,x,z)?0:this.vegetation.trample(x,z,{radius:options.radius??.72,mass:options.weight??1});const surface=this.sample(x,z);return {ground,changedPlants:n,noise:C(ground.noise*.72+surface.noise*.28),surface};}
 /** Call only after the authoritative cast or skill has successfully resolved. */
 impact(x,z,element='kinetic',strength=.6){if(!safe(x,z))throw Error('Impact outside world');const hit=this.ground.impact(...coords(x,z),{element:element==='earth'?'kinetic':element,strength:C(strength)});
  if(element==='fire')this.vegetation.ignite(x,z,{strength,radius:1.2,moistureAt:(a,b)=>this.world.sample(a,b).moisture});
  if(element==='water')this.vegetation.water(x,z,{amount:strength,radius:1.3});
  return {...hit,surface:this.sample(x,z)};
 }
 harvestConfirmed(x,z,{radius=1.2}={}){if(!safe(x,z))throw Error('Harvest outside world');const q=this.vegetation.harvest(x,z,{radius,biome:biomeAt(this.region,this.world,x,z)});return {...q,surface:this.sample(x,z)};}
 advanceDays(days){this.vegetation.advanceDays(days);this.ground.tick(days,{rain:this.world.sky==='rain'?.7:.12,ambientHeat:this.region.heat,wind:.25});}
 snapshot(){return {version:1,region:this.region.id,seed:this.seed,vegetation:this.vegetation.serialize(),ground:this.ground.save()};}
 restore(save){if(save?.version!==1||save.region!==this.region.id||save.seed!==this.seed)throw Error('Incompatible surface layer save');this.vegetation.restore(save.vegetation);this.ground.load(save.ground);}
}
