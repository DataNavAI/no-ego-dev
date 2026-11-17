import http from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LLMock} from '@copilotkit/aimock';
import {createTaskService} from '../../../../../src/tasks.js';
import {createCoreServer} from '../../../../../apps/ned-core/src/index.js';
import {loadOperatorCredential} from '../../../../../apps/ned-core/src/auth.js';

export function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}
export async function until(read,predicate,description){
  const deadline=Date.now()+20000;
  while(Date.now()<deadline){const value=await read();if(predicate(value))return value;await new Promise(resolve=>setTimeout(resolve,20));}
  throw new Error(`Timed out: ${description}`);
}
export async function hermesFixture({badSource=false}={}){
  const root=await mkdtemp(path.join(tmpdir(),'ned-hermes-case-'));
  const home=path.join(root,'hermes'),project=path.join(root,'project'),coreHome=path.join(root,'core');
  const mock=new LLMock({host:'127.0.0.1',port:0,strict:true,chunkSize:1});
  const barriers=new Map(),requests=[];
  let child,childClosed,core,task,proxy,closePromise,url,output='';
  const interrupted=()=>{void close().then(()=>process.exit(143));};
  process.once('SIGTERM',interrupted);process.once('SIGINT',interrupted);
  function close(){return closePromise??=(async()=>{
    const errors=[];
    const safely=async operation=>{try{await operation();}catch(error){errors.push(error);}};
    for(const barrier of barriers.values())barrier.release.resolve();
    await safely(()=>core?.close());await safely(()=>task?.close());
    if(child&&child.exitCode===null&&child.signalCode===null){
      const signal=name=>{try{process.kill(-child.pid,name);}catch(error){if(error.code!=='ESRCH')throw error;}};
      await safely(()=>signal('SIGTERM'));
      const timer=setTimeout(()=>signal('SIGKILL'),7000);
      try{await childClosed;}finally{clearTimeout(timer);}
    }
    if(proxy)await safely(async()=>{proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve));});
    await safely(()=>mock.stop());await safely(()=>rm(root,{recursive:true,force:true}));
    process.off('SIGTERM',interrupted);process.off('SIGINT',interrupted);
    if(errors.length)throw new AggregateError(errors,'Hermes fixture teardown failed');
  })();}
  try{
    for(const directory of [home,project,coreHome,path.join(root,'tmp')])await mkdir(directory,{recursive:true});
    await mock.start();
    proxy=http.createServer(async(req,res)=>{
      const controller=new AbortController();res.on('close',()=>controller.abort());
      try{
        const chunks=[];for await(const chunk of req)chunks.push(chunk);
        const body=chunks.length?JSON.parse(Buffer.concat(chunks)):null;
        requests.push({path:req.url,body});
        const barrier=[...barriers.entries()].find(([marker])=>JSON.stringify(body).includes(marker))?.[1];
        if(barrier?.mode==='hold'){barrier.reached.resolve();await barrier.release.promise;}
        const response=await fetch(mock.url+req.url,{method:req.method,headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal});
        res.writeHead(response.status,{'content-type':response.headers.get('content-type')});res.flushHeaders();
        if(!response.headers.get('content-type')?.includes('text/event-stream')){res.end(Buffer.from(await response.arrayBuffer()));return;}
        let pending='',text='';const decoder=new TextDecoder();
        for await(const chunk of response.body){
          pending+=decoder.decode(chunk,{stream:true});let end;
          while((end=pending.indexOf('\n\n'))!==-1){
            const frame=pending.slice(0,end+2);pending=pending.slice(end+2);res.write(frame);
            const data=frame.split('\n').find(line=>line.startsWith('data: '))?.slice(6);
            if(data&&data!=='[DONE]')text+=JSON.parse(data).choices?.[0]?.delta?.content||'';
            if(barrier?.mode==='delta'&&!barrier.delivered&&text.length>=8){
              barrier.delivered=true;barrier.reached.resolve();await barrier.release.promise;
            }
          }
        }
        res.end(pending);
      }catch{if(!res.destroyed)res.destroy();}
    });
    await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
    const modelUrl=`http://127.0.0.1:${proxy.address().port}`;
    const config={model:{default:'ned-test-model',provider:'custom',base_url:modelUrl+'/v1',api_key:'test-only-model',api_mode:'chat_completions',context_length:64000},
      agent:{max_turns:6},toolsets:['file','delegation'],platform_toolsets:{api_server:['file','delegation']},compression:{enabled:false},memory:{memory_enabled:false,user_profile_enabled:false},
      delegation:{model:'ned-test-model',provider:'custom',base_url:modelUrl+'/v1',api_key:'test-only-model',api_mode:'chat_completions',max_iterations:3},
      auxiliary:{title_generation:{enabled:false,model_upgrade_enabled:false}},fallback_providers:[],fallback_model:null,checkpoints:{enabled:false}};
    await writeFile(path.join(home,'config.yaml'),JSON.stringify(config),{mode:0o600});
    const env={PATH:'/usr/bin:/bin',HOME:root,HERMES_HOME:home,TMPDIR:path.join(root,'tmp'),XDG_CACHE_HOME:path.join(root,'cache'),
      PYTHONNOUSERSITE:'1',API_SERVER_KEY:'ned-test-gateway-key-0123456789',NO_PROXY:'127.0.0.1,localhost',HERMES_SKIP_CONFIG_MIGRATION:'1',HERMES_INTERACTIVE:'0'};
    const python=process.env.NED_HERMES_TEST_PYTHON,source=process.env.NED_HERMES_TEST_SOURCE;
    if(!python||!source)throw new Error('Use npm run test:core:hermes to provision Hermes first.');
    child=spawn(python,['-I',fileURLToPath(new URL('./gateway.py',import.meta.url)),badSource?path.join(root,'missing-source'):source,String(proxy.address().port)],{env,cwd:project,detached:true,stdio:['ignore','pipe','pipe']});
    childClosed=new Promise(resolve=>child.once('close',resolve));
    child.stderr.on('data',chunk=>{output=(output+chunk).slice(-16000);});
    url=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Hermes startup timed out: '+output)),30000);
      child.once('error',error=>{clearTimeout(timer);reject(error);});
      child.once('close',()=>{clearTimeout(timer);reject(new Error('Hermes exited before readiness: '+output));});
      let stdout='';child.stdout.on('data',chunk=>{stdout=(stdout+chunk).slice(-16000);const match=stdout.match(/NED_HERMES_READY (\{[^\n]+\})/);if(match){clearTimeout(timer);const ready=JSON.parse(match[1]);if(!ready.egressGuard)return reject(new Error('Egress guard absent.'));resolve(`http://127.0.0.1:${ready.port}`);}});
    });
    const databasePath=path.join(coreHome,'ned.sqlite');
    const envCore={NED_AGENT_HOME:coreHome,NED_HERMES_URL:url,NED_HERMES_API_KEY:env.API_SERVER_KEY};
    task=await createTaskService({project,databaseUrl:databasePath,actor:'agent:ned-core'});await task.initialize();
    core=await createCoreServer({home:coreHome,env:envCore,databasePath});await core.listen();
    const token=loadOperatorCredential({home:coreHome,env:envCore});let sequence=0;
    const request=async(route,{method='GET',body,status=200}={})=>{
      const response=await fetch(core.url+'/api/core/v1'+route,{method,headers:{authorization:'Bearer '+token,...(body===undefined?{}:{'content-type':'application/json','idempotency-key':`test-${++sequence}`})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
      const value=await response.json();if(response.status!==status)throw new Error(`Core ${route}: ${response.status} ${JSON.stringify(value)}`);return value.data;
    };
    const scope='/projects/'+task.project.id;
    const attempt=async instructions=>{
      const item=await request(scope+'/tasks',{method:'POST',body:{title:'Hermes fixture task'}});
      const taskPath=scope+'/tasks/'+item.id;
      await request(taskPath+'/enrollment',{method:'PUT',body:{enabled:true}});
      const attempt=await request(taskPath+'/attempts',{method:'POST',body:{instructions}});
      await request('/coordinator/reconcile',{method:'POST',body:{},status:202});
      return {item,path:scope+'/attempts/'+attempt.id,taskPath};
    };
    const gatewayRequest=async resource=>{const response=await fetch(url+resource,{headers:{authorization:'Bearer '+env.API_SERVER_KEY},signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error('Hermes readback failed: '+response.status);return response.json();};
    return {root,home,project,mock,requests,request,gatewayRequest,scope,attempt,url,core,close,pid:child.pid,diagnostics:()=>output,
      barrier(marker,mode){const barrier={mode,reached:deferred(),release:deferred()};barriers.set(marker,barrier);return barrier;},
      async assertClosed(){if(child.exitCode===null&&child.signalCode===null)throw new Error('Hermes still running');await access(root).then(()=>{throw new Error('Profile remains');},error=>{if(error.code!=='ENOENT')throw error;});await fetch(url+'/health',{signal:AbortSignal.timeout(1000)}).then(()=>{throw new Error('Gateway remains reachable');},()=>{});},
    };
  }catch(error){await close();error.fixtureRoot=root;throw error;}
}
