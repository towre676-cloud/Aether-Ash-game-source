# Large interconnected districts — additive world expansion v1

**Status:** implementation on GitHub; **not a live Site deployment**. Source basis is the preserved Site version 45 export plus later GitHub changes through commit `d09ecea17d8665d2f5a285858750b87ea2aea248`. The separately hosted game may be newer.

## Measured need
The 62 preserved base maps include nominal 64×64 scenes with very little navigable floor: Unindexed has 23 walkable cells; Manifest Depot 132; Name Vault 180. Short linear runs do not convey exploration.

## Implementation and current offline findings
`vast-spatial-expansion.mjs` grows **60 of the 62 original scenes**, from **23,823** to **262,145** cells reachable from their original entries (**11.00×**). This measures additive floor connectivity from the exported data, **not gameplay quality, rendering performance, or a live deployment**. It leaves the deliberately intimate home scene unchanged. Pottery Floor is unchanged because its original sealed-area constraints fail the conservative expansion gate.

Each expanded scene now has two linked circuit networks, 8 landmarks in wide, terrain-appropriate chambers, multiple returns and alternative routes, and two connections back into the original plan when safe. Wildlands use irregular basins and ridges; civic districts use courts and arcades; industrial interiors use halls, platforms and broad service passages. Long connection tunnels get alcoves only when no original walkable cell can be disturbed. Every landmark must be reachable from the original arrival and every previously unreachable original floor cell must **remain** unreachable, preventing bypasses of original sealed spaces.

Four optional, persistent evidence stops per expanded scene use the native exploration ledger. Native patrols can appear on a remote route in non-civic chapters, with limited credits and no free equipment; a scarce optional cache is placed once per two chapters. Save coordinates, existing story objects, portal references and original walkable cells are untouched. Expansion is deterministic and idempotent; old saves do not require coordinate migration.

## Release gate
The test suite under `live-site/dist/game/engine2/tests/vast-spatial-expansion.test.mjs` verifies 62 map identities, connectivity, unchanged quest objects, blocked floor components, generated-object reachability, dimensions, idempotence and restrained rewards. GitHub Actions runs these tests with the site-check workflow. Passing tests are **not** proof of browser performance or quality. Before deployment, reconcile with the current authenticated Site head and then run desktop/touch scene-by-scene playtests, real battles, camera/zoom checks and save/reload checks. **Never replace a newer live Site build with this preserved export.**

## Next art/content passes
Integrate varied landmark-specific architecture, environmental encounters and fieldwork into the current live Site version; validate performance with scene streaming and culling. Re-author mandatory corridors where feasible so the main route itself passes through wide memorable spaces, not merely optional peripheral circuits. This first pass guarantees more explorable geometry, not a complete cinematic encounter redesign.
