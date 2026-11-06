# Ash & Aether — the next environment art batches

## Collection II handoff — release 5.18.1

The second environment collection, identified by stable **v19** asset names, adds **48 original pieces on six sheets** for the additive **5.18.1** art release: **24 interior wall pieces, 16 facade/roof details and eight canopy variations**. All 48 have actual runtime selections. This extends the historical v17 collection; it does not replace its source records or change the two staged motifs, `river-stairs` and `rope-trail-gate`.

### Completed portions of the earlier briefs

| Earlier brief | Completed in Collection II | Scope still open |
| --- | --- | --- |
| **1 — Cinderfall facades and courtyards** | Sixteen facade-bay and roof details on two sheets. New art fits **49 of 78 existing window bays**; all sixteen pieces are selected. | Whole authored facades, courtyard wall assemblies, new building silhouettes and their geometry/occlusion contracts were **not delivered**. |
| **3 — Rooms with authored walls and corners** | Twenty-four pieces across home, workshop and civic families. The current plan supplies **432 wall details in 59 rooms**. All **five chapel rooms** retain their specialist walls. Existing windows, doorways, floor geometry and furniture remain in place. | Partition faces and caps, short structural returns and the remaining room corners still need their own fitted art. The 24 pieces decorate existing back-wall faces; they do not rebuild the room shell. |
| **4 — Seasonal and directional canopy variations** | Eight new age, branching and exposure variants. The reviewed world retains **1,451 visible tree sites**, of which **445 select the new variants**. The tree total is unchanged. | Further species or seasonal work should follow a regional repetition review. The eight-piece batch itself is complete. |

The tree figures describe the reviewed world inventory, not one camera view. The authored river landing has **not** been delivered: `river-stairs` still needs real geometry, a valid elevation transition and a usable route before placement.

### Review the new work before commissioning more

Open the [Collection II gallery](../../dist/game/engine2/qa/environment-art-v19.html) to inspect the six source families through their production drawing helpers. Then use the [Environment studio](../../dist/game/engine2/qa/composition.html), select the real room or landscape, and press **New detail** to move the review point among the new placements. Compare the **New art** toggle and graphics modes; verify fit and approach visibility in the scene as well as isolated crop quality. The gallery is an art review surface; the studio shows the actual game renderer.

The supporting production records are [interiors-v19.json](interiors-v19.json), [architecture-v19.json](architecture-v19.json) and [canopies-v19.json](canopies-v19.json). The final release receipts are in `docs/verification/release-5.18.1.md`; the campaign merge handoff is in `docs/SESSION_RECONCILIATION_5.18.1.md`.

## Historical foundation — release 5.18 / Collection I

The completed v17 art registries contain **124 original art entries: 96 painted object motifs in twelve collections, eight facade accents, eight tree canopies, eight continuous ground surfaces and four regional water surfaces**. Of the object motifs, **94 are runtime eligible and two are staged: `river-stairs` and `rope-trail-gate`**. The collections cover woodland, waterside, industry, cold highlands, drylands, mineral growth, storm country, village craft, interior furniture, ground details, existing frontier utilities and regional outdoor shelters. These counts were read from `ENVIRONMENT_PROPS`, `ENVIRONMENT_COLLECTIONS`, `ENVIRONMENT_STAGED_IDS`, `ARCHITECTURE_ACCENTS`, `ENVIRONMENT_CANOPIES`, `ENVIRONMENT_SURFACE_NAMES` and `ENVIRONMENT_WATER_MATERIALS` after the parallel integrations landed.

All **16 original PNG sources** remain unchanged in `development/art/source-v17/`. The game uses **16 WebP delivery copies** at the original dimensions and crop coordinates to meet the hosted build-size limit. Source and delivery are separate records in the collection manifest; generating a smaller delivery copy does not count as new art or remove an existing motif. The originals total 36,135,738 bytes and the quality-95 WebP copies total 10,575,052 bytes. Color is encoded with loss; all dimensions and alpha values are preserved exactly, as recorded in `delivery-v17.json`. The v17 collection IDs remain stable within release 5.18.

The facade accent pass is complete: three purpose-specific windows, a carved gable vent, two chimney forms, a wrought lantern and climbing ivy now use existing building detail positions. They add material and craft to the current architecture. Major authored facade views and their footprint/occlusion contracts remain the next architectural task.

The eight surfaces now use a restrained **24% overlay with 384-pixel mirrored repeats**. This follows browser feedback that the earlier 42% / 192-pixel treatment looked quilted. Four reflected cells form a 768-pixel cache that also joins at its outer edges. The original generated image remains unchanged.

