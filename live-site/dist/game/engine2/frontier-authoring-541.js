/** Five native frontier landforms. Coordinates, commissions and supplies keep
 * their original owners: only the same 34x28 traversable substrate is authored. */
export const FRONTIER_LAYOUT_VERSION_541=1;
export const FRONTIER_ANCHORS_541=Object.freeze({arrival:[4,23],board:[6,22],camp:[8,23],survey:[10,8],apparatus:[24,7],enemyA:[25,20],enemyB:[27,20],previous:[4,13],next:[29,13],previousEntry:[5,13],nextEntry:[28,13]});
const PHASES=['sheltered-loop','bridge-crossing','hollow-ring','switchback-ridge','sanctuary-promenade'];
const LANDFORMS=['dune-ridge','brine-bank','cactus-bed','basalt-ridge','coral-pool','root-bank','crystal-seam','ice-buttress','tundra-cairn','fungal-grove','storm-crag','marble-outcrop'];
const copy=value=>JSON.parse(JSON.stringify(value));
function largestClosedRectangle(rows,box){
 let best=null;for(let z=box.z;z<box.z+box.d;z++)for(let x=box.x;x<box.x+box.w;x++){
  if(rows[z]?.[x]!== '#')continue;let width=box.x+box.w-x;
  for(let end=z;end<box.z+box.d;end++){
   let run=0;while(run<width&&rows[end]?.[x+run]==='#')run++;width=Math.min(width,run);if(width<4)break;const depth=end-z+1;if(depth<4)continue;
   if(!best||width*depth>best.w*best.d)best={x,z,w:width,d:depth};
  }
 }return best;
}
export function frontierFloorPlan541(regionIndex,phase){
 if(!Number.isInteger(regionIndex)||regionIndex<0||regionIndex>11||!Number.isInteger(phase)||phase<0||phase>4)throw Error('Unknown authored frontier');
 const width=34,height=28,rows=Array.from({length:height},()=>Array(width).fill('#')),wet=[1,4,5].includes(regionIndex),mineral=[3,6,7,10,11].includes(regionIndex),drift=(regionIndex%3-1)*.35;
 const open=(x,z)=>{if(x>0&&z>0&&x<width-1&&z<height-1)rows[z][x]='.';};
 const ellipse=(cx,cz,rx,rz)=>{for(let z=Math.max(1,Math.floor(cz-rz));z<=Math.min(height-2,Math.ceil(cz+rz));z++)for(let x=Math.max(1,Math.floor(cx-rx));x<=Math.min(width-2,Math.ceil(cx+rx));x++)if(((x-cx)/rx)**2+((z-cz)/rz)**2<=1)open(x,z);};
 const path=(points,radius=1.08)=>{for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*5));for(let j=0;j<=steps;j++)ellipse(a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps,radius,radius);}};
 const rect=(x,z,w,d)=>{for(let y=z;y<z+d;y++)for(let xx=x;xx<x+w;xx++)open(xx,y);};
 // The shelter is a cluster with a shared forecourt. The survey and repair
 // stations have clear approach bays, rather than signs scattered on a field.
 ellipse(6,23,wet?5.1:5.4,2.6);ellipse(10,8,mineral?3.5:3.8,3.15);ellipse(24,7,3.7,3.2);ellipse(4,13,2.1,2.2);ellipse(29,13,2.1,2.2);
 const A=[6,23],S=[10,8],M=[24,7],P=[4,13],N=[29,13],F=[26,20];
 if(phase===0){
  path([A,[4.5,19.5],P,[6.5,10.5],S]);path([S,[16.5,6.5+drift],M,[28.5,9.5],N,F]);path([F,[20,24],[12,24],A]);
 }else if(phase===1){
  // One visible crossing separates two inhabited banks. The broad closed
  // channel above/below it carries full regional water, roots or cliff forms.
  path([A,[4.5,18.5],P,[6.5,10.5],S]);path([S,[10,11.5],[16,13.5],[21,11.5],M]);path([M,[28.5,9.5],N,F]);
 }else if(phase===2){
  for(let z=3;z<26;z++)for(let x=3;x<32;x++)if(((x-17)/11.3)**2+((z-14)/(wet?9.2:9))**2<=1&&((x-17)/6.5)**2+((z-14)/4.8)**2>=1)open(x,z);
  path([A,[10.5,21], [10.5,19.5]]);path([P,[7,13]]);path([N,[27,13]]);path([S,[11,7]]);path([M,[24,9]]);path([F,[26,18]]);
 }else if(phase===3){
  // The winding service ridge leaves a single broad crag on its lee side.
  path([A,[9,19],[5.5,16],P,[8,12],S,[14,5+drift],[20,5],M,[28.5,9.5],N,F]);
 }else{
  // A narrower processional loop opens into the three working courts, around
  // a quiet protected central grove/pool/outcrop rather than an empty plaza.
  for(let z=3;z<26;z++)for(let x=3;x<32;x++)if(((x-17)/11.6)**2+((z-14)/9.2)**2<=1&&((x-17)/8.8)**2+((z-14)/6.2)**2>=1)open(x,z);
  path([A,[11,23],[12,22]]);path([P,[7,13]]);path([N,[27,13]]);path([S,[12,7]]);path([M,[24,9]]);path([F,[25,19]]);
 }
 // The exact legacy encounter court and every native/travel anchor are sacred.
 // No enemy, patrol identity, objective or portal destination moves.
 rect(21,16,10,9);for(const p of Object.values(FRONTIER_ANCHORS_541))ellipse(p[0],p[1],.78,.78);
 // Seven companion trial origins clone an area-zero frontier. Their borrowed
 // kit encounter has always used these positions; retain that purposeful bay.
 if(phase===0)rect(10,19,6,5);
 const boxes=phase===1?[{x:15,z:1,w:5,d:10},{x:12,z:15,w:8,d:10}]:phase===2?[{x:12,z:10,w:8,d:9}]:phase===3?[{x:12,z:10,w:8,d:9}]:phase===4?[{x:12,z:10,w:8,d:9}]:[{x:12,z:10,w:8,d:9}];
 const closedMasses=boxes.map((box,index)=>{const r=largestClosedRectangle(rows,box);return r?{id:'frontier-'+regionIndex+'-'+phase+'-mass-'+index,kind:LANDFORMS[regionIndex],...r}:null;}).filter(Boolean);
 if(!closedMasses.length)throw Error('Authored frontier lost its broad landform');
 return{width,height,floor:rows.map(r=>r.join('')),frontierAuthoring541:{version:FRONTIER_LAYOUT_VERSION_541,regionIndex,phase,phaseId:PHASES[phase],anchors:copy(FRONTIER_ANCHORS_541),closedMasses,encounterCourt:{x:21,z:16,w:10,d:9}}};
}
/** Versioned reference for saved engagement-mask validation. Never used for
 * newly entered worlds or to move native actors/objective descriptors. */
