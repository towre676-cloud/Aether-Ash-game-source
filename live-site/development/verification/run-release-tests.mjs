#!/usr/bin/env node
/** Run the buildless release suite without collapsing it into module counts.
 * Usage: node development/verification/run-release-tests.mjs
 *        node development/verification/run-release-tests.mjs --prefix docs/verification/release-5.20
 * Output: <prefix>-tests.json and <prefix>-tests.log. Existing evidence is never overwritten.
 */
import {spawn, execFileSync} from 'node:child_process';
import {mkdir, open, readdir, unlink} from 'node:fs/promises';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CONCURRENCY=4, MODULE_TIMEOUT_MS=300_000, KILL_GRACE_MS=5_000;
const COUNT_KEYS=['tests','pass','fail','skipped','cancelled','todo'];
const EXCLUDED_DIRECTORIES=new Set(['node_modules','vendor','.git','.cache','.venv','venv','coverage']);
// This execution host suppresses JavaScript stdout for Node -> Node pipe children
// (even console.log), although --version succeeds. Python-owned subprocess pipes
// retain the actual Node summaries. No shell, fixture rewrite or count synthesis.
const LAUNCH_METHOD='Python subprocess pipe bridge; one actual Node process per module; stdout/stderr combined before relay';
const NODE_BRIDGE=String.raw`import os, signal, subprocess, sys
child = subprocess.Popen(sys.argv[1:], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
def stop(signum, frame):
    if child.poll() is None:
        child.kill()
signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
output, _ = child.communicate()
sys.stdout.buffer.write(output)
sys.stdout.buffer.flush()
code = child.returncode
if code < 0:
    signum = -code
    if signum not in (signal.SIGKILL, signal.SIGSTOP):
        signal.signal(signum, signal.SIG_DFL)
    os.kill(os.getpid(), signum)
sys.exit(code)
`;
const seconds=ms=>Math.round(ms)/1000;
const portable=path=>path.split(sep).join('/');

function options(args){
 let prefix='docs/verification/release-5.20';
 for(let i=0;i<args.length;i++){
  if(args[i]==='--help'||args[i]==='-h')return {help:true};
  if(args[i]==='--prefix'){if(!args[i+1]||args[i+1].startsWith('--'))throw Error('--prefix requires a path prefix');prefix=args[++i];}
  else if(args[i].startsWith('--prefix=')){prefix=args[i].slice(9);if(!prefix)throw Error('--prefix requires a path prefix');}
  else throw Error(`Unknown argument: ${args[i]}`);
 }
 const absolute=resolve(ROOT,prefix),local=relative(ROOT,absolute);
 if(!local||local==='..'||local.startsWith(`..${sep}`)||isAbsolute(local))throw Error('The output prefix must be inside the repository');
 return {prefix:absolute,relativePrefix:portable(local)};
}

async function discover(directory){
 const files=[];
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=resolve(directory,entry.name);
  if(entry.isDirectory()&&!EXCLUDED_DIRECTORIES.has(entry.name))files.push(...await discover(path));
  else if(entry.isFile()&&entry.name.endsWith('.test.mjs'))files.push(portable(relative(ROOT,path)));
 }
 return files.sort(); // Deliberately do not follow directory symlinks into dependencies.
}

