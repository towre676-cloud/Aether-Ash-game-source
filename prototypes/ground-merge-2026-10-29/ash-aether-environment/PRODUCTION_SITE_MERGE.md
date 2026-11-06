# Ash & Aether — Production Site merge instructions

**Target (reported by parallel A&A session, not independently inspected here):** A&A 5.17, Site project `appgprj_6adf63724e5c8191bd55637b8ecd8d9a`, source head `070c9f58c75202871f51651c0009659cd385db3f`, Site source version 20. Confirm the current editable source head before any merge, because parallel sessions may have advanced it again.

**Status:** Ground Forge, Grass v2 and the Living World laboratory are merged in this portable source package; THIS IS NOT A PUBLISHED SITE CHANGE. The current session's available connections expose only the public projection of the Site and a 401 for its published URL, not its editable source. No authorized Site write action was available. Never overwrite the game with this laboratory.

## Three-way merge contract

A&A production source is authoritative. Additive source paths here:

- `lib/ground/ground-materials.mjs`: all 48 materials and analyzers
- `lib/ground/ground-synthesis.mjs`: reproducible PBR texture generation (no network calls)
- `lib/ground/ground-dynamics.mjs`: persistent environmental changes
- `lib/ground/ground-runtime.mjs`: Three.js material conversion; wire into existing render pipeline carefully
- `lib/grass/grass-ecology.mjs`, `grass-renderer.mjs`, `grass-state.mjs`, `living-landscape.mjs`: v2 grass and state
- `src/production-ground-adapter.mjs`: NEW map-scoped, idempotent and transactional bridge for the actual game

**Do not transfer `src/world.mjs`, `src/view.mjs`, `index.html`, `src/world-ground-bridge.mjs` or `src/reconciled-runtime.mjs` over existing production files.** Those are standalone numerical lab source and not the current campaign's canonical simulation. The 3D lab remains in this package for testing and comparison.

## Production call-site guidance (host APIs are illustrative, not claims about current source)

```js
import {createProductionGroundAdapter} from './src/production-ground-adapter.mjs';
const ground = createProductionGroundAdapter({onEnvironmentEvent: effectsBus.notify});
// Register each real map after map generation. surfaceAt must read the
// actual game geometry/layout and return {id,built,grassAllowed,structuralTag}.
ground.registerMap(map.id, {
  columns:map.groundColumns, rows:map.groundRows,
  cellSize:map.metresPerCell,originX:map.originX,originZ:map.originZ,
  surfaceAt:(x,z)=>map.getAuthoredGround(x,z)
});
// After canonical actor movement (once, with globally unique event ID):
ground.footstep({mapId:map.id,x:actor.x,z:actor.z,actor:actor.id,
                  speed:actor.speed,stealth:actor.stealth,eventId:movementEvent.id});
// During canonical battle resolution, after existing damage is known:
const finalHit=ground.augmentResolvedHit(canonicalHit,{mapId:map.id,x:target.x,z:target.z,element});
// After the cast is accepted, once per event, mutate the ground:
ground.impact({mapId:map.id,x:target.x,z:target.z,element,strength:normalizedPower,eventId:castEvent.id});
// Add a new namespaced field. Never replace the existing save root:
save.environment ??= {};
save.environment.groundV1=ground.save();
```

Call `syncMap(map.id)` after a bridge is repaired, a wall collapses, a floor is rebuilt or a New Game Plus timeline explicitly changes the map's authored material. Feed `surface(...)` state to the existing renderer and grass-exclusion mask; do not create a second coincident terrain mesh or alter collision coordinates.

All game event IDs must be unique across maps and persisted saves; this is required for exactly-once ground mutations. `augmentResolvedHit()` is idempotent and does not call the host's canonical combat resolver. Avoid running `GroundWorldBridge.dispatch()` against production, because that belongs to the separate lab simulation.

## Production acceptance gates before publishing

