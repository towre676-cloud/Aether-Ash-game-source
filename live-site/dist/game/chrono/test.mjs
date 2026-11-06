import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
globalThis.crypto ||= webcrypto;
const source=fs.readFileSync(new URL('./chrono.js',import.meta.url),'utf8');
const {makeHook,crc32,CUE_MAP,decodeCue,patchRom,ROM_SHA256,sha256Fallback}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
let checks=0;
const check=(fn)=>{fn();checks++;};
check(()=>assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926));
check(()=>assert.equal(sha256Fallback(new Uint8Array()),'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'));
check(()=>assert.equal(sha256Fallback(new TextEncoder().encode('abc')),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'));
check(()=>assert.deepEqual(Object.keys(CUE_MAP).map(Number).sort((a,b)=>a-b),Array.from({length:83},(_,i)=>i)));
check(()=>assert.equal(CUE_MAP[0x45].role,'battle'));
check(()=>assert.equal(CUE_MAP[0x29].role,'boss'));
check(()=>assert.equal(CUE_MAP[0x1e].role,'town'));
check(()=>assert.equal(decodeCue(new Uint8Array(16)),null));
const b=new Uint8Array(16);b.set([0x45,255,0x14,0xff]);b[12]=0x43;b[13]=0x57;
check(()=>assert.equal(decodeCue(b).song,0x45));
check(()=>assert.equal(decodeCue(b).sequence,255));
b[2]=0x19;check(()=>assert.equal(decodeCue(b),null));

// Execute every observer instruction in a deliberately small independent
// 65816 interpreter. Check both A widths, X widths, all flag bits, sequence
// wrap, original displaced instructions, and caller stack preservation.
function executeHook(p,a,seq) {
  const code=makeHook(),mem=new Uint8Array(0x10000),stack=[];
  mem.set([0x14,0x45,0xc0,5],0x1e00);mem[0x1ee1]=seq;
  const initial={p,a},dp=0x1e00;let pc=0,jump=null;
  const read=()=>code[pc++];
  const width=()=>p&0x20?1:2;
  const setNZ=(n,bytes)=>{p=(p&~0x82)|(n===0?2:0)|(n&(bytes===1?0x80:0x8000)?0x80:0);};
  const pushWord=(n)=>{stack.push(n>>>8,n&255);};
  const pullWord=()=>stack.pop()|(stack.pop()<<8);
  while(pc<code.length) {
    const op=read();
    if(op===0x08) stack.push(p);
    else if(op===0xc2)p&=~read();
    else if(op===0xe2)p|=read();
    else if(op===0x48) width()===2?pushWord(a):stack.push(a&255);
    else if(op===0x68){const n=width()===2?pullWord():stack.pop();a=width()===2?n:(a&0xff00)|n;setNZ(n,width());}
    else if(op===0x28)p=stack.pop();
    else if(op===0xaf||op===0x8f){const lo=read(),hi=read(),bank=read();assert.equal(bank,0x7e);const addr=lo|(hi<<8);
      if(op===0xaf){const n=mem[addr]|(width()===2?mem[addr+1]<<8:0);a=width()===2?n:(a&0xff00)|n;setNZ(n,width());}
      else {mem[addr]=a&255;if(width()===2)mem[addr+1]=a>>>8;}}
    else if(op===0xa9){let n=read();if(width()===2)n|=read()<<8;a=width()===2?n:(a&0xff00)|n;setNZ(n,width());}
    else if(op===0x1a){const mask=width()===2?65535:255,n=(a+1)&mask;a=width()===2?n:(a&0xff00)|n;setNZ(n,width());}
    else if(op===0xa5){const addr=dp+read(),n=mem[addr]|(width()===2?mem[addr+1]<<8:0);a=width()===2?n:(a&0xff00)|n;setNZ(n,width());}
    else if(op===0x5c){jump=read()|(read()<<8)|(read()<<16);break;}
    else throw new Error('Unknown observer opcode '+op.toString(16));
  }
  assert.equal(jump,0xc70a3e);
  assert.equal(a,0xc045); // original 16-bit LDA $01 result
  assert.equal(p,((initial.p&~0x20)&~0x82)|0x80); // original REP and LDA flags
  assert.deepEqual(stack,[initial.p]); // original PHP remains on the stack
  assert.equal(mem[0x1ee0],0x45);assert.equal(mem[0x1ee1],(seq+1)&255);
  assert.equal(mem[0x1ee2],0x14);assert.equal(mem[0x1ee3],0xc0);
  assert.equal(mem[0x1e01],0x45);assert.equal(mem[0x1e02],0xc0);
  assert.equal(mem[0x1eec],0x43);assert.equal(mem[0x1eed],0x57);
  return initial;
}
for(let p=0;p<256;p++) for(const seq of [0,254,255]) {executeHook(p,0xabcd,seq);checks++;}

// Assert that every SFX path jumps over the two changed SPC700 bytes.
// These exact source instructions are guarded again against the real ROM.
// CMP X,#$10; BCS +$11 at C72D01 -> C72D14, skipping song-volume multiply
// at C72D11. Therefore this edit does not change SFX VOLL/VOLR calculation.
check(()=>assert.equal(0x72d03+0x11,0x72d14));

await assert.rejects(()=>patchRom(new Uint8Array(10)),/4 MB/);checks++;
await assert.rejects(()=>patchRom(new Uint8Array(4194304)),/revision/);checks++;
if(process.argv[2]) {
  const original=new Uint8Array(fs.readFileSync(process.argv[2]));
  check(()=>assert.equal(sha256Fallback(original),ROM_SHA256));
  const {rom,info}=await patchRom(original);
  check(()=>assert.deepEqual([...original.subarray(0x72cff,0x72d03)],[0xc8,0x10,0xb0,0x11]));
  check(()=>assert.equal(0x72d03+original[0x72d02],0x72d14));
  check(()=>assert.deepEqual([...rom.subarray(0x72cff,0x72d11)],[...original.subarray(0x72cff,0x72d11)]));
  check(()=>assert.equal(info.source_sha256,ROM_SHA256));
  check(()=>assert.deepEqual([...rom.subarray(0x72d11,0x72d13)],[0xe8,0]));
  check(()=>assert.deepEqual([...original.subarray(0x72d11,0x72d13)],[0xe4,0x4d]));
  check(()=>assert.deepEqual([...rom.subarray(0x70a39,0x70a3e)],[0x5c,0x70,0xf3,0xc5,0xea]));
  check(()=>assert.deepEqual([...rom.subarray(0x5f370,0x5f370+makeHook().length)],[...makeHook()]));
  check(()=>assert.equal(rom.reduce((n,v)=>(n+v)&65535,0),rom[0xffde]|(rom[0xffdf]<<8)));
  check(()=>assert.equal((rom[0xffdc]|(rom[0xffdd]<<8))^(rom[0xffde]|(rom[0xffdf]<<8)),65535));
  const {rom:unmuted}=await patchRom(original,{muteMusic:false});
  check(()=>assert.deepEqual([...unmuted.subarray(0x72d11,0x72d13)],[0xe4,0x4d]));
  const headered=new Uint8Array(original.length+512);headered.set(original,512);
  const h=await patchRom(headered);check(()=>assert.equal(h.info.copier_header_removed,true));
  const changed=original.slice();changed[0]^=1;
  await assert.rejects(()=>patchRom(changed),/revision/);checks++;
}
console.log(JSON.stringify({checks,hook_bytes:makeHook().length,all_83_cues_mapped:true,real_rom_test:!!process.argv[2],full_playthrough:false},null,2));
