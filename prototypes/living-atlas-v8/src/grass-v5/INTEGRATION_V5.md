# A&A v5 vegetation — cross-session merge contract (2026-10-29)

## Ownership contract

| Subsystem | Owner | Our optional integration |
| --- | --- | --- |
| Main A&A application | Live game session | Call `createAAGameVegetationBridge` with real camera, scene and world callbacks |
| Ground Forge / world material database | Ground materials session | Supply material/soil tags/height/path/building masks to `ground-forge-compat.mjs` |
| Living World / AI / monsters | Encounter session | Read `sample(x,z).gameplay` and `combined`; host sets true attack, shield and spawn semantics |
| Lighting, depth, 3D art | Environment/graphics sessions | Three.js instanced layer with per-instance morphology, season/wind/fog input |
| NG+ and world memory | Core game/save session | Provide timeline seed/id, call `switchTimeline`, store `snapshot` atomically |
| Game audio | Audio/Hydrophone session | Use host wind/weather/terrain sound sources; vegetation emits no redundant audio loop |

## Exact source requirements

`createAAGameVegetationBridge({THREE,scene,renderMode:'gpu',seed,quality,groundOptions:{materialAt,regionAt,heightAt,pathAt,obstacleAt,seasonAt,weatherAt}})` as documented in `aa-game-integration.mjs`. Ensure the same `terrainHeight`, path/building masks and scene coordinate frame used by the actual host. The renderer expects Y-up, XZ ground coordinates in **world metres**. In Canvas modes pass host `worldToScreen` and optional `scaleAt(x,z,y)` for perspective, not a separate invented camera.

Wire `notifyTerrainChanged()` on topology/material/biome changes, and `applyEvent` only for canonical host actions. Separate visual `setVisualSettings` from game-logic sampling. Dispose renderer on scene unload and reconnect with the game's own asset manager; do not mount multiple identical GPU landscapes.

## v5 visual-specific rules

`grass-appearance.mjs` is pure and world-seeded; if the game already contains a patch-seed system it can supply the seed. Do not reroll when the player moves, changes the camera, or reloads. Keep alpha-free solid blades in the GPU path to avoid massive foliage overdraw on mobile. `aVariation` is an `InstancedBufferAttribute` of four floats per clump; the mesh geometry must carry that attribute, and buffers are marked dirty after rebuilding. The GPU shader is not yet compiled against the live host's actual Three.js build; validate renderer and color-space compatibility there.

The perspective lab has a painted environment and sample material labels for research only. **Do not merge its stand-in tree meshes, water geometry, illustrative soil palette or dummy avatar into the live world.** These deliberately do not override Ground Forge, terrain simulation or other A&A art sessions.

## Must-pass release gate

1. Compare source revision to latest game branch/site; verify no duplicate grass or material scene objects, no coincident floor planes, no wall/interior infiltration.
2. World alignment at roads, river edges, doorways, bridge and built foundations; check grass opacity and foot contact near slopes.
3. Verify GPU shader compilation and mobile fallback. Measure timings at 720p, 1080p, Android and desktop, recording actual draw calls, GPU allocations and FPS before choosing density tiers.
4. Run the full host integration suite, import old saves, repeat fire/regrowth/harvest, cross-chapter timeline travel and NG+ isolation. Confirm one reward transaction per harvest ID.
5. Verify the same grass concealment, fire rate and traversal cost regardless of visual quality and whether WebGL is disabled.
6. Manual first-glance art review at intended zoom: silhouettes, shadows, wind coherence, density, soft transitions, season, clutter and species differentiation.
7. Document merge SHA and deployment preview URL only after actual authorized source integration. Current artifact is **not deployed**.

## Evidence

- Node regression suite: `node --test *.test.mjs` (50 cases).
- Offline scenic and QA views: Chromium desktop/mobile smoke checks; no JS errors in tested workflows.
- v5 manifest in `MANIFEST_V5.json` lists SHA256 hashes for packaged sources.
