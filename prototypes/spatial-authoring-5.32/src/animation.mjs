import {clamp} from './util.mjs';
export function motionState({speed=0,turnRate=0,air=false,action=null,hit=0,mounted=false}={}){
 if(hit>0)return {state:'recoil',weight:clamp(hit),rootLock:.12};
 if(action)return {state:`action:${action}`,weight:1,rootLock:.18};
 if(air)return {state:'airborne',weight:1,rootLock:0};
 if(mounted)return {state:speed>.2?'mounted_run':'mounted_idle',weight:1,rootLock:0};
 if(speed<.05&&Math.abs(turnRate)>.2)return {state:'turn_in_place',weight:clamp(Math.abs(turnRate)),rootLock:.08};
 if(speed<.05)return {state:'idle',weight:1,rootLock:.1};
 if(speed<.45)return {state:'walk',weight:clamp(speed/.45),rootLock:0};
 return {state:'run',weight:clamp((speed-.35)/.65),rootLock:0};
}
export function strideProfile(speed){const cadence=2.0+clamp(speed)*1.9;return {cadence,plant:Math.max(.07,.14-clamp(speed)*.04),bob:0.018+clamp(speed)*.014,lean:clamp(speed)*.055};}
