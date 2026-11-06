# A&A Living Atlas v7 — Consequential Wildlife and Field Guide

**Status:** local integration-ready laboratory; NOT deployed to the production A&A Site.

This release builds on the complete v6 world, Living Grass v4 and Ground Forge, nine connected regions, 54 authored creature archetypes, 48 material profiles, 244 audio recordings, Hydrophone, the ten-quest campaign, and New Game Plus. It adds an authoritative and saved creature ecology instead of treating map monsters as purely decorative models.

## Run the interactive prototype

Extract the archive and double-click `RUN_WINDOWS.bat` on Windows 11. Open <http://localhost:8000>. It imports pinned Three.js 0.180.0 through the CDN, so network access is required. Use the Explore tab to choose a local creature and **Study tracks and habitat**, then move the party, battle, or advance days. See `scripts/ecology-replay-v7.mjs` for a reproducible numerical counterfactual.

## New in v7

- `src/wildlife-v7.mjs`: deterministic 54-cohort ecology derived from authored species and environment; carrying capacity, vegetation, moisture, fire/ash and grazer pressure change regional abundance. Counts are *abstract local cohort units*, not actual measured animals; no claim of biologically validated population predictions.
- Confirmed footsteps and combat disturb local wildlife. Migrating and scavenging creatures visibly avoid nearby threats. Disturbance dissipates over time. Harvesting or killing has persistent, separately modeled effects; mere animation and GPU frame rate do not write game state.
- A victorious battle subtracts one resident cohort unit. Daily population updates allow recovery and respond to environmental conditions. Encounter likelihood and available creatures read these same counts; depleted direct-challenge targets are blocked.
- `src/actors.mjs`: habitat-bound waypoint motion validated against the current world's traversal field and riverbed; legs move with velocity, the player and alarms can influence avoidance, and count controls visible actors. Route collision checks are cached per authoritative state transition instead of repeated every frame.
- Field guide: `trackSpecies` records identified physical evidence, material, observed density, confidence and epoch. Repeating a same-species/day observation does not farm rewards. Knowledge grants a small, bounded defensive benefit against that species. Field evidence persists in saves and partially survives New Game Plus. This never creates loot, quests or other unauthorized objects.
- The Explore HUD shows census and alarm, Systems shows region census and field note totals. `window.aaWorld.getWildlife()` and `.getFieldGuide()` support development inspection.
- The existing v3 save shape is retained, with optional `wildlifeV7` and `fieldGuideV7` fields; older v3 saves load without new extensions. Saved extension validation fails closed on corrupt data.

## Technical verification

From the extracted directory:

```sh
node --test tests/*.test.mjs src/ground/tests/*.test.mjs src/grass/*.test.mjs src/grass-v3/*.test.mjs src/grass-v4/*.test.mjs src/acoustic/tests/*.js src/acoustic-v2/tests/*.js
node scripts/replay.mjs
node scripts/ecology-replay-v7.mjs
node scripts/benchmark.mjs
node scripts/check-integrity.mjs
```

`TEST_REPORT_V7.tap`, `CAMPAIGN_RECEIPT_V7.json`, `ECOLOGY_RECEIPT_V7.json`, `CPU_BENCHMARK_V7.json` contain the outputs of the actual commands. The full test suite contains **227 passing tests**; the ten-quest standalone replay succeeds. Browser GPU performance, mobile controller quality and integration into the published A&A 5.x game **remain unverified**.

## Intended production adoption

Keep one authoritative game actor/event manager. Map the core's accepted events to the real game's event bus. Keep visual steering, foliage LOD, particle effects and audio strictly read-only with respect to ecology/rewards. Use the live site's real file layout and save migrations; do not replace the game with `index.html`. See `PRODUCTION_GATE_V7.md` and `production/PRODUCTION_SITE_MERGE.md` for a staged migration checklist.
