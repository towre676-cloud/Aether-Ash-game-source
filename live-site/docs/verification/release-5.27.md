# Release record — A&A 5.27.0 · Pinch and keep

Source baseline: `765a5ae2a32c9e07fefbcb532f3fb728b46fb8bb` (5.26.0).
Prepared 2026-10-29.

Two-finger touchscreen pinching now sets an absolute world-camera zoom. The
chosen level takes priority over automatic framing and is remembered in this
browser on this device.

## Release status

- **Automated release gate: PASSED**. 1,440 cases across 183 modules; zero
  failures, skips, cancellations or TODO cases. The final results are recorded
  in [the final gate](release-5.27-final-tests.json) and its companion log.
- **Browser verification: PASSED** for the representative checks in
  [the browser receipt](release-5.27-browser.json). Native multi-touch was not
  available in the browser API; physical iOS/Android pinch input is not claimed.
- **Publication: AWAITING NATIVE SITES RECEIPT**. This pre-publication record
  describes the verified source. The subsequent Sites response supplies the
  authoritative saved version, source commit and deployment status.

## Player behavior

Place two fingers on the game world and spread them apart to zoom in, or bring
them together to zoom out. Zoom is continuous between 50% and 300%. The point
under the finger midpoint remains anchored while the lens changes. HUD text,
menus and touch controls retain their normal screen size.

The selected level survives travel, room changes, conversations, encounters,
viewport changes and page reloads. It is stored independently from the journey
save as the versioned `ash-camera-zoom-v1` device preference. Pinching again
changes the saved level. Display & motion also contains an accessible World
zoom slider and an explicit Use automatic zoom button.

Manual zoom is an absolute camera scale rather than a multiplier applied to
the scenic camera. This prevents the every-frame automatic camera calculation
from changing the user's chosen level. Position still follows the player; in
battle, it follows the selected living companion, with a living-party fallback.
Returning to automatic zoom removes the manual preference and resumes the
existing scenic framing.

## Touch ownership and compatibility

A world touch resolves as a tap on release, allowing a second finger to begin
a pinch without the first finger issuing movement, an interaction or an attack.
Mouse and pen primary presses retain their immediate behavior. A single-finger
drag, a cancelled gesture and the remaining finger after a pinch cannot turn
into accidental taps. Third-contact replacement rebases without a zoom jump;
reversing away from either zoom limit responds immediately.

Only contacts that begin on the world canvas participate in a pinch. Joystick
and HUD touches keep their existing ownership. Movement inputs are released
when pinching starts; the current route, guide destination and combat order
are preserved. World updates pause for the gesture, then continue. Scene
changes, blur and page hide cancel gesture ownership safely. Storage failures
are contained without breaking the camera.

Implementation: [world-gestures.js](../../dist/game/engine2/world-gestures.js),
[camera-zoom.js](../../dist/game/engine2/camera-zoom.js),
[scene-camera.js](../../dist/game/engine2/scene-camera.js),
[renderer.js](../../dist/game/engine2/renderer.js) and
[main.js](../../dist/game/engine2/main.js).

## Verification and limits

The new focused coverage includes 15 gesture cases and eight camera cases.
They cover inward/outward ratios, arbitrary starting zoom, anchor invariance,
clamp reversal, multi-contact lifecycles, cancellation, touch/mouse/pen
separation, malformed input, pointer-capture failure, saved preferences,
scene-specific camera behavior, battle focus, automatic reset and 900 frames
without manual zoom drift. Existing scene-camera, camera-window and touch
control cases remain in the complete suite.

Browser checks used actual menu controls, native keyboard movement, the native
slider and read-only rendered camera attributes. At 200%, manual zoom held
through Cinderfall movement, the chapter-two Bridge scene, a page reload into
Security, and the Sentinel battle. The settings continued to show Manual zoom
· 200%. Clicking Use automatic zoom and resuming changed the rendered camera
mode to automatic. Observed canvas sizes were 500×824 and 1363×936 CSS pixels.
These checks exercise the real persistence and camera path shared by the pinch
handler; they do not substitute for a physical two-finger device test.

The first complete run reported 1,438 passing cases and two failures. Both
failures were an isolated test harness evaluating the production scene callback
without its new `worldGestures` dependency. The test now injects that dependency
and asserts gesture cancellation on the Sentinel story portal and a later scene
change while retaining all reward and receipt assertions. Its five focused
cases pass. The original gate and fingerprint are retained unchanged; a new
fingerprint precedes the final complete gate.

Proof: [battle camera](browser/aa-battle-zoom-5.27.jpg) and
[manual zoom controls](browser/aa-zoom-controls-5.27.jpg).

## Delivery scope

All runtime edits, cache keys and the test-harness correction were frozen
before the final complete gate. The delivery seal checks final runtime bytes
against `runtime-freeze-5.27-final.json`, the passing gate and the browser proof.
The expanded static directory contains 2,139 files totaling 262,222,671 bytes,
leaving 6,212,785 bytes under the hosting limit. The source helper owns the final
commit, push and archive; publication retains the Site's existing private
audience.
