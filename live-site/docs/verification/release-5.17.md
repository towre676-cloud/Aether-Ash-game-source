# Release 5.17 verification

Verified on 29 October 2026 against the assembled local Site preview. This release
connects the campaign's purpose, selected traveller, physical repairs and community
outcomes to the final Choir encounter and the return home. The evidence below
separates automated mechanical coverage from the particular paths checked in the
browser. It does not claim a complete human campaign playthrough.

## Changes covered

The shared purpose is to bring the stolen voices home and let the city live
without continuing to steal them. Chapter-specific reasons and the selected
traveller's promise now appear in the field, Clues & destinations, and Pause.
The remembered narrative lead survives combat-party changes; old saves fall back
through their recorded origin and crew without inventing an earlier choice.
Milestone home visits and the final conversation acknowledge actual progress.
Recognition of the city's work precedes the private recording choice, and neither
community support nor the selected lead determines that choice.

Five physical works connect that purpose to existing campaign tasks: the Chapel
return, independent reactor heat, two public water readings, distinct mountain
replies, and the assembly's outward contact. Their devices, gauges and local
pipes reflect saved state. The guide can perform their staged interactions after
the native prerequisites. Only independent heat is a new main-path requirement
before chapter eight's guardian; the other works remain optional preparations.
Old chapter-eight victories receive only their already-established heat outcome,
with separate migration provenance. Other optional repairs are not invented.

The final guardian can receive four bounded kinds of help from actual completed
works, explicitly activated services and civic outcomes:

| Contribution | Mechanical consequence against the Choir |
| --- | --- |
| Return | Adds 1.2 seconds to the first warning. |
| Care | Halves each crew member's first direct Choir hit. |
| Witness | Extends the first correctly completed two-voice interruption from three seconds to five. |
| Commons | The first paid Guard grants each living crew member six additional MP and removes eight strain. |

The guidance panel names the qualifying sources beside the exact effect. Multiple
sources do not stack the same contribution. Spent uses persist inside the saved
battle context. The ordinary two-voice guardian rule remains in force, and no
optional-contribution count gates victory or either personal ending.

A separate, narrow connection lets a qualifying peaceful creature passage protect
already-carried cargo on the actual district's route. It requires living,
withdrawn creatures, real care or trust, no crew harm or stolen tool, and matching
settled encounter records. It is single-use and cannot protect a shipment accepted
afterward. It creates no body drops, free cargo or other supplies.

Completed local works also produce short, distinct replies through the existing
Clay and Water instrument. Playback is finite, follows the music-volume setting,
waits during dialogue and other full-screen activity, and cancels scheduled notes
when paused or when the scene or journey changes. The tones are a digital model,
not measured hydrophone recordings or new character voice performances.

Implementation contracts and scope are recorded in
[campaign purpose and homecoming](../CAMPAIGN_PURPOSE_5.17.md),
[answering works](../ANSWERING_NETWORK.md), and
[city contributions and peaceful shipments](../CITY_ANSWER_SYSTEM.md).

## Automated release gate

| Check | Result |
| --- | --- |
| Entire repository test suite | **1,004 passed, 0 failed, 0 skipped**, across **137 distinct test modules**. No cancellations or TODOs. |
| Execution | Each `.test.mjs` ran in its own Node process, with up to four processes concurrently; **156.23 seconds** total. Every process exited successfully. |
| Syntax gate | The integrating pass checked all **75 changed/new production JavaScript files** with `node --check`. |
| Resource references | The integrating pass resolved **658 literal relative JavaScript/CSS references**, removing query/hash suffixes before checking their targets. |
| Final syntax checks | `node --check dist/game/engine2/main.js` and `node --check dist/game/engine2/journey-help-ui.js` passed after the final UI work. |
| Whitespace | Final `git diff --check` passed. |
| Evidence consistency | The aggregate JSON, all 137 individual results and all 137 log summary blocks agree. No count summary is missing. |

The complete retained evidence is in [test results](release-5.17-tests.json) and
[test log](release-5.17-tests.log). Focused checks are included in these totals;
their counts must not be added again.

The full suite ran before the final UI-only visibility and layout corrections.
Those corrections received the final syntax checks and the browser checks below;
the complete suite was not rerun afterward. The final game entry points use
`main.js?v=5.17.3` and `quality-polish.css?v=5.17.4`.

### Coverage relevant to this release

