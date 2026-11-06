import {environmentFor} from './environment.js?v=5.18.0';
import {isInteriorScene} from './scene-identity.js';

/** Original environment collection. Source rectangles are measured from the
 * delivered transparent PNGs. This module only selects and draws pictures:
 * it never changes floor cells, object positions, interactions, or save state. */
export const ENVIRONMENT_COLLECTIONS=Object.freeze([
 {id:'woodland',title:'Woodland undergrowth',asset:'environmentWoodland',file:'woodland-v17.webp',role:'scenery',description:'Roots, fungi, flowers and shrubs with distinct natural silhouettes.',scenes:[{id:50001,name:'Sable’s reed road'},{id:19,name:'The forest'},{id:2045,name:'Spore frontier'}]},
 {id:'waterside',title:'Banks and waterfronts',asset:'environmentWaterside',file:'waterside-v17.webp',role:'scenery',description:'Tidal stone, rooted banks and the materials of working water.',scenes:[{id:49,name:'The river'},{id:2020,name:'Coral frontier'},{id:2025,name:'Mangrove frontier'}]},
 {id:'industry',title:'Clay, copper and industry',asset:'environmentIndustryV17',file:'industry-v17.webp',role:'scenery',description:'Craft and maintenance objects grounded in the district’s materials.',scenes:[{id:28,name:'The catwalk'},{id:50005,name:'Rook’s furnace road'},{id:2015,name:'Caldera frontier'}]},
 {id:'highlands',title:'Glacier and northern country',asset:'environmentHighlandsV17',file:'highlands-v17.webp',role:'scenery',description:'Frosted stone, hardy northern growth and weathered survey traces for cold regions.',scenes:[{id:2035,name:'Glacier frontier'},{id:2040,name:'Aurora frontier'},{id:2039,name:'Glacier sanctuary'}]},
 {id:'drylands',title:'Drylands and old stone',asset:'environmentDrylandsV17',file:'drylands-v17.webp',role:'scenery',description:'Dryland plants and the traces of weather and earlier craft.',scenes:[{id:2000,name:'Dune frontier'},{id:2010,name:'Cactus frontier'},{id:2055,name:'Marble frontier'}]},
 {id:'minerals',title:'Mineral gardens and pale growth',asset:'environmentMinerals',file:'mineral-garden-v17.webp',role:'scenery',description:'Faceted minerals, luminous fungal growth and shell-worn stone.',scenes:[{id:2030,name:'Crystal frontier'},{id:2045,name:'Spore frontier'},{id:2020,name:'Coral frontier'}]},
 {id:'storm',title:'Rain, wind and exposed country',asset:'environmentStorm',file:'stormworks-v17.webp',role:'scenery',description:'Rain-darkened slate, upland roots and grounded copper craft without snow.',scenes:[{id:2050,name:'Storm frontier'},{id:295,name:'The summit'},{id:149,name:'Storm anchorage'}]},
 {id:'village',title:'A village at work',asset:'environmentVillage',file:'village-craft-v17.webp',role:'scenery',description:'Sparse civic and craft details near existing homes and workplaces.',scenes:[{id:5,name:'Cinderfall'},{id:17,name:'The market'},{id:50001,name:'Sable’s reed road'}]},
 {id:'artisans',title:'Rooms with a purpose',asset:'environmentArtisans',file:'artisans-v17.webp',role:'furniture',description:'Household and craft furniture for matching existing room footprints.',scenes:[{id:2,name:'The family home'},{id:4,name:'Instrumentworks'},{id:50,name:'The clinic'}]},
 {id:'ground',title:'The ground underfoot',asset:'environmentGround',file:'ground-details-v17.webp',role:'ground',description:'Low, irregular material details that sit beneath travellers.',scenes:[{id:5,name:'Cinderfall'},{id:2005,name:'Salt frontier'},{id:2045,name:'Spore frontier'}]},
 {id:'wayfinding',title:'Signs, surveys and travelling supplies',asset:'environmentWayfinding',file:'wayfinding-v17.webp',role:'scenery',description:'Painted replacements for existing dispatch boards, survey instruments, travel markers and supplies.',scenes:[{id:226,name:'The Commons dispatch'},{id:2000,name:'Dune trailhead'},{id:2050,name:'Storm worksite'}]},
 {id:'shelters',title:'Places to rest',asset:'environmentShelters',file:'shelters-v17.webp',role:'scenery',description:'Human-scale regional shelters at existing outdoor rest points, with open fronts and simple travelling supplies.',scenes:[{id:2000,name:'Dune shelter'},{id:2035,name:'Glacier windbreak'},{id:2045,name:'Sporewood refuge'}]}
].map(c=>Object.freeze({...c,scenes:Object.freeze(c.scenes.map(Object.freeze))})));

