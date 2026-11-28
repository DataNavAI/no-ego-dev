import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {browserChat,expect} from '../../communicator/tests/browser-chat-fixture.js';
import {createCommunicatorServer} from '../../../../apps/com/src/server.js';
import {createTaskService} from '../../../../src/tasks.js';
import {ownedApp} from './helpers.js';

test('TC-003: actual Dashboard frame follows project and auth while retaining explicit empty state, chat and responsive navigation',{timeout:45000},async t=>{
  let com,projectId,secondId,application;
  const f=await browserChat(t,{startApp:async options=>{
    const project=path.join(options.home,'product'),second=path.join(options.home,'second');await mkdir(project);await mkdir(second);
    for(const [folder,assign] of [[project,id=>{projectId=id;}],[second,id=>{secondId=id;}]]){
      const work=await createTaskService({project:folder,databaseUrl:options.databasePath,actor:'agent:dashboard-browser'});assign((await work.initialize()).projectId);work.close();
    }
    application=await ownedApp(t,project);
    com=createCommunicatorServer(options);await com.listen();return com;
  }});
  await f.ready();const {page}=f;await f.draft.fill('Keep the dashboard question');
  const select=id=>page.locator('#project').evaluate((node,id)=>{node.value=id;node.dispatchEvent(new Event('change'));},id);
  await select(projectId);await page.locator('#dashboard-tab').click();
  await expect(page.locator('.dashboard-empty')).toBeVisible();
  const registered=await fetch(com.url+'/api/v1/dashboards/'+projectId,{method:'PUT',headers:{authorization:'Bearer '+com.apiCredential,origin:com.url,'content-type':'application/json'},body:JSON.stringify({port:application.port,name:'Product analytics',expectedRevision:0})});assert.equal(registered.status,200);
  const frame=page.frameLocator('iframe[title="Product dashboard"]');
  await expect(frame.getByRole('heading',{name:'Fixture daily users'})).toBeVisible();await expect(frame.locator('body')).toHaveAttribute('data-ready','yes');
  const previousOrigin=await frame.locator('body').evaluate(()=>globalThis.location.origin);
  await expect(page.locator('#dashboard .managed-preview-status')).toHaveText('Dashboard ready');await expect(page.locator('.dashboard-empty')).toBeHidden();
  assert.equal(await frame.locator('body').evaluate(()=>{try{return globalThis.parent.document===globalThis.document;}catch{return false;}}),false);
  for(const width of [1280,390,320]){
    await page.setViewportSize({width,height:900});
    await page.evaluate(()=>new Promise(resolve=>globalThis.requestAnimationFrame(()=>globalThis.requestAnimationFrame(resolve))));
    if(await page.locator('#preview').isHidden())await page.locator('#mobile-project-toggle').click();
    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(frame.getByRole('heading',{name:'Fixture daily users'})).toBeVisible();
    assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),true);
    await page.screenshot({path:path.join(process.env.NED_UI_EVIDENCE_DIR||tmpdir(),`ned-product-dashboard-${width}.png`)});
  }
  await page.setViewportSize({width:1280,height:900});
  await page.evaluate(()=>new Promise(resolve=>globalThis.requestAnimationFrame(()=>globalThis.requestAnimationFrame(resolve))));
  const toolbar=page.locator('#dashboard .managed-preview-toolbar');
  const font=await toolbar.evaluate(node=>Number.parseFloat(globalThis.getComputedStyle(node).fontSize));
  await toolbar.evaluate(node=>{node.style.fontSize='200%';});
  assert.ok(await toolbar.evaluate(node=>Number.parseFloat(globalThis.getComputedStyle(node).fontSize))>=font*1.9);
  assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),true);
  assert.ok(await page.locator('#dashboard .managed-preview-name').evaluate(node=>{
    const font=Number.parseFloat(globalThis.getComputedStyle(node).fontSize);
    return node.getBoundingClientRect().height<=font*2.8;
  }),'Enlarged dashboard identity must remain within two readable lines');
  await page.screenshot({path:path.join(process.env.NED_UI_EVIDENCE_DIR||tmpdir(),'ned-product-dashboard-enlarged.png')});
  await toolbar.evaluate(node=>node.style.removeProperty('font-size'));
  let release;const held=new Promise(resolve=>{release=resolve;});let requested;t.after(()=>release());
  const started=new Promise(resolve=>{requested=resolve;});
  await page.route('**/api/v1/dashboards/'+projectId+'/access',async route=>{requested();await held;await route.continue();});
  await page.locator('#dashboard .managed-preview-reload').click();await started;
  await select(secondId);await expect(page.locator('iframe[title="Product dashboard"]')).not.toHaveAttribute('src',/.+/);release();
  await page.unrouteAll({behavior:'wait'});
  await expect(page.locator('.dashboard-empty')).toBeVisible();
  assert.equal(page.frames().some(frame=>frame.url().startsWith(previousOrigin+'/')),false,'Project change must destroy the old app document, not just hide it');
  await select(projectId);await expect(frame.getByRole('heading',{name:'Fixture daily users'})).toBeVisible();
  await expect(f.draft).toHaveValue('Keep the dashboard question');
  await page.locator('#chat-tools-toggle').click();await page.locator('#secrets-toggle').click();await page.locator('#access-forget').click();
  await expect(page.locator('#access-gate')).toBeVisible();await expect(page.locator('iframe[title="Product dashboard"]')).toHaveCount(0);
  assert.deepEqual(f.errors,[]);
});

