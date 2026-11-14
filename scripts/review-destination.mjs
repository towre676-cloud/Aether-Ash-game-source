import {realpathSync,lstatSync} from 'node:fs';
import {resolve,dirname,join,relative,isAbsolute,sep} from 'node:path';
const exists=p=>{try{lstatSync(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
/** Resolve existing symlink ancestors before creating an output directory. */
export function reviewDestination(sourceRoot,outputRoot){
 const source=realpathSync(resolve(sourceRoot)),out=resolve(outputRoot);
 if(exists(out))throw Error('Review destination exists; never overwrite it');
 let parent=dirname(out),tail=[out.slice(parent.length+1)];
 while(!exists(parent)){tail.unshift(parent.slice(dirname(parent).length+1));parent=dirname(parent);}
 const canonical=join(realpathSync(parent),...tail),rel=relative(source,canonical);
 if(!rel||rel!=='..'&&!rel.startsWith('..'+sep)&&!isAbsolute(rel))
  throw Error('Review destination must not be inside or equal to current source');
 return {source,out:canonical};
}
