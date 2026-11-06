# Ash & Aether — Ground Forge / Non-Grass Ground and Floor Pass

> Status: independently built, tested, and packaged **for integration**. This package has **not** been deployed to the active ChatGPT Site and is not a claim that the current production game was modified. Its engine wrapper accepts the existing `THREE` namespace, `scene`, active floor plan, save manager, and battle events.

## Why this pass exists

The game's existing *Living Meadow* research uses a continuous soil layer under its procedural grass. That is a good basis for vegetation but **does not solve floor design**: built streets, shingle beaches, flooded chambers, mills, temples, workshops, burned roads and homes each require different geomorphology, construction semantics, lighting response and gameplay behavior. Non-grass environments cannot be a single brown or gray rectangle with random decorative pots.

## What has been built

- **48 named, distinct substrate identities**: 12 each for Ash, Water, Clay and Aether, as opposed to arbitrary biome recolors. Distinct stone, cobble, granule, clay, brick, herringbone, wood, ceramic, metal, enamel, mosaic, crystal, glass, fabric and mud synthesis procedures, each with geography/architecture justification and a game-semantic reward/clue.
- **Three maps per surface**: world-aligned, seeded color (albedo), computed normal maps and roughness maps; distinct micrograin, tile variation and macro-weathering. Adjacent map chunks agree at their shared color boundary when coordinates and seed match.
- **Story-aware material mapping**: stable room selection (chapel → celestial floor; kiln → kiln brick; cistern → seep tiles; inn → oak planks; dock → dockwood) and rectangle, ellipse and polygon authoring for thresholds, routes, and room footprints. No decorative random material swaps.
- **Localized environmental history**: `createNarrativeWearField` locates scuffs along chosen entrances and walking paths; humidity, moss, heat and deposit sources can be attached to drains, hearths, broken windows and waterlines. This is separate from random noise, so wear conveys readable story information.
- **Seven material physics parameters**: traction, noise, conductivity, permeability, heat, resonance and shielding. These inform movement cost, stealth, elemental contact, enemy reads, and environmental cover.
- **Persistent world state**: `GroundDynamics` stores cell wetness, heat, charge, phase, fracture and traffic. Moving leaves detectable traces; spells can flood, ignite, charge or crack floors; chain conduction, steam, icy footing, fractured cover, phase paths and revealing recordings have explicit thresholds; damage requires resources to repair. JSON-compatible save/load.
- **Three.js adapter**: `createGroundSystem(THREE,scene,...)` attaches a continuous ground mesh with a material using those texture maps, optional terrain elevation, bounded fading step decals and material sampling. No Three.js version is bundled, avoiding conflicts with the game's own renderer.
- **Interactive browser material studio**: `studio.html` showcases all 48 with rain, age, grazing light, deposits and elemental contact. Browser modules require local HTTP serving (not `file://`). It is a material preview, not a substitute for the existing game's full scene.
- **15 automated tests**: seeded determinism, all material maps, world-edge seams, room assignment, movement/impact, physical differentiation, state save/load, local diffusion and weathering.

## Files

- `ground-materials.mjs`: catalog and game-semantic surface properties
- `ground-synthesis.mjs`: world-aligned albedo/normal/roughness generator and authored region/wear helpers
- `ground-runtime.mjs`: Three.js mesh, decal, step and hit adapter
- `ground-dynamics.mjs`: deterministic persistent ground-state simulator
- `integration-example.mjs`: optional boundary adapter; not inserted into production global state
- `studio.html`: offline-capable local HTTP preview (uses no external assets or remote CDNs)
- `docs/ground-material-atlas.png`: independently rendered audit contact sheet of every material
- `tests/ground.test.mjs`: Node 22 native tests
- `tests/render-samples.mjs`: reproducible atlas raster input generator

## Running

```bash
node --test tests/ground.test.mjs
python -m http.server 8000
# Open http://localhost:8000/studio.html
```

## Integrating safely with the current game