export const ENVIRONMENT_ART_FILES=Object.freeze(Object.fromEntries(ENVIRONMENT_COLLECTIONS.map(c=>[c.asset,c.file])));
export const ENVIRONMENT_STAGED_IDS=Object.freeze(['river-stairs','rope-trail-gate']);
const STAGED_REASONS=Object.freeze({
 'river-stairs':'Reserved for a future authored landing with matching elevation and a real route.',
 'rope-trail-gate':'Reserved for a future explicitly authored trail gate; the open rope must never suggest an invented route.'
});

// Measured source rectangles for the approved original PNGs. New collections
// can append entries without changing world generation or existing save data.
const SOURCE_ROWS=[
 {"id":"mangrove-root","collection":"waterside","asset":"environmentWaterside","crop":[23,36,400,389],"height":102},
 {"id":"tidepool-ledge","collection":"waterside","asset":"environmentWaterside","crop":[454,83,418,339],"height":78},
 {"id":"fishing-skiff","collection":"waterside","asset":"environmentWaterside","crop":[902,116,422,313],"height":92},
 {"id":"cattail-bank","collection":"waterside","asset":"environmentWaterside","crop":[1354,34,398,401],"height":92},
 {"id":"river-stairs","collection":"waterside","asset":"environmentWaterside","crop":[25,448,402,415],"height":116},
 {"id":"coral-fan","collection":"waterside","asset":"environmentWaterside","crop":[463,465,399,394],"height":94},
 {"id":"reed-traps","collection":"waterside","asset":"environmentWaterside","crop":[899,480,425,377],"height":80},
 {"id":"willow-bank","collection":"waterside","asset":"environmentWaterside","crop":[1350,457,400,407],"height":113},
 {"id":"hollow-root","collection":"woodland","asset":"environmentWoodland","crop":[16,40,456,412],"height":107},
 {"id":"shelf-fungi-log","collection":"woodland","asset":"environmentWoodland","crop":[476,97,463,302],"height":74},
 {"id":"birch-stump","collection":"woodland","asset":"environmentWoodland","crop":[964,84,345,353],"height":84},
 {"id":"violet-fungi","collection":"woodland","asset":"environmentWoodland","crop":[1368,80,375,356],"height":97},
 {"id":"bluebell-log","collection":"woodland","asset":"environmentWoodland","crop":[17,508,444,335],"height":77},
 {"id":"amber-resin-plant","collection":"woodland","asset":"environmentWoodland","crop":[486,458,375,396],"height":101},
 {"id":"mushroom-root-arch","collection":"woodland","asset":"environmentWoodland","crop":[876,534,458,279],"height":79},
 {"id":"meadow-shrubs","collection":"woodland","asset":"environmentWoodland","crop":[1348,484,411,359],"height":78},
 {"id":"clay-kiln","collection":"industry","asset":"environmentIndustryV17","crop":[23,31,400,394],"height":122},
 {"id":"casting-basin","collection":"industry","asset":"environmentIndustryV17","crop":[470,94,398,339],"height":84},
 {"id":"bellows-workstand","collection":"industry","asset":"environmentIndustryV17","crop":[904,51,406,391],"height":104},
 {"id":"rail-buffer","collection":"industry","asset":"environmentIndustryV17","crop":[1336,90,415,337],"height":86},
 {"id":"copper-valve","collection":"industry","asset":"environmentIndustryV17","crop":[19,460,431,385],"height":98},
 {"id":"ember-basalt","collection":"industry","asset":"environmentIndustryV17","crop":[457,463,432,383],"height":91},
 {"id":"ore-cart","collection":"industry","asset":"environmentIndustryV17","crop":[919,513,394,330],"height":88},
 {"id":"slag-vent","collection":"industry","asset":"environmentIndustryV17","crop":[1348,448,409,409],"height":109},
 {"id":"ice-standing-stones","collection":"highlands","asset":"environmentHighlandsV17","crop":[35,60,392,370],"height":102},
 {"id":"frost-pines","collection":"highlands","asset":"environmentHighlandsV17","crop":[495,43,351,385],"height":118},
 {"id":"frost-driftwood","collection":"highlands","asset":"environmentHighlandsV17","crop":[908,89,419,357],"height":84},
 {"id":"aurora-cairn","collection":"highlands","asset":"environmentHighlandsV17","crop":[1368,59,362,394],"height":102},
 {"id":"heather-crag","collection":"highlands","asset":"environmentHighlandsV17","crop":[33,481,463,362],"height":80},
 {"id":"weather-vane","collection":"highlands","asset":"environmentHighlandsV17","crop":[543,430,290,418],"height":125},
 {"id":"snow-fence","collection":"highlands","asset":"environmentHighlandsV17","crop":[900,533,441,314],"height":80},
 {"id":"glacial-ledge","collection":"highlands","asset":"environmentHighlandsV17","crop":[1352,528,400,322],"height":91},
 {"id":"sandstone-shelf","collection":"drylands","asset":"environmentDrylandsV17","crop":[9,23,422,389],"height":101},
 {"id":"agave-ocotillo","collection":"drylands","asset":"environmentDrylandsV17","crop":[464,13,385,420],"height":98},
 {"id":"salt-outcrop","collection":"drylands","asset":"environmentDrylandsV17","crop":[882,35,433,394],"height":92},
 {"id":"stone-rill","collection":"drylands","asset":"environmentDrylandsV17","crop":[1340,57,420,348],"height":82},
 {"id":"marble-column","collection":"drylands","asset":"environmentDrylandsV17","crop":[12,455,406,402],"height":126},
 {"id":"fresco-wall","collection":"drylands","asset":"environmentDrylandsV17","crop":[459,448,416,396],"height":105},
 {"id":"wind-shrine","collection":"drylands","asset":"environmentDrylandsV17","crop":[896,461,418,387],"height":112},
 {"id":"flowering-cactus","collection":"drylands","asset":"environmentDrylandsV17","crop":[1358,440,388,425],"height":107},
 {"id":"wash-trough","collection":"village","asset":"environmentVillage","crop":[20,194,452,276],"height":76},
 {"id":"potters-wheel","collection":"village","asset":"environmentVillage","crop":[486,118,401,351],"height":86},
 {"id":"produce-stall","collection":"village","asset":"environmentVillage","crop":[905,17,429,459],"height":128},
 {"id":"covered-well","collection":"village","asset":"environmentVillage","crop":[1354,95,390,370],"height":97},
 {"id":"rosemary-wall","collection":"village","asset":"environmentVillage","crop":[8,540,458,330],"height":70},
 {"id":"carvers-bench","collection":"village","asset":"environmentVillage","crop":[463,530,429,331],"height":83},
 {"id":"mending-line","collection":"village","asset":"environmentVillage","crop":[896,499,442,367],"height":105},
 {"id":"bread-oven","collection":"village","asset":"environmentVillage","crop":[1342,466,429,399],"height":114},
 {"id":"mineral-geode","collection":"minerals","asset":"environmentMinerals","crop":[23,19,400,406],"height":92},
 {"id":"aragonite-fan","collection":"minerals","asset":"environmentMinerals","crop":[446,14,433,415],"height":96},
 {"id":"aquamarine-shelf","collection":"minerals","asset":"environmentMinerals","crop":[894,90,439,313],"height":74},
 {"id":"star-slate-cairn","collection":"minerals","asset":"environmentMinerals","crop":[1376,17,369,410],"height":96},
 {"id":"pale-root","collection":"minerals","asset":"environmentMinerals","crop":[27,447,411,416],"height":91},
 {"id":"amber-shelf-fungi","collection":"minerals","asset":"environmentMinerals","crop":[458,445,430,416],"height":82},
 {"id":"pearl-fungal-sapling","collection":"minerals","asset":"environmentMinerals","crop":[929,434,365,430],"height":112},
 {"id":"shell-basin","collection":"minerals","asset":"environmentMinerals","crop":[1337,478,427,365],"height":79},
 {"id":"storm-crag","collection":"storm","asset":"environmentStorm","crop":[26,57,399,347],"height":92},
 {"id":"wind-grasses","collection":"storm","asset":"environmentStorm","crop":[464,86,429,325],"height":72},
 {"id":"grounding-coil","collection":"storm","asset":"environmentStorm","crop":[925,63,347,359],"height":98},
 {"id":"rain-catch","collection":"storm","asset":"environmentStorm","crop":[1350,78,406,344],"height":84},
 {"id":"mooring-bollard","collection":"storm","asset":"environmentStorm","crop":[40,508,397,317],"height":68},
 {"id":"bronze-vane","collection":"storm","asset":"environmentStorm","crop":[498,443,344,415],"height":111},
 {"id":"anchorage-chain","collection":"storm","asset":"environmentStorm","crop":[911,491,373,338],"height":84},
 {"id":"upland-roots","collection":"storm","asset":"environmentStorm","crop":[1321,490,429,343],"height":77},
 {"id":"apothecary-table","collection":"artisans","asset":"environmentArtisans","crop":[15,16,429,419],"height":100},
 {"id":"indigo-loom","collection":"artisans","asset":"environmentArtisans","crop":[454,8,447,419],"height":100},
 {"id":"bakers-counter","collection":"artisans","asset":"environmentArtisans","crop":[902,49,434,379],"height":100},
 {"id":"luthier-bench","collection":"artisans","asset":"environmentArtisans","crop":[1342,31,430,405],"height":100},
 {"id":"archive-cabinet","collection":"artisans","asset":"environmentArtisans","crop":[28,446,423,381],"height":100},
 {"id":"herb-drying-rack","collection":"artisans","asset":"environmentArtisans","crop":[461,428,436,431],"height":100},
 {"id":"supper-table","collection":"artisans","asset":"environmentArtisans","crop":[918,446,363,420],"height":100},
 {"id":"quilt-bed","collection":"artisans","asset":"environmentArtisans","crop":[1343,438,427,417],"height":100},
 {"id":"leaf-litter","collection":"ground","asset":"environmentGround","crop":[57,78,363,314],"height":35},
 {"id":"river-pebbles","collection":"ground","asset":"environmentGround","crop":[532,86,283,277],"height":35},
 {"id":"clay-shards","collection":"ground","asset":"environmentGround","crop":[938,78,313,317],"height":35},
 {"id":"salt-scatter","collection":"ground","asset":"environmentGround","crop":[1418,96,296,278],"height":35},
 {"id":"frost-scatter","collection":"ground","asset":"environmentGround","crop":[61,503,366,321],"height":35},
 {"id":"spore-carpet","collection":"ground","asset":"environmentGround","crop":[539,510,272,308],"height":35},
 {"id":"charcoal-scatter","collection":"ground","asset":"environmentGround","crop":[955,509,305,312],"height":35},
 {"id":"worn-mosaic","collection":"ground","asset":"environmentGround","crop":[1381,503,325,322],"height":35},
 {"id":"frontier-noticeboard","collection":"wayfinding","asset":"environmentWayfinding","crop":[44,76,396,355],"height":100,"role":"utility"},
 {"id":"trail-fingerpost","collection":"wayfinding","asset":"environmentWayfinding","crop":[561,43,281,388],"height":100,"role":"utility"},
 {"id":"travel-waystone","collection":"wayfinding","asset":"environmentWayfinding","crop":[964,104,334,334],"height":87,"role":"utility"},
 {"id":"carved-standing-stone","collection":"wayfinding","asset":"environmentWayfinding","crop":[1426,17,310,427],"height":109,"role":"utility"},
 {"id":"refuge-cache","collection":"wayfinding","asset":"environmentWayfinding","crop":[40,496,432,352],"height":75,"role":"utility"},
 {"id":"rope-trail-gate","collection":"wayfinding","asset":"environmentWayfinding","crop":[505,492,433,333],"height":85,"role":"utility"},
 {"id":"weather-beacon","collection":"wayfinding","asset":"environmentWayfinding","crop":[1009,464,286,377],"height":97,"role":"utility"},
 {"id":"survey-marker","collection":"wayfinding","asset":"environmentWayfinding","crop":[1395,485,345,347],"height":80,"role":"utility"},
 {"id":"woodland-leanto","collection":"shelters","asset":"environmentShelters","crop":[90,95,342,319],"height":100,"role":"utility"},
 {"id":"desert-awning","collection":"shelters","asset":"environmentShelters","crop":[496,103,354,313],"height":100,"role":"utility"},
 {"id":"frost-windbreak","collection":"shelters","asset":"environmentShelters","crop":[932,144,383,270],"height":93,"role":"utility"},
 {"id":"marsh-reed-shelter","collection":"shelters","asset":"environmentShelters","crop":[1385,86,327,343],"height":104,"role":"utility"},
 {"id":"basalt-refuge","collection":"shelters","asset":"environmentShelters","crop":[50,512,393,272],"height":92,"role":"utility"},
 {"id":"stormcloth-shelter","collection":"shelters","asset":"environmentShelters","crop":[500,534,385,249],"height":90,"role":"utility"},
 {"id":"spore-root-shelter","collection":"shelters","asset":"environmentShelters","crop":[920,511,394,285],"height":96,"role":"utility"},
 {"id":"marble-alcove","collection":"shelters","asset":"environmentShelters","crop":[1362,511,362,287],"height":100,"role":"utility"}
];
export const ENVIRONMENT_PROPS=Object.freeze(SOURCE_ROWS.map(p=>Object.freeze({...p,use:ENVIRONMENT_STAGED_IDS.includes(p.id)?'staged':'runtime',...(STAGED_REASONS[p.id]?{stagingReason:STAGED_REASONS[p.id]}:{}),crop:Object.freeze(p.crop),...(p.parts?{parts:Object.freeze(p.parts.map(Object.freeze))}:{})})));
export const ENVIRONMENT_PROP_BY_ID=Object.freeze(Object.fromEntries(ENVIRONMENT_PROPS.map(p=>[p.id,p])));
const COLLECTION_BY_ID=Object.fromEntries(ENVIRONMENT_COLLECTIONS.map(c=>[c.id,c]));
const T=48,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=(...v)=>v.every(Number.isFinite);
const uint=value=>Number.isFinite(value)?value>>>0:0;
const mixSeed=value=>{let n=uint(value);n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return(n^(n>>>16))>>>0;};

