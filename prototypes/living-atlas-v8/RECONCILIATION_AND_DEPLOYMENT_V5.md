# A&A Living Atlas v5 — synchronized handoff, 2026-10-29

## Project and source authority

- Official active Site identity: `appgprj_6adf63724e5c8191bd55637b8ecd8d9a` / `ash-aether-clay-water`.
- At the time of this handoff the Library site record reported **source version 21 / projection revision 34**. The actual editable source commit and release label of version 21 are NOT independently inspected. The earlier companion report described production 5.17 / `070c9f58c75202871f51651c0009659cd385db3f` as a *reported* earlier target, not an immutable latest version.
- Site public HTTP access was denied (401), no writable Site connector was exposed, and the linked GitHub installation contains no A&A source repository. TinyFish secure profile login was offered and initiated; do not run authenticated automation until the user saves a profile with Site access. A Google login does not itself establish the site's authorization.
- **This package has not been published to the live Site**, and it does not overwrite the canonical campaign, actor rigs, guided travel, bosses, story, collision or save system.

## Recovered from parallel sessions

1. Living Atlas v4 (9 regions, 54 creature archetypes, 216 adaptations, 10-quest replay, 48 Ground Forge materials, 16 plant families).
2. Grass v3 host integration + Ground Forge compatibility, retaining 15 habitats, non-duplicate authoritative events and separate visual quality.
3. Acoustic World v1 — 132 original Ogg files, 16 ambient biomes, 15 surface audio identities, 12 coded clue kinds; two standalone acoustic test suites.
4. Site-ready production adapter and additive, fail-closed installer from the separate merge session.

## New work in v5

- `src/perception.mjs`: deterministic, game-authoritative material/vegetation/acoustic sensor; all 48 materials map to existing recorded identities. Wetness, density, grip, hardness and cover affect the same sensor used for audio cues and encounter noise.
- `src/acoustic/{src,assets,manifest.json}`: all 132 locally bundled audio recordings. Audio only starts after a user gesture and has no effect on an unmuted/muted playthrough's mechanics.
- `src/grass-v3/`: complete separate version-3 integration bridge and tests. Its compatibility math is used by v5's read-only `perceiveAt` without running a second, competing vegetation simulation. The existing v2 GPU renderer remains authoritative in the laboratory UI pending tested v3 renderer parity on Edge/Android.
- The optional recorded soundpack layers beside the existing original Hydrophone synth; missing Ogg files or disabled sound cannot block gameplay.
- New **Listen for echoes** control reveals only a Hydrophone signal sourced from a previously accepted, coordinate-valid `HYDROPHONE_PLAYED` event in the current region, not arbitrary treasure. The game remains authoritative for rewards and quest flags.
- `AtlasWorld.snapshot()` retains `version:3`, adding only `acousticState`; older saves without this field restore with default empty knowledge. Known signal flags survive reloading; IDs are scoped to world epoch, region and event ID.
- `production/` contains the original Site-ready source-staging tool and dependency modules; it stages safely, but does not wire unknown production call sites or deploy.

## Production path, after authenticated editable source exists

1. Export the *latest* production source. Verify its source head and back it up. Never use this standalone `index.html` to replace the live game.
2. Inspect the actual map registry, collision system, event dispatch, render pass, audio bus and save structure.
3. From the `production/` folder run: `python PRODUCTION_MERGE_TOOL.py /path/to/actual/site/source`; confirm zero collisions; only then use `--apply --expect-fingerprint ...` (see `production/PRODUCTION_SITE_MERGE.md`). This places modules but does NOT integrate them by itself.
4. Wire `production/src/production-ground-adapter.mjs` after canonical movement, battle acceptance, material registry and real save/load events. Use **one** ground collision surface and **one** plant-state authority.
5. Map the audio to true in-game events and real map-authored sources, avoiding auto-generated pickups/secret rooms. Keep music/voices already in the live game and respect AudioContext gesture/autoplay restrictions.
6. Run production's current tests, old/NG+ save migration, physical interior alignment, guided-objective completion, all boss phases and full movement animation checks, then Edge/Android visual and mobile-performance QA.
7. Publish to the *same project* only after these checks, and retain rollback snapshot, deployment version and observed smoke tests.

## Reproducibility

Run from the package root:

`node --test tests/*.test.mjs src/ground/tests/*.test.mjs src/grass/*.test.mjs src/grass-v3/*.test.mjs src/acoustic/tests/*.js`

`node scripts/replay.mjs`

`node scripts/benchmark.mjs`

The numerical replay and UI tests do not certify browser GPU rendering, voice mix quality, FPS, production deployment or current Site-source compatibility. Do not conflate package tests with the live site's tests.
