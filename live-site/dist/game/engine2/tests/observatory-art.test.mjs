import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry,C} from '../cistern-renderer.js';
import {CisternSoftwarePainter} from '../cistern-software.js';
import {migrateEmbodiedOrigins} from '../embodied-origins.js';
import {buildObservatoryGeometry,appendObservatoryDynamics,appendObservatoryCastShadows,observatoryScenePlan,observatoryVisualState,observatoryLighting,observatoryLights,isObservatory} from '../observatory-art.js';

const raw=JSON.parse(readFileSync(new URL('../world.json',import.meta.url)));
function setup(id){const w=new World(raw);w.newGame({originId:'veyr-storm',quiet:true});w.state.scene=id;w.state.mode='field';return w;}
function dynamic(w,feedback=null){const m=new Geometry(),g=new Geometry();appendObservatoryDynamics(m,g,{world:w,time:0,feedback,objects:w.objects()});return [...m.v,...g.v];}
const floor=(w,x,z)=>w.scene.floor[Math.floor(z)]?.[Math.floor(x)]==='.';

test('Veyr is a bounded authored headland with a large receiver silhouette and connected deep foundation',()=>{
 for(const id of[50012,50013]){
  const w=setup(id),before=w.save(),scene=JSON.stringify(w.scene),mesh=buildObservatoryGeometry(Geometry,C,w),plan=observatoryScenePlan(w);
  assert.ok(isObservatory(w));assert.ok(mesh.v.every(Number.isFinite));assert.ok(mesh.v.length/36<15000,'bounded static budget includes the authored masonry, equipment and distant reply station');
  assert.deepEqual(buildObservatoryGeometry(Geometry,C,w).v,mesh.v,'same authored place produces exact stable geometry');
  const atMast=[];let sea=0,deep=0;
  for(let i=0;i<mesh.v.length;i+=12){if(Math.hypot(mesh.v[i]-plan.body.x,mesh.v[i+2]-plan.body.z)<2)atMast.push(mesh.v[i+1]);if(mesh.v[i+1]===-5.25)sea++;if(mesh.v[i+1]<-5.5)deep++;}
  assert.ok(Math.max(...atMast)>6.2,'the functional receiver is a dominant vertical landmark');assert.ok(sea>1000&&deep>50,'water lies below a deep connected rock mass');
  assert.equal(w.save(),before);assert.equal(JSON.stringify(w.scene),scene,'drawing cannot edit authored collision or stations');
 }
});

test('every actual observatory walking cell receives authored paving without low solid fixtures on the route',()=>{
 for(const id of[50012,50013]){
  const w=setup(id),m=buildObservatoryGeometry(Geometry,C,w),paved=new Set(),intrusions=[];
  for(let i=0;i<m.v.length;i+=36){
   const points=[m.v.slice(i,i+3),m.v.slice(i+12,i+15),m.v.slice(i+24,i+27)],y=points.reduce((n,p)=>n+p[1]/3,0),x=points.reduce((n,p)=>n+p[0]/3,0),z=points.reduce((n,p)=>n+p[2]/3,0);
   if(points.every(p=>Math.abs(p[1]-.02)<.00001)&&m.v[i+4]>.99)paved.add(Math.floor(x)+','+Math.floor(z));
   // Roofs and aerial rigging may legitimately cross overhead. Low solid
   // architectural faces must remain in actual closed cells.
   if(y>.10&&y<1.20&&m.v[i+9]!==3&&floor(w,x,z))intrusions.push({x,y,z,material:m.v[i+9]});
  }
  for(let z=0;z<w.scene.height;z++)for(let x=0;x<w.scene.width;x++)if(floor(w,x+.5,z+.5))assert.ok(paved.has(x+','+z),id+' actual floor '+x+','+z);
  assert.deepEqual(intrusions,[],id+' no invisible low wall or workbench on the walking floor');
 }
});

test('native repair, receiver, diversion and reply choices have distinct visible states at the same animation time',()=>{
 const w=setup(50012);migrateEmbodiedOrigins(w.state);const before=dynamic(w),record=w.state.embodiedOrigins.origins['veyr-storm'];
 record.receiver=true;assert.notDeepEqual(dynamic(w),before,'receiver acknowledgement appears at its wall panel');
 record.grounded=true;const ground=dynamic(w);assert.notDeepEqual(ground,before,'main conductor and calibration rings receive ground');
 record.repair=0;const raised=dynamic(w);record.repair=1;assert.notDeepEqual(dynamic(w),raised,'split coil and raised vane have different actual geometry');
 delete record.repair;const pending={pending:{object:{id:'test',originId:'veyr-storm',manipulation:'lever'},progress:.5}};
 assert.notDeepEqual(dynamic(w,pending),dynamic(w),'moving the physical lever previews a halfway vane position');
 w.state.scene=50013;record.diverted=false;const spare=dynamic(w);record.diverted=true;assert.notDeepEqual(dynamic(w),spare,'spare perch and ground conductor show successful diversion');
 record.choice=0;const shared=dynamic(w);record.choice=1;assert.notDeepEqual(dynamic(w),shared,'shared watch and independent windows have distinct reply lamps');
 const saved=w.save();dynamic(w);assert.equal(w.save(),saved,'visual dynamics cannot advance or spend a native choice');
});

