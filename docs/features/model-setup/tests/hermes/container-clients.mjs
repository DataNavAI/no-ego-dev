// Explicit vendor-network interface qualification: no account consent or inference.
// Run inside the built Linux image as an unprivileged user (see subscription-auth.md).
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,readdir} from 'node:fs/promises';
import {createHermesModelAdapter} from '/opt/ned/apps/core/src/hermes-model.js';
const root=await mkdtemp('/tmp/ned-auth-clients-');
try{
  for(const provider of ['claude-subscription-directsdk-experimental','antigravity-subscription-directsdk']){
    const profile=root+'/'+provider;await mkdir(profile,{mode:0o700});
    const adapter=createHermesModelAdapter({env:{...process.env,HOME:root,NED_HERMES_SOURCE:'/opt/hermes'},profile});
    let operation,timer;
    try{
      assert(await adapter.available());const models=await adapter.catalog();assert(models[provider]?.length);
      const before=await readdir(profile,{recursive:true});let resolve,reject;
      const challenge=new Promise((yes,no)=>{resolve=yes;reject=no;});void challenge.catch(()=>{});
      operation=await adapter.start({action:'subscription',provider,model:models[provider][0]},{beforeCommit:async()=>{throw Error('User consent is outside this probe');},event:m=>{if(m.type==='challenge')resolve(m);}});
      void operation.done.catch(reject);timer=setTimeout(()=>reject(Error(provider+' challenge timeout')),45000);
      const message=await challenge;assert.equal(message.method,'manual_code');
      assert.equal(new URL(message.verificationUri).origin,provider.startsWith('claude-')?'https://claude.ai':'https://accounts.google.com');
      operation.stop();await operation.done.catch(()=>{});assert.deepEqual(await readdir(profile,{recursive:true}),before);
      console.log(JSON.stringify({provider,models:models[provider].length,challenge:'PASS',cancel:'PASS'}));
    }finally{clearTimeout(timer);operation?.stop();await adapter.close();}
  }
}finally{await rm(root,{recursive:true,force:true});}
