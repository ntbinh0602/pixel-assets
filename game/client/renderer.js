import {createForestWorld,SPECIES} from '../world.js';
import {createTerrain,createTree,createGlow} from '../art.js';
import {createFrame,clearFrame,createFx,composite} from '../../pixelfx/src/core/index.js';
import * as fireflies from '../../pixelfx/src/fx/weather/fireflies.js';
import * as slime from '../../pixelfx/src/fx/critters/slime.js';
import * as bat from '../../pixelfx/src/fx/critters/bat.js';
import * as frog from '../../pixelfx/src/fx/critters/frog.js';
import * as arrow from '../../pixelfx/src/fx/projectiles/arrow.js';
import * as fireball from '../../pixelfx/src/fx/fire/fireball.js';
import * as slash from '../../pixelfx/src/fx/melee/sword-slash.js';
import * as block from '../../pixelfx/src/fx/impacts/shield-block.js';
import * as spark from '../../pixelfx/src/fx/impacts/hit-spark.js';
import * as explosion from '../../pixelfx/src/fx/explosions/small-explosion.js';
import * as nova from '../../pixelfx/src/fx/ice/frost-nova.js';
import * as heal from '../../pixelfx/src/fx/holy/heal.js';
import * as levelup from '../../pixelfx/src/fx/ui/level-up.js';
import {drawAvatar,appearanceFor} from './avatar.js';
import {AvatarMotion} from './avatar-motion.js';

