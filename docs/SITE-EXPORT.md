# Original Site export — version 45

Exported on 2026-11-06 from the authenticated Sites source repository.

- Site: https://ash-aether-clay-water.towre676.chatgpt.site/
- Project: `appgprj_6adf63724e5c8191bd55637b8ecd8d9a`
- Saved version: 45
- Original commit: `1b86d964cf816232588cb0dd1c44ada82daab563`
- Snapshot: `live-site/` (2,767 tracked files, preserved byte for byte)

The snapshot commit matches the source provenance returned by Sites for version 45. All tracked files are included: runtime source, static assets, development material, scripts, documentation, and the original hosting manifest. Existing historical prototypes remain separate.

To serve the exported static game locally:

```sh
python -m http.server 8000 --directory live-site/dist
```

Open http://localhost:8000/. Local hosting has a separate browser origin and does not inherit the live game's player saves. Runtime behavior has not been browser-tested as part of this export.

This export does not read or change player saves, production databases, runtime secrets, Site access, or the current deployment. It does not include untracked files or external services/assets absent from the original repository. Do not run deployment tools against the preserved hosting manifest unless you intend to update the original Site.

No new redistribution license is granted by this export; see CONTRIBUTING.md.
