/** Moving ecological actors: renderer-only locomotion, gameplay identity from authored species. */
import {SPECIES} from './content.mjs';
import {iAt,riverX} from './world.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function frac(v){return v-Math.floor(v);}
export function createFauna(THREE,world,region,group,quality='high',wildlife=null,partyPosition=()=>null,atlas=null){
 const meshes=[],actors=[];const geom=[];const mat=[];
 const species=SPECIES.filter(s=>s.region===region.id);
 const palette={sentry:0x9b9b91,stalker:0xc3a481,chanter:0xa6d2d0,grazer:0x889f83,burrower:0xb49e80,forager:0xab8275};
 const materials=Object.fromEntries(species.map(s=>{const material=new THREE.MeshStandardMaterial({color:palette[s.kind],roughness:s.kind==='chanter'?.36:.85,metalness:s.kind==='sentry'?.3:0});mat.push(material);return [s.kind,material];}));
 const eye=new THREE.MeshStandardMaterial({color:0xffe5ad,roughness:.15,emissive:0xddaa66,emissiveIntensity:.4});mat.push(eye);
 const bodyGeom=new THREE.SphereGeometry(1,12,8),headGeom=new THREE.SphereGeometry(1,10,7),legGeom=new THREE.CylinderGeometry(.12,.2,1,7),earGeom=new THREE.ConeGeometry(.25,.65,6),wingGeom=new THREE.ConeGeometry(.6,1.9,3);geom.push(bodyGeom,headGeom,legGeom,earGeom,wingGeom);
 function piece(g,m,x,y,z,parent){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 const amount=quality==='low'?10:24;
 for(let i=0;i<amount;i++){
  const source=species[i%species.length],random=frac(Math.sin((i+1)*37.17+region.seed)*43758.5453);
  let x=-27+frac((i+2)*.61803398875)*54,z=-27+frac((i+3)*.41421356237)*54;
  // Every cohort receives a traversable, non-riverbed anchor.
  for(let k=0;k<16;k++){if(world.evaluate(x,z).traversalPassable&&Math.abs(x-riverX(z))>3.4)break;x=-27+frac((i+2+k*7)*.61803398875)*54;z=-27+frac((i+3+k*11)*.41421356237)*54;}
  if(!world.evaluate(x,z).traversalPassable||Math.abs(x-riverX(z))<3.4)continue;
  const root=new THREE.Group();group.add(root);const size=.8+(i%5)*.1;const skin=materials[source.kind].clone();mat.push(skin);
  const body=piece(bodyGeom,skin,0,1.1,0,root);body.scale.set(source.kind==='grazer'?1.15:.8,.55,.62);
  const head=piece(headGeom,skin,0,1.58,.58,root);head.scale.set(.43,.39,.46);
  piece(headGeom,eye,-.18,1.64,.94,root).scale.set(.065,.07,.045);
  piece(headGeom,eye,.18,1.64,.94,root).scale.set(.065,.07,.045);
  const legs=[];for(const s of [-1,1])for(const fb of [-1,1]){
   const pivot=new THREE.Group();pivot.position.set(s*.48,.9,fb*.43);root.add(pivot);
   const limb=piece(legGeom,skin,0,-.37,0,pivot);limb.scale.set(source.kind==='burrower'?1.6:1,.76,1);
   legs.push({pivot,side:s,front:fb});
  }
  if(source.kind==='chanter')for(const s of [-1,1]){const w=piece(wingGeom,skin,s*.85,1.35,0,root);w.rotation.z=s*.85;w.scale.set(1.2,1,1.0);}
  if(source.kind==='sentry'){for(const s of [-1,1]){const horn=piece(earGeom,skin,s*.35,1.97,.7,root);horn.rotation.z=s*.24;}}
  if(source.kind==='stalker'||source.kind==='grazer'){for(const s of [-1,1]){const ear=piece(earGeom,skin,s*.28,1.88,.46,root);ear.scale.set(.7,.7,.7);}}
  root.scale.setScalar(size);root.userData={species:source.id,residentId:`${region.id}:${source.id}:${Math.floor(i/species.length)}`,behavior:source.behavior,region:region.id,mechanic:'habitat_actor'};
  actors.push({root,legs,source,skin,baseSize:size,origin:{x,z},phase:i*1.479,velocity:.38+source.aggression*.5,index:i,spawnNumber:Math.floor(i/species.length)});
 }
 // Stable waypoints generated from the actual habitat, not camera/frame rate.
 function destination(a,segment){
  if(segment<=0)return a.origin;
  const radius=a.source.behavior==='migrate'?5.6:a.source.behavior==='ambush'?3.4:2.9;
  const rand=frac(Math.sin((a.index+1)*91.71+segment*17.31+region.seed)*43758.5453);
  const theta=rand*2*Math.PI,radiusFactor=.35+.6*frac(Math.sin(segment*39.11+a.index*7.5)*24677.82);
  const x=clamp(a.origin.x+Math.cos(theta)*radius*radiusFactor,-30,30);
  const z=clamp(a.origin.z+Math.sin(theta)*radius*radiusFactor,-30,30);
  for(let k=0;k<=8;k++){const q=k/8,px=a.origin.x+(x-a.origin.x)*q,pz=a.origin.z+(z-a.origin.z)*q;
   if(!world.evaluate(px,pz).traversalPassable||Math.abs(px-riverX(pz))<2.7)return a.origin;}
  return {x,z};
 }
 // The authoritative roster is cached at accepted game transitions, not recomputed per frame.
 let residentStamp='',byIndex=new Map();
 function update(time){
  if(atlas){const stamp=`${atlas.residentTick}:${atlas.eventNumber}:${atlas.activeRegion}:${quality}`;
   if(stamp!==residentStamp){byIndex=new Map(atlas.residents().map(r=>[r.index,r]));residentStamp=stamp;}}
  for(const a of actors){
   const authoritative=atlas?byIndex.get(a.index):null;
   if(atlas&&!authoritative){a.root.visible=false;continue;}
   // This interpolation changes only rendered geometry. Clicks target the resident ID;
   // combat always reads its exact authoritative position from AtlasWorld.
   let xx=authoritative?.x??a.origin.x,zz=authoritative?.z??a.origin.z;
   if(!atlas){const r=wildlife?.sample(a.source.id,xx,zz);if((r?.count??10)<(a.spawnNumber+1)*3){a.root.visible=false;continue;}}
   a.root.visible=true;
   const pos=a.root.position;
   if(!a._visualInitialized||Math.hypot(pos.x-xx,pos.z-zz)>10){pos.x=xx;pos.z=zz;a._visualInitialized=true;}
   const dx=xx-pos.x,dz=zz-pos.z,displacement=Math.hypot(dx,dz);
   const easing=Math.min(.3,Math.max(.05, .15));pos.x+=dx*easing;pos.z+=dz*easing;
   const loc=world.sample(xx,zz);pos.y=world.h[iAt(xx,zz)]-.12+(a.source.kind==='chanter'?.15:.025)*Math.sin(time*.002+a.phase);
   const scales={tide:loc.moisture*.6+loc.water*.7,ash:loc.ash+loc.fire*.4,stone:loc.stone,echo:loc.resonance*.8+loc.aether*.55};
   const sorted=Object.entries(scales).sort((a,b)=>b[1]-a[1]),form=sorted[0][1]>.64?sorted[0][0]:'native';
   const tint=form==='tide'?0x8abfc1:form==='ash'?0xb76a4c:form==='stone'?0x85878a:form==='echo'?0xb7b5f3:palette[a.source.kind];
   a.skin.color.setHex(palette[a.source.kind]).lerp(new THREE.Color(tint),form==='native'?0:.56);
   a.root.scale.setScalar(a.baseSize*(form==='stone'?1.13:form==='echo'?.98:1));a.root.userData.morph=form;
   a.root.userData.census=authoritative?.census??wildlife?.sample(a.source.id,xx,zz).count??null;
   if(displacement>.008)a.root.rotation.y=Math.atan2(dx,dz);
   const gait=displacement>.008?Math.min(1,displacement*.4+.3):.07;
   for(const leg of a.legs)leg.pivot.rotation.x=Math.sin(time*.006+a.phase+((leg.side*leg.front)>0?0:Math.PI))*.38*gait;
  }
 }

 return {actors,update,dispose(){for(const g of [...geom])g.dispose();for(const m of mat)m.dispose();group.clear();}};
}

/** Settlement residents visibly follow an authored role schedule, with no fake NPC physics. */
export function createCitizens(THREE,atlas,group){const region=atlas.region,actors=[],shapes=[],materials=[];
 const robe=new THREE.MeshStandardMaterial({color:region.biome==='burnt'?0x8f6752:region.biome==='highland'?0x7889ae:0x789c97,roughness:.94});
 const skin=new THREE.MeshStandardMaterial({color:0xcba889,roughness:.94}),hair=new THREE.MeshStandardMaterial({color:0x574b3b,roughness:1});materials.push(robe,skin,hair);
 const sphere=new THREE.SphereGeometry(1,10,8),tube=new THREE.CylinderGeometry(.15,.2,1,8),coat=new THREE.CylinderGeometry(.48,.35,1.4,9);shapes.push(sphere,tube,coat);
 const descriptions=[['elder',17,12],['merchant',21,14],['warden',13,15],['singer',-14,-10]];
 for(const [role,x,z] of descriptions){const root=new THREE.Group();group.add(root);
  const torso=new THREE.Mesh(coat,robe);torso.position.y=1.3;torso.castShadow=true;root.add(torso);
  const head=new THREE.Mesh(sphere,skin);head.position.y=2.25;head.scale.set(.34,.41,.33);head.castShadow=true;root.add(head);
  const hairpiece=new THREE.Mesh(sphere,hair);hairpiece.position.y=2.51;hairpiece.scale.set(.37,.21,.35);root.add(hairpiece);
  const arms=[];for(const s of [-1,1]){const pivot=new THREE.Group();pivot.position.set(s*.53,1.83,0);root.add(pivot);const arm=new THREE.Mesh(tube,robe);arm.position.y=-.44;arm.scale.set(.72,.92,.72);arm.castShadow=true;pivot.add(arm);arms.push({pivot,s});}
  const legs=[];for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(side*.22,.78,0);root.add(pivot);const leg=new THREE.Mesh(tube,robe);leg.position.y=-.37;leg.scale.set(.9,.73,.9);leg.castShadow=true;pivot.add(leg);legs.push({pivot,side});}
  root.scale.setScalar(.77);root.userData={npc:`${region.id}.${role}`,role,region:region.id};actors.push({root,role,x,z,arms,legs});
 }
 return {update(t){const w=atlas.world,e=atlas.economies[region.id],work=atlas.age%2===0&&w.sky!=='rain';
  for(let i=0;i<actors.length;i++){const a=actors[i],u=t*.00036*(.7+e.condition*.3)+i*1.71,r=work?1.6:.3;
   const x=a.x+Math.sin(u)*r,z=a.z+Math.cos(u*.76)*r;
   a.root.position.set(x,w.h[iAt(x,z)],z);a.root.rotation.y=Math.atan2(Math.cos(u),-Math.sin(u*.76));
   for(const arm of a.arms)arm.pivot.rotation.x=Math.sin(u*8+arm.s)*.16*(work?1:.2);
   for(const leg of a.legs)leg.pivot.rotation.x=Math.sin(u*8+(leg.side===1?0:Math.PI))*.13*(work?1:.2);
  }},dispose(){group.clear();for(const g of shapes)g.dispose();for(const m of materials)m.dispose();},count:actors.length};
}