1. Fetch the *current* Site editable source and create a rollback snapshot. Confirm the 5.17 source SHA above (or use the later live head as the merge base).
2. Land the additive files and adapt only known production call sites. Never replace existing map generation, campaign content, NPCs, guided objectives, boss resolver, rendering pipeline, UI, audio or camera control.
3. Add deterministic tests that prove indoor floor polygons conform to the actual building mesh and thresholds; no grass on walls, floors, doors or dry pavement; no doubled ground planes, materials, battle damage or duplicate footsteps.
4. Test save migration from real production saves and New Game Plus, including old saves that have no `environment.groundV1` field; preserve unknown future fields, unknown map IDs and achievements.
5. Run actual game tests and inspect screenshots on Edge and Android at near/mid/far cameras, including wet floors, normal maps, shadow bias, transitions, draw calls and memory spikes. Existing lab tests do not substitute for this.
6. Publish to existing Site project only after these checks and confirm its deployment ID, source commit and a live gameplay smoke test. Roll back from snapshot on failure.

## Tested in this package

Run `node --test tests/*.test.mjs lib/ground/tests/ground.test.mjs lib/grass/*.test.mjs` for all numerical, shader-source, event and adapter tests. Browser GPU quality and production deployment are unverified in this runtime.

## Repeatable additive source staging (verified in this handoff)

The new `PRODUCTION_MERGE_TOOL.py` is intentionally a **fail-closed module installer**, not a full code-rewriting or publishing tool. It preserves all existing campaign, camera, audio, renderer, map, movement, boss and battle source files. It **will not** attach hooks until real production APIs are inspected.

1. Obtain a current export/checkout of the **editable** production A&A Site source. Record its current source head and create a backup. The public `.txt` projection or the laboratory `index.html` is not an adequate substitute.
2. Run `python PRODUCTION_MERGE_TOOL.py PATH_TO_SITE_SOURCE` from this package. This is a read-only plan that prints a SHA-256-protected `fingerprint`, the ten additive module paths and any filename collisions. A production source change invalidates the fingerprint.
3. Stop and manually reconcile **any** collision; the tool refuses to overwrite files from other sessions. If clean, run `python PRODUCTION_MERGE_TOOL.py PATH_TO_SITE_SOURCE --apply --expect-fingerprint THE_PRINTED_FINGERPRINT`.
4. Verify `state=modules_added_not_wired`, **not** "deployed". After inspecting the real source, connect the ground adapter through the existing map registry, combat resolver, actor movement events, save/load and vegetation renderer, following the integration contract above. All hooks must be applied only once; do not create duplicate floor meshes or combat modifiers.
5. Run the production project's tests plus the additive-module tests, test actual old/new saves and New Game Plus, visually inspect Android and Edge, and only then publish to **the same Site project**. Record deployment receipt and rollback snapshot.

Seven additional installer tests cover dry-run safety, idempotence, collision rejection, stale source protection, symlink rejection and SHA-256 content-change detection. Together with the pre-existing 62 numerical and adapter tests, the package now has **69 local passing tests**. These are **not** results from the latest private Site production tests. The browser environment blocked local navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`, so visual GPU QA and live deployment are unverified.

## October 29 hardened bridge (75 passing tests)

The adapter now preserves ground snapshots for unloaded maps and restores them on re-registration, so streaming and New Game Plus do not discard changes. It also round-trips unknown environment-save extensions and uses strict world-coordinate checks. The vegetation mask excludes roads, floors, rivers and architecture by default. Source staging remains **not production deployment**. See `MERGE_UPDATES_2026-10-29.md` for changes.

## October 29 material-normal QA continuation (83 passing tests)

Ground synthesis now uses physically scaled normals and cross-boundary samples to eliminate texture normal seams between adjacent equal-density chunks. This changes normal map pixels and lighting response but does not change terrain geometry, collider coordinates, player position or saved ground fields. It also provides a `normalReliefMetres` parameter for art direction. A new normal-map contact sheet helps detect material-level relief inconsistencies before the real browser QA. When production builds mixed-resolution chunks, explicitly verify LOD boundaries; exact matching is only guaranteed at equal physical texel pitch. An authored map rebuild through `syncMap` is now atomic if the source layout is temporarily invalid.
