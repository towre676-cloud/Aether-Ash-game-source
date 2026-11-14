# Ash & Aether — Living Regions, Phase 3

**Development status:** draft PR #14 stacked on PR #13 and PR #12. The code is in the archived-Site-derived GitHub development branch; the separately hosted modern `fractures-4` game has not been modified, merged or deployed.

## Objective

Solve the problem left by geometric expansion: long connected walks must provide purposeful decisions, creatures, evidence, and discoveries without turning into a linear auto-run sequence or free reward dispenser.

## Native gameplay additions

Each of the **127 expanded scenes** (60 main-game districts, 60 frontier areas and seven companion field-trial regions) has five real, separated, walkable ecological interaction stations. The stations are anchored in the existing eight-node scene expansion and never move original doors, characters, encounters or authored puzzle positions.

The first four stations form a compact expedition:
1. **Track:** read physical animal and environmental evidence on the approach
2. **Evidence:** inspect ecological conditions and learn the constraint that a safe repair must respect
3. **Work:** select one of three distinct interventions at a distant damaged worksite; a wrong one costs nothing but cannot advance the task
4. **Stewardship:** travel the remote return loop and choose between preserving the habitat or carefully recovering modest discarded material

A fifth, optional site records a distinct native-animal sighting without forcing a battle. These five stops are *physically separated in the connected map*, not five menu tabs or one cluster near the start.

The fourteen authored habitat profiles include 12 bespoke frontier ecologies: Amber Dunes beetles and a sand vent, Saltglass shorebirds and a tidal gauge, Cactus seed runners and a water stop, Ember Caldera vent crawlers, Coral Shoals tide eels, Mangrove Delta root crabs, Crystal Caverns prism moths, Glacier Reach rope-hares, Aurora Tundra grazers, Sporewood collector beetles, Storm Peaks thunder-kites, Marble Wastes stone swallows, plus appropriate civic and industrial defaults.

Each biome has its own *evidence, habitat, scientific/engineering constraint, intervention choices, success consequence, and creature observation*. The local frontier descriptions and geographic area names supplement the authored material.

## Bounded progression and rewarding exploration

`spatial-ecology.mjs` stores a **single compact record per visited region**, containing an eight-bit discovered-landmark mask, investigation stage 0–4, optional fauna observation, and an irreversible regional choice. The validator rejects malformed or over-capacity saves (maximum 256 scene records). Existing saves with no ecological ledger remain valid; original save schema is unchanged.

On completion, the player chooses one:
- **Protect:** preserve living resources. Spontaneous encounter consumption slows by **18% in that region only**. No combat damage, healing, gear, XP or story-power increase.
- **Salvage:** recover a small, one-time amount of credits (8–20 depending on chapter). Encounter pacing stays normal. No free equipment or repeated farming.

These outcomes do not alter the original 240 frontier commissions, mandatory quest flags or starting crew. Encounter immunity is limited to a small 2.4-tile radius around active fieldwork places so an encounter cannot interrupt a physical interaction; the region outside remains inhabited and potentially dangerous.

## Visual geography

- `spatial-wildlife.mjs`: small visible 3D wildlife that animates, turns, flaps, crawls or swims in its biotope. At most five procedural animals within 21 tiles of the traveller, none when out of range. Animal movements are deterministic and confined to original walkable cells, cause no collision, and change no saves or combat AI.
- Software/compatibility mode also paints corresponding small silhouette movement. Mesh tessellation is budgeted for live performance, but *real device FPS remains unmeasured*.
- `spatial-region-map.mjs` adds a **direct Map control** to the existing field HUD in the preserved game source. It uses the real walkable scene mask, discovered landmarks, current player position, and investigation status. Opening it cancels any automatic story route and pauses field movement; selecting a marker only previews that location, never automatically moves or interacts.
- Responsive touch/landscape layouts, focus management, Escape dismissal, accessible button labels, and clear difference between straight-line distance and actual walking routes.

## Reconciliation with the newer actual Site

The current public Site already has its own `room-map.js` and keyboard **M** shortcut, plus additional `fractures-4` gameplay and `d5-live-1` presentation. It would be wrong to paste the old `main.js` or to install a second Map button on top of its native room map.

The new `scripts/stage-live-living-regions.mjs` solves the duplication at source-staging level:
- Compose the previous additive scale patch with the current authenticated Site source, respecting the original modern Site version gate.
- Add ecology to existing World movement, interaction, and validation; keep the newer fracture system, current rewards, inventory and campaign handoff.
- Add limited-fauna motion to the current WebGL and compatibility renderers, not archived renderers.
- Preserve the current native room map and its **M** shortcut; show fieldwork markers in it, and distinguish **select waypoint** from an explicitly pressed **Follow selected waypoint** action rather than having a map tap silently auto-walk.
- Write **13 changed/additive source files into a new review directory**, plus a SHA-256 receipt manifest. The tool does not edit or deploy the source export, and refuses unknown or duplicate module signatures.

For use *only after an authenticated current Site source export*:

```sh
node scripts/stage-live-living-regions.mjs /path/to/current-site/dist /path/to/empty-review-directory
```

The generated review directory is **not a standalone deployable website**; it must be merged into the full current Site source and its assets, tested and authorized.

## Tests and remaining release gates

Code/CI testing covers source geometry and connectivity from PRs #12–#13, all 127 regional ecological programmes, five walkable stations per scene, choice and reward idempotence, state schema validation, original story preservation, responsive and manual-only map logic, 3D and 2D small fauna, bounded dynamic geometry, and fail-closed stage-only modern integration.

Release still requires an authenticated modern source export, application of the reviewed patch *as an additive merge*, modern progression/battle QA, inspection of story transitions and creature pacing, save and restore under the newest version, and real desktop/mobile graphical performance checks.

There is no claim that this makes the new maps fully hand-authored AAA environments. The next production pass should improve distinctive combat arenas, regional environmental art, landmark-specific audio, NPC routines, ecological consequences that visibly transform the landscape, and discoverable routes with genuine verticality and environmental puzzles. No older GitHub snapshot may overwrite the modern live Site.
