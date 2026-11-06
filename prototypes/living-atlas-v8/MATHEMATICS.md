# Numerical world: coupled, auditable interactions

**Spatial state:** 65x65 sampled sites per region, with height `h`, water `w`, moisture `m`, fertility `f`, biomass `b`, fire, ash, mineral stone, unrest `a`, coherent wave `(Re,Im)`, and resonance `r`. Region climate multipliers and previous epochs produce initial and daily terms. Same fields drive color, objects, sound, combat, pathfinding and ecology, while the renderer is read-only.

**Moisture:** Each step includes region-specific rain, water infiltration around the river, gravity-independent simplified irrigation from the physical sluice, nearest-neighbor diffusion, biomass uptake and evaporation increased by heat and fire. It is *not* mass-conserving scientific hydrodynamics; replace with a conservative shallow-water solver when making river-engineering mechanics central.

**Growth:** Spatial biomass follows a bounded fertility/water-weighted logistic term `Δb ∝ f·m·b·(1−b)` minus survival losses and fire scorching. It drives real harvest, tree instances, cover and habitat choice. Production and population hunger then depend on this biomass and region climate.

**Hydrophone:** Every source adds a complex attenuated wave phasor `Δψ = A·exp(−d/19)/(1+0.045d)·T(m,s)·exp(i[2πphase+0.68d/c(m,w,s)])`. `resonance = clamp(0.92·|ψ|,0,1)`. Phase reversal by 0.5 at the same emitter location cancels the wave. This changes Aether defense, story clarity and sound frequencies/overtones, not just glow intensity.

**Combat:** Attack effects use local shielding and element coupling, then monster armor, physical material properties, ecological morph resistances and actual equipped gear. A retained attack modifies persistent cell state; monsters retaliate if they survive, and equipment changes defense or acoustic readings. World actions are only committed by explicit accepted game events.

**Navigation:** A* minimizes accumulated live movement cost. `traversalPassable` is computed from water plus a physically modeled, correctly-spanning bridge. Roads reduce movement cost and have visible mesh equivalents. Closed bridges block crossing; opening them creates legal paths.

**Interregional economy:** Climate, forest growth, historical ash and region stocks produce goods. Market price increases with scarcity and social risk. Trading physically moves inventory and wealth between connected settlements; a player spends an actual currency balance. Manufactured gear consumes tracked ingredients and retains origin/time of manufacture.

**Time:** Day progress advances every instantiated region and regional economic state. Lazy-loaded unvisited regions are brought to the same day before activation. At New Game Plus, a history record captures the previous epoch and computes grove, scar, bridge and harmonic imprints, which are applied to new ecological fields and physically rendered at legacy memorials.

**Determinism and limitations:** Stable seeded hashing and fixed daily steps define reproducible behavior. Aesthetic creature motion is intentionally non-authoritative. Model coefficients are hand-designed for gameplay and **not** measurements of real physical constants, hydrology, ecosystems or economic populations. Further research would require fitted parameters, conservation-law checks, timestep stability analysis and validation on real hardware.
