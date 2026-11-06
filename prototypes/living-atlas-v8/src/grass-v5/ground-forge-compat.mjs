/**
 * Ash & Aether living vegetation <-> Ground Forge compatibility seam.
 * This file deliberately does NOT import the separately authored Ground Forge
 * prototype or assume that its 48 ground materials have particular IDs.
 * The authoritative terrain sampler is injected by the host.
 * All callbacks use WORLD metres (x,z), +Y up. Values are dimensionless 0..1.
 */
import {clamp} from './grass-ecology.mjs';
const finite=(v,otherwise)=>Number.isFinite(v)?v:otherwise;
const unit=(v,d)=>clamp(finite(v,d));
const shallowTags=v=>Array.isArray(v)?new Set(v.map(x=>String(x).toLowerCase())):new Set();
const any=(tags, names)=>names.some(name=>tags.has(name));
const asSample=v=>v&&typeof v==='object'?v:{};

/** Material facts explicitly given by Ground Forge/host; no name-guessing.
 * Accepts aliases only for descriptive field names, not invented material ids.
 * E.g. materialAt(x,z) => {tags:['soil'], organic:0.7, porous:0.8,
 * waterRetention:0.6, hardness:0.2, heat:0.1, moisture:0.5, grip:0.8}.
 */
export function classifyGroundMaterial(input={}){
  const m=asSample(input),tags=shallowTags(m.tags);
  const interior=!!(m.isInterior??m.interior)||any(tags,['interior','indoor','inside']);
  const deepWater=!!m.deepWater || finite(m.waterDepth,0)>.42;
  const sealed=!!m.sealed||any(tags,['sealed','pavement','road','floor','metal','tile','glass','concrete']);
  const explicitBlock=m.vegetationAllowed===false || m.foliageAllowed===false;
  const organic=unit(m.organic??m.organicContent,.46), porous=unit(m.porous??m.permeability,.50);
  const hardness=unit(m.hardness,.35),salinity=unit(m.salinity,0),heat=unit(m.heat??m.temperatureStress,0);
  const wear=unit(m.wear??m.compaction,0),flood=unit(m.flood??m.flooding,0);
  const waterRetention=unit(m.waterRetention??m.retention,porous*.7+.15);
  const moisture=unit(m.moisture??m.wetness,waterRetention*.7+flood*.25);
  const bare=interior||deepWater||explicitBlock||sealed;
  const explicit=m.vegetationSuitability;
  const base=clamp(.22+.52*organic+.29*porous-.26*hardness-.28*salinity-.35*heat-.32*wear,0,1);
  const vegetationSuitability=bare?0:unit(explicit,base)*(1-.55*flood);
  const trail=clamp(Math.max(unit(m.trail??m.pathWear,0),wear*.64, sealed?1:0));
  const fuelFactor=clamp((.65+.54*organic)*(1-.38*moisture)*(1-.23*flood),.1,1.7);
  return Object.freeze({materialId:m.id??null,tags:[...tags],blocked:bare,moisture,waterRetention,
    organic,porous,hardness,salinity,heat,wear,flood,vegetationSuitability,trail,
    fuelFactor,grip:unit(m.grip,.65),conductivity:unit(m.conductivity??m.electrical,.08),
    resonance:unit(m.resonance,.10),shielding:unit(m.shielding,.08)});
}

/** Normalize Ground Forge material samples to foliage's existing APIs.
 * Optional map samplers can be in the other sessions' own modules, but their
 * values must be adapted by the host, never sampled twice from independent RNGs.
 */
export function createGroundForgeVegetationBridge({
  materialAt=()=>({}),regionAt=()=>({}),heightAt=()=>0,
  pathAt=()=>0,obstacleAt=()=>false,shadeAt=()=>0,
  seasonAt=()=> 'summer',weatherAt=()=>({})
}={}){
  const requireFinite=(x,z)=>{if(!Number.isFinite(x)||!Number.isFinite(z))throw Error('invalid world coordinates');};
  let cache=null;
  const invalidate=()=>{cache=null;};
  const sample=(x,z)=>{
    requireFinite(x,z);
    if(cache && cache.x===x && cache.z===z)return cache.value;
    const material=classifyGroundMaterial(materialAt(x,z));
    const region=asSample(regionAt(x,z));
    const weather=asSample(weatherAt(x,z));
    const rain=unit(weather.rain??weather.precipitation,0);
    const water=clamp(material.moisture+rain*.22);
    const path=clamp(Math.max(material.trail,unit(pathAt(x,z),0)));
    const blocked=material.blocked||!!obstacleAt(x,z)||region.outdoor===false;
    const biome=region.biome??region.habitat??'meadow';
    const altitude=finite(heightAt(x,z),0);
    const value={x,z,material,biome,biomeMix:region.biomeMix??null,path,blocked,moisture:water,shade:unit(shadeAt(x,z),0),
      height:altitude,season:seasonAt(x,z),rain,wind:unit(weather.wind,.25)};
    cache={x,z,value};return value;
  };
  // The host remains the owner of material/biome/physics; vegetation receives
  // normalized descriptive facts only. No Ground Forge names are required.
  const ecologyOptions={
    terrainHeight:(x,z)=>sample(x,z).height,
    biomeAt:(x,z)=>sample(x,z).biome,
    biomeMixAt:(x,z)=>sample(x,z).biomeMix,
    trailAt:(x,z)=>sample(x,z).path,
    obstacleAt:(x,z)=>sample(x,z).blocked,
    moistureAt:(x,z)=>sample(x,z).moisture,
    shadeAt:(x,z)=>sample(x,z).shade,
    seasonAt:(x,z)=>sample(x,z).season,
    substrateAt:(x,z)=>{
      const {material}=sample(x,z);
      return {vegetationSuitability:material.vegetationSuitability,fuelFactor:material.fuelFactor};
    }
  };
  return {sample,invalidate,ecologyOptions};
}

/** Material and vegetation produce non-linear, bounded physical modifiers.
 * The authoritative host must decide whether/how to apply them to its own rules.
 * Renderer quality does not enter this function; changing settings cannot farm
 * resources or change enemy detection.
 */
export function evaluateVegetationMaterialEffects(ground, ecology, actor={}){
  const m=ground.material??ground,e=ecology;
  const wet=unit(e.moisture??m.moisture,0);
  const cover=unit(e.cover,0);
  const speed=unit(actor.speed,.5);
  const mass=unit(actor.mass,.5);
  const impact=clamp((1-m.grip)*(0.3+wet*.7)+m.wear*.12,0,1);
  const acoustic=clamp((.12+speed*speed*.64)*(1-cover*.46)+m.hardness*.22+wet*.08,0,1.3);
  const traction=clamp(m.grip*(1-wet*.38)*(1-m.wear*.19),.03,1);
  const concealed=clamp(cover*(1-.45*speed*speed)*(1-.16*mass),0,1);
  const electrical=clamp(m.conductivity*(.28+wet*.87)*(1+.31*cover),0,1.5);
  const thermal=clamp(e.flammability*(1-.6*wet)+m.heat*.19,0,1);
  const resonance=clamp(m.resonance*(1+.38*cover*cover),0,1.5);
  const shielding=clamp(1-(1-unit(m.shielding,0))*(1-cover*.34),0,1);
  return {concealment:concealed,footstepNoise:acoustic,slipRisk:impact,traction,
    electricalTransfer:electrical,fireTransfer:thermal,resonanceTransfer:resonance,
    environmentalShielding:shielding,trackVisibility:clamp(m.wear*.42+wet*.48+mass*.1)};
}
