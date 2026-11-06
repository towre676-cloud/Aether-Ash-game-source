/** CPU-only, headless diagnostic. Does NOT measure Three.js GPU performance. */
import {performance} from 'node:perf_hooks';
import {createGrassField} from './grass-renderer.mjs';
class Vec2{constructor(x=0,y=0){this.set(x,y)}set(x,y){this.x=x;this.y=y;return this}normalize(){let d=Math.hypot(this.x,this.y)||1;this.x/=d;this.y/=d;return this}}
class Vec4{constructor(){}set(){return this}}
class Color{constructor(x){this.x=x}clone(){return new Color(this.x)}multiplyScalar(){return this}lerp(){return this}set(){return this}}
class Geometry{constructor(){this.attrs={}}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]}setIndex(){}computeBoundingSphere(){}dispose(){}}
class Attribute{constructor(array,itemSize){this.array=array;this.itemSize=itemSize}}
class Mat{constructor(o){this.uniforms=o.uniforms}dispose(){}}
class Obj{constructor(){this.position={set(){}},this.rotation={set(){}},this.scale={set(){}},this.matrix={}}updateMatrix(){}}
class Mesh{constructor(g,m,n){this.geometry=g;this.material=m;this.instanceMatrix={count:n,setUsage(){}};this.count=0}setMatrixAt(){}setColorAt(){this.instanceColor={}}}
const T={Vector2:Vec2,Vector4:Vec4,Color,BufferGeometry:Geometry,Float32BufferAttribute:Attribute,InstancedBufferAttribute:Attribute,ShaderMaterial:Mat,Object3D:Obj,InstancedMesh:Mesh,DoubleSide:2,DynamicDrawUsage:35048};
function attempt(quality,maxPlants,view){const sc={add(){},remove(){}};
 const f=createGrassField(T,sc,{quality,maxPlants,seed:135,biomeAt:()=> 'orchard',terrainHeight:(x,z)=>.2*Math.sin(x*.1)*Math.cos(z*.1),
 cameraView:view?{x:0,z:-7,forwardX:0,forwardZ:1,nearRadius:9,halfAngleDegrees:66}:null});
 const s=f.getStats(),a=performance.now();for(let i=0;i<3;i++)f.build(i*2,0);
 const ms=(performance.now()-a)/3;f.dispose();return {quality,maxPlants,viewCulling:view,plants:s.plants,flowers:s.flowers,instancesAllocated:s.allocatedInstances,drawCalls:s.drawCalls,viewRejected:s.viewRejected,avgRebuildMs:Math.round(ms*10)/10};}
const data=[];for(const q of ['low','medium','high'])for(const view of [false,true])data.push(attempt(q,{low:4000,medium:7000,high:10000}[q],view));
console.log(JSON.stringify({kind:'CPU_MOCK_ONLY__NOT_GPU_OR_END_USER_FPS',machine:process.version,date:new Date().toISOString(),data},null,2));
