import test from 'node:test';
import assert from 'node:assert/strict';
import {articulationCells} from '../stage-current-affordances.mjs';
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
test('full 120 by 120 connected floor and a single joining bridge retain exact cut vertices',()=>{
 const rows=Array.from({length:120},(_,y)=>Array.from({length:120},(_,x)=>x>0&&x<119&&y>0&&y<119&&(x!==60||y===60)?'.':'#').join(''));
 const scene={width:120,height:120,floor:rows},start=[1,1],cells=flood(scene,start);
 assert.ok(cells.length>13000);
 const critical=articulationCells(scene,{cells});assert.ok(critical.has('60,60'));
 for(const p of [[60,60],[59,60],[61,60],[30,30],[90,90],[1,2]])
  assert.equal(critical.has(key(p)),flood(scene,start,p).length!==cells.length-1);
});
