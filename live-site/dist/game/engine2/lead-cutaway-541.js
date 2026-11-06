/** A bounded screen window around the actual camera-facing lead billboard.
 * It changes visibility only. The world mask, actor plane and picking matrix
 * remain owned by their normal systems. Both render backends use this plan. */
const finite=Number.isFinite;
const norm=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
export function leadCutawayWindow({state,sprites=[],vp,billboardVP,width,height}={}){
 if(!state?.adventure||!state.interiorCutaway||!vp||!(width>0&&height>0))return null;
 const p=state.player;if(!finite(p?.x)||!finite(p?.z))return null;
 const nearest=sprites.filter(s=>finite(s?.x)&&finite(s?.z)&&s.width>0&&s.height>0&&(s.alpha??1)>.2).map(s=>({s,d:Math.hypot(s.x-p.x,s.z-p.z)})).filter(q=>q.d<.6).sort((a,b)=>a.d-b.d)[0]?.s;
 const s=nearest||{x:p.x,y:.045,z:p.z,width:1.15,height:2.05,anchorX:.5,anchorY:1},basis=billboardVP||vp,right=norm([basis[0],basis[4],basis[8]]),up=norm([basis[1],basis[5],basis[9]]);
 const project=(x,y,z)=>{const w=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];if(!(w>.15))return null;return{x:(.5+(vp[0]*x+vp[4]*y+vp[8]*z+vp[12])/w*.5)*width,y:(.5-(vp[1]*x+vp[5]*y+vp[9]*z+vp[13])/w*.5)*height,w,z:(vp[2]*x+vp[6]*y+vp[10]*z+vp[14])/w*.5+.5};};
 const y=finite(s.y)?s.y:.045,foot=project(s.x,y,s.z),head=project(s.x+up[0]*s.height,y+up[1]*s.height,s.z+up[2]*s.height),edge=project(s.x+right[0]*s.width/2,y+right[1]*s.width/2,s.z+right[2]*s.width/2);
 if(!foot||!head||!edge)return null;
 const pixelWidth=Math.abs(edge.x-foot.x)*2,pixelHeight=foot.y-head.y;if(!(pixelWidth>1&&pixelHeight>1))return null;
 const anchorX=s.flip?1-(s.anchorX??.5):(s.anchorX??.5),anchorY=s.anchorY??1,left=foot.x-anchorX*pixelWidth,top=foot.y-anchorY*pixelHeight;
 const rx=Math.min(width*.24,Math.max(18,pixelWidth*.62+8)),ry=Math.min(height*.28,Math.max(28,(foot.y-top)*.5+4));
 return{cx:left+pixelWidth*.5,cy:foot.y-ry-2,rx,ry,depthW:foot.w-.04,depthZ:foot.z,footY:foot.y,top,left,width:pixelWidth,height:pixelHeight};
}
