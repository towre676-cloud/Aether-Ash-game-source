# Verify the integration that is already installed

Local follow-up to PR #16, based on commit `ca58445361b456ff8d241700899ae2a08946780f`. This follow-up has not been pushed, merged or deployed.

The approved review branch was pushed and draft PR #16 opened on November 14, 2026. Its current-Site workflow fetched fresh public sources successfully and passed the eight staging/connectivity tests. Staging then correctly refused a duplicate spatial integration, so its browser step did not run:

https://github.com/towre676-cloud/Aether-Ash-game-source/actions/runs/43631644299

The currently served files now include `living-regions-117` imports, expansion, ecology, native manual waypoints and a separate `floor-connectivity.mjs` implementation. The latter uses iterative articulation points and the current affordance flood is no longer truncated at 5,000 cells. These changes were already present when fetched; this session did not publish them. Current code also includes a newer fieldwork prompt that must be preserved.

## Local correction

1. Add `stage-current-verification.mjs`. If the current source is not integrated, retain the approved 14-file overlay route. If it is integrated, validate the required integration hooks and capture **15 current modules byte-for-byte**, including the current floor-connectivity implementation. Partial/unsupported installations fail closed. The original duplicate guard remains unchanged.
2. Update the verification workflow to fetch the six installed integration dependencies when needed and use this adapter.
3. Allow the browser verifier to consume that exact installed snapshot. Every installed file must have equal input/output SHA-256, the manifest must record zero source modifications, and the usual preflight verifies that the public source still matches. Gameplay assertions, touch/camera checks and trace capture remain enabled.

This does not transplant archived code, replace current modules with earlier versions, relax the browser assertions or modify the Site. It selects the correct input for the existing browser test.

## Local validation

- All eight existing staging/connectivity tests pass.
- Fresh installed source produces a 15-file snapshot with equal input/output bytes and hashes.
- A newer Unicode comment added to a temporary source copy survives byte-for-byte; all source files remain unchanged.
- Existing output directories and output paths inside the source are refused.
- Removing a native ecological-map integration hook causes rejection before output is written.
- Pre-integration sources still produce the approved 14-file overlay.
- Syntax checks and `git diff --check` pass.

Full browser verification remains outstanding until the follow-up is approved, pushed and run in GitHub's Chrome environment. The separately hosted game has not been altered by this session.

## Other workflow results

The public showcase workflow passed. The separate **archived-game** browser smoke test failed its manual-movement assertion on desktop and mobile, with no recorded runtime exceptions or missing engine modules. This is a distinct historical executable; it does not establish a current live-game defect. Its test and historical source are unchanged in this follow-up:

https://github.com/towre676-cloud/Aether-Ash-game-source/actions/runs/43631644319

The broader living-regions workflow was still running when this local review was prepared. Do not interpret a completed source snapshot, the previous merge, or passing unit tests as a successful current-game browser integration result.

## Reproduce

From the repository root, with a directory containing the current public 15 files under `game/engine2/`:

```bash
node scripts/stage-current-verification.mjs /absolute/current-source /absolute/new-verification-snapshot
QA_MOBILE=1 QA_REVIEW_ROOT=/absolute/new-verification-snapshot CHROME_BIN=/usr/bin/google-chrome \
  node scripts/qa/browser-current-overlay.mjs
```

The same adapter also accepts the nine pre-integration inputs used by the original overlay. The output directory must be new. No command here publishes anything.
