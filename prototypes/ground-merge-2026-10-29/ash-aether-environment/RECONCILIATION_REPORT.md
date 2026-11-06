# Ash & Aether — Reconciled Ground, Grass and Living World

**Checkpoint:** 2026-10-29 (Ground + Grass + Numerical World, integration source)

## Provenance and limits

Recovered from earlier A&A sessions and cross-integrated, without replacing the live game's existing application:

- Ground Forge v1: 48 material identities, 3 procedurally generated texture maps each, 6 persistent world fields, material gameplay semantics.
- Living Grass v2: 16 plant shapes, 15 habitat distributions, deterministic GPU-instanced blades, vegetation save, outdoor disturbances and low-tier fallback.
- Living World prototype: 65×65m numerical world grid, Hydrophone interference, moisture/flooding/fire/harvesting/bridge and elementary creature/camp systems.

Other A&A sessions report live release 5.14–5.16 and more than 1,000 tests in their *own build*. Those results are context, **not tests rerun here**. This checkpoint is a separately runnable **integration laboratory**, not a replacement for the live campaign's source or its final release.

The source of the deployed ChatGPT Site could not be read or modified from this session. A direct read of the published site returned HTTP 401. The GitHub connection contains no A&A repo. Do not confuse the downloadable package with live deployment.

## Integrated code, not merely conceptual connections

| Capability | Concrete implementation | Why this avoids regressions |
| --- | --- | --- |
| Materials on actual terrain | `src/render-ground.mjs` builds world-aligned PBR albedo/normal/roughness textures on the **existing** terrain geometry, with exact UVs | No double coincident ground plane, no changed wall collision |
| Biome and house masks | `src/world-ground-bridge.mjs` uses landmarks, river, paths, repaired bridge and smoothly interpolated numerical world fields | Vegetation excludes built foundations, footpaths thin gradually, no arbitrary material reroll |
| Combat, travel, sound | `GroundWorldBridge.gameplayAt`, `previewAttack`, `dispatch` | Canonical world simulator remains unchanged; ground adds only incremental effects; cast event fires once |
| Gameplay event routing | `src/reconciled-runtime.mjs` `ingest(event)` | Known game events are translated exactly once into world + ground updates |
| World memories visible | `render-ground.mjs` shades persistent charge, traffic, crack, wetness, phase and heat onto texture on discrete actions | Visual responses come from same saved state; maps are **not** regenerated every frame |
| Vegetation and seasons | `lib/grass/living-landscape.mjs` receives real biomass, moisture and fire through `worldGrowthAt` | World changes actually change vegetation density, instead of decorative independent random grass |
| Save/load | separate `aa-living-world-v1`, `aa-living-world-ground-v1`, `aa-living-world-grass-v2` localStorage keys; export includes world+ground+vegetation | Old world saves remain valid; malformed ground alone does not discard the entire game |
| Original overlays/UI | scenery uses PBR texture, while water/growth/aether/hazard modes switch back to original vertex colors | Existing quantitative debug visualizations remain accessible |
| Resource cost | ground repair consumes one world stone resource | Permanent damage has an actual economy consequence |

### Validated scenarios

- The chapel receives its rota mosaic; cottages receive oak; riverbeds remain free of grass; the repaired bridge converts to dockwood.
- Ground walking adds traffic; lightning charges surfaces; aether impacts add phase state; water alters wetness; kinetic impacts fracture cover; repairs consume stone.
- Cast outcome includes `baseDamage`, a bounded incremental `groundMultiplier`, and modified `damage`; only one world cast and one ground impact occur.
- Save and restore preserve ground state across new runtimes. The host world's baseline semantics and snapshot remain independently intact.
- All 48 Ground Forge material definitions still compile and test independently; grass v2 shader and ecology sources are preserved.

## QA results

- **52/52 native Node tests passed**, including Ground Forge, vegetation state, grass renderer rules, original world simulation, integration bridge, event routing and mocked Three.js terrain material lifecycle.
- All JavaScript modules passed `node --check`.
- Fresh Node local-map timings ranged roughly 85–200ms for 160²–384² ground generation in the development container. Those are **CPU-only synthesis measurements**, not game FPS or Android/Edge GPU measurements.
- `docs/reconciled-world-material-map.png` is a generated top-down material validation image, **not a screenshot of the live game**.
- The browser automation environment rejected local navigation (`ERR_BLOCKED_BY_ADMINISTRATOR`), and the Three.js laboratory uses an external pinned CDN. **No actual GPU/gameplay screenshot or production cross-browser audit has been completed here.**

## Open launch gates

1. **Production integration:** apply this modular source onto the real A&A Site's latest editable source, not its public extracted `.txt` projection. Preserve ongoing parallel work in rendering, movement, guidance, boss fights, skill icons, audio, endings and camera controls.
2. **Indoor floor topology:** in real campaign interiors, pass actual polygon floor plans and thresholds; the current lab cottages are closed exterior structures, so their interior floor patterns are mapped numerically but not walked through in the lab.
3. **Render quality:** inspect roofs, ground seams, scale, mip shimmer, shadow bias and waterline blending in real camera framing at three distances; approve visually, not solely through the atlas.
4. **Performance:** measure mobile/Edge device frame time, GPU draw calls, frame spikes on material transitions, memory usage and cold-start cost. Make low/high quality choices empirical; do not assert 60 fps without measurement.
5. **Game consequence verification:** wire emitted ground event consequences to monster AI, stealth, resource inventory, boss shielding, map shortcuts, navigation and guided tasks in the live source. The lab demonstrates numerical outcomes but does not assert those campaign systems are already connected.
6. **Save migration:** production campaign saves may have different schemas; merge under `save.environment` or its official versioned equivalent and ensure New Game Plus inheritance is explicit rather than accidental.
7. **No duplicate combat:** sample the canonical resolver once and apply Ground Forge incremental modifiers just once. Use the bridge's `ingest` convention if appropriate to the live event bus.

## Reproducing the integration

Requires Node 22+ for native tests, Python 3 (or any HTTP static server) to host ES modules, and network access for pinned Three.js 0.180.0 CDN in the 3D lab.

```bash
node --test tests/*.test.mjs lib/ground/tests/ground.test.mjs lib/grass/*.test.mjs
python -m http.server 8000
# Open http://localhost:8000/ for the merged 3D lab
# Ground Forge standalone: http://localhost:8000/lib/ground/studio.html
# Offline grass preview: http://localhost:8000/lib/grass/preview-offline.html
```

This is the strongest safe artifact possible from the source recovered in this session. It does **not** claim to have installed itself into the private Site, and does not overwrite the art, gameplay, or tests owned by other A&A sessions.

## Production-bridge follow-up (2026-10-29)

`src/production-ground-adapter.mjs` and `tests/production-ground-adapter.test.mjs` add host-independent, multiple-map, explicitly-registered ground, globally idempotent events, optional battle augmentation (one canonical result only), transactional saves and no overwritten campaign routes. These are staged production adapter code, **not installed into the live Site**. Follow `PRODUCTION_SITE_MERGE.md` for precise safe integration scope.
