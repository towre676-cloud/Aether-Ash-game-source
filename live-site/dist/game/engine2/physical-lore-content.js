/** Original physical vocabulary. Each object changes a mechanism, not a quest flag. */
const rows=[
['shelter-reed',1,'workshop','town','Bent shelter reed','Common-road waymarker','reed','fit','earth','#e8b879','A bent reed marks a home willing to shelter a stranger.'],
['brake-lantern',2,'refuge','bridge','Brakekeeper’s lantern','Emergency rail signal','lantern','turn','flame','#ee8c64','Face the red aperture toward the marked emergency rail.'],
['survey-float',3,'river','bypass','Survey float','Old flood gauge','float','pump','tide','#73d4dc','Pump water past the filed-off official mark.'],
['wrapped-clapper',4,'bell_crypt','chapel','Wrapped bell clapper','Answering bell','bell','listen','ward','#cab3ed','Ring once, leave a silence, then let the other bell answer.'],
['label-spindle',5,'secret_5','east','Correction spindle','Restoration press','spindle','pump','shade','#d0a6e4','Turn the press until the scraped label can be lifted intact.'],
['grounding-spool',6,'hold','catwalk','Grounding spool','Sky-cable earth point','spool','turn','volt','#e7d478','Align the copper contact with the lightning conductor.'],
['graft-sleeve',7,'grove','forest','Living graft sleeve','Burned orchard stump','graft','grow','mend','#91d69e','Set the sleeve into the split and let a new branch grow.'],
['crown-shard',8,'reactor','summit','Disconnected Crown shard','Furnace isolation socket','crown','turn','earth','#b4c1cb','Turn the broken circuit outward; the old command cannot close.'],
['handprint-tile',9,'lowbank_shelter','field','Lowbank handprint tile','Flood-step latch','tile','fit','ward','#dcb18f','A small hand identifies the lower latch, not the ruler’s seal.'],
['brake-seal',10,'manifest_depot','field','Released brake seal','Locked freight coupling','seal','turn','earth','#cba06b','Set the release mark across the chain instead of along it.'],
['river-measure',11,'flood_spillway','field','Unfiled survey measure','Public water gauge','ruler','pump','tide','#82c9ce','Raise the float against the surviving measurement rings.'],
['blank-nameplate',12,'name_vault','field','Unnumbered nameplate','Name-restoration cradle','plate','fit','shade','#c0a0df','The plate fits without a serial-number notch.'],
['house-hinge',13,'letter_attic','field','Unfinished-house hinge','Common-room doorframe','hinge','pump','earth','#d5ad79','Work the hinge until the unfinished door can open.'],
['listening-shell',14,'echo_chamber','field','Unsealed listening shell','Glass answer horn','shell','listen','mend','#8ed2e2','Sound leaves the horn; leave time for an answer from outside.'],
['road-wedge',15,'refugee_gate','field','Courier’s road wedge','Refuge gate foot','wedge','fit','ward','#d7c399','Hold the gate open without a soldier having to own the key.'],
['bell-fork',16,'resonance_gallery','field','Two-register bell fork','Mountain answering frame','fork','listen','gale','#b8d6b6','The second register enters after the first has room to fade.'],
['star-lens',17,'lens_workshop','field','Walking-star lens','Traveler’s light table','lens','turn','volt','#9ccbe9','Turn the walking-star mark toward the open mountain route.'],
['heat-brick',18,'relief_store','field','Shared-hearth brick','Public warming rail','brick','pump','flame','#ecac7e','Pass warmth along the rail until every waiting bowl steams.'],
['sail-ring',19,'storm_anchorage','field','Passenger sail ring','Freight-to-passenger hoist','ring','turn','gale','#acd9d6','Catch the wind across the hoist, away from the closed cargo line.'],
['witness-seal',20,'witness_vault','field','Uncut witness seal','Public testimony wheel','seal','pump','shade','#d5c09d','Advance the whole witness strip without cutting out a panel.'],
['clay-offcut',21,'pottery_floor','field','Layered clay offcut','Potter’s layer viewer','clay','turn','earth','#d3ac91','Turn the slice until the separate recording layers catch the light.'],
['vent-vane',22,'vent_house','field','Outward vent vane','Mine breathing wheel','vane','turn','gale','#99c6cb','Point the arrow from the shaft toward open air.'],
['assembly-pebble',23,'common_assembly','field','Many-colored assembly pebble','Common-ground mosaic','pebble','grow','mend','#c2d49b','Leave one stone among the others; no single color fills the floor.'],
['empty-reed',24,'listening_chamber','field','Open reed stand','Unfinished answering circle','reed','listen','ward','#dfd1ab','A note, a gap, then an answer. The circle must keep its opening.']
];
export const PHYSICAL_LORE=rows.map(([id,chapter,source,target,name,device,glyph,mode,core,color,meaning],i)=>({id,chapter,source,target,name,device,glyph,mode,core,color,meaning,orientation:1+i%3}));
export const PHYSICAL_VERSION=1;