/** Story identities distinguish the river and furnace openings even where their
 * inherited outdoor tile palette is called village. Explicit frontier biomes win. */
export function regionalArtStyle(scene,plan={}){
 if(!scene)return 'village';
 if(scene.biome?.style)return scene.biome.style;
 const identity=[scene.originId,scene.key].filter(Boolean).join(' ').toLowerCase();
 if(/brass-rail|rook-regulator/.test(identity))return 'foundry';
 if(/iona-lowbank|riven-tide/.test(identity))return 'riverbank';
 if(/veyr-storm/.test(identity))return 'storm';
 const style=environmentFor(scene).style;
 const material=scene.authoredOpening?.materialKind||scene.authoredOpening?.landmark?.materialKind;
 if(style==='village'&&material==='water')return 'riverbank';
 if(style==='village'&&material==='forge')return 'foundry';
 return style||'village';
}

// Banks have two recurring natural silhouettes and, where useful, one accent.
// Working objects belong to separately placed, purpose-matched work groups.
// The full artwork catalogue is deliberately not a decoration lottery.
export const REGIONAL_ART_POOLS=Object.freeze({
 village:['meadow-shrubs','birch-stump','bluebell-log'],
 woodland:['hollow-root','shelf-fungi-log','meadow-shrubs'],
 riverbank:['cattail-bank','willow-bank','hollow-root'],
 mangrove:['mangrove-root','cattail-bank','tidepool-ledge'],
 coral:['coral-fan','tidepool-ledge','shell-basin'],
 salt:['salt-outcrop','stone-rill'],
 spore:['violet-fungi','shelf-fungi-log','pale-root'],
 crystal:['mineral-geode','aquamarine-shelf','aragonite-fan'],
 foundry:['ember-basalt','storm-crag'],
 lava:['ember-basalt','storm-crag'],
 sand:['sandstone-shelf','agave-ocotillo','stone-rill'],
 cactus:['flowering-cactus','agave-ocotillo','sandstone-shelf'],
 highland:['storm-crag','wind-grasses','upland-roots'],
 ice:['frost-pines','glacial-ledge','frost-driftwood'],
 aurora:['frost-pines','heather-crag','glacial-ledge'],
 storm:['storm-crag','wind-grasses','upland-roots'],
 ruins:['sandstone-shelf','hollow-root','meadow-shrubs'],
 marble:['stone-rill','shell-basin','sandstone-shelf']
});
for(const pool of Object.values(REGIONAL_ART_POOLS))Object.freeze(pool);

