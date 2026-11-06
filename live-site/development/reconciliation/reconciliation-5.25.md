# Ash & Aether 5.25 — recovered presentation and readable encounter openings

Date: 2026-10-29. Source baseline: `7424016cf051d24c88abca541e734a37490384f9` (5.24.0).

The other session's delivered code was recovered and adapted to the actual Canvas2D game. This change also gives fresh ordinary patrols an earlier, readable role opening, so a short fight can present a decision before it ends. The benchmark demonstrates different outcomes from different responses; it does not measure enjoyment or establish a fun score.

## Release verification

- **Automated release gate: passed.** The complete run reported **1,382 passing cases across 178 modules** in 212.315 seconds, with zero failures, skips, cancellations, pending cases, missing summaries or inconsistent counts. It finished at 2026-10-29 19:17:25 UTC; the source revision remained unchanged. Receipts: [JSON](../../docs/verification/release-5.25-tests.json) and [complete log](../../docs/verification/release-5.25-tests.log).
- **Browser verification: completed for the representative scenarios below.** These observations cover actual current gameplay and UI, not a physical-device benchmark or a full campaign run.
- **Delivery seal: completed at 19:19:57 UTC.** The [per-file fingerprint](frozen-delivery-5.25.json) matches the post-gate runtime checkpoint exactly and includes hashes of the browser proof files. The release owner confirmed that runtime bytes remained unchanged since gate launch.
- **Publication: not performed or asserted by this report.** The release owner handles source commit, saved version and deployment status after validation.

## Recovered package and provenance

| Field | Verified value |
| --- | --- |
| Original filename | `Ash_Aether_Vista_Presentation_Upgrade_v1.zip` |
| Library identity | `libfile_90541d3406b48191940d76c7823d4e22` |
| Underlying file identity | `file_000000002cec81f5964cfc6458e048f8` |
| Canonical path | `/Ash_Aether_Vista_Presentation_Upgrade_v1.zip` |
| Created | 2026-10-29 18:52:43 UTC |
| Archive bytes | 716,950 |
| Archive SHA-256 | `2a40fe23208e004af5fd5e86c72f95024f2e58fa3159a28af409a02f89df098d` |
| Preserved core SHA-256 | `c7ef57696b573f6e214465c220ab16ed0543ce76fbc02a31e9f04ddc016cd0db` |

The complete extracted source, README, tests, study and its screenshots are retained in [sources/vista-presentation-v1](sources/vista-presentation-v1/README.md); [RECOVERY.json](sources/vista-presentation-v1/RECOVERY.json) records the provenance. The original 7,310-byte core is also retained unchanged at `dist/game/engine2/reconciled-content/vista/vista-core.mjs`; its hash was checked against the development copy.

The source README explicitly says the package had **not been integrated or deployed**. It contains a pure presentation core, an optional Three.js scene bridge and an independent 2.5D HTML composition study. Its six landmark implementations, camera director and generic torus effects are prototype implementations, not proof of host integration. The original core header declares MIT and original implementation; no separate LICENSE file or copyright-holder declaration was bundled. Its original notice is preserved. No Eternal Sword Pact art, animation, sound or code is included.

The separately saved `vista-showcase.html` has Library identity `libfile_39bbf0f887f8819185d43543e8dcdabb`, returned version `1`, and size 17,844 bytes. That page and the packaged screenshots depict the standalone study, not the shipped game.

## Reference evidence and limits

The recovered README lists actual-gameplay video URLs from iroGames, MR.Boneflow, Clutch ABHIJIT and Married to Gaming. Its own evidence note says titles/listing details were checked, but YouTube's sign-in/anti-bot gate prevented inspection of the requested timestamps. No frame-by-frame footage analysis, decoded combat timings or demonstrated competitor performance is claimed. The retained [source README](sources/vista-presentation-v1/README.md) preserves those URLs and qualifications.

