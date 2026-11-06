/** Scene composition changes before furnishing, so art and collision use the same plan. */
export function prepareExemplarSpaces(data){
 const chapel=data.scenes.find(s=>s.location===292);if(!chapel)return data;
 // A clear apse, a broad nave and a sheltered entrance replace the inherited
 // ragged outline. Every authored object and passage keeps its original cell.
 const grid=Array.from({length:chapel.height},(_,y)=>Array.from({length:chapel.width},(_,x)=>{
  const range=y<2?[5,10]:y<26?[1,14]:y<31?[4,13]:[7,8];return x>=range[0]&&x<=range[1]?'.':'#';
 }));
 for(const o of [...chapel.objects,...chapel.doors,{xy:chapel.arrive}])if(o.xy){const [x,y]=o.xy;if(grid[y]?.[x]!==undefined)grid[y][x]='.';}
 chapel.floor=grid.map(r=>r.join(''));chapel.authoredSpace='rainbell';
 for(const mission of data.campaign.missions)mission.rooms=mission.rooms.map(s=>s.location===chapel.location?chapel:s);
 return data;
}
