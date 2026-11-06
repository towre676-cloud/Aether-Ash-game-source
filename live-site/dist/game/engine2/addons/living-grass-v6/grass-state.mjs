/** Ash & Aether — persistent, deterministic vegetation disturbances.
 * Independent of renderer and save engine. Coordinates are metres; time is world-days.
 * Events are explicitly invoked by the authoritative simulation (not visual proximity).
 */
import {clamp} from './grass-ecology.mjs?v=5.21.0';

const safe = (x, fallback=0) => Number.isFinite(x) ? x : fallback;
const bound = x => clamp(safe(x));
export const VEGETATION_SAVE_VERSION = 2;
export function createVegetationState({seed=316, cellSize=.8, maxCells=18000, initialDay=0}={}) {
  if (!(cellSize>0 && cellSize<=8)) throw Error('cellSize must be between 0 and 8 metres');
  const cells = new Map(); let day=Math.max(0,safe(initialDay));
  const key=(i,j)=>`${i}:${j}`;
  const indexes=(x,z)=>[Math.floor(x/cellSize),Math.floor(z/cellSize)];
  const pristine=()=>({health:1,flatten:0,scorch:0,wet:0,harvested:0});
  const evolve=(c,t)=>{
    const delta=Math.max(0,t-c.day);
    if(delta){
      c.health=1-(1-c.health)*Math.exp(-.18*delta);
      c.flatten*=Math.exp(-3.5*delta);
      c.scorch*=Math.exp(-.045*delta);
      c.wet*=Math.exp(-2.4*delta);
      c.harvested*=Math.exp(-.11*delta);
      c.day=t;
    }
    return c;
  };
  const nearPristine=c=>c.health>.999 && c.flatten<.001 && c.scorch<.001 && c.wet<.001 && c.harvested<.001;
  function cell(i,j,create=false){
    const k=key(i,j);let c=cells.get(k);
    if(c){evolve(c,day); if(nearPristine(c)) {cells.delete(k);c=null;}}
    if(!c && create && cells.size<maxCells){c={i,j,day,...pristine()};cells.set(k,c);}
    return c;
  }
  function sample(x,z){
    if(!Number.isFinite(x)||!Number.isFinite(z))return {...pristine(),vigor:1};
    const [i,j]=indexes(x,z),c=cell(i,j);
    const s=c?{health:c.health,flatten:c.flatten,scorch:c.scorch,wet:c.wet,harvested:c.harvested}:pristine();
    return {...s,vigor:clamp(s.health*(1-.65*s.scorch)*(1-.32*s.flatten),0,1)};
  }
  /** effect(i,j,distanceWeight,currentState) mutates only a bounded area. */
  function affect(x,z,radius,effect){
    if(!Number.isFinite(x)||!Number.isFinite(z))return 0;
    radius=clamp(safe(radius,.4),.05,6);
    const i0=Math.floor((x-radius)/cellSize),i1=Math.floor((x+radius)/cellSize);
    const j0=Math.floor((z-radius)/cellSize),j1=Math.floor((z+radius)/cellSize);
    let changed=0;
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){
      const xx=(i+.5)*cellSize,zz=(j+.5)*cellSize;
      const distance=Math.hypot(xx-x,zz-z);
      if(distance>radius+cellSize*.28)continue;
      const weight=clamp(1-distance/(radius+cellSize*.28));
      const c=cell(i,j,true);if(!c)continue;
      if(effect(c,weight,i,j)!==false)changed++;
    }
    return changed;
  }
  function trample(x,z,{radius=.7,mass=1}={}){
    return affect(x,z,radius,(c,w)=>{
      const push=clamp(mass*.4*w,0,.88);
      c.flatten=clamp(c.flatten+push);
      c.health=clamp(c.health-push*.22);
    });
  }
  function harvest(x,z,{radius=1,effort=1,biome='meadow'}={}){
    const before=sample(x,z),strength=bound(effort);
    const changed=affect(x,z,radius,(c,w)=>{
      c.harvested=clamp(c.harvested+strength*w*.55);
      c.health=clamp(c.health-strength*w*.45);
      c.flatten=clamp(c.flatten+strength*w*.22);
    });
    const kind=biome==='marsh'?'reed-fibre':biome==='aether'?'aether-frond':biome==='ashlands'?'cinder-seed':biome==='tundra'?'frost-sedge':'meadow-herbs';
    return {kind,quantity:changed ? Math.max(0,Math.floor((before.vigor*(1-before.harvested)*strength*changed)/3)):0,changed};
  }
  function ignite(x,z,{radius=1.2,strength=1,moistureAt=()=>.25}={}){
    const amt=bound(strength);
    return affect(x,z,radius,(c,w,i,j)=>{
      const moisture=bound(moistureAt((i+.5)*cellSize,(j+.5)*cellSize));
      const fuel=amt*w*Math.pow(1-moisture,.85)*(1-c.wet);
      if(fuel<=.015)return false;
      // A coherent burn scar, strongest at the epicentre, without random rectangular decals.
      c.scorch=clamp(c.scorch+fuel*.8);
      c.health=clamp(c.health-fuel*.93);
      c.flatten=clamp(c.flatten+fuel*.4);
      c.wet=0;
    });
  }
  function water(x,z,{radius=1.2,amount=1}={}){
    return affect(x,z,radius,(c,w)=>{c.wet=clamp(c.wet+bound(amount)*w);c.scorch=clamp(c.scorch-w*.10);});
  }
  function advanceDays(days){if(!Number.isFinite(days)||days<0)throw Error('world time must be nondecreasing');day+=days;return day;}
  function setDay(t){if(!Number.isFinite(t)||t<day)throw Error('world time must be nondecreasing');day=t;return day;}
  function serialize(){
    const entries=[];
    for(const c of cells.values()){
      evolve(c,day);
      if(!nearPristine(c))entries.push([c.i,c.j,+c.health.toFixed(5),+c.flatten.toFixed(5),+c.scorch.toFixed(5),+c.wet.toFixed(5),+c.harvested.toFixed(5)]);
    }
    entries.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    return {version:VEGETATION_SAVE_VERSION,seed,cellSize,day,entries};
  }
  function restore(save){
    if(!save||save.version!==VEGETATION_SAVE_VERSION||save.seed!==seed||save.cellSize!==cellSize || !Array.isArray(save.entries)) throw Error('incompatible vegetation save');
    if(save.entries.length>maxCells || !Number.isFinite(save.day) || save.day<0) throw Error('invalid vegetation save');
    const incoming=new Map();
    for(const a of save.entries){
      if(!Array.isArray(a)||a.length!==7||!a.every(Number.isFinite)||!Number.isSafeInteger(a[0])||!Number.isSafeInteger(a[1]))throw Error('invalid vegetation entry');
      const [i,j,h,f,s,w,r]=a;
      incoming.set(key(i,j),{i,j,health:bound(h),flatten:bound(f),scorch:bound(s),wet:bound(w),harvested:bound(r),day:save.day});
    }
    if(incoming.size>maxCells)throw Error('vegetation save exceeds capacity');
    cells.clear();for(const [k,v] of incoming)cells.set(k,v);day=save.day;
  }
  function clear(){cells.clear();}
  function getStats(){return {changedCells:cells.size,day,cellSize,maxCells,seed};}
  function samplePatch(x,z,spacing=2,radius=2){
    const out=[];for(let dx=-radius;dx<=radius;dx+=spacing)for(let dz=-radius;dz<=radius;dz+=spacing)out.push({x:x+dx,z:z+dz,...sample(x+dx,z+dz)});
    return out;
  }
  return {sample,trample,harvest,ignite,water,advanceDays,setDay,serialize,restore,clear,getStats,samplePatch};
}
