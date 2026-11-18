import test from 'node:test';
import assert from 'node:assert/strict';
import {adventurePropFamily,appendAdventureStaticProps,appendAdventureWorldProps} from '../adventure-world-props.js';

function fakeMesh(){
 const calls=[];
 const mesh={calls};
 for(const key of ['box','tube','sphere','ring','quad','cylinder'])mesh[key]=(...args)=>{calls.push({key,args})};
 return mesh;
}
function stage(ids=['nell','baker','relay']){
 const all=[
 {id:'nell',type:'npc',festivalCrisis:'nell',xy:[33,35]},
 {id:'baker',type:'npc',festivalCrisis:'baker',xy:[30,33]},
 {id:'relay',type:'switch',festivalCrisis:'relay',xy:[36,36]}
 ],objects=all.filter(o=>ids.includes(o.id));
 const scene={location:5,key:'town',chapter:1,width:48,height:64,floor:Array(64).fill('.'.repeat(48)),objects:[]};
 const world={
  state:{x:33.5,y:34.5,scene:5,chapter:1,flags:{},bosses:[]},
  scene,objects:()=>objects,
  flagFor:()=>8323526,done:()=>false,bit:()=>false
 };
 return {world,objects};
}
test('the three festival actors have physically distinct 3D families',()=>{
 const {world,objects}=stage();
 assert.deepEqual(objects.map(o=>adventurePropFamily(world,o)),['festival-shelter','festival-cart','relay']);
});
test('late-spawned festival objects are NOT permanently baked into entry scene geometry',()=>{
 const {world,objects}=stage(),mesh=fakeMesh();
 appendAdventureStaticProps(mesh,{world,objects});
 assert.equal(mesh.calls.length,0);
});
test('all three stage objects render immediately as scene geometry and signal light',()=>{
 const {world,objects}=stage(),mesh=fakeMesh(),glow=fakeMesh();
 const result=appendAdventureWorldProps(mesh,glow,{world,objects,range:20,time:1});
 assert.equal(result.props,3);
 assert.ok(mesh.calls.filter(x=>x.key==='box').length>=16);
 assert.ok(glow.calls.some(x=>x.key==='sphere'));
});
test('rescued actors disappear from subsequent frames without a scene reload',()=>{
 const full=stage(),mesh=fakeMesh(),glow=fakeMesh();
 assert.equal(appendAdventureWorldProps(mesh,glow,{...full,range:20}).props,3);
 const saved=stage(['baker','relay']);
 assert.equal(appendAdventureWorldProps(fakeMesh(),fakeMesh(),{...saved,range:20}).props,2);
 const restored=stage(['relay']);
 restored.objects[0].festivalCrisis='relay-restored';
 restored.objects[0].type='furnishing';
 assert.equal(appendAdventureWorldProps(fakeMesh(),fakeMesh(),{...restored,range:20}).props,1);
});
