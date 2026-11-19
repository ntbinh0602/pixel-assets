import test from 'node:test';
import assert from 'node:assert/strict';
import {mailer} from '../../server/mail.js';
test('Resend HTTPS contract and provider failure are handled without exposing credentials',async()=>{
 let seen;const send=mailer({emailProvider:'resend',resendKey:'test-key',production:true,mailFrom:'Game <hello@example.test>',fetch:async(url,init)=>{seen={url,init};return{ok:true,json:async()=>({id:'test'})};}});
 assert.deepEqual(await send({to:'player@example.test',subject:'Xác minh',text:'Test link'}),{id:'test'});assert.equal(seen.url,'https://api.resend.com/emails');assert.equal(seen.init.headers.Authorization,'Bearer test-key');assert.deepEqual(JSON.parse(seen.init.body).to,['player@example.test']);
 const bad=mailer({emailProvider:'resend',resendKey:'test-key',fetch:async()=>({ok:false,status:403})});await assert.rejects(bad({to:'p',subject:'x',text:'y'}),/403/);assert.throws(()=>mailer({emailProvider:'resend'}),/RESEND_API_KEY/);
});
