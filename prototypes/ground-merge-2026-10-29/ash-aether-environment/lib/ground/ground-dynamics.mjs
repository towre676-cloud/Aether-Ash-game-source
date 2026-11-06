/** A&A Ground Dynamics. No renderer or game engine dependency.
 * Every floor cell is actual state that weather, actors, impacts and battles can modify.
 * A coarse state grid (0.5–2m cells) is deliberately separate from high-resolution art.
 */
import {analyzeGround,getGroundMaterial} from './ground-materials.mjs';
const clamp=(x)=>Math.max(0,Math.min(1,x));
const delta = (arr,i,value)=>{arr[i]=clamp(arr[i]+value);};
export class GroundDynamics{
 constructor({columns=32,rows=32,cellSize=1,originX=0,originZ=0,materialId='clay-earth',materialAt=null,seed=61029,onEvent=null}={}){
  if(!Number.isInteger(columns)||!Number.isInteger(rows)||columns<2||rows<2||columns*rows>65536)throw new RangeError('Grid bounds invalid (2+ per axis, <=65536 cells)');
  if(!Number.isFinite(cellSize)||cellSize<=0)throw new RangeError('cellSize must be positive');
  this.columns=columns;this.rows=rows;this.cellSize=cellSize;this.originX=originX;this.originZ=originZ;this.seed=seed;
  this.materialAt=materialAt??(()=>materialId);this.onEvent=onEvent;this.elapsed=0;this.events=[];
  const N=columns*rows;this.fields={wet:new Float32Array(N),heat:new Float32Array(N),charge:new Float32Array(N),phase:new Float32Array(N),fracture:new Float32Array(N),traffic:new Float32Array(N)};
  this.materials=Array.from({length:N},(_,i)=>getGroundMaterial(this.materialAt(...this.world(i))).id);
 }
 index(x,z){const col=Math.floor((x-this.originX)/this.cellSize),row=Math.floor((z-this.originZ)/this.cellSize);return col<0||col>=this.columns||row<0||row>=this.rows?-1:row*this.columns+col;}
 world(i){return [this.originX+(i%this.columns+.5)*this.cellSize,this.originZ+(Math.floor(i/this.columns)+.5)*this.cellSize];}
 surface(x,z){const i=this.index(x,z);if(i<0)return null;const m=this.materials[i];const st=this.cell(i);
  const physics=analyzeGround(m,{wetness:st.wet,energy:st.phase,wear:st.traffic});
  const conductivity=clamp(physics.conduction+st.charge*.23),traction=clamp(physics.traction-.15*st.fracture),
    cover=clamp(physics.groundShield-.42*st.fracture+st.phase*.08);
  return {i,...physics,wetness:st.wet,temperature:st.heat,charge:st.charge,phase:st.phase,
   fracture:st.fracture,traffic:st.traffic,conduction:conductivity,traction,
   movementCost:1+1.2*(1-traction)+st.fracture*.35,groundShield:cover};
 }
 cell(i){if(i<0||i>=this.materials.length)throw new RangeError('cell index out of range');return Object.fromEntries(Object.entries(this.fields).map(([k,a])=>[k,a[i]]));}
 neighbors(i){const x=i%this.columns,y=Math.floor(i/this.columns),result=[];
  if(x>0)result.push(i-1);if(x<this.columns-1)result.push(i+1);
  if(y>0)result.push(i-this.columns);if(y<this.rows-1)result.push(i+this.columns);return result;}
 emit(event){const item={...event,t:this.elapsed};this.events.push(item);if(this.events.length>256)this.events.shift();this.onEvent?.(item);return item;}
 /** Persistent impressions. A creature or player can infer traffic, make noise or hide. */
 step(x,z,{actor='player',weight=1,speed=1,stealth=0}={}){
  const s=this.surface(x,z);if(!s)return null;const pressure=Math.max(0,Math.min(2,weight))*Math.max(0,Math.min(2,speed));
  delta(this.fields.traffic,s.i,.013*pressure*(.4+s.tracePersistence));
  const noise=clamp(s.noise*pressure*(1-.55*clamp(stealth)));
  const track=clamp(s.tracePersistence*(.24+pressure*.33)+this.fields.traffic[s.i]*.2);
  const event=this.emit({type:'ground-step',actor,x,z,material:s.id,noise,track,moveCost:s.movementCost,
   danger:s.fracture>.7?'fragile-floor':noise>.73?'audible-to-creatures':null});
  return event;
 }
 /** Impacts are numerical, with thresholds for actual gameplay changes. */
 impact(x,z,{element='kinetic',strength=.6,actor='world'}={}){
  const s=this.surface(x,z);if(!s)return null;const f=this.fields,i=s.i,str=Math.max(0,Math.min(1,strength)),m=getGroundMaterial(s.id);
  const effects=[];
  switch(element){
   case 'water': delta(f.wet,i,.55*str+.12*m.physics.permeability*str);delta(f.heat,i,-.40*str);if(s.temperature>.62)effects.push('steam-cloud');break;
   case 'fire': delta(f.heat,i,.63*str*(.55+m.physics.heat));delta(f.wet,i,-.34*str);if(m.physics.heat>.65&&s.temperature>.54)effects.push('thermal-hazard');break;
   case 'lightning': delta(f.charge,i,(.24+.62*m.physics.conductivity)*str);if(m.physics.conductivity>.64)effects.push('conductive-chain');if(s.wetness>.55)effects.push('electrified-water');break;
   case 'aether': delta(f.phase,i,(.34+.52*m.physics.resonance)*str);if(m.physics.resonance>.75)effects.push('phase-path');break;
   case 'frost': delta(f.heat,i,-.44*str);delta(f.fracture,i,.15*str);if(s.wetness>.4)effects.push('icy-footing');break;
   case 'kinetic': delta(f.fracture,i,(1-m.physics.shelter)*str*.57);if(f.fracture[i]>.68)effects.push('cover-fractured');break;
   default: throw new RangeError('Unsupported element: '+element);
  }
  if(f.wet[i]>.5&&f.charge[i]>.48)effects.push('arc-puddle');
  if(f.fracture[i]>.85&&m.physics.shelter>.4)effects.push('shortcut-opening');
  if(f.phase[i]>.7&&m.physics.resonance>.8)effects.push('recording-revealed');
  return this.emit({type:'ground-impact',actor,x,z,material:m.id,element,strength:str,effects,
    consequence:{newWet:+f.wet[i].toFixed(3),newHeat:+f.heat[i].toFixed(3),newCharge:+f.charge[i].toFixed(3),newPhase:+f.phase[i].toFixed(3),newFracture:+f.fracture[i].toFixed(3)}});
 }
 /** Wet ground flows into nearby permeable cells; heat, charge & phase diffuse
  * according to material response, with energy loss and mobile-safe bounded steps.
  */
 tick(dt,{rain=0,ambientHeat=.16,wind=.2}={}){
  if(!Number.isFinite(dt)||dt<0)throw new RangeError('dt must be nonnegative');
  const steps=Math.min(40,Math.ceil(dt/.2));if(!steps)return;
  const slice=dt/steps;
  for(let pass=0;pass<steps;pass++){
   const F=this.fields,next=Object.fromEntries(Object.entries(F).map(([k,arr])=>[k,new Float32Array(arr)]));
   for(let i=0;i<this.materials.length;i++){
    const props=getGroundMaterial(this.materials[i]).physics,near=this.neighbors(i);
    let w=0,h=0,c=0,p=0;for(const j of near){w+=F.wet[j]-F.wet[i];h+=F.heat[j]-F.heat[i];c+=F.charge[j]-F.charge[i];p+=F.phase[j]-F.phase[i];}
    const norm=near.length/4;
    next.wet[i]=clamp(F.wet[i]+slice*(.17*props.permeability*w+clamp(rain)*.09*props.permeability-(.016+ambientHeat*.032)*F.wet[i]));
    next.heat[i]=clamp(F.heat[i]+slice*(.12*h+(.018*ambientHeat)-(.016+.022*F.wet[i])*(F.heat[i]-ambientHeat)));
    next.charge[i]=clamp(F.charge[i]+slice*(.28*props.conductivity*c-.14*F.charge[i]));
    next.phase[i]=clamp(F.phase[i]+slice*(.10*props.resonance*p-.038*F.phase[i]));
    next.fracture[i]=clamp(F.fracture[i]-slice*.00006); // almost permanent; repair only through campaign actions
    next.traffic[i]=clamp(F.traffic[i]-slice*(.002+.009*clamp(rain))*(1-.45*props.permeability));
   }
   this.fields=next;this.elapsed+=slice;
  }
 }
 /** Deliberate repair/crafting action, not automatic cosmetic restoration. */
 repair(x,z,{strength=.35,materialResource=null}={}){
   const s=this.surface(x,z);if(!s)return null;
   if(!materialResource)return this.emit({type:'ground-repair-failed',reason:'missing-material-resource',x,z});
   delta(this.fields.fracture,s.i,-clamp(strength));
   return this.emit({type:'ground-repair',x,z,material:s.id,resource:materialResource,
    integrity:1-this.fields.fracture[s.i]});
 }
 save(){return {version:1,columns:this.columns,rows:this.rows,cellSize:this.cellSize,originX:this.originX,originZ:this.originZ,
   seed:this.seed,elapsed:this.elapsed,materials:[...this.materials],fields:Object.fromEntries(Object.entries(this.fields).map(([k,v])=>[k,Array.from(v)]))};}
 load(snapshot){if(snapshot?.version!==1||snapshot.columns!==this.columns||snapshot.rows!==this.rows||snapshot.cellSize!==this.cellSize||snapshot.originX!==this.originX||snapshot.originZ!==this.originZ||snapshot.seed!==this.seed)throw new RangeError('Incompatible ground snapshot');
  if(!Number.isFinite(snapshot.elapsed)||snapshot.elapsed<0)throw new RangeError('Invalid elapsed time');
  if(snapshot.materials.length!==this.materials.length)throw new RangeError('Missing ground materials');
  for(let i=0;i<this.materials.length;i++)getGroundMaterial(snapshot.materials[i]);
  const next={};for(const k of Object.keys(this.fields)){
   const a=snapshot.fields[k];if(!Array.isArray(a)||a.length!==this.materials.length||a.some(v=>!Number.isFinite(v)||v<0||v>1))throw new RangeError('Malformed field '+k);
   next[k]=Float32Array.from(a);
  }
  this.materials=[...snapshot.materials];this.fields=next;this.elapsed=snapshot.elapsed;this.events=[];
 }
}
export function createGroundDynamics(options){return new GroundDynamics(options);}
