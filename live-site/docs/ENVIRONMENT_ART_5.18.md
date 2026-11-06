# Environment art release 5.18

This is an environment art expansion of the existing Ash & Aether game. It retains the campaign, interactions, progression, saved journeys, floor maps and authored approaches.

## Art direction

The common language is weathered clay, roots, cloth, stone, water and worked brass. The new paintings use restrained gouache and watercolor detail, elevated three-quarter views, complete silhouettes and clear contact with the ground. Larger foliage shapes frame the traveller; small surface fragments and subdued material grain carry the close detail.

Regional identity governs selection. Frost belongs to the frozen regions; dryland acacias belong to dry ground; boats and moorings belong to waterside work; rail equipment belongs to rail locations. Storm equipment is sparse and stays near existing infrastructure. Matching furniture and signs retain their real jobs.

## The collections

The release contains original sheets for woodland, waterside, drylands, frozen country, industry, mineral and fungal gardens, village craft, artisans, storm country, ground fragments, wayfinding, tree canopies, ground materials, water materials, architectural accents, and regional shelters. The 16 original PNGs contain 124 motifs and materials; 122 have runtime mappings, and two are staged for authored places. The unchanged PNG sources are archived under `development/art/source-v17/`; the game loads 16 corresponding WebP delivery copies from `dist/game/engine2/art/`. The collection manifest distinguishes the source and delivery inventories, dimensions, byte counts and hashes. The archived PNGs total 36,135,738 bytes; the WebP delivery copies total 10,575,052 bytes. Delivery uses FFmpeg libwebp quality 95 with compression level 6, retaining identical dimensions and exact alpha (maximum alpha error 0). Color encoding is lossy; the archived original pixels are unchanged.

The eight new canopies mix with the existing tree art at stable, already prepared locations. Off-center roots are measured, and complex overlapping source envelopes use disjoint source strips. Drawing and traveller visibility use the same geometry. Non-wind species vary their orientation; storm junipers keep a common wind direction.

Eight restrained ground materials and four regional water surfaces are painted into bounded scene-entry caches. Reflected repeats join at their edges. The water palettes distinguish alluvial river water, shaded mangrove tide, coral shallows and the mineral clouds of salt lagoons. Existing water reflections remain a separate, modest animation.

Facade accents replace the windows, vents, lights and chimneys that the existing building projection already defines. A small amount of ivy belongs to actual wallposts. The projected room cells, doors, frontage runs and baked bounds are retained. These accents use the Standard building bake; Compatibility keeps its established facade fallback.

## Integration and readability

New prop images replace matching scenery at the existing safe boundary sites. Low ecological detail dominates, with occasional taller forms. Ground fragments are limited to actual floor and keep at least 2.5 tiles around functional approaches and 1.3 tiles around authored approach points. Ground fragments are camera culled and capped at 48 in Standard or 24 in Compatibility.

The scenery drawing pass keeps its existing limits of 72 visible sites in Standard and 38 in Compatibility. New tree crowns use the established tree locations and landmark clearances. Large crowns fade when they overlap the traveller or companions. Labels follow the actual painted object height.

The old geometric frontier decoration is retained as an unavailable-art fallback. When the painted regional collection is ready, that older overlay no longer draws over it. Leafy and sandy banks have softer edges; wet banks receive a quieter submerged-soil treatment.

Known origin identities now drive coherent visual materials: Rook and Brass use foundry ground, Iona and Riven use waterside materials, and Veyr uses storm-country material. These are rendering identities only.

## Places to inspect

| Place | Scene ID | What to look for |
| --- | ---: | --- |
| Sable's earlier Cinderfall | 50001 | Mixed orchard and woodland trees, village craft, softer banks |
| Iona's Lowbank refuge | 50003 | Two painted furniture replacements within the existing interior footprint |
| Rook's workshop approach | 50005 | Foundry ground and industrial dressing |
| Brass's rail quarter | 50007 | Rail-specific equipment and craft |
| Riven's river settlement | 50009 | Water palette and vegetation tied to the river |
| Storm observatory | 50013 | Unsnowed wind-shaped scenery and grounded equipment |
| Amber Dunes | 2000 | Acacias, agave, sandstone and restrained sand detail |
| Ember Caldera | 2015 | Basalt, vents, clinker and limited working equipment |
| Mangrove Delta | 2025 | Cypress, root banks and shaded tidal water |
| Crystal Caverns | 2030 | Mineral gardens with existing amethyst retained |
| Glacier Reach | 2035 | Frost spruce and measured ice-country props |
| Sporewood | 2045 | Fungal canopy and low spore-garden detail |
| Storm Peaks | 2050 | Natural crags and roots dominate the sparse apparatus |
| Clinic | 50 | Apothecary furniture in existing footprints |
| Tailor's Back Room | 715 | The loom and established room circulation |

Regional shelters replace the same existing outdoor rest objects: woodland lean-tos, desert awnings, frost windbreaks, reed shelters, basalt refuges, storm cloth, spore-root shelters and marble alcoves. Indoor rest services and story-specific objects keep their established presentation.

## Inspection tools

The Environment studio is available from the developer portal and at
`/game/engine2/qa/composition.html`. It exposes all 167 actual prepared scenes,
uses the production renderer, and provides Standard/Compatibility controls,
arrival and scenery-focus controls, walking through authored approaches, and
an artwork on/off comparison. It uses an isolated in-memory journey and does
not read or write player saves.

The Environment atelier at `/game/engine2/qa/environment-art-v17.html` presents
the original painted collection through the production crop and drawing
helpers. It includes alpha inspection, object scale, staged-art labels, tree
canopies beside Sable for scale, facade accents, and material repeat inspection.
The material drift is an inspection control; it does not animate the floor in
the game.

## Source and extension contract

Selected original PNG bytes are preserved unchanged in
`development/art/source-v17/`. WebP delivery copies keep the source dimensions,
alpha silhouettes, measured crops and root anchors while reducing the hosted
build size. Encoding changes the delivery representation; it does not remove
artwork or replace the archived source. Full prompts, original generation paths,
archive paths, exact measured source crops, root anchors, special source parts,
image dimensions, and separate source/delivery byte counts and SHA-256 hashes
are recorded under `development/art/*-v17.json`.
The runtime manifests use stable semantic IDs, and unsupported or unavailable
art retains a tested fallback.

Add future work as a coherent collection with a real placement purpose. First
identify the existing scene or functional object. Make the art at the common
camera and scale, measure the delivered image, add the registry entry and
selector, then inspect both its isolated alpha and its actual surroundings.
Do not substitute a regular atlas grid for measured silhouettes when branches
cross the ideal cell envelope.

Two delivered motifs deliberately remain staged: the river stairs need a real
authored landing and elevation transition, and the open rope gate needs a real
authored passage. Neither is scattered as misleading scenery.

The next production briefs are in
`development/art/NEXT-ART-BRIEFS.md`. They describe complete facade treatments,
a real river landing, interior wall sets, canopy variation, existing-device
visual states, short environment animation, and natural material transitions.

## Verification

The world coverage receipt is
`docs/verification/environment-5.18-world.json`. Its counts describe potential
placements throughout the prepared world, before camera culling or story
visibility. It verifies floor and approach margins, complete runtime motif
coverage, unchanged source and expanded scene data, and unchanged journey
state. It also records the intentional staged motifs.

The final release test and image receipts accompany this note under
`docs/verification/`. Browser checks are recorded by exact scene and graphics
mode. Model checks and desktop browser review do not constitute a continuous
campaign playthrough or a physical-device performance measurement.

