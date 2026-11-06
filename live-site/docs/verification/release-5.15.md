# Release 5.15: stable exploration camera and reliable foot contacts

This release builds on the 5.14 movement pass. It adds an outdoor camera window
and corrects missed or misplaced ground contacts when an update crosses a foot
plant. Both changes are original JavaScript for the existing Canvas engine.
The source research, pinned references and implementation boundaries are recorded
in [Classic game source study](../CLASSIC_ENGINE_STUDY.md).

## Changes

### Exploration camera

[`camera-window.js`](../../dist/game/engine2/camera-window.js) keeps small movements
inside a stable viewing window. Each axis follows only far enough to bring the
composed target back to the window edge. The radii are 4.5% of the usable CSS
viewport, capped at 44 horizontal and 28 vertical pixels, then converted to world
coordinates using the current composition zoom. Measured HUD bands and the right
panel reduce the usable area. Invalid or nearly collapsed views bypass the
helper without inventing a camera frame.

The renderer enables this target adjustment only in outdoor `field` mode with
no active battle and with `cameraWindowEnabled` not explicitly disabled. Interior,
conversation and battle modes retain their existing composition targets. Existing
`sceneCamera` logic supplies zoom and composition; existing `cameraFollow` supplies
interpolation. The helper has no additional timer or persistent state.

### Ground contacts

[`character-motion.js`](../../dist/game/engine2/character-motion.js) exposes the
existing distance-clock increment as `strideAdvance`, before the four-pose phase
wraps. It is zero for stopped, blocked and teleport updates. This metadata does
not change phase timing, gait selection, facing, sprite frames or actor positions.

[`ground-contact.js`](../../dist/game/engine2/ground-contact.js) now enumerates every
planted phase boundary in the update interval and interpolates the corresponding
world position along the resolved movement segment. This fixes updates that
cross a landing phase and finish beyond it, and avoids stamping every contact at
the segment endpoint. Crossing both feet in one accepted update is supported;
alternating lateral offsets are retained.

Callers without `strideAdvance` use a forward modulo difference limited to half
a cycle. Invalid phase histories, inconsistent advances and discontinuous or
nonfinite positions emit nothing. Idle, teleport and indoor updates refresh the
history without creating marks or a later backlog. A resumed moving update may
emit a plant it actually crosses. Material selection, lifetimes, rendering and
the 54-mark history limit are preserved.

### Movement studio and delivery

The Movement studio adds **Stable window** and **Centered follow** choices using
the production renderer. Its canvas metadata exposes the current camera and
selected camera mode for inspection. The isolated fixture now uses the outdoor
`field` scene key while retaining its unique location and title: its previous
`movement_studio` key was classified as an interior, suppressing outdoor camera
and contact behavior. Journey saves remain outside this practice fixture.

Main entry, renderer, contact/motion dependencies and studio module references
are advanced to `5.15.0` where changed so a cached 5.14 renderer is not reused.

## Automated verification

The completed result is preserved in
[release-5.15-tests.json](release-5.15-tests.json), with per-module output in
[release-5.15-tests.log](release-5.15-tests.log).

| Measure | Recorded result |
| --- | ---: |
| Test modules executed | 118 |
| Tests reported | 872 |
| Passed | 872 |
| Failed | 0 |
| Skipped | 0 |
| Missing count summaries | 0 |
| Elapsed wall time | 156.11 seconds |

The recorded method executes each existing `.test.mjs` module in a separate Node
process, with up to four processes running concurrently. The aggregate uses each
module's reported test counts. All 118 processes exited successfully; the JSON
contains no failed modules. These are the saved full-suite results, not a count
of file-level wrappers from a combined test-runner invocation.

The full run includes these directly relevant suites:

| Suite | Tests | Relevant coverage |
| --- | ---: | --- |
| `camera-window.test.mjs` | 10 | Opt-out preserves authored frames; small moves, long travel, reversal, zoom, viewport/HUD changes, stationary settling at 30/60/120 Hz, and invalid inputs. |
| `character-motion.test.mjs` | 14 | Existing facing/gait/registration behavior plus unwrapped advance and zero advance during stops, blockage and teleports. |
| `ground-contact.test.mjs` | 10 | Crossed landing phases, two plants in one update, wrap, legacy poses, endpoint deduplication, invalid jumps, stops, teleports, interiors, lifetimes and bounded storage. |
| `player-locomotion.test.mjs` | 8 | Existing movement speeds, normalized diagonals, path vertices, collision handling and interruptions. |
| `follower-motion.test.mjs` | 7 | Existing trail continuity, corners, reversals, starts, teleports and bounded histories. |
| `motion-realism.test.mjs` | 5 | Existing actor scale/registration and camera decay. |

