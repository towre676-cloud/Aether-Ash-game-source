# Cinderfall field regions

The campaign remains an original eight-mission SNES campaign using native map,
sprite, enemy AI and battle templates. This extension adds six optional native
rooms, eight optional enemy formations, eight equipment caches, and bounded
field movement for every ordinary formation. It is not an FF7 source port or a
commercial-length new RPG.

Twenty mission rooms hold twenty-three ordinary formations and eight story
bosses. The six added detours are the Furnace Nine maintenance workshop, the
Glass Transit rail refuge, the Undercity drainage bypass, the unindexed archive
vault, the sky engine's service hold and the orchard sanctuary. The chapel's
east aisle and the final reactor's reserve ridge gain optional encounters and
supplies within their existing maps. Field consoles serve as A-press doors;
walking past them does not change rooms. Native exits or a matching return
console bring the crew back to the required route.

Each mission's optional equipment complements its point in the campaign:
workers' replacement arms and helmets, rail refuge armor, river keeper gear,
fire-protective chapel vests, archive robes, reserve crew weapons, orchard
weapons and final-ascent armor/recovery supplies. Items are real native
inventory entries, available through the normal equipment and item menus.
Unique caches never replenish.

Every ordinary formation has a short closed movement route. Relative offsets
are shared by its members to preserve local formations; source map collision,
NPC blocking, room boundaries and stair/exit avoidance were checked. The
movement is native event bytecode, not a page overlay or RAM position edits.
Contact starts native combat. These are bounded patrols, not a new pathfinding
or line-of-sight AI. Their underlying in-battle behavior remains the selected
Chrono Trigger enemy template.

Returning to the Kiln/rest resets ordinary encounter defeat flags, permitting
more experience and supplies without resetting boss victories, objectives,
recruits or unique caches. A battle's necessary room reload does not reset its
own encounter. Eight existing mission bytes at `7F:01E1` through `7F:01E8`
continue storing story progress; optional region bytes at `7F:01F0` through
`7F:01F7` use bit 0 for a formation, bit 1 for unique equipment and bit 2 for
side-room entry text. These are compiler-reserved state; the verification
harness reads them as evidence and never writes them to fabricate progress.

Run `python game/romhack/authoring/rooms.py` to regenerate room content in
`campaign.json`. Run `python -m unittest discover -s game/romhack -p
"test_regions.py"` for authoring/flag invariants. Set `CT_SOURCE_ROM` and
`CT_TOOLS_ROOT` to include the real-ROM collision and side-room reachability
checks. Those static checks establish mapped paths, not a successful playthrough;
controller-earned battle and travel receipts are recorded separately.

The Kiln route keeper now permits travel to regions already reached in the story, including after the ending. Native room and boss guards retain the campaign phase and prevent a defeated story boss from replaying its rewards. The merchant offers real inventory purchases; see `NATIVE_FIELD_SYSTEM.md`.
