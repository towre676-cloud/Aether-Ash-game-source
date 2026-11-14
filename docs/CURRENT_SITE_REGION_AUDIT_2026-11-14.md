# Current Site region integration assessment — November 14, 2026

**Decision: reviewable source integration exists; deployment is not approved or ready.** An authenticated checkout of the deployed modern game was obtained. The original 13-file staging tool accepted it, and an isolated browser displayed the expanded native map and modern combat. The audit found a missing performance dependency, interaction defects and navigation defects and prepared local corrections. The corrected 14-file candidate passes source/model checks and a limited browser smoke check. Full browser, real-save and real-device acceptance remain release gates.

## Authoritative versions and dependencies

| Item | Verified state |
| --- | --- |
| GitHub main | `86081e8cc18d0681e2ac15fd176d6c5b271130fb` |
| PR #15 | Merged November 14 at 08:30 UTC / 03:30 EST; includes the complete #12–14 stack |
| PR #12 | Merged; head `25e23b09198b2f63d5f97482f6832ad97cdc8a49` |
| PR #13 | Closed as superseded by #15; head `229ba26d977f9479adf86e18212f5dfe0ff7d8bf` |
| PR #14 | Closed as superseded by #15; head `04c719c8e6f6c26b7319b5bea19feb0f2bf582f7` |
| Original #14 verification head | `333baa5a956a207d92b86ef962625b3873a59456` is an ancestor of current main |
| Authenticated modern source | Site v116, commit `a9a79147da891cba10864a5535b66799246dbea1` |
| v116 deployment | Sites reports `succeeded`; deployed November 13 at 23:41 UTC / 18:41 EST |

Git ancestry confirms the complete dependency chain is already in main. Do not attempt to merge the three superseded branches again. No remote writes, commits pushed, PR updates, merges, publications, or deployments were performed in this audit.

The Site source was opened through the authorized Sites source workflow. Its checkout commit exactly matches v116's saved provenance. The source checkout remains clean. The candidate is a separate copy of its complete `dist`, with only the receipted overlay applied. The historical v45 export was never used as the candidate game.

## Scope and compatibility contract

The expansion retains original coordinates and walkable floor, excludes intimate/unsafe original layouts, and adds outer circuits rather than lengthening only the mandatory path. These are predominantly optional annexes: 11× area does not mean an 11× longer campaign or 11× more authored content. Five stations per region reuse fourteen habitat profiles; 635 sites are not 635 unique quests.

The source overlay changes nine existing modules and introduces five modules. It does not replace `world.json`, campaign content, combat, Fractures, inventory, mineral resonance, progression, assets, shaders, audio, or native movement/camera modules. Unchanged files are byte-checked by the acceptance script; imported systems still require runtime regression checks.

| Current source file | Required integration signatures / anchors |
| --- | --- |
| `game/engine2/world.js` | `migrateHeroGrowth`, `grantCrewExperience`, `fractureObjects`, `validateCampaignHandoff`, `composeCinderfallLayout`; exact authored-openings import and prepared-household composition; legacy restore fallback; expedition objects/import/validation; scene entry, movement, interaction, and two affordance hooks |
| `game/engine2/main.js` | `fractureUI`, mineral resonance, tutorial skip, journey experience; exact post-battle Explore handler; native map `onOpen:release`; field interaction prompt |
| `game/engine2/adventure-3d-geometry.js` | native ground import; `buildAdventureGeometry`, landscape/interior-surround signatures; final geometry return |
| `game/engine2/field-journey-ui.js` | two continuation hints and default continuation-button expression; preserve the Fracture-specific continuation label |
| `game/engine2/field-encounters.js` | scene-identity import, exact protected-area predicate and encounter-distance consumption expression |
| `game/engine2/adventure-3d-renderer.js` | landscape import, `appendAdventureLivingDynamic`, `appendFractures`, `buildDynamic` |
| `game/engine2/renderer.js` | reconciled-ground import, `drawBellrun`, `drawLivingAtlas`, compatibility mode |
| `game/engine2/world-affordances.js` | exact `function layout(world){`, original `needScout`/per-candidate connectivity block, and `i<q.length&&q.length<5000`; reject already-present articulation optimization |
| `game/engine2/room-map.js` | room-wayfinding import, `mountRoomMap`, `onWalk`, native panel composition, waypoint selection, marker list, reset, and modal open |

