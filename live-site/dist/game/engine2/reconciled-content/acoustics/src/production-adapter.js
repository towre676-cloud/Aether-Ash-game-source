/* Dependency-injected A&A host hook adapter. Integrators must provide actual
 * game.events.on & game.events.off; there is deliberately no invented global API.
 * Uses explicit event mapping, stable IDs, and unsubscribes on disposal.
 */
const EVENTS=Object.freeze({
 'player:footstrike':'player:step','player:moved':'player:position',
 'world:zoneEntered':'zone:enter','world:weatherChanged':'weather:changed',
 'npc:behavior':'ecology:behavior','npc:activity':'npc:work',
 'monster:shieldChanged':'creature:shield','monster:telegraph':'boss:telegraph',
 'combat:attackResolved':'combat:attack','quest:listen':'player:scan',
 'quest:listenResolve':'player:resolve','world:deviceState':'world:device',
 'timeline:memory':'timeline:consequence','world:resonanceChanged':'material:state',
 'timeline:newGamePlus':'timeline:newgameplus','score:state':'audio:state'
});
export function bindAcousticHost({game,director,onError=()=>{}}={}){
 if(!game?.events||typeof game.events.on!=='function'||typeof game.events.off!=='function'||typeof director?.event!=='function')throw new TypeError('Explicit host event bus and acoustic director required');
 const subscriptions=[];let active=true;
 for(const [hostEvent,audioEvent] of Object.entries(EVENTS)){
  const callback=payload=>{
   if(!active)return;
   Promise.resolve().then(()=>director.event(audioEvent,payload||{})).catch(error=>onError({hostEvent,error:String(error)}));
  };
  game.events.on(hostEvent,callback);subscriptions.push([hostEvent,callback]);
 }
 return {events:[...Object.keys(EVENTS)],dispose(){if(!active)return;active=false;for(const [name,fn] of subscriptions)game.events.off(name,fn);subscriptions.length=0;}};
}
export {EVENTS as CANONICAL_GAME_EVENTS};
