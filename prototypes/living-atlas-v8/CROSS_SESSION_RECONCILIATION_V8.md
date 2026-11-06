# Cross-session reconciliation — 29 October 2026

This atlas preserves the real gameplay ownership boundary while integrating the latest tested vegetation version and spatial monster gameplay. Newer parallel assets discovered in the user's Library:

| Parallel line | Source checked | Atlas v8 treatment | Production prerequisites |
|---|---|---|---|
| Grass v5 | `ash-aether-living-grass-v5-visual-integration.zip`, 50 tests | Copied real source and activated in `src/view.mjs`, automatic v4 fallback | Real WebGL shader and mobile occlusion QA |
| Acoustic v4 | `AA_Acoustic_World_v4.zip`, 512 audio cues | Inspected; not silently wired into canonical combat | Event bus + active boss timing + caption parity + audio transport |
| Armory v2 | `Ash_Aether_Living_Armory_v2_Complete.zip` | Inspected; no duplicate inventory/loot engine imported | True canonical equipment ID and once-only rewards |
| Ground Forge | Previous 48-material project | Already active; real surface attack/defense | No duplicate ground planes or collision |
| Wildlife v7 | Atlas v7 | Authoritative spatial targets, approach, observation, melee, retire/recovery layered on top | Host actor registry + own map/party coordinates |

**Status:** Source reconciliation is performed locally. No claim of a live Site merge, confirmed browser FPS, or verified production 5.x save compatibility is implied by these notes.
