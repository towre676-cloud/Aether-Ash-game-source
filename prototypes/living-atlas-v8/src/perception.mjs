/** Authoritative host-to-graphics/audio read adapter.
 * Doesn't own maps, mutate inventory, issue awards or invent quest objects.
 * All environmental readings derive from the existing AtlasWorld + Ground Forge state.
 */
import {getGroundMaterial, MATERIALS} from './ground/ground-materials.mjs';
import {vegetationObstacle} from './surfaces.mjs';
import {classifyGroundMaterial,evaluateVegetationMaterialEffects} from './grass-v3/ground-forge-compat.mjs';
import {AcousticWorld,ACOUSTIC_SURFACES,BIOME_IDS,noiseConsequences} from './acoustic/src/acoustic-world.js';
import {AdaptiveScore,scoreSceneForBiome} from './acoustic/src/adaptive-score.js';
const cap=(v)=>Math.max(0,Math.min(1,v));
const recorded=new Set(ACOUSTIC_SURFACES);
const BIOME_TO_AMBIENCE=Object.freeze({temperate:'night_grassland',forest:'moss_cathedral',wetland:'reed_marsh',orchard:'sunlit_ruins',burnt:'ash_grove',clay:'clay_forge',coast:'salt_shore',highland:'ember_highland',volcanic:'final_rift'});
const hardPatterns=new Set(['brick','tile','mosaic','metal','glass','flagstone','herringbone','cobble','enamel','weave']);
export function acousticSurfaceFor(materialId,wetness=0,biome='temperate'){
 const m=getGroundMaterial(materialId),id=m.id,p=m.pattern,w=cap(wetness);
 let surface;
 if(p==='wood')surface=id.includes('dock')?'wood_hollow':'wood_planks';
 else if(p==='weave')surface='wet_moss';
 else if(p==='metal')surface='metal_grating';
 else if(p==='soil')surface=w>.5?'wet_moss':'short_grass';
 else if(p==='mud'||p==='plaster')surface=w>.35?'wet_clay':'dry_clay';
 else if(p==='sand')surface='sand';
 else if(p==='pebbles'||p==='granular')surface='gravel';
 else if(p==='flagstone'||p==='rock')surface=w>.62?'limestone':'polished_stone';
 else if(p==='cobble'||p==='shards')surface='gravel';
 else if(p==='glass'||p==='mosaic'||p==='veined'||p==='tile'||p==='brick'||p==='herringbone'||p==='crystal')surface='polished_stone';
 else surface=biome==='highland'?'gravel':'dry_clay';
 if(id==='water-deep'||(id==='water-mud'&&w>.85))surface='shallow_water';
 if(biome==='burnt'&&id.includes('ash-')&&['granular','plaster'].includes(p))surface='ash';
 if(!recorded.has(surface))throw Error('Invalid audio material '+surface);
 return surface;
}
export function regionAmbience(region){const id=BIOME_TO_AMBIENCE[region.biome]??'night_grassland';if(!BIOME_IDS.includes(id))throw Error('Invalid ambience ID');return id;}
/** One read from the authoritative numerical Atlas; neither GPU quality nor audio mute influences it. */
export function perceiveAt(atlas,x,z,actor={}){
 const s=atlas.surfaceAt(x,z),cell=atlas.world.sample(x,z),m=getGroundMaterial(s.material);
 const blocked=vegetationObstacle(atlas.region,atlas.world,x,z);
 const organic=['soil','mud','sand','granular'].includes(m.pattern)?.76:.14;
 const material=classifyGroundMaterial({id:m.id,tags:[m.pattern,s.realm.toLowerCase()],
    isInterior:false,vegetationAllowed:!blocked&&!hardPatterns.has(m.pattern),
    sealed:hardPatterns.has(m.pattern)&&!['clay-fieldstone'].includes(m.id),
    moisture:s.wetness,waterRetention:m.physics.permeability,porous:m.physics.permeability,
    hardness:1-m.physics.traction,grip:s.traction,organic,heat:m.physics.heat,
    conductivity:s.conduction,resonance:s.resonance,shielding:s.groundShield,wear:s.traffic});
 const cover=blocked?0:cap(cell.biomass*s.vegetation.vigor*(1-s.vegetation.flatten));
 const ecology={cover,moisture:s.wetness,flammability:cap((1-s.wetness)*(.25+cell.biomass*.6)),biome:s.biome};
 const combined=evaluateVegetationMaterialEffects({material},ecology,actor);
 const acousticSurface=acousticSurfaceFor(m.id,s.wetness,atlas.region.biome);
 const hearing=noiseConsequences({surface:acousticSurface,weight:(actor.mass??.5)>.8?'heavy':'soft',
   weather:atlas.world.sky,creatureHearing:actor.nearbyHearing??.5,
   cover:combined.concealment,distance:actor.nearbyDistance??8});
 return Object.freeze({material:m.id,acousticSurface,biome:regionAmbience(atlas.region),
   vegetationAllowed:!blocked && !material.blocked,cover,moisture:s.wetness,
   effects:combined,hearing,groundMaterial:material});
}
/** Only accepted, map-placed events can become Hydrophone listenable sources.
 * No automatically generated treasure, doors, quests or imaginary POIs.
 */
