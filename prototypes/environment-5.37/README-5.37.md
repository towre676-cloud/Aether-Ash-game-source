# Ash & Aether — 5.37 Environmental Reconstruction

**Deliverable:** A shippable, namespaced 3D environment art module pack for a *real* Three.js game source checkout, with independent tests and a separate walkable visual review scene. This is NOT a Site deployment or a substitute campaign.

## What changed since the 5.36 work

The primary repair is architectural and spatial, not additional UI panels or random props:

- Roads are physically routed to building-facing **entrance aprons**, outside footprints and eaves. Route planning preserves exact endpoints, detours around structures on larger maps, and omits an impossible route rather than cutting through a house or obstructed doorway.
- Residence and forge meshes have two roof pitches, real doorway cutouts, dormers, sheltered entrance porches, recessed windows, shutters, corner bonds, decorative framing, chimney soot, gutters, and region-specific age. Roof geometry can be selectively hidden after entering a house while the interior's furniture and hearth remain visible.
- Walls and rooms have real architectural attachments: ribbed vaults, worn masonry, floor inlays, distinct dungeon mechanisms, tower buttresses, orchard canopy branching, and cultivated window greenery. Decoration is anchored to surfaces or gameplay features; routes and doors are kept clear.
- Instead of the flat ground treatment, **all 48 earlier Ground Forge materials** are now integrated as deterministic world-aligned albedo, normal, and roughness data textures, including true river silt, orchard loam, cinder, cobble, fractured rock, and phase surfaces. Material identifiers from the live world model take priority over the scene's regional defaults; map synthesis does not mutate world state. Uses 96px on battery/low, 144 medium, 192 high, 256 ultra.
- The same host terrain height field is used for the optional visual ground skin, road stones, buildings, and vegetation. Only the **visual** floor is replaced when explicitly authorized. Never remove or change the physics collision terrain.
- Six genuinely distinct native foliage morphologies (grass, sedge, fern, clover, flowers, reeds) use deterministic GPU instancing and host biomass/weather/terrain exclusions. Capacity: battery 360, mobile low 1,050, medium 3,100, high 8,500, ultra 16,500; the actual instance count can be lower for invalid or barren zones. Mobile keeps diffuse/normal/roughness and architecture textures rather than switching to flat color.
- Wet and night visual response, stable state-linked material aging, and original-visibility fallback; scene batches keep revealable roofs separate from indoor furnishings. Game systems continue to own camera, actors, collision, inventory, combat, encounter consequences, save timelines, and audio.

## Production installation — the actual game must supply its own source

The minimal production-only kit is in `production/modules/src/aa-env537`. It is deliberately namespaced and independently imports its own 8 `.mjs` modules; it DOES NOT import archived 5.32 game engine modules. **Never overwrite the current game's index.html, app entry point or gameplay modules with the archived 5.32 scaffold.** The safe staging CLI only adds these modules to an existing local checkout:

```bash
python production/INSTALL_ENVIRONMENT_ART.py /path/to/current/game/source
python production/INSTALL_ENVIRONMENT_ART.py /path/to/current/game/source --apply --expect-fingerprint <source_fingerprint_from_dry_run>
```

`--apply` is intentionally a two-step operation. It rejects stale fingerprints, pre-existing source collisions, and symlinked destinations. It only **copies namespaced art modules**; the game's owner must explicitly wire the renderer (see `production/PRODUCTION_MERGE_537.md`). Do not run it on an unrelated project.

Production import:

```js
import {createProductionArtBridge} from './src/aa-env537/production-bridge.mjs';
const art = createProductionArtBridge({
  THREE, scene:existingThreeScene,
  world:{
    heightAt:(x,z)=>gameTerrain.heightAt(x,z),
    obstacleAt:(x,z)=>gameCollision.obstacleAt(x,z),
    pathAt:(x,z)=>worldRoutes.pathAt(x,z),
    biomassAt:(x,z)=>worldEcology.biomassAt(x,z),
    materialAt:(x,z)=>worldGround.materialAt(x,z),
  },
  quality:mobile?'low':'high',
  replaceFlatGround:true, // ONLY when legacy flat visual can be hidden safely
  setOriginalVisibility:visible=>toggleLegacySceneryMeshesOnly(visible),
});
// When the host loads a scene with real world-coordinate authored anchors:
art.renderScene(currentAreaArtLayout,{region:'clay'});
// Call from the EXISTING animation loop:
art.update(deltaSeconds,elapsedSeconds);
// On an in-game building enter/exit:
art.onEnvironmentEvent({type:'building-visibility',anchorId:'inn',inside:true});
// On level unload: art.clear(); On renderer disposal: art.dispose();
```

The identifiers above describe REQUIRED host hooks; they are not statements that the inaccessible live game already implements those names. The visibility callback must affect only legacy decorative meshes, not colliders, skinned characters, actionable objects, or audio. When any draw fails, the bridge restores the original scene visibility. Disable `replaceFlatGround` if the game has a valuable textured ground surface already; otherwise its flat visual must be hidden before using a replacement skin.

## Evidence and replay

- `npm test`: **71/71 passing** — geometric routing, entrance protection, grass species, Ground Forge material data, mock-based texture construction/cleanup, renderer batching and ownership boundary, mock production bridge, original 5.32 adapter and gameplay boundary tests.
- `python -m unittest discover -s production/tests -v`: **6/6 passing** — transactional dry run / add / idempotency / collision / stale source fingerprint / symlink rejection.
- Renderer construction and texture synthesis executed as Node-level mock runs. **These are structural tests, not a real GPU benchmark, a phone FPS measurement, or verification of production render quality.**
- `preview/standalone-environment-5.37.html` is a one-file walkable scene review with inlined project art modules and remote Three.js (`cdn.jsdelivr.net` v0.180). It requires a WebGL browser and internet; it is *not* the full campaign. Touch pinch controls zoom and maintains the user-set distance; tap ground to walk; WASD to move; N night, R rain.

## The actual deployment boundary

The active Site `https://ash-aether-clay-water.towre676.chatgpt.site` is project `appgprj_6adf63724e5c8191bd55637b8ecd8d9a` and has been observed with source version 38 in its Library metadata on October 30, 2026. The public Site fetch returned HTTP 401 and its source editor was unavailable here. There was no A&A GitHub repository in the linked GitHub account. Accordingly, the visual overhaul **has NOT been merged or published into the current playable Site.** This package is the production-integration source handoff, not a deployment success receipt.

Once current source editing is available: stage modules; map actual APIs to the production bridge; inspect Ash city, orchard, undercity, Aether zone and dungeon in actual camera; verify doors, colliders, night lighting, mobile pinch zoom, battle transition and saved play; compare visual screenshots and frame timing; only then publish. The real game must preserve its existing combat/UI/music/saves. Replace the old renderer only after real-device review confirms the world no longer looks blank or blocky.
