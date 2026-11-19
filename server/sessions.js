import {randomUUID} from 'node:crypto';
import {Engine} from '../game/shared/engine.js';
import {GameError,requireGame} from '../game/shared/rules.js';

const durable=new Set(['respawn','potion','pickup','equip','unequip','learn','refund','claim','rest','buy','sell','return']);
export class Sessions {
  constructor(store){this.store=store;this.sessions=new Map();this.opening=new Map();this.timer=setInterval(()=>this.tick(),50);this.timer.unref();}
  async open(user,characterId,ws){
    const pending=this.opening.get(characterId)??Promise.resolve();
    const promise=pending.catch(()=>{}).then(async()=>{
      const row=await this.store.get(user.user.id,characterId);
      const previous=this.sessions.get(characterId);
      if(previous){previous.closing=true;await previous.queue.catch(()=>{});await this.save(previous);previous.ws.close(4001,'SESSION_TRANSFERRED');this.sessions.delete(characterId);}
      const current=previous?await this.store.get(user.user.id,characterId):row;
      const s={owner:user.user.id,authId:user.session.id,expires:Date.parse(user.session.expiresAt),id:characterId,ws,record:current,engine:new Engine(current.data,randomUUID),queue:Promise.resolve(),busy:false,closing:false,lastSave:Date.now(),lastInput:Date.now(),lastCheck:Date.now(),lastSnapshot:Date.now(),messages:0,windowAt:Date.now()};
      this.sessions.set(characterId,s);this.send(s,{type:'hello',contentVersion:current.data.contentVersion,revision:current.revision,state:s.engine.snapshot(),savedAt:current.updated_at});return s;
    });
    this.opening.set(characterId,promise);try{return await promise;}finally{if(this.opening.get(characterId)===promise)this.opening.delete(characterId);}
  }
  send(s,message){if(s.ws.bufferedAmount>1048576){s.ws.close(1013,'SLOW_CLIENT');return;}if(s.ws.readyState===1)s.ws.send(JSON.stringify(message));}
  enqueue(s,fn){s.queue=s.queue.catch(()=>{}).then(async()=>{if(s.closing)return; s.busy=true;try{return await fn();}finally{s.busy=false;}});return s.queue;}
  async save(s){
    const data=s.engine.export();s.record=await this.store.save(s.owner,s.id,s.record.revision,data);s.lastSave=Date.now();this.send(s,{type:'saved',revision:s.record.revision,savedAt:s.record.updated_at});
  }
  async message(s,payload){
    if(s.closing)return;
    if(Date.now()>s.expires){s.ws.close(4003,'SESSION_EXPIRED');return;}
    if(Date.now()-s.windowAt>=1000){s.windowAt=Date.now();s.messages=0;}
    requireGame(++s.messages<=50,'RATE_LIMITED',429);
    if(payload.type==='input'){s.lastInput=Date.now();s.engine.inputCommand(payload);return;}
    requireGame(payload.type==='command','INVALID_MESSAGE');
    requireGame(typeof payload.id==='string'&&payload.id.length>=4&&payload.id.length<=100,'INVALID_ACTION_ID');
    return this.enqueue(s,async()=>{
      const backup=s.engine.export(),events=structuredClone(s.engine.events),persistent=[...s.engine.persistent];
      try{
        let result;
        if(durable.has(payload.command)){
          const row=await this.store.mutate(s.owner,s.id,s.record.revision,payload.id,()=>{
            result=s.engine.command(payload.command,payload.data??{});return{data:s.engine.export(),result};
          });
          s.record=row;s.lastSave=Date.now();result=row.result;
          this.send(s,{type:'saved',revision:row.revision,savedAt:row.updated_at});
        }else result=s.engine.command(payload.command,payload.data??{});
        this.send(s,{type:'ack',id:payload.id,result,state:s.engine.snapshot()});this.flush(s);
      }catch(error){
        s.engine.load(backup,true);s.engine.events=events;s.engine.persistent=persistent;this.send(s,{type:'error',id:payload.id,code:error.code??'SERVER_ERROR'});
        if(!(error instanceof GameError))console.error('Game command failed:',error.message);
        if(error.code==='REVISION_CONFLICT')s.ws.close(4002,'REVISION_CONFLICT');
      }
    });
  }
  flush(s){const events=s.engine.drainEvents();if(events.length)this.send(s,{type:'events',events});}
  tick(){
    const now=Date.now();for(const s of this.sessions.values()){
      if(s.closing||s.busy)continue;
      if(now>s.expires){s.ws.close(4003,'SESSION_EXPIRED');continue;}
      if(now-s.lastCheck>15000){s.lastCheck=now;void this.store.pool.query('SELECT id FROM session WHERE id=$1 AND "expiresAt">now()',[s.authId]).then(r=>{if(!r.rowCount)s.ws.close(4003,'SESSION_EXPIRED');}).catch(()=>s.ws.close(4002,'SAVE_FAILED'));}
      if(now-s.lastInput>2000)s.engine.input={x:0,y:0,seq:-1};
      if(now-s.lastInput>3000)s.engine.paused=true;
      s.engine.tick(.05);
      if(s.engine.persistent.length){
        const ids=s.engine.persistent.splice(0),snapshot=s.engine.export();
        void this.enqueue(s,async()=>{
          try{s.record=await this.store.mutate(s.owner,s.id,s.record.revision,'engine:'+ids.join('|'),()=>({data:snapshot,result:{ok:true}}));s.lastSave=Date.now();this.send(s,{type:'saved',revision:s.record.revision,savedAt:s.record.updated_at});this.flush(s);}
          catch(error){console.error('Reward persistence failed:',error.message);s.engine.load(s.record.data);s.ws.close(4002,'SAVE_FAILED');}
        });
      }else this.flush(s);
      if(now-s.lastSnapshot>=(s.engine.paused?500:100)){this.send(s,{type:'state',state:s.engine.snapshot()});s.lastSnapshot=now;}
      if(now-s.lastSave>=15000)void this.enqueue(s,()=>this.save(s).catch(error=>{console.error('Autosave failed:',error.message);s.ws.close(4002,'SAVE_FAILED');}));
    }
  }
  async close(s){
    if(this.sessions.get(s.id)!==s||s.closing)return;
    s.closing=true;await s.queue.catch(()=>{});try{await this.save(s);}catch(error){console.error('Session close save failed:',error.message);}this.sessions.delete(s.id);
  }
  signOut(authId){for(const s of this.sessions.values())if(s.authId===authId)s.ws.close(4003,'SESSION_EXPIRED');}
  async shutdown(){clearInterval(this.timer);for(const s of [...this.sessions.values()]){await this.close(s);s.ws.close(1001,'SERVER_RESTART');}}
}
