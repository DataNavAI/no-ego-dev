import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {setTimeout as pause} from 'node:timers/promises';
import {chromium} from 'playwright';
import {createCommunicatorServer} from '../../../../src/communicator/server.js';

// Bounded observable-state polling, not retries of user actions or whole tests.
async function until(check){
  const deadline=Date.now()+10000;
  while(true){try{await check();return;}catch(error){if(Date.now()>=deadline)throw error;await pause(25);}}
}
export function expect(locator){
  return {
    toBeVisible:()=>locator.waitFor({state:'visible',timeout:10000}),
    toBeHidden:()=>locator.waitFor({state:'hidden',timeout:10000}),
    toHaveValue:value=>until(async()=>assert.equal(await locator.inputValue(),value)),
    toHaveText:text=>until(async()=>assert.equal(await locator.textContent(),text)),
    toContainText:text=>until(async()=>assert.ok((await locator.textContent()).includes(text))),
    toHaveCount:count=>until(async()=>assert.equal(await locator.count(),count)),
    toBeFocused:()=>until(async()=>assert.equal(await locator.evaluate(node=>node===node.ownerDocument.activeElement),true)),
  };
}
expect.poll=read=>({toBe:value=>until(async()=>assert.equal(await read(),value))});

export async function browserChat(t){
  const home=mkdtempSync(join(tmpdir(),'ned-secret-browser-'));
  const messages=[],requests=[],turns=[],errors=[];
  let session=null,browser,app;
  const gateway=http.createServer(async(req,res)=>{
    const resource=new URL(req.url,'http://127.0.0.1');
    const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const body=Buffer.concat(chunks).toString('utf8');
    requests.push({method:req.method,path:req.url,...(body?{body:JSON.parse(body)}:{})});
    if(req.method==='GET'&&resource.pathname==='/api/sessions/nedcom-main')return send(session?200:404,session?{session}:{});
    if(req.method==='POST'&&resource.pathname==='/api/sessions'){session=JSON.parse(body);return send(201,{session});}
    if(req.method==='GET'&&resource.pathname==='/api/sessions/nedcom-main/messages'){
      const offset=Number(resource.searchParams.get('offset')||0),limit=Number(resource.searchParams.get('limit')||50);
      return send(200,{data:messages.slice(Math.max(0,messages.length-offset-limit),Math.max(0,messages.length-offset))});
    }
    if(req.method==='POST'&&resource.pathname==='/api/sessions/nedcom-main/chat'){
      const input=JSON.parse(body).input;let finished=false;
      turns.push({finish(content='Synthetic reply complete.'){
        if(finished)return;finished=true;
        messages.push({id:`user-${turns.length}`,role:'user',content:input},{id:`assistant-${turns.length}`,role:'assistant',content});
        send(200,{session_id:'nedcom-main',message:{role:'assistant',content},status:'completed'});
      }});
      return;
    }
    send(404,{});
  });
  t.after(async()=>{
    await browser?.close();await app?.close();
    await new Promise(resolve=>{gateway.close(resolve);gateway.closeAllConnections();});
    rmSync(home,{recursive:true,force:true});
  });
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));
  app=createCommunicatorServer({home,databasePath:join(home,'ned.sqlite'),gateway:{url:`http://127.0.0.1:${gateway.address().port}`,key:'synthetic-gateway-key'}});
  await app.listen();
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.on('pageerror',error=>errors.push(error.message));
  const draft=page.locator('#chat-message');
  await page.goto(app.url);
  return {home,page,draft,messages,requests,turns,errors,async ready(){
    await expect(page.locator('#chat-status')).toHaveText('');
    await expect(draft).toBeVisible();
  }};
}
