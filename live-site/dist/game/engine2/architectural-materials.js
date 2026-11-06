/** Shared painted surfaces. Cached pattern canvases are created once per loaded atlas. */
const cache=new WeakMap();
export function materialTile(image,id,size=256){if(!image)return null;let bucket=cache.get(image);if(!bucket){bucket=new Map();cache.set(image,bucket);}const key=id+':'+size;if(bucket.has(key))return bucket.get(key);const tile=document.createElement('canvas');tile.width=tile.height=size;const c=tile.getContext('2d'),sw=image.width/3,sh=image.height/2;c.drawImage(image,(id%3)*sw,Math.floor(id/3)*sh,sw,sh,0,0,size,size);bucket.set(key,tile);return tile;}
export function paintedPattern(c,image,id,size=256){const tile=materialTile(image,id,size);return tile?c.createPattern(tile,'repeat'):null;}
