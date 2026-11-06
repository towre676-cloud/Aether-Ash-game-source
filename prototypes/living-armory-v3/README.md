# CURRENT VERSION: v3.0 (29 October 2026)

**Start with `README_V3.md` and `INTEGRATION_CONTRACT_V3.md`.** The document below describes the earlier v2 baseline and its 54-test checkpoint; the current build passes 69 tests. The game Site remains unchanged.

---

# ASH & AETHER — The Living Armory

**A functional, original dark-fantasy equipment and world-loot system.** Built 2026-10-29. Source modules, portable standalone browser demo, code-level adapter, automated tests, and actual desktop/mobile screenshots are included.

## Start here

Open **`armory-playable.html`** in a browser. It is a self-contained ~105 KB HTML file: no server, JavaScript build, game account, CDNs, external images, libraries or developer tools required. The decorative font request falls back to built-in serif fonts when offline. The browser stores its own armory state locally. Select a creature and choose **DEFEAT & CLAIM LOOT** to exercise the entire generation-to-inventory pipeline. Tap an item to inspect, double-tap to equip, drag to rearrange. On mobile use the three panel tabs. Export and import JSON snapshots and test alternate timelines with **Begin NG+**.

For source development, serve this directory with `python -m http.server 8765` and open `http://localhost:8765/index.html`; these ES modules require a normal web origin. Run `python build-standalone.py` to regenerate the portable version after edits. Run `node --test tests/*.test.mjs` for verification (Node 22 used, no third-party packages).

## Contents

- `armory-playable.html` — complete, independently playable browser demo.
- `index.html` / `src/armory.css` / `src/ui.mjs` — responsive dark-fantasy inventory, thirteen equipment sockets, vector item art, portrait gear attunement, comparison inspector, forging, encounter rewards, lore, material pouch, history, New Game Plus and saved gear.
- `src/catalog.mjs` — **193 distinct equipment base templates**, 12 handcrafted ancient uniques with semantic effects, 5 multi-part sets, 8 regional material traditions, 6 rarity levels, 16 prefixes, 12 suffixes, 8 enemy archetypes, 19 gameplay stats and 6 elements.
- `src/armory.mjs` — seeded deterministic gear generation, anatomy-biased encounter loot, region scaling, 10×6 satchel, 10×8 stash, lossless overflow, manual placement and sorting, level requirements, two independent ring sockets, item locks, salvaging, 8 temper levels, set thresholds, actual context-sensitive legendary hooks, nonlinear world combat modifier contract, idempotent event grants and serializable per-timeline state.
- `src/host-bridge.mjs` — **deliberate ownership boundary** to prevent double awarding resources/gear when integrating with the real playable game.
- `tests` — 35 passing automated checks; pure JS with `node:test`.
- `assets` — generated desktop, mobile and boss-loot QA screenshots.

**Derived variety is much larger than the 193 named bases**: each base varies by 8 materials, 6 rarity tiers, item level, affixes and origin. Do not present a synthetic permutation count as a literal count of manually illustrated items.

## What is playable

The left panel shows a stylized character with gem/metal layers updated from the equipped head, shoulder, torso, leg, weapon, offhand and relic/sigil properties. Hover or tap sockets to inspect. The center contains a geometrically sized, physically arranged item satchel: long weapons occupy 2×4 cells, chestplates 2×3, jewelry 1×1, etc. The right card displays generated vector art, story, power, requirements, rarity, stats and the meaningful before/after comparison. Mobile panels are switched via accessible tabs instead of shrinking a three-column dashboard below legibility.

Regular creatures may give material-only rewards; elite and boss creatures reliably produce multiple or rarer items. The pool favors anatomical provenance: horned beasts tend to helmets and weapons; armored guardians give protective gear; specters favor jewelry, relics and talismans; constructs favor sigils and implements. The item material/element comes from the encounter region, not a separate arbitrary visual reroll. The same immutable `eventId` never pays twice within a timeline. Boss encounters guarantee at least one Exalted-or-higher item. The demonstration's defeat button **simulates a completed victory**, and must not be used as a second combat resolver in the real game.

