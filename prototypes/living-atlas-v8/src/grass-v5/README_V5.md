# Ash & Aether Living Grass v5 — cinematic vegetation and reliable cross-session source

**Standalone implementation, not an update to the deployed private ChatGPT Site.**

## Open the work

1. Open `cinematic-grass-offline.html` directly in a browser. Perspective scene, seasonal grasses, marsh/woodland/moor species, wind, trampling, fire, watering, recovery, and numeric ground cover. It is self-contained and has no network dependencies.
2. Open `reconciliation-lab-offline.html` to inspect ground material, ecotone transitions, foliage, environment shielding, fire, traction, separate NG+ timelines and save export/import.
3. Run `node --test *.test.mjs` inside this folder (Node 18+). All tests use local JS and do not require npm install.
4. Regenerate both previews with `python build-offline-lab.py && python build-cinematic-lab.py`.
5. `demo.html` is the earlier Three.js WebGL visualization research prototype. It needs a development server and the Three.js CDN; its code is not an offline production benchmark.

## Changes versus v4

- `grass-appearance.mjs` introduces deterministic, *world-anchored* clump variation (height, fan, width, lean, seed heads, highlights, relative phase). These are **visual-only facts** and do not rewrite ecology or gameplay.
- GPU vegetation `aVariation` is a per-instance attribute on **every species and flower mesh**. Wind uses coherent long-period bands, secondary eddies, and local flutter so the whole meadow does not move as a synchronized loop. Near-player displacement remains tied to physical world-space trails.
- Canvas2D now paints substantially fuller and distinct silhouettes: trifoliate clover, divided ferns, flowering heather/lavender, cattail reeds, wheat heads, blades of variable taper and shade, shadow patches, and occasional wildflowers.
- Fallback supports `scaleAt(x,z,y)` supplied by the **host camera** for correct perspective scaling; no camera logic is duplicated inside the vegetation system.
- `cinematic-grass-offline.html` is a new low-dependency perspective art study using the **actual v5 visual modules and v4 gameplay bridge** rather than a visual mockup disconnected from ecology.
- Original v4 ecology, Ground Forge compatibility, world-state schema, timeline isolation, idempotent harvesting and performance governor remain intact.
- 50 Node tests pass and the two offline previews have been smoke-tested in headless Chromium at desktop and mobile viewport sizes.

## Verified / not verified

Verified: pure module regression tests, deterministic sampling, finite GPU attribute data using a Three.js-compatible CPU mock, fallback geometry and consistent gameplay after changing visual detail. Offline browser scene loads at 1280x780 and 390x844 without page-script errors; in the initial orchard scene, a fire action reduces sampled cover (example QA measurement 31% to 14%).

NOT verified: actual Three.js GPU shader compilation and driver behavior, FPS on your Windows laptop or Android device, actual rendered A&A camera/terrain/occlusion, full Ground Forge registry wiring, the live A&A save migration or deployment. Canvas images are **stylized illustration prototypes**, not photoreal final-game screenshots. No release or publication claims.

## Merge rules

- Host game controls map collision, floor/outdoor occlusion, terrain masks, main quest encounters, inventory transactions, camera and site deployments.
- Ground Forge owns ground material properties; adapter reads them and supplies callbacks.
- Vegetation owns growth and damage; it publishes concealment, traversal, forage and hazard factors as inputs to host decisions, not as a replacement simulation.
- NG+ isolation and reward receipts must be connected to the host's authoritative timeline and atomic inventory ledger.
- Visual quality may change density, number of rendered clumps, shadows and detail but **never** detection/encounter/battle odds or rewards.

See `INTEGRATION_V5.md` for the concrete handoff and release gate.
