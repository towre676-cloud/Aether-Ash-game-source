# Release 5.16 verification

Verified on 29 October 2026 against the assembled local Site preview. This record
covers automated checks, browser interaction and visual inspection. It does not
claim independent human playtesting or a measured 20–30 minute completion time.

## Automated release gate

| Check | Result |
| --- | --- |
| Entire repository test suite | **946 passed, 0 failed, 0 skipped**, across **129 distinct test modules**. No cancellations or TODOs. |
| Execution | One Node process per `.test.mjs`, up to four concurrent; 154.7 seconds total. All modules exited successfully. |
| Syntax | `node --check` passed for all 92 changed/new production JavaScript files. |
| Resource references | 546 literal relative JavaScript/CSS references across 113 changed/new JS, CSS and HTML files resolve after removing query/hash suffixes. |
| Whitespace | `git diff --check` passed. |
| Evidence consistency | The aggregate, individual JSON results and 129 test-log count blocks agree. No count summaries are missing. |

The complete evidence is in [test results](release-5.16-tests.json) and
[test log](release-5.16-tests.log). These totals already include the focused tests;
they must not be added to the focused counts again.

Coverage includes reachable furnished rooms and legacy positions, investigation
and regional-work state, origin branches and outcomes, guide routing and Full
assistance through musical chapters, old and new save data, milestone guardian
responses, guardian equipment, personal signatures, finite resource use,
component targeting, battle serialization, movement, labels, responsive battle
layout and local observation recording. The developer-session suite exercises
336 fixtures and baseline victories against all 24 chapter guardians. Baseline
victories establish mechanical reachability, not fun or balanced human difficulty.

## Browser verification

The Site preview was served by `sites-preview` from the checked-out source. All
interactions used the actual page controls; runtime state and saved journeys were
not injected from browser evaluation. Developer fixtures are temporary and leave
ordinary journey saves untouched.

### Character entry

The normal character-entry screen presents the roster, selected character,
biography, beginning and Continue/New telling actions first. Growth/body history,
cross-life connections and starting approach were all closed disclosures on
entry. The screen had no horizontal document overflow at 1363 pixels wide.
Existing preview saves were not replaced to conduct this check.

### Chapel, assistance and combat

- Launched **04 Chapel of Rain → Play the Chapel investigation**. The correct
  level-7 crew, Chapel focus and optional soot objective appeared.
- Opened **Clues & destinations**, requested the first optional hint and observed
  the three-level hint UI. The destination list included people, physical bell
  tools and optional local work.
- Selected the soot clue and used **Walk there**. The crew followed the route;
  an incidental exploration handoff and a visible-creature encounter occurred.
  This was a navigation/control check, not a complete browser playthrough of the
  investigation. The repair and aftermath branches are covered by automated tests.
- Verified the objective control stops guidance, producing the explicit
  “Trail stopped” notice and an unpressed objective control.
- Enabled **Full assistance**, observed its on state and explanation, and reached
  the Herald approach using the normal guide and **Approach pack** controls.
- Inspected the painted Chapel bells, arches, carved seats, window, diverter and
  hearth, the common stone floor and faded runner in compatibility graphics.
  Actor occlusion faded foreground furniture while retaining its footprint.
- Inspected the new compact command shelf and the live guardian rule explaining
  the return ring, Break and Guard. An actual Attack changed the Herald's HP and
  selected the authored Sable attack frame and Herald hurt frame. The renderer's
  DOM diagnostic reported `sable / attack / frame 10` and
  `herald / hurt / frame 10` in that observation.
- Opened Personal in an ordinary encounter. Sable's **Pass the opening** signature
  appeared in the picker and technique descriptions. After the active character
  changed, Iona's distinct restorative signature appeared on her Personal control.

### Responsive battle layout

The existing interface harness embeds the real developer game. These are browser
viewport checks, not emulated phone hardware, touch latency or GPU benchmarks.

| Viewport | Command bounds `(x, y, width, height)` | Result |
| --- | --- | --- |
| 1363 × 936 | `(475, 675.6, 880, 252.4)` | Bottom shelf; no horizontal overflow. |
| 1280 × 720 | `(392, 459.6, 880, 252.4)` | Bottom shelf, all bounds within viewport; no horizontal overflow. |
| 390 × 844 | `(104, 509.2, 278, 326.8)` | Wrapped touch-sized commands, readable rule cue, joystick separate; no horizontal overflow. |
| 844 × 390 | `(502, 54, 330, 328)` | Side console reserved for short landscape; no horizontal overflow. |

The party HUD also remained within the measured portrait and landscape widths.
Screenshots were inspected after each responsive change. The game correctly
paused on the harness focus change and resumed through its normal Return control.

### Authored motion and scenery

The new animation review loaded **37 motion poses and eight props**. The Sable,
Herald and Moonveil attack controls changed their live sequences. Individual pose
selectors then displayed Sable's swing, the Herald's slam and Moonveil's release,
using the production crop and drawing helpers. Subjects were complete and clear
against the transparency checkerboard.

The existing scene-composition review showed the furnished home and new hearth
in standard graphics, and the mangrove origin showed the new reed-and-stone banks
along existing scenery sites. The actual game separately verified compatibility
rendering in the Chapel. No timing sample from these views is presented as a
performance benchmark.

The new art is intentionally scoped to armored Sable, the Ash Herald and Moonveil
Moth. Courier clothing, rear-facing travel, casting, other heroes and other
creatures retain their previous artwork where the new selection is unsupported.
See [authored-art notes](../AUTHORED_ART_V16.md),
[generation record](release-5.16-art-generation.json),
[asset receipt](release-5.16-art-receipt.json) and
[focused art tests](release-5.16-art-tests.log).

### Observation export

Used **Playtest notes → That felt good → Export observations** through the real
interface. A nonempty JSON download contained the correct Chapel fixture,
13 events, an elapsed time of 34 seconds, zero dropped events and the test marker
at 33.4 seconds. The exported schema is `ash-aether.playtest/1`, release `5.16.0`.

The [sample export](release-5.16-observation-export-check.json) is an automated
interface exercise. Its “delight” marker was deliberately clicked to test the
control; it is **not human feedback or evidence of enjoyment**. The recorder is
local, bounded and active only in developer playtests. Its elapsed time includes
pauses, so interpretation requires the accompanying event record.

### Browser errors

No site-origin console errors appeared in the checked game, entry, animation,
responsive-harness or composition tabs. The browser extension logged metadata
delivery errors from its own `chrome-extension://` content script; those are
recorded here separately and are not game exceptions. Earlier preview reloads
during active source edits were excluded from the stable-build inspection.

## Proof images

These are the exact screenshot bytes inspected during browser QA:

- [Integrated Herald encounter and compact battle shelf](release-5.16-herald.jpg)
- [Three authored action poses](release-5.16-authored-motion.jpg)

## Remaining evaluation

The implementation and mechanical checks are complete. Independent players have
not yet completed the connected Chapel session, so completion time, comprehension,
difficulty, enjoyment and the best hint cadence remain evaluation questions.
[The Chapel playtest procedure](../CHAPEL_PLAYTEST.md) defines that next evidence
collection. Mobile hardware performance and a complete browser traversal of all
24 chapters were outside this release's manual checks.
