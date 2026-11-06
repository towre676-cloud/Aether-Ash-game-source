# A&A 5.37 — Production Source Merge Contract

## Source files, not a replacement web game

The package `modules/src/aa-env537/` contains eight import-closed ESM files: `production-bridge.mjs`, `environment-renderer.mjs`, `environment-plan.mjs`, `environment-detail-kit.mjs`, `environment-vegetation.mjs`, `ground-materials.mjs`, `ground-synthesis.mjs`, `util.mjs`. Place this folder under the CURRENT playable game's own `src/`; do not use the older 5.32 app entry point.

## Exactly where to wire it

1. **Scene load** — pass the current engine's real `THREE` and `scene`, the authored level's anchor IDs + positions + bounds, and existing `world.heightAt`, `obstacleAt`, `pathAt`, `biomassAt`, `materialAt`. Create one bridge per existing render scene, not per frame. Pass options quality per device. Calling `renderScene` builds visual meshes only; the game retains every collision mesh.
2. **Visual swap** — use an explicit `setOriginalVisibility(visible)` callback, which toggles old decorative environment groups but not floor collision, actors, triggers, enemies or other interactive objects. Enable `replaceFlatGround:true` only if the old flat **visible** floor is hidden, to avoid coincident floors and z-fighting. The bridge restores legacy visibility on failure.
3. **Building enter/leave** — forward `building-visibility` with the authoritative anchor ID and `inside`. This only controls grouped roof visibility, not player state or interior save flags. `door-visibility` controls the existing visual door mesh.
4. **Weather** — forward existing weather as `weather-mood` with `{night:0..1,rain:0..1}`. No invented weather clock. Game textures and ground maps get canonical material fields.
5. **Dungeon transition** — forward `renderDungeon` only on actual dungeon loads or `dungeon-room` for a room switch; forward `dungeon-solved` with the actual result so mechanism art reflects current state without generating rewards.
6. **Existing animation loop** — call `art.update(delta,elapsed)` once, and `art.clear()` on area unload. Do not create a second WebGL renderer, camera, controls, interface panels or input handler.

## Stop conditions

If the live game currently lacks a Three.js scene, no direct integration is possible until its actual graphics ownership is inspected. If its anchor format differs from `layout.anchors`, write a source-specific adapter rather than changing gameplay semantics. Do not invent APIs by guessing. If the old terrain has non-flat collision, make sure new art samples exactly that height field. Roof, window and floor skins are visual only; verify actual ingress, exit, controls and battle transitions before publishing. Any runtime error should keep legacy graphics visible.

## Launch QA for user-reported failures

- Walk five consecutive environments on phone (town, orchard, water, aether, dungeon): no empty giant color planes or accidental prop piles.
- Trace a route to each actual building entrance: every street meets an apron and no line cuts through building foundations.
- Enter and leave indoors: roof hides only for that anchor, interior remains legible, camera fits, doors and exits remain clear.
- Change rain/night: materials remain legible; wet stone and orchard loam visibly differ; no frame hitch during navigation or battle.
- Pinch-zoom on phone: manual zoom remains where set; opening a game tab does not reset it.
- Inspect mid-tier Android FPS/long tasks: disable only expensive ornamentation, not all textures, and never reduce gameplay visibility with the art setting.
- Test save migration, New Game Plus, battles, dungeon puzzle states and interactions through the exact production workflow.

### Project deployment status

Active Site project appgprj_6adf63724e5c8191bd55637b8ecd8d9a, version 38 as observed October 30, 2026. This deliverable has no access to the live source editor. No game file was replaced or deployed. Passing static tests do not establish that the production game looks better yet.
