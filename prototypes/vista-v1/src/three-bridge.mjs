/** Optional original Three.js scene enhancement for Ash & Aether.
 * Usage: import {createVistaBridge} from './three-bridge.mjs';
 * const vista=createVistaBridge({THREE,scene,world:{regionAt,groundAt,obstacleAt,nearPathAt,waterAt}});
 * vista.setLandmarks([{x,z,tag:'shrine'}, {x,z,tag:'waterfall'}]);
 * // Existing game loop owns movement/camera/combat and calls:
 * vista.tick(dt,{hero,threat,landmark,aim},host.frameTimeMs);
 * vista.onGameEvent(confirmedHostEvent, authoritativeWorldSample);
 * // Host may consume vista.cameraIntent, but no host-owned camera is overwritten.
 * vista.dispose();
 *
 * No new controls, physics, NPCs, drops, combat decisions, or persistence.
 * This module assumes host supplies compatible Three.js R140+ implementation.
 */
import {composeLandmark,QualityGovernor,CinematicCameraDirector,VisualEventQueue,hashSeed,clamp} from './vista-core.mjs';
const P=(THREE,color,roughness=0.84,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
function mesh(T,geo,material,xyz,rot=[0,0,0]){const m=new T.Mesh(geo,material);m.position.set(...xyz);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;return m;}
function addPillar(T,group,x,y,z,h,r,color){const m=mesh(T,new T.CylinderGeometry(r*.9,r,h,9),P(T,color),[x,y+h/2,z]);group.add(m);return m;}
function decorateShrine(T,g,style){
 const stone=P(T,0x73877a),trim=P(T,0xc4b89c),moss=P(T,0x496e55),glyph=P(T,0x78d9c5,.3,.12);
 // A single walk-through landmark, with correct collision ownership left to host.
 const steps=[[-.8,.06,3.5,2.0],[0,.20,3.0,1.8],[.8,.34,2.5,1.6]];
 for (const [z,y,w,d] of steps) g.add(mesh(T,new T.BoxGeometry(w,.22,d),stone,[0,y,z]));
 g.add(mesh(T,new T.CylinderGeometry(1.9,2.1,.45,12),stone,[0,.46,-1]));
 for(const x of [-1.32,1.32]){
  addPillar(T,g,x,.65,-1.25,3.8,.32,0x7c8982);
  const cap=mesh(T,new T.CylinderGeometry(.5,.4,.18,8),trim,[x,4.53,-1.25]);g.add(cap);
  const lichen=mesh(T,new T.SphereGeometry(.22,7,6),moss,[x+.1,2.1,-.95]);lichen.scale.set(1.2,.25,.8);g.add(lichen);
 }
 g.add(mesh(T,new T.BoxGeometry(3.65,.58,.86),stone,[0,4.88,-1.25]));
 g.add(mesh(T,new T.BoxGeometry(4.1,.20,1.17),trim,[0,5.24,-1.25]));
 const disc=mesh(T,new T.TorusGeometry(.74,.095,9,54),glyph,[0,2.65,-1.55]);disc.rotation.x=Math.PI/2;g.add(disc);
 g.userData.pulseDisc=disc;
 const guardian=mesh(T,new T.IcosahedronGeometry(.56,1),glyph,[0,2.65,-1.55]);guardian.scale.set(.6,1.2,.2);g.add(guardian);g.userData.pulseGuardian=guardian;
 if(style==='coastal'){g.add(mesh(T,new T.BoxGeometry(2.3,.24,1.2),P(T,0xacc2b0),[0,.95,-2.3]));}
}
function decorateWaterfall(T,g){
 const rock=P(T,0x566966),wetStone=P(T,0x657d7a,.5),water=new T.MeshStandardMaterial({color:0x79cfd2,roughness:.14,metalness:.04,transparent:true,opacity:.75,side:T.DoubleSide});
 // A deliberately framed rock cleft; water is visual-only, not a new physics surface.
 const rocks=[[-2.1,1.6,-1.6,1.6],[-1.2,3.0,-2.1,1.1],[1.8,2.4,-1.7,1.8],[2.6,1.2,-1.35,1.2],[0,4.1,-2.4,1.25]];
 for(const [x,y,z,s] of rocks){const m=mesh(T,new T.DodecahedronGeometry(s,1),rock,[x,y,z]);m.scale.set(1.1,.85,1.05);g.add(m);}
 const fall=mesh(T,new T.PlaneGeometry(2.8,4.2,1,12),water,[.2,2.3,.05]);g.add(fall);g.userData.waterfall=fall;
 const pool=mesh(T,new T.CylinderGeometry(3.1,3,.09,44),wetStone,[.05,.1,.9]);g.add(pool);
 const poolWater=mesh(T,new T.CylinderGeometry(2.8,2.8,.06,44),P(T,0x478c96,.21,.15),[.05,.18,.9]);g.add(poolWater);
 for(let i=0;i<7;i++){const x=-2.2+i*.73;const m=mesh(T,new T.SphereGeometry(.18+i%3*.08,7,5),P(T,0x8baba5),[x,.35,2.7+i%2*.2]);m.scale.y=.38;g.add(m);}
}
function decorateVista(T,g){
 const stone=P(T,0x707f76),sunMetal=P(T,0xbba980,.4,.15);
 for(let i=-2;i<=2;i++){
  const h=1.5+(.5-hashSeed(i,6,12))*.6;
  const p=mesh(T,new T.BoxGeometry(.8,h,.7),stone,[i*1.1,h/2,-1.6]);p.rotation.y=i*.09;g.add(p);
 }
 const ring=mesh(T,new T.TorusGeometry(2.25,.19,12,64),sunMetal,[0,2.35,-2.2]);g.add(ring);
 const dais=mesh(T,new T.CylinderGeometry(2.6,2.8,.35,24),stone,[0,.12,-1.6]);g.add(dais);
 g.userData.pulseDisc=ring;
}
function decorateForestEdge(T,g){
 const bark=P(T,0x51463c),leaf=P(T,0x51775b),leaf2=P(T,0x739b71);
 for(let i=0;i<8;i++){
  const a=(i/8)*Math.PI*1.55+.45,r=3.3+(i%3)*.3;
  const x=Math.cos(a)*r,z=Math.sin(a)*r-1.5;
  const t=mesh(T,new T.CylinderGeometry(.13,.28,3.8,7),bark,[x,1.85,z]);t.rotation.z=.08*Math.cos(a);g.add(t);
  const crown=mesh(T,new T.IcosahedronGeometry(1.3,1),i%2?leaf:leaf2,[x+.2,4.2,z]);crown.scale.set(1.1,1.65,.9);g.add(crown);
 }
}
function decorateBossArena(T,g){
 const stone=P(T,0x5a696b),rim=P(T,0xab9983,.5,.3),warn=P(T,0x85bfe0,.5);
 g.add(mesh(T,new T.CylinderGeometry(5.0,5.15,.25,52),stone,[0,.0,0]));
 const ring=mesh(T,new T.TorusGeometry(4.5,.11,8,72),rim,[0,.16,0],[Math.PI/2,0,0]);g.add(ring);
 const inner=mesh(T,new T.TorusGeometry(2.2,.06,8,72),warn,[0,.18,0],[Math.PI/2,0,0]);g.add(inner);g.userData.pulseDisc=inner;
 for(let i=0;i<8;i++){const a=i*Math.PI/4;addPillar(T,g,Math.cos(a)*5.4,0,Math.sin(a)*5.4,1.4,.34,0x687478);}
}
function decorateSettlement(T,g){
 const brick=P(T,0x9a9481),roof=P(T,0x626c70),wood=P(T,0x644b40),glass=P(T,0xe5b785,.26,.13);
 for(let i=0;i<3;i++){
   const x=(i-1)*3.6,z=-i*.5;const h=2.5+(i%2)*1.3;
   g.add(mesh(T,new T.BoxGeometry(2.7,h,2.5),brick,[x,h/2,z]));
   const top=mesh(T,new T.ConeGeometry(2.2,1.45,4),roof,[x,h+.66,z]);top.rotation.y=Math.PI/4;g.add(top);
   const door=mesh(T,new T.BoxGeometry(.75,1.65,.05),wood,[x,h*.33,z+1.28]);g.add(door);
   const lamp=mesh(T,new T.BoxGeometry(.32,.4,.08),glass,[x-0.9,h*.64,z+1.3]);g.add(lamp);
 }
}
export function createVistaBridge({THREE,scene,world,quality='high',reducedMotion=false,enableAmbientLight=false,namespace='aa-vista'}={}){
 if(!THREE||!scene||!scene.add||!scene.remove) throw Error('THREE and writable scene required');
 const root=new THREE.Group();root.name=namespace;scene.add(root);
 const governor=new QualityGovernor({initial:quality,reducedMotion});const director=new CinematicCameraDirector({reducedMotion});
 const queue=new VisualEventQueue();const spawned=[];const particles=[];const torusMaterial=new THREE.MeshBasicMaterial({color:0xbce9e9,transparent:true,opacity:.9,depthWrite:false});
 let clock=0,disposed=false,cameraIntent=director.snapshot();
 const restore=[];
 if(enableAmbientLight){const hemi=new THREE.HemisphereLight(0xa8d8ff,0x596248,.48);root.add(hemi);}
 const create=(input)=>{
   const plan=composeLandmark({...input,...world});if(!plan)return false;
   const g=new THREE.Group();g.name=`${namespace}:${plan.tag}`;g.position.set(plan.x,plan.worldHeight||0,plan.z);
   if(plan.tag==='shrine')decorateShrine(THREE,g,plan.style);
   else if(plan.tag==='waterfall')decorateWaterfall(THREE,g);
   else if(plan.tag==='boss-arena')decorateBossArena(THREE,g);
   else if(plan.tag==='vista')decorateVista(THREE,g);
   else if(plan.tag==='forest-edge')decorateForestEdge(THREE,g);
   else if(plan.tag==='settlement')decorateSettlement(THREE,g);
   root.add(g);spawned.push(g);return true;
 };
 const bridge={
   get cameraIntent(){return cameraIntent;},get qualitySettings(){return governor.settings();},get root(){return root;},
   setLandmarks(landmarks=[]){if(disposed)return 0;for(const g of spawned)root.remove(g);while(spawned.length){const g=spawned.pop();g.traverse(obj=>{obj.geometry?.dispose?.();if(obj.material){(Array.isArray(obj.material)?obj.material:[obj.material]).forEach(m=>m.dispose?.());}});}let count=0;for(const item of landmarks.slice(0,24))if(create(item))count++;return count;},
   onGameEvent(event,worldSample){if(disposed)return false;return queue.push(event,worldSample);},
   tick(dt,hostState={},frameMs){
     if(disposed)return cameraIntent;dt=clamp(Number(dt)||0,0,.12);clock+=dt;
     cameraIntent=director.update(dt,hostState);
     if(Number.isFinite(frameMs))governor.record(frameMs,dt);
     for(const landmark of spawned){const ring=landmark.userData.pulseDisc,gem=landmark.userData.pulseGuardian;
       if(ring&&!reducedMotion){ring.rotation.z=.015*Math.sin(clock*.7);ring.scale.setScalar(1+.018*Math.sin(clock*1.6));}
       if(gem&&!reducedMotion)gem.rotation.y=clock*.3;
       const fall=landmark.userData.waterfall;if(fall&&!reducedMotion)fall.material.opacity=.64+.09*Math.sin(clock*2.1);
     }
     for(const e of queue.tick(dt)){
       if(!e.__spawned && particles.length<governor.settings().particleBudget){
         const ring=new THREE.Mesh(new THREE.TorusGeometry(.58,.045,5,36),torusMaterial.clone());
         ring.material.color.setRGB(...e.tint);ring.rotation.x=Math.PI/2;ring.position.set(e.x,.12,e.z);root.add(ring);particles.push({mesh:ring,eventId:e.eventId,lifetime:e.visibleFor});e.__spawned=true;
       }
     }
     for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.lifetime-=dt;
       p.mesh.scale.setScalar(1+1.9*(1-Math.max(0,p.lifetime)/1.25));p.mesh.material.opacity=Math.max(0,Math.min(.85,p.lifetime*1.2));
       if(p.lifetime<=0){root.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(i,1);}
     }
     return cameraIntent;
   },
   dispose(){if(disposed)return;bridge.setLandmarks([]);for(const p of particles){root.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();}particles.length=0;for(const f of restore)f();scene.remove(root);torusMaterial.dispose();disposed=true;}
 };
 return bridge;
}
