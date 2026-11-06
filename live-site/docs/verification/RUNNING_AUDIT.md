# Character locomotion repair

Inspected the actual crew, crew-run-v2 and sable-starter artwork, all seven character rows and front/rear pose families. These are two camera views mirrored for left/right; the movement system accepts all eight compass directions, but the artwork does not contain eight separately drawn camera views.

The old equal-grid splitter cut Iona's running row at y334, despite her boots extending to y349–352. Other rows cut boots, hair, capes and weapons; the starter attack blade also crossed a nominal grid boundary. `actor-atlas.js` now supplies measured rectangles for all 128 source poses and copies complete bodies into padded, isolated cells using one source scale per sheet.

Crew front walk cell 1 and rear standing/walk cell 5 face the opposite direction from their neighbors. Both now normalize before applying player heading. Starter's rear standing cell receives the same correction, while its running row remains untouched. All seven running rows already share their authored heading.

Near-horizontal travel preserves the preceding front/rear camera side, so wall sliding cannot turn a northbound runner around. Walk/run share registration limits, preventing a size change on gait transition. Locomotion reference dimensions exclude attack/casting cells, so an outstretched weapon does not shrink the travelling character. A foot-width opaque span now establishes the floor even when the running foot falls outside the torso band; thin weapon tips still do not establish the floor.

Evidence: `crew-running-audit.jpg` shows all 56 running poses after source normalization and registration. `iona-run-crop-repair.jpg` shows front/rear before and after cropping repair. These diagnostic images use the original artwork; they are not newly generated character art.

Verification: 15 focused checks pass across actor-atlas, character-motion and motion-realism. They cover all 128 rectangles, measured clipping landmarks, all seven rows and authored flips, eight movement directions, near-vertical drift, wall slides, stride cadence across frame rates, shared scale and an outstretched foot's floor pivot.
