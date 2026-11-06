import { random, SPECIES } from './world.js';

function canvas(width, height) { const c = document.createElement('canvas'); c.width = width; c.height = height; return c; }
function polygon(ctx, points, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(...points[0]);
  for (const p of points.slice(1)) ctx.lineTo(...p);
  ctx.closePath(); ctx.fill();
}
// Scanline ellipses keep every leaf mass on the pixel grid.
function oval(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  for (let row = -Math.ceil(ry); row <= ry; row++) {
    const width = Math.floor(rx * Math.sqrt(Math.max(0, 1 - row * row / (ry * ry))));
    ctx.fillRect(Math.round(x) - width, Math.round(y) + row, width * 2 + 1, 1);
  }
}
export function createGlow(color = '196,234,105', radius = 40) {
  const c = canvas(radius * 2, radius * 2), ctx = c.getContext('2d');
  const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  gradient.addColorStop(0, `rgba(${color},.3)`); gradient.addColorStop(.3, `rgba(${color},.1)`); gradient.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, c.width, c.height); return c;
}
export function createTree(type, seed) {
  const spec = SPECIES[type], c = canvas(spec.width, spec.height), ctx = c.getContext('2d');
  const R = random(seed), x = Math.floor(spec.width / 2), base = spec.height - 8;
  const greens = type === 'willow' ? ['#0d2729','#143b36','#1c5145','#2c6650','#3d7b59','#5b9165'] : type === 'pine' ? ['#0c2228','#12322f','#1b4940','#265b45','#367054','#548568'] : ['#0e2525','#18392e','#254d37','#365f3f','#47764c','#658d59'];
  // Roots, weathered bark and a branch skeleton are visible beneath the crown.
  polygon(ctx, [[x-10,base-64],[x+6,base-67],[x+9,base-22],[x+20,base],[x+6,base-3],[x+1,base-12],[x-10,base],[x-19,base+1],[x-10,base-25]], '#101e21');
  polygon(ctx, [[x-6,base-65],[x+3,base-66],[x+4,base-22],[x+12,base-3],[x+3,base-7],[x-1,base-17],[x-10,base-3],[x-7,base-25]], '#493e36');
  polygon(ctx, [[x-6,base-65],[x-2,base-65],[x-2,base-26],[x-8,base-6],[x-9,base-5],[x-5,base-28]], '#73624b');
  ctx.strokeStyle = '#192c28'; ctx.lineWidth = 2;
  for (let i=0; i<7; i++) { const a=x-5+R()*10, b=base-16-R()*45; ctx.beginPath(); ctx.moveTo(a,b); ctx.lineTo(a-1,b+9); ctx.stroke(); }
  ctx.strokeStyle = '#4c4936'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  for (const side of [-1,1]) { ctx.beginPath(); ctx.moveTo(x,base-43); ctx.lineTo(x+side*22,base-73); ctx.lineTo(x+side*33,base-90); ctx.stroke(); }
  if (type === 'pine') {
    for (let tier=0; tier<5; tier++) {
      const y=base-57-tier*23, width=52-tier*9;
      polygon(ctx, [[x,y-53],[x-width*.55,y-15],[x-width*.34,y-17],[x-width,y+12],[x-width*.64,y+9],[x-width*.7,y+17],[x-4,y+13],[x+width*.8,y+19],[x+width*.62,y+9],[x+width,y+12],[x+width*.43,y-14],[x+width*.55,y-10]], greens[0]);
      polygon(ctx, [[x,y-50],[x-width*.46,y-14],[x-width*.26,y-17],[x-width*.87,y+9],[x-width*.4,y+5],[x-4,y+10],[x+width*.7,y+11],[x+width*.32,y-12]], greens[2]);
      polygon(ctx, [[x-1,y-48],[x-width*.4,y-16],[x-width*.21,y-18],[x-width*.77,y+6],[x-width*.35,y],[x-3,y+4]], greens[3]);
      for (let i=0; i<16; i++) {
        const yy=y-28+R()*33, xx=x-width*.55+R()*width;
        if (Math.abs(xx-x) < (yy-y+51)*.8) { ctx.fillStyle=greens[2+Math.floor(R()*3)]; ctx.fillRect(Math.floor(xx),Math.floor(yy),2+Math.floor(R()*4),1); }
      }
    }
  } else {
    const crownY=base-108, rx=type==='willow'?74:65;
    const lobes=[[-44,4,30,24],[-21,-24,34,28],[12,-29,37,27],[46,-2,32,27],[25,22,38,26],[-16,24,38,28],[0,0,52,34]];
    for (const [dx,dy,w,h] of lobes) oval(ctx,x+dx,crownY+dy,w+3,h+4,greens[0]);
    for (const [j,[dx,dy,w,h]] of lobes.entries()) {
      oval(ctx,x+dx,crownY+dy-3,w,h,greens[1]);
      oval(ctx,x+dx-3,crownY+dy-8,w-3,h-4,greens[2]);
      oval(ctx,x+dx-7,crownY+dy-12,w*.74,h*.68,greens[3]);
      oval(ctx,x+dx-10,crownY+dy-17,w*.45,h*.37,greens[j%3===0?5:4]);
    }
    // Leaf clusters, rather than isolated noise pixels, give the canopy texture.
    for(let i=0;i<115;i++) {
      const a=R()*Math.PI*2, r=Math.sqrt(R()), xx=x+Math.cos(a)*rx*r, yy=crownY+Math.sin(a)*48*r;
      const shade=yy<crownY-5?3+Math.floor(R()*3):1+Math.floor(R()*3);
      ctx.fillStyle=greens[shade]; ctx.fillRect(Math.round(xx),Math.round(yy),3+Math.floor(R()*5),2);
      if(i%3===0)ctx.fillRect(Math.round(xx)-1,Math.round(yy)+2,3,1);
    }
    if(type==='willow') {
      for(let i=0;i<25;i++) {
        const xx=x-rx+i/(24)*rx*2, edge=Math.abs(xx-x)/rx;
        const top=crownY+4+edge*4, length=25+R()*42+(1-edge)*10;
        for(let j=0;j<length;j+=3) {
          const sway=Math.sin(j*.07+i)*3;
          ctx.fillStyle=greens[i%3+1]; ctx.fillRect(Math.round(xx+sway),Math.round(top+j),2,4);
          ctx.fillStyle=greens[3+i%2]; ctx.fillRect(Math.round(xx+sway)-1,Math.round(top+j),2,2);
        }
      }
    }
  }
  oval(ctx,x-8,base-2,7,2,'#365a3b');
  ctx.fillStyle='#72905c';ctx.fillRect(x-10,base-4,3,1);
  return c;
}

