/** Close exterior play composition. Only nearby, authored work and regional
 * forms guide the view; the exported map is never a camera-fit target. */
import {isInteriorScene} from './scene-identity.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const point=o=>Array.isArray(o?.xy)&&o.xy.every(Number.isFinite)?{x:o.xy[0]+.5,z:o.xy[1]+.5}:null;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function exteriorSceneArtCameraFrame({world,canvas,ui={},lead,p,objects=[],aspect,sites=[],worksites=[]}={}){
 const scene=world?.scene;if(!scene?.floor||isInteriorScene(scene)||scene.originId==='veyr-storm')return null;
 const rect=canvas?.getBoundingClientRect?.()||{},width=finite(rect.width,canvas?.width),height=finite(rect.height,canvas?.height);
 if(!(width>0&&height>0))return null;
 const player={x:finite(p?.x,world.state.x),z:finite(p?.z,world.state.y)},focus={x:finite(lead?.x,player.x),z:finite(lead?.z,player.z)};
 const wide=width>height*1.3,top=Math.min(height*.3,Math.max(28,finite(ui.hudHeight,16)+14)),bottom=Math.max(top+84,height-(ui.touch&&!wide?Math.min(finite(ui.touchReserve,177),height*.35)+52:26)),left=ui.touch&&wide?Math.min(142,width*.19):Math.min(18,width*.055),rightEdge=width-left;
 const authored=scene.authoredOpening?.arrival,arrival=authored||scene.arrive,origin=arrival?{x:arrival[0]+(authored?0:.5),z:arrival[1]+(authored?0:.5)}:player;
 const substantial=worksites.filter(s=>/shelter|market|care|valve|winch|vent|lens|gate|loom|forge/.test(s.kind)&&distance(s,origin)<=8.2).sort((a,b)=>distance(a,origin)-distance(b,origin))[0];
 // A fixed scene diagonal keeps a camp on the forward side of its approach.
 // Both views retain the same SE-family elevation; walking never flips it.
 const bank=sites.filter(s=>!s.slim&&distance(s,origin)<=8.2).sort((a,b)=>distance(a,origin)-distance(b,origin))[0],noLocalWork=!worksites.some(s=>distance(s,origin)<=8.2);
 const raw=substantial&&substantial.x>origin.x+1&&substantial.z<origin.z-1?[-.35,.92,.78]:noLocalWork&&bank&&bank.x<origin.x-2?[.68,.92,.49]:[.35,.92,.78];
 const at=[focus.x,1.10,focus.z],length=Math.hypot(...raw),direction=raw.map(v=>v/length),horizontal=Math.hypot(direction[0],direction[2]),right=[direction[2]/horizontal,0,-direction[0]/horizontal],up=[direction[1]*right[2],direction[2]*right[0]-direction[0]*right[2],-direction[1]*right[0]];
 const fov=Math.PI/3.4,tangent=Math.tan(fov/2),ratio=finite(aspect,width/height)||width/height;
 const local=q=>{const a=q.map((v,i)=>v-at[i]);return{u:a[0]*right[0]+a[2]*right[2],v:a[0]*up[0]+a[1]*up[1]+a[2]*up[2],depth:a[0]*direction[0]+a[1]*direction[1]+a[2]*direction[2]};};
 const project=(q,d)=>({x:q.u/(tangent*ratio*(d-q.depth)),y:q.v/(tangent*(d-q.depth))});
 const points=[];for(const dx of[-.55,.55])for(const dz of[-.2,.2])for(const y of[0,2.05])points.push([player.x+dx,y,player.z+dz]);
 const controls=objects.map(o=>({o,q:point(o)})).filter(v=>v.q&&distance(v.q,player)<=4.6&&(v.o.role==='embodiedAction'||v.o.type==='embodied-action'||v.o.manipulation||['puzzle','switch','riddle','frontier-landmark'].includes(v.o.type))).sort((a,b)=>Number(a.o.role!=='embodiedAction')-Number(b.o.role!=='embodiedAction')||distance(a.q,player)-distance(b.q,player));
 const selected=controls[0];if(selected){points.push([selected.q.x,0,selected.q.z],[selected.q.x,1.15,selected.q.z]);if(selected.o.manipulation==='cable')for(const end of[selected.o.from,selected.o.to])if(Number.isFinite(end?.x)&&Number.isFinite(end?.y))points.push([end.x,0,end.y],[end.x,.9,end.y]);}
 const hard=points.map(local),actor0=local([player.x,0,player.z]),actor1=local([player.x,1.94,player.z]);
 const actorPixels=d=>Math.abs(project(actor1,d).y-project(actor0,d).y)*height/2;
 const bounds=(ps,d)=>{const a=ps.map(q=>project(q,d));return{left:Math.min(...a.map(p=>p.x)),right:Math.max(...a.map(p=>p.x)),top:Math.max(...a.map(p=>p.y)),bottom:Math.min(...a.map(p=>p.y))};};
 const desired=wide?clamp(height*.135,40,104):clamp(height*.078,64.1,70);let lo=7,hi=80;
 for(let i=0;i<17;i++){const d=(lo+hi)/2;if(actorPixels(d)>desired)lo=d;else hi=d;}const close=hi;
 lo=Math.max(7,...hard.map(q=>q.depth+1.2));hi=80;
 for(let i=0;i<17;i++){const d=(lo+hi)/2,b=bounds(hard,d);if(b.right-b.left>2*(rightEdge-left)/width||b.top-b.bottom>2*(bottom-top)/height)lo=d;else hi=d;}
 const d=Math.max(close,hi),b=bounds(hard,d),foot=project(actor0,d),minX=-1+2*left/width-b.left,maxX=1-2*left/width-b.right,minY=-1+2*(height-bottom)/height-b.bottom,maxY=1-2*top/height-b.top;
 const footY=top+(bottom-top)*(wide?.75:.82),sy=clamp(1-2*footY/height-foot.y,minY,maxY);
 // Judge the actual projected body, not the nearest coordinates. A rearward
 // mass at the player's feet loses to a full silhouette above the approach.
 const candidates=(source,kind)=>source.filter(s=>Number.isFinite(s.x)&&Number.isFinite(s.z)&&distance(s,player)<=8.2).map(s=>{
  const y=finite(s.y),h=kind==='region'?(s.slim?3.45:2.65):(s.height||(/shelter|market|care/.test(s.kind)?2.8:1.8)),r=kind==='region'?(s.slim?.35:1.35):Math.min(.8,Math.max(.35,finite(s.radius,finite(s.width,1)*.5)));
  const ps=[];for(const dx of[-r,r])for(const dz of[-r,r])for(const dy of[0,h])ps.push(local([s.x+dx,y+dy,s.z+dz]));
  const box=bounds(ps,d),mid=project(local([s.x,y+h*.55,s.z]),d),base=project(local([s.x,y,s.z]),d);
  return{site:s,kind,box,mid,base,h,r,score:(s.slim?2:0)+(kind==='work'&&/survey|waystation/.test(s.kind)?3.5:0)+distance(s,player)*.025};
 });
 const regions=candidates(sites,'region'),works=candidates(worksites,'work');let best=null;
 for(const region of regions.length?regions:[null])for(const work of works.length?works:[null]){
  const chosen=[region,work].filter(Boolean);if(!chosen.length)continue;
  const l=Math.min(b.left,...chosen.map(c=>c.box.left)),r=Math.max(b.right,...chosen.map(c=>c.box.right)),sx=clamp(-(l+r)/2,minX,maxX);
  let score=0;for(const c of chosen){const x=c.mid.x+sx,y=(1-c.mid.y-sy)*height/2,base=(1-c.base.y-sy)*height/2;
   score+=c.score+Math.max(0,Math.abs(x)-.83)*8+Math.max(0,top+40-y)/height*5+Math.max(0,y-(footY-36))/height*50+Math.max(0,base-bottom)/height*10;
  }
  score+=Math.max(0,(r-l)-2*(rightEdge-left)/width)*5;
  if(!best||score<best.score)best={region,work,sx,score};
 }
 const sx=best?.sx??clamp(-foot.x,minX,maxX),regional=best?.region?.site,work=best?.work?.site;
 return{eye:at.map((v,i)=>v+direction[i]*d),at,fov,shift:{x:sx,y:sy},points,scope:{scene:scene.location,actorPixels:actorPixels(d),footY:(1-foot.y-sy)*height/2,regional:regional?{x:regional.x,z:regional.z,y:finite(regional.y),kind:regional.kind,slim:!!regional.slim}:null,worksite:work?{x:work.x,z:work.z,y:finite(work.y),kind:work.kind}:null,selectedControl:selected?.o.id||selected?.o.type||null,window:{left,right:rightEdge,top,bottom}}};
}
