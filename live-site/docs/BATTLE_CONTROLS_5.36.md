# 5.36 · Battle controls

Combat now uses one bottom control area for the target, crew, commands and paged action picker. Opening Mako, Personal, Supply, Tactics or Goal replaces the command grid. Close stays available on one-page lists. Actor and action rows reserve space from the actual movement pad and Reset control bounds, including the larger touch layout. Battle options includes a native Pause action beside its bottom Back control.

Pause subviews keep a persistent bottom Menu / Return bar outside their content scroller. The main menu uses compact illustrated composition rather than a large blank book. Armory Return and current-item actions stay in its bottom dock; the Bearer, Satchel and Inspector compositions are tighter around existing art.

Scene materials retain more of the painted biome grain. Software rendering now samples native timber and structural finishes instead of flattening them to a fill. Veyr service covers have chamfered closed footprints, recessed seams and trim; roof decks use slate. Fog wash is reduced. No collision footprints, save ownership, combat rules or growth prices changed.

## Verification

Actual native guardian practice was inspected at a 390 × 844 phone viewport. The game document stayed 842px high with an 842px client viewport; the movement pad cleared the crew and picker by 8px. Mako Close, Supply pages, actor switching, Tactics, bottom Pause and Return were operated. Larger controls recalculated the reserve and kept the same clearance. Crew, Characters, Supply and native Armory navigation were also operated.

A separate labeled native Goal fixture verified both 44px replay selectors, bottom Close and successful selected-pattern/angle replay at 568 × 320 with no document scrolling. Its time is held at zero and it never loads a journey save.

The full engine regression suite passes 1644/1644. After the final short-landscape objective-status CSS adjustment, the focused battle/objective checks pass 21/21. Independent syntax, dependency, asset and whitespace checks pass. Evidence is in docs/verification/battle-reach-5.36-browser.json and the matching phone image/test log.

This is browser viewport verification, not a physical Android performance test. The environment work improves existing surfaces and service-cover forms; it is not a complete replacement of the game’s environment art.
