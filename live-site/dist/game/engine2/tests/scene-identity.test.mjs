import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sceneInteriorIdentity,isInteriorScene} from '../scene-identity.js';
import {surfaceSpec} from '../room-surfaces.js';
import {World} from '../world.js';
const source=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url)));
test('the two Names Archive wings are indoor archive rooms, independent of theme',()=>{
 for(const key of ['east','west']){const s=source.scenes.find(s=>s.chapter===5&&s.key===key);assert.equal(sceneInteriorIdentity(s),'archive');assert.equal(isInteriorScene(s),true);}
 assert.equal(isInteriorScene({key:'east',chapter:1}),false);
 assert.equal(isInteriorScene({key:'forest',chapter:5}),false);
 assert.equal(isInteriorScene({key:'archive',biome:{style:'ruins'}}),false);
});
test('archive rendering has furnished architectural rooms and keeps story patrols',()=>{
 const world=new World(source);
 for(const location of [212,213]){const s=world.scenes.get(location);assert.equal(s.household.kind,'archive');assert.ok(s.household.furnishings.length);assert.ok(s.objects.some(o=>o.type==='patrol'));assert.ok(s.architecture?.campaign);}
});
test('floor materials use human-scale boards and distinguish civic stone',()=>{
 assert.ok(surfaceSpec('archive').height<20);assert.equal(surfaceSpec('clinic').kind,'stone');assert.equal(surfaceSpec('home').kind,'wood');assert.notDeepEqual(surfaceSpec('clinic').palette,surfaceSpec('chapel').palette);
});
