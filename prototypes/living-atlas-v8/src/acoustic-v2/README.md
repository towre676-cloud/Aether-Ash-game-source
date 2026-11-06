# Ash & Aether — Acoustic World v2.0

**A playable, reproducible audio expansion for *Ash & Aether: Clay and Water*.** This is a standalone portable package, not an assertion that it has been installed into the live A&A game. The actual A&A site development route was inaccessible (401) during creation; the connected GitHub account contained no editable A&A source repository.

## Start the playable demonstration

**Windows 11:** Double-click `launch_windows.bat` (requires Python 3); your browser opens **The Listening Marsh**.

**All systems:** In this directory run `python -m http.server 8765` or `python3 -m http.server 8765`, then open **http://localhost:8765/playable.html**. Press **Enable sound + begin**. Headphones recommended. JavaScript ES modules and streamed audio fetches generally do not work properly when opening `playable.html` directly via `file://`.

`index.html` is an earlier A&A sound-library listening room. `playable.html` is the **v2 gameplay vertical slice**.

### Real mechanics to try

1. Press **L** to listen for a hidden sluice and read its bearing. Move **north or south** several steps with WASD or the touch pad, and press **L** again. Press **E** to resolve the two-bearing survey. This unlocks a physically traversable sluice gate only when a **map-authored** source is present. Poorly separated bearings are rejected, and a third scan can improve the solution.
2. Sneak on moss (**Alt** or touch **Mode**) versus sprinting across clay (**Shift** or touch **Mode**). The Clayback hears movements according to actual proximity, barriers, terrain and mode, and changes behavior between idle, suspicious, investigating and alert.
3. Approach the Clayback. Press **Space** / tap **Resonant strike**; press **Q** / tap **Tune weapon** to compare a clay-matched tone (196 Hz) with a mismatched one (523.25 Hz). The latter is less effective against clay armor. Actual damage is calculated and changes creature HP in this self-contained prototype.
4. Press **R** / tap **New Game Plus** to replay with alternate timeline score flags. The v2 composer crossfades synchronized 120 BPM stems in response to travel, danger and discovery.

Muted play displays equivalent directional indicators and captions. **No microphone access is required**; audio is used for output, not voice input.

## Delivered audio catalog

| Category | Files | Non-decorative use |
|---|---:|---|
| Environmental biomes | 16 | Persistent, spatially identified environments |
| Footsteps | 30 | 15 actual surfaces × soft/heavy cadence; environmental detection |
| Creature vocalizations | 30 | 10 species × idle, alert, attack |
| Material and combat interactions | 34 | Objects, armor forms/breaks, tools and elemental abilities |
| Learned listening signals | 12 | 12 different melodic signatures encoding hidden sources |
| Responsive UI cues | 10 | Menus, rare rewards and plot state |
| **Adaptive score stems** | **24** | **6 scene palettes × 4 synchronized layers** |
| Localized spot events | 48 | 12 areas × ecology, structures, weather and danger |
| Material interaction textures | 24 | 8 world materials × gather, scrape, break |
| Hazard telegraphs | 16 | Incoming world/battle dangers |
| **Total original, locally included Ogg assets** | **244** | **~4.9 MB** |

The 24 music stems run 16 seconds at 120 beats/minute and are exact-length phase aligned within each palette. They are **original synthesized working-quality layers**, not a claim of studio-orchestra performances. The audio can be regenerated from `generate_audio.py` plus `generate_v2_audio.py`. All packaged Opus files are stereo, derived from 24 kHz synthesized samples. Opus playback streams report 48 kHz as standard. A separate **38.4-second MP3 preview** illustrates multiple stems and acoustic events: `Acoustic_World_v2_Adaptive_Preview.mp3`.

The connected Runway workspace also holds seven previously completed externally generated masters, with another five high-fidelity music/voice requests submitted in this phase. See `external_runway/RUNWAY_ASSETS.md`. **None of those external recordings are embedded** in the ZIP; the local prototype uses its own audio and does not depend on unstable temporary download URLs.

## Architecture

- `src/acoustic-world.js`: low-level audio cache, attenuation/panning, captions, ambience and basic creature, interaction and clue playback. Backward-compatible with v1.
- `src/adaptive-score.js`: music-gain policy, scene-to-biome mapping and 4-stem aligned Web Audio playback/crossfades. The game's actual states drive stem gains.
- `src/acoustic-simulation.js`: exact segment/wall occlusion, sound propagation, stealth/sprint responses, hearing AI states, material-resonance comparisons, triangulation and persistent author-defined surveys.
- `src/game-bridge.js`: `AA_AcousticDirector` — thin authoritative host adapter integrating true game objects, quest IDs, enemy positions, player movement, score states and captions.
- `src/acoustic-quests.js`: 24 optional quest blueprints with explicit prerequisite flags and actual map source validation, **not auto-spawned quests**.
- `playable.html` + `src/playable-demo.js`: self-contained manual adventure demonstrating sound changing a world obstacle and combat outcome, including touch controls.
- `manifest.json`: asset IDs/paths and event metadata.
- `tests/*.test.js`: pure deterministic contracts and host integration checks.

