# World Renaissance — Production Architecture and Visual/Vehicle Specification
Status: design + acceptance contract. No claim of implemented engine, map or assets. Companion to CONTINUOUS_WORLD_ATLAS_FLIGHT_NARRATIVE.md.

## Experience target
Ground vehicles: responsive readable arcade handling in the spirit of PUBG Mobile and Forza Horizon; landscape continuity and LOD in the spirit of flight simulators; rich settlement and roadside life in the spirit of historical open-world games. References are benchmarks, not licensed assets or drop-in code. World is one coherent topology, no disconnected chapter islands.

## Art bible: premium rendering under measured budgets
- Camera: third-person 65–80 degree ground FOV; adaptive chase camera, speed lookahead, horizon lock with gentle damping; flight chase/cockpit, orbit and map views.
- World materials: authored physically based albedo/roughness/metallic/normal; terrain blends by slope, altitude, moisture and path wear; macro color variation, decals for ruts, puddles, hoof prints, ash, moss, wet stone.
- Terrain: clipmap/quadtree mesh LOD, continuous normal transitions, geomorphing, floating-origin or origin rebasing for long journeys. Distinct mountain silhouettes and river drainage. Avoid repeating identical trees and blocky ground.
- Water: shared river network with actual gradient, flow direction, banks, fords, bridges, fishing pools and settlement intake. Water shader uses physically plausible Fresnel, depth attenuation, foam and flow; scalable mobile fallback.
- Vegetation: biome-specific procedural placement with deterministic seeds; species mix, age classes, wind animation, density masks, undergrowth, fallen trees, cut stumps, orchards and farm boundaries. GPU instancing and impostors.
- Structures: modular kit of foundations, roofs, walls, doors, chimneys, drains, wells, kilns, docks, stables, markets and cairns; local material dialects and distinct silhouettes; interiors and exteriors share consistent doors.
- Lighting: stable time of day, atmospheric perspective, weather and cloud shadows; baked/static lighting where appropriate, limited dynamic shadows by importance; tone map without excessive bloom.
- Characters and traffic: tiered animation/AI updates by distance, grounded equipment silhouettes, correct scale against doors/vehicles and roads; no white proxy figures.
- Art quality gates: near/mid/far screenshots for each biome and settlement; road-level and aerial viewpoints; silhouette/material consistency; no obvious pop-in, repetition or floating props at normal travel speeds.

## Geographic content — no empty corridors
Every route segment is assigned a region-specific ecology and activity budget, with deterministic encounter seeds and authored landmark anchors.
Roadside composition per representative 1 km (design targets, tune by density): 1–3 recognizable landmark moments, 2–6 micro-sites (farm, quarry, camp, cairn, ford, shrine, ruin, mill, hunting blind), 1–4 moving traffic encounters, 3+ gatherable/huntable opportunities and 1 systemic choice or threat. These are not all unique models or simultaneous NPCs.
- Villages: provisioned by surrounding fields, pasture, woodland, water, kitchens, markets and delivery routes.
- Wilderness: coherent food webs, habitats, mineral seams, hunting and predator territories; visible ecological transitions.
- Conflict: patrols, bandits, wildlife, damaged bridges, supply disruption, weather, faction checkpoints; spatially grounded, not random popup text.
- Trails: widths, slopes, material, drainage, roadside objects, traversability classes and signage reflect use. Add footpaths, cart roads, maintained trade routes, ridges, tunnels, bridges, ferries and seasonal passes.
- Traffic runs on schedules and carries real goods. Players can escort, raid, trade, repair or deliver. Economy state influences frequency and security.
- Cairns: navigation, burial, boundary, hydrology, pilgrimage and hidden caches; each instance has an actual game purpose.

## Vehicle families and geometry
1. Handcart/pack animal: low speed, capacity, physical cargo and narrow trails.
2. Horse/wagon: traction, turn radius, suspension and weight-dependent acceleration; road and bridge compatibility.
3. Motor/arcane utility rover: PUBG-like approachable acceleration, steering assistance, drift control, tire/surface grip, speed-sensitive steering, recoverability and damage.
4. Skimmer/hover craft: lift and terrain following, lateral drift, obstacle and water interactions.
5. Flying craft: distinct silhouettes and readable landing gear, cockpit, wings/rotors or fictional lift mechanism, thrusters, control surfaces, shadow and wake; avoid one-size-fits-all craft.
Vehicles must have believable seats, occupant animations, load volume and collision dimensions. Model visual and collision representations separately; never allow art silhouette to conceal wildly different hitbox.

