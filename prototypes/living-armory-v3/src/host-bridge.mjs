import {Armory} from './armory.mjs';
/**
 * Integration contract for the REAL Ash & Aether game, whose APIs cannot be
 * inspected in this session. All names on `host` are injected callbacks, never
 * assumed global game functions. The host must own encounter truth and saves.
 *
 * Two mutually exclusive equipment ownership modes:
 * - host: existing game inventory, currency, and loot transactions stay canonical.
 *   Host must supply hasCommittedLoot(eventId) and commitLootOnce(eventId, reward).
 *   That commit operation MUST be atomic and persistently idempotent by eventId.
 *   Engine only creates reward descriptors; no second item/currency mint occurs.
 * - armory: this module owns these resources and gear; the host must suppress
 *   any competing equipment/material award for these event IDs.
 */
export function createAshAetherArmoryBridge({host,armory=new Armory({seedStarter:false}),ownership='host'}={}){
 if(!host||!['armory','host'].includes(ownership))throw Error('Host and explicit ownership required');
 if(ownership==='host'&&(typeof host.hasCommittedLoot!=='function'||typeof host.commitLootOnce!=='function'))throw Error('Host-owned mode needs persistent hasCommittedLoot and atomic commitLootOnce callbacks');
 const normalize=e=>{
  if(!e||typeof e.eventId!=='string'||!e.eventId)throw Error('The live encounter must supply a stable eventId');
  if(e.result!=='victory')return null;
  if(!e.enemyId||typeof e.enemyId!=='string')throw Error('Missing enemyId');
  return {eventId:e.eventId,enemyId:e.enemyId,region:e.regionId,level:e.enemyLevel,elite:e.elite,boss:e.boss,enemySpec:e.enemySpec??null,difficulty:e.worldTier??1};
 };
 const bridge={
  armory,ownership,
  /** Call only after the canonical combat engine has resolved the fight. */
  async onEncounterResolved(e){
   const args=normalize(e);if(args===null)return {ok:false,reason:'not-a-victory'};
   if(ownership==='armory'){
    const claimed=armory.claimEncounter(args);
    if(claimed.ok){host.onLootDisplay?.({eventId:e.eventId,reward:claimed});host.saveArmorySnapshot?.(armory.snapshot())}
    return claimed;
   }
   // The host is the only source of truth for successful awards. This remains
   // safe after crashes even when the UI's ephemeral ledger was not saved.
   if(await host.hasCommittedLoot(e.eventId))return {ok:false,reason:'already-claimed'};
   const reward=armory.previewEncounter(args);
   const record={schema:'aa-armory-loot/v1',source:'resolved-encounter',eventId:e.eventId,
     encounter:{enemyId:reward.enemyId,enemy:reward.enemy,region:reward.region,level:reward.level},
     equipment:reward.equipment.map(item=>structuredClone(item)),resources:{...reward.resources}};
   const committed=await host.commitLootOnce(e.eventId,record);
   if(committed!==true)throw Error('Canonical host loot transaction was not confirmed');
   armory.state.claimedEvents[e.eventId]={external:true,enemyId:reward.enemyId};
   armory.state.defeated??={};armory.state.discovered??={};armory.state.defeated[reward.enemyId]=(armory.state.defeated[reward.enemyId]||0)+1;for(const i of reward.equipment){armory.state.discovered[i.baseId]=(armory.state.discovered[i.baseId]||0)+1;if(i.unique)armory.state.discovered[i.unique]=(armory.state.discovered[i.unique]||0)+1;}
   armory.state.pity=reward.equipment.some(x=>['epic','legendary','mythic'].includes(x.rarity))?0:armory.state.pity+1;
   host.onLootDisplay?.({eventId:e.eventId,reward:record});
   host.saveArmorySnapshot?.(armory.snapshot());
   return {ok:true,owner:'host',reward:record};
  },
  /** Read-only numerical inputs. Host combat code decides what to do with them.
   * In host mode, never apply prototype equipment bonuses to a real character.
   * A canonical equipment projection MUST be supplied by the live game.
   */
  readCombatContributions({attackElement,ground,defender,attack}={}){
   let previous=null;
   if(ownership==='host'){
    if(typeof host.getCanonicalEquipmentState!=='function')return {ready:false,reason:'missing-canonical-equipment'};
    const projection=host.getCanonicalEquipmentState();
    if(!projection||!projection.gear||typeof projection.gear!=='object'||Array.isArray(projection.gear))return {ready:false,reason:'invalid-canonical-equipment'};
    const slots=Object.keys(armory.state.gear);
    if(Object.keys(projection.gear).some(slot=>!slots.includes(slot)))return {ready:false,reason:'unknown-host-equipment-slot'};
    for(const [slot,item]of Object.entries(projection.gear)){
     if(item===null||item===undefined)continue;
     if(!item||typeof item!=='object'||!item.stats||typeof item.stats!=='object'||typeof item.slot!=='string'||(slot.startsWith('ring')?'ring':slot)!==item.slot||Object.values(item.stats).some(n=>!Number.isFinite(n)))return {ready:false,reason:'untranslated-canonical-item'};
    }
    previous=armory.state.gear;
    armory.state.gear={...Object.fromEntries(slots.map(slot=>[slot,null])),...projection.gear};
   }
   try{
    return {ready:true,...armory.combatModifiers({attackElement,
    terrainElement:ground?.element,terrainShielding:ground?.shielding,terrainResonance:ground?.resonance,
    environmentGrip:ground?.traction,enemyShielding:defender?.naturalShielding,
    organicTerrain:Boolean(ground?.organic),rootedTerrain:Boolean(ground?.rooted),waterTerrain:Boolean(ground?.water),
    harmonicShield:Boolean(defender?.harmonicShield),longRange:Boolean(attack?.longRange)})};
   } finally{if(previous!==null)armory.state.gear=previous;}
  },
  /** Separate namespaced save; never overwrite a canonical campaign snapshot. */
  namespacedSave(){return {'ash-aether-armory-v1':armory.snapshot()}},
  restoreFromCampaignSave(save){const data=save?.['ash-aether-armory-v1'];if(!data)return false;armory.load(data);return true},
  getEquipmentUIState(){if(ownership==='host'){if(typeof host.getCanonicalEquipmentState!=='function')return {owner:'host',synced:false,reason:'Host must supply canonical equipment state'};return {owner:'host',synced:true,...host.getCanonicalEquipmentState()};}return {owner:'armory',synced:true,gear:armory.snapshot().gear,inventory:armory.snapshot().placements,stats:armory.stats(),sets:armory.setProgress()}},
 };
 return bridge;
}
