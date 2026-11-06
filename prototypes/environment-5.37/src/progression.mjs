import {clamp,hash32} from './util.mjs';
export const VERB_MUTATIONS=Object.freeze({
  echo_step:{label:'Echo Step',trigger:'perfect_dodge',effect:'teleport_to_flank',description:'A clean dodge stores one echo; your next basic strike may blink to the target flank instead of walking into reach.'},
  fault_chain:{label:'Fault Chain',trigger:'armor_break',effect:'chain_nearby_armor',description:'Breaking armor sends the fracture into one nearby armored enemy at reduced strength.'},
  river_return:{label:'River Return',trigger:'water_cast',effect:'leave_healing_current',description:'A water technique leaves a short current allies can cross to recover focus.'},
  kiln_reversal:{label:'Kiln Reversal',trigger:'guard_impact',effect:'return_heat',description:'Guarding a heavy physical hit stores heat and empowers the next clay or ember technique.'},
  mossback_charge:{label:'Mossback Charge',trigger:'mounted_entry',effect:'break_light_cover',description:'Entering an encounter mounted can smash one light barrier and scatter nearby minor foes.'},
  hydrophone_lock:{label:'Hydrophone Lock',trigger:'resonance_match',effect:'delay_enemy_cast',description:'Matching a hostile resonance delays its announced action and exposes its weak component.'},
  salvage_hook:{label:'Salvage Hook',trigger:'enemy_drops_tool',effect:'steal_tool_midfight',description:'Recover a dropped enemy tool during battle and use it before the encounter ends.'},
  aether_arc:{label:'Aether Arc',trigger:'charged_ground',effect:'movement_damage_line',description:'Crossing charged ground leaves a brief arc between entry and exit points.'}
});
export function mutationOffer({seed='offer',owned=[],region='ash',recent=[]}={}){
 const ids=Object.keys(VERB_MUTATIONS).filter(id=>!owned.includes(id));
 const weighted=ids.sort((a,b)=>((hash32(seed+region+a)%997)-(hash32(seed+region+b)%997)));
 return weighted.filter(id=>!recent.includes(id)).slice(0,3).map(id=>({id,...VERB_MUTATIONS[id]}));
}
export function applyMutation(action,mutationId,ctx={}){
 const out=structuredClone(action); const m=VERB_MUTATIONS[mutationId]; if(!m)return out;
 out.mutation=mutationId;
 if(mutationId==='echo_step'&&ctx.echoStored){out.approachMode='blink_flank';out.rangeBypass=true;}
 if(mutationId==='fault_chain'&&ctx.armorBroken){out.chain={radius:2.4,power:clamp((action.power||1)*0.45,0,999)};}
 if(mutationId==='river_return'){out.spawnSurface={kind:'healing_current',duration:5,radius:1.4};}
 if(mutationId==='kiln_reversal'&&ctx.storedHeat){out.power=(out.power||1)*(1+Math.min(.35,ctx.storedHeat*.08));}
 if(mutationId==='hydrophone_lock'&&ctx.resonanceMatch){out.enemyDelay=1.25;out.exposeComponent=true;}
 if(mutationId==='aether_arc'&&ctx.movedDistance>0){out.trail={kind:'aether_arc',length:ctx.movedDistance,duration:2.2};}
 return out;
}
