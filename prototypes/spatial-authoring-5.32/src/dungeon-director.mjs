import {hash32} from './util.mjs';

const PHASES=['approach','threshold','read','manipulate','encounter','aftermath','release'];
const FORMS=['floodgate','resonance-lock','counterweight','heat-channel','root-lattice','wind-vane','memory-lens','pressure-bridge'];

export function buildDungeonSequence({id='dungeon',rooms=6,region='ash'}={}){
  const out=[];
  for(let i=0;i<rooms;i++){
    const form=FORMS[(hash32(`${id}:${i}:${region}`)>>>0)%FORMS.length];
    const phase=PHASES[Math.min(PHASES.length-1,Math.floor(i*PHASES.length/Math.max(1,rooms)))];
    out.push({
      id:`${id}:room:${i+1}`,index:i,phase,form,
      visibleState:{before:`${form}:blocked`,during:`${form}:moving`,after:`${form}:changed`},
      verb:form==='floodgate'?'redirect-water':
           form==='resonance-lock'?'match-frequency':
           form==='counterweight'?'shift-mass':
           form==='heat-channel'?'route-heat':
           form==='root-lattice'?'grow-cut-roots':
           form==='wind-vane'?'redirect-air':
           form==='memory-lens'?'align-memory':
           'balance-pressure',
      consequence:i===rooms-1?'open-exit':(i%2?'alter-next-room':'create-traversal')
    });
  }
  return {id,region,rooms:out};
}

export function applyDungeonAction(room,action){
  const success=action===room.verb;
  return {
    roomId:room.id,
    success,
    state:success?room.visibleState.after:room.visibleState.before,
    animation:success?room.visibleState.during:'feedback:reject',
    consequence:success?room.consequence:'none'
  };
}