export function createTerrain(world) {
  const c=canvas(world.width,world.height), ctx=c.getContext('2d'), R=random(8341);
  ctx.fillStyle='#101f20';ctx.fillRect(0,0,c.width,c.height);
  for(let i=0;i<750;i++) {
    const x=R()*c.width,y=R()*c.height;
    oval(ctx,x,y,8+R()*27,3+R()*12,['#132823','#172e26','#1a3228','#152a28'][i%4]);
  }
  // A forked, gently worn path keeps the center readable beneath the foliage.
  const path=(color,width)=>{
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(755,1040);ctx.bezierCurveTo(690,865,803,785,758,626);ctx.bezierCurveTo(712,476,785,380,889,259);ctx.stroke();
    ctx.beginPath();ctx.moveTo(756,624);ctx.bezierCurveTo(634,666,430,641,253,518);ctx.stroke();
    ctx.beginPath();ctx.moveTo(758,626);ctx.bezierCurveTo(836,638,911,688,988,703);ctx.stroke();
  };
  path('#1d302b',49);path('#2a3930',33);path('#334033',21);
  oval(ctx,758,626,70,44,'#2a3930');oval(ctx,758,626,56,31,'#303e32');
  for(let i=0;i<6000;i++) {
    const x=Math.floor(R()*c.width),y=Math.floor(R()*c.height);
    ctx.fillStyle=['#263a2d','#3b4a36','#20382d','#152923'][i%4];
    ctx.fillRect(x,y,i%5===0?3:1,1);
  }
  // Low grass tufts and stones live on the ground layer, below the sprites.
  for(let i=0;i<700;i++) {
    const x=Math.floor(R()*c.width),y=Math.floor(R()*c.height);
    ctx.fillStyle=i%3===0?'#3a5540':'#263f32';
    ctx.fillRect(x,y-3,1,4);ctx.fillRect(x-2,y-1,1,2);ctx.fillRect(x+2,y-2,1,3);
  }
  const pond=world.pond;
  oval(ctx,pond.x,pond.y,pond.rx+10,pond.ry+7,'#0e1b1e');
  oval(ctx,pond.x,pond.y,pond.rx+4,pond.ry+3,'#34463a');
  oval(ctx,pond.x,pond.y,pond.rx,pond.ry,'#163238');
  oval(ctx,pond.x+4,pond.y-5,pond.rx-10,pond.ry-9,'#193c42');
  oval(ctx,pond.x+13,pond.y-8,pond.rx-30,pond.ry-21,'#20464a');
  for(let i=0;i<65;i++) {
    const a=R()*Math.PI*2,r=Math.sqrt(R());
    const x=pond.x+Math.cos(a)*pond.rx*r*.94,y=pond.y+Math.sin(a)*pond.ry*r*.94;
    ctx.fillStyle=i%3?'#2c5555':'#416962';ctx.fillRect(Math.floor(x),Math.floor(y),2+Math.floor(R()*6),1);
  }
  for(const [dx,dy] of [[-72,19],[-56,29],[65,-31],[73,-24],[41,48]]) {
    oval(ctx,pond.x+dx,pond.y+dy,5,2,'#456648');ctx.fillStyle='#6d8858';ctx.fillRect(pond.x+dx-3,pond.y+dy-1,3,1);
  }
  for(const t of world.trees) oval(ctx,t.x+5,t.y+1,29*t.scale,11*t.scale,'#0b191a');
  for(let i=0;i<60;i++) {
    const x=Math.floor(R()*c.width),y=Math.floor(R()*c.height);
    if(((x-pond.x)/pond.rx)**2+((y-pond.y)/pond.ry)**2<1.2)continue;
    oval(ctx,x,y,5+R()*4,2+R()*3,'#182b2b');
    ctx.fillStyle='#4c6050';ctx.fillRect(x-3,y-2,4,1);
    if(i%5===0){ctx.fillStyle='#b49c67';ctx.fillRect(x+8,y-2,1,4);ctx.fillStyle='#a66b52';ctx.fillRect(x+6,y-3,5,2);}
  }
  return c;
}

