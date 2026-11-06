/** Encounters are measured in ground actually covered, never idle time or frame count.
 * The opening contact is short; later intervals leave room to explore and recover.
 * These tile budgets are authored pacing choices, not a universal RPG rate. */
import {isInteriorScene} from './scene-identity.js?v=4.0.0';

const ORIGIN_HABITATS={
 'sable-reed':'meadow','iona-lowbank':'wetland','rook-regulator':'workshop',
 'brass-rail':'foundry','riven-tide':'wetland','mira-archive':'archive','veyr-storm':'highland'
};
const BIOME_HABITATS={dunes:'ruins',salt:'wetland',cactus:'meadow',caldera:'foundry',coral:'wetland',mangrove:'wetland',crystal:'cavern',glacier:'frostland',aurora:'frostland',spore:'woodland',storm:'highland',marble:'ruins'};
const SAFE_KEYS=new Set(['home','inn','clinic','guild','instrumentworks','carpenter','market','hub','sanctuary','chapel','refuge','lowbank_shelter','relief_store','common_assembly','listening_chamber']);
const ROOM_HABITATS={security:'workshop',console:'workshop',workshop:'workshop',passages:'sewer',bell_crypt:'ruins',west:'archive',east:'archive',unindexed:'archive',office:'archive',hold:'cellar',reactor:'foundry',manifest_depot:'cellar',flood_spillway:'sewer',name_vault:'archive',letter_attic:'cellar',echo_chamber:'ruins',resonance_gallery:'ruins',lens_workshop:'workshop',witness_vault:'archive',pottery_floor:'foundry',vent_house:'foundry'};
const FIELD_HABITATS=['meadow','foundry','wetland','ruins','archive','highland','woodland','foundry','wetland','cavern','wetland','ruins','woodland','cavern','meadow','highland','highland','foundry','highland','ruins','foundry','highland','ruins','ruins'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const random=rng=>{const value=Number(rng());return Number.isFinite(value)?clamp(value,0,1-Number.EPSILON):.5;};

export function encounterHabitat(scene){
 if(!scene||scene.randomEncounters===false)return null;
 if(typeof scene.encounterHabitat==='string')return scene.encounterHabitat;
 // Mara's home stays a refuge. Iona's flooded origin shelter is an intentional
 // exception: the infestation belongs to that historical worksite, not a clinic.
 if(scene.originId){if(scene.originId==='sable-reed'&&scene.originPart===0)return null;return ORIGIN_HABITATS[scene.originId]||'meadow';}
 if(SAFE_KEYS.has(scene.key)||String(scene.key).startsWith('secret_'))return null;
 if(scene.biome){if(/_4$/.test(scene.key)||/\bSanctuary\b/i.test(scene.title||''))return null;return BIOME_HABITATS[scene.biome.id||scene.biome]||'meadow';}
 if(ROOM_HABITATS[scene.key])return ROOM_HABITATS[scene.key];
 if(scene.interior==='cistern')return 'sewer';
 if(scene.interior==='archive')return 'archive';
 if(isInteriorScene(scene))return null;
 if(['bridge','station','platform'].includes(scene.key))return 'foundry';
 if(['river','bypass'].includes(scene.key))return 'wetland';
 if(['forest','grove'].includes(scene.key))return 'woodland';
 if(['summit','storm_anchorage','catwalk'].includes(scene.key))return 'highland';
 if(scene.key==='town')return 'meadow';
 return FIELD_HABITATS[clamp(Math.floor(scene.chapter||1)-1,0,23)];
}

export function encounterProfile(scene,state={}){
 const habitat=encounterHabitat(scene),indoor=!!scene&&isInteriorScene(scene),first=!(state.fieldEncounters?.hasBattled||state.fieldEncounters?.serial>0);
 const tier=scene?.originId||scene?.fieldOrigin!==undefined?1:clamp(Math.min(scene?.chapter||state.chapter||1,state.chapter||1),1,24);
 return {habitat,indoor,tier,first,minTiles:first?5:indoor?24:18,maxTiles:first?9:indoor?40:32,danger:!habitat?'safe':indoor?'infested interior':'wild ground',maxEnemies:tier<=2?1:tier<=6?2:3};
}

function encounterLedger(state){
 const prior=state.fieldEncounters;
 if(!prior||prior.version!==1||typeof prior!=='object'||Array.isArray(prior)||!Number.isFinite(prior.serial)||prior.serial<0)state.fieldEncounters={version:1,serial:0,hasBattled:false,remaining:null,grace:0,lastScene:null,travelled:0,warned:false};
 const ledger=state.fieldEncounters;
 ledger.serial=Math.floor(clamp(ledger.serial,0,1e9));
 ledger.hasBattled=ledger.hasBattled===true;ledger.warned=ledger.warned===true;
 if(!Number.isFinite(ledger.grace)||ledger.grace<0)ledger.grace=0;
 if(!Number.isFinite(ledger.travelled)||ledger.travelled<0)ledger.travelled=0;
 if(!Number.isFinite(ledger.remaining)||ledger.remaining<0||ledger.remaining>100)ledger.remaining=null;
 return ledger;
}

/** Call after any battle outcome, retreat or scene transition. Door transitions
 * keep the encounter budget; battle outcomes draw a fresh, longer interval. */
export function resetEncounterGrace(world,reason='battle'){
 if(!world?.state)return;
 const ledger=encounterLedger(world.state);
 if(reason==='scene'){ledger.grace=Math.max(ledger.grace,2.5);ledger.lastScene=world.state.scene;return;}
 ledger.hasBattled=true;ledger.remaining=null;ledger.warned=false;
 ledger.grace=reason==='retreat'?10:reason==='defeat'?12:6;
}

export function encounterProtected(world){
 const scene=world.scene,s=world.state;if(!scene||!s)return true;
 const near=(o,r)=>Array.isArray(o.xy)&&Math.hypot(s.x-o.xy[0]-.5,s.y-o.xy[1]-.5)<r;
 if((scene.doors||[]).some(o=>near(o,1.1)))return true;
 return (scene.objects||[]).some(o=>o.type==='portal'?near(o,1.1):['npc','guide','shop','camp','transport','frontier-board'].includes(o.type)&&near(o,1.15));
}

/** Return an encounter descriptor for the caller to start through the existing
 * battle flow. `distance` must be the change in the player's real world position
 * during this update, after collisions and route following have been applied. */
export function advanceEncounters(world,distance,{dt=0,rng=Math.random,onWarning=()=>{}}={}){
 if(!world?.state||world.state.mode!=='field'||!world.scene)return null;
 const s=world.state,profile=encounterProfile(world.scene,s);
 if(!profile.habitat||!Number.isFinite(distance)||distance<=1e-5||distance>1.25)return null;
 // A bounded game frame cannot contain a jump across a room. Reject imported
 // positions and portals instead of treating them as several walked tiles.
 if(dt>0&&distance>Math.max(.3,clamp(dt,0,.25)*6))return null;
 const ledger=encounterLedger(s);
 if(ledger.lastScene!==s.scene){ledger.lastScene=s.scene;ledger.grace=Math.max(ledger.grace,2.5);}
 const beforeGrace=ledger.grace;ledger.grace=Math.max(0,ledger.grace-distance);
 if(encounterProtected(world))return null;
 if(ledger.remaining===null)ledger.remaining=profile.minTiles+random(rng)*(profile.maxTiles-profile.minTiles);
 const ecologyPace=Number(world.livingAtlas?.encounterPace?.()??1);
 const consumed=distance*(Number.isFinite(ecologyPace)?clamp(ecologyPace,.65,1.3):1);
 ledger.travelled+=distance;ledger.remaining=Math.max(0,ledger.remaining-consumed);
 if(ledger.remaining<=3&&!ledger.warned){ledger.warned=true;onWarning({habitat:profile.habitat,indoor:profile.indoor,text:profile.indoor?'Scratching nearby · creatures are stirring.':'Movement nearby · creatures are closing in.'});}
 if(ledger.remaining>0||beforeGrace>distance)return null;
 ledger.serial++;ledger.hasBattled=true;ledger.remaining=null;ledger.warned=false;ledger.grace=6;
 const count=profile.maxEnemies===1?1:1+Math.floor(random(rng)*profile.maxEnemies);
 const seed=Math.floor(random(rng)*0x7fffffff),xy=[Math.floor(s.x),Math.floor(s.y)];
 return {type:'wild',randomEncounter:true,habitat:profile.habitat,tier:profile.tier,indoor:profile.indoor,count,serial:ledger.serial,seed,xy,enemies:Array.from({length:count},(_,i)=>['wild',[xy[0]+1+i%2,xy[1]+Math.floor(i/2)]]),text:profile.indoor?'Creatures stir among the abandoned tools. Watch their attack marks and step aside.':'The local creatures close in. Watch their attack marks and step aside.'};
}
