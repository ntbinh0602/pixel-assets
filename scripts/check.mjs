import {readdirSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const files=[];function walk(path){for(const entry of readdirSync(path,{withFileTypes:true})){const file=path+'/'+entry.name;if(entry.isDirectory())walk(file);else if(/\.(m?js)$/.test(file))files.push(file);}}
for(const dir of ['server','game','scripts','tests'])walk(dir);files.push('app.js','server.mjs','playwright.config.js');for(const file of files)execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
const {CONTENT}=await import('../game/shared/content.js'),plan=JSON.parse(readFileSync('docs/game-design/balance-draft.json'));
if(JSON.stringify(CONTENT.classes)!==JSON.stringify(plan.classes)||JSON.stringify(CONTENT.allSkills)!==JSON.stringify(plan.skills))throw new Error('Content is stale: run npm run content');
console.log(`Syntax OK: ${files.length} files. Generated content matches design.`);
