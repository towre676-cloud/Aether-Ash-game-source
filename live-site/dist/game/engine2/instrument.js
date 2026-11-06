/** Digital listening model, not measured hydrophone data or a hardware driver.
 * Four string fundamentals are exported by the recovered Gen2 hex_nat solve.
 * Twelve damped partials feed a short water/body path; the dry music stays legible.
 */
export const STRING_HZ=[261.626,292.39573306577114,326.759563456652,391.1253463782126];
export const ROOM_SOUND={loft:{wet:.19,q:20,delay:.043},quarters:{wet:.13,q:15,delay:.032},archive:{wet:.16,q:18,delay:.039},cistern:{wet:.24,q:24,delay:.061},chapel:{wet:.22,q:26,delay:.073},garden:{wet:.14,q:14,delay:.027}};
export class DyletskyInstrument{
 constructor(c,destination){this.context=c;this.input=c.createGain();this.output=c.createGain();this.output.gain.value=.88;this.output.connect(destination);this.dry=c.createGain();this.dry.gain.value=.9;this.input.connect(this.dry);this.dry.connect(this.output);this.wet=c.createGain();this.wet.gain.value=.18;this.body=c.createBiquadFilter();this.body.type='lowpass';this.body.frequency.value=5200;this.body.Q.value=.55;this.wet.connect(this.body);this.body.connect(this.output);this.filters=[];
  for(const hz of STRING_HZ)for(let partial=1;partial<=3;partial++){const f=c.createBiquadFilter(),g=c.createGain();f.type='bandpass';f.frequency.value=hz*partial;f.Q.value=18;g.gain.value=.42/(partial*STRING_HZ.length);this.input.connect(f);f.connect(g);g.connect(this.wet);this.filters.push(f);}
  // A finite two-reflection path is bounded; there is no uncontrolled feedback loop.
  this.reflections=[.043,.097].map((seconds,i)=>{const d=c.createDelay(.2),g=c.createGain();d.delayTime.value=seconds;g.gain.value=i?.13:.25;this.body.connect(d);d.connect(g);g.connect(this.output);return d;});this.enabled=true;
 }
 setMode(enabled){this.enabled=enabled;this.configure(this.room||'quarters');}
 configure(room){this.room=room;const p=ROOM_SOUND[room]||ROOM_SOUND.quarters,t=this.context.currentTime;this.dry.gain.setTargetAtTime(this.enabled?.9:1,t,.08);this.wet.gain.setTargetAtTime(this.enabled?p.wet:0,t,.08);for(const f of this.filters)f.Q.setTargetAtTime(p.q,t,.1);this.reflections[0].delayTime.setTargetAtTime(p.delay,t,.08);this.reflections[1].delayTime.setTargetAtTime(p.delay*1.9,t,.08);}
 playPattern(pattern={},action='replay'){if(this.context.state!=='running')return;const c=this.context,t=c.currentTime,notes=pattern.shape==='line'?[0,1,2,3]:pattern.shape==='burst'?[3,1,0,2]:[0,0,3],beat=Math.max(.09,Math.min(.24,(Number(pattern.windup)||1.5)/10));notes.forEach((n,i)=>{const o=c.createOscillator(),g=c.createGain();o.type=action==='listen'?'sine':'triangle';o.frequency.value=STRING_HZ[n]*(action==='record'?.5:1);const at=t+i*beat;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(action==='listen'?.018:.026,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+.55);o.connect(g);g.connect(this.input);o.start(at);o.stop(at+.6);o.onended=()=>{o.disconnect();g.disconnect();};});}
 playReturn(sequence=[]){if(this.context.state!=='running')return;const c=this.context,t=c.currentTime;sequence.filter(n=>Number.isInteger(n)&&n>=0&&n<=2).slice(0,3).forEach((n,i)=>{const o=c.createOscillator(),g=c.createGain(),at=t+i*.32;o.type='sine';o.frequency.value=STRING_HZ[[0,2,3][n]];g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(.035,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+.4);o.connect(g);g.connect(this.input);o.start(at);o.stop(at+.45);o.onended=()=>{o.disconnect();g.disconnect();};});}
 /** Up to five distinct three-note replies, each with space to answer. The
  * explicit volume is needed because generated notes enter after the music
  * deck's master gain. Return a cancellation handle for pause/scene changes. */
 playCityAnswer(parts=[],{quiet=false,volume=1}={}){
  if(this.context.state!=='running'||!Number.isFinite(volume)||volume<=0)return null;
  const c=this.context,t=c.currentTime,voices=[],phrases=parts.slice(0,5),gain=(quiet?.016:.03)*Math.min(1,volume)/Math.sqrt(Math.max(1,phrases.length));
  phrases.forEach((part,p)=>(Array.isArray(part.motif)?part.motif:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<=2).slice(0,3).forEach((n,i)=>{
   const oscillator=c.createOscillator(),envelope=c.createGain(),at=t+.04+p*.78+i*.22;
   oscillator.type='sine';oscillator.frequency.value=STRING_HZ[[0,2,3][n]];
   envelope.gain.setValueAtTime(0,at);envelope.gain.linearRampToValueAtTime(gain,at+.018);envelope.gain.exponentialRampToValueAtTime(.0001,at+.42);
   oscillator.connect(envelope);envelope.connect(this.input);oscillator.start(at);oscillator.stop(at+.46);
   const voice={oscillator,envelope,ended:false};voices.push(voice);oscillator.onended=()=>{voice.ended=true;oscillator.disconnect();envelope.disconnect();};
  }));
  if(!voices.length)return null;
  return ()=>{for(const voice of voices){if(voice.ended)continue;voice.ended=true;try{voice.oscillator.stop();}catch{}voice.oscillator.disconnect();voice.envelope.disconnect();}};
 }
 chime(kind='treasure'){if(this.context.state!=='running')return;const c=this.context,t=c.currentTime,sequence=kind==='discovery'?[0,2,1,3]:[0,1,3];sequence.forEach((n,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=STRING_HZ[n]*(i===sequence.length-1?2:1);g.gain.setValueAtTime(0,t+i*.11);g.gain.linearRampToValueAtTime(.045,t+i*.11+.012);g.gain.exponentialRampToValueAtTime(.0001,t+i*.11+.75);o.connect(g);g.connect(this.input);o.start(t+i*.11);o.stop(t+i*.11+.8);});}
}
