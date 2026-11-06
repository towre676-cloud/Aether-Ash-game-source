import {Armory,rollItem} from './living-armory/src/armory.mjs?v=5.33.0';
import {ensureLivingArmory,syncLivingArmoryStats} from './living-armory/campaign.js?v=5.33.0';
import {trailState} from './reconciled-travel.js?v=5.38';
import {isInteriorScene} from './scene-identity.js';

/** Explicit developer fixture. The sole caller is the isolated ?dev=1 portal;
 * none of these items, materials or bonds enter ordinary journey storage. */
export function prepareReconciledPlaytest(world){
 const s=world.state,p=ensureLivingArmory(s),a=new Armory({seedStarter:false}),level=s.heroes[s.party[0]].level;
 a.load(p.snapshot);
 for(const [serial,slot]of ['mainhand','offhand','chest','head','feet','ring','relic','sigil','hands','neck'].entries()){
  const item=rollItem({seed:'combined-content-playtest',eventId:'temporary-practice-kit',serial,level,region:['clay','water','aether','glade'][serial%4],forceRarity:serial%3===0?'epic':'rare',forceSlot:slot});a.grantItem(item);
 }
 a.state.resources={scrap:35,essence:10,starshard:3};p.snapshot=a.snapshot();p.revision++;s.gold=Math.max(s.gold,650);syncLivingArmoryStats(s);
 const t=trailState(s);t.bonded=true;t.care=50;
 if(isInteriorScene(world.scene)){const outside=world.data.scenes.find(r=>r.chapter===world.scene.chapter&&!isInteriorScene(r)&&r.width>=20);if(outside)world.loadScene(outside.location,outside.arrive);}
 world.notice('Combined-content practice: ten gear pieces, forge supplies, and a bonded Mossback. Open Gear or Pause.');
 return {items:10,temporary:true};
}
