/** Region-specific architecture and ecology. Every placement carries a stable game meaning.
 * Materials/styles are derived from regional resources and persistent ecology, rather than random clutter.
 */
import {iAt,riverX} from './world.mjs';
export function decorateRegion(THREE,world,region,group,atlas=null){
 const shared={},created=[];
 const mk=(hex,roughness=.86,metalness=0,emissive=0)=>new THREE.MeshStandardMaterial({color:hex,roughness,metalness,emissive,emissiveIntensity:emissive?.7:0});
 const mats={wall:mk(region.biome==='volcanic'?0x514e53:region.biome==='clay'?0xc5a18a:region.biome==='coast'?0xd3cac0:0xb8aea0),
 stone:mk(region.biome==='volcanic'?0x363b43:region.biome==='highland'?0x8a91aa:0x8b9391),
 dark:mk(0x463e3b),wood:mk(0x826c57),roof:mk(region.biome==='burnt'?0x584b42:region.biome==='coast'?0x476a83:region.biome==='clay'?0x9d6749:0x435e59),
 copper:mk(0x977253,.48,.45),glow:mk(0xa9dfe5,.32,.1,0x418ec3),glass:new THREE.MeshPhysicalMaterial({color:0x91d6cf,metalness:.25,roughness:.12,transmission:.1,opacity:.8,transparent:true}),
 foliage:mk(region.biome==='burnt'?0x867960:region.biome==='coast'?0x87ad9f:0x779272)};
 const height=(x,z)=>world.h[iAt(x,z)];
 function mesh(geo,mat,x,y,z,name,parent=group){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;m.name=name;parent.add(m);created.push(m);return m;}
 function box(x,y,z,w,h,d,mat,name,parent=group){return mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,name,parent);}
 function cyl(x,y,z,r,h,mat,name,segments=10,parent=group){return mesh(new THREE.CylinderGeometry(r,r*1.12,h,segments),mat,x,y,z,name,parent);}
 function beam(a,b,rad,mat,name){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),dif=vb.clone().sub(va);const m=mesh(new THREE.CylinderGeometry(rad,rad,dif.length(),7),mat,0,0,0,name);m.position.copy(va.add(vb).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dif.normalize());return m;}
 function house(x,z,width=5,depth=5,story=3){const y=height(x,z);const g=new THREE.Group();g.position.set(x,y,z);group.add(g);
  // A gable has a single coherent roof ridge rather than disconnected boxes.
  box(0,.18,0,width+.55,.36,depth+.5,mats.stone,'house_foundation',g);
  box(0,story*.5+.28,0,width,story,depth,mats.wall,'house_walls',g);
  const shape=new THREE.Shape();shape.moveTo(-width*.55,0);shape.lineTo(0,width*.36);shape.lineTo(width*.55,0);shape.lineTo(-width*.55,0);
  const roof=mesh(new THREE.ExtrudeGeometry(shape,{depth:depth+.65,bevelEnabled:false,steps:1}),mats.roof,0,story+.27,-depth*.5-.325,'pitched_roof',g);
  roof.castShadow=true;
  // Door and accessible approach consistently face the +Z road.
  box(-width*.14,1.22,depth*.5+.035,1.14,2.05,.11,mats.dark,'actual_door',g);
  cyl(-width*.14+.39,1.25,depth*.5+.115,.055,.12,mats.copper,'door_handle',8,g).rotation.x=Math.PI/2;
  for(const side of [-1,1]){box(side*width*.32,2.04,depth*.5+.045,.82,.92,.11,mats.dark,'window_frame',g);box(side*width*.32,2.04,depth*.5+.105,.61,.70,.035,mats.glow,'lit_window',g);}
  box(width*.26,story+width*.36+.6,0,.75,1.4,.75,mats.stone,'chimney',g);
  for(const sx of [-1,1])for(const zz of [-1,1])cyl(sx*width*.48,.38,zz*depth*.48,.10,.5,mats.wood,'support_post',7,g);
  return g;
 }
 function tower(x,z,kind='watch'){const y=height(x,z);const stack=kind==='watch'?5:8;
  const base=cyl(x,y+.5,z,2.4,1,mats.stone,'tower_foundation',12);
  cyl(x,y+stack*.52,z,1.7,stack,mats.wall,'tower_body',12);
  cyl(x,y+stack+.35,z,2.05,.65,mats.stone,'tower_cap',12);
  const spire=mesh(new THREE.ConeGeometry(2.15,2.8,12),mats.roof,x,y+stack+1.93,z,'tower_roof');
  for(let i=0;i<6;i++){const a=i*Math.PI/3;cyl(x+Math.cos(a)*1.65,y+stack*.76,z+Math.sin(a)*1.65,.15,1.55,mats.copper,'tower_rib',6);}
  return {base,spire};
 }
 function terrace(x,z,r,mat=mats.stone){const y=height(x,z);cyl(x,y+.12,z,r,.24,mat,'stable_terrace',18);return y+.24;}
 function garden(x,z,rows=5,cols=8,material='orchard'){const y=height(x,z),density=world.b[iAt(x,z)],wet=world.m[iAt(x,z)];
  // Crop density is the same biomass and moisture that drive harvest and trading.
  for(let a=0;a<rows;a++)for(let b=0;b<cols;b++){
   if(((a*13+b*17)%17)/17>density*1.25)continue;
   const xx=x+(b-cols/2)*.72,zz=z+(a-rows/2)*.84,yy=height(xx,zz);
   const growth=(.3+density*.65)*(.65+wet*.4);
   cyl(xx,yy+growth*.42,zz,.038,growth*.8,mats.wood,'crop_stalk',5);
   const leaf=mesh(new THREE.SphereGeometry(.25*growth,7,5),mats.foliage,xx,yy+growth*.93,zz,'harvestable_crop');
   leaf.scale.set(1.5,.7,1.2);leaf.userData={resource:region.resource,harvestable:true,region:region.id};
  }
 }
 function circuit(x,z,count=7,rad=4){const y=height(x,z);
  for(let i=0;i<count;i++){
   const a=i*Math.PI*2/count,xx=x+Math.cos(a)*rad,zz=z+Math.sin(a)*rad,yy=height(xx,zz);
   cyl(xx,yy+.65,zz,.24,1.3,mats.stone,'resonant_pillar',8);
   mesh(new THREE.OctahedronGeometry(.37,0),mats.glow,xx,yy+1.52,zz,'aether_sensor').userData={mechanic:'resonance',cell:iAt(xx,zz)};
  }
  const core=mesh(new THREE.TorusGeometry(rad*.8,.09,8,56),mats.copper,x,y+.27,z,'hydrophone_ring');core.rotation.x=Math.PI/2;
 }
 function oreVein(x,z,n=5){for(let i=0;i<n;i++){
   const angle=i*2.3999,d=1+Math.sqrt(i)*.95,xx=x+Math.cos(angle)*d,zz=z+Math.sin(angle)*d,yy=height(xx,zz);
   const shard=mesh(new THREE.OctahedronGeometry(.65+i*.08,0),mats.glass,xx,yy+.48,zz,'mineral_resource');shard.rotation.set(i*.31,i*.71,i*.17);
   shard.userData={resource:region.resource,region:region.id,mechanic:'mineral_extraction'};
  }}
 function pathRoad(a,b,width=.85){const vertices=[],indices=[],steps=28;
  const dx=b[0]-a[0],dz=b[1]-a[1],dist=Math.hypot(dx,dz),nx=-dz/dist,nz=dx/dist;
  for(let j=0;j<=steps;j++){const t=j/steps,x=a[0]+dx*t,z=a[1]+dz*t;
   for(const sign of [-1,1]){const xx=x+nx*width*sign,zz=z+nz*width*sign;vertices.push(xx,height(xx,zz)+.072,zz);}
   if(j<steps){const k=j*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
  const road=mesh(geo,mats.wall,0,0,0,'walkable_roads');road.castShadow=false;road.userData={mechanic:'walk_cost',region:region.id};
 }
 function sluice(x,z){const y=height(x,z);for(const s of [-1,1])cyl(x+s*2,y+1.25,z,.36,2.5,mats.stone,'sluice_pylon');
  beam([x-2.2,y+2.55,z],[x+2.2,y+2.55,z],.2,mats.copper,'sluice_brace');
  const gate=box(x,y+1.16+(world.sluiceOpen?2.1:0),z,3.6,2,.3,mats.dark,'sluice_leaf');gate.userData={gameEvent:'QUEST_SLUICE_OPENED',control:'sluice'};
 }
 function forge(x,z){const y=height(x,z);terrace(x,z,5);cyl(x,y+1,z,2,1.7,mats.dark,'forge_foundation',12);
  mesh(new THREE.ConeGeometry(1.6,3.6,9),mats.copper,x,y+3.4,z,'forge_furnace');
  for(let i=0;i<5;i++){const a=i*1.2566;box(x+Math.cos(a)*3,y+.55,z+Math.sin(a)*3,1,.8,1.25,mats.stone,'fuel_oven');}
 }
 function bridgeCrossing(){const x=riverX(5),z=5;
  const left=height(x-7,z),right=height(x+7,z),deck=Math.max(left,right,.1)+.72;
  // Every legal path cell at this crossing is physically supported by visible geometry.
  for(let j=0;j<21;j++){
   const xx=x-6.95+j*.695;
   if(!world.bridgeRepaired&&![0,1,2,4,6,10,15,19,20].includes(j))continue;
   const plank=box(xx,deck,z,.67,.17,2.7,mats.wood,'bridge_plank');plank.userData={mechanic:'crossing',repaired:world.bridgeRepaired};
  }
  for(const side of [-1,1]){
   beam([x-7.2,deck-.27,z+side*1.24],[x+7.2,deck-.27,z+side*1.24],.18,mats.dark,'bridge_beam');
   for(const j of [-7,-3.5,0,3.5,7])cyl(x+j,deck+.54,z+side*1.22,.10,1.25,mats.wood,'bridge_rail_post',7);
   if(world.bridgeRepaired)beam([x-7,deck+1.15,z+side*1.22],[x+7,deck+1.15,z+side*1.22],.08,mats.wood,'bridge_rail');
  }
 }
 function roots(x,z){const y=height(x,z);const a=mesh(new THREE.IcosahedronGeometry(2.4,2),mats.foliage,x,y+5,z,'old_growth_crown');
  cyl(x,y+2.35,z,.75,4.7,mats.wood,'old_growth_trunk',12);
  for(let i=0;i<7;i++){const phi=i*2.4,d=3+(i%3),xx=x+Math.cos(phi)*d,zz=z+Math.sin(phi)*d;
   beam([x,y+2,z],[xx,height(xx,zz)+.2,zz],.18,mats.wood,'exposed_root');}
  a.userData={quest:'roots_singing',mechanic:'root_memory'};
 }
 function stiltHouse(x,z){const y=height(x,z);for(const dx of [-2.1,2.1])for(const dz of [-2,2])cyl(x+dx,y+1.1,z+dz,.18,2.3,mats.wood,'flood_stilt');
  const floor=box(x,y+2.45,z,5.8,.28,5.6,mats.wood,'raised_foundation');
  // Align a full building with its elevated deck, not float its base independently.
  const g=house(x,z,4,4,2.6);g.position.y=y+2.4;
  for(let i=0;i<6;i++)box(x+3.1,y+.3+i*.37,z+1.8-i*.4,.85,.17,.55,mats.wood,'access_stair');
  return floor;
 }
 function monument(x,z,shape='arch'){const y=height(x,z);terrace(x,z,4.2);
  for(const s of [-1,1])cyl(x+s*2.1,y+2.2,z,.4,4.2,mats.stone,'memorial_pillar',10);
  beam([x-2.2,y+4.15,z],[x+2.2,y+4.15,z],.35,mats.copper,'memorial_lintel');
  const gem=mesh(new THREE.OctahedronGeometry(.83,0),mats.glass,x,y+3.7,z,'memory_crystal');gem.userData={mechanic:'history_echo',region:region.id,quest:region.id};}
 bridgeCrossing();
 if(atlas?.epoch>0){const y=height(-24,-22),im=atlas.imprint,rx=-24,rz=-22;
  // Previous cycles are visible objects whose size/material depends on saved historical consequences.
  cyl(rx,y+.3,rz,2.4,.6,mats.stone,'epoch_monument');
  for(const [i,amount] of [im.groves,im.scars,im.harmonic,Math.min(1,im.bridges/3)].entries()){
   const xx=rx-1.35+i*.9,h=.3+amount*2.4;
   const p=cyl(xx,y+.72+h*.5,rz,.22,h,i===1?mats.dark:i===2?mats.glow:mats.copper,'historical_imprint_pillar');p.userData={epoch:atlas.epoch,mechanic:['grove_memory','fire_scars','phase_memory','road_legacy'][i],numericValue:amount};
  }
 }
 const complete=(atlas?.completed||[]).some(id=>id.startsWith(region.id)||id==='rain_recovery'&&region.id==='hearthland');
 if(complete){const x=-13,z=-8,y=height(x,z);const m=mesh(new THREE.OctahedronGeometry(.62,1),mats.glow,x,y+2.6,z,'quest_state_lantern');m.userData={mechanic:'quest_completed',region:region.id};}
 pathRoad([-16,-10],[riverX(5),5],.73);pathRoad([17,14],[riverX(5),5],.79);pathRoad([-23,18],[-16,-10],.65);
 const architecture=region.architecture;
 if(architecture==='chapel'){house(17,14,5.2,4.8);house(-23,18,4.1,4.2);sluice(riverX(14),14);circuit(-16,-10,8,5.2);garden(19,20,5,7);}
 if(architecture==='forest'){roots(-14,-10);house(18,14,5.1,4.8);garden(15,20,6,7);circuit(-15,-10,6,6);}
 if(architecture==='stilt'){stiltHouse(18,15);stiltHouse(-18,-12);sluice(riverX(14),14);garden(22,21,5,8);}
 if(architecture==='orchard'){house(17,14,6.4,5.2);house(-18,-10,4.1,4);garden(14,22,7,10);monument(-16,-10);}
 if(architecture==='forge'){forge(-16,-10);tower(18,14,'watch');oreVein(-21,14,8);monument(-16,-10);}
 if(architecture==='kiln'){house(18,14,6,5);forge(-16,-10);garden(15,22,5,8);oreVein(-23,-13,5);}
 if(architecture==='lighthouse'){tower(-16,-10,'high');stiltHouse(17,14);oreVein(20,20,7);circuit(-16,-10,7,4.5);}
 if(architecture==='engine'){tower(-16,-10,'high');circuit(-16,-10,9,7);oreVein(18,14,12);monument(17,13);}
 if(architecture==='citadel'){tower(18,14,'high');forge(-16,-10);oreVein(-21,15,10);monument(-16,-10);}
 return {dispose(){for(const m of created){m.geometry.dispose();}for(const mat of Object.values(mats))mat.dispose();group.clear();},objectCount:created.length};
}
