/** Four-way breadth-first pathfinding over authored walkable cells; manual joystick input cancels it. */
export function findPath(scene,from,to,radius=0){const key=(x,y)=>x+','+y,start=[Math.floor(from[0]),Math.floor(from[1])],goal=[Math.floor(to[0]),Math.floor(to[1])],open=[start],seen=new Set([key(...start)]),prior=new Map();let found=null;
 for(let i=0;i<open.length;i++){const[x,y]=open[i];if(Math.hypot(x-goal[0],y-goal[1])<=radius){found=[x,y];break;}for(const[a,b]of[[x+1,y],[x-1,y],[x,y+1],[x,y-1]])if(scene.floor[b]?.[a]==='.'&&!(scene.affordanceBlocked||[]).some(p=>p[0]===a&&p[1]===b)&&!seen.has(key(a,b))){seen.add(key(a,b));prior.set(key(a,b),[x,y]);open.push([a,b]);}}
 if(!found)return[];const path=[];while(key(...found)!==key(...start)){path.unshift([found[0]+.5,found[1]+.5]);found=prior.get(key(...found));}return path;
}
