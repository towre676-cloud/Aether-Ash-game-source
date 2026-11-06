# Ash & Aether — Living Grass v3, cross-session reconciled

**Status:** fully local source, tests, and directly inspectable offline interactive demo. **Not yet merged into or deployed to the live A&A game.**

## Open a working demo without installation

**`reconciliation-lab-offline.html`** is a one-file interactive ecology laboratory. Download and open it in a browser. It embeds the exact v3 `.mjs` source in a stable dependency-free bundle. It allows region/material/season/quality switches, walking, footsteps, harvesting, burning, watering, thirty-day recovery, separate NG+ timelines, and vegetation save export/import. The displayed combined physical values are computed by v3's real numerical engine. Material examples are illustrative and do not masquerade as the other session's 48-ground-material registry.

**`preview-offline.html`** is the original cinematic perspective artistic preview (v2) and can be opened directly without a server.

**`demo.html`** is the separate full Three.js/WebGL research scene. Run `python -m http.server 8765` inside this directory and visit `http://localhost:8765/demo.html`; this path uses a public Three.js CDN and requires network access.

## What the new code adds

- `ground-forge-compat.mjs`: surfaces/terrain adapter for Ground Forge's *actual* supplied material attributes and surface masks, without invented names or imports. Combined grip, noise, shielding, fire, conductivity, resonance and ecological suitability.
- `aa-game-integration.mjs`: game-owned source-of-truth bridge; exactly-once harvesting journal, timeline isolation, old v2 disturbance compatibility, host event adapters and settings.
- `reconciliation-lab-offline.html`: genuinely self-contained working visual/gameplay inspection using the v3 engine (built with `python build-offline-lab.py`).
- `CROSS_SESSION_RECONCILIATION_V3.md`: deployment boundaries, owner conflict avoidance, example real integration and acceptance matrix.
- `gpu-integration.test.mjs`, `reconciliation.test.mjs`: original tests plus cross-session code parity, save and safety tests.
- `grass-ecology.mjs`: dynamic season and substrate, rather than static/orphaned growth.
- `grass-renderer.mjs`: lower GPU instance reservation; contrast adjustment.
- `canvas-grass-fallback.mjs`: higher-contrast plant outlines.

## Verification

Run `node --test *.test.mjs` from this directory; no node dependencies need installing. **34/34 tests passing at package creation**. The offline lab was tested with Chromium by injecting the exact assembled HTML (local file/server navigation is blocked by the test sandbox), running scripts at desktop (1280×780) and mobile (390×844) sizes, and clicking Trample Grass with zero page-script errors. The original artistic preview is separately regression-tested.

Performance figures are not inferred from synthetic mocks or headless screenshots; real mobile and laptop FPS tests remain a release gate.

## Full instructions

Read `CROSS_SESSION_RECONCILIATION_V3.md` and the earlier `README.md` for core architecture and integrated ecology/renderer APIs. The main game must supply its authoritative camera/ground/region/weather/inventory/event/save hooks; this archive intentionally does not overwrite or counterfeit them.
