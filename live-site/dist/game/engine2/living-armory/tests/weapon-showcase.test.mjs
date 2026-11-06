import test from 'node:test';
import assert from 'node:assert/strict';
import {clampWeaponView,ownedWeapons,growthDeltas,mountWeaponShowcase} from '../src/weapon-showcase.mjs';
import {weaponIllustration} from '../src/art.mjs';

test('inspection stays in a readable front view and cannot lose the weapon offstage',()=>{
 assert.deepEqual(clampWeaponView({yaw:300,pitch:-200,zoom:90}),{yaw:24,pitch:-11,zoom:1.2});
 assert.deepEqual(clampWeaponView({yaw:NaN,pitch:Infinity,zoom:-3}),{yaw:0,pitch:0,zoom:1});
 assert.deepEqual(clampWeaponView(),{yaw:0,pitch:0,zoom:1});
});

test('weapon rack shows unique owned main hands, with the equipped weapon first',()=>{
 const worn={id:'worn',slot:'mainhand',itemPower:20},stored={id:'stored',slot:'mainhand',itemPower:200},armor={id:'armor',slot:'chest',itemPower:500};
 assert.deepEqual(ownedWeapons({gear:{mainhand:worn,chest:armor},placements:[{item:stored},{item:worn}],overflow:[armor,stored]}).map(i=>i.id),['worn','stored']);
 assert.deepEqual(ownedWeapons(),[]);
});

test('growth presentation preserves removed stats and exact native preview values',()=>{
 const deltas=growthDeltas({stats:{attack:30,focus:7}},{changes:{attack:5,focus:-7,ward:4,haste:0},after:{stats:{attack:35,focus:0,ward:4}}});
 assert.deepEqual(deltas,[{stat:'attack',label:'Attack',before:30,after:35,delta:5},{stat:'focus',label:'Focus',before:7,after:0,delta:-7},{stat:'ward',label:'Ward',before:0,after:4,delta:4}]);
});

test('all native main-hand forms have sharp local illustrations with unique SVG definitions',()=>{
 for(const icon of ['sword','spear','axe','hammer','bow','staff','scepter']){
  const first=weaponIllustration({icon,element:'aether'}),second=weaponIllustration({icon,element:'aether'});
  assert.match(first,/viewBox="0 0 256 400"/);assert.doesNotMatch(first,/<image|https?:|<style/);
  assert.notEqual(first.match(/id="([^"]+)-metal"/)[1],second.match(/id="([^"]+)-metal"/)[1]);
 }
});

function fixture(){
 const nodes=[],container={prepend(node){nodes.push(node);}},nav={prepend(){}};
 const element=()=>({dataset:{},listeners:{},innerHTML:'',style:{setProperty(){}},classList:{add(){},remove(){}},setAttribute(){},addEventListener(type,fn){this.listeners[type]=fn;},querySelector(){return {style:{setProperty(){}},setAttribute(){},focus(){},classList:{remove(){}}};},offsetWidth:500});
 return {nodes,document:{querySelector:selector=>selector==='.three-panels'?container:nav,createElement:element}};
}

test('the live component submits its displayed quote and never serializes the capability into markup',()=>{
 const dom=fixture(),previous=globalThis.document;globalThis.document=dom.document;
 try{
  const item={id:'owned-1',slot:'mainhand',name:'Lastlight <&>',icon:'sword',rarity:'rare',element:'ember',material:'Cindersteel',itemPower:88,level:7,upgrade:0,sockets:1,runes:[]};
  let serial=0;const calls=[];
  const game={selectedHero:0,heroes:[{id:0,name:'Sable'}],state:{character:'Sable',level:8,gear:{mainhand:item},placements:[],overflow:[]},weaponGrowthView(){const action={id:'temper',label:'Temper to +1',detail:'Raises base stats.',enabled:true,quote:`private-quote-${++serial}`,cost:{coins:25,scrap:5},changes:{attack:2},after:{stats:{attack:22},itemPower:102,upgrade:1}};return {ready:true,itemId:item.id,item,where:'mainhand',stats:{attack:20},itemPower:88,upgrade:0,maxUpgrade:8,level:7,resources:{coins:40,scrap:9},actions:[action],primaryAction:action,primaryStat:'attack'};},growWeapon(...args){calls.push(args);return {ok:true};}};
  const showcase=mountWeaponShowcase({game});showcase.update(item.id);const panel=dom.nodes[0];
  assert.match(panel.innerHTML,/Lastlight &lt;&amp;&gt;/);assert.match(panel.innerHTML,/25 credits/);assert.match(panel.innerHTML,/5 scrap/);assert.doesNotMatch(panel.innerHTML,/private-quote|data-quote/);
  const quote=`private-quote-${serial}`;
  panel.listeners.click({target:{closest:()=>({dataset:{},disabled:false,hasAttribute:name=>name==='data-weapon-grow'})}});
  assert.deepEqual(calls,[[item.id,'temper',quote]]);
  assert.ok(serial>1,'a fresh offer replaces the consumed quote');
 }finally{globalThis.document=previous;}
});

test('empty campaign presentation is honest and does not call an equipment action',()=>{
 const dom=fixture(),previous=globalThis.document;globalThis.document=dom.document;
 try{
  let actions=0;const state={gear:{},placements:[],overflow:[]};
  const game={selectedHero:0,state,weaponGrowthView:()=>({ready:false,actions:[]}),growWeapon:()=>actions++};
  mountWeaponShowcase({game}).update(null);
  assert.match(dom.nodes[0].innerHTML,/No recovered weapon yet/);assert.doesNotMatch(dom.nodes[0].innerHTML,/data-weapon-grow|weapon-illustration/);assert.equal(actions,0);assert.deepEqual(state,{gear:{},placements:[],overflow:[]});
 }finally{globalThis.document=previous;}
});
