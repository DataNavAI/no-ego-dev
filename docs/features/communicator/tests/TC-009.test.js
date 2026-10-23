import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {resolveGatewaySettings} from '../../../../src/communicator/gateway-settings.js';
import {createCommunicatorServer} from '../../../../src/communicator/server.js';

test('TC-009: default profile discovery connects without NED overrides and rereads private credentials',async t=>{
  const home=await mkdtemp(join(tmpdir(),'ned-host-gateway-'));t.after(()=>rm(home,{recursive:true,force:true}));
  const profile=join(home,'.hermes');await mkdir(profile);
  const envfile=join(profile,'.env');
  const observations=[];
  const gateway=http.createServer((req,res)=>{
    observations.push({path:req.url,key:req.headers.authorization});
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:[{id:'host-session',title:'Host chat',private:'hidden'}],has_more:false}));
  });
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{gateway.close(resolve);gateway.closeAllConnections();}));
  const port=gateway.address().port;
  await writeFile(envfile,`API_SERVER_KEY='synthetic-host-key'\nAPI_SERVER_PORT=${port}\nOTHER_SECRET=unrelated\n`,{mode:0o600});
  const app=createCommunicatorServer({gateway:{env:{},home}});await app.listen();t.after(()=>app.close());
  const first=await fetch(app.url+'/api/chat/sessions');assert.equal(first.status,200);
  assert.deepEqual(await first.json(),{data:[{id:'host-session',title:'Host chat'}],has_more:false});
  assert.deepEqual(observations[0],{path:'/api/sessions?limit=50&offset=0',key:'Bearer synthetic-host-key'});
  await writeFile(envfile,`API_SERVER_KEY="synthetic-rotated-key" # comment\nAPI_SERVER_PORT=${port}\n`,{mode:0o600});
  assert.equal((await fetch(app.url+'/api/chat/sessions')).status,200);
  assert.equal(observations[1].key,'Bearer synthetic-rotated-key');
  await writeFile(envfile,'API_SERVER_KEY=synthetic-rotated-key\nAPI_SERVER_PORT=invalid\n');
  const invalid=await fetch(app.url+'/api/chat/sessions');assert.equal(invalid.status,503);assert.ok(!(await invalid.text()).includes('synthetic'));
  assert.equal(observations.length,2);
  await writeFile(envfile,'');
  const config=join(profile,'config.yaml');
  await writeFile(config,`gateway:\n  api_server:\n    port: ${port}\n    key: synthetic-yaml-key\n`,{mode:0o644});
  assert.equal((await fetch(app.url+'/api/chat/sessions')).status,503);assert.equal(observations.length,2);
  await chmod(config,0o600);assert.equal((await fetch(app.url+'/api/chat/sessions')).status,200);
  assert.equal(observations[2].key,'Bearer synthetic-yaml-key');
});

test('TC-009: local profile/config precedence, endpoint credential isolation and unsafe file rejection',async t=>{
  const home=await mkdtemp(join(tmpdir(),'ned-profile-settings-'));t.after(()=>rm(home,{recursive:true,force:true}));
  const profile=join(home,'selected');await mkdir(profile);
  const config=join(profile,'config.yaml');const envfile=join(profile,'.env');
  await writeFile(config,'gateway:\n  api_server:\n    port: 9001\n    key: config-key\n  platforms:\n    api_server:\n      port: 9002\nplatforms:\n  api_server:\n    port: 9003\n',{mode:0o600});
  const env={HERMES_HOME:profile};
  assert.deepEqual(await resolveGatewaySettings({env,home}),{url:'http://127.0.0.1:9001',key:'config-key'});
  await chmod(config,0o644);await assert.rejects(resolveGatewaySettings({env,home}));await chmod(config,0o600);
  if(process.getuid){const uid=process.getuid();const identity=t.mock.method(process,'getuid',()=>uid+1);await assert.rejects(resolveGatewaySettings({env,home}));identity.mock.restore();}
  await writeFile(envfile,'export API_SERVER_KEY="dotenv-key"\nAPI_SERVER_PORT=9004\n',{mode:0o600});
  assert.deepEqual(await resolveGatewaySettings({env,home}),{url:'http://127.0.0.1:9004',key:'dotenv-key'});
  assert.deepEqual(await resolveGatewaySettings({env:{...env,API_SERVER_PORT:'9005',API_SERVER_KEY:'environment-key'},home}),{url:'http://127.0.0.1:9005',key:'environment-key'});
  assert.deepEqual(await resolveGatewaySettings({env:{...env,NED_HERMES_URL:'http://127.0.0.1:9006'},home}),{url:'http://127.0.0.1:9006',key:undefined});
  assert.deepEqual(await resolveGatewaySettings({url:'http://127.0.0.1:9007',key:'explicit-key',env,home}),{url:'http://127.0.0.1:9007',key:'explicit-key'});
  assert.deepEqual(env,{HERMES_HOME:profile});
  await writeFile(config,'gateway: [broken');await assert.rejects(resolveGatewaySettings({env,home}));
  await writeFile(config,'{}');await rm(envfile);await symlink(config,envfile);
  await assert.rejects(resolveGatewaySettings({env,home}));
  await rm(envfile);await writeFile(envfile,'x'.repeat(1048577),{mode:0o600});await assert.rejects(resolveGatewaySettings({env,home}));
  await writeFile(envfile,'API_SERVER_KEY=synthetic-key');await chmod(envfile,0o644);await assert.rejects(resolveGatewaySettings({env,home}));
  assert.deepEqual(await resolveGatewaySettings({env:{},home}),{url:'http://127.0.0.1:8642',key:undefined});
});
