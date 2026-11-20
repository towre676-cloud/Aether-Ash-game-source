# Current Site integration verification repair

Review prepared 2026-11-14. Local proposal only: no push, PR, merge, publication or deployment.

## Source identities

- GitHub base: `86081e8cc18d0681e2ac15fd176d6c5b271130fb`, after PR #15.
- Actual modern Site: v116, source checkout `a9a79147da891cba10864a5535b66799246dbea1`.
- The historical `live-site/` tree in GitHub is not the current game. No files in that tree are changed by this correction.
- Eight originally overlaid live scripts matched the failed CI artifact and the modern owner checkout byte-for-byte. The newly required ninth input, `world-affordances.js`, also matched the current public file and owner checkout.
- Overlay staging is create-only, signature checked and SHA-256 receipted. Nine modern source modules are patched narrowly and five additive modules are copied, for **14 files**. The current owner's source checkout remains unmodified.

## What the original failure establishes

Run [43576000113](https://github.com/towre676-cloud/Aether-Ash-game-source/actions/runs/43576000113), diagnostic artifact [14105939761](https://github.com/towre676-cloud/Aether-Ash-game-source/actions/runs/43576000113/artifacts/14105939761), reports the same failure on desktop and mobile: `locator.screenshot` waited about 30 seconds for element stability during its scroll-into-view action. Fonts had already loaded. Both reports list all 13 original overrides, zero recorded JavaScript exceptions and zero recorded engine dependency failures.

The preserved artifact contains one mobile error screenshot and the JSON report, not a desktop screenshot. The mobile image shows the native room map, ecological labels, and “Waypoint selected” status. Inspection of the old harness confirms that map/marker/status assertions preceded the failed locator capture. Its unchanged-position assertion could compare two missing attributes, so this proposal requires valid numeric coordinates.

This is evidence of an unstable **capture path**, not proof that CSS animation, continuously changing geometry, GPU load, or a gameplay defect caused the original timeout. The original run had no trace or sampled geometry to distinguish those causes. No arbitrary animation disabling or forced clicks are introduced to manufacture a pass.

## Harness correction

- Replace dialog locator captures with bounded viewport captures; preserve gameplay assertions as separate checkpoints.
- Require nonempty, finite player coordinates and no movement during manual waypoint selection.
- Retain progress checkpoints even when a later screenshot or assertion fails.
- Sample map bounds, scroll, animation state, focus/visibility, requestAnimationFrame timestamps and player position. Archive browser long tasks, traces with screenshots/sources, failure images and both original/patched source inputs.
- Fail on all recorded JavaScript exceptions, engine dependency failures, source drift, or missing substituted modules.
- Exercise actual mobile touch input, including the joystick; exercise native manual and automatic camera zoom, and the explicit Follow action.
- Keep GET-only browser routing and fresh isolated browser contexts. CI has read-only GitHub permissions and no Site publishing step.

## Separate implementation defect

The historical expansion included an efficient repair-connectivity calculation, but the original modern 13-file overlay omitted it. Modern `world-affordances.js` repeatedly floods the floor for candidate repair sites and truncates flood exploration once the queue reaches 5,000 cells. Expanded regions can exceed that size. The truncation invalidates the complete-component comparison and repeated scans are costly.

The correction ports only the iterative cut-vertex algorithm into the current file and removes the flood truncation. A tile is admissible only when its existing degree requirement holds and removing it cannot disconnect the full arrival component. Existing candidate ordering, architectural reservations, protected story/arrival points, placement, repair IDs, profiles, save logic and Fracture rules remain in the modern implementation. The historical file is not copied over the modern one.

An isolated benchmark on expanded scene 228 (120 × 120, 5,052 floor cells) initially reached the layout calculation but exceeded a 30-second **whole-process** budget with the original algorithm. The corrected initial measurement placed four objects in 221 ms (6.664 seconds for the whole process). A reproducibility rerun completed both variants: **22,068 ms / 3 objects before; 100.48 ms / 4 objects after**, with whole-process times of 24.421 and 2.261 seconds. Both measurements are retained; timings depend on machine load. This is not a browser screenshot benchmark and does not identify the original screenshot root cause.

## Validation and its limits

| Check | Result |
|---|---|
| Fail-closed staging/connectivity suite | 8 tests passed; cut vertices checked independently against removal BFS on 120 masks and a graph with over 13,000 connected cells |
| Existing modern-game regression suite | 67 tests passed: camera zoom, locomotion, continuous campaign, save validation, Fractures, living armory and rewarding hunts |
| Additional bounded combat/equipment regressions | 7 tests passed |
| Current-source save migration | Passed; canonical restores and round trips preserve campaign, equipment, minerals, Fracture and hero fields |
| Representative older frontier saves | Eight scenes restored to walkable positions |
| Expanded region checks | All 127 regions; routes to all five ecological stations traversed through the actual movement engine |
| Wildlife engine checks | Moving actors remain on floor; 3D geometry and 2D draw commands emitted in all 127 regions |
| Manual isolated-browser observations | Native Map opened; five habitat markers appeared; selecting one showed an 80-tile waypoint; coordinates remained `4.50,23.50` across observations |
| Complete corrected Playwright run | **Not completed locally**: sandbox browser startup failed with `socket() ... Operation not permitted` |
| Desktop/mobile GPU visuals, camera controls and regional transitions in a complete browser run | **Outstanding**; engine checks are not a substitute |

The cloud-browser fallback reached the isolated map. Clicking an outer diagnostic control moved focus out of the game iframe; the game's existing blur-to-pause behavior closed the map during measurement. That sample is contaminated and cannot establish animation instability. The proposed local review page now starts diagnostics automatically from the in-game marker click, without shifting focus. A subsequent reload was rejected by the browser URL authority policy, so this revised page and the full browser flow were not rerun there. The manual observations are not a receipt that all 14 network substitutions loaded.

The first broad engine run on the original overlay was interrupted after prolonged execution and is not counted as passing. The 67-test result above belongs to the corrected isolated source.

## Reproduce without touching the Site

Use Node 22 or later and the separately obtained **current** source `dist` directory. Set `CURRENT_DIST` to that directory; do not point it at the GitHub historical `live-site/` tree. Run from this repository root:

```bash
node --test scripts/tests/*.test.mjs
node scripts/stage-live-living-regions.mjs "$CURRENT_DIST" qa-live-review
node scripts/qa/prepare-current-review.mjs "$CURRENT_DIST" qa-live-review ../current-overlay-review
node scripts/qa/check-current-runtime.mjs "$CURRENT_DIST" ../current-overlay-review/dist current-runtime-report.json
node scripts/qa/benchmark-current-affordances.mjs "$CURRENT_DIST" ../current-overlay-review/dist current-affordance-benchmark.json
```

The staging and review output directories must not already exist. The full-copy review includes `/qa/index.html` for manual desktop/mobile-layout inspection, and has no Site project identity. The mobile-layout wrapper does not emulate touch hardware; the Playwright mobile context does.

Run the existing modern tests against `../current-overlay-review/dist/game/engine2/tests/`:

```bash
node --test ../current-overlay-review/dist/game/engine2/tests/{camera-zoom,player-locomotion,continuous-campaign,save-validation,fractures,living-armory,rewarding-hunts}.test.mjs
```

For an environment permitted to launch Chrome, install `playwright-core@1.56.1` under `scripts/qa` as shown in the workflow, then:

```bash
CHROME_BIN=/usr/bin/google-chrome QA_MOBILE=1 QA_REVIEW_ROOT=qa-live-review \
  node scripts/qa/browser-current-overlay.mjs
```

This run fetches the actual public game and substitutes only the hash-verified overlay in the isolated test context. It aborts if the public source has changed. It creates `qa-artifacts-live-overlay/` with the report, screenshots, geometry, long-task data and desktop/mobile traces. Open traces with the standard Playwright trace viewer. A passing CI job must contain passing desktop **and** mobile receipts; the GitHub merge or engine results alone are insufficient.

## Approval boundary

The proposed next external action is to push the review branch and open a pull request so the revised workflow can run in GitHub's Chrome environment. That requires the user's explicit approval. Merging and deploying the separately hosted Site remain unapproved, especially while complete browser integration is outstanding.
