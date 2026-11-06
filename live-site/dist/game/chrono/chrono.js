// Original integration code. The supplied game is never embedded in this module.
export const ROM_SHA256 = '06d1c2b06b716052c5596aaa0c2e5632a027fee1a9a28439e509f813c30829a9';
export const ROM_CRC32 = 0x2d206bf7;
export const LATCH_OFFSET = 0x1ee0;
export const PATCH_REVISION = 'chrono-orchestra/1';

// Coverage is complete for the original 83-slot table. Roles are our editorial
// soundtrack choices, not labels or behaviour supplied by the game developer.
const ROLE_IDS = {
  silence: [0x00],
  explore: [0x01,0x02,0x03,0x04,0x08,0x0b,0x0c,0x0e,0x13,0x18,0x2a],
  town: [0x06,0x15,0x1e,0x3e,0x42,0x49],
  rest: [0x07,0x0f,0x11,0x12,0x14,0x1d,0x24,0x25,0x2b,0x3c,0x4d,0x52],
  future: [0x05,0x0a,0x19,0x1a,0x2d,0x33,0x4c],
  dungeon: [0x10,0x20,0x2f,0x31,0x34,0x3b,0x44,0x46,0x48],
  mystery: [0x09,0x0d,0x17,0x1f,0x21,0x22,0x23,0x2e,0x30,0x35,0x37,0x3a,0x40,0x41,0x43,0x47,0x4a,0x4b],
  battle: [0x16,0x27,0x2c,0x36,0x38,0x45,0x50,0x51],
  boss: [0x28,0x29,0x32,0x39,0x4e],
  victory: [0x1b,0x1c,0x26,0x3d,0x4f],
  ending: [0x3f],
};
const TITLES = {
  0x00: 'Silence', 0x06: 'Millennial Fair', 0x08: 'Secret of the Forest',
  0x18: 'Chrono Trigger', 0x1e: 'Peaceful Day', 0x29: 'Boss Battle 1',
  0x45: 'Battle 1',
};
export const CUE_MAP = Object.freeze(Object.fromEntries(
  Object.entries(ROLE_IDS).flatMap(([role,ids]) => ids.map(song => [song,Object.freeze({
    song, role, title:TITLES[song] || `Game cue 0x${song.toString(16).padStart(2,'0')}`,
  })]))
));

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  return (crc^0xffffffff)>>>0;
}
const equalAt = (bytes,offset,expected) => expected.every((n,i)=>bytes[offset+i]===n);