test('TC-003: container-facing listener embeds Preview and Dashboard on its published port',{timeout:45000},async t=>{
  const {startContainerCom}=await import('../../../../scripts/container/com.mjs');
  const {default:http}=await import('node:http');
  const {relayRequest}=await import('./helpers.js');
  let com,projectId,application;
  const f=await browserChat(t,{startApp:async options=>{
    const project=path.join(options.home,'container-product');await mkdir(project);
    const work=await createTaskService({project,databaseUrl:options.databasePath,actor:'agent:container-dashboard'});projectId=(await work.initialize()).projectId;work.close();
    application=await ownedApp(t,project);
    const reservation=http.createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
    const origin='http://127.0.0.1:'+port;
    com={...await startContainerCom({...options,host:'127.0.0.1',port,origin}),url:origin};
    return com;
  }});
  let dashboardTicket;
  await f.ready();const {page}=f,headers={authorization:'Bearer '+com.apiCredential,origin:com.url,'content-type':'application/json'};
  for(const route of ['/api/v1/preview','/api/v1/dashboards/'+projectId]){
    const body={port:application.port,expectedRevision:0,...(route.endsWith('preview')?{project:path.join(f.home,'container-product')}:{})};
    const rejected=await fetch(com.url+route,{method:'PUT',headers,body:JSON.stringify({...body,port:Number(new URL(com.url).port)})});
    assert.equal(rejected.status,400,'Container control port must fail before publication');
    const unchanged=await(await fetch(com.url+route,{headers})).json();assert.equal(unchanged.revision,0);
    const published=await fetch(com.url+route,{method:'PUT',headers,body:JSON.stringify(body)});assert.equal(published.status,200);
    const response=await fetch(com.url+route+'/access',{method:'POST',headers,body:JSON.stringify({mode:'frame'})});assert.equal(response.status,200);
    const ticket=await response.json();if(route.includes('/dashboards/'))dashboardTicket=ticket;assert.equal(new URL(ticket.origin).port,new URL(com.url).port,'Private app must use the Docker-published port');
    assert.equal((await relayRequest(ticket.origin)).status,401);
  }
  await page.locator('#project').evaluate((node,id)=>{node.value=id;node.dispatchEvent(new Event('change'));},projectId);await page.locator('#dashboard-tab').click();
  await expect(page.frameLocator('iframe[title="Product dashboard"]').getByRole('heading',{name:'Fixture daily users'})).toBeVisible();
  const appFrame=page.frameLocator('iframe[title="Product dashboard"]');
  assert.deepEqual(await appFrame.locator('body').evaluate(async()=>await(await fetch('/inspect')).json()),{controlAuth:false,controlCookie:false});
  assert.equal(await appFrame.locator('body').evaluate(()=>new Promise((resolve,reject)=>{
    const socket=new WebSocket('ws://'+globalThis.location.host+'/socket'),timer=setTimeout(()=>{socket.close();reject(Error('WebSocket deadline'));},5000);
    socket.onopen=()=>socket.send('container-stream');socket.onmessage=event=>{clearTimeout(timer);socket.close();resolve(event.data);};socket.onerror=()=>{clearTimeout(timer);reject(Error('WebSocket failed'));};
  })),'container-stream');
  await page.locator('#preview-tab').click();
  await expect(page.frameLocator('iframe[title="Working app"]').getByRole('heading',{name:'Fixture daily users'})).toBeVisible();
  const bootstrap=origin=>relayRequest(dashboardTicket.origin,{path:dashboardTicket.bootstrapPath,method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant:dashboardTicket.grant}).toString()});
  assert.equal((await bootstrap('https://foreign.invalid')).status,403);
  const admitted=await bootstrap(com.url);assert.equal(admitted.status,303);const cookie=admitted.headers['set-cookie'][0].split(';')[0];
  assert.equal((await relayRequest(dashboardTicket.origin,{headers:{cookie}})).status,200);
  assert.equal((await relayRequest(dashboardTicket.origin,{path:'/socket',headers:{cookie,origin:'https://foreign.invalid',connection:'Upgrade',upgrade:'websocket','sec-websocket-key':'dGhlIHNhbXBsZSBub25jZQ==','sec-websocket-version':'13'}})).status,403);
  assert.equal((await fetch(com.url+'/api/v1/dashboards/'+projectId,{method:'DELETE',headers,body:JSON.stringify({expectedRevision:1})})).status,200);
  assert.notEqual((await relayRequest(dashboardTicket.origin,{headers:{cookie}})).status,200);
  await expect(page.frameLocator('iframe[title="Working app"]').getByRole('heading',{name:'Fixture daily users'})).toBeVisible();
  const unknown='http://pv-'+'f'.repeat(32)+'.localhost:'+new URL(com.url).port;
  assert.equal((await relayRequest(unknown)).status,403);
  assert.equal((await fetch(com.url+'/inspect')).status,404,'Control origin never serves app content');
  assert.deepEqual(f.errors,[]);
  const working=page.frameLocator('iframe[title="Working app"]').locator('body');
  await working.evaluate(()=>new Promise((resolve,reject)=>{
    const socket=new WebSocket('ws://'+globalThis.location.host+'/held');globalThis.dashboardShutdownSocket=socket;
    socket.onopen=()=>resolve(true);socket.onerror=()=>reject(Error('Retained WebSocket failed'));
  }));
  const closing=com.close();let deadline;
  const outcome=await Promise.race([closing.then(()=>true),new Promise(resolve=>{deadline=setTimeout(()=>resolve(false),2000);})]);
  clearTimeout(deadline);
  if(!outcome)await working.evaluate(()=>globalThis.dashboardShutdownSocket.close());
  await closing;
  assert.equal(outcome,true,'Container close must settle while an app WebSocket remains open');
});
