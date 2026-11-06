# Native SNES soundtrack

`native_patch.json` installs newly compiled versions of **all 48 original game
cues and both complete symphonic works** in the supplied Chrono Trigger USA
ROM's existing music system. The 83 original song slots point only to these
original sequences or to explicit silence. Every one of the 50 original works
is assigned to at least one game slot. New ROM size, emulator dashboards and
external music players are not required for these native sequences to play.

The compiler is `../native_spc.py`. Its note, tie, rest, duration, octave,
sample, volume, pan, tempo, wait and relocated jump bytes are derived from the
pinned primary SPC700 driver disassembly named in `sources.json`. Every emitted
track is decoded independently and compared note-for-note with its reduced
source score before a patch is accepted. The two pointer sets in every song
header are identical, so original A/B song-start commands reach our music.

The pool at ROM offsets `0A8ACC` through `0BF163` contained all 83 original
length-prefixed songs as one contiguous region. The patch replaces that entire
pool, replaces all song pointers and sets an explicit sample palette, dry echo
settings and unused drum metadata. It does not distribute the game's BRR sample
bytes. The CPU/SPC drivers, sound effects and their sample bytes remain in the
user's ROM. Each new song plus the CPU uploader's three possible overread bytes
stays below ARAM `2F00`, avoiding the sound-effect table. The patch currently uses
47,990 of the pool's 91,800 bytes.

The 48 short cues use eight monophonic native voices. The complete long symphony
uses two voices and the complete shorter symphony four voices to fit that safe
SPC sequence room; all 702 and 356 respective melody notes remain present.
Competing accompaniment notes are dropped in an explicit priority reduction.
Written onset times use a 1/16-beat grid, section tempos use the native tempo
accumulator and note velocities use eight-unit steps. Source identities, omitted
notes by role, maximum timing-grid error, tempo error and source hashes are
recorded per song. Original per-note Dyletsky cents, expressive rubato and
individual vibrato are not preserved by this native adaptation. The separately
rendered full orchestral recordings preserve those software performance fields.

The native palette uses original sample IDs 44, 23, 24, 38, 36, 26, 15 and 20:
synth strings, flute, harp, horn, trumpet, bass, a bass-drum substitute and piano.
It occupies 22,887 BRR bytes from the existing sample base at ARAM `4901`, ending
at `A268`. Per-sample octave corrections were estimated from the exact source
ROM's BRR loops. `palette_analysis.json` records those estimates; absolute cents
are not calibrated and the bass-drum substitute has no accepted pitched root.
These are native game timbres, not GeneralUser GS orchestral audio.

Run `python game/music/native_spc.py` from the repository root to rebuild. It
reads original written scores and the soundtrack catalog, then writes only
original sequence blocks, functional tables and provenance. `install_native`
accepts a `bytearray` only after checking the exact unmodified source-ROM SHA256.
A combined story/music patcher can validate the source once and apply the sparse
`edits` before writing its final checksum. An earlier orchestra-only BGM mute
patch must be omitted when native music is installed. Actual emulator testing
and a full-game playthrough are separate from codec and allocation verification;
the compiler does not claim either by passing its unit tests.
