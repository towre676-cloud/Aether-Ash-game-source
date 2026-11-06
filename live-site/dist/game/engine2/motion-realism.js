/** One body scale across a character's poses; all poses retain their foot baseline.
 * A median standing height prevents an outstretched weapon from shrinking a body.
 * Width is capped across the entire row, never independently per frame.
 */
export function atlasRegistration(bounds,cols,rows,referenceColumns=null){
 return Array.from({length:rows},(_,row)=>{
  const poses=bounds.slice(row*cols,(row+1)*cols).filter((b,col)=>b.w>1&&b.h>1&&(!referenceColumns||referenceColumns.includes(col)));
  const heights=poses.map(b=>b.bodyHeight||b.h).sort((a,b)=>a-b);
  return {height:heights[Math.floor(heights.length/2)]||1,width:Math.max(1,...poses.map(b=>b.w))};
 });
}
export function registeredFit(source,registration,height,maxWidth){
 const scale=Math.min(height/registration.height,maxWidth/registration.width);
 const width=source.w*scale,h=source.h*scale;
 return {width,height:h,left:-(source.anchorX??source.w/2)*scale,top:-(source.anchorY??source.h)*scale};
}
/** Separate drawings can use different source-pixel units for the same body.
 * Preserve each row's measured height and share a width/body-height ratio;
 * standing and running then have the same physical scale, without a size pop.
 * One scale still applies to every pose in a row, including action reach. */
export function shareActorRegistrations(registrations){
 const crew=registrations.crew,run=registrations.run;
 if(crew&&run)for(let row=0;row<Math.min(crew.length,run.length);row++){
  const ratio=Math.max(crew[row].width/crew[row].height,run[row].width/run[row].height);
  crew[row]={...crew[row],width:ratio*crew[row].height};run[row]={...run[row],width:ratio*run[row].height};
 }
 const starter=registrations.starter;
 if(starter?.length){const ratio=Math.max(...starter.map(r=>r.width/r.height));for(let row=0;row<starter.length;row++)starter[row]={...starter[row],width:ratio*starter[row].height};}
 return registrations;
}
/** Continuous-time camera response: identical damping at 30, 60 and 120 fps. */
export function followAmount(dt,rate){return 1-Math.exp(-Math.max(0,dt)*rate);}

/** Derive a body pivot from opaque torso pixels, independent of a weapon or cape.
 * Measurements are relative to the cutout, so drawing remains safe after cropping.
 * The torso supplies the horizontal pivot. A foot-width opaque span supplies
 * the floor, including an outstretched running foot beyond the torso band;
 * thin sword tips and isolated edge pixels do not.
 */
export function measureActorAnchors(pixels,width,height,bounds){
 return bounds.map(b=>{
  if(b.w<3||b.h<3)return {...b};
  const opaque=(x,y)=>pixels[((b.y+y)*width+b.x+x)*4+3]>96;
  const mass=new Float64Array(b.w);let total=0;
  for(let y=Math.floor(b.h*.25);y<Math.ceil(b.h*.66);y++)for(let x=0;x<b.w;x++)if(opaque(x,y)){mass[x]++;total++;}
  let anchorX=b.w/2,acc=0;
  for(let x=0;x<b.w&&total;x++){acc+=mass[x];if(acc>=total/2){anchorX=x+.5;break;}}
  const half=Math.max(2,b.w*.24),left=Math.max(0,Math.floor(anchorX-half)),right=Math.min(b.w,Math.ceil(anchorX+half));
  let crown=b.h,sole=0;
  for(let y=0;y<b.h;y++){
   let n=0;for(let x=left;x<right;x++)if(opaque(x,y))n++;
   if(n>=Math.max(2,(right-left)*.06)){crown=Math.min(crown,y);sole=y+1;}
  }
  const footWidth=Math.max(4,Math.ceil(b.w*.055));
  for(let y=sole;y<b.h;y++){
   let run=0;for(let x=0;x<b.w;x++){
    run=opaque(x,y)?run+1:0;
    if(run>=footWidth){sole=y+1;break;}
   }
  }
  if(sole<=crown)return {...b};
  return {...b,anchorX,anchorY:sole,bodyHeight:sole-crown};
 });
}
/** Run once when the atlas is prepared; no image reads occur during animation. */
export function registerActorAtlas(image,bounds){
 const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
 const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
 return measureActorAnchors(c.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,bounds);
}
