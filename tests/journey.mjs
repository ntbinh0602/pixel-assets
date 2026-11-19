// Uses only public engine inputs/commands; never grants XP, kills or equipment directly.
import {randomUUID} from 'node:crypto';
import {Engine} from '../game/shared/engine.js';
import {createCharacter,skillsFor,stats} from '../game/shared/rules.js';
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function journey(classId,seed=42){
 const e=new Engine(createCharacter(randomUUID(),'test-owner','Journey '+classId,classId,randomUUID),randomUUID,seed),c=e.character;
 let deaths=0,seq=0,target=null,repath=0;const dt=.05,skills=skillsFor(classId);let combat=0;
 const command=(type,data={})=>{try{return e.command(type,data);}catch{}};
 for(let i=0;i<24000;i++){
  const q=e.snapshot().quest,p=c.position;
  if(c.hp<=0){deaths+=Number(e.time-(e.deadAt??0)<.051);command('respawn');e.tick(dt);continue;}
  if(e.isSafe()){
   command('rest');for(const item of c.inventory)if(item.minLevel<=c.level)command('equip',{itemId:item.id});
   if(q.ready){command('claim');target=null;}
   if(c.level>=5)command('learn',{skillId:skills[1].id});
   if(c.bossCleared)return{engine:e,seconds:e.time,deaths,combat};
  }
  if(q.ready||c.hp<stats(c).hp*.2&&c.potions===0){
   if(i%20===0)command('path',e.world.spawn);e.inputCommand({seq:++seq,x:0,y:0});e.tick(dt);continue;
  }
  if(c.hp<stats(c).hp*.55&&c.potions)command('potion');
  const family=q.id==='prepare'?'frog':q.family;
  if(!target||target.dead||target.kind!==family)target=e.activeEnemies().filter(x=>x.kind===family).sort((a,b)=>d(a,p)-d(b,p))[0];
  if(!target){e.tick(dt);continue;}
  const range=classId==='warrior'?37:125,rangeNow=d(p,target);
  if(rangeNow>range){
   if(i>=repath){command('path',target);repath=i+25;}
   e.inputCommand({seq:++seq,x:0,y:0,attack:rangeNow<(classId==='warrior'?50:200),aim:target});
  }else{
   // Circle while enemies wind up. Continue facing target for attacks.
   const evade=['telegraph','leap'].includes(target.state),dx=target.x-p.x,dy=target.y-p.y,len=Math.hypot(dx,dy)||1;
   e.inputCommand({seq:++seq,x:evade?-dy/len:0,y:evade?dx/len:0,attack:true,aim:target});
   if(!evade)e.path=[];
   for(const skill of skills)if(c.skills[skill.id])command('cast',{skill:skill.id});combat+=dt;
  }
  for(const loot of [...c.loot])if(d(loot,p)<45)command('pickup',{lootId:loot.id});
  e.tick(dt);
 }
 throw new Error(JSON.stringify({classId,quest:c.questIndex,hp:c.hp,level:c.level,kills:c.kills,pos:c.position,target:target&&{x:target.x,y:target.y,hp:target.hp,kind:target.kind},path:e.path,deaths}));
}
if(process.argv[1]?.endsWith('journey.mjs'))for(const id of ['warrior','mage','archer']){const r=journey(id);console.log(id,{seconds:r.seconds,deaths:r.deaths,combat:r.combat,level:r.engine.character.level});}
