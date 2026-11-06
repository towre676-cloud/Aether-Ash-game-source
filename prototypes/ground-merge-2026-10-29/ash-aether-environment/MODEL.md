# A&A living-world model: mechanics, equations and integration

## One source of truth

The save-state `LivingWorld` owns 4,225 cells (65 x 65), each with terrain elevation `h`, water depth `w`, moisture `m`, fertility `f`, biomass `b`, ash `ash`, active fire `fire`, Aether unrest `a`, material stone fraction `stone`, complex wave phasors (`waveRe`, `waveIm`), and derived resonance `res`. These values are the only inputs to both the graphic response and the gameplay query; the renderer does not fabricate effects of its own.

## Numerical program

Per daily step, moisture gets rain, river infiltration, controllable sluice supply, neighbor diffusion, biomass uptake and evapotranspiration. Growth has a logistic term proportional to `fertility × moisture × biomass × (1−biomass)` and is damaged by fires and ash. Local fire spreads toward dry neighbors, then decays. These are simplified coupled game rules (not hydrology/fire research-grade solvers).

The Hydrophone is a complex-valued phase field. For each cell, a source at `s` contributes approximately:

`ΔΨ(x) = A exp(−r/19) / (1 + .045r) × T(m,stone) × exp(i[2πφ + .68 r/c(m,w,stone)])`, where `r=|x−s|`.

`Ψ = waveRe + i waveIm`, and visible/gameplay resonance is `min(1, 0.92 |Ψ|)`. A change of phase by 0.5 produces a 180° reversal at the same site; with matched intensity and time, it cancels the previous contribution. Water changes propagation speed and stone attenuation. This explicitly changes the story echo metric, encounter likelihood, Aether defense and visible particle population. It is a creative scalar wave model, not measured acoustics.

Elemental damage is computed from **the same cell values**: `damage = power × max(.1, (1 − .72 × shield[element]) × (1 + coupling[element]))`. The coupling is nonlinear (products of moisture, biomass, fire, stone and resonance), and each element has persistent environmental side effects. A water cast can quench future fire and change soil; a fire cast can remove resources and change habitats.

## A&A integration layers

1. **Canonical schema:** translate A&A terrain cells, materials, cover instances, hydrology, quest flags, monster species, regional weather and timeline IDs to this environment schema. Replace the demonstration's generated geography where authored A&A geometry already exists.
2. **Event bus:** send world mutations only for accepted, authoritative gameplay actions. Do not update the physical world from particle effects or camera animation; a failed skill cast must not alter terrain.
3. **Query API:** before each encounter roll, creature action, traversal path, build operation or extraction, call `world.evaluate(x,z)` or `world.resolveAttack(...)`; do not maintain duplicate shield/spawn/path constants in the renderer.
4. **Renderer:** consume material biome fields and object states to instance high-quality LOD meshes; buffer world updates and only rebuild dirty chunks, retaining A&A's existing HUD and guided/manual exploration boundaries.
5. **Persistence:** save world state, epoch ID, seed, content schema version, and a compact event ledger next to the existing game save; use migration rather than overwriting legacy saves. Limit offscreen simulations with a fixed-step budget.
6. **Data integrity:** connect every named region, biome, boss, quest unlock, crafting resource and New Game Plus change to a stable authored ID; validate cross-references at build time.
7. **Acceptance tests:** compare before/after world-state hashes, traversal legality, environmental cover and spawn changes; check that actions are deterministic across browsers and that no mesh count/camera event changes the rules.

## Practical art pipeline

This demo has generated primitives for trees, stone, timber and other objects, which will **not** by themselves match AAA-quality launch art. The production approach should use a small number of expertly authored meshes, original scanned/hand-painted PBR materials, material variants, believable architecture footprints, coherent paths, and silhouette variations. The numerical engine supplies *where, when and why* each variant appears; art assets supply *how beautiful* it is. Avoid repetition by varying species, biological stage, branching skeleton, bark/leaf material, wetness, damage, local culture, provenance and mechanical affordances together. Realism requires accurate scale, plausible support/contact, consistent door/roof/interior geometry, temporal continuity, and a fixed camera/composition standard.

## Performance and device support

The demo uses instanced trees, rocks, grass and flowers, shared geometry, one 65 x 65 mesh, a small river ribbon, no post-processing, a capped pixel ratio, and deterministic fixed-step world updates. Production should use 32 x 32/64 x 64 streaming chunks, dirty-region updates, per-biome density limits, imaged distant impostors, GPU instancing and aggressive fallback meshes on mobile. Its code has passed numerical tests and syntax checks, but no live browser rendering or FPS benchmark has been completed in this environment.
