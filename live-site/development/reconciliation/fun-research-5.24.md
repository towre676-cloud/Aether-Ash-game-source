# A&A: evidence for improving the playable loop

Research date: 2026-10-29. Scope: eight deliberately chosen action RPG, exploration, and party RPG comparisons. This is not a survey of all games, a popularity ranking, or a claim that their mechanics prove a particular enjoyment score. No comparable measurements of meaningful decisions per minute were collected. Facts below come from official/developer sources; proposed lessons and A&A diagnoses are hypotheses.

## Editorial assessment of the baseline

My provisional rating of the 5.23 opening and repeat-encounter loop is **4/10 for sustained fun**. This is a design judgment based on source inspection, controlled encounter simulations, and observed browser play, not a measured player score, sales forecast, or percentile among commercial games. It does not grade every later chapter or every possible build.

The strongest diagnosis is that A&A offers more systems than situations that make their differences legible and worthwhile. An unlimited-range basic strike lets a spatial battle be played as a distant damage menu. A powerful early kit can erase a pack before a warning resolves. Rewards are real but their useful next action is hidden. Generic invitations and inert percentages add reading without helping a decision. The prior environment and music corrections address presentation, but cannot independently repair that loop.

The 5.24 pass targets a single connected cycle: notice a threat or useful object; choose a feasible response; issue it without an ignored early input; see the consequence; equip a genuinely earned improvement; try the next encounter. It does not add enemies, currency, progression tracks, random scenery, or extra HP just to lengthen fights.

### Controlled evidence

The reproducible benchmark is in `development/verification/combat-engagement-benchmark.mjs`, with its full method and results in the neighboring JSON. It uses the kit actually earned by the opening fixture, deterministic enemy/RNG behavior, and 50 ms simulation steps. The dodge policy has ideal knowledge of attack geometry; these are simulation comparisons, not a human playtest. The control replays the preserved 5.23 behavior; Ground Forge/Living Atlas modifiers, menus, cinematics, and physical pointer time are excluded from both sides.

| Opening case | 5.23 control | 5.24 spatial orders | Interpretation |
| --- | --- | --- | --- |
| Patrol, ordinary attacks | 4.45 s, no damage | 4.45 s, no damage | This remains an easy early fight. |
| Patrol, earned Earth technique and attacks | 2.15 s, no damage | 2.90 s, no damage | Real approach consumes time; no HP padding. |
| First guardian, earned kit while standing | 12.40 s, 38 crew HP lost | 12.40 s, 38 crew HP lost | Existing offensive values and costs stay intact. |
| First guardian, same kit with idealized dodging | 12.40 s, no damage | 15.65 s, no damage | Avoiding the marked attacks remains valuable, but moving out now gives up some melee uptime. Two warnings occur instead of one. |

Queued earned actions can be selected at simulation time zero. The first paid action still occurs at 1.75 s: the change removes a rejected input, not the readiness cost.

### What remains unproven

A passing regression suite proves neither enjoyment nor enough encounter variety. The opening patrol remains forgiving. Later combinations may still trivialize particular guardians; repeated use of an optimal damage recipe may remain too effective. We have not run an independent, uninterrupted 20–30 minute new-player study of this release. The next design decision should depend on that session: can a player describe the threat, make a deliberate counter, understand the new equipment, and voluntarily want another encounter? A longer fight by itself is not evidence of better play.

## What the comparison suggests

The recurring design opportunity is to make the next decision understandable, consequential, and followed by a visible result. A larger move list or simulation is useful only when the player can recognize what it changes. Tactical pace and quiet exploration are compatible with this: the goal is less empty waiting and less administrative friction, not maximum button presses.

