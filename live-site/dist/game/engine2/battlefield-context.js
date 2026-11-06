const fixtureTool=object=>{
 const text=[object.label,object.name,object.kind,object.fixture,object.type].join(' ').toLowerCase();
 if(/bell|chime|tuning|instrument/.test(text))return 'bell';
 if(/coil|wire|console|generator|conductor|lamp/.test(text))return 'coil';
 if(/basin|cistern|pot|well|sink|water|jar/.test(text))return 'jar';
 if(/reed|mat|basket|rope|net/.test(text))return 'reed';
 if(/bench|work|forge|rail|tool|desk/.test(text))return 'hook';
 if(/crate|board|stool|chair|timber|pallet|beam/.test(text))return 'plank';
 return null;
};
function floorNear(scene,x,y){
 const cells=[];for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const cx=Math.floor(x)+dx,cy=Math.floor(y)+dy;if(scene.floor[cy]?.[cx]==='.')cells.push({x:cx+.5,y:cy+.5,d:Math.hypot(cx+.5-x,cy+.5-y)});}
 cells.sort((a,b)=>a.d-b.d);return cells[0]||null;
}
/** Loose tools beside mapped workstations, with habitat salvage on bare terrain.
 * Whole furnishings remain scenery: battle uses the tools beside them. */
export function battlefieldContext(world,object,context){
 const wild=object.type==='wild',enabled=wild||object.type==='patrol'&&!object.originHero;
 if(!enabled)return {...context,wild:false};
 const scene=world.scene,s=world.state,fixtures=[...(scene.objects||[]),...(scene.household?.furnishings||[])],props=[],seen=new Set();
 for(const [index,fixture] of fixtures.entries()){
  const type=fixtureTool(fixture),xy=fixture.xy||fixture.footprint&&[fixture.footprint.x,fixture.footprint.y];
  if(!type||!xy||Math.hypot(xy[0]-s.x,xy[1]-s.y)>8)continue;
  const p=floorNear(scene,xy[0]+.5,xy[1]+1.5);if(!p||Math.hypot(p.x-s.x,p.y-s.y)>7)continue;
  const key=type+':'+Math.floor(p.x)+':'+Math.floor(p.y);if(seen.has(key))continue;seen.add(key);
  props.push({id:'fixture-'+scene.location+'-'+index,type,x:p.x,y:p.y,source:'Loose tools by '+(fixture.label||fixture.name||'the workstation')});if(props.length>=3)break;
 }
 const tags=context.tags||[],local=tags.includes('wet')?['jar','reed','plank','hook']:tags.includes('conductive')?['coil','hook','plank','bell']:tags.includes('resonant')?['bell','plank','hook','coil']:tags.includes('living')?['reed','plank','hook','jar']:['plank','hook','bell','jar'];
 for(let i=0;props.length<4&&i<local.length;i++){
  const type=local[i];if(props.some(p=>p.type===type))continue;
  const a=(i+.5)*Math.PI/2,p=floorNear(scene,s.x+Math.cos(a)*1.7,s.y+Math.sin(a)*1.7);if(!p)continue;
  props.push({id:'salvage-'+scene.location+'-'+i,type,x:p.x,y:p.y,source:'Loose local salvage'});
 }
 return {...context,wild,fieldProps:props};
}
