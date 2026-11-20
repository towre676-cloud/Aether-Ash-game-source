# Live game ↔ GitHub source integration

## Preserved source

[PR #4](https://github.com/towre676-cloud/Aether-Ash-game-source/pull/4) merged the authenticated Site saved version 45 on November 6, 2026. Its 2,767 tracked files were imported under `live-site/` from source commit `1b86d964cf816232588cb0dd1c44ada82daab563`. The imported Git tree is `214fa44b249070e7843195b0ea8f4e0787e89b6d`. The built entry point is `live-site/dist/index.html`, labeled `5.42 · Surface and shadow`.

- [Export provenance and local serving](SITE-EXPORT.md)
- [Local browser validation](SITE-V45-BROWSER-QA.md)
- [Separately hosted original game](https://ash-aether-clay-water.towre676.chatgpt.site/)

The latest deployment has not been matched to the saved version 45 source. The GitHub Pages showcase, standalone world lab, and archived prototypes have their own entry points and validation.

## Future integration

Identify the deployed Site version and compare its exact source tree with the preserved export before merging changes intended for production. Check input and camera ownership, save compatibility, encounters, inventory, and the audio transport on the intended build. Validate the result on desktop and physical mobile devices before a separate Sites deployment. GitHub Pages and the original game use separate deployment workflows.
