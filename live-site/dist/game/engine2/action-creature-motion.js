/** Battle pose enhancement for canonical renderer. Visual-only; does not affect simulation. */
export function creaturePoseFeedback(actor, time, {reducedMotion=false}={}) {
  if (!actor || !Number.isFinite(time)) return {lift:0,scale:1,alpha:1};
  if (reducedMotion) return {lift:0,scale:1,alpha:1};
  const active = actor.hp > 0;
  const flash = Math.max(0,Math.min(.25,Number(actor.flash)||0));
  const attacking = active && (actor.intent || actor.pose>0);
  const windup = active && !!actor.intent;
  const lift = attacking ? -Math.sin(time*17)*1.8 : 0;
  const scale = windup ? 1.035 : attacking ? 1.015 : 1;
  const alpha = active ? 1 : Math.max(.25,1-(Number(actor.deathFade)||0));
  return {lift:lift-flash*8,scale:scale+flash*.15,alpha};
}