export const REGIONAL_WORK_PALETTES=Object.freeze(Object.fromEntries(Object.entries({
 pottery:['potters-wheel','casting-basin'],metalwork:['bellows-workstand','casting-basin'],foundry:['bellows-workstand','copper-valve'],
 rail:['rail-buffer','ore-cart'],fishing:['reed-traps','fishing-skiff'],landing:['reed-traps','fishing-skiff'],mooring:['mooring-bollard','anchorage-chain'],
 storm:['grounding-coil','bronze-vane'],weather:['bronze-vane','rain-catch'],waterworks:['copper-valve','rain-catch'],
 market:['produce-stall'],household:['wash-trough','mending-line'],bakery:['bread-oven'],carpentry:['carvers-bench'],
 survey:['survey-marker','weather-vane'],ruins:['marble-column','fresco-wall']
}).map(([key,pool])=>[key,Object.freeze(pool)])));

/** Narrow aliases for the real job at a work anchor, never its region alone. */
export function regionalWorkKind(value=''){
 const text=String(value).toLowerCase();if(Object.hasOwn(REGIONAL_WORK_PALETTES,text))return text;
 if(/potter|ceramic|clay work/.test(text))return 'pottery';
 if(/carpenter|joiner|luthier|instrumentworks|woodwork/.test(text))return 'carpentry';
 if(/rail|semaphore|crossing/.test(text))return 'rail';
 if(/fish/.test(text))return 'fishing';if(/moor|anchor|dock/.test(text))return 'mooring';if(/landing|ferry/.test(text))return 'landing';
 if(/weather|survey/.test(text))return 'weather';if(/storm|grounding|mast/.test(text))return 'storm';
 if(/sluice|waterwork|cistern|pump|gauge/.test(text))return 'waterworks';
 if(/furnace|forge|smelt|regulator/.test(text))return 'foundry';if(/smith|metal|casting/.test(text))return 'metalwork';
 if(/baker|bread|oven/.test(text))return 'bakery';if(/market|produce/.test(text))return 'market';
 if(/home|household|laundry|mending/.test(text))return 'household';if(/ruin|marble|fresco/.test(text))return 'ruins';return null;
}

