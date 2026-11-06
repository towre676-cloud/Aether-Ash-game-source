/* Game content blueprints, NOT an assertion of these nodes' existence in the live map.
 * Coordinates come only from the actual placed world objects at runtime. */
export const ACOUSTIC_QUESTS=Object.freeze([
 {id:'marsh_sluice',biome:'reed_marsh',signal:'water',needs:[],gives:'sluice_shortcut',challenge:'quiet_path',consequence:'safer_flood_crossing'},
 {id:'marsh_song',biome:'reed_marsh',signal:'hydrophone',needs:['sluice_shortcut'],gives:'water_sings',challenge:'direction',consequence:'opens_resonance_archive'},
 {id:'grove_cinders',biome:'ash_grove',signal:'ash',needs:[],gives:'ember_root_cache',challenge:'weather_muffling',consequence:'unlocks_ember_crafting'},
 {id:'grove_escape',biome:'ash_grove',signal:'secret_exit',needs:['ember_root_cache'],gives:'grove_escape',challenge:'sprint_noise',consequence:'patrol_avoidance'},
 {id:'shore_hollow',biome:'salt_shore',signal:'clay',needs:[],gives:'shallow_hollow',challenge:'surface_frequency',consequence:'tide_shortcut'},
 {id:'shore_echo',biome:'salt_shore',signal:'past_echo',needs:['shallow_hollow'],gives:'shore_memory',challenge:'temporal_comparison',consequence:'timeline_lore'},
 {id:'grassland_prey',biome:'night_grassland',signal:'beast_near',needs:[],gives:'grassland_approach_warning',challenge:'stealth',consequence:'ambush_prevention'},
 {id:'grassland_refuge',biome:'night_grassland',signal:'shelter',needs:[],gives:'grassland_rest_site',challenge:'direction',consequence:'rest_heal'},
 {id:'ember_resonance',biome:'ember_highland',signal:'mako',needs:['ember_root_cache'],gives:'ember_mako_vein',challenge:'shield_frequency',consequence:'mako_reagent'},
 {id:'ember_gate',biome:'ember_highland',signal:'false_wall',needs:[],gives:'ember_gate',challenge:'low_frequency',consequence:'weapon_upgrade_path'},
 {id:'market_wall',biome:'rain_market',signal:'false_wall',needs:[],gives:'market_hidden_storage',challenge:'rain_muffling',consequence:'merchant_inventory'},
 {id:'market_voices',biome:'rain_market',signal:'future_echo',needs:['market_hidden_storage'],gives:'market_foreshadowing',challenge:'multi_timeline',consequence:'alternate_npc_dialogue'},
 {id:'inn_safehouse',biome:'wooden_inn',signal:'shelter',needs:[],gives:'inn_attic_room',challenge:'floorboard_resonance',consequence:'companion_story'},
 {id:'forge_bellows',biome:'clay_forge',signal:'clay',needs:[],gives:'kiln_hidden_chamber',challenge:'knock_pattern',consequence:'repair_bench'},
 {id:'cavern_wardens',biome:'limestone_cavern',signal:'beast_near',needs:[],gives:'warden_patrol_route',challenge:'echo_distance',consequence:'tactical_advantage'},
 {id:'cavern_passage',biome:'limestone_cavern',signal:'secret_exit',needs:['warden_patrol_route'],gives:'cavern_crawlspace',challenge:'quiet_step',consequence:'avoids_elite_guard'},
 {id:'sun_ruin_lines',biome:'sunlit_ruins',signal:'kakeya_line',needs:[],gives:'line_of_directions',challenge:'geometry',consequence:'geometric_puzzle_path'},
 {id:'aqueduct_key',biome:'crystal_aqueduct',signal:'water',needs:['water_sings'],gives:'aqueduct_pressure_gate',challenge:'underwater_listening',consequence:'floodgate_access'},
 {id:'archive_answer',biome:'submerged_archive',signal:'hydrophone',needs:['aqueduct_pressure_gate'],gives:'hydrophone_archive',challenge:'recall_motif',consequence:'new_game_plus_branch'},
 {id:'archive_future',biome:'submerged_archive',signal:'future_echo',needs:['hydrophone_archive'],gives:'future_archive_sigil',challenge:'timeline_switch',consequence:'future_boss_reveal',ngPlus:true},
 {id:'moss_confession',biome:'moss_cathedral',signal:'past_echo',needs:[],gives:'cathedral_choral_memory',challenge:'harmonic',consequence:'companion_bond'},
 {id:'roof_current',biome:'storm_rooftops',signal:'ash',needs:[],gives:'storm_spark_cache',challenge:'weather_muffling',consequence:'elemental_reagent'},
 {id:'tundra_warmth',biome:'frozen_tundra',signal:'shelter',needs:[],gives:'warm_thaw_refuge',challenge:'wind_occlusion',consequence:'survival_route'},
 {id:'rift_choir',biome:'final_rift',signal:'kakeya_line',needs:['line_of_directions','hydrophone_archive'],gives:'rift_harmonic_key',challenge:'multiple_directions',consequence:'boss_weakness',ngPlus:true}
]);
export function questCandidateSources({worldObjects=[],biome,flags=[],ngPlus=false}={}){
 const owned=new Set(flags);
 const specs=ACOUSTIC_QUESTS.filter(s=>s.biome===biome&&(!s.ngPlus||ngPlus)&&s.needs.every(f=>owned.has(f))&&!owned.has(s.gives));
 const eligible=new Map(specs.map(s=>[s.id,s]));
 // Only author-defined actual world objects are candidates. Never fabricate a position.
 return worldObjects.flatMap(o=>{
   if(!o || !o.position || !o.acousticQuestId || !eligible.has(o.acousticQuestId))return [];
   const s=eligible.get(o.acousticQuestId);
   return [{id:o.id,kind:s.signal,position:o.position,range:o.acousticRange||14,occlusion:o.soundOcclusion||0,medium:o.medium||'air',quest:s.id}];
 });
}
export function applyAcousticReward({discovery,worldObjects=[],flags=new Set(),gameCallbacks={}}={}){
 const obj=worldObjects.find(o=>o.id===discovery?.sourceId);
 if(!obj)return {applied:false,reason:'source_not_in_world'};
 const spec=ACOUSTIC_QUESTS.find(s=>s.id===obj.acousticQuestId && s.signal===discovery.signal);
 if(!spec || spec.needs.some(f=>!flags.has(f)))return {applied:false,reason:'locked_or_mismatched'};
 if(flags.has(spec.gives))return {applied:false,reason:'already_claimed'};
 flags.add(spec.gives);
 // Pass consequence to the existing authoritative quest/world systems (no imaginary rewards).
 gameCallbacks.onQuestUnlock?.({id:spec.id,flag:spec.gives,consequence:spec.consequence,source:obj});
 return {applied:true,questId:spec.id,flag:spec.gives,consequence:spec.consequence};
}
