import {INTERIOR_ART_FILES} from './environment-interiors-v19.js?v=5.18.1';
import {ARCHITECTURE_V19_FILES} from './environment-architecture-v19.js?v=5.18.1';
import {CANOPY_VARIATION_FILE} from './environment-canopies-v19.js?v=5.18.1';
import {AUTHORED_ART_FILES} from './authored-art.js?v=5.21.0';
import {ENVIRONMENT_ART_FILES} from './environment-art-v17.js?v=5.22.0';
import {ARCHITECTURE_ACCENT_FILE} from './environment-architecture-v17.js?v=5.18.0';
import {ENVIRONMENT_CANOPY_FILE} from './environment-canopies-v17.js?v=5.18.0';
import {ENVIRONMENT_WATER_FILE} from './environment-water-v17.js?v=5.18.0';
import {ENVIRONMENT_SURFACE_FILE} from './environment-materials-v17.js?v=5.18.0';
/** One source of truth for gameplay and visual inspection; original assets stay available. */
const FILES={crew:'crew.webp',creatures:'creatures.webp',terrain:'terrain.webp',run:'crew-run-v2.webp',starter:'sable-starter.webp',home:'home-interior.webp',materials:'world-materials-v3.webp',buildings:'village-buildings-v3.webp',bestiary:'bestiary.webp',bestiary2:'bestiary2.webp',bestiary3:'bestiary3.webp',props:'furnishings.webp',architectureMaterials:'architectural-materials-v4.webp',village:'village-life-v2.webp',npcs:'civilians.webp',naturalTrees:'natural-trees-v8.webp',roomLife:'occupied-workstations-v6.webp',sceneProps:'scene-props-v10.webp',scenePropsExtra:'scene-props-v11.webp',scenicMaterials:'scenic-materials-v12.webp'};
const OPTIONAL_ENVIRONMENT_FILES={...INTERIOR_ART_FILES,...ARCHITECTURE_V19_FILES,environmentCanopyVariations:CANOPY_VARIATION_FILE,...ENVIRONMENT_ART_FILES,environmentSurfaces:ENVIRONMENT_SURFACE_FILE,environmentWater:ENVIRONMENT_WATER_FILE,environmentCanopies:ENVIRONMENT_CANOPY_FILE,environmentArchitecture:ARCHITECTURE_ACCENT_FILE};
export function gameArtDefinitions(){return Object.entries({...FILES,...AUTHORED_ART_FILES,...OPTIONAL_ENVIRONMENT_FILES}).map(([name,file])=>({name,src:new URL('./art/'+file,import.meta.url),...(Object.hasOwn(OPTIONAL_ENVIRONMENT_FILES,name)?{optional:true}:{})}));}
