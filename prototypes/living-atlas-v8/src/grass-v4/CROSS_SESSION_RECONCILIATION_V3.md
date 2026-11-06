# Ash & Aether — Cross-session vegetation reconciliation (v3.0)

**Date:** 2026-10-29 · **Project:** Ash & Aether: Clay and Water · **Site:** `appgprj_6adf63724e5c8191bd55637b8ecd8d9a`

## Integration status — what is actually real

- This archive contains source-code changes, a fully offline browser QA lab using the *same bundled v3 JavaScript modules*, and 34 passing Node tests. Browser JavaScript execution and click-to-trample were checked in headless Chromium at desktop (1280×780) and mobile (390×844) layouts with no page-script errors.
- **The changes have NOT been inserted into the published A&A game.** The connected Library has a Site metadata/text projection, not editable game code, and the live site returns HTTP 401 from unauthenticated inspection. Nothing here demonstrates a live gameplay merge or measured frame rate.
- The Ground Forge v1 package (48 ground material types, 15 tests), Living World Laboratory (nine regions, 54 archetypes), and currently deployed playable A&A 5.16 were reported in parallel sessions. Their full implementation sources were not mounted in this session. **Their exact module APIs/registries were not assumed or fabricated.**
- The separate narrative/NG+ session reports later work with 1,004 passing checks; this is not proof it is deployed or included in v3 vegetation. Preserve its saves, scenarios, and scene handlers.

## Ownership rules for the final merge

| System | Authoritative owner | Vegetation interface | Forbidden integration shortcut |
|---|---|---|---|
| Camera, movement, avatar alignment | Playable game engine2 runtime | read world-coordinate actor pose, world-to-screen/scene projection | adding another movement loop or camera |
| Terrain, indoor floors, surfaces, water, wear | Ground Forge / host world | `materialAt`, `heightAt`, `obstacleAt`, `pathAt` | rebuilding ground textures in vegetation |
| Regional biomes, seasonal world, climate | World simulation / host | `regionAt`, `weatherAt`, `seasonAt` | independent seeded regional simulation |
| Plant growth and disturbance | Living Grass v3 | `.sample`, `.applyEvent`, `.tick`, `.snapshot` | visual-only grass with no persistent state |
| Creature discovery, movement, encounter resolution | Playable game + creature ecology / combat | gameplay derivatives: cover, traction, noise, shielding, fire, resonance | silently replacing encounter formulas |
| Inventory, currencies, harvest loot | Playable game | explicit event ID + returned `{kind, quantity}` | minting items inside renderer |
| Saves and New Game Plus | Playable game save/timeline engine | versioned vegetation snapshot in timeline save | substituting whole saves or mixing timelines |
| Graphics settings + accessibility | Playable game settings | renderer mode, `setVisualSettings` | changing concealment/battle outcomes with detail settings |

## Engine contract for the source-owning session

The real game must provide functions with the following *semantics*, not necessarily these names:

- `terrain.materialAt(x,z)`: an object describing the host's **real** material id plus values/tags (`organic`, `porous`, `waterRetention`, `moisture`, `hardness`, `wear`, `salinity`, `heat`, `grip`, `conductivity`, `resonance`, `shielding`, `tags`, `isInterior`, `waterDepth`, `vegetationAllowed`). This bridge knows no Ground Forge material IDs or values.
- `regions.at(x,z)`: `{biome:'orchard'}` or a host mapping to one of the 15 vegetation biomes. Record a mapping for every actual game region rather than reusing the prototype's illustrative 9-zone assignments.
- `terrain.heightAt`, `paths.softMaskAt`, `structures.blocksFoliageAt`, `weather.at`, `world.seasonAt`.
- `camera.projectGround` (Canvas2D) or a shared world Three.js scene and the Three.js namespace (GPU). World uses `(x,z)` horizontal and `y` vertical. Coordinate conversion must be validated against the avatar's feet on slopes and in camera pans.
- The host calls `bridge.applyEvent` only after a **confirmed** footfall, harvest, fire attack, or watering effect. Reward-bearing harvest events require a stable unique `eventId` across save/load.

Example shell; replace `game.*` references with verified source APIs before merging:

