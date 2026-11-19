import {createApp} from '../server/app.js';
const app=await createApp({appURL:'http://localhost:5182',databaseURL:process.env.RECOVERY_DATABASE_URL,authSecret:'recovery-test-secret-only-1234567890'});
app.server.listen(5182,'127.0.0.1',()=>process.send?.('ready'));
process.on('SIGTERM',async()=>{await app.close();process.exit(0);});
