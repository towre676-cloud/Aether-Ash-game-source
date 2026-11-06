# A&A Living Armory v3 — Source-owner merge contract

This package **does not modify** the deployed Site. It supplies source modules, numerical math, a read-only canonical equipment adapter and a standalone QA reference. Do not replace the game's renderer, its voice/dialogue, encounter engine, loot ledger, pathing, save manager, skill tree or New Game Plus rules.

## Order of operations

1. Recover the editable production game's actual source. Confirm its commit/build ID; map existing gear IDs, material resources, equipment slots, timeline IDs and game events. Reconcile concurrent gameplay/vegetation/audio updates without overwriting their APIs.
2. Choose **one loot owner**, preferably the host. Create `createAshAetherArmoryBridge({ownership:'host',host,armory})` only once per timeline. Supply `hasCommittedLoot(eventId)` and an atomic, durable `commitLootOnce(eventId, record)` that persists the gear, resources and the event ledger as a single transaction.
3. Call `onEncounterResolved()` only after host battle victory. Pass stable world event ID and canonical monster/species/body, region, level, tier. Never call it from visuals, corpse rendering or exploration spawns. Idempotency must survive concurrent double delivery and crashes.
4. Supply `getCanonicalEquipmentState() => ({gear:{mainhand:item,head:item,...}})`. Each equipped item must have valid `{slot,stats,element,runes,...}` translated to this package's item schema. `readCombatContributions()` now returns `{ready:false,reason}` if host equipment is absent or untranslatable. **Do not apply these modifiers unless `ready===true`.** Host reads are computed without mutating the prototype gear projection.
5. Route canonical `ground:{element,shielding,resonance,traction,organic,rooted,water}`, `defender:{naturalShielding,harmonicShield}`, `attack:{longRange}`, and `attackElement` into `readCombatContributions`; apply `damageFactor`, `protection`, `guard`, `grip`, `harmonyAttack`, `harmonyPierce` and `eventHooks` through the real game's damage middleware and its own final caps. Do **not** apply `harmonyAttack` or `harmonyPierce` twice: they have already been folded into `damageFactor` and `shieldBroken`.
6. In host-owned mode, all UI actions—equip, move, salvage, temper, engraving, socketing, forging and loadout switching—must invoke atomic host transactions, or remain **disabled**. The standalone uses its own demo currency/inventory; these are not canonical.
7. Namespaced save key remains `ash-aether-armory-v1` for compatibility. New item imprint field is additive; older saves are accepted. Do not overwrite campaign saves or silently carry prototype items into NG+. For each timeline, preserve a unique, durable reward ledger.
8. Smoke test 1× world pickup, 1× corpse claim, 1× boss chest, two simultaneous victory events, restart mid-commit, inventory full/overflow, craft/reforge, save/import, 390px touch, low graphics, multiple main characters, and NG+ world transitions.

## Provenance and correctness limits

The `getCanonicalEquipmentState` translator must use the actual live gear format; fields documented here are contracts, **not verified names of production APIs**. The prototype's demonstrated enemy fight button stands in for an already-resolved victory. The field terrain values in the demo are examples, not live Ground Forge samples. Graphics settings must never affect combat output. No verified source write or Site deployment took place in this work session.
