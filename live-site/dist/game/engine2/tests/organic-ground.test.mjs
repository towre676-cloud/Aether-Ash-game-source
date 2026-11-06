import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {groundContours} from '../organic-ground.js';import {World} from '../world.js';
const area=loop=>loop.reduce((a,p,i)=>{const q=loop[(i+1)%loop.length];return a+p[0]*q[1]-q[0]*p[1];},0)/2;
test('organic contours preserve holes, diagonal islands and winding single-cell passages',()=>{for(const floor of [['...','.#.','...'],['.#.','#.#','.#.'],['....','###.','....'],['..##','...#','#...']]){const s={width:floor[0].length,height:floor.length,floor},before=JSON.stringify(s),loops=groundContours(s),count=floor.join('').split('.').length-1;assert.equal(loops.reduce((n,l)=>n+area(l),0),count);const edges=new Set();for(const l of loops)for(let i=0;i<l.length;i++){const a=l[i],b=l[(i+1)%l.length];assert.equal(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]),1);const k=a.join(',')+'>'+b.join(',');assert.ok(!edges.has(k));edges.add(k);}assert.equal(JSON.stringify(s),before);}});
test('all outdoor maps retain their floor area and collision data under contour extraction',()=>{const data=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url))),w=new World(data);for(const s of w.data.scenes.filter(s=>s.biome||['town','market','hub','forest','grove','field','river','summit'].includes(s.key))){const before=JSON.stringify(s),loops=groundContours(s);assert.equal(loops.reduce((n,l)=>n+area(l),0),s.floor.join('').split('.').length-1,s.key);assert.equal(JSON.stringify(s),before);}});
import {Renderer} from '../renderer.js';
test('the 24-cell creature atlas uses all six columns without mixing neighbouring silhouettes',()=>{const calls=[],c={save(){},restore(){},translate(){},scale(){},drawImage(...v){calls.push(v);}},bounds=Array.from({length:24},(_,i)=>({x:i*100,y:i*10,w:40,h:80})),r={assets:{bestiary3:{width:1536,height:1024}},bounds:{bestiary3:bounds},ctx:c};for(let i=0;i<24;i++){Renderer.prototype.atlas.call(r,'bestiary3',i%6,Math.floor(i/6),0,0,48,64);assert.equal(calls.at(-1)[1],i*100);assert.equal(calls.at(-1)[2],i*10);}});

import {groundTextureMarks,groundDressingSites} from '../organic-ground.js';
test('surface flecks form compact sparse groups rather than a field of bright grass hatch marks',()=>{
 for(const kind of ['grass','woodland','soil','stone','foundry']){
  const marks=groundTextureMarks(kind);assert.deepEqual(marks,groundTextureMarks(kind));
  assert.ok(marks.length>30&&marks.length<180,kind+' material detail budget');
  for(const p of marks){assert.ok(p.rx<=2.2&&p.ry<.9);assert.ok(marks.some(q=>q!==p&&Math.hypot(p.x-q.x,p.y-q.y)<25),kind+' fragment stays in a local patch');}
 }
});
test('grouped world dressing leaves streets, arrivals and story interactions quiet without changing floor data',()=>{
 const width=41,height=31,floor=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>x===0||y===0||x===width-1||y===height-1||x===11&&y>5&&y<23?'#':'.').join(''));
 const s={width,height,floor,arrive:[5,5],doors:[{xy:[38,15]}],objects:[{xy:[20,15],type:'npc'},{xy:[31,23],type:'puzzle'}]},before=JSON.stringify(s),streets=new Set(Array.from({length:width-2},(_,x)=>(x+1)+',15'));
 for(const kind of ['grass','woodland','soil','foundry']){
  const sites=groundDressingSites(s,streets,kind);assert.deepEqual(sites,groundDressingSites(s,streets,kind));
  assert.ok(sites.length>0&&sites.length<width*height/6,kind+' sparse habitat groups');
  for(const p of sites){const x=Math.floor(p.x),y=Math.floor(p.y);assert.equal(s.floor[y][x],'.');assert.equal(streets.has(x+','+y),false);for(const q of [s.arrive,...s.doors.map(v=>v.xy),...s.objects.map(v=>v.xy)])assert.ok(Math.hypot(p.x-q[0]-.5,p.y-q[1]-.5)>=1.7);if(kind==='soil'||kind==='foundry')assert.equal(p.kind,'grit');}
 }
 assert.equal(JSON.stringify(s),before);
});