The current research pass separately inspected the **28.63-second publisher promotional preview** on the [official App Store listing](https://apps.apple.com/us/app/eternal-sword-pact/id6754371626). Observed moments included a layered city and clear route with a red actor/cyan trail around 3.4 s; overhead grass combat with purple ground glyphs and lifted ribbons around 12.9 s; and a concentrated white impact around 18.3 s. This is publisher promotional footage, not a normal HUD gameplay session. It supports those visible composition observations, not claims about its engine, shaders, FPS, camera timing or normal encounter pacing.

The useful presentation ideas are restrained foreground contrast, regional atmosphere, authored focal points, readable warnings and visible action results. Their suitability is a design judgment; the release's actual implementation and tests are the evidence for host behavior. The study's camera, HUD, boss simulation and Three.js renderer are not runtime replacements.

## Adaptation in the real game

- **Scene presentation:** [vista-scene.js](../../dist/game/engine2/vista-scene.js) reuses the preserved `composeLandmark` and `QualityGovernor`. It builds masks from the actual floor, adds quiet bank haze and open-floor light, admits at most three existing traversable authored foci, and attaches optional directional shade to admitted outdoor trees. Interiors receive none of these outdoor passes. A small crew silhouette edge improves separation from bright effects. Quality scales optional shade budgets using measured draw cost; that measurement is not claimed as full-frame FPS.
- **Camera:** [camera-window.js](../../dist/game/engine2/camera-window.js) adds bounded exploration lead from actual displacement, so pushing against a wall does not pan the view. Steady lighting suppresses lead, and large teleport-like displacement is excluded. The established composition/window/follow chain, interior framing and boss-warning safety framing remain authoritative. [scene-camera.js](../../dist/game/engine2/scene-camera.js) reuses the original `damp` helper with the existing interpolation rates and time bound. The prototype's competing camera director is not installed.
- **Confirmed combat feedback:** [vista-combat-feedback.js](../../dist/game/engine2/vista-combat-feedback.js) reuses `describeCombatEffect` for modest surface response. Positive direct physical damage produces short directional sparks. Actual armor breaks, Guard reductions and successful full-formation evasions produce compact, distinct labels/icons. Ordinary casts, shells and warnings retain their existing visuals. The adapter caps 12 impacts, six result cues, four optional surface queries per frame and 192 explicit event IDs; duplicate event objects are also rejected. Scene changes reset transient state. Reduced motion and compatibility retain essential labels while suppressing particles.
- **Renderer integration:** both draw passes use the existing frame loop and world coordinates. Ground treatment is below actors and warnings; result labels draw after ordinary effects. No second input system, simulation, render loop, screen-shake source or gameplay timer was added.

## Earlier ordinary-patrol decisions

[encounter-tempo.js](../../dist/game/engine2/encounter-tempo.js) is enabled by a versioned fresh-battle marker. Eligible ordinary enemies announce their first role before competing for loose battlefield tools. Nominal readiness seeds are mender 0.55 s, predator 0.70 s, guard 0.85 s and scout 1.05 s, with a bounded same-role stagger. Actual movement, readiness modifiers and scouting preparation still govern when an enemy can commit. First damaging strikes keep at least 1.65 s of visible locked warning; existing scouting extensions remain effective.

A healthy formation's mender opens with a marked strike; a wounded ally can still cause repair. Guard and scout retain their shield/alarm roles. Tool collection resumes on later turns. Boss, objective, wild/ecology, friendly, tutorial and rival encounters do not receive the ordinary-opening readiness change. New optional save fields are validated; historical unmarked battles keep their old opening and timers.

Authoritative tactical results are emitted only when:

- a living enemy's positive armor actually reaches zero;
- a hostile hit is reduced by the existing Guard multiplier, with its actual prevented amount;
- a damaging spatial mark threatened a living hero when announced and resolves with zero hero targets.

Pressing Guard, an empty-ground miss, a dead marked hero, a partially hit formation or an interrupted attack does not fabricate one of those outcomes. [Encounter previews](../../dist/game/engine2/encounter-preview.js) explain the marked striker and subsequent alarm caller using actual encounter data.

## Controlled benchmark

The [receipt](../verification/encounter-tempo-benchmark.json) and [reproducer](../verification/encounter-tempo-benchmark.mjs) use the actual earned opening party, gear/loadout, canonical enemies, floor and combat-order driver. The matched independent variable is the fresh tempo marker. All ordinary rows below start with the same **116 total enemy HP**.

| Opening policy | Clear time | Crew HP lost | Observed distinction |
| --- | ---: | ---: | --- |
| 5.24 control, Attack caller | 4.45 s | 0 | First enemy warning starts tool collection at 3.50 s; no damaging release before victory. |
| 5.24 control, earned Earth caller | 2.90 s | 0 | Victory before any warning. |
| 5.25, Attack caller | 4.45 s | 78 | Mender warns at 0.55 s and releases at 2.20 s. |
| 5.25, earned Earth caller | 2.25 s | 52 | Striker still releases before the caller-focused victory. |
| 5.25, redirect earned Earth to first striker | 2.15 s | 0 | Removes the announced threat before its release; no interrupt is claimed. |
| 5.25, Guard once then Attack caller | 5.15 s | 62 | One confirmed Guard result; 16 damage prevented. |
| 5.25, move clear then Attack caller | 5.60 s | 0 | One confirmed evade; moving sacrifices attack uptime. |

The first paid action remains at 1.75 s in the stationary policies. The idealized dodge policy first acts at 2.90 s. An idle 12-second probe times out with one reinforcement; it is deliberately not counted as a completed win. The matched guardian controls both win in **17.30 s with 78 crew HP lost**, 418 initial enemy HP and the same warnings, demonstrating unchanged guardian behavior in this specific harness. Those values are not interchangeable with older benchmark fixtures.

Simulation steps are 50 ms. Dodge has geometry-aware per-hero decisions every step. Menus, cinematic pauses, pointer input, human reaction time and Ground Forge/Living Atlas modifiers are excluded from both sides. These comparisons establish a response opportunity and its deterministic consequences; they are not a new-player study, physical-device performance test or numerical enjoyment rating.

## Preservation and verification

The existing Canvas2D engine, scene geometry, floor collision, pathfinding, player movement, authoritative hit geometry, HP/damage formulas, enemy totals, drop tables, economy, equipment transactions and reward persistence are retained. Earlier role readiness changes the sequence and resulting exposure to existing damage; it does not make the combat outcome identical. Ground Forge, Living Grass, Living Atlas, audio, interiors, NG+ and historical save ownership remain in their established systems. No new terrain, colliders, settlement, inventory system or competitor asset set is introduced.

The recovered core's **13 tests passed** when executed directly. The complete 5.25 gate includes **9/9 Canvas feedback, 6/6 Vista scene, 14/14 encounter tempo, 12/12 camera window and 20/20 encounter preview cases**, all passing. These cover truthful event mapping, immutable presentation inputs, coordinate snapshots, deduplication, reset, bounded work, malformed values, modes, expiration, exact floor-mask partitioning, indoor exclusion, real authored foci, first-warning timing and historical save compatibility. Those module counts are subsets of the 1,382-case total, not additional cases.

## Observed browser run

The release owner entered the actual chapter-one Security patrol through click/keyboard controls in a development-session journey. Porcelain Mender hit Sable for **26**; Alarmwing summoned a Night Raptor while the player delayed. Opening Mako paused combat in Wait mode. Selecting the mender and using Fault Lance dealt **111** and defeated it; Auto finished the remaining enemies. The story receipt displayed “The drones scatter” and **40 credits**; Continue returned to the field. [Post-patrol receipt](../../docs/verification/browser/aa-patrol-5.25.jpg).

The actual **500 × 824** browser viewport exercised battle buttons, target cards, the Mako picker and reward continuation. This establishes a narrow-browser check, not physical-phone behavior. Through Pause UI, Compatibility selected the actual low presentation tier; Standard was then restored and Steady toggled on/off. Outdoor movement produced a valid Vista diagnostic with medium quality, one authored focus and three tree shadows. Indoor diagnostics had an indoor plan with no foci. [Outdoor Standard scene](../../docs/verification/browser/aa-vista-standard-5.25.jpg).

The last 100 available browser error-log entries contained only extension metadata errors and no application entries. That is a bounded log window, not a claim that the complete browser history was clean. These representative checks do not establish physical-device frame rates, uninterrupted campaign completion or new-player enjoyment.

## Delivery checkpoint

The [runtime-freeze receipt](runtime-freeze-5.25.json) captured **2,130 files and 262,135,872 expanded bytes** at 19:17:48 UTC, shortly after the complete gate finished. The release owner confirmed the runtime had remained frozen since gate launch. Its aggregate is `dcfee6afd48ba37e5143acc4f8d635ca8bb3e4d844340fef2060b65982a632a3`; the expanded hosting limit leaves **6,299,584 bytes** of headroom. The [seal script](seal-release-5.25.py) successfully checked the terminal gate, completed browser status/evidence and exact byte agreement with that checkpoint, producing [frozen-delivery-5.25.json](frozen-delivery-5.25.json). Publication remains a separate subsequent operation.

A passing automated gate establishes regression coverage, not universal visual quality, balanced long-term progression or player enjoyment.
