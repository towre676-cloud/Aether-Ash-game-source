# Ash & Aether opening art direction

The playable opening uses the game's own material vocabulary: warm clay, forged brass and furnace light against cool water, mist and aether. Seven remembered lives share a consistent rendering system while their landmarks explain different work, people and places.

| Life | Landmark | Environment emphasis |
| --- | --- | --- |
| Sable | Reed relay | Family craft, gardens, worn stone and warm lamp light |
| Iona | Doorstep flood gauge | Water marks, reeds, relief stores and cool reflected light |
| Rook | Winter furnace | Kiln stone, heat-darkened metal, glass and warm working light |
| Brass | Public rail signal | Ballast, weathered metal, a legible crossing and amber signal light |
| Riven | Tide sluice | Banks, reeds, tide marks, gate stone and blue-green water |
| Mira | Witness lamp | Clay records, dark shelves, glass and directed side light |
| Veyr | Listening mast | Exposed stone, grounded conductors, weathered glass and pale storm light |

`authored-openings.js` prepares render-only composition for all fourteen remembered-life scenes, the seven early encounter trial maps, and eleven first-chapter locations. The plan is attached as `scene.authoredOpening` after all architecture and origin expansion. It does not change floors, object positions, entrances, quests, or save identities.

Every plan includes a palette, an arrival, a continuous trail through reachable narrative stops, a grounded landmark near an existing interaction, and a bounded set of edge clusters. New props occupy blocked boundary cells. Arrivals, existing interactions and doors retain a 2.6-tile quiet radius. Furnished walls and existing building footprints are reserved for their existing architecture. Indoor clusters exclude roots, reeds and water.

World coordinates in the plan denote tile centers. `landmark.focus` identifies the existing narrative interaction, while `landmark.xy` identifies the separate blocked-ground site on which the scenic illustration can stand. The battle and peaceful diversion are alternative routes; the approach trail does not imply that the player must complete both.

The rendering layer should keep these trails subtle, preserve actor contrast, fade scenery that would cover a traveller, and retain the compatibility graphics path. Individual scenes should remain readable during ordinary play, including with mobile controls on screen.

Validation: `node --test dist/game/engine2/tests/authored-openings.test.mjs` verifies unchanged geometry and story objects, deterministic plans, coverage of all seven lives, contiguous walkable approach paths, reachable narrative stops, bounded prop counts and clear arrival/interaction/door space.