## Vehicle physics and flight
- Fixed simulation timestep (60 Hz preferred, bounded catch-up), render interpolation and time-independent inputs. Never tie physics to render FPS.
- Ground: throttle, brake, steer, yaw inertia, traction curve by surface, spring-damper suspension or stable simplified model, wheel contact, speed-sensitive camera and collision sweeps.
- Flight: throttle/thrust, pitch/roll/yaw, lift and drag or hover control by vehicle type, altitude-dependent handling, wind gusts, banking turn coordination, stall/overspeed only where appropriate to craft fantasy, obstacle avoidance assistance and configurable stabilization.
- Inputs: keyboard/mouse, controller and mobile touch; responsive one-handed options, remappable bindings, accessibility assists.
- Autopilot: road graph path-following and aerial waypoint following; visible route preview, cancellation, recovery, no routing through unbuilt terrain. Manual control always available.
- Landing: pads/fields/clearings with slope, clearance, approach corridor and ground-state handoff; no teleport on disembark.
- Camera: critically damped chase, collision-aware boom, lookahead, speed FOV changes with comfort caps, optional motion-reduction mode.
- Multiplayer networking is not assumed; do not incur networking complexity without a requirement.

## Flight-world integration
Use the same geographic atlas, height field, settlement coordinates and rivers as walking. Flight streams a wider low-detail horizon and prioritizes near-aircraft obstacles and landing zones. Ground-to-air transition maintains absolute location and weather. Air routes do not replace physical trails.
World map uses projected geographic coordinates and elevation shading; road/river/path layers and discovered landmarks; optional route overlays. No invented geographic relationships before live atlas reconciliation.

## Performance architecture
60fps aspirational target: <=16.67ms per frame. Measure p50/p95/p99 CPU main thread, GPU, draw calls, triangles, texture residency, JS heap, GC pauses and streaming stalls.
Indicative budgets, to calibrate by target hardware: input+simulation 2.5ms, AI 1.5ms, render submission 3ms, GPU 8ms, UI 1ms; remaining margin for jitter. Parallel CPU/GPU times cannot simply be summed as a single pipeline, so report both.
- Frustum/occlusion culling, hierarchical LOD, instancing, texture compression and mip streaming, bounded shadow casters, pooled objects, asynchronous region load, no per-frame full-world loops.
- Prioritize active radius and velocity-based lookahead; vehicle and flight speeds expand streaming horizon. Degrade distant vegetation and shadows before reducing physics quality.
- Persistent tiny red FPS meter with frame-time graph available in dev diagnostics; player can disable meter if desired.
- Hard stop: if current build remains at 0–5 FPS, restore a performant baseline before enabling world-scale effects. Profile on actual low/mid mobile and desktop hardware, not just an empty scene.
- Acceptance: 30-minute traverse with town/road/flight transitions, no unbounded heap growth or long stalls, p95 frame time <=16.67ms on declared 60fps target device profiles. Failures documented honestly.

## Narrative and production boundary
Quest progression uses world events, discoveries, threats, people and faction changes. Internal acts/chapters may remain as migration metadata; player sees journal, rumors, geographic clues, conversations, not chapter selectors or developer labels. Admin controls must be excluded or securely gated in production build, not CSS hidden.

## Delivery order
A. Inspect authoritative live Site and source; baseline performance, region IDs and existing vehicle implementation.
B. Build atlas compiler, graph connectivity tests, region adjacency and route content density audit.
C. One vertical slice: Lowbank -> nearby wilderness -> second verified town, with convincing trail ecology, moving freight and seamless crossing.
D. One fully usable ground vehicle on the same slice, tuned for responsiveness; measured performance.
E. One flying prototype with real world-space travel and landing on the same slice; distant terrain LOD.
F. Scale atlas and authored encounter grammar across all verified towns/regions; remove chapter UI; production QA.
Do not assert completion or deploy without live integration and acceptance evidence.
