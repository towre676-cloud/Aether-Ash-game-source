import {performance} from 'node:perf_hooks';
import {AtlasWorld} from '../src/adventure.mjs';
const start=performance.now();const a=new AtlasWorld(2301);const initialization=performance.now()-start;
let t=performance.now();a.passDays(90);const days90=performance.now()-t;
t=performance.now();a.dispatch({kind:'BRIDGE_REPAIRED'});const route=a.pathfind({x:-16,z:5},{x:16,z:5});const routeMs=performance.now()-t;
t=performance.now();for(let i=0;i<200;i++)a.inspect(-16+i%30,-10+i%30);const inspections=performance.now()-t;
console.log(JSON.stringify({platform:'Node numerical simulation only (NOT GPU FPS)',initialization_ms:+initialization.toFixed(1),ninety_days_ms:+days90.toFixed(1),route_ms:+routeMs.toFixed(1),route_cost:route.cost,two_hundred_inspections_ms:+inspections.toFixed(1)},null,2));
