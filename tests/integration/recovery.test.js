import test from 'node:test';
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {once} from 'node:events';
import {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import {freshDatabase,testURL,account,request,connect} from '../helpers.mjs';
const base='http://localhost:5182';
test('SIGKILL recovery before/after autosave retains acknowledged economy and replays once',{timeout:45000},async t=>{
 const url=new URL(testURL);url.pathname='/nightwood_recovery_test';await freshDatabase(url.href);let child;
 async function start(){child=fork('tests/recovery-server.mjs',[],{env:{...process.env,RECOVERY_DATABASE_URL:url.href},stdio:['ignore','ignore','inherit','ipc']});await once(child,'message');}
 async function kill(){const exit=once(child,'exit');child.kill('SIGKILL');await exit;}
 t.after(async()=>{if(child&&child.exitCode===null&&child.signalCode===null)await kill();});await start();
 const a=await account(base),hero=(await request(base,'/api/characters',{name:'Recovery Test',classId:'mage'},a.cookie)).body.character;
 const db=new Pool({connectionString:url.href});try{await db.query('UPDATE game_characters SET data=jsonb_set(data,\'{gold}\',\'20\') WHERE id=$1',[hero.id]);}finally{await db.end();}
 const first=await connect(base,hero.id,a.cookie),action=randomUUID();assert.equal((await first.command('buy',{item:'potion'},action)).state.character.gold,10);first.input(1,0);await new Promise(r=>setTimeout(r,300));await kill();
 await start();const second=await connect(base,hero.id,a.cookie);assert.equal(second.hello.state.character.gold,10);assert.equal(second.hello.state.character.potions,4);assert.deepEqual(second.hello.state.character.position,{x:758,y:626});
 const replay=await second.command('buy',{item:'potion'},action);assert.equal(replay.state.character.gold,10);assert.equal(replay.state.character.potions,4);second.input(1,0);await new Promise(r=>setTimeout(r,500));second.input(0,0);const pause=await second.command('pause',{paused:true}),position=pause.state.character.position;
 await second.next(m=>m.type==='saved'&&m.revision>second.hello.revision,18000);await kill();await start();const third=await connect(base,hero.id,a.cookie);assert.deepEqual(third.hello.state.character.position,position);assert.equal(third.hello.state.character.gold,10);await third.close();await kill();
});
