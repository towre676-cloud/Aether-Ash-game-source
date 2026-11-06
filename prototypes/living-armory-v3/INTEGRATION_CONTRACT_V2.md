# Ash & Aether — v2 live merge contract

## Truth hierarchy
The main game owns monster identity, environment data, encounter resolution, canonical currency, inventory, New Game Plus, audiovisual timeline and saves. The Armory may produce deterministic **reward descriptors** after battle, a **UI projection** after canonical state hydration, and **read-only** numerical equipment modifiers. It never starts combat or runs a second world/loot authority.

## Shared event
`{result:'victory',eventId:'stable-world-encounter-id',enemyId:'canonical-id',enemyLevel:23,regionId:'water',elite:false,boss:false,worldTier:2,enemySpec:{id:'canonical-id',name:'display name',body:'shell|horns|veil|prism|plate|choral|wings|sinew',region:'water',level:23,signature:'tide',shielding:0.44}}`. The host must persist the ID and supply canonical descriptors for real species.

## Host mode and loot transaction
`createAshAetherArmoryBridge({ownership:'host',armory,host:{hasCommittedLoot,commitLootOnce,getCanonicalEquipmentState,onLootDisplay,saveArmorySnapshot}})`.
`commitLootOnce` persists the result *once* transactionally. The Armory's return is not a second mint; in host mode this module's demo gear and coins must not be treated as the player's owned items. New crafting, rune, and loadout actions need corresponding canonical host transactions; otherwise use this package only as a standalone functionality study.

## Numerical signals
`readCombatContributions({attackElement,ground:{element,shielding,resonance,traction,organic,rooted,water},defender:{naturalShielding,harmonicShield},attack:{longRange}})`. The host applies `damageFactor`, `protection`, `guard`, `grip`, `runeResonance`, `eventHooks`, and detection multiplier with final existing caps. No duplicate cast or turn callbacks.

## Save
Namespaced `ash-aether-armory-v1` serialization (schema version 1 with additive v2 fields) coexists with the real campaign's other fields. The standalone uses a different localStorage key v2 and reads the old v1 demo key once if necessary. **Namespacing is not proof that two independent inventories have been reconciled**.

## Verification gates
- original pre-integration main campaign still playable
- exactly one winner/one award after duplicated victory event, restart, imported save
- user controls gear and compares true canonical host item stats
- every rune/craft/loadout transaction uses true host balances
- unknown monster with real anatomy gets appropriately biased loot
- material shielding and resonance sample genuine Ground Forge/ecology state
- no duplicate magical or physical resource minting from renderer, harvest or audio
- mobile gear tabs, character selection and recovery vault work with low-end graphics
- quest auto-run cannot suppress a required interactive boss reward claim
- build's test suite and actual campaign smoke tests green before publishing
