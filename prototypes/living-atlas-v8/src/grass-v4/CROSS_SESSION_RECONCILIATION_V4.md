# Ash & Aether Living Grass v4 — Parallel-session merge contract

**Date:** 2026-10-29  •  **Private Site:** `appgprj_6adf63724e5c8191bd55637b8ecd8d9a`  •  **Deployment:** NOT DONE

## Reconciliation with newest parallel updates

Other sessions report a newer **5.18** playable A&A release, following 5.17's narrative/quest improvements. Their latest published checkpoint cites 1,051 tests across 143 modules, 124 motifs/materials, 122 mappings, 907 tree sites and 77 camps. A second session independently prepared a Ground Forge merge patch with 62 passing tests; Ground Forge's 48 ground material *identities* and this game's new visual motif records are not automatically the same registry. A further audio session reports 244 audio assets (up from 132) plus sound-ground interactions. These statuses are cross-session reports, not reproducible validations from this v4 directory.

**This archive must be merged additively into the actual latest source, not copied over the game's terrain, scene definitions, movement, encounters, economy, NG+, save system or sound engine.** The live project source and authenticated Site publishing access were not available here.

## Ownership / data flow

| Owner | Supplies to vegetation | Reads from vegetation | Must never be replaced |
| --- | --- | --- | --- |
| Playable A&A 5.18 (reported) | authoritative frame delta, world coordinates, outdoor scene, camera, region, save and event IDs | `sample().gameplay`, `sample().combined`, `snapshot()` | movement, camera, quest/encounter/battle rules, inventory, save schema |
| Ground Forge | genuine material IDs and material facts, floor/road masks, cracks, wetness, flooding | foliage tint, cover and material effects | its PBR textures/UVs and surface simulation |
| Living World | region weather, wind, seasonal climate, ecological damage, creature exposure | plant cover, forage potential and shielding coefficients | creature AI, camp interactions and encounter schedules |
| Audio system | host footstep/cast impact events | `footstepNoise`, `resonanceTransfer` and vegetation type | sound scheduler, audio asset indices, spatial sound engine |
| NG+ / timeline engine | timeline seed, persistent host save and scene transitions | namespaced vegetation v4 save | character story timelines, full-save import/export |
| Vegetation v4 | no new host-owned facts | host provides canonical facts | vegetation cells and meshes only |

## Example adapter against *verified* game source

```js
import {createAAGameVegetationBridge} from './vegetation/aa-game-integration.mjs';
// Replace all `host.*` placeholders ONLY with APIs verified in the current game.
const foliage=createAAGameVegetationBridge({
  THREE:host.renderer.THREE,scene:host.scenes.outdoors,
  renderMode:'gpu',quality:host.settings.foliageQuality,
  autoQuality:host.settings.adaptiveFoliage,
  minimumQuality:'low',maximumQuality:'ultra',targetFrameMs:33.3,
  reducedMotion:host.settings.reducedMotion,highContrast:host.settings.highContrast,
  timelineId:host.save.timeline.id,seed:host.save.timeline.seed,
  initialSave:host.save.timeline.vegetation ?? null,
  groundOptions:{
    materialAt:(x,z)=>host.ground.materialAt(x,z),
    regionAt:(x,z)=>({
      biome:host.world.grassBiomeAt(x,z),
      biomeMix:host.world.grassBiomeWeightsAt?.(x,z),
      outdoor:host.world.isOutdoor(x,z)}),
    heightAt:(x,z)=>host.ground.heightAt(x,z),
    pathAt:(x,z)=>host.paths.softMaskAt(x,z),
    obstacleAt:(x,z)=>host.world.blocksVegetationAt(x,z),
    weatherAt:(x,z)=>host.weather.at(x,z),
    seasonAt:(x,z)=>host.world.seasonAt(x,z)
  }
});
// Host subscribes to confirmed, unique gameplay transactions only.
const harvestResult=foliage.applyEvent({
  type:'harvest',eventId:host.events.currentUniqueTransactionId,
  x:host.hero.x,z:host.hero.z,radius:1.4
});
if(harvestResult.quantity && !harvestResult.duplicate)
  host.inventory.grantIdempotently(harvestResult.kind,harvestResult.quantity,
                                   host.events.currentUniqueTransactionId);
// Host's existing rendering/update loop, NO new movement/camera loop:
foliage.tick(host.frameDeltaSeconds,{x:host.hero.x,z:host.hero.z},
  {worldDay:host.save.timeline.day,wind:host.weather.wind,rain:host.weather.rain});
// After Ground Forge or host changes region, material, floor mask or flood:
foliage.notifyTerrainChanged();
// Save with the authoritative timeline (atomic with inventory rewards):
host.save.timeline.vegetation=foliage.snapshot();
```

## Critical safety boundaries

1. **One coordinate system:** match avatar feet, terrain slope (+Y vertical), camera perspective and interior occlusion before enabling anything at scale. Outdoor grass never enters sealed interior, inaccessible room, floor, bridge, lake, wall or boss telegraph region. GPU and Canvas must render *behind* correct actors/object layers.
2. **One authoritative region definition:** `biomeMixAt` accepts optional named weights only from the real region/ground classifier. If absent, v4 keeps existing discrete biome classification; no second weather/biome randomizer.
3. **One gameplay state:** visual quality, wind animation and high contrast must not modify `sample()` outcomes. All creature stealth, shielding, fire, water, electrical and audio mechanics must read v4 numerical samples and apply them through the game's existing rules, not duplicate encounter logic.
4. **One reward ledger:** v4 durable receipt IDs protect vegetation reward proposals, but does not atomically award items. The host's save and inventory transaction must remain the final arbiter even after interruption or partial persistence.
5. **One timeline at a time:** preserve timeline-specific RNG seed and vegetation save. `switchTimeline()` stores each timeline's vegetation history and restores it when returning. V2/v3 vegetations can migrate, but legacy replay protection was bounded by older saves' existing journal.
6. **No blind visual override:** real art's 124 motifs/materials and existing tree/camp placement must be reconciled with Ground Forge's 48 material IDs, never overwritten by v4's illustrative eight demo profiles.

## QA / deployment gates

Local test suite: **45/45 pass** in Node, including 11 v4 regressions. Offline Chromium inspection: desktop 1366x768 and mobile 390x844 pass visual interactions without JavaScript page errors. These are *local* checks. Source integration requires: latest game build tests; physical laptop and Android frame-time profiling; real WebGL compile on supported browsers; all seven character starts; release 5.18's camera and guide tab; material/forest/flood/world masks; 907 tree sites and 77 camps (reported) no clipping; every indoor and outdoor encounter; boss attack telegraphs; NG+ timeline saves; audio event consistency; no duplicate items; fallback when WebGL is unavailable.

**Current blocker:** Live Site returns HTTP 401 without authenticated editor source. No source merge, release, or publication was performed by this session. Do not interpret this handoff or local HTML preview as a deployed result.
