# A&A production visual-quality and performance gates

## Look and physical consequence

No material exists only as tint. An accepted interaction must change at least one of the following when relevant: traction, audible footsteps, ground deformation, conductivity, battle shielding, ecology, harvest, route cost, evidence, NPC economics or legacy history. The rendered instance reads that same source. All cosmetic effects must be unable to mint items or complete quests.

| Scene | Expected visual pass | Expected physical/mathematical pass |
| --- | --- | --- |
| Chapel and street | Distinct worn road + flagstone, no sharp square edge, doors fit footprints | Footstep noise, repairs, legal connected bridge |
| Mosswake forest | Fern, nettle, bluegrass, shade and trampled lanes, no grid-repeat | Concealment and fire spread track biomass, weather and footfall history |
| Silt Delta | Riverbank reeds, mud, dockwood, flood silting | Wetness/traction, traces, flooding, safer crossings |
| Glass Orchard | Mixed crop cover, clay, real fruit/resource nodes | Sluice alters fertility, market production and monster habitat |
| Ashfall | Clinker, soot, slag and fired brick rather than brown grass | Heat reserve, fire-driven ecology, salvage and hazards |
| Clay Basin | Terracotta, rammed earth, timber interior flooring | Fractures/repair use inventory; moving through interiors is physically valid |
| Glass Coast | Salt, wet slate, limestone, tide marks | Moisture and surface noise alter stealth and traversal |
| Sky Engine | Enamel, conductive brass, cloudstone, mosaic | Electrical phase/conductivity alters shielding and clue detection |
| Basalt Rift | Obsidian, basalt fissures, furnace mosaics | Durable cover can fracture under sustained attack; combat uses actual ground resistance |

## Numerical and browser gates

- Save-before/after checks after casting, stepping, trample, river intervention, harvest, fracture, restoration and NG+; any failed action must be mutation-free.
- Render origin consistency: roads coincide with navigable graph; doors sit at actual footprints; no grass or surface objects penetrate structural walls; river water and passability agree.
- Screen readability: the game must maintain visible party, HP, icon and skill choices without scrolling over hidden battle content; camera zoom/character orientation remain correct across all axes.
- Performance presets: battery caps vegetation tufts at 3,500, balanced caps at 9,500; this is a conservative draw-instance cap, **not measured FPS**. Lower texture map generation is used on battery. Low/mid/high/ultra assets should have LOD tiers before production.
- Target production QA (not a claim): smooth 30 FPS on representative mobile hardware, 60 FPS desktop when feasible; measure 1% low FPS, median frame time, CPU texture-generation spikes, shader compilation, GPU draw calls, peak memory, and texture/instance disposal on region changes.
- Visual acceptance requires comparison screenshots at walking camera, close inspection, and elevated view, in dry/wet/day/night states, for ALL nine regions. Favor distinct silhouettes, believable ground construction and coherent architectural scale over sheer prop count.

## Current honest limits

The 48 materials have mathematical physics and generated albedo/normal/roughness textures; they are not scanned photogrammetry. The 16 plant families have custom instanced geometry, not individually handcrafted textures. The materials catalog may render multiple variants per substrate but does not yet constitute the hundreds of premium props, authored room layouts, original creature rigs or AAA frame-by-frame motion required for launch. The main app requires the pinned Three.js CDN and a GPU; offline `src/grass/preview-offline.html` provides a Canvas2D verification example. The actual live Site's code was unavailable, so browser/GPU equivalence and production cross-session test pass are not certified.