```js
import {createAAGameVegetationBridge} from './world/vegetation/aa-game-integration.mjs';
const grass = createAAGameVegetationBridge({
  THREE: game.graphics?.THREE,
  scene: game.graphics?.outdoorScene,
  renderMode: game.graphics?.outdoorScene ? 'gpu' : 'canvas',
  worldToScreen:(x,z,y)=>game.camera.projectGround(x,z,y),
  seed:game.save.timeline.worldSeed,
  timelineId:game.save.timeline.id,
  initialSave:game.save.timeline.vegetation ?? null,
  quality:game.settings.foliageQuality,
  reducedMotion:game.settings.reducedMotion,
  highContrast:game.settings.highContrast,
  groundOptions:{
    materialAt:(x,z)=>game.ground.materialAt(x,z),
    heightAt:(x,z)=>game.ground.heightAt(x,z),
    pathAt:(x,z)=>game.paths.softMaskAt(x,z),
    obstacleAt:(x,z)=>game.structures.blocksFoliageAt(x,z)||game.water.isDeepAt(x,z),
    regionAt:(x,z)=>({biome:game.regions.toGrassBiome(x,z),outdoor:game.scenes.isOutdoor(x,z)}),
    weatherAt:(x,z)=>game.weather.at(x,z),
    seasonAt:(x,z)=>game.world.seasonAt(x,z)
  }
});

// Host only: confirmed gameplay transactions, not frame proximity.
const onHarvestConfirmed = ({eventId,x,z,radius})=>{
  const result=grass.applyEvent({type:'harvest',eventId,x,z,radius});
  if(!result.duplicate && !result.blocked && result.quantity>0){
    game.inventory.awardValidForage(result.kind,result.quantity,eventId);
  }
};

// In the host authoritative world tick:
grass.tick(dt,{x:game.hero.worldX,z:game.hero.worldZ},{
  worldDay:game.save.timeline.day,wind:game.weather.wind,rain:game.weather.rain
});
const terrainEffect=grass.sample(game.monster.x,game.monster.z,{speed:game.monster.speed});
// The host ruleset decides how to apply terrainEffect.combined.

// Save only vegetation under its own namespaced key:
game.save.timeline.vegetation=grass.snapshot();
// Scene exit: grass.dispose();
```

**For Canvas2D:** call `grass.draw(ctx,{bounds,camera...,dt,wind,player,pixelScale})` between the ground and actor/particle layers. Never draw Canvas grass simultaneously with GPU grass. For indoor scenes, supply `region.outdoor=false` or a complete interior mask; grass will be excluded.

## What v3 implemented

1. **Ground/vegetation coupling:** `ground-forge-compat.mjs` accepts independently named material samples and classifies suitability, moisture, salt, wear, flooding, path compaction, road/floor exclusions, heat, fire fuel, grip, electrical conductivity, shielding, and resonance. It caches a single coordinate sample across all grass callbacks; call `.invalidate()` after the host changes weather or material state (v3 automatically invalidates during tick and event application).
2. **Dynamic seasonal ecology:** the 15 habitat profiles and 16 species respond to `seasonAt` and the material suitability factor, not only static settings. This stops grass clipping through hard floors, sealed surfaces, and deep water; never infer floor geometry from a decorative sprite.
3. **Nonlinear combined gameplay:** `evaluateVegetationMaterialEffects()` returns bounded cover, noise, grip, fire, electrical transfer, resonance and shielding derived from the same physical sample. They are **modifiers**, not a clandestine replacement for A&A's encounter balancing.
4. **Save isolation:** v3 bridge snapshots include the original v2 disturbance cells plus timeline ID, seed and a bounded event journal. It supports v2 bare grass-state snapshots. Missing vegetation saves are left unchanged, keeping the host's legacy-save migration in charge. NG+ starts a new world state unless a matching snapshot is deliberately restored.
5. **Event idempotency:** stable unique `eventId` prevents duplicate harvest rewards after reload; invalid input rejects without poisoning the save. The host still owns actual item minting and idempotence for inventory commits.
6. **Rendering parity and accessibility:** GPU Three.js and Canvas2D fallback derive gameplay from the same state, with identical samples in automated tests. Reduced motion suppresses wind and high-contrast mode adds Canvas strokes or GPU shader contrast. Renderer quality never changes game calculations.
7. **Resource allocation correction:** GPU instanced-mesh maximum capacities use plausible species shares rather than the full tuft budget for all 16 families. This reduces buffer reservation; it is not an FPS measurement.
8. **Offline QA lab:** `reconciliation-lab-offline.html` embeds v3 runtime, not a mock. It can show seasonal/ecological effects, material factors, trampling, fire, harvest, NG+ timeline isolation and JSON export/import with no server or dependency. The eight preset material profiles are **examples only**, not Ground Forge's 48 actual records.

## Required game-level review before declaring integration complete

- Test release 5.16's **all seven lead characters** and early monster encounters; verify grass does not hide attack tells, objective markers, doors, quest affordances, or accessibility cues.
- Use `/game/?dev=1` in an authenticated browser to jump through late chapters, regions, boss arenas, interiors, towns and NG+ timelines. Confirm no foliage above roofs, cutting through floor geometry, blocking doors, or floating off slopes.
- Reuse the game's actual guidance, camera and movement logic (5.15/5.16); verify Edge laptop and Android Chrome under camera travel, UI overlays, rain/fog and combat, with instrumentation for CPU spikes, memory and real frame time. No such device performance has been established here.
- Load the **real** Ground Forge registry and verify all 48 material classes, the actual Living World Laboratory's nine zones and 54 creature archetypes, and every host-provided map mask. The synthetic contract tests are not evidence that those datasets have been loaded.
- Preserve creature ecological behavior, monster shielding, world interactions, learned abilities, item rewards and economy from the source-owning sessions. Add modifiers only through their authoritative rules and balance validation.
- Verify save compatibility with the previously published game, 5.16's QA routes, NG+ new seeds, and cross-save import/export. Test inventory commit idempotence even if the player quits between vegetation and inventory writes.
- After the authenticated Site source merge, run existing A&A unit/QA suite and manually test launch-quality appearance at high and low settings. Only then release/publish and advertise completion.