This historical checkpoint supplies the small-object and material repertoire used by the later collection. The current priorities below account for the architectural and canopy work completed since then.

## Shared production contract

Use the existing original art as a style reference: hand-painted materials, an elevated orthographic camera approximately 35 degrees above the ground, light from the upper left, quiet contact shadows, irregular weathered silhouettes, cool blue stone, warm ochre clay, timber and restrained brass. Maintain one camera and one light direction within each asset family. Ground surfaces use a flat overhead camera with diffuse illumination.

Transparent sheets should contain no more than eight substantial objects in a 4×2 layout, with generous clear gutters. Keep complete shadows, foliage and hanging details inside each object’s region. Inspect the actual alpha bodies and measure source rectangles after generation; the requested grid alone is insufficient evidence that crops are safe. Preserve the original image pixels in a source archive. Keep any delivery copy at the same dimensions, verify its alpha and crop contract, and record its encoding settings, byte count and hash separately. Source prompts, generation paths, archive paths, dimensions, original hashes, measured crops and intended selections belong in `development/art/`.

Budget final art against a nearby person: ordinary edge objects usually draw at 60–80 world pixels tall; occasional tall motifs can reach roughly 100–115. A major building or landmark needs a separately measured footprint and occlusion policy. Preview every family at normal game scale before enlarging its gallery presentation.

## 1. Priority: an authored river landing with real geometry

**Places:** The river, scene 49; selected coral and mangrove frontier locations, scenes 2020–2029.

**Visual job:** Show how people actually reach and work beside the water. The existing `river-stairs` is reserved until a real landing has matching elevation and a usable route.

**First deliverable:** Author one actual landing in the existing scene geometry. Establish its floor cells, bank contour, elevation transition, route endpoints and approach clearance before commissioning the final painted components. Verify the route in both directions and keep the staged stairs unselected until the route exists.

**Art batch after geometry is fixed:** Eight compatible bank components: low cutwater stones; a curved mossy retaining bank; a short timber mooring edge; a shallow landing platform; a capstone corner; a low watergate facade; a worn bank-to-platform transition; a small boathouse sidewall. Pair these with the delivered skiff, traps, bollard and rope/chain work only where their function makes sense.

**Camera and palette:** Use the same step rise, top-plane angle and stone scale as `river-stairs`. Slate-green water stains, blue-grey limestone, muted turquoise moss, weathered brown timber, small verdigris accents. Keep reflections subtle and near their source.

**Selection rules:** Match the actual bank contour. Stairs must connect visible traversable surfaces; platforms need real geometry. A decorative bank cannot suggest a crossing over impassable water. Keep the primary route readable from the normal camera.

## 2. Priority: remaining room partitions and corners

**Places:** The family home, scene 2; Instrumentworks, scene 4; the clinic, scene 50; existing archive rooms. Treat the five chapel rooms as a separate specialist family.

**Visual job:** Complete the room's structural depth around the delivered back-wall art, so partitions and corners read as part of the same building while every real opening stays legible.

**Completed basis:** The three existing families already provide patched limewash and timber, clay workshop joinery and restrained brass, and pale civic plaster/stone. Reuse those palettes, texture scale and measured anchors. Do not commission the same 24 back-wall pieces again or add duplicate windows over furniture-18 window placements.

**Next batch:** Eight tightly fitted structural pieces: left and right short partition returns; two partition-end caps; two inner-corner plaster/stone repairs; a narrow timber cap for a short wall run; and a restrained stone cap for a civic partition. Select the actual fitting sites first. Use the existing 34-pixel partition projection, 10-pixel side cutaways and 9-pixel south lips as geometry constraints, not as permission to raise walls over the traveller. A chapel extension needs its own palette and fixture review before entering this kit.

**Camera and palette:** Keep the established cutaway projection and upper-left light. Match the completed home, workshop or civic family instead of introducing another wall material scale. Small top planes should reveal wall thickness without creating a new floor platform.

**Selection rules:** Fit actual partition rectangles and the irregular room polygon. Preserve doorway cells, jambs, thresholds, fireplaces, specialist fixtures, furniture silhouettes and approach cells. Keep short stepped boundaries quiet. Use the shared household wall path and cached geometry, retain absent-image fallback, and compare Standard and Compatibility at identical room positions. Changes to collision, portals or floor cells belong to a separately reviewed geometry change.

## 3. Priority: truthful mechanism states after stable integration

**Places:** Existing frontier interaction sites and named mechanisms in the river, foundry, archive and storm areas. Bellrun is a possible later candidate only after its campaign integration and real state contract are stable.

**Visual job:** Make an established change in the world visible through the object itself.

