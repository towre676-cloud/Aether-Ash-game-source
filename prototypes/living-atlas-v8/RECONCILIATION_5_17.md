# Ash & Aether cross-session reconciliation — 29 October 2026

## Production baseline: do not replace it

Known live ChatGPT Site project: `appgprj_6adf63724e5c8191bd55637b8ecd8d9a`, slug `ash-aether-clay-water`, at `https://ash-aether-clay-water.towre676.chatgpt.site`.
The connected Library's active Site projection identifies source version 20. The current parallel campaign session reports **Release 5.17 “The Answering City”** and 1,004 tests across 137 modules; those tests/source are **NOT** available to replay in this build. Site URLs return access-denied/unavailable from the current tools, and the projection is published text, not the editable code or authenticated deployment surface.

The 5.17 story objective is to return the stolen voices and make it possible for the city to survive without further theft. Other sessions own five repair works, seven character motivations, chapter guidance, guided/manual travel, the Dev Portal at `/game/?dev=1`, boss scenes, audiovisual content, camera and movement improvements, and battle UI. These must remain authoritative for the shipped game. The standalone Living Atlas 10-quest graph **is not** the production quest graph and must not overwrite it.

## Code actually recovered and merged in this package

1. **Living Atlas** (current workspace): 9 numerical regions, 54 actual species IDs, 216 ecological modifiers (not animation rigs), deterministic ecology, market, crafting, Hydrophone interference, legal A* routes, combat and inherited timeline state.
2. **Living Grass v2** (Library `ash-aether-living-grass-v2.zip`): 16 plant families, 15 ecological biomes, a Three.js instanced shader renderer, offline Canvas preview and a versioned disturbance engine. Source is preserved under `src/grass` (and its independent tests were replayed).
3. **Ground Forge v1** (Library `AA_Ground_Forge_v1.zip`): 48 physical substrate identities, semantic material synthesizer, runtime PBR map generation and 32x32 ground-dynamics state. Source is preserved under `src/ground` (and its independent tests were replayed).

### Unified authority in this build

`AtlasWorld.dispatch()` remains the single gameplay acceptance gate for meaningful events. `src/surfaces.mjs` combines Ground Forge material physics with the independent vegetation state for the *same* sampled location. It does not distribute rewards, decide quests, or mutate campaign state on an animation frame. Only confirmed steps and skills produce lasting traces; the Three.js view cannot manufacture an inventory item by itself. Regional soils reflect geology, roads, settlement footprints, water level and the era. Ground conduction, friction, sound, shielding and ecology feed movement cost, encounter detection and battle resolution. The underlying Atlas world fields remain authoritative for hydrology, fire, creatures, audio and quest progression.

Saved surface data are an **additive optional `surfaceStates` field within the existing Atlas v3 save**: the v3 outer version is not bumped, and earlier v3 snapshots without this field still restore. Each surface state has its own schema and region/seed checks; loading retains other region states lazily. Each new epoch records a compact surface history signature in `imprint.surface`, and a previous timeline's material phase, scar and traffic persist around the historical memorial site. This is a prototype of visible history, not a replacement for production 5.17 story memory.

## Exact live integration order (requires project source / permission)

1. Obtain the **real 5.17** code and test suite through the existing Site editor or approved repository checkout. Compare existing names and schemas before changing anything. The Site text projection and 401 response are insufficient to deploy.
2. Create a **versioned, opt-in `livingSurfaces` extension** on the *real* save serializer, with migration and a disabled-by-default feature flag. NEVER replace the existing saved game with this prototype's save file.
3. Map only confirmed 5.17 events: accepted footfalls, combat impacts, chapter restoration, environment harvest, terrain/irrigation, Hydrophone tunings. Reject the provisional adapter IDs until they match production names.
4. Test **Dev Portal**, all chapter jumps and representative party compositions, guided auto-run versus manual control, item icons, monster alert/engage, and full quest chains. Verify that auto-run pauses before encounters and that environmental steps are neither skipped nor duplicated.
5. Hook authoritative queries to the production AI, material reaction rules, combat HUD, encounter rates, world render layers, and dialogue — update one shared source of truth, never parallel values that drift.
6. Preserve actual 5.17 authored environments, camera angles, motion, audio, voices, scenes, interiors and floor plans. Use the new libraries for physical state and visual geometry only where they improve the existing assets.
7. Benchmark the unchanged release and feature-enabled candidate on desktop Edge and Android. Run the original 1,004 reported production regressions **plus** focused add-on and visual tests before any publish or replacement.

## Integration contracts not yet verified

- Coordinates and colliders: current Atlas uses a local `[-32,32]×[-32,32]` grid and +Y height; actual production chapters may not. Convert exactly once at the real scene boundary.
- Save: current Atlas stores extensive arrays in IndexedDB; production slots and timeline schema need an additive namespace and migrations.
- Authoritative quest IDs and boss species IDs: the local 10-quest graph is illustrative and **not** a declaration of the live game's canonical names.
- The plant shader needs WebGL, and Three.js still loads by CDN. No finished browser GPU/real-device FPS certification is claimed.
- Camera-facing character orientation, frame blending, collision-to-ground foot IK, interactive interiors, authentic professional art, and voice/score synchronization require separate original-site QA.
