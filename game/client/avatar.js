import {avatarPose} from './avatar-motion.js';

// Original 48 x 64 character designs. Feet remain the world-space anchor.
// Extra transparent padding accommodates weapons and attack follow-through.
export const AVATAR = Object.freeze({width:48,height:64,frameWidth:112,frameHeight:88,originX:56,originY:76,worldScale:.78,fps:12});
const PALETTES={
  warrior:{outline:'#14212c',shade:'#283b50',dark:'#3d5268',mid:'#6c8398',light:'#a5bac5',shine:'#e2e5d2',cloth:'#793c40',clothDark:'#402a35',clothLight:'#b25c51',trim:'#c2a35e',trimLight:'#efd49a',leather:'#634435'},
  mage:{outline:'#191c30',shade:'#2c294a',dark:'#453865',mid:'#685389',light:'#9981b3',shine:'#dfcdec',cloth:'#327f89',clothDark:'#214954',clothLight:'#79c4be',trim:'#c8a466',trimLight:'#f1d7a1',leather:'#64503d'},
  archer:{outline:'#12282c',shade:'#233e3d',dark:'#385b4b',mid:'#578068',light:'#8eac77',shine:'#d5dfad',cloth:'#c0a170',clothDark:'#68533e',clothLight:'#e4c68e',trim:'#b38d56',trimLight:'#e6ca8b',leather:'#886041'},
};
const SKIN={shade:'#976c5b',mid:'#c99577',light:'#eac39b',shine:'#f4dbb0'};
const DEFAULT_EQUIPMENT={weapon:true,chest:true,boots:true,helmet:false,gloves:false,offhand:false};
const CACHE=new Map();
const round=Math.round;
function painter(ctx){
 const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(round(x),round(y),Math.max(1,round(w)),Math.max(1,round(h)));};
 const dot=(x,y,c)=>rect(x,y,1,1,c);
 const line=(x0,y0,x1,y1,c,width=1)=>{
  x0=round(x0);y0=round(y0);x1=round(x1);y1=round(y1);const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let error=dx+dy;
  for(let n=0;n<256;n++){rect(x0-Math.floor(width/2),y0-Math.floor(width/2),width,width,c);if(x0===x1&&y0===y1)break;const e=2*error;if(e>=dy){error+=dy;x0+=sx;}if(e<=dx){error+=dx;y0+=sy;}}
 };
 const poly=(points,c,outline)=>{
  const ys=points.map(p=>p[1]);for(let y=Math.floor(Math.min(...ys));y<=Math.ceil(Math.max(...ys));y++){
   const hits=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))hits.push(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]));}
   hits.sort((a,b)=>a-b);for(let i=0;i+1<hits.length;i+=2){const from=Math.ceil(hits[i]),to=Math.floor(hits[i+1]);if(to>=from)rect(from,y,to-from+1,1,c);}
  }
  if(outline)for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];line(...a,...b,outline);}
 };
 return{rect,dot,line,poly};
}
function limb(P,shoulder,elbow,hand,c,gloves=false){
 P.line(...shoulder,...elbow,c.outline,6);P.line(...elbow,...hand,c.outline,5);
 P.line(shoulder[0]-1,shoulder[1],elbow[0]-1,elbow[1],c.dark,4);P.line(...elbow,...hand,c.mid,3);
 P.rect(elbow[0]-2,elbow[1]-1,4,3,c.leather);P.rect(elbow[0]-2,elbow[1]-1,3,1,c.trim);
 P.rect(hand[0]-2,hand[1]-2,4,4,gloves?c.mid:SKIN.mid);P.rect(hand[0]-2,hand[1]-2,3,1,gloves?c.light:SKIN.light);
}
function boots(P,q,c,eq,side,back){
 for(const sign of [-1,1]){
  const x=sign*(side?3:4),step=q.step*sign,lift=Math.max(0,-step)*.45,y=round((side?0:step*(back?-.5:.5))-lift);
  const knee=[x+step*(side?.25:.08)+sign*q.crouch*.2,-11+q.crouch*.2+(side?0:step*.15)],foot=[x+step*(side?.65:.08),y];
  P.line(x,-22+q.crouch,...knee,c.outline,7);P.line(x-1,-21+q.crouch,knee[0]-1,knee[1],c.shade,5);
  P.line(...knee,foot[0],foot[1]-3,c.outline,6);P.line(knee[0]-1,knee[1],foot[0]-1,foot[1]-3,eq.boots?c.leather:c.dark,4);
  P.rect(foot[0]-3,-8+y,6,6,eq.boots?c.leather:c.shade);P.rect(foot[0]-3,-8+y,2,5,eq.boots?c.trim:c.dark);
  P.rect(foot[0]-4,-4+y,8,4,c.outline);P.rect(foot[0]-3,-4+y,7,2,eq.boots?c.mid:c.dark);
  if(eq.boots){P.rect(foot[0]-2,-7+y,4,2,c.dark);P.dot(foot[0]-2,-7+y,c.shine);}
  P.rect(foot[0]-3,y,7,1,'#0b171e');
 }
}
function cape(P,q,c,back,side,classId){
 const sway=round(q.sway+q.step*.25),length=classId==='mage'?30:classId==='archer'?23:25;
 const top=-40+q.bob+q.crouch;
 const pts=side?[[-7,top],[-13,top+6],[-16-q.lean,top+length-4],[-12+sway,top+length],[-4+sway,top+length-2],[2,top+5]]:[[-10,top],[-13,top+11],[-15+sway,top+length-2],[-7+sway,top+length],[0,top+length-2],[9+sway,top+length],[13+sway,top+length-4],[10,top]];
 P.poly(pts,c.clothDark,c.outline);
 P.poly(side?[[-9,top+2],[-12,top+length-4],[-7+sway,top+length-1],[-5,top+7]]:[[-8,top+2],[-11+sway,top+length-3],[-6+sway,top+length-1],[-3,top+3]],c.cloth);
 P.line(-8,top+5,-11+sway,top+length-5,c.clothLight);
 if(back){P.poly([[-5,top+4],[0,top+1],[5,top+4],[4,top+12],[0,top+16],[-4,top+12]],c.dark,c.trim);P.line(0,top+5,0,top+12,c.trimLight);P.line(-3,top+8,3,top+8,c.trim);}
}
function quiver(P,q,c,eq,back,side){
 const x=side?-9:back?5:-10,y=-39+q.bob+q.crouch;
 P.poly([[x-3,y],[x+4,y+2],[x+3,y+24],[x-3,y+22]],c.leather,c.outline);P.rect(x-2,y+4,5,3,c.trim);P.line(x-1,y+8,x-1,y+20,c.clothDark);
 for(let i=0;i<(eq.offhand?5:3);i++){const xx=x-2+i;P.line(xx,y-8-(i%2)*2,xx,y+7,c.trimLight);P.line(xx,y-6-(i%2)*2,xx-2,y-8-(i%2)*2,i%2?c.light:c.shine);}
 if(eq.offhand)P.rect(x-2,y+17,5,2,c.trimLight);
}
function torso(P,q,c,eq,back,side,classId){
 const yy=q.bob+q.crouch,x=q.lean,top=-40+yy;
 P.poly([[x-8,top],[x+8,top],[x+11,top+6],[x+8,top+21],[x-8,top+21],[x-11,top+6]],c.outline);
 P.rect(x-8,top+2,16,17,eq.chest?c.dark:c.clothDark);P.rect(x-7,top+2,6,15,eq.chest?c.mid:c.cloth);
 if(classId==='warrior'&&eq.chest){
  P.poly([[x-7,top+3],[x+7,top+3],[x+6,top+10],[x,top+15],[x-6,top+10]],c.mid,c.shade);P.line(x-6,top+3,x+5,top+3,c.light);P.line(x-5,top+5,x-3,top+10,c.shine);P.line(x,top+5,x,top+12,c.dark);P.rect(x-7,top+14,14,2,c.light);
  for(let i=0;i<2;i++){P.rect(x-8,top+17+i*3,7,2,c.dark);P.rect(x+1,top+17+i*3,7,2,c.shade);P.line(x-7,top+17+i*3,x-3,top+17+i*3,c.light);}
 }else if(classId==='mage'){
  const hem=35-q.crouch;
  P.poly([[x-7,top+5],[x+8,top+5],[x+12,top+hem-2],[x+4,top+hem-0],[x-3,top+hem-3],[x-12,top+hem-1]],eq.chest?c.dark:c.shade,c.outline);
  P.poly([[x-5,top+7],[x-1,top+9],[x-2,top+hem-5],[x-8,top+hem-3]],c.mid);P.line(x-6,top+13,x-9,top+hem-4,c.light);P.line(x+6,top+16,x+9,top+hem-4,c.shade);
  P.line(x-11,top+hem-3,x-3,top+hem-5,c.trim);P.line(x-2,top+hem-5,x+4,top+hem-2,c.trim);P.line(x+5,top+hem-2,x+11,top+hem-4,c.trim);
  P.line(x-2,top+2,x,top+11,c.trim);P.line(x+4,top+2,x,top+11,c.trim);P.rect(x-1,top+10,3,3,c.clothLight);
  if(!back){P.rect(x-2,top+hem-13,3,3,c.trim);P.dot(x-1,top+23,c.trimLight);P.rect(x-4,top+hem-8,2,2,c.clothLight);P.rect(x+3,top+hem-8,2,2,c.clothLight);}
 }else if(classId==='archer'){
  P.poly([[x-5,top+1],[x+7,top+4],[x+5,top+17],[x-6,top+18]],eq.chest?c.leather:c.cloth,c.outline);P.rect(x-4,top+4,3,12,eq.chest?'#a97d52':c.clothLight);
  P.line(x-7,top+1,x+6,top+17,c.clothDark,3);P.line(x-7,top,x+6,top+16,c.trim);
  for(let i=0;i<3;i++)P.rect(x+2,top+5+i*4,2,1,c.trimLight);
  P.poly([[x-8,top+16],[x+7,top+17],[x+10,top+24],[x+1,top+23],[x-2,top+20],[x-9,top+24]],c.dark,c.outline);P.line(x-8,top+22,x-4,top+21,c.light);
 }
 P.rect(x-9,top+18,18,3,c.leather);P.rect(x-2,top+18,4,3,c.trim);P.rect(x-1,top+19,2,1,c.trimLight);
 P.rect(x+6,top+20,5,6,c.clothDark);P.rect(x+6,top+20,5,1,c.trim);
 if(!back){P.rect(x-11,top+19,3,6,c.leather);P.dot(x-10,top+20,c.trimLight);}
}
function head(P,q,c,eq,back,side,classId){
 const x=q.lean,y=-58+q.bob+q.crouch;
 P.rect(x-3,y+14,6,4,SKIN.shade);
 const collar=classId==='warrior'?c.mid:classId==='mage'?c.dark:c.clothDark;
 P.rect(x-6,y+16,12,4,c.outline);P.rect(x-5,y+16,10,3,collar);P.line(x-4,y+16,x+4,y+16,classId==='warrior'?c.light:c.trim);
 P.rect(x-7,y+2,14,13,c.outline);P.rect(x-6,y+3,12,11,SKIN.mid);P.rect(x-5,y+3,8,9,SKIN.light);P.rect(x-5,y+4,2,4,SKIN.shine);
 if(back){P.rect(x-6,y+2,12,12,c.shade);P.rect(x-5,y+2,5,11,c.dark);}
 else{
  if(side){P.rect(x-6,y+3,7,11,c.shade);P.rect(x+5,y+6,2,5,SKIN.light);P.dot(x+4,y+6,c.outline);P.dot(x+5,y+7,SKIN.shade);P.rect(x+3,y+11,3,1,SKIN.shade);}
  else{P.rect(x-4,y+6,2,1,c.outline);P.rect(x+2,y+6,2,1,c.outline);P.dot(x,y+8,SKIN.shade);P.rect(x-1,y+11,3,1,SKIN.shade);P.dot(x+4,y+8,SKIN.mid);}
 }
 if(classId==='warrior'){
  P.poly([[x-8,y+4],[x-8,y],[x-5,y-3],[x+4,y-3],[x+8,y],[x+8,y+4]],c.dark,c.outline);P.rect(x-6,y-1,12,4,c.mid);P.rect(x-5,y-2,7,2,c.light);P.line(x-6,y+2,x+6,y+2,c.shine);
  P.rect(x-8,y+3,3,10,c.shade);P.rect(x-8,y+3,2,7,c.light);P.rect(x+6,y+3,3,10,c.dark);P.rect(x+7,y+3,1,5,c.mid);
  if(eq.helmet){P.rect(x-1,y-4,3,10,c.trim);P.rect(x,y-4,1,8,c.trimLight);P.rect(x+1,y-7,4,4,c.clothLight);if(!back)P.line(x-5,y+7,x+5,y+7,c.mid);}
  P.dot(x-7,y+9,c.trimLight);P.dot(x+7,y+9,c.trim);
 }else if(classId==='mage'){
  const bend=round(q.sway*.5);
  P.poly([[x-10,y+2],[x-7,y-5],[x-3,y-13],[x+2+bend,y-14],[x+4,y-8],[x+8,y+1]],c.dark,c.outline);P.poly([[x-6,y-2],[x-2,y-11],[x+1+bend,y-12],[x,y-3]],c.mid);P.line(x-3,y-9,x,y-13,c.light);
  P.poly([[x-12,y+1],[x+10,y],[x+13,y+3],[x+6,y+5],[x-9,y+4]],c.shade,c.outline);P.line(x-10,y+2,x+10,y+1,c.trim);P.line(x-8,y+3,x+7,y+3,c.light);
  if(eq.helmet){P.rect(x+3,y-3,4,4,c.trim);P.rect(x+4,y-2,2,2,c.clothLight);}
  P.rect(x-7,y+8,2,9,c.shade);P.line(x-7,y+8,x-7,y+14,c.light);
 }else{
  P.poly([[x-9,y+8],[x-9,y],[x-5,y-5],[x+3,y-5],[x+8,y-1],[x+9,y+9],[x+5,y+15],[x+4,y+3],[x-3,y+1],[x-5,y+14]],c.dark,c.outline);
  P.line(x-7,y+1,x-4,y-3,c.light);P.line(x-4,y-3,x+2,y-3,c.mid);P.line(x-7,y+3,x-6,y+11,c.mid);P.line(x+6,y+1,x+7,y+8,c.shade);
  if(back){P.poly([[x-6,y],[x,y-3],[x+6,y],[x+5,y+11],[x,y+14],[x-5,y+11]],c.mid);P.line(x-4,y+2,x-3,y+9,c.light);}
  if(eq.helmet){P.line(x+7,y-1,x+11,y-9,c.trimLight);P.line(x+8,y-3,x+9,y-9,c.clothLight);}
  if(!back){P.rect(x-4,y+12,9,4,c.cloth);P.rect(x-3,y+12,7,1,c.clothLight);}
 }
}
function shield(P,hand,c,back){
 const [x,y]=hand;P.poly([[x-6,y-8],[x+5,y-8],[x+7,y-3],[x+5,y+7],[x,y+11],[x-6,y+6],[x-7,y-3]],c.trim,c.outline);P.poly([[x-4,y-6],[x+3,y-6],[x+4,y-2],[x+3,y+5],[x,y+8],[x-4,y+4]],back?c.leather:c.dark);
 P.line(x-5,y-6,x-5,y+4,c.trimLight);P.rect(x-1,y-4,2,9,c.light);P.rect(x-3,y-1,6,2,c.light);P.dot(x,y,c.shine);
}
function sword(P,hand,q,c,facing,rare){
 const base=facing==='up'?-Math.PI/2:facing==='down'?Math.PI/2:0,a=facing==='up'?base+(q.swing+1.1)*.6:base+q.swing,dx=Math.cos(a),dy=Math.sin(a),nx=-dy,ny=dx;
 const v=(d,w=0)=>[hand[0]+dx*d+nx*w,hand[1]+dy*d+ny*w];
 P.line(...v(-4),...v(3),c.outline,4);P.line(...v(-3),...v(3),c.leather,2);
 P.poly([v(3,-2),v(22,-2),v(28),v(22,2),v(3,2)],c.light,c.outline);P.line(...v(5,-1),...v(24),rare?'#d8f4d9':c.shine);P.line(...v(4,1),...v(22,1),c.mid);
 P.line(...v(2,-5),...v(2,5),c.outline,3);P.line(...v(2,-5),...v(2,5),c.trim,1);P.dot(...v(-4),c.trimLight);P.rect(hand[0]-1,hand[1]-1,3,3,q.flash?c.shine:SKIN.light);
}
function staff(P,hand,q,c,rare){
 const x=hand[0]+1,y=hand[1],lean=q.cast*4,top=[x+lean,-59+q.bob+q.crouch];
 P.line(x,-3,...top,c.outline,4);P.line(x,-4,...top,c.leather,2);P.line(x-1,-5,top[0]-1,top[1]+2,c.trim);
 P.rect(x-2,y-3,5,2,c.trimLight);P.rect(x-2,y+5,5,2,c.trim);P.rect(x-2,y-1,4,4,SKIN.light);
 P.poly([[top[0]-5,top[1]-2],[top[0],top[1]-9],[top[0]+5,top[1]-2],[top[0]+2,top[1]+3],[top[0]-3,top[1]+3]],c.trim,c.outline);
 P.poly([[top[0]-3,top[1]-3],[top[0],top[1]-7],[top[0]+3,top[1]-3],[top[0],top[1]+1]],rare?'#b7e6c2':c.clothLight);P.line(top[0]-1,top[1]-5,top[0]-1,top[1]-2,'#e3fff0');
 if(q.cast>.2){P.dot(top[0]-7,top[1]-4,c.clothLight);P.dot(top[0]+7,top[1],c.shine);P.line(top[0]-2,top[1]-11,top[0]+2,top[1]-11,c.clothLight);}
}
function bow(P,hand,q,c,facing,rare){
 const down=facing==='down',up=facing==='up',forward=up?[0,-.7]:down?[0,.7]:[1,0],perp=up?[1,0]:down?[-1,0]:[0,1];
 const v=(f,w)=>[hand[0]+forward[0]*f+perp[0]*w,hand[1]+forward[1]*f+perp[1]*w];
 const points=[v(0,-17),v(5,-11),v(7,-4),v(7,4),v(5,11),v(0,17)];
 for(let i=0;i<points.length-1;i++){P.line(...points[i],...points[i+1],c.outline,3);P.line(...points[i],...points[i+1],rare?c.trimLight:c.trim,1);}
 const pull=v(-q.draw*10,0);P.line(...points[0],...pull,c.clothLight);P.line(...pull,...points.at(-1),c.clothLight);P.line(...v(5,-2),...v(5,2),c.leather,3);
 if(q.state!=='shoot'||q.progress<.24){P.line(...v(-10-q.draw*6,0),...v(19,0),c.trimLight);P.poly([v(23,0),v(18,-2),v(18,2)],c.shine);P.line(...v(-9-q.draw*6,0),...v(-12-q.draw*6,-3),c.light);}
}
function fallen(P,c,classId,eq){
 P.poly([[-20,-6],[-12,-12],[5,-10],[16,-4],[13,1],[-18,1]],c.clothDark,c.outline);P.line(-17,-5,5,-4,c.cloth);
 P.rect(-16,-7,10,5,c.dark);P.rect(-18,-4,5,4,c.leather);P.rect(-9,-7,12,7,c.mid);P.rect(-8,-7,10,2,c.light);P.rect(3,-7,4,5,SKIN.mid);
 P.rect(6,-11,11,9,c.outline);P.rect(7,-10,9,6,classId==='archer'?c.dark:classId==='mage'?c.shade:c.mid);P.rect(13,-6,4,4,SKIN.mid);P.line(14,-4,16,-4,SKIN.shade);
 if(classId==='mage')P.poly([[6,-11],[2,-17],[13,-12]],c.mid,c.outline);
 if(eq.weapon){if(classId==='warrior'){P.line(0,3,24,0,c.light,2);P.line(3,0,4,6,c.trim);}else if(classId==='mage'){P.line(-18,3,17,3,c.leather,2);P.rect(17,1,4,4,c.clothLight);}else{P.line(0,3,16,5,c.trim);P.line(16,5,25,0,c.trim);P.line(0,3,25,0,c.clothLight);}}
}
function paint(ctx,classId,facing,q,eq,rare){
 const c={...(PALETTES[classId]??PALETTES.warrior)};if(q.flash){c.mid='#c5c2b8';c.light='#f1e6ce';c.shine='#fff5da';}
 const P=painter(ctx),back=facing==='up',side=['left','right'].includes(facing),left=facing==='left';
 P.rect(-9,-1,18,3,'#07131888');P.rect(-6,-2,12,2,'#07131866');
 ctx.save();if(left)ctx.scale(-1,1);
 if(q.fall>.82){fallen(P,c,classId,eq);ctx.restore();return;}
 cape(P,q,c,back,side,classId);
 if(classId==='archer'&&!back)quiver(P,q,c,eq,back,side);
 boots(P,q,c,eq,side,back);
 const y=q.bob+q.crouch,lean=q.lean;
 const bowHand=side?[17+q.reach*.3,-27+y-q.draw*8]:[4,-25+y+(back?-8:6)];
 let hand=[14+q.reach*(side?1:.25),-24+y-round(q.cast*4)+(side?0:q.reach*(back?-.7:.7))],other=[-13-q.reach*.3,-24+y+round(q.step*.5)];
 if(classId==='archer'){hand=bowHand;other=side?[bowHand[0]-8-q.draw*8,bowHand[1]]:[bowHand[0]-5,bowHand[1]+(back?6:-6)+q.draw*6];}
 if(q.state==='bash')other=[lean-14+q.reach,-30+y];
 if(q.state==='cast')other=eq.offhand?[-12+q.cast*2,-26+y-round(q.cast*4)]:[side?18:-14,-23+y-round(q.cast*5)];
 const reaching=classId==='mage'&&q.state==='cast'&&side&&!eq.offhand;
 const weapon=()=>{if(!eq.weapon)return;if(classId==='warrior')sword(P,hand,q,c,facing,rare);else if(classId==='mage')staff(P,hand,q,c,rare);else bow(P,hand,q,c,facing,rare);};
 if(back)weapon();
 limb(P,[reaching?2+lean:-9+lean,-36+y],[reaching?9+lean:-13+lean,-29+y],other,c,eq.gloves);
 torso(P,q,c,eq,back,side,classId);
 if(back&&classId!=='archer')cape(P,q,c,back,side,classId);
 if(back&&classId==='archer'){cape(P,q,c,back,side,classId);quiver(P,q,c,eq,back,side);}
 if(classId==='warrior'){
  for(const sign of [-1,1]){P.poly([[lean+sign*7,-39+y],[lean+sign*13,-39+y],[lean+sign*15,-34+y],[lean+sign*8,-33+y]],c.mid,c.outline);P.line(lean+sign*8,-39+y,lean+sign*12,-39+y,c.light);P.dot(lean+sign*12,-36+y,c.trimLight);}
 }else{P.rect(lean-11,-39+y,7,4,c.dark);P.line(lean-10,-39+y,lean-6,-39+y,c.light);}
 head(P,q,c,eq,back,side,classId);
 // Far-facing weapons pass behind the body; front-facing hands remain visible.
 if(eq.offhand&&classId==='warrior')shield(P,other,c,back);
 if(eq.offhand&&classId==='mage'){P.poly([[other[0]-5,other[1]-5],[other[0]+4,other[1]-7],[other[0]+5,other[1]+3],[other[0]-4,other[1]+5]],c.clothDark,c.trim);P.line(other[0]-3,other[1]-3,other[0]+2,other[1]-4,c.trimLight);P.rect(other[0]-1,other[1]-1,2,3,c.clothLight);}
 limb(P,[8+lean,-36+y],[side?12+q.reach*.3:15,-29+y],hand,c,eq.gloves);
 if(!back)weapon();
 if(classId==='mage'&&q.cast>.1){P.rect(other[0]-2,other[1]-2,4,4,c.clothLight);P.dot(other[0]-1,other[1]-1,'#f1fff0');P.dot(other[0]+5,other[1]-3,c.clothLight);P.dot(other[0]-5,other[1]+2,c.light);}
 ctx.restore();
}
export function appearanceFor(character){
 if(!character?.equipment)return {...DEFAULT_EQUIPMENT};
 const result=Object.fromEntries(Object.keys(DEFAULT_EQUIPMENT).map(slot=>[slot,Boolean(character.equipment[slot])]));
 result.rare=character.inventory?.find(i=>i.id===character.equipment.weapon)?.rarity==='rare';return result;
}
function frameFor(classId,facing,animation,appearance){
 const state=animation.state??'idle',loop={idle:24,walk:8,run:6}[state],raw=Math.floor(Math.max(0,animation.time??0)*12),frame=loop?raw%loop:Math.min(12,raw),eq={...DEFAULT_EQUIPMENT,...appearance};
 const code=Object.keys(DEFAULT_EQUIPMENT).map(k=>Number(eq[k])).join('')+Number(eq.rare===true),key=[classId,facing,state,frame,code,animation.flash?1:0].join(':');
 if(CACHE.has(key)){const value=CACHE.get(key);CACHE.delete(key);CACHE.set(key,value);return value;}
 const canvas=document.createElement('canvas');canvas.width=AVATAR.frameWidth;canvas.height=AVATAR.frameHeight;
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.translate(AVATAR.originX,AVATAR.originY);
 const pose=avatarPose(classId,state,frame/12+1e-8);pose.flash||=animation.flash===true;paint(ctx,classId,facing,pose,eq,eq.rare);
 CACHE.set(key,canvas);if(CACHE.size>256)CACHE.delete(CACHE.keys().next().value);return canvas;
}
export function drawAvatar(ctx,p,time=0,moving=false,attacking=false,scale=1){
 const classId=p.classId??'warrior',animation=p.animation??{state:attacking?(classId==='mage'?'cast':classId==='archer'?'shoot':'attack'):moving?'walk':'idle',time:attacking?time%.4:time};
 const frame=frameFor(classId,p.facing??'down',animation,p.appearance),size=AVATAR.worldScale*scale;
 ctx.imageSmoothingEnabled=false;ctx.drawImage(frame,Math.round(p.x-AVATAR.originX*size),Math.round(p.y-AVATAR.originY*size),Math.round(AVATAR.frameWidth*size),Math.round(AVATAR.frameHeight*size));
}
export function portrait(canvas,classId,time=0,appearance){
 const ctx=canvas.getContext('2d');if(canvas.width!==120||canvas.height!==100){canvas.width=120;canvas.height=100;}ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,120,100);
 drawAvatar(ctx,{x:60,y:94,classId,facing:'down',appearance,animation:{state:'idle',time}},time,false,false,1.55);
}