**State inventory first:** Read the integrated device IDs, state names, transition conditions and save representation. Choose objects whose states already exist and can be demonstrated. Do not infer a Bellrun state machine from research or a parallel-session prototype, and do not treat visual art as evidence that an interaction is integrated.

**Batch after that inventory:** For four selected existing devices, draw coherent idle, active and completed states: twelve sprites total, split into device families. Start from the delivered utility artwork, preserve one footprint and registration point across its states, and change a meaningful part such as a valve position, shutter, indicator or contained flow. Use the exact state names and conditions already present in the game.

**Camera and palette:** Match the original device exactly. Concentrate the changed light or material around its working part. Keep completed states readable without a pulsing glow.

**Selection rules:** Bind only to real existing state. A decorative detail must not falsely promise an interaction. State artwork must not move the navigation target, alter the collider or overwrite specialized story devices.

## 4. Whole facades and courtyards

**Places:** Cinderfall, scene 5; the market, scene 17; existing household exteriors.

**Completed basis:** The existing facade accents and the sixteen new facade/roof details improve current building surfaces. Complete facade silhouettes and courtyard assemblies remain future work.

**Visual job:** Make a clinic, home, instrument shop and market workplace recognizable from their silhouettes and materials before the player reads a label.

**Batch:** Eight architecture pieces: a bowed plaster-and-timber domestic facade; an instrument workshop facade with a shaped eave; a clinic facade with a shallow sheltered porch; a low communal kitchen frontage; two compatible courtyard wall corners; one vine-covered boundary return; one small covered arcade segment. Keep the actual entry opening separate from decorative windows and niches.

**Camera and palette:** Match the current exterior projection and roof pitch. Warm clay plaster, cool limestone foundations, deep brown framing, restrained indigo cloth and aged brass fittings. Use asymmetry from repair, drainage and wear rather than ornamental clutter.

**Selection rules:** Assign by the existing household’s purpose and footprint. Align its one real entrance with the existing navigation target. Preserve a clear approach. Place roofs and walls so they fade for actors behind them. Treat each facade as an authored replacement; do not scatter it through ecology pools.

## 5. Further canopy variation after the completed first batch

**Places:** The forest, scene 19; mangrove frontiers, scenes 2025–2029; glacier and aurora frontiers, scenes 2035–2044; exposed storm country, scenes 2050–2054.

**Visual job:** Build on the completed eight-variation batch only where an actual regional review still shows excessive repetition. Preserve the current site count and open sky gaps.

**Next batch only after review:** Select the few most repeated regional species and commission distinct younger/older or seasonal forms for those exact sites. Keep the completed old orchard, coppice, wetland, cold-country and wind-shaped variants in use. Keep each species readable, and draw structural differences rather than counting a mirrored copy or recoloring as a new form.

**Camera and palette:** Use the same trunk scale and ground anchor as existing trees. Temperate foliage is olive and deep green; wet foliage is cooler; cold foliage is desaturated blue-green with restrained snow; exposed uplands use sparse leaves and dark wet bark.

**Selection rules:** Only on established blocked boundaries. Keep canopy overlap loose and preserve open sky gaps. Fade any foreground canopy that covers the traveller or an interaction. Camera-edge cropping may hide a whole canopy, but a sprite crop must never truncate a branch accidentally.

## 6. Short environmental motion sets

**Places:** Existing reeds, hanging mending cloth, wind chimes, low vents and water-edge details.

**Visual job:** Give otherwise still scenes occasional credible motion with stable roots and anchors.

**Batch:** Four short sets of four to six poses: reeds bending from their base; hanging cloth responding to a gentle gust; a restrained chime movement; a low vent or narrow water outlet. Animate the actual flexible part while holding the anchor and solid material fixed. Inspect a loop at normal scale and a slowed frame-by-frame view.

**Selection rules:** Use sparse groups and varied phase. Respect reduced-motion settings. Keep collision static. Do not turn every prop into an independently bobbing object or add elaborate full-screen particles to compensate for missing poses.

## 7. Natural ground transitions — separate ground pass

**Workstream boundary:** This is a separate ground-art and material-placement pass. Coordinate with the owner of the existing ground renderer; vegetation research does not authorize a ground-system replacement or a new ecology/save dependency.

**Places:** Boundaries between the new ground materials, especially riverbanks, village paths, snow margins and old stone.

**Visual job:** Break long uniform material boundaries with believable irregular transitions at a larger scale than the fine texture grain.

**Batch:** Eight low transparent edge families: grass-to-mud; mud-to-pebbles; sand-to-slate; snow-to-rock; mycelium-to-stone; clinker-to-brick; shallow wet stone; dusty worn marble. Supply gently curved and short irregular edges rather than repeating hard rectangular patches.

