# Release 5.12 — closer views, quicker commands, painted terrain

Validated October 28, 2026 (America/New_York). Existing journey/save schemas and the owner-only Site audience are preserved.

## Result

Exploration, interiors, named conversations and nearby landmarks receive closer framing. Battle composition fits living actors, the protected objective and announced attack geometry. A wide laptop console reserves the right side of the screen instead of covering the lower half of the arena. Short landscape screens also use a compact side console. Portrait touch uses two action cards per page.

The command categories, crew and targets remain available while selecting an action. Eight original vector silhouettes support short text labels. Personal/Mako/Supply pickers update when the selected crew member changes; keyboard left/right changes action pages and up/down reveals the current control. Target cards keep the selected enemy's exact HP, phase and charged move. Tactics use visible categories. Goal actions precede optional instructions and history. Replay choices and the current page survive refreshes. Existing Wait pacing, finite costs, Cancel cleanup and guided tasks are preserved.

A new original 2×2 material atlas supplies mossy ground, ochre earth, cool stone and teal water. Eight regional palettes, raised banks, shore depth, quiet directional light and water reflections make the ground less flat. Indoor cutaways have a neutral shadow surround. Existing stone clusters in suitable natural habitats use painted boulders rather than flat vector stamps; no additional props or collision changes were introduced.

## Verification

- Complete engine suite: **762 tests passed, zero failed**, 157.9 seconds. See [full log](release-5.12-tests.log).
- Final targeted checks cover the last layout and scenery refinements; see [targeted log](release-5.12-targeted.log).
- Camera tests include 864 guardian warning/body/view combinations and 216 side-console combinations. These check geometric framing, not human reaction time or every possible combat position.
- DOM tests exercise repeated MutationObserver notifications, paging every action without spending an action, active categories, touch page size, layout thresholds, original Cancel callbacks and stable Replay choices.
- Goal UI tests execute a real finite-cost Replay after changing its pattern and angle, then verify refresh and Cancel behavior.
- Environment checks preserve the floor data across prepared worlds, bound scene bitmap dimensions, check source crop bounds and verify compatibility drawing without blur filters or canvas readbacks.
- Live cloud Chromium review used the actual game at 1280×720, 390×844 and 844×390. The late guardian's Personal/Supply/Tactics controls, direct category changes, Iona selection and keyboard paging were exercised. At 1280×720 the console measured 350px wide; at 844×390 it measured 330px wide. The landscape Supply picker had equal client and scroll heights (59px); portrait touch Supply had equal client and scroll heights (92px). The outer consoles had no excess scroll height. Goal behavior was covered by DOM/engine tests rather than a complete browser objective battle.
- Standard and compatibility scenery were visually inspected in the scene renderer, including Sable's approach, Iona's interiors and the mangrove field.

## Art and references

The new asset is [scenic-materials-v12.webp](../../dist/game/engine2/art/scenic-materials-v12.webp), 1254×1254, 683,902 bytes. Built-in image generation was used. The exact final prompt and encoding notes are in [scenic-materials-v12-brief.txt](../../development/art/scenic-materials-v12-brief.txt); the original source is retained alongside it. Runtime assets and source hashes are recorded in the art manifest. No Runway generation credits were used in this pass.

The comparison used primary developer/publisher material:

- [Sea of Stars combat design](https://blog.playstation.com/2022/07/07/a-closer-look-at-the-turn-based-combat-in-sea-of-stars/): compact skill kits, damage-type lock icons and low-friction party changes informed the stable command vocabulary and visible tactical context.
- [Chained Echoes](https://www.chainedechoes.com/): immediate execution of battle orders informed reducing navigation between a choice and its action.
- [Octopath Traveler II](https://www.playstation.com/en-us/games/octopath-traveler-ii/): its mixture of pixel characters and dimensional scenery informed separation through light, material and depth.
- [Expedition 33 developer gameplay breakdown](https://www.expedition33.com/post/your-first-look-at-gameplay-from-clair-obscur-expedition-33): visible action costs and environmental traces informed persistent costs and authored landmarks.
- [Last Moon](https://store.steampowered.com/app/1108600/Last_Moon/): its authored, interconnected environments remain a visual direction reference. No game artwork or UI assets were copied.

## Practical limits

Cloud Chromium and constrained browser views do not certify physical phones, controllers or this user's Microsoft Edge GPU. Compatibility mode keeps a bounded whole-map bitmap (1.5M pixels); close views of large maps can therefore remain softer than the actors. Standard mode uses a 3.2M-pixel scene cap. Some existing regional boundary primitives and repeated props remain. This is a substantial terrain/composition pass, not a claim that every location has final launch art.

Screenshots: [battle console](release-5.12-battle-console.jpg) · [scenery](release-5.12-scenery.jpg).
