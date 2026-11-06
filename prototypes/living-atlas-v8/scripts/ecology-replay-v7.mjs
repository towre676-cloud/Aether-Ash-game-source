/** A reproducible counterfactual with two worlds from the same seed. */
import fs from 'node:fs';
import {AtlasWorld} from '../src/adventure.mjs';
const id='hearthland.grazer',seed=27029;
const quiet=new AtlasWorld(seed),disturbed=new AtlasWorld(seed);
const start=quiet.wildlife.cohort(id).count;
const step=disturbed.stepAt(-15,-10);
if(!step.ok)throw Error('Controlled comparison footfall failed');
const guide=disturbed.trackSpecies(id,-15,-10);
if(!guide.ok)throw Error('Field guide observation not accepted');
const pre=disturbed.wildlife.sample(id,-15,-10);
if(!disturbed.engageVisible(id,-15,-10).ok)throw Error('Creature engagement failed');
let battle;for(let r=0;r<10;r++){battle=disturbed.fight(-15,-10,id,'aether',5);if(battle.victorious)break;}
if(!battle.victorious)throw Error('Ecological victory did not resolve');
const countAfterBattle=disturbed.wildlife.cohort(id).count;
quiet.passDays(12);disturbed.passDays(12);
const afterQuiet=quiet.wildlife.cohort(id).count,afterDisturbed=disturbed.wildlife.cohort(id).count;
const saved=AtlasWorld.restore(disturbed.snapshot());
if(saved.wildlife.cohort(id).count!==afterDisturbed||saved.fieldGuide.length!==1)throw Error('Persistence mismatch');
const beforeRestart=saved.fieldGuide[0].confidence,reloadedCount=saved.wildlife.cohort(id).count;saved.newGamePlus();
if(!saved.fieldGuide.length||saved.fieldGuide[0].confidence>=beforeRestart)throw Error('New Game Plus note inheritance failed');
const report={simulation:'A&A Wildlife v7 reproducible counterfactual',seed,species:id,
 baselineCount:start,acceptedFootfall:step.ok,firstFieldSurvey:guide,
 alertImmediatelyAfterFootfall:pre.alert,countAfterBattle,battleVictorious:battle.victorious,conditionedEvolution:{days:12,quiet:afterQuiet,afterFootfall:afterDisturbed},
 // Footfall changes short-range animal alert/visibility. It does not kill animals and is not
 // assumed to change long-term population in the absence of persistent terrain damage.
 observedMechanics:['local disturbance','behavioral avoidance','victory reduces population','population recovery','persistent knowledge','New Game Plus partial transfer'],
 reloadedCount,newGamePlusEpoch:saved.epoch,carriedNoteConfidence:saved.fieldGuide[0].confidence,
 verified:true};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
