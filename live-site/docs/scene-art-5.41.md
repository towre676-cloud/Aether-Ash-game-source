# 5.41 · A world of craft

The ordinary world now uses the same kind of composition pass as Veyr: a close view of a working place, recognisable structures around real activity, and regional surfaces rather than a repeated dungeon texture. Veyr retains its dedicated 5.40 geometry, materials and camera. This pass covers the other 165 World scenes and the three chambers of the Remembering Cistern.

## Places and routes

The material factory supplies forty calibrated scene identities with bounded canvas atlases. Homes, treatment rooms, workshops, archives, industrial rooms and underground places have their own furniture craft and wall details. Indoor views use the actual building shell instead of surrounding every room with the same outdoor forest. Floor wear follows native routes without white borders or a second checkerboard of inset paving.

The 95 ordinary exteriors gain closed-ground regional forms, building facades and service bays. Frontier sites have a camp, survey apparatus and repair equipment at native work positions. Their sixty maps use five circulation grammars while retaining the existing portals, work anchors and encounter courts. Seven borrowed field-origin maps receive compatible routes. Existing legal saved positions remain exact; positions and battle masks affected by a new closed bank migrate without resetting resources or progress.

The remembered outdoor origins gain close home, furnace, railway and sluice entrances where their principal mechanisms were too far from the native arrival. Their thresholds span only above head height; low solids remain on checked closed cells. They add no actions or new narrative claims.

The 53 dungeon rooms gain attached instruments, piers and aisle arches that respond to native mechanism state. The Cistern receives glazed drains, high-water craft, resonator fans and a floor seal in the bell chamber. Existing movement, combat, mechanism decisions and rewards retain their owners.

## View and renderer

Interior and exterior cameras frame the lead with nearby useful architecture rather than fitting an entire map. The field retains its manual lens, inverse ground picking and pinch anchors. A bounded foreground cutaway uses the actual lead billboard registration; floor, low rails, contact shadows and background masonry retain their opacity. Veyr, battles and the native Cistern keep their existing cutaway scope.

The software painter prelights its texture tile before clipping and uses a coplanar floor undercoat to remove bright triangle seams. Its reusable 64-tile pool occupies 4 MiB. On the same current native geometry, assets and camera, host Skia p95 fell from 488 to 276 ms in town 5, 345 to 170 ms in forest 145, and 279 to 185 ms in home 2 compared with the previous painter. The new cutaway was enabled for the current painter. These CPU measurements do not establish smooth physical-phone or WebGL performance.

## Verification

The offline inventory runs the actual Adventure3DRenderer and CisternSoftwarePainter with the real game assets, native World installers and native arrival coordinates. It rendered all 165 scenes at 388 × 842 with no missing assets, nonfinite geometry, changed floor masks, changed saves or source drift. Six contact sheets were independently reviewed for blank arrivals, hidden leads and wrong scene materials. This checks arrival composition; it does not certify every walking position.

The final broad suite passed 1,798 tests across 243 modules, with no failures or skips. The subsequent Cistern-only shrine cleanup passed all three focused craft checks and was rendered again in all three native views. Its original stone shrine remains visible; the proposed overlay was excluded after visual review. The final test result and Cistern captures are recorded alongside the release evidence. Coverage includes physical-control coordinates, cable endpoints, zoom recovery, inverse picking, actual software cutaway pixels, model footprints, native mechanism state, frontier progression, battle restoration, Atlas continuity and music ownership.

One native Sable room was also inspected in the cloud browser. Its final reload and further browser review were blocked by the browser tool's URL policy gate. Final browser interaction, production gameplay and physical-phone/WebGL performance are not claimed as verified.

The concurrent orchestral soundtrack publication at source 5657f7d was merged before packaging. Its transport, manifest and listening page are preserved, together with the 5.41 scene-review entry and final game cache revision.

Reproduce the arrival inventory with:

```sh
node scripts/qa-scene-art-541.mjs --output /absolute/scratch/scene-art-541
```

Evidence is stored under `docs/verification/scene-art-541/`.
