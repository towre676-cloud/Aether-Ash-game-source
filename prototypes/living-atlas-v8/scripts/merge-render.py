from pathlib import Path
p=Path('/mnt/data/aa-living-world/src/view.mjs');s=p.read_text()
s=s.replace("import {WorldAudio} from './sound.mjs';", """import {WorldAudio} from './sound.mjs';
import {createGrassField} from './grass/grass-renderer.mjs';
import {materialAt,biomeAt,vegetationObstacle} from './surfaces.mjs';
import {generateGroundMaps} from './ground/ground-synthesis.mjs';
import {makeCanvasImage} from './ground/ground-runtime.mjs';""")
s=s.replace("const positions=new Float32Array(N*N*3),colors=new Float32Array(N*N*3),indices=[];", "const positions=new Float32Array(N*N*3),colors=new Float32Array(N*N*3),uvs=new Float32Array(N*N*2),indices=[];")
s=s.replace("positions[i*3+2]=z-HALF;", "positions[i*3+2]=z-HALF;uvs[i*2]=x/(N-1);uvs[i*2+1]=1-z/(N-1);")
s=s.replace("terra.setAttribute('color',new THREE.BufferAttribute(colors,3));terra.computeVertexNormals();", "terra.setAttribute('color',new THREE.BufferAttribute(colors,3));terra.setAttribute('uv',new THREE.BufferAttribute(uvs,2));terra.computeVertexNormals();")
s=s.replace("const terrain=new THREE.Mesh(terra,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));", "const terrain=new THREE.Mesh(terra,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));")
s=s.replace("function paintTerrain(){for(let i=0;i<N*N;i++){const c=terrainColor(i);colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}terra.attributes.color.needsUpdate=true;}", """function paintTerrain(){for(let i=0;i<N*N;i++){const c=terrainColor(i);colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}terra.attributes.color.needsUpdate=true;
  terrain.material.vertexColors=mode!=='scenery';terrain.material.needsUpdate=true;
 }
let surfaceGrass=null,groundKey='',groundTextures=[];
function disposeGroundTextures(){for(const t of groundTextures)t.dispose();groundTextures=[];}
function groundMap(key){const maps=generateGroundMaps({seed:world.seed,width:qualityMode==='battery'?112:192,height:qualityMode==='battery'?112:192,
 originX:0,originZ:0,metresX:64,metresZ:64,
 materialAt:(x,z)=>materialAt(atlas.region,world,Math.max(-32,Math.min(32,x)),Math.max(-32,Math.min(32,z))),
 weather:{rain:world.sky==='rain'?.65:.03,moss:atlas.region.flora*.35,heat:atlas.region.heat*.38,age:Math.min(1,atlas.age/220)},
 weatherAt:(x,z)=>{const p=world.sample(Math.max(-32,Math.min(32,x)),Math.max(-32,Math.min(32,z)));return {rain:p.moisture*.65,heat:p.fire*.8,moss:p.biomass*.4};}});
 const tex=(type)=>{const t=new THREE.CanvasTexture(makeCanvasImage(maps,type));t.colorSpace=type==='albedo'?THREE.SRGBColorSpace:THREE.NoColorSpace;
 t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.needsUpdate=true;groundTextures.push(t);return t;};
 terrain.material.map=tex('albedo');terrain.material.normalMap=tex('normal');terrain.material.roughnessMap=tex('roughness');
 terrain.material.normalScale.set(.22,.22);terrain.material.roughness=.93;terrain.material.needsUpdate=true;groundKey=key;
 }
function rebuildGroundIfNeeded(){const key=`${atlas.region.id}:${world.seed}:${world.sky}:${qualityMode}:${Math.floor(atlas.age/21)}`;
 if(key!==groundKey){disposeGroundTextures();groundMap(key);}}
function rebuildLivingGrass(){surfaceGrass?.dispose();surfaceGrass=null;
 try{surfaceGrass=createGrassField(THREE,worldGroup,{
  seed:world.seed,origin:{x:selected.x,z:selected.z},quality:qualityMode==='battery'?'low':'medium',maxPlants:qualityMode==='battery'?3500:9500,
  terrainHeight:(x,z)=>height(x,z),biomeAt:(x,z)=>biomeAt(atlas.region,world,x,z),
  obstacleAt:(x,z)=>vegetationObstacle(atlas.region,world,x,z),
  trailAt:(x,z)=>Math.min(1,Math.max(0,(1-atlas.surface.sample(x,z).traffic)*0+((atlas.surface.sample(x,z).material.includes('road')||atlas.surface.sample(x,z).material.includes('cobble'))?1:0))),
  moistureAt:(x,z)=>world.sample(x,z).moisture,shadeAt:(x,z)=>Math.max(0,world.sample(x,z).biomass-.5),
  growthAt:(x,z)=>atlas.surface.vegetation.sample(x,z),
  fogColor:atlas.region.sky,fogNear:20,fogFar:85,wind:.22});
  surfaceGrass.setAtmosphere({wind:world.sky==='rain'?.65:.27,rain:world.sky==='rain'?1:0,fogColor:atlas.region.sky});
 }catch(e){console.warn('Living Grass fallback:',e);surfaceGrass=null;}
 grasses.visible=!surfaceGrass;flowers.visible=!surfaceGrass;
 }
 """)
