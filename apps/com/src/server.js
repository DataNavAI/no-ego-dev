import {createNedApiHandler} from '../../core/src/api.js';
import {resolveDatabasePath,openNedDatabase} from '../../../src/database.js';
import {existsSync} from 'node:fs';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
const assets = new Map([['/',['index.html','text/html']],['/styles.css',['styles.css','text/css']],['/app.js',['app.js','text/javascript']],['/state.js',['state.js','text/javascript']],['/chat-ui.js',['chat-ui.js','text/javascript']]]);
assets.set('/preview-ui.js',['preview-ui.js','text/javascript']);
assets.set('/model-setup.js',['model-setup.js','text/javascript']);
assets.set('/idle-activity.js',['idle-activity.js','text/javascript']);
assets.set('/chat-entry.js',['chat-entry.js','text/javascript']);
assets.set('/history.js',['history.js','text/javascript']);
assets.set('/message-content.js',['message-content.js','text/javascript']);
assets.set('/provider-identity.js',['provider-identity.js','text/javascript']);
assets.set('/settings.js',['settings.js','text/javascript']);
assets.set('/settings.css',['settings.css','text/css']);
assets.set('/secret-request.js',['secret-request.js','text/javascript']);
assets.set('/secret-share.js',['secret-share.js','text/javascript']);
assets.set('/composer-media.js',['composer-media.js','text/javascript']);
assets.set('/pane-resize.js',['pane-resize.js','text/javascript']);
assets.set('/debug-pane.js',['debug-pane.js','text/javascript']);
assets.set('/request-diagnostic.js',['request-diagnostic.js','text/javascript']);
assets.set('/turn-stream.js',['turn-stream.js','text/javascript']);
assets.set('/dashboard-model.js',['dashboard-model.js','text/javascript']);
assets.set('/work-plan.js',['work-plan.js','text/javascript']);
assets.set('/task-references.js',['task-references.js','text/javascript']);
assets.set('/project-work.js',['project-work.js','text/javascript']);
assets.set('/goals-tasks.js',['goals-tasks.js','text/javascript']);
assets.set('/base.css',['base.css','text/css']);
assets.set('/work-entry.js',['work-entry.js','text/javascript']);
assets.set('/activity-ui.js',['activity-ui.js','text/javascript']);
assets.set('/message-reaction.js',['message-reaction.js','text/javascript']);
assets.set('/conversation.css',['conversation.css','text/css']);
for(const [name,type] of [['webawesome.js','text/javascript'],['webawesome-theme.css','text/css'],['webawesome-LICENSE.txt','text/plain'],['wa-check.svg','image/svg+xml'],['wa-chevron.svg','image/svg+xml']])assets.set('/vendor/'+name,['vendor/'+name,type]);
const vendorAssets=new Map([
  ['/vendor/marked.js',import.meta.resolve('marked')],
  ['/vendor/dompurify.js',new URL('./purify.es.mjs',import.meta.resolve('dompurify')).href],
]);
const policy = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' blob:; base-uri 'none'; frame-ancestors 'none'; form-action http://*.localhost:*; frame-src http://*.localhost:*;";

const protocolAssets=new Map([['/reaction-emoji.js','reaction-emoji.js'],['/history.js','history.js'],['/request-diagnostic.js','request-diagnostic.js'],['/secret-events.js','secret-events.js']]);
for(const [name,type] of [['api-client.js','text/javascript'],['auth-entry.js','text/javascript'],['auth.css','text/css']])assets.set('/'+name,[name,type]);
export function createCommunicatorServer({host='127.0.0.1',port=0,databasePath,home,env=process.env,gateway,logger,secretsEnabled=true,initializeDatabase=false,basicCredentials,modelSetup,maintenance,identityOptions,identityEnabled=true,hubAwsIdentity=false}={}){
  if(host!=='127.0.0.1'||!Number.isInteger(port)||port<0||port>65535)throw new Error('Invalid NEDCOM address.');
  databasePath??=resolveDatabasePath({home,env});
  let url=null;
  const api=createNedApiHandler({databasePath,home,env,chatGateway:gateway,modelSetup,maintenance,identityOptions,identityEnabled,hubAwsIdentity,logger,secretsEnabled,basicCredentials,boundOrigin:()=>url,legacyInvalidStatus:404,previewDelivery:true});
  const server=http.createServer(async(req,res)=>{
    const send=(status,type,body,extra={})=>{res.writeHead(status,{'content-type':type+'; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':policy,'referrer-policy':'origin',...extra});res.end(req.method==='HEAD'?undefined:body);};
    const error=(status,code,message,extra)=>send(status,'application/json',JSON.stringify({error:{code,message}}),extra);
    if(req.headers.host!==`127.0.0.1:${server.address()?.port}`||(req.headers.origin!==undefined&&req.headers.origin!==url))return error(403,'forbidden','Access forbidden.');
    if(await api(req,res))return;
    if(!['GET','HEAD'].includes(req.method))return error(405,'method_not_allowed','Method not allowed.',{Allow:'GET, HEAD'});
    const pathname=req.url.split('?')[0];
    if(protocolAssets.has(pathname)){
      try{return send(200,'text/javascript',await readFile(new URL('../../core/src/protocol/'+protocolAssets.get(pathname),import.meta.url)));}
      catch{return error(500,'internal_error','Unable to read NEDCOM resources.');}
    }
    if(vendorAssets.has(pathname)){
      try{return send(200,'text/javascript',await readFile(new URL(vendorAssets.get(pathname))));}
      catch{return error(500,'internal_error','Unable to read NEDCOM resources.');}
    }
    const asset=assets.get(pathname);
    if(!asset)return error(404,'not_found','Not found.');
    try{send(200,asset[1],await readFile(new URL('./public/'+asset[0],import.meta.url)));}
    catch{error(500,'internal_error','Unable to read NEDCOM resources.');}
  });
  return {server,maintenance:api.maintenance,preview:api.preview,setHubRegistration:input=>api.setHubRegistration(input),get url(){return url;},get apiCredential(){return api.credential();},async listen(){
    api.credential();
    if(initializeDatabase&&!existsSync(databasePath)){const database=openNedDatabase({databaseUrl:databasePath});database.close();}
    return new Promise((resolve,reject)=>{
      const failed=()=>{server.off('listening',ready);reject(new Error('Unable to start NEDCOM.'));};
      const ready=()=>{server.off('error',failed);url=`http://127.0.0.1:${server.address().port}`;api.startPreview();resolve(url);};
      server.once('error',failed);server.once('listening',ready);server.listen(port,host);
    });
  },async close(){await api.close();url=null;return new Promise((resolve,reject)=>{server.close(error=>error&&error.code!=='ERR_SERVER_NOT_RUNNING'?reject(new Error('Unable to stop NEDCOM.')):resolve());server.closeAllConnections();});}};
}
