# Living Atlas v8 and Living Grass v6 — campaign integration, 5.21.0

## Recovered sources

| Source archive | Bytes | SHA-256 |
| --- | ---: | --- |
| Ash_Aether_Living_Atlas_v8_Spatial_Encounters.zip | 20,743,391 | `7ca255512314adf06a98965ec46adf11d982407a4adab9a24523ce0f4121d39c` |
| ash-aether-living-grass-v6-three-integration.zip | 150,278 | `ad0b7d78cd1e26ed5b5c51e0c085433c765c46f1c138a8d7f43c5740cd51a3d5` |

Atlas supplied the actual `src/world.mjs` numerical kernel and the v8 production resident bridge. Grass supplied the latest v6 production modules, including persistent disturbance, ecology, appearance, Canvas fallback, GPU integration, and quality governor. Atlas's bundled older grass, audio, and ground versions do not replace the newer recovered production packages.

## Playable behavior

- Outdoor vegetation uses the existing Canvas renderer and the v6 Canvas fallback. It respects the actual floor, doors, interaction points, town streets, building projections, interiors, and authored Ground Forge materials. Canopy shade comes from the renderer's placed tree sites. Tuft scale, restrained opacity, and tapered boundary density match the existing campaign scene scale.
- Accepted movement flattens vegetation and adds local noise disturbance. Fire and water casts leave persistent scars and wetness. Earth and aether casts change the recovered numerical fields at their actual accepted target positions.
- Atlas moisture, fertility, biomass, stone, aether, fire, ash, and complex wave fields run on each canonical map. Host material and geometry projections replace the laboratory map seed. The lab river, sluice, bridge, harvest supplies, and quests never decide campaign collision or rewards.
- The HUD reads the actual habitat, foliage cover, resonance, and wildlife pressure. The pause menu exposes the paid Hydrophone and its counterphase. Opposite phases cancel the wave; they are not separate additive visual glows. Each field pulse costs exactly 2 MP from the living leader.
- Foliage concealment affects the real patrol detection threshold. Rooted-stride boots additionally multiply that threshold when their actual equipped effect is active on organic ground.
- Resolved canonical species affect local abundance and alert, including peaceful withdrawal. Those values, foliage, and numerical resonance affect the existing encounter distance budget. Original encounter actors, counts, catalog, battle transactions, and rewards remain with the campaign.
- Numerical elemental shielding composes with Ground Forge in the canonical damage path. Atlas reduces eligible direct damage by at most 8%; DOT, secondary effects, healing, and unknown core types are excluded. Atlas never assigns HP.
- The recovered resident bridge verifies the current campaign actor position, region, proximity, and clear path before the host starts an encounter. Removed roaming packs cannot be re-engaged through an old descriptor.

## Runtime boundaries

`main.js` installs Ground Forge, then Atlas, then trail life; it dispatches already accepted battle events to the adapters. Both newly created and restored battles receive `battle.reconciledAtlas = world.livingAtlas`. `renderer.js` calls `drawLivingAtlas` after scene ground painting and before actors. The HUD calls the readout's `update({hidden})` at its existing cadence.

The renderer caches at most 48 six-tile chunks and bakes at most two per frame. Nearby wind animation updates at a 0.12-second minimum interval and reuses its existing canvas. Missing or explicitly disturbed chunks can still rebuild immediately. Compatibility quality changes visual density and resolution only. Drawing and changing quality do not change gameplay samples, saved numerical fields, resource ownership, or reward receipts.

## Persistence

The `livingAtlasV1` campaign namespace stores the journey identity, time, scene ecology, and bounded sparse grass disturbances. Every restore validates the complete Atlas input before invoking the host restore. Old campaign saves without this namespace remain usable.

Numerical checkpoints use version 2. Changed values preserve exact Float32 values, including complex wave phase. Sparse records store an index and value; broadly changed fields use index-free Float32 encoding. The reference is the same deterministically aged field without player actions. Thus ordinary aging does not create dense snapshots on every visited map. A 25-map, one-day regression saves the entire Atlas namespace in less than 12 KB; a broadly resonant map remains below 100 KB. Reference replay is capped at 90 simulation steps, with later changes retained exactly as deviations. Version 1 numerical checkpoints remain readable.

Same-journey origin convergence retains the Atlas identity, exact local fields, and Ground Forge scars. A new telling starts new physical fields. This is verified against the actual `convergeOrigin` path with the campaign's Ground, Atlas, Trail, Acoustic, Town, Regional, Rival, and Field Feedback installers composed together.

## Verification

Run on 2026-10-29:

| Check | Result |
| --- | --- |
| `node dist/game/engine2/tests/living-atlas.test.mjs` | 16 cases passed |
| Existing `field-encounters.test.mjs` | 13 cases passed |
| Existing `field-patrols.test.mjs` | 12 cases passed |
| Original Atlas `world.test.mjs`, importing the shipped numerical kernel | 9 cases passed |
| Recovered Grass v6 `node --test *.test.mjs` | All 8 test files passed |
| Existing renderer recovery, graphics health, and compatibility ground cases | 12 cases passed |
| `git diff --check` on the integration's modified files | Passed |

The new cases cover geometry, authoritative movement, accepted and repeated casts, paid phase interference, exact saves, long-campaign save growth, rejection before mutation, old saves, edge disturbances, origin continuity, new journeys, actual species outcomes, moving resident validation, bounded damage, actual boots detection, rendering isolation, and all installer composition on a production `World`. Browser and publication verification are recorded in the release-wide reconciliation report.

The final rendering regression simulates 60 display frames: nearby grass performs eight bakes, allocates one canvas, retains identical numerical fields, and immediately redraws an explicitly dirty chunk. A read-only Cinderfall benchmark with Canvas raster methods stubbed measured 0.827 ms of JavaScript per forced nearby rebake against 0.012 ms for cached composition; those measurements do not measure browser rasterization or total renderer frame time. The game's existing `data-draw-ms` value is the rolling average of the last 300 full renderer frames, so a graphics-mode change needs time to replace the previous mode's samples.
