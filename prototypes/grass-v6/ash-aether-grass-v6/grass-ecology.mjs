/** Ash & Aether: Clay and Water — deterministic, gameplay-readable ecology.
 * Pure JS: no renderer, global state, or external dependency. Coordinates are WORLD metres.
 */
export const clamp = (x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth = (x)=>{ x=clamp(x);return x*x*(3-2*x); };
const fract = x=>x-Math.floor(x);
export function hash2(x,z,seed=1){
  // integer-coordinate hashing avoids a repeating 2-D tile or Math.random state.
  let h=Math.imul(x|0,374761393)^Math.imul(z|0,668265263)^Math.imul(seed|0,1442695041);
  h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;
  return (h>>>0)/4294967296;
}
export function valueNoise(x,z,seed=1){
  const xi=Math.floor(x),zi=Math.floor(z),fx=smooth(x-xi),fz=smooth(z-zi);
  const a=hash2(xi,zi,seed),b=hash2(xi+1,zi,seed),c=hash2(xi,zi+1,seed),d=hash2(xi+1,zi+1,seed);
  return (a+(b-a)*fx)*(1-fz)+(c+(d-c)*fx)*fz;
}
export function fractal(x,z,seed=1){
  // Two spatially warped frequencies prevent rectangular or repeating meadow patches.
  const dx=(valueNoise(x*.035,z*.035,seed+19)-.5)*10;
  const dz=(valueNoise(x*.039,z*.039,seed+23)-.5)*10;
  const X=x+dx,Z=z+dz;
  return .50*valueNoise(X*.052,Z*.052,seed+1)+.29*valueNoise(X*.14,Z*.14,seed+3)+.14*valueNoise(X*.34,Z*.34,seed+5)+.07*valueNoise(X*.89,Z*.89,seed+7);
}
export const SPECIES = Object.freeze({
  meadow:{height:.82,width:.084,leaves:5,palette:['#617b31','#819c43','#93a653','#728b31']},
  rye:{height:.94,width:.051,leaves:7,palette:['#456b36','#688e3c','#869b4d','#5c7840']},
  clover:{height:.37,width:.119,leaves:4,palette:['#316641','#478254','#598e51','#67914b']},
  sedge:{height:1.08,width:.043,leaves:8,palette:['#4a7653','#6c9670','#8ba37b','#507f65']},
  reed:{height:1.60,width:.046,leaves:5,palette:['#688852','#82994b','#a8a45b','#63815c']},
  straw:{height:1.12,width:.058,leaves:5,palette:['#ae9a53','#b6aa68','#8d8b48','#c2b67a']},
  frost:{height:.55,width:.065,leaves:5,palette:['#728b7b','#8baa9c','#7e9999','#a2b3ac']},
  aether:{height:1.04,width:.062,leaves:6,palette:['#4c8b88','#69b2a0','#87b5ac','#6c9cb4']},
  bentgrass:{height:.61,width:.024,leaves:9,palette:['#3b6535','#608c41','#7ea153','#4f7d38']},
  bluegrass:{height:.52,width:.066,leaves:8,palette:['#386754','#538679','#73a7a0','#3c776c']},
  fern:{height:.67,width:.135,leaves:7,palette:['#234f39','#397453','#508c63','#66874b']},
  heather:{height:.53,width:.052,leaves:10,palette:['#586c38','#74805a','#8b7192','#82757a']},
  rush:{height:1.24,width:.031,leaves:12,palette:['#4c6e56','#64826a','#81967f','#6d8260']},
  lavender:{height:.72,width:.044,leaves:7,palette:['#5d7450','#78816b','#927e9d','#6b638c']},
  wheat:{height:1.24,width:.071,leaves:7,palette:['#a38c48','#c0a861','#d1bb76','#8b8150']},
  nettle:{height:.73,width:.126,leaves:6,palette:['#33583c','#52734c','#699153','#446d46']}
});
export const BIOMES = Object.freeze({
  meadow:   {density:1.0,wet:.45, shade:.2, species:[['meadow',.42],['rye',.27],['clover',.24],['sedge',.07]]},
  orchard:  {density:.96,wet:.51, shade:.4, species:[['meadow',.34],['rye',.19],['clover',.39],['sedge',.08]]},
  marsh:    {density:1.16,wet:.93, shade:.15,species:[['sedge',.40],['reed',.37],['meadow',.14],['clover',.09]]},
  highlands:{density:.73,wet:.36, shade:.12,species:[['rye',.30],['meadow',.30],['straw',.27],['clover',.13]]},
  savanna:  {density:.68,wet:.13, shade:.06,species:[['straw',.75],['rye',.17],['meadow',.08]]},
  tundra:   {density:.44,wet:.24, shade:.08,species:[['frost',.58],['sedge',.22],['rye',.20]]},
  ashlands: {density:.46,wet:.16, shade:.07,species:[['straw',.59],['aether',.12],['rye',.29]]},
  aether:   {density:.92,wet:.61, shade:.28,species:[['aether',.45],['sedge',.19],['clover',.14],['bluegrass',.14],['heather',.08]]},
  woodland: {density:.84,wet:.64,shade:.67,species:[['fern',.39],['clover',.21],['meadow',.13],['bluegrass',.15],['nettle',.12]]},
  riverbank:{density:1.13,wet:.86,shade:.24,species:[['rush',.28],['sedge',.23],['reed',.19],['bluegrass',.14],['meadow',.16]]},
  moor:     {density:.72,wet:.56,shade:.10,species:[['heather',.39],['bentgrass',.30],['rye',.19],['frost',.12]]},
  alpine:   {density:.52,wet:.37,shade:.08,species:[['frost',.32],['bentgrass',.33],['lavender',.16],['rye',.19]]},
  ruins:    {density:.75,wet:.46,shade:.34,species:[['nettle',.27],['fern',.22],['rye',.18],['clover',.21],['heather',.12]]},
  farmlands:{density:.97,wet:.41,shade:.09,species:[['wheat',.49],['meadow',.15],['rye',.22],['bentgrass',.14]]},
  bog:      {density:.88,wet:.99,shade:.26,species:[['rush',.38],['reed',.22],['sedge',.25],['fern',.15]]}
});
/** Callback convention: terrainHeight(x,z), trailAt(x,z) [0..1], obstacles(x,z),
 * shadeAt(x,z) [0..1], moistureAt(x,z) [0..1], biomeAt(x,z) string.
 * Avoid writing visual-only ecology: every sampled attribute is available to AI.
 */
export function createEcology(options={}){
  const seed=options.seed??316;
  const biomeAt=options.biomeAt??(()=>options.biome??'meadow');
  const trailAt=options.trailAt??(()=>0);
  const shadeAt=options.shadeAt??(()=>0);
  const moistureAt=options.moistureAt??(()=>null);
  const obstacleAt=options.obstacleAt??(()=>false);
  const heightAt=options.terrainHeight??(()=>0);
  const season=options.season??'summer';
  const seasonAt=options.seasonAt??(()=>season);
  const substrateAt=options.substrateAt??(()=>null);
  const biomeMixAt=options.biomeMixAt??(()=>null);
  const growthAt=options.growthAt??(()=>null);
  function sample(x,z){
    const biome=biomeAt(x,z);
    // Biome boundaries can be supplied as host-owned blend weights. The game
    // remains authoritative: when no weights exist, the original biome is used.
    const input=biomeMixAt(x,z),parts=[];
    if(input && typeof input==='object' && !Array.isArray(input)){
      for(const [key,val] of Object.entries(input)){
        if(BIOMES[key] && Number.isFinite(val) && val>0)parts.push([key,Math.min(val,1)]);
      }
    }
    if(!parts.length)parts.push([BIOMES[biome]?biome:'meadow',1]);
    const total=parts.reduce((a,b)=>a+b[1],0);
    const biomeMix=Object.fromEntries(parts.map(([key,w])=>[key,w/total]));
    const profile={density:0,wet:0,shade:0};
    for(const [key,w] of Object.entries(biomeMix))for(const k of ['density','wet','shade'])profile[k]+=BIOMES[key][k]*w;
    const noise=fractal(x,z,seed),fine=valueNoise(x*.72,z*.72,seed+31);
    const path=clamp(trailAt(x,z));
    const shade=clamp(profile.shade+.65*shadeAt(x,z));
    const override=moistureAt(x,z);
    const state=growthAt(x,z);
    const moisture=clamp((override==null? profile.wet+(noise-.5)*.39 : override) + clamp((state?.wet??0))*.35);
    const obstruction=!!obstacleAt(x,z);
    const growth=typeof state==='number'?{vigor:state}:state||{};
    const vigor=clamp(growth.vigor??1);
    const scorch=clamp(growth.scorch??0);
    const flatten=clamp(growth.flatten??0);
    const wet=clamp(growth.wet??0);
    const growthPatch=smooth((noise-.32)*2.7);
    const localSeason=seasonAt(x,z);
    const seasonal=localSeason==='winter'?.24:localSeason==='autumn'?.76:localSeason==='spring'?.93:1;
    const substrate=substrateAt(x,z)||{};
    const suitability=clamp(substrate.vegetationSuitability??1);
    const fuelFactor=clamp(substrate.fuelFactor??1,0,2);
    // Path edges are feathered (trailAt itself should expose smooth values), no sharp grass squares.
    const density=clamp(profile.density*(.27+1.16*growthPatch)*(.86+.28*fine)*(1-path*.97)*(1-shade*.35)*seasonal*vigor*suitability,0,1.5);
    const heightFactor=clamp((.64+.68*noise)*(.76+.32*moisture)*(1-path*.68)*(1-flatten*.48),.06,1.5);
    const cover=clamp(density*heightFactor*(.64+.28*shade),0,1);
    const flammability=clamp((1-moisture)*density*(biome==='ashlands'?1.3:1)*(1-scorch*.8)*fuelFactor,0,1);
    return {x,z,y:heightAt(x,z),biome,biomeMix,season:localSeason,moisture,shade,path,density:obstruction?0:density,
      heightFactor,vigor,scorch,flatten,wet,suitability,blocked:obstruction,cover:obstruction?0:cover,flammability:obstruction?0:flammability,
      flowerProbability:clamp((biome==='orchard'?.30:.11)*growthPatch*(1-path)*(1-shade*.6)),
      forage:biome==='marsh'?'reed-fibre':biome==='aether'?'aether-frond':biome==='ashlands'?'cinder-seed':'meadow-herbs'};
  }
  function chooseSpecies(x,z,eco=sample(x,z),random=hash2(Math.floor(x*3),Math.floor(z*3),seed+46)){
    // Blended ecotones mix the actual botanical distributions, not the renderer's palette.
    const weights=new Map();
    for(const [biome,fraction] of Object.entries(eco.biomeMix||{[eco.biome]:1})){
      for(const [name,w] of (BIOMES[biome]||BIOMES.meadow).species){
        const moistureWeight=name==='reed'||name==='sedge'||name==='rush'? .55+eco.moisture:
          name==='straw'?1.48-eco.moisture:1;
        weights.set(name,(weights.get(name)||0)+fraction*w*moistureWeight);
      }
    }
    let total=0;for(const w of weights.values())total+=w;
    let v=clamp(random,0,1-Number.EPSILON)*total;
    for(const [name,w] of weights){v-=w;if(v<=0)return name;}
    return [...weights.keys()].at(-1);
  }
  function gameplay(x,z){
    const s=sample(x,z);
    return {concealment:s.cover, movementCost:1+s.density*.16+s.moisture*.18-s.path*.18,
      tracksPersistence:clamp((.25+s.moisture*.67)*(1-s.path*.33)),
      fireSpreadPotential:s.flammability, forage:s.forage, traversable:!s.blocked};
  }
  return {sample,chooseSpecies,gameplay,seed};
}
