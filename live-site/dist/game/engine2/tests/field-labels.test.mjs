import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldLabelSource,prioritizeFieldLabels,portalLabelFocused} from '../field-labels.js';
import {layoutFieldLabels} from '../label-layout.js';

const row=(text,kind,distance,extra={})=>({text,kind,distance,x:100,y:100,w:90,sourceKey:text,...extra});
test('a crowded narrow field retains its current interaction and approaching threat',()=>{
 const input=[row('Refuge','ambient',.3),row('Stores','objective',1),row('Story','story',1),row('Door','exit',2),row('Repair','interaction',1.2),row('Following you','threat',2)];
 const before=JSON.stringify(input),selected=prioritizeFieldLabels(input,{width:390});
 assert.deepEqual(selected.map(r=>r.text),['Following you','Repair']);assert.equal(JSON.stringify(input),before);
});
test('desktop admits one extra useful category and collapses duplicate sources',()=>{
 const selected=prioritizeFieldLabels([row('Repair','interaction',1),row('Repair again','ambient',.5,{sourceKey:'Repair'}),row('Alert','threat',1),row('Exit','exit',2),row('Other exit','exit',2.5)],{width:1200});
 assert.deepEqual(selected.map(r=>r.text),['Alert','Repair','Exit']);
});
test('far, malformed and empty labels cannot consume attention',()=>{
 const selected=prioritizeFieldLabels([row('Far story','story',9),row('Far door','exit',8),row('','interaction',0),row('Bad','threat',0,{x:NaN}),row('Nearby','ambient',1)]);
 assert.deepEqual(selected.map(r=>r.text),['Nearby']);
});
test('small distance changes retain a secondary label while the actual interaction remains authoritative',()=>{
 const selected=prioritizeFieldLabels([row('Door A','exit',2),row('Door B','exit',2.1),row('New focus','interaction',2)],{previous:['Door B']});
 assert.deepEqual(selected.map(r=>r.text),['New focus','Door B']);
});
test('sources use actual foot distance and do not mutate the object or state',()=>{
 const object=Object.freeze({type:'affordance',affordanceId:'brace',xy:Object.freeze([9,9])}),state=Object.freeze({x:10,y:10});
 const source=fieldLabelSource(object,11,10,state,{nearest:true});assert.equal(source.kind,'interaction');assert.equal(source.distance,1);assert.equal(source.sourceX,528);
});
test('field labels avoid the invitation card and disappear if no safe text space remains',()=>{
 const bounds={x:0,y:0,w:320,h:230},obstacles=[{x:160,y:0,w:160,h:180}];
 const selected=layoutFieldLabels([row('Current focus','interaction',0,{x:190,y:100})],{bounds,obstacles});
 assert.equal(selected.length,1);assert.ok(selected[0].x+selected[0].w<=160||selected[0].y>=180);
 assert.deepEqual(layoutFieldLabels([row('Blocked','interaction',0)],{bounds,obstacles:[bounds]}),[]);
});
test('a cloned building entrance retains its current-interaction identity through the exterior plan',()=>{
 const door={type:'portal',xy:[10,10],to:'home',buildingEntrance:{id:'entrance:5:50:10-10'}},plan={id:'art-plan',exit:structuredClone(door)},nearest={o:structuredClone(door),d:.5},state={x:10.5,y:11};
 assert.equal(portalLabelFocused(plan,nearest,state),true);
 const drawn=fieldLabelSource(plan.exit,10.5,10.5,state,{nearest:portalLabelFocused(plan,nearest,state)}),active=fieldLabelSource(nearest.o,10.5,10.5,state,{nearest:true});
 assert.equal(drawn.kind,'interaction');assert.equal(drawn.sourceKey,active.sourceKey);
 assert.equal(prioritizeFieldLabels([{...drawn,text:'Home',x:10,y:10},{...active,text:'Enter home',x:10,y:10}]).length,1);
});
test('a scene door gets focus only when no usable closer world interaction owns confirm',()=>{
 const door={to:'road',xy:[10,10]},state={x:10.5,y:11};
 assert.equal(portalLabelFocused(door,{o:{type:'npc'},d:1.8},state),false);
 assert.equal(portalLabelFocused(door,{o:{type:'npc'},d:3},state),true);
 assert.equal(portalLabelFocused(door,null,{x:20,y:20}),false);
});