| Comparison | Sourced mechanism | Actionable inference for A&A |
| --- | --- | --- |
| **Hades** | Supergiant describes repeated attempts combining different divine powers, permanent progression, persistent story events, and adjustable challenge. Its development notes also describe revising dash responsiveness and supporting more build combinations. [S1–S2] | Let earned rewards change a near-term plan. Make another encounter attractive because the player wants to try an interaction or advance a relationship. Preserve adjustable challenge; frustration is not a prerequisite for depth. |
| **Dead Cells** | Its official description emphasizes patterned bosses/minions, distinct weapon/spell gameplay, alternate level paths, and hidden passages. A dated developer balance update replaced passive cooldown reduction with rewards for active behaviors such as parrying and critical hits. [S3–S4] | Give enemies a learnable behavior and a payoff for answering it. Offer routes with different anticipated risks. Reward skillful actions directly instead of relying only on bigger damage statistics. |
| **CrossCode** | Radical Fish's design notes explain directional guarding, different elemental roles, attack-earned SP, and charged arts tied to melee, ranged, guard, or dash actions. Another note explains the time/charge tradeoff and an escape from a bad charge. These are historical developer design records, not a claim about current exact timings. [S5–S6] | A small set of verbs can create depth when each answers a different situation. Make resource recovery support an active loop. A&A can strengthen Guard/Break/position choices without importing a separate twitch-combat system. |
| **Tunic** | Lead developer Andrew Shouldice describes the collectible manual as containing maps, tips, illustrations, and secrets; knowledge hidden in plain sight makes discoveries feel owned by the player. [S7] | A route hint should help the player notice something and act. Use the existing Hydrophone, physical clues, and repaired routes to reveal an opportunity, rather than adding another ledger entry without a practical consequence. Basic controls still need clear teaching. |
| **Chained Echoes** | The official site describes visible encounters that fight in the place where they were engaged, immediately executed orders, and interconnected exploration by foot, mech, and airship. [S8] | Remove unnecessary transition and navigation friction. Before committing to a visible encounter, make its purpose and plausible payoff readable; after it, return control promptly. This source does not substantiate an exact Overdrive formula, so none is claimed here. |
| **Sea of Stars** | The creative director describes a compact move kit, normal attacks replenishing MP, and visible damage-type locks that weaken or cancel a charged enemy action. The later Dawn of Equinox update added Mystery Locks/reveal mechanics and changed combo points to persist between battles. [S9–S10] | Give the player an immediate question: cancel the threat, exploit a weakness, or recover resources? Show which current party action can answer it. Do not copy the outdated claim that combo points disappear after each battle. |
| **Monster Hunter Wilds** | In a developer interview, Capcom describes wounds created through attacks, increased damage on wounds, targeted Focus Strikes, breakable-part rewards, and changing weapons to suit attack patterns or situations. Focus Mode helps players aim and recognize the relevant body part. [S11] | Make a successful counter visibly alter the enemy: break protection, expose an opening, or prevent a named threat. A&A's anatomy, shells, and guardian openings should produce an obvious result that the player can explain afterward. |
| **Diablo IV** | Blizzard's April 2026 skill-tree explanation emphasizes upgrades that visibly change skill behavior: its Rend example can gain fire damage, ranged waves, or reach. Blizzard separately documents saved loadouts for trying and returning to builds. [S12–S13] | Prioritize upgrades that change how the next fight plays. Make comparison and experimentation easy, including restoring a previous loadout. A&A already has extensive build systems; exposing one relevant earned choice is more useful than adding another progression currency. |

## Two hypotheses from the audited 5.23 baseline

### H1: Existing counterplay is insufficiently connected to the player's next command

**Observed in the 5.23 baseline source:** `battle.js` already has enemy windups, interruption, Guard, exposed status, enemy roles, anatomy, ecology, battlefield tools, and guardian recovery. Its basic Attack spends readiness and applies damage immediately to the selected enemy or protecting guard; that branch has no attacker-distance check. `battle-flow.js` has enemy countdowns and an optional auto-attack mode. Main's technique choice opens a second picker. These are implemented mechanisms, not evidence that ordinary players notice or need them.

**Hypothesis:** Early encounters can feel like selecting damage from a menu while deeper systems remain optional or hard to connect to a visible threat. Spatial presentation may promise a greater role for positioning than a normal attack requires. This is not yet a measured conclusion that auto-attack wins everything or that every fight lacks depth.

**Bounded experiment:** Use existing creatures and counters to make three early encounters ask different questions: a clearly forecast line attack, an enemy repairing a protected ally, and a guarded threat with an answer the present crew actually has. Offer one concise pre-encounter hint and show the successful counter's immediate effect. Keep the existing Wait/Active accessibility choice and actual readiness/MP costs. Do not add a new system merely to make the interface busier.

**Validate:** In observed play, record whether a new player identifies the threat, chooses a relevant counter without a walkthrough, and can explain the result. Compare voluntary target changes, purposeful Guard/Break/position use, failed inputs, menu-open time, and desire to fight again. Also run a basic-attack baseline; a counter should give a practical advantage without making the alternate approach artificially impossible.

