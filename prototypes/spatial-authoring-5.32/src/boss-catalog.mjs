const FAMILIES=[
 {id:'resonance',beats:['lanes','cover_conversion','silence_window']},
 {id:'ecology',beats:['claim_zones','arena_fall','seed_shields']},
 {id:'gravity',beats:['charged_quadrants','push_pull_flip','overclock']},
 {id:'flood',beats:['rising_water','floating_cover','drain_race']},
 {id:'forge',beats:['molten_channels','break_anvils','heat_reversal']},
 {id:'memory',beats:['repeat_last_action','erase_safe_zone','choose_true_echo']},
 {id:'hunt',beats:['stalk_by_sound','destroy_lights','bait_charge']},
 {id:'geometry',beats:['moving_walls','rotate_arena','collapse_to_duel']}
];
export function guardianPlan(chapter,name='Guardian'){const family=FAMILIES[(chapter-1)%FAMILIES.length];const cycle=Math.floor((chapter-1)/FAMILIES.length);return {chapter,name,family:family.id,beats:family.beats.map((rule,i)=>({phase:i+1,rule,intensity:1+cycle*.18+i*.12})),signature:`${family.id}:${cycle+1}`};}
export function catalog24(){return Array.from({length:24},(_,i)=>guardianPlan(i+1,`Guardian ${i+1}`));}
