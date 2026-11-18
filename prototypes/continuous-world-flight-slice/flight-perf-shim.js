/* Flight slice performance probe: injected before the game inline script.
 * Identical for baseline and candidate. Does not mutate physics or gameplay.
 * Browser/driver timings are NOT hardware-independent GPU timestamps. */
(() => {
  const maxFrames=4000;
  const measurements={};
  const totals={buffers:0,bufferBytes:0,textureUploads:0,programs:0,shaderSwitches:0};
  const phases=[], longTasks=[];
  let phase='boot', frames=[], previous=0, current=null, glContext=null, lastCellKeys='';
  const counts=()=>({drawCalls:0,vertices:0,triangles:0,vaoBinds:0,programBinds:0,textureBinds:0,bufferUploads:0,uploadBytes:0,materialChanges:0});
  const glWrap=(gl,name,tap)=>{
    const old=gl[name];if(typeof old!=='function')return;
    try { gl[name]=function(...args){tap(...args);return old.apply(this,args);}; }
    catch(e){measurements['missingHook:'+name]=String(e);}
  };
  const byteSize=value=>typeof value==='number'?value:value?.byteLength||0;
  const oldGet=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){
    const gl=oldGet.call(this,type,...args);
    if(type!=='webgl2'||!gl||gl.__flightPerfWrapped)return gl;
    gl.__flightPerfWrapped=true;glContext=gl;
    glWrap(gl,'drawArrays',(mode,first,count)=>{
      if(!current)return;
      current.drawCalls++;current.vertices+=count;
      if(mode===gl.TRIANGLES)current.triangles+=Math.floor(count/3);
    });
    glWrap(gl,'drawElements',(mode,count)=>{
      if(!current)return;
      current.drawCalls++;current.vertices+=count;
      if(mode===gl.TRIANGLES)current.triangles+=Math.floor(count/3);
    });
    glWrap(gl,'drawArraysInstanced',(mode,first,count,instances)=>{
      if(!current)return;
      current.drawCalls++;current.vertices+=count*instances;
      current.instances=(current.instances||0)+instances;
      if(mode===gl.TRIANGLES)current.triangles+=Math.floor(count*instances/3);
    });
    glWrap(gl,'bindVertexArray',()=>{if(current)current.vaoBinds++;});
    glWrap(gl,'useProgram',()=>{totals.programs++;if(current)current.programBinds++;});
    glWrap(gl,'bindTexture',()=>{if(current)current.textureBinds++;});
    glWrap(gl,'texImage2D',()=>{totals.textureUploads++;});
    glWrap(gl,'createBuffer',()=>{totals.buffers++;});
    glWrap(gl,'bufferData',(target,data)=>{
      const bytes=byteSize(data);totals.bufferBytes+=bytes;
      if(current){current.bufferUploads++;current.uploadBytes+=bytes;}
    });
    glWrap(gl,'uniform3fv',()=>{if(current)current.materialChanges++;});
    try{
      const ext=gl.getExtension('WEBGL_debug_renderer_info');
      measurements.renderer=ext?String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)):'WebGL2 renderer extension unavailable';
      measurements.vendor=ext?String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)):'unknown';
      measurements.gpuTimerAvailable=!!gl.getExtension('EXT_disjoint_timer_query_webgl2');
    }catch(e){measurements.renderer='GPU metadata unavailable: '+String(e);}
    return gl;
  };
  try{
    const obs=new PerformanceObserver(list=>{
      for(const e of list.getEntries())if(e.entryType==='longtask')longTasks.push({durationMs:+e.duration.toFixed(3),phase});
    });
    obs.observe({entryTypes:['longtask']});
  }catch(e){measurements.longTasksUnsupported=String(e);}
  const oldRAF=requestAnimationFrame.bind(window);
  window.requestAnimationFrame=callback=>oldRAF(timestamp=>{
    const begin=performance.now(),gap=previous?begin-previous:null;previous=begin;
    current=counts();
    callback(timestamp);
    const elapsed=performance.now()-begin,stats=window.__sliceVisibility||null;
    const visible=stats?.keys||[],key=Array.isArray(visible)?visible.join('|'):'';
    const changed=!!key&&key!==lastCellKeys;
    lastCellKeys=key;
    const m=performance.memory;
    if(phase!=='boot'&&frames.length<maxFrames)frames.push({
      rafMs:gap==null?null:+gap.toFixed(3),
      jsFrameMs:+elapsed.toFixed(3),
      ...current,
      visibleCells:stats?.visibleCells??null,
      meshCount:stats?.meshCount??null,
      vegetationChunks:stats?.vegetationChunks??null,
      terrainChunks:stats?.terrainChunks??null,
      culledChunks:stats?.culledChunks??null,
      streamingChanged:changed,
      heapBytes:frames.length%6===0?m?.usedJSHeapSize||null:null
    });
    current=null;
  });
  const percentile=(s,p)=>!s.length?null:Math.round(s[Math.min(s.length-1,Math.max(0,Math.ceil(p*s.length)-1))]*1000)/1000;
  const distribution=(values)=>{
    const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
    return {count:sorted.length,p50:percentile(sorted,.50),p95:percentile(sorted,.95),p99:percentile(sorted,.99),max:percentile(sorted,1)};
  };
  const mean=values=>{const arr=values.filter(Number.isFinite);return arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length*100)/100:null;};
  function summarize(){
    const live=frames.filter(f=>f.rafMs!==null);
    return {
      phase,frameCount:frames.length,raf:distribution(live.map(f=>f.rafMs)),
      javascript:distribution(frames.map(f=>f.jsFrameMs)),
      stalls:{over33ms:live.filter(f=>f.rafMs>33.334).length,over50ms:live.filter(f=>f.rafMs>50).length,over100ms:live.filter(f=>f.rafMs>100).length,
        reportedLongTasks:longTasks.filter(t=>t.phase===phase).length,longTaskMaxMs:distribution(longTasks.filter(t=>t.phase===phase).map(t=>t.durationMs)).max},
      meanDrawCalls:mean(frames.map(f=>f.drawCalls)),meanTriangles:mean(frames.map(f=>f.triangles)),
      meanVaoBinds:mean(frames.map(f=>f.vaoBinds)),meanProgramBinds:mean(frames.map(f=>f.programBinds)),
      meanMaterialUniformChanges:mean(frames.map(f=>f.materialChanges)),meanTextureBinds:mean(frames.map(f=>f.textureBinds)),
      meanVisibleCells:mean(frames.map(f=>f.visibleCells)),meanVegetationChunks:mean(frames.map(f=>f.vegetationChunks)),
      meanTerrainChunks:mean(frames.map(f=>f.terrainChunks)),meanCulledChunks:mean(frames.map(f=>f.culledChunks)),
      streamingChanges:frames.filter(f=>f.streamingChanged).length,heapSamples:distribution(frames.map(f=>f.heapBytes)),
      aggregateStreamCells:statsSnapshot()
    };
  }
  function statsSnapshot(){const t=window.__sliceVisibility||{};return {meshCount:t.meshCount??null,cellSize:t.cellSize??null,streamingCount:t.streamingCount??null};}
  window.__flightPerf={
    select(name){if(phase!=='boot')phases.push(summarize());phase=name;frames=[];previous=0;lastCellKeys='';},
    result(){if(phase!=='boot')return {phases:[...phases,summarize()],renderer:measurements,uploads:{...totals},viewport:{width:innerWidth,height:innerHeight},pixelRatio:devicePixelRatio};
      return {phases,renderer:measurements,uploads:{...totals}};},
    raw(){return frames.slice();},
    phase:()=>phase
  };
  window.__ENABLE_SLICE_TEST__=true;
})();
