# Ash & Aether — Vista & Presentation Upgrade v1

**Status:** original code prototype; NOT integrated with or deployed to the private A&A Site. Playable local 2.5D showcase is a **composition study**, not a production renderer or new game. It demonstrates authored sightlines, atmospheric layering, low-clutter UI, moving hero, aether casts and a boss telegraph. The Three.js host adapter is separate and compatible with existing scene ownership, but has not been tested in the real host source.

## Verified actual-gameplay YouTube references

1. iroGames: https://www.youtube.com/watch?v=9nHHNv506TY (2026-01-01)
2. MR.Boneflow: https://www.youtube.com/watch?v=8Mx-HYpk37M (2026-03-02)
3. Clutch ABHIJIT: https://www.youtube.com/watch?v=iYQjWxNqh8k (2025-12-29, launch walkthrough)
4. Married to Gaming: https://www.youtube.com/watch?v=PiJTWmgtgmU (2026-01-05, critical first-hand review)

The links and titles were checked; no frame-by-frame footage decoding is claimed. Design analysis also draws on app screenshots and published game mechanics. Do NOT import copyrighted assets, code, art, animations or sound from the competitor.

## What is implemented

- Original, read-only, deterministic camera-intent director with boss/aim/vista modes and optional camera control preservation.
- Adaptive visual quality governor with hysteresis and reduced-motion support; gameplay numerical logic remains unaffected.
- Semantic environmental art placement requiring the host's actual biome, obstacle, path, water and terrain classification.
- Three.js scene add-on: custom authored shrine, waterfall, forest edge, settlement, vista arch, boss arena; scene nodes are namespaced and safely disposable.
- Three.js visual FX for **confirmed** canonical combat events; deduplicated event IDs; reads world samples for visible response only.
- Self-contained interactive 2.5D HTML showcase for composition and feel (no downloads, network or external assets).
- Unit tests for host ownership and critical invariants.

## Run

Open `vista-showcase.html` directly in a browser, or use a local HTTP server. The preview is self-contained; the reusable modules are separate:

```bash
cd ash-aether-vista-overhaul
python -m http.server 8765
# open http://localhost:8765/vista-showcase.html
node --test test/*.test.mjs
```

Move with WASD/arrow keys or touch pad; cast with Space or CAST; Shift to dodge; E or top button changes chapter; BOSS triggers guardian. Canvas fallback intentionally has no external dependency.

## Host integration contract

```js
import { createVistaBridge } from './src/three-bridge.mjs';
const vista = createVistaBridge({
  THREE: host.THREE, scene: host.currentOutdoorScene,
  world: {
    regionAt: (x,z)=> host.world.regionAt(x,z),
    groundAt: (x,z)=>({y:host.ground.heightAt(x,z), indoor:host.world.indoorAt(x,z)}),
    obstacleAt: (x,z)=> host.world.blocksArtAt(x,z),
    nearPathAt: (x,z)=> host.paths.softMaskAt(x,z),
    waterAt: (x,z)=> host.ground.wetnessAt(x,z)
  },
  quality: host.settings.visualQuality,
  reducedMotion: host.settings.reducedMotion
});
// These are EXAMPLE API names. Replace ONLY after inspection of the actual host code.
vista.setLandmarks(host.world.authoredVistas); // Must be genuine scene-owned anchor data.
// Called in the existing host frame loop. The renderer, gameplay, and camera still belong to host.
const suggestion=vista.tick(host.frameDeltaSeconds, host.readOnlyPresentationState(),host.frameTimeMs);
// Only if the host camera authority explicitly grants access:
// host.camera.applyPresentationIntent(suggestion);
// Only confirmed unique game events, never replayed unconfirmed inputs:
// vista.onGameEvent(event,host.world.sample(event.x,event.z));
// On scene exit: vista.dispose();
```

### Integration gates before merge

1. Compare against ACTUAL newest A&A Site source and retain the existing 5.18+ (or newer) systems. Do not overwrite Ground Forge, Living Grass, Living World, Hydrophone, NPC navigation or game save schemas.
2. Reconcile coordinate conventions and art anchor placement. Never spawn in interiors, waterways, colliders, boss telegraph lanes or hidden room walls.
3. Give render camera authority to the existing camera engine, not a competing loop; this module returns suggestion values only.
4. Existing combat owns damage, state, drop tables, shielding, inventory and NG+; only confirmed event IDs generate visuals.
5. Profile mobile quality 30fps target and Edge desktop 60fps target; inspect GPU build, fog, alpha shadows, WebGL compile and fallback.
6. Run all characters, interiors, boss scenes, NG+ saves and existing gameplay regression suites, then stage/publish with editor auth.

**Private Site:** https://ash-aether-clay-water.towre676.chatgpt.site/ (returned HTTP 401 to the access used here). Historical metadata identifies Site project `appgprj_6adf63724e5c8191bd55637b8ecd8d9a`. This artifact does NOT claim site/editor access, merge, or publication.

## Independent package QA — October 29, 2026

- `node --test test/*.test.mjs`: **13 passing, 0 failing**.
- Source module syntax checked with `node --check`.
- Interactive preview inspected with Chromium via in-memory HTML loading: **1366×768 desktop and 390×844 mobile**, zero JavaScript page errors; cast and chapter selection responded. Mobile HUD spacing was corrected after screenshot inspection.
- `showcase-desktop.png` and `showcase-mobile.png` are captures of the *local original 2.5D composition study*, **not** real A&A gameplay or a representative final Three.js render.
- Live Three.js adapter rendering, GPU timing, gameplay regression, authored world anchors, Android hardware, and deployment are **not verified**.
- A browser attempt to inspect actual iroGames video timestamps hit YouTube's sign-in anti-bot gate. Gameplay video titles and published listing details were verified, but video frames were not inspected.
