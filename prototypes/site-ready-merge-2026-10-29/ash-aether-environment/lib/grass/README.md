# Ash & Aether: Clay and Water — Living Grass v2.0

**Status (29 October 2026):** Standalone code and offline interactive inspection preview completed and tested. **NOT deployed to the ChatGPT Site**; its public URL currently responds HTTP 401 to the available web tools. The connected Library exposes only the published-text projection of Site `appgprj_6adf63724e5c8191bd55637b8ecd8d9a`, not the editable JavaScript game. Do not describe this package as a live-game installation.

## Open it right now

- **`preview-offline.html`** — double-click/open directly in a browser, including phones. No internet, npm, WebGL, Three.js or server required. Pan horizontally, adjust wind, sunlight, grass density, and habitat. Walk, trample, burn, water and advance the season. This is a responsive **Canvas2D artistic inspection preview**; its visible events are illustrative rather than the authoritative persistence engine.
- **`demo.html`** — full GPU/Three.js exploratory scene, for a WebGL-capable browser. From this directory run `python -m http.server 8765`, open `http://localhost:8765/demo.html`. This variant loads Three.js 0.180.0 via CDN, and includes a real persistent disturbance coordinator, player bending, harvest/ignite/watering, terrain variation, atmosphere and 15 biomes.
- **`npm test`** — runs all Node tests; no npm install required. 17 tests passing at package time. These are deterministic and lifecycle / offline-preview tests, **not** a browser GPU benchmark or visual QA of the actual game.

## What changed over v1

### Sixteen plant species families, fifteen biomes

- Original eight: meadow, rye, clover, sedge, reed, dry straw, frost grass, aether.
- New eight: bentgrass, bluegrass, fern, heather, rush, lavender, wild wheat and nettle.
- The renderer now includes custom branching geometry for clover leaflets, fern pinnae and nettle leaves, as well as seed heads on reeds, rye, wheat and other stalks. Colors and scale vary **per clump**, not per tile.
- Existing eight biomes remain; seven added: woodland, riverbank, moor, alpine, ruins, farmlands and bog.
- Soil shade, water, road proximity, temperature/season, terrain height and species mixing influence where vegetation appears. The procedural density patches are smooth, warped and rooted in world-space coordinates: revisiting them does not reroll positions.

### The world remembers physical changes

New `grass-state.mjs` provides a deterministic **persistent vegetation-state machine**, separate from the renderer:

- `trample(x,z,{radius,mass})` changes local health and flattening; wind shader also bends leaves while an actor crosses them.
- `harvest(x,z,{radius,effort,biome})` reports a biome-appropriate material and quantity and reduces growth. The host game must accept inventory rewards; this module does not silently mint currency/items.
- `ignite(x,z,{radius,strength,moistureAt})` creates bounded burn damage, reduced by wet soil and watering. It is **not** a full wildfire propagation system.
- `water(x,z,{radius,amount})` helps prevent ignition and reduces scorching.
- `advanceDays(days)` regrows and recovers areas with different recovery rates; damaged plots survive serialization and reloads.
- `serialize()` / `restore(save)` use versioned, sorted world cells and validate seed, cell size, bounds, numbers and monotone time. Store the result in the *host game's authoritative save*, per timeline and save-slot.

### Rendering / hardware

- `grass-renderer.mjs`: instanced Three.js vegetation, per-instance colors and orientation, shared GPU wind shader, six local footprint impulses, world-space deterministic vegetation distribution, fog/tint/rain controls, a mobile preset and clean disposal.
- `canvas-grass-fallback.mjs`: a dependency-free 2D/2.5D vegetation compositor for Android and browsers without usable WebGL. It uses the **same ecology** and can share `growthAt` state. Draw *after terrain and before actors* using actual game camera world-to-screen projection.
- `living-landscape.mjs`: game-facing coordinator connecting the persistent state to Three.js visuals and the sampled stealth/movement/fire/forage properties. Supports refresh throttling, save/reload and graphics quality changes.
- Existing GPU density caps: low 9,000, medium 18,000, high 38,000, ultra 65,000 **tufts** (not blades). Real density depends on region and device. These caps are NOT claims of maintained FPS.

## Host-game adapter: Three.js (the actual A&A game must supply these callbacks)

