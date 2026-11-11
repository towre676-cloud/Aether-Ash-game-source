# Development and integration status

**Source status updated 2026-11-11.**

## Current separation of concerns

| Layer | Known status | What is not claimed |
| --- | --- | --- |
| **Original Ash & Aether game** | Authenticated Site version 45 preserved under `live-site/`, labeled 5.42 · Surface and shadow | Latest deployed version has not been matched to the export |
| **Living World Atlas v8** | Recovered standalone runnable lab and test/receipt package | Not proven merged into current live game |
| **Living Armory v3** | Recovered independent inventory/loot research archive | Not published here as an integrated player feature |
| **Acoustic World v4** | Recovered cue/quest/audio prototype | Not the same as in-game orchestral deployment |
| **Spatial Authoring 5.32** | Prototype for landmarks, mechanisms, state change and 3D authored spaces | Not the canonical Site code |
| **Environment 5.37** | Recovery/integration passes and offline QA archives | No evidence of live deployment from this repo |
| **Hydrophone** | Separate music code and adaptive-score development | Its merge does not imply acoustic-world integration |

## Repository goals

1. **Show the game now:** publish a readable, fast public landing page with working destination links and a standalone playable lab.
2. **Protect provenance:** distinguish original Site features, exported research code and demonstrated standalone builds.
3. **Compare with production:** identify the current deployed version and compare its source with the v45 snapshot, including save schemas and module interfaces.
4. **Integrate in slices:** merge world/environment, inventory/loot, acoustics and spatial authoring independently with regression, playability and performance checks.
5. **Ship device-tested builds:** check desktop and touch controls, performance, narration/audio opt-outs, save export/import, and all chapter transitions.
6. **Replace illustration with evidence:** add capture-verified screenshots/video from the current game, with image descriptions and release labeling, rather than marketing renders passed off as actual gameplay.

## Known game usability priorities

- Stronger environmental artistry (grass, floors, backgrounds, fewer empty voids)
- Recognizable encounter feedback and visible effects rather than status text alone
- Clearer character and equipment imagery and meaningful loot progression
- Smoother movement, camera zoom persistence and usable touch controls
- A richer, adaptive soundscape with control over music and effects
- Denser reasons to explore, revisit, fight and recover

## GitHub Pages

The deploy workflow publishes the repository root. To enable it in a new repository, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**. A Pages failure should not be reported as a working public URL. The repository and the external game are separate publication surfaces.

## Actual visual captures and live-source status (November 5)

The README and GitHub Pages hero now show a recovered playable Vista capture; a three-image gallery identifies the provenance of Vista, meadow and Armory frames. These captures document the recovered prototypes. The authenticated version 45 export and its later local browser validation are documented separately. See [Live-source integration](LIVE_SOURCE_INTEGRATION.md).
