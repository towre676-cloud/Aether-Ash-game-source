# Ash & Aether — Regional scale and exploration Phase 2

**Scope:** stacked draft PR #13 on top of draft PR #12. Source is the repository's preserved Site v45 game export and its later GitHub modifications. **This branch is not deployed to the newer live Site.** Never publish it over the live instance without reconciling the authenticated up-to-date Site source.

## Terrain expansion

The original world contains 62 base maps. Phase 1 enlarged 60 of them from 23,823 to 262,145 arrival-reachable floor cells (11.00×). Home remains intimate; Pottery Floor remains unchanged because its safe expansion gate was not met.

Phase 2 also enlarges all 60 native frontier maps, with all five landform variants across 12 regions, and the seven borrowed-kit field trials. Exact CI geometry audit:

| Surface | Before | After | Verification |
|---|---:|---:|---|
| 60 original campaign regions (PR #12) | 23,823 | 262,145 | PR #12 CI |
| 60 frontier regions (PR #13) | 19,320 | 249,784 | Phase 2 frontier connected-component CI |
| Existing mandatory routes | — | +1,418 walkable cells across 29 original scenes | Phase 2 mainline-court CI |

These numbers count *reachability in a generated collision grid*, not hours of content, visual quality or desktop/mobile frame rates. They are additive measured source-code facts; **they are not claims about the public live game**.

### Geographic grammar, not corridor inflation

- Wilderness: broad basins, ridges, clearings, shelters and multiple approaches
- Civic: courts, colonnades, gathering squares and linked streets
- Industrial: high service galleries, drainage bays, machinery courts and return routes
- Multiple interlinked circuits permit turning back, exploring a side area and rejoining the main route
- Width- and height-expansion maintains the original coordinate frame, rather than migrating existing player saves or moving key objects
- Four contextual lookouts per frontier area reuse the area's existing regional ecology and field guidance; long routes support existing random ecological encounters and finite world-repair systems

The new regions include real scene geometry: nonblocking floor inlays, geological cairns, arcades and industrial service structures. The structures are built on original blocked geometry, not invisible collision points. Scenery meshes have a bounded vertex budget, checked in Node tests. This is a tangible 3D architectural pass but **not** a claim of hand-built cinematic environments.

### Story flow and player agency

`mainline-courts.mjs` widens *existing mandatory travel routes* where safe, not only optional remote additions. It preserves original walkable coordinates, saved story-object positions, door targets and unreachable original floor components. The field encounter's **Explore** action explicitly interrupts the objective guide, and the former ambiguous **Continue route** label becomes **Follow story path**. Existing touch-to-move remains; following the story path is opt-in.

### Rewards and saves

The original 240 multi-stage frontier commissions retain all their survey, repair, encounter, report and reward anchors. The seven field trials retain borrowed equipment, enemy positions, objectives and exits. Newly added lookout interactions do not consume the bounded 256-entry exploration journal. Auxiliary native rewards remain restrained (not free high-powered equipment), but **the economy and XP must be re-balanced against the live `fractures-4` reward engine before deployment**. The static branch does not establish a correct live economy.

The existing original world affordance ledger retains all baseline IDs; on larger maps an extra previously unavailable, safely connected repair site is viable (165 available versus an original 164). A new iterative articulation-point algorithm replaces expensive full flood checks for every potential optional tile and independently matches brute-force BFS on 120 seeded grids and sampled real expanded scenes.

### Verification record

The GitHub Actions workflow now runs:
1. Public showcase integrity and basic navigation checks
2. PR #12 original world-scale and save tests
3. Frontier and mainline geometry, 3D collision-aligned landmarks and save restoration
4. Randomized graph-theoretic articulation tests, including large real scenes
5. Original frontier commissions, field origins, quest navigation
6. Original native dungeon architecture and world affordance/regression suites
7. Modern live-Site source staging fail-closed and no-overwrite unit tests

**Passing these suites does not establish real-device FPS, screen-space clarity, full battle behavior, or a deployable current Site.** Browser playtesting remains mandatory, especially smaller phones, camera offsets, scene transitions, zoom, WebGL/software rendering, roaming combat and loaded saves.

## Live Site integration: no destructive sync

The public hosted current game uses newer assets and systems including:
- `progression-balance.js?v=fractures-4` and `crew-experience.js`
- `fracture-runs.js` and `fracture-ui.js`
- `campaign-handoff.js` and `cinderfall-layout.js?v=street-clearance-1`
- `tutorial-skip.js`, `mineral-resonance.js` and newer creature ecology

`scripts/stage-live-spatial-integration.mjs` stages a **review-only additive source patch** after an authenticated up-to-date Site export has been obtained. The tool refuses stale source signatures, partial target code, duplicate installations and existing staging directories. It writes patched `world.js`, `main.js`, `adventure-3d-geometry.js`, `field-journey-ui.js` plus three additive modules into a *new staging directory*, with SHA-256 receipts. It neither edits the current Site export in place nor deploys anything.

Usage once an authenticated current Site export is available:

```sh
node scripts/stage-live-spatial-integration.mjs /path/to/current-site/dist /path/to/new-empty-staging
```

A working staged patch is not itself a deployable Site. Its source must then be reconciled, dependency links verified, all scenes and saves tested in desktop/mobile browsers, and deployment explicitly authorized.

## Remaining honest limitations

- The new remote areas mostly rely on existing combat, ecology and observation systems; more *hand-authored* activities and distinctive creature habitats are needed for a modern action-RPG experience.
- The visual set must be tuned for varied terrain, lighting, rock silhouettes, canopy and landmark density. Static structural geometry is not a replacement for motion, animation, ambient populations, detailed dungeon set pieces or quest events.
- Region-wide traversal should eventually gain a player-controlled map, discovered landmarks, route-memory, optional fast travel and clear objective signage.
- Spatial consistency needs real gameplay checks against the latest saved campaign story and origin variations.
- The modern live economy and material-gathering progression must be preserved and the extra optional encounters balanced against them.
- Evaluate culling/streaming performance and never claim production-ready frame rates without measurements.

**Source control integration order:** review and validate PR #12 → review and validate stacked PR #13 → stage against authenticated current live export → complete real-device QA → explicit publish authorization. No old-site overwrite.