| Test module | Passing tests | What it establishes |
| --- | ---: | --- |
| `answering-network.test.mjs` | 14 | All five works through actual Full-assistance routing, path traversal and `World.interact`; reachable furnished-map placements; the reactor gate; both water-reading orders; honest migration and rejected fabricated/stale interactions; compatibility drawing. |
| `campaign-purpose.test.mjs` | 7 | Distinct causal reasons across the 24 chapters and seven leads; stable selected identity; earned evidence; milestone visits; old-save and private-choice boundaries. |
| `campaign-homecoming.test.mjs` | 5 | Seven beginnings converge with their kit, civic history and assistance intact; milestone visits survive saves; community recognition precedes both personal endings. |
| `city-answer.test.mjs` | 7 | Exact earned sources, pure reads, lead fallback, optional help, malformed-context rejection and privacy of the personal ending. |
| `city-answer-battle.test.mjs` | 6 | Actual warning time, damage protection, two-voice opening and MP/strain changes; consumed uses remain spent after restore. |
| `peaceful-shipments.test.mjs` | 5 | Real peaceful encounter evidence protects matching carried cargo once; invalid or later cargo is excluded; no invented body drops. |
| `network-audio.test.mjs` | 8 | Finite note budgets, actual completed-work replies, volume/mute, suspended-instrument retry, cancellation and no ordinary-update repeats. |
| `dev-session.test.mjs` | 7 | All 336 chapter/stage/lead fixtures restore, reachable objectives remain available, and all 24 isolated guardian baselines resolve through paid commands. |
| `runtime.test.mjs` | 15 | Existing world, campaign and legal resource-paying guardian regression coverage remains passing. |

The wider suite also covers saves, ecology, economy, personal signatures,
milestone guardian rules and rewards, navigation, movement, presentation and
existing audio. Fixture construction exercises the real staged repair paths; it
does not insert repair completion marks. These checks establish implemented
behavior and mechanical reachability, rather than player comprehension,
enjoyment or balanced human difficulty.

The read-only integration review found no concrete defect in the earned-source
display, battle restore, network audio or renderer wiring. In particular,
`saveValue()` retains the battle context, save preflight rehearses a separate
clone, and `Battle.restore()` retains `used` and `careUsed` without recomputing
contributions. The local developer recorder identifies its format as
`ash-aether.playtest/1` and this release as `5.17.0`; that tag is not independent
human playtest evidence.

## Browser verification

The integrating pass checked the actual game in Compatibility graphics through
the Site preview and its constrained-iframe layout harness. The following are
the observed browser paths, with their limits stated explicitly.

### Rook: chapter eight purpose and walking assistance

Rook's chapter-eight purpose, personal promise and Clues & destinations content
were inspected. Full assistance was enabled and the crew followed the route.
An ordinary wild encounter interrupted the walk. This browser check did **not**
complete the three reactor work stages or the Crown encounter manually. The
complete staged heat proof, prerequisite gate and guardian fixtures are covered
by the automated checks described above.

### Mira: earned help and the Choir

Mira's chapter-24 view displayed the actual **Return, Witness and Commons**
sources earned by that developer fixture. It did not invent Care support.
The normal approach control opened the Choir encounter. The live first-Guard
contribution notice reported the six MP and eight strain effect, and the first
warning contribution notice reported the additional 1.2 seconds. The automated
battle tests separately assert those state changes and their single-use behavior.
This browser observation does not claim a completed Choir victory or manual
verification of every possible source combination.

### Visibility and responsive help panel

Browser QA exposed three presentation issues that were corrected: the purpose
line inherited a hidden display rule, the open help panel could sit beneath touch
controls, and short or medium-height viewports needed a panel fixed within the
viewport. The open-help HUD now has z-index 7 above touch controls at z-index 6.
Long content scrolls inside the bounded panel.

The measurements below are from the **real game iframe**, not phone-hardware
emulation. Bounds are **left, top, right, bottom**, in CSS pixels.

| Viewport | Document width | Help-panel edges | Measured entry-point versions |
| --- | ---: | --- | --- |
| 390 × 844 | 390 | `(12, 397.75, 370, 752.21875)` | Main `5.17.3`, CSS `5.17.3` |
| 844 × 390 | 844 | `(14, 14, 374, 376)` | Main `5.17.3`, CSS `5.17.3` |
| 1280 × 720 | 1280 | `(14, 14, 374, 706)` | Main `5.17.3`, CSS `5.17.4` |

All measured document widths matched their viewports, and all panel edges stayed
inside them. The 844 × 390 panel had a client height of 360 and a scroll height of
691, keeping its longer content internally scrollable. The last CSS change
extended the fixed-panel height breakpoint from 520 to 800 pixels. It applies the
verified short-landscape treatment at laptop heights; it leaves the recorded
portrait and short-landscape geometry unchanged. The 1280 × 720 measurement was
taken with that final CSS revision.

The [layout receipt](release-5.17-browser-layout.json) preserves these measurements
transcribed from the direct read-only browser geometry outputs and identifies the
version used for each check.

## Proof images and evidence limits

Both retained screenshots are **Mira chapter-24 captures from an earlier browser
checkpoint**, before the final responsive-only CSS adjustment:

- [Mira's chapter-24 purpose](release-5.17-purpose.jpg)
- [Actual earned support sources](release-5.17-earned-support.jpg)

They document the purpose and earned-source presentation at that checkpoint.
They do **not** show the final responsive geometry. The final screenshot could
not be synchronized from the browser; the shared disk was full at the time. The final
layout evidence is the measured receipt above. No Rook screenshot or new exported
human observation record is claimed here.

No full human campaign traversal, hardware emulation, measured mobile performance,
long-session audio evaluation or player-balance study was performed for this
release. The new narrative still uses the existing subtitle/voice system; this
release does not claim newly recorded performances. The bounded browser checks
and automated full-repair/guardian coverage are complementary evidence, not a
substitute for independent playtesting of the complete connected journey.
