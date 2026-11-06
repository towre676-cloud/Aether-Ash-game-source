import {hash32} from './util.mjs';
export function npcSchedule(npcId,hour,flags={}){const phase=hash32(npcId)%4;if(flags.evacuated)return 'shelter';if(flags.festival)return hour>=17?'festival':'prepare';if(hour<6)return 'home';if(hour<9)return ['market','work','river','stable'][phase];if(hour<17)return ['work','market','patrol','garden'][phase];if(hour<21)return ['tavern','square','home','river'][phase];return 'home';}
export function worldConsequence(state,event){const s=structuredClone(state);s.flags??={};s.traffic??=0;s.monsterPressure??=0;s.prices??={};if(event.kind==='repair'){s.flags[event.id]=true;s.traffic+=1;s.monsterPressure=Math.max(0,s.monsterPressure-1);}
 if(event.kind==='neglect'){s.monsterPressure+=1;}
 if(event.kind==='fund'){s.flags[`funded:${event.id}`]=true;s.prices[event.category]=Math.max(.8,(s.prices[event.category]||1)-.08);}
 if(event.kind==='raid'){s.flags[`damaged:${event.id}`]=true;s.traffic=Math.max(0,s.traffic-1);}
 return s;}
export function migration(region,day,weather='clear'){const h=hash32(region+day+weather);return {species:['cinderstag','reed_serpent','glassbell','mossback_kin'][h%4],density:1+(h%3),direction:['north','east','south','west'][(h>>3)%4]};}
