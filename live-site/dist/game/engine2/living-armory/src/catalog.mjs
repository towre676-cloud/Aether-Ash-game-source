/** Ash & Aether: Clay and Water — Armory item lexicon.
 * Pure data, no host globals. Names, powers and factions are original to this project.
 */
export const SLOT_LABELS = Object.freeze({head:'Crown',shoulders:'Mantle',chest:'Cuirass',hands:'Grasp',legs:'Greaves',feet:'Treads',mainhand:'Main Hand',offhand:'Off Hand',neck:'Amulet',ring1:'Ring',ring2:'Ring',relic:'Relic',sigil:'Sigil'});
export const SLOT_GROUPS = Object.freeze({head:'head',shoulders:'shoulders',chest:'chest',hands:'hands',legs:'legs',feet:'feet',mainhand:'mainhand',offhand:'offhand',neck:'neck',ring1:'ring',ring2:'ring',relic:'relic',sigil:'sigil'});
export const EQUIP_SLOTS = Object.freeze(Object.keys(SLOT_LABELS));
export const RARITIES=Object.freeze(['common','uncommon','rare','epic','legendary','mythic']);
export const RARITY_COLORS=Object.freeze({common:'#bdc5c8',uncommon:'#6fc09b',rare:'#65bff0',epic:'#ca8cff',legendary:'#efb869',mythic:'#ff9286'});
export const RARITY_LABELS=Object.freeze({common:'Worn',uncommon:'Fine',rare:'Rare',epic:'Exalted',legendary:'Legendary',mythic:'Mythwoven'});
export const REGIONS=Object.freeze([
 {id:'orchard',name:'The Black Orchard',material:'living wood',element:'verdant',climate:'overgrown',icon:'❧',resonance:0.26,shielding:0.30},
 {id:'ash',name:'The Ember March',material:'cinder glass',element:'ember',climate:'volcanic',icon:'✵',resonance:0.35,shielding:0.13},
 {id:'water',name:'The Drowned Wells',material:'tideglass',element:'tide',climate:'submerged',icon:'◈',resonance:0.40,shielding:0.46},
 {id:'aether',name:'The Sky-Engine Ruins',material:'star iron',element:'aether',climate:'stormcharged',icon:'✦',resonance:0.64,shielding:0.19},
 {id:'clay',name:'The Sleeping Kilns',material:'red clay',element:'stone',climate:'dustbound',icon:'◉',resonance:0.22,shielding:0.64},
 {id:'hollow',name:'The Hollow Cathedral',material:'echo bone',element:'echo',climate:'haunted',icon:'✣',resonance:0.72,shielding:0.34},
 {id:'glade',name:'Mossback Wilds',material:'rootstone',element:'verdant',climate:'rainwood',icon:'✿',resonance:0.28,shielding:0.50},
 {id:'bellrun',name:'The Bellrun Causeway',material:'bell bronze',element:'echo',climate:'windswept',icon:'♧',resonance:0.47,shielding:0.22}
]);
export const ENEMIES=Object.freeze([
 {id:'cinderstag',name:'Cinderstag',kind:'beast',region:'ash',level:8,body:'horns',shield:'slag hide',shielding:0.36,icon:'♞',tags:['beast','ember'],signature:'ember'},
 {id:'mossback',name:'Mossback Warden',kind:'guardian',region:'glade',level:13,body:'shell',shield:'root-and-stone mantle',shielding:0.70,icon:'♜',tags:['guardian','verdant','stone'],signature:'verdant'},
 {id:'wellwraith',name:'Wellwraith',kind:'specter',region:'water',level:17,body:'veil',shield:'water refraction',shielding:0.57,icon:'♢',tags:['specter','tide'],signature:'tide'},
 {id:'glasschoir',name:'Glass Choir',kind:'construct',region:'aether',level:24,body:'prism',shield:'harmonic interference',shielding:0.48,icon:'✧',tags:['construct','aether','echo'],signature:'aether'},
 {id:'kilnbound',name:'Kilnbound Colossus',kind:'guardian',region:'clay',level:31,body:'plate',shield:'ceramic strata',shielding:0.82,icon:'♟',tags:['guardian','stone','ember'],signature:'stone'},
 {id:'sablecantor',name:'Sable Cantor',kind:'boss',region:'hollow',level:38,body:'choral',shield:'refracted lament',shielding:0.76,icon:'♛',tags:['boss','echo'],signature:'echo',boss:true},
 {id:'orchardmoth',name:'Orchard Moth Queen',kind:'elite',region:'orchard',level:12,body:'wings',shield:'pollen screen',shielding:0.25,icon:'❦',tags:['elite','verdant'],signature:'verdant',elite:true},
 {id:'bellrunner',name:'Bronzebell Harrier',kind:'elite',region:'bellrun',level:20,body:'sinew',shield:'ringing armor',shielding:0.35,icon:'♞',tags:['elite','echo'],signature:'echo',elite:true}
]);
// Extended 144-base repertoire. Every base participates in the same stat/geometry/loot rules.
const EXTENDED_BASES = [
 ['head','helm','armor',2,2,'Briarwatch Sallet|Sevenfold Armet|Furnace Knight Helm|Gloaming Mask|Tarnished Warhelm|Porcelain Faceguard|Starlit Casque|Belltower Cabasset'],
 ['head','crown','focus',2,2,'Vesper Circlet|Crown of Unheard Bells|Raincall Tiara|Memory Filigree|Argent Antlers|Aurelian Coronet|Kiln Regent Crown|Dawnless Halo'],
 ['shoulders','pauldrons','armor',2,2,'Cathedral Spaulders|Ironbark Guardians|Drowned Bulwarks|Oathkeeper Pauldrons|Bellmetal Tassets|Glasswing Mantlets|Mako Lamellae|Wayfarer Scapula'],
 ['shoulders','mantle','ward',2,2,'Saffron Echo Drape|Moonweave Shoulders|Thornsong Shawl|Brokensky Pallium|Tidewind Capelet|Censerwing Shroud|First-Frost Mantle|Duskborne Collar'],
 ['chest','armor','armor',2,3,'Wellspring Aegis|Gloamplate Carapace|Briarheart Hauberk|Sky-Furnace Plate|Tenth Bell Harness|Shardbound Mail|Choir-Silence Brigandine|Monolith Cuirass'],
 ['chest','robe','focus',2,3,'Weeping Cowl Robes|Candlewick Vestments|Starneedle Regalia|Orchards Last Rain|Memory Loom Vest|Cloudglass Surcoat|Vesper Communion|Ash-Priest Raiment'],
 ['hands','gauntlet','precision',2,2,'Cinderwright Mitts|Choirglass Claws|Vowkeeper Fingers|Stonecarver Grips|Wispthread Wraps|Embergrasp Talons|Rainbinder Hands|Mothwing Knuckles'],
 ['legs','legs','armor',2,3,'Belltower Chausses|Sableleaf Leggings|Riverstone Tassets|Skyshard Legguards|Caravan Sollerets|Gilded Thighplates|Widowreed Trouserguard|Frostglass Cuisses'],
 ['feet','boots','haste',2,2,'Starwalker Treads|Sunken Pilgrim Boots|Ashbound Walkers|Bellrunner Spurs|Clayshore Greaves|Dreamroot Sandals|Hollowwake Boots|Cloudbreak Sabatons'],
 ['mainhand','sword','attack',2,4,'Choirbreaker|Anvil of Wishes|Watershed Blade|Gloamrend|Briarcleaver|First Candle Sword|Vesper Requiem|Last Crossing'],
 ['mainhand','spear','pierce',2,4,'Wellsong Pike|Rift-Tender Lance|Orchard Harpoon|Skybreak Trident|Kilnspur Halberd|Saltglass Partisan|Bellstrike Javelin|Thorn Prophet'],
 ['mainhand','staff','focus',2,4,'Harmonic Conductor|Flood Oracle Staff|Ashen Observatory|Root-Loom Rod|Sepulchre Writ|Starlit Crook|Lament Spindle|Moonwater Pillar'],
 ['offhand','shield','block',2,3,'Cinderwall|Grovekeeper Shield|Riftglass Parry|Belltower Defender|Wellspring Mirror|Kilnkeeper Bulwark|Clay Cathedral Aegis|Mourners Rampart'],
 ['offhand','tome','ward',2,2,'Atlas of Drowned Roads|Codex of Seven Lives|Sable Canticle|Mako Constraint Folio|Furnace Almanac|Choir Recursion|Grimoire of Weather|Hollow Testament'],
 ['neck','amulet','resonance',1,1,'Tide-Sister Amulet|Ashfall Reliquary|First Clay Pendant|Sovereign Chime|Sparrowglass Rosary|Fallen Star Charm|Ocean of Voices|Perennial Vow'],
 ['ring','ring','precision',1,1,'Seven-Vow Band|Emberthread Loop|Glass Reed Ring|Last Ferryman Signet|Bell-Struck Seal|Moss-Crowned Circle|Salt-Cure Ring|Comets Return'],
 ['relic','relic','resonance',2,2,'Asterion Fragment|Living Kiln Heart|Stolen Overture|Sleeping Rain Jar|Root-Crystal Vessel|Moonsong Prism|Seventh Censer|Never-Tolled Bell'],
 ['sigil','sigil','focus',1,1,'Glyph of the First Song|Oath of Seven Kingdoms|Wellspring Tattoo|Interlaced Timelines|Echo Breaker Seal|Harvesting Covenant|Mako Resonator|The Unchosen Path']
].flatMap(([slot,icon,primary,w,h,names])=>names.split('|').map(name=>({slot,icon,primary,w,h,name})));

