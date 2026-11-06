# Outdoor composition — 5.22.0

## Problem and scope

The former outdoor presentation accumulated independent placements: authored bank props, an additional boundary scatter, a separate tree scatter, and open-floor ground decals. Each system checked root distances against only part of the scene. It did not compare the painted canopy or prop against the other layers or against the actual projected building façade. Regional prop selection also forced nearby motifs to differ, so a foundry bank could contain a kiln, a basin, a valve, a cart, and a bellows without any corresponding workplace.

This change replaces those placement systems with one cached visual plan, `dist/game/engine2/outdoor-layout.js`. It does not edit floor cells, functional object coordinates, travel, battle, random simulation state, or save data.

## Composition rules

- `buildSceneCraft`, `scenicTreeSites`, and `regionalGroundSites` consume the same cached plan on scene entry.
- Building reservations use `environmental-grounding.js`: the actual projected façade and roof silhouette, a door approach, and the small visible stairwell for underground entrances.
- Urban town/market/hub maps reserve the same `streetPlan` network that is painted. Other outdoor maps reserve their actual `terrainTrails`. Authored approach paths and courts around arrivals, doors, functional actors, and focal objects remain clear.
- Placement compares the displayed regional crop rectangle and measured canopy rectangle, not merely the root coordinate. Separate groups cannot overlap. Within a grove, canopy overlap is limited to 24 percent of the smaller rectangle. Low planting may share a lower-trunk envelope only when it is in front, below the crown, and away from the trunk.
- An authored cluster list supplies the natural group anchors when present. There is no appended global scatter. Unauthored maps select a few bank groups on connected blocked land, excluding tiny isolated components. Group budgets scale with the map area; the small frontier maps receive three groups.
- A bank group has at most three small props and three trees. Regional props repeat a local natural palette. A grove repeats a dominant canopy family, with one secondary family in every fourth group and at most one corresponding age variant. Existing reflected geometry and small seed-dependent height variations remain.
- Work groups derive from actual building exits and local work metadata. Each contains at most two matching work objects within 5.2 tiles of its real anchor. Cinderfall's group anchors are its home, instrumentworks, and joiner's workshop. A generic regional name does not create a workplace.
- Ground accents belong to bank groups, remain outside protected routes, and draw at a restrained opacity. Repeated broad prop circles, little mats, and rings have been removed; existing painted root contact remains. The authored focal court is retained.
- Actual mechanism fallback selection uses `mechanismIdentity(object)`. Creature bypasses and empty identities do not inherit a kiln, gauge, or mast from the scene's origin name.

## Observed canonical counts

The baseline below was measured before the composition change. Tree counts are placement candidates in the old system; unsupported regional styles were subsequently omitted by the renderer. The new plan produces only supported trees.

| Scene | Props before → after | Trees before → after | Ground accents before → after |
| --- | ---: | ---: | ---: |
| Cinderfall (5) | 77 → 10 | 35 → 7 | 58 → 4 |
| Forest (19) | 95 → 17 | 53 → 19 | 103 → 8 |
| Sable worksite (50001) | 82 → 4 | 41 → 7 | 68 → 3 |
| Rook worksite (50005) | 82 → 8 | 41 raw / 0 drawn → 0 | — → 3 |
| Riven opening (50008) | 63 → 13 | — → 10 | — → 5 |
| Dunes (2000) | 43 → 8 | 29 raw → 1 | 39 → 3 |
| Coral (2020) | 40 → 9 | 26 raw / 0 drawn → 0 | 50 → 3 |
| Storm (2050) | 40 → 8 | 18 raw → 2 | 33 → 3 |

Cinderfall also retains its one authored focal landmark. Its former 77 props included 13 accepted authored placements plus 64 extra scattered placements. Its new ten props include four members of three real work groups; the other six belong to planted banks. The density limits are ceilings, not quotas: no decoration is added merely to fill a cap when its full painted shape would cover a building, route, or functional court.

The Rook worksite formerly selected 14 copper valves, 13 casting basins, 13 ore carts, 12 bellows, eight kilns, 13 slag vents, and nine basalt props. It now has only two matching foundry work props at a real foundry entrance; the remaining bank props are natural regional forms.

## Verification

37 targeted cases passed after the runtime freeze:

- `outdoor-layout.test.mjs`: 7 cases, including the full canonical outdoor scene set.
- `scene-craft.test.mjs`: 8 cases.
- `tree-visibility.test.mjs`: 6 cases.
- `environment-canopies-v17.test.mjs`: 10 cases.
- `environment-canopies-v19.test.mjs`: 6 cases.

The new tests independently compare actual displayed crop/canopy geometry to the planned bounds; check building, route, and court clearance; reject unrelated overlapping silhouettes; validate bounded intentional understory; check shared-layer plan identity and cached stability; require explicit work palettes and anchors; verify coherent canopy families; and compare the entire canonical world data before and after planning.

Two obsolete placement assertions were replaced: a fixed count of six scattered Sable stones and a specific Riven tree that covered the initial arrival. The new assertions require bounded grouped sites and a clear initial arrival canopy court. Source atlas/crop integrity and canvas state restoration tests remain intact.

The integrated renderer review and final full-suite result are recorded by the release owner separately.

## Generated repair and salvage composition

A subsequent integrated scene review exposed a separate generated object layer outside `scene.objects`. Its old arrival-ring sampling put Cinderfall's listening marker over the home roof and selected a waterwheel for the dry `burrow-trail` profile.

The bounded follow-up changes `world-affordances.js`, `affordance-art.js`, and only the `drawWorldAffordance` function in `living-world-ui.js`:

- Repair, two spares, and an optional listening point are now selected together as an accessible edge work patch. Actual building façades, door approaches, shared prop/canopy bounds, furniture, and functional actors constrain placement. Rugs are treated as floor decoration, not raised occluders.
- The original independent flood-fill proof remains mandatory: closing the one optional repair tile must leave every other previously reachable floor cell connected. The underlying floor is unchanged.
- `worldAffordanceReservations(scene)` exposes read-only bounds for other generated activities without initializing a ledger, writing a collision mask, or calling `world.objects()`.
- The placement search caches bounded local edge lookups and per-candidate scores. It does not repeatedly scan all edges inside the sort comparator.
- Tight rooms can use uniformly compact drawings, including scaled contact shadows and state marks, so existing finite opportunities remain available without covering another object.
- The dry burrow draws low disturbed soil, loose boards, and small stones. It does not select the waterwheel, including when handed a stale descriptor with the old art key.
- Scouts draw a compact floor-contact Hydrophone and coiled lead. Salvage tools remain physically small; the broad decorative pickup ring has been removed.
- Cinderfall's current work patch is repair `[28,39]`, salvage `[28,41]` and `[30,38]`, and listening `[24,39]`. Every member is within 4.5 tiles of the repair, clear of the roof and shared scenery.

The frozen baseline contract is recorded in `tests/fixtures/world-affordance-availability.json`. Every previously emitted ID is still emitted across all 167 canonical scenes, including the constrained market, Unindexed room, and hold. All 166 prior repair sites remain. A scout that previously had no safe placement is now reachable in scene 229; its existing preparation rules are unchanged and it adds no resource reward.

47 relevant cases passed for the follow-up: six new canonical placement/connectivity/reward/save cases, 13 affordance gameplay cases, six affordance art cases, six living-world UI cases, and 16 living-world integration cases. The canonical reward test actually gathers finite stock, repairs all 166 sites by their applicable assembly or rhythm, verifies the original eight-credit and one-item reward, and rejects duplicate payment. The real `World.save()`/`restore()` test retains partial rhythm, gathered stock, scouting/preparation, and completed repairs.

## Integrated activities and household circulation

The final generated-service audit covers all 167 scenes: 288 services are
reachable, including 101 stables and 93 regional records. All 23 previously
available regional work IDs remain (chapters 1–12 and 14–24). Witness Vault
retains its five records and an actionable document press; its narrow floor
uses exact occupied silhouettes instead of a blanket 1.6-tile exclusion.
Letter Attic's existing missing regional work set and the two existing compact
maps without optional stables (Market and Catwalk) remain unchanged.

The audit found no overlaps between stationary services generated by different
installers, no outdoor service overlap with shared scenery or repair bounds,
and no stable on a painted trail. Resident routes were checked across all six
day periods: none passes through building ground. The private resident routing
mask retains doorway approaches and does not change the player's collision.

The starter home and its Sable-origin clone retain 77 architectural floor
cells and all ten furnishing IDs. Compact 2×2 activity groups, a wall-backed
2×1 pantry, and removal of the four-cell east partition increase walkable floor
from 41 to 56 cells. Cells with at most two open neighbours drop from 26 to 13.
The west privacy return remains. A three-cell arrival/living aisle is open;
Sable's Mara, clamp and exit have separate reachable approaches. Old saves at a
newly occupied furniture cell land nearby without changing items, crew, story
flags, household claims or history. Complete bedroom, kitchen and dining kits
render before any regional single-object substitute.

Building geometry now agrees in Standard and Compatibility. Underground
entrances draw their actual stairwell, including when offscreen preparation
fails. Ground Forge's additional decorative base wash is off for the campaign;
its wetness, heat, charge, fracture and traffic fields still operate and draw
accepted effects on the actual floor. Town streets share connected branches
without paving an additional square under each person. The integrated
Environment studio now includes Ground, Atlas, services and moving residents.

The expensive repeated plant-scoring calculation was replaced with bounded
edge lookup and one score per candidate. Final Node measurements were 653ms for
World construction and 132ms/72ms/58ms for first service generation in Town,
Refugee Gate and River. All 167 service sets generated in 1.97s. These figures
measure simulation/layout only, not image loading or browser rendering.

### Final integrated presentation corrections

The final scene review prompted four further bounded corrections, verified by 35 focused cases (art 9, canonical layout/save 7, affordance gameplay 13, living-world UI 6):

- The burrow-profile fallback now applies only to a repair object. A scout associated with that profile draws the same Hydrophone geometry as other scouts in all solved/unsolved and normal/compact combinations. The new regression rejects the soil-repair board geometry for that scout.
- Home 2 presents its retained `rootwalk` recipe as **Loose floorboard**. Sable's interior 50000 presents its retained `burrow-trail` recipe as **Underfloor maintenance patch**. These use low board artwork and coherent labels, descriptions, action wording, status, and outcome notices. Recipe IDs, tool requirements, rhythm, effects, rewards, historical ledger, coordinates, and conservative reservations remain unchanged.
- Physical salvage uses muted clay, dull metal, wood, and reed colours within the existing small bounds. The water vessel no longer uses the cyan inventory-potion colour on the ground.
- A real `ground-loop` profile uses the electrical relay fallback rather than the vane crop; only the actual `vane-relay` profile uses that crop. Real archive, witness, and echo gate profiles use their dry gate fallback instead of the fountain-arch artwork. Generic unprofiled art previews retain their existing atlas selection.

The complete prior-ID, 166-site connectivity/reward, and real-save checks were rerun after these final corrections. No import/cache versions were changed during this pass; the normalized version remains 5.22.0.
