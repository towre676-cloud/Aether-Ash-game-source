# Cross-session source audit — 5.26 preparation

**Audited:** 2026-10-29, against source commit `d88e0bec24d39793d57a95bcfe722a04b82e4932` (5.25). This audit changed no runtime files and performed no publication. **No newer Living Grass or Vista delivery requiring another merge was found.** Earlier session statements that their packages were not live describe the original handoff, before the later campaign integrations.

## Delivered sources and provenance

| Delivery | Exact identity | Created / modified (UTC) | Bytes | Archive SHA-256 |
| --- | --- | --- | ---: | --- |
| `ash-aether-living-grass-v6-three-integration.zip` | Library `libfile_452a9163f6d88191bc42ae6dd249e9db`; file `file_0000000043e081f5a4735df732fae3b6`; canonical path `/ash-aether-living-grass-v6-three-integration.zip`; returned version `null` | 2026-10-29 15:30:07.328720 | 150,278 | `ad0b7d78cd1e26ed5b5c51e0c085433c765c46f1c138a8d7f43c5740cd51a3d5` |
| `Ash_Aether_Vista_Presentation_Upgrade_v1.zip` | Library `libfile_90541d3406b48191940d76c7823d4e22`; file `file_000000002cec81f5964cfc6458e048f8`; canonical path `/Ash_Aether_Vista_Presentation_Upgrade_v1.zip`; returned version `null` | 2026-10-29 18:52:43.350281 | 716,950 | `2a40fe23208e004af5fd5e86c72f95024f2e58fa3159a28af409a02f89df098d` |

Both available archives were hashed again. Grass provenance is already recorded in [recovered-packages-5.21.json](recovered-packages-5.21.json); Vista's complete extracted source and notice are retained in [sources/vista-presentation-v1](sources/vista-presentation-v1/README.md), with [RECOVERY.json](sources/vista-presentation-v1/RECOVERY.json). The Grass archive's 15:30 Library timestamp is distinct from the earlier session's approximate 15:29 delivery statement.

A current recursive Library inventory filtered to modifications after 18:52:44 UTC returned only Vista's companion HTML/screenshots and the updated Site projection, with no continuation cursor or warnings. It contained no newer source archive. The companion `vista-showcase.html` remains version `1`, 17,844 bytes, identity `libfile_39bbf0f887f8819185d43543e8dcdabb`.

## Living Grass v6: already integrated since 5.21

All nine current modules in `dist/game/engine2/addons/living-grass-v6/` exactly match their file hashes in **both** [frozen-delivery-5.21.json](frozen-delivery-5.21.json) and [frozen-delivery-5.25.json](frozen-delivery-5.25.json).

Comparing directly with the delivered ZIP, eight modules are identical after removing the host's import `?v=` cache tags. The sole functional adaptation is in `canvas-grass-fallback.mjs`: `draw` accepts an optional host `time`, which replaces local accumulated time when finite. This synchronizes cached chunks with the host animation clock. It was already present in 5.21. The package's bridge/save protocol remains version **4** inside delivery **v6**; that constant does not indicate an older package.

Live hooks are concrete:

- [living-atlas.js](../../dist/game/engine2/living-atlas.js) creates the recovered `createAAGameVegetationBridge` in `renderMode:'canvas'`, with one tile mapped to one simulation metre. Accepted movement produces footsteps; accepted fire/water casts change vegetation at actual target positions; scene release, save, restore, rest and same-journey transitions retain bounded state under `livingAtlasV1`.
- [living-atlas-layout.js](../../dist/game/engine2/living-atlas-layout.js) supplies canonical Ground Forge material facts, numerical moisture/fire/biomass, real floor/road/door/building exclusions and actual placed-tree canopy samples. It does not import the laboratory's terrain or collision.
- [living-atlas-art.js](../../dist/game/engine2/living-atlas-art.js), called by `renderer.js` before actors, draws the recovered Canvas fallback with a 48-chunk cap and at most two bakes per frame. Standard and Compatibility select medium/low visual detail without changing saved simulation.
- `main.js` installs the adapter and dispatches accepted battle events. `field-patrols.js` uses its concealment multiplier; `field-encounters.js` uses its ecological pace. New and restored battles receive the same Atlas interface. Host combat, inventory and reward transactions retain ownership.

The existing [5.21 integration report](../../docs/verification/living-atlas-v8-grass-v6-5.21.md) documents these boundaries. The recovered `TEST_LOG_V6.tap` records **57/57** source tests at packaging. The retained 5.25 release receipt records **16/16** host Living Atlas tests within **1,382 passing cases across 178 modules**. Those are existing receipts, not new tests run by this audit.

## Vista v1: already adapted in 5.25

The shipped core and retained original source both hash to `c7ef57696b573f6e214465c220ab16ed0543ce76fbc02a31e9f04ddc016cd0db`. The live `vista-scene.js` reuses landmark composition and quality guidance over actual floor masks and authored foci; `vista-combat-feedback.js` uses original descriptors for bounded effects from confirmed events. The existing camera chain remains authoritative, with the 5.25 bounded exploration lead and damping integration. See [reconciliation-5.25.md](reconciliation-5.25.md) for the verified behavior, reference-footage limits and browser evidence.

## Remaining scope, rather than missing deliveries

Grass's GPU terrain-normal fitting, camera-facing far-field culling, Three.js draw diagnostics and GPU atmosphere controls are present in the recovered code, but inactive in the Canvas campaign. The host instead uses flat floor coordinates, view-bounded chunks and its existing camera. The illustrative Three.js terrain, avatar, river and buildings are not campaign content. No GPU shader compilation, mobile GPU timing or equivalent full Three.js conversion is claimed.

Grass's generic harvest API is not wired to a new campaign harvesting economy; saved vegetation reward receipts are intentionally empty in the current host contract. Adding harvesting would require a separately designed authoritative interaction and reward transaction. Weather remains the existing fixed host sampling, and optional automatic foliage quality is not enabled. Neither is evidence of a missing later package.

Vista's standalone showcase and Three.js bridge remain development references. No additional runtime integration is warranted solely to reconcile these two deliveries. Any subsequent 5.26 interaction changes should preserve critical interaction priority, guide destination behavior and the campaign's existing reward receipts.
