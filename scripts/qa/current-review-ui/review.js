import {inspectMapStability} from './inspect-map-stability.mjs';
const frame=document.querySelector('iframe'),report=document.querySelector('pre');
const result={source:'Exact current source plus 14-file review overlay',deployed:false,measurements:[]};
function show(){report.textContent=JSON.stringify(result,null,2);}
document.querySelector('#phone').onclick=()=>{frame.style.width='390px';frame.style.height='844px';};
document.querySelector('#desktop').onclick=()=>{frame.style.width='1280px';frame.style.height='800px';};
frame.addEventListener('load',()=>{
 const doc=frame.contentDocument,win=frame.contentWindow;
 let sampling=false;
 doc.addEventListener('click',async event=>{
  if(sampling||!event.target.closest('#room-map-panel .room-map-destinations button'))return;
  sampling=true;
  const tasks=[];
  const observer=new win.PerformanceObserver(list=>tasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));
  observer.observe({type:'longtask'});
  try{result.measurements.push({...await inspectMapStability(doc),longTasks:tasks});}
  catch(e){result.error=e.message;}
  finally{observer.disconnect();sampling=false;show();}
 });
});
document.querySelector('#save').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));a.download='map-geometry.json';a.click();};
