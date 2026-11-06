#!/usr/bin/env python3
"""Seal the final 5.24 delivery, distinguishing the full gate from its UI follow-up."""
from pathlib import Path
import hashlib
import json
import re

gate_path = Path('docs/verification/release-5.24-verified-tests.json')
follow_path = Path('docs/verification/release-5.24-armory-final-tests.log')
report = json.loads(gate_path.read_text())
assert report['passed'] and not report['revision_changed']
assert not report['failures'] and not report['missing_count_summaries']
assert not report['inconsistent_count_summaries']
assert all(report['totals'][key] == 0 for key in ['fail', 'skipped', 'cancelled', 'todo'])
follow = follow_path.read_text()
counts = {key: int(re.findall(r'^\s*ℹ\ufe0f?\s+' + key + r'\s+(\d+)\s*$', follow, re.M)[-1])
          for key in ['tests', 'pass', 'fail', 'skipped', 'cancelled', 'todo']}
assert counts['tests'] == counts['pass'] == 18
assert all(counts[key] == 0 for key in ['fail', 'skipped', 'cancelled', 'todo'])

digest = hashlib.sha256()
entries = []
for file in sorted(p for p in Path('dist').rglob('*') if p.is_file()):
    data = file.read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    entries.append({'path': str(file), 'bytes': len(data), 'sha256': sha})
    digest.update((str(file) + '\0' + sha + '\n').encode())
size = sum(row['bytes'] for row in entries)
limit = 268435456
assert size < limit, 'Expanded static assets exceed the hosting limit'
fingerprint = {
    'schema': 'aa-delivery-fingerprint/1', 'game_version': '5.24.0',
    'date': '2026-10-29', 'files': len(entries), 'expanded_bytes': size,
    'limit_bytes': limit, 'headroom_bytes': limit - size,
    'tree_sha256': digest.hexdigest(),
    'verification': {
        'full_gate': str(gate_path), 'modules': report['files'],
        'full_gate_cases': report['totals']['tests'],
        'post_gate_change': 'Empty Armory selection null handling and normalized browser frame/import cache keys.',
        'post_gate_receipt': str(follow_path), 'post_gate_cases': counts['tests'],
        'post_gate_case_overlap': 17, 'post_gate_new_cases': 1,
        'final_tree_is_full_gate_tree': False,
    },
    'entries': entries,
}
Path('development/reconciliation/frozen-delivery-5.24.json').write_text(json.dumps(fingerprint, indent=2) + '\n')

text = f'''# Release verification — A&A 5.24.0

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

The authoritative run passed **{report['totals']['tests']:,}/{report['totals']['tests']:,}
cases across {report['files']} modules** in {report['elapsed_seconds']:.3f} seconds,
with zero failures, skips, cancellations, pending cases, missing summaries or
inconsistent counts. The revision remained unchanged. This is the zero-issue
automated gate; no separate world-validator result is claimed.

- [Authoritative JSON](release-5.24-verified-tests.json) and
  [complete log](release-5.24-verified-tests.log); finished {report['finished_at_utc']}.
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

- Final `dist`: **{len(entries):,} files; {size:,} bytes** ({size / 1048576:.2f} MiB).
- Expanded hosting bound: {limit:,} bytes; **{limit - size:,} bytes headroom**.
- Deterministic path/file SHA-256 aggregate: `{digest.hexdigest()}`.
- [Per-file delivery hashes](../../development/reconciliation/frozen-delivery-5.24.json).
- Source baseline: `{report['revision']}` (5.23.0).

This seal records the final frozen bytes, including the separately verified UI
fix, before the Sites helper commits and packages them. The helper's saved
version supplies publication provenance. Project:
`appgprj_6adf63724e5c8191bd55637b8ecd8d9a`.
Destination: https://ash-aether-clay-water.towre676.chatgpt.site/
'''
Path('docs/verification/release-5.24.md').write_text(text)
print(json.dumps({k: v for k, v in fingerprint.items() if k != 'entries'}))
