# Ash & Aether — Reconciled environment integration, save/mask hardening

**Build status:** Local standalone environment source, additive modules and preflight merger are ready. The authenticated A&A Site project has **not** been edited or published in this session. Do not replace the production game's entry point or canonical combat engine with the lab.

## High-impact integration fixes in this build

1. **Environment state survives campaign map streaming.** Unknown/unloaded map snapshots are preserved while their source maps are unavailable. When a map is registered later, its ground fields and materials are restored with exact grid geometry validation. `unregisterMap()` now preserves material state by default; use `{preserve:false}` for deliberate deletion (e.g. abandoned timeline).
2. **Save compatibility.** Unknown, future `environment.groundV1` root extension fields are preserved. Save restoration is transactional even when a known map has invalid dimensions or a shifted world origin. Existing global event IDs survive to prevent duplicate footfalls or impacts after load. Older saves without `environment.groundV1` should be initialized by the production host, leaving the original root fields intact.
3. **Consistent vegetation masking.** Authored roads, interior floors, docks, riverbeds, bridges, stairs and paved plazas are excluded from grass by default, with explicit `grassAllowed` override so artists can create reclaimed streets. The lab's GPU grass and its low-end fallback now exclude built structures and roads; flowers and trees no longer spawn through them in the lab.
4. **Event subscriber resilience.** A failed render/telemetry listener no longer throws after mutating the numerical ground, which previously risked applying a duplicate movement event on retry. `listenerFailures` exposes an observable count, not a second combat pipeline.
5. **Snapshot alignment validation.** Numeric grid restore now checks seed, origin, dimensions, positive elapsed time and field bounds, protecting saved footprints from being mapped to incorrect buildings after campaign or New Game Plus changes.

## Validation performed

- 68 Node tests passing (including six new integration regressions) and seven Python production-stage installer tests; total **75/75 tests**.
- `node --check` on changed ES modules; Python compilation; material atlas and extracted archive integrity checks.
- **No authenticated production source diff, no production save migration run, and no real GPU/browser acceptance test**: the published Site returns HTTP 401 to the unauthenticated fetcher, no Site write connector is available, and local Chromium navigation is blocked by administrator policy.

## Site merge discipline

Read `PRODUCTION_SITE_MERGE.md`. Apply `PRODUCTION_MERGE_TOOL.py` only against a fresh editable export from the live Site, using fingerprint dry run and `--apply --expect-fingerprint`. This stages ten modules without changing the existing game. After inspecting actual runtime APIs, wire canonical map events, battle results, movement, save/load, and grass rendering, then test real saves and publish through the Site editor. Never substitute `index.html` or `src/world.mjs` from the lab for the current game.

## Release continuation: physical material normals and non-destructive rebuilds

**Verified local tests:** 76 Node tests and 7 Python installer tests, 83/83 passing.

- Generated ground normal maps now derive slopes from **physical world metres** rather than from a fixed per-pixel gradient. Raising the texture resolution therefore no longer systematically flattens the apparent relief.
- Normal maps sample *one pixel beyond each chunk boundary*, yielding an identical shared-edge normal for adjacent same-resolution terrain chunks. Zero per-channel boundary mismatch was measured in representative cobble, pebble, wood, phase, herringbone, basalt and mud terrain test cases.
- At authored material transitions, normal generation no longer interprets a change between different material height patterns as a fabricated vertical step. Material boundaries remain present in albedo and roughness.
- `normalReliefMetres` is optional (default 0.065 metres), validated, and may be overridden for a specific authored surface scale. `0` produces flat normals for smooth or mirrored architecture.
- The production adapter's `syncMap` now validates the entire new surface selection **before** committing a map rebuild. Incomplete building edits or unknown materials cannot leave half of a room in the old state and half in the new one.
- A standalone 48-material normal-map audit atlas is available in `docs/normal-map-qa-atlas.png` for visual review. This is shader source texture evidence, **not** proof of browser GPU appearance.

**Caveat:** The exact shared-edge test uses adjacent chunks of equal physical texel spacing. Mixed-resolution LODs still require UV/normal resampling at the boundary or a shared lower-resolution edge specification in production. Tests validate module generation and numerical state; production materials, lighting, player movement and browser GPU visuals remain unverified because authenticated editable Site source is not connected.
