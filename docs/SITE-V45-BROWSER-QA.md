# Ash & Aether Site v45 browser validation

Validated on November 11, 2026. Saved Site version 45 is the source identifier. The game displays `5.42 · Surface and shadow`. The latest separately hosted deployment was outside this validation.

| Area | Observed result |
| --- | --- |
| Provenance | GitHub main at `43925dab3153399d7aefe3626a22a01787fd400c` contained the exact recorded import tree `214fa44b249070e7843195b0ea8f4e0787e89b6d` and 2,767 tracked export files. The separate showcase check passed. |
| Entrance and navigation | The entrance audio advanced after Sound on. Escape closed the overture and restored the previously enabled entrance music. Sound off paused it. The cinematic atlas, soundtrack collection, and field guide linked from the entrance opened locally. |
| Overture transitions | Next scene played four local MP4s, `chapter-01`, `03`, `06`, and `07`. Each reported decoded 1280-pixel-wide video and an advancing playback clock. These are overture scene transitions. |
| Desktop campaign | Seven traveller cards rendered. Beginning as Sable opened Cinderfall. Opening dialogue advanced, the field canvas rendered, ArrowRight moved Sable from spawn x=21.5 to x=21.85–22.29 across runs, and Escape opened Pause. Supply bag opened and the menu return button worked. |
| Mobile campaign | With a 390 × 844 touch-emulated viewport, taps selected Iona and started her Lowbank origin. Touch controls enabled and document width matched viewport width. |
| Local saves | Manual save populated the enhanced save key. Export downloaded an approximately 6.5 KB save. Import rejected an empty JSON object and accepted the exported save. The saved scene and coordinates were present in local storage after import. Two reload attempts timed out and a second same-origin tab did not reach the traveller-resume control within 55 seconds. |
| Chapter selection | The developer portal loaded Chapter 2, The Dawn Carriage, at Bridge, and Chapter 4, Chapel of Rain, at Chapel through Explore this chapter. The guardian entry also loaded and its guide reached the carriage lock. These are prepared entry points. |
| 3D dungeon | The entrance link opened the temporary Remembering Cistern session. The canvas reported 13 draw calls on desktop and mobile. Map expanded, zoom changed from 135% to 123%, Pause exposed the practice save, and the desktop leave action returned to the field. Practice save did not create an ordinary campaign save. Mobile joystick touch drag moved the avatar from `0.00,12.00` to `0.00,11.24`. Desktop ArrowUp and W attempts did not change the reported dungeon coordinates in this software-rendered run. |
| Audio controls | Campaign ambience-only pacing and volume 0.25 persisted to local storage. With remote stems denied, the baseline field score reached `unavailable` and showed “♪ Retry music.” Local voices, ambience and footstep files returned 200 during sampled interactions. |
| Resources and errors | No local HTTP 4xx/5xx or uncaught page exception was observed in the sampled browser paths. The intentionally blocked raw GitHub stem requests produced console resource errors. A separate HEAD request for the pinned `interior_2_bed.ogg` returned HTTP 200 with `audio/ogg`. The connected adaptive arrangement was not exercised end to end. |

## Corrections

**Adaptive score with external requests unavailable.** The manifest under `game/music/aa-adaptive/` points to pinned raw GitHub recordings. `orchestratedProgram` replaces the bundled IDs in the current music program when a matching adaptive pool exists. After all remote arrangements fail, the unmodified director has no playable candidates. The proposed runtime diff passes the bundled IDs as a fallback pool and consults it only after the primary pool is exhausted. There are no asset substitutions or new network destinations. The candidate played the bundled “The Kettle and the Reed” in Chromium with the same stem requests blocked. All 56 music controls, director, program and transport tests passed, including a new director test for fallback and primary-pool priority.

**Source status.** The README's trust section and the pre-export integration guide describe the old source state. The proposed documentation diff records the authenticated v45 import, its build label, the separately hosted deployment boundary, and the correct route to the save-file controls.

## Remaining runtime coverage

The browser checks cover representative entry and movement paths. Natural campaign advancement between chapters, a complete guardian fight, campaign-mode dungeon entry and durable campaign dungeon progress, real mobile devices, controllers, hardware GPU performance, and listening quality need further playtesting. The test run did not attempt production saves or compare the current deployment to the export. Same-tab chapter navigation and resume after reopening timed out in the software-rendered environment. The cause of those timeouts and the desktop dungeon input result has not been isolated.
