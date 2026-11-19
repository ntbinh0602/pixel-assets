import nodemailer from 'nodemailer';
export function mailer(config){
 const provider=config.emailProvider??'smtp';
 if(!['smtp','resend'].includes(provider))throw new Error('EMAIL_PROVIDER must be smtp or resend');
 if(provider==='resend'&&!config.resendKey)throw new Error('RESEND_API_KEY is required');
 if(config.production&&!config.mailFrom)throw new Error('MAIL_FROM is required');
 if(config.production&&provider==='smtp'&&(!config.smtp.host||!config.smtp.user||!config.smtp.pass))throw new Error('Production SMTP requires host, user and password');
 const transport=provider==='smtp'?nodemailer.createTransport({host:config.smtp.host??'127.0.0.1',port:config.smtp.port??1025,secure:config.smtp.secure??false,...(config.smtp.user?{auth:{user:config.smtp.user,pass:config.smtp.pass}}:{}),connectionTimeout:5000}):null;
 return async(message)=>{
  const data={from:config.mailFrom??'Nightwood <hello@nightwood.local>',...message};
  if(transport)return transport.sendMail(data);
  const response=await (config.fetch??fetch)('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+config.resendKey,'Content-Type':'application/json'},body:JSON.stringify({...data,to:[data.to]}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Email provider rejected request ('+response.status+')');
  return response.json();
 };
}
