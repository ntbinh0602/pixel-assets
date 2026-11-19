import 'dotenv/config';
import {createApp} from './server/app.js';
const production=process.env.NODE_ENV==='production';
if(production&&(!process.env.DATABASE_URL||!process.env.APP_URL))throw new Error('Production requires DATABASE_URL and APP_URL');
const port=Number(process.env.PORT??5173);
const app=await createApp({production,trustProxy:process.env.TRUST_PROXY==='true',appURL:process.env.APP_URL??`http://localhost:${port}`,databaseURL:process.env.DATABASE_URL??'postgresql://nightwood:nightwood_local_only@127.0.0.1:54329/nightwood',authSecret:process.env.BETTER_AUTH_SECRET,emailProvider:process.env.EMAIL_PROVIDER,resendKey:process.env.RESEND_API_KEY,smtp:{host:process.env.SMTP_HOST??'127.0.0.1',port:Number(process.env.SMTP_PORT??1025),user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD,secure:process.env.SMTP_SECURE==='true'},mailFrom:process.env.MAIL_FROM});
app.server.listen(port,process.env.HOST??'127.0.0.1',()=>console.log(`Nightwood: http://localhost:${port}/?view=game\nAsset explorer: http://localhost:${port}/`));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,async()=>{await app.close();process.exit(0);});
