// Render the actual browser avatar module for the PixelFX look/refine workflow.
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const round=process.argv[2]??'current',directory='records/avatars/'+round,base=process.env.AVATAR_PREVIEW_URL??'http://localhost:5173';mkdirSync(directory,{recursive:true});
const browser=await chromium.launch({channel:process.env.CI?undefined:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1000,height:800}});await page.goto(base+'/');await page.locator('.asset-card').first().waitFor();
 await page.evaluate(async()=>{
  const {drawAvatar}=await import('/game/client/avatar.js');window.drawAvatar=drawAvatar;
  document.body.innerHTML='<canvas id="sheet" width="1000" height="800"></canvas>';document.body.style='margin:0;background:#0f1f1b';window.sheet=document.querySelector('canvas');
  const ctx=sheet.getContext('2d');ctx.fillStyle='#10231e';ctx.fillRect(0,0,1000,800);ctx.font='14px monospace';ctx.textAlign='center';
  for(const [col,classId]of ['warrior','mage','archer'].entries()){
   ctx.fillStyle='#e5dbb1';ctx.fillText(classId.toUpperCase(),190+col*315,30);
   for(const [row,facing]of ['down','up','right','left'].entries()){
    const x=190+col*315,y=170+row*190;ctx.fillStyle='#34483a';ctx.fillRect(x-80,y+2,160,1);ctx.fillStyle='#91ad8e';ctx.fillText(facing,x-115,y-55);
    drawAvatar(ctx,{x,y,classId,facing,appearance:{helmet:true,gloves:true,offhand:true},animation:{state:'idle',time:0}},0,false,false,2.5);
   }
  }
 });await page.locator('#sheet').screenshot({path:directory+'/directions.png'});
 for(const classId of ['warrior','mage','archer']){
  await page.evaluate(({classId})=>{
   sheet.width=1000;sheet.height=800;const ctx=sheet.getContext('2d');ctx.fillStyle='#10231e';ctx.fillRect(0,0,1000,800);ctx.font='12px monospace';ctx.textAlign='center';
   const rows=[['idle',2],['walk',8/12],[classId==='mage'?'cast':classId==='archer'?'shoot':'attack',.42],['dodge',.3],['hurt',.24],['death',.72]];
   for(const [row,[state,duration]]of rows.entries()){
    ctx.fillStyle='#d6d6af';ctx.fillText(classId+' / '+state,110,row*130+20);
    for(let col=0;col<8;col++){const time=col/7*duration;drawAvatar(ctx,{x:65+col*125,y:row*130+125,classId,facing:'right',appearance:{helmet:true,gloves:true,offhand:true},animation:{state,time}},time,false,false,1.8);}
   }
  },{classId});await page.locator('#sheet').screenshot({path:directory+'/'+classId+'-motion.png'});
 }
 await page.evaluate(()=>{
  sheet.width=1000;sheet.height=320;
  window.lineup=(state='idle',time=0,facing='down')=>{
   const ctx=sheet.getContext('2d');ctx.fillStyle='#10231e';ctx.fillRect(0,0,1000,320);ctx.textAlign='center';ctx.font='18px Arial';
   const labels=['Chiến binh','Pháp sư','Cung thủ'];
   for(const [col,classId]of ['warrior','mage','archer'].entries()){
    const x=170+col*330;ctx.fillStyle='#e1ddbb';ctx.fillText(labels[col],x,30);ctx.fillStyle='#304b3d';ctx.fillRect(x-90,289,180,1);
    const action=state==='attack'?(classId==='mage'?'cast':classId==='archer'?'shoot':'attack'):state;
    drawAvatar(ctx,{x,y:282,classId,facing,appearance:{helmet:true,gloves:true,offhand:true},animation:{state:action,time:state==='attack'?time%.7:time}},time,false,false,3.2);
   }
  };lineup();
 });await page.locator('#sheet').screenshot({path:directory+'/lineup.png'});
 if(process.argv.includes('--video')){
  const data=await page.evaluate(async()=>{
   const stream=sheet.captureStream(12),type=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm',recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:700000}),chunks=[];
   recorder.ondataavailable=e=>chunks.push(e.data);const done=new Promise(r=>recorder.onstop=r);recorder.start();
   const timeline=[['idle',1,'down'],['walk',1,'right'],['run',1,'up'],['attack',1.5,'right'],['hurt',.5,'left'],['dodge',.5,'left'],['death',1,'down'],['respawn',.75,'down']];
   const start=performance.now();await new Promise(resolve=>{const draw=()=>{let t=(performance.now()-start)/1000;let selected;for(const row of timeline){if(t<row[1]){selected=row;break;}t-=row[1];}if(!selected){resolve();return;}lineup(selected[0],t,selected[2]);requestAnimationFrame(draw);};draw();});
   recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());const bytes=new Uint8Array(await new Blob(chunks,{type}).arrayBuffer());let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary);
  });writeFileSync(directory+'/motion.webm',Buffer.from(data,'base64'));
 }
 console.log('Avatar previews: '+directory);
}finally{await browser.close();}