/** A spec may be used by the live renderer or the isolated art gallery. Requested
 * width and height form a containing box, so art is never squeezed or stretched. */
export function environmentPropSpec(id,{height,width}={}){
 const p=ENVIRONMENT_PROP_BY_ID[id];if(!p)return null;
 const [, ,sw,sh]=p.crop;
 if(!finite(sw,sh)||sw<=0||sh<=0)return null;
 const h=Number.isFinite(height)?clamp(height,8,420):p.height||82;
 const k=Math.min(h/sh,Number.isFinite(width)&&width>0?width/sw:Infinity);
 return {...p,width:sw*k,height:sh*k};
}

// Kept as a layout spacing hint for existing consumers. Similar plants may
// repeat inside a group; selection no longer forces unrelated neighbouring art.
export const REGIONAL_MOTIF_SPACING=3.4;

function siteChoice(site,scene){
 if(!site||!scene||site.landmark||site.role==='landmark'||site.indoor||isInteriorScene(scene))return null;
 const style=regionalArtStyle(scene),bank=REGIONAL_ART_POOLS[style]||REGIONAL_ART_POOLS.village;
 const seed=mixSeed(uint(site.motifSeed??site.seed)^Math.imul(uint(scene.location),2654435761));
 const member=Number.isInteger(site.memberIndex)?Math.max(0,site.memberIndex):0;
 const workKind=site.role==='work'?regionalWorkKind(site.workKind):null,work=workKind&&REGIONAL_WORK_PALETTES[workKind];
 let id,role='bank';
 if(work){role='work';id=work.includes(site.propId)?site.propId:work[member%work.length];}
 else if(bank.includes(site.propId))id=site.propId;
 else if(site.groupId!==undefined||site.motifSeed!==undefined){
  // A cluster reads as one repeated plant/stone family, with a quiet accent in
  // every third member. The chosen dominant is stable for the whole group.
  const dominant=(seed>>>4)%Math.min(2,bank.length),phase=member%3;
  id=phase===2&&bank.length>2?bank[2]:bank[phase===1?(dominant+1)%Math.min(2,bank.length):dominant];
 }else id=bank.length>2&&seed%5===4?bank[2]:bank[seed%Math.min(2,bank.length)];
 return {id,seed,role};
}