export const EQUIPMENT_BASES = Object.freeze([
 ['head','Warden Helm','helm','armor',2,2],['head','Ashen Diadem','crown','focus',2,2],['head','Pilgrim Hood','hood','ward',2,2],['head','Songkeeper Visor','visor','precision',2,2],
 ['shoulders','Rootbound Pauldrons','pauldrons','armor',2,2],['shoulders','Murmuring Mantle','mantle','ward',2,2],['shoulders','Wings of Cinders','pauldrons','haste',2,2],
 ['chest','Gilded Brigandine','armor','armor',2,3],['chest','Tidewoven Robes','robe','ward',2,3],['chest','Cinderplate Harness','armor','vigor',2,3],['chest','Starweft Coat','robe','focus',2,3],
 ['hands','Bellglass Gauntlets','gauntlet','precision',2,2],['hands','Kilnforged Grips','gauntlet','armor',2,2],['hands','Mothsilk Gloves','glove','haste',2,2],
 ['legs','Mossguard Chausses','legs','armor',2,3],['legs','Singing Legwraps','legs','focus',2,3],['legs','Trailwatch Cuisses','legs','vigor',2,3],
 ['feet','Rootwalker Sabatons','boots','armor',2,2],['feet','Hollowstep Boots','boots','haste',2,2],['feet','Tidepath Sandals','boots','ward',2,2],
 ['mainhand','Lastlight Greatsword','sword','attack',2,4],['mainhand','Kilnbreaker Maul','hammer','attack',2,4],['mainhand','Sparrowthorn Blade','sword','precision',1,3],['mainhand','Reedwhisper Spear','spear','pierce',2,4],['mainhand','Furnace Axe','axe','attack',2,3],['mainhand','Skyline Bow','bow','precision',2,4],['mainhand','Hymnal Staff','staff','focus',2,4],['mainhand','Tidemender Scepter','scepter','resonance',1,3],['mainhand','Orchard Glaive','spear','pierce',2,4],
 ['offhand','Mirror Aegis','shield','block',2,3],['offhand','Clay Bastion','shield','armor',2,3],['offhand','Vesper Lantern','lantern','resonance',2,2],['offhand','Resonant Codex','tome','focus',2,2],['offhand','Mourning Dagger','dagger','precision',1,2],
 ['neck','Ashlight Pendant','amulet','resonance',1,1],['neck','Watermemory Locket','amulet','ward',1,1],['neck','Orchard Talisman','amulet','vigor',1,1],
 ['ring','Saltglass Band','ring','ward',1,1],['ring','Cantor Signet','ring','focus',1,1],['ring','Kiln Promise','ring','armor',1,1],['ring','Lifetide Loop','ring','vigor',1,1],
 ['relic','Vessel of First Rain','relic','resonance',2,2],['relic','Furnace Heart','relic','attack',2,2],['relic','Ossuary Bell','relic','echo',2,2],['relic','Orchard Hourglass','relic','haste',2,2],
 ['sigil','Seal of the Unfinished Song','sigil','resonance',1,1],['sigil','Bellrun Mark','sigil','haste',1,1],['sigil','Mako Conduit','sigil','focus',1,1],['sigil','Guardian Oath','sigil','ward',1,1]
].map(([slot,name,icon,primary,w,h],i)=>Object.freeze({id:`base_${i}`,slot,name,icon,primary,w,h})).concat(EXTENDED_BASES.map((base,i)=>Object.freeze({...base,id:`base_extra_${i}`}))));
export const MATERIALS=Object.freeze([
 ['ash','Cindersteel','ember',1.06],['water','Tideglass','tide',1.03],['clay','Kiln-Bronze','stone',1.12],['aether','Astral Silver','aether',1.1],
 ['orchard','Living Yew','verdant',1.05],['hollow','Choirbone','echo',1.08],['glade','Moss-Opal','verdant',1.09],['bellrun','Bell Brass','echo',1.04]
].map(([region,name,element,mult])=>Object.freeze({region,name,element,mult})));
export const PREFIXES=Object.freeze([
 ['Vigorous','vigor',3],['Peerless','precision',3],['Enkindled','attack',4],['Unbroken','armor',6],['Harmonic','resonance',4],
 ['Guarded','ward',4],['Swift','haste',3],['Rending','pierce',3],['Devouring','leech',2],['Telltale','discovery',3],
 ['Blazing','ember',5],['Floodbound','tide',5],['Thornwrought','verdant',5],['Prismatic','aether',5],['Resounding','echo',5],['Earthen','stone',5]
].map(([name,stat,value])=>Object.freeze({name,stat,value})));
export const SUFFIXES=Object.freeze([
 ['the First Bell','echo',7],['the Last Orchard','verdant',7],['Emberwake','ember',7],['the Deep Well','tide',7],
 ['the Hidden Sky','aether',7],['the Red Kiln','stone',7],['Veilpiercing','pierce',5],['Unending Steps','haste',5],
 ['the Sentinel','block',6],['the Moonlit Choir','resonance',6],['Second Breath','vigor',5],['the Fox','precision',5]
].map(([name,stat,value])=>Object.freeze({name,stat,value})));
export const SETS=Object.freeze([
 {id:'orchard',name:'Orchard of Ashes',element:'verdant',parts:[2,3,4],bonuses:[{count:2,stat:'vigor',value:16},{count:3,stat:'shielding',value:14},{count:4,stat:'resonance',value:20}],text:'A vanished orchard grows beneath the cinders.'},
 {id:'choir',name:'Canticle of Glass',element:'echo',parts:[2,3,4],bonuses:[{count:2,stat:'focus',value:16},{count:3,stat:'echo',value:20},{count:4,stat:'pierce',value:12}],text:'Every strike rings through the shape of memory.'},
 {id:'kiln',name:'The Unbroken Kiln',element:'stone',parts:[2,3,4],bonuses:[{count:2,stat:'armor',value:26},{count:3,stat:'block',value:14},{count:4,stat:'ward',value:18}],text:'The city was once guarded by patient hands.'},
 {id:'tide',name:'Water Remembers',element:'tide',parts:[2,3,4],bonuses:[{count:2,stat:'ward',value:18},{count:3,stat:'resonance',value:12},{count:4,stat:'leech',value:10}],text:'What sinks below the well is never lost.'},
 {id:'aether',name:'Sky-Engine Covenant',element:'aether',parts:[2,3,4],bonuses:[{count:2,stat:'haste',value:12},{count:3,stat:'aether',value:18},{count:4,stat:'focus',value:24}],text:'A constellation turned into a machine.'},
]);
export const UNIQUES=Object.freeze([
 {id:'u_song',name:'The Unfinished Song',slot:'mainhand',icon:'sword',primary:'attack',w:2,h:4,element:'echo',set:'choir',lore:'The blade does not cut the world. It reminds the world where it was broken.',effect:'harmonic-reprise',effectText:'After a resonant strike, your next different element echoes 32% of its damage.'},
 {id:'u_helm',name:'The Crown That Remembers',slot:'head',icon:'crown',primary:'ward',w:2,h:2,element:'tide',set:'tide',lore:'Each name the city erased is etched along its inner rim.',effect:'memory-ward',effectText:'Shielding gains 18% of your Tide resistance when crossing water.'},
 {id:'u_root',name:'Heartwood of the First Orchard',slot:'chest',icon:'armor',primary:'armor',w:2,h:3,element:'verdant',set:'orchard',lore:'It grows around the wearer without ever touching the skin.',effect:'root-shelter',effectText:'Organic terrain adds 16% to effective protection.'},
 {id:'u_kiln',name:'Oath of the Red Kiln',slot:'offhand',icon:'shield',primary:'block',w:2,h:3,element:'stone',set:'kiln',lore:'Unbroken through seven fires. Unbroken through seven falls.',effect:'unbroken-oath',effectText:'Stone shielding carries 25% of its value into your next turn.'},
 {id:'u_clock',name:'A Minute Before the Flood',slot:'relic',icon:'relic',primary:'haste',w:2,h:2,element:'tide',set:'tide',lore:'It remembers the moment before the tide first rose.',effect:'backwash',effectText:'Every fourth encounter grants a 10% Tide barrier.'},
 {id:'u_eye',name:'Eye of the Asterion',slot:'neck',icon:'amulet',primary:'resonance',w:1,h:1,element:'aether',set:'aether',lore:'A sky-machine looked down and found its reflection.',effect:'sky-convergence',effectText:'Aether resonance multiplies environmental transmission by 1.15.'},
 {id:'u_bell',name:'The Bell Without a Tower',slot:'relic',icon:'relic',primary:'resonance',w:2,h:2,element:'echo',set:'choir',lore:'When it rings, every closed door remembers opening.',effect:'hollow-bell',effectText:'Echo attacks ignore 18% of harmonic shielding.'},
 {id:'u_sigil',name:'A Map of Unlived Lives',slot:'sigil',icon:'sigil',primary:'focus',w:1,h:1,element:'aether',set:'aether',lore:'Seven roads run through the same impossible morning.',effect:'second-timeline',effectText:'New Game Plus carries one additional attuned memory into the next world.'},
 {id:'u_gloves',name:'Hands of the Bellfounder',slot:'hands',icon:'gauntlet',primary:'precision',w:2,h:2,element:'echo',set:'choir',lore:'Their fingerprints make the metal sing.',effect:'founders-touch',effectText:'Breakable harmonic defenses lose 12% cohesion on precise strikes.'},
 {id:'u_boots',name:'The Long Way Home',slot:'feet',icon:'boots',primary:'haste',w:2,h:2,element:'verdant',set:'orchard',lore:'Every road is an old path if you listen to the ground.',effect:'living-stride',effectText:'Gain +16 grip on rooted terrain; patrol detection drops 8%.'},
 {id:'u_ring',name:'Seven Times the Water',slot:'ring',icon:'ring',primary:'ward',w:1,h:1,element:'tide',set:'tide',lore:'The seventh ripple arrives before the stone.',effect:'seven-waves',effectText:'A defended Tide hit returns 10% ward to its wielder.'},
 {id:'u_bow',name:'Where the Stars Fell',slot:'mainhand',icon:'bow',primary:'precision',w:2,h:4,element:'aether',set:'aether',lore:'No string is tied to it; the heavens bend between its horns.',effect:'falling-stars',effectText:'Long-range Aether attacks pierce 15% additional cover.'}
]);
export const STAT_LABELS=Object.freeze({attack:'Attack',armor:'Armor',ward:'Ward',vigor:'Vitality',precision:'Precision',focus:'Focus',haste:'Haste',block:'Block',pierce:'Piercing',resonance:'Resonance',leech:'Leech',discovery:'Discovery',shielding:'Shielding',ember:'Ember',tide:'Tide',aether:'Aether',verdant:'Verdant',echo:'Echo',stone:'Stone'});
export const ELEMENTS=Object.freeze(['ember','tide','aether','verdant','echo','stone']);
/** Socketable sigils: two distinct gameplay archetypes per element. */
export const RUNES=Object.freeze([
 {id:'ember_fang',name:'Furnace Fang',element:'ember',stat:'attack',symbol:'✵',text:'Ash-fed offense and Ember attunement'},
 {id:'ember_guard',name:'Hearth Seal',element:'ember',stat:'armor',symbol:'♜',text:'Heat-hardened defense'},
 {id:'tide_mirror',name:'Well Mirror',element:'tide',stat:'ward',symbol:'◈',text:'Water-borne warding'},
 {id:'tide_flow',name:'River Pulse',element:'tide',stat:'haste',symbol:'≋',text:'Movement that follows the currents'},
 {id:'verdant_root',name:'Rootheart',element:'verdant',stat:'vigor',symbol:'❧',text:'Living endurance'},
 {id:'verdant_bloom',name:'Orchard Bloom',element:'verdant',stat:'leech',symbol:'✿',text:'Recovery after impact'},
 {id:'aether_lens',name:'Sky Lens',element:'aether',stat:'precision',symbol:'✧',text:'Unbroken sightlines'},
 {id:'aether_star',name:'Star Conduit',element:'aether',stat:'focus',symbol:'✦',text:'Stored aetheric potential'},
 {id:'echo_bell',name:'Bell Tongue',element:'echo',stat:'resonance',symbol:'♧',text:'Harmonic transmission'},
 {id:'echo_hush',name:'Silent Canticle',element:'echo',stat:'discovery',symbol:'✣',text:'Resonant discoveries'},
 {id:'stone_oath',name:'Kiln Oath',element:'stone',stat:'shielding',symbol:'◉',text:'Environmental cover'},
 {id:'stone_edge',name:'Claybreaker',element:'stone',stat:'pierce',symbol:'◆',text:'Breaks layered natural armor'}
]);