export function legacyFrontierFloor541(ri,ai){const width=34,height=28,g=Array.from({length:height},()=>Array(width).fill('#'));
 for(let y=2;y<26;y++)for(let x=2;x<32;x++){
  const form=ri%6,shift=ai*2,blocked=form===0?((y+shift+ri)%7===3&&(x+ri)%11<8):form===1?(x>=12+ai&&x<=16+ai&&(y+ri)%9>2):form===2?(Math.hypot(x-15-ai,y-12-ri%3)>5&&Math.hypot(x-15-ai,y-12-ri%3)<7):form===3?((x+shift+ri)%8===4&&(y+ri)%10<7):form===4?((x+y+shift+ri)%13<3):((x*17+y*11+ri*7+ai*13)%67<8);g[y][x]=blocked?'#':'.';}
 const carve=(x,y)=>{for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(y+dy>0&&y+dy<27&&x+dx>0&&x+dx<33)g[y+dy][x+dx]='.';};
 for(let x=4;x<=29;x++)for(const y of[7,13,23])carve(x,y);for(let y=7;y<=23;y++)for(const x of[4,10,24,29])carve(x,y);
 for(let y=16;y<=24;y++)for(let x=21;x<=30;x++)g[y][x]='.';
 for(const[x,y]of[[4,23],[6,22],[8,23],[10,8],[24,7],[25,20],[27,20],[4,13],[29,13]])carve(x,y);
 return{width,height,floor:g.map(r=>r.join(''))};
}
export function isAuthoredFrontier541(scene){return scene?.frontierAuthoring541?.version===FRONTIER_LAYOUT_VERSION_541&&(Number.isInteger(scene.location)&&scene.location>=2000&&scene.location<2060||Number.isInteger(scene.fieldOrigin)&&scene.fieldOrigin>=0&&scene.fieldOrigin<7&&scene.location===4700+scene.fieldOrigin);}
export function stampFrontierPosition541(state,scene){if(state&&isAuthoredFrontier541(scene))state.frontierLayoutVersion=FRONTIER_LAYOUT_VERSION_541;return state;}
function settleFrontierPosition541(state,scene){
 if(!state||!isAuthoredFrontier541(scene))return{migrated:false,from:null,to:null};
 if(!Number.isFinite(state.x)||!Number.isFinite(state.y))throw Error('Invalid saved frontier position');
 const from=[state.x,state.y],blocked=new Set((scene.affordanceBlocked||[]).map(p=>p.join(','))),walk=(x,z)=>scene.floor[Math.floor(z)]?.[Math.floor(x)]==='.'&&!blocked.has(Math.floor(x)+','+Math.floor(z));
 if(walk(...from)){stampFrontierPosition541(state,scene);return{migrated:false,from,to:from.slice()};}
 const cells=[];for(let z=0;z<scene.height;z++)for(let x=0;x<scene.width;x++)if(walk(x+.5,z+.5))cells.push({x:x+.5,y:z+.5,d:Math.hypot(x+.5-state.x,z+.5-state.y)});
 cells.sort((a,b)=>a.d-b.d||a.y-b.y||a.x-b.x);if(!cells.length)throw Error('Authored frontier has no legal player position');
 state.x=cells[0].x;state.y=cells[0].y;stampFrontierPosition541(state,scene);return{migrated:true,from,to:[state.x,state.y]};
}

/** A restored borrowed-kit trial can return to an older saved frontier base.
 * Rebase that one saved position too; its inventory and commission root remain
 * intact, and exiting the trial does not need a second world-state owner. */
export function migrateFrontierPosition541(state,scene){
 if(!state||!isAuthoredFrontier541(scene))return{migrated:false,from:null,to:null};
 const base=state.fieldOrigins?.active?.base;let baseMigration=null;
 if(base&&Number.isInteger(base.scene)&&base.scene>=2000&&base.scene<2060&&Number.isFinite(base.x)&&Number.isFinite(base.y)){
  const index=base.scene-2000,layout=frontierFloorPlan541(Math.floor(index/5),index%5);baseMigration=settleFrontierPosition541(base,{...layout,location:base.scene});
 }
 const result=settleFrontierPosition541(state,scene);return baseMigration?{...result,baseMigration}:result;
}
