import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import {CONTENT,CAP,createCharacter,stats,grantXp,xpNeeded,totalPoints,availablePoints,skillsFor,learn,equip,itemDefinition,validateCharacter,damage} from '../../game/shared/rules.js';
import {effects} from '../../pixelfx/src/fx/index.js';
const make=(id='warrior')=>createCharacter(randomUUID(),'owner','Người chơi',id,randomUUID);
const plan=JSON.parse(fs.readFileSync('docs/game-design/balance-draft.json'));
const rejects=(fn,code)=>assert.throws(fn,e=>e.code===code);
test('content: full design IDs, 10 contiguous maps, 18 skills and real FX',()=>{
 assert.equal(plan.classes.length,3);assert.equal(plan.skills.length,18);assert.equal(plan.maps.length,10);
 for(const collection of [plan.classes,plan.skills,plan.maps])assert.equal(new Set(collection.map(x=>x.id)).size,collection.length);
 let next=1;for(const m of plan.maps){assert.equal(m.minLevel,next);next=m.maxLevel+1;for(const id of m.environmentFx)assert.ok(effects[id],id);}assert.equal(next,51);
 for(const s of plan.skills){assert.ok(plan.classes.some(c=>c.id===s.classId));assert.equal(s.rankLevelGates.length,5);for(const l of ['vi','en'])assert.ok(s.name[l]);for(const id of s.fxIds)assert.ok(effects[id],id);}
 assert.equal(CAP,5);assert.equal(CONTENT.skills.length,6);assert.equal(Object.keys(effects).length,244);
});
test('locale keys and interpolation placeholders match; errors have translations',()=>{
 const vi=JSON.parse(fs.readFileSync('game/locales/vi.json')),en=JSON.parse(fs.readFileSync('game/locales/en.json'));assert.deepEqual(Object.keys(vi).sort(),Object.keys(en).sort());
 for(const k of Object.keys(vi)){assert.ok(vi[k].length&&en[k].length,k);assert.deepEqual((vi[k].match(/\{\w+\}/g)??[]).sort(),(en[k].match(/\{\w+\}/g)??[]).sort(),k);}
 for(const file of ['game/shared/rules.js','game/shared/engine.js','server/store.js','server/sessions.js','server/app.js'])for(const [,code] of fs.readFileSync(file,'utf8').matchAll(/(?:requireGame\([^;]*?|new GameError\()'([A-Z_]+)'/g))if(!['GET','LICENSE'].includes(code))assert.ok(vi['error.'+code],code);
});
test('XP boundary, carry, multi-level and release cap',()=>{const c=make();grantXp(c,xpNeeded(1)-1);assert.equal(c.level,1);grantXp(c,2);assert.equal(c.level,2);assert.equal(c.xp,1);grantXp(c,100000);assert.equal(c.level,5);assert.equal(c.xp,0);grantXp(c,999999);assert.equal(c.xp,0);assert.equal(totalPoints(5),3);rejects(()=>grantXp(c,Infinity),'INVALID_XP');});
for(const id of ['warrior','mage','archer']){
 test(id+': equipment budgets, gates, class validation and no stat accumulation',()=>{
  const c=make(id);for(const slot of ['helmet','gloves','offhand']){const i={...itemDefinition(id,slot),id:randomUUID()};c.inventory.push(i);rejects(()=>equip(c,i.id),'LEVEL_REQUIRED');}
  grantXp(c,100000);for(const i of c.inventory)equip(c,i.id);const s=stats(c);const cls=CONTENT.classes.find(c=>c.id===id);assert.ok(Math.abs(s.armor-cls.base.armor-cls.perLevel.armor*4-Math.round(10*cls.armorMultiplier))<1e-9);assert.equal(s.hp-cls.base.hp-cls.perLevel.hp*4,Math.round(20*cls.gearHpMultiplier));for(let k=0;k<20;k++)for(const i of c.inventory)equip(c,i.id);assert.deepEqual(stats(c),s);
  const wrong={...itemDefinition(id==='mage'?'archer':'mage','weapon'),id:randomUUID()};c.inventory.push(wrong);rejects(()=>equip(c,wrong.id),'WRONG_CLASS');assert.equal(validateCharacter(c),c);
 });
 test(id+': skill level 5 unlocks; starter rank 2 remains gated at 6',()=>{const c=make(id),[a,b]=skillsFor(id);rejects(()=>learn(c,a.id),'LEVEL_REQUIRED');rejects(()=>learn(c,b.id),'LEVEL_REQUIRED');grantXp(c,100000);learn(c,b.id);assert.equal(c.skills[b.id],1);assert.equal(availablePoints(c),1);rejects(()=>learn(c,a.id),'LEVEL_REQUIRED');rejects(()=>learn(c,b.id),'LEVEL_REQUIRED');});
}
test('reject invalid character identity, numbers and save version',()=>{rejects(()=>make('hacker'),'INVALID_CLASS');rejects(()=>createCharacter('1','o','<script>','mage',randomUUID),'INVALID_NAME');for(const change of [{hp:NaN},{mp:Infinity},{gold:-1},{xp:999999},{saveVersion:2},{level:6}])rejects(()=>validateCharacter({...make(),...change}),'INVALID_SAVE');assert.equal(damage(100,100),50);assert.equal(damage(1,10000),1);});
test('XP and skill point formulas agree with all 50 progression rows',()=>{const rows=fs.readFileSync('docs/game-design/progression-1-50.csv','utf8').trim().split(/\r?\n/).slice(1);assert.equal(rows.length,50);for(const row of rows){const fields=row.split(','),lv=Number(fields[0]);if(lv<50)assert.equal(xpNeeded(lv),Number(fields[1]),'XP '+lv);assert.equal(totalPoints(lv),Number(fields[22]),'points '+lv);}});
test('content validator rejects broken IDs, references and map boundaries',async()=>{const {validateContent}=await import('../../scripts/validate-content.mjs');for(const corrupt of [p=>p.classes.push(p.classes[0]),p=>p.maps[1].minLevel=999,p=>p.skills[0].fxIds=['missing/fx'],p=>p.skills[0].classId='invalid']){const p=structuredClone(plan);corrupt(p);assert.throws(()=>validateContent(p));}});
