# 5.37 · Stone, timber & tide

The two other-session packages have been reconciled with the current 5.36 game. Their production integration bridge assumes Three.js; the current game owns a custom WebGL/software renderer. The source was adapted at the native material and geometry boundaries instead of replacing the game or starting another renderer.

| Other-session source | Production integration |
| --- | --- |
| ground-materials.mjs and ground-synthesis.mjs | Two byte-identical upstream modules under engine2/aa-env537, actively imported by native-ground-537.js |
| environment-detail-kit.mjs architectural direction | Native parcel-bound masonry courses, ridge collars, industrial vents, sloping service-bank louvres and existing cliff strata in native-environment-art537.js |
| Environment consequence design | Existing chapter-three pump-room action state now drives flowing, isolated, venting and drained channel geometry |

Ground synthesis uses bounded 128px cached tiles in the native scene atlas. Large limestone/enamel/wood courses blend with existing painted grain. Floor, street, habitat and terrace surfaces actually sample that atlas; matte paper/instrument surfaces remain distinct. Visible native routes and closed ground retain their own surface families. WebGL floor repeat now matches the software renderer’s 3.2m span. The generated color map is consumed; new PBR normal and roughness bindings are not claimed.

The architectural finish adds at most 1,200 triangles (1,100 in origin scenes,600 at low quality). The static rebuild chooses attached detail nearest the native player so the phone budget reaches visible foreground structures. It never moves structures to fit that budget. Faces stay with existing parcels, closed service banks and landscape walls. Existing building thresholds and gameplay masks remain authoritative.

In The Dry Pump Room, scene 703, the four already-connected native service-channel segments respond to the investigation state. Closing the inlet stills the retained water; opening relief narrows it; clearing the grate exposes the dry stone/silt bed and flush grate. Early or incorrect actions leave the water state unchanged. Existing saved and legacy solved states restore the appropriate art. This introduces no rewards or new puzzle rules.

## Verification

The native renderer was visually inspected in town 5, grove 20, river 49, aurora frontier 2040, home 2 and pump room 703. Ordinary Veyr scene 50013 was resumed in the existing journey and inspected at 390 × 844. Its game viewport is 388 × 842 with matching document size and no page overflow; native low quality submits600 new detail triangles. Geometry, save preservation, native drainage callbacks and material exposure have focused regression coverage. Logs and browser evidence are in docs/verification.

Browser graphics inspection used the native software 3D fallback, not physical Android hardware. Live pump-room state transitions were exercised through the actual native callbacks in automated tests; the browser review inspected its initial room rendering. Indoor zoom, battle input and traversal regression checks remain part of the full game suite.
