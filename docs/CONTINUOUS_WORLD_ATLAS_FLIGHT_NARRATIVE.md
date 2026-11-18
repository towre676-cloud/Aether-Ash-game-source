# Continuous World, Air Mobility and Diegetic Narrative — Implementation Contract

Status: design specification, not a claim of runtime integration. Baseline: audit live Site independently; GitHub main may be stale.

## Non-negotiable invariants
1. Exactly one canonical world-space coordinate frame (meters, x east, z north, y elevation). Every region, settlement, portal, encounter, river and destination has stable IDs and a world-space footprint.
2. The traversable ground graph connects all accessible settlements; unreachable nodes must be explicitly gated by physical conditions and tested, never silently disconnected.
3. Each entrance/exit is a spatial seam: adjacent coordinates, matching elevation and facing, reversible path, persistence of party/vehicle/time/weather, and prefetch before crossing.
4. The same terrain, landmark coordinates and settlement silhouettes support ground camera, vehicle camera, map and airborne camera. No fake aerial map.
5. Plot structure stays in internal state, never exposed as Acts/Chapters in player UI. Save compatibility retained.
6. No flight physics added to the hot frame loop until profiling shows sufficient CPU/GPU headroom.

## Geographic registry
Create data/world/atlas.json (or adapt the existing canonical data source, do not duplicate). Schema:
- region {id, name, polygon, biome, terrainTileIds, waterBasinIds, climate, elevationRange, settlementIds, landmarkIds, encounterZones}
- settlement {id, regionId, position, footprint, gateIds, docks, airfieldIds, economyLinks, npcSchedules}
- connection {id, fromNodeId, toNodeId, geometryPolyline, mode:[walk,ride,drive,boat,fly], surface, slope, width, grade, hazards, traversalCondition, streamingBudget}
- entry {id, fromRegion, toRegion, position, heading, navmeshPortal, triggerVolume, reciprocalEntryId}
- airspace {id, polygon, floor, ceiling, obstacles, noFlyReason, landingPads, weatherRisk}
- storyAnchor {id, worldEntityId, eventConditions, consequenceIds}; never chapter-number-dependent in player UI.

First extract all existing IDs and names from the current live game, legacy export, 60 campaign + 60 frontier maps, 127 regions and 635 interaction stations; reconcile duplicates by stable alias mapping. These historical counts are targets to verify, not proof of present live integration.

## Build stages
P0: Inventory existing live and GitHub data, map every existing region and entrance, measure frame-time and memory. Generate missing/duplicate/unreachable report.
P1: Establish atlas registry, coordinate conversions, world graph, terrain tiles and geographic invariants. Preserve existing saves through ID aliases.
P2: Roads/trails, mountain passes, bridges, fords, gates, river navigability, paths to farms/mines/hunting grounds and NPC freight routes. Every populated location must have plausible provisioning access.
P3: Seamless streaming with terrain LOD, occlusion, instancing, async prefetch and strict budgets; no synchronous terrain generation in frame loop. Target 16.67ms/frame for 60fps, track p50/p95/p99 and 1% lows, test mobile and desktop separately.
P4: Vehicle navigation and landing architecture: steering, acceleration, braking, suspension/hover, collision, route preview, boarding, parking, persistent vehicle ownership, interior/exterior transitions. Aerial craft use the same world-space frame with altitude and airspace validation; flight model may be arcade-first but must obey speed, inertia and collision constraints.
P5: Narrative presentation: internal chapter/act markers mapped to continuous event predicates; remove chapter headers, act selectors, debug panels, developer route labels and raw quest IDs from player-facing UI. Keep optional player journal organized by people, places, discoveries and unresolved threats. Keep developer tooling gated to authenticated development builds.
P6: Automated atlas QA and visual traversal tests, then gated release.

## Runtime architecture
- Atlas compiler validates JSON schema, ID uniqueness, reciprocal portals, graph connectivity and spatial overlap.
- Spatial streaming manager chooses terrain/props/actors by camera position and velocity, uses hysteresis and prefetch, never creates all NPCs/wildlife simultaneously.
- Navigation graph has hierarchical routing (inter-region coarse graph; local navmesh/road spline), with different capabilities for foot/vehicle/air.
- Story director observes world events, faction changes, time and player discoveries; chapters remain migration metadata only. Avoid player-visible chapter counters.
- Developer shell lives behind separate build flag and authentication, not merely CSS hidden. Production bundles must not expose admin controls or secrets.

## Acceptance gates
- 100% of discovered settlement/region IDs reconciled into atlas with explicit status; no silent deletions.
- Every intended reachable town has a validated path from the starting settlement, and every traversable border has reciprocal entry with no teleport discontinuity.
- No quest auto-route sends a character through inaccessible geometry; route cancellation/replan tested.
- Ground/air positions agree within defined map projection tolerance; landing at a town returns to its correct gate/landing pad.
- World state and equipment survive save/reload, vehicle boarding, region transition, flight and combat.
- No act/chapter/developer labels visible in production UI, including notifications, menus, save slots and URL routes.
- 60fps target evaluated with p95 <= 16.67ms in defined representative scenes; report failures instead of claiming universal 60fps.
- Release only after smoke tests for low-end mobile, desktop, transition stress and long-session memory.

## Scope control
Do not destroy the older chapter logic until migration parity tests pass. Do not replace terrain with blank proxy tiles in release. Do not claim world connectivity or aerial gameplay from a successful atlas schema alone. Deploy through current live Site pipeline only after confirming its authoritative source and release mechanism.
