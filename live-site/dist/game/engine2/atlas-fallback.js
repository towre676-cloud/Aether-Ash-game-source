import {ACTOR_SHEETS,actorSourceRect} from './actor-atlas.js?v=5.14.0';

const dimensions=image=>image&&Number.isFinite(image.width)&&Number.isFinite(image.height)&&image.width>0&&image.height>0;
const substantial=b=>b.w>3&&b.h>3;

/** Draw the delivered Image directly when an intermediate canvas is unavailable.
 * Actor artwork is packed, so its measured rectangles must replace equal grids.
 * No readback or replacement texture is needed for this recovery path.
 */
export function originalAtlas(image,kind,cols,rows){
 if(!dimensions(image)||!Number.isInteger(cols)||cols<1||!Number.isInteger(rows)||rows<1)throw new Error('Cannot recover '+kind+' art: invalid image or atlas dimensions.');
 const sheet=ACTOR_SHEETS[kind],bounds=[];
 if(sheet&&(cols!==8||rows!==sheet.rows.length))throw new Error('Cannot recover '+kind+' art: actor layout does not match the source sheet.');
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  if(sheet){const b=actorSourceRect(kind,row,col),sx=image.width/sheet.width,sy=image.height/sheet.height;bounds.push({x:b.x*sx,y:b.y*sy,w:b.w*sx,h:b.h*sy,anchorX:b.anchorX*sx,anchorY:b.anchorY*sy,bodyHeight:b.bodyHeight*sy});}
  else bounds.push({x:col*image.width/cols,y:row*image.height/rows,w:image.width/cols,h:image.height/rows});
 }
 return {image,bounds};
}

/** A transparent readback otherwise looks like a successful atlas of 1px cells.
 * Reject that result before it can replace a usable original image permanently.
 */
export function preparedAtlasUsable(result,expectedCount){
 if(!dimensions(result?.image)||!Number.isInteger(expectedCount)||expectedCount<1||!Array.isArray(result.bounds)||result.bounds.length!==expectedCount)return false;
 const {width,height}=result.image,valid=b=>b&&['x','y','w','h'].every(k=>Number.isFinite(b[k]))&&b.x>=0&&b.y>=0&&b.w>0&&b.h>0&&b.x+b.w<=width+1e-6&&b.y+b.h<=height+1e-6;
 if(!result.bounds.every(valid)||!result.bounds.some(substantial))return false;
 if((expectedCount===56||expectedCount===16)&&!result.bounds.every(substantial))return false;
 return true;
}
