import {createForestWorld,isWalkable,moveExplorer,findPath} from '../world.js';
import {CONTENT,CAP,stats,skillsFor,damage,questProgress,QUESTS,grantXp,xpToLevel,itemDefinition,equip,learn,refund,requireGame,GameError,validateCharacter} from './rules.js';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const unit=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};};
const families={slime:{level:1,speed:31,radius:13},bat:{level:3,speed:62,radius:12},frog:{level:4,speed:37,radius:14},boss:{level:5,speed:34,radius:27}};
export class Engine {
  constructor(character,makeId,seed=41){this.world=createForestWorld();this.makeId=makeId;this.rngState=seed>>>0;this.R=()=>{this.rngState=(Math.imul(this.rngState,1664525)+1013904223)>>>0;return this.rngState/4294967296;};this.events=[];this.persistent=[];this.load(character);}
  load(data,rollback=false){
    const c=structuredClone(data),r=c._runtime;delete c._runtime;this.character=validateCharacter(c);
    if(!isWalkable(this.world,c.position.x,c.position.y))c.position={...this.world.spawn};
    this.rngState=r?.rngState??this.rngState;this.time=r?.time??0;this.enemies=r?.enemies??[];this.projectiles=r?.projectiles??[];this.zones=r?.zones??[];this.cooldowns=r?.cooldowns??{};this.deadAt=r?.deadAt??null;this.attackUntil=r?.attackUntil??0;this.combatUntil=r?.combatUntil??0;this.facing=r?.facing??'down';this.input={x:0,y:0,sprint:false,attack:false,seq:-1};this.path=rollback?(r?.path??[]):[];if(rollback&&r?.input)this.input=r.input;this.paused=r?.paused??false;this.invulnerable=r?.invulnerable??0;this.castHits=new Map((r?.castHits??[]).map(([id,cast])=>[id,{...cast,ids:new Set(cast.ids)}]));this.events=[];this.persistent=[];
    this.character.loot??=[];
    if(!r){
      for(const [kind,positions] of Object.entries({slime:[[650,605],[680,710],[790,740],[650,440],[820,500]],bat:[[620,850],[810,850],[885,640],[440,620],[910,470]],frog:[[985,610],[970,710],[975,810],[1230,590],[1270,760]]}))for(const [x,y] of positions)this.enemies.push(this.spawn(kind,x,y));
      this.enemies.push(this.spawn('boss',850,300));
    }
  }
  safePoint(x,y){for(let r=0;r<=80;r+=10)for(let i=0;i<12;i++){const a=i/12*Math.PI*2,p={x:x+Math.cos(a)*r,y:y+Math.sin(a)*r};if(isWalkable(this.world,p.x,p.y,10))return p;}return {...this.world.spawn};}
  spawn(kind,x,y,summoned=false){
    const d=families[kind],p=this.safePoint(x,y),hp=Math.round(26+8*d.level+.35*d.level*d.level)*(kind==='boss'?10:1);
    return {id:this.makeId(),kind,...p,home:{...p},level:d.level,hp,maxHp:hp,radius:d.radius,speed:d.speed,power:Math.round((5+2.2*d.level)*(kind==='boss'?1.7:1)),armor:Math.round(.8*d.level),state:'idle',until:0,phase:1,summoned,slowUntil:0,stunUntil:0};
  }
  export(){return {...structuredClone(this.character),_runtime:{rngState:this.rngState,time:this.time,enemies:structuredClone(this.enemies),zones:structuredClone(this.zones),cooldowns:{...this.cooldowns},deadAt:this.deadAt,projectiles:structuredClone(this.projectiles),castHits:[...this.castHits].map(([id,cast])=>[id,{...cast,ids:[...cast.ids]}]),combatUntil:this.combatUntil,attackUntil:this.attackUntil,facing:this.facing,paused:this.paused,invulnerable:this.invulnerable,input:structuredClone(this.input),path:structuredClone(this.path)}};}
  emit(type,data={}){this.events.push({id:this.makeId(),type,...data});}
  drainEvents(){const e=this.events;this.events=[];return e;}
  inputCommand(input){
    if(!Number.isSafeInteger(input.seq)||input.seq<=this.input.seq)return;
    requireGame(Number.isFinite(input.x)&&Number.isFinite(input.y),'INVALID_INPUT');
    const length=Math.max(1,Math.hypot(input.x,input.y));
    this.input={seq:input.seq,x:input.x/length,y:input.y/length,sprint:input.sprint===true,attack:input.attack===true};
    if(input.aim&&Number.isFinite(input.aim.x)&&Number.isFinite(input.aim.y))this.input.aim={x:Math.max(0,Math.min(this.world.width,input.aim.x)),y:Math.max(0,Math.min(this.world.height,input.aim.y))};
    if(input.x||input.y)this.path=[];
  }
  activeEnemies(){return this.enemies.filter(e=>!e.dead&&(e.kind!=='boss'||this.character.questIndex>=4&&!this.character.bossCleared));}
  aim(point){
    const p=this.character.position;
    if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y))return unit(point.x-p.x,point.y-p.y);
    const e=this.activeEnemies().filter(e=>dist(e,p)<340).sort((a,b)=>dist(a,p)-dist(b,p))[0];
    return e?unit(e.x-p.x,e.y-p.y):{x:this.facing==='left'?-1:1,y:0};
  }
  cast(which='basic',point){
    const c=this.character;requireGame(c.hp>0&&!this.paused,'NOT_ALIVE');
    const s=stats(c),skill=which==='basic'?null:skillsFor(c.classId).find(k=>k.id===which);
    if(which!=='basic')requireGame(skill&&c.skills[which],'SKILL_NOT_LEARNED');
    const rank=skill?c.skills[which]:1,cd=skill?skill.baseCooldownSeconds*(1-.04*(rank-1)):(c.classId==='warrior'?.65:c.classId==='mage'?.85:.7);
    requireGame(this.time>=(this.cooldowns[which]??0),'COOLDOWN');
    const mana=skill?Math.ceil(skill.baseMana*(1+.06*(rank-1))):0;
    requireGame(c.mp>=mana,'NO_MANA');c.mp-=mana;this.cooldowns[which]=this.time+cd;this.cooldowns.basic=Math.max(this.cooldowns.basic??0,this.time+.22);
    this.combatUntil=this.time+4;this.attackUntil=this.time+.3;
    const a=this.aim(point),p=c.position,angle=Math.atan2(a.y,a.x),coef=(skill?.basePowerCoefficient??1)*(1+.18*(rank-1));
    this.facing=Math.abs(a.x)>Math.abs(a.y)?a.x<0?'left':'right':a.y<0?'up':'down';
    const id=this.makeId();this.castHits.set(id,{until:this.time+4,ids:new Set()});
    this.emit('cast',{classId:c.classId,skill:which,x:p.x,y:p.y,angle});
    if(c.classId==='warrior'){
      const range=skill?.minLevel===5?42:skill?60:44;
      for(const e of this.activeEnemies())if(dist(e,p)<range+e.radius){const v=unit(e.x-p.x,e.y-p.y);if(dist(e,p)<=e.radius+7||v.x*a.x+v.y*a.y>.35){this.hit(e,s.power*coef,id);if(skill?.minLevel===5)e.stunUntil=this.time+(e.kind==='boss'?.15:.6);}}
    }else if(c.classId==='mage'&&skill?.minLevel===5){
      this.emit('nova',{x:p.x,y:p.y});for(const e of this.activeEnemies())if(dist(e,p)<80+e.radius){this.hit(e,s.power*coef,id);e.slowUntil=this.time+2;}
    }else{
      const fan=c.classId==='archer'&&skill?.minLevel===5;
      for(const offset of fan?[-.25,0,.25]:[0]){
        const aa=angle+offset,speed=c.classId==='mage'?210:300;
        this.projectiles.push({id:this.makeId(),castId:id,kind:c.classId==='mage'?'fire':'arrow',x:p.x+a.x*12,y:p.y-10+a.y*12,vx:Math.cos(aa)*speed,vy:Math.sin(aa)*speed,life:c.classId==='mage'?1.3:1.2,power:s.power*coef,pierces:c.classId==='archer'&&skill?.minLevel===1?2:1,explosive:c.classId==='mage',hitIds:[]});
      }
    }
    return {ok:true};
  }
  hit(e,power,castId){
    if(e.dead)return;const cast=this.castHits.get(castId);if(cast?.ids.has(e.id))return;cast?.ids.add(e.id);
    const crit=this.R()<stats(this.character).crit,amount=damage(power*(crit?1.5:1),e.armor);
    e.hp=Math.max(0,e.hp-amount);this.emit('hit',{x:e.x,y:e.y,amount,crit,enemyId:e.id});
    if(e.hp<=0)this.kill(e);
  }
  kill(e){
    e.dead=true;e.state='dead';e.deadAt=this.time;this.emit('death',{x:e.x,y:e.y,kind:e.kind});
    if(e.summoned)return;
    const c=this.character;c.kills[e.kind]=(c.kills[e.kind]??0)+1;
    const difference=c.level-e.level,mult=difference>=6?.2:difference>=3?.6:1;
    const level=grantXp(c,Math.round((20+5*e.level)*(e.kind==='boss'?20:1)*mult));
    if(level)this.emit('level',{level:c.level,x:c.position.x,y:c.position.y});
    const loot={id:'loot:'+e.id,x:e.x,y:e.y,gold:e.kind==='boss'?60:5+e.level*2,potions:e.kind==='boss'?2:this.R()<.25?1:0,materials:e.kind==='boss'?5:1};
    if(c.loot.length>=32){c.gold+=loot.gold;c.potions+=loot.potions;c.materials+=loot.materials;}else c.loot.push(loot);
    this.persistent.push('kill:'+e.id);
  }
  hurt(amount){
    const c=this.character;if(c.hp<=0||this.time<this.invulnerable||this.isSafe())return;
    const s=stats(c),block=this.R()<s.block;const hit=damage(amount*(block?.65:1),s.armor);
    c.hp=Math.max(0,c.hp-hit);this.combatUntil=this.time+4;this.emit('hurt',{x:c.position.x,y:c.position.y,amount:hit,block});
    if(c.hp===0){this.deadAt=this.time;this.input={x:0,y:0,seq:-1};this.path=[];this.emit('player-death');this.persistent.push('death:'+this.makeId());const b=this.enemies.find(e=>e.kind==='boss');if(b){b.hp=b.maxHp;b.phase=1;b.state='idle';}this.enemies=this.enemies.filter(e=>!e.summoned);}
  }
  isSafe(){return dist(this.character.position,this.world.spawn)<88;}
  updateEnemy(e,dt){
    const c=this.character,p=c.position;
    if(e.dead){if(e.kind!=='boss'&&!e.summoned&&this.time-e.deadAt>24){Object.assign(e,this.spawn(e.kind,e.home.x,e.home.y));}return;}
    if(e.kind==='boss'&&(c.questIndex<4||c.bossCleared))return;
    const d=dist(e,p);if(d>430&&e.state==='idle')return;
    if(e.kind==='boss'&&e.hp/e.maxHp<.6&&e.phase===1){e.phase=2;for(let i=0;i<3;i++){const a=i/3*Math.PI*2;this.enemies.push(this.spawn('slime',e.x+Math.cos(a)*45,e.y+Math.sin(a)*45,true));}this.emit('boss-phase',{phase:2});}
    if(e.kind==='boss'&&e.hp/e.maxHp<.3&&e.phase===2){e.phase=3;this.emit('boss-phase',{phase:3});}
    if(c.hp<=0||this.isSafe()||dist(p,e.home)>(e.kind==='boss'?230:200)){
      e.state='idle';e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.15*dt);const v=unit(e.home.x-e.x,e.home.y-e.y);if(dist(e,e.home)>2)moveExplorer(this.world,e,v.x*e.speed*dt,v.y*e.speed*dt);return;
    }
    if(this.time<e.stunUntil)return;
    if(e.state==='idle'&&d<(e.kind==='boss'?160:125)){e.state='chase';e.until=this.time+.5;}
    if(e.state==='chase'){
      const range=e.kind==='bat'?95:e.kind==='boss'?90:e.kind==='frog'?100:42;
      if(d>range){const v=unit(p.x-e.x,p.y-e.y),speed=e.speed*(e.slowUntil>this.time?.75:1);moveExplorer(this.world,e,v.x*speed*dt,v.y*speed*dt);}
      else if(this.time>=e.until){e.state='telegraph';e.target={...p};e.until=this.time+(e.kind==='boss'?.9:e.kind==='bat'?.55:.7);e.start={x:e.x,y:e.y};}
    }else if(e.state==='telegraph'&&this.time>=e.until){e.state='leap';e.until=this.time+(e.kind==='bat'?.4:.35);e.leapHit=false;}
    else if(e.state==='leap'){
      const remaining=Math.max(.05,e.until-this.time),v=unit(e.target.x-e.x,e.target.y-e.y),step=Math.min(dist(e,e.target),Math.min(e.kind==='bat'?240:180,dist(e,e.target)/remaining)*dt);
      moveExplorer(this.world,e,v.x*step,v.y*step);
      if(this.time>=e.until){
        const radius=e.kind==='boss'?42:e.kind==='frog'?26:20;
        if(dist(e,p)<radius+7)this.hurt(e.power);
        this.emit('impact',{x:e.x,y:e.y,radius,kind:e.kind});
        if(e.kind==='frog')this.zones.push({id:this.makeId(),x:e.x,y:e.y,radius:22,until:this.time+3,nextHit:this.time+.6});
        e.state='recover';e.until=this.time+(e.kind==='boss'?(e.phase===3?.75:1.3):1.1);
      }
    }else if(e.state==='recover'&&this.time>=e.until){e.state='chase';e.until=this.time+.2;}
  }
  tick(dt){
    if(this.paused)return;this.time+=dt;
    const c=this.character,s=stats(c),before={...c.position};
    if(c.hp>0){
      let {x=0,y=0}=this.input;
      if(!x&&!y&&this.path.length){const target=this.path[0],d=dist(c.position,target);if(d<3)this.path.shift();else {const v=unit(target.x-c.position.x,target.y-c.position.y);x=v.x;y=v.y;}}
      const running=this.input.sprint&&c.stamina>1&&(x||y),speed=s.speed*(running?1.55:1);
      moveExplorer(this.world,c.position,x*speed*dt,y*speed*dt);
      if(x||y)this.facing=Math.abs(x)>Math.abs(y)?x<0?'left':'right':y<0?'up':'down';
      c.stamina=Math.max(0,Math.min(100,c.stamina+(running?-22:18)*dt));
      c.mp=Math.min(s.mp,c.mp+({warrior:3,mage:7,archer:4}[c.classId])*(this.time>this.combatUntil?1.5:1)*dt);
      if(this.isSafe()){c.hp=Math.min(s.hp,c.hp+25*dt);c.mp=Math.min(s.mp,c.mp+12*dt);}
      if(this.input.attack){try{this.cast('basic',this.input.aim);}catch(e){if(!(e instanceof GameError))throw e;}}
    }
    this.moving=dist(before,c.position)>.01;
    for(const e of [...this.enemies])this.updateEnemy(e,dt);
    for(const b of this.projectiles){
      b.life-=dt;const count=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/6));
      for(let k=0;k<count&&b.life>0;k++){
        b.x+=b.vx*dt/count;b.y+=b.vy*dt/count;
        if(b.x<0||b.y<0||b.x>this.world.width||b.y>this.world.height){b.life=0;break;}
        for(const e of this.activeEnemies())if(!b.hitIds.includes(e.id)&&Math.hypot(b.x-e.x,b.y-(e.y-9))<e.radius+3){
          b.hitIds.push(e.id);this.hit(e,b.power,b.castId);b.pierces--;
          if(b.explosive){for(const other of this.activeEnemies())if(other.id!==e.id&&dist(other,e)<38)this.hit(other,b.power*.65,b.castId);this.emit('explosion',{x:e.x,y:e.y});}
          if(b.pierces<=0){b.life=0;break;}
        }
      }
    }
    this.projectiles=this.projectiles.filter(b=>b.life>0);
    for(const z of this.zones)if(z.until>this.time&&z.nextHit<=this.time){if(dist(z,c.position)<z.radius)this.hurt(6);z.nextHit=this.time+.7;}
    this.zones=this.zones.filter(z=>z.until>this.time);
    for(const [id,cast] of this.castHits)if(cast.until<this.time)this.castHits.delete(id);
  }
  command(type,data={}){
    const c=this.character;
    if(type==='pause'){this.paused=data.paused===true;this.input={x:0,y:0,seq:-1};this.path=[];return {ok:true};}
    if(type==='respawn'){
      requireGame(c.hp<=0&&this.time-(this.deadAt??0)>=1,'NOT_DEAD');c.position={...this.world.spawn};const s=stats(c);c.hp=s.hp;c.mp=s.mp;c.stamina=100;this.deadAt=null;this.invulnerable=this.time+2;this.emit('respawn');return {ok:true};
    }
    requireGame(c.hp>0,'NOT_ALIVE');
    if(type==='cast')return this.cast(data.skill,this.input.aim);
    if(type==='path') {requireGame(Number.isFinite(data.x)&&Number.isFinite(data.y),'INVALID_INPUT');this.path=findPath(this.world,c.position,data);return {ok:this.path.length>0};}
    if(type==='dodge'){
      requireGame(!this.paused,'PAUSED');requireGame(c.stamina>=25,'NO_STAMINA');requireGame(this.time>=(this.cooldowns.dodge??0),'COOLDOWN');const v=this.aim(this.input.aim);for(let i=0;i<15;i++)moveExplorer(this.world,c.position,v.x*4,v.y*4);c.stamina-=25;this.invulnerable=this.time+.22;this.cooldowns.dodge=this.time+1.2;this.path=[];this.emit('dodge',{x:c.position.x,y:c.position.y});return {ok:true};
    }
    if(type==='potion'){
      requireGame(c.potions>0,'NO_POTIONS');requireGame(this.time>=(this.cooldowns.potion??0),'COOLDOWN');const s=stats(c);c.potions--;c.hp=Math.min(s.hp,c.hp+s.hp*.45);c.mp=Math.min(s.mp,c.mp+s.mp*.25);this.cooldowns.potion=this.time+10;this.emit('heal',{x:c.position.x,y:c.position.y});return {ok:true};
    }
    if(type==='pickup'){
      const loot=c.loot.find(l=>l.id===data.lootId)??c.loot.filter(l=>dist(l,c.position)<42).sort((a,b)=>dist(a,c.position)-dist(b,c.position))[0];requireGame(loot&&dist(loot,c.position)<45,'NOT_NEAR_LOOT');
      c.gold+=loot.gold;c.potions+=loot.potions;c.materials+=loot.materials;c.loot=c.loot.filter(l=>l.id!==loot.id);this.emit('pickup',{gold:loot.gold});return {ok:true};
    }
    if(type==='unequip'){requireGame(this.time>this.combatUntil||this.isSafe(),'IN_COMBAT');requireGame(Object.hasOwn(c.equipment,data.slot),'ITEM_NOT_FOUND');delete c.equipment[data.slot];const s=stats(c);c.hp=Math.min(c.hp,s.hp);c.mp=Math.min(c.mp,s.mp);return {ok:true};}
    if(type==='equip'){requireGame(this.time>this.combatUntil||this.isSafe(),'IN_COMBAT');equip(c,data.itemId);return {ok:true};}
    if(type==='learn'){requireGame(this.time>this.combatUntil||this.isSafe(),'IN_COMBAT');learn(c,data.skillId);return {ok:true};}
    if(type==='return'){requireGame(this.time>this.combatUntil,'IN_COMBAT');c.position={...this.world.spawn};this.path=[];return {ok:true};}
    requireGame(this.isSafe(),'RETURN_TO_CAMP');
    if(type==='rest'){const s=stats(c);c.hp=s.hp;c.mp=s.mp;c.potions=Math.max(3,c.potions);return {ok:true};}
    if(type==='refund'){refund(c);return {ok:true};}
    if(type==='claim'){
      const q=questProgress(c);requireGame(q.ready,'QUEST_NOT_READY');requireGame(c.inventory.length<60,'BAG_FULL');
      grantXp(c,xpToLevel(c,q.targetLevel));c.gold+=q.gold;
      if(q.item)c.inventory.push({...itemDefinition(c.classId,q.item,q.rarity),id:this.makeId()});
      if(q.id==='boss'){c.bossCleared=true;this.emit('victory');}c.questIndex++;this.emit('quest',{questId:q.id});return {ok:true};
    }
    if(type==='buy'){
      if(data.item==='potion'){requireGame(c.gold>=10,'NO_GOLD');c.gold-=10;c.potions++;return {ok:true};}
      requireGame(['weapon','helmet','chest','gloves','boots','offhand'].includes(data.item),'INVALID_ITEM');const i=itemDefinition(c.classId,data.item);requireGame(c.level>=i.minLevel,'LEVEL_REQUIRED');requireGame(c.inventory.length<60,'BAG_FULL');requireGame(c.gold>=i.price,'NO_GOLD');c.gold-=i.price;c.inventory.push({...i,id:this.makeId()});return {ok:true};
    }
    if(type==='sell'){const i=c.inventory.find(i=>i.id===data.itemId);requireGame(i,'ITEM_NOT_FOUND');requireGame(!Object.values(c.equipment).includes(i.id),'ITEM_EQUIPPED');c.gold+=Math.max(1,Math.floor(i.price*.35));c.inventory=c.inventory.filter(k=>k.id!==i.id);return {ok:true};}
    throw new GameError('UNKNOWN_COMMAND');
  }
  snapshot(){
    const c=this.character;return {time:this.time,paused:this.paused,character:{...structuredClone(c),ownerId:undefined},stats:stats(c),quest:questProgress(c),cooldowns:Object.fromEntries(Object.entries(this.cooldowns).map(([id,t])=>[id,Math.max(0,t-this.time)])),moving:this.moving,facing:this.facing,attacking:this.attackUntil>this.time,safe:this.isSafe(),enemies:this.activeEnemies().map(e=>({...e})),projectiles:this.projectiles.map(p=>({...p})),zones:this.zones.map(z=>({...z})),bossUnlocked:c.questIndex>=4};
  }
}
