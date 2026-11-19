import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createApp} from '../../server/app.js';
import {freshDatabase,testURL,account,request,connect,mailFor} from '../helpers.mjs';
const base='http://localhost:5181';let app,a,b,hero;
test('real PostgreSQL + SMTP + HTTP + WebSocket',async t=>{
 await freshDatabase();app=await createApp({appURL:base,databaseURL:testURL,authSecret:'integration-test-secret-only-1234567890'});await new Promise(r=>app.server.listen(5181,'127.0.0.1',r));
 t.after(()=>app.close());
 await t.test('signup sends verification through SMTP; unverified cannot sign in',async()=>{
  const email=`unverified-${randomUUID()}@example.test`;assert.equal((await request(base,'/api/auth/sign-up/email',{name:'Pending',email,password:'long-test-password'})).status,200);assert.ok((await mailFor(email)).startsWith(base));assert.equal((await request(base,'/api/auth/sign-in/email',{email,password:'long-test-password'})).status,403);
  a=await account(base,'en');b=await account(base);assert.equal((await request(base,'/api/me',null,a.cookie)).body.profile.locale,'en');
 });
 await t.test('ownership, invalid class and three slots (concurrent creation)',async()=>{
  assert.equal((await request(base,'/api/characters',{name:'Bad',classId:'admin'},a.cookie)).body.code,'INVALID_CLASS');
  const results=await Promise.all(['warrior','mage','archer','warrior'].map((classId,i)=>request(base,'/api/characters',{name:'Hero '+i,classId},a.cookie)));assert.equal(results.filter(r=>r.status===201).length,3);assert.equal(results.filter(r=>r.body.code==='CHARACTER_LIMIT').length,1);hero=results.find(r=>r.status===201).body.character;
  assert.equal((await request(base,'/api/characters/'+hero.id,null,b.cookie)).status,404);assert.equal((await request(base,'/api/characters/'+hero.id,null,'')).status,401);assert.equal((await request(base,'/api/characters',{name:'Hero',classId:'mage'},a.cookie+'; x=1')).status,400);
 });
 await t.test('pickup and quest reward replay changes gold and inventory exactly once',async()=>{
  const owner=(await request(base,'/api/me',null,b.cookie)).body.user.id,row=await app.store.create(owner,'Reward Test','archer'),data=row.data;data.kills.slime=3;data.loot=[{id:'fixture-loot',x:758,y:626,gold:7,potions:1,materials:1}];await app.store.save(owner,row.id,row.revision,data);
  const ws=await connect(base,row.id,b.cookie),pickup=randomUUID(),claim=randomUUID();
  const picked=await ws.command('pickup',{lootId:'fixture-loot'},pickup);assert.equal(picked.state.character.gold,7);
  const retry=await ws.command('pickup',{lootId:'fixture-loot'},pickup);assert.equal(retry.state.character.gold,7);assert.equal(retry.state.character.potions,4);
  const reward=await ws.command('claim',{},claim);assert.equal(reward.state.character.level,2);assert.equal(reward.state.character.gold,32);assert.equal(reward.state.character.inventory.length,4);
  const duplicate=await ws.command('claim',{},claim);assert.equal(duplicate.state.character.gold,32);assert.equal(duplicate.state.character.inventory.length,4);assert.equal((await ws.command('claim')).code,'QUEST_NOT_READY');await ws.close();
 });
 await t.test('origin protection and private filesystem',async()=>{
  const res=await fetch(base+'/api/profile',{method:'PATCH',headers:{Cookie:a.cookie,Origin:'http://attacker.test','Content-Type':'application/json'},body:'{"locale":"vi"}'});assert.equal(res.status,403);
  for(const path of ['/server/auth.js','/.env','/package-lock.json','/node_modules/pg/package.json','/data/auth-secret'])assert.equal((await fetch(base+path)).status,404,path);
  assert.equal((await fetch(base+'/pixelfx/src/fx/index.js')).status,200);
 });
 await t.test('database transaction rollback after update; stale revision rejected',async()=>{
  const before=await app.store.get((await request(base,'/api/me',null,a.cookie)).body.user.id,hero.id),owner=before.data.ownerId;
  await assert.rejects(app.store.transaction(async db=>{await db.query('UPDATE game_characters SET data=jsonb_set(data,\'{gold}\',\'9999\') WHERE id=$1',[hero.id]);throw new Error('injected fault');}));assert.deepEqual((await app.store.get(owner,hero.id)).data,before.data);
  const row=await app.store.mutate(owner,hero.id,before.revision,'fault-retry',data=>{data.gold+=20;return{data,result:{ok:true}};});assert.equal(row.data.gold,20);
  const replay=await app.store.mutate(owner,hero.id,before.revision,'fault-retry',()=>{throw new Error('must not run');});assert.equal(replay.replayed,true);assert.equal(replay.data.gold,20);
  await assert.rejects(app.store.save(owner,hero.id,before.revision,before.data),e=>e.code==='REVISION_CONFLICT');
 });
 await t.test('durable action retry once; another browser transfers writer and restores save',async()=>{
  const one=await connect(base,hero.id,a.cookie);assert.equal(one.hello.state.character.gold,20);
  const id=randomUUID();const first=await one.command('buy',{item:'potion'},id);assert.equal(first.type,'ack');assert.equal(first.state.character.gold,10);
  const two=await connect(base,hero.id,a.cookie);await new Promise(r=>setTimeout(r,100));assert.equal(one.ws.readyState,3);assert.equal(two.hello.state.character.gold,10);
  const replay=await two.command('buy',{item:'potion'},id);assert.equal(replay.state.character.gold,10);assert.equal(replay.state.character.potions,4);
  const locale=await request(base,'/api/profile',{locale:'vi'},a.cookie,'PATCH');assert.equal(locale.body.locale,'vi');
  two.input(1,0);await new Promise(r=>setTimeout(r,450));await two.command('pause',{paused:true});const pos=two.messages.filter(m=>m.state).at(-1).state.character.position;await two.close();await new Promise(r=>setTimeout(r,100));
  const three=await connect(base,hero.id,a.cookie);assert.deepEqual(three.hello.state.character.position,pos);assert.equal(three.hello.state.paused,true);await three.close();
 });
 await t.test('restart application restores acknowledged gold/inventory and locale from PostgreSQL',async()=>{
  await app.close();app=await createApp({appURL:base,databaseURL:testURL,authSecret:'integration-test-secret-only-1234567890'});await new Promise(r=>app.server.listen(5181,'127.0.0.1',r));
  const ws=await connect(base,hero.id,a.cookie);assert.equal(ws.hello.state.character.gold,10);assert.equal(ws.hello.state.character.potions,4);assert.equal((await request(base,'/api/me',null,a.cookie)).body.profile.locale,'vi');await ws.close();
 });
 await t.test('password reset delivers real email, invalidates old password/session and sign out',async()=>{
  assert.equal((await request(base,'/api/auth/request-password-reset',{email:a.email,redirectTo:base+'/?view=game&reset=1'})).status,200);const link=await mailFor(a.email,'reset');const redirected=await fetch(link,{redirect:'manual'});const target=redirected.headers.get('location');const token=new URL(target,base).searchParams.get('token');assert.ok(token);
  assert.equal((await request(base,'/api/auth/reset-password',{newPassword:'New-nightwood-password123!',token})).status,200);
  assert.equal((await request(base,'/api/me',null,a.cookie)).status,401);assert.equal((await request(base,'/api/auth/sign-in/email',{email:a.email,password:a.password})).status,401);
  const logged=await request(base,'/api/auth/sign-in/email',{email:a.email,password:'New-nightwood-password123!'});assert.equal(logged.status,200);assert.equal((await request(base,'/api/me',null,logged.cookie)).status,200);await request(base,'/api/auth/sign-out',{},logged.cookie);assert.equal((await request(base,'/api/me',null,logged.cookie)).status,401);
 });
});
