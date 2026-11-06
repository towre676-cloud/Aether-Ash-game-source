import {clamp,pick} from './util.mjs';
export const BEHAVIORS=Object.freeze({
 gear_thief:{tell:'fixates on loose gear',intent:'steal_then_flee'},
 nest_builder:{tell:'drags debris toward a nest',intent:'alter_route'},
 cover_uprooter:{tell:'hooks its limbs under nearby cover',intent:'remove_cover'},
 sound_hunter:{tell:'turns toward the loudest footfall',intent:'hunt_noise'},
 shield_weaver:{tell:'scrapes nearby material into its hide',intent:'build_material_shield'},
 party_splitter:{tell:'marks the space between companions',intent:'separate_party'},
 mimic_scavenger:{tell:'studies the last technique used',intent:'copy_last_action'},
 refuge_raider:{tell:'targets repaired field structures',intent:'damage_world_state'}
});
export function identityFor(archetype,seed='enemy'){
 const map={raptor:'sound_hunter',mole:'nest_builder',stag:'cover_uprooter',jelly:'shield_weaver',serpent:'party_splitter',mender:'refuge_raider',scavenger:'gear_thief'};
 const behavior=map[archetype]||pick(seed,Object.keys(BEHAVIORS)); return {behavior,...BEHAVIORS[behavior]};
}
export function nextEnemyAction(enemy,world={}){
 const id=enemy.identity?.behavior||enemy.behavior;
 if(id==='gear_thief') return world.looseGear?.length?{kind:'steal',target:world.looseGear[0],escapeAfter:true}:{kind:'harry'};
 if(id==='nest_builder') return {kind:'build_nest',at:world.nearestDebris||enemy.pos,routeCost:+1};
 if(id==='cover_uprooter') return world.cover?.length?{kind:'destroy_cover',target:world.cover[0]}:{kind:'charge'};
 if(id==='sound_hunter'){const t=[...(world.actors||[])].sort((a,b)=>(b.noise||0)-(a.noise||0))[0];return {kind:'hunt',target:t?.id||null,bonus:clamp((t?.noise||0)/10,0,.5)};}
 if(id==='shield_weaver') return {kind:'weave_shield',material:world.nearMaterial||'stone',strength:0.28};
 if(id==='party_splitter') return {kind:'split_line',axis:world.openAxis||'x',width:1.3};
 if(id==='mimic_scavenger') return {kind:'mimic',technique:world.lastPlayerTechnique||'strike',powerScale:.65};
 if(id==='refuge_raider') return world.repairedObject?{kind:'sabotage',target:world.repairedObject.id}:{kind:'pressure'};
 return {kind:'strike'};
}
