/** Remove neighboring-pose debris inside atlas cells; never flip or rotate bodies. */
export function isolateAtlas(data,width,height,cols,rows,{threshold=70}={}){
 const pixels=new Uint8ClampedArray(data),bounds=[];
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const x0=Math.ceil(col*width/cols),x1=Math.floor((col+1)*width/cols),y0=Math.ceil(row*height/rows),y1=Math.floor((row+1)*height/rows),w=x1-x0,h=y1-y0;
  const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let best=[];
  for(let sy=0;sy<h;sy++)for(let sx=0;sx<w;sx++){const first=sy*w+sx;if(seen[first]||pixels[((y0+sy)*width+x0+sx)*4+3]<=threshold)continue;let head=0,tail=1;queue[0]=first;seen[first]=1;
   while(head<tail){const at=queue[head++],x=at%w,y=Math.floor(at/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const n=ny*w+nx;if(!seen[n]&&pixels[((y0+ny)*width+x0+nx)*4+3]>threshold){seen[n]=1;queue[tail++]=n;}}}
   if(tail>best.length)best=Array.from(queue.subarray(0,tail));
  }
  // Retain antialiased edge pixels adjacent to the principal component.
  const keep=new Uint8Array(w*h);for(const n of best){const x=n%w,y=Math.floor(n/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<w&&yy<h)keep[yy*w+xx]=1;}}
  let left=x1,top=y1,right=x0,bottom=y0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=((y0+y)*width+x0+x)*4;if(!keep[y*w+x])pixels[p+3]=0;else if(pixels[p+3]){left=Math.min(left,x0+x);right=Math.max(right,x0+x);top=Math.min(top,y0+y);bottom=Math.max(bottom,y0+y);}}
  bounds.push(best.length?{x:left,y:top,w:right-left+1,h:bottom-top+1}:{x:x0,y:y0,w:1,h:1});
 }
 return {pixels,bounds};
}
export function cutoutAtlas(image,cols,rows){const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);const raw=c.getImageData(0,0,canvas.width,canvas.height),clean=isolateAtlas(raw.data,canvas.width,canvas.height,cols,rows);raw.data.set(clean.pixels);c.putImageData(raw,0,0);return{image:canvas,bounds:clean.bounds};}