## Nonlinear battle hooks and legendary skills

`Armory.combatModifiers(context)` accepts host-truth values for attack element, material/element, organic terrain, rooted terrain, water, real shielding, harmonic shielding, resonance and range. It produces bounded numerical damage/protection, grip, shielding reduction, attunement and event hook descriptors. Unique powers have typed triggers and magnitudes. Among others: 

- **Heartwood of the First Orchard** improves defense on actual organic terrain.
- **The Crown That Remembers** converts real Tide attunement into water protection.
- **The Long Way Home** enhances grip and lowers patrol detection on rooted ground.
- **Where the Stars Fell** pierces environmental cover at long Aether ranges.
- **The Bell Without a Tower** bypasses harmonic shielding for Echo attacks.
- **A Minute Before the Flood** emits a ward trigger after every fourth committed encounter.
- **A Map of Unlived Lives** carries an additional history memory into a new timeline.

Delayed hooks are intentionally **descriptors**, not fake claims that a battle engine, a patrol system or audio scheduler has been changed. A game's existing battle/terrain/AI system must consume them and update its own canonical state.

## Integration with the actual Ash & Aether game

**Deployment status: not merged or published.** The active A&A Site at `https://ash-aether-clay-water.towre676.chatgpt.site` is identified by project ID `appgprj_6adf63724e5c8191bd55637b8ecd8d9a`. This session cannot inspect or change its editable source. The linked GitHub installation did not expose an A&A repo. Earlier reconciliation notes make clear that the authoritative playable engine owns inventory, currency, monster encounters, saves, camera, ground materials, audio and New Game Plus. This package does not silently replace any of those.

Use the bridge by **choosing one and only one loot owner**. The recommended approach is host-owned because the live game already owns currency and inventory:

```js
import { Armory } from './src/armory.mjs';
import { createAshAetherArmoryBridge } from './src/host-bridge.mjs';

const armory = new Armory({seed: canonicalSave.worldSeed, timeline: canonicalSave.timelineId, seedStarter:false});
const bridge = createAshAetherArmoryBridge({
  armory,
  ownership: 'host',
  host: {
    hasCommittedLoot: (eventId) => game.lootLedger.has(eventId),
    // REQUIRED: this function atomically updates the canonical inventory,
    // resource balances AND event ledger in the SAME durable transaction.
    commitLootOnce: (eventId, record) => game.lootTransaction.commitOnce(eventId, record),
    onLootDisplay: ({reward}) => game.ui.showLoot(reward),
    saveArmorySnapshot: (state) => game.save.setNamespace('ash-aether-armory-v1', state),
  }
});

// Subscribe ONLY to the game's authoritative victory-complete event.
game.events.on('encounter-resolved', async ev => {
  await bridge.onEncounterResolved({
    result: ev.outcome,
    eventId: ev.persistentEncounterId,
    enemyId: ev.enemySpeciesId,
    enemyLevel: ev.enemyLevel,
    regionId: ev.regionId,
    worldTier: ev.worldTier,
    elite: ev.isElite,
    boss: ev.isBoss,
  });
});

// Read world effects from the real Ground Forge/Living World material sampler.
const math = bridge.readCombatContributions({
  attackElement: attack.element,
  attack: {longRange: attack.isLongRange},
  ground: {
    element: material.element,
    shielding: material.shielding,
    resonance: material.resonance,
    traction: material.grip,
    organic: material.organic,
    rooted: material.rooted,
    water: material.waterDepth > 0,
  },
  defender: {
    naturalShielding: creature.shielding,
    harmonicShield: creature.harmonicShield,
  }
});
// Apply math through the host's approved combat modifier/gear rules only.
```

All identifiers in this example (`game.lootTransaction`, `game.events`, etc.) are **illustrative integration contracts, not verified A&A API names**. Verify actual source interfaces and adapt these callbacks before merge. The bridge does not turn an example into a live integration.

