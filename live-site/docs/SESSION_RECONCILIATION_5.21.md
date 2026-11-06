# Ash & Aether 5.21 — recovered content in the campaign

## Source and scope

This additive release starts from the existing private Site's version 22,
commit `68e6673a8bc7d72ea44e3ae2edef436054e550cf` (game 5.18.1). It preserves
the existing Site project, URL, audience, 24-chapter story, seven origins,
campaign encounters, original score, cinematic collections and environment
art. It does not replace the published tree with an older laboratory package.

Five saved production packages were recovered. Their original filenames,
sizes and SHA-256 hashes are recorded in
`development/reconciliation/recovered-packages-5.21.json`.

| Recovered work | Campaign integration | Persistent ownership |
| --- | --- | --- |
| Living Armory v3 Complete | 193 item templates, 13 slots, six rarities, 12 unique powers, five sets, 12 runes, inventory/vault/overflow, equip/compare, forging, tempering, sockets, engraving, loadouts and material harmonics | Shared campaign inventory, per-hero equipment, actual credits and earned materials under `state.livingArmory` |
| Living Atlas v8 Spatial Encounters | Original numerical field kernel initialized from actual campaign terrain; biomass, moisture, fire, stone, aether, resonance, memory and shielding; complex Hydrophone phase interference; resident proximity and line-of-sight validation; local population pressure | Bounded per-scene fields/ecology under `state.livingAtlasV1`; campaign actors, battles and rewards remain canonical |
| Living Grass v6 Three Integration | Recovered Canvas bridge with 16 plant families and 15 habitats; real floor, road, doorway, building and canopy masks; footsteps, fire and water affect the saved vegetation used by cover/detection | Sparse vegetation state within the Atlas scene entry; rendering quality does not change gameplay samples |
| Ground Production Merge Physical QA, 2026-10-29 | 48 material definitions and production physics adapter; actual scene materials, saved wetness, heat, charge, phase, fracture and traffic; rendered consequences, bounded speed and damage effects | `state.environment.groundV1`; one dense active-scene grid, sparse saved maps; exact World.move displacement preserved |
| Acoustic World v4 | All 512 original Ogg files, including v4 cues and 24 optional adaptive stems; actual footsteps, devices, NPC work, guardian intent, openings, casts, guarding, outcomes and timeline events | Campaign events drive audio; gesture unlock, volume/mute, captions, pause/hidden gating and dialog ducking; original score remains the lead |

The current scene mapping selects 41 of the 48 ground materials across 167
scenes and 80,886 walkable cells. All 48 definitions and atlas regions ship;
this does not claim every definition is already placed in the story.

## Bellrun and Mossback

Historical 5.18.1 notes reference unfinished 5.19 commits `62dab8c` and
`bec7fa8`. Those commits and their original working checkout were not present
in the retrieved source history or saved artifacts. A historical screenshot
established intent but could not supply executable code. This release rebuilds
the activities against the actual current campaign rather than claiming to
merge unavailable commits.

Outdoor scenes receive an accessible stable service. The Pause menu also
opens the stable. Players can befriend Mossback through a Bellrun finish or
20 credits of care, then ride with a bounded 1.45 speed multiplier. Walls and
locked routes retain their existing collision behavior. Encounters and
interiors dismount safely.

Bellrun constructs a four-gate circuit on reachable authored floor cells,
avoiding placed interactions and doors. Gates must be crossed in order. The
gold target follows actual shortest-path length. Timers pause with menus,
dialogue and encounters; leaving the scene cancels the current run. Best times,
medals, mount bond and in-progress gates save with the journey. First-clear
credits are awarded once per scene/cycle circuit; replaying improves records.

The guide's exploration pause now retains a player-selected destination.
After arrival, resuming can return to the story route. This corrects the
earlier unconditional destination-clearing behavior.

## Shared game behavior

The normal journey receives no demonstration gear, currency, material supply
or free mount. Hostile victories and real caches feed the Armory using durable
claim keys; sparring, losses and peaceful withdrawals do not mint creature
equipment. Forging spends actual campaign credits. Equipped bonuses normalize
to the existing stat scale and do not stack on repeated restores or heal
injured heroes. Unique effects and engraving stats execute through bounded
host combat hooks. Rooted boots affect real ground grip and patrol detection.

Accepted combat events change Ground and Atlas; their damage modifiers compose
inside the existing Battle damage path, with secondary/DOT exclusions. Neither
adapter owns a second HP, loot or combat transaction. Atlas resident checks use
the actual moving host actors. The laboratory's demonstration river, bridge,
quest board, free resources and separate encounters are not imported into the
story world.

The Hydrophone costs 2 MP per successful field phrase. Phase zero raises a
local resonance field; the counterphase changes it through complex
interference. Nearby-life listening locates an actual placed object and emits
a spatial cue/caption. Vegetation cover and local ecology feed the existing
encounter and patrol calculations. Numerical shielding is capped at 8%.

Old saves acquire optional extensions without changing existing progress.
Malformed new extension data is rejected before replacing the live state.
Origin-to-present transitions retain the same journey's equipment, companion
record, ground and Atlas history. Actual new tellings reset physical rewards
and world state according to the existing legacy rules; Armory discovery and
earned sigil memory can carry forward.

## Where to play

- **Gear** or **Pause → Living Armory · gear & forge**: inspect and equip items,
  compare gear, forge, temper, engrave, socket runes and manage loadouts.
- **Pause → Mossback & Bellrun** or an outdoor stable: care, ride and race.
- **Pause → Listen to nearby life**: locate a real nearby sound source.
- **Pause → Sound the Hydrophone / Answer in counterphase**: spend 2 MP to
  alter local resonance; the field readout reports the result.
- **Pause settings → Acoustic World**: control cue volume, captions and the
  optional adaptive music textures.
- **Developer portal → Try the combined content**: an explicitly isolated
  temporary crew, ten gear items, finite forge supplies and bonded Mossback.
  This uses the same campaign adapters; it cannot save into ordinary journeys.

## Delivery and practical limits

The campaign remains its existing Canvas renderer. The actual recovered v6
Canvas vegetation path is integrated; this release is not a conversion of the
entire game to Three.js. Standard and Compatibility use the same saved
simulation, with different vegetation detail budgets.

Four older v16 PNG deliveries were converted to lossless WebP. Every decoded
RGBA pixel and dimension matches; original PNGs are retained under
`development/art/source-v16`. Three unused, unclean motion sources were moved
out of the published bundle into `development/publication-originals`; cleaned
delivery animation remains. The receipt and verification script are in
`development/art/delivery-v16-lossless-5.21.json` and
`development/art/verify-v16-delivery.py`. This creates room for the recovered
audio without discarding playable content or reducing artwork fidelity.

Missing Runway master audio bytes were registry entries in the recovered
package, not available files, and are not claimed as shipped. New cinematic
assets, new story chapters, and a continuous controller-earned replay of all
24 chapters are outside this integration's verification claim. Physical phone
and Edge/GPU behavior are not certified by desktop browser/model checks.

Exact automated totals, browser observations, delivery size and publication
provenance are recorded in `docs/verification/release-5.21.md` and the adjacent
machine-readable verification receipts.
