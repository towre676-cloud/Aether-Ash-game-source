export const PROJECTS=Object.freeze({
 river_landing:{cost:{credits:280,scrap:18},benefit:'new_route',tradeoff:'delays_forge'},
 workshop_press:{cost:{credits:240,essence:5},benefit:'cheaper_tempering',tradeoff:'no_instant_damage'},
 refuge_signal:{cost:{credits:180,scrap:10},benefit:'reduced_ambush',tradeoff:'less_hunt_loot'},
 market_caravan:{cost:{credits:320},benefit:'rotating_rare_stock',tradeoff:'raid_risk'}
});
export function canFund(wallet,project){const p=PROJECTS[project];if(!p)return false;return Object.entries(p.cost).every(([k,v])=>(wallet[k]||0)>=v)}
export function fund(wallet,project){if(!canFund(wallet,project))return {ok:false,wallet};const out={...wallet};for(const[k,v]of Object.entries(PROJECTS[project].cost))out[k]-=v;return {ok:true,wallet:out,project:{id:project,...PROJECTS[project]}}}
export const ACTIVITIES=Object.freeze({hydrophone_duel:{loop:'listen_match_counter',reward:'resonance_rune'},mossback_trials:{loop:'route_control_risk',reward:'mount_trait'},salvage_sprint:{loop:'choose_weight_vs_time',reward:'forge_cache'},creature_tracking:{loop:'read_tracks_predict_route',reward:'anatomy_trait'},bellrun_variants:{loop:'weather_gate_routes',reward:'relay_mod'}});
