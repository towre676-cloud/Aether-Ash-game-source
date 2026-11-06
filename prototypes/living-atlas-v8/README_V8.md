# Ash & Aether — Living Atlas v8: The World Is the Encounter

**Status: integrated and playable in the standalone Atlas laboratory; NOT deployed to the actual A&A Site.** The Site's Library record identified project `appgprj_6adf63724e5c8191bd55637b8ecd8d9a` at source version 22, but this environment had no authenticated source editing capability or corresponding writable GitHub repository. We have deliberately not overwritten the live campaign.

## Run it

1. Extract the directory; double-click `RUN_WINDOWS.bat` on Windows, then open `http://localhost:8000/` in Edge.
2. For the Three.js scene use `index.html` through the local server. Three.js 0.180 loads from jsDelivr and requires network access.
3. If the CDN/WebGL environment fails, use `http://localhost:8000/ENCOUNTER_QA_V8.html` for a Canvas2D, offline asset-free, real-gameplay encounter lab. It imports the same numerical engine as the 3D viewer, but it is not the published game and its map is a debugging view.

## Implemented in the game prototype

- **One spatial identity per visible creature:** `region:species:spawn-index`; actors share authoritative coordinates between the rendering layer and battle system, not a menu species selector. Every identity belongs to an actual wildlife cohort. The renderer may interpolate only cosmetic motion between accepted simulation steps.
- **Click or select a visible creature**, then approach, observe, engage or retreat. All approaches use pathfinding and six or fewer real footfalls per action; no teleports, bridges remain blocking until repaired, and the creature can move between actions.
- **Proximity gates**: observe at up to 7m, combat only at 3.1m (with terrain visibility/route constraints). Canonical encounter identity is saved and validated; the player may not fight a remote target by clicking an unrelated point on the map.
- **Meaningful battle geometry:** incoming damage sees the player's actual defensive surface. Damage and elemental effects see the creature's actual terrain, material and shielding. A defeated individual is retired from the visible registry, while the real wildlife cohort decreases and later recovers naturally.
- **Old-save compatibility**: optional `residentTickV8` and `retiredResidentsV8` fields extend existing v3 saves without changing the root schema; v7 snapshots without them still restore. Invalid, forged or future-tick state is rejected.
- **Living Grass v5 active:** improved vegetation variation and ecotones; v4 fallback if the v5 renderer cannot initialize. These are visual tiers only; encounter, water, economy and resource calculations remain unchanged.

## Verification

```sh
node --test tests/*.test.mjs src/ground/tests/*.test.mjs src/grass/*.test.mjs src/grass-v3/*.test.mjs src/grass-v4/*.test.mjs src/grass-v5/*.test.mjs src/acoustic/tests/*.js src/acoustic-v2/tests/*.js
python -m unittest discover -s production/tests -p 'test_*.py' -v
node scripts/replay.mjs
node scripts/ecology-replay-v7.mjs
node scripts/bench-residents-v8.mjs
```

The original ten-quest numerical replay is unchanged. Browser WebGL/Edge/Android visual acceptance was **not** completed in this session (the Chromium screenshot attempt timed out, and the Three.js CDN was inaccessible in this environment); CPU-only test results must not be described as production FPS.

## The production adoption boundary

The real Site owns the existing campaign, save format, graphics engine, world coordinates, guided tasks, and canonical combat. `production/RESIDENT_BRIDGE_V8.mjs` is the safe host adapter: it validates an actual host actor ID, region, position, presence, collision/line-of-sight, and event ID, then calls the real game's guided movement and combat functions. It never creates loot, quests, battle damage or world state itself.

`production/PRODUCTION_V8_STAGER.py` can **stage only that adapter module** into a verified export of the editable production source, with dry-run SHA fingerprint and collision protection. It intentionally does not wire the host, alter its index or publish the project. See `PRODUCTION_GATE_V8.md` for the mandatory release conditions. A staging success is not a release receipt.

## Other sessions reconciled

- Living Grass v5: active in the standalone Three.js renderer; v5 suite included, v4 fallback retained.
- Acoustic World v4: 512 packaged cues with battle telegraphs and auditory guard mechanics; latest package inspected, **not** made the default world score in Atlas because it requires mapping the actual canonical boss and audio event bus. Atlas v8 continues using the tested v2 integration rather than duplicating rewards/hearing.
- Living Armory v2: inspected its canonical-host inventory contract; **not** enabled as a second inventory or loot authority. Integration requires actual production item IDs and atomic `commitLootOnce` transactions.
- Ground Forge: the 48-material system is retained in the Atlas engine; action effects and battle surface sampling remain tied to real material state.
