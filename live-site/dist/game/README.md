# Ash & Aether: Clay and Water


## 5.27 — Pinch and keep

Two fingers on the game world now control the actual camera zoom: spread to
zoom in, pinch inward to zoom out. The chosen 50–300% scale stays exact through
movement, rooms, dialogue and battles, and is remembered on this device.
Pinching does not become a move, interaction or attack; the existing route is
preserved while the gesture temporarily suspends travel. Touch controls and
HUD buttons keep their own multi-touch ownership. Display & motion includes
an accessible World zoom slider and an explicit Use automatic zoom reset.

Manual battle framing follows the selected living crew member. The camera
uses the gesture midpoint while zooming, and world taps keep using the same
inverse transform. A single touch still moves/interacts on release; mouse and
pen behavior is retained. See docs/verification/release-5.27.md for checks.

The current `/game/` entry is the enhanced Canvas RPG. It contains seven playable historical beginnings, a connected 24-chapter campaign, regional commissions, unified crew setup, environmental combat, objective-based encounters, instruments, and browser-local traveller saves.

## Release 5.26 — Room to play

Field names now share a small visible budget: nearby threats and the current
interaction take priority, with space kept around actors and the invitation
card. Story contacts retain small markers when their names are quiet. The
encounter invitation keeps its first complete threat sentence and direct
Explore, Approach and Continue actions; full advice, rewards and preparation
remain available in an inline disclosure.

Walking and running briefly settle at each foot plant while retaining their
existing frames, cadence and immediate controls. A small set of early ordinary
patrols now has explicit local formations, giving guards, callers, menders and
strikers different combinations using their existing abilities. Their field
appearance, revealed advice and fresh battle roster use the same selection.

The landscape readout speaks when cover, resonance or wildlife pressure matters.
Exact values remain available under Pause → Local landscape. The recovered
Grass and Vista integrations remain in the campaign. Implementation details
and release status are in `engine2/README.md` and
`docs/verification/release-5.26.md`.

## Release 5.25 — readable world and responsive encounters

The recovered Vista presentation package is now adapted to the actual game:
scene-aware depth, crew separation, confirmed combat-result cues and bounded
movement look-ahead. Fresh ordinary patrols show their existing roles before
competing for environmental tools. Full source provenance and verification are
recorded with the release; the standalone Three.js study remains a development
reference, while Canvas2D continues to render the real journey.

## Release 5.24 — choices, actions and usable rewards

Encounters and repairs now explain their immediate purpose. A single visible
combat order can be chosen while charging, approaches on actual walkable floor,
and cancels with manual control. Attack and damaging Mako respect reach; enemies
move between locked warnings. Actual earned equipment appears in the victory
receipt with named comparisons and direct equipping. Prior saves and the recent
music/environment corrections remain supported. The detailed behavior is in
`engine2/README.md`; verification is in `docs/verification/release-5.24.md`.

## Release 5.14 — smoother travel and consistent characters

Walking and running use coherent directional animation with distance-based strides, stable foot registration and consistent character size. Guided and tapped routes carry movement across tile boundaries; companions follow the travelled path through turns and reversals. Touch and analog controls resist boundary chatter while keeping immediate stops and reversals. Settled ambience no longer rewrites audio state every frame.

The other session's 5.13 visible encounters, exploration stops, route continuation, field rewards and direct technique bar are included. The new Movement studio is linked from Developer portal and isolates all seven characters, outfits, graphics modes and an eight-way tour from journey saves. The combined suite passed 853 tests; all 128 source-pose anchor measurements match their checked assets. See `docs/verification/release-5.14.md` for recordings, exact validation and remaining artwork/device limits.

## Release 5.12 — closer views and quicker commands

Closer exploration, interiors, landmarks and named conversations use the available viewport. Battle framing includes living actors, protected objectives and announced warnings. Wide laptops and short landscape screens use a side console; portrait touch uses two action cards per page. Icon commands, targets and costs remain visible, direct category changes avoid repeated Back actions, and crew changes refresh the current picker. Goal rules and history remain available under optional notes.

Painted materials, eight regional palettes, raised banks, shore depth and consistent natural boulders improve both graphics modes. The new original terrain atlas and exact prompt are retained under `engine2/art/` and `development/art/`. The complete suite passed 762 tests, with final targeted checks for the last refinements. See `docs/verification/release-5.12.md` for screenshots, provenance and device limits.

