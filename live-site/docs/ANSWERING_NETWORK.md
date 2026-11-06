# The city's answering works

The campaign's promise now has five small physical demonstrations. The player discovers an intentionally removed return channel, gives the city a heat source that survives a collector stop, checks water from both banks, hears separate mountain registers, and connects a public assembly to its neighbours. These are staged world interactions beside existing chapter work. They do not add a new inventory category, a repair score, purchased supplies, or a requirement to revisit earlier chapters.

## Authored work and evidence

| Chapter | Existing task remains first | New physical actions | Final evidence ID |
| --- | --- | --- | --- |
| 4 — Chapel of Rain | Hear Hesper's account | Inspect the filed diagram; free its small return and send one reed pulse through clay/Mako and moving water | `chapel-return` |
| 8 — The Last Reactor | Isolate the memory chambers and open coolant safely | Seat Corin's root; turn the district diverter; close the collector feed for an isolation test and observe the still-warm district gauge | `heat-independent` |
| 11 — What the River Kept | Recover the survey and complete the chosen bank repair | Open the return bleed; read the west and east public gauges in either order | `water-return` |
| 16 — The Mountain Learns a Song | Finish the surveyor's different-register phrase | Uncouple the unison collar; leave an answering interval and hear three separate registers | `relays-distinct` |
| 23 — The City Chooses Its Voices | Fund the archive or begin the river school | Post the routes actually established; receive a neighbour's correction through the outward contact | `assembly-return` |

Chapter eight's three stages are essential before the new campaign's Crown encounter. The other four works are optional preparations; a manual player can challenge their guardian without them. The story guide can walk through every stage after the native prerequisites. Completed chapters do not redirect the guide back to unfinished optional proof. The devices remain available for a deliberate return.

Each action changes the saved physical state and gives a short notice. It does not open another dialogue box. Repeated inspections explain the settled state without adding duplicates, earning supplies, or replaying a completion event. The assembly acknowledges actual prior work; it never silently completes missing regions.

## Visible change

`network-render.js` reuses the existing painted prop kit through `drawAuthoredProp`: a diverter, reed/root bank, bell fixture, window gauge and clay workbench. The overlays represent concrete contacts and instruments:

- The chapel's filed clamp gives way to a returning arrow.
- The root contacts warm, the district pipe turns amber, and the collector-side indicator goes dark while the separate heat gauge remains warm.
- Water reaches two independently readable gauges.
- Three relay contacts retain visibly different heights.
- The public board lights only the earlier lines actually demonstrated and adds an outward answering contact.

Ground-level pipe pulses travel only on opened local circuits. Reduced motion keeps the material changes and stationary indications while removing traveling pulses. Both rendering helpers work without filters, pixel readback, generated buffers or new artwork. Missing painted assets retain a simple direct-Canvas fixture fallback.

The binding helper finds connected floor near the existing task, away from native actions, doors and physical lore. It also reserves the Chapel witness's later landing. In the current furnished maps, the sites are:

| Scene | Sites |
| --- | --- |
| Chapel `292` | Diagram `[5,12]` |
| Reactor `294` | Root `[23,30]`, diverter `[23,27]`, gauge `[22,32]` |
| Spillway `160` | Bleed `[21,20]`, west gauge `[21,17]`, east gauge `[23,22]` |
| Resonance gallery `394` | Collar `[52,46]` |
| Common assembly `319` | Board `[55,61]` |

These are measured outputs of placement against the current floors, not another hard-coded collision map. No floor cell is blocked or changed by this feature.

## State, migration and proof

```js
state.answeringNetwork = {
  version: 1,
  works: [],
  heard: []
};
```

`works` permits eleven unique IDs: the five final IDs above plus `chapel-inspected`, `root-installed`, `heat-diverted`, `water-opened`, `relays-opened`, and `assembly-posted`. `heard` permits nine unique IDs: `chapel-answer`, `heat-answer`, `heat-established`, `water-west`, `water-east`, `relay-low`, `relay-high`, `relay-middle`, and `assembly-reply`.

Validation rejects unknown keys/IDs, duplicates, oversized arrays, wrong versions, impossible work order and proofs without their corresponding heard result. Prelude marks are not finale contributions. `networkEvidence(state)` supplies a fresh readonly summary with final IDs and named booleans, allowing the finale to derive specific help without treating the number of repairs as virtue.

