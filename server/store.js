import {randomUUID} from 'node:crypto';
import {createCharacter,validateCharacter,GameError,requireGame} from '../game/shared/rules.js';

export class Store {
  constructor(pool){this.pool=pool;}
  async migrate(){
    await this.pool.query(`CREATE TABLE IF NOT EXISTS game_schema(version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS game_profiles(user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE, locale TEXT NOT NULL DEFAULT 'vi' CHECK(locale IN ('vi','en')));
      CREATE TABLE IF NOT EXISTS game_characters(id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, data JSONB NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
      CREATE INDEX IF NOT EXISTS game_characters_owner ON game_characters(owner_id);
      CREATE TABLE IF NOT EXISTS game_actions(character_id TEXT NOT NULL REFERENCES game_characters(id) ON DELETE CASCADE, action_id TEXT NOT NULL, result JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(character_id, action_id));
      INSERT INTO game_schema(version) VALUES(1) ON CONFLICT DO NOTHING;`);
  }
  async transaction(fn){const db=await this.pool.connect();try{await db.query('BEGIN');const result=await fn(db);await db.query('COMMIT');return result;}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}}
  async profile(owner,locale='vi'){await this.pool.query('INSERT INTO game_profiles(user_id,locale) VALUES($1,$2) ON CONFLICT DO NOTHING',[owner,locale==='en'?'en':'vi']);return (await this.pool.query('SELECT locale FROM game_profiles WHERE user_id=$1',[owner])).rows[0];}
  async setLocale(owner,locale){requireGame(['vi','en'].includes(locale),'INVALID_LOCALE');await this.pool.query('INSERT INTO game_profiles(user_id,locale) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET locale=$2',[owner,locale]);return {locale};}
  async list(owner){return (await this.pool.query('SELECT id,data,revision,updated_at FROM game_characters WHERE owner_id=$1 ORDER BY updated_at DESC',[owner])).rows;}
  async get(owner,id,db=this.pool,lock=false){const row=(await db.query(`SELECT id,data,revision,updated_at FROM game_characters WHERE id=$1 AND owner_id=$2${lock?' FOR UPDATE':''}`,[id,owner])).rows[0];requireGame(row,'CHARACTER_NOT_FOUND',404);return row;}
  async create(owner,name,classId){
    return this.transaction(async db=>{
      await db.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE',[owner]);
      const count=Number((await db.query('SELECT count(*) AS n FROM game_characters WHERE owner_id=$1',[owner])).rows[0].n);requireGame(count<3,'CHARACTER_LIMIT');
      const data=createCharacter(randomUUID(),owner,name,classId,randomUUID);
      await db.query('INSERT INTO game_characters(id,owner_id,data) VALUES($1,$2,$3)',[data.id,owner,JSON.stringify(data)]);
      return this.get(owner,data.id,db);
    });
  }
  async mutate(owner,id,revision,actionId,fn){
    requireGame(typeof actionId==='string'&&actionId.length>=4&&actionId.length<=1024,'INVALID_ACTION_ID');
    return this.transaction(async db=>{
      const current=await this.get(owner,id,db,true);
      const previous=(await db.query('SELECT result FROM game_actions WHERE character_id=$1 AND action_id=$2',[id,actionId])).rows[0];
      if(previous)return {...current,result:previous.result,replayed:true};
      requireGame(current.revision===revision,'REVISION_CONFLICT',409);
      const {data,result}=fn(structuredClone(current.data));validateCharacter(data);
      requireGame(data.id===id&&data.ownerId===owner,'INVALID_SAVE');
      const row=(await db.query('UPDATE game_characters SET data=$1,revision=revision+1,updated_at=now() WHERE id=$2 RETURNING id,data,revision,updated_at',[JSON.stringify(data),id])).rows[0];
      await db.query('INSERT INTO game_actions(character_id,action_id,result) VALUES($1,$2,$3)',[id,actionId,JSON.stringify(result??{ok:true})]);
      return {...row,result:result??{ok:true},replayed:false};
    });
  }
  async save(owner,id,revision,data){
    validateCharacter(data);const row=(await this.pool.query('UPDATE game_characters SET data=$1,revision=revision+1,updated_at=now() WHERE id=$2 AND owner_id=$3 AND revision=$4 RETURNING id,data,revision,updated_at',[JSON.stringify(data),id,owner,revision])).rows[0];
    requireGame(row,'REVISION_CONFLICT',409);return row;
  }
}
