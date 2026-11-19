import {betterAuth} from 'better-auth';
import {getMigrations} from 'better-auth/db/migration';
import {mailer} from './mail.js';
import {randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

export async function createAuth(pool,config){
  const production=config.production;
  let secret=config.authSecret;
  if(!secret&&!production){
    await mkdir(config.dataDir,{recursive:true});const file=new URL('auth-secret',config.dataDir);
    try{secret=(await readFile(file,'utf8')).trim();}catch{secret=randomBytes(48).toString('hex');await writeFile(file,secret,{mode:0o600});}
  }
  if(!secret||secret.length<32)throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters');
  const deliver=mailer(config);
  const send=async(user,url,kind,request)=>{
    const en=request?.headers?.get('cookie')?.includes('nw_locale=en');
    const subject=kind==='verify'?(en?'Verify your Nightwood account':'Xác minh tài khoản Rừng Đêm'):(en?'Reset your Nightwood password':'Đặt lại mật khẩu Rừng Đêm');
    const text=(kind==='verify'?(en?'Verify your email to enter the forest:':'Xác minh email để vào khu rừng:'):(en?'Use this link to reset your password:':'Dùng liên kết này để đặt lại mật khẩu:'))+'\n\n'+url;
    if(config.onMail)return config.onMail({to:user.email,subject,text,url,kind});
    await deliver({to:user.email,subject,text});
  };
  const auth=betterAuth({
    database:pool,secret,baseURL:config.appURL,trustedOrigins:[config.appURL],
    emailAndPassword:{enabled:true,requireEmailVerification:true,minPasswordLength:10,maxPasswordLength:128,revokeSessionsOnPasswordReset:true,sendResetPassword:async({user,url},request)=>send(user,url,'reset',request)},
    emailVerification:{sendOnSignUp:true,autoSignInAfterVerification:true,sendVerificationEmail:async({user,url},request)=>send(user,url,'verify',request)},
    session:{expiresIn:60*60*24*7,updateAge:60*60*24,cookieCache:{enabled:false}},
    advanced:{useSecureCookies:production,ipAddress:{ipAddressHeaders:['x-nightwood-client-ip']}},
    rateLimit:{enabled:true,window:60,max:60,...config.authRateLimit},
  });
  const migration=await getMigrations(auth.options);await migration.runMigrations();
  return auth;
}
