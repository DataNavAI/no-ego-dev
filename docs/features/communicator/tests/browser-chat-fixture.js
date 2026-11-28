import {configuredModelSetup} from './model-fixture.js';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium,expect} from 'playwright/test';
import {openNedDatabase} from '../../../../src/database.js';
import {createCommunicatorServer} from '../../ned-api/tests/auth-client.js';
import {streamEvents,streamFrame} from './stream-fixtures.js';

export {expect};
export async function browserChat(t,{modelSetup,existing=false,rows=[],historyFailure=false,edgeFixedFailures=0,identityOptions,onTurn,startApp,preparePage,viewport={width:1280,height:900},deferLogin=false,browserOptions={}}={}){
  const home=await mkdtemp(join(tmpdir(),'ned-chat-browser-'));
  let database,app,browser,gateway;
  t.after(async()=>{
    await browser?.close();await app?.close();
    if(gateway)await new Promise(resolve=>{gateway.close(resolve);gateway.closeAllConnections();});
    database?.close();await rm(home,{recursive:true,force:true});
  });
  const messages=structuredClone(rows),requests=[],turns=[];
  let failHistory=historyFailure;
  const initialSession={id:'nedcom-main',title:'NED Chat',source:'api_server'};
  const sessions=new Map(existing?[[initialSession.id,{session:initialSession,messages}]]:[]);
  let rejectNewSession=false;
  gateway=http.createServer(async(req,res)=>{
    let payload='';for await(const chunk of req)payload+=chunk;
    requests.push({method:req.method,url:req.url,payload:payload?JSON.parse(payload):undefined});
    const json=(status,data)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
    if(req.headers.authorization!=='Bearer synthetic-browser-key')return json(401,{});
    const id=req.url.match(/^\/api\/sessions\/([^/?]+)/)?.[1];
    const entry=sessions.get(id);
    if(id&&req.url===`/api/sessions/${id}`&&req.method==='GET')return json(entry?200:404,entry?{session:entry.session}:{});
    if(req.url==='/api/sessions'&&req.method==='POST'){
      const session=JSON.parse(payload);
      if(!/^(nedcom-main|nedcom-main-[a-f0-9-]{36})$/.test(session.id)||session.source!==initialSession.source)return json(400,{});
      if(sessions.has(session.id))return json(409,{});
      if(rejectNewSession&&session.id!==initialSession.id)return json(503,{});
      sessions.set(session.id,{session,messages:session.id===initialSession.id?messages:[]});
      return json(201,{session});
    }
    if(entry&&req.url.startsWith(`/api/sessions/${id}/messages?`)){
      const {messages}=entry;
      if(failHistory){if(typeof failHistory==='number')failHistory--;return json(503,{});}
      const url=new URL(req.url,'http://fixture');
      const offset=Number(url.searchParams.get('offset')),limit=Number(url.searchParams.get('limit'));
      const end=Math.max(0,messages.length-offset);
      return json(200,{data:messages.slice(Math.max(0,end-limit),end)});
    }
    if(entry&&req.url===`/api/sessions/${id}/chat/stream`&&req.method==='POST'){
      const {session,messages}=entry;
      const input=JSON.parse(payload).input;
      const ordinal=turns.length+1;
      const answer=onTurn ? await onTurn({input,home,origin:app.url}) : `**Completed reply ${ordinal}**`;
      const {reply,toolRows=[]}=typeof answer==='string'?{reply:answer}:answer;
      const events=streamEvents(session.id,reply);
      res.writeHead(200,{'content-type':'text/event-stream'});
      res.write(events.slice(0,2).map(streamFrame).join(''));
      let liveSequence=10;
      turns.push({input,res,activity(event,tool_name){res.write(streamFrame({event,data:{session_id:session.id,run_id:'run_synthetic',message_id:'msg_synthetic',seq:liveSequence++,tool_name,delta:'PRIVATE REASONING',args:{secret:'PRIVATE ARGUMENT'},preview:'PRIVATE OUTPUT'}}));},interrupt(){res.end();},partial(delta=`Visible partial ${ordinal}`){res.write(streamFrame({...events[2],data:{...events[2].data,seq:liveSequence++,delta}}));},finish(){
        messages.push({id:`sent-${ordinal}`,role:'user',content:input},...toolRows,{id:`reply-${ordinal}`,role:'assistant',content:reply});
        res.end(events.slice(3).map(streamFrame).join(''));
      }});
      return;
    }
    json(404,{});
  });
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));
  const databasePath=join(home,'ned.sqlite');database=openNedDatabase({databaseUrl:databasePath});
  const options={modelSetup:modelSetup??configuredModelSetup(),databasePath,home,identityOptions,gateway:{url:`http://127.0.0.1:${gateway.address().port}`,key:'synthetic-browser-key'}};
  if(startApp)app=await startApp(options);
  else{app=createCommunicatorServer(options);await app.listen();}
  try{browser=await chromium.launch({headless:true,channel:'chromium',...browserOptions});}
  catch(error){throw new Error('Chromium is required. Run npm ci && npx playwright install --with-deps chromium before chat E2E tests.',{cause:error});}
  const page=await browser.newPage({viewport});page.setDefaultTimeout(10000);
  const errors=[],network=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>network.push(new URL(request.url()).pathname));
  if(edgeFixedFailures)await page.route('**/api/v1/chat/sessions/fixed',route=>{
    if(edgeFixedFailures>0){edgeFixedFailures--;return route.fulfill({status:502,contentType:'text/plain',body:'Synthetic edge failure'});}
    return route.continue();
  });
  await preparePage?.(page,app.url);
  await page.goto(app.url);
  if(!deferLogin){await page.locator('#access-token').fill(app.apiCredential);await page.locator('#access-submit').click();}
  const draft=page.locator('#chat-message');
  return {home,page,draft,messages,requests,turns,errors,network,failNewSession(value){rejectNewSession=value;},accessToken:app.apiCredential,setHistoryFailure(value){failHistory=value;},async ready(){await expect(page.locator('#chat-status')).toHaveText('');await expect(draft).toBeEnabled();assert.deepEqual(errors,[]);},async send(input){
    await draft.fill(input);await draft.press('Enter');
    await expect(draft).toHaveValue('');await expect(draft).toBeEnabled();
    await expect(page.locator('#transcript .user-message').last()).toContainText(input);
    await expect(page.locator('#chat-send')).toHaveAttribute('aria-label','Stop response');
    await expect.poll(()=>turns.length).toBeGreaterThan(0);
    const turn=turns.at(-1);assert.equal(turn.input,input);
    turn.partial();await expect(page.locator('[data-state="streaming"]')).toContainText(`Visible partial ${turns.length}`);
    assert.equal(turn.res.writableEnded,false);
    turn.finish();await expect(page.locator('#chat-send')).toHaveAttribute('aria-label','Send message');await expect(draft).toBeEnabled();await expect(draft).toHaveValue('');
    await expect(page.locator('#transcript .message-content strong')).toContainText([`Completed reply ${turns.length}`]);
    assert.deepEqual(errors,[]);
  }};
}
