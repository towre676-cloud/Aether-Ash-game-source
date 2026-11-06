import {createMomentLayer} from './integration.mjs';
import {migrateMomentState} from './save-migration.mjs';
/**
 * Integration sketch for the authoritative A&A host.
 * This is deliberately callback-based: no second movement loop, combat engine,
 * inventory, save file, camera, terrain simulation, or audio graph is created.
 */
export function installMomentLayer(host){
 if(!host?.save||!host?.events) throw new Error('A&A host save + event bus required');
 host.save=migrateMomentState(host.save);
 const layer=createMomentLayer(host);
 const off=[];
 off.push(host.events.on?.('encounter:spawn',e=>{e.actors=e.actors.map(layer.hooks.prepareEnemy)}));
 off.push(host.events.on?.('encounter:victory',e=>host.ui?.showProgressionChoices?.(layer.hooks.afterVictory(e).offers)));
 off.push(host.events.on?.('world:observations',e=>{for(const d of layer.hooks.observe(e.items||[]))host.discovery?.reveal?.(d)}));
 off.push(host.events.on?.('world:event',e=>{host.worldState=layer.hooks.worldEvent(e)}));
 off.push(host.events.on?.('save:before',()=>{host.save.moment.worldConsequences=host.worldState}));
 return {layer,uninstall(){for(const f of off) if(typeof f==='function')f();}};
}
