/** Real partitions and named rooms. Every alteration preserves all walkable approaches. */
const DIR=[[1,0],[-1,0],[0,1],[0,-1]];
const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
export function programFor(kind,key){
 if(['home','quarters','nursery'].includes(kind))return {name:'Hearth house with sleeping alcove',form:'domestic',areas:['Sleeping alcove','Kitchen and pantry','Shared living room']};
 if(kind==='inn')return {name:'Inn with guest wing and common room',form:'guest-wing',areas:['Guest rooms','Service kitchen','Common room']};
 if(kind==='clinic')return {name:'Infirmary with separate treatment bays',form:'care-bays',areas:['Treatment ward','Clean preparation','Waiting area']};
 if(['archive','guild','waiting','printshop'].includes(kind))return {name:'Reading hall with records wing',form:'records-wing',areas:['Records and shelves','Copying room','Public reading room']};
 if(['chapel','music','listening'].includes(kind))return {name:'Listening hall with side vestry',form:'side-vestry',areas:['Quiet listening bay','Score vestry','Gathering hall']};
 if(['cargo','store'].includes(kind))return {name:'Receiving hall and separated stockroom',form:'stockroom',areas:['Sorted stock','Receiving office','Loading aisle']};
 if(kind==='garden')return {name:'Growing room with preparation bay',form:'growing-bays',areas:['Growing beds','Potting bay','Watering aisle']};
 return {name:(/pottery/.test(key)||kind==='pottery'?'Pottery':'Craft')+' hall with service bays',form:'work-bays',areas:['Active work bay','Tools and materials','Clear service aisle']};
}
function reachable(grid,start){const q=[start],seen=new Set();for(let i=0;i<q.length;i++){const [x,y]=q[i],k=x+','+y;if(seen.has(k)||grid[y]?.[x]!=='.')continue;seen.add(k);for(const [dx,dy]of DIR)q.push([x+dx,y+dy]);}return seen;}
function spans(grid,axis,at,box){const out=[];let run=[];for(let i=axis==='h'?box.left:box.top;i<=(axis==='h'?box.right:box.bottom)+1;i++){const p=axis==='h'?[i,at]:[at,i];if(grid[p[1]]?.[p[0]]==='.')run.push(p);else{if(run.length>=6)out.push(run);run=[];}}return out;}
export function composeArchitecture(scene,kind,grid,box,legacy=[]){const program=programFor(kind,scene.key),parts=[],openings=[],outerCuts=[],seed=hash(scene.key+':'+scene.location),initial=reachable(grid,scene.arrive),area=initial.size;
 if(area<35){program.name='Service vestibule';program.form='vestibule';program.areas=['Kept stores','Service access','Clear passage'];}
 const anchors=[scene.arrive,...scene.doors.map(o=>o.xy),...scene.objects.flatMap(o=>o.xy?[o.xy]:(o.enemies||[]).map(e=>e[1]))];
 const protectedCell=(x,y)=>anchors.some(p=>Math.hypot(x-p[0],y-p[1])<1.25)||(scene.householdPhysicalSites||[]).some(o=>Math.hypot(x-o.xy[0],y-o.xy[1])<2.2)||legacy.some(o=>o.supply&&x>=o.footprint.x-1&&x<o.footprint.x+o.footprint.w+1&&y>=o.footprint.y-1&&y<o.footprint.y+o.footprint.h+1);
 // Clipped corners and an entry recess give rectangular source maps an actual shell.
 const cuts=[[box.left,box.top],[box.right,box.top],[box.left,box.bottom],[box.right,box.bottom]];
 for(let n=0;n<cuts.length;n++){const [x,y]=cuts[(n+seed%4)%4];if(grid[y]?.[x]!=='.'||protectedCell(x,y))continue;grid[y][x]='#';if(reachable(grid,scene.arrive).size===initial.size-outerCuts.length-1)outerCuts.push({x,y});else grid[y][x]='.';}
 const floorBase=grid.map(r=>r.join(''));
 const width=box.right-box.left+1,height=box.bottom-box.top+1,desired=area>650?3:area>150?2:1;
 const primary=['guest-wing','domestic','care-bays','side-vestry'].includes(program.form)?'h':width>height*1.35?'v':'h';
 // Only complete wall spans with proper 2–3 cell doorways are accepted. No broken picket-fence walls.
 const candidates=[];for(const axis of [primary,primary==='h'?'v':'h']){const lo=axis==='h'?box.top:box.left,hi=axis==='h'?box.bottom:box.right;for(let at=lo+3;at<=hi-3;at++)for(const span of spans(grid,axis,at,box)){for(let gap=2;gap<=span.length-4;gap++){const doorway=span.slice(gap,gap+2),wall=span.filter((_,i)=>i<gap||i>=gap+2);if(wall.some(([x,y])=>protectedCell(x,y)))continue;const target=lo+(hi-lo)*(['domestic','guest-wing'].includes(program.form)?.44:.55),score=wall.length-Math.abs(at-target)*1.6-Math.abs(gap-span.length*.55)*.3+(axis===primary?100:0);candidates.push({axis,at,wall,doorway,score});}}}
 candidates.sort((a,b)=>b.score-a.score);
 for(const c of candidates){if(openings.length>=desired)break;if(openings.some(o=>o.axis===c.axis&&Math.abs(o.at-c.at)<5))continue;if(c.wall.some(([x,y])=>grid[y]?.[x]!=='.'||parts.some(p=>Math.hypot(x-p.x,y-p.y)<2)))continue;const before=reachable(grid,scene.arrive).size;for(const [x,y]of c.wall)grid[y][x]='#';if(reachable(grid,scene.arrive).size!==before-c.wall.length){for(const [x,y]of c.wall)grid[y][x]='.';continue;}for(const [x,y]of c.wall)parts.push({x,y});openings.push({axis:c.axis,at:c.at,cells:c.doorway});}
 // Small busy rooms use a wall-attached alcove return, rather than a freestanding strip of wall.
 if(!parts.length){const edges=[];for(let y=box.top;y<=box.bottom;y++)for(let x=box.left;x<=box.right;x++)if(grid[y]?.[x]==='.'&&DIR.some(([dx,dy])=>grid[y+dy]?.[x+dx]!=='.'))for(const [dx,dy]of DIR){const wall=Array.from({length:3},(_,i)=>[x+dx*i,y+dy*i]);if(wall.some(([a,b])=>grid[b]?.[a]!=='.'||protectedCell(a,b)))continue;edges.push(wall);}for(const wall of edges){const before=reachable(grid,scene.arrive).size;for(const [x,y]of wall)grid[y][x]='#';if(reachable(grid,scene.arrive).size===before-wall.length){parts.push(...wall.map(([x,y])=>({x,y})));break;}for(const [x,y]of wall)grid[y][x]='.';}}
 const zones=[{name:program.areas[0],role:'private',x:box.left,y:box.top,w:Math.max(3,Math.floor(width*.48)),h:Math.max(3,Math.floor(height*.47))},{name:program.areas[1],role:'service',x:Math.floor(box.left+width*.52),y:box.top,w:Math.max(3,Math.floor(width*.48)),h:Math.max(3,Math.floor(height*.47))},{name:program.areas[2],role:'public',x:box.left,y:Math.floor(box.top+height*.5),w:width,h:Math.max(3,Math.floor(height*.5))}];
 return {...program,revision:7,partitions:parts,doorways:openings,outerCuts,floorBase,zones,area};
}
export function fixtureFocus(visual,program){if(!program)return null;const role=['sleeping','treatment','reading'].includes(visual)?'private':['kitchen','pantry','joinery','textiles','ceramics','pumping'].includes(visual)?'service':'public',z=program.zones.find(z=>z.role===role);return z?[z.x+z.w*.25,z.y+z.h*.25]:null;}
