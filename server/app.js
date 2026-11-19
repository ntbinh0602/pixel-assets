import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {Pool} from 'pg';
import {WebSocketServer} from 'ws';
import {toNodeHandler,fromNodeHeaders} from 'better-auth/node';
import {createAuth} from './auth.js';
import {Store} from './store.js';
import {Sessions} from './sessions.js';
import {GameError,CONTENT,requireGame} from '../game/shared/rules.js';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml','.woff2':'font/woff2','.md':'text/plain; charset=utf-8'};
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>16384)throw new GameError('BODY_TOO_LARGE',413);}try{return JSON.parse(text||'{}');}catch{throw new GameError('INVALID_JSON');}}
export async function createApp(config={}){
  config={appURL:'http://localhost:5173',databaseURL:'postgresql://nightwood:nightwood_local_only@127.0.0.1:54329/nightwood',dataDir:new URL('../data/',import.meta.url),production:false,smtp:{},...config};
  if(config.production&&(!config.databaseURL||!config.appURL.startsWith('https://')))throw new Error('Production requires DATABASE_URL and HTTPS APP_URL');
  config.appURL=new URL(config.appURL).origin;
  const pool=new Pool({connectionString:config.databaseURL,max:10,...(config.pgOptions??{})});
  const auth=await createAuth(pool,config),authHandler=toNodeHandler(auth),store=new Store(pool);await store.migrate();
  const sessions=new Sessions(store),wss=new WebSocketServer({noServer:true,maxPayload:8192});
  const rate=new Map();const server=createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
    req.headers['x-nightwood-client-ip']=config.trustProxy?(req.headers['x-forwarded-for']?.split(',').at(-1)?.trim()||req.socket.remoteAddress):req.socket.remoteAddress;
    const url=new URL(req.url,config.appURL);
    try{
      if(url.pathname.startsWith('/api/auth/')){
        let session;if(url.pathname==='/api/auth/sign-out')session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
        await authHandler(req,res);if(session)sessions.signOut(session.session.id);return;
      }
      if(url.pathname==='/api/health'){json(res,200,{ok:true,version:CONTENT.version,cap:CONTENT.releaseLevelCap,localMail:config.emailProvider!=='resend'&&!config.production&&['127.0.0.1','localhost'].includes(config.smtp.host??'127.0.0.1')});return;}
      if(url.pathname.startsWith('/api/')){
        const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});requireGame(session?.user,'UNAUTHORIZED',401);requireGame(session.user.emailVerified,'EMAIL_NOT_VERIFIED',403);
        const owner=session.user.id;
        if(!['GET','HEAD'].includes(req.method))requireGame(req.headers.origin===config.appURL,'INVALID_ORIGIN',403);
        const key=owner+':'+Math.floor(Date.now()/60000),n=(rate.get(key)??0)+1;rate.set(key,n);requireGame(n<=180,'RATE_LIMITED',429);if(rate.size>1000)for(const k of rate.keys())if(!k.endsWith(':'+Math.floor(Date.now()/60000)))rate.delete(k);
        if(url.pathname==='/api/me'&&req.method==='GET'){json(res,200,{user:{id:owner,name:session.user.name,email:session.user.email},profile:await store.profile(owner,req.headers.cookie?.includes('nw_locale=en')?'en':'vi'),content:CONTENT});return;}
        if(url.pathname==='/api/profile'&&req.method==='PATCH'){json(res,200,await store.setLocale(owner,(await body(req)).locale));return;}
        if(url.pathname==='/api/characters'&&req.method==='GET'){json(res,200,{characters:await store.list(owner)});return;}
        if(url.pathname==='/api/characters'&&req.method==='POST'){const data=await body(req);json(res,201,{character:await store.create(owner,data.name,data.classId)});return;}
        if(url.pathname.startsWith('/api/characters/')&&req.method==='GET'){json(res,200,{character:await store.get(owner,url.pathname.split('/')[3])});return;}
        throw new GameError('NOT_FOUND',404);
      }
      requireGame(['GET','HEAD'].includes(req.method),'METHOD_NOT_ALLOWED',405);
      let pathname=decodeURIComponent(url.pathname);if(pathname.endsWith('/'))pathname+='index.html';
      const parts=pathname.split('/').filter(Boolean);requireGame(!parts.some(p=>p.startsWith('.')),'NOT_FOUND',404);
      const rootFiles=new Set(['index.html','app.js','styles.css','README.md']);
      requireGame(rootFiles.has(parts[0])||['game','lib'].includes(parts[0])||parts[0]==='pixelfx'&&['src','gallery','docs','LICENSE','NOTICE.md'].includes(parts[1]),'NOT_FOUND',404);
      const file=resolve(ROOT,'.'+pathname);requireGame(file.startsWith(ROOT.endsWith(sep)?ROOT:ROOT+sep),'NOT_FOUND',404);
      const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]??'text/plain; charset=utf-8','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
    }catch(error){if(res.headersSent){res.end();return;}if(error.code==='ENOENT')json(res,404,{code:'NOT_FOUND'});else if(error instanceof GameError)json(res,error.status,{code:error.code});else{console.error('HTTP request failed:',error.message);json(res,500,{code:'SERVER_ERROR'});}}
  });
  server.on('upgrade',async(req,socket,head)=>{
    try{
      const url=new URL(req.url,config.appURL);requireGame(url.pathname==='/api/play','NOT_FOUND');requireGame(req.headers.origin===config.appURL,'INVALID_ORIGIN');
      const user=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});requireGame(user?.user.emailVerified,'UNAUTHORIZED');
      const id=url.searchParams.get('character');requireGame(id&&id.length<=100,'INVALID_CHARACTER');await store.get(user.user.id,id);
      wss.handleUpgrade(req,socket,head,async ws=>{
        let s;const backlog=[];let opening=true;
        const receive=async data=>{try{requireGame(s,'UNAUTHORIZED');const payload=JSON.parse(data.toString());await sessions.message(s,payload);}catch(error){if(ws.readyState===1)ws.send(JSON.stringify({type:'error',code:error.code??'INVALID_MESSAGE'}));if(error.code==='RATE_LIMITED')ws.close(1008,'RATE_LIMITED');}};
        ws.on('message',data=>{if(opening){if(backlog.length<20)backlog.push(data);return;}void receive(data);});
        ws.on('close',()=>{if(s)void sessions.close(s);});ws.on('error',()=>{});
        try{s=await sessions.open(user,id,ws);opening=false;for(const data of backlog)await receive(data);if(ws.readyState!==1)await sessions.close(s);}catch(error){ws.close(4003,error.code??'OPEN_FAILED');}
      });
    }catch{socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');socket.destroy();}
  });
  return {server,pool,auth,store,sessions,config,async close(){await sessions.shutdown();for(const ws of wss.clients)ws.terminate();await new Promise(resolve=>wss.close(()=>resolve()));if(server.listening)await new Promise(resolve=>server.close(resolve));await pool.end();}};
}
