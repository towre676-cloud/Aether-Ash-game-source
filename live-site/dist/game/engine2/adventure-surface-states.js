/** The visible surface reads the same live ground used by movement and combat.
 * Sampling is bounded and cached; drawing never casts, repairs, or pays for an
 * action. The native ground/vegetation controllers remain authoritative. */
const CACHE=new WeakMap();
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const hash=(x,z)=>{let n=Math.imul(x+319,374761393)^Math.imul(z+917,668265263);return((n^n>>>13)>>>0)/4294967296;};
export function adventureSurfaceState(ground,atlas){
 const vegetation=atlas?.vegetation||{},fields=atlas?.fields||{};
 return {wet:clamp(ground?.wetness),heat:clamp(ground?.temperature??ground?.heat),charge:clamp(ground?.charge),phase:clamp(ground?.phase),fracture:clamp(ground?.fracture),scorch:clamp(vegetation.scorch),biomass:clamp(fields.biomass??vegetation.biomass),flattened:clamp(vegetation.flattening??vegetation.flattened),resonance:clamp(fields.resonance),grass:!!ground?.grassAllowed};
}
export function adventureSurfaceSamples(world,time=0){
 const groundModel=world?.reconciledGround||world?.groundForge||world?.ground;
 if(!world?.scene||!groundModel?.sample&&!world.livingAtlas?.sample)return[];
 const cx=Math.floor(world.state.x),cz=Math.floor(world.state.y),previous=CACHE.get(world);
 if(previous&&previous.scene===world.scene&&previous.state===world.state&&previous.cx===cx&&previous.cz===cz&&time>=previous.time&&time-previous.time<.55)return previous.samples;
 const samples=[];
 for(let dz=-6;dz<=6;dz++)for(let dx=-6;dx<=6;dx++){
  if(dx*dx+dz*dz>40)continue;const x=cx+dx,z=cz+dz;if(world.scene.floor[z]?.[x]!=='.')continue;
  const ground=groundModel?.sample?.(x+.5,z+.5),atlas=world.livingAtlas?.sample?.(x+.5,z+.5),state=adventureSurfaceState(ground,atlas);
  if(state.wet>.31||state.heat>.08||state.charge>.06||state.phase>.07||state.fracture>.08||state.scorch>.04||state.grass&&state.biomass>.16)samples.push({x,z,...state});
 }
 CACHE.set(world,{scene:world.scene,state:world.state,cx,cz,time,samples});return samples;
}
export function appendAdventureSurfaceStates(mesh,glow,{world,time=0}={}){
 const samples=adventureSurfaceSamples(world,time);
 for(const s of samples){
  const x=s.x+.5,z=s.z+.5,n=hash(s.x,s.z),y=.032;
  if(s.wet>.31){const wet=clamp((s.wet-.28)/.65),r=(.20+wet*.25)*(.83+n*.30),px=x+(n-.5)*.24,pz=z+(hash(s.z,s.x)-.5)*.24;mesh.disc(px,y,pz,r,r*(.54+n*.22),[.10,.24,.26],6,1);mesh.disc(px+.04,y+.003,pz-.045,r*.72,r*.28,[.23,.39,.40],6,1);if(wet>.30){const q=(time*.27+n)%1;glow.ring(px,y+.006,pz,.06+q*r*.65,.07+q*r*.65,[.45,.65,.64],9,0,(1-q)*wet*.20,12);}}
  if(s.scorch>.04||s.heat>.12){const v=Math.max(s.scorch,s.heat*.7),r=.22+v*.26;mesh.disc(x,y+.005,z,r,r*.75,[.16-.08*v,.13-.05*v,.10-.03*v],6,1);if(s.heat>.3)for(let i=0;i<3;i++){const a=n*6.28+i*2.1;mesh.tube([x+Math.cos(a)*.08,y+.014,z+Math.sin(a)*.08],[x+Math.cos(a)*r*.8,y+.014,z+Math.sin(a)*r*.8],.011,.005,[.71,.21,.055],4,4,s.heat*.42);}}
  if(s.fracture>.08){const r=.16+s.fracture*.30,pts=[[-.9,.3],[-.25,-.17],[.26,.12],[.88,-.5]];for(let i=1;i<pts.length;i++)mesh.tube([x+pts[i-1][0]*r,y+.013,z+pts[i-1][1]*r],[x+pts[i][0]*r,y+.013,z+pts[i][1]*r],.009+s.fracture*.012,.009,[.055,.070,.065],6,4);mesh.tube([x-.25*r,y+.013,z-.17*r],[x-.45*r,y+.013,z-.78*r],.012,.004,[.055,.070,.065],6,4);}
  if(s.charge>.06||s.phase>.07){const v=Math.max(s.charge,s.phase),c=s.phase>s.charge?[.39,.38,.65]:[.36,.65,.66];for(let i=0;i<2;i++){const a=n*6.28+i*2.5,px=x+Math.cos(a)*.28,pz=z+Math.sin(a)*.28;mesh.tube([px,y+.012,pz],[px+.10,y+.015,pz-.06],.012,.006,c,4,4,v*.6);}}
  if(s.grass&&s.biomass>.16&&n>.50&&s.scorch<.6){const growth=s.biomass*(1-s.scorch)*(1-s.flattened*.8),h=.08+growth*.20;for(let i=0;i<3;i++){const px=x-.16+i*.14,pz=z+Math.sin(i+n*8)*.13,sway=Math.sin(time*1.4+n*6.28)*h*.14;mesh.tube([px,.025,pz],[px+sway,.025+h*(i===1?1:.7),pz-.035],.014,.002,[.23+growth*.05,.33+growth*.16,.16+growth*.07],5,4);}}
 }
 return samples.length;
}
