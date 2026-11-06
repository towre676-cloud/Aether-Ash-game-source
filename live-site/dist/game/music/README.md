# Game soundtrack

`catalog.json` is the playable soundtrack contract. It includes both complete
existing symphonic performances and each of their six movement chapters, plus
forty-eight newly composed, actually rendered orchestral game cues. All audio URLs
are relative to the repository/site root. `start_s` and `end_s` are times in
that audio asset, and `duration_s` is their difference. Tracks are grouped by
their actual `role`. The native SPC compiler consumes the editable written
scores to make the actual game soundtrack; the MP3 files provide the richer
sampled-orchestra versions of the same authored music.

The original twelve cues use fresh seeds, keys and composer palettes from the
existing corpus-conditioned score engine. Thirty-six additional cues form six
recurring original thematic families: the mechanical Iron Pulse, intimate
Shelter, reflective Memory Glass, forward Resistance, aerial Skyward and radiant
Final Promise. Each family shares a compositional seed while keys, tempo, mode,
phrase selection and authored instrumentation transform its material across
the story. The new narrative roles include an industrial station, reactor
infiltration, resistance refuge, undercity, machine boss, chapel, pursuit,
corporate spire, remembered home and flight. No melodies from another game are
retrieved. Complete closing phrases are selected
in the symbolic score before expressive performance. Battle and boss cues add
explicit parallel-minor coloring and timpani. The actual recovered Dyletsky
intonation field, the performed-data priors and the sampled GeneralUser GS
orchestra remain active. Each cue has editable written/performed JSON, a MIDI
export and a render receipt with asset hashes, sound-bank hash, sample counts,
voice count, normalization and actual nonzero RMS. This is software-orchestra
audio, not a recording of the physical clay/string/hydrophone object.

Cue endings contain cadences and natural release tails; they are not claimed
to be sample-perfect seamless loops. The game player can crossfade transitions.
The original uploaded game ROM is not contained in this catalog or copied into
the public repository. Native music adaptation and ROM insertion are separate
build steps, with the SNES's actual eight-voice sampler and timing limits made
explicit in their own receipts. The orchestral recordings retain individual
microtonal note trajectories; native SNES adaptation does not imply identical
sample quality, orchestration or intonation.

Reproduce with `python assets/symphony/fetch_soundfont.py --native-linux`, then
`python game/build_catalog.py --force`. Existing correctly built cues are reused
when `--force` is omitted, after audio and score hashes are checked. The first
twelve cues keep their existing 192 kbps MP3 bytes; the expansion uses 128 kbps
delivery copies below 900 KB each. `python game/build_catalog.py --validate` checks all
cataloged audio and performed-score hashes. The original data and sample-bank
provenance and licensing remain documented in `data/symphony/PERFORMANCE_DATA.md`,
`symphony/corpus_sources/` and `assets/symphony/LICENSE-GeneralUserGS.txt`.