### H2: The reward and exploration loop too often ends with a report instead of a new intention

**Observed in the 5.23 baseline source:** `fieldVictoryReport` reports already settled XP, credits, items, mastery, and world changes. Its summary directs earned growth to Crew setup. `field-journey-ui.js` presents Continue route and Crew setup. Repairs and scouting have real persistent effects in `world-affordances.js`, including finite stock, local preparation, and walkability changes, but a player has to inspect those actions to understand them. Root's browser observation during this audit found a generic “Walk over and try it” handoff for repair stock.

**Hypothesis:** The gap between earning something and making a concrete, attractive choice weakens the urge to continue. A large collection of menus, hints, and percentages can describe progress without telling the player what they now want to try. This is a hypothesis about presentation and decision flow, not a claim that the rewards are fake or absent.

**Bounded experiment:** After a meaningful victory, highlight one genuinely available earned development choice with its immediate gameplay consequence. Before a fight or repair, explain the current threat, one feasible answer, and a guaranteed payoff or explicitly uncertain possibility. Where a discovery opens a route, show that route in the world and let the player choose the detour. Preserve original rewards and save identities; do not promise a random drop or invent a guaranteed reward.

**Validate:** Observe whether players voluntarily inspect an upgrade, equip/use it in the following encounter, take an optional detour, and understand the local repair's effect. Measure time from reward to first use and confusion about the next goal. These are diagnostic measures, not universal industry targets; success still requires players reporting that they want another encounter.

## How to judge “fun” honestly

Use a short, repeatable playable segment and separate observations from interpretation. Assess: clarity of the immediate goal; number of genuinely different viable responses; readable threat and consequence; feedback on successful play; usefulness of rewards; discovery and self-directed route choice; friction from menus and interruptions. A longer battle, more damage numbers, or more clicks is not automatically more decision-making. Assign any A&A rating only after play, state the tested build and slice, and label it an editorial judgment. These sources cannot support an invented numerical rank against all other games.

## Source register

- **S1 — Supergiant Games, Hades FAQ** (updated July 16, 2025): https://www.supergiantgames.com/blog/hades-faq/
- **S2 — Supergiant Games, Get Pumped for the Beefy Update** (historical development record): https://www.supergiantgames.com/blog/get-pumped-for-the-beefy-update/
- **S3 — Motion Twin, official Dead Cells description:** https://deadcells.com/
- **S4 — Motion Twin, Custom Mode & Balancing, Update 11** (November 2018 historical design change): https://deadcells.com/patchnotes/11
- **S5 — Radical Fish Games, CrossCode Recap 2013** (January 13, 2014): https://www.radicalfishgames.com/?p=1504
- **S6 — Radical Fish Games, CrossCode Update #54:** https://www.radicalfishgames.com/?p=2391
- **S7 — Andrew Shouldice, lead developer, The creation of Tunic's invaluable in-game manual** (September 21, 2022): https://blog.playstation.com/?p=370009
- **S8 — Chained Echoes official site:** https://www.chainedechoes.com/
- **S9 — Thierry Boulanger, creative director, A closer look at the turn-based combat in Sea of Stars** (July 7, 2022): https://blog.playstation.com/2022/07/07/a-closer-look-at-the-turn-based-combat-in-sea-of-stars/
- **S10 — Sabotage Studio, Dawn of Equinox official release announcement** (2024): https://sabotagestudio.com/press-release/sea-of-stars-gains-a-constellation-of-new-features-in-free-dawn-of-equinox-update/
- **S11 — Xbox Wire, Monster Hunter Wilds: 6 Tips from the Developers Themselves** (direct developer interview, February 28, 2025): https://news.xbox.com/en-us/2025/02/28/monster-hunter-wilds-tips-from-developers/?ver=3.7.1
- **S12 — Chelsea Leah, Blizzard Entertainment, More Branches, More Choice** (April 22, 2026): https://news.xbox.com/en-us/2026/04/22/diablo-4-skill-tree-overhaul/
- **S13 — Blizzard Entertainment, Master the Occult in Season of Witchcraft**, permanent Armory section: https://news.blizzard.com/en-us/article/24167111/master-the-occult-in-season-of-witchcraft

The cited interview sections and posts are first-party explanations. Community wiki and review snippets were excluded from the evidence. CrossCode and Dead Cells development notes are intentionally labeled historical; exact current balance values were not inferred from them.
