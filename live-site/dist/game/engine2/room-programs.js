import {PHYSICAL_LORE} from './physical-lore-content.js';
/** Spatial relationships use actual placed fixtures, rather than repeating a tile stamp. */
export function furnishingFocus(id,kind,box,plan){
 const last=ids=>plan.filter(o=>ids.includes(o.furniture)).at(-1)?.footprint;
 const at=(x,y)=>[box.left+(box.right-box.left)*x,box.top+(box.bottom-box.top)*y];
 if(id===7&&['tailor','optics','printshop','archive'].includes(kind))return at(.4,.45);
 if(id===21&&kind==='tailor'){const loom=last([21]);return loom?[loom.x-3,loom.y+2]:at(.6,.6);}
 if(id===1&&kind==='tailor')return at(.02,.25);
 if(id===2&&['tailor','workshop','instrumentworks','optics'].includes(kind))return at(.02,.6);
 if(id===5&&['assembly','mess','inn'].includes(kind)){const table=last([5]);return table?[table.x-3,table.y+2]:at(.55,.55);}
 let anchor,offset;
 if(id===20){anchor=last([0,11]);offset=[anchor?.w+1,0];}
 else if(id===9){anchor=last([8]);offset=[0,-2];}
 else if(id===19){anchor=last([3]);offset=[anchor?.w+1,0];}
 else if(id===14){anchor=last(kind==='clinic'?[11]:[5,7,8]);offset=[0,anchor?.h+1];}
 else if(id===23){anchor=last([8,23]);offset=[anchor?.w+1,0];}
 else if(id===1){anchor=last([0,11]);offset=[anchor?.w+2,0];}
 if(anchor)return[anchor.x+offset[0],anchor.y+offset[1]];
 if(id===8)return[box.left+(box.right-box.left)*.3,box.top+(box.bottom-box.top)*.35];
 return null;
}
const stories={
 home:[7,'Letters by the family hearth','A shopping list shares the desk with a drawing of a house whose windows are all lit. The folded letters have been kept well away from the kettle.'],
 inn:[7,'Coaching ledger','Arrival times, borrowed blankets and meals owed fill the innkeeper’s book. The last column records which rooms can still take a stranded traveller.'],
 clinic:[10,'Measured remedies','Each jar has a dose, a date and a patient’s name. The stronger preparations stand behind the ordinary road remedies, beyond a child’s reach.'],
 guild:[7,'Common-road accounts','Materials paid for and work still owed occupy separate columns. A repaired bridge is recorded as work shared between several households.'],
 carpenter:[12,'Seasoned timber stock','The dry lengths are marked by grain and intended repair. Small offcuts have been saved for hinges, braces and the next person’s missing chair leg.'],
 instrumentworks:[8,'Soundboard fitting bench','A shaped bridge rests beside a soundboard, with the grain aligned across the join. The reed tools occupy a separate tray so no metal filings enter the wood.'],
 workshop:[8,'Repair bench','A damaged latch is held beside a finished replacement. The bent shelter reed has left the same small mark on the cloth beneath the tools.'],
 console:[7,'Relay duty desk','The rail crew has listed the carriage loads beside the signal times. The emergency instructions are worn at the fold where a thumb would hold them open.'],
 security:[22,'Shift equipment rack','A replacement strap hangs beside a repaired guard’s coat. The shared rack has more hooks than uniforms; the missing workers have not been crossed out.'],
 refuge:[6,'Shelter washing place','Clean water, soap and drying cloths wait beside the sleeping area. A low shelf keeps the cups within reach of a person resting on a cot.'],
 passages:[13,'Flood-marked provisions','A clear tide line crosses the barrel staves. The newer packing stands above that line, with the oldest provisions facing the passage.'],
 chapel:[23,'Answering score','The pencilled rest is longer than the first note. A hand has circled the silence, leaving room for the answering bell instead of filling every beat.'],
 bell_crypt:[23,'Undercroft listening score','The lower register is marked in a different hand. Felt, a tuning note and an empty beat explain how the bells above can hear the crypt answer.'],
 unindexed:[14,'Index reader’s chair','A book holds loose leaves flat across the chair’s arm. These leaves follow names rather than official shelf numbers. The missing entries have been left open for someone who still remembers them.'],
 office:[7,'Sky-line survey desk','Cable lengths are written beside corrections from the crews who walked the line. The newest figures have been added without erasing the earlier error.'],
 hold:[13,'Raised cargo stock','The provisions stand clear of the hull’s damp boards. Their tied labels distinguish goods promised to passengers from freight still waiting for an owner.'],
 sanctuary:[17,'Orchard cuttings','Living cuttings rest in clean soil beside weathered labels. Each label records the place the parent tree grew before the orchard burned.'],
 reactor:[22,'Isolated maintenance gear','The gloves and grounding straps hang on the safe side of the work area. A broken circuit has been traced across the old inspection card.'],
 lowbank_shelter:[5,'Shared shelter table','The small cups sit on the near edge and the hot pot farther back. Someone has cleared a whole place rather than merely adding another bowl.'],
 manifest_depot:[7,'Freight release desk','The release marks cross the locking-chain sketches. Passenger names occupy the margin of a form originally printed only for counting cargo.'],
 flood_spillway:[7,'Spillway measurements','Silt depth and water height are recorded on different scales. The same brass measure has been checked against both before a release is signed.'],
 name_vault:[2,'Names awaiting restoration','The sleeves hold whole names, with the numbering slips kept separately. No blank space has been cut away merely because an official record is missing.'],
 letter_attic:[2,'Unfinished-house letters','A hinge sketch is folded inside a letter about an unfinished common room. The measurements leave enough width for a neighbour carrying a bowl.'],
 echo_chamber:[23,'Listening rest','The score stops before its answer. A small felt pad and an unsealed shell lie beside the stand, ready to let an outside voice enter.'],
 resonance_gallery:[23,'Two-register score','The paired lines leave space between their registers. Pencil marks show where the mountain’s answering note arrives after the first vibration.'],
 lens_workshop:[8,'Traveller’s polishing bench','Fine powder is kept apart from the coarse grit. A finished lens faces a sketched mountain route, with the maker’s mark cut into its padded ring.'],
 relief_store:[19,'Shared-hearth stores','Bowl counts are written beside the fuel allowance. The list measures warmth by the people served, leaving no separate column for important guests.'],
 witness_vault:[7,'Whole testimony desk','The witness strips are weighted flat before anyone copies them. Corrections sit alongside the original words, and no sentence has been clipped to fit a seal.'],
 pottery_floor:[8,'Layered-clay workbench','Dry offcuts reveal earlier recording layers beneath the new clay. The potter has kept each shaving beside the bowl it came from.'],
 vent_house:[9,'Vent maintenance tools','The outlet tools share a rack with a little test ribbon. Chalk arrows lead away from the shaft, following the air that the vane must release.'],
 common_assembly:[5,'Common table','Different cups and repaired chairs surround the same working surface. One place remains clear, with the mosaic pebbles within reach of everyone.'],
 listening_chamber:[23,'Unfinished answering score','The final line has a note, a gap and an unfilled answering phrase. No one has drawn a closing bar across the opening.']
};
const optionalStories=[
 [8,'Reed repair bench','A bent latch is being repaired beside a coil of fine binding wire. The tools have been sorted by the small hands that use them most often.'],
 [20,'Brakekeeper’s bedside cabinet','A folded duty card rests beside a cup of cold tea. The emergency signal is drawn on its back, ready to be found before the next shift.'],
 [7,'Pump maintenance notes','The lowest water mark has been scratched out and measured again. A dry rag covers the handle so the next worker will know it has been checked.'],
 [23,'Vestry bell score','The ringing part ends before the answer begins. The missing beat has been left clear, with no attempt to correct the silence.'],
 [2,'Bookbinder’s drying shelf','Repaired spines dry between weighted boards. One unnumbered binding has been left open so its loose pages can return in the right order.'],
 [5,'Cloudwrights’ mess table','Different cups surround the same loaf. A flight schedule doubles as a placemat, with an extra place cleared for the late cable crew.'],
 [17,'Seedkeeper’s cuttings','Small cuttings stand beside dried seed envelopes. Each envelope keeps the name of its parent tree, including those no longer standing.'],
 [13,'Cooling-water stock','The refill dates are written above an old heat stain. A clean dipper hangs on the cool side, away from the return pipe.'],
 [19,'Lowbank relief pantry','The low shelf carries cups and the high shelf carries sealed provisions. A handprint beside the latch shows who needed to reach it first.'],
 [7,'Signalman’s duty notes','A released coupling is drawn across the margin of the timetable. The next train has been marked for passengers rather than freight.'],
 [13,'Ferryman’s provision barrel','A rope tag records the last crossing and the number of people aboard. The barrel stands above the wet planks where boots are left to dry.'],
 [3,'Registrar’s kitchen range','The supper pot warms beside a bundle of unnumbered slips. A dry shelf keeps the names safely away from the steam.'],
 [0,'Small quilted bed','A small quilt has been finished before the room around it. The spare cloth has become a soft cover for the unfinished wooden rail.'],
 [6,'Glassmaker’s wash basin','Fine glass dust settles beneath a removable bowl. The clean cloths are stored separately from the polishing rags.'],
 [21,'Tailor’s mending loom','A partly mended sleeve waits beside a saved length of thread. The repair follows the old pattern without hiding the place it was torn.'],
 [23,'Mountain listening part','The score marks the first tone and the much later answer. The intervening line is empty, leaving the mountain time to speak.'],
 [8,'Lens polishing workbench','A padded ring holds the lens steady over clean cloth. Fine powder has been set well apart from the grit used for rough shaping.'],
 [7,'Boilerkeeper’s warming notes','The heat allowance is counted in bowls served. A shared-hearth sketch has been added beside the fuel figures.'],
 [21,'Sailmender’s canvas frame','A repaired passenger sail hangs against the frame. Each seam is marked with the wind direction it must carry rather than the weight of freight.'],
 [7,'Witness waiting desk','The clerk has kept each testimony strip whole. The chairs face the same working desk, without a separate place for an important visitor.'],
 [8,'Potter’s drying bench','A damp cloth protects the newest bowl. Dry offcuts are stacked by firing, showing the earlier layers without mixing them into the fresh clay.'],
 [23,'Choir’s breathing score','Breath marks gather around a deliberately empty beat. The singers have pencilled their rests separately from the words.'],
 [8,'Assembly printing bench','Whole witness strips lie beside the printing frame. Corrections are kept in the margin so a new impression need not erase the earlier account.'],
 [23,'Open answering score','The music room’s last page has no closing bar. A reed-shaped mark waits beside the gap where another player can answer.']
];optionalStories.forEach((entry,i)=>stories['secret_'+(i+1)]=entry);
export function dressRoomProgram(scene){
 const h=scene.household;if(!h)return;const entry=stories[scene.key];if(entry){const [id,label,text]=entry,o=h.furnishings.find(o=>o.furniture===id&&!o.supply);if(o&&!o.specialType)Object.assign(o,{label,text,detail:text});}
 // Preserve trade material and the original interaction footprint.
 if(scene.key==='carpenter'){const o=h.furnishings.find(o=>o.furniture===12&&!o.supply);if(o)o.specialType='timber';}
 const marked=new Set();for(const site of scene.householdPhysicalSites||[]){if(!['source','device'].includes(site.physicalRole))continue;const e=PHYSICAL_LORE.find(e=>e.id===site.physicalId);if(!e)continue;const o=h.furnishings.filter(o=>!o.supply&&!marked.has(o.householdId)&&[2,7,8,9,12,22,23].includes(o.furniture)).sort((a,b)=>Math.hypot(a.xy[0]-site.xy[0],a.xy[1]-site.xy[1])-Math.hypot(b.xy[0]-site.xy[0],b.xy[1]-site.xy[1]))[0];if(!o)continue;o.makerMark={id:e.id,glyph:e.glyph,role:site.physicalRole};o.semioticDetail='A small '+e.glyph+' mark is cut into the worn edge. The same shape marks the '+(site.physicalRole==='source'?e.name.toLowerCase():e.device.toLowerCase())+'.';marked.add(o.householdId);}
 h.composition??={};h.composition.authoredStory=!!entry;
}
