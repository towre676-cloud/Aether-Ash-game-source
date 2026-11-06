/**
 * Keep small exploration movements inside a stable screen-space window.
 * Coordinates are world pixels; viewport dimensions and window radii are CSS
 * pixels. The caller enables this only for outdoor exploration. cameraFollow
 * remains responsible for interpolation, so this helper has no clock or state.
 */
const finiteFrame=frame=>frame&&Number.isFinite(frame.x)&&Number.isFinite(frame.y)&&Number.isFinite(frame.zoom)&&frame.zoom>0;
const inset=(value,extent)=>Number.isFinite(value)?Math.max(0,Math.min(extent,value)):0;
const followEdge=(current,target,radius)=>Math.abs(target-current)<=radius?current:target-Math.sign(target-current)*radius;

export function explorationCameraTarget(camera,composition,{enabled=false,width,height,layout,travel=null,steady=false}={}){
 // Preserve every authored frame, including object identity, when opted out.
 // Malformed input also bypasses the window rather than inventing a new frame.
 if(!enabled||!finiteFrame(camera)||!finiteFrame(composition)||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return composition;
 const usableWidth=width-inset(layout?.right,width);
 const usableHeight=Number.isFinite(layout?.visibleHeight)
  ?Math.max(0,Math.min(height,layout.visibleHeight))
  :Math.max(0,height-inset(layout?.top,height)-inset(layout?.bottom,height));
 // An almost entirely covered or collapsed view must keep its authored focus.
 if(usableWidth<64||usableHeight<64)return composition;
 const radiusX=Math.min(44,usableWidth*.045)/composition.zoom;
 const radiusY=Math.min(28,usableHeight*.045)/composition.zoom;
 // Lead actual displacement, not held input: pushing a wall cannot pan the view.
 // This stays inside the existing composition/window/follow chain.
 const distance=travel&&Number.isFinite(travel.x)&&Number.isFinite(travel.y)?Math.hypot(travel.x,travel.y):0;
 const moving=!steady&&distance>1e-5&&distance<1.5;
 const targetX=composition.x+(moving?travel.x/distance*Math.min(64,usableWidth*.08)/composition.zoom:0);
 const targetY=composition.y+(moving?travel.y/distance*Math.min(44,usableHeight*.08)/composition.zoom:0);
 const dx=targetX-camera.x,dy=targetY-camera.y;
 if(!Number.isFinite(radiusX)||!Number.isFinite(radiusY)||!Number.isFinite(dx)||!Number.isFinite(dy))return composition;
 return {zoom:composition.zoom,x:followEdge(camera.x,targetX,radiusX),y:followEdge(camera.y,targetY,radiusY)};
}
