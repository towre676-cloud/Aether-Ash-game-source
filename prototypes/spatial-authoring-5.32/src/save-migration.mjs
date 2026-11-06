export const MOMENT_SAVE_VERSION=1;
export function migrateMomentState(save={}){const out=structuredClone(save);out.moment??={};const m=out.moment;m.version=MOMENT_SAVE_VERSION;m.mutations??=[];m.discoveries??=[];m.worldConsequences??={};m.projects??=[];m.activityRecords??={};m.enemyMemory??={};m.bossPhaseHistory??={};return out;}
export function validateMomentState(save){const m=save?.moment;return !!m&&m.version===MOMENT_SAVE_VERSION&&Array.isArray(m.mutations)&&Array.isArray(m.discoveries)&&Array.isArray(m.projects);}