Integration ownership checklist:

1. Connect live inventory and drop tables before enabling the UI, then remove any duplicate loot issuance for the same `eventId`.
2. Preserve original item IDs, currency semantics, existing monster spawn RNG, battle resolution and victory gating.
3. Get the **real** regional material facts from Ground Forge and local creature shielding from combat/ecology; never use the visual renderer to mint new items.
4. Apply gear contributions through established numerical battle middleware, including the host's caps and status event bus; do not run a competing hit-resolution function.
5. Merge the namespaced `ash-aether-armory-v1` segment into each timeline save without overwriting other namespaces. Carry a deliberate, explicit legacy subset into NG+.
6. Link real game UI open/close, hotkeys, touch targets and loot notifications. Test world pickup once, corpse looting once, boss chest once, crafting and save/load on old saves.
7. Check low-end Android performance, keyboard and touch accessibility, invalid save data, duplicate event delivery and restart mid-loot before shipping.

The bridge supports `ownership:'armory'` for a new game where it is explicitly the *only* equipment/material owner. Do **not** enable that mode alongside A&A's existing reward system.

## Browser / QA checks

The real JS bundle was exercised in headless Chromium at 1490×920 and 390×844. Desktop gear + inventory rendered and a boss award opened its reward dialog; mobile panel switching and inspection worked with no page-script errors or horizontal overflow. Browser validation was of this integration-ready **standalone**, not the published Site. Images in `assets/` are screenshot evidence of the actual functioning HTML, not conceptual mockups. Javascript tests: **35 passed**, 0 failed. One test draws 1,500 procedurally varied items and checks name diversity, slots and stat integrity.

## Naming, rights, and limitations

All art is original SVG, CSS and handcrafted geometric illustration within this package; no Diablo assets, fonts, trademarks or code were copied. The requested reference is interpreted as a **genre-quality dark-fantasy inventory experience**, not literal reproduction of proprietary visuals. The standalone HTML includes no paid assets, fonts, API calls or tracking. There is an optional Google Fonts CSS request in the source style; its absence does not affect core operation.

**Not yet achieved:** verified integration into the private A&A Site; authentication-dependent deployment; using an existing player save from that game; updating its real battle animations, 3D character meshes and actual world drops. Those require the source-owning session or the project's editable capability. This package supplies the executable UI and portable rules/adapter to do it without inventing host APIs.

---

# Living Armory v2 — completed continuation (October 29, 2026)

The second pass extends the original 193-base implementation without discarding the campaign's authoritative ownership boundaries. The standalone's **actual runnable UI** (not a visual-only mock-up) now includes:

