# Release record — A&A 5.26.0 · Room to play

Source baseline: `d88e0bec24d39793d57a95bcfe722a04b82e4932` (5.25.0).
Prepared 2026-10-29.

This release gives actors and nearby decisions more room in the field view.
It combines a shared label budget, a smaller encounter invitation, grounded
body motion, local ordinary-patrol formations and a quieter landscape readout.
The existing Canvas2D campaign and the recovered Grass and Vista integrations
remain the host for these changes.

## Release status

The complete gate and representative browser checks are finished. Publication
is performed only after this verified source is pushed and packaged.

- **Automated release gate: PASSED**. 1,417 cases across 181 modules; zero
  failures, skips, cancellations or TODO cases. Elapsed time: 213.332 seconds.
- **Browser verification: PASSED** for the representative scenarios recorded
  in [the browser receipt](release-5.26-browser.json).
- **Delivery seal: PASSED** at 19:54:28 UTC. The final 2,135 files and
  262,186,232 expanded bytes match the pre-gate runtime fingerprint exactly.
  The [delivery fingerprint](../../development/reconciliation/frozen-delivery-5.26.json)
  records the gate, proof hashes and 6,249,224-byte hosting headroom.
- **Publication: AWAITING NATIVE SITES RECEIPT**. This pre-publication record
  deliberately does not claim a saved or deployed version. The subsequent
  Sites operation supplies that authoritative receipt.

## Implemented behavior

### Field names share the available space

The renderer admits at most two field labels below 600 CSS pixels of width and
three on wider views. Threats and the current interaction have priority over
secondary objectives, exits, story contacts, creatures and ambient names.
Distance limits remove remote text; a small retention preference reduces
switching between similarly placed secondary labels. One source and one
category can each occupy only one slot. Actor faces and the measured field
card are excluded from placement, and a label is withheld if no safe candidate
remains.

Normal interaction text and its story alias share a source identity. A nearby
story contact can retain a small diamond when its nameplate is not selected.
Building exteriors use the underlying portal identity, so cloned scene data
does not turn the currently approached entrance into an unrelated secondary
label. The label selector does not change the world's interaction targets or
the guidance destination.

Implementation: [field-labels.js](../../dist/game/engine2/field-labels.js),
[label-layout.js](../../dist/game/engine2/label-layout.js) and
[renderer.js](../../dist/game/engine2/renderer.js).

### Encounter invitations reveal detail in place

The handoff shows the first complete sentence when one is available. Explore
here and Continue route remain direct actions; Approach pack is also direct
when an actual pack is present. The native **Threat, rewards & preparation**
disclosure contains the complete brief, reward hint, movement guidance and
Crew setup action. Opening it does not create another modal window.

Enter and Space activate the disclosure without reaching the game's Pause
shortcut. Arrow keys retain their existing movement behavior. Its measured
bounds update after disclosure changes and resize, and hidden cards provide no
label obstacle. Victory receipts retain the existing earned rewards,
comparisons, bearer/slot choices and canonical equipment transaction.

Implementation: [field-journey-ui.js](../../dist/game/engine2/field-journey-ui.js)
and [field-journey.css](../../dist/game/engine2/field-journey.css).

### Weight transfer settles at the existing foot plants

The small procedural body offset now holds a short planted interval around
phase 0 and phase 2 of the existing distance clock. A squared-sine transfer
leaves and returns to the baseline with zero velocity. Walking has a longer
stance than running. Authored directional frames, facing, world travel,
footfall timing and maximum motion offsets are retained. Reduced motion keeps
the additional offsets at zero.

The following measurements use each gait's existing full travel speed:

| Measurement | Walk | Run |
| --- | ---: | ---: |
| Travel speed, tiles/s | 2.65 | 4.2 |
| Existing footfall cadence, steps/s | 3.655172 | 5.25 |
| New planted interval, ms | 65.660377 | 22.857143 |
| Existing peak lift, px | 0.38 | 1.15 |
| Existing peak sway, px | 0.25 | 0.55 |
| Previous lift velocity across a plant, px/s | −4.363564 → +4.363564 | −18.967366 → +18.967366 |
| New lift velocity across a plant, px/s | 0 → 0 | 0 → 0 |

An implementation comparison with the baseline sampled 2,832 poses across
both gaits, four travel directions and 30/60/120/144 fps. Every non-transfer
pose field matched exactly, including position, heading, frame, contact,
phase and stride advance. The focused tests cover both feet, smooth joins at
all stance boundaries, and unchanged travel/turning/clock fields with reduced
motion. These numerical checks establish continuity and retained mechanics;
the final browser observations belong in the release verification section.

Implementation: [character-motion.js](../../dist/game/engine2/character-motion.js).
Coverage: [character-motion.test.mjs](../../dist/game/engine2/tests/character-motion.test.mjs).

### Ordinary patrols have explicit local formations

Eight exact patrol sites in chapters 1–3 now have explicit profiles. Four
rosters change; four retain their earlier actors and anchor the surrounding
lessons. Existing interception, repair, alarms and marked attacks supply the
different decisions.

| Place | Formation | Roster relative to 5.25 |
| --- | --- | --- |
| Security | Caller and mender | Retained |
| Console room | Single caller | Retained |
| Workshop | Guard and striker | Changed |
| Rail bridge | Caller and guard | Retained |
| Refuge stores | Guard and mender | Changed |
| Drainage passages | Caller and striker | Changed |
| River path | Mender and striker | Retained |
| Bypass | Guard and striker | Changed |

