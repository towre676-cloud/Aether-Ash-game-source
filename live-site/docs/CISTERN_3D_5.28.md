# The Remembering Cistern

The Cistern adds a three-dimensional dungeon scene to the existing browser game. It uses a custom WebGL renderer and a perspective Canvas renderer for browsers that cannot create a WebGL context. This release does not contain a native Windows Direct3D 12 executable.

## Entering and returning

- The bronze Cistern entrance is a normal interaction target in Cinderfall, near the festival square.
- Pause → **Descend to the 3D cistern** opens the same scene after a traveller reaches the present.
- **3D dungeon · temporary playtest**, on the title screen and in the developer portal, prepares a separate level-four crew. The developer session does not write ordinary journey saves.
- The campaign retains its exact scene and position throughout the dungeon. The entrance stair and **Save & return to the world** restore field control at that position.

## Shared gameplay state

The scene uses the active campaign party's HP, MP, power and supply bag. Its progress is stored in `world.cistern3d` inside the existing enhanced-save wrapper. Existing saves without this field remain valid. Restoring canonicalizes dungeon geometry and enemy state and clears pending enemy telegraphs for a short safe reorientation.

Two resonators unlock the northern gate. Creatures lock their warning circles before striking. The player can leave the circle, Guard to reduce damage, or spend six MP on Resonance Break to interrupt a charge. Guard recovers MP. Tonics consume the campaign supply. Defeat returns the crew to the entrance, partially recovers HP, and preserves activated resonators and defeated creatures.

The Drowned Bell awards 180 credits, 240 campaign XP, three Tonics and one Ether once per journey. The completion marker survives save/load. Campaign chapter flags and its guardian list are independent of this optional dungeon. The standard campaign progression continues to own level recalculation.

## Visual direction and provenance

The initial primitive-art presentation was rejected during review and has not been published. The revised presentation uses the game's illustrated character and creature atlases, detailed original dungeon materials and authored three-dimensional architecture. Materials include chipped limestone, damp masonry, engraved brass and cavern rock. The generated material prompt and provenance accompany the deployed WebP/JPEG assets in `dist/game/engine2/art/cistern/`. The original PNG source is retained in `development/art/cistern/`.

Official publisher screenshots were inspected as art-direction references:

- [Octopath Traveler II](https://store.steampowered.com/app/1971650/): illustrated characters within dimensional scenery, dense surface detail, deliberate depth and camera framing.
- [Diablo IV](https://store.steampowered.com/app/2344520/): weighty architecture, localized illumination, irregular edges and readable action space.
- [Path of Exile 2](https://store.steampowered.com/app/2694490/): monumental scale, damaged stone, foreground silhouettes and warm/cool landmarks.

Reference screenshots are research material and are not included in the shipped game.

## Controls

Keyboard: WASD/arrows move, Shift runs, Space/J strikes, E/X interacts, K/1 breaks, G guards, 2 uses a Tonic, Escape pauses. Tap clear ground or follow the objective to walk a collision-checked route. Touch provides a movement stick, action buttons and persistent pinch zoom. Standard controllers use the left stick/D-pad, A to interact, X to strike, Y to break, B/LB to guard, RB to run and Start to pause.

The dungeon has separate saved zoom and graphics preferences. Losing focus or graphics pauses play. The pause menu always provides a return path. The overlay traps focus and restores the host interface's previous interaction state on exit.

## Verification

The release regression run reports 1,456 passing tests across 185 modules. New model and integration tests cover a complete level-one traversal without teleporting, collision at water/pillars/gate, both resonators, combat warnings and damage, shared MP and supplies, safe restore, exact campaign return coordinates and rewards that remain unique through save/load.

The test browser cannot create WebGL contexts. Browser interaction and visual checks therefore exercise the software 3D path. A separate retained Mesa EGL/GLES check compiles and links the exact GPU shader source; this is native software OpenGL validation, not a claim of physical GPU or browser WebGL performance. Physical Android and Windows/Edge performance still require device playtesting.
