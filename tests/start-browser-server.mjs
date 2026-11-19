import {freshDatabase,testURL} from './helpers.mjs';
import {createApp} from '../server/app.js';
const url=new URL(testURL);url.pathname='/nightwood_browser_test';await freshDatabase(url.href);
const app=await createApp({authRateLimit:{customRules:{'/sign-up/email':{window:60,max:60}}},appURL:'http://localhost:5180',databaseURL:url.href,authSecret:'browser-test-secret-only-1234567890'});
app.server.listen(5180,'127.0.0.1',()=>console.log('Browser test server ready'));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,async()=>{await app.close();process.exit(0);});
