# A&A v8 — Release gates and production truth

**No production deployment receipt exists.** `v8` is a runnable, tested development build, not a verified patch to the active ChatGPT Site. The Site Library metadata's source version 22 is a metadata observation, not the editable source or a production commit hash.

## Actual merge recipe

1. Open the real game source editor or use ChatGPT **Work mode** with the cloud browser and authenticated editor, or supply an editable checkout of the current A&A Site project. Capture original source commit/version and backup current content and live saves first. Never use the public site text projection as an editable-code substitute.
2. Identify the canonical live actor registry, click selection/targeting, pathfinder, creature movement ticks, combat resolver, original loot transaction, UI event handlers, timeline and save validator. Compare their actual IDs and coordinate units with this package; do not import `AtlasWorld` over the real game logic.
3. Staging, only after an actual source checkout is present:

   ```sh
   python production/PRODUCTION_V8_STAGER.py /PATH/TO/REAL/SITE/SOURCE
   # Review the JSON plan, verify zero collisions and source hash.
   python production/PRODUCTION_V8_STAGER.py /PATH/TO/REAL/SITE/SOURCE --apply --expect-fingerprint FINGERPRINT_FROM_PLAN
   ```

   This stages `src/addons/aa-resident-bridge-v8.mjs`, and **nothing is wired or published**. Existing source files remain unchanged. It refuses stale fingerprint and conflicting paths.
4. Wire the bridge to actual host callbacks. Approaching uses real guided movement, studying uses accepted field-guide events and engaging uses the real game's one authoritative combat/loot transaction, with globally unique event IDs. Clicked 3D actors must expose canonical actor IDs; no menu-only remote encounters. Do not transfer the standalone `index.html`, `src/view.mjs`, `src/adventure.mjs`, or a second game world.
5. Adapt and inspect the latest Ground Forge, Living Grass v5, Acoustic World v4 and Armory v2 source **one at a time**. Do not add two coincident terrain layers, duplicate weapon inventories, stacked music loops, fake NPCs, or duplicate reward grants. Preserve authored interior geometry and physical door thresholds.
6. Run production campaign and guided-mode tests, direct creature encounters, boss telegraphs and retries, 5.x save migration, NG+, mobile UI, controller/click handling, audio muted captions, 60/30 FPS budgets, collision, render draw calls, and Edge/Android screenshots.
7. Publish only to the same existing project once the real host suite passes. Capture deployment ID, source SHA, old/new save replay and a live authenticated smoke test of opening A&A, selecting a monster, approaching, engaging, winning, quitting, reloading, and verifying population/loot persist.

## Required evidence before claiming "in the live game"

- Authenticated source version/commit; adapter and host import paths visible in the production code.
- A production test run and final published deployment receipt, not just standalone Node tests or mock installer output.
- Live playthrough at the published URL: monster selectable by clicking its model, guided path approaches it, out-of-range engage is denied, real combat awards exactly once, actor disappears after victory, and status persists after a save/reload.
- Rollback snapshot retained; no regression in character select, multi-main story, indoor shadows/doors, main quest guidance, bosses, and New Game Plus.

## Blockers observed here

- Linked GitHub account does not expose a repository for this game.
- Current browser context profile has a saved `google.com` login but not an authenticated A&A Site/editor session; site requests have returned HTTP 401 or inaccessible.
- The available tools do not include a writable first-party Sites project source/deployment action in this chat.
- Chromium attempted to open a local QA page but failed to complete screenshot capture; no WebGL/mobile acceptance measurement can be claimed.