test('software cast shadows stay on true ground and scene lights frame architecture without a new clock',()=>{
 for(const id of[50012,50013]){
  const w=setup(id),m=new Geometry();appendObservatoryCastShadows(m,{world:w});assert.ok(m.v.length>0);
  for(let i=0;i<m.v.length;i+=36){let x=0,z=0;for(const j of[0,12,24]){x+=m.v[i+j]/3;z+=m.v[i+j+2]/3;}assert.ok(floor(w,x,z),'shadow cannot bridge sea or a closed station');assert.equal(m.v[i+9],8);assert.ok(m.v[i+11]>0&&m.v[i+11]<.3);assert.ok(m.v[i+1]>.038);}
  const lighting=observatoryLighting(w),lights=observatoryLights(w);assert.ok(lighting.key[0]>lighting.key[2],'warm directional light');assert.ok(lights.length===4&&lights.every(l=>[...l.p,...l.c].every(Number.isFinite)));
 }
 const w=setup(50012);w.state.scene=5;assert.equal(isObservatory(w),false);assert.equal(observatoryScenePlan(w),null);assert.equal(buildObservatoryGeometry(Geometry,C,w).v.length,0);assert.equal(observatoryLighting(w),null);assert.deepEqual(observatoryLights(w),[]);
});


test('the copper vault presents its colored outer skin toward the camera and sea faces stay bounded',()=>{
 for(const id of[50012,50013]){const w=setup(id),plan=observatoryScenePlan(w),mesh=buildObservatoryGeometry(Geometry,C,w);let greenSkin=0,copperSkin=0;
  for(let i=0;i<mesh.v.length;i+=36){const x=(mesh.v[i]+mesh.v[i+12]+mesh.v[i+24])/3,z=(mesh.v[i+2]+mesh.v[i+14]+mesh.v[i+26])/3,y=(mesh.v[i+1]+mesh.v[i+13]+mesh.v[i+25])/3;
   const roofDepth=[mesh.v[i+2],mesh.v[i+14],mesh.v[i+26]],fullVault=Math.min(...roofDepth)<plan.lodge.z-.20&&Math.max(...roofDepth)>plan.lodge.z+plan.lodge.d+.20;
   // The vault spans the full lodge depth. Attached vents and gutters have
   // legitimate vertical/downward faces and are not the curved roof skin.
   if(fullVault&&x>plan.lodge.x-.4&&x<plan.lodge.x+plan.lodge.w+.4&&y>2.96){
    assert.ok(mesh.v[i+4]>0,'roof outer skin must face upward rather than being backface-culled');
    if(mesh.v[i+7]>mesh.v[i+6]*3&&mesh.v[i+7]>.25)greenSkin++;
    if(mesh.v[i+9]===1)copperSkin++;
   }
   if(mesh.v[i+1]===-5.25){for(const j of[12,24])assert.ok(Math.hypot(mesh.v[i]-mesh.v[i+j],mesh.v[i+2]-mesh.v[i+j+2])<=5.66,'sea never relies on a near-plane-crossing giant quad');}
  }assert.ok(greenSkin>=10,'the curved patinated skin is actual roof geometry');assert.ok(copperSkin>=10,'the warm copper half consumes the authored metal surface');
 }
});