/** The shared outdoor layout can measure this exact crop before placing it.
 * Selection is independent of a plan, neighbouring props and render order. */
export function regionalSiteSpec(site,scene,plan={}){
 const choice=siteChoice(site,scene);if(!choice)return null;
 const p=ENVIRONMENT_PROP_BY_ID[choice.id],scale=Number.isFinite(site.scale)&&site.scale>0?site.scale:1;
 if(!p)return null;
 const height=(choice.role==='work'?clamp(p.height*.72,52,86):clamp(p.height*.62,44,74))/scale;
 const spec=environmentPropSpec(choice.id,{height,width:(choice.role==='work'?116:104)/scale});
 return spec?{...spec,role:choice.role}:null;
}

/** Match only furniture that already performs the pictured job. Story devices,
 * supplied remedies and treatment beds retain their specialized presentation. */
export function regionalFurnitureSpec(scene,object){
 const b=object?.footprint,kind=scene?.household?.kind||object?.roomKind;
 if(!scene||!object||object.type!=='furnishing'||!b||object.supply||!finite(b.w,b.h)||b.w<=0||b.h<=0)return null;
 const id=object.furniture,visual=object.visual,key=scene.key||'';let motif=null;
 if(id===0&&['home','quarters','nursery','inn','refuge'].includes(kind))motif='quilt-bed';
 else if(id===21&&['tailor','home','quarters'].includes(kind))motif='indigo-loom';
 else if(id===10&&kind==='clinic'&&!visual)motif=b.h>=2?'apothecary-table':'herb-drying-rack';
 else if(id===5&&(!visual||visual==='dining')&&['home','quarters','inn','mess','kitchen','assembly','refuge'].includes(kind))motif='supper-table';
 else if(id===3&&visual==='kitchen'&&['home','inn','mess','kitchen','assembly','refuge'].includes(kind))motif='bakers-counter';
 else if(id===8&&/instrumentworks|luthier/.test(key))motif='luthier-bench';
 else if(id===2&&(!visual||visual==='reading')&&['archive','guild','printshop','waiting'].includes(kind))motif='archive-cabinet';
 if(!motif)return null;
 const width=Math.min(160,Math.max(42,b.w*T)),height=Math.min(152,Math.max(82,b.h*T+42));
 return environmentPropSpec(motif,{width,height});
}

