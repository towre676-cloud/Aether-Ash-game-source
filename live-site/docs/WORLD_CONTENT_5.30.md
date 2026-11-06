# 5.30 — Readable terrain, reachable controls, tangible campaign content

The regular adventure now distinguishes blocked terrain from walkable floor with dark material, masonry bodies, and low boundary edges. Outdoor scenery continues beyond the navigable layout into surrounding terrain, ridgelines, and vegetation. House walls and partitions use the structural collision mask; room floors cannot paint over blocked cells.

The touch layout follows the visible viewport during mobile address-bar changes, browser zoom and panning, orientation changes, and safe-area updates. A Reset view action sits beside the D-pad, with Reset view & controls in Pause. The 3D camera now uses lens zoom at a fixed viewing angle. Pinch framing preserves its ground focus within a bounded view; the reset restores automatic zoom and centers the camera. UI controls keep their own scale and visible-screen anchoring.

The content pass adds 310 available native props across 139 scenes, with additional active-commission apparatus and repaired refuge visuals. Chapter-specific machinery includes gates, winches, sluices, lenses, bells, archive readers, lamps, heaters, vents, assembly benches, and phrase stones. Camps, merchants, dispatch ledgers, instrument stations, guardian arenas, clues, and workstations receive physical scenery. Hidden rewards retain their original discovery rules.

Native campaign mechanisms now share the origin controls' physical input path. Holding or dragging previews a mechanism without changing inventory or quest state. Completion invokes the original interaction. Consequential choices remain explicit, with one-shot state/scene/range-guarded actions; interrupted or stale manipulations cannot pay resources or choose a branch. Routine mechanical choices use compact anchored actions, while spoken dialogue retains its normal presentation and full journal record. All past-life origins retain their separate progression.

Authored patrols with per-creature positions now render even when their pack has no separate xy coordinate. This corrects 43 previously invisible authored patrol definitions.

Verification evidence is retained in verification/. The checks cover actual house zoom ranges and projection, phone viewport offsets and safe areas, exact floor/blocker masks and material contrast across all 167 scenes, original save immutability, native mechanisms and ordered notes, resource-bearing projects, explicit choice lifetimes, actual object-state geometry changes, and native patrol positions. The cloud browser uses the software 3D fallback; device GPU performance is not measured.

The full release regression passes 189 modules and 1,489 tests. Browser house checks cover 50% and 300% zoom, both reset paths, and movement after recovery. Relocated machinery also has a low visible control at its exact native interaction tile, connected to and animated with the main apparatus.