test('projected shadow area is conserved and narrow silhouettes retain fractional edges across floor cells',()=>{
 const area=mesh=>{let total=0;for(let i=0;i<mesh.v.length;i+=36){const [ax,az,bx,bz,cx,cz]=[mesh.v[i],mesh.v[i+2],mesh.v[i+12],mesh.v[i+14],mesh.v[i+24],mesh.v[i+26]];total+=Math.abs((bx-ax)*(cz-az)-(bz-az)*(cx-ax))/2;}return total;};
 for(const id of[50012,50013]){
  const w=setup(id),native=new Geometry();appendObservatoryCastShadows(native,{world:w});let fractional=0;
  for(let i=0;i<native.v.length;i+=36){const vertices=[0,12,24].map(j=>[native.v[i+j],native.v[i+j+2]]),x=vertices.reduce((n,p)=>n+p[0]/3,0),z=vertices.reduce((n,p)=>n+p[1]/3,0),cellX=Math.floor(x),cellZ=Math.floor(z);
   assert.ok(floor(w,x,z));for(const [px,pz]of vertices){assert.ok(px>=cellX-1e-9&&px<=cellX+1+1e-9&&pz>=cellZ-1e-9&&pz<=cellZ+1+1e-9,'all clipped vertices stay inside that true floor cell');if(Math.abs(px-Math.round(px))>1e-5||Math.abs(pz-Math.round(pz))>1e-5)fractional++;}
  }assert.ok(fractional>12,'diagonal mast/lodge silhouettes must not be quantized into whole square tiles');
  // A fully open test court admits all original silhouettes. Their areas are
  // analytic parallelogram/trapezoid areas, independent of the clipping code.
  const original=w.scene.floor,width=w.scene.width,height=w.scene.height;w.scene.width=w.scene.height=40;w.scene.floor=Array.from({length:40},()=>'.'.repeat(40));
  const full=new Geometry();appendObservatoryCastShadows(full,{world:w});w.scene.floor=original;w.scene.width=width;w.scene.height=height;
  const expected=observatoryScenePlan(w).lodge.w*3.2+(.72+.65)*.5*5.5+2*.70*2.1;
  assert.ok(Math.abs(area(full)-expected)<1e-8,'cell subdivision must conserve the actual projected shadow area');assert.ok(area(native)<=area(full));
 }
});

test('actual software headland cliffs occupy visible architecture bands above the sea instead of the buried-foundation band',()=>{
 const previous=globalThis.OffscreenCanvas,noop=()=>{};
 const context=()=>({rows:[],setTransform:noop,clearRect:noop,fillRect:noop,save:noop,restore:noop,translate:noop,scale:noop,drawImage:noop,
  createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})});
 globalThis.OffscreenCanvas=class{constructor(width,height){this.width=width;this.height=height;this.context=context();}getContext(){return this.context;}};
 try{
  for(const id of[50012,50013]){
   const world=setup(id),geometry=buildObservatoryGeometry(Geometry,C,world),canvas={width:388,height:842,getContext:()=>context()},painter=new CisternSoftwarePainter(canvas);
   const nativeSurface=painter._surface.bind(painter);painter._surface=(data,i,...args)=>{
    const result=nativeSurface(data,i,...args),mat=data[i+15];
    // Tag the actual emitted material families after native lighting; the
    // unmodified renderer still owns clipping, subdivision and layer order.
    if(mat===6.25)result.color='native-exposed-cliff';
    if(mat===6&&Math.abs(data[i+19]+5.25)<1e-5)result.color='native-sea';
    return result;
   };
   painter._paintTriangle=(ctx,row)=>(ctx.rows.push(row),{draws:1,textured:0});
   const vp=new Float32Array([.05,0,0,0,0,.08,-.005,0,0,-.04,.005,0,-.5,.2,0,1]);
   const stats=painter.render({meshes:{static:{data:geometry.data(),count:geometry.v.length/12}},vp,eye:[10,14,26],lights:[],lighting:observatoryLighting(world),state:{adventure:true,scenicHorizon:true,groundClipY:-5.4,player:{x:10,z:14}}});
   const bands=painter.staticFrame.bands,cliff=bands.filter(b=>b.canvas.context.rows.some(r=>r.color==='native-exposed-cliff')),sea=bands.filter(b=>b.canvas.context.rows.some(r=>r.color==='native-sea'));
   assert.ok(cliff.length>0&&sea.length===1,'both actual coast faces and the sea reach the software paint pass');
   assert.ok(cliff.every(b=>b.layer===0),'visible cliff faces remain in depth-sorted architecture bands');assert.equal(sea[0].layer,-2,'the sea remains the ground backdrop');
   assert.ok(painter.visible.indexOf(sea[0])<Math.min(...cliff.map(b=>painter.visible.indexOf(b))),'sea is composited before the exposed cliff bands');
   assert.ok(stats.submittedTriangles<40000&&stats.triangles<20000,'native subdivision and visible faces stay within the software scene budget');
   const legacy=new Geometry();legacy.quad([0,-1,0],[1,-1,0],[1,-4,0],[0,-4,0],C.stone,7);
   const old=painter._geometry({data:legacy.data(),count:legacy.v.length/12},true);assert.ok(old.length>0);for(let i=22;i<old.length;i+=24)assert.equal(old[i],-2,'ordinary material-7 buried foundations retain their existing layer');
   painter.destroy();
  }
 }finally{if(previous===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=previous;}
});
