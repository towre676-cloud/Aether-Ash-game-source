import {inPast} from './origins.js?v=5.38';

/** One input owner for past-life and present-day mechanisms. Progress remains
 * transient; the native world interaction owns every completed consequence. */
export function createWorldControls(world,origins,campaign){
 const current=()=>inPast(world)?origins:campaign;
 return {
  objects:()=>current()?.objects()||[],
  isControl:object=>object?.type==='embodied-action'||!!campaign?.isControl(object),
  beginAction:(object,options)=>current()?.beginAction(object,options)||false,
  setProgress:(value,options)=>current()?.setProgress(value,options)||false,
  completeAction:()=>current()?.completeAction()||false,
  cancelAction(reason){origins?.cancelAction(reason);campaign?.cancelAction(reason);},
  advance(dt,input={}){const past=inPast(world);origins?.advance(dt,{...input,active:input.active!==false&&past});campaign?.advance(dt,{...input,active:input.active!==false&&!past});},
  snapshot:()=>current()?.snapshot()||null,
  get active(){return !!current()?.active;},
  get pending(){return current()?.pending||null;}
 };
}
