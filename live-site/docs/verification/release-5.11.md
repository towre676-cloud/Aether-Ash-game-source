# Release 5.11 — guardians, developer practice and persistent guidance

## Integration

Built on media release 9e8d49d and merged the other session's complete visual/content release eb3402c before final checks. Main's art loader, field rumors, current source art and authored room layouts are retained. Guided routing and developer fixtures were rerun after that merge.

## Developer portal

`/game/?dev=1` runs an isolated practice instance. The title and Pause menu link opens a separate tab. Users can select all 24 chapters, arrival or boss stage, any three unique crew members and either prior-choice template. The factory derives prerequisites through authored producers and prior normal reward paths, prepares bounded levels, legal sockets/AP, earlier guardian gear and finite supplies, and yields the existing validated enhanced-save schema.

The practice runtime blocks normal save/archive/profile/import/export paths, uses a distinct STORE identifier, redirects traveller changes to the developer selector and disables ordinary dirty-save feedback. Prior cutscene unlocks are skipped without changing the normal game's cinematic preference. The factory has no storage calls; its storage-spy and immutability test pass. Browser checks loaded an ordinary Sable origin journey after chapter12/18/24 developer launches; it remained an origin journey, not the prepared late-game crew. This UI observation is not a byte-for-byte browser-storage audit.

Factory tests cover all 336 chapter × stage × lead combinations,48 reachable guided checkpoints and 24 actual paid-command guardian victories. They validate finite MP/strain/Guard behavior, previous equipment, both prior-choice templates and invalid-input rejection. Fixtures are intended for testing, not a claim that this is the unique optimal or naturally earned team at each chapter.

## Guardians

24 canonical profiles, 72 named movements and 3 persistent phases. Geometry includes lanes, circles, rings, crosses, parallel lanes, fans and paired circles. Announced target positions stay frozen; old saved intents remain supported. Dodged attacks have longer actual recovery. Boss elemental intents enter the existing reaction, material and environment pipeline. HP is unchanged. Phase and current tell/counterplay/recovery use the existing dock; recommendations require an equipped affordable recipe or finite owned supply.

Focused boss/runtime/advice suite: 42 passed. Normal earned-crew campaign traversal:24 chapters, 66 fights, 84 rooms, 7 decisions. The 648 sampled authored-arena escape checks pass with at least 0.35 seconds measured margin at normal walking speed after Ash Herald's warning increased 2.4→2.7 seconds. This finite sample does not establish human reaction-time fairness at every position. Details: `release-5.11-bosses.json`.

## Guided tasks

Guidance stays selected while waiting for dialogue choices, fights, menus, cinematics, a changing objective or a blocked route. It replans through actual passages and transport menus, uses a collision-safe visible interaction approach, and avoids repeated closed-gate interactions. It starts the selected encounter but never chooses dialogue answers or commands the player's combat. Explicit field movement/tap navigation or toggling the task still cancels. Battle movement and target taps preserve the selected guide.

Both campaign templates (all-first and all-alternate story choices) passed all 24 chapters with ONE guide start each: 50 rooms,176 interactions, 13,205 walking ticks and 32 battle-engine victories per run. These runs use actual game resolver/controller/movement and scripted legal Battle actions; they are not device playthroughs and do not cover all 128 mixed decision combinations.

All7 origins passed 56 combinations (2 repairs × fight/diversion ×2 destinies per lead), with 28 actual Battle-engine victories. A separate 14-run origin/frontier scenario harness also passed. All240 commissions passed guided survey, repair, encounter and report walking; those cases use a late-chapter unlock fixture and explicitly scripted encounter outcomes. Postgame return to Mara, Commons transport routing, moved witnesses, Wayglass routes and vendor transport targets have targeted tests. Details: `release-5.11-guidance.json`.

## Checks and browser observations

Full engine suite:734 passed, 0 failed (`release-5.11-tests.log`). Subsequent main-only UI safety fixes passed syntax checks and browser inspection; the final Ash Herald timing adjustment passed 42 targeted tests.

Cloud Chrome verified the developer selector, unique-party selections, chapter24 level27 crew, chapter18 level21 crew, automatic guardian engagement, chapter12 exploration with guide selected, the reopened in-game portal, and guide selection retained after a combat arrow press and canvas target tap. Practice's ambient display uses the earlier compatibility setting; no real Edge/Android/gamepad certification is claimed. Ordinary mode still exposes Developer portal and its existing Sable/Riven journey slots. Portal screenshot: `release-5.11-dev-portal.jpg`.

The previous 5.9 audio/video assets and 5.10 visual content remain included. No new generated media or Runway credits were used in this pass.
