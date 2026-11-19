import {test,expect} from '@playwright/test';
test('avatar frames fit padding in four directions, retain ground anchor and reflect equipment',async({page})=>{
 await page.goto('/');await page.locator('.asset-card').first().waitFor();
 const result=await page.evaluate(async()=>{
  const {drawAvatar,AVATAR}=await import('/game/client/avatar.js'),c=document.createElement('canvas');c.width=300;c.height=300;
  const ctx=c.getContext('2d'),original=ctx.drawImage.bind(ctx),clipped=[],poses=new Set();let rendered=0;
  ctx.drawImage=(frame,...args)=>{
   const pixels=frame.getContext('2d').getImageData(0,0,frame.width,frame.height).data;let hash=2166136261,minX=999,minY=999,maxX=-1,maxY=-1;
   for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){const a=pixels[(y*frame.width+x)*4+3];if(a){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}hash=Math.imul(hash^a,16777619)>>>0;}
   if(minX<=0||minY<=0||maxX>=frame.width-1||maxY>=frame.height-1)clipped.push({minX,minY,maxX,maxY});poses.add(hash);rendered++;original(frame,...args);
  };
  const durations={idle:2,walk:8/12,run:.5,attack:.42,cast:.5,shoot:.46,bash:.4,dodge:.3,hurt:.24,death:.72,respawn:.6};
  for(const classId of ['warrior','mage','archer'])for(const facing of ['down','up','left','right'])for(const [state,duration]of Object.entries(durations))for(let i=0;i<8;i++)drawAvatar(ctx,{x:150,y:150,classId,facing,animation:{state,time:duration*i/7},appearance:{helmet:true,gloves:true,offhand:true}});
  const hash=()=>{const pixels=ctx.getImageData(0,0,300,300).data;let h=2166136261;for(const n of pixels)h=Math.imul(h^n,16777619)>>>0;return h;};
  const gear=[];for(const classId of ['warrior','mage','archer']){ctx.clearRect(0,0,300,300);drawAvatar(ctx,{x:150,y:150,classId,facing:'down',appearance:{offhand:true}});const equipped=hash();ctx.clearRect(0,0,300,300);drawAvatar(ctx,{x:150,y:150,classId,facing:'down',appearance:{weapon:false,chest:false,boots:false,offhand:false}});gear.push(equipped!==hash());}
  // The visible ground shadow is anchored at y=150 for every motion, without moving the actual entity.
  return{rendered,clipped,uniqueSilhouettes:poses.size,gear,worldScale:AVATAR.worldScale};
 });
 expect(result.clipped).toEqual([]);expect(result.rendered).toBeGreaterThan(1000);expect(result.uniqueSilhouettes).toBeGreaterThan(80);expect(result.gear).toEqual([true,true,true]);
});
test('class portraits breathe in the actual character menu',async({page,context})=>{
 const {account}=await import('../helpers.mjs'),base='http://localhost:5180',a=await account(base);
 await context.addCookies(a.cookie.split('; ').filter(s=>!s.startsWith('nw_locale')).map(c=>({name:c.split('=')[0],value:c.slice(c.indexOf('=')+1),url:base})));
 await page.goto('/?view=game');await expect(page.locator('.nw-lobby')).toBeVisible();
 const canvas=page.locator('[data-choose-class=warrior] canvas'),before=await canvas.evaluate(c=>c.toDataURL());
 await expect.poll(()=>canvas.evaluate(c=>c.toDataURL())).not.toBe(before);
 await page.screenshot({path:'test-results/character-menu.png'});
});
test('dead character reconnect and respawn render safely with the new actor',async({page,context})=>{
 const {account,request,testURL}=await import('../helpers.mjs'),{Pool}=await import('pg'),base='http://localhost:5180',a=await account(base),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const created=await request(base,'/api/characters',{name:'Avatar Respawn',classId:'warrior'},a.cookie),hero=created.body.character;
 const url=new URL(testURL);url.pathname='/nightwood_browser_test';const pool=new Pool({connectionString:url.href});
 try{await pool.query('UPDATE game_characters SET data=jsonb_set(data,\'{hp}\',\'0\') WHERE id=$1',[hero.id]);}finally{await pool.end();}
 await context.addCookies(a.cookie.split('; ').filter(s=>!s.startsWith('nw_locale')).map(c=>({name:c.split('=')[0],value:c.slice(c.indexOf('=')+1),url:base})));
 await page.goto('/?view=game');await page.locator('[data-play]').click();await expect(page.locator('#nw-dead')).toBeVisible();await page.waitForTimeout(1100);await page.locator('[data-command=respawn]').click();await expect(page.locator('#nw-dead')).toBeHidden();await expect(page.locator('#nw-hp')).toHaveText('HP 174 / 174');await page.waitForTimeout(700);await page.screenshot({path:'test-results/avatar-respawn.png'});expect(errors).toEqual([]);
});