1. **Preserve the active renderer, chapter structure and movement code**. Import the ES modules into the game's art/world layer, rather than replacing the game or overwriting shared branches. The standalone studio and contact sheet are review surfaces, not production pages.
2. Call `installGroundPass(THREE,scene,...)` inside each actual loaded area and pass **authored room tags, footprint and world-aligned bounds**. For interiors, use **the true building geometry**; the floor must not extend beyond collision walls or obstruct named doorways. In a building with multiple rooms, create polygon regions following internal room geometry.
3. Connect the existing locomotion step event to `onFootstep`; connect battle spell impacts to `onHit`; forward `effects` to actual world-state handlers for phase doors, conductive networks, creature AI and broken cover. Do **not** add duplicate damage/resonance effects when the existing battle resolver already handles the same event. Return `movementCost` to the locomotion resolver, `noise` to nearby monsters, and material clues to the active guided-task journal. Call `update(dt, climate)` at a bounded interval.
4. Serialize `ground.save()` through a **separate namespaced key**, e.g. `save.environment.groundByRegion[regionId]`; remap existing saves without removing their old fields. If `load()` rejects an old/malformed snapshot, migrate or skip the ground field, not the whole save. Save persistent fracture, charge, water and traffic for New Game Plus variations as an explicit story design choice.
5. At chapter transitions, `ground.dispose()` and release the texture GPU resources. Rebuild material maps **only on material/weather transitions**, not every animation frame. On Android default to ~192² color+normal+roughness per visible zone and reduce segment count, footprints and active zones. On desktop ~384² or 512² depending draw calls/memory.

### Specific artwork and gameplay QA before publication

| Location | Visual quality gate | Gameplay consequence |
| --- | --- | --- |
| Cities / plazas | Stone not a featureless square; mortar varying, ruts and thresholds align to streets | Travel routes and civic history legible |
| Houses / inns | Wood and tile sized to actual floor plan; no infinite blank boxes or doors mid-room | Quiet creaks and searchable loose boards |
| Kilns / forges | Soot gradients near sources, not uniform brown | Heat paths, conductive equipment, crafting |
| Canal / harbor | Wet limestone, timber, salt, silt and channel-specific deposits | Slippery movement, tidal routes, tracked clues |
| Ruins / temples | Unbroken architectural motifs, cracks that reveal history | Resonance puzzles and destructible cover |
| Ash / wasteland | Slag, glass, powder, clinker with independent landforms | Footfall traces, heat buildup, salvage |
| Aether / engine | Conductive metal, phase glass, chalk inscriptions and mosaics | Electricity routing, recording triggers |

### Quality audit against recent sessions

Ground Forge intentionally **does not replace** the parallel meadow/grass studio, the 5.16 environment/floor-plan pass, movement/orientation work, interior prop/lighting updates, or the battle UI overhaul. It addresses the unfilled material depth **under** those features. The user still needs GPU/player visual review on Windows 11 Microsoft Edge and Android and an actual branch integration to make a quality claim for the live game.

The visual atlas is a **materials audit**, not a full-scene screenshot; no claims of shipping quality or end-to-end game compatibility are made until the site build and played footage pass. Before release, inspect four types of zone at three camera distances and in dry/wet and day/night conditions. The acceptance checklist should reject (1) rectangular terrain cutouts, (2) indoor floors larger than their building, (3) seams/collision mismatch at doors, (4) tiling apparent from a normal play zoom, (5) bare ground with no geology/construction logic, (6) repetitive props hiding weak floors, (7) mobile shader stalls, and (8) floors whose numerical effects are never consumed by the game.

## Performance / technical limitations

- The `CanvasTexture` maps are generated synchronously on the initial load; do this once per active area, memoize by seed/material/weather, and consider a Web Worker for regions much larger than 512². The preview gallery lazy-renders only visible thumbnails.
- This implementation provides **base geometry and physically motivated PBR maps**, not photogrammetry, tessellated stone displacements, volumetric water or actual lightmap baking. Puddles, dirt deposits, deformation and historical events are modeled numerically; their full in-world animated VFX still must be connected to the site's existing particle/decal pipeline.
- Damage thresholds in `GroundDynamics` are a preliminary balance system and need gameplay tuning. They deliberately emit actions rather than directly changing quest or boss state, preserving the existing campaign compiler and save format.
- Floating-point state is deterministic for a given JS runtime and update sequence; multiplayer lockstep, network replication and synchronized simulation are not provided.
