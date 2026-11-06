# A&A Living Grass — Integration Handoff (v2.0)

## Project being targeted

- Connected Library site: **Ash & Aether Clay and Water**
- Site project ID: `appgprj_6adf63724e5c8191bd55637b8ecd8d9a`
- Live URL: `https://ash-aether-clay-water.towre676.chatgpt.site/`
- Site status in Library: active, project source version 19, editor access to the Library projection.
- Access blocker from this session: published Site GET returned HTTP 401 and the Library exposes only a 642-byte text projection, not JS/TS sources. None of the installed app tools exposes a ChatGPT Sites source-edit action. **Do not report integration into the live Site until authenticated source editing and deployment have actually succeeded.**

## Merge rules for other A&A sessions

- Do not replace game entry points, protagonist scripts, combat scene, inventory, map files or story assets with this demo.
- Add the modules in a unique namespace such as `src/world/vegetation/` and implement one integration adapter.
- Pick one rendering mode for the actual engine: Three.js world layer, or Canvas2D environment pass. In either case the game authoritative map and collision callbacks own terrain height, path masks, obstacles, indoor/offscreen gating and hero occlusion.
- The authoritative save engine owns serialized vegetation state, keyed by world seed and timeline; it also owns rewards from `harvest`.
- Ensure battle fire/bending and NPC movement originate from actual gameplay events and keep cover values synchronized with drawn foliage.
- On mobile, start at `low`, measure frame time, patch rebuild time, memory usage and battery load; scale from real performance measurements.
- A new world/timeline should not silently erase another session's content or a player's saved progress.

## What is done vs still required

| Feature | Package | Deployed A&A |
|---|---|---|
| 16 botanical species geometries | implemented/tested structurally | not verified |
| 15 ecology profiles, terrain patches | implemented/tested | not verified |
| Wind, bends, footsteps | authored/structurally tested | not verified |
| Harvesting, fire, water, regrowth, save/reload | implemented/tested in pure JS | not integrated with game save |
| 2D / WebGL rendering routes | source present | no live renderer QA |
| Offline interactive preview | implemented/tested in simulated Canvas environment | independent demo |
| Mobile 30/60 fps | not benchmarked | not verified |

Acceptance must include visual first-glance quality, no identical rows or rectangular growth patches, clean path/water/indoor boundaries, and actual gameplay consequences after save/reload.
