# Ash & Aether — Living Grass v4 / ecotones and safer production integration

**Local artifact — NOT merged into, nor published on, the private Ash & Aether Site.**

## Quick launch

- Open `reconciliation-lab-offline.html` on a laptop or phone. It bundles all real v4 numerical modules and the Canvas2D vegetation compositor directly in one HTML file. No developer server, Three.js package, sign-in, or internet is required by that file.
- Use **Habitat / region**, **Ecotone neighbor**, and **Habitat blend** to inspect biome edges. Experiment with material, season, rain, footfalls, wildfire, regrowth and separate NG+ save histories.
- `demo.html` is the separate Three.js WebGL research prototype. It requires the CDN and a local HTTP server (`python -m http.server 8765`). Its current visual scene is still the original renderer research preview, not the full game.
- Run `node --test *.test.mjs` in this folder. No NPM dependencies are needed for the tests.

## What's newly implemented

1. **Nearby-first, symmetric field allocation:** capped vegetation tiles use concentric world-coordinate rings. The previous left-to-right scanner could empty its tuft budget before reaching the player's east side. Tests now require all four quadrants to receive grass even with tight budgets.
2. **Ecotones:** optional host-owned `region.biomeMix` provides weighted distributions between the 15 preexisting habitat profiles. The numerical ecology and species selector use the same weighted probabilities. No phantom region IDs or procedural biome-authoring overrides are introduced.
3. **Correct plant selection:** moisture-adjusted species weights are now used for actual weighted selection, fixing a stale-weight bug.
4. **Season-aware visual coloring:** the WebGL and Canvas2D renderers tint vegetation based on the ecology's *actual local season*, instead of one startup season. Canvas also layers scorch and wetness tint.
5. **Persistent harvest receipts:** v4 snapshots preserve reward-bearing event IDs beyond the 768-entry generic event journal. This guards against duplicate vegetation reward *suggestions* after long journeys and NG+ round-trips; the game's real inventory ledger must still apply atomic/idempotent item grants. The v4 journal hard-fails at 50,000 receipt IDs rather than recycling them.
6. **Save compatibility:** v4 bridge snapshots, v3 bridge snapshots, and v2 bare vegetation snapshots can all be imported. The source game remains responsible for versioning and migration of its full save files.
7. **Visual refresh hook:** `notifyTerrainChanged()` explicitly invalidates material/weather/season/region caches and schedules a GPU foliage rebuild. The live game should invoke it after ground-geometry/flood/mask changes.
8. **Adaptive foliage detail (opt-in):** `createFoliageQualityGovernor()` downgrades/recovers only vegetation mesh density after sustained slower/faster host frames. It uses hysteresis and cooldowns. It never changes ecology, enemy detection, harvesting, collision or battle values.
9. **Offline browser QA lab:** a new blended-biome slider and optional adaptive-detail checkbox; desktop and mobile Chromium interactions checked.

## Source and ownership

- `grass-ecology.mjs`: deterministic biome/state sampling, 16 species, 15 habitats, optional weighted ecotones.
- `grass-renderer.mjs`: Three.js instanced vegetation, radial allocation, wind, terrain height and seasons.
- `canvas-grass-fallback.mjs`: 2D fallback renderer with the same sampled ecology.
- `ground-forge-compat.mjs`: accepts the actual game's material, mask, weather and biome data **injected by source-owning session**.
- `grass-state.mjs`: v2 disturbance-cell save schema, still used by v4 bridge.
- `aa-game-integration.mjs`: host event mapping, v4 timeline snapshots/reward receipt journals, accessibility, visual invalidation.
- `foliage-quality-governor.mjs`: optional visual-only frame-budget controller.
- `living-landscape.mjs`: 3D vegetation rendering and persistent state coordinator.
- `v4-regressions.test.mjs`: weighted sampling, ecotones, balanced allocation, long-lived idempotency, visual sync and adaptive detail.

## Release safety / known limits

The separate live A&A session was reported to have progressed through 5.18. That build's *actual source was not available to this session*. A&A's current world/save/camera/quest systems, Ground Forge's 48-material registry, the newer 124 motifs/materials in the game art work, and Living World's monster/audio data must be adapted using verified source interfaces—not overwritten or synthesized from similar-sounding IDs. The isolated 45-test suite cannot substitute for the host game's thousand-plus tests.

The private ChatGPT Site returns HTTP 401 to this session's unauthenticated web inspection, and the Library Site projection exposes only published text/metadata. **Nothing here was deployed.** Real WebGL shader compilation, Android/Edge FPS, terrain occlusion, actor-feet alignment and every indoor / late-boss / NG+ scene remain mandatory release checks.

See `CROSS_SESSION_RECONCILIATION_V4.md` for the exact merge boundary and `MANIFEST_V4.json` for verified package hashes.
