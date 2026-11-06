/* Ash & Aether v2 — synchronized music stems controlled by encounter state.
 * No autoplay: call after a user gesture unlocks the AcousticWorld context.
 * The 4 stems in each scene have the same 120 BPM / 8-bar structure.
 */
export const SCORE_SCENES=Object.freeze(['marsh','grove','cavern','city','archive','rift']);
export const SCORE_STEMS=Object.freeze(['foundation','motion','peril','revelation']);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
export function scoreGains({danger=0,travel=0,discovery=0,story=0,bossPhase=0,healing=0}={}){
  const t=clamp(danger), r=clamp(discovery), w=clamp(travel), s=clamp(story), b=clamp(bossPhase);
  return {
    foundation:clamp(.48+.12*s+.09*clamp(healing)),
    motion:clamp(.08+.58*w+.25*t),
    peril:clamp(.08+.67*t+.22*b),
    revelation:clamp(.04+.75*r+.12*s),
  };
}
export function scoreSceneForBiome(biome='reed_marsh'){
  if(['reed_marsh','salt_shore','night_grassland'].includes(biome))return 'marsh';
  if(['ash_grove','ember_highland','moss_cathedral'].includes(biome))return 'grove';
  if(['limestone_cavern','sunlit_ruins','frozen_tundra'].includes(biome))return 'cavern';
  if(['rain_market','wooden_inn','clay_forge','storm_rooftops'].includes(biome))return 'city';
  if(['submerged_archive','crystal_aqueduct'].includes(biome))return 'archive';
  return 'rift';
}
export class AdaptiveScore {
  constructor(world,{crossfadeSeconds=1.8,segmentSeconds=16}={}){
    this.world=world;this.crossfadeSeconds=crossfadeSeconds;this.segmentSeconds=segmentSeconds;
    this.scene=null;this.rig=null;this.oldRigs=[];this.state={};this.version=0;this.gridEpoch=null;
  }
  setState(partial={}){
    this.state={...this.state,...partial};this.apply();return scoreGains(this.state);
  }
  apply(){
    if(!this.rig||!this.world.ctx)return;
    const vals=scoreGains(this.state);const now=this.world.ctx.currentTime;
    for(const [stem,control] of Object.entries(this.rig.stems)){
      control.amp.gain.setTargetAtTime(vals[stem]*.62,now,.26);
    }
  }
  async setScene(scene){
    if(!SCORE_SCENES.includes(scene))throw new Error(`Unknown music scene: ${scene}`);
    if(this.scene===scene && this.rig)return;
    this.scene=scene;
    const version=++this.version;
    const ctx=this.world.ctx;
    if(!ctx)return;
    // Decode all four first, so start times are exactly aligned.
    const buffers=await Promise.all(SCORE_STEMS.map(x=>this.world.load(`score_${scene}_${x}`)));
    if(version!==this.version||!this.world.ctx)return;
    if(buffers.some(x=>!x))throw new Error(`Score missing stems for ${scene}`);
    const now=ctx.currentTime;
    const old=this.rig;const vals=scoreGains(this.state);
    // Join a global musical grid and do not misalign the layered score.
    const t=now+.065;
    if(this.gridEpoch===null)this.gridEpoch=t;
    const offset=((t-this.gridEpoch)%this.segmentSeconds+this.segmentSeconds)%this.segmentSeconds;
    const stems={};
    for(let i=0;i<SCORE_STEMS.length;i++){
      const stem=SCORE_STEMS[i];
      const src=ctx.createBufferSource();src.buffer=buffers[i];src.loop=true;
      const amp=ctx.createGain();amp.gain.setValueAtTime(0,t);
      amp.gain.linearRampToValueAtTime(vals[stem]*.62,t+this.crossfadeSeconds);
      src.connect(amp);amp.connect(this.world.buses.music);src.start(t,offset);
      stems[stem]={src,amp};
    }
    this.rig={scene,stems,start:t};
    if(old)this.endRig(old,now);
  }
  endRig(rig,now=this.world.ctx?.currentTime??0){
    const at=now+this.crossfadeSeconds+.12;
    for(const {src,amp} of Object.values(rig.stems)){
      try{amp.gain.cancelScheduledValues(now);amp.gain.setTargetAtTime(0,now,this.crossfadeSeconds*.18);src.stop(at);}catch{}
    }
  }
  stop(){
    ++this.version;
    if(this.rig)this.endRig(this.rig);this.rig=null;this.scene=null;
  }
}
