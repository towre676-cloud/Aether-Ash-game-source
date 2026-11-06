import test from 'node:test';
import assert from 'node:assert/strict';
import {CORES,SUPPORTS,CREW,compileTechnique,personalTechnique,defaultHero} from '../mako.js';
import {techniqueIconSpec} from '../technique-icons.js';

test('every delivered crystal recipe maps to its real core, targeting shape, and mastery rank',()=>{
 const seen=new Set();for(const core of CORES)for(const support of SUPPORTS)for(const [ap,rank]of [[0,1],[35,2],[120,3]]){
  const tech=compileTechnique(core.id,support.id,{ap}),spec=techniqueIconSpec(tech);seen.add(spec.core);
  assert.equal(spec.core,tech.core);assert.equal(spec.coreName,core.name);assert.equal(spec.shape,tech.shape);assert.equal(spec.rank,rank);assert.match(spec.color,/^#[0-9a-f]{6}$/i);assert.ok(spec.label.includes(core.name));
 }assert.equal(seen.size,10);
});
test('purpose badges describe support behavior without mislabeling healing and protection',()=>{
 const purposes={focus:'strike',chain:'strike',burst:'strike',pierce:'strike',echo:'echo',counter:'counter',field:'field',leech:'strike',quick:'strike',break:'interrupt',link:'link',overdrive:'strike'};
 for(const [support,purpose]of Object.entries(purposes))assert.equal(techniqueIconSpec(compileTechnique('flame',support)).purpose,purpose,support);
 assert.equal(techniqueIconSpec(compileTechnique('mend')).purpose,'heal');assert.equal(techniqueIconSpec(compileTechnique('ward')).purpose,'shield');assert.equal(techniqueIconSpec(compileTechnique('gravity')).purpose,'interrupt');
 const healingEcho=techniqueIconSpec(compileTechnique('mend','echo'));assert.equal(healingEcho.purpose,'echo');assert.ok(healingEcho.purposes.includes('heal'));
 const shieldField=techniqueIconSpec(compileTechnique('ward','field'));assert.equal(shieldField.purpose,'field');assert.ok(shieldField.purposes.includes('shield'));
});
test('personal arts use their actual crystal recipe rather than the personal identifier',()=>{
 for(let id=0;id<CREW.length;id++)for(let rank=1;rank<=8;rank++){
  const hero=defaultHero(id),tech=personalTechnique(hero,rank,'Personal art'),spec=techniqueIconSpec(tech);assert.equal(spec.core,tech.core);assert.equal(spec.shape,tech.shape);assert.notEqual(spec.core,'neutral');
 }
});
test('partial craft previews and malformed metadata remain honest and bounded',()=>{
 assert.equal(techniqueIconSpec({core:'tide',support:'pierce'}).shape,'line');assert.equal(techniqueIconSpec({id:'earth:break'}).purpose,'interrupt');
 for(const input of [null,undefined,{},false,{core:'unknown',rank:Infinity},{core:'__proto__',shape:'toString'}]){const spec=techniqueIconSpec(input);assert.equal(spec.core,'neutral');assert.equal(spec.shape,'single');assert.equal(spec.rank,1);}
 assert.equal(techniqueIconSpec({core:'earth',rank:99}).rank,3);assert.equal(techniqueIconSpec({core:'earth',rank:-4}).rank,1);
 const rare=techniqueIconSpec({...compileTechnique('tide'),id:'tide:focus:rare',interrupt:true});assert.equal(rare.core,'tide');assert.equal(rare.purpose,'interrupt');
});
