import {performance} from 'node:perf_hooks';
import {randomUUID} from 'node:crypto';
import {writeFileSync,mkdirSync} from 'node:fs';
import {Engine} from '../game/shared/engine.js';
import {createCharacter,stats} from '../game/shared/rules.js';
const count=25,seconds=600,dt=.05,engines=Array.from({length:count},(_,i)=>new Engine(createCharacter(randomUUID(),'benchmark','Bench '+i,['warrior','mage','archer'][i%3],randomUUID),randomUUID,i));
const times=[];let snapshots=0,bytes=0;const started=performance.now();
for(let tick=0;tick<seconds/dt;tick++){
 const start=performance.now();for(const [i,e]of engines.entries()){
  if(e.character.hp<=0&&e.time-(e.deadAt??0)>1)e.command('respawn');
  e.inputCommand({seq:tick,x:Math.sin(tick/90+i),y:Math.cos(tick/90+i),attack:true,sprint:tick%100<20});e.tick(dt);e.drainEvents();e.persistent=[];
  if(tick%2===0){bytes+=JSON.stringify(e.snapshot()).length;snapshots++;}
 }times.push(performance.now()-start);
}
times.sort((a,b)=>a-b);const percentile=p=>Number(times[Math.floor(times.length*p)].toFixed(3));const result={scope:'Accelerated engine + JSON serialization only; no socket, database or client render',sessions:count,simulatedSeconds:seconds,wallSeconds:Number(((performance.now()-started)/1000).toFixed(2)),tickBatchMs:{p50:percentile(.5),p95:percentile(.95),max:Number(times.at(-1).toFixed(3))},snapshots,approxJsonBytes:bytes,node:process.version,platform:process.platform,arch:process.arch};mkdirSync('test-results',{recursive:true});writeFileSync('test-results/engine-benchmark.json',JSON.stringify(result,null,2)+'\n');console.log(result);