const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
function sprite(mod,opts={}){
  const [w,h]=mod.meta.size,c=canvas(w,h),ctx=c.getContext('2d'),frame=createFrame(w,h),image=ctx.createImageData(w,h),fx=createFx(mod,{x:mod.meta.origin[0],y:mod.meta.origin[1],...opts});
  return {mod,c,fx,render(dt){fx.update(dt);fx.draw(clearFrame(frame));composite(frame,image.data,null);ctx.putImageData(image,0,0);}};
}
export class Renderer {
  constructor(c,stage,i18n){
    this.canvas=c;this.stage=stage;this.i18n=i18n;this.ctx=c.getContext('2d');this.world=createForestWorld();this.terrain=createTerrain(this.world);
    this.trees=this.world.trees.map(t=>({...t,image:createTree(t.type,t.seed)}));this.state=null;this.active=false;this.camera={x:358,y:376};this.time=0;this.last=0;this.elapsedArt=0;this.effects=[];this.floats=[];this.entityPositions=new Map();this.avatar=new AvatarMotion();
    this.sprites={slime:sprite(slime,{hop:5}),boss:sprite(slime,{hop:8,palette:['#071a1b','#123b37','#20644e','#438d55','#77b45b','#c7de85','#f4f0c5']}),bat:sprite(bat),frog:sprite(frog),arrow:sprite(arrow),fire:sprite(fireball)};
    this.back=sprite(fireflies);this.glow=createGlow('255,209,133',48);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(stage);this.resize();
    for(const s of Object.values(this.sprites))s.render(.2);this.back.render(.3);
  }
  resize(){const r=this.stage.getBoundingClientRect();if(r.width<1||r.height<1)return;this.W=r.width<650?400:800;this.H=Math.max(260,Math.min(750,Math.round(this.W*r.height/r.width)));this.canvas.width=this.W;this.canvas.height=this.H;this.ctx.imageSmoothingEnabled=false;this.frame=createFrame(this.W,this.H);this.image=this.ctx.createImageData(this.W,this.H);this.fxCanvas=canvas(this.W,this.H);}
  activate(active){this.active=active;this.last=0;if(active&&!this.raf)this.raf=requestAnimationFrame(t=>this.loop(t));else if(!active){cancelAnimationFrame(this.raf);this.raf=0;}}
  update(state){if(!state||this.state?.character.id!==state.character.id)this.entityPositions.clear();if(state)this.avatar.sync(state);else this.avatar.reset();this.state=state;}
  smooth(id,target,dt){const old=this.entityPositions.get(id);const snap=!old||Math.hypot(old.x-target.x,old.y-target.y)>100||this.state?.paused;const a=1-Math.exp(-dt*24);const next=snap?{x:target.x,y:target.y}:{x:old.x+(target.x-old.x)*a,y:old.y+(target.y-old.y)*a};this.entityPositions.set(id,next);return next;}
  point(clientX,clientY){const r=this.canvas.getBoundingClientRect();return{x:this.camera.x+(clientX-r.left)/r.width*this.W,y:this.camera.y+(clientY-r.top)/r.height*this.H};}
  effect(mod,event,opts={},angle=null){if(angle===null)this.effects.push({fx:createFx(mod,{x:event.x,y:event.y,...opts}),mod});else{const art=sprite(mod,opts);this.effects.push({fx:art.fx,mod,art,x:event.x,y:event.y,angle});}if(this.effects.length>18)this.effects.shift();}
  event(e){
    if(this.state)this.avatar.event(e,this.state.character.classId);
    if(e.type==='hit'){this.floats.push({x:e.x,y:e.y-22,text:String(e.amount),crit:e.crit,life:1});if(this.effects.length<12)this.effect(spark,e,{height:12});}
    if(e.type==='hurt')this.floats.push({x:e.x,y:e.y-35,text:'−'+e.amount,hurt:true,life:1});
    if(e.type==='cast'&&e.classId==='warrior')this.effect(e.skill.endsWith('shield-bash')?block:slash,e,{radius:e.skill==='basic'?36:48},e.angle);
    if(e.type==='explosion')this.effect(explosion,e,{size:.35});
    if(e.type==='nova'){this.effect(nova,e,{reach:80});this.effects[this.effects.length-1].fx.update(.42);}
    if(e.type==='heal')this.effect(heal,e);
    if(e.type==='level')this.effect(levelup,e);
  }
  draw(dt){
    const {ctx,W,H}=this;this.time+=dt;this.elapsedArt+=dt;
    const s=this.state,p=s?{...this.smooth('player',s.character.position,dt),classId:s.character.classId,facing:s.facing,appearance:appearanceFor(s.character),animation:this.avatar.frame(dt,s)}:{...this.world.spawn,classId:'warrior',facing:'down'};
    this.camera.x=Math.max(0,Math.min(this.world.width-W,p.x-W/2));this.camera.y=Math.max(0,Math.min(this.world.height-H,p.y-H/2));
    if(this.entityPositions.size>64){const ids=new Set(['player',...(s?.enemies??[]).map(e=>e.id)]);for(const id of this.entityPositions.keys())if(!ids.has(id))this.entityPositions.delete(id);}
    const cx=Math.floor(this.camera.x),cy=Math.floor(this.camera.y);
    ctx.imageSmoothingEnabled=false;ctx.drawImage(this.terrain,cx,cy,W,H,0,0,W,H);
    if(this.elapsedArt>=1/12){for(const a of Object.values(this.sprites))a.render(this.elapsedArt);this.back.render(this.elapsedArt);this.elapsedArt=0;}
    ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.5;ctx.drawImage(this.back.c,0,0,320,154,0,0,W,H);ctx.restore();
    ctx.save();ctx.translate(-cx,-cy);
    // The camp, keeper and a clearly marked boss arena are world objects.
    ctx.strokeStyle='#aec87555';ctx.setLineDash([3,5]);ctx.beginPath();ctx.ellipse(758,626,86,53,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#132924';ctx.fillRect(732,572,16,23);ctx.fillStyle='#8da782';ctx.fillRect(735,568,10,12);ctx.fillStyle='#dac79c';ctx.fillRect(738,573,5,6);ctx.fillStyle='#d6e69f';ctx.fillRect(739,555,2,5);
    ctx.save();ctx.globalCompositeOperation='screen';ctx.drawImage(this.glow,734-48,590-48);ctx.restore();
    ctx.fillStyle='#e1bc71';ctx.fillRect(728,591,4,6);ctx.fillStyle='#fff1b1';ctx.fillRect(729,591,2,3);
    ctx.strokeStyle=s?.bossUnlocked?'#98bd7999':'#45645188';ctx.beginPath();ctx.ellipse(850,300,95,62,0,0,Math.PI*2);ctx.stroke();
    for(const z of s?.zones??[]){ctx.fillStyle='#6d944044';ctx.beginPath();ctx.ellipse(z.x,z.y,z.radius,z.radius*.65,0,0,Math.PI*2);ctx.fill();}
    for(const e of s?.enemies??[]){if(e.state==='telegraph'){ctx.fillStyle=e.kind==='boss'?'#d56c3c44':'#dfc36d33';ctx.strokeStyle='#f0b46d';ctx.beginPath();ctx.ellipse(e.target.x,e.target.y,e.kind==='boss'?42:e.kind==='frog'?26:20,(e.kind==='boss'?42:e.kind==='frog'?26:20)*.7,0,0,Math.PI*2);ctx.fill();ctx.stroke();}}
    for(const l of s?.character.loot??[]){ctx.fillStyle='#f3d87a';ctx.fillRect(Math.round(l.x)-2,Math.round(l.y)-5,4,5);ctx.fillStyle='#fff2be';ctx.fillRect(Math.round(l.x)-1,Math.round(l.y)-5,2,2);}
    const visible=this.trees.filter(t=>t.x+110*t.scale>cx&&t.x-110*t.scale<cx+W&&t.y>cy&&t.y-230*t.scale<cy+H);
    const entities=[...visible.map(t=>({...t,tree:true})),...(s?.enemies??[]).map(e=>({...e,...this.smooth(e.id,e,dt),enemy:true})),{...p,player:true}].sort((a,b)=>a.y-b.y);
    for(const e of entities){
      if(e.tree){const spec=SPECIES[e.type],occludes=s&&p.y<e.y&&p.y>e.y-spec.height*e.scale&&Math.abs(p.x-e.x)<spec.width*e.scale*.4;ctx.globalAlpha=occludes?.45:1;ctx.drawImage(e.image,Math.round(e.x-spec.width*e.scale/2),Math.round(e.y-(spec.height-8)*e.scale),Math.round(spec.width*e.scale),Math.round(spec.height*e.scale));ctx.globalAlpha=1;}
      else if(e.player){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.4;ctx.drawImage(this.glow,Math.round(p.x)-48,Math.round(p.y)-12-48);ctx.restore();drawAvatar(ctx,p,this.time,s?.moving,s?.attacking);}
      else{
        const art=this.sprites[e.kind],scale=e.kind==='boss'?1.7:e.kind==='bat'?.65:.8,[ox,oy]=art.mod.meta.origin;
        ctx.drawImage(art.c,Math.round(e.x-ox*scale),Math.round(e.y-oy*scale),Math.round(art.c.width*scale),Math.round(art.c.height*scale));
        const width=e.kind==='boss'?64:26,barY=e.y-(e.kind==='boss'?65:e.kind==='bat'?35:35);ctx.fillStyle='#13201e';ctx.fillRect(e.x-width/2,barY,width,3);ctx.fillStyle=e.kind==='boss'?'#ddb174':'#93bd74';ctx.fillRect(e.x-width/2,barY,width*e.hp/e.maxHp,3);
      }
    }
    for(const b of s?.projectiles??[]){const art=this.sprites[b.kind],scale=b.kind==='fire'?.65:.8;ctx.save();ctx.translate(b.x,b.y-9);ctx.rotate(Math.atan2(b.vy,b.vx));ctx.drawImage(art.c,-art.mod.meta.origin[0]*scale,-art.mod.meta.origin[1]*scale,art.c.width*scale,art.c.height*scale);ctx.restore();}
    for(const e of this.effects)if(e.art){e.art.render(dt);ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.angle);ctx.drawImage(e.art.c,-e.mod.meta.origin[0],-e.mod.meta.origin[1]);ctx.restore();}
    ctx.restore();
    if(this.effects.length){clearFrame(this.frame);for(const e of this.effects){if(!e.art)e.fx.update(dt);// Draw world anchors into the camera-offset frame.
      }
      this.frame.ox=cx;this.frame.oy=cy;for(const e of this.effects)if(!e.art)e.fx.draw(this.frame);composite(this.frame,this.image.data,null);this.fxCanvas.getContext('2d').putImageData(this.image,0,0);ctx.drawImage(this.fxCanvas,0,0);this.effects=this.effects.filter(e=>!e.fx.done());}
    ctx.save();ctx.textAlign='center';ctx.font='bold 10px monospace';for(const f of this.floats){f.life-=dt;f.y-=dt*16;ctx.globalAlpha=Math.max(0,f.life);ctx.fillStyle=f.hurt?'#f6a193':f.crit?'#ffe09a':'#f1efd0';ctx.fillText(f.text,Math.round(f.x-cx),Math.round(f.y-cy));}ctx.restore();this.floats=this.floats.filter(f=>f.life>0);
    const v=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.25,W/2,H/2,Math.max(W,H)*.68);v.addColorStop(0,'#06151900');v.addColorStop(1,'#06151999');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
  }
  loop(now){this.raf=0;if(!this.active)return;const dt=Math.min((now-(this.last||now))/1000,.06);this.last=now;if(!document.hidden&&!this.state?.paused)this.draw(dt);this.onFrame?.(dt);this.raf=requestAnimationFrame(t=>this.loop(t));}
}