function git(...args){return execFileSync('git',args,{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}

function parseSummary(output){
 const clean=output.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,'');
 const blocks=[];
 for(const line of clean.split(/\r?\n/)){
  const match=line.match(/^\s*ℹ\ufe0f?\s+(tests|pass|fail|skipped|cancelled|todo)\s+(\d+)\s*$/);
  if(!match)continue;
  if(match[1]==='tests')blocks.push({});
  if(blocks.length)blocks.at(-1)[match[1]]=Number(match[2]);
 }
 const last=blocks.at(-1)||{},missing=COUNT_KEYS.filter(key=>!Number.isSafeInteger(last[key]));
 const counts=Object.fromEntries(COUNT_KEYS.map(key=>[key,last[key]??null]));
 const inconsistent=missing.length===0&&counts.tests!==COUNT_KEYS.slice(1).reduce((sum,key)=>sum+counts[key],0);
 return {counts,missing_count_fields:missing,summary_blocks:blocks.length,inconsistent_counts:inconsistent};
}

async function main(){
 const opt=options(process.argv.slice(2));
 if(opt.help){console.log('Usage: node development/verification/run-release-tests.mjs [--prefix docs/verification/release-5.20]\nRuns each dist/game/**/*.test.mjs directly in Node (at most four concurrently).\nWrites <prefix>-tests.json and <prefix>-tests.log; refuses existing output files.');return;}
 const files=await discover(resolve(ROOT,'dist/game'));
 if(!files.length)throw Error('No dist/game/**/*.test.mjs modules found');
 const revision=git('rev-parse','HEAD'),workingTree=git('status','--porcelain','--untracked-files=normal').split('\n').filter(Boolean);
 const jsonPath=opt.prefix+'-tests.json',logPath=opt.prefix+'-tests.log';
 await mkdir(dirname(opt.prefix),{recursive:true});
 let log,json;
 try{log=await open(logPath,'wx');try{json=await open(jsonPath,'wx');}catch(error){await log.close();await unlink(logPath);log=null;throw error;}}
 catch(error){throw Error(`Cannot reserve new verification files; choose an unused --prefix. ${error.message}`);}
 const started=new Date(),clock=performance.now(),results=new Array(files.length),active=new Set();
 let cursor=0,completed=0,interrupted=null,logQueue=Promise.resolve(),logError=null;
 function appendLog(text){logQueue=logQueue.then(()=>log.writeFile(text)).catch(error=>{logError??=error;});return logQueue;}
 function stop(signal){interrupted??=signal;for(const child of active)child.kill('SIGTERM');}
 const onInterrupt=()=>stop('SIGINT'),onTerminate=()=>stop('SIGTERM');
 process.on('SIGINT',onInterrupt);process.on('SIGTERM',onTerminate);
 await appendLog(`Release regression\nHEAD: ${revision}\nNode: ${process.version}\nStarted: ${started.toISOString()}\nDiscovery: recursive dist/game/**/*.test.mjs, excluding dependency directories and symlinks\nLaunch: ${LAUNCH_METHOD}\nModules: ${files.length}; concurrency: ${CONCURRENCY}; per-module timeout: ${MODULE_TIMEOUT_MS} ms\n\n`);

 async function run(file){
  const began=performance.now(),chunks=[],args=['--test-reporter=spec',file];
  let timedOut=false,spawnError=null,killTimer;
  const child=spawn('python3',['-c',NODE_BRIDGE,process.execPath,...args],{cwd:ROOT,stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_DISABLE_COLORS:'1',FORCE_COLOR:'0'}});
  active.add(child);
  function terminate(){child.kill('SIGTERM');killTimer??=setTimeout(()=>child.kill('SIGKILL'),KILL_GRACE_MS);}
  const timeout=setTimeout(()=>{timedOut=true;terminate();},MODULE_TIMEOUT_MS);
  // Interrupts use the same bounded termination path as a timed-out module.
  const interruptChild=()=>terminate();process.on('SIGINT',interruptChild);process.on('SIGTERM',interruptChild);
  child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
  child.stdout.on('data',chunk=>chunks.push(chunk));child.stderr.on('data',chunk=>chunks.push(chunk));
  child.on('error',error=>{spawnError=error.message;});
  const {code,signal}=await new Promise(resolveClose=>child.on('close',(code,signal)=>resolveClose({code,signal})));
  clearTimeout(timeout);clearTimeout(killTimer);active.delete(child);process.off('SIGINT',interruptChild);process.off('SIGTERM',interruptChild);
  const output=chunks.join(''),summary=parseSummary(output),reasons=[];
  if(code!==0)reasons.push(`exit code ${code}`);
  if(signal)reasons.push(`signal ${signal}`);
  if(spawnError)reasons.push(`spawn error: ${spawnError}`);
  if(timedOut)reasons.push('module timeout');
  if(summary.missing_count_fields.length)reasons.push(`missing Node counts: ${summary.missing_count_fields.join(', ')}`);
  if(summary.inconsistent_counts)reasons.push('Node test count does not equal pass/fail/skipped/cancelled/todo total');
  if(summary.counts.fail>0)reasons.push(`${summary.counts.fail} failed tests`);
  if(summary.counts.cancelled>0)reasons.push(`${summary.counts.cancelled} cancelled tests`);
  const result={file,command:['node',...args],exit_code:code,signal,elapsed_seconds:seconds(performance.now()-began),timed_out:timedOut,...summary,...(spawnError?{spawn_error:spawnError}:{}),failure_reasons:reasons};
  await appendLog(`===== ${file} =====\nCommand: node --test-reporter=spec ${file}\n${output}${output.endsWith('\n')?'':'\n'}Exit: ${code}; signal: ${signal??'none'}; elapsed: ${result.elapsed_seconds}s; timed out: ${timedOut}\nCounts: ${JSON.stringify(summary.counts)}\n${reasons.length?'FAIL: '+reasons.join('; ')+'\n':''}\n`);
  completed++;console.log(`[${completed}/${files.length}] ${reasons.length?'FAIL':'PASS'} ${file} (${summary.counts.tests??'?'} tests; ${result.elapsed_seconds}s)`);
  return result;
 }

 try{
  await Promise.all(Array.from({length:Math.min(CONCURRENCY,files.length)},async()=>{
   while(!interrupted){const index=cursor++;if(index>=files.length)return;results[index]=await run(files[index]);}
  }));
  for(let i=0;i<files.length;i++)if(!results[i])results[i]={file:files[i],exit_code:null,signal:null,elapsed_seconds:0,timed_out:false,not_run:true,counts:Object.fromEntries(COUNT_KEYS.map(key=>[key,null])),missing_count_fields:[...COUNT_KEYS],summary_blocks:0,inconsistent_counts:false,failure_reasons:[`not run after ${interrupted||'interruption'}`]};
  const finished=new Date(),headAtFinish=git('rev-parse','HEAD'),totals=Object.fromEntries(COUNT_KEYS.map(key=>[key,results.reduce((sum,r)=>sum+(r.counts[key]??0),0)]));
  const failures=results.filter(r=>r.failure_reasons.length).map(r=>({file:r.file,reasons:r.failure_reasons})),missing=results.filter(r=>r.missing_count_fields.length).map(r=>r.file);
  const report={schema:'ash-aether.release-tests/1',revision,head_at_finish:headAtFinish,revision_changed:revision!==headAtFinish,working_tree_status:workingTree,node_version:process.version,method:'Every discovered dist/game/**/*.test.mjs module executed directly as a separate Node process; up to four concurrently. Actual final per-module Node summary parsed.',launch_method:LAUNCH_METHOD,invocation_diagnosis:'On this execution host direct Node-to-Node pipe children suppress JavaScript stdout, including console.log; --version alone does not detect the issue. A Python-owned subprocess pipe capture and relay preserves the actual test output. No aggregate --test module counts are used.',discovery:{root:'dist/game',suffix:'.test.mjs',excluded_directories:[...EXCLUDED_DIRECTORIES],follow_symlinks:false},files:files.length,discovered_files:files,concurrency:CONCURRENCY,module_timeout_ms:MODULE_TIMEOUT_MS,started_at_utc:started.toISOString(),finished_at_utc:finished.toISOString(),elapsed_seconds:seconds(performance.now()-clock),interrupted,failures,totals,missing_count_summaries:missing,inconsistent_count_summaries:results.filter(r=>r.inconsistent_counts).map(r=>r.file),results,combined_log:portable(relative(ROOT,logPath))};
  await appendLog(`===== TOTAL =====\n${JSON.stringify({revision,head_at_finish:headAtFinish,files:files.length,elapsed_seconds:report.elapsed_seconds,totals,failures,missing_count_summaries:missing,interrupted},null,2)}\n`);
  if(logError)report.log_write_error=logError.message;
  report.passed=failures.length===0&&missing.length===0&&!interrupted&&!logError&&!report.revision_changed;
  await json.writeFile(JSON.stringify(report,null,2)+'\n');
  console.log(`${report.passed?'PASS':'FAIL'}: ${files.length} modules; ${totals.tests} reported tests; ${totals.pass} pass; ${totals.fail} fail.\nJSON: ${portable(relative(ROOT,jsonPath))}\nLog: ${report.combined_log}`);
  if(!report.passed)process.exitCode=interrupted==='SIGINT'?130:interrupted==='SIGTERM'?143:1;
 }finally{process.off('SIGINT',onInterrupt);process.off('SIGTERM',onTerminate);await logQueue;await Promise.all([log.close(),json.close()]);}
}

main().catch(error=>{console.error(`Release regression runner: ${error.message}`);process.exitCode=1;});
