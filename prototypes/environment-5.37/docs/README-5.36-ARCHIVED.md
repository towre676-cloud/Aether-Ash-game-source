# ASH & AETHER — ENVIRONMENT ART REBUILD 5.36

**Code deliverable / visual-source overlay. Not an update to the published game.**

This is a substantial **3D environment renderer plus a conservative adapter** built against the user-provided 5.32 source bundle and designed to merge forward into the active 5.35+ game. It does not create another dashboard. The viewer is for art review and is not the game. The older 5.32 package alone was missing the renderer: it supplied placement coordinates and delegated the final rendering to the host.

## What is actually different

- **Architecture, not primitive placeholders.** Dimensional walls with real geometry cutouts for arches/windows, angled tile-textured roofs, eaves, masonry plinths, structural bracing, attached lanterns, real thresholds, well shells with hollow water rims, bridges, towers, ruined sanctuaries, working forges, memorials, orchards, and gardens.
- **Inhabited building interiors.** Oak floorboards and dado joinery, fireplaces, shelves, seating, workbenches, hanging framing, and barrels all placed for a reason, with the entrance corridor kept clear.
- **Geological and botanical texture.** World-coordinate terrain skin optionally follows host `heightAt`; authored route geometry follows the same ground, masked native vegetation uses two crossed tapered blades instanced by the GPU. Groves and canopy branches use varied organic geometry; no arbitrary floating empty-space filler objects.
- **Dungeon architecture and visible response.** Traversable open arches, ribbed vaults, engaged pillars, course-cut stone floors, distinct floodgate/resonance/counterweight/heat/root/wind/memory/pressure-room structures; mechanism success animates the relevant art, and solved-room state can be restored from the real game state.
- **Static mesh batching.** Combines static meshes by *material* after baking their world matrices, leaving interactables, responsive objects, transparent glass/water, and instanced grass distinct. Structural mock benchmark on a representative test town: **2,055 raw draw-call candidates → 29 after batching**, with 1,450 instanced grass tufts in high quality. **Not a GPU FPS benchmark.**
- **Original systems remain authoritative.** No changes to collision, character control, camera, quests, inventory, combat, rewards, audio, saves, New Game Plus or main rendering loop.

## Files

`src/environment-plan.mjs`: host-respecting, deterministic, minimal-connected-path environmental art planning. `src/environment-renderer.mjs`: actual Three.js geometry, materials, plants, dungeon render, resource cleanup and batching. `src/scene-composer.mjs`: revised 5.32 base that stops treating every void as a new prop. `src/spatial-3d-integration.mjs`: adapter that owns the one renderer instance when given `graphics.THREE` and `graphics.scene` and delegates gameplay back to the host. `patches/*.diff`: unified diffs against the **archived 5.32 sources**. `test/*`: structural renderer and gameplay-boundary tests; not pixel screenshots. `preview/index.html`: game-space viewer for art QA, not a reimplementation of the campaign.

## Merge rules for the current playable Site

**Do not overwrite the current 5.35+ Site with 5.32 files.** The repository inspected in this session is 5.32, while the Site Library reports a later source version. First obtain that current production source in the Site-authoring session and review its scene/dungeon integration. Add the **two new modules**. Apply the authoring and adapter changes as selective patches, retaining current movement, camera, saves, UI, audio, battle, inventory, scenes and newly implemented systems. The patches are reference diffs, not guaranteed clean applications to 5.35+.

The host should provide `graphics.THREE`, `graphics.scene`, `world.heightAt(x,z)` for alignment, and optionally `world.pathAt`, `world.obstacleAt`, `world.biomassAt` plus `graphics.setLegacySceneryVisible(false)` to hide only the **legacy scenery meshes** once the new renderer is attached successfully. The integration calls the old gameplay methods **before** visually rendering; a renderer failure retains the original scenery. Without an existing Three scene, the adapter remains a gameplay-only pass and does not claim a visual update.

Use `graphics.replaceFlatGround=true` only after the host can hide its old flat ground **visual**; do not remove the physics terrain or collision mesh. Otherwise scenery and material overlays retain the original ground. Set `graphics.environmentQuality='low'` on mobile, `high` on desktop. Pass the existing world's canonical `biomassAt`, paths, obstacles and solved dungeon state so textures and vegetation correspond to gameplay. Call `.tick(delta, elapsed)` from the current game animation loop, `.showDungeonRoom(dungeon,index)` only on a scene transition, `.clearVisuals()` on scene unload, and `.dispose()` only when destroying the host renderer. Do **not** create a duplicate camera or input loop inside production.

Example host setup from a codebase already using the 5.32 adapter:

```js
import {createSpatialAuthoringLayer} from './src/spatial-3d-integration.mjs';

const art = createSpatialAuthoringLayer({
  world,
  audio,
  graphics: {
    THREE,
    scene: existingScene,
    environmentQuality: matchMedia('(pointer: coarse)').matches ? 'low' : 'high',
    enableAuthoredEnvironment: true,
    replaceFlatGround: false, // true only after safely hiding flat ground visuals
    setLegacySceneryVisible: visible => toggleOldSceneryOnly(visible),
  },
});

// The host must call these only on actual scene/dungeon loads.
art.composeScene(authoredSceneSpec); // source site must match authorScene spec
// On dungeon load: art.composeDungeon(dungeonSpec);
// On a solved mechanism: art.act(room, verb);
// Every existing host frame: art.tick(deltaSeconds, gameTimeSeconds);
```

This assumes your existing game exposes `world`, `audio`, `existingScene`, and `toggleOldSceneryOnly`; the names are placeholders for genuine host references, not new services. For a different 5.35+ API, merge semantics rather than inventing function names.

## Run tests

In the full replay bundle `npm test`: **54 Node tests passing** after this pass (36 existing base checks and 18 new checks). All new geometry construction checks use a lightweight `THREE` scene mock. It validates code branches, semantic structure, batching and cleanup, **not** GPU shading, actual visual quality, FPS or the latest live game.

## Open the optional 3D visual review scene

From the full bundle folder (or an overlay folder with the host modules present under `src`):

```bash
python -m http.server 8080
```

Open `http://localhost:8080/preview/` in a WebGL-capable browser. The review page uses a pinned Three.js module from jsDelivr, so it needs an internet connection. Mouse drag to orbit; WASD to walk; touch drag to orbit, tap ground to move, pinch to zoom and keep that zoom. Scene choices are at the bottom, not a dashboard. Do not treat the preview as an installed game patch.

## Live deployment status and limits

The user's active Site is `https://ash-aether-clay-water.towre676.chatgpt.site` (Library source version 38, live on October 30). This conversation's attempted independent page fetch returned HTTP **401**. The available GitHub connection contains no matching A&A repository and this conversation has no permissioned Site-code write tool. **No live Site code was changed.** The overlay is ready to pass to the session that can read/write the production app. We have not run a production-device performance or screenshot regression check.

## Before publishing — launch-blocking visual QA

Inspect actual gameplay, at minimum: city exterior, indoors with a visible door and exit, river crossing, natural orchard, dungeons for at least 3 mechanisms, daylight and night, battle transition and both phone and desktop. Reject a scene if buildings visibly float above terrain, paths are obstructed, windows have duplicate flat walls behind them, undercity rooms are filled by dashboard panels, doors teleport to geometry elsewhere, props are distributed by empty-space sampling, exterior shape lacks believable depth, or FPS degrades enough to impact running/battle controls. Keep fallback to the old scenery until the new renderer has run with the live scene for all of these.