export function authoredSignalSources(atlas){
 const cutoff=atlas.ledger.filter(e=>e.type==='NEW_GAME_PLUS').at(-1)?.id??0;
 return atlas.ledger.filter(e=>e.id>cutoff&&(e.type==='HYDROPHONE_PLAYED'||e.kind==='HYDROPHONE_PLAYED')&&e.region===atlas.activeRegion&&
  Number.isFinite(e.x)&&Number.isFinite(e.z)&&Math.abs(e.x)<=32&&Math.abs(e.z)<=32)
  .map(e=>({id:`hydrophone:${atlas.epoch}:${e.region}:${e.id}`,kind:'hydrophone',
    position:{x:e.x,z:e.z},range:11,threshold:.24,medium:'water'}));
}
export class AtlasAcousticBridge{
 constructor({onCaption=()=>{},onDiscovery=()=>{},onPerception=()=>{}}={}){
  this.engine=new AcousticWorld({manifestUrl:'./src/acoustic/manifest.json',assetBase:'../',
    onCaption,onDiscovery,onPerception,maxCache:24});this.enabled=false;this.score=new AdaptiveScore(this.engine);this.scoreActive=false;
 }
 async start(atlas){await this.engine.unlock();this.enabled=true;this.engine.setMuted(false);
  this.engine.restore(atlas.acousticState??{});this.engine.setMuted(false);
  await this.ambience(atlas);}
 async ambience(atlas){if(this.enabled)await this.engine.ambience(regionAmbience(atlas.region),atlas.world.sky);if(this.enabled&&this.scoreActive){await this.score.setScene(scoreSceneForBiome(regionAmbience(atlas.region)));this.updateScore(atlas);}}
 updateScore(atlas){if(this.scoreActive){const s=atlas.summary();this.score.setState({danger:s.activeEncounter?.hp>0?.85:0,travel:0,story:Math.min(1,s.quests/10),discovery:Math.min(1,(atlas.acousticSurveyV2?.survey?.discovered?.length??0)/3)});}}
 async toggleScore(atlas){if(!this.enabled)return {ok:false,reason:'Enable world audio first'};if(this.scoreActive){this.score.stop();this.scoreActive=false;return {ok:true,enabled:false};}this.scoreActive=true;try{await this.score.setScene(scoreSceneForBiome(regionAmbience(atlas.region)));this.updateScore(atlas);}catch(e){this.score.stop();this.scoreActive=false;throw e;}return {ok:true,enabled:true};}
 acceptedStep(atlas,x,z,actor={}){const p=perceiveAt(atlas,x,z,actor);if(this.enabled)
  this.engine.footstep({surface:p.acousticSurface,velocity:actor.speed??1,sneaking:!!actor.sneaking,
   position:{x,z},cover:p.cover,enemyHearing:actor.nearbyHearing??.5,
   enemyDistance:actor.nearbyDistance??8}).catch(()=>{});
  return p.hearing;}
 acceptedEvent(atlas,event){this.updateScore(atlas);if(!this.enabled)return;
  const position=Number.isFinite(event.x)&&Number.isFinite(event.z)?{x:event.x,z:event.z}:null;
  if(event.type==='hydrophone')this.engine.memory('hydrophone').catch(()=>{});
  else if(event.type==='cast'||event.type==='ignite')this.engine.combat({kind:'elemental',element:event.element??'fire',position}).catch(()=>{});
  else if(event.type==='bridge')this.engine.interaction('bridge_repair',position).catch(()=>{});
 }
 acceptedBattle(atlas,element,x,z){this.updateScore(atlas);if(this.enabled)this.engine.combat({kind:'elemental',element,position:{x,z}}).catch(()=>{});}
 listen(atlas,{x,z,focus=.5}={}){
  const sources=authoredSignalSources(atlas);
  const res=this.engine.listen({player:{x,z},sources,focus});
  atlas.acousticState=this.engine.serialize();
  return res;
 }
 mute(){this.score.stop();this.scoreActive=false;this.enabled=false;this.engine.setMuted(true);}
 snapshot(){return this.engine.serialize();}
 restore(atlas){this.engine.restore(atlas.acousticState??{});}
 dispose(){this.score.stop();this.engine.dispose();}
}
export const PROVENANCE={materialCatalog:MATERIALS.length,acousticSurfaces:ACOUSTIC_SURFACES.length,recordedClueKinds:12,hostOwnsRewards:true};
