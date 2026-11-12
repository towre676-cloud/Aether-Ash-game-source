import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
// Serve live-site/dist locally, then run with Playwright available to Node.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const modules=new URL('../../dist/game/engine2/',import.meta.url);
const {World}=await import(new URL('world.js',modules));
const {source}=await import(new URL('tests/opening-flow.mjs',modules));
const {ensureLivingArmory}=await import(new URL('living-armory/campaign.js',modules));
const {rollItem}=await import(new URL('living-armory/src/armory.mjs',modules));
const key='ash-aether-enhanced-v2';
const url=process.argv[2]||'http://127.0.0.1:8000/game/';
const launchOptions={
 executablePath:process.env.CHROMIUM_EXECUTABLE,
 args:JSON.parse(process.env.CHROMIUM_ARGS_JSON||'["--use-angle=swiftshader","--enable-unsafe-swiftshader"]')
};
const world=new World(source);
world.newGame({quiet:true});
Object.assign(world.state,{gold:71,cores:['flame'],supports:['focus'],cinemaSeen:[]});
Object.assign(world.state.story,{weapon:true,firstCore:true});
world.state.heroes[0].level=5;
const item=rollItem({seed:'browser-equip',level:1,forceSlot:'mainhand'});
ensureLivingArmory(world.state).snapshot.overflow.push(item);
const save=JSON.stringify({schema:'ash-aether.enhanced-save/1',world:JSON.parse(world.save())});
const browsers=[];
const errors=[];
async function setup(options,localStorage=[]){
 const browser=await chromium.launch(launchOptions);
 browsers.push(browser);
 const context=await browser.newContext({...options,storageState:{cookies:[],origins:[{origin:new URL(url).origin,localStorage}]}});
 const page=await context.newPage();
 page.on('pageerror',error=>{errors.push(error.message);console.error(error.stack)});
 page.on('console',m=>{if(m.type()==='error'&&m.text().startsWith('Error:'))console.error('CONSOLE',m.text());});
 page.setDefaultTimeout(50000);
 return {page,browser};
}
async function ready(page){
 await page.locator('#startup-status').waitFor({state:'detached',timeout:85000});
}
async function read(page){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);}
try{
 const {browser,page}=await setup({viewport:{width:1024,height:768}});
 await page.goto(url,{waitUntil:'commit',timeout:65000});await ready(page);
 assert.equal(await page.locator('#continue').isVisible(),false);
 assert.equal(await page.locator('.traveller-veil').count(),0);
 await page.locator('#play').click();
 await page.getByRole('button',{name:'Begin as Sable',exact:false}).first().click();
 await page.waitForFunction(k=>localStorage.getItem(k),key);
 assert.equal((await read(page)).world.chronicle.originId,'sable-reed');
 await page.reload({waitUntil:'commit',timeout:65000});await ready(page);
 assert.equal(await page.locator('#continue').evaluate(el=>document.activeElement===el),true);
 await page.keyboard.press('Enter');
 await page.locator('#opening').waitFor({state:'hidden'});
 assert.equal((await read(page)).world.chronicle.originId,'sable-reed');
 assert.equal(await page.locator('.traveller-veil').count(),0);
 console.log('PASS first journey checkpoint survives reload during prologue, native Enter resumes directly');
 await browser.close();

 const desktop=await setup({viewport:{width:1024,height:768}},[{name:key,value:save}]);
 const p=desktop.page;
 await p.goto(url,{waitUntil:'commit',timeout:65000});await ready(p);
 await p.locator('#continue').click();
 assert.equal((await read(p)).world.gold,71);
 await p.keyboard.press('Enter');
 await p.locator('#equip-mako').click();
 await p.getByRole('button',{name:'Equip '+item.name,exact:true}).click();
 assert.equal((await read(p)).world.livingArmory.gearByHero[0].mainhand.id,item.id);
 await p.getByRole('button',{name:'Back to main menu'}).click();
 await p.locator('#skill-grid-button').focus();
 await p.keyboard.press('Enter');
 const growth=p.locator('.crew-growth-choice').first();
 assert.ok(await growth.isVisible());
 const before=(await read(p)).world.skillGrid;
 await growth.focus();await p.keyboard.press('Enter');
 assert.notDeepEqual((await read(p)).world.skillGrid,before);
 await p.getByRole('button',{name:'Back to main menu'}).click();
 await p.getByText('Field tools & equipment',{exact:true}).click();
 await p.getByRole('button',{name:'Practice skirmish',exact:true}).click();
 await p.locator('#commands').waitFor({state:'visible'});
 assert.ok((await read(p)).battle?.enemies.length);
 const pre=await read(p);
 console.log('PASS direct mouse equip and keyboard upgrade; new practice encounter saved');
 await p.reload({waitUntil:'commit',timeout:65000});await ready(p);
 await p.locator('#continue').click();
 await p.locator('#commands').waitFor({state:'visible'});
 assert.deepEqual((await read(p)).battle.enemies.map(e=>e.id),pre.battle.enemies.map(e=>e.id));
 assert.equal((await read(p)).world.gold,71);
 const desktopAttack=await p.locator('#cmd-attack').boundingBox(),desktopGuard=await p.locator('#cmd-guard').boundingBox();
 assert.ok(desktopAttack.x>desktopGuard.x);
 const encounter=await read(p);
 console.log('PASS mouse equip, keyboard skill upgrade, and reload of a real practice encounter');
 await desktop.browser.close();

 const mobile=await setup({viewport:{width:390,height:844},hasTouch:true,isMobile:true},[
  {name:key,value:'{truncated'},
  {name:'ash-aether-journey-hero-0',value:JSON.stringify({version:1,hero:0,savedAt:Date.now(),value:encounter})}
 ]);
 const m=mobile.page;
 await m.goto(url,{waitUntil:'commit',timeout:65000});await ready(m);
 assert.match(await m.locator('#load-status').textContent(),/Found a saved traveller/);
 await m.locator('#continue').tap();
 await m.locator('#commands').waitFor({state:'visible'});
 const attack=await m.locator('#cmd-attack').boundingBox(),guard=await m.locator('#cmd-guard').boundingBox();
 assert.ok(attack.x>=guard.x&&attack.x+attack.width>=345&&attack.height>=44,JSON.stringify({attack,guard}));
 await m.locator('#cmd-attack').tap();
 await m.waitForFunction(()=>document.querySelector('#screen').dataset.combatOrder||document.querySelector('#notice').textContent.includes('Attack'),null,{timeout:10000});
 assert.equal(await m.evaluate(k=>Object.keys(localStorage).some(name=>name.startsWith(k+'-origin-archive-')&&localStorage.getItem(name)==='{truncated'),key),true);
 console.log('PASS touch Continue recovers traveller and preserves malformed primary, right-side Attack accepts tap',attack);
 await mobile.browser.close();
 assert.deepEqual(errors,[]);
}finally{await Promise.all(browsers.map(browser=>browser.close()));}
