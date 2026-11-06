/** Plays only exact-text, prerecorded cast lines. Never synthesizes UI messages. */
export class VoicePlayback{
 constructor({onStart=()=>{},onStop=()=>{}}={}){this.onStart=onStart;this.onStop=onStop;this.enabled=localStorage.getItem('ash-voices')!=='off';this.volume=Number(localStorage.getItem('ash-voice-volume')??.9);this.generation=0;this.lines=[];this.ready=fetch(new URL('./voices/manifest.json',import.meta.url),{cache:'no-store'}).then(r=>r.ok?r.json():{lines:[]}).then(m=>this.lines=m.lines||[]).catch(()=>this.lines=[]);}
 find(speaker,text){return this.lines.find(l=>l.speaker===speaker&&l.text===text&&l.audio);}
 stop(){this.generation++;if(this.player){this.player.pause();this.player.src='';this.player.remove();this.player=null;this.onStop();}}
 async play(segments){this.stop();if(!this.enabled||!segments?.length)return;const generation=this.generation;await this.ready;for(const s of segments){if(generation!==this.generation)return;const line=this.find(s.speaker,s.text);if(!line)continue;const player=new Audio(new URL(line.audio,new URL('./voices/',import.meta.url)).href);this.player=player;player.id='dialogue-voice-audio';player.hidden=true;document.body.append(player);player.volume=this.volume;this.onStart();await new Promise(resolve=>{player.onended=resolve;player.onerror=resolve;player.onpause=resolve;player.play().catch(resolve);});if(generation===this.generation){player.remove();this.player=null;this.onStop();}}}
 setEnabled(value){this.enabled=value;localStorage.setItem('ash-voices',value?'on':'off');if(!value)this.stop();}
 setVolume(value){this.volume=value;localStorage.setItem('ash-voice-volume',String(value));if(this.player)this.player.volume=value;}
}