```js
import { createLivingLandscape } from './living-landscape.mjs';

const foliage = createLivingLandscape(THREE, worldScene, {
  seed: save.timeline.worldSeed,
  initialSave: save.timeline.vegetation ?? null,
  initialDay: save.timeline.elapsedDays,
  quality: settings.isMobile ? 'low' : 'medium',
  origin: { x: hero.worldX, z: hero.worldZ },
  terrainHeight: (x,z) => terrain.heightAt(x,z),
  biomeAt: (x,z) => regions.biomeAt(x,z),
  trailAt: (x,z) => trails.softMaskAt(x,z),
  obstacleAt: (x,z) => buildings.blocksFoliageAt(x,z) || water.isDeepAt(x,z),
  moistureAt: (x,z) => watershed.moistureAt(x,z),
  shadeAt: (x,z) => canopy.shadeAt(x,z),
});

// In the game tick, only when the world scene is active:
foliage.update(deltaSeconds, { x: hero.worldX, z: hero.worldZ },
               { worldDay: save.timeline.elapsedDays });

// These events are called by the authoritative game simulation:
if (hero.didMakeFootfall) foliage.step(hero.worldX, hero.worldZ, .6);
if (attack.ignitedFoliage) foliage.ignite(attack.x, attack.z, {
  radius: attack.radius,
  moistureAt: watershed.moistureAt
});
if (skill.harvestConfirmed) {
  const reward = foliage.harvest(skill.x, skill.z, { radius: skill.radius });
  inventory.applyValidatedForage(reward); // Host-owned inventory method
}

const terrainStats = foliage.getGameplay(monster.x, monster.z);
monster.concealment = terrainStats.concealment;
monster.groundMovementCost = terrainStats.movementCost;
monster.fireSpreadPotential = terrainStats.fireSpreadPotential;

// On save:
save.timeline.vegetation = foliage.serialize();
// On graphics-option change:
foliage.setQuality(newQuality);
// On scene unload:
foliage.dispose();
```

**These game callbacks are illustrative seams, not verified function names in the existing A&A source.** A real adapter must wire the existing game's coordinate convention and camera, and ensure save serialization, state changes and inventory events have a single authoritative owner.

## Host-game adapter: Canvas2D (no Three.js required)

```js
import { createCanvasGrassFallback } from './canvas-grass-fallback.mjs';
import { createVegetationState } from './grass-state.mjs';
const vegetation = createVegetationState({ seed: worldSeed });
const grass2d = createCanvasGrassFallback({
  seed: worldSeed, quality: 'low',
  biomeAt, trailAt, obstacleAt, terrainHeight,
  growthAt: (x,z) => vegetation.sample(x,z),
  worldToScreen: (x,z,y) => camera.projectGround(x,z,y),
});
// Between the ground and actor draw passes:
grass2d.draw(groundCanvasContext, {
  bounds: camera.visibleWorldRect(), dt: deltaSeconds,
  wind: weather.windStrength, player: { x: hero.x, z: hero.z },
  pixelScale: camera.pixelsPerMetre,
});
```

## Test/benchmark expectations before shipping

1. Render outdoor, road edges, stone, water banks and interior boundaries with actual map masks — no random indoor vegetation or grass cutting through buildings.
2. Confirm grounded foot placement across slopes and camera angles, avatar occlusion, and every battle-animation transition.
3. Test Edge on the user's laptop and Chrome on representative Android hardware, including memory pressure, shaders, patch-rebuild hitch, rain, camera motion and scene teardown.
4. Test gameplay events and saves across new game plus/timeline divergence, combat, enemy AI, harvest actions, scene exits and reload.
5. Compare 2D fallback and GPU overlay alignment against identical game world coordinates; disable one when another is active to prevent double-rendering.
6. Use persistent save schema versioning and migrations when the real save game is integrated; never silently overwrite existing saves.

## Package files

| File | Purpose |
|---|---|
| `grass-ecology.mjs` | deterministic biome/soil/grass growth and gameplay values |
| `grass-renderer.mjs` | high density instanced Three.js vegetation |
| `grass-state.mjs` | persistent footprint, harvest, fire, water, regrowth world state |
| `living-landscape.mjs` | game-facing coordinator coupling visuals to world state |
| `canvas-grass-fallback.mjs` | engine-independent Canvas2D 2.5D fallback |
| `demo.html` | hosted Three.js interactive outdoor scene |
| `preview-offline.html` | zero-dependency interactive art preview |
| `*.test.mjs` | Node regression, state, renderer-mock and offline-preview tests |
| `INTEGRATION_CHECKLIST.md` | focused cross-session handoff and acceptance checks |

These are newly authored files. Three.js remains a separately licensed, MIT open-source dependency; the offline preview is dependency-free.
