/**
 * Equipment appearance contract shared by portraits, expedition and combat.
 * This produces a declarative replacement plan, NOT pasted artwork.
 * Renderers must report unsupported rigs rather than silently overlay clothing.
 */
export const VISUAL_SLOTS = Object.freeze(['head','chest','arms','hands','legs','feet','mainHand','offHand']);
const ALIASES = Object.freeze({helmet:'head',body:'chest',armor:'chest',gloves:'hands',boots:'feet',weapon:'mainHand',shield:'offHand'});
const normalizeSlot = slot => ALIASES[slot] || slot;
const own = (obj,key) => Object.prototype.hasOwnProperty.call(obj,key);

export function resolveGearAppearance({characterId, equipment, manifest, rigId}={}) {
 if(typeof characterId!=='string'||!characterId) throw Error('characterId required');
 if(!equipment||typeof equipment!=='object'||Array.isArray(equipment)) throw Error('canonical equipment required');
 const rig=manifest?.rigs?.[rigId];
 if(!rig || !rig.characters?.includes(characterId)) return {ready:false,reason:'unsupported-character-rig',characterId,rigId};
 const replacements={}; const hiddenBaseParts=new Set(); const missing=[];
 for(const [rawSlot,item] of Object.entries(equipment)){
  if(item==null)continue;
  const slot=normalizeSlot(rawSlot);
  if(!VISUAL_SLOTS.includes(slot))continue; // jewelry may affect stats without visible geometry
  if(own(replacements,slot)) throw Error('conflicting equipment aliases for '+slot);
  const itemId=typeof item==='string'?item:item.visualId||item.baseId||item.id;
  if(typeof itemId!=='string'||!itemId){missing.push({slot,reason:'missing-item-id'});continue;}
  const fit=manifest?.items?.[itemId]?.fits?.[rigId];
  if(!fit?.asset || !Array.isArray(fit.replaces) || fit.replaces.length===0){
   missing.push({slot,itemId,reason:'missing-fitted-replacement'});continue;
  }
  if(fit.replaces.some(part=>!rig.baseParts?.includes(part))){
   missing.push({slot,itemId,reason:'unknown-base-part'});continue;
  }
  replacements[slot]={itemId,asset:fit.asset,anchor:fit.anchor||slot,scale:fit.scale??1};
  fit.replaces.forEach(part=>hiddenBaseParts.add(part));
 }
 // Never render a partial costume as though it were successfully equipped.
 if(missing.length)return {ready:false,reason:'incomplete-fitted-gear',characterId,rigId,missing};
 return {ready:true,characterId,rigId,hideBaseParts:[...hiddenBaseParts].sort(),replacements};
}
