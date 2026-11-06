# Quality release 5.16

This release implements the six areas from the quality review: scene coherence,
authored animation, exploration and guidance, distinct combat responses, visible
story consequences, and a quieter entry and battle interface. The Chapel is the
connected example used to assess those changes together.

## World composition and art

The Chapel's floor is composed as an apse, nave and sheltered entrance before
furnishing. Original object and passage cells are retained, and the normal
furnishing solver keeps routes reachable. Painted stone grain, carved walls,
faded processional cloth and broad window light give the room a common material
language. Compatibility graphics use the same direct painted material path.

Eight new transparent props provide an arch, answering bell, carved seat,
diverter, clay workbench, hearth, reed-and-stone bank and window. They replace
appropriate furniture or mechanisms at their existing positions. Water banks
use existing safe scenery sites. Images preserve their aspect ratios and ground
anchors; they do not introduce invisible collision changes.

Field labels are placed around actor faces and other labels within the visible
world bounds. Follower spacing increases from 0.92 to 1.12 world tiles while
retaining the existing distance-based trail through corners.

## Actual action poses

The release adds 16 armored Sable poses, 12 Ash Herald poses and 9 Moonveil Moth
poses. Runtime selection observes travel distance, facing changes, attack and
impact events, guard, enemy windup and recovery. Every character's sequence uses
one reference body scale with measured foot/body anchors. Wide Sable sword poses
use exact source pieces to preserve the whole painted figure without including
a neighboring frame.

The new **Authored animation review** uses the production selection and drawing
helpers. Its controls expose the individual frames, travel, attacks, impacts,
guard, defeat, mirrored facing, stepping, scale and reduced motion. Unsupported
outfits, rear travel, other heroes and spell casting retain their established
art. The expansion is scoped to these three actors, not every campaign sprite.

## Exploration and assistance

Four optional investigations have distinct physical structures: isolating and
draining a leak; answering bells with a meaningful silence; observing a carrier's
routine; and preparing food and shelter for a nesting moth. The other optional
latches vary answer positions and separate the clue from the question. All 24
regional repairs keep their individual writing and add a persistent preparation
step before the final adjustment.

Destination guidance walks to the objective and opens the interaction. Full
assistance also follows remembered musical phrases. Clues have three explicit
levels, and a destination picker reaches optional people, tools, merchants,
camps and mechanisms. Story decisions remain the player's choices. Assistance
preferences and bounded investigation state survive saves and origin transitions.

## Milestone guardians and inherited rules

| Chapter | Guardian response | Inherited rule |
| --- | --- | --- |
| 4 | The toll is followed by a return ring. Break silences the return; Guard catches it and opens the Herald. | Guard catches one direct strike and returns part of its force. |
| 8 | Separate the two named crew to ground the conduits. Break cuts one end. Tactics offers a paid Spread action on verified floor. | Guard protects a distant ally's next direct hit. |
| 16 | Break opens two targetable resonators. Disabling them removes real sections of later warning and hit geometry. | A personal art can contain one charged area attack to a small fixed circle. |
| 24 | Break opens an answer which a different crew member must complete with a different element or ordinary strike. | Two different voices can recover MP through a personal-art answer. |

Ordinary enemies and the other guardians retain their existing interruption
behavior. Supplies, reactions and finite tools use the same milestone contract.
The UI explains the current response beside the battle commands, and the Giant's
resonators have visible component markers.

Personal arts now support distinct hero behavior: Sable passes an opening; Iona
cleanses and protects critical patients; Rook makes a finite brace from armor;
Brass intercepts a nearby ally's hit; Riven carries wet conditions away from the
crew; Mira redistributes tempo; Veyr remembers a charged element for his next
ordinary attack. These use the existing paid commands and serializable battle
state, with bounded effects.

## Consequences in the world

The bell investigation connects soot, a filed plate and two accounts to a feed
shutter, lower drain, recovered/restored tongue, test pulse, preparation and
guardian return. Its water and working-state cues change in the scene. After
victory, the player can return to open a dry shelter with a service stair or a
witness route to the archive. The initial supply is paid once; the service and
route remain available.

All 14 civic origin outcomes receive specific return dialogue, an explicitly
activated relationship support and a persistent local passage after the relevant
milestone. Care and release support have different bounded battle effects in
their own districts. Existing completed histories and earlier bell preparations
are preserved without granting unearned new work.

## Entry, battle layout and evaluation

Character choice, biography, immediate opening and Begin remain prominent.
Growth/body history, cross-life connections and starting setup are disclosures.
Normal desktop combat uses a shallow bottom shelf; short landscape retains a
side console. The measured command/HUD bounds continue to reserve the arena.

The dedicated Chapel playtest entry and local observation export support the
next evaluation. [Chapel playtest](CHAPEL_PLAYTEST.md) describes the procedure and
questions. The intended 20–30 minute session length has not been measured in
independent human playtests. Automated and browser verification is recorded in
[release 5.16 verification](verification/release-5.16.md).
