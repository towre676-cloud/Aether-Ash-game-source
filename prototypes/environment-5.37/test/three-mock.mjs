/** Structural WebGL scene mock: validates the actual art construction paths in CI.
 * This is NOT a pixel or GPU equivalence test.
 */
class Vector3{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 copy(v){return this.set(v.x,v.y,v.z);}
 clone(){return new Vector3(this.x,this.y,this.z);}
 sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
 add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
 multiplyScalar(n){this.x*=n;this.y*=n;this.z*=n;return this;}
 length(){return Math.hypot(this.x,this.y,this.z);}
 normalize(){return this.multiplyScalar(1/(this.length()||1));}
 setScalar(n){return this.set(n,n,n);}
}
class Group{
 constructor(){this.children=[];this.position=new Vector3;this.rotation=new Vector3;this.scale=new Vector3(1,1,1);this.quaternion={setFromUnitVectors:()=>{}};this.userData={};this.name='';}
 add(o){if(o.parent)o.parent.remove(o);this.children.push(o);o.parent=this;}
 remove(o){this.children=this.children.filter(x=>x!==o);if(o.parent===this)o.parent=null;}
 clear(){this.children=[];}
 traverse(f){f(this);for(const c of this.children)c.traverse(f);}
 updateMatrix(){this.matrix={pos:[this.position.x,this.position.y,this.position.z],scale:[this.scale.x,this.scale.y,this.scale.z]};}
 updateMatrixWorld(){this.matrixWorld={};for(const c of this.children)c.updateMatrixWorld();}
}
class Attr{
 constructor(values,itemSize){this.values=values;this.array=values;this.itemSize=itemSize;this.count=values.length/itemSize;}
 getX(i){return this.values[i*this.itemSize]??0;}
 getY(i){return this.values[i*this.itemSize+1]??0;}
 getZ(i){return this.values[i*this.itemSize+2]??0;}
 setXYZ(i,x,y,z){const p=i*this.itemSize;this.values[p]=x;this.values[p+1]=y;this.values[p+2]=z;}
}
class Geometry{
 constructor(...args){this.args=args;this.attributes={position:new Attr([0,0,0,1,0,0,0,1,0],3)};this.index=null;this.disposed=false;}
 setAttribute(key,attribute){this.attributes[key]=attribute;}
 setIndex(idx){this.index={count:idx.length};}
 computeVertexNormals(){if(!this.attributes.normal)this.attributes.normal=new Attr(new Array(this.attributes.position.count*3).fill(1),3);}
 getAttribute(k){return this.attributes[k];}
 applyMatrix4(){return this;}
 toNonIndexed(){this.index=null;return this;}
 clone(){const g=new Geometry();g.attributes=Object.fromEntries(Object.entries(this.attributes).map(([k,v])=>[k,new Attr([...v.values],v.itemSize)]));g.index=this.index?{count:this.index.count}:null;return g;}
 dispose(){this.disposed=true;}
}
class Mesh extends Group{constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true;}}
class InstancedMesh extends Mesh{
 constructor(geometry,material,count){super(geometry,material);this.isInstancedMesh=true;this.count=count;this.instanceMatrix={needsUpdate:false};this.instances=[];this.instanceColor=null;}
 setMatrixAt(i,m){this.instances[i]=m;}
 setColorAt(i,c){this.instanceColor={needsUpdate:false};}
 dispose(){this.disposed=true;}
}
class Material{constructor(p){this.params=p;this.color=new Color(p.color||0x999999);}dispose(){this.disposed=true;}}
class Color{constructor(c=0xffffff){this.setHex(c);}
 setHex(c){this.hex=c;this.r=((c>>>16)&255)/255;this.g=((c>>>8)&255)/255;this.b=(c&255)/255;return this;}
 getHex(){return this.hex;}
 multiplyScalar(k){this.r*=k;this.g*=k;this.b*=k;return this;}
}
class Shape{constructor(){this.holes=[];this.ops=[];}
 moveTo(...args){this.ops.push(['moveTo',...args]);}lineTo(...args){this.ops.push(['lineTo',...args]);}closePath(){this.ops.push(['close']);}quadraticCurveTo(...args){this.ops.push(['quad',...args]);}}
class Path extends Shape{}
class Light extends Group{dispose(){this.disposed=true;}}
export const MockTHREE={Group,Mesh,InstancedMesh,Vector3,Object3D:Group,Float32BufferAttribute:Attr,BufferGeometry:Geometry,
 BoxGeometry:Geometry,CylinderGeometry:Geometry,ConeGeometry:Geometry,SphereGeometry:Geometry,IcosahedronGeometry:Geometry,TorusGeometry:Geometry,
 OctahedronGeometry:Geometry,TetrahedronGeometry:Geometry,DodecahedronGeometry:Geometry,ExtrudeGeometry:Geometry,
 MeshStandardMaterial:Material,Shape,Path,Color,PointLight:Light,DoubleSide:2};
export const countNames=(root)=>{const names=[];root.traverse(o=>{if(o.name)names.push(o.name);});return names;};
