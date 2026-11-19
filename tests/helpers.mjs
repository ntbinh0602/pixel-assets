import {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import {WebSocket} from 'ws';
export const testURL=process.env.TEST_DATABASE_URL??'postgresql://nightwood:nightwood_local_only@127.0.0.1:54329/nightwood_test';
export async function freshDatabase(url=testURL){
 const u=new URL(url),name=u.pathname.slice(1);if(!/^[a-z0-9_]+_test$/.test(name))throw new Error('Refusing to reset database: name must end in _test');
 const adminURL=new URL(url);adminURL.pathname='/postgres';const admin=new Pool({connectionString:adminURL.href});
 try{if(!(await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount)await admin.query(`CREATE DATABASE "${name}"`);}finally{await admin.end();}
 const pool=new Pool({connectionString:url});try{await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');}finally{await pool.end();}return url;
}
export async function mailFor(email,kind='verify'){
 for(let k=0;k<60;k++){
  const list=await fetch('http://localhost:8025/api/v1/messages?limit=200').then(r=>r.json());
  const m=list.messages?.find(m=>m.To?.some(t=>t.Address===email)&&((kind==='verify'&&/Verify|Xác minh/.test(m.Subject))||(kind==='reset'&&/Reset|Đặt lại/.test(m.Subject))));
  if(m){const full=await fetch('http://localhost:8025/api/v1/message/'+m.ID).then(r=>r.json());const url=full.Text.match(/https?:\/\/\S+/)?.[0];if(url)return url;}
  await new Promise(r=>setTimeout(r,100));
 }throw new Error('Test email not delivered to Mailpit: '+email+' '+kind);
}
export async function request(base,path,data,cookie='',method=data?'POST':'GET'){
 const response=await fetch(base+path,{method,redirect:'manual',headers:{Origin:base,...(cookie?{Cookie:cookie}:{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
 let body;try{body=await response.json();}catch{body=null;}return{status:response.status,body,cookie:response.headers.getSetCookie().map(s=>s.split(';')[0]).join('; '),response};
}
export async function account(base,locale='vi'){
 const email=`test-${randomUUID()}@example.test`,password='Nightwood-Test-123!';
 const registered=await request(base,'/api/auth/sign-up/email',{name:'Test Player',email,password,callbackURL:base+'/?view=game'},'nw_locale='+locale);
 if(registered.status!==200)throw new Error('signup: '+JSON.stringify(registered.body));
 const verification=await mailFor(email),verified=await fetch(verification,{redirect:'manual'});
 const cookie=verified.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
 if(!cookie)throw new Error('No session cookie after verification');return{email,password,cookie:cookie+'; nw_locale='+locale};
}
export function connect(base,id,cookie){
 return new Promise((resolve,reject)=>{const ws=new WebSocket(base.replace('http','ws')+'/api/play?character='+id,{headers:{Origin:base,Cookie:cookie}}),messages=[],waiters=[];let n=0;
 const client={ws,messages,next(predicate,timeout=5000){const previous=messages.find((m,i)=>predicate(m,i));if(previous)return Promise.resolve(previous);return new Promise((res,rej)=>{const waiter={predicate,res,rej};waiters.push(waiter);waiter.timer=setTimeout(()=>{waiters.splice(waiters.indexOf(waiter),1);rej(new Error('WS response timed out'));},timeout);});},async command(command,data={},id=randomUUID()){const offset=messages.length,response=this.next((m,i)=>i>=offset&&m.id===id&&(m.type==='ack'||m.type==='error'));ws.send(JSON.stringify({type:'command',command,data,id}));return response;},input(x,y,extra={}){ws.send(JSON.stringify({type:'input',seq:++n,x,y,...extra}));},async close(){if(ws.readyState===3)return;await new Promise(r=>{ws.once('close',r);ws.close();});}};
 ws.on('message',data=>{const m=JSON.parse(data);messages.push(m);for(const waiter of [...waiters])if(waiter.predicate(m,messages.length-1)){clearTimeout(waiter.timer);waiters.splice(waiters.indexOf(waiter),1);waiter.res(m);}if(m.type==='hello'){client.hello=m;resolve(client);}});ws.once('error',reject);
 });
}
