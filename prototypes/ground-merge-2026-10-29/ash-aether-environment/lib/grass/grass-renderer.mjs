/** WebGL2-friendly Three.js instanced vegetation for Ash & Aether.
 * No postprocessing, transparency sorting, texture downloads, or per-blade CPU animation.
 * Call createGrassField(THREE, scene, options).update(dt, player) each frame.
 */
import {clamp,hash2,createEcology,SPECIES} from './grass-ecology.mjs';

const TAU=Math.PI*2;
const QUALITY={
  low:   {radius:22,cell:.68,cap:9000, flowers:false},
  medium:{radius:32,cell:.51,cap:18000,flowers:true},
  high:  {radius:42,cell:.37,cap:38000,flowers:true},
  ultra: {radius:52,cell:.30,cap:65000,flowers:true}
};

function tuftGeometry(THREE,type){
  const spec=SPECIES[type];const positions=[],normals=[], tips=[],phases=[], indices=[];
  const n=spec.leaves,segments=type==='moss'||type==='clover'?3:4;
  function leaflet(px,py,pz,angle,length,width,phase){
    // Four-point tapered, cupped leaf (not a rectangular grass billboard).
    const ux=Math.cos(angle),uz=Math.sin(angle),vx=-uz,vz=ux;
    const base=positions.length/3;
    positions.push(px,py,pz,px+ux*length*.48+vx*width,py+length*.24,pz+uz*length*.48+vz*width,
      px+ux*length,py+length*.35,pz+uz*length,px+ux*length*.48-vx*width,py+length*.24,pz+uz*length*.48-vz*width);
    for(let k=0;k<4;k++){normals.push(vx,.52,vz);tips.push(.62+k*.11);phases.push(phase);}
    indices.push(base,base+1,base+2,base,base+2,base+3);
  }
  for(let leaf=0;leaf<n;leaf++){
    const yaw=leaf*2.39996323+(leaf%3)*.13;
    const dx=Math.cos(yaw),dz=Math.sin(yaw),nx=-dz,nz=dx;
    const variation=.73+.28*((leaf*7%11)/10);
    const lean=.095 + .13*(leaf%4)/4;
    const rootX=(leaf%3-1)*.029,rootZ=(leaf%4-1.5)*.026;
    const base=positions.length/3;
    for(let j=0;j<=segments;j++){
      const t=j/segments;
      const taper=Math.pow(Math.max(.003,1-t),.73)*(0.64+.3*Math.sin(t*Math.PI));
      const bend=lean*t*t;
      const centerX=rootX+dx*bend,centerZ=rootZ+dz*bend;
      for(let side of [-1,1]){
        const w=side*spec.width*taper*.5;
        positions.push(centerX+nx*w,t*variation,centerZ+nz*w);
        normals.push(nx, .15+t*.08, nz);
        tips.push(t);
        phases.push(leaf*.61+leaf%2);
      }
    }
    for(let j=0;j<segments;j++){
      const i=base+j*2;
      indices.push(i,i+1,i+2,i+1,i+3,i+2);
    }
    // Real branching groundcover instead of a renamed grass-ribbon mesh.
    if(type==='clover'){
      for(let k=0;k<3;k++){
        const a=yaw+k*TAU/3;
        leaflet(rootX+dx*.025,variation*.64,rootZ+dz*.025,a,.12,.050,leaf*.61);
      }
    }
    if(type==='fern'){
      for(let k=1;k<=5;k++)for(const direction of [-1,1]){
        const y=variation*(.12+k*.12);
        leaflet(rootX+dx*lean*(k/6)**2,y,rootZ+dz*lean*(k/6)**2,
          yaw+direction*(1.02+.07*k),.16+.03*(6-k)/5,.032,leaf*.41+k*.28);
      }
    }
    if(type==='nettle'){
      for(let k=1;k<=3;k++)for(const direction of [-1,1]){
        leaflet(rootX+dx*.04*k,variation*(.28+.17*k),rootZ+dz*.04*k,
          yaw+direction*1.12,.11+.02*k,.058,leaf*.51+k*.4);
      }
    }
    if(type==='moss'){
      for(let k=0;k<5;k++)leaflet(rootX,variation*.18,rootZ,yaw+k*TAU/5,.08,.032,leaf*.2+k);
    }
    // Narrow inflorescence on wild rye, dry grass, reeds: break the uniform grass silhouette.
    if(['reed','straw','rye','sedge','wheat','rush','heather','lavender'].includes(type) && leaf%2===0){
      const b=positions.length/3;
      for(let k=0;k<3;k++){
        const t=k/2,w=Math.sin(Math.PI*t)*spec.width*.65;
        const yy=variation+(.08+.08*(leaf%3))*t;
        for(const side of [-1,1]){
          positions.push(rootX+dx*lean+nx*w*side,yy,rootZ+dz*lean+nz*w*side);
          normals.push(nx,.18,nz);tips.push(1);phases.push(leaf*.61);
        }
      }
      indices.push(b,b+1,b+2,b+1,b+3,b+2,b+2,b+3,b+4,b+3,b+5,b+4);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('aTip',new THREE.Float32BufferAttribute(tips,1));
  geometry.setAttribute('aPhase',new THREE.Float32BufferAttribute(phases,1));
  geometry.setIndex(indices);geometry.computeBoundingSphere();
  return geometry;
}
function flowerGeometry(THREE){
  const vertices=[],normals=[],tips=[],phases=[],indices=[];
  // Three small petals on each of four heads; no alpha cards / overdraw.
  const addTri=(a,b,c,t=1)=>{
    const base=vertices.length/3;vertices.push(...a,...b,...c);
    for(let k=0;k<3;k++){normals.push(0,1,0);tips.push(t);phases.push(0);}
    indices.push(base,base+1,base+2);
  };
  for(let h=0;h<3;h++){
    const theta=h*TAU/3,x=Math.cos(theta)*.11,z=Math.sin(theta)*.11;
    for(let petal=0;petal<4;petal++){
      const a=theta+petal*TAU/4,ux=Math.cos(a),uz=Math.sin(a);
      addTri([x,.80,z],[x+ux*.09,.82,z+uz*.09],[x+ux*.044,.93,z+uz*.044]);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  g.setAttribute('aTip',new THREE.Float32BufferAttribute(tips,1));
  g.setAttribute('aPhase',new THREE.Float32BufferAttribute(phases,1));
  g.setIndex(indices);return g;
}

function makeMaterial(THREE,uniforms){
  // Shared, opaque two-sided shader; instancing and world coordinates explicitly included.
  // Undeclared THREE built-in uniforms: modelMatrix, viewMatrix, projectionMatrix, cameraPosition.
  return new THREE.ShaderMaterial({
    uniforms,side:THREE.DoubleSide,depthWrite:true,transparent:false,
    vertexShader:`
      // Three.js ShaderMaterial injects instanceMatrix and instanceColor attributes.
      attribute float aTip;
      attribute float aPhase;
      uniform float uTime; uniform float uWind;
      uniform vec2 uWindDir; uniform vec2 uPlayer; uniform float uPlayerRadius;
      uniform vec4 uTrails[6];
      varying vec3 vColor; varying float vTip; varying float vSun; varying float vDistance;
      void main(){
        vec4 world=modelMatrix * instanceMatrix * vec4(position,1.0);
        vec2 root=(modelMatrix * instanceMatrix * vec4(0.,0.,0.,1.)).xz;
        float tip=aTip*aTip;
        float wave=sin(dot(root,vec2(.28,.17)) + uTime*1.12+aPhase*.48);
        float ripple=sin(dot(root,vec2(.71,-.39))-uTime*2.1+aPhase);
        float gust=.6+.4*sin(uTime*.34+root.x*.083+root.y*.061);
        vec2 wind=uWindDir * ((wave*.68+ripple*.25)*gust*uWind);
        vec2 delta=world.xz-uPlayer; float proximity=1.0-smoothstep(0.0,uPlayerRadius,length(delta));
        vec2 push=normalize(delta+vec2(.0001)) * proximity*.33;
        for(int i=0;i<6;i++){
          vec4 trail=uTrails[i];
          float fade=(1.0-smoothstep(0.0,2.2,trail.w)) * (1.0-smoothstep(0.0,max(.05,trail.z),distance(world.xz,trail.xy)));
          push+=normalize(world.xz-trail.xy+vec2(.001)) * fade*.17;
        }
        world.xz+=(wind+push)*tip;
        world.y-=min(.12,length(push)*.23)*tip;
        vec3 n=normalize(mat3(modelMatrix*instanceMatrix)*normal);
        float sideLight=.55+.45*abs(dot(n,normalize(vec3(.55,.78,.38))));
        vSun=sideLight;
        vTip=aTip;
        vColor=instanceColor;
        vDistance=length(world.xyz-cameraPosition);
        gl_Position=projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader:`
      precision highp float;
      uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar;
      uniform vec3 uLightTint; uniform float uRain;
      varying vec3 vColor; varying float vTip; varying float vSun; varying float vDistance;
      void main(){
        vec3 base=vColor*(.48+.75*pow(vTip,.80));
        base*=.68+.42*vSun;
        base+=vec3(.055,.064,.020)*pow(vTip,2.5);
        base=mix(base,base*vec3(.79,.94,1.02),uRain*.36);
        base*=uLightTint;
        float fog=smoothstep(uFogNear,uFogFar,vDistance);
        gl_FragColor=vec4(mix(base,uFogColor,fog),1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}

/** options: {seed,biome|biomeAt,terrainHeight,trailAt,shadeAt,moistureAt,obstacleAt,
 * quality,season,density,wind,windDirection,playerRadius,origin,onPatchBuilt}.
 * Renderer uses +Y up, horizontal terrain (x,z). No collision shapes are added.
 */
export function createGrassField(THREE,scene,options={}){
  const quality=options.quality||'medium',settings=QUALITY[quality]||QUALITY.medium;
  const seed=options.seed??316;
  const ecology=createEcology(options);
  const radius=settings.radius,cell=settings.cell;
  const maxCells=Math.ceil((radius*2/cell+2)**2);
  const budget=Math.min(settings.cap,options.maxPlants||Infinity);
  const uniforms={
    uTime:{value:0},uWind:{value:options.wind??.27},
    uWindDir:{value:new THREE.Vector2(...(options.windDirection||[.9,.43])).normalize()},
    uPlayer:{value:new THREE.Vector2(10000,10000)},uPlayerRadius:{value:options.playerRadius??1.4},
    uTrails:{value:Array.from({length:6},()=>new THREE.Vector4(10000,10000,0,10))},
    uFogColor:{value:new THREE.Color(options.fogColor??'#b0bba5')},
    uFogNear:{value:options.fogNear??26},uFogFar:{value:options.fogFar??85},
    uLightTint:{value:new THREE.Color('#ffffff')},uRain:{value:0}
  };
  const material=makeMaterial(THREE,uniforms),meshes=new Map(),palette=new Map();
  const dummy=new THREE.Object3D();
  for(const [type,sp] of Object.entries(SPECIES)){
    const mesh=new THREE.InstancedMesh(tuftGeometry(THREE,type),material,Math.min(maxCells,budget));
    mesh.name=`AA_Grass_${type}`;mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);meshes.set(type,mesh);
    palette.set(type,sp.palette.map(c=>new THREE.Color(c)));
  }
  let flowers=null;
  if(settings.flowers){
    flowers=new THREE.InstancedMesh(flowerGeometry(THREE),material,Math.ceil(budget*.11));
    flowers.name='AA_Grass_Wildflower';flowers.count=0;flowers.frustumCulled=false;
    flowers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(flowers);
  }
  const origin=options.origin||{x:0,z:0};
  let center={x:Infinity,z:Infinity},disposed=false,plantCount=0,flowerCount=0;
  let lastPlayer={x:10000,z:10000},regrowth=0;
  const trails=[];
  function build(x=0,z=0){
    if(disposed)throw new Error('grass field disposed');
    x=Math.round(x/cell)*cell;z=Math.round(z/cell)*cell;
    center={x,z};let remaining=budget;const counts=Object.fromEntries([...meshes.keys()].map(k=>[k,0]));
    if(flowers)flowers.count=0;
    let fcount=0;
    const xmin=Math.floor((x-radius)/cell),xmax=Math.ceil((x+radius)/cell);
    const zmin=Math.floor((z-radius)/cell),zmax=Math.ceil((z+radius)/cell);
    // Stable world-space cell positions. Rebuilds don't "reroll" grass as the player moves.
    for(let ix=xmin;ix<=xmax;ix++)for(let iz=zmin;iz<=zmax;iz++){
      if(remaining<=0)break;
      const jx=hash2(ix,iz,seed+51),jz=hash2(ix,iz,seed+53);
      const px=(ix+.09+jx*.82)*cell,pz=(iz+.09+jz*.82)*cell;
      const d=Math.hypot(px-x,pz-z);
      if(d>radius)continue;
      const eco=ecology.sample(px,pz);
      // Thin the far field gradually while keeping close stems richly populated.
      const far=clamp((d-radius*.58)/(radius*.42));
      const survive=(1-.70*far*far)*eco.density;
      if(hash2(ix,iz,seed+59)>survive)continue;
      const type=ecology.chooseSpecies(px,pz,eco,hash2(ix,iz,seed+61));
      const mesh=meshes.get(type),idx=counts[type];if(idx>=mesh.instanceMatrix.count)continue;
      const sp=SPECIES[type];
      const variance=.71+.60*hash2(ix,iz,seed+67);
      const deadZone=1-.88*clamp((d-radius*.88)/(radius*.12));
      const scale=variance*eco.heightFactor*deadZone;
      dummy.position.set(px,eco.y-.025,pz);
      dummy.rotation.set(0,TAU*hash2(ix,iz,seed+71),0);
      dummy.scale.set(scale,scale*sp.height,scale);
      dummy.updateMatrix();mesh.setMatrixAt(idx,dummy.matrix);
      const colors=palette.get(type);const col=colors[Math.floor(hash2(ix,iz,seed+73)*colors.length)];
      const shade=.87+.26*hash2(ix,iz,seed+79);
      const color=col.clone().multiplyScalar(shade*(.93+.15*eco.moisture));
      if(eco.scorch)color.lerp(new THREE.Color('#493e30'),eco.scorch*.86);
      if(options.season==='autumn')color.lerp(new THREE.Color('#a28e59'),.30);
      if(options.season==='winter')color.lerp(new THREE.Color('#a4aea7'),.49);
      if(options.season==='spring')color.lerp(new THREE.Color('#77a657'),.12);
      mesh.setColorAt(idx,color);
      counts[type]++;remaining--;
      if(flowers && eco.flowerProbability>hash2(ix,iz,seed+83) && fcount<flowers.instanceMatrix.count && d<radius*.85){
        dummy.position.set(px,eco.y-.01,pz);dummy.rotation.set(0,jx*TAU,0);
        const size=.19+.19*hash2(ix,iz,seed+89);
        dummy.scale.set(size,size*1.35,size);dummy.updateMatrix();
        flowers.setMatrixAt(fcount,dummy.matrix);
        const colors=['#eee8c5','#ead3ad','#d9bfdc','#e4e7dc','#d9bc96'];
        flowers.setColorAt(fcount,new THREE.Color(colors[Math.floor(hash2(ix,iz,seed+97)*colors.length)]));
        fcount++;
      }
    }
    for(const [type,mesh] of meshes){
      mesh.count=counts[type];mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    }
    if(flowers){flowers.count=fcount;flowers.instanceMatrix.needsUpdate=true;if(flowers.instanceColor)flowers.instanceColor.needsUpdate=true;}
    plantCount=budget-remaining;flowerCount=fcount;
    const stats={plants:plantCount,flowers:flowerCount,drawCalls:[...meshes.values()].filter(m=>m.count>0).length+(flowers?.count>0?1:0),quality,counts:{...counts}};
    options.onPatchBuilt?.(stats);return stats;
  }
  function step(x,z,radius=.65){
    trails.unshift({x,z,radius:clamp(radius,.1,2.5),age:0});trails.length=Math.min(6,trails.length);
  }
  function update(dt=0,player=null){
    if(disposed)return;
    dt=clamp(dt,0,.1);uniforms.uTime.value+=dt;
    if(player){
      lastPlayer={x:player.x,z:player.z};uniforms.uPlayer.value.set(player.x,player.z);
      if(Math.hypot(player.x-center.x,player.z-center.z)>radius*.23 && regrowth<=0){
        build(player.x,player.z);regrowth=.33;
      }
    }
    regrowth=Math.max(0,regrowth-dt);
    for(const t of trails)t.age+=dt;
    for(let i=0;i<6;i++){
      const t=trails[i];uniforms.uTrails.value[i].set(t?.x??10000,t?.z??10000,t?.radius??0,t?.age??10);
    }
    while(trails.length && trails.at(-1).age>2.2)trails.pop();
  }
  function setAtmosphere({wind,rain,fogColor,sunTint,windDirection}={}){
    if(wind!=null)uniforms.uWind.value=clamp(wind,0,2.3);
    if(rain!=null)uniforms.uRain.value=clamp(rain);
    if(fogColor)uniforms.uFogColor.value.set(fogColor);
    if(sunTint)uniforms.uLightTint.value.set(sunTint);
    if(windDirection)uniforms.uWindDir.value.set(...windDirection).normalize();
  }
  function dispose(){
    if(disposed)return;disposed=true;
    for(const m of meshes.values()){scene.remove(m);m.geometry.dispose();m.dispose?.();}
    if(flowers){scene.remove(flowers);flowers.geometry.dispose();flowers.dispose?.();}
    material.dispose();
  }
  build(origin.x,origin.z);
  return {build,update,step,setAtmosphere,dispose,ecology,meshes,
    getStats:()=>({plants:plantCount,flowers:flowerCount,quality,drawCalls:[...meshes.values()].filter(m=>m.count>0).length+(flowers?.count>0?1:0)}),
    getGameplay:(x,z)=>ecology.gameplay(x,z)};
}
