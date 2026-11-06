# Session reconciliation — environment collection II

## Release decision

This is the additive **5.18.1 art release** on the published 5.18 campaign.
The source collection keeps its stable `v19` filenames. The earlier working
label, 5.20, anticipated a completed combined campaign release; it was not a
published application version. Historical checkpoint receipts retain that
working label so their recorded source and results remain intact.

At the release decision on 29 October 2026, the native Site still identified
version 21, from `645898e7c6390f87a5d5aed647245e23975c712a`, as its latest saved
version. That is the published 5.18 baseline. The first art checkpoint is
`e491e9395428b39233316e1970bbae1fb364b9fc`, a direct descendant of that baseline.

The concurrent Bellrun checkout contained the committed work `62dab8c` and
the merge `bec7fa8`, followed by unfinished changes to timing, pause/resume,
frame handling, imports and verification. Its merge base with this art work
was the published 5.18 commit. It had not supplied a completed 5.19 publication
at the release decision. Those partial gameplay changes are not imported into
this art release. They remain available in their own checkout and history.

The independent art version keeps the intended 5.19 campaign sequence clear.
The final frozen art source, `852b134421368ebebff1c27e1463e0db2562d00b`, passes
all 1,072 tests across 147 modules and the independent zero-issue world audit.
The final source helper must still fetch the actual remote head before push;
any intervening completed publication requires reconciliation before this
release can be published.

## What this release carries forward

All of the published campaign, movement, quality, answering-network and first
environment collection work remains in its ancestry. Collection II adds 48
original pieces on six sheets: 24 interior wall pieces, 16 facade and roof
details, and eight tree age/exposure variations. All 48 are selected in the
actual world. The combined environment inventory is 172 motifs, including
the same two intentionally staged props.

Interior walls and canopies support Standard and Compatibility. New facade
and roof details use Standard's cached building path; Compatibility keeps its
existing facade treatment. Tree roots, visible-tree density, building shapes,
door positions, collisions, interactions and journey-save fields are preserved.

The separate GroundForge, grass v4 and Acoustic World research remains
separate. Their asset or laboratory test counts are not included in this
release's integration claims. The next-work briefs require the host's actual
ground semantics and stable device states before further integration.

## Handoff to the next campaign integration

Merge the final **published source commit** from this release into the campaign
branch, preserving both histories. Do not replace the entire published tree
with the older campaign checkout, and do not copy only the new image files.
The source commit is recorded in the native Site version and final release
verification receipt.

The overlap requiring a deliberate merge is:

| Area | Art work to retain alongside campaign changes |
| --- | --- |
| `renderer.js` | Three household wall assets, canopy variation selection and drawing, original storm visibility cohort, companion-aware Standard building fading |
| `household-render.js` | Cached wall placement plan in both drawing modes, real window/door/fixture clearances |
| `building-art.js` | Fitted window bays and roof-cell placement, unchanged true entrance and bake bounds |
| `scenic-trees.js` | Shared drawing/fade geometry and root registration for new age/exposure variants |
| `art-definitions.js` | Six optional sheets; 46 images total, of which 24 remain required and 22 optional |
| `scene-prop-repertoire.js` and review pages | WebP delivery paths for the three older sheets; original PNGs live in the source archive |
| Main entry and import URLs | Final cache version propagated through changed importers; preserve identity of stateful campaign modules |
| Developer portal and QA | Collection II gallery, New detail navigation, art toggle and retained first-collection review |

Keep `development/art/source-v19/` and `source-legacy-delivery/` in source
history. The original PNGs are unchanged. Delivery copies preserve dimensions
and exact alpha while compressing color; their hashes and encoding records
are part of the art provenance.

After the campaign is frozen, rerun the environment audit against that actual
campaign baseline. Its world/state comparison must use the new baseline's
own World implementation and source, rather than asserting that a gameplay
release is identical to 5.18. Then run the complete regression suite on the
combined source and review the game entry, room walls, architecture, trees,
mount transition and both graphics modes. Retain the exact tested commit and
actual test totals. Recheck the expanded hosting-size gate after the merge.

## Prepared continuation

The next briefs are in `development/art/NEXT-ART-BRIEFS.md`:

1. Author a real river landing and its traversable elevation transition before
   using the staged stairs or commissioning fitted bank components.
2. Extend room partitions and corners using the existing wall projection,
   doorway clearances and measured material scale.
3. Draw working-device states only after inspecting the integrated state IDs,
   transitions and save representation. Bellrun becomes a candidate once its
   campaign integration is complete.

The release's art inventory, verification and deployment outcome are recorded
in `docs/ENVIRONMENT_ART_5.18.1.md` and
`docs/verification/release-5.18.1.md`.
