import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const page=fs.readFileSync(path.join(root,'index.html'),'utf8');
const lab=fs.readFileSync(path.join(root,'labs/living-world.html'),'utf8');
const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');
const fail=[];
const needs=(cond,msg)=>{if(!cond)fail.push(msg);};
needs(/<main\b[^>]*id="main"/i.test(page),'Homepage has no main landmark');
needs(/class="skip"/.test(page),'Homepage lacks skip navigation');
needs(/prefers-reduced-motion/.test(page),'Homepage lacks reduced-motion support');
needs(/<nav\b[^>]*aria-label=/.test(page),'Homepage lacks labeled navigation');
needs(/<meta name="description"/.test(page),'Homepage lacks description');
needs(lab.includes('<!doctype html>')&&lab.includes('</html>'),'Living World HTML is incomplete');
needs(/Walk forward/.test(lab)&&/Trample grass/.test(lab),'Missing lab controls');
needs(/Export save JSON/.test(lab)&&/Import save JSON/.test(lab),'Missing lab save controls');
needs(!/TODO_LINK|INSERT_URL|example\.com/.test(page+readme),'A placeholder link remains');
const paths=['index.html','assets/answering-city-vista.webp','assets/living-meadow.webp','assets/living-armory-v3.webp','labs/living-world.html','docs/GAME.md','docs/DEVELOPMENT.md','docs/ACCESSIBILITY.md','docs/PROVENANCE.md'];
for(const p of paths)needs(fs.existsSync(path.join(root,p)),'Missing '+p);
for(const match of page.matchAll(/\b(?:href|src)="([^"]+)"/g)){
  const href=match[1];
  if(href.startsWith('#')){needs(page.includes('id="'+href.slice(1)+'"'),'Missing internal anchor '+href);continue;}
  if(/^(https?:|mailto:|data:)/.test(href))continue;
  const file=href.split('#')[0].split('?')[0];
  needs(fs.existsSync(path.join(root,file)),'Missing homepage resource '+href);
}
needs(/<figure class="scene">/.test(page),'Hero must show the captured prototype instead of decorative illustration');
needs(!page.includes('assets/cover.svg')&&!readme.includes('assets/cover.svg'),'Superseded cover still in use');
needs(page.includes('id="captures"'),'Missing real-captures gallery');
if(fail.length){console.error('Site check FAIL:\n'+fail.join('\n'));process.exit(1);}
console.log('Site check OK: accessibility landmarks, internal links, lab integrity, expected resources.');
