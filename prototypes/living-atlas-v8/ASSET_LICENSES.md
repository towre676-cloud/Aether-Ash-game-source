# Code and artwork provenance

- This package contains first-party original JavaScript world-model code and procedurally assembled 3D geometries, with no appropriated game sprites, characters, SNES data or music.
- Three.js is loaded at runtime from `https://cdn.jsdelivr.net/npm/three@0.180.0/` (its official package as distributed by jsDelivr), with `OrbitControls` from the corresponding examples directory. **Three.js copyright 2010–2026 Three.js authors; MIT license.** See the official repository: https://github.com/mrdoob/three.js/blob/master/LICENSE .
- Fonts use platform defaults (Georgia/system UI). WebAudio uses procedural oscillators and deterministic generated noise, not copied compositions.
- No generated character meshes, sampled material libraries, purchased models, speech recordings, voiceovers or copyrighted game source code are included. Production art and audio require their own provenance/licensing audit.

- `src/grass/*` and `src/ground/*` were reconciled from the user's previously created Ash & Aether Living Grass v2 and Ground Forge v1 packages, preserving their original code and internal documentation. Their integration is original project work; do not describe this package as an external third-party asset library or as shipping on the current live site.
- The package includes the previously produced `ground-material-atlas.png` under `reference/` for quality inspection; it is not a photographed environment or deployed game screenshot.

## Acoustic World v1 integration, 2026-10-29

All 132 bundled Ogg audio files were recovered from the user's separate Acoustic World A&A work package, `AA_Acoustic_World_v1.zip`, whose README documents original procedural synthesis using its included `generate_audio.py`. These are prototype recordings, not commercial licensed third-party tracks. They do not replace the user's original Hydrophone music or dialogue. For provenance, the original sound library source, tests, 132 audio files and manifest are retained under `src/acoustic/`; see `RECONCILIATION_AND_DEPLOYMENT_V5.md`. Seven separate Runway assets described in that external package are not included here.
