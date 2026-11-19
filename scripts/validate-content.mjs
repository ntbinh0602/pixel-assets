import assert from 'node:assert/strict';
import {effects} from '../pixelfx/src/fx/index.js';
export function validateContent(plan){
 assert.equal(plan.defaultLocale,'vi');assert.deepEqual(plan.supportedLocales,['vi','en']);assert.equal(plan.classes.length,3);assert.equal(plan.skills.length,18);assert.equal(plan.maps.length,10);
 for(const collection of [plan.classes,plan.maps,plan.skills]){assert.equal(new Set(collection.map(x=>x.id)).size,collection.length,'Duplicate IDs');for(const x of collection)for(const l of ['vi','en'])assert.ok(x.name[l],'Missing localized name: '+x.id);}
 const classes=new Set(plan.classes.map(c=>c.id));let next=1;
 for(const m of plan.maps){assert.equal(m.minLevel,next,'Map level gap/overlap');assert.ok(m.maxLevel>=m.minLevel);next=m.maxLevel+1;for(const id of m.environmentFx)assert.ok(effects[id],'Unknown FX: '+id);}assert.equal(next,51);
 for(const s of plan.skills){assert.ok(classes.has(s.classId),'Unknown class');assert.equal(s.rankLevelGates.length,s.maxRank);assert.equal(s.rankLevelGates[0],s.minLevel);for(const id of s.fxIds)assert.ok(effects[id],'Unknown FX: '+id);}
 return plan;
}
