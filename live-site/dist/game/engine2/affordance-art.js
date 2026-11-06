import {SCENE_PROP_CROPS} from './scene-craft.js?v=5.38';
import {isInteriorScene} from './scene-identity.js';

/** Only use a painted object when it depicts the actual world interaction.
 * A tiny salvage jar must never acquire a bank-sized waterwheel silhouette. */
export function affordanceArtSpec(scene,object){
 if(!scene||!object||isInteriorScene(scene))return null;
 // A floor probe is a hand-sized listening device. A dry burrow is a low soil
 // repair. Neither acquires the atlas's monumental mast or waterwheel.
 if(object.affordanceKind==='scout'||['hydrophone','lookout','listen','burrow'].includes(object.art)||object.profileId==='burrow-trail')return null;
 // Real profiles dispatch by function. The vane crop is not an electrical
 // inspection channel, and the fountain arch is not a dry archive gate.
 if(object.profileId&&((object.art==='relay'&&object.profileId!=='vane-relay')||object.art==='resonancegate'))return null;
 let id,height;
 if(object.affordanceKind==='salvage'){
  // The atlas has a faithful reed stand, but no isolated hook/plank/coil/jar.
  // Their existing field-tool drawing remains the source of truth.
  if((object.toolType||object.art)!=='reed')return null;
  id=5;height=30;
 }else if(object.art==='sluice'){id=2;height=90;}
 else if(object.art==='relay'){id=7;height=96;}
 else if(object.art==='resonancegate'){id=0;height=98;}
 else if(object.art==='brace')return null;
 else return null;
 if(object.compactArt)height*=.72;
 const crop=SCENE_PROP_CROPS[id];return {id,crop,height,width:height*crop[2]/crop[3],salvage:object.affordanceKind==='salvage'};
}

/** Fade only artwork actually in front of an actor's body, never every nearby prop. */
export function affordanceArtOpacity(spec,position,actors=[],solved=false){
 if(!spec)return 1;
 const covered=actors.some(a=>a&&Number.isFinite(a.x)&&Number.isFinite(a.y)&&a.y<=position.y+.06&&a.y>position.y-spec.height/48-1&&Math.abs(a.x-position.x)<spec.width/96+.2);
 return (covered?.43:1)*(spec.salvage&&solved?.28:1);
}

export function drawAffordanceArt(renderer,object,T=48){
 const scene=renderer.currentScene||renderer.lastWorld?.scene,atlas=renderer.assets?.sceneProps,spec=affordanceArtSpec(scene,object);
 if(!spec||!atlas?.width||!atlas?.height||!object.xy?.every(Number.isFinite))return false;
 const [sx,sy,sw,sh]=spec.crop;if(sx+sw>atlas.width||sy+sh>atlas.height)return false;
 const x=(object.xy[0]+.5)*T,y=(object.xy[1]+.5)*T,actors=[renderer.lastWorld?.state,...(renderer.followers||[])].filter(Boolean),alpha=affordanceArtOpacity(spec,{x:object.xy[0]+.5,y:object.xy[1]+.5},actors,object.solved),scale=T/48,compact=object.compactArt?.72:1,c=renderer.ctx;
 c.save();c.translate(x,y);c.scale(scale,scale);
 c.fillStyle='#10201b45';c.beginPath();c.ellipse(0,2*compact,spec.width*.38,7*compact,0,0,Math.PI*2);c.fill();
 c.globalAlpha=(Number.isFinite(c.globalAlpha)?c.globalAlpha:1)*alpha;
 c.drawImage(atlas,sx,sy,sw,sh,-spec.width/2,-spec.height+3,spec.width,spec.height);
 // State stays physically small: repaired lashing and observed rhythm marks.
 if(!spec.salvage&&(object.solved||object.progress>0)){
  c.save();c.scale(compact,compact);c.globalAlpha=alpha;c.fillStyle=object.solved?'#c8d6a6':'#dcc58d';c.strokeStyle='#334438';c.lineWidth=1;
  const count=object.solved?3:Math.max(0,Math.min(3,Math.floor(object.progress||0)));
  for(let n=0;n<count;n++){c.beginPath();c.roundRect(-10+n*7,4,5,3,1);c.fill();c.stroke();}c.restore();
 }
 c.restore();return true;
}
