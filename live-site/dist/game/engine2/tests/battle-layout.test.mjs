import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{battleViewport,cancelBattlePicker,battlePickerPage,battlePickerSize,battleCommandIcon,battleConsoleSide,battleThumbGutter}from'../battle-layout.js';import{viewLayout}from'../presentation.js';
test('battle camera stays inside the clear area between measured HUD and dock',()=>{for(const [w,h,hud,dock]of [[360,740,87,180],[390,844,87,180],[412,915,87,180],[844,390,76,116],[740,360,76,110],[1280,720,90,155]]){const p=battleViewport(h,hud,dock),layout=viewLayout(w,h,{battle:true,touch:true,hudHeight:hud,battleDockHeight:dock});assert.equal(layout.centerY,p.centerY);assert.ok(p.centerY>hud&&p.centerY<h-dock);assert.ok(p.visibleHeight>h*.4,`${w}x${h}`);assert.ok(p.bottom<dock+20,'no duplicate touch-control reservation');}});
test('larger options or spell lists move camera center upward without covering the reserved view',()=>{const a=battleViewport(740,85,150),b=battleViewport(740,85,220);assert.ok(b.centerY<a.centerY);assert.equal(a.visibleHeight-b.visibleHeight,70);});
test('spell menu shares the command dock and optional panels are folded away',()=>{const js=fs.readFileSync(new URL('../battle-layout.js',import.meta.url),'utf8'),css=fs.readFileSync(new URL('../battle-layout.css?v=5.6.0',import.meta.url),'utf8'),html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');assert.match(js,/commands.append\(spells\)/);assert.match(js,/createElement\('details'\)/);assert.match(js,/ResizeObserver/);assert.match(css,/#commands #spell-menu\{position:static/);assert.doesNotMatch(css,/#commands:has\(#spell-menu[^}]+\.command-grid[^}]+display:none/);assert.match(css,/battle-picker-open .battle-picker-pages/);assert.match(css,/#touch .face.*display:none/);assert.match(html,/battle-layout\.css\?v=[\d.]+/);});

test('persistent picker back uses Cancel cleanup without selecting a technique or supply',()=>{
 let selected=0,cleaned=0;const buttons=[{textContent:'Fire / Chain',click(){selected++;}},{textContent:'Tonic × 2',click(){selected++;}},{textContent:'Cancel',click(){cleaned++;}}];
 assert.equal(cancelBattlePicker({querySelectorAll:()=>buttons}),true);assert.equal(cleaned,1);assert.equal(selected,0);
 assert.equal(cancelBattlePicker({querySelectorAll:()=>buttons.slice(0,2)}),false);buttons[2].disabled=true;assert.equal(cancelBattlePicker({querySelectorAll:()=>buttons}),false);assert.equal(cleaned,1);
});

test('every action remains reachable exactly once across bounded picker pages',()=>{
 for(const total of [0,1,2,4,5,8,17,64])for(const size of [2,4,6]){const seen=[],first=battlePickerPage(total,0,size);for(let p=0;p<first.pages;p++){const range=battlePickerPage(total,p,size);assert.ok(range.end-range.start<=size);for(let n=range.start;n<range.end;n++)seen.push(n);}assert.deepEqual(seen,Array.from({length:total},(_,i)=>i));assert.equal(battlePickerPage(total,999,size).page,first.pages-1);assert.equal(battlePickerPage(total,-1,size).page,0);}
});
test('short screens and portrait touch use one row of cards while large screens can show six',()=>{assert.equal(battlePickerSize(740,360),2);assert.equal(battlePickerSize(360,740),4);assert.equal(battlePickerSize(1280,720),4);assert.equal(battlePickerSize(1440,900),6);assert.equal(battlePickerSize(390,844,{touch:true}),2);assert.equal(battlePickerSize(390,844,{touch:false}),4);assert.equal(battlePickerSize(1280,720,{touch:true}),4);});
test('all eight battle commands have distinct local vector silhouettes and unknown commands degrade cleanly',()=>{const icons=['attack','mako','personal','guard','item','retreat','field','objective'].map(id=>battleCommandIcon('cmd-'+id));assert.equal(new Set(icons).size,8);for(const icon of icons){assert.ok(icon.startsWith('data:image/svg+xml,'));const svg=decodeURIComponent(icon.split(',')[1]);assert.match(svg,/<svg/);assert.match(svg,/viewBox="0 0 24 24"/);assert.doesNotMatch(svg,/script|http[s]?:.*(?:image|href)/);}assert.equal(battleCommandIcon('future-command'),null);});

test('only short landscape reserves console width; tall viewports use the shallow bottom shelf',()=>{for(const [w,h,side]of [[1280,720,false],[1100,600,false],[1099,600,false],[844,390,true],[760,559,true],[759,390,false],[844,560,false],[390,844,false]])assert.equal(battleConsoleSide(w,h),side,w+'x'+h);});

test('the thumb gutter follows native control hit boxes including larger layout and disappears without controls',()=>{
 const normal={width:112,height:112,right:124},reset={width:88,height:32,right:100};
 assert.equal(battleThumbGutter({dockLeft:6,paddingLeft:6,stick:normal,reset}),120);
 assert.equal(battleThumbGutter({dockLeft:6,paddingLeft:6,stick:{width:160,height:160,right:172},reset}),168);
 assert.equal(battleThumbGutter({dockLeft:500,paddingLeft:6,stick:normal,reset}),0);
 assert.equal(battleThumbGutter({stick:{width:0,height:0,right:0},reset:null}),0);
});
