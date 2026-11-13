# Whole-game visual and playability release gate

**Scope:** all 24 chapters, world exploration, towns, field combat, expeditions, the 3D Cistern, menus, progression, and save/continue. A successful module test is not a visual acceptance test.

## Non-negotiable checks

| Surface | Visual acceptance | Functional acceptance |
|---|---|---|
| Character selection and continue | Recognizable animated characters; no opaque rectangles, invisible bodies, clipped portraits, or unreadable text | Begin and resume from a saved checkpoint without losing identity or progress |
| Towns and interiors | Distinct architecture, navigable paths, inhabited spaces, appropriate lighting and readable landmarks | Interact, enter/exit, save, continue |
| Every field biome | Dense, legible ground/props/vegetation; visual variation without blocking navigation | Roaming, collision, random encounters, travel |
| Normal combat | Visible moving actors and enemy tells; action bar fits small screens; damage and recovery are legible | Six commands, targeting, guard, cooldowns, win/retreat |
| Expeditions | Recognizable geography, varied enemies, meaningful routes and discoveries | Enter, fight, complete, exit, retain progress |
| Every dungeon room | Fully drawn geometry, identifiable doors and objectives, animated creatures, no blank/white placeholders | Traverse, interact, solve, return, resume |
| Inventory and rewards | Item icons, rarity, comparisons, no overwhelming paperwork | One claim per event, equip, persist, reload |
| Music and sound | Appropriate melodic exploration/combat layers, no abrupt silent transitions | Sound controls, safe autoplay handling, battle cues |
| Accessibility | Reduced motion and compatibility rendering preserve readability | Keyboard/touch controls, pause and recovery |

## Required evidence for each release

1. Run deterministic tests and a same-origin Chromium browser session. Cross-origin preview failures must be recorded separately.
2. Verify the *actual* character atlas upload, not just the Cistern material atlas. Any character sprite fallback is a failure for the visual release gate.
3. Capture screenshots in character selection, an inhabited town, a field biome, normal battle, expedition, Cistern, reward inspection, and saved-game continuation.
4. Play a real hostile victory through item award, equip, save, reload, and confirm item ownership is unchanged.
5. Test at desktop and mobile viewports; record scene, chapter, graphics mode, missing assets, exceptions, and user-visible errors.
6. Review chapter-by-chapter coverage (1–24), including room geometry, enemy variety, NPC interactions, cinematics, and objectives. Mark untested areas *untested*, not passed.
7. Do not claim a full Diablo-quality or production-ready release solely from CI, isolated modules, or a development-mode practice battle.

## Current verified scope (November 2026)

The action bar and attacks were observed in development-mode practice combat. The Cistern's material atlas uploaded in a same-origin Chromium test. Cross-origin preview runs repeatedly produced WebGL security failures and character placeholders. The expanded test now fails on character sprite fallbacks, but whole-game visual and end-to-end persistence acceptance remain open.

**Release policy:** Keep PR #9 in draft until the expanded browser test, complete hostile encounter, and visual review are verified. Deployment to the authenticated live Site requires a separate supported deployment action and verification.