The field silhouette, revealed brief and fresh battle all use the same roster
selection. Formation-specific advice is allowed only for the exact actors the
host has revealed. It describes real guard interception, available direct
techniques, callers and warning shapes. Species must already be introduced at
the encounter's chapter. Fresh formation selection is limited to the listed
ordinary patrols; restored actors and authored special encounters retain their
existing construction paths.

The recorded [patrol audit](../../development/verification/patrol-formation-audit.json)
compares these profiles with the baseline at the same chapter tier. All eight
retain actor count and aggregate HP. Their existing patrol reward keys, base
XP and credit amounts are recorded alongside the selected actors. All 15
audited actors stand on walkable floor and have a connected approach with a
clear strike from that approach. Role armor and moves follow the selected
existing actors. The audit is a roster, reachability and truthful-brief check;
it is not a combat-duration benchmark or a human playtest.

Implementation: [patrol-formations.js](../../dist/game/engine2/patrol-formations.js),
[repertoire.js](../../dist/game/engine2/repertoire.js) and
[encounter-preview.js](../../dist/game/engine2/encounter-preview.js).
Reproducer: [patrol-formation-audit.mjs](../../development/verification/patrol-formation-audit.mjs).

### Landscape information appears when it matters

A neutral landscape sample leaves the field readout quiet. Nontrivial foliage
cover, active resonance, or alert/recovering wildlife produce short cues. The
display thresholds are cover at least 0.08 outdoors, resonance above 0.03,
alert above 0.55, or abundance below 0.8; alert takes precedence over recovering
when both apply. These thresholds govern presentation only.

**Pause → Local landscape** retains the numerical inspection, habitat and a
short explanation of cover and resonance. Visible percentages are rounded;
the inspection element also retains the exact normalized samples in its data
attributes. The view reads the existing Atlas status and does not introduce
another vegetation, ecology or resonance simulation. Hidden views avoid
unnecessary status reads.

Implementation: [living-atlas-art.js](../../dist/game/engine2/living-atlas-art.js).
Coverage: [living-atlas-ui.test.mjs](../../dist/game/engine2/tests/living-atlas-ui.test.mjs).

## Development checks and final verification boundary

During implementation, the focused character-motion, ground-contact,
player-locomotion, follower-motion and motion-realism test files passed. An
initial focused run of field-label selection and label layout also passed.
Those runs precede the final release gate and are not substituted for it.

The read-only integration review found two concrete issues that were corrected:
native disclosure Enter handling reached Pause, and a building exterior lost
the priority/identity of its underlying interaction. Focused cases now cover
the keyboard propagation and cloned portal identity. The final gate must
include these fixes and the completed runtime.

The terminal gate receipt and representative browser observations are recorded
below. The delivery seal verifies final byte identity before source packaging.
The subsequent native Sites receipt identifies the published source version.
Automated continuity, roster and regression checks do not establish subjective
enjoyment, an uninterrupted new-player campaign or physical-phone performance.

## Source continuity

The [cross-session source audit](../../development/reconciliation/cross-session-audit-5.26.md)
rechecked the delivered Grass v6 and Vista v1 archives against the existing
campaign integration. No newer source archive requiring another merge was
found. The Grass Canvas adapter was already integrated in 5.21; the Vista core
and the host's presentation adapters were reconciled in 5.25. Their source
notices, package identities and reference-footage limits remain in the
retained records.

Previous release: [5.25 reconciliation and verification](../../development/reconciliation/reconciliation-5.25.md).
Historical README sections are retained in both game READMEs.

## Final release verification

The [complete gate receipt](release-5.26-tests.json) records 181 modules and
**1,417 passing cases**, with zero failures, skips, cancellations or TODOs.
It ran from **19:48:42.338 to 19:52:15.667 UTC on 2026-10-29**, after the
**19:48:42.165795 UTC** runtime freeze. Source HEAD remained the recorded
baseline while the working changes were tested; the later Sites workflow
commits that complete verified state.

The [browser receipt](release-5.26-browser.json) records actual Chrome play at a
1363 × 936 CSS-pixel game viewport. Refuge field actors matched combat actors.
A direct Fault Lance defeated the protected mender while the mole retained its
71 HP; the completed fight awarded the expected credits and preserved the
full earned equipment/progression receipt. The activity invitation and Rail
Warden combat invitation both exposed their details with Enter without opening
Pause. Direct movement dismissed the activity invitation and restored manual
control. The combat invitation measured 354 × 201.34375 CSS pixels while
collapsed, with all three pace choices visible.

The field showed the nearest interaction and approaching threat without the
previous stack of secondary labels. The Local landscape disclosure retained
inspection values in Pause, while neutral field values remained quiet. The
console review found no application errors after the runtime freeze; an older
Armory error and browser-extension metadata errors are explicitly separated
in the receipt.

Proof captures:

- [Compact combat invitation](browser/aa-field-5.26.jpg)
- [Compact activity invitation](browser/aa-handoff-5.26.jpg)
- [New Refuge formation in actual combat](browser/aa-patrol-formation-5.26.jpg)

The [pre-gate runtime fingerprint](../../development/reconciliation/runtime-freeze-5.26.json)
and [seal script](../../development/reconciliation/seal-release-5.26.py) bind
the final runtime bytes to these checks. Expanded assets are 262,186,232 bytes,
leaving 6,249,224 bytes under the existing 268,435,456-byte hosting limit.
These checks support this implementation and delivery; they do not measure
human enjoyment, all campaign branches, or physical-phone performance.
