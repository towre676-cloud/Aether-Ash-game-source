import test from 'node:test';import assert from 'node:assert/strict';import {presentationState,silhouetteCue} from '../src/character-presentation.mjs';
test('hurt expression overrides normal scene',()=>assert.equal(presentationState({hp:.1,combat:true}).expression,'hurt'));
test('lead silhouette is stronger',()=>assert.ok(silhouetteCue({role:'lead'}).outlineStrength>silhouetteCue({role:'companion'}).outlineStrength));