const GROUND_POOLS=Object.freeze({
 village:['leaf-litter','river-pebbles'],woodland:['leaf-litter'],riverbank:['river-pebbles'],mangrove:['river-pebbles','leaf-litter'],coral:['salt-scatter','river-pebbles'],salt:['salt-scatter'],
 foundry:['charcoal-scatter','clay-shards'],lava:['charcoal-scatter'],sand:['clay-shards'],cactus:['clay-shards'],highland:['river-pebbles'],storm:['river-pebbles'],
 ice:['frost-scatter'],aurora:['frost-scatter'],spore:['spore-carpet'],crystal:['worn-mosaic','river-pebbles'],ruins:['worn-mosaic'],marble:['worn-mosaic']
});
/** A low decorative stamp only. The caller chooses safe sites and clips floor. */
export function regionalGroundSpec(scene,seed=0,plan={}){
 if(!scene||isInteriorScene(scene))return null;
 const style=regionalArtStyle(scene,plan),pool=(GROUND_POOLS[style]||GROUND_POOLS.village).filter(id=>ENVIRONMENT_PROP_BY_ID[id]);
 if(!pool.length)return null;
 return environmentPropSpec(pool[mixSeed(seed)%pool.length],{width:70+(uint(seed)%21),height:35});
}

function imageDimensions(image){
 if(!image||image.complete===false)return null;
 const width=image.naturalWidth??image.width,height=image.naturalHeight??image.height;
 return finite(width,height)&&width>0&&height>0?{width,height}:null;
}
function validCrop(crop,size){return Array.isArray(crop)&&crop.length===4&&crop.every(Number.isFinite)&&crop[0]>=0&&crop[1]>=0&&crop[2]>0&&crop[3]>0&&crop[0]+crop[2]<=size.width&&crop[1]+crop[3]<=size.height;}

