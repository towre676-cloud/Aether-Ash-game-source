# Classic game source study and original implementation

This study examines public reconstructions of Donkey Kong Country (SNES) and
Legend of Mana (PlayStation). It does not use a downloaded commercial ROM,
original game assets, or leaked development material. The production changes
are original JavaScript for Ash & Aether's existing Canvas renderer.

## Sources and scope

| Reference | Source and provenance | What we used |
| --- | --- | --- |
| Legend of Mana | [celophi/lom-decomp](https://github.com/celophi/lom-decomp), a matching reconstruction of the PlayStation game; inspected commit `4334ae92a728700ac239de525d7e5f663981da01` | Camera-follow windows, separate scripted camera control, and explicit animation transitions as engineering references. |
| Donkey Kong Country | [Yoshifanatic1/Donkey-Kong-Country-1-Disassembly](https://github.com/Yoshifanatic1/Donkey-Kong-Country-1-Disassembly), an annotated SNES disassembly; inspected commit `c2080f40469c716923f550706509a0d354229841` | Persistent animation state and preserving elapsed timing across pose entries. |
| DKC reconstruction context | [DKC-Recomp/DKC-disassembly](https://github.com/DKC-Recomp/DKC-disassembly) describes its retail-game reconstruction and excludes proprietary assets. | Corroborating project scope; no production source imported. |

Legend of Mana is a PlayStation reference. Secret of Mana is the SNES entry.
A ROM contains the executable and game data; a disassembly or decompilation
reconstructs readable code from it. These repositories are reconstructions,
not official releases of the original developers' entire working projects.

The DKC repositories display GPL-3.0 licenses. Legend of Mana's repository has
an MIT license with a [third-party notice](https://github.com/celophi/lom-decomp/blob/4334ae92a728700ac239de525d7e5f663981da01/THIRD_PARTY_NOTICES.md)
that limits its scope to material the contributors can license and excludes
original game assets and separately licensed components. No code or assets
from either reconstruction were copied into this release.

## Applied: a stable exploration camera window

The Mana reconstruction's
[`field_actor_camera.c`](https://github.com/celophi/lom-decomp/blob/4334ae92a728700ac239de525d7e5f663981da01/src/overlays/field/actors/field_actor_camera.c)
separates a follow point from the displayed view. `field_camera_update` starts
scrolling only outside a dead zone. Map limits and scripted scrolling are
handled explicitly. That observation suggests a stable viewing area for small
player movements; it does not establish a Mana-style dynamic zoom system.

Our implementation is `dist/game/engine2/camera-window.js`. It computes a small
window in CSS screen pixels, converts it using the current composition zoom,
and changes the target only when the composition leaves that window. The
existing `cameraFollow` remains responsible for interpolation, and the existing
scenery/landmark code remains responsible for zoom and composition.

The renderer enables the window only during outdoor field exploration.
Interior, dialogue and battle framing retain their existing targets. In
particular, battle warnings and actor bodies continue to be framed against the
measured command-panel area. No movement speed, collision rule, camera boundary,
combat state or save schema changes.

The Movement studio now offers **Stable window** and **Centered follow** for
direct comparison using the actual production renderer and original sprites.

## Applied: foot contacts at the crossed animation interval

The DKC reconstruction's
[`Routine_Macros_DKC1.asm`](https://github.com/Yoshifanatic1/Donkey-Kong-Country-1-Disassembly/blob/c2080f40469c716923f550706509a0d354229841/DKC1/Routine_Macros_DKC1.asm)
preserves a matching animation in `CODE_BE805C` and carries animation-timer
remainder through pose entries in `CODE_BE80E1`. Its run/walk rate calculation
also depends on movement speed. Our previous release already kept gait phase
across waypoints and advanced it from resolved displacement.

The remaining defect was in ground effects: the old code inspected only the
final pose of an update. A long update could cross a foot plant and finish past
it, so the mark was omitted; other marks appeared at the update's end position.

Our update exposes the unwrapped phase advance and examines every crossed
planted phase. Each contact is interpolated along the resolved movement segment.
Grass, dust, water and snow retain their existing effects and lifetimes. Stopping,
teleports and interiors remain excluded. The event buffer remains bounded.
This is a visual contact correction, not a change to physical collision or a
new footstep sound system.

## Useful evidence, not yet a new feature

DKC's `DATA_BEA8AA` contains an authored turn sequence with a facing event at
`CODE_BEA8CF`. Our present four-pose locomotion sheets do not contain equivalent
turn artwork. This release does not imitate that sequence by stretching bodies,
delaying input, or claiming additional drawn directions.

Mana's `field_actor_motion.c` and `field_actor_idle_ops.c` preserve facing through
action/idle transitions. Its `menu_lists.c` keeps selection inside a bounded
list viewport. These are useful further references; they are not newly ported
combat or menu systems in this release.

## Verification boundary

Focused tests exercise frame interval crossings, world-space contact spacing,
stops, wraps and teleports, plus camera-window opt-out and viewport handling.
The release verification record reports the actual automated and browser checks.
Source reading and model checks do not establish subjective game feel, original
console fidelity, or performance on the user's physical devices.
