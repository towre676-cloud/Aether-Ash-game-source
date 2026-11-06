/** Device-local lens choice. A manual value is an absolute scale, never a
 * multiplier of the scenic camera, so entering a new place cannot change it. */
export const CAMERA_ZOOM_MIN=.5;
export const CAMERA_ZOOM_MAX=3;
export const CAMERA_ZOOM_KEY='ash-camera-zoom-v1';

export function cameraZoomValue(value){
 return typeof value==='number'&&Number.isFinite(value)&&value>0
  ?Math.max(CAMERA_ZOOM_MIN,Math.min(CAMERA_ZOOM_MAX,value)):null;
}
export function readCameraZoom(storage){
 try{const value=JSON.parse(storage?.getItem(CAMERA_ZOOM_KEY)??'null');return value?.version===1?cameraZoomValue(value.zoom):null;}catch{return null;}
}
export function saveCameraZoom(storage,zoom){
 try{const value=cameraZoomValue(zoom);if(value===null)storage?.removeItem(CAMERA_ZOOM_KEY);else storage?.setItem(CAMERA_ZOOM_KEY,JSON.stringify({version:1,zoom:value}));return true;}catch{return false;}
}

/** Preserve the world point under the fingers using the same CSS-pixel view
 * origin as Renderer.screenToWorld. Neither the HUD nor touch buttons scale. */
export function zoomCameraAt(camera,zoom,{width,layout,anchor}={}){
 const value=cameraZoomValue(zoom);
 if(value===null)return {...camera};
 const next={...camera,zoom:value};
 if(!Number.isFinite(camera?.x)||!Number.isFinite(camera?.y)||!Number.isFinite(camera?.zoom)||camera.zoom<=0
  ||!Number.isFinite(anchor?.x)||!Number.isFinite(anchor?.y)||!Number.isFinite(width)||!Number.isFinite(layout?.centerY))return next;
 const cx=Number.isFinite(layout.centerX)?layout.centerX:width/2,cy=layout.centerY;
 next.x=camera.x+(anchor.x-cx)*(1/camera.zoom-1/value);
 next.y=camera.y+(anchor.y-cy)*(1/camera.zoom-1/value);
 return next;
}

/** An accessible alternative and an explicit way back to automatic framing. */
export function mountCameraZoomControls(parent,{getManual=()=>null,getCurrent=()=>1,onChange=()=>{},onAutomatic=()=>{}}={}){
 const section=document.createElement('section');section.className='camera-zoom-setting';section.setAttribute('aria-label','World camera');
 const label=document.createElement('label');label.className='setting';label.textContent='World zoom';
 const range=document.createElement('input');range.type='range';range.min=String(CAMERA_ZOOM_MIN*100);range.max=String(CAMERA_ZOOM_MAX*100);range.step='1';range.setAttribute('aria-label','World zoom');label.append(range);
 const status=document.createElement('p');status.className='hint';status.id='camera-zoom-status';range.setAttribute('aria-describedby',status.id);
 const reset=document.createElement('button');reset.type='button';reset.textContent='Use automatic zoom';
 for(const event of ['keydown','keyup'])reset.addEventListener(event,e=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation();});
 const hint=document.createElement('p');hint.className='hint';hint.textContent='Move two fingers apart on the world to zoom in, or together to zoom out. Your zoom stays set as you travel and is remembered on this device.';
 function update(){const manual=cameraZoomValue(getManual()),current=manual??cameraZoomValue(getCurrent())??1,percent=Math.round(current*100);range.value=String(percent);range.setAttribute('aria-valuetext',percent+' percent'+(manual===null?' · automatic':' · manual'));status.textContent=manual===null?'Automatic zoom follows the scene.':'Manual zoom · '+percent+'%';reset.disabled=manual===null;}
 range.addEventListener('input',()=>{onChange(Number(range.value)/100);update();});
 reset.addEventListener('click',e=>{e.stopPropagation();onAutomatic();update();});
 section.append(label,status,reset,hint);parent.append(section);update();
 return {update,destroy(){section.remove();}};
}
