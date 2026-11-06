# Release verification — A&A 5.22.0

## Outcome and scope

This release replaces accumulated independent decoration with shared spatial
composition and retains the playable content merged in 5.21. It uses existing
painted assets, contextual smaller fallback drawings, and bounded layout changes.
It does not claim that every scene has been individually hand-authored.

The shared outdoor plan groups natural forms by bank and canopy family, places
at most two relevant work props at actual workplaces, and reserves full visible
silhouettes against buildings, paths, doors and interaction courts. The former
automatic extra scatter and forced neighbour-by-neighbour prop variety are gone.
Cinderfall changes from 77 craft props / 35 trees / 58 ground accents to
10 / 7 / 4; its authored focal landmark remains. Forest changes from 95 / 53 /
103 to 17 / 19 / 8. Counts are measured placements, not a claim of visual quality.

Repair stock, listening probes, workbenches, stables and gardens now use the
same spatial reservations. Dry burrows are low earth and boards; the domestic
versions describe floorboards and underfloor maintenance. Electrical repairs
do not use wind-vane art; archive gates do not use fountain art. Each retains
its original claim IDs, tool requirements, rhythm, rewards and save history.

Compatibility and Standard share actual projected building geometry. In both,
the underground service hatch is a stairwell. Ground Forge's extra decorative
base wash is disabled while its numerical fields and accepted effects remain.
Residents avoid building ground without changing player collision. The starter
home and Sable's clone retain all ten furnishing IDs and open a three-cell aisle;
walkable floor increases from 41 to 56 cells within the original outer room.

Detailed rules, before/after counts, semantic corrections, home layout and
service audit are in [outdoor-composition-5.22.md](outdoor-composition-5.22.md).

## Final automated gate

The frozen release passed **1,250 actual cases across
166 modules**, with zero failures, skips, cancellations or pending
cases. Every module ran as a separate Node process; actual final test summaries
were counted, rather than substituting module counts for case counts.

- Invocation: `node development/verification/run-release-tests.mjs --prefix docs/verification/release-5.22-final`
- Machine receipt: [release-5.22-final-tests.json](release-5.22-final-tests.json).
- Full output: [release-5.22-final-tests.log](release-5.22-final-tests.log).
- Elapsed: 209.002 seconds.
- Finished: 2026-10-29T17:20:07.050Z.
- Source baseline: `862fd386bb5b7c24f51414d4312fe9490002803f` (Site version 23).

The initial non-final run was deliberately interrupted for visual-review fixes.
It is labelled as interrupted and is not counted as a passing gate. No runtime
files were changed after the final gate began. The module graph was normalized
to 5.22.0 before it began: 90 browser files, no stale references to changed code.

Coverage includes all seven origin routes and returns, campaign progression,
combat, saved state/import validation, the integrated Armory/Atlas/Ground/audio/
travel systems, architectural geometry, actual crop/canopy bounds, shared plan
identity, constrained-room work access, old-save landing repair, and canvas
state/fallback handling. Canonical checks independently complete all 166
original repairs, verify their unchanged rewards and reject repeat rewards.
All previous affordance IDs remain available across all 167 prepared scenes.

The generated-service audit confirms 288 reachable services, 101 stables,
93 regional records and all 23 previously available regional work IDs. It
finds zero cross-installer stationary-service overlaps, zero outdoor-service
overlaps with scenery/repair rectangles, zero stables on painted trails, and
zero NPC routes through building ground across six day periods. Witness Vault
retains its document press. Letter Attic's pre-existing regional-work omission
and Market/Catwalk's absent optional stables remain documented limitations.

## Browser verification

The managed Sites preview served the exact final runtime. The actual game used
an isolated Developer portal fixture; no ordinary journey was overwritten.

| Observed action | Result |
| --- | --- |
| Launch combined content | Chapter 1 opens with the expected three-person practice crew, 650 credits and integrated environment |
| Walk north through the square | Position changes from 24.50,42.50 to 24.50,40.58; the relocated listening interaction becomes available |
| Listen through the floor | The real evidence appears, survey state changes, and the quiet approach becomes selectable |
| Prepare a quiet approach and walk to the repair | Position reaches 26.72,39.54; the Burrowed causeway interaction is available |
| Listen and tap low → middle → high | Shortcut opens, credits change 650 → 658, Tonic recovery is reported, and repeated reward actions are disabled |
| Town studio, Standard and Compatibility | Shared roofs, fronts and doors agree; the nearby service entrance remains a small stairwell |
| Starter home, both modes | Complete bed/kitchen/dining groups remain; walking from 21.5,8.5 reaches 23.7,10.0 through the cleared aisle |
| Rook worksite frontage | A small foundry work group sits at the workshop; the inspection repair uses electrical art, with compact stock and probe |
| Forest composition | Regional natural forms use the shared restrained groups and the route remains visible |

Screenshots in `browser/` include the before view, the final game view, completed
repair UI, Standard town, Compatibility frontage, starter home, home aisle, and
workshop. These are direct browser captures, not generated mockups. The studio
uses the production renderer plus Ground, Atlas, services and advancing NPCs;
its old page query in the screenshot URL does not choose the module revision.
The HTML loads the normalized 5.22 module graph.

Browser checks confirm these representative views and interactions. They do not
constitute a manual playthrough of every chapter or device/FPS certification.
The all-scene checks are automated geometry, availability and routing checks.

## Delivery identity

- Expanded assets: **261,862,002 bytes** (249.73 MiB).
- Hosting limit: 268,435,456 bytes; headroom: 6,573,454 bytes.
- Files in `dist`: 2105.
- Deterministic path/file SHA-256 aggregate: `8583ad6494405be3ec72631c9ea73a6c8b8c7f8877ded656ad11b3c6bcf7dca8`.
- Per-file hashes: `development/reconciliation/frozen-delivery-5.22.json`.

The source helper owns commit/push and packaging. The native saved Site version
maps the pushed commit to the published archive. This report records the tested
bytes before that commit; its pre-commit Git HEAD is the published baseline.
The existing owner-private audience is preserved.

Project: `appgprj_6adf63724e5c8191bd55637b8ecd8d9a`.
Destination: https://ash-aether-clay-water.towre676.chatgpt.site
