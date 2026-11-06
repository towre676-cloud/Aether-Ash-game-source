/** Original generated art textures baked locally. No remote fetch, renderer or gameplay RNG. */
const ART_TYPES = new Set(['sword','spear','axe','bow','shield','crown','helm','hood','armor','robe','mantle','legs','boots','ring','relic','scepter','sigil']);
export function itemArt(icon){return ART_TYPES.has(icon)?`assets/items/${icon}.webp`:null}

// The armament view is a local illustration. Separate forged, wooden, leather
// and crystalline pieces keep its construction legible at rack and altar sizes.
const WEAPONS={
 sword:{
  silhouette:'M64 7 74 29 71 109 77 117 92 116 99 124 85 128 72 125 70 156 76 164 70 176 58 176 52 164 58 156 56 125 43 128 29 124 36 116 51 117 57 109 54 29Z',
  steel:'M64 7 74 29 71 109 64 120 57 109 54 29Z',
  bevel:'M64 7 64 119 57 109 54 29Z M68 33 71 30 68 106 65 112Z',
  bronze:'M51 116 57 110 64 120 71 110 77 116 91 114 98 123 85 127 72 123 70 130 58 130 56 123 43 127 30 123 37 114Z M58 153H70V159H58Z M58 160 64 156 70 160 75 165 69 176H59L53 165Z',
  leather:'M59 129H69L68 153H60Z',
  bindings:'M59 132 69 136M59 138 69 142M60 144 68 148M60 150 68 153',
  grain:'M61 35 59 98M68 38 67 96M61 52H66M61 77H66',
  etch:'M64 28V103M57 110 64 114 71 110M37 120 47 120 54 119M74 119 81 120 91 120M58 165 64 171 70 165',
  gem:'M64 115 69 121 64 128 59 121Z',
  facets:'M64 115V128M59 121H69M64 115 66 122 64 128',
  pins:[[42,120],[86,120],[64,163]]
 },
 spear:{
  silhouette:'M64 3 79 30 73 43 86 38 78 52 69 56 68 67 67 166 71 177 64 186 57 177 61 166 60 67 59 56 50 52 42 38 55 43 49 30Z',
  wood:'M61 57H67L66 169H62Z',
  steel:'M64 3 79 30 72 44 85 39 77 51 68 55 64 61 60 55 51 51 43 39 56 44 49 30Z M62 169H66L69 177 64 184 59 177Z',
  bevel:'M64 3V60L60 55 51 51 43 39 56 44 49 30Z M64 169V184L59 177 62 169Z',
  bronze:'M59 55H69V61H59Z M60 65H68V70H60Z M61 126H67V131H61Z M61 163H67V169H61Z',
  leather:'M61 91H67V126H61Z',
  bindings:'M61 94 67 98M61 101 67 105M61 108 67 112M61 115 67 119M61 122 67 126',
  grain:'M63 72 62.5 89M65 133 64.5 161',
  etch:'M64 15 59 30 64 45 69 30Z M54 44 61 48M74 44 67 48M61 58H67M62 67H66',
  gem:'M64 31 68 39 64 49 60 39Z',
  facets:'M64 31V49M60 39H68',
  pins:[[64,58],[64,128],[64,166]]
 },
 axe:{
  silhouette:'M60 23 64 14 68 23 68 31Q88 34 98 17L109 18Q122 43 112 73L100 82Q89 61 69 61L66 162 71 173 67 181H60L55 173 60 161 58 62Q39 59 25 80L14 73Q6 46 17 18L29 17Q38 34 58 31Z',
  wood:'M59 29H68L66 167H60Z',
  steel:'M60 33Q40 35 28 19L18 20Q9 46 16 70L25 77Q39 56 60 59Z M68 33Q89 36 99 19L108 20Q119 44 110 70L100 78Q88 57 68 59Z',
  bevel:'M18 20Q10 46 16 70L25 77 25 69Q18 46 27 23L28 19Z M108 20Q119 44 110 70L100 78 101 69Q109 44 100 23L99 19Z',
  bronze:'M58 29H70V37H58Z M58 57H69V66H58Z M59 105H67V112H59Z M59 158H67V166H59Z M60 23 64 15 68 23 67 28H61Z M60 166H66L70 173 66 181H60L56 173Z',
  leather:'M60 112H67L66 157H60Z',
  bindings:'M60 116 67 122M60 125 67 131M60 134 67 140M60 143 66 149M60 152 66 157',
  grain:'M62 71 61.5 103M65 72 64 102',
  etch:'M27 28Q37 43 54 42M25 36Q33 48 50 48M23 48Q35 55 47 52M101 28Q90 43 74 42M103 36Q96 48 78 48M105 48Q93 55 82 52M60 61H67',
  gem:'M64 37 72 46 64 57 56 46Z',
  facets:'M64 37V57M56 46H72M64 37 67 47 64 57',
  pins:[[34,40],[94,40],[63,108],[63,162]]
 },
 hammer:{
  silhouette:'M57 14H71V23H100L108 18 119 24V64L108 70 100 65H71L67 165 72 174 67 183H60L55 174 60 165 57 65H28L20 70 9 64V24L20 18 28 23H57Z',
  wood:'M59 60H69L66 166H61Z',
  steel:'M20 24H108V64H20Z M10 26 20 21 29 27V60L20 67 10 62Z M99 27 108 21 118 26V62L108 67 99 60Z',
  bevel:'M20 24H108L100 31H28Z M10 26 20 21V67L10 62Z M108 21 118 26V62L108 67Z M27 58H100L108 64H20Z',
  bronze:'M56 18H72V70H56Z M28 26H34V62H28Z M94 26H100V62H94Z M59 101H68V108H59Z M60 159H67V166H60Z M61 166H66L71 174 66 183H61L56 174Z',
  leather:'M60 108H68L66 158H61Z',
  bindings:'M60 112 68 118M60 122 67 128M61 132 67 138M61 142 67 148M61 152 66 157',
  grain:'M62 73V98M65 75 64 99',
  etch:'M39 32 46 39 39 46 46 53M89 32 82 39 89 46 82 53M15 29V58M113 29V58M58 22H70M58 67H70',
  gem:'M64 30 74 43 64 58 54 43Z',
  facets:'M64 30V58M54 43H74M64 30 68 44 64 58',
  pins:[[31,32],[31,56],[97,32],[97,56],[64,22],[64,67]]
 },
 bow:{
  silhouette:'M87 7 98 11 89 25Q58 41 53 66L57 77 53 88Q58 120 89 141L98 157 86 162 78 146Q37 130 35 90L42 77 35 64Q38 29 78 20Z',
  wood:'M87 8 96 12 86 26Q57 42 51 66L56 77 51 88Q56 119 86 140L96 156 87 161 78 145Q40 128 37 90L43 77 37 64Q40 30 79 21Z',
  bronze:'M78 21 87 8 96 12 86 26Z M87 161 78 145 86 140 96 156Z M38 57 51 59 51 66 56 77 51 88 51 95 39 97 37 89 43 77 37 64Z M50 43 58 48 54 54 45 50Z M46 106 54 102 59 110 51 116Z',
  steel:'M29 78 112 74 105 81 112 88 29 83Z M111 74 122 80 111 88 113 81Z',
  bevel:'M30 78 112 75 119 80 29 81Z',
  leather:'M39 64 49 66 53 77 49 88 40 90 44 77Z',
  bindings:'M39 67 50 71M41 74 52 78M42 82 50 86',
  grain:'M81 27Q48 43 44 58M45 97Q48 125 80 140M82 31Q57 44 51 57M51 99Q58 125 82 136',
  etch:'M82 16 89 18M83 151 90 152M45 60 48 64M45 92 47 96M31 79 39 82',
  gem:'M46 69 53 77 46 86 39 77Z',
  facets:'M46 69V86M39 77H53',
  cord:'M89 17 57 78 89 151',
  pins:[[83,22],[84,145],[51,47],[53,109]]
 },
 staff:{
  silhouette:'M64 3 75 19 76 33Q88 28 88 14L93 23Q93 43 75 50L69 59 68 170 72 180 67 188H60L56 180 60 170 58 59 52 50Q35 43 35 23L41 14Q41 29 52 33L53 19Z',
  wood:'M59 50H68L66 172H61Z',
  steel:'M61 172H66L70 180 66 187H61L57 180Z',
  bronze:'M54 39Q41 34 41 17L36 24Q36 43 54 48L58 58H70L74 48Q92 43 92 24L87 17Q87 34 74 39L70 45H58Z M55 47H73V53H55Z M58 57H70V62H58Z M60 91H68V98H60Z M60 135H67V142H60Z M60 165H67V173H60Z M60 23 64 18 68 23 68 39 64 45 60 39Z',
  bevel:'M61 172V186L57 180Z M36 24Q37 40 53 46L55 48 54 42Q41 37 41 17Z M87 17Q87 34 74 39L70 45 74 48Q92 42 92 24Z',
  leather:'M60 99H68L67 134H60Z',
  bindings:'M60 101 68 107M60 109 68 115M60 117 68 123M60 125 67 131',
  grain:'M62 64 61.5 89M65 64 64.5 89M62 144 62.5 163M65 144 64.5 163',
  etch:'M42 31 46 37M85 31 81 37M58 50H70M61 59H67M61 94H67M61 138H66M61 168H66',
  gem:'M64 4 74 21 72 36 64 44 55 36 54 21Z',
  facets:'M64 4 61 22 64 44 67 22Z M54 21 61 22 55 36M74 21 67 22 72 36M61 22 67 22M64 4V44',
  pins:[[59,50],[69,50],[64,59],[64,94],[63.5,138],[63.5,168]]
 },
 scepter:{
  silhouette:'M64 13 71 23 79 19 77 29 86 34 82 45 85 56 75 63 70 71 69 141 74 151 70 163H58L54 151 59 141 58 71 53 63 43 56 46 45 42 34 51 29 49 19 57 23Z',
  wood:'M59 67H69L67 143H61Z',
  steel:'M61 144H67L72 152 68 162H60L56 152Z',
  bronze:'M53 29 50 21 59 26 64 15 69 26 78 21 75 29 84 35 78 43 82 55 73 61 68 69H60L55 61 45 55 50 43 44 35Z M57 62H71V70H57Z M59 76H69V83H59Z M60 128H68V135H60Z M60 139H68V146H60Z',
  bevel:'M50 21 59 26 64 15V24L55 35 52 45 57 57 62 63 60 69 55 61 45 55 50 43 44 35 53 29Z M61 146V160L56 152Z',
  leather:'M60 85H68V127H60Z',
  bindings:'M60 89 68 94M60 98 68 103M60 107 68 112M60 116 68 121M60 124 65 127',
  grain:'M62 70V75M65 136V138',
  etch:'M51 35 55 32M77 35 73 32M52 52 57 56M76 52 71 56M59 66H69M61 79H67M61 132H67M60 152 64 157 68 152',
  gem:'M64 26 75 39 73 52 64 60 55 52 53 39Z',
  facets:'M64 26 61 41 64 60 68 41Z M53 39 61 41 55 52M75 39 68 41 73 52M61 41H68',
  pins:[[52,36],[76,36],[57,59],[71,59],[64,79],[64,132]]
 }
};
const FINISHES={ember:['#ffcb92','#d37443','#5c3029'],tide:['#d2f3f4','#6bb9c7','#23495b'],verdant:['#e4efb8','#94b477','#304838'],aether:['#f0e0ff','#ab91d2','#443353'],echo:['#fff0ba','#d6b575','#594932'],stone:['#fff0c6','#c1a374','#514535']};
let illustrationSerial=0;
export function weaponIllustration(item={}){
 const shape=WEAPONS[item.icon]||WEAPONS.sword,[light,mid,dark]=FINISHES[item.element]||FINISHES.stone,id=`weapon-art-${++illustrationSerial}`;
 const part=(d,fill,stroke='#1b1915',width=.7)=>d?`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`:'';
 const material=name=>`url(#${id}-${name})`;
 return `<svg class="weapon-illustration" viewBox="0 0 256 400" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}-metal" x1="0" y1="0" x2="1" y2=".16"><stop stop-color="#353b3d"/><stop offset=".19" stop-color="#8d9696"/><stop offset=".34" stop-color="#dce1d8"/><stop offset=".43" stop-color="#f9f5dd"/><stop offset=".49" stop-color="#788787"/><stop offset=".67" stop-color="#b3beb7"/><stop offset=".87" stop-color="#4f5a5a"/><stop offset="1" stop-color="#c7c9ad"/></linearGradient><linearGradient id="${id}-bronze" x1="0" y1="0" x2="1" y2=".3"><stop stop-color="#413222"/><stop offset=".2" stop-color="#9b7544"/><stop offset=".39" stop-color="#e0c48a"/><stop offset=".48" stop-color="#f4dfab"/><stop offset=".56" stop-color="#81613b"/><stop offset=".78" stop-color="#b38f59"/><stop offset="1" stop-color="#5c432b"/></linearGradient><linearGradient id="${id}-wood" x1="0" y1="0" x2="1" y2=".1"><stop stop-color="#1c1610"/><stop offset=".25" stop-color="#503a24"/><stop offset=".48" stop-color="#947044"/><stop offset=".59" stop-color="#b19665"/><stop offset=".78" stop-color="#49341f"/><stop offset="1" stop-color="#211a13"/></linearGradient><linearGradient id="${id}-leather" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#151918"/><stop offset=".36" stop-color="#3e4a40"/><stop offset=".5" stop-color="#5a6654"/><stop offset=".8" stop-color="#2b352d"/><stop offset="1" stop-color="#111713"/></linearGradient><linearGradient id="${id}-edge" x1="0" y1="0" x2=".65" y2="1"><stop stop-color="#fff9df"/><stop offset=".4" stop-color="#cbd8d3"/><stop offset="1" stop-color="#7a857f"/></linearGradient><radialGradient id="${id}-gem" cx=".29" cy=".2" r=".8"><stop stop-color="#ffffef"/><stop offset=".16" stop-color="${light}"/><stop offset=".44" stop-color="${mid}"/><stop offset=".8" stop-color="${dark}"/><stop offset="1" stop-color="#171d20"/></radialGradient></defs><g transform="translate(0 10) scale(2)" stroke-linejoin="round" stroke-linecap="round">${part(shape.silhouette,'#070c0b','#070c0b',2.6)}${shape.cord?part(shape.cord,'none','#c2b798',.6):''}${part(shape.wood,material('wood'))}${part(shape.steel,material('metal'))}${part(shape.bevel,material('edge'),'#d9d4ba',.25)}${part(shape.bronze,material('bronze'))}${part(shape.leather,material('leather'))}${part(shape.bindings,'none','#c3a77b',.52)}${part(shape.grain,'none','#d2be8e',.32)}${part(shape.etch,'none',light,.48)}${part(shape.gem,material('gem'),'#e1c38d',.65)}${part(shape.facets,'none',light,.4)}${(shape.pins||[]).map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".95" fill="#e3c78e" stroke="#493a24" stroke-width=".35"/><circle cx="${x-.2}" cy="${y-.25}" r=".22" fill="#fff1c7"/>`).join('')}</g></svg>`;
}
