/** Ordinary patrols announce their roles before competing for loose tools.
 * This is a fresh-battle opt-in: no HP, damage, rewards or repeat-turn cadence
 * change, and old snapshots retain their original opening. */
export const OPENING_BEATS=Object.freeze({mender:.55,predator:.7,guard:.85,scout:1.05});
const live=actor=>actor&&actor.hp>0&&!actor.withdrawn;
const marked=b=>b?.context?.encounterTempo?.version===1;
const spatial=new Set(['burst','line','rails','ring','cross','cleave','pair']);

export function ordinaryTempoEligible(b){
 const c=b?.context||{};
 return marked(b)&&!c.friendly&&!c.tutorial&&!c.wild&&!b.objective&&!b.ecology?.enabled
  &&!(b.enemies||[]).some(e=>e.boss||e.rivalAvatar!==undefined);
}

/** Seed readiness once, before scouting preparation subtracts its own delay.
 * The small stagger is per role, so a repeated role cannot announce four
 * simultaneous warnings. Enemy movement still decides when it can commit. */
export function prepareEncounterTempo(b){
 if(!ordinaryTempoEligible(b))return false;
 const counts={};
 for(const e of b.enemies||[]){
  if(!live(e)||!Object.hasOwn(OPENING_BEATS,e.role)||e.encounterOpening!==undefined)continue;
  const index=counts[e.role]||0;counts[e.role]=index+1;
  const seconds=OPENING_BEATS[e.role]+Math.min(3,index)*.22,speed=Number.isFinite(e.speed)&&e.speed>0?e.speed:1;
  e.atb=Math.max(.05,1-seconds*speed*.33);e.encounterOpening=true;
 }
 return true;
}

export function roleOpeningPending(b,e){return ordinaryTempoEligible(b)&&e?.encounterOpening===true;}

/** First damage has at least 1.65 seconds of visible, locked warning. The
 * normal role logic still chooses alarm, shield, repair or strike. */
export function openingTempoIntent(b,e,intent){
 if(!intent||!roleOpeningPending(b,e))return intent;
 e.encounterOpening=false;
 if(intent.kind!=='strike')return intent;
 const extra=Math.max(0,1.65-(Number(intent.total)||0));
 return {...intent,left:intent.left+extra,total:intent.total+extra,
  label:e.role==='mender'&&!e.species?'Porcelain pulse':intent.label};
}

/** Record who was actually under a mark when it was announced. Resolving
 * harmless empty ground, a wall-blocked mark, or a dead target is no evade. */
export function trackTacticalIntent(b,e,intent){
 if(!marked(b)||intent?.kind!=='strike'||!spatial.has(intent.shape)||!(intent.power>0)||typeof b.intentHits!=='function')return intent;
 return {...intent,tacticalThreats:(b.heroes||[]).filter(h=>live(h)&&b.intentHits(e,intent,h)).map(h=>h.id)};
}

export function reportTacticalEvade(b,source,intent,targets){
 if(!marked(b)||intent?.kind!=='strike'||!spatial.has(intent.shape)||!(intent.power>0)||targets?.length||!Array.isArray(intent.tacticalThreats))return false;
 const threatened=(b.heroes||[]).filter(h=>live(h)&&intent.tacticalThreats.includes(h.id));
 if(!threatened.length)return false;
 b.event({type:'tactical-result',kind:'evade',actor:threatened[0],source,targets:threatened,label:'Evaded'});return true;
}

export function reportTacticalGuard(b,source,actor,before,after,{dot=false,secondary=false}={}){
 const amount=Math.max(0,before-after);
 if(!marked(b)||dot||secondary||!(amount>0)||!Number.isFinite(amount)||!source||(b.enemies||[]).includes(actor)||!(b.heroes||[]).includes(actor)||!(b.enemies||[]).includes(source))return false;
 b.event({type:'tactical-result',kind:'guard',actor,source,amount,label:'Guard held'});return true;
}

export function reportArmorBreak(b,source,actor,before){
 if(!marked(b)||!(before>0)||actor?.armor!==0||!live(actor)||!(b.enemies||[]).includes(actor)||!(b.heroes||[]).includes(source))return false;
 b.event({type:'tactical-result',kind:'armor-break',actor,source,label:'Armor broken'});return true;
}

/** Only the new optional fields are checked; unmarked historical saves do
 * not acquire an opening or have their current timers recomputed. */
export function validEncounterTempo(context,enemies=[],heroes=[]){
 const marker=context?.encounterTempo;if(marker===undefined)return true;
 if(!marker||Array.isArray(marker)||marker.version!==1)return false;
 const ids=new Set(heroes.map(h=>h.id));
 return enemies.every(e=>(e.encounterOpening===undefined||typeof e.encounterOpening==='boolean')
  &&(e.intent?.tacticalThreats===undefined||Array.isArray(e.intent.tacticalThreats)&&e.intent.tacticalThreats.length<=7
   &&new Set(e.intent.tacticalThreats).size===e.intent.tacticalThreats.length&&e.intent.tacticalThreats.every(id=>ids.has(id))));
}
