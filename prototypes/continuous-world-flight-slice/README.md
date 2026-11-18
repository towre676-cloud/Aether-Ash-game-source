# Ash & Aether — Continuous World Flight Vertical Slice

**Development prototype — 18 November 2026. Not deployed to the live Ash & Aether Site.**

`index.html` is a self-contained WebGL2 prototype demonstrating an uninterrupted two-settlement journey. The invented *Ridgehaven* and *Southreach* positions are **slice-only test geography**, not verified coordinates from the authoritative live atlas. Lowbank is a known game location, but its coordinates here are also provisional.

## Play

Open `index.html` in a recent WebGL2-enabled Chrome, Edge or Firefox browser with hardware acceleration enabled. No install, network access, external CDN, or server is required.

- **Foot:** W / Up forward, S / Down backward, A/D steer, E enter nearby vehicle, F gather near a resource site, R follow a nearby journey objective automatically. Mouse drag changes the chase-camera look; mouse wheel changes follow distance.
- **Rover:** W throttle, S reverse/brake, A/D steer, Space handbrake, R follow the winding road to the airfield; stop before pressing E to exit.
- **Skylark aircraft:** W throttle, S slow, A/D bank, Arrow Up/Down pitch, Space vertical lift, Shift descend. Press L for automatic navigation and landing at the Ridgehaven runway (also works from the departure airfield). Press E after landing and stopping to leave.
- **Map:** M toggles the geographic map. Touch controls appear on touchscreens. The tiny red FPS display is deliberately retained.

## Authored content in this slice

The same x/z/y coordinate system renders both settlements, continuous terrain, a curved cart road, river crossing, farmland and orchard, a mill, stone cairns, work camps, cargo sites, hangars, two runways, hundreds of trees, carts in motion, roaming wildlife, a drivable rover, and a flying craft. The trail includes resources with gathering and market delivery consequences. It has no act/chapter screens or automatic scene jumps.

Terrain, road, river and scenery are generated deterministically from seeded functions. Mobile hardware automatically uses less geometry and vegetation. The 3D rendering uses vertex-colored meshes, sunlight shading and distance fog; it is not an AAA art asset pass, and the vehicle physics is prototype-level, not validated against all live-world collisions.

## Verified

- JavaScript parse: `node --check embedded.js` (JS extraction from the HTML; no dependency).
- Browser logic smoke: `python test_slice.py` using Playwright with a simulated WebGL API: boot, rover boarding/acceleration, resource gathering, aircraft takeoff, autoland near Ridgehaven, disembark, arrival/delivery, map toggle, no uncaught script errors.

The separate `python test_full_trip.py` test passes the **entire foot → road-driven rover → aircraft → landing → foot** route without any test teleports, using the same simulated rendering API. A separate real WebGL2 test (`python test_realgl_trip.py`, under `xvfb-run` on Linux) also completed the full journey without uncaught script errors. The scene rendered at approximately **10–13 FPS at 1280×720** and **16–20 FPS at 1024×576** under a Chromium SwiftShader *software renderer*. These are below target and cannot establish performance on actual desktop/mobile GPUs. Screenshots `flight-preview.png` and `destination-preview.png` are authentic captures of this prototype, not target-quality art.

**Not verified:** Premium visual fidelity, measured frame-time distribution/60 FPS on target hardware, native device input, integration with live v198 vehicle engine, actual persistent save data, map correctness for all 127 published regions, or absence of regressions in the published game. This prototype does not modify the live Site.

## Production integration route

1. Export/pin the current authenticated Site source and reconcile the **live** driving engine, camera, and terrain implementation (the GitHub v45 export is historical).
2. Map all verified town/scene IDs and region seams into a canonical atlas and validate reciprocal road transitions.
3. Port this slice's navigation and flight controller behind existing production input/render/save adapters, sharing world units and collision queries; do not replace working live rover code.
4. Replace the demonstration's authored test sites with canonically located terrain, settlement, ecology, NPC economy, and meaningful encounters; add quality-controlled art assets and LOD.
5. Measure actual desktop/mobile p50/p95/p99 CPU/GPU frame times through the complete foot → rover → flight → land → foot traversal; publish only after no severe stalls or save regressions.