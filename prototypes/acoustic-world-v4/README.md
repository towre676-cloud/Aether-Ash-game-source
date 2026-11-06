# Ash & Aether — Acoustic World v4.0 (October 29, 2026)

**Standalone, integration-ready prototype — NOT deployed to the live A&A Site.** Version 4 carries forward all 384 original v3 sounds and adds **128 original locally synthesized, game-addressable cues**, for **512 playable Ogg/Opus assets**. The 128 new recordings are *procedural sound-design working assets*, not live-instrument studio recordings. Twelve separate studio-quality masters from the user's Runway workspace have been verified completed, but could not be materialized into this offline container; `external_runway/STUDIO_MASTER_REGISTRY.json` and `ingest_studio_masters.py` remain the secure import route. No expiring external URLs are embedded.

## Play now

Run `launch_windows.bat` on Windows with Python 3 installed. Or from this directory: `python -m http.server 8765`, and then open `http://localhost:8765/` in a browser. The landing page offers the Listening Marsh playable test and a sound-library audition. Audio starts only on an explicit click/tap. Captions and visible enemy telegraphs remain functional when muted or without audio hardware.

**New v4 controls:** `B` / Guard the beat, `T` / Challenge Clayback, ferryman and hydrophone buttons, alongside v3's WASD/arrow keys, Shift sprint, Alt sneak, L scan, E resolve, Space attack, Q tune, R New Game Plus, touch movement, climate/pace/mute/volume controls. Challenge Clayback makes a fight immediately testable; it is an explicit prototype-only encounter setup, not a claim about the live campaign. A *rising warning sound* forecasts its strike. Guard near the end of the warning to expose its armor; a matching resonant counterattack then does more damage. The visible warning/guard readout is equivalent gameplay information for users who cannot hear it.

## New meaningful event catalog

| Count | Game-authored event | Purpose |
|---:|---|---|
| 32 | `boss:telegraph` | Eight bosses × four battle states (stalk, windup, vulnerable, enrage), audible timing and tactical information |
| 32 | `npc:work` | Eight occupational identities × work, idle, warn, trade, making actual scheduled NPC tasks locally legible |
| 32 | `world:device` | Eight hydrophone/sluice/Mako/resonance mechanisms × activate, pulse, overload, resolve; require host-authored physical devices |
| 32 | `timeline:consequence` | Eight regions × origin, fracture, mirror and reconcile; distinct NG+ memory motifs |

The four groups join the v1–v3 grass/terrain footsteps, weather, ecological hearing, localized ambiences, 24 acoustic quest blueprints, 24 synchronized adaptive music stems, 48 world sound events, creature behaviors and material sounds. `resolveV4Cue` is a pure data resolver: all new cues have exactly matching manifest IDs, all unsupported events return null, and none writes a quest flag or infers physical game objects.

## Integration contract (actual host must adapt its event bus)

```js
import { AA_AcousticDirectorV4 } from '/audio/src/game-bridge-v4.js';
import { bindAcousticHost } from '/audio/src/production-adapter.js';
const director = new AA_AcousticDirectorV4({
 manifestUrl:'/audio/manifest.json', assetBase:'../',
 onCaption: cue => actualGame.ui.showAudioCaption(cue),
 onQuest: resolved => actualGame.quests.applyAcousticUnlock(resolved),
 onHearing: notice => actualGame.ai.noteHeardSound(notice),
 onTactic: hint => actualGame.combat.showResonanceHint(hint),
 onCombatBeat: hint => actualGame.combat.onAcousticBeatAdvisory(hint),
 onTransportError: event => actualGame.telemetry.warn(event)
});
// Replace `actualGame` with the real API in the authorized A&A Site.
const binding = bindAcousticHost({game: actualGame, director});
// Must be called directly from a genuine user gesture, e.g. audio button.
audioButton.onclick = () => director.unlock();
// Keep authoritative positions/quest objects current from the host state:
director.setWorld({objects: realMap.acousticObjects, walls: realMap.soundWalls, enemies: realMonsters});
// On teardown: binding.dispose(); director.dispose();
```

`production-adapter.js` names explicit host event contracts and unsubscribes deterministically. **It does not mean the current live A&A game implements these event names**; map them to real engine events first. The v4 bridge offers `boss:begin`, `boss:guard`, and `boss:tick` as an *advisory attack-clock contract*. It reports `impact`/`guarded` outcomes; the host alone decides whether an attack actually hit and applies damage. `AcousticEventLedger` suppresses replayed or out-of-order *audio* events; save restoration never resurrects an active boss attack. The v3 12 studio-master asset registry and import tools are retained. Only stable, same-origin mastered files are suitable for live deployment; do not ship time-limited provider URLs.

## Validation and limits

- `npm test` executes **41 deterministic tests**, 41 passing, including all 30 v3 tests and 11 new v4 checks for cue coverage, attack guard timing, idempotency, backward save migrations and a safely unbound host event bus.
- `browser_smoke_v4.py` tests the v4 playable flow using an in-memory substitute WAV transport (gate opened, weather changed, timed guard, NPC, hydrophone, NG+), zero JS exceptions.
- `browser_real_opus_v4.py` additionally tests **real original packaged Opus bytes** through the actual Chromium Web Audio decode path using an in-memory fetch shim, no mock WAV. It decodes selected stems and new cue samples; it does **not** test all 512 assets or simulate a physical device.
- `qa_v4.py` validates every shipped asset's codec, duration and SHA-256, reruns all tests, and records results in `QA_REPORT.json`.
- `Acoustic_World_v4_Reactive_Experience.mp3` is a 64-second mixed demonstration of the generated music and event cues: marsh, ferryman, hydrophone, boss warning/guard, sluice resolution, timeline choices. It's a local audition, *not* a full orchestral studio master.

**Remaining production blockers:** no authorized editable live A&A Site, no repo containing that Site in this linked GitHub account, no materializable copies of the twelve studio masters in the local container, and no Windows Edge/Android physical-device acceptance. The live game has not been updated, merged, or deployed. Before production integration, tune the sound mix against real gameplay footage, profile device memory, import and master approved Runway recordings, and reconcile event names with the game's real scene/AI/quest APIs. Absolutely no automatic microphone input or hearing-only required progression.
