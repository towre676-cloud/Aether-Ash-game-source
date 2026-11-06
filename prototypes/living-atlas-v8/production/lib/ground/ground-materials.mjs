/** Ash & Aether: Clay and Water — floor / substrate material library.
 * MIT-style permission for integration into the user's own game; no third-party art.
 * World metres and material IDs are stable. Mechanical values are canonical 0..1.
 */
const D = (id, label, realm, pattern, colors, rough, physics, note, reward) => Object.freeze({
  id, label, realm, pattern, colors:colors.map(c=>c.replace('#','')),
  roughness:rough, physics:Object.freeze(physics), note, reward,
});
// traction, noise, conductivity, permeability, heat, resonance, shelter
const P=(traction,noise,conductivity,permeability,heat,resonance,shelter)=>({traction,noise,conductivity,permeability,heat,resonance,shelter});
export const MATERIALS = Object.freeze([
 D('ash-cinder','Cinder Drift','Ash','granular',['#342d2b','#57423b','#9e6c50'],.95,P(.56,.22,.22,.8,.77,.14,.22),'Cinders retain the last footfall and airborne soot.','trace:ash'),
 D('ash-slag','Pitted Furnace Slag','Ash','rock',['#242b2f','#4a4841','#8d684c'],.83,P(.64,.68,.75,.14,.89,.22,.32),'Glassy pockets concentrate furnace charge.','salvage:slag'),
 D('ash-kiln','Glazed Kiln Brick','Ash','brick',['#6e3028','#aa5837','#e1a475'],.76,P(.82,.72,.64,.25,.74,.15,.35),'Hot bricks betray occupied furnace routes.','clue:heat-route'),
 D('ash-basalt','Riven Basalt','Ash','flagstone',['#22282c','#44505a','#7d8178'],.90,P(.79,.63,.31,.16,.38,.30,.57),'Faults can split under concentrated impact.','break:basalt'),
 D('ash-soot-cobble','Sootwashed Cobbles','Ash','cobble',['#333330','#62544b','#a3907b'],.87,P(.75,.72,.28,.39,.41,.16,.20),'Old wheel ruts lead toward buried machinery.','clue:wheel-ruts'),
 D('ash-grate','Iron Furnace Grate','Ash','metal',['#242727','#525e58','#be8256'],.57,P(.75,.92,.96,.03,.93,.22,.16),'Electricity and heat travel along connected grates.','network:iron'),
 D('ash-emberglass','Ember Glass','Ash','glass',['#241b26','#70352d','#db8150'],.32,P(.44,.88,.51,.03,.96,.83,.08),'Hidden radiant heat appears through fissures.','resonance:ember'),
 D('ash-obsidian','Splintered Obsidian','Ash','shards',['#1a2029','#39404d','#8395a1'],.28,P(.50,.77,.13,.05,.47,.81,.14),'Sharp fragments shear light and redirect attacks.','salvage:shard'),
 D('ash-plaster','Soot-Rubbed Plaster','Ash','plaster',['#6d6050','#9a866f','#cebaa0'],.96,P(.83,.32,.08,.52,.31,.06,.15),'Handprints emerge when heated or soaked.','trace:handprint'),
 D('ash-charwood','Charred Engine Timber','Ash','wood',['#242426','#493b35','#92705b'],.91,P(.72,.66,.06,.45,.86,.18,.26),'Burn lines indicate the fire’s direction.','clue:burn-line'),
 D('ash-clinker','Cooling Clinker Field','Ash','granular',['#2d3436','#596269','#b16d47'],.93,P(.62,.40,.36,.66,.62,.11,.22),'Cooling clinker releases mineral scrap.','salvage:clinker'),
 D('ash-fire-mosaic','Choir Furnace Mosaic','Ash','mosaic',['#3d2327','#b2523b','#dbc099'],.72,P(.83,.62,.56,.11,.73,.91,.27),'Heat reveals an obsolete Choir cadence.','memory:choir'),
 D('water-silt','River-Bed Silt','Water','mud',['#3e514b','#64766a','#a3ab91'],.99,P(.40,.12,.28,.97,.09,.31,.15),'Tracks can be read until the river rises.','trace:footprint'),
 D('water-sand','Tidal Gold Sand','Water','sand',['#8b8568','#c4b38b','#efdab5'],.96,P(.68,.19,.11,.92,.16,.15,.08),'Waterline reveals what the current deposits.','salvage:shell'),
 D('water-pebbles','Washed River Pebbles','Water','pebbles',['#3d5453','#6f9186','#bdc4aa'],.89,P(.65,.79,.38,.83,.15,.18,.28),'Rolling stones are noisy but reveal safe channels.','clue:current'),
 D('water-limestone','Wet Cut Limestone','Water','flagstone',['#596f70','#93aaa5','#e0dfc4'],.46,P(.48,.60,.34,.22,.08,.22,.42),'Seepage makes edges treacherous.','clue:seepage'),
 D('water-slate','Blue Channel Slate','Water','shards',['#253c49','#53758a','#a1abb4'],.64,P(.67,.68,.47,.12,.07,.49,.31),'Wet slate carries a distinct high resonance.','resonance:slate'),
 D('water-dock','Salt-Silvered Dockwood','Water','wood',['#434c4a','#748780','#c8b79d'],.84,P(.75,.82,.08,.66,.12,.20,.22),'Boards creak over concealed cisterns.','clue:hollow'),
 D('water-coral','Fossil Coralstone','Water','rock',['#75817d','#b6b7a5','#edcabb'],.95,P(.74,.61,.41,.36,.13,.81,.52),'Embedded fossils store echoes of floods.','memory:fossil'),
 D('water-salt','Crystalline Salt Flats','Water','crystal',['#8dada5','#c7d6cd','#f5e9d4'],.43,P(.43,.67,.26,.08,.10,.72,.08),'Reflective crust marks the evaporation front.','salvage:salt'),
 D('water-canal','Sunk Canal Brick','Water','brick',['#4a5b60','#7d9891','#b6b2a1'],.72,P(.68,.69,.40,.40,.17,.21,.35),'Missing bricks form access to undercity channels.','route:canal'),
 D('water-seep','Glazed Seep Tiles','Water','tile',['#3e5b64','#80a9a8','#d6d9cb'],.34,P(.38,.68,.61,.08,.08,.77,.22),'Footsteps change pitch with water behind the wall.','clue:cistern'),
 D('water-mud','Reed-Mud Estuary','Water','mud',['#344841','#657963','#a3a57b'],.99,P(.32,.10,.25,.98,.05,.27,.35),'Footprints persist in mud and guide predators.','trace:deep-print'),
 D('water-deep','Submerged Temple Floor','Water','mosaic',['#233e55','#457e88','#a5d2ca'],.22,P(.20,.16,.84,.01,.04,.95,.08),'Submerged inscriptions conduct aether pulses.','memory:temple'),
 D('clay-red','Red Orchard Clay','Clay','mud',['#704332','#a56949','#e0b181'],.98,P(.58,.24,.14,.91,.27,.32,.18),'Clay records pressure and can be reformed.','craft:clay'),
 D('clay-earth','Rammed Earthen Floor','Clay','plaster',['#6a5b42','#a18c65','#d4b995'],.97,P(.85,.29,.06,.42,.31,.09,.32),'Layering records each rebuilding of the home.','memory:foundation'),
 D('clay-loam','Old Orchard Loam','Clay','soil',['#3d4936','#6b7850','#b0a275'],.98,P(.73,.18,.17,.82,.18,.18,.30),'Root patterns trace buried wells.','clue:roots'),
 D('clay-road','Worn Pilgrim Road','Clay','cobble',['#65675a','#a29e83','#e1cdb0'],.91,P(.80,.71,.17,.42,.21,.19,.25),'Repeated crossings deepen meaningful routes.','route:old-road'),
 D('clay-fieldstone','Lichen Fieldstone','Clay','flagstone',['#505d51','#8d9880','#c8c3a4'],.94,P(.84,.68,.29,.44,.20,.33,.43),'Green lichen marks cool, intact masonry.','clue:lichen'),
 D('clay-gravel','Crushed Granite Path','Clay','granular',['#5c615a','#8e948b','#dbcdaf'],.94,P(.79,.86,.19,.77,.18,.12,.24),'Gravel broadcasts movement to nearby beasts.','trace:noise'),
 D('clay-terracotta','Handcut Terracotta','Clay','tile',['#823e32','#c47753','#f2ba91'],.77,P(.82,.62,.18,.16,.28,.24,.32),'Fired tiles link households and kiln guilds.','craft:ceramic'),
 D('clay-herringbone','Old Herringbone Brick','Clay','herringbone',['#66483e','#aa7a62','#d9b293'],.81,P(.86,.71,.25,.37,.29,.23,.43),'Repair patches show how the street expanded.','clue:repair'),
 D('clay-floorboards','Hearth Oak Floorboards','Clay','wood',['#503a2e','#9d7453','#d7b58a'],.87,P(.87,.62,.05,.28,.39,.21,.39),'Footfall knocks distinguish loose floorboards.','clue:loose-board'),
 D('clay-thresh','Threshing Court Stone','Clay','flagstone',['#55584c','#9f9b80','#dbceb0'],.91,P(.86,.71,.27,.23,.26,.15,.46),'Softer wear reveals the circle of old work.','memory:harvest'),
 D('clay-rug','Woven Clayhouse Rug','Clay','weave',['#5e5149','#af876b','#e2c4a1'],.99,P(.94,.11,.03,.74,.19,.28,.18),'Rugs quiet movement and carry household patterns.','memory:heirloom'),
 D('clay-mosaic','Seven Lives Inlay','Clay','mosaic',['#665746','#c5a475','#e2d6b8'],.78,P(.85,.61,.20,.12,.25,.93,.47),'Seven spokes become legible after the party gathers.','memory:seven-lives'),
 D('aether-shale','Luminous Split Shale','Aether','shards',['#283d48','#567c8c','#acc9bc'],.71,P(.72,.66,.66,.14,.13,.87,.28),'Bright fractures show aether stress.','resonance:shale'),
 D('aether-marble','Sky-Etched Marble','Aether','veined',['#70878a','#c3c4b1','#f1e8d1'],.41,P(.68,.62,.33,.05,.19,.82,.38),'Veins carry a spatial record across chambers.','memory:vein'),
 D('aether-enamel','Pale Engine Enamel','Aether','tile',['#46767e','#94b5af','#ebebe0'],.29,P(.63,.70,.84,.02,.32,.72,.22),'Plates transfer charge between engine nodes.','network:enamel'),
 D('aether-brass','Patinated Brass Inlay','Aether','metal',['#354c46','#a18b57','#eed7a4'],.35,P(.71,.86,.96,.02,.69,.96,.23),'An unbroken circuit conducts phase changes.','network:brass'),
 D('aether-glass','Suspended Aether Glass','Aether','glass',['#1f4c57','#579caa','#c7e3cf'],.18,P(.39,.88,.90,.00,.26,.99,.08),'Translucent paths appear only at matching phase.','route:phase'),
 D('aether-celestial','Celestial Rota Mosaic','Aether','mosaic',['#354756','#91a1a9','#e5d6a5'],.40,P(.76,.65,.44,.07,.30,.99,.46),'A rota diagram reveals phase and orbit order.','memory:rota'),
 D('aether-copper','Oxidized Sky Copper','Aether','metal',['#2c575c','#a17b5b','#efbd8b'],.49,P(.71,.84,.95,.08,.43,.78,.41),'Oxide traces show where energy last flowed.','trace:charge'),
 D('aether-dust','Prismatic Crystal Dust','Aether','crystal',['#607383','#a6b5b3','#efe6c8'],.62,P(.51,.51,.57,.49,.11,.95,.11),'Crystals scatter resonance, altering defenses.','salvage:crystal'),
 D('aether-cloudstone','Drifting Cloudstone','Aether','rock',['#647988','#9eb4b2','#e5e3cf'],.84,P(.68,.36,.36,.35,.10,.92,.59),'Porous blocks shelter travelers from arc attacks.','cover:cloudstone'),
 D('aether-silverash','Starfall Silver Ash','Aether','granular',['#586770','#abb5ad','#f0e7d8'],.72,P(.59,.37,.45,.60,.12,.90,.14),'Fine particles reveal pressure and air currents.','trace:wind'),
 D('aether-chalk','Ancient Star Chalk','Aether','plaster',['#8a998d','#bfcebd','#f0e7d2'],.91,P(.79,.42,.09,.69,.09,.83,.28),'Faded diagrams can be uncovered by light.','memory:chalk'),
 D('aether-phase','Phase-Fault Basalt','Aether','rock',['#273545','#586b84','#b9aeaa'],.66,P(.74,.63,.32,.17,.21,1,.38),'Striking a seam shifts the phase of nearby cover.','resonance:phase')
]);
export const MATERIAL_BY_ID = Object.freeze(Object.fromEntries(MATERIALS.map(m=>[m.id,m])));
export const MATERIAL_REALMS = Object.freeze(['Ash','Water','Clay','Aether']);
export function getGroundMaterial(id){const value=MATERIAL_BY_ID[id];if(!value) throw new RangeError(`Unknown ground material: ${id}`);return value;}
export function analyzeGround(id,environment={}){
  const m=getGroundMaterial(id),p=m.physics;
  const wet=Math.max(0,Math.min(1,Number(environment.wetness??0)));
  const frozen=Math.max(0,Math.min(1,Number(environment.frost??0)));
  const energy=Math.max(0,Math.min(1,Number(environment.energy??0)));
  const wear=Math.max(0,Math.min(1,Number(environment.wear??0)));
  const traction=Math.max(.08,Math.min(1,p.traction-.36*wet*(1-p.permeability)-.30*frozen+.07*wear));
  const noise=Math.max(0,Math.min(1,p.noise*(1-.40*wet)+.15*frozen+.1*wear));
  const conduction=Math.max(0,Math.min(1,p.conductivity*(1+.40*wet)+.13*energy));
  const movementCost=1+1.2*(1-traction)+.25*wet*p.permeability;
  const groundShield=Math.max(0,Math.min(1,p.shelter+.17*wet*p.permeability-.12*energy*p.resonance));
  const tracePersistence=Math.max(0,Math.min(1,p.permeability*.7+(1-p.noise)*.16+wet*.24-wear*.17));
  return {id:m.id,label:m.label,realm:m.realm,traction,noise,conduction,movementCost,groundShield,tracePersistence,resonance:p.resonance,heat:p.heat,reward:m.reward,note:m.note};
}
