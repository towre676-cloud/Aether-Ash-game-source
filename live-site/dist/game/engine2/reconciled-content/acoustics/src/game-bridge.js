/* Authoritative-source-only integration adapter. The host game's world
 * and quest systems always own the entities, rewards and combat damage.
 * Events are explicit; no blind subscription to potentially incompatible API.
 */
import {AcousticWorld} from './acoustic-world.js?v=5.21.0';
import {AdaptiveScore,scoreSceneForBiome} from './adaptive-score.js?v=5.21.0';
import {HearingAI,emitFootstep,materialShield,ResonanceSurvey} from './acoustic-simulation.js?v=5.21.0';
import {questCandidateSources,applyAcousticReward} from './acoustic-quests.js?v=5.21.0';
const safe=(fn,...args)=>{try{fn?.(...args);}catch(e){console.warn('Host callback failed',e);}};
export class AA_AcousticDirector {
 constructor({audio,manifestUrl='./manifest.json',assetBase='../',onCaption=()=>{},onQuest=()=>{},onHearing=()=>{},onTactic=()=>{}}={}){
   this.audio=audio||new AcousticWorld({manifestUrl,assetBase,onCaption});
   this.score=new AdaptiveScore(this.audio);this.survey=new ResonanceSurvey();
   this.onQuest=onQuest;this.onHearing=onHearing;this.onTactic=onTactic;
   this.worldObjects=[];this.walls=[];this.flags=new Set();this.biome='reed_marsh';this.weather='clear';this.ngPlus=0;
   this.monsters=new Map();this.lastStepAt=-Infinity;this.stepNo=0;this.player={x:0,z:0};this.lastThreat=0;
 }
 async unlock(){await this.audio.unlock();await this.score.setScene(scoreSceneForBiome(this.biome));return this;}
 setWorld({objects=[],walls=[],enemies=[]}={}){
   this.worldObjects=objects.filter(o=>o&&o.id&&o.position);
   this.walls=walls;
   const known=new Map(this.monsters);
   this.monsters=new Map(enemies.map(e=>{
     const previous=known.get(e.id),current=previous||new HearingAI(e);
     // The host is authoritative: refreshing a world snapshot must not preserve stale positions.
     current.position={...e.position};current.hearing=e.hearing??current.hearing;
     current.range=e.range??current.range;current.threshold=e.threshold??current.threshold;
     return [e.id,current];
   }));
 }
 async event(type,e={}){
   switch(type){
    case 'zone:enter':{
      this.biome=e.biome||this.biome;this.weather=e.weather||'clear';
      await Promise.all([this.audio.ambience(this.biome,this.weather),this.score.setScene(scoreSceneForBiome(this.biome))]);
      return {biome:this.biome};
    }
    case 'player:position':
      this.player={x:e.x,z:e.z};this.audio.setListener(e.x,e.z,e.heading||0);return this.player;
    case 'player:step':{
      const at=Number.isFinite(e.timeMs)?e.timeMs:Date.now();
      const interval=e.mode==='sprint'?130:e.mode==='sneak'?330:220;
      if(at-this.lastStepAt<interval)return {throttled:true,enemyStates:[...this.monsters.values()].map(x=>x.snapshot())};
      this.lastStepAt=at;
      this.player={...e.position};const enemies=[...this.monsters.values()].map(m=>({...m,position:m.position}));
      const sound=emitFootstep({position:e.position,surface:e.surface,speed:e.speed||1,mode:e.mode||'walk',weather:this.weather,walls:this.walls,enemies});
      const observed=sound.map(x=>this.monsters.get(x.enemyId).hear(x));
      sound.forEach((x,i)=>safe(this.onHearing,{...x,...observed[i]}));
      this.stepNo++;
      await this.audio.footstep({surface:e.surface,velocity:e.speed||1,sprinting:e.mode==='sprint',sneaking:e.mode==='sneak',position:e.position,cover:e.cover||0});
      const threat=Math.max(0,...observed.map(x=>x.alertness));this.score.setState({travel:e.mode==='sneak'?.18:.65,danger:threat});
      return {sound,enemyStates:observed};
    }
    case 'world:spot':{
      const id=`spot_${this.biome}_${e.kind||'wildlife'}`;
      if(!this.audio.index.has(id))return {played:false,reason:'not_authored_for_biome'};
      await this.audio.play(id,{bus:'ambience',gain:.33,pos:e.position||null,caption:e.caption||null});
      return {played:true,id};
    }
    case 'world:material':{
      const id=`material_${e.material}_${e.action}`;
      if(!this.audio.index.has(id))return {played:false,reason:'unknown_material_action'};
      await this.audio.play(id,{bus:'foley',pos:e.position,gain:.65,caption:e.caption});return {played:true,id};
    }
    case 'world:hazard':{
      const id=`warning_${e.kind}`;if(!this.audio.index.has(id))return {played:false};
      await this.audio.play(id,{bus:'creature',pos:e.position,gain:.77,caption:e.caption||`Warning: ${e.kind.replaceAll('_',' ')}.`});
      this.score.setState({danger:.75});return {played:true};
    }
    case 'creature:position':{
      const m=this.monsters.get(e.id);if(m&&e.position)m.position={...e.position};return {updated:!!m};
    }
    case 'creature:state':
      await this.audio.creature({species:e.species,intent:e.intent,position:e.position,material:e.material});
      return {audible:true};
    case 'creature:shield':{
      const r=materialShield({material:e.material,attackFrequency:e.attackFrequency,wetness:e.wetness,fractures:e.fractures});
      await this.audio.creature({species:e.species||'mineral_warden',intent:'alert',position:e.position,material:{shield:e.material}});
      safe(this.onTactic,{type:'shield',material:e.material,...r});return r;
    }
    case 'combat:attack':{
      const r=materialShield({material:e.shieldMaterial,attackFrequency:e.attackFrequency,wetness:e.wetness,fractures:e.fractures});
      await this.audio.combat({kind:e.kind||'attack',element:e.element||'resonance',shieldMaterial:e.shieldMaterial,position:e.position});
      safe(this.onTactic,{type:'attack',...r});this.score.setState({danger:.9});return r;
    }
    case 'music:state':return this.score.setState(e);
    case 'player:scan':{
      const questSources=questCandidateSources({worldObjects:this.worldObjects,biome:this.biome,flags:[...this.flags],ngPlus:this.ngPlus>0});
      // Signals only from real placed quest nodes; no instant discovery.
      const sources=questSources.map(x=>({id:x.id,position:x.position,audioSignal:x.kind,range:x.range}));
      const heard=this.survey.scan({player:e.position||this.player,objects:sources,walls:this.walls,minStrength:.10});
      if(!heard.length)this.audio.caption('Only ordinary sounds. Change position or wait for quiet.','listening');
      else{
        const strongest=heard[0];await this.audio.play(`clue_${strongest.signal}`,{bus:'clue',gain:.55,pan:Math.sin(strongest.bearing),caption:`${strongest.signal.replaceAll('_',' ')}: bearing ${Math.round(strongest.bearing*180/Math.PI)} degrees. Scan again from another position.`});
      }
      return heard;
    }
    case 'player:resolve':{
      const validSources=questCandidateSources({worldObjects:this.worldObjects,biome:this.biome,flags:[...this.flags],ngPlus:this.ngPlus>0}).map(x=>({id:x.id,position:x.position,audioSignal:x.kind}));
      const result=this.survey.resolve(e.sourceId,validSources);
      if(!result.resolved)return result;
      const gain=applyAcousticReward({discovery:{sourceId:result.sourceId,signal:result.signal},worldObjects:this.worldObjects,flags:this.flags,gameCallbacks:{onQuestUnlock:x=>safe(this.onQuest,x)}});
      if(gain.applied){this.score.setState({discovery:1,story:.65});await this.audio.ui('quest_new');}
      return {...result,reward:gain};
    }
    case 'time:tick':{
      const observed=[...this.monsters.values()].map(x=>x.tick(e.seconds||0));
      const danger=Math.max(0,...observed.map(x=>x.alertness));this.score.setState({danger});return observed;
    }
    case 'timeline:newgameplus':
      this.ngPlus=Number(e.cycle)||this.ngPlus+1;this.score.setState({story:.55,discovery:1});return {cycle:this.ngPlus};
    default:return {handled:false,type};
   }
 }
 serialize(){return {version:2,audio:this.audio.serialize(),survey:this.survey.serialize(),questFlags:[...this.flags],ngPlus:this.ngPlus};}
 restore(save={}){this.audio.restore(save.audio||{});this.survey.restore(save.survey||{});this.flags=new Set(save.questFlags||[]);this.ngPlus=save.ngPlus||0;}
 dispose(){this.score.stop();this.audio.dispose();}
}
