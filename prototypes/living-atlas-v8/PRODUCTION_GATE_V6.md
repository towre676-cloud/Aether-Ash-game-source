# Production integration gate — do not overwrite the live Site

Project: `appgprj_6adf63724e5c8191bd55637b8ecd8d9a`, `ash-aether-clay-water`. Site library projection: source version 21 (not an inspected source revision). Other session's **reported** game build 5.18 must be verified from real source before merging.

**Not done:** authenticated Site edit/source read; direct source modification; production tests; actual site release or GPU validation.

**Ready for source-owning session:**

1. Export the actual current Site source and establish the exact Git/deployment/source fingerprint. Backup all source and save migration code.
2. Use the existing `production/PRODUCTION_MERGE_TOOL.py` in dry-run mode only on the actual source copy. Check case-sensitive file collisions and authored entrypoints. The existing installer stages additive older modules; v6 modules need explicit wiring and are not automatically registered.
3. Adopt *one* physical vegetation authority. Grass v4 GPU may render host-provided `growthAt`, `substrateAt`, `biomeMixAt`, `seasonAt`, while the game's canonical surface system owns each state transition. Never install v4's second state machine on top of the real game's own plant state by default.
4. Merge v2's audio catalog and optional score with a single audio focus bus. Accept user-gesture unlock. Duck the original synth or voice/music, preserve subtitle parity. Do not play voice assets that have not been locally licensed and verified.
5. Bind survey sources ONLY to accepted, map-placed Hydrophone events; in the prototype `atlas.ledger` is the sole source. Keep quest completions, rewards, doors and loot with the true game engine.
6. Preserve v3 save migration of `acousticSurveyV2` as an **optional** namespaced extension, and write real-game migrations only against the live schema. Check old saves, NG+, all characters, combat, interior shapes, bridge traversal and guided-run behavior.
7. Test production's own >1000 tests (reported by another session, NOT run here), then Edge desktop and Android mobile rendering, visual screenshots, FPS and console; verify rollback before publishing to the same project.

Do not promote the 213 prototype tests to a claim of compatibility with the live game or that production 5.18 has passed anything.