// FIPS 180-4 SHA-256 arithmetic fallback for HTTP local previews where Web
// Crypto is unavailable. The production HTTPS path uses crypto.subtle.
export function sha256Fallback(bytes) {
  const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const h=Uint32Array.from([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  const padded=new Uint8Array(Math.ceil((bytes.length+9)/64)*64);padded.set(bytes);padded[bytes.length]=0x80;
  const view=new DataView(padded.buffer),bits=bytes.length*8;
  view.setUint32(padded.length-8,Math.floor(bits/4294967296));view.setUint32(padded.length-4,bits>>>0);
  const w=new Uint32Array(64),ror=(v,n)=>(v>>>n)|(v<<(32-n));
  for(let off=0;off<padded.length;off+=64) {
    for(let i=0;i<16;i++)w[i]=view.getUint32(off+i*4);
    for(let i=16;i<64;i++) {const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(ror(x,7)^ror(x,18)^(x>>>3))+w[i-7]+(ror(y,17)^ror(y,19)^(y>>>10)))>>>0;}
    let [a,b,c,d,e,f,g,j]=h;
    for(let i=0;i<64;i++) {const t1=(j+(ror(e,6)^ror(e,11)^ror(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0;
      const t2=((ror(a,2)^ror(a,13)^ror(a,22))+((a&b)^(a&c)^(b&c)))>>>0;
      j=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
    const state=[a,b,c,d,e,f,g,j];for(let i=0;i<8;i++)h[i]=(h[i]+state[i])>>>0;
  }
  return Array.from(h,n=>n.toString(16).padStart(8,'0')).join('');
}

// Hand-assembled original 65816 observer, independently exercised by test.mjs.
// Save P and all 16 bits of A; X,Y,DB,DP are not touched. Absolute-long WRAM
// reads avoid assumptions about the caller's data/direct-page registers.
export function makeHook() {
  const b=[];
  const emit=(...values)=>b.push(...values);
  const lda=(addr)=>emit(0xaf,addr&255,(addr>>>8)&255,(addr>>>16)&255);
  const sta=(addr)=>emit(0x8f,addr&255,(addr>>>8)&255,(addr>>>16)&255);
  emit(0x08,0xc2,0x20,0x48,0xe2,0x20); // PHP REP#20 PHA SEP#20
  lda(0x7e1e01); sta(0x7e1ee0);
  lda(0x7e1e00); sta(0x7e1ee2);
  lda(0x7e1e02); sta(0x7e1ee3);
  emit(0xa9,0x43); sta(0x7e1eec);
  emit(0xa9,0x57); sta(0x7e1eed);
  lda(0x7e1ee1); emit(0x1a); sta(0x7e1ee1);
  emit(0xc2,0x20,0x68,0x28); // restore the original 16-bit A, then P
  emit(0x08,0xc2,0x20,0xa5,0x01); // replay original displaced instructions
  emit(0x5c,0x3e,0x0a,0xc7); // JML C70A3E (original continuation)
  return Uint8Array.from(b);
}

/** Validate exactly the supported unmodified USA ROM; return a patched copy. */
export async function patchRom(input,{muteMusic=true}={}) {
  let bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  const copierHeader=bytes.length===4194304+512;
  if (copierHeader) bytes=bytes.subarray(512);
  if (bytes.length!==4194304) throw new Error('This build needs the 4 MB Chrono Trigger USA v1.0 ROM.');
  if (crc32(bytes)!==ROM_CRC32) throw new Error('ROM revision does not match Chrono Trigger USA v1.0. The game was not changed.');
  const digest=globalThis.crypto?.subtle
    ? Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('')
    : sha256Fallback(bytes);
  if (digest!==ROM_SHA256) throw new Error('ROM SHA-256 does not match this patch. The game was not changed.');
  const hook=makeHook();
  if (!equalAt(bytes,0x70a39,[0x08,0xc2,0x20,0xa5,0x01]) ||
      !equalAt(bytes,0x72d0d,[0xf5,0x20,0xf2,0xcf,0xe4,0x4d,0xcf]) ||
      !bytes.subarray(0x5f370,0x5f370+hook.length).every(n=>n===0)) {
    throw new Error('Audio instruction checks failed. The game was not changed.');
  }
  const rom=new Uint8Array(bytes);
  rom.set(hook,0x5f370);
  rom.set([0x5c,0x70,0xf3,0xc5,0xea],0x70a39);
  // In Spc_WriteVoice, effect tracks branch around this song-only multiply.
  // MOV A,$4D -> MOV A,#0. Music sequences still run; SFX retain their gain.
  if (muteMusic) rom.set([0xe8,0x00],0x72d11);
  // Header checksum is recalculated rather than leaving a known bad checksum.
  rom.set([0xff,0xff,0x00,0x00],0xffdc);
  let sum=0; for (const n of rom) sum=(sum+n)&0xffff;
  const complement=sum^0xffff;
  rom.set([complement&255,complement>>>8,sum&255,sum>>>8],0xffdc);
  return {rom,info:{revision:PATCH_REVISION,source_sha256:digest,source_crc32:'2d206bf7',copier_header_removed:copierHeader,
    mute_music:!!muteMusic,sound_effects_volume_path_preserved:true,
    latch_bus_address:'7E1EE0',hook_bytes:hook.length,checksum:sum.toString(16).padStart(4,'0'),
    full_game_playthrough_verified:false}};
}

/** Decode one atomic native memory read. Null means no validated hook event yet. */
export function decodeCue(input) {
  const b=input instanceof Uint8Array?input:Uint8Array.from(input||[]);
  if (b.length<14 || b[12]!==0x43 || b[13]!==0x57 || !CUE_MAP[b[0]]) return null;
  if (![0x10,0x11,0x14,0x15].includes(b[2])) return null;
  return {...CUE_MAP[b[0]],sequence:b[1],command:b[2],original_volume_argument:b[3],source:'validated-song-start-hook'};
}
export async function readCue(player) {
  return decodeCue(await player.readMemory(LATCH_OFFSET,16));
}
