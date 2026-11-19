import { readFileSync, writeFileSync } from 'node:fs';
import {validateContent} from './validate-content.mjs';
const plan = JSON.parse(readFileSync(new URL('../docs/game-design/balance-draft.json', import.meta.url), 'utf8'));
validateContent(plan);
const content = { version: 'sprint-3.1', saveVersion: 1, releaseLevelCap: 5, designLevelCap: 50, classes: plan.classes, skills: plan.skills.filter(s => s.minLevel <= 5), tier: plan.equipmentTiers[0], allSkills: plan.skills };
writeFileSync(new URL('../game/shared/content.js', import.meta.url), '// Generated from docs/game-design/balance-draft.json by scripts/build-content.mjs.\nexport const CONTENT = ' + JSON.stringify(content, null, 2) + ';\n');
