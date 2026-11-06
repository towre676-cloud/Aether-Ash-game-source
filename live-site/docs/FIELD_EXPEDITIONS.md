# Field expeditions

Wild encounters and authored patrols now feed a short, optional exploration loop:
resolve creatures or protect an objective, collect one existing trade material,
and return to a worksite to recover or practise an equipped core.

Three regional resolutions repair the damaged refuge at its original position.
The first chapter uses a public worksite in Cinderfall's outdoor town because
its other creature habitats are indoors. Later towns retain their existing
services; other refuges bind to a suitable outdoor creature habitat. Placement
uses reachable floor, avoids doors and occupied work, and remains fixed in saves.
No road or story objective requires the refuge or its encounter count.

A repaired refuge offers one recovery of 25% maximum HP and 20% maximum MP for
the travelling crew. A new regional victory renews that recovery; loading,
re-entering, waiting, and reopening the menu do not. Refinement explicitly spends
two matching trade materials for eight mastery AP on an equipped core, capped at
the existing 120 AP mastery threshold. These materials remain usable in the
existing economy; there is no additional currency.

Peaceful wild resolutions count equally. Origins, borrowed trials, practice,
friendly sparring, retreats, and defeats do not earn expedition progress. Patrol
material uses the existing economy claim, so its reward is never duplicated.
Wild claims use the encounter serial's high-water mark, keeping repeat-win
protection bounded. The versioned save ledger contains at most 24 regions and
256 authored-patrol claims; invalid imported histories are rejected.

Verification lives in `field-expeditions.test.mjs` and
`field-expeditions-integration.test.mjs`. The latter exercises the actual
`World.startWildEncounter`, `World.interact`, `World.winBattle`, `World.loseBattle`
and `World.restore` paths, including the first chapter's real outdoor map.