/** Draw at local PIXEL coordinates, bottom-center. The surrounding renderer may
 * already translate/scale a site; this helper does not apply world coordinates.
 * Standard and compatibility graphics use exactly the same direct image path. */
export function drawRegionalProp(renderer,spec,x=0,y=3,options={}){
 if(typeof spec==='string')spec=environmentPropSpec(spec,options);
 const c=renderer?.ctx,image=renderer?.assets?.[spec?.asset],size=imageDimensions(image);
 if(!spec||!c?.drawImage||!c?.save||!c?.restore||!size||!finite(x,y,spec.width,spec.height)||spec.width<=0||spec.height<=0||!validCrop(spec.crop,size))return false;
 const parts=spec.parts||[spec.crop];if(!parts.every(part=>validCrop(part,size)))return false;
 const [sx,sy,sw,sh]=spec.crop,k=spec.width/sw;
 if(Math.abs(spec.height/sh-k)>1e-6)return false;
 const alpha=Number.isFinite(options.alpha)?clamp(options.alpha,0,1):1;
 c.save();try{
  c.globalAlpha*=alpha;
  if(options.flip){if(!c.translate||!c.scale)return false;c.translate(x,y);c.scale(-1,1);x=0;y=0;}
  for(const [px,py,pw,ph] of parts)c.drawImage(image,px,py,pw,ph,x-spec.width/2+(px-sx)*k,y-spec.height+(py-sy)*k,pw*k,ph*k);
  return true;
 }catch{return false;}finally{c.restore();}
}

/** Size-aware fade for large shoreline/root silhouettes. Site and actor positions
 * are world tiles; the crop’s full displayed rectangle supplies a conservative
 * upper-body boundary. It never affects collision or the actor’s own opacity. */
export function regionalPropOcclusion(site,spec,actors=[]){
 if(!site||!spec||!finite(site.x,site.y,spec.width,spec.height))return 1;
 const scale=Number.isFinite(site.scale)&&site.scale>0?site.scale:1,w=spec.width*scale/T,h=spec.height*scale/T;
 for(const a of actors){
  if(!a||!finite(a.x,a.y)||a.y>=site.y+.05)continue;
  const half=Math.max(.25,Number.isFinite(a.width)?a.width/2:.38),head=a.y-(Number.isFinite(a.height)?a.height:1.24);
  if(a.x+half>site.x-w/2&&a.x-half<site.x+w/2&&a.y>site.y-h&&head<site.y+.1)return .3;
 }
 return 1;
}

export function environmentCollectionFor(prop){return COLLECTION_BY_ID[typeof prop==='string'?ENVIRONMENT_PROP_BY_ID[prop]?.collection:prop?.collection]||null;}
