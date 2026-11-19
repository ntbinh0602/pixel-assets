import { CONTENT } from './content.js';
export { CONTENT };
export const CAP = CONTENT.releaseLevelCap;
export class GameError extends Error { constructor(code, status=400) { super(code); this.code=code; this.status=status; } }
export const requireGame = (condition, code, status=400) => { if(!condition) throw new GameError(code,status); };
export const classDef = id => CONTENT.classes.find(c=>c.id===id);
export const skillsFor = id => CONTENT.skills.filter(s=>s.classId===id);
export const totalPoints = level => 1+Math.floor(level/2);
export const xpNeeded = level => Math.round((20+5*level)*(12+3*level+.08*level*level));
export const availablePoints = c => totalPoints(c.level)-Object.values(c.skills).reduce((a,b)=>a+b,0);
export const slotLevel = {weapon:1,chest:1,boots:1,helmet:2,gloves:4,offhand:5,ring:10,amulet:20};
export const QUESTS = [
  {id:'slime',family:'slime',count:3,targetLevel:2,gold:25,item:'helmet'},
  {id:'bat',family:'bat',count:5,targetLevel:3,gold:35,item:'gloves'},
  {id:'frog',family:'frog',count:5,targetLevel:4,gold:45,item:null},
  {id:'prepare',count:1,targetLevel:5,gold:60,item:'offhand'},
  {id:'boss',family:'boss',count:1,targetLevel:5,gold:150,item:'weapon',rarity:'rare'},
];
export function itemDefinition(classId,slot,rarity='common') {
  const c=classDef(classId);requireGame(c&&slot in slotLevel,'INVALID_ITEM');
  const armorTotal=Math.round(CONTENT.tier.fullArmorBudget*c.armorMultiplier);
  const hpTotal=Math.round(CONTENT.tier.fullGearHpBudget*c.gearHpMultiplier);
  const allocate=(total,weights)=>{const values={helmet:Math.floor(total*weights[0]),gloves:Math.floor(total*weights[2]),boots:Math.floor(total*weights[3])};values.chest=total-Object.values(values).reduce((a,b)=>a+b,0);return values;};
  const armor=allocate(armorTotal,[.2,.45,.15,.2]),hp=allocate(hpTotal,[.2,.5,.1,.2]);
  const mult=rarity==='rare'?1.08:1;
  return {classId,slot,rarity,minLevel:slotLevel[slot],power:slot==='weapon'?Math.round(4*mult):0,armor:Math.round((armor[slot]??0)*mult),hp:Math.round((hp[slot]??0)*mult),mp:slot==='offhand'&&classId==='mage'?8:0,crit:slot==='offhand'&&classId==='archer'?.0025:0,block:slot==='offhand'&&classId==='warrior'?.055:0,price:slot==='weapon'?50:slot==='offhand'?30:slot==='chest'?25:15};
}
export function stats(c) {
  const d=classDef(c.classId),n=c.level-1;
  const s={hp:d.base.hp+d.perLevel.hp*n,mp:d.base.mp+d.perLevel.mp*n,power:d.base.power+d.perLevel.power*n,armor:d.base.armor+d.perLevel.armor*n,speed:d.base.speed,crit:.05,block:0};
  for(const [slot,id] of Object.entries(c.equipment)){
    const item=c.inventory.find(i=>i.id===id);if(!item||item.slot!==slot||item.classId!==c.classId||c.level<item.minLevel)continue;
    for(const key of ['hp','mp','power','armor','crit','block'])s[key]+=item[key]??0;
  }
  s.crit=Math.min(.35,s.crit);return s;
}
export function createCharacter(id,ownerId,name,classId,makeId) {
  requireGame(classDef(classId),'INVALID_CLASS');
  requireGame(typeof name==='string'&&name.trim().length>=2&&name.trim().length<=24&&!/[<>\x00-\x1f]/.test(name),'INVALID_NAME');
  const c={id,ownerId,name:name.trim(),classId,level:1,xp:0,gold:0,position:{x:758,y:626},checkpoint:'camp',skills:{[skillsFor(classId)[0].id]:1},equipment:{},inventory:[],kills:{slime:0,bat:0,frog:0,boss:0},questIndex:0,bossCleared:false,potions:3,materials:0,saveVersion:1,contentVersion:CONTENT.version};
  for(const slot of ['weapon','chest','boots']){const item={...itemDefinition(classId,slot),id:makeId()};c.inventory.push(item);c.equipment[slot]=item.id;}
  const s=stats(c);c.hp=s.hp;c.mp=s.mp;c.stamina=100;return c;
}
export function grantXp(c,amount) {
  requireGame(Number.isSafeInteger(amount)&&amount>=0,'INVALID_XP');
  const before=c.level;if(c.level>=CAP){c.xp=0;return false;}
  c.xp+=amount;
  while(c.level<CAP&&c.xp>=xpNeeded(c.level)){c.xp-=xpNeeded(c.level);c.level++;}
  if(c.level===CAP)c.xp=0;
  if(c.level!==before){const s=stats(c);c.hp=s.hp;c.mp=s.mp;}
  return c.level!==before;
}
export function xpToLevel(c,target) { let result=-c.xp;for(let l=c.level;l<Math.min(CAP,target);l++)result+=xpNeeded(l);return Math.max(0,result); }
export function questProgress(c) {
  const q=QUESTS[c.questIndex];if(!q)return {id:'complete',count:1,current:1,ready:false,complete:true};
  const current=q.id==='prepare'?Number(['helmet','chest','gloves','boots'].every(slot=>c.equipment[slot])):(c.kills[q.family]??0);
  return {...q,current:Math.min(current,q.count),ready:current>=q.count};
}
export function equip(c,itemId) {
  const i=c.inventory.find(i=>i.id===itemId);requireGame(i,'ITEM_NOT_FOUND',404);requireGame(i.classId===c.classId,'WRONG_CLASS');requireGame(c.level>=i.minLevel,'LEVEL_REQUIRED');
  c.equipment[i.slot]=i.id;const s=stats(c);c.hp=Math.min(c.hp,s.hp);c.mp=Math.min(c.mp,s.mp);
}
export function learn(c,skillId) {
  const s=skillsFor(c.classId).find(s=>s.id===skillId);requireGame(s,'INVALID_SKILL');
  const rank=c.skills[skillId]??0;requireGame(rank<5,'MAX_RANK');requireGame(c.level>=s.minLevel+5*rank,'LEVEL_REQUIRED');requireGame(availablePoints(c)>0,'NO_SKILL_POINTS');c.skills[skillId]=rank+1;
}
export function refund(c) { c.skills={[skillsFor(c.classId)[0].id]:1}; }
export function damage(power,armor=0) {return Math.max(1,Math.round(power*100/(100+Math.max(0,armor))));}
export function validateCharacter(c) {
  requireGame(c.saveVersion===1&&classDef(c.classId)&&Number.isInteger(c.level)&&c.level>=1&&c.level<=CAP,'INVALID_SAVE');
  requireGame(Number.isSafeInteger(c.xp)&&c.xp>=0&&(c.level===CAP?c.xp===0:c.xp<xpNeeded(c.level))&&availablePoints(c)>=0,'INVALID_SAVE');
  requireGame(['gold','potions','materials','questIndex'].every(k=>Number.isSafeInteger(c[k])&&c[k]>=0)&&c.questIndex<=QUESTS.length,'INVALID_SAVE');
  const limits=stats(c);requireGame(['hp','mp','stamina'].every(k=>Number.isFinite(c[k])&&c[k]>=0&&c[k]<=(k==='stamina'?100:limits[k]))&&Number.isFinite(c.position.x)&&Number.isFinite(c.position.y),'INVALID_SAVE');
  requireGame(c.inventory.length<=60&&new Set(c.inventory.map(i=>i.id)).size===c.inventory.length,'INVALID_SAVE');
  for(const [id,rank] of Object.entries(c.skills)){
    const s=skillsFor(c.classId).find(s=>s.id===id);requireGame(s&&Number.isInteger(rank)&&rank>=1&&rank<=5&&c.level>=s.minLevel+5*(rank-1),'INVALID_SAVE');
  }
  for(const [slot,id] of Object.entries(c.equipment)){const i=c.inventory.find(i=>i.id===id);requireGame(i&&i.classId===c.classId&&i.slot===slot&&c.level>=i.minLevel,'INVALID_SAVE');}
  return c;
}