The older standalone spatial stager also receives this dependency and now emits eight files; use the 14-file living-regions stager for the complete stack. Its pure four-source patch function is only a compositional helper.

Added modules: `vast-spatial-expansion.mjs`, `mainline-courts.mjs`, `spatial-landmark-art.mjs`, `spatial-ecology.mjs`, `spatial-wildlife.mjs`.

These are structural text anchors, not cryptographic authentication. The authenticated commit plus nine old-file SHA-256 receipts establish this audit's actual input. A future source revision must be fetched, restaged and retested. Matching feature names alone is not proof of compatibility. The corrected stager refuses additive-file collisions and source/output overlap, including symlink aliases. Its manifest explicitly labels gameplay and source authentication as facts the staging function cannot verify.

## Concrete defects and proposed corrections

| Finding | Consequence | Local correction |
| --- | --- | --- |
| The 13-file stager omitted PR #13's repair-layout optimization in `world-affordances.js` | Expanded maps retain repeated per-candidate flood fills; the focused Fracture test took 178 seconds, versus seven on baseline | Include a guarded 14th file porting iterative articulation detection; remove the invalid 5,000-cell flood cap; output matches optimized repository module exactly |
| Ecology stations shared landmark coordinates with generated clues/furnishings, which precede ecology in `World.objects()` | Nearest-target Use selects the older object; repeatable furnishings can make fieldwork inaccessible | Deterministic cached station positions on nearby floor, at least three tiles from scene objects; keep authored objects unchanged; test actual nearest-target selection |
| Native map opening called only `release()` | Existing path/arrival action and story guide can resume when closing the map | Cancel guide, clear path and arrival action on map open; keep Follow selected waypoint explicit |
| Native field prompt did not recognize `spatial-fieldwork` | Player sees generic “Talk” instead of the available activity | Show the ecology station label through the existing prompt |
| Reusing a retained reward callback could credit salvage twice or change a completed outcome | “One-time” reward was enforced at dialog opening rather than commitment | Recheck state identity, scene identity, stage and unclaimed choice at callback time |
| 3D wildlife helper had no field-mode guard | Noncombat fauna could render during battle while the 2D caller suppressed it | Suppress fauna unless `state.mode` is `field` |
| Stager assumed added module paths were absent | A partially integrated/newer source could have an existing module silently replaced by the overlay | Refuse collisions before creating output; both stagers covered |
| Lexical destination check ignored symlink ancestors | A nominally separate review path could point inside the source | Canonical destination validation, with regression coverage |
| Manifest listed “current live source version verified” as an ambiguous check | Fixture staging could be mistaken for authenticated verification | Separate matched signatures, caller authentication responsibility, and pending acceptance checks |
| Modern browser QA used element screenshots on animated layouts | CI failed waiting for a stationary screenshot target | Capture the page without requiring the animated element to stabilize; retain gameplay assertions |

No art assets were substituted or removed. The native map remains the only map UI. Habitat safety now follows the separated station coordinates. Wildlife remains at most five small procedural silhouettes near one habitat per region, not a new monster-animation library.

## Verification evidence and limits

The full authenticated-source/model acceptance passed. All 2,527 original files outside the nine edited files are byte-identical; five files are added. All 635 stations in 127 regions are reachable and win the actual nearest-target selection at their positions. Four synthetic save cases (Commons, first/last frontier, and legacy non-story fallback) preserve non-ecology state and restore far-landmark coordinates. The 24 campaign definitions and room order, original scene IDs, arrivals, doors, objects and original floor connectivity are conserved.

| Modern composed world | Regions | Reachable floor before | After |
| --- | ---: | ---: | ---: |
| Campaign | 60 | 22,355 | 261,273 |
| Frontiers | 60 | 19,320 | 249,784 |
| Trials | 7 | 2,272 | 28,792 |

Campaign growth is about 11.69× against v116, not the historical 11.00× denominator. Frontier growth remains 12.93×. Longest arrival-to-station routes have a median of 130 tiles across regions and a maximum of 221; five activities over thousands of cells still leave substantial traversal between authored content.

