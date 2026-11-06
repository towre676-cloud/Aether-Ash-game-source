# Living Atlas → existing Ash & Aether: integration contract

**State of access:** The current A&A site is known to exist as a live library Site project, but its editable application source and deployment service were not exposed in this session. No modifications to that site were made. The following adapter is provisional: its event IDs must be mapped to actual A&A source identifiers before use.

## 1. Safely integrate instead of replacing the campaign

1. Extract the actual game's save schema, quest IDs, character/monster IDs, spatial coordinate system, battle resolver, event bus, equipment schema, and state migration strategy from its current code.
2. Select a canonical adapter from game events to `AtlasWorld.dispatch()`. Remove demo-only `beginEncounter`/`engageVisible`/`resolveQuest` buttons for production; consume actual accepted A&A movement, battle and quest events. Failed skills must **not** mutate the landscape.
3. A&A remains the authority for player travel and rewards; `AtlasWorld` is authoritative for ecological, physical and mathematical fields. Neither side duplicates values that the other owns.
4. Use spatial chunk IDs to load only visible 32x32/64x64 fields. Avoid rebuilding the entire map on every single movement frame. GPU view reads physics state but may not mutate it.
5. Keep canonical stable material, species, item, NPC, quest, timeline, scene and provenance identifiers. Validate at build time and version the mapping. Preserve old-world saves via **additive namespaced extensions** rather than replacing their original fields.
6. Add the authored meshes, scans, art, motion, lighting volumes, lip sync, cinematics and score as proper assets. The numerical layer decides placement, state and behavior; authored assets decide visual quality. Existing game content takes precedence over generated substitutes.
7. Profile 30/60 FPS targets on actual Android/Edge/WebGL2 hardware; implement instanced region chunks, frustum culling, impostors and adaptive quality; preserve controls and accessible guided/manual navigation.
8. Ship behind a development toggle with before/after save diff, gameplay regression tests, visual smoke tests and rollback support. Merge only after an explicit beta sign-off.

## 2. Example interface (illustrative; only use matching event meanings)

```js
import {AtlasWorld} from './src/adventure.mjs';
const livingAtlas = AtlasWorld.restore(saved.livingAtlas ?? new AtlasWorld(2301).snapshot());

// After and only after a real quest was accepted by A&A:
livingAtlas.dispatch({kind:'QUEST_SLUICE_OPENED'});
// Game's actual accepted elemental skill:
livingAtlas.dispatch({kind:'ELEMENTAL_SKILL_CAST',x:16,z:14,element:'water',power:2});
// Query same real data for scene, battle, AI and traversal:
const state = livingAtlas.inspect(16,14);
const route = livingAtlas.pathfind({x:-16,z:5},{x:16,z:5});
// Additive extension to the actual A&A save:
saved.livingAtlas = livingAtlas.snapshot();
```

**Warning:** This demo maps some event kinds not yet confirmed in the real game. Do not assume the given `x,z` sample positions or `MONSTER_DEFEATED` are semantically compatible with the live project.

## 3. Acceptance gates for live deployment

- No loss of old A&A campaign saves, party composition, romance/quests, audio, input, skip/dev portal or chapter progress.
- 100% matching numeric authority for scene materials, spawn probabilities, environmental damage, harvest, river routes and timeline mutation.
- Every required quest completes without deadlocks, including guide/autoplay and manual mode.
- Match doors, rooms and building footprints; prevent floating characters, unusable stairs, impassable bridges and decorative static monsters.
- Define in-game material provenance, legible item icons, boss actions and environment shield feedback.
- Have deterministic replays and all regression tests pass across client builds.
- Validate browser FPS and memory empirically, not by source-code inspection.
- Credit/package licensed dependencies and original visual/audio assets before commercial release.

## 4. Visual production plan

Build a curated mesh/texture library by biome with coherent silhouette families, species-specific biological forms, weathered architectural motifs, hydrology/foliage materials, LOD variants, sound and collisions. Each artist-authored asset gets `mesh_id`, `material_id`, interaction `affordances`, provenance, authored bounding dimensions and collision profile. The simulation supplies placement density, disease/fire/wetness, Aether harmonics and time-dependent change. This is what can eventually produce thousands of unique-but-meaningful environment variants, rather than thousands of unrelated boxes.
