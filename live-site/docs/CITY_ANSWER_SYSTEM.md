# The city answers: mechanical contract

The final encounter recognizes specific working places and willing relationships.
There is no community score, required repair count, or gate on either choice about
Sable's mother's recording. The travelling crew can win without optional help.

## World API

`dist/game/engine2/city-answer.js` exports three pure presentation/context functions:

- `cityAnswerContext(state)` returns `{version: 1, lead, contributions}`. Each
  contribution has a known `id` and up to three credited source IDs. There are at
  most four contributions. Repeated sources do not increase an effect.
- `cityAnswerView(state)` returns `{title, summary, contributions}`. Each row adds
  `kind`, `label`, the exact mechanical `detail`, and `sourceLabels` naming the
  actual work or relationship. Display those source labels with the effect.
- `cityAnswerEpilogue(state)` returns recognition pages before the private
  recording choice. It does not read or change that choice. With no qualifying
  work it recognizes the crew alone. Lead identity follows valid `journey.hero`,
  the hero of `chronicle.originId`, valid `chronicle.hero`, the first party member,
  then Sable.

The functions do not create missing state, grant items, mark repairs complete,
consume supplies, or mutate a frozen input. Past origin scenes and borrowed field
histories do not supply contributions.

## Sources and consequences

| Contribution | Qualifying saved outcomes | Effect in the chapter 24 guardian fight |
| --- | --- | --- |
| Return | Completed `chapel-return`, `heat-independent`, or `water-return`; or an explicitly activated inherited release service | The first Choir warning gains 1.2 seconds. Several returns share this single pause. |
| Care | Fully repaired and opened Chapel shelter; an explicitly activated inherited care service; a built water cooperative or commons | Each crew member's first direct Choir hit is halved. Zero/nonfinite damage, nonliving targets, DOT and secondary damage do not consume it. |
| Witness | Completed `relays-distinct`; the fully repaired and opened witness stair; an activated voluntary-copies or witness-desk service | The first successful two-voice interruption leaves five seconds of recovery/exposure instead of three. The second hero and different kind of hit are still required. |
| Commons | Completed `assembly-return`; a built open repair workshop; an actually completed shipment | The first paid Guard restores six additional MP and removes eight strain from every living crew member. Ordinary Guard benefits still apply. |

Only the five completed answering-network work IDs qualify. Inspection and
installation steps do not. A legacy Chapel battle preparation alone does not
claim an opened shelter or stair. An origin choice must match its authored effect
and have its service explicitly activated. Cargo merely accepted or protected is
not a completed delivery. Inherited trade seals, old public-work counts and
earlier NG+ prose records do not grant present-day services.

The physical network module owns migration of established historical heat
independence. This module reads its explicit completed work ID; it does not infer
new network repairs from a boss count.

## Battle persistence

Root integration supplies the world descriptor as `context.cityAnswer`. Effects
are restricted to chapter 24 with a guardian present, outside friendly/tutorial
encounters. They use the existing intent, damage, Guard and completed-answer
paths. No new victory requirement replaces the guardian's rules.

The battle adds two optional arrays to that descriptor:

- `used`: consumed return, witness and commons contributions.
- `careUsed`: hero IDs whose first-hit protection has been consumed.

These remain inside the ordinary serialized battle context. A saved pending
warning retains its remaining time and spent pause; restored protection and
respite cannot replenish. `validCityAnswerContext(value, heroes)` rejects unknown
or mismatched source IDs, duplicate contributions/uses and protection attributed
to heroes outside the saved party. Missing context remains a valid old save.

Every use emits `type: 'city-answer'` with its contribution, actual source IDs,
actor and readable effect. World UI can show available contributions before the
fight; notices and recording can show when each one is used.

## Peaceful passage and deliveries

`securePeacefulShipment(state, battle, result)` in `economy.js` is called by
`settleCreatureMemory` after the encounter's relationship records are persisted.
It adds one protection step to unfinished cargo already travelling between a
source/destination that includes the encounter's actual chapter.

It requires a won wild encounter, every creature alive and withdrawn, no crew
harm or stolen tool, and at least one actual care action or established trust.
The settled creature-memory entries must match that encounter. Unresolved
objective victories, defeats, other districts, origin histories and borrowed
field trials do not qualify.

Shipment encounter keys, an economy claim, and the optional validated
`ecology.cargoPassageSettled` boolean make settlement idempotent. A new shipment
cannot claim a previous finished encounter. Protection remains capped at the
existing two steps. The benefit creates no bodies, goods, items, credits or XP;
wild drops continue to come only from actually defeated species. A successful
passage emits `city-answer` with `action: 'peaceful-passage'`.

## Focused verification

Executed each listed module directly with `node`, using independent process
batches. Final results: **102 tests passed in 10 modules; zero failures, skips or
cancellations.**

| Test module | Passing tests |
| --- | ---: |
| `city-answer.test.mjs` | 7 |
| `city-answer-battle.test.mjs` | 6 |
| `peaceful-shipments.test.mjs` | 5 |
| `creature-ecology.test.mjs` | 21 |
| `economy.test.mjs` | 13 |
| `guardian-rules.test.mjs` | 12 |
| `personal-signatures.test.mjs` | 9 |
| `guardian-reward-rules.test.mjs` | 5 |
| `runtime.test.mjs` | 15 |
| `battle-flow.test.mjs` | 9 |

The new tests exercise earned sources, frozen input, all seven lead identities,
legacy-origin fallback, privacy of the personal choice, actual damage/timing/MP
changes, correctly completed two-voice answers, malformed save rejection,
single-use behavior after restore, paid peaceful creature actions, cargo
completion, and absence of invented body drops. The runtime suite retains its
24 legal resource-paying guardian baseline resolutions.

This evidence is model and contract verification. The combined full release
suite, browser presentation, and player balance assessment belong to the root
release pass.
