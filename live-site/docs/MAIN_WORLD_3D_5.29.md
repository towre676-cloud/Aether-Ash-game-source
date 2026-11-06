# 5.29 — A world you can change

The normal `/game/` adventure now uses a 3D scene presentation after selecting any traveller or restoring an existing journey. The Remembering Cistern remains optional. World, Battle, authored collision, inventory, progression, and saves remain authoritative.

## Physical play

Veyr begins on the southern approach to the observatory in a fresh telling. Operate the receiver; drag the conductor into its grounding socket; then choose and operate either the weather vane or listening coil. The second worksite offers a grounded spare vane as an alternative to fighting the Storm Kite. Final channel controls preserve the two original decisions. Grounding reduces feedback hum, repair changes device geometry, and every committed device state persists.

All seven origin histories expose physical controls over their existing native progression, rewards, and choices. Walking guidance stops at these controls. Direct pointers support cable dragging and held/dragged levers; keyboard/controller confirmation provides a timed accessible alternative. Incomplete or interrupted pointer manipulation cancels without committing a choice.

Routine inspections now produce compact anchored actions and visible prop responses rather than paragraph panels. Cabinets open, cache lids move, switches turn, repaired crossings and gates change, and field tools remain visible. Dialogue is limited to brief exchanges; original pages remain in the Story journal. Consequential choices retain explicit actions. Automatic trail inspection handoffs no longer interrupt the normal 3D journey; origin openings do not spawn unrelated random packs.

## Presentation

Scene geometry follows the existing 167 authored scene layouts: cutaway interiors, actual doorways, terrain, building facades, furniture, devices, and character artwork. Scene materials reuse the game's own painted artwork. All heroes, civilians, visible creatures, and combat actors are projected into the 3D world. Daylight, interiors, and storm scenes use their own light rigs. Procedural localized foley includes grounding contacts, levers, coils, wind, and electrical hum. Existing acoustic volume, mute, pause, and hidden-page controls apply.

WebGL is the normal GPU backend. The QA cloud browser cannot create a WebGL context, so browser interactions were verified through the perspective software backend; the exact GLSL also compiles, links, and draws through native EGL/GLES. Device GPU performance has not been measured. Characters retain illustrated billboards, with 3D environments and controls.

## Verification

- 187 regression modules, 1,476 tests passed. The final 12-test embodied-origin run replaces the earlier 11-test record; the long developer-session module completed separately. Evidence: `verification/release-5.29-main3d-tests.json` and its referenced actual logs.
- All 56 native origin repair/encounter/destiny combinations converge to the correct inherited history. Partial, interrupted, stale, restored, and malformed mechanism states are covered.
- Browser: normal Veyr selection; receiver activation without a dialogue panel; actual conductor drag from its visible handle into its socket; actual held vane control; restored grounded and raised-vane state in the normal 3D adventure; spare-vane activation advances to explicit future controls.
- Projection, scene geometry, save immutability, and shader evidence are retained alongside the regression report.

This changes the renderer throughout the normal campaign. Bespoke physical staging is deepest in Veyr's opening; the rest of the campaign still retains its authored quest and combat structures.
