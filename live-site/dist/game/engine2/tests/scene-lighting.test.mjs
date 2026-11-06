import test from 'node:test';import assert from 'node:assert/strict';
import {daylightAt,sceneLights} from '../scene-lighting.js';
test('lighting follows the existing world clock with continuous day boundaries',()=>{assert.equal(daylightAt(720).sun,1);assert.equal(daylightAt(0).sun,0);assert.ok(daylightAt(480).sun>0);assert.ok(Math.abs(daylightAt(1439.99).sun-daylightAt(.01).sun)<.01);for(let m=0;m<1440;m+=17){const d=daylightAt(m);assert.ok(d.sun>=0&&d.sun<=1);assert.ok(Number.isFinite(d.dx+d.dy));}});
test('light sources belong to real fixtures and have bounded counts',()=>{const s={household:{furnishings:[{furniture:18,footprint:{x:2,y:3,w:1,h:1}},{furniture:0,footprint:{x:1,y:1,w:1,h:2}}]},objects:[{type:'camp',xy:[4,5]},{type:'cache',xy:[7,8]}]};const before=JSON.stringify(s),r=sceneLights(s);assert.equal(r.length,2);assert.equal(r[0].kind,'window');assert.equal(r[1].kind,'fire');assert.equal(JSON.stringify(s),before);assert.ok(sceneLights({objects:Array.from({length:100},()=>({type:'camp',xy:[1,2]}))}).length<=24);});

import {lightingFloor,lightVisibility,fixturePower,paintSceneLighting} from '../scene-lighting.js';
import {furnitureContact,paintContactShadow} from '../contact-shadow.js';
test('sunlit windows go dark at night while steady fire keeps its light',()=>{
 const window={x:0,y:0,kind:'window',power:.22},fire={x:0,y:0,kind:'fire',power:.23};
 assert.equal(fixturePower(window,daylightAt(0),{indoor:true}),0);
 assert.equal(fixturePower(window,daylightAt(720),{indoor:true}),.22);
 assert.equal(fixturePower(fire,daylightAt(720),{indoor:true,steady:true,time:1}),.23);
 assert.equal(fixturePower(fire,daylightAt(720),{indoor:true,steady:true,time:99}),.23);
});
test('a hearth and its interaction marker share one emitted light',()=>{
 const r=sceneLights({household:{furnishings:[{furniture:3,footprint:{x:4,y:5,w:1,h:1}}]},objects:[{type:'camp',xy:[4,5]}]});
 assert.equal(r.length,1);assert.equal(r[0].kind,'fire');assert.ok(r[0].power<=.23);
});
test('interior fixture visibility is cached and cannot pass through a partition wall',()=>{
 const scene={household:{floorBase:['#######','#.....#','#.....#','#.....#','#######'],partitions:[{x:3,y:1,w:1,h:3}]}};
 const floor=lightingFloor(scene);assert.equal(floor.cells.has('3,2'),false);assert.equal(floor.cells.has('2,2'),true);
 const l={x:2.5*48,y:2.5*48,radius:200},polygon=lightVisibility(scene,l);
 assert.equal(polygon.length,72);assert.ok(polygon.every(([x])=>x<3*48));assert.equal(lightVisibility(scene,l),polygon);assert.equal(lightingFloor(scene),floor);
});
test('furniture contact stays below the feet without a detached or room-sized cast',()=>{
 for(const b of [{x:1,y:2,w:1,h:1},{x:4,y:5,w:4,h:2},{x:2,y:3,w:2,h:5}]){const s=furnitureContact(b);assert.equal(s.x,(b.x+b.w/2)*48);assert.equal(s.y,(b.y+b.h)*48-2);assert.ok(s.ry>=2.5&&s.ry<=6);assert.ok(s.rx<b.w*48/2);assert.ok(s.opacity<=.22);}
 assert.equal(furnitureContact({x:0,y:0,w:-1,h:1}),null);
});
test('ambient and contact passes restore alpha, composite mode and transforms',()=>{
 const stack=[],c={globalAlpha:.6,globalCompositeOperation:'multiply',fillStyle:'initial',save(){stack.push({globalAlpha:this.globalAlpha,globalCompositeOperation:this.globalCompositeOperation,fillStyle:this.fillStyle});},restore(){Object.assign(this,stack.pop());},beginPath(){},rect(){},clip(){},fillRect(){},translate(){},scale(){},createRadialGradient(){return {addColorStop(){}};}};
 const scene={household:{floorBase:['###','#.#','###'],partitions:[]}},before={globalAlpha:c.globalAlpha,globalCompositeOperation:c.globalCompositeOperation,fillStyle:c.fillStyle};
 paintSceneLighting(c,[],{scene,state:{townLife:{minutes:720}},time:0,indoor:true,view:{x0:0,y0:0,x1:3,y1:3},steady:true});paintContactShadow(c,furnitureContact({x:1,y:1,w:1,h:1}));assert.deepEqual({globalAlpha:c.globalAlpha,globalCompositeOperation:c.globalCompositeOperation,fillStyle:c.fillStyle},before);assert.equal(stack.length,0);
});
