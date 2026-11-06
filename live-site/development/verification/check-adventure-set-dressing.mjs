#!/usr/bin/env node
/** Exact authored-scene geometry and native-state evidence; not a GPU benchmark. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {World} from '../../dist/game/engine2/world.js';
import {Geometry} from '../../dist/game/engine2/cistern-renderer.js';
import {adventureSetDressingPlan,appendAdventureSetDressing,appendAdventureSetDynamics} from '../../dist/game/engine2/adventure-set-dressing.js';
const w=new World(JSON.parse(readFileSync(new URL('../../dist/game/engine2/world.json',import.meta.url))));w.newGame({quiet:true});
const report={schema:'ash-aether.set-dressing-coverage/1',release:'5.31',checked_at_utc:new Date().toISOString(),scenes:[],families:{},raised_floor_intrusions:0,passed:false};
for(const[id,s]of w.scenes){w.state.scene=id;const before=w.save(),p=adventureSetDressingPlan(w),m=new Geometry(),d=new Geometry(),g=new Geometry();appendAdventureSetDressing(m,{world:w});appendAdventureSetDynamics(d,g,{world:w,time:2.0});const a=m.data();
 for(const mesh of[m,d,g])for(const value of mesh.data())assert.ok(Number.isFinite(value),s.key+' finite');
 for(let i=0;i<a.length;i+=12)if(a[i+1]>.12&&s.floor[Math.floor(a[i+2])]?.[Math.floor(a[i])]==='.')report.raised_floor_intrusions++;
 assert.equal(before,w.save(),s.key+' native save preserved');if(p.family)report.families[p.family]=(report.families[p.family]||0)+1;
 report.scenes.push({scene:id,key:s.key,family:p.family,interior:p.interior,static_triangles:a.length/36,dynamic_triangles:d.data().length/36,glow_triangles:g.data().length/36,closed_landscape_sites:p.sites.length,closed_bank_segments:p.banks.length,existing_furniture_details:p.furniture.length,mounted_wall_details:p.wallDetails.length,save_unchanged:true});
}
assert.equal(report.raised_floor_intrusions,0);report.passed=true;const path=new URL('../../docs/verification/adventure-set-dressing-5.31.json',import.meta.url);writeFileSync(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,scenes:report.scenes.length,covered:report.scenes.filter(s=>s.family).length,families:Object.keys(report.families).length,max_triangles:Math.max(...report.scenes.map(s=>s.static_triangles)),report:path.pathname}));
