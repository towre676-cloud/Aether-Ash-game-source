# Ash & Aether 5.8 — invisible character and graphics recovery

October 28, 2026. Trigger: user reports playable game in Microsoft Edge on a laptop, with invisible protagonist and possibly missing scene layers. No evidence establishes inadequate hardware or a specific Edge/driver failure.

## Confirmed game defects and repair

1. Prepared sprite canvases permanently replaced their original loaded images; blank readback/isolation could produce accepted 1×1 actor cells. Raw sources are now retained; invalid/empty actor preparation falls back directly to measured original image crops. All 128 original character poses are covered. Failed preparation does not erase an actor.
2. A foreground tree covers Riven's initial position while its roots are 2.69 tiles away, outside the previous1.5tile fade radius. Canopy-aware overlap now fades only foreground foliage hiding a traveller.
3. A terrain-loop guard skipped all outdoor cells, making frontier decorative effects unreachable. Detail overlays now survive the organic ground base without returning rectangular base stamps.

## Graphics handling

- New Standard / Compatibility mode, reachable on the title screen and Pause → Sound, display & controls → Graphics mode. Rebuild graphics also recreates working art from retained originals.
- Compatibility draws original image crops without atlas pixel readbacks, limits backing scale to1DPR/2Mpx, avoids primary canvas/CSS filters and lighting blend effects, uses vector terrain outlines without intermediate ground bitmaps, and simpler direct exterior artwork. Gameplay, navigation, inventory and save schema are unchanged.
- Standard mode retains full rendering, validates prepared cells, and no longer forces CSS brightness(1) at default brightness.
- One-time small canvas probe can choose compatibility for failed/blocked readback or failed filtering. Null/lost contexts are detected; context loss pauses the game, and restoration rebuilds compatibility graphics from retained originals.
- Both modes bound backing dimensions, including high-DPI and ultrawide layouts. No per-frame pixel readback was introduced.

## Verification

Full engine suite:621 passed /0 failed. Regression tests cover thrown/blank processing, a single blank pose, retained Image identity, repeated rebuilds, 128 measured fallback crops, backing size limits, probe failures, 2D context events, canopy overlap and terrain holes/trails without bitmap allocation.

Browser: new Riven opening and saved journey at position17.50,60.50 were visible in compatibility and standard modes. Switched between modes through the actual pause control; position and save stayed intact. Standard reported no atlas fallback in this browser. Default CSS filter was `none`; compatibility backing1363×936. Screenshot shows the reachable compatibility setting.

Limit: these browser checks are in the provided Chromium browser, not the user's Windows Edge/GPU session. The specific cause of that user's failure remains unconfirmed until retest. The compatibility route addresses concrete recovery gaps; it is not a claim that Edge is universally fixed.