The contact regressions use actual `characterPose` updates rather than synthetic
final-frame labels. Four-second diagonal traces beginning at phase 1.3 produce
the same counts and world positions at **10, 15, 30, 60, 120 and 144 Hz**:

| Trace | Contact count | Spacing along travel | Alternating lateral offset |
| --- | ---: | ---: | ---: |
| Walk at 2.65 world units/second | 15 | 0.725 world units | ±0.075 world units |
| Run at 4.2 world units/second | 21 | 0.8 world units | ±0.075 world units |

The rate comparison checks emitted events without advancing their visual
lifetimes, so these are total generated contacts, not simultaneously visible
marks. Material lifetime rules are checked separately.

## Browser verification

The managed preview served this checkout at `http://terminal.local:4173/`.
The UI checks used the cloud Chrome browser and a 1363 × 936 viewport on
2026-10-29. This is a desktop preview check, not a physical-device benchmark.

### Movement studio

The corrected outdoor fixture loaded its original character art and reached
**Ready · no journey saves**. The camera comparison used the actual canvas
diagnostic attributes after native keyboard input:

| Observation | Player x, world tiles | Camera x, renderer coordinates |
| --- | ---: | ---: |
| Stable window, initial rest | 12 | 576 |
| Stable window, short right input and release | 12.420000000000002 | 576 |
| Centered follow selected at the same player position | 12.420000000000002 | 587.1015280833968, moving toward the centered target |
| Centered follow, next short right input | 12.630000000000003 | 599.4831739359597 |
| Stable window restored, sustained right input and release | 15.148739999999936 | 686.4344004517764 |

These samples establish that the stable mode holds the camera during a small
move and follows during sustained travel, while centered mode starts following
the small displacement. They are asynchronous UI samples rather than exact
input-duration or frame-rate measurements. Camera y remained 384 and zoom
remained approximately 1.44 for these horizontal checks.

The eight-direction tour rendered Sable with companions in Standard mode, then
Iona with companions in Compatibility mode. The compatibility tour reported
`run`, `moving`, a finite pose/camera and no canvas error. The saved
[Movement studio screenshot](release-5.15-studio.jpg) shows that running state,
the party and the camera selector. The automated traces above, rather than a
single screenshot, verify foot-contact counts and positions.

### Main game and guardian smoke check

The development portal opened the Chapter 1 guardian fixture with its separate
level-4 practice crew. The interior encounter rendered, guidance stopped at
**A guardian holds this place**, and **Approach pack** entered the Sentinel
battle. The [battle screenshot](release-5.15-battle.jpg) shows the guardian and
all three party members in the scene with the command panel beside them.

An **Attack** command resolved: the visible Sentinel health changed from
418/418 to 379/418 and the battle displayed its recovery prompt. The checked
preview-origin error log query returned no entries. Browser-extension metadata
errors appeared in the unfiltered browser log; they were not game-origin errors.

This pass did not replay dialogue, the entire campaign, or every hero/graphics
combination, and did not test a physical phone. Existing automated framing and
state regressions supply the broader coverage reported above.

## Source study and limits

The [source study](../CLASSIC_ENGINE_STUDY.md) examines public reconstructions of
Donkey Kong Country for SNES and Legend of Mana for PlayStation. It records the
inspected commits, specific routines, project provenance and license boundaries.
These repositories reconstruct retail programs; they are not official releases
of the original development projects. No commercial ROM, game assets, leaked
material, original assembly or reconstruction code was imported for this pass.
Repository licenses do not establish rights to the original commercial assets.

The Mana reference informed the separation between a follow window and the
displayed camera. DKC's persistent animation state and timer remainder handling
informed examining the whole update interval. The new contact algorithm is an
independent implementation using Ash & Aether's existing distance clock.

This pass changes visual following and contact placement. It adds no drawn
animation frames, authored turn sequence, footstep sound system, collision rule,
movement speed, combat rule or save schema. Four-pose locomotion and mirrored
horizontal facing remain the delivered artwork's limits. The source study also
discusses additional turn/menu observations that are not implemented features.

Automated geometry and event checks do not establish subjective game feel,
historical console fidelity, sustained frame rate, or physical-device behavior.
Any browser findings added above should identify their actual environment; they
do not stand in for a full campaign playthrough or hardware performance testing.
