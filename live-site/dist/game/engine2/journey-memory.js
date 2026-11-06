import {expansionEarned} from './expansion-cinema-content.js?v=5.41';
import {seenCinematic} from './cinema-content.js?v=5.38';
/** One earned album for live animatics and the earlier rendered film records. */
export function journeyMemories(entries,shots,state){
 const bosses=new Set(state.bosses||[]),recruited=new Set(state.recruited||[]),known=new Set(state.cinemaEncounters||[]),history=state.cinemaSeen||[];
 const result=entries.filter(e=>{
  if(e.expansion)return expansionEarned(e,state);if(seenCinematic(state,e.id))return true;
  if(e.kind==='arrival')return e.chapter<(state.chapter||1);
  if(['guardian','victory'].includes(e.kind))return bosses.has(e.chapter);
  if(e.kind==='crew')return recruited.has(e.hero);
  if(e.kind==='creature'&&!e.elder)return known.has(e.species);
  return false;
 }).map(e=>({...e,replayKind:'animatic'}));
 for(const shot of shots){const equivalent=shot.kind==='arrival'?'arrival:'+shot.chapter:shot.kind==='creature'?'creature:'+shot.species:null;
  if(equivalent&&result.some(e=>e.id===equivalent))continue;
  if(history.includes(shot.id)||shot.kind==='arrival'&&shot.chapter<(state.chapter||1)||shot.kind==='creature'&&known.has(shot.species))result.push({...shot,replayKind:'film'});
 }
 return result.sort((a,b)=>{const ai=Math.max(history.indexOf(a.id),history.indexOf(a.id.replace(':','-'))),bi=Math.max(history.indexOf(b.id),history.indexOf(b.id.replace(':','-')));return bi-ai||(b.chapter||0)-(a.chapter||0)||a.title.localeCompare(b.title);});
}
export const memoryKind=e=>e.expansion?({'origin-begin':'Character history','origin-repair':'Historical repair','origin-approach':'Historical encounter','origin-destiny':'Chosen inheritance','origin-return':'Past and present',region:'Regional life',project:'Community work',botany:'Botany',wildlife:'Wildlife',study:'Core study',household:'Household',physical:'Carried object',rare:'Rare Mako',wayglass:'Wayglass',growth:'Resonance Paths',core:'Core discovery',tactic:'Battle craft','frontier-area':'Frontier landscape',commission:'Commission','frontier-creature':'Frontier creature','frontier-move':'Frontier technique',rooms:'Living interiors',school:'Constellation school','school-cap':'Chosen horizon','school-cast':'Equipped school','battle-relic':'Battle relic',reaction:'Elemental reaction',rival:'Friendly challenge'}[e.topic]||'Living world'):({arrival:'Arrival',guardian:'Guardian',victory:'After the battle',creature:'First encounter',assault:'Guardian technique','creature-move':'Creature technique',supply:'Supply',technique:'Mako',crew:'Companion','living-world':'Living world'}[e.kind]||'Memory');
export function cinematicMusic(entry,manifest){
 if(!manifest||entry.compact||entry.kind==='observatory')return null;
 const key=entry.kind==='guardian'?'boss':entry.kind==='victory'?(entry.chapter===24?'credits':entry.chapter===7?'garden':'victory'):entry.kind==='arrival'?({9:'danger',14:'cinema_loss',20:'cinema_reveal',24:'cinema_finale'}[entry.chapter]||'cinema_reveal'):entry.kind==='crew'?({Sable:'sable',Iona:'iona',Rook:'rook'}[entry.title]||'cinema_reveal'):entry.kind==='creature'?'danger':null;
 return manifest.tracks.find(t=>t.id===key)||null;
}
function sentence(text,max=190){const value=String(text||'').split(/(?<=[.!?])\s/)[0];return value.length<=max?value:value.slice(0,max-1).replace(/\s+\S*$/,'')+'…';}
/** Context uses only accounts already available at this stage; never discloses myth truth. */
export function cinematicContext(entry,lore,state,scene){
 if(!lore||entry.compact||entry.kind==='observatory')return '';
 if(entry.kind==='creature'){
  const id=entry.species?.replace(/-elder$/,'');const e=lore.monsters.find(e=>e.id===id&&e.chapter<=(state.chapter||1));return sentence(e?.text);
 }
 if(entry.kind==='crew'){const e=lore.weapons.find(e=>e.owner===entry.title&&e.chapter<=(state.chapter||1));return sentence(e?.text);}
 if(entry.kind==='guardian'&&!(state.bosses||[]).includes(entry.chapter))return '';
 if(entry.kind==='victory'&&(state.bosses||[]).includes(entry.chapter)){const e=lore.plot.find(e=>e.chapter===entry.chapter&&(e.chapter<(state.chapter||1)||state.complete));return sentence(e?.text);}
 if(entry.kind==='arrival'&&scene?.chapter===entry.chapter){const place=lore.places.find(e=>e.location===scene.location&&e.chapter<=(state.chapter||1));return sentence(place?.ambient);}
 return '';
}
