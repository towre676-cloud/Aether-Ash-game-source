# A&A live merge checklist — vegetation v6

Target private Site: `appgprj_6adf63724e5c8191bd55637b8ecd8d9a` (Ash & Aether: Clay and Water). **No live game edit is asserted.**

## Source ownership

- [ ] Game repository/authorized Site source revision obtained; preserve any 5.18+ changes from other sessions.
- [ ] Mount the vegetation module once in the host scene; no duplicate terrain or overlapping ground plane. Reuse existing Ground Forge authoritative material normals, heightfield and indoor masks.
- [ ] Bind `groundOptions` to original region material, path, floor/interior, flood, canopy and weather systems; do not guess Ground Forge IDs.
- [ ] Bind the canonical host camera world position and horizontal look vector to `cameraView` on each frame; test 360-degree turns and camera cutscenes for view-boundary popping.
- [ ] Enforce road, house, bridge, river, doorway, interior and encounter-area plant exclusions, including varying indoor floor heights.
- [ ] Connect gameplay hooks to canonical host events only after transactions are committed. Inventory harvest receipts must be idempotent across saves, NG+, reloads and event retries.
- [ ] Cross-check the game's environmental-shielding system and battle rules against vegetation `sample().combined`; do not mutate canonical combat calculations from renderer quality.

## Rendering evidence

- [ ] Load `three-integration-lab.html` from HTTP with WebGL and network; check console for shader errors.
- [ ] Measure actual WebGL draw calls, GPU timings or frame time at intended camera zoom, memory and mobile resolution; compare view culling enabled/disabled.
- [ ] Check blade silhouettes, fog, tone mapping, fog gradients, sunlight, tree shade and ground contact (flat, wet, sloped and interior).
- [ ] Test 720p desktop, 1080p desktop, Android low/mid, and accessibility reduced motion / high contrast.
- [ ] Ensure WebGL-context loss/failure can select the Canvas fallback without changing stealth, rewards or saved states.
- [ ] Disable/cut visual culling for fixed-camera scenes if it causes visible holes at extreme oblique angles.

## Delivery evidence

- [ ] Run original game test suite and vegetation regression suite.
- [ ] Prove previous save migrations, different main-character timelines and NG+ branches do not overwrite world memories.
- [ ] Record game source commit/revision, PR or Site deployment id and live preview URL only after verified authorized integration.
