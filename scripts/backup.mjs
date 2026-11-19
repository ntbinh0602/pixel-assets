import 'dotenv/config';
import {mkdirSync,createWriteStream} from 'node:fs';
import {spawn} from 'node:child_process';
import {pipeline} from 'node:stream/promises';
mkdirSync('data/backups',{recursive:true});const path='data/backups/nightwood-'+new Date().toISOString().replace(/[:.]/g,'-')+'.dump';
const child=process.env.DATABASE_URL?spawn('pg_dump',['--format=custom','--no-owner','--no-acl'],{env:{...process.env,PGDATABASE:process.env.DATABASE_URL},stdio:['ignore','pipe','inherit']}):spawn('docker',['compose','exec','-T','db','pg_dump','-U','nightwood','-d','nightwood','--format=custom','--no-owner','--no-acl'],{stdio:['ignore','pipe','inherit']});
const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error('pg_dump failed: '+code)));});await Promise.all([pipeline(child.stdout,createWriteStream(path,{mode:0o600})),done]);console.log('Backup: '+path);
