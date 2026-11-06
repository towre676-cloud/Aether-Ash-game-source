export const BOSS_PHASES=Object.freeze({
 bell_warden:[
  {hp:.75,rule:'echo_lanes',arena:{spawn:['three_resonant_lanes']},counter:'match or cross between pulses'},
  {hp:.45,rule:'broken_bells',arena:{mutate:['lanes_become_cover']},counter:'use broken bells as shielding'},
  {hp:.18,rule:'silence_window',arena:{mutate:['music_drops_out','weak_core_exposed']},counter:'commit damage during silence'}],
 orchard_colossus:[
  {hp:.72,rule:'root_claim',arena:{spawn:['growing_root_zones']},counter:'burn, cut, or redirect water'},
  {hp:.42,rule:'canopy_fall',arena:{mutate:['destroy_some_cover','create_log_bridges']},counter:'use new bridges to flank'},
  {hp:.15,rule:'seed_storm',arena:{spawn:['mobile_seed_shields']},counter:'break seeds for temporary armor'}],
 sky_engine:[
  {hp:.78,rule:'charged_quadrants',arena:{spawn:['alternating_charge']},counter:'move on phase changes'},
  {hp:.48,rule:'gravity_turn',arena:{mutate:['reverse_push_pull']},counter:'use pull to reach exposed relays'},
  {hp:.20,rule:'overclock',arena:{mutate:['shorter_casts','longer_player_chains']},counter:'chain transformed techniques'}]
});
export function bossState(id,hpRatio,seen=[]){const phases=BOSS_PHASES[id]||[];const active=phases.find((p,i)=>hpRatio<=p.hp&&!seen.includes(i));if(!active)return null;return {...active,index:phases.indexOf(active)};}