**Camera and palette:** Flat overhead, diffuse light, low contrast. Ground-level moss, small chips and moisture only. Keep the surface detail finer than the nearby traveller’s feet.

**Selection rules:** Clip to the true region and floor boundaries. Reuse the existing trail and bank geometry. Do not paint a traversable-looking strip through a wall, conceal a door threshold or saturate every walking tile with detail.

## 8. Vegetation and audio research — separate workstreams

**Current separate-work handoff:** Grass **v4** is a standalone **3D** research project. **AcousticWorld v3** is local work with **384 assets** and is **not live**. Neither is part of this painted-environment integration. Keep vegetation, ground rendering and audio under their respective workstream owners; confirm the actual target integration and source state with each owner before importing anything. No new prototype links or unverified implementation claims are needed for this art brief.

**Earlier research records retained for continuity:** The separate [demo.html study](https://chatgpt.com/library?file_id=libfile_b0bc45d7311881919efd31ab6b997e33&account_id=personal) uses Three.js 0.180 and imports `grass-renderer.mjs` and `grass-ecology.mjs`; its controls explore biome, wind, rain, sun and footsteps. The [preview-offline.html study](https://chatgpt.com/library?file_id=libfile_768ae8b6f24c8191a15d6d8e35d0a098&account_id=personal) is a dependency-free Canvas art study covering ten habitats. It is neither the deployed game nor the Three.js renderer. These are research references for a future pass; their vegetation systems have not been integrated into the live game.

**Places and visual job:** Start with existing woodland margins, river and mangrove banks, exposed storm ground and cold-country edges. Make low vegetation respond coherently to its place and weather while preserving the painted collection's readable silhouettes and clear routes.

**Art batch, camera and palette:** Develop small species families that complement the delivered moss, reeds, ferns and wind grasses. Match the current elevated camera, upper-left light, regional greens, cold blue-grey foliage and restrained wetland turquoise. Keep stems and roots registered across motion poses. Prefer sparse groups with open ground between them; the traveller and nearby useful objects remain visually dominant.

**Selection and integration rules:** Align the research habitats with actual game regions before selecting species or density. Preserve floor boundaries, functional approaches and travel clearance; do not fill routes with continuous grass. Full game integration requires an adapter for A&A's Canvas renderer and a separate review of ecology, weather inputs, footstep response, performance and save behavior. Review the referenced modules before any reuse; do not copy unverified research code into the game. Validate the adapter and any persistent ecology separately from art acceptance, including restoration of existing journeys without changed progress or navigation.

**Audio boundary:** This vegetation brief does not deliver AcousticWorld assets, a sound engine, environmental audio mappings or a live-game audio change. Any future audio adoption requires its own integration, asset-loading and save/runtime verification; it is not implied by a matching biome palette or by this collection's publication.

## Review and release evidence

### Collection II checkpoint

The interior collection's five focused checks passed for source/delivery hashes and crop bounds, fitting and canvas state, immutable room/journey geometry, matching Standard/Compatibility wall positions, and optional-art fallback/culling. The measured room coverage above is recorded in `interiors-v19.json`. This brief does not substitute for the integrating release's final browser, campaign, deployment or performance receipts.

### Historical Collection I review

The environment atelier displays the real registry crops. Its separate facade section uses the production fitting helper and explicitly labels the details as enlarged. Its canopy section uses measured root anchors and places the existing Sable idle drawing beside each tree at a fixed 60-pixel reference height. Its material section shows all eight ground and four water surfaces through the production helpers and matching base colors, with optional slow drift and a repeat-edge overlay. It is a useful art review, while placement still requires the live scene renderer.

At this checkpoint, the new surface helper’s **six focused Node tests passed**: delivered dimensions/crop bounds; ground-kind mapping and fallback; output bounds/context restoration; matching reflected and cached edges; partial tiles; and exception restoration. Run them with:

```sh
node dist/game/engine2/tests/environment-materials-v17.test.mjs
```

The gallery’s module was checked for JavaScript syntax. Browser review confirmed all eight facade accents without clipped details, the eight rooted canopies alongside Sable, the distinct ground and water materials, and the working drift/pause and repeat-edge controls. The art-checkpoint gallery reported all 96 object motifs loaded from twelve transparent sheets. Its section links leave the headings visible below the sticky controls. These checks describe the art checkpoint; optimized WebP delivery decoding, the build-size gate, broader release tests, live scene screenshots and final deployment evidence belong to the integrating release pass. This document does not claim those later checks have already completed.
