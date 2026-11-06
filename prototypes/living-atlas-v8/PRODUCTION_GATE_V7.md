# Production integration gate — Living Atlas v7

**Not published.** The library's A&A Site project is `appgprj_6adf63724e5c8191bd55637b8ecd8d9a`. The file record is not the editable source. Browser authentication in this session was not confirmed, and this package is only a local simulation/Three.js prototype.

## Non-destructive integration requirements

1. Export the *current* site's entire editable source, take a backup and hash the actual deployment contents. Compare with the version-21 Library projection metadata rather than assuming that is the live source revision.
2. Run `production/PRODUCTION_MERGE_TOOL.py` **on a copy** and review the staged diff. Do not run the older merging script as a live migration automatically. Merge in v7 modules explicitly. The existing A&A event bus, real character data and quest planner remain authoritative.
3. Introduce the `wildlifeV7` and `fieldGuideV7` save extensions through the actual production save validator and migration pipeline. Test saves before and after New Game Plus, other characters, alternate timelines and 5.x rollback. `AtlasWorld.restore` validates only the standalone schema; it is not a verified production migration.
4. Tie visible resident IDs to real challenge and collision locations. The prototype retains a developer-friendly "challenge selected habitat" action and must not be mistaken for the finished production encounter loop.
5. Verify fauna origins, bridges, slopes, mesh feet and body orientations by hand on real devices. Geometry remains procedural placeholder art. Build LOD and animation instancing for final assets.
6. Protect mobile performance: creature route waypoints are cached by segment/world day/world event count; visual LOD is independent of population physics. Measure animation allocation, GPU draw calls, frame-time spikes and thermal throttling in Edge and Android.
7. Test the existing production campaign, guided movement, boss progression, audio mixing, speech/voice interruption, interiors, shadows, New Game Plus and all production tests before publishing. Do not claim the 227 standalone tests establish production compatibility.

## Gameplay invariants

- Render, audio and material lookup are observations; only accepted gameplay commands mutate state.
- No invented quest rewards from creature tracking; no automatic NPC/animal conversations.
- Every population belongs to exactly one authored species and region; population counts are bounded and nonnegative.
- Existing saves lacking v7 fields remain readable; invalid census/notes reject before the world becomes live.
- A player's ecological impact is measurable. Footsteps alter short-range alert, combat reduces a cohort on victory, and daily growth responds to existing terrain conditions.
