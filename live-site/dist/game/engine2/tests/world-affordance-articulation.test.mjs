import test from 'node:test';
import assert from 'node:assert/strict';
import {articulationCells,worldAffordanceObjects} from '../world-affordances.js';
import {World} from '../world.js';
import {readFileSync} from 'node:fs';
const key=p=>p.join(',');
function flood(scene,start,blocked=null){
 const out=[],seen=new Set(),queue=[start];
 if(scene.floor[start[1]]?.[start[0]]!=='.'||key(start)===key(blocked||[]))return out;
 seen.add(key(start));
 for(let i=0;i<queue.length;i++){const p=queue[i];out.push(p);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
  const n=[p[0]+dx,p[1]+dy],k=key(n);if(!seen.has(k)&&k!==key(blocked||[])&&scene.floor[n[1]]?.[n[0]]==='.'){seen.add(k);queue.push(n);}
 }}return out;
}
function run(seed){
 let x=seed|0;const next=()=>{x=Math.imul(x^x>>>15,0x45d9f3b)|0;return(x>>>0)/4294967296;};
 const w=16,h=15,rows=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>x>0&&y>0&&x<w-1&&y<h-1&&next()>.29?'.':'#').join(''));
 const scene={width:w,height:h,floor:rows};let start=null;for(let y=0;y<h&&!start;y++)for(let x=0;x<w;x++)if(rows[y][x]==='.') {start=[x,y];break;}
 if(!start)return;
 const cells=flood(scene,start);const critical=articulationCells(scene,{cells});
 for(const p of cells){
  if(key(p)===key(start))continue;
  const remain=flood(scene,start,p).length;
  assert.equal(critical.has(key(p)),remain!==cells.length-1,'seed '+seed+' candidate '+p);
 }
}
test('iterative linear-time articulation algorithm equals exact removal BFS on 120 diverse masks',()=>{
 for(let seed=1;seed<=120;seed++)run(seed);
});
test('real 120x120 dungeon repair placement retains connectivity without per-candidate floods',()=>{
 const source=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8')),world=new World(source);
 for(const location of [228,229,230,47,70,2000,2004,2059]){
  world.state.scene=location;world.state.x=world.scene.arrive[0]+.5;world.state.y=world.scene.arrive[1]+.5;
  const cells=flood(world.scene,world.scene.arrive),critical=articulationCells(world.scene,{cells}),pick=cells.filter((p,i)=>i%Math.max(1,Math.floor(cells.length/6))===0).slice(1,6);
  for(const p of pick)if(key(p)!==key(world.scene.arrive))assert.equal(critical.has(key(p)),flood(world.scene,world.scene.arrive,p).length!==cells.length-1,'real scene '+location+' '+p);
  const objects=worldAffordanceObjects(world);assert.ok(Array.isArray(objects));
  if(location===228)console.info('WORKSHOP_AFFORDANCE',JSON.stringify({count:objects.length,kinds:objects.map(o=>o.affordanceKind),walkable:cells.length}));
 }
});
