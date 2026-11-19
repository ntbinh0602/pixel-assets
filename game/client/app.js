import {I18n} from './i18n.js';
import {Renderer} from './renderer.js';
import {portrait,appearanceFor} from './avatar.js';
import {CONTENT,availablePoints,xpNeeded,skillsFor,itemDefinition,slotLevel} from '../shared/rules.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const durable=new Set(['respawn','potion','pickup','equip','unequip','learn','refund','claim','rest','buy','sell','return']);
const button=(text,attrs='',kind='')=>`<button type="button" class="nw-button ${kind}" ${attrs}>${text}</button>`;
export class NightwoodGame {
  constructor(root){this.root=root;this.i18n=new I18n();this.keys=new Set();this.pending=new Map();this.seq=0;this.active=false;this.phase='auth';this.authMode=new URLSearchParams(location.search).has('token')?'reset':'signin';this.selectedClass='warrior';this.ready=this.init();}
  t(key,vars){return this.i18n.t(key,vars);}
  async api(path,data,method='POST'){
    const r=await fetch(path,{method:method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},...(data?{body:JSON.stringify(data)}:{})});
    let result;try{result=await r.json();}catch{throw {code:'SERVER_ERROR'};}if(!r.ok)throw {code:r.status===429?'RATE_LIMITED':result.code??'SERVER_ERROR'};return result;
  }
  async init(){
    await this.i18n.load();this.mount();this.bind();this.renderer=new Renderer(this.$('#forest-canvas'),this.$('.nw-stage'),this.i18n);
    this.portraitTime=0;this.portraitElapsed=0;this.renderer.onFrame=dt=>{if(this.phase!=='lobby')return;this.portraitTime+=dt;this.portraitElapsed+=dt;if(this.portraitElapsed>=1/12){this.drawPortraits();this.portraitElapsed=0;}};
    try{this.health=await this.api('/api/health',null,'GET');await this.loadAccount();}catch(e){this.notify(this.i18n.error(e.code));this.renderAuth();}
    this.localize();
  }
  $(selector){return this.root.querySelector(selector);}
  mount(){this.root.removeAttribute('aria-labelledby');this.root.className='nw-root';this.root.innerHTML=`
    <div class="nw-shell">
      <header class="nw-top"><a class="nw-brand" href="/?view=game"><span class="nw-brand-icon">✦</span><span data-t="title"></span><small>PIXEL ARPG</small></a><div class="nw-top-actions"><span id="nw-user"></span><button type="button" id="nw-language" class="nw-button">English</button><a class="nw-library" href="/" data-t="library"></a><button type="button" id="nw-signout" class="nw-button" data-t="signout" hidden></button></div></header>
      <div class="nw-stage"><canvas id="forest-canvas" width="800" height="500" tabindex="0" data-label="map"></canvas>
        <section class="nw-auth-screen"><div class="nw-auth-story"><span class="nw-eyebrow">NIGHTWOOD SIGILS</span><h1 data-t="title"></h1><p data-t="subtitle"></p><div class="nw-story-line"></div><p class="nw-story-foot" data-t="healthNote"></p></div><div class="nw-auth-card" id="nw-auth-content"></div></section>
        <section class="nw-lobby" hidden><div class="nw-lobby-heading"><span class="nw-eyebrow">NIGHTWOOD SIGILS</span><h1 data-t="choose"></h1><p data-t="chooseHint"></p></div><div id="nw-character-list"></div><form id="nw-create-form"><div id="nw-class-options" class="nw-class-grid"></div><div class="nw-create-row"><label><span data-t="characterName"></span><input id="nw-character-name" name="characterName" minlength="2" maxlength="24" required autocomplete="off"></label><button type="submit" class="nw-button nw-primary" data-t="create"></button></div><p class="nw-muted" data-t="slots"></p></form></section>
        <div class="nw-game-hud" hidden>
          <section class="nw-vitals"><div class="nw-hero-title"><b id="nw-player-name"></b><span id="nw-level"></span></div><div class="nw-meter nw-health"><span id="nw-hp-fill"></span><output id="nw-hp"></output></div><div class="nw-meter nw-mana"><span id="nw-mp-fill"></span><output id="nw-mp"></output></div><div class="nw-meter nw-xp"><span id="nw-xp-fill"></span><output id="nw-xp"></output></div><div class="nw-quest-card"><span data-t="quest"></span><p id="nw-quest-text"></p><b id="nw-quest-count"></b></div></section>
          <section class="nw-utilities"><div class="nw-connection"><span id="nw-connection"></span><small id="nw-save"></small></div><div class="nw-menu-buttons">${button('','data-panel="inventory" data-t="inventory"')}${button('','data-panel="skills" data-t="skills"')}${button('','id="nw-pause" data-t="pause"')}${button('','id="nw-characters" data-t="characters"')}</div><div class="nw-map-info"><b data-t="map"></b><output id="nw-position"></output><span id="nw-gold"></span></div></section>
          <section class="nw-camp" hidden><span data-t="guardian"></span><div>${button('','data-command="rest" data-t="rest"')}${button('','data-panel="shop" data-t="shop"')}${button('','id="nw-claim" data-command="claim" data-t="claim"','nw-primary')}</div></section>
          <div class="nw-touch-pad"><button type="button" data-key="ArrowUp" aria-label="↑">↑</button><button type="button" data-key="ArrowLeft" aria-label="←">←</button><button type="button" data-key="ArrowDown" aria-label="↓">↓</button><button type="button" data-key="ArrowRight" aria-label="→">→</button></div>
          <section class="nw-hotbar"><div class="nw-stamina"><span id="nw-stamina-fill"></span></div><div class="nw-action-row">${button('','data-attack="true" data-t="attack"')}<div id="nw-skill-buttons"></div>${button('','data-command="dodge" data-t="dodge"')}${button('','data-command="potion" id="nw-potion"')}${button('','id="nw-interact" data-t="interact"')}</div><p data-t="controls"></p></section>
        </div>
        <div class="nw-overlay" id="nw-paused" hidden><span class="nw-eyebrow">NIGHTWOOD</span><h2 data-t="paused"></h2><p data-t="pausedHint"></p>${button('','id="nw-resume" data-t="resume"','nw-primary')}</div>
        <div class="nw-overlay" id="nw-dead" hidden><h2 data-t="dead"></h2><p data-t="deadHint"></p>${button('','data-command="respawn" data-t="respawn"','nw-primary')}</div>
        <div class="nw-overlay" id="nw-disconnected" hidden><h2 id="nw-disconnect-text"></h2>${button('','id="nw-reconnect" data-t="takeover"','nw-primary')}</div>
        <div class="nw-overlay" id="nw-victory" hidden><span class="nw-eyebrow">NIGHTWOOD</span><h2 data-t="victory"></h2><p data-t="victoryHint"></p>${button('','id="nw-continue" data-t="continue"','nw-primary')}</div>
      </div>
      <div id="nw-toast" class="nw-toast" role="status" hidden></div>
      <dialog id="nw-panel"><div class="nw-panel-head"><h2 id="nw-panel-title"></h2>${button('×','id="nw-panel-close" data-label="close"')}</div><div id="nw-panel-content"></div></dialog>
    </div>`;}
  localize(){this.i18n.apply(this.root);this.$('#nw-language').textContent=this.i18n.locale==='vi'?'English':'Tiếng Việt';if(this.phase==='auth')this.renderAuth();if(this.phase==='lobby')this.renderLobby();if(this.state)this.updateHud();if(this.panel)this.renderPanel();}
  notify(message){this.$('#nw-toast').textContent=message;this.$('#nw-toast').hidden=false;clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>this.$('#nw-toast').hidden=true,3500);}
  setPhase(phase){this.phase=phase;this.$('.nw-auth-screen').hidden=phase!=='auth';this.$('.nw-lobby').hidden=phase!=='lobby';this.$('.nw-game-hud').hidden=phase!=='play';this.$('#nw-signout').hidden=!this.me;this.$('#nw-user').textContent=this.me?.user.name??'';}
  renderAuth(){
    this.setPhase('auth');const mode=this.authMode,signup=mode==='signup',forgot=mode==='forgot',reset=mode==='reset',verify=mode==='verify';
    const oldEmail=this.$('#nw-email')?.value??this.lastEmail??'';
    this.$('#nw-auth-content').innerHTML=`<span class="nw-eyebrow">NIGHTWOOD SIGILS</span><h2>${this.t(signup?'join':reset?'reset':forgot?'forgot':'welcome')}</h2>${verify?`<p>${this.t('verify')}</p>${button(this.t('resend'),'data-auth-mode="resend"')}${button(this.t('verifyHelp'),'data-auth-mode="signin"')}`:`<form id="nw-auth-form">${signup?`<label>${this.t('accountName')}<input name="name" minlength="2" maxlength="40" required autocomplete="name"></label>`:''}${!reset?`<label>${this.t('email')}<input id="nw-email" name="email" type="email" value="${esc(oldEmail)}" required autocomplete="email"></label>`:''}${!forgot?`<label>${this.t(reset?'newPassword':'password')}<input name="password" type="password" minlength="10" maxlength="128" required autocomplete="${signup||reset?'new-password':'current-password'}" placeholder="${this.t('passwordHint')}"></label>`:''}<button type="submit" class="nw-button nw-primary" id="nw-auth-submit">${this.t(signup?'signup':forgot?'sendReset':reset?'reset':'signin')}</button></form>`}<p id="nw-auth-error" class="nw-form-error" role="alert"></p><div class="nw-auth-links">${!verify?button(this.t(mode==='signin'?'signup':'signin'),`data-auth-mode="${mode==='signin'?'signup':'signin'}"`):''}${mode==='signin'?button(this.t('forgot'),'data-auth-mode="forgot"'):''}</div><p class="nw-muted">${this.t('authNote')}</p>${this.health?.localMail?`<div class="nw-local-mail"><p>${this.t('localMailNote')}</p><a href="http://localhost:8025" target="_blank" rel="noreferrer">${this.t('localMail')}</a></div>`:''}`;
  }
  async loadAccount(){
    try{this.me=await this.api('/api/me',null,'GET');this.i18n.set(this.me.profile.locale);const r=await this.api('/api/characters',null,'GET');this.characters=r.characters;this.renderLobby();this.localize();}
    catch(e){if(e.code==='UNAUTHORIZED'||e.code==='EMAIL_NOT_VERIFIED'){this.me=null;this.renderAuth();}else throw e;}
  }
  renderLobby(){
    this.setPhase('lobby');const chars=this.characters??[];
    this.$('#nw-character-list').innerHTML=chars.map(row=>{const c=row.data;return `<button type="button" class="nw-character-card" data-play="${esc(c.id)}"><canvas data-portrait="${c.classId}" data-character="${esc(c.id)}"></canvas><span><strong>${esc(c.name)}</strong><small>${this.t(c.classId)} · ${this.t('level')} ${c.level}</small></span><b>${this.t('play')}</b></button>`;}).join('');
    this.$('#nw-class-options').innerHTML=CONTENT.classes.map(c=>`<button type="button" data-choose-class="${c.id}" aria-pressed="${this.selectedClass===c.id}" class="nw-class-card"><canvas data-portrait="${c.id}"></canvas><strong>${this.t(c.id)}</strong><span>${this.t(c.id+'Desc')}</span><small>${c.base.hp} HP · ${c.base.mp} MP</small></button>`).join('');
    this.$('#nw-create-form').hidden=chars.length>=3;this.drawPortraits();
    this.i18n.apply(this.root);
  }
  drawPortraits(){for(const canvas of this.root.querySelectorAll('[data-portrait]')){const c=this.characters?.find(row=>row.id===canvas.dataset.character)?.data;portrait(canvas,canvas.dataset.portrait,this.portraitTime??0,c?appearanceFor(c):undefined);}}
  async authenticate(form){
    const mode=this.authMode,data=Object.fromEntries(new FormData(form)),submit=form.querySelector('button[type=submit]');submit.disabled=true;this.lastEmail=data.email??this.lastEmail;
    const callbackURL=location.origin+'/?view=game';
    try{
      if(mode==='forgot'){await this.api('/api/auth/request-password-reset',{email:data.email,redirectTo:callbackURL+'&reset=1'});this.notify(this.t('resetSent'));this.authMode='signin';this.renderAuth();}
      else if(mode==='reset'){await this.api('/api/auth/reset-password',{newPassword:data.password,token:new URLSearchParams(location.search).get('token')});history.replaceState(null,'','/?view=game');this.authMode='signin';this.renderAuth();this.notify(this.t('resetDone'));}
      else if(mode==='signup'){await this.api('/api/auth/sign-up/email',{...data,callbackURL});this.authMode='verify';this.renderAuth();}
      else {await this.api('/api/auth/sign-in/email',{...data,callbackURL});await this.loadAccount();}
    }catch(e){if(e.code==='EMAIL_NOT_VERIFIED'){this.authMode='verify';this.renderAuth();}else this.$('#nw-auth-error').textContent=this.i18n.error(e.code);}
    finally{submit.disabled=false;}
  }
  bind(){
    this.root.addEventListener('submit',e=>{e.preventDefault();if(e.target.id==='nw-auth-form')void this.authenticate(e.target);if(e.target.id==='nw-create-form')void(async()=>{const button=e.target.querySelector('button[type=submit]');button.disabled=true;try{await this.api('/api/characters',{name:this.$('#nw-character-name').value,classId:this.selectedClass});await this.loadAccount();}catch(error){this.notify(this.i18n.error(error.code));}finally{button.disabled=false;}})();});
    this.root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      if(b.id==='nw-language')void(async()=>{this.i18n.set(this.i18n.locale==='vi'?'en':'vi');this.localize();if(this.me)try{await this.api('/api/profile',{locale:this.i18n.locale},'PATCH');}catch(error){this.notify(this.i18n.error(error.code));}})();
      if(b.dataset.authMode){if(b.dataset.authMode==='resend')void this.api('/api/auth/send-verification-email',{email:this.lastEmail,callbackURL:location.origin+'/?view=game'}).then(()=>this.notify(this.t('verify'))).catch(error=>this.notify(this.i18n.error(error.code)));else{this.authMode=b.dataset.authMode;this.renderAuth();}}
      if(b.dataset.chooseClass){this.selectedClass=b.dataset.chooseClass;this.renderLobby();}
      if(b.dataset.play)void this.play(b.dataset.play);
      if(b.dataset.panel)this.openPanel(b.dataset.panel);
      if(b.dataset.command)void this.command(b.dataset.command,JSON.parse(b.dataset.args??'{}')).catch(()=>{});
      if(b.id==='nw-signout')void this.signOut();
      if(b.id==='nw-panel-close')this.$('#nw-panel').close();
      if(b.id==='nw-pause'||b.id==='nw-resume')void this.command('pause',{paused:!this.state?.paused}).catch(()=>{});
      if(b.id==='nw-characters'){this.disconnect();this.state=null;this.renderer.update(null);void this.loadAccount();}
      if(b.id==='nw-reconnect')void this.play(this.characterId);
      if(b.id==='nw-continue')this.$('#nw-victory').hidden=true;
      if(b.id==='nw-interact')this.interact();
    });
    this.$('#nw-panel').addEventListener('close',()=>{this.panel=null;if(!this.prePanelPause&&this.socket?.readyState===1)void this.command('pause',{paused:false}).catch(()=>{});});
    window.addEventListener('keydown',e=>{
      if(!this.active||this.phase!=='play'||this.$('#nw-panel').open||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}
      if(e.repeat)return;
      const command={Digit1:()=>this.castSlot(0),Digit2:()=>this.castSlot(1),Space:()=>void this.command('dodge').catch(()=>{}),KeyQ:()=>void this.command('potion').catch(()=>{}),KeyE:()=>this.interact(),KeyI:()=>this.openPanel('inventory'),KeyK:()=>this.openPanel('skills'),KeyP:()=>void this.command('pause',{paused:!this.state?.paused}).catch(()=>{})}[e.code];
      if(command){e.preventDefault();command();}
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>{this.keys.clear();this.attacking=false;});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.keys.clear();this.attacking=false;if(this.socket?.readyState===1)void this.command('pause',{paused:true}).catch(()=>{});}});
    const c=this.$('#forest-canvas');c.addEventListener('contextmenu',e=>e.preventDefault());
    c.addEventListener('pointermove',e=>{this.aim=this.renderer.point(e.clientX,e.clientY);});
    c.addEventListener('pointerdown',e=>{if(this.phase!=='play')return;this.aim=this.renderer.point(e.clientX,e.clientY);c.focus({preventScroll:true});
      if(e.button===2||e.pointerType==='touch'&&!this.state?.enemies.some(m=>Math.hypot(m.x-this.aim.x,m.y-this.aim.y)<35))void this.command('path',this.aim).catch(()=>{});else {this.attacking=true;c.setPointerCapture(e.pointerId);}
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(event,()=>this.attacking=false);
    for(const b of this.root.querySelectorAll('[data-key],[data-attack]')){
      b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(b.dataset.key)this.keys.add(b.dataset.key);else {this.aim=null;this.attacking=true;}});
      for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>{if(b.dataset.key)this.keys.delete(b.dataset.key);else this.attacking=false;});
    }
  }
  interact(){if(!this.state)return;const loot=this.state.character.loot.find(l=>Math.hypot(l.x-this.state.character.position.x,l.y-this.state.character.position.y)<45);if(loot)void this.command('pickup',{lootId:loot.id}).catch(()=>{});else if(this.state.safe)void this.command(this.state.quest.ready?'claim':'rest').catch(()=>{});else this.notify(this.t('error.RETURN_TO_CAMP'));}
  activate(active){this.active=active;this.renderer?.activate(active);if(!active){this.keys.clear();this.attacking=false;this.disconnect();}else if(this.characterId&&this.phase==='play'&&!this.socket)void this.play(this.characterId);}
  disconnect(){this.intentionalClose=true;clearInterval(this.inputTimer);clearTimeout(this.retryTimer);this.socket?.close();this.socket=null;for(const [id,p] of this.pending){p.reject({code:'UNAUTHORIZED'});clearTimeout(p.timer);this.pending.delete(id);}this.$('#nw-disconnected').hidden=true;}
  async signOut(){this.disconnect();try{await this.api('/api/auth/sign-out',{});}catch{}this.me=null;this.state=null;this.characterId=null;this.renderer.update(null);this.authMode='signin';this.renderAuth();this.localize();}
  async play(id){
    clearTimeout(this.retryTimer);this.characterId=id;this.intentionalClose=false;this.setPhase('play');this.$('#nw-disconnected').hidden=false;this.$('#nw-disconnect-text').textContent=this.t('connecting');
    const url=new URL('/api/play',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';url.searchParams.set('character',id);
    if(this.socket){this.intentionalClose=true;this.socket.close();}this.intentionalClose=false;
    const socket=new WebSocket(url);this.socket=socket;this.seq=0;
    socket.addEventListener('message',e=>{const message=JSON.parse(e.data);
      if(message.type==='hello'||message.type==='state'||message.type==='ack'){if(message.state){this.state=message.state;this.renderer.update(message.state);this.updateHud();}}
      if(message.type==='hello'){this.$('#nw-disconnected').hidden=true;this.$('#nw-victory').hidden=true;this.savedAt=message.savedAt;for(const p of this.pending.values())if(p.durable)socket.send(JSON.stringify(p.payload));}
      if(message.type==='ack'){const p=this.pending.get(message.id);if(p){clearTimeout(p.timer);this.pending.delete(message.id);p.resolve(message.result);}if(this.panel)this.renderPanel();}
      if(message.type==='saved'){this.savedAt=message.savedAt;this.updateHud();}
      if(message.type==='events')for(const event of message.events){this.renderer.event(event);if(event.type==='level')this.notify(this.t('earnedLevel',{level:event.level}));if(event.type==='quest')this.notify(this.t('reward'));if(event.type==='pickup')this.notify(this.t('picked',{gold:event.gold}));if(event.type==='victory')this.$('#nw-victory').hidden=false;}
      if(message.type==='error'){const p=this.pending.get(message.id);if(p){clearTimeout(p.timer);this.pending.delete(message.id);p.reject({code:message.code});}if(message.code!=='COOLDOWN')this.notify(this.i18n.error(message.code));}
    });
    socket.addEventListener('open',()=>{clearInterval(this.inputTimer);this.inputTimer=setInterval(()=>this.sendInput(),80);this.sendInput();});
    socket.addEventListener('close',e=>{
      if(this.socket!==socket)return;this.socket=null;clearInterval(this.inputTimer);if(this.intentionalClose)return;
      this.$('#nw-disconnected').hidden=false;this.$('#nw-disconnect-text').textContent=this.t(e.code===4001?'transferred':'reconnecting');
      for(const [id,p] of this.pending)if(!p.durable){clearTimeout(p.timer);p.reject({code:'SERVER_ERROR'});this.pending.delete(id);}
      if(e.code===4003){this.characterId=null;this.state=null;this.me=null;this.renderer.update(null);this.authMode='signin';this.renderAuth();this.$('#nw-disconnected').hidden=true;this.notify(this.t('sessionExpired'));}
      else if(e.code!==4001)this.retryTimer=setTimeout(()=>{if(this.active&&this.phase==='play')void this.play(id);},1800);
    });socket.addEventListener('error',()=>{});
  }
  sendInput(){if(!this.active||this.phase!=='play'||this.socket?.readyState!==1||document.hidden)return;const k=(...v)=>v.some(key=>this.keys.has(key));this.socket.send(JSON.stringify({type:'input',seq:++this.seq,x:Number(k('KeyD','ArrowRight'))-Number(k('KeyA','ArrowLeft')),y:Number(k('KeyS','ArrowDown'))-Number(k('KeyW','ArrowUp')),sprint:k('ShiftLeft','ShiftRight'),attack:this.attacking===true,...(this.aim?{aim:this.aim}:{})}));}
  command(command,data={}){
    if(this.socket?.readyState!==1)return Promise.reject({code:'UNAUTHORIZED'});
    const id=crypto.randomUUID(),payload={type:'command',id,command,data};
    const promise=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{const p=this.pending.get(id);if(!p)return;if(p.durable){this.notify(this.t('saving'));this.socket?.close();}else{this.pending.delete(id);reject({code:'SERVER_ERROR'});}},12000);this.pending.set(id,{resolve,reject,timer,payload,durable:durable.has(command)});this.socket.send(JSON.stringify(payload));});
    return promise.catch(error=>{if(error.code!=='COOLDOWN')this.notify(this.i18n.error(error.code));throw error;});
  }
  castSlot(index){const s=skillsFor(this.state.character.classId)[index];if(s)void this.command('cast',{skill:s.id}).catch(()=>{});}
  updateHud(){
    if(!this.state)return;const {character:c,stats:s,quest:q}=this.state;
    this.$('#nw-player-name').textContent=c.name;this.$('#nw-level').textContent=this.t(c.classId)+' · '+this.t('level')+' '+c.level;
    for(const [key,value,max] of [['hp',c.hp,s.hp],['mp',c.mp,s.mp],['xp',c.xp,xpNeeded(c.level)]]){this.$('#nw-'+key+'-fill').style.width=(c.level===5&&key==='xp'?100:Math.max(0,Math.min(100,value/max*100)))+'%';this.$('#nw-'+key).textContent=key==='xp'?(c.level===5?this.t('cap'):`XP ${Math.floor(value)} / ${max}`):`${key.toUpperCase()} ${Math.ceil(value)} / ${Math.ceil(max)}`;}
    this.$('#nw-stamina-fill').style.width=c.stamina+'%';this.$('#nw-position').textContent=Math.round(c.position.x)+' / '+Math.round(c.position.y);this.$('#nw-gold').textContent=this.t('gold')+' '+c.gold;
    this.$('#nw-connection').textContent=this.t(this.socket?.readyState===1?'online':'connecting');
    this.$('#nw-save').textContent=this.savedAt?this.t('saved')+' '+new Date(this.savedAt).toLocaleTimeString(this.i18n.locale==='vi'?'vi-VN':'en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):this.t('saving');
    this.$('#nw-quest-text').textContent=this.t('quest.'+q.id);this.$('#nw-quest-count').textContent=q.complete?'':q.ready?this.t('ready'):`${q.current} / ${q.count}`;
    this.$('.nw-camp').hidden=!this.state.safe;this.$('#nw-claim').disabled=!q.ready;this.$('#nw-potion').textContent=this.t('potion')+' '+c.potions;
    this.$('#nw-paused').hidden=!this.state.paused||this.$('#nw-panel').open;this.$('#nw-pause').textContent=this.t(this.state.paused?'resume':'pause');this.$('#nw-dead').hidden=c.hp>0;
    this.$('#nw-skill-buttons').innerHTML=skillsFor(c.classId).map((skill,index)=>{const cd=this.state.cooldowns[skill.id]??0,rank=c.skills[skill.id]??0;return button(`<kbd>${index+1}</kbd><span>${esc(skill.name[this.i18n.locale])}</span><small>${cd>.05?cd.toFixed(1)+'s':rank?this.t('rank')+' '+rank:this.t('learnAt',{level:skill.minLevel})}</small>`,`data-skill="${skill.id}" ${!rank||cd>.05?'disabled':''}`,'nw-skill');}).join('');
    for(const b of this.root.querySelectorAll('[data-skill]'))b.onclick=()=>void this.command('cast',{skill:b.dataset.skill}).catch(()=>{});
  }
  openPanel(panel){if(!this.state)return;this.panel=panel;this.prePanelPause=this.state.paused;this.renderPanel();this.$('#nw-panel').showModal();void this.command('pause',{paused:true}).catch(()=>{});}
  itemName(item){const type=item.slot==='weapon'?{warrior:'sword',mage:'staff',archer:'bow'}[item.classId]:item.slot==='offhand'?{warrior:'shield',mage:'book',archer:'quiver'}[item.classId]:item.slot;return this.i18n.locale==='vi'?this.t(type)+' '+this.t('novice'):this.t('novice')+' '+this.t(type);}
  renderPanel(){
    const c=this.state.character,t=this.t.bind(this);this.$('#nw-panel-title').textContent=t(this.panel);
    if(this.panel==='inventory'){
      this.$('#nw-panel-content').innerHTML=`<div class="nw-panel-stats">${t('gold')} <b>${c.gold}</b> · ${t('materials')} <b>${c.materials}</b><br>${t('power')} ${this.state.stats.power} · ${t('armor')} ${this.state.stats.armor.toFixed(1)}</div><div class="nw-equipment-slots">${Object.entries(slotLevel).map(([slot,lv])=>`<div><span>${t(slot)}</span><b>${lv>c.level?t('requires')+' '+lv:c.equipment[slot]?'✓': '—'}</b></div>`).join('')}</div><div class="nw-item-list">${c.inventory.map(item=>{const worn=c.equipment[item.slot]===item.id;return `<article class="nw-item ${worn?'worn':''}"><span class="nw-item-icon">${item.slot==='weapon'?'⚔':item.slot==='offhand'?'◈':'▣'}</span><div><strong>${esc(this.itemName(item))}</strong><small>${t(item.rarity)} · ${t('requires')} ${item.minLevel} · ${t(c.classId)}</small><p>${item.power?'+'+item.power+' '+t('power')+' ':''}${item.armor?'+'+item.armor+' '+t('armor')+' ':''}${item.hp?'+'+item.hp+' HP ':''}${item.mp?'+'+item.mp+' MP':''}</p></div><div class="nw-item-actions">${button(t(worn?'unequip':'equip'),`${item.minLevel>c.level?'disabled':''} data-command="${worn?'unequip':'equip'}" data-args='${esc(JSON.stringify(worn?{slot:item.slot}:{itemId:item.id}))}'`)}${!worn?button(t('sell'),`data-command="sell" data-args='${esc(JSON.stringify({itemId:item.id}))}'`):''}</div></article>`;}).join('')}</div>`;
    }else if(this.panel==='skills'){
      this.$('#nw-panel-content').innerHTML=`<div class="nw-panel-stats">${t('points')}: <b>${availablePoints(c)}</b></div><div class="nw-skill-list">${CONTENT.allSkills.filter(s=>s.classId===c.classId).map(s=>{const rank=c.skills[s.id]??0,required=s.minLevel+rank*5;return `<article class="nw-skill-info"><div><strong>${esc(s.name[this.i18n.locale])}</strong><small>${t('rank')} ${rank} / 5 · ${t('requires')} ${required}</small><p>${s.basePowerCoefficient?Math.round(s.basePowerCoefficient*100)+'% '+t('power')+' · ':''}${s.baseMana} MP · ${s.baseCooldownSeconds}s</p></div>${button(t(rank?'upgrade':'learn'),`data-command="learn" data-args='${esc(JSON.stringify({skillId:s.id}))}' ${rank>=5||c.level<required||availablePoints(c)<=0?'disabled':''}`)}</article>`;}).join('')}</div>${button(t('refund'),'data-command="refund"')}`;
    }else if(this.panel==='shop'){
      this.$('#nw-panel-content').innerHTML=`<div class="nw-panel-stats">${t('gold')}: <b>${c.gold}</b></div><div class="nw-item-list">${['potion','weapon','helmet','chest','gloves','boots','offhand'].map(slot=>{const item=slot==='potion'?null:itemDefinition(c.classId,slot),price=item?.price??10;return `<article class="nw-item"><div><strong>${item?esc(this.itemName(item)):t('potion')}</strong><small>${item?t('requires')+' '+item.minLevel:t('potionDesc')}</small></div>${button(t('buy')+' · '+price,`data-command="buy" data-args='${esc(JSON.stringify({item:slot}))}' ${c.gold<price||item&&c.level<item.minLevel?'disabled':''}`)}</article>`;}).join('')}</div>`;
    }
  }
}
