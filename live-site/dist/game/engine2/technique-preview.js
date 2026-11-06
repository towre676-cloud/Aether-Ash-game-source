import {payTechnique} from './mako.js?v=5.16.0';
import {withDoctrines} from './constellation-model.js';
/** Quote the actual payment rule on a copy; preview never spends a turn. */
export function techniquePreview(battle,hero,recipe,{allowCharging=false}={}){
 if(!hero||!recipe)return {enabled:false,reason:'No technique selected.',costText:''};
 const tech=withDoctrines(hero,recipe),copy={...hero},partners=tech.link?(battle?.heroes||[]).filter(h=>h!==hero&&h.hp>0&&h.atb>=.5&&h.mp>=4).slice(0,tech.rank>=2?2:1):[];
 let reason='';
 if(battle?.ended)reason='This encounter is finished.';
 else if(hero.hp<=0)reason='This traveller is down.';
 else if(hero.atb<1&&!allowCharging)reason='Gathering focus…';
 else if(tech.link&&!partners.length)reason='Link needs an ally with half a gauge and 4 MP.';
 const paid=payTechnique(copy,tech);
 if(!reason&&!paid)reason=hero.strain+(Math.max(0,tech.cost-hero.mp)?Math.max(0,tech.cost-hero.mp)*4:tech.overdrive?22:3)>100?'Too much strain · Guard to recover.':'Overdraw would exhaust your HP · Guard or use an Ether.';
 const mp=Math.min(hero.mp,tech.cost),hp=Math.max(0,tech.cost-hero.mp)*3,strain=paid?Math.max(0,copy.strain-(tech.strainRebate||0))-hero.strain:0;
 const costText=(hp?mp:tech.cost)+' MP'+(hp?' · '+hp+' HP overdraw':'')+(paid?' · '+(strain>=0?'+':'')+strain+' strain':'')+(partners.length?' · '+partners.length+' linked '+(partners.length===1?'ally':'allies')+' (4 MP each)':'');
 const effectText=[tech.healing?(tech.revive?'Restores a fallen ally':'Helps the ally who needs it most'):({single:'One target',chain:'Jumps between nearby targets',burst:'Nearby targets',line:'Targets along the line',field:'Nearby targets'})[tech.shape],tech.interrupt?'Interrupts charged attacks':'',tech.echo?'Repeats after a delay':'',tech.field?'Leaves a lasting field':'',tech.counter?'Prepares a counter':''].filter(Boolean).join(' · ');
 return {enabled:!reason,reason,costText,effectText,mp,hp,strain,partners:partners.map(h=>h.id)};
}