### Hooking this into the real A&A game

Copy the expansion into the real game's `/audio/` directory, preserving `src/`, `assets/audio/` and `manifest.json`. Connect to its real world state, **not the illustrative coordinates in the prototype**:

```js
import {AA_AcousticDirector} from '/audio/src/game-bridge.js';
const audio=new AA_AcousticDirector({
 manifestUrl:'/audio/manifest.json',
 assetBase:'../',
 onCaption:c=>game.subtitles.show(c.text),
 onQuest:e=>game.quests.applyUnlock(e.flag,e.source.id),
 onHearing:e=>game.enemies.applyHearing(e.enemyId,e.alertDelta,e.source),
 onTactic:e=>game.battle.applyAudioTactic(e)
});
// Must occur in a genuine pointer/key input handler, not on page autoplay:
startButton.addEventListener('click',()=>audio.unlock());

// Map-authored and authoritative — no generated loot, entities or coordinates.
audio.setWorld({objects:game.map.acousticObjects,walls:game.map.soundWalls,
                enemies:game.enemies.all.map(e=>({id:e.id,position:e.position,hearing:e.hearing,range:e.hearingRange}))});
game.on('zone:enter',e=>audio.event('zone:enter',{biome:e.audioBiome,weather:e.weather}));
game.on('player:position',e=>audio.event('player:position',{x:e.x,z:e.z,heading:e.heading}));
game.on('player:footstrike',e=>audio.event('player:step',{timeMs:e.gameTimeMs,position:e.position,surface:e.surface,mode:e.mode,speed:e.speed}));
game.on('monster:position',e=>audio.event('creature:position',{id:e.id,position:e.position}));
game.on('monster:shield',e=>audio.event('creature:shield',{species:e.species,position:e.position,material:e.material,attackFrequency:e.frequency}));
game.on('battle:attack',e=>audio.event('combat:attack',{kind:e.kind,shieldMaterial:e.shieldMaterial,attackFrequency:e.frequency,position:e.target}));
game.on('world:hazard',e=>audio.event('world:hazard',{kind:e.kind,position:e.position,caption:e.caption}));
game.on('music:state',e=>audio.event('music:state',e));
game.on('player:listen',e=>audio.event('player:scan',{position:e.position}));
game.on('player:resolve',e=>audio.event('player:resolve',{sourceId:e.authoredSoundSourceId}));
// Save/reload:
game.save.audio=audio.serialize();audio.restore(game.save.audio || {});
```

The host owns **actual damage and enemy motion**. `materialShield` reports a `defenseMultiplier` and `vulnerable` boolean; it is not a license for the audio adapter to arbitrarily mint combat damage. The included prototype applies these values to its *own* Clayback HP to verify this game-mechanics link. Avoid double-applying the adapter's `onHearing` notifications if the host game separately handles AI attention; use one authoritative hearing pathway.

`player:step` is meant to represent a **footstrike**, never an animation-frame or every-pixel event; it has a basic anti-spam interval. Any physical object with an `acousticQuestId` must already be placed by the map author, and `applyAcousticReward` checks live source identity, prerequisites and duplicate reward flags before notifying the game.

### Performance, production quality and accessibility

- Source buffers load lazily into a bounded LRU cache. The four score stems in each scene decode together so no percussion/harmonic timing drift develops inside the scene.
- Browser audio must be unlocked with a human gesture and resumed after suspension. Use per-bus volume sliders and show captions, bearings and visual threat cues for deaf/muted players. Production should duck background music while voiced lines carry important information.
- Keep adaptive loop transitions clean; reduce simultaneous voice count, prioritize tactical warnings, stream long dialogue/music where appropriate, and monitor decode latency on low-end mobiles.
- The 132 earlier core synthesized sounds and v2's 112 new layers are **working design assets**; actual A&A release mastering should selectively replace synthetic foley/score with reviewed recorded or expressive tracks.
- **Runway masters are external** until explicitly downloaded, audited and copied under stable local names. A signed short-lived asset URL must never be shipped in the website bundle.

## Tests and deployment status

`npm test` passes **20/20** deterministic tests. `python qa_v2.py` reports **244/244 decodable Opus assets** and validates all 24 16-second score stems. The in-memory Chromium smoke verified initialization (with mocked audio asset transport), movement, two-position scan, valid sluice gate world update, and zero JavaScript errors; `QA_Playable_AfterPuzzle.png` shows that state. The locked-down browser disallowed direct local URL navigation, so **this is not a full end-to-end Ogg playback test**. Hardware playtesting on Edge/Android and the real A&A website remain outstanding. No part of v2 has been deployed to the live site.

For CI, run `npm test && python qa_v2.py`. Original authored sound effects and score stems were synthesized for this task, without copying any existing game's soundtrack or voices.
