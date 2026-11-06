import {CANOPY_VARIATION_FILE,CANOPY_VARIATIONS,canopyVariationSpec,drawCanopyVariation} from '../environment-canopies-v19.js?v=5.18.1';
import {INTERIOR_ART_FILES,INTERIOR_WALL_PIECES,interiorWallPieceSpec,drawInteriorWallPiece} from '../environment-interiors-v19.js?v=5.18.1';
import {ARCHITECTURE_V19_FILES,FACADE_BAYS,ROOFCRAFT_DETAILS,architecturePieceSpec,drawArchitecturePiece} from '../environment-architecture-v19.js?v=5.18.1';
import {AUTHORED_ART_FILES,drawAuthoredMotion} from '../authored-art.js?v=5.21.0';
const $=id=>document.getElementById(id),assets={},failed=new Set(),cards=[];
let detail=true;
const families={
 canopies:{title:'Age & exposure',kicker:'Rooted in the same landscape',description:'Open crowns, hollow trunks, exposed roots, broken boughs and wind-shaped branches complement the younger trees. Each keeps its measured root anchor; the two upland forms share one wind direction.',pieces:CANOPY_VARIATIONS,scenes:[[50001,'Cinderfall'],[19,'Woodland'],[2025,'Mangrove'],[2035,'Frost country'],[2050,'Storm country']],mode:'Standard + Compatibility'},
 home:{title:'Limewash, timber & repair',kicker:'Homes that have been lived in',description:'Warm plaster, careful timber repairs and shallow wall recesses sit within the existing home walls. The windows, hearth and doorway retain their own space.',pieces:INTERIOR_WALL_PIECES.filter(p=>p.family==='home'),scenes:[[2,'Family home'],[12,'The inn']],mode:'Standard + Compatibility'},
 workshop:{title:'Clay, joinery & craft',kicker:'An architectural setting for work',description:'Clay plaster, worn joinery and restrained metal fittings give workshops their own material language. Details support the work areas without adding objects to the floor.',pieces:INTERIOR_WALL_PIECES.filter(p=>p.family==='workshop'),scenes:[[4,'Instrumentworks'],[61,'Carpenter']],mode:'Standard + Compatibility'},
 civic:{title:'Pale plaster & cool stone',kicker:'Rooms for care and keeping',description:'Quiet stonework, pale plaster and carefully recessed details bring a different character to clinics, archives and civic rooms. Existing daylight and working surfaces remain the focal points.',pieces:INTERIOR_WALL_PIECES.filter(p=>p.family==='civic'),scenes:[[50,'Clinic'],[13,'Guild']],mode:'Standard + Compatibility'},
 facades:{title:'A window into the building',kicker:'Distinctive bays for familiar frontages',description:'Purpose-specific window bays combine frame, sill and surrounding wall craft. They fit the actual exposed frontage around each established window, with room left for the real entrance.',pieces:FACADE_BAYS,scenes:[[5,'Cinderfall buildings'],[50001,'Earlier Cinderfall']],mode:'Standard building detail'},
 roofcraft:{title:'Roofs & wall craft',kicker:'The small work that completes a silhouette',description:'Chimneys, vents, gable work and wall details attach to the building’s existing roof and frontage. Their placement follows the actual architecture.',pieces:ROOFCRAFT_DETAILS,scenes:[[5,'Cinderfall buildings'],[50001,'Earlier Cinderfall']],mode:'Standard building detail'}
};
const fileMap={environmentCanopyVariations:CANOPY_VARIATION_FILE,...INTERIOR_ART_FILES,...ARCHITECTURE_V19_FILES,sableMotion:AUTHORED_ART_FILES.sableMotion};
$('total').textContent=CANOPY_VARIATIONS.length+INTERIOR_WALL_PIECES.length+FACADE_BAYS.length+ROOFCRAFT_DETAILS.length;
function draw(card){const {canvas,piece,family}=card,c=canvas.getContext('2d');c.clearRect(0,0,360,290);c.textAlign='left';const isTree=family==='canopies',small=family==='facades'||family==='roofcraft',base=244;
 let scale=detail?(small?2.3:!isTree?1.7:1):1;
 c.save();c.translate(180,base);c.scale(scale,scale);
 const x=isTree?-15:0,y=0;
 if(!$('checker').checked){c.fillStyle='#b7c5ab35';c.beginPath();c.ellipse(x,4,isTree?94:65,12,0,0,Math.PI*2);c.fill();}
 let ok=false;
 if(isTree)ok=drawCanopyVariation(c,assets.environmentCanopyVariations,canopyVariationSpec(piece.id),x,y);
 else if(small)ok=drawArchitecturePiece(c,assets,architecturePieceSpec(piece.id,{width:family==='facades'?50:45,height:family==='facades'?51:45}),x,y);
 else ok=drawInteriorWallPiece(c,assets[piece.asset],interiorWallPieceSpec(piece.id,{width:160,height:76}),x,y);
 if($('traveller').checked){const tx=isTree?133:small?56:82;drawAuthoredMotion(c,assets,{atlas:'sable',frame:0},tx,0,60);}
 c.restore();
 if(!ok){c.fillStyle='#d8c59e';c.font='13px system-ui';c.textAlign='center';c.fillText(failed.has(piece.asset||'environmentCanopyVariations')?'Artwork unavailable':'Loading artwork…',180,125);}
 c.strokeStyle=$('checker').checked?'#284740':'#9aaf9566';c.lineWidth=1;c.beginPath();c.moveTo(17,270);c.lineTo(17+48*scale,270);c.moveTo(17,266);c.lineTo(17,274);c.moveTo(17+48*scale,266);c.lineTo(17+48*scale,274);c.stroke();c.fillStyle=$('checker').checked?'#284740':'#a9bcae';c.font='10px system-ui';c.textAlign='left';c.fillText('48 world px',26+48*scale,274);
 canvas.dataset.ready=String(ok);canvas.dataset.piece=piece.id;
}
function redraw(){document.body.classList.toggle('checker',$('checker').checked);for(const card of cards)draw(card);const loaded=cards.filter(c=>c.canvas.dataset.ready==='true').length,f=families[$('family').value];$('status').textContent=loaded+' / '+cards.length+' pieces ready · '+f.mode+' · '+(detail?'Enlarged artwork detail':$('traveller').checked?'In-world dimensions with 60 px traveller':'In-world dimensions');$('status').classList.toggle('warning',loaded<cards.length&&failed.size>0);}
function show(){const key=$('family').value,f=families[key];cards.length=0;$('grid').replaceChildren();$('family-title').textContent=f.title;$('family-kicker').textContent=f.kicker;$('family-description').textContent=f.description;$('scene-links').replaceChildren();
 for(const [id,label]of f.scenes){const a=document.createElement('a');a.href='./composition.html?v=5.41'+id;a.textContent=label;$('scene-links').append(a);}
 for(const piece of f.pieces){const article=document.createElement('article');article.className='card';const stage=document.createElement('div');stage.className='stage';const canvas=document.createElement('canvas');canvas.width=360;canvas.height=290;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',piece.label+' painted environment artwork');stage.append(canvas);const caption=document.createElement('div');caption.className='caption';const h=document.createElement('h3');h.textContent=piece.label;const p=document.createElement('p');p.textContent=key==='canopies'?'An existing scenic tree site':key==='facades'?'Fitted to an existing window bay':key==='roofcraft'?'Fitted to existing architecture':'Fitted to the actual room wall';caption.append(h,p);article.append(stage,caption);$('grid').append(article);cards.push({canvas,piece,family:key});}
 const url=new URL(location.href);url.searchParams.set('family',key);history.replaceState(null,'',url);redraw();
}
function setDetail(value){detail=value;$('detail').setAttribute('aria-pressed',String(value));$('reference').setAttribute('aria-pressed',String(!value));redraw();}
$('family').onchange=show;$('checker').onchange=redraw;$('traveller').onchange=redraw;$('detail').onclick=()=>setDetail(true);$('reference').onclick=()=>setDetail(false);
const requested=new URL(location.href).searchParams.get('family');if(Object.hasOwn(families,requested))$('family').value=requested;show();
await Promise.all(Object.entries(fileMap).map(([name,file])=>new Promise(resolve=>{const image=new Image();image.onload=()=>{assets[name]=image;redraw();resolve();};image.onerror=()=>{failed.add(name);redraw();resolve();};image.src=new URL('../art/'+file,import.meta.url).href;})));
