# Current-Site character repair — Sable, Rook, and all seven crew members

Target: https://ash-aether-clay-water.towre676.chatgpt.site/

**Release state: fail-closed staging overlay only; NOT deployed.** The GitHub repository preserves historical code. Its archived modules must never replace the much newer published Site.

## Diagnosed from served public source (November 20, 2026)

- Sable: The newer equipped field pipeline changed the original sprite contours and anatomical proportions to a reconstructed articulated body; its head is small relative to the torso. The running animation advances very quickly at real travel speed and has extra side wobble and vertical bob.
- Rook: The legacy market purchase flag ('hero.equipment === true') provided a cannon grip and focus ring but no actual visible jacket replacement, shoulders, legs or boots. Armory gear in real slots took priority when present, but the legacy purchase visual path did not supply the missing garments.
- Character showcase: Selecting another hero could preserve the previous hero's equipment profile. The mesh renderer silently discarded mismatched slots, allowing Rook to look unequipped despite a prior character's visible gear.
- Character screen: Its portrait defaults to the same physical reprojected body; both combat/field and preview paths must agree.

## Repair

The patcher at tools/character-repair/apply-current-site.mjs reads six EXACT publicly served modules and stages separate modified copies. It validates each unique source anchor and aborts if the public code changes or a patch is already applied. It computes source/output SHA-256 hashes and does not change the published game, save files, inventory or combat logic.

1. For native crew, run and starter frames, use the original silhouette with its fitted raster equipment; retain the 3D physical renderer for turning and fallback.
2. In character portraits, prefer original sprite identity with correctly fitted equipped gear.
3. Add display-only torso, shoulders, legwear, and boots to all seven existing legacy crew equipment receipts (including Rook) without inventing inventory or altering stats. Genuine armory equipment still takes first priority for every slot.
4. Fix showcase selection by resolving the new hero's outfit rather than retaining the previous hero's equipment. The caller may provide equipmentForHero(id) or select(id, nextEquipment).
5. Correct small heads/helmets in articulated previews (Sable scale 1.14, Rook 1.08).
6. Smooth the run cadence and reduce sway/bob without changing 5.3 walk / 8.4 sprint speed or collisions.

## Verification

The GitHub workflow .github/workflows/character-appearance-repair.yml downloads current production modules read-only, verifies JS syntax, applies the overlay, executes Node regression tests, and publishes an opt-in ZIP artifact.

To reproduce with the genuine current-Site snapshot (NOT the historical repository source):

    node tools/character-repair/apply-current-site.mjs current-site-module-snapshot build/character-repair-overlay
    ASH_CURRENT_SOURCE_DIR=current-site-module-snapshot node --test tools/character-repair/repair.test.mjs
    for file in build/character-repair-overlay/*.js; do node --check "$file" || exit 1; done

The tests cover original/changed hash integrity, fail-closed anchors, all seven heroes' legacy outfits including Rook's chest/boots, real gear priority, blocked-wall gait, reduced-motion behavior, consistent run phase and front/back headings.

## Requirements before production deployment

An authenticated Site author must load the overlay in a current-Site staging version and visually compare all seven heroes' idle, run, walk, turn, attack, front/back, weapon grip, and equip/unequip states, including an existing saved game on mobile and desktop. They must check equipment continuity, FPS, clipping, weapons, proportions, combat/stats, and save restoration. ONLY then apply the six modified modules to the authoritative Site, without clobbering any other current files. **A successful GitHub PR or workflow run is not live Site deployment.**
