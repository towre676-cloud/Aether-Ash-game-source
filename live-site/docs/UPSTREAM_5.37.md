# Other-session 5.37 source provenance

Inputs retrieved for this integration:

- Ash_Aether_5_37_Production_Integration_Modules.zip
- Ash_Aether_5_37_Environment_Production_Upgrade.zip

All eight production modules are byte-identical between those packages. The two active independent ground modules are retained unchanged:

| File | SHA-256 |
| --- | --- |
| ground-materials.mjs | 05eaab394be2da602462a3a745be37d8995ff3dc80ec09ce5486acfcd44714b7 |
| ground-synthesis.mjs | c58035b2f58888f4e340c32517b8b92bf9fb179feb511944531c74dc8dae85c2 |

The upstream environment suite passed 71/71 and installer checks 6/6. Native integration is checked separately against the current game. The production bridge, inferred circular building footprints and replacement terrain scene were not installed: the current native renderer, exact entrances, Ground Forge, Living Atlas, collision, combat and save systems keep ownership. Architectural form ideas are adapted to the native footprint plans and include provenance in the module header.