- **Twelve runic voices.** Two meaningful enchantments for each of six elements: Ember, Tide, Verdant, Aether, Echo and Stone. Rare equipment has one socket; Exalted has two; Legendary has two; Mythwoven has three. Each imprint costs Essence (plus a Starshard at the third rune). Extracting a rune costs Essence, reverses the effective enchantment exactly, and leaves the item's base affixes unchanged even after tempering. The encounter modifier contract recognizes **two or more matching runes** for additional bounded material-element resonance. Runes never edit terrain directly.
- **Three complete equipment presets** saved by immutable item ID, with atomic wear, compatibility and level validation. Displaced items go to the pack, vault or recovery overflow, never silently disappear. A preset referencing destroyed gear fails without changing equipment.
- **Material Foundry.** Choose any of 12 equipment categories and any of the eight established regions; commission Rare or Exalted equipment for stated Aurels/Scrap/Essence/Starshard prices. The resulting item exists in the same bag/vault/overflow and save system as monster drops, and subsequent crafts have unique deterministic serials.
- **Hunter's Codex.** Inspect the eight reference creatures, their anatomical loot preferences, environmental shielding and recorded victory counts. Choosing a bestiary entry selects the demonstration encounter. An actual fourth victory against the same boss awards a signature-element Ancient Unique as the second item; previews and duplicate attempts do not advance this counter. The previous boss rule (at least one Exalted item) remains intact.
- **Unknown monster integration.** `previewEncounter` accepts `{enemyId, enemySpec:{id,name,body,region,level,signature,shielding,...}}`; host-supplied anatomy and environment enter the SAME drop logic. Unknown IDs no longer silently turn into the Cinderstag. Without an `enemySpec`, an unknown species receives a generic fallback only; for live game quality, the host must supply canonical species descriptors.
- **Equipment-derived discovery.** Equipped Discovery can modestly improve the loot appearance chance and rarity odds, subject to a cap. This does not override authoritative victory gating or the durable eventId ledger.
- **Source ownership clarity.** In host-owned mode, an equipment UI is marked `synced:false` until the host injects `getCanonicalEquipmentState()`. Never show a module-local demo bag as if it were the campaign's real inventory. The host retains the only currency and item ledger. The host bridge now updates its *non-minting* hunt and discovery journal after a confirmed commit.
- **Responsive visual treatment.** Etched metal foundry, constellation-like rune slots, rarity animations with a reduced-motion fallback, named build cards, bestiary list, and iconized rune binding. Headless Chromium checked both a 1490×920 desktop and 390×844 mobile view with no overflow or JavaScript errors. The screenshots `assets/v2-*` depict the real working browser application.

Run `node --test tests/*.test.mjs` to reproduce **54 passing tests**. The new checks cover reversible runes, nonlinear effects, repeated crafting, no-item-loss loadout changes, persisted boss-pity milestones, imported legacy v1 snapshots and unknown live monster descriptors. `python build-standalone.py` rebuilds the downloadable offline page.

**Important:** The playable standalone is at `armory-playable.html`, but the published A&A Site has *not* been modified here. The session only had its Site metadata/text projection, not editable game source. This remains a tested, source-complete integration package, **not** a claim of deployment into the existing game, an art-directed cinematic render engine, or a canonical battle-engine replacement.

## Live merge interface requirements — no invented API names

1. Recover the latest *editable* A&A source; verify the actual encounter completion hook, species registry, item store, item renderer, canonical economy, timeline saves and combat middleware names.
2. Use a `victory`-only, durable `eventId` from that host; pass species `enemySpec` for every non-reference monster. Do not reimplement encounter randomization, player movement, ground shielding or battle victory inside the armory.
3. Wire `commitLootOnce(eventId, record)` as one *atomic durable transaction* for gear, materials and the loot ledger; only afterwards notify the UI. For cross-session duplication/retries, use the host's ledger, not localStorage.
4. Implement `host.getCanonicalEquipmentState()` to project true owned gear, runes, currencies and vault slots from the host. Either adapt armory's rune/craft/loadout operations into the host's authoritative transaction layer, or make them read-only in live host-owned mode until transaction support is added. Do not leave two independent equipment owners active.
5. Consume `combatModifiers` in the existing battle calculation, including Rune Resonance, legend-trigger descriptors and capped material shielding. No decorative visual quality setting may change those mathematical outcomes.
6. Add the Armory's JSON as a **namespaced v1-compatible timeline segment** and test importing older saves. New Game Plus inheritance must remain under the host campaign's rules, not the standalone demo's rules.
7. Verify actual boss reward pickup, loot popup, blacksmith workbench, skill tree, party-wide characters, save/load after restart, Android touch UX and multi-encounter fast-forward before shipping.

## Cinematic art-direction reference

`assets/art-direction-cinematic-concept.png` is a **generated, noninteractive style reference** showing a potential future, materially richer gear screen. Its character names, location labels, equipment descriptions, and numerical readouts are **illustrative, not canonical A&A gameplay data**. The screens `assets/v2-desktop.png`, `assets/v2-mobile.png` and `assets/v2-boss-loot.png` are the **real browser-tested output** of `armory-playable.html`. Never pass the cinematic image off as proof that assets are implemented or published. Use it for art direction and future authored item sprites only.