**Migration has one narrow exception.** A save without this ledger whose chapter-eight boss is already cleared has already received the old authored seed-heat outcome. It gains `root-installed`, `heat-diverted`, and `heat-independent`, with `heat-established` as the provenance. It does not gain `heat-answer`, a newly performed isolation test, any other optional proof, an item, a debit, or a new civic choice. A save with an existing new ledger is never backfilled simply because a guardian later appears in `bosses`.

`validateAnsweringNetwork` leaves an absent old ledger untouched; `migrateAnsweringNetwork` initializes it after validation. The explicit `heat-established` mark is only valid with an existing chapter-eight victory.

## Integration API

`answering-network.js` exports:

- `NETWORK_WORKS`: five frozen descriptors containing `id`, `chapter`, `label`, principal `scene`, local `scenes`, the native prerequisite, and a three-note `motif`.
- `migrateAnsweringNetwork(state)`: initializes or narrowly migrates the ledger and returns it.
- `validateAnsweringNetwork(state)`: returns `true` or throws; it does not normalize invalid data.
- `networkEvidence(state)`: readonly `{works, heard, chapelReturn, heatIndependent, waterReturn, distinctRelays, assemblyReturn}`.
- `networkObjects(world)`: current `type: 'network'` devices carrying `networkId`, `networkWork`, `networkStage`, `networkScene`, `xy`, label and hints.
- `networkInteraction(world, object)`: returns `false` for unrelated objects, otherwise handles or rejects the attempt. A valid action requires the actual site, current stage, current scene, native prerequisite, field mode, reachable proximity and an unobstructed approach.
- `networkDone(world, object)`: completion of that specific site. The root cradle can be installed while the separate heat test remains unfinished.
- `networkObjective(world)`: a routed current-chapter goal after native prerequisites, or `null`. Its `targetScene` and `targetObject` also let offline fixture construction visit the real authored work.
- `networkPrepareEncounter(world, object)`: `{allowed, reason, goal}`. Only an uncleared chapter-eight boss without independent heat is blocked.
- `networkSceneView(world)`: local site state and completed local `works: [{id, label, scene, motif}]`, plus heat, water, relay and assembly indicators.

Renderer hooks are `drawNetworkObject(renderer, world, object, T)` and `drawNetworkConnections(ctx, world, T, time, {steady})`.

The guide's destination key includes both `networkId` and `networkStage`; its context includes the ledger. This is necessary for two successive interactions at the same diagram or board. `resolveGuidedObjective` places the network after an active Bell investigation and before ordinary campaign routing. Actual native flags still determine whether the network has anything ready to offer.

Each action emits `network:reply:<actionId>` through the existing music callback. Only the five completed work IDs produce the final local motif; the audio controller suppresses prelude IDs, defers during pauses/dialogue/voice, respects volume/mute, and may give one quiet answer on scene entry. The state model itself starts no audio loop. The five motifs are chapel `[0,1,2]`, heat `[0,1,0]`, water `[1,2,0]`, mountain `[0,2,1]`, and assembly `[2,1,0]`.

## Developer fixtures and verification

`dev-session.js` now finishes a chapter's native prerequisites, visits each ready network site, approaches it along `interactionPath` using resolved `World.move`, and invokes the same `World.interact` path as a player. It does not insert completion marks. Arrival fixtures precede current-chapter work; boss fixtures contain that work. These remain offline practice fixtures, not evidence of a complete human playthrough or combat performance.

`tests/answering-network.test.mjs` has fourteen focused tests covering:

- Narrow old-save migration, invalid/fabricated evidence, and save roundtrip.
- Nine reachable placements on actual furnished floors and destination-list availability.
- Native-prerequisite priority and no forced return after a completed chapter.
- All five works through the integrated full-assistance resolver, real path traversal, scene transitions and `World.interact`.
- Remote, stale, wrong-scene and forged-stage rejection.
- Finite completion replies with no extra dialogue boxes.
- The real chapter-eight boss gate before and after all three heat steps.
- Both water-reading orders, separate mountain replies and honest assembly evidence.
- Both civic branches' arrival/boss fixtures and bounded local sound motifs.
- Compatibility fallback rendering and reduced-motion pipe behavior without filter/readback APIs.

Run with `node dist/game/engine2/tests/answering-network.test.mjs`. Live browser composition and the full release suite remain the integrating pass's checks.
