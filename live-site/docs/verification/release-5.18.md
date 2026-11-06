# Release 5.18 — environment art and session reconciliation

## Verified result

The environment collection is integrated with the full published campaign
5.17 source. This release retains that campaign's behavior while expanding
its scenery, plants, shelters, furnishing, materials and building detail.

The merged runtime checkpoint is
`c7d60794566ede52b9e91026a5110afc8758419c`. The incoming campaign commit is
`070c9f58c75202871f51651c0009659cd385db3f`. The release contains both histories.
Only verification records and a gallery clarification were added after the
tested runtime checkpoint. The final publishing helper records the complete
source commit used for the archive.

## Automated regression

`release-5.18-tests.json` and `.log` record **1,051 passing tests in 143
modules**, with zero failures, skipped tests, cancellations or missing count
summaries. Each module ran directly in a separate Node process, with at most
four simultaneously. Total elapsed time was 162.332 seconds.

The earlier art checkpoint recorded one delivery-size failure. Its evidence
and the successful correction remain in
`environment-5.18-premerge-tests.json` and `.log`. The unchanged 256 MiB
hosting-size gate passes in the final combined suite.

The optional-image loader tests cover successful loading, bounded retry and
omission of unavailable new art, honest progress counts, and continued failure
for required legacy images. Existing drawing fallbacks remain reachable.

## Complete-world art audit

`environment-5.18-world.json` compares the merged game against the incoming
campaign construction. Source world data, all 167 expanded scenes, initial
journey state and the nine answering-network devices across five interiors
match that baseline exactly. The 32 authored landmarks remain intact.

| Drawing category | Potential world placements |
| --- | ---: |
| Regional scenery | 4,109 |
| Ground fragments | 4,118 |
| New canopies | 907 |
| Existing furnishings | 68 |
| Existing utility objects | 257 |
| Outdoor shelters included above | 77 |
| Existing route markers | 241 |

These are potential placements before camera culling and story visibility,
not simultaneous on-screen objects. There are no floor, functional approach
or authored approach clearance violations. Every one of the 94 runtime prop
motifs is selected somewhere in the prepared world. Two additional motifs
remain deliberately staged for real authored landings and gates.

The final dependency audit traverses 134 modules, finding no missing imports
or cycles. All 40 registered image files exist.

## Artwork and delivery

The inventory contains 124 motifs: 96 props, eight canopies, eight ground
surfaces, four water surfaces and eight architectural accents. Sixteen
unchanged original PNGs occupy 36,135,738 bytes in the source archive.
Sixteen quality-95 WebP delivery files occupy 10,575,052 bytes. Pixel
dimensions and every alpha value match the original images. Color encoding
is explicitly lossy; the originals are retained for future editing.

Both sets of hashes, source crops, measured root anchors, special source
parts and generation prompts remain recorded under `development/art/`.

## Browser review

The review used the managed desktop preview and the production renderer.

| Check | Observed result |
| --- | --- |
| Main developer entry after the merge | Startup completed; both new art review links appeared; chapter exploration opened with the new campaign purpose text |
| 50001, Standard, final WebP files | Mixed village/woodland canopies, civic detail, facade accents, ground fragments and traveller fading rendered; screenshot retained |
| 2025, Standard, final WebP files | Rooted wetland scenery and quiet shaded water rendered |
| 5, Standard, final WebP files | Town scenery, fitted chimney/facade detail and existing actors rendered without a canvas error |
| 294, Standard, final WebP files | Interior rendering and walking remained functional; this was not a full network-device interaction test |
| 2035, Compatibility, final WebP files | Frost trees and stone props rendered, including traveller overlap fading; screenshot retained |
| New-art comparison in 2035 | The collection switched off and back on; fallback rendered with no canvas error |
| Final gallery | All 96 props, eight facade accents, eight canopies, eight ground materials and four water materials reported loaded |

Earlier art curation review also covered Standard caldera 2015, crystal 2030,
dryland 2000, storm 2050, spore 2045, Riven 50009 and clinic 50, plus
Compatibility marble 2055. That review motivated reduced adjacent repetition,
sparse vents, habitat-specific selection, mixed canopy orientation and softer
bank treatment.

An inspection tab stalled during navigation after a long gallery session.
Closing the review tabs and opening a fresh studio tab restored inspection.
The fresh tab displayed the final glacier scene and completed the graphics
mode/art comparison checks. Captured console errors on that fresh page came
from the browser extension's metadata reporting; no game render error was
observed there. This record does not claim a continuous campaign playthrough
or physical-device frame-rate measurement.

Visual records:

- `environment-5.18-village.jpg`
- `environment-5.18-frost.jpg`

## Continuation

`docs/SESSION_RECONCILIATION_5.18.md` records the campaign merge and exact
living-vegetation research references. The grass studies remain separate
research deliverables. The eight next-art briefs include the habitat and
animation handoff, with an explicit Canvas adapter and ecology/save
validation step before future game integration.
