# Ash & Aether Living Atlas — Reconciled v5

**The portable integration laboratory, not the live production game.** It combines a deterministic nine-region simulated RPG, 48 material types, 16 plant families and a 132-recording acoustic system.

## Start on Windows

Extract the archive, enter `aa-living-world-v5`, double-click `RUN_WINDOWS.bat`, then visit `http://localhost:8000` in Microsoft Edge. Internet is required for the pinned Three.js import-map dependency; all audio recordings are bundled locally. Use the **Enable world audio** button before expecting recorded sounds. Use **Sound Hydrophone** and then **Listen for echoes** to see the relationship between accepted gameplay actions and authored listening signals.

## Recovered source and integrity

- `src/grass-v3/`: grass and terrain bridge v3, renderer, tests and fallback.
- `src/ground/`: Ground Forge v1, actual material physics and procedural texture maps.
- `src/acoustic/`: 132 local Ogg assets, audio manager, original synthesizer pack metadata and tests.
- `src/perception.mjs`: read-only, host-state-grounded acoustic and vegetation compatibility.
- `src/adventure.mjs`: adds a backward-compatible, namespaced audio-knowledge save property.
- `production/`: separate fail-closed, additive staging modules for the existing live Site, not a magic merge/publish function.
- `RECONCILIATION_AND_DEPLOYMENT_V5.md`: tested components, provenance and actual live-source merge gates.

This release intentionally does not replace the legacy three.js grass renderer with a second competing simulation instance and does not overwrite any current game source. For browser QA, compare image quality, clipping, object-level art direction and FPS on target Edge and Android devices; those were not certified here.
