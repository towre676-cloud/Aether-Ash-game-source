# Release verification — A&A 5.24.0

## Implemented scope

This release connects encounter information, responsive orders, spatial combat,
and usable earned rewards. It does not claim that regression results establish
player enjoyment. The candid assessment, comparison research and remaining
design limits are in [fun-research-5.24.md](../../development/reconciliation/fun-research-5.24.md).

- Nearby encounter and repair previews explain actual threats, feasible answers
  and truthful rewards or uses. A single visible order can wait for readiness
  and safely approach its target; movement, Cancel and Pause cancel it. Clicking
  clear battle ground moves the selected hero. Wait mode still pauses choices.
- Fresh marked encounters use 2.6-tile strikes, 8-tile offensive Mako and actual
  floor visibility. Enemies close between warnings; announced attacks stay
  locked. Generic pounces share their painted 1.05-tile circle with hit testing.
  Healing, Guard, Counter and Links retain their established targeting. No
  global HP increase or new meter was introduced.
- Reinforcements use connected, unoccupied floor where available, correcting
  wall spawns in Letter Attic and Storm Anchorage. Full scene geometry is
  rebuilt at runtime. Old unmarked in-progress saves retain their previous
  encounter rules; existing origin and save regression modules ran in the gate.
- Victory receipts retain actual XP, credits, materials, named equipment and
  unlocks. Recruited bearers and explicit ring slots can be compared and equipped
  through the canonical transaction, without granting rewards again. Receipts
  survive story/travel handoffs and later equipment changes.

## Verification and its limits

The authoritative run passed **1,348/1,348
cases across 175 modules** in 228.293 seconds,
with zero failures, skips, cancellations, pending cases, missing summaries or
inconsistent counts. The revision remained unchanged. This is the zero-issue
automated gate; no separate world-validator result is claimed.

- [Authoritative JSON](release-5.24-verified-tests.json) and
  [complete log](release-5.24-verified-tests.log); finished 2026-10-29T18:35:29.886Z.
- **After that gate**, an empty-selection Armory null lookup and browser cache
  keys were corrected. The complete affected Armory module then passed
  **18/18 cases**: 17 overlap the gate and one is new. See
  [post-fix output](release-5.24-armory-final-tests.log). A full 1,349-case gate
  was not run, and the final delivery differs from the full-gate tree.
- Import normalization covered 53 changed browser files and five rewritten
  importers, with zero stale references; the final diff whitespace check passed.

Controlled earned-kit runs retain the opening Attack patrol at 4.45 seconds
and the stationary first guardian at 12.40 seconds / 38 crew HP lost. The same
idealized dodge strategy changes from 12.40 to 15.65 seconds with zero damage:
retreat now gives up melee uptime. An order can be entered at time zero while
the first paid action still occurs at 1.75 seconds. These deterministic 50 ms
simulations exclude menus, cinematic pauses, human reaction time and Ground
Forge/Living Atlas modifiers on both sides. They are not a human playtest.
The [benchmark and method](../../development/verification/combat-engagement-benchmark.json)
and [reproducer](../../development/verification/combat-engagement-benchmark.mjs)
preserve those distinctions.

The [24-guardian route audit](../../development/verification/combat-campaign-engagement-audit.json)
has zero timeouts and zero blocked-approach notices. Its artificial level/Break
policy has the same result in all rooms before and after: 20 wins, four losses
(chapters 17, 19, 21 and 23). This checks connectivity and compatibility, not
normal progression difficulty or an uninterrupted campaign playthrough.

## Observed browser checks

The preview exercised a field encounter brief, a real armored salamander,
Fault Lance breaking its shell, an earned ring receipt, canonical Equip and
Armory confirmation. A charging Guard executed once; another queued Guard
cancelled cleanly. Selected Iona moved alone while an enemy approached, and
opening Mako froze combat in Wait mode.

After a guardian, story and Return to Cinderfall, the receipt remained visible.
Freed Conduit showed Power 40→42 and Magic 36→37; Equip Sable succeeded while
the original +60 XP, +250 credits and material receipt stayed unchanged.
Final fresh empty-Armory verification showed “Choose an artifact”, 0/60 cells
and disabled item actions, then closed and resumed the field without a new
application error. The earlier null-selection error was observed before the fix.

Proof: [encounter brief](browser/aa-encounter-brief-5.24.jpg) and
[guardian reward](browser/aa-guardian-reward-5.24.jpg).
These are representative browser checks, not physical-device performance or
an independent 20–30 minute new-player study.

## Frozen delivery

- Final `dist`: **2,123 files; 262,082,973 bytes** (249.94 MiB).
- Expanded hosting bound: 268,435,456 bytes; **6,352,483 bytes headroom**.
- Deterministic path/file SHA-256 aggregate: `ee213ed6acd8d9c6000f4cb19d0fc384c7ed8d7e010f9a71d34508903a85132f`.
- [Per-file delivery hashes](../../development/reconciliation/frozen-delivery-5.24.json).
- Source baseline: `ad071bc412abdae6eefd8edd835cd533c29fe02e` (5.23.0).

This seal records the final frozen bytes, including the separately verified UI
fix, before the Sites helper commits and packages them. The helper's saved
version supplies publication provenance. Project:
`appgprj_6adf63724e5c8191bd55637b8ecd8d9a`.
Destination: https://ash-aether-clay-water.towre676.chatgpt.site/