The final host run measured baseline/candidate World construction at 1,167/2,358 ms; path search median/p95 at 2.77/8.25 ms. The focused Fracture check completed in 14.8 seconds with the final 14-file overlay, compared with 178.1 seconds on the earlier 13-file candidate and 6.85 seconds on baseline. These runs were not an isolated controlled benchmark; the remaining expansion overhead is real and still needs device profiling. Wildlife generated at most 34,200 float components in the sampled meshes, all finite. These are model/CPU diagnostics, not device performance acceptance.

Completed automated runs (overlap is intentional; counts must not be added as unique tests):

| Run | Result | Scope |
| --- | --- | --- |
| Final staging/correction tests | 12/12 passed | Missing/drifted signatures, 14-file receipts, collision/symlink refusal, ecology action safety, native map callback |
| Expansion/ecology focused run | 38/38 passed | Earlier correction revision: region topology, landmarks, wildlife, ecology and staging |
| Archived world regressions | 58/58 passed | Original dungeon investigations, frontier commissions, borrowed origins, quests and affordance connectivity |
| Final affordance rerun | 9/9 passed | Final uncapped flood and articulation implementation, layout, repair and save behavior |
| Modern v116 regression run | 159/159 passed | Fractures, authored motion, camera window, encounter objectives/pacing, save validation, weapon growth and armory subsystem tests |
| Additional modern minerals/touch/campaign-armory run | 47/49 passed | All mineral and touch checks passed; two animation expectations fail identically on unmodified v116 |
| Current v116 pose-specific checks | 2/2 passed | New six-frame hunt drawings and their 2D projection |
| Full authenticated-source acceptance | Passed | Every original file, all 127 expanded regions / 635 reachable selectable stations, four synthetic saves |

The two baseline failures are specific: `living-combat-release.test.mjs` expects `cast` during an active stagger, while current `battle-motion.js` prioritizes stagger; its all-hunt sprite fixture supplies only the historical atlas, while `motion-atlas.js` now selects v116 `HUNT_POSES` assets for six identities. The newer `creature-gap116.test.mjs` checks pass with those current assets. These are pre-existing test/runtime-contract discrepancies, not overlay-induced failures. Reconcile the intended stagger priority and update the legacy hunt asset fixture separately; do not weaken runtime checks merely to make the old tests green.

The archive includes exact commands, result logs and model diagnostics. Interrupted/resource-killed attempts are disclosed but not counted as passes. The amended GitHub browser harness was syntax-checked; it was not executed locally through its Playwright CLI. Its screenshot and receipt changes still need a new CI run after approval.

The initial, uncorrected authenticated v116 overlay ran in the cloud browser at the local preview URL. Observations: Amber Dunes loaded; the native Map showed five ecological stations; selecting one left the displayed position unchanged at `4.50,23.50`; explicit Follow produced movement to `15.98,23.50` and an ordinary encounter; modern player/creature art and encounter objective UI were present. This is a local preview of authenticated source, not production gameplay or a deployment.

The observed battle reported a single `data-draw-ms` sample of 224.14 ms. This is a warning to measure performance, not an FPS benchmark: the cloud environment, rendering backend, concurrent workloads, startup cost and frame sample differ from a physical device. No sustained median/p95 frame-time measurement or real Android/iOS test was completed.

The first corrected 13-file preview timed out on reload and on a fresh tab. After adding the missing dependency, restarting the preview to refresh served files, and confirming the new distinct station labels, the final 14-file candidate loaded. In this final build: selecting the trace waypoint preserved `4.50,23.50`; Follow advanced to `12.01,23.50` with an active route; opening Map cleared the route, and closing it retained `15.45,23.50` with route length zero. Ordinary combat then displayed the modern Mirror Fox and character artwork, the modern combat controls and the authored field-store objective. No game-origin error appeared in the sampled console; extension metadata errors were present.

