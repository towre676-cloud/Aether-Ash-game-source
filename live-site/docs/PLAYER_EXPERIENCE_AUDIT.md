# Player-experience audit — 5.1.0

This is a cross-system repair pass, not a claim that the entire game is bug-free. It follows the user's request to treat Y-button crowding and desk shadows as examples of a broader quality problem.

## Established references

Microsoft's XAG107 documents Call of Duty Mobile custom layouts, Fortnite presets, Need for Speed separated action zones, and Diablo Immortal drag-out cancellation: https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107 . The touch repair uses these patterns: isolated utility control, inactive gaps, saved size presets, and cancellation before confirming Y. Sizes here are CSS pixels and are not a claim of physical millimetre or Android dp compliance.

Godot's official 2D lighting guide separates ambient modulation, light sources, occluders and shadow filtering: https://docs.godotengine.org/en/stable/tutorials/2d/2d_lights_and_shadows.html . Our Canvas2D application is an engineering inference: compact furniture contact shadows, actual fixture positions, clock-sensitive windows, floor/partition clipping and cached visibility. It does not introduce real-time global illumination.

## Repaired failure cases

Mobile controls now have 52px primary targets and a 64px confirm target, or 58/70px in the saved larger preset. Y is outside the primary cluster; release outside cancels instead of opening Characters. Movement and primary hold actions remain immediate. View layout consumes the actual control reserve. Battle keeps its separate command dock and a 14px joystick gap.

Desks and other furnishing paths no longer emit detached hard rectangular shadow slabs. Contact shadows are restrained to the support footprint. Duplicate wall darkness, permanent daytime window beams, coincident fixture lights and duplicate glow patches were removed. Lights respect the room floor and partitions. Enemy attack warnings, status marks and hit text render after the environment-light pass.

Objective and direct-tap interactions cannot activate a nearby object through an intervening wall. Guided objectives are resolved again before interaction when an NPC moves or disappears. A blocked tap route releases control with feedback rather than walking forever. The preparation cue stays hidden during dialogue and combat and refreshes when the first core unlocks.

Long combat spell/supply lists retain a persistent Back to commands action. Character joins match the current crew's level. Corrupt character slots are excluded; rerolls always change the actual combination and preserve per-character manual selections. Repeated roster opening cannot stack overlays. The character showcase shares atlas cleanup, releases GPU resources, handles shader/context failure, avoids hidden/reduced-motion redraws and caps automatic painting at30Hz.

Imported/restored saves are preflighted in an isolated World before the active journey is changed. Imports persist immediately. Page hiding stops held inputs and audio and pauses play. During unfinished dialogue, saving uses the pre-interaction checkpoint rather than a half-applied choice whose callback cannot be restored. Resuming such a checkpoint may replay the last interaction. Music level now persists, including voice ducking while adjusted. Display options include bounded scene brightness, camera shake and steady lighting; reduced-motion preferences inform defaults. These options do not constitute flash-analysis certification.

## Verification

The mobile harness rendered the actual game at390×844 and844×390. Browser DOM measurements confirmed the spaced preset rectangles, including52px Y and64px A. Y opened Characters on release. The portrait capture records the isolated Y and repaired indoor furniture view. Focused navigation, battle dock, guide, roster, showcase, checkpoint, import, lighting, collision and touch regressions pass. Full-suite results are retained in verification/player-experience-tests.log after completion.

Full volumetric character rigs, network multiplayer and an exhaustive physical-device/performance matrix remain outside this repair. The source and screenshot are a reproducible checkpoint for the next pass.

The full engine run exercised342 tests:341 passed and one failed because the new-site checkout lacked the original ROOM_COMPOSITION_V5.json legacy fixture. That exact fixture was recovered from the original source checkout; all9 household tests then passed, including the previously blocked one. All342 checks are therefore verified across the full run and the affected-file recheck. Both unedited logs are retained.
