# Ash & Aether 5.6 — integration and playability pass

Date: October 28, 2026. Target: existing Ash & Aether: Clay and Water Site; existing owner-only audience preserved. The older Chrono · Clay & Water publication is separate and was not overwritten.

## Implemented

- Named, reachable opening objectives for all seven protagonists, with backtracking guidance and short first walks.
- Controller routing in traveller selection; no hardware-controller claim.
- Wait/Active battle decisions, persistent preference, selected-target Auto, contextual tactical advice.
- Command buttons first in the battle dock, sticky during scrolling, 48px in objective combat; details no longer hide actions on short landscape screens.
- Transactional technique validation, actual-damage siphons (techniques and supplies), defeated-enemy intent suppression.
- Compact landscape, notch-safe touch placement, dialogue/controller separation, 44px menu targets, cancellation and pointer ownership fixes; release on rotation.
- Isolated save preflight, canonical migration, resumable echo/field validation, protected field-trial return state, import-before-preserve ordering and old route/panel cleanup.
- Recovery menu with autosave suppression after runtime errors, bounded earlier-telling archives, and continuing NG+ histories beyond 512 cycles.
- Named required-art loading progress with one retry and bounded timeouts. This improves diagnosis, not total download size; the required art remains about 31.9 MiB.
- Current edition and source/provenance documentation reconciled. No new volumetric character rigs or cinematic production system is claimed.

## Verification

- Full engine suite, exact final result in `release-5.6-tests.log`.
- Animation/player compatibility: 12/12 passed.
- Two engine campaign traversals: 24 chapters, 66 fights, 84 visited rooms and all seven decisions per route. These are engine actions, not controller-earned browser playthroughs.
- First random encounter: seven origin leads × three RNG rolls (21 engine-earned fights), real starting kit and map geometry, nonlethal objectives all completed.
- All seven origin stories followed on foot through repair, diversion, destiny and present-day convergence. First named objectives reached within five simulated seconds from spawn.
- Browser: actual new origin, ordinary conversations, civic repair, objective-guided travel, earned random battle, a paid starting technique (38→32 MP; enemy 64→10 HP), saved-encounter resume, Goal actions, Wait clock and picker return.
- Browser layouts: 390×780 portrait and 740×360 landscape. Landscape dialogue and confirm bounds do not overlap. All eight battle command targets measured 71×48px inside the landscape viewport after correction.
- Browser readiness regression: opening Goal before a hero was ready continued charging, then displayed `Decision time · paused` and enabled the earned objective action.

## Still unverified / outstanding

Real Android touch latency, sustained phone GPU/thermal performance, hardware gamepads, a continuous first-hour browser/player acceptance run, and full continuous browser campaign coverage. Subjective writing/cinematic quality, long-run economy/build balance, and whether content variety sustains player interest need dedicated player testing. The current work resolves concrete integration and usability faults; it does not certify every previously identified design risk as closed.
