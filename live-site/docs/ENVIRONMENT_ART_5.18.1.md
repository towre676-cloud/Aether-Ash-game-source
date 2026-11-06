# Environment collection II — rooms, roofs and old trees

This pass continues the published 5.18 environment collection with 48 new
painted pieces on six original sheets. The collection filenames use `v19`;
5.18.1 identifies this additive art release on the published 5.18 campaign.
The concurrent Bellrun work keeps its separate 5.19 release sequence.
Reconciliation is recorded in `docs/SESSION_RECONCILIATION_5.18.1.md`; final
regression and publication evidence is in `docs/verification/release-5.18.1.md`.

## The visible work

| Family | Pieces | Placement |
| --- | ---: | --- |
| Home walls | 8 | Patched limewash, pegged timber, shallow returns, linen recess, tiles and cornice |
| Workshop walls | 8 | Clay and brick, timber joinery, tool recess, copper conduit, acoustic lath and cornice |
| Civic walls | 8 | Pale plaster, stone, sage wainscot, care/archive recesses, ventilation and cornice |
| Building bays | 8 | Purpose-specific windows with their surrounding frame, sill and wall craft |
| Roof and wall craft | 8 | Chimneys, air/sound/ridge vents, gable truss, medallion, rain hopper and ivy pilaster |
| Canopy variations | 8 | Hollow/open temperate trees, exposed-root wetland trees, broken cold trees and wind-shaped upland forms |

The new trees differ in branching, age, crown openness and exposure. They are
new structural drawings, not recolors. Wind-pruned juniper and wind-split birch
retain a common wind direction. Other forms may reflect around the same
measured root. Their drawing geometry and foreground-fade geometry agree.

The room pieces provide a setting for the existing furniture. The home keeps
warm limewash and timber; workshops gain clay and repaired joinery; civic rooms
use paler plaster and stone. Actual windows, hearths, specialized equipment,
doorways and work areas retain their space. The current addition decorates
back-wall spans. Partitions, low cutaway edges and the five specialist chapels
remain a separate art responsibility.

Building bays fit around the actual window centers. The complete source
window, surrounding plaster, sill and eave stay within the exposed wall run
and neighboring-window/door clearances. Narrow fragments retain their older
details. Roof fittings lie over actual occupied roof cells, including concave
footprints. This pass does not substitute a rectangular house illustration
for an irregular building plan.

## Measured application

The art-only checkpoint covers all 167 expanded scenes. The independent
receipt is `docs/verification/environment-5.18.1-world.json` and can be regenerated
with `development/art/audit-environment-v19.mjs`.

- All 48 new pieces have actual runtime selections.
- There are 432 potential wall details across 59 rooms, with at most 16 per
  room. The five chapel rooms retain their existing specialist walls.
- Forty-nine of 78 existing window positions accept a full new bay. Together
  with roof, gable and wall fittings, this gives 74 new architectural placements
  in 25 buildings. Underground entrances remain their actual stair enclosures.
- There are 445 new canopy selections in an unchanged total of 1,451 visible
  tree sites. Storm-country variation is restricted to its previous visible
  tree cohort, so the art pass does not increase upland density.

These are potential placements over the complete world, before camera culling
and scene visibility. They are not simultaneous on-screen object counts.

The comparison against 5.18 found identical source-world, expanded-world
and initial-journey hashes. A later combined campaign release must rebaseline
that comparison to its actual campaign source and retain both histories.

## Graphics and fallback

The wall details and canopies work in Standard and Compatibility. Standard
bakes the room artwork with its existing room surface; Compatibility draws the
same cached placement plan with view culling. Missing images retain the
established wall and tree fallback paths.

The facade and roof artwork uses Standard's detailed cached buildings.
Compatibility retains its established simplified facade renderer. Standard's
building fade now considers companions as well as the lead, using the existing
building bounds. Only the lead controls doorway highlighting and labels.

All six new sheets are optional assets. The 22 optional environment atlases
remain independent of the 24 required core images. Failure of an optional
sheet does not block startup; it does not suppress a required-image failure.
There are no new collision cells, exits, quests, interactions or save fields
in this art pass.

## Source and delivery

All six generated PNGs are preserved unchanged under
`development/art/source-v19/`, totaling 11,476,926 bytes. Their six WebP delivery
copies total 3,330,790 bytes. FFmpeg libwebp quality 95 and compression level 6
retain the original dimensions and exact alpha channels. Color compression is
lossy; the original PNGs remain the source of record.

Every sheet is 1774 × 887. Source rectangles are measured from the actual
artwork, not assumed from a nominal grid. The two overlapping canopy envelopes
use disjoint source strips; all 535,719 canopy pixels above alpha 32 are
assigned exactly once. Roofcraft also uses measured unequal source widths.

The consolidated index is `development/art/environment-collection-v19.json`.
Full built-in ImageGen prompts, original output paths, archive paths, delivery
paths, source/delivery hashes, crop contracts and alpha checks are retained in:

- `development/art/canopies-v19.json`
- `development/art/interiors-v19.json`
- `development/art/architecture-v19.json`

Three older PNG delivery sheets were also converted, with their unchanged
originals retained under `development/art/source-legacy-delivery/`. The three
runtime copies shrink from 7,499,213 to 2,204,074 bytes, saving 5,295,139 bytes.
All 4,719,940 decoded alpha values match their originals. This recovery exceeds
the new collection's runtime image cost and preserves the existing 256 MiB
hosting-size gate. `development/art/legacy-delivery.json` records the exact
conversion and the rejected alpha-changing trial.

## Review and continuation

`dist/game/engine2/qa/environment-art-v19.html` presents all six families through
their production fitting helpers. It offers detail and in-world scales, a
traveller reference, an alpha checker and scene links. Only the selected eight
pieces are mounted at a time.

The Environment studio still uses the actual renderer and isolated review
state. Its new **New detail** control visits the available wall details,
existing building approaches or new tree variants. Building viewpoints prefer
traversable positions that leave the building visible. The **New art** switch
tests the complete collection's fallback, including the new sheets. Review
controls do not read or write journey saves.

The next briefs prioritize an authored river landing with real geometry,
remaining partitions/corners, and truthful working-device states. Whole new
facades and the staged river stairs are not claimed as delivered. Separate
grass, ground and audio research keeps its own integration and validation
requirements. The current next-work plan is
`development/art/NEXT-ART-BRIEFS.md`.
