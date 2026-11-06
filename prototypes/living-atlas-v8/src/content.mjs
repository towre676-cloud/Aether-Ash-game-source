/** Authored, cross-referenced content. Every ID has mechanical meaning. No renderer imports. */
export const MATERIALS=Object.freeze({
 clay:{name:'Living clay',heat:.25,water:.88,conduct:.18,hardness:.42,value:6,category:'soil'},
 silt:{name:'Memory silt',heat:.2,water:.96,conduct:.33,hardness:.14,value:4,category:'soil'},
 timber:{name:'Seasoned timber',heat:.86,water:.34,conduct:.05,hardness:.4,value:8,category:'wood'},
 root:{name:'Resonant root',heat:.54,water:.76,conduct:.44,hardness:.5,value:11,category:'wood'},
 glass:{name:'Aether glass',heat:.1,water:.12,conduct:.82,hardness:.72,value:16,category:'mineral'},
 basalt:{name:'Basalt stone',heat:.06,water:.15,conduct:.2,hardness:.95,value:9,category:'mineral'},
 copper:{name:'Verdigris copper',heat:.15,water:.35,conduct:.97,hardness:.65,value:15,category:'metal'},
 ore:{name:'Deep ore',heat:.2,water:.22,conduct:.81,hardness:.89,value:19,category:'metal'},
 salt:{name:'Coast salt',heat:.01,water:.77,conduct:.48,hardness:.22,value:7,category:'mineral'},
 ash:{name:'Remembered ash',heat:.03,water:.12,conduct:.31,hardness:.1,value:5,category:'remains'},
 moss:{name:'Rain moss',heat:.74,water:.93,conduct:.18,hardness:.12,value:5,category:'living'},
 crystal:{name:'Sky crystal',heat:.14,water:.12,conduct:1,hardness:.8,value:25,category:'mineral'}
});
// Changes to the weather, geology, economy and signals are numerical parameters, not just palettes.
export const REGIONS=Object.freeze([
 {id:'hearthland',name:'Hearthland · Chapel of Rain',biome:'temperate',seed:71,rain:.70,heat:.40,flora:1,stone:.6,aether:.60,resource:'timber',architecture:'chapel',tint:'#86bca9',sky:'#9bc8cb',fog:.006,story:'The chapel remembers a song that the city outlawed.',neighbors:['mosswake','silt_delta','glass_orchard'],people:'Rainkeepers',position:[0,0]},
 {id:'mosswake',name:'Mosswake · Elder Forest',biome:'forest',seed:181,rain:.96,heat:.24,flora:1.65,stone:.42,aether:.65,resource:'root',architecture:'forest',tint:'#598b6c',sky:'#9abcb0',fog:.013,story:'Roots preserve the voices of a vanished choir.',neighbors:['hearthland','clay_basin','sky_engine'],people:'Rootbinders',position:[-1,0]},
 {id:'silt_delta',name:'Silt Delta · The Water Below',biome:'wetland',seed:293,rain:1.3,heat:.54,flora:.90,stone:.30,aether:.9,resource:'silt',architecture:'stilt',tint:'#67aaa0',sky:'#9dbec8',fog:.011,story:'A drowned road carries echoes across time.',neighbors:['hearthland','glass_coast','clay_basin'],people:'Wellwardens',position:[0,1]},
 {id:'glass_orchard',name:'Glass Orchard · The First Harvest',biome:'orchard',seed:403,rain:.74,heat:.57,flora:1.15,stone:.48,aether:.43,resource:'glass',architecture:'orchard',tint:'#b3b986',sky:'#dfcba9',fog:.006,story:'Each fruit can reveal a different possible past.',neighbors:['hearthland','ashfall','glass_coast'],people:'Gleaners',position:[1,0]},
 {id:'ashfall',name:'Ashfall · The Ember Frontier',biome:'burnt',seed:521,rain:.18,heat:.95,flora:.32,stone:1.4,aether:.55,resource:'ash',architecture:'forge',tint:'#9d6e53',sky:'#c9a38d',fog:.01,story:'A furnace was lit to erase a king from history.',neighbors:['glass_orchard','basalt_rift','sky_engine'],people:'Cinderwrights',position:[2,0]},
 {id:'clay_basin',name:'Clay Basin · The Living Earth',biome:'clay',seed:607,rain:.90,heat:.48,flora:.64,stone:.8,aether:.36,resource:'clay',architecture:'kiln',tint:'#bb9781',sky:'#c8c0b6',fog:.009,story:'A buried settlement still rearranges its rooms.',neighbors:['mosswake','silt_delta','basalt_rift'],people:'Shapekeepers',position:[-1,1]},
 {id:'glass_coast',name:'Glass Coast · The Salt Mirror',biome:'coast',seed:733,rain:.44,heat:.64,flora:.5,stone:1.05,aether:1.3,resource:'salt',architecture:'lighthouse',tint:'#a9b5bd',sky:'#bacada',fog:.008,story:'Moonlight reflects the coastline of another century.',neighbors:['silt_delta','glass_orchard','sky_engine'],people:'Tidecallers',position:[1,1]},
 {id:'sky_engine',name:'Sky Engine · Aether Heights',biome:'highland',seed:839,rain:.32,heat:.15,flora:.26,stone:1.7,aether:1.75,resource:'crystal',architecture:'engine',tint:'#8c99bc',sky:'#adb9dd',fog:.004,story:'The machine broadcasts forgotten decisions into the clouds.',neighbors:['mosswake','ashfall','glass_coast','basalt_rift'],people:'Windsmiths',position:[0,-1]},
 {id:'basalt_rift',name:'Basalt Rift · The Unfinished Crown',biome:'volcanic',seed:947,rain:.08,heat:1.4,flora:.12,stone:1.9,aether:1.25,resource:'basalt',architecture:'citadel',tint:'#8c6d6d',sky:'#947e87',fog:.016,story:'The crown was forged from the names of every defeated guardian.',neighbors:['ashfall','clay_basin','sky_engine'],people:'Oathforged',position:[1,-1]}
]);
export const REGION_BY_ID=Object.fromEntries(REGIONS.map(r=>[r.id,r]));
const archetypes=[
 ['sentry','Sentry',.32,.88,'earth','basalt','defend'],
 ['stalker','Stalker',.82,.42,'fire','timber','ambush'],
 ['chanter','Chanter',.52,.45,'aether','crystal','resonate'],
 ['grazer','Grazer',.44,.59,'water','root','migrate'],
 ['burrower','Burrower',.29,.94,'earth','clay','tunnel'],
 ['forager','Forager',.65,.48,'fire','ash','scavenge']
];
const speciesNames={
 hearthland:['Bellstone Guardian','Amberleaf Runner','Rain Cantor','Wildglass Stag','Earthburrow Mole','Hearth Cinderling'],
 mosswake:['Barkbound Colossus','Thornstep Lynx','Choir of Roots','Bluehorn Hart','Fungal Burrower','Spore Forager'],
 silt_delta:['Floodbank Sentinel','Mudglass Viper','Wellsong Moth','Tideback Grazer','Silt Maw','Drowned Lantern'],
 glass_orchard:['Prism Treewarden','Orchard Fox','Fruitglass Siren','Pearlhide Doe','Root Cracker','Gleam Finch'],
 ashfall:['Furnace Bulwark','Ember Prowler','Ash Oracle','Sootback Ox','Coalborer','Cinder Forager'],
 clay_basin:['Kiln Bulwark','Mudrunner','Ceramic Bell','Terra Ram','Clay Devourer','Golem Sprig'],
 glass_coast:['Salt Sentinel','Shoreglass Skitter','Moonfoam Singer','Mirror Whale Calf','Tide Worm','Brine Wisp'],
 sky_engine:['Cloudplate Sentinel','Windrunner','Harmonic Kite','Aether Antelope','Stormborer','Arc Sprite'],
 basalt_rift:['Crownless Watcher','Obsidian Fang','Rift Choir','Lavahide Beast','Basalt Worm','Ashbound Collector']
};
export const SPECIES=Object.freeze(REGIONS.flatMap(region=>archetypes.map(([id,kind,aggression,armor,element,drop,behavior],i)=>({
 id:`${region.id}.${id}`,name:speciesNames[region.id][i],region:region.id,kind,behavior,aggression,armor,element,drop,level:1+Math.floor((region.seed%37)/9)+i,habitat:{
  moisture:id==='grazer'?.65:id==='forager'?.1:.4,biomass:id==='stalker'?.8:.3,
  aether:id==='chanter'?.7:.25,stone:id==='sentry'||id==='burrower'?.7:.3
 },loot:{material:drop,amount:id==='sentry'?2:1},role:id==='sentry'?'guardian':id==='chanter'?'caster':id==='grazer'?'herd':'wild'
}))));
export const SPECIES_BY_ID=Object.fromEntries(SPECIES.map(s=>[s.id,s]));
export const RECIPES=Object.freeze([
 {id:'rootward',name:'Rootward Harness',materials:{timber:2,root:2},effect:{cover:.18,water:.08},use:'gear'},
 {id:'tideglass',name:'Tideglass Lens',materials:{glass:2,silt:1,copper:1},effect:{echo:.25},use:'tool'},
 {id:'slagmail',name:'Slagmail',materials:{basalt:2,ore:1},effect:{cover:.27,fire:-.12},use:'gear'},
 {id:'clayseal',name:'Clay Seal',materials:{clay:2,moss:1},effect:{fire:.18,water:.12},use:'gear'},
 {id:'stormcoil',name:'Stormcoil',materials:{crystal:1,copper:2},effect:{aether:.3,fire:.15},use:'gear'},
 {id:'memoryvial',name:'Memory Vial',materials:{silt:1,glass:1,ash:1},effect:{echo:.5},use:'tool'}
]);
export const RECIPE_BY_ID=Object.fromEntries(RECIPES.map(r=>[r.id,r]));
export const QUESTS=Object.freeze([
 {id:'rain_recovery',region:'hearthland',name:'Reopen the Water Memory',requires:[],action:'open_sluice',reward:{reputation:2},consequence:'Irrigates orchard downstream'},
 {id:'bridge_accord',region:'hearthland',name:'Repair the Pilgrims’ Bridge',requires:[],action:'repair_bridge',reward:{reputation:2},consequence:'Unlocks river crossing'},
 {id:'roots_singing',region:'mosswake',name:'Listen to the Buried Choir',requires:['rain_recovery'],action:'sound_hydrophone',reward:{reputation:3},consequence:'Amplifies persistent root resonance'},
 {id:'underwater_road',region:'silt_delta',name:'Find the Drowned Road',requires:['roots_singing'],action:'sound_hydrophone',reward:{reputation:3},consequence:'Reveals a history-layer road'},
 {id:'fruit_of_years',region:'glass_orchard',name:'Harvest the Timeglass Fruit',requires:['rain_recovery'],action:'harvest',reward:{reputation:3},consequence:'Changes orchard productivity'},
 {id:'furnace_names',region:'ashfall',name:'Restore the Stolen Names',requires:['fruit_of_years'],action:'sound_hydrophone',reward:{reputation:4},consequence:'Weakens the Ash Monarch’s memory veil'},
 {id:'walls_remember',region:'clay_basin',name:'Wake the Rearranging Houses',requires:['underwater_road'],action:'cast_earth',reward:{reputation:4},consequence:'Clay homes protect later timelines'},
 {id:'moon_mirror',region:'glass_coast',name:'Tune the Salt Mirror',requires:['underwater_road'],action:'sound_hydrophone',reward:{reputation:4},consequence:'Mirror discloses historical crossings'},
 {id:'machine_of_days',region:'sky_engine',name:'Rephase the Sky Engine',requires:['furnace_names','moon_mirror'],action:'sound_hydrophone',reward:{reputation:5},consequence:'All regions inherit an Aether harmonic'},
 {id:'unfinished_crown',region:'basalt_rift',name:'Break the Unfinished Crown',requires:['walls_remember','machine_of_days'],action:'defeat_boss',reward:{reputation:10},consequence:'Determines the next age of Ash & Aether'}
]);
export const QUEST_BY_ID=Object.fromEntries(QUESTS.map(q=>[q.id,q]));
export function verifyContent(){const errors=[];for(const r of REGIONS){for(const n of r.neighbors){if(!REGION_BY_ID[n])errors.push(`unknown neighbor ${n}`);else if(!REGION_BY_ID[n].neighbors.includes(r.id))errors.push(`nonreciprocal route ${r.id}->${n}`);}if(!MATERIALS[r.resource])errors.push(`unknown region material ${r.resource}`);}
 for(const s of SPECIES)if(!REGION_BY_ID[s.region]||!MATERIALS[s.drop])errors.push(`invalid species ${s.id}`);
 for(const q of QUESTS){if(!REGION_BY_ID[q.region])errors.push(`quest region ${q.id}`);for(const k of q.requires)if(!QUEST_BY_ID[k])errors.push(`quest prerequisite ${q.id}: ${k}`);}
 for(const r of RECIPES)for(const k of Object.keys(r.materials))if(!MATERIALS[k])errors.push(`recipe material ${k}`);
 return errors;
}
/** Four ecology-activated morphs for each of 54 species: 216 mechanically distinct adaptations.
 * Forms are NOT hand-sculpted unique creature models; they share six authored body grammars.
 */
export const MORPHS=Object.freeze({
 tidebound:{name:'Tidebound',trigger:'moisture',material:'silt',resistances:{water:.23,fire:-.16,earth:0,aether:.03},armor:.04,behavior:'migrate'},
 cinderworn:{name:'Cinderworn',trigger:'ash',material:'ash',resistances:{water:-.28,fire:.36,earth:0,aether:.02},armor:.06,behavior:'scavenge'},
 stonegrown:{name:'Stonegrown',trigger:'stone',material:'basalt',resistances:{water:0,fire:.11,earth:.31,aether:-.23},armor:.20,behavior:'defend'},
 phasebound:{name:'Phasebound',trigger:'aether',material:'crystal',resistances:{water:.04,fire:0,earth:-.23,aether:.38},armor:.02,behavior:'resonate'}
});
export const SPECIES_MORPHS=Object.freeze(SPECIES.flatMap(s=>Object.entries(MORPHS).map(([form,m])=>({id:`${s.id}.${form}`,species:s.id,form,name:`${m.name} ${s.name}`,material:m.material,armor:s.armor+m.armor,resistances:m.resistances}))));
