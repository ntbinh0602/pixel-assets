// Presentation only: authoritative movement, damage and cooldowns stay on the server.
export const MOTION_DURATION = Object.freeze({attack:.42, cast:.5, shoot:.46, bash:.4, dodge:.3, hurt:.24, death:.72, respawn:.6});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function avatarPose(classId,state='idle',time=0){
  const duration=MOTION_DURATION[state]??1,progress=clamp(time/duration,0,1);
  const count={idle:24,walk:8,run:6}[state],frame=Math.floor(Math.max(0,time)*12),phase=(count?frame%count:frame)/12;
  const walk=state==='walk'||state==='run',cycle=(frame%(state==='run'?6:8))/(state==='run'?6:8)*Math.PI*2,stride=walk?Math.sin(cycle):0;
  const pose={state,time:phase,progress,frame:Math.floor(phase*12),stride,sway:Math.sin(walk?cycle:phase*Math.PI)*1.5,step:Math.round(stride*(state==='run'?6:4)),lift:walk?Math.round(Math.abs(Math.cos(cycle))*2):0,bob:walk?Math.round(Math.abs(stride)*2):Math.round(Math.sin(phase*Math.PI)*.55),lean:state==='run'?2:0,crouch:0,reach:0,swing:-1.1,draw:0,cast:0,flash:state==='hurt'&&progress<.4,fall:0};
  if(['attack','bash','shoot','cast'].includes(state)){
    // Brief anticipation, release at ~0.06 s, then a longer follow-through.
    const release=clamp((time-.04)/.08,0,1),settle=clamp((time-.14)/(duration-.14),0,1);
    pose.reach=Math.round(release*(1-settle)*9);pose.lean=progress<.12?-2:Math.round(release*(1-settle)*5);pose.crouch=progress<.12?3:0;pose.step=Math.round(release*(1-settle)*4);
    pose.swing=progress<.12?-2.2:progress<.36?-.95+(progress-.12)/.24*2.1:1.15-(progress-.36)/.64*2.25;
    pose.draw=state==='shoot'?Math.max(0,1-time/.12):0;
    pose.cast=state==='cast'?Math.sin(Math.PI*progress):0;
    if(state==='bash'){pose.reach+=Math.round((1-settle)*5);pose.swing=-1.2;}
  }
  if(state==='hurt'){pose.lean=-Math.round(Math.sin(Math.PI*progress)*3);pose.crouch=2;}
  if(state==='dodge'){pose.crouch=Math.round(Math.sin(Math.PI*progress)*12);pose.lean=5;pose.step=Math.round(Math.sin(Math.PI*progress)*7);}
  if(state==='death'){pose.fall=clamp((progress-.15)/.65,0,1);pose.crouch=Math.round(pose.fall*22);pose.lean=Math.round(pose.fall*8);}
  if(state==='respawn'){pose.crouch=Math.round((1-progress)*12);pose.cast=Math.sin(Math.PI*progress)*.5;}
  return pose;
}
export class AvatarMotion {
  constructor(){this.reset();}
  reset(snapshot=null){this.id=snapshot?.character.id;this.action=null;this.elapsed=0;this.cycle=0;this.running=false;this.flashTime=0;this.lastSnapshot=null;this.wasAttacking=false;if(snapshot?.character.hp<=0){this.action='death';this.elapsed=MOTION_DURATION.death;}this.lastSnapshot=snapshot;}
  sync(snapshot){
    if(!snapshot)return;
    if(snapshot.character.id!==this.id){this.reset(snapshot);return;}
    const before=this.lastSnapshot;
    if(before&&snapshot.time>before.time){const a=before.character.position,b=snapshot.character.position;this.running=Math.hypot(b.x-a.x,b.y-a.y)/(snapshot.time-before.time)>snapshot.stats.speed*1.2;}
    if(snapshot.character.hp<=0&&before?.character.hp>0)this.trigger('death');
    if(snapshot.character.hp>0&&before?.character.hp<=0)this.trigger('respawn');
    this.lastSnapshot=snapshot;
  }
  trigger(action,skill=''){
    if(this.action==='death'&&action!=='respawn'&&action!=='death')return;
    if(action==='hurt'&&['attack','cast','shoot','bash','dodge'].includes(this.action))return;
    this.action=action;this.skill=skill;this.elapsed=0;if(action==='death')this.flashTime=0;
  }
  event(event,classId){
    if(event.type==='cast')this.trigger(event.skill.endsWith('shield-bash')?'bash':classId==='mage'?'cast':classId==='archer'?'shoot':'attack',event.skill);
    if(event.type==='hurt'){this.flashTime=.15;this.trigger('hurt');}
    if(event.type==='dodge')this.trigger('dodge');
    if(event.type==='player-death')this.trigger('death');
    if(event.type==='respawn')this.trigger('respawn');
  }
  frame(dt,snapshot){
    this.cycle+=dt;this.flashTime=Math.max(0,this.flashTime-dt);
    if(this.action){this.elapsed+=dt;if(this.action!=='death'&&this.elapsed>=(MOTION_DURATION[this.action]??0))this.action=null;}
    // Snapshot fallback covers reconnects in the middle of an attack.
    if(snapshot?.attacking&&!this.wasAttacking&&!this.action)this.trigger(snapshot.character.classId==='mage'?'cast':snapshot.character.classId==='archer'?'shoot':'attack');
    this.wasAttacking=snapshot?.attacking===true;
    return {state:this.action??(snapshot?.moving?(this.running?'run':'walk'):'idle'),time:this.action?this.elapsed:this.cycle,skill:this.skill??'',flash:this.flashTime>0};
  }
}
