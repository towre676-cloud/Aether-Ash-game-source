/** A few places have their own physical problem instead of a guessed latch.
 * These small state machines advance through explicit field actions, not time
 * spent in a menu, random answers or an invisible inventory payment. */
const PROFILES={
 3:{kind:'leak',title:'The dry pump room',evidence:'Water marks above a dry outlet',control:'Pump isolation wheel',work:'Silted drain grate',hints:['Follow the fresh water, not the oldest stain.','The inlet still feeds the pipe. Give the remaining pressure a way out before lifting the grate.','Close the supply inlet at the wheel, open its relief outlet, then lift the drain grate.'],initial:{traced:false,isolated:false,vented:false,drained:false}},
 4:{kind:'answer',title:'The vestry return',evidence:'Rain striking the sounding bowls',control:'Small and deep test bells',work:'Dry return cradle',hints:['The rain already makes a phrase here. Listen to its gaps as well as its sounds.','The small bowl starts and ends the answer; the deep bowl enters after a silence.','Use the small bell, let the return settle, use the deep bell, then use the small bell again.'],initial:{heard:false,phrase:0}},
 5:{kind:'routine',title:'The bookbinder’s stair',evidence:'A carrier at the drying rack',control:'Uncounted return tray',work:'Cart-wheel marks',hints:['The carrier moves the same three loads. Watch what the cart covers at each stop.','The return tray is exposed while the carrier warms their hands, after the sorting pass.','Watch successive passes until the carrier is warming their hands, then draw the uncovered tray.'],initial:{observations:0,phase:0}},
 7:{kind:'custody',title:'The seedkeeper’s bothy',evidence:'Fallen seedpods',control:'Dry planter and folded reed mat',work:'A nesting paper moth',hints:['The moth has built around the keepsake. It needs a safe place before you move anything.','A dry planter and a fallen seedpod provide shelter and food without taking living seedlings.','Collect a fallen seedpod, prepare the dry planter, then offer the pod at the nest. Choose where the moth can safely remain.'],initial:{food:false,shelter:false,custody:null,comfortClaimed:false}}
};
export function investigationProfile(chapter){return PROFILES[chapter]||null;}
export function investigationView(state,chapter){const p=PROFILES[chapter];return p?{kind:p.kind,...p.initial,...state?.exploration?.investigations?.[chapter]}:null;}
function stateFor(e,chapter){e.investigations??={};return e.investigations[chapter]??={...PROFILES[chapter].initial};}
export function validateExploration(state){
 const e=state.exploration;if(e===undefined)return;
 if(!e||e.version!==1||!['found','solved','seen','relics'].every(k=>Array.isArray(e[k])&&e[k].length<=256)||e.found.some(x=>typeof x!=='string'||x.length>128)||e.solved.some(x=>typeof x!=='string'||x.length>128))throw Error('Invalid exploration history');
 if(e.investigations===undefined)return;
 if(!e.investigations||typeof e.investigations!=='object'||Array.isArray(e.investigations)||Object.keys(e.investigations).length>4)throw Error('Invalid exploration investigation');
 for(const [chapter,value]of Object.entries(e.investigations)){
  const profile=PROFILES[chapter];if(!profile||!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!(k in profile.initial)))throw Error('Invalid exploration investigation');
  for(const [key,initial]of Object.entries(profile.initial))if(value[key]!==undefined){const v=value[key];if(typeof initial==='boolean'?typeof v!=='boolean':key==='custody'?![null,'released','sheltered'].includes(v):!Number.isInteger(v)||v<0||v>(key==='observations'?3:key==='phrase'?4:2))throw Error('Invalid exploration investigation');}
 }
}
export function investigationProps(chapter){const p=PROFILES[chapter];return p?{evidence:{label:p.evidence,investigationRole:'evidence',guidanceHints:p.hints},control:{label:p.control,investigationRole:'control',guidanceHints:p.hints},work:{label:p.work,investigationRole:'work',guidanceHints:p.hints}}:null;}
export function interactInvestigation(w,o,e){
 if(!o.investigationRole)return false;
 const chapter=w.scene.chapter,p=PROFILES[chapter];if(!p)return false;
 // Synthetic UI targets cannot operate a site in a different room or through
 // an old callback after the player has walked away.
 if(w.state.mode!=='field'||!w.scene.objects.some(v=>v.exploreId===o.exploreId&&v.investigationRole===o.investigationRole)||!o.xy||Math.hypot(w.state.x-o.xy[0]-.5,w.state.y-o.xy[1]-.5)>2.05)return true;
 const s=stateFor(e,chapter),id='district:'+chapter+':latch',solved=e.solved.includes(id);
 const report=text=>{w.callbacks.onExploration?.({type:'exploration-change',scene:w.state.scene,chapter,kind:p.kind,state:{...s},xy:[...o.xy]});w.text(text);};
 const finish=text=>{if(!e.solved.includes(id)){e.solved.push(id);w.callbacks.onMusic('instrument:discovery');}report(text+' The keepsake compartment is now open.');};
 if(solved){
  if(p.kind==='custody'&&o.investigationRole==='work')return w.choose(s.custody==='released'?'A moth circles the open window. Its old nest stays dry.':'The moth rests in the dry planter. The folded mat keeps its eggs above the damp.',[['Sit quietly beside the shelter',()=>{if(s.comfortClaimed)return report('You have already rested here. The moth keeps its own hours.');s.comfortClaimed=true;for(const h of w.activeHeroes)h.strain=Math.max(0,(h.strain||0)-10);report('The crew releases up to 10 strain. Nothing is taken from the nest.');}],['Leave it in peace',()=>{}]]),true;
  report({leak:'The inlet is isolated and the drain runs clear. The floor beneath the shelf stays dry.',answer:'The cradle answers the small bell through a clean interval of silence.',routine:'The return tray slides freely. The carrier leaves the passage open for the next visitor.',custody:'The dry planter and the old nest remain undisturbed.'}[p.kind]);return true;
 }
 const menu=(text,actions)=>w.choose(text,actions.concat([['Leave it as it is',()=>{}]]));
 if(p.kind==='leak'){
  if(o.investigationRole==='evidence')menu('Fresh water beads above an old stain. A dry strip of cloth hangs beside the pipe.',[['Trace the seep with the dry strip',()=>{s.traced=true;report('The strip darkens at the inlet joint. The lower grate is blocked, but it is not the source of the leak.');}]]);
  else if(o.investigationRole==='control')menu('The supply wheel and relief lever move independently. '+(s.isolated?'The feed is closed.':'Water still presses against the inlet.'),[['Open the relief outlet',()=>{if(!s.isolated)return report('Fresh water keeps arriving faster than the outlet can drain. The lower grate is still under pressure.');s.vented=true;report('The trapped water leaves through the open relief. The pipe falls quiet.');}],['Close the supply inlet',()=>{s.isolated=true;report('The wheel seats against its stop. No fresh water reaches the joint; some remains trapped below it.');}]]);
  else menu('Silt holds the grate against its frame.',[['Lift and clear the grate',()=>{if(!s.isolated||!s.vented)return report('Pressure holds the grate down. Releasing the feed and the trapped water will make this safe to lift.');s.drained=true;finish('You lift the lightened grate and clear the silt. A dry ledge appears behind the lowering water.');}]]);
 }else if(p.kind==='answer'){
  if(o.investigationRole==='evidence')menu('Two bowls catch different drops from the roof. Their return reaches the cradle through the wall.',[['Listen through one return',()=>{s.heard=true;report('A small, bright note. A space where only rain can be heard. One deep answer, then the small note again. The cradle clicks on that final return.');}]]);
  else if(o.investigationRole==='work')report('A brass tongue rests inside a latched cradle. It moves when the last sound returns, not when a rope is pulled.');
  else{
   const pattern=['small','rest','deep','small'],act=action=>{if(pattern[s.phrase]===action)s.phrase++;else s.phrase=action===pattern[0]?1:0;if(s.phrase===pattern.length)return finish('The final bright return lifts the cradle latch. The old rainbell tongue is ready to carry back to the main circuit.');report(action==='rest'?'You leave the rope alone. '+(s.phrase===2?'The return fades before the deeper bell can answer.':'The cradle settles; listen to where the gap belongs.'):(action==='small'?'The small bell rings. ':'The deep bell answers. ')+(s.phrase?'The cradle carries that part of the return.':'The return crosses itself. The cradle settles without taking anything.'));};
   menu('The test bells sound only when you choose them. A gap can be part of a phrase.',[['Pull the small bell',()=>act('small')],['Pull the deep bell',()=>act('deep')],['Let the return settle',()=>act('rest')]]);
  }
 }else if(p.kind==='routine'){
  const phases=['The carrier stamps incoming letters. The cart blocks the return tray.','The carrier sorts the drying sheets. A loaded board still covers the tray.','The carrier warms their hands at the stove. The cart stands clear of the return tray.'];
  const watch=()=>{s.observations=Math.min(3,s.observations+1);s.phase=(s.phase+1)%3;report(phases[s.phase]);};
  if(o.investigationRole==='work')report('Three worn tracks meet here: incoming letters, drying sheets, then the stove. The carrier never leaves the loaded board unsupported.');
  else if(o.investigationRole==='evidence')menu(phases[s.phase],[['Watch the next passage',watch]]);
  else menu(phases[s.phase],[['Draw the uncovered return tray',()=>{if(s.phase!==2)return report('The loaded cart still crosses the tray. You wait without disturbing the letters.');finish('You draw the tray while its passage is clear. A seal and the family’s return address lie underneath.');}],['Wait through the next passage',watch]]);
 }else{
  if(o.investigationRole==='evidence')menu('A split seedpod lies below the shelf. The living seedlings are still rooted in their trays.',[['Take only the fallen seedpod',()=>{s.food=true;report('You set the single fallen pod aside for the moth. The seedlings stay where they are.');}]]);
  else if(o.investigationRole==='control')menu('One planter is empty and dry. A reed mat lies folded against its side.',[['Raise the mat inside the dry planter',()=>{s.shelter=true;report('The mat stands above the damp floor. There is space for the moth and its folded nest.');}]]);
  else menu('A paper moth has nested around a small wrapped seed. It folds its wings over the eggs as you approach.',[['Offer the fallen pod beside a safe shelter',()=>{if(!s.food||!s.shelter)return report('The moth stays over its eggs. It needs both a dry shelter and food before you lift the wrapped seed.');menu('The moth follows the pod. You can leave its new shelter open to the orchard or keep it shaded here.',[['Open the shelter toward the orchard',()=>{s.custody='released';s.food=false;finish('The moth carries the nest toward the open planter. You lift the wrapped seed after it has passed.');}],['Keep the planter shaded in the bothy',()=>{s.custody='sheltered';s.food=false;finish('The moth settles under the reed mat. You move the empty wrapping away from its old nest.');}]]);}]]);
 }
 return true;
}
