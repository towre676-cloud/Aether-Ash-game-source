# Recovered Aether & Ash prototype source

This directory preserves **596 recovered UTF-8 source, documentation, test, and receipt files** from nine archival workstreams. It does not replace the current game deployed as a ChatGPT Site.

| Directory | Text files imported | Scope |
| --- | ---: | --- |
| `living-atlas-v8/` | 229 | Spatial encounter simulation, ecological world model, Three.js viewer source, tests and production staging contracts |
| `environment-5.37/` | 89 | Visual environment upgrade, standalone preview source and host adapters |
| `spatial-authoring-5.32/` | 58 | Scene grammar, boss, economy, dungeon and spatial 3D source and tests |
| `living-armory-v3/` | 27 | Inventory, loot, save schema, HTML playable prototype and integration notes |
| `acoustic-world-v4/` | 45 | Adaptive audio/guard mechanics, cue manifest and audio synthesis tools |
| `vista-v1/` | 6 | Vista presentation and Three.js adapter |
| `grass-v6/` | 34 | Grass and ecology reconciliation |
| `ground-merge-2026-10-29/` | 57 | Ground and environment integration study |
| `site-ready-merge-2026-10-29/` | 51 | Proposed site-ready integration work |
| **Total** | **596** | |

## Source boundaries

Original archives also contain binary audio, images, and other assets. These were not included in the UTF-8-only import and are preserved in the source archive collection. Some demo HTML files include embedded imagery or procedural graphics; external images/audio may be missing if they were separate archive members.

**Do not wire all these prototypes into one production entry point.** They are successive, overlapping, sometimes divergent workstreams. Production needs a verified export of the current editable Site source and a comparison of host engine, game state, save schemas, audio bus, inventory authority, world coordinates, and authored terrain. In particular, standalone v8 and v5.37 explicitly warn against replacing the canonical game.

## Run locally

The Atlas v8 archive's `index.html` loads Three.js 0.180 from a CDN and requires a local server, network, and WebGL. Start a server from `prototypes/living-atlas-v8/`:

```bash
python -m http.server 8000
```

Open `http://localhost:8000/` for the Three.js prototype. Its `ENCOUNTER_QA_V8.html` offers an offline Canvas2D encounter lab using the same numerical engine. The environment 5.37 `preview/standalone-environment-5.37.html` and armory `armory-playable.html` are separate experiments.

The root [Living World lab](../labs/living-world.html) remains a self-contained public demo.

## Verification and release discipline

Preserve all test receipts as historical evidence. Re-run tests from the corresponding prototype directory and capture current tool versions before claiming a newly validated release. Prototype browser functionality does not establish performance or integration in the live campaign.

**Licensing:** The recovered Atlas source documents Three.js as MIT and identifies its procedural art/audio. Redistribution of bundled binary artwork and audio requires a separate provenance review. No blanket open-source license has been granted for this repository.
