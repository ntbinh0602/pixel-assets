import test from 'node:test';
import assert from 'node:assert/strict';
import {journey} from '../journey.mjs';
import {validateCharacter} from '../../game/shared/rules.js';
for(const id of ['warrior','mage','archer'])test(id+': fresh-character journey via inputs, no XP/kill/admin injection',()=>{for(const seed of [41,42,99]){const r=journey(id,seed),c=r.engine.character;assert.equal(c.level,5);assert.equal(c.questIndex,5);assert.equal(c.bossCleared,true);assert.ok(c.inventory.some(i=>i.rarity==='rare'));validateCharacter(c);assert.ok(r.seconds<1200);}});
