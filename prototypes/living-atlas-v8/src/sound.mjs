/** Original synthesised Hydrophone soundscape, driven by the numerical game state.
 * WebAudio starts only from a user gesture. Never plays copyrighted compositions.
 */
export class WorldAudio {
 constructor(){this.context=null;this.voices=[];this.noise=null;this.master=null;this.on=false;}
 async start(){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('WebAudio is unavailable');
  if(this.context){await this.context.resume();this.on=true;return;}
  const ctx=new Audio();this.context=ctx;this.master=ctx.createGain();this.master.gain.value=.13;
  const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-28;compressor.ratio.value=3;this.master.connect(compressor);compressor.connect(ctx.destination);
  for(const [wave,ratio,gain] of [['sine',1,.18],['triangle',1.5,.055],['sine',2,.07],['sine',3,.035]]){
   const o=ctx.createOscillator(),v=ctx.createGain(),f=ctx.createBiquadFilter();o.type=wave;f.type='lowpass';f.frequency.value=850;v.gain.value=gain;
   o.connect(f);f.connect(v);v.connect(this.master);o.start();this.voices.push({o,v,f,ratio});
  }
  const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=buffer.getChannelData(0);let state=927364;
  for(let i=0;i<data.length;i++){state^=state<<13;state^=state>>>17;state^=state<<5;data[i]=((state>>>0)/2147483648-1)*.8;}
  const rain=ctx.createBufferSource(),low=ctx.createBiquadFilter(),gain=ctx.createGain();rain.buffer=buffer;rain.loop=true;low.type='bandpass';low.frequency.value=900;gain.gain.value=0;
  rain.connect(low);low.connect(gain);gain.connect(this.master);rain.start();this.noise={rain,gain,low};await ctx.resume();this.on=true;
 }
 update(state,region){if(!this.context||!this.on)return;const ctx=this.context,time=ctx.currentTime,base=110+region.aether*14+state.resonance*32+state.moisture*16;
  // Local coherent wave magnitude drives audible harmony and environmental intensity.
  for(const [i,v] of this.voices.entries()){
   v.o.frequency.setTargetAtTime(base*v.ratio,time,.45);
   v.v.gain.setTargetAtTime((i?0.025:.13)*(1+state.resonance*1.4)*(i===3?state.resonance+.2:1),time,.7);
   v.f.frequency.setTargetAtTime(480+1700*state.resonance+380*state.moisture,time,.5);
  }
  this.noise.gain.gain.setTargetAtTime(Math.min(.15,state.moisture*.06+(region.rain>.8?.015:0)),time,1);
 }
 setBedLevel(level=.13){if(!Number.isFinite(level)||level<0||level>.3)throw Error('Invalid audio bed level');if(this.master&&this.context)this.master.gain.setTargetAtTime(level,this.context.currentTime,.3);}
 async mute(){if(this.context)await this.context.suspend();this.on=false;}
 async resume(){if(this.context){await this.context.resume();this.on=true;}else await this.start();}
 async dispose(){if(this.context)await this.context.close();this.context=null;this.on=false;}
}
