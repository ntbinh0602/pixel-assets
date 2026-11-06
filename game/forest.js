import { createFrame, clearFrame, createFx, composite } from '../pixelfx/src/core/index.js';
import * as fireflies from '../pixelfx/src/fx/weather/fireflies.js';
import { createForestWorld, findPath, moveExplorer, SPECIES } from './world.js';
import { createTree, createTerrain, createGlow, drawExplorer } from './art.js';

const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};

export class ForestGame {
  constructor(root) {
    this.root=root;this.canvas=root.querySelector('#forest-canvas');this.ctx=this.canvas.getContext('2d');
    const compact=root.clientWidth<560;
    const W=this.W=compact?400:640,H=this.H=compact?300:400;
    this.canvas.width=W;this.canvas.height=H;this.ctx.imageSmoothingEnabled=false;
    root.querySelector('.forest-stage').style.setProperty('--forest-fit-width',`${W/H*100}dvh`);
    this.world=createForestWorld();this.player={...this.world.spawn,facing:'down'};
    this.camera={x:this.player.x-W/2,y:this.player.y-H/2};this.keys=new Set();this.path=[];
    this.active=false;this.paused=false;this.time=0;this.fxAccum=0;this.last=0;this.frameCount=0;
    this.terrain=createTerrain(this.world);
    this.trees=this.world.trees.map(t=>({...t,sprite:createTree(t.type,t.seed)}));
    this.lantern=createGlow('255,206,119',48);
    // Use the unmodified PixelFX Fireflies asset. Keep its back/front layers;
    // crop its meadow fringe, since the explorable world already has ground grass.
    this.fx=createFx(fireflies,{x:160,y:170,seed:2});
    this.fxFrame=createFrame(320,180);this.fxImage=new ImageData(320,180);
    this.fxBack=makeCanvas(320,180);this.fxFront=makeCanvas(320,180);
    this.renderFireflies(0);
    this.mini=root.querySelector('#forest-minimap');this.mini.width=144;this.mini.height=96;
    this.miniTerrain=makeCanvas(144,96);const m=this.miniTerrain.getContext('2d');m.drawImage(this.terrain,0,0,144,96);
    m.fillStyle='#55714e';for(const t of this.trees)m.fillRect(t.x/this.world.width*144-2,t.y/this.world.height*96-3,4,4);
    this.bind();this.render();
    this.resizeObserver=new ResizeObserver(()=>this.resize());
    this.resizeObserver.observe(this.root);
  }
  resize() {
    if(!this.root.clientWidth)return;
    const compact=this.root.clientWidth<560,W=compact?400:640,H=compact?300:400;
    if(W===this.W&&H===this.H)return;
    this.W=W;this.H=H;this.canvas.width=W;this.canvas.height=H;
    this.root.querySelector('.forest-stage').style.setProperty('--forest-fit-width',`${W/H*100}dvh`);
    this.centerCamera();this.render();
  }
  activate(active) {
    this.active=active;this.keys.clear();this.last=0;
    if(active){this.canvas.focus({preventScroll:true});if(!this.raf)this.raf=requestAnimationFrame(t=>this.loop(t));}
    else {cancelAnimationFrame(this.raf);this.raf=0;}
  }
  setPaused(paused) {
    this.paused=paused;this.keys.clear();this.last=0;
    this.root.querySelector('#forest-pause').textContent=paused?'▶ Tiếp tục':'Ⅱ Tạm dừng';
    this.root.querySelector('#forest-pause').setAttribute('aria-pressed',String(paused));
    this.root.querySelector('#forest-paused').hidden=!paused;
  }
  reset() {
    Object.assign(this.player,this.world.spawn,{facing:'down'});this.path=[];this.keys.clear();this.centerCamera();
    this.setPaused(false);this.announce('Đã trở về bãi cỏ đầu rừng.');this.render();
  }
  centerCamera() {
    const {W,H}=this;
    this.camera.x=Math.max(0,Math.min(this.world.width-W,this.player.x-W/2));
    this.camera.y=Math.max(0,Math.min(this.world.height-H,this.player.y-H/2));
  }
  announce(message){this.root.querySelector('#forest-status').textContent=message;}
  bind() {
    const controlled=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight']);
    window.addEventListener('keydown',e=>{
      if(!this.active||e.ctrlKey||e.metaKey||e.altKey||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
      if(controlled.has(e.code)){e.preventDefault();this.keys.add(e.code);this.path=[];}
      if((e.code==='KeyP'||e.code==='Escape')&&!e.repeat){e.preventDefault();this.setPaused(!this.paused);}
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    window.addEventListener('blur',()=>this.keys.clear());
    document.addEventListener('visibilitychange',()=>{this.keys.clear();this.last=0;});
    this.root.querySelector('#forest-pause').addEventListener('click',()=>{this.setPaused(!this.paused);this.canvas.focus({preventScroll:true});});
    this.root.querySelector('#forest-reset').addEventListener('click',()=>{this.reset();this.canvas.focus({preventScroll:true});});
    this.root.querySelector('#forest-fullscreen').addEventListener('click',async()=>{
      const stage=this.root.querySelector('.forest-stage');
      try{if(document.fullscreenElement)await document.exitFullscreen();else if(stage.requestFullscreen)await stage.requestFullscreen();else this.announce('Trình duyệt này chưa hỗ trợ toàn màn hình.');}catch{this.announce('Không thể bật toàn màn hình trên trình duyệt này.');}
    });
    this.canvas.addEventListener('pointerdown',e=>{
      if(e.button!==0||this.paused)return;
      const {W,H}=this;
      const r=this.canvas.getBoundingClientRect(),target={x:this.camera.x+(e.clientX-r.left)/r.width*W,y:this.camera.y+(e.clientY-r.top)/r.height*H};
      this.path=findPath(this.world,this.player,target);this.canvas.focus({preventScroll:true});
      this.announce(this.path.length?'Đang đi đến điểm đã chọn.':'Hãy chọn bãi cỏ hoặc đường mòn để di chuyển.');
    });
    for(const b of this.root.querySelectorAll('[data-game-key]')){
      const release=e=>{this.keys.delete(b.dataset.gameKey);b.classList.remove('pressed');};
      b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);this.path=[];this.keys.add(b.dataset.gameKey);b.classList.add('pressed');});
      b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
      b.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();this.path=[];this.keys.add(b.dataset.gameKey);}});
      b.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter')release();});
    }
  }
  renderFireflies(dt) {
    this.fx.update(dt);
    for(const [layer,canvas] of [['back',this.fxBack],['front',this.fxFront]]){
      this.fx.draw(clearFrame(this.fxFrame),layer);composite(this.fxFrame,this.fxImage.data,null);
      canvas.getContext('2d').putImageData(this.fxImage,0,0);
    }
  }
  update(dt) {
    this.time+=dt;this.fxAccum+=dt;this.frameCount++;
    const has=(...keys)=>keys.some(k=>this.keys.has(k));
    let dx=Number(has('KeyD','ArrowRight'))-Number(has('KeyA','ArrowLeft'));
    let dy=Number(has('KeyS','ArrowDown'))-Number(has('KeyW','ArrowUp'));
    const speed=has('ShiftLeft','ShiftRight')?108:65;
    if(!dx&&!dy&&this.path.length){
      const next=this.path[0],distance=Math.hypot(next.x-this.player.x,next.y-this.player.y);
      if(distance<Math.max(2,speed*dt)){this.path.shift();}
      else {dx=(next.x-this.player.x)/distance;dy=(next.y-this.player.y)/distance;}
    }
    const length=Math.hypot(dx,dy),before={x:this.player.x,y:this.player.y};
    if(length){
      dx/=length;dy/=length;moveExplorer(this.world,this.player,dx*speed*dt,dy*speed*dt);
      this.player.facing=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';
    }
    this.moving=Math.hypot(this.player.x-before.x,this.player.y-before.y)>.01;
    if(this.path.length&&length&&!this.moving)this.path=[];
    this.centerCamera();
    if(this.fxAccum>=1/24){this.renderFireflies(this.fxAccum);this.fxAccum=0;}
    if(this.frameCount%8===0)this.root.querySelector('#forest-coordinates').textContent=`${Math.round(this.player.x)} / ${Math.round(this.player.y)}`;
  }
  drawAtmosphere(canvas,alpha) {
    const {W,H}=this;
    const ctx=this.ctx;
    const ox=-(this.camera.x*.15%(W)),oy=-(this.camera.y*.1%(H));
    ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=alpha;
    for(let y=0;y<2;y++)for(let x=0;x<2;x++)ctx.drawImage(canvas,0,0,320,154,Math.round(ox+x*W),Math.round(oy+y*H),W,H);
    ctx.restore();
  }
  render() {
    const {W,H}=this;
    const ctx=this.ctx,cx=Math.floor(this.camera.x),cy=Math.floor(this.camera.y);
    ctx.imageSmoothingEnabled=false;ctx.drawImage(this.terrain,cx,cy,W,H,0,0,W,H);
    ctx.save();ctx.translate(-cx,-cy);
    const p=this.world.pond;
    ctx.globalAlpha=.45;ctx.fillStyle='#76a99a';
    for(let i=0;i<9;i++){const xx=p.x-65+(i*29)%140,yy=p.y-45+(i*19)%89+Math.sin(this.time*.65+i)*2;ctx.fillRect(Math.round(xx),Math.round(yy),5+(i%4)*3,1);}
    ctx.globalAlpha=1;ctx.restore();
    this.drawAtmosphere(this.fxBack,.52);
    ctx.save();ctx.translate(-cx,-cy);
    if(this.path.length){const end=this.path[this.path.length-1];ctx.strokeStyle='#b8d381';ctx.globalAlpha=.65;ctx.strokeRect(Math.floor(end.x)-4,Math.floor(end.y)-2,8,4);ctx.globalAlpha=1;}
    const visible=this.trees.filter(t=>t.x+110*t.scale>cx&&t.x-110*t.scale<cx+W&&t.y>cy&&t.y-220*t.scale<cy+H);
    const objects=[...visible,{type:'player',x:this.player.x,y:this.player.y}].sort((a,b)=>a.y-b.y);
    for(const obj of objects){
      if(obj.type==='player'){
        ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.6;ctx.drawImage(this.lantern,Math.round(this.player.x)+9-48,Math.round(this.player.y)-9-48);ctx.restore();
        drawExplorer(ctx,this.player,this.time,this.moving);
      } else {
        const spec=SPECIES[obj.type];
        // Fade only an occluding crown around the explorer, keeping navigation readable.
        const behind=this.player.y<obj.y&&this.player.y>obj.y-spec.height*obj.scale&&Math.abs(this.player.x-obj.x)<spec.width*obj.scale*.42;
        if(behind)ctx.globalAlpha=.55;
        ctx.drawImage(obj.sprite,Math.round(obj.x-spec.width*obj.scale/2),Math.round(obj.y-(spec.height-8)*obj.scale),Math.round(spec.width*obj.scale),Math.round(spec.height*obj.scale));
        ctx.globalAlpha=1;
      }
    }
    ctx.restore();
    this.drawAtmosphere(this.fxFront,.92);
    // Gentle edge falloff directs the eye toward the path and warm lantern.
    const vignette=ctx.createRadialGradient(W/2,H/2,105,W/2,H/2,370);
    vignette.addColorStop(0,'#06131700');vignette.addColorStop(1,'#061317a0');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
    const m=this.mini.getContext('2d');m.drawImage(this.miniTerrain,0,0);
    m.strokeStyle='#b2d594';m.lineWidth=1;m.strokeRect(cx/this.world.width*144+.5,cy/this.world.height*96+.5,W/this.world.width*144,H/this.world.height*96);
    m.fillStyle='#ffe0a2';m.fillRect(this.player.x/this.world.width*144-1,this.player.y/this.world.height*96-1,3,3);
  }
  loop(now) {
    this.raf=0;if(!this.active)return;
    const dt=Math.min((now-(this.last||now))/1000,.04);this.last=now;
    if(!document.hidden&&!this.paused){this.update(dt);this.render();}
    this.raf=requestAnimationFrame(t=>this.loop(t));
  }
}
