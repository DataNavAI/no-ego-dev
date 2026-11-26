import assert from 'node:assert/strict';
import {EventEmitter, once} from 'node:events';
import {writeFile} from 'node:fs/promises';
import http from 'node:http';
import {join} from 'node:path';
import test from 'node:test';
import {WebSocketServer, createWebSocketStream} from 'ws';
import {startContainerCom} from '../../../../scripts/container/com.mjs';
import {runCli} from '../../../../src/cli.js';
import {browserChat, expect} from '../../communicator/tests/browser-chat-fixture.js';

const token = 'ned_' + 't'.repeat(32);
const identity = {account:'123456789012', role:'Observer', region:'us-west-2'};
const roleToken = 'mock-role-session';
const portalToken = 'mock-portal-session';

async function listen(server) {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  return 'http://127.0.0.1:' + server.address().port;
}

async function hubFixture(t) {
  const pending = new Map();
  let origin, control, seq = 0;
  const host = () => new URL(origin).host;
  const hub = http.createServer(async (req,res) => {
    if (req.url === '/api/instances' && req.headers.authorization === 'Bearer ' + token) {
      res.end(JSON.stringify({tunnelUrl:'ws://' + host() + '/tunnel/control?slug=aws-owner',
        instance:{id:'9e02142d-e43b-42f3-892d-374033d39ca0',kind:'cli'}}));
      return;
    }
    if (req.headers.cookie !== 'hub-owner=fixture') {res.writeHead(401).end();return;}
    if (req.headers.origin !== undefined && req.headers.origin !== origin) {res.writeHead(403).end();return;}
    const id = String(++seq).padStart(43,'x');
    const socket = new Promise(resolve => pending.set(id, resolve));
    control.send(JSON.stringify({type:'open',id}));
    const stream = await socket;
    const agent = new http.Agent();
    agent.createConnection = () => stream;
    const headers = {...req.headers,host:'ned-com','x-ned-instance':'aws-owner',
      'x-forwarded-host':host(),'x-forwarded-proto':'http',connection:'close'};
    delete headers.authorization;
    delete headers.cookie;
    const upstream = http.request({host:'127.0.0.1',path:req.url,method:req.method,headers,agent},reply=>{
      res.writeHead(reply.statusCode,{...reply.headers,'x-ned-hub-access':'1'});
      reply.pipe(res);
    });
    upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});
    res.on('close',()=>agent.destroy());
    req.pipe(upstream);
  });
  origin = await listen(hub);
  const wss = new WebSocketServer({server:hub});
  const ready = once(wss,'ownerReady');
  wss.on('connection',(ws,req)=>{
    assert.equal(req.headers.authorization,'Bearer ' + token);
    if(req.url.startsWith('/tunnel/control')){
      control=ws;
      ws.send(JSON.stringify({type:'ready'}));
      wss.emit('ownerReady');
    }else{
      const id = new URL(req.url,origin).searchParams.get('id');
      const accept = pending.get(id);
      pending.delete(id);
      accept(createWebSocketStream(ws));
    }
  });
  t.after(async()=>{for(const ws of wss.clients)ws.terminate();wss.close();hub.closeAllConnections();await new Promise(resolve=>hub.close(resolve));});
  return {origin,ready};
}

