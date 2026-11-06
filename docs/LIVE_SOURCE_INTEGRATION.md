# Live game ↔ GitHub source integration

## Current status — November 5, 2026

- Live [Ash & Aether: Clay and Water](https://ash-aether-clay-water.towre676.chatgpt.site/) is an active separately hosted ChatGPT Site.
- Recorded Site project identifier: `appgprj_6adf63724e5c8191bd55637b8ecd8d9a`.
- The Library *text projection* reports source version `45` and the UI label `5.42 · Surface and shadow`, with character selection, four acts, orchestra, field guide and 3D-dungeon entry.
- Direct unauthenticated source-page retrieval returned HTTP **401**. The connected Library exposes page text, not the editable HTML/JS/scene data, game saves, image assets, or deployment archive.
- **The current live source has NOT been merged into GitHub.** A safe production merge cannot be claimed without obtaining that source.

## What has merged successfully

The GitHub repo now contains a public showcase, a standalone world lab, **596 archived UTF-8 prototype source/test/doc files**, and authentic screenshots captured from three runnable prototype studies. These are distinct from the live Site, whose existing gameplay and saves have not been changed.

## Safe steps to finish a real source merge

1. Retrieve an **editable export** of the latest live Site, with its assets and exact runtime/deployment version, through owner-authorized access. A public URL or Library text projection cannot replace that export.
2. Preserve the original files and game save formats as immutable backup evidence. Avoid copying credentials or private player data into the public repository.
3. Commit that source **unchanged** on a separate GitHub branch under `live-game/`; attach file checksums and a source/version map. Leave GitHub Pages' root `index.html` and the historical `prototypes/` untouched.
4. Compare input and camera ownership, world coordinates, save import/export schemas, encounters, assets and copyright, inventory state, music/audio buses and the current actual game engine against the archived work.
5. Integrate modules independently with tests and real browser/device QA. Confirm save migration and mobile performance before any live game deployment.
6. Merge GitHub changes only after validation; **deploying GitHub Pages does not deploy to the separate authenticated game Site**.
7. Update the repository banner to a verified capture or image exported **from the current live build** when that image is available. Until then, label the recovered Vista screenshot correctly.

**Needed to unblock:** a current owner-authorized editable Site export, ideally with the exact header image or a direct verified capture. Avoid sharing passwords in chat or committing secrets.