## Release 5.11 — guardians, developer practice and persistent guidance

Open Developer portal from the title or Pause menu, or visit `/game/?dev=1`. Select any of 24 chapters, choose an exploration or guardian checkpoint, and pick a three-person crew. Practice prepares bounded levels, legal learned techniques, finite supplies, earlier story choices and previously earned equipment. It runs in a separate tab, disables journey/profile saves and imports, and skips earlier cinematic unlocks by default. The in-game Dev portal button changes or restarts the test; reloading returns to the selector.

All 24 guardians now have canonical profiles with three phases and 72 named movements, varied target preferences, locked warning geometry and punishable recovery windows. New parallel lanes, fans and paired circles share the actual hit geometry with their drawings. Phase, current movement and affordable counterplay appear in the existing combat dock. Boss HP is unchanged.

The task guide remains selected through new objectives, room changes, conversations, menus and fights. It finds a visible approach, starts the selected encounter, and resumes navigation afterwards. Choices and combat actions remain yours. Blocked routes wait and retry after relevant changes instead of handing control back; battle dodging and target taps no longer switch guidance off. Field movement, a new manually tapped route, or tapping the task button again still gives explicit player control.

Verification includes both complete guided campaign branches, all seven historical beginnings, all 240 commissions, 336 developer fixtures and all 24 prepared-team guardian victories. See `docs/verification/release-5.11.md` for exact simulation scope and device limits. The other session's visual release at eb3402c is included.

## Release 5.9 — voices and living places

Twenty-three exact opening dialogue turns now use the established recorded cast, bringing packaged coverage to 422 lines. Four optional ambient beds give mapped settlements, workrooms, waterways and gardens their own quiet sound, with an independent volume control in Pause → Sound, display & controls. Ambience fades between places, ducks during dialogue, and stops during battles, menus, films or hidden tabs. Unmatched locations remain quiet.

Two existing earned memories—the Wayglass and the Vale delivery—now use short Runway animations of their canonical illustrations behind the existing captions. They load on demand, retain the original orchestral cues, and fall back to still artwork for compatibility graphics, reduced motion, or playback failure. Both can also be watched from Watch films. No gameplay or save schema changed. Generation provenance is in `development/media-5.9-provenance.json`; `engine2/qa/media.html` isolates media playback from journey saves.

The supported current address is `https://ash-aether-clay-water.towre676.chatgpt.site/`. The older Chrono · Clay & Water site is a separate publication; changes to this project do not update it. Saves remain local to their original address. Use Pause → Export save on the old address, then Pause → Import save here for the enhanced format. The classic SNES edition has its own incompatible save format.

## Release 5.6 — playable beginnings and dependable decisions

- Every traveller’s first named person is within five seconds of guided walking; goals point to the right room after backtracking.
- Wait battle mode pauses the battle clock while selecting techniques, supplies and tactics. Active mode remains available in Battle options. Auto attacks respect the selected enemy.
- Combat advice follows the selected enemy’s shielding, elemental state and charged attack. Invalid technique targets spend no resources, and draining effects recover only actual damage.
- Phone controls account for compact landscape and safe-area insets, and cancelled touches release immediately. Rotation releases held controls.
- Imported saves are rehearsed on isolated state before replacing progress. Loading clears old routes and panels. Runtime errors expose recovery controls without overwriting the saved journey.
- Required art reports named loading progress, retries once, and fails with a useful recovery message.

Read `engine2/README.md` for the enhanced engine’s content and provenance. `NATIVE_EDITION.md` documents the previous SNES adaptation linked at `classic.html`.

## Validation and limits

Run `node --test dist/game/engine2/tests/*.test.mjs` from the repository root. The campaign traversals are `node dist/game/engine2/qa/campaign-play.mjs 0` and `1`; these use engine-level movement and commands, not a controller-earned browser campaign. `engine2/qa/responsive.html` runs the real game inside fixed phone-size viewports for manual layout review.

Real Android hardware, sustained phone GPU performance, hardware gamepads and subjective first-hour appeal require real-device/player testing. Automated simulations and desktop viewport checks do not establish those results. The character showcase uses a front/back relief mesh, and the cinematics remain the existing authored animation/animatic system.