test('TC-006: an owner using Hub Chat can authorize AWS for a standalone instance and retry a protected read',async t=>{
  const hub = await hubFixture(t);
  const protectedReads=[];
  let approved=false;
  const protectedService=http.createServer((req,res)=>{
    if(req.url==='/approve'){
      if(req.method==='POST'){approved=true;res.end('Authorization approved');return;}
      res.writeHead(200,{'content-type':'text/html'}).end('<form method="post"><button>Allow AWS access</button></form>');
      return;
    }
    const allowed=req.headers.authorization==='Bearer '+roleToken;
    protectedReads.push(allowed);
    res.writeHead(allowed?200:401).end(allowed?'Protected AWS resource':'Unauthorized');
  });
  const resource=await listen(protectedService);
  t.after(()=>{protectedService.closeAllConnections();return new Promise(resolve=>protectedService.close(resolve));});
  let local,env;
  let now=Date.now();
  const identityOptions={
    clock:()=>now,
    async fetch(url,options){
      if(url.startsWith('http://127.0.0.1:8787/')){
        const target=local+new URL(url).pathname;
        const response=await fetch(target,{...options,headers:{...options.headers,Origin:local}});
        assert.equal(response.status,200,await response.clone().text());
        return response;
      }
      if(url.endsWith('/client/register'))return Response.json({clientId:'mock-client',clientSecret:'mock-client-secret'});
      if(url.endsWith('/device_authorization'))return Response.json({deviceCode:'mock-device',userCode:'ABCD-EFGH',
        verificationUri:'https://device.sso.us-west-2.amazonaws.com/',expiresIn:400,interval:1});
      if(url.endsWith('/token'))return approved
        ? Response.json({accessToken:portalToken,expiresIn:400})
        : Response.json({error:'authorization_pending'},{status:400});
      assert.equal(options.headers['x-amz-sso_bearer_token'],portalToken);
      assert.equal(new URL(url).searchParams.get('account_id'),identity.account);
      assert.equal(new URL(url).searchParams.get('role_name'),identity.role);
      return Response.json({roleCredentials:{accessKeyId:'mock-access',secretAccessKey:'mock-secret',sessionToken:roleToken,expiration:now+60_000}});
    },
    spawn(command,args,options){
      assert.equal(command,'aws');
      assert.deepEqual(args,['sts','get-caller-identity']);
      const child=new EventEmitter();
      void fetch(resource,{headers:{Authorization:'Bearer '+options.env.AWS_SESSION_TOKEN}})
        .then(response=>child.emit('close',response.ok?0:1),error=>child.emit('error',error));
      return child;
    },
  };
  const request='Read my protected AWS resource.';
  const linkOnly='Sign in to AWS.';
  const fixture=await browserChat(t,{identityOptions,deferLogin:true,viewport:{width:390,height:844},
    async startApp(options){
      const file=join(options.home,'hub-token');
      await writeFile(file,token,{mode:0o600});
      env={...process.env,NED_CONTAINER:'1',NED_HUB_URL:hub.origin,NED_HUB_TOKEN_FILE:file,NED_INSTANCE_NAME:'aws-owner'};
      const app=await startContainerCom({...options,env,port:0,host:'127.0.0.1'});
      local='http://127.0.0.1:'+app.server.address().port;
      await hub.ready;
      return {...app,url:hub.origin};
    },
    preparePage(page,origin){return page.context().addCookies([{name:'hub-owner',value:'fixture',url:origin}]);},
    async onTurn({input,home}){
      if(input===linkOnly)return 'Open https://example.test/aws-sign-in to approve.';
      assert.equal(input,request);
      const deps={home,env,identityOptions};
      const errors=[];
      const quiet={log(){},error(message){errors.push(message);}};
      const read=await runCli(['identity','exec','aws','--','aws','sts','get-caller-identity'],quiet,deps);
      if(read===0)return 'Protected AWS resource read.';
      assert.equal(await runCli(['identity','connect','aws'],quiet,deps),0,errors.join(' | '));
      return 'AWS authorization is required.';
    },
  });
  const {page,draft,turns}=fixture;
  await fixture.ready();
  const path='/api/v1/identity';
  const headers={'X-NED-Identity':'1'};
  assert.equal((await fetch(hub.origin+path,{headers})).status,401);
  assert.equal((await fetch(hub.origin+path,{headers:{...headers,Cookie:'hub-owner=other'}})).status,401);
  assert.equal((await fetch(local+path,{headers:{...headers,Authorization:'Bearer '+fixture.accessToken}})).status,403);
  assert.equal((await fetch(hub.origin+path+'/github/request',{method:'POST',headers:{...headers,Cookie:'hub-owner=fixture',Origin:hub.origin}})).status,403);
  async function send(count,input=request){
    await draft.fill(input);
    await draft.press('Enter');
    await expect.poll(()=>turns.length).toBe(count);
    turns.at(-1).finish();
    await expect(page.getByRole('button',{name:'Send message',exact:true})).toBeVisible();
  }
  const conversation=page.getByRole('region',{name:'Conversation'});
  const providerMessage=conversation.locator('article.assistant-message').filter({has:page.getByRole('button',{name:'Connect AWS'})});
  const shortcut=providerMessage.getByRole('button',{name:'Connect AWS'});
  const settings=page.locator('[data-provider=aws]');
  await send(1,linkOnly);
  await expect(page.getByRole('region',{name:'Conversation'})).toContainText('https://example.test/aws-sign-in');
  const state=await fetch(hub.origin+path,{headers:{...headers,Cookie:'hub-owner=fixture'}});
  assert.equal((await state.json()).connections[0].request,null);
  await expect(providerMessage).toContainText('NED');
  const evidence = process.env.NED_UI_EVIDENCE_DIR;
  if(evidence)await page.screenshot({path:join(evidence,'mobile-aws-message.png')});
  await shortcut.click();
  await expect(settings.locator('[name=startUrl]')).toBeVisible();
  await settings.getByRole('button',{name:'Cancel connection'}).click();
  await expect(settings.getByRole('button',{name:'Connect',exact:true})).toBeVisible();
  await page.locator('#context-close').click();
  await send(2);
  await shortcut.click();
  await settings.locator('[name=startUrl]').fill('https://example.awsapps.com/start');
  for(const [name,value] of Object.entries(identity))await settings.locator('[name='+name+']').fill(value);
  await settings.getByRole('button',{name:'Get sign-in code'}).click();
  await expect(settings).toContainText('ABCD-EFGH');
  await page.context().route('https://device.sso.us-west-2.amazonaws.com/',route=>
    route.fulfill({status:302,headers:{location:resource+'/approve'}}));
  const popup=page.context().waitForEvent('page');
  await settings.getByRole('link',{name:'Open AWS sign-in'}).click();
  const approval=await popup;
  await approval.getByRole('button',{name:'Allow AWS access'}).click();
  await expect(approval.getByText('Authorization approved')).toBeVisible();
  await approval.close();
  now+=6000;
  await settings.getByRole('button',{name:'Check approval'}).click();
  await expect(settings).toContainText('Verified');
  assert.equal(await runCli(['identity','exec','aws','--','aws','sts','get-caller-identity'],
    {log(){},error(){}},{home:fixture.home,env,identityOptions}),1);
  assert.deepEqual(protectedReads,[]);
  await settings.getByRole('button',{name:'Confirm connection'}).click();
  await expect(settings).toContainText('Connected as');
  await page.locator('#context-close').click();
  await expect(shortcut).toHaveCount(0);
  await send(3);
  await expect(page.getByRole('region',{name:'Conversation'})).toContainText('Protected AWS resource read.');
  await expect(page.getByRole('region',{name:'Conversation'})).not.toContainText(portalToken);
  assert.deepEqual(protectedReads,[true]);
});