This is **limited corrected-build browser evidence**, not full gameplay certification. The observed renderer was `software-3d`, with isolated draw samples around 60–94 ms and visibly slow update cadence. Keyboard attempts near encounter entry did not produce an independently verified walking result; the test crossed into battle, so manual control remains an explicit follow-up. Full ecology dialogue completion, far-loop camera tracking, 2D fauna, physical touch, user saves and sustained performance were not verified. Do not interpret the successful map and combat smoke check as closing those gates.

Existing GitHub evidence at the merged stack head is mixed:

- Run `43576004726`: public script retrieval, syntax, overlay staging and artifact upload passed. Desktop failed at `locator.screenshot` waiting for element stability, with no recorded runtime exceptions/dependency failures. Mobile emulation passed its map and keyboard-movement smoke test. This is not physical touch or device-performance evidence.
- Run `43576004700`: archived-source desktop and mobile runs failed “No manual movement in any arrow-key direction at arrival.” A separate run on the same head passed. The inconsistent archived harness must be investigated, not relabeled green.
- The earlier 92-test run at `333baa5` covers the earlier stack, not all later browser infrastructure changes or this corrected candidate.

## Acceptance procedure before release

1. Reacquire the current Site source and verify the selected saved version's deployment and commit. If it differs from v116, repeat reconciliation; do not apply this old patch blindly.
2. Run all staging/safety tests. Generate a new overlay into a nonexistent external review directory. Check its old and new file hashes.
3. Copy the full authenticated `dist` to an isolated candidate. Apply only the overlay. Run `accept-current-regions.mjs` to compare every original file, campaign/scene identities, authored objects and floor connectivity, station reachability/selection, wildlife geometry, synthetic saves and far-position reloads.
4. Run modern regression suites for Fractures, living armory, authored motion, encounter objectives/pacing, camera, save validation and weapon growth. Run the archived topology, frontier/origin, quest and dungeon suites separately. Do not substitute these model checks for playing all chapters.
5. In a fresh isolated browser profile, test Map open/close with an already-active guide and an already-active tap route. Neither may resume after closing. Selecting a pin must not move, interact or start combat. Explicit Follow may move; manual input cancels it. Verify all five distinct activities through the actual Use/touch controls.
6. Complete one ecological investigation and both outcome branches in separate practice saves; verify clues, correct/incorrect repairs, one-time rewards, local encounter pacing and reload. Confirm fauna in 3D/2D, disappearance during battles, scene-bound culling and far-loop camera tracking.
7. Load copies of genuine older traveller saves, including campaign chapters 1/12/24, equipped gear, minerals, skill progression, active Fractures and completed frontier commissions. Compare exports before/after. Never use the user's only save for testing. Current model checks use synthetic engine saves, not the user's actual save files.
8. Play representative original routes and authored encounters in campaign, frontier, household, industrial and trial scenes; check doors, gates, battle entry/exit, retreat, story handoff, tutorial skip, camera zoom/pan/pinch and manual control after overlays close.
9. On desktop and physical phones, measure startup, peak memory and sustained frame-time median/p95 at arrival, far landmark, habitat, busy encounter and repeated transitions, in both renderers. Compare unmodified v116 on the same hardware/settings. Record dropped frames, stalls, draw calls/vertices and loading failures. CI viewport emulation does not establish mobile GPU performance.
10. Confirm production asset/cache invalidation and hosting output configuration. The authenticated manifest names `out`, while this checkout contains `dist` and no `out`; the review preview uses its own local manifest. Resolve the real packaging path before publishing. Then obtain explicit approval for the exact proposed push/merge/publication scope.

## Reproduction

From the proposed GitHub branch, with an authenticated source checkout available separately:

```sh
node --test --test-concurrency=1 scripts/tests/*.test.mjs
node scripts/stage-live-living-regions.mjs /absolute/current/dist /absolute/new-review-overlay
# Copy current dist to a separate candidate; overlay only the receipted files.
node scripts/qa/accept-current-regions.mjs /absolute/current/dist /absolute/candidate/dist /absolute/new-review-overlay/LIVING-REGIONS-STAGING.json
```

The review archive contains a repository patch, the corrected 14-file overlay, a patch against v116's `dist`, SHA-256 receipts, exact test commands/results and this assessment. It is not a standalone deployable Site. The next approval should be for a corrective repository PR only; deployment needs the remaining browser, save and device gates.
