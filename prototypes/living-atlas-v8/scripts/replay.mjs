/** Reproducible complete 10-quest campaign and persistent New Game Plus receipt. */
import {AtlasWorld} from '../src/adventure.mjs';
import {QUESTS,REGIONS,SPECIES,verifyContent} from '../src/content.mjs';
const a=new AtlasWorld(2301),timeline=[];
function act(kind,id,x=-16,z=-10){const r=kind==='travel'?a.travel(id):a.resolveQuest(id,x,z);if(!r.ok)throw Error(`${kind} ${id}: ${r.reason}`);timeline.push({step:timeline.length+1,kind,id,age:a.age,region:a.activeRegion});}
act('quest','rain_recovery');act('quest','bridge_accord');act('travel','mosswake');act('quest','roots_singing');
act('travel','clay_basin');act('travel','silt_delta');act('quest','underwater_road');act('travel','glass_coast');act('quest','moon_mirror');
act('travel','glass_orchard');act('quest','fruit_of_years',16,14);act('travel','ashfall');act('quest','furnace_names');
act('travel','sky_engine');act('quest','machine_of_days');act('travel','basalt_rift');act('travel','clay_basin');act('quest','walls_remember');act('travel','basalt_rift');
const engage=a.engageVisible('basalt_rift.sentry',-16,-10);if(!engage.ok)throw Error(engage.reason);
let battle=null;const rounds=[];for(let round=0;round<12;round++){battle=a.fight(-16,-10,'basalt_rift.sentry','water',5);rounds.push(battle);if(battle.victorious)break;if(battle.hp<=0)throw Error('Party defeated');}if(!battle.victorious)throw Error('End boss not defeated after twelve rounds');
act('quest','unfinished_crown');if(a.completed.length!==QUESTS.length)throw Error('Campaign is not complete');
const current={age:a.age,region:a.activeRegion,quests:[...a.completed],finalBattle:battle,bossRounds:rounds,reputation:a.reputation,biology:a.world.summary(),journey:timeline};
const ng=a.newGamePlus();
const receipt={verified:verifyContent().length===0,regions:REGIONS.length,species:SPECIES.length,completedQuests:current.quests.length,firstEpoch:current,secondEpoch:{epoch:a.epoch,resetQuestCount:a.completed.length,inheritance:ng.imprint,newWorldCanopy:a.world.summary().canopy},saveVersion:a.snapshot().version};
console.log(JSON.stringify(receipt,null,2));
