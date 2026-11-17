# Gear and Mako reconciliation — published v177

Published November 17, 2026 at https://ash-aether-clay-water.towre676.chatgpt.site/ .

The authoritative Site source is commit `5a929351415771aabc4a1a892156f277a6cd887c`, based on published v176 `18ac33d4bd0016e29a3eb7e62d19d565d615f983`. It preserves the v174/v175 equipment work and v176 Mako overhaul. Deployment `appgdep_6afcc0b4645081919e4a87647e88f690` returned **succeeded**.

## What changed

- Mako full-figure banner and roster use current equipped portraits, including late artwork readiness.
- Dynamic cinematic crew sprites use the shared equipment compositor while retaining body scale and foot pivots.
- Standalone expedition lead, followers and staged crew consume a frozen snapshot of the campaign's canonical equipment sources. It survives session reload and receipt updates and never writes gear/progression over the host.
- Unsupported character/civilian identities and mismatched authored rig metadata fail safely.
- Mako card and selection styling is isolated from legacy menu CSS.

Field, combat, aiming, character inspection, dialogue and Living Armory continue using the existing equipped-appearance framework. No alternate equipment inventory or PR #18 renderer was introduced.

## Verification

- 186 passing release tests across 28 files; zero failures.
- Separate 31-test legacy expedition run passed.
- PR #18's exact historical resolver: five tests passed; both files verified against original GitHub blob identities at `5c590bb77da546df75550298bf25a787334582c1`.
- All seven heroes: 42 production actor views spanning front/rear/run/attack/aim; 91 equips, 91 removals, 91 re-equips. World save/restore and scene changes preserve all 42 pixel hashes; no painted-edge warnings.
- All 200 destination previews freshly captured. Eight repeats compare 2,534,400 decoded channels with zero differences; valid field output remains identical to v176.
- Browser: real live v176 earned-mantle equip; final isolated production-component review of all seven Mako portraits, gear removal/re-equip and actual actor emissions. Full campaign walkthrough not claimed.
- Runtime: 262,499,876 bytes; 781 code files match edited source; zero missing imports. Original world.json unchanged.

Exact receipts and screenshots are tracked in the authoritative Site source under `docs/verification/combined-gear-release/`.

## PR #18 disposition and patch

The historical resolver is an unintegrated design prototype. Its safeguards were reconciled with the newer live implementation; importing it would create a competing presentation contract. It is superseded, not merged as production renderer code.

[Review the current-source patch](gear-mako-v177.patch). It applies cleanly **only to the exact v176 Site baseline above**, not to this repository's older live-site snapshot. It contains the eight runtime-file edits and four new focused regression files. It is a review/archive artifact, not a full current-game export or a deployment instruction.

## Explicit remaining limits

NPCs/hostile humans have shared equipment placement and state, but full anatomical garment-removal masks across all 80 civilian styles remain unfinished. Do not claim universally clean NPC costume replacement. Static authored paintings/videos remain fixed illustrations. This release validates representative complete player outfits, not every possible combination or every campaign route.

This documentation and patch do not replace the historical repository's game tree or publish that older snapshot.
