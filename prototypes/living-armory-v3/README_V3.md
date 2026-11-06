# Ash & Aether — The Living Armory v3.0

**Checkpoint: 29 October 2026. Standalone demonstration complete; NOT merged into the deployed campaign.**

## Play

Open `armory-playable.html`. No internet, server, CDN, asset fetch, external font or runtime framework is needed. The demonstration saves to its own browser storage. Click a stored or equipped item to compare it; double-click a stored item to equip it; switch Character, Inventory, and Inspect tabs on phones. The demo's **Defeat & Claim Loot** button simulates an already-completed battle and is not the real A&A combat resolver.

## What's newly implemented in v3

- **Seventeen painterly, original generated-concept prop-art classes** baked into local WebP textures, with vector silhouettes preserved for other categories and empty sockets. These are *category art*, not 193 separately hand-drawn items or high-resolution original source renders. At 256×256 output they are upscaled from curated crops, and are appropriate for small inventory cells. The cinematic style reference remains **concept only**.
- **193 distinct equipment base templates**, **13 equipped slots**, six rarity levels, eight material regions, 12 crafted ancient uniques, five sets, 12 runes and real bag/vault placement. These v2 features remain unchanged in count.
- **Seven paired material harmonics** and **six single-element overtones**. Equipment and socketed runes contribute to resonance counts; terrain, shielding, water, organic surfaces, attack element and regional resonance determine whether a chord is engaged. The resulting damage, guard, protection and piercing boosts are explicitly capped. `Armory.gearResonance()` and `Armory.combatModifiers()` expose the actual numerical results and active/engaged flags.
- **Echo-Engraver**: choose any of 19 whitelisted stats to permanently focus an item, for escalating scrap, essence and (at high rarity) starshards. The imprint replaces its prior focus rather than accumulating indefinitely. Names, sockets, set affiliations, legendary powers, and item IDs are preserved. At most 12 retunings are allowed on one item.
- **Stricter canonical host bridge:** in host mode, combat math returns `ready:false` without a verified canonical equipment projection. When a host projection exists, its gear is evaluated read-only and the prototype equipment state is restored immediately. There is no separate minting in host-owned mode.
- **More robust offline startup:** remove the previous Google Fonts import, which could stall otherwise offline navigation. System font fallbacks are bundled by reference; no font files redistributed.
- **Reward-card layout correction:** painted icons no longer overlap item labels or the victory popup.

## How the math responds to the world

The paired chords engage only with two voices of each element, where a voice is an equipped object's element or one socketed rune. Examples: **Kindled Orchard** (ember + verdant) increases offense on organic ground; **Memory in Water** (tide + echo) engages in water; **Sky Furnace** (stone + aether) pierces shield on resonant terrain; **Unfinished Song** (aether + echo) pierces harmonic enemy shielding. Single-element overtones appear from three voices and require both attack and terrain to match. Every chord's bonus is a *combat input*, never a separate simulated battle.

## Tests and browser quality checks

`node --test tests/*.test.mjs`: **69 passing / zero failing**. The v3 tests cover valid/invalid stat imprints, exact material spending, no reroll power farming, save migration and corrupted snapshot rejection, paired and single-voice harmonics, terrain gating, shield penetration, renderer independence, and the host's canonical-equipment boundary.

`python browser-qa-v3.py` uses headless Chromium to inspect the actually rendered self-contained page, via injected HTML because local file and localhost navigation is blocked in this environment. **Desktop 1490px and mobile 390px** have zero page-script errors, no horizontal overflow, and 11/11 visible painted images decoded. It exercises engraving and opens the simulated Sable Cantor boss reward window; reward text/image overlap assertions pass. See `BROWSER_QA_V3.json`, `assets/v3-desktop.png`, `assets/v3-mobile-gear.png`, and `assets/v3-boss-loot.png`.

To rebuild the offline HTML, run `python build-standalone.py`. To recreate local prop art, run `python bake-item-art.py`; the art source is `assets/art-source-rpg-generated.png` and is included. This generated concept source is not a screenshot of a real deployed game.

## Live integration is still an explicit, uncompleted step

The authoritative game Site is `https://ash-aether-clay-water.towre676.chatgpt.site` (project `appgprj_6adf63724e5c8191bd55637b8ecd8d9a`). This session can access its file projection but **cannot read/edit its production source or publish to it**. There is no verified A&A source repository exposed by the connected GitHub account. The **v3 complete package is not deployed** and does not prove any equipment was added to the main campaign.

Connect the real canonical inventory, equipment transactions, victory event bus, item persistence, monster species/anatomy registry and terrain sampler as documented in `INTEGRATION_CONTRACT_V3.md`. Do not paste the whole standalone HTML over the game. No reward may be minted by both the game's combat owner and the armory.
