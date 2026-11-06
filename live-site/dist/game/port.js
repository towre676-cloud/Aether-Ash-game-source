import {ROM_SHA256,sha256Fallback} from './chrono/chrono.js';
const digest=async bytes=>globalThis.crypto?.subtle?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join(''):sha256Fallback(bytes);
export async function recipeIdentity(recipe){if(recipe?.schema!=='hydrophone.chrono-romhack/1'||!/^[a-f0-9]{64}$/.test(recipe.output_rom_sha256||''))throw Error('Invalid chapter recipe.');return recipe.output_rom_sha256;}
export async function applyChapterPatch(input,recipe){
 await recipeIdentity(recipe);
 let original=input instanceof Uint8Array?input:new Uint8Array(input);
 if(original.length===4194816)original=original.subarray(512);
 if(original.length!==4194304||recipe.rom_bytes!==4194304||recipe.source_rom_sha256!==ROM_SHA256||await digest(original)!==ROM_SHA256)throw Error('Choose the unmodified Chrono Trigger USA ROM for this chapter.');
 if(!recipe.scope?.native_battle||recipe.scope?.new_native_events<3||!recipe.music?.all_non_silent_slots_original)throw Error('The chapter is incomplete. An unchanged game will not be started.');
 if(!Array.isArray(recipe.patches)||!recipe.patches.length)throw Error('No native chapter changes were supplied.');
 const output=new Uint8Array(original);let end=0;
 for(const patch of recipe.patches){
  if(!Number.isInteger(patch.offset)||patch.offset<end||typeof patch.bytes_hex!=='string'||!/^(?:[a-f0-9]{2})+$/i.test(patch.bytes_hex))throw Error('Invalid or overlapping native patch range.');
  const bytes=Uint8Array.from(patch.bytes_hex.match(/../g),x=>parseInt(x,16));end=patch.offset+bytes.length;
  if(end>output.length)throw Error('Native patch exceeds the supported ROM.');
  if(await digest(original.subarray(patch.offset,end))!==patch.before_sha256||await digest(bytes)!==patch.after_sha256)throw Error('A native patch range failed its integrity check.');
  output.set(bytes,patch.offset);
 }
 if(await digest(output)!==recipe.output_rom_sha256)throw Error('The assembled chapter failed its integrity check.');
 return output;
}
export function setNativeMusic(rom,enabled){
 if(!(rom instanceof Uint8Array)||rom.length!==4194304)throw Error('Invalid chapter ROM.');
 const i=0x72d11;if(!((rom[i]===0xe4&&rom[i+1]===0x4d)||(rom[i]===0xe8&&rom[i+1]===0)))throw Error('Unsupported sound driver.');
 rom[i]=enabled?0xe4:0xe8;rom[i+1]=enabled?0x4d:0;
 rom.set([0xff,0xff,0,0],0xffdc);let sum=0;for(const byte of rom)sum=(sum+byte)&0xffff;const inverse=sum^0xffff;rom.set([inverse&255,inverse>>>8,sum&255,sum>>>8],0xffdc);
}
