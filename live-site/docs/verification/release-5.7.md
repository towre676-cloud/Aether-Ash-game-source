# Ash & Aether 5.7 — decisions and navigation

October 28, 2026. Continues the existing enhanced Site with the same save schema and owner-only audience.

## Changes

- Pause keeps six primary actions: Return, unified Crew setup, Characters, Supply bag, Story journal and Save. All other controls keep their existing callbacks and appear in native expandable groups; controller navigation includes summaries and links. Core-less heroes can still inspect growth through unified setup. Crew setup explains its between-battle restriction.
- Persistent local-save status distinguishes dirty state, stored checkpoints, successful writes and unavailable storage. It reports traveller-slot failure separately. Dirty marks during movement are idempotent. No new storage keys.
- Preservation writes the current primary save before creating another telling, prunes retained archives before allocating the next archive and treats the redundant previous slot as best-effort. Failures stop switching and explain how to export a backup.
- Technique picker quotes the actual payment rule on a copy: MP, HP overdraw, net strain and Link partner requirements. Unavailable choices explain recovery and are skipped by controller selection. All 120 recipe previews were compared with actual command payments without altering the live snapshot.
- Combat coaching names earned, equipped and affordable techniques or finite supplies, and gives a feasible alternative when elemental sequences are unavailable. Material-shell advice follows actual hit rules. Repeated charge cycles no longer repeat polite announcements. Pickers explicitly distinguish charging/live, paused and Active timing.
- Guides replan moving destinations at bounded intervals; unrelated dialogs, menus, cinematics, travel and changed quests cancel obsolete routes. Guide-owned passage conversations continue. Portal loops and temporary barriers stop safely. The objective button also stops a currently followed trail.

## Evidence

`release-5.7-tests.log`: full engine suite, 599 passed / 0 failed. Includes 120 resource-preview comparisons, 8 save-feedback tests, 4 pause DOM behavior tests, actual earned-kit advice/shell checks, bounded guide replanning, owned-passage continuation and safe interruption regressions.

Browser preview at 390×780: restored an existing 5.6 encounter, opened Pause, verified six primary actions and preserved grouped Load/Export/Import, manually saved and saw “Saved just now”, opened the live technique picker and saw Fault Lance / 6 MP / +3 strain / One target with Wait paused. Saved screenshot is `release-5.7-pause.jpg`.

Limits: viewport checks are desktop-browser checks, not physical Android/controller evidence. No claim of a newly completed full-hour browser run, new cinematic production system, or long-run economy balance. The preceding 5.6 campaign traversal and first-encounter simulations remain recorded separately; this refinement did not change campaign rewards or enemy statistics.
