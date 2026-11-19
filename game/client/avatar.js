// Four facing silhouettes drawn on the native art grid. No rotated human sprites.
export function drawAvatar(ctx,p,time=0,moving=false,attacking=false,scale=1){
  ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(scale,scale);
  const back=p.facing==='up',left=p.facing==='left',side=p.facing==='right'||left;
  if(left)ctx.scale(-1,1);
  const step=moving?Math.round(Math.sin(time*12)*2):0,bob=moving?Math.round(Math.abs(Math.sin(time*12))):0;
  const palette={warrior:['#1a2330','#354452','#718186','#c2aa70'],mage:['#201e36','#494164','#807799','#9bcfd1'],archer:['#14292b','#2e5146','#699366','#c3ba7d']}[p.classId]??['#1a2330','#354452','#718186','#c2aa70'];
  const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y-bob,w,h);};
  ctx.fillStyle='#07131799';ctx.fillRect(-8,-1,16,3);
  r(-5,-8+step,4,7,palette[0]);r(1,-8-step,4,7,palette[0]);
  r(-7,-22,14,14,palette[0]);r(-6,-23,11,14,palette[1]);r(-5,-23,3,13,palette[2]);
  if(p.classId==='mage'){r(-7,-13,15,8,palette[1]);r(-4,-13,2,7,palette[2]);r(4,-12,3,7,palette[0]);}
  r(-6,-11,12,2,palette[3]);r(0,-12,2,3,'#a4ddd0');
  r(-5,-31,10,10,palette[0]);r(-5,-32,9,8,palette[2]);
  if(!back){r(side?1:-3,-29,side?4:7,7,'#d3b59a');r(side?4:-2,-27,1,1,'#13212b');if(!side)r(2,-27,1,1,'#13212b');r(0,-23,2,1,'#936e69');}
  if(p.classId==='warrior'){
    r(-6,-32,12,5,'#8e9691');r(-5,-33,8,2,'#bdc5b4');r(-6,-29,2,6,'#56646b');r(5,-29,2,6,'#46545b');r(-8,-23,5,4,'#899187');r(4,-23,5,4,'#5c6b70');
    r(back?5:-10,-20,6,11,'#1b2d32');r(back?6:-9,-19,4,9,'#bba36a');r(back?7:-8,-18,2,6,'#52766a');
    const swordX=attacking?16:10,swordY=attacking?-21:-29;
    r(7,-18,4,3,'#d3b59a');r(swordX,swordY,2,16,'#c5d9ce');r(swordX+1,swordY,1,14,'#f0f4dc');r(swordX-2,swordY+13,7,2,palette[3]);r(swordX,swordY+15,2,4,'#54433f');
  }else if(p.classId==='mage'){
    r(-6,-32,13,3,palette[0]);r(-5,-35,10,5,palette[1]);r(-3,-38,5,5,palette[2]);r(-1,-40,2,3,palette[3]);r(-8,-30,17,2,palette[3]);
    r(10,-30,2,27,'#8d7253');r(9,-30,4,3,palette[3]);r(10,-34,3,4,'#a1ded3');r(10,-34,1,2,'#effff0');r(7,attacking?-23:-18,4,3,'#d3b59a');
  }else{
    r(-6,-32,11,4,palette[1]);r(-5,-34,8,3,palette[2]);r(-6,-29,2,7,palette[1]);r(4,-29,2,6,palette[1]);
    r(-6,-22,2,11,palette[3]);r(-7,-23,2,7,'#987c55');
    ctx.strokeStyle='#c9ac72';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(9,-29);ctx.lineTo(14,-24);ctx.lineTo(15,-17);ctx.lineTo(10,-10);ctx.stroke();ctx.strokeStyle='#b0bda3';ctx.beginPath();ctx.moveTo(9,-29);ctx.lineTo(attacking?7:10,-19);ctx.lineTo(10,-10);ctx.stroke();r(6,-20,4,3,'#d3b59a');
    if(back){r(-7,-28,3,16,'#806548');r(-7,-30,1,6,'#d2d9bd');r(-5,-31,1,6,'#d2d9bd');}
  }
  ctx.restore();
}
export function portrait(canvas,classId){const ctx=canvas.getContext('2d');canvas.width=120;canvas.height=100;ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,120,100);drawAvatar(ctx,{x:60,y:93,classId,facing:'right'},0,false,false,2);}
