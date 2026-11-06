# Ash & Aether — Living Atlas v6 | Cross-Session Reconciliation

**Local, integration-ready prototype. NOT published to the private live A&A Site.**

This build advances the v5 laboratory with the **actual source** from the independent Living Grass v4 and Acoustic World v2 development sessions. The host simulation remains the sole source of truth for quests, enemies, inventory, map geometry, and story events. The source contains 9 regional numerical worlds, 48 material profiles, 16 grass families, 15 habitat profiles, 54 creature archetypes, and the original 10-quest deterministic campaign.

## Run

Windows 11: extract and double-click `RUN_WINDOWS.bat`, open http://localhost:8000 in Microsoft Edge. The 3D frontend uses the pinned Three.js 0.180.0 CDN import, so internet access is required. Enable audio using the UI's **Enable world audio** button. For the v4 foliage research fallback, `OFFLINE_ECOTONE_PREVIEW.html` works without a CDN and can be opened directly in an ordinary browser.

## New in v6

- `src/grass-v4/`: complete latest Living Grass ecotone and quality-governor implementation, with its original tests, manifest and comparison previews. The main Atlas 3D frontend **now imports v4 grass-renderer** instead of v2. Its world-owned moisture, Ground Forge substrate, trampled-plant state and seasonal timing drive vegetation. The GPU allocation governor changes *only* plant quality, never collision/encounter gameplay.
- `src/world-ecotones-v6.mjs`: maps existing terrain/moisture/river/canonical material fields to a deterministic weighted ecotone. No new or phantom map regions; sealed structures stay excluded.
- `src/acoustic/`: the runtime sound library is upgraded to the **244 original locally bundled Ogg** assets from Acoustic World v2, including the 24 synchronized 16-second score stems, 48 spot recordings, 24 material interactions, and 16 hazard cues. The recovered full source and original tests also remain in `src/acoustic-v2/` for provenance.
- `src/acoustic-survey-v6.mjs`: deterministic two-position acoustic triangulation of **accepted Hydrophone events from the game ledger only**. The survey cannot create items, doors or quest flags. It is persistent in an optional namespaced v3-save field, so older Atlas v3 saves remain readable. Historical source IDs are scoped to the epoch; after NG+ old sound markers do not appear as new present-day signals.
- Optional **Adaptive music** button uses the v2 score engine, controlling four music stems according to actual region, danger, story progress and discoveries. The original Hydrophone synth is gently ducked when stems play. Web Audio only starts after a real user gesture.
- Corrected an underlying event-ledger bug: developer/UI event fields could previously overwrite the authoritative stored event type, leaving accepted Hydrophone events invisible to future mechanics. Canonical ledger fields are now authoritative. Older saves with `kind: HYDROPHONE_PLAYED` remain recognized.
- New tests explicitly cover event provenance, save migration, two-bearing scans, no forged rewards, host-owned biomes, NG+ scope, audio scoring and deterministic materials.

## Verify

```bash
node --test tests/*.test.mjs src/ground/tests/*.test.mjs src/grass/*.test.mjs src/grass-v3/*.test.mjs src/grass-v4/*.test.mjs src/acoustic/tests/*.js src/acoustic-v2/tests/*.js
node scripts/replay.mjs
node scripts/benchmark.mjs
python src/acoustic-v2/qa_v2.py
```

Result from this build: **213/213 Node tests passing**, 10/10 campaign replay, 244/244 Ogg probe passing, numerical benchmark completed. The new file `V6_VERIFICATION.json` records the exact scope of these checks.

## Important limitations

- Private site `appgprj_6adf63724e5c8191bd55637b8ecd8d9a` was most recently observed via Library metadata at **source version 21**, but its editable source is unavailable through the currently attached tools. The browser profile is signed into `google.com` only, NOT confirmed as signed into the private game Site. The original published A&A game was **not changed**.
- The linked GitHub account exposes no Ash & Aether repository. Do not deploy this laboratory HTML over the current live game.
- Browser/real GPU test could not be completed in this runtime: both local file and localhost navigation return `ERR_BLOCKED_BY_ADMINISTRATOR`, and the Three.js CDN cannot resolve. Therefore no claims are made about WebGL compilation, Android/Edge FPS, occlusion, character rigging, indoor camera or 5.18 production regressions.
- The source from the live A&A Site, its current save schema, graphics pipeline and real combat/event bus are required before doing a production additive merge. The existing `production/` installer is **staging only**, not an automatic production integration or deployment process.