s=s.replace("function refresh(rebuild=true){\n if(rebuild){", "function refresh(rebuild=true){\n if(rebuild){")
s=s.replace("paintTerrain();rebuildEcology();rebuildWater();rebuildArchitecture();rainDrops.visible=world.sky==='rain';", "paintTerrain();rebuildEcology();rebuildWater();rebuildArchitecture();rebuildGroundIfNeeded();rebuildLivingGrass();rainDrops.visible=world.sky==='rain';")
s=s.replace("const s=summaryCache,p=world.sample(selected.x,selected.z),g=world.evaluate(selected.x,selected.z),inspection=atlas.inspect(selected.x,selected.z);", "const s=summaryCache,p=world.sample(selected.x,selected.z),g=world.evaluate(selected.x,selected.z),inspection=atlas.inspect(selected.x,selected.z),ground=inspection.surface;")
s=s.replace("<span>Trade price <b>${inspection.price} crowns</b></span>","<span>Surface traction <b>${Math.round(ground.traction*100)}%</b></span><span>Step noise <b>${Math.round(ground.noise*100)}%</b></span><span>Ground shield <b>${Math.round(ground.groundShield*100)}%</b></span><span>Plant vigor <b>${Math.round(ground.vegetation.vigor*100)}%</b></span><span>Trade price <b>${inspection.price} crowns</b></span>")
s=s.replace("<p><b>Music and memory:</b>", "<p><b>Material:</b> ${ground.materialName} — ${ground.clue} · tracks ${Math.round(ground.tracePersistence*100)}% · charge ${Math.round(ground.charge*100)}%</p><p><b>Music and memory:</b>")
s=s.replace("const r=atlas.travel(id);if(!r.ok){announce(r.reason);return;}\n world=atlas.world;", "const r=atlas.travel(id);if(!r.ok){announce(r.reason);return;}\n world=atlas.world;")
s=s.replace("case 'quality':{qualityMode=", "case 'quality':{qualityMode=")
s=s.replace("case 'rest':{const r=atlas.rest();", """case 'walk':{const r=atlas.pathfind(atlas.characters[0].position,selected);if(!r.ok){announce('Route blocked: '+r.reason);break;}
  let moved=0,stopped='';for(const pt of r.steps.slice(1,7)){
   const step=atlas.dispatch({kind:'FOOTFALL_CONFIRMED',x:pt.x,z:pt.z,actor:'iona',speed:1});if(!step.ok){stopped=step.reason;break;}
   moved++;surfaceGrass?.step(pt.x,pt.z,.65);
   if(moved%3===0){const encounter=atlas.beginEncounter(pt.x,pt.z);if(encounter.triggered){stopped=`${encounter.name} interrupts the journey!`;break;}}
  }refresh();save();announce(`${moved} lawful steps moved. ${stopped||'Footprints, noise, and plant disturbance persisted.'}`);break;}
case 'repair-floor':{const r=atlas.dispatch({kind:'SURFACE_REPAIR_CONFIRMED',...selected,material:'clay'});if(!r.ok){announce(r.reason);break;}refresh();save();announce('Clay repairs the fractured surface. Material consumed.');break;}
case 'rest':{const r=atlas.rest();""")
s=s.replace("picker.rotation.z+=dt*.26;fauna?.update(t);citizens?.update(t);", "picker.rotation.z+=dt*.26;surfaceGrass?.update(dt,selected);fauna?.update(t);citizens?.update(t);")
p.write_text(s)
q=Path('/mnt/data/aa-living-world/index.html');html=q.read_text()
html=html.replace('<button data-action="route">Calculate walkable route</button>', '<button data-action="route">Calculate walkable route</button><button data-action="walk" class="primary">Walk toward survey point (up to 6 steps)</button><button data-action="repair-floor">Repair cracked floor (1 clay)</button>')
html=html.replace('Nine connected lands · one causal living world','Nine lands · 16 plant families · 48 material identities · one causal living world')
html=html.replace('The scenery reads those same values.','The scenery, 48 material profiles, ecology, combat, encounter noise and real trails read those same values.')
html=html.replace('Pinned Three.js loads through a CDN.','Pinned Three.js loads through a CDN; borrowed modules from parallel A&A research are bundled locally.')
q.write_text(html)
