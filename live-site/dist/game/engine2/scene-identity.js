/** Room identity belongs to the authored story location, never the outdoor colour palette. */
const OUTDOOR_KEYS=new Set(['town','market','bridge','river','bypass','catwalk','forest','grove','summit','field','refugee_gate','storm_anchorage','hub']);
export function sceneInteriorIdentity(scene){
 if(scene.originId)return scene.originIndoor?'origin':null;
 if(scene.biome)return null;
 if(scene.chapter===5&&['east','west'].includes(scene.key))return 'archive';
 if(scene.household)return scene.household.kind;
 if(scene.interior)return scene.interior;
 if(['east','west'].includes(scene.key))return null;
 return OUTDOOR_KEYS.has(scene.key)?null:'building';
}
export function isInteriorScene(scene){return sceneInteriorIdentity(scene)!==null;}
