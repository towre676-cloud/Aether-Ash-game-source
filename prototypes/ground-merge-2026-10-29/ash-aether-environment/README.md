> **Reconciled environment build — October 29, 2026.** This source now integrates Ground Forge v1, Grass v2, and the canonical Living World lab. See [RECONCILIATION_REPORT.md](RECONCILIATION_REPORT.md) for provenance and [PRODUCTION_SITE_MERGE.md](PRODUCTION_SITE_MERGE.md) for the additive, conflict-safe 5.17 production merge bridge and acceptance gates. The public A&A Site was not modified.

# Ash & Aether — Living World Laboratory

An **independent Three.js integration prototype**, not a modification to the live Ash & Aether game. It is organized so the deterministic state can be integrated into A&A's existing JavaScript engine without replacing its campaigns, save files, or movement code.

## Try it

From this folder:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`. Internet access is required for the pinned `three@0.180.0` module and OrbitControls CDN import. WebGL 2 is required. The numerical world itself has no runtime dependencies.

```bash
node --test tests/world.test.mjs
```

## What is materially linked

| Numeric input | Graphic representation | Actual gameplay effect |
| --- | --- | --- |
| Height, water, moisture | Sculpted valleys, river, floodplain, wet coloring | Traversal, fire shield, aquatic encounters |
| Fertility, biomass | Tree, grass, flower density, leaf size | Root cover, resource harvest, habitat pressure |
| Stone distribution | Rock populations and terrain composition | Earth defense and physical cover |
| Aether and phase-coherent Hydrophone resonance | Halo/glow field and live terrain coloration | Echo readings, Aether shield, encounter likelihood; 180-degree phase inversion can cancel waves |
| Ash and burning | Browned canopy, scorched ground | Reduced harvest, reduced cover, Cinder-forager habitats |
| Gate and restored bridge | Moving gate and physical planks | Orchard irrigation and river crossing legality |
| Rain and day passage | Rain particles, visible ecology change | Deterministic moisture/growth/fire dynamics |

Nothing in the game has been replaced or deployed. This is the **first small representative map**, not the full enormous content library.

## Integration contract

```js
import {LivingWorld,gameEvent} from './src/world.mjs';
const environment = new LivingWorld(71);
gameEvent(environment, {kind:'QUEST_SLUICE_OPENED'});
gameEvent(environment, {kind:'DAYS_PASSED',days:7});
const combatContext = environment.evaluate(16,14);
// {cover, shielding, encounterChance, harvest, walkCost, historyEcho, traversalPassable, creature}
const saveExtension = environment.snapshot();
// later: LivingWorld.restore(saveExtension)
```

Actual A&A coordinates, terrain units, campaign flags, enemy templates, item inventories, quest IDs, and event naming **need mapping against its current source**. The adapter event names are provisional. The world and renderer are deliberately separate. Integrating into the existing game should use an environment service with terrain-chunk indexing, not embed the simulation in the rendering loop.

See `MODEL.md` for the coupled numerical equations, nonlinear elemental-damage formula, integration contract and production acceptance tests.

## Model scope and limitations

The simulation consists of a 65x65 grid with deterministic seeded height, ecology, moisture and fire updates; it is not a physically validated fluid model. Water input, growth, hydrophone attenuation, rock distribution, and effects are game-balance models with explicit coefficients, not claims of physical accuracy. Each `advance` simulates up to 90 daily steps. Big-world production should introduce sparse delta persistence, chunked LOD, event-replay compression, mobile GPU budgets, offline assets, and server or authoritative-save validation. The demonstration uses dynamic instancing and moderate scene counts; it has not been benchmarked in a real browser in this session.

## Proposed content expansion without meaningless repetition

1. Tile authored geography into streamed biome zones: Delta, Ashlands, Orchard, Chapel, Glass Coast, Sky Engine, Deep Clay, Rainforest, Basalt Rift.
2. Add regional environmental profiles (soil chemistry, canopy species, riverbed materials, architectural grammar, timeline state) with structured schemas.
3. Define material composition and finite object provenance. Props exist as collision/cover/tools/resources, have provenance and can change ownership and damage state.
4. Layer nonlinear effects: water vs heat, clay vs pressure, metal vs lightning, Hydrophone phase interference vs echo; test individual unit interactions and their combined effects.
5. Couple consequence chains with actual quests, monster populations, NPC routines, village economy and new-game-plus timeline continuity.
6. Validate every biome visually and with world-state before/after tests; count unique useful action loops rather than decorative mesh counts.

## Known technical considerations

The Three.js docs recommend `InstancedMesh` for many copies of meshes, with `instanceMatrix.needsUpdate` and `instanceColor.needsUpdate` after changes and recomputed bounds when needed. This demo disables frustum culling for its instanced meshes instead of recomputing bounds every intervention; production should use chunked culling. Although WebGPURenderer can fall back to WebGL 2, it is still experimental, and WebGLRenderer remains the conservative choice for this mobile-friendly proof of concept.

Docs: https://threejs.org/docs/pages/InstancedMesh.html and https://threejs.org/manual/pages/webgpurenderer

## Site-ready source staging, 2026-10-29

Use `PRODUCTION_MERGE_TOOL.py` and `PRODUCTION_SITE_MERGE.md` to stage the *additive modules only* against an authenticated checkout of the existing Site source, with collision checks, source fingerprint and a required explicit apply flag. A successful source-stage result is **not** a live Site deployment. See `CURRENT_DEPLOYMENT_STATUS.md`.

## Hardening update

The latest integration bridge adds deferred map-save restoration, built-surface grass masks, callback safety and strict geometry checks. The total local regression suite is 75/75. Read `MERGE_UPDATES_2026-10-29.md` for limitations and production access requirements.
