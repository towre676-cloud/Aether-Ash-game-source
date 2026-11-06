/** Ash & Aether 5.37: story-driven structural detail kit.
 * Placed only on actual architectural surfaces (not distributed in empty space).
 * No physics, interactables, quests, DOM, or game state is manufactured here.
 */
const TAU=Math.PI*2;
const noise=(s,i)=>{let n=Math.imul((s|0)^(i|0),0x9e3779b1);n=Math.imul(n^(n>>>15),0x85ebca6b);return ((n^(n>>>13))>>>0)/4294967296;};
const lerp=(a,b,t)=>a+(b-a)*t;
function box(T,p,w,h,d,m,x,y,z,n){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.name=n;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
function bar(T,p,a,b,r,m,n){const v=new T.Vector3(...a),e=new T.Vector3(...b),delta=e.clone().sub(v),l=delta.length();if(l<1e-4)return;
 const o=new T.Mesh(new T.CylinderGeometry(r*.87,r,l,7),m);o.name=n;o.position.copy(v.add(e).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());o.castShadow=true;p.add(o);return o;}
function gem(T,p,g,m,x,y,z,s,n){const o=new T.Mesh(g,m);o.name=n;o.position.set(x,y,z);o.scale.setScalar(s);o.castShadow=true;p.add(o);return o;}
/** The building footprint and roof profile drive all attached ornament.
 * Deliberate nonuniformity: regional weathering, asymmetrical joinery,
 * roof structure, site-specific annexes, and a clear central doorway.
 */
export function dressHouse(T,p,M,{width=5.4,depth=5.3,height=3.4,seed=1,style='dwelling',quality='high',region='clay'}={}){
 const low=quality==='low'||quality==='battery',front=depth*.5;
 const rise=width*.43,top=height+.29+rise,wall=height+.26;
 const carp=style==='workshop',wet=region==='water',tended=region==='clay',industrial=region==='ash',esoteric=region==='aether';
 // Structural front cornice and arc-shaped ceiling-bearing braces.
 for(const side of [-1,1]){
  const x=side*(width*.5-.24);
  box(T,p,.29,.21,.48,M.stone,x,wall*.2,front+.15,'corner-stone-bonding');
  for(let q=0;q<(low?5:9);q++){
   const y=.57+q*(height-.35)/(low?5:9);
   box(T,p,.21,.11,.20,q%3===0?M.trim:M.stone,x,y,front+.17,'hand-cut-facade-quoin');
  }
  bar(T,p,[side*width*.48,wall-.16,front+.28],[side*width*.27,wall+.54,front+.37],.09,M.wood,'gable-load-brace');
  // Roof sheeting is not a square outline: secondary thin edge at actual slope.
  bar(T,p,[0,top,side*(depth*.5+.39)],[side*(width*.5+.37),wall,side*(depth*.5+.39)],.084,M.wood,'steep-gable-edge-rafter');
 }
 // Deep entry porch: carved pillars to either side, lintel clear of the playable door.
 for(const side of [-1,1]){
  const x=side*1.14;
  box(T,p,.28,.24,.33,M.stone,x,.22,front+.70,'porch-stone-pier-foot');
  bar(T,p,[x,.34,front+.70],[x,2.55,front+.70],.11,M.wood,'living-entry-porch-post');
  bar(T,p,[x,2.43,front+.72],[side*.67,2.94,front+.72],.08,M.wood,'porch-real-curved-knee');
 }
 const awning=box(T,p,2.74,.17,1.17,carp?M.roof:M.wood,0,2.96,front+.54,'sheltered-door-hood');awning.rotation.x=-.07;
 box(T,p,2.83,.09,.24,M.trim,0,3.01,front+1.08,'carved-porch-fascia');
 // Roof dormers at meaningful building heights make a recognisable uneven skyline.
 if(!low){
  const count=carp?1:2;
  for(let i=0;i<count;i++){
   const x=count===1?.19:(i===0?-.86:.86),u=Math.abs(x)/(width*.5+.38),y=height+.33+rise*(1-u)+.16;
   const z=front*.33+(i%2)*.23;
   const lantern=box(T,p,.67,.74,.44,M.plaster,x,y+.30,z,'dormer-projected-masonry');
   box(T,p,.39,.42,.032,M.glass,x,y+.36,z+.247,'dormer-lit-leaded-window');
   for(const side of [-1,1])bar(T,p,[x+side*.36,y+.71,z-.3],[x,y+1.06,z-.3],.052,M.wood,'dormer-gable-frame');
   const d0=box(T,p,.61,.12,.69,M.roof,x-.17,y+.89,z,'small-dormer-slate-slope');d0.rotation.z=.54;
   const d1=box(T,p,.61,.12,.69,M.roof,x+.17,y+.89,z,'small-dormer-slate-slope');d1.rotation.z=-.54;
   bar(T,p,[x,y+1.04,z-.36],[x,y+1.04,z+.39],.065,M.trim,'dormer-carved-ridge');
  }
 }
 // Hand-set stone bond and lived-in water streaks have the same layout across reloads.
 for(let i=0;i<(low?7:18);i++){
  const side=i%2?-1:1;
  const x=side*(width*.5-.28),z=-depth*.42+(i/18)*depth*.84;
  const y=.62+noise(seed,i+1)*(height-.65);
  const s=box(T,p,.09,.12+.12*noise(i,seed),.26+.25*noise(seed,i+14),M.trim,x,y,z,'weather-eaten-stone-course');s.rotation.y=noise(seed,i+31)*.05;
 }
 // Chimney soot is localized where a flue exists; no arbitrary scenery spamming.
 if(!low){
  const cx=width*.31,cz=depth*.05,cy=height+rise*.65;
  for(let i=0;i<4;i++){
   const x=cx-.28+i*.15;
   box(T,p,.09,.08,.03,M.deep,x,cy+.21+(i%2)*.09,cz+.34,'soot-stained-chimney-brick');
  }
  for(const side of [-1,1]){
   // Rain gutter and projecting downpipe follow the real front eave.
   bar(T,p,[side*(width*.5+.39),wall+.01,-depth*.52],[side*(width*.5+.39),wall+.01,depth*.52],.058,M.metal,'continuous-rain-gutter');
   bar(T,p,[side*(width*.5+.39),wall+.01,front-.1],[side*(width*.5+.37),.36,front-.1],.034,M.metal,'rainwater-downpipe');
  }
 }
 // Only wet/temperate settlements are colonised; ivy hugs a wall corner rather
 // than becoming a random floating globe. Ashlands have almost no green shoots.
 if(wet||tended||esoteric){
  const vines=low?1:3;
  for(let side of [-1,1])for(let b=0;b<vines;b++){
   let x=side*(width*.45-b*.13),y=.23,z=front+.13;
   for(let j=0;j<(low?4:8);j++){
    const xx=x+Math.sin(j*.77+b+seed)*.10,yy=.47+j*.34,zz=z+.035;
    bar(T,p,[x,y,z],[xx,yy,zz],.017,M.wood,'wall-fixed-ivy-vein');
    if(j%2===0){const leaf=gem(T,p,new T.IcosahedronGeometry(.13,0),j%4?M.leaf:M.leafBright,xx+side*.08,yy,zz,.70,'leaf-on-structural-vine');leaf.rotation.z=side*.32;}
    x=xx;y=yy;z=zz;
   }
  }
 }
 // A craft building reads differently from a home even in silhouette.
 if(carp){
  for(let s of [-1,1])bar(T,p,[s*1.51,2.95,front+1.1],[s*2.3,2.44,front+2.16],.073,M.wood,'workshop-lean-to-bracing');
  const sideRoof=box(T,p,3.1,.13,1.6,M.roof,1.83,2.47,front+1.51,'raised-workshop-side-awning');sideRoof.rotation.z=-.15;
  for(let i=0;i<3;i++)box(T,p,.55,.48,.56,M.wood,width*.51+.4,.29,-depth*.32+i*.9,'purposeful-wooden-fuel-crate');
 }else if(tended&&!low){
  // Window herb boxes, no obstruction of the entrance.
  for(const sign of [-1,1]){
   const x=sign*width*.32,z=front+.28;
   box(T,p,.91,.16,.29,M.wood,x,height*.51-.22,z,'carved-window-herb-box');
   for(let i=0;i<4;i++)bar(T,p,[x-.29+i*.19,height*.51-.13,z],[x-.3+i*.19,height*.51+.1+noise(seed,i)*.13,z],.028,M.leaf,'growing-herb-sprig');
  }
 }
 if(industrial&&!low){
  for(let i=0;i<3;i++){
   const x=-width*.43+i*.26,z=front+.16;
   box(T,p,.18,.09,.24,M.metal,x,1.10+i*.23,z,'furnace-vent-and-heat-wear');
  }
 }
 if(esoteric&&!low){
  const sigil=gem(T,p,new T.TorusGeometry(.38,.03,7,30),M.trim,0,top+.18,0,.85,'sky-engine-roof-finial');sigil.rotation.x=.46;
 }
}
/** Complex skylines are composed of structural rings and cantilevers, not one cone. */
export function dressTower(T,p,M,{height=7,seed=1,quality='high',region='clay'}={}){
 const low=quality==='low'||quality==='battery',n=low?8:16;
 for(let i=0;i<n;i++){
  const a=i*TAU/n,x=Math.cos(a)*1.61,z=Math.sin(a)*1.61,y=.6+(i%4)*1.5;
  const stone=box(T,p,.40,.13,.12,i%3?M.trim:M.stone,x,y,z,'radially-coursed-tower-masonry');stone.rotation.y=-a;
 }
 for(let layer=0;layer<(low?1:2);layer++){
  const y=height*.65+layer*.6;
  const ring=new T.Mesh(new T.TorusGeometry(1.72,.074,7,26),M.trim);ring.rotation.x=Math.PI*.5;ring.position.y=y;ring.name='cantilevered-tower-stringcourse';p.add(ring);
 }
 for(let i=0;i<(low?4:8);i++){
  const a=i*TAU/(low?4:8),x=Math.cos(a)*1.73,z=Math.sin(a)*1.73;
  bar(T,p,[x,.4,z],[x*1.15,2.4,z*1.15],.11,M.stone,'sloping-exterior-tower-buttress');
 }
 if(region==='aether'){
  const ring=new T.Mesh(new T.TorusGeometry(1.93,.052,8,32),M.glow);ring.position.y=height+2.9;ring.rotation.x=.7;ring.name='operating-sky-clock-halo';ring.userData.reactive=true;p.add(ring);
 }
}
/** Distinct non-rectangular dungeon masonry: segmented ribs, relief voussoirs and
 * floor erosion tied to mechanisms. Decorative wall relief never crosses exits.
 */
export function dressDungeon(T,p,M,room,{width=10,depth=12,height=5.8,quality='high',region='ash'}={}){
 const low=quality==='low'||quality==='battery';const n=low?5:11;
 for(const side of [-1,1]){
  // Surviving cave/choir arch segments with angular stone blocks instead of
  // a slab ceiling that would obscure the player's third-person view.
  for(const rz of [-depth*.30,0,depth*.30])for(let j=0;j<n;j++){
   const phi=j/n*Math.PI*.44;
   const r=width*.5-.50,x=side*(r*Math.cos(phi)),y=height*.75+Math.sin(phi)*2.00;
   const stone=box(T,p,.17,.19,.27,j%3?M.stone:M.trim,x,y,rz,'vault-construction-v oussoir'.replace(' ',''));stone.rotation.z=side*phi;
  }
  for(let i=0;i<(low?6:15);i++){
   const z=-depth*.40+(i+.5)*depth*.8/(low?6:15),y=.16+Math.abs(Math.sin(i*4.23))*.38;
   const chips=box(T,p,.035,.07+.12*Math.sin(i)**2,.18,M.deep,side*(width*.5-.20),y,z,'wall-stone-eroded-grout');chips.rotation.y=.035*i;
  }
 }
 // Carved wayfinding runs alongside the passage, never a raised hazard over it.
 for(let i=0;i<(low?3:7);i++){
  const z=-depth*.36+i*depth*.72/(low?2:6);
  for(const side of [-1,1]){
   const mark=box(T,p,.23,.016,.52,room.form==='heat-channel'?M.metal:M.trim,side*2.2,.097,z,'repeated-floor-inlay-story-mark');mark.rotation.y=(i%2?-.08:.08);
  }
 }
 if(region==='water'){
  for(const side of [-1,1])for(let i=0;i<(low?2:5);i++){
   const z=-depth*.38+i*depth*.75/(low?2:4);
   gem(T,p,new T.IcosahedronGeometry(.14+(i%2)*.07,1),M.leaf,side*(width*.5-.36),.12,z,1,'base-of-wet-wall-lichen');
  }
 }
}