export function drawExplorer(ctx, player, time, moving) {
  const x=Math.round(player.x),y=Math.round(player.y),step=moving?Math.sin(time*15):0,bob=moving?Math.round(Math.abs(step)):0;
  oval(ctx,x,y,7,2,'#0a1418');
  ctx.fillStyle='#131d27';ctx.fillRect(x-4+(step>0?1:0),y-4,3,4);ctx.fillRect(x+1+(step<0?1:0),y-4,3,4);
  polygon(ctx,[[x-5,y-14-bob],[x+4,y-14-bob],[x+6,y-3-bob],[x+1,y-2-bob],[x-1,y-5-bob],[x-5,y-2-bob]],'#7a674c');
  polygon(ctx,[[x-4,y-14-bob],[x+1,y-14-bob],[x+3,y-4-bob],[x-3,y-4-bob]],'#b8a570');
  oval(ctx,x,y-17-bob,5,6,'#19262a');oval(ctx,x-1,y-18-bob,4,5,'#cfbb7e');
  ctx.fillStyle=player.facing==='up'?'#a08e60':'#273437';ctx.fillRect(x-2,y-19-bob,5,5);
  if(player.facing!=='up'){ctx.fillStyle='#e6c799';ctx.fillRect(x-1,y-17-bob,3,2);ctx.fillStyle='#15262b';ctx.fillRect(x+(player.facing==='left'?-2:2),y-18-bob,1,1);}
  ctx.fillStyle='#dfc28b';ctx.fillRect(x+5,y-10-bob,3,2);
  ctx.fillStyle='#4c4939';ctx.fillRect(x+8,y-11-bob,3,2);ctx.fillRect(x+8,y-7-bob,3,1);
  ctx.fillStyle='#ffe2a0';ctx.fillRect(x+8,y-9-bob,3,3);ctx.fillStyle='#fff3c2';ctx.fillRect(x+9,y-9-bob,1,2);
}
